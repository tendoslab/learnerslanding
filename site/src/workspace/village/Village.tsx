import { useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent as RPointerEvent } from 'react';
import { FlipHorizontal2, PackageOpen } from 'lucide-react';
import { useWorkspace, unlockedResidents, type Placed } from '../store';
import { avatarSprite, decorById } from '../rewards';
import { skyFor, type Sky } from './sky';
import { FIELD_DEPTH, FIELD_FRONT, GROUND_HEIGHT, bottomFor, clamp, depthScale } from './layout';
import { Ambient, Backdrop, GroundDetail, SCENERY_KEYFRAMES } from './Scenery';
import Actors, { ACTOR_STYLES, type ActorSpec } from './Actors';

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
  raining: boolean;
}

export default function Village({ buildMode, placing, onPlaced, focusing, raining }: Props) {
  const sky = useSky();
  const S = usePixelScale();
  const placed = useWorkspace((s) => s.placed);
  const minutes = useWorkspace((s) => s.totalFocusMinutes);
  const avatar = useWorkspace((s) => s.settings.avatar);
  const place = useWorkspace((s) => s.place);
  const hasInventory = useWorkspace((s) => Object.values(s.inventory).some((n) => n > 0));
  const bandRef = useRef<HTMLDivElement>(null);
  const [selected, setSelected] = useState<string | null>(null);

  const actors = useMemo<ActorSpec[]>(
    () => [{ id: 'you', name: 'You', sprite: avatarSprite(avatar) }, ...unlockedResidents(minutes).map((r) => ({ id: r.id, name: r.name, sprite: r.sprite }))],
    [minutes, avatar],
  );
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
    <div
      className="absolute inset-0 isolate overflow-hidden select-none"
      style={
        {
          background: sky.skyBottom,
          '--light': raining ? `${sky.light} brightness(.88) saturate(.85)` : sky.light,
          '--emissive': raining ? `${sky.emissive} brightness(.92)` : sky.emissive,
          '--sh-op': raining ? sky.shadow.opacity * 0.5 : sky.shadow.opacity,
          '--sh-stretch': raining ? 1 : sky.shadow.stretch,
          '--sh-shift': `${raining ? 0 : sky.shadow.shift}%`,
        } as CSSProperties
      }
      aria-hidden={!buildMode}
    >
      <Backdrop sky={sky} raining={raining} />

      {/* Ground band: decorations + residents */}
      <div
        ref={bandRef}
        onPointerDown={onFieldClick}
        className="absolute inset-x-0 bottom-0"
        style={{
          height: GROUND_HEIGHT,
          background: `linear-gradient(to bottom, ${sky.grassDark}, ${sky.grassTop} 12%, ${sky.grassBottom})`,
          transition: 'background 3s',
          pointerEvents: buildMode ? 'auto' : 'none',
          cursor: buildMode && placing ? 'copy' : 'default',
        }}
      >
        <GroundDetail sky={sky} />
        {buildMode && (
          <div className="pointer-events-none absolute inset-x-0 border-y-2 border-dashed border-white/30" style={{ bottom: `${FIELD_FRONT}%`, height: `${FIELD_DEPTH}%` }} />
        )}

        {placed.map((p) => {
          const d = decorById[p.itemId];
          if (!d) return null;
          const w = d.w * S * depthScale(p.y) * (p.itemId === 'pond' ? 1.05 : 0.95);
          return <span key={`sh-${p.uid}`} className="ll-shadow" style={{ left: `${p.x}%`, bottom: `${bottomFor(p.y)}%`, width: w, height: Math.max(8, w * 0.22) }} />;
        })}

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

        <Actors actors={actors} S={S} focusing={focusing} placed={placed} interactive={!buildMode} />

        {placed.length === 0 && !buildMode && (
          <p className="absolute inset-x-0 top-[38%] text-center font-display text-sm text-white/60">
            {hasInventory
              ? 'You have decorations to place! Press the hammer (top right) to start building.'
              : 'Your village is waiting. Finish focus sessions to earn coins and decorate it!'}
          </p>
        )}
      </div>

      {/* Moonlight / sunset wash over the ground; light sources glow on top of it */}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 transition-opacity duration-[3000ms]"
        style={{ height: GROUND_HEIGHT, background: sky.wash, mixBlendMode: 'multiply', opacity: sky.washOpacity }}
      />
      {night && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0" style={{ height: GROUND_HEIGHT }}>
          {placed.map((p) => {
            const d = decorById[p.itemId];
            if (!d?.glow) return null;
            const size = d.h * S * depthScale(p.y) * 1.8;
            const pool = Math.max(d.w * 3.2, 60) * S * depthScale(p.y);
            return [
              <div
                key={`pool-${p.uid}`}
                style={{
                  position: 'absolute',
                  left: `${p.x}%`,
                  bottom: `${bottomFor(p.y)}%`,
                  width: pool,
                  height: pool * 0.28,
                  transform: 'translate(-50%, 50%)',
                  background: 'radial-gradient(ellipse, rgba(255,196,110,0.42) 0%, rgba(255,170,90,0.14) 45%, transparent 70%)',
                  mixBlendMode: 'screen',
                }}
              />,
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
              />,
            ];
          })}
        </div>
      )}

      <Ambient sky={sky} raining={raining} />

      <style>{`
        @keyframes flicker { 0%,100% { opacity: .85; transform: translate(-50%,50%) scale(1); } 50% { opacity: 1; transform: translate(-50%,50%) scale(1.08); } }
        @keyframes pop-in { 0% { transform: translate(-50%, -14px) scale(.6); opacity: 0; } 70% { transform: translate(-50%, 2px) scale(1.05); opacity: 1; } 100% { transform: translate(-50%, 0) scale(1); } }
        ${SCENERY_KEYFRAMES}
        ${ACTOR_STYLES}
        .ll-lit { filter: var(--light); transition: filter 3s; }
        .ll-shadow {
          position: absolute; pointer-events: none; z-index: 5; border-radius: 50%;
          background: radial-gradient(ellipse at center, rgba(22,16,40,var(--sh-op)) 0%, rgba(22,16,40,calc(var(--sh-op) * .6)) 45%, transparent 72%);
          transform: translate(calc(-50% + var(--sh-shift)), 50%) scaleX(var(--sh-stretch));
          transition: transform 3s;
        }
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
            filter: `${d.glow ? 'var(--emissive)' : 'var(--light)'}${selected ? ' drop-shadow(0 0 3px #fff) drop-shadow(0 0 2px #fff)' : ''}`,
            transition: 'filter 3s',
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
