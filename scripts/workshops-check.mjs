// Play-tests workshop upgrades through the real server: the Upgrades section
// of a workshop's panel, upgrading a Windmill to level 2 (an extra slot) and 3,
// its tooltip stars, and collecting from a level 3 workshop.
// Usage: node scripts/workshops-check.mjs <screenshot-dir> [url]
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
const name = 'penny' + Math.floor(Math.random() * 1e5);
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
  st.level = 9;
  st.xp = xpFor(9) + 5;
  st.coins = 8000;
  Object.assign(st.inventory, { flour: 20, cornmeal: 6, wheat: 60 });
});
await reload();
await page.evaluate(() => {
  const S = window.__farm.store;
  S.dispatch({ type: 'buy', def: 'mill', x: 11, y: 10 });
  const sc = window.__farm.scene();
  const p = sc.tileToWorld(10, 9);
  sc.cameras.main.setZoom(1.5).centerOn(p.x, p.y);
});
await page.waitForTimeout(800);
const clickBtn = (text) =>
  page.evaluate((text) => [...document.querySelectorAll('.modal button')].find((b) => b.textContent.includes(text))?.click(), text);
const openMill = async () => {
  const p = await tileScreen(12, 11, 30);
  await page.mouse.click(p.x, p.y);
  await page.waitForSelector('.ws-box', { timeout: 5000 });
  await page.evaluate(() => document.querySelector('.ws-box')?.scrollIntoView());
  await page.waitForTimeout(300);
};

// 1. The Upgrades section.
await openMill();
await page.screenshot({ path: `${out}/w1-panel.png` });

// 2. Upgrade to level 2 and 3.
await clickBtn('Upgrade');
await page.waitForTimeout(700);
await page.evaluate(() => document.querySelector('.queue')?.scrollIntoView());
await page.screenshot({ path: `${out}/w2-level2.png` });
await clickBtn('Upgrade');
await page.waitForTimeout(700);
await page.evaluate(() => document.querySelector('.ws-box')?.scrollIntoView());
await page.screenshot({ path: `${out}/w3-level3.png` });
for (let i = 0; i < 5; i++) await clickBtn('Make');
await page.waitForTimeout(400);
const mill = await page.evaluate(() => Object.values(window.__farm.store.state.objects).find((o) => o.def === 'mill'));
console.log('mill', JSON.stringify({ level: mill.level, queue: mill.queue.length }));
await page.keyboard.press('Escape');

// 3. Done crafting: hover for the stars, collect with a chance of bonuses.
await page.waitForTimeout(1500);
editState((st) => {
  const m = Object.values(st.objects).find((o) => o.def === 'mill');
  for (const j of m.queue) j.end = Date.now() - 1000;
});
await reload();
await page.evaluate(() => {
  const sc = window.__farm.scene();
  const p = sc.tileToWorld(10, 9);
  sc.cameras.main.setZoom(1.5).centerOn(p.x, p.y);
});
await page.waitForTimeout(500);
const p = await tileScreen(12, 11, 30);
await page.mouse.move(p.x, p.y);
await page.waitForTimeout(400);
await page.screenshot({ path: `${out}/w4-tooltip.png` });
const before = await page.evaluate(() => window.__farm.store.state.inventory.flour ?? 0);
await page.mouse.click(p.x, p.y);
await page.waitForTimeout(500);
await page.screenshot({ path: `${out}/w5-collected.png` });
console.log('flour', before, '->', await page.evaluate(() => window.__farm.store.state.inventory.flour ?? 0));

console.log(errors.length ? errors : 'No errors');
await browser.close();
