import { useEffect, useState } from 'react';
import { Copy, Download, Loader2, Share2, X } from 'lucide-react';
import { unlockedResidents, useWorkspace } from '../store';
import { captureVillage } from '../share';
import { fmtMinutes } from './Progress';

const FILE_NAME = 'my-learners-landing-village.png';

export default function ShareModal({ onClose }: { onClose: () => void }) {
  const [blob, setBlob] = useState<Blob | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const s = useWorkspace.getState();
    const residents = unlockedResidents(s.totalFocusMinutes, s.residentOrder).length;
    const detail = `${residents} resident${residents === 1 ? '' : 's'} · ${fmtMinutes(s.totalFocusMinutes)} of focus · Learner's Landing`;
    let live = true;
    let made: string | null = null;
    captureVillage({ title: 'My village', detail })
      .then((b) => {
        if (!live) return;
        made = URL.createObjectURL(b);
        setBlob(b);
        setUrl(made);
      })
      .catch(() => live && setError(true));
    return () => {
      live = false;
      if (made) URL.revokeObjectURL(made);
    };
  }, []);

  const file = blob && new File([blob], FILE_NAME, { type: 'image/png' });
  const canShare = !!file && typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] });
  const canCopy = typeof ClipboardItem !== 'undefined' && !!navigator.clipboard?.write;

  const share = async () => {
    try {
      await navigator.share({ files: [file!], title: 'My village', text: `Look at the village I've grown while studying on Learner's Landing! ${location.origin}` });
    } catch {
      // Closing the share sheet throws too; nothing to report.
    }
  };
  const download = () => {
    const a = document.createElement('a');
    a.href = url!;
    a.download = FILE_NAME;
    a.click();
  };
  const copy = async () => {
    try {
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob! })]);
      setMessage('Copied! Paste it into a chat to share.');
    } catch {
      setMessage("Couldn't copy here. Try downloading instead.");
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="share-title"
        onClick={(e) => e.stopPropagation()}
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-white/10 bg-[#1d1530] text-white shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-white/10 p-5">
          <h2 id="share-title" className="font-display text-xl font-semibold">Share your village</h2>
          <button onClick={onClose} className="rounded p-1 text-white/60 hover:bg-white/10 hover:text-white" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4 p-5">
          <div className="flex aspect-video items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-black/30">
            {url ? (
              <img src={url} alt="A picture of your village" className="h-full w-full object-contain" />
            ) : error ? (
              <p className="px-6 text-center text-sm text-white/70">Sorry, we couldn't take a picture of your village. Please try again.</p>
            ) : (
              <span className="flex items-center gap-2 text-sm text-white/60">
                <Loader2 size={16} className="animate-spin" /> Taking a picture…
              </span>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {canShare && (
              <button onClick={share} className="flex items-center gap-2 rounded-lg bg-honey px-4 py-2 text-sm font-bold text-ink">
                <Share2 size={16} /> Share
              </button>
            )}
            <button
              onClick={download}
              disabled={!url}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold disabled:opacity-40 ${canShare ? 'bg-white/10 hover:bg-white/15' : 'bg-honey text-ink'}`}
            >
              <Download size={16} /> Download
            </button>
            {canCopy && (
              <button onClick={copy} disabled={!blob} className="flex items-center gap-2 rounded-lg bg-white/10 px-4 py-2 text-sm font-bold hover:bg-white/15 disabled:opacity-40">
                <Copy size={16} /> Copy image
              </button>
            )}
          </div>
          {message && <p className="text-sm text-white/70">{message}</p>}
        </div>
      </div>
    </div>
  );
}
