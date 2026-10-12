// Play-tests baby animals through the real server: the Market's Babies shelf,
// placing a baby calf, babies drawn small with a cuddle bubble, cuddling one,
// the Nursery Barn panel, a lonely animal arriving as a baby, and a baby
// growing up.
// Usage: node scripts/nursery-check.mjs <screenshot-dir> [url]
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
const name = 'nursery' + Math.floor(Math.random() * 1e5);
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
  st.quests = st.quests ?? {};
});
await reload();

// 1. The Market's Babies shelf.
await page.locator('.tool', { hasText: 'Market' }).first().click();
await page.locator('.modal-tabs button', { hasText: 'Animals' }).click();
await page.locator('.chip', { hasText: 'Babies' }).click();
await page.waitForTimeout(400);
await page.screenshot({ path: `${out}/n1-shop-babies.png` });

// 2. Place a baby calf from the shelf.
await page.locator('.card', { hasText: 'Baby Calf' }).click();
await page.waitForTimeout(300);
let p = await tileScreen(12, 4);
await page.mouse.move(p.x, p.y);
await page.mouse.click(p.x, p.y);
await page.waitForTimeout(800);
console.log('after shop', JSON.stringify(await babies()));

// 3. A Nursery Barn and a few more babies around it.
await page.evaluate(() => {
  const S = window.__farm.store;
  S.dispatch({ type: 'buy', def: 'nursery_barn', x: 10, y: 10 });
  S.dispatch({ type: 'buyBaby', def: 'chicken', x: 9, y: 11 });
  S.dispatch({ type: 'buyBaby', def: 'sheep', x: 9, y: 12 });
  S.dispatch({ type: 'buyBaby', def: 'chicken', x: 13, y: 8 });
  S.dispatch({ type: 'buy', def: 'cow', x: 12, y: 6 });
});
await page.waitForTimeout(1200);
await page.evaluate(() => {
  const sc = window.__farm.scene();
  const p = sc.tileToWorld(11, 9);
  sc.cameras.main.setZoom(1.6).centerOn(p.x, p.y);
});
await page.waitForTimeout(800);
await page.screenshot({ path: `${out}/n2-babies.png` });

// 4. Hover a baby for its tooltip, then click it for a cuddle.
p = await tileScreen(9, 12, 8);
await page.mouse.move(p.x, p.y);
await page.waitForTimeout(500);
await page.screenshot({ path: `${out}/n3-tooltip.png` });
await page.mouse.click(p.x, p.y);
await page.waitForTimeout(400);
await page.screenshot({ path: `${out}/n4-cuddle.png` });
console.log('cuddles', await page.evaluate(() => window.__farm.store.state.stats.cuddle ?? 0));

// 5. The Nursery Barn panel and "cuddle everyone".
p = await tileScreen(11, 11, 30);
await page.mouse.click(p.x, p.y);
await page.waitForSelector('.nu-list', { timeout: 5000 });
await page.waitForTimeout(300);
await page.screenshot({ path: `${out}/n5-nursery.png` });
const all = page.locator('.nu-all');
if (await all.count()) await all.click();
await page.waitForTimeout(400);
await page.screenshot({ path: `${out}/n6-cuddled-all.png` });
console.log('cuddles after all', await page.evaluate(() => window.__farm.store.state.stats.cuddle ?? 0));
await page.keyboard.press('Escape');

// 6. A lonely animal arrives and is adopted as a baby.
await page.evaluate(() => window.__farm.store.dispatch({ type: 'lonelyArrive' }));
await page.waitForTimeout(6000);
const rest = await page.evaluate(() => {
  const sc = window.__farm.scene();
  const l = window.__farm.store.state.lonely;
  const img = sc.children.list.find((c) => c.type === 'Image' && c.texture?.key === `animal:${l.animal}` && c.input);
  return { animal: l.animal, x: img?.x, y: img?.y };
});
console.log('wanderer', JSON.stringify(rest));
await page.evaluate(() => {
  const S = window.__farm.store;
  S.dispatch({ type: 'adoptLonely', x: 4, y: 7 });
});
await page.waitForTimeout(1200);
await page.screenshot({ path: `${out}/n7-adopted.png` });
console.log('adopted', JSON.stringify((await babies()).find((o) => o.nick)));

// 7. Growing up: wind the clock forward on one baby.
await page.keyboard.press('Escape');
editState((st) => {
  for (const o of Object.values(st.objects)) if (o.kind === 'animal' && o.def === 'sheep' && o.grownAt) o.grownAt = Date.now() - 1000;
});
await reload();
await page.evaluate(() => window.__farm.store.dispatch({ type: 'cuddleBaby', id: Object.values(window.__farm.store.state.objects).find((o) => o.x === 13 && o.y === 8).id }));
await page.waitForTimeout(800);
await page.screenshot({ path: `${out}/n8-grew-up.png` });
console.log('raised', await page.evaluate(() => window.__farm.store.state.stats.raised ?? 0));

console.log(errors.length ? errors : 'No errors');
await browser.close();
