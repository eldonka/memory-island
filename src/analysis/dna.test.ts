// Memory DNA — buildVisual merges text, photo and music features into explainable scores.
import { describe, it, expect } from 'vitest';
import { buildVisual, NEUTRAL_VISUAL, VISUAL_KEYS } from './dna';
import { EMPTY_PHOTO_FEATURES } from './photo';
import { EMPTY_MUSIC_FEATURES, musicFromDescriptors, musicFromAnalysis } from './music';
import { analyzeText } from './text';
import type { MusicFeatures, PhotoFeatures, TextFeatures, VisualParameters } from '../data/types';

export const textFeat = (o: Partial<TextFeatures> = {}): TextFeatures => ({
  warmth: 0, cold: 0, joy: 0, sadness: 0, calm: 0, tension: 0, energy: 0, nostalgia: 0, wonder: 0, social: 0, nature: 0, night: 0, morning: 0,
  relief: 0, work: 0, city: 0, season: null, intensity: 0, complexity: 0.3, wordCount: 40, lang: 'ru', keywords: [], matched: {}, ...o,
});
export const photoFeat = (o: Partial<PhotoFeatures> = {}): PhotoFeatures => ({ ...EMPTY_PHOTO_FEATURES, ...o });
const warmPhotos = photoFeat({ count: 3, brightness: 0.55, contrast: 0.4, saturation: 0.5, warmth: 0.85, hueVariety: 0.4, dominant: ['#e8a060', '#d8704a', '#f0c080'], atmosphere: 'golden' });
const coolPhotos = photoFeat({ count: 3, brightness: 0.45, contrast: 0.4, saturation: 0.5, warmth: 0.15, hueVariety: 0.4, dominant: ['#5070c0', '#3a8fa0', '#8090d0'], atmosphere: 'cool' });

const inRange = (v: VisualParameters) => { for (const k of VISUAL_KEYS) { expect(v[k]).toBeGreaterThanOrEqual(0); expect(v[k]).toBeLessThanOrEqual(1); } expect(v.social).toBeGreaterThanOrEqual(0); expect(v.relief).toBeLessThanOrEqual(1); };

describe('buildVisual: determinism and ranges', () => {
  it('identical inputs give identical outputs (scores and reasons)', () => {
    const t = textFeat({ joy: 0.6, warmth: 0.4, matched: { joy: ['смех'], warmth: ['тепло'] } });
    const m = musicFromDescriptors({ tempo: 0.7, energy: 0.6, mood: 'bright', genre: 'pop' });
    const a = buildVisual(t, warmPhotos, m), b = buildVisual(t, warmPhotos, m);
    expect(a).toEqual(b);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it('every score stays within 0..1 for extreme inputs', () => {
    const hot = textFeat({ warmth: 1, joy: 1, energy: 1, intensity: 1, social: 1, wonder: 1, night: 1, complexity: 1, nostalgia: 1, tension: 1, sadness: 1, cold: 1, calm: 1, relief: 1 });
    const none = textFeat();
    for (const t of [hot, none]) for (const p of [warmPhotos, coolPhotos, photoFeat()]) for (const m of [EMPTY_MUSIC_FEATURES, musicFromDescriptors({ tempo: 1, energy: 1, mood: 'bright', genre: '' }), musicFromDescriptors({ tempo: 0, energy: 0, mood: 'melancholic', genre: '' })]) {
      inRange(buildVisual(t, p, m).visual);
    }
  });
});

describe('buildVisual: each source leaves a visible, explainable trace', () => {
  it('photo palette becomes the dominant colors and shifts warmth', () => {
    const t = textFeat();
    const warm = buildVisual(t, warmPhotos, EMPTY_MUSIC_FEATURES).visual;
    const cool = buildVisual(t, coolPhotos, EMPTY_MUSIC_FEATURES).visual;
    expect(warm.dominant_colors).toEqual(['#e8a060', '#d8704a', '#f0c080']);
    expect(cool.dominant_colors).toEqual(['#5070c0', '#3a8fa0', '#8090d0']);
    expect(warm.warmth).toBeGreaterThan(cool.warmth);
  });

  it('without photos there are no dominant colors and no photo reasons', () => {
    const r = buildVisual(textFeat(), photoFeat(), EMPTY_MUSIC_FEATURES);
    expect(r.visual.dominant_colors).toEqual([]);
    expect(r.reasons.some((x) => x.source === 'photo')).toBe(false);
  });

  it('music tempo and energy raise energy and lower calmness', () => {
    const t = textFeat({ calm: 0.3 });
    const slow = buildVisual(t, photoFeat(), musicFromDescriptors({ tempo: 0.05, energy: 0.1, mood: 'mixed', genre: '' })).visual;
    const fast = buildVisual(t, photoFeat(), musicFromDescriptors({ tempo: 0.95, energy: 0.95, mood: 'mixed', genre: '' })).visual;
    expect(fast.energy).toBeGreaterThan(slow.energy + 0.2);
    expect(fast.calmness).toBeLessThan(slow.calmness);
  });

  it('music mood nudges joy / nostalgia and is recorded as a reason', () => {
    const t = textFeat();
    const bright = buildVisual(t, photoFeat(), musicFromDescriptors({ tempo: 0.5, energy: 0.5, mood: 'bright', genre: '' }));
    const sad = buildVisual(t, photoFeat(), musicFromDescriptors({ tempo: 0.5, energy: 0.5, mood: 'melancholic', genre: '' }));
    expect(bright.visual.joy).toBeGreaterThan(sad.visual.joy);
    expect(sad.visual.nostalgia).toBeGreaterThan(bright.visual.nostalgia);
    expect(bright.reasons.map((r) => r.code)).toContain('music.mood.bright');
    expect(sad.reasons.map((r) => r.code)).toContain('music.mood.melancholic');
  });

  it('an analyzed audio file is reported as such, a link as described by the user, nothing as none', () => {
    const audio = buildVisual(textFeat(), photoFeat(), musicFromAnalysis({ bpm: 128, energy: 0.8, dynamics: 0.5, brightness: 0.6, durationSec: 200 }));
    expect(audio.reasons.find((r) => r.code === 'music.audio')?.values?.bpm).toBe(128);
    const desc = buildVisual(textFeat(), photoFeat(), musicFromDescriptors({ tempo: 0.5, energy: 0.5, mood: 'mixed', genre: 'jazz' }));
    expect(desc.reasons.map((r) => r.code)).toContain('music.descriptors');
    expect(desc.reasons.find((r) => r.code === 'music.genre')?.values?.genre).toBe('jazz');
    expect(buildVisual(textFeat(), photoFeat(), EMPTY_MUSIC_FEATURES).reasons.map((r) => r.code)).toContain('music.none');
  });

  it('text categories above threshold produce a reason with the matched words', () => {
    const t = textFeat({ tension: 0.7, matched: { tension: ['дедлайн', 'стресс'] } });
    const r = buildVisual(t, photoFeat(), EMPTY_MUSIC_FEATURES);
    const reason = r.reasons.find((x) => x.code === 'text.tension');
    expect(reason?.values?.words).toBe('дедлайн, стресс');
    expect(r.visual.tension).toBeGreaterThan(0.5);
  });
});

describe('buildVisual: mixed emotions', () => {
  it('joy + nostalgia keep BOTH scores high instead of cancelling out', () => {
    const t = textFeat({ joy: 0.7, nostalgia: 0.7, matched: { joy: ['смех'], nostalgia: ['детство'] } });
    const v = buildVisual(t, photoFeat(), EMPTY_MUSIC_FEATURES).visual;
    expect(v.joy).toBeGreaterThan(0.5); expect(v.nostalgia).toBeGreaterThan(0.55);
  });
  it('tension + relief (a deadline that ended well) keeps relief as its own channel', () => {
    const t = textFeat({ tension: 0.8, relief: 0.6, work: 0.5 });
    const v = buildVisual(t, photoFeat(), EMPTY_MUSIC_FEATURES).visual;
    expect(v.tension).toBeGreaterThan(0.5); expect(v.relief).toBe(0.6);
  });
  it('the real demo stories read as three different days', () => {
    const calm = analyzeText('Проснулись в пять утра и пошли к морю встречать рассвет. Тихо, только волны и птицы. Пили чай из термоса, молчали. Удивительное спокойствие.');
    const stress = analyzeText('Ночь в офисе перед сдачей проекта. Дедлайн в девять утра, стресс, холодный кофе, нервы. В 6:40 всё наконец заработало. Выдохнули. Облегчение.');
    const joy = analyzeText('День рождения! Друзья устроили сюрприз: торт со свечами, громкая музыка. Мы танцевали до двух ночи, смеялись до слёз. Счастье. Ура!');
    const vc = buildVisual(calm, photoFeat(), EMPTY_MUSIC_FEATURES).visual;
    const vs = buildVisual(stress, photoFeat(), EMPTY_MUSIC_FEATURES).visual;
    const vj = buildVisual(joy, photoFeat(), EMPTY_MUSIC_FEATURES).visual;
    expect(vc.calmness).toBeGreaterThan(vs.calmness); expect(vc.calmness).toBeGreaterThan(vj.calmness);
    expect(vs.tension).toBeGreaterThan(vc.tension); expect(vs.tension).toBeGreaterThan(vj.tension);
    expect(vj.joy).toBeGreaterThan(vc.joy); expect(vj.joy).toBeGreaterThan(vs.joy);
  });
});

describe('buildVisual: missing optional metadata never crashes', () => {
  it('empty text features, no photos, no music', () => {
    const r = buildVisual(textFeat({ wordCount: 0, matched: {} }), photoFeat(), EMPTY_MUSIC_FEATURES);
    inRange(r.visual); expect(r.reasons.length).toBeGreaterThan(0);
  });
  it('photo count without dominant colors (unreadable images) is treated as no palette', () => {
    const r = buildVisual(textFeat(), photoFeat({ count: 2, dominant: [] }), EMPTY_MUSIC_FEATURES);
    expect(r.visual.dominant_colors).toEqual([]);
  });
  it('music with null bpm, null mood and empty genre', () => {
    const m: MusicFeatures = { source: 'descriptors', bpm: null, tempo: 0.5, energy: 0.5, dynamics: 0.4, brightness: null, mood: null, genre: '' };
    const r = buildVisual(textFeat(), photoFeat(), m);
    inRange(r.visual);
    expect(r.reasons.find((x) => x.code === 'music.descriptors')?.values?.bpm).toBe(0);
    expect(r.reasons.some((x) => x.code.startsWith('music.mood'))).toBe(false);
  });
  it('matched map missing a category that scored (defensive)', () => {
    const t = textFeat({ joy: 0.9, matched: {} });
    expect(() => buildVisual(t, photoFeat(), EMPTY_MUSIC_FEATURES)).not.toThrow();
  });
  it('NEUTRAL_VISUAL is a complete, frozen 0.5 profile', () => {
    for (const k of VISUAL_KEYS) expect(NEUTRAL_VISUAL[k]).toBe(0.5);
    expect(Object.isFrozen(NEUTRAL_VISUAL)).toBe(true);
  });
});
