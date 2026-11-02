import { toCanvas } from 'html-to-image';

/** Marks the element the village is drawn in, so it can be captured. */
export const VILLAGE_ATTR = 'data-village';
/** Set on the village while it's being captured (see the .ll-pop rule in Village). */
export const CAPTURING_ATTR = 'data-capturing';

const roundRect = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
};

/** The site's home page, e.g. https://learnerslanding.com/ (keeps a GitHub Pages sub-path). */
export const siteLink = () => new URL(import.meta.env.BASE_URL, location.origin).href;

/**
 * A still picture of the village as it looks right now (without the timer,
 * sidebar and other panels on top), with a small caption in the corner and the site's address in the
 * opposite one, so a downloaded or copied picture still says where it's from.
 */
export async function captureVillage(caption: { title: string; detail: string; link: string }): Promise<Blob> {
  const node = document.querySelector<HTMLElement>(`[${VILLAGE_ATTR}]`);
  if (!node) throw new Error('Village not found');
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  // Residents who moved in (and decorations placed) since the page loaded carry a
  // pop-in animation. The capture copies it and renders its first, invisible
  // frame, so they'd be missing from the picture; switch it off while we capture.
  node.setAttribute(CAPTURING_ATTR, '');
  let scene: HTMLCanvasElement;
  try {
    scene = await toCanvas(node, { pixelRatio: ratio });
  } finally {
    node.removeAttribute(CAPTURING_ATTR);
  }

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

  // Site address, bottom right.
  ctx.font = `600 ${13 * u}px 'DM Sans Variable', system-ui, sans-serif`;
  const linkW = ctx.measureText(caption.link).width;
  const lh = 28 * u;
  const lx = canvas.width - linkW - pad * 2 - x;
  const ly = canvas.height - lh - y;
  ctx.fillStyle = 'rgba(20, 14, 34, 0.72)';
  roundRect(ctx, lx, ly, linkW + pad * 2, lh, lh / 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#fff';
  ctx.textBaseline = 'middle';
  ctx.fillText(caption.link, lx + pad, ly + lh / 2);

  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not create image'))), 'image/png'));
}
