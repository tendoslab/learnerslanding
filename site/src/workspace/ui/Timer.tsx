import { useEffect, useState } from 'react';
import { Pause, Play, RotateCcw, SkipForward } from 'lucide-react';
import { remainingMs, useWorkspace, type Mode } from '../store';

export const formatTime = (ms: number) => {
  const total = Math.ceil(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

export const useRemaining = () => {
  const timer = useWorkspace((s) => s.timer);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!timer.running) return;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [timer.running]);
  return remainingMs(timer, now);
};

const MODES: { id: Mode; label: string }[] = [
  { id: 'focus', label: 'Focus' },
  { id: 'short', label: 'Short break' },
  { id: 'long', label: 'Long break' },
];

const ENCOURAGEMENT = ["You've got this!", 'One step at a time.', 'Deep breath, then begin.', 'Small sessions add up.', 'Future you says thanks.'];

export default function Timer({ compact = false }: { compact?: boolean }) {
  const timer = useWorkspace((s) => s.timer);
  const settings = useWorkspace((s) => s.settings);
  const activeTask = useWorkspace((s) => s.tasks.find((t) => t.id === s.activeTaskId));
  const { start, pause, reset, skip, setMode } = useWorkspace.getState();
  const remaining = useRemaining();
  const [quote] = useState(() => ENCOURAGEMENT[Math.floor(Math.random() * ENCOURAGEMENT.length)]);

  const total = (timer.mode === 'focus' ? settings.focus : timer.mode === 'short' ? settings.short : settings.long) * 60_000;
  const progress = 1 - remaining / total;
  const dots = Array.from({ length: settings.longEvery }, (_, i) => i < timer.cycle % settings.longEvery);

  return (
    <div className={`flex w-full max-w-md flex-col items-center rounded-[2rem] border border-white/15 bg-black/35 text-white shadow-[0_8px_32px_rgba(0,0,0,0.35)] backdrop-blur-xl ${compact ? 'p-5' : 'p-6 sm:p-8'}`}>
      <div role="tablist" aria-label="Timer mode" className="mb-5 flex gap-1 rounded-full border border-white/10 bg-black/30 p-1">
        {MODES.map((m) => (
          <button
            key={m.id}
            role="tab"
            aria-selected={timer.mode === m.id}
            onClick={() => setMode(m.id)}
            className={`rounded-full px-3 py-1.5 text-xs font-bold transition-colors sm:px-4 sm:text-sm ${
              timer.mode === m.id ? 'bg-plum text-white shadow-[0_0_12px_rgba(140,90,230,0.5)]' : 'text-white/70 hover:text-white'
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      <p className="h-5 text-sm italic text-honey">{timer.mode === 'focus' ? quote : 'Stretch, sip some water, look out a window.'}</p>

      <div className="relative my-2 font-display text-[5rem] font-semibold leading-none tabular-nums drop-shadow-[0_4px_0_rgba(0,0,0,0.35)] sm:text-[6.5rem]" aria-live="off">
        {formatTime(remaining)}
      </div>

      <div className="mb-5 h-2.5 w-full overflow-hidden rounded-full bg-white/10" aria-hidden>
        <div className="h-full rounded-full bg-gradient-to-r from-honey to-plum transition-[width] duration-300" style={{ width: `${Math.max(0, Math.min(1, progress)) * 100}%` }} />
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={timer.running ? pause : start}
          className="flex items-center gap-2 rounded-full bg-white px-9 py-3 text-lg font-extrabold text-ink shadow-[0_4px_0_rgba(0,0,0,0.3)] transition active:translate-y-0.5 active:shadow-none"
        >
          {timer.running ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />}
          {timer.running ? 'Pause' : 'Start'}
        </button>
        <button onClick={reset} title="Reset" className="rounded-full border border-white/15 bg-white/10 p-3 transition hover:bg-white/20">
          <RotateCcw size={20} />
        </button>
        <button onClick={skip} title="Skip to next (no reward)" className="rounded-full border border-white/15 bg-white/10 p-3 transition hover:bg-white/20">
          <SkipForward size={20} />
        </button>
      </div>

      <div className="mt-5 flex items-center gap-3 text-xs text-white/70">
        <span className="flex gap-1" title="Sessions until long break">
          {dots.map((done, i) => (
            <span key={i} className={`h-2.5 w-2.5 rounded-sm ${done ? 'bg-honey' : 'bg-white/20'}`} />
          ))}
        </span>
        {activeTask ? (
          <span className="max-w-[16rem] truncate">
            Focusing on <strong className="text-white">{activeTask.title}</strong>
          </span>
        ) : (
          <span>Pick a task in the sidebar to track time on it.</span>
        )}
      </div>
    </div>
  );
}
