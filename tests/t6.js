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

  // телефон
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
  console.log(E.errors.length ? 'ОШИБКИ:\n' + E.errors.join('\n') : 'Ошибок в консоли нет (последний стенд)');
  await E.browser.close();
})().catch(e => { console.error(e); process.exit(1); });
