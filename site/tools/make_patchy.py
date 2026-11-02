"""Animate Patchy the panda from his single 32x32 drawing (tools/patchy.png).

Patchy is a panda whose fur is printed all over with noughts and crosses,
cyan X's and coral O's, darker where they cross his black fur. The print is
part of the drawing, so it moves with each part. He faces the viewer. Parts are split by position:

  ears   the two round ears at the top corners
  arms   left / right, from below the shoulder band down to the paws
  legs   left / right, everything from LEG_TOP down
  body   everything else (head, belly)

  walk (6 frames): legs step in turn, arms swing against them, body bobs
  idle (8 frames): a breath, each ear perking up in turn, a happy blink

Output goes to public/sprites/critters/patchy-{walk,idle}.png.

    python3 tools/make_patchy.py            # regenerate
    python3 tools/make_patchy.py --preview  # also write a big contact sheet
"""

import os
import sys

from PIL import Image

HERE = os.path.dirname(__file__)
OUT = os.path.join(HERE, '..', 'public', 'sprites', 'critters')
S = 32

OUTLINE = (27, 20, 30, 255)
PATCH = (48, 42, 56, 255)
# Closed-eye lid line: lighter than the patch so it shows.
LID = (96, 88, 110, 255)
CLEAR = (0, 0, 0, 0)
# Ears: rows down to EAR_BOTTOM, outside the head's top edge.
EAR_BOTTOM = 7
EAR_LEFT, EAR_RIGHT = 9, 22
# Arms: from ARM_TOP (below the shoulder band) to ARM_BOTTOM, outside these columns.
# The belly's side outline stays with the body so no white edge shows when an arm moves.
ARM_TOP, ARM_BOTTOM = 21, 25
ARM_LEFT, ARM_RIGHT = 10, 21
# Legs: from this row down, split down the middle.
LEG_TOP = 26
MID = 16
# Eyes: top-left of each 2x2 eye (inside its patch).
EYES = [(11, 11), (19, 11)]


def load():
    im = Image.open(os.path.join(HERE, 'patchy.png')).convert('RGBA')
    return {(x, y): im.getpixel((x, y)) for x in range(S) for y in range(S) if im.getpixel((x, y))[3] > 0}


def split(px):
    parts = {k: {} for k in ('ear_l', 'ear_r', 'arm_l', 'arm_r', 'leg_l', 'leg_r', 'body')}
    for (x, y), c in px.items():
        side = 'l' if x < MID else 'r'
        if y <= EAR_BOTTOM and (x <= EAR_LEFT or x >= EAR_RIGHT):
            part = 'ear_' + side
        elif ARM_TOP <= y <= ARM_BOTTOM and (x <= ARM_LEFT or x >= ARM_RIGHT):
            part = 'arm_' + side
        elif y >= LEG_TOP:
            part = 'leg_' + side
        else:
            part = 'body'
        parts[part][(x, y)] = c
    return parts


def blink(body):
    """Closed eyes: the eye fills with patch and a happy lid line curves under it."""
    out = dict(body)
    for x, y in EYES:
        for k in ((x, y), (x + 1, y), (x, y + 1), (x + 1, y + 1)):
            out[k] = PATCH
        for k in ((x, y + 1), (x + 1, y + 1), (x - 1, y), (x + 2, y)):
            out[k] = LID
    return out


def frame(parts, body_dy=0, legs=(0, 0), arms=(0, 0), ears=(0, 0), closed=False):
    """legs / arms are (left dy, right dy); -1 lifts. ears are (left, right) flags
    that perk that ear up a pixel."""
    img = Image.new('RGBA', (S, S), CLEAR)

    def put(layer, dx, dy):
        for (x, y), c in layer.items():
            if 0 <= x + dx < S and 0 <= y + dy < S:
                img.putpixel((x + dx, y + dy), c)

    # Legs and ears behind the body, arms in front so they overlap his sides.
    put(parts['leg_l'], 0, legs[0])
    put(parts['leg_r'], 0, legs[1])
    # A perked ear is stamped twice, a pixel apart, so it stretches instead of floating off.
    for ear, perk in (('ear_l', ears[0]), ('ear_r', ears[1])):
        put(parts[ear], 0, body_dy)
        if perk:
            put(parts[ear], 0, body_dy - 1)
    put(blink(parts['body']) if closed else parts['body'], 0, body_dy)
    # An arm swinging down stretches the same way, so no gap opens under the shoulder band.
    for arm, dy in (('arm_l', arms[0]), ('arm_r', arms[1])):
        if dy > 0:
            put(parts[arm], 0, body_dy)
        put(parts[arm], 0, body_dy + dy)
    return img


def strip(frames):
    sheet = Image.new('RGBA', (S * len(frames), S), CLEAR)
    for i, f in enumerate(frames):
        sheet.paste(f, (i * S, 0))
    return sheet


def main():
    parts = split(load())
    # Step left, settle, step right, settle; arms swing against the stepping leg.
    walk = [
        frame(parts, legs=(-1, 0), arms=(1, -1)),
        frame(parts, legs=(-1, 0), arms=(1, -1)),
        frame(parts, body_dy=1),
        frame(parts, legs=(0, -1), arms=(-1, 1)),
        frame(parts, legs=(0, -1), arms=(-1, 1)),
        frame(parts, body_dy=1),
    ]
    idle = [
        frame(parts),
        frame(parts, body_dy=1),
        frame(parts),
        frame(parts, ears=(1, 0)),
        frame(parts),
        frame(parts, ears=(0, 1)),
        frame(parts, closed=True),
        frame(parts),
    ]
    os.makedirs(OUT, exist_ok=True)
    strip(walk).save(os.path.join(OUT, 'patchy-walk.png'))
    strip(idle).save(os.path.join(OUT, 'patchy-idle.png'))
    if '--preview' in sys.argv:
        sheet = Image.new('RGBA', (S * 8, S * 2), (240, 236, 220, 255))
        sheet.alpha_composite(strip(walk), (0, 0))
        sheet.alpha_composite(strip(idle), (0, S))
        sheet.resize((S * 8 * 6, S * 2 * 6), Image.NEAREST).save(os.path.join(HERE, 'patchy-preview.png'))


if __name__ == '__main__':
    main()
