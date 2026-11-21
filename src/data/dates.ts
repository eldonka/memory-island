// Calendar-date helpers. A memory belongs to a LOCAL calendar day, so we never
// go through toISOString() (which is UTC and shifts dates in the evening/morning).

export function localISODate(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export const todayISO = () => localISODate(new Date());

export function isValidISODate(s: unknown): s is string {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [y, m, d] = s.split('-').map(Number);
  if (m < 1 || m > 12 || d < 1) return false;
  return d <= daysInMonth(y, m - 1);
}

/** month is 0-based */
export function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

export function monthRange(year: number, month: number): { min: string; max: string } {
  const mm = String(month + 1).padStart(2, '0');
  return { min: `${year}-${mm}-01`, max: `${year}-${mm}-${String(daysInMonth(year, month)).padStart(2, '0')}` };
}

export function parseISODate(s: string): { year: number; month: number; day: number } {
  const [y, m, d] = s.split('-').map(Number);
  return { year: y, month: m - 1, day: d };
}

/** the later of two ISO dates is simply the larger string */
export const minISO = (a: string, b: string) => (a < b ? a : b);
