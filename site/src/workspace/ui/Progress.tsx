import { useState, type CSSProperties, type ReactNode } from 'react';
import { Check, ChevronLeft, ChevronRight, Flame, Lock } from 'lucide-react';
import { nextResident, streak, todayKey, useWorkspace } from '../store';
import { LANDSCAPES, landscapeFor, residentsInOrder } from '../rewards';

export const fmtMinutes = (m: number) => (m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m`);
/** Longer form for tooltips: "1 hr 25 min", "45 min", "No focus". */
const fmtFocus = (m: number) => {
  if (!m) return 'No focus';
  const h = Math.floor(m / 60);
  const r = Math.round(m % 60);
  return h ? `${h} hr${h > 1 ? 's' : ''}${r ? ` ${r} min` : ''}` : `${r} min`;
};

export default function Progress() {
  const minutes = useWorkspace((s) => s.totalFocusMinutes);
  const sessions = useWorkspace((s) => s.sessionsCompleted);
  const tasksDone = useWorkspace((s) => s.tasksCompleted);
  const history = useWorkspace((s) => s.history);
  const landscape = useWorkspace((s) => landscapeFor(s.settings.landscape, s.totalFocusMinutes));
  const update = useWorkspace((s) => s.updateSettings);
  const order = useWorkspace((s) => s.residentOrder);
  const residents = residentsInOrder(order);
  const next = nextResident(minutes, order);
  const prevAt = [...residents].reverse().find((r) => r.unlockAt <= minutes)?.unlockAt ?? 0;
  const pct = next ? ((minutes - prevAt) / (next.unlockAt - prevAt)) * 100 : 100;

  const week = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return {
      label: d.toLocaleDateString(undefined, { weekday: 'narrow' }),
      day: i === 6 ? 'Today' : d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' }),
      m: history[todayKey(d)] ?? 0,
    };
  });
  const max = Math.max(60, ...week.map((w) => w.m));

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-2 text-center">
        <Stat label="Today" value={fmtMinutes(history[todayKey()] ?? 0)} />
        <Stat label="Streak" value={<span className="inline-flex items-center gap-1"><Flame size={15} className="text-orange-300" />{streak(history)}d</span>} />
        <Stat label="Total focus" value={fmtMinutes(minutes)} />
        <Stat label="Sessions · tasks" value={`${sessions} · ${tasksDone}`} />
      </div>

      <div>
        <p className="mb-2 text-xs uppercase tracking-wider text-white/40">Last 7 days</p>
        <div className="flex h-20 items-end gap-1.5">
          {week.map((w, i) => (
            // The whole column is the hover target, so short (or empty) days are easy to point at.
            <div key={i} tabIndex={0} aria-label={`${w.day}: ${fmtFocus(w.m)}`} className="group relative flex h-full flex-1 flex-col items-center justify-end gap-1 outline-none">
              <div
                className="w-full rounded-t bg-gradient-to-t from-plum to-purple-300 transition group-hover:brightness-125 group-focus-visible:brightness-125"
                style={{ height: `${(w.m / max) * 64}px`, minHeight: w.m ? 3 : 0 }}
              />
              <span className="text-[10px] text-white/40 group-hover:text-white/80">{w.label}</span>
              <Tip className={i < 2 ? 'left-0' : i > 4 ? 'right-0' : 'left-1/2 -translate-x-1/2'} style={{ bottom: `${Math.max(w.m ? 3 : 0, (w.m / max) * 64) + 22}px` }}>
                <span className="block text-white/55">{w.day}</span>
                <strong>{fmtFocus(w.m)}</strong>
              </Tip>
            </div>
          ))}
        </div>
      </div>

      <MonthHeatmap history={history} />

      {next && (
        <div className="rounded-xl border border-white/10 bg-white/5 p-3">
          <p className="text-xs text-white/60">
            Next resident in <strong className="text-white">{fmtMinutes(next.unlockAt - minutes)}</strong> of focus
          </p>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-gradient-to-r from-green-300 to-honey" style={{ width: `${pct}%` }} />
          </div>
        </div>
      )}

      <div>
        <p className="mb-2 text-xs uppercase tracking-wider text-white/40">Scenery</p>
        <ul className="space-y-1.5">
          {LANDSCAPES.map((l) => {
            const unlocked = minutes >= l.unlockAt;
            const current = landscape === l.id;
            return (
              <li key={l.id}>
                <button
                  disabled={!unlocked}
                  onClick={() => update({ landscape: l.id })}
                  aria-pressed={current}
                  className={`flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left transition ${
                    current ? 'border-plum bg-plum/30' : unlocked ? 'border-white/10 bg-white/5 hover:bg-white/10' : 'cursor-not-allowed border-white/5 bg-black/20'
                  }`}
                >
                  <span className={`text-xl ${unlocked ? '' : 'opacity-40 grayscale'}`} aria-hidden>{l.icon}</span>
                  <span className="min-w-0 flex-1">
                    <span className={`block text-sm font-semibold ${unlocked ? '' : 'text-white/50'}`}>{l.name}</span>
                    <span className="block truncate text-[11px] text-white/45">{unlocked ? l.desc : `Unlocks at ${fmtMinutes(l.unlockAt)} of focus`}</span>
                  </span>
                  {current ? <Check size={16} className="text-honey" /> : !unlocked && <Lock size={14} className="text-white/40" />}
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      <div>
        <p className="mb-2 text-xs uppercase tracking-wider text-white/40">Village residents</p>
        <ul className="grid grid-cols-3 gap-2">
          {residents.map((r) => {
            const unlocked = minutes >= r.unlockAt;
            const a = r.sprite.idle;
            // Zoom in on the art itself (frames have empty space around it) so every icon is a similar size.
            const [bx, by, bw, bh] = r.sprite.box ?? [0, 0, a.w, a.h];
            const k = 40 / Math.max(bw, bh);
            return (
              <li key={r.id} className={`flex flex-col items-center rounded-lg border p-2 text-center ${unlocked ? 'border-white/15 bg-white/10' : 'border-white/5 bg-black/20'}`}>
                <div className="relative flex h-12 w-12 items-center justify-center">
                  <div
                    className="pixelated"
                    style={{
                      width: bw * k,
                      height: bh * k,
                      backgroundImage: `url(${a.src})`,
                      backgroundSize: `${a.frames * a.w * k}px ${a.h * (a.rows ?? 1) * k}px`,
                      backgroundPosition: `${-bx * k}px ${-by * k}px`,
                      imageRendering: 'pixelated',
                      filter: unlocked ? undefined : 'brightness(0) opacity(0.35)',
                    }}
                  />
                  {!unlocked && <Lock size={14} className="absolute text-white/50" />}
                </div>
                <span className="mt-1 text-[11px] font-bold leading-tight">{unlocked ? r.name : '???'}</span>
                <span className="text-[10px] text-white/40">{unlocked ? r.species : fmtMinutes(r.unlockAt)}</span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

function Tip({ children, className = '', style }: { children: ReactNode; className?: string; style?: CSSProperties }) {
  return (
    <span
      role="tooltip"
      className={`pointer-events-none absolute z-20 whitespace-nowrap rounded-md border border-white/15 bg-black/85 px-2 py-1 text-center text-[11px] leading-tight opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100 ${className}`}
      style={style}
    >
      {children}
    </span>
  );
}

/** Colour steps for the heatmap, by minutes focused that day. */
const LEVELS = [
  { min: 0, cls: 'bg-white/[0.06]' },
  { min: 1, cls: 'bg-purple-900' },
  { min: 30, cls: 'bg-plum' },
  { min: 90, cls: 'bg-purple-400' },
  { min: 180, cls: 'bg-purple-200' },
];
const levelFor = (m: number) => [...LEVELS].reverse().find((l) => m >= l.min)!.cls;

/** A small calendar of one month, each day shaded by how long you focused. */
function MonthHeatmap({ history }: { history: Record<string, number> }) {
  const now = new Date();
  // Months back from the current one (0 = this month).
  const [back, setBack] = useState(0);
  const first = new Date(now.getFullYear(), now.getMonth() - back, 1);
  const daysIn = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  // Weeks start on Monday.
  const lead = (first.getDay() + 6) % 7;
  const days = Array.from({ length: daysIn }, (_, i) => {
    const d = new Date(first.getFullYear(), first.getMonth(), i + 1);
    return { n: i + 1, d, m: history[todayKey(d)] ?? 0, future: d > now };
  });
  const focused = days.filter((d) => d.m > 0);
  const total = focused.reduce((a, d) => a + d.m, 0);
  const best = focused.reduce((a, d) => (d.m > a.m ? d : a), { n: 0, m: 0 } as { n: number; m: number });
  // Only offer months back to the first one with any history (and at least the previous month).
  const earliest = Object.keys(history).filter((k) => history[k] > 0).sort()[0];
  const oldest = earliest ? (now.getFullYear() - +earliest.slice(0, 4)) * 12 + now.getMonth() - (+earliest.slice(5, 7) - 1) : 0;
  const canBack = back < Math.max(1, oldest);
  const todayK = todayKey(now);

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs uppercase tracking-wider text-white/40">Focus calendar</p>
        <div className="flex items-center gap-0.5 text-xs text-white/60">
          <button aria-label="Previous month" disabled={!canBack} onClick={() => setBack(back + 1)} className="rounded p-0.5 hover:bg-white/10 disabled:opacity-30">
            <ChevronLeft size={14} />
          </button>
          <span className="w-[4.5rem] text-center tabular-nums">{first.toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}</span>
          <button aria-label="Next month" disabled={back === 0} onClick={() => setBack(back - 1)} className="rounded p-0.5 hover:bg-white/10 disabled:opacity-30">
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
      <div className="flex items-start gap-3">
        <div className="grid shrink-0 grid-cols-7 gap-[3px]">
          {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((l, i) => (
            <span key={i} className="h-3 w-5 text-center text-[9px] leading-3 text-white/30">{l}</span>
          ))}
          {Array.from({ length: lead }, (_, i) => <span key={`pad${i}`} />)}
          {days.map((d) => {
            const col = (lead + d.n - 1) % 7;
            return (
              <span
                key={d.n}
                tabIndex={d.future ? -1 : 0}
                aria-label={`${d.d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}: ${fmtFocus(d.m)}`}
                className={`group relative h-5 w-5 rounded-[4px] outline-none ${d.future ? 'bg-white/[0.02]' : levelFor(d.m)} ${todayKey(d.d) === todayK ? 'ring-1 ring-honey' : ''} focus-visible:ring-1 focus-visible:ring-white`}
              >
                {!d.future && (
                  <Tip className={`bottom-[calc(100%+4px)] ${col < 2 ? 'left-0' : col > 4 ? 'right-0' : 'left-1/2 -translate-x-1/2'}`}>
                    <span className="block text-white/55">{d.d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })}</span>
                    <strong>{fmtFocus(d.m)}</strong>
                  </Tip>
                )}
              </span>
            );
          })}
        </div>
        <dl className="min-w-0 flex-1 space-y-1.5 pt-4 text-[11px] leading-tight">
          <div>
            <dt className="text-white/40">Days focused</dt>
            <dd className="font-semibold">{focused.length} / {back === 0 ? now.getDate() : daysIn}</dd>
          </div>
          <div>
            <dt className="text-white/40">Total</dt>
            <dd className="font-semibold">{fmtMinutes(total)}</dd>
          </div>
          <div>
            <dt className="text-white/40">Best day</dt>
            <dd className="font-semibold">{best.m ? `${fmtMinutes(best.m)} · ${best.n}${['th', 'st', 'nd', 'rd'][best.n % 10 > 3 || [11, 12, 13].includes(best.n) ? 0 : best.n % 10]}` : '–'}</dd>
          </div>
        </dl>
      </div>
      <div className="mt-2 flex items-center gap-1 text-[9px] text-white/35">
        Less
        {LEVELS.map((l) => <span key={l.min} className={`h-2.5 w-2.5 rounded-[2px] ${l.cls}`} />)}
        More
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-2.5">
      <p className="font-display text-lg font-semibold">{value}</p>
      <p className="text-[10px] uppercase tracking-wider text-white/40">{label}</p>
    </div>
  );
}
