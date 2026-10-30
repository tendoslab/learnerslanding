"""Animate Psy-Koh the chameleon from two 40x32 drawings: tools/psykoh.png
(him) and tools/psykoh-brush.png (his paintbrush, drawn behind him).

Psy-Koh is a painter: red beret, a neckerchief, paint splatters on his back
and a big paintbrush leaning over his back, its handle gripped in his curly
tail. He faces right. The drawing only has his near-side legs; the far-side
pair is made here by darkening those and tucking them in behind. Parts are
split by position:

  tail    the band gripping the brush handle, and the spiral below it
  legs    near back / near front (and their far-side copies)
  body    everything else

  walk (6 frames): four-legged gait (near back with far front, then the
                   other pair), body bob, brush rocking on his back
  idle (8 frames): eye swivels around (chameleon eyes do), a dab of the
                   brush, a breath, paint spots shifting colour, a blink

Output goes to public/sprites/critters/psykoh-{walk,idle}.png.

    python3 tools/make_psykoh.py            # regenerate
    python3 tools/make_psykoh.py --preview  # also write a big contact sheet
"""

import os
import sys

from PIL import Image

HERE = os.path.dirname(__file__)
OUT = os.path.join(HERE, '..', 'public', 'sprites', 'critters')
W, H = 40, 32

OUTLINE = (27, 20, 30, 255)
WHITE = (253, 245, 241, 255)
GREEN = (104, 178, 41, 255)
CLEAR = (0, 0, 0, 0)
# Far-side legs: each near-leg colour swapped for a darker one.
FAR = {(104, 178, 41): (37, 125, 44, 255), (37, 125, 44): (22, 82, 36, 255)}
# They sit a little forward and higher, as if further away.
FAR_DX, FAR_DY = 3, -1
# Tail: left of this column, from TAIL_TOP down; the spiral rests on the ground.
TAIL_RIGHT = 10
TAIL_TOP = 19
SPIRAL_TOP = 25
# Legs: from this row down; the back leg sits under his hips, the front one under his chest.
LEG_TOP = 25
BACK_LEG = range(12, 17)
FRONT_LEG = range(22, 28)
# Eye: pupil spots (top-left of its 2x2), the lid row, and where the eye starts.
LOOK = {'ahead': (30, 12), 'back': (27, 12), 'up': (28, 11), 'down': (30, 14)}
LID_ROW = 14
EYE_LEFT = 24
# Paint splatters on his back, and the colours they cycle through.
SPOTS = [(15, 17), (19, 18), (15, 20)]
PAINT = [(255, 201, 92, 255), (38, 98, 171, 255), (235, 113, 113, 255), (253, 245, 241, 255)]


def load(name):
    im = Image.open(os.path.join(HERE, name)).convert('RGBA')
    return {(x, y): im.getpixel((x, y)) for x in range(W) for y in range(H) if im.getpixel((x, y))[3] > 0}


def split(px):
    parts = {k: {} for k in ('tail', 'spiral', 'back', 'front', 'body')}
    for (x, y), c in px.items():
        if x <= TAIL_RIGHT and y >= SPIRAL_TOP:
            part = 'spiral'
        elif x <= TAIL_RIGHT and y >= TAIL_TOP:
            part = 'tail'
        elif y >= LEG_TOP and x in BACK_LEG:
            part = 'back'
        elif y >= LEG_TOP and x in FRONT_LEG:
            part = 'front'
        else:
            part = 'body'
        parts[part][(x, y)] = c
    return parts


def far(leg):
    return {(x + FAR_DX, y + FAR_DY): FAR.get(c[:3], c) for (x, y), c in leg.items()}


def look(body, where):
    out = dict(body)
    ax, ay = LOOK['ahead']
    for k in ((ax, ay), (ax + 1, ay), (ax, ay + 1), (ax + 1, ay + 1)):
        out[k] = WHITE
    x, y = LOOK[where]
    for k in ((x, y), (x + 1, y), (x, y + 1), (x + 1, y + 1)):
        out[k] = OUTLINE
    return out


def blink(body):
    """Closed eye: whites and pupil fill with skin, a lid line runs across."""
    out = dict(body)
    whites = [k for k, c in body.items() if c == WHITE and k[0] >= EYE_LEFT and k[1] < LID_ROW + 3]
    ax, ay = LOOK['ahead']
    for k in whites + [(ax, ay), (ax + 1, ay), (ax, ay + 1), (ax + 1, ay + 1)]:
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


def frame(parts, body_dy=0, a=(0, 0), b=(0, 0), wobble=0, dab=0, eye='ahead', closed=False, shift=0):
    """a moves the near back leg and far front leg, b the other pair ((dx, dy), dy -1 lifts).
    wobble rocks the brush sideways, dab lifts it."""
    img = Image.new('RGBA', (W, H), CLEAR)

    def put(layer, dx, dy):
        for (x, y), c in layer.items():
            if 0 <= x + dx < W and 0 <= y + dy < H:
                img.putpixel((x + dx, y + dy), c)

    # Far legs, near legs and the spiral first, so the body sits over their tops when it bobs.
    put(far(parts['back']), *b)
    put(far(parts['front']), *a)
    put(parts['back'], *a)
    put(parts['front'], *b)
    put(parts['spiral'], 0, 0)
    # The brush leans behind him; the tail wraps over the end of its handle.
    put(parts['brush'], wobble, body_dy - dab)
    body = paint(look(parts['body'], eye), shift)
    put(blink(body) if closed else body, 0, body_dy)
    put(parts['tail'], 0, body_dy)
    return img


def strip(frames):
    sheet = Image.new('RGBA', (W * len(frames), H), CLEAR)
    for i, f in enumerate(frames):
        sheet.paste(f, (i * W, 0))
    return sheet


def main():
    parts = split(load('psykoh.png'))
    parts['brush'] = load('psykoh-brush.png')
    walk = [
        frame(parts, a=(1, 0), b=(-1, 0)),
        frame(parts, a=(0, -1), wobble=-1),
        frame(parts, body_dy=1, wobble=-1),
        frame(parts, a=(-1, 0), b=(1, 0)),
        frame(parts, b=(0, -1), wobble=1),
        frame(parts, body_dy=1, wobble=1),
    ]
    idle = [
        frame(parts),
        frame(parts, eye='back'),
        frame(parts, eye='back', shift=1),
        frame(parts, eye='up', shift=1, dab=1),
        frame(parts, shift=2, body_dy=1),
        frame(parts, eye='down', shift=2),
        frame(parts, shift=3, closed=True),
        frame(parts, shift=3),
    ]
    os.makedirs(OUT, exist_ok=True)
    strip(walk).save(os.path.join(OUT, 'psykoh-walk.png'))
    strip(idle).save(os.path.join(OUT, 'psykoh-idle.png'))
    if '--preview' in sys.argv:
        sheet = Image.new('RGBA', (W * 8, H * 2), (240, 236, 220, 255))
        sheet.alpha_composite(strip(walk), (0, 0))
        sheet.alpha_composite(strip(idle), (0, H))
        sheet.resize((W * 8 * 6, H * 2 * 6), Image.NEAREST).save(os.path.join(HERE, 'psykoh-preview.png'))


if __name__ == '__main__':
    main()
