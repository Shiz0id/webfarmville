// Play-tests the Feed Mill through the real server: buying it, its panel
// (recipes and the "feeding time" section), feeding a hungry animal by tapping
// it, the fed tooltip and collection bonus, "feed everyone", and snacks for a
// napping baby.
// Usage: node scripts/feedmill-check.mjs <screenshot-dir> [url]
import { chromium } from 'playwright';
import { DatabaseSync } from 'node:sqlite';

const out = process.argv[2] ?? '.';
const url = process.argv[3] ?? 'http://localhost:3001/?debug&hour=12';
const browser = await chromium.launch();
const errors = [];
const db = new DatabaseSync('data/farm.db');
const xpFor = (n) => Math.round(25 * (n - 1) + 12 * (n - 1) ** 1.85);

const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
const name = 'feedmill' + Math.floor(Math.random() * 1e5);
await page.goto(url);
await page.waitForSelector('.auth-card');
await page.fill('input[placeholder="Farmer name"]', name);
await page.fill('input[type=password]', 'password1');
await page.click('button[type=submit]');
await page.waitForSelector('.toolbar');
await page.waitForTimeout(500);

function editState(fn) {
  const row = db.prepare('SELECT f.user_id, f.state FROM farms f JOIN users u ON u.id = f.user_id WHERE u.username = ?').get(name);
  const st = JSON.parse(row.state);
  fn(st);
  db.prepare('UPDATE farms SET state = ?, rev = rev + 1 WHERE user_id = ?').run(JSON.stringify(st), row.user_id);
}
async function reload() {
  await page.reload();
  await page.waitForSelector('.toolbar');
  await page.waitForTimeout(900);
  await page.keyboard.press('Escape');
}
/** Screen position of the middle of tile (x, y). */
async function tileScreen(x, y, lift = 0) {
  return page.evaluate(
    ([x, y, lift]) => {
      const sc = window.__farm.scene();
      const p = sc.tileToWorld(x + 0.5, y + 0.5);
      const cam = sc.cameras.main;
      return { x: (p.x - cam.worldView.x) * cam.zoom, y: (p.y - lift - cam.worldView.y) * cam.zoom };
    },
    [x, y, lift],
  );
}
const babies = () =>
  page.evaluate(() => Object.values(window.__farm.store.state.objects).filter((o) => o.kind === 'animal' && o.grownAt));

editState((st) => {
  st.level = 6;
  st.xp = xpFor(6) + 5;
  st.coins = 5000;
  Object.assign(st.inventory, { wheat: 10, carrot: 5, corn: 4, blueberry: 2 });
});
await reload();

// 1. The Feed Mill in the Market.
await page.locator('.tool', { hasText: 'Market' }).first().click();
await page.locator('.modal-tabs button', { hasText: 'Buildings' }).click();
await page.waitForTimeout(400);
await page.screenshot({ path: `${out}/f1-shop.png` });
await page.keyboard.press('Escape');

// 2. Build it, open it and grind some feed.
await page.evaluate(() => {
  const S = window.__farm.store;
  S.dispatch({ type: 'buy', def: 'feed_mill', x: 11, y: 10 });
  S.dispatch({ type: 'buy', def: 'cow', x: 12, y: 6 });
  S.dispatch({ type: 'buy', def: 'cow', x: 12, y: 7 });
  const sc = window.__farm.scene();
  const p = sc.tileToWorld(10, 8);
  sc.cameras.main.setZoom(1.5).centerOn(p.x, p.y);
});
await page.waitForTimeout(900);
let p = await tileScreen(12, 11, 30);
await page.mouse.click(p.x, p.y);
await page.waitForSelector('.fm-feed', { timeout: 5000 });
// The panel re-renders every second, so click straight through the DOM.
const clickIn = (sel, text) =>
  page.evaluate(([sel, text]) => [...document.querySelectorAll(sel)].find((el) => el.textContent.includes(text))?.querySelector('button')?.click(), [sel, text]);
await clickIn('.recipe', 'Barnyard Feed');
await page.waitForTimeout(500);
await page.screenshot({ path: `${out}/f2-panel.png` });
console.log('queue', JSON.stringify(await page.evaluate(() => Object.values(window.__farm.store.state.objects).find((o) => o.def === 'feed_mill').queue)));
await page.keyboard.press('Escape');

// Pretend the feed is done.
await page.waitForTimeout(1500);
editState((st) => {
  st.inventory.animal_feed = 4;
  st.inventory.deluxe_feed = 1;
  const hen = Object.values(st.objects).find((o) => o.def === 'chicken');
  hen.cycleStart = Date.now();
});
await reload();
await page.evaluate(() => {
  const sc = window.__farm.scene();
  const p = sc.tileToWorld(6, 8);
  sc.cameras.main.setZoom(1.5).centerOn(p.x, p.y);
});
await page.waitForTimeout(600);

// 3. Hover the hungry hen, tap to feed her, hover again.
p = await tileScreen(2, 8, 10);
await page.mouse.move(p.x, p.y);
await page.waitForTimeout(400);
await page.screenshot({ path: `${out}/f3-hungry.png` });
await page.mouse.click(p.x, p.y);
await page.waitForTimeout(300);
await page.mouse.move(p.x + 40, p.y + 40);
await page.mouse.move(p.x, p.y);
await page.waitForTimeout(400);
await page.screenshot({ path: `${out}/f4-fed.png` });
const hen = await page.evaluate(() => Object.values(window.__farm.store.state.objects).find((o) => o.def === 'chicken'));
console.log('hen', JSON.stringify(hen));

// 4. Collect her later for the bonus.
editState((st) => {
  const h = Object.values(st.objects).find((o) => o.def === 'chicken');
  h.cycleStart = Date.now() - 3600_000;
});
await reload();
const before = await page.evaluate(() => window.__farm.store.state.inventory.egg ?? 0);
await page.evaluate(() => window.__farm.store.dispatch({ type: 'collect', id: Object.values(window.__farm.store.state.objects).find((o) => o.def === 'chicken').id }));
console.log('eggs', before, '->', await page.evaluate(() => window.__farm.store.state.inventory.egg ?? 0));

// 5. Feed everyone from the mill.
await page.evaluate(() => {
  const sc = window.__farm.scene();
  const p = sc.tileToWorld(10, 8);
  sc.cameras.main.setZoom(1.5).centerOn(p.x, p.y);
});
await page.waitForTimeout(500);
p = await tileScreen(12, 11, 30);
await page.mouse.click(p.x, p.y);
await page.waitForSelector('.fm-feed', { timeout: 5000 });
await page.evaluate(() => document.querySelector('.fm-feed button').click());
await page.waitForTimeout(500);
await page.screenshot({ path: `${out}/f5-fed-all.png` });
console.log('fed cows', JSON.stringify(await page.evaluate(() => Object.values(window.__farm.store.state.objects).filter((o) => o.def === 'cow').map((o) => o.fed))));
await page.keyboard.press('Escape');

// 6. A napping baby gets a snack instead of a cuddle.
await page.evaluate(() => {
  const S = window.__farm.store;
  S.state.inventory.animal_feed = (S.state.inventory.animal_feed ?? 0);
  S.dispatch({ type: 'buyBaby', def: 'sheep', x: 9, y: 8 });
  S.dispatch({ type: 'cuddleBaby', id: Object.values(S.state.objects).find((o) => o.def === 'sheep').id });
});
await page.waitForTimeout(600);
const lamb0 = await page.evaluate(() => Object.values(window.__farm.store.state.objects).find((o) => o.def === 'sheep').grownAt);
p = await tileScreen(9, 8, 8);
await page.mouse.click(p.x, p.y);
await page.waitForTimeout(500);
await page.screenshot({ path: `${out}/f6-baby-snack.png` });
const lamb1 = await page.evaluate(() => Object.values(window.__farm.store.state.objects).find((o) => o.def === 'sheep').grownAt);
console.log('lamb grows up sooner by (min)', Math.round((lamb0 - lamb1) / 60000));

console.log(errors.length ? errors : 'No errors');
await browser.close();
