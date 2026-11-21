// IndexedDB integration tests — real transactions against fake-indexeddb (an in-process
// implementation of the IndexedDB spec, including structured cloning of Blobs and
// DataCloneError for values that cannot be stored). Nothing here is mocked at the db layer.
import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as db from './db';
import { DateConflictError } from './integrity';
import { generatePlant } from '../plant/generate';
import { EMPTY_MUSIC_FEATURES } from '../analysis/music';
import type { Memory, VisualParameters } from './types';

const VISUAL: VisualParameters = { warmth: 0.6, energy: 0.4, calmness: 0.6, nostalgia: 0.3, tension: 0.2, joy: 0.5, sadness: 0.2, wonder: 0.3, complexity: 0.4, night: 0.3, social: 0.4, relief: 0.1, dominant_colors: ['#e0a070', '#7090c0'] };

function mem(id: string, date: string, extra: Partial<Memory> = {}): Memory {
  const { plant, reasons } = generatePlant(VISUAL, EMPTY_MUSIC_FEATURES, 1234);
  return {
    id, date, createdAt: '2026-11-01T09:00:00Z', updatedAt: '2026-11-01T09:00:00Z',
    title: `Day ${id}`, titleAuto: `Day ${id}`, story: `Story of ${id}`, quote: 'quote', lang: 'ru',
    photos: [], music: { kind: 'none' },
    analysis: { text: { warmth: 0, cold: 0, joy: 0, sadness: 0, calm: 0, tension: 0, energy: 0, nostalgia: 0, wonder: 0, social: 0, nature: 0, night: 0, morning: 0, relief: 0, work: 0, city: 0, season: null, intensity: 0, complexity: 0, wordCount: 3, lang: 'ru', keywords: [], matched: {} }, photos: { count: 0, brightness: 0.5, contrast: 0.3, saturation: 0.4, warmth: 0.5, hueVariety: 0.3, dominant: [], atmosphere: 'muted' }, music: EMPTY_MUSIC_FEATURES },
    visual: VISUAL, plant, reasons, userAdjusted: false, privacy: 'private', version: 1, ...extra,
  };
}
const blob = (s: string) => new Blob([s], { type: 'text/plain' });
const photo = (id: string) => ({ id, name: `${id}.jpg`, width: 10, height: 10, thumb: 'data:image/jpeg;base64,AAAA' });
const blobKeys = async () => (await db.listBlobKeys()).sort();

beforeEach(async () => { await db.wipeAll(); });

describe('IndexedDB: creating memories', () => {
  it('creates a new memory and reads it back from the database', async () => {
    const m = mem('a', '2026-11-05');
    await db.saveMemory(m);
    const all = await db.loadMemories();
    expect(all).toHaveLength(1);
    expect(all[0]).toEqual(m);
  });

  it('refuses a second memory on the same date and writes nothing', async () => {
    const a = mem('a', '2026-11-05');
    await db.saveMemory(a);
    const b = mem('b', '2026-11-05', { title: 'intruder' });
    await expect(db.saveMemory(b)).rejects.toBeInstanceOf(DateConflictError);
    const all = await db.loadMemories();
    expect(all).toHaveLength(1);
    expect(all[0]).toEqual(a);                 // the original is byte-for-byte intact
    expect(all[0].title).not.toBe('intruder');
  });

  it('many memories on different days all persist, sorted by date', async () => {
    for (const d of ['2026-11-09', '2026-11-03', '2026-11-07']) await db.saveMemory(mem(`m${d}`, d));
    expect((await db.loadMemories()).map((m) => m.date)).toEqual(['2026-11-03', '2026-11-07', '2026-11-09']);
  });
});

describe('IndexedDB: editing memories', () => {
  it('edits a memory in place without losing the original fields', async () => {
    const a = mem('a', '2026-11-05', { photos: [photo('a_p0')], music: { kind: 'file', fileId: 'a_audio', fileName: 's.wav' } });
    await db.saveMemory(a);
    const edited: Memory = { ...a, title: 'New title', story: 'New story', updatedAt: '2026-11-21T10:00:00Z' };
    await db.saveMemory(edited);
    const all = await db.loadMemories();
    expect(all).toHaveLength(1);
    expect(all[0].title).toBe('New title');
    expect(all[0].story).toBe('New story');
    expect(all[0].createdAt).toBe(a.createdAt);
    expect(all[0].photos).toEqual(a.photos);
    expect(all[0].music).toEqual(a.music);
    expect(all[0].plant).toEqual(a.plant);
    expect(all[0].id).toBe('a');
  });

  it('moving an edited memory onto an occupied date is refused and both records stay intact', async () => {
    const a = mem('a', '2026-11-05'), b = mem('b', '2026-11-06');
    await db.saveMemory(a); await db.saveMemory(b);
    await expect(db.saveMemory({ ...b, date: '2026-11-05', title: 'moved' })).rejects.toBeInstanceOf(DateConflictError);
    const all = await db.loadMemories();
    expect(all).toEqual([a, b]);
  });

  it('moving an edited memory onto a free date works and keeps its own day free afterwards', async () => {
    const a = mem('a', '2026-11-05');
    await db.saveMemory(a);
    await db.saveMemory({ ...a, date: '2026-11-07' });
    await db.saveMemory(mem('c', '2026-11-05'));   // the old day is free again
    expect((await db.loadMemories()).map((m) => `${m.id}:${m.date}`)).toEqual(['c:2026-11-05', 'a:2026-11-07']);
  });
});

describe('IndexedDB: rollback and consistency after failures', () => {
  it('a record that cannot be cloned is rejected by the transaction and nothing is written', async () => {
    const bad = { ...mem('bad', '2026-11-05'), evil: () => 1 } as unknown as Memory;
    await expect(db.saveMemory(bad)).rejects.toBeTruthy();
    expect(await db.loadMemories()).toEqual([]);
  });

  it('commitMemory rolls back freshly written blobs when the record is refused (date conflict)', async () => {
    await db.saveMemory(mem('a', '2026-11-05'));
    const before = await blobKeys();
    const dup = mem('dup', '2026-11-05', { photos: [photo('dup_p0'), photo('dup_p1')], music: { kind: 'file', fileId: 'dup_audio', fileName: 'x.wav' } });
    await expect(db.commitMemory(dup, [['dup_p0', blob('p0')], ['dup_p1', blob('p1')], ['dup_audio', blob('audio')]], [])).rejects.toBeInstanceOf(DateConflictError);
    expect(await blobKeys()).toEqual(before);                  // no orphan assets survive
    expect((await db.loadMemories()).map((m) => m.id)).toEqual(['a']);
  });

  it('commitMemory does not delete replaced media when the save fails', async () => {
    const a = mem('a', '2026-11-05', { photos: [photo('a_p0')] });
    await db.putBlob('a_p0', blob('original'));
    await db.saveMemory(a);
    await db.saveMemory(mem('b', '2026-11-06'));
    // edit a: replace photo a_p0 by a_p1 AND move onto b's day → must fail, and a_p0 must still exist
    const edited: Memory = { ...a, date: '2026-11-06', photos: [photo('a_p1')] };
    await expect(db.commitMemory(edited, [['a_p1', blob('new')]], ['a_p0'])).rejects.toBeInstanceOf(DateConflictError);
    expect(await blobKeys()).toEqual(['a_p0']);
    expect(await (await db.getBlob('a_p0'))!.text()).toBe('original');
    expect((await db.loadMemories()).find((m) => m.id === 'a')).toEqual(a);
  });

  it('database stays consistent across a sequence of failed operations', async () => {
    const a = mem('a', '2026-11-05', { photos: [photo('a_p0')] });
    await db.commitMemory(a, [['a_p0', blob('x')]], []);
    const memsBefore = await db.loadMemories(); const blobsBefore = await blobKeys();
    for (let i = 0; i < 5; i++) {
      await expect(db.commitMemory(mem(`x${i}`, '2026-11-05', { photos: [photo(`x${i}_p`)] }), [[`x${i}_p`, blob('t')]], [])).rejects.toBeInstanceOf(DateConflictError);
      await expect(db.saveMemory({ ...mem(`y${i}`, '2026-11-05'), evil: () => 0 } as unknown as Memory)).rejects.toBeTruthy();
    }
    expect(await db.loadMemories()).toEqual(memsBefore);
    expect(await blobKeys()).toEqual(blobsBefore);
  });
});

describe('IndexedDB: persistence across a page reload', () => {
  it('memories, blobs, profile and friends survive a fresh module instance (simulated reload)', async () => {
    const a = mem('a', '2026-11-05', { photos: [photo('a_p0')], music: { kind: 'file', fileId: 'a_audio', fileName: 's.wav' } });
    await db.commitMemory(a, [['a_p0', blob('photo-bytes')], ['a_audio', blob('audio-bytes')]], []);
    await db.saveProfile({ planetName: 'P', theme: 'mint', lang: 'en', reducedMotion: false, createdAt: 'x', code: 'CODE', seeded: false });
    await db.saveFriend({ id: 'f1', planetName: 'F', theme: 'rose', code: 'f1', importedAt: '2026-11-21T00:00:00Z', exportedAt: '', memories: [{ id: 'fm', date: '2026-01-01', privacy: 'garden', plant: a.plant }] });

    vi.resetModules();                                   // drop every in-memory cache; the IndexedDB data stays
    const fresh = await import('./db');
    const mems = await fresh.loadMemories();
    expect(mems).toEqual([a]);
    expect(await (await fresh.getBlob('a_p0'))!.text()).toBe('photo-bytes');
    expect(await (await fresh.getBlob('a_audio'))!.text()).toBe('audio-bytes');
    expect((await fresh.loadProfile())?.planetName).toBe('P');
    expect((await fresh.loadFriends()).map((f) => f.id)).toEqual(['f1']);
    expect((await fresh.loadFriends())[0].memories[0].plant).toEqual(a.plant);   // a friend's flower reloads unchanged
  });
});

describe('IndexedDB: blobs — temporary assets, cleanup and preservation', () => {
  it('stores and returns image/audio blobs unchanged', async () => {
    const img = new Blob([new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])], { type: 'image/png' });
    await db.putBlob('img', img);
    const back = (await db.getBlob('img'))!;
    expect(back.type).toBe('image/png');
    expect(new Uint8Array(await back.arrayBuffer())).toEqual(new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]));
  });

  it('sweepOrphanBlobs removes only blobs no memory references (cancelled drafts, replaced audio)', async () => {
    const a = mem('a', '2026-11-05', { photos: [photo('a_p0'), photo('a_p1')], music: { kind: 'file', fileId: 'a_audio', fileName: 's.wav' } });
    await db.commitMemory(a, [['a_p0', blob('1')], ['a_p1', blob('2')], ['a_audio', blob('3')]], []);
    await db.putBlob('draft_p0', blob('cancelled upload'));
    await db.putBlob('old_audio', blob('replaced earlier'));
    const removed = await db.sweepOrphanBlobs(await db.loadMemories());
    expect(removed).toBe(2);
    expect(await blobKeys()).toEqual(['a_audio', 'a_p0', 'a_p1']);
  });

  it('editing keeps previously saved media and removes only what the edit replaced — after a successful save', async () => {
    const a = mem('a', '2026-11-05', { photos: [photo('a_p0'), photo('a_p1')], music: { kind: 'file', fileId: 'a_audio', fileName: 's.wav' } });
    await db.commitMemory(a, [['a_p0', blob('1')], ['a_p1', blob('2')], ['a_audio', blob('3')]], []);
    // replace p1 by p2, keep p0, replace the audio file
    const edited: Memory = { ...a, photos: [photo('a_p0'), photo('a_p2')], music: { kind: 'file', fileId: 'a_audio2', fileName: 'n.wav' } };
    await db.commitMemory(edited, [['a_p2', blob('4')], ['a_audio2', blob('5')]], ['a_p1', 'a_audio']);
    expect(await blobKeys()).toEqual(['a_audio2', 'a_p0', 'a_p2']);
    expect(await (await db.getBlob('a_p0'))!.text()).toBe('1');            // untouched original
    expect((await db.loadMemories())[0].photos.map((p) => p.id)).toEqual(['a_p0', 'a_p2']);
  });

  it('never deletes a blob the saved record still references, even if listed as removed', async () => {
    const a = mem('a', '2026-11-05', { photos: [photo('a_p0')] });
    await db.commitMemory(a, [['a_p0', blob('keep me')]], []);
    await db.commitMemory({ ...a, title: 't2' }, [], ['a_p0']);   // a stale "removed" list must not win over the record
    expect(await blobKeys()).toEqual(['a_p0']);
  });

  it('deleting a memory removes its blobs and leaves other memories’ media alone', async () => {
    const a = mem('a', '2026-11-05', { photos: [photo('a_p0')], music: { kind: 'file', fileId: 'a_audio', fileName: 's.wav' } });
    const b = mem('b', '2026-11-06', { photos: [photo('b_p0')] });
    await db.commitMemory(a, [['a_p0', blob('1')], ['a_audio', blob('2')]], []);
    await db.commitMemory(b, [['b_p0', blob('3')]], []);
    await db.deleteMemory(a);
    expect((await db.loadMemories()).map((m) => m.id)).toEqual(['b']);
    expect(await blobKeys()).toEqual(['b_p0']);
  });
});
