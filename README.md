# Memory Island — A Universe of Memories

> *Your memories. Your world. Your story.*
> Genesis ArtTech Hackathon 2026 · theme **«Make the Invisible Visible»**

**In a hurry?** Read [QUICK-START.md](QUICK-START.md) (5 minutes, no technical background needed).
**Want every feature explained?** Read [docs/USER-GUIDE.md](docs/USER-GUIDE.md).
Русскоязычные материалы: [docs/CONCEPT.md](docs/CONCEPT.md), [docs/ART.md](docs/ART.md), [docs/TOOLS.md](docs/TOOLS.md), [docs/DEMO-SCRIPT.md](docs/DEMO-SCRIPT.md), [docs/REPORT-2026-11-21.md](docs/REPORT-2026-11-21.md).

---

## A. Project overview

### What Memory Island is

Memory Island is an atmospheric 2D diary-game that runs entirely in the browser. You describe one day of your life — a few sentences, one or more photographs and the song that sounded like that day — and the application grows a **unique living flower** out of it. The flower is planted in the garden of that month, on a floating cloud island, on your own small planet among the stars.

```
Planet  →  Year  →  12 floating cloud islands (months)  →  Garden of the month  →  Memory flower
```

### The hackathon theme: «Make the Invisible Visible»

A photograph remembers how a day *looked*. It does not remember how the day *felt*. The feeling of a day is invisible: it lives in the words you choose, in the light of your pictures and in the rhythm of the music you listened to. Memory Island makes that feeling visible as a plant whose shape, colour, light and movement are derived from your record by explainable rules. Open the flower a year later and you will see the photographs again, read your own words, hear the song — and remember not the event, but the feeling.

### Why memories become plants

- A plant **grows**: a memory is planted as a seed and grows into a flower in the rhythm of its song, so recording a day feels like tending a world rather than filling in a form.
- A plant has an **anatomy** that stays the same (stem, leaves, bloom, glowing centre) while every parameter changes with the mood. Different days stay recognisably pages of one diary.
- A garden **fills up over time**. One recorded day = one flower. Empty gardens become living archives.
- Sadness does not make a flower smaller or worse. It changes its *character* (a drooping bell, a thin ink contour, falling petals), never its rank.

### How the world is organised

| Level | What you see | What you do |
|---|---|---|
| **Planet** | Your named planet with a chosen cloud tint, among the stars | Enter your world, open the archive, visit friends' planets, load the demo |
| **Years** | A timeline of year orbs; years with memories glow and show miniature flowers | Pick a year, or plant a memory for any past date |
| **Months** | Twelve floating cloud islands on a vertical path, one per month | Scroll, pick an island; islands with memories grow more flowers and lights; future months "sleep" |
| **Garden** | The island of one month with one flower per recorded day | Touch a flower to open its day; plant a new memory on a free date |
| **Memory** | One flower, three interactive petals (photographs, story, music) and the panel *"Why does my flower look like this?"* | Relive the day, edit, export, change privacy |

### How text, photographs and music shape the flower

| Input | What is measured | What it drives |
|---|---|---|
| **Text** (RU or EN) | Emotions and themes from a bilingual lexicon of ≈400 stems (warmth, cold, joy, sadness, calm, tension, energy, nostalgia, wonder, people, nature, night, relief…), season, intensity, complexity. Negations are understood ("I was *not* sad"). | Petal **shape** (soft, pointed, layered, angular, bell, wispy, star), number of layers and petals, stem curve or kinks, leaves, glow, particles, artistic texture, the **title of the day** (3–7 words built from nouns in your story) and the **quote** (your most emotional sentence) |
| **Photographs** | Dominant colours (k-means), brightness, contrast, saturation, warmth of light, variety of hues, atmosphere (golden / cool / night / airy / vivid / muted) | Petal **colours** (harmonised into the world's palette), warmth shift, night mode, nostalgia for faded pictures |
| **Music** | From an audio file: BPM, energy, dynamics, brightness measured with the Web Audio API. From a streaming link: the audio cannot be downloaded, so the app honestly asks you to describe tempo, energy, mood and genre | **Movement**: sway speed, sway amplitude, the pulse of the glow (= two beats of the song), the speed of the growing animation, extra complexity for dynamic music |

Every decision is recorded as a *reason* and shown in the panel **"Why does my flower look like this?"** (Russian UI: «Почему мой цветок такой?»). The generator is deterministic: the same memory always grows the same flower.

### What makes it different from an ordinary digital diary

- **Nothing is a form field for its own sake.** Every input changes something visible, and the app tells you what.
- **No AI model at runtime.** The whole pipeline is an explainable rule system you can read in `src/analysis` and `src/plant`.
- **Private by default, offline by design.** All data lives in your browser (IndexedDB). There is no server, no account, no analytics. Planets travel to friends as files, and the export enforces your privacy settings at the source.
- **Art direction with a reason.** Calm warm days get Monet-like brush dabs, tense days Kandinsky lines and kinked stems, celebrations Klimt confetti, quiet sad days a Japanese ink contour (see [docs/ART.md](docs/ART.md)).

---

## B. System requirements

Verified on 21 November 2026 with the versions below. Everything is installed by `npm ci` from `package-lock.json`; no global tools other than Node.js are needed.

| Requirement | Value |
|---|---|
| **Node.js** | **20 LTS or 22 LTS** (tested: Node 22.14.0). Node 18 can run the app and the unit tests (Vite 5 / Vitest 2 need ≥ 18), but the browser test scripts use `playwright-core` 1.65.1 which requires Node ≥ 20. Use Node 20+ for the full package. |
| **npm** | 10.x (bundled with Node 20/22; tested: npm 10.9.2). `package-lock.json` is lockfile v3, which needs npm ≥ 7. |
| **Operating system** | Windows 10/11 (verified on Windows 11), macOS, Linux. The project has no native dependencies. |
| **Browser** | A current **Chrome** or **Edge** (recommended; all automated browser checks ran on Chrome), current **Firefox**, or **Safari 16.4+**. Required browser features: IndexedDB, Canvas 2D, SVG, Web Audio API, ES2020 modules. Optional: Web Speech API (voice narration). |
| **Internet** | **Not required to run the application.** Needed once for `npm ci` (downloads dependencies). Optional at runtime for: Google Fonts (otherwise system fonts are used), track-title lookup for streaming links (oEmbed), embedded Spotify / YouTube / SoundCloud / Apple Music players inside a memory. |
| **Google Chrome (only for the browser test scripts)** | `scripts/e2e.mjs`, `scripts/viewport-sweep.mjs` and `scripts/demo-shots.mjs` drive an installed Google Chrome via `playwright-core`; they do not download a browser. |
| **Disk space** | ≈ 30 MB for the extracted package (mostly screenshots); `node_modules` adds ≈ 90 MB. |

No environment variables, API keys or `.env` files are used anywhere in the project.

### Dependency versions (from `package.json` / `package-lock.json`)

| Runtime | Development |
|---|---|
| react 18.3.1, react-dom 18.3.1 | vite 5.4.21, @vitejs/plugin-react 4.3.4, typescript 5.6.3 |
| zustand 4.5.5 (state) | vitest 2.1.9 (unit / integration tests) |
| idb-keyval 6.2.1 (IndexedDB) | fake-indexeddb 6.2.8 (IndexedDB in Node for tests) |
| jszip 3.10.1 (day-folder export) | playwright-core 1.65.1 (browser checks with system Chrome) |

---

## C. Installation

The submission ZIP does **not** contain `node_modules`; dependencies are installed from the lockfile.

### Windows (PowerShell or Command Prompt)

1. Extract `Memory-Island-Genesis-2026.zip`. You get a folder `memory-island`.
2. Install Node.js 20 LTS or 22 LTS from https://nodejs.org if `node --version` does not print `v20` or `v22`.
3. Open PowerShell in the extracted folder (Shift + right-click → *Open PowerShell window here*, or `cd` into it):

```powershell
cd memory-island
npm ci
npm run dev
```

4. Vite prints something like `Local: http://localhost:5173/`. Open that address in Chrome or Edge.

### macOS / Linux (Terminal)

```bash
cd memory-island
npm ci
npm run dev
```

Then open http://localhost:5173/ in your browser.

`npm ci` installs exactly the versions recorded in `package-lock.json` (reproducible). `npm install` also works if you prefer it.

### If port 5173 is occupied

Vite is configured with `server.port = 5173` without `strictPort`, so if the port is busy it **automatically takes the next free one** (5174, 5175 …) and prints the actual URL in the terminal — read the `Local:` line. To choose a port yourself:

```bash
npm run dev -- --port 3000
```

The dev server also listens on your LAN address (`host: true`), so you can open the printed `Network:` URL from a phone on the same Wi-Fi to try the mobile layout.

### First run checklist

- The first screen asks you to name your planet and choose a cloud tint. Click **«Войти в мой мир»** / **Enter My World**.
- Switch the interface to English with the **EN** button in the top-right corner (the app starts in Russian).
- Load the seven demo memories: ⚙ (top-right, visible after the planet is created) → **«Загрузить демо-воспоминания»** / **Load demo memories**. See [QUICK-START.md](QUICK-START.md).

---

## D. Production build

```bash
npm run build      # = tsc --noEmit && vite build
npm run preview    # serves the built dist/ at http://localhost:4173/
```

- `npm run build` first type-checks the project (`tsc --noEmit`) and then bundles it with Vite into **`dist/`**:
  - `dist/index.html`
  - `dist/assets/index-<hash>.js` (≈ 415 kB, ≈ 142 kB gzipped)
  - `dist/assets/index-<hash>.css` (≈ 37 kB)
- The build uses `base: './'` (relative paths), so `dist/` can be deployed to **any static host or sub-folder** (GitHub Pages, Netlify, Vercel, an S3 bucket, a plain nginx directory). Upload the whole `dist/` folder; nothing else is needed at runtime — there is no backend.
- `dist/` must be served over **HTTP(S)**. Opening `dist/index.html` directly from the file system (`file://`) does not work because browsers block ES-module scripts on `file://` URLs. Use `npm run preview` or any static server (for example `npx serve dist`).
- The development-only test hooks (`window.__mi`) are compiled out of production builds.

A pre-built `dist/` from the verified source is included in the ZIP for convenience; rebuild it with `npm run build` after any change.

Other scripts: `npm run typecheck` (TypeScript only, no bundle).

---

## E. Automated testing

### 1. Unit and integration tests — run automatically, no browser needed

```bash
npm test           # = vitest run
```

115 tests in 10 files (verified 21 Nov 2026, ≈ 2 s). They run in Node with the `node` environment of Vitest; IndexedDB is provided by `fake-indexeddb`, so the real transaction logic is exercised without a browser.

| File | What it covers |
|---|---|
| `src/analysis/text.test.ts` | Emotion lexicon RU/EN, negation handling, idioms, titles of 3–7 words, quote extraction |
| `src/analysis/dna.test.ts` | Merging text + photo + music into Memory DNA, determinism, reasons |
| `src/plant/generate.test.ts` | DNA → plant parameters: ranges over 400 random days, tempo → sway/pulse, mixed emotions, golden snapshot (`src/plant/__snapshots__/generate.test.ts.snap`) |
| `src/data/dates.test.ts`, `src/data/monthState.test.ts` | Local calendar dates, past/current/future month rules, "proposed date never outside the month or after today" |
| `src/data/integrity.test.ts` | One day — one memory conflict detection, orphan-blob detection |
| `src/data/db.test.ts` | IndexedDB integration (`fake-indexeddb`): atomic save, date conflicts, asset roll-back on failed saves, persistence across "reloads", deletion |
| `src/data/planetFile.test.ts`, `src/data/planetExport.test.ts` | Planet export respects privacy (checks the actual JSON), import validation and sanitising of tampered files |
| `src/screens/gardenLayout.test.ts` | Garden layout for 1–31 plants: rows, spacing, clickable blooms |

### 2. Browser (end-to-end) checks — need the dev server and Google Chrome

These scripts use `playwright-core` with the **Google Chrome installed on your machine** (`channel: 'chrome'`). They are not run by `npm test`. Start the dev server first, then run a script from a second terminal. Each script opens a fresh headless browser profile, so your own planet data in your normal browser is never touched.

```bash
npm run dev                                    # terminal 1, must stay running on http://localhost:5173/

node scripts/e2e.mjs out/e2e                   # terminal 2: 44 checks on desktop 1366×768 and mobile 390×844:
                                               #   planet → year → month → garden → create (text + photo + music) → preview →
                                               #   plant → petals → reload persistence → edit + date conflict → export/import →
                                               #   language switch → 31-plant garden; fails on any console error
node scripts/viewport-sweep.mjs out/sweep      # planet screen on 20 viewport sizes × RU/EN × new/returning user:
                                               #   scrolling, clipping, hidden/overlapping buttons, horizontal overflow,
                                               #   Tab navigation; writes out/sweep/sweep-report.json; exit code 1 on problems
node scripts/demo-shots.mjs out/demo           # the 13-step demo walk-through (loads the demo memories through the UI,
                                               #   opens petals, creates a memory, checks the future-month lock, exports and
                                               #   imports a planet, visits it) + refreshes screenshots and demo-flowers.json
                                               #   in the given folder; exit code 1 on failure
```

Results on 21 Nov 2026 (Windows 11, Chrome): e2e **44/44**, viewport sweep **0 issues** (2 warnings on 667×375 landscape), demo walk-through **13/13**. Details: [docs/REPORT-2026-11-21.md](docs/REPORT-2026-11-21.md). `docs/screenshots/` was produced by `node scripts/demo-shots.mjs docs/screenshots`.

The scripts find Google Chrome through Playwright's `channel: 'chrome'` option (the standard installation location). To try Microsoft Edge instead, change that option to `channel: 'msedge'` in the script; this variant was not tested.

---

## Data, privacy and integrity (what the implementation guarantees)

- **Storage.** Three IndexedDB databases in the browser: `memory-island-memories` (JSON records), `memory-island-blobs` (original photos and uploaded audio), `memory-island-meta` (profile, imported friends' planets). Photo thumbnails (≤ 1200 px JPEG) are stored inside the record for fast display. Reloading the page keeps everything; clearing the browser's site data erases everything — export day folders or your planet file to keep copies.
- **One day — one memory.** A memory is saved in a single IndexedDB transaction that checks the date; an attempt to occupy a day that belongs to another memory is refused (`DateConflictError`) and nothing is overwritten. The form shows the conflict in advance and blocks saving.
- **Local calendar dates.** The chosen day stays the same day in any time zone (`src/data/dates.ts`).
- **Assets and records are committed together** (`db.commitMemory`): new photo/audio blobs first, then the record atomically; if the record is refused, the new blobs are rolled back. On start-up, blobs that no memory references are removed.
- **Future months** can be explored but nothing can be planted there; the proposed date is always inside the opened month and never after today.
- **Planet export respects privacy at the source** (`src/data/planetFile.ts`): «Только я» / *Private* never leaves the planet; «Только цветок» / *Garden only* travels as `{id, date, privacy, plant}` only (no emotional scores, text, quote, photos, music or reasons); «Открыто друзьям» / *Shared* travels with its content but **never** with audio files or storage identifiers.
- **Planet import treats the file as untrusted** (`validatePlanetFile`): format and version, size limits (40 MB, 1500 memories, 20 photos each), parameter ranges, http(s)-only links, embed players only from known hosts; private entries are dropped and garden-only entries are stripped of content even if a tampered file carries it.

---

## What is implemented

| Screen / feature | Status |
|---|---|
| Welcome: create a planet (name, cloud tint), returning user, RU/EN switch, settings | ✅ |
| Canvas starfield with parallax, twinkling, nebulae, shooting stars, warp on transitions | ✅ |
| Years timeline (empty years clickable, "plant from the past" date picker) | ✅ |
| 12 floating cloud islands with vertical scroll, memory counters, quick navigation, parallax far clouds; future months sleep | ✅ |
| Garden of the month: empty state, 1–31 plants in 1–3 rows, panning for crowded months, labels, pollen and fireflies | ✅ |
| Memory form: date (any past day), story, photos (preview, remove, reorder), song (link or audio file) with honest descriptors | ✅ |
| Analysis: text (RU/EN lexicon with negation), photos (k-means colours, light), music (Web Audio: BPM, energy, dynamics) | ✅ |
| "Does this feel like your day?" — six mood sliders with a live flower preview, editable title, quote, privacy | ✅ |
| Procedural SVG flower: 7 petal shapes, layers, photo-derived colours, stem curve/kinks, leaves, glow, sway and pulse in the song's tempo, particles, textures | ✅ |
| Growing animation: seed → soil pulse → sprout → stem → leaves → petals → glow, timed by the song | ✅ |
| Interactive petals: photo viewer, story with quote and voice narration (Web Speech API), music player / official embeds | ✅ |
| "Why does my flower look like this?" explanation panel (text, photos, music, garden rules, DNA bars) | ✅ |
| Archive of all days, edit, safe date change, delete, privacy per memory | ✅ |
| Export: day folder ZIP (story.txt, memory.json, photos/, song, flower.svg) and standalone SVG | ✅ |
| Friends' planets **through files**: export (only what you opened), import with validation, visit years/months/gardens read-only | ✅ |
| Two interface languages (RU/EN), reduced-motion mode, mobile layout, browser Back button | ✅ |

## What is planned (not implemented)

- A server and accounts: friend requests by name or code, online visits, real-time updates (planets are exchanged as files today).
- Collaborative plants ("two stems from one root").
- Rearranging plants in a garden by hand.
- Real audio analysis of streaming links (services do not provide audio; the song is described by the user).
- Friends cannot open the "Why does my flower look like this?" panel on your shared days (the reasons are exported, but the panel is shown to the owner only).

---

## Project structure

```
index.html                 entry page (loads Google Fonts if online; falls back to system fonts)
vite.config.ts             Vite + Vitest config (port 5173, base './', tests in src/**/*.test.ts)
tsconfig.json              strict TypeScript, ES2020, react-jsx
package.json               scripts: dev, build, preview, typecheck, test
src/
  main.tsx, App.tsx        bootstrap, screen switching with transitions
  analysis/                lexicon.ts (RU/EN stems), text.ts (emotions, title, quote), photo.ts (k-means colours, light),
                           music.ts (Web Audio analysis, streaming-link helpers), dna.ts (merge → Memory DNA + reasons)
  plant/                   generate.ts (DNA → plant parameters), Plant.tsx (SVG renderer with growth), colors.ts, random.ts
  scenes/                  Sky.tsx (canvas starfield), Island.tsx (cloud island), Ambience.tsx (far clouds, pollen, fireflies), Planet.tsx
  screens/                 Welcome, Years, Months, Garden, MemoryView, CreateMemory, Friends, Archive, gardenLayout.ts
  data/                    types.ts, db.ts (IndexedDB), pipeline.ts (input → analysis → memory), exportDay.ts (ZIP/SVG),
                           planetFile.ts (export with privacy + import validation), narration.ts (voice), dates.ts,
                           monthState.ts, integrity.ts, seed.ts + demoPhotos.ts + demoAudio.ts (synthetic demo content)
  state/store.ts           zustand store: profile, memories, friends, navigation, toasts
  i18n/strings.ts          all UI strings (RU default, EN)
  styles/, scenes/*.css, plant/plant.css
scripts/                   e2e.mjs, viewport-sweep.mjs, demo-shots.mjs (playwright-core + system Chrome)
docs/                      USER-GUIDE.md, CONCEPT.md, ART.md, TOOLS.md, DEMO-SCRIPT.md, REPORT-2026-11-21.md, screenshots/
dist/                      production build (regenerate with npm run build)
```

## How an entry becomes a flower (short version)

1. **Text** → scores for warmth, cold, joy, sadness, calm, tension, energy, nostalgia, wonder, people, nature, night, relief; season; intensity; complexity. Matched words are kept as evidence.
2. **Photos** → dominant colours (k-means), brightness, contrast, saturation, warmth of light, hue variety, atmosphere.
3. **Music** → from a file: BPM (onset-envelope autocorrelation), energy (RMS in dB), dynamics, brightness (zero-crossing rate). From a link: title via oEmbed when reachable + the user's description (tempo, energy, mood, genre). The source is always labelled.
4. **Memory DNA** = weighted merge (`src/analysis/dna.ts`). Music leads movement, photos lead colour, text leads shape and light.
5. **Plant** (`src/plant/generate.ts`): petal shape by a vote of emotions; layers and petal count by complexity and joy; colours from harmonised photo colours; stem curve/kinks by calm/tension; glow by night, nostalgia, wonder; sway and pulse by the song's tempo; particles and texture by the leading emotion. The seed is derived from the memory id, so the flower never changes on reload.

More: [docs/CONCEPT.md](docs/CONCEPT.md), [docs/ART.md](docs/ART.md), [docs/USER-GUIDE.md](docs/USER-GUIDE.md).

## Submission materials

- Source and build: this folder (`npm run dev`) or `dist/` (static).
- Judges' walk-through: [QUICK-START.md](QUICK-START.md). Three-minute demo script: [docs/DEMO-SCRIPT.md](docs/DEMO-SCRIPT.md).
- Screenshots of the current build: `docs/screenshots/` (`01-welcome` … `14-garden-future`, three contrasting demo flowers `demo-flower-*.png`, `demo-flowers.json`).
- Final engineering report: [docs/REPORT-2026-11-21.md](docs/REPORT-2026-11-21.md).
- Verification of the submission ZIP on a fresh extraction (install, build, tests, launch, demo, browser checks): [docs/SUBMISSION-VERIFICATION-2026-11-21.md](docs/SUBMISSION-VERIFICATION-2026-11-21.md).

Demo content note: the seven demo memories use scenes painted on a canvas and audio synthesised in the browser, so no third-party photos or copyrighted music ship with the project. For a live presentation, plant your own authorised photos and a legally streamable song.
