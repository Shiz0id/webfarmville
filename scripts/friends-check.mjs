// Play-tests friendships through the real server: chat, a loved gift that
// crosses a heart milestone, the mailbox, a letter and its present.
// Usage: node scripts/friends-check.mjs <screenshot-dir> [url]
// Needs the server's SQLite file at data/farm.db to give the test farm items.
import { chromium } from 'playwright';
import { DatabaseSync } from 'node:sqlite';

const out = process.argv[2] ?? '.';
const url = process.argv[3] ?? 'http://localhost:3001/?debug&hour=12';
const name = 'pal' + Math.floor(Math.random() * 1e5);
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
st.level = 8;
st.inventory = { ...st.inventory, carrot: 5, corn: 3, honey: 2, pizza: 1, egg: 4, wheat: 6 };
st.friends = { points: { rosie: 380, penny: 120, mama_marigold: 990 }, giftDay: {}, chatDay: {}, known: { penny: ['pizza'] }, mail: [], nextMail: 1 };
db.prepare('UPDATE farms SET state = ?, rev = rev + 1 WHERE user_id = ?').run(JSON.stringify(st), row.user_id);
await page.reload();
await page.waitForSelector('.toolbar');
await page.waitForTimeout(800);
await page.keyboard.press('Escape');

await page.click('button[aria-label="Friends"]');
await page.waitForSelector('.fr-card');
await shot('f1-book');
// Chat with Penny, then give Rosie a carrot (loved: 380 + 80 crosses 4 hearts).
await page.locator('.fr-card', { hasText: 'Penny' }).locator('button', { hasText: 'Chat' }).click();
await page.waitForTimeout(400);
await shot('f2-chat');
await page.locator('.fr-card', { hasText: 'Rosie' }).locator('button', { hasText: 'Give a gift' }).click();
await page.waitForSelector('.fr-gift');
await shot('f3-picker');
await page.locator('.fr-gift[title="Carrots"], .fr-gift[title="Carrot"]').first().click();
await page.waitForTimeout(1500);
await shot('f4-loved');
await page.locator('.modal-tabs button', { hasText: 'Mailbox' }).click();
await page.waitForSelector('.fr-letter');
await shot('f5-mailbox');
await page.locator('.fr-letter').first().click();
await page.waitForSelector('.fr-paper');
await shot('f6-letter');
await page.locator('button', { hasText: 'Open the present' }).click();
await page.waitForTimeout(800);
await shot('f7-claimed');
const state = await page.evaluate(() => {
  const s = window.__farm.store.state;
  return { rosie: s.friends.points.rosie, mail: s.friends.mail, lamp: s.inventory.carrot_lamp, penny: s.friends.points.penny };
});
console.log(JSON.stringify(state));
// The envelope bobs over the farm mailbox while a letter is unread.
await page.keyboard.press('Escape');
await page.keyboard.press('Escape');
await page.waitForTimeout(1500);
await shot('f8-farm');
console.log(errors.length ? errors : 'No errors');
await browser.close();
