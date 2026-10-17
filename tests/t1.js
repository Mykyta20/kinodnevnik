// Сценарий 1: Google-режим, аниме-продолжение, ключ TMDB, фильм из TMDB, клавиатура, импорт.
const H = require('./harness');
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) process.exitCode = 1; };
const wait = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const { browser, page, sheet, errors, shot } = await H.setup();
  await page.goto(H.SITE + '#home');
  await page.waitForSelector('.hero');
  ok(await page.locator('#nav a[data-v="film"] .n').innerText() === '2', 'в фильмах 2 тайтла');

  // --- окно добавления без ключа TMDB
  await page.click('button[data-act="add"]');
  await page.waitForSelector('#add-q');
  ok(await page.locator('.add-note').count() === 1, 'без ключа видна подсказка про TMDB');
  await shot('01-add-empty');
  await page.fill('#add-q', 'магическая битва');
  await page.waitForSelector('.res-sec .res[data-act="add-pick"]');
  await wait(150);
  const titles = await page.locator('#add-res .res .t').allInnerTexts();
  console.log('  результаты:', titles.join(' | '));
  ok(titles[0] === 'Магическая битва', 'первым идёт запись из дневника');
  ok(!titles.includes('Магическая битва PV'), 'PV-ролики скрыты');
  ok(await page.locator('.res[data-k="shiki:40748"]').count() === 0, 'дубль записи из дневника не показан');
  ok(await page.locator('.tag.rel').count() === 3, 'все три части франшизы помечены «можно добавить» (' + await page.locator('.tag.rel').count() + ')');
  ok(await page.locator('.res.on').count() === 1, 'выделен вариант для Enter');
  await shot('02-add-anime-results');

  // выбрать «Магическая битва 2»
  await page.click('.res[data-k="shiki:51009"]');
  await page.waitForSelector('#addform .attach');
  ok(await page.locator('input[name=attach][value=part]').isChecked(), 'по умолчанию: сезоном к существующему');
  ok(await page.inputValue('input[name=label]') === 'ТВ-2', 'метка ТВ-2');
  ok(await page.locator('[data-for="new"]').first().isHidden(), 'поле раздела спрятано в режиме сезона');
  await page.fill('input[name=dub]', 'AniLibria');
  await shot('03-add-form-attach');
  await page.click('#addform button[type=submit]');
  await page.waitForSelector('#drawer.on');
  await wait(1500);
  const jjk = sheet.rows.find(r => r.id === 'af35ef405');
  ok(jjk && jjk.parts && jjk.parts.length === 2, 'в таблице у «Магической битвы» 2 части');
  ok(jjk.parts[0].mal === 40748 && jjk.parts[0].rating === 9 && jjk.parts[0].label === 'ТВ-1', 'первый сезон перенесён с оценкой');
  ok(jjk.parts[1].mal === 51009 && jjk.parts[1].year === '2023' && jjk.parts[1].dub === 'AniLibria' && jjk.parts[1].shiki === 8.7, 'второй сезон с mal, годом, озвучкой, оценкой');
  ok(jjk.franchise === 'jujutsu_kaisen', 'франшиза запомнена');
  await shot('04-drawer-after-attach');

  // --- продолжения в карточке
  await page.click('button[data-act="add-part"]');
  await page.waitForSelector('#ap-sug .res');
  const sug = await page.locator('#ap-sug .res .t').allInnerTexts();
  console.log('  продолжения:', sug.join(' | '));
  ok(sug[0] === 'Магическая битва: Смертельная миграция', 'первым предложен следующий сезон');
  ok(sug.includes('Магическая битва 0. Фильм'), 'предложен фильм-приквел');
  ok(!sug.includes('Магическая битва 2'), 'уже добавленный сезон не предлагается');
  await page.click('#ap-sug .res >> nth=0');
  ok(await page.inputValue('#ap-title') === 'Магическая битва: Смертельная миграция', 'название подставилось');
  ok(await page.inputValue('#ap-label') === 'ТВ-3', 'метка ТВ-3');
  ok(await page.inputValue('#ap-year') === '2026–…', 'год онгоинга 2026–…');
  ok(await page.inputValue('#ap-status') === 'done', 'статус по умолчанию');
  await page.locator('#addpart').scrollIntoViewIfNeeded();
  await shot('05-drawer-sequels');
  await page.selectOption('#ap-status', 'watching');
  await page.click('button[data-act="add-part-save"]');
  await wait(1500);
  const jjk2 = sheet.rows.find(r => r.id === 'af35ef405');
  ok(jjk2.parts.length === 3 && jjk2.parts[2].mal === 57658 && jjk2.parts[2].status === 'watching', 'третий сезон сохранён');
  ok(jjk2.status === 'watching', 'статус тайтла пересчитался в «Смотрю»');
  await page.keyboard.press('Escape');

  // --- подключение TMDB
  await page.click('#nav a[data-v="data"]');
  await page.waitForSelector('#tmdb');
  await page.locator('#tmdb').scrollIntoViewIfNeeded();
  await shot('06-data-tmdb-off', { fullPage: false });
  await page.fill('#tmdb-key', 'неправильный');
  await page.click('#tmdbform button[type=submit]');
  await page.waitForSelector('#tmdb-msg.err');
  console.log('  сообщение:', await page.locator('#tmdb-msg').innerText());
  ok(/не принял/.test(await page.locator('#tmdb-msg').innerText()), 'неверный ключ отклонён');
  await page.fill('#tmdb-key', '  ' + H.VALID + ' ');
  await page.click('#tmdbform button[type=submit]');
  await page.waitForSelector('#tmdb .dotl.ok + div', { timeout: 5000 });
  await page.waitForFunction(() => document.querySelectorAll('#tmdb .dotl.ok').length === 2);
  await wait(1500);
  const cfg = sheet.rows.find(r => r.id === '__settings');
  ok(cfg && cfg.cfg && cfg.cfg.tmdb === H.VALID, 'ключ сохранён служебной записью в таблице');
  await page.locator('#tmdb').scrollIntoViewIfNeeded();
  await shot('07-data-tmdb-on');

  // перезагрузка: ключ подтянулся из таблицы, служебная запись не видна
  await page.goto(H.SITE + '#home'); await page.reload();
  await page.waitForSelector('.hero');
  ok(await page.locator('#nav a[data-v="film"] .n').innerText() === '2', 'служебная запись не попала в фильмы');
  const total = await page.evaluate(() => [...document.querySelectorAll('#nav a .n')].slice(0, 4).reduce((a, b) => a + +b.textContent, 0));
  ok(total === 6, 'всего 6 тайтлов, без служебной записи (' + total + ')');

  // --- фильм из TMDB
  await page.click('button[data-act="add"]');
  ok(await page.locator('.add-note').count() === 0, 'с ключом подсказки нет');
  await page.fill('#add-q', 'Дюна');
  await page.waitForSelector('.res[data-k^="tmdb:"]');
  await wait(100);
  const t2 = await page.locator('#add-res .res .t').allInnerTexts();
  console.log('  результаты:', t2.join(' | '));
  ok(!t2.includes('Дюна Человек'), 'люди отфильтрованы');
  ok(t2[t2.length - 1] === 'Дюна (фанатский)' || !t2.includes('Дюна (фанатский)'), 'мусор опущен вниз');
  ok(await page.locator('.res[data-k="tmdb:movie/438631"]').count() === 0, '«Дюна» 2021 узнана и не дублируется');
  ok(await page.locator('.res[data-k="tmdb:movie/841"] .tag.in').count() === 0, '«Дюна» 1984 не перепутана');
  await shot('08-add-tmdb-results');
  await page.click('.res[data-k="tmdb:movie/693134"]');
  await page.waitForSelector('#addform .add-pick');
  ok(await page.inputValue('#addform select[name=cat]') === 'film', 'раздел: фильм');
  ok(await page.inputValue('#addform input[name=year]') === '2024', 'год 2024');
  ok(await page.inputValue('#addform input[name=orig]') === 'Dune: Part Two', 'оригинальное название');
  ok(await page.locator('#seasonsfield').isHidden(), 'для фильма поле сезонов скрыто');
  await shot('09-add-form-film');
  await page.keyboard.press('Enter'); // фокус на кнопке «Добавить»
  await page.waitForSelector('#drawer.on .poster');
  await wait(1500);
  const dune2 = sheet.rows.find(r => r.title === 'Дюна: Часть вторая');
  ok(dune2 && dune2.tmdb === 'movie/693134' && dune2.imdb === 'tt15239678' && /dune2/.test(dune2.img) && dune2.ext.tmdb === 8.1, 'фильм сохранён с TMDB, IMDb, постером, оценкой');
  ok(await page.locator('#drawer a[href="https://www.imdb.com/title/tt15239678/"]').count() === 1, 'прямая ссылка на IMDb');
  await shot('10-drawer-film');
  await page.keyboard.press('Escape');

  // --- клавиатура: точное совпадение в дневнике открывается по Enter
  await page.click('button[data-act="add"]');
  await page.fill('#add-q', 'Черное зеркало');
  await page.waitForFunction(() => document.querySelector('#add-res .res') && !document.querySelector('#add-res .add-loading'));
  ok(await page.locator('.res[data-k="tmdb:tv/42009"]').count() === 0, 'сериал из дневника не дублируется в TMDB');
  ok(await page.locator('.res[data-k^="shiki:"]').count() === 0, 'случайные аниме на запрос о сериале спрятаны');
  await page.keyboard.press('Enter');
  await page.waitForSelector('#drawer.on');
  ok(await page.locator('#dtitle').innerText() === 'Черное зеркало', 'Enter открыл существующую карточку');
  await page.keyboard.press('Escape');

  // стрелками к сериалу «Дюна: Пророчество»
  await page.click('button[data-act="add"]');
  await page.fill('#add-q', 'дюна');
  await page.waitForSelector('.res[data-k="tmdb:tv/90228"]');
  const idx = await page.evaluate(() => [...document.querySelectorAll('#add-res .res')].findIndex(b => b.dataset.k === 'tmdb:tv/90228'));
  const cur = await page.evaluate(() => [...document.querySelectorAll('#add-res .res')].findIndex(b => b.classList.contains('on')));
  for (let i = cur; i < idx; i++) await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await page.waitForSelector('#addform');
  ok(await page.inputValue('#addform select[name=cat]') === 'series', 'раздел: сериал');
  ok(await page.inputValue('#addform input[name=year]') === '2024–…', 'год идущего сериала 2024–…');
  ok(/Всего вышло 1 сезон/.test(await page.locator('#seasonsfield .hint').innerText()) && await page.locator('#seasonsfield').isVisible(), 'подсказка про сезоны');
  await page.click('[data-act="add-back"]');
  await page.waitForSelector('#add-q');
  ok(await page.inputValue('#add-q') === 'дюна' && await page.locator('.res').count() > 2, 'назад к результатам без повторного поиска');
  await page.keyboard.press('Escape'); // очищает поле
  ok(await page.inputValue('#add-q') === '' && await page.locator('#modal.on').count() === 1, 'Esc сначала очищает поле');
  await page.keyboard.press('Escape');
  ok(await page.locator('#modal.on').count() === 0, 'второй Esc закрывает окно');

  // --- ручное добавление
  await page.click('button[data-act="add"]');
  await page.fill('#add-q', 'Мой домашний фильм');
  await page.waitForSelector('.add-hint .btn[data-act="add-manual"]');
  await shot('11-add-nothing');
  await page.keyboard.press('Enter');
  await page.waitForSelector('#addform');
  ok(await page.inputValue('#addform input[name=title]') === 'Мой домашний фильм', 'ручная форма с названием из поиска');
  await page.click('#addform button[type=submit]');
  await page.waitForSelector('#drawer.on');
  await page.keyboard.press('Escape');

  // --- импорт из копии не теряет ключ
  await page.click('#nav a[data-v="data"]');
  const backup = JSON.stringify({ app: 'kinodnevnik', version: 1, exported: '2026-10-01T10:00:00Z', items: H.seedItems() });
  await page.setInputFiles('#file', { name: 'kinodnevnik.json', mimeType: 'application/json', buffer: Buffer.from(backup) });
  await page.click('[data-act="import-yes"]');
  await wait(1500);
  ok(sheet.rows.length === 7 && sheet.rows.some(r => r.id === '__settings' && r.cfg.tmdb === H.VALID), 'после импорта ключ на месте (' + sheet.rows.length + ' строк)');

  console.log('Таблица, вызовы:', sheet.log.join(','));
  console.log(errors.length ? 'ОШИБКИ:\n' + errors.join('\n') : 'Ошибок в консоли нет');
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
