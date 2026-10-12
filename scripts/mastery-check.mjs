// Play-tests crop mastery through the real server: a harvest that earns the
// third star (celebration card and Mastery Sign), the seed shop showing stars
// and discounted prices, and the Crop Mastery tab in the Collections panel.
// Usage: node scripts/mastery-check.mjs <screenshot-dir> [url]
import { chromium } from 'playwright';
import { DatabaseSync } from 'node:sqlite';

const out = process.argv[2] ?? '.';
const url = process.argv[3] ?? 'http://localhost:3001/?debug&hour=12';
const name = 'master' + Math.floor(Math.random() * 1e5);
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
st.level = 9;
st.coins = 5000;
// Strawberries are one harvest from their third star; wheat and carrots have one and two.
st.stats = { ...st.stats, 'harvest:strawberry': 149, 'harvest:wheat': 33, 'harvest:carrot': 50, 'harvest:tomato': 6, harvest: 238 };
st.mastery = { stars: { strawberry: 2, wheat: 1, carrot: 2 } };
for (const o of Object.values(st.objects)) if (o.kind === 'plot' && o.crop) o.plantedAt = Date.now() - 120_000;
db.prepare('UPDATE farms SET state = ?, rev = rev + 1 WHERE user_id = ?').run(JSON.stringify(st), row.user_id);
await page.reload();
await page.waitForSelector('.toolbar');
await page.waitForTimeout(800);
await page.keyboard.press('Escape');

// Harvest one strawberry plot: the third star.
const plot = await page.evaluate(() => Object.values(window.__farm.store.state.objects).find((o) => o.kind === 'plot' && o.crop === 'strawberry').id);
await page.evaluate((id) => window.__farm.store.dispatch({ type: 'harvest', id }), plot);
await page.waitForSelector('.catch-card', { timeout: 5000 });
await page.waitForTimeout(600);
await shot('m1-mastered');
console.log('mastery', JSON.stringify(await page.evaluate(() => window.__farm.store.state.mastery)));
console.log('sign in barn', await page.evaluate(() => window.__farm.store.state.inventory.mastery_strawberry));
await page.locator('.catch-card button').click();

// The seed shop shows stars and the discounted price.
await page.click('button:has-text("Market")');
await page.waitForSelector('.card');
await page.waitForTimeout(300);
await shot('m2-seeds');
await page.keyboard.press('Escape');

// Collections -> Crop Mastery.
await page.click('button[aria-label="Collections"]');
await page.locator('.modal-tabs button', { hasText: 'Crop Mastery' }).click();
await page.waitForSelector('.ms-card');
await page.waitForTimeout(300);
await shot('m3-tab');

// Hover tooltip on a mastered crop: replant and look.
await page.keyboard.press('Escape');
await page.evaluate((id) => window.__farm.store.dispatch({ type: 'plant', id, crop: 'strawberry' }), plot);
console.log('coins after planting (discounted 9)', await page.evaluate(() => window.__farm.store.state.coins));
console.log(errors.length ? errors : 'No errors');
await browser.close();
