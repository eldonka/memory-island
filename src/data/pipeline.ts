// ============================================================
// Memory pipeline: user input → analysis → DNA → plant → saved Memory.
// Analysis never writes to storage: uploaded audio stays in memory as
// `pendingAudio` until the user confirms, so cancelled drafts leave no orphans.
// ============================================================
import type { AudioAnalysis, Lang, Memory, MusicDescriptors, MusicFeatures, MusicRef, PhotoFeatures, PhotoRef, Privacy, Reason, TextFeatures, VisualParameters } from './types';
import { analyzeText, generateTitle, extractQuote } from '../analysis/text';
import { analyzePhotos } from '../analysis/photo';
import { analyzeAudioBlob, detectService, fetchLinkTitle, makeEmbedUrl, musicFromAnalysis, musicFromDescriptors, EMPTY_MUSIC_FEATURES } from '../analysis/music';
import { buildVisual } from '../analysis/dna';
import { generatePlant } from '../plant/generate';
import { hashString, makeId } from '../plant/random';
import { putBlob } from './db';

export interface MusicInput {
  kind: 'link' | 'file' | 'none';
  url?: string;
  title?: string;
  file?: Blob;            // new upload (not yet persisted)
  fileId?: string;        // already stored (editing without replacing the file)
  fileName?: string;
  descriptors: MusicDescriptors;
  analysis?: AudioAnalysis; // cached from an earlier run
}

export interface Analysis {
  text: TextFeatures;
  photos: PhotoFeatures;
  music: MusicFeatures;
  musicRef: MusicRef;
  visual: VisualParameters;
  reasons: Reason[];
  titleAuto: string;
  quote: string;
  lang: Lang;
  pendingAudio?: { id: string; blob: Blob };
}

export type Stage = 'text' | 'photos' | 'music';

export async function analyzeInput(story: string, photos: PhotoRef[], music: MusicInput, onStage?: (s: Stage) => void): Promise<Analysis> {
  onStage?.('text');
  const text = analyzeText(story);
  const titleAuto = generateTitle(story, text);
  const quote = extractQuote(story);

  onStage?.('photos');
  const photoFeatures = await analyzePhotos(photos.map((p) => p.thumb));

  onStage?.('music');
  let musicFeatures: MusicFeatures = { ...EMPTY_MUSIC_FEATURES };
  let musicRef: MusicRef = { kind: 'none' };
  let pendingAudio: Analysis['pendingAudio'];
  if (music.kind === 'file' && (music.file || music.fileId)) {
    let analysis = music.analysis;
    let fileId = music.fileId;
    if (music.file) {
      fileId = makeId('a');
      pendingAudio = { id: fileId, blob: music.file };
      try { analysis = await analyzeAudioBlob(music.file); } catch (e) { console.warn('audio analysis failed', e); analysis = undefined; }
    }
    musicFeatures = analysis ? musicFromAnalysis(analysis, music.descriptors) : musicFromDescriptors(music.descriptors);
    musicRef = { kind: 'file', fileId, fileName: music.fileName, title: music.title, descriptors: music.descriptors, analysis };
  } else if (music.kind === 'link' && music.url) {
    const service = detectService(music.url);
    const embedUrl = makeEmbedUrl(music.url, service);
    let title = music.title?.trim();
    if (!title) { try { title = (await fetchLinkTitle(music.url, service)) || undefined; } catch { /* offline */ } }
    musicFeatures = musicFromDescriptors(music.descriptors);
    musicRef = { kind: 'link', url: music.url, service, embedUrl, title, descriptors: music.descriptors };
  }

  const { visual, reasons } = buildVisual(text, photoFeatures, musicFeatures);
  return { text, photos: photoFeatures, music: musicFeatures, musicRef, visual, reasons, titleAuto, quote, lang: text.lang, pendingAudio };
}

/** Persist assets the analysis kept in memory. Returns the ids written (for compensation on failure). */
export async function persistAnalysisAssets(a: Analysis): Promise<string[]> {
  const written: string[] = [];
  if (a.pendingAudio) { await putBlob(a.pendingAudio.id, a.pendingAudio.blob); written.push(a.pendingAudio.id); }
  return written;
}

export function composeMemory(opts: {
  id?: string; date: string; story: string; photos: PhotoRef[]; analysis: Analysis; visual: VisualParameters;
  title: string; privacy: Privacy; existing?: Memory; userAdjusted: boolean;
}): Memory {
  const id = opts.id || opts.existing?.id || makeId('m');
  const seed = opts.existing?.plant.seed ?? hashString(id);
  const { plant, reasons: plantReasons } = generatePlant(opts.visual, opts.analysis.music, seed);
  const now = new Date().toISOString();
  return {
    id,
    date: opts.date,
    createdAt: opts.existing?.createdAt || now,
    updatedAt: now,
    title: opts.title.trim() || opts.analysis.titleAuto,
    titleAuto: opts.analysis.titleAuto,
    story: opts.story,
    quote: opts.analysis.quote,
    lang: opts.analysis.lang,
    photos: opts.photos,
    music: opts.analysis.musicRef,
    analysis: { text: opts.analysis.text, photos: opts.analysis.photos, music: opts.analysis.music },
    visual: opts.visual,
    plant,
    reasons: [...opts.analysis.reasons, ...plantReasons, ...(opts.userAdjusted ? [{ source: 'user', code: 'user.adjusted' } as Reason] : [])],
    userAdjusted: opts.userAdjusted,
    privacy: opts.privacy,
    version: 1,
  };
}

/** Re-generate only the plant from (possibly user-adjusted) visual parameters — used for the live preview. */
export function previewPlant(visual: VisualParameters, music: MusicFeatures, seed: number) {
  return generatePlant(visual, music, seed).plant;
}
