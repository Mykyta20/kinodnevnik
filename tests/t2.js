// Сценарий 2: сбои баз, телефон, светлая тема, офлайн-режим без таблицы, «Наруто» с длинной франшизой.
const H = require('./harness');
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) process.exitCode = 1; };
const wait = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  // --- Shikimori недоступен, TMDB работает: аниме приходит из TMDB
  const sheet = new H.Sheet(H.seedItems().concat([{ id: '__settings', cat: 'settings', title: 'Служебная запись', status: '', dates: [], cfg: { tmdb: H.VALID } }]));
  let E = await H.setup({ sheet, shikiDown: true });
  await E.page.goto(H.SITE + '#anime');
  await E.page.waitForSelector('.page-head');
  await E.page.click('button[data-act="add"]');
  await E.page.fill('#add-q', 'наруто');
  await E.page.waitForFunction(() => !document.querySelector('#add-res .add-loading'));
  ok(await E.page.locator('.res[data-k="tmdb:tv/46260"]').count() === 0, '«Наруто» из TMDB узнан как уже записанный');
  await E.page.fill('#add-q', 'атака титанов');
  await E.page.waitForFunction(() => !document.querySelector('#add-res .add-loading'));
  const t = await E.page.locator('#add-res .res .t').allInnerTexts();
  console.log('  результаты:', t.join(' | '));
  ok(await E.page.locator('.res[data-k="tmdb:tv/1429"]').count() === 1, 'без Shikimori аниме показано из TMDB');
  ok(/Shikimori сейчас не отвечает/.test(await E.page.locator('#add-res').innerText()), 'сообщение про Shikimori');
  await E.page.click('.res[data-k="tmdb:tv/1429"]');
  await E.page.waitForSelector('#addform');
  ok(await E.page.inputValue('#addform select[name=cat]') === 'anime', 'японская анимация из TMDB попала в аниме');
  await E.shot('20-shiki-down-form');
  await E.page.keyboard.press('Escape');
  await E.browser.close();

  // --- обе базы недоступны
  E = await H.setup({ sheet: new H.Sheet(H.seedItems().concat([{ id: '__settings', cat: 'settings', title: 'x', status: '', dates: [], cfg: { tmdb: H.VALID } }])), shikiDown: true, tmdbDown: true });
  await E.page.goto(H.SITE + '#home');
  await E.page.waitForSelector('.hero');
  await E.page.click('button[data-act="add"]');
  await E.page.fill('#add-q', 'Интерстеллар');
  await E.page.waitForFunction(() => !document.querySelector('#add-res .add-loading'));
  const txt = await E.page.locator('#add-res').innerText();
  ok(/Базы сейчас не отвечают/.test(txt), 'обе базы лежат: понятное сообщение');
  await E.shot('21-both-down');
  await E.page.keyboard.press('Enter');
  await E.page.waitForSelector('#addform');
  ok(await E.page.inputValue('#addform input[name=title]') === 'Интерстеллар', 'Enter ведёт в ручную форму');
  await E.browser.close();

  // --- «Наруто»: длинная франшиза в карточке, «Показать все»
  E = await H.setup({});
  await E.page.goto(H.SITE + '#anime/i/a8b6a67ea');
  await E.page.waitForSelector('#drawer.on');
  await E.page.click('button[data-act="add-part"]');
  await E.page.waitForSelector('#ap-sug .res');
  const sug = await E.page.locator('#ap-sug .res .t').allInnerTexts();
  console.log('  продолжения Наруто:', sug.join(' | '));
  ok(sug[0] === 'Боруто: Новое поколение', 'первым идёт сериал-продолжение');
  ok(sug.includes('Наруто: Последний фильм'), 'фильм тоже предложен');
  ok(!sug.includes('Наруто: Ниндзя в стране снега'), 'уже записанный фильм не предложен');
  // поиск в карточке
  await E.page.fill('#ap-q', 'атака');
  await E.page.waitForSelector('#ap-res .res');
  await E.page.keyboard.press('Enter');
  ok(await E.page.inputValue('#ap-title') === 'Атака титанов', 'Enter в поиске карточки выбирает первый результат');
  await E.page.locator('#addpart').scrollIntoViewIfNeeded();
  await E.shot('22-naruto-sequels');
  await E.page.click('button[data-act="add-part-cancel"]');
  ok(await E.page.locator('#addpart').count() === 0, 'отмена закрывает блок');
  // сериал (не аниме): обычное добавление сезона без Shikimori
  await E.page.goto(H.SITE + '#series/i/fe14667b3');
  await E.page.waitForSelector('#drawer.on');
  await E.page.click('button[data-act="add-part"]');
  ok(await E.page.locator('#ap-q').count() === 0 && await E.page.inputValue('#ap-label') === 'Сезон 1', 'у сериалов блок как раньше');
  await E.browser.close();

  // --- «Хочу посмотреть» + будущий релиз
  E = await H.setup({ sheet: new H.Sheet(H.seedItems().concat([{ id: '__settings', cat: 'settings', title: 'x', status: '', dates: [], cfg: { tmdb: H.VALID } }])) });
  await E.page.goto(H.SITE + '#watchlist');
  await E.page.waitForSelector('.page-head');
  await E.page.click('.page-head button[data-act="add"]');
  await E.page.fill('#add-q', 'тайна коко');
  await E.page.waitForFunction(() => !document.querySelector('#add-res .add-loading'));
  ok(await E.page.locator('.res[data-k="tmdb:movie/354912"]').count() === 0, 'уже записанный мультфильм не дублируется');
  await E.page.fill('#add-q', 'дюна');
  await E.page.waitForSelector('.res[data-k="tmdb:movie/693134"]');
  await E.page.click('.res[data-k="tmdb:movie/693134"]');
  await E.page.waitForSelector('#addform');
  ok(await E.page.inputValue('#addform select[name=status]') === 'planned' && !(await E.page.isChecked('#addform input[name=today]')), 'из «Хочу посмотреть»: статус «Хочу посмотреть», без даты');
  await E.browser.close();

  // --- телефон
  E = await H.setup({ viewport: { width: 390, height: 844 }, dpr: 2, mobile: true });
  await E.page.goto(H.SITE + '#home');
  await E.page.waitForSelector('.hero');
  await E.page.click('button[data-act="add"]');
  await E.page.fill('#add-q', 'магическая');
  await E.page.waitForFunction(() => !document.querySelector('#add-res .add-loading'));
  await wait(200);
  const sw = await E.page.evaluate(() => [document.documentElement.scrollWidth, document.querySelector('.add-box').getBoundingClientRect().width]);
  ok(sw[0] <= 390, 'нет горизонтальной прокрутки (' + sw.join(', ') + ')');
  await E.shot('23-mobile-results');
  await E.page.click('.res[data-k="shiki:51009"]');
  await E.page.waitForSelector('#addform');
  await E.shot('24-mobile-form');
  await E.page.keyboard.press('Escape');
  await E.page.goto(H.SITE + '#data');
  await E.page.waitForSelector('#tmdb');
  await E.page.locator('#tmdb').scrollIntoViewIfNeeded();
  await E.shot('25-mobile-data', { fullPage: false });
  await E.browser.close();

  // --- светлая тема
  E = await H.setup({ scheme: 'light' });
  await E.page.addInitScript(() => { try { localStorage.setItem('kinodnevnik:theme', '"light"'); } catch (e) {} });
  await E.page.goto(H.SITE + '#home');
  await E.page.waitForSelector('.hero');
  await E.page.click('button[data-act="add"]');
  await E.page.fill('#add-q', 'магическая битва');
  await E.page.waitForFunction(() => !document.querySelector('#add-res .add-loading'));
  await wait(200);
  await E.shot('26-light-results');
  await E.page.click('.res[data-k="shiki:51009"]');
  await E.page.waitForSelector('#addform');
  await E.shot('27-light-form');
  await E.browser.close();

  // --- офлайн-режим (без таблицы): ключ живёт в браузере
  E = await H.setup({ local: true });
  await E.page.goto(H.SITE + '#home');
  await E.page.waitForSelector('#connectform');
  ok(true, 'без подключения показан экран подключения (как раньше)');
  await E.browser.close();

  console.log(E.errors.length ? 'ОШИБКИ:\n' + E.errors.join('\n') : 'Ошибок в консоли нет (последний стенд)');
})().catch(e => { console.error(e); process.exit(1); });
