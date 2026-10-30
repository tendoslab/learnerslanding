// Shared geometry for the village scene.

/** Height of the grass band at the bottom of the screen. */
export const GROUND_HEIGHT = 'clamp(190px, 34vh, 380px)';

// Vertical layout of the walkable field, as % of the ground band's height.
export const FIELD_FRONT = 4;
export const FIELD_DEPTH = 66;
export const bottomFor = (y: number) => FIELD_FRONT + (1 - y) * FIELD_DEPTH;
export const depthScale = (y: number) => 0.8 + 0.3 * y;
/**
 * Taps the village's own handlers already dealt with. Village also listens on the whole window as a
 * backstop, and skips these so nothing happens twice.
 */
export const tapsHandled = new WeakSet<Event>();

export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Small deterministic random generator, so scenery looks the same on every visit. */
export const seeded = (seed: number) => () => {
  seed = (seed * 16807) % 2147483647;
  return (seed - 1) / 2147483646;
};
