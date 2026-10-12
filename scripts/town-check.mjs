// Play-tests Town Projects through the real server: the board, donating,
// and finishing the Pond Bridge.
// Usage: node scripts/town-check.mjs <screenshot-dir> [url]
import { chromium } from 'playwright';
import { DatabaseSync } from 'node:sqlite';

const out = process.argv[2] ?? '.';
const url = process.argv[3] ?? 'http://localhost:3001/?debug&hour=12';
const name = 'town' + Math.floor(Math.random() * 1e5);
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
st.level = 4;
st.coins = 3000;
st.inventory = { ...st.inventory, wheat: 50, corn: 8, flour: 10 };
db.prepare('UPDATE farms SET state = ?, rev = rev + 1 WHERE user_id = ?').run(JSON.stringify(st), row.user_id);
await page.reload();
await page.waitForSelector('.toolbar');
await page.waitForTimeout(800);
await page.keyboard.press('Escape');

await page.click('button[aria-label="Town"]');
await page.waitForSelector('.tw-need');
await shot('t1-board');
for (const label of ['Wheat', 'Flour', 'Coins']) await page.locator('.tw-need', { hasText: label }).locator('button').click();
await page.waitForTimeout(400);
await shot('t2-donated');
// Finish it: the corn we're short of arrives in the barn.
await page.locator('.tw-need', { hasText: 'Corn' }).locator('button').click();
await page.waitForTimeout(500);
const left = await page.evaluate(() => window.__farm.store.state.town);
console.log('town', JSON.stringify(left));
await page.waitForTimeout(1500);
const row2 = db.prepare('SELECT state FROM farms WHERE user_id = ?').get(row.user_id);
const st2 = JSON.parse(row2.state);
st2.inventory.corn = 20;
db.prepare('UPDATE farms SET state = ?, rev = rev + 1 WHERE user_id = ?').run(JSON.stringify(st2), row.user_id);
await page.reload();
await page.waitForSelector('.toolbar');
await page.waitForTimeout(800);
await page.keyboard.press('Escape');
await page.click('button[aria-label="Town"]');
await page.waitForSelector('.tw-need');
await page.locator('.tw-need', { hasText: 'Corn' }).locator('button').click();
await page.waitForSelector('.catch-card');
await page.waitForTimeout(600);
await shot('t3-complete');
await page.locator('.catch-card button').click();
await page.waitForTimeout(400);
await shot('t4-next');
console.log('done', JSON.stringify(await page.evaluate(() => window.__farm.store.state.town)));
console.log(errors.length ? errors : 'No errors');
await browser.close();
