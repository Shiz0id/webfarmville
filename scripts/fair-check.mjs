// Play-tests the County Fair through the real server: the contest tent,
// entering produce and a flower with the judging reveal, and the Prize Booth.
// The fair only runs on weekends, so on a weekday start the server with
// FARM_ALL_EVENTS=1.
// Usage: node scripts/fair-check.mjs <screenshot-dir> [url]
import { chromium } from 'playwright';
import { DatabaseSync } from 'node:sqlite';

const out = process.argv[2] ?? '.';
const url = process.argv[3] ?? 'http://localhost:3001/?debug&hour=12';
const name = 'fair' + Math.floor(Math.random() * 1e5);
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
st.level = 8;
st.inventory = { ...st.inventory, wheat: 5, corn: 3, pumpkin: 2, apple: 4, tomato_soup: 1, veggie_salad: 2, roses_gold: 1, tulips_orange: 2, carp: 1, bluegill: 3 };
db.prepare('UPDATE farms SET state = ?, rev = rev + 1 WHERE user_id = ?').run(JSON.stringify(st), row.user_id);
await page.reload();
await page.waitForSelector('.toolbar');
await page.waitForTimeout(800);
await page.keyboard.press('Escape');

// The button pulses while the fair is open, so it never sits still.
await page.click('button[aria-label="Fair"]', { force: true });
await page.waitForSelector('.fa-card');
await page.waitForTimeout(300);
await shot('f1-tent');
await page.locator('.fa-card', { hasText: 'Prize Produce' }).locator('button').click();
await page.waitForSelector('.fa-pick-item');
await shot('f2-pick');
await page.locator('.fa-pick-item').first().click();
await page.waitForTimeout(1500);
await shot('f3-judging');
await page.waitForSelector('.fa-prize-reveal button', { timeout: 10000 });
await page.waitForTimeout(400);
await shot('f4-result');
await page.locator('.fa-prize-reveal button').click();
await page.locator('.fa-card', { hasText: 'Flower Show' }).locator('button').click();
await page.locator('.fa-pick-item', { hasText: 'Golden Roses' }).click();
await page.waitForSelector('.fa-prize-reveal button', { timeout: 10000 });
await page.locator('.fa-prize-reveal button').click();
await page.waitForTimeout(400);
await shot('f5-tent-after');
await page.locator('.modal-tabs button', { hasText: 'Prize Booth' }).click();
await page.waitForTimeout(300);
await shot('f6-booth');
const fair = await page.evaluate(() => window.__farm.store.state.fair);
console.log('fair', JSON.stringify({ tickets: fair.tickets, places: Object.fromEntries(Object.entries(fair.entries).map(([k, e]) => [k, e.place])) }));
if (await page.locator('.fa-prize button:not([disabled])').count()) {
  await page.locator('.fa-prize button:not([disabled])').first().click();
  await page.waitForTimeout(500);
  console.log('bought', JSON.stringify(await page.evaluate(() => window.__farm.store.state.inventory.ribbon_board)));
}
console.log(errors.length ? errors : 'No errors');
await browser.close();
