// Сценарий 7: стена постеров, полка «Недавно» на «Обзоре», советы для аниме, напоминание о резервной копии.
const H = require('./harness');
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) process.exitCode = 1; };
const wait = ms => new Promise(r => setTimeout(r, ms));
const NOW = '2026-10-17T12:00:00';
const tm = p => 'https://image.tmdb.org/t/p/w342' + p;
// копия была 16 дней назад: напоминание не мешает остальным проверкам
const cfg = extra => ({ id: '__settings', cat: 'settings', title: 'Служебная запись', status: '', dates: [], cfg: Object.assign({ backup: '2026-10-01' }, extra || {}) });
function items(extra) {
  const L = H.seedItems();
  const by = id => L.find(x => x.id === id);
  Object.assign(by('fe5160313'), { tmdb: 'movie/438631', img: tm('/dune21.jpg') });
  Object.assign(by('f1df42d6e'), { tmdb: 'movie/354912', img: tm('/coco.jpg'), fav: true });
  // «Ураганные хроники» на 8 — второй источник советов для аниме (первый — «Магическая битва» на 9)
  by('a8b6a67ea').parts[2].rating = 8;
  return L.concat([
    { id: 'w1', cat: 'film', title: 'Беги, Лола, беги', orig: 'Lola rennt', year: '1998', status: 'done', dates: ['2026-01-15'], rating: 8, verdict: 'Бег под техно' },
    { id: 'w2', cat: 'film', title: 'Интерстеллар', orig: 'Interstellar', year: '2014', status: 'done', dates: ['2026-09-10'], tmdb: 'movie/157336', img: tm('/inter.jpg'), rating: 10 },
    { id: 'w3', cat: 'film', title: 'Брошенный фильм', year: '2019', status: 'dropped', dates: ['2025-02-01'] },
    cfg(extra)
  ]);
}
const row = (sheet, id) => sheet.rows.find(r => r.id === id) || {};
const txt = async (page, sel) => (await page.locator(sel).first().innerText()).replace(/\s+/g, ' ').trim();

(async () => {
  // ===== стена постеров
  let E = await H.setup({ sheet: new H.Sheet(items()), now: NOW });
  let P = E.page;
  await P.goto(H.SITE + '#film');
  await P.waitForSelector('.row');
  ok(await P.locator('.viewsw [data-v="0"][aria-pressed="true"]').count() === 1, 'по умолчанию — список, рядом переключатель «Список / Постеры»');
  await P.click('.viewsw [data-v="1"]');
  await P.waitForSelector('.wall .ptile');
  ok(await P.locator('.ptile').count() === 5 && await P.locator('.row').count() === 0, 'все 5 фильмов — плитками постеров');
  const heads = await P.evaluate(() => [...document.querySelectorAll('.wallbox .ygroup')].map(g => g.firstChild.textContent));
  ok(heads.join() === '2026,2025,2022,Без даты', 'по дате просмотра — с разбивкой по годам (' + heads.join(', ') + ')');
  const first = P.locator('.ptile').first();
  ok(await first.getAttribute('data-id') === 'w2' && /w342\/inter\.jpg$/.test(await first.locator('img').getAttribute('src')), 'первым — свежий просмотр со своим постером');
  ok(/w185\/inter\.jpg 185w/.test(await first.locator('img').getAttribute('srcset') || ''), 'постеры TMDB — в двух размерах, чтобы были чёткими на Retina');
  ok(await P.locator('.ptile[data-id="w2"] .badge.rv10').count() === 1 && await P.locator('.ptile[data-id="fba996bba"] .badge').count() === 0, 'оценка — лампочкой на постере, у неоценённых — ничего лишнего');
  const lola = P.locator('.ptile[data-id="w1"]');
  ok(await lola.locator('img').count() === 0 && (await lola.locator('.pt-ph').innerText()).trim() === 'Беги, Лола, беги', 'без постера — обложка с названием');
  ok(/Брошено/.test(await P.locator('.ptile[data-id="w3"] .pt-st').innerText()) && /Хочу посмотреть/.test(await P.locator('.ptile[data-id="fba996bba"] .pt-st').innerText()), 'статус не «Просмотрено» — пометка на постере');
  await P.mouse.move(5, 5);
  await wait(600);
  await E.shot('91-wall');
  await P.click('.ptile[data-id="fe5160313"]');
  await P.waitForSelector('#drawer.on');
  ok(await P.locator('.ptile[data-id="fe5160313"][aria-current="true"]').count() === 1, 'клик открывает карточку, плитка подсвечена');
  await P.keyboard.press('Escape');
  await wait(300);
  // выбор общий для разделов и переживает перезагрузку
  await P.click('#nav a[data-v="anime"]');
  await P.waitForSelector('.ptile');
  ok(await P.locator('.ptile').count() === 2, 'в «Аниме» — тоже стена: выбор общий для всех разделов');
  ok(/2 сезона, 1 фильм/.test(await P.locator('.ptile[data-id="a8b6a67ea"] .pt-m').innerText()), 'у аниме с частями видно, сколько сезонов и фильмов');
  await P.reload();
  await P.waitForSelector('.ptile');
  ok(await P.locator('.viewsw [data-v="1"][aria-pressed="true"]').count() === 1, 'после перезагрузки стена на месте');
  await P.click('#nav a[data-v="watchlist"]');
  await P.waitForSelector('.wall .ptile');
  ok(await P.locator('.section-head .viewsw').count() === 1 && await P.locator('.wall .ptile .pt-st').count() === 0, 'в «Хочу посмотреть» — тоже стена, без лишней пометки «Хочу посмотреть»');
  await P.click('#nav a[data-v="film"]');
  await P.waitForSelector('.ptile');
  await P.click('.viewsw [data-v="0"]');
  await P.waitForSelector('.row');
  ok(await P.locator('.ptile').count() === 0 && await P.evaluate(() => localStorage.getItem('kinodnevnik:wall')) === 'false', '«Список» возвращает строки и тоже запоминается');
  console.log(E.errors.length ? 'ОШИБКИ:\n' + E.errors.join('\n') : 'Ошибок в консоли нет (стена постеров)');
  ok(!E.errors.length, 'в консоли нет ошибок');
  await E.browser.close();

  // стена на телефоне
  E = await H.setup({ sheet: new H.Sheet(items()), now: NOW, viewport: { width: 390, height: 844 }, dpr: 2, mobile: true });
  await E.context.addInitScript(() => { try { localStorage.setItem('kinodnevnik:wall', 'true'); } catch (e) {} });
  await E.page.goto(H.SITE + '#film');
  await E.page.waitForSelector('.ptile');
  const mw = await E.page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cols: getComputedStyle(document.querySelector('.wall')).gridTemplateColumns.split(' ').length }));
  ok(mw.sw <= 390 && mw.cols === 3, 'на телефоне — три постера в ряд, без прокрутки вбок (' + mw.cols + ', ' + mw.sw + ')');
  await wait(500);
  await E.shot('92-wall-mobile');
  await E.browser.close();

  // ===== полка «Недавно» на «Обзоре»
  E = await H.setup({ sheet: new H.Sheet(items()), now: NOW });
  P = E.page;
  await P.goto(H.SITE + '#home');
  await P.waitForSelector('#hshelf .ptile');
  const ids = await P.evaluate(() => [...document.querySelectorAll('#hshelf .ptile')].map(x => x.dataset.id));
  ok(ids.join() === 'w2,w1,a8b6a67ea,w3,af35ef405,fe14667b3,fe5160313,f1df42d6e', 'на «Обзоре» — полка постеров, свежие просмотры первыми, без планов (' + ids.join(', ') + ')');
  const c1 = P.locator('#hshelf .ptile[data-id="w2"]');
  ok((await c1.locator('.pt-m').innerText()) === '10 сен' && await c1.locator('.badge.rv10').count() === 1, 'дата этого года без года, оценка лампочкой');
  ok((await P.locator('#hshelf .ptile[data-id="fe5160313"] .pt-m').innerText()) === '5 янв 2022', 'дата прошлых лет — с годом');
  ok((await P.locator('#hshelf .ptile[data-id="w1"] .pt-v').innerText()).includes('Бег под техно'), 'вердикт — под постером');
  ok(await P.locator('#home-recent .row').count() === 0, 'вместо строк «Недавно» — полка');
  await P.locator('#hshelf').scrollIntoViewIfNeeded();
  await P.mouse.move(5, 5);
  await wait(500);
  await E.shot('93-home-shelf');
  await P.click('#hshelf .ptile[data-id="w2"]');
  await P.waitForSelector('#drawer.on');
  ok(await P.evaluate(() => location.hash) === '#home/i/w2', 'клик по постеру открывает карточку');
  await E.browser.close();

  // ===== советы для аниме: AniList + Shikimori
  E = await H.setup({ sheet: new H.Sheet(items()), now: NOW });
  P = E.page;
  const al0 = H.alCalls().length;
  await P.goto(H.SITE + '#watchlist');
  await P.waitForSelector('#arecs .rcard:not(.wait) .rc-t');
  const at = await P.locator('#arecs .rc-t').allInnerTexts();
  console.log('  советы для аниме:', at.join(' | '));
  ok(at.join('|') === 'Клинок, рассекающий демонов|Человек-бензопила|Охотник х Охотник|Моб Психо 100', 'первым — то, что советуют к двум любимым аниме; названия по-русски из Shikimori');
  ok(/Похоже на: «Магическая битва», «Наруто»/.test(await txt(P, '#arecs .rcard .rc-why')), 'видно, почему советует');
  ok(await txt(P, '#arecs .rcard .rc-m') === '2019 · аниме-сериал · Shikimori 8,5', 'год, раздел и оценка Shikimori (' + await txt(P, '#arecs .rcard .rc-m') + ')');
  ok(H.alCalls().length - al0 === 1, 'один запрос к AniList на все источники');
  ok(!at.some(t => /Наруто|Магическая битва/.test(t)), 'без записанного и без продолжений своих же франшиз; взрослое, не вышедшее и без голосов — тоже мимо');
  await P.locator('#arecs').scrollIntoViewIfNeeded();
  await P.mouse.move(5, 5);
  await wait(500);
  await E.shot('94-anime-recs');
  // «+» — сразу в список
  await P.hover('#arecs .rc-main[data-k="shiki:44511"]');
  await P.click('#arecs .rc-add[data-k="shiki:44511"]');
  await P.waitForSelector('#arecs .rc-main[data-k="shiki:44511"]', { state: 'detached' });
  await wait(1600);
  const csm = E.sheet.rows.find(r => r.mal === 44511) || {};
  ok(csm.status === 'planned' && csm.cat === 'anime' && csm.title === 'Человек-бензопила' && /animes\/44511\/main2x/.test(csm.img || '') && csm.franchise === 'chainsaw_man' && csm.year === '2022', '«+» добавил аниме в «Хочу посмотреть» с постером, годом и номером MyAnimeList');
  ok(await P.locator('.row:has-text("Человек-бензопила")').count() === 1, 'и оно сразу в списке ниже');
  // «×» — не советовать
  await P.hover('#arecs .rc-main[data-k="shiki:32182"]');
  await P.click('#arecs .rc-x[data-k="shiki:32182"]');
  await P.waitForSelector('#arecs .rc-main[data-k="shiki:32182"]', { state: 'detached' });
  await wait(1500);
  ok((row(E.sheet, '__settings').cfg.recNo || []).includes('mal:32182'), '«×» — больше не советовать (запомнено в таблице)');
  // клик — обычная форма добавления
  await P.click('#arecs .rc-main[data-k="shiki:38000"]');
  await P.waitForSelector('#addform');
  ok(await P.inputValue('#addform input[name=title]') === 'Клинок, рассекающий демонов' && await P.inputValue('#addform select[name=status]') === 'planned' && await P.inputValue('#addform select[name=cat]') === 'anime', 'клик по постеру — форма добавления со статусом «Хочу посмотреть»');
  await P.click('#addform button[type=submit]');
  await P.waitForSelector('#drawer.on');
  await wait(1500);
  const ds = E.sheet.rows.find(r => r.mal === 38000) || {};
  ok(ds.status === 'planned' && ds.franchise === 'kimetsu_no_yaiba', 'и добавляется как обычное аниме из Shikimori');
  await P.keyboard.press('Escape');
  // на сутки — из памяти
  const al1 = H.alCalls().length;
  await P.reload();
  await P.waitForSelector('#arecs .rcard:not(.wait) .rc-t');
  ok(H.alCalls().length === al1 && (await P.locator('#arecs .rc-t').allInnerTexts()).join() === 'Охотник х Охотник', 'после перезагрузки — из памяти, без новых запросов; добавленное и скрытое не возвращается');
  // Shikimori не даёт читать цвет постера (как и в жизни): одна такая попытка на браузер — ожидаемо
  const other = E.errors.filter(x => !/ERR_ACCESS_DENIED/.test(x));
  console.log(other.length ? 'ОШИБКИ:\n' + other.join('\n') : 'Других ошибок в консоли нет (советы для аниме)');
  ok(!other.length, 'в консоли нет посторонних ошибок');
  await E.browser.close();

  // AniList не отвечает
  E = await H.setup({ sheet: new H.Sheet(items()), now: NOW, alDown: true });
  await E.page.goto(H.SITE + '#watchlist');
  await E.page.waitForSelector('#arecs .recs-note', { timeout: 20000 });
  ok(/AniList сейчас не отвечает/.test(await txt(E.page, '#arecs .recs-note')) && await E.page.locator('#arecs [data-act="arecs-reload"]').count() >= 1, 'AniList не отвечает — спокойная подсказка и «Попробовать снова»');
  ok(await E.page.locator('.row[data-id="fba996bba"]').count() === 1, 'а «Мой список» на месте');
  await E.browser.close();

  // ===== напоминание о резервной копии
  E = await H.setup({ sheet: new H.Sheet(items({ backup: '2026-08-01' })), now: NOW });
  P = E.page;
  await P.goto(H.SITE + '#home');
  await P.waitForSelector('#backup-nudge');
  ok(/77 дней назад/.test(await txt(P, '#backup-nudge')), 'копии не было больше месяца — мягкое напоминание (77 дней)');
  await E.shot('95-backup-nudge');
  await P.click('#backup-nudge [data-act="backup-later"]');
  await wait(1500);
  ok(await P.locator('#backup-nudge').count() === 0 && row(E.sheet, '__settings').cfg.backupLater === '2026-10-24', '«Через неделю» — прячет до 24 октября (запомнено в таблице)');
  await P.reload();
  await P.waitForSelector('.hero');
  ok(await P.locator('#backup-nudge').count() === 0, 'после перезагрузки не появляется');
  await E.browser.close();

  E = await H.setup({ sheet: new H.Sheet(items({ backup: '' })), now: NOW });
  P = E.page;
  await P.goto(H.SITE + '#home');
  await P.waitForSelector('#backup-nudge');
  ok(/раз в месяц/.test(await txt(P, '#backup-nudge')), 'копии ещё не было — предложение сохранить и обещание напоминать раз в месяц');
  const [dl] = await Promise.all([P.waitForEvent('download'), P.click('#backup-nudge [data-act="export-json"]')]);
  ok(dl.suggestedFilename() === 'kinodnevnik-2026-10-17.json', 'скачивается файл копии (' + dl.suggestedFilename() + ')');
  await wait(1500);
  ok(await P.locator('#backup-nudge').count() === 0 && row(E.sheet, '__settings').cfg.backup === '2026-10-17', 'после скачивания напоминание пропало, дата копии — в таблице');
  await P.click('#nav a[data-v="data"]');
  await P.waitForSelector('.mode');
  ok(/последняя резервная копия 17 окт 2026/.test(await txt(P, '.mode')), 'в «Данных» видна дата последней копии');
  console.log(E.errors.length ? 'ОШИБКИ:\n' + E.errors.join('\n') : 'Ошибок в консоли нет (последний стенд)');
  await E.browser.close();
})().catch(e => { console.error(e); process.exit(1); });
