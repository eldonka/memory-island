# Memory Island — Quick Start for Judges

Five minutes from ZIP to your first flower. No technical background needed.
UI labels are given as **«Russian»** / **English** — the app starts in Russian; step 4 shows how to switch.

## 1. Extract the ZIP

Right-click `Memory-Island-Genesis-2026.zip` → **Extract All…** (Windows) or double-click it (macOS). You get a folder named `memory-island`.

## 2. Install dependencies (once)

You need **Node.js 20 or 22** (check with `node --version`; download from https://nodejs.org if needed).

Open a terminal inside the `memory-island` folder (Windows: Shift + right-click in the folder → *Open PowerShell window here*) and run:

```bash
npm ci
```

This downloads the libraries listed in `package-lock.json` (≈ 1–2 minutes, internet required only for this step).

## 3. Run the project

```bash
npm run dev
```

Keep this terminal open. It prints a line like `Local: http://localhost:5173/`.
If port 5173 is busy, Vite picks the next free port and prints that URL instead.

## 4. Open the application

Open the printed address (normally **http://localhost:5173/**) in Google Chrome or Microsoft Edge.

1. You see a starry sky and the planet.
2. Optional: click **EN** in the top-right corner to switch the interface to English.
3. Type a planet name (or leave it empty), pick a cloud tint, and click **«Войти в мой мир»** / **Enter My World**.
4. You land on the **Years** screen. Click **«К планете»** / **To Planet** (top-left) to go back to the planet screen for the next step.

## 5. Load the demo memories

1. On the planet screen click the **⚙ gear** in the top-right corner (it appears once the planet exists).
2. Click **«Загрузить демо-воспоминания»** / **Load demo memories**. The button shows "…" for a few seconds while seven days are analysed through the real pipeline.
3. A message appears: **«Демо-воспоминания посажены.»** / **Demo memories planted.** The planet now shows **7 memories**.

The demo contains seven contrasting days of 2026 (a calm sunrise at the sea, a stressful deadline night, a birthday party, a rainy sad walk, a hike, a winter evening at grandma's, an autumn walk). Their "photographs" are painted scenes and the music is synthesised in the browser, so nothing copyrighted is included.

## 6. Navigate from the planet to a garden

1. Click **«Моя планета»** / **My Planet** (or click the planet itself).
2. **Years:** click **2026** (the glowing orb with miniature flowers).
3. **Months:** scroll the twelve floating cloud islands with the mouse wheel. Islands with memories have more flowers and lights; December is dimmed because it is still ahead. Click the **«Ноябрь»** / **November** island.
4. **Garden:** three flowers stand on the island — very different shapes for very different days. Hover over a flower to see the title of its day.

## 7. Open and explore a flower

1. Click the purple, lush flower (**«Яркий день рождения с друзьями»** / the birthday). The screen zooms into the memory.
2. Three round petal buttons float around the bloom:
   - **«Фотографии»** / **Photographs** — browse the pictures with the ‹ › arrows.
   - **«История»** / **Story** — the day's title, the quote picked from the user's own words, the full story, and **«Озвучить»** / **Listen** for voice narration (if your browser has a voice installed).
   - **«Музыка»** / **Music** — the player with the measured tempo (≈124 BPM). Notice the flower sways and its glow pulses in the song's rhythm.
3. Click **«Почему мой цветок такой?»** / **Why does my flower look like this?** (top-right). The panel lists the Memory DNA bars and every rule that shaped the flower: warm words → warmer palette, joy → more petal layers and confetti, photo colours → petal colours, 124 BPM → pulse period.
4. Click **«В сад»** / **Back to Garden** and open the other two flowers (the stressful night has a kinked stem and sharp angular petals; the autumn walk has soft rounded petals).

## 8. Create your own memory

You need: any image file (JPG/PNG) and either a song link (Spotify / YouTube / SoundCloud / Apple Music) or an audio file (MP3/WAV).
Tip: if you have no files at hand, open a demo flower and click **«Скачать папку дня»** / **Download day folder** — the ZIP contains `photos/*.jpg` and a `.wav` you can reuse.

1. In a garden of a past or current month (for example October 2026) click **«Посадить воспоминание»** / **Plant a Memory** and pick a free date in the calendar that opens (an empty garden shows **«Посадить первое воспоминание»** / **Plant Your First Memory** instead).
2. Write 3–5 sentences about the day (Russian or English — both are understood). Try words like *quiet, warm, friends, rain, deadline, laughed*.
3. **«Добавить фото»** / **Add photos** → choose one or more pictures. Use × to remove, ‹ › to reorder.
4. Music: keep the **«Ссылка»** / **Link** tab and paste a link, then move the **Tempo** and **Energy** sliders and pick a **Mood** (the app cannot download audio from a link, so it asks you honestly). Or switch to **«Аудиофайл»** / **Audio file** and upload a file — tempo and energy are then measured automatically.
5. Click **«Вырастить воспоминание»** / **Grow My Memory**. Three stages run: reading the story, looking at the photographs, listening to the music.
6. **«Это похоже на твой день?»** / **Does this feel like your day?** — a preview of the flower appears with six mood sliders. Move **Спокойствие** / **Calmness** or **Напряжение** / **Tension**: the flower changes immediately. Edit the generated title if you like, choose privacy (default **«Только я»** / **Private**).
7. Click **«Посадить»** / **Plant it**. The screen returns to the garden, a seed falls, and the plant grows stem → leaves → petals → glow in the tempo of your song. When the message **«Воспоминание выросло. Коснись цветка.»** / **Your memory has grown. Touch the flower.** appears, click the new flower.

Reload the page: everything is still there (stored in your browser's IndexedDB, nothing is sent anywhere).

## 9. Test the offline planet sharing

There is no server: planets travel as files, and only what you opened to friends leaves your planet.

1. Open a demo memory, and note the privacy selector at the bottom: **«Приватность: Открыто друзьям»** / **Privacy: Shared**. (Among the demo days: 3 are *Shared*, 2 are *Garden only*, 2 are *Private*.)
2. Go back to the planet screen (**«К планете»** / **To Planet** twice, or the browser Back button) and click **«Планеты друзей»** / **Friends' Planets**.
3. Click **«Экспортировать мою планету»** / **Export my planet**. A file `<Planet name>.island.json` is downloaded, and a message says how many memories were exported (**5** with the demo: the 2 private days stay home).
4. Click **«Импортировать планету друга»** / **Import a friend's planet** and choose the file you just downloaded (on a real exchange your friend would send you their file). A card appears with the planet name, memory count and code.
5. Click **«Отправиться»** / **Visit**. You are now a guest (chip **«В гостях: …»** / **Visiting: …**): open 2026 → November → the garden shows the three November flowers.
   - The birthday and autumn flowers (*Shared*) open with photographs, story and music.
   - The deadline flower (*Garden only*) shows **«Этот день остался приватным. Видно только цветок.»** / **This day stayed private. Only the flower is visible.** — no text, photos, music or even mood values travelled in the file.
   - The rainy day and the winter evening (*Private*) are not in the file at all.
6. Return home with **«Моя планета»** / **My Planet** on the Years screen.

To see the import as a real second person, open the printed URL in another browser (for example Firefox or an incognito window) and import the file there.

## Reset

⚙ → **«Стереть всё»** / **Erase everything** removes the planet, all memories and imported friends from this browser. Loading the demo again re-plants the same seven days.

## If something goes wrong

- `npm` is not recognised → install Node.js 20/22 and reopen the terminal.
- PowerShell says *running scripts is disabled* → run `npm.cmd ci` and `npm.cmd run dev` instead, or `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` once.
- The page is blank or old → make sure you opened the URL printed by `npm run dev`, then press Ctrl+F5.
- More in [docs/USER-GUIDE.md → Troubleshooting](docs/USER-GUIDE.md#12-troubleshooting).

Full documentation: [README.md](README.md) · [docs/USER-GUIDE.md](docs/USER-GUIDE.md) · three-minute demo script: [docs/DEMO-SCRIPT.md](docs/DEMO-SCRIPT.md).
