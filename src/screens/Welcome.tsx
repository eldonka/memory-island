import React, { useState } from 'react';
import { useStore } from '../state/store';
import { Planet } from '../scenes/Planet';
import { Modal } from '../components/TopBar';
import { IcoArchive, IcoFriends, IcoSettings, IcoPlanet, IcoSparkle } from '../components/Icons';
import type { PlanetTheme } from '../data/types';
import { seedDemo } from '../data/seed';
import { DateConflictError } from '../data/db';

const THEMES: PlanetTheme[] = ['rose', 'lavender', 'mint', 'gold'];

export function Welcome() {
  const { profile, t, go, setProfile, memories, lang, setLang, setMotion, setTheme, setToast, wipe, upsertMemory, setVisiting } = useStore();
  const [name, setName] = useState('');
  const [theme, setThemeLocal] = useState<PlanetTheme>('rose');
  const [leaving, setLeaving] = useState(false);
  const [settings, setSettings] = useState(false);
  const [busy, setBusy] = useState(false);

  const enter = async () => {
    if (!profile) {
      const p = {
        planetName: name.trim() || (lang === 'ru' ? 'Моя планета' : 'My Planet'),
        theme, lang, reducedMotion: false, createdAt: new Date().toISOString(),
        code: Math.random().toString(36).slice(2, 8).toUpperCase(), seeded: false,
      };
      await setProfile(p);
    }
    setVisiting(null);
    setLeaving(true);
    window.setTimeout(() => go({ screen: 'years', year: new Date().getFullYear() }, 'zoom-in'), 750);
  };

  const loadDemo = async () => {
    setBusy(true);
    try {
      const list = await seedDemo(lang);
      let skipped = 0;
      for (const m of list) {
        try { await upsertMemory(m); } catch (e) { if (e instanceof DateConflictError) skipped++; else throw e; }
      }
      if (profile) await setProfile({ ...profile, seeded: true });
      setToast(skipped ? `${t.demoLoaded} (${list.length - skipped}/${list.length})` : t.demoLoaded);
      setSettings(false);
    } catch (e) { console.error(e); setToast(String(e)); }
    setBusy(false);
  };

  const curTheme = profile?.theme || theme;
  const LangSwitch = (
    <div className="tabs lang-switch" role="group" aria-label={t.languageSwitch}>
      <button className={lang === 'ru' ? 'on' : ''} onClick={() => setLang('ru')} aria-pressed={lang === 'ru'}>RU</button>
      <button className={lang === 'en' ? 'on' : ''} onClick={() => setLang('en')} aria-pressed={lang === 'en'}>EN</button>
    </div>
  );

  return (
    <div className="screen welcome">
      <header className="welcome-top">
        {LangSwitch}
        {profile && <button className="btn btn-icon btn-ghost" onClick={() => setSettings(true)} aria-label={t.settings} title={t.settings}><IcoSettings /></button>}
      </header>

      <div className="welcome-scroll scroll">
        <main className="welcome-content">
          <h1 className="welcome-title fade-up">{t.appTitle}</h1>
          <p className="welcome-tagline fade-up d1">{t.tagline}</p>
          <div className={`welcome-planet fade-in d2 ${leaving ? 'leaving' : ''}`} onClick={profile ? enter : undefined} role={profile ? 'button' : undefined} aria-label={profile ? t.myPlanet : undefined}>
            <Planet theme={curTheme} size="100%" />
          </div>

          {!profile ? (
            <form className="panel panel-parchment welcome-form fade-up d3" onSubmit={(e) => { e.preventDefault(); void enter(); }}>
              <div className="field">
                <label htmlFor="planet-name">{t.planetNameLabel}</label>
                <input id="planet-name" className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder={t.planetNamePlaceholder} maxLength={40} autoComplete="off" />
              </div>
              <div className="field">
                <span className="field-label">{t.planetTheme}</span>
                <div className="theme-swatches" role="radiogroup" aria-label={t.planetTheme}>
                  {THEMES.map((th) => (
                    <button key={th} type="button" role="radio" aria-checked={theme === th} className={`swatch swatch-${th} ${theme === th ? 'on' : ''}`} title={t[`theme_${th}`]} onClick={() => { setThemeLocal(th); setTheme(th); }} aria-label={t[`theme_${th}`]} />
                  ))}
                </div>
              </div>
              <button type="submit" className="btn btn-primary btn-wide"><IcoSparkle /> {t.enterWorld}</button>
            </form>
          ) : (
            <div className="welcome-returning fade-up d3">
              <div className="welcome-planetname">{profile.planetName}</div>
              <div className="muted small">{t.memoriesCount(memories.length)}</div>
              <div className="welcome-actions">
                <button className="btn btn-primary" onClick={enter}><IcoPlanet /> {t.myPlanet}</button>
                <button className="btn" onClick={() => go({ screen: 'friends' })}><IcoFriends /> {t.friends}</button>
                <button className="btn" onClick={() => go({ screen: 'archive' })}><IcoArchive /> {t.archive}</button>
              </div>
            </div>
          )}
        </main>
        <footer className="welcome-footer">{t.subtitle}</footer>
      </div>

      {settings && profile && (
        <Modal onClose={() => setSettings(false)}>
          <h2>{t.settings}</h2>
          <div className="divider" />
          <div className="settings-row">
            <span>{t.planetNameLabel}</span>
            <input className="input" style={{ width: 200 }} defaultValue={profile.planetName} onBlur={(e) => setProfile({ ...profile, planetName: e.target.value.trim() || profile.planetName })} />
          </div>
          <div className="settings-row">
            <span>{t.language}</span>
            <div className="tabs">
              <button className={lang === 'ru' ? 'on' : ''} onClick={() => setLang('ru')}>RU</button>
              <button className={lang === 'en' ? 'on' : ''} onClick={() => setLang('en')}>EN</button>
            </div>
          </div>
          <div className="settings-row">
            <span>{t.planetTheme}</span>
            <div className="theme-swatches">
              {THEMES.map((th) => <button key={th} className={`swatch swatch-${th} ${profile.theme === th ? 'on' : ''}`} onClick={() => setTheme(th)} aria-label={t[`theme_${th}`]} />)}
            </div>
          </div>
          <div className="settings-row">
            <span>{t.motion}</span>
            <div className="tabs">
              <button className={!profile.reducedMotion ? 'on' : ''} onClick={() => setMotion(false)}>{t.motionFull}</button>
              <button className={profile.reducedMotion ? 'on' : ''} onClick={() => setMotion(true)}>{t.motionReduced}</button>
            </div>
          </div>
          <div className="settings-row" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
            <button className="btn" onClick={loadDemo} disabled={busy}><IcoSparkle /> {busy ? '…' : t.resetDemo}</button>
            <span className="small muted" style={{ marginTop: 6 }}>{t.resetDemoHint}</span>
          </div>
          <div className="settings-row" style={{ borderBottom: 0 }}>
            <span className="small muted">{profile.code}</span>
            <button className="btn btn-sm btn-ghost btn-danger" onClick={async () => { if (confirm(t.wipeConfirm)) { await wipe(); setSettings(false); } }}>{t.wipe}</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
