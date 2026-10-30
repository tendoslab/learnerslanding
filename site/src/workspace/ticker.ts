// Background tabs throttle setInterval heavily (Chrome drops to ~once a minute
// after a few minutes hidden). Web Workers aren't throttled the same way, so we
// tick from a tiny inline worker and fall back to setInterval if that fails.

import { withBase } from '../lib/base';

export const startTicker = (onTick: () => void, ms = 500) => {
  try {
    const src = `setInterval(() => postMessage(0), ${ms});`;
    const url = URL.createObjectURL(new Blob([src], { type: 'text/javascript' }));
    const worker = new Worker(url);
    worker.onmessage = onTick;
    return () => {
      worker.terminate();
      URL.revokeObjectURL(url);
    };
  } catch {
    const id = setInterval(onTick, ms);
    return () => clearInterval(id);
  }
};

/**
 * Draws the progress-ring favicon and returns it as a data URL. Self-contained
 * (no imports or outer variables) because BaseLayout also inlines it via
 * toString() to paint the icon before the page's scripts load.
 */
export function paintFavicon(progress: number, color: string) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#2a1b3d';
  ctx.beginPath();
  ctx.arc(32, 32, 30, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = 9;
  ctx.strokeStyle = 'rgba(255,255,255,0.18)';
  ctx.beginPath();
  ctx.arc(32, 32, 22, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = color;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(32, 32, 22, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.max(0.02, progress));
  ctx.stroke();
  return canvas.toDataURL('image/png');
}

/** Ring progress for a saved workspace state, or null when no timer is running. Self-contained too. */
export function timerFavicon(state: { timer?: { running?: boolean; endsAt?: number | null; mode?: string }; settings?: { focus: number; short: number; long: number } } | undefined) {
  const t = state?.timer;
  const s = state?.settings;
  if (!t?.running || !t.endsAt || !s) return null;
  const total = (t.mode === 'focus' ? s.focus : t.mode === 'short' ? s.short : s.long) * 60_000;
  const left = Math.max(0, t.endsAt - Date.now());
  return { progress: total ? 1 - left / total : 0, color: t.mode === 'focus' ? '#f2b33d' : '#86efac' };
}

let link: HTMLLinkElement | null = null;
let lastKey = '';

/** Draws a progress ring into the tab's favicon; pass null to restore the normal icon. */
export const setFaviconProgress = (progress: number | null, color = '#f2b33d') => {
  if (!link) {
    link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (!link) return;
    lastKey = link.dataset.key ?? '';
  }
  const key = progress === null ? 'default' : `${Math.round(progress * 60)}-${color}`;
  // Only touch the link when the picture changes: every href swap makes the browser reload the icon.
  if (key === lastKey) return;
  lastKey = key;
  link.href = progress === null ? withBase('/favicon.svg') : paintFavicon(progress, color);
};
