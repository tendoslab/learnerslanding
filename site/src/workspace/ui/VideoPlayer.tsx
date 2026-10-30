import { useState } from 'react';
import { ChevronDown, ChevronUp, X } from 'lucide-react';
import { CATEGORIES, embedUrl, playerVideos, thumb } from '../../data/videos';

// A small floating YouTube player using the privacy-enhanced (nocookie) embed.
export default function VideoPlayer({ onClose }: { onClose: () => void }) {
  const [videoId, setVideoId] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const current = playerVideos.find((v) => v.youtubeId === videoId);

  return (
    <div className="pointer-events-auto w-[min(92vw,22rem)] overflow-hidden rounded-2xl border border-white/15 bg-black/70 text-white shadow-2xl backdrop-blur-xl">
      <div className="flex items-center justify-between gap-2 border-b border-white/10 px-3 py-2">
        <p className="truncate font-pixel text-sm">{current ? current.title : 'Study soundtrack'}</p>
        <div className="flex shrink-0 gap-1">
          <button onClick={() => setCollapsed(!collapsed)} className="rounded p-1 hover:bg-white/15" aria-label={collapsed ? 'Expand player' : 'Collapse player'}>
            {collapsed ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          <button onClick={onClose} className="rounded p-1 hover:bg-white/15" aria-label="Close player">
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Keep the iframe mounted while collapsed so the music keeps playing */}
      <div className={collapsed ? 'h-0 overflow-hidden' : ''}>
        {videoId ? (
          <div className="aspect-video bg-black">
            <iframe
              key={videoId}
              className="h-full w-full"
              src={embedUrl(videoId, true)}
              title={current?.title ?? 'YouTube video player'}
              allow="autoplay; encrypted-media; picture-in-picture"
              referrerPolicy="strict-origin-when-cross-origin"
              allowFullScreen
            />
          </div>
        ) : (
          <p className="px-3 pt-3 text-xs text-white/60">Pick something to play while you study. Videos play from YouTube.</p>
        )}
        <ul className="max-h-56 space-y-1 overflow-y-auto p-2">
          {playerVideos.map((v) => (
            <li key={v.youtubeId}>
              <button
                onClick={() => setVideoId(v.youtubeId)}
                className={`flex w-full items-center gap-2 rounded-lg p-1.5 text-left transition ${v.youtubeId === videoId ? 'bg-plum/60' : 'hover:bg-white/10'}`}
              >
                <img src={thumb(v.youtubeId)} alt="" loading="lazy" className="h-9 w-16 shrink-0 rounded object-cover" />
                <span className="min-w-0">
                  <span className="block truncate text-xs font-bold">{v.title}</span>
                  <span className="text-[10px] text-white/50">
                    {CATEGORIES[v.category].emoji} {CATEGORIES[v.category].label} · {v.length}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
