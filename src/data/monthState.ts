// ============================================================
// Month status relative to today — pure helpers for Months / Garden.
// A future month can be explored but nothing can be planted there yet,
// and the user is never redirected to a date outside the month they opened.
// ============================================================
import { monthRange, minISO, todayISO } from './dates';

export type MonthStatus = 'past' | 'current' | 'future';

export function monthStatus(year: number, month: number, today: string = todayISO()): MonthStatus {
  const key = `${year}-${String(month + 1).padStart(2, '0')}`;
  const cur = today.slice(0, 7);
  return key === cur ? 'current' : key < cur ? 'past' : 'future';
}

export interface CreationWindow { min: string; max: string; defaultDate: string }

/**
 * Dates a new memory may take inside the given month, or null when the month
 * has not started yet. `max` and `defaultDate` never exceed today and always
 * stay inside the month: a past month defaults to its last day, the current
 * month to today.
 */
export function creationWindow(year: number, month: number, today: string = todayISO()): CreationWindow | null {
  if (monthStatus(year, month, today) === 'future') return null;
  const { min, max } = monthRange(year, month);
  const cappedMax = minISO(max, today);
  return { min, max: cappedMax, defaultDate: cappedMax };
}

/** A calendar day can be planted when it is not in the future. */
export const isPlantableDate = (iso: string, today: string = todayISO()) => iso <= today;
