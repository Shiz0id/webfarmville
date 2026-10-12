// Plays the fishing mini-game and a critter catch, screenshotting each step.
// Usage: node scripts/nature-check.mjs <screenshot-dir> [url]
import { chromium } from 'playwright';

const out = process.argv[2] ?? '.';
const url = process.argv[3] ?? 'http://localhost:3001/?debug&hour=12';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
const shot = (n) => page.screenshot({ path: `${out}/${n}.png` });

await page.goto(url);
await page.waitForSelector('.auth-card');
await page.fill('input[placeholder="Farmer name"]', 'angler' + Math.floor(Math.random() * 1e5));
await page.fill('input[type=password]', 'password1');
await page.click('button[type=submit]');
await page.waitForSelector('.toolbar');
await page.waitForTimeout(800);
await page.keyboard.press('Escape');
await page.click('.tool:has-text("Fish")', { force: true });
await page.waitForSelector('.pond');
await page.waitForTimeout(400);
await shot('n1-pond');

// React to the bite from inside the page (headless screenshots are slower than a player).
await page.evaluate(() => {
  new MutationObserver(() => {
    const w = document.querySelector('.pond-water');
    if (document.querySelector('.pond-bang') && w && !w.dataset.hooked) {
      w.dataset.hooked = '1';
      setTimeout(() => w.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })), 150);
    }
    if (!document.querySelector('.pond-bang') && w) delete w.dataset.hooked;
  }).observe(document.body, { childList: true, subtree: true });
});
let caught = 0;
for (let round = 0; round < 3; round++) {
  await page.click('.pond-bottom .btn', { force: true });
  await page.waitForTimeout(700);
  if (round === 0) await shot('n2-cast');
  // Wait for the bite, then hook it.
  await page.waitForFunction(() => document.querySelector('.pond-meter')?.style.display === 'flex', null, { timeout: 15000 });
  // Reel: a tiny in-page bot holds the button while the fish is above the bar's middle.
  const start = Date.now();
  await page.evaluate(() => {
    const step = () => {
      const m = document.querySelector('.pond-meter');
      if (!m || m.style.display === 'none') return window.dispatchEvent(new PointerEvent('pointerup'));
      const f = document.querySelector('.reel-fish').getBoundingClientRect();
      const b = document.querySelector('.reel-bar').getBoundingClientRect();
      window.dispatchEvent(new PointerEvent(f.top + f.height / 2 < b.top + b.height / 2 ? 'pointerdown' : 'pointerup'));
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });
  await page.waitForTimeout(1200);
  if (round === 0) await shot('n4-reel');
  await page.waitForFunction(() => document.querySelector('.pond-meter')?.style.display === 'none', null, { timeout: 25000 });
  await page.mouse.up();
  console.log('round', round, 'reel ms', Date.now() - start, 'bubble:', await page.locator('.pond .k-bubble').textContent());
  await page.waitForTimeout(700);
  if (await page.locator('.catch-card').count()) {
    caught++;
    await shot(`n5-catch-${round}`);
    await page.click('.catch-card .btn', { force: true });
    await page.waitForTimeout(300);
  }
}
await page.click('.pond-top .btn', { force: true });
await page.waitForTimeout(500);
await shot('n6-journal');
await page.keyboard.press('Escape');
await page.click('.pond-top .close', { force: true }).catch(() => {});
await page.waitForTimeout(300);
const state = await page.evaluate(() => ({ fish: window.__farm.store.state.stats.fish ?? 0, nature: window.__farm.store.state.nature }));
console.log('caught dialogs:', caught, 'stats.fish:', state.fish, 'casts:', state.nature?.casts);
console.log(errors.length ? `ERRORS:\n${errors.join('\n')}` : 'No errors');
await browser.close();
