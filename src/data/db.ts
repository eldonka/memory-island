// ============================================================
// Persistence — IndexedDB via idb-keyval. Three small databases:
//   memories (JSON records), blobs (original photos & audio), meta (profile, friends)
// Nothing here ever regenerates a plant: what is saved is what grows back.
// ============================================================
import { createStore, get, set, del, values, keys, clear } from 'idb-keyval';
import type { FriendPlanet, Memory, Profile } from './types';
import { DateConflictError, findDateConflict, orphanKeys } from './integrity';

export { DateConflictError, findDateConflict } from './integrity';

const memStore = createStore('memory-island-memories', 'memories');
const blobStore = createStore('memory-island-blobs', 'blobs');
const metaStore = createStore('memory-island-meta', 'meta');

export async function loadMemories(): Promise<Memory[]> {
  const all = (await values<Memory>(memStore)) || [];
  return all.filter((m) => m && m.id).sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Atomic upsert: inside ONE readwrite transaction we verify that no other memory
 * occupies the same calendar day, then put. If a conflict exists nothing is written
 * and a DateConflictError is thrown — another day's memory can never be overwritten.
 */
export function saveMemory(m: Memory): Promise<void> {
  return memStore('readwrite', (st) => new Promise<void>((resolve, reject) => {
    const all = st.getAll();
    all.onerror = () => reject(all.error);
    all.onsuccess = () => {
      try {
        const dup = findDateConflict((all.result || []) as Memory[], m);
        if (dup) { reject(new DateConflictError(dup)); return; }
        const put = st.put(m, m.id);   // throws synchronously (DataCloneError) for values IndexedDB cannot store
        put.onerror = () => reject(put.error);
        put.onsuccess = () => resolve();
      } catch (e) {
        try { st.transaction.abort(); } catch { /* already finished */ }
        reject(e);
      }
    };
  }));
}

/**
 * Save a memory together with its new assets, as one logical unit:
 *   1) new blobs (photos, uploaded audio) are written first;
 *   2) the record is saved atomically (refused on a date conflict → nothing overwritten);
 *   3) only after a successful save are the blobs this edit replaced deleted.
 * If step 2 fails for any reason, every blob written in step 1 is removed again, so a
 * failed save leaves neither a half-written memory nor orphan assets behind.
 */
export async function commitMemory(m: Memory, newBlobs: Iterable<[string, Blob]> = [], removedBlobIds: string[] = []): Promise<void> {
  const written: string[] = [];
  try {
    for (const [id, blob] of newBlobs) { await set(id, blob, blobStore); written.push(id); }
    await saveMemory(m);
  } catch (e) {
    for (const id of written) await del(id, blobStore).catch(() => {});
    throw e;
  }
  for (const id of removedBlobIds) if (id !== m.music.fileId && !m.photos.some((p) => p.id === id)) await del(id, blobStore).catch(() => {});
}

export async function deleteMemory(m: Memory) {
  await del(m.id, memStore);
  for (const p of m.photos) await del(p.id, blobStore).catch(() => {});
  if (m.music.fileId) await del(m.music.fileId, blobStore).catch(() => {});
}

export const putBlob = (id: string, blob: Blob) => set(id, blob, blobStore);
export const getBlob = (id: string) => get<Blob>(id, blobStore);
export const delBlob = (id: string) => del(id, blobStore);
export const listBlobKeys = async () => (await keys<string>(blobStore)).filter((k): k is string => typeof k === 'string');

/** Remove blobs no saved memory references (leftovers of cancelled or replaced uploads). Call only at startup. */
export async function sweepOrphanBlobs(memories: Memory[]): Promise<number> {
  const ks = (await keys<string>(blobStore)).filter((k): k is string => typeof k === 'string');
  const orphans = orphanKeys(ks, memories);
  for (const k of orphans) await del(k, blobStore).catch(() => {});
  return orphans.length;
}

export const loadProfile = () => get<Profile>('profile', metaStore);
export const saveProfile = (p: Profile) => set('profile', p, metaStore);

export async function loadFriends(): Promise<FriendPlanet[]> {
  const ks = await keys<string>(metaStore);
  const out: FriendPlanet[] = [];
  for (const k of ks) if (typeof k === 'string' && k.startsWith('friend:')) { const f = await get<FriendPlanet>(k, metaStore); if (f) out.push(f); }
  return out.sort((a, b) => b.importedAt.localeCompare(a.importedAt));
}
export const saveFriend = (f: FriendPlanet) => set(`friend:${f.id}`, f, metaStore);
export const deleteFriend = (id: string) => del(`friend:${id}`, metaStore);

export async function wipeAll() {
  await clear(memStore); await clear(blobStore); await clear(metaStore);
}

/** Object URL cache for blobs (photos / audio) */
const urlCache = new Map<string, string>();
export async function blobUrl(id: string): Promise<string | null> {
  if (urlCache.has(id)) return urlCache.get(id)!;
  const b = await getBlob(id);
  if (!b) return null;
  const u = URL.createObjectURL(b);
  urlCache.set(id, u);
  return u;
}
