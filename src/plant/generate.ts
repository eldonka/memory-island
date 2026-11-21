// ============================================================
// Plant generator — VisualParameters + music + seed → PlantParams.
// Deterministic: the same memory always grows the same plant.
// Every decision is explainable and recorded as a Reason.
// ============================================================
import type { MusicFeatures, ParticleStyle, PetalStyle, PlantParams, Reason, TextureStyle, VisualParameters } from '../data/types';
import { clamp, mulberry32 } from './random';
import { adjust, harmonize, mix, hexToHsl } from './colors';

const WARM_PALETTE = ['#f0b36a', '#e98f7a', '#f6d78d'];
const COOL_PALETTE = ['#8fb4e6', '#a7a0e0', '#c7d7f5'];
const SOFT_PALETTE = ['#d9a6c9', '#c7b8ee', '#f2d6c2'];

function argmax<T extends string>(scores: Record<T, number>): [T, T] {
  const entries = (Object.entries(scores) as [T, number][]).sort((a, b) => b[1] - a[1]);
  return [entries[0][0], entries[1][0]];
}

export function generatePlant(v: VisualParameters, m: MusicFeatures, seed: number): { plant: PlantParams; reasons: Reason[] } {
  const rand = mulberry32(seed);
  const reasons: Reason[] = [];

  // ---- petal style: a weighted vote between emotional qualities ----
  const styleScores: Record<PetalStyle, number> = {
    soft_rounded: v.calmness * 0.6 + v.warmth * 0.4 + 0.1,
    pointed: v.energy * 0.4 + v.wonder * 0.2 + 0.05,
    layered: v.joy * 0.6 + v.complexity * 0.3 + v.social * 0.2,
    angular: v.tension * 0.95 + (1 - v.calmness) * 0.2,
    bell: v.sadness * 0.65 + v.nostalgia * 0.35 + (1 - v.energy) * 0.1,
    wispy: v.nostalgia * 0.5 + v.calmness * 0.3 + v.night * 0.2 - v.joy * 0.2,
    star: v.wonder * 0.75 + v.night * 0.3,
  };
  const [style, second] = argmax(styleScores);
  const blend = v.complexity > 0.45 || styleScores[second] > styleScores[style] * 0.8;
  const inner: PetalStyle = blend ? second : style;
  reasons.push({ source: 'user', code: `plant.style.${style}`, values: { score: Math.round(styleScores[style] * 100) } });
  if (blend) reasons.push({ source: 'user', code: 'plant.blend', values: { inner } });

  const layers = clamp(1 + (v.complexity > 0.4 ? 1 : 0) + (v.joy > 0.55 || style === 'layered' ? 1 : 0), 1, 3);
  const baseCount: Record<PetalStyle, number> = { soft_rounded: 6, pointed: 8, layered: 8, angular: 7, bell: 5, wispy: 11, star: 6 };
  const petal_count = Math.round(clamp(baseCount[style] + v.complexity * 3 + (v.energy > 0.6 ? 1 : 0) - (v.calmness > 0.7 ? 1 : 0), 4, 14));
  const petal_length = clamp(0.85 + v.tension * 0.35 + v.wonder * 0.1 - v.joy * 0.1 + (rand() - 0.5) * 0.08, 0.7, 1.35);
  const petal_width = clamp(0.8 + v.calmness * 0.35 + v.warmth * 0.15 - v.tension * 0.35 + (rand() - 0.5) * 0.08, 0.5, 1.3);

  // ---- colors: from the photographs, harmonized into the island palette ----
  let petals: string[];
  let colorSource: 'photo' | 'mood';
  if (v.dominant_colors.length >= 2) {
    petals = v.dominant_colors.slice(0, 3).map((c) => harmonize(c, v.warmth, v.night));
    colorSource = 'photo';
  } else {
    petals = v.warmth > 0.6 ? WARM_PALETTE : v.warmth < 0.4 ? COOL_PALETTE : SOFT_PALETTE;
    colorSource = 'mood';
  }
  if (petals.length === 2) petals.push(adjust(petals[0], 25, 0, 0.08));
  const relief_gradient = v.tension > 0.4 && v.relief > 0.3;
  if (relief_gradient) {
    // tension → relief: cool base, warm tip on every petal
    petals = [harmonize('#7f9fd8', 0.3, v.night), harmonize('#f0b36a', 0.8, v.night), petals[0]];
    reasons.push({ source: 'text', code: 'plant.relief' });
  }
  reasons.push({ source: colorSource === 'photo' ? 'photo' : 'text', code: `plant.colors.${colorSource}`, values: { colors: petals.join(' ') } });

  const center = v.warmth > 0.55 ? '#f6d78d' : v.night > 0.6 ? '#d8ccf5' : '#fff3d6';
  const glow = adjust(petals[0], 0, 0.05, 0.12);
  const stemBase = v.warmth > 0.55 ? '#7fa552' : v.warmth < 0.4 ? '#4f8a8c' : '#5f9b55';
  const stem = mix(stemBase, '#2b4a3a', v.night * 0.4);
  const leaf = mix(adjust(stemBase, 0, 0.05, 0.08), '#2e5a40', v.night * 0.35);

  // ---- stem & leaves ----
  const stem_height = clamp(0.6 + v.complexity * 0.2 + v.wonder * 0.1 + rand() * 0.06, 0.58, 0.96);
  const stem_curve = clamp((v.calmness * 0.8 + v.nostalgia * 0.2) * (1 - v.tension * 0.5));
  const stem_kinks = v.tension > 0.35 ? Math.round(1 + v.tension * 4) : 0;
  const bloom_tilt = style === 'bell' ? 28 + v.sadness * 22 : (rand() - 0.5) * 10 + (v.calmness - 0.5) * 8;
  const leaf_count = Math.round(clamp(2 + v.complexity * 1.5 + (v.dominant_colors.length ? 0.5 : 0), 2, 5));
  const leaf_shape = v.tension > 0.45 ? 'serrated' : v.calmness > 0.55 ? 'round' : 'pointed';
  if (stem_kinks > 0) reasons.push({ source: 'text', code: 'plant.kinks', values: { kinks: stem_kinks } });
  else reasons.push({ source: 'text', code: 'plant.curve', values: { curve: Math.round(stem_curve * 100) } });

  // ---- light ----
  const glow_intensity = clamp(0.3 + v.nostalgia * 0.25 + v.night * 0.25 + v.wonder * 0.2 + v.joy * 0.1, 0.25, 1);
  reasons.push({ source: 'text', code: 'plant.glow', values: { glow: Math.round(glow_intensity * 100) } });

  // ---- motion: led by the song ----
  const sway_speed = clamp(0.7 * m.tempo + 0.3 * m.energy);
  const sway_amplitude = 2 + v.energy * 6 + (1 - v.calmness) * 2;
  const pulse_period = clamp(m.bpm ? (60 / m.bpm) * 2 : 2.4, 0.6, 4);
  reasons.push({ source: 'music', code: 'plant.motion', values: { bpm: m.bpm ?? 0, sway: Math.round(sway_speed * 100), pulse: pulse_period.toFixed(1) } });

  // ---- particles ----
  const particleScores: Record<Exclude<ParticleStyle, 'none'>, number> = {
    sparkle: v.joy, mist: v.calmness * (1 - v.energy), spark: v.tension, petalfall: (v.nostalgia + v.sadness) / 2, firefly: v.night * 0.8 + v.wonder * 0.4,
  };
  const [pStyle] = argmax(particleScores);
  const particle_style: ParticleStyle = particleScores[pStyle] > 0.3 ? pStyle : 'none';
  const particle_density = clamp(0.2 + v.energy * 0.4 + v.joy * 0.3, 0.1, 1);
  reasons.push({ source: 'text', code: `plant.particles.${particle_style}` });

  // ---- texture: the artistic technique (see docs/ART.md) ----
  const textureScores: Record<Exclude<TextureStyle, 'none'>, number> = {
    brush: v.calmness * 0.6 + v.warmth * 0.4,
    lines: v.tension,
    confetti: v.joy * 0.6 + v.energy * 0.4,
    ink: (v.sadness + v.nostalgia) / 2 + (1 - v.energy) * 0.2,
  };
  const [tStyle] = argmax(textureScores);
  const texture: TextureStyle = textureScores[tStyle] > 0.35 ? tStyle : 'none';
  reasons.push({ source: 'text', code: `plant.texture.${texture}` });

  const plant: PlantParams = {
    petal_style: style, petal_style_inner: inner, petal_count, layers, petal_length, petal_width,
    colors: { petals, center, glow, stem, leaf },
    stem_height, stem_curve, stem_kinks, bloom_tilt, leaf_count, leaf_shape,
    glow_intensity, sway_speed, sway_amplitude, pulse_period, particle_style, particle_density, texture, relief_gradient, seed,
  };
  return { plant, reasons };
}

/** Readable summary of a color for explanations */
export function describeColor(hex: string): string {
  const { h, s, l } = hexToHsl(hex);
  if (s < 0.15) return l > 0.6 ? 'ivory' : 'grey';
  if (h < 20 || h >= 340) return 'rose';
  if (h < 45) return 'amber';
  if (h < 70) return 'gold';
  if (h < 160) return 'green';
  if (h < 200) return 'teal';
  if (h < 250) return 'blue';
  if (h < 290) return 'violet';
  return 'magenta';
}
