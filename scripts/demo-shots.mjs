// Demonstration walk-through + screenshot refresh for docs/screenshots.
// Follows the Genesis ArtTech demo flow: planet → year → floating islands → garden → memory
// (petals: photos, story, music, why) → archive → create (analyze, confirm, grow) → friend's planet.
// Also verifies the three contrasting demo days (peaceful / stressful / joyful) grow visibly different
// flowers that still share one visual system, and writes the comparison to <outdir>/demo-flowers.json.
//
// usage: node scripts/demo-shots.mjs <outdir> [url]        (dev server must be running)
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';

const OUT = process.argv[2] || './docs/screenshots';
const URL = process.argv[3] || 'http://localhost:5173/';
fs.mkdirSync(OUT, { recursive: true });
const DL = path.join(OUT, '..', 'tmp-downloads'); fs.mkdirSync(DL, { recursive: true });

const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
const ctx = await browser.newContext({ viewport: { width: 1366, height: 820 }, deviceScaleFactor: 1, acceptDownloads: true, locale: 'ru-RU' });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push('[pageerror] ' + e.message));
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(`[${m.type()}] ${m.text()}`); });
const results = [];
const ok = (name, cond, extra = '') => { results.push({ name, pass: !!cond, extra }); console.log(`${cond ? 'PASS' : 'FAIL'} ${name} ${extra}`); };
const shot = async (name, ms = 900) => { await page.waitForTimeout(ms); await page.screenshot({ path: path.join(OUT, `${name}.png`) }); console.log('  shot', name); };
const clickIsland = async (month0) => page.click(`.month-slot:nth-child(${month0 + 2}) .island`, { force: true });
const state = () => page.evaluate(() => window.__mi.store.getState());
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAFklEQVR4nGP4z8DwHwyBNAMDA8N/AB0eA/0E2a2WAAAAAElFTkSuQmCC', 'base64');

try {
  // 1. planet
  await page.goto(URL, { waitUntil: 'networkidle' }); await page.waitForTimeout(1200);
  await page.fill('#planet-name', 'Планета воспоминаний');
  await page.click('.swatch-rose');
  await page.click('.btn-primary'); await page.waitForTimeout(1600);
  ok('entered years', !!(await page.$('.year-orb')));
  // demo data through the settings dialog (synthetic photos + synthesized audio, through the real pipeline)
  await page.goBack(); await page.waitForTimeout(1200);
  await page.click('.welcome-top .btn-icon'); await page.waitForTimeout(500);
  await page.click('text=Загрузить демо-воспоминания');
  await page.waitForSelector('text=Демо-воспоминания посажены', { timeout: 120000 });
  await page.waitForTimeout(600);
  const st0 = await state();
  ok('7 demo memories planted', st0.memories.length === 7, `n=${st0.memories.length}`);
  await page.reload({ waitUntil: 'networkidle' }); await page.waitForTimeout(1400);
  await shot('01-welcome');

  // 2. years
  await page.click('text=Моя планета'); await page.waitForTimeout(1600);
  await shot('02-years');
  // 3. months
  await page.click('button.year-orb:has-text("2026")'); await page.waitForTimeout(1800);
  await shot('03-months', 1200);
  const futureSlots = await page.$$eval('.month-slot.future', (els) => els.length);
  ok('future months marked (Dec 2026 only in Nov 2026)', futureSlots >= 1, `future=${futureSlots}`);
  await page.evaluate(() => document.querySelector('.months-scroll').scrollTo({ top: 0, behavior: 'auto' })); await shot('03b-months-top', 900);
  // 4. garden (November)
  await clickIsland(10); await page.waitForTimeout(2800);
  await shot('04-garden', 1200);
  ok('november garden has 3 plants', (await page.$$('.garden-plant .plant')).length === 3);
  // 5. memory: the birthday (shared, joyful)
  const plants = await page.$$('.garden-plant .plant');
  let target = null; for (const p of plants) { if (/рожден|Birthday|друз/i.test((await p.getAttribute('aria-label')) || '')) target = p; }
  await (await (target || plants[0]).$('g > g > circle')).click({ force: true }); await page.waitForTimeout(1600);
  await shot('05-memory');
  await page.click('button[aria-label="Фотографии"]'); await shot('05b-memory-photos', 800);
  await page.click('button[aria-label="История"]'); await shot('06-memory-story', 800);
  await page.click('button[aria-label="Музыка"]'); await shot('07-memory-music', 1200);
  await page.click('text=Почему мой цветок такой?'); await shot('08-memory-why', 800);
  // 6. archive
  await page.goto(URL, { waitUntil: 'networkidle' }); await page.waitForTimeout(1000);
  await page.click('text=Архив'); await shot('09-archive', 1200);
  // 7. create a new memory in October (free day 2026-10-12)
  await page.goto(URL, { waitUntil: 'networkidle' }); await page.waitForTimeout(900);
  await page.click('text=Моя планета'); await page.waitForTimeout(1400);
  await page.click('button.year-orb:has-text("2026")'); await page.waitForTimeout(1500);
  await clickIsland(9); await page.waitForTimeout(2600);
  await page.evaluate(() => { const i = document.querySelector('.garden-actions input[type=date]'); const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; set.call(i, '2026-10-12'); i.dispatchEvent(new Event('change', { bubbles: true })); });
  await page.waitForTimeout(1200);
  await page.fill('textarea.input', 'Тихий вечер дома с чаем и книгой. За окном шёл дождь, было уютно и спокойно. Вспоминал лето и наш старый двор.');
  await page.setInputFiles('input[type=file][accept="image/*"]', { name: 'evening.png', mimeType: 'image/png', buffer: PNG });
  await page.waitForTimeout(500);
  await page.fill('input[inputmode=url]', 'https://open.spotify.com/track/4u7EnebtmKWzUH433cf5Qv');
  await shot('10a-create-form', 500);
  await page.click('text=Вырастить воспоминание');
  await page.waitForSelector('text=Это похоже на твой день?', { timeout: 40000 });
  await shot('10-create-confirm', 700);
  await page.click('text=Посадить'); await page.waitForTimeout(2300);
  await shot('11-growing', 200);
  await page.waitForSelector('text=Воспоминание выросло', { timeout: 25000 });
  await shot('11b-grown', 600);
  // 8. future month: explorable, no creation
  await page.goto(URL, { waitUntil: 'networkidle' }); await page.waitForTimeout(900);
  await page.click('text=Моя планета'); await page.waitForTimeout(1400);
  await page.click('button.year-orb:has-text("2026")'); await page.waitForTimeout(1500);
  await page.evaluate(() => document.querySelector('.months-scroll').scrollTo({ top: 1e6, behavior: 'auto' })); await page.waitForTimeout(600);
  await shot('03c-months-future', 400);
  await clickIsland(11); await page.waitForTimeout(2600);   // December 2026
  const futureStatus = await page.getAttribute('.screen.garden', 'data-month-status');
  const plantBtn = await page.$('.garden-actions input[type=date]');
  const futureText = !!(await page.$('text=Этот месяц ещё впереди'));
  ok('future month garden: explorable, creation disabled, message shown', futureStatus === 'future' && !plantBtn && futureText, `status=${futureStatus}`);
  await shot('14-garden-future', 600);
  // 9. friend's planet: export → tamper → import → visit
  await page.goto(URL, { waitUntil: 'networkidle' }); await page.waitForTimeout(900);
  await page.click('text=Планеты друзей'); await page.waitForTimeout(800);
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('text=Экспортировать мою планету')]);
  const planetPath = path.join(DL, 'planet.json'); await dl.saveAs(planetPath);
  const planet = JSON.parse(fs.readFileSync(planetPath, 'utf8'));
  const garden = planet.memories.filter((m) => m.privacy === 'garden');
  ok('export: garden-only entries carry only id/date/privacy/plant', garden.length > 0 && garden.every((m) => Object.keys(m).sort().join(',') === 'date,id,plant,privacy'), `garden=${garden.length} keys=${garden[0] && Object.keys(garden[0]).join(',')}`);
  ok('export: no private memory', planet.memories.every((m) => m.privacy !== 'private') && !JSON.stringify(planet).includes('demo_rain'));
  planet.planetName = 'Планета друга'; planet.code = 'FRIEND1';
  const friendPath = path.join(DL, 'friend.json'); fs.writeFileSync(friendPath, JSON.stringify(planet));
  await page.setInputFiles('input[type=file][accept=".json,application/json"]', friendPath);
  await page.waitForSelector('text=Планета друга добавлена', { timeout: 8000 });
  await shot('12a-friends', 500);
  await page.click('text=Отправиться'); await page.waitForTimeout(1500);
  await page.click('button.year-orb:has-text("2026")'); await page.waitForTimeout(1500);
  await clickIsland(10); await page.waitForTimeout(2600);
  await shot('12-friend-garden', 1000);
  const friendPlants = await page.$$('.garden-plant .plant');
  ok('friend garden shows shared + garden-only flowers of November', friendPlants.length === 3, `n=${friendPlants.length}`);
  // open a garden-only flower on the friend's planet → locked
  let locked = null; for (const p of friendPlants) { const l = (await p.getAttribute('aria-label')) || ''; if (/^\d{4}-\d{2}-\d{2}$/.test(l)) locked = p; }
  if (locked) { await (await locked.$('g > g > circle')).click({ force: true }); await page.waitForTimeout(1400); ok('garden-only flower stays private when visited', !!(await page.$('text=Этот день остался приватным'))); await shot('12b-friend-locked', 400); }

  // 10. three contrasting demo flowers: peaceful (sea), stressful (deadline), joyful (birthday)
  const st = await state();
  const pick = (id) => st.memories.find((m) => m.id === id);
  const trio = { peaceful: pick('demo_sea'), stressful: pick('demo_deadline'), joyful: pick('demo_birthday') };
  const summary = Object.fromEntries(Object.entries(trio).map(([k, m]) => [k, m && { id: m.id, title: m.title, style: m.plant.petal_style, inner: m.plant.petal_style_inner, texture: m.plant.texture, particles: m.plant.particle_style, kinks: m.plant.stem_kinks, layers: m.plant.layers, petals: m.plant.petal_count, glow: +m.plant.glow_intensity.toFixed(2), sway: +m.plant.sway_speed.toFixed(2), pulse: +m.plant.pulse_period.toFixed(2), colors: m.plant.colors.petals, visual: Object.fromEntries(['calmness', 'tension', 'joy', 'energy', 'nostalgia', 'warmth'].map((x) => [x, +m.visual[x].toFixed(2)])) }]));
  fs.writeFileSync(path.join(OUT, 'demo-flowers.json'), JSON.stringify(summary, null, 2));
  const distinct = new Set(Object.values(summary).map((s) => `${s.style}|${s.texture}|${s.particles}`)).size === 3;
  ok('three contrasting demo flowers differ in petal style / texture / particles', distinct, JSON.stringify(Object.values(summary).map((s) => `${s.style}/${s.texture}/${s.particles}/kinks${s.kinks}`)));
  ok('peaceful day is the calmest, stressful the most tense, joyful the happiest', summary.peaceful.visual.calmness > summary.stressful.visual.calmness && summary.stressful.visual.tension > summary.peaceful.visual.tension && summary.stressful.visual.tension > summary.joyful.visual.tension && summary.joyful.visual.joy > summary.peaceful.visual.joy && summary.joyful.visual.joy > summary.stressful.visual.joy);
  // one style: every flower keeps the island's luminous palette range
  const hsl = (hex) => { const n = parseInt(hex.slice(1), 16); const r = (n >> 16 & 255) / 255, g = (n >> 8 & 255) / 255, b = (n & 255) / 255; const mx = Math.max(r, g, b), mn = Math.min(r, g, b); const l = (mx + mn) / 2; const s = mx === mn ? 0 : (l > 0.5 ? (mx - mn) / (2 - mx - mn) : (mx - mn) / (mx + mn)); return { s, l }; };
  const consistent = st.memories.every((m) => m.plant.colors.petals.every((c) => { const { s, l } = hsl(c); return l >= 0.45 && l <= 0.78 && s >= 0.3; }) && m.plant.glow_intensity >= 0.25 && m.plant.petal_count >= 4);
  ok('all demo flowers stay inside one visual system (luminous palette, glow, complete anatomy)', consistent);
  // side-by-side portraits of the three
  for (const [k, m] of Object.entries(trio)) {
    await page.goto(URL, { waitUntil: 'networkidle' }); await page.waitForTimeout(800);
    await page.evaluate((id) => { const s = window.__mi.store.getState(); s.setVisiting(null); s.go({ screen: 'memory', memoryId: id, year: 2026, month: 10 }, 'fade'); }, m.id);
    await page.waitForTimeout(1600);
    const stage = await page.$('.memory-stage');
    await stage.screenshot({ path: path.join(OUT, `demo-flower-${k}.png`) });
  }
  // mobile garden
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(URL, { waitUntil: 'networkidle' }); await page.waitForTimeout(900);
  await page.click('text=Моя планета'); await page.waitForTimeout(1400);
  await page.click('button.year-orb:has-text("2026")'); await page.waitForTimeout(1500);
  await shot('13-months-mobile', 1000);
  await clickIsland(10); await page.waitForTimeout(2600);
  await shot('13b-garden-mobile', 900);
} catch (e) {
  ok('flow completed', false, e.message.slice(0, 400));
  await page.screenshot({ path: path.join(OUT, '99-fail.png') });
}
const realErrors = errors.filter((e) => !e.includes('React DevTools') && !e.includes('favicon') && !/playready|autoplay|third-party cookie|preload/i.test(e));
ok('no console errors/warnings', realErrors.length === 0, realErrors.slice(0, 4).join(' || ').slice(0, 500));
await browser.close();
fs.rmSync(DL, { recursive: true, force: true });
const failed = results.filter((r) => !r.pass);
console.log(`\nSUMMARY: ${results.length - failed.length}/${results.length} passed`);
for (const f of failed) console.log('  FAIL', f.name, f.extra);
process.exit(failed.length ? 1 : 0);
