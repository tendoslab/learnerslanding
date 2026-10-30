import { memo, useMemo, type ReactNode } from 'react';
import { GROUND_HEIGHT, seeded } from './layout';
import type { Sky } from './sky';

// All scenery is drawn as chunky pixel shapes in SVG. Each layer uses a fixed
// pixel grid that is scaled to cover the screen ("slice"), so pixels stay square.

const W = 320;

/** A filled skyline: one column per grid pixel, `heights[x]` pixels tall. */
const skyline = (heights: number[], H: number) => {
  let d = `M0 ${H}`;
  heights.forEach((h, x) => (d += `V${H - h}H${x + 1}`));
  return d + `V${H}Z`;
};

const columns = (cols: [number, number, number][]) => cols.map(([x, y, h]) => `M${x} ${y}h1v${h}h-1z`).join('');

const transition = { transition: 'fill 3s, background 3s, opacity 3s' };

/** Distance from the bottom of the screen to the horizon, raised by `lift` (e.g. for a lake in front). */
const horizon = (lift = '0px') => `calc(${GROUND_HEIGHT} - 2px + ${lift})`;

function Mountains({ sky, lift, height = '36vh' }: { sky: Sky; lift?: string; height?: string }) {
  const H = 80;
  const { base, shade, snow } = useMemo(() => {
    const rand = seeded(7);
    const peaks = Array.from({ length: 7 }, (_, i) => ({ cx: i * 52 + rand() * 30 - 10, h: 42 + rand() * 32, slope: 0.85 + rand() * 0.5 }));
    const heights: number[] = [];
    const shaded: [number, number, number][] = [];
    const caps: [number, number, number][] = [];
    for (let x = 0; x < W; x++) {
      let best = 0;
      let owner = peaks[0];
      for (const p of peaks) {
        const h = p.h - Math.abs(x + 0.5 - p.cx) * p.slope;
        if (h > best) [best, owner] = [h, p];
      }
      const h = Math.max(12, Math.round(best + (x % 5 === 0 ? 1 : 0)));
      heights.push(h);
      if (x + 0.5 > owner.cx) shaded.push([x, H - h, h]);
      const snowLine = 56;
      if (h > snowLine) caps.push([x, H - h, Math.round((h - snowLine) * 0.6) + (x % 3 === 0 ? 2 : 1)]);
    }
    return { base: skyline(heights, H), shade: columns(shaded), snow: columns(caps) };
  }, []);
  return (
    <svg className="absolute inset-x-0 w-full" style={{ bottom: horizon(lift), height }} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMax slice" shapeRendering="crispEdges" aria-hidden>
      <path d={base} fill={sky.mountain} style={transition} />
      <path d={shade} fill={sky.mountainShade} style={transition} />
      <path d={snow} fill={sky.snow} style={transition} />
    </svg>
  );
}

/** Rolling hills with an optional row of pixel trees along the top. */
function Hills({ seed, H, base, amp, color, trees, treeColor, height, lift }: { seed: number; H: number; base: number; amp: number; color: string; trees?: number; treeColor?: string; height: string; lift?: string }) {
  const { hill, forest } = useMemo(() => {
    const rand = seeded(seed);
    const phase = rand() * 10;
    const heights = Array.from({ length: W }, (_, x) =>
      Math.round(base + amp * (Math.sin(x / 23 + phase) * 0.55 + Math.sin(x / 9.7 + phase * 2) * 0.2 + Math.sin(x / 61 + phase / 2) * 0.5)),
    );
    let forest = '';
    if (trees) {
      for (let x = 2; x < W - 4; x += 2 + Math.floor(rand() * trees)) {
        const top = H - heights[x + 1];
        if (rand() < 0.3) {
          // round bush-tree
          const r = 2 + Math.floor(rand() * 2);
          forest += `M${x} ${top - r}h${r * 2 - 1}v${r + 1}h-${r * 2 - 1}z M${x + 1} ${top - r - 1}h${r * 2 - 3}v1h-${r * 2 - 3}z`;
        } else {
          // pine: rows get wider towards the bottom
          const tall = 5 + Math.floor(rand() * 5);
          for (let row = 0; row < tall; row++) {
            const w = 1 + 2 * Math.floor((row + 1) / 2);
            forest += `M${x + 2 - Math.floor(w / 2)} ${top - tall + row}h${w}v1h-${w}z`;
          }
          forest += `M${x + 2} ${top}h1v1h-1z`;
        }
      }
    }
    return { hill: skyline(heights, H), forest };
  }, [seed, H, base, amp, trees]);
  return (
    <svg className="absolute inset-x-0 w-full" style={{ bottom: horizon(lift), height }} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMax slice" shapeRendering="crispEdges" aria-hidden>
      {forest && <path d={forest} fill={treeColor} style={transition} />}
      <path d={hill} fill={color} style={transition} />
    </svg>
  );
}

/** Blends two #rrggbb colours (t = 0 → a, 1 → b). */
const mix = (a: string, b: string, t: number) => {
  const c = (hex: string, i: number) => parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16);
  return `#${[0, 1, 2].map((i) => Math.round(c(a, i) + (c(b, i) - c(a, i)) * t).toString(16).padStart(2, '0')).join('')}`;
};

/**
 * Hills covered in round, leafy tree crowns. Each crown is a pixel disc lit from
 * the upper left (the sun's side), so the canopy reads as trees, not a flat band.
 */
function Grove({ seed, H, base, amp, colors, ground, spacing, height, lift }: { seed: number; H: number; base: number; amp: number; colors: string[]; ground?: string; spacing: number; height: string; lift?: string }) {
  const { hill, tones } = useMemo(() => {
    const rand = seeded(seed);
    const phase = rand() * 10;
    const heights = Array.from({ length: W }, (_, x) =>
      Math.round(base + amp * (Math.sin(x / 23 + phase) * 0.55 + Math.sin(x / 9.7 + phase * 2) * 0.2 + Math.sin(x / 61 + phase / 2) * 0.5)),
    );
    // tones[colour][0 shade, 1 base, 2 highlight]
    const tones = colors.map(() => ['', '', '']);
    const disc = (cx: number, cy: number, r: number, add: (row: string) => void) => {
      for (let dy = -r; dy <= r; dy++) {
        const half = Math.floor(Math.sqrt(r * r - dy * dy) + 0.4);
        add(`M${cx - half} ${cy + dy}h${half * 2 + 1}v1h-${half * 2 + 1}z`);
      }
    };
    for (let x = 0; x < W + 4; x += spacing + Math.floor(rand() * 3)) {
      const r = 5 + Math.floor(rand() * 3);
      const cx = x + Math.floor(rand() * 2);
      const cy = H - heights[Math.min(W - 1, cx)] - r + 3;
      const t = tones[Math.floor(rand() * colors.length)];
      disc(cx, cy, r, (row) => (t[0] += row));
      disc(cx - 1, cy - 1, r - 1, (row) => (t[1] += row));
      disc(cx - 2, cy - 2, r - 3, (row) => (t[2] += row));
    }
    return { hill: skyline(heights, H), tones };
  }, [seed, H, base, amp, spacing, colors.length]);
  return (
    <svg className="absolute inset-x-0 w-full" style={{ bottom: horizon(lift), height }} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMax slice" shapeRendering="crispEdges" aria-hidden>
      {/* Later crowns overlap earlier ones; draw each colour's layers together so every tree keeps its shading. */}
      {tones.map(([shade, body, light], i) => (
        <g key={i} style={transition}>
          <path d={shade} fill={mix(colors[i], '#1a1030', 0.28)} />
          <path d={body} fill={colors[i]} />
          <path d={light} fill={mix(colors[i], '#fff4d6', 0.22)} />
        </g>
      ))}
      <path d={hill} fill={ground ?? mix(colors[0], '#1a1030', 0.35)} style={transition} />
    </svg>
  );
}

/** Pixel-art sun (day) or moon (night), drawn on a 15×15 grid. */
function Body({ sky }: { sky: Sky }) {
  const night = sky.phase === 'night';
  const { lit, shade } = useMemo(() => {
    const r = 7.2;
    const lit: [number, number, number][] = [];
    const shade: [number, number, number][] = [];
    for (let x = 0; x < 15; x++) {
      for (let y = 0; y < 15; y++) {
        const dx = x - 7;
        const dy = y - 7;
        if (dx * dx + dy * dy > r * r) continue;
        const crater = night && ((x === 4 && y === 5) || (x === 5 && y === 5) || (x === 9 && y === 9) || (x === 10 && y === 9) || (x === 9 && y === 10) || (x === 6 && y === 10));
        const rim = dx * dx + dy * dy > (r - 1.4) * (r - 1.4) && dx + dy > 1;
        (crater || rim ? shade : lit).push([x, y, 1]);
      }
    }
    return { lit: columns(lit), shade: columns(shade) };
  }, [night]);
  const size = night ? 72 : 96;
  return (
    <div className="absolute transition-all duration-[3000ms]" style={{ top: `${sky.bodyTop}%`, right: '14%', width: size, height: size }} aria-hidden>
      <div className="absolute -inset-16 rounded-full transition-all duration-[3000ms]" style={{ background: `radial-gradient(circle, ${sky.bodyGlow} 0%, transparent 65%)` }} />
      <svg className="relative h-full w-full" viewBox="0 0 15 15" shapeRendering="crispEdges">
        <path d={lit} fill={sky.body} style={transition} />
        <path d={shade} fill={sky.bodyShade} style={transition} />
      </svg>
    </div>
  );
}

const Stars = memo(function Stars({ opacity }: { opacity: number }) {
  const stars = useMemo(() => {
    const rand = seeded(42);
    return Array.from({ length: 80 }, () => ({ x: rand() * 100, y: rand() * 58, s: rand() < 0.2 ? 3 : 2, d: rand() * 6, dur: 2.5 + rand() * 4 }));
  }, []);
  if (opacity <= 0) return null;
  return (
    <div className="absolute inset-0 transition-opacity duration-[3000ms]" style={{ opacity }} aria-hidden>
      {stars.map((s, i) => (
        <span key={i} className="ll-motion absolute bg-white" style={{ left: `${s.x}%`, top: `${s.y}%`, width: s.s, height: s.s, animation: `twinkle ${s.dur}s ${s.d}s ease-in-out infinite` }} />
      ))}
      {opacity > 0.5 && <span className="ll-motion absolute left-[20%] top-[12%] h-[2px] w-16 bg-gradient-to-r from-transparent to-white" style={{ animation: 'shooting 11s 3s linear infinite' }} />}
    </div>
  );
});

function Clouds({ sky, raining }: { sky: Sky; raining: boolean }) {
  const clouds = useMemo(() => {
    const rand = seeded(19);
    return Array.from({ length: 7 }, (_, i) => {
      const w = 14 + Math.floor(rand() * 16);
      const bumps = Array.from({ length: 2 + Math.floor(rand() * 3) }, () => ({ x: 2 + Math.floor(rand() * (w - 8)), w: 4 + Math.floor(rand() * 6), h: 2 + Math.floor(rand() * 3) }));
      const far = i % 2 === 1;
      return { w, bumps, far, top: 4 + rand() * 26, dur: (far ? 260 : 170) + rand() * 80, delay: -rand() * 250, px: far ? 3 : 4 };
    });
  }, []);
  const color = raining ? sky.cloudShade : sky.cloud;
  return (
    <>
      {clouds.map((c, i) => {
        const H = 8;
        const top = Math.max(...c.bumps.map((b) => b.h));
        let d = `M0 ${H - 3}h${c.w}v3h-${c.w}z`;
        c.bumps.forEach((b) => (d += `M${b.x} ${H - 3 - b.h}h${b.w}v${b.h}h-${b.w}z`));
        return (
          <div key={i} className="ll-motion absolute left-0" style={{ top: `${c.top}%`, animation: `drift ${c.dur}s linear ${c.delay}s infinite`, opacity: c.far ? 0.55 : 0.9 }} aria-hidden>
            <svg width={c.w * c.px} height={(top + 3) * c.px} viewBox={`0 ${H - 3 - top} ${c.w} ${top + 3}`} shapeRendering="crispEdges">
              <path d={d} fill={color} style={transition} />
              <path d={`M0 ${H - 1}h${c.w}v1h-${c.w}z`} fill={sky.cloudShade} style={transition} />
            </svg>
          </div>
        );
      })}
    </>
  );
}


/** A band of water between the far shore and the grass, with drifting glints. */
function Water({ sky, height, children }: { sky: Sky; height: string; children?: ReactNode }) {
  const glints = useMemo(() => {
    const rand = seeded(23);
    return Array.from({ length: 26 }, () => ({ x: rand() * 100, y: 12 + rand() * 80, w: 2 + Math.floor(rand() * 5), d: rand() * 5, dur: 3 + rand() * 4 }));
  }, []);
  return (
    <div
      className="absolute inset-x-0 overflow-hidden"
      style={{ bottom: horizon(), height, background: `linear-gradient(to bottom, ${sky.waterLight} 0%, ${sky.water} 22%, ${sky.water} 100%)`, ...transition }}
      aria-hidden
    >
      {children}
      {glints.map((g, i) => (
        <span
          key={i}
          className="ll-motion absolute h-[3px]"
          style={{ left: `${g.x}%`, top: `${g.y}%`, width: g.w * 4, background: sky.waterLight, animation: `glint ${g.dur}s ${-g.d}s ease-in-out infinite`, ...transition }}
        />
      ))}
    </div>
  );
}

/** Pixel sailboat, 12×11 grid. */
function Boat({ sky }: { sky: Sky }) {
  return (
    <svg width={36} height={33} viewBox="0 0 12 11" shapeRendering="crispEdges">
      <path d="M6 0h1v8H6z" fill={sky.buildingShade} />
      <path d="M7 1h1v1h1v1h1v1h1v3H7z" fill={sky.cloud} style={transition} />
      <path d="M5 2h1v5H2V6h1V5h1V4h1z" fill={sky.cloudShade} style={transition} />
      <path d="M0 8h12v1h-1v1H2V9H1z" fill={sky.autumnNear} style={transition} />
    </svg>
  );
}

function Seaside({ sky }: { sky: Sky }) {
  const night = sky.phase === 'night' || sky.phase === 'dusk';
  return (
    <>
      {/* A little island with a lighthouse on the horizon */}
      <svg className="absolute left-[12%] h-[9vh] overflow-visible" style={{ bottom: `calc(${horizon()} + 15vh - 2px)`, aspectRatio: '40 / 26' }} viewBox="0 0 40 26" shapeRendering="crispEdges" aria-hidden>
        <path d="M0 26V24h4v-2h6v-1h14v1h8v2h8v2z" fill={sky.hillNear} style={transition} />
        <path d="M14 21V9h1V6h4v3h1v12z" fill={sky.cloud} style={transition} />
        <path d="M14 18h6v2h-6zM14 12h6v2h-6z" fill={sky.autumnNear} style={transition} />
        <path d="M15 3h4v3h-4z" fill={night ? '#ffe39a' : sky.glass} style={transition} />
        <path d="M14 2h6v1h-6zM16 1h2v1h-2z" fill={sky.autumnNear} style={transition} />
        {night && <circle cx="17" cy="4.5" r="7" fill="rgba(255,230,150,0.35)" className="ll-motion" style={{ animation: 'beacon 4s ease-in-out infinite' }} />}
      </svg>
      <Water sky={sky} height="15vh">
        <div className="ll-motion absolute left-0 top-[18%]" style={{ animation: 'drift 240s linear -60s infinite' }}>
          <Boat sky={sky} />
        </div>
        <div className="ll-motion absolute left-0 top-[46%] opacity-80" style={{ animation: 'drift 320s linear -230s infinite' }}>
          <div className="scale-75">
            <Boat sky={sky} />
          </div>
        </div>
      </Water>
      {/* Beach between the sea and the grass */}
      <div className="absolute inset-x-0" style={{ bottom: horizon(), height: '1.6vh', minHeight: 8, background: sky.sand, ...transition }} aria-hidden />
    </>
  );
}

/** A pixel skyline whose windows light up after dark. */
function City({ sky }: { sky: Sky }) {
  const H = 60;
  const { body, shade, windows } = useMemo(() => {
    const rand = seeded(31);
    const heights: number[] = [];
    const shaded: [number, number, number][] = [];
    const windows: { x: number; y: number; r: number }[] = [];
    let x = 0;
    while (x < W) {
      const w = 7 + Math.floor(rand() * 12);
      const h = 14 + Math.floor(rand() * (rand() < 0.2 ? 44 : 26));
      for (let i = 0; i < w && x + i < W; i++) heights.push(i === 0 || i === w - 1 ? h - 1 : h);
      // Roof detail: an antenna on the tall ones
      if (h > 42) heights[x + Math.floor(w / 2)] = h + 5;
      shaded.push([x + w - 2, H - h, h], [x + w - 1, H - h + 1, h - 1]);
      for (let wy = H - h + 3; wy < H - 3; wy += 3) for (let wx = x + 2; wx < x + w - 2; wx += 2) windows.push({ x: wx, y: wy, r: rand() });
      x += w + (rand() < 0.3 ? 1 : 0);
      if (x < W && heights.length < x) heights.push(0);
    }
    return { body: skyline(heights.slice(0, W), H), shade: columns(shaded), windows };
  }, []);
  const lit = windows.filter((w) => w.r < sky.lit);
  const dark = windows.filter((w) => w.r >= sky.lit);
  const path = (list: { x: number; y: number }[]) => list.map((w) => `M${w.x} ${w.y}h1v1h-1z`).join('');
  return (
    <svg className="absolute inset-x-0 w-full" style={{ bottom: horizon(), height: '24vh' }} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMax slice" shapeRendering="crispEdges" aria-hidden>
      <path d={body} fill={sky.building} style={transition} />
      <path d={shade} fill={sky.buildingShade} style={transition} />
      <path d={path(dark)} fill={sky.glass} style={transition} />
      <path d={path(lit)} fill="#ffd77e" />
    </svg>
  );
}

/** The scenery between the sky and the grass. */
function Landscape({ id, sky }: { id: string; sky: Sky }) {
  switch (id) {
    case 'autumn':
      return (
        <>
          <Mountains sky={sky} height="30vh" />
          <Grove seed={5} H={56} base={22} amp={8} colors={[mix(sky.autumnFar, sky.hillFar, 0.55), mix(sky.autumnGold, sky.hillFar, 0.55)]} spacing={7} height="25vh" />
          <Grove seed={3} H={46} base={13} amp={6} colors={[sky.autumnGold, mix(sky.autumnGold, sky.autumnFar, 0.5)]} spacing={6} height="19vh" />
          <Grove seed={11} H={36} base={5} amp={3} colors={[sky.autumnNear, sky.autumnFar, mix(sky.autumnNear, sky.autumnGold, 0.5)]} ground={sky.hillNear} spacing={6} height="13vh" />
        </>
      );
    case 'lake':
      return (
        <>
          <Mountains sky={sky} lift="7vh" height="32vh" />
          <Hills seed={3} H={50} base={18} amp={8} color={sky.hillFar} trees={9} treeColor={sky.hillFar} height="20vh" lift="7vh" />
          <Hills seed={11} H={36} base={6} amp={4} color={sky.hillNear} trees={3} treeColor={sky.treeline} height="11vh" lift="7vh" />
          <Water sky={sky} height="7vh" />
        </>
      );
    case 'seaside':
      return <Seaside sky={sky} />;
    case 'city':
      return (
        <>
          <Hills seed={3} H={50} base={16} amp={6} color={sky.hillFar} height="20vh" />
          <City sky={sky} />
          {sky.lit > 0 && <div className="absolute inset-x-0 h-[14vh]" style={{ bottom: horizon(), background: 'linear-gradient(to top, rgba(255,200,120,0.18), transparent)' }} />}
          <Hills seed={11} H={36} base={4} amp={3} color={sky.hillNear} trees={3} treeColor={sky.treeline} height="9vh" />
        </>
      );
    default:
      return (
        <>
          <Mountains sky={sky} />
          <Hills seed={3} H={50} base={20} amp={8} color={sky.hillFar} trees={9} treeColor={sky.hillFar} height="22vh" />
          <Hills seed={11} H={36} base={8} amp={5} color={sky.hillNear} trees={4} treeColor={sky.treeline} height="15vh" />
        </>
      );
  }
}

/** Everything behind the ground: sky, sun/moon, stars, clouds and the chosen landscape. */
export function Backdrop({ sky, raining, landscape }: { sky: Sky; raining: boolean; landscape: string }) {
  return (
    <>
      <div
        className="absolute inset-0 transition-[background] duration-[3000ms]"
        style={{ background: `linear-gradient(to bottom, ${sky.skyTop} 0%, ${sky.skyMid} 45%, ${sky.skyBottom} 75%)` }}
      />
      <div className="absolute inset-x-0 h-[30vh]" style={{ bottom: GROUND_HEIGHT, background: `linear-gradient(to top, ${sky.horizon}, transparent)` }} />
      <Stars opacity={raining ? 0 : sky.stars} />
      {!raining && <Body sky={sky} />}
      <Clouds sky={sky} raining={raining} />
      <Landscape id={landscape} sky={sky} />
      {raining && <div className="absolute inset-0 bg-slate-700/25 transition-opacity duration-1000" />}
    </>
  );
}

/** Grass texture, tufts and wildflowers inside the ground band (drawn under decorations). */
export const GroundDetail = memo(function GroundDetail({ sky }: { sky: Sky }) {
  const { tufts, flowers, patches } = useMemo(() => {
    const rand = seeded(5);
    return {
      tufts: Array.from({ length: 46 }, () => ({ x: rand() * 100, y: 4 + rand() * 88, k: 2 + Math.round(rand() * 2), v: Math.floor(rand() * 3) })),
      flowers: Array.from({ length: 22 }, () => ({ x: rand() * 100, y: 4 + rand() * 80, c: ['#f29bbf', '#fff3a3', '#ffffff', '#b69cf0'][Math.floor(rand() * 4)] })),
      patches: Array.from({ length: 7 }, () => ({ x: rand() * 100, y: 10 + rand() * 70, w: 14 + rand() * 18 })),
    };
  }, []);
  const TUFTS = ['M0 4h1V2h1v2h1V0h1v4h1V1h1v3h1V3h1v1z', 'M0 3h1V1h1v2h1V0h1v3h1V2h1v1z', 'M1 3h1V0h1v3h1V1h1v2h1v1H1z'];
  return (
    <div className="ll-lit pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {patches.map((p, i) => (
        <div key={i} className="absolute rounded-[50%] transition-colors duration-[3000ms]" style={{ left: `${p.x}%`, bottom: `${p.y}%`, width: `${p.w}%`, height: '18%', transform: 'translate(-50%, 50%)', background: sky.grassDark, opacity: 0.35 }} />
      ))}
      {tufts.map((t, i) => (
        <svg key={i} className="absolute" style={{ left: `${t.x}%`, bottom: `${t.y}%`, width: 8 * t.k, height: 5 * t.k }} viewBox="0 0 8 5" shapeRendering="crispEdges">
          <path d={TUFTS[t.v]} fill={i % 2 ? sky.grassEdge : sky.grassDark} style={transition} />
        </svg>
      ))}
      {flowers.map((f, i) => (
        <span key={i} className="absolute h-[6px] w-[6px]" style={{ left: `${f.x}%`, bottom: `${f.y}%`, background: f.c, boxShadow: `0 6px 0 0 ${sky.grassDark}` }} />
      ))}
    </div>
  );
});

/** Life in the air: birds by day, fireflies after dark, and rain when the rain sound is on. */
export const Ambient = memo(function Ambient({ sky, raining }: { sky: Sky; raining: boolean }) {
  const dark = sky.phase === 'night' || sky.phase === 'dusk';
  const { flies, drops, birds } = useMemo(() => {
    const rand = seeded(77);
    return {
      flies: Array.from({ length: 22 }, () => ({ x: rand() * 100, y: rand() * 30, d: rand() * 6, dur: 5 + rand() * 6 })),
      drops: Array.from({ length: 110 }, () => ({ x: rand() * 102, d: rand() * 1.2, dur: 0.55 + rand() * 0.35, len: 10 + rand() * 12 })),
      birds: Array.from({ length: 3 }, (_, i) => ({ top: 12 + rand() * 18, delay: -i * 9 - rand() * 20, dur: 38 + rand() * 18 })),
    };
  }, []);
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {!dark &&
        !raining &&
        birds.map((b, i) => (
          <div key={i} className="ll-motion absolute left-0" style={{ top: `${b.top}%`, animation: `drift ${b.dur}s linear ${b.delay}s infinite` }}>
            <svg width="21" height="9" viewBox="0 0 7 3" shapeRendering="crispEdges" className="ll-motion" style={{ animation: `flap .5s steps(2) infinite`, transformOrigin: 'center' }}>
              <path d="M0 0h1v1h1v1h1V1h1V0h1v1H4v1H3v1H2V2H1V1H0z" fill={sky.phase === 'day' ? '#3b4a63' : '#5a3f5e'} />
            </svg>
          </div>
        ))}
      {dark &&
        flies.map((f, i) => (
          <span
            key={i}
            className="ll-motion absolute h-[4px] w-[4px] bg-[#fff6a8] shadow-[0_0_8px_3px_rgba(255,240,140,0.7)]"
            style={{ left: `${f.x}%`, bottom: `${4 + f.y}%`, animation: `firefly ${f.dur}s ${-f.d}s ease-in-out infinite` }}
          />
        ))}
      {raining && (
        <>
          {drops.map((r, i) => (
            <span
              key={i}
              className="ll-motion absolute top-0 w-[2px] bg-[#cfe3ff]/60"
              style={{ left: `${r.x}%`, height: r.len, animation: `rain ${r.dur}s ${-r.d}s linear infinite` }}
            />
          ))}
        </>
      )}
    </div>
  );
});

export const SCENERY_KEYFRAMES = `
  @keyframes drift { from { transform: translateX(-30vw); } to { transform: translateX(130vw); } }
  @keyframes twinkle { 0%,100% { opacity: .2; } 50% { opacity: 1; } }
  @keyframes shooting { 0%,90% { transform: translate(0,0) rotate(20deg); opacity: 0; } 92% { opacity: 1; } 100% { transform: translate(40vw,14vh) rotate(20deg); opacity: 0; } }
  @keyframes flap { 50% { transform: scaleY(-1); } }
  @keyframes firefly { 0%,100% { transform: translate(0,0); opacity: .2; } 25% { opacity: 1; } 50% { transform: translate(18px,-22px); opacity: .5; } 75% { transform: translate(-12px,-8px); opacity: 1; } }
  @keyframes glint { 0%,100% { opacity: 0; transform: translateX(0); } 50% { opacity: .8; transform: translateX(6px); } }
  @keyframes beacon { 0%,100% { opacity: .3; } 50% { opacity: 1; } }
  @keyframes rain { from { transform: translate(0,-30px) rotate(12deg); } to { transform: translate(-14vh,105vh) rotate(12deg); } }
`;
