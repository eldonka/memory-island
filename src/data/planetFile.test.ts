import { describe, it, expect } from 'vitest';
import { validatePlanetFile, sanitizeSharedMemory, LIMITS } from './planetFile';

const plant = {
  petal_style: 'layered', petal_style_inner: 'soft_rounded', petal_count: 9, layers: 2, petal_length: 1, petal_width: 1,
  colors: { petals: ['#aabbcc', '#ddeeff'], center: '#f6d78d', glow: '#ffffff', stem: '#5f9b55', leaf: '#6aa65b' },
  stem_height: 0.8, stem_curve: 0.5, stem_kinks: 0, bloom_tilt: 3, leaf_count: 3, leaf_shape: 'round', glow_intensity: 0.6,
  sway_speed: 0.5, sway_amplitude: 4, pulse_period: 1.2, particle_style: 'sparkle', particle_density: 0.5, texture: 'confetti', relief_gradient: false, seed: 42,
};
const visual = { warmth: 0.7, energy: 0.6, calmness: 0.3, nostalgia: 0.2, tension: 0.1, joy: 0.9, sadness: 0.1, wonder: 0.2, complexity: 0.5, night: 0.4, social: 0.8, relief: 0, dominant_colors: ['#aabbcc'] };
const shared = { id: 'm1', date: '2026-11-07', privacy: 'shared', plant, visual, title: 'День', story: 'История', quote: 'Цитата', lang: 'ru', photos: [{ name: 'a.jpg', thumb: 'data:image/jpeg;base64,AAAA', width: 10, height: 10 }], music: { kind: 'link', url: 'https://open.spotify.com/track/abc', embedUrl: 'https://open.spotify.com/embed/track/abc' } };
const file = (memories: unknown[], extra: Record<string, unknown> = {}) => ({ format: 'memory-island-planet', version: 1, planetName: 'Планета', theme: 'rose', code: 'ABC123', exportedAt: '2026-11-20T00:00:00Z', memories, ...extra });

describe('planet file validation', () => {
  it('accepts a well-formed file', () => {
    const r = validatePlanetFile(file([shared]));
    expect(r.ok).toBe(true);
    if (r.ok) { expect(r.planet.memories).toHaveLength(1); expect(r.planet.planetName).toBe('Планета'); expect(r.skipped).toBe(0); }
  });
  it('rejects wrong format, version, size and too many entries', () => {
    expect(validatePlanetFile({ hello: 1 })).toEqual({ ok: false, error: 'bad_format' });
    expect(validatePlanetFile(file([shared], { version: 2 }))).toEqual({ ok: false, error: 'bad_version' });
    expect(validatePlanetFile(file([shared]), LIMITS.fileBytes + 1)).toEqual({ ok: false, error: 'too_big' });
    expect(validatePlanetFile(file(Array.from({ length: LIMITS.memories + 1 }, () => shared)))).toEqual({ ok: false, error: 'too_many' });
    expect(validatePlanetFile('not json object')).toEqual({ ok: false, error: 'bad_format' });
  });
  it('drops private entries and reports an empty file', () => {
    expect(validatePlanetFile(file([{ ...shared, privacy: 'private' }]))).toEqual({ ok: false, error: 'empty' });
  });
  it('strips content from garden-only entries even if present (privacy enforcement)', () => {
    const s = sanitizeSharedMemory({ ...shared, privacy: 'garden' });
    expect(s).not.toBeNull();
    expect(s!.story).toBeUndefined(); expect(s!.photos).toBeUndefined(); expect(s!.title).toBeUndefined(); expect(s!.music).toBeUndefined();
  });
  it('rejects malformed entries but keeps the rest', () => {
    const r = validatePlanetFile(file([shared, { id: 'x', date: '2026-02-30', privacy: 'shared', plant, visual }, { id: 'y', date: '2026-01-01', privacy: 'shared', plant: { colors: {} }, visual }, 'junk']));
    expect(r.ok).toBe(true);
    if (r.ok) { expect(r.planet.memories).toHaveLength(1); expect(r.skipped).toBe(3); }
  });
  it('deduplicates ids', () => {
    const r = validatePlanetFile(file([shared, { ...shared, date: '2026-11-08' }]));
    if (r.ok) expect(r.planet.memories).toHaveLength(1);
  });
  it('clamps plant parameters and drops bad colors', () => {
    const s = sanitizeSharedMemory({ ...shared, plant: { ...plant, petal_count: 999, layers: -4, colors: { ...plant.colors, petals: ['#aabbcc', 'javascript:alert(1)'] } } });
    expect(s!.plant.petal_count).toBe(20); expect(s!.plant.layers).toBe(1); expect(s!.plant.colors.petals).toEqual(['#aabbcc']);
  });
  it('only allows embed players from known hosts and http(s) links', () => {
    const s = sanitizeSharedMemory({ ...shared, music: { kind: 'link', url: 'https://open.spotify.com/track/abc', embedUrl: 'https://evil.example/embed' } });
    expect(s!.music?.embedUrl).toBe('https://open.spotify.com/embed/track/abc?theme=0');
    const j = sanitizeSharedMemory({ ...shared, music: { kind: 'link', url: 'javascript:alert(1)' } });
    expect(j!.music?.kind).toBe('none');
  });
  it('drops photos that are not data:image URLs and caps counts', () => {
    const s = sanitizeSharedMemory({ ...shared, photos: [{ thumb: 'https://x/y.jpg' }, ...Array.from({ length: 30 }, () => ({ name: 'p', thumb: 'data:image/png;base64,AA', width: 1, height: 1 }))] });
    expect(s!.photos).toHaveLength(LIMITS.photosPerMemory);
  });
  it('truncates oversized strings', () => {
    const s = sanitizeSharedMemory({ ...shared, story: 'x'.repeat(LIMITS.storyChars + 500), title: 'y'.repeat(500) });
    expect(s!.story!.length).toBe(LIMITS.storyChars); expect(s!.title!.length).toBe(LIMITS.titleChars);
  });
});
