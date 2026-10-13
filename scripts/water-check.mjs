// Play-tests well water through the real server: the Water tool with its can
// counter, dragging across growing crops to water them, an empty can, and
// tapping a Wishing Well to fill it back up.
// Usage: node scripts/water-check.mjs <screenshot-dir> [url]
// (On a rainy day the sky waters everything, so the tool has nothing to do.)
import { chromium } from 'playwright';
import { DatabaseSync } from 'node:sqlite';

const out = process.argv[2] ?? '.';
const url = process.argv[3] ?? 'http://localhost:3001/?debug&hour=12';
const name = 'water' + Math.floor(Math.random() * 1e5);
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
st.level = 5;
st.xp = Math.round(25 * 4 + 12 * 4 ** 1.85) + 5;
// A row of six growing corn plots and a wishing well; three splashes left in the can.
for (const o of Object.values(st.objects)) if (o.kind === 'plot') delete st.objects[o.id];
for (let i = 0; i < 6; i++) {
  const id = `o${st.nextId++}`;
  st.objects[id] = { id, kind: 'plot', x: 6 + i, y: 7, crop: 'corn', plantedAt: Date.now() - 60_000 };
}
st.objects.well1 = { id: 'well1', kind: 'deco', def: 'well', x: 9, y: 10 };
st.water = { level: 3, at: Date.now(), wells: {} };
db.prepare('UPDATE farms SET state = ?, rev = rev + 1 WHERE user_id = ?').run(JSON.stringify(st), row.user_id);
await page.reload();
await page.waitForSelector('.toolbar');
await page.waitForTimeout(800);
await page.keyboard.press('Escape');

/** Screen position of a tile's centre. */
const screen = (x, y) =>
  page.evaluate(([x, y]) => {
    const sc = window.__farm.scene();
    const p = sc.tileToWorld(x + 0.5, y + 0.5);
    const cam = sc.cameras.main;
    return { x: (p.x - cam.worldView.x) * cam.zoom, y: (p.y - cam.worldView.y) * cam.zoom };
  }, [x, y]);

await page.click('.tool:has-text("Water")');
await page.waitForTimeout(300);
const a = await screen(6, 7);
const b = await screen(11, 7);
await page.mouse.move(a.x, a.y);
await page.mouse.down();
for (let i = 1; i <= 10; i++) await page.mouse.move(a.x + ((b.x - a.x) * i) / 10, a.y + ((b.y - a.y) * i) / 10);
await page.mouse.up();
await page.waitForTimeout(500);
await shot('w1-watered');
const watered = await page.evaluate(() => Object.values(window.__farm.store.state.objects).filter((o) => o.kind === 'plot' && o.watered).length);
console.log('watered plots', watered, 'can', await page.evaluate(() => window.__farm.store.state.water));

// Tap the well with the hand.
await page.click('.tool:has-text("Hand")');
const w = await screen(9, 10);
await page.mouse.click(w.x, w.y);
await page.waitForTimeout(700);
await shot('w2-well');
console.log('after well', JSON.stringify(await page.evaluate(() => window.__farm.store.state.water)));
console.log(errors.length ? errors : 'No errors');
await browser.close();
