// Play-tests flower breeding through the real server: a hybrid sprouting at
// the bloom check, watering a flower by tapping it, and the Flower Album.
// Usage: npx tsx scripts/blooms-check.mjs <screenshot-dir> [url]
// (run with tsx so it can use the shared rules to pick a lucky seed)
import { chromium } from 'playwright';
import { DatabaseSync } from 'node:sqlite';
import { BLOOM_PERIOD, applyAction, canPlace } from '@farm/shared';

const out = process.argv[2] ?? '.';
const url = process.argv[3] ?? 'http://localhost:3001/?debug&hour=12';
const name = 'bloom' + Math.floor(Math.random() * 1e5);
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
// Find a clear 5x4 patch for the garden.
let gx = -1;
let gy = -1;
for (let y = 1; y <= st.size - 4 && gx < 0; y++) for (let x = 1; x <= st.size - 5 && gx < 0; x++) if (canPlace(st, x, y, 5, 4)) [gx, gy] = [x, y];
const plant = (def, x, y) => {
  const id = `o${st.nextId++}`;
  st.objects[id] = { id, kind: 'deco', def, x: gx + x, y: gy + y };
  return id;
};
const red = plant('tulips_red', 1, 1);
const yellow = plant('tulips_yellow', 2, 1);
plant('tulips_pink', 0, 3);
plant('tulips_purple', 1, 3);
plant('roses_blue', 4, 0);
plant('roses_gold', 4, 2);
plant('tulips_rainbow', 3, 3);
const now = Date.now();
const period = Math.floor(now / BLOOM_PERIOD);
st.blooms = { period: period - 1, watered: { [red]: period - 1, [yellow]: period - 1 }, found: ['roses_blue', 'roses_gold', 'tulips_rainbow'] };
// Pick a seed that blooms orange tulips at this check.
for (let seed = 1; seed < 100000; seed++) {
  const r = applyAction({ ...st, seed }, { type: 'bloomCheck' }, { now });
  if (r.events.some((e) => e.type === 'bloomed' && e.def === 'tulips_orange')) {
    st.seed = seed;
    break;
  }
}
console.log('garden at', gx, gy, 'seed', st.seed);
db.prepare('UPDATE farms SET state = ?, rev = rev + 1 WHERE user_id = ?').run(JSON.stringify(st), row.user_id);
await page.reload();
await page.waitForSelector('.toolbar');
await page.waitForTimeout(800);
await page.keyboard.press('Escape');
// Centre the camera on the garden and zoom in.
await page.evaluate(([x, y]) => {
  const s = window.__farm.scene();
  const p = s.tileToWorld(x, y);
  s.cameras.main.centerOn(p.x, p.y);
  s.zoomBy(1.6);
}, [gx + 2.5, gy + 2]);
await page.waitForSelector('.catch-card', { timeout: 15000 });
await page.waitForTimeout(800);
await shot('b1-hybrid');
await page.locator('.catch-card button').click();
await page.waitForTimeout(1200);
await shot('b2-garden');
// Water the pink tulips by tapping them with the hand tool.
const at = await page.evaluate(([x, y]) => {
  const s = window.__farm.scene();
  const p = s.tileToWorld(x, y);
  const cam = s.cameras.main;
  return { x: (p.x - cam.worldView.x) * cam.zoom, y: (p.y - 8 - cam.worldView.y) * cam.zoom };
}, [gx + 0.5, gy + 3.5]);
await page.mouse.click(at.x, at.y);
await page.mouse.move(5, 790);
await page.waitForTimeout(1500);
const watered = await page.evaluate(() => window.__farm.store.state.blooms.watered);
console.log('watered', JSON.stringify(watered));
await shot('b3-watered');
await page.click('button[aria-label="Flowers"]');
await page.waitForSelector('.bl-card');
await page.waitForTimeout(500);
await shot('b4-album');
await page.locator('.modal-body, .modal .body').first().evaluate((el) => (el.scrollTop = 9999)).catch(() => {});
await page.waitForTimeout(300);
await shot('b5-album-roses');
console.log('found', JSON.stringify(await page.evaluate(() => window.__farm.store.state.blooms.found)));
console.log(errors.length ? errors : 'No errors');
await browser.close();
