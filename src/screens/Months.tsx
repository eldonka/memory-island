import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useStore, useVisibleMemories } from '../state/store';
import { TopBar } from '../components/TopBar';
import { Island } from '../scenes/Island';
import { Ambience } from '../scenes/Ambience';
import { monthStatus } from '../data/monthState';
import { todayISO } from '../data/dates';

export function Months() {
  const { t, go, back, nav, profile, visiting } = useStore();
  const { memories } = useVisibleMemories();
  const [selected, setSelected] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  // far clouds move slower than the islands (parallax); the Sky canvas moves slower still
  const onScroll = (e: React.UIEvent<HTMLDivElement>) => rootRef.current?.style.setProperty('--scroll', String(e.currentTarget.scrollTop));
  const slotRefs = useRef<(HTMLDivElement | null)[]>([]);
  const year = nav.year;
  const counts = useMemo(() => {
    const c = new Array(12).fill(0);
    for (const m of memories) if (Number(m.date.slice(0, 4)) === year) c[Number(m.date.slice(5, 7)) - 1]++;
    return c as number[];
  }, [memories, year]);
  const now = new Date();
  const today = todayISO();
  const isWide = window.innerWidth > 640;

  useEffect(() => {
    const target = year === now.getFullYear() ? now.getMonth() : year < now.getFullYear() ? 11 : 0;
    const el = slotRefs.current[target];
    if (el && scrollRef.current) {
      const top = el.offsetTop - scrollRef.current.clientHeight / 2 + el.clientHeight / 2;
      scrollRef.current.scrollTo({ top, behavior: 'auto' });
    }
  }, [year]);

  const pick = (m: number) => {
    if (selected !== null) return;
    setSelected(m);
    slotRefs.current[m]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    window.setTimeout(() => go({ screen: 'garden', month: m }, 'zoom-in'), 850);
  };
  const jump = (m: number) => slotRefs.current[m]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  const planetName = visiting ? visiting.planetName : profile?.planetName || '';

  return (
    <div className={`screen months ${selected !== null ? 'selecting' : ''}`} ref={rootRef}>
      <TopBar crumbs={[planetName, String(year), t.monthsTitle]} onBack={back} backLabel={t.backToYears} />
      <Ambience layer="back" seed={year} clouds={7} />
      <div className="months-scroll scroll" ref={scrollRef} onScroll={onScroll}>
        <div className="months-track">
          <div className="months-path" />
          {t.months.map((name, m) => {
            const count = counts[m];
            const side = m % 2 === 0 ? 'left' : 'right';
            const status = monthStatus(year, m, today);
            const w = isWide ? 300 + Math.min(60, count * 6) : Math.min(window.innerWidth * 0.62, 260);
            return (
              <div key={m} ref={(el) => (slotRefs.current[m] = el)} data-month-status={status} className={`month-slot ${side} ${count ? '' : 'empty'} ${status === 'future' ? 'future' : ''} ${selected === m ? 'selected' : ''}`}>
                <div className="island-wrap" style={{ ['--dur' as any]: `${6.5 + (m % 3)}s`, ['--delay' as any]: `${-(m * 0.9)}s` }}>
                  <Island seed={year * 100 + m + 1} count={count} width={w} selected={selected === m} onClick={() => pick(m)} dormant={status === 'future'}>
                    <div className="month-label">
                      <div className="name">{name}</div>
                      <div className="cnt">{count ? t.memoriesCount(count) : status === 'future' ? t.futureMonth : t.emptyGarden}</div>
                    </div>
                  </Island>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div className="months-nav" aria-label="quick month navigation">
        {t.months.map((name, m) => (
          <button key={m} className={`${counts[m] ? 'has' : ''} ${year === now.getFullYear() && m === now.getMonth() ? 'on' : ''}`} onClick={() => jump(m)} title={name}>{name.slice(0, 3)}</button>
        ))}
      </div>
    </div>
  );
}
