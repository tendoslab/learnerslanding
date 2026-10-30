import { memo, useMemo } from 'react';
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

function Mountains({ sky }: { sky: Sky }) {
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
    <svg className="absolute inset-x-0 w-full" style={{ bottom: `calc(${GROUND_HEIGHT} - 2px)`, height: '36vh' }} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMax slice" shapeRendering="crispEdges" aria-hidden>
      <path d={base} fill={sky.mountain} style={transition} />
      <path d={shade} fill={sky.mountainShade} style={transition} />
      <path d={snow} fill={sky.snow} style={transition} />
    </svg>
  );
}

/** Rolling hills with an optional row of pixel trees along the top. */
function Hills({ seed, H, base, amp, color, trees, treeColor, height }: { seed: number; H: number; base: number; amp: number; color: string; trees?: number; treeColor?: string; height: string }) {
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
    <svg className="absolute inset-x-0 w-full" style={{ bottom: `calc(${GROUND_HEIGHT} - 2px)`, height }} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMax slice" shapeRendering="crispEdges" aria-hidden>
      {forest && <path d={forest} fill={treeColor} style={transition} />}
      <path d={hill} fill={color} style={transition} />
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

/** Everything behind the ground: sky, sun/moon, stars, clouds, mountains, hills. */
export function Backdrop({ sky, raining }: { sky: Sky; raining: boolean }) {
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
      <Mountains sky={sky} />
      <Hills seed={3} H={50} base={20} amp={8} color={sky.hillFar} trees={9} treeColor={sky.hillFar} height="22vh" />
      <Hills seed={11} H={36} base={8} amp={5} color={sky.hillNear} trees={4} treeColor={sky.treeline} height="15vh" />
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
  @keyframes rain { from { transform: translate(0,-30px) rotate(12deg); } to { transform: translate(-14vh,105vh) rotate(12deg); } }
`;
