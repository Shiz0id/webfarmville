// Play-tests lonely animals through the real server: a lost animal wandering
// onto the farm, its panel, adopting it (it settles in with its name), and on
// a second farmer, walking one to a villager's home instead.
// Usage: node scripts/lonely-check.mjs <screenshot-dir> [url]
import { chromium } from 'playwright';
import { DatabaseSync } from 'node:sqlite';

const out = process.argv[2] ?? '.';
const url = process.argv[3] ?? 'http://localhost:3001/?debug&hour=12';
const browser = await chromium.launch();
const errors = [];
const db = new DatabaseSync('data/farm.db');

async function farmer(tag) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  const name = tag + Math.floor(Math.random() * 1e5);
  await page.goto(url);
  await page.waitForSelector('.auth-card');
  await page.fill('input[placeholder="Farmer name"]', name);
  await page.fill('input[type=password]', 'password1');
  await page.click('button[type=submit]');
  await page.waitForSelector('.toolbar');
  await page.waitForTimeout(500);
  const row = db.prepare('SELECT f.user_id, f.state FROM farms f JOIN users u ON u.id = f.user_id WHERE u.username = ?').get(name);
  const st = JSON.parse(row.state);
  st.level = 5;
  st.xp = Math.round(25 * 4 + 12 * 4 ** 1.85) + 5; // just into level 5
  db.prepare('UPDATE farms SET state = ?, rev = rev + 1 WHERE user_id = ?').run(JSON.stringify(st), row.user_id);
  await page.reload();
  await page.waitForSelector('.toolbar');
  await page.waitForTimeout(800);
  await page.keyboard.press('Escape');
  return page;
}

/** Invite today's visitor now (the game does this by itself after a little while). */
async function arrive(page) {
  await page.evaluate(() => window.__farm.store.dispatch({ type: 'lonelyArrive' }));
  await page.waitForTimeout(2500);
}

/** Tap the wanderer: find its sprite in the scene and click it on screen. */
async function tapWanderer(page) {
  const pos = await page.evaluate(() => {
    const sc = window.__farm.scene();
    const l = window.__farm.store.state.lonely;
    const img = sc.children.list.find((c) => c.type === 'Image' && c.texture?.key === `animal:${l.animal}` && c.input);
    const cam = sc.cameras.main;
    return { x: (img.x - cam.worldView.x) * cam.zoom, y: (img.y - 20 - cam.worldView.y) * cam.zoom };
  });
  await page.mouse.click(pos.x, pos.y);
  await page.waitForSelector('.lo-choices', { timeout: 5000 });
  await page.waitForTimeout(300);
}

const a = await farmer('lonelyA');
await arrive(a);
await a.screenshot({ path: `${out}/l1-wanderer.png` });
await tapWanderer(a);
await a.screenshot({ path: `${out}/l2-panel.png` });
await a.locator('.lo-choice button', { hasText: 'Adopt' }).click();
await a.waitForTimeout(800);
await a.screenshot({ path: `${out}/l3-adopted.png` });
const adopted = await a.evaluate(() => {
  const s = window.__farm.store.state;
  return { lonely: s.lonely, pet: Object.values(s.objects).find((o) => o.nick) };
});
console.log('adopted', JSON.stringify(adopted));

const b = await farmer('lonelyB');
await arrive(b);
await tapWanderer(b);
await b.locator('.lo-choice button', { hasText: 'Find a home' }).click();
await b.waitForSelector('.fr-say-bubble');
await b.waitForTimeout(600);
await b.screenshot({ path: `${out}/l4-rehomed.png` });
console.log('rehomed', JSON.stringify(await b.evaluate(() => ({ lonely: window.__farm.store.state.lonely, friends: window.__farm.store.state.friends.points }))));
console.log(errors.length ? errors : 'No errors');
await browser.close();
