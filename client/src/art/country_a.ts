// Country decorations, first batch: the red barn, silo, vehicles, coop, play
// equipment, treehouse, carousel, pond and camping bits.
//
// Every entry of COUNTRY_DECORATIONS.slice(0, 18) gets a `deco:<id>` sprite.
// Footprint comes from the def; the table below maps each id to its headroom
// and painter. Unknown ids fall back to a little cube with a flower on top.
import { type IconSpec, type SpriteSpec, type Pen, shade, rng, mix, rgba, boxColors } from './kit';
import { COUNTRY_DECORATIONS } from '@farm/shared';

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

const BARN = '#c8473a';
const BARN_D = '#8e2f29';
const TRIM = '#fbf6ea';
const ROOF = '#6d6a72';
const WOOD = '#b98352';
const WOOD_D = '#8d5c36';
const WOOD_L = '#d9aa74';
const STONE = '#b3afa4';
const STONE_D = '#8d897f';
const STONE_L = '#d4d1c6';
const LEAF = '#5fae4a';
const LEAF_D = '#43893c';
const LEAF_L = '#8fd06a';
const STEM = '#4f8f3a';
const IRON = '#3d4549';
const WHITE = '#fbf7ee';
const WATER = '#6ec6e6';
const WATER_D = '#3f9cc8';
const GLOW = '#ffd27a';
const HAY = '#e8c35a';
const CREAM = '#f7efdc';
const PINK = '#f49bb5';
const BLUE = '#8fc4e8';
const SKY = '#bfe6f5';
const CHERRY = '#d8323a';
const MINT = '#9fe0c4';
const LILAC = '#c9a8e8';
const SUN = '#ffd84a';
const SANDY = '#f0d9a0';

// ---------------------------------------------------------------------------
// Generic helpers

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

/** Smooth closed curve through edge midpoints of a polygon (rounded blobs). */
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

function withClip(p: Pen, build: (c: Ctx) => void, fn: () => void): void {
  p.save();
  p.ctx.beginPath();
  build(p.ctx);
  p.ctx.clip();
  fn();
  p.restore();
}

/** Flat ground space: one tile = 32x32 units, x along u and y along v. */
function flat(p: Pen, fn: () => void): void {
  p.save();
  p.ctx.transform(1, 0.5, -1, 0.5, p.fh * 32, p.height);
  fn();
  p.restore();
}

/** Line with an outline underneath (rails, ropes, iron work). */
function thick(p: Pen, pts: Pt[], color: string, w: number, outline: string = p.outline): void {
  p.line(pts, outline, w + 2);
  p.line(pts, color, w);
}

function thickCurve(p: Pen, a: Pt, c: Pt, b: Pt, color: string, w: number): void {
  p.curve(a, c, b, p.outline, w + 2);
  p.curve(a, c, b, color, w);
}

function lerp(a: Pt, b: Pt, t: number): Pt {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

function stem(p: Pen, x0: number, y0: number, x1: number, y1: number, color = STEM, w = 1.3): void {
  p.curve({ x: x0, y: y0 }, { x: x0 + (x1 - x0) * 0.2, y: (y0 + y1) / 2 }, { x: x1, y: y1 }, color, w);
}

function leafAt(p: Pen, x: number, y: number, len: number, ang: number, color: string, w = 0.22): void {
  const cx = x + (Math.cos(ang) * len) / 2;
  const cy = y + (Math.sin(ang) * len) / 2;
  p.ellipse(cx, cy, len / 2, Math.max(0.8, len * w), color, shade(color, -0.42), ang);
}

/** Soft shadow running along the u axis. */
function lineShadow(p: Pen, u0: number, u1: number, v: number, r = 7, alpha = 0.16): void {
  const steps = Math.max(2, Math.round((u1 - u0) * 5));
  for (let i = 0; i <= steps; i++) {
    const q = p.iso(u0 + ((u1 - u0) * i) / steps, v);
    p.shadow(q.x, q.y + 1, r, r * 0.5, alpha);
  }
}

/** Kawaii face on a round body at (x, y); radius r is the body radius. */
function kawaiiFace(p: Pen, x: number, y: number, r: number): void {
  const ex = r * 0.38;
  const ey = y - r * 0.05;
  p.circle(x - ex, ey, Math.max(0.7, r * 0.12), '#2b1d14', null);
  p.circle(x + ex, ey, Math.max(0.7, r * 0.12), '#2b1d14', null);
  p.circle(x - ex + r * 0.04, ey - r * 0.05, r * 0.04, '#ffffff', null);
  p.circle(x + ex + r * 0.04, ey - r * 0.05, r * 0.04, '#ffffff', null);
  p.ellipse(x - r * 0.62, y + r * 0.18, r * 0.16, r * 0.1, rgba('#ff8fa3', 0.7), null);
  p.ellipse(x + r * 0.62, y + r * 0.18, r * 0.16, r * 0.1, rgba('#ff8fa3', 0.7), null);
}

/** Tiny bunting strung between two points, with triangular flags. */
function bunting(p: Pen, a: Pt, b: Pt, sag: number, colors: string[], n = 5): void {
  const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 + sag };
  p.curve(a, mid, b, '#6a4a32', 0.8);
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n;
    const q = {
      x: (1 - t) * (1 - t) * a.x + 2 * (1 - t) * t * mid.x + t * t * b.x,
      y: (1 - t) * (1 - t) * a.y + 2 * (1 - t) * t * mid.y + t * t * b.y,
    };
    p.poly([{ x: q.x - 2.4, y: q.y }, { x: q.x + 2.4, y: q.y }, { x: q.x, y: q.y + 4 }], colors[i % colors.length], shade('#4a3426', 0.2), 0.5);
  }
}

// ---------------------------------------------------------------------------
// Fallback: a cute cube with a flower, for any id without a painter.

function fallback(p: Pen): void {
  const c = p.center;
  p.shadow(c.x, c.y, 14);
  p.box(p.fw / 2 - 0.3, p.fh / 2 - 0.3, 0.6, 0.6, 18, WOOD);
  p.flower(c.x, c.y - 24, 4, PINK);
}

// ---------------------------------------------------------------------------
// Painters (filled in by section)

// RED_BARN_PAINTER
// GRAIN_SILO_PAINTER
// VEHICLE_PAINTERS
// COOP_PAINTER
// WATER_PAINTERS
// PLAY_PAINTERS
// TREE_PAINTERS
// CAMP_PAINTERS

// ---------------------------------------------------------------------------
// Table: id -> headroom + painter

const TABLE: Record<string, [number, Painter]> = {};

export const sprites: SpriteSpec[] = COUNTRY_DECORATIONS.slice(0, 18).map((d) => {
  const entry = TABLE[d.id];
  const height = entry ? entry[0] : 40;
  const paint = entry ? entry[1] : fallback;
  return { key: `deco:${d.id}`, fw: d.w, fh: d.h, height, paint };
});

export const icons: IconSpec[] = [];
