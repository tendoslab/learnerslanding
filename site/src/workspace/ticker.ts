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

let link: HTMLLinkElement | null = null;
let canvas: HTMLCanvasElement | null = null;
let lastKey = '';

/** Draws a progress ring into the tab's favicon; pass null to restore the normal icon. */
export const setFaviconProgress = (progress: number | null, color = '#f2b33d') => {
  link ??= document.querySelector<HTMLLinkElement>('link[rel="icon"]');
  if (!link) return;
  if (progress === null) {
    if (lastKey !== 'default') link.href = withBase('/favicon.svg');
    lastKey = 'default';
    return;
  }
  const key = `${Math.round(progress * 60)}-${color}`;
  if (key === lastKey) return;
  lastKey = key;
  canvas ??= Object.assign(document.createElement('canvas'), { width: 64, height: 64 });
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, 64, 64);
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
  link.href = canvas.toDataURL('image/png');
};
