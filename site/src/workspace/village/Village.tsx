import { useEffect, useMemo, useRef, useState, type PointerEvent as RPointerEvent } from 'react';
import { FlipHorizontal2, PackageOpen } from 'lucide-react';
import { useWorkspace, unlockedResidents, type Placed } from '../store';
import { avatarSprite, decorById, type SheetAnim, type SpriteDef } from '../rewards';
import { skyFor, type Sky } from './sky';

// Vertical layout of the walkable field, as % of the ground band's height.
const FIELD_FRONT = 4;
const FIELD_DEPTH = 66;
const bottomFor = (y: number) => FIELD_FRONT + (1 - y) * FIELD_DEPTH;
const depthScale = (y: number) => 0.8 + 0.3 * y;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

const usePixelScale = () => {
  const [scale, setScale] = useState(3);
  useEffect(() => {
    const update = () => setScale(window.innerWidth < 640 ? 2 : window.innerHeight < 760 ? 2.5 : window.innerWidth >= 1280 && window.innerHeight >= 820 ? 3.5 : 3);
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);
  return scale;
};

const useSky = () => {
  const mode = useWorkspace((s) => s.settings.sky);
  const [sky, setSky] = useState<Sky>(() => skyFor(mode));
  useEffect(() => {
    setSky(skyFor(mode));
    const id = setInterval(() => setSky(skyFor(mode)), 60_000);
    return () => clearInterval(id);
  }, [mode]);
  return sky;
};

interface Props {
  buildMode: boolean;
  /** Inventory item waiting to be placed (build mode). */
  placing: string | null;
  onPlaced: () => void;
  focusing: boolean;
}

export default function Village({ buildMode, placing, onPlaced, focusing }: Props) {
  const sky = useSky();
  const S = usePixelScale();
  const placed = useWorkspace((s) => s.placed);
  const minutes = useWorkspace((s) => s.totalFocusMinutes);
  const avatar = useWorkspace((s) => s.settings.avatar);
  const place = useWorkspace((s) => s.place);
  const hasInventory = useWorkspace((s) => Object.values(s.inventory).some((n) => n > 0));
  const bandRef = useRef<HTMLDivElement>(null);
  const [selected, setSelected] = useState<string | null>(null);

  const residents = useMemo(() => unlockedResidents(minutes), [minutes]);
  const night = sky.phase === 'night' || sky.phase === 'dusk';

  useEffect(() => {
    if (!buildMode) setSelected(null);
  }, [buildMode]);

  const pointToField = (clientX: number, clientY: number) => {
    const r = bandRef.current!.getBoundingClientRect();
    const x = clamp(((clientX - r.left) / r.width) * 100, 2, 98);
    const fromBottom = ((r.bottom - clientY) / r.height) * 100;
    const y = clamp(1 - (fromBottom - FIELD_FRONT) / FIELD_DEPTH, 0, 1);
    return { x, y };
  };

  const onFieldClick = (e: RPointerEvent<HTMLDivElement>) => {
    if (!buildMode) return;
    if (e.target !== e.currentTarget) return;
    if (placing) {
      const { x, y } = pointToField(e.clientX, e.clientY);
      place(placing, x, y);
      onPlaced();
    } else {
      setSelected(null);
    }
  };

  return (
    <div className="absolute inset-0 isolate overflow-hidden select-none" style={{ background: sky.skyBottom }} aria-hidden={!buildMode}>
      {/* Sky */}
      <div className="absolute inset-0 transition-colors duration-[3000ms]" style={{ background: `linear-gradient(to bottom, ${sky.skyTop}, ${sky.skyBottom})` }} />
      <Stars opacity={sky.stars} />
      <div
        className="absolute rounded-full transition-all duration-[3000ms]"
        style={{
          width: sky.phase === 'night' ? 70 : 96,
          height: sky.phase === 'night' ? 70 : 96,
          top: `${sky.bodyTop}%`,
          right: '14%',
          background: sky.body,
          boxShadow: `0 0 70px 10px ${sky.bodyGlow}`,
        }}
      />
      <Clouds tint={sky.cloud} />

      {/* Hills */}
      <Hills color={sky.hillFar} seed={3} base={56} amp={14} bottom="24%" />
      <Hills color={sky.hillNear} seed={11} base={40} amp={12} bottom="18%" />

      {/* Ground band: decorations + residents */}
      <div
        ref={bandRef}
        onPointerDown={onFieldClick}
        className="absolute inset-x-0 bottom-0"
        style={{
          height: 'clamp(190px, 34vh, 380px)',
          background: `linear-gradient(to bottom, ${sky.grassTop}, ${sky.grassBottom})`,
          pointerEvents: buildMode ? 'auto' : 'none',
          cursor: buildMode && placing ? 'copy' : 'default',
          boxShadow: `inset 0 6px 0 0 ${sky.grassEdge}`,
        }}
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            backgroundImage: `radial-gradient(${sky.grassEdge} 1.5px, transparent 1.6px)`,
            backgroundSize: '26px 18px',
          }}
        />
        {buildMode && (
          <div className="pointer-events-none absolute inset-x-0 border-y-2 border-dashed border-white/30" style={{ bottom: `${FIELD_FRONT}%`, height: `${FIELD_DEPTH}%` }} />
        )}

        {placed.map((p) => (
          <Decoration
            key={p.uid}
            item={p}
            S={S}
            night={night}
            buildMode={buildMode}
            selected={selected === p.uid}
            onSelect={() => setSelected(p.uid)}
            toField={pointToField}
          />
        ))}

        <Actors residents={residents.map((r) => ({ id: r.id, sprite: r.sprite }))} avatar={avatarSprite(avatar)} S={S} focusing={focusing} />

        {placed.length === 0 && !buildMode && (
          <p className="absolute inset-x-0 top-[38%] text-center font-display text-sm text-white/60">
            {hasInventory
              ? 'You have decorations to place! Press the hammer (top right) to start building.'
              : 'Your village is waiting. Finish focus sessions to earn coins and decorate it!'}
          </p>
        )}
      </div>

      {/* Night tint sits over the scene; glows go on top of it */}
      <div className="pointer-events-none absolute inset-0 transition-opacity duration-[3000ms]" style={{ background: sky.tint, mixBlendMode: 'multiply', opacity: sky.tintOpacity }} />
      {night && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0" style={{ height: 'clamp(190px, 34vh, 380px)' }}>
          {placed.map((p) => {
            const d = decorById[p.itemId];
            if (!d?.glow) return null;
            const size = d.h * S * depthScale(p.y) * 1.8;
            return (
              <div
                key={p.uid}
                className={d.flicker ? 'animate-[flicker_1.6s_ease-in-out_infinite]' : ''}
                style={{
                  position: 'absolute',
                  left: `${p.x}%`,
                  bottom: `calc(${bottomFor(p.y)}% + ${(d.h * S * depthScale(p.y)) / 2}px)`,
                  width: size,
                  height: size,
                  transform: 'translate(-50%, 50%)',
                  background: 'radial-gradient(circle, rgba(255,214,120,0.45) 0%, rgba(255,190,90,0.15) 40%, transparent 70%)',
                  mixBlendMode: 'screen',
                }}
              />
            );
          })}
        </div>
      )}

      <style>{`
        @keyframes flicker { 0%,100% { opacity: .85; transform: translate(-50%,50%) scale(1); } 50% { opacity: 1; transform: translate(-50%,50%) scale(1.08); } }
        @keyframes drift { from { transform: translateX(-30vw); } to { transform: translateX(130vw); } }
        @keyframes twinkle { 0%,100% { opacity: .2; } 50% { opacity: 1; } }
        @keyframes pop-in { 0% { transform: translate(-50%, -14px) scale(.6); opacity: 0; } 70% { transform: translate(-50%, 2px) scale(1.05); opacity: 1; } 100% { transform: translate(-50%, 0) scale(1); } }
        @media (prefers-reduced-motion: reduce) { .ll-motion { animation: none !important; } }
      `}</style>
    </div>
  );
}

function Decoration({
  item,
  S,
  night,
  buildMode,
  selected,
  onSelect,
  toField,
}: {
  item: Placed;
  S: number;
  night: boolean;
  buildMode: boolean;
  selected: boolean;
  onSelect: () => void;
  toField: (x: number, y: number) => { x: number; y: number };
}) {
  const d = decorById[item.itemId];
  const move = useWorkspace((s) => s.move);
  const flip = useWorkspace((s) => s.flip);
  const pickUp = useWorkspace((s) => s.pickUp);
  const [drag, setDrag] = useState<{ x: number; y: number } | null>(null);
  const offset = useRef({ dx: 0, dy: 0 });
  if (!d) return null;

  const x = drag?.x ?? item.x;
  const y = drag?.y ?? item.y;
  const k = S * depthScale(y);

  const onDown = (e: RPointerEvent<HTMLDivElement>) => {
    if (!buildMode) return;
    e.stopPropagation();
    onSelect();
    const p = toField(e.clientX, e.clientY);
    offset.current = { dx: item.x - p.x, dy: item.y - p.y };
    e.currentTarget.setPointerCapture(e.pointerId);
    setDrag({ x: item.x, y: item.y });
  };
  const onMove = (e: RPointerEvent<HTMLDivElement>) => {
    if (!drag) return;
    const p = toField(e.clientX, e.clientY);
    setDrag({ x: clamp(p.x + offset.current.dx, 2, 98), y: clamp(p.y + offset.current.dy, 0, 1) });
  };
  const onUp = () => {
    if (drag) move(item.uid, drag.x, drag.y);
    setDrag(null);
  };

  return (
    <div
      className="absolute"
      style={{
        left: `${x}%`,
        bottom: `${bottomFor(y)}%`,
        zIndex: Math.round(y * 1000) + 10,
        transform: 'translateX(-50%)',
        animation: 'pop-in .45s cubic-bezier(.2,.8,.2,1)',
      }}
    >
      <div
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        className={buildMode ? 'cursor-grab touch-none active:cursor-grabbing' : ''}
        style={{ pointerEvents: buildMode ? 'auto' : 'none' }}
        title={buildMode ? `${d.name} (drag to move)` : undefined}
      >
        <img
          src={`/sprites/decor/${d.id}.png`}
          alt={d.name}
          draggable={false}
          width={d.w * k}
          height={d.h * k}
          className="pixelated block"
          style={{
            transform: item.flip ? 'scaleX(-1)' : undefined,
            filter: `drop-shadow(0 ${k}px 0 rgba(0,0,0,0.18))${selected ? ' drop-shadow(0 0 3px #fff) drop-shadow(0 0 2px #fff)' : ''}`,
            imageRendering: 'pixelated',
          }}
        />
        {d.glow && night && d.id === 'lamp' && (
          <span className="absolute left-1/2 top-[8%] h-2 w-2 -translate-x-1/2 rounded-full bg-yellow-100 shadow-[0_0_14px_6px_rgba(255,230,150,0.8)]" />
        )}
      </div>
      {buildMode && selected && !drag && (
        <div className="absolute bottom-full left-1/2 mb-2 flex -translate-x-1/2 gap-1 rounded-lg bg-black/75 p-1 shadow-lg" style={{ zIndex: 5000 }}>
          <button type="button" onPointerDown={(e) => e.stopPropagation()} onClick={() => flip(item.uid)} className="rounded p-1.5 text-white hover:bg-white/20" title="Flip">
            <FlipHorizontal2 size={16} />
          </button>
          <button type="button" onPointerDown={(e) => e.stopPropagation()} onClick={() => pickUp(item.uid)} className="rounded p-1.5 text-white hover:bg-white/20" title="Put back in inventory">
            <PackageOpen size={16} />
          </button>
        </div>
      )}
    </div>
  );
}

// --- Wandering residents -----------------------------------------------------

interface ActorSpec {
  id: string;
  sprite: SpriteDef;
}

interface ActorState {
  x: number;
  y: number;
  tx: number;
  ty: number;
  dir: 1 | -1;
  walking: boolean;
  wait: number;
  t: number;
  anim: SheetAnim | null;
}

const sheetSize = (a: SheetAnim) => (a.src.includes('/characters/') ? [384, 128] : [a.frames * a.w, a.h]);

function Actors({ residents, avatar, S, focusing }: { residents: ActorSpec[]; avatar: SpriteDef; S: number; focusing: boolean }) {
  const actors = useMemo<ActorSpec[]>(() => [{ id: 'you', sprite: avatar }, ...residents], [avatar, residents]);
  const nodes = useRef(new Map<string, { wrap: HTMLDivElement; sprite: HTMLDivElement }>());
  const states = useRef(new Map<string, ActorState>());
  const focusingRef = useRef(focusing);
  focusingRef.current = focusing;

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let raf = 0;
    let last = performance.now();

    const loop = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      for (const spec of actors) {
        const node = nodes.current.get(spec.id);
        if (!node) continue;
        let st = states.current.get(spec.id);
        if (!st) {
          const x = 10 + Math.random() * 80;
          const y = 0.25 + Math.random() * 0.7;
          st = { x, y, tx: x, ty: y, dir: 1, walking: false, wait: 1 + Math.random() * 3, t: Math.random() * 10, anim: null };
          states.current.set(spec.id, st);
        }
        const sp = spec.sprite;
        const speed = sp.speed ?? 2.5;
        st.t += dt;

        // The avatar settles down to study while a focus timer is running.
        const studying = spec.id === 'you' && focusingRef.current;
        if (studying) {
          st.tx = 50;
          st.ty = 0.62;
          st.walking = Math.hypot(st.tx - st.x, (st.ty - st.y) * 40) > 0.6;
        } else if (!st.walking) {
          st.wait -= dt;
          if (st.wait <= 0 && !reduced) {
            st.tx = clamp(st.x + (Math.random() - 0.5) * 50, 4, 96);
            st.ty = clamp(st.y + (Math.random() - 0.5) * 0.5, sp.flying ? 0 : 0.15, 1);
            st.walking = true;
          }
        }

        if (st.walking && !reduced) {
          const dx = st.tx - st.x;
          const dy = (st.ty - st.y) * 40; // depth units are much "shorter" than width units
          const dist = Math.hypot(dx, dy);
          const step = speed * dt;
          if (dist <= step) {
            st.x = st.tx;
            st.y = st.ty;
            st.walking = false;
            st.wait = 2 + Math.random() * 6;
          } else {
            st.x += (dx / dist) * step;
            st.y += (dy / dist / 40) * step;
            if (Math.abs(dx) > 0.05) st.dir = dx > 0 ? 1 : -1;
          }
        }

        const anim = st.walking ? sp.walk : sp.idle;
        const k = S * (sp.scale ?? 1) * depthScale(st.y);
        const [sw, sh] = sheetSize(anim);
        const frame = Math.floor(st.t * (anim.fps ?? 6)) % anim.frames;
        const el = node.sprite;
        if (st.anim !== anim) {
          el.style.backgroundImage = `url(${anim.src})`;
          st.anim = anim;
        }
        el.style.width = `${anim.w * k}px`;
        el.style.height = `${anim.h * k}px`;
        el.style.backgroundSize = `${sw * k}px ${sh * k}px`;
        el.style.backgroundPosition = `${-frame * anim.w * k}px ${-(anim.y ?? 0) * k}px`;
        el.style.transform = sp.facing === 'side' && st.dir === -1 ? 'scaleX(-1)' : '';

        const bob = sp.flying ? Math.sin(st.t * 2.4) * 6 + 40 : 0;
        node.wrap.style.left = `${st.x}%`;
        node.wrap.style.bottom = `calc(${bottomFor(st.y)}% + ${bob}px)`;
        node.wrap.style.zIndex = String(Math.round(st.y * 1000) + 11);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [actors, S]);

  return (
    <>
      {actors.map((a) => (
        <div
          key={a.id}
          ref={(wrap) => {
            if (!wrap) return void nodes.current.delete(a.id);
            nodes.current.set(a.id, { wrap, sprite: wrap.querySelector('[data-sprite]') as HTMLDivElement });
          }}
          className="pointer-events-none absolute -translate-x-1/2"
          style={{ animation: 'pop-in .6s cubic-bezier(.2,.8,.2,1)' }}
        >
          {a.id === 'you' && focusing && (
            <span className="absolute bottom-full left-1/2 mb-1 -translate-x-1/2 whitespace-nowrap rounded-md bg-white px-1.5 py-0.5 font-display text-[11px] text-ink shadow">
              studying…
            </span>
          )}
          <div data-sprite className="pixelated bg-no-repeat" style={{ imageRendering: 'pixelated', filter: 'drop-shadow(0 3px 0 rgba(0,0,0,0.18))' }} />
        </div>
      ))}
    </>
  );
}

// --- Scenery -----------------------------------------------------------------

function Hills({ color, seed, base, amp, bottom }: { color: string; seed: number; base: number; amp: number; bottom: string }) {
  const path = useMemo(() => {
    const cols = 64;
    let d = 'M0 100 ';
    for (let i = 0; i <= cols; i++) {
      const t = i / cols;
      const h = base + amp * (Math.sin(t * 6.1 + seed) * 0.6 + Math.sin(t * 13.7 + seed * 2) * 0.3 + Math.sin(t * 2.3 + seed * 0.5) * 0.5);
      const y = Math.round(100 - h);
      d += `L${(i / cols) * 200} ${y} L${((i + 1) / cols) * 200} ${y} `;
    }
    return d + 'L200 100 Z';
  }, [seed, base, amp]);
  return (
    <svg className="absolute inset-x-0 h-[40vh] w-full transition-colors duration-[3000ms]" style={{ bottom }} viewBox="0 0 200 100" preserveAspectRatio="none" shapeRendering="crispEdges">
      <path d={path} fill={color} />
    </svg>
  );
}

function Stars({ opacity }: { opacity: number }) {
  const stars = useMemo(
    () => Array.from({ length: 60 }, (_, i) => ({ x: (i * 37.7) % 100, y: (i * 23.3) % 55, s: i % 5 === 0 ? 3 : 2, d: (i % 7) * 0.7 })),
    [],
  );
  if (opacity <= 0) return null;
  return (
    <div className="absolute inset-0 transition-opacity duration-[3000ms]" style={{ opacity }}>
      {stars.map((s, i) => (
        <span
          key={i}
          className="ll-motion absolute bg-white"
          style={{ left: `${s.x}%`, top: `${s.y}%`, width: s.s, height: s.s, animation: `twinkle ${3 + (i % 4)}s ${s.d}s ease-in-out infinite` }}
        />
      ))}
    </div>
  );
}

function Clouds({ tint }: { tint: string }) {
  const clouds = [
    { top: '9%', scale: 1.2, dur: 160, delay: -40 },
    { top: '18%', scale: 0.8, dur: 220, delay: -150 },
    { top: '5%', scale: 0.6, dur: 260, delay: -10 },
    { top: '24%', scale: 1, dur: 190, delay: -100 },
  ];
  return (
    <>
      {clouds.map((c, i) => (
        <div key={i} className="ll-motion absolute left-0" style={{ top: c.top, animation: `drift ${c.dur}s linear ${c.delay}s infinite` }}>
          <svg width={96 * c.scale} height={32 * c.scale} viewBox="0 0 24 8" shapeRendering="crispEdges" style={{ opacity: 0.85 }}>
            <path fill={tint} d="M4 4h2V2h4V0h6v2h2v2h4v2h2v2H0V6h4z" />
          </svg>
        </div>
      ))}
    </>
  );
}
