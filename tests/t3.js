// Сценарий 3: Google отвечает «пустышкой» при загрузке и при сохранении.
const H = require('./harness');
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) process.exitCode = 1; };
const wait = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const gsBlank = { n: 2, action: 'getAll' };
  let E = await H.setup({ gsBlank });
  await E.page.goto(H.SITE + '#home');
  await E.page.waitForSelector('.hero', { timeout: 20000 });
  ok(E.sheet.log.filter(x => x === 'BLANK:getAll').length === 2, 'две «пустышки» при загрузке пережиты повторами');
  // сохранение получает «пустышку»
  gsBlank.n = 1; gsBlank.action = 'saveItems';
  await E.page.goto(H.SITE + '#film/i/fe5160313');
  await E.page.waitForSelector('#drawer.on');
  await E.page.click('.stars button[data-v="9"]');
  await wait(2500);
  const st = await E.page.locator('#savestate').innerText();
  console.log('  индикатор после пустышки:', st);
  ok(/Не сохранилось/.test(st), 'пустой ответ не считается сохранением');
  ok(E.sheet.rows.find(r => r.id === 'fe5160313').rating === 8, 'в таблице пока старая оценка');
  await wait(7500);
  ok(E.sheet.rows.find(r => r.id === 'fe5160313').rating === 9, 'повтор через 6 секунд сохранил оценку');
  ok(/Сохранено/.test(await E.page.locator('#savestate').innerText()), 'индикатор снова зелёный');
  console.log('  вызовы:', E.sheet.log.join(','));
  console.log(E.errors.length ? 'ОШИБКИ:\n' + E.errors.join('\n') : 'Ошибок в консоли нет');
  await E.browser.close();
  // всё время пустышки: понятная ошибка с кнопкой
  E = await H.setup({ gsBlank: { n: 99, action: 'getAll' } });
  await E.page.goto(H.SITE + '#home');
  await E.page.waitForSelector('text=Попробовать снова', { timeout: 30000 });
  ok(/Google ответил без данных/.test(await E.page.locator('.loading').innerText()), 'после трёх попыток понятная ошибка и кнопка');
  await E.shot('30-load-error');
  await E.browser.close();
})().catch(e => { console.error(e); process.exit(1); });
