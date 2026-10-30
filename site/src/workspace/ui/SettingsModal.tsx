import { useRef, useState } from 'react';
import { Download, Upload, X } from 'lucide-react';
import { useWorkspace, type SkyMode } from '../store';
import { AVATAR_COUNT } from '../rewards';
import { STORAGE_KEY } from '../storage';

export default function SettingsModal({ onClose }: { onClose: () => void }) {
  const settings = useWorkspace((s) => s.settings);
  const update = useWorkspace((s) => s.updateSettings);
  const importData = useWorkspace((s) => s.importData);
  const fileRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState('');

  const exportData = () => {
    const raw = localStorage.getItem(STORAGE_KEY) ?? '{}';
    const url = URL.createObjectURL(new Blob([raw], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `learners-landing-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const onImport = async (file: File) => {
    const ok = importData(await file.text());
    setMessage(ok ? 'Backup restored!' : "That file doesn't look like a Learner's Landing backup.");
  };

  const resetAll = () => {
    if (!confirm('Erase all tasks, coins, decorations and progress on this device? This cannot be undone.')) return;
    localStorage.removeItem(STORAGE_KEY);
    location.reload();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
        onClick={(e) => e.stopPropagation()}
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-white/10 bg-[#1d1530] text-white shadow-2xl"
      >
        <div className="sticky top-0 flex items-center justify-between border-b border-white/10 bg-[#1d1530] p-5">
          <h2 id="settings-title" className="font-display text-xl font-bold">Settings</h2>
          <button onClick={onClose} className="rounded p-1 text-white/60 hover:bg-white/10 hover:text-white" aria-label="Close settings">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-6 p-5">
          <section>
            <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-white/50">Timer (minutes)</h3>
            <div className="grid grid-cols-4 gap-2">
              <NumberField label="Focus" value={settings.focus} max={180} onChange={(focus) => update({ focus })} />
              <NumberField label="Short" value={settings.short} max={60} onChange={(short) => update({ short })} />
              <NumberField label="Long" value={settings.long} max={90} onChange={(long) => update({ long })} />
              <NumberField label="Long every" value={settings.longEvery} max={12} onChange={(longEvery) => update({ longEvery })} />
            </div>
            <div className="mt-3 space-y-2 text-sm">
              <Toggle label="Start the next session automatically" checked={settings.autoStart} onChange={(autoStart) => update({ autoStart })} />
              <Toggle label="Play a chime when a session ends" checked={settings.chime} onChange={(chime) => update({ chime })} />
              <Toggle
                label="Desktop notification when a session ends (if you're on another tab)"
                checked={settings.notify}
                onChange={async (notify) => {
                  if (notify && 'Notification' in window && Notification.permission !== 'granted') {
                    const permission = await Notification.requestPermission();
                    if (permission !== 'granted') {
                      setMessage('Notifications are blocked in your browser settings for this site.');
                      return;
                    }
                  }
                  update({ notify });
                }}
              />
              <p className="px-1 text-xs text-white/45">The countdown also shows in your browser tab, so you can glance at it from any tab.</p>
            </div>
          </section>

          <section>
            <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-white/50">Village sky</h3>
            <div className="grid grid-cols-4 gap-2">
              {(['auto', 'day', 'dusk', 'night'] as SkyMode[]).map((m) => (
                <button
                  key={m}
                  onClick={() => update({ sky: m })}
                  className={`rounded-lg border py-2 text-sm font-semibold capitalize ${settings.sky === m ? 'border-plum bg-plum/40' : 'border-white/10 bg-white/5 hover:bg-white/10'}`}
                >
                  {m === 'auto' ? 'Real time' : m}
                </button>
              ))}
            </div>
          </section>

          <section>
            <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-white/50">Your character</h3>
            <div className="grid grid-cols-6 gap-2">
              {Array.from({ length: AVATAR_COUNT }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  onClick={() => update({ avatar: n })}
                  aria-label={`Character ${n}`}
                  className={`flex aspect-square items-center justify-center overflow-hidden rounded-lg border ${settings.avatar === n ? 'border-plum bg-plum/40' : 'border-white/10 bg-white/5 hover:bg-white/10'}`}
                >
                  <div
                    className="pixelated"
                    style={{ width: 64, height: 64, backgroundImage: `url(/sprites/characters/char-${n}.png)`, backgroundSize: '384px 128px', imageRendering: 'pixelated', transform: 'scale(0.9)' }}
                  />
                </button>
              ))}
            </div>
          </section>

          <section>
            <h3 className="mb-1 text-xs font-bold uppercase tracking-wider text-white/50">Your data</h3>
            <p className="mb-3 text-xs text-white/50">Everything is saved in this browser only. Download a backup to move it to another device.</p>
            <div className="flex flex-wrap gap-2">
              <button onClick={exportData} className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-sm hover:bg-white/20">
                <Download size={15} /> Download backup
              </button>
              <button onClick={() => fileRef.current?.click()} className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-sm hover:bg-white/20">
                <Upload size={15} /> Restore backup
              </button>
              <button onClick={resetAll} className="rounded-lg border border-red-400/30 px-3 py-2 text-sm text-red-200 hover:bg-red-400/10">
                Reset everything
              </button>
              <input ref={fileRef} type="file" accept="application/json" hidden onChange={(e) => e.target.files?.[0] && onImport(e.target.files[0])} />
            </div>
            {message && <p className="mt-2 text-xs text-green-200">{message}</p>}
          </section>

          <section className="text-xs text-white/40">
            Shortcuts: <kbd className="rounded bg-white/10 px-1">Space</kbd> start/pause · <kbd className="rounded bg-white/10 px-1">B</kbd> build mode ·{' '}
            <kbd className="rounded bg-white/10 px-1">F</kbd> fullscreen
          </section>
        </div>
      </div>
    </div>
  );
}

function NumberField({ label, value, max, onChange }: { label: string; value: number; max: number; onChange: (v: number) => void }) {
  return (
    <label className="rounded-xl border border-white/5 bg-black/30 p-2 text-center">
      <span className="block text-[10px] uppercase tracking-wider text-white/50">{label}</span>
      <input
        type="number"
        min={1}
        max={max}
        value={value}
        onChange={(e) => onChange(Math.min(max, Math.max(1, parseInt(e.target.value) || 1)))}
        className="w-full bg-transparent text-center font-display text-2xl font-bold focus:outline-none"
      />
    </label>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 rounded-lg bg-white/5 px-3 py-2">
      <span>{label}</span>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4 accent-[#6d3fc0]" />
    </label>
  );
}
