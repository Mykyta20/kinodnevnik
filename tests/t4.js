// Сценарий 4: постеры из TMDB для уже записанных тайтлов и подсветка карточки цветом постера.
const H = require('./harness');
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) process.exitCode = 1; };
const wait = ms => new Promise(r => setTimeout(r, ms));
const cfg = () => ({ id: '__settings', cat: 'settings', title: 'Служебная запись', status: '', dates: [], cfg: { tmdb: H.VALID } });
function posterItems() {
  return H.seedItems().concat([
    { id: 'x1', cat: 'film', title: 'Ловушка', orig: 'Trap', year: '2024', status: 'done', dates: ['2024-09-01'] },
    { id: 'x2', cat: 'film', title: 'Брат', year: '2000', status: 'done', dates: ['2020-05-01'] },
    { id: 'x3', cat: 'film', title: 'Интерстеллар', orig: 'Interstellar', year: '2014', status: 'done', dates: ['2021-02-01'], tmdb: 'movie/157336', imdb: 'tt0816692' },
    { id: 'x4', cat: 'film', title: 'Дом', orig: 'Home', year: '2009', status: 'done', dates: ['2022-04-22'] },
    { id: 'x5', cat: 'anime', title: 'Атака титанов', orig: 'Shingeki no Kyojin', year: '2013', status: 'planned', dates: [], mal: 16498 },
    { id: 'x6', cat: 'film', title: 'Домашнее видео', year: '2019', status: 'done', dates: ['2019-08-01'], noimg: true },
    { id: 'x7', cat: 'toon', title: 'Гравити Фолз', orig: 'Gravity Falls', year: '2012–2016', status: 'planned', dates: [], updated: '2023-01-15T10:00:00.000Z' },
    cfg()
  ]);
}
const row = (sheet, id) => sheet.rows.find(r => r.id === id) || {};
const done = page => page.waitForSelector('#posters .ps-sum', { timeout: 30000 });

(async () => {
  // ===== основной сценарий: подбор, выбор, пропуск, поиск по другому названию
  let E = await H.setup({ sheet: new H.Sheet(posterItems()) });
  const { page, sheet } = E;
  await page.goto(H.SITE + '#data');
  await page.waitForSelector('#posters');
  const intro = await page.locator('#posters').innerText();
  ok(/Без постера: 9 из 10/.test(intro), 'без постера 9 из 10: аниме и «пропущенные» не считаются');
  ok(/Пропущено вручную: 1/.test(intro), 'видно, сколько пропущено вручную');
  await page.locator('#posters').scrollIntoViewIfNeeded();
  await E.shot('40-posters-idle');
  const callsBefore = H.tmdbCalls().length;
  await page.click('[data-act="ps-start"]');
  await page.waitForSelector('#ps-meter');
  ok(await page.locator('[data-act="ps-pause"]').count() === 1, 'во время подбора есть кнопка «Пауза»');
  await done(page);
  await wait(1600);
  const sum = await page.locator('#posters .ps-sum').innerText();
  console.log('  итог:', sum);
  ok(/Сохранено постеров: 6, ещё 3 ждут/.test(sum), '6 постеров сохранены сами, 3 ждут выбора');
  const dune = row(sheet, 'fe5160313');
  ok(dune.tmdb === 'movie/438631' && dune.imdb === 'tt1160419' && /\/w342\/dune21\.jpg$/.test(dune.img) && dune.ext && dune.ext.tmdb === 7.8, '«Дюна» 2021: постер, TMDB, IMDb, оценка (а не «Дюна» 1984)');
  ok(row(sheet, 'fe14667b3').tmdb === 'tv/42009' && row(sheet, 'fe14667b3').imdb === 'tt2085059', 'сериал найден среди сериалов');
  ok(row(sheet, 'f1df42d6e').tmdb === 'movie/354912', 'из двух «Коко» 2017 года выбран известный мультфильм');
  ok(/inter\.jpg$/.test(row(sheet, 'x3').img) && row(sheet, 'x3').tmdb === 'movie/157336', 'тайтл со ссылкой TMDB получил постер напрямую');
  ok(row(sheet, 'x4').tmdb === 'movie/62320' && H.tmdbCalls().slice(callsBefore).some(c => /search\/movie\?.*year=2009/.test(c)), '«Дом» 2009 найден повторным поиском с годом');
  const gf = row(sheet, 'x7');
  ok(gf.tmdb === 'tv/40075' && /gf\.jpg$/.test(gf.img), 'мультсериал найден');
  ok(gf.updated === '2023-01-15T10:00:00.000Z', 'постер не сдвинул тайтл в «Хочу посмотреть» (дата правки та же)');
  ok(!row(sheet, 'x1').img && !row(sheet, 'x2').img && !row(sheet, 'fba996bba').img, 'спорные тайтлы без спроса не тронуты');
  ok(!row(sheet, 'x5').img && !H.tmdbCalls().slice(callsBefore).some(c => /shingeki|%D0%90%D1%82%D0%B0%D0%BA/i.test(c)), 'аниме не трогается');
  ok(await page.locator('.ps-cell').count() === 6, 'сохранённые сами видны сеткой постеров');
  ok(await page.locator('.pcard').count() === 3, 'три карточки на выбор');
  ok(await page.locator('.pcard[data-id="x1"] .pvar').count() === 2, '«Ловушка»: два варианта одного года');
  ok(await page.locator('.pcard[data-id="x2"] .pvar').count() === 2, '«Брат» с неверным годом: на выбор, а не сам');
  ok(/не нашлось/.test(await page.locator('.pcard[data-id="fba996bba"]').innerText()), '«Сны поездов»: честно «не нашлось»');
  await page.locator('#posters').scrollIntoViewIfNeeded();
  await E.shot('41-posters-done', { fullPage: true });

  // выбрать вариант
  await page.click('.pcard[data-id="x1"] .pvar[data-k="tmdb:movie/917496"]');
  await page.waitForSelector('.pcard[data-id="x1"]', { state: 'detached' });
  await wait(1600);
  const trap = row(sheet, 'x1');
  ok(trap.tmdb === 'movie/917496' && trap.imdb === 'tt26753557' && /trap\.jpg$/.test(trap.img), 'выбранный постер сохранён с IMDb');
  // пропустить
  await page.click('.pcard[data-id="x2"] [data-act="ps-skip"]');
  await page.waitForSelector('.pcard[data-id="x2"]', { state: 'detached' });
  await wait(1600);
  ok(row(sheet, 'x2').noimg === true && !row(sheet, 'x2').img, 'пропуск запомнен в таблице');
  ok(/Пропущено вручную: 2/.test(await page.locator('#posters').innerText()), 'счётчик пропущенных обновился');
  // поиск по другому названию
  await page.fill('.pcard[data-id="fba996bba"] input[name=q]', 'Train Dreams');
  await page.press('.pcard[data-id="fba996bba"] input[name=q]', 'Enter');
  await page.waitForSelector('.pcard[data-id="fba996bba"] .pvar');
  await E.shot('42-posters-search');
  await page.click('.pcard[data-id="fba996bba"] .pvar');
  await page.waitForSelector('.pcard', { state: 'detached' });
  await wait(1600);
  const train = row(sheet, 'fba996bba');
  ok(train.tmdb === 'movie/1100000' && /train\.jpg$/.test(train.img) && !train.updated, 'найден по оригинальному названию и сохранён');
  ok(await page.locator('#ps-cards').count() === 0, 'карточки на выбор закончились');
  // вернуть пропущенные
  await page.click('[data-act="ps-unskip"]');
  await wait(1600);
  ok(!row(sheet, 'x2').noimg && !row(sheet, 'x6').noimg, 'пропущенные вернулись в подбор');
  ok(/Без постера: 2 из 10/.test(await page.locator('#posters').innerText()) && await page.locator('[data-act="ps-start"]').count() === 1, 'можно подобрать снова для оставшихся');

  // ===== строки списков: у каждого тайтла маленький постер
  await page.goto(H.SITE + '#film');
  await page.waitForSelector('.row');
  ok(/\/w92\/dune21\.jpg$/.test(await page.locator('.row[data-id="fe5160313"] .pic img').getAttribute('src')), 'в списке фильмов у «Дюны» маленький постер (w92)');
  await page.waitForFunction(() => { const i = document.querySelector('.row[data-id="fe5160313"] .pic img'); return i && i.complete && i.naturalWidth > 0; });
  const brat = page.locator('.row[data-id="x2"] .pic');
  ok(await brat.locator('img').count() === 0 && (await brat.innerText()).trim() === 'Б', 'без постера — заглушка с первой буквой названия');
  const rowBox = await page.locator('.row[data-id="x4"]').boundingBox(), picBox = await page.locator('.row[data-id="x4"] .pic').boundingBox();
  ok(picBox.width === 40 && Math.round(picBox.height) === 60 && rowBox.height <= 84, 'обложка 40×60, строка без вердикта осталась компактной (' + Math.round(rowBox.height) + ' пикс.)');
  await wait(300);
  await E.shot('49-list-posters');
  await page.goto(H.SITE + '#anime');
  await page.waitForSelector('.row');
  ok(await page.locator('.row .pic img[src*="myanimelist"]').count() === 2, 'аниме показывают свои постеры с MyAnimeList');
  await page.goto(H.SITE + '#home');
  await page.waitForSelector('.hero');
  ok(await page.locator('#hshelf .ptile img').count() >= 4, 'в «Обзоре» недавние — полкой постеров');
  await page.click('#nav a[data-v="data"]');
  await page.waitForSelector('#posters');

  // ===== карточка тайтла: подсветка цветом постера, «Найти постер», «Сменить постер», «Убрать постер»
  await page.goto(H.SITE + '#film/i/fe5160313');
  await page.waitForSelector('#drawer.on .poster');
  await page.waitForFunction(() => /^#[0-9a-f]{6}$/.test(document.querySelector('#drawer').dataset.tint), null, { timeout: 5000 });
  await wait(900); // цвет перетекает плавно
  const rgb = h => 'rgb(' + [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)).join(', ') + ')';
  const tint = await page.evaluate(() => { const d = document.querySelector('#drawer'); return { t: d.dataset.tint, css: getComputedStyle(d).getPropertyValue('--tint').trim(), film: getComputedStyle(document.documentElement).getPropertyValue('--c-film').trim() }; });
  console.log('  подсветка «Дюны»:', JSON.stringify(tint));
  ok(tint.t !== tint.film.toLowerCase() && tint.css === rgb(tint.t), 'карточка подсвечена цветом постера, а не цветом раздела');
  await E.shot('43-drawer-tint');
  // второй раз цвет берётся из памяти сразу, без загрузки картинки
  await page.keyboard.press('Escape');
  await page.reload();
  await page.goto(H.SITE + '#film/i/fe5160313');
  await page.waitForSelector('#drawer.on');
  ok(await page.evaluate(() => document.querySelector('#drawer').dataset.tint) === tint.t, 'после перезагрузки цвет сразу из памяти браузера');
  await page.keyboard.press('Escape');
  // «Найти постер» в карточке тайтла без постера
  await page.goto(H.SITE + '#film/i/x2');
  await page.waitForSelector('#drawer.on .poster-ph');
  await page.click('#drawer .poster-ph');
  await page.waitForSelector('#ppick .pvar');
  ok(await page.locator('#ppick .pvar').count() === 2, 'в карточке тайтла показаны варианты');
  await E.shot('44-drawer-pick');
  await page.click('#ppick .pvar[data-k="tmdb:movie/20992"]');
  await page.waitForSelector('#drawer.on img.poster');
  await wait(1600);
  ok(row(sheet, 'x2').tmdb === 'movie/20992' && row(sheet, 'x2').imdb === 'tt0118767' && /brat\.jpg$/.test(row(sheet, 'x2').img), 'постер из карточки тайтла сохранён');
  ok(await page.locator('#ppick').count() === 0, 'блок выбора закрылся');
  // «Сменить постер» → «Убрать постер»
  await page.click('#drawer details summary');
  await page.click('#drawer [data-act="poster-find"]');
  await page.waitForSelector('#ppick .pvar');
  ok(await page.locator('#ppick .pvar.on .pv-now').count() === 1, 'текущий постер отмечен «сейчас»');
  await page.click('#ppick [data-act="poster-remove"]');
  await page.waitForSelector('#drawer.on .poster-ph');
  await wait(1600);
  const br = row(sheet, 'x2');
  ok(!br.img && !br.tmdb && !br.imdb && br.noimg === true, 'постер убран вместе со ссылками, тайтл больше не подбирается');
  await page.keyboard.press('Escape');
  // аниме: MyAnimeList не даёт читать цвет — одна попытка, дальше браузер помнит
  const malCors = () => H.imgCalls().filter(x => /^cors cdn\.myanimelist/.test(x)).length;
  await page.goto(H.SITE + '#anime/i/af35ef405');
  await page.waitForSelector('#drawer.on .poster');
  await page.waitForFunction(() => { try { return JSON.parse(localStorage.getItem('kinodnevnik:tints')).bad['cdn.myanimelist.net'] === 1; } catch (e) { return false; } }, null, { timeout: 5000 });
  ok(await page.evaluate(() => document.querySelector('#drawer').dataset.tint) === '', 'аниме с MyAnimeList: остаётся цвет раздела');
  ok(await page.locator('#drawer.on img.poster').evaluate(i => i.complete && i.naturalWidth > 0), 'сам постер аниме при этом показан');
  const e1 = malCors();
  await page.keyboard.press('Escape');
  await page.goto(H.SITE + '#anime/i/a8b6a67ea');
  await page.waitForSelector('#drawer.on .poster');
  await wait(800);
  ok(e1 === 1 && malCors() === 1, 'к MyAnimeList за цветом сходили один раз, дальше не ходим (' + e1 + ', ' + malCors() + ')');
  const other = E.errors.filter(x => !/ERR_ACCESS_DENIED|401/.test(x));
  console.log(other.length ? 'ОШИБКИ:\n' + other.join('\n') : 'Других ошибок в консоли нет');
  ok(!other.length, 'в консоли нет посторонних ошибок');
  await E.browser.close();

  // ===== пауза и продолжение
  E = await H.setup({ sheet: new H.Sheet(posterItems()), tmdbDelay: 350 });
  await E.page.goto(H.SITE + '#data');
  await E.page.waitForSelector('#posters');
  await E.page.click('[data-act="ps-start"]');
  await wait(900);
  await E.page.click('[data-act="ps-pause"]');
  await E.page.waitForSelector('[data-act="ps-resume"]');
  await wait(1800); // запросы, которые уже летели, долетают
  const c1 = H.tmdbCalls().length, t1 = await E.page.locator('#ps-count').innerText();
  await wait(1500);
  ok(H.tmdbCalls().length === c1, 'на паузе запросы к TMDB не идут');
  console.log('  на паузе:', t1);
  ok(/Проверено [1-8] из 9/.test(t1), 'на паузе видно, сколько уже проверено');
  const savedN = +(/Сохранено постеров: (\d+)/.exec(t1) || [])[1];
  ok(await E.page.locator('.ps-cell').count() === savedN, 'на паузе сетка показывает все уже сохранённые постеры (' + savedN + ')');
  await E.shot('45-posters-paused');
  await E.page.click('[data-act="ps-resume"]');
  await done(E.page);
  await wait(1600);
  ok(/Сохранено постеров: 6/.test(await E.page.locator('#posters .ps-sum').innerText()) && row(E.sheet, 'fe5160313').tmdb === 'movie/438631', 'после «Продолжить» подбор закончился как обычно');
  await E.browser.close();

  // ===== TMDB просит подождать (429)
  E = await H.setup({ sheet: new H.Sheet(posterItems()), tmdb429: { n: 4 } });
  await E.page.goto(H.SITE + '#data');
  await E.page.waitForSelector('#posters');
  await E.page.click('[data-act="ps-start"]');
  await done(E.page);
  ok(/Сохранено постеров: 6/.test(await E.page.locator('#posters .ps-sum').innerText()) && !/не удалось/.test(await E.page.locator('#posters .ps-sum').innerText()), 'после «подожди» от TMDB запросы повторились, ничего не потеряно');
  await E.browser.close();

  // ===== ключ перестал работать посреди подбора
  E = await H.setup({ sheet: new H.Sheet(posterItems()), tmdbDelay: 250 });
  await E.page.goto(H.SITE + '#data');
  await E.page.waitForSelector('#posters');
  await E.page.click('[data-act="ps-start"]');
  await wait(400);
  H.setTmdbRevoked(true);
  await E.page.waitForSelector('#posters .key-msg.err', { timeout: 10000 });
  ok(/ключ/.test(await E.page.locator('#posters .key-msg.err').innerText()), 'понятное сообщение про ключ, подбор на паузе');
  H.setTmdbRevoked(false);
  await E.page.click('[data-act="ps-resume"]');
  await done(E.page);
  await wait(1600);
  const imgs = ['fe5160313', 'fe14667b3', 'f1df42d6e', 'x3', 'x4', 'x7'].filter(id => row(E.sheet, id).img).length;
  ok(imgs === 6, 'после «Продолжить» все уверенные постеры на месте (' + imgs + ')');
  await E.browser.close();

  // ===== без ключа TMDB
  E = await H.setup({});
  await E.page.goto(H.SITE + '#data');
  await E.page.waitForSelector('#posters');
  ok(await E.page.locator('#posters [data-act="go-tmdb"]').count() === 1 && await E.page.locator('[data-act="ps-start"]').count() === 0, 'без ключа: просьба подключить TMDB вместо кнопки');
  await E.page.goto(H.SITE + '#film/i/fe5160313');
  await E.page.waitForSelector('#drawer.on');
  ok(await E.page.locator('#drawer .poster-ph').count() === 0, 'без ключа в карточке нет «Найти постер»');
  await E.browser.close();

  // ===== много тайтлов: сохраняется пачками, не дожидаясь конца
  const many = Array.from({ length: 45 }, (_, i) => ({ id: 'm' + i, cat: 'film', title: 'Фильм ' + i, orig: 'Film ' + i, year: String(2000 + i % 20), status: 'done', dates: ['2021-01-' + String(1 + i % 28).padStart(2, '0')] }));
  E = await H.setup({ sheet: new H.Sheet(many.concat([cfg()])), tmdbDelay: 150 });
  await E.page.goto(H.SITE + '#data');
  await E.page.waitForSelector('#posters');
  await E.page.click('[data-act="ps-start"]');
  await E.page.waitForFunction(() => /Проверено (3\d|4\d) из 45/.test((document.querySelector('#ps-count') || {}).textContent || ''), null, { timeout: 30000 });
  await wait(300);
  const midway = E.sheet.rows.filter(r => r.img).length;
  ok(midway >= 20, 'во время подбора в таблице уже есть сохранённые постеры (' + midway + ')');
  await done(E.page);
  await wait(1800);
  console.log('  пачки saveItems:', E.sheet.batches.join(', '));
  ok(E.sheet.rows.filter(r => r.img).length === 45, 'все 45 постеров в таблице');
  ok(E.sheet.batches.length >= 3 && Math.max(...E.sheet.batches) <= 25, 'сохранение пачками по 20 с небольшим');
  await E.browser.close();

  // ===== телефон и светлая тема
  E = await H.setup({ sheet: new H.Sheet(posterItems()), viewport: { width: 390, height: 844 }, dpr: 2, mobile: true });
  await E.page.goto(H.SITE + '#data');
  await E.page.waitForSelector('#posters');
  await E.page.click('[data-act="ps-start"]');
  await done(E.page);
  await E.page.locator('#ps-cards').scrollIntoViewIfNeeded();
  const sw = await E.page.evaluate(() => document.documentElement.scrollWidth);
  ok(sw <= 390, 'на телефоне нет горизонтальной прокрутки (' + sw + ')');
  await E.shot('46-mobile-posters');
  await E.page.goto(H.SITE + '#film');
  await E.page.waitForSelector('.row .pic img');
  const msw = await E.page.evaluate(() => [document.documentElement.scrollWidth, document.querySelector('.row .pic').getBoundingClientRect().width]);
  ok(msw[0] <= 390 && msw[1] === 36, 'список с постерами на телефоне: без прокрутки вбок, обложка 36 пикс. (' + msw.join(', ') + ')');
  await wait(300);
  await E.shot('50-mobile-list');
  await E.browser.close();

  E = await H.setup({ sheet: new H.Sheet(posterItems()), scheme: 'light' });
  await E.page.addInitScript(() => { try { localStorage.setItem('kinodnevnik:theme', '"light"'); } catch (e) {} });
  await E.page.goto(H.SITE + '#data');
  await E.page.waitForSelector('#posters');
  await E.page.click('[data-act="ps-start"]');
  await done(E.page);
  await E.page.locator('#ps-cards').scrollIntoViewIfNeeded();
  await E.shot('47-light-posters');
  await E.page.goto(H.SITE + '#home');
  await E.page.waitForSelector('#hshelf .ptile img');
  await E.page.locator('#hshelf').scrollIntoViewIfNeeded();
  await wait(400);
  await E.shot('51-light-home');
  await E.page.goto(H.SITE + '#film/i/fe5160313');
  await E.page.waitForSelector('#drawer.on .poster');
  await wait(900);
  await E.shot('48-light-drawer-tint');
  console.log(E.errors.length ? 'ОШИБКИ:\n' + E.errors.join('\n') : 'Ошибок в консоли нет (последний стенд)');
  await E.browser.close();
})().catch(e => { console.error(e); process.exit(1); });
