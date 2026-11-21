// Optional voice narration via the browser's Web Speech API.
// Voice parameters follow the Memory DNA (rules, not randomness):
//   calm/sad → slower & lower, energetic/joyful → faster & slightly higher.
import type { Lang, VisualParameters } from './types';

export function narrationParams(v: VisualParameters) {
  const rate = Math.max(0.7, Math.min(1.35, 0.82 + v.energy * 0.45 - v.calmness * 0.12 + v.joy * 0.08));
  const pitch = Math.max(0.7, Math.min(1.3, 0.92 + v.warmth * 0.2 - v.sadness * 0.15 + v.joy * 0.08));
  return { rate: Number(rate.toFixed(2)), pitch: Number(pitch.toFixed(2)) };
}

export function canNarrate(): boolean { return typeof window !== 'undefined' && 'speechSynthesis' in window; }

export function speak(text: string, lang: Lang, v: VisualParameters, onEnd?: () => void): () => void {
  if (!canNarrate()) return () => {};
  const synth = window.speechSynthesis;
  synth.cancel();
  const u = new SpeechSynthesisUtterance(text);
  const { rate, pitch } = narrationParams(v);
  u.rate = rate; u.pitch = pitch; u.lang = lang === 'ru' ? 'ru-RU' : 'en-US';
  const voices = synth.getVoices();
  const pick = voices.find((vo) => vo.lang.toLowerCase().startsWith(lang)) || voices.find((vo) => vo.lang.toLowerCase().startsWith(lang === 'ru' ? 'ru' : 'en'));
  if (pick) u.voice = pick;
  u.onend = () => onEnd?.();
  u.onerror = () => onEnd?.();
  synth.speak(u);
  return () => { synth.cancel(); onEnd?.(); };
}
