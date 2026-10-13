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
// Phones and tablets (up to a 1180×820 iPad on its side) are touch screens; 1280+ is a desktop.
const touch = Math.max(w, h) < 1250;
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
st.inventory = { ...st.inventory, strawberry: 14, wheat: 9, egg: 6, milk: 3, tomato: 9, carrot: 5, flour: 4, butter: 2, mystery_gift: 1 };
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
// On phones some tools wait in the More tray and some buttons in the Farm Menu.
const round = (label) => async () => {
  const b = page.locator(`.round-btn[aria-label="${label}"]`).first();
  if (!(await b.isVisible())) {
    await page.locator('.menu-btn').click({ force: true });
    await page.waitForTimeout(400);
  }
  await b.click({ force: true });
};
const tool = (label) => async () => {
  const b = page.locator('.tool', { hasText: label }).first();
  if (!(await b.isVisible())) {
    await page.locator('.more-tools').click({ force: true });
    await page.waitForTimeout(300);
  }
  await b.click({ force: true });
};

await panel('02-market', tool('Market'));
await panel('03-quests', round('Quests'));
await panel('04-barn', round('Barn'));
await panel('05-orders', round('Orders'));
await panel('06-farmhouse', round('Farm'));
await panel('07-collections', round('Collections'));
await panel('08-seeds', tool('Seeds'));
// Every other corner panel (features add their own).
const extras = await page.evaluate(() =>
  [...document.querySelectorAll('.round-btn[aria-label]')]
    .map((b) => b.getAttribute('aria-label'))
    .filter((l) => !['Quests', 'Barn', 'Orders', 'Farm', 'Collections', 'Music', 'Menu', 'Zoom in', 'Zoom out'].includes(l)),
);
for (const label of extras) await panel(`08x-${label.toLowerCase().replace(/\W+/g, '-')}`, round(label)).catch((e) => console.log('panel', label, e.message.split('\n')[0]));
await panel('09-cook', tool('Cook'));

// A cooking mini-game and the fishing pond (full-screen scenes of their own).
await tool('Cook')();
await page.waitForSelector('.modal');
await page.waitForTimeout(400);
const cookBtn = page.locator('.recipe-card button:not([disabled])').first();
if (await cookBtn.count()) {
  await cookBtn.click({ force: true });
  await page.waitForTimeout(1200);
  await shot('09d-minigame');
  for (let i = 0; i < 4 && (await page.locator('.modal, .kitchen-game, .k-arena').count()); i++) {
    await page.keyboard.press('Escape');
    await page.waitForTimeout(250);
  }
} else await page.keyboard.press('Escape');
await page.reload();
await page.waitForSelector('.toolbar');
await page.waitForTimeout(900);
await page.keyboard.press('Escape');
await tool('Fish')();
await page.waitForSelector('.pond').catch(() => {});
await page.waitForTimeout(900);
await shot('09e-pond');
await page.locator('.pond-top .close').click({ force: true }).catch(() => {});
await page.reload();
await page.waitForSelector('.toolbar');
await page.waitForTimeout(900);
await page.keyboard.press('Escape');

// Unwrap the mystery gift from the barn.
await round('Barn')();
await page.waitForSelector('.modal');
await page.locator('.gift-row .btn').click({ force: true }).catch(() => {});
await page.waitForTimeout(900);
await shot('09f-unwrap');
for (let i = 0; i < 3; i++) await page.keyboard.press('Escape');

// Visit a neighbor (the visit banner and the gift picker).
await round('Neighbors')();
await page.waitForSelector('.modal');
await page.locator('.modal .btn', { hasText: 'Visit' }).first().click({ force: true });
await page.waitForSelector('.visit-banner', { state: 'visible' }).catch(() => {});
await page.waitForTimeout(1500);
await shot('09g-visit');
await page.locator('.visit-banner .btn', { hasText: 'Gift' }).click({ force: true }).catch(() => {});
await page.waitForTimeout(500);
await shot('09h-gift-picker');
await page.keyboard.press('Escape');
await page.locator('.visit-banner .btn', { hasText: 'Go home' }).click({ force: true }).catch(() => {});
await page.waitForTimeout(1200);

// The phone's tool tray and Farm Menu.
if (await page.locator('.more-tools').isVisible()) {
  await page.locator('.more-tools').click();
  await page.waitForTimeout(400);
  await shot('09b-tray');
  await page.locator('.more-tools').click();
  await page.locator('.menu-btn').click({ force: true });
  await page.waitForTimeout(500);
  await shot('09c-menu');
  await page.mouse.click(w / 2, 40);
  await page.waitForTimeout(400);
}

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

// Level up by plowing one plot just short of the next level.
{
  const r = db.prepare('SELECT f.state FROM farms f WHERE f.user_id = ?').get(row.user_id);
  const s2 = JSON.parse(r.state);
  s2.xp = xpFor(13) - 1;
  db.prepare('UPDATE farms SET state = ?, rev = rev + 1 WHERE user_id = ?').run(JSON.stringify(s2), row.user_id);
  await page.reload();
  await page.waitForSelector('.toolbar');
  await page.waitForTimeout(900);
  await page.keyboard.press('Escape');
  await tool('Plow')();
  for (const [x, y] of [[11, 11], [12, 12], [10, 12], [12, 10], [13, 13]]) {
    const p = await page.evaluate(([x, y]) => window.__farm.scene().tileToScreen(x, y), [x, y]);
    await page.mouse.click(p.x, p.y);
    await page.waitForTimeout(300);
    if (await page.locator('.levelup').isVisible()) break;
  }
  await page.waitForTimeout(700);
  await shot('12-levelup');
}

console.log(errors.length ? 'Errors:\n' + errors.join('\n') : 'No errors');
await browser.close();
