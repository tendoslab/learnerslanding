import { useEffect, useState, type ReactNode } from 'react';
import {
  BarChart3,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  CloudRain,
  FileText,
  Hammer,
  Home,
  Maximize,
  Music,
  Settings,
  ShoppingBag,
} from 'lucide-react';
import { remainingMs, useWorkspace } from './store';
import { decorById } from './rewards';
import { chime, primeAudio, setRain } from './audio';
import { setFaviconProgress, startTicker } from './ticker';
import Village from './village/Village';
import Timer, { formatTime } from './ui/Timer';
import Tasks from './ui/Tasks';
import Shop from './ui/Shop';
import Progress from './ui/Progress';
import VideoPlayer from './ui/VideoPlayer';
import SettingsModal from './ui/SettingsModal';

type Tab = 'tasks' | 'shop' | 'village' | 'notes';

interface Toast {
  id: number;
  text: string;
}

export default function App() {
  const coins = useWorkspace((s) => s.coins);
  const timer = useWorkspace((s) => s.timer);
  const lastEvent = useWorkspace((s) => s.lastEvent);
  const chimeOn = useWorkspace((s) => s.settings.chime);
  const inventory = useWorkspace((s) => s.inventory);
  const notes = useWorkspace((s) => s.notes);

  const [tab, setTab] = useState<Tab>('tasks');
  const [sidebar, setSidebar] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [playerOpen, setPlayerOpen] = useState(false);
  const [rain, setRainOn] = useState(false);
  const [build, setBuild] = useState(false);
  const [placing, setPlacing] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const focusing = timer.running && timer.mode === 'focus';

  // Open the sidebar by default on wide screens.
  useEffect(() => setSidebar(window.innerWidth >= 1024), []);

  // Drive the timer from a worker so it keeps going (and the tab title/icon keep
  // updating) while you're on another tab. Time is computed from timestamps.
  useEffect(() => {
    const update = () => {
      const s = useWorkspace.getState();
      s.tick();
      const { timer, settings } = useWorkspace.getState();
      const left = remainingMs(timer);
      const total = (timer.mode === 'focus' ? settings.focus : timer.mode === 'short' ? settings.short : settings.long) * 60_000;
      const label = timer.mode === 'focus' ? 'Focus' : 'Break';
      if (timer.running) {
        document.title = `${formatTime(left)} · ${label} | Learner's Landing`;
        setFaviconProgress(1 - left / total, timer.mode === 'focus' ? '#f2b33d' : '#86efac');
      } else {
        document.title = left < total ? `⏸ ${formatTime(left)} · Paused | Learner's Landing` : "Study Workspace | Learner's Landing";
        setFaviconProgress(null);
      }
    };
    update();
    return startTicker(update);
  }, []);

  const toast = (text: string) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, text }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 5000);
  };

  // React to completed sessions / tasks.
  useEffect(() => {
    if (!lastEvent || Date.now() - lastEvent.id > 5000) return;
    const messages = {
      focus: `Session complete! +${lastEvent.coins} coins. Time for a break.`,
      break: 'Break over. Ready for another round?',
      task: `Task done! +${lastEvent.coins} coins`,
    };
    toast(messages[lastEvent.kind]);
    const { notify } = useWorkspace.getState().settings;
    if (notify && lastEvent.kind !== 'task' && document.hidden && 'Notification' in window && Notification.permission === 'granted') {
      new Notification(lastEvent.kind === 'focus' ? 'Focus session complete! 🎉' : 'Break is over ⏰', {
        body: lastEvent.kind === 'focus' ? `+${lastEvent.coins} coins. Time for a break.` : 'Ready for another round?',
        icon: '/favicon.svg',
        tag: 'learners-landing-timer',
      });
    }
    lastEvent.unlocked.forEach((r) => toast(`🎉 ${r.name} the ${r.species.toLowerCase()} moved into your village!`));
    if (chimeOn && lastEvent.kind !== 'task') chime();
  }, [lastEvent?.id]);

  const toggleBuild = (on = !build) => {
    setBuild(on);
    setPlacing(null);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (el.closest('input, textarea, [contenteditable]') || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.code === 'Space') {
        e.preventDefault();
        const s = useWorkspace.getState();
        primeAudio();
        s.timer.running ? s.pause() : s.start();
      } else if (e.key === 'b') toggleBuild();
      else if (e.key === 'f') toggleFullscreen();
      else if (e.key === 'Escape') {
        setSettingsOpen(false);
        toggleBuild(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const toggleFullscreen = () => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void document.documentElement.requestFullscreen?.();
  };

  const toggleRain = () => {
    setRain(!rain);
    setRainOn(!rain);
  };

  const inventoryItems = Object.entries(inventory).filter(([, n]) => n > 0);

  return (
    <div className="relative h-dvh w-screen overflow-hidden bg-[#2a1b3d] font-sans text-white">
      <Village buildMode={build} placing={placing} onPlaced={() => setPlacing(null)} focusing={focusing} raining={rain} />

      {/* Top bar */}
      <header className="pointer-events-none absolute inset-x-0 top-0 z-30 flex items-start justify-between gap-2 p-3 sm:p-4">
        <a href="/" className="pointer-events-auto flex items-center gap-2 rounded-xl border border-white/10 bg-black/35 px-3 py-2 backdrop-blur-md hover:bg-black/50" title="Back to Learner's Landing">
          <Home size={16} />
          <span className="hidden font-display text-sm sm:inline">Learner's Landing</span>
        </a>
        <div className="pointer-events-auto flex items-center gap-1.5 rounded-xl border border-white/10 bg-black/35 p-1.5 backdrop-blur-md">
          <span className="flex items-center gap-1 rounded-lg bg-white/10 px-2.5 py-1.5 font-display text-sm text-yellow-200" title="Coins">
            🪙 {coins}
          </span>
          <IconButton label="Study music player" active={playerOpen} onClick={() => setPlayerOpen(!playerOpen)}>
            <Music size={18} />
          </IconButton>
          <IconButton label="Rain sounds" active={rain} onClick={toggleRain}>
            <CloudRain size={18} />
          </IconButton>
          <IconButton label="Build mode (B)" active={build} onClick={() => toggleBuild()}>
            <Hammer size={18} />
          </IconButton>
          <IconButton label="Settings" onClick={() => setSettingsOpen(true)}>
            <Settings size={18} />
          </IconButton>
          <IconButton label="Fullscreen (F)" onClick={toggleFullscreen} className="hidden sm:flex">
            <Maximize size={18} />
          </IconButton>
        </div>
      </header>

      {/* Sidebar */}
      {!build && (
        <>
          <aside
            className={`absolute bottom-3 left-3 top-[4.25rem] z-20 flex w-[min(20rem,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-2xl border border-white/10 bg-black/45 shadow-2xl backdrop-blur-2xl transition-transform duration-300 ${
              sidebar ? 'translate-x-0' : '-translate-x-[110%]'
            }`}
            aria-hidden={!sidebar}
          >
            <nav className="flex gap-1 border-b border-white/10 p-2" aria-label="Workspace panels">
              <TabButton active={tab === 'tasks'} onClick={() => setTab('tasks')} icon={<CheckSquare size={15} />} label="Tasks" />
              <TabButton active={tab === 'shop'} onClick={() => setTab('shop')} icon={<ShoppingBag size={15} />} label="Shop" />
              <TabButton active={tab === 'village'} onClick={() => setTab('village')} icon={<BarChart3 size={15} />} label="Village" />
              <TabButton active={tab === 'notes'} onClick={() => setTab('notes')} icon={<FileText size={15} />} label="Notes" />
            </nav>
            <div className="flex-1 overflow-y-auto p-3 [scrollbar-width:thin]">
              {tab === 'tasks' && <Tasks />}
              {tab === 'shop' && (
                <Shop
                  onBuild={(id) => {
                    setBuild(true);
                    setPlacing(id);
                  }}
                />
              )}
              {tab === 'village' && <Progress />}
              {tab === 'notes' && (
                <textarea
                  value={notes}
                  onChange={(e) => useWorkspace.getState().setNotes(e.target.value)}
                  placeholder="Park distracting thoughts here so you can deal with them later. Saved automatically."
                  aria-label="Notes"
                  className="h-full min-h-[50vh] w-full resize-none rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-plum/60"
                />
              )}
            </div>
          </aside>
          <button
            onClick={() => setSidebar(!sidebar)}
            className="absolute top-1/2 z-20 -translate-y-1/2 rounded-r-xl border border-l-0 border-white/10 bg-black/40 px-1 py-4 text-white/70 backdrop-blur-md transition-[left] duration-300 hover:text-white"
            style={{ left: sidebar ? 'min(21.25rem, calc(100vw - 2rem))' : 0 }}
            aria-label={sidebar ? 'Hide sidebar' : 'Show sidebar'}
          >
            {sidebar ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
          </button>
        </>
      )}

      {/* Timer */}
      {!build && (
        <main
          className={`absolute inset-x-0 top-[4.25rem] z-10 flex items-start justify-center px-4 pt-[4vh] transition-[padding] duration-300 sm:pt-[8vh] ${
            sidebar ? 'lg:pl-[21rem]' : ''
          } ${sidebar ? 'max-lg:hidden' : ''}`}
        >
          <Timer />
        </main>
      )}

      {/* Build mode tray */}
      {build && (
        <div className="absolute inset-x-0 top-[4.5rem] z-40 flex justify-center px-3">
          <div className="w-full max-w-3xl rounded-2xl border border-white/15 bg-black/60 p-3 shadow-2xl backdrop-blur-xl">
            <div className="mb-2 flex items-center justify-between gap-3">
              <p className="text-sm">
                <strong className="font-display">Build mode.</strong>{' '}
                <span className="text-white/70">
                  {placing ? `Click the grass to place your ${decorById[placing]?.name.toLowerCase()}.` : 'Pick an item, then click the grass. Drag items to move them; click one for more options.'}
                </span>
              </p>
              <button onClick={() => toggleBuild(false)} className="shrink-0 rounded-lg bg-white px-3 py-1.5 text-sm font-bold text-ink">
                Done
              </button>
            </div>
            {inventoryItems.length ? (
              <ul className="flex gap-2 overflow-x-auto pb-1">
                {inventoryItems.map(([id, n]) => (
                  <li key={id}>
                    <button
                      onClick={() => setPlacing(placing === id ? null : id)}
                      className={`relative flex h-16 w-16 items-end justify-center rounded-xl border p-1.5 ${placing === id ? 'border-honey bg-honey/20' : 'border-white/10 bg-white/5 hover:bg-white/10'}`}
                      title={decorById[id]?.name}
                    >
                      <img
                        src={`/sprites/decor/${id}.png`}
                        alt={decorById[id]?.name}
                        className="pixelated max-h-full max-w-full object-contain"
                        style={{ imageRendering: 'pixelated', height: Math.min(48, (decorById[id]?.h ?? 16) * 2) }}
                      />
                      <span className="absolute right-1 top-1 rounded bg-black/70 px-1 text-[10px] font-bold">×{n}</span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-white/60">
                Your inventory is empty.{' '}
                <button
                  className="underline"
                  onClick={() => {
                    toggleBuild(false);
                    setSidebar(true);
                    setTab('shop');
                  }}
                >
                  Visit the shop
                </button>{' '}
                to buy decorations.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Floating music player */}
      {playerOpen && (
        <div className="absolute bottom-3 right-3 z-40">
          <VideoPlayer onClose={() => setPlayerOpen(false)} />
        </div>
      )}

      {/* Toasts */}
      <div className="pointer-events-none absolute inset-x-0 top-20 z-50 flex flex-col items-center gap-2 px-4" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className="rounded-xl border border-honey/40 bg-[#2a1b3d]/90 px-4 py-2.5 font-display text-sm shadow-xl backdrop-blur" style={{ animation: 'toast-in .35s ease-out' }}>
            {t.text}
          </div>
        ))}
      </div>

      {settingsOpen && <SettingsModal onClose={() => setSettingsOpen(false)} />}
    </div>
  );
}

function IconButton({ label, active, onClick, children, className = '' }: { label: string; active?: boolean; onClick: () => void; children: ReactNode; className?: string }) {
  return (
    <button
      onClick={onClick}
      title={label}
      aria-label={label}
      aria-pressed={active}
      className={`flex items-center justify-center rounded-lg p-2 transition ${active ? 'bg-plum text-white shadow-[0_0_12px_rgba(140,90,230,0.5)]' : 'text-white/70 hover:bg-white/10 hover:text-white'} ${className}`}
    >
      {children}
    </button>
  );
}

function TabButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      aria-current={active}
      className={`flex flex-1 items-center justify-center gap-1 rounded-lg py-2 text-xs font-bold transition ${active ? 'bg-white/20 text-white' : 'text-white/55 hover:bg-white/10 hover:text-white'}`}
    >
      {icon}
      {label}
    </button>
  );
}
