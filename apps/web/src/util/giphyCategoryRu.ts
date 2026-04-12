/**
 * GIPHY отдаёт названия категорий на английском (`name` / `name_encoded`).
 * Полный автоперевод без сервиса локализации GIPHY недоступен — известные slug’и
 * маппим вручную; остальное остаётся как в API. Подборки (внутренние теги) в UI не показываем.
 */

function normKey(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/_/g, '-')
    .replace(/\s*&\s*/g, '-and-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

const CAT: Record<string, string> = {
  actions: 'Действия',
  adhesives: 'Наклейки',
  adjectives: 'Описания',
  advertising: 'Реклама',
  animals: 'Животные',
  anime: 'Аниме',
  'art-and-design': 'Искусство и дизайн',
  'cartoons-and-comics': 'Мультфильмы и комиксы',
  celebrities: 'Знаменитости',
  decades: 'Десятилетия',
  emotions: 'Эмоции',
  'fashion-and-beauty': 'Мода и красота',
  'food-and-drink': 'Еда и напитки',
  gaming: 'Игры',
  greetings: 'Приветствия',
  holidays: 'Праздники',
  identity: 'Идентичность',
  interests: 'Интересы',
  memes: 'Мемы',
  movies: 'Кино',
  music: 'Музыка',
  nature: 'Природа',
  nouns: 'Существительные',
  'news-and-politics': 'Новости и политика',
  reactions: 'Реакции',
  science: 'Наука',
  sports: 'Спорт',
  stickers: 'Стикеры',
  transportation: 'Транспорт',
  tv: 'Телевидение',
  verbs: 'Глаголы',
  'weird-and-wonderful': 'Странное и удивительное',
}

export function giphyCategoryLabelRu(nameEncoded: string, displayName: string): string {
  const byEnc = CAT[normKey(nameEncoded)]
  if (byEnc) return byEnc
  const byName = CAT[normKey(displayName)]
  if (byName) return byName
  return displayName
}
