# Makes the icons: tiles in the eight msmr.dev project colors with a solid light "a." (opaque RGB, no alpha: iOS fills transparent pixels with black).
#   favicon/icon-{0..7}.png, 180 px: tab favicon and home screen, one picked at random by favicon/touch-icon-inline.js
#   favicon/icon-192.png and icon-512.png (color 0, for the manifests)
#   python3 tools/make-icons.py      (needs Pillow, numpy, fontTools, brotli); then: node tools/touch-icon.js inline
import io
import math
import os
import numpy as np
from fontTools.ttLib import TTFont
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
SUPER = 8
TEXT = 'a.'
LETTER = (255, 255, 255)
# project colors of msmr.dev (projects.json): oklch (chroma, hue, lightness)
TILE_COLORS = [(0.16, 256, 0.69), (0.14, 115, 0.63), (0.22, 5, 0.7), (0.17, 210, 0.76), (0.19, 155, 0.7), (0.2, 305, 0.7), (0.2, 44, 0.7), (0.16, 95, 0.82)]
# ink box of the letters in a 180 px icon: left edge, right edge (exclusive), bottom (exclusive)
LEFT, RIGHT, BOTTOM = 30, 147, 139


def font_file():
    font = TTFont(os.path.join(ROOT, 'fonts/ubuntu-400-latin.woff2'))
    font.flavor = None
    buf = io.BytesIO()
    font.save(buf)
    buf.seek(0)
    return buf.getvalue()


FONT_BYTES = font_file()


def ink_box(px):
    """Ink box (left, top, right, bottom) of TEXT drawn at the origin with anchor 'ls', relative to the origin."""
    font = ImageFont.truetype(io.BytesIO(FONT_BYTES), px)
    m = int(px * 2)
    mask = Image.new('L', (m * 2, m * 2), 0)
    ImageDraw.Draw(mask).text((m / 2, m), TEXT, font=font, fill=255, anchor='ls')
    l, t, r, b = mask.getbbox()
    return l - m / 2, t - m, r - m / 2, b - m


def letter_painter(size):
    """Returns draw_letter(draw, big, fill): "a." with its ink box at LEFT/RIGHT/BOTTOM (scaled from 180 px)."""
    def draw_letter(draw, big, fill):
        k = big / 180
        px = 1000
        l, t, r, b = ink_box(px)
        px = px * (RIGHT - LEFT) * k / (r - l)
        l, t, r, b = ink_box(px)
        draw.text((LEFT * k - l, BOTTOM * k - b), TEXT, font=ImageFont.truetype(io.BytesIO(FONT_BYTES), px), fill=fill, anchor='ls')
    return draw_letter


def oklch_rgb(chroma, hue, light):
    a, b = chroma * math.cos(math.radians(hue)), chroma * math.sin(math.radians(hue))
    l, m, s = (light + .3963377774 * a + .2158037573 * b) ** 3, (light - .1055613458 * a - .0638541728 * b) ** 3, (light - .0894841775 * a - 1.2914855480 * b) ** 3
    lin = (4.0767416621 * l - 3.3077115913 * m + .2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - .3413193965 * s, -.0041960863 * l - .7034186147 * m + 1.7076147010 * s)
    enc = lambda v: 12.92 * v if v <= .0031308 else 1.055 * v ** (1 / 2.4) - .055
    return tuple(round(min(1, max(0, enc(max(0, v)))) * 255) for v in lin)


def letter_icon(size, tile, letter):
    """Opaque tile with the letter in a solid color (iOS fills transparent pixels with black, so no cutout)."""
    big = size * SUPER
    mask = Image.new('L', (big, big), 0)
    letter_painter(size)(ImageDraw.Draw(mask), big, 255)
    cov = np.asarray(mask.resize((size, size), Image.BOX), dtype=np.float64)[..., None] / 255.0
    mixed = np.array(letter, dtype=np.float64) * cov + np.array(tile, dtype=np.float64) * (1 - cov)
    return Image.fromarray(np.rint(mixed).astype(np.uint8), 'RGB')


if __name__ == '__main__':
    tiles = [oklch_rgb(*hue) for hue in TILE_COLORS]
    for n, tile in enumerate(tiles):
        letter_icon(180, tile, LETTER).save(os.path.join(ROOT, 'favicon/icon-%d.png' % n))
    for size in (192, 512):
        letter_icon(size, tiles[0], LETTER).save(os.path.join(ROOT, 'favicon/icon-%d.png' % size))
