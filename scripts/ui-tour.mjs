// Screenshot tour of the interface kit: the HUD, the main panels, a toast and
// a tooltip, at any screen size. Used for the UI polish pass and to check the
// phone and tablet layouts.
// Usage: node scripts/ui-tour.mjs <screenshot-dir> [WxH] [url]
//   e.g. node scripts/ui-tour.mjs shots 390x844   (a phone)
import { chromium } from 'playwright';
import { DatabaseSync } from 'node:sqlite';

const out = process.argv[2] ?? '.';
const [w, h] = (process.argv[3] ?? '1280x800').split('x').map(Number);
const url = process.argv[4] ?? 'http://localhost:3001/?debug&hour=12';
const touch = w < 900;
const browser = await chromium.launch();
const errors = [];
const db = new DatabaseSync('data/farm.db');
const xpFor = (n) => Math.round(25 * (n - 1) + 12 * (n - 1) ** 1.85);

const page = await browser.newPage({ viewport: { width: w, height: h }, hasTouch: touch, isMobile: touch, deviceScaleFactor: touch ? 2 : 1 });
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
const tag = `${w}x${h}`;
const shot = (name) => page.screenshot({ path: `${out}/${tag}-${name}.png` });
const name = 'tour' + Math.floor(Math.random() * 1e5);

await page.goto(url);
await page.waitForSelector('.auth-card');
await shot('00-auth');
await page.fill('input[placeholder="Farmer name"]', name);
await page.fill('input[type=password]', 'password1');
await page.click('button[type=submit]');
await page.waitForSelector('.toolbar');

const row = db.prepare('SELECT f.user_id, f.state FROM farms f JOIN users u ON u.id = f.user_id WHERE u.username = ?').get(name);
const st = JSON.parse(row.state);
st.level = 12;
st.xp = xpFor(12) + 40;
st.coins = 12500;
st.inventory = { ...st.inventory, strawberry: 14, wheat: 9, egg: 6, milk: 3, mystery_gift: 1 };
db.prepare('UPDATE farms SET state = ?, rev = rev + 1 WHERE user_id = ?').run(JSON.stringify(st), row.user_id);
await page.reload();
await page.waitForSelector('.toolbar');
await page.waitForTimeout(1200);
await page.keyboard.press('Escape');
await page.waitForTimeout(300);
await shot('01-farm');

async function panel(file, open) {
  await open();
  await page.waitForSelector('.modal');
  await page.waitForTimeout(450);
  await shot(file);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);
}
const round = (label) => () => page.locator(`.round-btn[aria-label="${label}"]`).first().click({ force: true });
const tool = (label) => () => page.locator('.tool', { hasText: label }).first().click({ force: true });

await panel('02-market', tool('Market'));
await panel('03-quests', round('Quests'));
await panel('04-barn', round('Barn'));
await panel('05-orders', round('Orders'));
await panel('06-farmhouse', round('Farm'));
await panel('07-collections', round('Collections'));
await panel('08-seeds', tool('Seeds'));
await panel('09-cook', tool('Cook'));

// A toast and a mode hint.
await tool('Plow')();
await page.waitForTimeout(250);
await shot('10-toast');
await page.keyboard.press('Escape');

// A tooltip over the chicken coop area (whatever is under the middle of the screen).
if (!touch) {
  for (const [x, y] of [[0.5, 0.5], [0.42, 0.45], [0.58, 0.55], [0.35, 0.6]]) {
    await page.mouse.move(w * x, h * y);
    await page.waitForTimeout(250);
    if (await page.locator('.tooltip').isVisible()) break;
  }
  await shot('11-tooltip');
}

console.log(errors.length ? 'Errors:\n' + errors.join('\n') : 'No errors');
await browser.close();
