// ============================================================
// Plant — procedural SVG flower driven entirely by PlantParams.
// `growth` (0..1) renders any stage from seed to full bloom, so the
// same component powers the planting animation and the final plant.
// ============================================================
import React, { useMemo } from 'react';
import type { LeafShape, PetalStyle, PlantParams, TextureStyle } from '../data/types';
import { mulberry32, clamp, smooth } from './random';
import { adjust, withAlpha } from './colors';
import './plant.css';

export interface PlantProps {
  params: PlantParams;
  id: string;
  growth?: number;      // 0..1
  reveal?: number;      // 0..3
  width?: number;       // css px
  animate?: boolean;
  className?: string;
  style?: React.CSSProperties;
  onClick?: () => void;
  title?: string;
  dim?: boolean;
}

export const VIEW_W = 200, VIEW_H = 320, BASE_X = 100, BASE_Y = 300;

function petalPath(style: PetalStyle, L: number, W: number): string {
  switch (style) {
    case 'soft_rounded':
      return `M0,0 C${-W},${-L * 0.35} ${-W * 1.05},${-L * 0.82} 0,${-L} C${W * 1.05},${-L * 0.82} ${W},${-L * 0.35} 0,0Z`;
    case 'pointed':
      return `M0,0 C${-W * 0.95},${-L * 0.28} ${-W * 0.55},${-L * 0.85} 0,${-L} C${W * 0.55},${-L * 0.85} ${W * 0.95},${-L * 0.28} 0,0Z`;
    case 'layered':
      return `M0,0 C${-W},${-L * 0.3} ${-W * 1.15},${-L * 0.8} ${-W * 0.42},${-L * 0.93} Q0,${-L * 0.8} ${W * 0.42},${-L * 0.93} C${W * 1.15},${-L * 0.8} ${W},${-L * 0.3} 0,0Z`;
    case 'angular':
      return `M0,0 L${-W * 0.55},${-L * 0.38} L${-W * 0.3},${-L * 0.72} L0,${-L} L${W * 0.3},${-L * 0.72} L${W * 0.55},${-L * 0.38}Z`;
    case 'bell':
      return `M0,0 C${-W * 0.35},${-L * 0.3} ${-W * 0.45},${-L * 0.7} ${-W * 0.95},${-L} C${-W * 0.3},${-L * 0.88} ${W * 0.3},${-L * 0.88} ${W * 0.95},${-L} C${W * 0.45},${-L * 0.7} ${W * 0.35},${-L * 0.3} 0,0Z`;
    case 'wispy':
      return `M0,0 C${-W * 0.32},${-L * 0.45} ${-W * 0.3},${-L * 0.92} 0,${-L} C${W * 0.3},${-L * 0.92} ${W * 0.32},${-L * 0.45} 0,0Z`;
    case 'star':
      return `M0,0 L${-W * 0.62},${-L * 0.45} L${-W * 0.12},${-L * 0.62} L0,${-L} L${W * 0.12},${-L * 0.62} L${W * 0.62},${-L * 0.45}Z`;
  }
}

function leafPath(shape: LeafShape): string {
  switch (shape) {
    case 'round': return 'M0,0 C8,-11 24,-11 34,0 C24,10 8,10 0,0Z';
    case 'pointed': return 'M0,0 C10,-10 28,-9 38,0 C28,5 10,8 0,0Z';
    case 'serrated': return 'M0,0 L8,-6 L12,-3 L20,-8 L24,-4 L32,-7 L38,0 L30,4 L23,2 L15,6 L9,3Z';
  }
}

interface Pt { x: number; y: number }

function buildStem(p: PlantParams, rand: () => number): { pts: Pt[]; d: string; top: Pt; len: number } {
  const len = 140 + 95 * p.stem_height;
  const lean = Math.sign(p.bloom_tilt || 1) * Math.min(14, Math.abs(p.bloom_tilt) * 0.35);
  const pts: Pt[] = [];
  if (p.stem_kinks > 0) {
    const n = p.stem_kinks + 1;
    const amp = 6 + p.stem_kinks * 1.6;
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const off = i === 0 || i === n ? 0 : amp * (i % 2 === 0 ? -1 : 1) * (0.7 + rand() * 0.5);
      pts.push({ x: BASE_X + lean * t + off, y: BASE_Y - len * t });
    }
    const d = pts.map((q, i) => `${i === 0 ? 'M' : 'L'}${q.x.toFixed(1)},${q.y.toFixed(1)}`).join(' ');
    return { pts, d, top: pts[pts.length - 1], len };
  }
  const N = 14;
  const amp = 8 + 20 * p.stem_curve;
  const phase = rand() * Math.PI;
  const freq = 1.0 + rand() * 0.5;
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    pts.push({ x: BASE_X + lean * t + amp * Math.sin(t * Math.PI * freq + phase) * t, y: BASE_Y - len * t });
  }
  // Catmull-Rom → cubic Bezier
  let d = `M${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
    const c1 = { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 };
    const c2 = { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 };
    d += ` C${c1.x.toFixed(1)},${c1.y.toFixed(1)} ${c2.x.toFixed(1)},${c2.y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
  }
  return { pts, d, top: pts[pts.length - 1], len };
}

function pointAt(pts: Pt[], t: number): Pt {
  const i = Math.min(pts.length - 2, Math.floor(t * (pts.length - 1)));
  const f = t * (pts.length - 1) - i;
  return { x: pts[i].x + (pts[i + 1].x - pts[i].x) * f, y: pts[i].y + (pts[i + 1].y - pts[i].y) * f };
}

function Texture({ id, texture, colors }: { id: string; texture: TextureStyle; colors: string[] }) {
  if (texture === 'brush') return (
    <pattern id={`${id}-tex`} width="11" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(-20)">
      <ellipse cx="3" cy="4" rx="3.2" ry="1.6" fill="#fff" opacity="0.28" />
      <ellipse cx="8.5" cy="7" rx="2.6" ry="1.3" fill="#fff" opacity="0.18" />
    </pattern>
  );
  if (texture === 'lines') return (
    <pattern id={`${id}-tex`} width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(35)">
      <line x1="0" y1="0" x2="0" y2="7" stroke="#1b1a3a" strokeWidth="0.9" opacity="0.35" />
      <circle cx="4.5" cy="3.5" r="0.7" fill="#1b1a3a" opacity="0.35" />
    </pattern>
  );
  if (texture === 'confetti') return (
    <pattern id={`${id}-tex`} width="12" height="12" patternUnits="userSpaceOnUse">
      <circle cx="2" cy="3" r="1.1" fill={adjust(colors[1] || colors[0], 40, 0.1, 0.15)} opacity="0.75" />
      <circle cx="8" cy="7" r="0.9" fill="#fff" opacity="0.6" />
      <circle cx="5" cy="10" r="0.8" fill={adjust(colors[2] || colors[0], -40, 0.1, 0.1)} opacity="0.7" />
    </pattern>
  );
  return null;
}

export const Plant = React.memo(function Plant({ params: p, id, growth = 1, reveal = 0, width = 160, animate = true, className = '', style, onClick, title, dim }: PlantProps) {
  const g = clamp(growth);
  const model = useMemo(() => {
    const rand = mulberry32(p.seed);
    const stem = buildStem(p, rand);
    const leafTs = [0.3, 0.5, 0.64, 0.76, 0.86].slice(0, p.leaf_count);
    const leaves = leafTs.map((t, i) => {
      const pt = pointAt(stem.pts, t);
      const side = i % 2 === 0 ? 1 : -1;
      return { pt, side, angle: -18 - rand() * 22, scale: 0.85 + rand() * 0.4 };
    });
    const R = 34 * p.petal_length;
    const W = 13 * p.petal_width;
    const particles = Array.from({ length: Math.round(p.particle_density * 8) }, (_, i) => ({
      x: stem.top.x + (rand() - 0.5) * R * 3.2,
      y: stem.top.y + (rand() - 0.6) * R * 2.8,
      r: 1 + rand() * 1.8,
      delay: rand() * 4,
      dur: 2 + rand() * 3,
      dx: (rand() - 0.5) * 40,
      dy: (rand() - 0.5) * 30,
      i,
    }));
    return { stem, leaves, R, W, particles };
  }, [p]);

  const { stem, leaves, R, W, particles } = model;
  const stemProg = clamp((g - 0.12) / 0.4);
  const bloomG = clamp((g - 0.58) / 0.34);
  const bloomScale = bloomG === 0 ? 0 : 0.2 + 0.8 * (1 - Math.pow(1 - bloomG, 2.2));
  const glowG = clamp((g - 0.82) / 0.18);
  const seedG = g < 0.2 ? 1 - g / 0.2 : 0;
  const revealBoost = 1 + reveal * 0.22;
  const glowOpacity = p.glow_intensity * glowG * (0.55 + 0.45 * Math.min(1, reveal / 3)) * (dim ? 0.5 : 1);
  const petalColors = p.colors.petals;
  const inkStroke = p.texture === 'ink';

  const vars = {
    '--sway-dur': `${(4.8 - p.sway_speed * 3.2).toFixed(2)}s`,
    '--sway-amp': `${p.sway_amplitude.toFixed(1)}deg`,
    '--pulse-dur': `${p.pulse_period.toFixed(2)}s`,
    '--breathe-amp': `${(1 + 0.012 + p.sway_speed * 0.02).toFixed(3)}`,
    ...style,
  } as React.CSSProperties;

  const cls = ['plant', className, animate && g >= 1 ? 'plant-animate' : '', p.stem_kinks > 0 ? 'plant-jitter' : '', onClick ? 'plant-clickable' : '', dim ? 'plant-dim' : ''].filter(Boolean).join(' ');

  return (
    <svg
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      width={width}
      height={width * (VIEW_H / VIEW_W)}
      className={cls}
      style={vars}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      aria-label={title}
      data-reveal={reveal}
    >
      {title && <title>{title}</title>}
      <defs>
        <radialGradient id={`${id}-glow`}>
          <stop offset="0%" stopColor={p.colors.glow} stopOpacity="0.9" />
          <stop offset="45%" stopColor={p.colors.glow} stopOpacity="0.35" />
          <stop offset="100%" stopColor={p.colors.glow} stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`${id}-center`}>
          <stop offset="0%" stopColor={adjust(p.colors.center, 0, 0, 0.1)} />
          <stop offset="70%" stopColor={p.colors.center} />
          <stop offset="100%" stopColor={adjust(p.colors.center, -10, 0.1, -0.22)} />
        </radialGradient>
        {petalColors.map((c, i) => (
          <linearGradient key={i} id={`${id}-pet${i}`} x1="0" y1="0" x2="0" y2="1">
            {p.relief_gradient ? (
              <>
                <stop offset="0%" stopColor={petalColors[1]} />
                <stop offset="55%" stopColor={adjust(petalColors[1], 0, -0.1, -0.05)} />
                <stop offset="100%" stopColor={petalColors[0]} />
              </>
            ) : (
              <>
                <stop offset="0%" stopColor={adjust(c, 0, 0.05, 0.14)} />
                <stop offset="60%" stopColor={c} />
                <stop offset="100%" stopColor={adjust(c, -6, 0.05, -0.16)} />
              </>
            )}
          </linearGradient>
        ))}
        <linearGradient id={`${id}-leaf`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={adjust(p.colors.leaf, 0, 0, -0.08)} />
          <stop offset="100%" stopColor={adjust(p.colors.leaf, 0, 0.05, 0.1)} />
        </linearGradient>
        <Texture id={id} texture={p.texture} colors={petalColors} />
      </defs>

      {/* seed */}
      {seedG > 0 && (
        <g opacity={seedG}>
          <circle cx={BASE_X} cy={BASE_Y - 2} r={10 + (1 - seedG) * 16} fill="none" stroke={p.colors.glow} strokeWidth="1.2" opacity={0.6 * seedG} />
          <ellipse cx={BASE_X} cy={BASE_Y - 3} rx="4.5" ry="3.2" fill="#6b4a2b" />
          <ellipse cx={BASE_X - 1.2} cy={BASE_Y - 4} rx="1.4" ry="0.9" fill="#a3764b" opacity="0.7" />
        </g>
      )}

      {/* glow halo */}
      <circle className="plant-glow" cx={stem.top.x} cy={stem.top.y} r={R * 1.9 * revealBoost} fill={`url(#${id}-glow)`} opacity={glowOpacity} />

      {/* stem */}
      <path d={stem.d} fill="none" stroke={adjust(p.colors.stem, 0, 0, -0.12)} strokeWidth={p.stem_kinks ? 3 : 3.4} strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - stemProg} />
      <path d={stem.d} fill="none" stroke={adjust(p.colors.stem, 0, 0.05, 0.1)} strokeWidth={1.1} strokeLinecap="round" strokeLinejoin="round" opacity="0.6" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - stemProg} transform="translate(-0.8,0)" />

      {/* leaves */}
      {leaves.map((lf, i) => {
        const lg = clamp((g - (0.32 + i * 0.08)) / 0.16);
        const s = lf.scale * smooth(lg);
        const tr = `translate(${lf.pt.x.toFixed(1)},${lf.pt.y.toFixed(1)}) rotate(${lf.side > 0 ? lf.angle : 180 - lf.angle}) scale(${(s * lf.side).toFixed(3)},${s.toFixed(3)})`;
        return (
          <g key={i} transform={tr} className="plant-leaf">
            <path d={leafPath(p.leaf_shape)} fill={`url(#${id}-leaf)`} stroke={adjust(p.colors.leaf, 0, 0, -0.2)} strokeWidth="0.6" />
            <path d="M2,0 L32,0" stroke={adjust(p.colors.leaf, 0, 0, 0.2)} strokeWidth="0.7" opacity="0.5" />
          </g>
        );
      })}

      {/* bloom */}
      {bloomScale > 0 && (
        <g transform={`translate(${stem.top.x.toFixed(1)},${stem.top.y.toFixed(1)}) rotate(${p.bloom_tilt.toFixed(1)}) scale(${bloomScale.toFixed(3)})`}>
          <g className="plant-bloom">
            {Array.from({ length: p.layers }, (_, layer) => {
              const li = p.layers - 1 - layer; // draw outer first
              const count = Math.max(4, p.petal_count - li * 2);
              const scale = Math.pow(0.72, li);
              const styleL = li === 0 ? p.petal_style : p.petal_style_inner;
              const d = petalPath(styleL, R, W * (styleL === 'wispy' ? 0.75 : 1));
              const color = petalColors[li % petalColors.length];
              return (
                /* each layer is a group so the inner layers can drift softly against the outer one */
                <g key={`layer-${li}`} className={`plant-layer plant-layer-${li}`}>
                  {Array.from({ length: count }, (_, i) => {
                    const unf = clamp((bloomG - (i / count) * 0.25) / 0.75);
                    const ang = (360 / count) * i + li * (180 / count) + (1 - unf) * 30;
                    const sc = scale * (0.3 + 0.7 * unf);
                    return (
                      <g key={`${li}-${i}`} transform={`rotate(${ang.toFixed(1)}) scale(${sc.toFixed(3)})`}>
                        <path d={d} fill={`url(#${id}-pet${petalColors.indexOf(color)})`} opacity={styleL === 'wispy' ? 0.78 : inkStroke ? 0.9 : 0.96}
                          stroke={inkStroke ? adjust(color, 0, 0.1, -0.35) : adjust(color, 0, 0, -0.1)} strokeWidth={inkStroke ? 0.9 : 0.35} strokeLinejoin="round" />
                        {p.texture !== 'none' && p.texture !== 'ink' && <path d={d} fill={`url(#${id}-tex)`} opacity={0.9} />}
                      </g>
                    );
                  })}
                </g>
              );
            })}
            {/* center */}
            <circle r={7 + p.petal_count * 0.45} fill={`url(#${id}-center)`} stroke={adjust(p.colors.center, 0, 0, -0.3)} strokeWidth="0.5" />
            {Array.from({ length: p.petal_count }, (_, i) => {
              const a = (Math.PI * 2 * i) / p.petal_count;
              const rr = (7 + p.petal_count * 0.45) * 0.62;
              return <circle key={i} cx={Math.cos(a) * rr} cy={Math.sin(a) * rr} r="1.1" fill={adjust(p.colors.center, -15, 0.2, -0.3)} opacity="0.75" />;
            })}
          </g>
        </g>
      )}

      {/* particles */}
      {g >= 1 && animate && p.particle_style !== 'none' && particles.map((pt) => (
        <circle
          key={pt.i}
          className={`pt pt-${p.particle_style}`}
          cx={pt.x} cy={pt.y} r={pt.r}
          fill={p.particle_style === 'petalfall' ? petalColors[pt.i % petalColors.length] : p.particle_style === 'firefly' ? '#ffe9a8' : p.particle_style === 'spark' ? '#dfe8ff' : '#fff6dc'}
          style={{ '--d': `${pt.delay.toFixed(2)}s`, '--dur': `${pt.dur.toFixed(2)}s`, '--dx': `${pt.dx.toFixed(1)}px`, '--dy': `${pt.dy.toFixed(1)}px` } as React.CSSProperties}
        />
      ))}
      {reveal > 0 && (
        <circle cx={stem.top.x} cy={stem.top.y} r={R * 2.6} fill="none" stroke={withAlpha(p.colors.glow, 0.25)} strokeWidth="0.8" className="plant-reveal-ring" />
      )}
    </svg>
  );
});

export default Plant;
