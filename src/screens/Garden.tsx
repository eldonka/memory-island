import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useStore, useVisibleMemories } from '../state/store';
import { TopBar } from '../components/TopBar';
import { Island } from '../scenes/Island';
import { Ambience } from '../scenes/Ambience';
import { Plant } from '../plant/Plant';
import { IcoPlus, IcoCalendar } from '../components/Icons';
import { layoutGarden } from './gardenLayout';
import { todayISO } from '../data/dates';
import { monthStatus, creationWindow, isPlantableDate } from '../data/monthState';

export function Garden() {
  const { t, go, back, nav, profile, visiting, growingId, setGrowing, setToast } = useStore();
  const { memories, readOnly } = useVisibleMemories();
  const { year, month } = nav;
  const list = useMemo(() => memories.filter((m) => Number(m.date.slice(0, 4)) === year && Number(m.date.slice(5, 7)) - 1 === month), [memories, year, month]);
  const layout = useMemo(() => layoutGarden(list), [list]);
  const islandRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [islandW, setIslandW] = useState(900);
  const [growth, setGrowth] = useState<number>(1);
  const [seedPhase, setSeedPhase] = useState<'fall' | 'grow' | null>(null);
  const growing = growingId ? list.find((m) => m.id === growingId) : undefined;

  useLayoutEffect(() => {
    const el = islandRef.current; if (!el) return;
    const ro = new ResizeObserver(() => setIslandW(el.clientWidth));
    ro.observe(el); setIslandW(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  // drag-to-pan for wide (crowded) gardens on mouse devices; touch scrolls natively
  useEffect(() => {
    const el = stageRef.current; if (!el) return;
    let startX = 0, startLeft = 0, dragging = false, moved = false;
    const down = (e: PointerEvent) => { if (e.pointerType !== 'mouse' || e.button !== 0) return; dragging = true; moved = false; startX = e.clientX; startLeft = el.scrollLeft; };
    const move = (e: PointerEvent) => { if (!dragging) return; const dx = e.clientX - startX; if (Math.abs(dx) > 4) moved = true; el.scrollLeft = startLeft - dx; };
    const up = () => { dragging = false; };
    const click = (e: MouseEvent) => { if (moved) { e.stopPropagation(); e.preventDefault(); moved = false; } };
    el.addEventListener('pointerdown', down); window.addEventListener('pointermove', move); window.addEventListener('pointerup', up); el.addEventListener('click', click, true);
    return () => { el.removeEventListener('pointerdown', down); window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); el.removeEventListener('click', click, true); };
  }, []);

  // growth sequence for a freshly planted memory
  useEffect(() => {
    if (!growing) return;
    let raf = 0; let start = 0;
    setGrowth(0); setSeedPhase('fall');
    const reduced = profile?.reducedMotion;
    const duration = reduced ? 10 : (3800 + (1 - growing.plant.sway_speed) * 2600);
    const fallMs = reduced ? 0 : 1100;
    const t0 = performance.now();
    const tick = (now: number) => {
      const el = now - t0;
      if (el < fallMs) { raf = requestAnimationFrame(tick); return; }
      if (!start) { start = now; setSeedPhase('grow'); }
      const g = Math.min(1, (now - start) / duration);
      setGrowth(g);
      if (g < 1) raf = requestAnimationFrame(tick);
      else { setSeedPhase(null); setGrowing(null); setToast(t.grown); }
    };
    raf = requestAnimationFrame(tick);
    // scroll the growing plant into view on wide gardens
    const slot = layout.slots.find((s) => s.id === growing.id);
    if (slot && stageRef.current && islandRef.current) {
      const x = (slot.xPct / 100) * islandRef.current.clientWidth;
      stageRef.current.scrollTo({ left: Math.max(0, x - stageRef.current.clientWidth / 2), behavior: 'smooth' });
    }
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [growing?.id]);

  const planetName = visiting ? visiting.planetName : profile?.planetName || '';
  const today = todayISO();
  // A future month can be explored but not planted: no creation window, no invented date.
  const status = monthStatus(year, month, today);
  const window_ = creationWindow(year, month, today);
  const canPlant = !readOnly && !!window_;

  const create = (date: string) => { if (isPlantableDate(date, today)) go({ screen: 'create', newDate: date, editId: null }, 'zoom-in'); };
  const slotById = new Map(layout.slots.map((s) => [s.id, s]));
  const ordered = [...list].sort((a, b) => (slotById.get(a.id)!.depth - slotById.get(b.id)!.depth));
  const growSlot = growing ? slotById.get(growing.id) : undefined;
  const plantBase = Math.min(190, Math.max(56, Math.min(islandW, 1100) * layout.plantFactor));

  return (
    <div className="screen garden" data-month-status={status}>
      <TopBar crumbs={[planetName, String(year), t.months[month]]} onBack={back} backLabel={t.backToMonths}>
        {status === 'future' ? <span className="chip">{t.futureMonth}</span> : <span className="chip">{t.memoriesCount(list.length)}</span>}
      </TopBar>
      <div className={`garden-stage scroll ${layout.widthFactor > 1 ? 'pannable' : ''}`} ref={stageRef}>
        <div className="garden-haze" />
        <Ambience layer="back" seed={year * 100 + month} clouds={3} intensity={0.6} pollen={profile?.reducedMotion || status === 'future' ? 0 : 14} />
        <div className="garden-vignette" />
        {list.length === 0 && !growing && (
          <div className="garden-empty fade-up">
            {status === 'future' ? (
              <>
                <h2>{t.gardenFutureTitle}</h2>
                <p className="muted serif italic garden-future-hint">{t.gardenFutureHint}</p>
              </>
            ) : (
              <>
                <h2>{t.gardenEmptyTitle}</h2>
                {canPlant && <button className="btn btn-primary" onClick={() => create(window_!.defaultDate)}><IcoPlus /> {t.plantFirst}</button>}
              </>
            )}
          </div>
        )}
        {list.length > 0 && !growing && <div className="garden-hint fade-in d3">{t.touchFlower}</div>}
        {growing && <div className="grow-banner">{t.growing}</div>}
        <div className="garden-world" style={layout.widthFactor > 1 ? { width: Math.round(1100 * layout.widthFactor), minWidth: Math.round(1100 * layout.widthFactor) } : undefined}>
          <div className="garden-island" ref={islandRef}>
            <Island seed={year * 100 + month + 1} count={list.length} wide width={islandW} lights dormant={status === 'future'} />
            <div className="garden-plants">
              {ordered.map((m) => {
                const slot = slotById.get(m.id)!;
                const isGrowing = growing?.id === m.id;
                const w = plantBase * slot.scale;
                return (
                  <div key={m.id} className={`garden-plant row-${slot.row} ${isGrowing ? 'growing' : ''}`} style={{ left: `${slot.xPct}%`, top: `${slot.yPct}%`, width: w }}>
                    <Plant id={`g-${m.id}`} params={m.plant} width={w} growth={isGrowing ? growth : 1} animate={!isGrowing || growth >= 1}
                      onClick={() => !isGrowing && go({ screen: 'memory', memoryId: m.id }, 'zoom-in')} title={m.title || m.date} />
                    <div className="plant-label">{m.title || m.date.slice(8, 10)}</div>
                  </div>
                );
              })}
              {growSlot && seedPhase === 'fall' && (
                <div className="seed-fall" style={{ left: `${growSlot.xPct}%`, ['--to' as any]: `${growSlot.yPct}%` }} />
              )}
              {growSlot && seedPhase === 'grow' && growth < 0.3 && (
                <div className="soil-pulse" style={{ left: `${growSlot.xPct}%`, top: `${growSlot.yPct}%` }} />
              )}
            </div>
          </div>
        </div>
        {status !== 'future' && <Ambience layer="front" seed={year * 100 + month + 1} fireflies={profile?.reducedMotion ? 0 : 7} />}
      </div>
      {canPlant && !growing && list.length > 0 && (
        <div className="garden-actions">
          <label className="btn btn-primary" style={{ position: 'relative', overflow: 'hidden' }}>
            <IcoCalendar /> {t.plantMemory}
            <input type="date" min={window_!.min} max={window_!.max} defaultValue={window_!.defaultDate}
              style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }} onChange={(e) => e.target.value && create(e.target.value)} />
          </label>
        </div>
      )}
      {!readOnly && status === 'future' && list.length > 0 && !growing && (
        <div className="garden-actions"><span className="chip garden-future-chip">{t.gardenFutureHint}</span></div>
      )}
    </div>
  );
}
