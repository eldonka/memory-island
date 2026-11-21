import React, { useMemo } from 'react';
import { useStore, useVisibleMemories } from '../state/store';
import { TopBar } from '../components/TopBar';
import { Plant } from '../plant/Plant';
import { formatDate } from '../i18n/strings';

export function Archive() {
  const { t, lang, back, go, visiting } = useStore();
  const { memories } = useVisibleMemories();
  const groups = useMemo(() => {
    const map = new Map<string, typeof memories>();
    for (const m of [...memories].sort((a, b) => b.date.localeCompare(a.date))) { const k = m.date.slice(0, 7); if (!map.has(k)) map.set(k, []); map.get(k)!.push(m); }
    return Array.from(map.entries());
  }, [memories]);

  return (
    <div className="screen">
      <TopBar crumbs={[visiting ? visiting.planetName : t.archiveTitle]} onBack={back} backLabel={t.back} />
      <div className="list-body scroll">
        <div className="list-wrap">
          {groups.length === 0 && <p className="muted center fade-up">{t.archiveEmpty}</p>}
          {groups.map(([k, list], gi) => {
            const y = Number(k.slice(0, 4)), mo = Number(k.slice(5, 7)) - 1;
            return (
              <div key={k} className={`panel archive-month fade-up d${Math.min(5, gi + 1)}`}>
                <h3>{t.months[mo]} {y}</h3>
                <div className="archive-grid">
                  {list.map((m) => (
                    <div key={m.id} className="archive-item" onClick={() => go({ screen: 'memory', memoryId: m.id, year: y, month: mo }, 'zoom-in')}>
                      <Plant id={`a-${m.id}`} params={m.plant} width={70} animate={false} />
                      <span className="ttl">{m.title || (m.privacy === 'garden' ? '✦' : m.date)}</span>
                      <span className="dt">{formatDate(m.date, lang)}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
