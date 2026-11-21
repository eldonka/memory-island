// Viewport sweep of the welcome (planet-creation) screen — screenshots + geometry checks.
//
// The REAL scrolling container is `.welcome-scroll` (the `.welcome` screen itself is overflow:hidden),
// so every check below is made against it. Per viewport × language (RU, EN) × state (new user, returning):
//   • vertical scrolling: when content does not fit, the bottom must be reachable by scrolling
//   • no clipped content: every text block, input and button lies inside the scrollable content
//     and can be scrolled fully into view (nothing cut by overflow:hidden)
//   • no hidden buttons: each button has a size, and the element under its centre is the button itself
//   • no text overlap: title / tagline / planet / form / actions / footer / language switch never intersect
//   • no horizontal overflow: document, screen and scroller
//   • keyboard navigation: Tab reaches the name input (new user) and the primary button, and the
//     focused element is visible inside the viewport
//   • short viewports and tablet/mobile sizes (see VIEWPORTS)
//
// usage: node scripts/viewport-sweep.mjs <outdir> <prefix> [url]
// exit code 1 when any problem was found; details in <outdir>/<prefix>-report.json
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';

const OUT = process.argv[2] || './shots';
const PREFIX = process.argv[3] || 'sweep';
const URL = process.argv[4] || 'http://localhost:5173/';
fs.mkdirSync(OUT, { recursive: true });

// CSS-pixel viewports: raw monitor sizes, the same minus browser chrome, 125 % zoom, tablets, phones, short/landscape
const VIEWPORTS = [
  [1920, 1080, 'desktop'], [1920, 970, 'desktop'], [1728, 900, 'desktop'], [1728, 790, 'desktop'], [1440, 900, 'desktop'], [1440, 790, 'desktop'],
  [1366, 768, 'desktop'], [1366, 657, 'desktop'], [1280, 720, 'desktop'], [1280, 600, 'desktop-short'], [1093, 614, 'zoom125'],
  [1024, 768, 'tablet'], [820, 1180, 'tablet'], [768, 1024, 'tablet'], [1024, 560, 'tablet-short'],
  [390, 844, 'mobile'], [375, 667, 'mobile'], [360, 640, 'mobile'], [375, 560, 'mobile-short'], [667, 375, 'mobile-landscape'],
];
const LANGS = ['ru', 'en'];
const STRINGS = { ru: { primaryNew: 'Войти в мой мир', primaryBack: 'Моя планета' }, en: { primaryNew: 'Enter My World', primaryBack: 'My Planet' } };

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const report = [];

/** geometry audit, executed inside the page */
async function audit(page, label) {
  return page.evaluate((label) => {
    const vw = document.documentElement.clientWidth, vh = window.innerHeight;
    const issues = [], warnings = [];
    const screen = document.querySelector('.welcome');
    const scroller = document.querySelector('.welcome-scroll');
    if (!screen || !scroller) return { label, issues: ['welcome screen or .welcome-scroll missing'], warnings, scrollable: false };
    const rect = (el) => { const r = el.getBoundingClientRect(); return { top: r.top, bottom: r.bottom, left: r.left, right: r.right, w: r.width, h: r.height }; };
    const desc = (el) => `${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''}${el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : ''}${el.textContent ? ' "' + el.textContent.trim().slice(0, 24) + '"' : ''}`;
    const visible = (el) => { const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); return cs.display !== 'none' && cs.visibility !== 'hidden' && !(r.width === 0 && r.height === 0 && el.tagName !== 'INPUT'); };

    // --- horizontal overflow (document, screen, scroller) ---
    if (document.documentElement.scrollWidth > vw + 1) issues.push(`document horizontal overflow ${document.documentElement.scrollWidth}>${vw}`);
    if (screen.scrollWidth > screen.clientWidth + 1) issues.push(`screen horizontal overflow ${screen.scrollWidth}>${screen.clientWidth}`);
    if (scroller.scrollWidth > scroller.clientWidth + 1) issues.push(`scroller horizontal overflow ${scroller.scrollWidth}>${scroller.clientWidth}`);

    // --- vertical scrolling on the real container ---
    const scrollable = scroller.scrollHeight > scroller.clientHeight + 1;
    const start = scroller.scrollTop;
    if (scrollable) {
      scroller.scrollTop = 1e6;
      const reached = scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 2;
      if (!reached) issues.push(`cannot scroll to the bottom (${scroller.scrollTop + scroller.clientHeight} of ${scroller.scrollHeight})`);
      if (getComputedStyle(scroller).overflowY !== 'auto' && getComputedStyle(scroller).overflowY !== 'scroll') issues.push('scroller is not overflow-y:auto');
      scroller.scrollTop = start;
    }

    // --- clipping / reachability of every content element ---
    const sr = rect(scroller);
    const els = [...screen.querySelectorAll('h1, p, label, .field-label, input:not([hidden]):not([type=file]), button, [role=button], a, footer, .welcome-planetname')].filter(visible);
    for (const el of els) {
      const r0 = rect(el);
      if (r0.w === 0 || r0.h === 0) { issues.push(`zero-size element ${desc(el)}`); continue; }
      if (r0.left < -1 || r0.right > vw + 1) issues.push(`horizontally clipped ${desc(el)} (${r0.left.toFixed(0)}..${r0.right.toFixed(0)} of ${vw})`);
      if (scroller.contains(el)) {
        el.scrollIntoView({ block: 'nearest', inline: 'nearest' });
        const r = rect(el);
        if (r.top < sr.top - 1 || r.bottom > sr.bottom + 1) issues.push(`cannot be scrolled fully into view ${desc(el)} (${r.top.toFixed(0)}..${r.bottom.toFixed(0)} in scroller ${sr.top.toFixed(0)}..${sr.bottom.toFixed(0)})`);
        if (r.top < -1 || r.bottom > vh + 1) issues.push(`clipped by viewport after scrollIntoView ${desc(el)}`);
      } else if (r0.top < -1 || r0.bottom > vh + 1) issues.push(`outside viewport (not scrollable) ${desc(el)} (${r0.top.toFixed(0)}..${r0.bottom.toFixed(0)} of ${vh})`);
    }
    scroller.scrollTop = start;

    // --- hidden / covered buttons ---
    for (const b of [...screen.querySelectorAll('button, [role=button]')].filter(visible)) {
      if (scroller.contains(b)) b.scrollIntoView({ block: 'nearest' });
      const r = rect(b);
      const hit = document.elementFromPoint(r.left + r.w / 2, r.top + r.h / 2);
      if (!hit || !(b === hit || b.contains(hit) || hit.contains(b))) issues.push(`button covered or hidden ${desc(b)} → ${hit ? desc(hit) : 'nothing'}`);
      if (r.w < 24 || r.h < 24) warnings.push(`small hit target ${desc(b)} ${r.w.toFixed(0)}×${r.h.toFixed(0)}`);
    }
    scroller.scrollTop = start;

    // --- overlap between the main blocks (evaluated in the un-scrolled state) ---
    const blocks = [['title', '.welcome-title'], ['tagline', '.welcome-tagline'], ['planet', '.welcome-planet'], ['form', '.welcome-form'], ['returning', '.welcome-returning'], ['footer', '.welcome-footer'], ['lang', '.lang-switch'], ['settings', '.welcome-top .btn-icon']]
      .map(([n, s]) => [n, screen.querySelector(s)]).filter(([, el]) => el && visible(el)).map(([n, el]) => [n, rect(el)]);
    for (let i = 0; i < blocks.length; i++) for (let j = i + 1; j < blocks.length; j++) {
      const [na, a] = blocks[i], [nb, b] = blocks[j];
      const ix = Math.min(a.right, b.right) - Math.max(a.left, b.left), iy = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
      if (ix > 2 && iy > 2) issues.push(`overlap ${na} × ${nb} (${ix.toFixed(0)}×${iy.toFixed(0)}px)`);
    }
    // primary button visible without scrolling is a nice-to-have on short screens (warning only)
    const primary = screen.querySelector('.btn-primary');
    if (primary) { const r = rect(primary); if (r.bottom > vh + 1 || r.top < 0) warnings.push(`primary button needs scrolling (${r.top.toFixed(0)}..${r.bottom.toFixed(0)} of ${vh})`); }
    return { label, issues, warnings, scrollable };
  }, label);
}

/** Tab through the screen and verify the key controls get focus and are visible */
async function keyboard(page, label, newUser) {
  const seen = [];
  await page.evaluate(() => { document.activeElement && document.activeElement.blur(); document.querySelector('.welcome-scroll').scrollTop = 0; });
  for (let i = 0; i < 14; i++) {
    await page.keyboard.press('Tab');
    const info = await page.evaluate(() => {
      const el = document.activeElement; if (!el || el === document.body) return null;
      const r = el.getBoundingClientRect(); const vh = window.innerHeight, vw = document.documentElement.clientWidth;
      return { tag: el.tagName.toLowerCase(), id: el.id, cls: el.className && typeof el.className === 'string' ? el.className.split(/\s+/)[0] : '', text: (el.textContent || '').trim().slice(0, 20), visible: r.top >= -1 && r.bottom <= vh + 1 && r.left >= -1 && r.right <= vw + 1 && r.width > 0 };
    });
    if (info) seen.push(info);
  }
  const issues = [];
  const has = (pred) => seen.find(pred);
  if (newUser && !has((s) => s.id === 'planet-name')) issues.push('Tab never reaches the planet-name input');
  if (!has((s) => s.cls === 'btn' && s.text && /Войти|Моя планета|Enter|My Planet/.test(s.text))) issues.push('Tab never reaches the primary button');
  if (!has((s) => s.cls === 'swatch') && newUser) issues.push('Tab never reaches the cloud-tint swatches');
  for (const s of seen) if (!s.visible) issues.push(`focused element not visible: ${s.tag}#${s.id}.${s.cls} "${s.text}"`);
  return { label, issues, order: seen.map((s) => s.id || s.cls || s.tag) };
}

for (const [w, h, note] of VIEWPORTS) {
  const tag = `${w}x${h}-${note}`;
  const mobile = note.startsWith('mobile');
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, isMobile: mobile, hasTouch: mobile });
  const page = await ctx.newPage();
  const errs = []; page.on('pageerror', (e) => errs.push(e.message)); page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  const entry = { tag, w, h, note, states: [], console: [] };
  await page.goto(URL, { waitUntil: 'networkidle' }); await page.waitForTimeout(1200);
  for (const lang of LANGS) {
    if (lang === 'en') { await page.click('.lang-switch button:has-text("EN")'); await page.waitForTimeout(500); }
    // --- new user ---
    const a1 = await audit(page, `${tag} ${lang} new-user`);
    const k1 = await keyboard(page, `${tag} ${lang} new-user keyboard`, true);
    await page.evaluate(() => { document.querySelector('.welcome-scroll').scrollTop = 0; });
    await page.screenshot({ path: path.join(OUT, `${PREFIX}-${tag}-${lang}-new.png`) });
    if (a1.scrollable) { await page.evaluate(() => { const s = document.querySelector('.welcome-scroll'); s.scrollTop = s.scrollHeight; }); await page.waitForTimeout(250); await page.screenshot({ path: path.join(OUT, `${PREFIX}-${tag}-${lang}-new-scrolled.png`) }); await page.evaluate(() => { document.querySelector('.welcome-scroll').scrollTop = 0; }); }
    entry.states.push({ ...a1, keyboard: k1 });
    // --- returning user: create the planet, come back ---
    await page.fill('#planet-name', lang === 'ru' ? 'Тестовая планета' : 'Test planet');
    await page.click(`.btn-primary:has-text("${STRINGS[lang].primaryNew}")`); await page.waitForTimeout(1400);
    await page.goBack(); await page.waitForTimeout(1200);
    const a2 = await audit(page, `${tag} ${lang} returning`);
    const k2 = await keyboard(page, `${tag} ${lang} returning keyboard`, false);
    await page.evaluate(() => { document.querySelector('.welcome-scroll').scrollTop = 0; });
    await page.screenshot({ path: path.join(OUT, `${PREFIX}-${tag}-${lang}-returning.png`) });
    entry.states.push({ ...a2, keyboard: k2 });
    // reset storage for the next language pass so the "new user" state is real again
    if (lang === 'ru') {
      await page.evaluate(async () => { const dbs = await indexedDB.databases(); await Promise.all(dbs.map((d) => new Promise((res) => { const r = indexedDB.deleteDatabase(d.name); r.onsuccess = r.onerror = r.onblocked = () => res(); }))); });
      await page.goto(URL, { waitUntil: 'networkidle' }); await page.waitForTimeout(900);
    }
  }
  entry.console = errs.filter((e) => !e.includes('favicon'));
  report.push(entry);
  const probs = entry.states.flatMap((s) => [...s.issues, ...s.keyboard.issues]);
  const warns = entry.states.flatMap((s) => s.warnings);
  console.log(`${tag.padEnd(24)} ${probs.length ? 'PROBLEMS: ' + probs.join('; ') : 'ok'}${warns.length ? '  (warn: ' + [...new Set(warns)].join('; ') + ')' : ''}${entry.console.length ? '  CONSOLE: ' + entry.console[0].slice(0, 120) : ''}`);
  await ctx.close();
}
await browser.close();

const problems = report.flatMap((e) => e.states.flatMap((s) => [...s.issues.map((i) => `${s.label}: ${i}`), ...s.keyboard.issues.map((i) => `${s.keyboard.label}: ${i}`)]).concat(e.console.map((c) => `${e.tag} console: ${c}`)));
fs.writeFileSync(path.join(OUT, `${PREFIX}-report.json`), JSON.stringify({ url: URL, generatedAt: new Date().toISOString(), viewports: report, problems }, null, 2));
console.log(`\nviewports: ${report.length} × languages: ${LANGS.length} × states: 2 → PROBLEMS: ${problems.length}`);
for (const p of problems) console.log('  ', p);
process.exit(problems.length ? 1 : 0);
