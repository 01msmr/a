# Makes the light home screen icons favicon/ico-light-{180,192,512}.png: black "a." on the grey tile with a white outline of exact width.
#   python3 tools/make-icons.py      (needs Pillow, numpy, fontTools, brotli); then: node tools/touch-icon.js inline
# Recipe: docs/reference.md, "Home screen icon (iOS)". The dark icon is not made here.
import io
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


if __name__ == '__main__':
    for size in (180, 192, 512):
        icon(size, letter_painter(size)).save(os.path.join(ROOT, 'favicon/ico-light-%d.png' % size))
