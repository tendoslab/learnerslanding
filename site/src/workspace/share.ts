import { toCanvas } from 'html-to-image';

/** Marks the element the village is drawn in, so it can be captured. */
export const VILLAGE_ATTR = 'data-village';

const roundRect = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
};

/**
 * A still picture of the village as it looks right now (without the timer,
 * sidebar and other panels on top), with a small caption in the corner.
 */
export async function captureVillage(caption: { title: string; detail: string }): Promise<Blob> {
  const node = document.querySelector<HTMLElement>(`[${VILLAGE_ATTR}]`);
  if (!node) throw new Error('Village not found');
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  const scene = await toCanvas(node, { pixelRatio: ratio });

  const canvas = document.createElement('canvas');
  canvas.width = scene.width;
  canvas.height = scene.height;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(scene, 0, 0);

  // Caption card, top left, in the sky where it won't cover anyone.
  const u = ratio * Math.max(1, Math.min(1.6, scene.width / ratio / 900));
  const pad = 14 * u;
  ctx.font = `600 ${20 * u}px 'Fraunces Variable', Georgia, serif`;
  const titleW = ctx.measureText(caption.title).width;
  ctx.font = `500 ${13 * u}px 'DM Sans Variable', system-ui, sans-serif`;
  const detailW = ctx.measureText(caption.detail).width;
  const w = Math.max(titleW, detailW) + pad * 2;
  const h = 62 * u;
  const x = 16 * u;
  const y = 16 * u;
  ctx.fillStyle = 'rgba(20, 14, 34, 0.72)';
  roundRect(ctx, x, y, w, h, 14 * u);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
  ctx.lineWidth = u;
  ctx.stroke();
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#fff';
  ctx.font = `600 ${20 * u}px 'Fraunces Variable', Georgia, serif`;
  ctx.fillText(caption.title, x + pad, y + 28 * u);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
  ctx.font = `500 ${13 * u}px 'DM Sans Variable', system-ui, sans-serif`;
  ctx.fillText(caption.detail, x + pad, y + 49 * u);

  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not create image'))), 'image/png'));
}
