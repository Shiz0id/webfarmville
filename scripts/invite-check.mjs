// Play-tests farm invite links on the browser-only build: one farmer shares a
// link, a friend with no farm yet opens it, starts a farm, lands on the shared
// farm, helps out, and finds the friend saved in their Neighbors after a reload.
// Usage: node scripts/invite-check.mjs <screenshot-dir> [url] [WxH]
import { chromium } from 'playwright';

const out = process.argv[2] ?? '.';
const url = process.argv[3] ?? 'http://localhost:8099/webfarmville/?debug&hour=12';
const [w, h] = (process.argv[4] ?? '1280x800').split('x').map(Number);
const touch = Math.max(w, h) < 1250;
const browser = await chromium.launch();
const errors = [];
const step = (s) => console.log('•', s);

async function newPage() {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: touch, isMobile: touch, deviceScaleFactor: touch ? 2 : 1 });
  await ctx.grantPermissions(['clipboard-read', 'clipboard-write']);
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  page.on('request', (r) => r.url().includes('/api/') && errors.push(`server call: ${r.url()}`));
  return page;
}

async function startFarm(page, name) {
  await page.waitForSelector('.auth-card');
  await page.fill('.auth-card input', name);
  await page.click('.auth-card button[type=submit]');
  await page.waitForSelector('.toolbar', { state: 'attached' });
  await page.waitForTimeout(1500);
}

// Clover makes a farm, decorates a little and shares it.
const a = await newPage();
await a.goto(url);
await startFarm(a, 'Clover');
await a.keyboard.press('Escape');
await a.evaluate(() => {
  const { store } = window.__farm;
  store.state.coins += 500;
  if (!store.dispatch({ type: 'buy', def: 'tulips_pink', x: 12, y: 10 })) throw new Error('could not decorate');
});
await a.waitForTimeout(600);
await a.evaluate(() => document.querySelector('button[aria-label="Neighbors"]').click());
await a.waitForSelector('.invite-card');
await a.waitForTimeout(400);
await a.screenshot({ path: `${out}/invite-${w}-1-share.png` });
// The share sheet isn't available headless, so on phones this lands on the clipboard too.
await a.evaluate(() => (navigator.share = undefined));
await a.locator('.invite-card .btn').click({ force: true });
await a.waitForTimeout(800);
const copied = await a.evaluate(() => navigator.clipboard.readText());
const link = copied.slice(copied.indexOf('http'));
step(`link: ${link.length} chars`);
if (!link.includes('#farm=')) errors.push(`no link copied: ${copied}`);
const aObjects = await a.evaluate(() => Object.keys(window.__farm.store.state.objects).length);

// Juniper opens it in a fresh browser.
const b = await newPage();
await b.goto(url.split('#')[0] + link.slice(link.indexOf('#')));
await b.waitForSelector('.auth-invite');
step(`invite note: ${await b.locator('.auth-invite').textContent()}`);
await b.screenshot({ path: `${out}/invite-${w}-2-welcome.png` });
await startFarm(b, 'Juniper');
await b.waitForSelector('.visit-banner', { state: 'visible' });
await b.waitForTimeout(1500);
const v = await b.evaluate(() => {
  const { store } = window.__farm;
  return { name: store.visit.state.name, who: store.visit.owner.username, objects: Object.keys(store.visit.state.objects).length, helps: store.visit.helpsLeft, hash: location.hash };
});
step(`visiting ${v.name} by ${v.who}: ${v.objects} things (Clover has ${aObjects}), helps ${v.helps}, hash "${v.hash}"`);
if (v.objects !== aObjects) errors.push('the shared farm lost objects');
step(`banner: ${await b.locator('.visit-banner .sub').textContent()}`);
await b.screenshot({ path: `${out}/invite-${w}-3-visit.png` });
const earned = await b.evaluate(async () => {
  const { store } = window.__farm;
  const before = store.state.coins;
  // Help whatever wants it (something's always mid-cycle, like the apple tree).
  for (const o of Object.values(store.visit.state.objects)) {
    if (o.kind !== 'tree' && o.kind !== 'animal') continue;
    await store.help(o.id);
    if (store.state.coins !== before) break;
  }
  return store.state.coins - before;
});
step(`helping earned ${earned} coins`);
await b.locator('.visit-banner .btn', { hasText: 'Go home' }).click({ force: true });
await b.waitForTimeout(3000);
step(`home greeting: ${(await b.locator('.say-text').first().textContent().catch(() => 'none'))?.slice(0, 60)}`);

// Clover stays in Juniper's Neighbors after a reload.
await b.reload();
await b.waitForSelector('.toolbar', { state: 'attached' });
await b.waitForTimeout(1000);
await b.evaluate(() => document.querySelector('button[aria-label="Neighbors"]').click());
await b.waitForSelector('.modal');
await b.waitForTimeout(800);
const names = await b.locator('.modal .row .title').allTextContents();
step(`neighbors: ${names.join(', ')}`);
if (!names.includes('Clover')) errors.push('Clover was not saved as a neighbor');
await b.screenshot({ path: `${out}/invite-${w}-4-neighbors.png` });

console.log(errors.length ? 'Errors:\n' + errors.join('\n') : 'No errors');
await browser.close();
