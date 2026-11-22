// Color utilities: hex <-> hsl, harmonization into the game's palette range.

export interface HSL { h: number; s: number; l: number } // h 0..360, s/l 0..1

export function hexToRgb(hex: string): [number, number, number] {
  const m = hex.replace('#', '');
  const v = m.length === 3 ? m.split('').map((c) => c + c).join('') : m;
  const n = parseInt(v, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function rgbToHex(r: number, g: number, b: number): string {
  const c = (x: number) => Math.round(Math.max(0, Math.min(255, x))).toString(16).padStart(2, '0');
  return `#${c(r)}${c(g)}${c(b)}`;
}

export function rgbToHsl(r: number, g: number, b: number): HSL {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) * 60;
  else if (max === g) h = ((b - r) / d + 2) * 60;
  else h = ((r - g) / d + 4) * 60;
  return { h, s, l };
}

export function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  h = ((h % 360) + 360) % 360;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  return [(r + m) * 255, (g + m) * 255, (b + m) * 255];
}

export const hexToHsl = (hex: string) => { const [r, g, b] = hexToRgb(hex); return rgbToHsl(r, g, b); };
export const hslToHex = (h: number, s: number, l: number) => { const [r, g, b] = hslToRgb(h, s, l); return rgbToHex(r, g, b); };

export function adjust(hex: string, dh = 0, ds = 0, dl = 0): string {
  const c = hexToHsl(hex);
  return hslToHex(c.h + dh, Math.max(0, Math.min(1, c.s + ds)), Math.max(0, Math.min(1, c.l + dl)));
}

/** is the hue on the warm side of the wheel (reds, oranges, yellows, pinks)? 0..1 */
export function hueWarmth(h: number): number {
  // warm center ~ 30deg (orange), cool center ~ 210deg (blue)
  const d = Math.abs(((h - 30 + 540) % 360) - 180); // distance from cool center
  return d / 180;
}

/** mix two hex colors */
export function mix(a: string, b: string, t: number): string {
  const [r1, g1, b1] = hexToRgb(a); const [r2, g2, b2] = hexToRgb(b);
  return rgbToHex(r1 + (r2 - r1) * t, g1 + (g2 - g1) * t, b1 + (b2 - b1) * t);
}

/**
 * Bring an arbitrary photo color into the Memory Island palette range:
 * petals must stay luminous and readable against a dark sky, never muddy.
 */
export function harmonize(hex: string, warmth: number, night: number): string {
  const c = hexToHsl(hex);
  let s = c.s, l = c.l, h = c.h;
  s = Math.max(0.38, Math.min(0.82, s * 1.1 + 0.08));
  l = Math.max(0.5, Math.min(0.74, l * 0.6 + 0.3));
  // nudge hue slightly toward warm or cool depending on the day's warmth
  const push = (warmth - 0.5) * 18;
  const w = hueWarmth(h);
  if (push > 0 && w < 0.6) h = h + (h < 210 ? -push : push) * 0.5;
  if (push < 0 && w > 0.4) h = h + (h > 30 && h < 210 ? -push : push) * 0.5;
  if (night > 0.6) l -= 0.04;
  return hslToHex(h, s, l);
}

export function withAlpha(hex: string, a: number): string {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${Math.round(r)},${Math.round(g)},${Math.round(b)},${a})`;
}
