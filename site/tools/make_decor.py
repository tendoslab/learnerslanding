"""Generate the pixel-art decorations used in the workspace village.

Each decoration is drawn on a tiny grid with simple shapes, then given a dark
outline automatically. Output goes to public/sprites/decor/<id>.png.

    python3 tools/make_decor.py            # regenerate all
    python3 tools/make_decor.py --preview  # also write a contact sheet

Feel free to swap any PNG for hand-made art; the workspace only cares about
the file name, plus each item's size (w, h) in src/workspace/rewards.ts.
"""

import math
import os
import sys

from PIL import Image

OUT = os.path.join(os.path.dirname(__file__), '..', 'public', 'sprites', 'decor')

PAL = {
    'k': (42, 27, 46),
    'g': (47, 107, 58), 'G': (76, 160, 80), 'l': (139, 209, 124),
    'b': (91, 58, 41), 'B': (138, 90, 59), 'w': (196, 138, 90), 'W': (244, 241, 234),
    'r': (217, 83, 79), 'R': (163, 58, 54),
    'y': (247, 209, 84), 'Y': (255, 243, 163), 'o': (240, 138, 36),
    'p': (242, 155, 191), 'P': (155, 107, 214), 'v': (110, 70, 170),
    's': (154, 160, 166), 'S': (107, 113, 120), 'd': (70, 74, 82),
    'c': (91, 192, 235), 'C': (47, 127, 181),
    'n': (120, 200, 210), 'e': (230, 220, 200),
}


# Spare pixels around every drawing, so shapes that reach the edge of their grid
# (or a pixel past it) still get their outline instead of being cut off. The
# finished image is trimmed to the art.
MARGIN = 3


class Canvas:
    def __init__(self, w, h):
        self.w, self.h = w + 2 * MARGIN, h + 2 * MARGIN
        self.px = [[None] * self.w for _ in range(self.h)]

    def set(self, x, y, c):
        x, y = x + MARGIN, y + MARGIN
        if 0 <= x < self.w and 0 <= y < self.h:
            self.px[y][x] = c

    def rect(self, x, y, w, h, c):
        for j in range(y, y + h):
            for i in range(x, x + w):
                self.set(i, j, c)

    def ellipse(self, cx, cy, rx, ry, c):
        for j in range(math.floor(cy - ry), math.ceil(cy + ry) + 1):
            for i in range(math.floor(cx - rx), math.ceil(cx + rx) + 1):
                if ((i + 0.5 - cx) / rx) ** 2 + ((j + 0.5 - cy) / ry) ** 2 <= 1:
                    self.set(i, j, c)

    def tri(self, x0, y0, x1, x2, y1, c):
        """Upward triangle: apex (x0, y0), base from x1..x2 at row y1."""
        for j in range(y0, y1 + 1):
            t = (j - y0) / max(1, y1 - y0)
            a = x0 + (x1 - x0) * t
            b = x0 + (x2 - x0) * t
            for i in range(math.floor(a), math.ceil(b) + 1):
                self.set(i, j, c)

    def outline(self):
        add = []
        for y in range(self.h):
            for x in range(self.w):
                if self.px[y][x] is None:
                    for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                        nx, ny = x + dx, y + dy
                        if 0 <= nx < self.w and 0 <= ny < self.h and self.px[ny][nx] not in (None, 'k'):
                            add.append((x, y))
                            break
        for x, y in add:
            self.px[y][x] = 'k'
        return self

    def image(self):
        im = Image.new('RGBA', (self.w, self.h), (0, 0, 0, 0))
        for y in range(self.h):
            for x in range(self.w):
                c = self.px[y][x]
                if c:
                    im.putpixel((x, y), PAL[c] + (255,))
        return im.crop(im.getbbox())


def flowers():
    c = Canvas(14, 9)
    for x, h in ((2, 4), (5, 6), (8, 5), (11, 4)):
        c.rect(x, 9 - h, 1, h, 'g')
    c.ellipse(5, 7.5, 5, 2, 'G'); c.ellipse(10, 7.5, 3.5, 2, 'G')
    for x, y, col in ((2, 4, 'p'), (5, 2, 'y'), (8, 3, 'P'), (11, 4, 'r')):
        c.rect(x - 1, y, 3, 1, col); c.rect(x, y - 1, 1, 3, col); c.set(x, y, 'Y')
    return c


def mushrooms():
    c = Canvas(14, 11)
    c.rect(3, 6, 2, 5, 'e'); c.ellipse(4, 5.5, 4, 3, 'r'); c.rect(0, 6, 9, 1, 'R')
    c.set(3, 4, 'W'); c.set(5, 5, 'W'); c.set(2, 5, 'W')
    c.rect(10, 8, 2, 3, 'e'); c.ellipse(11, 8, 3, 2, 'o'); c.set(11, 7, 'W')
    return c


def bush():
    c = Canvas(18, 11)
    c.ellipse(5, 7, 5, 4, 'g'); c.ellipse(12, 7, 6, 4, 'g'); c.ellipse(9, 4.5, 5, 4, 'G')
    c.ellipse(5, 6, 3.5, 3, 'G'); c.ellipse(12.5, 6, 4, 3, 'G')
    for x, y in ((7, 3), (11, 4), (4, 6), (14, 6), (9, 7)):
        c.set(x, y, 'l')
    c.set(6, 5, 'r'); c.set(13, 4, 'r'); c.set(10, 8, 'r')
    return c


def fence():
    c = Canvas(20, 11)
    for x in (1, 7, 13, 19 - 2):
        c.rect(x, 1, 2, 10, 'w'); c.set(x, 0, 'w'); c.rect(x + 1, 1, 1, 10, 'B')
    c.rect(0, 3, 20, 2, 'w'); c.rect(0, 7, 20, 2, 'w'); c.rect(0, 4, 20, 1, 'B'); c.rect(0, 8, 20, 1, 'B')
    return c


def lamp():
    c = Canvas(9, 26)
    c.rect(3, 8, 3, 16, 'd'); c.rect(4, 8, 1, 16, 'S'); c.rect(2, 23, 5, 3, 'd')
    c.rect(1, 2, 7, 6, 'd'); c.rect(2, 3, 5, 4, 'Y'); c.rect(3, 4, 3, 2, 'W')
    c.rect(2, 1, 5, 1, 'd'); c.rect(4, 0, 1, 1, 'd')
    return c


def bench():
    c = Canvas(20, 12)
    c.rect(1, 1, 18, 2, 'w'); c.rect(1, 4, 18, 2, 'w'); c.rect(0, 7, 20, 2, 'w')
    c.rect(1, 2, 18, 1, 'B'); c.rect(1, 5, 18, 1, 'B'); c.rect(0, 8, 20, 1, 'B')
    for x in (2, 16):
        c.rect(x, 1, 2, 11, 'd')
    return c


def mailbox():
    c = Canvas(11, 17)
    c.rect(4, 8, 2, 9, 'b'); c.rect(5, 8, 1, 9, 'B')
    c.rect(0, 2, 9, 6, 'C'); c.ellipse(4.5, 2.5, 4.5, 2.5, 'C'); c.rect(1, 3, 3, 4, 'c')
    c.rect(9, 0, 1, 5, 'd'); c.rect(9, 0, 2, 2, 'r')
    return c


def tree():
    c = Canvas(28, 34)
    c.rect(11, 20, 6, 14, 'b'); c.rect(13, 20, 3, 14, 'B'); c.rect(9, 32, 10, 2, 'b')
    c.ellipse(14, 12, 12, 10, 'g'); c.ellipse(8, 16, 6, 5, 'g'); c.ellipse(20, 16, 6, 5, 'g')
    c.ellipse(12, 10, 8, 7, 'G'); c.ellipse(19, 12, 5, 4, 'G'); c.ellipse(7, 14, 4, 3, 'G')
    for x, y in ((9, 6), (14, 5), (18, 9), (6, 12), (11, 11), (16, 7)):
        c.set(x, y, 'l'); c.set(x + 1, y, 'l')
    for x, y in ((8, 16), (17, 15), (21, 18), (12, 18), (14, 12)):
        c.rect(x, y, 2, 2, 'r'); c.set(x, y, 'p')
    return c


def pine():
    c = Canvas(18, 32)
    c.rect(7, 26, 4, 6, 'b'); c.rect(8, 26, 2, 6, 'B')
    for y0, y1, half in ((0, 10, 5), (5, 17, 7), (11, 26, 9)):
        c.tri(9, y0, 9 - half, 9 + half, y1, 'g')
        c.tri(9, y0 + 1, 9 - half + 2, 9 + 1, y1 - 1, 'G')
    for x, y in ((8, 4), (6, 12), (5, 20), (9, 15), (7, 22)):
        c.set(x, y, 'l')
    return c


def campfire():
    c = Canvas(16, 14)
    c.rect(1, 11, 14, 2, 'b'); c.rect(3, 10, 10, 2, 'B'); c.rect(1, 12, 14, 1, 'B')
    c.tri(8, 1, 3, 13, 10, 'r'); c.tri(8, 4, 5, 11, 10, 'o'); c.tri(8, 7, 6, 10, 10, 'y')
    c.set(4, 3, 'o'); c.set(12, 5, 'o')
    for x in (0, 15):
        c.rect(x, 12, 1, 2, 's')
    c.rect(1, 13, 14, 1, 's')
    return c


def well():
    c = Canvas(20, 24)
    c.rect(2, 1, 16, 2, 'R'); c.tri(10, 0, 1, 19, 4, 'r'); c.rect(1, 4, 18, 1, 'R')
    c.rect(3, 5, 2, 10, 'b'); c.rect(15, 5, 2, 10, 'b'); c.rect(4, 7, 12, 1, 'B')
    c.rect(9, 8, 1, 4, 'd'); c.rect(8, 11, 3, 3, 'S')
    c.rect(1, 14, 18, 10, 's'); c.rect(1, 14, 18, 2, 'S')
    for y in (17, 20):
        for x in range(1 + (y % 2) * 2, 19, 4):
            c.rect(x, y, 3, 1, 'S')
    c.rect(3, 14, 14, 1, 'C')
    return c


def tent():
    c = Canvas(24, 18)
    c.tri(12, 0, 0, 24, 17, 'o'); c.tri(12, 0, 12, 24, 17, 'R')
    c.tri(12, 6, 8, 16, 17, 'b'); c.rect(11, 0, 2, 2, 'w')
    c.tri(12, 2, 2, 10, 14, 'y')
    return c


def cottage():
    c = Canvas(34, 34)
    c.rect(4, 15, 26, 19, 'e'); c.rect(4, 15, 3, 19, 'w')
    c.rect(23, 3, 4, 8, 'S'); c.rect(23, 2, 4, 1, 'd')
    c.tri(17, 2, -1, 35, 16, 'r')
    for y in range(7, 16, 3):  # shingle rows
        for x in range(0, 34):
            if c.px[y][x] == 'r':
                c.set(x, y, 'R')
    c.rect(14, 22, 7, 12, 'b'); c.rect(15, 23, 5, 11, 'B'); c.set(19, 28, 'y')
    for x in (7, 24):
        c.rect(x, 20, 5, 5, 'Y'); c.rect(x + 2, 20, 1, 5, 'b'); c.rect(x, 22, 5, 1, 'b')
        c.rect(x - 1, 25, 7, 1, 'b'); c.rect(x - 1, 26, 7, 1, 'G'); c.set(x, 26, 'p'); c.set(x + 4, 26, 'r')
    c.rect(13, 33, 9, 1, 's')
    return c


def cafe():
    c = Canvas(34, 32)
    c.rect(3, 12, 28, 20, 'w'); c.rect(3, 12, 28, 1, 'b')
    for x in range(1, 33, 4):
        c.rect(x, 6, 2, 6, 'r'); c.rect(x + 2, 6, 2, 6, 'W')
    c.rect(1, 4, 32, 2, 'R')
    for x in range(1, 33, 4):
        c.ellipse(x + 2, 12, 2, 1.5, 'r' if (x // 4) % 2 == 0 else 'W')
    c.rect(6, 0, 22, 4, 'b'); c.rect(7, 1, 20, 2, 'Y')
    c.rect(6, 15, 9, 8, 'n'); c.rect(7, 16, 3, 3, 'W'); c.rect(6, 19, 9, 1, 'b')
    c.rect(19, 15, 8, 17, 'b'); c.rect(20, 16, 6, 16, 'B'); c.rect(21, 17, 4, 6, 'n'); c.set(24, 25, 'y')
    c.rect(4, 24, 13, 8, 'B'); c.rect(4, 24, 13, 1, 'b')
    c.rect(8, 21, 3, 3, 'W'); c.rect(11, 22, 1, 1, 'W'); c.set(9, 20, 's')
    c.rect(1, 29, 2, 3, 'G'); c.rect(31, 29, 2, 3, 'G')
    return c


def tower():
    c = Canvas(26, 44)
    c.rect(5, 14, 16, 30, 's'); c.rect(5, 14, 3, 30, 'S')
    for y in range(18, 44, 5):
        for x in range(5 + (y % 2) * 3, 18, 6):
            c.rect(x, y, min(4, 21 - x), 1, 'S')
    c.rect(3, 10, 20, 4, 's')
    for x in range(3, 23, 4):
        c.rect(x, 8, 2, 2, 's')
    c.tri(13, 0, 6, 20, 8, 'P'); c.tri(13, 1, 13, 20, 8, 'v')
    c.rect(13, 0, 1, 1, 'y')
    c.rect(10, 34, 6, 10, 'b'); c.ellipse(13, 34, 3, 2, 'b'); c.rect(11, 35, 4, 9, 'B')
    for y in (18, 26):
        c.rect(12, y, 3, 4, 'Y'); c.ellipse(13.5, y, 1.5, 1, 'Y')
    c.rect(3, 41, 2, 3, 'G'); c.rect(21, 41, 2, 3, 'G')
    return c


def pond():
    c = Canvas(30, 10)
    c.ellipse(15, 5, 15, 5, 's'); c.ellipse(15, 5, 13, 4, 'C'); c.ellipse(14, 4.5, 11, 3, 'c')
    c.rect(8, 3, 3, 1, 'W'); c.rect(18, 6, 2, 1, 'W')
    c.ellipse(21, 4, 2.5, 1.5, 'G'); c.set(21, 3, 'p')
    c.rect(1, 2, 1, 5, 'g'); c.rect(3, 1, 1, 5, 'G')
    return c


def bookstack():
    c = Canvas(14, 14)
    c.rect(1, 10, 12, 4, 'C'); c.rect(1, 10, 12, 1, 'W'); c.rect(1, 13, 12, 1, 'c')
    c.rect(2, 6, 10, 4, 'r'); c.rect(2, 6, 10, 1, 'W'); c.rect(2, 9, 10, 1, 'R')
    c.rect(1, 2, 11, 4, 'G'); c.rect(1, 2, 11, 1, 'W'); c.rect(1, 5, 11, 1, 'g')
    c.rect(9, 0, 3, 2, 'y')
    return c


ITEMS = {
    'flowers': flowers, 'mushrooms': mushrooms, 'bush': bush, 'fence': fence,
    'books': bookstack, 'lamp': lamp, 'bench': bench, 'mailbox': mailbox,
    'campfire': campfire, 'pond': pond, 'pine': pine, 'tree': tree, 'well': well,
    'tent': tent, 'cottage': cottage, 'cafe': cafe, 'tower': tower,
}


def main():
    os.makedirs(OUT, exist_ok=True)
    images = {}
    for name, fn in ITEMS.items():
        im = fn().outline().image()
        im.save(os.path.join(OUT, f'{name}.png'))
        images[name] = im
        print(f'{name:10s} {im.size}')
    if '--preview' in sys.argv:
        scale, pad = 5, 12
        W = sum(i.width * scale + pad for i in images.values()) + pad
        H = max(i.height for i in images.values()) * scale + 2 * pad
        sheet = Image.new('RGBA', (W, H), (120, 170, 110, 255))
        x = pad
        for im in images.values():
            big = im.resize((im.width * scale, im.height * scale), Image.NEAREST)
            sheet.paste(big, (x, H - pad - big.height), big)
            x += big.width + pad
        path = sys.argv[sys.argv.index('--preview') + 1] if len(sys.argv) > sys.argv.index('--preview') + 1 else 'decor-preview.png'
        sheet.save(path)
        print('preview ->', path)


if __name__ == '__main__':
    main()
