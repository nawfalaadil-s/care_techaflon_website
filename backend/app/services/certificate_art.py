"""Per-participant certificate artwork.

Composites a participant's name (plus their team identifier) onto the
organizers' uploaded certificate template so every user receives their own
named artifact instead of a shared blank design.

Rendering uses Pillow when it is installed and the template is an image
(PNG/JPEG). When Pillow is unavailable — or the template is a PDF — callers
fall back to the personalized HTML certificate, which every participant
already receives by email.

Fonts are probed from common OS locations; if nothing usable is found the
Pillow built-in bitmap font is scaled as best-effort, so composition never
hard-fails on a deployment platform.
"""

from __future__ import annotations

import logging
import re
from io import BytesIO

log = logging.getLogger(__name__)

try:  # pragma: no cover - exercised implicitly by importorskip tests
    from PIL import Image, ImageDraw, ImageFont

    PILLOW_AVAILABLE = True
except ImportError:  # pragma: no cover
    PILLOW_AVAILABLE = False

# Share of the canvas height reserved for the name line; keeps the name
# readable on both wide landscape A4 designs and square social graphics.
_NAME_HEIGHT_RATIO = 0.14
_SUBTITLE_HEIGHT_RATIO = 0.05

_FONT_CANDIDATES = (
    # Windows
    r"C:\Windows\Fonts\arialbd.ttf",
    r"C:\Windows\Fonts\Arial.ttf",
    r"C:\Windows\Fonts\segoeuib.ttf",
    r"C:\Windows\Fonts\calibrib.ttf",
    # Linux (common in Docker images such as Render's)
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
    "/usr/share/fonts/TTF/DejaVuSans-Bold.ttf",
    # macOS
    "/Library/Fonts/Arial Bold.ttf",
    "/System/Library/Fonts/Helvetica.ttc",
)


def _load_font(size: int):
    """Best-effort bold font at ``size``, falling back to Pillow defaults."""
    for candidate in _FONT_CANDIDATES:
        try:
            return ImageFont.truetype(candidate, size=size)
        except OSError:
            continue
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
    xy_y: int,
    text: str,
    font,
    width: int,
    fill,
) -> None:
    left, top, right, bottom = draw.textbbox((0, 0), text, font=font)
    draw.text(((width - (right - left)) / 2 - left, xy_y - top), text, font=font, fill=fill)


def compose_certificate_image(
    data: bytes, content_type: str, *, name: str, team_id: str, subtitle: str = "TechAFlon"
) -> tuple[bytes, str]:
    """Burn ``name``/``team_id`` into the uploaded template image.

    Returns ``(png_bytes, "image/png")`` so downstream consumers (downloads,
    email attachments, portal previews) all share one canonical artifact.

    Raises :class:`ValueError` when the bytes are not a decodable image of an
    allowed type — callers translate that into an API error.
    """
    if not PILLOW_AVAILABLE:  # pragma: no cover - guarded by caller probe
        raise RuntimeError("Pillow is not installed")
    if content_type not in ("image/png", "image/jpeg"):
        raise ValueError(f"unsupported template type for composition: {content_type}")

    try:
        source = Image.open(BytesIO(data))
        source.load()
    except Exception as exc:  # noqa: BLE001 - any decoder failure is invalid input
        raise ValueError("template bytes are not a decodable image") from exc

    width, height = source.size
    base = source.convert("RGBA")

    # Semi-transparent scrim behind the text guarantees legibility even when
    # organizers pick a busy background design.
    overlay = Image.new("RGBA", base.size, (0, 0, 0, 0))
    scrim = Image.new("RGBA", base.size, (255, 255, 255, 96))
    y_center = int(height * 0.60)
    band_height = int(height * (_NAME_HEIGHT_RATIO * 2 + _SUBTITLE_HEIGHT_RATIO * 4))
    overlay.paste(scrim, (0, y_center - band_height // 2))

    composed = Image.alpha_composite(base, overlay)
    draw = ImageDraw.Draw(composed)

    name_font_size = max(18, int(height * _NAME_HEIGHT_RATIO))
    name_font = _load_font(name_font_size)

    max_text_width = int(width * 0.86)
    lines = _wrap_name(draw, name, max_text_width, name_font)
    ink = (16, 32, 20, 255)

    line_height = name_font_size + max(6, name_font_size // 5)
    block_height = line_height * len(lines)
    y = y_center - block_height // 2
    for line in lines:
        _centered(draw, y, line, name_font, width, ink)
        y += line_height

    subtitle_font = _load_font(max(11, int(height * _SUBTITLE_HEIGHT_RATIO)))
    _centered(draw, y + int(_SUBTITLE_HEIGHT_RATIO * height), f"{subtitle} · {team_id}", subtitle_font, width, ink)

    output = BytesIO()
    composed.convert("RGB").save(output, format="PNG", optimize=True)
    return output.getvalue(), "image/png"


def slugify_filename(value: str) -> str:
    """URL/Content-Disposition-safe segment derived from a participant name."""
    slug = re.sub(r"[^A-Za-z0-9._-]+", "-", value.strip()).strip("-.")
    return slug or "participant"
