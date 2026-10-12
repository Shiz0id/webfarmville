// Visual check of the kitchen and its mini-games (screenshots each step).
// Usage: node scripts/cooking-check.mjs <screenshot-dir> [url]
// The client inventory is stocked locally for the walkthrough, so the server may
// reject the final cook; this script is about how the mini-games look and feel.
import { chromium } from 'playwright';

const out = process.argv[2] ?? '.';
const url = process.argv[3] ?? 'http://localhost:3001/?debug';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));

await page.goto(url);
await page.waitForSelector('.auth-card');
await page.fill('input[placeholder="Farmer name"]', 'chef' + Math.floor(Math.random() * 1e5));
await page.fill('input[type=password]', 'password1');
await page.click('button[type=submit]');
await page.waitForSelector('.toolbar');
await page.evaluate(() => {
  const st = window.__farm.store.state;
  st.level = 8;
  Object.assign(st.inventory, { tomato: 9, egg: 6, flour: 4, butter: 2, strawberry: 8, milk: 3, carrot: 5, corn: 4, potato: 4 });
});
await page.click('.tool:has-text("Cook")');
await page.waitForTimeout(600);
await page.screenshot({ path: `${out}/c1-kitchen.png` });

// Cook strawberry shortcake: crack, mix, heat, sprinkle.
await page.click('.recipe-card:has-text("Strawberry Shortcake") button');
const shots = ['c2-crack', 'c3-mix', 'c4-heat', 'c5-sprinkle'];
await page.waitForTimeout(1300);
for (const name of shots) {
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${out}/${name}.png` });
  // Play a little: click around the arena centre a few times.
  const box = await page.locator('.k-arena').boundingBox();
  for (let i = 0; i < 8; i++) {
    const stop = await page.$('.k-stop');
    if (stop) {
      await stop.click().catch(() => {});
      break;
    }
    await page.mouse.click(box.x + box.width / 2 + (i % 2 ? 60 : -60), box.y + box.height / 2);
    await page.waitForTimeout(250);
  }
  await page.waitForTimeout(6500);
}
await page.waitForSelector('.k-result', { timeout: 15000 }).catch(() => {});
await page.screenshot({ path: `${out}/c6-result.png` });
console.log(errors.length ? `ERRORS:\n${errors.join('\n')}` : 'No errors');
await browser.close();
