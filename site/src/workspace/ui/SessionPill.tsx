import { useEffect, useRef, useState } from 'react';
import { Pause } from 'lucide-react';
import { remainingMs, useWorkspace } from '../store';
import { chime } from '../audio';
import { startTicker } from '../ticker';
import { formatTime } from './Timer';
import { withBase } from '../../lib/base';

// Shown in the site header on content pages. It keeps a running workspace
// session ticking (coins, chime, notification) while you read an article, and
// links back to the workspace.
export default function SessionPill() {
  const timer = useWorkspace((s) => s.timer);
  const settings = useWorkspace((s) => s.settings);
  const lastEvent = useWorkspace((s) => s.lastEvent);
  const [now, setNow] = useState(() => Date.now());
  const [done, setDone] = useState<string | null>(null);
  const pageTitle = useRef('');

  useEffect(() => {
    pageTitle.current = document.title;
    return startTicker(() => {
      useWorkspace.getState().tick();
      setNow(Date.now());
    });
  }, []);

  const left = remainingMs(timer, now);
  const total = (timer.mode === 'focus' ? settings.focus : timer.mode === 'short' ? settings.short : settings.long) * 60_000;
  const label = timer.mode === 'focus' ? 'Focus' : 'Break';
  const visible = timer.running || left < total;

  useEffect(() => {
    document.title = timer.running ? `${formatTime(left)} · ${label} | ${pageTitle.current}` : pageTitle.current;
  }, [timer.running, Math.ceil(left / 1000)]);

  useEffect(() => {
    if (!lastEvent || lastEvent.kind === 'task' || Date.now() - lastEvent.id > 5000) return;
    const text = lastEvent.kind === 'focus' ? `Session done! +${lastEvent.coins} coins` : 'Break over';
    setDone(text);
    if (settings.chime) chime();
    if (settings.notify && document.hidden && 'Notification' in window && Notification.permission === 'granted') {
      new Notification(lastEvent.kind === 'focus' ? 'Focus session complete! 🎉' : 'Break is over ⏰', {
        body: lastEvent.kind === 'focus' ? `+${lastEvent.coins} coins. Time for a break.` : 'Ready for another round?',
        icon: withBase('/favicon.svg'),
        tag: 'learners-landing-timer',
      });
    }
    const id = setTimeout(() => setDone(null), 10_000);
    return () => clearTimeout(id);
  }, [lastEvent?.id]);

  if (!visible && !done) return null;

  return (
    <a
      href={withBase('/workspace')}
      title="Back to your study session"
      className={`flex items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1.5 text-sm font-semibold tabular-nums transition ${
        done ? 'border-honey/60 bg-honey/20 text-ink' : timer.running ? 'border-plum/30 bg-plum/10 text-plum-dark hover:bg-plum/15' : 'border-line bg-paper text-ink/70 hover:text-ink'
      }`}
    >
      {done ? (
        <span>🎉 {done}</span>
      ) : (
        <>
          {timer.running ? (
            <span className={`h-2 w-2 rounded-full ${timer.mode === 'focus' ? 'bg-plum' : 'bg-moss'} animate-pulse`} />
          ) : (
            <Pause size={13} className="opacity-70" />
          )}
          <span className="hidden sm:inline">{timer.running ? label : 'Paused'}</span>
          <span>{formatTime(left)}</span>
        </>
      )}
    </a>
  );
}
