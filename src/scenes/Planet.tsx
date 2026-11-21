// A small illustrated planet for the welcome screen: glowing atmosphere,
// drifting cloud band, green continents and a tilted ring of dust.
import React from 'react';
import type { PlanetTheme } from '../data/types';

const THEMES: Record<PlanetTheme, { a: string; b: string; c: string; ring: string }> = {
  rose: { a: '#f1c3d8', b: '#9a6cc2', c: '#3b2e7a', ring: '#f3c3d6' },
  lavender: { a: '#d9cdf4', b: '#8f7cc9', c: '#2f2a68', ring: '#c7b8ee' },
  mint: { a: '#cfeee3', b: '#6fa39a', c: '#24415a', ring: '#9fd3c3' },
  gold: { a: '#f6dcb2', b: '#c48a5a', c: '#4a2f3f', ring: '#f6d78d' },
};

export function Planet({ theme = 'rose', size = 300, className = '' }: { theme?: PlanetTheme; size?: number | string; className?: string }) {
  const t = THEMES[theme] || THEMES.rose;
  return (
    <svg viewBox="0 0 300 300" width={size} height={size} className={`planet ${className}`} aria-hidden="true">
      <defs>
        <radialGradient id="pl-body" cx="38%" cy="32%" r="75%">
          <stop offset="0%" stopColor={t.a} />
          <stop offset="45%" stopColor={t.b} />
          <stop offset="100%" stopColor={t.c} />
        </radialGradient>
        <radialGradient id="pl-atmo">
          <stop offset="60%" stopColor={t.a} stopOpacity="0" />
          <stop offset="78%" stopColor={t.a} stopOpacity="0.25" />
          <stop offset="100%" stopColor={t.a} stopOpacity="0" />
        </radialGradient>
        <radialGradient id="pl-shade" cx="70%" cy="70%" r="70%">
          <stop offset="40%" stopColor="#000" stopOpacity="0" />
          <stop offset="100%" stopColor="#05061a" stopOpacity="0.55" />
        </radialGradient>
        <clipPath id="pl-clip"><circle cx="150" cy="150" r="96" /></clipPath>
      </defs>
      <circle cx="150" cy="150" r="150" fill="url(#pl-atmo)" className="planet-atmo" />
      {/* ring back half */}
      <ellipse cx="150" cy="150" rx="140" ry="30" fill="none" stroke={t.ring} strokeWidth="6" opacity="0.35" transform="rotate(-18 150 150)" strokeDasharray="0 150 300" />
      <circle cx="150" cy="150" r="96" fill="url(#pl-body)" />
      <g clipPath="url(#pl-clip)">
        {/* continents */}
        <g opacity="0.85">
          <path d="M96 120c10-18 38-26 60-16 14 7 10 24 24 30 12 6 8 24-8 26-20 3-26-10-44-6-20 4-40-10-32-34z" fill="#8fb27a" />
          <path d="M170 190c14-10 36-6 44 8 6 12-6 26-22 24-12-2-18 6-30-2-10-8-4-24 8-30z" fill="#7aa36a" />
          <path d="M92 196c8-6 20-2 24 6s-4 18-14 16-18-14-10-22z" fill="#9fc28a" />
        </g>
        {/* drifting clouds */}
        <g className="planet-clouds">
          {[0, 1].map((k) => (
            <g key={k} transform={`translate(${k * 200},0)`}>
              <ellipse cx="60" cy="100" rx="34" ry="9" fill="#fff" opacity="0.5" />
              <ellipse cx="120" cy="150" rx="46" ry="10" fill="#fff" opacity="0.4" />
              <ellipse cx="30" cy="190" rx="30" ry="8" fill="#fff" opacity="0.35" />
              <ellipse cx="160" cy="80" rx="26" ry="7" fill="#fff" opacity="0.35" />
              <ellipse cx="150" cy="215" rx="38" ry="8" fill="#fff" opacity="0.3" />
            </g>
          ))}
        </g>
        {/* small lights on the night side */}
        {[[205, 140], [196, 168], [214, 160], [120, 215], [100, 150]].map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r="1.6" fill="#ffe9a8" className="planet-light" style={{ animationDelay: `${i * 0.6}s` }} />
        ))}
        <circle cx="150" cy="150" r="96" fill="url(#pl-shade)" />
      </g>
      <circle cx="150" cy="150" r="96" fill="none" stroke={t.a} strokeWidth="1" opacity="0.45" />
      {/* ring front half */}
      <ellipse cx="150" cy="150" rx="140" ry="30" fill="none" stroke={t.ring} strokeWidth="6" opacity="0.55" transform="rotate(-18 150 150)" strokeDasharray="300 150" strokeDashoffset="-20" strokeLinecap="round" />
      {/* moons */}
      <circle cx="262" cy="92" r="7" fill="#f6efe2" opacity="0.9" />
      <circle cx="44" cy="226" r="4" fill="#c7b8ee" opacity="0.9" />
    </svg>
  );
}
