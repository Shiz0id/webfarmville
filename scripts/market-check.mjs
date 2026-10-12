// Play-tests the Farmers' Market Stall through the real server: buy a stall,
// list goods, see them on the counter, then (by back-dating the listings in
// the DB) collect the sales.
// Usage: node scripts/market-check.mjs <screenshot-dir> [url]
import { chromium } from 'playwright';
import { DatabaseSync } from 'node:sqlite';

const out = process.argv[2] ?? '.';
const url = process.argv[3] ?? 'http://localhost:3001/?debug&hour=12';
const name = 'shop' + Math.floor(Math.random() * 1e5);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
const shot = (n) => page.screenshot({ path: `${out}/${n}.png` });

await page.goto(url);
await page.waitForSelector('.auth-card');
await page.fill('input[placeholder="Farmer name"]', name);
await page.fill('input[type=password]', 'password1');
await page.click('button[type=submit]');
await page.waitForSelector('.toolbar');
await page.waitForTimeout(500);

const db = new DatabaseSync('data/farm.db');
const row = db.prepare('SELECT f.user_id, f.state FROM farms f JOIN users u ON u.id = f.user_id WHERE u.username = ?').get(name);
const st = JSON.parse(row.state);
st.level = 6;
st.coins = 5000;
st.inventory = { ...st.inventory, wheat: 12, egg: 6, carrot: 8, corn: 5, apple: 4 };
db.prepare('UPDATE farms SET state = ?, rev = rev + 1 WHERE user_id = ?').run(JSON.stringify(st), row.user_id);
await page.reload();
await page.waitForSelector('.toolbar');
await page.waitForTimeout(800);
await page.keyboard.press('Escape');

const ok = await page.evaluate(() => window.__farm.store.dispatch({ type: 'buy', def: 'market_stall', x: 5, y: 7 }));
console.log('bought', ok);
const listed = await page.evaluate(() => {
  const { store } = window.__farm;
  store.dispatch({ type: 'listStall', item: 'carrot', qty: 5, tier: 'fair' });
  store.dispatch({ type: 'listStall', item: 'egg', qty: 3, tier: 'high' });
  store.dispatch({ type: 'listStall', item: 'apple', qty: 2, tier: 'low' });
  return { n: store.state.stall?.listings.length, toasts: [...document.querySelectorAll('.toast')].map((t) => t.textContent) };
});
console.log('listed', JSON.stringify(listed));
for (let i = 0; i < 3; i++) await page.evaluate(() => window.__farm.scene().zoomBy(1.25));
await page.waitForTimeout(1500);
await shot('m1-counter');
await page.evaluate(() => window.__farm.scene().zoomBy(0.5));
await page.waitForTimeout(500);
// Open the stall by clicking it with the hand tool (find its screen position).
const opened = await page.evaluate(() => {
  const { scene } = window.__farm;
  const s = scene();
  const p = s.tileToWorld(6, 7.5);
  const cam = s.cameras.main;
  return { x: (p.x - cam.worldView.x) * cam.zoom, y: (p.y - 20 - cam.worldView.y) * cam.zoom };
});
await page.mouse.click(opened.x, opened.y);
await page.waitForTimeout(600);
await shot('m2-panel');
if (await page.locator('.mk-slot.add').count()) {
  await page.locator('.mk-slot.add').first().click();
  await page.waitForTimeout(400);
  await shot('m3-picker');
  await page.keyboard.press('Escape');
}
await page.keyboard.press('Escape');

// Back-date the listings so they have sold, then collect from the coin bubble.
await page.waitForTimeout(1500);
const row2 = db.prepare('SELECT state FROM farms WHERE user_id = ?').get(row.user_id);
const st2 = JSON.parse(row2.state);
for (const l of st2.stall.listings) l.at -= 3 * 3600_000;
db.prepare('UPDATE farms SET state = ?, rev = rev + 1 WHERE user_id = ?').run(JSON.stringify(st2), row.user_id);
await page.reload();
await page.waitForSelector('.toolbar');
await page.waitForTimeout(800);
await page.keyboard.press('Escape');
for (let i = 0; i < 3; i++) await page.evaluate(() => window.__farm.scene().zoomBy(1.25));
await page.waitForTimeout(1500);
await shot('m4-coins');
const before = await page.evaluate(() => window.__farm.store.state.coins);
await page.evaluate(() => window.__farm.store.dispatch({ type: 'collectStall' }));
await page.waitForTimeout(800);
const after = await page.evaluate(() => window.__farm.store.state.coins);
console.log('collected', after - before);
await shot('m5-collected');
console.log(errors.length ? errors : 'No errors');
await browser.close();
