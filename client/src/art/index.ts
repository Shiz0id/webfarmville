// Collects every art module in this folder, renders it once at boot and hands
// the results to Phaser (as textures) and to the DOM UI (as data URLs).

import type Phaser from 'phaser';
import { Pen, RES, renderIcon, renderSprite, spriteSize, type IconSpec, type SpriteSpec } from './kit';

interface ArtModule {
  sprites?: SpriteSpec[];
  icons?: IconSpec[];
}

const modules = import.meta.glob<ArtModule>(['./*.ts', '!./kit.ts', '!./index.ts', '!./manifest.ts', '!./preview.ts'], {
  eager: true,
});

const canvases = new Map<string, HTMLCanvasElement>();
const meta = new Map<string, { fw: number; fh: number; height: number }>();
const urls = new Map<string, string>();
/** Keys that were really painted (not placeholders or borrowed art). */
const painted = new Set<string>();
/** Art to borrow for a key nobody has painted yet (same footprint), optionally recoloured. */
const fallbacks = new Map<string, { from: string; hue?: string }>();

/**
 * Until `key` is painted, draw it with `from`'s art (which must have the same
 * footprint), shifted to `hue` (a CSS colour) so the two can be told apart.
 * Call before the key is first used, e.g. at the top of a feature module.
 */
export function borrowArt(key: string, from: string, hue?: string): void {
  fallbacks.set(key, { from, hue });
}

function recolour(src: HTMLCanvasElement, hue: string): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = src.width;
  c.height = src.height;
  const g = c.getContext('2d')!;
  g.drawImage(src, 0, 0);
  g.globalCompositeOperation = 'hue';
  g.fillStyle = hue;
  g.fillRect(0, 0, c.width, c.height);
  // Keep the original silhouette.
  g.globalCompositeOperation = 'destination-in';
  g.drawImage(src, 0, 0);
  return c;
}

function placeholderSprite(key: string, fw: number, fh: number): SpriteSpec {
  return {
    key,
    fw,
    fh,
    height: 26,
    paint: (p) => {
      const c = p.center;
      p.shadow(c.x, c.y, 14);
      p.box(fw / 2 - 0.3, fh / 2 - 0.3, 0.6, 0.6, 18, '#e9b872');
      p.text('?', c.x, c.y - 16, 12, '#5b3a29');
    },
  };
}

function placeholderIcon(key: string): IconSpec {
  return {
    key,
    paint: (p: Pen) => {
      p.roundRect(8, 8, 24, 24, 6, '#e9b872');
      p.text('?', 20, 20, 14, '#5b3a29');
    },
  };
}

/** Render all art. Safe to call once per page. */
export function buildArt(): void {
  if (canvases.size) return;
  for (const mod of Object.values(modules)) {
    for (const s of mod.sprites ?? []) {
      try {
        canvases.set(s.key, renderSprite(s));
        meta.set(s.key, { fw: s.fw, fh: s.fh, height: s.height });
        painted.add(s.key);
      } catch (err) {
        console.warn('Failed to paint', s.key, err);
      }
    }
    for (const i of mod.icons ?? []) {
      try {
        canvases.set(i.key, renderIcon(i));
        painted.add(i.key);
      } catch (err) {
        console.warn('Failed to paint', i.key, err);
      }
    }
  }
}

/** Make sure a sprite texture exists (painting a placeholder if the art is missing). */
function ensureSprite(key: string, fw = 1, fh = 1): HTMLCanvasElement {
  let c = canvases.get(key);
  const borrowed = fallbacks.get(key);
  if (!c && borrowed && painted.has(borrowed.from)) {
    const src = canvases.get(borrowed.from)!;
    c = borrowed.hue ? recolour(src, borrowed.hue) : src;
    canvases.set(key, c);
    const m = meta.get(borrowed.from);
    if (m) meta.set(key, m);
  }
  if (!c) {
    const spec = key.startsWith('icon:') ? null : placeholderSprite(key, fw, fh);
    c = spec ? renderSprite(spec) : renderIcon(placeholderIcon(key));
    canvases.set(key, c);
    if (spec) meta.set(key, { fw, fh, height: spec.height });
  }
  return c;
}

export function registerTextures(scene: Phaser.Scene): void {
  for (const [key, canvas] of canvases) {
    if (!scene.textures.exists(key)) scene.textures.addCanvas(key, canvas);
  }
}

/** Texture key for the scene, creating a placeholder texture if needed. */
export function texture(scene: Phaser.Scene, key: string, fw = 1, fh = 1): string {
  if (!scene.textures.exists(key)) scene.textures.addCanvas(key, ensureSprite(key, fw, fh));
  return key;
}

/** Has this key been painted (rather than drawn with a placeholder or borrowed art)? */
export function hasArt(key: string): boolean {
  return painted.has(key);
}

export function artMeta(key: string): { fw: number; fh: number; height: number } {
  return meta.get(key) ?? { fw: 1, fh: 1, height: 26 };
}

/** A data URL for use in <img> tags (icons and sprite previews). */
export function artURL(key: string): string {
  let url = urls.get(key);
  if (!url) {
    url = ensureSprite(key).toDataURL();
    urls.set(key, url);
  }
  return url;
}

/** Item icon URL (crops, products, goods) with a sprite fallback for decorations. */
export function iconURL(id: string): string {
  if (painted.has(`icon:${id}`) || fallbacks.has(`icon:${id}`)) return artURL(`icon:${id}`);
  if (painted.has(`deco:${id}`) || fallbacks.has(`deco:${id}`)) return artURL(`deco:${id}`);
  return artURL(`icon:${id}`);
}

export { RES, spriteSize };
