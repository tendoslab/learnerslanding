"""Zest throwing, built from his own 32px drawing, for a future throwing
mini-game. Not used by the site yet: the sheets are written to
tools/zest-throw/, not public/.

He stays the village Zest: same head, face, jersey and legs, turned a little
toward his target (face and number slid a pixel right, eyes on the target),
like his walk. Only the arms and ball are redrawn per frame, and his body
leans, crouches and steps through each move. Frames are 52x36: his 32px frame
sits at (OX, OY) inside, leaving room for the ball behind and in front of him
and headroom for the hop and the arc of the throw.

  ready  (4)  ball held up by his shoulder, breathing, smug brow
  throw  (8)  rock back and wind up, ball arcs over his head, release,
              follow-through, recover
  hit    (4)  knocked back, eyes squeezed shut, recover
  win    (4)  hop with a fist pump

The ball follows one oval path while it's in his hand (see ARC_C / WINDUP /
OVER / RELEASE) and isn't drawn after the release: the game should take over
from the release point and fly it with its own angle, power and gravity.

    python3 tools/make_zest_throw.py   # writes tools/zest-throw/*.png and a preview gif
"""

import math
import os
import sys

from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
sys.dont_write_bytecode = True
import draw_zest as z   # noqa: E402
import make_zest as mz  # noqa: E402

OUT = os.path.join(HERE, 'zest-throw')
W, H = 52, 36
# Where his 32px frame sits inside the bigger one: room for the ball behind
# and in front, and headroom for his hop and the arc of the throw.
OX, OY = 8, 4
O = z.OUTLINE
CLEAR = z.CLEAR

# Torso with both arms taken off at the sleeves (rows 16-25), from the plain
# drawing. Sleeves end at row 19; arms are added per pose.
TORSO = [
    "........OOOOOWWWWWWOOOOO........",  # 16
    ".......OWWNNNNNNNNNNNMWWO.......",  # 17
    ".......OWWNNNNWNWWWNNMWWO.......",  # 18
    ".......ONNNNNWWNWNWNNMNMO.......",  # 19
    ".......OOOONNNWNWNWNMOOOO.......",  # 20
    "..........ONNNWNWWWNMO..........",  # 21
    "..........ORRRRRRRRRRO..........",  # 22
    "..........OWWWWWWWWWWO..........",  # 23
    "..........ORWWWWWWWwRO..........",  # 24
    "..........ORWWWOOWWwRO..........",  # 25
]
LEFT_SLEEVE = (8, 19)
RIGHT_SLEEVE = (23, 19)

# Arm pieces, hand drawn: each is (rows, top-left) relative to the 32px frame.
#   W cuff  Y hand  y hand shade  O outline
ARMS = {
    # Hanging straight down (his free arm at rest), as in the drawing.
    'r_down': (["OWWO", "OYYO", "OYyO", "OOOO"], (21, 20)),
    # Free arm pointing ahead at the target.
    'r_aim': (["OOOO..", "OWWOOO", "OWWYYO", ".OOYyO", "...OO."], (21, 18)),
    # Free arm tucked in after the throw.
    'r_in': (["OWWO", "OWYYO", ".OYyO", "..OO"], (21, 20)),
    # Throwing arm, hand up by his shoulder holding the ball (ready).
    'l_up': ([".OO..", "OYYO.", "OYyWO", ".OWWO", "..OOO"], (4, 16)),
    # Cocked right back for the wind-up.
    'l_back': (["OOO...", "OYYOOO", "OYyWWO", ".OOWWO", "...OOO"], (2, 16)),
    # Down and across his belly on the follow-through.
    'l_across': (["OOOO.......", "OWWOOOOOOO.", ".OOWWWWWYYO", "...OOOOOYyO", "........OO."], (7, 19)),
    # Hanging, as the right arm (after the throw, at rest).
    'l_down': (["OWWO", "OYYO", "OyYO", "OOOO"], (7, 20)),
    # Fist pump: arm up beside his head.
    'r_pump': ([".OOO", "OYYO", "OYyO", "OWWO", "OWWO", ".OOO"], (24, 15)),
}


def arm_px(name):
    rows, (x0, y0) = ARMS[name]
    return {(x0 + x, y0 + y): z.KEY[c] for y, row in enumerate(rows) for x, c in enumerate(row) if c != '.'}


def torso_px():
    px = mz.grid(TORSO, top=16)
    return mz.turn(px, 1)


def legs_px(step=0, lift=0, back=0, heel=0):
    """Legs from the drawing. step slides the front (right) foot forward, lift
    raises it (knee up), back slides the back (left) foot, heel raises the
    back foot as he pushes off. A raised leg slides up under his hips."""
    _, _, leg_l, leg_r = mz.body_layers()
    out = {}
    for leg, dx, up in ((leg_l, back, heel), (leg_r, step, lift)):
        for (x, y), c in leg.items():
            out[(x + dx, y - up)] = c
    return out


def shear(layer, lean):
    """Lean the upper body as one block (so the 10 stays whole): chest and
    shoulders move by the full lean, the hem by half, the hips stay over the legs."""
    if not lean:
        return layer
    def dx(y):
        return lean if y <= 21 else (round(lean / 2) if y <= 23 else 0)
    return {(x + dx(y), y): c for (x, y), c in layer.items()}


BALL_UP = mz.grid(mz.BALL_UP)
BALL_SIDE = mz.grid(mz.BALL_SIDE)


# The arm's path over his head on release, as a pale motion streak.
# The throwing hand travels round one oval, from low behind him, up and over
# his big lemon head (the oval clears it), to the release point just past the
# top of his head, where the ball is heading forward and slightly up. While
# it's in his hand the ball rides that oval, with bigger steps each frame as
# the arm speeds up. Angles in degrees: 180 is straight behind, 90 over the top.
# After release the ball is the game's to fly (its own angle, power, gravity),
# so it isn't drawn in the follow-through frames.
ARC_C, ARC_RX, ARC_RY = (15, 13), 17, 14
WINDUP, OVER, RELEASE = 185, 150, 98


def on_arc(deg):
    a = math.radians(deg)
    return (ARC_C[0] + ARC_RX * math.cos(a), ARC_C[1] - ARC_RY * math.sin(a))


def ball_on_arc(deg, kind='side'):
    """Top-left of the ball sprite centred on the arc at this angle."""
    x, y = on_arc(deg)
    w, h = (4, 2) if kind == 'side' else (3, 3)
    return (kind, round(x) - w, round(y) - h, False)


def smear_to(deg):
    """The streak the hand leaves from the wind-up round to this angle."""
    pts = {(round(x), round(y)) for d in range(WINDUP, deg - 1, -2) for x, y in [on_arc(d)]}
    return sorted(pts)


SMEAR_COL = (255, 255, 255, 190)


def frame(arms=('l_up', 'r_down'), ball=None, dy=0, hdy=0, lean=0, lead=0, step=0, lift=0, back=0, heel=0,
          hop=0, wobble=0, smear=False, **face):
    """ball: (kind, x, y) with kind 'up' or 'side', in 32px-frame coordinates,
    moving with his hand when held ('held' kinds) or fixed when flying.
    lean tilts his body (- back, + forward); lead pushes the head further
    than the shoulders; dy crouches; hop lifts all of him."""
    img = Image.new('RGBA', (W, H), CLEAR)

    def put(layer, dx=0, ddy=0):
        for (x, y), c in layer.items():
            X, Y = x + dx + OX, y + ddy - hop + OY
            if 0 <= X < W and 0 <= Y < H:
                img.putpixel((X, Y), c)

    arm_dx = lean
    put(legs_px(step, lift, back, heel))
    t = shear(torso_px(), lean)
    put(t)
    put(t, 0, dy)
    # Arms behind the head go first; the rest after.
    put(arm_px(arms[1]), arm_dx, dy)
    put(mz.head(dx=1 + wobble, look=face.pop('look', 'right'), **face), lean + lead + wobble, dy + hdy)
    put(arm_px(arms[0]), arm_dx, dy)
    if smear:
        put({k: SMEAR_COL for k in smear_to(smear)}, lean)
    if ball:
        kind, bx, by, held = (*ball, True) if len(ball) == 3 else ball
        put(BALL_UP if kind == 'up' else BALL_SIDE, bx + (arm_dx if held else 0), by + (dy if held else 0))
    return img


def frames():
    held = ('up', 2, 10)  # ball in the raised hand
    ready = [
        frame(ball=held),
        frame(ball=held, dy=1),
        frame(ball=held, brow=1, look='mid'),
        frame(ball=held),
    ]
    throw = [
        frame(ball=held, dy=1),
        # Wind-up: weight rocks back onto the back foot, the front knee comes
        # up, arm cocks back, free arm points at the target.
        frame(arms=('l_back', 'r_aim'), ball=('up', -1, 10), lean=-1, lift=1, back=-1, brow=1),
        frame(arms=('l_back', 'r_aim'), ball=ball_on_arc(WINDUP)[:3], lean=-2, lead=-1, lift=2, back=-1, dy=1, brow=1),
        # Coming through: body swings upright, the ball arcs up over his head
        # (arm hidden behind it), front foot reaching forward.
        frame(arms=('l_down', 'r_aim'), ball=ball_on_arc(OVER), smear=OVER, lean=0, step=1, lift=1,
              eyes='closed', brow=1),
        # Release: he lunges, the head whips ahead, the front foot plants
        # forward and the back heel lifts as he pushes off.
        frame(arms=('l_down', 'r_in'), ball=ball_on_arc(RELEASE)[:3], smear=RELEASE, lean=2, lead=1, step=2, heel=1,
              dy=1, eyes='happy', mouth='grin'),
        # Follow-through: low and forward, arm across his belly.
        frame(arms=('l_across', 'r_in'), lean=3, lead=1, step=2, heel=1, dy=2,
              eyes='happy', mouth='grin'),
        frame(arms=('l_across', 'r_down'), lean=1, step=2, dy=1, brow=1),
        # Rock back to standing.
        frame(arms=('l_down', 'r_down'), step=1, brow=1),
    ]
    hit = [
        frame(ball=held, lean=-2, lead=-1, back=-1, wobble=-1, eyes='closed', mouth='grin'),
        frame(ball=held, lean=-3, lead=-1, back=-1, dy=1, eyes='closed'),
        frame(ball=held, lean=-1, eyes='closed'),
        frame(ball=held),
    ]
    win = [
        frame(arms=('l_up', 'r_pump'), ball=held, dy=1, eyes='happy', mouth='grin'),
        frame(arms=('l_up', 'r_pump'), ball=held, hop=2, eyes='happy', mouth='grin', brow=1),
        frame(arms=('l_up', 'r_pump'), ball=held, hop=3, hdy=1, eyes='happy', mouth='grin', brow=1),
        frame(arms=('l_up', 'r_down'), ball=held, dy=1, brow=1, look='mid'),
    ]
    return {'ready': ready, 'throw': throw, 'hit': hit, 'win': win}


def main():
    rows = frames()
    os.makedirs(OUT, exist_ok=True)
    bg = (240, 236, 220, 255)
    for name, fs in rows.items():
        sheet = Image.new('RGBA', (W * len(fs), H), CLEAR)
        for i, f in enumerate(fs):
            sheet.paste(f, (i * W, 0))
        sheet.save(os.path.join(OUT, f'zest-throw-{name}.png'))
    n = max(len(f) for f in rows.values())
    sheet = Image.new('RGBA', (W * n, H * len(rows)), bg)
    for r, fs in enumerate(rows.values()):
        for i, f in enumerate(fs):
            sheet.alpha_composite(f, (i * W, r * H))
    sheet.resize((sheet.width * 6, sheet.height * 6), Image.NEAREST).save(os.path.join(OUT, 'zest-throw-sheet.png'))
    seq = rows['ready'] + rows['throw'] + rows['ready'] + rows['hit'] + rows['win'] * 2
    durs = [250] * 4 + [250, 200, 300, 60, 80, 100, 180, 250] + [250] * 4 + [100, 100, 100, 250] + [150] * 8
    big = []
    for f in seq:
        b = Image.new('RGBA', (W, H), bg)
        b.alpha_composite(f)
        big.append(b.convert('RGB').resize((W * 8, H * 8), Image.NEAREST))  # noqa
    big[0].save(os.path.join(OUT, 'zest-throw.gif'), save_all=True, append_images=big[1:], duration=durs, loop=0)


if __name__ == '__main__':
    main()
