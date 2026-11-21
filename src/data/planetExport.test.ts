// Privacy of the exported planet file — inspects the ACTUAL JSON that leaves the planet
// (JSON.parse(JSON.stringify(...))), not the in-memory objects, for every privacy mode,
// and round-trips it through the importer to prove the flower survives unchanged.
import { describe, it, expect } from 'vitest';
import { buildPlanetFile, toSharedMemory, validatePlanetFile, sanitizeSharedMemory } from './planetFile';
import { generatePlant } from '../plant/generate';
import { musicFromDescriptors } from '../analysis/music';
import type { Memory, Privacy, Profile, VisualParameters } from './types';

const profile: Profile = { planetName: 'Тестовая планета', theme: 'lavender', lang: 'ru', reducedMotion: false, createdAt: '2026-11-01T00:00:00Z', code: 'ABC123', seeded: false };

const SECRET_STORY = 'СЕКРЕТНАЯ история дня: было очень грустно и одиноко, плакала весь вечер.';
const SECRET_QUOTE = 'плакала весь вечер';
const SECRET_THUMB = 'data:image/jpeg;base64,U0VDUkVUX1BIT1RP';
const SECRET_GENRE = 'funeral doom';
const SECRET_TITLE_OF_SONG = 'Secret Song Title';

/** a memory with VERY distinctive DNA scores so a leak is easy to spot in the JSON text */
function memory(id: string, date: string, privacy: Privacy, musicKind: 'file' | 'link' = 'file'): Memory {
  const visual: VisualParameters = {
    warmth: 0.123456, energy: 0.234567, calmness: 0.345678, nostalgia: 0.456789, tension: 0.567891, joy: 0.678912,
    sadness: 0.789123, wonder: 0.891234, complexity: 0.912345, night: 0.135791, social: 0.246813, relief: 0.357924,
    dominant_colors: ['#aa3344', '#4455cc', '#77aa22'],
  };
  const music = musicFromDescriptors({ tempo: 0.33, energy: 0.77, mood: 'melancholic', genre: SECRET_GENRE });
  const { plant, reasons } = generatePlant(visual, music, 777);
  return {
    id, date, createdAt: '2026-11-10T10:00:00Z', updatedAt: '2026-11-10T10:00:00Z',
    title: `Название ${id}`, titleAuto: `Авто ${id}`, story: SECRET_STORY, quote: SECRET_QUOTE, lang: 'ru',
    photos: [{ id: `${id}_p0`, name: 'secret-photo.jpg', width: 1200, height: 800, thumb: SECRET_THUMB }],
    music: musicKind === 'file'
      ? { kind: 'file', fileId: `${id}_audio`, fileName: 'secret.wav', title: SECRET_TITLE_OF_SONG, descriptors: { tempo: 0.33, energy: 0.77, mood: 'melancholic', genre: SECRET_GENRE }, analysis: { bpm: 71, energy: 0.6, dynamics: 0.4, brightness: 0.3, durationSec: 180 } }
      : { kind: 'link', url: 'https://open.spotify.com/track/abc', service: 'spotify', embedUrl: 'https://open.spotify.com/embed/track/abc?theme=0', title: SECRET_TITLE_OF_SONG, descriptors: { tempo: 0.33, energy: 0.77, mood: 'melancholic', genre: SECRET_GENRE } },
    analysis: {
      text: { warmth: 0, cold: 0, joy: 0, sadness: 0.9, calm: 0, tension: 0, energy: 0, nostalgia: 0, wonder: 0, social: 0, nature: 0, night: 0, morning: 0, relief: 0, work: 0, city: 0, season: null, intensity: 0, complexity: 0, wordCount: 10, lang: 'ru', keywords: ['грустно', 'одиноко'], matched: { sadness: ['грустно', 'одиноко'] } },
      photos: { count: 1, brightness: 0.2, contrast: 0.3, saturation: 0.4, warmth: 0.5, hueVariety: 0.6, dominant: ['#aa3344'], atmosphere: 'night' },
      music,
    },
    visual, plant, reasons: [...reasons, { source: 'text', code: 'text.sadness', values: { words: 'грустно, одиноко', score: 90 } }],
    userAdjusted: false, privacy, version: 1,
  };
}

const exportJson = (mems: Memory[]) => JSON.parse(JSON.stringify(buildPlanetFile(profile, mems, new Date('2026-11-21T12:00:00Z'))));

describe('planet export: privacy of the actual JSON', () => {
  const mems = [memory('priv', '2026-11-01', 'private'), memory('gard', '2026-11-02', 'garden'), memory('open', '2026-11-03', 'shared'), memory('openlink', '2026-11-04', 'shared', 'link')];
  const json = exportJson(mems);
  const text = JSON.stringify(json);

  it('private memories never leave the planet', () => {
    expect(json.memories.map((m: any) => m.id)).toEqual(['gard', 'open', 'openlink']);
    expect(text).not.toContain('"priv"');
    expect(text).not.toContain('priv_p0');
  });

  it('garden-only entries carry exactly id, date, privacy and plant — nothing else', () => {
    const g = json.memories.find((m: any) => m.id === 'gard');
    expect(Object.keys(g).sort()).toEqual(['date', 'id', 'plant', 'privacy']);
    const gText = JSON.stringify(g);
    for (const leak of ['joy', 'sadness', 'calmness', 'tension', 'warmth', 'nostalgia', 'wonder', 'visual', 'dominant_colors', 'story', 'quote', 'title', 'photos', 'thumb', 'data:image', 'music', 'descriptors', 'reasons', 'analysis', 'fileId', 'keywords', SECRET_GENRE, SECRET_TITLE_OF_SONG, 'СЕКРЕТНАЯ', 'плакала', 'secret-photo']) {
      expect(gText, `garden export must not contain "${leak}"`).not.toContain(leak);
    }
    // the distinctive DNA numbers must not appear anywhere in the garden entry
    for (const v of ['0.123456', '0.789123', '0.678912', '0.567891']) expect(gText).not.toContain(v);
  });

  it('garden-only plant is a complete, faithful copy of the stored plant', () => {
    const g = json.memories.find((m: any) => m.id === 'gard');
    expect(g.plant).toEqual(JSON.parse(JSON.stringify(mems[1].plant)));
  });

  it('shared entries carry the opened content but never audio files, analysis or blob ids', () => {
    const s = json.memories.find((m: any) => m.id === 'open');
    expect(s.story).toBe(SECRET_STORY); expect(s.quote).toBe(SECRET_QUOTE); expect(s.title).toBe('Название open');
    expect(s.photos).toEqual([{ name: 'secret-photo.jpg', thumb: SECRET_THUMB, width: 1200, height: 800 }]);
    expect(s.visual.joy).toBeCloseTo(0.678912, 6);
    expect(s.reasons.length).toBeGreaterThan(0);
    const sText = JSON.stringify(s);
    expect(sText).not.toContain('fileId'); expect(sText).not.toContain('open_audio'); expect(sText).not.toContain('open_p0');
    expect(sText).not.toContain('"analysis"'); expect(sText).not.toContain('keywords'); expect(sText).not.toContain('titleAuto');
    expect(s.music).toEqual({ kind: 'none', title: SECRET_TITLE_OF_SONG, descriptors: { tempo: 0.33, energy: 0.77, mood: 'melancholic', genre: SECRET_GENRE } });
    const l = json.memories.find((m: any) => m.id === 'openlink');
    expect(l.music.kind).toBe('link'); expect(l.music.url).toBe('https://open.spotify.com/track/abc'); expect(l.music.embedUrl).toContain('open.spotify.com/embed');
  });

  it('returns null without a profile and an empty list when nothing is opened', () => {
    expect(buildPlanetFile(null, mems)).toBeNull();
    expect(exportJson([memory('a', '2026-11-01', 'private')]).memories).toEqual([]);
  });

  it('toSharedMemory copies, never aliases, the stored plant', () => {
    const m = memory('x', '2026-11-05', 'garden');
    const s = toSharedMemory(m)!;
    expect(s.plant).not.toBe(m.plant); expect(s.plant.colors).not.toBe(m.plant.colors);
    s.plant.colors.petals.push('#000000');
    expect(m.plant.colors.petals).not.toContain('#000000');
  });
});

describe('planet export → import round trip (every privacy mode)', () => {
  const mems = [memory('priv', '2026-11-01', 'private'), memory('gard', '2026-11-02', 'garden'), memory('open', '2026-11-03', 'shared', 'link')];
  const json = exportJson(mems);
  const res = validatePlanetFile(json, JSON.stringify(json).length);

  it('imports cleanly with nothing skipped', () => {
    expect(res.ok).toBe(true);
    if (res.ok) { expect(res.skipped).toBe(0); expect(res.planet.memories.map((m) => m.id)).toEqual(['gard', 'open']); expect(res.planet.planetName).toBe('Тестовая планета'); }
  });

  it('the flower looks the same after export and import (plant identical for garden and shared)', () => {
    if (!res.ok) throw new Error('import failed');
    for (const id of ['gard', 'open']) {
      const original = mems.find((m) => m.id === id)!;
      const imported = res.planet.memories.find((m) => m.id === id)!;
      expect(imported.plant).toEqual(original.plant);
    }
  });

  it('garden-only stays locked after import: no visual, no content', () => {
    if (!res.ok) throw new Error('import failed');
    const g = res.planet.memories.find((m) => m.id === 'gard')!;
    expect(g.visual).toBeUndefined(); expect(g.story).toBeUndefined(); expect(g.photos).toBeUndefined(); expect(g.music).toBeUndefined(); expect(g.reasons).toBeUndefined(); expect(g.title).toBeUndefined();
  });

  it('shared keeps its DNA and content after import', () => {
    if (!res.ok) throw new Error('import failed');
    const s = res.planet.memories.find((m) => m.id === 'open')!;
    expect(s.visual?.sadness).toBeCloseTo(0.789123, 6);
    expect(s.story).toBe(SECRET_STORY); expect(s.photos).toHaveLength(1); expect(s.music?.kind).toBe('link');
  });

  it('a tampered or legacy file with DNA/content on a garden-only entry is stripped on import', () => {
    const leaky = { ...JSON.parse(JSON.stringify(toSharedMemory(memory('leak', '2026-11-06', 'shared')))), privacy: 'garden' };
    expect(leaky.visual).toBeDefined(); expect(leaky.story).toBeDefined();
    const s = sanitizeSharedMemory(leaky)!;
    expect(Object.keys(s).sort()).toEqual(['date', 'id', 'plant', 'privacy']);
  });
});
