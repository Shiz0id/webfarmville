// Checks the music box in a browser: every track renders offline without
// clipping and at a similar loudness, and the live player starts, names its
// song and follows a festival's playlist.
// Usage: node scripts/music-check.mjs <screenshot-dir> [url]
import { chromium } from 'playwright';

const out = process.argv[2] ?? '.';
const base = process.argv[3] ?? 'http://localhost:8099/webfarmville/';
const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));

async function signIn(url, name) {
  await page.goto(url);
  await page.waitForSelector('.auth-card');
  await page.fill('.auth-card input', name);
  await page.click('.auth-card button[type=submit]');
  await page.waitForSelector('.toolbar', { state: 'attached' });
  await page.waitForTimeout(1200);
}

await signIn(`${base}?debug&hour=12&weather=sunny`, 'Melody');

// The mix: render 16 seconds of every song.
const levels = await page.evaluate(async () => {
  const { renderTrack, PLAYLISTS } = window.__farm.music;
  const rows = [];
  for (const [list, tracks] of Object.entries(PLAYLISTS))
    for (const t of tracks) rows.push({ list, id: t.id, ...(await renderTrack(t.id, 16)) });
  return rows;
});
const db = (x) => 20 * Math.log10(x);
const mean = levels.reduce((s, r) => s + db(r.rms), 0) / levels.length;
for (const r of levels) {
  const off = db(r.rms) - mean;
  const flag = r.peak > 0.9 ? ' CLIPS' : Math.abs(off) > 6 ? ' (level!)' : '';
  console.log(`${r.list.padEnd(15)} ${r.id.padEnd(20)} rms ${db(r.rms).toFixed(1)} dB (${off >= 0 ? '+' : ''}${off.toFixed(1)})  peak ${r.peak.toFixed(2)}${flag}`);
  if (r.peak > 0.9) errors.push(`${r.id} clips`);
}

// The live player: a tap unlocks the sound and a song starts with its name card.
await page.mouse.click(640, 400);
await page.waitForFunction(() => window.__farm.music.nowPlaying(), null, { timeout: 8000 });
// A festival, when one is on, outranks the farm's own songs.
const festival = await page.evaluate(() => [...document.body.classList].find((c) => c.startsWith('event-'))?.slice(6) ?? null);
const day = await page.evaluate(() => window.__farm.music.nowPlaying());
console.log('• playing at noon:', day, festival ? `(${festival} is on)` : '');
if (day.playlist !== (festival ?? 'day')) errors.push(`expected the ${festival ?? 'day'} playlist, got ${day.playlist}`);
await page.waitForSelector('.now-playing');
await page.screenshot({ path: `${out}/music-1-now-playing.png` });

// Rain at night picks the rain songs; ?music= pins a festival.
const moods = [['hour=12&weather=sunny', 'day'], ['hour=23&weather=rain', 'rain'], ['hour=6&weather=sunny', 'morning'], ['hour=18&weather=windy', 'evening'], ['hour=22&weather=sunny', 'night'], ['hour=9&weather=snow', 'snow']];
for (const [q, want] of [...moods.map(([q, w]) => [`event=none&${q}`, w]), ['event=winter', 'winter'], ['music=tanabata', 'tanabata'], ['music=halloween', 'halloween']]) {
  await page.goto(`${base}?debug&${q}`);
  await page.waitForSelector('.toolbar', { state: 'attached' });
  await page.waitForTimeout(800);
  await page.mouse.click(640, 400);
  await page.waitForFunction(() => window.__farm.music.nowPlaying(), null, { timeout: 8000 });
  const np = await page.evaluate(() => window.__farm.music.nowPlaying());
  console.log(`• ${q}:`, np);
  if (np.playlist !== want) errors.push(`${q}: expected ${want}, got ${np.playlist}`);
}
// Let a festival song play for a while (scheduler + drums + holiday clicks).
await page.evaluate(() => document.querySelector('.round-btn')?.click());
await page.waitForTimeout(6000);
await page.screenshot({ path: `${out}/music-2-halloween.png` });

console.log(errors.length ? 'Errors:\n' + errors.join('\n') : 'No errors');
await browser.close();
