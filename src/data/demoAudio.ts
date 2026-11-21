// ============================================================
// Demo audio — short royalty-free tracks synthesized in the browser
// (kick pulse + pad chords + arpeggio) so the real Web Audio analysis path
// runs on the demo memories without touching copyrighted music.
// ============================================================
import { mulberry32 } from '../plant/random';

export interface SynthOpts { bpm: number; seconds?: number; energy: number; mode: 'major' | 'minor'; brightness: number; seed?: number }

export function synthTrack(o: SynthOpts): Blob {
  const sr = 22050;
  const seconds = o.seconds ?? 24;
  const N = Math.floor(sr * seconds);
  const out = new Float32Array(N);
  const rand = mulberry32(o.seed ?? 7);
  const beat = 60 / o.bpm;
  const root = 220;
  const chordSets = o.mode === 'major' ? [[0, 4, 7, 12], [5, 9, 12, 16], [7, 11, 14, 19], [0, 4, 7, 12]] : [[0, 3, 7, 10], [-4, 0, 3, 7], [5, 8, 12, 15], [0, 3, 7, 10]];
  const f = (semi: number) => root * Math.pow(2, semi / 12);

  // pad: slow-attack sines with harmonics scaled by brightness
  for (let i = 0; i < N; i++) {
    const t = i / sr;
    const bar = Math.floor(t / (beat * 4)) % chordSets.length;
    const chord = chordSets[bar];
    let s = 0;
    for (const semi of chord) {
      const fr = f(semi);
      s += Math.sin(2 * Math.PI * fr * t) + o.brightness * 0.45 * Math.sin(2 * Math.PI * fr * 2 * t) + o.brightness * 0.2 * Math.sin(2 * Math.PI * fr * 3 * t);
    }
    const lfo = 0.8 + 0.2 * Math.sin(2 * Math.PI * 0.15 * t);
    out[i] += (s / chord.length) * 0.22 * lfo * Math.min(1, t / 1.5);
  }
  // kick on every beat
  const kickLen = Math.floor(sr * 0.16);
  for (let b = 0; b * beat < seconds; b++) {
    const start = Math.floor(b * beat * sr);
    const amp = 0.25 + 0.6 * o.energy;
    for (let k = 0; k < kickLen && start + k < N; k++) {
      const tt = k / sr;
      const fr = 50 + 90 * Math.exp(-tt * 40);
      out[start + k] += Math.sin(2 * Math.PI * fr * tt) * Math.exp(-tt * 22) * amp;
    }
    // hat on off-beats for energetic tracks
    if (o.energy > 0.45) {
      const hs = Math.floor((b + 0.5) * beat * sr);
      const hl = Math.floor(sr * 0.03);
      for (let k = 0; k < hl && hs + k < N; k++) out[hs + k] += (rand() * 2 - 1) * Math.exp(-(k / sr) * 150) * 0.18 * o.energy;
    }
  }
  // arpeggio on 8th notes for energy > 0.35
  if (o.energy > 0.35) {
    const step = beat / 2;
    const noteLen = Math.floor(sr * Math.min(0.3, step * 0.9));
    for (let n = 0; n * step < seconds; n++) {
      const start = Math.floor(n * step * sr);
      const bar = Math.floor((n * step) / (beat * 4)) % chordSets.length;
      const chord = chordSets[bar];
      const semi = chord[n % chord.length] + 12;
      const fr = f(semi);
      const amp = 0.12 + 0.18 * o.energy;
      for (let k = 0; k < noteLen && start + k < N; k++) {
        const tt = k / sr;
        out[start + k] += (Math.sin(2 * Math.PI * fr * tt) + o.brightness * 0.3 * Math.sin(2 * Math.PI * fr * 2 * tt)) * Math.exp(-tt * 9) * amp;
      }
    }
  }
  // normalize: louder for energetic tracks so RMS energy differs measurably
  let peak = 0; for (let i = 0; i < N; i++) peak = Math.max(peak, Math.abs(out[i]));
  const target = 0.45 + 0.5 * o.energy;
  const g = peak > 0 ? target / peak : 1;
  // fade in/out
  const fade = Math.floor(sr * 0.5);
  for (let i = 0; i < N; i++) {
    let v = out[i] * g;
    if (i < fade) v *= i / fade; if (N - i < fade) v *= (N - i) / fade;
    out[i] = Math.max(-1, Math.min(1, v));
  }
  return encodeWav(out, sr);
}

export function encodeWav(samples: Float32Array, sr: number): Blob {
  const buf = new ArrayBuffer(44 + samples.length * 2);
  const v = new DataView(buf);
  const str = (o: number, s: string) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  str(0, 'RIFF'); v.setUint32(4, 36 + samples.length * 2, true); str(8, 'WAVE');
  str(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, sr, true); v.setUint32(28, sr * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true);
  str(36, 'data'); v.setUint32(40, samples.length * 2, true);
  let o = 44;
  for (let i = 0; i < samples.length; i++, o += 2) v.setInt16(o, Math.round(samples[i] * 32767), true);
  return new Blob([buf], { type: 'audio/wav' });
}
