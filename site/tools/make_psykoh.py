"""Animate Psy-Koh the chameleon from his single 32x32 drawing (tools/psykoh.png).

Psy-Koh is a painter: red beret, a big paintbrush standing up behind him, a neckerchief and
paint splatters on his back. He faces right. Parts are split by position: his
two legs (the stubby columns under his belly), his curly tail (bottom left)
and the rest. Each frame nudges those parts a pixel:

  walk (6 frames): legs stride and lift in turn, body bobs
  idle (6 frames): the paint spots on his back shift colour (he is a
                   chameleon, after all), a little breath and a blink

Output goes to public/sprites/critters/psykoh-{walk,idle}.png.

    python3 tools/make_psykoh.py            # regenerate
    python3 tools/make_psykoh.py --preview  # also write a big contact sheet
"""

import os
import sys

from PIL import Image

HERE = os.path.dirname(__file__)
OUT = os.path.join(HERE, '..', 'public', 'sprites', 'critters')
S = 32

OUTLINE = (27, 20, 30, 255)
WHITE = (253, 245, 241)
GREEN = (104, 178, 41, 255)
CLEAR = (0, 0, 0, 0)
# Legs: everything from this row down, right of the tail.
LEG_TOP = 25
TAIL_RIGHT = 8
# The back leg is left of this column, the front leg right of it.
LEG_SPLIT = 13
# Eye: the pupil pixels, the row the lid closes along, and the column it
# starts at (the brush's white bristles are further left).
PUPIL = [(22, 12), (23, 12), (22, 13), (23, 13)]
LID_ROW = 14
EYE_LEFT = 16
# Paint splatters on his back, and the colours they cycle through.
SPOTS = [(7, 17), (11, 18), (7, 20)]
PAINT = [(255, 201, 92, 255), (38, 98, 171, 255), (235, 113, 113, 255), (253, 245, 241, 255)]


def load():
    im = Image.open(os.path.join(HERE, 'psykoh.png')).convert('RGBA')
    return {(x, y): im.getpixel((x, y)) for x in range(S) for y in range(S) if im.getpixel((x, y))[3] > 0}


def split(px):
    """Return (back leg, front leg, tail, body) pixel dicts."""
    back, front, tail, body = {}, {}, {}, {}
    for (x, y), c in px.items():
        if x <= TAIL_RIGHT and y >= LEG_TOP - 1:
            tail[(x, y)] = c
        elif y >= LEG_TOP:
            (back if x < LEG_SPLIT else front)[(x, y)] = c
        else:
            body[(x, y)] = c
    return back, front, tail, body


def blink(body):
    """Closed eye: whites and pupil fill with skin, a lid line curves across."""
    out = dict(body)
    whites = [k for k, c in body.items() if c[:3] == WHITE and k[0] >= EYE_LEFT and k[1] < LID_ROW + 3]
    for k in whites + PUPIL:
        out[k] = GREEN
    xs = [x for x, y in whites if y == LID_ROW]
    lo, hi = min(xs), max(xs)
    for x in range(lo + 1, hi):
        out[(x, LID_ROW)] = OUTLINE
    out[(lo, LID_ROW - 1)] = OUTLINE
    out[(hi, LID_ROW - 1)] = OUTLINE
    return out


def paint(body, shift):
    out = dict(body)
    for i, k in enumerate(SPOTS):
        out[k] = PAINT[(i + shift) % len(PAINT)]
    return out


def frame(parts, body_dy=0, back=(0, 0), front=(0, 0), closed=False, shift=0):
    """back/front are (dx, dy) nudges for each leg (dy -1 lifts it)."""
    back_leg, front_leg, tail, body = parts
    img = Image.new('RGBA', (S, S), CLEAR)

    def put(layer, dx, dy):
        for (x, y), c in layer.items():
            if 0 <= x + dx < S and 0 <= y + dy < S:
                img.putpixel((x + dx, y + dy), c)

    # Legs and tail first so the body sits over their tops when it bobs down.
    put(back_leg, *back)
    put(front_leg, *front)
    put(tail, 0, 0)
    body = paint(body, shift)
    put(blink(body) if closed else body, 0, body_dy)
    return img


def strip(frames):
    sheet = Image.new('RGBA', (S * len(frames), S), CLEAR)
    for i, f in enumerate(frames):
        sheet.paste(f, (i * S, 0))
    return sheet


def main():
    parts = split(load())
    walk = [
        frame(parts, back=(-1, 0), front=(1, 0)),
        frame(parts, back=(0, -1), front=(0, 0)),
        frame(parts, body_dy=1),
        frame(parts, back=(1, 0), front=(-1, 0)),
        frame(parts, back=(0, 0), front=(0, -1)),
        frame(parts, body_dy=1),
    ]
    idle = [
        frame(parts),
        frame(parts, shift=1),
        frame(parts, shift=1, body_dy=1),
        frame(parts, shift=2),
        frame(parts, shift=3),
        frame(parts, shift=3, closed=True),
    ]
    os.makedirs(OUT, exist_ok=True)
    strip(walk).save(os.path.join(OUT, 'psykoh-walk.png'))
    strip(idle).save(os.path.join(OUT, 'psykoh-idle.png'))
    if '--preview' in sys.argv:
        sheet = Image.new('RGBA', (S * 6, S * 2), (240, 236, 220, 255))
        sheet.alpha_composite(strip(walk), (0, 0))
        sheet.alpha_composite(strip(idle), (0, S))
        sheet.resize((S * 6 * 8, S * 2 * 8), Image.NEAREST).save(os.path.join(HERE, 'psykoh-preview.png'))


if __name__ == '__main__':
    main()
