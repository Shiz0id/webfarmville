// Play-tests farm vehicles through the real server: the Garage panel, buying
// the Tractor, Seeder and Harvester, the patch highlight, plowing / planting /
// harvesting a patch per tap, dragging to pan while driving, the hand tool's
// drag-to-harvest still working, and the toolbar on a phone.
// Usage: node scripts/vehicles-check.mjs <screenshot-dir> [url]
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
const name = 'wheels' + Math.floor(Math.random() * 1e5);
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
  st.level = 7;
  st.xp = xpFor(7) + 5;
  st.coins = 10000;
});
await reload();
const plots = () => page.evaluate(() => Object.values(window.__farm.store.state.objects).filter((o) => o.kind === 'plot').map((o) => `${o.x},${o.y}:${o.crop ?? '-'}`));
const garage = async () => {
  await page.locator('.tool', { hasText: 'Garage' }).click();
  await page.waitForSelector('.gr-grid');
  await page.waitForTimeout(300);
};

// 1. The Garage, and buying all three vehicles.
await garage();
await page.screenshot({ path: `${out}/v1-garage.png` });
for (const name of ['Tractor', 'Seeder', 'Harvester']) {
  await page.locator('.gr-card', { hasText: name }).locator('button').click();
  await page.waitForTimeout(300);
}
await page.screenshot({ path: `${out}/v2-bought.png` });
console.log('garage', JSON.stringify(await page.evaluate(() => window.__farm.store.state.garage)));

// 2. Drive the tractor: hover shows the patch, a tap plows it.
await page.locator('.gr-card', { hasText: 'Tractor' }).locator('button', { hasText: 'Drive' }).click();
await page.waitForTimeout(300);
await page.evaluate(() => {
  const sc = window.__farm.scene();
  const p = sc.tileToWorld(4, 10);
  sc.cameras.main.setZoom(1.4).centerOn(p.x, p.y);
});
await page.waitForTimeout(400);
let p = await tileScreen(2, 11);
await page.mouse.move(p.x, p.y);
await page.waitForTimeout(300);
await page.screenshot({ path: `${out}/v3-hover.png` });
await page.mouse.click(p.x, p.y);
await page.waitForTimeout(1200);
await page.screenshot({ path: `${out}/v4-plowed.png` });
console.log('plots after tractor', JSON.stringify(await plots()));

// 3. Dragging pans the farm instead of driving.
const cam0 = await page.evaluate(() => window.__farm.scene().cameras.main.scrollX);
p = await tileScreen(5, 12);
await page.mouse.move(p.x, p.y);
await page.mouse.down();
await page.mouse.move(p.x + 60, p.y + 10, { steps: 6 });
await page.mouse.move(p.x + 140, p.y + 20, { steps: 6 });
await page.mouse.up();
await page.waitForTimeout(300);
const cam1 = await page.evaluate(() => window.__farm.scene().cameras.main.scrollX);
console.log('drag panned', Math.round(cam0 - cam1), 'plots', (await plots()).length);
await page.evaluate(() => {
  const sc = window.__farm.scene();
  const p = sc.tileToWorld(4, 10);
  sc.cameras.main.centerOn(p.x, p.y);
});

// 4. The Seeder plants wheat in the new plots.
await garage();
await page.locator('.gr-seed[title="Wheat"]').click();
await page.waitForTimeout(200);
await page.locator('.gr-card', { hasText: 'Seeder' }).locator('button', { hasText: 'Drive' }).click();
await page.waitForTimeout(300);
p = await tileScreen(2, 11);
await page.mouse.move(p.x, p.y);
await page.mouse.click(p.x, p.y);
await page.waitForTimeout(1200);
await page.screenshot({ path: `${out}/v5-seeded.png` });
console.log('plots after seeder', JSON.stringify(await plots()));

// 5. Everything ripens; the Harvester takes the 3x3 strawberry patch in one tap.
await page.waitForTimeout(1500);
editState((st) => {
  for (const o of Object.values(st.objects)) if (o.kind === 'plot') { o.crop = o.crop ?? 'strawberry'; o.plantedAt = Date.now() - 3600_000; }
});
await reload();
await page.evaluate(() => {
  const sc = window.__farm.scene();
  const p = sc.tileToWorld(6, 8);
  sc.cameras.main.setZoom(1.4).centerOn(p.x, p.y);
});
await page.waitForTimeout(400);
await garage();
await page.locator('.gr-card', { hasText: 'Harvester' }).locator('button', { hasText: 'Drive' }).click();
await page.waitForTimeout(300);
p = await tileScreen(8, 6);
await page.mouse.move(p.x, p.y);
await page.waitForTimeout(300);
await page.screenshot({ path: `${out}/v6-harvest-hover.png` });
const inv0 = await page.evaluate(() => window.__farm.store.state.inventory.strawberry ?? 0);
await page.mouse.click(p.x, p.y);
await page.waitForTimeout(400);
await page.screenshot({ path: `${out}/v7-harvesting.png` });
console.log('strawberries', inv0, '->', await page.evaluate(() => window.__farm.store.state.inventory.strawberry ?? 0), 'fuel', await page.evaluate(() => window.__farm.store.state.garage.fuel));

// 6. The hand tool's drag-to-harvest still works on the wheat patch.
await page.keyboard.press('Escape');
await page.waitForTimeout(200);
const a = await tileScreen(2, 11);
const b = await tileScreen(3, 12);
await page.mouse.move(a.x, a.y);
await page.mouse.down();
await page.mouse.move((a.x + b.x) / 2, (a.y + b.y) / 2, { steps: 5 });
await page.mouse.move(b.x, b.y, { steps: 5 });
await page.mouse.up();
await page.waitForTimeout(500);
console.log('wheat plots left after hand drag', (await plots()).filter((x) => x.endsWith('wheat')).length);

// 7. The toolbar on a phone.
await page.setViewportSize({ width: 390, height: 780 });
await page.waitForTimeout(600);
await page.screenshot({ path: `${out}/v8-phone.png` });
// On a phone the Garage waits in the dock's More tray.
await page.locator('.more-tools').click();
await page.waitForTimeout(300);
await page.screenshot({ path: `${out}/v8b-phone-tray.png` });
await garage();
await page.screenshot({ path: `${out}/v9-phone-garage.png` });

console.log(errors.length ? errors : 'No errors');
await browser.close();
