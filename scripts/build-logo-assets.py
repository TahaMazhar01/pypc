#!/usr/bin/env python3
"""
Rebuild the PYPC emblem assets for the web.

Why this exists
---------------
The approved artwork arrived as a print-style crest: a circular badge whose
*interior* is a solid white plate. On a white page that is invisible, so it
looked fine — but the moment the crest sits on the dark-green header, the navy
conference hero or the dark theme, that plate shows up as a white disc and the
logo looks like a sticker pasted on the page ("merged badly", as the client put
it). The dark-surface variant had the same problem in cream.

What this script produces
-------------------------
From the single approved master (`public/images/pypc-emblem-original.jpg`) and
the keyed cut-out (`public/images/pypc-emblem.png`):

  pypc-emblem.png           light surfaces — interior plate removed, artwork intact
  pypc-emblem-on-dark.png   dark surfaces   — same artwork redrawn in light ink + gold,
                                               no plate, fully transparent
  pypc-emblem-512.png       app icon / structured data
  pypc-emblem-256.png       small avatars, email headers
  app/icon.png              favicon (keeps a plate: a browser tab is its own canvas)
  app/apple-icon.png        iOS home screen (also plated, on purpose)

Method
------
1.  Classify every pixel: *background-like* (light and desaturated), *gold*
    (warm, saturated) or *ink* (everything else, i.e. the dark-green line work).
2.  Connected-component the background-like pixels. Only **large** blobs are
    turned transparent: the plate inside the ring and the space outside it. Small
    light blobs are kept, because they are design elements — the cream lettering
    inside the dark ribbon ("LEAD. INNOVATE.") is light but must survive.
3.  For the dark-surface variant, repaint the ink in warm white/cream and lift
    the gold so it reads against navy and dark green, keeping the alpha channel
    so antialiasing stays smooth.

Run:  python3 scripts/build-logo-assets.py
"""

from __future__ import annotations

import pathlib
import sys

import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = pathlib.Path(__file__).resolve().parent.parent
IMAGES = ROOT / "public" / "images"
APP = ROOT / "app"

# Colour decisions, in one place.
CREAM = (247, 243, 233)          # ink on dark surfaces
GOLD_ON_DARK = (226, 187, 108)   # gold, lifted for dark surfaces
GOLD_ON_LIGHT = (196, 156, 60)   # gold, as approved, for light surfaces

# Background classification thresholds.
LIGHT_LEVEL = 205                # luminance above this can be plate
LOW_SATURATION = 0.16            # saturation below this can be plate
MIN_PLATE_AREA = 4000            # px; smaller light blobs are design elements


def classify(rgb: np.ndarray) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    """Returns (background_like, gold, ink) boolean masks."""
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    luminance = 0.299 * r + 0.587 * g + 0.114 * b
    mx = rgb.max(axis=-1)
    mn = rgb.min(axis=-1)
    saturation = (mx - mn) / np.maximum(mx, 1e-6)

    gold = (r > b + 24) & (luminance > 80) & (saturation > 0.18)
    background_like = (luminance > LIGHT_LEVEL) & (saturation < LOW_SATURATION) & ~gold
    ink = ~gold & ~background_like
    return background_like, gold, ink


def plate_mask(background_like: np.ndarray) -> np.ndarray:
    """
    Of the background-like pixels, the ones that are actually plate: large
    connected blobs. Lettering inside the ribbon stays.
    """
    labelled, count = ndimage.label(background_like)
    if count == 0:
        return np.zeros_like(background_like)

    sizes = ndimage.sum(background_like, labelled, index=np.arange(1, count + 1))
    keep_labels = np.where(sizes >= MIN_PLATE_AREA)[0] + 1
    plate = np.isin(labelled, keep_labels)

    # Slightly grow the plate so the antialiased 1px halo around the artwork goes
    # with it; otherwise a faint white rim survives on dark backgrounds.
    return ndimage.binary_dilation(plate, iterations=1)


def smooth_alpha(base_alpha: np.ndarray, plate: np.ndarray, background_like: np.ndarray) -> np.ndarray:
    """
    Alpha for the plate area: 0 inside, and a soft ramp across the antialiased
    boundary so edges do not stair-step.
    """
    soft = ndimage.gaussian_filter(plate.astype(np.float32), sigma=0.6)
    inside = np.clip(1.0 - soft, 0.0, 1.0)
    alpha = base_alpha.astype(np.float32) * inside
    # Anything classified as plate with a solid fill becomes fully transparent.
    alpha[plate] = np.minimum(alpha[plate], 0.0)
    del background_like
    return np.clip(alpha, 0, 255).astype(np.uint8)


def build_light_surface(src: Image.Image) -> Image.Image:
    """The crest for light pages: plate removed, artwork untouched."""
    rgba = src.convert("RGBA")
    rgb = np.asarray(rgba).astype(np.float32)[..., :3]
    alpha = np.asarray(rgba)[..., 3]

    background_like, _gold, _ink = classify(rgb)
    plate = plate_mask(background_like)
    # Only treat plate pixels that are already part of the crest body (opaque).
    plate &= alpha > 0

    out = np.asarray(rgba).copy()
    out[..., 3] = smooth_alpha(alpha, plate, background_like)
    return Image.fromarray(out, "RGBA")


def build_dark_surface(src: Image.Image) -> Image.Image:
    """
    The crest for dark surfaces: plate removed, ink repainted in cream, gold
    lifted. Alpha is preserved throughout, so the result composites cleanly on
    the green header, the navy hero and the dark theme.
    """
    rgba = src.convert("RGBA")
    arr = np.asarray(rgba).astype(np.float32)
    rgb = arr[..., :3]
    alpha = arr[..., 3]

    background_like, gold, ink = classify(rgb)
    plate = plate_mask(background_like) & (alpha > 0)

    # Antialiasing: pixels between ink and plate are partially transparent. Their
    # colour should follow their *luminance share* of ink, not the original dark
    # green, or edges look muddy.
    coverage = np.clip((alpha / 255.0), 0.0, 1.0)
    coverage = ndimage.gaussian_filter(coverage, sigma=0.4)

    rgb_out = np.zeros_like(rgb)
    for channel in range(3):
        rgb_out[..., channel] = (
            CREAM[channel] * coverage + GOLD_ON_DARK[channel] * (1.0 - coverage)
        )

    # Gold keeps its warmth (and gets a lift); everything else becomes cream.
    gold_weight = gold.astype(np.float32)
    for channel in range(3):
        lifted_gold = rgb[..., channel] * 0.45 + GOLD_ON_DARK[channel] * 0.55
        rgb_out[..., channel] = (
            rgb_out[..., channel] * (1.0 - gold_weight) + lifted_gold * gold_weight
        )

    # Ink is cream; keep a hint of the original dark green out of it entirely.
    cream_weight = ink.astype(np.float32)
    for channel in range(3):
        rgb_out[..., channel] = (
            rgb_out[..., channel] * (1.0 - cream_weight) + CREAM[channel] * cream_weight
        )

    out = np.dstack([rgb_out, alpha]).astype(np.uint8)
    out = out.copy()
    out[..., 3] = smooth_alpha(alpha, plate, background_like)
    return Image.fromarray(out, "RGBA")


def plated(src: Image.Image, size: int, background=(255, 255, 255)) -> Image.Image:
    """
    Flat square icon: the crest on a solid plate, for favicons and the iOS home
    screen where transparency is not wanted.
    """
    crest = src.convert("RGBA")
    canvas = Image.new("RGBA", (size, size), background + (255,))
    inner = crest.copy()
    inner.thumbnail((int(size * 0.92), int(size * 0.92)), Image.LANCZOS)
    offset = ((size - inner.width) // 2, (size - inner.height) // 2)
    canvas.alpha_composite(inner, offset)
    return canvas


def main() -> int:
    master_path = IMAGES / "pypc-emblem.png"
    if not master_path.exists():
        print(f"master not found: {master_path}", file=sys.stderr)
        return 1

    master = Image.open(master_path)
    print(f"master: {master_path.name} {master.size} {master.mode}")

    light = build_light_surface(master)
    dark = build_dark_surface(master)

    light.save(IMAGES / "pypc-emblem.png")
    print("wrote public/images/pypc-emblem.png           (light surfaces, plate removed)")

    dark.save(IMAGES / "pypc-emblem-on-dark.png")
    print("wrote public/images/pypc-emblem-on-dark.png   (dark surfaces, light ink)")

    for size in (512, 256, 192, 128):
        light.resize((size, size), Image.LANCZOS).save(IMAGES / f"pypc-emblem-{size}.png")
    dark.resize((512, 512), Image.LANCZOS).save(IMAGES / "pypc-emblem-on-dark-512.png")
    print("wrote size variants 512 / 256 / 192 / 128")

    # Android adaptive icons crop to a circle or squircle: the crest is padded to
    # ~62% of the canvas, inside the 66% safe zone, so nothing important is cut.
    maskable = Image.new("RGBA", (512, 512), (255, 255, 255, 255))
    crest = light.copy()
    crest.thumbnail((318, 318), Image.LANCZOS)
    maskable.alpha_composite(crest, ((512 - crest.width) // 2, (512 - crest.height) // 2))
    maskable.save(IMAGES / "pypc-emblem-maskable-512.png")
    print("wrote public/images/pypc-emblem-maskable-512.png (Android safe zone)")

    plated(light, 512).save(APP / "icon.png")
    plated(light, 180).save(APP / "apple-icon.png")
    print("wrote app/icon.png + app/apple-icon.png (plated, deliberately)")

    # Report what changed, so the run is auditable.
    for name in ("pypc-emblem.png", "pypc-emblem-on-dark.png"):
        image = Image.open(IMAGES / name)
        alpha = np.asarray(image.convert("RGBA"))[..., 3]
        transparent_share = float((alpha == 0).mean()) * 100
        print(f"  {name}: {transparent_share:.1f}% of pixels fully transparent")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
