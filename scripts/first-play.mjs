// Plays the first few minutes of a brand-new farm like a newcomer would,
// screenshotting each step: the welcome, the first quests, the market at
// level 1 and the HUD as it grows. Used to tune the opening.
// Usage: node scripts/first-play.mjs <screenshot-dir> [WxH] [url]
import { chromium } from 'playwright';

const out = process.argv[2] ?? '.';
const [w, h] = (process.argv[3] ?? '1280x800').split('x').map(Number);
const url = process.argv[4] ?? 'http://localhost:3001/?debug&hour=12';
const touch = Math.max(w, h) < 1250;
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: w, height: h }, hasTouch: touch, isMobile: touch, deviceScaleFactor: touch ? 2 : 1 });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
let n = 0;
const shot = (name) => page.screenshot({ path: `${out}/${w}x${h}-${String(++n).padStart(2, '0')}-${name}.png` });
const wait = (ms) => page.waitForTimeout(ms);

await page.goto(url);
await page.waitForSelector('.auth-card');
await page.fill('input[placeholder="Farmer name"]', 'new' + Math.floor(Math.random() * 1e5));
await page.fill('input[type=password]', 'password1');
await page.click('button[type=submit]');
await page.waitForSelector('.toolbar');
await wait(1500);
await shot('arrive');

const scene = () => page.evaluate(() => window.__farm.scene());
const tile = (x, y) => page.evaluate(([x, y]) => window.__farm.scene().tileToScreen(x, y), [x, y]);
const tap = async (x, y) => {
  const p = await tile(x, y);
  await page.mouse.click(p.x, p.y);
  await wait(250);
};
const tool = async (label) => {
  const b = page.locator('.tool', { hasText: label }).first();
  if (!(await b.isVisible())) {
    await page.locator('.more-tools').click({ force: true });
    await wait(300);
  }
  await b.click({ force: true });
  await wait(300);
};
const state = () => page.evaluate(() => window.__farm.store.state);

// Wait for the starter strawberries, then pick them.
await page.keyboard.press('Escape');
await wait(11000);
await tool('Hand');
for (const [x, y] of [[7, 5], [8, 5], [9, 5]]) await tap(x, y);
await wait(800);
await shot('harvested');

// The quest board after the first quest.
const quests = page.locator('.round-btn[aria-label="Quests"]').first();
await quests.click({ force: true });
await wait(600);
await shot('quests');
const claim = page.locator('.modal .btn', { hasText: /Claim|Collect/ }).first();
if (await claim.count()) {
  await claim.click({ force: true }).catch(() => {});
  await wait(800);
  await shot('claimed');
}
await page.keyboard.press('Escape');
await wait(300);

// Plow four plots, plant six, like the quests ask.
await tool('Plow');
await shot('plow-tool');
for (const [x, y] of [[10, 5], [10, 6], [11, 5], [11, 6]]) await tap(x, y);
await page.keyboard.press('Escape');
await tool('Seeds');
await wait(400);
await shot('seeds');
await page.keyboard.press('Escape');
await wait(300);
await tool('Seeds');
await page.locator('.modal .card, .modal .seed-card, .modal button').filter({ hasText: /Strawberr/ }).first().click({ force: true }).catch(() => {});
await wait(300);
for (const [x, y] of [[7, 5], [8, 5], [9, 5], [10, 5], [10, 6], [11, 5]]) await tap(x, y);
await page.keyboard.press('Escape');
await wait(500);
await shot('planted');

// The market at level 1.
await tool('Market');
await wait(600);
await shot('market');
await page.keyboard.press('Escape');
await wait(300);

const st = await state();
console.log(`level ${st.level}, xp ${st.xp}, coins ${st.coins}, quests done ${st.quests.completed.join(',')}, active ${st.quests.active.join(',')}`);
console.log(errors.length ? 'Errors:\n' + errors.join('\n') : 'No errors');
await browser.close();
