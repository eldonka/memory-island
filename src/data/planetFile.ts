// ============================================================
// Planet files — what leaves a planet (export) and what is accepted back (import).
//
// EXPORT (buildPlanetFile) enforces privacy at the source:
//   private → never leaves the planet
//   garden  → only what is needed to DRAW the flower: id, date, privacy, plant.
//             No emotional scores (visual), no story/quote/photos/music/reasons.
//   shared  → the content the owner opened to friends; audio files never ship,
//             links and the owner's own song description do.
//
// IMPORT (validatePlanetFile) treats JSON as untrusted: structure, size limits,
// parameter ranges, https-only links, embed players only from known hosts;
// garden-only entries are stripped of content even if a tampered file carries it.
// ============================================================
import type { FriendPlanet, Memory, MusicDescriptors, PlanetFile, PlanetTheme, PlantParams, Profile, SharedMemory, VisualParameters } from './types';
import { isValidISODate } from './dates';
import { detectService, makeEmbedUrl } from '../analysis/music';

export const LIMITS = {
  fileBytes: 40 * 1024 * 1024,
  memories: 1500,
  photosPerMemory: 20,
  thumbChars: 3_500_000,   // ~2.5 MB base64
  storyChars: 20_000,
  titleChars: 120,
  quoteChars: 600,
  nameChars: 60,
};

export type ImportError = 'too_big' | 'bad_format' | 'bad_version' | 'too_many' | 'empty';
export type ImportResult = { ok: true; planet: FriendPlanet; skipped: number } | { ok: false; error: ImportError };

const THEMES: PlanetTheme[] = ['rose', 'lavender', 'mint', 'gold'];
const PETAL = new Set(['soft_rounded', 'pointed', 'layered', 'angular', 'bell', 'wispy', 'star']);
const LEAF = new Set(['round', 'pointed', 'serrated']);
const PARTICLE = new Set(['sparkle', 'mist', 'spark', 'petalfall', 'firefly', 'none']);
const TEXTURE = new Set(['brush', 'lines', 'confetti', 'ink', 'none']);
const HEX = /^#[0-9a-f]{6}$/i;
const EMBED_HOSTS = ['open.spotify.com', 'www.youtube-nocookie.com', 'www.youtube.com', 'w.soundcloud.com', 'embed.music.apple.com'];

const num = (v: unknown, lo: number, hi: number, fallback: number): number =>
  typeof v === 'number' && Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : fallback;
const str = (v: unknown, max: number): string => (typeof v === 'string' ? v.slice(0, max) : '');
const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);

// ---------------------------------------------------------------- export

/** The plant exactly as stored — copied field by field so nothing extra can ride along. */
export function publicPlant(p: PlantParams): PlantParams {
  return {
    petal_style: p.petal_style, petal_style_inner: p.petal_style_inner, petal_count: p.petal_count, layers: p.layers,
    petal_length: p.petal_length, petal_width: p.petal_width,
    colors: { petals: [...p.colors.petals], center: p.colors.center, glow: p.colors.glow, stem: p.colors.stem, leaf: p.colors.leaf },
    stem_height: p.stem_height, stem_curve: p.stem_curve, stem_kinks: p.stem_kinks, bloom_tilt: p.bloom_tilt,
    leaf_count: p.leaf_count, leaf_shape: p.leaf_shape, glow_intensity: p.glow_intensity,
    sway_speed: p.sway_speed, sway_amplitude: p.sway_amplitude, pulse_period: p.pulse_period,
    particle_style: p.particle_style, particle_density: p.particle_density, texture: p.texture,
    relief_gradient: p.relief_gradient, seed: p.seed,
  };
}

/** One memory as it travels to a friend, or null when it must stay home. */
export function toSharedMemory(m: Memory): SharedMemory | null {
  if (m.privacy !== 'garden' && m.privacy !== 'shared') return null;
  const base: SharedMemory = { id: m.id, date: m.date, privacy: m.privacy, plant: publicPlant(m.plant) };
  if (m.privacy === 'garden') return base;   // the flower only: no DNA scores, no words, no pictures, no song
  base.visual = { ...m.visual, dominant_colors: [...m.visual.dominant_colors] };
  base.title = m.title; base.story = m.story; base.quote = m.quote; base.lang = m.lang;
  base.reasons = m.reasons.map((r) => ({ source: r.source, code: r.code, ...(r.values ? { values: { ...r.values } } : {}) }));
  base.photos = m.photos.map((ph) => ({ name: ph.name, thumb: ph.thumb, width: ph.width, height: ph.height }));
  // never ship audio files: only links and the owner's honest description of the song
  base.music = m.music.kind === 'link'
    ? { kind: 'link', url: m.music.url, service: m.music.service, embedUrl: m.music.embedUrl, title: m.music.title, descriptors: m.music.descriptors }
    : { kind: 'none', title: m.music.title, descriptors: m.music.descriptors };
  return base;
}

export function buildPlanetFile(profile: Profile | null, memories: Memory[], now: Date = new Date()): PlanetFile | null {
  if (!profile) return null;
  const shared: SharedMemory[] = [];
  for (const m of memories) { const s = toSharedMemory(m); if (s) shared.push(s); }
  return { format: 'memory-island-planet', version: 1, planetName: profile.planetName, theme: profile.theme, code: profile.code, exportedAt: now.toISOString(), memories: shared };
}

// ---------------------------------------------------------------- import

function sanitizePlant(p: unknown): PlantParams | null {
  if (!isObj(p) || !isObj(p.colors)) return null;
  const petals = Array.isArray(p.colors.petals) ? p.colors.petals.filter((c): c is string => typeof c === 'string' && HEX.test(c)).slice(0, 4) : [];
  if (petals.length < 1) return null;
  const col = (v: unknown, fb: string) => (typeof v === 'string' && HEX.test(v) ? v : fb);
  return {
    petal_style: PETAL.has(p.petal_style as string) ? (p.petal_style as PlantParams['petal_style']) : 'soft_rounded',
    petal_style_inner: PETAL.has(p.petal_style_inner as string) ? (p.petal_style_inner as PlantParams['petal_style']) : 'soft_rounded',
    petal_count: Math.round(num(p.petal_count, 3, 20, 6)),
    layers: Math.round(num(p.layers, 1, 3, 1)),
    petal_length: num(p.petal_length, 0.5, 1.6, 1),
    petal_width: num(p.petal_width, 0.3, 1.6, 1),
    colors: { petals, center: col(p.colors.center, '#f6d78d'), glow: col(p.colors.glow, petals[0]), stem: col(p.colors.stem, '#5f9b55'), leaf: col(p.colors.leaf, '#6aa65b') },
    stem_height: num(p.stem_height, 0.4, 1, 0.75),
    stem_curve: num(p.stem_curve, 0, 1, 0.5),
    stem_kinks: Math.round(num(p.stem_kinks, 0, 6, 0)),
    bloom_tilt: num(p.bloom_tilt, -60, 60, 0),
    leaf_count: Math.round(num(p.leaf_count, 0, 6, 2)),
    leaf_shape: LEAF.has(p.leaf_shape as string) ? (p.leaf_shape as PlantParams['leaf_shape']) : 'round',
    glow_intensity: num(p.glow_intensity, 0, 1, 0.5),
    sway_speed: num(p.sway_speed, 0, 1, 0.4),
    sway_amplitude: num(p.sway_amplitude, 0, 12, 3),
    pulse_period: num(p.pulse_period, 0.4, 6, 2.4),
    particle_style: PARTICLE.has(p.particle_style as string) ? (p.particle_style as PlantParams['particle_style']) : 'none',
    particle_density: num(p.particle_density, 0, 1, 0.3),
    texture: TEXTURE.has(p.texture as string) ? (p.texture as PlantParams['texture']) : 'none',
    relief_gradient: p.relief_gradient === true,
    seed: Math.round(num(p.seed, 0, 4294967295, 1)),
  };
}

function sanitizeVisual(v: unknown): VisualParameters {
  const o = isObj(v) ? v : {};
  const k = (key: string) => num(o[key], 0, 1, 0.4);
  return {
    warmth: k('warmth'), energy: k('energy'), calmness: k('calmness'), nostalgia: k('nostalgia'), tension: k('tension'), joy: k('joy'),
    sadness: k('sadness'), wonder: k('wonder'), complexity: k('complexity'), night: k('night'), social: k('social'), relief: k('relief'),
    dominant_colors: Array.isArray(o.dominant_colors) ? o.dominant_colors.filter((c): c is string => typeof c === 'string' && HEX.test(c)).slice(0, 4) : [],
  };
}

function sanitizeDescriptors(d: unknown): MusicDescriptors | undefined {
  if (!isObj(d)) return undefined;
  const mood = d.mood === 'bright' || d.mood === 'melancholic' || d.mood === 'mixed' ? d.mood : 'mixed';
  return { tempo: num(d.tempo, 0, 1, 0.5), energy: num(d.energy, 0, 1, 0.5), mood, genre: str(d.genre, 40) };
}

function safeHttpUrl(v: unknown): string | undefined {
  if (typeof v !== 'string' || v.length > 2048) return undefined;
  try { const u = new URL(v); return u.protocol === 'https:' || u.protocol === 'http:' ? u.toString() : undefined; } catch { return undefined; }
}

export function sanitizeSharedMemory(raw: unknown): SharedMemory | null {
  if (!isObj(raw)) return null;
  if (typeof raw.id !== 'string' || !raw.id || raw.id.length > 80) return null;
  if (!isValidISODate(raw.date)) return null;
  if (raw.privacy !== 'garden' && raw.privacy !== 'shared') return null;   // 'private' never leaves a planet
  const plant = sanitizePlant(raw.plant);
  if (!plant) return null;
  const base: SharedMemory = { id: raw.id, date: raw.date, privacy: raw.privacy, plant };
  if (raw.privacy === 'garden') return base;   // enforce: no DNA scores, title, story, photos or music for garden-only days
  base.visual = sanitizeVisual(raw.visual);
  base.title = str(raw.title, LIMITS.titleChars);
  base.story = str(raw.story, LIMITS.storyChars);
  base.quote = str(raw.quote, LIMITS.quoteChars);
  base.lang = raw.lang === 'en' ? 'en' : 'ru';
  base.photos = Array.isArray(raw.photos)
    ? raw.photos.filter(isObj).filter((p) => typeof p.thumb === 'string' && p.thumb.startsWith('data:image/') && p.thumb.length <= LIMITS.thumbChars)
      .slice(0, LIMITS.photosPerMemory)
      .map((p) => ({ name: str(p.name, 120) || 'photo', thumb: p.thumb as string, width: Math.round(num(p.width, 1, 20000, 1)), height: Math.round(num(p.height, 1, 20000, 1)) }))
    : [];
  if (isObj(raw.music) && raw.music.kind === 'link') {
    const url = safeHttpUrl(raw.music.url);
    if (url) {
      const service = detectService(url);
      let embedUrl = safeHttpUrl(raw.music.embedUrl);
      if (embedUrl && !EMBED_HOSTS.includes(new URL(embedUrl).hostname)) embedUrl = undefined;
      if (!embedUrl) embedUrl = makeEmbedUrl(url, service);
      base.music = { kind: 'link', url, service, embedUrl, title: str(raw.music.title, 160) || undefined, descriptors: sanitizeDescriptors(raw.music.descriptors) };
    } else base.music = { kind: 'none' };
  } else {
    base.music = { kind: 'none', title: isObj(raw.music) ? str(raw.music.title, 160) || undefined : undefined, descriptors: isObj(raw.music) ? sanitizeDescriptors(raw.music.descriptors) : undefined };
  }
  if (Array.isArray(raw.reasons)) {
    base.reasons = raw.reasons.filter(isObj).filter((r) => typeof r.code === 'string' && r.code.length < 60 && (r.source === 'text' || r.source === 'photo' || r.source === 'music' || r.source === 'user'))
      .slice(0, 60).map((r) => ({ source: r.source as SharedMemory['reasons'] extends (infer R)[] | undefined ? R extends { source: infer S } ? S : never : never, code: r.code as string, values: isObj(r.values) ? Object.fromEntries(Object.entries(r.values).filter(([, v]) => typeof v === 'string' || typeof v === 'number').map(([k, v]) => [k.slice(0, 30), typeof v === 'string' ? v.slice(0, 200) : v])) as Record<string, string | number> : undefined }));
  }
  return base;
}

export function validatePlanetFile(raw: unknown, byteSize?: number): ImportResult {
  if (byteSize !== undefined && byteSize > LIMITS.fileBytes) return { ok: false, error: 'too_big' };
  if (!isObj(raw) || raw.format !== 'memory-island-planet' || !Array.isArray(raw.memories)) return { ok: false, error: 'bad_format' };
  if (raw.version !== 1) return { ok: false, error: 'bad_version' };
  if (raw.memories.length > LIMITS.memories) return { ok: false, error: 'too_many' };
  const seen = new Set<string>();
  const memories: SharedMemory[] = [];
  let skipped = 0;
  for (const m of raw.memories) {
    const s = sanitizeSharedMemory(m);
    if (!s || seen.has(s.id)) { skipped++; continue; }
    seen.add(s.id); memories.push(s);
  }
  if (!memories.length) return { ok: false, error: 'empty' };
  const code = str(raw.code, 24).replace(/[^A-Za-z0-9_-]/g, '') || `f_${Date.now().toString(36)}`;
  const planet: FriendPlanet = {
    id: code,
    planetName: str(raw.planetName, LIMITS.nameChars).trim() || 'Planet',
    theme: THEMES.includes(raw.theme as PlanetTheme) ? (raw.theme as PlanetTheme) : 'rose',
    code,
    importedAt: new Date().toISOString(),
    exportedAt: typeof raw.exportedAt === 'string' ? raw.exportedAt.slice(0, 40) : '',
    memories,
  };
  return { ok: true, planet, skipped };
}
