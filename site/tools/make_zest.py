"""Animate Zest, the lemon-headed footballer, from his drawing (draw_zest.py,
the 'tuck' hold: ball upright between his arm and hip).

He's put together from layers so each can move on its own:

  head      the lemon and his face (redrawn per frame: glances, blinks, the
            smug brow, a grin, the stem wiggling)
  torso     jersey, ball arm and hips, with the ball taken out
  ball      drawn tucked against his hip, or flying when he tosses it
  free arm  his other arm, which swings as he walks
  legs      left / right, below the hips

  walk (48 frames, two rows: walking left, walking right): a confident jog.
        The ball arm stays locked, the free arm swings against the stepping
        leg, the body dips as a foot lands and the big lemon head lands a
        frame later. Over the six-second loop he glances where he's going,
        blinks once and hitches the ball up once.
  idle (32 frames): mostly breaths, with his signature smug brow raise,
        a look left and right (reading the field), a blink, a stem wiggle and,
        once a loop, a little toss and catch of the ball with a big grin.

Output goes to public/sprites/critters/zest-{walk,idle}.png (two rows each;
idle's rows are the same, facing you).

    python3 tools/make_zest.py            # regenerate
    python3 tools/make_zest.py --preview  # also write a big contact sheet
"""

import os
import sys

from PIL import Image

import draw_zest as z

HERE = os.path.dirname(__file__)
OUT = os.path.join(HERE, '..', 'public', 'sprites', 'critters')
S = 32
O = z.OUTLINE
CLEAR = z.CLEAR
TONGUE = (234, 122, 132, 255)

# The torso with the ball taken out of the tuck: the 'tuck' drawing's arm on
# the left, the plain jersey and hip behind where the ball sits.
TORSO_LEFT = {
    17: ".......OWWNNN",
    18: "......OWWNNNN",
    19: ".....ONNOONNN",
    20: "....OWWO..ONN",
    21: "...OYYYO..ONN",
    22: "...OYyyO..ORR",
    23: "....OOO...OWW",
    24: "..........",
}
# The ball upright (tucked) and on its side (spinning at the top of a toss).
BALL_UP = [
    "..OO..",
    ".OBBO.",
    "OBBWBO",
    "OBWWbO",
    "ObBWbO",
    ".ObbO.",
    "..OO..",
]
BALL_SIDE = [
    "..OOOO..",
    ".OBWWBO.",
    "OBBBBbbO",
    ".ObbbbO.",
    "..OOOO..",
]
TUCK_AT = (7, 18)
# Free arm: right of the torso outline, from the cuff down.
ARM_COLS, ARM_TOP, ARM_BOTTOM = 22, 20, 23
# Legs: from this row down, split down the middle. Hips above stay with the torso.
LEG_TOP = 26
MID = 16
# Turning: inside the jersey these rows slide a pixel toward where he's going.
TURN_ROWS = range(17, 22)
TURN_COLS = range(11, 21)


def grid(rows, top=0, left=0):
    return {(left + x, top + y): z.KEY[ch] for y, row in enumerate(rows) for x, ch in enumerate(row) if ch != '.'}


def body_layers():
    rows = []
    for r, row in enumerate(z.BODY):
        y = 16 + r
        lo = TORSO_LEFT.get(y)
        rows.append(lo + row[len(lo):] if lo else row)
    px = grid(rows, top=16)
    torso, arm, leg_l, leg_r = {}, {}, {}, {}
    for (x, y), c in px.items():
        if y >= LEG_TOP:
            (leg_l if x < MID else leg_r)[(x, y)] = c
        elif x >= ARM_COLS and ARM_TOP <= y <= ARM_BOTTOM:
            arm[(x, y)] = c
        else:
            torso[(x, y)] = c
    return torso, arm, leg_l, leg_r


def turn(torso, d):
    """Slide the jersey front (the number) a pixel toward where he's going."""
    if not d:
        return torso
    out = dict(torso)
    for y in TURN_ROWS:
        for x in TURN_COLS:
            src = (x - d, y)
            if src[0] in TURN_COLS:
                out[(x, y)] = torso[src]
    return out


EYES = (7, 18)
PUPILS = {'left': (1, 2), 'mid': (2, 3), 'right': (3, 4)}


def head(dx=0, look='right', eyes='open', brow=0, mouth='smile', tip=0):
    """The lemon with his face, shifted dx pixels when he turns.

    look   where the pupils sit: 'left', 'mid' (at you) or 'right' (his usual side-eye)
    eyes   'open', 'closed' (lids down) or 'happy' (^ ^)
    brow   1 lifts his cocked brow a pixel higher: the smug look
    mouth  'smile' or 'grin' (open, tongue showing)
    tip    1 flicks the green stem tip up a pixel
    """
    px = z.lemon()
    if tip:
        px[(3, 7)] = z.TIP
        px[(2, 7)] = px[(3, 6)] = O
        px[(3, 9)] = O
    f = {}
    for k in ((7, 6 - brow), (8, 5 - brow), (9, 4 - brow), (10, 4 - brow), (11, 4 - brow), (12, 4 - brow)):
        f[k] = O
    for x in range(18, 24):
        f[(x, 5)] = O
    for ex in EYES:
        if eyes == 'happy':
            for k in ((ex + 1, 9), (ex + 2, 8), (ex + 3, 8), (ex + 4, 9)):
                f[k] = O
            continue
        for x in range(ex + 1, ex + 5):
            f[(x, 7)] = O
            f[(x, 10)] = O
        f[(ex, 8)] = f[(ex, 9)] = O
        f[(ex + 5, 8)] = f[(ex + 5, 9)] = O
        for x in range(ex + 1, ex + 5):
            f[(x, 8)] = z.PEEL_SHADE
            f[(x, 9)] = z.PEEL_SHADE if eyes == 'closed' else z.EYE
        if eyes == 'open':
            for p in PUPILS[look]:
                f[(ex + p, 9)] = O
        else:
            for x in range(ex + 1, ex + 5):
                f[(x, 10)] = O
    f[(6, 11)] = f[(25, 10)] = z.BLUSH
    if mouth == 'grin':
        for x in range(13, 19):
            f[(x, 12)] = O
        f[(12, 11)] = f[(19, 11)] = O
        f[(13, 13)] = f[(18, 13)] = O
        for x in range(14, 18):
            f[(x, 13)] = TONGUE
            f[(x, 14)] = O
    else:
        for k in ((13, 12), (14, 13), (15, 13), (16, 13), (17, 13), (18, 12), (19, 11)):
            f[k] = O
    for (x, y), c in f.items():
        px[(x + dx, y)] = c
    return px


def frame(layers, body_dy=0, head_dy=0, legs=(0, 0), swing=0, facing=0, ball='tuck', ball_at=None, **face):
    """legs: (left, right) flags lifting that foot; swing: fling the free arm
    out; facing -1 / 1 turns him a little left / right; ball 'tuck', 'hitch'
    (tucked a pixel higher), 'up' or 'side' (in the air at ball_at); anything
    else goes to head()."""
    torso, arm, leg_l, leg_r = layers
    img = Image.new('RGBA', (S, S), CLEAR)

    def put(layer, dx, dy):
        for (x, y), c in layer.items():
            if 0 <= x + dx < S and 0 <= y + dy < S:
                img.putpixel((x + dx, y + dy), c)

    for leg, lift in ((leg_l, legs[0]), (leg_r, legs[1])):
        put(leg, 0, 0)
        if lift:
            put({k: v for k, v in leg.items() if k[1] > LEG_TOP}, 0, -1)
            bottom = max(y for _, y in leg)
            for (x, y) in [k for k in leg if k[1] == bottom]:
                img.putpixel((x, y), CLEAR)
    t = turn(torso, facing)
    # Stamped where it was too, so dipping stretches the collar instead of
    # opening a gap under the head.
    put(t, 0, 0)
    put(t, 0, body_dy)
    put(arm, 0, body_dy)
    if swing:
        put(arm, 1, body_dy - 1)
    if ball in ('tuck', 'hitch'):
        put(grid(BALL_UP), TUCK_AT[0], TUCK_AT[1] + body_dy - (ball == 'hitch'))
    put(head(dx=facing, **face), 0, head_dy)
    if ball in ('up', 'side'):
        put(grid(BALL_UP if ball == 'up' else BALL_SIDE), *ball_at)
    return img


def strip(*rows):
    sheet = Image.new('RGBA', (S * len(rows[0]), S * len(rows)), CLEAR)
    for r, frames in enumerate(rows):
        for i, f in enumerate(frames):
            sheet.paste(f, (i * S, r * S))
    return sheet


def main():
    L = body_layers()

    # Sixteen strides (six seconds at 8fps). Each stride: foot up, foot up,
    # land (body dips, head still up), and the head lands on the next frame.
    def walk_loop(d):
        look = 'left' if d < 0 else 'right'

        def stride(lead, **extra):
            legs = (1, 0) if lead == 'l' else (0, 1)
            swing = lead == 'l'
            return [
                frame(L, legs=legs, swing=swing, facing=d, head_dy=1, **extra),
                frame(L, legs=legs, swing=swing, facing=d, **extra),
                frame(L, body_dy=1, facing=d, **extra),
            ]
        plain = stride('l') + stride('r')
        return (
            plain + plain +
            stride('l', look=look) + stride('r', look=look) +
            plain + plain +
            stride('l', ball='hitch') + stride('r') +
            plain +
            stride('l', eyes='closed') + stride('r')
        )
    walk_l, walk_r = walk_loop(-1), walk_loop(1)

    def breaths(n):
        return [f for _ in range(n) for f in (frame(L), frame(L, body_dy=1, head_dy=1), frame(L))]
    idle = (
        breaths(2) +
        # The smug look: eyes on you, the cocked brow climbs higher.
        [frame(L, look='mid'), frame(L, look='mid', brow=1), frame(L, look='mid', brow=1), frame(L, look='mid')] +
        breaths(1) +
        # Reading the field.
        [frame(L, look='left'), frame(L, look='left'), frame(L, look='mid'), frame(L)] +
        [frame(L, eyes='closed')] +
        [frame(L, tip=1), frame(L), frame(L, tip=1)] +
        breaths(1) +
        # Toss and catch: dip, the ball pops up, spins at the top, comes down
        # and he tucks it away with a grin.
        [frame(L, body_dy=1, head_dy=1),
         frame(L, ball='up', ball_at=(6, 13), swing=0, look='mid'),
         frame(L, ball='side', ball_at=(3, 10), eyes='happy', mouth='grin'),
         frame(L, ball='up', ball_at=(6, 13), eyes='happy', mouth='grin'),
         frame(L, body_dy=1, head_dy=1, eyes='happy', mouth='grin'),
         frame(L)] +
        [frame(L), frame(L)]
    )
    assert len(walk_l) == 48 and len(idle) == 32, (len(walk_l), len(idle))
    os.makedirs(OUT, exist_ok=True)
    strip(walk_l, walk_r).save(os.path.join(OUT, 'zest-walk.png'))
    strip(idle, idle).save(os.path.join(OUT, 'zest-idle.png'))
    if '--preview' in sys.argv:
        n = max(len(walk_l), len(idle))
        sheet = Image.new('RGBA', (S * n, S * 3), (240, 236, 220, 255))
        sheet.alpha_composite(strip(walk_l, walk_r), (0, 0))
        sheet.alpha_composite(strip(idle), (0, S * 2))
        sheet.resize((S * n * 6, S * 3 * 6), Image.NEAREST).save(os.path.join(HERE, 'zest-preview.png'))


if __name__ == '__main__':
    main()
