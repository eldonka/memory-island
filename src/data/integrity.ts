// Pure data-integrity helpers (no IndexedDB here, so they are unit-testable).
import type { Memory } from './types';

export class DateConflictError extends Error {
  readonly other: Pick<Memory, 'id' | 'date' | 'title'>;
  constructor(other: Pick<Memory, 'id' | 'date' | 'title'>) {
    super(`A memory already exists on ${other.date}`);
    this.name = 'DateConflictError';
    this.other = other;
  }
}

/** Another memory (different id) that already occupies the same calendar day, or null. */
export function findDateConflict<T extends Pick<Memory, 'id' | 'date'>>(list: T[], m: Pick<Memory, 'id' | 'date'>): T | null {
  return list.find((x) => x.date === m.date && x.id !== m.id) ?? null;
}

/** Every blob id a set of memories still points to (photos + uploaded audio). */
export function referencedBlobIds(memories: Pick<Memory, 'photos' | 'music'>[]): Set<string> {
  const ids = new Set<string>();
  for (const m of memories) {
    for (const p of m.photos || []) if (p?.id) ids.add(p.id);
    if (m.music?.fileId) ids.add(m.music.fileId);
  }
  return ids;
}

/** Blob keys that no saved memory references any more. */
export function orphanKeys(allKeys: string[], memories: Pick<Memory, 'photos' | 'music'>[]): string[] {
  const ref = referencedBlobIds(memories);
  return allKeys.filter((k) => !ref.has(k));
}
