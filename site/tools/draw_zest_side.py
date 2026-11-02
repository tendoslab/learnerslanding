"""Draw Zest in profile, facing right, as a 32x32 still (tools/zest-side.png),
for his walk. Same lemon, kit and palette as the front view (draw_zest.py),
turned side-on like Twiggy and Orange: the lemon's pointed end leads, the
green stem nub trails behind, and his smug face (one heavy-lidded eye, the
cocked brow, a small smile, blush) sits toward the front. The ball is carried
like a running back's, lying flat under his near arm with its tip poking out
in front.

Legs are drawn standing; make_zest.py will stride them for the walk.

    python3 tools/draw_zest_side.py            # write tools/zest-side.png
    python3 tools/draw_zest_side.py --preview  # also a big preview beside the front view
"""

import os
import sys

from PIL import Image

import draw_zest as z

HERE = os.path.dirname(__file__)
S = 32
O = z.OUTLINE

# Body below the head, rows 16-31, facing right, built in layers: torso
# (jersey, pants, legs), then the ball, then his near arm wrapped over it.
# Same key as draw_zest.BODY.
TORSO = [
    "..........OOOOOOOOOOOO..........",  # 16 collar
    ".........ONNNNNNNNNNNNO.........",  # 17
    ".........ONNNNNNNNNNNNO.........",  # 18
    ".........ONNNNNNNNNNNNO.........",  # 19
    ".........OMNNNNNNNNNNNO.........",  # 20
    ".........OMNNNNNNNNNNNO.........",  # 21
    ".........ORRRRRRRRRRRRO.........",  # 22 red hem
    ".........OOWWWWWWWWWWOO.........",  # 23 pants
    "..........ORRWWWWWWWwO..........",  # 24 red side stripe
    "..........ORRWWWWWWWwO..........",  # 25
    "...........OWWWWWWWwO...........",  # 26
    "............OwwwOwwwO...........",  # 27 socks (far leg shaded)
    "............OwwwOwwwO...........",  # 28
    "............OKKKOKKKKO..........",  # 29 cleats, toes forward
    "............OKKKOKKKKKO.........",  # 30
    "............OOOOOOOOOOO.........",  # 31
]
# The ball cradled against his chest, tip forward.
BALL = ([
    "..OOOOO..",
    ".OBBBBBO.",
    "OBWWWWBBO",
    "ObbbbbbbO",
    ".OOOOOOO.",
], (17, 18))
# Near arm: white shoulder panel, navy sleeve down to the elbow, white cuff,
# then the forearm under the ball and the hand cupping its tip.
ARM = ([
    "OOOOO.........",
    "OWWWO.........",
    "OWWWO.........",
    "ONNNO.........",
    "ONNNO.........",
    "ONNNOOOOOOOOO.",
    "OWWWNNNNNOYYYO",
    ".OOOOOOOOOOOO.",
], (11, 16))


def layer(art):
    rows, (left, top) = art
    return {(left + x, top + y): z.KEY[ch] for y, row in enumerate(rows) for x, ch in enumerate(row) if ch != '.'}


def lemon_side():
    """The lemon in profile: same silhouette as the front view, pointed end
    forward (right), stem behind (left)."""
    return z.lemon()


def face(px):
    """One eye toward the front, the cocked brow above it, the smile near the
    point, blush behind the smile."""
    for k in list(px):
        # Clear the front view's pore dots where the face goes.
        if 14 <= k[0] <= 27 and 4 <= k[1] <= 13 and px[k] == z.PORE:
            px[k] = z.PEEL
    # Cocked brow.
    for k in ((18, 6), (19, 5), (20, 4), (21, 4), (22, 4), (23, 4)):
        px[k] = O
    # Eye: heavy lid, pupil at the front.
    ex = 19
    for x in range(ex + 1, ex + 5):
        px[(x, 7)] = O
        px[(x, 10)] = O
    px[(ex, 8)] = px[(ex, 9)] = O
    px[(ex + 5, 8)] = px[(ex + 5, 9)] = O
    for x in range(ex + 1, ex + 5):
        px[(x, 8)] = z.PEEL_SHADE
        px[(x, 9)] = z.EYE
    px[(ex + 3, 9)] = px[(ex + 4, 9)] = O
    # Blush and smile.
    px[(19, 11)] = px[(20, 11)] = z.BLUSH
    for k in ((22, 12), (23, 13), (24, 13), (25, 12), (26, 11)):
        px[k] = O
    return px


def draw():
    img = Image.new('RGBA', (S, S), z.CLEAR)
    for r, row in enumerate(TORSO):
        assert len(row) == S, (16 + r, len(row))
        for x, ch in enumerate(row):
            if ch != '.':
                img.putpixel((x, 16 + r), z.KEY[ch])
    for art in (BALL, ARM):
        for k, c in layer(art).items():
            img.putpixel(k, c)
    for (x, y), c in face(lemon_side()).items():
        img.putpixel((x, y), c)
    return img


def main():
    img = draw()
    img.save(os.path.join(HERE, 'zest-side.png'))
    if '--preview' in sys.argv:
        bg = Image.new('RGBA', ((S + 4) * 3, S + 4), (240, 236, 220, 255))
        bg.alpha_composite(z.draw(z.HOLD), (2, 2))
        bg.alpha_composite(img, (S + 6, 2))
        bg.alpha_composite(img.transpose(Image.FLIP_LEFT_RIGHT), (2 * S + 10, 2))
        bg.resize((bg.width * 8, bg.height * 8), Image.NEAREST).save(os.path.join(HERE, 'zest-side-preview.png'))


if __name__ == '__main__':
    main()
