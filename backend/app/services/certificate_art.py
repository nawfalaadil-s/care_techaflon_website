"""Per-participant certificate artwork.

Composites a participant's name (plus their team identifier) onto the
organizers' uploaded certificate template so every user receives their own
named artifact instead of a shared blank design.

Rendering uses Pillow when it is installed and the template is an image
(PNG/JPEG). When Pillow is unavailable — or the template is a PDF — callers
fall back to the personalized HTML certificate (the same artifact leaders
view & print in the portal, and admins attach by email).

Fonts are probed from common OS locations; if nothing usable is found the
Pillow built-in bitmap font is scaled as best-effort, so composition never
hard-fails on a deployment platform.
"""

from __future__ import annotations

import logging
import re
from io import BytesIO
from pathlib import Path

log = logging.getLogger(__name__)

try:  # pragma: no cover - exercised implicitly by importorskip tests
    from PIL import Image, ImageDraw, ImageFont

    PILLOW_AVAILABLE = True
except ImportError:  # pragma: no cover
    PILLOW_AVAILABLE = False

# Rendering style for the official TechAFlon template (organizer spec):
#   - name in Times New Roman (classic certificate serif), deep green ink
#   - font size 50 (Pillow units) at the reference canvas width (1492px, the
#     native size of cer_final.png), scaled proportionally for other sizes
#   - name rendered in CAPITAL LETTERS
#   - name always on a SINGLE line — long names shrink the font to fit the
#     printed rule instead of wrapping (floor: _NAME_MIN_FONT_SIZE)
#   - NO background band — the name sits directly on the template artwork
#   - positioned on the template's blank name area, dropped 18px below the
#     previous position so it sits on / just above the horizontal rule
#     (~62% height on cer_final.png)
#   - no subtitle — the rest of the template artwork stays untouched
_NAME_FONT_SIZE = 50
_NAME_MIN_FONT_SIZE = 26  # shrink floor so very long names stay readable
_REF_CANVAS_WIDTH = 1492  # native width of cer_final.png
_NAME_CENTER_RATIO = 0.56  # vertical centre of the blank name area
_NAME_DROP_PX = 18  # extra px (at reference scale) down toward / onto the rule
_NAME_CENTER_X_RATIO = 0.46  # centre of the printed name rule, clear of the medal
_NAME_MAX_WIDTH_RATIO = 0.44  # keep the name within the printed rule width
_NAME_INK = (27, 94, 57, 255)  # deep TechAFlon green

_BUNDLED_FONT = (
    Path(__file__).resolve().parent.parent / "assets" / "fonts" / "EBGaramond.ttf"
)

# Times New Roman first (organizer requirement). Liberation Serif is kept as
# the Linux fallback because it is metric-compatible with Times New Roman, so
# Docker/Render deployments render the exact same layout.
_FONT_CANDIDATES = (
    # Windows — Times New Roman
    r"C:\Windows\Fonts\times.ttf",
    r"C:\Windows\Fonts\timesbd.ttf",
    # Linux (Docker images such as Render's) — metric-compatible substitute
    "/usr/share/fonts/truetype/liberation/LiberationSerif-Regular.ttf",
    "/usr/share/fonts/truetype/msttcorefonts/Times_New_Roman.ttf",
    "/usr/share/fonts/TTF/LiberationSerif-Regular.ttf",
    # macOS
    "/System/Library/Fonts/Supplemental/Times New Roman.ttf",
    "/System/Library/Fonts/Supplemental/Liberation Serif.ttf",
    # Bundled event typeface (last-resort serif fallback)
    str(_BUNDLED_FONT),
    "/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf",
    r"C:\Windows\Fonts\georgia.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
)


def _load_font(size: int):
    """Best-effort serif font at ``size``, falling back to Pillow defaults."""
    for candidate in _FONT_CANDIDATES:
        try:
            font = ImageFont.truetype(candidate, size=size)
        except OSError:
            continue
        # Static fonts such as Times New Roman do not support named
        # variations and raise here; variable-font fallbacks (e.g. the
        # bundled EB Garamond) get nudged to a confident semibold weight
        # so the name reads as engraved, not thin.
        try:
            font.set_variation_by_name("SemiBold")
        except (OSError, ValueError):
            pass
        return font
    # Pillow >= 10.1 accepts a size for the bundled default font.
    try:
        return ImageFont.load_default(size=size)
    except TypeError:  # pragma: no cover - very old Pillow
        return ImageFont.load_default()


def _fit_name_font(draw: "ImageDraw.ImageDraw", name: str, max_width: int, base_size: int, min_size: int):
    """Return ``(font, size)`` that renders ``name`` on a SINGLE line within ``max_width``.

    Names always stay on one line: instead of wrapping, the font shrinks
    from ``base_size`` (proportionally at first, then in small steps) down
    to ``min_size`` until the whole name fits the printed rule.
    """
    size = base_size
    font = _load_font(size)
    text_width = draw.textlength(name, font=font)
    if text_width > max_width and text_width > 0:
        # One proportional step gets close to the target, then walk down in
        # small steps to land just inside the rule (text width is not perfectly
        # linear in font size).
        size = max(min_size, int(size * max_width / text_width))
        font = _load_font(size)
        while size > min_size and draw.textlength(name, font=font) > max_width:
            size = max(min_size, size - 1)
            font = _load_font(size)
    return font, size


def _centered(
    draw: "ImageDraw.ImageDraw",
    center_x: float,
    xy_y: int,
    text: str,
    font,
    fill,
) -> None:
    """Draw ``text`` horizontally centered on ``center_x`` at top ``xy_y``."""
    left, top, right, bottom = draw.textbbox((0, 0), text, font=font)
    draw.text((center_x - (right - left) / 2 - left, xy_y - top), text, font=font, fill=fill)


def compose_certificate_image(
    data: bytes, content_type: str, *, name: str, team_id: str, subtitle: str = "TechAFlon"
) -> tuple[bytes, str]:
    """Burn ``name`` into the uploaded template image.

    The name is rendered in Times New Roman (metric-compatible fallbacks on
    non-Windows platforms), deep green ink, in CAPITAL LETTERS at size 50
    (scaled to the reference canvas width) on a SINGLE line on the template's
    blank name line — long names shrink the font to fit, and the name is drawn
    directly on the artwork with no background band. No subtitle is drawn.
    ``team_id``/``subtitle`` are accepted for caller compatibility but
    intentionally not rendered.

    Returns ``(png_bytes, "image/png")`` so downstream consumers (downloads,
    email attachments, portal previews) all share one canonical artifact.

    Raises :class:`ValueError` when the bytes are not a decodable image of an
    allowed type — callers translate that into an API error.
    """
    _ = team_id, subtitle  # not drawn; kept for signature compatibility
    if not PILLOW_AVAILABLE:  # pragma: no cover - guarded by caller probe
        raise RuntimeError("Pillow is not installed")
    if content_type not in ("image/png", "image/jpeg"):
        raise ValueError(f"unsupported template type for composition: {content_type}")

    try:
        source = Image.open(BytesIO(data))
        source.load()
    except Exception as exc:  # noqa: BLE001 - any decoder failure is invalid input
        raise ValueError("template bytes are not a decodable image") from exc

    # Organizer spec: names always appear in capital letters.
    display_name = " ".join(name.strip().upper().split())

    width, height = source.size
    composed = source.convert("RGBA")

    draw = ImageDraw.Draw(composed)
    # Size 50 at the reference canvas width (cer_final.png native size),
    # scaled proportionally so other template resolutions look identical.
    base_font_size = max(14, round(_NAME_FONT_SIZE * width / _REF_CANVAS_WIDTH))
    min_font_size = max(12, round(_NAME_MIN_FONT_SIZE * width / _REF_CANVAS_WIDTH))
    # Center on the template's name rule (slightly left of canvas centre) and
    # cap the width so names stay within the printed rule, clear of the medal.
    center_x = width * _NAME_CENTER_X_RATIO
    max_text_width = int(width * _NAME_MAX_WIDTH_RATIO)
    # Single-line guarantee: shrink the font until the whole name fits.
    name_font, _ = _fit_name_font(draw, display_name, max_text_width, base_font_size, min_font_size)

    # Drop the name 18px (at reference scale) below the blank area's centre so
    # it sits on / just above the printed rule. `_centered` takes the text's
    # top coordinate, so shift up by half the text height to stay centred.
    y_center = int(height * _NAME_CENTER_RATIO + _NAME_DROP_PX * width / _REF_CANVAS_WIDTH)
    _, text_top, _, text_bottom = draw.textbbox((0, 0), display_name, font=name_font)
    _centered(
        draw,
        center_x,
        y_center - (text_bottom - text_top) // 2,
        display_name,
        name_font,
        _NAME_INK,
    )

    output = BytesIO()
    composed.convert("RGB").save(output, format="PNG", optimize=True)
    return output.getvalue(), "image/png"


def slugify_filename(value: str) -> str:
    """URL/Content-Disposition-safe segment derived from a participant name."""
    slug = re.sub(r"[^A-Za-z0-9._-]+", "-", value.strip()).strip("-.")
    return slug or "participant"
