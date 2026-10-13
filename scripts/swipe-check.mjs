// Play-tests touch farming on a phone: real multi-touch swipes (through the
// Chrome DevTools Protocol) with the Harvest tool, the seed bag, the hand and two
// fingers, checking that strokes never move the camera and fast swipes miss nothing.
// Usage: node scripts/swipe-check.mjs <screenshot-dir> [url]
import { chromium } from 'playwright';

const out = process.argv[2] ?? '.';
const url = process.argv[3] ?? 'http://localhost:8099/webfarmville/?debug&hour=12';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
const page = await ctx.newPage();
const cdp = await ctx.newCDPSession(page);
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
const step = (s) => console.log('•', s);
const expect = (ok, msg) => ok || errors.push(msg);

const screenOf = (x, y) => page.evaluate(([x, y]) => window.__farm.scene().tileToScreen(x, y), [x, y]);
const cam = () => page.evaluate(() => { const c = window.__farm.scene().cameras.main; return { x: Math.round(c.scrollX), y: Math.round(c.scrollY), z: c.zoom }; });
const objects = () => page.evaluate(() => Object.values(window.__farm.store.state.objects));
const plotAt = async (x, y) => (await objects()).find((o) => o.kind === 'plot' && o.x === x && o.y === y);
const touch = (type, points) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: points.map((p, id) => ({ x: p.x, y: p.y, id })) });

/** One finger through a list of screen points, a few events per leg (a quick, sloppy swipe). */
async function swipe(points, perLeg = 2) {
  await touch('touchStart', [points[0]]);
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    for (let k = 1; k <= perLeg; k++) await touch('touchMove', [{ x: a.x + ((b.x - a.x) * k) / perLeg, y: a.y + ((b.y - a.y) * k) / perLeg }]);
    await page.waitForTimeout(16);
  }
  await touch('touchEnd', []);
  await page.waitForTimeout(500);
}

async function tool(label) {
  await page.evaluate((label) => {
    const btn = [...document.querySelectorAll('.toolbar .tool, .tool-tray .tool')].find((b) => b.textContent.trim().endsWith(label));
    btn.click();
  }, label);
  await page.waitForTimeout(300);
}

await page.goto(url);
await page.waitForSelector('.auth-card');
await page.fill('.auth-card input', 'Swipey');
await page.click('.auth-card button[type=submit]');
await page.waitForSelector('.toolbar', { state: 'attached' });
await page.waitForTimeout(1500);
await page.evaluate(() => document.querySelector('.villager-say button, .say-close')?.click());
await page.waitForTimeout(11000); // the starter strawberries ripen

// Harvest: one fast swipe that starts on grass and crosses the three ripe plots.
await tool('Harvest');
await page.screenshot({ path: `${out}/swipe-1-harvest-tool.png` });
const before = await cam();
const berries0 = (await page.evaluate(() => window.__farm.store.state.inventory.strawberry)) ?? 0;
await swipe([await screenOf(5, 5), await screenOf(11, 5)], 2);
const berries = (await page.evaluate(() => window.__farm.store.state.inventory.strawberry)) ?? 0;
const after = await cam();
step(`harvest swipe (2 move events over 6 tiles): +${berries - berries0} strawberries, camera moved ${after.x - before.x},${after.y - before.y}`);
expect(berries - berries0 >= 6, 'the fast harvest swipe missed plots');
expect(after.x === before.x && after.y === before.y, 'the harvest swipe moved the camera');

// Seeds: a zig-zag starting on a plot plants the field but never plows the lawn around it.
await page.evaluate(() => [...document.querySelectorAll('.tool')].find((b) => b.textContent.includes('Seeds'))?.click());
await page.waitForSelector('.modal .card');
await page.locator('.modal .card').first().click();
await page.waitForTimeout(400);
const coins0 = await page.evaluate(() => window.__farm.store.state.coins);
const zig = [[7, 5], [9, 5], [9, 6], [7, 6], [6, 7], [11, 4]];
await swipe(await Promise.all(zig.map(([x, y]) => screenOf(x, y))), 2);
const planted = [];
for (const [x, y] of [[7, 5], [8, 5], [9, 5], [7, 6], [8, 6], [9, 6]]) planted.push(!!(await plotAt(x, y))?.crop);
const strayPlots = (await objects()).filter((o) => o.kind === 'plot' && (o.y === 7 || o.y === 4)).length;
step(`seed zig-zag: ${planted.filter(Boolean).length}/6 planted, stray plots on the lawn: ${strayPlots}, coins ${coins0} → ${await page.evaluate(() => window.__farm.store.state.coins)}`);
expect(planted.every(Boolean), 'the seed swipe missed plots');
expect(strayPlots === 0, 'a seed swipe that started on a plot plowed the lawn');

// Seeds from grass: breaks new ground along the way.
await swipe([await screenOf(3, 11), await screenOf(6, 11)], 3);
const newRow = (await objects()).filter((o) => o.kind === 'plot' && o.y === 11 && o.crop).length;
step(`seed swipe from grass: ${newRow} new planted plots`);
expect(newRow >= 3, 'a seed swipe from grass did not plow and plant');
await page.screenshot({ path: `${out}/swipe-2-planted.png` });

// Two fingers move the camera and do nothing else.
const objs0 = (await objects()).length;
const c0 = await cam();
await touch('touchStart', [{ x: 150, y: 400 }, { x: 250, y: 400 }]);
for (let i = 1; i <= 6; i++) await touch('touchMove', [{ x: 150 + i * 10, y: 400 + i * 15 }, { x: 250 + i * 10, y: 400 + i * 15 }]);
await touch('touchEnd', []);
await page.waitForTimeout(400);
const c1 = await cam();
step(`two-finger drag: camera ${c1.x - c0.x},${c1.y - c0.y}, objects ${objs0} → ${(await objects()).length}`);
expect(c1.x !== c0.x || c1.y !== c0.y, 'two fingers did not move the camera');
expect((await objects()).length === objs0, 'two fingers changed the farm');

// The hand pans, even when the drag starts on a crop.
await tool('Hand');
const h0 = await cam();
await swipe([await screenOf(8, 5), { x: 60, y: 700 }], 4);
const h1 = await cam();
step(`hand drag from a crop: camera ${h1.x - h0.x},${h1.y - h0.y}`);
expect(h1.x !== h0.x || h1.y !== h0.y, 'the hand did not pan');
await page.screenshot({ path: `${out}/swipe-3-hand.png` });

console.log(errors.length ? 'Errors:\n' + errors.join('\n') : 'No errors');
await browser.close();
