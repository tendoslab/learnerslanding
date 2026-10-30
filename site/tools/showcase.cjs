// Re-creates the example-village screenshots on the home page (public/showcase).
// Each scene is a hand-placed layout plus where the residents stand, so the
// pictures stay tidy and nobody is bunched up.
//
//   npm run dev                      # in another terminal (port 4321)
//   node tools/showcase.cjs          # needs Playwright: npx playwright install chromium
//
// Writes shots/show-<name>.png; convert to public/showcase/<name>.jpg (1200×500).
const { chromium } = require('playwright');
const P = (itemId, x, y, flip) => ({ uid: itemId + x + y, itemId, x, y, flip: !!flip });
const scenes = {
  // A little high street: houses and the café along the back, a lamp-lit walk in front.
  town: { landscape: 'city', sky: 'dusk', minutes: 1500, avatar: 3,
    placed: [
      P('cottage', 18, 0.06), P('mailbox', 26, 0.2), P('cafe', 50, 0.02), P('cottage', 82, 0.06, true), P('flowers', 12, 0.24), P('flowers', 88, 0.24),
      P('lamp', 34, 0.42), P('lamp', 66, 0.42), P('bench', 50, 0.4), P('books', 57, 0.36),
      P('tree', 5, 0.5), P('fence', 13, 0.72), P('fence', 21, 0.72), P('bush', 30, 0.8), P('well', 82, 0.62), P('pine', 95, 0.5), P('flowers', 72, 0.84),
    ],
    spots: { you: [50, 0.55, 1], cat: [40, 0.62, 1], bunny: [62, 0.7, -1], penguin: [25, 0.48, 1], pig: [74, 0.5, -1], fairy: [44, 0.25, 1], bear: [91, 0.84, -1], orange: [12, 0.9, 1], wolf: [86, 0.36, -1] } },
  // Camp by the water: tent and fire in a clearing ringed by pines.
  campsite: { landscape: 'lake', sky: 'night', minutes: 420, avatar: 7,
    placed: [
      P('pine', 4, 0.05), P('pine', 11, 0.2), P('pine', 6, 0.55), P('mushrooms', 14, 0.6), P('tent', 34, 0.15), P('campfire', 47, 0.45), P('bench', 47, 0.2),
      P('lamp', 62, 0.25), P('bush', 70, 0.08), P('pine', 88, 0.08, true), P('pine', 95, 0.3), P('pine', 91, 0.7), P('mushrooms', 84, 0.78, true), P('flowers', 28, 0.82),
    ],
    spots: { you: [40, 0.52, 1], cat: [54, 0.5, -1], bunny: [47, 0.66, 1], penguin: [22, 0.42, 1], pig: [74, 0.62, -1], fairy: [64, 0.4, -1] } },
  // An orchard and flower beds around a wishing well, fenced veg garden on the right.
  garden: { landscape: 'autumn', sky: 'day', minutes: 260, avatar: 12,
    placed: [
      P('tree', 8, 0.05), P('tree', 20, 0.12, true), P('tree', 10, 0.45), P('flowers', 30, 0.3), P('flowers', 36, 0.42), P('flowers', 30, 0.55),
      P('well', 52, 0.25), P('bench', 52, 0.62), P('fence', 70, 0.12), P('fence', 79, 0.12), P('fence', 88, 0.12), P('bush', 72, 0.36), P('bush', 84, 0.38, true), P('mushrooms', 92, 0.6),
      P('pond', 74, 0.78), P('flowers', 20, 0.86),
    ],
    spots: { you: [44, 0.5, 1], cat: [60, 0.52, -1], bunny: [34, 0.7, 1], penguin: [80, 0.6, -1], pig: [18, 0.65, 1] } },
  // The wizard tower on a headland, books and lamps along the path up to it.
  tower: { landscape: 'seaside', sky: 'dawn', minutes: 900, avatar: 15,
    placed: [
      P('tower', 70, 0.04), P('lamp', 60, 0.25), P('lamp', 80, 0.25), P('books', 66, 0.4), P('books', 76, 0.42, true), P('mushrooms', 88, 0.12),
      P('pine', 94, 0.3), P('cottage', 22, 0.08), P('flowers', 14, 0.3), P('fence', 30, 0.3), P('mailbox', 36, 0.2), P('bench', 44, 0.62), P('campfire', 28, 0.66), P('bush', 6, 0.75), P('flowers', 58, 0.86),
    ],
    spots: { you: [70, 0.55, -1], cat: [22, 0.6, 1], bunny: [36, 0.78, 1], penguin: [52, 0.46, -1], pig: [12, 0.5, 1], fairy: [80, 0.16, -1], bear: [88, 0.72, -1] } },
};
const fs = require('fs');
fs.mkdirSync('shots', { recursive: true });
(async () => {
  const b = await chromium.launch();
  for (const [name, sc] of Object.entries(scenes)) {
    const p = await b.newPage({ viewport: { width: 1200, height: 640 } });
    await p.addInitScript((sc) => {
      localStorage.setItem('learners-landing:workspace', JSON.stringify({ version: 3, state: { notes: '', tasks: [], placed: sc.placed, inventory: {}, history: {}, totalFocusMinutes: sc.minutes, coins: 0, sessionsCompleted: 0, tasksCompleted: 0, settings: { focus: 25, short: 5, long: 15, longEvery: 4, autoStart: false, chime: true, avatar: sc.avatar, sky: sc.sky, landscape: sc.landscape, notify: false } } }));
      const spots = {};
      for (const [id, [x, y, dir]] of Object.entries(sc.spots)) spots[id] = { x, y, dir };
      sessionStorage.setItem('learners-landing:spots', JSON.stringify(spots));
      Math.random = (() => { let s = 7; return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646; })();
    }, sc);
    await p.goto('http://localhost:4321/workspace');
    await p.waitForTimeout(2500);
    await p.evaluate(() => {
      const root = document.querySelector('.h-dvh');
      [...root.children].slice(1).forEach((c) => c.remove());
      document.querySelectorAll('astro-dev-toolbar, .ll-bubble').forEach((e) => e.remove());
    });
    await p.screenshot({ path: `shots/show-${name}.png`, clip: { x: 0, y: 140, width: 1200, height: 500 } });
    await p.close();
  }
  await b.close();
})();
