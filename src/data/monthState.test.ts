// Regression tests for future-month navigation: a future month can be explored,
// nothing can be planted there, and the suggested date never leaves the opened month.
import { describe, it, expect } from 'vitest';
import { monthStatus, creationWindow, isPlantableDate } from './monthState';
import { daysInMonth } from './dates';

const TODAY = '2026-11-21';

describe('monthStatus', () => {
  it('classifies past, current and future months around today', () => {
    expect(monthStatus(2026, 10, TODAY)).toBe('current');   // November 2026
    expect(monthStatus(2026, 9, TODAY)).toBe('past');       // October 2026
    expect(monthStatus(2026, 11, TODAY)).toBe('future');    // December 2026
    expect(monthStatus(2027, 0, TODAY)).toBe('future');     // January 2027
    expect(monthStatus(2025, 11, TODAY)).toBe('past');      // December 2025
    expect(monthStatus(2020, 0, TODAY)).toBe('past');
  });
  it('year boundaries: January of next year is future, December of last year is past', () => {
    expect(monthStatus(2027, 0, '2026-12-31')).toBe('future');
    expect(monthStatus(2026, 11, '2026-12-31')).toBe('current');
    expect(monthStatus(2026, 11, '2027-01-01')).toBe('past');
  });
});

describe('creationWindow', () => {
  it('future month → null (creation disabled, no default date invented)', () => {
    expect(creationWindow(2026, 11, TODAY)).toBeNull();
    expect(creationWindow(2027, 5, TODAY)).toBeNull();
  });
  it('current month → from the 1st up to today, default today', () => {
    expect(creationWindow(2026, 10, TODAY)).toEqual({ min: '2026-11-01', max: '2026-11-21', defaultDate: '2026-11-21' });
  });
  it('past month → the whole month, default its last day', () => {
    expect(creationWindow(2026, 9, TODAY)).toEqual({ min: '2026-10-01', max: '2026-10-31', defaultDate: '2026-10-31' });
    expect(creationWindow(2024, 1, TODAY)).toEqual({ min: '2024-02-01', max: '2024-02-29', defaultDate: '2024-02-29' });
  });
  it('first day of a month: the window is exactly that one day', () => {
    expect(creationWindow(2026, 10, '2026-11-01')).toEqual({ min: '2026-11-01', max: '2026-11-01', defaultDate: '2026-11-01' });
  });
  it('never suggests a date outside the opened month or after today (regression: future month redirected to today)', () => {
    for (let y = 2018; y <= 2030; y++) for (let m = 0; m < 12; m++) {
      const w = creationWindow(y, m, TODAY);
      const key = `${y}-${String(m + 1).padStart(2, '0')}`;
      if (monthStatus(y, m, TODAY) === 'future') { expect(w).toBeNull(); continue; }
      expect(w).not.toBeNull();
      expect(w!.defaultDate.slice(0, 7)).toBe(key);
      expect(w!.min.slice(0, 7)).toBe(key); expect(w!.max.slice(0, 7)).toBe(key);
      expect(w!.defaultDate <= TODAY).toBe(true); expect(w!.max <= TODAY).toBe(true);
      expect(w!.min <= w!.defaultDate && w!.defaultDate <= w!.max).toBe(true);
      expect(Number(w!.max.slice(8, 10))).toBeLessThanOrEqual(daysInMonth(y, m));
    }
  });
});

describe('isPlantableDate', () => {
  it('accepts today and any past day, rejects tomorrow', () => {
    expect(isPlantableDate('2026-11-21', TODAY)).toBe(true);
    expect(isPlantableDate('1999-01-01', TODAY)).toBe(true);
    expect(isPlantableDate('2026-11-22', TODAY)).toBe(false);
    expect(isPlantableDate('2027-01-01', TODAY)).toBe(false);
  });
});
