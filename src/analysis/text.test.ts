import { describe, it, expect } from 'vitest';
import { analyzeText, generateTitle, extractQuote, tokenizeClauses } from './text';

const wc = (s: string) => s.trim().split(/\s+/).length;

describe('negation handling', () => {
  it('RU: plain positive statement scores joy', () => {
    const f = analyzeText('Я была счастлива весь день.');
    expect(f.joy).toBeGreaterThan(0.3);
    expect(f.sadness).toBeLessThan(0.15);
  });
  it('RU: negated happiness does not score joy, leans to sadness', () => {
    const f = analyzeText('Я не была счастлива в тот день.');
    expect(f.joy).toBeLessThan(0.1);
    expect(f.sadness).toBeGreaterThan(0.2);
    expect(f.matched.sadness).toContain('не счастлива');
  });
  it('RU: "совсем не радовалась" is negated', () => {
    const f = analyzeText('Я совсем не радовалась подарку.');
    expect(f.joy).toBeLessThan(0.1);
    expect(f.sadness).toBeGreaterThan(0.2);
  });
  it('EN: "I was not happy" is negated', () => {
    const f = analyzeText('I was not happy that evening.');
    expect(f.joy).toBeLessThan(0.1);
    expect(f.sadness).toBeGreaterThan(0.2);
  });
  it('EN: "I did not feel calm" flows to tension', () => {
    const f = analyzeText('I did not feel calm at all.');
    expect(f.calm).toBeLessThan(0.1);
    expect(f.tension).toBeGreaterThan(0.2);
  });
  it("EN: contractions (wasn't) negate", () => {
    const f = analyzeText("It wasn't a happy day.");
    expect(f.joy).toBeLessThan(0.1);
  });
  it('negation does not cross a clause boundary', () => {
    const f = analyzeText('Не хотелось уходить, но было счастливо и тепло.');
    expect(f.joy).toBeGreaterThan(0.3);
    const g = analyzeText('No, it was a happy evening.');
    expect(g.joy).toBeGreaterThan(0.3);
  });
  it('mixed emotions survive', () => {
    const f = analyzeText('Было радостно, но немного грустно прощаться.');
    expect(f.joy).toBeGreaterThan(0.2);
    expect(f.sadness).toBeGreaterThan(0.2);
  });
  it('idiom "смеялись до слёз" is laughter, not sadness', () => {
    const f = analyzeText('Мы смеялись до слёз весь вечер.');
    expect(f.joy).toBeGreaterThan(0.3);
    expect(f.sadness).toBeLessThan(0.1);
  });
  it('normal positive story is unaffected by negation logic', () => {
    const f = analyzeText('Мы танцевали, смеялись и обнимались. Счастье!');
    expect(f.joy).toBeGreaterThan(0.6);
    expect(f.sadness).toBeLessThan(0.1);
  });
  it('clause tokenizer breaks on punctuation and contrastive conjunctions', () => {
    const t = tokenizeClauses('не плохо, но грустно. хорошо');
    expect(t.map((x: { c: number }) => x.c)).toEqual([0, 0, 2, 3]);
  });
});

const RU = {
  autumn: 'Гуляли с подругой по парку, всё в жёлтых листьях. Было холодно, но мы пили какао из бумажных стаканчиков и долго разговаривали обо всём: о детстве, о том, как раньше гуляли здесь после школы. Солнце садилось медленно, свет был тёплый и мягкий. Казалось, что время остановилось. Хочется помнить этот вечер.',
  deadline: 'Ночь в офисе перед сдачей проекта. Дедлайн в девять утра, а в полночь нашли баг, который ломал всё. Стресс, холодный кофе, нервы, в наушниках быстрая электронная музыка. Монитор светит в темноте, за окном город спит. В 6:40 всё наконец заработало. Сдали. Выдохнули. Усталость и странное облегчение одновременно.',
  birthday: 'День рождения! Друзья устроили сюрприз: торт со свечами, гирлянды, громкая музыка. Мы танцевали до двух ночи, смеялись до слёз и фотографировались на каждом углу. Так много людей, которых я люблю, в одной комнате. Счастье. Ура!',
  rain: 'Весь день шёл дождь. Ходил один по городу, серые улицы, мокрые фонари, кафе с запотевшими окнами. Было грустно и тихо. Скучаю по тем, кого уже нет рядом. Вспомнил, как мы когда-то бегали здесь под дождём и смеялись. Теперь просто медленно иду и слушаю, как шумит вода.',
  sea: 'Проснулись в пять утра и пошли к морю встречать рассвет. Небо было розовое, потом золотое, невероятно красиво. Тихо, только волны и птицы. Пили чай из термоса, молчали. Удивительное спокойствие и ощущение, что мир огромный и добрый.',
  hike: 'Поход в горы с командой. Шли быстро, спорили, смеялись, бежали наперегонки к вершине. Наверху ветер и закат на всё небо — вау, просто вау. Устали так, что ноги гудели, но было ощущение, что можем всё. Спустились уже в темноте под звёздами.',
  snow: 'Зимний вечер у бабушки. За окном снег, в доме тепло, пахнет пирогами. Сидели у печки под пледом, бабушка рассказывала старые истории о детстве мамы. Кот спал на коленях. Так уютно и так по-домашнему, будто мне снова восемь лет.',
};
const EN = {
  autumn: 'Walked through the park with my best friend, everything covered in yellow leaves. It was cold, but we drank cocoa from paper cups and talked for a long time about everything: about childhood, about how we used to walk here after school. The sun set slowly, the light was warm and soft. It felt like time had stopped. I want to remember this evening.',
  deadline: 'Night at the office before the project deadline. Due at nine in the morning, and at midnight we found a bug that broke everything. Stress, cold coffee, nerves, fast electronic music in my headphones. The monitor glowing in the dark, the city asleep outside. At 6:40 it finally worked. Submitted. Exhaled. Exhaustion and a strange relief at the same time.',
  birthday: 'Birthday! My friends threw a surprise: a cake with candles, string lights, loud music. We danced until two in the morning, laughed until we cried and took pictures everywhere. So many people I love in one room. Happiness. Yay!',
};

describe('title generation', () => {
  const title = (s: string) => generateTitle(s, analyzeText(s));
  it('produces natural Russian titles grounded in the story', () => {
    expect(title(RU.autumn)).toBe('Долгая прогулка в парке с подругой');
    expect(title(RU.deadline)).toBe('Ночь в офисе и дедлайн');
    expect(title(RU.birthday)).toBe('Яркий день рождения с друзьями');
    expect(title(RU.rain)).toBe('Холодный город и дождь');
    expect(title(RU.sea)).toBe('Тихое утро у моря и рассвет');
    expect(title(RU.hike)).toBe('Поход в горах с командой');
    expect(title(RU.snow)).toBe('Зимний вечер с бабушкой');
  });
  it('produces natural English titles', () => {
    expect(title(EN.autumn)).toBe('Walk in the Park with a Friend');
    expect(title(EN.deadline)).toBe('Night at the Office and a Deadline');
    expect(title(EN.birthday)).toBe('Bright Birthday with Friends');
  });
  it('always yields 3–7 words, even for thin input', () => {
    for (const s of ['Просто обычный день, ничего особенного.', 'Ок.', 'Кофе.', 'A quiet day.', 'We went to the lake and the mountains and the forest with friends and family and the dog for the whole weekend.', '!!!', 'Снова дождь и снова работа, и снова дождь.']) {
      const n = wc(title(s));
      expect(n, s).toBeGreaterThanOrEqual(3);
      expect(n, s).toBeLessThanOrEqual(7);
    }
  });
  it('never ends with a dangling conjunction and has no duplicate words', () => {
    const t = title('Снова дождь и снова работа, и снова дождь.');
    expect(/\s(и|and)$/i.test(t)).toBe(false);
    const words = t.toLowerCase().split(' ');
    expect(new Set(words).size).toBe(words.length);
  });
  it('does not invent people: no "с друзьями" when nobody is mentioned', () => {
    expect(title(RU.rain)).not.toMatch(/с друзьями|с подругой/);
  });
});

describe('quote extraction', () => {
  it('returns an original sentence', () => {
    const q = extractQuote(RU.autumn);
    expect(RU.autumn).toContain(q.replace(/\.$/, ''));
  });
});
