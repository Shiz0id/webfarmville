// Country decorations, first batch: the red barn, silo, vehicles, coop, play
// equipment, treehouse, carousel, pond and camping bits.
//
// Every entry of COUNTRY_DECORATIONS.slice(0, 18) gets a `deco:<id>` sprite.
// Footprint comes from the def; the table below maps each id to its headroom
// and painter. Unknown ids fall back to a little cube with a flower on top.
import { type IconSpec, type SpriteSpec, type Pen, shade, rng, rgba, boxColors } from './kit';
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
const CHERRY = '#d8323a';
const MINT = '#9fe0c4';
const LILAC = '#c9a8e8';
const SUN = '#ffd84a';
const SANDY = '#f0d9a0';
const ORANGE = '#f09a48';
const CAT_STRIPE = '#c86f2c';
const TILE = '#b8583d';
const SILO = '#d3dde2';
const DOME = '#7f95a6';
const HUB = '#d9a43f';
const BARK = '#7a5236';

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

function stem(p: Pen, x0: number, y0: number, x1: number, y1: number, color = STEM, w = 1.3): void {
  p.curve({ x: x0, y: y0 }, { x: x0 + (x1 - x0) * 0.2, y: (y0 + y1) / 2 }, { x: x1, y: y1 }, color, w);
}

function leafAt(p: Pen, x: number, y: number, len: number, ang: number, color: string, w = 0.22): void {
  const cx = x + (Math.cos(ang) * len) / 2;
  const cy = y + (Math.sin(ang) * len) / 2;
  p.ellipse(cx, cy, len / 2, Math.max(0.8, len * w), color, shade(color, -0.42), ang);
}

/** Soft shadow running along the u axis. */

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
// Classic red barn: gambrel roof, X-trim doors, a hay loft with hay poking out,
// weathervane on the ridge and a cat sitting on the eave.
function redBarn(p: Pen): void {
  const ua = 0.2;
  const ub = 2.8;
  const v0 = 0.7;
  const v1 = 2.3;
  const ea = ua - 0.12;
  const eb = ub + 0.12;
  const ZE = 52; // eave height
  const ZW = 54; // wall top
  const ZB = 72; // gambrel break
  const ZR = 92; // ridge
  const RS = shade(BARN, -0.22);
  const P = (u: number, v: number, z: number) => p.iso(u, v, z);

  const c = p.center;
  p.shadow(c.x, c.y + 2, 84, 38, 0.26);
  p.box(ua, v0, ub - ua, v1 - v0, ZW, { top: shade(BARN, 0.1), left: BARN, right: RS });

  // back roof slopes (behind the ridge, visible above it)
  p.poly([P(ea, 0.58, ZE), P(eb, 0.58, ZE), P(eb, 1.0, ZB), P(ea, 1.0, ZB)], shade(ROOF, 0.1));
  p.poly([P(ea, 1.0, ZB), P(eb, 1.0, ZB), P(eb, 1.5, ZR), P(ea, 1.5, ZR)], shade(ROOF, 0.26));
  // front roof slopes
  p.poly([P(ea, 1.5, ZR), P(eb, 1.5, ZR), P(eb, 2.0, ZB), P(ea, 2.0, ZB)], shade(ROOF, 0.04));
  p.poly([P(ea, 2.0, ZB), P(eb, 2.0, ZB), P(eb, 2.42, ZE), P(ea, 2.42, ZE)], ROOF);
  p.line([P(ea, 1.5, ZR), P(eb, 1.5, ZR)], shade(ROOF, -0.35), 1.4);
  // trim along the eaves
  p.line([P(ea, 2.42, ZE), P(eb, 2.42, ZE)], TRIM, 1.4);
  p.line([P(eb, 0.58, ZE), P(eb, 2.42, ZE)], TRIM, 1.4);

  // gable end (faces bottom-right)
  p.poly([P(ub, v0, ZW), P(ub, 1.0, ZB), P(ub, 1.5, ZR), P(ub, 2.0, ZB), P(ub, v1, ZW)], RS);
  p.line([P(ub, v0, ZW), P(ub, 1.0, ZB), P(ub, 1.5, ZR), P(ub, 2.0, ZB), P(ub, v1, ZW)], TRIM, 1.6);
  p.line([P(ub, v0, ZW), P(ub, v1, ZW)], TRIM, 1.4);

  // big double doors with white X trim
  const door = [P(ub, 0.95, 36), P(ub, 2.05, 36), P(ub, 2.05, 0), P(ub, 0.95, 0)];
  p.poly(door, RS, TRIM, 1.4);
  p.line([P(ub, 1.5, 0), P(ub, 1.5, 36)], shade(BARN, -0.5), 0.6);
  p.line([P(ub, 0.95, 0), P(ub, 2.05, 36)], TRIM, 1.2);
  p.line([P(ub, 0.95, 36), P(ub, 2.05, 0)], TRIM, 1.2);

  // hay loft door, with hay poking out
  p.poly([P(ub, 1.32, 76), P(ub, 1.68, 76), P(ub, 1.68, 60), P(ub, 1.32, 60)], '#5b2a22', TRIM, 1.2);
  for (let i = 0; i < 5; i++) {
    const v = 1.34 + i * 0.08;
    const a = P(ub + 0.02, v, 61);
    const b = P(ub + 0.32, v + 0.04, 52 + (i % 2) * 3);
    p.line([a, b], shade(HAY, -0.4), 2.1);
    p.line([a, b], HAY, 1.2);
  }

  // front-left wall windows
  const fv = (u: number, z: number) => P(u, v1, z);
  for (const u of [0.9, 2.1]) {
    p.poly([fv(u - 0.24, 20), fv(u + 0.24, 20), fv(u + 0.24, 36), fv(u - 0.24, 36)], '#ffe7a8', TRIM, 1.3);
    p.line([fv(u, 20), fv(u, 36)], TRIM, 0.9);
    p.line([fv(u - 0.24, 28), fv(u + 0.24, 28)], TRIM, 0.9);
    p.line([fv(u - 0.3, 19), fv(u + 0.3, 19)], TRIM, 1.6);
  }

  // weathervane: a little gold rooster on a rod
  const wv = P(1.5, 1.5, ZR);
  p.line([wv, { x: wv.x, y: wv.y - 14 }], IRON, 1.2);
  p.circle(wv.x, wv.y - 15, 1.6, SUN, IRON);
  const ty = wv.y - 17;
  p.poly([{ x: wv.x - 1.5, y: ty }, { x: wv.x - 7, y: ty - 3 }, { x: wv.x - 6, y: ty + 1.5 }], SUN, IRON, 0.7);
  p.circle(wv.x + 1, ty, 2.6, SUN, IRON);
  p.poly([{ x: wv.x + 3.2, y: ty - 1 }, { x: wv.x + 6, y: ty }, { x: wv.x + 3.2, y: ty + 0.8 }], '#ff9a3c', IRON, 0.6);
  p.circle(wv.x + 1.6, ty - 0.8, 0.5, IRON, null);

  // a cat sitting on the front eave
  const k = P(0.62, 2.2, 46);
  p.curve({ x: k.x + 3, y: k.y - 1.5 }, { x: k.x + 9, y: k.y - 1 }, { x: k.x + 7.5, y: k.y - 9 }, p.outline, 3.4);
  p.curve({ x: k.x + 3, y: k.y - 1.5 }, { x: k.x + 9, y: k.y - 1 }, { x: k.x + 7.5, y: k.y - 9 }, ORANGE, 2);
  p.ellipse(k.x, k.y - 5, 4.2, 5, ORANGE);
  p.line([{ x: k.x - 2.2, y: k.y - 8.6 }, { x: k.x - 1.6, y: k.y - 7.2 }], CAT_STRIPE, 0.9);
  p.line([{ x: k.x + 2, y: k.y - 8.2 }, { x: k.x + 1.5, y: k.y - 6.8 }], CAT_STRIPE, 0.9);
  p.poly([{ x: k.x - 3.2, y: k.y - 14.2 }, { x: k.x - 3.6, y: k.y - 18.6 }, { x: k.x - 0.4, y: k.y - 16.2 }], ORANGE, p.outline, 0.8);
  p.poly([{ x: k.x + 3.2, y: k.y - 14.2 }, { x: k.x + 3.6, y: k.y - 18.6 }, { x: k.x + 0.4, y: k.y - 16.2 }], ORANGE, p.outline, 0.8);
  p.circle(k.x, k.y - 12.6, 3.6, ORANGE);
  kawaiiFace(p, k.x, k.y - 12.6, 3.6);
  p.ellipse(k.x - 1.6, k.y - 0.8, 1.6, 1, CREAM, p.outline);
  p.ellipse(k.x + 1.6, k.y - 0.8, 1.6, 1, CREAM, p.outline);
}

// Tall galvanised grain silo with a dome cap and ladder, beside a small feed shed.
function grainSilo(p: Pen): void {
  // feed shed, tucked behind the silo
  p.box(0.02, 0.04, 0.36, 0.38, 24, boxColors(WOOD));
  p.gableRoof(0.02, 0.04, 0.36, 0.38, 24, 15, TILE, WOOD, 0.06);
  const dv = (v0: number, v1: number, z0: number, z1: number) =>
    p.poly([p.iso(0.38, v0, z0), p.iso(0.38, v1, z0), p.iso(0.38, v1, z1), p.iso(0.38, v0, z1)], shade(WOOD_D, -0.1), TRIM, 1);
  dv(0.14, 0.28, 0, 15);
  p.line([p.iso(0.38, 0.21, 0), p.iso(0.38, 0.21, 15)], TRIM, 0.8);

  // silo
  const SH = 74;
  const s = p.iso(0.78, 0.5);
  const top = s.y - SH;
  p.shadow(s.x, s.y + 1, 14, 6.5, 0.25);
  p.cylinder(s.x, s.y, 10, SH, SILO);
  // dome cap
  shape(
    p,
    (c) => {
      c.moveTo(s.x - 10, top);
      c.bezierCurveTo(s.x - 10, top - 13, s.x + 10, top - 13, s.x + 10, top);
      c.ellipse(s.x, top, 10, 5, 0, 0, Math.PI);
      c.closePath();
    },
    radial(p, s.x, top - 4, 10, DOME),
  );
  p.circle(s.x, top - 9.5, 2, shade(DOME, 0.2), p.outline);
  // hoop bands
  for (const yb of [14, 34, 52]) {
    p.curve({ x: s.x - 10, y: s.y - yb }, { x: s.x, y: s.y - yb + 5 }, { x: s.x + 10, y: s.y - yb }, shade(SILO, -0.35), 1.2);
  }
  // glint
  p.line([{ x: s.x - 6, y: top + 12 }, { x: s.x - 6, y: s.y - 14 }], 'rgba(255,255,255,0.75)', 1.6);
  // ladder up the front
  const xl = s.x + 5;
  thick(p, [{ x: xl - 1.6, y: s.y - 1 }, { x: xl - 1.6, y: top + 6 }], IRON, 1.1);
  thick(p, [{ x: xl + 1.6, y: s.y - 1 }, { x: xl + 1.6, y: top + 6 }], IRON, 1.1);
  for (let y = s.y - 5; y > top + 8; y -= 5) p.line([{ x: xl - 1.6, y }, { x: xl + 1.6, y }], IRON, 0.8);
}

// Little A-frame chicken coop with a plank ramp, a nesting window and a hen peeking out.
function chickenCoop(p: Pen): void {
  const u0 = 0.12;
  const u1 = 0.88;
  const v0 = 0.12;
  const v1 = 0.88;
  const P = (u: number, v: number, z: number) => p.iso(u, v, z);
  const c = p.center;
  p.shadow(c.x, c.y + 1, 26, 11, 0.24);

  p.box(u0, v0, u1 - u0, v1 - v0, 24, boxColors(WOOD_L));
  p.gableRoof(u0, v0, u1 - u0, v1 - v0, 24, 20, TILE, WOOD_L, 0.1);
  // plank seams
  for (const a of [0.36, 0.62]) p.line([P(a, v1, 0), P(a, v1, 24)], shade(WOOD_L, -0.3), 0.6);
  for (const b of [0.36, 0.62]) p.line([P(u1, b, 0), P(u1, b, 24)], shade(WOOD_L, -0.3), 0.6);

  // nesting window on the front-left wall
  p.poly([P(0.28, v1, 11), P(0.5, v1, 11), P(0.5, v1, 19), P(0.28, v1, 19)], '#fff3c4', TRIM, 1.2);
  p.line([P(0.39, v1, 11), P(0.39, v1, 19)], TRIM, 0.8);
  p.line([P(0.28, v1, 15), P(0.5, v1, 15)], TRIM, 0.8);

  // hen-house door on the right face, with a hen peeking out
  p.poly([P(u1, 0.38, 2), P(u1, 0.62, 2), P(u1, 0.62, 17), P(u1, 0.38, 17)], '#4a2f1e', WOOD_D, 1);
  const hb = P(u1, 0.5, 7);
  const hh = P(u1, 0.5, 13);
  p.ellipse(hb.x - 0.5, hb.y, 4, 3.2, WHITE);
  p.circle(hh.x, hh.y, 2.9, WHITE);
  p.circle(hh.x - 1, hh.y - 3.2, 1, CHERRY, null);
  p.circle(hh.x + 0.5, hh.y - 3.6, 1, CHERRY, null);
  kawaiiFace(p, hh.x, hh.y, 2.9);
  p.poly([{ x: hh.x + 2.6, y: hh.y + 0.2 }, { x: hh.x + 5, y: hh.y + 1.2 }, { x: hh.x + 2.6, y: hh.y + 1.8 }], '#ffb347', p.outline, 0.6);
  p.circle(hh.x + 1.2, hh.y + 2.6, 0.9, CHERRY, null);
  // door frame lip over the hen's bottom
  p.line([P(u1, 0.38, 2), P(u1, 0.62, 2)], WOOD_D, 2);

  // plank ramp from the door down to the ground
  const rz = (uu: number) => 2 * (1 - (uu - u1) / 0.3);
  p.poly([P(u1, 0.38, 2), P(u1, 0.62, 2), P(u1 + 0.3, 0.62, 0), P(u1 + 0.3, 0.38, 0)], WOOD_L, p.outline);
  for (const uu of [u1 + 0.1, u1 + 0.2]) p.line([P(uu, 0.38, rz(uu)), P(uu, 0.62, rz(uu))], shade(WOOD_L, -0.3), 0.7);

  // a little flower by the ramp
  const f = P(0.5, 1.0, 0);
  stem(p, f.x, f.y, f.x + 0.5, f.y - 4, STEM, 1);
  p.flower(f.x + 0.5, f.y - 5, 2.2, PINK);
}

// Spoked wheel drawn on screen at (x, y).
function wheel(p: Pen, x: number, y: number, r: number): void {
  p.circle(x, y, r, '#3a3a3e', p.outline);
  for (const a of [0, Math.PI / 3, (2 * Math.PI) / 3]) {
    const dx = Math.cos(a) * r * 0.78;
    const dy = Math.sin(a) * r * 0.78;
    p.line([{ x: x - dx, y: y - dy }, { x: x + dx, y: y + dy }], HUB, 0.9);
  }
  p.circle(x, y, r * 0.3, HUB, p.outline);
  p.circle(x - r * 0.35, y - r * 0.35, r * 0.18, 'rgba(255,255,255,0.45)', null);
}

// Rounded cherry-red vintage tractor with a big back wheel, exhaust puff and a sunflower.
function vintageTractor(p: Pen): void {
  const RED_T = CHERRY;
  const P = (u: number, v: number, z: number) => p.iso(u, v, z);
  const c = p.center;
  p.shadow(c.x, c.y + 1, 36, 15, 0.24);

  // chassis and engine
  p.box(0.22, 0.28, 1.28, 0.44, 6, IRON, 0);
  p.box(0.82, 0.3, 0.7, 0.4, 14, boxColors(RED_T), 6);
  // radiator grille on the front
  p.poly([P(1.52, 0.36, 8), P(1.52, 0.64, 8), P(1.52, 0.64, 16), P(1.52, 0.36, 16)], '#2f3538', p.outline, 0.8);
  for (let z = 10; z < 16; z += 2.5) p.line([P(1.52, 0.38, z), P(1.52, 0.62, z)], '#6b7478', 0.6);
  // rear body and seat
  p.box(0.3, 0.3, 0.52, 0.4, 10, boxColors(RED_T), 6);
  p.box(0.4, 0.4, 0.22, 0.22, 4, '#4a2f1e', 16);
  p.box(0.4, 0.4, 0.06, 0.22, 10, shade(RED_T, -0.15), 20);

  // exhaust pipe with a puff of smoke
  const ex = P(1.22, 0.42, 20);
  p.cylinder(ex.x, ex.y, 2.4, 22, '#7d8489');
  p.circle(ex.x + 1, ex.y - 27, 3, 'rgba(255,255,255,0.82)', null);
  p.circle(ex.x + 4, ex.y - 33, 4, 'rgba(255,255,255,0.66)', null);
  p.circle(ex.x + 8, ex.y - 40, 5, 'rgba(255,255,255,0.45)', null);

  // a sunflower tucked into the grille
  const sf = P(1.5, 0.5, 18);
  const sfTop = { x: sf.x, y: sf.y - 17 };
  stem(p, sf.x, sf.y, sfTop.x, sfTop.y, STEM, 1.3);
  leafAt(p, sf.x, sf.y - 6, 6, -Math.PI + 0.5, LEAF, 0.22);
  leafAt(p, sf.x, sf.y - 9, 6, -0.5, LEAF_D, 0.22);
  p.flower(sfTop.x, sfTop.y, 4.6, SUN, '#6b4a2f');

  // fenders and wheels on the near side
  const bw = P(0.56, 0.76, 13);
  const fw = P(1.46, 0.76, 8);
  p.ellipse(bw.x, bw.y - 1, 15, 12, RED_T);
  p.ellipse(fw.x, fw.y - 1, 10, 8, RED_T);
  wheel(p, bw.x, bw.y, 12);
  wheel(p, fw.x, fw.y, 7.5);

  // headlamp
  const hl = P(1.5, 0.3, 22);
  p.glow(hl.x, hl.y, 7, '#ffe39a', 0.5);
  p.circle(hl.x, hl.y, 1.7, '#fff6c8', p.outline);
}

// Old pastel-blue pickup with a bed bursting with flowers.
function flowerTruck(p: Pen): void {
  const BLUE_T = '#9fd0ee';
  const P = (u: number, v: number, z: number) => p.iso(u, v, z);
  const c = p.center;
  p.shadow(c.x, c.y + 1, 40, 16, 0.24);

  // chassis
  p.box(0.1, 0.28, 1.85, 0.44, 6, IRON, 0);
  // bed: tail wall, floor, far wall (behind the flowers)
  p.box(0.06, 0.2, 0.05, 0.6, 14, boxColors(BLUE_T), 8);
  p.box(0.1, 0.25, 1.1, 0.5, 4, boxColors(WOOD), 6);
  p.box(0.1, 0.2, 1.1, 0.05, 14, boxColors(BLUE_T), 8);

  // flowers and leaves overflowing the bed
  const r = rng('truck-bed');
  const heads: { u: number; v: number; z: number; col: string }[] = [];
  const cols = [PINK, LILAC, SUN, CREAM, '#ffb3c6', '#c8b6ff', '#ff8fa3'];
  for (let i = 0; i < 12; i++) {
    heads.push({ u: 0.22 + r() * 0.85, v: 0.3 + r() * 0.4, z: 22 + r() * 12, col: cols[i % cols.length] });
  }
  heads.sort((a, b) => a.u + a.v - (b.u + b.v));
  for (const h of heads) {
    const base = P(h.u, h.v, 10);
    const top = P(h.u, h.v, h.z);
    stem(p, base.x, base.y, top.x, top.y, STEM, 1.2);
    leafAt(p, top.x, top.y + 3, 5, -2.2, LEAF, 0.24);
    p.flower(top.x, top.y, 3.6, h.col, '#ffd84a');
  }

  // near-side wall of the bed
  p.box(0.1, 0.74, 1.1, 0.05, 14, boxColors(BLUE_T), 8);

  // cab at the front, with a windshield and side window
  p.box(1.25, 0.2, 0.7, 0.6, 22, boxColors(BLUE_T), 6);
  p.poly([P(1.95, 0.3, 16), P(1.95, 0.7, 16), P(1.95, 0.7, 26), P(1.95, 0.3, 26)], '#e9f8ff', p.outline, 1);
  p.poly([P(1.32, 0.8, 16), P(1.9, 0.8, 16), P(1.9, 0.8, 25), P(1.32, 0.8, 25)], '#e9f8ff', p.outline, 1);
  const hl = P(1.95, 0.34, 12);
  p.glow(hl.x, hl.y, 6, '#ffe39a', 0.45);
  p.circle(hl.x, hl.y, 1.6, '#fff6c8', p.outline);

  // wheels on the near side
  const rw = P(0.5, 0.8, 8);
  const fw = P(1.6, 0.8, 8);
  wheel(p, rw.x, rw.y, 8.5);
  wheel(p, fw.x, fw.y, 8.5);
}

// Wooden water tower on stilts with a heart painted on the tank and a conical roof.
function waterTower(p: Pen): void {
  const P = (u: number, v: number, z: number) => p.iso(u, v, z);
  const cu = 0.5;
  const cv = 0.5;
  const TZ = 40;
  const TT = 72;
  const RX = 14;
  const ROOFC = '#8a5a3c';
  const c = p.center;
  p.shadow(c.x, c.y + 1, 28, 12, 0.24);

  // back stilts
  for (const [u, v] of [
    [0.18, 0.5],
    [0.5, 0.18],
  ]) {
    thick(p, [P(u, v, 0), P(cu + (u - cu) * 0.4, cv + (v - cv) * 0.4, TZ)], WOOD_D, 2.6);
  }
  p.line([P(0.18, 0.5, 20), P(0.5, 0.18, 20)], WOOD_D, 1);
  // tank
  const base = P(cu, cv, TZ);
  const ht = TT - TZ;
  p.cylinder(base.x, base.y, RX, ht, WOOD);
  for (const t of [-0.55, 0.05, 0.6]) {
    p.line([{ x: base.x + t * RX, y: base.y - ht + 4 }, { x: base.x + t * RX, y: base.y - 3 }], shade(WOOD, -0.35), 0.6);
  }
  for (const f of [0.25, 0.7]) {
    const y = base.y - ht * f;
    p.curve({ x: base.x - RX, y }, { x: base.x, y: y + 4 }, { x: base.x + RX, y }, IRON, 1.2);
  }
  p.heart(base.x, base.y - ht * 0.5, 4.2, PINK);
  // conical roof
  const top = base.y - ht;
  const apex = { x: base.x, y: top - 22 };
  const L = { x: base.x - RX - 1.5, y: top + 0.5 };
  const R = { x: base.x + RX + 1.5, y: top + 0.5 };
  const front = { x: base.x, y: top + RX / 2 + 1 };
  p.poly([L, apex, R, front], ROOFC);
  p.poly([apex, R, front], shade(ROOFC, -0.22));
  p.line([L, apex, R], p.outline, 1);
  // front stilts
  for (const [u, v] of [
    [0.82, 0.5],
    [0.5, 0.82],
  ]) {
    thick(p, [P(u, v, 0), P(cu + (u - cu) * 0.4, cv + (v - cv) * 0.4, TZ)], WOOD_D, 2.6);
  }
}

// Metal farm windpump: lattice tower, spinning fan wheel, tail vane and a water trough.
function windPump(p: Pen): void {
  const P = (u: number, v: number, z: number) => p.iso(u, v, z);
  const TOP = 76;
  const c = p.center;
  p.shadow(c.x, c.y + 1, 26, 11, 0.24);

  const ground = [
    [0.2, 0.2],
    [0.8, 0.2],
    [0.2, 0.8],
    [0.8, 0.8],
  ];
  const top = (g: number[]) => [0.5 + (g[0] - 0.5) * 0.25, 0.5 + (g[1] - 0.5) * 0.25];
  const at = (i: number, f: number) => {
    const g = ground[i];
    const t = top(g);
    return P(g[0] + (t[0] - g[0]) * f, g[1] + (t[1] - g[1]) * f, TOP * f);
  };
  // back legs and lattice
  for (const i of [0, 1, 2]) thick(p, [P(ground[i][0], ground[i][1], 0), at(i, 1)], IRON, 2);
  for (const f of [0.3, 0.6, 0.85]) {
    for (const [a, b] of [
      [0, 1],
      [1, 3],
      [3, 2],
      [2, 0],
    ]) {
      p.line([at(a, f), at(b, f)], IRON, 0.8);
    }
  }
  // platform
  p.box(0.38, 0.38, 0.24, 0.24, 3, WOOD_L, TOP);
  // trough (front, with water in it)
  p.box(0.2, 0.66, 0.6, 0.22, 8, { top: WATER, left: WOOD_D, right: shade(WOOD_D, -0.2) });
  // tail vane behind the wheel
  const h = P(0.5, 0.5, 88);
  p.poly(
    [
      { x: h.x + 3, y: h.y - 2 },
      { x: h.x + 24, y: h.y + 3 },
      { x: h.x + 22, y: h.y + 13 },
      { x: h.x + 3, y: h.y + 6 },
    ],
    '#c94a3a',
  );
  // fan wheel
  p.circle(h.x, h.y, 17, rgba('#ffffff', 0.18), IRON);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TAU;
    p.line([{ x: h.x, y: h.y }, { x: h.x + Math.cos(a) * 16, y: h.y + Math.sin(a) * 16 }], IRON, 1);
  }
  p.circle(h.x, h.y, 3, '#c9d4da', IRON);
  // legs of the front, then the rest of the tower
  for (const i of [3]) thick(p, [P(ground[i][0], ground[i][1], 0), at(i, 1)], IRON, 2);
  // a drip from the trough tap
  p.ellipse(P(0.5, 0.9, 6).x, P(0.5, 0.9, 6).y, 1.6, 1.1, WATER_D, null);
}

// Little covered bridge over a stream: red walls with lattice windows, an arched
// doorway and lanterns glowing under the roof.
function coveredBridge(p: Pen): void {
  const P = (u: number, v: number, z: number) => p.iso(u, v, z);
  const c = p.center;
  p.shadow(c.x, c.y + 1, 46, 18, 0.22);
  // stream under the bridge
  p.poly([P(0, 0.12, 0), P(2, 0.12, 0), P(2, 0.88, 0), P(0, 0.88, 0)], rgba(WATER, 0.7), null);
  p.line([P(0.2, 0.5, 0.5), P(1.8, 0.5, 0.5)], WATER_D, 0.8);
  // stone piers
  for (const [u, v] of [
    [0.25, 0.3],
    [1.75, 0.3],
    [0.25, 0.7],
    [1.75, 0.7],
  ]) {
    p.box(u - 0.08, v - 0.08, 0.16, 0.16, 8, { top: STONE_L, left: STONE, right: STONE_D });
  }
  // deck
  p.box(0.08, 0.22, 1.84, 0.56, 4, boxColors(WOOD_L), 8);
  // walls
  p.box(0.08, 0.22, 1.84, 0.56, 30, boxColors(BARN), 12);
  // lattice windows on the front wall
  for (const u of [0.5, 1.0, 1.5]) {
    p.poly([P(u - 0.14, 0.78, 20), P(u + 0.14, 0.78, 20), P(u + 0.14, 0.78, 34), P(u - 0.14, 0.78, 34)], '#ffe7a8', TRIM, 1);
    p.line([P(u - 0.14, 0.78, 20), P(u + 0.14, 0.78, 34)], TRIM, 0.8);
    p.line([P(u - 0.14, 0.78, 34), P(u + 0.14, 0.78, 20)], TRIM, 0.8);
  }
  // roof
  p.gableRoof(0.04, 0.18, 1.92, 0.64, 42, 14, ROOF, BARN, 0.08);
  // arched doorway at the right-hand end
  const arch: Pt[] = [];
  for (let i = 0; i <= 10; i++) {
    const t = Math.PI * (i / 10);
    arch.push(P(1.92, 0.5 + Math.cos(t) * 0.18, 20 + Math.sin(t) * 9));
  }
  arch.push(P(1.92, 0.68, 20), P(1.92, 0.32, 20));
  p.poly(arch, '#3a2a24', TRIM, 1.2);
  // lanterns in the doorway
  const lan = P(1.9, 0.5, 30);
  p.glow(lan.x, lan.y, 12, GLOW, 0.6);
  p.poly([{ x: lan.x - 2, y: lan.y - 3 }, { x: lan.x + 2, y: lan.y - 3 }, { x: lan.x + 2, y: lan.y + 2 }, { x: lan.x - 2, y: lan.y + 2 }], GLOW, IRON, 0.7);
  const lan2 = P(0.25, 0.8, 26);
  p.glow(lan2.x, lan2.y, 10, GLOW, 0.5);
  p.poly([{ x: lan2.x - 1.8, y: lan2.y - 2.6 }, { x: lan2.x + 1.8, y: lan2.y - 2.6 }, { x: lan2.x + 1.8, y: lan2.y + 1.8 }, { x: lan2.x - 1.8, y: lan2.y + 1.8 }], GLOW, IRON, 0.7);
}

// Colourful playground slide with a ladder up the back tower.
function playgroundSlide(p: Pen): void {
  const P = (u: number, v: number, z: number) => p.iso(u, v, z);
  const PLAT = '#ff8a5c';
  const c = p.center;
  p.shadow(c.x, c.y + 1, 26, 11, 0.24);
  // tower posts
  for (const [u, v] of [
    [0.12, 0.12],
    [0.46, 0.12],
    [0.12, 0.46],
    [0.46, 0.46],
  ]) {
    thick(p, [P(u, v, 0), P(u, v, 38)], '#4aa6ff', 2.2);
  }
  // platform and railings
  p.box(0.08, 0.08, 0.44, 0.44, 5, boxColors(PLAT), 38);
  for (const pts of [
    [P(0.08, 0.52, 46), P(0.52, 0.52, 46)],
    [P(0.52, 0.08, 46), P(0.52, 0.52, 46)],
  ]) {
    thick(p, pts, '#4aa6ff', 1.6);
  }
  // ladder on the front-left face
  for (const u of [0.18, 0.3]) thick(p, [P(u, 0.6, 0), P(u, 0.6, 38)], '#e0433a', 1.6);
  for (let z = 4; z < 38; z += 6) p.line([P(0.18, 0.6, z), P(0.3, 0.6, z)], '#e0433a', 1);
  // chute
  const top0 = P(0.5, 0.26, 40);
  const top1 = P(0.5, 0.42, 40);
  const end0 = P(0.98, 0.26, 0);
  const end1 = P(0.98, 0.42, 0);
  p.poly([top0, top1, end1, end0], '#ffd84a');
  p.line([top0, end0], '#e0433a', 1.6);
  p.line([top1, end1], '#e0433a', 1.6);
  p.circle(end0.x, end0.y - 1, 1.2, '#e0433a', null);
}

// Red and yellow seesaw balanced on a fulcrum.
function seesaw(p: Pen): void {
  const P = (u: number, v: number, z: number) => p.iso(u, v, z);
  const c = p.center;
  p.shadow(c.x, c.y + 1, 40, 14, 0.24);
  // fulcrum
  p.poly([P(0.92, 0.5, 0), P(1.08, 0.5, 0), P(1.0, 0.5, 18)], '#e04b3a');
  p.poly([P(0.92, 0.5, 0), P(1.0, 0.5, 0), P(1.0, 0.5, 18)], shade('#e04b3a', -0.2), null);
  // board: low end on the left, high end on the right
  const tl = P(0.2, 0.3, 11);
  const tr = P(1.8, 0.3, 37);
  const br = P(1.8, 0.7, 37);
  const bl = P(0.2, 0.7, 11);
  p.poly([bl, br, P(1.8, 0.7, 32), P(0.2, 0.7, 6)], shade('#ffd84a', -0.22));
  p.poly([tl, tr, br, bl], '#ffd84a');
  // handles and seats at each end
  p.circle(tl.x + 2, tl.y - 4, 2.2, '#e0433a', p.outline);
  p.circle(tr.x - 2, tr.y - 4, 2.2, '#e0433a', p.outline);
  p.poly([P(0.12, 0.3, 11), P(0.28, 0.3, 11), P(0.28, 0.7, 11), P(0.12, 0.7, 11)], '#e0433a', p.outline, 0.8);
  p.poly([P(1.72, 0.3, 37), P(1.88, 0.3, 37), P(1.88, 0.7, 37), P(1.72, 0.7, 37)], '#e0433a', p.outline, 0.8);
}

// Wooden sandbox with a sandcastle, a bucket and a spade stuck in the sand.
function sandbox(p: Pen): void {
  const P = (u: number, v: number, z: number) => p.iso(u, v, z);
  const CASTLE = '#f2dba4';
  const c = p.center;
  p.shadow(c.x, c.y + 1, 22, 9, 0.24);
  p.box(0.12, 0.12, 0.76, 0.76, 10, { top: WOOD_L, left: WOOD, right: shade(WOOD, -0.22) });
  p.diamond(0.2, 0.2, 0.6, 0.6, SANDY, null, 10);
  // sandcastle
  p.box(0.36, 0.36, 0.28, 0.28, 8, boxColors(CASTLE), 10);
  const t = P(0.5, 0.5, 10);
  p.cylinder(t.x, t.y, 4, 14, shade(CASTLE, -0.04));
  const flag = P(0.5, 0.5, 34);
  p.line([{ x: flag.x, y: flag.y }, { x: flag.x, y: flag.y + 12 }], IRON, 0.8);
  p.poly([{ x: flag.x, y: flag.y }, { x: flag.x + 7, y: flag.y + 2.5 }, { x: flag.x, y: flag.y + 5 }], PINK, p.outline, 0.6);
  // bucket on the sand
  const bk = P(0.24, 0.74, 10);
  p.cylinder(bk.x, bk.y, 4.2, 7, '#ff7a8a');
  p.line([{ x: bk.x - 4, y: bk.y - 6 }, { x: bk.x + 4, y: bk.y - 6 }], '#7a3a44', 0.6);
  // spade stuck upright
  const sp = P(0.74, 0.26, 10);
  thick(p, [{ x: sp.x, y: sp.y }, { x: sp.x, y: sp.y - 16 }], BARK, 1.4);
  p.ellipse(sp.x, sp.y - 1, 2.6, 3.4, '#b9c4cc');
  p.circle(sp.x, sp.y - 17, 2, '#e0433a', p.outline);
}

// Tiny merry-go-round with a striped canopy and pastel ponies.
function littleCarousel(p: Pen): void {
  const c = p.center;
  p.shadow(c.x, c.y + 2, 46, 22, 0.22);
  const base = p.iso(1, 1, 6);
  const POLE_TOP = 84;
  const rimY = p.iso(1, 1, POLE_TOP).y;
  const rx = 46;
  const ry = 23;
  const cx = base.x;

  p.cylinder(base.x, base.y, 44, 6, '#f7c6d9');
  p.ellipse(base.x, base.y - 6, 44, 22, shade('#f7c6d9', 0.25), null);

  const ponies = [
    { a: 0.5, col: '#c9b6ff' },
    { a: 2.6, col: '#ffc9de' },
    { a: 4.6, col: '#b8f0d9' },
  ];
  const ponyAt = (a: number) => ({ x: base.x + Math.cos(a) * 24, y: base.y - 2 + Math.sin(a) * 12 });
  // back ponies first (sin < 0 means higher on screen = further back)
  for (const pony of ponies) if (Math.sin(pony.a) < 0) drawPonyScaled(p, ponyAt(pony.a), pony.col);
  p.cylinder(base.x, base.y, 2.6, POLE_TOP - 6, HUB);
  for (const pony of ponies) if (Math.sin(pony.a) >= 0) drawPonyScaled(p, ponyAt(pony.a), pony.col);

  // striped canopy: eight segments, back ones first
  const apex = { x: cx, y: rimY - 22 };
  const rimPt = (a: number) => ({ x: cx + Math.cos(a) * rx, y: rimY + Math.sin(a) * ry });
  const segs: number[] = [];
  for (let i = 0; i < 8; i++) segs.push(i);
  segs.sort((i, j) => Math.sin(((i + 0.5) / 8) * TAU) - Math.sin(((j + 0.5) / 8) * TAU));
  for (const i of segs) {
    const a0 = (i / 8) * TAU;
    const a1 = ((i + 1) / 8) * TAU;
    const col = i % 2 ? CREAM : PINK;
    p.poly([apex, rimPt(a0), rimPt(a1)], col, p.outline, 0.8);
    const edge = rimPt(a0);
    p.circle(edge.x, edge.y + 2, 3.2, col, p.outline);
  }
  p.circle(apex.x, apex.y - 2, 3, HUB, p.outline);
}

// A little pastel pony with a mane, tail and kawaii face, standing at its base point.
function drawPony(p: Pen, at: Pt, col: string): void {
  const { x, y } = at;
  const mane = shade(col, -0.3);
  p.curve({ x: x - 6, y: y - 11 }, { x: x - 11, y: y - 10 }, { x: x - 9, y: y - 5 }, p.outline, 2.4);
  p.curve({ x: x - 6, y: y - 11 }, { x: x - 11, y: y - 10 }, { x: x - 9, y: y - 5 }, mane, 1.4);
  p.line([{ x: x - 4, y: y - 7 }, { x: x - 4, y: y }], p.outline, 2.2);
  p.line([{ x: x + 3, y: y - 7 }, { x: x + 3, y: y }], p.outline, 2.2);
  p.line([{ x: x - 4, y: y - 7 }, { x: x - 4, y: y - 0.5 }], col, 1);
  p.line([{ x: x + 3, y: y - 7 }, { x: x + 3, y: y - 0.5 }], col, 1);
  p.ellipse(x, y - 11, 6, 4, col);
  p.line([{ x: x + 3, y: y - 13 }, { x: x + 5, y: y - 19 }], p.outline, 2.4);
  p.line([{ x: x + 3, y: y - 13 }, { x: x + 5, y: y - 19 }], col, 1.2);
  p.circle(x + 5, y - 20, 3.2, col);
  p.poly([{ x: x + 3, y: y - 22.5 }, { x: x + 3.4, y: y - 25 }, { x: x + 5.6, y: y - 23 }], col, p.outline, 0.6);
  p.line([{ x: x + 3, y: y - 19 }, { x: x + 1.5, y: y - 21 }], mane, 1.6);
  p.circle(x + 5.8, y - 20.4, 0.7, '#2b1d14', null);
  p.circle(x + 6.2, y - 20.9, 0.3, '#ffffff', null);
  p.ellipse(x + 7, y - 18.6, 0.8, 0.6, rgba('#ff8fa3', 0.8), null);
}

/** A pony drawn 35% larger at its base point. */
function drawPonyScaled(p: Pen, at: Pt, col: string): void {
  p.save();
  p.ctx.translate(at.x, at.y);
  p.ctx.scale(1.35, 1.35);
  drawPony(p, { x: 0, y: 0 }, col);
  p.restore();
}

// Laundry line: a sagging rope between two posts, hung with colourful clothes and a quilt.
function laundryLine(p: Pen): void {
  const P = (u: number, v: number, z: number) => p.iso(u, v, z);
  const c = p.center;
  p.shadow(c.x, c.y + 1, 40, 14, 0.2);
  const A = P(0.12, 0.5, 42);
  const C = P(1, 0.5, 22);
  const B = P(1.88, 0.5, 42);
  for (const u of [0.12, 1.88]) {
    thick(p, [P(u, 0.5, 0), P(u, 0.5, 44)], WOOD_D, 2.6);
    p.circle(P(u, 0.5, 44).x, P(u, 0.5, 44).y, 1.6, WOOD_L, p.outline);
  }
  p.curve(A, C, B, '#8a6a4a', 1);
  const qb = (t: number): Pt => ({
    x: (1 - t) * (1 - t) * A.x + 2 * (1 - t) * t * C.x + t * t * B.x,
    y: (1 - t) * (1 - t) * A.y + 2 * (1 - t) * t * C.y + t * t * B.y,
  });
  const shirt = (q: Pt, col: string) => {
    const w = 8;
    const h = 11;
    p.poly([{ x: q.x - w / 2, y: q.y }, { x: q.x + w / 2, y: q.y }, { x: q.x + w / 2, y: q.y + h - 3 }, { x: q.x, y: q.y + h }, { x: q.x - w / 2, y: q.y + h - 3 }], col, p.outline, 0.7);
    p.circle(q.x, q.y + 0.5, 1, '#c9a24a', null);
  };
  const pants = (q: Pt, col: string) => {
    p.poly(
      [
        { x: q.x - 4, y: q.y },
        { x: q.x + 4, y: q.y },
        { x: q.x + 3.5, y: q.y + 12 },
        { x: q.x + 0.8, y: q.y + 12 },
        { x: q.x, y: q.y + 6 },
        { x: q.x - 0.8, y: q.y + 12 },
        { x: q.x - 3.5, y: q.y + 12 },
      ],
      col,
      p.outline,
      0.7,
    );
    p.circle(q.x, q.y + 0.5, 1, '#c9a24a', null);
  };
  const socks = (q: Pt, col: string) => {
    for (const dx of [-2.5, 2.5]) {
      p.poly([{ x: q.x + dx - 1.6, y: q.y }, { x: q.x + dx + 1.6, y: q.y }, { x: q.x + dx + 1.6, y: q.y + 7 }, { x: q.x + dx - 1.6, y: q.y + 7 }], col, p.outline, 0.6);
    }
  };
  const quilt = (q: Pt) => {
    const w = 18;
    const h = 14;
    p.rect(q.x - w / 2, q.y, w, h, PINK, p.outline);
    p.rect(q.x - w / 2 + 1, q.y + 1, 7, 6, SUN, null);
    p.rect(q.x + 1, q.y + 1, 7, 6, MINT, null);
    p.rect(q.x - w / 2 + 1, q.y + 7, 7, 6, LILAC, null);
    p.rect(q.x + 1, q.y + 7, 7, 6, CREAM, null);
  };
  shirt(qb(0.16), PINK);
  pants(qb(0.3), BLUE);
  quilt(qb(0.46));
  socks(qb(0.64), CREAM);
  shirt(qb(0.8), SUN);
  shirt(qb(0.91), MINT);
}

// Big tree with a tire swing on a rope.
function tireSwing(p: Pen): void {
  const P = (u: number, v: number, z: number) => p.iso(u, v, z);
  const c = p.center;
  p.shadow(c.x, c.y + 1, 22, 9, 0.24);
  const base = P(0.5, 0.5, 0);
  p.cylinder(base.x, base.y, 4.5, 46, BARK);
  p.foliage(base.x, base.y - 62, 21, LEAF, 'tyre', 7);
  // branch to the side, and the rope
  const bx = base.x + 12;
  const by = base.y - 44;
  thick(p, [{ x: base.x, y: base.y - 40 }, { x: bx, y: by }], BARK, 2.4);
  const tx = bx;
  const ty = base.y - 22;
  p.line([{ x: bx, y: by }, { x: tx - 6, y: ty - 8 }], '#8a6a4a', 0.8);
  p.line([{ x: bx, y: by }, { x: tx + 6, y: ty - 8 }], '#8a6a4a', 0.8);
  // tire, with the hole cut out so the grass shows through
  p.circle(tx, ty, 8.5, '#2e2e33', p.outline);
  const ctx = p.ctx;
  ctx.save();
  ctx.globalCompositeOperation = 'destination-out';
  ctx.beginPath();
  ctx.arc(tx, ty, 4.5, 0, TAU);
  ctx.fill();
  ctx.restore();
  p.circle(tx, ty, 4.5, null, IRON);
  p.circle(tx - 4, ty - 5, 1.2, 'rgba(255,255,255,0.35)', null);
}

// Cosy wooden treehouse up in a big tree: ladder, bunting and a lit window.
function treehouse(p: Pen): void {
  const P = (u: number, v: number, z: number) => p.iso(u, v, z);
  const c = p.center;
  p.shadow(c.x, c.y + 2, 50, 22, 0.24);
  const base = P(0.3, 0.3, 0);
  // canopy behind the house
  const cc = P(0.3, 0.3, 104);
  p.foliage(cc.x, cc.y, 34, LEAF, 'treehouse', 9);
  // trunk
  p.cylinder(base.x, base.y, 7, 52, BARK);
  // platform
  p.box(0.3, 0.3, 1.4, 1.4, 5, boxColors(WOOD_L), 46);
  // house
  p.box(0.55, 0.55, 0.9, 0.9, 34, boxColors(WOOD), 51);
  roofAt(p, 0.55, 0.55, 1.45, 1.45, 85, 26, TILE, shade(WOOD, -0.2));
  // lit window on the left wall, door on the right
  const fv = (u: number, z: number) => P(u, 1.45, z);
  p.glow(fv(0.82, 70).x, fv(0.82, 70).y, 16, GLOW, 0.5);
  p.poly([fv(0.7, 62), fv(0.95, 62), fv(0.95, 76), fv(0.7, 76)], '#ffe7a8', TRIM, 1.1);
  p.line([fv(0.825, 62), fv(0.825, 76)], TRIM, 0.8);
  p.line([fv(0.7, 69), fv(0.95, 69)], TRIM, 0.8);
  const rf = (v: number, z: number) => P(1.45, v, z);
  p.poly([rf(0.92, 51), rf(1.08, 51), rf(1.08, 70), rf(0.92, 70)], shade(WOOD_D, -0.05), TRIM, 1);
  p.glow(rf(1.0, 60).x, rf(1.0, 60).y, 10, GLOW, 0.4);
  // ladder down the front-right
  const lu = 1.72;
  thick(p, [P(lu, 0.9, 0), P(lu, 0.9, 46)], WOOD_D, 1.8);
  thick(p, [P(lu, 1.1, 0), P(lu, 1.1, 46)], WOOD_D, 1.8);
  for (let z = 6; z < 46; z += 7) p.line([P(lu, 0.9, z), P(lu, 1.1, z)], WOOD_L, 1.2);
  // railing and bunting along the front edges
  p.line([P(0.3, 1.7, 53), P(1.7, 1.7, 53)], WOOD_D, 1.6);
  p.line([P(1.7, 0.3, 53), P(1.7, 1.7, 53)], WOOD_D, 1.6);
  bunting(p, P(0.3, 1.7, 53), P(1.7, 1.7, 53), 5, [PINK, SUN, MINT, LILAC]);
  bunting(p, P(1.7, 0.3, 53), P(1.7, 1.7, 53), 5, [SUN, PINK, LILAC, MINT]);
}

// Gabled roof sitting at height z over a rectangle (ridge along u).
function roofAt(p: Pen, u0: number, v0: number, u1: number, v1: number, z: number, ht: number, color: string, gable: string): void {
  const P = (u: number, v: number, zz: number) => p.iso(u, v, zz);
  const m = (v0 + v1) / 2;
  const o = 0.08;
  const a = u0 - o;
  const b = u1 + o;
  p.poly([P(a, v0 - o, z), P(b, v0 - o, z), P(b, m, z + ht), P(a, m, z + ht)], shade(color, 0.12));
  p.poly([P(u1, v0, z), P(u1, v1, z), P(u1, m, z + ht)], gable);
  p.poly([P(a, m, z + ht), P(b, m, z + ht), P(b, v1 + o, z), P(a, v1 + o, z)], color);
  p.line([P(a, m, z + ht), P(b, m, z + ht)], shade(color, -0.3), 1.2);
}

/** Organic pond outline in flat space (centred in a 64x64 footprint). */
function pondPts(rad: number, seed: string): Pt[] {
  const r = rng(seed);
  const pts: Pt[] = [];
  const n = 14;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU;
    const k = rad * (0.94 + r() * 0.1);
    pts.push({ x: 32 + Math.cos(a) * k, y: 32 + Math.sin(a) * k });
  }
  return pts;
}

/** A little duck standing on the water at base; s scales it, body is its colour. */
function duck(p: Pen, base: Pt, s: number, body: string): void {
  p.ellipse(base.x, base.y, 9 * s, 4.5 * s, rgba('#ffffff', 0.35), null);
  p.ellipse(base.x, base.y - 4 * s, 6 * s, 3.6 * s, body);
  p.poly(
    [
      { x: base.x - 5.5 * s, y: base.y - 5 * s },
      { x: base.x - 8.5 * s, y: base.y - 7.5 * s },
      { x: base.x - 6 * s, y: base.y - 2.8 * s },
    ],
    body,
    p.outline,
    0.7,
  );
  p.line([{ x: base.x - 2 * s, y: base.y - 6 * s }, { x: base.x + 2 * s, y: base.y - 4 * s }], shade(body, -0.28), 0.7);
  const hx = base.x + 3.6 * s;
  const hy = base.y - 9.5 * s;
  p.circle(hx, hy, 3.4 * s, body);
  p.poly(
    [
      { x: hx + 2.8 * s, y: hy + 0.4 * s },
      { x: hx + 6 * s, y: hy + 1.5 * s },
      { x: hx + 2.8 * s, y: hy + 2.2 * s },
    ],
    '#ff9a3c',
    p.outline,
    0.6,
  );
  kawaiiFace(p, hx, hy, 3.4 * s);
}

// Duck pond (flat): a bank of grass around water, lily pads, cattails, a mama duck and three ducklings.
function duckPond(p: Pen): void {
  const bank = pondPts(27, 'duckbank');
  const water = pondPts(22, 'duckwater');
  flat(p, () => {
    p.ctx.save();
    smoothPath(bank.map((q) => ({ x: q.x + 1, y: q.y + 1 })))(p.ctx);
    p.ctx.fillStyle = rgba('#2a3a1a', 0.18);
    p.ctx.fill();
    p.ctx.restore();
    shape(p, smoothPath(bank), '#8ccf6a', '#5f9a48', 1.2);
    const g = p.ctx.createRadialGradient(28, 28, 2, 32, 32, 26);
    g.addColorStop(0, '#7fd3ee');
    g.addColorStop(1, '#3f9cc8');
    shape(p, smoothPath(water), g, '#2f6f98');
    withClip(p, smoothPath(water), () => {
      for (const [cx, cy, rr] of [
        [22, 40, 4],
        [44, 22, 3],
        [46, 46, 2.5],
      ]) {
        p.circle(cx, cy, rr, null, rgba('#ffffff', 0.5));
        p.circle(cx, cy, rr + 2.5, null, rgba('#ffffff', 0.25));
      }
      for (const [x, y] of [
        [18, 22],
        [42, 42],
        [40, 16],
      ]) {
        p.ellipse(x, y, 4.2, 3.4, '#6cbf5a', '#3f7d3a');
        p.ellipse(x - 0.5, y - 0.6, 2, 1.2, '#8fd06a', null);
      }
    });
  });
  // cattails along the bank (upright, so drawn in screen space)
  for (const a of [0.5, 1.7, 3.2, 4.4, 5.5]) {
    const e = p.iso((32 + Math.cos(a) * 19) / 32, (32 + Math.sin(a) * 19) / 32);
    const top = { x: e.x, y: e.y - 16 - (a % 1) * 4 };
    p.line([e, top], '#6b8f3a', 1.1);
    p.ellipse(top.x, top.y - 2.5, 1.5, 3.2, '#8a5a3c');
  }
  // a single row across the pond: mama first, then three ducklings (u - v steps across the screen)
  const row = (d: number) => p.iso(1 + d, 1 - d);
  duck(p, row(-0.19), 1.15, '#c98a4e');
  duck(p, row(0), 0.62, '#ffe066');
  duck(p, row(0.19), 0.62, '#ffe066');
  duck(p, row(0.38), 0.62, '#ffe066');
}

// Little camping tent with a glowing lantern and a tiny campfire.
function campingTent(p: Pen): void {
  const TENT = '#f08a3c';
  const P = (u: number, v: number, z: number) => p.iso(u, v, z);
  const c = p.center;
  p.shadow(c.x, c.y + 1, 28, 11, 0.24);
  // guy ropes and pegs
  for (const [u, v] of [
    [0.12, 0.18],
    [0.88, 0.84],
  ]) {
    p.line([P(u, v, 2), P(u + (u < 0.5 ? -0.12 : 0.12), v - 0.08, 0)], '#6a4a32', 0.6);
  }
  // tent body
  p.gableRoof(0.12, 0.18, 0.76, 0.66, 0, 34, TENT, shade(TENT, -0.1), 0.04);
  p.line([P(0.12, 0.51, 34), P(0.88, 0.51, 34)], CREAM, 1);
  // door on the gable end, with a warm glow inside
  p.poly([P(0.88, 0.42, 0), P(0.88, 0.58, 0), P(0.88, 0.5, 20)], '#3a2a24', CREAM, 0.8);
  p.glow(P(0.88, 0.5, 8).x, P(0.88, 0.5, 8).y, 14, GLOW, 0.45);
  // lantern on a little post
  const lp = P(0.1, 0.95, 0);
  p.line([lp, { x: lp.x, y: lp.y - 12 }], IRON, 1);
  p.glow(lp.x, lp.y - 13, 10, GLOW, 0.6);
  p.poly([{ x: lp.x - 1.8, y: lp.y - 15 }, { x: lp.x + 1.8, y: lp.y - 15 }, { x: lp.x + 1.8, y: lp.y - 11 }, { x: lp.x - 1.8, y: lp.y - 11 }], GLOW, IRON, 0.7);
  // campfire with stones, logs and flames
  const fc = P(0.74, 0.92, 2);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * TAU;
    const sp = P(0.74 + Math.cos(a) * 0.1, 0.92 + Math.sin(a) * 0.1, 0);
    p.ellipse(sp.x, sp.y, 2.2, 1.2, STONE, STONE_D);
  }
  thick(p, [{ x: fc.x - 6, y: fc.y + 1 }, { x: fc.x + 5, y: fc.y - 1 }], WOOD_D, 2);
  thick(p, [{ x: fc.x - 5, y: fc.y - 1 }, { x: fc.x + 6, y: fc.y + 1 }], BARK, 2);
  p.glow(fc.x, fc.y - 4, 14, GLOW, 0.6);
  p.poly(
    [
      { x: fc.x - 3.5, y: fc.y - 1 },
      { x: fc.x - 1.5, y: fc.y - 8 },
      { x: fc.x, y: fc.y - 4.5 },
      { x: fc.x + 1.4, y: fc.y - 10 },
      { x: fc.x + 3.5, y: fc.y - 1 },
    ],
    '#ff9a3c',
    p.outline,
    0.6,
  );
  p.poly([{ x: fc.x - 1.6, y: fc.y - 1 }, { x: fc.x, y: fc.y - 4.5 }, { x: fc.x + 1.6, y: fc.y - 1 }], '#ffe066', null);
}

// Fishing dock (flat): raised plank dock over water, with a rod, a stool and a bucket.
function fishingDock(p: Pen): void {
  const P = (u: number, v: number, z: number) => p.iso(u, v, z);
  const c = p.center;
  const wg = p.ctx.createLinearGradient(c.x, c.y - 16, c.x, c.y + 16);
  wg.addColorStop(0, '#7fd3ee');
  wg.addColorStop(1, WATER_D);
  p.diamond(0, 0, 2, 1, wg, '#2f6f98');
  for (const [u, v] of [
    [0.3, 0.3],
    [1.4, 0.7],
    [0.9, 0.12],
  ]) {
    const q = P(u, v, 0);
    p.line([{ x: q.x - 5, y: q.y }, { x: q.x, y: q.y - 1 }, { x: q.x + 5, y: q.y }], 'rgba(255,255,255,0.7)', 0.8);
  }
  // pilings
  for (const u of [0.3, 1.7]) thick(p, [P(u, 0.92, 0), P(u, 0.92, 5)], WOOD_D, 2.4);
  // planks
  for (let v = 0.22; v < 0.9; v += 0.11) {
    p.diamond(0.15, v, 1.7, 0.1, WOOD_L, shade(WOOD, -0.35), 5);
  }
  // front edge
  p.poly([P(0.15, 0.9, 5), P(1.85, 0.9, 5), P(1.85, 0.9, 0), P(0.15, 0.9, 0)], shade(WOOD, -0.25));
  // rod in a holder, angled out over the water
  thick(p, [P(0.45, 0.32, 6), P(1.25, 0.05, 40)], '#8a5a3c', 1.4);
  const tip = P(1.25, 0.05, 40);
  const bob = P(1.36, 0.1, 1);
  p.line([tip, bob], 'rgba(60,60,60,0.55)', 0.4);
  p.ellipse(bob.x, bob.y, 3.2, 1.6, rgba('#ffffff', 0.4), null);
  p.circle(bob.x, bob.y - 2, 1.6, CHERRY, p.outline);
  // stool
  const sb = P(0.9, 0.6, 12);
  for (const dx of [-3.5, 3.5]) thick(p, [{ x: sb.x + dx, y: sb.y + 2 }, { x: sb.x + dx, y: sb.y + 10 }], WOOD_D, 1.6);
  p.cylinder(sb.x, sb.y, 5.5, 3, WOOD_L);
  // bucket of water
  const bk = P(1.6, 0.4, 5);
  p.cylinder(bk.x, bk.y, 4, 7, '#7fb9e6');
  p.ellipse(bk.x, bk.y - 7, 3.2, 1.6, WATER, IRON, 0);
}

// ---------------------------------------------------------------------------
// Table: id -> headroom + painter

const TABLE: Record<string, [number, Painter]> = {
  red_barn: [118, redBarn],
  grain_silo: [84, grainSilo],
  chicken_coop: [52, chickenCoop],
  vintage_tractor: [66, vintageTractor],
  flower_truck: [52, flowerTruck],
  water_tower: [92, waterTower],
  windpump: [100, windPump],
  covered_bridge: [62, coveredBridge],
  tire_swing: [84, tireSwing],
  treehouse: [132, treehouse],
  playground_slide: [58, playgroundSlide],
  seesaw: [56, seesaw],
  sandbox: [42, sandbox],
  little_carousel: [124, littleCarousel],
  laundry_line: [60, laundryLine],
  duck_pond: [40, duckPond],
  camping_tent: [50, campingTent],
  fishing_dock: [40, fishingDock],
};

export const sprites: SpriteSpec[] = COUNTRY_DECORATIONS.slice(0, 18).map((d) => {
  const entry = TABLE[d.id];
  const height = entry ? entry[0] : 40;
  const paint = entry ? entry[1] : fallback;
  return { key: `deco:${d.id}`, fw: d.w, fh: d.h, height, paint };
});

export const icons: IconSpec[] = [];
