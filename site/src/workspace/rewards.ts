// Everything you can earn in the village lives here, so balancing the game is
// a matter of editing numbers in this one file.

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
  walk: { src: `/sprites/animals/${n}-walk.png`, frames: 4, w: 32, h: 32, fps: 6 },
  idle: { src: `/sprites/animals/${n}-idle.png`, frames: 2, w: 32, h: 32, fps: 2 },
  facing: 'front',
  speed: 2.2,
  foot: 8,
  body: 13,
});

const critter = (n: string, walkFrames: number, idleFrames: number, size = 32, extra: Partial<SpriteDef> = {}): SpriteDef => ({
  walk: { src: `/sprites/critters/${n}-walk.png`, frames: walkFrames, w: size, h: size, fps: 8 },
  idle: { src: `/sprites/critters/${n}-idle.png`, frames: idleFrames, w: size, h: size, fps: 4 },
  facing: 'side',
  speed: 3,
  foot: 0,
  body: 17,
  ...extra,
});

export const RESIDENTS: Resident[] = [
  { id: 'cat', name: 'Mochi', species: 'Cat', unlockAt: 25, sprite: animal('cat') },
  { id: 'bunny', name: 'Clover', species: 'Bunny', unlockAt: 75, sprite: animal('bunny') },
  { id: 'penguin', name: 'Pip', species: 'Penguin', unlockAt: 150, sprite: critter('penguin', 6, 5, 16, { scale: 1.1, speed: 1.8, body: 14 }) },
  { id: 'pig', name: 'Truffle', species: 'Pig', unlockAt: 250, sprite: animal('pig') },
  { id: 'fairy', name: 'Lumi', species: 'Fairy', unlockAt: 400, sprite: { ...critter('fairy', 4, 4), walk: { src: '/sprites/critters/fairy-move.png', frames: 4, w: 32, h: 32, fps: 8 }, idle: { src: '/sprites/critters/fairy-fly.png', frames: 4, w: 32, h: 32, fps: 8 }, flying: true, foot: 8, body: 14 } },
  { id: 'bear', name: 'Bramble', species: 'Bear', unlockAt: 600, sprite: animal('bear') },
  { id: 'orange', name: 'Sunny', species: 'Orange', unlockAt: 850, sprite: critter('orange', 6, 4, 32, { speed: 2.4 }) },
  { id: 'wolf', name: 'Juniper', species: 'Wolf', unlockAt: 1100, sprite: animal('wolf') },
  { id: 'robot', name: 'J5', species: 'Robot', unlockAt: 1400, sprite: critter('robot', 6, 5) },
  { id: 'gumbot', name: 'Gummy', species: 'Gum Bot', unlockAt: 1800, sprite: critter('gumbot', 6, 4) },
  { id: 'twiggy', name: 'Twiggy', species: 'Explorer', unlockAt: 2300, sprite: critter('twiggy', 6, 5, 32, { speed: 4 }) },
  { id: 'tommy', name: 'Tommy', species: 'Adventurer', unlockAt: 2900, sprite: critter('tommy', 6, 4, 32, { idle: { src: '/sprites/critters/tommy-idle.png', frames: 4, w: 32, h: 32, fps: 1.5 } }) },
  { id: 'geralt', name: 'Geralt', species: 'Knight', unlockAt: 3600, sprite: critter('geralt', 3, 2, 32, { speed: 3.5, body: 13 }) },
  { id: 'skeleton', name: 'Sir Bones', species: 'Skeleton', unlockAt: 5000, sprite: critter('skeleton', 6, 9, 32, { speed: 1.6, body: 16 }) },
];

export const AVATAR_COUNT = 18;

export const avatarSprite = (n: number): SpriteDef => ({
  idle: { src: `/sprites/characters/char-${n}.png`, frames: 4, w: 64, h: 64, y: 0, fps: 4 },
  walk: { src: `/sprites/characters/char-${n}.png`, frames: 6, w: 64, h: 64, y: 64, fps: 9 },
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
  { id: 'flowers', name: 'Flower Patch', price: 20, desc: 'A burst of colour', w: 14, h: 9 },
  { id: 'mushrooms', name: 'Mushrooms', price: 25, desc: 'Grown overnight', w: 14, h: 11 },
  { id: 'bush', name: 'Berry Bush', price: 35, desc: 'Snacks for later', w: 18, h: 11 },
  { id: 'fence', name: 'Picket Fence', price: 35, desc: 'Keeps things tidy', w: 20, h: 11 },
  { id: 'books', name: 'Book Stack', price: 40, desc: 'Required reading', w: 14, h: 14 },
  { id: 'lamp', name: 'Lamp Post', price: 60, desc: 'Lights up at night', w: 9, h: 26, glow: true },
  { id: 'bench', name: 'Park Bench', price: 70, desc: 'Take a seat', w: 20, h: 12 },
  { id: 'mailbox', name: 'Mailbox', price: 70, desc: 'Letters from friends', w: 11, h: 17 },
  { id: 'campfire', name: 'Campfire', price: 100, desc: 'Warm and crackly', w: 16, h: 14, glow: true, flicker: true },
  { id: 'pond', name: 'Lily Pond', price: 120, desc: 'Very reflective', w: 30, h: 10 },
  { id: 'pine', name: 'Pine Tree', price: 140, desc: 'Evergreen', w: 18, h: 32 },
  { id: 'tree', name: 'Apple Tree', price: 160, desc: 'Fresh air and fruit', w: 28, h: 34 },
  { id: 'well', name: 'Wishing Well', price: 220, desc: 'Make a wish', w: 20, h: 24 },
  { id: 'tent', name: 'Camping Tent', price: 260, desc: 'Weekend getaway', w: 24, h: 18 },
  { id: 'cottage', name: 'Cottage', price: 450, desc: 'A place to rest', w: 34, h: 34, glow: true },
  { id: 'cafe', name: 'Café', price: 650, desc: 'Coffee for studying', w: 34, h: 32, glow: true },
  { id: 'tower', name: 'Wizard Tower', price: 1000, desc: 'The ultimate focus goal', w: 26, h: 44, glow: true },
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
