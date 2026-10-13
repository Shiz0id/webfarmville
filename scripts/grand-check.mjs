// Play-tests Grand Projects on the browser-only build: the board, funding a
// stage, placing the building site, watching it rise stage by stage, tapping a
// landmark to open its plans, the balloon's daily gift and the phone layout.
// Usage: node scripts/grand-check.mjs <save.json> <screenshot-dir> [url]
// (the save is any LocalSave, e.g. one written by `SAVE=... npx tsx scripts/balance-sim.ts`).
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';

const [savePath, out = '.', url = 'http://localhost:8099/webfarmville/?debug&hour=12&event=none&weather=clear'] = process.argv.slice(2);
const save = JSON.parse(readFileSync(savePath, 'utf8'));
// A rich late-game farm with nothing built yet and a barn full of what the projects need.
const st = save.state;
delete st.grand;
st.level = Math.max(st.level, 30);
st.coins = 20_000_000;
for (const id of ['grand_greenhouse', 'lighthouse_windmill', 'balloon_dock', 'botanical_conservatory']) delete st.inventory[id];
for (const o of Object.values(st.objects)) if (o.kind === 'deco' && o.def in { grand_greenhouse: 1, lighthouse_windmill: 1, balloon_dock: 1, botanical_conservatory: 1 }) delete st.objects[o.id];
// Everything any stage asks for (see shared/src/content/grand.ts).
const NEEDS = 'wheat flour sunflower cotton_cloth lavender honey yarn blueberry_muffin lavender_tea corn cornmeal bread butter cheese cornbread pancakes latte cotton wool quilt sweater grape_juice smoothie watermelon coffee marmalade cherry_jam truffle goat_cheese angora truffle_pasta cranberry_sauce';
for (const id of NEEDS.split(' ')) st.inventory[id] = Math.max(st.inventory[id] ?? 0, 300);
const json = JSON.stringify(save);

const browser = await chromium.launch();
const errors = [];
const step = (s) => console.log('•', s);
const expect = (ok, msg) => ok || errors.push(msg);

async function open(viewport, phone = false) {
  const ctx = await browser.newContext({ viewport, ...(phone ? { hasTouch: true, isMobile: true, deviceScaleFactor: 2 } : {}) });
  await ctx.addInitScript((s) => {
    if (!sessionStorage.getItem('loaded')) {
      localStorage.setItem('meadowbrook.save', s);
      sessionStorage.setItem('loaded', '1');
    }
  }, json);
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await page.goto(url);
  await page.waitForSelector('.toolbar', { state: 'attached', timeout: 60000 });
  await page.waitForTimeout(2000);
  while (await page.locator('.modal-back').count()) {
    await page.keyboard.press('Escape');
    await page.waitForTimeout(250);
  }
  await page.evaluate(() => document.querySelector('.villager-say button, .say-close')?.click());
  return { ctx, page };
}

/** Click Give buttons until the current stage is funded. */
async function fund(page) {
  const total = () => page.evaluate(() => Object.values(window.__farm.store.state.grand?.projects ?? {}).reduce((t, p) => t + p.stage, 0));
  const start = await total();
  for (let i = 0; i < 12 && (await total()) === start; i++) {
    const btn = page.locator('.gp-detail .tw-need button:not([disabled])').first();
    if (!(await btn.count())) return;
    await btn.click();
    await page.waitForTimeout(150);
  }
}

const stage = (page, id) => page.evaluate((id) => window.__farm.store.state.grand?.projects?.[id]?.stage ?? 0, id);
const closeModals = async (page) => {
  while (await page.locator('.modal-back').count()) {
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);
  }
};

/** Put a landmark from storage somewhere free (placing by hand is covered by the decor check). */
async function place(page, def) {
  return page.evaluate((def) => {
    const f = window.__farm;
    for (let y = 1; y < 30; y++) for (let x = 1; x < 30; x++) if (f.store.dispatch({ type: 'placeStored', def, x, y })) return { x, y };
    return null;
  }, def);
}

/** Centre the camera on a landmark and screenshot it. */
async function look(page, at, w, name) {
  await page.evaluate(
    ({ at, w }) => {
      const s = window.__farm.scene();
      const p = s.tileToWorld(at.x + w / 2, at.y + w / 2);
      s.cameras.main.setZoom(1.1).centerOn(p.x, p.y - 60);
    },
    { at, w },
  );
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${out}/${name}.png` });
}

// --- desktop: the whole Grand Greenhouse ---
{
  const { ctx, page } = await open({ width: 1280, height: 800 });
  await closeModals(page);
  await page.click('button[aria-label="Grand Projects"]');
  await page.waitForSelector('.gp-picks');
  expect((await page.locator('.gp-pick').count()) === 4, 'four landmarks on the board');
  await page.screenshot({ path: `${out}/grand-1-board.png` });
  step('board open');
  await fund(page);
  await page.waitForTimeout(700);
  expect((await stage(page, 'grand_greenhouse')) === 1, 'stage 1 funded');
  await page.waitForSelector('.catch-card');
  await page.screenshot({ path: `${out}/grand-2-site-ready.png` });
  await closeModals(page);
  const at = await place(page, 'grand_greenhouse');
  expect(!!at, 'placed the building site');
  step(`site placed at ${JSON.stringify(at)}`);
  await look(page, at, 4, 'grand-3-site');
  for (const n of [2, 3, 4]) {
    // Tapping the landmark opens its plans.
    const pos = await page.evaluate((at) => window.__farm.scene().tileToScreen(at.x + 2, at.y + 2), at);
    await page.mouse.click(pos.x, pos.y);
    await page.waitForSelector('.gp-detail', { timeout: 5000 }).catch(() => errors.push(`tapping the landmark (stage ${n - 1}) didn't open its plans`));
    await fund(page);
    await page.waitForTimeout(600);
    expect((await stage(page, 'grand_greenhouse')) === n, `stage ${n} funded`);
    if (n === 4) await page.screenshot({ path: `${out}/grand-5-opening.png` });
    await closeModals(page);
    await look(page, at, 4, `grand-4-stage${n}`);
  }
  const charm = await page.evaluate(() => window.__farm.store.state.grand.projects.grand_greenhouse);
  step(`greenhouse finished: ${JSON.stringify(charm)}`);

  // The balloon dock, then its daily gift.
  await closeModals(page);
  await page.click('button[aria-label="Grand Projects"]');
  await page.locator('.gp-pick', { hasText: 'Balloon' }).click();
  await fund(page);
  await page.waitForTimeout(500);
  await closeModals(page);
  const dock = await place(page, 'balloon_dock');
  for (let n = 2; n <= 4; n++) {
    await closeModals(page);
    await page.click('button[aria-label="Grand Projects"]');
    await page.locator('.gp-pick', { hasText: 'Balloon' }).click();
    await fund(page);
    await page.waitForTimeout(500);
    await closeModals(page);
  }
  expect((await stage(page, 'balloon_dock')) === 4, 'balloon dock finished');
  await look(page, dock, 3, 'grand-6-balloon-ready');
  const gifts0 = await page.evaluate(() => window.__farm.store.state.inventory.mystery_gift ?? 0);
  const pos = await page.evaluate((at) => window.__farm.scene().tileToScreen(at.x + 1.5, at.y + 1.5), dock);
  await page.mouse.click(pos.x, pos.y);
  await page.waitForTimeout(800);
  const gifts1 = await page.evaluate(() => window.__farm.store.state.inventory.mystery_gift ?? 0);
  expect(gifts1 > gifts0, 'the balloon gift arrived');
  await page.screenshot({ path: `${out}/grand-7-balloon-gift.png` });
  step(`balloon gift: mystery gifts ${gifts0} → ${gifts1}`);

  // The Grand decor shelf.
  await page.evaluate(() => document.querySelector('.tool.decor, button[aria-label="Decor"]')?.click());
  await page.waitForSelector('.decor-cat', { timeout: 5000 }).catch(() => errors.push('decor page did not open'));
  await page.locator('.decor-cat', { hasText: 'Grand' }).click();
  await page.waitForTimeout(500);
  const golden = await page.locator('.decor-results .card').count();
  expect(golden >= 12, `grand shelf shows ${golden} cards`);
  await page.screenshot({ path: `${out}/grand-8-decor-shelf.png` });
  step(`grand shelf: ${golden} cards`);
  await ctx.close();
}

// --- phone: the board ---
{
  const { ctx, page } = await open({ width: 390, height: 844 }, true);
  await closeModals(page);
  await page.locator('.menu-btn').click({ force: true });
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${out}/grand-9-phone-menu.png` });
  await page.click('.drawer button[aria-label="Grand Projects"]');
  await page.waitForSelector('.gp-picks');
  await page.screenshot({ path: `${out}/grand-10-phone.png` });
  step('phone board');
  await ctx.close();
}

await browser.close();
if (errors.length) {
  console.log('ERRORS:\n' + errors.join('\n'));
  process.exit(1);
}
console.log('No errors');
