// "Day folder" export — everything that belongs to the day, in one zip:
// story.txt, memory.json (DNA + reasons), photos/, song.txt or the user's own
// audio file, and flower.svg (the generated plant). Mirrors the hackathon's
// "папка дня" requirement in a form that can be opened outside the app.
import JSZip from 'jszip';
import type { Lang, Memory } from './types';
import { getBlob } from './db';
import { STRINGS, formatDate } from '../i18n/strings';

export function safeName(s: string): string {
  return s.replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 60) || 'memory';
}

export function downloadBlob(blob: Blob, name: string) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = name;
  document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 2000);
}

export function reasonsText(m: Memory, lang: Lang): string[] {
  const t = STRINGS[lang];
  return m.reasons.map((r) => { const f = t.reason[r.code]; return f ? f(r.values || {}) : r.code; });
}

export async function exportDayFolder(m: Memory, lang: Lang, svgMarkup?: string) {
  const zip = new JSZip();
  const folder = zip.folder(safeName(m.title))!;
  const date = formatDate(m.date, lang);
  folder.file('story.txt', `${m.title}\n${date}\n\n${m.story}\n\n— ${m.quote}\n`);
  folder.file('memory.json', JSON.stringify({
    id: m.id, title: m.title, titleAuto: m.titleAuto, date: m.date, createdAt: m.createdAt, updatedAt: m.updatedAt,
    quote: m.quote, privacy: m.privacy, visual: m.visual, plant: m.plant, analysis: m.analysis,
    music: { ...m.music, fileId: undefined }, reasons: reasonsText(m, lang),
  }, null, 2));
  const photos = folder.folder('photos')!;
  for (let i = 0; i < m.photos.length; i++) {
    const p = m.photos[i];
    const blob = await getBlob(p.id);
    const ext = (p.name.split('.').pop() || 'jpg').toLowerCase();
    if (blob) photos.file(`${String(i + 1).padStart(2, '0')}_${safeName(p.name.replace(/\.[^.]+$/, ''))}.${ext}`, blob);
    else photos.file(`${String(i + 1).padStart(2, '0')}.jpg`, p.thumb.split(',')[1], { base64: true });
  }
  if (m.music.kind === 'link' && m.music.url) folder.file('song.txt', `${m.music.title || ''}\n${m.music.url}\n`);
  if (m.music.kind === 'file' && m.music.fileId) {
    const blob = await getBlob(m.music.fileId);
    if (blob) folder.file(m.music.fileName || 'song.wav', blob);
  }
  if (svgMarkup) folder.file('flower.svg', svgMarkup);
  const out = await zip.generateAsync({ type: 'blob' });
  downloadBlob(out, `${safeName(m.title)}.zip`);
}

export function exportSvg(m: Memory, svgMarkup: string) {
  const markup = svgMarkup.startsWith('<?xml') ? svgMarkup : `<?xml version="1.0" encoding="UTF-8"?>\n${svgMarkup}`;
  downloadBlob(new Blob([markup], { type: 'image/svg+xml' }), `${safeName(m.title)}.svg`);
}

/** Serialize a rendered plant <svg> with its inline styles so it opens standalone. */
export function serializePlantSvg(el: SVGSVGElement): string {
  const clone = el.cloneNode(true) as SVGSVGElement;
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  clone.removeAttribute('class');
  clone.querySelectorAll('.pt').forEach((n) => n.remove());
  return clone.outerHTML;
}
