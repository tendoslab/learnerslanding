"""Animate Bobby the alien from his single 32x32 drawing (tools/bobby.png).

Bobby is split into parts by colour: his butterfly-wing hair (yellow/brown and
the outline hugging it), his four tentacle legs (everything below the body)
and the rest. Each frame nudges those parts a pixel or two:

  walk (6 frames): tentacle tips sway, body squashes, wings flap
  idle (6 frames): gentle wing flutter and a blink

Output goes to public/sprites/critters/bobby-{walk,idle}.png.

    python3 tools/make_bobby.py            # regenerate
    python3 tools/make_bobby.py --preview  # also write a big contact sheet
"""

import os
import sys

from PIL import Image

HERE = os.path.dirname(__file__)
OUT = os.path.join(HERE, '..', 'public', 'sprites', 'critters')
S = 32

WING = {(255, 201, 1), (154, 64, 42)}
BODY = {(133, 108, 221), (199, 202, 255), (228, 75, 151), (151, 44, 82), (255, 255, 255), (0, 29, 149)}
PURPLE = (133, 108, 221, 255)
OUTLINE = (55, 0, 32, 255)
CLEAR = (0, 0, 0, 0)
# Eye: the white/blue patch on top of his head; the lid closes on this row.
EYE_ROWS = range(8, 15)
LID_ROW = 11
# Legs: everything from this row down.
LEG_TOP = 24
# Tentacle tips (from this row down) sway side to side as he walks.
TIP_TOP = 27
# Wing rows at or above this are the top pair, below it the side pair.
WING_SPLIT = 9


def load():
    im = Image.open(os.path.join(HERE, 'bobby.png')).convert('RGBA')
    return {(x, y): im.getpixel((x, y)) for x in range(S) for y in range(S) if im.getpixel((x, y))[3] > 0}


def near(px, x, y, colours):
    return any(px.get((x + dx, y + dy), CLEAR)[:3] in colours for dx in (-1, 0, 1) for dy in (-1, 0, 1))


def split(px):
    """Return (upper wings, lower wings, legs, body) pixel dicts.

    Wings are flood-filled from their yellow/brown pixels through the dark
    outline, stopping at outline that touches the body, so each wing carries
    its own outline when it moves.
    """
    wing = {k for k, c in px.items() if c[:3] in WING}
    todo = list(wing)
    while todo:
        x, y = todo.pop()
        for n in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
            if n in px and n not in wing and n[1] < LEG_TOP - 4 and not near(px, *n, BODY):
                wing.add(n)
                todo.append(n)
    upper, lower, legs, body = {}, {}, {}, {}
    for (x, y), c in px.items():
        if (x, y) in wing:
            (upper if y <= WING_SPLIT else lower)[(x, y)] = c
        elif y >= LEG_TOP:
            legs[(x, y)] = c
        else:
            body[(x, y)] = c
    return upper, lower, legs, body


def blink(body):
    """Closed eye: the white fills with skin and a curved lash line sits low."""
    eye = [(x, y) for (x, y), c in body.items() if y in EYE_ROWS and c[:3] in {(255, 255, 255), (0, 29, 149)}]
    xs = [x for x, _ in eye]
    lo, hi = min(xs), max(xs)
    out = dict(body)
    for x, y in eye:
        out[(x, y)] = PURPLE
    # Pupil sits inside the eye; cover it too.
    for (x, y), c in body.items():
        if y in EYE_ROWS and lo < x < hi and c == OUTLINE and (x - 1, y) in eye and (x + 1, y) in eye:
            out[(x, y)] = PURPLE
    for x in range(lo + 2, hi - 1):
        out[(x, LID_ROW + 1)] = OUTLINE
    out[(lo + 1, LID_ROW)] = OUTLINE
    out[(hi - 1, LID_ROW)] = OUTLINE
    return out


def bridge(img, spots):
    """Close 1px holes a moved wing leaves where it joined the head."""
    solid = lambda x, y: 0 <= x < S and 0 <= y < S and img.getpixel((x, y))[3] > 0
    for x, y in spots:
        if not solid(x, y) and ((solid(x, y - 1) and solid(x, y + 1)) or (solid(x - 1, y) and solid(x + 1, y))):
            img.putpixel((x, y), OUTLINE)


def frame(parts, body_dy=0, wing_dy=0, sway=0, closed=False):
    upper, lower, legs, body = parts
    img = Image.new('RGBA', (S, S), CLEAR)

    def put(layer, dx, dy):
        for (x, y), c in layer.items():
            if 0 <= x + dx < S and 0 <= y + dy < S:
                img.putpixel((x + dx, y + dy), c)

    # Legs first so the body sits over their tops when it bobs down.
    put({k: v for k, v in legs.items() if k[1] < TIP_TOP}, 0, 0)
    put({k: v for k, v in legs.items() if k[1] >= TIP_TOP}, sway, 0)
    # Flutter: top wings lift while the side wings dip.
    put(upper, 0, body_dy - wing_dy)
    put(lower, 0, body_dy + wing_dy)
    put(blink(body) if closed else body, 0, body_dy)
    bridge(img, [(x, y + body_dy) for x, y in [*upper, *lower]])
    return img


def strip(frames):
    sheet = Image.new('RGBA', (S * len(frames), S), CLEAR)
    for i, f in enumerate(frames):
        sheet.paste(f, (i * S, 0))
    return sheet


def main():
    parts = split(load())
    # Tentacle tips sway left then right; the body squashes down between.
    walk = [
        frame(parts, sway=-1),
        frame(parts, wing_dy=1, sway=-1),
        frame(parts, body_dy=1),
        frame(parts, sway=1),
        frame(parts, wing_dy=1, sway=1),
        frame(parts, body_dy=1),
    ]
    idle = [
        frame(parts),
        frame(parts, wing_dy=1),
        frame(parts),
        frame(parts, wing_dy=1),
        frame(parts),
        frame(parts, closed=True),
    ]
    os.makedirs(OUT, exist_ok=True)
    strip(walk).save(os.path.join(OUT, 'bobby-walk.png'))
    strip(idle).save(os.path.join(OUT, 'bobby-idle.png'))
    if '--preview' in sys.argv:
        sheet = Image.new('RGBA', (S * 6, S * 2), (240, 236, 220, 255))
        sheet.alpha_composite(strip(walk), (0, 0))
        sheet.alpha_composite(strip(idle), (0, S))
        sheet.resize((S * 6 * 8, S * 2 * 8), Image.NEAREST).save(os.path.join(HERE, 'bobby-preview.png'))


if __name__ == '__main__':
    main()
