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

/**
 * The day a new memory should start on: the latest day of the window that has no
 * memory yet (a day already taken would reopen the existing memory for editing).
 * Falls back to the window's default when every day is taken.
 */
export function freeCreationDate(win: CreationWindow, taken: Iterable<string>): string {
  const used = new Set(taken);
  const [y, m, d] = win.defaultDate.split('-').map(Number);
  const first = Number(win.min.slice(8, 10));
  for (let day = d; day >= first; day--) {
    const iso = `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    if (!used.has(iso)) return iso;
  }
  return win.defaultDate;
}

/** A calendar day can be planted when it is not in the future. */
export const isPlantableDate = (iso: string, today: string = todayISO()) => iso <= today;
