#!/usr/bin/env python3
"""
Build the Open Graph / social-share images for PYPC.

Why this exists
---------------
Every link to the site is shared somewhere — WhatsApp groups, LinkedIn, email,
X, university bulletins. Without an Open Graph image those shares render as a
bare grey card, which reads as unprofessional next to institutions that do have
one. This script produces the branded card once, from the approved emblem, so
`openGraph.images` always points at a real file.

Outputs (all 1200x630, the size every major platform crops from):
  public/images/og-default.png         site-wide share card
  public/images/og-imun-2027.png       the conference page
  public/images/og-membership.png      the membership page
  public/images/og-verify.png          certificate verification

Design: the conference navy, the council's gold rule, the emblem with its
interior plate intact (a sharing card *is* its own canvas, so a plate is correct
here), and the page title set in the largest legible size. Nothing is fetched at
runtime — these are static files.

Run:  python3 scripts/build-og-images.py
"""

from __future__ import annotations

import pathlib

from PIL import Image, ImageDraw, ImageFont

ROOT = pathlib.Path(__file__).resolve().parent.parent
IMAGES = ROOT / "public" / "images"
FONT_DIR = pathlib.Path("/usr/share/fonts/truetype/dejavu")

WIDTH, HEIGHT = 1200, 630

# Palette, matching lib/design-tokens.ts
NAVY = (8, 22, 42)
NAVY_DEEP = (4, 12, 24)
GREEN = (11, 61, 46)
GREEN_DEEP = (6, 38, 30)
GOLD = (201, 162, 39)
GOLD_LIGHT = (226, 187, 108)
CREAM = (247, 243, 233)
WHITE = (255, 255, 255)
MUTED = (176, 190, 208)

CARDS = [
    {
        "file": "og-default.png",
        "kicker": "PAKISTAN YOUTH PARLIAMENTARY COUNCIL",
        "title": "Leadership, policy and\ninternational participation",
        "subtitle": "Membership · Programmes · Certificates",
        "background": GREEN_DEEP,
        "accent": GOLD
    },
    {
        "file": "og-imun-2027.png",
        "kicker": "FLAGSHIP CONFERENCE · IMUN 2027",
        "title": "International Model\nUnited Nations 2027",
        "subtitle": "Islamabad · Committees · Scholarships",
        "background": NAVY,
        "accent": (26, 115, 232)
    },
    {
        "file": "og-membership.png",
        "kicker": "MEMBERSHIP",
        "title": "Four tiers.\nOne national platform.",
        "subtitle": "Free · Associate · Executive · Institutional — PKR and USD",
        "background": GREEN,
        "accent": GOLD
    },
    {
        "file": "og-verify.png",
        "kicker": "CERTIFICATE VERIFICATION",
        "title": "Verify a PYPC\ncertificate instantly",
        "subtitle": "QR code or reference — no account needed",
        "background": GREEN_DEEP,
        "accent": GOLD_LIGHT
    },
]


def font(name: str, size: int) -> ImageFont.FreeTypeFont:
    path = FONT_DIR / name
    if not path.exists():
        return ImageFont.load_default()
    return ImageFont.truetype(str(path), size)


def wrap(draw: ImageDraw.ImageDraw, text: str, face, max_width: int) -> list[str]:
    """Greedy wrap, honouring explicit newlines in the source string."""
    lines: list[str] = []
    for paragraph in text.split("\n"):
        words = paragraph.split()
        current = ""
        for word in words:
            candidate = f"{current} {word}".strip()
            if draw.textlength(candidate, font=face) <= max_width or not current:
                current = candidate
            else:
                lines.append(current)
                current = word
        lines.append(current)
    return lines


def vertical_gradient(size: tuple[int, int], top: tuple[int, int, int], bottom: tuple[int, int, int]) -> Image.Image:
    """Subtle top-to-bottom gradient — flat colour reads as a template."""
    width, height = size
    gradient = Image.new("RGB", (1, height))
    for y in range(height):
        ratio = y / max(1, height - 1)
        gradient.putpixel(
            (0, y),
            tuple(int(top[i] + (bottom[i] - top[i]) * ratio) for i in range(3)),
        )
    return gradient.resize((width, height), Image.BILINEAR)


def build(card: dict) -> pathlib.Path:
    accent = card["accent"]
    background = card["background"]
    deeper = tuple(max(0, channel - 22) for channel in background)

    canvas = vertical_gradient((WIDTH, HEIGHT), background, deeper).convert("RGBA")
    draw = ImageDraw.Draw(canvas)

    # Emblem on the right, with its plate — a share card is its own canvas.
    emblem = Image.open(IMAGES / "pypc-emblem-512.png").convert("RGBA")
    emblem.thumbnail((380, 380), Image.LANCZOS)
    canvas.alpha_composite(emblem, (WIDTH - emblem.width - 70, (HEIGHT - emblem.height) // 2))

    # Gold rule down the left edge: the council's visual signature.
    draw.rectangle([0, 0, 10, HEIGHT], fill=accent)

    text_left = 74
    # Leave the emblem its own column plus a gutter, so text never runs under it.
    text_width = WIDTH - emblem.width - 150

    kicker_font = font("DejaVuSans-Bold.ttf", 22)
    title_font = font("DejaVuSans-Bold.ttf", 54)
    subtitle_font = font("DejaVuSans.ttf", 23)

    y = 148
    draw.text((text_left, y), card["kicker"], font=kicker_font, fill=accent)
    y += 50

    title_lines = wrap(draw, card["title"], title_font, text_width)
    for line in title_lines:
        draw.text((text_left, y), line, font=title_font, fill=WHITE)
        y += 62

    y += 10
    subtitle_lines = wrap(draw, card["subtitle"], subtitle_font, text_width)
    # The footer strip owns the bottom 90px; the subtitle stops before it.
    while subtitle_lines and y + len(subtitle_lines) * 32 > HEIGHT - 90:
        subtitle_lines.pop()
    for line in subtitle_lines:
        draw.text((text_left, y), line, font=subtitle_font, fill=MUTED)
        y += 32

    # Footer: the domain line and the official handle.
    footer_font = font("DejaVuSans-Bold.ttf", 20)
    draw.text((text_left, HEIGHT - 66), "pypc.org", font=footer_font, fill=accent)
    handle = "@pypcofficial on Instagram · Facebook · YouTube"
    draw.text((text_left + 130, HEIGHT - 64), handle, font=font("DejaVuSans.ttf", 18), fill=MUTED)

    out = IMAGES / card["file"]
    canvas.convert("RGB").save(out, "PNG", optimize=True)
    return out


def main() -> int:
    if not (IMAGES / "pypc-emblem-512.png").exists():
        print("emblem missing — run scripts/build-logo-assets.py first")
        return 1
    for card in CARDS:
        path = build(card)
        print(f"wrote {path.relative_to(ROOT)}  ({path.stat().st_size // 1024} kB)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
