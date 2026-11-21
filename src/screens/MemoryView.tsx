import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useStore } from '../state/store';
import { TopBar } from '../components/TopBar';
import { Plant } from '../plant/Plant';
import { ExplainPanel } from '../components/ExplainPanel';
import { IcoCamera, IcoQuote, IcoNote, IcoWhy, IcoEdit, IcoTrash, IcoDownload, IcoBack, IcoForward, IcoVoice, IcoLink } from '../components/Icons';
import { formatDate } from '../i18n/strings';
import { blobUrl } from '../data/db';
import { canNarrate, speak } from '../data/narration';
import { exportDayFolder, exportSvg, serializePlantSvg } from '../data/exportDay';
import { NEUTRAL_VISUAL } from '../analysis/dna';
import type { Memory, MusicRef, Privacy, SharedMemory, PlantParams, VisualParameters, Reason, Lang } from '../data/types';

type Petal = 'photos' | 'story' | 'music' | 'why';

interface View {
  id: string; date: string; title: string; story: string; quote: string; lang: Lang;
  photos: { name: string; thumb: string; id?: string }[]; music: MusicRef | SharedMemory['music'];
  plant: PlantParams; visual: VisualParameters; reasons: Reason[]; own?: Memory; locked: boolean;
}

export function MemoryView() {
  const { t, lang, go, back, nav, profile, visiting, memories, upsertMemory, removeMemory, setToast } = useStore();
  const view: View | null = useMemo(() => {
    if (visiting) {
      const sm = visiting.memories.find((m) => m.id === nav.memoryId);
      if (!sm) return null;
      return { id: sm.id, date: sm.date, title: sm.title || '', story: sm.story || '', quote: sm.quote || '', lang: sm.lang || lang, photos: sm.photos || [], music: sm.music || { kind: 'none' }, plant: sm.plant, visual: sm.visual ?? NEUTRAL_VISUAL, reasons: sm.reasons || [], locked: sm.privacy === 'garden' };
    }
    const m = memories.find((x) => x.id === nav.memoryId);
    if (!m) return null;
    return { id: m.id, date: m.date, title: m.title, story: m.story, quote: m.quote, lang: m.lang, photos: m.photos, music: m.music, plant: m.plant, visual: m.visual, reasons: m.reasons, own: m, locked: false };
  }, [visiting, memories, nav.memoryId, lang]);

  const [open, setOpen] = useState<Petal | null>(null);
  const [opened, setOpened] = useState<Set<Petal>>(new Set());
  const [photoIdx, setPhotoIdx] = useState(0);
  const [fullUrls, setFullUrls] = useState<Record<string, string>>({});
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [speaking, setSpeaking] = useState(false);
  const stopRef = useRef<() => void>(() => {});
  const svgWrap = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [stageSize, setStageSize] = useState({ w: 600, h: 600 });
  useEffect(() => {
    const el = stageRef.current; if (!el) return;
    const ro = new ResizeObserver(() => setStageSize({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el); setStageSize({ w: el.clientWidth, h: el.clientHeight });
    return () => ro.disconnect();
  }, [view?.id]);

  useEffect(() => () => stopRef.current(), []);
  useEffect(() => {
    if (!view) return;
    // load original photo blobs lazily (own memories only)
    (async () => {
      const map: Record<string, string> = {};
      for (const p of view.photos) if (p.id) { const u = await blobUrl(p.id); if (u) map[p.id] = u; }
      setFullUrls(map);
      const mu = view.music as MusicRef;
      if (mu.kind === 'file' && mu.fileId) setAudioUrl(await blobUrl(mu.fileId));
    })();
  }, [view?.id]);

  if (!view) return <div className="screen"><TopBar crumbs={['…']} onBack={back} /></div>;

  const planetName = visiting ? visiting.planetName : profile?.planetName || '';
  const year = Number(view.date.slice(0, 4)), month = Number(view.date.slice(5, 7)) - 1;
  const reveal = Math.min(3, ['photos', 'story', 'music'].filter((p) => opened.has(p as Petal)).length);

  const toggle = (p: Petal) => {
    if (view.locked && p !== 'why') { setToast(t.privateMemory); return; }
    setOpen((o) => (o === p ? null : p));
    setOpened((s) => new Set(s).add(p));
  };
  const toggleSpeak = () => {
    if (speaking) { stopRef.current(); setSpeaking(false); return; }
    stopRef.current = speak(`${view.title}. ${view.story}`, view.lang, view.visual, () => setSpeaking(false));
    setSpeaking(true);
  };
  const setPrivacy = async (p: Privacy) => { if (view.own) { await upsertMemory({ ...view.own, privacy: p, updatedAt: new Date().toISOString() }); } };
  const del = async () => { if (view.own && confirm(t.deleteConfirm)) { await removeMemory(view.own); go({ screen: 'garden', memoryId: null, year, month }, 'zoom-out', true); } };
  const svgMarkup = () => { const el = svgWrap.current?.querySelector('svg'); return el ? serializePlantSvg(el as SVGSVGElement) : undefined; };

  // bloom position inside the SVG box (for petal buttons)
  const stemLen = 140 + 95 * view.plant.stem_height;
  const bx = 50 + Math.sign(view.plant.bloom_tilt || 1) * Math.min(14, Math.abs(view.plant.bloom_tilt) * 0.35) / 2;
  const by = ((300 - stemLen) / 320) * 100;
  const rad = 34 * view.plant.petal_length * 0.9;
  const spread = 18 + rad * 0.35; // % of the svg width
  const petalPos: Record<Exclude<Petal, 'why'>, { x: number; y: number }> = {
    photos: { x: bx - spread, y: by - 9 },
    story: { x: bx + spread, y: by - 9 },
    music: { x: bx - spread * 0.55, y: by + 15 },
  };
  const stageW = Math.max(220, Math.min(460, stageSize.w * 0.92, (stageSize.h * 0.96) / 1.6));
  const mu = view.music as MusicRef;

  return (
    <div className="screen memory">
      <TopBar crumbs={[planetName, String(year), t.months[month], view.title || view.date]} onBack={back} backLabel={t.backToGarden}>
        {view.own && <button className="btn btn-sm btn-ghost" onClick={() => toggle('why')}><IcoWhy /> <span className="topbar-backlabel">{t.whyFlower}</span></button>}
      </TopBar>
      <div className="memory-body">
        <div className="memory-stage" ref={stageRef}>
          <div className="memory-ground" />
          <div style={{ position: 'relative', width: stageW }} ref={svgWrap}>
            <Plant id={`v-${view.id}`} params={view.plant} width={stageW} reveal={reveal} className="plant-big" title={view.title} />
            <div className="petal-btns">
              {!view.locked && (['photos', 'story', 'music'] as const).map((p, i) => (
                <button key={p} className={`petal-btn ${open === p ? 'on' : ''}`} style={{ left: `${petalPos[p].x}%`, top: `${petalPos[p].y}%`, animationDelay: `${i * 0.7}s` }} onClick={() => toggle(p)} aria-label={t[`${p}Petal`]}>
                  {p === 'photos' ? <IcoCamera /> : p === 'story' ? <IcoQuote /> : <IcoNote />}
                  <span className="lbl">{t[`${p}Petal`]}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="panel panel-strong memory-panel" key={open ?? 'none'}>
          <div className="panel-scroll scroll">
            {open === null && (
              <div className="col">
                <div className="memory-date">{formatDate(view.date, lang)}</div>
                <h2 className="memory-title">{view.locked ? t.privateMemory : view.title}</h2>
                {!view.locked && <p className="muted italic serif" style={{ fontSize: '1.1rem' }}>{t.touchFlower.replace(/цветка|a flower/, lang === 'ru' ? 'лепестка' : 'a petal')}</p>}
                {view.own && <div className="small muted">{t.recordedOn} {new Date(view.own.createdAt).toLocaleDateString(lang === 'ru' ? 'ru-RU' : 'en-US')}</div>}
              </div>
            )}
            {open === 'story' && (
              <div className="col">
                <div className="memory-date">{formatDate(view.date, lang)}</div>
                <h2 className="memory-title">{view.title}</h2>
                {view.quote && <blockquote className="memory-quote">«{view.quote.replace(/^[«"“]|[»"”]$/g, '')}»</blockquote>}
                <p className="memory-story">{view.story}</p>
                {canNarrate() && (
                  <div className="col" style={{ gap: 4 }}>
                    <button className={`btn btn-sm ${speaking ? 'btn-primary' : ''}`} onClick={toggleSpeak} style={{ alignSelf: 'flex-start' }}><IcoVoice /> {speaking ? t.stopListening : t.listen}</button>
                    <span className="small muted">{t.listenHint}</span>
                  </div>
                )}
              </div>
            )}
            {open === 'photos' && (
              <PhotoViewer photos={view.photos} idx={photoIdx} setIdx={setPhotoIdx} full={fullUrls} />
            )}
            {open === 'music' && (
              <MusicPanel music={mu} audioUrl={audioUrl} plant={view.plant} />
            )}
            {open === 'why' && <ExplainPanel reasons={view.reasons} visual={view.visual} plant={view.plant} />}
          </div>
          {view.own && (
            <div className="memory-footer">
              <select className="input" style={{ width: 'auto', padding: '7px 10px' }} value={view.own.privacy} onChange={(e) => setPrivacy(e.target.value as Privacy)} title={t.privacyHint}>
                <option value="private">{t.privacy}: {t.privacy_private}</option>
                <option value="garden">{t.privacy}: {t.privacy_garden}</option>
                <option value="shared">{t.privacy}: {t.privacy_shared}</option>
              </select>
              <button className="btn btn-sm btn-ghost" onClick={() => go({ screen: 'create', editId: view.id, newDate: view.date }, 'fade')}><IcoEdit /> {t.edit}</button>
              <button className="btn btn-sm btn-ghost" onClick={() => exportDayFolder(view.own!, lang, svgMarkup())}><IcoDownload /> {t.exportDay}</button>
              <button className="btn btn-sm btn-ghost" onClick={() => { const s = svgMarkup(); if (s) exportSvg(view.own!, s); }}><IcoLeafIcon /> {t.exportSvg}</button>
              <button className="btn btn-sm btn-ghost btn-danger" onClick={del}><IcoTrash /> {t.delete}</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const IcoLeafIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="ico"><path d="M5 19c0-8 5-13 14-14-1 9-6 14-14 14zM5 19l8-8" /></svg>;

function PhotoViewer({ photos, idx, setIdx, full }: { photos: View['photos']; idx: number; setIdx: (i: number) => void; full: Record<string, string> }) {
  const { t } = useStore();
  if (!photos.length) return <p className="muted">—</p>;
  const i = Math.min(idx, photos.length - 1);
  const p = photos[i];
  const src = (p.id && full[p.id]) || p.thumb;
  return (
    <div className="photo-viewer">
      <div className="main">
        <img key={src} src={src} alt={p.name} />
        {photos.length > 1 && <>
          <button className="btn btn-icon nav l" onClick={() => setIdx((i - 1 + photos.length) % photos.length)} aria-label="prev"><IcoBack /></button>
          <button className="btn btn-icon nav r" onClick={() => setIdx((i + 1) % photos.length)} aria-label="next"><IcoForward /></button>
        </>}
        <span className="photo-counter">{i + 1} {t.of} {photos.length}</span>
      </div>
      {photos.length > 1 && (
        <div className="thumbs">{photos.map((ph, k) => <img key={k} src={ph.thumb} className={k === i ? 'on' : ''} onClick={() => setIdx(k)} alt="" />)}</div>
      )}
    </div>
  );
}

function MusicPanel({ music, audioUrl, plant }: { music: MusicRef; audioUrl: string | null; plant: PlantParams }) {
  const { t } = useStore();
  if (!music || music.kind === 'none') return <p className="muted">{t.noMusic}</p>;
  const bpm = music.analysis?.bpm ?? (music.descriptors ? Math.round(60 + music.descriptors.tempo * 120) : null);
  const height = music.service === 'youtube' ? 220 : music.service === 'spotify' ? 152 : music.service === 'apple' ? 175 : 166;
  return (
    <div className="col">
      {music.title && <h3>{music.title}</h3>}
      {music.kind === 'file' && (
        <div className="audio-player">
          <div className="eq" style={{ ['--pulse-dur' as any]: `${plant.pulse_period}s` }}><span /><span /><span /><span /><span /></div>
          {audioUrl ? <audio controls src={audioUrl} preload="metadata" /> : <span className="muted small">{music.fileName}</span>}
        </div>
      )}
      {music.kind === 'link' && music.embedUrl && (
        <div className="music-embed"><iframe src={music.embedUrl} height={height} allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy" title="music" /></div>
      )}
      {music.kind === 'link' && music.url && (
        <a className="btn btn-sm" href={music.url} target="_blank" rel="noreferrer" style={{ alignSelf: 'flex-start' }}><IcoLink /> {t.openIn} {music.service && music.service !== 'other' ? music.service : 'link'}</a>
      )}
      <div className="chips">
        {bpm && <span className="chip on">{music.analysis ? t.musicSourceAudio(bpm) : t.musicSourceDesc(bpm)}</span>}
        {music.descriptors && <span className="chip">{t.mood}: {t[`mood_${music.descriptors.mood}`]}</span>}
        {music.descriptors?.genre && <span className="chip">{music.descriptors.genre}</span>}
        {music.analysis && <span className="chip">{t.energy}: {Math.round(music.analysis.energy * 100)}%</span>}
      </div>
      <p className="small muted">{t.swayInfo}</p>
    </div>
  );
}
