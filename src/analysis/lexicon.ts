// ============================================================
// Bilingual (RU/EN) emotional & thematic lexicon.
// Entries are lowercase stems; a token matches when it starts with the stem.
// A trailing "$" means exact match only (short function words).
// ============================================================

export type Category =
  | 'warmth' | 'cold' | 'joy' | 'sadness' | 'calm' | 'tension' | 'energy'
  | 'nostalgia' | 'wonder' | 'social' | 'nature' | 'night' | 'morning'
  | 'relief' | 'work' | 'city';

export const LEXICON: Record<Category, string[]> = {
  warmth: [
    'тепл', 'тёпл', 'уют', 'какао', 'чай', 'кофе', 'обним', 'обня', 'любл', 'любов', 'люби', 'дом$', 'дома$', 'домой', 'свеч', 'солн', 'мягк', 'нежн',
    'плед', 'камин', 'печень', 'пирог', 'ужин', 'забот', 'родн', 'ласков', 'согре', 'улыбн',
    'warm', 'cozy', 'cosy', 'cocoa', 'tea$', 'coffee', 'hug', 'love', 'home$', 'candle', 'sun', 'soft', 'gentle', 'blanket',
    'fireplace', 'dinner', 'baked', 'cuddle', 'tender', 'sweet',
  ],
  cold: [
    'холод', 'мороз', 'снег', 'лёд', 'лед$', 'ледян', 'дожд', 'ветер', 'ветр', 'серый', 'серая', 'серое', 'серые', 'сероват', 'серост', 'слякот', 'промок', 'замёрз', 'замерз', 'туман', 'пасмурн',
    'cold', 'frost', 'snow', 'ice$', 'icy', 'rain', 'wind', 'gray', 'grey', 'fog', 'chill', 'freez', 'overcast', 'sleet',
  ],
  joy: [
    'смея', 'смех', 'смеш', 'радост', 'радова', 'радуе', 'радуй', 'рад$', 'рада$', 'рады$', 'счаст', 'весел', 'праздн', 'танц', 'ура', 'улыб', 'восторг', 'класс', 'кайф', 'обожа', 'подар', 'торт', 'день рождения', 'поздрав', 'победи', 'выигра',
    'laugh', 'happy', 'happi', 'joy', 'glad', 'enjoy', 'fun$', 'funny', 'party', 'danc', 'celebrat', 'smile', 'delight', 'awesome', 'amazing', 'cake', 'birthday', 'gift', 'won$', 'win$', 'cheer', 'giggl', 'yay',
  ],
  sadness: [
    'груст', 'печал', 'слёз', 'слез', 'плак', 'тоск', 'одинок', 'скуча', 'потер', 'прощ', 'расста', 'больн', 'боль$', 'тяжел', 'тяжёл', 'пустот', 'пусто$', 'пустой', 'пустая', 'жалко', 'жаль$', 'уныл', 'хмур',
    'sad', 'cry', 'cried', 'tear', 'lonely', 'alone', 'miss', 'lost', 'goodbye', 'grief', 'hurt', 'heavy', 'empty', 'sorrow', 'gloom', 'blue$', 'farewell',
  ],
  calm: [
    'спокой', 'тих', 'тиш', 'медлен', 'мирн', 'отдых', 'неспеш', 'лениво', 'лень', 'расслаб', 'плавн', 'покой', 'умиротвор', 'дыша', 'дыхан', 'ленив', 'долго', 'медленно',
    'calm', 'quiet', 'slow', 'peace', 'rest', 'still', 'lazy', 'relax', 'serene', 'tranquil', 'breath', 'unhurried', 'gently', 'linger',
  ],
  tension: [
    'стресс', 'дедлайн', 'срочн', 'нерв', 'тревог', 'устал', 'устав', 'давлен', 'напряж', 'паник', 'боя', 'страх', 'страшн', 'волнова', 'волнен', 'сжат', 'торопи', 'спеш', 'опозд', 'ошиб', 'баг', 'не успе', 'ночь в офисе', 'сдач', 'экзамен', 'злил', 'злюсь', 'раздраж', 'бессон', 'измот',
    'stress', 'deadline', 'urgent', 'nervous', 'anxi', 'tired', 'pressure', 'tense', 'panic', 'fear', 'afraid', 'worri', 'rush', 'late$', 'mistake', 'bug', 'exam', 'angry', 'frustrat', 'sleepless', 'exhaust', 'overwhelm', 'hurry',
  ],
  energy: [
    'бег', 'бежа', 'быстр', 'громк', 'прыг', 'крич', 'танц', 'спорт', 'драйв', 'энерг', 'шумн', 'скака', 'носил', 'гонк', 'вело', 'трениров', 'концерт', 'бас$', 'басы$', 'басов', 'качал', 'толпа', 'движ',
    'run', 'ran$', 'fast', 'loud', 'jump', 'shout', 'danc', 'sport', 'drive', 'energy', 'energetic', 'noisy', 'race', 'bike', 'workout', 'concert', 'bass', 'crowd', 'rush', 'wild',
  ],
  nostalgia: [
    'вспомн', 'вспомин', 'помн', 'детств', 'давно', 'когда-то', 'стар', 'прошл', 'снова', 'как раньше', 'раньше', 'ностальг', 'юност', 'школ', 'бабушк', 'дедушк', 'плёнк', 'пленк', 'фотоальбом', 'как в детстве', 'как будто', 'словно',
    'remember', 'childhood', 'long ago', 'old$', 'past', 'again', 'used to', 'nostalg', 'youth', 'school', 'grandma', 'grandpa', 'film$', 'album', 'like when', 'as if', 'back then', 'memor',
  ],
  wonder: [
    'удивит', 'волшеб', 'чудо', 'чудес', 'звёзд', 'звезд', 'красив', 'невероятн', 'вау', 'восхищ', 'магич', 'сказочн', 'ошеломл', 'небо', 'северное сияние', 'закат', 'рассвет', 'огромн', 'бесконечн',
    'wow', 'magic', 'wonder', 'amazing', 'stars', 'starry', 'beautiful', 'incredible', 'breathtaking', 'awe', 'sky', 'aurora', 'sunset', 'sunrise', 'vast', 'infinite', 'dreamlike',
  ],
  social: [
    'друг$', 'друга$', 'другу$', 'другом$', 'друзья', 'друзей', 'друзьям', 'друзьями', 'подруг', 'друж', 'мама$', 'мамой', 'маме$', 'маму$', 'мамы$', 'мамин', 'папа$', 'папой', 'папе$', 'папу$', 'папин', 'брат$', 'брата$', 'брату$', 'братом', 'братья', 'братишк', 'сестр', 'семь', 'вместе', 'компани', 'мы$', 'нас$', 'ребят', 'девушк', 'парн', 'любим', 'коллег', 'команд', 'гост', 'встрет', 'встреч', 'разговар', 'разговор', 'болта', 'обсужда', 'смеялись',
    'friend', 'mom', 'mum', 'dad', 'brother', 'sister', 'family', 'together', 'we$', 'us$', 'guys', 'girlfriend', 'boyfriend', 'partner', 'colleague', 'team', 'guest', 'met$', 'meeting', 'talk', 'chat', 'convers',
  ],
  nature: [
    'парк', 'лес$', 'лесу$', 'леса$', 'лесн', 'лист', 'дерев', 'море$', 'морю$', 'моря$', 'морем', 'морск', 'река$', 'реке$', 'реки$', 'реку$', 'речк', 'озер', 'озёр', 'горы$', 'горах', 'гора$', 'гору$', 'горам', 'горн', 'цвет', 'трав', 'поле$', 'полян', 'сад$', 'саду$', 'сады$', 'садик', 'птиц', 'ветк', 'тропин', 'пляж', 'волн', 'песок', 'облак', 'поле',
    'park', 'forest', 'wood', 'leaf', 'leaves', 'tree', 'sea$', 'ocean', 'river', 'lake', 'mountain', 'hill', 'flower', 'grass', 'garden', 'bird', 'branch', 'trail', 'beach', 'wave', 'sand', 'cloud', 'field', 'meadow',
  ],
  night: [
    'ночь', 'ноч', 'вечер', 'темн', 'тёмн', 'луна', 'лунн', 'звёзд', 'звезд', 'фонар', 'полноч', 'поздно', 'сумер', 'закат',
    'night', 'evening', 'dark', 'moon', 'lantern', 'midnight', 'late$', 'dusk', 'sunset', 'starlight',
  ],
  morning: [
    'утр', 'рассвет', 'проснул', 'завтрак', 'ранн', 'роса',
    'morning', 'dawn', 'sunrise', 'woke', 'breakfast', 'early', 'dew',
  ],
  relief: [
    'наконец', 'облегч', 'сдал', 'сдали', 'получилось', 'справил', 'закончил', 'выдохну', 'отпустил', 'готово', 'успели', 'успел', 'победа', 'прошло', 'отправил',
    'finally', 'relief', 'reliev', 'done$', 'made it', 'succeed', 'submitted', 'finished', 'exhale', 'let go', 'over$', 'completed', 'shipped', 'passed',
  ],
  work: [
    'работ', 'проект', 'офис', 'учёб', 'учеб', 'экзамен', 'лекци', 'код', 'презентац', 'задач', 'отчёт', 'отчет', 'клиент', 'встреча', 'ноутбук', 'монитор', 'кофеин', 'хакатон', 'стартап', 'дипл', 'курсов', 'сессия',
    'work', 'project', 'office', 'study', 'exam', 'lecture', 'code', 'coding', 'presentation', 'task', 'report', 'client', 'laptop', 'monitor', 'caffeine', 'hackathon', 'startup', 'thesis', 'homework',
  ],
  city: [
    'город', 'улиц', 'кафе', 'метро', 'трамва', 'автобус', 'такси', 'площад', 'витрин', 'бар$', 'ресторан', 'кинотеатр', 'кино$', 'магазин', 'мост', 'набережн',
    'city', 'street', 'cafe', 'café', 'metro', 'subway', 'tram', 'bus$', 'taxi', 'square', 'bar$', 'restaurant', 'cinema', 'movie', 'shop', 'bridge', 'downtown', 'embankment',
  ],
};

export const SEASON_STEMS: Record<Exclude<import('../data/types').Season, null>, string[]> = {
  autumn: ['осен', 'сентябр', 'октябр', 'ноябр', 'листопад', 'autumn', 'fall$', 'september', 'october', 'november'],
  winter: ['зим', 'декабр', 'январ', 'феврал', 'снег', 'снежн', 'мороз', 'winter', 'december', 'january', 'february', 'snow'],
  spring: ['весн', 'весен', 'март', 'апрел', 'май$', 'мае$', 'цветени', 'spring', 'march', 'april', 'may$', 'blossom'],
  summer: ['лето$', 'летом', 'лета$', 'летн', 'июн', 'июл', 'август', 'жара', 'жарк', 'summer', 'june', 'july', 'august', 'heat'],
};

export const INTENSIFIERS = ['очень', 'так', 'такой', 'такая', 'такое', 'безумно', 'невероятно', 'ужасно', 'страшно', 'жутко', 'дико', 'совсем', 'абсолютно', 'сильно',
  'very', 'so$', 'such', 'extremely', 'incredibly', 'absolutely', 'totally', 'really', 'insanely', 'deeply'];

export const STOPWORDS = new Set([
  'и', 'а', 'но', 'в', 'во', 'на', 'с', 'со', 'к', 'ко', 'по', 'у', 'о', 'об', 'от', 'до', 'за', 'из', 'не', 'ни', 'что', 'это', 'как', 'так', 'же', 'бы', 'ли', 'то', 'все', 'всё', 'был', 'была', 'было', 'были',
  'я', 'мы', 'ты', 'вы', 'он', 'она', 'оно', 'они', 'мне', 'нам', 'меня', 'нас', 'его', 'её', 'их', 'мой', 'моя', 'моё', 'мои', 'наш', 'наша', 'наше', 'наши', 'этот', 'эта', 'это', 'эти', 'тот', 'та', 'те',
  'очень', 'потом', 'уже', 'ничего', 'никто', 'нигде', 'никогда', 'ничто', 'кто', 'чем', 'чём', 'сам', 'сама', 'само', 'сами', 'ещё', 'еще', 'только', 'даже', 'когда', 'где', 'куда', 'там', 'тут', 'здесь', 'сегодня', 'вчера', 'завтра', 'весь', 'вся', 'всех', 'для', 'при', 'про', 'над', 'под', 'без', 'или', 'если', 'чтобы', 'тоже', 'просто', 'потому', 'затем', 'снова', 'опять', 'день', 'дня',
  'the', 'a', 'an', 'and', 'but', 'or', 'in', 'on', 'at', 'to', 'of', 'for', 'with', 'from', 'by', 'is', 'was', 'were', 'be', 'been', 'are', 'am', 'it', 'its', 'this', 'that', 'these', 'those', 'i', 'we', 'you', 'he', 'she', 'they', 'me', 'us', 'my', 'our', 'your', 'his', 'her', 'their', 'so', 'very', 'then', 'just', 'too', 'also', 'not', 'no', 'yes', 'as', 'if', 'when', 'where', 'there', 'here', 'today', 'yesterday', 'tomorrow', 'all', 'day', 'had', 'have', 'has', 'did', 'do', 'does', 'into', 'out', 'up', 'down', 'about', 'after', 'before', 'while', 'than', 'because', 'really', 'got', 'get', 'went', 'go', 'some', 'much', 'many', 'more', 'most', 'which', 'what', 'who', 'how', 'can', 'could', 'would', 'should',
]);

// ---------- Title vocabulary: concrete nouns with grammatical forms ----------
export type TitleKind = 'place' | 'thing' | 'person' | 'time' | 'event';
export interface TitleNoun {
  stems: string[];
  kind: TitleKind;
  tail?: boolean;   // abstract event: better at the end of a title ("… и дедлайн")
  w?: number;       // importance when several nouns of a kind are found
  ru: { nom: string; loc?: string; ins?: string; g: 'm' | 'f' | 'n' | 'pl' };
  en: { nom: string; loc?: string; ins?: string };
}

export const TITLE_NOUNS: TitleNoun[] = [
  // places
  { stems: ['парк', 'park'], kind: 'place', ru: { nom: 'парк', loc: 'в парке', g: 'm' }, en: { nom: 'park', loc: 'in the park' } },
  { stems: ['лес$', 'лесу$', 'леса$', 'лесн', 'forest', 'wood'], kind: 'place', ru: { nom: 'лес', loc: 'в лесу', g: 'm' }, en: { nom: 'forest', loc: 'in the forest' } },
  { stems: ['офис', 'office'], kind: 'place', ru: { nom: 'офис', loc: 'в офисе', g: 'm' }, en: { nom: 'office', loc: 'at the office' } },
  { stems: ['море$', 'морю$', 'моря$', 'морем', 'морск', 'sea$', 'ocean'], kind: 'place', ru: { nom: 'море', loc: 'у моря', g: 'n' }, en: { nom: 'sea', loc: 'by the sea' } },
  { stems: ['озер', 'озёр', 'lake'], kind: 'place', ru: { nom: 'озеро', loc: 'у озера', g: 'n' }, en: { nom: 'lake', loc: 'by the lake' } },
  { stems: ['пруд', 'pond'], kind: 'place', ru: { nom: 'пруд', loc: 'у пруда', g: 'm' }, en: { nom: 'pond', loc: 'by the pond' } },
  { stems: ['река$', 'реке$', 'реки$', 'реку$', 'речк', 'river'], kind: 'place', ru: { nom: 'река', loc: 'у реки', g: 'f' }, en: { nom: 'river', loc: 'by the river' } },
  { stems: ['горы$', 'горах', 'гора$', 'гору$', 'горам', 'горн', 'mountain'], kind: 'place', ru: { nom: 'горы', loc: 'в горах', g: 'pl' }, en: { nom: 'mountains', loc: 'in the mountains' } },
  { stems: ['пляж', 'beach'], kind: 'place', ru: { nom: 'пляж', loc: 'на пляже', g: 'm' }, en: { nom: 'beach', loc: 'on the beach' } },
  { stems: ['кафе', 'cafe', 'café', 'coffee shop'], kind: 'place', ru: { nom: 'кафе', loc: 'в кафе', g: 'n' }, en: { nom: 'café', loc: 'at the café' } },
  { stems: ['дом$', 'дома$', 'домой', 'home$'], kind: 'place', ru: { nom: 'дом', loc: 'дома', g: 'm' }, en: { nom: 'home', loc: 'at home' } },
  { stems: ['город', 'city', 'downtown'], kind: 'place', ru: { nom: 'город', loc: 'в городе', g: 'm' }, en: { nom: 'city', loc: 'in the city' } },
  { stems: ['крыш', 'roof'], kind: 'place', ru: { nom: 'крыша', loc: 'на крыше', g: 'f' }, en: { nom: 'rooftop', loc: 'on the rooftop' } },
  { stems: ['кухн', 'kitchen'], kind: 'place', ru: { nom: 'кухня', loc: 'на кухне', g: 'f' }, en: { nom: 'kitchen', loc: 'in the kitchen' } },
  { stems: ['универ', 'universit', 'campus'], kind: 'place', ru: { nom: 'университет', loc: 'в университете', g: 'm' }, en: { nom: 'campus', loc: 'on campus' } },
  { stems: ['школ', 'school'], kind: 'place', ru: { nom: 'школа', loc: 'в школе', g: 'f' }, en: { nom: 'school', loc: 'at school' } },
  { stems: ['поезд', 'train'], kind: 'place', ru: { nom: 'поезд', loc: 'в поезде', g: 'm' }, en: { nom: 'train', loc: 'on the train' } },
  { stems: ['дорога$', 'дороге$', 'дорогу$', 'дороги$', 'в пути', 'road', 'trip'], kind: 'place', ru: { nom: 'дорога', loc: 'в дороге', g: 'f' }, en: { nom: 'road', loc: 'on the road' } },
  { stems: ['набережн', 'embankment', 'promenade'], kind: 'place', ru: { nom: 'набережная', loc: 'на набережной', g: 'f' }, en: { nom: 'promenade', loc: 'on the promenade' } },
  { stems: ['сад$', 'саду$', 'сады$', 'садик', 'garden'], kind: 'place', ru: { nom: 'сад', loc: 'в саду', g: 'm' }, en: { nom: 'garden', loc: 'in the garden' } },
  { stems: ['дач', 'cottage', 'countryside'], kind: 'place', ru: { nom: 'дача', loc: 'на даче', g: 'f' }, en: { nom: 'cottage', loc: 'at the cottage' } },
  { stems: ['балкон', 'balcony'], kind: 'place', ru: { nom: 'балкон', loc: 'на балконе', g: 'm' }, en: { nom: 'balcony', loc: 'on the balcony' } },
  { stems: ['концерт', 'concert', 'gig'], kind: 'place', ru: { nom: 'концерт', loc: 'на концерте', g: 'm' }, en: { nom: 'concert', loc: 'at the concert' } },
  { stems: ['кино', 'cinema', 'movie'], kind: 'place', ru: { nom: 'кино', loc: 'в кино', g: 'n' }, en: { nom: 'cinema', loc: 'at the cinema' } },
  { stems: ['библиотек', 'library'], kind: 'place', ru: { nom: 'библиотека', loc: 'в библиотеке', g: 'f' }, en: { nom: 'library', loc: 'in the library' } },
  { stems: ['аэропорт', 'airport'], kind: 'place', ru: { nom: 'аэропорт', loc: 'в аэропорту', g: 'm' }, en: { nom: 'airport', loc: 'at the airport' } },
  // things
  { stems: ['какао', 'cocoa'], kind: 'thing', ru: { nom: 'какао', g: 'n' }, en: { nom: 'cocoa' } },
  { stems: ['чай', 'tea$'], kind: 'thing', ru: { nom: 'чай', g: 'm' }, en: { nom: 'tea' } },
  { stems: ['кофе', 'coffee'], kind: 'thing', ru: { nom: 'кофе', g: 'm' }, en: { nom: 'coffee' } },
  { stems: ['лист', 'leaf', 'leaves'], kind: 'thing', ru: { nom: 'листья', g: 'pl' }, en: { nom: 'leaves' } },
  { stems: ['снег', 'snow'], kind: 'thing', ru: { nom: 'снег', g: 'm' }, en: { nom: 'snow' } },
  { stems: ['дожд', 'rain'], kind: 'thing', ru: { nom: 'дождь', g: 'm' }, en: { nom: 'rain' } },
  { stems: ['торт', 'cake'], kind: 'thing', ru: { nom: 'торт', g: 'm' }, en: { nom: 'cake' } },
  { stems: ['свеч', 'candle'], kind: 'thing', ru: { nom: 'свечи', g: 'pl' }, en: { nom: 'candles' } },
  { stems: ['звёзд', 'звезд', 'star'], kind: 'thing', ru: { nom: 'звёзды', g: 'pl' }, en: { nom: 'stars' } },
  { stems: ['луна', 'лунн', 'moon'], kind: 'thing', ru: { nom: 'луна', g: 'f' }, en: { nom: 'moon' } },
  { stems: ['закат', 'sunset'], kind: 'thing', ru: { nom: 'закат', g: 'm' }, en: { nom: 'sunset' } },
  { stems: ['рассвет', 'sunrise', 'dawn'], kind: 'thing', ru: { nom: 'рассвет', g: 'm' }, en: { nom: 'sunrise' } },
  { stems: ['музык', 'music'], kind: 'thing', ru: { nom: 'музыка', g: 'f' }, en: { nom: 'music' } },
  { stems: ['танц', 'danc'], kind: 'thing', ru: { nom: 'танцы', g: 'pl' }, en: { nom: 'dancing' } },
  { stems: ['смех', 'смея', 'laugh'], kind: 'thing', ru: { nom: 'смех', g: 'm' }, en: { nom: 'laughter' } },
  { stems: ['разговор', 'talk', 'convers'], kind: 'thing', ru: { nom: 'разговоры', g: 'pl' }, en: { nom: 'long talks' } },
  { stems: ['книг', 'book'], kind: 'thing', ru: { nom: 'книга', g: 'f' }, en: { nom: 'a book' } },
  { stems: ['пицц', 'pizza'], kind: 'thing', ru: { nom: 'пицца', g: 'f' }, en: { nom: 'pizza' } },
  { stems: ['вино', 'wine'], kind: 'thing', ru: { nom: 'вино', g: 'n' }, en: { nom: 'wine' } },
  { stems: ['мороженое', 'ice cream'], kind: 'thing', ru: { nom: 'мороженое', g: 'n' }, en: { nom: 'ice cream' } },
  { stems: ['велосипед', 'вело', 'bike', 'bicycle'], kind: 'thing', ru: { nom: 'велосипед', g: 'm' }, en: { nom: 'a bike' } },
  { stems: ['код', 'code', 'coding'], kind: 'thing', ru: { nom: 'код', g: 'm' }, en: { nom: 'code' } },
  { stems: ['дедлайн', 'deadline'], kind: 'event', tail: true, w: 2, ru: { nom: 'дедлайн', g: 'm' }, en: { nom: 'a deadline' } },
  { stems: ['экзамен', 'exam'], kind: 'event', tail: true, w: 2, ru: { nom: 'экзамен', g: 'm' }, en: { nom: 'an exam' } },
  { stems: ['проект', 'project'], kind: 'event', tail: true, w: 1, ru: { nom: 'проект', g: 'm' }, en: { nom: 'a project' } },
  { stems: ['презентац', 'presentation'], kind: 'event', tail: true, w: 2, ru: { nom: 'презентация', g: 'f' }, en: { nom: 'a presentation' } },
  { stems: ['хакатон', 'hackathon'], kind: 'event', w: 2, ru: { nom: 'хакатон', g: 'm' }, en: { nom: 'hackathon' } },
  { stems: ['день рождения', 'birthday', 'др$'], kind: 'event', w: 3, ru: { nom: 'день рождения', g: 'm' }, en: { nom: 'birthday' } },
  { stems: ['свадьб', 'wedding'], kind: 'event', w: 3, ru: { nom: 'свадьба', g: 'f' }, en: { nom: 'wedding' } },
  { stems: ['выпуск', 'graduat'], kind: 'event', w: 3, ru: { nom: 'выпускной', g: 'm' }, en: { nom: 'graduation' } },
  { stems: ['поход', 'hike', 'hiking'], kind: 'event', w: 2, ru: { nom: 'поход', g: 'm' }, en: { nom: 'hike' } },
  { stems: ['прогулк', 'гуля', 'walk', 'stroll'], kind: 'event', ru: { nom: 'прогулка', g: 'f' }, en: { nom: 'walk' } },
  { stems: ['ужин', 'dinner'], kind: 'event', ru: { nom: 'ужин', g: 'm' }, en: { nom: 'dinner' } },
  { stems: ['завтрак', 'breakfast'], kind: 'event', ru: { nom: 'завтрак', g: 'm' }, en: { nom: 'breakfast' } },
  { stems: ['пикник', 'picnic'], kind: 'event', ru: { nom: 'пикник', g: 'm' }, en: { nom: 'picnic' } },
  { stems: ['фильм', 'movie', 'film$'], kind: 'event', ru: { nom: 'фильм', g: 'm' }, en: { nom: 'a movie' } },
  { stems: ['перелёт', 'перелет', 'flight'], kind: 'event', ru: { nom: 'перелёт', g: 'm' }, en: { nom: 'flight' } },
  { stems: ['поездк', 'путешеств', 'trip', 'journey', 'travel'], kind: 'event', w: 2, ru: { nom: 'поездка', g: 'f' }, en: { nom: 'trip' } },
  { stems: ['отпуск', 'каникул', 'vacation', 'holiday'], kind: 'event', w: 2, ru: { nom: 'отпуск', g: 'm' }, en: { nom: 'vacation' } },
  { stems: ['праздник', 'праздн', 'celebration'], kind: 'event', ru: { nom: 'праздник', g: 'm' }, en: { nom: 'celebration' } },
  { stems: ['новый год', 'новогодн', 'new year'], kind: 'event', w: 3, ru: { nom: 'новый год', g: 'm' }, en: { nom: 'New Year' } },
  { stems: ['тренировк', 'пробежк', 'workout', 'training', 'jog'], kind: 'event', ru: { nom: 'тренировка', g: 'f' }, en: { nom: 'workout' } },
  { stems: ['репетици', 'rehearsal'], kind: 'event', ru: { nom: 'репетиция', g: 'f' }, en: { nom: 'rehearsal' } },
  { stems: ['собеседован', 'interview'], kind: 'event', tail: true, w: 2, ru: { nom: 'собеседование', g: 'n' }, en: { nom: 'an interview' } },
  { stems: ['защит', 'defense', 'defence'], kind: 'event', tail: true, w: 2, ru: { nom: 'защита', g: 'f' }, en: { nom: 'the defense' } },
  { stems: ['урок', 'заняти', 'lesson', 'class$'], kind: 'event', ru: { nom: 'занятие', g: 'n' }, en: { nom: 'lesson' } },
  { stems: ['игр', 'матч', 'game', 'match'], kind: 'event', ru: { nom: 'игра', g: 'f' }, en: { nom: 'game' } },
  { stems: ['переезд', 'moving'], kind: 'event', ru: { nom: 'переезд', g: 'm' }, en: { nom: 'moving day' } },
  // people
  { stems: ['друзья', 'друзей', 'друзьям', 'друзьями', 'друг$', 'друга$', 'другом$', 'friend'], kind: 'person', ru: { nom: 'друзья', ins: 'с друзьями', g: 'pl' }, en: { nom: 'friends', ins: 'with friends' } },
  { stems: ['подруг', 'girlfriend', 'best friend'], kind: 'person', ru: { nom: 'подруга', ins: 'с подругой', g: 'f' }, en: { nom: 'a friend', ins: 'with a friend' } },
  { stems: ['мама$', 'мамой', 'маме$', 'маму$', 'мамы$', 'mom', 'mum', 'mother'], kind: 'person', ru: { nom: 'мама', ins: 'с мамой', g: 'f' }, en: { nom: 'mom', ins: 'with mom' } },
  { stems: ['папа$', 'папой', 'папе$', 'папу$', 'dad', 'father'], kind: 'person', ru: { nom: 'папа', ins: 'с папой', g: 'm' }, en: { nom: 'dad', ins: 'with dad' } },
  { stems: ['семь', 'family'], kind: 'person', ru: { nom: 'семья', ins: 'с семьёй', g: 'f' }, en: { nom: 'family', ins: 'with family' } },
  { stems: ['брат$', 'брата$', 'брату$', 'братом', 'brother'], kind: 'person', ru: { nom: 'брат', ins: 'с братом', g: 'm' }, en: { nom: 'my brother', ins: 'with my brother' } },
  { stems: ['сестр', 'sister'], kind: 'person', ru: { nom: 'сестра', ins: 'с сестрой', g: 'f' }, en: { nom: 'my sister', ins: 'with my sister' } },
  { stems: ['бабушк', 'grandma'], kind: 'person', ru: { nom: 'бабушка', ins: 'с бабушкой', g: 'f' }, en: { nom: 'grandma', ins: 'with grandma' } },
  { stems: ['дедушк', 'grandpa'], kind: 'person', ru: { nom: 'дедушка', ins: 'с дедушкой', g: 'm' }, en: { nom: 'grandpa', ins: 'with grandpa' } },
  { stems: ['девушк'], kind: 'person', ru: { nom: 'девушка', ins: 'с девушкой', g: 'f' }, en: { nom: 'her', ins: 'with her' } },
  { stems: ['парн', 'boyfriend'], kind: 'person', ru: { nom: 'парень', ins: 'с парнем', g: 'm' }, en: { nom: 'him', ins: 'with him' } },
  { stems: ['команд', 'team'], kind: 'person', ru: { nom: 'команда', ins: 'с командой', g: 'f' }, en: { nom: 'the team', ins: 'with the team' } },
  { stems: ['коллег', 'colleague'], kind: 'person', ru: { nom: 'коллеги', ins: 'с коллегами', g: 'pl' }, en: { nom: 'colleagues', ins: 'with colleagues' } },
  { stems: ['кот$', 'кота$', 'коту$', 'котом', 'кошк', 'котик', 'котён', 'котен', 'cat$', 'cats$', 'kitten', 'kitty'], kind: 'person', ru: { nom: 'кот', ins: 'с котом', g: 'm' }, en: { nom: 'the cat', ins: 'with the cat' } },
  { stems: ['собак', 'пёс', 'dog'], kind: 'person', ru: { nom: 'собака', ins: 'с собакой', g: 'f' }, en: { nom: 'the dog', ins: 'with the dog' } },
  // time
  { stems: ['ночь', 'ноч', 'night'], kind: 'time', ru: { nom: 'ночь', g: 'f' }, en: { nom: 'night' } },
  { stems: ['вечер', 'evening'], kind: 'time', ru: { nom: 'вечер', g: 'm' }, en: { nom: 'evening' } },
  { stems: ['утр', 'morning'], kind: 'time', ru: { nom: 'утро', g: 'n' }, en: { nom: 'morning' } },
  { stems: ['выходн', 'weekend'], kind: 'time', ru: { nom: 'выходные', g: 'pl' }, en: { nom: 'weekend' } },
];

export const SEASON_ADJ = {
  ru: {
    autumn: { m: 'осенний', f: 'осенняя', n: 'осеннее', pl: 'осенние' },
    winter: { m: 'зимний', f: 'зимняя', n: 'зимнее', pl: 'зимние' },
    spring: { m: 'весенний', f: 'весенняя', n: 'весеннее', pl: 'весенние' },
    summer: { m: 'летний', f: 'летняя', n: 'летнее', pl: 'летние' },
  },
  en: { autumn: 'autumn', winter: 'winter', spring: 'spring', summer: 'summer' },
};

export const MOOD_ADJ = {
  ru: {
    warm: { m: 'тёплый', f: 'тёплая', n: 'тёплое', pl: 'тёплые' },
    quiet: { m: 'тихий', f: 'тихая', n: 'тихое', pl: 'тихие' },
    long: { m: 'долгий', f: 'долгая', n: 'долгое', pl: 'долгие' },
    loud: { m: 'шумный', f: 'шумная', n: 'шумное', pl: 'шумные' },
    late: { m: 'поздний', f: 'поздняя', n: 'позднее', pl: 'поздние' },
    cold: { m: 'холодный', f: 'холодная', n: 'холодное', pl: 'холодные' },
    bright: { m: 'яркий', f: 'яркая', n: 'яркое', pl: 'яркие' },
  },
  en: { warm: 'warm', quiet: 'quiet', long: 'long', loud: 'loud', late: 'late', cold: 'cold', bright: 'bright' },
};
