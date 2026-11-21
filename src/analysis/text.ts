// ============================================================
// Text analysis — explainable, lexicon-based (RU/EN) with clause-aware negation.
// Produces emotional/thematic scores, a 3–7 word title and a grounded quote.
// ============================================================
import type { Lang, Season, TextFeatures } from '../data/types';
import { LEXICON, SEASON_STEMS, INTENSIFIERS, STOPWORDS, TITLE_NOUNS, SEASON_ADJ, MOOD_ADJ, type Category, type TitleNoun } from './lexicon';
import { clamp, sat } from '../plant/random';

export function detectLang(text: string): Lang {
  const cyr = (text.match(/[а-яё]/gi) || []).length;
  const lat = (text.match(/[a-z]/gi) || []).length;
  return cyr >= lat ? 'ru' : 'en';
}

const WORD_RE = /[a-zа-яё][a-zа-яё'’-]*/gi;

export function tokenize(text: string): string[] {
  return (text.toLowerCase().match(WORD_RE) || []).map((t) => t.replace(/[’']/g, "'"));
}

/** tokens with a clause index: punctuation and contrastive conjunctions start a new clause (negation never crosses them) */
export interface ClauseToken { t: string; c: number }
const CLAUSE_BREAK_WORDS = new Set(['но', 'а', 'зато', 'однако', 'хотя', 'впрочем', 'but', 'although', 'though', 'yet', 'however', 'whereas']);
export function tokenizeClauses(text: string): ClauseToken[] {
  const out: ClauseToken[] = [];
  let c = 0;
  const re = /[a-zа-яё][a-zа-яё'’-]*|[.,;:!?…()—–\-]+/gi;
  for (const m of text.toLowerCase().matchAll(re)) {
    const s = m[0];
    if (!/[a-zа-яё]/i.test(s)) { c++; continue; }
    const t = s.replace(/[’']/g, "'");
    if (CLAUSE_BREAK_WORDS.has(t)) { c++; continue; }
    out.push({ t, c });
  }
  return out;
}

const NEGATION = new Set([
  'не', 'ни', 'нет', 'без', 'никогда', 'нисколько', 'ничуть', 'вовсе', 'отнюдь', 'едва', 'нельзя', 'перестал', 'перестала', 'перестали',
  'not', 'no', 'never', 'without', 'hardly', 'barely', 'neither', 'nor', 'cannot', 'lack', 'lacked', 'lacking', 'stopped',
]);
const isNegation = (t: string) => NEGATION.has(t) || t.endsWith("n't");
const NEG_WINDOW = 3;

function stemMatches(stem: string, token: string): boolean {
  if (stem.endsWith('$')) return token === stem.slice(0, -1);
  return token.startsWith(stem) && (stem.length >= 3 || token.length <= stem.length + 1);
}

/** returns matched display words for a stem list (multi-word stems are searched in the raw text) — no negation logic */
function findMatches(stems: string[], tokens: string[], lowerText: string): string[] {
  const found: string[] = [];
  for (const stem of stems) {
    if (stem.includes(' ')) { if (lowerText.includes(stem)) found.push(stem); continue; }
    const hit = tokens.find((t) => stemMatches(stem, t));
    if (hit) found.push(hit);
  }
  return Array.from(new Set(found));
}

/** negation-aware matching: a hit preceded (within the same clause, ≤3 tokens) by a negation cue counts as negated */
function findMatchesCtx(stems: string[], toks: ClauseToken[], lowerText: string): { hits: string[]; negated: string[] } {
  const hits = new Set<string>(), negated = new Set<string>();
  const negatedAt = (k: number) => {
    for (let j = k - 1; j >= Math.max(0, k - NEG_WINDOW); j--) {
      if (toks[j].c !== toks[k].c) break;
      if (isNegation(toks[j].t)) return true;
    }
    return false;
  };
  for (const stem of stems) {
    if (stem.includes(' ')) { if (lowerText.includes(stem)) hits.add(stem); continue; }
    let plain: string | null = null, neg: string | null = null;
    for (let k = 0; k < toks.length; k++) {
      if (!stemMatches(stem, toks[k].t)) continue;
      if (negatedAt(k)) { neg = neg ?? toks[k].t; } else { plain = toks[k].t; break; }
    }
    if (plain) hits.add(plain); else if (neg) negated.add(neg);
  }
  return { hits: [...hits], negated: [...negated] };
}

export function splitSentences(text: string): string[] {
  return text
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?…])\s+|\n+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 1);
}

/** idioms that would mislead a word-level lexicon: "смеялись до слёз" is laughter, not sadness */
const IDIOMS: [RegExp, string][] = [
  [/(смея\S*|смех\S*|хохот\S*)\s+до\s+слёз/gi, '$1'],
  [/(смея\S*|смех\S*|хохот\S*)\s+до\s+слез/gi, '$1'],
  [/laugh\S*\s+(until|till)\s+(we|i|they|she|he|you)\s+cried/gi, 'laughed'],
  [/tears\s+of\s+joy/gi, 'joy'],
  [/слёзы\s+радости|слезы\s+радости/gi, 'радость'],
];
export function normalizeIdioms(text: string): string {
  return IDIOMS.reduce((t, [re, rep]) => t.replace(re, rep), text);
}

/** when a feeling is negated, part of its weight flows to the opposite feeling */
const OPPOSITE: Partial<Record<Category, Category>> = {
  joy: 'sadness', sadness: 'joy', calm: 'tension', tension: 'calm', warmth: 'cold', cold: 'warmth', energy: 'calm', relief: 'tension',
};
const NEG_WEIGHT = 0.7;

export function analyzeText(raw: string): TextFeatures {
  const text = normalizeIdioms(raw);
  const lang = detectLang(text);
  const lower = text.toLowerCase();
  const tokens = tokenize(text);
  const toks = tokenizeClauses(text);
  const wordCount = tokens.length;
  const sentences = splitSentences(text);
  const matched: Record<string, string[]> = {};
  const counts: Record<Category, number> = {} as any;
  const negPrefix = lang === 'ru' ? 'не ' : 'not ';

  (Object.keys(LEXICON) as Category[]).forEach((cat) => { matched[cat] = []; counts[cat] = 0; });
  (Object.keys(LEXICON) as Category[]).forEach((cat) => {
    const { hits, negated } = findMatchesCtx(LEXICON[cat], toks, lower);
    matched[cat].push(...hits);
    counts[cat] += hits.length;
    const opp = OPPOSITE[cat];
    if (opp && negated.length) {
      counts[opp] += negated.length * NEG_WEIGHT;
      matched[opp].push(...negated.map((w) => negPrefix + w));
    }
  });
  const score: Record<Category, number> = {} as any;
  (Object.keys(LEXICON) as Category[]).forEach((cat) => {
    const count = counts[cat];
    const density = (count / Math.max(wordCount, 25)) * 25; // hits per 25 words
    score[cat] = count === 0 ? 0 : clamp(0.5 * sat(count, 0.5) + 0.5 * sat(density, 0.8));
    matched[cat] = Array.from(new Set(matched[cat]));
  });

  // season
  let season: Season = null, best = 0;
  (Object.keys(SEASON_STEMS) as Exclude<Season, null>[]).forEach((s) => {
    const n = findMatches(SEASON_STEMS[s], tokens, lower).length;
    if (n > best) { best = n; season = s; }
  });

  // intensity: exclamation marks, intensifiers, capitalized shouting
  const excl = (text.match(/!/g) || []).length;
  const caps = tokens.filter((t) => t.length > 3 && text.includes(t.toUpperCase())).length;
  const intens = findMatches(INTENSIFIERS, tokens, lower).length;
  const intensity = clamp(0.15 + sat(excl, 0.6) * 0.4 + sat(intens, 0.5) * 0.3 + sat(caps, 0.8) * 0.2);

  // complexity: vocabulary richness, sentence-length variety, number of themes touched
  const unique = new Set(tokens.filter((t) => !STOPWORDS.has(t))).size;
  const ttr = wordCount ? unique / wordCount : 0;
  const lens = sentences.map((s) => tokenize(s).length);
  const meanLen = lens.reduce((a, b) => a + b, 0) / (lens.length || 1);
  const varLen = Math.sqrt(lens.reduce((a, l) => a + (l - meanLen) ** 2, 0) / (lens.length || 1));
  const themes = (Object.keys(score) as Category[]).filter((c) => score[c] > 0.2).length;
  const complexity = clamp(0.15 + ttr * 0.35 + clamp(varLen / 10) * 0.25 + clamp(themes / 8) * 0.35);

  const keywords = Array.from(new Set(Object.values(matched).flat())).slice(0, 24);

  return {
    warmth: score.warmth, cold: score.cold, joy: score.joy, sadness: score.sadness,
    calm: score.calm, tension: score.tension, energy: score.energy, nostalgia: score.nostalgia,
    wonder: score.wonder, social: score.social, nature: score.nature, night: score.night, morning: score.morning,
    relief: score.relief, work: score.work, city: score.city,
    season, intensity, complexity, wordCount, lang, keywords, matched,
  };
}

// ============================================================
// Title generation (3–7 words, grounded in nouns found in the story)
// ============================================================
interface Found { noun: TitleNoun; pos: number }

function findTitleNouns(text: string): Found[] {
  const lower = text.toLowerCase();
  const tokens = tokenize(text);
  const out: Found[] = [];
  for (const noun of TITLE_NOUNS) {
    let pos = -1;
    for (const stem of noun.stems) {
      if (stem.includes(' ')) { const i = lower.indexOf(stem); if (i >= 0 && (pos < 0 || i < pos)) pos = i; continue; }
      const idx = tokens.findIndex((t) => stemMatches(stem, t));
      if (idx >= 0) { const i = lower.indexOf(tokens[idx]); if (pos < 0 || i < pos) pos = i; }
    }
    if (pos >= 0) out.push({ noun, pos });
  }
  return out.sort((a, b) => a.pos - b.pos);
}

type AdjKey = keyof typeof MOOD_ADJ.ru;
type Gender = 'm' | 'f' | 'n' | 'pl';

/** The adjective that best describes the day: season wins; otherwise the strongest mood, only if it is clearly present. */
function pickAdjective(f: TextFeatures, strict = true): { season?: Exclude<Season, null>; mood?: AdjKey } {
  if (f.season) return { season: f.season };
  const cands: [AdjKey, number][] = [
    ['warm', f.warmth - f.cold * 0.5],
    ['cold', f.cold - f.warmth * 0.5],
    ['quiet', f.calm - f.energy * 0.5],
    ['loud', f.energy - 0.1],
    ['bright', f.joy],
    ['late', f.tension > 0.5 && f.night > 0.3 ? (f.tension + f.night) / 2 : 0],
    ['long', f.nostalgia - 0.15],
  ];
  cands.sort((a, b) => b[1] - a[1]);
  const [mood, score] = cands[0];
  if (score >= (strict ? 0.55 : 0.3)) return { mood };
  return {};
}

function adjFor(adj: ReturnType<typeof pickAdjective>, lang: Lang, g: Gender): string {
  if (adj.season) return lang === 'ru' ? SEASON_ADJ.ru[adj.season][g] : SEASON_ADJ.en[adj.season];
  if (adj.mood) return lang === 'ru' ? MOOD_ADJ.ru[adj.mood][g] : MOOD_ADJ.en[adj.mood];
  return '';
}

function cap(s: string): string { return s.charAt(0).toUpperCase() + s.slice(1); }
function titleCaseEn(s: string): string {
  const small = new Set(['and', 'at', 'in', 'on', 'the', 'with', 'by', 'of', 'a', 'an']);
  return s.split(' ').map((w, i) => (i > 0 && small.has(w) ? w : cap(w))).join(' ');
}
const wc = (s: string) => s.split(' ').filter(Boolean).length;
const TRAILING = new Set(['и', 'в', 'с', 'на', 'у', 'о', 'к', 'по', 'за', 'из', 'от', 'до', 'не', 'а', 'но', 'and', 'in', 'with', 'at', 'on', 'the', 'a', 'an', 'of', 'to', 'for', 'but', 'or', 'not']);

/**
 * Compositional title: [adjective] HEAD [place] [with person | and thing]
 *   HEAD = activity-event ("прогулка", "поход", "день рождения") > time-of-day (if it has company) > place > thing > time
 *   Abstract events ("дедлайн", "экзамен") prefer the tail: "Ночь в офисе и дедлайн".
 */
export function generateTitle(text: string, f: TextFeatures): string {
  const lang = f.lang;
  const found = findTitleNouns(text);
  const byKind = (k: TitleNoun['kind']) => found.filter((x) => x.noun.kind === k).map((x) => x.noun).sort((a, b) => (b.w ?? 1) - (a.w ?? 1));
  const places = byKind('place'), things = byKind('thing'), people = byKind('person'), times = byKind('time');
  const events = byKind('event');
  const activity = events.find((e) => !e.tail);
  const tailEvent = events.find((e) => e.tail);
  const place = places[0], person = people[0], time = times[0];
  const L = (n: TitleNoun) => n[lang];
  const and = lang === 'ru' ? 'и' : 'and';

  let head: TitleNoun | undefined;
  if (activity) head = activity;
  else if (time && (place || person || things[0] || tailEvent)) head = time;
  else if (place) head = place;
  else if (things[0]) head = things[0];
  else if (time) head = time;
  else if (tailEvent) head = tailEvent;

  const parts: string[] = [];
  if (head) {
    parts.push(L(head).nom);
    const headIsPlace = head.kind === 'place';
    if (!headIsPlace && place && L(place).loc) parts.push(L(place).loc!);
    const thing = things.find((t) => t !== head);
    if (person && L(person).ins && wc(parts.join(' ')) <= 4) parts.push(L(person).ins!);
    else if (tailEvent && head !== tailEvent) parts.push(and, L(tailEvent).nom);
    else if (thing) parts.push(and, L(thing).nom);
    else if (person && L(person).ins) parts.push(L(person).ins!);
  }

  let title = parts.join(' ');
  // adjective agrees with the head noun; never stack "late" onto "night"
  if (head) {
    const adj = pickAdjective(f, true);
    const redundant = adj.mood === 'late' && head.kind === 'time';
    let a = redundant ? '' : adjFor(adj, lang, head.ru.g);
    if (!a && wc(title) < 3) a = adjFor(pickAdjective(f, false), lang, head.ru.g);
    if (a && wc(title) <= 5) title = `${a} ${title}`;
  }

  // fallback / padding: no usable nouns → the opening words of the story
  const first = (splitSentences(text)[0] || text).replace(/[«»"“”(){}\[\]]/g, '');
  const firstWords = first.split(/[\s,;:—–-]+/).filter((w) => /[a-zа-яё]/i.test(w)).map((w) => w.replace(/[.!?…]+$/, ''));
  const content = firstWords.filter((t) => !STOPWORDS.has(t.toLowerCase()) && t.length > 2);
  let words = title ? title.split(' ').filter(Boolean) : [];
  if (words.length === 0) {
    words = firstWords.slice(0, 5).map((w) => w.toLowerCase());
  } else if (words.length < 3) {
    const extra = content.filter((w) => !title.toLowerCase().includes(w.toLowerCase())).slice(0, 2).map((w) => w.toLowerCase());
    words = [...words, and, ...extra];
  }
  // tidy: no duplicate content words, no dangling conjunction/preposition at the end, 3–7 words
  const seen = new Set<string>();
  words = words.filter((w) => { const k = w.toLowerCase(); if (seen.has(k) && !TRAILING.has(k)) return false; seen.add(k); return true; });
  if (words.length > 7) words = words.slice(0, 7);
  while (words.length > 3 && TRAILING.has(words[words.length - 1].toLowerCase())) words.pop();
  if (words.length === 0) words = lang === 'ru' ? ['ещё', 'один', 'день'] : ['just', 'another', 'day'];
  else if (words.length < 3) words = [...words, ...(lang === 'ru' ? ['в', 'тот', 'день'] : ['on', 'that', 'day'])];
  let result = words.join(' ').replace(/\s+/g, ' ').trim();
  if (lang === 'en') result = titleCaseEn(result);
  return cap(result);
}

// ============================================================
// Quote extraction — the most emotionally loaded sentence of the story
// ============================================================
const EMO: Category[] = ['warmth', 'joy', 'sadness', 'calm', 'tension', 'nostalgia', 'wonder', 'relief'];
const FEEL = ['чувств', 'ощущ', 'казалось', 'кажется', 'показалось', 'подумал', 'понял', 'хотелось', 'помню', 'никогда', 'впервые', 'felt', 'feel', 'seemed', 'realized', 'thought', 'wished', 'remember', 'never', 'first time'];

export function extractQuote(text: string): string {
  const sentences = splitSentences(text);
  if (!sentences.length) return '';
  let best = sentences[0], bestScore = -Infinity;
  for (const s of sentences) {
    const tokens = tokenize(s);
    const n = tokens.length;
    const lower = s.toLowerCase();
    let sc = 0;
    for (const c of EMO) sc += findMatches(LEXICON[c], tokens, lower).length * 1.0;
    sc += findMatches(FEEL, tokens, lower).length * 1.4;
    if (n >= 5 && n <= 22) sc += 1.2; else if (n < 4) sc -= 2.5; else if (n > 30) sc -= 1.5;
    if (/[!?]$/.test(s)) sc += 0.3;
    if (sc > bestScore) { bestScore = sc; best = s; }
  }
  let q = best.trim();
  if (!/[.!?…]$/.test(q)) q += '.';
  return q;
}
