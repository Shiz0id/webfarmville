// End-to-end smoke test against a running dev setup (server + vite).
// Usage: node scripts/smoke.mjs <screenshot-dir> [url]
import { chromium } from 'playwright';

const out = process.argv[2] ?? '.';
const url = process.argv[3] ?? 'http://localhost:5173/';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
page.on('console', (m) => {
  if (m.type() === 'error') errors.push('console: ' + m.text());
});

const shot = (name) => page.screenshot({ path: `${out}/${name}.png` });
const tile = (x, y) => page.evaluate(([x, y]) => window.__farm.scene().tileToScreen(x, y), [x, y]);
const clickTile = async (x, y) => {
  const p = await tile(x, y);
  await page.mouse.click(p.x, p.y);
  await page.waitForTimeout(120);
};
const dragTiles = async (tiles) => {
  const first = await tile(...tiles[0]);
  await page.mouse.move(first.x, first.y);
  await page.mouse.down();
  for (const t of tiles.slice(1)) {
    const p = await tile(...t);
    await page.mouse.move(p.x, p.y, { steps: 4 });
  }
  await page.mouse.up();
  await page.waitForTimeout(150);
};
const state = () => page.evaluate(() => window.__farm.store.state);
const step = (msg) => console.log(`• ${msg}`);

await page.goto(url);
await page.waitForSelector('.auth-card', { timeout: 30000 });
const name = 'tester' + Math.floor(Math.random() * 100000);
await page.fill('input[placeholder="Farmer name"]', name);
await page.fill('input[type=password]', 'password1');
await page.click('button[type=submit]');
await page.waitForSelector('.toolbar', { timeout: 30000 });
await page.waitForTimeout(2500);
await shot('01-farm');

step('waiting for strawberries');
await page.waitForTimeout(9000);
await dragTiles([
  [7, 5],
  [8, 5],
  [9, 5],
]);
await page.waitForTimeout(600);
await shot('02-harvested');
let s = await state();
step(`strawberries in barn: ${s.inventory.strawberry}`);

step('collect chicken');
await clickTile(2, 8);
s = await state();
step(`eggs: ${s.inventory.egg}`);

step('claim quests');
await page.click('button[aria-label="Quests"]', { force: true });
await page.waitForTimeout(300);
await shot('03-quests');
for (const b of await page.$$('.quest .btn.gold')) await b.click({ force: true });
await page.keyboard.press('Escape');

step('plow and plant');
await page.click('.tool:has-text("Plow")');
await dragTiles([
  [10, 10],
  [11, 10],
  [12, 10],
]);
await page.click('.tool:has-text("Seeds")');
await page.click('.card:has-text("Wheat")');
await dragTiles([
  [10, 10],
  [11, 10],
  [12, 10],
  [12, 11],
]);
s = await state();
step(`plots: ${Object.values(s.objects).filter((o) => o.kind === 'plot').length}, coins ${s.coins}`);
await page.keyboard.press('Escape');

step('market');
await page.click('.tool.shop');
await page.waitForTimeout(200);
await page.click('.modal-tabs button:has-text("Decor")');
await page.waitForTimeout(500);
await shot('04-shop-seasonal');
await page.click('.chip:has-text("Flowers")');
await page.waitForTimeout(300);
await shot('05-shop-flowers');
await page.click('.card:has-text("Daisy Patch")');
await clickTile(12, 2);
await clickTile(12, 3);
await page.keyboard.press('Escape');
s = await state();
step(`decorations: ${Object.values(s.objects).filter((o) => o.kind === 'deco').length}`);
await shot('06-placed');

step('orders');
await page.click('button[aria-label="Orders"]', { force: true });
await page.waitForTimeout(400);
await shot('06b-orders');
await page.keyboard.press('Escape');

step('barn');
await page.click('button[aria-label="Barn"]', { force: true });
await page.waitForTimeout(300);
await shot('07-barn');
await page.keyboard.press('Escape');

step('visit Mayor Maple');
await page.click('button[aria-label="Neighbors"]', { force: true });
await page.waitForTimeout(800);
await shot('08-neighbors');
const accept = await page.$('.row button:has-text("Accept")');
if (accept) await accept.click();
await page.waitForTimeout(300);
await page.click('.row:has-text("Mayor") button:has-text("Visit")');
await page.waitForTimeout(1500);
await shot('09-visit');
const helpTargets = await page.evaluate(() => {
  const v = window.__farm.store.visit.state;
  return Object.values(v.objects)
    .filter((o) => o.kind === 'plot' && o.crop)
    .slice(0, 3)
    .map((o) => [o.x, o.y]);
});
for (const [x, y] of helpTargets) {
  await clickTile(x, y);
  await page.waitForTimeout(400);
}
const helpsLeft = await page.evaluate(() => window.__farm.store.visit.helpsLeft);
step(`helps left after helping: ${helpsLeft}`);
await shot('10-helped');
await page.click('button:has-text("Go home")');
await page.waitForTimeout(800);

await page.click('button[aria-label="Farm"]', { force: true });
await page.waitForTimeout(300);
await shot('11-farmhouse');
await page.keyboard.press('Escape');

await page.waitForTimeout(1000);
s = await state();
const server = await page.evaluate(() => fetch('/api/me', { headers: { authorization: 'Bearer ' + localStorage.getItem('farm.token') } }).then((r) => r.json()));
step(`client coins ${s.coins} / server coins ${server.state.coins}; client xp ${s.xp} / server xp ${server.state.xp}`);
if (JSON.stringify(server.state) !== JSON.stringify(s)) errors.push('client and server state differ');

console.log(errors.length ? `ERRORS:\n${errors.join('\n')}` : 'No errors');
await browser.close();
