// Screenshots the farm under every kind of weather (via ?weather=), plus the
// forecast. Usage: node scripts/weather-check.mjs <screenshot-dir> [base-url]
import { chromium } from 'playwright';

const out = process.argv[2] ?? '.';
const base = process.argv[3] ?? 'http://localhost:3001/';
const name = 'sky' + Math.floor(Math.random() * 1e5);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));

await page.goto(`${base}?debug&hour=12`);
await page.waitForSelector('.auth-card');
await page.fill('input[placeholder="Farmer name"]', name);
await page.fill('input[type=password]', 'password1');
await page.click('button[type=submit]');
await page.waitForSelector('.toolbar');

for (const w of ['sunny', 'cloudy', 'rain', 'storm', 'windy', 'snow', 'rainbow']) {
  await page.goto(`${base}?debug&hour=12&weather=${w}`);
  await page.waitForSelector('.toolbar');
  await page.waitForTimeout(w === 'storm' ? 9000 : 2500);
  await page.keyboard.press('Escape');
  await page.screenshot({ path: `${out}/wx-${w}.png` });
}
await page.click('.wx-pill');
await page.waitForTimeout(500);
await page.screenshot({ path: `${out}/wx-forecast.png` });
console.log(errors.length ? errors : 'No errors');
await browser.close();
