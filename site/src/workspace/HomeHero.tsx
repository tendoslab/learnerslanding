import type { ReactNode } from 'react';
import { ArrowRight, Flame, Pause, Play } from 'lucide-react';
import { nextResident, streak, todayKey, unlockedResidents, useWorkspace } from './store';
import Village from './village/Village';
import { formatTime, useRemaining } from './ui/Timer';
import { fmtMinutes } from './ui/Progress';
import { withBase } from '../lib/base';

// The home page hero: the same village scene as the workspace, with a card that
// changes depending on whether you're new, coming back, or mid-session.
export default function HomeHero({ children }: { children?: ReactNode }) {
  const timer = useWorkspace((s) => s.timer);
  const settings = useWorkspace((s) => s.settings);
  const minutes = useWorkspace((s) => s.totalFocusMinutes);
  const sessions = useWorkspace((s) => s.sessionsCompleted);
  const coins = useWorkspace((s) => s.coins);
  const history = useWorkspace((s) => s.history);
  const placed = useWorkspace((s) => s.placed.length);
  const upNext = useWorkspace((s) => s.tasks.find((t) => !t.completed));
  const activeTask = useWorkspace((s) => s.tasks.find((t) => t.id === s.activeTaskId));
  const left = useRemaining();

  const total = (timer.mode === 'focus' ? settings.focus : timer.mode === 'short' ? settings.short : settings.long) * 60_000;
  const inSession = timer.running || left < total;
  const returning = inSession || sessions > 0 || minutes > 0 || placed > 0;
  const next = nextResident(minutes);
  const residents = unlockedResidents(minutes).length;

  return (
    <section className="relative isolate h-[calc(100svh-3.75rem)] min-h-[34rem] overflow-hidden bg-[#2a1b3d] text-white">
      <Village buildMode={false} placing={null} onPlaced={() => {}} focusing={timer.running && timer.mode === 'focus'} raining={false} />

      <div className="relative z-10 flex justify-center px-4 pt-[6vh] sm:pt-[9vh]">
        <div className="w-full max-w-xl rounded-[2rem] border border-white/15 bg-black/35 p-6 text-center shadow-[0_8px_32px_rgba(0,0,0,0.35)] backdrop-blur-xl sm:p-8">
          {inSession ? (
            <>
              <p className="text-sm font-medium text-honey">{timer.running ? (timer.mode === 'focus' ? 'Focus session in progress' : 'On a break') : 'Session paused'}</p>
              <p className="mt-2 text-[4.5rem] font-medium leading-none tracking-tight tabular-nums sm:text-[5.5rem]">{formatTime(left)}</p>
              {activeTask && (
                <p className="mx-auto mt-3 max-w-sm truncate text-sm text-white/70">
                  Working on <strong className="font-semibold text-white">{activeTask.title}</strong>
                </p>
              )}
              <a href={withBase('/workspace')} className="btn-pixel mt-6 bg-honey text-ink">
                {timer.running ? <Play size={18} fill="currentColor" /> : <Pause size={18} />} Back to your session
              </a>
            </>
          ) : returning ? (
            <>
              <p className="text-sm font-medium text-honey">Welcome back</p>
              <h1 className="mt-2 font-display text-3xl font-semibold leading-tight sm:text-4xl">Your village missed you.</h1>
              <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
                <Stat label="Today" value={fmtMinutes(history[todayKey()] ?? 0)} />
                <Stat label="Streak" value={<span className="inline-flex items-center gap-1"><Flame size={15} className="text-orange-300" />{streak(history)}d</span>} />
                <Stat label="Coins" value={`🪙 ${coins}`} />
                <Stat label="Residents" value={residents} />
              </div>
              <p className="mt-4 text-sm text-white/70">
                {upNext ? (
                  <>
                    Up next: <strong className="font-semibold text-white">{upNext.title}</strong>
                  </>
                ) : next ? (
                  <>
                    {fmtMinutes(next.unlockAt - minutes)} more focus until a new resident moves in.
                  </>
                ) : (
                  'Every resident has moved in. Your village is complete!'
                )}
              </p>
              <a href={withBase('/workspace')} className="btn-pixel mt-6 bg-honey text-ink">
                Continue studying <ArrowRight size={18} />
              </a>
            </>
          ) : (
            children
          )}
        </div>
      </div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 px-2 py-2.5">
      <p className="text-lg font-semibold tabular-nums">{value}</p>
      <p className="text-[10px] uppercase tracking-wider text-white/50">{label}</p>
    </div>
  );
}
