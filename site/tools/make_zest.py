"""Animate Zest, the lemon-headed footballer, from his drawing (draw_zest.py,
the 'tuck' hold: ball upright between his arm and hip).

He's put together from layers so each can move on its own:

  head      the lemon and his face (redrawn per frame: glances, blinks, the
            smug brow, a grin, the stem wiggling)
  torso     jersey, ball arm and hips, with the ball taken out
  ball      drawn tucked against his hip, or flying when he tosses it
  free arm  his other arm, which swings as he walks
  legs      left / right, below the hips

  walk (48 frames, two rows: walking left, walking right): a confident walk
        in three-quarter view, like Twiggy and Orange: both eyes still show
        but sit toward where he's going, the number slides forward and his
        cleats point ahead. His legs (as chunky as in his front view) hang
        close together under his shorts and swing from the hip: a planted foot slides back under
        him a pixel or two a frame while the other lifts and swings through,
        so his legs open into a V and close again as they pass (twelve
        frames a stride, a step every six). Body and head bob together, the
        free arm swings against the far leg and the ball arm stays locked.
        Once a loop
        he glances at you, hitches the ball up and blinks.
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

    # Legs: a lifted leg loses a pixel of shin.
    for leg, lift in ((leg_l, legs[0]), (leg_r, legs[1])):
        put({(x, y - (1 if lift and y > LEG_TOP else 0)): c for (x, y), c in leg.items()}, 0, 0)
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


# ---------------------------------------------------------------------------
# Three-quarter view for the walk, facing right (the left row is a mirror),
# turned like Twiggy and Orange: both eyes still show but slide toward the
# front, the far eye a pixel narrower, his smile off-centre, the number on
# his jersey slid two pixels forward and his cleats pointing where he goes.

# Near eye (outline columns) and far eye, and where the pupils sit in each.
Q_EYES = ((10, 15), (19, 23))
Q_PUPILS = {'ahead': ((13, 14), (21, 22)), 'mid': ((12, 13), (20, 21))}
# Legs from the shorts' hem down, drawn under the torso so a lifted leg
# tucks up into the shorts. Toes point forward (right).
Q_LEG_NEAR = [
    "ORWWO..",
    "OwwwO..",
    "OwwwO..",
    "OKKKKO.",
    "OKKKKKO",
    "OOOOOOO",
]
Q_LEG_FAR = [
    "OwwwO..",
    "OwwwO..",
    "OwwwO..",
    "OKKKKO.",
    "OKKKKKO",
    "OOOOOOO",
]
# A lifted foot tips its toe down instead of staying flat.
Q_BOOT_LIFTED = [
    "OKKKKO.",
    ".OKKKKO",
    "..OOOO.",
]
Q_LEG_X = (12, 15)  # near, far: close enough under the shorts to open into a V
SHORTS_TOP = 23
# One leg's twelve-frame stride as (forward, lift): planted, the foot
# slides back under him a pixel a frame as he walks over it; then it lifts,
# swings forward through the air and reaches out to land again. The far leg
# runs six frames behind the near one, so the feet never stop moving.
Q_LEG = [(3, 0), (2, 0), (1, 0), (0, 0), (-1, 0), (-2, 0),
         (-3, 1), (-2, 1), (-1, 1), (1, 1), (2, 1), (3, 1)]
# He sits lowest just after each foot lands and rises as he passes over it.
Q_BOB = [0, 0, -1, -1, -1, 0]


def head_quarter(eyes='open', look='ahead', tip=0):
    """The lemon turned three-quarters toward the right."""
    px = z.lemon()
    for k, c in list(px.items()):
        if c == z.PORE and 9 <= k[0] <= 25 and 4 <= k[1] <= 13:
            px[k] = z.PEEL
    if tip:
        px[(3, 7)] = z.TIP
        px[(2, 7)] = px[(3, 6)] = O
        px[(3, 9)] = O
    # Cocked brow over the near eye, flat brow over the far one.
    for k in ((10, 6), (11, 5), (12, 4), (13, 4), (14, 4), (15, 4)):
        px[k] = O
    for x in range(19, 24):
        px[(x, 5)] = O
    for n, (lo, hi) in enumerate(Q_EYES):
        for x in range(lo + 1, hi):
            px[(x, 7)] = px[(x, 10)] = O
            px[(x, 8)] = z.PEEL_SHADE
            px[(x, 9)] = z.PEEL_SHADE if eyes == 'closed' else z.EYE
        px[(lo, 8)] = px[(lo, 9)] = px[(hi, 8)] = px[(hi, 9)] = O
        if eyes == 'open':
            for x in Q_PUPILS[look][n]:
                px[(x, 9)] = O
    # Blush and the smile, its front corner lifted.
    px[(9, 11)] = px[(25, 10)] = z.BLUSH
    for k in ((15, 12), (16, 13), (17, 13), (18, 13), (19, 13), (20, 12)):
        px[k] = O
    return px


def quarter_layers():
    torso, arm, _, _ = body_layers()
    torso = turn(turn(torso, 1), 1)
    # Close the gap between his legs at the shorts' hem: the legs hang below.
    torso[(15, 25)] = torso[(16, 25)] = z.WHITE
    # Round off the bottom corners of his shorts.
    bottom = [x for (x, y) in torso if y == 25]
    lo, hi = min(bottom), max(bottom)
    del torso[(lo, 25)], torso[(hi, 25)]
    torso[(lo + 1, 25)] = torso[(hi - 1, 25)] = O
    return torso, arm


def swing_leg(art, x0, fwd, top, bottom, lifted=False):
    """A leg hung from the hip at column x0, from row top (under the shorts)
    down to its sole on row bottom, swung fwd pixels at the foot. The sock
    gets a row longer or shorter to fit (a stretch when he bounces up on a
    planted foot, a tuck when it lifts), and each row down leans a little
    further (the top itself a third as far as the foot), so the leg angles
    from the hip like Twiggy's instead of sliding
    over as a block."""
    pants, sock, boot = art[0], art[1], (Q_BOOT_LIFTED if lifted else art[3:])
    rows = [pants] + [sock] * max(0, bottom - top + 1 - 1 - len(boot)) + list(boot)
    last = len(rows) - 1
    out = {}
    for r, row in enumerate(rows):
        # The thigh swings a third as far as the foot.
        lean = fwd / 3 + (fwd - fwd / 3) * r / last
        dx = int(lean + (0.5 if lean > 0 else -0.5))
        for x, ch in enumerate(row):
            if ch != '.':
                out[(x0 + dx + x, top + r)] = z.KEY[ch]
    return out


def seal(img):
    """Outline any colour left touching empty space, e.g. the bottom of his
    shorts where the legs part, so gaps get an edge like the rest of him."""
    px = img.load()
    edge = []
    for y in range(S):
        for x in range(S):
            c = px[x, y]
            if c[3] and c != O:
                for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
                    if 0 <= nx < S and 0 <= ny < S and not px[nx, ny][3]:
                        edge.append((nx, ny))
    for k in edge:
        px[k] = O


# The number on his jersey: mirrored frames stamp it back the right way round.
NUMBER_ROWS, NUMBER_COLS = range(18, 22), range(13, 22)


def walk_frame(layers, i, ball='tuck', mirror=False, **face):
    """Frame i of the stride cycle, facing right (mirror: facing left, with
    the number still reading 10)."""
    torso, arm = layers
    img = Image.new('RGBA', (S, S), CLEAR)
    dy = Q_BOB[i % 6]
    near, far = Q_LEG[i % 12], Q_LEG[(i + 6) % 12]
    # The free (far) arm swings against the far leg.
    swing = max(-1, min(1, -far[0]))

    def put(layer, dx, ddy):
        for (x, y), c in layer.items():
            if 0 <= x + dx < S and 0 <= y + ddy < S:
                img.putpixel((x + dx, y + ddy), c)

    # Legs hang from the shorts (which ride up with the body) down to the
    # foot (which stays on the ground unless lifted).
    for art, x0, (fwd, lift) in ((Q_LEG_FAR, Q_LEG_X[1], far), (Q_LEG_NEAR, Q_LEG_X[0], near)):
        put(swing_leg(art, x0, fwd, LEG_TOP + dy, S - 1 - lift, lifted=lift > 0), 0, 0)
    # When he bounces up, the shorts stretch a pixel rather than lifting off
    # his legs, so they stay one solid piece.
    put({k: c for k, c in torso.items() if k[1] >= SHORTS_TOP}, 0, 0)
    put(torso, 0, dy)
    put(arm, 0, dy)
    if swing:
        put(arm, swing, dy - (swing > 0))
    if ball in ('tuck', 'hitch'):
        put(grid(BALL_UP), TUCK_AT[0], TUCK_AT[1] + dy - (ball == 'hitch'))
    put(head_quarter(**face), 0, dy)
    seal(img)
    if mirror:
        img = img.transpose(Image.FLIP_LEFT_RIGHT)
        glyph = [(x, y) for (x, y), c in torso.items()
                 if c == z.WHITE and x in NUMBER_COLS and y in NUMBER_ROWS]
        x0, x1 = min(x for x, _ in glyph), max(x for x, _ in glyph)
        for x, y in glyph:
            img.putpixel((S - 1 - x, y + dy), z.NAVY)
        for x, y in glyph:
            img.putpixel((S - 1 - x1 + (x - x0), y + dy), z.WHITE)
    return img


def strip(*rows):
    sheet = Image.new('RGBA', (S * len(rows[0]), S * len(rows)), CLEAR)
    for r, frames in enumerate(rows):
        for i, f in enumerate(frames):
            sheet.paste(f, (i * S, r * S))
    return sheet


def main():
    L = body_layers()

    # The walk: four twelve-frame strides (six seconds at 8fps) in the
    # three-quarter view. Once a loop he glances at you, blinks and hitches
    # the ball up.
    Q = quarter_layers()
    extras = [{}] * 48
    for i in range(18, 22):
        extras[i] = {'look': 'mid'}
    extras[33] = {'ball': 'hitch'}
    extras[34] = {'ball': 'hitch'}
    extras[42] = {'eyes': 'closed'}
    walk_r = [walk_frame(Q, i, **extras[i]) for i in range(48)]
    walk_l = [walk_frame(Q, i, mirror=True, **extras[i]) for i in range(48)]

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
