// Browser check of the Halloween event: trick-or-treaters, candy, quests and the Candy Shop.
// Usage: node scripts/halloween-check.mjs <screenshot-dir> [url]
// Point it at a running build with ?debug (and &event=halloween outside October).
import { chromium } from 'playwright';

const out = process.argv[2] ?? '.';
const url = process.argv[3] ?? 'http://localhost:3001/?debug&event=halloween';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));

await page.goto(url);
await page.waitForSelector('.auth-card');
await page.screenshot({ path: `${out}/h0-title.png` });
await page.fill('input[placeholder="Farmer name"]', 'spooky' + Math.floor(Math.random() * 1e5));
await page.fill('input[type=password]', 'password1');
await page.click('button[type=submit]');
await page.waitForSelector('.toolbar');
await page.waitForTimeout(1500);

// Summon a trick-or-treater and wait for them to reach the door.
await page.evaluate(() => {
  const sc = window.__farm.scene();
  const r = Math.random;
  Math.random = () => 0.9;
  sc.maybeTrickOrTreat();
  Math.random = r;
});
await page.waitForFunction(() => window.__farm.scene().treater?.waiting, null, { timeout: 30000 }).catch(() => {});
await page.screenshot({ path: `${out}/h1-treater.png` });
const kid = await page.evaluate(() => {
  const t = window.__farm.scene().treater;
  return t ? [Math.floor(t.x), Math.floor(t.y)] : null;
});
if (kid) {
  const p = await page.evaluate(([x, y]) => window.__farm.scene().tileToScreen(x, y), kid);
  await page.mouse.click(p.x, p.y);
  await page.waitForTimeout(900);
}
const st = await page.evaluate(() => ({
  candy: window.__farm.store.state.inventory.candy ?? 0,
  treats: window.__farm.store.state.treats,
  quests: window.__farm.store.state.quests.active,
}));
console.log('after treat:', JSON.stringify(st));
await page.screenshot({ path: `${out}/h2-after-treat.png` });

await page.click('button[aria-label="Quests"]', { force: true });
await page.waitForTimeout(500);
await page.screenshot({ path: `${out}/h3-quests.png` });
await page.keyboard.press('Escape');

await page.click('.tool.shop');
await page.click('.modal-tabs button:has-text("Decor")');
await page.waitForTimeout(800);
await page.screenshot({ path: `${out}/h4-candy-shop.png` });
await page.keyboard.press('Escape');

console.log(errors.length ? `ERRORS:\n${errors.join('\n')}` : 'No errors');
await browser.close();
