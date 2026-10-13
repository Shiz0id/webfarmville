// Renders the art contact sheet to a PNG so art can be reviewed without a browser.
// Usage: node scripts/art-sheet.mjs <module|all> <out.png> [scale]
import { createServer } from 'vite';
import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const [mod = 'all', out = 'art-sheet.png', scale = '1.5'] = process.argv.slice(2);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../client');

const server = await createServer({ root, logLevel: 'error', server: { port: 0, hmr: false } });
await server.listen();
const { port } = server.httpServer.address();
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await page.goto(`http://localhost:${port}/art-preview.html?mod=${mod}&scale=${scale}`);
  await page.waitForSelector('body[data-ready="1"]', { timeout: 60000 }).catch(() => {});
  await page.screenshot({ path: out, fullPage: true });
  const missing = await page.locator('#missing').textContent().catch(() => null);
  if (missing) console.log(missing);
  if (errors.length) console.log('Errors:\n' + errors.join('\n'));
  console.log(`Wrote ${out}`);
} finally {
  await browser.close();
  await server.close();
}
