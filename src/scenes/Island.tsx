// ============================================================
// Island — a floating cloud island (SVG), after the reference image: dense
// rose cumulus with soft half-transparent edges carrying a mossy garden
// dotted with small red flowers and warm lights, fireflies hovering above.
//
// Everything is deterministic from `seed`; the grass surface curve is shared
// with gardenLayout.ts (surfY) so plants stand exactly on the moss.
// Element budget ≈ 160 per island so twelve of them float smoothly.
// ============================================================
import React, { useMemo } from 'react';
import { mulberry32 } from '../plant/random';
import './island.css';

export interface IslandProps {
  seed: number;
  count: number;        // memories inside
  width?: number;
  selected?: boolean;
  dim?: boolean;
  dormant?: boolean;    // a month that has not come yet: quieter, no lights
  onClick?: () => void;
  className?: string;
  children?: React.ReactNode;
  wide?: boolean;       // garden variant (wider, flatter)
  lights?: boolean;
}

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
/** open Catmull-Rom spline → SVG path */
function smoothOpen(pts: Pt[]): string {
  let d = `M${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
    const c1 = { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 };
    const c2 = { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 };
    d += ` C${c1.x.toFixed(1)},${c1.y.toFixed(1)} ${c2.x.toFixed(1)},${c2.y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
  }
  return d;
}

const FLOWER_COLORS = ['#e4556a', '#f08aa0', '#fff3dc', '#f6d78d', '#d9486d', '#f7b9cb', '#ff9f6e', '#ffd3e0'];

export function Island({ seed, count, width = 300, selected, dim, dormant, onClick, className = '', children, wide, lights = true }: IslandProps) {
  if (dormant) lights = false;
  const VW = wide ? 900 : 320, VH = wide ? 260 : 230;
  const model = useMemo(() => {
    const rand = mulberry32(seed);
    const left = VW * 0.08, right = VW * 0.92;
    const bump = wide ? 26 : 22;
    const surf = (x: number) => VH * 0.5 - Math.sin(((x - left) / (right - left)) * Math.PI) * bump;
    const f1 = (v: number) => Number(v.toFixed(1));

    // --- grass mound contour: smooth top with gentle jitter, bulging underside (geometry shared with gardenLayout) ---
    const N = wide ? 26 : 13;
    const top: Pt[] = [];
    for (let i = 0; i <= N; i++) {
      const x = left + ((right - left) * i) / N;
      const edge = i === 0 || i === N;
      top.push({ x, y: surf(x) + (edge ? 12 : (rand() - 0.5) * 5) });
    }
    const M = wide ? 9 : 5;
    const bottom: Pt[] = [];
    for (let i = M; i >= 0; i--) {
      const t = i / M;
      const x = left + (right - left) * t + (i === 0 || i === M ? 0 : (rand() - 0.5) * 18);
      const depth = 34 + Math.sin(t * Math.PI) * 12 + (i === 0 || i === M ? -14 : rand() * 10);
      bottom.push({ x, y: surf(x) + depth });
    }
    const grass = smoothClosed([...top, ...bottom]);
    const rim = smoothOpen(top.slice(1, -1).map((p) => ({ x: p.x, y: p.y + 1.5 })));
    const frontEdge = [...bottom].reverse();   // left → right along the underside

    // --- bush clumps: dark ones behind the edge, light ones in front (each with a lit cap) ---
    const nb = wide ? 16 : 8;
    const bushBack = Array.from({ length: nb }, (_, i) => {
      const x = left + 14 + (right - left - 28) * ((i + 0.5) / nb) + (rand() - 0.5) * 12;
      return { x: f1(x), y: f1(surf(x) + 1), rx: f1((wide ? 26 : 20) + rand() * 12), ry: f1((wide ? 14 : 11) + rand() * 6) };
    });
    const nf = wide ? 12 : 6;
    const bushFront = Array.from({ length: nf }, (_, i) => {
      const x = left + 30 + (right - left - 60) * ((i + 0.3) / nf) + (rand() - 0.5) * 20;
      return { x: f1(x), y: f1(surf(x) + 14 + rand() * 8), rx: f1((wide ? 22 : 16) + rand() * 10), ry: f1((wide ? 11 : 8) + rand() * 4) };
    });

    // --- cumulus: clusters of a body ellipse + three lobes, lit from the upper left ---
    const n = wide ? 12 : 6;
    const clusters = Array.from({ length: n }, (_, i) => {
      const t = (i + 0.5) / n;
      const end = i === 0 || i === n - 1;   // the cloud is wider than the moss and swells at both ends
      const r = ((wide ? 62 : 50) + rand() * (wide ? 26 : 20)) * (end ? 1.18 : 1);
      const cx = VW * (0.05 + t * 0.9) + (rand() - 0.5) * 18;
      const cy = VH * 0.66 + Math.sin(t * Math.PI) * 8 + (rand() - 0.5) * 12 - (end ? r * 0.12 : 0);
      return {
        cx: f1(cx), cy: f1(cy), rx: f1(r * 1.15), ry: f1(r * 0.78),
        lobes: [
          { x: f1(cx - r * 0.55), y: f1(cy - r * 0.42), r: f1(r * 0.62) },
          { x: f1(cx + r * 0.5), y: f1(cy - r * 0.36), r: f1(r * 0.58) },
          { x: f1(cx + (rand() - 0.5) * r * 0.6), y: f1(cy - r * 0.62), r: f1(r * (0.4 + rand() * 0.14)) },
        ],
        hi: { x: f1(cx - r * 0.35), y: f1(cy - r * 0.45), rx: f1(r * 0.55), ry: f1(r * 0.38) },
        o: 0.92 + rand() * 0.08,
      };
    });
    const nLow = Math.round(n * 0.7);
    const low = Array.from({ length: nLow }, (_, i) => {
      const t = (i + 0.5) / nLow;
      return { x: f1(VW * (0.16 + t * 0.68) + (rand() - 0.5) * 24), y: f1(VH * 0.86 + (rand() - 0.5) * 8), rx: f1((wide ? 70 : 52) + rand() * 24), ry: f1((wide ? 30 : 24) + rand() * 10), o: 0.55 + rand() * 0.3 };
    });
    const nPeek = wide ? 7 : 4;
    const peeks = Array.from({ length: nPeek }, (_, i) => {
      const t = (i + 0.5) / nPeek;
      const x = left + (right - left) * t + (rand() - 0.5) * 30;
      return { x: f1(x), y: f1(surf(x) + 34 + rand() * 8), r: f1((wide ? 30 : 24) + rand() * 14) };
    });

    // --- flowers (multiply with memories), seed heads, tufts, hanging strands ---
    const flowersN = Math.min(wide ? 44 : 18, (dormant ? 2 : 4) + Math.round(count * (wide ? 1.2 : 1.5)));
    const flowers = Array.from({ length: flowersN }, () => {
      const x = left + 12 + (right - left - 24) * rand();
      return { x: f1(x), y: f1(surf(x) + 4 + rand() * 18), r: f1((wide ? 2.2 : 1.9) + rand() * 1.9), c: FLOWER_COLORS[Math.floor(rand() * FLOWER_COLORS.length)], rot: Math.round(rand() * 72) };
    });
    const seeds = Array.from({ length: wide ? 14 : 6 }, () => { const x = left + 16 + (right - left - 32) * rand(); return { x: f1(x), y: f1(surf(x) + 3 + rand() * 20), r: f1(0.8 + rand() * 0.8) }; });
    const tufts = Array.from({ length: wide ? 56 : 24 }, () => {
      const x = left + 10 + (right - left - 20) * rand(); const h = f1(4 + rand() * 6); const s = rand() > 0.5 ? 1 : -1;
      return { x: f1(x), y: f1(surf(x) + 2 + rand() * 22), h, s, d: f1(rand() * 3), dur: f1(2.8 + rand() * 2.2) };
    });
    const strandsN = wide ? 15 : 7;
    const strands = Array.from({ length: strandsN }, (_, i) => {
      const t = (i + 0.15 + rand() * 0.7) / strandsN;   // irregular spacing: a fringe, not a comb
      const k = t * (frontEdge.length - 1); const a = frontEdge[Math.floor(k)], b = frontEdge[Math.min(frontEdge.length - 1, Math.floor(k) + 1)]; const f = k - Math.floor(k);
      const x = a.x + (b.x - a.x) * f, y = a.y + (b.y - a.y) * f - 7;
      return { x: f1(x), y: f1(y), len: f1(5 + rand() * 13), s: rand() > 0.5 ? 1 : -1, o: f1(0.35 + rand() * 0.35) };
    });

    // --- lights and fireflies ---
    const lightsN = lights ? Math.min(wide ? 10 : 6, 2 + Math.round(count / 2.5)) : 0;
    const lightsArr = Array.from({ length: lightsN }, (_, i) => { const x = left + 24 + (right - left - 48) * rand(); return { x: f1(x), y: f1(surf(x) - 10 - rand() * 18), d: f1(rand() * 4), dur: f1(3 + rand() * 3), i }; });
    const ffN = lights ? (wide ? 9 : 4) : 0;
    const fireflies = Array.from({ length: ffN }, (_, i) => {
      const x = left + 20 + (right - left - 40) * rand();
      return { x: f1(x), y: f1(surf(x) - 18 - rand() * 46), dx: f1((rand() - 0.5) * 34), dy: f1((rand() - 0.5) * 24), d: f1(rand() * 6), dur: f1(5 + rand() * 4), r: f1(1.1 + rand() * 0.8), i };
    });

    return { clusters, low, peeks, flowers, seeds, tufts, strands, lightsArr, fireflies, grass, rim, bushBack, bushFront, shadowY: f1(surf(VW / 2) + 44) };
  }, [seed, count, wide, lights, dormant, VW, VH]);

  const gid = `isl${seed}`;
  const cls = ['island', className, selected ? 'island-selected' : '', dim ? 'island-dim' : '', dormant ? 'island-dormant' : '', wide ? 'island-wide' : '', onClick ? 'island-clickable' : ''].filter(Boolean).join(' ');

  return (
    <div className={cls} style={{ width, ['--w' as any]: `${width}px` }} onClick={onClick} role={onClick ? 'button' : undefined}>
      <svg viewBox={`0 0 ${VW} ${VH}`} width="100%" className="island-svg" aria-hidden="true">
        <defs>
          <radialGradient id={`${gid}-puff`} cx="38%" cy="32%" r="68%">
            <stop offset="0%" stopColor="var(--cloud-a)" stopOpacity="1" />
            <stop offset="48%" stopColor="var(--cloud-b)" stopOpacity="1" />
            <stop offset="82%" stopColor="var(--cloud-c)" stopOpacity="0.92" />
            <stop offset="100%" stopColor="var(--cloud-c)" stopOpacity="0" />
          </radialGradient>
          <radialGradient id={`${gid}-lobe`} cx="40%" cy="34%" r="64%">
            <stop offset="0%" stopColor="#fff4fa" stopOpacity="0.95" />
            <stop offset="35%" stopColor="var(--cloud-a)" stopOpacity="1" />
            <stop offset="78%" stopColor="var(--cloud-b)" stopOpacity="0.92" />
            <stop offset="100%" stopColor="var(--cloud-b)" stopOpacity="0" />
          </radialGradient>
          <radialGradient id={`${gid}-hi`} cx="40%" cy="35%" r="55%">
            <stop offset="0%" stopColor="#fff8fc" stopOpacity="0.7" />
            <stop offset="60%" stopColor="#fff8fc" stopOpacity="0.14" />
            <stop offset="100%" stopColor="#fff8fc" stopOpacity="0" />
          </radialGradient>
          <radialGradient id={`${gid}-low`}>
            <stop offset="0%" stopColor="var(--cloud-c)" stopOpacity="0.95" />
            <stop offset="55%" stopColor="var(--cloud-c)" stopOpacity="0.55" />
            <stop offset="100%" stopColor="var(--cloud-c)" stopOpacity="0" />
          </radialGradient>
          <radialGradient id={`${gid}-glow`}>
            <stop offset="0%" stopColor="var(--cloud-b)" stopOpacity="0.55" />
            <stop offset="60%" stopColor="var(--cloud-c)" stopOpacity="0.25" />
            <stop offset="100%" stopColor="var(--cloud-c)" stopOpacity="0" />
          </radialGradient>
          <radialGradient id={`${gid}-shade`}>
            <stop offset="0%" stopColor="#4a2a52" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#4a2a52" stopOpacity="0" />
          </radialGradient>
          <linearGradient id={`${gid}-grass`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#b4e08f" />
            <stop offset="28%" stopColor="#6cab5f" />
            <stop offset="68%" stopColor="#3f7d47" />
            <stop offset="100%" stopColor="#223f2c" />
          </linearGradient>
          <pattern id={`${gid}-moss`} width="19" height="15" patternUnits="userSpaceOnUse" patternTransform="rotate(-8)">
            <ellipse cx="4" cy="5" rx="3.4" ry="2" fill="#d2f0a8" opacity="0.32" />
            <ellipse cx="13.5" cy="10.5" rx="3.2" ry="1.9" fill="#28602f" opacity="0.32" />
            <ellipse cx="12" cy="3" rx="2" ry="1.2" fill="#eaf8cc" opacity="0.22" />
            <ellipse cx="6" cy="12" rx="1.6" ry="1" fill="#9fd37e" opacity="0.28" />
          </pattern>
          <radialGradient id={`${gid}-bushB`} cx="40%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#6aa65b" />
            <stop offset="100%" stopColor="#274f31" />
          </radialGradient>
          <radialGradient id={`${gid}-bushF`} cx="40%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#bfe598" />
            <stop offset="100%" stopColor="#5a9752" />
          </radialGradient>
          <radialGradient id={`${gid}-light`}>
            <stop offset="0%" stopColor="#fff6d6" stopOpacity="1" />
            <stop offset="30%" stopColor="#f6d78d" stopOpacity="0.65" />
            <stop offset="100%" stopColor="#f6d78d" stopOpacity="0" />
          </radialGradient>
          <radialGradient id={`${gid}-halo`}>
            <stop offset="0%" stopColor="#f6d78d" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#f6d78d" stopOpacity="0" />
          </radialGradient>
          <filter id={`${gid}-blur`} x="-30%" y="-40%" width="160%" height="180%">
            <feGaussianBlur stdDeviation={wide ? 14 : 10} />
          </filter>
        </defs>

        {/* selection halo */}
        <ellipse className="island-halo" cx={VW / 2} cy={VH * 0.55} rx={VW * 0.52} ry={VH * 0.5} fill={`url(#${gid}-halo)`} />

        <g className="isl-cloud">
          {/* soft under-glow: blurred once, gives the edge its half-transparent mist */}
          <ellipse cx={VW / 2} cy={VH * 0.74} rx={VW * 0.44} ry={VH * 0.2} fill={`url(#${gid}-glow)`} filter={`url(#${gid}-blur)`} />
          {/* shadow puffs along the underside */}
          {model.low.map((p, i) => <ellipse key={`l${i}`} cx={p.x} cy={p.y} rx={p.rx} ry={p.ry} fill={`url(#${gid}-low)`} opacity={p.o} />)}
          {/* cumulus bodies */}
          {model.clusters.map((c, i) => <ellipse key={`c${i}`} cx={c.cx} cy={c.cy} rx={c.rx} ry={c.ry} fill={`url(#${gid}-puff)`} opacity={c.o} />)}
          {/* lobes on top of the bodies */}
          {model.clusters.map((c, i) => c.lobes.map((l, k) => <circle key={`lb${i}-${k}`} cx={l.x} cy={l.y} r={l.r} fill={`url(#${gid}-lobe)`} opacity={c.o} />))}
          {/* highlights */}
          {model.clusters.map((c, i) => <ellipse key={`h${i}`} cx={c.hi.x} cy={c.hi.y} rx={c.hi.rx} ry={c.hi.ry} fill={`url(#${gid}-hi)`} />)}
          {/* light puffs peeking from under the moss */}
          {model.peeks.map((p, i) => <circle key={`pk${i}`} cx={p.x} cy={p.y} r={p.r} fill={`url(#${gid}-lobe)`} opacity="0.9" />)}
        </g>

        {/* the moss casts a soft shadow onto the cloud */}
        <ellipse cx={VW / 2} cy={model.shadowY} rx={VW * 0.4} ry={wide ? 22 : 18} fill={`url(#${gid}-shade)`} />
        {/* back bushes */}
        {model.bushBack.map((b, i) => <ellipse key={`bb${i}`} cx={b.x} cy={b.y} rx={b.rx} ry={b.ry} fill={`url(#${gid}-bushB)`} />)}
        {/* grass mound + moss texture + lit rim */}
        <path d={model.grass} fill={`url(#${gid}-grass)`} />
        <path d={model.grass} fill={`url(#${gid}-moss)`} opacity="0.9" />
        <path d={model.rim} fill="none" stroke="#dcf5b4" strokeWidth="1.6" strokeLinecap="round" opacity="0.42" />
        {/* hanging grass strands along the front edge */}
        {model.strands.map((s, i) => <path key={`st${i}`} d={`M${s.x},${s.y} q${2.6 * s.s},${s.len * 0.5} ${1.4 * s.s},${s.len}`} stroke="#4f8a47" strokeWidth="1" fill="none" strokeLinecap="round" opacity={s.o} />)}
        {/* front bushes with a lit cap */}
        {model.bushFront.map((b, i) => (
          <g key={`bf${i}`}>
            <ellipse cx={b.x} cy={b.y} rx={b.rx} ry={b.ry} fill={`url(#${gid}-bushF)`} opacity="0.92" />
            <ellipse cx={b.x - b.rx * 0.25} cy={b.y - b.ry * 0.4} rx={b.rx * 0.45} ry={b.ry * 0.35} fill="#e3f7c4" opacity="0.28" />
          </g>
        ))}
        {/* tufts: three blades each; the garden island sways them gently */}
        {model.tufts.map((t, i) => (
          <path key={`t${i}`} className={wide && i % 2 === 0 ? 'isl-grass' : undefined} style={wide ? ({ ['--d' as any]: `${t.d}s`, ['--dur' as any]: `${t.dur}s` }) : undefined}
            d={`M${t.x},${t.y} q${-2.2 * t.s},${-t.h * 0.7} ${-3 * t.s},${-t.h * 1.25} M${t.x},${t.y} q${0.3 * t.s},${-t.h * 0.9} ${0.6 * t.s},${-t.h * 1.5} M${t.x},${t.y} q${2.4 * t.s},${-t.h * 0.6} ${3.3 * t.s},${-t.h * 1.1}`}
            stroke="#cdeca6" strokeWidth="0.9" fill="none" strokeLinecap="round" opacity="0.62" />
        ))}
        {/* seed heads */}
        {model.seeds.map((s, i) => <circle key={`sd${i}`} cx={s.x} cy={s.y} r={s.r} fill="#fff8ea" opacity="0.7" />)}
        {/* flowers: a dotted petal ring around a centre */}
        {model.flowers.map((f, i) => (
          <g key={`f${i}`} transform={`rotate(${f.rot} ${f.x} ${f.y})`}>
            <line x1={f.x} y1={f.y + 1} x2={f.x} y2={f.y + 4.5} stroke="#2f5c3a" strokeWidth="0.8" />
            <circle cx={f.x} cy={f.y} r={f.r * 0.72} fill="none" stroke={f.c} strokeWidth={f.r * 0.95} strokeDasharray={`${(f.r * 0.72 * Math.PI * 2) / 5 * 0.62} ${(f.r * 0.72 * Math.PI * 2) / 5 * 0.38}`} />
            <circle cx={f.x} cy={f.y} r={f.r * 0.38} fill="#fff1c8" />
          </g>
        ))}
        {/* warm lights on thin stems */}
        {model.lightsArr.map((l) => (
          <g key={`g${l.i}`} className="island-light" style={{ ['--d' as any]: `${l.d}s`, ['--dur' as any]: `${l.dur}s` }}>
            <line x1={l.x} y1={l.y + 2} x2={l.x} y2={l.y + 16} stroke="#5f8f55" strokeWidth="0.8" opacity="0.8" />
            <circle cx={l.x} cy={l.y} r="12" fill={`url(#${gid}-light)`} />
            <circle cx={l.x} cy={l.y} r="1.8" fill="#fff8e0" />
          </g>
        ))}
        {/* fireflies */}
        {model.fireflies.map((f) => (
          <g key={`ff${f.i}`} className="isl-firefly" style={{ ['--d' as any]: `${f.d}s`, ['--dur' as any]: `${f.dur}s`, ['--dx' as any]: `${f.dx}px`, ['--dy' as any]: `${f.dy}px` }}>
            <circle cx={f.x} cy={f.y} r={f.r * 4} fill="#ffe9a8" opacity="0.18" />
            <circle cx={f.x} cy={f.y} r={f.r} fill="#fff4c4" />
          </g>
        ))}
      </svg>
      {children}
    </div>
  );
}
