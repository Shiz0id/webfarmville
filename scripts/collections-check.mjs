// Play-tests collections through the real server: a collectible popping out of
// a harvest, the Collectibles tab, swapping spares for a missing piece and
// turning in a full set.
// Usage: npx tsx scripts/collections-check.mjs <screenshot-dir> [url]
// (run with tsx so it can use the shared rules to pick a lucky seed)
import { chromium } from 'playwright';
import { DatabaseSync } from 'node:sqlite';
import { applyAction, xpForLevel } from '@farm/shared';

const out = process.argv[2] ?? '.';
const url = process.argv[3] ?? 'http://localhost:3001/?debug&hour=12';
const name = 'collect' + Math.floor(Math.random() * 1e5);
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
st.level = 6;
st.xp = xpForLevel(6) + 5;
st.collections = {
  have: {
    // Berry Basket is complete; Orchard has three spares to swap; Garden Party is missing its rarest piece.
    col_gingham_bow: 2, col_jam_jar: 1, col_pie_tin: 1, col_berry_thimble: 1, col_picnic_napkin: 1,
    col_acorn_cap: 3, col_pressed_leaf: 2, col_blossom_pin: 1,
    col_seed_packet: 1, col_garden_glove: 1, col_ladybug_button: 2, col_tiny_trowel: 1,
  },
  traded: {},
};
for (const k of Object.keys(st.collections.have)) st.stats[`found:${k}`] = 1;
const now = Date.now() + 5000;
for (const o of Object.values(st.objects)) if (o.kind === 'plot' && o.crop) o.plantedAt = now - 120_000;
const plot = Object.values(st.objects).find((o) => o.kind === 'plot' && o.crop).id;
// Pick a seed whose next harvest turns up the missing Garden Party piece.
for (let seed = 1; seed < 200000; seed++) {
  const r = applyAction({ ...st, seed }, { type: 'harvest', id: plot }, { now });
  if (r.events.some((e) => e.type === 'collectible' && e.item === 'col_snail_shell')) {
    st.seed = seed;
    break;
  }
}
db.prepare('UPDATE farms SET state = ?, rev = rev + 1 WHERE user_id = ?').run(JSON.stringify(st), row.user_id);
await page.reload();
await page.waitForSelector('.toolbar');
await page.waitForTimeout(800);
await page.keyboard.press('Escape');
await page.waitForTimeout(Math.max(0, now - Date.now()));

await page.evaluate((id) => window.__farm.store.dispatch({ type: 'harvest', id }), plot);
await page.waitForTimeout(450);
await shot('c1-found');
console.log('have', JSON.stringify(await page.evaluate(() => window.__farm.store.state.collections.have)));

await page.click('button[aria-label="Collections"]');
await page.waitForSelector('.cl-set');
await page.waitForTimeout(300);
await shot('c2-tab');
// Swap orchard spares for the Bird's Nest.
await page.locator('.cl-set', { hasText: 'Orchard Keepsakes' }).locator('.cl-slot', { hasText: '???' }).first().locator('button').click();
await page.waitForTimeout(1000);
await page.evaluate(() => [...document.querySelectorAll('.cl-set')].find((e) => e.textContent.includes('Orchard Keepsakes'))?.scrollIntoView());
await shot('c3-swapped');
// Turn in the Berry Basket.
await page.locator('.cl-set', { hasText: 'Berry Basket' }).locator('button', { hasText: 'Turn in' }).click({ force: true }); // it pulses, so never sits still
await page.waitForSelector('.catch-card');
await page.waitForTimeout(500);
await shot('c4-traded');
console.log('after', JSON.stringify(await page.evaluate(() => ({ c: window.__farm.store.state.collections, keepsake: window.__farm.store.state.inventory.jam_stand }))));
console.log(errors.length ? errors : 'No errors');
await browser.close();
