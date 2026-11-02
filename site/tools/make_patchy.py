"""Animate Patchy the panda from his single 32x32 drawing (tools/patchy.png).

Patchy is a panda whose fur is scattered with noughts and crosses, cyan X's
and coral O's, darker where they cross his black fur. They're part of the
drawing, so they move with each part. They frame his eyes too: X sparkles
off the left eye, an O ring round the right, and one eye of each colour. He
faces the viewer. Parts are split by position:

  ears   the two round ears at the top corners
  arms   left / right, from below the shoulder band down to the paws
  legs   left / right, everything from LEG_TOP down
  body   everything else (head, belly)

  walk (48 frames): legs step in turn, arms swing out against them, body bobs
                   and his ears lag as he lands; across the six-second loop
                   he glances left and right, blinks and puffs just once
  idle (32 frames): mostly breaths, with a glance left and right (ears
                    perking to listen), a blink and a big happy ^ ^ grin
                    spread across eight seconds

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
# Happy ^ ^ eyes: lighter still, so the grin reads at a glance.
HAPPY_LID = (176, 166, 190, 255)
CLEAR = (0, 0, 0, 0)
# Ears: rows down to EAR_BOTTOM, outside the head's top edge.
EAR_BOTTOM = 6
EAR_LEFT, EAR_RIGHT = 10, 21
# Arms: from ARM_TOP (below the shoulder band) to ARM_BOTTOM, outside these columns.
# The belly's side outline stays with the body so no white edge shows when an arm moves.
ARM_TOP, ARM_BOTTOM = 21, 25
ARM_LEFT, ARM_RIGHT = 10, 21
# Legs: from this row down, split down the middle.
LEG_TOP = 26
MID = 16
# Eyes: top-left of each 2x2 eye (inside its patch). Each eye is a white
# glint top-left, black pupil on the other diagonal and its colour bottom-right.
EYES = [(11, 11), (19, 11)]
GLINT = (255, 255, 255, 255)
PUPIL = OUTLINE
# Mouth: the two pixels between the corners under his nose, and the chin below.
MOUTH = [(15, 16), (16, 16)]
CHIN = [(15, 17), (16, 17)]
TONGUE = (234, 122, 132, 255)


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


def face(body, look=0, eyes='open', mouth=False):
    """Redraw his face on the body layer.

    look   -1 / 1 glances left / right: the pupil fills the side he looks to and
           the glint and colour slide to the other, so the X sparkles and O ring
           round the eyes stay put
    eyes   'open', 'blink' (lid curving under, a soft blink) or 'happy'
           (lid arching over, ^ ^)
    mouth  open, a little pink tongue showing
    """
    out = dict(body)
    for x, y in EYES:
        cells = ((x, y), (x + 1, y), (x, y + 1), (x + 1, y + 1))
        if eyes != 'open':
            for k in cells:
                out[k] = PATCH
            lids = ((x, y + 1), (x + 1, y + 1), (x - 1, y), (x + 2, y)) if eyes == 'blink' else \
                   ((x, y), (x + 1, y), (x - 1, y + 1), (x + 2, y + 1))
            for k in lids:
                out[k] = LID if eyes == 'blink' else HAPPY_LID
        elif look:
            iris = body[(x + 1, y + 1)]
            near, far = (x, x + 1) if look < 0 else (x + 1, x)
            out[(near, y)] = out[(near, y + 1)] = PUPIL
            out[(far, y)], out[(far, y + 1)] = GLINT, iris
    if mouth:
        for k in MOUTH:
            out[k] = TONGUE
        for k in CHIN:
            out[k] = OUTLINE
    return out


def frame(parts, body_dy=0, legs=(0, 0), arms=(0, 0), ears=(0, 0), **look):
    """legs are (left, right) flags that lift that foot a pixel; arms are
    (left, right) flags that swing that arm out and up a pixel; ears are (left,
    right) flags that perk that ear up a pixel. Anything else goes to face()."""
    img = Image.new('RGBA', (S, S), CLEAR)

    def put(layer, dx, dy):
        for (x, y), c in layer.items():
            if 0 <= x + dx < S and 0 <= y + dy < S:
                img.putpixel((x + dx, y + dy), c)

    # Legs and ears behind the body, arms in front so they overlap his sides.
    # A lifted foot: the leg stays put and everything below its top row moves up,
    # so the top stays tucked under his belly and no gap opens between the legs.
    for leg, lift in (('leg_l', legs[0]), ('leg_r', legs[1])):
        put(parts[leg], 0, 0)
        if lift:
            put({k: v for k, v in parts[leg].items() if k[1] > LEG_TOP}, 0, -1)
            for (x, y) in [k for k in parts[leg] if k[1] == max(y for _, y in parts[leg])]:
                img.putpixel((x, y), CLEAR)
    # A perked ear is stamped twice, a pixel apart, so it stretches instead of floating off.
    for ear, perk in (('ear_l', ears[0]), ('ear_r', ears[1])):
        put(parts[ear], 0, body_dy)
        if perk:
            put(parts[ear], 0, body_dy - 1)
    put(face(parts['body'], **look), 0, body_dy)
    # A swinging arm flings out to his side and up, like the little animals'
    # arms. It's stamped where it was too, so it stretches from the shoulder
    # instead of coming loose.
    for arm, swing, out in (('arm_l', arms[0], -1), ('arm_r', arms[1], 1)):
        put(parts[arm], 0, body_dy)
        if swing:
            put(parts[arm], out, body_dy - 1)
    seal(img)
    return img


def seal(img):
    """Outline any light pixel left hanging over empty space (the belly bobbing
    down into the gap between his legs)."""
    for y in range(S - 1, 0, -1):
        for x in range(S):
            above = img.getpixel((x, y - 1))
            if img.getpixel((x, y))[3] == 0 and above[3] > 0 and above != OUTLINE and y > LEG_TOP - 2:
                img.putpixel((x, y), OUTLINE)


def strip(frames):
    sheet = Image.new('RGBA', (S * len(frames), S), CLEAR)
    for i, f in enumerate(frames):
        sheet.paste(f, (i * S, 0))
    return sheet


def main():
    parts = split(load())
    # Sixteen steps (six seconds at 8fps), so the extras don't repeat every
    # step: arms swing against the stepping leg and his ears lag behind as he
    # drops onto a foot. Most steps are plain, so the glances stay occasional:
    # over the loop he glances left, then right, blinks, and only on the last
    # step puffs once with his mouth open.
    def stride(lead, **face):
        legs, arms = ((1, 0), (0, 1)) if lead == 'l' else ((0, 1), (1, 0))
        return [
            frame(parts, legs=legs, arms=arms),
            frame(parts, legs=legs, arms=arms, **face),
            frame(parts, body_dy=1, ears=(1, 1), **face),
        ]
    plain = stride('l') + stride('r')
    walk = (
        plain + plain +
        stride('l', look=-1) + stride('r', look=-1) +
        plain + plain +
        stride('l') + stride('r', look=1) +
        plain +
        stride('l', eyes='blink') + stride('r', mouth=True)
    )
    # Eight seconds at 4fps, mostly quiet breathing: a look left (that ear
    # perks to listen), more breaths, a look right, a blink, then a big happy
    # grin with both ears up.
    def breaths(n):
        return [f for _ in range(n) for f in (frame(parts), frame(parts, body_dy=1), frame(parts))]
    idle = (
        breaths(2) +
        [frame(parts, look=-1), frame(parts, look=-1, ears=(1, 0)), frame(parts, look=-1)] +
        breaths(2) +
        [frame(parts, look=1), frame(parts, look=1, ears=(0, 1))] +
        breaths(1) + [frame(parts)] +
        [frame(parts, eyes='blink')] +
        breaths(2) +
        [frame(parts, eyes='happy', mouth=True, ears=(1, 1)),
         frame(parts, eyes='happy', mouth=True, body_dy=1),
         frame(parts), frame(parts)]
    )
    assert len(walk) == 48 and len(idle) == 32, (len(walk), len(idle))
    os.makedirs(OUT, exist_ok=True)
    strip(walk).save(os.path.join(OUT, 'patchy-walk.png'))
    strip(idle).save(os.path.join(OUT, 'patchy-idle.png'))
    if '--preview' in sys.argv:
        n = max(len(walk), len(idle))
        sheet = Image.new('RGBA', (S * n, S * 2), (240, 236, 220, 255))
        sheet.alpha_composite(strip(walk), (0, 0))
        sheet.alpha_composite(strip(idle), (0, S))
        sheet.resize((S * n * 6, S * 2 * 6), Image.NEAREST).save(os.path.join(HERE, 'patchy-preview.png'))


if __name__ == '__main__':
    main()
