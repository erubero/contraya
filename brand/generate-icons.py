"""Generate every Contraya icon from brand/contraya-logo.png.

Re-runnable: delete the outputs and run again. Source is 900x900 RGB with a
solid #04193E field; App Store wants 1024 square and no alpha, Android wants a
transparent foreground inside a safe zone, and the og-image is a wide crop.
"""
from PIL import Image, ImageDraw
import os

SRC = 'brand/contraya-logo.png'
# Sampled from the master's border (v2 C-mark, 2026-07-30). If the logo's
# field ever changes, resample and update the four mirrors listed in README.
NAVY = (0x01, 0x13, 0x2F)
L = Image.LANCZOS

src = Image.open(SRC).convert('RGB')
W, H = src.size


def flood_transparent(im, tol=60):
    """Knock out the OUTER background only.

    A plain colour-key would also punch a hole through the magnifier's inner
    circle, which is the same navy as the field. Flooding inward from the
    border keeps enclosed navy intact.
    """
    im = im.convert('RGBA')
    px = im.load()
    w, h = im.size
    seen = [[False] * w for _ in range(h)]
    stack = [(x, 0) for x in range(w)] + [(x, h - 1) for x in range(w)]
    stack += [(0, y) for y in range(h)] + [(w - 1, y) for y in range(h)]
    while stack:
        x, y = stack.pop()
        if x < 0 or y < 0 or x >= w or y >= h or seen[y][x]:
            continue
        r, g, b, _ = px[x, y]
        if abs(r - NAVY[0]) + abs(g - NAVY[1]) + abs(b - NAVY[2]) > tol:
            continue
        seen[y][x] = True
        px[x, y] = (r, g, b, 0)
        stack += [(x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)]
    return im


def content_bbox(im):
    """Tight box around the artwork, ignoring the navy field."""
    rgb = im.convert('RGB')
    px = rgb.load()
    w, h = rgb.size
    minx, miny, maxx, maxy = w, h, 0, 0
    for y in range(h):
        for x in range(w):
            r, g, b = px[x, y]
            if abs(r - NAVY[0]) + abs(g - NAVY[1]) + abs(b - NAVY[2]) > 40:
                minx, maxx = min(minx, x), max(maxx, x)
                miny, maxy = min(miny, y), max(maxy, y)
    return (minx, miny, maxx + 1, maxy + 1)


def square_on_navy(size):
    """Full-bleed navy square. No alpha, which App Store icons require."""
    return src.resize((size, size), L)


def mark_on(size, scale, bg=None):
    """Artwork centred at `scale` of the canvas, on `bg` or transparency.

    The source composition sits slightly right and low; recentring the tight
    bbox is what makes the mark look centred once Android masks it to a circle.
    """
    cut = flood_transparent(src).crop(content_bbox(src))
    cw, ch = cut.size
    target = int(size * scale)
    ratio = min(target / cw, target / ch)
    cut = cut.resize((max(1, int(cw * ratio)), max(1, int(ch * ratio))), L)
    canvas = Image.new('RGBA', (size, size), (bg + (255,)) if bg else (0, 0, 0, 0))
    canvas.paste(cut, ((size - cut.width) // 2, (size - cut.height) // 2), cut)
    return canvas


def save(im, path, keep_alpha=False):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    if not keep_alpha:
        flat = Image.new('RGB', im.size, NAVY)
        if im.mode == 'RGBA':
            flat.paste(im, (0, 0), im)
        else:
            flat.paste(im, (0, 0))
        im = flat
    im.save(path, 'PNG', optimize=True)
    print(f'  {path:44} {im.size[0]}x{im.size[1]} {im.mode}')


print('iOS / app icon (opaque, App Store requires no alpha)')
save(square_on_navy(1024), 'mobile/assets/icon.png')

print('Android adaptive foreground (transparent, inside the 66% safe zone)')
save(mark_on(1024, 0.60), 'mobile/assets/adaptive-icon.png', keep_alpha=True)

print('Splash (transparent so it sits on the configured backgroundColor)')
save(mark_on(1024, 0.55), 'mobile/assets/splash-icon.png', keep_alpha=True)

print('Web icons')
for path, size in [
    ('public/icons/favicon.png', 64),
    ('public/icons/apple-touch-icon.png', 180),
    ('public/icons/icon-192.png', 192),
    ('public/icons/icon-512.png', 512),
]:
    save(square_on_navy(size), path)

print('Open Graph card (1200x630, mark centred on navy)')
og = Image.new('RGB', (1200, 630), NAVY)
mark = mark_on(630, 0.72)
og.paste(mark, ((1200 - 630) // 2, 0), mark)
save(og, 'public/og-image.png')
