import React, { useMemo, useState } from 'react';
import { useStore, useVisibleMemories } from '../state/store';
import { TopBar } from '../components/TopBar';
import { IcoBack, IcoForward, IcoCalendar, IcoHome } from '../components/Icons';
import { Plant } from '../plant/Plant';
import { todayISO } from '../data/dates';

export function Years() {
  const { t, go, back, nav, profile, visiting } = useStore();
  const { memories, readOnly } = useVisibleMemories();
  const current = new Date().getFullYear();
  const byYear = useMemo(() => {
    const m = new Map<number, typeof memories>();
    for (const mem of memories) { const y = Number(mem.date.slice(0, 4)); if (!m.has(y)) m.set(y, []); m.get(y)!.push(mem); }
    return m;
  }, [memories]);
  const minYear = Math.min(current - 3, ...Array.from(byYear.keys()));
  const [end, setEnd] = useState(Math.max(current, nav.year));
  const span = window.innerWidth < 520 ? 3 : window.innerWidth < 900 ? 4 : 5;
  const years = Array.from({ length: span }, (_, i) => end - span + 1 + i);
  const planetName = visiting ? visiting.planetName : profile?.planetName || '';

  const pickDate = (iso: string) => {
    if (!iso) return;
    const [y, m] = iso.split('-').map(Number);
    go({ screen: 'create', year: y, month: m - 1, newDate: iso, editId: null }, 'zoom-in');
  };

  return (
    <div className="screen years">
      <TopBar crumbs={[planetName, t.yearsTitle]} onBack={back} backLabel={t.backToPlanet}>
        {visiting && <span className="chip on">{t.visiting(visiting.planetName)}</span>}
        <button className="btn btn-sm btn-ghost" onClick={() => go({ screen: 'archive' })}>{t.archive}</button>
      </TopBar>
      <div className="years-body">
        <div className="years-line fade-up">
          <button className="btn btn-icon btn-ghost" onClick={() => setEnd((e) => e - 1)} disabled={end - span + 1 <= minYear - 20} aria-label="earlier"><IcoBack /></button>
          {years.map((y) => {
            const list = byYear.get(y) || [];
            const filled = list.length > 0;
            const preview = list.slice(0, 3);
            return (
              <button key={y} className={`year-orb ${filled ? 'filled' : ''} ${y === current ? 'current' : ''}`} onClick={() => go({ screen: 'months', year: y }, 'zoom-in')}>
                <div className="orb">
                  {filled && (
                    <div className="mini">
                      {preview.map((m, i) => (
                        <Plant key={m.id} id={`yr-${m.id}`} params={m.plant} width={26} animate={false} style={{ marginLeft: i ? -8 : 0 }} />
                      ))}
                    </div>
                  )}
                </div>
                <span className="yr">{y}</span>
                <span className="cnt">{y === current && !filled ? t.currentYear : t.memoriesCount(list.length)}</span>
              </button>
            );
          })}
          <button className="btn btn-icon btn-ghost" onClick={() => setEnd((e) => e + 1)} disabled={end >= current + 1} aria-label="later"><IcoForward /></button>
        </div>
        {memories.length === 0 && <div className="years-hint fade-up d2">{t.storyBegins}</div>}
        {!readOnly && (
          <label className="btn fade-up d3" style={{ position: 'relative', overflow: 'hidden' }}>
            <IcoCalendar /> {t.plantFromPast}
            <input type="date" max={todayISO()} style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }} onChange={(e) => pickDate(e.target.value)} />
          </label>
        )}
        {visiting && <button className="btn btn-ghost btn-sm" onClick={() => { useStore.getState().setVisiting(null); go({ screen: 'welcome' }, 'zoom-out'); }}><IcoHome /> {t.myPlanet}</button>}
      </div>
    </div>
  );
}
