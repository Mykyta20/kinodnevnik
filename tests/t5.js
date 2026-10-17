// Сценарий 5: карточка-афиша (кадр, описание, жанры), оценки IMDb / Rotten Tomatoes / Metacritic через OMDb.
const H = require('./harness');
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) process.exitCode = 1; };
const wait = ms => new Promise(r => setTimeout(r, ms));
const tm = p => 'https://image.tmdb.org/t/p/w342' + p;
const cfg = extra => ({ id: '__settings', cat: 'settings', title: 'Служебная запись', status: '', dates: [], cfg: Object.assign({ tmdb: H.VALID }, extra || {}) });
function items(extra) {
  const L = H.seedItems();
  const by = id => L.find(x => x.id === id);
  Object.assign(by('fe5160313'), { tmdb: 'movie/438631', imdb: 'tt1160419', img: tm('/dune21.jpg'), ext: { tmdb: 7.8 } });
  Object.assign(by('fe14667b3'), { tmdb: 'tv/42009', img: tm('/bm.jpg') });
  Object.assign(by('f1df42d6e'), { tmdb: 'movie/354912', imdb: 'tt2380307', img: tm('/coco.jpg') });
  L.push({ id: 'x3', cat: 'film', title: 'Интерстеллар', orig: 'Interstellar', year: '2014', status: 'done', dates: ['2021-02-01'], tmdb: 'movie/157336', imdb: 'tt0816692', img: tm('/inter.jpg'), rating: 9 });
  return L.concat([cfg(extra)]);
}
const row = (sheet, id) => sheet.rows.find(r => r.id === id) || {};
const txt = async (page, sel) => (await page.locator(sel).first().innerText()).replace(/\s+/g, ' ').trim();

(async () => {
  // ===== афиша без ключа OMDb
  let E = await H.setup({ sheet: new H.Sheet(items()) });
  const { page, sheet } = E;
  await page.goto(H.SITE + '#film/i/fe5160313');
  await page.waitForSelector('#drawer.on .screen.ok', { timeout: 8000 });
  ok(/\/w1280\/dune-bg\.jpg$/.test(await page.locator('#drawer .screen img').getAttribute('src')), 'кадр из фильма на «экране» вверху карточки');
  ok(await page.locator('#drawer .d-head.lifted .poster').count() === 1, 'постер заходит на кадр, как на афише');
  const meta = await txt(page, '#drawer .d-meta');
  ok(/2 ч 35 мин/.test(meta) && /Фантастика, приключения/.test(meta), 'длительность и жанры (' + meta + ')');
  ok(await txt(page, '#drawer .d-credit') === 'Режиссёр: Дени Вильнёв', 'режиссёр');
  ok(await txt(page, '#drawer .plot .tg') === '«Начало»', 'слоган');
  ok(/Арракис/.test(await txt(page, '#drawer .plot .ov')), 'описание сюжета по-русски');
  ok(await txt(page, '#drawer .plot .cast') === 'В ролях: Тимоти Шаламе, Ребекка Фергюсон, Оскар Айзек, Джош Бролин', 'четыре главных актёра');
  ok(/OMDb/.test(await txt(page, '#drawer .wr-note')) && await page.locator('#drawer .wr-note [data-act="go-omdb"]').count() === 1, 'без ключа OMDb — подсказка, как подключить');
  ok(/7,8/.test(await txt(page, '#drawer .wt')), 'плитка с оценкой TMDB');
  await wait(1500);
  const dune = row(sheet, 'fe5160313');
  ok(dune.info && dune.info.bg === '/dune-bg.jpg' && dune.info.rt === 155 && dune.info.dir === 'Дени Вильнёв' && dune.info.g.join() === 'фантастика,приключения', 'в таблицу сохранены только кадр, жанры, длительность и режиссёр');
  ok(!/Арракис|Шаламе/.test(JSON.stringify(dune)), 'описание и актёры не раздувают таблицу');
  ok(await page.evaluate(() => !!JSON.parse(localStorage.getItem('kinodnevnik:plot'))['tmdb:movie/438631'].ov), 'описание запомнено в браузере');
  await wait(400);
  await E.shot('60-afisha');
  // второй раз — сразу, без запроса к TMDB
  const calls = () => H.tmdbCalls().filter(c => c.includes('/movie/438631')).length;
  const c0 = calls();
  await page.reload();
  await page.waitForSelector('#drawer.on .plot .ov');
  ok(await page.locator('#drawer .screen.wait, #drawer .plot.wait').count() === 0, 'после перезагрузки афиша сразу, без «загрузки»');
  await wait(600);
  ok(calls() === c0, 'повторно в TMDB за подробностями не ходим');
  await page.keyboard.press('Escape');

  // сериал: сезоны, длина серии, создатель, IMDb из TMDB
  await page.goto(H.SITE + '#series/i/fe14667b3');
  await page.waitForSelector('#drawer.on .d-meta');
  const sm = await txt(page, '#drawer .d-meta');
  ok(/7 сезонов/.test(sm) && /серия ~1 ч/.test(sm), 'у сериала сезоны и длина серии (' + sm + ')');
  ok(await txt(page, '#drawer .d-credit') === 'Создатель: Чарли Брукер', 'создатель сериала');
  await wait(1500);
  ok(row(sheet, 'fe14667b3').imdb === 'tt2085059', 'ссылка на IMDb взята из TMDB и сохранена');
  await page.keyboard.press('Escape');
  // русского описания нет — английское с пометкой
  await page.goto(H.SITE + '#cartoon/i/f1df42d6e');
  await page.waitForSelector('#drawer.on .plot .ov');
  ok(/Miguel/.test(await txt(page, '#drawer .plot .ov')) && /на английском/.test(await txt(page, '#drawer .plot .lang')), 'нет русского описания — английское с пометкой');
  ok(await txt(page, '#drawer .d-credit') === 'Режиссёры: Ли Анкрич, Эдриан Молина', 'два режиссёра');
  await page.keyboard.press('Escape');
  // длинное описание сворачивается
  await page.goto(H.SITE + '#film/i/x3');
  await page.waitForSelector('#drawer.on .plot.clip .more-btn');
  await page.click('#drawer .plot .more-btn');
  ok(await page.locator('#drawer .plot.clip').count() === 0 && await txt(page, '#drawer .plot .more-btn') === 'Свернуть', 'длинное описание раскрывается по «Читать полностью»');
  await page.keyboard.press('Escape');
  // аниме: Shikimori
  await page.goto(H.SITE + '#anime/i/af35ef405');
  await page.waitForSelector('#drawer.on .plot .ov');
  const aov = await txt(page, '#drawer .plot .ov');
  ok(/^Юдзи Итадори — школьник/.test(aov) && !/\[/.test(aov), 'аниме: описание с Shikimori без служебной разметки');
  const am = await txt(page, '#drawer .d-meta');
  ok(/24 эп\. по 24 мин/.test(am) && /Сёнэн, экшен, сверхъестественное/.test(am), 'аниме: серии и жанры (' + am + ')');
  ok(await txt(page, '#drawer .d-credit') === 'Студия: MAPPA', 'аниме: студия');
  ok(/jjk1\.jpg$/.test(await page.locator('#drawer .screen img').getAttribute('src')), 'аниме: кадр из Shikimori');
  await wait(500);
  await E.shot('61-afisha-anime');
  await page.keyboard.press('Escape');
  // Shikimori не знает поля screenshots — спрашиваем проще, описание всё равно есть
  H.setShikiOldSchema(true);
  await page.goto(H.SITE + '#anime/i/a8b6a67ea');
  await page.waitForSelector('#drawer.on .plot .ov');
  ok(/юном ниндзя Наруто/.test(await txt(page, '#drawer .plot .ov')) && await page.locator('#drawer .screen').count() === 0, 'если Shikimori не знает поле, описание берётся упрощённым запросом');
  H.setShikiOldSchema(false);
  await page.keyboard.press('Escape');

  // ===== подключение OMDb
  await page.goto(H.SITE + '#film/i/fe5160313');
  await page.waitForSelector('#drawer.on [data-act="go-omdb"]');
  await page.click('#drawer [data-act="go-omdb"]');
  await page.waitForSelector('#omdb #omdb-key');
  ok(await page.locator('#omdb .steps li').count() === 4, 'в «Данных» четыре шага, как получить ключ OMDb');
  await page.locator('#omdb').scrollIntoViewIfNeeded();
  await E.shot('62-omdb-steps');
  await page.fill('#omdb-key', 'zzzz9999');
  await page.click('#omdbform button[type=submit]');
  await page.waitForSelector('#omdb-msg.err');
  ok(/активации/.test(await txt(page, '#omdb-msg')), 'неверный ключ: подсказка про ссылку активации');
  await page.fill('#omdb-key', 'http://www.omdbapi.com/?i=tt3896198&apikey=' + H.OMDB_KEY);
  await page.click('#omdbform button[type=submit]');
  await page.waitForFunction(() => document.querySelectorAll('#omdb .dotl.ok').length === 3);
  await wait(1500);
  ok(row(sheet, '__settings').cfg.omdb === H.OMDB_KEY && row(sheet, '__settings').cfg.tmdb === H.VALID, 'ключ вынут из ссылки и сохранён рядом с ключом TMDB');
  // карточка с оценками
  await page.goto(H.SITE + '#film/i/fe5160313');
  await page.waitForSelector('#drawer.on .wt .imdb-mark');
  const tiles = await page.locator('#drawer .wt').allInnerTexts();
  console.log('  плитки:', tiles.map(t => t.replace(/\s+/g, ' ')).join(' | '));
  ok(/IMDb 8,0 ?\/10 1 млн голосов/.test(tiles[0].replace(/\s+/g, ' ')), 'IMDb 8,0 и число голосов');
  ok(tiles.some(t => /Rotten Tomatoes\s*83%/.test(t)) && await page.locator('#drawer .wt svg').count() === 1, 'Rotten Tomatoes 83% со «свежим» помидором');
  ok(await page.locator('#drawer .wt .mc-box.mc-g').innerText() === '74', 'Metacritic 74 на зелёном');
  ok(await page.locator('#drawer input[data-f="ext.imdb"]').count() === 0 && await page.locator('#drawer input[data-f="ext.kp"]').count() === 1, 'IMDb вручную больше не нужен, Кинопоиск остался');
  await wait(1500);
  const o = row(sheet, 'fe5160313').ext.omdb;
  ok(o && o.imdb === 8 && o.rt === 83 && o.mc === 74 && o.votes === 1034567, 'оценки сохранены в таблице');
  await E.shot('63-afisha-ratings');
  await page.keyboard.press('Escape');
  // сериал без Rotten Tomatoes
  await page.goto(H.SITE + '#series/i/fe14667b3');
  await page.waitForSelector('#drawer.on .wt .imdb-mark');
  ok(/8,7/.test(await txt(page, '#drawer .wt')) && await page.locator('#drawer .wt svg, #drawer .mc-box').count() === 0, 'у сериала только то, что есть: IMDb без критиков');
  await page.keyboard.press('Escape');
  await page.goto(H.SITE + '#film/i/x3');
  await page.waitForSelector('#drawer.on .wt .imdb-mark');
  await page.keyboard.press('Escape');
  // тайтл без связи с TMDB
  await page.goto(H.SITE + '#film/i/fba996bba');
  await page.waitForSelector('#drawer.on');
  ok(/найди ему постер/.test(await txt(page, '#drawer .wr-note')) && await page.locator('#drawer .wr-note [data-act="poster-find"]').count() === 1, 'без связи с TMDB — подсказка найти постер');
  await page.keyboard.press('Escape');
  // сортировка по IMDb
  await page.goto(H.SITE + '#film');
  await page.waitForSelector('.row');
  ok(await page.locator('select[data-act-change="sort"] option[value="imdb"]').count() === 1, 'в фильмах появилась сортировка по IMDb');
  await page.selectOption('select[data-act-change="sort"]', 'imdb');
  await wait(200);
  const order = await page.evaluate(() => [...document.querySelectorAll('.row')].map(r => r.dataset.id));
  ok(order[0] === 'x3' && order[1] === 'fe5160313', 'сверху «Интерстеллар» (8,7), за ним «Дюна» (8,0)');
  const other = E.errors.filter(x => !/401|ERR_ACCESS_DENIED/.test(x));
  console.log(other.length ? 'ОШИБКИ:\n' + other.join('\n') : 'Других ошибок в консоли нет');
  ok(!other.length, 'в консоли нет посторонних ошибок');
  await E.browser.close();

  // ===== «Обновить всё сразу»
  E = await H.setup({ sheet: new H.Sheet(items({ omdb: H.OMDB_KEY })) });
  await E.page.goto(H.SITE + '#data');
  await E.page.waitForSelector('#en-box [data-act="en-start"]');
  ok(/Описания есть у 0 из 6 тайтлов, оценки — у 0 из 3/.test(await txt(E.page, '#en-box')), 'видно, у скольких уже есть описания и оценки');
  await E.page.click('[data-act="en-start"]');
  await E.page.waitForSelector('#en-box .ps-sum', { timeout: 20000 });
  await wait(1600);
  const S2 = E.sheet;
  ok(['fe5160313', 'fe14667b3', 'f1df42d6e', 'x3', 'af35ef405', 'a8b6a67ea'].every(id => row(S2, id).info && row(S2, id).info.at), 'подробности есть у всех шести (фильмы, сериал, мультфильм, аниме)');
  ok(['fe5160313', 'f1df42d6e', 'x3', 'fe14667b3'].every(id => row(S2, id).ext && row(S2, id).ext.omdb && row(S2, id).ext.omdb.imdb), 'оценки IMDb у всех со ссылкой, включая сериал, чья ссылка пришла из TMDB');
  ok(/Описаний добавлено: 6, оценок: 4/.test(await txt(E.page, '#en-box .ps-sum')), 'итог: 6 описаний, 4 оценки');
  await E.page.locator('#omdb').scrollIntoViewIfNeeded();
  await E.shot('64-omdb-done');
  await E.browser.close();

  // ===== OMDb: кончился лимит и неверный ключ
  E = await H.setup({ sheet: new H.Sheet(items({ omdb: H.OMDB_KEY })) });
  H.setOmdbMode('limit');
  await E.page.goto(H.SITE + '#film/i/fe5160313');
  await E.page.waitForSelector('#drawer.on .wr-note');
  ok(/все запросы на сегодня/.test(await txt(E.page, '#drawer .wr-note')), 'кончился лимит OMDb — честная подсказка');
  H.setOmdbMode('');
  await E.browser.close();
  E = await H.setup({ sheet: new H.Sheet(items({ omdb: 'wrongkey' })) });
  await E.page.goto(H.SITE + '#film/i/fe5160313');
  await E.page.waitForSelector('#drawer.on .wr-note [data-act="go-omdb"]');
  ok(/не принимает ключ/.test(await txt(E.page, '#drawer .wr-note')), 'ключ OMDb перестал работать — подсказка проверить');
  await E.browser.close();

  // ===== светлая тема и телефон
  E = await H.setup({ sheet: new H.Sheet(items({ omdb: H.OMDB_KEY })), scheme: 'light' });
  await E.page.addInitScript(() => { try { localStorage.setItem('kinodnevnik:theme', '"light"'); } catch (e) {} });
  await E.page.goto(H.SITE + '#film/i/fe5160313');
  await E.page.waitForSelector('#drawer.on .screen.ok');
  await E.page.waitForSelector('#drawer .wt .imdb-mark');
  await wait(800);
  await E.shot('65-afisha-light');
  await E.browser.close();
  E = await H.setup({ sheet: new H.Sheet(items({ omdb: H.OMDB_KEY })), viewport: { width: 390, height: 844 }, dpr: 2, mobile: true });
  await E.page.goto(H.SITE + '#film/i/fe5160313');
  await E.page.waitForSelector('#drawer.on .screen.ok');
  await E.page.waitForSelector('#drawer .wt .imdb-mark');
  const ow = await E.page.evaluate(() => { const b = document.querySelector('#drawer .d-body'); return [b.scrollWidth, b.clientWidth]; });
  ok(ow[0] <= ow[1], 'на телефоне афиша без прокрутки вбок (' + ow.join(', ') + ')');
  await wait(600);
  await E.shot('66-afisha-mobile');
  console.log(E.errors.length ? 'ОШИБКИ:\n' + E.errors.join('\n') : 'Ошибок в консоли нет (последний стенд)');
  await E.browser.close();
})().catch(e => { console.error(e); process.exit(1); });
