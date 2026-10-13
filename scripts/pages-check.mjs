// Play-tests the browser-only build (npm run build:pages) the way GitHub Pages
// serves it: start a farm, play, reload to check it was saved, visit and help
// a villager, accept the welcome gift, and make sure nothing calls a server.
// Usage: node scripts/pages-check.mjs <screenshot-dir> [url] [WxH]
import { chromium } from 'playwright';

const out = process.argv[2] ?? '.';
const url = process.argv[3] ?? 'http://localhost:8099/webfarmville/?debug&hour=12';
const [w, h] = (process.argv[4] ?? '1280x800').split('x').map(Number);
const touch = Math.max(w, h) < 1250;
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: w, height: h }, hasTouch: touch, isMobile: touch, deviceScaleFactor: touch ? 2 : 1 });
const errors = [];
const apiCalls = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
page.on('request', (r) => r.url().includes('/api/') && apiCalls.push(r.url()));
const shot = (n) => page.screenshot({ path: `${out}/pages-${w}-${n}.png` });
const state = () => page.evaluate(() => window.__farm.store.state);
const step = (s) => console.log('•', s);

await page.goto(url);
await page.waitForSelector('.auth-card');
await shot('1-welcome');
await page.fill('.auth-card input', 'Clover');
await page.click('.auth-card button[type=submit]');
await page.waitForSelector('.toolbar');
await page.waitForTimeout(1500);
await page.keyboard.press('Escape');
step(`farm: ${(await state()).name}`);

// Pick the starter strawberries once they're ripe.
await page.waitForTimeout(11000);
for (const [x, y] of [[7, 5], [8, 5], [9, 5]]) {
  const p = await page.evaluate(([x, y]) => window.__farm.scene().tileToScreen(x, y), [x, y]);
  await page.mouse.click(p.x, p.y);
  await page.waitForTimeout(250);
}
await page.waitForTimeout(800);
let s = await state();
step(`harvested: ${s.inventory.strawberry ?? 0} strawberries, xp ${s.xp}`);
await shot('2-played');

// Reload: the farm should still be there.
await page.reload();
await page.waitForSelector('.toolbar');
await page.waitForTimeout(1200);
const after = await state();
step(`after reload: ${after.name}, ${after.inventory.strawberry ?? 0} strawberries, xp ${after.xp}`);
if (after.xp !== s.xp) errors.push(`xp not saved (${s.xp} → ${after.xp})`);

// Accept Mayor Maple's housewarming gift and visit her farm.
await page.evaluate(() => document.querySelector('button[aria-label="Neighbors"]').click());
await page.waitForSelector('.modal');
await page.waitForTimeout(600);
await shot('3-neighbors');
await page.locator('.modal .btn', { hasText: 'Accept' }).first().click({ force: true });
await page.waitForTimeout(600);
await page.locator('.modal .btn', { hasText: 'Visit' }).first().click({ force: true });
await page.waitForSelector('.visit-banner', { state: 'visible' });
await page.waitForTimeout(1500);
const visit = await page.evaluate(() => window.__farm.store.visit && { name: window.__farm.store.visit.state.name, objects: Object.keys(window.__farm.store.visit.state.objects).length });
step(`visiting ${visit?.name} (${visit?.objects} things)`);
// Help with the first thing that needs it.
const helped = await page.evaluate(async () => {
  const { store } = window.__farm;
  const target = Object.values(store.visit.state.objects).find((o) => o.kind === 'plot' && o.crop);
  const before = store.state.coins;
  await store.help(target.id);
  return store.state.coins - before;
});
step(`help earned ${helped} coins`);
await shot('4-visit');
await page.locator('.visit-banner .btn', { hasText: 'Go home' }).click({ force: true });
await page.waitForTimeout(800);
s = await state();
step(`home: ${s.inventory.tulips_pink ?? 0} pink tulips, visit stat ${s.stats.visit}, help stat ${s.stats.help}`);

await page.evaluate(() => document.querySelector('button[aria-label="Farm"]').click());
await page.waitForSelector('.modal');
await page.waitForTimeout(500);
await shot('5-farmhouse');
step(`backup buttons: ${await page.locator('.modal .btn', { hasText: /Back up|Restore/ }).count()}`);

if (apiCalls.length) errors.push(`server calls: ${apiCalls.join(', ')}`);
console.log(errors.length ? 'Errors:\n' + errors.join('\n') : 'No errors');
await browser.close();
