// Measures how smoothly farms of different sizes run on a phone-speed CPU:
// frames a second sitting still and while the camera pans, plus how many
// display objects the scene holds. Builds a "fully decorated" farm from the
// biggest save by filling every empty tile with decorations.
// Usage: npx tsx scripts/perf-check.ts <out-dir> <save.json>... [--throttle=4] [--url=...]
import { readFileSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright';
import { DECORATION_LIST, canPlace, type FarmState } from '@farm/shared';

const args = process.argv.slice(2);
const out = args[0];
const saves = args.slice(1).filter((a) => !a.startsWith('--'));
const opt = (k: string, d: string) => args.find((a) => a.startsWith(`--${k}=`))?.split('=')[1] ?? d;
const throttle = Number(opt('throttle', '4'));
const url = opt('url', 'http://localhost:8099/webfarmville/?debug&hour=12');

/** Every free tile gets a little decoration, like a farm decorated for months. */
function decorateFully(save: { state: FarmState }): { state: FarmState } {
  const st = structuredClone(save.state);
  const decos = DECORATION_LIST.filter((d) => d.w === 1 && d.h === 1 && !d.event);
  let id = 100000;
  let k = 0;
  for (let y = 0; y < st.size; y++)
    for (let x = 0; x < st.size; x++) {
      if (!canPlace(st, x, y, 1, 1)) continue;
      const d = decos[(k++ * 7) % decos.length];
      st.objects[`d${id}`] = { id: `d${id++}`, kind: 'deco', def: d.id, x, y, flip: k % 3 === 0 };
    }
  return { ...save, state: st };
}

const runs: { name: string; json: string }[] = saves.map((p) => ({ name: p.replace(/.*\//, '').replace(/\.json$/, ''), json: readFileSync(p, 'utf8') }));
const biggest = runs.at(-1);
if (biggest) {
  const full = decorateFully(JSON.parse(biggest.json));
  writeFileSync(`${out}/perf-full.json`, JSON.stringify(full));
  runs.push({ name: `${biggest.name}+decorated`, json: JSON.stringify(full) });
}

interface Frames {
  fps: number;
  worst: number;
  upd: number;
  rnd: number;
}
interface Measured {
  idle: Frames;
  pan: Frames;
  children: number;
  shown: number;
  objects: number;
}

const MEASURE = `(async () => {
  const f = window.__farm;
  const scene = f.scene();
  const cam = scene.cameras.main;
  // The game's own work each frame (update and render), from step to finished render.
  let upd = 0;
  let rnd = 0;
  let t0 = 0;
  let t1 = 0;
  scene.game.events.on('prestep', () => (t0 = performance.now()));
  scene.game.events.on('prerender', () => (t1 = performance.now()));
  scene.game.events.on('postrender', () => {
    const t = performance.now();
    upd += t1 - t0;
    rnd += t - t1;
  });
  const frames = (ms, each) =>
    new Promise((res) => {
      let n = 0;
      let worst = 0;
      let last = performance.now();
      const t0 = last;
      upd = 0;
      rnd = 0;
      const tick = (t) => {
        worst = Math.max(worst, t - last);
        last = t;
        if (each) each(n);
        n++;
        if (t - t0 < ms) requestAnimationFrame(tick);
        else res({ fps: (n * 1000) / (t - t0), worst, upd: upd / n, rnd: rnd / n });
      };
      requestAnimationFrame(tick);
    });
  const idle = await frames(5000);
  const x0 = cam.scrollX;
  const pan = await frames(5000, (i) => (cam.scrollX = x0 + Math.sin(i / 20) * 400));
  return { idle, pan, children: scene.children.length, shown: scene.children.list.filter((c) => c.visible).length, objects: Object.keys(f.store.state.objects).length };
})()`;

const browser = await chromium.launch();
for (const run of runs) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
  await ctx.addInitScript((s) => {
    if (!sessionStorage.getItem('loaded')) {
      localStorage.setItem('meadowbrook.save', s);
      sessionStorage.setItem('loaded', '1');
    }
  }, run.json);
  const page = await ctx.newPage();
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const cdp = await ctx.newCDPSession(page);
  await page.goto(url);
  await page.waitForSelector('.toolbar', { state: 'attached', timeout: 60000 });
  await page.waitForTimeout(2500);
  while (await page.locator('.modal-back').count()) {
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
  }
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: throttle });
  await page.waitForTimeout(1500);
  // Plain text so the TypeScript runner's helpers don't leak into the page.
  const m = (await page.evaluate(MEASURE)) as Measured;
  const r = (x: number) => x.toFixed(1);
  console.log(
    `${run.name.padEnd(26)} ${String(m.objects).padStart(4)} objects, ${String(m.children).padStart(5)} sprites (${m.shown} shown) | idle ${r(m.idle.fps)} fps (worst ${Math.round(m.idle.worst)}ms, update ${r(m.idle.upd)}ms, render ${r(m.idle.rnd)}ms) | panning ${r(m.pan.fps)} fps (worst ${Math.round(m.pan.worst)}ms, update ${r(m.pan.upd)}ms, render ${r(m.pan.rnd)}ms)${errors.length ? ' ERRORS: ' + errors.join('; ') : ''}`,
  );
  await page.screenshot({ path: `${out}/perf-${run.name}.png` });
  await ctx.close();
}
await browser.close();
