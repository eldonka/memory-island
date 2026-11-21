// ============================================================
// Music analysis.
//  - Audio files: Web Audio API (OfflineAudioContext) → RMS energy, loudness
//    dynamics, tempo via onset-envelope autocorrelation, zero-crossing brightness.
//  - Links: we cannot download audio from streaming services, so we read
//    public oEmbed metadata (title) where CORS allows and rely on the user's
//    honest description (tempo / energy / mood / genre). Source is always
//    recorded so the UI can say which path was used.
// ============================================================
import type { AudioAnalysis, MusicDescriptors, MusicFeatures, MusicService } from '../data/types';
import { clamp } from '../plant/random';

// ---------- link helpers ----------
export function detectService(url: string): MusicService {
  const u = url.toLowerCase();
  if (u.includes('spotify.com')) return 'spotify';
  if (u.includes('youtube.com') || u.includes('youtu.be') || u.includes('music.youtube')) return 'youtube';
  if (u.includes('soundcloud.com')) return 'soundcloud';
  if (u.includes('music.apple.com')) return 'apple';
  if (u.includes('music.yandex')) return 'yandex';
  if (u.includes('deezer.com')) return 'deezer';
  return 'other';
}

export function makeEmbedUrl(url: string, service: MusicService): string | undefined {
  try {
    const u = new URL(url);
    if (service === 'spotify') {
      const m = u.pathname.match(/\/(track|album|playlist|episode)\/([A-Za-z0-9]+)/);
      if (m) return `https://open.spotify.com/embed/${m[1]}/${m[2]}?theme=0`;
    }
    if (service === 'youtube') {
      let id = u.searchParams.get('v');
      if (!id && u.hostname.includes('youtu.be')) id = u.pathname.slice(1);
      if (!id) { const m = u.pathname.match(/\/(shorts|embed)\/([A-Za-z0-9_-]+)/); if (m) id = m[2]; }
      if (id) return `https://www.youtube-nocookie.com/embed/${id}`;
    }
    if (service === 'soundcloud') {
      return `https://w.soundcloud.com/player/?url=${encodeURIComponent(url)}&color=%23f6d78d&auto_play=false&hide_related=true&show_comments=false&show_user=true&visual=false`;
    }
    if (service === 'apple') {
      return url.replace('music.apple.com', 'embed.music.apple.com');
    }
  } catch { /* invalid url */ }
  return undefined;
}

/** Try to fetch a public title for the link. Fails silently (returns null) when CORS blocks it. */
export async function fetchLinkTitle(url: string, service: MusicService): Promise<string | null> {
  const endpoints: string[] = [];
  if (service === 'spotify') endpoints.push(`https://open.spotify.com/oembed?url=${encodeURIComponent(url)}`);
  if (service === 'soundcloud') endpoints.push(`https://soundcloud.com/oembed?format=json&url=${encodeURIComponent(url)}`);
  endpoints.push(`https://noembed.com/embed?url=${encodeURIComponent(url)}`);
  for (const ep of endpoints) {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 3500);
      const res = await fetch(ep, { signal: ctrl.signal });
      clearTimeout(t);
      if (!res.ok) continue;
      const j = await res.json();
      if (j && typeof j.title === 'string' && j.title.trim()) {
        return j.author_name && !j.title.includes(j.author_name) ? `${j.author_name} — ${j.title}` : j.title;
      }
    } catch { /* next */ }
  }
  return null;
}

// ---------- audio file analysis ----------
export async function analyzeAudioBlob(blob: Blob): Promise<AudioAnalysis> {
  const buf = await blob.arrayBuffer();
  const AC: typeof AudioContext = (window as any).AudioContext || (window as any).webkitAudioContext;
  const probe = new AC();
  let decoded: AudioBuffer;
  try { decoded = await probe.decodeAudioData(buf.slice(0)); } finally { probe.close().catch(() => {}); }

  const sr = decoded.sampleRate;
  const durationSec = decoded.duration;
  // analyze up to 60 s from the middle of the track (skip intros/outros)
  const maxLen = Math.min(decoded.length, Math.floor(60 * sr));
  const start = Math.max(0, Math.floor((decoded.length - maxLen) / 2));
  const mono = new Float32Array(maxLen);
  for (let ch = 0; ch < decoded.numberOfChannels; ch++) {
    const d = decoded.getChannelData(ch);
    for (let i = 0; i < maxLen; i++) mono[i] += d[start + i] / decoded.numberOfChannels;
  }

  // frame-wise RMS (≈23 ms hops) and zero-crossing rate
  const hop = 1024;
  const frames = Math.floor(maxLen / hop);
  const rms = new Float32Array(frames);
  let zc = 0;
  for (let f = 0; f < frames; f++) {
    let s = 0;
    for (let i = f * hop; i < (f + 1) * hop; i++) {
      s += mono[i] * mono[i];
      if (i > 0 && (mono[i] >= 0) !== (mono[i - 1] >= 0)) zc++;
    }
    rms[f] = Math.sqrt(s / hop);
  }
  const meanRms = rms.reduce((a, b) => a + b, 0) / (frames || 1);
  const stdRms = Math.sqrt(rms.reduce((a, b) => a + (b - meanRms) ** 2, 0) / (frames || 1));
  // energy: -40 dBFS → 0, -8 dBFS → 1
  const db = 20 * Math.log10(meanRms + 1e-6);
  const energy = clamp((db + 40) / 32);
  const dynamics = clamp(stdRms / (meanRms + 1e-6) / 1.2);
  const zcr = zc / maxLen; // crossings per sample
  const brightness = clamp((zcr - 0.02) / 0.18);

  // tempo: onset envelope = positive flux of RMS; autocorrelate in 60..180 BPM
  const flux = new Float32Array(frames);
  for (let f = 1; f < frames; f++) flux[f] = Math.max(0, rms[f] - rms[f - 1]);
  const fm = flux.reduce((a, b) => a + b, 0) / (frames || 1);
  for (let f = 0; f < frames; f++) flux[f] -= fm;
  const fps = sr / hop;
  const minLag = Math.floor((60 / 180) * fps), maxLag = Math.ceil((60 / 60) * fps);
  let bestLag = minLag, best = -Infinity;
  for (let lag = minLag; lag <= maxLag; lag++) {
    let s = 0;
    for (let f = lag; f < frames; f++) s += flux[f] * flux[f - lag];
    // mild preference toward 90–130 BPM to avoid octave errors
    const bpm = 60 * fps / lag;
    const prior = Math.exp(-((bpm - 110) ** 2) / (2 * 45 ** 2));
    s *= 0.6 + 0.4 * prior;
    if (s > best) { best = s; bestLag = lag; }
  }
  const bpm = Math.round(60 * fps / bestLag);
  return { bpm, energy, dynamics, brightness, durationSec };
}

// ---------- unify ----------
export const EMPTY_MUSIC_FEATURES: MusicFeatures = {
  source: 'none', bpm: null, tempo: 0.45, energy: 0.45, dynamics: 0.4, brightness: null, mood: null, genre: '',
};

export function musicFromAnalysis(a: AudioAnalysis, descriptors?: Partial<MusicDescriptors>): MusicFeatures {
  return {
    source: 'audio',
    bpm: a.bpm,
    tempo: clamp((a.bpm - 60) / 120),
    energy: a.energy,
    dynamics: a.dynamics,
    brightness: a.brightness,
    mood: descriptors?.mood ?? null,
    genre: descriptors?.genre ?? '',
  };
}

export function musicFromDescriptors(d: MusicDescriptors): MusicFeatures {
  return {
    source: 'descriptors',
    bpm: Math.round(60 + d.tempo * 120),
    tempo: d.tempo,
    energy: d.energy,
    dynamics: 0.3 + d.energy * 0.4,
    brightness: d.mood === 'bright' ? 0.65 : d.mood === 'melancholic' ? 0.3 : 0.48,
    mood: d.mood,
    genre: d.genre,
  };
}
