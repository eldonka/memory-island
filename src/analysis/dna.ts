// ============================================================
// Memory DNA — merges text, photo and music features into one
// explainable set of visual parameters. Every notable influence is
// recorded as a Reason so the UI can answer "Why does my flower look like this?"
// ============================================================
import type { MusicFeatures, PhotoFeatures, Reason, TextFeatures, VisualParameters } from '../data/types';
import { clamp } from '../plant/random';

export function buildVisual(t: TextFeatures, p: PhotoFeatures, m: MusicFeatures): { visual: VisualParameters; reasons: Reason[] } {
  const reasons: Reason[] = [];
  const hasPhotos = p.count > 0 && p.dominant.length > 0;
  const hasMusic = m.source !== 'none';

  // ---- text contributions ----
  let warmth = 0.5 + t.warmth * 0.35 - t.cold * 0.3;
  let energy = 0.3 + t.energy * 0.3 + t.joy * 0.15 + t.intensity * 0.1;
  let calmness = 0.5 + t.calm * 0.35 + t.nature * 0.1 - t.tension * 0.35 - t.energy * 0.2;
  let nostalgia = 0.2 + t.nostalgia * 0.6 + t.sadness * 0.1;
  let tension = 0.1 + t.tension * 0.6 + t.work * 0.1 + t.intensity * 0.1;
  let joy = 0.15 + t.joy * 0.6 + t.social * 0.1;
  let sadness = 0.1 + t.sadness * 0.65 + t.cold * 0.1;
  let wonder = 0.15 + t.wonder * 0.6 + t.night * 0.1;
  let complexity = 0.2 + t.complexity * 0.4;
  let night = 0.2 + t.night * 0.5 - t.morning * 0.3;
  const social = t.social;
  const relief = t.relief;

  const textCats: (keyof TextFeatures)[] = ['warmth', 'cold', 'joy', 'sadness', 'calm', 'tension', 'energy', 'nostalgia', 'wonder', 'social', 'nature', 'night', 'relief'];
  for (const c of textCats) {
    const v = t[c] as number;
    if (v > 0.22 && t.matched[c]?.length) {
      reasons.push({ source: 'text', code: `text.${c}`, values: { words: t.matched[c].slice(0, 4).join(', '), score: Math.round(v * 100) } });
    }
  }
  if (t.season) reasons.push({ source: 'text', code: 'text.season', values: { season: t.season } });
  if (t.intensity > 0.45) reasons.push({ source: 'text', code: 'text.intensity', values: { score: Math.round(t.intensity * 100) } });

  // ---- photo contributions ----
  if (hasPhotos) {
    warmth += (p.warmth - 0.5) * 0.5;
    nostalgia += (1 - p.saturation) * 0.2;
    tension += p.contrast * 0.1;
    joy += p.saturation * 0.1;
    wonder += p.hueVariety * 0.1;
    complexity += p.hueVariety * 0.2 + clamp(p.count / 5) * 0.1;
    night += (1 - p.brightness) * 0.3 - 0.1;
    reasons.push({ source: 'photo', code: 'photo.colors', values: { colors: p.dominant.slice(0, 3).join(' '), count: p.count } });
    reasons.push({ source: 'photo', code: `photo.atmo.${p.atmosphere}`, values: { brightness: Math.round(p.brightness * 100), warmth: Math.round(p.warmth * 100) } });
    if (p.saturation < 0.25) reasons.push({ source: 'photo', code: 'photo.faded', values: { saturation: Math.round(p.saturation * 100) } });
    if (p.hueVariety > 0.6) reasons.push({ source: 'photo', code: 'photo.variety', values: { variety: Math.round(p.hueVariety * 100) } });
  }

  // ---- music contributions (motion & rhythm are led by the song) ----
  if (hasMusic) {
    energy += (m.energy - 0.45) * 0.5 + (m.tempo - 0.45) * 0.25;
    calmness += (0.45 - m.tempo) * 0.3 + (0.45 - m.energy) * 0.2;
    complexity += m.dynamics * 0.2;
    if (m.mood === 'bright') { joy += 0.1; warmth += 0.05; }
    if (m.mood === 'melancholic') { sadness += 0.12; nostalgia += 0.1; warmth -= 0.05; }
    if (t.tension > 0.2) tension += m.energy * 0.1;
    reasons.push({ source: 'music', code: m.source === 'audio' ? 'music.audio' : 'music.descriptors', values: { bpm: m.bpm ?? 0, energy: Math.round(m.energy * 100), dynamics: Math.round(m.dynamics * 100) } });
    if (m.mood) reasons.push({ source: 'music', code: `music.mood.${m.mood}` });
    if (m.genre) reasons.push({ source: 'music', code: 'music.genre', values: { genre: m.genre } });
  } else {
    reasons.push({ source: 'music', code: 'music.none' });
  }

  const visual: VisualParameters = {
    warmth: clamp(warmth), energy: clamp(energy), calmness: clamp(calmness), nostalgia: clamp(nostalgia),
    tension: clamp(tension), joy: clamp(joy), sadness: clamp(sadness), wonder: clamp(wonder),
    complexity: clamp(complexity), night: clamp(night), social: clamp(social), relief: clamp(relief),
    dominant_colors: hasPhotos ? p.dominant.slice(0, 4) : [],
  };
  return { visual, reasons };
}

export const VISUAL_KEYS: (keyof VisualParameters)[] = ['warmth', 'energy', 'calmness', 'nostalgia', 'tension', 'joy', 'sadness', 'wonder', 'complexity', 'night'];

/** A neutral DNA profile used where a friend's garden-only day arrives without its scores. Reveals nothing. */
export const NEUTRAL_VISUAL: Readonly<VisualParameters> = Object.freeze({
  warmth: 0.5, energy: 0.5, calmness: 0.5, nostalgia: 0.5, tension: 0.5, joy: 0.5, sadness: 0.5, wonder: 0.5,
  complexity: 0.5, night: 0.5, social: 0.5, relief: 0.5, dominant_colors: [] as string[],
});
