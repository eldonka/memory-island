import React from 'react';
import type { PlantParams, Reason, VisualParameters } from '../data/types';
import { useStore } from '../state/store';
import { VISUAL_KEYS } from '../analysis/dna';

const LABELS: Record<string, { ru: string; en: string }> = {
  warmth: { ru: 'тепло', en: 'warmth' }, energy: { ru: 'энергия', en: 'energy' }, calmness: { ru: 'спокойствие', en: 'calmness' },
  nostalgia: { ru: 'ностальгия', en: 'nostalgia' }, tension: { ru: 'напряжение', en: 'tension' }, joy: { ru: 'радость', en: 'joy' },
  sadness: { ru: 'грусть', en: 'sadness' }, wonder: { ru: 'удивление', en: 'wonder' }, complexity: { ru: 'сложность', en: 'complexity' }, night: { ru: 'ночь', en: 'night' },
};
export const visualLabel = (k: string, lang: 'ru' | 'en') => LABELS[k]?.[lang] ?? k;

export function DnaBars({ visual }: { visual: VisualParameters }) {
  const lang = useStore((s) => s.lang);
  return (
    <div className="dna-bars">
      {VISUAL_KEYS.map((k) => (
        <div className="dna-bar" key={k}>
          <span className="lbl">{visualLabel(k, lang)}</span>
          <span className="bar"><i style={{ width: `${Math.round((visual[k] as number) * 100)}%` }} /></span>
          <span className="muted">{Math.round((visual[k] as number) * 100)}</span>
        </div>
      ))}
    </div>
  );
}

export function ExplainPanel({ reasons, visual, plant }: { reasons: Reason[]; visual: VisualParameters; plant: PlantParams }) {
  const { t, lang } = useStore();
  const render = (r: Reason) => { const f = t.reason[r.code]; return f ? f(r.values || {}) : r.code; };
  const groups: { key: Reason['source']; title: string }[] = [
    { key: 'text', title: t.fromText }, { key: 'photo', title: t.fromPhotos }, { key: 'music', title: t.fromMusic }, { key: 'user', title: t.fromRules },
  ];
  return (
    <div className="reasons">
      <div>
        <h4>{lang === 'ru' ? 'ДНК воспоминания' : 'Memory DNA'}</h4>
        <DnaBars visual={visual} />
      </div>
      <div>
        <h4>{lang === 'ru' ? 'Растение' : 'The plant'}</h4>
        <div className="row" style={{ marginTop: 6 }}>
          <span className="swatches">{plant.colors.petals.map((c, i) => <i key={i} style={{ background: c }} title={c} />)}</span>
          <span className="small muted">{t.style[plant.petal_style]} · {plant.petal_count} × {plant.layers} · {t.texture[plant.texture]} · {t.particles[plant.particle_style]}</span>
        </div>
      </div>
      {groups.map((g) => {
        const rs = reasons.filter((r) => r.source === g.key && r.code !== 'user.adjusted');
        if (!rs.length) return null;
        return (
          <div key={g.key}>
            <h4>{g.title}</h4>
            <ul>{rs.map((r, i) => <li key={i}>{render(r)}</li>)}</ul>
          </div>
        );
      })}
      {reasons.some((r) => r.code === 'user.adjusted') && (
        <p className="small muted">{lang === 'ru' ? 'Настроение уточнено пользователем после анализа.' : 'Mood adjusted by the user after analysis.'}</p>
      )}
    </div>
  );
}
