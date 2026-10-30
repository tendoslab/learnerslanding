import { AVATAR_HEAD_TOP } from '../rewards';
import { withBase } from '../../lib/base';

/** Source pixels of the character sheet shown inside the circle (a square around the head and face). */
const CROP = 22;
const HEAD_X = 31;

/** Your character's head in a circle, cropped from the first idle frame. */
export default function Portrait({ avatar, size }: { avatar: number; size: number }) {
  const k = size / CROP;
  const top = AVATAR_HEAD_TOP[avatar - 1] ?? 14;
  return (
    <span
      className="pixelated block shrink-0 rounded-full border-2 border-white/30 bg-plum/50 bg-no-repeat"
      style={{
        width: size,
        height: size,
        backgroundImage: `url(${withBase(`/sprites/characters/char-${avatar}.png`)})`,
        backgroundSize: `${384 * k}px ${128 * k}px`,
        backgroundPosition: `${-(HEAD_X - CROP / 2) * k}px ${-(top + 2) * k}px`,
        imageRendering: 'pixelated',
      }}
    />
  );
}
