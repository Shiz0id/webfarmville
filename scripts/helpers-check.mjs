// Play-tests helpers through the real server: the Garage's Helpers section,
// a Farmhand collecting every ready animal, an Arborist picking the trees, an
// Unwither Charm reviving withered crops, a helper tucked inside a mystery
// gift, and the County Fair's Prize Booth offering helpers for tickets.
// Usage: node scripts/helpers-check.mjs <screenshot-dir> [url]
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
const name = 'helpy' + Math.floor(Math.random() * 1e5);
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
  st.helpers = { farmhand: 1, arborist: 1, unwither_charm: 1 };
  st.fair = { key: '', entries: {}, tickets: 40, champion: [] };
  st.inventory.mystery_gift = 15;
  let n = 1000;
  for (const [x, y, def] of [[3, 11, 'cow'], [4, 11, 'cow'], [5, 11, 'chicken'], [3, 12, 'sheep']]) {
    const id = `o${n++}`;
    st.objects[id] = { id, kind: 'animal', def, x, y, cycleStart: Date.now() - 86_400_000 };
  }
  for (const o of Object.values(st.objects)) {
    if (o.kind === 'tree' || o.kind === 'animal') o.cycleStart = Date.now() - 86_400_000;
    if (o.kind === 'plot') { o.crop = 'strawberry'; o.plantedAt = Date.now() - 30 * 86_400_000; }
  }
});
await reload();
await page.evaluate(() => {
  const sc = window.__farm.scene();
  const p = sc.tileToWorld(6, 8);
  sc.cameras.main.setZoom(1.3).centerOn(p.x, p.y);
});
await page.waitForTimeout(500);
await page.screenshot({ path: `${out}/h1-before.png` });

// 1. The Garage's Helpers section (with a badge on the Garage button).
console.log('garage badge', await page.locator('.tool', { hasText: 'Garage' }).locator('.badge').textContent());
await page.locator('.tool', { hasText: 'Garage' }).click();
await page.waitForSelector('.hp-list');
await page.locator('.hp-list').scrollIntoViewIfNeeded();
await page.waitForTimeout(300);
await page.screenshot({ path: `${out}/h2-garage-helpers.png` });

// 2. Use all three.
for (const name of ['Farmhand', 'Arborist', 'Unwither Charm']) {
  await page.locator('.hp-row', { hasText: name }).locator('button').click();
  await page.waitForTimeout(400);
}
await page.screenshot({ path: `${out}/h3-used.png` });
await page.keyboard.press('Escape');
await page.waitForTimeout(800);
await page.screenshot({ path: `${out}/h4-farm-after.png` });
console.log('after', JSON.stringify(await page.evaluate(() => {
  const s = window.__farm.store.state;
  return { helpers: s.helpers, milk: s.inventory.milk, egg: s.inventory.egg, wool: s.inventory.wool, apple: s.inventory.apple, unwither: s.stats.unwither, ready: Object.values(s.objects).filter((o) => o.kind === 'plot').map((o) => o.plantedAt < Date.now() - 3600_000) };
})));

// 3. Open mystery gifts until a helper turns up.
let from = null;
for (let i = 0; i < 15 && !from; i++) {
  from = await page.evaluate(() => {
    let hit = null;
    const off = window.__farm.store.onEvents((ev) => { for (const e of ev) if (e.type === 'helperFound') hit = e.helper; });
    window.__farm.store.dispatch({ type: 'openGift' });
    off?.();
    return hit;
  });
}
console.log('helper from gift', from);
await page.waitForTimeout(300);
await page.screenshot({ path: `${out}/h5-gift.png` });
// Each gift opened its own unwrap card.
for (let i = 0; i < 20 && (await page.locator('.modal-back').count()); i++) {
  await page.keyboard.press('Escape');
  await page.waitForTimeout(80);
}

// 4. The Prize Booth.
await page.locator('.round-btn', { hasText: 'Fair' }).click();
await page.locator('.modal-tabs button', { hasText: 'Prize Booth' }).click();
await page.waitForTimeout(400);
await page.evaluate(() => document.querySelector('.fa-booth')?.lastElementChild?.previousElementSibling?.scrollIntoView());
await page.waitForTimeout(300);
await page.screenshot({ path: `${out}/h6-booth.png` });
await page.locator('.fa-prize', { hasText: 'Farmhand' }).locator('button').click();
await page.waitForTimeout(400);
console.log('booth', JSON.stringify(await page.evaluate(() => ({ tickets: window.__farm.store.state.fair.tickets, helpers: window.__farm.store.state.helpers }))));

console.log(errors.length ? errors : 'No errors');
await browser.close();
