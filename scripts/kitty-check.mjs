// Sets up a Kitty Corner (via the real server), then screenshots cats visiting,
// petting, the panel and an adopted cat roaming.
// Usage: node scripts/kitty-check.mjs <screenshot-dir> [url]
// Needs the server's SQLite file at data/farm.db to give the test farm coins.
import { chromium } from 'playwright';
import { DatabaseSync } from 'node:sqlite';

const out = process.argv[2] ?? '.';
const url = process.argv[3] ?? 'http://localhost:3001/?debug&hour=12';
const name = 'kitty' + Math.floor(Math.random() * 1e5);
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

// Give the farm coins and levels, then reload.
const db = new DatabaseSync('data/farm.db');
const row = db.prepare('SELECT f.user_id, f.state FROM farms f JOIN users u ON u.id = f.user_id WHERE u.username = ?').get(name);
const st = JSON.parse(row.state);
st.coins = 20000;
st.level = 12;
st.xp = 60000;
db.prepare('UPDATE farms SET state = ?, rev = rev + 1 WHERE user_id = ?').run(JSON.stringify(st), row.user_id);
await page.reload();
await page.waitForSelector('.toolbar');
await page.waitForTimeout(800);

// Buy a bowl and goodies on free tiles near the middle, then feed the kitties.
const placed = await page.evaluate(() => {
  const { store } = window.__farm;
  const goods = ['kitty_bowl', 'yarn_ball', 'cardboard_box', 'cat_cushion', 'cat_bed', 'paper_bag', 'mouse_toy', 'fish_pillow', 'kotatsu', 'sunny_mat', 'teaser_wand', 'scratch_post'];
  const n = store.state.size;
  const used = new Set();
  for (const o of Object.values(store.state.objects)) used.add(`${o.x},${o.y}`);
  let i = 0;
  const done = [];
  for (let y = 1; y < n - 1 && i < goods.length; y += 1)
    for (let x = 1; x < n - 1 && i < goods.length; x += 2)
      if (!used.has(`${x},${y}`) && store.dispatch({ type: 'buy', def: goods[i], x, y })) done.push([goods[i++], x, y]);
  store.dispatch({ type: 'feedKitties', food: 'tuna' });
  return done;
});
console.log('placed', placed.length);
await page.waitForTimeout(3500);
const vis = await page.evaluate(() => Object.keys(window.__farm.store.state.kitty?.food ?? {}).length);
console.log('food set', vis > 0);
await page.keyboard.press('Escape');
for (let i = 0; i < 3; i++) await page.evaluate(() => window.__farm.scene().zoomBy(1.25));
await page.waitForTimeout(800);
await shot('k1-visitors');
await page.click('.round-btn:has-text("Kitties")', { force: true });
await page.waitForTimeout(500);
await shot('k2-panel');
await page.keyboard.press('Escape');

// Adopt the first visitor (hearts granted through the DB), then watch it roam.
await page.waitForTimeout(1500);
await page.evaluate(() => window.__farm.store.flush?.());
await page.waitForTimeout(1500);
const row2 = db.prepare('SELECT state FROM farms WHERE user_id = ?').get(row.user_id);
const st2 = JSON.parse(row2.state);
st2.kitty.hearts = { ginger: 10, mochi: 10, pepper: 12 };
st2.kitty.adopted = ['snowball'];
db.prepare('UPDATE farms SET state = ?, rev = rev + 1 WHERE user_id = ?').run(JSON.stringify(st2), row.user_id);
await page.reload();
await page.waitForSelector('.toolbar');
await page.waitForTimeout(1500);
await page.keyboard.press('Escape');
await page.click('.round-btn:has-text("Kitties")', { force: true });
await page.waitForTimeout(400);
await page.click('.kitty-card button:has-text("Adopt")', { force: true }).catch(() => console.log('no adopt button'));
await page.waitForTimeout(900);
await shot('k3-adopted');
await page.keyboard.press('Escape');
await page.keyboard.press('Escape');
for (let i = 0; i < 3; i++) await page.evaluate(() => window.__farm.scene().zoomBy(1.25));
await page.waitForTimeout(6000);
await shot('k4-roaming');
console.log('adopted', await page.evaluate(() => window.__farm.store.state.kitty?.adopted));
console.log(errors.length ? `ERRORS:\n${errors.join('\n')}` : 'No errors');
await browser.close();
