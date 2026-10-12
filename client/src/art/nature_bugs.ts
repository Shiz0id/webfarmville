// Nature bugs: the critters of the Nature Journal. Every BUG_LIST species gets an
// `icon:<id>` (a 40px three-quarter portrait with a tiny kawaii face), plus the
// journal, bug net and fishing rod icons. Every NATURE_DECORATIONS keepsake gets
// a `deco:<id>` isometric sprite.
//
// Same language as crops.ts and horticulture.ts: chunky shapes, the warm brown
// OUTLINE, soft radial shading with a glossy streak, and rich pastel colour.
import { type IconSpec, type SpriteSpec, type Pen, type Pt, OUTLINE, shade } from './kit';
import { BUG_LIST, NATURE_DECORATIONS } from '@farm/shared';

const O = OUTLINE;
const EYE = '#2b1b12';
const SPARK = '#fff6c0';
const WOOD = '#d9a066';
const WOOD_D = '#9a6638';
const WOOD_L = '#ecc08a';
const STONE = '#b3afa4';
const STONE_D = '#8d897f';
const STONE_L = '#d9d5ca';
const WATER = '#6ec6e6';
const WATER_D = '#3f9cc8';
const LEAF = '#5cbf4f';
const GOLD = '#ffd24a';
const GOLD_D = '#c98f22';
const UP = -Math.PI / 2;

type Fill = string | CanvasGradient | null;
type Painter = (p: Pen) => void;
type Ctx = CanvasRenderingContext2D;

// ---------------------------------------------------------------------------
// Helpers

/** Run fn with a different outline width (keeps tiny details from turning to ink). */
function thin(p: Pen, w: number, fn: () => void): void {
  const old = p.lineWidth;
  p.lineWidth = w;
  fn();
  p.lineWidth = old;
}

/** A round or oval body, lit from the top left. */
function soft(p: Pen, x: number, y: number, rx: number, ry: number, color: string, stroke: string | null = O): void {
  const g = p.ctx.createRadialGradient(x - rx * 0.3, y - ry * 0.35, Math.min(rx, ry) * 0.1, x, y, Math.max(rx, ry) * 1.1);
  g.addColorStop(0, shade(color, 0.35));
  g.addColorStop(0.6, color);
  g.addColorStop(1, shade(color, -0.25));
  p.ellipse(x, y, rx, ry, g, stroke);
}

/** A glossy streak. */
function shine(p: Pen, x: number, y: number, r: number): void {
  p.ellipse(x, y, r, r * 0.55, 'rgba(255,255,255,0.8)', null, -0.5);
}

/** A tiny kawaii face: dot eyes with glints, pink cheeks and a smile. */
function face(p: Pen, x: number, y: number, k: number): void {
  for (const sx of [-1, 1]) {
    const ex = x + sx * k;
    const ey = y - k * 0.2;
    p.ellipse(ex, ey, k * 0.36, k * 0.5, EYE, null);
    if (k >= 1.2) p.circle(ex - k * 0.14, ey - k * 0.22, k * 0.14, '#ffffff', null);
    p.ellipse(x + sx * k * 1.6, y + k * 0.45, k * 0.42, k * 0.26, 'rgba(255,110,140,0.75)', null);
  }
  p.curve({ x: x - k * 0.55, y: y + k * 0.5 }, { x, y: y + k * 1.2 }, { x: x + k * 0.55, y: y + k * 0.5 }, EYE, Math.max(0.45, k * 0.22));
}

/** A cream face plate, so a face still reads on a dark body. */
function plate(p: Pen, x: number, y: number, rx: number, ry: number): void {
  p.ellipse(x, y, rx, ry, '#fff1d6', null);
}

/** A thick outlined curve (legs, rods, handles). */
function limb(p: Pen, a: Pt, c: Pt, b: Pt, color: string, w: number): void {
  p.curve(a, c, b, O, w + 1.2);
  p.curve(a, c, b, color, w);
}

/** An antenna: a thin curve ending in a coloured knob. */
function antenna(p: Pen, a: Pt, c: Pt, b: Pt, knob: string): void {
  p.curve(a, c, b, O, 1.5);
  p.circle(b.x, b.y, 1.7, knob);
}

/** Five-point sparkle glint. */
function sparkle(p: Pen, x: number, y: number, r: number, fill = SPARK): void {
  p.poly(
    [
      { x, y: y - r },
      { x: x + r * 0.25, y: y - r * 0.25 },
      { x: x + r, y },
      { x: x + r * 0.25, y: y + r * 0.25 },
      { x, y: y + r },
      { x: x - r * 0.25, y: y + r * 0.25 },
      { x: x - r, y },
      { x: x - r * 0.25, y: y - r * 0.25 },
    ],
    fill,
    null,
  );
}

/** A pointed leaf from (x, y) heading along `ang` for `len` px. */
function leafAt(p: Pen, x: number, y: number, len: number, ang: number, w: number, color: string): void {
  const dx = Math.cos(ang);
  const dy = Math.sin(ang);
  const tx = x + dx * len;
  const ty = y + dy * len;
  const cx = x + dx * len * 0.5;
  const cy = y + dy * len * 0.5;
  const nx = -dy * w;
  const ny = dx * w;
  const c = p.ctx;
  c.beginPath();
  c.moveTo(x, y);
  c.quadraticCurveTo(cx + nx, cy + ny, tx, ty);
  c.quadraticCurveTo(cx - nx, cy - ny, x, y);
  c.closePath();
  c.fillStyle = color;
  c.fill();
  c.strokeStyle = O;
  c.lineWidth = 0.9;
  c.stroke();
}

/** Build an arbitrary path, then fill and/or stroke it. */
function path(p: Pen, build: (c: Ctx) => void, fill: Fill, stroke: string | null = O, w = p.lineWidth): void {
  const c = p.ctx;
  c.beginPath();
  build(c);
  if (fill) {
    c.fillStyle = fill;
    c.fill();
  }
  if (stroke) {
    c.strokeStyle = stroke;
    c.lineWidth = w;
    c.stroke();
  }
}

/** Short hairs around an oval edge: fuzzy bees and caterpillars. */
function fuzz(p: Pen, x: number, y: number, rx: number, ry: number, n: number, color: string, len: number): void {
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + 0.2;
    const ca = Math.cos(a);
    const sa = Math.sin(a);
    p.line([{ x: x + ca * rx, y: y + sa * ry }, { x: x + ca * (rx + len), y: y + sa * (ry + len) }], color, 0.8);
  }
}

/** A spiral line (snail shell). */
function spiral(p: Pen, cx: number, cy: number, r0: number, r1: number, turns: number, color: string): void {
  const pts: Pt[] = [];
  const n = 24;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const a = t * turns * Math.PI * 2 + 0.6;
    const r = r0 + (r1 - r0) * t;
    pts.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r });
  }
  p.line(pts, color, 1.4);
}

/** A small dotted mushroom standing on (x, y). */
function mushroom(p: Pen, x: number, y: number, r: number): void {
  p.poly([{ x: x - r * 0.4, y }, { x: x + r * 0.4, y }, { x: x + r * 0.3, y: y - r * 1.2 }, { x: x - r * 0.3, y: y - r * 1.2 }], '#fff4e0', O, 0.7);
  p.ellipse(x, y - r * 1.25, r * 1.15, r * 0.85, '#ff6b6b', O);
  p.circle(x - r * 0.5, y - r * 1.5, r * 0.22, '#ffffff', null);
  p.circle(x + r * 0.45, y - r * 1.15, r * 0.18, '#ffffff', null);
}

/** Flat ground space: one tile = 32 units, u along x and v along y. */
function flat(p: Pen, fn: () => void): void {
  p.save();
  p.ctx.transform(1, 0.5, -1, 0.5, p.fh * 32, p.height);
  fn();
  p.restore();
}

/** A radial water gradient centred on (x, y) in the current space. */
function waterGrad(p: Pen, x: number, y: number, r: number): CanvasGradient {
  const g = p.ctx.createRadialGradient(x - r * 0.3, y - r * 0.35, r * 0.1, x, y, r * 1.1);
  g.addColorStop(0, '#d4f6ff');
  g.addColorStop(0.55, WATER);
  g.addColorStop(1, WATER_D);
  return g;
}

/** A small fish seen from the side, facing `dir` (1 right, -1 left). */
function fishIn(p: Pen, at: Pt, dir: number, color: string): void {
  p.ellipse(at.x, at.y, 4.6, 2.6, color, O);
  p.poly([{ x: at.x - dir * 4.2, y: at.y }, { x: at.x - dir * 8, y: at.y - 3 }, { x: at.x - dir * 8, y: at.y + 3 }], color, O, 0.7);
  p.circle(at.x + dir * 2.2, at.y - 0.6, 0.8, EYE, null);
}

// ---------------------------------------------------------------------------
// Critter icons (40px, three-quarter view)

const cabbageWhite: Painter = (p) => {
  p.ellipse(12.5, 13.5, 8.6, 7.4, '#fffdf6', O, -0.45);
  p.ellipse(27.5, 13.5, 8.6, 7.4, '#fffdf6', O, 0.45);
  p.ellipse(14, 26.5, 6.4, 6.2, '#eef7da', O, 0.35);
  p.ellipse(26, 26.5, 6.4, 6.2, '#eef7da', O, -0.35);
  p.circle(9.6, 10.8, 1.5, '#4a3d32', null);
  p.circle(30.4, 10.8, 1.5, '#4a3d32', null);
  soft(p, 20, 22, 4.4, 8.8, '#7b8a5c');
  p.circle(20, 12.5, 3.2, '#7b8a5c');
  antenna(p, { x: 18.4, y: 10.6 }, { x: 16.5, y: 6 }, { x: 15, y: 3.5 }, '#4a3d32');
  antenna(p, { x: 21.6, y: 10.6 }, { x: 23.5, y: 6 }, { x: 25, y: 3.5 }, '#4a3d32');
  face(p, 20, 21.6, 2.1);
};

const ladybug: Painter = (p) => {
  soft(p, 20, 22, 13, 12, '#ff6b5b');
  p.ellipse(20, 10.5, 6, 4.2, '#2e2623');
  for (const [x, y] of [[13, 17], [27, 17], [10.5, 25], [29.5, 25], [15, 31], [25, 31], [20, 34]] as const) p.circle(x, y, 2.1, '#2e2623', null);
  p.ellipse(15, 14.5, 2.8, 1.4, 'rgba(255,255,255,0.7)', null, -0.7);
  face(p, 20, 22.5, 2.4);
};

const bumblebee: Painter = (p) => {
  const cx = 20;
  const cy = 23;
  p.ellipse(12.5, 9.5, 6.4, 4.4, 'rgba(235,248,255,0.92)', O, -0.5);
  p.ellipse(27.5, 9.5, 6.4, 4.4, 'rgba(235,248,255,0.92)', O, 0.5);
  p.save();
  path(p, (c) => c.ellipse(cx, cy, 13, 11, 0, 0, Math.PI * 2), null, null);
  p.ctx.clip();
  soft(p, cx, cy, 13, 11, '#ffd23f', null);
  p.rect(6, 16.5, 28, 3.4, '#3d2a1e', null);
  p.rect(6, 26.8, 28, 3.4, '#3d2a1e', null);
  p.restore();
  p.ellipse(cx, cy, 13, 11, null, O);
  fuzz(p, cx, cy, 13, 11, 10, '#8a6a2a', 2.2);
  face(p, cx, 23.2, 2.2);
};

const snail: Painter = (p) => {
  const body = '#f6e7a4';
  p.curve({ x: 6.5, y: 26 }, { x: 4.6, y: 21 }, { x: 4, y: 17.5 }, O, 1.6);
  p.curve({ x: 9, y: 26 }, { x: 9.8, y: 21 }, { x: 10.5, y: 17.5 }, O, 1.6);
  p.circle(4, 17, 1.7, EYE);
  p.circle(10.5, 17, 1.7, EYE);
  p.ellipse(15, 30, 13.5, 4.6, body);
  p.ellipse(7.5, 27.5, 4.5, 4, body);
  face(p, 13, 29.6, 1.8);
  soft(p, 26, 19, 11, 10.5, '#e0894a');
  spiral(p, 26, 19, 1.2, 7.4, 1.5, '#fbe3b8');
  shine(p, 20.5, 13, 2.4);
};

const caterpillar: Painter = (p) => {
  const segs: [number, number, number, string][] = [
    [7.5, 28, 4.6, '#7fc25a'],
    [13.5, 25.5, 5, '#9ad65c'],
    [19.5, 25.5, 5.2, '#7fc25a'],
    [25.5, 23.5, 5.4, '#9ad65c'],
  ];
  for (const [x, y] of segs) p.line([{ x, y: y + 4 }, { x: x - 1.2, y: y + 7.4 }], O, 1.2);
  for (const [x, y, r, col] of segs) {
    p.circle(x, y, r, col);
    p.circle(x - 1.2, y - 2, 0.9, '#ffe46b', null);
  }
  antenna(p, { x: 28.5, y: 15.5 }, { x: 27, y: 10 }, { x: 25.5, y: 7.5 }, '#ffd84a');
  antenna(p, { x: 33.5, y: 15.5 }, { x: 35, y: 10 }, { x: 36.5, y: 7.5 }, '#ffd84a');
  p.circle(31, 20, 6.6, '#a6dc6e');
  shine(p, 28.5, 16, 1.8);
  face(p, 31.5, 21, 1.9);
};

const pillBug: Painter = (p) => {
  soft(p, 20, 23.5, 15, 10.5, '#b3bdc7');
  p.curve({ x: 11.5, y: 14 }, { x: 9.5, y: 23.5 }, { x: 11.5, y: 33 }, O, 0.9);
  p.curve({ x: 28.5, y: 14 }, { x: 30.5, y: 23.5 }, { x: 28.5, y: 33 }, O, 0.9);
  p.ellipse(8.5, 23.5, 3.6, 6, '#b9c2cb');
  for (const x of [10, 16, 24, 30]) p.line([{ x, y: 33 }, { x: x - 0.6, y: 35.6 }, { x: x - 1.6, y: 37.4 }], O, 1);
  shine(p, 18, 16, 2.4);
  face(p, 20.5, 23.5, 2.3);
};

const grasshopper: Painter = (p) => {
  const g = '#9ad65c';
  const gd = '#6fb24a';
  limb(p, { x: 21, y: 25 }, { x: 30, y: 37 }, { x: 36, y: 31 }, gd, 1.6);
  limb(p, { x: 17, y: 26 }, { x: 10, y: 36 }, { x: 5, y: 33 }, gd, 1.6);
  antenna(p, { x: 7, y: 14 }, { x: 4, y: 9 }, { x: 2, y: 5 }, EYE);
  antenna(p, { x: 10, y: 13 }, { x: 11, y: 8 }, { x: 13, y: 4.5 }, EYE);
  limb(p, { x: 15, y: 25 }, { x: 13, y: 30 }, { x: 11, y: 33 }, gd, 1);
  limb(p, { x: 19, y: 27 }, { x: 18, y: 32 }, { x: 19, y: 35 }, gd, 1);
  soft(p, 21, 22, 12.5, 6.8, g);
  p.line([{ x: 14, y: 21.5 }, { x: 28, y: 21 }], gd, 1);
  soft(p, 9, 18, 6.2, 6, '#b5e27e');
  shine(p, 6.4, 15, 1.4);
  face(p, 9, 18.5, 1.7);
};

const cricket: Painter = (p) => {
  const b = '#c98c55';
  const bd = '#7a4e2c';
  p.curve({ x: 17.5, y: 8 }, { x: 9, y: -1 }, { x: 3, y: 6 }, O, 1.4);
  p.curve({ x: 22.5, y: 8 }, { x: 31, y: -1 }, { x: 37, y: 6 }, O, 1.4);
  limb(p, { x: 13, y: 28 }, { x: 7, y: 31 }, { x: 4, y: 37 }, bd, 1.3);
  limb(p, { x: 27, y: 28 }, { x: 33, y: 31 }, { x: 36, y: 37 }, bd, 1.3);
  soft(p, 20, 26, 9.5, 9.5, b);
  p.ellipse(20, 25, 4.4, 9, '#a86d40', O);
  p.line([{ x: 20, y: 18 }, { x: 20, y: 32 }], bd, 0.8);
  soft(p, 20, 12, 6.2, 5.6, '#d69a62');
  face(p, 20, 12.5, 1.7);
};

const dragonfly: Painter = (p) => {
  const wing = 'rgba(214,244,255,0.62)';
  p.ellipse(11.5, 13.5, 8, 3.8, wing, O, -0.42);
  p.ellipse(28.5, 13.5, 8, 3.8, wing, O, 0.42);
  p.ellipse(12.5, 25, 7.2, 3.2, wing, O, -0.22);
  p.ellipse(27.5, 25, 7.2, 3.2, wing, O, 0.22);
  p.line([{ x: 19, y: 12.5 }, { x: 7.5, y: 9.8 }], 'rgba(60,140,170,0.5)', 0.6);
  p.line([{ x: 21, y: 12.5 }, { x: 32.5, y: 9.8 }], 'rgba(60,140,170,0.5)', 0.6);
  p.line([{ x: 20, y: 13 }, { x: 20, y: 35 }], O, 5.2);
  p.line([{ x: 20, y: 13 }, { x: 20, y: 35 }], '#2fb8a0', 3.2);
  for (const y of [18, 22.5, 27, 31]) p.line([{ x: 18.4, y }, { x: 21.6, y }], '#1d6b68', 0.9);
  soft(p, 20, 9.5, 6.8, 6.2, '#3ba6d9');
  shine(p, 16.5, 6.5, 1.6);
  face(p, 20, 10.4, 2);
};

const firefly: Painter = (p) => {
  p.glow(20, 31, 15, '#ffe86b', 0.75);
  soft(p, 20, 21, 9, 9.5, '#9c7650');
  soft(p, 20, 15.5, 6.2, 3.8, '#f0b35a');
  soft(p, 20, 9.5, 4.8, 4, '#4a3828');
  p.line([{ x: 20, y: 18 }, { x: 20, y: 22 }], O, 0.8);
  shine(p, 15, 19, 2.2);
  face(p, 20, 21.2, 2.2);
  p.ellipse(20, 31.5, 5, 3.9, '#fff08a', O);
  p.ellipse(18.6, 30.2, 2, 1.2, '#ffffff', null, -0.4);
};

const monarch: Painter = (p) => {
  const or = '#ff9a2e';
  const bk = '#3a2418';
  const rim = (x: number, y: number, rx: number, ry: number, rot: number) => {
    p.ellipse(x, y, rx, ry, or, null, rot);
    thin(p, 1.8, () => p.ellipse(x, y, rx, ry, null, bk, rot));
  };
  rim(13, 27.5, 7, 6.4, 0.2);
  rim(27, 27.5, 7, 6.4, -0.2);
  rim(11.5, 14.5, 9, 8.6, -0.3);
  rim(28.5, 14.5, 9, 8.6, 0.3);
  for (const [x, y, x2, y2] of [[11.5, 14.5, 5, 9.5], [28.5, 14.5, 35, 9.5], [13, 27.5, 8, 33], [27, 27.5, 32, 33]] as const) {
    p.line([{ x, y }, { x: x2, y: y2 }], bk, 0.6);
  }
  for (const [x, y] of [[4.6, 11], [6.2, 18], [35.4, 11], [33.8, 18]] as const) p.circle(x, y, 0.9, '#ffffff', null);
  antenna(p, { x: 18.6, y: 13 }, { x: 16, y: 8 }, { x: 13.5, y: 5.5 }, '#ffb45c');
  antenna(p, { x: 21.4, y: 13 }, { x: 24, y: 8 }, { x: 26.5, y: 5.5 }, '#ffb45c');
  soft(p, 20, 23, 4.6, 10, '#2e2219');
  plate(p, 20, 22.5, 3.2, 4.6);
  face(p, 20, 22.5, 1.5);
};

const woollyBear: Painter = (p) => {
  const black = '#2e2219';
  const orange = '#e58a3e';
  const fur = '#6a4226';
  const segs: [number, number, number, string][] = [
    [8.5, 27, 5, black],
    [14.5, 25.5, 5.6, orange],
    [20.5, 24.5, 5.8, orange],
    [26.5, 24, 5.8, orange],
    [32, 22, 6.4, black],
  ];
  for (const [x, y, r, col] of segs) {
    fuzz(p, x, y, r, r, 10, fur, 2);
    p.circle(x, y, r, col);
    shine(p, x - r * 0.4, y - r * 0.45, r * 0.3);
  }
  plate(p, 32.5, 22.5, 3.2, 3.6);
  face(p, 32.5, 22.5, 1.5);
};

const winterMoth: Painter = (p) => {
  const w = '#e4f2fb';
  const s = '#7a93ad';
  p.ellipse(11.5, 14, 8.6, 7.6, w, O, -0.4);
  p.ellipse(28.5, 14, 8.6, 7.6, w, O, 0.4);
  p.ellipse(13.5, 27, 6.4, 5.8, '#eef8ff', O, 0.3);
  p.ellipse(26.5, 27, 6.4, 5.8, '#eef8ff', O, -0.3);
  p.line([{ x: 7, y: 12.5 }, { x: 10, y: 12 }], s, 1);
  p.line([{ x: 8.5, y: 17.5 }, { x: 11.5, y: 16 }], s, 0.8);
  p.line([{ x: 30, y: 12 }, { x: 33, y: 12.5 }], s, 1);
  p.line([{ x: 28.5, y: 16 }, { x: 31.5, y: 17.5 }], s, 0.8);
  sparkle(p, 5.5, 27, 2.2, '#8fc8ef');
  sparkle(p, 34.5, 27, 1.8, '#8fc8ef');
  antenna(p, { x: 18.6, y: 13 }, { x: 16, y: 8 }, { x: 13, y: 5 }, s);
  antenna(p, { x: 21.4, y: 13 }, { x: 24, y: 8 }, { x: 27, y: 5 }, s);
  soft(p, 20, 22, 4.6, 8.6, '#a9bccf');
  face(p, 20, 21.5, 1.7);
};

const prayingMantis: Painter = (p) => {
  const g = '#7fc25a';
  const gl = '#b6e66e';
  const gd = '#4f8f3a';
  limb(p, { x: 13, y: 27 }, { x: 8, y: 31 }, { x: 6, y: 37 }, gd, 1.2);
  limb(p, { x: 27, y: 27 }, { x: 32, y: 31 }, { x: 34, y: 37 }, gd, 1.2);
  soft(p, 20, 27, 6.2, 11, g);
  p.ellipse(20, 27, 2.6, 9.5, '#d4f08c', null);
  p.line([{ x: 20, y: 19 }, { x: 20, y: 35 }], gd, 0.7);
  limb(p, { x: 14, y: 18 }, { x: 12, y: 11 }, { x: 18, y: 5.5 }, gl, 2.2);
  limb(p, { x: 26, y: 18 }, { x: 28, y: 11 }, { x: 22, y: 5.5 }, gl, 2.2);
  soft(p, 20, 13.5, 6.4, 6.2, gl);
  shine(p, 17, 10.5, 1.6);
  face(p, 20, 14, 1.8);
};

const stagBeetle: Painter = (p) => {
  const shell = '#b5603a';
  const jaw = '#5a3a28';
  limb(p, { x: 17, y: 13 }, { x: 11, y: 6 }, { x: 5, y: 5 }, jaw, 2.4);
  limb(p, { x: 23, y: 13 }, { x: 29, y: 6 }, { x: 35, y: 5 }, jaw, 2.4);
  p.poly([{ x: 10, y: 8.3 }, { x: 8.2, y: 4.6 }, { x: 12.6, y: 6.8 }], jaw, O, 0.8);
  p.poly([{ x: 30, y: 8.3 }, { x: 31.8, y: 4.6 }, { x: 27.4, y: 6.8 }], jaw, O, 0.8);
  soft(p, 20, 14, 5.4, 4, jaw);
  soft(p, 20, 25, 11.5, 11, shell);
  p.line([{ x: 20, y: 18.5 }, { x: 20, y: 21.2 }], O, 0.9);
  p.line([{ x: 20, y: 29 }, { x: 20, y: 33 }], O, 0.9);
  shine(p, 14.5, 19, 2.6);
  face(p, 20, 24.5, 2.3);
};

const rhinoBeetle: Painter = (p) => {
  const shell = '#5b3a26';
  const leg = '#3a2418';
  // six little legs poking out from under the shell edge
  for (const [y, x] of [[18, 11], [25, 8], [32, 11]] as const) {
    limb(p, { x: x + 1, y }, { x: x - 3, y: y - 0.5 }, { x: x - 6, y: y + 3.5 }, leg, 1.2);
    limb(p, { x: 39 - x, y }, { x: 43 - x, y: y - 0.5 }, { x: 46 - x, y: y + 3.5 }, leg, 1.2);
  }
  // glossy oval shell split down the middle
  soft(p, 20, 26, 12, 10.5, shell);
  p.line([{ x: 20, y: 16.5 }, { x: 20, y: 35.5 }], O, 1);
  shine(p, 13.5, 21, 2.8);
  shine(p, 13.8, 29, 1.3);
  // a short second horn on the thorax
  p.poly([{ x: 23.5, y: 19.5 }, { x: 26.5, y: 20 }, { x: 27.8, y: 14.8 }], '#efe2c4', O, 0.9);
  // one big curved horn sweeping up and back from the head
  path(p, (c) => {
    c.moveTo(16.4, 12.5);
    c.quadraticCurveTo(12.5, 4, 5.5, 2.8);
    c.quadraticCurveTo(10.5, 6.5, 23.2, 11.5);
    c.closePath();
  }, '#efe2c4', O, 1);
  p.line([{ x: 15.4, y: 11 }, { x: 9.5, y: 5.6 }], '#c8b48e', 0.8);
  // smaller head with a cute face
  soft(p, 20, 13.5, 6, 4.4, '#8a5e40');
  face(p, 20, 14, 1.3);
};

const lunaMoth: Painter = (p) => {
  const g = '#bdeec8';
  const gd = '#8fd0a0';
  limb(p, { x: 12, y: 30 }, { x: 7.5, y: 35 }, { x: 10, y: 39.5 }, gd, 1.6);
  limb(p, { x: 28, y: 30 }, { x: 32.5, y: 35 }, { x: 30, y: 39.5 }, gd, 1.6);
  p.ellipse(11.5, 14.5, 8.8, 8, g, O, -0.35);
  p.ellipse(28.5, 14.5, 8.8, 8, g, O, 0.35);
  p.ellipse(13.5, 26, 7, 6.5, '#d3f5dc', O, 0.2);
  p.ellipse(26.5, 26, 7, 6.5, '#d3f5dc', O, -0.2);
  p.line([{ x: 11.5, y: 14.5 }, { x: 5, y: 9 }], gd, 0.6);
  p.line([{ x: 28.5, y: 14.5 }, { x: 35, y: 9 }], gd, 0.6);
  p.circle(11, 16, 2.6, '#9b7ad0');
  p.circle(11, 16, 1.1, '#3a2a5a', null);
  p.circle(29, 16, 2.6, '#9b7ad0');
  p.circle(29, 16, 1.1, '#3a2a5a', null);
  soft(p, 20, 22, 4.6, 9, '#f2e9d2');
  fuzz(p, 20, 22, 4.6, 9, 8, '#c9b98e', 1.4);
  antenna(p, { x: 18.5, y: 13.5 }, { x: 15, y: 9 }, { x: 12, y: 6 }, '#c9b98e');
  antenna(p, { x: 21.5, y: 13.5 }, { x: 25, y: 9 }, { x: 28, y: 6 }, '#c9b98e');
  face(p, 20, 21, 1.8);
  sparkle(p, 34, 6, 2, '#fff8d0');
};

const blueMorpho: Painter = (p) => {
  const b1 = '#2f8ee6';
  const b2 = '#1f6fd0';
  const rim = '#1b2a4a';
  soft(p, 11, 14, 9.8, 8.8, b1, rim);
  soft(p, 29, 14, 9.8, 8.8, b1, rim);
  soft(p, 12.5, 27.5, 7.4, 6.2, b2, rim);
  soft(p, 27.5, 27.5, 7.4, 6.2, b2, rim);
  p.ellipse(8.5, 10.5, 3.6, 1.8, 'rgba(220,248,255,0.8)', null, -0.5);
  p.ellipse(31.5, 10.5, 3.6, 1.8, 'rgba(220,248,255,0.8)', null, 0.5);
  for (const [x, y] of [[2.6, 14], [37.4, 14], [5, 22], [35, 22]] as const) p.circle(x, y, 0.7, '#ffffff', null);
  antenna(p, { x: 18.5, y: 13.5 }, { x: 16, y: 8 }, { x: 14, y: 5 }, '#7fd6ff');
  antenna(p, { x: 21.5, y: 13.5 }, { x: 24, y: 8 }, { x: 26, y: 5 }, '#7fd6ff');
  soft(p, 20, 22, 4.2, 9, '#2a2f55');
  plate(p, 20, 22.5, 3, 4.2);
  face(p, 20, 22.5, 1.5);
  sparkle(p, 33, 4.5, 2.6);
  sparkle(p, 5.5, 34, 1.8);
};

const rainbowStag: Painter = (p) => {
  const g = p.ctx.createLinearGradient(9, 0, 31, 0);
  g.addColorStop(0, '#ff8fb1');
  g.addColorStop(0.25, '#ffd66b');
  g.addColorStop(0.5, '#9ee88a');
  g.addColorStop(0.75, '#7fd4ff');
  g.addColorStop(1, '#c7a6ff');
  limb(p, { x: 17, y: 13 }, { x: 11, y: 6 }, { x: 5, y: 5 }, '#f2c14e', 2.4);
  limb(p, { x: 23, y: 13 }, { x: 29, y: 6 }, { x: 35, y: 5 }, '#f2c14e', 2.4);
  soft(p, 20, 14, 5.4, 4, '#5b4a86');
  p.ellipse(20, 25, 11.5, 11, g, O);
  p.curve({ x: 12, y: 20 }, { x: 20, y: 16 }, { x: 28, y: 20 }, 'rgba(255,255,255,0.6)', 1.1);
  p.curve({ x: 11, y: 27 }, { x: 20, y: 24 }, { x: 29, y: 27 }, 'rgba(255,255,255,0.5)', 1);
  p.line([{ x: 20, y: 18.5 }, { x: 20, y: 21 }], O, 0.9);
  shine(p, 15, 19, 2.4);
  face(p, 20, 28, 2.3);
  sparkle(p, 6, 13, 2.6);
  sparkle(p, 34, 12, 2.2);
  sparkle(p, 33, 33, 1.8);
};

const ghostMoth: Painter = (p) => {
  const ln = '#8f84b8';
  p.glow(20, 22, 19, '#dfe9ff', 0.55);
  p.ellipse(11.5, 14, 8.5, 8, 'rgba(255,255,255,0.92)', ln, -0.4);
  p.ellipse(28.5, 14, 8.5, 8, 'rgba(255,255,255,0.92)', ln, 0.4);
  p.ellipse(13.5, 27, 6, 5.5, 'rgba(255,255,255,0.9)', ln, 0.3);
  p.ellipse(26.5, 27, 6, 5.5, 'rgba(255,255,255,0.9)', ln, -0.3);
  p.curve({ x: 19, y: 31 }, { x: 23, y: 36 }, { x: 19, y: 39 }, ln, 2.6);
  p.curve({ x: 19, y: 31 }, { x: 23, y: 36 }, { x: 19, y: 39 }, '#ffffff', 1.5);
  p.ellipse(20, 22, 4.4, 8.6, '#f6f3ff', ln);
  p.circle(18, 20.2, 0.9, EYE, null);
  p.circle(22, 20.2, 0.9, EYE, null);
  p.ellipse(20, 24.4, 0.9, 1.2, EYE, null);
  p.ellipse(16.4, 23, 1, 0.6, 'rgba(255,140,170,0.7)', null);
  p.ellipse(23.6, 23, 1, 0.6, 'rgba(255,140,170,0.7)', null);
  antenna(p, { x: 18.6, y: 14 }, { x: 16, y: 9 }, { x: 14, y: 6 }, ln);
  antenna(p, { x: 21.4, y: 14 }, { x: 24, y: 9 }, { x: 26, y: 6 }, ln);
  sparkle(p, 6, 6, 1.8, '#c9d8ff');
  sparkle(p, 34, 34, 1.6, '#c9d8ff');
};

const heartLadybug: Painter = (p) => {
  soft(p, 20, 22, 13, 12, '#ff8fb8');
  p.ellipse(20, 10.5, 6, 4.2, '#5a2f45');
  for (const [x, y] of [[12.5, 17], [27.5, 17], [10.5, 25], [29.5, 25], [15, 31], [25, 31]] as const) p.heart(x, y, 2.2, '#e0407a', null);
  p.heart(20, 34, 1.8, '#e0407a', null);
  p.ellipse(15, 14.5, 2.8, 1.4, 'rgba(255,255,255,0.7)', null, -0.7);
  face(p, 20, 22.5, 2.4);
};

const sakuraButterfly: Painter = (p) => {
  const pk = '#ffc2d4';
  const pd = '#ff7fa6';
  p.ellipse(11.5, 14, 8.6, 7.6, pk, O, -0.35);
  p.ellipse(28.5, 14, 8.6, 7.6, pk, O, 0.35);
  p.ellipse(13.5, 27, 6.2, 5.6, '#ffd6e2', O, 0.25);
  p.ellipse(26.5, 27, 6.2, 5.6, '#ffd6e2', O, -0.25);
  p.line([{ x: 11.5, y: 14 }, { x: 5.5, y: 10 }], pd, 0.6);
  p.line([{ x: 28.5, y: 14 }, { x: 34.5, y: 10 }], pd, 0.6);
  p.circle(11.5, 14, 2.2, '#ff8fb1', null);
  p.circle(28.5, 14, 2.2, '#ff8fb1', null);
  antenna(p, { x: 18.6, y: 13 }, { x: 16.5, y: 8 }, { x: 15, y: 5 }, pd);
  antenna(p, { x: 21.4, y: 13 }, { x: 23.5, y: 8 }, { x: 25, y: 5 }, pd);
  soft(p, 20, 22, 3.8, 9, '#c46a88');
  face(p, 20, 21.5, 1.6);
  p.ellipse(4, 31, 2.4, 1.5, '#ffd1de', O, 0.6);
  p.ellipse(36, 32, 2.4, 1.5, '#ffd1de', O, -0.6);
};

const starFirefly: Painter = (p) => {
  p.glow(20, 30, 18, '#fff3a6', 0.6);
  p.star(20, 33, 6.4, '#fff6a8', GOLD_D);
  p.ellipse(13, 13, 5.5, 3.2, 'rgba(230,240,255,0.8)', O, -0.5);
  p.ellipse(27, 13, 5.5, 3.2, 'rgba(230,240,255,0.8)', O, 0.5);
  soft(p, 20, 21, 9, 9, '#7f86d0');
  soft(p, 20, 12.5, 5, 4, '#5b5fa8');
  shine(p, 15, 18, 2.2);
  face(p, 20, 21.5, 2.2);
  sparkle(p, 6, 8, 2.2);
  sparkle(p, 34, 9, 1.8);
  sparkle(p, 33, 31, 1.6);
};

/** Fallback for a critter added without bespoke art: a shy round bug. */
const genericBug: Painter = (p) => {
  soft(p, 20, 22, 12, 11, '#ffd27a');
  shine(p, 15, 16, 2.4);
  face(p, 20, 22, 2.4);
};

const CRITTERS: Record<string, Painter> = {
  cabbage_white: cabbageWhite,
  ladybug,
  bumblebee,
  snail,
  caterpillar,
  pill_bug: pillBug,
  grasshopper,
  cricket,
  dragonfly,
  firefly,
  monarch,
  woolly_bear: woollyBear,
  winter_moth: winterMoth,
  praying_mantis: prayingMantis,
  stag_beetle: stagBeetle,
  luna_moth: lunaMoth,
  rhino_beetle: rhinoBeetle,
  blue_morpho: blueMorpho,
  rainbow_stag: rainbowStag,
  ghost_moth: ghostMoth,
  heart_ladybug: heartLadybug,
  sakura_butterfly: sakuraButterfly,
  star_firefly: starFirefly,
};

// ---------------------------------------------------------------------------
// Journal, bug net and fishing rod icons

const journal: Painter = (p) => {
  const cover = '#5fae4a';
  const spine = '#3f7f36';
  p.roundRect(8.5, 6.5, 24, 28, 3.5, cover);
  p.rect(8.8, 8.5, 3.6, 24, spine, null);
  thin(p, 0.7, () => p.rect(32.4, 9, 2.6, 22, '#fbf1d6', O));
  shine(p, 24, 10.5, 2);
  p.ellipse(22, 19.5, 7, 6.4, '#fff6df', O);
  face(p, 22, 19.5, 1.5);
  leafAt(p, 22, 12, 5.2, UP - 0.6, 2.2, LEAF);
  leafAt(p, 22, 12, 5.2, UP + 0.6, 2.2, '#8fd06a');
  p.line([{ x: 22, y: 12 }, { x: 22, y: 9.5 }], O, 0.6);
  p.poly([{ x: 24, y: 32 }, { x: 28, y: 32 }, { x: 28, y: 39 }, { x: 26, y: 37 }, { x: 24, y: 39 }], '#e0523f');
  leafAt(p, 26, 32, 5.5, Math.PI / 2 - 0.1, 2.4, '#ff7a5c');
};

const net: Painter = (p) => {
  limb(p, { x: 9, y: 37 }, { x: 15, y: 27 }, { x: 21, y: 18 }, WOOD, 2.6);
  path(p, (c) => {
    c.moveTo(18.5, 12);
    c.quadraticCurveTo(19, 25, 24, 27);
    c.quadraticCurveTo(31, 24, 35.5, 12);
    c.closePath();
  }, 'rgba(236,252,255,0.92)', O, 1);
  for (const [a, b, cc, d] of [[21, 14, 26, 25], [25, 13, 27.5, 26], [29, 13, 28.5, 26], [33, 14, 30, 25]] as const) {
    p.line([{ x: a, y: b }, { x: cc, y: d }], '#9fcbd9', 0.6);
  }
  thin(p, 3.4, () => p.ellipse(27, 12, 9, 8, null, O));
  thin(p, 1.6, () => p.ellipse(27, 12, 9, 8, null, '#e0b070'));
  shine(p, 22, 8, 1.6);
};

const rod: Painter = (p) => {
  limb(p, { x: 5, y: 36 }, { x: 20, y: 18 }, { x: 34, y: 6 }, '#a8703e', 1.8);
  limb(p, { x: 5, y: 36 }, { x: 7.2, y: 33.8 }, { x: 9.5, y: 31.5 }, '#e0b07a', 2.6);
  p.circle(12.5, 27, 2.8, '#c9d2d8');
  p.curve({ x: 34, y: 6 }, { x: 38, y: 20 }, { x: 30, y: 30 }, O, 0.9);
  p.curve({ x: 34, y: 6 }, { x: 38, y: 20 }, { x: 30, y: 30 }, '#f0f4f6', 0.4);
  p.circle(30, 31.5, 3.2, '#ffffff');
  p.arc(30, 31.5, 3.2, Math.PI, 0, '#ff5a5a');
};

const UTILITY_ICONS: IconSpec[] = [
  { key: 'icon:journal', paint: journal },
  { key: 'icon:net', paint: net },
  { key: 'icon:rod', paint: rod },
];

export const icons: IconSpec[] = [
  ...BUG_LIST.map(
    (b): IconSpec => ({
      key: `icon:${b.id}`,
      paint: (p) => {
        p.outline = O;
        (CRITTERS[b.id] ?? genericBug)(p);
      },
    }),
  ),
  ...UTILITY_ICONS,
];

// ---------------------------------------------------------------------------
// Isometric keepsakes

const fishingBench: Painter = (p) => {
  const c = p.center;
  p.shadow(c.x, c.y + 1, 25, 11, 0.24);
  p.box(0.16, 0.42, 0.08, 0.16, 9, WOOD_D, 0);
  p.box(0.76, 0.42, 0.08, 0.16, 9, WOOD_D, 0);
  p.box(0.14, 0.28, 0.72, 0.1, 18, WOOD, 13);
  p.box(0.1, 0.36, 0.8, 0.3, 5, { top: '#f0c58c', left: WOOD, right: WOOD_D }, 9);
  p.box(0.1, 0.66, 0.3, 0.24, 9, { top: '#ffb3a6', left: '#e8685a', right: '#b84a40' }, 0);
  p.line([p.iso(0.1, 0.9, 5), p.iso(0.4, 0.9, 5)], '#fff4e0', 1.2);
  const butt = p.iso(0.92, 0.62, 0);
  const tip = p.iso(0.62, 0.3, 38);
  const mid = { x: (butt.x + tip.x) / 2 + 4, y: (butt.y + tip.y) / 2 };
  limb(p, butt, mid, tip, WOOD_D, 1.6);
  p.curve(tip, { x: tip.x + 10, y: tip.y + 8 }, { x: tip.x + 8, y: tip.y + 22 }, O, 0.9);
  p.circle(tip.x + 8, tip.y + 24, 2.2, '#ff5a5a');
  sparkle(p, c.x - 18, c.y - 30, 2.4);
};

const glassAquarium: Painter = (p) => {
  const c = p.center;
  p.shadow(c.x, c.y + 1, 24, 10, 0.24);
  p.box(0.22, 0.22, 0.56, 0.56, 12, { top: '#f3d5a0', left: WOOD, right: WOOD_D }, 0);
  p.line([p.iso(0.5, 0.78, 2), p.iso(0.5, 0.78, 10)], O, 0.8);
  p.line([p.iso(0.78, 0.5, 2), p.iso(0.78, 0.5, 10)], O, 0.8);
  p.box(0.25, 0.25, 0.5, 0.5, 22, { top: '#b8f0ff', left: '#5cc2e6', right: '#3aa3cf' }, 12);
  for (const [u, v, h] of [[0.34, 0.36, 12], [0.66, 0.4, 10], [0.42, 0.66, 8]]) {
    const b = p.iso(u, v, 13);
    limb(p, b, { x: b.x - 3, y: b.y - h * 0.5 }, { x: b.x + 1, y: b.y - h }, '#4f9a4a', 1.4);
  }
  fishIn(p, p.iso(0.38, 0.46, 24), 1, '#ff9a4a');
  fishIn(p, p.iso(0.62, 0.6, 18), -1, '#ffd166');
  fishIn(p, p.iso(0.58, 0.36, 28), 1, '#ff8fb1');
  p.circle(p.iso(0.42, 0.56, 31).x, p.iso(0.42, 0.56, 31).y, 1.2, 'rgba(255,255,255,0.85)', null);
  p.circle(p.iso(0.46, 0.52, 35).x, p.iso(0.46, 0.52, 35).y, 0.9, 'rgba(255,255,255,0.85)', null);
  p.box(0.22, 0.22, 0.56, 0.56, 26, { top: 'rgba(255,255,255,0.28)', left: 'rgba(200,240,255,0.26)', right: 'rgba(160,220,245,0.3)' }, 12, '#6b9fb5');
  p.line([p.iso(0.3, 0.78, 30), p.iso(0.3, 0.78, 18)], 'rgba(255,255,255,0.85)', 1.4);
  sparkle(p, c.x + 22, c.y - 36, 2.2);
};

const anglerTrophy: Painter = (p) => {
  const c = p.center;
  p.shadow(c.x, c.y + 1, 22, 10, 0.24);
  p.box(0.2, 0.2, 0.6, 0.6, 7, { top: '#c99866', left: WOOD_D, right: '#6e4426' }, 0);
  p.box(0.3, 0.3, 0.4, 0.4, 3, { top: '#e9c26a', left: '#d9a43f', right: '#a8781f' }, 7);
  p.box(0.24, 0.44, 0.52, 0.06, 40, { top: WOOD_L, left: WOOD, right: WOOD_D }, 10);
  p.poly([p.iso(0.3, 0.5, 16), p.iso(0.7, 0.5, 16), p.iso(0.7, 0.5, 44), p.iso(0.3, 0.5, 44)], '#fff3d6', O, 0.8);
  const fc = p.iso(0.5, 0.5, 30);
  const ang = Math.atan2(16, 32);
  p.save();
  p.ctx.translate(fc.x, fc.y);
  p.ctx.rotate(ang);
  p.poly([{ x: -11, y: 0 }, { x: -19, y: -6 }, { x: -19, y: 6 }], '#ffb92e', O, 0.8);
  p.poly([{ x: -2, y: -6 }, { x: 3, y: -10 }, { x: 5, y: -5.5 }], '#ffb92e', O, 0.8);
  soft(p, 0, 0, 12, 6.5, GOLD);
  p.curve({ x: 5, y: -4 }, { x: 3, y: 0 }, { x: 5, y: 4 }, O, 0.8);
  shine(p, -3, -3, 2.2);
  face(p, 4, -0.5, 1.3);
  p.restore();
  const r = p.iso(0.24, 0.5, 40);
  p.poly([{ x: r.x - 1, y: r.y + 3 }, { x: r.x - 5.5, y: r.y + 12 }, { x: r.x - 2, y: r.y + 12.5 }, { x: r.x + 1.5, y: r.y + 4 }], '#c9402c', O, 0.7);
  p.circle(r.x, r.y, 4.6, '#e0523f');
  p.circle(r.x, r.y, 2, '#ffd6c9', null);
  sparkle(p, c.x + 24, c.y - 40, 2.8);
  sparkle(p, c.x - 26, c.y - 16, 2);
};

const koi = (p: Pen, x: number, y: number, rot: number, body: string, spot: string): void => {
  p.save();
  p.ctx.translate(x, y);
  p.ctx.rotate(rot);
  p.poly([{ x: -6, y: 0 }, { x: -12, y: -4 }, { x: -12, y: 4 }], body, O, 0.8);
  p.ellipse(0, 0, 7.5, 3.6, body, O);
  p.ellipse(1.5, -0.6, 2.4, 1.5, spot, null);
  p.circle(4.6, -1, 0.7, EYE, null);
  p.restore();
};

const lilyPad = (p: Pen, x: number, y: number, r: number, rot: number): void => {
  p.circle(x, y, r, '#86cc6e', O);
  p.arc(x, y, r + 0.2, rot, rot + 0.7, waterGrad(p, x, y, r), null);
};

const koiGardenPond: Painter = (p) => {
  flat(p, () => {
    p.circle(32, 32, 28, STONE, O);
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2;
      p.ellipse(32 + Math.cos(a) * 26, 32 + Math.sin(a) * 26, 5.2, 4.2, i % 2 ? STONE_L : STONE_D, O, 0.8);
    }
    p.circle(32, 32, 22, waterGrad(p, 32, 32, 22), O);
    for (const [r0, a0, a1] of [[14, 0.3, 1.9], [17, 3.4, 4.6]] as const) {
      const pts: Pt[] = [];
      for (let i = 0; i <= 10; i++) {
        const a = a0 + ((a1 - a0) * i) / 10;
        pts.push({ x: 32 + Math.cos(a) * r0, y: 32 + Math.sin(a) * r0 });
      }
      p.line(pts, 'rgba(255,255,255,0.6)', 0.8);
    }
    koi(p, 24, 28, 0.5, '#ff8a4c', '#fff8ee');
    koi(p, 38, 40, 2.5, '#fff8ee', '#ff5a4a');
    koi(p, 22, 45, -0.6, '#ffc24a', '#fff8ee');
    lilyPad(p, 15, 31, 3.8, 4.6);
    lilyPad(p, 20, 20, 3.8, 1.2);
    lilyPad(p, 46, 27, 3.4, 0.2);
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      p.circle(46 + Math.cos(a) * 2.2, 27 + Math.sin(a) * 2.2, 1.5, '#ffb3c9', null);
    }
    p.circle(46, 27, 1.3, '#ffd84a', null);
    // two round stepping stones leading in from the upper-right rim
    for (const [x, y, r] of [[40, 16, 3.2], [35, 23, 3.4]] as const) {
      p.circle(x, y, r, STONE_L, O);
      p.ellipse(x - 0.8, y - 0.9, r * 0.4, r * 0.25, 'rgba(255,255,255,0.7)', null);
    }
  });
};

const goldenFishFountain: Painter = (p) => {
  const c = p.center;
  const { x, y } = c;
  p.shadow(x, y + 1, 26, 12, 0.24);
  p.cylinder(x, y, 24, 7, STONE);
  p.cylinder(x, y - 7, 21, 11, STONE_L);
  p.ellipse(x, y - 18, 18.5, 9.2, '#7ccfee', WATER_D);
  thin(p, 0.8, () => p.ellipse(x, y - 18, 11, 5.2, null, 'rgba(255,255,255,0.7)'));
  p.cylinder(x, y - 16, 5, 20, STONE);
  p.cylinder(x, y - 36, 11, 4, STONE_L);
  p.ellipse(x, y - 40, 9.5, 4.6, '#7ccfee', WATER_D);
  limb(p, { x, y: y - 42 }, { x: x + 2, y: y - 54 }, { x: x + 8, y: y - 57 }, WATER_D, 2.2);
  p.curve({ x, y: y - 42 }, { x: x + 2, y: y - 54 }, { x: x + 8, y: y - 57 }, '#ffffff', 0.8);
  limb(p, { x, y: y - 42 }, { x: x - 4, y: y - 50 }, { x: x - 8, y: y - 44 }, WATER_D, 1.8);
  p.circle(x + 3, y - 52, 1.2, 'rgba(255,255,255,0.9)', null);
  p.circle(x - 6, y - 50, 1.1, 'rgba(255,255,255,0.9)', null);
  p.save();
  p.ctx.translate(x - 1, y - 52);
  p.ctx.rotate(-0.55);
  p.poly([{ x: -10, y: 0 }, { x: -19, y: -6 }, { x: -17, y: 0 }, { x: -19, y: 6 }], GOLD_D, O, 0.9);
  soft(p, 0, 0, 11, 6.5, GOLD);
  p.poly([{ x: -2, y: -6 }, { x: 3, y: -10 }, { x: 5, y: -5.5 }], GOLD_D, O, 0.8);
  shine(p, 3, -3, 2);
  face(p, 4, 0.5, 1.4);
  p.restore();
  sparkle(p, x + 20, y - 62, 2.6);
  sparkle(p, x - 20, y - 36, 2);
};

const bugNetStand: Painter = (p) => {
  const c = p.center;
  const { x, y } = c;
  p.shadow(x, y + 1, 22, 10, 0.24);
  p.box(0.22, 0.22, 0.56, 0.56, 6, { top: '#f0c99a', left: WOOD_D, right: '#6e4426' }, 0);
  p.box(0.44, 0.44, 0.12, 0.12, 40, { top: '#f5d7a8', left: WOOD, right: WOOD_D }, 6);
  // left net: handle, bag, then hoop on top
  limb(p, { x: x - 6, y: y - 4 }, { x: x - 12, y: y - 24 }, { x: x - 17, y: y - 42 }, WOOD, 2.2);
  path(p, (cx) => {
    cx.moveTo(x - 25, y - 46);
    cx.quadraticCurveTo(x - 17, y - 30, x - 9, y - 46);
    cx.closePath();
  }, '#f3f9fb', O, 0.9);
  p.line([{ x: x - 21, y: y - 45 }, { x: x - 17, y: y - 33 }], '#b9d6e0', 0.6);
  p.line([{ x: x - 13, y: y - 45 }, { x: x - 17, y: y - 33 }], '#b9d6e0', 0.6);
  thin(p, 2.6, () => p.ellipse(x - 17, y - 46, 8, 5.5, null, O));
  thin(p, 1.2, () => p.ellipse(x - 17, y - 46, 8, 5.5, null, '#e0b070'));
  // right net: shorter
  limb(p, { x: x + 6, y: y - 2 }, { x: x + 9, y: y - 16 }, { x: x + 12, y: y - 30 }, WOOD, 2);
  path(p, (cx) => {
    cx.moveTo(x + 6, y - 34);
    cx.quadraticCurveTo(x + 12, y - 22, x + 18, y - 34);
    cx.closePath();
  }, '#f3f9fb', O, 0.9);
  thin(p, 2.2, () => p.ellipse(x + 12, y - 34, 6.4, 4.4, null, O));
  thin(p, 1, () => p.ellipse(x + 12, y - 34, 6.4, 4.4, null, '#e0b070'));
  // glass jar with a firefly inside
  p.cylinder(x + 15, y + 2, 6.6, 10, '#c5ecff');
  p.ellipse(x + 15, y - 3, 3, 2, '#9ad65c');
  p.glow(x + 15, y - 6, 6, '#ffe56b', 0.8);
  p.circle(x + 15, y - 6, 1.2, '#ffe56b', null);
  p.cylinder(x + 15, y - 8, 7.2, 3.4, '#7fc96b');
};

const bugTerrarium: Painter = (p) => {
  const c = p.center;
  p.shadow(c.x, c.y + 1, 23, 10, 0.24);
  p.box(0.2, 0.2, 0.6, 0.6, 12, { top: '#f3d5a0', left: WOOD, right: WOOD_D }, 0);
  p.box(0.25, 0.25, 0.5, 0.5, 4, { top: '#9a6d45', left: '#6b4a2f', right: '#533a24' }, 12);
  const sprout = p.iso(0.36, 0.4, 16);
  leafAt(p, sprout.x, sprout.y, 7, UP - 0.9, 2.4, LEAF);
  leafAt(p, sprout.x, sprout.y, 7, UP + 0.9, 2.4, LEAF);
  leafAt(p, sprout.x, sprout.y, 8, UP, 2.4, '#8fd06a');
  const shroom = p.iso(0.66, 0.36, 16);
  mushroom(p, shroom.x, shroom.y, 3.4);
  const fern = p.iso(0.5, 0.72, 16);
  leafAt(p, fern.x, fern.y, 6, UP - 1.1, 2, '#6fbf4f');
  leafAt(p, fern.x, fern.y, 6, UP + 1.1, 2, '#6fbf4f');
  p.ellipse(fern.x + 1, fern.y + 1, 3, 1.6, '#8fd06a');
  const beetle = p.iso(0.66, 0.66, 18);
  soft(p, beetle.x, beetle.y, 4.2, 3, '#35b983');
  shine(p, beetle.x - 1.4, beetle.y - 1.2, 1);
  p.box(0.2, 0.2, 0.6, 0.6, 26, { top: 'rgba(255,255,255,0.3)', left: 'rgba(200,240,255,0.3)', right: 'rgba(160,220,245,0.32)' }, 16, '#7fa7b5');
  const k = p.iso(0.5, 0.5, 42);
  p.circle(k.x, k.y, 2.6, WOOD_D);
  sparkle(p, c.x + 22, c.y - 30, 2.2);
};

const butterflyHouse: Painter = (p) => {
  const c = p.center;
  const white = '#fffdf6';
  const mint = 'rgba(178,240,214,0.5)';
  const mesh = 'rgba(255,255,255,0.85)';
  p.shadow(c.x, c.y + 2, 40, 18, 0.24);
  // white-painted plinth and a grassy floor
  p.box(0.12, 0.12, 1.76, 1.76, 4, { top: white, left: '#e9e0cc', right: '#cfc4aa' }, 0);
  p.diamond(0.22, 0.22, 1.56, 1.56, '#c8f0b8', null, 4);
  for (const [u, v, col] of [[0.6, 0.7, '#ff8fb1'], [1.2, 0.5, '#fff3a0'], [0.9, 1.3, '#c9a6ff'], [1.5, 1.2, '#ff8fb1']] as const) {
    const f = p.iso(u, v, 7);
    leafAt(p, f.x, f.y + 2, 3.6, UP - 0.4, 1.4, LEAF);
    p.flower(f.x, f.y, 3, col);
  }
  // white corner post behind, then the mint mesh walls
  p.box(0.16, 0.16, 0.08, 0.08, 36, white, 4);
  p.box(0.22, 0.22, 1.56, 1.56, 36, { top: 'rgba(240,255,250,0.25)', left: mint, right: 'rgba(150,226,196,0.5)' }, 4);
  for (const u of [0.6, 1.0, 1.4]) p.line([p.iso(u, 1.78, 4), p.iso(u, 1.78, 40)], mesh, 0.8);
  for (const z of [16, 28]) p.line([p.iso(0.22, 1.78, z), p.iso(1.78, 1.78, z)], mesh, 0.8);
  for (const v of [0.4, 1.5]) p.line([p.iso(1.78, v, 4), p.iso(1.78, v, 40)], mesh, 0.8);
  for (const z of [16, 28]) p.line([p.iso(1.78, 0.22, z), p.iso(1.78, 1.78, z)], mesh, 0.8);
  // white frame rails along the top of the walls
  const rail = (a: Pt, b: Pt) => limb(p, a, { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, b, white, 1.6);
  rail(p.iso(0.22, 1.78, 40), p.iso(1.78, 1.78, 40));
  rail(p.iso(1.78, 0.22, 40), p.iso(1.78, 1.78, 40));
  // a little door with a white frame on the right wall
  p.poly([p.iso(1.78, 0.72, 3), p.iso(1.78, 1.18, 3), p.iso(1.78, 1.18, 29), p.iso(1.78, 0.72, 29)], white, O, 0.9);
  p.poly([p.iso(1.78, 0.78, 4), p.iso(1.78, 1.12, 4), p.iso(1.78, 1.12, 27), p.iso(1.78, 0.78, 27)], WOOD, O, 0.9);
  p.line([p.iso(1.78, 0.95, 4), p.iso(1.78, 0.95, 27)], WOOD_D, 0.8);
  const knob = p.iso(1.78, 1.05, 15);
  p.circle(knob.x, knob.y, 0.9, '#ffd84a');
  // white corner posts in front
  for (const [u, v] of [[0.16, 1.72], [1.72, 0.16], [1.72, 1.72]] as const) p.box(u, v, 0.1, 0.1, 37, white, 4);
  // flower box along the front-left base, with blooms spilling over
  p.box(0.3, 1.8, 1.36, 0.16, 6, { top: '#c98a55', left: '#a46b3c', right: '#7d4f2a' }, 4);
  for (const [u, col] of [[0.5, '#ff8fb1'], [0.85, '#ffd84a'], [1.2, '#c9a6ff'], [1.55, '#ff8fb1']] as const) {
    const f = p.iso(u, 1.88, 11);
    leafAt(p, f.x, f.y + 1, 4, UP - 0.7, 1.6, LEAF);
    leafAt(p, f.x, f.y + 1, 4, UP + 0.7, 1.6, LEAF);
    p.flower(f.x, f.y, 3, col);
  }
  // scalloped pink roof with a little finial
  p.hipRoof(0.2, 0.2, 1.6, 1.6, 40, 20, '#ffb8cc', 0.12);
  for (let i = 0; i < 6; i++) {
    const u = 0.08 + ((i + 0.5) / 6) * 1.84;
    const a = p.iso(u, 1.92, 40);
    p.circle(a.x, a.y + 2, 2.8, '#ffb8cc');
    const b = p.iso(1.92, u, 40);
    p.circle(b.x, b.y + 2, 2.8, '#ffb8cc');
  }
  const peak = p.iso(1, 1, 60);
  p.line([peak, { x: peak.x, y: peak.y - 6 }], O, 2);
  p.circle(peak.x, peak.y - 8, 2.8, '#ffd84a');
  // butterflies fluttering outside the pavilion
  const bf = (x: number, y: number, s: number, col: string) => {
    p.ellipse(x - s * 0.9, y - s * 0.5, s * 0.95, s * 0.7, col, O, -0.4);
    p.ellipse(x + s * 0.9, y - s * 0.5, s * 0.95, s * 0.7, col, O, 0.4);
    p.ellipse(x - s * 0.7, y + s * 0.45, s * 0.6, s * 0.5, shade(col, 0.15), O, 0.3);
    p.ellipse(x + s * 0.7, y + s * 0.45, s * 0.6, s * 0.5, shade(col, 0.15), O, -0.3);
    p.ellipse(x, y, s * 0.28, s * 0.85, O, null);
  };
  const b1 = p.iso(2.3, 0.7, 30);
  bf(b1.x, b1.y, 4.2, '#ff8fb1');
  const b2 = p.iso(0.9, 2.4, 24);
  bf(b2.x, b2.y, 4.2, '#7fb8ff');
  const b3 = p.iso(2.5, 2.3, 46);
  bf(b3.x, b3.y, 3.8, '#ffd23f');
  const b4 = p.iso(-0.3, 1, 36);
  bf(b4.x, b4.y, 3.6, '#c9a6ff');
};

const goldenBeetleStatue: Painter = (p) => {
  const c = p.center;
  const { x, y } = c;
  p.shadow(x, y + 1, 22, 10, 0.24);
  p.glow(x, y - 44, 24, '#ffe27a', 0.35);
  p.box(0.2, 0.2, 0.6, 0.6, 8, { top: '#efeadd', left: STONE_L, right: STONE }, 0);
  p.box(0.32, 0.32, 0.36, 0.36, 20, { top: STONE_L, left: STONE, right: STONE_D }, 8);
  p.box(0.24, 0.24, 0.52, 0.52, 6, { top: '#efeadd', left: STONE_L, right: STONE }, 28);
  limb(p, { x: x - 4, y: y - 56 }, { x: x - 10, y: y - 64 }, { x: x - 16, y: y - 70 }, GOLD_D, 2.4);
  limb(p, { x: x + 4, y: y - 56 }, { x: x + 10, y: y - 64 }, { x: x + 16, y: y - 70 }, GOLD_D, 2.4);
  p.poly([{ x: x - 12, y: y - 66 }, { x: x - 17, y: y - 61 }, { x: x - 13, y: y - 62 }], GOLD, O, 0.7);
  p.poly([{ x: x + 12, y: y - 66 }, { x: x + 17, y: y - 61 }, { x: x + 13, y: y - 62 }], GOLD, O, 0.7);
  soft(p, x, y - 58, 6, 4.2, GOLD);
  soft(p, x, y - 45, 13, 11, GOLD);
  shine(p, x - 6, y - 52, 3);
  face(p, x, y - 44, 2.6);
  sparkle(p, x + 20, y - 64, 3);
  sparkle(p, x - 22, y - 34, 2.2);
};

/** Fallback for a keepsake added without bespoke art: a little sparkly box. */
const fallbackDeco: Painter = (p) => {
  const c = p.center;
  p.shadow(c.x, c.y + 1, 14, 6, 0.28);
  p.box(0.3, 0.3, 0.4, 0.4, 16, '#e9b872', 0);
  sparkle(p, c.x + 12, c.y - 24, 2.4);
};

const ART: Record<string, { h: number; paint: Painter }> = {
  fishing_bench: { h: 40, paint: fishingBench },
  glass_aquarium: { h: 44, paint: glassAquarium },
  angler_trophy: { h: 62, paint: anglerTrophy },
  koi_garden_pond: { h: 26, paint: koiGardenPond },
  golden_fish_statue: { h: 74, paint: goldenFishFountain },
  bug_net_stand: { h: 60, paint: bugNetStand },
  bug_terrarium: { h: 56, paint: bugTerrarium },
  butterfly_house: { h: 56, paint: butterflyHouse },
  golden_beetle_statue: { h: 70, paint: goldenBeetleStatue },
};

export const sprites: SpriteSpec[] = NATURE_DECORATIONS.map((d) => {
  const art = ART[d.id] ?? { h: 40, paint: fallbackDeco };
  return { key: `deco:${d.id}`, fw: d.w, fh: d.h, height: art.h, paint: art.paint };
});
