import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useStore } from '../state/store';
import { TopBar } from '../components/TopBar';
import { Plant } from '../plant/Plant';
import { ExplainPanel } from '../components/ExplainPanel';
import { IcoNote, IcoWhy, IcoEdit, IcoTrash, IcoDownload, IcoBack, IcoForward, IcoVoice, IcoLink, IcoClose, IcoPlay, IcoPause } from '../components/Icons';
import { formatDate } from '../i18n/strings';
import { blobUrl } from '../data/db';
import { canNarrate, speak } from '../data/narration';
import { exportDayFolder, exportSvg, serializePlantSvg } from '../data/exportDay';
import { NEUTRAL_VISUAL } from '../analysis/dna';
import { withAlpha } from '../plant/colors';
import type { Memory, MusicRef, Privacy, SharedMemory, PlantParams, VisualParameters, Reason, Lang } from '../data/types';

type Drawer = 'tools' | 'why' | null;

interface View {
  id: string; date: string; title: string; story: string; quote: string; lang: Lang;
  photos: { name: string; thumb: string; id?: string }[]; music: MusicRef | SharedMemory['music'];
  plant: PlantParams; visual: VisualParameters; reasons: Reason[]; own?: Memory; locked: boolean;
}

const SLIDE_MS = 8000;      // auto-advance of the photo slideshow
const MUSIC_DELAY_MS = 900; // wait for the screen transition, so the exiting copy of this screen never makes a sound

/** Ask the embedded player to start by itself (the click on the flower is the user gesture browsers want). */
function autoplayEmbed(url: string): string {
  try {
    const u = new URL(url);
    if (u.hostname.includes('youtube')) {
      u.searchParams.set('autoplay', '1');
      u.searchParams.set('playsinline', '1');
      u.searchParams.set('rel', '0');
      const id = u.pathname.split('/').filter(Boolean).pop();
      if (id) { u.searchParams.set('loop', '1'); u.searchParams.set('playlist', id); }
      return u.toString();
    }
    if (u.hostname.includes('soundcloud')) { u.searchParams.set('auto_play', 'true'); return u.toString(); }
  } catch { /* keep the original link */ }
  return url;
}

/** Keeps the previous image under the new one so the blurred backdrop cross-fades. */
function useCrossfade(src: string) {
  const [state, setState] = useState<{ cur: string; prev: string | null }>({ cur: src, prev: null });
  useEffect(() => { setState((s) => (s.cur === src ? s : { cur: src, prev: s.cur || null })); }, [src]);
  return state;
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

  const [drawer, setDrawer] = useState<Drawer>(null);
  const [photoIdx, setPhotoIdx] = useState(0);
  const [autoSlide, setAutoSlide] = useState(true);
  const [fullUrls, setFullUrls] = useState<Record<string, string>>({});
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [armed, setArmed] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const stopRef = useRef<() => void>(() => {});
  const flowerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [stageSize, setStageSize] = useState({ w: 600, h: 600 });

  const nPhotos = view && !view.locked ? view.photos.length : 0;
  const curPhoto = view && nPhotos ? view.photos[Math.min(photoIdx, nPhotos - 1)] : null;
  const bg = useCrossfade(curPhoto ? curPhoto.thumb : '');
  const reduced = !!profile?.reducedMotion;

  useEffect(() => {
    const el = stageRef.current; if (!el) return;
    const ro = new ResizeObserver(() => setStageSize({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el); setStageSize({ w: el.clientWidth, h: el.clientHeight });
    return () => ro.disconnect();
  }, [view?.id]);

  useEffect(() => () => stopRef.current(), []);
  useEffect(() => { const id = window.setTimeout(() => setArmed(true), MUSIC_DELAY_MS); return () => window.clearTimeout(id); }, []);

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

  // slideshow: advances by itself until the viewer takes over
  useEffect(() => {
    if (!autoSlide || nPhotos < 2 || reduced) return;
    const id = window.setInterval(() => setPhotoIdx((i) => (i + 1) % nPhotos), SLIDE_MS);
    return () => window.clearInterval(id);
  }, [autoSlide, nPhotos, photoIdx, reduced]);

  // keyboard: ← → photos, Esc closes the side panel
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)) return;
      if (e.key === 'Escape') setDrawer(null);
      else if (nPhotos > 1 && e.key === 'ArrowRight') { setAutoSlide(false); setPhotoIdx((i) => (i + 1) % nPhotos); }
      else if (nPhotos > 1 && e.key === 'ArrowLeft') { setAutoSlide(false); setPhotoIdx((i) => (i - 1 + nPhotos) % nPhotos); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [nPhotos]);

  if (!view) return <div className="screen"><TopBar crumbs={['…']} onBack={back} /></div>;

  const planetName = visiting ? visiting.planetName : profile?.planetName || '';
  const year = Number(view.date.slice(0, 4)), month = Number(view.date.slice(5, 7)) - 1;
  const mu = view.music as MusicRef;
  const hasPhotos = nPhotos > 0;
  const paragraphs = view.locked ? [] : view.story.split(/\n+/).map((s) => s.trim()).filter(Boolean);

  const toggleSpeak = () => {
    if (speaking) { stopRef.current(); setSpeaking(false); return; }
    stopRef.current = speak(`${view.title}. ${view.story}`, view.lang, view.visual, () => setSpeaking(false));
    setSpeaking(true);
  };
  const setPrivacy = async (p: Privacy) => { if (view.own) { await upsertMemory({ ...view.own, privacy: p, updatedAt: new Date().toISOString() }); } };
  const del = async () => { if (view.own && confirm(t.deleteConfirm)) { await removeMemory(view.own); go({ screen: 'garden', memoryId: null, year, month }, 'zoom-out', true); } };
  const svgMarkup = () => { const el = flowerRef.current?.querySelector('svg'); return el ? serializePlantSvg(el as SVGSVGElement) : undefined; };
  const manual = () => setAutoSlide(false);
  const toggleDrawer = (d: Exclude<Drawer, null>) => { if (!view.own) { setToast(t.privateMemory); return; } setDrawer((cur) => (cur === d ? null : d)); };

  const bigW = Math.max(220, Math.min(460, stageSize.w * 0.92, (stageSize.h * 0.96) / 1.6));
  const flower = (w: number, cls: string) => (
    <div className={`cine-flower ${cls}`} ref={flowerRef} style={{ width: w }}>
      <div className="memory-ground" />
      <Plant id={`v-${view.id}`} params={view.plant} width={w} reveal={3} className="plant-big" title={view.title} />
    </div>
  );
  const c1 = view.plant.colors.petals[0] || '#c4b5e8';
  const c2 = view.plant.colors.glow || '#f6d78d';

  return (
    <div className="screen memory cinema">
      {/* blurred, enlarged version of the open memory fills the whole page */}
      <div className="cine-bg" aria-hidden="true" style={{ background: `radial-gradient(120% 90% at 25% 15%, ${withAlpha(c1, 0.35)}, transparent 60%), radial-gradient(100% 80% at 85% 95%, ${withAlpha(c2, 0.28)}, transparent 62%), #0b1026` }}>
        {bg.prev && <img className="cine-bg-img" src={bg.prev} alt="" />}
        {bg.cur && <img key={bg.cur} className="cine-bg-img fresh" src={bg.cur} alt="" />}
        <div className="cine-bg-shade" />
      </div>

      <TopBar crumbs={[planetName, String(year), t.months[month], view.title || view.date]} onBack={back} backLabel={t.backToGarden}>
        {view.own && (
          <>
            <button className={`btn btn-sm btn-ghost ${drawer === 'why' ? 'on' : ''}`} onClick={() => toggleDrawer('why')}><IcoWhy /> <span className="topbar-backlabel">{t.whyFlower}</span></button>
            <button className={`btn btn-sm ${drawer === 'tools' ? 'btn-primary' : ''}`} onClick={() => toggleDrawer('tools')} aria-label={t.edit}><IcoEdit /> <span className="topbar-backlabel">{t.edit}</span></button>
          </>
        )}
      </TopBar>

      <div className="cine-body">
        {/* LEFT — the story, scrolls like film credits */}
        <section className="cine-text">
          <div className="cine-text-scroll scroll" tabIndex={0}>
            <div className="cine-text-inner">
              <div className="memory-date">{formatDate(view.date, lang)}</div>
              <h2 className="memory-title cine-title">{view.locked ? t.privateMemory : view.title}</h2>
              <div className="cine-orn" aria-hidden="true"><i /></div>
              {!view.locked && view.quote && <blockquote className="memory-quote cine-quote">«{view.quote.replace(/^[«"“]|[»"”]$/g, '')}»</blockquote>}
              {!view.locked && (
                <div className="memory-story">
                  {paragraphs.length
                    ? paragraphs.map((p, i) => <p key={i} style={{ animationDelay: `${0.5 + Math.min(i, 10) * 0.3}s` }}>{p}</p>)
                    : <p className="muted">{t.noStory}</p>}
                </div>
              )}
              {!view.locked && canNarrate() && paragraphs.length > 0 && (
                <div className="col" style={{ gap: 4, marginTop: 18 }}>
                  <button className={`btn btn-sm ${speaking ? 'btn-primary' : ''}`} onClick={toggleSpeak} style={{ alignSelf: 'flex-start' }}><IcoVoice /> {speaking ? t.stopListening : t.listen}</button>
                  <span className="small muted">{t.listenHint}</span>
                </div>
              )}
              {view.own && <div className="small muted" style={{ marginTop: 22 }}>{t.recordedOn} {new Date(view.own.createdAt).toLocaleDateString(lang === 'ru' ? 'ru-RU' : 'en-US')}</div>}
            </div>
          </div>
        </section>

        {/* CENTRE — the photographs (or, without photos, the flower itself) */}
        <section className="cine-stage" ref={stageRef}>
          {hasPhotos
            ? <PhotoStage photos={view.photos} idx={photoIdx} setIdx={setPhotoIdx} full={fullUrls} onManual={manual} animate={!reduced} />
            : flower(bigW, 'cine-flower-big')}
        </section>

        {/* RIGHT — small flower and the music player */}
        <aside className="cine-side">
          {hasPhotos && flower(210, 'cine-flower-small')}
          {!view.locked && <MusicDock music={mu} audioUrl={audioUrl} plant={view.plant} armed={armed} />}
        </aside>
      </div>

      {/* the old side panel: opens only on demand */}
      {drawer && view.own && (
        <>
          <div className="memory-drawer-backdrop" onClick={() => setDrawer(null)} />
          <aside className="panel panel-strong memory-drawer" role="dialog" aria-label={drawer === 'why' ? t.whyFlower : t.manageMemory}>
            <div className="drawer-head">
              <h3>{drawer === 'why' ? t.whyFlower : t.manageMemory}</h3>
              <button className="btn btn-icon btn-ghost" onClick={() => setDrawer(null)} aria-label={t.closePanel}><IcoClose /></button>
            </div>
            <div className="drawer-scroll scroll">
              {drawer === 'why' && <ExplainPanel reasons={view.reasons} visual={view.visual} plant={view.plant} />}
              {drawer === 'tools' && (
                <div className="col">
                  <MusicInfo music={mu} />
                  <div className="memory-footer">
                    <select className="input" style={{ width: 'auto', padding: '7px 10px' }} value={view.own.privacy} onChange={(e) => setPrivacy(e.target.value as Privacy)} title={t.privacyHint}>
                      <option value="private">{t.privacy}: {t.privacy_private}</option>
                      <option value="garden">{t.privacy}: {t.privacy_garden}</option>
                      <option value="shared">{t.privacy}: {t.privacy_shared}</option>
                    </select>
                    <button className="btn btn-sm btn-ghost" onClick={() => go({ screen: 'create', editId: view.id, newDate: view.date }, 'fade')}><IcoEdit /> {t.editMemory}</button>
                    <button className="btn btn-sm btn-ghost" onClick={() => exportDayFolder(view.own!, lang, svgMarkup())}><IcoDownload /> {t.exportDay}</button>
                    <button className="btn btn-sm btn-ghost" onClick={() => { const s = svgMarkup(); if (s) exportSvg(view.own!, s); }}><IcoLeafIcon /> {t.exportSvg}</button>
                    <button className="btn btn-sm btn-ghost btn-danger" onClick={del}><IcoTrash /> {t.delete}</button>
                  </div>
                </div>
              )}
            </div>
          </aside>
        </>
      )}
    </div>
  );
}

const IcoLeafIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="ico"><path d="M5 19c0-8 5-13 14-14-1 9-6 14-14 14zM5 19l8-8" /></svg>;

function PhotoStage({ photos, idx, setIdx, full, onManual, animate }: { photos: View['photos']; idx: number; setIdx: (i: number) => void; full: Record<string, string>; onManual: () => void; animate: boolean }) {
  const { t } = useStore();
  const i = Math.min(idx, photos.length - 1);
  const p = photos[i];
  const src = (p.id && full[p.id]) || p.thumb;
  const step = (d: number) => { onManual(); setIdx((i + d + photos.length) % photos.length); };
  return (
    <div className="photo-viewer cine-photos">
      <figure className="cine-frame">
        <img key={i} className={`cine-img ${animate ? 'drift' : ''}`} src={src} alt={p.name} />
        {photos.length > 1 && <>
          <button className="btn btn-icon nav l" onClick={() => step(-1)} aria-label="prev"><IcoBack /></button>
          <button className="btn btn-icon nav r" onClick={() => step(1)} aria-label="next"><IcoForward /></button>
        </>}
        <span className="photo-counter">{i + 1} {t.of} {photos.length}</span>
      </figure>
      {photos.length > 1 && (
        <div className="thumbs">{photos.map((ph, k) => <img key={k} src={ph.thumb} className={k === i ? 'on' : ''} onClick={() => { onManual(); setIdx(k); }} alt="" />)}</div>
      )}
    </div>
  );
}

/** Background music: starts by itself, loops, can be paused. */
function MusicDock({ music, audioUrl, plant, armed }: { music: MusicRef; audioUrl: string | null; plant: PlantParams; armed: boolean }) {
  const { t } = useStore();
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [vol, setVol] = useState(0.7);

  useEffect(() => {
    const a = audioRef.current;
    if (!a || !armed || !audioUrl) return;
    a.volume = vol;
    a.play().then(() => setBlocked(false)).catch(() => setBlocked(true));
    return () => { a.pause(); };
  }, [armed, audioUrl]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (audioRef.current) audioRef.current.volume = vol; }, [vol]);

  if (!music || music.kind === 'none') return null;
  const toggle = () => {
    const a = audioRef.current; if (!a) return;
    if (a.paused) a.play().then(() => setBlocked(false)).catch(() => setBlocked(true)); else a.pause();
  };
  const height = music.service === 'youtube' ? 158 : music.service === 'spotify' ? 152 : music.service === 'apple' ? 175 : 166;

  return (
    <div className="cine-dock panel">
      <div className="dock-head">
        <IcoNote className="ico" />
        <span className="dock-title">{music.title || music.fileName || t.musicPetal}</span>
        <div className={`eq ${playing || music.kind === 'link' ? '' : 'idle'}`} style={{ ['--pulse-dur' as any]: `${plant.pulse_period}s` }}><span /><span /><span /><span /><span /></div>
      </div>
      {music.kind === 'file' && (
        <>
          <audio ref={audioRef} src={audioUrl ?? undefined} loop preload="auto" onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} />
          <div className="dock-controls">
            <button className="btn btn-icon btn-primary" onClick={toggle} aria-label={playing ? t.pauseMusic : t.playMusic}>{playing ? <IcoPause /> : <IcoPlay />}</button>
            <input type="range" min={0} max={1} step={0.01} value={vol} onChange={(e) => setVol(Number(e.target.value))} aria-label={t.volume} />
          </div>
          {blocked && <p className="small muted" style={{ margin: 0 }}>{t.musicBlocked}</p>}
        </>
      )}
      {music.kind === 'link' && music.embedUrl && (
        <div className="music-embed dock-embed" style={{ height }}>
          {armed && <iframe src={autoplayEmbed(music.embedUrl)} height={height} allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" title="music" />}
        </div>
      )}
      {music.kind === 'link' && music.embedUrl && <p className="small muted" style={{ margin: 0 }}>{t.musicBlocked}</p>}
      {music.kind === 'link' && music.url && (
        <a className="btn btn-sm" href={music.url} target="_blank" rel="noreferrer" style={{ alignSelf: 'flex-start' }}><IcoLink /> {t.openIn} {music.service && music.service !== 'other' ? music.service : 'link'}</a>
      )}
    </div>
  );
}

/** Song details (tempo, mood, energy) — shown inside the on-demand panel. */
function MusicInfo({ music }: { music: MusicRef }) {
  const { t } = useStore();
  if (!music || music.kind === 'none') return <p className="muted">{t.noMusic}</p>;
  const bpm = music.analysis?.bpm ?? (music.descriptors ? Math.round(60 + music.descriptors.tempo * 120) : null);
  return (
    <div className="col" style={{ gap: 8 }}>
      {music.title && <h3>{music.title}</h3>}
      <div className="chips">
        {bpm && <span className="chip on">{music.analysis ? t.musicSourceAudio(bpm) : t.musicSourceDesc(bpm)}</span>}
        {music.descriptors && <span className="chip">{t.mood}: {t[`mood_${music.descriptors.mood}`]}</span>}
        {music.descriptors?.genre && <span className="chip">{music.descriptors.genre}</span>}
        {music.analysis && <span className="chip">{t.energy}: {Math.round(music.analysis.energy * 100)}%</span>}
      </div>
      <p className="small muted" style={{ margin: 0 }}>{t.swayInfo}</p>
    </div>
  );
}
