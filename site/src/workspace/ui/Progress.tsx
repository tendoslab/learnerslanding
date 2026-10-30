import type { ReactNode } from 'react';
import { Check, Flame, Lock } from 'lucide-react';
import { nextResident, streak, todayKey, useWorkspace } from '../store';
import { LANDSCAPES, RESIDENTS, landscapeFor } from '../rewards';

export const fmtMinutes = (m: number) => (m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m`);

export default function Progress() {
  const minutes = useWorkspace((s) => s.totalFocusMinutes);
  const sessions = useWorkspace((s) => s.sessionsCompleted);
  const tasksDone = useWorkspace((s) => s.tasksCompleted);
  const history = useWorkspace((s) => s.history);
  const landscape = useWorkspace((s) => landscapeFor(s.settings.landscape, s.totalFocusMinutes));
  const update = useWorkspace((s) => s.updateSettings);
  const next = nextResident(minutes);
  const prevAt = [...RESIDENTS].reverse().find((r) => r.unlockAt <= minutes)?.unlockAt ?? 0;
  const pct = next ? ((minutes - prevAt) / (next.unlockAt - prevAt)) * 100 : 100;

  const week = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return { label: d.toLocaleDateString(undefined, { weekday: 'narrow' }), m: history[todayKey(d)] ?? 0 };
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
            <div key={i} className="flex flex-1 flex-col items-center gap-1">
              <div className="w-full rounded-t bg-gradient-to-t from-plum to-purple-300" style={{ height: `${(w.m / max) * 64}px`, minHeight: w.m ? 3 : 0 }} title={`${w.m} min`} />
              <span className="text-[10px] text-white/40">{w.label}</span>
            </div>
          ))}
        </div>
      </div>

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
          {RESIDENTS.map((r) => {
            const unlocked = minutes >= r.unlockAt;
            const a = r.sprite.idle;
            const k = 48 / Math.max(a.w, a.h);
            return (
              <li key={r.id} className={`flex flex-col items-center rounded-lg border p-2 text-center ${unlocked ? 'border-white/15 bg-white/10' : 'border-white/5 bg-black/20'}`}>
                <div className="relative flex h-12 w-12 items-center justify-center">
                  <div
                    className="pixelated"
                    style={{
                      width: a.w * k,
                      height: a.h * k,
                      backgroundImage: `url(${a.src})`,
                      backgroundSize: `${a.frames * a.w * k}px ${a.h * k}px`,
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

function Stat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-2.5">
      <p className="font-display text-lg font-semibold">{value}</p>
      <p className="text-[10px] uppercase tracking-wider text-white/40">{label}</p>
    </div>
  );
}
