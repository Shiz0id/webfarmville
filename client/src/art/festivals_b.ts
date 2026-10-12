// Festival set B: Thanksgiving (2), Winter (4) and the year-round party collection (11).
// Chunky, cheerful, kawaii: round shapes, dot-eyed faces, warm palettes, a light
// from the top-left with highlights. Footprints always come from the content
// definition, so each painter only lays out its own shapes.
import { type IconSpec, type Pen, type Pt, type SpriteSpec, OUTLINE, rgba, shade } from './kit';
import { FESTIVAL_DECORATIONS } from '@farm/shared';

const O = OUTLINE;
const TAU = Math.PI * 2;
const WOOD = '#b07a4a';
const WOOD_DK = '#7a4b2e';
const GOLD = '#f4c24a';
const DARK = '#2b1d18';

type Painter = (p: Pen) => void;

// ---------------------------------------------------------------------------
// Helpers

function radial(p: Pen, x: number, y: number, r: number, inner: string, outer: string): CanvasGradient {
  const g = p.ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r);
  g.addColorStop(0, inner);
  g.addColorStop(1, outer);
  return g;
}

function hgrad(p: Pen, x0: number, x1: number, left: string, right: string): CanvasGradient {
  const g = p.ctx.createLinearGradient(x0, 0, x1, 0);
  g.addColorStop(0, left);
  g.addColorStop(1, right);
  return g;
}

/** An outlined thick stroke (branches, ribbon tails). */
function thick(p: Pen, pts: Pt[], w: number, color: string): void {
  p.line(pts, O, w + 1.6);
  p.line(pts, color, w);
}

function withXform(p: Pen, x: number, y: number, rot: number, fn: () => void): void {
  const ctx = p.ctx;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  fn();
  ctx.restore();
}

/** Kawaii face: glossy dot eyes, a small smile and pink blush. s scales it all. */
function face(p: Pen, x: number, y: number, s = 1): void {
  for (const dx of [-1.7, 1.7]) {
    const ex = x + dx * s;
    p.ellipse(ex, y, 1.05 * s, 1.3 * s, DARK, null);
    p.circle(ex + 0.4 * s, y - 0.5 * s, 0.42 * s, '#ffffff', null);
  }
  p.curve({ x: x - 1.1 * s, y: y + 1.5 * s }, { x, y: y + 2.9 * s }, { x: x + 1.1 * s, y: y + 1.5 * s }, DARK, Math.max(0.6, 0.6 * s));
  for (const dx of [-3.4, 3.4]) p.ellipse(x + dx * s, y + 1.2 * s, 1.2 * s, 0.75 * s, rgba('#ff7a9a', 0.75), null);
}

/** A small table: four legs and a box top whose surface sits at legHt + 3. */
function table(p: Pen, u0: number, v0: number, du: number, dv: number, legHt: number, top: string): void {
  const l = 0.07;
  const i0 = 0.02;
  const legs: [number, number][] = [
    [u0 + i0, v0 + i0],
    [u0 + du - l - i0, v0 + i0],
    [u0 + i0, v0 + dv - l - i0],
    [u0 + du - l - i0, v0 + dv - l - i0],
  ];
  for (const [u, v] of legs) p.box(u, v, l, l, legHt, WOOD_DK);
  p.box(u0, v0, du, dv, 3, top, legHt);
}

/** A flat paper leaf with a midrib, base at (x, y). */
function paperLeaf(p: Pen, x: number, y: number, len: number, ang: number, color: string): void {
  withXform(p, x, y, ang, () => {
    const c = p.ctx;
    c.beginPath();
    c.moveTo(0, 0);
    c.quadraticCurveTo(len * 0.5, -len * 0.5, len, 0);
    c.quadraticCurveTo(len * 0.5, len * 0.5, 0, 0);
    c.closePath();
    c.fillStyle = color;
    c.fill();
    c.strokeStyle = O;
    c.lineWidth = 0.8;
    c.stroke();
    c.beginPath();
    c.moveTo(0.8, 0);
    c.lineTo(len * 0.8, 0);
    c.strokeStyle = rgba(O, 0.5);
    c.lineWidth = 0.5;
    c.stroke();
  });
}

// ---------------------------------------------------------------------------
// Thanksgiving

/** Small bare tree hung with paper autumn leaves and tiny hearts. */
function gratitudeTree(p: Pen): void {
  const { x, y } = p.center;
  const at = (dx: number, dy: number): Pt => ({ x: x + dx, y: y + dy });
  p.shadow(x, y + 1, 16, 6);
  p.ellipse(x, y + 0.5, 6, 2.6, '#8a5f3e', O);
  // tapered trunk with a little face
  p.poly([at(-4, 1), at(-2.2, -26), at(2.2, -26), at(4, 1)], hgrad(p, x - 4, x + 4, shade(WOOD, 0.15), shade(WOOD, -0.25)));
  face(p, x, y - 14, 0.7);
  // bare branches
  const branches: Pt[][] = [
    [at(0, -24), at(-8, -36), at(-15, -42)],
    [at(0, -24), at(9, -34), at(16, -41)],
    [at(0, -30), at(-1, -44), at(2, -52)],
    [at(-8, -36), at(-12, -48)],
    [at(9, -34), at(12, -46)],
  ];
  for (const br of branches) thick(p, br, 2.4, '#8a5f3e');
  // paper leaves hung from the twigs, back to front
  const leaves: [number, number, number, string][] = [
    [-8, -33, -2.0, '#f4c24a'],
    [-4, -40, -2.9, '#ffb13a'],
    [6, -39, -0.2, '#e8553a'],
    [11, -31, 0.4, '#ff9d2e'],
    [-15, -42, -2.6, '#e8553a'],
    [-11, -48, -2.2, '#ff9d2e'],
    [12, -46, -0.9, '#d9622b'],
    [16, -41, -0.5, '#f4c24a'],
    [2, -52, -1.6, '#c8423a'],
  ];
  leaves.sort((a, b) => a[1] - b[1]);
  leaves.forEach(([dx, dy, ang, col], i) => {
    const lx = x + dx;
    const ly = y + dy;
    paperLeaf(p, lx, ly, 8, ang, col);
    if (i % 3 === 0) {
      p.heart(lx + Math.cos(ang) * 4.5, ly + Math.sin(ang) * 4.5, 1.5, '#ff5b7f');
    }
  });
  // a few tiny hearts drifting from the tips
  p.heart(x - 19, y - 34, 1.6, '#ff5b7f');
  p.heart(x + 20, y - 28, 1.3, '#ff8fa8');
  p.heart(x + 4, y - 60, 1.3, '#e5344f');
}

/** A gold, silver or bronze rosette with its ribbon tails, centred on (x, y). */
function rosette(p: Pen, x: number, y: number, color: string, label: string): void {
  p.poly([{ x: x - 1, y }, { x: x - 2.9, y: y + 5.2 }, { x: x - 0.6, y: y + 3.8 }], shade(color, -0.15));
  p.poly([{ x: x + 1, y }, { x: x + 2.9, y: y + 5.2 }, { x: x + 0.6, y: y + 3.8 }], shade(color, -0.15));
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * TAU;
    p.circle(x + Math.cos(a) * 1.8, y + Math.sin(a) * 1.8, 1.9, radial(p, x, y, 4, shade(color, 0.35), color), O);
  }
  p.circle(x, y, 1.8, shade(color, 0.12), null);
  p.text(label, x, y + 0.2, 3.6, DARK);
}

/** A round fruit pie on a crust dish, top at (x, y - dish). */
function pie(p: Pen, x: number, y: number, r: number, filling: string, crust: string): void {
  const dish = 3.5;
  p.cylinder(x, y, r, dish, crust);
  const ty = y - dish;
  p.ellipse(x, ty, r, r / 2, radial(p, x, ty, r, shade(crust, 0.25), crust));
  p.ellipse(x, ty, r * 0.72, r * 0.36, filling, null);
  // lattice crust across the filling
  const c = p.ctx;
  c.save();
  c.beginPath();
  c.ellipse(x, ty, r * 0.72, r * 0.36, 0, 0, TAU);
  c.clip();
  for (const k of [-0.5, 0, 0.5]) {
    const cy = ty + k * r * 0.6;
    p.line([{ x: x - r, y: cy - r * 0.4 }, { x: x + r, y: cy + r * 0.4 }], rgba('#fff3d6', 0.85), 0.9);
    p.line([{ x: x - r, y: cy + r * 0.4 }, { x: x + r, y: cy - r * 0.4 }], rgba('#fff3d6', 0.85), 0.9);
  }
  c.restore();
  p.ellipse(x - r * 0.3, ty - r * 0.15, r * 0.22, r * 0.1, rgba('#ffffff', 0.6), null, -0.4);
}

/** Three pies on a table, each with a ribbon rosette for 1st, 2nd and 3rd place. */
function pieContest(p: Pen): void {
  const c = p.center;
  p.shadow(c.x, c.y + 3, 30, 12);
  const legHt = 9;
  table(p, 0.06, 0.06, 0.88, 0.88, legHt, '#f6d7a7');
  const z = legHt + 3;
  const ribbons = { gold: '#f4c24a', silver: '#c9d3dc', bronze: '#d9896a' };
  // back-to-front by depth (u + v)
  const pies = [
    { u: 0.5, v: 0.4, r: 9, filling: '#c8423a', rank: '1', ribbon: ribbons.gold },
    { u: 0.26, v: 0.66, r: 7.5, filling: '#e8a33a', rank: '2', ribbon: ribbons.silver },
    { u: 0.74, v: 0.66, r: 7.5, filling: '#5a4fa8', rank: '3', ribbon: ribbons.bronze },
  ].sort((a, b) => a.u + a.v - (b.u + b.v));
  for (const pi of pies) {
    const b = p.iso(pi.u, pi.v, z);
    pie(p, b.x, b.y, pi.r, pi.filling, '#e0a45a');
    const rim = b.y - 3.5 + pi.r * 0.5 + 1.5;
    rosette(p, b.x, rim, pi.ribbon, pi.rank);
  }
  const sp = p.iso(0.5, 0.2, z);
  p.poly(
    [
      { x: sp.x, y: sp.y - 22 },
      { x: sp.x + 1, y: sp.y - 20 },
      { x: sp.x + 3, y: sp.y - 19.5 },
      { x: sp.x + 1.4, y: sp.y - 18 },
      { x: sp.x + 1.8, y: sp.y - 16 },
      { x: sp.x, y: sp.y - 17.2 },
      { x: sp.x - 1.8, y: sp.y - 16 },
      { x: sp.x - 1.4, y: sp.y - 18 },
      { x: sp.x - 3, y: sp.y - 19.5 },
      { x: sp.x - 1, y: sp.y - 20 },
    ],
    GOLD,
    O,
    0.6,
  );
}

// @@PAINTERS@@
