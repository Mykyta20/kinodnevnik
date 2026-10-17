// Сценарий 6: цель на год, «Что посмотреть дальше», мелкие штрихи, «Итоги года».
const H = require('./harness');
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) process.exitCode = 1; };
const wait = ms => new Promise(r => setTimeout(r, ms));
const NOW = '2026-10-17T12:00:00';
const tm = p => 'https://image.tmdb.org/t/p/w342' + p;
const cfg = extra => ({ id: '__settings', cat: 'settings', title: 'Служебная запись', status: '', dates: [], cfg: Object.assign({ tmdb: H.VALID }, extra || {}) });
function items(extra) {
  const L = H.seedItems();
  const by = id => L.find(x => x.id === id);
  Object.assign(by('fe5160313'), { tmdb: 'movie/438631', imdb: 'tt1160419', img: tm('/dune21.jpg') });
  Object.assign(by('f1df42d6e'), { tmdb: 'movie/354912', imdb: 'tt2380307', img: tm('/coco.jpg') });
  return L.concat([
    { id: 'g1', cat: 'film', title: 'Беги, Лола, беги', orig: 'Lola rennt', year: '1998', status: 'done', dates: ['2026-01-15'], dub: 'Немецкая озвучка', rating: 8 },
    { id: 'g2', cat: 'film', title: 'Интерстеллар', orig: 'Interstellar', year: '2014', status: 'done', dates: ['2026-03-01', '2026-09-10'], tmdb: 'movie/157336', imdb: 'tt0816692', img: tm('/inter.jpg'), rating: 10 },
    cfg(extra)
  ]);
}
const row = (sheet, id) => sheet.rows.find(r => r.id === id) || {};
const txt = async (page, sel) => (await page.locator(sel).first().innerText()).replace(/\s+/g, ' ').trim();

(async () => {
  // ===== цель на год
  let E = await H.setup({ sheet: new H.Sheet(items()), now: NOW });
  const { page, sheet } = E;
  await page.goto(H.SITE + '#home');
  await page.waitForSelector('.goal.goal-ask');
  ok(/Поставь цель на 2026 год/.test(await txt(page, '.goal')) && /В 2025 году был 1 просмотр/.test(await txt(page, '.goal')), 'приглашение поставить цель и прошлый год для ориентира');
  await E.shot('80-goal-ask');
  await page.click('.goal [data-act="goal-edit"]');
  await page.waitForSelector('#goalform');
  ok(await page.inputValue('#goalform input[name=n]') === '12', 'предложено число по прошлому году');
  ok(await page.locator('#goal-de').isHidden(), 'цель «на немецком» по желанию');
  await page.fill('#goalform input[name=n]', '10');
  await page.check('#goalform input[name=deOn]');
  ok(await page.locator('#goal-de').isVisible(), 'галочка открывает вторую цель');
  await page.fill('#goalform input[name=de]', '2');
  await page.click('#goalform button[type=submit]');
  await page.waitForSelector('.goal .goal-ring');
  await wait(1500);
  const g = (row(sheet, '__settings').cfg.goals || {})['2026'];
  ok(g && g.n === 10 && g.de === 2 && row(sheet, '__settings').cfg.tmdb === H.VALID, 'цель сохранена в таблице, ключ TMDB на месте');
  const goal = await txt(page, '.goal');
  console.log('  цель:', goal);
  ok(/^3 из 10/.test(goal) && /Цель на 2026 год: 10 просмотров/.test(goal), 'кольцо: 3 из 10 (повторный просмотр тоже считается)');
  ok(/Отстаёшь от плана на 5/.test(goal) && /один просмотр в 2 недели/.test(goal), 'темп: к 17 октября по плану было бы 8');
  ok(/На немецком: 1 из 2/.test(goal), 'вторая цель: 1 из 2 на немецком (по полю «Озвучка»)');
  await wait(1300);
  await E.shot('81-goal');
  // перевыполнение
  await page.click('.goal [data-act="goal-edit"]');
  await page.fill('#goalform input[name=n]', '3');
  await page.click('#goalform button[type=submit]');
  await page.waitForSelector('.goal.done');
  ok(/Цель выполнена/.test(await txt(page, '.goal')), 'цель выполнена — кольцо зелёное');
  // убрать
  await page.click('.goal [data-act="goal-edit"]');
  await page.click('#goalform [data-act="goal-del"]');
  await wait(300);
  ok(await page.locator('.goal').count() === 0, 'после «Убрать цель» на «Обзоре» блока нет');
  await page.click('#nav a[data-v="stats"]');
  await page.waitForSelector('.goal.goal-ask');
  ok(await page.locator('.goal [data-act="goal-hide"]').count() === 0, 'а в «Статистике» цель можно поставить снова');
  await E.browser.close();

  // «Не сейчас» прячет приглашение на «Обзоре»
  E = await H.setup({ sheet: new H.Sheet(items()), now: NOW });
  await E.page.goto(H.SITE + '#home');
  await E.page.waitForSelector('.goal.goal-ask');
  await E.page.click('.goal [data-act="goal-hide"]');
  await wait(1500);
  ok(await E.page.locator('.goal').count() === 0 && row(E.sheet, '__settings').cfg.goalHide === '2026', '«Не сейчас» прячет приглашение до следующего года');
  await E.browser.close();

  // ===== «Что посмотреть дальше»
  E = await H.setup({ sheet: new H.Sheet(items()), now: NOW });
  const recCalls = () => H.tmdbCalls().filter(c => /recommendations/.test(c)).length;
  await E.page.goto(H.SITE + '#watchlist');
  await E.page.waitForSelector('.rcard:not(.wait) .rc-t');
  const rt = await E.page.locator('.rcard:not(.wait) .rc-t').allInnerTexts();
  console.log('  советы:', rt.join(' | '));
  ok(rt.join('|') === 'Бегущий по лезвию 2049|Начало|Головоломка|Дюна: Часть вторая', 'первым — то, что советуют сразу два любимых тайтла');
  ok(/Похоже на: «Интерстеллар», «Дюна»/.test(await txt(E.page, '.rcard .rc-why')), 'видно, почему советует');
  ok(!rt.some(t => /^(Интерстеллар|Дюна|Малоизвестный|Без постера|Будущий фильм)$/.test(t)), 'без записанного, малоизвестного, без постера и не вышедшего');
  await wait(400);
  await E.shot('83-recs');
  const r0 = recCalls();
  // «+» — сразу в список
  await E.page.hover('.rc-main[data-k="tmdb:movie/27205"]');
  await E.page.click('.rc-add[data-k="tmdb:movie/27205"]');
  await E.page.waitForSelector('.rc-main[data-k="tmdb:movie/27205"]', { state: 'detached' });
  await wait(1600);
  const inc = E.sheet.rows.find(r => r.title === 'Начало') || {};
  ok(inc.status === 'planned' && inc.tmdb === 'movie/27205' && /inception\.jpg$/.test(inc.img) && inc.imdb === 'tt1375666' && inc.year === '2010', '«+» добавил «Начало» в «Хочу посмотреть» с постером, годом и IMDb');
  ok(await E.page.locator('.row:has-text("Начало")').count() === 1, 'и он сразу в списке ниже');
  // скрыть
  await E.page.hover('.rc-main[data-k="tmdb:movie/150540"]');
  await E.page.click('.rc-x[data-k="tmdb:movie/150540"]');
  await E.page.waitForSelector('.rc-main[data-k="tmdb:movie/150540"]', { state: 'detached' });
  await wait(1500);
  ok((row(E.sheet, '__settings').cfg.recNo || []).includes('movie/150540'), '«×» — больше не советовать (запомнено в таблице)');
  // карточка — через форму, можно сменить статус
  await E.page.click('.rc-main[data-k="tmdb:movie/693134"]');
  await E.page.waitForSelector('#addform');
  ok(await E.page.inputValue('#addform select[name=status]') === 'planned' && await E.page.inputValue('#addform input[name=title]') === 'Дюна: Часть вторая', 'клик по постеру открывает форму со статусом «Хочу посмотреть»');
  await E.page.selectOption('#addform select[name=status]', 'done');
  await E.page.click('#addform button[type=submit]');
  await E.page.waitForSelector('#drawer.on');
  await wait(1500);
  ok((E.sheet.rows.find(r => r.title === 'Дюна: Часть вторая') || {}).status === 'done', 'если уже смотрел — можно сразу отметить просмотренным');
  await E.page.keyboard.press('Escape');
  // кэш на сутки и «Обновить»
  await E.page.reload();
  await E.page.waitForSelector('.rcard:not(.wait) .rc-t');
  ok(await E.page.locator('.rcard').count() === 1 && recCalls() === r0, 'после перезагрузки советы из памяти, без новых запросов');
  await E.page.click('[data-act="recs-reload"]');
  await E.page.waitForFunction(n => window.__n === undefined && document.querySelector('.rcard'), r0);
  await wait(800);
  ok(recCalls() > r0, '«Обновить» подбирает заново');
  await E.browser.close();

  // ===== мелкие штрихи
  E = await H.setup({ sheet: new H.Sheet(items()), now: NOW, gsDelay: 1500 });
  await E.page.goto(H.SITE + '#home');
  await E.page.waitForSelector('.loading .leader');
  ok(await E.page.locator('.leader .ld-n i').count() === 3, 'пока грузится таблица — плёночный отсчёт 3, 2, 1');
  await wait(300);
  await E.shot('85-leader');
  await E.page.waitForSelector('.hero', { timeout: 15000 });
  ok(await E.page.title() === 'Кинодневник', 'во вкладке — «Кинодневник»');
  await E.page.click('#nav a[data-v="film"]');
  ok(await E.page.locator('#content.enter').count() === 1, 'раздел появляется плавно');
  await E.page.click('.row[data-id="g1"]');
  await E.page.waitForSelector('#drawer.on');
  ok(await E.page.title() === 'Беги, Лола, беги — Кинодневник', 'открытый тайтл виден в названии вкладки');
  await E.page.click('#drawer .stars button[data-v="10"]');
  ok(await E.page.locator('#drawer .stars button.on.flash10').count() === 1, 'оценка 10 — лампочка вспыхивает');
  await E.page.click('#drawer [data-act="add-today"]');
  await E.page.waitForSelector('#ticket.on');
  const tk = (await E.page.locator('#ticket').innerText()).replace(/\s+/g, ' ');
  console.log('  билетик:', tk);
  ok(/Беги, Лола, беги/.test(tk) && /просмотр отмечен/.test(tk) && /17 окт 2026/i.test(tk), '«Посмотрел сегодня» — билетик с названием и датой');
  await wait(250);
  await E.shot('86-ticket');
  await wait(2800);
  ok(await E.page.locator('#ticket.on').count() === 0, 'билетик отрывается и исчезает сам');
  await E.page.keyboard.press('Escape');
  await wait(200);
  ok(await E.page.title() === 'Кинодневник', 'карточка закрыта — во вкладке снова «Кинодневник»');
  await E.browser.close();

  // телефон
  E = await H.setup({ sheet: new H.Sheet(items()), now: NOW, viewport: { width: 390, height: 844 }, dpr: 2, mobile: true });
  await E.page.goto(H.SITE + '#watchlist');
  await E.page.waitForSelector('.rcard:not(.wait) .rc-t');
  await wait(400);
  ok(await E.page.evaluate(() => document.documentElement.scrollWidth) <= 390, 'на телефоне полка советов листается внутри себя');
  await E.shot('84-recs-mobile');
  await E.browser.close();
  E = await H.setup({ sheet: new H.Sheet(items()), now: NOW, viewport: { width: 390, height: 844 }, dpr: 2, mobile: true });
  await E.page.goto(H.SITE + '#home');
  await E.page.waitForSelector('.goal');
  await E.page.click('.goal [data-act="goal-edit"]');
  await E.page.click('#goalform button[type=submit]');
  await E.page.waitForSelector('.goal .goal-ring');
  await E.page.locator('.goal').scrollIntoViewIfNeeded();
  await wait(1300);
  ok(await E.page.evaluate(() => document.documentElement.scrollWidth) <= 390, 'на телефоне цель без прокрутки вбок');
  await E.shot('82-goal-mobile');
  await E.browser.close();

  // ===== «Итоги года» — финальные титры
  const yearItems = () => [
    { id: 'c1', cat: 'film', title: 'Дюна', orig: 'Dune', year: '2021', status: 'done', dates: ['2025-01-05', '2025-11-20'], rating: 9, dub: 'Дубляж', img: tm('/dune21.jpg'), info: { g: ['фантастика', 'приключения'], rt: 155, dir: 'Дени Вильнёв', at: '2026-01-01' } },
    { id: 'c2', cat: 'film', title: 'Бегущий по лезвию 2049', year: '2017', status: 'done', dates: ['2025-03-10'], rating: 10, dub: 'Дубляж', img: tm('/br2049.jpg'), info: { g: ['фантастика', 'драма'], rt: 164, dir: 'Дени Вильнёв', at: '2026-01-01' } },
    { id: 'c3', cat: 'film', title: 'Прибытие', year: '2016', status: 'done', dates: ['2025-03-22'], rating: 8, dub: 'Дубляж', info: { g: ['фантастика', 'драма'], rt: 116, dir: 'Дени Вильнёв', at: '2026-01-01' } },
    { id: 'c4', cat: 'series', title: 'Чернобыль', year: '2019', status: 'done', dates: ['2025-03-30'], rating: 10, dub: 'LostFilm' },
    { id: 'c5', cat: 'anime', title: 'Магическая битва', year: '2020–2021', status: 'done', dates: ['2025-07-14'], rating: 9, dub: 'AniLibria', mal: 40748 },
    { id: 'c6', cat: 'cartoon', title: 'Тайна Коко', year: '2017', status: 'done', dates: ['2025-12-24'], rating: 10, dub: 'Дубляж' },
    { id: 'c7', cat: 'film', title: 'Скучный фильм', year: '2024', status: 'dropped', dates: ['2025-05-02'] },
    { id: 'c8', cat: 'film', title: 'Сны поездов', year: '2025', status: 'done', dates: ['2026-01-02'], rating: 7 },
    cfg({ goals: { '2025': { n: 8 } } })
  ];
  const JAN = '2026-01-10T12:00:00';
  E = await H.setup({ sheet: new H.Sheet(yearItems()), now: JAN });
  await E.page.goto(H.SITE + '#home');
  await E.page.waitForSelector('.banner [data-act="cr-open"]');
  ok(/Итоги 2025 года готовы/.test(await txt(E.page, '.banner')), 'в январе на «Обзоре» — приглашение на итоги прошлого года');
  await E.page.click('.banner [data-act="cr-open"]');
  await E.page.waitForSelector('#credits.on .cr-title');
  ok(await E.page.evaluate(() => location.hash) === '#credits/2025' && await E.page.title() === 'Итоги 2025 — Кинодневник', 'титры открылись (#credits/2025)');
  const cr = (await E.page.locator('#credits').innerText()).replace(/\s+/g, ' ');
  ok(/Итоги 2025 года/.test(cr) && /с 5 января по 24 декабря/.test(cr), 'заставка: год и даты первого и последнего сеанса');
  ok(/8 просмотров/i.test(cr) && /5 фильмы/i.test(cr) && /примерно 10 часов/.test(cr), 'числа года: 8 просмотров, 5 — фильмы, ≈10 часов фильмов');
  ok(/Самый киношный месяц — март: 3 просмотра/.test(cr), 'самый киношный месяц — март');
  ok(await E.page.locator('#credits .cr-p').count() === 6 && await E.page.locator('#credits .cr-p b').first().innerText() === 'Бегущий по лезвию 2049', '«В главных ролях»: шесть лучших, первым — с постером и десяткой');
  ok(/Фильм года Бегущий по лезвию 2049 10/i.test(cr) && /Сериал года Чернобыль 10/i.test(cr) && /Мультфильм года Тайна Коко 10/i.test(cr) && /Аниме года Магическая битва 9/i.test(cr), 'лучшее в каждом разделе');
  ok(/Жанр года Фантастика 3 тайтла/i.test(cr) && /Режиссёр года Дени Вильнёв 3 фильма/i.test(cr) && /Озвучка года Дубляж 5 раз/i.test(cr), 'жанр, режиссёр и озвучка года');
  ok(/Пересмотрено Дюна 2 раза/i.test(cr) && /Первый сеанс Дюна 5 января/i.test(cr) && /Последний сеанс Тайна Коко 24 декабря/i.test(cr), 'пересмотренное, первый и последний сеанс');
  ok(/Средняя оценка 9,3/i.test(cr) && /Брошено 1 — бывает/i.test(cr) && /Цель года 8 из 8 выполнено/i.test(cr), 'средняя оценка, брошенное и цель года');
  ok(await E.page.locator('#credits .cr-list .cr-row').count() === 7, 'в конце — все тайтлы года по порядку, как список актёров');
  await wait(400);
  await E.shot('87-credits-open');
  await wait(1800);
  const pos = () => E.page.evaluate(() => { const m = /translate3d\(0px?, ?(-?[\d.]+)px/.exec(document.querySelector('#cr-roll').style.transform) || []; return -parseFloat(m[1] || 0); });
  const p1 = await pos();
  ok(p1 > 20, 'титры плывут вверх сами (' + Math.round(p1) + ' пикс.)');
  await E.page.keyboard.press(' ');
  const p2 = await pos(); await wait(700);
  ok(Math.abs(await pos() - p2) < 1 && /Дальше/.test(await E.page.locator('#cr-play').innerText()), 'пробел — пауза');
  for (let i = 0; i < 4; i++) await E.page.keyboard.press('PageDown');
  await wait(300);
  await E.shot('88-credits-facts');
  for (let i = 0; i < 20; i++) await E.page.keyboard.press('PageDown');
  await E.page.waitForFunction(() => /Сначала/.test(document.querySelector('#cr-play').textContent));
  ok(true, 'в конце — «Конец» и кнопка «Сначала»');
  await wait(300);
  await E.shot('89-credits-end');
  await E.page.click('#credits .cr-end [data-act="cr-year"][data-y="2026"]');
  await E.page.waitForFunction(() => /Итоги 2026 года/.test(document.querySelector('#credits .cr-title').textContent));
  ok(await E.page.evaluate(() => location.hash) === '#credits/2026', 'из финала можно перейти к другому году');
  await E.page.keyboard.press('Escape');
  await wait(300);
  ok(await E.page.locator('#credits.on').count() === 0 && await E.page.evaluate(() => location.hash) === '#home', 'Esc закрывает титры');
  await E.page.click('#nav a[data-v="stats"]');
  await E.page.waitForSelector('.cr-cta');
  ok((await E.page.locator('.cr-cta [data-act="cr-open"]').allInnerTexts()).join() === '2026,2025', 'в «Статистике» — титры за каждый год');
  await E.browser.close();
  E = await H.setup({ sheet: new H.Sheet(yearItems()), now: JAN, viewport: { width: 390, height: 844 }, dpr: 2, mobile: true });
  await E.page.goto(H.SITE + '#credits/2025');
  await E.page.waitForSelector('#credits.on .cr-title');
  await E.page.keyboard.press(' ');
  for (let i = 0; i < 3; i++) await E.page.keyboard.press('PageDown');
  await wait(400);
  ok(await E.page.evaluate(() => document.querySelector('#cr-roll').scrollWidth <= 390), 'титры по прямой ссылке и на телефоне без прокрутки вбок');
  await E.shot('90-credits-mobile');
  console.log(E.errors.length ? 'ОШИБКИ:\n' + E.errors.join('\n') : 'Ошибок в консоли нет (последний стенд)');
  await E.browser.close();
})().catch(e => { console.error(e); process.exit(1); });
