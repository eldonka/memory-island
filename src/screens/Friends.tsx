import React, { useRef } from 'react';
import { useStore } from '../state/store';
import { TopBar } from '../components/TopBar';
import { Planet } from '../scenes/Planet';
import { IcoDownload, IcoUpload, IcoPlanet, IcoTrash } from '../components/Icons';
import type { FriendPlanet } from '../data/types';
import { downloadBlob, safeName } from '../data/exportDay';
import { validatePlanetFile, buildPlanetFile, LIMITS } from '../data/planetFile';

export function Friends() {
  const store = useStore();
  const { t, back, go, friends, addFriend, removeFriend, setVisiting, setToast } = store;
  const fileRef = useRef<HTMLInputElement>(null);

  const exportPlanet = () => {
    // privacy is enforced in buildPlanetFile (src/data/planetFile.ts): private days stay home,
    // garden-only days travel as a plant without their DNA scores, story, photos or song
    const s = useStore.getState();
    const f = buildPlanetFile(s.profile, s.memories);
    if (!f) return;
    if (!f.memories.length) { setToast(t.nothingToExport); return; }
    downloadBlob(new Blob([JSON.stringify(f)], { type: 'application/json' }), `${safeName(f.planetName)}.island.json`);
    setToast(t.exportedOk(f.memories.length));
  };
  const importPlanet = async (file: File) => {
    if (file.size > LIMITS.fileBytes) { setToast(t.importTooBig); return; }
    let raw: unknown;
    try { raw = JSON.parse(await file.text()); } catch { setToast(t.importFail); return; }
    const res = validatePlanetFile(raw, file.size);
    if (!res.ok) {
      const msg = { too_big: t.importTooBig, bad_format: t.importBadFormat, bad_version: t.importBadVersion, too_many: t.importTooMany, empty: t.importEmpty }[res.error];
      setToast(msg || t.importFail); return;
    }
    try {
      await addFriend(res.planet);
      setToast(res.skipped ? `${t.importedOk} ${t.importBadMemories(res.skipped)}` : t.importedOk);
    } catch (e) { console.warn(e); setToast(t.importFail); }
  };
  const visit = (f: FriendPlanet) => { setVisiting(f); go({ screen: 'years', year: new Date().getFullYear(), memoryId: null }, 'zoom-in'); };

  return (
    <div className="screen">
      <TopBar crumbs={[t.friendsTitle]} onBack={back} backLabel={t.back} />
      <div className="list-body scroll">
        <div className="list-wrap">
          <div className="panel panel-parchment fade-up">
            <h2>{t.friendsTitle}</h2>
            <p className="muted" style={{ marginTop: 8 }}>{t.friendsIntro}</p>
            <div className="row" style={{ marginTop: 14 }}>
              <button className="btn btn-primary" onClick={exportPlanet}><IcoDownload /> {t.exportPlanet}</button>
              <button className="btn" onClick={() => fileRef.current?.click()}><IcoUpload /> {t.importPlanet}</button>
              <input ref={fileRef} type="file" accept=".json,application/json" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) importPlanet(f); e.target.value = ''; }} />
            </div>
          </div>
          {friends.length === 0 && <p className="muted center fade-up d2">{t.noFriends}</p>}
          {friends.map((f, i) => (
            <div key={f.id} className={`panel friend-card fade-up d${Math.min(5, i + 1)}`}>
              <div className="pl"><Planet theme={f.theme} size={72} /></div>
              <div className="col" style={{ flex: 1, gap: 4 }}>
                <h3>{f.planetName}</h3>
                <span className="small muted">{t.memoriesCount(f.memories.length)} · {f.code}</span>
              </div>
              <button className="btn btn-sm" onClick={() => visit(f)}><IcoPlanet /> {t.visit}</button>
              <button className="btn btn-sm btn-ghost btn-danger btn-icon" onClick={() => removeFriend(f.id)} aria-label={t.remove}><IcoTrash /></button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
