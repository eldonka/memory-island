// ============================================================
// Demo memories — 7 contrasting days that go through the SAME pipeline
// as user input (analysis → DNA → plant). Photos are painted scenes and
// audio is synthesized, so nothing copyrighted or private ships with the demo.
// ============================================================
import type { Lang, Memory, PhotoRef, Privacy } from './types';
import { sceneBlob, type Scene } from './demoPhotos';
import { synthTrack } from './demoAudio';
import { analyzeInput, composeMemory, persistAnalysisAssets, type MusicInput } from './pipeline';
import { putBlob } from './db';
import { makeThumb } from '../analysis/photo';

interface DemoDef {
  id: string; date: string; privacy: Privacy;
  scenes: [Scene, number][];
  music: { kind: 'synth'; bpm: number; energy: number; mode: 'major' | 'minor'; brightness: number; mood: 'bright' | 'melancholic' | 'mixed'; genre: string; name: string }
       | { kind: 'link'; url: string; title: string; tempo: number; energy: number; mood: 'bright' | 'melancholic' | 'mixed'; genre: string };
  story: Record<Lang, string>;
}

const DEMOS: DemoDef[] = [
  {
    id: 'demo_autumn', date: '2026-11-14', privacy: 'shared',
    scenes: [['autumn_park', 1], ['autumn_park', 2], ['autumn_park', 3]],
    music: { kind: 'synth', bpm: 72, energy: 0.25, mode: 'major', brightness: 0.3, mood: 'bright', genre: 'jazz ballad', name: 'warm-ballad-72.wav' },
    story: {
      ru: 'Гуляли с подругой по парку, всё в жёлтых листьях. Было холодно, но мы пили какао из бумажных стаканчиков и долго разговаривали обо всём: о детстве, о том, как раньше гуляли здесь после школы. Солнце садилось медленно, свет был тёплый и мягкий. Казалось, что время остановилось. Хочется помнить этот вечер.',
      en: 'Walked through the park with my best friend, everything covered in yellow leaves. It was cold, but we drank cocoa from paper cups and talked for a long time about everything: about childhood, about how we used to walk here after school. The sun set slowly, the light was warm and soft. It felt like time had stopped. I want to remember this evening.',
    },
  },
  {
    id: 'demo_deadline', date: '2026-11-18', privacy: 'garden',
    scenes: [['office_night', 1], ['office_night', 2]],
    music: { kind: 'synth', bpm: 140, energy: 0.85, mode: 'minor', brightness: 0.8, mood: 'mixed', genre: 'electronic', name: 'night-drive-140.wav' },
    story: {
      ru: 'Ночь в офисе перед сдачей проекта. Дедлайн в девять утра, а в полночь нашли баг, который ломал всё. Стресс, холодный кофе, нервы, в наушниках быстрая электронная музыка. Монитор светит в темноте, за окном город спит. В 6:40 всё наконец заработало. Сдали. Выдохнули. Усталость и странное облегчение одновременно.',
      en: 'Night at the office before the project deadline. Due at nine in the morning, and at midnight we found a bug that broke everything. Stress, cold coffee, nerves, fast electronic music in my headphones. The monitor glowing in the dark, the city asleep outside. At 6:40 it finally worked. Submitted. Exhaled. Exhaustion and a strange relief at the same time.',
    },
  },
  {
    id: 'demo_birthday', date: '2026-11-07', privacy: 'shared',
    scenes: [['party', 1], ['party', 2], ['party', 3]],
    music: { kind: 'synth', bpm: 124, energy: 0.9, mode: 'major', brightness: 0.7, mood: 'bright', genre: 'pop', name: 'confetti-124.wav' },
    story: {
      ru: 'День рождения! Друзья устроили сюрприз: торт со свечами, гирлянды, громкая музыка. Мы танцевали до двух ночи, смеялись до слёз и фотографировались на каждом углу. Так много людей, которых я люблю, в одной комнате. Счастье. Ура!',
      en: 'Birthday! My friends threw a surprise: a cake with candles, string lights, loud music. We danced until two in the morning, laughed until we cried and took pictures everywhere. So many people I love in one room. Happiness. Yay!',
    },
  },
  {
    id: 'demo_rain', date: '2026-10-25', privacy: 'private',
    scenes: [['rain_city', 1], ['rain_city', 2]],
    music: { kind: 'link', url: 'https://open.spotify.com/search/Frank%20Sinatra%20In%20the%20Wee%20Small%20Hours', title: 'Frank Sinatra — In the Wee Small Hours', tempo: 0.15, energy: 0.2, mood: 'melancholic', genre: 'jazz' },
    story: {
      ru: 'Весь день шёл дождь. Ходил один по городу, серые улицы, мокрые фонари, кафе с запотевшими окнами. Было грустно и тихо. Скучаю по тем, кого уже нет рядом. Вспомнил, как мы когда-то бегали здесь под дождём и смеялись. Теперь просто медленно иду и слушаю, как шумит вода.',
      en: 'It rained all day. I walked alone through the city, grey streets, wet lanterns, cafés with fogged windows. It was sad and quiet. I miss the people who are no longer around. I remembered how we used to run here in the rain and laugh. Now I just walk slowly and listen to the water.',
    },
  },
  {
    id: 'demo_sea', date: '2026-10-03', privacy: 'shared',
    scenes: [['sea_morning', 1], ['sea_morning', 2]],
    music: { kind: 'synth', bpm: 60, energy: 0.15, mode: 'major', brightness: 0.5, mood: 'bright', genre: 'ambient', name: 'sea-ambient-60.wav' },
    story: {
      ru: 'Проснулись в пять утра и пошли к морю встречать рассвет. Небо было розовое, потом золотое, невероятно красиво. Тихо, только волны и птицы. Пили чай из термоса, молчали. Удивительное спокойствие и ощущение, что мир огромный и добрый.',
      en: 'We woke up at five in the morning and went to the sea to watch the sunrise. The sky was pink, then golden, incredibly beautiful. Quiet, only waves and birds. We drank tea from a thermos and kept silent. An amazing calm and the feeling that the world is vast and kind.',
    },
  },
  {
    id: 'demo_hike', date: '2026-09-12', privacy: 'garden',
    scenes: [['mountain_sunset', 1], ['mountain_sunset', 2], ['mountain_sunset', 3]],
    music: { kind: 'link', url: 'https://music.youtube.com/search?q=Sigur+R%C3%B3s+Hoppipolla', title: 'Sigur Rós — Hoppípolla', tempo: 0.55, energy: 0.65, mood: 'bright', genre: 'post-rock' },
    story: {
      ru: 'Поход в горы с командой. Шли быстро, спорили, смеялись, бежали наперегонки к вершине. Наверху ветер и закат на всё небо — вау, просто вау. Устали так, что ноги гудели, но было ощущение, что можем всё. Спустились уже в темноте под звёздами.',
      en: 'A hike in the mountains with the team. We walked fast, argued, laughed, raced each other to the top. Up there the wind and a sunset across the whole sky — wow, just wow. So tired our legs buzzed, but it felt like we could do anything. We came down in the dark under the stars.',
    },
  },
  {
    id: 'demo_snow', date: '2026-01-02', privacy: 'private',
    scenes: [['snow_evening', 1], ['snow_evening', 2]],
    music: { kind: 'synth', bpm: 90, energy: 0.3, mode: 'major', brightness: 0.35, mood: 'bright', genre: 'folk waltz', name: 'winter-waltz-90.wav' },
    story: {
      ru: 'Зимний вечер у бабушки. За окном снег, в доме тепло, пахнет пирогами. Сидели у печки под пледом, бабушка рассказывала старые истории о детстве мамы. Кот спал на коленях. Так уютно и так по-домашнему, будто мне снова восемь лет.',
      en: 'A winter evening at grandma’s. Snow outside, warm inside, the smell of pies. We sat by the stove under a blanket while grandma told old stories about mom’s childhood. The cat slept on my lap. So cozy and homely, as if I were eight years old again.',
    },
  },
];

export async function seedDemo(lang: Lang): Promise<Memory[]> {
  const out: Memory[] = [];
  for (let i = 0; i < DEMOS.length; i++) {
    const d = DEMOS[i];
    const photos: PhotoRef[] = [];
    for (let k = 0; k < d.scenes.length; k++) {
      const [scene, variant] = d.scenes[k];
      const { blob, width, height } = await sceneBlob(scene, variant);
      const id = `${d.id}_p${k}`;
      await putBlob(id, blob);
      const th = await makeThumb(blob, 1000, 0.84);
      photos.push({ id, name: `${scene}_${variant}.jpg`, width, height, thumb: th.dataUrl });
    }
    let music: MusicInput;
    if (d.music.kind === 'synth') {
      const blob = synthTrack({ bpm: d.music.bpm, energy: d.music.energy, mode: d.music.mode, brightness: d.music.brightness, seed: i + 11 });
      music = { kind: 'file', file: blob, fileName: d.music.name, title: d.music.name.replace('.wav', ''), descriptors: { tempo: (d.music.bpm - 60) / 120, energy: d.music.energy, mood: d.music.mood, genre: d.music.genre } };
    } else {
      music = { kind: 'link', url: d.music.url, title: d.music.title, descriptors: { tempo: d.music.tempo, energy: d.music.energy, mood: d.music.mood, genre: d.music.genre } };
    }
    const analysis = await analyzeInput(d.story[lang], photos, music);
    await persistAnalysisAssets(analysis);
    const m = composeMemory({ id: d.id, date: d.date, story: d.story[lang], photos, analysis, visual: analysis.visual, title: analysis.titleAuto, privacy: d.privacy, userAdjusted: false });
    out.push(m);
  }
  return out;
}

/**
 * Dev/test helper: plant `count` memories into the given month (YYYY-MM) through the
 * real pipeline (text → DNA → plant) with one painted photo each and link music.
 * Exposed as window.__mi.seedStress in development builds only.
 */
export async function seedStress(yearMonth: string, count: number, lang: Lang = 'ru'): Promise<Memory[]> {
  const out: Memory[] = [];
  const scenes: Scene[] = ['autumn_park', 'office_night', 'party', 'rain_city', 'sea_morning', 'mountain_sunset', 'snow_evening'];
  for (let day = 1; day <= Math.min(31, count); day++) {
    const d = DEMOS[day % DEMOS.length];
    const scene = scenes[day % scenes.length];
    const { blob, width, height } = await sceneBlob(scene, day);
    const id = `stress_${yearMonth}_${day}`;
    await putBlob(`${id}_p0`, blob);
    const th = await makeThumb(blob, 600, 0.8);
    const photos: PhotoRef[] = [{ id: `${id}_p0`, name: `${scene}.jpg`, width, height, thumb: th.dataUrl }];
    const music: MusicInput = { kind: 'link', url: 'https://open.spotify.com/search/demo', title: 'demo link', descriptors: { tempo: (day % 10) / 10, energy: ((day * 3) % 10) / 10, mood: (['bright', 'mixed', 'melancholic'] as const)[day % 3], genre: '' } };
    const story = `${d.story[lang]} (${day})`;
    const analysis = await analyzeInput(story, photos, music);
    const date = `${yearMonth}-${String(day).padStart(2, '0')}`;
    out.push(composeMemory({ id, date, story, photos, analysis, visual: analysis.visual, title: analysis.titleAuto, privacy: 'private', userAdjusted: false }));
  }
  return out;
}
