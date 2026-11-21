// ============================================================
// Memory Island — core data types
// ============================================================

export type Lang = 'ru' | 'en';
export type Privacy = 'private' | 'garden' | 'shared';
export type PlanetTheme = 'rose' | 'lavender' | 'mint' | 'gold';

export type PetalStyle = 'soft_rounded' | 'pointed' | 'layered' | 'angular' | 'bell' | 'wispy' | 'star';
export type LeafShape = 'round' | 'pointed' | 'serrated';
export type ParticleStyle = 'sparkle' | 'mist' | 'spark' | 'petalfall' | 'firefly' | 'none';
export type TextureStyle = 'brush' | 'lines' | 'confetti' | 'ink' | 'none';
export type Season = 'autumn' | 'winter' | 'spring' | 'summer' | null;
export type PhotoAtmosphere = 'golden' | 'cool' | 'night' | 'airy' | 'vivid' | 'muted';
export type MusicMood = 'bright' | 'melancholic' | 'mixed';
export type MusicSource = 'audio' | 'descriptors' | 'none';
export type MusicService = 'spotify' | 'youtube' | 'soundcloud' | 'apple' | 'yandex' | 'deezer' | 'other';

// ---------- analysis features ----------
export interface TextFeatures {
  warmth: number; cold: number; joy: number; sadness: number;
  calm: number; tension: number; energy: number; nostalgia: number;
  wonder: number; social: number; nature: number; night: number; morning: number;
  relief: number; work: number; city: number;
  season: Season;
  intensity: number;   // exclamation / intensifiers / caps
  complexity: number;  // sentence variety & vocabulary richness
  wordCount: number;
  lang: Lang;
  keywords: string[];                 // matched lexicon display words
  matched: Record<string, string[]>;  // category -> words found in the story
}

export interface PhotoFeatures {
  count: number;
  brightness: number;   // 0..1 mean luminance
  contrast: number;     // 0..1 luminance spread
  saturation: number;   // 0..1
  warmth: number;       // 0..1 (0 cool, 1 warm)
  hueVariety: number;   // 0..1
  dominant: string[];   // hex, most frequent first
  atmosphere: PhotoAtmosphere;
}

export interface AudioAnalysis {
  bpm: number;
  energy: number;      // 0..1 normalized RMS
  dynamics: number;    // 0..1 variation of loudness
  brightness: number;  // 0..1 zero-crossing proxy for high-frequency content
  durationSec: number;
}

export interface MusicFeatures {
  source: MusicSource;
  bpm: number | null;
  tempo: number;      // 0..1 (slow .. fast)
  energy: number;     // 0..1
  dynamics: number;   // 0..1
  brightness: number | null; // 0..1 or null if unknown
  mood: MusicMood | null;
  genre: string;
}

export interface MusicDescriptors {
  tempo: number;   // 0..1 slow..fast
  energy: number;  // 0..1 calm..intense
  mood: MusicMood;
  genre: string;
}

export interface MusicRef {
  kind: 'link' | 'file' | 'none';
  url?: string;
  service?: MusicService;
  embedUrl?: string;
  title?: string;          // from oEmbed metadata or user-typed
  fileId?: string;         // blob store key
  fileName?: string;
  descriptors?: MusicDescriptors;
  analysis?: AudioAnalysis;
}

export interface PhotoRef {
  id: string;        // blob store key for the original
  name: string;
  width: number;
  height: number;
  thumb: string;     // data URL (max 1200px edge) — used for display & analysis
}

// ---------- memory DNA ----------
export interface VisualParameters {
  warmth: number; energy: number; calmness: number; nostalgia: number;
  tension: number; joy: number; sadness: number; wonder: number;
  complexity: number; night: number; social: number; relief: number;
  dominant_colors: string[];
}

export interface PlantParams {
  petal_style: PetalStyle;
  petal_style_inner: PetalStyle;
  petal_count: number;
  layers: number;
  petal_length: number;   // relative 0.6..1.4
  petal_width: number;    // relative 0.5..1.3
  colors: { petals: string[]; center: string; glow: string; stem: string; leaf: string };
  stem_height: number;    // 0..1 of available height
  stem_curve: number;     // 0..1 sway amplitude of the stem
  stem_kinks: number;     // 0..5 angular breaks
  bloom_tilt: number;     // degrees
  leaf_count: number;
  leaf_shape: LeafShape;
  glow_intensity: number; // 0..1
  sway_speed: number;     // 0..1
  sway_amplitude: number; // degrees
  pulse_period: number;   // seconds (from music tempo)
  particle_style: ParticleStyle;
  particle_density: number; // 0..1
  texture: TextureStyle;
  relief_gradient: boolean;
  seed: number;
}

export type ReasonSource = 'text' | 'photo' | 'music' | 'user';
export interface Reason {
  source: ReasonSource;
  code: string;                       // i18n key: reason.<code>
  values?: Record<string, string | number>;
}

export interface MemoryDNA {
  title: string;
  visual: VisualParameters;
  plant: PlantParams;
  reasons: Reason[];
}

// ---------- memory record (the "day folder") ----------
export interface Memory {
  id: string;
  date: string;        // YYYY-MM-DD (when the day happened)
  createdAt: string;   // ISO (when the memory was recorded)
  updatedAt: string;
  title: string;       // final (user may edit)
  titleAuto: string;   // generated 3–7 words
  story: string;
  quote: string;
  lang: Lang;
  photos: PhotoRef[];
  music: MusicRef;
  analysis: { text: TextFeatures; photos: PhotoFeatures; music: MusicFeatures };
  visual: VisualParameters;
  plant: PlantParams;
  reasons: Reason[];
  userAdjusted: boolean;
  privacy: Privacy;
  version: 1;
}

export interface Profile {
  planetName: string;
  theme: PlanetTheme;
  lang: Lang;
  reducedMotion: boolean;
  createdAt: string;
  code: string;    // short invite code (for planet files)
  seeded: boolean;
}

// A friend's planet imported from an exported planet file
export interface FriendPlanet {
  id: string;
  planetName: string;
  theme: PlanetTheme;
  code: string;
  importedAt: string;
  exportedAt: string;
  memories: SharedMemory[];
}

// what leaves your planet when you export it: privacy is enforced here
export interface SharedMemory {
  id: string;
  date: string;
  privacy: 'garden' | 'shared';
  plant: PlantParams;    // everything needed to draw the flower — and nothing more for 'garden'
  // only present when privacy === 'shared' (the DNA scores are derived from the private story)
  visual?: VisualParameters;
  title?: string;
  story?: string;
  quote?: string;
  lang?: Lang;
  photos?: { name: string; thumb: string; width: number; height: number }[];
  music?: { kind: 'link' | 'none'; url?: string; service?: MusicService; embedUrl?: string; title?: string; descriptors?: MusicDescriptors };
  reasons?: Reason[];
}

export interface PlanetFile {
  format: 'memory-island-planet';
  version: 1;
  planetName: string;
  theme: PlanetTheme;
  code: string;
  exportedAt: string;
  memories: SharedMemory[];
}
