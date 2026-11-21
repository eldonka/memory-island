// ============================================================
// Photo analysis — Canvas pixel sampling + tiny k-means for dominant colors.
// Runs fully in the browser, no network.
// ============================================================
import type { PhotoFeatures, PhotoAtmosphere } from '../data/types';
import { rgbToHex, rgbToHsl, hueWarmth } from '../plant/colors';

interface Px { r: number; g: number; b: number }

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

async function samplePixels(src: string, size = 48): Promise<Px[]> {
  const img = await loadImage(src);
  const c = document.createElement('canvas');
  c.width = size; c.height = size;
  const ctx = c.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(img, 0, 0, size, size);
  const d = ctx.getImageData(0, 0, size, size).data;
  const out: Px[] = [];
  for (let i = 0; i < d.length; i += 4) out.push({ r: d[i], g: d[i + 1], b: d[i + 2] });
  return out;
}

function kmeans(px: Px[], k = 5, iters = 10): { c: Px; n: number }[] {
  // deterministic init: spread by luminance quantiles
  const sorted = [...px].sort((a, b) => (a.r + a.g + a.b) - (b.r + b.g + b.b));
  let centers: Px[] = Array.from({ length: k }, (_, i) => ({ ...sorted[Math.floor(((i + 0.5) / k) * sorted.length)] }));
  let assign = new Array(px.length).fill(0);
  for (let it = 0; it < iters; it++) {
    for (let i = 0; i < px.length; i++) {
      let best = 0, bd = Infinity;
      for (let j = 0; j < k; j++) {
        const c = centers[j];
        const d = (px[i].r - c.r) ** 2 + (px[i].g - c.g) ** 2 + (px[i].b - c.b) ** 2;
        if (d < bd) { bd = d; best = j; }
      }
      assign[i] = best;
    }
    const sums = Array.from({ length: k }, () => ({ r: 0, g: 0, b: 0, n: 0 }));
    for (let i = 0; i < px.length; i++) { const s = sums[assign[i]]; s.r += px[i].r; s.g += px[i].g; s.b += px[i].b; s.n++; }
    centers = sums.map((s, j) => (s.n ? { r: s.r / s.n, g: s.g / s.n, b: s.b / s.n } : centers[j]));
  }
  const counts = new Array(k).fill(0);
  assign.forEach((a) => counts[a]++);
  return centers.map((c, j) => ({ c, n: counts[j] })).sort((a, b) => b.n - a.n);
}

export const EMPTY_PHOTO_FEATURES: PhotoFeatures = {
  count: 0, brightness: 0.5, contrast: 0.3, saturation: 0.4, warmth: 0.5, hueVariety: 0.3, dominant: [], atmosphere: 'muted',
};

export async function analyzePhotos(sources: string[]): Promise<PhotoFeatures> {
  if (!sources.length) return { ...EMPTY_PHOTO_FEATURES };
  const all: Px[] = [];
  for (const s of sources) {
    try { all.push(...(await samplePixels(s))); } catch { /* skip unreadable image */ }
  }
  if (!all.length) return { ...EMPTY_PHOTO_FEATURES, count: sources.length };

  let lumSum = 0, satSum = 0, warmSum = 0, warmW = 0;
  const lums: number[] = [];
  const hueHist = new Array(12).fill(0);
  for (const p of all) {
    const { h, s, l } = rgbToHsl(p.r, p.g, p.b);
    lums.push(l); lumSum += l; satSum += s;
    if (s > 0.12) { warmSum += hueWarmth(h) * s; warmW += s; hueHist[Math.floor(h / 30) % 12] += s; }
  }
  const n = all.length;
  const brightness = lumSum / n;
  const variance = lums.reduce((a, l) => a + (l - brightness) ** 2, 0) / n;
  const contrast = Math.min(1, Math.sqrt(variance) * 3.2);
  const saturation = satSum / n;
  const warmth = warmW > 0 ? warmSum / warmW : 0.5;
  const tot = hueHist.reduce((a, b) => a + b, 0) || 1;
  const entropy = -hueHist.reduce((a, v) => { const p = v / tot; return p > 0 ? a + p * Math.log(p) : a; }, 0);
  const hueVariety = Math.min(1, entropy / Math.log(12));

  // dominant colors: prefer colorful clusters for petals, keep order by frequency
  const clusters = kmeans(all, 6, 12);
  const colorful = clusters.filter((c) => rgbToHsl(c.c.r, c.c.g, c.c.b).s > 0.14);
  const picked = (colorful.length >= 2 ? colorful : clusters).slice(0, 4);
  const dominant = picked.map((c) => rgbToHex(c.c.r, c.c.g, c.c.b));

  let atmosphere: PhotoAtmosphere = 'muted';
  if (brightness < 0.3) atmosphere = 'night';
  else if (saturation > 0.45 && contrast > 0.35) atmosphere = 'vivid';
  else if (warmth > 0.62 && brightness < 0.7) atmosphere = 'golden';
  else if (warmth < 0.4) atmosphere = 'cool';
  else if (brightness > 0.68 && saturation < 0.35) atmosphere = 'airy';

  return { count: sources.length, brightness, contrast, saturation, warmth, hueVariety, dominant, atmosphere };
}

/** Downscale a user photo to a JPEG data URL (max edge px). Keeps display fast and analysis cheap. */
export function makeThumb(file: Blob, maxEdge = 1200, quality = 0.86): Promise<{ dataUrl: string; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxEdge / Math.max(img.width, img.height));
      const w = Math.max(1, Math.round(img.width * scale));
      const h = Math.max(1, Math.round(img.height * scale));
      const c = document.createElement('canvas');
      c.width = w; c.height = h;
      c.getContext('2d')!.drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      resolve({ dataUrl: c.toDataURL('image/jpeg', quality), width: img.width, height: img.height });
    };
    img.onerror = (e) => { URL.revokeObjectURL(url); reject(e); };
    img.src = url;
  });
}
