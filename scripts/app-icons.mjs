// Paints the home-screen app icons (client/public/icons) from the game's own art:
// the farmhouse on a sunny meadow hill with two sunflowers, on a cozy sky.
// Usage: node scripts/app-icons.mjs [preview.png]
import { createServer } from 'vite';
import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../client');
const outDir = path.join(root, 'public/icons');
// name, size, rounded corners (false for icons the OS masks itself), art scale (smaller keeps maskable art in the safe zone)
const ICONS = [
  ['icon-512.png', 512, true, 1],
  ['icon-192.png', 192, true, 1],
  ['maskable-512.png', 512, false, 0.8],
  ['apple-touch-icon.png', 180, false, 0.92],
  ['favicon-64.png', 64, true, 1],
];

const server = await createServer({ root, logLevel: 'error', server: { port: 0, hmr: false } });
await server.listen();
const { port } = server.httpServer.address();
const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  await page.goto(`http://localhost:${port}/art-preview.html?mod=none`);
  const out = await page.evaluate(async (ICONS) => {
    const art = await import('/src/art/index.ts');
    art.buildArt();
    const load = (key) =>
      new Promise((res, rej) => {
        const img = new Image();
        img.onload = () => res(img);
        img.onerror = rej;
        img.src = art.artURL(key);
      });
    const house = await load('building:farmhouse');
    const flower = await load('crop:sunflower:2');
    const paint = (S, rounded, k) => {
      const c = document.createElement('canvas');
      c.width = c.height = S;
      const g = c.getContext('2d');
      const u = S / 512;
      if (rounded) {
        g.beginPath();
        g.roundRect(0, 0, S, S, 112 * u);
        g.clip();
      }
      // Sky.
      const sky = g.createLinearGradient(0, 0, 0, S);
      sky.addColorStop(0, '#9fdcf6');
      sky.addColorStop(0.62, '#e4f7ff');
      g.fillStyle = sky;
      g.fillRect(0, 0, S, S);
      // Sun with a soft glow.
      const sx = S * 0.78, sy = S * 0.2;
      const glow = g.createRadialGradient(sx, sy, 0, sx, sy, 130 * u);
      glow.addColorStop(0, 'rgba(255,240,170,0.95)');
      glow.addColorStop(1, 'rgba(255,240,170,0)');
      g.fillStyle = glow;
      g.fillRect(0, 0, S, S);
      g.fillStyle = '#ffe07a';
      g.beginPath();
      g.arc(sx, sy, 46 * u, 0, Math.PI * 2);
      g.fill();
      // A puffy cloud.
      g.fillStyle = 'rgba(255,255,255,0.92)';
      for (const [x, y, r] of [[96, 118, 34], [134, 100, 42], [176, 118, 32], [136, 128, 30]]) {
        g.beginPath();
        g.arc(x * u, y * u, r * u, 0, Math.PI * 2);
        g.fill();
      }
      // Rolling meadow hills.
      const hill = (y0, peak, col) => {
        g.fillStyle = col;
        g.beginPath();
        g.moveTo(0, S);
        g.lineTo(0, y0 * u);
        g.quadraticCurveTo(S / 2, (y0 - peak) * u, S, y0 * u);
        g.lineTo(S, S);
        g.closePath();
        g.fill();
      };
      hill(352, 70, '#a8e07c');
      hill(408, 60, '#7cc95a');
      // Little meadow dots.
      g.fillStyle = 'rgba(255,255,255,0.35)';
      for (let i = 0; i < 18; i++) {
        g.beginPath();
        g.arc(((i * 97) % 480 + 16) * u, (430 + ((i * 53) % 70)) * u, 5 * u, 0, Math.PI * 2);
        g.fill();
      }
      // The farmhouse and its sunflowers, scaled to fit (k < 1 keeps them in the maskable safe zone).
      g.save();
      g.translate(S / 2, S * 0.56);
      g.scale(k, k);
      g.translate(-S / 2, -S * 0.56);
      const hw = 400 * u, hh = (house.height / house.width) * hw;
      g.drawImage(house, S / 2 - hw / 2, 462 * u - hh, hw, hh);
      const fw = 140 * u, fh = (flower.height / flower.width) * fw;
      g.drawImage(flower, -4 * u, 504 * u - fh, fw, fh);
      g.drawImage(flower, S - fw + 4 * u, 510 * u - fh, fw, fh);
      g.restore();
      return c.toDataURL('image/png');
    };
    return ICONS.map(([name, size, rounded, k]) => [name, paint(size, rounded, k)]);
  }, ICONS);
  fs.mkdirSync(outDir, { recursive: true });
  for (const [name, url] of out) fs.writeFileSync(path.join(outDir, name), Buffer.from(url.split(',')[1], 'base64'));
  console.log('Wrote', out.map(([n]) => n).join(', '));
  if (process.argv[2]) {
    await page.setContent(
      `<body style="background:#eee;display:flex;gap:24px;align-items:end;padding:24px">${out
        .map(([n, u]) => `<img src="${u}" style="${n.startsWith('maskable') ? 'border-radius:50%;' : ''}width:${n.includes('512') ? 256 : ''}px">`)
        .join('')}</body>`,
    );
    await page.screenshot({ path: process.argv[2], fullPage: true });
  }
} finally {
  await browser.close();
  await server.close();
}
