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
  ok(/\/w1280\/dune-a\.jpg$/.test(await page.locator('#drawer .screen img').getAttribute('src')), 'кадр — лучший по оценкам зрителей и без надписей');
  const sb = await page.locator('#drawer .screen').boundingBox();
  ok(Math.abs(sb.width / sb.height - 2) < .02, 'кадр обрезан мягко: 2:1 (' + (sb.width / sb.height).toFixed(2) + ')');
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
  ok(dune.info && dune.info.bg === '/dune-a.jpg' && dune.info.rt === 155 && dune.info.dir === 'Дени Вильнёв' && dune.info.g.join() === 'фантастика,приключения', 'в таблицу сохранены только кадр, жанры, длительность и режиссёр');
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

  // ===== «Другой кадр»
  const shotSrc = () => page.locator('#drawer .screen img').getAttribute('src');
  await page.goto(H.SITE + '#film/i/fe5160313');
  await page.waitForSelector('#drawer.on .screen.ok .shot-next');
  ok((await txt(page, '#drawer .shot-next')).replace(/\s/g, '') === 'Другойкадр1/3', 'на кадре кнопка «Другой кадр» и счётчик: 3 чистых кадра (с надписью отброшен)');
  await page.hover('#drawer .screen');
  await wait(250);
  await E.shot('72-afisha-shot');
  await page.click('#drawer .shot-next');
  await page.waitForFunction(() => /dune-b\.jpg$/.test(document.querySelector('#drawer .screen img').src));
  ok((await txt(page, '#drawer .shot-next')).replace(/\s/g, '') === 'Другойкадр2/3', 'второй кадр');
  await page.click('#drawer .shot-next');
  await page.waitForFunction(() => /dune-low\.jpg$/.test(document.querySelector('#drawer .screen img').src));
  await page.click('#drawer .shot-next');
  await page.waitForFunction(() => /dune-a\.jpg$/.test(document.querySelector('#drawer .screen img').src));
  ok(true, 'кадры листаются по кругу');
  await page.click('#drawer .shot-next');
  await page.waitForFunction(() => /dune-b\.jpg$/.test(document.querySelector('#drawer .screen img').src));
  await wait(1500);
  ok(row(sheet, 'fe5160313').info.bg === '/dune-b.jpg' && row(sheet, 'fe5160313').info.bgPick === 1, 'выбранный кадр сохранён в таблице');
  // кадр, выбранный вручную, не перебивается: даже если браузер забыл варианты и спросит базу снова
  await page.evaluate(() => localStorage.removeItem('kinodnevnik:plot'));
  await page.reload();
  await page.waitForSelector('#drawer.on .plot .ov');
  await wait(800);
  ok(/dune-b\.jpg$/.test(await shotSrc()) && row(sheet, 'fe5160313').info.bg === '/dune-b.jpg', 'после перезагрузки — твой кадр, а не лучший по мнению TMDB');
  await page.keyboard.press('Escape');
  // аниме: варианты — кадры с Shikimori
  await page.goto(H.SITE + '#anime/i/af35ef405');
  await page.waitForSelector('#drawer.on .screen.ok .shot-next');
  await page.click('#drawer .shot-next');
  await page.waitForFunction(() => /jjk2\.jpg$/.test(document.querySelector('#drawer .screen img').src));
  ok((await txt(page, '#drawer .shot-next')).replace(/\s/g, '') === 'Другойкадр2/3', 'у аниме тоже можно выбрать кадр');
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
  console.log(E.errors.length ? 'ОШИБКИ:\n' + E.errors.join('\n') : 'Ошибок в консоли нет (стенд с телефоном)');
  await E.browser.close();

  // ===== «Быстро оценить»
  const qItems = () => items({ omdb: H.OMDB_KEY }).concat([
    { id: 'q1', cat: 'film', title: 'Ловушка', orig: 'Trap', year: '2024', status: 'done', dates: ['2024-09-01'], tmdb: 'movie/917496', img: tm('/trap.jpg') },
    { id: 'q2', cat: 'film', title: 'Брат', year: '1997', status: 'done', dates: ['2020-05-01'] },
    { id: 'q3', cat: 'film', title: 'Бросил на середине', year: '2019', status: 'dropped', dates: ['2019-01-01'] }
  ]);
  E = await H.setup({ sheet: new H.Sheet(qItems()) });
  const P = E.page, Q = E.sheet;
  const qTitle = () => P.locator('#qr .qr-t').innerText();
  const nextCard = async prev => { await P.waitForFunction(p => { const t = document.querySelector('#qr .qr-card:not(.out):not(.out-r) .qr-t'); return t && t.textContent !== p; }, prev, { timeout: 5000 }); await wait(80); };
  await P.goto(H.SITE + '#home');
  await P.waitForSelector('.hero');
  ok(await P.locator('#nav a[data-act="rate-open"] .n').innerText() === '4', 'в меню «Быстро оценить» и число тайтлов без оценки (брошенные и планы не считаются)');
  await P.click('.nudge [data-act="rate-open"]');
  await P.waitForSelector('#qr.on .qr-card');
  ok(await P.evaluate(() => location.hash) === '#rate', 'режим открылся поверх дневника (#rate)');
  ok(await qTitle() === 'Наруто', 'первым — самый свежий просмотр');
  ok(await P.locator('#qr [data-act="qr-drop"]').count() === 0, 'у аниме с сезонами нет «Не досмотрел»: статус считается из сезонов');
  await P.hover('#qr .stars button[data-v="10"]');
  ok(await P.locator('#qr-word').innerText() === 'Шедевр', 'наведение на лампочку подсказывает слово');
  await P.mouse.move(5, 400);
  await E.shot('67-qr');
  await P.keyboard.press('8');
  await nextCard('Наруто');
  ok(await qTitle() === 'Ловушка', 'цифра 8 поставила оценку и открыла следующий');
  await P.waitForSelector('#qr .screen, #qr .qr-poster img');
  await P.fill('#qr-verdict', 'Неожиданно хорошо');
  await P.click('#qr .stars button[data-v="7"]');
  await nextCard('Ловушка');
  await wait(1500);
  ok(row(Q, 'a8b6a67ea').rating === 8 && row(Q, 'q1').rating === 7 && row(Q, 'q1').verdict === 'Неожиданно хорошо', 'оценки и вердикт сохранены в таблице');
  ok(await qTitle() === 'Черное зеркало', 'дальше «Черное зеркало»');
  await P.waitForSelector('#qr .qr-more .plot .ov');
  ok(/тёмной стороне/.test(await P.locator('#qr .qr-more .ov').innerText()), 'в режиме видно описание — проще вспомнить');
  await P.waitForSelector('#qr .qr-sc');
  ok(/IMDb\s*8,7/.test(await P.locator('#qr .qr-sc').innerText()), 'и оценки мира для ориентира');
  await wait(600);
  await E.shot('68-qr-series');
  await P.keyboard.press('ArrowRight');
  await nextCard('Черное зеркало');
  ok(await qTitle() === 'Брат', 'стрелка вправо — пропустить');
  await P.keyboard.press('ArrowLeft');
  await nextCard('Брат');
  ok(await qTitle() === 'Черное зеркало', 'стрелка влево — вернуть пропущенный');
  await P.keyboard.press('ArrowLeft');
  await nextCard('Черное зеркало');
  await wait(1500);
  ok(await qTitle() === 'Ловушка' && !row(Q, 'q1').rating && !row(Q, 'q1').verdict, '«Назад» снимает поставленную оценку и вердикт');
  await P.keyboard.press('9');
  await nextCard('Ловушка');
  await P.click('#qr [data-act="qr-drop"]');
  await nextCard('Черное зеркало');
  ok(await qTitle() === 'Брат', '«Не досмотрел» убирает из очереди');
  await P.keyboard.press('0');
  await P.waitForSelector('#qr .qr-end');
  const end = (await P.locator('#qr .qr-end').innerText()).replace(/\s+/g, ' ');
  console.log('  финал:', end);
  ok(/Конец/.test(end) && /оценено 3 тайтла, средняя оценка 9,0/.test(end), 'финальный экран: 3 тайтла, средняя 9,0');
  await E.shot('69-qr-end');
  await wait(1500);
  ok(row(Q, 'q1').rating === 9 && row(Q, 'q2').rating === 10 && row(Q, 'fe14667b3').status === 'dropped', 'цифра 0 — это 10; брошенный сохранён');
  await P.click('#qr .qr-end [data-act="qr-close"]');
  await P.waitForSelector('#qr.on', { state: 'detached' }).catch(() => {});
  await wait(300);
  ok(await P.locator('#qr.on').count() === 0 && await P.evaluate(() => location.hash) === '#home', 'выход возвращает на «Обзор»');
  ok(await P.locator('#nav a[data-act="rate-open"] .n').innerText() === '0', 'в меню теперь 0 без оценки');
  ok(/Оценено 7 из 9/.test(await P.locator('.nudge').innerText()), 'билет «Оценено» на главной обновился');
  await E.browser.close();

  // прямая ссылка, «Назад» в браузере, «Открыть карточку», раздел по умолчанию
  E = await H.setup({ sheet: new H.Sheet(qItems()) });
  await E.page.goto(H.SITE + '#rate');
  await E.page.waitForSelector('#qr.on .qr-card');
  ok(true, 'ссылка #rate сразу открывает режим');
  await E.page.goBack();
  await wait(300);
  ok(await E.page.locator('#qr.on').count() === 0, 'кнопка «Назад» браузера закрывает режим');
  await E.page.goto(H.SITE + '#film');
  await E.page.waitForSelector('.row');
  await E.page.click('#nav a[data-act="rate-open"]');
  await E.page.waitForSelector('#qr.on .qr-card');
  ok(await E.page.locator('#qr [data-act="qr-filter"][aria-pressed="true"]').innerText().then(t => /Фильмы/.test(t)) && await E.page.locator('#qr .qr-t').innerText() === 'Ловушка', 'из раздела «Фильмы» — сразу фильмы');
  await E.page.click('#qr [data-act="qr-open"]');
  await E.page.waitForSelector('#drawer.on');
  ok(await E.page.locator('#qr.on').count() === 0 && await E.page.locator('#dtitle').innerText() === 'Ловушка', '«Открыть карточку» ведёт в полную карточку');
  await E.browser.close();

  // телефон и светлая тема
  E = await H.setup({ sheet: new H.Sheet(qItems()), viewport: { width: 390, height: 844 }, dpr: 2, mobile: true });
  await E.page.goto(H.SITE + '#home');
  await E.page.waitForSelector('.hero');
  await E.page.click('#tabs a[data-act="rate-open"]');
  await E.page.waitForSelector('#qr.on .qr-card');
  await wait(700);
  const qw = await E.page.evaluate(() => { const q = document.querySelector('#qr'); return [q.scrollWidth, q.clientWidth]; });
  ok(qw[0] <= qw[1], 'на телефоне режим без прокрутки вбок (' + qw.join(', ') + ')');
  await E.shot('70-qr-mobile');
  await E.browser.close();
  E = await H.setup({ sheet: new H.Sheet(qItems()), scheme: 'light' });
  await E.page.addInitScript(() => { try { localStorage.setItem('kinodnevnik:theme', '"light"'); } catch (e) {} });
  await E.page.goto(H.SITE + '#series');
  await E.page.waitForSelector('.row');
  await E.page.click('#nav a[data-act="rate-open"]');
  await E.page.waitForSelector('#qr.on .qr-more .plot .ov');
  await wait(900);
  await E.shot('71-qr-light');
  console.log(E.errors.length ? 'ОШИБКИ:\n' + E.errors.join('\n') : 'Ошибок в консоли нет (последний стенд)');
  await E.browser.close();
})().catch(e => { console.error(e); process.exit(1); });
