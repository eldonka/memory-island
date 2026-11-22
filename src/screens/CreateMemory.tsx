import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useStore } from '../state/store';
import { TopBar } from '../components/TopBar';
import { Plant } from '../plant/Plant';
import { DnaBars, visualLabel } from '../components/ExplainPanel';
import { IcoBack, IcoClose, IcoForward, IcoPlus, IcoSparkle, IcoUpload, IcoLeaf, IcoCalendar, IcoEdit } from '../components/Icons';
import { makeThumb } from '../analysis/photo';
import { analyzeInput, composeMemory, previewPlant, type Analysis, type MusicInput, type Stage } from '../data/pipeline';
import { DateConflictError } from '../data/db';
import { hashString, makeId } from '../plant/random';
import { formatDate } from '../i18n/strings';
import { todayISO } from '../data/dates';
import type { MusicDescriptors, PhotoRef, Privacy, VisualParameters } from '../data/types';

const ADJUST_KEYS: (keyof VisualParameters)[] = ['warmth', 'energy', 'calmness', 'joy', 'nostalgia', 'tension'];

export function CreateMemory() {
  const { t, lang, go, back, nav, memories, commitMemory, setGrowing, setToast, profile } = useStore();
  const today = todayISO();
  const existingById = nav.editId ? memories.find((m) => m.id === nav.editId) : undefined;
  const existingByDate = !existingById && nav.newDate ? memories.find((m) => m.date === nav.newDate) : undefined;
  const existing = existingById || existingByDate;
  const draftId = useRef(existing?.id || makeId('m'));

  const [date, setDate] = useState(existing?.date || nav.newDate || today);
  const [story, setStory] = useState(existing?.story || '');
  const [photos, setPhotos] = useState<PhotoRef[]>(existing?.photos || []);
  const pending = useRef(new Map<string, Blob>());          // new photo blobs, persisted only on save
  const removedExisting = useRef<string[]>([]);              // stored photo blobs to delete after a successful save
  const [musicKind, setMusicKind] = useState<'link' | 'file'>(existing?.music.kind === 'file' ? 'file' : 'link');
  const [url, setUrl] = useState(existing?.music.url || '');
  const [musicTitle, setMusicTitle] = useState(existing?.music.title || '');
  const [file, setFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState(existing?.music.fileName || '');
  const [desc, setDesc] = useState<MusicDescriptors>(existing?.music.descriptors || { tempo: 0.5, energy: 0.5, mood: 'mixed', genre: '' });
  const [privacy, setPrivacy] = useState<Privacy>(existing?.privacy || 'private');
  const [step, setStep] = useState<'form' | 'analyzing' | 'confirm'>('form');
  const [stage, setStage] = useState<Stage>('text');
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [visual, setVisual] = useState<VisualParameters | null>(null);
  const [adjusted, setAdjusted] = useState(false);
  const [title, setTitle] = useState(existing?.title || '');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const photoInput = useRef<HTMLInputElement>(null);
  const audioInput = useRef<HTMLInputElement>(null);
  const dateInput = useRef<HTMLInputElement>(null);

  /** another memory already owns the chosen day → saving is blocked, never merged */
  const collision = useMemo(() => memories.find((m) => m.date === date && m.id !== draftId.current), [memories, date]);
  const seed = existing?.plant.seed ?? hashString(draftId.current);
  const preview = useMemo(() => (visual && analysis ? previewPlant(visual, analysis.music, seed) : null), [visual, analysis, seed]);

  useEffect(() => { setError(''); }, [story, photos, url, file, date]);

  const addFiles = async (files: FileList | null) => {
    if (!files) return;
    const next: PhotoRef[] = [];
    for (const f of Array.from(files)) {
      if (!f.type.startsWith('image/')) continue;
      try {
        const th = await makeThumb(f);
        const id = makeId('p');
        pending.current.set(id, f);
        next.push({ id, name: f.name, width: th.width, height: th.height, thumb: th.dataUrl });
      } catch (e) { console.warn('bad image', e); }
    }
    setPhotos((p) => [...p, ...next]);
  };
  const removePhoto = (id: string) => {
    if (pending.current.has(id)) pending.current.delete(id); else removedExisting.current.push(id);
    setPhotos((p) => p.filter((x) => x.id !== id));
  };
  const movePhoto = (i: number, dir: -1 | 1) => setPhotos((p) => { const a = [...p]; const j = i + dir; if (j < 0 || j >= a.length) return a; [a[i], a[j]] = [a[j], a[i]]; return a; });

  const validate = (): string => {
    if (date > today) return t.dateFuture;          // a future day is never planted, whatever route led here
    if (collision) return t.conflictSaveBlocked;
    if (story.trim().split(/\s+/).filter(Boolean).length < 3) return t.needStory;
    if (!photos.length) return t.needPhoto;
    if (musicKind === 'link' && !/^https?:\/\//i.test(url.trim())) return t.needMusic;
    if (musicKind === 'file' && !file && !(existing?.music.kind === 'file' && existing.music.fileId)) return t.needMusic;
    return '';
  };

  const grow = async () => {
    const err = validate();
    if (err) { setError(err); return; }
    setStep('analyzing');
    const keepFile = musicKind === 'file' && !file && existing?.music.kind === 'file';
    const music: MusicInput = musicKind === 'link'
      ? { kind: 'link', url: url.trim(), title: musicTitle, descriptors: desc }
      : { kind: 'file', file: file ?? undefined, fileId: keepFile ? existing!.music.fileId : undefined, fileName: file?.name || fileName, title: musicTitle, descriptors: desc, analysis: keepFile ? existing!.music.analysis : undefined };
    try {
      const a = await analyzeInput(story, photos, music, (s) => setStage(s));
      setAnalysis(a); setVisual(a.visual); setAdjusted(false);
      setTitle(existing && existing.title !== existing.titleAuto && existing.story === story ? existing.title : a.titleAuto);
      setStep('confirm');
    } catch (e) { console.error(e); setError(String(e)); setStep('form'); }
  };

  const plant = async () => {
    if (!analysis || !visual) return;
    if (date > today) { setError(t.dateFuture); setStep('form'); return; }
    if (collision) { setError(t.conflictSaveBlocked); return; }
    setSaving(true);
    try {
      const m = composeMemory({ id: existing?.id || draftId.current, date, story, photos, analysis, visual, title, privacy, existing, userAdjusted: adjusted });
      // new assets (photos + uploaded audio) and the record are committed as one unit:
      // assets first, record atomically (refuses to overwrite another day), replaced assets dropped
      // only after success; if the record is refused the new assets are rolled back (db.commitMemory)
      const newBlobs: [string, Blob][] = [...pending.current.entries()];
      if (analysis.pendingAudio) newBlobs.push([analysis.pendingAudio.id, analysis.pendingAudio.blob]);
      const removed = [...removedExisting.current];
      if (existing?.music.fileId && existing.music.fileId !== m.music.fileId) removed.push(existing.music.fileId);
      await commitMemory(m, newBlobs, removed);
      pending.current.clear(); removedExisting.current = [];
      const y = Number(date.slice(0, 4)), mo = Number(date.slice(5, 7)) - 1;
      if (existing) {
        setToast(t.saveChanges + ' ✓');
        go({ screen: 'memory', memoryId: m.id, year: y, month: mo, editId: null, newDate: null }, 'fade', true);
      } else {
        setGrowing(m.id);
        go({ screen: 'garden', year: y, month: mo, editId: null, newDate: null, memoryId: null }, 'zoom-out', true);
      }
    } catch (e) {
      // nothing was saved and the new assets were rolled back by commitMemory
      console.error(e);
      setError(e instanceof DateConflictError ? t.conflictSaveBlocked : String(e));
      setStep('form');
    }
    setSaving(false);
  };

  const planetName = profile?.planetName || '';
  const heading = existing ? t.editMemory : t.newMemory;
  const openExisting = () => { if (collision) go({ screen: 'create', editId: collision.id, newDate: collision.date }, 'fade', true); };

  return (
    <div className="screen create">
      <TopBar crumbs={[planetName, heading]} onBack={back} backLabel={t.back} />
      <div className="create-body scroll">
        {step === 'form' && (
          <div className="panel panel-parchment create-form fade-up">
            <h2>{heading}</h2>
            <p className="muted small" style={{ marginBottom: 18 }}>{formatDate(date, lang)}</p>

            <div className="field">
              <label>{t.dateLabel}</label>
              <input ref={dateInput} type="date" className="input" value={date} max={today} onChange={(e) => e.target.value && setDate(e.target.value)} style={{ width: 'auto' }} />
              <span className="hint">{t.dateHint}</span>
            </div>
            {collision && (
              <div className="form-conflict" role="alert">
                <h4>{t.conflictTitle}</h4>
                <p>{t.conflictBody(collision.title || collision.titleAuto, formatDate(collision.date, lang))}</p>
                <div className="row">
                  <button className="btn btn-sm" onClick={() => dateInput.current?.focus()}><IcoCalendar /> {t.conflictPickDate}</button>
                  <button className="btn btn-sm btn-ghost" onClick={openExisting}><IcoEdit /> {t.conflictOpenExisting}</button>
                </div>
              </div>
            )}

            <div className="field">
              <label>{t.storyLabel}</label>
              <textarea className="input" value={story} onChange={(e) => setStory(e.target.value)} placeholder={t.storyPlaceholder} rows={7} />
            </div>

            <div className="field">
              <label>{t.photosLabel}</label>
              <span className="hint">{t.photosHint}</span>
              <div className="photo-grid">
                {photos.map((p, i) => (
                  <div className="photo-tile" key={p.id}>
                    <img src={p.thumb} alt={p.name} />
                    <button className="x" onClick={() => removePhoto(p.id)} aria-label="remove"><IcoClose /></button>
                    {i > 0 && <button className="mv l" onClick={() => movePhoto(i, -1)} aria-label="left"><IcoBack /></button>}
                    {i < photos.length - 1 && <button className="mv r" onClick={() => movePhoto(i, 1)} aria-label="right"><IcoForward /></button>}
                  </div>
                ))}
                <button className="photo-add" onClick={() => photoInput.current?.click()}><IcoPlus /> {t.addPhotos}</button>
                <input ref={photoInput} type="file" accept="image/*" multiple hidden onChange={(e) => { addFiles(e.target.files); e.target.value = ''; }} />
              </div>
            </div>

            <div className="field">
              <label>{t.musicLabel}</label>
              <div className="tabs">
                <button className={musicKind === 'link' ? 'on' : ''} onClick={() => setMusicKind('link')}>{t.musicLink}</button>
                <button className={musicKind === 'file' ? 'on' : ''} onClick={() => setMusicKind('file')}>{t.musicFile}</button>
              </div>
              {musicKind === 'link' ? (
                <>
                  <input className="input" value={url} onChange={(e) => setUrl(e.target.value)} placeholder={t.musicLinkPlaceholder} inputMode="url" />
                  <input className="input" value={musicTitle} onChange={(e) => setMusicTitle(e.target.value)} placeholder={t.musicTitlePlaceholder} />
                  <span className="hint">{t.musicDescribe}</span>
                </>
              ) : (
                <>
                  <div className="row">
                    <button className="btn btn-sm" onClick={() => audioInput.current?.click()}><IcoUpload /> {t.musicFile}</button>
                    <span className="small muted">{file?.name || fileName || '—'}</span>
                    <input ref={audioInput} type="file" accept="audio/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) { setFile(f); setFileName(f.name); } e.target.value = ''; }} />
                  </div>
                  <input className="input" value={musicTitle} onChange={(e) => setMusicTitle(e.target.value)} placeholder={t.musicTitlePlaceholder} />
                  <span className="hint">{t.musicDescribeFile}</span>
                </>
              )}
              <div className="col" style={{ marginTop: 6 }}>
                {musicKind === 'link' && (
                  <>
                    <div className="slider-row"><span>{t.tempo}</span><div><input type="range" min={0} max={1} step={0.01} value={desc.tempo} onChange={(e) => setDesc({ ...desc, tempo: Number(e.target.value) })} /><div className="ends"><span>{t.tempoSlow}</span><span>≈{Math.round(60 + desc.tempo * 120)} BPM</span><span>{t.tempoFast}</span></div></div></div>
                    <div className="slider-row"><span>{t.energy}</span><div><input type="range" min={0} max={1} step={0.01} value={desc.energy} onChange={(e) => setDesc({ ...desc, energy: Number(e.target.value) })} /><div className="ends"><span>{t.energyCalm}</span><span>{t.energyIntense}</span></div></div></div>
                  </>
                )}
                <div className="slider-row"><span>{t.mood}</span>
                  <div className="chips">
                    {(['bright', 'mixed', 'melancholic'] as const).map((m) => <button key={m} className={`chip ${desc.mood === m ? 'on' : ''}`} onClick={() => setDesc({ ...desc, mood: m })}>{t[`mood_${m}`]}</button>)}
                  </div>
                </div>
                <div className="slider-row"><span>{t.genre}</span><input className="input" value={desc.genre} onChange={(e) => setDesc({ ...desc, genre: e.target.value })} placeholder={t.genrePlaceholder} /></div>
              </div>
            </div>

            {error && <p className="form-error" style={{ marginBottom: 12 }}>{error}</p>}
            <div className="row between">
              <button className="btn btn-ghost" onClick={back}>{t.cancel}</button>
              <button className="btn btn-primary" onClick={grow} disabled={!!collision || date > today}><IcoSparkle /> {t.growMemory}</button>
            </div>
          </div>
        )}

        {step === 'analyzing' && (
          <div className="panel panel-parchment create-form fade-up">
            <div className="analyzing">
              <div className="orb" />
              <div className="col" style={{ alignItems: 'flex-start' }}>
                {(['text', 'photos', 'music'] as Stage[]).map((s, i) => {
                  const idx = ['text', 'photos', 'music'].indexOf(stage);
                  return <div key={s} className="serif" style={{ fontSize: '1.15rem' }}><span className={`stage-dot ${i < idx ? 'done' : i === idx ? 'on' : ''}`} />{s === 'text' ? t.analyzing : s === 'photos' ? t.analyzingPhotos : t.analyzingMusic}</div>;
                })}
              </div>
            </div>
          </div>
        )}

        {step === 'confirm' && analysis && visual && preview && (
          <div className="panel panel-parchment create-form fade-up">
            <h2>{t.feelsLikeDay}</h2>
            <p className="muted small" style={{ marginBottom: 16 }}>{t.feelsHint}</p>
            <div className="confirm-grid">
              <div className="preview">
                <Plant id={`pv-${draftId.current}`} params={preview} width={220} />
                <span className="small muted center">{t.style[preview.petal_style]}<br />{t.texture[preview.texture]}</span>
              </div>
              <div className="col">
                <div className="field" style={{ marginBottom: 8 }}>
                  <label>{t.titleLabel}</label>
                  <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={60} />
                  <span className="hint">{t.titleHint}</span>
                </div>
                {analysis.quote && <p className="serif italic muted" style={{ fontSize: '1.05rem' }}>«{analysis.quote}»</p>}
                <div className="mood-sliders">
                  {ADJUST_KEYS.map((k) => (
                    <div className="slider-row" key={k}>
                      <span style={{ textTransform: 'capitalize' }}>{visualLabel(k, lang)}</span>
                      <input type="range" min={0} max={1} step={0.01} value={visual[k] as number} onChange={(e) => { setVisual({ ...visual, [k]: Number(e.target.value) }); setAdjusted(true); }} />
                    </div>
                  ))}
                </div>
                <DnaBars visual={visual} />
                <div className="field" style={{ marginTop: 8 }}>
                  <label>{t.privacy}</label>
                  <select className="input" value={privacy} onChange={(e) => setPrivacy(e.target.value as Privacy)} style={{ width: 'auto' }}>
                    <option value="private">{t.privacy_private}</option>
                    <option value="garden">{t.privacy_garden}</option>
                    <option value="shared">{t.privacy_shared}</option>
                  </select>
                  <span className="hint">{t.privacyHint}</span>
                </div>
              </div>
            </div>
            {error && <p className="form-error">{error}</p>}
            <div className="row between" style={{ marginTop: 14 }}>
              <button className="btn btn-ghost" onClick={() => setStep('form')}><IcoBack /> {t.backToEdit}</button>
              <button className="btn btn-primary" onClick={plant} disabled={saving}><IcoLeaf /> {existing ? t.saveChanges : t.plantIt}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
