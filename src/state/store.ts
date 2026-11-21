// ============================================================
// App state (zustand): profile, memories, friends, navigation, toasts.
// ============================================================
import { create } from 'zustand';
import type { FriendPlanet, Lang, Memory, PlanetTheme, Profile } from '../data/types';
import * as db from '../data/db';
import { NEUTRAL_VISUAL } from '../analysis/dna';
import { STRINGS, type Strings } from '../i18n/strings';

export type Screen = 'welcome' | 'years' | 'months' | 'garden' | 'memory' | 'create' | 'friends' | 'archive';
export type Transition = 'fade' | 'zoom-in' | 'zoom-out';

export interface Nav {
  screen: Screen;
  year: number;
  month: number;          // 0..11
  memoryId: string | null;
  editId: string | null;  // editing an existing memory
  newDate: string | null; // preselected date for a new memory
}

const today = new Date();
const initialNav: Nav = { screen: 'welcome', year: today.getFullYear(), month: today.getMonth(), memoryId: null, editId: null, newDate: null };

interface State {
  ready: boolean;
  profile: Profile | null;
  memories: Memory[];
  friends: FriendPlanet[];
  visiting: FriendPlanet | null;
  nav: Nav;
  stack: Nav[];
  transition: Transition;
  warpAt: number;        // timestamp of the last zoom transition (sky warp effect)
  warpDir: 1 | -1;
  toast: string | null;
  growingId: string | null;
  t: Strings;
  lang: Lang;

  init: () => Promise<void>;
  setProfile: (p: Profile) => Promise<void>;
  setLang: (l: Lang) => void;
  setTheme: (t: PlanetTheme) => void;
  setMotion: (reduced: boolean) => void;
  go: (patch: Partial<Nav>, transition?: Transition, replace?: boolean) => void;
  back: () => void;
  popNav: () => void;
  upsertMemory: (m: Memory) => Promise<void>;
  commitMemory: (m: Memory, newBlobs: Iterable<[string, Blob]>, removedBlobIds: string[]) => Promise<void>;
  removeMemory: (m: Memory) => Promise<void>;
  setMemories: (ms: Memory[]) => void;
  setToast: (s: string | null) => void;
  setGrowing: (id: string | null) => void;
  addFriend: (f: FriendPlanet) => Promise<void>;
  removeFriend: (id: string) => Promise<void>;
  setVisiting: (f: FriendPlanet | null) => void;
  wipe: () => Promise<void>;
}

function applyDom(profile: Profile | null) {
  const root = document.documentElement;
  root.setAttribute('data-theme', profile?.theme || 'rose');
  root.setAttribute('data-motion', profile?.reducedMotion ? 'reduced' : 'full');
  root.setAttribute('lang', profile?.lang || 'ru');
}

let toastTimer: number | undefined;

export const useStore = create<State>((setState, getState) => ({
  ready: false,
  profile: null,
  memories: [],
  friends: [],
  visiting: null,
  nav: initialNav,
  stack: [],
  transition: 'fade',
  warpAt: 0,
  warpDir: 1,
  toast: null,
  growingId: null,
  t: STRINGS.ru,
  lang: 'ru',

  init: async () => {
    const [profile, memories, friends] = await Promise.all([db.loadProfile(), db.loadMemories(), db.loadFriends()]);
    applyDom(profile ?? null);
    const lang = profile?.lang || 'ru';
    setState({ ready: true, profile: profile ?? null, memories, friends, lang, t: STRINGS[lang] });
    // startup housekeeping: drop blobs no memory references (cancelled drafts, replaced audio)
    db.sweepOrphanBlobs(memories).then((n) => { if (n) console.info(`[memory-island] removed ${n} orphan blob(s)`); }).catch(() => {});
  },

  setProfile: async (p) => {
    await db.saveProfile(p);
    applyDom(p);
    setState({ profile: p, lang: p.lang, t: STRINGS[p.lang] });
  },
  setLang: (l) => {
    const p = getState().profile;
    if (p) { void getState().setProfile({ ...p, lang: l }); } else { setState({ lang: l, t: STRINGS[l] }); document.documentElement.setAttribute('lang', l); }
  },
  setTheme: (theme) => {
    const p = getState().profile;
    if (p) void getState().setProfile({ ...p, theme }); else document.documentElement.setAttribute('data-theme', theme);
  },
  setMotion: (reduced) => {
    const p = getState().profile;
    if (p) void getState().setProfile({ ...p, reducedMotion: reduced });
  },

  go: (patch, transition = 'fade', replace = false) => {
    const { nav, stack } = getState();
    const next: Nav = { ...nav, ...patch };
    if (replace) window.history.replaceState({ mi: true }, ''); else window.history.pushState({ mi: true }, '');
    setState({
      nav: next, stack: replace ? stack : [...stack, nav], transition,
      ...(transition !== 'fade' ? { warpAt: performance.now(), warpDir: transition === 'zoom-in' ? 1 : -1 } : {}),
    });
  },
  back: () => {
    if (getState().stack.length === 0) return;
    window.history.back();
  },
  popNav: () => {
    const { stack } = getState();
    if (!stack.length) return;
    const prev = stack[stack.length - 1];
    setState({ nav: prev, stack: stack.slice(0, -1), transition: 'zoom-out', warpAt: performance.now(), warpDir: -1 });
  },

  upsertMemory: async (m) => {
    await db.saveMemory(m); // atomic: throws DateConflictError, writes nothing, if another memory owns that day
    const list = getState().memories.filter((x) => x.id !== m.id).concat(m).sort((a, b) => a.date.localeCompare(b.date));
    setState({ memories: list });
  },
  commitMemory: async (m, newBlobs, removedBlobIds) => {
    await db.commitMemory(m, newBlobs, removedBlobIds); // assets + record together; rolls the assets back if the record is refused
    const list = getState().memories.filter((x) => x.id !== m.id).concat(m).sort((a, b) => a.date.localeCompare(b.date));
    setState({ memories: list });
  },
  removeMemory: async (m) => {
    await db.deleteMemory(m);
    setState({ memories: getState().memories.filter((x) => x.id !== m.id) });
  },
  setMemories: (ms) => setState({ memories: [...ms].sort((a, b) => a.date.localeCompare(b.date)) }),

  setToast: (s) => {
    setState({ toast: s });
    if (toastTimer) window.clearTimeout(toastTimer);
    if (s) toastTimer = window.setTimeout(() => setState({ toast: null }), 3800);
  },
  setGrowing: (id) => setState({ growingId: id }),

  addFriend: async (f) => { await db.saveFriend(f); setState({ friends: [f, ...getState().friends.filter((x) => x.id !== f.id)] }); },
  removeFriend: async (id) => { await db.deleteFriend(id); setState({ friends: getState().friends.filter((x) => x.id !== id), visiting: getState().visiting?.id === id ? null : getState().visiting }); },
  setVisiting: (f) => setState({ visiting: f }),

  wipe: async () => {
    await db.wipeAll();
    applyDom(null);
    setState({ profile: null, memories: [], friends: [], visiting: null, nav: initialNav, stack: [], growingId: null });
  },
}));

// browser back button → pop our stack
window.addEventListener('popstate', () => { useStore.getState().popNav(); });

/** memories visible on the current planet (own or a friend's) */
export function useVisibleMemories(): { memories: MemoryLike[]; readOnly: boolean } {
  const visiting = useStore((s) => s.visiting);
  const own = useStore((s) => s.memories);
  if (visiting) {
    return {
      readOnly: true,
      memories: visiting.memories.map((sm) => ({
        // garden-only days arrive without DNA scores: a neutral profile keeps the UI typed and reveals nothing
        id: sm.id, date: sm.date, title: sm.title ?? '', plant: sm.plant, visual: sm.visual ?? NEUTRAL_VISUAL, privacy: sm.privacy, shared: sm,
      })),
    };
  }
  return { readOnly: false, memories: own.map((m) => ({ id: m.id, date: m.date, title: m.title, plant: m.plant, visual: m.visual, privacy: m.privacy, own: m })) };
}

export interface MemoryLike {
  id: string; date: string; title: string;
  plant: Memory['plant']; visual: Memory['visual']; privacy: Memory['privacy'];
  own?: Memory; shared?: FriendPlanet['memories'][number];
}
