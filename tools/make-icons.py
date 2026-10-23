# Makes the light icons favicon/ico-light-{180,192,512}.png (black "a." on the grey tile with a white outline of exact width)
# and the experiment icons favicon/touch-cutout-{0..7}.png (project-colored tile, "a." cut out as transparent).
#   python3 tools/make-icons.py      (needs Pillow, numpy, fontTools, brotli); then: node tools/touch-icon.js inline
# Recipe: docs/reference.md, "Home screen icon (iOS)". The dark icon is not made here.
import io
import math
import os
import numpy as np
from fontTools.ttLib import TTFont
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
OUTLINE = 0.0125   # share of the icon width
SUPER = 8
TILE = '#e6e6e9'
INK = '#000000'
WHITE = (255, 255, 255)
TEXT = 'a.'
# project colors of msmr.dev (projects.json): oklch (chroma, hue, lightness)
CUTOUT_COLORS = [(0.16, 256, 0.69), (0.14, 115, 0.63), (0.22, 5, 0.7), (0.17, 210, 0.76), (0.19, 155, 0.7), (0.2, 305, 0.7), (0.2, 44, 0.7), (0.16, 95, 0.82)]
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


def grow_by_disc(mask, radius):
    """Grow a 0/255 mask by a circle of `radius` pixels."""
    a = np.asarray(mask) > 127
    h, w = a.shape
    r = int(np.floor(radius))
    csum = np.pad(np.cumsum(a, axis=1, dtype=np.int32), ((0, 0), (1, 0)))
    horizontal = {}
    out = np.zeros_like(a)
    for dy in range(-r, r + 1):
        half = int(np.floor(np.sqrt(radius * radius - dy * dy)))
        if half not in horizontal:
            lo = np.clip(np.arange(w) - half, 0, w)
            hi = np.clip(np.arange(w) + half + 1, 0, w)
            horizontal[half] = (csum[:, hi] - csum[:, lo]) > 0
        rows = horizontal[half]
        if dy >= 0:
            out[dy:] |= rows[: h - dy]
        else:
            out[:dy] |= rows[-dy:]
    return Image.fromarray((out * 255).astype(np.uint8), 'L')


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


def icon(size, draw_letter):
    big = size * SUPER
    mask = Image.new('L', (big, big), 0)
    draw_letter(ImageDraw.Draw(mask), big, 255)
    grown = grow_by_disc(mask, OUTLINE * big)
    on_white = Image.new('RGB', (big, big), WHITE)
    draw_letter(ImageDraw.Draw(on_white), big, INK)
    letter = np.asarray(on_white.resize((size, size), Image.LANCZOS), dtype=np.float64)
    cov = np.asarray(grown.resize((size, size), Image.BOX), dtype=np.float64) / 255.0
    tile = np.asarray(Image.new('RGB', (size, size), TILE), dtype=np.float64)
    mixed = letter * cov[..., None] + tile * (1 - cov[..., None])
    return Image.fromarray(np.rint(mixed).astype(np.uint8), 'RGB')


def oklch_rgb(chroma, hue, light):
    a, b = chroma * math.cos(math.radians(hue)), chroma * math.sin(math.radians(hue))
    l, m, s = (light + .3963377774 * a + .2158037573 * b) ** 3, (light - .1055613458 * a - .0638541728 * b) ** 3, (light - .0894841775 * a - 1.2914855480 * b) ** 3
    lin = (4.0767416621 * l - 3.3077115913 * m + .2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - .3413193965 * s, -.0041960863 * l - .7034186147 * m + 1.7076147010 * s)
    enc = lambda v: 12.92 * v if v <= .0031308 else 1.055 * v ** (1 / 2.4) - .055
    return tuple(round(min(1, max(0, enc(max(0, v)))) * 255) for v in lin)


def cutout_icon(size, color):
    """Opaque tile of `color`, the letter cut out as transparent (alpha = 1 - letter coverage)."""
    big = size * SUPER
    mask = Image.new('L', (big, big), 0)
    letter_painter(size)(ImageDraw.Draw(mask), big, 255)
    alpha = 255 - np.asarray(mask.resize((size, size), Image.BOX), dtype=np.uint8)
    out = Image.new('RGBA', (size, size), color + (255,))
    out.putalpha(Image.fromarray(alpha, 'L'))
    return out


if __name__ == '__main__':
    for n, hue in enumerate(CUTOUT_COLORS):
        cutout_icon(180, oklch_rgb(*hue)).save(os.path.join(ROOT, 'favicon/touch-cutout-%d.png' % n))
    for size in (180, 192, 512):
        icon(size, letter_painter(size)).save(os.path.join(ROOT, 'favicon/ico-light-%d.png' % size))
