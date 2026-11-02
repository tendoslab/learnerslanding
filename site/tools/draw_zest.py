"""Draw Zest, the lemon-headed footballer, as a single 32x32 front view
(tools/zest.png), in the same style as the other original residents: the
shared dark outline, chunky 1px shading, facing the viewer like Bobby and
Patchy.

He's a lemon with a smug face (one brow cocked, heavy-lidded side-eye and a
small smile) wearing a navy jersey with white shoulder panels and a
white-and-red number 10, white knee-length football pants with a red side
stripe, white socks and black cleats, the ball tucked between his arm and hip.

This is the drawing only. Once it's settled, a make_zest.py can animate it
the way make_patchy.py does (split into head / arms / legs and nudge them).

    python3 tools/draw_zest.py            # write tools/zest.png
    python3 tools/draw_zest.py --preview  # also write a big tools/zest-preview.png
    python3 tools/draw_zest.py --holds    # also compare the ways of holding the ball
"""

import os
import sys

from PIL import Image

HERE = os.path.dirname(__file__)
S = 32

CLEAR = (0, 0, 0, 0)
OUTLINE = (27, 20, 30, 255)
# Lemon peel: base, highlight, shade and the darker pore dots.
PEEL = (255, 216, 56, 255)
PEEL_LIGHT = (255, 240, 140, 255)
PEEL_SHADE = (228, 168, 28, 255)
PORE = (214, 150, 24, 255)
TIP = (124, 150, 52, 255)
EYE = (253, 245, 241, 255)
BLUSH = (247, 160, 120, 255)
# Kit.
NAVY = (40, 54, 110, 255)
NAVY_SHADE = (26, 32, 72, 255)
WHITE = (246, 244, 240, 255)
WHITE_SHADE = (196, 194, 212, 255)
RED = (214, 56, 64, 255)
BOOT = (52, 48, 62, 255)
BALL = (164, 86, 42, 255)
BALL_SHADE = (118, 56, 34, 255)

# Body below the head, rows 16-31. Head is drawn on top afterwards.
#   O outline  N navy  M navy shade  W white  w white shade  R red
#   Y peel (hands)  y peel shade  K boot  B ball  b ball shade
BODY = [
    "........OOOOOWWWWWWOOOOO........",  # 16 shoulders, collar
    ".......OWWNNNNNNNNNNNMWWO.......",  # 17 white shoulder panels
    ".......OWWNNNNWNWWWNNMWWO.......",  # 18 number 10, white
    "...OO..ONNNNNWWNWNWNNMNMO.......",  # 19 navy sleeves, the ball's tip
    "..OBBOOOWWONNNWNWNWNMOWWO.......",  # 20 white cuffs
    ".OBWBOYYYYONNNWNWWWNMOYYO.......",  # 21 fingers spread over the ball, laces
    ".OBbbOYYyyORRRRRRRRRROYyO.......",  # 22 red hem
    "..ObbbbbOOOWWWWWWWWWWOOOO.......",  # 23 ball showing under his hand, pants
    "...OOOOO..ORWWWWWWWwRO..........",  # 24 red side stripe
    "..........ORWWWOOWWwRO..........",  # 25
    "..........ORWWO..OWwRO..........",  # 26
    "..........OwwwO..OwwwO..........",  # 27 socks
    "..........OwwwO..OwwwO..........",  # 28
    ".........OKKKKO..OKKKKO.........",  # 29 cleats
    ".........OKKKKO..OKKKKO.........",  # 30
    ".........OOOOOO..OOOOOO.........",  # 31
]
# Ways of holding the ball. Each replaces the left end of rows 17-24 (the
# columns given) of BODY above, which is the 'hand' version.
HOLDS = {
    # Ball standing upright, squeezed between his arm and his hip.
    'tuck': {
        17: ".......OWWNNN",
        18: "......OWWOONN",
        19: ".....ONNOBBON",
        20: "....OWWOBBWBO",
        21: "...OYYYOBWWbO",
        22: "...OYyyObBWbO",
        23: "....OOO.ObbO",
        24: ".........OO",
    },
    # Ball lying flat under his arm: the tip pokes out in front, the back end
    # shows between his arm and his hip.
    'under': {
        19: ".......ONNNNN",
        20: "..OOOOOOWWOOO",
        21: ".OBBWBBOYYOBO",
        22: "OBBWWWBOYYObO",
        23: ".ObbbbbOYyObO",
        24: "..OOOOOOOOOO",
    },
}
KEY = {'.': CLEAR, 'O': OUTLINE, 'N': NAVY, 'M': NAVY_SHADE, 'W': WHITE, 'w': WHITE_SHADE,
       'R': RED, 'Y': PEEL, 'y': PEEL_SHADE, 'K': BOOT, 'B': BALL, 'b': BALL_SHADE}

# The lemon: (first, last) column of each row from 1 to 15, a pointed nub at
# each end on rows 8-9.
HEAD = {1: (11, 20), 2: (8, 23), 3: (7, 24), 4: (6, 25), 5: (5, 26), 6: (5, 26), 7: (4, 27),
        8: (2, 29), 9: (2, 29), 10: (4, 27), 11: (5, 26), 12: (5, 26), 13: (6, 25), 14: (7, 24), 15: (10, 21)}


def lemon():
    shape = {(x, y) for y, (lo, hi) in HEAD.items() for x in range(lo, hi + 1)}
    px = {}
    for x, y in shape:
        edge = any(n not in shape for n in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)))
        px[(x, y)] = OUTLINE if edge else PEEL
    # Nubs: the stem end is green, the other end peel.
    px[(3, 8)] = px[(3, 9)] = TIP
    px[(28, 8)] = px[(28, 9)] = PEEL_SHADE
    for (x, y) in list(px):
        if px[(x, y)] != PEEL:
            continue
        up, down = px.get((x, y - 1)), px.get((x, y + 1))
        left, right = px.get((x - 1, y)), px.get((x + 1, y))
        # Light from the top left, shade along the bottom and right.
        if (up == OUTLINE and x < 18) or (left == OUTLINE and y < 8):
            px[(x, y)] = PEEL_LIGHT
        elif (down == OUTLINE and x > 11) or (right == OUTLINE and y > 7):
            px[(x, y)] = PEEL_SHADE
    for k in ((9, 3), (12, 2), (6, 6), (24, 4), (25, 11), (22, 13), (7, 12), (20, 3)):
        px[k] = PORE
    return px


def face(px):
    """Smug: left brow cocked high, right brow flat, heavy lids with the
    pupils slid to one side, and a small smile."""
    o = OUTLINE
    # Brows.
    for k in ((7, 6), (8, 5), (9, 4), (10, 4), (11, 4), (12, 4)):
        px[k] = o
    for k in ((18, 5), (19, 5), (20, 5), (21, 5), (22, 5), (23, 5)):
        px[k] = o
    # Eyes: 6 wide, a heavy lid line across the top, pupils slid right.
    for ex in (7, 18):
        for x in range(ex + 1, ex + 5):
            px[(x, 7)] = o
            px[(x, 10)] = o
        px[(ex, 8)] = px[(ex, 9)] = o
        px[(ex + 5, 8)] = px[(ex + 5, 9)] = o
        for x in range(ex + 1, ex + 5):
            px[(x, 8)] = PEEL_SHADE
            px[(x, 9)] = EYE
        px[(ex + 3, 9)] = px[(ex + 4, 9)] = o
    # Blush.
    px[(6, 11)] = px[(25, 10)] = BLUSH
    # A small, easy smile, its right corner lifted a touch for the smugness.
    for k in ((13, 12), (14, 13), (15, 13), (16, 13), (17, 13), (18, 12), (19, 11)):
        px[k] = o
    return px


def draw(hold='hand'):
    img = Image.new('RGBA', (S, S), CLEAR)
    for r, row in enumerate(BODY):
        assert len(row) == S, (16 + r, len(row))
        left = HOLDS.get(hold, {}).get(16 + r)
        if left:
            row = left + row[len(left):]
        for x, ch in enumerate(row):
            if ch != '.':
                img.putpixel((x, 16 + r), KEY[ch])
    for (x, y), c in face(lemon()).items():
        img.putpixel((x, y), c)
    return img


# Which hold zest.png uses. Run with --holds to compare them all.
HOLD = 'tuck'


def main():
    img = draw(HOLD)
    img.save(os.path.join(HERE, 'zest.png'))
    if '--holds' in sys.argv:
        names = ['hand', *HOLDS]
        sheet = Image.new('RGBA', ((S + 4) * len(names), S + 4), (240, 236, 220, 255))
        for i, name in enumerate(names):
            sheet.alpha_composite(draw(name), (2 + (S + 4) * i, 2))
        sheet.resize((sheet.width * 8, sheet.height * 8), Image.NEAREST).save(os.path.join(HERE, 'zest-holds.png'))
    if '--preview' in sys.argv:
        bg = Image.new('RGBA', (S + 4, S + 4), (240, 236, 220, 255))
        bg.alpha_composite(img, (2, 2))
        bg.resize(((S + 4) * 12, (S + 4) * 12), Image.NEAREST).save(os.path.join(HERE, 'zest-preview.png'))


if __name__ == '__main__':
    main()
