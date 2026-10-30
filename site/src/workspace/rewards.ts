// Everything you can earn in the village lives here, so balancing the game is
// a matter of editing numbers in this one file.

import { withBase } from '../lib/base';

export interface SheetAnim {
  src: string;
  frames: number;
  /** Frame size in source pixels. */
  w: number;
  h: number;
  /** Row offset inside the sheet (source pixels). */
  y?: number;
  fps?: number;
}

export interface SpriteDef {
  walk: SheetAnim;
  idle: SheetAnim;
  /** 'side' sprites face right and get mirrored; 'front' sprites face the viewer. */
  facing: 'side' | 'front';
  /** Display multiplier on top of the scene's pixel scale. */
  scale?: number;
  /** Walking speed in % of scene width per second. */
  speed?: number;
  flying?: boolean;
  /** Empty source pixels below the feet in each frame (so sprites stand on the ground). */
  foot?: number;
  /** Visible body width in source pixels (sizes the ground shadow). */
  body?: number;
  /** Where the art sits inside an idle frame: [x, y, w, h] in source pixels (for icons). */
  box?: [number, number, number, number];
}

export interface Resident {
  id: string;
  name: string;
  species: string;
  /** Total focus minutes needed to unlock. */
  unlockAt: number;
  sprite: SpriteDef;
}

const animal = (n: string): SpriteDef => ({
  walk: { src: withBase(`/sprites/animals/${n}-walk.png`), frames: 4, w: 32, h: 32, fps: 6 },
  idle: { src: withBase(`/sprites/animals/${n}-idle.png`), frames: 2, w: 32, h: 32, fps: 2 },
  facing: 'front',
  speed: 2.2,
  foot: 8,
  body: 13,
  box: [10, 7, 12, 17],
});

const critter = (n: string, walkFrames: number, idleFrames: number, size = 32, extra: Partial<SpriteDef> = {}): SpriteDef => ({
  walk: { src: withBase(`/sprites/critters/${n}-walk.png`), frames: walkFrames, w: size, h: size, fps: 8 },
  idle: { src: withBase(`/sprites/critters/${n}-idle.png`), frames: idleFrames, w: size, h: size, fps: 4 },
  facing: 'side',
  speed: 3,
  foot: 0,
  body: 17,
  ...extra,
});

export const RESIDENTS: Resident[] = [
  { id: 'cat', name: 'Mochi', species: 'Cat', unlockAt: 25, sprite: animal('cat') },
  { id: 'bunny', name: 'Clover', species: 'Bunny', unlockAt: 75, sprite: animal('bunny') },
  { id: 'penguin', name: 'Pip', species: 'Penguin', unlockAt: 150, sprite: critter('penguin', 6, 5, 18, { scale: 1.1, speed: 1.8, body: 14, foot: 1, box: [1, 1, 16, 16] }) },
  { id: 'pig', name: 'Truffle', species: 'Pig', unlockAt: 250, sprite: animal('pig') },
  { id: 'fairy', name: 'Lumi', species: 'Fairy', unlockAt: 400, sprite: { ...critter('fairy', 4, 4), walk: { src: withBase('/sprites/critters/fairy-move.png'), frames: 4, w: 32, h: 32, fps: 8 }, idle: { src: withBase('/sprites/critters/fairy-fly.png'), frames: 4, w: 32, h: 32, fps: 8 }, flying: true, foot: 8, body: 14, box: [8, 7, 16, 17] } },
  { id: 'bear', name: 'Bramble', species: 'Bear', unlockAt: 600, sprite: animal('bear') },
  { id: 'orange', name: 'Sunny', species: 'Orange', unlockAt: 850, sprite: critter('orange', 6, 4, 32, { speed: 2.4, box: [8, 13, 16, 19] }) },
  { id: 'wolf', name: 'Juniper', species: 'Wolf', unlockAt: 1100, sprite: animal('wolf') },
  { id: 'robot', name: 'J5', species: 'Robot', unlockAt: 1400, sprite: critter('robot', 6, 5, 32, { box: [7, 15, 18, 17] }) },
  { id: 'gumbot', name: 'Gummy', species: 'Gum Bot', unlockAt: 1800, sprite: critter('gumbot', 6, 4, 32, { box: [8, 14, 16, 18] }) },
  { id: 'twiggy', name: 'Twiggy', species: 'Explorer', unlockAt: 2300, sprite: critter('twiggy', 6, 5, 32, { speed: 4, box: [6, 6, 19, 26] }) },
  { id: 'tommy', name: 'Tommy', species: 'Adventurer', unlockAt: 2900, sprite: critter('tommy', 6, 4, 32, { idle: { src: withBase('/sprites/critters/tommy-idle.png'), frames: 4, w: 32, h: 32, fps: 1.5 }, box: [8, 4, 17, 28] }) },
  { id: 'geralt', name: 'Geralt', species: 'Knight', unlockAt: 3600, sprite: critter('geralt', 3, 2, 32, { speed: 3.5, body: 13, box: [10, 16, 13, 16] }) },
  { id: 'skeleton', name: 'Sir Bones', species: 'Skeleton', unlockAt: 5000, sprite: critter('skeleton', 6, 9, 32, { speed: 1.6, body: 16, box: [3, 4, 27, 28] }) },
];

export interface Landscape {
  id: string;
  name: string;
  desc: string;
  icon: string;
  /** Total focus minutes needed to unlock. */
  unlockAt: number;
}

/** Scenery behind the village. The first one is the default. */
export const LANDSCAPES: Landscape[] = [
  { id: 'mountains', name: 'Mountain Range', desc: 'Snowy peaks over pine hills', icon: '🏔️', unlockAt: 0 },
  { id: 'autumn', name: 'Autumn Woods', desc: 'Hills of red and gold trees', icon: '🍂', unlockAt: 150 },
  { id: 'lake', name: 'Lakeside', desc: 'A still lake below the peaks', icon: '🏞️', unlockAt: 400 },
  { id: 'seaside', name: 'Seaside', desc: 'Open sea, a lighthouse and passing boats', icon: '🌊', unlockAt: 800 },
  { id: 'city', name: 'City Lights', desc: 'A skyline that lights up at night', icon: '🌃', unlockAt: 1500 },
];

/** The landscape to draw: the chosen one if it's unlocked, otherwise the default. */
export const landscapeFor = (id: string | undefined, minutes: number) => {
  const l = LANDSCAPES.find((x) => x.id === id);
  return l && minutes >= l.unlockAt ? l.id : LANDSCAPES[0].id;
};

export const AVATAR_COUNT = 18;

export const avatarSprite = (n: number): SpriteDef => ({
  idle: { src: withBase(`/sprites/characters/char-${n}.png`), frames: 4, w: 64, h: 64, y: 0, fps: 4 },
  walk: { src: withBase(`/sprites/characters/char-${n}.png`), frames: 6, w: 64, h: 64, y: 64, fps: 9 },
  facing: 'side',
  scale: 0.7,
  speed: 3.2,
  foot: 16,
  body: 20,
});

export interface DecorItem {
  id: string;
  name: string;
  price: number;
  desc: string;
  /** Source size in pixels (matches the PNG in /sprites/decor). */
  w: number;
  h: number;
  /** Decorations with a glow get a soft light at dusk and night. */
  glow?: boolean;
  flicker?: boolean;
}

export const DECOR: DecorItem[] = [
  { id: 'flowers', name: 'Flower Patch', price: 20, desc: 'A burst of colour', w: 16, h: 10 },
  { id: 'mushrooms', name: 'Mushrooms', price: 25, desc: 'Grown overnight', w: 16, h: 10 },
  { id: 'bush', name: 'Berry Bush', price: 35, desc: 'Snacks for later', w: 20, h: 12 },
  { id: 'fence', name: 'Picket Fence', price: 35, desc: 'Keeps things tidy', w: 22, h: 13 },
  { id: 'books', name: 'Book Stack', price: 40, desc: 'Required reading', w: 14, h: 16 },
  { id: 'lamp', name: 'Lamp Post', price: 60, desc: 'Lights up at night', w: 9, h: 28, glow: true },
  { id: 'bench', name: 'Park Bench', price: 70, desc: 'Take a seat', w: 22, h: 13 },
  { id: 'mailbox', name: 'Mailbox', price: 70, desc: 'Letters from friends', w: 13, h: 19 },
  { id: 'campfire', name: 'Campfire', price: 100, desc: 'Warm and crackly', w: 18, h: 15, glow: true, flicker: true },
  { id: 'pond', name: 'Lily Pond', price: 120, desc: 'Very reflective', w: 32, h: 12 },
  { id: 'pine', name: 'Pine Tree', price: 140, desc: 'Evergreen', w: 21, h: 34 },
  { id: 'tree', name: 'Apple Tree', price: 160, desc: 'Fresh air and fruit', w: 26, h: 34 },
  { id: 'well', name: 'Wishing Well', price: 220, desc: 'Make a wish', w: 21, h: 26 },
  { id: 'tent', name: 'Camping Tent', price: 260, desc: 'Weekend getaway', w: 27, h: 20 },
  { id: 'cottage', name: 'Cottage', price: 450, desc: 'A place to rest', w: 39, h: 34, glow: true },
  { id: 'cafe', name: 'Café', price: 650, desc: 'Coffee for studying', w: 34, h: 34, glow: true },
  { id: 'tower', name: 'Wizard Tower', price: 1000, desc: 'The ultimate focus goal', w: 22, h: 46, glow: true },
];

export const decorById = Object.fromEntries(DECOR.map((d) => [d.id, d])) as Record<string, DecorItem>;

// --- Economy ---
/** Coins earned per minute of completed focus. */
export const COINS_PER_FOCUS_MINUTE = 1;
/** Bonus for finishing a full focus session. */
export const SESSION_BONUS = 5;
/** Coins for checking off a task (once per task). */
export const TASK_REWARD = 10;
/** Starting coins so new visitors can place something straight away. */
export const STARTING_COINS = 40;
