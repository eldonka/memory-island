// ============================================================
// Ambience — the quiet life around islands and gardens: far, blurred clouds
// drifting behind everything (depth + parallax), pollen rising in the warm
// light, fireflies wandering in front. Pure CSS motion driven by variables,
// so the global reduced-motion rules switch it all off. Never catches a click.
// ============================================================
import React, { useMemo } from 'react';
import { mulberry32 } from '../plant/random';
import './ambience.css';

export interface AmbienceProps {
  seed: number;
  clouds?: number;     // far clouds (behind)
  pollen?: number;     // rising pollen (behind the island)
  fireflies?: number;  // wandering fireflies (in front)
  intensity?: number;  // multiplier for the far clouds' opacity (gardens keep them quieter)
  layer: 'back' | 'front';
  className?: string;
}

export function Ambience({ seed, clouds = 0, pollen = 0, fireflies = 0, intensity = 1, layer, className = '' }: AmbienceProps) {
  const model = useMemo(() => {
    const rand = mulberry32(seed * 7 + 3);
    const f1 = (v: number) => Number(v.toFixed(1));
    return {
      clouds: Array.from({ length: clouds }, (_, i) => ({
        i, x: f1(rand() * 100), y: f1(8 + rand() * 80), w: f1(26 + rand() * 30), h: f1(9 + rand() * 9),
        o: f1(0.1 + rand() * 0.14), dur: f1(90 + rand() * 90), d: f1(-rand() * 90), dir: rand() > 0.5 ? 1 : -1, blur: f1(10 + rand() * 12),
      })),
      pollen: Array.from({ length: pollen }, (_, i) => ({
        i, x: f1(5 + rand() * 90), y: f1(45 + rand() * 50), s: f1(2 + rand() * 2.4), dur: f1(9 + rand() * 9), d: f1(-rand() * 18), drift: f1((rand() - 0.5) * 60), o: f1(0.35 + rand() * 0.4),
      })),
      fireflies: Array.from({ length: fireflies }, (_, i) => ({
        i, x: f1(8 + rand() * 84), y: f1(30 + rand() * 50), s: f1(2.2 + rand() * 1.6), durX: f1(11 + rand() * 9), durY: f1(6 + rand() * 6), d: f1(-rand() * 12), dx: f1(30 + rand() * 90), dy: f1(18 + rand() * 40),
      })),
    };
  }, [seed, clouds, pollen, fireflies]);

  return (
    <div className={`ambience ambience-${layer} ${className}`} aria-hidden="true">
      {model.clouds.length > 0 && (
        <div className="amb-clouds">
          {model.clouds.map((c) => (
            <div key={c.i} className="amb-cloud" style={{ left: `${c.x}%`, top: `${c.y}%`, width: `${c.w}vw`, height: `${c.h}vw`, opacity: c.o * intensity,['--dur' as any]: `${c.dur}s`, ['--d' as any]: `${c.d}s`, ['--dir' as any]: c.dir, filter: `blur(${c.blur}px)` }} />
          ))}
        </div>
      )}
      {model.pollen.map((p) => (
        <span key={`p${p.i}`} className="amb-pollen" style={{ left: `${p.x}%`, top: `${p.y}%`, width: p.s, height: p.s, ['--dur' as any]: `${p.dur}s`, ['--d' as any]: `${p.d}s`, ['--drift' as any]: `${p.drift}px`, ['--o' as any]: p.o }} />
      ))}
      {model.fireflies.map((f) => (
        <span key={`f${f.i}`} className="amb-ff" style={{ left: `${f.x}%`, top: `${f.y}%`, ['--durx' as any]: `${f.durX}s`, ['--dury' as any]: `${f.durY}s`, ['--d' as any]: `${f.d}s`, ['--dx' as any]: `${f.dx}px`, ['--dy' as any]: `${f.dy}px` }}>
          <i style={{ width: f.s, height: f.s }} />
        </span>
      ))}
    </div>
  );
}
