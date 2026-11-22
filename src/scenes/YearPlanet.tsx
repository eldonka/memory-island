// ============================================================
// YearPlanet — an Earth-like planet for one year of life.
// Every year gets its own look (ocean, continents, clouds, ice caps, moon)
// derived only from the year number, so a year always looks the same.
// Years with memories glow with tiny warm lights on the night side.
// ============================================================
import React, { useMemo } from 'react';
import { mulberry32 } from '../plant/random';

interface Palette { o1: string; o2: string; l1: string; l2: string; hi: string; atm: string }
const PALETTES: Palette[] = [
  { o1: '#5fb4e8', o2: '#1b4f9c', l1: '#7fb77a', l2: '#4f8f5a', hi: '#d9cf9a', atm: '#9fd6ff' }, // classic Earth
  { o1: '#58d0d0', o2: '#1b6f88', l1: '#a8c97a', l2: '#6a9d55', hi: '#efe2a8', atm: '#a6f0e6' }, // turquoise seas
  { o1: '#7f93e6', o2: '#2b3a8f', l1: '#8fc08a', l2: '#5a8f7a', hi: '#e0d3b0', atm: '#b8c6ff' }, // indigo seas
  { o1: '#6bb0d9', o2: '#1f5a7a', l1: '#c9b27a', l2: '#8c9a5a', hi: '#f0dfb0', atm: '#bfe6ff' }, // dry olive land
  { o1: '#9b8fe0', o2: '#3b2f8a', l1: '#86c0a0', l2: '#4f9a8a', hi: '#e8e0c0', atm: '#d0c4ff' }, // violet ocean
  { o1: '#58a8c8', o2: '#14456b', l1: '#6fb08a', l2: '#3f7f5f', hi: '#cfe6d0', atm: '#9ee0ff' }, // deep teal
  { o1: '#6cc0b8', o2: '#22607a', l1: '#d0a878', l2: '#a07a52', hi: '#f2e0b8', atm: '#aef0e0' }, // sandy continents
  { o1: '#5f9fe0', o2: '#233f95', l1: '#9ac86a', l2: '#5f9a4a', hi: '#e6e0a0', atm: '#a8d4ff' }, // lush green
];

interface Pt { x: number; y: number }

/** closed Catmull-Rom spline → SVG path */
function smoothClosed(pts: Pt[]): string {
  const n = pts.length;
  let d = `M${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)}`;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
    const c1 = { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 };
    const c2 = { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 };
    d += ` C${c1.x.toFixed(1)},${c1.y.toFixed(1)} ${c2.x.toFixed(1)},${c2.y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
  }
  return d + 'Z';
}

function blob(cx: number, cy: number, r: number, rand: () => number): Pt[] {
  const n = 9 + Math.floor(rand() * 3);
  const rot = rand() * Math.PI * 2;
  return Array.from({ length: n }, (_, i) => {
    const a = rot + (i / n) * Math.PI * 2;
    const rr = r * (0.62 + rand() * 0.62);
    return { x: cx + Math.cos(a) * rr * (1 + rand() * 0.25), y: cy + Math.sin(a) * rr * 0.85 };
  });
}

export function yearPalette(year: number): Palette { return PALETTES[((year * 3) % 8 + 8) % 8]; }

export function YearPlanet({ year, lights = 0, animate = true }: { year: number; lights?: number; animate?: boolean }) {
  const id = `yp${year}`;
  const g = useMemo(() => {
    const rand = mulberry32((year * 2654435761 + 12345) >>> 0);
    const pal = yearPalette(year);
    // continents inside the disc (radius 46 around 50,50)
    const lands: { d: string; hi: string; dark: string }[] = [];
    const count = 3 + Math.floor(rand() * 3);
    for (let i = 0; i < count; i++) {
      const a = rand() * Math.PI * 2, dist = rand() * 28;
      const cx = 50 + Math.cos(a) * dist, cy = 50 + Math.sin(a) * dist * 0.9;
      const r = 8 + rand() * 11;
      lands.push({ d: smoothClosed(blob(cx, cy, r, rand)), hi: smoothClosed(blob(cx + (rand() - 0.5) * 3, cy + (rand() - 0.5) * 3, r * 0.5, rand)), dark: smoothClosed(blob(cx + (rand() - 0.5) * 5, cy + (rand() - 0.5) * 5, r * 0.4, rand)) });
    }
    const isles = Array.from({ length: 2 }, () => {
      const a = rand() * Math.PI * 2, dist = 10 + rand() * 26;
      return smoothClosed(blob(50 + Math.cos(a) * dist, 50 + Math.sin(a) * dist, 2.5 + rand() * 2.5, rand));
    });
    const clouds = Array.from({ length: 6 + Math.floor(rand() * 4) }, () => {
      const a = rand() * Math.PI * 2, dist = rand() * 40;
      return { cx: 50 + Math.cos(a) * dist, cy: 50 + Math.sin(a) * dist * 0.95, rx: 6 + rand() * 11, ry: 1.6 + rand() * 2.6, o: 0.3 + rand() * 0.35 };
    });
    const capTop = rand() < 0.85, capBottom = rand() < 0.7;
    const moon = rand() < 0.4 ? { a: -0.9 - rand() * 0.7, r: 3.4 + rand() * 2 } : null;
    const hue = Math.round((rand() - 0.5) * 22);
    const sunX = 32 + Math.round(rand() * 8), sunY = 26 + Math.round(rand() * 8);
    const night = Array.from({ length: 6 }, () => ({ x: 56 + rand() * 24, y: 44 + rand() * 30, d: rand() * 3 }));
    return { pal, lands, isles, clouds, capTop, capBottom, moon, hue, sunX, sunY, night, drift: -Math.round(rand() * 24) };
  }, [year]);
  const { pal } = g;
  const moonPos = g.moon ? { x: 50 + Math.cos(g.moon.a) * 52, y: 50 + Math.sin(g.moon.a) * 52 } : null;

  return (
    <svg viewBox="0 0 100 100" className="year-planet" aria-hidden="true" style={{ filter: `hue-rotate(${g.hue}deg)` }}>
      <defs>
        <radialGradient id={`${id}-ocean`} cx="36%" cy="30%" r="80%"><stop offset="0%" stopColor={pal.o1} /><stop offset="100%" stopColor={pal.o2} /></radialGradient>
        <radialGradient id={`${id}-atm`} cx="50%" cy="50%" r="50%"><stop offset="86%" stopColor={pal.atm} stopOpacity="0" /><stop offset="94%" stopColor={pal.atm} stopOpacity="0.5" /><stop offset="100%" stopColor={pal.atm} stopOpacity="0" /></radialGradient>
        <radialGradient id={`${id}-shade`} cx={`${g.sunX}%`} cy={`${g.sunY}%`} r="85%"><stop offset="35%" stopColor="#05061a" stopOpacity="0" /><stop offset="100%" stopColor="#05061a" stopOpacity="0.72" /></radialGradient>
        <radialGradient id={`${id}-moon`} cx="35%" cy="30%" r="75%"><stop offset="0%" stopColor="#f1eee6" /><stop offset="100%" stopColor="#8d8aa0" /></radialGradient>
        <clipPath id={`${id}-clip`}><circle cx="50" cy="50" r="45" /></clipPath>
      </defs>
      <circle cx="50" cy="50" r="50" fill={`url(#${id}-atm)`} />
      <circle cx="50" cy="50" r="45" fill={`url(#${id}-ocean)`} />
      <g clipPath={`url(#${id}-clip)`}>
        {g.lands.map((l, i) => (
          <g key={i}>
            <path d={l.d} fill={pal.l1} />
            <path d={l.dark} fill={pal.l2} opacity="0.75" />
            <path d={l.hi} fill={pal.hi} opacity="0.6" />
          </g>
        ))}
        {g.isles.map((d, i) => <path key={i} d={d} fill={pal.l1} opacity="0.9" />)}
        {g.capTop && <ellipse cx="50" cy="6" rx="24" ry="9" fill="#f4f8ff" opacity="0.9" />}
        {g.capBottom && <ellipse cx="50" cy="95" rx="18" ry="7" fill="#f4f8ff" opacity="0.85" />}
        <g className={animate ? 'yp-clouds' : undefined} style={{ animationDelay: `${g.drift}s` }}>
          {g.clouds.map((c, i) => <ellipse key={i} cx={c.cx} cy={c.cy} rx={c.rx} ry={c.ry} fill="#fff" opacity={c.o} />)}
        </g>
        <circle cx="50" cy="50" r="45" fill={`url(#${id}-shade)`} />
        {Array.from({ length: Math.min(6, lights) }, (_, i) => (
          <circle key={i} cx={g.night[i].x} cy={g.night[i].y} r="0.9" fill="#ffe9a8" className={animate ? 'yp-light' : undefined} style={{ animationDelay: `${g.night[i].d}s` }} />
        ))}
      </g>
      <circle cx="50" cy="50" r="45" fill="none" stroke={pal.atm} strokeOpacity="0.35" strokeWidth="0.8" />
      {g.moon && moonPos && <circle cx={moonPos.x} cy={moonPos.y} r={g.moon.r} fill={`url(#${id}-moon)`} opacity="0.95" />}
    </svg>
  );
}
