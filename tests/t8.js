// Сценарий 8: плавность — карточка не мигает при правках, список не перерисовывается зря,
// на телефоне шапка прячется при прокрутке, поля не приближают страницу, под клавиатурой ничего не просвечивает.
const H = require('./harness');
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) process.exitCode = 1; };
const wait = ms => new Promise(r => setTimeout(r, ms));
const NOW = '2026-10-19T12:00:00';
const tm = p => 'https://image.tmdb.org/t/p/w342' + p;
const cfg = () => ({ id: '__settings', cat: 'settings', title: 'Служебная запись', status: '', dates: [], cfg: { tmdb: H.VALID, backup: '2026-10-10' } });
function items(extra) {
  const L = H.seedItems();
  Object.assign(L.find(x => x.id === 'fe5160313'), { tmdb: 'movie/438631', imdb: 'tt1160419', img: tm('/dune21.jpg') });
  L.push({ id: 'w2', cat: 'film', title: 'Интерстеллар', orig: 'Interstellar', year: '2014', status: 'done', dates: ['2026-09-10'], tmdb: 'movie/157336', img: tm('/inter.jpg'), rating: 10 });
  // много фильмов, чтобы было что листать
  for (let i = 0; i < (extra || 0); i++) L.push({ id: 'm' + i, cat: 'film', title: 'Фильм ' + i, year: String(1990 + i % 30), status: 'done', dates: ['2025-0' + (1 + i % 9) + '-1' + (i % 9)], img: tm('/f' + i + '.jpg'), rating: 5 + i % 6 });
  return L.concat([cfg()]);
}
const same = (page, sel, name) => page.evaluate(([s, n]) => document.querySelector(s) === window[n], [sel, name]);

(async () => {
  // ===== компьютер: правки в карточке не перерисовывают лишнего
  let E = await H.setup({ sheet: new H.Sheet(items()), now: NOW });
  let P = E.page;
  await P.goto(H.SITE + '#film');
  await P.waitForSelector('.row[data-id="w2"] img');
  await P.waitForFunction(() => document.querySelectorAll('.row img.fi.ld').length >= 2);
  ok(true, 'постеры в списке проявляются плавно, когда загрузились');
  await P.evaluate(() => { window.__row = document.querySelector('.row[data-id="w2"]'); window.__img = document.querySelector('.row[data-id="w2"] img'); });
  await P.click('.row[data-id="fe5160313"]');
  await P.waitForSelector('#drawer.on .screen.ok');
  ok(await P.evaluate(() => { const d = document.querySelector('#drawer'); return !d.classList.contains('prep') && !d.classList.contains('fresh'); }), 'карточка выехала целиком, служебные пометки сняты');
  await P.evaluate(() => { window.__scr = document.querySelector('#d-hero .screen img'); window.__poster = document.querySelector('#d-hero .poster'); window.__body = document.querySelector('#drawer .d-body'); });
  await P.click('#drawer .stars button[data-v="9"]');
  await P.waitForSelector('#drawer .stars button.on[data-v="9"]');
  ok(await same(P, '#d-hero .screen img', '__scr') && await same(P, '#d-hero .poster', '__poster'), 'оценка не перерисовывает кадр и постер — они не мигают');
  ok(await same(P, '#drawer .d-body', '__body'), 'и прокрутка карточки остаётся на месте');
  ok(await same(P, '.row[data-id="w2"]', '__row') && await same(P, '.row[data-id="w2"] img', '__img'), 'строки других тайтлов в списке тоже остаются на месте');
  ok(await P.locator('.row[data-id="fe5160313"] .badge.rv9').count() === 1, 'а строка «Дюны» обновилась: лампочка 9');
  await P.click('#drawer [data-act="set-status"][data-v="watching"]');
  await P.waitForSelector('#drawer [data-act="set-status"][data-v="watching"][aria-pressed="true"]');
  ok(await same(P, '#d-hero .screen img', '__scr'), 'смена статуса — тоже без мигания кадра');
  await P.keyboard.press('Escape');
  await P.waitForSelector('#drawer:not(.on)');
  ok(await same(P, '.row[data-id="w2"]', '__row'), 'закрытие карточки не перерисовывает список');
  // другая карточка — с начала
  await P.click('.row[data-id="w2"]');
  await P.waitForSelector('#drawer.on');
  ok(await P.evaluate(() => document.querySelector('#dtitle').textContent) === 'Интерстеллар' && await P.evaluate(() => document.querySelector('#drawer .d-body').scrollTop) === 0, 'другая карточка открывается с начала');
  const other = E.errors.filter(x => !/ERR_ACCESS_DENIED/.test(x));
  console.log(other.length ? 'ОШИБКИ:\n' + other.join('\n') : 'Ошибок в консоли нет (компьютер)');
  ok(!other.length, 'в консоли нет посторонних ошибок');
  await E.browser.close();

  // ===== телефон
  E = await H.setup({ sheet: new H.Sheet(items(40)), now: NOW, viewport: { width: 390, height: 844 }, dpr: 2, mobile: true });
  P = E.page;
  await P.goto(H.SITE + '#film');
  await P.waitForSelector('.row');
  ok(await P.evaluate(() => getComputedStyle(document.querySelector('.hall'), '::after').display) === 'none', 'на телефоне нет тяжёлого «зерна плёнки» поверх всего экрана');
  ok(parseFloat(await P.evaluate(() => getComputedStyle(document.querySelector('#q')).fontSize)) >= 16, 'поиск — шрифт 16px: iPhone не приближает страницу');
  // шапка
  await P.evaluate(() => window.scrollTo(0, 900));
  await wait(450);
  const tb = await P.locator('#top').boundingBox();
  ok(await P.locator('#top.hide').count() === 1 && tb.y + tb.height <= 1, 'листаешь вниз — шапка уезжает за край (' + Math.round(tb.y + tb.height) + ')');
  await E.shot('96-mobile-scrolled');
  await P.evaluate(() => window.scrollTo(0, 880));
  await wait(200);
  ok(await P.locator('#top.hide').count() === 1, 'мелкое движение пальца шапку не дёргает');
  await P.evaluate(() => window.scrollTo(0, 650));
  await wait(450);
  const tb2 = await P.locator('#top').boundingBox();
  ok(await P.locator('#top.hide').count() === 0 && tb2.y >= 0, 'ведёшь вверх — шапка возвращается');
  await P.evaluate(() => window.scrollTo(0, 0));
  await wait(200);
  ok(await P.locator('#top.hide').count() === 0, 'наверху страницы шапка всегда видна');
  // карточка: пока она открыта, список под ней замирает
  await P.evaluate(() => window.scrollTo(0, 700));
  await wait(300);
  const yList = await P.evaluate(() => scrollY);
  await P.evaluate(() => { location.hash = '#film/i/fe5160313'; });
  await P.waitForSelector('#drawer.on');
  await wait(450);
  const lk = await P.evaluate(() => ({ lock: document.documentElement.classList.contains('lock'), top: document.body.style.top, y: scrollY, bottom: document.body.getBoundingClientRect().bottom, h: innerHeight,
    bg: getComputedStyle(document.documentElement).backgroundColor, foot: getComputedStyle(document.querySelector('#drawer .d-foot')).backgroundColor }));
  ok(lk.lock && lk.top === '-' + yList + 'px' && lk.y === 0, 'карточка выехала — список под ней замер на месте (' + lk.top + ')');
  ok(lk.bottom <= lk.h + 1 && lk.bg === lk.foot, 'ниже экрана нет списка, только фон цвета карточки: под клавиатурой ничего не просвечивает');
  await P.evaluate(() => window.scrollTo(0, 400));
  await wait(100);
  ok(await P.evaluate(() => scrollY) === 0, 'список за карточкой не прокручивается');
  const fs = await P.evaluate(() => [...document.querySelectorAll('#drawer textarea, #drawer input:not([type=checkbox]):not([type=radio])')].map(x => parseFloat(getComputedStyle(x).fontSize)));
  ok(fs.length > 0 && fs.every(v => v >= 16), 'поля в карточке — от 16px: при нажатии на поле страница не приближается (' + Array.from(new Set(fs)).join(', ') + ')');
  ok(await P.evaluate(() => getComputedStyle(document.querySelector('#scrim')).backdropFilter || getComputedStyle(document.querySelector('#scrim')).webkitBackdropFilter) === 'none', 'под карточкой нет лишнего размытия');
  await P.click('#drawer textarea[data-f="pros"]');
  await wait(300);
  await E.shot('97-mobile-field');
  await P.keyboard.press('Escape');
  await wait(450);
  const un = await P.evaluate(() => [document.documentElement.classList.contains('lock'), scrollY]);
  ok(!un[0] && un[1] === yList, 'карточка закрылась — список там же, где был (' + un[1] + ')');
  // свайп вправо
  await P.evaluate(() => { location.hash = '#film/i/fe5160313'; });
  await P.waitForSelector('#drawer.on');
  await wait(450);
  const cdp = await E.context.newCDPSession(P);
  const touch = (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y }] });
  const tf = () => P.evaluate(() => document.querySelector('#drawer').style.transform);
  // медленно и недалеко — карточка возвращается
  await touch('touchStart', 60, 420);
  for (let i = 1; i <= 5; i++) { await touch('touchMove', 60 + i * 10, 422); await wait(90); }
  const mid = await P.evaluate(() => [document.querySelector('#drawer').style.transform, +document.querySelector('#scrim').style.opacity]);
  await touch('touchEnd');
  await wait(450);
  ok(/translateX\(50px\)/.test(mid[0]) && mid[1] < 1, 'карточка едет за пальцем, затемнение светлеет (' + mid[0] + ')');
  ok(await P.locator('#drawer.on').count() === 1 && await tf() === '', 'отпустил рано — карточка мягко вернулась на место');
  ok(await P.evaluate(() => document.documentElement.classList.contains('lock')), 'и список под ней снова замер');
  // прокрутка карточки вверх-вниз — не свайп
  await touch('touchStart', 200, 600);
  for (let i = 1; i <= 5; i++) { await touch('touchMove', 203, 600 - i * 30); await wait(16); }
  await touch('touchEnd');
  await wait(300);
  ok(await P.locator('#drawer.on').count() === 1 && await tf() === '', 'прокрутка карточки вверх-вниз свайпом не считается');
  // дальше и быстрее — закрывается
  await touch('touchStart', 60, 420);
  for (let i = 1; i <= 8; i++) { await touch('touchMove', 60 + i * 25, 424); await wait(16); }
  await touch('touchEnd');
  await wait(500);
  ok(await P.locator('#drawer.on, #drawer.prep').count() === 0 && await P.evaluate(() => location.hash) === '#film', 'потянул вправо — карточка закрылась');
  ok(await P.evaluate(() => [document.documentElement.classList.contains('lock'), scrollY].join()) === 'false,' + yList, 'и список там же, где был');
  // быстро открыть и сразу закрыть — карточка не застревает
  await P.click('.row[data-id="w2"]');
  await P.keyboard.press('Escape');
  await wait(500);
  ok(await P.locator('#drawer.on, #drawer.prep').count() === 0, 'если открыть и сразу закрыть, карточка не застревает');
  // вкладки: шапка спрятана, раздел меняется — страница не должна прыгать, чтобы показать вкладку
  await P.evaluate(() => window.scrollTo(0, 600));
  await wait(450);
  const y0 = await P.evaluate(() => scrollY);
  await P.evaluate(() => { location.hash = '#data'; });
  await P.waitForSelector('#posters');
  await wait(700);
  const tx = await P.evaluate(() => [document.querySelector('#tabs').scrollLeft, window.scrollY, document.querySelector('#tabs [aria-current]').getBoundingClientRect().right <= innerWidth]);
  ok(tx[0] > 0 && tx[1] === y0 && tx[2], 'активная вкладка сама подъезжает в полосе, страница при этом не прыгает (' + tx.join(', ') + ')');
  const other2 = E.errors.filter(x => !/ERR_ACCESS_DENIED/.test(x));
  console.log(other2.length ? 'ОШИБКИ:\n' + other2.join('\n') : 'Ошибок в консоли нет (телефон)');
  ok(!other2.length, 'в консоли нет посторонних ошибок');
  await E.browser.close();
})().catch(e => { console.error(e); process.exit(1); });
