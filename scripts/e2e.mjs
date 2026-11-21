// End-to-end verification of Memory Island (desktop 1366x768 + mobile 390x844):
// planet → years → months → garden → create (text+photo+music) → preview → save → petals →
// reload persistence → edit + date-conflict handling → export/import → language switch → 31-plant garden.
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';
const OUT = process.argv[2] || './shots-e2e';
const DL = path.join(OUT, 'downloads');
fs.mkdirSync(DL, { recursive: true });
const URL = 'http://localhost:5173/';
const results = [];
const ok = (name, cond, extra = '') => { results.push({ name, pass: !!cond, extra }); console.log(`${cond ? 'PASS' : 'FAIL'} ${name} ${extra}`); };
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAFklEQVR4nGP4z8DwHwyBNAMDA8N/AB0eA/0E2a2WAAAAAElFTkSuQmCC', 'base64');
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });

async function flow(label, viewport, mobile) {
  const ctx = await browser.newContext({ viewport, isMobile: mobile, hasTouch: mobile, acceptDownloads: true });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push('[pageerror] ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(`[${m.type()}] ${m.text()}`); });
  const shot = async (n, ms = 800) => { await page.waitForTimeout(ms); await page.screenshot({ path: `${OUT}/${label}-${n}.png` }); };
  // .months-track's first child is the dotted path, so month m (0-based) is nth-child(m+2)
  const clickIsland = async (month0) => page.click(`.month-slot:nth-child(${month0 + 2}) .island`, { force: true });
  try {
    // 1-3 planet
    await page.goto(URL, { waitUntil: 'networkidle' }); await page.waitForTimeout(1200);
    ok(`${label}: placeholder is neutral`, (await page.getAttribute('#planet-name', 'placeholder')).includes('вселенная'));
    await page.fill('#planet-name', 'Тестовая планета');
    await page.click('.swatch-lavender');
    await shot('01-welcome');
    await page.click('.btn-primary'); await page.waitForTimeout(1500);
    ok(`${label}: entered years`, !!(await page.$('.year-orb')));
    // 4-6 year → month → garden
    await page.click('button.year-orb:has-text("2026")'); await page.waitForTimeout(1500);
    await clickIsland(9); await page.waitForTimeout(2600);   // October (empty)
    ok(`${label}: empty garden prompt`, !!(await page.$('text=Посадить первое воспоминание')));
    await shot('02-garden-empty', 300);
    // 7 create
    await page.click('text=Посадить первое воспоминание'); await page.waitForTimeout(1000);
    await page.fill('input[type=date].input', '2026-10-05');
    await page.fill('textarea.input', 'Тихий вечер дома с чаем и книгой. За окном шёл дождь, было уютно и спокойно. Я не грустил, просто отдыхал и вспоминал лето.');
    await page.setInputFiles('input[type=file][accept="image/*"]', { name: 'test.png', mimeType: 'image/png', buffer: PNG });
    await page.waitForTimeout(500);
    await page.fill('input[inputmode=url]', 'https://open.spotify.com/track/4u7EnebtmKWzUH433cf5Qv');
    await shot('03-create-filled', 300);
    await page.click('text=Вырастить воспоминание');
    await page.waitForSelector('text=Это похоже на твой день?', { timeout: 40000 });
    // 8 preview + negation check in DNA (sadness should be low)
    const sadness = await page.evaluate(() => { const rows = [...document.querySelectorAll('.dna-bar')]; const r = rows.find((x) => x.textContent.includes('грусть')); return r ? Number(r.textContent.replace(/\D/g, '')) : -1; });
    ok(`${label}: preview flower + negated sadness low`, !!(await page.$('.confirm-grid .plant')) && sadness >= 0 && sadness < 25, `sadness=${sadness}`);
    const autoTitle = await page.inputValue('.confirm-grid input.input');
    ok(`${label}: auto title 3–7 words`, autoTitle.split(/\s+/).length >= 3 && autoTitle.split(/\s+/).length <= 7, `"${autoTitle}"`);
    await shot('04-preview', 300);
    // 9 save → growth
    await page.click('text=Посадить'); await page.waitForTimeout(1500);
    await shot('05-growing', 200);
    await page.waitForSelector('text=Воспоминание выросло', { timeout: 20000 });
    ok(`${label}: planted in October garden`, (await page.$$('.garden-plant .plant')).length === 1);
    // 10-11 open flower + petals
    await (await page.$('.garden-plant .plant g > g > circle')).click({ force: true }); await page.waitForTimeout(1500);   // click the bloom
    await page.click('button[aria-label="Фотографии"]'); await page.waitForTimeout(600);
    ok(`${label}: photo petal`, !!(await page.$('.photo-viewer img')));
    await page.click('button[aria-label="История"]'); await page.waitForTimeout(600);
    ok(`${label}: story petal`, (await page.textContent('.memory-story')).includes('Тихий вечер'));
    await page.click('button[aria-label="Музыка"]'); await page.waitForTimeout(800);
    ok(`${label}: music petal (embed or link)`, !!(await page.$('.music-embed iframe, a:has-text("Открыть в")')));
    await shot('06-memory-music', 300);
    // 12-14 back, reload, persists
    await page.click('.topbar button.btn-ghost'); await page.waitForTimeout(1200);
    await page.reload({ waitUntil: 'networkidle' }); await page.waitForTimeout(1200);
    ok(`${label}: profile persists after reload`, !!(await page.$('text=Моя планета')));
    await page.click('text=Архив'); await page.waitForTimeout(1000);
    ok(`${label}: memory persists after reload`, (await page.$$('.archive-item')).length === 1);
    // 15-16 edit + date conflict: create second memory on 2026-10-06, then try to move it to 10-05
    await page.goto(URL, { waitUntil: 'networkidle' }); await page.waitForTimeout(900);
    await page.click('text=Моя планета'); await page.waitForTimeout(1300);
    await page.click('button.year-orb:has-text("2026")'); await page.waitForTimeout(1400);
    await clickIsland(9); await page.waitForTimeout(2600);
    await page.evaluate(() => { const i = document.querySelector('.garden-actions input[type=date]'); const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; set.call(i, '2026-10-06'); i.dispatchEvent(new Event('change', { bubbles: true })); });
    await page.waitForTimeout(1000);
    await page.fill('textarea.input', 'Второй день: долгая прогулка в парке с другом и какао. Было тепло и спокойно.');
    await page.setInputFiles('input[type=file][accept="image/*"]', { name: 'b.png', mimeType: 'image/png', buffer: PNG });
    await page.waitForTimeout(400);
    await page.fill('input[inputmode=url]', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    await page.click('text=Вырастить воспоминание');
    await page.waitForSelector('text=Это похоже на твой день?', { timeout: 40000 });
    await page.click('text=Посадить');
    await page.waitForSelector('text=Воспоминание выросло', { timeout: 20000 });
    ok(`${label}: two plants in garden`, (await page.$$('.garden-plant .plant')).length === 2);
    // open the second plant (Oct 6) and edit → change date to Oct 5 (occupied)
    const plants = await page.$$('.garden-plant .plant');
    let target = null; for (const p of plants) { if ((await p.getAttribute('aria-label') || '').includes('прогулка')) target = p; }
    await (await (target || plants[1]).$('g > g > circle')).click({ force: true }); await page.waitForTimeout(1300);
    await page.click('text=Изменить'); await page.waitForTimeout(1000);
    await page.fill('input[type=date].input', '2026-10-05'); await page.waitForTimeout(400);
    const conflictShown = !!(await page.$('.form-conflict'));
    const growDisabled = await page.isDisabled('button:has-text("Вырастить воспоминание")');
    ok(`${label}: date conflict detected, save blocked`, conflictShown && growDisabled);
    await shot('07-date-conflict', 300);
    await page.click('text=Выбрать другую дату');
    await page.fill('input[type=date].input', '2026-10-07'); await page.waitForTimeout(400);
    ok(`${label}: conflict clears on a free date`, !(await page.$('.form-conflict')) && !(await page.isDisabled('button:has-text("Вырастить воспоминание")')));
    await page.click('text=Вырастить воспоминание');
    await page.waitForSelector('text=Это похоже на твой день?', { timeout: 40000 });
    await page.click('text=Сохранить изменения'); await page.waitForTimeout(1600);
    const dates = await page.evaluate(() => { const s = window.__mi?.store?.getState(); return s ? s.memories.map((m) => m.date + ':' + m.story.slice(0, 10)).sort() : []; });
    ok(`${label}: both memories intact, edited one moved to 10-07`, dates.length === 2 && dates[0].startsWith('2026-10-05:Тихий') && dates[1].startsWith('2026-10-07:Второй'), dates.join(' | '));
    // 17 export / import
    await page.goto(URL, { waitUntil: 'networkidle' }); await page.waitForTimeout(900);
    await page.click('text=Планеты друзей'); await page.waitForTimeout(800);
    await page.click('text=Экспортировать мою планету'); await page.waitForTimeout(600);
    ok(`${label}: export refuses when nothing is shared`, !!(await page.$('text=Сначала открой')));
    // make one memory shared via the memory screen, then export
    await page.goto(URL, { waitUntil: 'networkidle' }); await page.waitForTimeout(900);
    await page.click('text=Архив'); await page.waitForTimeout(900);
    await page.click('.archive-item >> nth=0'); await page.waitForTimeout(1200);
    await page.selectOption('.memory-footer select', 'shared'); await page.waitForTimeout(500);
    await page.goto(URL, { waitUntil: 'networkidle' }); await page.waitForTimeout(900);
    await page.click('text=Планеты друзей'); await page.waitForTimeout(800);
    const [dl] = await Promise.all([page.waitForEvent('download'), page.click('text=Экспортировать мою планету')]);
    const planetPath = path.join(DL, `${label}-planet.json`); await dl.saveAs(planetPath);
    const planet = JSON.parse(fs.readFileSync(planetPath, 'utf8'));
    ok(`${label}: exported 1 shared memory`, planet.memories.length === 1 && planet.memories[0].privacy === 'shared');
    // import: a tampered copy (privacy 'private' + garbage) must be sanitized
    planet.planetName = 'Друг'; planet.code = 'FR1';
    planet.memories.push({ ...planet.memories[0], id: 'priv', privacy: 'private' }, { id: 'bad', date: '2026-02-31', privacy: 'shared', plant: {}, visual: {} });
    const friendPath = path.join(DL, `${label}-friend.json`); fs.writeFileSync(friendPath, JSON.stringify(planet));
    await page.setInputFiles('input[type=file][accept=".json,application/json"]', friendPath);
    await page.waitForSelector('text=Планета друга добавлена', { timeout: 8000 });
    const importedCount = await page.evaluate(() => window.__mi.store.getState().friends[0]?.memories.length);
    ok(`${label}: import sanitized (private + malformed dropped)`, importedCount === 1, `imported=${importedCount}`);
    // malformed file is rejected with a message
    const badPath = path.join(DL, `${label}-bad.json`); fs.writeFileSync(badPath, JSON.stringify({ hello: 'world' }));
    await page.setInputFiles('input[type=file][accept=".json,application/json"]', badPath);
    await page.waitForSelector('text=Это не файл планеты', { timeout: 8000 });
    ok(`${label}: malformed import rejected`, true);
    await shot('08-friends', 300);
    // 18 language switch
    await page.goto(URL, { waitUntil: 'networkidle' }); await page.waitForTimeout(900);
    await page.click('.lang-switch button:has-text("EN")'); await page.waitForTimeout(600);
    ok(`${label}: English UI`, !!(await page.$('text=My Planet')) && (await page.textContent('.welcome-tagline')).includes('Every day'));
    await shot('09-welcome-en', 300);
    await page.click('.lang-switch button:has-text("RU")'); await page.waitForTimeout(400);
    // 31-plant garden
    const saved = await page.evaluate(() => window.__mi.seedStress('2026-08', 31));
    await page.reload({ waitUntil: 'networkidle' }); await page.waitForTimeout(1000);
    await page.click('text=Моя планета'); await page.waitForTimeout(1300);
    await page.click('button.year-orb:has-text("2026")'); await page.waitForTimeout(1400);
    await clickIsland(7); await page.waitForTimeout(2800);   // August
    const n = (await page.$$('.garden-plant .plant')).length;
    // selectability: for each plant, the element under its bloom centre must belong to that plant (after scrolling it into view)
    const hit = await page.evaluate(async () => {
      const stage = document.querySelector('.garden-stage');
      const plants = [...document.querySelectorAll('.garden-plant .plant')];
      let reachable = 0; const misses = [];
      for (const svg of plants) {
        const center = svg.querySelector('g > g > circle') || svg;
        const absX = svg.getBoundingClientRect().left + svg.getBoundingClientRect().width / 2 + stage.scrollLeft - stage.getBoundingClientRect().left;
        stage.scrollLeft = Math.max(0, absX - stage.clientWidth / 2);
        await new Promise((res) => setTimeout(res, 60));
        const r2 = center.getBoundingClientRect();
        const el = document.elementFromPoint(r2.left + r2.width / 2, r2.top + r2.height / 2);
        if (el && el.closest('.plant') === svg) reachable++; else misses.push(svg.getAttribute('aria-label'));
      }
      stage.scrollLeft = 0;
      return { reachable, misses: misses.slice(0, 5), scrollW: stage.scrollWidth, clientW: stage.clientWidth };
    });
    ok(`${label}: 31 plants rendered and reachable`, n === 31 && hit.reachable === 31, `saved=${saved} n=${n} reachable=${hit.reachable} pannable=${hit.scrollW > hit.clientW} misses=${hit.misses.join(',')}`);
    await shot('10-garden-31', 400);
    await page.evaluate(() => { document.querySelector('.garden-stage').scrollLeft = 99999; });
    await shot('11-garden-31-scrolled', 400);
  } catch (e) { ok(`${label}: flow completed`, false, e.message.slice(0, 300)); await page.screenshot({ path: `${OUT}/${label}-99-fail.png` }); }
  const realErrors = errors.filter((e) => !e.includes('React DevTools') && !e.includes('favicon') && !/playready/i.test(e));
  ok(`${label}: no console errors/warnings`, realErrors.length === 0, realErrors.slice(0, 3).join(' || ').slice(0, 300));
  await ctx.close();
}

await flow('desktop', { width: 1366, height: 768 }, false);
await flow('mobile', { width: 390, height: 844 }, true);
await browser.close();
const failed = results.filter((r) => !r.pass);
console.log(`\nSUMMARY: ${results.length - failed.length}/${results.length} passed`);
for (const f of failed) console.log('  FAIL', f.name, f.extra);
