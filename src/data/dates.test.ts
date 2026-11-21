import { describe, it, expect } from 'vitest';
import { localISODate, isValidISODate, daysInMonth, monthRange, parseISODate, minISO } from './dates';

describe('local calendar dates (timezone-safe)', () => {
  it('keeps the local calendar day late in the evening and early in the morning', () => {
    // these would shift by a day in UTC for most time zones if toISOString() were used
    expect(localISODate(new Date(2026, 10, 20, 23, 30))).toBe('2026-11-20');
    expect(localISODate(new Date(2026, 10, 21, 0, 30))).toBe('2026-11-21');
  });
  it('handles month and year boundaries', () => {
    expect(localISODate(new Date(2026, 1, 28, 23, 59))).toBe('2026-02-28');
    expect(localISODate(new Date(2026, 11, 31, 23, 59, 59))).toBe('2026-12-31');
    expect(localISODate(new Date(2027, 0, 1, 0, 0, 1))).toBe('2027-01-01');
  });
  it('matches the components the Date object reports (never UTC)', () => {
    for (let h = 0; h < 24; h += 3) {
      const d = new Date(2026, 5, 15, h, 10);
      expect(localISODate(d)).toBe(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
    }
  });
  it('round-trips a selected day', () => {
    const picked = '2024-02-29';
    const { year, month, day } = parseISODate(picked);
    expect(localISODate(new Date(year, month, day, 12))).toBe(picked);
  });
  it('validates ISO dates including leap years', () => {
    expect(isValidISODate('2024-02-29')).toBe(true);
    expect(isValidISODate('2023-02-29')).toBe(false);
    expect(isValidISODate('2026-13-01')).toBe(false);
    expect(isValidISODate('2026-04-31')).toBe(false);
    expect(isValidISODate('26-04-01')).toBe(false);
    expect(isValidISODate(20260401)).toBe(false);
  });
  it('month helpers', () => {
    expect(daysInMonth(2026, 1)).toBe(28);
    expect(daysInMonth(2024, 1)).toBe(29);
    expect(monthRange(2026, 10)).toEqual({ min: '2026-11-01', max: '2026-11-30' });
    expect(minISO('2026-11-30', '2026-11-20')).toBe('2026-11-20');
  });
});
