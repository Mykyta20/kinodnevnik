const fs = require('fs'), path = require('path'), zlib = require('zlib');
// Тестовый стенд: сайт открывается «как на GitHub Pages», а таблица, TMDB и Shikimori подменены.
let PW; try { PW = require('playwright'); } catch (e) { PW = require('/opt/npm-tools/node_modules/playwright'); }
const { chromium } = PW;

const ROOT = path.join(__dirname, '..');
const OUT = path.join(__dirname, 'shots');
fs.mkdirSync(OUT, { recursive: true });
const SITE = 'https://mykyta20.github.io/kinodnevnik/';
const GS = 'https://script.google.com/macros/s/TEST/exec';
const VALID = '0123456789abcdef0123456789abcdef';

/* ---------- PNG-заглушки для постеров ---------- */
function crc32(buf) { let c, crc = 0xffffffff; for (let n = 0; n < buf.length; n++) { c = (crc ^ buf[n]) & 0xff; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; crc = (crc >>> 8) ^ c; } return (crc ^ 0xffffffff) >>> 0; }
function chunk(type, data) { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type), data]); const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td)); return Buffer.concat([len, td, crc]); }
function png(w, h, seed) {
  const r0 = (seed * 53) % 200 + 30, g0 = (seed * 97) % 160 + 30, b0 = (seed * 31) % 180 + 40;
  const raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) { raw[y * (w * 3 + 1)] = 0; for (let x = 0; x < w; x++) { const o = y * (w * 3 + 1) + 1 + x * 3, t = y / h; raw[o] = r0 * (1 - t * .6); raw[o + 1] = g0 * (1 - t * .5); raw[o + 2] = b0 * (1 - t * .3); } }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}
const hash = s => { let h = 7; for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h % 997; };

/* ---------- подставной Shikimori ---------- */
const P = id => ({ main2xUrl: 'https://shikimori.io/uploads/poster/animes/' + id + '/main2x.webp', mainUrl: 'https://shikimori.io/uploads/poster/animes/' + id + '/main.webp', previewUrl: 'https://shikimori.io/uploads/poster/animes/' + id + '/preview.webp' });
const A = (id, russian, name, kind, y0, y1, status, score, franchise, related) => ({ id: String(id), malId: String(id), name, russian, kind, score, status, airedOn: { year: y0 }, releasedOn: { year: y1 }, franchise, poster: P(id), related: related.map(([k, x]) => ({ relationKind: k, anime: { id: String(x) } })) });
const SH = {};
[
  A(40748, 'Магическая битва', 'Jujutsu Kaisen', 'tv', 2020, 2021, 'released', 8.49, 'jujutsu_kaisen', [['prequel', 48561], ['sequel', 51009], ['other', 38777]]),
  A(51009, 'Магическая битва 2', 'Jujutsu Kaisen 2nd Season', 'tv', 2023, 2023, 'released', 8.7, 'jujutsu_kaisen', [['prequel', 40748], ['sequel', 57658]]),
  A(48561, 'Магическая битва 0. Фильм', 'Jujutsu Kaisen 0 Movie', 'movie', 2021, 2021, 'released', 8.4, 'jujutsu_kaisen', [['sequel', 40748]]),
  A(57658, 'Магическая битва: Смертельная миграция', 'Jujutsu Kaisen: Shimetsu Kaiyuu', 'tv', 2026, null, 'ongoing', 8.9, 'jujutsu_kaisen', [['prequel', 51009]]),
  A(38777, 'Магическая битва PV', 'Jujutsu Kaisen PV', 'pv', 2018, null, 'released', 0, 'jujutsu_kaisen', []),
  A(20, 'Наруто', 'Naruto', 'tv', 2002, 2007, 'released', 8.0, 'naruto', [['sequel', 1735], ['side_story', 442]]),
  A(442, 'Наруто: Ниндзя в стране снега', 'Naruto Movie 1', 'movie', 2004, 2004, 'released', 7.1, 'naruto', [['parent_story', 20]]),
  A(1735, 'Наруто: Ураганные хроники', 'Naruto: Shippuuden', 'tv', 2007, 2017, 'released', 8.3, 'naruto', [['prequel', 20], ['sequel', 34566], ['side_story', 16870]]),
  A(16870, 'Наруто: Последний фильм', 'The Last: Naruto the Movie', 'movie', 2014, 2014, 'released', 7.8, 'naruto', [['parent_story', 1735]]),
  A(34566, 'Боруто: Новое поколение', 'Boruto: Naruto Next Generations', 'tv', 2017, 2023, 'released', 6.0, 'naruto', [['prequel', 1735]]),
  A(16498, 'Атака титанов', 'Shingeki no Kyojin', 'tv', 2013, 2013, 'released', 8.58, 'shingeki_no_kyojin', [])
].forEach(a => { SH[a.id] = a; });
const fold = s => String(s || '').toLowerCase().replace(/ё/g, 'е');
let shikiDown = false, shikiCalls = 0, shikiOldSchema = false;
const SHD = {
  '40748': { description: '[character=164471]Юдзи Итадори[/character] — школьник с невероятной физической силой. Однажды он съедает палец [character=164470]Рёмена Сукуны[/character], и его жизнь меняется навсегда.', genres: [{ russian: 'Сёнэн' }, { russian: 'Экшен' }, { russian: 'Сверхъестественное' }, { russian: 'Школа' }], studios: [{ name: 'MAPPA' }], duration: 24, episodes: 24, screenshots: [{ originalUrl: 'https://shikimori.io/system/screenshots/original/jjk1.jpg' }] },
  '20': { description: 'История о юном [[ниндзя]] Наруто Узумаки, который мечтает стать хокаге.', genres: [{ russian: 'Сёнэн' }, { russian: 'Экшен' }], studios: [{ name: 'Studio Pierrot' }], duration: 23, episodes: 220, screenshots: [] }
};
function shikiAnswer(body) {
  shikiCalls++;
  const q = body.query, v = body.variables || {};
  if (/search:/.test(q)) {
    const s = fold(v.s);
    const hit = Object.values(SH).filter(a => fold(a.russian).includes(s) || fold(a.name).includes(s));
    // как настоящий Shikimori: на непохожий запрос всё равно что-то отдаёт
    return { data: { animes: (hit.length ? hit : [SH['16498'], SH['34566']]).slice(0, 8) } };
  }
  // подробности для карточки-афиши; «старая схема» не знает поля screenshots и отвечает ошибкой
  if (/description/.test(q)) {
    if (shikiOldSchema && /screenshots/.test(q)) return { errors: [{ message: "Field 'screenshots' doesn't exist on type 'Anime'" }] };
    const ids = String(v.ids).split(',');
    return { data: { animes: ids.filter(id => SH[id]).map(id => Object.assign({ id }, SHD[id] || { description: null, genres: [] })) } };
  }
  if (/ids:/.test(q)) {
    const ids = String(v.ids).split(',');
    return { data: { animes: ids.filter(id => SH[id]).map(id => ({ id, related: SH[id].related.map(r => ({ relationKind: r.relationKind, anime: SH[r.anime.id] ? Object.assign({}, SH[r.anime.id], { related: undefined }) : null })) })) } };
  }
  return { errors: [{ message: 'unknown' }] };
}

/* ---------- подставной TMDB ---------- */
const M = (id, title, orig, date, poster, va, vc, genres, lang) => ({ media_type: 'movie', id, title, original_title: orig, release_date: date, poster_path: poster, vote_average: va, vote_count: vc, genre_ids: genres || [], original_language: lang || 'en' });
const T = (id, name, orig, date, poster, va, vc, genres, lang) => ({ media_type: 'tv', id, name, original_name: orig, first_air_date: date, poster_path: poster, vote_average: va, vote_count: vc, genre_ids: genres || [], original_language: lang || 'en' });
const TM = {
  'дюна': [M(438631, 'Дюна', 'Dune', '2021-09-15', '/dune21.jpg', 7.8, 12000, [878]), M(693134, 'Дюна: Часть вторая', 'Dune: Part Two', '2024-02-27', '/dune2.jpg', 8.1, 6500, [878]), M(841, 'Дюна', 'Dune', '1984-12-14', '/dune84.jpg', 6.3, 2500, [878]), T(90228, 'Дюна: Пророчество', 'Dune: Prophecy', '2024-11-17', '/prophecy.jpg', 7.2, 800, [10765]), { media_type: 'person', id: 1, name: 'Дюна Человек' }, M(9999, 'Дюна (фанатский)', 'Dune fan', '', null, 0, 0)],
  'наруто': [T(46260, 'Наруто', 'ナルト', '2002-10-03', '/naruto.jpg', 8.4, 6000, [16, 10759], 'ja')],
  'атака титанов': [T(1429, 'Атака титанов', '進撃の巨人', '2013-04-07', '/aot.jpg', 8.7, 6000, [16, 10759], 'ja')],
  'черное зеркало': [T(42009, 'Черное зеркало', 'Black Mirror', '2011-12-04', '/bm.jpg', 8.3, 5000, [18])],
  'тайна коко': [M(354912, 'Тайна Коко', 'Coco', '2017-10-27', '/coco.jpg', 8.2, 19000, [16, 10751])],
  'магическая битва': [T(95479, 'Магическая битва', '呪術廻戦', '2020-10-03', '/jjk.jpg', 8.5, 4000, [16], 'ja')]
};
const TD = {
  'movie/693134': { id: 693134, imdb_id: 'tt15239678', poster_path: '/dune2.jpg', title: 'Дюна: Часть вторая' },
  'movie/438631': { id: 438631, imdb_id: 'tt1160419', poster_path: '/dune21.jpg' },
  'movie/354912': { id: 354912, imdb_id: 'tt2380307', poster_path: '/coco.jpg' },
  'tv/42009': { id: 42009, name: 'Черное зеркало', first_air_date: '2011-12-04', last_air_date: '2025-04-10', status: 'Returning Series', number_of_seasons: 7, seasons: [0, 1, 2, 3, 4, 5, 6, 7].map(n => ({ season_number: n })), external_ids: { imdb_id: 'tt2085059' }, poster_path: '/bm.jpg' },
  'tv/90228': { id: 90228, name: 'Дюна: Пророчество', first_air_date: '2024-11-17', last_air_date: '2024-12-22', status: 'Returning Series', number_of_seasons: 1, seasons: [{ season_number: 1 }], external_ids: { imdb_id: 'tt10466872' }, poster_path: '/prophecy.jpg' }
};
TM['train dreams'] = [M(1100000, 'Сны поездов', 'Train Dreams', '2025-11-07', '/train.jpg', 7.4, 300, [18])];
/* поиск только фильмов или только сериалов (для подбора постеров к записанным тайтлам) */
const homeJunk = Array.from({ length: 20 }, (_, i) => M(70000 + i, 'Дом', 'Home', (1950 + i) + '-01-01', '/home' + i + '.jpg', 5, 20));
const TMV = {
  'dune': [M(438631, 'Дюна', 'Dune', '2021-09-15', '/dune21.jpg', 7.8, 12000, [878]), M(841, 'Дюна', 'Dune', '1984-12-14', '/dune84.jpg', 6.3, 2500, [878]), M(693134, 'Дюна: Часть вторая', 'Dune: Part Two', '2024-02-27', '/dune2.jpg', 8.1, 6500, [878])],
  'coco': [M(354912, 'Тайна Коко', 'Coco', '2017-10-27', '/coco.jpg', 8.2, 19000, [16, 10751]), M(999001, 'Коко', 'Coco', '2017-03-01', '/coco-short.jpg', 5.1, 4, [16])],
  'trap': [M(917496, 'Ловушка', 'Trap', '2024-07-31', '/trap.jpg', 6.5, 1500, [53]), M(999002, 'Ловушка', 'Trap', '2024-03-15', '/trap2.jpg', 5.9, 300, [27])],
  'брат': [M(20992, 'Брат', 'Брат', '1997-05-17', '/brat.jpg', 8.0, 900, [80], 'ru'), M(20993, 'Брат 2', 'Брат 2', '2000-05-11', '/brat2.jpg', 7.9, 700, [80], 'ru')],
  // 45 «Домов»: первая страница забита старыми, нужный 2009 года находится только с годом
  'home': year => year === '2009' ? { results: [M(62320, 'Дом', 'Home', '2009-06-05', '/home.jpg', 8.0, 1500, [99])], total: 1 } : { results: homeJunk, total: 45 }
};
TMV['ловушка'] = TMV.trap;
const TTV = {
  'black mirror': [T(42009, 'Черное зеркало', 'Black Mirror', '2011-12-04', '/bm.jpg', 8.3, 5000, [18])],
  'gravity falls': [T(40075, 'Гравити Фолз', 'Gravity Falls', '2012-06-15', '/gf.jpg', 8.6, 4000, [16, 35])]
};
Object.assign(TD, {
  'movie/157336': { id: 157336, imdb_id: 'tt0816692', poster_path: '/inter.jpg' },
  'movie/917496': { id: 917496, imdb_id: 'tt26753557', poster_path: '/trap.jpg' },
  'movie/999002': { id: 999002, imdb_id: 'tt31000000', poster_path: '/trap2.jpg' },
  'movie/20992': { id: 20992, imdb_id: 'tt0118767', poster_path: '/brat.jpg' },
  'movie/20993': { id: 20993, imdb_id: 'tt0238883', poster_path: '/brat2.jpg' },
  'movie/62320': { id: 62320, imdb_id: 'tt1014762', poster_path: '/home.jpg' },
  'movie/1100000': { id: 1100000, imdb_id: 'tt29768334', poster_path: '/train.jpg' },
  'tv/40075': { id: 40075, name: 'Гравити Фолз', first_air_date: '2012-06-15', last_air_date: '2016-02-15', status: 'Ended', number_of_seasons: 2, external_ids: { imdb_id: 'tt1865718' }, poster_path: '/gf.jpg' }
});
/* подробности для карточки-афиши: кадр, описание, жанры, длительность, режиссёр, актёры */
Object.assign(TD['movie/438631'], { title: 'Дюна', backdrop_path: '/dune-bg.jpg', overview: 'Наследник знаменитого дома Атрейдесов Пол отправляется вместе с семьёй на одну из самых опасных планет во Вселенной — Арракис.', tagline: 'Начало', genres: [{ id: 878, name: 'фантастика' }, { id: 12, name: 'приключения' }], runtime: 155,
  credits: { crew: [{ job: 'Producer', name: 'Мэри Пэрент' }, { job: 'Director', name: 'Дени Вильнёв' }], cast: ['Тимоти Шаламе', 'Ребекка Фергюсон', 'Оскар Айзек', 'Джош Бролин', 'Стеллан Скарсгард'].map(name => ({ name })) }, external_ids: { imdb_id: 'tt1160419' } });
Object.assign(TD['tv/42009'], { backdrop_path: '/bm-bg.jpg', overview: 'Антология о тёмной стороне технологий и о том, что они делают с людьми.', genres: [{ name: 'драма' }, { name: 'НФ и Фэнтези' }], episode_run_time: [60], created_by: [{ name: 'Чарли Брукер' }], credits: { cast: [{ name: 'Брайс Даллас Ховард' }] } });
Object.assign(TD['movie/354912'], { backdrop_path: '/coco-bg.jpg', overview: '', en: 'Despite his family’s baffling generations-old ban on music, Miguel dreams of becoming an accomplished musician.', genres: [{ name: 'мультфильм' }, { name: 'семейный' }], runtime: 105,
  credits: { crew: [{ job: 'Director', name: 'Ли Анкрич' }, { job: 'Director', name: 'Эдриан Молина' }], cast: [{ name: 'Энтони Гонсалес' }] } });
Object.assign(TD['movie/157336'], { backdrop_path: '/inter-bg.jpg', overview: 'Когда засуха, пыльные бури и вымирание растений приводят человечество к продовольственному кризису, коллектив исследователей и учёных отправляется сквозь червоточину (которая предположительно соединяет области пространства-времени через большое расстояние) в путешествие, чтобы превзойти прежние ограничения для космических путешествий человека и найти планету с подходящими для человечества условиями.', tagline: 'Следующий шаг человечества станет величайшим', genres: [{ name: 'приключения' }, { name: 'драма' }, { name: 'фантастика' }], runtime: 169,
  credits: { crew: [{ job: 'Director', name: 'Кристофер Нолан' }], cast: [{ name: 'Мэттью Макконахи' }, { name: 'Энн Хэтэуэй' }] } });
/* ---------- подставной OMDb ---------- */
const OMDB_KEY = 'abcd1234';
const R = (rt, mc) => [{ Source: 'Internet Movie Database', Value: 'x' }].concat(rt ? [{ Source: 'Rotten Tomatoes', Value: rt }] : [], mc ? [{ Source: 'Metacritic', Value: mc + '/100' }] : []);
const OM = {
  tt0111161: { Title: 'The Shawshank Redemption', imdbRating: '9.3', imdbVotes: '3,000,000', Ratings: R() },
  tt1160419: { Title: 'Dune', imdbRating: '8.0', imdbVotes: '1,034,567', Metascore: '74', Ratings: R('83%', 74) },
  tt2085059: { Title: 'Black Mirror', imdbRating: '8.7', imdbVotes: '650,123', Metascore: 'N/A', Ratings: R() },
  tt2380307: { Title: 'Coco', imdbRating: '8.4', imdbVotes: '650,000', Metascore: '81', Ratings: R('97%', 81) },
  tt0816692: { Title: 'Interstellar', imdbRating: '8.7', imdbVotes: '2,300,000', Metascore: '74', Ratings: R('73%', 74) },
  tt0118767: { Title: 'Brother', imdbRating: '7.9', imdbVotes: '50,000', Metascore: 'N/A', Ratings: R('40%') }
};
let omdbCalls = [], omdbMode = '';
function omdbAnswer(u) {
  omdbCalls.push(u.searchParams.get('i') || '?');
  if (omdbMode === 'limit') return { status: 401, body: { Response: 'False', Error: 'Request limit reached!' } };
  if (u.searchParams.get('apikey') !== OMDB_KEY) return { status: 401, body: { Response: 'False', Error: 'Invalid API key!' } };
  const o = OM[u.searchParams.get('i')];
  return { status: 200, body: o ? Object.assign({ Response: 'True', imdbID: u.searchParams.get('i') }, o) : { Response: 'False', Error: 'Incorrect IMDb ID.' } };
}
function typedSearch(kind, q, year) {
  // «Film 12» → один точный фильм 2012 года: для проверки сохранения пачками
  const gen = /^film (\d+)$/.exec(q);
  let v = gen ? [M(500000 + +gen[1], 'Фильм ' + gen[1], 'Film ' + gen[1], (2000 + +gen[1] % 20) + '-05-05', '/f' + gen[1] + '.jpg', 7, 100)] : (kind === 'tv' ? TTV : TMV)[q] || [];
  if (typeof v === 'function') { const r = v(year); return { page: 1, results: r.results, total_results: r.total }; }
  if (year) v = v.filter(r => String(r.release_date || r.first_air_date || '').startsWith(year));
  return { page: 1, results: v, total_results: v.length };
}
let tmdbCalls = [], tmdbRevoked = false, corsImg = [];
function tmdbAnswer(u) {
  const key = u.searchParams.get('api_key');
  tmdbCalls.push(u.pathname + '?' + u.searchParams.toString());
  if (key !== VALID || tmdbRevoked) return { status: 401, body: { status_code: 7, status_message: 'Invalid API key', success: false } };
  const p = u.pathname.replace('/3/', '');
  if (p === 'authentication') return { status: 200, body: { success: true } };
  if (p === 'search/multi') { const q = fold(u.searchParams.get('query')).trim(); return { status: 200, body: { page: 1, results: TM[q] || [] } }; }
  if (p === 'search/movie' || p === 'search/tv') return { status: 200, body: typedSearch(p.slice(7), fold(u.searchParams.get('query')).trim(), u.searchParams.get('year') || u.searchParams.get('first_air_date_year')) };
  // русского описания нет — с language=en-US отдаём английское
  if (TD[p]) return { status: 200, body: u.searchParams.get('language') === 'en-US' && TD[p].en ? Object.assign({}, TD[p], { overview: TD[p].en }) : TD[p] };
  const g = /^movie\/(5\d{5})$/.exec(p);
  if (g) return { status: 200, body: { id: +g[1], imdb_id: 'tt9' + g[1], poster_path: '/f' + (+g[1] - 500000) + '.jpg' } };
  return { status: 404, body: { success: false } };
}

/* ---------- подставная Google-таблица (как Code.gs) ---------- */
function seedItems() {
  const d = (...x) => x;
  return [
    { id: 'a8b6a67ea', cat: 'anime', title: 'Наруто', orig: 'Naruto', year: '2002–…', status: 'done', dates: d('2020-10-11', '2025-10-17'), mal: 20, aod: 7.91, img: 'https://cdn.myanimelist.net/images/anime/1141/142503.jpg',
      parts: [
        { id: 'p1', label: 'ТВ', title: 'Наруто [ТВ-1]', kind: 'tv', year: '2002–2007', status: 'done', dub: '2х2', dates: d('2020-10-11'), mal: 20, orig: 'Naruto', aod: 7.91, img: 'https://cdn.myanimelist.net/images/anime/1141/142503.jpg' },
        { id: 'p2', label: 'Фильм 1', title: 'Наруто: Ниндзя в стране снега', kind: 'film', year: '2004', status: 'done', dub: 'Saint-Sound TV', dates: d('2021-01-10'), mal: 442, orig: 'Naruto Movie 1', aod: 7.04 },
        { id: 'p3', label: 'Ураганные хроники', title: 'Наруто: Ураганные хроники', kind: 'tv', year: '2007–2017', status: 'done', dub: '2х2', dates: d('2025-10-17'), mal: 1735, orig: 'Naruto: Shippuuden', aod: 8.2 }
      ] },
    { id: 'af35ef405', cat: 'anime', title: 'Магическая битва', orig: 'Jujutsu Kaisen', year: '2020–2021', slabel: 'ТВ-1', status: 'done', dates: d('2024-03-02'), mal: 40748, aod: 8.5, img: 'https://cdn.myanimelist.net/images/anime/1171/109222.jpg', dub: 'AniLibria', rating: 9 },
    { id: 'fe5160313', cat: 'film', title: 'Дюна', orig: 'Dune', year: '2021', status: 'done', dates: d('2022-01-05'), dub: 'Дубляж', rating: 8, verdict: 'Песок, звук и Циммер' },
    { id: 'fe14667b3', cat: 'series', title: 'Черное зеркало', orig: 'Black Mirror', year: '2011–…', status: 'done', dates: d('2023-06-01'), progress: '5 сезон, 2 серия', dub: 'Украинский дубляж' },
    { id: 'f1df42d6e', cat: 'cartoon', title: 'Тайна Коко', orig: 'Coco', year: '2017', status: 'done', dates: d('2021-11-02'), dub: 'Дубляж', rating: 10 },
    { id: 'fba996bba', cat: 'film', title: 'Сны поездов', orig: 'Train Dreams', year: '2025', status: 'planned', dates: [] }
  ];
}
class Sheet {
  constructor(items) { this.rows = items.map(x => JSON.parse(JSON.stringify(x))); this.log = []; this.batches = []; }
  handle(req) {
    this.log.push(req.action);
    if (req.key !== 'k') return { ok: false, error: 'неверный ключ' };
    if (req.action === 'getAll') return { ok: true, data: JSON.stringify({ items: this.rows }) };
    if (req.action === 'saveItems') { this.batches.push(JSON.parse(req.arg).length); JSON.parse(req.arg).forEach(it => { const i = this.rows.findIndex(r => r.id === it.id); if (i >= 0) this.rows[i] = it; else this.rows.push(it); }); return { ok: true, data: 'ok' }; }
    if (req.action === 'deleteItems') { const del = new Set(JSON.parse(req.arg)); this.rows = this.rows.filter(r => !del.has(r.id)); return { ok: true, data: 'ok' }; }
    if (req.action === 'replaceAll') { this.rows = JSON.parse(req.arg); return { ok: true, data: 'ok' }; }
    return { ok: false, error: 'неизвестное действие' };
  }
}

async function setup(opts = {}) {
  const browser = opts.browser || await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' }).catch(() => chromium.launch());
  const context = await browser.newContext({ viewport: opts.viewport || { width: 1280, height: 860 }, deviceScaleFactor: opts.dpr || 1, colorScheme: opts.scheme || 'dark', isMobile: !!opts.mobile, hasTouch: !!opts.mobile, locale: 'ru-RU' });
  const sheet = opts.sheet || new Sheet(seedItems());
  // «замороженная» дата для проверок, зависящих от сегодняшнего дня (цель на год, итоги)
  if (opts.now) await context.clock.setFixedTime(new Date(opts.now));
  const errors = [];
  await context.route('**/*', async route => {
    const req = route.request(), u = new URL(req.url());
    if (u.href.startsWith(SITE)) {
      let f = u.pathname.replace('/kinodnevnik/', '') || 'index.html';
      const fp = path.join(ROOT, f);
      if (fs.existsSync(fp)) return route.fulfill({ status: 200, body: fs.readFileSync(fp), contentType: f.endsWith('.html') ? 'text/html; charset=utf-8' : f.endsWith('.png') ? 'image/png' : 'application/json' });
      return route.fulfill({ status: 404, body: 'nf' });
    }
    if (u.host === 'script.google.com') {
      if (opts.gsDelay) await new Promise(r => setTimeout(r, opts.gsDelay));
      const body = req.postData() ? JSON.parse(req.postData()) : {};
      if (opts.gsBlank && opts.gsBlank.n > 0 && (!opts.gsBlank.action || opts.gsBlank.action === body.action)) {
        opts.gsBlank.n--; sheet.log.push('BLANK:' + body.action);
        return route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify({ ok: true, app: 'kinodnevnik' }) });
      }
      return route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(sheet.handle(body)) });
    }
    if (u.host === 'api.themoviedb.org') {
      if (opts.tmdbDown) return route.abort('connectionfailed');
      // TMDB просит подождать: первые n запросов получают 429
      if (opts.tmdb429 && opts.tmdb429.n > 0) { opts.tmdb429.n--; tmdbCalls.push('429'); return route.fulfill({ status: 429, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: '{"status_code":25}' }); }
      const a = tmdbAnswer(u);
      await new Promise(r => setTimeout(r, opts.tmdbDelay || 120));
      return route.fulfill({ status: a.status, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(a.body) });
    }
    if (u.host === 'www.omdbapi.com') {
      const a = omdbAnswer(u);
      await new Promise(r => setTimeout(r, opts.omdbDelay || 100));
      return route.fulfill({ status: a.status, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(a.body) });
    }
    if (u.host === 'shikimori.io' && u.pathname === '/api/graphql') {
      if (req.method() === 'OPTIONS') return route.fulfill({ status: 200, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': 'GET,POST,OPTIONS' } });
      if (shikiDown || opts.shikiDown) return route.abort('connectionfailed');
      await new Promise(r => setTimeout(r, opts.shikiDelay || 90));
      return route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(shikiAnswer(JSON.parse(req.postData()))) });
    }
    // картинки TMDB, как настоящие, разрешают читать цвет (CORS); MyAnimeList и Shikimori — нет
    if (['image.tmdb.org', 'shikimori.io', 'cdn.myanimelist.net'].includes(u.host)) {
      const cors = !!req.headers().origin;
      corsImg.push((cors ? 'cors ' : '') + u.host + u.pathname);
      // Playwright сам CORS не проверяет, поэтому запрет изображаем явно, как браузер
      if (cors && u.host !== 'image.tmdb.org') return route.abort('accessdenied');
      return route.fulfill({ status: 200, contentType: 'image/png', headers: u.host === 'image.tmdb.org' ? { 'access-control-allow-origin': '*' } : {}, body: png(46, 69, hash(u.pathname)) });
    }
    errors.push('UNMOCKED ' + u.href);
    return route.abort();
  });
  const page = await context.newPage();
  page.on('pageerror', e => errors.push('PAGEERROR ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('CONSOLE ' + m.text()); });
  if (!opts.local) await context.addInitScript(([url]) => { try { if (!localStorage.getItem('kinodnevnik:remote')) localStorage.setItem('kinodnevnik:remote', JSON.stringify({ url, key: 'k' })); } catch (e) {} }, [GS]);
  return { browser, context, page, sheet, errors, shot: async (name, o) => page.screenshot(Object.assign({ path: path.join(OUT, name + '.png') }, o || {})) };
}
module.exports = { setup, Sheet, seedItems, SITE, VALID, tmdbCalls: () => tmdbCalls, setShikiDown: v => { shikiDown = v; }, shikiCalls: () => shikiCalls, setTmdbRevoked: v => { tmdbRevoked = v; }, imgCalls: () => corsImg,
  OMDB_KEY, omdbCalls: () => omdbCalls, setOmdbMode: v => { omdbMode = v; }, setShikiOldSchema: v => { shikiOldSchema = v; } };
