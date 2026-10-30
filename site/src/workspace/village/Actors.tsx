import { useLayoutEffect, useMemo, useRef } from 'react';
import type { Placed } from '../store';
import { decorById, type SheetAnim, type SpriteDef } from '../rewards';
import { bottomFor, clamp, depthScale } from './layout';

// The village residents (and your own character) run a small "social" AI:
// they wander, meet up and chat, play tag, visit your decorations, cheer you
// on while you study, and react when you click them.

export interface ActorSpec {
  id: string;
  name: string;
  sprite: SpriteDef;
}

type Task = 'idle' | 'wander' | 'meet' | 'chat' | 'chase' | 'flee' | 'visit' | 'enjoy' | 'cheer' | 'study';

interface ActorState {
  x: number;
  y: number;
  tx: number;
  ty: number;
  dir: 1 | -1;
  moving: boolean;
  task: Task;
  timer: number;
  partner: string | null;
  ready: boolean;
  /** Chat turn timing / visit re-emote timing. */
  next: number;
  tags: number;
  decor: string | null;
  emote: string | null;
  emoteUntil: number;
  hopUntil: number;
  t: number;
  anim: SheetAnim | null;
}

const YOU = 'you';
const CHAT = ['💬', '😊', '♪', '❤️', '😆', '❓', '💡', '✨', '🍪', '🌸'];
const BYE = ['👋', '❤️', '😊', '✨'];
const CHEER = ['📣', '✨', '💪', '❤️', '☕', '⭐'];
const PET = ['❤️', '😊', '✨', '♪', '💕'];
const DECOR_EMOTE: Record<string, string[]> = {
  flowers: ['🌸', '🌼'], mushrooms: ['🍄', '❓'], bush: ['🫐', '😋'], fence: ['🪵'], books: ['📖', '🤓'],
  lamp: ['💡'], bench: ['💤', '😌'], mailbox: ['✉️', '💌'], campfire: ['🔥', '🍢'], pond: ['🎣', '🐟'],
  pine: ['🌲'], tree: ['🍎', '😋'], well: ['✨', '🪙'], tent: ['⛺', '💤'], cottage: ['🏠', '☕'],
  cafe: ['☕', '🍰'], tower: ['🔮', '✨'],
};
const pick = <T,>(list: T[]) => list[Math.floor(Math.random() * list.length)];
const rand = (lo: number, hi: number) => lo + Math.random() * (hi - lo);
/** Depth units are much "shorter" than width units on screen. */
const DEPTH = 40;
const dist = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, (a.y - b.y) * DEPTH);

// Where everyone was standing, so moving between pages doesn't scatter the
// village (each page load is a fresh scene). Per tab, like the rest of a visit.
const SPOTS_KEY = 'learners-landing:spots';
type Spots = Record<string, { x: number; y: number; dir: 1 | -1 }>;
const loadSpots = (): Spots => {
  try {
    return JSON.parse(sessionStorage.getItem(SPOTS_KEY) ?? '{}');
  } catch {
    return {};
  }
};
const saveSpots = (states: Map<string, ActorState>) => {
  try {
    const spots: Spots = {};
    states.forEach((st, id) => (spots[id] = { x: st.x, y: st.y, dir: st.dir }));
    sessionStorage.setItem(SPOTS_KEY, JSON.stringify(spots));
  } catch {
    // Storage blocked: everyone just starts somewhere new.
  }
};

const sheetSize = (a: SheetAnim) => (a.src.includes('/characters/') ? [384, 128] : [a.frames * a.w, a.h]);

interface Props {
  actors: ActorSpec[];
  S: number;
  focusing: boolean;
  placed: Placed[];
  interactive: boolean;
}

export default function Actors({ actors, S, focusing, placed, interactive }: Props) {
  const nodes = useRef(new Map<string, { wrap: HTMLDivElement; sprite: HTMLDivElement; bubble: HTMLDivElement; shadow: HTMLSpanElement }>());
  const states = useRef(new Map<string, ActorState>());
  const live = useRef({ focusing, placed, clock: 0 });
  live.current.focusing = focusing;
  live.current.placed = placed;

  const specs = useMemo(() => new Map(actors.map((a) => [a.id, a])), [actors]);
  const spots = useRef<Spots | null>(null);
  spots.current ??= loadSpots();
  // Only residents who move in while you're watching get the pop-in entrance.
  const firstIds = useRef<Set<string> | null>(null);
  firstIds.current ??= new Set(actors.map((a) => a.id));

  const say = (st: ActorState, emote: string, dur = 1.8, hop = true) => {
    st.emote = emote;
    st.emoteUntil = live.current.clock + dur;
    if (hop) st.hopUntil = live.current.clock + 0.4;
  };
  const rest = (st: ActorState, lo = 2, hi = 6) => {
    st.task = 'idle';
    st.timer = rand(lo, hi);
    st.partner = null;
    st.decor = null;
    st.ready = false;
  };

  const pet = (id: string) => {
    const st = states.current.get(id);
    if (!st) return;
    say(st, pick(PET), 1.6);
    if (st.task === 'idle' || st.task === 'wander') rest(st, 1.5, 3);
  };

  // Layout effect + an immediate first frame, so nobody flashes in the corner before they're placed.
  useLayoutEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let raf = 0;
    let last = performance.now();
    const get = (id: string | null) => (id ? states.current.get(id) : undefined);

    const free = (id: string, st: ActorState) =>
      (st.task === 'idle' || st.task === 'wander') && !(id === YOU && live.current.focusing);

    const decide = (id: string, st: ActorState) => {
      const r = Math.random();
      const decor = live.current.placed;
      const others = [...states.current.entries()].filter(([oid, o]) => oid !== id && free(oid, o) && specs.has(oid));
      if (r < 0.34 && others.length) {
        // Meet a friend (prefer someone nearby) and chat.
        others.sort((a, b) => dist(st, a[1]) - dist(st, b[1]));
        const [oid, o] = others[Math.floor(Math.random() * Math.min(3, others.length))];
        const mx = clamp((st.x + o.x) / 2, 8, 92);
        const my = clamp((st.y + o.y) / 2, 0.15, 1);
        const left = st.x <= o.x;
        Object.assign(st, { task: 'meet', partner: oid, ready: false, timer: 14, tx: mx + (left ? -2.6 : 2.6), ty: my });
        Object.assign(o, { task: 'meet', partner: id, ready: false, timer: 14, tx: mx + (left ? 2.6 : -2.6), ty: my });
        say(st, '👋', 1.2, false);
      } else if (r < 0.62 && decor.length) {
        // Visit a decoration.
        const p = pick(decor);
        const d = decorById[p.itemId];
        if (!d) return rest(st);
        const half = ((d.w * S * depthScale(p.y)) / 2 / window.innerWidth) * 100;
        const sit = p.itemId === 'bench';
        const side = Math.random() < 0.5 ? -1 : 1;
        Object.assign(st, { task: 'visit', decor: p.uid, timer: 20, tx: clamp(sit ? p.x + rand(-half / 2, half / 2) : p.x + side * (half + 1.8), 3, 97), ty: clamp(p.y + 0.04, 0, 1) });
      } else if (r < 0.74 && live.current.focusing && id !== YOU) {
        const you = get(YOU);
        if (!you) return rest(st);
        Object.assign(st, { task: 'cheer', timer: 16, tx: clamp(you.x + (Math.random() < 0.5 ? -4 : 4), 3, 97), ty: clamp(you.y + 0.05, 0, 1) });
      } else {
        const sp = specs.get(id)!.sprite;
        Object.assign(st, { task: 'wander', tx: clamp(st.x + rand(-25, 25), 4, 96), ty: clamp(st.y + rand(-0.25, 0.25), sp.flying ? 0 : 0.15, 1) });
      }
    };

    const loop = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      const clock = (live.current.clock += dt);

      for (const spec of actors) {
        const node = nodes.current.get(spec.id);
        if (!node) continue;
        const sp = spec.sprite;
        let st = states.current.get(spec.id);
        if (!st) {
          const spot = spots.current![spec.id];
          const x = spot?.x ?? 10 + Math.random() * 80;
          const y = spot?.y ?? 0.25 + Math.random() * 0.7;
          st = { x, y, tx: x, ty: y, dir: spot?.dir ?? 1, moving: false, task: 'idle', timer: rand(0.5, 4), partner: null, ready: false, next: 0, tags: 0, decor: null, emote: null, emoteUntil: 0, hopUntil: 0, t: Math.random() * 10, anim: null };
          states.current.set(spec.id, st);
        }
        st.t += dt;
        st.timer -= dt;
        const partner = get(st.partner);
        const step = (mult = 1) => {
          const dd = dist(st!, { x: st!.tx, y: st!.ty });
          const s = (sp.speed ?? 2.5) * mult * dt;
          if (dd <= s || reduced) {
            st!.x = st!.tx;
            st!.y = st!.ty;
            st!.moving = false;
            return true;
          }
          const dx = st!.tx - st!.x;
          st!.x += (dx / dd) * s;
          st!.y += ((st!.ty - st!.y) * DEPTH * s) / dd / DEPTH;
          if (Math.abs(dx) > 0.05) st!.dir = dx > 0 ? 1 : -1;
          st!.moving = true;
          return false;
        };
        const face = (o?: { x: number }) => o && Math.abs(o.x - st!.x) > 0.3 && (st!.dir = o.x > st!.x ? 1 : -1);

        // Your character drops everything to study while a focus timer runs.
        if (spec.id === YOU && live.current.focusing && st.task !== 'study') {
          if (partner && partner.partner === YOU) rest(partner, 1, 3);
          Object.assign(st, { task: 'study', partner: null, tx: 50, ty: 0.62 });
        }

        switch (st.task) {
          case 'study':
            if (!live.current.focusing) rest(st, 1, 3);
            else if (step()) st.dir = 1;
            break;
          case 'idle':
            st.moving = false;
            if (st.timer <= 0 && !reduced) decide(spec.id, st);
            break;
          case 'wander':
            if (step()) rest(st);
            break;
          case 'meet': {
            if (!partner || partner.partner !== spec.id || (partner.task !== 'meet' && partner.task !== 'chat') || st.timer <= 0) {
              rest(st, 1, 3);
              break;
            }
            if (step()) {
              st.ready = true;
              face(partner);
              if (partner.ready && partner.task === 'meet') {
                const length = rand(4, 7);
                const first = Math.random() < 0.5;
                Object.assign(st, { task: 'chat', timer: length, next: clock + (first ? 0.2 : 1.1) });
                Object.assign(partner, { task: 'chat', timer: length, next: clock + (first ? 1.1 : 0.2) });
              }
            }
            break;
          }
          case 'chat': {
            st.moving = false;
            if (!partner || partner.partner !== spec.id) {
              rest(st);
              break;
            }
            face(partner);
            if (clock >= st.next) {
              say(st, pick(CHAT), 1.3);
              st.next = clock + rand(1.8, 2.8);
            }
            // The alphabetically-first friend decides what happens next.
            if (st.timer <= 0 && spec.id < st.partner!) {
              if (Math.random() < 0.4 && !reduced) {
                Object.assign(st, { task: 'chase', timer: rand(6, 9), tags: 0, next: clock + 0.9 });
                Object.assign(partner, { task: 'flee', timer: st.timer, tags: 0, tx: clamp(partner.x + (partner.x > st.x ? 1 : -1) * rand(10, 20), 3, 97), ty: clamp(partner.y + rand(-0.2, 0.2), 0.1, 1) });
                say(st, '😆', 1.2);
                say(partner, '❗', 1.2);
              } else {
                const bye = pick(BYE);
                say(st, bye);
                say(partner, pick(BYE));
                rest(st, 3, 7);
                rest(partner, 3, 7);
              }
            }
            break;
          }
          case 'flee':
            if (!partner || partner.task !== 'chase' || st.timer <= 0) {
              rest(st, 2, 5);
              break;
            }
            if (step(2)) {
              const away = st.x > partner.x ? 1 : -1;
              const nx = st.x + away * rand(8, 18);
              st.tx = nx < 4 || nx > 96 ? clamp(st.x - away * rand(10, 18), 4, 96) : nx;
              st.ty = clamp(st.y + rand(-0.25, 0.25), 0.1, 1);
            }
            break;
          case 'chase':
            if (!partner || partner.task !== 'flee') {
              rest(st, 2, 5);
              break;
            }
            if (clock < st.next) {
              st.moving = false; // head start for the runner
              face(partner);
              break;
            }
            st.tx = partner.x;
            st.ty = partner.y;
            step(2.1);
            if (dist(st, partner) < 2.2) {
              st.tags++;
              say(st, '🙌', 1.2);
              say(partner, '😆', 1.2);
              if (st.tags + partner.tags >= 3 || st.timer <= 0) {
                rest(st, 3, 6);
                rest(partner, 3, 6);
                say(st, '😊', 1.6);
              } else {
                // Tag! Swap roles.
                Object.assign(partner, { task: 'chase', timer: st.timer, next: clock + 1 });
                Object.assign(st, { task: 'flee', tx: clamp(st.x + (st.x > partner.x ? 1 : -1) * rand(10, 18), 4, 96), ty: st.y });
              }
            } else if (st.timer <= 0) {
              say(st, '😮‍💨', 1.4);
              rest(st, 2, 5);
              rest(partner, 2, 5);
            }
            break;
          case 'visit': {
            const target = live.current.placed.find((p) => p.uid === st!.decor);
            if (!target || st.timer <= 0) {
              rest(st);
              break;
            }
            if (step()) {
              face(target);
              st.task = 'enjoy';
              st.timer = rand(4, 9);
              st.next = clock + rand(2.5, 4);
              say(st, pick(DECOR_EMOTE[target.itemId] ?? ['✨']), 2);
              // Say hi to anyone already hanging out here.
              for (const [oid, o] of states.current) {
                if (oid !== spec.id && o.task === 'enjoy' && o.decor === st.decor) {
                  say(o, '👋', 1.4);
                  st.emote = '😊';
                }
              }
            }
            break;
          }
          case 'enjoy': {
            st.moving = false;
            const target = live.current.placed.find((p) => p.uid === st!.decor);
            if (!target || st.timer <= 0) {
              rest(st, 3, 7);
              break;
            }
            if (clock >= st.next) {
              if (Math.random() < 0.5) say(st, pick(DECOR_EMOTE[target.itemId] ?? ['✨']), 1.8, false);
              st.next = clock + rand(2.5, 4);
            }
            break;
          }
          case 'cheer': {
            const you = get(YOU);
            if (!you || !live.current.focusing || st.timer <= 0) {
              rest(st);
              break;
            }
            if (st.moving || dist(st, { x: st.tx, y: st.ty }) > 0.3) {
              if (step()) {
                face(you);
                say(st, pick(CHEER), 2);
                if (you.emoteUntil < clock) say(you, '❤️', 1.4, false);
                st.timer = Math.min(st.timer, rand(3, 5));
              }
            }
            break;
          }
        }

        // --- render ---
        const anim = st.moving ? sp.walk : sp.idle;
        const k = S * (sp.scale ?? 1) * depthScale(st.y);
        const [sw, sh] = sheetSize(anim);
        const foot = (sp.foot ?? 0) * k;
        const fpsMul = st.task === 'chase' || st.task === 'flee' ? 1.6 : 1;
        const frame = Math.floor(st.t * (anim.fps ?? 6) * fpsMul) % anim.frames;
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

        const hop = st.hopUntil > clock ? Math.abs(Math.sin((st.hopUntil - clock) * 15)) * 3 * S : 0;
        const fly = sp.flying ? Math.sin(st.t * 2.4) * 6 + 40 : 0;
        node.wrap.style.left = `${st.x}%`;
        node.wrap.style.bottom = `calc(${bottomFor(st.y)}% + ${fly + hop - foot}px)`;
        // Ground shadow stays on the grass and shrinks while hopping/flying.
        const lift = Math.min(0.55, (fly + hop) / 110);
        const shw = (sp.body ?? 16) * k * 1.05 * (1 - lift);
        const shadow = node.shadow.style;
        shadow.width = `${shw}px`;
        shadow.height = `${Math.max(5, shw * 0.3)}px`;
        shadow.bottom = `${foot - fly - hop}px`;
        shadow.opacity = String(1 - lift);
        node.wrap.style.zIndex = String(Math.round(st.y * 1000) + 11);

        const studying = st.task === 'study' && !st.moving;
        const text = st.emoteUntil > clock ? st.emote : studying ? 'studying…' : null;
        const b = node.bubble;
        if (b.textContent !== (text ?? '')) b.textContent = text ?? '';
        b.dataset.show = text ? '1' : '0';
        b.dataset.kind = text && /[a-z]/i.test(text) ? 'text' : 'emoji';
      }
      raf = requestAnimationFrame(loop);
    };
    loop(last);
    const save = () => saveSpots(states.current);
    window.addEventListener('pagehide', save);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('pagehide', save);
      save();
    };
  }, [actors, specs, S]);

  return (
    <>
      {actors.map((a) => (
        <div
          key={a.id}
          ref={(wrap) => {
            if (!wrap) return void nodes.current.delete(a.id);
            nodes.current.set(a.id, {
              wrap,
              sprite: wrap.querySelector('[data-sprite]') as HTMLDivElement,
              bubble: wrap.querySelector('[data-bubble]') as HTMLDivElement,
              shadow: wrap.querySelector('.ll-shadow') as HTMLSpanElement,
            });
          }}
          className={`group absolute -translate-x-1/2 ${interactive ? 'pointer-events-auto cursor-pointer' : 'pointer-events-none'}`}
          style={firstIds.current!.has(a.id) ? undefined : { animation: 'pop-in .6s cubic-bezier(.2,.8,.2,1)' }}
          onPointerDown={interactive ? () => pet(a.id) : undefined}
          title={interactive ? (a.id === YOU ? 'You' : `${a.name}: click to say hi`) : undefined}
        >
          <div data-bubble className="ll-bubble" />
          <span className="pointer-events-none absolute left-1/2 top-full -translate-x-1/2 whitespace-nowrap rounded bg-black/60 px-1.5 text-[10px] font-bold text-white opacity-0 transition-opacity group-hover:opacity-100">
            {a.id === YOU ? 'You' : a.name}
          </span>
          <span className="ll-shadow" style={{ left: '50%', zIndex: -1 }} />
          <div data-sprite className="ll-lit pixelated relative bg-no-repeat" style={{ imageRendering: 'pixelated' }} />
        </div>
      ))}
    </>
  );
}

export const ACTOR_STYLES = `
  .ll-bubble {
    position: absolute; bottom: calc(100% - 6px); left: 50%;
    transform: translate(-50%, 4px) scale(.6); opacity: 0;
    transition: opacity .15s, transform .15s;
    background: #fff; color: #2a1b3d; border: 2px solid #2a1b3d; border-radius: 6px;
    padding: 1px 5px; line-height: 1.3; white-space: nowrap; pointer-events: none;
    box-shadow: 0 2px 0 rgba(0,0,0,.2);
  }
  .ll-bubble::after {
    content: ''; position: absolute; left: 50%; top: 100%; transform: translateX(-50%);
    border: 5px solid transparent; border-top-color: #2a1b3d; border-bottom: 0;
  }
  .ll-bubble[data-show='1'] { opacity: 1; transform: translate(-50%, 0) scale(1); }
  .ll-bubble[data-kind='emoji'] { font-size: 16px; }
  .ll-bubble[data-kind='text'] { font-size: 11px; font-weight: 600; font-family: var(--font-sans); }
`;
