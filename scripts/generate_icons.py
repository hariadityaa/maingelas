#!/usr/bin/env python3
"""Generates PWA icons (cocktail glass mark on the app's brand gradient).

Renders at 4x supersample and downsamples for clean anti-aliasing.
Content stays within the center ~70% so the same file works as a
maskable icon (Android crops adaptive icons to its own shape).
"""
import numpy as np
from PIL import Image, ImageDraw

SCALE = 4
SIZES = {
    "icon-192.png": 192,
    "icon-512.png": 512,
    "apple-touch-icon.png": 180,
}

PINK = (255, 95, 158)
PURPLE = (124, 92, 255)
WHITE = (245, 242, 255)
LIQUID = (255, 182, 72)
GARNISH = (255, 95, 158)


def draw_icon(size):
    s = size * SCALE
    img = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Diagonal gradient background, rounded square.
    yy, xx = np.mgrid[0:s, 0:s]
    t = (xx + yy) / (2 * s)
    pink = np.array(PINK)
    purple = np.array(PURPLE)
    grad_arr = (pink[None, None, :] + (purple - pink)[None, None, :] * t[:, :, None]).astype("uint8")
    grad = Image.fromarray(grad_arr, "RGB")

    mask = Image.new("L", (s, s), 0)
    mdraw = ImageDraw.Draw(mask)
    radius = int(s * 0.22)
    mdraw.rounded_rectangle([0, 0, s - 1, s - 1], radius=radius, fill=255)
    img.paste(grad, (0, 0), mask)
    draw = ImageDraw.Draw(img)

    cx = s / 2
    cup_top_y = s * 0.30
    cup_bottom_y = s * 0.58
    cup_half_w = s * 0.26
    stem_bottom_y = s * 0.74
    base_y = s * 0.78
    base_half_w = s * 0.15
    stroke = max(2, int(s * 0.028))

    # Cup outline (coupe glass).
    cup_pts = [
        (cx - cup_half_w, cup_top_y),
        (cx + cup_half_w, cup_top_y),
        (cx, cup_bottom_y),
    ]
    # Liquid fill, inset slightly below the rim.
    liquid_pts = [
        (cx - cup_half_w * 0.78, cup_top_y + s * 0.055),
        (cx + cup_half_w * 0.78, cup_top_y + s * 0.055),
        (cx, cup_bottom_y),
    ]
    draw.polygon(liquid_pts, fill=LIQUID)
    draw.line(cup_pts + [cup_pts[0]], fill=WHITE, width=stroke, joint="curve")

    # Stem.
    draw.line([(cx, cup_bottom_y), (cx, stem_bottom_y)], fill=WHITE, width=stroke)

    # Base.
    draw.line(
        [(cx - base_half_w, base_y), (cx + base_half_w, base_y)],
        fill=WHITE,
        width=stroke,
        joint="curve",
    )

    # Straw.
    draw.line(
        [(cx - s * 0.18, s * 0.20), (cx + s * 0.10, s * 0.46)],
        fill=WHITE,
        width=int(stroke * 1.3),
    )

    # Garnish (cherry) on the rim.
    gr = s * 0.045
    gx, gy = cx + cup_half_w * 0.5, cup_top_y - s * 0.01
    draw.ellipse([gx - gr, gy - gr, gx + gr, gy + gr], fill=GARNISH, outline=WHITE, width=stroke // 2)

    return img.resize((size, size), Image.LANCZOS)


if __name__ == "__main__":
    import os

    out_dir = os.path.join(os.path.dirname(__file__), "..", "icons")
    os.makedirs(out_dir, exist_ok=True)
    for filename, size in SIZES.items():
        icon = draw_icon(size)
        path = os.path.join(out_dir, filename)
        icon.save(path)
        print(f"wrote {path} ({size}x{size})")
