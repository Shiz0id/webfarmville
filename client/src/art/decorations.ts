// Decorations: the cozy, wholesome bits players sprinkle around their farm.
//
// Every non-seasonal decoration in DECORATION_LIST gets a `deco:<id>` sprite.
// Painters are grouped by category below; the table at the bottom maps each id
// to its painter and headroom. Shared helpers keep families (tulips, roses,
// hydrangeas, benches, fences, statues) consistent while every item keeps its
// own recognisable silhouette.
import { type IconSpec, type SpriteSpec, type Pen, shade, rng, mix, boxColors, rgba } from './kit';
import { DECORATION_LIST } from '@farm/shared';

type Painter = (p: Pen) => void;
type Fill = string | CanvasGradient | null;
interface Pt {
  x: number;
  y: number;
}
type Ctx = CanvasRenderingContext2D;

const TAU = Math.PI * 2;

// ---------------------------------------------------------------------------
// Palette

const WOOD = '#b98352';
const WOOD_D = '#8d5c36';
const WOOD_L = '#d9aa74';
const BARK = '#7a5236';
const STONE = '#b3afa4';
const STONE_D = '#8d897f';
const STONE_L = '#d4d1c6';
const MOSS = '#7fae48';
const LEAF = '#5fae4a';
const LEAF_D = '#43893c';
const LEAF_L = '#8fd06a';
const STEM = '#4f8f3a';
const IRON = '#3d4549';
const WHITE = '#fbf7ee';
const TERRA = '#d9824f';
const WATER = '#6ec6e6';
const WATER_D = '#3f9cc8';
const GLOW = '#ffd27a';
const SOIL = '#6b4a2f';
const STRAW = '#e8c35a';
const BRASS = '#d9a43f';

// ---------------------------------------------------------------------------
// Generic drawing helpers

/** Build an arbitrary path and fill/stroke it. */
function shape(p: Pen, build: (c: Ctx) => void, fill: Fill, stroke: string | null = p.outline, width = p.lineWidth): void {
  const c = p.ctx;
  c.beginPath();
  build(c);
  if (fill) {
    c.fillStyle = fill;
    c.fill();
  }
  if (stroke) {
    c.strokeStyle = stroke;
    c.lineWidth = width;
    c.stroke();
  }
}

function polyPath(pts: Pt[]): (c: Ctx) => void {
  return (c) => {
    c.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) c.lineTo(pts[i].x, pts[i].y);
    c.closePath();
  };
}

/** Smooth closed curve through the midpoints of a polygon (rounded blobs). */
function smoothPath(pts: Pt[]): (c: Ctx) => void {
  return (c) => {
    const n = pts.length;
    const mid = (a: Pt, b: Pt) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
    const m0 = mid(pts[n - 1], pts[0]);
    c.moveTo(m0.x, m0.y);
    for (let i = 0; i < n; i++) {
      const m = mid(pts[i], pts[(i + 1) % n]);
      c.quadraticCurveTo(pts[i].x, pts[i].y, m.x, m.y);
    }
    c.closePath();
  };
}

/** Points around an ellipse with a little random wobble. */
function wobbly(x: number, y: number, rx: number, ry: number, seed: number | string, n = 9, jit = 0.15): Pt[] {
  const r = rng(seed);
  const pts: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU;
    const k = 1 - jit + r() * jit * 2;
    pts.push({ x: x + Math.cos(a) * rx * k, y: y + Math.sin(a) * ry * k });
  }
  return pts;
}

function withClip(p: Pen, build: (c: Ctx) => void, fn: () => void): void {
  p.save();
  p.ctx.beginPath();
  build(p.ctx);
  p.ctx.clip();
  fn();
  p.restore();
}

/**
 * Draw in "flat ground space": one tile = 32×32 units, x along u and y along v.
 * Circles become iso ellipses, squares become diamonds.
 */
function flat(p: Pen, fn: () => void): void {
  p.save();
  p.ctx.transform(1, 0.5, -1, 0.5, p.fh * 32, p.height);
  fn();
  p.restore();
}

function hgrad(p: Pen, x0: number, x1: number, a: string, b: string, mid?: string): CanvasGradient {
  const g = p.ctx.createLinearGradient(x0, 0, x1, 0);
  g.addColorStop(0, a);
  if (mid) g.addColorStop(0.45, mid);
  g.addColorStop(1, b);
  return g;
}

function radial(p: Pen, x: number, y: number, r: number, col: string): CanvasGradient {
  const g = p.ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r * 1.1);
  g.addColorStop(0, shade(col, 0.3));
  g.addColorStop(0.6, col);
  g.addColorStop(1, shade(col, -0.22));
  return g;
}

/** A face lying in the plane v = const (runs along u, faces front-left). */
function faceV(p: Pen, u0: number, u1: number, v: number, z0: number, z1: number): Pt[] {
  return [p.iso(u0, v, z0), p.iso(u1, v, z0), p.iso(u1, v, z1), p.iso(u0, v, z1)];
}

/** A face lying in the plane u = const (runs along v, faces front-right). */
function faceU(p: Pen, u: number, v0: number, v1: number, z0: number, z1: number): Pt[] {
  return [p.iso(u, v1, z0), p.iso(u, v0, z0), p.iso(u, v0, z1), p.iso(u, v1, z1)];
}

/** Line with an outline underneath (log rails, ropes, iron work). */
function thick(p: Pen, pts: Pt[], color: string, w: number, outline: string = p.outline): void {
  p.line(pts, outline, w + 2);
  p.line(pts, color, w);
}

function thickCurve(p: Pen, a: Pt, c: Pt, b: Pt, color: string, w: number): void {
  p.curve(a, c, b, p.outline, w + 2);
  p.curve(a, c, b, color, w);
}

function qpt(a: Pt, c: Pt, b: Pt, t: number): Pt {
  const s = 1 - t;
  return { x: s * s * a.x + 2 * s * t * c.x + t * t * b.x, y: s * s * a.y + 2 * s * t * c.y + t * t * b.y };
}

function lerp(a: Pt, b: Pt, t: number): Pt {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

/** Soft shadow running along the u axis (fences, rows). */
function lineShadow(p: Pen, u0: number, u1: number, v: number, r = 7, alpha = 0.16): void {
  const steps = Math.max(2, Math.round((u1 - u0) * 5));
  for (let i = 0; i <= steps; i++) {
    const q = p.iso(u0 + ((u1 - u0) * i) / steps, v);
    p.shadow(q.x, q.y + 1, r, r * 0.5, alpha);
  }
}

/** Jittered points inside the footprint, sorted back-to-front. */
function scatter(seed: number | string, n: number, fw: number, fh: number, margin = 0.2): { u: number; v: number }[] {
  const r = rng(seed);
  const cols = Math.max(1, Math.round(Math.sqrt((n * fw) / fh)));
  const rows = Math.ceil(n / cols);
  const pts: { u: number; v: number }[] = [];
  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < rows; j++) {
      pts.push({
        u: margin + ((fw - 2 * margin) * (i + 0.15 + r() * 0.7)) / cols,
        v: margin + ((fh - 2 * margin) * (j + 0.15 + r() * 0.7)) / rows,
      });
    }
  }
  while (pts.length > n) pts.splice(Math.floor(r() * pts.length), 1);
  return pts.sort((a, b) => a.u + a.v - (b.u + b.v));
}

function leafAt(p: Pen, x: number, y: number, len: number, ang: number, color: string, w = 0.22): void {
  const cx = x + (Math.cos(ang) * len) / 2;
  const cy = y + (Math.sin(ang) * len) / 2;
  p.ellipse(cx, cy, len / 2, Math.max(0.8, len * w), color, shade(color, -0.42), ang);
}

function stem(p: Pen, x0: number, y0: number, x1: number, y1: number, color = STEM, w = 1.3): void {
  p.curve({ x: x0, y: y0 }, { x: x0 + (x1 - x0) * 0.2, y: (y0 + y1) / 2 }, { x: x1, y: y1 }, color, w);
}

function tuft(p: Pen, x: number, y: number, s: number, col = LEAF): void {
  const o = shade(col, -0.38);
  for (const a of [-0.8, -0.35, 0.1, 0.5, 0.9]) {
    shape(
      p,
      (c) => {
        c.moveTo(x - 1.4 + a * 2, y);
        c.quadraticCurveTo(x + a * s * 0.5, y - s * 0.6, x + a * s * 0.9, y - s * (1 - Math.abs(a) * 0.25));
        c.lineTo(x + 1.4 + a * 2, y);
        c.closePath();
      },
      a > 0.3 ? shade(col, -0.1) : col,
      o,
      0.8,
    );
  }
}

/** Little sparkle. */
function sparkle(p: Pen, x: number, y: number, s: number, col = '#fff6c2'): void {
  shape(
    p,
    (c) => {
      c.moveTo(x, y - s);
      c.quadraticCurveTo(x, y, x + s, y);
      c.quadraticCurveTo(x, y, x, y + s);
      c.quadraticCurveTo(x, y, x - s, y);
      c.quadraticCurveTo(x, y, x, y - s);
    },
    col,
    null,
  );
}

/** Leaf texture inside an already-built clip region. */
function leafTexture(p: Pen, x0: number, y0: number, x1: number, y1: number, base: string, seed: number | string, n: number): void {
  const r = rng(seed);
  for (let i = 0; i < n; i++) {
    const x = x0 + r() * (x1 - x0);
    const y = y0 + r() * (y1 - y0);
    const t = r();
    p.circle(x, y, 1.4 + r() * 1.6, t < 0.5 ? shade(base, 0.14) : shade(base, -0.14), null);
  }
}

function pot(p: Pen, x: number, y: number, rx: number, ht: number, col = TERRA): void {
  // tapered pot
  const rb = rx * 0.78;
  shape(
    p,
    (c) => {
      c.moveTo(x - rx, y - ht);
      c.lineTo(x - rb, y);
      c.ellipse(x, y, rb, rb / 2, 0, Math.PI, 0, true);
      c.lineTo(x + rx, y - ht);
      c.closePath();
    },
    hgrad(p, x - rx, x + rx, shade(col, 0.12), shade(col, -0.28), col),
  );
  // rim
  p.cylinder(x, y - ht + 1, rx + 1.4, 3, col);
  p.ellipse(x, y - ht - 2, rx - 0.2, (rx - 0.2) / 2, SOIL, shade(SOIL, -0.3));
}

// ---------------------------------------------------------------------------
// Flowers

function flowerBed(p: Pen, seed: string, n: number, plant: (x: number, y: number, r: () => number, i: number) => void, margin = 0.15): void {
  const r = rng(seed + ':bed');
  const c = p.center;
  p.shadow(c.x, c.y + 1, (p.fw + p.fh) * 15, (p.fw + p.fh) * 7.5, 0.18);
  const pts = scatter(seed, n, p.fw, p.fh, margin);
  pts.forEach((pt, i) => {
    const q = p.iso(pt.u, pt.v);
    plant(q.x, q.y, r, i);
  });
}

function tulipHead(p: Pen, x: number, y: number, r: number, col: string): void {
  const o = shade(col, -0.5);
  shape(
    p,
    (c) => {
      c.moveTo(x - r, y - r * 0.9);
      c.lineTo(x - r * 0.45, y - r * 0.35);
      c.lineTo(x, y - r * 1.15);
      c.lineTo(x + r * 0.45, y - r * 0.35);
      c.lineTo(x + r, y - r * 0.9);
      c.quadraticCurveTo(x + r * 1.1, y + r, x, y + r);
      c.quadraticCurveTo(x - r * 1.1, y + r, x - r, y - r * 0.9);
      c.closePath();
    },
    col,
    o,
  );
  shape(
    p,
    (c) => {
      c.moveTo(x - r * 0.45, y - r * 0.35);
      c.lineTo(x, y - r * 1.15);
      c.lineTo(x + r * 0.45, y - r * 0.35);
      c.quadraticCurveTo(x + r * 0.5, y + r * 0.7, x, y + r * 0.95);
      c.quadraticCurveTo(x - r * 0.5, y + r * 0.7, x - r * 0.45, y - r * 0.35);
    },
    shade(col, 0.16),
    rgba(o, 0.6),
    0.6,
  );
  p.ellipse(x - r * 0.62, y + r * 0.05, r * 0.16, r * 0.42, rgba('#ffffff', 0.55), null);
}

function tulips(col: string): Painter {
  return (p) =>
    flowerBed(p, 'tulip' + col, 9, (x, y, r) => {
      const h = 10 + r() * 6;
      const bend = (r() - 0.5) * 3;
      leafAt(p, x, y, 8 + r() * 2, -Math.PI / 2 - 0.55 - r() * 0.3, LEAF, 0.2);
      leafAt(p, x, y, 7 + r() * 2, -Math.PI / 2 + 0.5 + r() * 0.3, LEAF_D, 0.2);
      stem(p, x, y, x + bend, y - h);
      tulipHead(p, x + bend, y - h, 3.3, mix(col, '#ffffff', r() * 0.18));
    });
}

function roseHead(p: Pen, x: number, y: number, r: number, col: string): void {
  const o = mix(col, '#4a3426', 0.55);
  p.circle(x, y, r, radial(p, x, y, r, col), o);
  const c = p.ctx;
  c.strokeStyle = shade(col, -0.3);
  c.lineWidth = 0.7;
  c.beginPath();
  c.arc(x + 0.2, y + 0.2, r * 0.58, 0.5, 3.9);
  c.stroke();
  c.beginPath();
  c.arc(x - 0.2, y - 0.1, r * 0.28, 3.4, 7.2);
  c.stroke();
}

function roses(col: string): Painter {
  return (p) => {
    const { x, y } = p.center;
    p.shadow(x, y + 1, 24, 11, 0.22);
    p.foliage(x - 7, y - 7, 11, LEAF_D, 'rose-a' + col, 7);
    p.foliage(x + 7, y - 8, 11, LEAF_D, 'rose-b' + col, 7);
    p.foliage(x, y - 13, 12, '#4f9a45', 'rose' + col, 8);
    const spots: [number, number, number][] = [
      [-10, -14, 3.2],
      [1, -22, 3.4],
      [10, -15, 3.4],
      [-3, -11, 3.6],
      [-14, -5, 3.0],
      [6, -6, 3.4],
      [15, -6, 2.8],
      [-7, -20, 2.8],
      [-4, -1, 3],
    ];
    for (const [dx, dy, r] of spots) roseHead(p, x + dx, y + dy, r, col);
    // a couple of little leaves poking between
    leafAt(p, x - 1, y - 16, 4, -2.5, LEAF_L);
    leafAt(p, x + 12, y - 11, 4, -0.4, LEAF_L);
  };
}

function daisies(p: Pen): void {
  flowerBed(p, 'daisy', 12, (x, y, r) => {
    const h = 5 + r() * 6;
    leafAt(p, x, y, 5, -2.4, LEAF, 0.3);
    leafAt(p, x, y, 5, -0.7, LEAF_D, 0.3);
    stem(p, x, y, x + (r() - 0.5) * 2, y - h);
    p.flower(x, y - h, 3.4, '#ffffff', '#f6c335');
  });
}

function pansy(p: Pen, x: number, y: number, r: number, top: string, bottom: string): void {
  const o1 = shade(top, -0.45);
  const o2 = shade(bottom, -0.45);
  p.circle(x - r * 0.45, y - r * 0.55, r * 0.6, top, o1);
  p.circle(x + r * 0.45, y - r * 0.55, r * 0.6, top, o1);
  p.circle(x - r * 0.62, y + r * 0.05, r * 0.5, bottom, o2);
  p.circle(x + r * 0.62, y + r * 0.05, r * 0.5, bottom, o2);
  p.circle(x, y + r * 0.35, r * 0.62, bottom, o2);
  p.circle(x, y + r * 0.08, r * 0.36, shade(top, -0.45), null);
  p.circle(x, y + r * 0.02, r * 0.14, '#ffe066', null);
}

function pansies(p: Pen): void {
  const combos: [string, string][] = [
    ['#7b4fc0', '#f5d34a'],
    ['#3f63c8', '#f4f2ff'],
    ['#e3792e', '#f9d548'],
    ['#a33a6a', '#f6a6c7'],
  ];
  const { x, y } = p.center;
  p.shadow(x, y + 1, 26, 12, 0.18);
  for (const q of scatter('pansy-leaves', 9, 1, 1, 0.18)) {
    const s = p.iso(q.u, q.v);
    p.ellipse(s.x, s.y - 2, 4.5, 3, LEAF, shade(LEAF, -0.4));
  }
  flowerBed(p, 'pansy', 8, (px, py, r, i) => {
    const [t, b] = combos[i % combos.length];
    pansy(p, px, py - 4 - r() * 3, 3.6, t, b);
  });
}

function cosmos(p: Pen): void {
  const cols = ['#f48fb8', '#e0559a', '#fbe6f0', '#f6a8c8'];
  flowerBed(p, 'cosmos', 8, (x, y, r, i) => {
    const h = 14 + r() * 8;
    const tx = x + (r() - 0.5) * 6;
    stem(p, x, y, tx, y - h, STEM, 1.1);
    // feathery leaves
    for (let k = 0; k < 3; k++) {
      const t = 0.3 + k * 0.2;
      const sx = x + (tx - x) * t;
      const sy = y - h * t;
      p.line([{ x: sx, y: sy }, { x: sx + (k % 2 ? 3 : -3), y: sy - 2 }], LEAF, 0.9);
    }
    const col = cols[i % cols.length];
    const hr = 4;
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * TAU + 0.2;
      p.ellipse(tx + Math.cos(a) * hr * 0.55, y - h + Math.sin(a) * hr * 0.5, hr * 0.48, hr * 0.27, col, shade(col, -0.35), a);
    }
    p.circle(tx, y - h, 1.4, '#f7c731', shade('#f7c731', -0.4));
  });
}

function hyacinths(p: Pen): void {
  const cols = ['#6f7fe0', '#a46fd8', '#f08fbd', '#7f9ff0', '#f4f1ff', '#b98be8'];
  flowerBed(p, 'hyacinth', 7, (x, y, r, i) => {
    const col = cols[i % cols.length];
    leafAt(p, x, y, 9, -Math.PI / 2 - 0.45, LEAF, 0.16);
    leafAt(p, x, y, 8, -Math.PI / 2 + 0.5, LEAF_D, 0.16);
    stem(p, x, y, x, y - 7);
    const base = y - 6;
    for (let row = 0; row < 6; row++) {
      const ry = base - row * 2.4;
      const w = 3.4 - row * 0.45;
      for (const dx of [-w, 0, w]) {
        if (row === 5 && dx !== 0) continue;
        p.circle(x + dx * 0.8, ry, 1.9, mix(col, '#ffffff', (5 - row) * 0.02 + (dx === 0 ? 0.12 : 0)), shade(col, -0.4));
      }
    }
    void r;
  });
}

function lilyHead(p: Pen, x: number, y: number, r: number, col: string, center: string): void {
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * TAU - Math.PI / 2 + 0.25;
    p.ellipse(x + Math.cos(a) * r * 0.5, y + Math.sin(a) * r * 0.42, r * 0.58, r * 0.22, col, shade(col, -0.38), a);
  }
  p.circle(x, y, r * 0.3, center, null);
  for (const a of [-2.2, -1.6, -1.0]) {
    const ex = x + Math.cos(a) * r * 0.7;
    const ey = y + Math.sin(a) * r * 0.7;
    p.line([{ x, y }, { x: ex, y: ey }], '#c9e07a', 0.6);
    p.circle(ex, ey, 0.7, '#b85a2a', null);
  }
}

function lilies(p: Pen): void {
  const kinds: [string, string][] = [
    ['#fff8f2', '#f4a0bf'],
    ['#f7944a', '#f9d04a'],
    ['#f9c1d6', '#e0559a'],
    ['#fff8f2', '#f9d04a'],
  ];
  flowerBed(p, 'lily', 5, (x, y, r, i) => {
    const h = 15 + r() * 7;
    const tx = x + (r() - 0.5) * 4;
    leafAt(p, x, y, 9, -2.2, LEAF, 0.18);
    leafAt(p, x, y, 9, -0.9, LEAF_D, 0.18);
    stem(p, x, y, tx, y - h);
    leafAt(p, (x + tx) / 2, y - h * 0.5, 5, -0.6, LEAF, 0.2);
    const [c, ctr] = kinds[i % kinds.length];
    if (i === 3) {
      // a closed bud
      p.ellipse(tx, y - h - 2, 1.8, 4, mix(c, LEAF_L, 0.3), shade(c, -0.4), 0.2);
    } else lilyHead(p, tx, y - h, 6, c, ctr);
  });
}

function mumHead(p: Pen, x: number, y: number, r: number, col: string): void {
  // a fluffy pom-pom: scalloped outer ring, lighter inner rings
  const outer: Pt[] = [];
  const n = 14;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU;
    const k = i % 2 ? 0.82 : 1;
    outer.push({ x: x + Math.cos(a) * r * k, y: y + Math.sin(a) * r * k * 0.9 });
  }
  shape(p, smoothPath(outer), shade(col, -0.08), shade(col, -0.55));
  for (const [k, l] of [
    [0.72, 0.12],
    [0.45, 0.28],
  ]) {
    const m = Math.round(12 * k) + 2;
    for (let i = 0; i < m; i++) {
      const a = (i / m) * TAU + k * 3;
      p.ellipse(x + Math.cos(a) * r * k * 0.7, y + Math.sin(a) * r * k * 0.62, r * 0.3, r * 0.17, shade(col, l), null, a);
    }
  }
  p.circle(x, y, r * 0.22, shade(col, 0.45), null);
  p.ellipse(x - r * 0.35, y - r * 0.45, r * 0.3, r * 0.15, rgba('#ffffff', 0.45), null, -0.4);
}

function mums(p: Pen): void {
  const { x, y } = p.center;
  p.shadow(x, y + 1, 26, 12, 0.2);
  p.foliage(x - 8, y - 6, 11, '#4b8a3e', 'mums1', 7);
  p.foliage(x + 8, y - 6, 11, '#4b8a3e', 'mums2', 7);
  p.foliage(x, y - 10, 12, '#4b8a3e', 'mums', 8);
  const heads: [number, number, string][] = [
    [-7, -18, '#f9d64a'],
    [7, -19, '#e2506e'],
    [-14, -9, '#f7a33c'],
    [0, -11, '#f8eef4'],
    [14, -9, '#f7a33c'],
    [-7, -3, '#e2506e'],
    [7, -2, '#f9d64a'],
  ];
  for (const [dx, dy, c] of heads) mumHead(p, x + dx, y + dy, 5.4, c);
}

function lilyOfValley(p: Pen): void {
  flowerBed(
    p,
    'lotv',
    4,
    (x, y, r, i) => {
      const dir = i % 2 ? 1 : -1;
      // two broad leaves
      p.ellipse(x - 2, y - 7, 2.8, 7.5, LEAF, shade(LEAF, -0.4), -0.25);
      p.ellipse(x + 2, y - 6, 2.8, 7, LEAF_D, shade(LEAF, -0.45), 0.3);
      p.line([{ x: x - 2, y: y - 1 }, { x: x - 2.6, y: y - 12 }], shade(LEAF, 0.25), 0.6);
      // arching stem with bells
      const a = { x, y: y - 3 };
      const c = { x: x + dir * 2, y: y - 22 };
      const b = { x: x + dir * 9, y: y - 12 - r() * 2 };
      p.curve(a, c, b, STEM, 1);
      for (let k = 0; k < 5; k++) {
        const t = 0.45 + k * 0.13;
        const q = qpt(a, c, b, t);
        p.line([q, { x: q.x, y: q.y + 2 }], STEM, 0.6);
        shape(
          p,
          (cc) => {
            cc.arc(q.x, q.y + 3.2, 1.7, Math.PI, 0);
            cc.lineTo(q.x + 1.9, q.y + 4.2);
            cc.lineTo(q.x + 0.9, q.y + 3.7);
            cc.lineTo(q.x, q.y + 4.4);
            cc.lineTo(q.x - 0.9, q.y + 3.7);
            cc.lineTo(q.x - 1.9, q.y + 4.2);
            cc.closePath();
          },
          '#fffdf6',
          '#8a9a80',
          0.6,
        );
      }
    },
    0.24,
  );
}

function wildflowers(p: Pen): void {
  flowerBed(
    p,
    'wild',
    26,
    (x, y, r, i) => {
      const kind = Math.floor(r() * 6);
      const h = 4 + r() * 8;
      if (kind === 0 || i % 5 === 0) {
        tuft(p, x, y, 6 + r() * 3, i % 2 ? LEAF : '#74b84e');
        return;
      }
      stem(p, x, y, x + (r() - 0.5) * 3, y - h, STEM, 1);
      const hx = x + (r() - 0.5) * 3;
      const hy = y - h;
      if (kind === 1) {
        // poppy
        p.circle(hx, hy, 2.8, '#ec4a3c', '#9a2a22');
        p.circle(hx, hy, 0.9, '#2b2320', null);
      } else if (kind === 2) p.flower(hx, hy, 2.8, '#5f86e8', '#f4f0ff');
      else if (kind === 3) p.flower(hx, hy, 2.5, '#f8d442', '#f39a3c');
      else if (kind === 4) p.flower(hx, hy, 2.8, '#ffffff', '#f6c335');
      else {
        // lavender spike
        for (let k = 0; k < 4; k++) p.ellipse(hx, hy - k * 1.8, 1.3, 1.1, mix('#9a7ae0', '#c8b4f4', k / 4), null);
      }
    },
    0.12,
  );
}

function sunflowerRow(p: Pen): void {
  lineShadow(p, 0.15, 1.85, 0.5, 9, 0.18);
  const r = rng('sunflowers');
  const hs = [34, 42, 31, 39, 33];
  for (let i = 0; i < 5; i++) {
    const u = 0.22 + i * 0.39;
    const v = 0.5 + (i % 2 ? 0.12 : -0.1);
    const g = p.iso(u, v);
    tuft(p, g.x, g.y + 1, 5);
    const h = hs[i];
    const tx = g.x + (r() - 0.5) * 4;
    thick(p, [g, { x: tx, y: g.y - h }], '#5f9a3a', 1.6);
    // heart leaves
    for (const [t, dir] of [
      [0.35, -1],
      [0.6, 1],
    ] as [number, number][]) {
      const lx = g.x + (tx - g.x) * t;
      const ly = g.y - h * t;
      p.ellipse(lx + dir * 4.5, ly - 1, 4.6, 2.8, LEAF, shade(LEAF, -0.42), dir * -0.45);
      p.line([{ x: lx, y: ly }, { x: lx + dir * 7, y: ly - 2 }], shade(LEAF, -0.2), 0.6);
    }
    const hx = tx;
    const hy = g.y - h;
    for (let k = 0; k < 14; k++) {
      const a = (k / 14) * TAU;
      p.ellipse(hx + Math.cos(a) * 6, hy + Math.sin(a) * 5.4, 2.9, 1.4, k % 2 ? '#f8c630' : '#fbd64e', '#b7861a', a);
    }
    p.circle(hx, hy, 4, radial(p, hx, hy, 4, '#7a4a24'), '#4a2c16');
    const rr = rng(i + 3);
    for (let k = 0; k < 7; k++) p.circle(hx + (rr() - 0.5) * 4.5, hy + (rr() - 0.5) * 4, 0.55, '#3b2412', null);
  }
}

function flowerPlanter(p: Pen): void {
  const { x, y } = p.center;
  p.shadow(x, y + 2, 26, 11, 0.24);
  p.box(0.18, 0.3, 0.64, 0.4, 11, WOOD);
  // plank seams
  for (const z of [4, 7.5]) {
    p.line([p.iso(0.18, 0.7, z), p.iso(0.82, 0.7, z)], shade(WOOD, -0.25), 0.7);
    p.line([p.iso(0.82, 0.7, z), p.iso(0.82, 0.3, z)], shade(WOOD, -0.45), 0.7);
  }
  p.diamond(0.23, 0.35, 0.54, 0.3, SOIL, null, 11);
  const r = rng('planter');
  const cols = ['#f25c78', '#f8d442', '#9a7ae0', '#ffffff', '#f39a3c', '#f48fb8'];
  const pts = scatter('planter-f', 9, 1, 1, 0).map((q) => ({ u: 0.27 + q.u * 0.46, v: 0.38 + q.v * 0.24 }));
  pts.forEach((q, i) => {
    const g = p.iso(q.u, q.v, 11);
    const h = 3 + r() * 5;
    leafAt(p, g.x, g.y, 5, -2.5, LEAF);
    leafAt(p, g.x, g.y, 5, -0.6, LEAF_D);
    stem(p, g.x, g.y, g.x, g.y - h);
    p.flower(g.x, g.y - h, 3, cols[i % cols.length], i % cols.length === 3 ? '#f6c335' : '#fff1a8');
  });
  // trailing ivy over the front edge
  for (const u of [0.26, 0.47, 0.7]) {
    const a = p.iso(u, 0.7, 11);
    const b = p.iso(u + 0.06, 0.7, 2.5);
    const c = { x: a.x - 2, y: (a.y + b.y) / 2 };
    p.curve(a, c, b, STEM, 1);
    for (let k = 1; k <= 3; k++) {
      const q = qpt(a, c, b, k / 3);
      p.ellipse(q.x + (k % 2 ? 1.5 : -1.5), q.y, 1.8, 1.2, LEAF_L, shade(LEAF, -0.3));
    }
  }
}

function hangingBasket(p: Pen): void {
  const { x, y } = p.center;
  const px = x - 7;
  p.shadow(px, y, 6, 3, 0.25);
  p.shadow(x + 9, y + 2, 12, 5, 0.12);
  tuft(p, px, y + 1, 5);
  // shepherd's hook
  const top = y - 58;
  thick(p, [{ x: px, y }, { x: px, y: top + 6 }], IRON, 1.6);
  thickCurve(p, { x: px, y: top + 6 }, { x: px + 1, y: top - 4 }, { x: px + 9, y: top - 2 }, IRON, 1.6);
  thickCurve(p, { x: px + 9, y: top - 2 }, { x: px + 13, y: top + 1 }, { x: px + 10, y: top + 4 }, IRON, 1.4);
  p.circle(px, top + 6, 1.4, IRON, null);
  const bx = x + 10;
  const by = y - 36;
  // chains
  for (const dx of [-7, 0, 7]) p.line([{ x: px + 10, y: top + 4 }, { x: bx + dx, y: by - 4 }], '#6b6f73', 0.7);
  // trailing vines under
  for (const [dx, len] of [
    [-6, 14],
    [1, 18],
    [7, 12],
  ] as [number, number][]) {
    const a = { x: bx + dx, y: by + 3 };
    const b = { x: bx + dx + 1, y: by + len };
    p.curve(a, { x: a.x - 2, y: (a.y + b.y) / 2 }, b, STEM, 1);
    for (let k = 1; k <= 3; k++) {
      const q = lerp(a, b, k / 3);
      p.ellipse(q.x + (k % 2 ? 1.6 : -1.6), q.y, 1.8, 1.1, LEAF_L, shade(LEAF, -0.3));
    }
    p.flower(b.x, b.y, 2.2, '#f25c9a', '#ffe8f0');
  }
  // basket bowl
  shape(
    p,
    (c) => {
      c.moveTo(bx - 11, by - 3);
      c.quadraticCurveTo(bx - 10, by + 8, bx, by + 8);
      c.quadraticCurveTo(bx + 10, by + 8, bx + 11, by - 3);
      c.closePath();
    },
    hgrad(p, bx - 11, bx + 11, '#c99358', '#8d5c36', '#b07a45'),
  );
  withClip(
    p,
    (c) => {
      c.moveTo(bx - 11, by - 3);
      c.quadraticCurveTo(bx - 10, by + 8, bx, by + 8);
      c.quadraticCurveTo(bx + 10, by + 8, bx + 11, by - 3);
      c.closePath();
    },
    () => {
      for (let k = -12; k < 12; k += 3) {
        p.line([{ x: bx + k, y: by - 4 }, { x: bx + k + 6, y: by + 9 }], rgba('#6b4422', 0.5), 0.7);
        p.line([{ x: bx + k + 6, y: by - 4 }, { x: bx + k, y: by + 9 }], rgba('#f0d0a0', 0.35), 0.7);
      }
    },
  );
  // flowers spilling over the top
  p.foliage(bx, by - 5, 9, LEAF, 'basket', 7);
  const fl: [number, number, string][] = [
    [-7, -6, '#f25c9a'],
    [0, -11, '#9a7ae0'],
    [7, -6, '#f25c9a'],
    [-3, -3, '#ffffff'],
    [4, -1, '#9a7ae0'],
    [-9, 0, '#9a7ae0'],
    [9, 1, '#ffffff'],
  ];
  for (const [dx, dy, c] of fl) p.flower(bx + dx, by + dy, 2.8, c, c === '#ffffff' ? '#f6c335' : '#fff1a8');
  p.ellipse(bx, by - 3.2, 11, 2.2, null, shade('#8d5c36', -0.2), 0);
}

// ---------------------------------------------------------------------------
// Plants & trees

function trunk(p: Pen, x: number, y: number, w: number, h: number, col = BARK): void {
  shape(
    p,
    (c) => {
      c.moveTo(x - w / 2 - 3, y + 1);
      c.quadraticCurveTo(x - w / 2, y - 1, x - w / 2, y - 4);
      c.lineTo(x - w * 0.38, y - h);
      c.lineTo(x + w * 0.38, y - h);
      c.lineTo(x + w / 2, y - 4);
      c.quadraticCurveTo(x + w / 2, y - 1, x + w / 2 + 3, y + 1);
      c.quadraticCurveTo(x, y + 3, x - w / 2 - 3, y + 1);
      c.closePath();
    },
    hgrad(p, x - w / 2, x + w / 2, shade(col, 0.15), shade(col, -0.3), col),
  );
}

function roundBush(p: Pen): void {
  const { x, y } = p.center;
  p.shadow(x, y + 1, 22, 10, 0.25);
  p.foliage(x, y - 11, 16, '#5aaa48', 'round-bush', 8);
  const r = rng('rb-dots');
  for (let i = 0; i < 5; i++) p.circle(x - 10 + r() * 20, y - 20 + r() * 16, 1.1, shade('#5aaa48', 0.35), null);
}

function hydrangea(col: string): Painter {
  return (p) => {
    const { x, y } = p.center;
    p.shadow(x, y + 1, 23, 10, 0.24);
    p.foliage(x, y - 11, 16, LEAF_D, 'hyd' + col, 8);
    const clusters: [number, number][] = [
      [-9, -18],
      [4, -22],
      [11, -12],
      [-2, -11],
      [-12, -6],
      [6, -3],
    ];
    const r = rng('hyd-c' + col);
    for (const [dx, dy] of clusters) {
      const cx = x + dx;
      const cy = y + dy;
      p.circle(cx, cy, 6, shade(col, -0.2), shade(col, -0.55));
      for (let k = 0; k < 10; k++) {
        const a = r() * TAU;
        const d = k === 0 ? 0 : 1.5 + r() * 2.8;
        const fx = cx + Math.cos(a) * d;
        const fy = cy + Math.sin(a) * d * 0.85;
        const fc = mix(col, k % 3 ? '#ffffff' : '#9a7ae0', r() * 0.3);
        // four-petal floret
        const rot = r() * Math.PI;
        for (let q = 0; q < 4; q++) {
          const pa = rot + (q * Math.PI) / 2;
          p.circle(fx + Math.cos(pa) * 1.1, fy + Math.sin(pa) * 1.1, 1.15, fc, null);
        }
        p.circle(fx, fy, 0.5, shade(col, -0.35), null);
      }
      p.circle(cx, cy, 6, null, shade(col, -0.55));
    }
  };
}

function azalea(p: Pen): void {
  const { x, y } = p.center;
  p.shadow(x, y + 1, 26, 11, 0.24);
  p.foliage(x - 9, y - 7, 11, '#3f8a3c', 'az1', 7);
  p.foliage(x + 9, y - 7, 11, '#3f8a3c', 'az2', 7);
  p.foliage(x, y - 12, 13, '#4c9a40', 'az3', 8);
  const r = rng('azalea');
  const pts: Pt[] = [];
  for (let i = 0; i < 20; i++) {
    const a = r() * TAU;
    const d = Math.sqrt(r());
    pts.push({ x: x + Math.cos(a) * d * 19, y: y - 10 + Math.sin(a) * d * 11 });
  }
  pts.sort((a, b) => a.y - b.y);
  for (const q of pts) p.flower(q.x, q.y, 2.7, r() < 0.3 ? '#f58ac0' : '#e9508e', '#fff0f6');
}

function squareHedge(p: Pen): void {
  const { x, y } = p.center;
  p.shadow(x, y + 2, 26, 12, 0.26);
  const u0 = 0.16;
  const u1 = 0.84;
  const ht = 18;
  const base = '#4f9e42';
  const c = boxColors(base);
  const faces: [Pt[], string][] = [
    [faceV(p, u0, u1, u1, 0, ht), c.left],
    [faceU(p, u1, u0, u1, 0, ht), c.right],
    [[p.iso(u0, u1, ht), p.iso(u1, u1, ht), p.iso(u1, u0, ht), p.iso(u0, u0, ht)], c.top],
  ];
  faces.forEach(([pts, col], i) => {
    shape(p, smoothPath([...pts.flatMap((q, k) => [q, lerp(q, pts[(k + 1) % pts.length], 0.5)])]), col, null);
    withClip(p, polyPath(pts), () => leafTexture(p, 0, y - 40, 64, y + 20, col, 'hedge' + i, 70));
    p.poly(pts, null, rgba('#2f5a2a', 0.6), 0.8);
  });
  // lumpy silhouette
  p.poly([p.iso(u0, u1, 0), p.iso(u1, u1, 0), p.iso(u1, u0, 0), p.iso(u1, u0, ht), p.iso(u0, u0, ht), p.iso(u0, u1, ht)], null, p.outline);
  for (const [u, v] of [
    [0.3, 0.2],
    [0.6, 0.18],
    [0.82, 0.4],
  ]) {
    const q = p.iso(u, v, ht);
    p.circle(q.x, q.y + 0.5, 2.6, c.top, null);
  }
}

/** A clipped "leafy" union of ellipses (topiaries). */
function topiaryShape(p: Pen, parts: [number, number, number, number, number][], base: string, seed: string): void {
  const build = (c: Ctx) => {
    for (const [x, y, rx, ry, rot] of parts) {
      c.moveTo(x + rx, y);
      c.ellipse(x, y, rx, ry, rot, 0, TAU);
    }
  };
  // outline pass
  for (const [x, y, rx, ry, rot] of parts) p.ellipse(x, y, rx + 1, ry + 1, p.outline, null, rot);
  withClip(p, build, () => {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const [x, y, rx, ry] of parts) {
      minX = Math.min(minX, x - rx);
      maxX = Math.max(maxX, x + rx);
      minY = Math.min(minY, y - ry);
      maxY = Math.max(maxY, y + ry);
    }
    const g = p.ctx.createRadialGradient(minX + (maxX - minX) * 0.35, minY + (maxY - minY) * 0.3, 2, (minX + maxX) / 2, (minY + maxY) / 2, Math.max(maxX - minX, maxY - minY) * 0.7);
    g.addColorStop(0, shade(base, 0.22));
    g.addColorStop(1, shade(base, -0.25));
    p.rect(minX - 2, minY - 2, maxX - minX + 4, maxY - minY + 4, g, null);
    leafTexture(p, minX, minY, maxX, maxY, base, seed, Math.round((maxX - minX) * (maxY - minY) * 0.18));
  });
}

function topiaryBall(p: Pen): void {
  const { x, y } = p.center;
  p.shadow(x, y + 1, 14, 6, 0.28);
  pot(p, x, y, 9, 10);
  thick(p, [{ x, y: y - 13 }, { x, y: y - 24 }], BARK, 2);
  p.shadow(x, y - 13, 6, 2.5, 0.25);
  topiaryShape(p, [[x, y - 35, 13, 13, 0]], '#4f9e42', 'topball');
  topiaryShape(p, [[x, y - 54, 6.5, 6.5, 0]], '#4f9e42', 'topball2');
  thick(p, [{ x, y: y - 48 }, { x, y: y - 47 }], BARK, 1.5);
}

function topiaryBunny(p: Pen): void {
  const { x, y } = p.center;
  p.shadow(x, y + 2, 22, 10, 0.26);
  p.box(0.24, 0.24, 0.52, 0.52, 9, '#cfd3d6');
  p.diamond(0.28, 0.28, 0.44, 0.44, SOIL, null, 9);
  const b = y - 9;
  topiaryShape(
    p,
    [
      [x - 2, b - 11, 12, 10, 0],
      [x - 13, b - 12, 4.5, 4.5, 0],
      [x + 9, b - 25, 7.5, 7, 0],
      [x + 6, b - 40, 2.8, 8.5, -0.2],
      [x + 12, b - 39, 2.8, 8.5, 0.3],
      [x + 5, b - 3, 4, 3, 0],
    ],
    '#4f9e42',
    'bunny',
  );
  // a sweet little eye, nose and a flower behind the ear
  p.circle(x + 12, b - 26, 1.2, '#2b2b2b', null);
  p.circle(x + 16.2, b - 23.5, 0.9, '#f28aa8', null);
  p.flower(x + 3, b - 33, 2.6, '#f48fb8', '#fff1a8');
}

function cedarTree(p: Pen): void {
  const { x, y } = p.center;
  p.shadow(x, y + 1, 22, 10, 0.26);
  trunk(p, x, y, 7, 14);
  const base = '#3f8a5a';
  for (let i = 0; i < 4; i++) {
    const by = y - 8 - i * 13;
    const hw = 22 - i * 4.6;
    const ay = by - 22 - (i === 3 ? 6 : 0);
    const bumps = 4;
    shape(
      p,
      (c) => {
        c.moveTo(x, ay);
        c.quadraticCurveTo(x + hw * 0.45, by - 10, x + hw, by);
        for (let k = 0; k < bumps; k++) {
          const x0 = x + hw - ((k + 1) * 2 * hw) / bumps;
          const xm = x0 + hw / bumps;
          c.quadraticCurveTo(xm, by + 5, x0, by);
        }
        c.quadraticCurveTo(x - hw * 0.45, by - 10, x, ay);
        c.closePath();
      },
      hgrad(p, x - hw, x + hw, shade(base, 0.2), shade(base, -0.3), base),
    );
    // highlight streaks
    p.line([{ x: x - 2, y: ay + 6 }, { x: x - hw * 0.55, y: by - 1 }], rgba('#ffffff', 0.18), 1.4);
  }
  p.circle(x + 6, y - 18, 1.6, '#8a5a34', null);
  p.circle(x - 8, y - 33, 1.6, '#8a5a34', null);
}

function birchTree(p: Pen): void {
  const { x, y } = p.center;
  p.shadow(x, y + 1, 20, 9, 0.24);
  const tc = '#f1eee4';
  trunk(p, x, y, 6, 40, tc);
  thick(p, [{ x: x + 1, y: y - 28 }, { x: x + 9, y: y - 38 }], tc, 2);
  thick(p, [{ x: x - 1, y: y - 33 }, { x: x - 8, y: y - 42 }], tc, 1.6);
  const r = rng('birch');
  for (let i = 0; i < 7; i++) {
    const yy = y - 4 - i * 5.3 - r() * 2;
    const w = 1.5 + r() * 2;
    const left = r() < 0.5;
    p.line([{ x: x + (left ? -2.6 : 2.6 - w), y: yy }, { x: x + (left ? -2.6 + w : 2.6), y: yy + 0.4 }], '#3b3530', 1.1);
  }
  const g = '#9ccc55';
  p.foliage(x - 9, y - 45, 12, g, 'b1', 7);
  p.foliage(x + 10, y - 47, 12, g, 'b2', 7);
  p.foliage(x, y - 58, 13, g, 'b3', 8);
  for (let i = 0; i < 6; i++) p.circle(x - 16 + r() * 32, y - 66 + r() * 26, 1.1, '#f2f07a', null);
}

function cherryBlossom(p: Pen): void {
  const { x, y } = p.center;
  const r = rng('cherry');
  p.shadow(x, y + 1, 26, 11, 0.24);
  // fallen petals on the ground
  for (let i = 0; i < 12; i++) {
    const q = p.iso(0.15 + r() * 0.7, 0.15 + r() * 0.7);
    p.ellipse(q.x, q.y, 1.4, 0.8, i % 3 ? '#f7b6cf' : '#fde4ee', null, r() * 3);
  }
  const bark = '#6b4636';
  trunk(p, x, y, 8, 26, bark);
  thick(p, [{ x: x - 1, y: y - 24 }, { x: x - 12, y: y - 38 }], bark, 2.6);
  thick(p, [{ x: x + 1, y: y - 24 }, { x: x + 11, y: y - 40 }], bark, 2.6);
  thick(p, [{ x, y: y - 25 }, { x: x + 1, y: y - 44 }], bark, 2.2);
  const pink = '#f7b3cc';
  p.foliage(x - 14, y - 42, 12, pink, 'ch1', 7);
  p.foliage(x + 15, y - 44, 12, pink, 'ch2', 7);
  p.foliage(x, y - 52, 19, pink, 'ch3', 9);
  // blossom specks
  for (let i = 0; i < 26; i++) {
    const a = r() * TAU;
    const d = Math.sqrt(r());
    const bx = x + Math.cos(a) * d * 24;
    const by = y - 48 + Math.sin(a) * d * 14;
    p.circle(bx, by, 1 + r() * 0.6, i % 3 ? '#fde4ee' : '#e98aae', null);
  }
  // drifting petals
  for (const [dx, dy, rot] of [
    [-22, -24, 0.5],
    [20, -20, 2],
    [-16, -10, 1.2],
    [24, -32, 2.6],
    [12, -8, 0.2],
  ]) {
    p.ellipse(x + dx, y + dy, 1.8, 1, '#f9c3d7', '#d77a9c', rot);
  }
}

function weepingWillow(p: Pen): void {
  const { x, y } = p.center;
  const r = rng('willow');
  p.shadow(x, y + 2, 50, 22, 0.24);
  const g = '#8cbf4f';
  type Strand = { a: Pt; c: Pt; b: Pt };
  const make = (sx: number, sy: number, ey: number): Strand => {
    const out = (sx - x) * 0.12;
    return { a: { x: sx, y: sy }, c: { x: sx + out * 0.4, y: (sy + ey) / 2 }, b: { x: sx + out, y: ey } };
  };
  // Strands are drawn as merged ribbons: one outline pass, then one fill pass,
  // so neighbours fuse into a soft curtain with a scalloped hem.
  const curtain = (list: Strand[], col: string) => {
    for (const s of list) {
      p.curve(s.a, s.c, s.b, p.outline, 6.6);
      p.ellipse(s.b.x, s.b.y + 1, 2.4, 3.2, p.outline, null);
    }
    list.forEach((s, i) => {
      const c = i % 2 ? col : shade(col, 0.07);
      p.curve(s.a, s.c, s.b, c, 4.6);
      p.ellipse(s.b.x, s.b.y + 1, 1.4, 2.2, c, null);
    });
    list.forEach((s, i) => {
      if (i % 2) return;
      const o = 2.2;
      p.curve({ x: s.a.x + o, y: s.a.y }, { x: s.c.x + o, y: s.c.y }, { x: s.b.x + o, y: s.b.y - 3 }, rgba('#2f5a20', 0.35), 0.7);
      p.curve({ x: s.a.x - 0.8, y: s.a.y }, { x: s.c.x - 0.8, y: s.c.y }, { x: s.b.x - 0.8, y: s.b.y - 4 }, rgba('#ffffff', 0.2), 0.7);
    });
    // leaf flecks
    for (const s of list) {
      for (let k = 0; k < 3; k++) {
        const q = qpt(s.a, s.c, s.b, 0.45 + r() * 0.5);
        p.ellipse(q.x + (r() - 0.5) * 2, q.y, 0.8, 1.6, rgba(r() < 0.5 ? '#ffffff' : '#2f5a20', 0.22), null, 0.2);
      }
    }
  };
  const back: Strand[] = [];
  for (let sx = x - 44; sx <= x + 44; sx += 4) back.push(make(sx, y - 58 + Math.pow((sx - x) / 44, 2) * 12, y - 22 - r() * 8 + Math.abs(sx - x) * 0.08));
  curtain(back, shade(g, -0.2));
  trunk(p, x, y, 14, 40, '#7a5a3a');
  thick(p, [{ x: x - 2, y: y - 34 }, { x: x - 18, y: y - 50 }], '#7a5a3a', 3);
  thick(p, [{ x: x + 2, y: y - 34 }, { x: x + 18, y: y - 52 }], '#7a5a3a', 3);
  const front: Strand[] = [];
  for (let sx = x - 46; sx <= x + 46; sx += 3.6) {
    if (Math.abs(sx - x) < 8) continue;
    front.push(make(sx, y - 58 + Math.pow((sx - x) / 46, 2) * 12, y - 4 - r() * 8 - Math.abs(sx - x) * 0.12 - (Math.abs(sx - x) < 20 ? 4 : 0)));
  }
  curtain(
    front.filter((s) => s.a.x < x),
    g,
  );
  curtain(
    front.filter((s) => s.a.x > x),
    g,
  );
  p.foliage(x - 29, y - 56, 19, g, 'w1', 8);
  p.foliage(x + 29, y - 56, 19, g, 'w2', 8);
  p.foliage(x, y - 72, 25, g, 'w3', 10);
}

function bamboo(p: Pen): void {
  const { x, y } = p.center;
  p.shadow(x, y + 1, 22, 10, 0.24);
  const stalks: [number, number, number][] = [
    [-9, -5, 52],
    [7, -6, 60],
    [-2, -1, 46],
    [13, 2, 40],
    [-12, 3, 34],
    [3, 5, 28],
  ];
  const r = rng('bamboo');
  for (const [dx, dy, h] of stalks) {
    const sx = x + dx;
    const sy = y + dy;
    p.roundRect(sx - 2.2, sy - h, 4.4, h, 1.5, hgrad(p, sx - 2.2, sx + 2.2, '#a6d468', '#5f9a3a', '#86bf52'));
    for (let ny = sy - 9; ny > sy - h + 3; ny -= 9) {
      p.line([{ x: sx - 2.2, y: ny }, { x: sx + 2.2, y: ny }], '#4c7e2e', 0.9);
      p.line([{ x: sx - 1.6, y: ny - 1 }, { x: sx + 1.6, y: ny - 1 }], rgba('#ffffff', 0.35), 0.6);
    }
    // leaf sprays
    // a tuft at the tip plus a drooping spray from one node
    p.line([{ x: sx, y: sy - h }, { x: sx + 1, y: sy - h - 4 }], '#6fa84a', 1);
    for (const [a, len] of [
      [-1.9, 8],
      [-1.2, 9],
    ]) {
      leafAt(p, sx + 0.5, sy - h - 2, len, a + (r() - 0.5) * 0.2, '#86c85a', 0.17);
    }
    const side = dx < 0 ? -1 : 1;
    const ny = sy - h * (0.45 + r() * 0.2);
    const bx = sx + side * 5;
    p.line([{ x: sx, y: ny }, { x: bx, y: ny - 3 }], '#5f9a3a', 0.8);
    for (const a of [0.15, 0.6, 1.05]) {
      const ang = side > 0 ? a : Math.PI - a;
      leafAt(p, bx, ny - 3, 9 + r() * 2, ang, r() < 0.5 ? '#6fb34a' : '#86c85a', 0.16);
    }
  }
  tuft(p, x - 6, y + 4, 5);
  tuft(p, x + 8, y + 6, 4);
}

function frond(p: Pen, x: number, y: number, ang: number, len: number, col: string): void {
  const a = { x, y };
  const b = { x: x + Math.cos(ang) * len, y: y + Math.sin(ang) * len * 0.8 + len * 0.25 };
  const c = { x: x + Math.cos(ang) * len * 0.5, y: y + Math.sin(ang) * len * 0.5 - len * 0.35 };
  p.curve(a, c, b, shade(col, -0.35), 1);
  for (let k = 1; k <= 7; k++) {
    const t = k / 8;
    const q = qpt(a, c, b, t);
    const q2 = qpt(a, c, b, t + 0.02);
    const dir = Math.atan2(q2.y - q.y, q2.x - q.x);
    const s = 4.6 * (1 - t * 0.55);
    leafAt(p, q.x, q.y, s, dir - 1.1, col, 0.3);
    leafAt(p, q.x, q.y, s, dir + 1.1, shade(col, -0.08), 0.3);
  }
}

function pottedFern(p: Pen): void {
  const { x, y } = p.center;
  p.shadow(x, y + 1, 13, 6, 0.28);
  pot(p, x, y, 9, 11);
  const fy = y - 14;
  const angs = [-1.9, -1.2, -2.5, -0.6, -1.55, Math.PI + 0.25, -0.05, Math.PI - 0.25, 0.25];
  angs.forEach((a, i) => frond(p, x, fy, a, 19 + (i % 3) * 3, i % 2 ? '#5aa847' : '#4c9a3e'));
}

function cactusPot(p: Pen): void {
  const { x, y } = p.center;
  p.shadow(x, y + 1, 13, 6, 0.28);
  const body = '#5aa55a';
  const cy = y - 13;
  const arm = (dir: number, ay: number, h: number) => {
    const ax = x + dir * 9;
    p.roundRect(Math.min(x, ax) - (dir > 0 ? 0 : 0), ay - 2, 9, 4.5, 2, body, p.outline);
    p.roundRect(ax - 2.6, ay - h, 5.2, h + 2, 2.6, hgrad(p, ax - 3, ax + 3, '#79c06a', '#438a43', body));
  };
  arm(-1, cy - 12, 10);
  arm(1, cy - 18, 8);
  p.roundRect(x - 5.5, cy - 30, 11, 32, 5.5, hgrad(p, x - 6, x + 6, '#7fc66e', '#438a43', body));
  for (const dx of [-2.5, 0.5, 3]) p.line([{ x: x + dx, y: cy - 27 }, { x: x + dx, y: cy }], rgba('#2f6b33', 0.45), 0.6);
  const r = rng('cactus');
  for (let i = 0; i < 12; i++) p.circle(x - 4 + r() * 8, cy - 26 + r() * 24, 0.45, '#fffbe0', null);
  p.flower(x + 1, cy - 30, 3.8, '#f47aa8', '#ffe066');
  pot(p, x, y, 9, 10, '#7aa6d8');
  // glaze stripe
  p.line([{ x: x - 8.2, y: y - 5 }, { x: x - 6, y: y - 3.8 }], '#fdf6e8', 0.01);
  shape(
    p,
    (c) => {
      c.ellipse(x, y - 5, 8.1, 4, 0, 0.05, Math.PI - 0.05);
    },
    null,
    '#fdf6e8',
    1.4,
  );
}

function mushroom(p: Pen, x: number, y: number, s: number, cap: string): void {
  p.shadow(x, y, s, s / 2, 0.2);
  p.roundRect(x - s * 0.35, y - s * 1.2, s * 0.7, s * 1.2, s * 0.3, hgrad(p, x - s, x + s, '#fff8e8', '#e0cfae'));
  const cy = y - s * 1.1;
  shape(
    p,
    (c) => {
      c.ellipse(x, cy, s, s * 0.85, 0, Math.PI, 0);
      c.quadraticCurveTo(x, cy + s * 0.35, x - s, cy);
      c.closePath();
    },
    radial(p, x, cy - s * 0.4, s, cap),
  );
  p.circle(x - s * 0.4, cy - s * 0.45, s * 0.18, '#ffffff', null);
  p.circle(x + s * 0.3, cy - s * 0.6, s * 0.14, '#ffffff', null);
  p.circle(x + s * 0.65, cy - s * 0.15, s * 0.1, '#ffffff', null);
}

function mushroomRing(p: Pen): void {
  const { x, y } = p.center;
  p.ellipse(x, y, 22, 11, rgba('#3f7a2e', 0.18), null);
  const pts: [number, number, number, string][] = [];
  const r = rng('ring');
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * TAU + 0.3;
    pts.push([x + Math.cos(a) * 20, y + Math.sin(a) * 9.5, 3.6 + r() * 2.4, i % 4 === 3 ? '#e8a24a' : '#e5483e']);
  }
  pts.sort((a, b) => a[1] - b[1]);
  for (const [mx, my, s, c] of pts) mushroom(p, mx, my, s, c);
  p.glow(x, y - 8, 14, '#fff3b0', 0.35);
  sparkle(p, x - 4, y - 12, 2.4);
  sparkle(p, x + 6, y - 6, 1.8);
  sparkle(p, x + 1, y - 18, 1.5);
}

// ---------------------------------------------------------------------------
// Fences: every segment runs along u through the tile's centre line (v = 0.5)

function picketFence(p: Pen): void {
  lineShadow(p, 0, 1, 0.5);
  const white = boxColors(WHITE);
  white.left = '#efe9dc';
  white.right = '#cfc6b4';
  for (const z of [4, 11]) p.box(0, 0.46, 1, 0.05, 2.6, white, z);
  for (let i = 0; i < 5; i++) {
    const u = (i + 0.5) / 5 - 0.06;
    p.box(u, 0.51, 0.12, 0.04, 15, white);
    p.poly([p.iso(u, 0.55, 15), p.iso(u + 0.12, 0.55, 15), p.iso(u + 0.06, 0.55, 19)], white.left);
    p.line([p.iso(u + 0.025, 0.55, 2), p.iso(u + 0.025, 0.55, 14)], rgba('#ffffff', 0.8), 0.7);
  }
}

function logFence(p: Pen): void {
  lineShadow(p, 0, 1, 0.5);
  for (const u of [0.25, 0.75]) {
    const q = p.iso(u, 0.5);
    p.cylinder(q.x, q.y, 2.8, 17, WOOD_D);
    p.ellipse(q.x, q.y - 17, 1.5, 0.75, null, shade(WOOD_D, -0.3));
  }
  for (const z of [6, 12.5]) {
    const a = p.iso(0, 0.5, z);
    const b = p.iso(1, 0.5, z);
    p.line([a, b], p.outline, 5.6);
    p.line([a, b], WOOD, 3.8);
    p.line([{ x: a.x, y: a.y - 1 }, { x: b.x, y: b.y - 1 }], shade(WOOD, 0.25), 1);
    // bark knots
    const k = lerp(a, b, 0.4);
    p.ellipse(k.x, k.y + 0.4, 1, 0.6, shade(WOOD, -0.35), null, 0.46);
  }
}

function ironFence(p: Pen): void {
  lineShadow(p, 0, 1, 0.5, 6, 0.12);
  for (const z of [3, 12]) {
    p.line([p.iso(0, 0.5, z), p.iso(1, 0.5, z)], IRON, 1.6);
  }
  for (let i = 0; i < 8; i++) {
    const u = (i + 0.5) / 8;
    const b = p.iso(u, 0.5, 0);
    const t = p.iso(u, 0.5, 16);
    p.line([b, t], IRON, 1.3);
    p.poly([{ x: t.x, y: t.y - 3 }, { x: t.x + 1.3, y: t.y }, { x: t.x, y: t.y + 0.8 }, { x: t.x - 1.3, y: t.y }], IRON, null);
    if (i % 2 === 0) {
      const m = p.iso(u + 1 / 16, 0.5, 7.5);
      p.ellipse(m.x, m.y, 1.6, 2.6, null, IRON, 0);
    }
  }
  // gilded finials
  for (let i = 0; i < 8; i += 2) {
    const t = p.iso((i + 0.5) / 8, 0.5, 16);
    p.circle(t.x, t.y - 3.2, 0.9, BRASS, null);
  }
  p.line([p.iso(0, 0.5, 12), p.iso(1, 0.5, 12)], rgba('#ffffff', 0.18), 0.5);
}

function stoneWall(p: Pen): void {
  lineShadow(p, 0, 1, 0.5, 8, 0.2);
  const v0 = 0.38;
  const v1 = 0.62;
  const ht = 11;
  p.box(0, v0, 1, v1 - v0, ht, STONE);
  const front = faceV(p, 0, 1, v1, 0, ht);
  const r = rng('wall');
  withClip(p, polyPath(front), () => {
    const rows = [
      [0, 2.75],
      [5.5, 8.25],
    ];
    rows.forEach(([, zc], ri) => {
      let u = ri % 2 ? -0.12 : 0;
      while (u < 1) {
        const w = 0.2 + r() * 0.1;
        const q = p.iso(u + w / 2, v1, zc);
        const col = mix(STONE, ri % 2 ? '#c8bfa8' : '#a7aba6', r() * 0.6);
        p.ellipse(q.x, q.y, w * 17.5, 2.6, col, shade(STONE, -0.4), 0.4636);
        p.ellipse(q.x - 1, q.y - 1, w * 9, 0.8, rgba('#ffffff', 0.3), null, 0.4636);
        u += w;
      }
    });
  });
  const side = faceU(p, 1, v0, v1, 0, ht);
  withClip(p, polyPath(side), () => {
    for (const zc of [2.75, 8.25]) {
      const q = p.iso(1, 0.5, zc);
      p.ellipse(q.x, q.y, 4.3, 2.6, shade(STONE, -0.2), shade(STONE, -0.45), -0.4636);
    }
  });
  // moss on top
  for (const [u, w] of [
    [0.1, 0.18],
    [0.55, 0.25],
  ]) {
    const q = p.iso(u + w / 2, 0.5, ht);
    p.ellipse(q.x, q.y, w * 18, 2.4, MOSS, shade(MOSS, -0.35), 0.4636);
    p.ellipse(q.x - 1, q.y - 0.6, w * 10, 1, shade(MOSS, 0.3), null, 0.4636);
  }
  const fq = p.iso(0.85, 0.62, 4);
  p.flower(fq.x, fq.y, 1.7, '#ffffff', '#f6c335');
}

function bambooFence(p: Pen): void {
  lineShadow(p, 0, 1, 0.5);
  for (let i = 0; i < 10; i++) {
    const u = (i + 0.5) / 10;
    const q = p.iso(u, 0.5);
    const h = i % 2 ? 15 : 17.5;
    p.cylinder(q.x, q.y, 1.75, h, i % 3 === 1 ? '#b7c46a' : '#c5cf7a');
    p.line([{ x: q.x - 1.7, y: q.y - 8 }, { x: q.x + 1.7, y: q.y - 8 }], '#7f8a3e', 0.7);
  }
  for (const z of [5, 12]) {
    const a = p.iso(0, 0.56, z);
    const b = p.iso(1, 0.56, z);
    p.line([a, b], p.outline, 3.8);
    p.line([a, b], '#a6b65e', 2.2);
  }
  for (const u of [0.25, 0.75]) {
    for (const z of [5, 12]) {
      const q = p.iso(u, 0.57, z);
      p.line([{ x: q.x - 1.2, y: q.y - 2 }, { x: q.x + 1.2, y: q.y + 2 }], '#5a3a22', 1.2);
      p.line([{ x: q.x + 1.2, y: q.y - 2 }, { x: q.x - 1.2, y: q.y + 2 }], '#5a3a22', 1.2);
    }
  }
}

function hedgeFence(p: Pen): void {
  lineShadow(p, 0, 1, 0.5, 9, 0.22);
  const v0 = 0.36;
  const v1 = 0.64;
  const ht = 17;
  const c = boxColors('#4f9e42');
  const faces: [Pt[], string][] = [
    [faceV(p, 0, 1, v1, 0, ht), c.left],
    [faceU(p, 1, v0, v1, 0, ht), c.right],
    [[p.iso(0, v1, ht), p.iso(1, v1, ht), p.iso(1, v0, ht), p.iso(0, v0, ht)], c.top],
  ];
  faces.forEach(([pts, col], i) => {
    p.poly(pts, col, null);
    withClip(p, polyPath(pts), () => leafTexture(p, 0, -10, 64, 80, col, 'hf' + i, 80));
  });
  p.line([p.iso(1, v1, 0), p.iso(1, v1, ht)], rgba('#2f5a2a', 0.45), 0.7);
  p.poly([p.iso(0, v1, 0), p.iso(1, v1, 0), p.iso(1, v0, 0), p.iso(1, v0, ht), p.iso(0, v0, ht), p.iso(0, v1, ht)], null);
  // soft leafy lumps along the top edge, plus light leaf clusters on the faces
  const r = rng('hedge-top');
  for (let i = 0; i < 6; i++) {
    const q = p.iso((i + 0.5) / 6, v1 - 0.04, ht);
    p.ellipse(q.x, q.y, 3.6, 2, shade(c.top, 0.08), null, 0.46);
    p.ellipse(q.x - 0.8, q.y - 0.6, 1.8, 0.9, shade(c.top, 0.3), null, 0.46);
  }
  for (let i = 0; i < 7; i++) {
    const q = p.iso(0.06 + r() * 0.88, v1, 3 + r() * 11);
    p.ellipse(q.x, q.y, 1.8, 1.1, shade(c.left, 0.22), null, 0.46);
  }
}

function gardenGate(p: Pen): void {
  lineShadow(p, 0, 1, 0.5);
  const white = boxColors(WHITE);
  white.left = '#efe9dc';
  white.right = '#cfc6b4';
  // arbor arch behind/over the posts
  const archZ = 22;
  const archPts: Pt[] = [];
  for (let i = 0; i <= 16; i++) {
    const t = i / 16;
    archPts.push(p.iso(0.06 + t * 0.88, 0.5, archZ + Math.sin(t * Math.PI) * 12));
  }
  for (const u of [0.0, 0.88]) p.box(u, 0.44, 0.12, 0.12, archZ + 1, white);
  for (const u of [0.0, 0.88]) p.box(u - 0.01, 0.43, 0.14, 0.14, 1.6, white, archZ + 1);
  // gate doors: pickets following a gentle arc
  for (const z of [4, 10]) p.box(0.12, 0.48, 0.76, 0.04, 2.2, { top: '#f6efe2', left: '#d9c8a9', right: '#b8a888' }, z);
  for (let i = 0; i < 8; i++) {
    const u = 0.14 + i * 0.092;
    const t = (u + 0.035 - 0.12) / 0.76;
    const h = 13 + Math.sin(t * Math.PI) * 3;
    p.box(u, 0.52, 0.07, 0.03, h, { top: '#fffaf0', left: '#f0e2c8', right: '#c9b896' });
    p.poly([p.iso(u, 0.55, h), p.iso(u + 0.07, 0.55, h), p.iso(u + 0.035, 0.55, h + 2.5)], '#f0e2c8');
  }
  // latch & split
  const m = p.iso(0.5, 0.55, 8);
  p.line([p.iso(0.5, 0.55, 1), p.iso(0.5, 0.55, 15)], shade('#c9b896', -0.3), 0.8);
  p.circle(m.x + 1.5, m.y, 1, IRON, null);
  // the arch itself
  p.line(archPts, p.outline, 4.6);
  p.line(archPts, WHITE, 2.8);
  // climbing roses on the arch
  const r = rng('gate');
  archPts.forEach((q, i) => {
    if (i % 2) return;
    p.ellipse(q.x + (r() - 0.5) * 2, q.y - 1, 2.6, 1.8, i % 4 ? LEAF : LEAF_D, shade(LEAF, -0.45), r() * 3);
  });
  for (const i of [2, 5, 9, 12, 15]) roseHead(p, archPts[i].x, archPts[i].y - 1.5, 2, '#f27a9a');
  const lp = p.iso(0.06, 0.56, 10);
  p.foliage(lp.x, lp.y, 3.5, LEAF, 'gl', 5);
  roseHead(p, lp.x + 1, lp.y - 1, 1.8, '#f27a9a');
}

// ---------------------------------------------------------------------------
// Paths (flat; they fill the footprint diamond edge-to-edge)

function flatTile(p: Pen, base: string, fn: () => void): void {
  flat(p, () => {
    withClip(
      p,
      (c) => c.rect(0, 0, p.fw * 32, p.fh * 32),
      () => {
        p.rect(-1, -1, p.fw * 32 + 2, p.fh * 32 + 2, base, null);
        fn();
      },
    );
  });
}

function pathStone(p: Pen): void {
  const r = rng('stepping');
  for (const [u, v, s] of [
    [0.27, 0.3, 0.9],
    [0.74, 0.38, 0.8],
    [0.42, 0.75, 0.95],
  ]) {
    const q = p.iso(u, v);
    const pts = wobbly(q.x, q.y, 10.5 * s, 5.4 * s, 'st' + u, 9, 0.12);
    p.shadow(q.x, q.y + 2, 12 * s, 6 * s, 0.25);
    shape(p, smoothPath(pts.map((t) => ({ x: t.x, y: t.y + 1.8 }))), STONE_D);
    shape(p, smoothPath(pts), radial(p, q.x, q.y, 10 * s, mix(STONE, '#c9bfa8', r())));
    p.ellipse(q.x - 3 * s, q.y - 1.2 * s, 3 * s, 1.2 * s, rgba('#ffffff', 0.3), null);
    p.circle(q.x + 4 * s, q.y + 1 * s, 0.7, STONE_D, null);
  }
}

function pathBrick(p: Pen): void {
  const r = rng('brick');
  flatTile(p, '#c9b49a', () => {
    for (let row = 0; row < 4; row++) {
      const off = row % 2 ? 8 : 0;
      for (let k = -1; k < 3; k++) {
        const x = k * 16 + off;
        const col = mix('#c8674a', '#b4553c', r());
        p.roundRect(x + 0.8, row * 8 + 0.8, 14.4, 6.4, 1.6, col, shade('#b4553c', -0.35));
        p.line([{ x: x + 2, y: row * 8 + 2 }, { x: x + 13, y: row * 8 + 2 }], rgba('#ffd2b8', 0.45), 0.8);
      }
    }
  });
}

function pathCobble(p: Pen): void {
  const n = 5;
  const cell = 32 / n;
  const jit: [number, number, number, string][] = [];
  const r = rng('cobble');
  for (let i = 0; i < n * n; i++) jit.push([(r() - 0.5) * 1.8, (r() - 0.5) * 1.8, 2.5 + r() * 0.6, mix('#a9a59a', r() < 0.5 ? '#c4b9a0' : '#8f949a', r() * 0.6)]);
  flatTile(p, '#7d7a72', () => {
    for (let i = -1; i <= n; i++) {
      for (let j = -1; j <= n; j++) {
        const [dx, dy, rad, col] = jit[((i + n) % n) * n + ((j + n) % n)];
        const off = j % 2 ? cell / 2 : 0;
        const x = (i + 0.5) * cell + dx + off;
        const y = (j + 0.5) * cell + dy;
        p.circle(x, y, rad, col, shade('#7d7a72', -0.3));
        p.circle(x - rad * 0.3, y - rad * 0.3, rad * 0.45, rgba('#ffffff', 0.22), null);
      }
    }
  });
}

function pathDirt(p: Pen): void {
  const r = rng('dirt');
  flatTile(p, '#c49563', () => {
    for (let i = 0; i < 40; i++) {
      p.circle(2 + r() * 28, 2 + r() * 28, 0.4 + r() * 0.8, r() < 0.5 ? '#a87a4c' : '#d8ad7c', null);
    }
    for (let i = 0; i < 5; i++) {
      const x = 5 + r() * 22;
      const y = 5 + r() * 22;
      p.ellipse(x, y, 1.4, 1.1, '#b1aa9c', '#80766a');
    }
    // faint wheel ruts
    p.line([{ x: 0, y: 11 }, { x: 32, y: 11 }], rgba('#8a5f38', 0.18), 2);
    p.line([{ x: 0, y: 21 }, { x: 32, y: 21 }], rgba('#8a5f38', 0.18), 2);
  });
}

function pathWood(p: Pen): void {
  const r = rng('deck');
  flatTile(p, '#5a3b24', () => {
    const pw = 32 / 5;
    for (let i = 0; i < 5; i++) {
      const joint = [10, 24, 4, 18, 28][i];
      for (const [x0, x1] of [
        [joint - 32, joint],
        [joint, joint + 32],
      ]) {
        const col = mix('#c9925a', '#b07a45', r());
        p.rect(x0 + 0.4, i * pw + 0.5, x1 - x0 - 0.8, pw - 1, col, null);
        p.line([{ x: x0 + 1, y: i * pw + 1.3 }, { x: x1 - 1, y: i * pw + 1.3 }], rgba('#ffe1b8', 0.45), 0.7);
        p.line([{ x: x0 + 3, y: i * pw + 3.6 }, { x: x1 - 6, y: i * pw + 3.6 }], rgba('#8a5a30', 0.35), 0.5);
        p.circle(x0 + 1.6, i * pw + pw / 2, 0.45, '#4a3426', null);
        p.circle(x1 - 1.6, i * pw + pw / 2, 0.45, '#4a3426', null);
      }
    }
  });
}

function pathSand(p: Pen): void {
  const r = rng('sand');
  flatTile(p, '#efd9a2', () => {
    for (let i = 0; i < 50; i++) p.circle(1 + r() * 30, 1 + r() * 30, 0.35 + r() * 0.5, r() < 0.5 ? '#d9bd80' : '#fff1c8', null);
    for (const [x, y] of [
      [8, 20],
      [25, 7],
    ]) {
      p.line([{ x: x - 4, y }, { x: x + 4, y }], rgba('#c9a868', 0.4), 0.6);
      p.line([{ x: x - 3, y: y + 1.6 }, { x: x + 3, y: y + 1.6 }], rgba('#c9a868', 0.4), 0.6);
    }
  });
  // a little shell and starfish
  const s = p.iso(0.3, 0.35);
  shape(
    p,
    (c) => {
      c.moveTo(s.x - 2.6, s.y);
      c.quadraticCurveTo(s.x, s.y - 4, s.x + 2.6, s.y);
      c.quadraticCurveTo(s.x, s.y + 1.4, s.x - 2.6, s.y);
    },
    '#fbd3c4',
    '#c48a78',
    0.7,
  );
  p.line([{ x: s.x, y: s.y + 0.6 }, { x: s.x, y: s.y - 2.4 }], '#c48a78', 0.5);
  const f = p.iso(0.68, 0.62);
  p.save();
  p.ctx.translate(f.x, f.y);
  p.ctx.scale(1, 0.6);
  p.star(0, 0, 3.4, '#f39a6a', '#b8603a');
  p.restore();
}

function pathFlower(p: Pen): void {
  flatTile(p, '#b9a98c', () => {
    for (let i = 0; i < 2; i++) {
      for (let j = 0; j < 2; j++) {
        const x = i * 16;
        const y = j * 16;
        p.roundRect(x + 1, y + 1, 14, 14, 2, (i + j) % 2 ? '#efe4cf' : '#f4ead8', '#a8987a');
        const cx = x + 8;
        const cy = y + 8;
        const pc = (i + j) % 2 ? '#f29ab8' : '#8fb2ec';
        for (let k = 0; k < 6; k++) {
          const a = (k / 6) * TAU;
          p.circle(cx + Math.cos(a) * 3, cy + Math.sin(a) * 3, 2.1, pc, shade(pc, -0.3));
        }
        p.circle(cx, cy, 1.8, '#f7cf4a', shade('#f7cf4a', -0.35));
        for (const [dx, dy] of [
          [-5, -5],
          [5, -5],
          [-5, 5],
          [5, 5],
        ]) {
          p.circle(cx + dx, cy + dy, 0.8, '#9cc48a', null);
        }
      }
    }
  });
}

function picnicBlanket(p: Pen): void {
  const S = 64;
  flat(p, () => {
    p.save();
    p.ctx.translate(S / 2, S / 2);
    p.ctx.rotate(0.06);
    const h = 25;
    p.rect(-h + 1.5, -h + 1.5, h * 2, h * 2, rgba('#2a3a1a', 0.18), null);
    p.rect(-h, -h, h * 2, h * 2, '#fff8ee', null);
    withClip(
      p,
      (c) => c.rect(-h, -h, h * 2, h * 2),
      () => {
        for (let k = -h; k < h; k += 8) {
          p.rect(k, -h, 4, h * 2, rgba('#e2504a', 0.5), null);
          p.rect(-h, k, h * 2, 4, rgba('#e2504a', 0.5), null);
        }
      },
    );
    p.rect(-h, -h, h * 2, h * 2, null, '#a8423a');
    // fringe
    for (let k = -h + 2; k < h; k += 3) {
      p.line([{ x: k, y: h }, { x: k, y: h + 2 }], '#e2504a', 0.8);
      p.line([{ x: h, y: k }, { x: h + 2, y: k }], '#e2504a', 0.8);
    }
    p.restore();
  });
  // plates & treats
  const pl = p.iso(1.25, 1.15);
  p.ellipse(pl.x, pl.y, 7, 3.5, '#ffffff', '#9a9a9a');
  p.ellipse(pl.x, pl.y, 4.5, 2.2, '#f2f2f2', null);
  // sandwich
  p.poly([{ x: pl.x - 3, y: pl.y + 0.5 }, { x: pl.x + 3, y: pl.y - 1 }, { x: pl.x + 2, y: pl.y - 3 }, { x: pl.x - 3, y: pl.y - 1.5 }], '#f3d79a', '#a07a3a');
  p.line([{ x: pl.x - 3, y: pl.y - 0.5 }, { x: pl.x + 2.8, y: pl.y - 2 }], '#7fbf4a', 1);
  const pl2 = p.iso(0.85, 1.4);
  p.ellipse(pl2.x, pl2.y, 6, 3, '#ffffff', '#9a9a9a');
  // pie slice
  p.poly([{ x: pl2.x - 3, y: pl2.y }, { x: pl2.x + 3, y: pl2.y - 1 }, { x: pl2.x + 2, y: pl2.y - 2.6 }], '#e8a85a', '#8a5a2a');
  p.circle(pl2.x + 1, pl2.y - 1.4, 0.8, '#c0304a', null);
  // apples
  for (const [u, v] of [
    [1.5, 0.8],
    [1.6, 0.92],
  ]) {
    const a = p.iso(u, v);
    p.shadow(a.x, a.y + 1, 3, 1.5, 0.3);
    p.ball(a.x, a.y - 2.2, 2.4, '#e34a3c');
    p.line([{ x: a.x, y: a.y - 4.4 }, { x: a.x + 0.6, y: a.y - 5.6 }], '#5a3a22', 0.7);
  }
  // lemonade jug + cup
  const j = p.iso(0.75, 0.8);
  p.shadow(j.x, j.y + 1, 4, 2, 0.3);
  p.cylinder(j.x, j.y, 2.8, 8, '#fff2a8', '#9a8a4a');
  p.ellipse(j.x, j.y - 8, 2.6, 1.3, '#fffbe0', '#9a8a4a');
  p.ctx.beginPath();
  p.ctx.arc(j.x + 3, j.y - 4.5, 2, -1.2, 1.2);
  p.ctx.strokeStyle = '#9a8a4a';
  p.ctx.lineWidth = 0.9;
  p.ctx.stroke();
  // basket at the back
  const b = p.iso(0.62, 0.45);
  p.shadow(b.x, b.y + 1, 9, 4, 0.3);
  p.ctx.beginPath();
  p.ctx.arc(b.x, b.y - 8, 6, Math.PI * 1.05, Math.PI * 1.95);
  p.ctx.strokeStyle = p.outline;
  p.ctx.lineWidth = 2.6;
  p.ctx.stroke();
  p.ctx.strokeStyle = '#c99358';
  p.ctx.lineWidth = 1.3;
  p.ctx.stroke();
  p.roundRect(b.x - 7, b.y - 8, 14, 8, 2, hgrad(p, b.x - 7, b.x + 7, '#d6a066', '#9c6a3c'));
  p.line([{ x: b.x - 7, y: b.y - 4 }, { x: b.x + 7, y: b.y - 4 }], rgba('#6b4422', 0.6), 0.6);
  p.rect(b.x - 7, b.y - 9, 14, 2.5, '#e2504a', '#a8423a');
}

// ---------------------------------------------------------------------------
// Furniture

interface BenchStyle {
  slat: string;
  frame: string;
  kind: 'wood' | 'white' | 'iron';
}

function bench(s: BenchStyle): Painter {
  return (p) => {
    const { x, y } = p.center;
    p.shadow(x, y + 1, 25, 10, 0.24);
    const u0 = 0.12;
    const u1 = 0.88;
    const vb = 0.34;
    const vf = 0.66;
    const seatZ = 9;
    const frame = s.frame;
    const legs = [u0 + 0.03, u1 - 0.09];
    for (const u of legs) p.box(u, vb - 0.02, 0.06, 0.06, s.kind === 'white' ? 20 : 23, frame);
    for (const u of legs) p.box(u, vf - 0.08, 0.06, 0.06, seatZ, frame);
    if (s.kind === 'white') {
      // arched back with spindles
      const top: Pt[] = [];
      for (let i = 0; i <= 12; i++) {
        const t = i / 12;
        top.push(p.iso(u0, vb, 0));
        top.pop();
        top.push(p.iso(u0 + t * (u1 - u0), vb + 0.02, 21 + Math.sin(t * Math.PI) * 5));
      }
      const back = [p.iso(u0, vb + 0.02, 12), p.iso(u1, vb + 0.02, 12), ...top.reverse()];
      p.poly(back, null);
      for (let i = 1; i < 10; i++) {
        const u = u0 + (i / 10) * (u1 - u0);
        const t = i / 10;
        p.line([p.iso(u, vb + 0.02, 12), p.iso(u, vb + 0.02, 21 + Math.sin(t * Math.PI) * 5)], p.outline, 2.4);
        p.line([p.iso(u, vb + 0.02, 12), p.iso(u, vb + 0.02, 21 + Math.sin(t * Math.PI) * 5)], s.slat, 1.2);
      }
      const rail = top.reverse();
      p.line(rail, p.outline, 3.6);
      p.line(rail, s.slat, 2);
      p.line([p.iso(u0, vb + 0.02, 12), p.iso(u1, vb + 0.02, 12)], p.outline, 3.2);
      p.line([p.iso(u0, vb + 0.02, 12), p.iso(u1, vb + 0.02, 12)], s.slat, 1.8);
    } else {
      for (const z of [13, 17.5, 22]) p.box(u0, vb, u1 - u0, 0.04, 3, s.slat, z);
    }
    for (let i = 0; i < 3; i++) p.box(u0, vb + 0.04 + i * 0.09, u1 - u0, 0.085, 2, s.slat, seatZ);
    if (s.kind === 'white') {
      // cushion
      p.box(0.2, 0.42, 0.6, 0.2, 2.2, { top: '#a6d0f0', left: '#7fb2dc', right: '#5f92bc' }, seatZ + 2);
      p.line([p.iso(0.2, 0.52, seatZ + 4.2), p.iso(0.8, 0.52, seatZ + 4.2)], rgba('#ffffff', 0.6), 0.6);
    }
    if (s.kind === 'iron') {
      for (const u of [u0 - 0.01, u1 - 0.03]) {
        const a = p.iso(u, vb, 18);
        const b = p.iso(u, vf - 0.02, 14);
        const c = p.iso(u, (vb + vf) / 2, 20);
        thickCurve(p, a, c, b, frame, 1.4);
        p.circle(b.x, b.y + 1.5, 1.6, null, frame);
        p.line([b, p.iso(u, vf - 0.05, seatZ)], frame, 1.4);
      }
    }
    if (s.kind === 'wood') {
      for (const u of [u0, u1 - 0.04]) {
        p.box(u, vb, 0.04, vf - vb - 0.02, 1.8, s.frame, 15);
        p.box(u + 0.005, vf - 0.08, 0.03, 0.03, 6, s.frame, seatZ + 2);
      }
    }
  };
}

function picnicTable(p: Pen): void {
  const { x, y } = p.center;
  p.shadow(x, y + 1, 44, 17, 0.24);
  const w = WOOD;
  const legs = (v0: number, v1: number) => {
    for (const u of [0.35, 1.6]) p.box(u, v0, 0.06, v1 - v0, 7, WOOD_D);
  };
  legs(0.08, 0.2);
  p.box(0.25, 0.06, 1.5, 0.16, 2, w, 7);
  // table A-frame legs
  for (const u of [0.38, 1.56]) {
    p.line([p.iso(u, 0.3, 0), p.iso(u, 0.5, 13)], p.outline, 3.2);
    p.line([p.iso(u, 0.3, 0), p.iso(u, 0.5, 13)], WOOD_D, 1.8);
  }
  p.box(0.12, 0.28, 1.76, 0.44, 2.4, w, 13);
  for (let i = 1; i < 4; i++) p.line([p.iso(0.12, 0.28 + i * 0.11, 15.4), p.iso(1.88, 0.28 + i * 0.11, 15.4)], shade(w, -0.2), 0.6);
  // gingham runner
  const runner = [p.iso(0.7, 0.28, 15.5), p.iso(1.3, 0.28, 15.5), p.iso(1.3, 0.72, 15.5), p.iso(0.7, 0.72, 15.5)];
  p.poly(runner, '#fff8ee', null);
  withClip(p, polyPath(runner), () => {
    for (let k = 0; k < 6; k++) {
      const u = 0.7 + k * 0.1;
      p.poly([p.iso(u, 0.28, 15.5), p.iso(u + 0.05, 0.28, 15.5), p.iso(u + 0.05, 0.72, 15.5), p.iso(u, 0.72, 15.5)], rgba('#e2504a', 0.5), null);
    }
    for (let k = 0; k < 5; k++) {
      const v = 0.28 + k * 0.1;
      p.poly([p.iso(0.7, v, 15.5), p.iso(1.3, v, 15.5), p.iso(1.3, v + 0.05, 15.5), p.iso(0.7, v + 0.05, 15.5)], rgba('#e2504a', 0.5), null);
    }
  });
  p.line([p.iso(0.7, 0.72, 15.5), p.iso(0.7, 0.72, 11.5)], '#e2504a', 1);
  p.poly([p.iso(0.7, 0.72, 15.5), p.iso(1.3, 0.72, 15.5), p.iso(1.3, 0.72, 12.5), p.iso(0.7, 0.72, 12.5)], '#f5ded6', '#a8423a');
  // pie & lemonade
  const pie = p.iso(1.05, 0.48, 15.5);
  p.cylinder(pie.x, pie.y, 5, 2.4, '#e8a85a');
  for (let k = -1; k <= 1; k++) p.line([{ x: pie.x - 3.5, y: pie.y - 2.4 + k * 1.2 }, { x: pie.x + 3.5, y: pie.y - 2.4 + k * 1.2 }], '#c97a3a', 0.6);
  const jug = p.iso(0.45, 0.42, 15.5);
  p.cylinder(jug.x, jug.y, 2.6, 8, '#fff2a8', '#9a8a4a');
  p.ellipse(jug.x, jug.y - 8, 2.3, 1.1, '#fffbe0', null);
  const cup = p.iso(1.55, 0.55, 15.5);
  p.cylinder(cup.x, cup.y, 1.6, 3, '#f3a6c0');
  legs(0.8, 0.92);
  p.box(0.25, 0.78, 1.5, 0.16, 2, w, 7);
}

function gardenChair(p: Pen): void {
  const { x, y } = p.center;
  p.shadow(x, y + 1, 14, 6, 0.26);
  const mint = '#7fcdb5';
  const o = shade(mint, -0.55);
  const sz = 11;
  const seatY = y - sz;
  // back hoop (behind)
  const bx = x;
  const by = seatY - 4;
  thickCurve(p, { x: bx - 8, y: by + 1 }, { x: bx - 10, y: by - 20 }, { x: bx, y: by - 19 }, mint, 1.6);
  thickCurve(p, { x: bx, y: by - 19 }, { x: bx + 10, y: by - 20 }, { x: bx + 8, y: by + 1 }, mint, 1.6);
  // curly heart inside the back
  p.heart(bx, by - 10, 4, null, mint);
  p.ctx.lineWidth = 1;
  p.line([{ x: bx, y: by - 7 }, { x: bx, y: by }], mint, 1);
  // legs
  for (const [dx, dy] of [
    [-7, -1],
    [7, -1],
    [-5, 3],
    [5, 3],
  ]) {
    const top = { x: x + dx * 0.8, y: seatY + dy * 0.6 };
    const bot = { x: x + dx, y: y + dy };
    p.line([top, bot], o, 2.4);
    p.line([top, bot], mint, 1.2);
  }
  // round seat
  p.ellipse(x, seatY + 1.4, 9, 4.5, shade(mint, -0.25), p.outline);
  p.ellipse(x, seatY, 9, 4.5, mint, p.outline);
  p.ellipse(x, seatY, 6.5, 3.2, '#f6a6c0', shade('#f6a6c0', -0.4));
  p.circle(x, seatY, 0.7, shade('#f6a6c0', -0.3), null);
}

function deckChair(p: Pen): void {
  const { x, y } = p.center;
  p.shadow(x, y + 1, 18, 8, 0.24);
  const wood = WOOD_L;
  const uL = 0.33;
  const uR = 0.67;
  // back legs & frame
  for (const u of [uL, uR]) {
    thick(p, [p.iso(u, 0.28, 0), p.iso(u, 0.3, 24)], wood, 1.6);
  }
  for (const u of [uL, uR]) {
    thick(p, [p.iso(u, 0.78, 0), p.iso(u, 0.45, 16)], wood, 1.6);
  }
  // striped sling
  const stripes = 6;
  for (let i = 0; i < stripes; i++) {
    const u0 = uL + ((uR - uL) * i) / stripes;
    const u1 = uL + ((uR - uL) * (i + 1)) / stripes;
    const top0 = p.iso(u0, 0.3, 23);
    const top1 = p.iso(u1, 0.3, 23);
    const bot0 = p.iso(u0, 0.74, 9);
    const bot1 = p.iso(u1, 0.74, 9);
    const sag = 5;
    shape(
      p,
      (c) => {
        c.moveTo(top0.x, top0.y);
        c.lineTo(top1.x, top1.y);
        c.quadraticCurveTo((top1.x + bot1.x) / 2 + 1, (top1.y + bot1.y) / 2 + sag, bot1.x, bot1.y);
        c.lineTo(bot0.x, bot0.y);
        c.quadraticCurveTo((top0.x + bot0.x) / 2 + 1, (top0.y + bot0.y) / 2 + sag, top0.x, top0.y);
        c.closePath();
      },
      i % 2 ? '#fdf6ea' : '#4f8fd8',
      null,
    );
  }
  const tl = p.iso(uL, 0.3, 23);
  const tr = p.iso(uR, 0.3, 23);
  const bl = p.iso(uL, 0.74, 9);
  const br = p.iso(uR, 0.74, 9);
  p.curve(tl, { x: (tl.x + bl.x) / 2 + 1, y: (tl.y + bl.y) / 2 + 5 }, bl, p.outline, 1);
  p.curve(tr, { x: (tr.x + br.x) / 2 + 1, y: (tr.y + br.y) / 2 + 5 }, br, p.outline, 1);
  thick(p, [tl, tr], wood, 1.6);
  thick(p, [bl, br], wood, 1.6);
  // front legs
  for (const u of [uL, uR]) thick(p, [p.iso(u, 0.74, 9), p.iso(u, 0.62, 0)], wood, 1.6);
  // a little pillow
  const pi = p.iso(0.5, 0.36, 22);
  p.roundRect(pi.x - 5, pi.y - 2, 10, 5, 2.5, '#f7d36a', shade('#f7d36a', -0.45));
}

function cafeTable(p: Pen): void {
  const { x, y } = p.center;
  p.shadow(x, y + 1, 24, 10, 0.24);
  const chair = (cx: number, cy: number, dir: number) => {
    const col = '#3d4549';
    p.line([{ x: cx - 3, y: cy }, { x: cx - 3, y: cy - 8 }], col, 1.2);
    p.line([{ x: cx + 3, y: cy + 1 }, { x: cx + 3, y: cy - 8 }], col, 1.2);
    p.ellipse(cx, cy - 8, 4.5, 2.2, '#e8eef0', col);
    const bx = cx + dir * 4;
    thickCurve(p, { x: bx, y: cy - 8 }, { x: bx + dir * 2, y: cy - 16 }, { x: bx - dir * 1, y: cy - 18 }, col, 0.9);
  };
  chair(x - 18, y + 2, -1);
  // table
  p.line([{ x, y: y - 1 }, { x, y: y - 14 }], p.outline, 3.6);
  p.line([{ x, y: y - 1 }, { x, y: y - 14 }], IRON, 2);
  p.ellipse(x, y, 5, 2, IRON, null);
  p.ellipse(x, y - 14, 11, 5.5, shade(WHITE, -0.15), p.outline);
  p.ellipse(x, y - 15.3, 11, 5.5, WHITE, p.outline);
  // cups & a croissant
  p.cylinder(x - 5, y - 15, 1.5, 2.4, '#f39a6a');
  p.cylinder(x + 4, y - 16, 1.5, 2.4, '#7fb2dc');
  p.ellipse(x - 0.5, y - 13.5, 2.6, 1.4, '#e2a256', '#9a6428', -0.2);
  chair(x + 18, y + 3, 1);
  // parasol pole
  thick(p, [{ x, y: y - 16 }, { x, y: y - 52 }], WHITE, 1.2);
  // canopy
  const cy = y - 46;
  const rx = 27;
  const ry = 10;
  const apex = { x, y: cy - 14 };
  const n = 8;
  const wedges: { a0: number; a1: number; mid: number }[] = [];
  for (let i = 0; i < n; i++) {
    const a0 = (i / n) * TAU;
    const a1 = ((i + 1) / n) * TAU;
    wedges.push({ a0, a1, mid: Math.sin((a0 + a1) / 2) });
  }
  wedges.sort((a, b) => a.mid - b.mid);
  for (const w of wedges) {
    const i = Math.round((w.a0 / TAU) * n);
    const p0 = { x: x + Math.cos(w.a0) * rx, y: cy + Math.sin(w.a0) * ry };
    const p1 = { x: x + Math.cos(w.a1) * rx, y: cy + Math.sin(w.a1) * ry };
    const pm = { x: x + Math.cos((w.a0 + w.a1) / 2) * rx * 1.02, y: cy + Math.sin((w.a0 + w.a1) / 2) * ry * 1.02 + 3 };
    const col = i % 2 ? '#fdf3e4' : '#e8574e';
    const lit = Math.cos((w.a0 + w.a1) / 2) < 0 ? 0.06 : -0.1;
    shape(
      p,
      (c) => {
        c.moveTo(apex.x, apex.y);
        c.lineTo(p0.x, p0.y);
        c.quadraticCurveTo(pm.x, pm.y, p1.x, p1.y);
        c.closePath();
      },
      shade(col, lit),
    );
  }
  p.circle(apex.x, apex.y - 1, 1.8, WHITE);
}

function hammock(p: Pen): void {
  lineShadow(p, 0.1, 1.9, 0.5, 9, 0.16);
  const post = (u: number) => {
    const q = p.iso(u, 0.5);
    p.cylinder(q.x, q.y, 2.6, 32, WOOD_D);
  };
  post(0.12);
  const zEnd = 24;
  const n = 16;
  const pts = (side: number) => {
    const res: Pt[] = [];
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const u = 0.35 + t * 1.3;
      const w = 0.25 * Math.sin(t * Math.PI) + 0.02;
      const z = 21 - Math.sin(t * Math.PI) * 13;
      res.push(p.iso(u, 0.5 + side * w, z));
    }
    return res;
  };
  const back = pts(-1);
  const front = pts(1);
  // ropes
  const a0 = p.iso(0.12, 0.5, zEnd + 4);
  const a1 = p.iso(1.88, 0.5, zEnd + 4);
  for (const q of [back[0], front[0]]) p.line([a0, q], '#c8b28a', 0.9);
  // fabric stripes
  const cols = ['#f28a8a', '#f7c86a', '#9ad08a', '#7fb2dc', '#b9a0e0'];
  for (let i = 0; i < n; i++) {
    const quad = [back[i], back[i + 1], front[i + 1], front[i]];
    p.poly(quad, cols[Math.floor(i / 3.2) % cols.length], null);
  }
  p.line(back, p.outline, 1);
  p.line(front, p.outline, 1.2);
  p.line([back[0], front[0]], p.outline, 1);
  p.line([back[n], front[n]], p.outline, 1);
  // fringe along the front edge
  for (let i = 2; i < n - 1; i += 2) p.line([front[i], { x: front[i].x, y: front[i].y + 2.5 }], '#f7e7c8', 0.8);
  // pillow
  const pq = lerp(back[3], front[3], 0.5);
  p.roundRect(pq.x - 6, pq.y - 4, 11, 5, 2.5, '#fdf6ea', '#a89a80');
  for (const q of [back[n], front[n]]) p.line([a1, q], '#c8b28a', 0.9);
  post(1.88);
}

function treeSwing(p: Pen): void {
  const { x, y } = p.center;
  p.shadow(x - 2, y, 26, 11, 0.22);
  const tx = x - 13;
  const ty = y - 3;
  tuft(p, tx - 6, ty + 3, 5);
  trunk(p, tx, ty, 9, 46, BARK);
  p.foliage(tx + 6, ty - 58, 19, '#5aaa48', 'swing1', 9);
  p.foliage(x + 13, ty - 50, 12, '#5aaa48', 'swing2', 7);
  p.foliage(tx - 4, ty - 46, 10, '#5aaa48', 'swing3', 7);
  // branch reaching right, under the canopy
  const b0 = { x: tx + 2, y: ty - 32 };
  const b1 = { x: x + 25, y: ty - 38 };
  thickCurve(p, b0, { x: (b0.x + b1.x) / 2, y: ty - 40 }, b1, BARK, 3);
  p.ellipse(b1.x + 1, b1.y - 1, 2.6, 1.6, LEAF, shade(LEAF, -0.4), -0.4);
  const branchY = (bx: number) => qpt(b0, { x: (b0.x + b1.x) / 2, y: ty - 40 }, b1, (bx - b0.x) / (b1.x - b0.x)).y + 1;
  // swing seat hanging below
  const s0 = p.iso(0.58, 0.39, 9);
  const s1 = p.iso(0.84, 0.39, 9);
  for (const s of [s0, s1]) {
    const top = { x: s.x, y: branchY(s.x) };
    p.line([top, s], '#d6c08f', 1);
    p.ellipse(top.x, top.y, 1.3, 2, null, '#a08a5a');
  }
  p.box(0.55, 0.33, 0.32, 0.12, 2, '#e07a4a', 8);
  p.line([p.iso(0.55, 0.45, 9), p.iso(0.87, 0.45, 9)], rgba('#ffffff', 0.35), 0.6);
  // a few flowers at the base
  p.flower(tx - 8, ty + 4, 2.2, '#f48fb8');
  p.flower(tx + 8, ty + 5, 2.2, '#ffffff');
  p.flower(x + 14, y + 6, 2, '#f8d442');
}

function rockingChair(p: Pen): void {
  const { x, y } = p.center;
  p.shadow(x, y + 1, 16, 7, 0.26);
  const w = '#a8643a';
  const rocker = (u: number) => {
    const pts: Pt[] = [];
    for (let i = 0; i <= 10; i++) {
      const t = i / 10;
      const v = 0.18 + t * 0.66;
      const z = Math.pow((t - 0.55) * 2, 2) * 3;
      pts.push(p.iso(u, v, z));
    }
    thick(p, pts, w, 1.8);
  };
  rocker(0.32);
  // back spindles
  const vb = 0.36;
  for (const u of [0.32, 0.68]) thick(p, [p.iso(u, vb, 2), p.iso(u, vb - 0.04, 33)], w, 1.6);
  for (let i = 1; i < 5; i++) {
    const u = 0.32 + i * 0.072;
    thick(p, [p.iso(u, vb, 12), p.iso(u, vb - 0.04, 29)], shade(w, 0.1), 0.9);
  }
  thick(p, [p.iso(0.3, vb - 0.04, 31), p.iso(0.7, vb - 0.04, 31)], w, 2.4);
  // knitted blanket over the back
  const bk = [p.iso(0.38, vb - 0.02, 28), p.iso(0.6, vb - 0.02, 28), p.iso(0.62, vb + 0.02, 14), p.iso(0.4, vb + 0.02, 13)];
  p.poly(bk, '#e86a6a', p.outline);
  withClip(p, polyPath(bk), () => {
    for (let z = 15; z < 28; z += 3) p.line([p.iso(0.36, vb, z), p.iso(0.64, vb, z)], '#fbe8d0', 1);
  });
  for (let i = 0; i < 4; i++) {
    const q = lerp(bk[3], bk[2], i / 3);
    p.line([q, { x: q.x, y: q.y + 2 }], '#fbe8d0', 0.8);
  }
  // seat + legs
  for (const [u, v] of [
    [0.34, 0.42],
    [0.66, 0.42],
    [0.34, 0.7],
    [0.66, 0.7],
  ]) {
    thick(p, [p.iso(u, v, 2), p.iso(u, v, 10)], w, 1.2);
  }
  p.box(0.3, 0.36, 0.4, 0.38, 2.2, w, 10);
  p.box(0.34, 0.4, 0.32, 0.3, 1.8, { top: '#f6d07a', left: '#d9a94a', right: '#b88a30' }, 12.2);
  // arms
  for (const u of [0.3, 0.66]) p.box(u, 0.36, 0.04, 0.34, 1.6, w, 19);
  for (const u of [0.31, 0.67]) thick(p, [p.iso(u, 0.68, 12), p.iso(u, 0.68, 19)], w, 1);
  rocker(0.68);
}

function littleLibrary(p: Pen): void {
  const { x, y } = p.center;
  p.shadow(x, y + 1, 13, 6, 0.26);
  tuft(p, x - 6, y + 2, 5);
  p.box(0.45, 0.45, 0.1, 0.1, 22, WOOD_D);
  const z0 = 22;
  const ht = 18;
  const col = '#4f8fbf';
  p.box(0.22, 0.3, 0.56, 0.4, ht, col, z0);
  // glass door on the front face (v = 0.7)
  const door = faceV(p, 0.27, 0.73, 0.7, z0 + 2, z0 + ht - 2);
  p.poly(door, '#f7f0e0');
  const bookCols = ['#e8574e', '#f7c86a', '#6fb36a', '#9a7ae0', '#f39a6a', '#4f8fd8', '#f48fb8'];
  const r = rng('books');
  for (const [zb, zt] of [
    [z0 + 2.5, z0 + 9],
    [z0 + 10, z0 + 15.5],
  ]) {
    let u = 0.29;
    let i = 0;
    while (u < 0.7) {
      const w = 0.035 + r() * 0.025;
      const h = zb + (zt - zb) * (0.75 + r() * 0.25);
      p.poly(faceV(p, u, Math.min(u + w, 0.71), 0.7, zb, h), bookCols[i++ % bookCols.length], shade('#4a3426', 0.1), 0.5);
      u += w + 0.004;
    }
    p.poly(faceV(p, 0.27, 0.73, 0.7, zb - 0.8, zb), WOOD, null);
  }
  p.poly(door, rgba('#dff4ff', 0.25), p.outline);
  p.line([p.iso(0.3, 0.7, z0 + ht - 4), p.iso(0.4, 0.7, z0 + ht - 2.5)], rgba('#ffffff', 0.7), 0.8);
  const k = p.iso(0.7, 0.7, z0 + 8);
  p.circle(k.x - 1, k.y, 0.9, BRASS, null);
  p.gableRoof(0.22, 0.3, 0.56, 0.4, z0 + ht, 9, '#d9574a', col, 0.08);
  // heart on the gable
  const hq = p.iso(0.78, 0.5, z0 + ht + 3.5);
  p.heart(hq.x, hq.y, 1.8, '#f9e6c8', null);
}

function teaSet(p: Pen): void {
  const { x, y } = p.center;
  p.shadow(x, y + 1, 22, 10, 0.24);
  const tz = 14;
  const ty = y - tz;
  // tablecloth skirt
  shape(
    p,
    (c) => {
      c.moveTo(x - 17, ty);
      c.lineTo(x - 17, y - 3);
      for (let i = 0; i < 8; i++) {
        const x0 = x - 17 + i * 4.25;
        c.quadraticCurveTo(x0 + 2.1, y + 1.5 + Math.sin((i / 7) * Math.PI) * 2, x0 + 4.25, y - 3 + Math.sin(((i + 1) / 8) * Math.PI) * 2);
      }
      c.lineTo(x + 17, ty);
      c.closePath();
    },
    hgrad(p, x - 17, x + 17, '#fdf8f0', '#e4d6c8', '#f6eee2'),
  );
  p.ellipse(x, ty, 17, 8.5, '#fffaf2', p.outline);
  p.ellipse(x, ty, 13, 6.5, null, rgba('#f48fb8', 0.6));
  // cake stand at the back
  const cs = { x: x + 6, y: ty - 3 };
  p.line([{ x: cs.x, y: cs.y }, { x: cs.x, y: cs.y - 9 }], '#c9b07a', 1);
  p.ellipse(cs.x, cs.y - 4, 5, 2, WHITE, '#a89a80');
  p.cylinder(cs.x - 1.5, cs.y - 4.5, 1.5, 2, '#f6a6c0');
  p.cylinder(cs.x + 2, cs.y - 4.8, 1.5, 2, '#f7d36a');
  p.ellipse(cs.x, cs.y - 9, 3.4, 1.4, WHITE, '#a89a80');
  p.circle(cs.x, cs.y - 10.6, 1.3, '#e8574e', null);
  // teapot
  const tp = { x: x - 4, y: ty - 1 };
  p.curve({ x: tp.x + 4.5, y: tp.y - 4 }, { x: tp.x + 8.5, y: tp.y - 4 }, { x: tp.x + 4.5, y: tp.y - 1 }, p.outline, 2.2);
  p.curve({ x: tp.x + 4.5, y: tp.y - 4 }, { x: tp.x + 8.5, y: tp.y - 4 }, { x: tp.x + 4.5, y: tp.y - 1 }, '#f6b3c8', 1.1);
  thick(p, [{ x: tp.x - 4, y: tp.y - 3 }, { x: tp.x - 8, y: tp.y - 7 }], '#f6b3c8', 1.3);
  p.ball(tp.x, tp.y - 3.5, 5, '#f6b3c8');
  for (const [dx, dy] of [
    [-2, -4],
    [1.5, -2],
    [2, -6],
    [-1, -1],
  ]) {
    p.circle(tp.x + dx, tp.y + dy, 0.6, '#ffffff', null);
  }
  p.ellipse(tp.x, tp.y - 8, 2.6, 1.1, '#f9cada', p.outline);
  p.circle(tp.x, tp.y - 9.4, 1, WHITE, p.outline);
  // cups
  for (const [dx, dy] of [
    [-10, 2],
    [7, 3],
  ]) {
    const cx = x + dx;
    const cy = ty + dy;
    p.ellipse(cx, cy, 3.4, 1.6, WHITE, '#a89a80');
    p.cylinder(cx, cy - 0.3, 2, 2.4, '#ffffff', '#8a7a64');
    p.ellipse(cx, cy - 2.7, 1.5, 0.7, '#b9773a', null);
    p.ctx.beginPath();
    p.ctx.arc(cx + 2.4, cy - 1.4, 0.9, -1.4, 1.4);
    p.ctx.strokeStyle = '#8a7a64';
    p.ctx.lineWidth = 0.7;
    p.ctx.stroke();
  }
  // steam
  p.curve({ x: x - 10, y: ty - 3 }, { x: x - 12, y: ty - 6 }, { x: x - 10, y: ty - 9 }, rgba('#ffffff', 0.8), 0.8);
}

// ---------------------------------------------------------------------------
// Lights

function lampHead(p: Pen, x: number, y: number, w: number, h: number, frame: string): void {
  p.glow(x, y - h / 2, 22, GLOW, 0.5);
  p.poly(
    [
      { x: x - w / 2, y: y - h },
      { x: x + w / 2, y: y - h },
      { x: x + w * 0.35, y },
      { x: x - w * 0.35, y },
    ],
    p.vgrad(y - h, y, '#fff6c8', '#ffcf6a'),
    frame,
  );
  p.line([{ x, y: y - h }, { x, y }], frame, 0.9);
  p.glow(x, y - h / 2, 6, '#ffffff', 0.7);
}

function streetLamp(p: Pen): void {
  const { x, y } = p.center;
  const g = '#2f4f4a';
  p.glow(x, y, 20, GLOW, 0.22);
  p.shadow(x, y + 1, 9, 4.5, 0.3);
  p.cylinder(x, y, 4.5, 4, g);
  p.cylinder(x, y - 4, 3, 3, g);
  p.roundRect(x - 1.5, y - 54, 3, 50, 1, hgrad(p, x - 1.5, x + 1.5, '#4a6e68', '#22403a'));
  // scroll arms
  p.curve({ x: x - 1, y: y - 46 }, { x: x - 7, y: y - 46 }, { x: x - 5, y: y - 50 }, g, 1.2);
  p.curve({ x: x + 1, y: y - 46 }, { x: x + 7, y: y - 46 }, { x: x + 5, y: y - 50 }, g, 1.2);
  lampHead(p, x, y - 56, 10, 11, g);
  // cap
  p.poly(
    [
      { x: x - 7, y: y - 67 },
      { x: x + 7, y: y - 67 },
      { x: x + 3, y: y - 72 },
      { x: x - 3, y: y - 72 },
    ],
    g,
  );
  p.circle(x, y - 73.5, 1.8, g);
  p.rect(x - 4.5, y - 57, 9, 1.6, g, null);
  // flowers at the foot
  p.flower(x - 7, y + 1, 2, '#f25c9a');
  p.flower(x + 6, y + 2, 2, '#ffffff');
}

function gardenLantern(p: Pen): void {
  const { x, y } = p.center;
  p.glow(x + 5, y - 2, 16, GLOW, 0.2);
  p.shadow(x - 4, y + 1, 6, 3, 0.3);
  tuft(p, x - 4, y + 2, 5);
  const px = x - 4;
  p.roundRect(px - 2, y - 40, 4, 41, 1, hgrad(p, px - 2, px + 2, WOOD_L, WOOD_D));
  p.roundRect(px - 2.6, y - 42, 5.2, 3, 1, WOOD_D);
  // arm
  thick(p, [{ x: px, y: y - 36 }, { x: px + 12, y: y - 36 }], WOOD_D, 1.4);
  p.line([{ x: px + 1, y: y - 31 }, { x: px + 6, y: y - 36 }], WOOD_D, 1.2);
  const lx = px + 11;
  p.line([{ x: lx, y: y - 36 }, { x: lx, y: y - 33 }], IRON, 0.8);
  p.ellipse(lx, y - 32, 1.6, 1.2, null, IRON);
  // lantern
  const top = y - 31;
  p.glow(lx, top + 8, 16, GLOW, 0.55);
  p.poly(
    [
      { x: lx - 5, y: top + 3 },
      { x: lx + 5, y: top + 3 },
      { x: lx + 4, y: top + 14 },
      { x: lx - 4, y: top + 14 },
    ],
    p.vgrad(top + 3, top + 14, '#fff6c8', '#ffd27a'),
    IRON,
  );
  p.line([{ x: lx, y: top + 3 }, { x: lx, y: top + 14 }], IRON, 0.8);
  p.rect(lx - 1, top + 8, 2, 4, '#fffaf0', null);
  p.ellipse(lx, top + 7, 1, 1.6, '#ff9a3a', null);
  p.poly(
    [
      { x: lx - 6, y: top + 3 },
      { x: lx + 6, y: top + 3 },
      { x: lx + 2, y: top },
      { x: lx - 2, y: top },
    ],
    IRON,
  );
  p.rect(lx - 4.5, top + 14, 9, 1.6, IRON, null);
}

function stoneLantern(p: Pen): void {
  const { x, y } = p.center;
  p.glow(x, y - 28, 24, GLOW, 0.3);
  p.shadow(x, y + 1, 15, 7, 0.3);
  p.box(0.28, 0.28, 0.44, 0.44, 4, STONE);
  p.box(0.33, 0.33, 0.34, 0.34, 2, STONE_L, 4);
  p.cylinder(x, y - 6, 3.6, 13, STONE);
  for (const k of [3, 9]) p.line([{ x: x - 3.6, y: y - 6 - k }, { x: x + 3.6, y: y - 6 - k }], shade(STONE, -0.3), 0.6);
  p.box(0.27, 0.27, 0.46, 0.46, 3.5, STONE, 19);
  // fire box with glowing windows
  const z0 = 22.5;
  const z1 = 37;
  p.box(0.32, 0.32, 0.36, 0.36, z1 - z0, STONE, z0);
  const win = faceV(p, 0.38, 0.62, 0.68, z0 + 2.5, z1 - 4);
  const win2 = faceU(p, 0.68, 0.38, 0.62, z0 + 2.5, z1 - 4);
  const wc = { x: (win[0].x + win[2].x) / 2, y: (win[0].y + win[2].y) / 2 };
  p.glow(wc.x, wc.y, 12, GLOW, 0.75);
  p.poly(win, p.vgrad(win[3].y, win[0].y, '#fff6c8', '#ffcf6a'), shade(STONE, -0.45));
  p.poly(win2, p.vgrad(win2[3].y, win2[0].y, '#ffe8a0', '#f5b84a'), shade(STONE, -0.45));
  p.line([lerp(win[0], win[1], 0.5), lerp(win[3], win[2], 0.5)], shade(STONE, -0.3), 0.8);
  // roof with upturned corners
  const z = z1 + 1.5;
  const o = 0.13;
  const l = p.iso(0.32 - o, 0.68 + o, z);
  const b = p.iso(0.68 + o, 0.68 + o, z);
  const r = p.iso(0.68 + o, 0.32 - o, z);
  const peak = p.iso(0.5, 0.5, z + 11);
  p.poly([p.iso(0.32 - o, 0.68 + o, z - 1.6), p.iso(0.68 + o, 0.68 + o, z - 1.6), p.iso(0.68 + o, 0.32 - o, z - 1.6), r, b, l], shade(STONE, -0.35));
  shape(
    p,
    (c) => {
      c.moveTo(l.x - 2, l.y - 3.5);
      c.quadraticCurveTo(l.x + 3, l.y + 0.5, b.x, b.y + 0.5);
      c.quadraticCurveTo((b.x + peak.x) / 2 + 2, (b.y + peak.y) / 2, peak.x, peak.y);
      c.quadraticCurveTo((l.x + peak.x) / 2 + 2, (l.y + peak.y) / 2 + 1, l.x - 2, l.y - 3.5);
      c.closePath();
    },
    p.vgrad(peak.y, b.y, STONE_L, STONE),
  );
  shape(
    p,
    (c) => {
      c.moveTo(b.x, b.y + 0.5);
      c.quadraticCurveTo(r.x - 3, r.y + 0.5, r.x + 2, r.y - 3.5);
      c.quadraticCurveTo((r.x + peak.x) / 2 - 2, (r.y + peak.y) / 2 + 1, peak.x, peak.y);
      c.quadraticCurveTo((b.x + peak.x) / 2 + 2, (b.y + peak.y) / 2, b.x, b.y + 0.5);
      c.closePath();
    },
    shade(STONE, -0.2),
  );
  // jewel finial
  p.cylinder(peak.x, peak.y + 1, 2.2, 1.6, STONE);
  p.ball(peak.x, peak.y - 2.6, 2.6, STONE_L);
  p.ellipse(peak.x, peak.y - 5.6, 0.9, 1.4, STONE_L, p.outline);
  // moss
  p.ellipse(l.x + 8, l.y - 4, 4.5, 1.6, MOSS, shade(MOSS, -0.35), -0.35);
  p.ellipse(peak.x - 2, peak.y + 4, 2.6, 1.1, MOSS, null, -0.3);
  p.ellipse(x - 7, y - 3, 3, 1.3, MOSS, shade(MOSS, -0.35));
  tuft(p, x + 11, y + 3, 4);
}

function fireflyJar(p: Pen): void {
  const { x, y } = p.center;
  p.glow(x, y - 9, 20, '#e8ff8a', 0.45);
  p.shadow(x, y + 1, 9, 4, 0.25);
  tuft(p, x - 8, y + 3, 5);
  const jx = x;
  const h = 16;
  p.glow(jx, y - 8, 9, '#f4ff9a', 0.7);
  // jar glass
  shape(
    p,
    (c) => {
      c.moveTo(jx - 5, y - h + 2);
      c.quadraticCurveTo(jx - 7, y - h + 4, jx - 7, y - h + 7);
      c.lineTo(jx - 7, y - 1);
      c.ellipse(jx, y - 1, 7, 3.5, 0, Math.PI, 0, true);
      c.lineTo(jx + 7, y - h + 7);
      c.quadraticCurveTo(jx + 7, y - h + 4, jx + 5, y - h + 2);
      c.closePath();
    },
    rgba('#cfeee8', 0.4),
    '#5a7a76',
  );
  const r = rng('fireflies');
  for (let i = 0; i < 6; i++) {
    const fx = jx - 4.5 + r() * 9;
    const fy = y - 12 + r() * 10;
    p.glow(fx, fy, 3.6, '#f4ff7a', 0.9);
    p.circle(fx, fy, 0.9, '#fbffc8', null);
  }
  p.line([{ x: jx - 5, y: y - 10 }, { x: jx - 5, y: y - 3 }], rgba('#ffffff', 0.7), 1);
  // lid
  p.cylinder(jx, y - h + 2, 5.2, 2.6, '#c9a24a');
  // wire handle
  p.ctx.beginPath();
  p.ctx.ellipse(jx, y - h + 1, 5, 6, 0, Math.PI, 0);
  p.ctx.strokeStyle = '#7a7f84';
  p.ctx.lineWidth = 0.8;
  p.ctx.stroke();
  // escaped fireflies
  for (const [dx, dy] of [
    [-12, -20],
    [10, -24],
    [14, -10],
  ]) {
    p.glow(x + dx, y + dy, 4, '#f4ff7a', 0.8);
    p.circle(x + dx, y + dy, 0.9, '#fbffc8', null);
  }
}

function stringLights(p: Pen): void {
  lineShadow(p, 0.1, 1.9, 0.5, 6, 0.1);
  const post = (u: number) => {
    const q = p.iso(u, 0.5);
    p.shadow(q.x, q.y + 1, 6, 3, 0.3);
    p.box(u - 0.04, 0.46, 0.08, 0.08, 44, WOOD);
    // planter at its foot
    p.box(u - 0.1, 0.5, 0.2, 0.14, 5, '#d9824f');
    const f = p.iso(u, 0.57, 5);
    p.foliage(f.x, f.y - 2, 4, LEAF, 'sl' + u, 5);
    p.flower(f.x - 1, f.y - 3, 1.6, '#f48fb8');
  };
  post(0.1);
  const a = p.iso(0.1, 0.5, 42);
  const b = p.iso(1.9, 0.5, 42);
  const c = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 + 22 };
  p.curve(a, c, b, '#3d3a36', 0.9);
  const cols = ['#ffd27a', '#f6a6c0', '#a6e0c8', '#ffd27a', '#a6c8f0', '#f9b878'];
  for (let i = 1; i < 12; i++) {
    const q = qpt(a, c, b, i / 12);
    const col = cols[i % cols.length];
    p.glow(q.x, q.y + 3, 8, col, 0.5);
    p.line([q, { x: q.x, y: q.y + 1.2 }], '#3d3a36', 1);
    p.ellipse(q.x, q.y + 3, 1.6, 2.2, col, shade(col, -0.45));
    p.circle(q.x - 0.4, q.y + 2.4, 0.6, '#ffffff', null);
  }
  post(1.9);
}

function campfire(p: Pen): void {
  const { x, y } = p.center;
  p.glow(x, y - 6, 30, '#ffb04a', 0.35);
  p.ellipse(x, y, 12, 6, '#5a4a3a', null);
  const stones: Pt[] = [];
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * TAU;
    stones.push({ x: x + Math.cos(a) * 13, y: y + Math.sin(a) * 6.5 });
  }
  const back = stones.filter((s) => s.y <= y);
  const front = stones.filter((s) => s.y > y);
  for (const s of back) p.ellipse(s.x, s.y - 1, 3.6, 2.6, radial(p, s.x, s.y - 1, 3.6, STONE), STONE_D);
  // logs
  for (const [dx0, dx1, dy] of [
    [-8, 7, -1],
    [7, -6, 1],
  ]) {
    const a = { x: x + dx0, y: y + dy + 1 };
    const b = { x: x + dx1, y: y - dy - 4 };
    thick(p, [a, b], '#8a5a34', 3);
    p.ellipse(a.x, a.y, 1.6, 1.8, '#e8c08a', '#6a4424');
  }
  // flames
  const flame = (fx: number, fy: number, h: number, w: number, col: string) =>
    shape(
      p,
      (c) => {
        c.moveTo(fx, fy - h);
        c.quadraticCurveTo(fx + w * 1.2, fy - h * 0.4, fx + w * 0.8, fy - h * 0.1);
        c.quadraticCurveTo(fx, fy + 1, fx - w * 0.8, fy - h * 0.1);
        c.quadraticCurveTo(fx - w * 1.2, fy - h * 0.4, fx, fy - h);
      },
      col,
      null,
    );
  flame(x - 3, y - 2, 13, 4, '#f26a2a');
  flame(x + 3.5, y - 2, 15, 4.5, '#f26a2a');
  flame(x, y - 1, 19, 5.5, '#f8892e');
  flame(x, y - 2, 13, 4, '#fbc53a');
  flame(x, y - 2.5, 7, 2.3, '#fff3b0');
  for (const [dx, dy] of [
    [-5, -22],
    [4, -26],
    [1, -30],
  ]) {
    p.circle(x + dx, y + dy, 0.8, '#ffcf6a', null);
  }
  for (const s of front) p.ellipse(s.x, s.y - 1, 3.8, 2.7, radial(p, s.x, s.y - 1, 3.8, STONE), STONE_D);
}

// ---------------------------------------------------------------------------
// Water

function waterEllipse(p: Pen, x: number, y: number, rx: number, ry: number): void {
  const g = p.ctx.createRadialGradient(x - rx * 0.2, y - ry * 0.3, 1, x, y, rx);
  g.addColorStop(0, '#a8e2f2');
  g.addColorStop(1, WATER);
  p.ellipse(x, y, rx, ry, g, WATER_D);
  p.ellipse(x - rx * 0.3, y - ry * 0.25, rx * 0.3, ry * 0.18, rgba('#ffffff', 0.55), null);
}

function birdbath(p: Pen): void {
  const { x, y } = p.center;
  p.shadow(x, y + 1, 13, 6, 0.28);
  p.cylinder(x, y, 7, 3, STONE);
  shape(
    p,
    (c) => {
      c.moveTo(x - 3.5, y - 3);
      c.quadraticCurveTo(x - 1.5, y - 10, x - 3, y - 17);
      c.lineTo(x + 3, y - 17);
      c.quadraticCurveTo(x + 1.5, y - 10, x + 3.5, y - 3);
      c.closePath();
    },
    hgrad(p, x - 4, x + 4, STONE_L, STONE_D, STONE),
  );
  // bowl
  const by = y - 20;
  shape(
    p,
    (c) => {
      c.moveTo(x - 14, by);
      c.quadraticCurveTo(x - 10, by + 7, x, by + 7);
      c.quadraticCurveTo(x + 10, by + 7, x + 14, by);
      c.closePath();
    },
    hgrad(p, x - 14, x + 14, STONE_L, STONE_D, STONE),
  );
  p.ellipse(x, by, 14, 6, STONE_L, p.outline);
  waterEllipse(p, x, by + 0.5, 11, 4.4);
  p.ellipse(x + 3, by + 1, 3, 1.2, null, rgba('#ffffff', 0.7));
  // moss
  p.ellipse(x - 2, y - 3, 3, 1.3, MOSS, null);
  // little bluebird on the rim
  const bx = x + 9;
  const bby = by - 3;
  p.ellipse(bx - 3.5, bby + 0.5, 3, 1.3, '#4f7fc8', p.outline, -0.4);
  p.ellipse(bx, bby, 3.6, 3, '#5f95e0', p.outline);
  p.ellipse(bx + 0.5, bby + 1, 2.2, 1.6, '#f7d6b0', null);
  p.circle(bx + 2.5, bby - 3.2, 2.4, '#5f95e0', p.outline);
  p.circle(bx + 3.3, bby - 3.6, 0.6, '#1e1e1e', null);
  p.poly(
    [
      { x: bx + 4.6, y: bby - 3.6 },
      { x: bx + 6.4, y: bby - 3 },
      { x: bx + 4.6, y: bby - 2.6 },
    ],
    '#f3b23a',
    null,
  );
}

function stoneCylinder(p: Pen, x: number, y: number, rx: number, ht: number): void {
  p.cylinder(x, y, rx, ht, STONE);
  const r = rng('stonecyl' + rx);
  withClip(
    p,
    (c) => {
      c.moveTo(x - rx, y - ht);
      c.lineTo(x - rx, y);
      c.ellipse(x, y, rx, rx / 2, 0, Math.PI, 0, true);
      c.lineTo(x + rx, y - ht);
      c.ellipse(x, y - ht, rx, rx / 2, 0, 0, Math.PI, false);
      c.closePath();
    },
    () => {
      const rows = 3;
      for (let i = 1; i < rows; i++) {
        const yy = y - (ht * i) / rows;
        p.ctx.beginPath();
        p.ctx.ellipse(x, yy, rx, rx / 2, 0, 0, Math.PI);
        p.ctx.strokeStyle = shade(STONE, -0.38);
        p.ctx.lineWidth = 0.8;
        p.ctx.stroke();
      }
      for (let i = 0; i < rows; i++) {
        const off = i % 2 ? 0.5 : 0;
        for (let k = 0; k < 5; k++) {
          const a = ((k + off) / 5) * Math.PI;
          const xx = x + Math.cos(a) * rx;
          const yTop = y - (ht * (i + 1)) / rows + Math.sin(a) * rx * 0.5;
          p.line([{ x: xx, y: yTop }, { x: xx, y: yTop + ht / rows }], shade(STONE, -0.38), 0.8);
        }
        void r;
      }
    },
  );
}

function wishingWell(p: Pen): void {
  const { x, y } = p.center;
  p.shadow(x, y + 1, 20, 9, 0.28);
  stoneCylinder(p, x, y, 16, 13);
  p.ellipse(x, y - 13, 16, 8, STONE_L, p.outline);
  p.ellipse(x, y - 13, 12, 6, '#2c3e4f', p.outline);
  withClip(
    p,
    (c) => c.ellipse(x, y - 13, 12, 6, 0, 0, TAU),
    () => {
      p.ellipse(x, y - 11, 11, 4.5, '#3f7fa8', null);
      p.ellipse(x - 3, y - 11, 3, 1, rgba('#ffffff', 0.4), null);
    },
  );
  // moss & flowers on the rim
  p.ellipse(x - 11, y - 9, 4, 2, MOSS, shade(MOSS, -0.35));
  p.flower(x + 12, y - 8, 1.8, '#f48fb8');
  const roofZ = 38;
  p.box(0.22, 0.47, 0.06, 0.06, roofZ, WOOD_D, 12);
  // axle with rope and bucket
  const ax0 = p.iso(0.26, 0.5, 12 + 26);
  const ax1 = p.iso(0.74, 0.5, 12 + 26);
  thick(p, [ax0, ax1], WOOD, 2.2);
  const mid = p.iso(0.5, 0.5, 38);
  p.ellipse(mid.x, mid.y, 2.6, 3.2, '#d6c08f', '#8a7a54', 0.46);
  p.line([mid, { x: mid.x, y: mid.y + 11 }], '#c8b28a', 0.9);
  const bk = { x: mid.x, y: mid.y + 17 };
  p.cylinder(bk.x, bk.y, 3.6, 5, '#a26d42');
  p.line([{ x: bk.x - 3.6, y: bk.y - 2.5 }, { x: bk.x + 3.6, y: bk.y - 2.5 }], '#6b6f73', 0.8);
  p.ctx.beginPath();
  p.ctx.arc(bk.x, bk.y - 5, 3.4, Math.PI, 0);
  p.ctx.strokeStyle = '#6b6f73';
  p.ctx.lineWidth = 0.7;
  p.ctx.stroke();
  p.box(0.72, 0.47, 0.06, 0.06, roofZ, WOOD_D, 12);
  // crank
  const cr = p.iso(0.8, 0.5, 38);
  thick(p, [ax1, cr], IRON, 0.9);
  thick(p, [cr, { x: cr.x, y: cr.y + 5 }], IRON, 0.9);
  p.gableRoof(0.14, 0.3, 0.72, 0.4, roofZ + 12, 11, '#c8574a', WOOD_D, 0.06);
  // shingle lines
  for (let k = 1; k < 3; k++) {
    const t = k / 3;
    p.line([p.iso(0.08, 0.76 - t * 0.26, 50 + t * 11), p.iso(0.92, 0.76 - t * 0.26, 50 + t * 11)], shade('#c8574a', -0.25), 0.7);
  }
}

function fountain(p: Pen): void {
  const { x, y } = p.center;
  p.shadow(x, y + 3, 54, 26, 0.25);
  // outer basin
  stoneCylinder(p, x, y + 4, 50, 10);
  p.ellipse(x, y - 6, 50, 25, STONE_L, p.outline);
  p.ellipse(x, y - 6, 44, 22, shade(STONE, -0.2), p.outline);
  withClip(
    p,
    (c) => c.ellipse(x, y - 6, 44, 22, 0, 0, TAU),
    () => {
      const g = p.ctx.createRadialGradient(x, y - 2, 4, x, y - 2, 44);
      g.addColorStop(0, '#9ad8ee');
      g.addColorStop(1, '#4fa8d0');
      p.ellipse(x, y - 3.5, 44, 21, g, null);
      // ripples
      for (const k of [18, 26, 34]) p.ellipse(x, y - 4, k, k / 2, null, rgba('#ffffff', 0.35));
      // wishing coins
      for (const [dx, dy] of [
        [-24, 4],
        [20, 8],
        [-10, 12],
        [30, -2],
      ]) {
        p.ellipse(x + dx, y + dy - 4, 1.6, 0.9, BRASS, shade(BRASS, -0.4));
      }
      // lily pad
      p.ellipse(x - 30, y - 4, 5, 2.5, '#6fb34a', shade('#6fb34a', -0.4));
      p.flower(x - 29, y - 6, 2, '#f7b3cc');
    },
  );
  // central column and tiers
  p.cylinder(x, y - 4, 7, 22, STONE);
  const bowl = (by: number, rx: number, depth: number) => {
    shape(
      p,
      (c) => {
        c.moveTo(x - rx, by);
        c.quadraticCurveTo(x - rx * 0.8, by + depth, x, by + depth);
        c.quadraticCurveTo(x + rx * 0.8, by + depth, x + rx, by);
        c.closePath();
      },
      hgrad(p, x - rx, x + rx, STONE_L, STONE_D, STONE),
    );
    p.ellipse(x, by, rx, rx / 2, STONE_L, p.outline);
    waterEllipse(p, x, by + 0.5, rx - 3, rx / 2 - 1.8);
  };
  const stream = (x0: number, y0: number, x1: number, y1: number) => {
    const c = { x: x0 + (x1 - x0) * 0.9, y: y0 - 2 };
    p.curve({ x: x0, y: y0 }, c, { x: x1, y: y1 }, rgba('#bfe8f6', 0.55), 3.6);
    p.curve({ x: x0, y: y0 }, c, { x: x1, y: y1 }, rgba('#ffffff', 0.85), 1.2);
  };
  bowl(y - 28, 24, 9);
  p.cylinder(x, y - 30, 4, 12, STONE);
  bowl(y - 44, 13, 6);
  // top finial & jet
  p.cylinder(x, y - 45, 2, 5, STONE);
  p.ball(x, y - 52, 2.6, STONE_L);
  p.line([{ x, y: y - 54 }, { x, y: y - 62 }], rgba('#ffffff', 0.85), 1.6);
  for (const d of [-1, 1]) stream(x, y - 62, x + d * 9, y - 45);
  // translucent water curtains spilling from each tier
  const sheet = (rx0: number, ry0: number, cy0: number, rx1: number, ry1: number, cy1: number) => {
    const top: Pt[] = [];
    const bot: Pt[] = [];
    for (let i = 0; i <= 12; i++) {
      const a = 0.08 + (i / 12) * (Math.PI - 0.16);
      top.push({ x: x + Math.cos(a) * rx0, y: cy0 + Math.sin(a) * ry0 });
      bot.push({ x: x + Math.cos(a) * rx1, y: cy1 + Math.sin(a) * ry1 });
    }
    const g = p.vgrad(cy0, cy1 + ry1, 'rgba(235,250,255,0.75)', 'rgba(160,220,240,0.35)');
    p.poly([...top, ...bot.slice().reverse()], g, null);
    for (let i = 1; i < 12; i += 2) {
      p.curve(top[i], { x: (top[i].x + bot[i].x) / 2 + (bot[i].x - top[i].x) * 0.3, y: top[i].y + 2 }, bot[i], rgba('#ffffff', 0.7), 0.8);
    }
    for (let i = 2; i < 12; i += 3) p.ellipse(bot[i].x, bot[i].y, 3, 1.2, null, rgba('#ffffff', 0.75));
  };
  sheet(12.5, 6, y - 44, 16, 7.5, y - 28);
  sheet(23.5, 11.5, y - 28, 30, 14, y - 5);
  // moss on the rim
  p.ellipse(x - 38, y + 6, 6, 2.4, MOSS, shade(MOSS, -0.35));
  p.ellipse(x + 30, y + 13, 5, 2, MOSS, shade(MOSS, -0.35));
}

/** Squircle-ish radius so round features fill more of a square footprint. */
function squircle(a: number): number {
  return Math.pow(Math.pow(Math.abs(Math.cos(a)), 3) + Math.pow(Math.abs(Math.sin(a)), 3), -1 / 3);
}

function pondShape(seed: string, rad: number): Pt[] {
  // organic outline in flat space (centred in a 64×64 footprint)
  const r = rng(seed);
  const pts: Pt[] = [];
  const n = 14;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU;
    const k = rad * squircle(a) * (0.94 + r() * 0.1);
    pts.push({ x: 32 + Math.cos(a) * k, y: 32 + Math.sin(a) * k });
  }
  return pts;
}

function pond(koi: boolean): Painter {
  return (p) => {
    const seed = koi ? 'koi' : 'lily';
    const r = rng(seed + 'p');
    const rim = pondShape(seed, 25.5);
    const water = pondShape(seed, 21);
    flat(p, () => {
      shape(p, smoothPath(rim.map((q) => ({ x: q.x + 1, y: q.y + 1 }))), rgba('#2a3a1a', 0.18), null);
      shape(p, smoothPath(rim), '#7cbf5a', null);
      shape(p, smoothPath(water.map((q) => ({ x: 32 + (q.x - 32) * 1.08, y: 32 + (q.y - 32) * 1.08 }))), '#8a7a5a', null);
      const g = p.ctx.createRadialGradient(30, 30, 2, 32, 32, 26);
      g.addColorStop(0, koi ? '#5fb6dc' : '#7fcbe0');
      g.addColorStop(1, koi ? '#2f7fb0' : '#3f9cc8');
      shape(p, smoothPath(water), g, '#2f6f98');
      withClip(p, smoothPath(water), () => {
        // inner depth shading
        p.ctx.lineWidth = 5;
        p.ctx.strokeStyle = rgba('#1f5a80', 0.25);
        smoothPath(water)(p.ctx);
        p.ctx.stroke();
        for (const [cx, cy, rr] of [
          [22, 40, 4],
          [44, 22, 3],
        ]) {
          p.circle(cx, cy, rr, null, rgba('#ffffff', 0.45));
          p.circle(cx, cy, rr + 2.5, null, rgba('#ffffff', 0.25));
        }
        if (koi) {
          const fish = (fx: number, fy: number, rot: number, body: string, spot: string) => {
            p.save();
            p.ctx.translate(fx, fy);
            p.ctx.rotate(rot);
            p.ellipse(0, 0, 6, 2.4, body, shade(body, -0.4));
            p.poly(
              [
                { x: -5, y: 0 },
                { x: -9.5, y: -2.8 },
                { x: -8.5, y: 0 },
                { x: -9.5, y: 2.8 },
              ],
              body,
              shade(body, -0.4),
            );
            p.ellipse(1, -0.6, 2, 1.2, spot, null);
            p.ellipse(-2.5, 0.6, 1.4, 0.9, spot, null);
            p.ellipse(0.5, 2.2, 1.6, 0.7, body, null, 0.6);
            p.ellipse(0.5, -2.2, 1.6, 0.7, body, null, -0.6);
            p.restore();
          };
          fish(26, 22, 0.6, '#f38a3a', '#ffffff');
          fish(40, 38, 3.5, '#fdf8f0', '#f05a3a');
          fish(20, 38, -0.9, '#f7c13a', '#f38a3a');
        }
      });
      // lily pads
      const pads: [number, number, number][] = koi
        ? [
            [40, 20, 4.5],
            [46, 28, 3.5],
          ]
        : [
            [22, 24, 5],
            [40, 36, 5.5],
            [30, 42, 4],
            [44, 24, 3.5],
            [18, 36, 3.6],
          ];
      for (const [px, py, pr] of pads) {
        p.arc(px, py, pr, 0.4, TAU - 0.1, '#6fb34a', shade('#6fb34a', -0.45));
        p.line([{ x: px, y: py }, { x: px - pr * 0.6, y: py + pr * 0.1 }], shade('#6fb34a', 0.25), 0.6);
      }
    });
    // rim stones (screen space so they stand up a little)
    const stoneCount = koi ? 18 : 20;
    const stones: { q: Pt; i: number }[] = [];
    for (let i = 0; i < stoneCount; i++) {
      const a = (i / stoneCount) * TAU + r() * 0.1;
      const rr = (koi ? 23.5 : 23) * squircle(a) + r() * 1.2;
      stones.push({ q: p.iso((32 + Math.cos(a) * rr) / 32, (32 + Math.sin(a) * rr) / 32), i });
    }
    stones.sort((a, b) => a.q.y - b.q.y);
    for (const { q: s, i } of stones) {
      const sz = koi ? 5 + r() * 1.6 : 3.4 + r() * 1.4;
      if (!koi && i % 6 === 2) {
        tuft(p, s.x, s.y + 1, 5, '#6fb34a');
        continue;
      }
      p.ellipse(s.x, s.y + 0.8, sz, sz * 0.6, STONE_D, p.outline);
      p.ellipse(s.x, s.y - 0.4, sz, sz * 0.6, radial(p, s.x, s.y - 0.4, sz, koi ? '#b8b4aa' : STONE), p.outline);
    }
    if (!koi) {
      // lotus flowers
      for (const [u, v] of [
        [0.72, 0.78],
        [1.25, 1.15],
      ]) {
        const q = p.iso(u, v);
        for (let k = 0; k < 6; k++) {
          const a = (k / 6) * Math.PI + Math.PI;
          p.ellipse(q.x + Math.cos(a) * 2.4, q.y - 1.5 + Math.sin(a) * 1.8, 1.4, 2.8, k % 2 ? '#f7b3cc' : '#fbd3e1', '#c4708f', a + Math.PI / 2);
        }
        p.circle(q.x, q.y - 2, 1, '#f7d34a', null);
      }
      // a tiny frog on a pad
      const fq = p.iso(1.25, 0.72);
      p.ellipse(fq.x, fq.y - 1.8, 3, 2.2, '#7fc65a', '#3f7a2e');
      p.circle(fq.x - 1.4, fq.y - 3.8, 1.1, '#7fc65a', '#3f7a2e');
      p.circle(fq.x + 1.4, fq.y - 3.8, 1.1, '#7fc65a', '#3f7a2e');
      p.circle(fq.x - 1.4, fq.y - 3.9, 0.45, '#1e1e1e', null);
      p.circle(fq.x + 1.4, fq.y - 3.9, 0.45, '#1e1e1e', null);
      // cattails at the back
      const cq = p.iso(0.32, 0.38);
      for (const [dx, h] of [
        [-3, 16],
        [0, 20],
        [3, 14],
      ]) {
        p.line([{ x: cq.x + dx, y: cq.y }, { x: cq.x + dx * 1.3, y: cq.y - h }], '#5f9a3a', 1);
        p.roundRect(cq.x + dx * 1.3 - 1.2, cq.y - h - 1, 2.4, 6, 1.2, '#8a5a34', '#4a3426');
      }
      leafAt(p, cq.x, cq.y, 12, -2.0, LEAF);
      leafAt(p, cq.x, cq.y, 11, -1.1, LEAF_D);
    } else {
      // a little stone lantern feel: one larger boulder with moss
      const bq = p.iso(1.55, 0.35);
      p.ellipse(bq.x, bq.y - 3, 7, 5, radial(p, bq.x, bq.y - 3, 7, STONE), p.outline);
      p.ellipse(bq.x - 1, bq.y - 6.5, 4.5, 1.8, MOSS, null);
      tuft(p, bq.x + 7, bq.y + 1, 6);
    }
  };
}

function waterPump(p: Pen): void {
  const { x, y } = p.center;
  p.shadow(x, y + 1, 18, 8, 0.26);
  p.box(0.24, 0.26, 0.52, 0.48, 4, STONE);
  const body = '#4f8fa8';
  const q = p.iso(0.42, 0.46, 4);
  // handle behind
  thick(p, [{ x: q.x + 1, y: q.y - 22 }, { x: q.x - 12, y: q.y - 32 }], IRON, 1.4);
  p.circle(q.x - 12.5, q.y - 32.5, 1.6, '#3a3f44', p.outline);
  p.cylinder(q.x, q.y, 4.2, 20, body);
  p.cylinder(q.x, q.y - 20, 5.2, 2.2, shade(body, -0.15));
  p.ball(q.x, q.y - 24.5, 2.6, shade(body, -0.1));
  // spout
  const s0 = { x: q.x + 3, y: q.y - 15 };
  const s1 = { x: q.x + 10, y: q.y - 11 };
  thick(p, [s0, s1], body, 2.6);
  thick(p, [s1, { x: s1.x + 0.4, y: s1.y + 3 }], body, 2.6);
  // bucket
  const bq = p.iso(0.74, 0.58, 4);
  p.cylinder(bq.x, bq.y, 5, 7, '#b07a45');
  p.line([{ x: bq.x - 5, y: bq.y - 2 }, { x: bq.x + 5, y: bq.y - 2 }], '#6b6f73', 0.9);
  p.line([{ x: bq.x - 5, y: bq.y - 5.5 }, { x: bq.x + 5, y: bq.y - 5.5 }], '#6b6f73', 0.9);
  p.ellipse(bq.x, bq.y - 6.6, 4, 2, WATER, null);
  // drip
  p.ellipse(s1.x + 0.4, s1.y + 6, 0.9, 1.4, '#bfe8f6', WATER_D);
  // puddle
  const pq = p.iso(0.3, 0.8);
  p.ellipse(pq.x, pq.y, 5, 2, rgba(WATER, 0.6), null);
}

function rainBarrel(p: Pen): void {
  const { x, y } = p.center;
  p.shadow(x, y + 1, 14, 6, 0.28);
  const h = 22;
  const rx = 10;
  const build = (c: Ctx) => {
    c.moveTo(x - rx, y - h);
    c.quadraticCurveTo(x - rx - 3, y - h / 2, x - rx, y);
    c.ellipse(x, y, rx, rx / 2, 0, Math.PI, 0, true);
    c.quadraticCurveTo(x + rx + 3, y - h / 2, x + rx, y - h);
    c.closePath();
  };
  shape(p, build, hgrad(p, x - rx - 3, x + rx + 3, '#c99358', '#7d5030', '#b07a45'));
  withClip(p, build, () => {
    for (const dx of [-7, -3.5, 0, 3.5, 7]) p.line([{ x: x + dx, y: y - h }, { x: x + dx * 1.15, y: y - h / 2 }, { x: x + dx, y: y + 5 }], rgba('#5a3a22', 0.4), 0.6);
    for (const yy of [y - 4, y - h + 4]) {
      p.ctx.beginPath();
      p.ctx.ellipse(x, yy, rx + 2.5, (rx + 2.5) / 2, 0, 0, Math.PI);
      p.ctx.strokeStyle = '#4f5559';
      p.ctx.lineWidth = 1.8;
      p.ctx.stroke();
    }
  });
  p.ellipse(x, y - h, rx, rx / 2, '#8d5c36', p.outline);
  p.ellipse(x, y - h + 0.5, rx - 1.5, (rx - 1.5) / 2, WATER, WATER_D);
  p.ellipse(x - 3, y - h - 0.5, 3, 1, rgba('#ffffff', 0.55), null);
  leafAt(p, x + 2, y - h + 1, 4, 0.3, '#f39a3c');
  // spigot
  p.rect(x - 1.4, y - 7, 4, 2, BRASS, p.outline);
  p.rect(x + 1, y - 7, 1.6, 3.8, BRASS, p.outline);
  p.ellipse(x + 1.8, y - 1.5, 0.8, 1.2, '#bfe8f6', WATER_D);
  // little watering can beside
  const wq = p.iso(0.82, 0.5);
  p.cylinder(wq.x, wq.y, 3.4, 5, '#8fc0a0');
  thick(p, [{ x: wq.x + 2.6, y: wq.y - 3 }, { x: wq.x + 6.5, y: wq.y - 7 }], '#8fc0a0', 1);
}

// ---------------------------------------------------------------------------
// Garden & farm bits

function scarecrow(p: Pen): void {
  const { x, y } = p.center;
  p.shadow(x, y + 1, 14, 6, 0.26);
  tuft(p, x - 6, y + 2, 5, STRAW);
  thick(p, [{ x, y: y + 1 }, { x, y: y - 46 }], WOOD_D, 2);
  // crossbar
  thick(p, [{ x: x - 19, y: y - 36 }, { x: x + 19, y: y - 36 }], WOOD_D, 1.8);
  // straw hands
  for (const d of [-1, 1]) {
    for (const k of [-1.2, 0, 1.2]) p.line([{ x: x + d * 17, y: y - 36 }, { x: x + d * 22, y: y - 36 + k * 2 }], STRAW, 1);
  }
  // shirt arms
  const plaid = '#d9574a';
  p.roundRect(x - 18, y - 39, 36, 6, 2.5, plaid);
  // torso
  shape(
    p,
    (c) => {
      c.moveTo(x - 7, y - 39);
      c.lineTo(x + 7, y - 39);
      c.lineTo(x + 8, y - 20);
      c.lineTo(x - 8, y - 20);
      c.closePath();
    },
    plaid,
  );
  withClip(
    p,
    (c) => {
      c.rect(x - 18, y - 39, 36, 6);
      c.moveTo(x - 7, y - 39);
      c.lineTo(x + 7, y - 39);
      c.lineTo(x + 8, y - 20);
      c.lineTo(x - 8, y - 20);
      c.closePath();
    },
    () => {
      for (let k = -18; k < 18; k += 4) p.line([{ x: x + k, y: y - 40 }, { x: x + k, y: y - 19 }], rgba('#7a2a22', 0.35), 1);
      for (let k = -38; k < -19; k += 4) p.line([{ x: x - 19, y: y + k }, { x: x + 19, y: y + k }], rgba('#f7d36a', 0.35), 0.8);
    },
  );
  // overalls
  shape(
    p,
    (c) => {
      c.moveTo(x - 5.5, y - 31);
      c.lineTo(x + 5.5, y - 31);
      c.lineTo(x + 8, y - 20);
      c.lineTo(x + 7, y - 13);
      c.lineTo(x - 7, y - 13);
      c.lineTo(x - 8, y - 20);
      c.closePath();
    },
    '#5a7fc0',
  );
  p.line([{ x: x - 5, y: y - 31 }, { x: x - 6, y: y - 39 }], '#5a7fc0', 1.4);
  p.line([{ x: x + 5, y: y - 31 }, { x: x + 6, y: y - 39 }], '#5a7fc0', 1.4);
  p.rect(x - 2, y - 26, 4, 3.4, '#f7d36a', shade('#5a7fc0', -0.4));
  for (const k of [-5, -1.5, 2, 5.5]) p.line([{ x: x + k, y: y - 13 }, { x: x + k * 1.2, y: y - 9 }], STRAW, 1);
  // head
  p.circle(x, y - 45, 7, '#e8cf9a', p.outline);
  p.circle(x - 2.6, y - 46, 0.9, '#3a2a1a', null);
  p.circle(x + 2.6, y - 46, 0.9, '#3a2a1a', null);
  p.ctx.beginPath();
  p.ctx.arc(x, y - 44.5, 3, 0.3, Math.PI - 0.3);
  p.ctx.strokeStyle = '#3a2a1a';
  p.ctx.lineWidth = 0.8;
  p.ctx.stroke();
  p.circle(x - 4.5, y - 43.5, 1.2, rgba('#f28a8a', 0.6), null);
  p.circle(x + 4.5, y - 43.5, 1.2, rgba('#f28a8a', 0.6), null);
  // hat
  p.ellipse(x, y - 50, 12, 3.4, STRAW, shade(STRAW, -0.45));
  p.roundRect(x - 6, y - 58, 12, 8, 3, STRAW, shade(STRAW, -0.45));
  p.rect(x - 6, y - 52.5, 12, 2, '#d9574a', null);
  p.flower(x + 5, y - 52, 2, '#ffffff');
  // a little bird friend on the arm
  const bx = x + 13;
  const by = y - 41;
  p.ellipse(bx, by, 2.8, 2.2, '#8a5a34', p.outline);
  p.circle(bx + 2, by - 2.2, 1.7, '#8a5a34', p.outline);
  p.ellipse(bx + 0.5, by + 0.5, 1.6, 1.2, '#f2b48a', null);
  p.poly(
    [
      { x: bx + 3.4, y: by - 2.6 },
      { x: bx + 5, y: by - 2 },
      { x: bx + 3.4, y: by - 1.6 },
    ],
    '#f3b23a',
    null,
  );
}

function wheelbarrow(p: Pen): void {
  const { x, y } = p.center;
  p.shadow(x, y + 1, 20, 8, 0.26);
  // handles & legs (back)
  for (const v of [0.38, 0.62]) {
    thick(p, [p.iso(0.05, v, 12), p.iso(0.55, v, 8)], WOOD_D, 1.3);
    thick(p, [p.iso(0.3, v, 0), p.iso(0.32, v, 8)], WOOD_D, 1.2);
  }
  // tray (flared box)
  const u0 = 0.28;
  const u1 = 0.78;
  const z0 = 6;
  const z1 = 15;
  const fl = 0.06;
  const front = [p.iso(u0, 0.66, z0), p.iso(u1, 0.66, z0), p.iso(u1 + fl, 0.66 + fl, z1), p.iso(u0 - fl, 0.66 + fl, z1)];
  const side = [p.iso(u1, 0.66, z0), p.iso(u1, 0.34, z0), p.iso(u1 + fl, 0.34 - fl, z1), p.iso(u1 + fl, 0.66 + fl, z1)];
  const top = [p.iso(u0 - fl, 0.66 + fl, z1), p.iso(u1 + fl, 0.66 + fl, z1), p.iso(u1 + fl, 0.34 - fl, z1), p.iso(u0 - fl, 0.34 - fl, z1)];
  const tray = '#5f9e7a';
  p.poly(top, SOIL);
  // load: soil mound with flowers & a sprinkle of hay
  const mq = p.iso(0.53, 0.5, z1);
  p.ellipse(mq.x, mq.y - 1, 15, 6, '#7a5634', null);
  const r = rng('wb');
  for (let i = 0; i < 12; i++) {
    const a = r() * TAU;
    const d = Math.sqrt(r());
    p.line([{ x: mq.x + Math.cos(a) * d * 12, y: mq.y + Math.sin(a) * d * 4 }, { x: mq.x + Math.cos(a) * d * 12 + 3, y: mq.y + Math.sin(a) * d * 4 - 1 }], STRAW, 0.9);
  }
  const fls: [number, number, string][] = [
    [-8, -3, '#f25c78'],
    [-2, -6, '#f8d442'],
    [5, -4, '#9a7ae0'],
    [10, -1, '#ffffff'],
    [0, -1, '#f39a3c'],
    [-6, 1, '#ffffff'],
  ];
  for (const [dx, dy, c] of fls) {
    leafAt(p, mq.x + dx, mq.y + dy + 3, 4, -2.4, LEAF);
    leafAt(p, mq.x + dx, mq.y + dy + 3, 4, -0.6, LEAF_D);
    p.flower(mq.x + dx, mq.y + dy, 2.6, c, c === '#ffffff' ? '#f6c335' : '#fff1a8');
  }
  p.poly(side, shade(tray, -0.22));
  p.poly(front, tray);
  p.line([lerp(front[0], front[3], 0.5), lerp(front[1], front[2], 0.5)], rgba('#ffffff', 0.25), 0.8);
  // wheel at the front
  const wq = p.iso(0.92, 0.5, 4.5);
  p.ellipse(wq.x, wq.y, 3.6, 5, '#4a4f53', p.outline, 0.3);
  p.ellipse(wq.x, wq.y, 1.6, 2.4, '#c9ced2', null, 0.3);
}

function hayBale(p: Pen): void {
  const { x, y } = p.center;
  p.shadow(x, y + 2, 24, 11, 0.26);
  const u0 = 0.18;
  const u1 = 0.82;
  const v0 = 0.3;
  const v1 = 0.7;
  const ht = 14;
  const c = boxColors(STRAW);
  p.box(u0, v0, u1 - u0, v1 - v0, ht, c);
  const r = rng('hay');
  const faces: Pt[][] = [faceV(p, u0, u1, v1, 0, ht), faceU(p, u1, v0, v1, 0, ht), [p.iso(u0, v1, ht), p.iso(u1, v1, ht), p.iso(u1, v0, ht), p.iso(u0, v0, ht)]];
  faces.forEach((f) => {
    withClip(p, polyPath(f), () => {
      for (let i = 0; i < 30; i++) {
        const q = lerp(lerp(f[0], f[1], r()), lerp(f[3], f[2], r()), r());
        const dx = (r() - 0.5) * 6;
        p.line([q, { x: q.x + dx, y: q.y + (r() - 0.5) * 2 }], r() < 0.5 ? shade(STRAW, -0.25) : shade(STRAW, 0.3), 0.7);
      }
    });
  });
  p.box(u0, v0, u1 - u0, v1 - v0, ht, { top: 'rgba(0,0,0,0)', left: 'rgba(0,0,0,0)', right: 'rgba(0,0,0,0)' });
  // twine
  for (const u of [0.38, 0.62]) {
    p.line([p.iso(u, v1, 0), p.iso(u, v1, ht), p.iso(u, v0, ht)], '#9a5a2a', 1.1);
  }
  // loose straws
  for (let i = 0; i < 6; i++) {
    const q = p.iso(0.15 + r() * 0.7, 0.72 + r() * 0.15);
    p.line([q, { x: q.x + 3 + r() * 2, y: q.y - r() }], STRAW, 0.8);
  }
  for (let i = 0; i < 5; i++) {
    const q = p.iso(u0 + r() * (u1 - u0), v0 + r() * 0.1, ht);
    p.line([q, { x: q.x + (r() - 0.5) * 6, y: q.y - 2 - r() * 2 }], shade(STRAW, 0.2), 0.8);
  }
}

function mailbox(p: Pen): void {
  const { x, y } = p.center;
  p.shadow(x, y + 1, 12, 5, 0.26);
  p.flower(x - 6, y + 1, 2.2, '#f48fb8');
  p.flower(x + 6, y + 2, 2.2, '#f8d442');
  tuft(p, x - 2, y + 3, 4);
  p.box(0.46, 0.46, 0.08, 0.08, 24, WOOD);
  const z0 = 24;
  const zt = 31;
  const u0 = 0.24;
  const u1 = 0.76;
  const v0 = 0.4;
  const v1 = 0.6;
  const blue = '#5a8fd8';
  const arch = (u: number): Pt[] => {
    const pts: Pt[] = [];
    for (let i = 0; i <= 10; i++) {
      const t = (i / 10) * Math.PI;
      pts.push(p.iso(u, 0.5 + 0.1 * Math.cos(t), zt + 3.6 * Math.sin(t)));
    }
    return pts;
  };
  const back = arch(u0);
  const frontA = arch(u1);
  p.poly([...frontA, ...back.slice().reverse()], shade(blue, 0.18));
  p.poly(faceV(p, u0, u1, v1, z0, zt), blue);
  // profile end with a little door
  const end = [p.iso(u1, v1, z0), p.iso(u1, v0, z0), ...frontA.slice().reverse()];
  p.poly(end, shade(blue, -0.22));
  const door = [p.iso(u1 + 0.02, v1 - 0.02, z0 + 1), p.iso(u1 + 0.02, v0 + 0.02, z0 + 1), p.iso(u1 + 0.02, v0 + 0.02, zt), p.iso(u1 + 0.02, v1 - 0.02, zt)];
  p.poly(door, null, shade(blue, -0.5), 0.7);
  // letter peeking
  const lt = p.iso(u1 + 0.02, 0.5, zt + 1);
  p.poly([{ x: lt.x - 2, y: lt.y + 1 }, { x: lt.x + 3, y: lt.y - 1 }, { x: lt.x + 3, y: lt.y - 4 }, { x: lt.x - 2, y: lt.y - 2 }], '#fffaf0', '#a89a80');
  p.heart(lt.x + 0.6, lt.y - 1.6, 0.9, '#e8574e', null);
  // raised red flag on the near side
  const fb = p.iso(0.36, v1 + 0.01, z0 + 2);
  p.line([fb, { x: fb.x, y: fb.y - 12 }], '#d9574a', 1.2);
  p.poly([{ x: fb.x, y: fb.y - 12 }, { x: fb.x + 5, y: fb.y - 10 }, { x: fb.x + 5, y: fb.y - 7 }, { x: fb.x, y: fb.y - 9 }], '#e8574e');
}

function signpost(p: Pen): void {
  const { x, y } = p.center;
  p.shadow(x, y + 1, 10, 5, 0.26);
  tuft(p, x - 5, y + 2, 5);
  tuft(p, x + 5, y + 3, 4);
  p.flower(x + 8, y, 2, '#ffffff', '#f6c335');
  p.roundRect(x - 2, y - 44, 4, 45, 1, hgrad(p, x - 2, x + 2, WOOD_L, WOOD_D));
  p.poly(
    [
      { x: x - 2, y: y - 44 },
      { x, y: y - 47 },
      { x: x + 2, y: y - 44 },
    ],
    WOOD_L,
  );
  const sign = (sy: number, dir: number, len: number, col: string, tilt: number) => {
    const x0 = dir > 0 ? x - 3 : x + 3;
    const x1 = x0 + dir * len;
    const pts = [
      { x: x0, y: sy - 3.2 },
      { x: x1, y: sy - 3.2 + tilt },
      { x: x1 + dir * 4, y: sy + tilt },
      { x: x1, y: sy + 3.2 + tilt },
      { x: x0, y: sy + 3.2 },
    ];
    p.poly(pts, col);
    p.line([{ x: x0 + dir * 2.5, y: sy - 0.5 }, { x: x1 - dir * 2, y: sy - 0.5 + tilt }], rgba('#4a3426', 0.55), 0.9);
    p.line([{ x: x0 + dir * 2.5, y: sy + 1.3 }, { x: x1 - dir * 6, y: sy + 1.3 + tilt }], rgba('#4a3426', 0.4), 0.9);
    p.circle(x0 + dir * 1.4, sy, 0.5, '#4a3426', null);
  };
  sign(y - 38, 1, 16, '#f3e3c0', 1.5);
  sign(y - 30, -1, 14, '#8fc0a0', 1.2);
  sign(y - 22, 1, 12, '#f2a6a0', -1);
  // a little bird on top
  p.circle(x + 0.5, y - 49, 2.2, '#f39a6a', p.outline);
  p.circle(x + 1.3, y - 49.6, 0.5, '#1e1e1e', null);
  p.poly(
    [
      { x: x + 2.5, y: y - 49.5 },
      { x: x + 4, y: y - 49 },
      { x: x + 2.5, y: y - 48.4 },
    ],
    '#f3b23a',
    null,
  );
}

function birdhouse(p: Pen): void {
  const { x, y } = p.center;
  p.shadow(x, y + 1, 10, 5, 0.26);
  tuft(p, x - 4, y + 2, 5);
  p.flower(x + 5, y + 1, 2, '#9a7ae0');
  p.box(0.46, 0.46, 0.08, 0.08, 34, WOOD);
  const z0 = 34;
  const ht = 13;
  const col = '#f7d36a';
  p.box(0.3, 0.32, 0.4, 0.36, ht, col, z0);
  // round hole + perch on the front face
  const hq = p.iso(0.5, 0.68, z0 + 8);
  p.ellipse(hq.x, hq.y, 2.4, 2.8, '#3a2a1a', shade(col, -0.5));
  const pq = p.iso(0.5, 0.68, z0 + 3.5);
  thick(p, [pq, { x: pq.x - 1.6, y: pq.y + 2.4 }], WOOD_D, 0.9);
  // flower painted on the side
  const fq = p.iso(0.7, 0.5, z0 + 6);
  p.flower(fq.x, fq.y, 2, '#ffffff', '#f39a3c');
  p.gableRoof(0.3, 0.32, 0.4, 0.36, z0 + ht, 9, '#d9574a', col, 0.1);
  // bluebird on the roof
  const bq = p.iso(0.45, 0.5, z0 + ht + 10);
  p.ellipse(bq.x - 2.6, bq.y + 0.5, 2.4, 1, '#4f7fc8', p.outline, 0.4);
  p.ellipse(bq.x, bq.y, 3, 2.4, '#5f95e0', p.outline);
  p.ellipse(bq.x + 0.6, bq.y + 0.8, 1.8, 1.2, '#f7d6b0', null);
  p.circle(bq.x + 2, bq.y - 2.4, 1.9, '#5f95e0', p.outline);
  p.circle(bq.x + 2.6, bq.y - 2.8, 0.5, '#1e1e1e', null);
  p.poly(
    [
      { x: bq.x + 3.7, y: bq.y - 2.8 },
      { x: bq.x + 5.2, y: bq.y - 2.3 },
      { x: bq.x + 3.7, y: bq.y - 1.9 },
    ],
    '#f3b23a',
    null,
  );
}

function wateringCan(p: Pen, x: number, y: number, s: number, col: string, flip = false): void {
  const d = flip ? -1 : 1;
  p.shadow(x, y + 1, 7 * s, 3 * s, 0.25);
  // spout behind body
  thick(p, [{ x: x + d * 4 * s, y: y - 3 * s }, { x: x + d * 11 * s, y: y - 10 * s }], col, 1.6 * s);
  p.ellipse(x + d * 11.5 * s, y - 10.5 * s, 1.4 * s, 2 * s, shade(col, 0.1), p.outline, d * 0.7);
  p.cylinder(x, y, 5 * s, 8 * s, col);
  // handle
  p.ctx.beginPath();
  p.ctx.ellipse(x - d * 1 * s, y - 8 * s, 4 * s, 4 * s, 0, Math.PI, 0);
  p.ctx.strokeStyle = p.outline;
  p.ctx.lineWidth = 2.6 * s;
  p.ctx.stroke();
  p.ctx.strokeStyle = col;
  p.ctx.lineWidth = 1.2 * s;
  p.ctx.stroke();
  p.line([{ x: x - 5 * s, y: y - 5 * s }, { x: x + 5 * s, y: y - 5 * s }], rgba('#ffffff', 0.3), 0.8);
}

function wateringCans(p: Pen): void {
  const { x, y } = p.center;
  wateringCan(p, x - 6, y - 3, 1.05, '#7fc0a0');
  wateringCan(p, x + 7, y + 4, 0.8, '#f29ab8', true);
  // tiny puddle & sprout
  p.ellipse(x - 14, y + 4, 4, 1.6, rgba(WATER, 0.5), null);
  leafAt(p, x + 15, y - 1, 4, -2.2, LEAF);
  leafAt(p, x + 15, y - 1, 4, -0.9, LEAF_D);
}

function gardenGnome(p: Pen): void {
  const { x, y } = p.center;
  p.shadow(x, y + 1, 12, 5, 0.28);
  tuft(p, x - 9, y + 2, 4);
  p.flower(x + 9, y + 1, 2, '#ffffff', '#f6c335');
  // boots
  p.ellipse(x - 3.5, y - 1, 3.5, 2.2, '#6b4a2f', p.outline);
  p.ellipse(x + 3.5, y - 0.5, 3.5, 2.2, '#6b4a2f', p.outline);
  // body
  shape(
    p,
    (c) => {
      c.moveTo(x - 7, y - 2);
      c.quadraticCurveTo(x - 8, y - 12, x - 5, y - 16);
      c.lineTo(x + 5, y - 16);
      c.quadraticCurveTo(x + 8, y - 12, x + 7, y - 2);
      c.closePath();
    },
    hgrad(p, x - 8, x + 8, '#6f9fe0', '#3f6fb0', '#5a8fd8'),
  );
  p.rect(x - 7.5, y - 7, 15, 2, '#5a3a22', null);
  p.rect(x - 1.2, y - 7.2, 2.4, 2.4, BRASS, null);
  // arms holding a tiny shovel
  p.circle(x + 6.5, y - 9, 1.8, '#f2c2a0', p.outline);
  p.line([{ x: x + 7, y: y - 4 }, { x: x + 7, y: y - 15 }], WOOD_D, 1);
  p.poly(
    [
      { x: x + 5.6, y: y - 4 },
      { x: x + 8.4, y: y - 4 },
      { x: x + 7, y: y - 0.5 },
    ],
    '#b8bec2',
  );
  // beard
  shape(
    p,
    (c) => {
      c.moveTo(x - 5.5, y - 18);
      c.quadraticCurveTo(x - 6, y - 10, x, y - 7);
      c.quadraticCurveTo(x + 6, y - 10, x + 5.5, y - 18);
      c.closePath();
    },
    '#fbf8f2',
  );
  // face
  p.circle(x, y - 19, 4.2, '#f6cfb0', p.outline);
  p.circle(x, y - 18, 1.6, '#f29a8a', null);
  p.circle(x - 1.8, y - 20.4, 0.6, '#2b2b2b', null);
  p.circle(x + 1.8, y - 20.4, 0.6, '#2b2b2b', null);
  // moustache
  p.ellipse(x - 1.6, y - 16.6, 1.8, 1, '#fbf8f2', '#c8c2b8', -0.3);
  p.ellipse(x + 1.6, y - 16.6, 1.8, 1, '#fbf8f2', '#c8c2b8', 0.3);
  // hat
  shape(
    p,
    (c) => {
      c.moveTo(x - 6.5, y - 21);
      c.quadraticCurveTo(x - 4, y - 30, x + 2, y - 37);
      c.quadraticCurveTo(x + 5, y - 33, x + 3.6, y - 29);
      c.quadraticCurveTo(x + 6, y - 25, x + 6.5, y - 21);
      c.quadraticCurveTo(x, y - 23, x - 6.5, y - 21);
      c.closePath();
    },
    hgrad(p, x - 7, x + 7, '#f2564a', '#b8302a', '#e0443a'),
  );
}

function sundial(p: Pen): void {
  const { x, y } = p.center;
  p.shadow(x, y + 1, 14, 6, 0.28);
  p.box(0.3, 0.3, 0.4, 0.4, 3, STONE);
  shape(
    p,
    (c) => {
      c.moveTo(x - 4, y - 3);
      c.quadraticCurveTo(x - 2, y - 10, x - 3.5, y - 17);
      c.lineTo(x + 3.5, y - 17);
      c.quadraticCurveTo(x + 2, y - 10, x + 4, y - 3);
      c.closePath();
    },
    hgrad(p, x - 4, x + 4, STONE_L, STONE_D, STONE),
  );
  p.cylinder(x, y - 16, 11, 2.5, STONE);
  // brass dial
  p.ellipse(x, y - 18.5, 9, 4.5, '#e2b85a', shade(BRASS, -0.45));
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * TAU;
    p.line([{ x: x + Math.cos(a) * 6.5, y: y - 18.5 + Math.sin(a) * 3.25 }, { x: x + Math.cos(a) * 8, y: y - 18.5 + Math.sin(a) * 4 }], shade(BRASS, -0.45), 0.6);
  }
  // shadow line & gnomon
  p.line([{ x, y: y - 18.5 }, { x: x - 5, y: y - 16.5 }], rgba('#4a3426', 0.4), 1.1);
  p.poly(
    [
      { x: x - 0.5, y: y - 18.5 },
      { x: x + 6, y: y - 15.5 },
      { x: x - 0.5, y: y - 26 },
    ],
    '#c99a3a',
  );
  p.ellipse(x - 6, y - 4, 3, 1.3, MOSS, null);
}

function roseArch(p: Pen): void {
  lineShadow(p, 0.05, 0.95, 0.5, 9, 0.2);
  const postZ = 34;
  const white = WHITE;
  const r = rng('arch');
  const curve = (v: number): Pt[] => {
    const pts: Pt[] = [p.iso(0.1, v, 0)];
    for (let i = 0; i <= 16; i++) {
      const t = (i / 16) * Math.PI;
      pts.push(p.iso(0.5 - 0.4 * Math.cos(t), v, postZ + 18 * Math.sin(t)));
    }
    pts.push(p.iso(0.9, v, 0));
    return pts;
  };
  const band = (pts: Pt[]) => {
    p.line(pts, p.outline, 4);
    p.line(pts, white, 2.2);
  };
  const vb = 0.36;
  const vf = 0.64;
  const back = curve(vb);
  const front = curve(vf);
  band(back);
  // lattice on the side panels
  for (const u of [0.1, 0.9]) {
    for (let z = 5; z < postZ; z += 7) {
      p.line([p.iso(u, vb, z), p.iso(u, vf, z + 5)], p.outline, 2);
      p.line([p.iso(u, vb, z), p.iso(u, vf, z + 5)], white, 0.9);
    }
  }
  // cross slats over the top
  for (let i = 2; i < back.length - 2; i += 2) {
    p.line([back[i], front[i]], p.outline, 2.6);
    p.line([back[i], front[i]], white, 1.2);
  }
  // greenery on the back arch
  back.forEach((q, i) => {
    if (i % 2 === 0 && i > 0 && i < back.length - 1) p.foliage(q.x, q.y, 3.2, LEAF_D, 'rab' + i, 5);
  });
  band(front);
  // climbing roses on the front arch and posts
  const spots: Pt[] = [];
  for (let i = 1; i < front.length - 1; i++) spots.push(front[i]);
  for (const u of [0.1, 0.9]) for (let z = 4; z < postZ; z += 6) spots.push(p.iso(u, vf, z));
  spots.forEach((q, i) => p.foliage(q.x + (r() - 0.5) * 2, q.y, 3 + r() * 1.4, i % 3 ? LEAF : '#4f9a45', 'raf' + i, 5));
  spots.forEach((q, i) => {
    if (i % 2 === 0) roseHead(p, q.x + (r() - 0.5) * 3, q.y - 1 + (r() - 0.5) * 2, 2.3, i % 3 ? '#f27a9a' : '#e8484a');
  });
  // a few petals drifting at the foot
  for (const [u, v] of [
    [0.3, 0.7],
    [0.6, 0.78],
    [0.75, 0.3],
  ]) {
    const q = p.iso(u, v);
    p.ellipse(q.x, q.y, 1.4, 0.8, '#f7a6bc', null, r() * 3);
  }
}

function gazebo(p: Pen): void {
  const { x, y } = p.center;
  p.shadow(x, y + 4, 60, 28, 0.25);
  const white = '#fbf6ec';
  p.box(0.12, 0.12, 1.76, 1.76, 5, '#c9b49a');
  // deck boards
  for (let i = 1; i < 9; i++) {
    const u = 0.12 + i * 0.196;
    p.line([p.iso(u, 0.12, 5), p.iso(u, 1.88, 5)], shade('#c9b49a', -0.2), 0.6);
  }
  const H = 40;
  const post = (u: number, v: number) => p.box(u - 0.05, v - 0.05, 0.1, 0.1, H, { top: white, left: '#efe7d8', right: '#cfc4b0' }, 5);
  const railing = (a: [number, number], b: [number, number], gap = false) => {
    const n = 7;
    for (let i = 1; i < n; i++) {
      const t = i / n;
      if (gap && t > 0.3 && t < 0.7) continue;
      const u = a[0] + (b[0] - a[0]) * t;
      const vv = a[1] + (b[1] - a[1]) * t;
      p.line([p.iso(u, vv, 5), p.iso(u, vv, 16)], p.outline, 2.4);
      p.line([p.iso(u, vv, 5), p.iso(u, vv, 16)], white, 1.2);
    }
    const segs: [number, number][] = gap
      ? [
          [0, 0.3],
          [0.7, 1],
        ]
      : [[0, 1]];
    for (const [t0, t1] of segs) {
      const s = p.iso(a[0] + (b[0] - a[0]) * t0, a[1] + (b[1] - a[1]) * t0, 16);
      const e = p.iso(a[0] + (b[0] - a[0]) * t1, a[1] + (b[1] - a[1]) * t1, 16);
      thick(p, [s, e], white, 2);
    }
  };
  // back
  post(0.25, 0.25);
  railing([0.25, 0.25], [1.75, 0.25]);
  railing([0.25, 0.25], [0.25, 1.75]);
  // bench inside along the back
  p.box(0.4, 0.32, 1.2, 0.2, 2, WOOD, 11);
  // hanging lantern
  const lq = p.iso(1, 1, 30);
  p.line([p.iso(1, 1, H + 5 + 14), lq], IRON, 0.8);
  p.glow(lq.x, lq.y + 4, 18, GLOW, 0.6);
  p.poly(
    [
      { x: lq.x - 3, y: lq.y },
      { x: lq.x + 3, y: lq.y },
      { x: lq.x + 2.4, y: lq.y + 7 },
      { x: lq.x - 2.4, y: lq.y + 7 },
    ],
    '#ffe08a',
    IRON,
  );
  p.poly(
    [
      { x: lq.x - 4, y: lq.y },
      { x: lq.x + 4, y: lq.y },
      { x: lq.x, y: lq.y - 3 },
    ],
    IRON,
  );
  // sides
  post(1.75, 0.25);
  post(0.25, 1.75);
  railing([1.75, 0.25], [1.75, 1.75]);
  railing([0.25, 1.75], [1.75, 1.75], true);
  post(1.75, 1.75);
  // flower pots by the entrance
  for (const u of [0.62, 1.38]) {
    const q = p.iso(u, 1.92);
    pot(p, q.x, q.y + 2, 4, 5);
    p.foliage(q.x, q.y - 6, 4.5, LEAF, 'gz' + u, 6);
    p.flower(q.x - 1, q.y - 8, 1.8, '#f48fb8');
    p.flower(q.x + 2, q.y - 6, 1.8, '#f8d442');
  }
  // valance trim under the roof
  const z = H + 5;
  const trim = (a: [number, number], b: [number, number]) => {
    const pts: Pt[] = [];
    const n = 10;
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      pts.push(p.iso(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, z));
    }
    for (let i = 0; i < n; i++) {
      const m = lerp(pts[i], pts[i + 1], 0.5);
      shape(
        p,
        (c) => {
          c.moveTo(pts[i].x, pts[i].y);
          c.quadraticCurveTo(m.x, m.y + 5, pts[i + 1].x, pts[i + 1].y);
          c.closePath();
        },
        white,
        p.outline,
        0.8,
      );
    }
  };
  trim([0.15, 1.85], [1.85, 1.85]);
  trim([1.85, 1.85], [1.85, 0.15]);
  // roof
  const o = 0.02;
  const rc = '#6aa58e';
  const l = p.iso(0.1 - o, 1.9 + o, z);
  const btm = p.iso(1.9 + o, 1.9 + o, z);
  const rr = p.iso(1.9 + o, 0.1 - o, z);
  const peak = p.iso(1, 1, z + 34);
  const face = (a: Pt, b: Pt, col: string) => {
    shape(
      p,
      (c) => {
        c.moveTo(a.x, a.y);
        c.quadraticCurveTo((a.x + b.x) / 2, (a.y + b.y) / 2 + 2, b.x, b.y);
        c.quadraticCurveTo((b.x + peak.x) / 2 + (a === l ? 3 : -3), (b.y + peak.y) / 2 + 3, peak.x, peak.y);
        c.quadraticCurveTo((a.x + peak.x) / 2 + (a === l ? 3 : -3), (a.y + peak.y) / 2 + 3, a.x, a.y);
        c.closePath();
      },
      col,
    );
    // shingle rows
    for (let k = 1; k < 5; k++) {
      const t = k / 5;
      const s = lerp(a, peak, t);
      const e = lerp(b, peak, t);
      p.curve(s, { x: (s.x + e.x) / 2, y: (s.y + e.y) / 2 + 2 * (1 - t) }, e, shade(col, -0.25), 0.8);
    }
  };
  face(l, btm, rc);
  face(btm, rr, shade(rc, -0.2));
  p.line([btm, peak], shade(rc, 0.2), 1.2);
  // cupola + finial
  p.cylinder(peak.x, peak.y + 3, 3.2, 5, white);
  p.poly(
    [
      { x: peak.x - 4.5, y: peak.y - 2 },
      { x: peak.x + 4.5, y: peak.y - 2 },
      { x: peak.x, y: peak.y - 8 },
    ],
    rc,
  );
  p.ball(peak.x, peak.y - 9.5, 1.8, BRASS);
}

function miniGreenhouse(p: Pen): void {
  const { x, y } = p.center;
  p.shadow(x, y + 2, 26, 12, 0.26);
  const u0 = 0.16;
  const u1 = 0.84;
  const v0 = 0.24;
  const v1 = 0.76;
  const base = 6;
  const wall = 20;
  const ridge = 32;
  const frame = '#fbf8f2';
  // low brick base with a soil bed on top
  p.box(u0, v0, u1 - u0, v1 - v0, base, '#c8674a');
  for (const z of [2, 4]) {
    p.line([p.iso(u0, v1, z), p.iso(u1, v1, z)], shade('#c8674a', -0.35), 0.6);
    p.line([p.iso(u1, v1, z), p.iso(u1, v0, z)], shade('#c8674a', -0.5), 0.6);
  }
  p.diamond(u0 + 0.03, v0 + 0.03, u1 - u0 - 0.06, v1 - v0 - 0.06, SOIL, null, base);
  // back glass walls (seen from inside)
  p.poly(faceV(p, u0, u1, v0, base, wall), rgba('#a8dce8', 0.55), null);
  p.poly(faceU(p, u0, v0, v1, base, wall), rgba('#bfe4ee', 0.55), null);
  // plants growing inside
  const at = (u: number, v: number) => p.iso(u, v, base);
  const t1 = at(0.32, 0.36);
  thick(p, [t1, { x: t1.x, y: t1.y - 14 }], '#8a5a34', 0.6);
  p.foliage(t1.x, t1.y - 10, 6.5, LEAF, 'gh-tom', 7);
  for (const [dx, dy] of [
    [-3, -9],
    [2.5, -7],
    [0.5, -13],
    [3.5, -11.5],
  ]) {
    p.ball(t1.x + dx, t1.y + dy, 1.6, '#e8484a', null);
  }
  const t2 = at(0.66, 0.34);
  p.foliage(t2.x, t2.y - 7, 6, LEAF_D, 'gh-fl', 7);
  p.flower(t2.x - 2.5, t2.y - 9, 2.4, '#f48fb8');
  p.flower(t2.x + 2.5, t2.y - 7, 2.4, '#f8d442');
  p.flower(t2.x, t2.y - 12, 2.2, '#ffffff', '#f6c335');
  const t3 = at(0.4, 0.64);
  for (const a of [-2.6, -2.1, -1.6, -1.1, -0.6]) leafAt(p, t3.x, t3.y, 7, a, LEAF_L, 0.3);
  const t4 = at(0.7, 0.62);
  for (const a of [-2.4, -1.6, -0.8]) leafAt(p, t4.x, t4.y, 6, a, '#5fae4a', 0.25);
  p.ball(t4.x, t4.y - 1, 2.2, '#f39a3c', null);
  // glass
  const fv = faceV(p, u0, u1, v1, base, wall);
  const fu = faceU(p, u1, v0, v1, base, wall);
  const gable = [p.iso(u1, v1, wall), p.iso(u1, v0, wall), p.iso(u1, 0.5, ridge)];
  const backRoof = [p.iso(u0, v0, wall), p.iso(u1, v0, wall), p.iso(u1, 0.5, ridge), p.iso(u0, 0.5, ridge)];
  const frontRoof = [p.iso(u0, v1, wall), p.iso(u1, v1, wall), p.iso(u1, 0.5, ridge), p.iso(u0, 0.5, ridge)];
  const glass = (pts: Pt[], a: number, b: number) => {
    let minY = Infinity;
    let maxY = -Infinity;
    for (const q of pts) {
      minY = Math.min(minY, q.y);
      maxY = Math.max(maxY, q.y);
    }
    p.poly(pts, p.vgrad(minY, maxY, rgba('#e6f8fc', a), rgba('#9ed6e6', b)), null);
  };
  glass(backRoof, 0.55, 0.45);
  glass(fv, 0.35, 0.5);
  glass(fu, 0.45, 0.6);
  glass(gable, 0.5, 0.55);
  glass(frontRoof, 0.65, 0.5);
  // glints
  p.line([p.iso(0.24, v1, base + 3), p.iso(0.34, v1, wall - 3)], rgba('#ffffff', 0.85), 1.2);
  p.line([p.iso(0.3, 0.7, wall + 2), p.iso(0.42, 0.6, wall + 8)], rgba('#ffffff', 0.85), 1.2);
  p.line([p.iso(u1, 0.7, base + 3), p.iso(u1, 0.6, wall - 4)], rgba('#ffffff', 0.7), 1);
  // white frame
  const fl = (pts: Pt[], w = 1.4) => thick(p, pts, frame, w);
  for (let i = 0; i <= 3; i++) {
    const u = u0 + ((u1 - u0) * i) / 3;
    fl([p.iso(u, v1, base), p.iso(u, v1, wall), p.iso(u, 0.5, ridge)]);
  }
  fl([p.iso(u0, v1, wall), p.iso(u1, v1, wall)]);
  fl([p.iso(u0, v1, base), p.iso(u1, v1, base)], 1);
  fl([p.iso(u1, v1, wall), p.iso(u1, v0, wall), p.iso(u1, 0.5, ridge)]);
  fl([p.iso(u1, v1, base), p.iso(u1, v0, base), p.iso(u1, v0, wall)], 1);
  fl([p.iso(u1, 0.5, base), p.iso(u1, 0.5, ridge)], 1);
  fl([p.iso(u0, 0.5, ridge), p.iso(u1, 0.5, ridge)]);
  // door handle & ridge finial
  const dh = p.iso(u1, 0.57, 13);
  p.circle(dh.x, dh.y, 0.9, BRASS, null);
  const rq = p.iso(u1, 0.5, ridge);
  p.ball(rq.x, rq.y - 2, 1.5, BRASS);
  // a pot by the door
  const pq = p.iso(0.95, 0.62);
  pot(p, pq.x, pq.y, 3.6, 4);
  p.foliage(pq.x, pq.y - 8, 3.6, LEAF, 'gh-pot', 6);
}

function crate(p: Pen, u: number, v: number, du: number, dv: number, ht: number, z = 0): void {
  p.box(u, v, du, dv, ht, WOOD_L, z);
  const c = shade(WOOD_L, -0.35);
  for (const t of [0.33, 0.66]) {
    p.line([p.iso(u, v + dv, z + ht * t), p.iso(u + du, v + dv, z + ht * t)], c, 0.8);
    p.line([p.iso(u + du, v + dv, z + ht * t), p.iso(u + du, v, z + ht * t)], c, 0.8);
  }
  const hq = p.iso(u + du, v + dv / 2, z + ht * 0.78);
  p.ellipse(hq.x, hq.y, 2.2, 0.9, shade(WOOD_L, -0.5), null, -0.46);
}

function apples(p: Pen, u: number, v: number, du: number, dv: number, z: number, seed: string, col = '#e34a3c'): void {
  const r = rng(seed);
  const pts: { q: Pt; c: string }[] = [];
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      pts.push({ q: p.iso(u + (du * (i + 0.5)) / 3, v + (dv * (j + 0.5)) / 3, z + 2), c: r() < 0.2 ? '#f7c13a' : col });
    }
  }
  pts.push({ q: p.iso(u + du * 0.4, v + dv * 0.4, z + 5), c: col });
  pts.push({ q: p.iso(u + du * 0.65, v + dv * 0.6, z + 5), c: '#8cc04f' });
  pts.sort((a, b) => a.q.y - b.q.y);
  for (const { q, c } of pts) {
    p.ball(q.x, q.y, 2.8, c);
    p.line([{ x: q.x, y: q.y - 2.6 }, { x: q.x + 0.6, y: q.y - 3.8 }], '#5a3a22', 0.6);
  }
}

function appleCrate(p: Pen): void {
  const { x, y } = p.center;
  p.shadow(x, y + 2, 25, 11, 0.26);
  crate(p, 0.14, 0.18, 0.44, 0.42, 11);
  apples(p, 0.14, 0.18, 0.44, 0.42, 11, 'a1');
  crate(p, 0.48, 0.5, 0.38, 0.36, 9);
  apples(p, 0.48, 0.5, 0.38, 0.36, 9, 'a2', '#f05a3a');
  const g = p.iso(0.3, 0.82);
  p.shadow(g.x, g.y + 1, 3, 1.5, 0.3);
  p.ball(g.x, g.y - 2, 2.8, '#e34a3c');
  leafAt(p, g.x + 0.5, g.y - 4.5, 3, -0.6, LEAF);
}

function milkCan(p: Pen, x: number, y: number, s: number, band: string): void {
  p.shadow(x, y + 1, 8 * s, 3.5 * s, 0.28);
  const rx = 6 * s;
  const body = '#c7ccd1';
  p.cylinder(x, y, rx, 12 * s, body);
  p.line([{ x: x - rx, y: y - 6 * s }, { x: x + rx, y: y - 6 * s }], band, 2 * s);
  // shoulder
  shape(
    p,
    (c) => {
      c.moveTo(x - rx, y - 12 * s);
      c.quadraticCurveTo(x - rx, y - 16 * s, x - 3.4 * s, y - 17 * s);
      c.lineTo(x + 3.4 * s, y - 17 * s);
      c.quadraticCurveTo(x + rx, y - 16 * s, x + rx, y - 12 * s);
      c.ellipse(x, y - 12 * s, rx, rx / 2, 0, 0, Math.PI, false);
      c.closePath();
    },
    hgrad(p, x - rx, x + rx, '#e2e6e9', '#8d949a', body),
  );
  p.cylinder(x, y - 17 * s, 3.4 * s, 3 * s, body);
  p.cylinder(x, y - 20 * s, 4 * s, 1.6 * s, shade(body, -0.08));
  p.ellipse(x, y - 22.5 * s, 1.8 * s, 1 * s, null, p.outline);
  // side handles
  for (const d of [-1, 1]) {
    p.ctx.beginPath();
    p.ctx.ellipse(x + d * rx * 0.85, y - 14 * s, 1.6 * s, 1.4 * s, 0, 0, TAU);
    p.ctx.strokeStyle = p.outline;
    p.ctx.lineWidth = 1;
    p.ctx.stroke();
  }
  p.line([{ x: x - rx * 0.55, y: y - 11 * s }, { x: x - rx * 0.55, y: y - 2 * s }], rgba('#ffffff', 0.6), 1);
}

function milkCans(p: Pen): void {
  const a = p.iso(0.32, 0.36);
  const b = p.iso(0.68, 0.42);
  const c = p.iso(0.45, 0.7);
  milkCan(p, a.x, a.y, 1, '#5a8fd8');
  milkCan(p, b.x, b.y, 0.9, '#e8574e');
  milkCan(p, c.x, c.y, 0.95, '#5a8fd8');
  tuft(p, c.x + 10, c.y + 1, 4);
}

function compostBin(p: Pen): void {
  const { x, y } = p.center;
  p.shadow(x, y + 2, 24, 11, 0.26);
  const u0 = 0.2;
  const u1 = 0.8;
  const ht = 14;
  // back boards first
  p.box(u0, u0, u1 - u0, 0.05, ht, WOOD_D);
  p.box(u0, u0, 0.05, u1 - u0, ht, WOOD_D);
  // compost heap inside
  const q0 = p.iso(0.5, 0.5, ht - 3);
  shape(
    p,
    (c) => {
      c.ellipse(q0.x, q0.y, 16, 9, 0, Math.PI, 0);
      c.closePath();
    },
    radial(p, q0.x, q0.y - 4, 14, '#6b4a2f'),
    p.outline,
  );
  const q = { x: q0.x, y: q0.y - 4 };
  // scraps
  p.ellipse(q.x - 6, q.y - 2, 3, 1.6, '#8cc04f', '#4a7a2a', 0.3);
  p.poly(
    [
      { x: q.x + 3, y: q.y - 1 },
      { x: q.x + 8, y: q.y - 3 },
      { x: q.x + 7, y: q.y },
    ],
    '#f39a3c',
    '#a85a1a',
  );
  p.line([{ x: q.x + 8, y: q.y - 3 }, { x: q.x + 10, y: q.y - 5 }], LEAF, 1);
  p.ellipse(q.x, q.y + 1, 2, 1.2, '#fbf3e2', '#b8a888');
  // worm friend
  p.curve({ x: q.x - 2, y: q.y - 2 }, { x: q.x - 1, y: q.y - 7 }, { x: q.x + 1.5, y: q.y - 6 }, '#e88a8a', 1.8);
  p.circle(q.x + 1.6, q.y - 6.2, 0.4, '#3a2a1a', null);
  // front slats with gaps
  for (let i = 0; i < 4; i++) {
    const z = i * 3.6;
    p.box(u0, u1 - 0.05, u1 - u0, 0.05, 2.8, WOOD, z);
    p.box(u1 - 0.05, u0, 0.05, u1 - u0, 2.8, WOOD, z);
  }
  for (const [u, v] of [
    [u0, u1 - 0.05],
    [u1 - 0.05, u1 - 0.05],
    [u1 - 0.05, u0],
  ]) {
    p.box(u, v, 0.05, 0.05, ht + 1, WOOD_D);
  }
}

// ---------------------------------------------------------------------------
// Whimsy & statues

function plinth(p: Pen): number {
  const { x, y } = p.center;
  p.shadow(x, y + 2, 20, 9, 0.28);
  p.box(0.26, 0.26, 0.48, 0.48, 5, STONE);
  return y - 5;
}

function stoneFill(p: Pen, x: number, y: number, r: number): CanvasGradient {
  return radial(p, x, y, r, '#b9b7ae');
}

function moss(p: Pen, x: number, y: number, rx: number, ry: number, rot = 0): void {
  p.ellipse(x, y, rx, ry, MOSS, shade(MOSS, -0.4), rot);
  p.ellipse(x - rx * 0.25, y - ry * 0.3, rx * 0.5, ry * 0.4, shade(MOSS, 0.3), null, rot);
}

function frogStatue(p: Pen): void {
  const { x } = p.center;
  const b = plinth(p);
  const so = '#6f6c64';
  p.ellipse(x - 10, b - 3, 5, 3.4, stoneFill(p, x - 10, b - 3, 5), so);
  p.ellipse(x + 10, b - 3, 5, 3.4, stoneFill(p, x + 10, b - 3, 5), so);
  p.ellipse(x, b - 8, 12, 9, stoneFill(p, x, b - 10, 12), so);
  for (const d of [-1, 1]) {
    p.circle(x + d * 6, b - 16, 4.4, stoneFill(p, x + d * 6, b - 16, 4.4), so);
    p.circle(x + d * 6, b - 16, 2.2, '#8e8b82', null);
    p.circle(x + d * 6.6, b - 16.8, 0.8, '#e2e0d8', null);
  }
  p.ctx.beginPath();
  p.ctx.moveTo(x - 7, b - 9);
  p.ctx.quadraticCurveTo(x, b - 4.5, x + 7, b - 9);
  p.ctx.strokeStyle = so;
  p.ctx.lineWidth = 1;
  p.ctx.stroke();
  p.ellipse(x - 4, b - 1, 2.6, 1.6, stoneFill(p, x - 4, b - 1, 3), so);
  p.ellipse(x + 4, b - 1, 2.6, 1.6, stoneFill(p, x + 4, b - 1, 3), so);
  // little gilded crown
  p.poly(
    [
      { x: x - 3, y: b - 18 },
      { x: x - 3, y: b - 22 },
      { x: x - 1.5, y: b - 20 },
      { x, y: b - 23 },
      { x: x + 1.5, y: b - 20 },
      { x: x + 3, y: b - 22 },
      { x: x + 3, y: b - 18 },
    ],
    '#f2c94a',
    '#9a7420',
  );
  moss(p, x - 6, b - 11, 3.5, 1.8, -0.2);
  moss(p, x - 12, p.center.y - 1, 3, 1.4);
}

function owlStatue(p: Pen): void {
  const { x } = p.center;
  const b = plinth(p);
  const so = '#6f6c64';
  // ear tufts
  for (const d of [-1, 1]) {
    p.poly(
      [
        { x: x + d * 3, y: b - 24 },
        { x: x + d * 8, y: b - 31 },
        { x: x + d * 8.5, y: b - 22 },
      ],
      '#b0aea5',
      so,
    );
  }
  p.ellipse(x, b - 14, 9.5, 13.5, stoneFill(p, x, b - 16, 12), so);
  // belly scallops
  for (let row = 0; row < 3; row++) {
    for (let k = -1; k <= 1; k++) {
      const sx = x + k * 3 + (row % 2) * 1.5 - 0.7;
      const sy = b - 10 + row * 3;
      p.ctx.beginPath();
      p.ctx.arc(sx, sy, 1.4, 0.2, Math.PI - 0.2);
      p.ctx.strokeStyle = '#8e8b82';
      p.ctx.lineWidth = 0.7;
      p.ctx.stroke();
    }
  }
  // wings
  for (const d of [-1, 1]) {
    shape(
      p,
      (c) => {
        c.moveTo(x + d * 8, b - 20);
        c.quadraticCurveTo(x + d * 11, b - 10, x + d * 6, b - 3);
        c.quadraticCurveTo(x + d * 7, b - 12, x + d * 8, b - 20);
      },
      '#a3a199',
      so,
      0.8,
    );
  }
  // face
  for (const d of [-1, 1]) {
    p.circle(x + d * 3.8, b - 19, 4, '#d6d4cb', so);
    p.circle(x + d * 3.8, b - 19, 2, '#7d7a72', null);
    p.circle(x + d * 3.3, b - 19.6, 0.7, '#f2f0e8', null);
  }
  p.poly(
    [
      { x: x - 1.4, y: b - 16.5 },
      { x: x + 1.4, y: b - 16.5 },
      { x, y: b - 13.5 },
    ],
    '#9a978e',
    so,
  );
  for (const d of [-1, 1]) {
    p.ellipse(x + d * 3, b - 1, 2.4, 1.2, '#a3a199', so);
  }
  moss(p, x - 2, b - 26, 4, 1.8, 0.1);
  moss(p, x + 7, b - 8, 2, 3, 0.3);
}

function bunnyStatue(p: Pen): void {
  const { x } = p.center;
  const b = plinth(p);
  const so = '#6f6c64';
  // tail
  p.circle(x - 10, b - 6, 3.4, stoneFill(p, x - 10, b - 6, 3.4), so);
  // ears behind head
  p.ellipse(x + 2, b - 30, 2.6, 7.5, stoneFill(p, x + 2, b - 30, 6), so, -0.25);
  p.ellipse(x + 8, b - 29, 2.6, 7.5, stoneFill(p, x + 8, b - 29, 6), so, 0.3);
  p.ellipse(x + 2, b - 30, 1.2, 5, '#a3a199', null, -0.25);
  p.ellipse(x + 8, b - 29, 1.2, 5, '#a3a199', null, 0.3);
  // body
  p.ellipse(x - 2, b - 9, 10, 8.5, stoneFill(p, x - 4, b - 12, 10), so);
  // head
  p.circle(x + 5, b - 19, 6.5, stoneFill(p, x + 4, b - 21, 6.5), so);
  // closed happy eye, nose, cheek
  p.ctx.beginPath();
  p.ctx.arc(x + 7, b - 20, 1.3, Math.PI + 0.3, -0.3);
  p.ctx.strokeStyle = '#6f6c64';
  p.ctx.lineWidth = 0.9;
  p.ctx.stroke();
  p.circle(x + 10.6, b - 18, 0.9, '#8e8b82', null);
  // front paws
  p.ellipse(x + 4, b - 1.5, 2.6, 1.6, stoneFill(p, x + 4, b - 2, 3), so);
  p.ellipse(x - 5, b - 1.5, 3, 1.6, stoneFill(p, x - 5, b - 2, 3), so);
  moss(p, x - 5, b - 15, 4, 1.8, -0.2);
  moss(p, x + 3, b - 25, 2, 1.2, 0);
  p.flower(x - 13, p.center.y, 1.8, '#ffffff', '#f6c335');
}

function mossyRock(p: Pen): void {
  const { x, y } = p.center;
  p.shadow(x, y + 2, 22, 9, 0.3);
  const pts = wobbly(x, y - 8, 18, 12, 'rock', 10, 0.12).map((q) => (q.y > y - 4 ? { x: q.x, y: y - 1 + (q.y - y) * 0.2 } : q));
  shape(p, smoothPath(pts), radial(p, x - 3, y - 12, 18, '#aaa79c'));
  // second smaller rock
  const pts2 = wobbly(x + 13, y - 2, 7, 5, 'rock2', 8, 0.12);
  shape(p, smoothPath(pts2), radial(p, x + 12, y - 4, 7, '#a09d93'));
  // moss cap
  const mossPts = wobbly(x - 3, y - 16, 12, 5.5, 'rockmoss', 9, 0.2);
  shape(p, smoothPath(mossPts), MOSS, shade(MOSS, -0.4));
  p.ellipse(x - 6, y - 18, 5, 2, shade(MOSS, 0.3), null);
  // drips of moss
  for (const dx of [-12, -4, 6]) p.ellipse(x + dx, y - 12, 1.6, 2.6, MOSS, null);
  p.line([{ x: x + 4, y: y - 6 }, { x: x + 8, y: y - 3 }, { x: x + 7, y: y - 1 }], rgba('#5a5850', 0.6), 0.8);
  p.ellipse(x + 13, y - 6, 3, 1.4, MOSS, shade(MOSS, -0.4));
  // tiny clover & flower
  p.flower(x - 2, y - 21, 2, '#ffffff', '#f6c335');
  tuft(p, x - 16, y + 1, 4);
}

function treeStump(p: Pen): void {
  const { x, y } = p.center;
  p.shadow(x, y + 2, 20, 9, 0.28);
  // roots
  for (const [dx, dy, d] of [
    [-12, 1, -1],
    [10, 3, 1],
    [-2, 5, 0],
  ]) {
    shape(
      p,
      (c) => {
        c.moveTo(x + dx - 3, y + dy - 6);
        c.quadraticCurveTo(x + dx + d * 3, y + dy - 1, x + dx + d * 5, y + dy + 1);
        c.quadraticCurveTo(x + dx + 2, y + dy - 1, x + dx + 3, y + dy - 6);
        c.closePath();
      },
      BARK,
    );
  }
  p.cylinder(x, y, 12, 11, '#8a5e3c');
  // bark grooves
  for (const dx of [-8, -3, 3, 8]) p.line([{ x: x + dx, y: y - 10 + Math.abs(dx) * 0.2 }, { x: x + dx * 1.02, y: y + 5 - Math.abs(dx) * 0.35 }], rgba('#4a3022', 0.45), 0.8);
  // rings
  p.ellipse(x, y - 11, 12, 6, '#e8c48e', p.outline);
  for (const k of [9, 6, 3]) p.ellipse(x + 0.5, y - 11, k, k / 2, null, '#c4945a');
  p.line([{ x: x + 1, y: y - 11 }, { x: x + 8, y: y - 13 }], '#b88a52', 0.6);
  // mushrooms & sprout
  mushroom(p, x + 11, y + 2, 3, '#e5483e');
  mushroom(p, x + 15, y + 1, 2.2, '#e8a24a');
  leafAt(p, x - 4, y - 12, 4, -2.3, LEAF_L);
  leafAt(p, x - 4, y - 12, 4, -0.9, LEAF);
}

function logPile(p: Pen): void {
  const { x, y } = p.center;
  p.shadow(x, y + 2, 25, 10, 0.28);
  const len = 0.5;
  const log = (u: number, z: number, r: number) => {
    // logs run along v; their cut ends face front-left
    const back = p.iso(u, 0.2, z + r);
    const front = p.iso(u, 0.2 + len, z + r);
    p.line([back, front], p.outline, r * 2 + 2);
    p.line([back, front], '#8a5e3c', r * 2);
    p.line([{ x: back.x, y: back.y - r * 0.6 }, { x: front.x, y: front.y - r * 0.6 }], rgba('#c99a6a', 0.6), 1);
    p.ellipse(front.x, front.y, r * 0.95, r, '#e8c48e', p.outline, 0);
    p.ellipse(front.x, front.y, r * 0.55, r * 0.6, null, '#c4945a', 0);
    p.circle(front.x, front.y, 0.6, '#b88a52', null);
  };
  const R = 4.2;
  log(0.28, 0, R);
  log(0.5, 0, R);
  log(0.72, 0, R);
  log(0.39, R * 1.7, R);
  log(0.61, R * 1.7, R);
  log(0.5, R * 3.4, R);
  // axe-free: just a little sprig of leaves
  leafAt(p, x + 16, y + 2, 5, -2.1, LEAF);
  leafAt(p, x + 16, y + 2, 5, -1.0, LEAF_D);
}

function windchime(p: Pen): void {
  const { x, y } = p.center;
  p.shadow(x - 6, y + 1, 7, 3, 0.28);
  tuft(p, x - 6, y + 2, 5);
  const px = x - 6;
  // wooden post with arm
  p.roundRect(px - 1.8, y - 50, 3.6, 51, 1, hgrad(p, px - 2, px + 2, WOOD_L, WOOD_D));
  thick(p, [{ x: px, y: y - 46 }, { x: px + 16, y: y - 46 }], WOOD, 1.6);
  p.line([{ x: px + 1, y: y - 40 }, { x: px + 6, y: y - 46 }], WOOD_D, 1);
  const cx = px + 14;
  const top = y - 40;
  p.line([{ x: cx, y: y - 46 }, { x: cx, y: top }], '#7a7f84', 0.7);
  for (const dx of [-5, 5]) p.line([{ x: cx, y: top - 2 }, { x: cx + dx, y: top + 1 }], '#7a7f84', 0.5);
  // crown disc
  p.cylinder(cx, top + 2, 6, 1.6, WOOD_L);
  // tubes
  const cols = ['#bfe0f0', '#f6c6d6', '#c8e8c0', '#f7e0a0', '#d8c8f0'];
  const lens = [12, 16, 19, 15, 11];
  for (let i = 0; i < 5; i++) {
    const tx = cx - 5 + i * 2.5;
    const ty = top + 3 + (i % 2) * 0.8;
    p.line([{ x: tx, y: top + 1 }, { x: tx, y: ty }], '#7a7f84', 0.4);
    p.roundRect(tx - 0.9, ty, 1.8, lens[i], 0.9, hgrad(p, tx - 1, tx + 1, '#ffffff', shade(cols[i], -0.25), cols[i]), shade(cols[i], -0.5));
  }
  // striker & sail
  p.line([{ x: cx, y: top + 2 }, { x: cx, y: top + 24 }], '#7a7f84', 0.4);
  p.ellipse(cx, top + 13, 2.2, 0.8, WOOD_L, p.outline);
  p.heart(cx, top + 27, 3, '#f27a9a');
  // music notes
  p.text('♪', cx + 9, top + 4, 7, rgba('#5a7fc0', 0.75));
  p.text('♫', cx - 10, top + 12, 6, rgba('#e0559a', 0.65));
}

function pinwheel(p: Pen): void {
  const { x, y } = p.center;
  p.shadow(x, y + 1, 9, 4, 0.26);
  tuft(p, x - 4, y + 2, 5);
  tuft(p, x + 5, y + 3, 4);
  const wheel = (px: number, py: number, s: number, cols: string[], rot: number) => {
    for (let i = 0; i < 4; i++) {
      const a = rot + (i / 4) * TAU;
      const a2 = a + Math.PI / 2;
      const tip = { x: px + Math.cos(a) * s, y: py + Math.sin(a) * s };
      const side = { x: px + Math.cos(a2) * s * 0.72, y: py + Math.sin(a2) * s * 0.72 };
      const bulge = { x: px + Math.cos(a + 0.8) * s * 1.05, y: py + Math.sin(a + 0.8) * s * 1.05 };
      shape(
        p,
        (c) => {
          c.moveTo(px, py);
          c.lineTo(tip.x, tip.y);
          c.quadraticCurveTo(bulge.x, bulge.y, side.x, side.y);
          c.closePath();
        },
        cols[i],
        shade(cols[i], -0.5),
      );
      // folded flap
      p.poly([{ x: px, y: py }, tip, lerp({ x: px, y: py }, side, 0.55)], shade(cols[i], 0.3), shade(cols[i], -0.4), 0.6);
    }
    p.circle(px, py, s * 0.16, '#fff3b0', p.outline);
  };
  // small one behind
  thick(p, [{ x: x + 9, y: y + 1 }, { x: x + 9, y: y - 20 }], '#f7f0e0', 1);
  wheel(x + 9, y - 21, 7, ['#9ad08a', '#f7c86a', '#7fb2dc', '#f28a8a'], 0.6);
  thick(p, [{ x: x - 4, y: y + 2 }, { x: x - 4, y: y - 30 }], '#f7f0e0', 1.2);
  for (let k = 0; k < 5; k++) p.line([{ x: x - 5, y: y - 3 - k * 6 }, { x: x - 3, y: y - 5 - k * 6 }], '#e8574e', 1);
  wheel(x - 4, y - 32, 11, ['#f28a8a', '#7fb2dc', '#f7c86a', '#9ad08a'], 0.2);
}

function hotAirBalloon(p: Pen): void {
  const { x, y } = p.center;
  // ground: soft shadow far below, tether stake
  p.shadow(x + 4, y + 2, 22, 10, 0.18);
  const stake = p.iso(1.2, 1.3);
  p.box(1.15, 1.25, 0.1, 0.1, 6, WOOD_D);
  tuft(p, stake.x - 5, stake.y + 2, 5);
  p.flower(stake.x + 6, stake.y + 1, 2, '#f48fb8');
  const bx = x - 2;
  const by = y - 46; // basket bottom
  // tether rope (gentle curve)
  p.curve({ x: stake.x, y: stake.y - 6 }, { x: stake.x + 6, y: (stake.y + by) / 2 + 6 }, { x: bx + 5, y: by - 2 }, '#c8b28a', 0.9);
  // envelope
  const ex = bx;
  const ey = by - 46;
  const R = 26;
  const env = (c: Ctx) => {
    c.moveTo(ex - R * 0.32, ey + R * 1.18);
    c.bezierCurveTo(ex - R * 0.9, ey + R * 0.75, ex - R * 1.05, ey + R * 0.25, ex - R, ey);
    c.arc(ex, ey, R, Math.PI, 0);
    c.bezierCurveTo(ex + R * 1.05, ey + R * 0.25, ex + R * 0.9, ey + R * 0.75, ex + R * 0.32, ey + R * 1.18);
    c.closePath();
  };
  // ropes from envelope to basket
  for (const d of [-1, -0.35, 0.35, 1]) {
    p.line([{ x: ex + d * R * 0.32, y: ey + R * 1.18 }, { x: bx + d * 6, y: by - 7 }], '#8a7a5a', 0.7);
  }
  shape(p, env, '#e8574e');
  withClip(p, env, () => {
    const cols = ['#e8574e', '#fdf3e4', '#f7c84a', '#fdf3e4', '#5fb3c8', '#fdf3e4'];
    const widths = [1, 0.84, 0.68, 0.52, 0.34, 0.16];
    widths.forEach((w, i) => p.ellipse(ex, ey + R * 0.3, R * 1.1 * w, R * 1.6, cols[i], null));
    // horizontal band
    p.ellipse(ex, ey + R * 0.55, R * 1.2, R * 0.22, null, rgba('#4a3426', 0.4));
    const g = p.ctx.createRadialGradient(ex - R * 0.4, ey - R * 0.5, 2, ex, ey, R * 1.4);
    g.addColorStop(0, 'rgba(255,255,255,0.35)');
    g.addColorStop(0.5, 'rgba(255,255,255,0)');
    g.addColorStop(1, 'rgba(60,30,20,0.3)');
    p.rect(ex - R * 1.2, ey - R * 1.2, R * 2.4, R * 2.6, g, null);
  });
  shape(p, env, null);
  // bunting around the belly
  for (let i = 0; i < 7; i++) {
    const t = (i + 0.5) / 7;
    const fx = ex - R * 0.95 + t * R * 1.9;
    const fy = ey + R * 0.55 + Math.sin(t * Math.PI) * R * 0.2;
    p.poly(
      [
        { x: fx - 2, y: fy },
        { x: fx + 2, y: fy },
        { x: fx, y: fy + 3.5 },
      ],
      ['#7fb2dc', '#f7c84a', '#9ad08a', '#f29ab8'][i % 4],
      null,
    );
  }
  // skirt
  p.poly(
    [
      { x: ex - R * 0.32, y: ey + R * 1.16 },
      { x: ex + R * 0.32, y: ey + R * 1.16 },
      { x: ex + R * 0.22, y: ey + R * 1.36 },
      { x: ex - R * 0.22, y: ey + R * 1.36 },
    ],
    '#f7c84a',
  );
  // basket
  p.glow(bx, by - 8, 7, GLOW, 0.5);
  p.roundRect(bx - 7, by - 9, 14, 9, 2, hgrad(p, bx - 7, bx + 7, '#d6a066', '#9c6a3c', '#c08850'));
  for (let k = -5; k <= 5; k += 2.5) p.line([{ x: bx + k, y: by - 8 }, { x: bx + k, y: by - 1 }], rgba('#6b4422', 0.5), 0.6);
  p.rect(bx - 7.6, by - 10, 15.2, 2.4, '#8a5a34', p.outline);
  // a tiny teddy passenger
  p.circle(bx + 2, by - 12.5, 2.6, '#c98a52', p.outline);
  p.circle(bx + 0.3, by - 14.6, 1, '#c98a52', p.outline);
  p.circle(bx + 3.7, by - 14.6, 1, '#c98a52', p.outline);
  p.circle(bx + 2, by - 11.8, 0.9, '#f0d0a8', null);
  p.circle(bx + 1.2, by - 13.2, 0.4, '#2b2b2b', null);
  p.circle(bx + 2.8, by - 13.2, 0.4, '#2b2b2b', null);
  // little clouds
  const cloud = (cx: number, cy: number, s: number) => {
    p.circle(cx - 3 * s, cy, 3 * s, rgba('#ffffff', 0.85), null);
    p.circle(cx + 1 * s, cy - 2 * s, 4 * s, rgba('#ffffff', 0.85), null);
    p.circle(cx + 4.5 * s, cy, 3 * s, rgba('#ffffff', 0.85), null);
  };
  cloud(ex + R + 8, ey + 10, 1);
  cloud(ex - R - 6, ey - 8, 0.8);
}

function telescope(p: Pen): void {
  const { x, y } = p.center;
  p.shadow(x, y + 1, 16, 7, 0.26);
  const apex = { x, y: y - 22 };
  const legs = [
    { x: x - 11, y: y - 1 },
    { x: x + 10, y: y - 2 },
    { x: x + 1, y: y + 5 },
  ];
  thick(p, [apex, legs[0]], WOOD, 1.5);
  thick(p, [apex, legs[1]], WOOD, 1.5);
  // tube angled up toward the stars
  const navy = '#3b4f8f';
  const a = { x: x - 10, y: y - 16 };
  const b = { x: x + 14, y: y - 36 };
  const ang = Math.atan2(b.y - a.y, b.x - a.x);
  p.save();
  p.ctx.translate(a.x, a.y);
  p.ctx.rotate(ang);
  const L = Math.hypot(b.x - a.x, b.y - a.y);
  shape(
    p,
    (c) => {
      c.moveTo(0, -2.4);
      c.lineTo(L, -3.6);
      c.lineTo(L, 3.6);
      c.lineTo(0, 2.4);
      c.closePath();
    },
    p.vgrad(-3.6, 3.6, '#6f86c8', '#2a3a6a'),
  );
  p.rect(L - 1, -4.4, 3, 8.8, BRASS, p.outline);
  p.rect(L * 0.45, -3.4, 2.4, 6.8, BRASS, p.outline);
  p.rect(-3, -1.6, 3.4, 3.2, BRASS, p.outline);
  for (let k = 0; k < 3; k++) sparkle(p, L * 0.2 + k * 6, -0.6, 0.9, rgba('#ffffff', 0.8));
  p.restore();
  void navy;
  thick(p, [apex, legs[2]], WOOD, 1.5);
  p.circle(apex.x, apex.y, 1.8, BRASS, p.outline);
  // stars
  sparkle(p, x + 20, y - 50, 3.2, '#ffe680');
  sparkle(p, x + 8, y - 56, 2, '#fff3b0');
  sparkle(p, x + 26, y - 40, 1.6, '#fff3b0');
  p.star(x - 10, y - 46, 2.6, '#ffe680', '#c9a020');
}

function totemPole(p: Pen): void {
  const { x, y } = p.center;
  p.shadow(x, y + 1, 14, 6, 0.28);
  tuft(p, x - 9, y + 2, 5);
  tuft(p, x + 9, y + 3, 4);
  const rx = 8;
  // bottom: bear
  const seg = (y0: number, h: number, col: string) => {
    p.cylinder(x, y0, rx, h, col);
  };
  seg(y, 20, '#a8643a');
  // bear face
  const bf = y - 9;
  p.circle(x - 6, bf - 8, 2.4, '#a8643a', p.outline);
  p.circle(x + 6, bf - 8, 2.4, '#a8643a', p.outline);
  p.ellipse(x, bf + 2, 4, 3, '#e8c48e', p.outline);
  p.circle(x, bf + 0.8, 1.2, '#3a2a1a', null);
  p.circle(x - 3.2, bf - 3, 1.2, '#3a2a1a', null);
  p.circle(x + 3.2, bf - 3, 1.2, '#3a2a1a', null);
  p.circle(x - 5, bf + 0.5, 1.2, rgba('#f28a8a', 0.6), null);
  p.circle(x + 5, bf + 0.5, 1.2, rgba('#f28a8a', 0.6), null);
  // middle: frog
  seg(y - 20, 17, '#6fb36a');
  const ff = y - 28;
  p.circle(x - 3.6, ff - 3, 2.4, '#fdfbf2', p.outline);
  p.circle(x + 3.6, ff - 3, 2.4, '#fdfbf2', p.outline);
  p.circle(x - 3.6, ff - 3, 1.1, '#2b2b2b', null);
  p.circle(x + 3.6, ff - 3, 1.1, '#2b2b2b', null);
  p.ctx.beginPath();
  p.ctx.moveTo(x - 4.5, ff + 1.5);
  p.ctx.quadraticCurveTo(x, ff + 5, x + 4.5, ff + 1.5);
  p.ctx.strokeStyle = p.outline;
  p.ctx.lineWidth = 1;
  p.ctx.stroke();
  p.circle(x - 5.5, ff + 1.5, 1, rgba('#f28a8a', 0.6), null);
  p.circle(x + 5.5, ff + 1.5, 1, rgba('#f28a8a', 0.6), null);
  // top: owl with wings
  const ot = y - 37;
  for (const d of [-1, 1]) {
    p.poly(
      [
        { x: x + d * 6, y: ot - 8 },
        { x: x + d * 19, y: ot - 14 },
        { x: x + d * 17, y: ot - 9 },
        { x: x + d * 19, y: ot - 7 },
        { x: x + d * 16, y: ot - 3 },
        { x: x + d * 6, y: ot - 2 },
      ],
      d < 0 ? '#5fa8d8' : shade('#5fa8d8', -0.2),
    );
    p.line([{ x: x + d * 8, y: ot - 6 }, { x: x + d * 15, y: ot - 9 }], rgba('#ffffff', 0.5), 0.8);
  }
  seg(ot, 15, '#5fa8d8');
  const of = ot - 8;
  p.circle(x - 3.5, of - 1, 3, '#fdf6e0', p.outline);
  p.circle(x + 3.5, of - 1, 3, '#fdf6e0', p.outline);
  p.circle(x - 3.5, of - 1, 1.4, '#2b2b2b', null);
  p.circle(x + 3.5, of - 1, 1.4, '#2b2b2b', null);
  p.poly(
    [
      { x: x - 1.6, y: of + 2 },
      { x: x + 1.6, y: of + 2 },
      { x, y: of + 5.5 },
    ],
    '#f7c84a',
  );
  // ears
  for (const d of [-1, 1]) {
    p.poly(
      [
        { x: x + d * 2, y: ot - 15 - rx / 2 + 1 },
        { x: x + d * 7, y: ot - 15 - rx / 2 - 6 },
        { x: x + d * 7.5, y: ot - 15 - rx / 2 + 2 },
      ],
      '#5fa8d8',
    );
  }
  p.flower(x, ot - 15 - 1, 2.2, '#f48fb8');
}

function archedBridge(p: Pen): void {
  const v0 = 0.22;
  const v1 = 0.78;
  const H = 13;
  const n = 20;
  const z = (u: number) => Math.sin((u / 2) * Math.PI) * H;
  lineShadow(p, 0, 2, 0.5, 12, 0.18);
  // a hint of stream underneath
  const sq = p.iso(1, 0.5);
  p.ellipse(sq.x, sq.y, 14, 7, rgba(WATER, 0.65), null);
  p.ellipse(sq.x - 3, sq.y - 1, 4, 1.2, rgba('#ffffff', 0.6), null);
  const railing = (v: number) => {
    const top: Pt[] = [];
    for (let i = 0; i <= n; i++) {
      const u = (i / n) * 2;
      top.push(p.iso(u, v, z(u) + 8));
    }
    for (let i = 0; i <= n; i += 4) {
      const u = (i / n) * 2;
      thick(p, [p.iso(u, v, z(u)), p.iso(u, v, z(u) + 9)], '#d9574a', 1.6);
      p.circle(top[i].x, top[i].y - 1.5, 1.5, BRASS, p.outline);
    }
    p.line(top, p.outline, 3.6);
    p.line(top, '#e8675a', 2);
  };
  railing(v0);
  // deck planks
  for (let i = 0; i < n; i++) {
    const ua = (i / n) * 2;
    const ub = ((i + 1) / n) * 2;
    const quad = [p.iso(ua, v0, z(ua)), p.iso(ub, v0, z(ub)), p.iso(ub, v1, z(ub)), p.iso(ua, v1, z(ua))];
    p.poly(quad, i % 2 ? WOOD_L : shade(WOOD_L, -0.08), shade(WOOD_L, -0.4), 0.5);
  }
  // front fascia with pastel rainbow bands
  const bands = ['#f28a8a', '#f7c86a', '#9ad08a', '#7fb2dc', '#b9a0e0'];
  const bandH = 1.6;
  const fasc = (zOff: number): Pt[] => {
    const pts: Pt[] = [];
    for (let i = 0; i <= n; i++) {
      const u = (i / n) * 2;
      pts.push(p.iso(u, v1, Math.max(0, z(u) - zOff)));
    }
    return pts;
  };
  bands.forEach((col, k) => {
    const top = fasc(k * bandH);
    const bot = fasc((k + 1) * bandH);
    p.poly([...top, ...bot.reverse()], col, null);
  });
  const topEdge = fasc(0);
  const botEdge = fasc(bands.length * bandH);
  p.line(topEdge, p.outline, 1);
  p.line(botEdge, p.outline, 1);
  // end caps
  for (const u of [0, 2]) p.line([p.iso(u, v0, 0), p.iso(u, v1, 0)], p.outline, 1);
  railing(v1);
}

// ---------------------------------------------------------------------------
// Table: id → [headroom, painter]

const TABLE: Record<string, [number, Painter]> = {
  // flowers
  tulips_red: [24, tulips('#e8484a')],
  tulips_yellow: [24, tulips('#f7cd3c')],
  tulips_pink: [24, tulips('#f59ab8')],
  tulips_purple: [24, tulips('#9b6ad6')],
  roses_red: [28, roses('#e23a48')],
  roses_white: [28, roses('#fbf6ee')],
  roses_pink: [28, roses('#f590b0')],
  daisies: [20, daisies],
  pansies: [18, pansies],
  cosmos: [30, cosmos],
  hyacinths: [24, hyacinths],
  lilies: [32, lilies],
  mums: [26, mums],
  wildflowers: [20, wildflowers],
  sunflower_row: [56, sunflowerRow],
  lily_of_valley: [26, lilyOfValley],
  flower_planter: [24, flowerPlanter],
  hanging_basket: [70, hangingBasket],
  // plants
  round_bush: [28, roundBush],
  hydrangea_blue: [30, hydrangea('#8fb2f0')],
  hydrangea_pink: [30, hydrangea('#f6a0c4')],
  azalea: [28, azalea],
  square_hedge: [24, squareHedge],
  topiary_ball: [62, topiaryBall],
  topiary_bunny: [58, topiaryBunny],
  cedar_tree: [76, cedarTree],
  birch_tree: [76, birchTree],
  cherry_blossom: [80, cherryBlossom],
  weeping_willow: [86, weepingWillow],
  bamboo: [66, bamboo],
  potted_fern: [34, pottedFern],
  cactus_pot: [52, cactusPot],
  mushroom_ring: [20, mushroomRing],
  // fences
  picket_fence: [22, picketFence],
  log_fence: [22, logFence],
  iron_fence: [22, ironFence],
  stone_wall: [16, stoneWall],
  bamboo_fence: [22, bambooFence],
  hedge_fence: [22, hedgeFence],
  garden_gate: [40, gardenGate],
  // paths
  path_stone: [4, pathStone],
  path_brick: [2, pathBrick],
  path_cobble: [2, pathCobble],
  path_dirt: [2, pathDirt],
  path_wood: [2, pathWood],
  path_sand: [4, pathSand],
  path_flower: [2, pathFlower],
  picnic_blanket: [16, picnicBlanket],
  // furniture
  bench_wood: [32, bench({ slat: '#c08a55', frame: '#7a5236', kind: 'wood' })],
  bench_white: [34, bench({ slat: '#fbf7ee', frame: '#e8e0d0', kind: 'white' })],
  bench_iron: [32, bench({ slat: '#5f9e7a', frame: '#2f3438', kind: 'iron' })],
  picnic_table: [30, picnicTable],
  garden_chair: [38, gardenChair],
  deck_chair: [30, deckChair],
  cafe_table: [64, cafeTable],
  hammock: [40, hammock],
  tree_swing: [80, treeSwing],
  rocking_chair: [40, rockingChair],
  outdoor_bookshelf: [54, littleLibrary],
  tea_set: [32, teaSet],
  // lights
  street_lamp: [80, streetLamp],
  garden_lantern: [48, gardenLantern],
  stone_lantern: [60, stoneLantern],
  firefly_jar: [32, fireflyJar],
  string_lights: [52, stringLights],
  campfire: [34, campfire],
  // water
  birdbath: [34, birdbath],
  well: [64, wishingWell],
  fountain: [72, fountain],
  pond: [22, pond(false)],
  koi_pond: [12, pond(true)],
  water_pump: [42, waterPump],
  rain_barrel: [30, rainBarrel],
  // garden
  scarecrow: [64, scarecrow],
  wheelbarrow: [26, wheelbarrow],
  hay_bale: [22, hayBale],
  mailbox: [42, mailbox],
  signpost: [54, signpost],
  birdhouse: [66, birdhouse],
  watering_cans: [22, wateringCans],
  garden_gnome: [40, gardenGnome],
  sundial: [30, sundial],
  flower_arch: [62, roseArch],
  gazebo: [96, gazebo],
  greenhouse_mini: [40, miniGreenhouse],
  apple_crate: [24, appleCrate],
  milk_cans: [30, milkCans],
  compost_bin: [24, compostBin],
  // whimsy
  frog_statue: [30, frogStatue],
  owl_statue: [40, owlStatue],
  bunny_statue: [42, bunnyStatue],
  mossy_rock: [28, mossyRock],
  tree_stump: [22, treeStump],
  log_pile: [26, logPile],
  windchime: [56, windchime],
  pinwheel: [46, pinwheel],
  hot_air_balloon: [110, hotAirBalloon],
  telescope: [60, telescope],
  totem_pole: [78, totemPole],
  rainbow_bridge: [34, archedBridge],
};

export const sprites: SpriteSpec[] = DECORATION_LIST.filter((d) => !d.event && TABLE[d.id]).map((d) => {
  const [height, paint] = TABLE[d.id];
  return { key: `deco:${d.id}`, fw: d.w, fh: d.h, height, paint };
});

export const icons: IconSpec[] = [];
