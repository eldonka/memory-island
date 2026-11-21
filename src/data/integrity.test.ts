import { describe, it, expect } from 'vitest';
import { findDateConflict, orphanKeys, referencedBlobIds, DateConflictError } from './integrity';

const mem = (id: string, date: string, photos: string[] = [], fileId?: string) => ({
  id, date, title: id, photos: photos.map((p) => ({ id: p, name: p, width: 1, height: 1, thumb: '' })), music: { kind: fileId ? 'file' as const : 'none' as const, fileId },
});

describe('date conflicts', () => {
  const list = [mem('a', '2026-11-14'), mem('b', '2026-11-18')];
  it('finds another memory on the same day', () => {
    expect(findDateConflict(list, { id: 'new', date: '2026-11-18' })?.id).toBe('b');
  });
  it('ignores the memory itself (editing keeps its own day)', () => {
    expect(findDateConflict(list, { id: 'b', date: '2026-11-18' })).toBeNull();
  });
  it('moving an edited memory onto another occupied day is a conflict', () => {
    expect(findDateConflict(list, { id: 'a', date: '2026-11-18' })?.id).toBe('b');
  });
  it('free days are not conflicts', () => {
    expect(findDateConflict(list, { id: 'a', date: '2026-11-15' })).toBeNull();
  });
  it('DateConflictError carries the other memory', () => {
    const e = new DateConflictError(list[1]);
    expect(e.name).toBe('DateConflictError');
    expect(e.other.date).toBe('2026-11-18');
  });
});

describe('orphan blobs', () => {
  const memories = [mem('a', '2026-11-14', ['p1', 'p2'], 'a1'), mem('b', '2026-11-18', ['p3'])];
  it('collects every referenced photo and audio id', () => {
    expect([...referencedBlobIds(memories)].sort()).toEqual(['a1', 'p1', 'p2', 'p3']);
  });
  it('reports only unreferenced keys as orphans', () => {
    expect(orphanKeys(['p1', 'p2', 'p3', 'a1', 'a_old', 'p_cancelled'], memories).sort()).toEqual(['a_old', 'p_cancelled']);
  });
  it('never flags assets belonging to another memory', () => {
    expect(orphanKeys(['p3'], memories)).toEqual([]);
  });
});
