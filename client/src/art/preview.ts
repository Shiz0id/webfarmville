// Dev-only contact sheet for generated art: /art-preview.html?mod=decorations&scale=1
// Lists every sprite and icon a module exports, plus any content ids it is missing.
import { RES, renderIcon, renderSprite, spriteSize, type IconSpec, type SpriteSpec } from './kit';
import { expectedKeys } from './manifest';

const params = new URLSearchParams(location.search);
const mod = params.get('mod') ?? 'all';
const scale = Number(params.get('scale') ?? '1.5');
const sheet = document.getElementById('sheet')!;

const modules = import.meta.glob<{ sprites?: SpriteSpec[]; icons?: IconSpec[] }>('./*.ts');

async function load(): Promise<{ sprites: SpriteSpec[]; icons: IconSpec[] }> {
  const sprites: SpriteSpec[] = [];
  const icons: IconSpec[] = [];
  for (const [path, loader] of Object.entries(modules)) {
    const name = path.replace('./', '').replace('.ts', '');
    if (['kit', 'preview', 'manifest', 'index'].includes(name)) continue;
    if (mod !== 'all' && name !== mod) continue;
    const m = await loader();
    sprites.push(...(m.sprites ?? []));
    icons.push(...(m.icons ?? []));
  }
  return { sprites, icons };
}

function cell(canvas: HTMLCanvasElement, label: string, w: number, h: number) {
  const div = document.createElement('div');
  div.className = 'cell';
  canvas.style.width = `${w * scale}px`;
  canvas.style.height = `${h * scale}px`;
  div.appendChild(canvas);
  const span = document.createElement('span');
  span.textContent = label;
  div.appendChild(span);
  sheet.appendChild(div);
}

load().then(({ sprites, icons }) => {
  for (const s of sprites) {
    const { w, h } = spriteSize(s);
    cell(renderSprite(s), s.key, w, h);
  }
  for (const i of icons) {
    const c = renderIcon(i);
    cell(c, i.key, c.width / RES, c.height / RES);
  }
  const have = new Set([...sprites.map((s) => s.key), ...icons.map((i) => i.key)]);
  const missing = expectedKeys(mod).filter((k) => !have.has(k));
  if (missing.length) {
    const div = document.createElement('div');
    div.className = 'missing';
    div.id = 'missing';
    div.textContent = `Missing (${missing.length}): ${missing.join(', ')}`;
    document.body.prepend(div);
  }
  document.body.dataset.ready = '1';
});
