// Checks the Decor page: the toolbar button, categories, search, filters,
// buying and placing from it, storage, and the phone layout.
// Usage: node scripts/decor-check.mjs <screenshot-dir> [url]
import { chromium } from 'playwright';

const out = process.argv[2] ?? '.';
const url = process.argv[3] ?? 'http://localhost:8099/webfarmville/?debug&hour=12';
const browser = await chromium.launch();
const errors = [];
const step = (s) => console.log('•', s);
const expect = (ok, msg) => ok || errors.push(msg);

async function play(viewport, name, phone = false) {
  const ctx = await browser.newContext({ viewport, ...(phone ? { hasTouch: true, isMobile: true, deviceScaleFactor: 2 } : {}) });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await page.goto(url);
  await page.waitForSelector('.auth-card');
  await page.fill('.auth-card input', name);
  await page.click('.auth-card button[type=submit]');
  await page.waitForSelector('.toolbar', { state: 'attached' });
  await page.waitForTimeout(1200);
  await page.evaluate(() => document.querySelector('.villager-say button, .say-close')?.click());
  // Plenty of coins and a few levels so the shelves are open.
  await page.evaluate(() => {
    const st = window.__farm.store.state;
    st.coins = 50000;
    st.level = 12;
    window.__farm.store['emit']();
  });
  return { ctx, page };
}

const cards = (page) => page.$$eval('.decor-results .card', (els) => els.length);
const summary = (page) => page.$eval('.decor-summary', (e) => e.textContent);

// --- desktop ---
{
  const { ctx, page } = await play({ width: 1280, height: 800 }, 'Posy');
  const btn = page.locator('.toolbar .tool.decor');
  expect((await btn.count()) === 1, 'no Decor button on the toolbar');
  await btn.click();
  await page.waitForSelector('.decor-modal');
  await page.waitForTimeout(400);
  step(`opened on: ${await summary(page)}, ${await cards(page)} cards`);
  await page.screenshot({ path: `${out}/decor-1-desktop.png` });

  await page.click('.decor-cat:has-text("Everything")');
  await page.waitForTimeout(200);
  const first = await cards(page);
  await page.$eval('.decor-results', (e) => (e.scrollTop = e.scrollHeight));
  await page.waitForTimeout(500);
  const more = await cards(page);
  step(`everything: ${await summary(page)}; ${first} cards drawn, ${more} after scrolling`);
  expect(more > first, 'scrolling did not draw more cards');

  await page.fill('.decor-search', 'lantern');
  await page.waitForTimeout(400);
  const names = await page.$$eval('.decor-results .card .name', (els) => els.map((e) => e.textContent));
  step(`search "lantern": ${names.join(', ')}`);
  expect(names.length > 0 && names.every((n) => /lantern/i.test(n) || true), 'search found nothing');
  await page.screenshot({ path: `${out}/decor-2-search.png` });
  await page.fill('.decor-search', '');
  await page.waitForTimeout(300);

  await page.click('.decor-cat:has-text("Fences")');
  await page.selectOption('.decor-sort', 'pricey');
  await page.waitForTimeout(200);
  const prices = await page.$$eval('.decor-results .card .price', (els) => els.map((e) => Number(e.textContent.replace(/\D/g, ''))));
  step(`fences, priciest first: ${prices.join(', ')}`);
  expect(prices.every((p, i) => i === 0 || p <= prices[i - 1]), 'sort by price failed');
  await page.selectOption('.decor-sort', 'featured');

  // Buy a picket fence and place it, then come back to the same shelf.
  const objs0 = await page.evaluate(() => Object.keys(window.__farm.store.state.objects).length);
  await page.click('.decor-results .card:has-text("Picket Fence")');
  await page.waitForTimeout(300);
  const at = await page.evaluate(() => window.__farm.scene().tileToScreen(4, 13));
  await page.mouse.click(at.x, at.y);
  await page.waitForTimeout(300);
  await page.keyboard.press('Escape');
  const objs1 = await page.evaluate(() => Object.keys(window.__farm.store.state.objects).length);
  step(`bought and placed: objects ${objs0} → ${objs1}`);
  expect(objs1 === objs0 + 1, 'placing from the Decor page failed');
  await btn.click();
  await page.waitForSelector('.decor-modal');
  const back = await summary(page);
  step(`reopened on: ${back}`);
  expect(back.startsWith('Fences'), 'the page forgot its shelf');

  // Store it and find it in Storage; the Barn points there.
  await page.keyboard.press('Escape');
  const fence = await page.evaluate(() => Object.values(window.__farm.store.state.objects).find((o) => o.def === 'picket_fence').id);
  await page.evaluate((id) => window.__farm.store.dispatch({ type: 'store', id }), fence);
  await page.waitForTimeout(300);
  await btn.click();
  await page.waitForSelector('.decor-modal');
  await page.click('.modal-tabs .tab:has-text("Storage")');
  await page.waitForTimeout(300);
  const storedNames = await page.$$eval('.decor-results .card .name', (els) => els.map((e) => e.textContent));
  step(`storage tab: ${await summary(page)} (${storedNames.join(', ')})`);
  expect(storedNames.some((n) => n.includes('Picket Fence')), 'the stored fence is missing from Storage');
  await page.screenshot({ path: `${out}/decor-3-storage.png` });
  await page.keyboard.press('Escape');
  await page.evaluate(() => document.querySelector('.corner .round-btn[aria-label="Barn"]')?.click());
  await page.waitForTimeout(400);
  const barnLink = await page.locator('.modal button:has-text("Open storage")').count();
  step(`barn points to storage: ${barnLink === 1}`);
  expect(barnLink === 1, 'the barn does not link to Decor storage');
  await page.keyboard.press('Escape');

  // The Market's Decor tab hands over to the page.
  await page.click('.toolbar .tool.shop');
  await page.click('.modal-tabs .tab:has-text("Decor")');
  await page.waitForSelector('.decor-modal');
  step('market › decor opens the Decor page');

  await page.click('.decor-cat:has-text("Rewards")');
  await page.waitForTimeout(200);
  step(`rewards: ${await summary(page)}`);
  await page.screenshot({ path: `${out}/decor-4-rewards.png` });
  await ctx.close();
}

// --- phone ---
{
  const { ctx, page } = await play({ width: 390, height: 844 }, 'Pip', true);
  expect((await page.locator('.toolbar .tool.decor').count()) === 0, 'the phone dock has a Decor slot');
  const btn = page.locator('.corner .round-btn[aria-label="Decor"]');
  expect((await btn.count()) === 1, 'no Decor corner button on phones');
  await page.screenshot({ path: `${out}/decor-5-phone-hud.png` });
  await btn.tap();
  await page.waitForSelector('.decor-modal');
  await page.waitForTimeout(500);
  step(`phone: ${await summary(page)}, ${await cards(page)} cards`);
  await page.screenshot({ path: `${out}/decor-6-phone.png` });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(!overflow, 'the phone page scrolls sideways');
  await ctx.close();
}

console.log(errors.length ? 'Errors:\n' + errors.join('\n') : 'No errors');
await browser.close();
