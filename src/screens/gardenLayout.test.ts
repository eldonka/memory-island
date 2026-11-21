import { describe, it, expect } from 'vitest';
import { layoutGarden, bloomCenterPx, rowsFor, ISLAND_VW } from './gardenLayout';

const days = (n: number) => Array.from({ length: n }, (_, i) => ({ id: `m${i + 1}`, date: `2026-11-${String(i + 1).padStart(2, '0')}` }));

describe('garden layout', () => {
  it('is deterministic for the same set of days', () => {
    const a = layoutGarden(days(17)), b = layoutGarden([...days(17)].reverse());
    expect(a).toEqual(b);
  });
  it('uses more depth rows as the month fills up', () => {
    expect(rowsFor(1)).toBe(1); expect(rowsFor(8)).toBe(1); expect(rowsFor(9)).toBe(2); expect(rowsFor(18)).toBe(2); expect(rowsFor(19)).toBe(3); expect(rowsFor(31)).toBe(3);
  });
  it('keeps every plant on the island for 1..31 days', () => {
    for (let n = 1; n <= 31; n++) {
      const { slots } = layoutGarden(days(n));
      expect(slots).toHaveLength(n);
      for (const s of slots) { expect(s.xPct).toBeGreaterThan(9); expect(s.xPct).toBeLessThan(91); expect(s.yPct).toBeGreaterThan(35); expect(s.yPct).toBeLessThan(70); }
    }
  });
  it('widens the island for crowded months so panning gives room', () => {
    expect(layoutGarden(days(8)).widthFactor).toBe(1);
    expect(layoutGarden(days(31)).widthFactor).toBeGreaterThan(1.5);
  });
  it('31 blooms do not pile up: neighbouring bloom centres stay apart', () => {
    const lay = layoutGarden(days(31));
    const islandW = 1100 * lay.widthFactor;
    const centres = lay.slots.map((s) => ({ ...bloomCenterPx(s, islandW, lay.plantFactor), id: s.id }));
    let minD = Infinity, worst = '';
    for (let i = 0; i < centres.length; i++) for (let j = i + 1; j < centres.length; j++) {
      const a = centres[i], b = centres[j];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (d < minD) { minD = d; worst = `${a.id}-${b.id}`; }
    }
    const bloom = centres[0].bloomW;
    expect(minD, `closest pair ${worst}: ${minD.toFixed(1)}px vs bloom ${bloom.toFixed(1)}px`).toBeGreaterThan(bloom * 0.9);
  });
  it('plants are not tiny in a full garden', () => {
    const lay = layoutGarden(days(31));
    const { plantW } = bloomCenterPx(lay.slots[0], 1100 * lay.widthFactor, lay.plantFactor);
    expect(plantW).toBeGreaterThan(100);
    expect(ISLAND_VW).toBe(900);
  });
});
