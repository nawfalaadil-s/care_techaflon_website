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
#   - NO background band — the name sits directly on the template artwork
#   - positioned on the template's blank name area (~56% height, just above
#     the horizontal rule at ~62% on cer_final.png)
#   - no subtitle — the rest of the template artwork stays untouched
_NAME_FONT_SIZE = 50
_REF_CANVAS_WIDTH = 1492  # native width of cer_final.png
_NAME_CENTER_RATIO = 0.56  # vertical centre of the blank name area
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


def _wrap_name(draw: "ImageDraw.ImageDraw", name: str, max_width: int, font) -> list[str]:
    """Split a long participant name onto at most three centered lines."""
    words = name.strip().split()
    if not words:
        return ["Participant"]
    lines: list[str] = []
    current = words[0]
    for word in words[1:]:
        candidate = f"{current} {word}"
        if draw.textlength(candidate, font=font) <= max_width:
            current = candidate
        else:
            lines.append(current)
            current = word
            if len(lines) == 2:  # hard cap: 3 lines total
                current = " ".join(words[words.index(word):])
                break
    lines.append(current)
    return lines[:3]


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
    (scaled to the reference canvas width) on the template's blank name line —
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
    name_font_size = max(14, round(_NAME_FONT_SIZE * width / _REF_CANVAS_WIDTH))
    name_font = _load_font(name_font_size)
    # Center on the template's name rule (slightly left of canvas centre) and
    # cap the width so names stay within the printed rule, clear of the medal.
    center_x = width * _NAME_CENTER_X_RATIO
    max_text_width = int(width * _NAME_MAX_WIDTH_RATIO)
    lines = _wrap_name(draw, display_name, max_text_width, name_font)

    line_height = name_font_size + max(6, name_font_size // 5)
    block_height = line_height * len(lines)
    y_center = int(height * _NAME_CENTER_RATIO)
    name_top = y_center - block_height // 2

    y = name_top
    for line in lines:
        _centered(draw, center_x, y, line, name_font, _NAME_INK)
        y += line_height

    output = BytesIO()
    composed.convert("RGB").save(output, format="PNG", optimize=True)
    return output.getvalue(), "image/png"


def slugify_filename(value: str) -> str:
    """URL/Content-Disposition-safe segment derived from a participant name."""
    slug = re.sub(r"[^A-Za-z0-9._-]+", "-", value.strip()).strip("-.")
    return slug or "participant"
