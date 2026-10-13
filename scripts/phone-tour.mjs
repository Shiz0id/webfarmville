// Loads a saved farm (see balance-sim.ts SAVE=) into the browser-only build on a
// phone and screenshots every main screen, for playtesting farms at any stage.
// Usage: node scripts/phone-tour.mjs <save.json> <screenshot-dir> [WxH] [url]
import { readFileSync } from 'node:fs';
import { chromium } from 'playwright';

const [savePath, out = '.', size = '390x844', url = 'http://localhost:8099/webfarmville/?debug&hour=12'] = process.argv.slice(2);
const [w, h] = size.split('x').map(Number);
const save = readFileSync(savePath, 'utf8');
const tag = savePath.replace(/.*\//, '').replace(/\.json$/, '');
const browser = await chromium.launch();
const touch = Math.max(w, h) < 1250;
const ctx = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: touch, isMobile: touch, deviceScaleFactor: touch ? 2 : 1 });
await ctx.addInitScript((s) => {
  if (!sessionStorage.getItem('toured')) {
    localStorage.setItem('meadowbrook.save', s);
    sessionStorage.setItem('toured', '1');
  }
}, save);
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
let n = 0;
const shot = async (name) => page.screenshot({ path: `${out}/tour-${tag}-${String(++n).padStart(2, '0')}-${name}.png` });
const wait = (ms) => page.waitForTimeout(ms);
const close = async () => {
  await page.keyboard.press('Escape');
  await wait(350);
};

await page.goto(url);
await page.waitForSelector('.toolbar', { state: 'attached', timeout: 30000 });
await wait(2500);
await shot('arrive');
// Whatever greets you (daily bonus, level-ups, letters) gets its own picture.
for (let i = 0; i < 4 && (await page.locator('.modal-back').count()); i++) {
  await shot(`greeting${i + 1}`);
  await close();
}
await page.evaluate(() => document.querySelector('.villager-say')?.click());
await wait(400);
await shot('farm');

const corner = async (label) => {
  let b = page.locator(`.corner .round-btn[aria-label="${label}"]`);
  if (!(await b.count()) || !(await b.isVisible())) {
    await page.locator('.menu-btn').click({ force: true }).catch(() => {});
    await wait(400);
    b = page.locator(`.drawer-grid .round-btn[aria-label="${label}"]`);
  }
  await b.first().click({ force: true });
  await wait(700);
};
const panel = async (label, name) => {
  await corner(label);
  await shot(name);
  await close();
};

await page.locator('.menu-btn').click({ force: true }).catch(() => {});
await wait(500);
await shot('menu');
await close();
await page.locator('.more-tools').click({ force: true }).catch(() => {});
await wait(400);
await shot('tray');
await page.locator('.more-tools').click({ force: true }).catch(() => {});
await wait(300);

for (const [label, name] of [['Quests', 'quests'], ['Orders', 'orders'], ['Barn', 'barn'], ['Decor', 'decor'], ['Neighbors', 'neighbors'], ['Collections', 'collections'], ['Farm', 'farmhouse']])
  await panel(label, name).catch((e) => errors.push(`${label}: ${e.message.split('\n')[0]}`));
await page.locator('.tool.shop').click({ force: true });
await wait(600);
await shot('market');
await close();

const st = await page.evaluate(() => {
  const s = window.__farm.store.state;
  return { level: s.level, coins: s.coins, objects: Object.keys(s.objects).length };
});
console.log(`${tag}: level ${st.level}, ${st.coins} coins, ${st.objects} objects`);
console.log(errors.length ? 'Errors:\n' + errors.join('\n') : 'No errors');
await browser.close();
