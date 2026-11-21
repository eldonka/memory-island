// Plant generator — VisualParameters + music + seed → PlantParams.
// These tests pin the explainable, deterministic relationship between a day and its flower.
import { describe, it, expect } from 'vitest';
import { generatePlant, describeColor } from './generate';
import { mulberry32 } from './random';
import { hexToHsl } from './colors';
import { EMPTY_MUSIC_FEATURES, musicFromDescriptors, musicFromAnalysis } from '../analysis/music';
import { sanitizeSharedMemory } from '../data/planetFile';
import type { MusicFeatures, PlantParams, VisualParameters } from '../data/types';

const vis = (o: Partial<VisualParameters> = {}): VisualParameters => ({
  warmth: 0.5, energy: 0.4, calmness: 0.5, nostalgia: 0.3, tension: 0.2, joy: 0.4, sadness: 0.2, wonder: 0.3, complexity: 0.35, night: 0.3, social: 0.3, relief: 0.1, dominant_colors: [], ...o,
});
const HEX = /^#[0-9a-f]{6}$/;
const PETALS = ['soft_rounded', 'pointed', 'layered', 'angular', 'bell', 'wispy', 'star'];
const LEAVES = ['round', 'pointed', 'serrated'];
const PARTICLES = ['sparkle', 'mist', 'spark', 'petalfall', 'firefly', 'none'];
const TEXTURES = ['brush', 'lines', 'confetti', 'ink', 'none'];

/** documented output ranges (also the ranges the planet importer accepts without altering a value) */
function assertValidPlant(p: PlantParams) {
  expect(PETALS).toContain(p.petal_style); expect(PETALS).toContain(p.petal_style_inner);
  expect(Number.isInteger(p.petal_count)).toBe(true); expect(p.petal_count).toBeGreaterThanOrEqual(4); expect(p.petal_count).toBeLessThanOrEqual(14);
  expect(Number.isInteger(p.layers)).toBe(true); expect(p.layers).toBeGreaterThanOrEqual(1); expect(p.layers).toBeLessThanOrEqual(3);
  expect(p.petal_length).toBeGreaterThanOrEqual(0.7); expect(p.petal_length).toBeLessThanOrEqual(1.35);
  expect(p.petal_width).toBeGreaterThanOrEqual(0.5); expect(p.petal_width).toBeLessThanOrEqual(1.3);
  expect(p.colors.petals.length).toBeGreaterThanOrEqual(2); expect(p.colors.petals.length).toBeLessThanOrEqual(4);
  for (const c of [...p.colors.petals, p.colors.center, p.colors.glow, p.colors.stem, p.colors.leaf]) expect(c).toMatch(HEX);
  expect(p.stem_height).toBeGreaterThanOrEqual(0.58); expect(p.stem_height).toBeLessThanOrEqual(0.96);
  expect(p.stem_curve).toBeGreaterThanOrEqual(0); expect(p.stem_curve).toBeLessThanOrEqual(1);
  expect(Number.isInteger(p.stem_kinks)).toBe(true); expect(p.stem_kinks).toBeGreaterThanOrEqual(0); expect(p.stem_kinks).toBeLessThanOrEqual(5);
  expect(Math.abs(p.bloom_tilt)).toBeLessThanOrEqual(60);
  expect(Number.isInteger(p.leaf_count)).toBe(true); expect(p.leaf_count).toBeGreaterThanOrEqual(2); expect(p.leaf_count).toBeLessThanOrEqual(5);
  expect(LEAVES).toContain(p.leaf_shape);
  expect(p.glow_intensity).toBeGreaterThanOrEqual(0.25); expect(p.glow_intensity).toBeLessThanOrEqual(1);
  expect(p.sway_speed).toBeGreaterThanOrEqual(0); expect(p.sway_speed).toBeLessThanOrEqual(1);
  expect(p.sway_amplitude).toBeGreaterThanOrEqual(2); expect(p.sway_amplitude).toBeLessThanOrEqual(10);
  expect(p.pulse_period).toBeGreaterThanOrEqual(0.6); expect(p.pulse_period).toBeLessThanOrEqual(4);
  expect(PARTICLES).toContain(p.particle_style); expect(TEXTURES).toContain(p.texture);
  expect(p.particle_density).toBeGreaterThanOrEqual(0.1); expect(p.particle_density).toBeLessThanOrEqual(1);
  expect(typeof p.relief_gradient).toBe('boolean');
  expect(Number.isInteger(p.seed)).toBe(true); expect(p.seed).toBeGreaterThanOrEqual(0);
  for (const v of Object.values(p)) if (typeof v === 'number') expect(Number.isFinite(v)).toBe(true);
}

describe('generatePlant: determinism', () => {
  it('identical inputs and seed → identical plant and reasons', () => {
    const v = vis({ joy: 0.7, dominant_colors: ['#e8a060', '#5070c0'] });
    const m = musicFromDescriptors({ tempo: 0.6, energy: 0.5, mood: 'bright', genre: 'pop' });
    const a = generatePlant(v, m, 42), b = generatePlant(v, m, 42);
    expect(a).toEqual(b);
    expect(JSON.stringify(a.plant)).toBe(JSON.stringify(b.plant));
  });
  it('a different seed only perturbs the small organic jitter, never the explainable decisions', () => {
    const v = vis({ tension: 0.8, calmness: 0.2 });
    const a = generatePlant(v, EMPTY_MUSIC_FEATURES, 1).plant, b = generatePlant(v, EMPTY_MUSIC_FEATURES, 999).plant;
    expect(a.petal_style).toBe(b.petal_style); expect(a.texture).toBe(b.texture); expect(a.particle_style).toBe(b.particle_style);
    expect(a.stem_kinks).toBe(b.stem_kinks); expect(a.colors).toEqual(b.colors); expect(a.layers).toBe(b.layers); expect(a.petal_count).toBe(b.petal_count);
    expect(Math.abs(a.petal_length - b.petal_length)).toBeLessThan(0.1);
  });
  it('a plant survives JSON storage and reload unchanged, and regenerates identically from its stored DNA', () => {
    const v = vis({ nostalgia: 0.8, night: 0.7, dominant_colors: ['#aa6688', '#334477', '#ccaa99'] });
    const m = musicFromAnalysis({ bpm: 96, energy: 0.4, dynamics: 0.3, brightness: 0.4, durationSec: 100 });
    const stored = JSON.parse(JSON.stringify(generatePlant(v, m, 2024).plant)) as PlantParams;
    expect(generatePlant(JSON.parse(JSON.stringify(v)), JSON.parse(JSON.stringify(m)), stored.seed).plant).toEqual(stored);
  });
  it('golden fixture: a known day still grows the same flower (visual stability across releases)', () => {
    const v = vis({ warmth: 0.75, calmness: 0.7, nostalgia: 0.6, joy: 0.45, dominant_colors: ['#d9a066', '#8c5a3c', '#f2d4a8'] });
    const m = musicFromDescriptors({ tempo: 0.1, energy: 0.25, mood: 'bright', genre: 'jazz ballad' });
    expect(generatePlant(v, m, 20261114).plant).toMatchSnapshot();
  });
});

describe('generatePlant: inputs change the flower in the documented way', () => {
  it('changing the photograph palette changes the petal colors (and only the colors)', () => {
    const base = vis({ warmth: 0.5 });
    const warm = generatePlant({ ...base, dominant_colors: ['#e8a060', '#d8704a', '#f0c080'] }, EMPTY_MUSIC_FEATURES, 7).plant;
    const cool = generatePlant({ ...base, dominant_colors: ['#5070c0', '#3a8fa0', '#8090d0'] }, EMPTY_MUSIC_FEATURES, 7).plant;
    expect(warm.colors.petals).not.toEqual(cool.colors.petals);
    expect(hexToHsl(warm.colors.petals[0]).h).toBeLessThan(60);          // amber side
    expect(hexToHsl(cool.colors.petals[0]).h).toBeGreaterThan(180);      // blue side
    expect(warm.petal_style).toBe(cool.petal_style); expect(warm.petal_count).toBe(cool.petal_count);
  });
  it('photo colors are harmonized into the island palette: luminous, never muddy', () => {
    for (const raw of [['#000000', '#101010', '#202020'], ['#ffffff', '#fefefe', '#f0f0f0'], ['#7a7a7a', '#808080', '#8a8a8a'], ['#ff0000', '#00ff00', '#0000ff']]) {
      const p = generatePlant(vis({ dominant_colors: raw }), EMPTY_MUSIC_FEATURES, 1).plant;
      for (const c of p.colors.petals) { const { s, l } = hexToHsl(c); expect(l).toBeGreaterThanOrEqual(0.49); expect(l).toBeLessThanOrEqual(0.75); expect(s).toBeGreaterThanOrEqual(0.37); }
    }
  });
  it('musical tempo drives sway speed and the glow pulse period', () => {
    const v = vis();
    const slow = generatePlant(v, musicFromDescriptors({ tempo: 0.05, energy: 0.5, mood: 'mixed', genre: '' }), 3).plant;
    const fast = generatePlant(v, musicFromDescriptors({ tempo: 0.95, energy: 0.5, mood: 'mixed', genre: '' }), 3).plant;
    expect(fast.sway_speed).toBeGreaterThan(slow.sway_speed + 0.4);
    expect(fast.pulse_period).toBeLessThan(slow.pulse_period);
    const bpm60 = generatePlant(v, musicFromAnalysis({ bpm: 60, energy: 0.5, dynamics: 0.3, brightness: 0.5, durationSec: 60 }), 3).plant;
    const bpm150 = generatePlant(v, musicFromAnalysis({ bpm: 150, energy: 0.5, dynamics: 0.3, brightness: 0.5, durationSec: 60 }), 3).plant;
    expect(bpm60.pulse_period).toBeCloseTo(2, 5);       // two beats at 60 BPM
    expect(bpm150.pulse_period).toBeCloseTo(0.8, 5);    // two beats at 150 BPM
    expect(bpm60.pulse_period).toBeGreaterThan(bpm150.pulse_period);
  });
  it('musical energy widens the sway and adds particles (through the energy score)', () => {
    const calm = generatePlant(vis({ energy: 0.15 }), musicFromDescriptors({ tempo: 0.5, energy: 0.1, mood: 'mixed', genre: '' }), 3).plant;
    const loud = generatePlant(vis({ energy: 0.9 }), musicFromDescriptors({ tempo: 0.5, energy: 0.95, mood: 'mixed', genre: '' }), 3).plant;
    expect(loud.sway_amplitude).toBeGreaterThan(calm.sway_amplitude + 2);
    expect(loud.particle_density).toBeGreaterThan(calm.particle_density);
    expect(loud.sway_speed).toBeGreaterThan(calm.sway_speed);
  });
  it('calm + warmth → soft rounded petals, smooth stem, brush texture; tension → angular, kinks, lines', () => {
    const calm = generatePlant(vis({ calmness: 0.9, warmth: 0.8, tension: 0.05, energy: 0.2 }), EMPTY_MUSIC_FEATURES, 5).plant;
    expect(calm.petal_style).toBe('soft_rounded'); expect(calm.stem_kinks).toBe(0); expect(calm.texture).toBe('brush'); expect(calm.leaf_shape).toBe('round');
    const tense = generatePlant(vis({ tension: 0.9, calmness: 0.1, energy: 0.7 }), EMPTY_MUSIC_FEATURES, 5).plant;
    expect(tense.petal_style).toBe('angular'); expect(tense.stem_kinks).toBeGreaterThanOrEqual(3); expect(tense.texture).toBe('lines'); expect(tense.leaf_shape).toBe('serrated'); expect(tense.particle_style).toBe('spark');
  });
  it('wonder + night → star petals and fireflies; joy + company → layered petals, confetti, sparkles', () => {
    const night = generatePlant(vis({ wonder: 0.9, night: 0.9, calmness: 0.3 }), EMPTY_MUSIC_FEATURES, 5).plant;
    expect(night.petal_style).toBe('star'); expect(night.particle_style).toBe('firefly');
    const party = generatePlant(vis({ joy: 0.95, social: 0.9, energy: 0.8, calmness: 0.2, complexity: 0.6 }), EMPTY_MUSIC_FEATURES, 5).plant;
    expect(party.petal_style).toBe('layered'); expect(party.layers).toBe(3); expect(party.texture).toBe('confetti'); expect(party.particle_style).toBe('sparkle');
  });
});

describe('generatePlant: mixed emotions produce meaningful combinations', () => {
  it('joy + nostalgia: a lush bloom whose inner layer takes the quieter shape (blend reason recorded)', () => {
    const r = generatePlant(vis({ joy: 0.8, nostalgia: 0.75, calmness: 0.55, complexity: 0.5, energy: 0.3 }), EMPTY_MUSIC_FEATURES, 9);
    expect(r.plant.petal_style_inner).not.toBe(r.plant.petal_style);
    expect(r.reasons.map((x) => x.code)).toContain('plant.blend');
    expect(r.plant.layers).toBeGreaterThanOrEqual(2);
  });
  it('tension + relief: the stress shape with a cool-to-warm relief gradient', () => {
    const r = generatePlant(vis({ tension: 0.8, relief: 0.6, calmness: 0.2, dominant_colors: ['#aabbcc', '#bbccdd'] }), EMPTY_MUSIC_FEATURES, 9);
    expect(r.plant.relief_gradient).toBe(true);
    expect(r.reasons.map((x) => x.code)).toContain('plant.relief');
    expect(r.plant.colors.petals).toHaveLength(3);
    expect(hexToHsl(r.plant.colors.petals[0]).h).toBeGreaterThan(180);   // cool base
    expect(hexToHsl(r.plant.colors.petals[1]).h).toBeLessThan(60);       // warm tip
    expect(r.plant.stem_kinks).toBeGreaterThan(0);
  });
  it('a pure one-note day has no blend', () => {
    const r = generatePlant(vis({ calmness: 0.95, warmth: 0.9, tension: 0, joy: 0.1, nostalgia: 0.1, wonder: 0.05, sadness: 0.05, complexity: 0.2 }), EMPTY_MUSIC_FEATURES, 9);
    expect(r.plant.petal_style_inner).toBe(r.plant.petal_style);
    expect(r.reasons.map((x) => x.code)).not.toContain('plant.blend');
  });
});

describe('generatePlant: sadness is a character, not a defect', () => {
  it('a sad, nostalgic day is still luminous and complete', () => {
    const p = generatePlant(vis({ sadness: 0.9, nostalgia: 0.8, joy: 0.05, energy: 0.1, calmness: 0.5, dominant_colors: ['#556677', '#445566', '#667788'] }), EMPTY_MUSIC_FEATURES, 11).plant;
    expect(['bell', 'wispy']).toContain(p.petal_style);
    expect(p.texture).toBe('ink'); expect(p.particle_style).toBe('petalfall');
    expect(p.glow_intensity).toBeGreaterThan(0.45);                      // nostalgia glows
    expect(p.petal_count).toBeGreaterThanOrEqual(4); expect(p.leaf_count).toBeGreaterThanOrEqual(2);
    for (const c of p.colors.petals) { const { s, l } = hexToHsl(c); expect(l).toBeGreaterThanOrEqual(0.45); expect(s).toBeGreaterThanOrEqual(0.37); }
    assertValidPlant(p);
  });
});

describe('generatePlant: ranges, robustness and export fidelity', () => {
  it('every parameter stays within its documented range over 400 random days (and the importer accepts each plant unchanged)', () => {
    const rand = mulberry32(99);
    const moods: MusicFeatures['mood'][] = ['bright', 'melancholic', 'mixed', null];
    for (let i = 0; i < 400; i++) {
      const v = vis({
        warmth: rand(), energy: rand(), calmness: rand(), nostalgia: rand(), tension: rand(), joy: rand(), sadness: rand(), wonder: rand(),
        complexity: rand(), night: rand(), social: rand(), relief: rand(),
        dominant_colors: Array.from({ length: Math.floor(rand() * 5) }, () => '#' + Math.floor(rand() * 0xffffff).toString(16).padStart(6, '0')),
      });
      const m: MusicFeatures = i % 4 === 0 ? EMPTY_MUSIC_FEATURES : { source: i % 2 ? 'audio' : 'descriptors', bpm: i % 3 === 0 ? null : 40 + Math.floor(rand() * 180), tempo: rand(), energy: rand(), dynamics: rand(), brightness: rand() > 0.5 ? rand() : null, mood: moods[i % 4], genre: '' };
      const { plant, reasons } = generatePlant(v, m, Math.floor(rand() * 4294967295));
      assertValidPlant(plant);
      expect(reasons.length).toBeGreaterThan(3);
      // what a friend imports must be EXACTLY what was generated → consistent flower after export/import
      const imported = sanitizeSharedMemory({ id: `m${i}`, date: '2026-01-01', privacy: 'garden', plant: JSON.parse(JSON.stringify(plant)) });
      expect(imported?.plant).toEqual(plant);
    }
  });
  it('missing optional metadata does not crash: no colors, no music, null bpm, extreme zeros/ones', () => {
    expect(() => generatePlant(vis({ dominant_colors: [] }), EMPTY_MUSIC_FEATURES, 0)).not.toThrow();
    expect(() => generatePlant(vis({ dominant_colors: ['#123456'] }), EMPTY_MUSIC_FEATURES, 0)).not.toThrow();   // a single color → palette fallback
    expect(() => generatePlant(vis(), { ...EMPTY_MUSIC_FEATURES, bpm: null, mood: null, brightness: null }, 1)).not.toThrow();
    const zeros = Object.fromEntries(Object.keys(vis()).map((k) => [k, 0])) as unknown as VisualParameters; zeros.dominant_colors = [];
    const ones = Object.fromEntries(Object.keys(vis()).map((k) => [k, 1])) as unknown as VisualParameters; ones.dominant_colors = ['#ffffff', '#000000'];
    assertValidPlant(generatePlant(zeros, EMPTY_MUSIC_FEATURES, 1).plant);
    assertValidPlant(generatePlant(ones, musicFromDescriptors({ tempo: 1, energy: 1, mood: 'bright', genre: '' }), 1).plant);
    expect(generatePlant(vis(), EMPTY_MUSIC_FEATURES, 1).plant.pulse_period).toBeCloseTo(2.4, 5);   // no song → default pulse
  });
  it('describeColor names hues consistently', () => {
    expect(describeColor('#f0b36a')).toBe('amber'); expect(describeColor('#8fb4e6')).toBe('blue'); expect(describeColor('#5f9b55')).toBe('green'); expect(describeColor('#808080')).toBe('grey');
  });
});
