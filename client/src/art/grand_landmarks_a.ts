// Grand landmarks, set A: the Grand Greenhouse and the Botanical Conservatory,
// the two 4x4 grand projects. The greenhouse is a Victorian glasshouse on a
// pink-brick base: white frames, a peaked glass roof with a propped-open vent,
// a flower-wreathed door and a flower bed out front. The conservatory is a
// round glass rotunda with mint and white ironwork, a ribbed dome, a lantern
// cupola with a gold finial and pink pennant, palms and blossoms inside, stone
// steps up to the doors and topiaries in planters. Both are built from the
// ground up so the scaffolding crop shows them rising. Same house style as
// feedmill.ts and nursery.ts: warm brown OUTLINE, top-left light, soft pastel
// fills and glossy white highlights.
import { type Pen, type Pt, type SpriteSpec, mix, shade } from './kit';

type Fill = string | CanvasGradient | null;
type Ctx = CanvasRenderingContext2D;

const WHITE = '#fffdf6';
const CREAM_STONE = '#fff1dc';
const STONE_D = '#d8c3a5';
const STEP_TOP = '#fffaf2';
const PINK_BRICK = '#f5a7a0';
const PINK_BRICK_D = '#d9827e';
const MINT = '#a8e6cf';
const MINT_D = '#7fcdb0';
const MINT_L = '#dbf8ec';
const AQUA_L = '#f2feff';
const AQUA = '#c4f2f9';
const AQUA_D = '#94dce9';
const GLASS_T = 'rgba(205,247,253,0.34)';
const TERRA = '#e8834f';
const WOOD = '#d9a066';
const WOOD_D = '#9a6638';
const TRUNK = '#b98a5a';
const LEAF = '#5cbf4f';
const LEAF_D = '#3f9a3c';
const LEAF_L = '#8ee07a';
const PINK = '#ffb3cf';
const BLUSH = '#ff8fb1';
const CORAL = '#ff8f7a';
const LILAC = '#c9b8f5';
const YELLOW = '#ffe066';
const GOLD = '#f4c24a';
const GOLD_D = '#c98b1f';
const PENNANT = '#ff7eb3';
const SOIL = '#8a5e3c';
const BLUE = '#a9dcf5';
const DROP = '#a6e4f7';
const STAR = '#ffd84a';

const deg = (d: number): number => (d * Math.PI) / 180;
const pt = (x: number, y: number): Pt => ({ x, y });

// ---------------------------------------------------------------------------
// Helpers

/** A wall plane we can paint onto: s runs along the wall, z is height. */
interface Face {
  pt: (s: number, z: number) => Pt;
}

/** The front-left wall: v is fixed and s runs along u. */
const faceL = (p: Pen, v: number): Face => ({ pt: (s, z) => p.iso(s, v, z) });
/** The gable (bottom-right) wall: u is fixed and s runs along v. */
const faceR = (p: Pen, u: number): Face => ({ pt: (s, z) => p.iso(u, s, z) });

function quad(p: Pen, f: Face, s0: number, s1: number, z0: number, z1: number, fill: Fill, stroke: string | null = p.outline): void {
  p.poly([f.pt(s0, z0), f.pt(s1, z0), f.pt(s1, z1), f.pt(s0, z1)], fill, stroke);
}

/** A line with an outline underneath (rails, rafters, mullions). */
function thick(p: Pen, pts: Pt[], color: string, w: number): void {
  p.line(pts, p.outline, w + 1.8);
  p.line(pts, color, w);
}

/** Traces a closed polygon on the context (no fill or stroke). */
function trace(c: Ctx, pts: Pt[]): void {
  c.beginPath();
  c.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) c.lineTo(pts[i].x, pts[i].y);
  c.closePath();
}

/** Diagonal glossy streaks across a glass shape, clipped to it. */
function glint(p: Pen, pts: Pt[], alpha = 0.6): void {
  const c = p.ctx;
  const xs = pts.map((q) => q.x);
  const ys = pts.map((q) => q.y);
  const x0 = Math.min(...xs);
  const x1 = Math.max(...xs);
  const y0 = Math.min(...ys);
  const y1 = Math.max(...ys);
  const w = x1 - x0;
  const h = y1 - y0;
  c.save();
  trace(c, pts);
  c.clip();
  c.strokeStyle = `rgba(255,255,255,${alpha})`;
  c.lineWidth = Math.max(1.2, w * 0.1);
  c.lineCap = 'butt';
  for (const k of [0.25, 0.6]) {
    c.beginPath();
    c.moveTo(x0 + w * k + h * 0.22, y0 - 2);
    c.lineTo(x0 + w * k - h * 0.22, y1 + 2);
    c.stroke();
  }
  c.restore();
}

/** A four-point twinkle centred at (x, y). */
function sparkle(p: Pen, x: number, y: number, s: number, color: string): void {
  const c = p.ctx;
  c.beginPath();
  c.moveTo(x, y - s);
  c.quadraticCurveTo(x, y, x + s, y);
  c.quadraticCurveTo(x, y, x, y + s);
  c.quadraticCurveTo(x, y, x - s, y);
  c.quadraticCurveTo(x, y, x, y - s);
  c.fillStyle = color;
  c.fill();
  c.strokeStyle = p.outline;
  c.lineWidth = 0.6;
  c.stroke();
}

/** Brick courses and staggered joints on a wall face, up to zTop. */
function bricks(p: Pen, f: Face, s0: number, s1: number, zTop: number): void {
  for (let z = 6; z < zTop; z += 6) p.line([f.pt(s0, z), f.pt(s1, z)], PINK_BRICK_D, 0.8);
  let row = 0;
  for (let z = 0; z < zTop; z += 6, row++) {
    for (let s = s0 + 0.25 + (row % 2) * 0.125; s < s1 - 0.1; s += 0.25) {
      p.line([f.pt(s, z), f.pt(s, Math.min(z + 6, zTop))], PINK_BRICK_D, 0.8);
    }
  }
}

/** A potted plant standing with its pot's bottom centre at (x, y). */
function potPlant(p: Pen, x: number, y: number, r: number, bloom: string, seed: number): void {
  const rx = r * 0.8;
  const ht = r * 1.1;
  p.cylinder(x, y, rx, ht, TERRA);
  p.foliage(x, y - ht - r * 0.45, r, LEAF, seed, 6);
  p.flower(x - r * 0.45, y - ht - r * 0.9, Math.max(1.8, r * 0.34), bloom);
  p.flower(x + r * 0.5, y - ht - r * 0.5, Math.max(1.6, r * 0.3), bloom);
}

/** A watering can, with its base centre at (x, y). */
function wateringCan(p: Pen, x: number, y: number): void {
  p.shadow(x, y + 1, 10, 4.5, 0.22);
  // handle over the back
  p.curve(pt(x + 5, y - 15), pt(x + 16, y - 26), pt(x + 6, y - 5), p.outline, 4.2);
  p.curve(pt(x + 5, y - 15), pt(x + 16, y - 26), pt(x + 6, y - 5), BLUE, 1.8);
  // spout, rising from the lower left, with a rose head
  p.poly([pt(x - 6, y - 6), pt(x - 17, y - 15), pt(x - 14.5, y - 18.5), pt(x - 4, y - 10)], shade(BLUE, -0.04));
  p.ellipse(x - 16, y - 17, 3, 2.2, shade(BLUE, -0.2), p.outline, -0.6);
  // body
  p.roundRect(x - 8, y - 15, 16, 13, 5, p.vgrad(y - 15, y - 2, '#d6f1ff', BLUE));
  p.ellipse(x, y - 15, 6, 2.2, shade(BLUE, 0.2), p.outline);
  p.heart(x + 0.5, y - 7, 2.4, PINK, null);
  p.ellipse(x - 4, y - 9, 1.5, 3.5, 'rgba(255,255,255,0.6)', null);
  // drops from the rose
  p.circle(x - 23, y - 9, 1.3, DROP, null);
  p.circle(x - 25, y - 4, 0.9, DROP, null);
}

// ---------------------------------------------------------------------------
// 1. The Grand Greenhouse (deco:grand_greenhouse, 4x4)

function grandGreenhouse(p: Pen): void {
  const U0 = 0.5;
  const U1 = 3.5;
  const V0 = 0.9;
  const V1 = 3.1;
  const MV = 2.0; // ridge line
  const BASE = 20; // top of the brick base
  const ZW = 64; // eaves
  const ZR = 124; // ridge
  const O = 0.12; // roof overhang
  const P = (u: number, v: number, z: number): Pt => p.iso(u, v, z);
  const fl = faceL(p, V1); // front-left wall runs along u
  const gr = faceR(p, U1); // gable wall runs along v
  const c = p.center;
  p.shadow(c.x, c.y + 6, 92, 40, 0.24);

  // 1. pink-brick base with a cream coping
  p.box(U0, V0, U1 - U0, V1 - V0, BASE, { top: CREAM_STONE, left: PINK_BRICK, right: PINK_BRICK_D });
  bricks(p, fl, U0, U1, BASE);
  bricks(p, gr, V0, V1, BASE);

  // 2. the room behind the glass: a mint interior, a potting bench and plants
  quad(p, fl, U0, U1, BASE, ZW, p.vgrad(P(0, V1, ZW).y, P(0, V1, BASE).y, '#f5fffb', '#b8ead6'), null);
  quad(p, gr, V0, V1, BASE, ZW, p.vgrad(P(U1, V1, ZW).y, P(U1, V1, BASE).y, '#f5fffb', '#b8ead6'), null);
  quad(p, fl, U0, U1, 27, 31, WOOD);
  quad(p, gr, V0, V1, 27, 31, WOOD);
  // seedlings in trays along the bench
  for (let s = U0 + 0.2; s < U1; s += 0.3) {
    const q = fl.pt(s, 31);
    p.ball(q.x, q.y - 3, 1.7, LEAF);
  }
  const benchF: [number, string][] = [
    [0.8, PINK],
    [1.22, WHITE],
    [2.8, LILAC],
    [3.2, CORAL],
  ];
  benchF.forEach(([s, bloom], i) => {
    const q = fl.pt(s, 31);
    potPlant(p, q.x, q.y, 6.5, bloom, 11 + i);
  });
  for (const [v, bloom] of [
    [1.3, LILAC],
    [2.7, PINK],
  ] as [number, string][]) {
    const q = gr.pt(v, 31);
    potPlant(p, q.x, q.y, 6.5, bloom, 31 + Math.round(v * 10));
  }
  // vines hanging from the top rail
  for (const s of [0.78, 2.84]) {
    p.line([fl.pt(s, ZW - 4), fl.pt(s, 42)], LEAF_D, 1.2);
    for (const z of [42, 47, 52]) {
      const q = fl.pt(s + (z % 2) * 0.1, z);
      p.ball(q.x, q.y, 2.6, LEAF);
    }
    const f = fl.pt(s, 40);
    p.flower(f.x, f.y, 2.4, PINK);
  }

  // 3. glass: a pane per bay, each with its glossy streaks
  const pane = (f: Face, s0: number, s1: number, z0: number, z1: number): void => {
    const q = [f.pt(s0, z0), f.pt(s1, z0), f.pt(s1, z1), f.pt(s0, z1)];
    p.poly(q, GLASS_T, null);
    glint(p, q);
  };
  for (const [s0, s1] of [
    [U0, 1.0],
    [1.0, 1.5],
    [2.5, 3.0],
    [3.0, U1],
  ]) {
    pane(fl, s0 + 0.06, s1 - 0.06, BASE + 3, 35);
    pane(fl, s0 + 0.06, s1 - 0.06, 40, ZW - 3);
  }
  pane(fl, 1.56, 2.44, 58, ZW - 3); // fanlight over the door
  for (const [s0, s1] of [
    [V0, 1.6],
    [1.6, 2.4],
    [2.4, V1],
  ]) {
    pane(gr, s0 + 0.06, s1 - 0.06, BASE + 3, 35);
    pane(gr, s0 + 0.06, s1 - 0.06, 40, ZW - 3);
  }

  // gable triangle, glazed, with a rose window
  const A = P(U1, V0, ZW);
  const B = P(U1, V1, ZW);
  const C = P(U1, MV, ZR);
  const tri = [A, B, C];
  p.poly(tri, p.vgrad(C.y, A.y, '#f7fffd', '#bfeedd'), null);
  p.poly(tri, GLASS_T, null);
  glint(p, tri, 0.7);
  const rw = P(U1, MV, 88);
  p.circle(rw.x, rw.y, 9, WHITE);
  p.circle(rw.x, rw.y, 7, AQUA_L, null);
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2;
    p.line([rw, pt(rw.x + Math.cos(a) * 7, rw.y + Math.sin(a) * 7)], WHITE, 1);
  }
  p.heart(rw.x, rw.y, 2.2, PINK, null);

  // 4. white frames: posts, transoms, rails and the door
  for (const s of [U0, 1.0, 1.5, 2.5, 3.0, U1]) quad(p, fl, s - 0.06, s + 0.06, BASE, ZW, WHITE);
  quad(p, fl, U0, 1.5, 36, 39, WHITE);
  quad(p, fl, 2.5, U1, 36, 39, WHITE);
  quad(p, fl, U0, U1, ZW - 3, ZW, WHITE);
  quad(p, fl, U0, U1, BASE, BASE + 3, WHITE);
  for (const s of [V0, 1.6, 2.4, V1]) quad(p, gr, s - 0.06, s + 0.06, BASE, ZW, WHITE);
  quad(p, gr, V0, V1, 36, 39, WHITE);
  quad(p, gr, V0, V1, ZW - 3, ZW, WHITE);
  quad(p, gr, V0, V1, BASE, BASE + 3, WHITE);

  // mint door with a little window and a wreath of flowers round it
  quad(p, fl, 1.5, 2.5, BASE, 54, MINT);
  const dw = [fl.pt(1.66, 34), fl.pt(2.34, 34), fl.pt(2.34, 46), fl.pt(1.66, 46)];
  p.poly(dw, AQUA_L, WHITE, 1.4);
  glint(p, dw, 0.7);
  thick(p, [fl.pt(2.0, 34), fl.pt(2.0, 46)], WHITE, 1.2);
  const wreathCols = [PINK, WHITE, LILAC, YELLOW];
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const q = fl.pt(2.0 + 0.4 * Math.cos(a), 40 + 10 * Math.sin(a));
    p.ball(q.x + 0.5, q.y + 0.5, 2.0, LEAF);
    const b = (i / 12) * Math.PI * 2 + Math.PI / 12;
    const r = fl.pt(2.0 + 0.4 * Math.cos(b), 40 + 10 * Math.sin(b));
    p.flower(r.x, r.y, 2.4, wreathCols[i % wreathCols.length]);
  }
  const knob = fl.pt(2.4, 26);
  p.circle(knob.x, knob.y, 1.4, GOLD);

  // 5. roof: a peaked glass roof with its ridge along the long axis
  const back = [P(U0 - O, V0 - O, ZW), P(U1 + O, V0 - O, ZW), P(U1 + O, MV, ZR), P(U0 - O, MV, ZR)];
  const front = [P(U0 - O, MV, ZR), P(U1 + O, MV, ZR), P(U1 + O, V1 + O, ZW), P(U0 - O, V1 + O, ZW)];
  p.poly(back, p.vgrad(P(0, MV, ZR).y, P(0, V0, ZW).y, AQUA, AQUA_D));
  glint(p, back, 0.5);
  p.poly(front, p.vgrad(P(0, MV, ZR).y, P(0, V1, ZW).y, AQUA_L, AQUA));
  glint(p, front, 0.7);
  for (const u of [0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 3.5]) {
    thick(p, [P(u, V0 - O, ZW), P(u, MV, ZR)], WHITE, 2);
    thick(p, [P(u, MV, ZR), P(u, V1 + O, ZW)], WHITE, 2);
  }
  const midS = (MV + V1 + O) / 2;
  const midZ = (ZR + ZW) / 2;
  thick(p, [P(U0 - O, midS, midZ), P(U1 + O, midS, midZ)], WHITE, 1.6);
  thick(p, [P(U0 - O, MV, ZR), P(U1 + O, MV, ZR)], WHITE, 3.6);
  for (const e of [U0 - O, U1 + O]) {
    const q = P(e, MV, ZR + 3);
    p.ball(q.x, q.y, 3.4, GOLD);
  }

  // a small roof vent, propped open: its sash hinged on the top edge
  const sl = (u: number, t: number): Pt => P(u, MV + (V1 + O - MV) * t, ZR - (ZR - ZW) * t);
  const vt0 = sl(2.42, 0.3);
  const vt1 = sl(2.86, 0.3);
  const vb0 = sl(2.42, 0.6);
  const vb1 = sl(2.86, 0.6);
  p.poly([vt0, vt1, vb1, vb0], WHITE);
  p.poly([sl(2.48, 0.34), sl(2.8, 0.34), sl(2.8, 0.56), sl(2.48, 0.56)], AQUA_D, null);
  const lift = pt(-9, -3);
  const sash = [vt0, vt1, pt(vb1.x + lift.x, vb1.y + lift.y), pt(vb0.x + lift.x, vb0.y + lift.y)];
  p.poly(sash, WHITE);
  p.poly([sl(2.5, 0.37), sl(2.78, 0.37), pt(vb1.x + lift.x - 3, vb1.y + lift.y + 1.5), pt(vb0.x + lift.x - 3, vb0.y + lift.y + 1.5)], AQUA_D, null);
  thick(p, [pt(vb0.x + lift.x, vb0.y + lift.y), sl(2.5, 0.8)], WOOD_D, 1.2);

  // weathervane with a golden star on the ridge
  const wv = P(2.0, MV, ZR);
  p.line([wv, pt(wv.x, wv.y - 16)], GOLD_D, 1.4);
  p.line([pt(wv.x - 7, wv.y - 17), pt(wv.x + 7, wv.y - 17)], GOLD, 1.2);
  p.star(wv.x, wv.y - 24, 3.8, STAR);
  p.circle(wv.x, wv.y - 16, 2, GOLD);

  // 6. outside: a flower bed along the front, a bed by the gable, pots and a watering can
  p.poly([P(0.3, 3.22, 0), P(3.7, 3.22, 0), P(3.7, 3.66, 0), P(0.3, 3.66, 0)], SOIL, null);
  for (let i = 0; i < 9; i++) {
    const q = P(0.45 + i * 0.4, 3.26, 6);
    p.foliage(q.x, q.y, 5.2, i % 2 ? LEAF : LEAF_L, 40 + i, 6);
  }
  const bloomCols = [PINK, WHITE, LILAC, YELLOW, CORAL];
  for (let i = 0; i < 11; i++) {
    const q = P(0.55 + i * 0.3, 3.5 + (i % 2) * 0.08, 5);
    p.flower(q.x, q.y, 2.8, bloomCols[i % bloomCols.length]);
  }
  thick(p, [P(0.3, 3.66, 2.5), P(3.7, 3.66, 2.5)], CREAM_STONE, 2.6);

  p.poly([P(3.6, 1.0, 0), P(3.98, 1.0, 0), P(3.98, 2.9, 0), P(3.6, 2.9, 0)], SOIL, null);
  for (let v = 1.15; v < 2.9; v += 0.42) {
    const q = P(3.8, v, 4);
    p.foliage(q.x, q.y, 4.6, LEAF, Math.round(v * 100), 6);
    const f = P(3.84, v + 0.1, 8);
    p.flower(f.x, f.y, 2.6, bloomCols[Math.round(v * 3) % bloomCols.length]);
  }

  // stoop in front of the door
  p.box(1.42, 3.1, 1.16, 0.42, 4, { top: STEP_TOP, left: CREAM_STONE, right: STONE_D });
  // flanking flower pots
  const pa = P(1.0, 3.56, 0);
  potPlant(p, pa.x, pa.y, 9, PINK, 21);
  const pb = P(3.0, 3.56, 0);
  potPlant(p, pb.x, pb.y, 9, LILAC, 22);

  const can = P(3.95, 3.2, 0);
  wateringCan(p, can.x, can.y);

  sparkle(p, 58, 110, 2.8, '#ffffff');
  sparkle(p, 204, 96, 2.4, '#fff1a8');
  sparkle(p, 226, 176, 2.2, '#ffffff');
}

// ---------------------------------------------------------------------------
// 2. The Botanical Conservatory (deco:botanical_conservatory, 4x4)
//
// A central domed rotunda on a short drum ring, with two lower glass halls
// running out along the two iso axes to the left and right corners. The halls
// have arched glass roofs. Every plant is clipped to its glass shape, so
// nothing pokes through the walls.

const HALL_KNEE = { top: '#fff7ec', left: CREAM_STONE, right: STONE_D };

/** Convex hull (monotone chain) of a set of points. */
function hull(pts: Pt[]): Pt[] {
  const s = [...pts].sort((a, b) => a.x - b.x || a.y - b.y);
  const cross = (o: Pt, a: Pt, b: Pt): number => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
  const lower: Pt[] = [];
  for (const q of s) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], q) <= 0) lower.pop();
    lower.push(q);
  }
  const upper: Pt[] = [];
  for (let i = s.length - 1; i >= 0; i--) {
    const q = s[i];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], q) <= 0) upper.pop();
    upper.push(q);
  }
  upper.pop();
  lower.pop();
  return lower.concat(upper);
}

/** Runs fn with the union of the given closed shapes as its clip region. */
function clipTo(p: Pen, shapes: Pt[][], fn: () => void): void {
  const c = p.ctx;
  c.save();
  c.beginPath();
  for (const s of shapes) {
    c.moveTo(s[0].x, s[0].y);
    for (let i = 1; i < s.length; i++) c.lineTo(s[i].x, s[i].y);
    c.closePath();
  }
  c.clip();
  fn();
  c.restore();
}

/** A horizontal gradient: lit on the left, a little darker on the right. */
function hgrad(p: Pen, x0: number, x1: number, left: string, right: string): CanvasGradient {
  const g = p.ctx.createLinearGradient(x0, 0, x1, 0);
  g.addColorStop(0, left);
  g.addColorStop(1, right);
  return g;
}

/** A palm frond: a tapering leaf on a gently arched midrib, from (sx, sy). */
function frond(p: Pen, sx: number, sy: number, ang: number, len: number, droop: number, col: string): void {
  const S = pt(sx, sy);
  const E = pt(sx + Math.cos(ang) * len, sy + Math.sin(ang) * len + droop);
  const C = pt(sx + Math.cos(ang) * len * 0.5, sy + Math.sin(ang) * len * 0.5 - len * 0.3);
  const at = (t: number): Pt => {
    const a = (1 - t) * (1 - t);
    const b = 2 * (1 - t) * t;
    const cc = t * t;
    return pt(a * S.x + b * C.x + cc * E.x, a * S.y + b * C.y + cc * E.y);
  };
  const W = len * 0.12;
  const left: Pt[] = [];
  const right: Pt[] = [];
  for (let i = 0; i <= 10; i++) {
    const t = i / 10;
    const q = at(t);
    const d0 = at(Math.max(0, t - 0.02));
    const d1 = at(Math.min(1, t + 0.02));
    const tx = d1.x - d0.x;
    const ty = d1.y - d0.y;
    const L = Math.hypot(tx, ty) || 1;
    const w = W * Math.pow(Math.sin(Math.PI * t), 0.7) * (1 - 0.3 * t);
    left.push(pt(q.x - (ty / L) * w, q.y + (tx / L) * w));
    right.push(pt(q.x + (ty / L) * w, q.y - (tx / L) * w));
  }
  p.poly([...left, ...right.reverse()], col, p.outline, 0.8);
  p.line([at(0.04), at(0.5), at(0.9)], shade(col, 0.3), 0.7);
}

/** A palm: a curved trunk rising from base to a crown of fronds. s scales it. */
function palm(p: Pen, base: Pt, crown: Pt, s: number): void {
  const mx = (base.x + crown.x) / 2 + 5 * s;
  const my = (base.y + crown.y) / 2;
  p.curve(base, pt(mx, my), crown, p.outline, 4.2 * s + 1.8);
  p.curve(base, pt(mx, my), crown, TRUNK, 4.2 * s);
  const fronds: [number, number, number][] = [
    [-172, 46, 10],
    [-142, 44, 8],
    [-112, 38, 4],
    [-78, 34, 2],
    [-42, 42, 8],
    [-14, 48, 12],
    [14, 36, 18],
    [158, 38, 18],
  ];
  fronds.forEach(([a, l, d], i) => frond(p, crown.x, crown.y, deg(a), l * s, d * s, i % 2 ? LEAF : LEAF_D));
  p.ball(crown.x, crown.y, 2.6, TRUNK, p.outline);
}

/**
 * One glass hall with an arched glass roof. Its long axis runs along v (the
 * left hall, toward the left corner) or along u (the right hall, toward the
 * right corner), from a0 to a1; b0..b1 is its width. The long wall is glazed
 * up to the arch, the far end is glazed with a little door, and the knee wall
 * is cream stone. dim darkens the long wall for the side in shadow.
 */
function glassHall(p: Pen, vLong: boolean, a0: number, a1: number, b0: number, b1: number, dim: number): void {
  const KNEE = 14;
  const ZW = 44;
  const H = 24;
  const bc = (b0 + b1) / 2;
  const r = (b1 - b0) / 2;
  const W = (a: number, b: number, z: number): Pt => (vLong ? p.iso(b, a, z) : p.iso(a, b, z));
  const archAt = (a: number, th: number): Pt => W(a, bc + r * Math.cos(th), ZW + H * Math.sin(th));
  const archPts = (a: number, n = 12): Pt[] => {
    const out: Pt[] = [];
    for (let i = 0; i <= n; i++) out.push(archAt(a, (Math.PI * i) / n));
    return out;
  };
  const longPt = (s: number, z: number): Pt => W(s, b1, z);
  const endPt = (s: number, z: number): Pt => W(a1, s, z);

  // knee wall, cream stone, lit on the end and shaded along the long side
  if (vLong) p.box(b0, a0, b1 - b0, a1 - a0, KNEE, HALL_KNEE);
  else p.box(a0, b0, a1 - a0, b1 - b0, KNEE, HALL_KNEE);

  // long wall: a glass room with a bench, plants clipped to the glass
  const longWall = [longPt(a0, KNEE), longPt(a1, KNEE), longPt(a1, ZW), longPt(a0, ZW)];
  p.poly(longWall, p.vgrad(longPt(a0, ZW).y, longPt(a0, KNEE).y, shade('#fbfffd', dim), shade('#bfeedd', dim)), null);
  p.poly([longPt(a0, 19), longPt(a1, 19), longPt(a1, 24), longPt(a0, 24)], WOOD, null);
  clipTo(p, [longWall], () => {
    for (let s = a0 + 0.3, i = 0; s < a1; s += 0.5, i++) {
      const q = longPt(s, 24);
      potPlant(p, q.x, q.y, 6.5, [PINK, WHITE, LILAC, CORAL][i % 4], 50 + i);
    }
    for (let s = a0 + 0.15; s < a1; s += 0.8) {
      const q = longPt(s, 40);
      p.foliage(q.x, q.y, 7, LEAF_L, 70 + Math.round(s * 10), 6);
      p.flower(q.x + 2, q.y - 6, 2.6, BLUSH);
    }
  });
  p.poly(longWall, GLASS_T, null);
  glint(p, longWall, 0.6);
  for (let s = a0 + 0.5; s < a1 - 0.1; s += 0.5) thick(p, [longPt(s, KNEE), longPt(s, ZW)], MINT, 2.6);
  thick(p, [longPt(a0, KNEE), longPt(a0, ZW)], MINT, 2.6);
  thick(p, [longPt(a1, KNEE), longPt(a1, ZW)], MINT, 2.6);
  thick(p, [longPt(a0, KNEE), longPt(a1, KNEE)], CREAM_STONE, 3);
  thick(p, [longPt(a0, ZW), longPt(a1, ZW)], WHITE, 2.6);

  // arched glass roof, faceted into strips: lit on the far side, shaded on the near side
  const N = 8;
  for (let i = 0; i < N; i++) {
    const t0 = (Math.PI * i) / N;
    const t1 = (Math.PI * (i + 1)) / N;
    const tm = (t0 + t1) / 2;
    p.poly([archAt(a0, t0), archAt(a1, t0), archAt(a1, t1), archAt(a0, t1)], mix(AQUA_L, AQUA_D, (1 + Math.cos(tm)) / 2), null);
  }
  const roof = [...archPts(a0), ...archPts(a1).reverse()];
  glint(p, roof, 0.5);
  for (const th of [Math.PI / 4, Math.PI / 2, (3 * Math.PI) / 4]) {
    p.line([archAt(a0, th), archAt(a1, th)], 'rgba(255,255,255,0.8)', 1);
  }
  for (let a = a0 + 0.5; a < a1 - 0.1; a += 0.5) thick(p, archPts(a), WHITE, 2);
  thick(p, archPts(a0), WHITE, 2.4);
  thick(p, archPts(a1), WHITE, 2.4);
  thick(p, [archAt(a0, Math.PI / 2), archAt(a1, Math.PI / 2)], WHITE, 2.6);

  // far end: glazed, with a small arched door in the middle
  const endShape = [endPt(b0, KNEE), endPt(b1, KNEE), ...archPts(a1)];
  p.poly(endShape, p.vgrad(endPt(bc, ZW).y, endPt(bc, KNEE).y, '#fbfffd', '#c4eedf'), null);
  p.poly(endShape, GLASS_T, null);
  glint(p, endShape, 0.6);
  p.poly([endPt(bc - 0.2, KNEE), endPt(bc + 0.2, KNEE), endPt(bc + 0.2, 34), endPt(bc - 0.2, 34)], MINT, p.outline, 1.2);
  p.circle(endPt(bc + 0.12, 22).x, endPt(bc + 0.12, 22).y, 1.2, GOLD);
  thick(p, [endPt(b0, KNEE), endPt(b1, KNEE)], CREAM_STONE, 3);
  thick(p, [endPt(b0, ZW), endPt(b1, ZW)], WHITE, 2.6);
}

function botanicalConservatory(p: Pen): void {
  const CX = 128;
  const CY = 244; // footprint centre on the ground
  const RX = 45; // the rotunda, drawn as a 2:1 ellipse
  const RY = 22.5;
  const KNEE = 14; // cream knee wall
  const RIM = 48; // top of the glass band
  const DRUM = 62; // top of the short white drum ring
  const DOME = 56; // dome rise above the drum: hemisphere-ish
  const CYT = CY - DRUM; // drum centre
  const HALF = deg(90);
  const MULL = [8, 26, 44, 62, 80];

  const gp = (phi: number, z: number): Pt => pt(CX + RX * Math.sin(phi), CY + RY * Math.cos(phi) - z);
  const arcPts = (a0: number, a1: number, z: number, n = 14): Pt[] => {
    const out: Pt[] = [];
    for (let i = 0; i <= n; i++) out.push(gp(a0 + ((a1 - a0) * i) / n, z));
    return out;
  };
  const band = (a0: number, a1: number, z0: number, z1: number): Pt[] => [...arcPts(a0, a1, z0), ...arcPts(a1, a0, z1)];
  const domePt = (a: number, phi: number): Pt =>
    pt(CX + RX * Math.cos(a) * Math.sin(phi), CYT + RY * Math.cos(a) * Math.cos(phi) - DOME * Math.sin(a));
  const dpts: Pt[] = [];
  for (let i = 0; i <= 10; i++) for (let j = 0; j < 40; j++) dpts.push(domePt((i / 10) * (Math.PI / 2), (j / 40) * Math.PI * 2));
  const dome = hull(dpts);
  const apex = pt(CX, CYT - DOME);
  const glassBand = band(-HALF, HALF, KNEE, RIM);

  p.shadow(CX, CY + 4, 100, 46, 0.26);

  // 1. the two glass halls, behind the rotunda
  glassHall(p, true, 1.9, 3.9, 0.3, 1.9, -0.12);
  glassHall(p, false, 1.9, 3.9, 0.3, 1.9, 0);

  // 2. the rotunda knee wall, lit from the left
  p.poly(band(-HALF, HALF, 0, KNEE), hgrad(p, CX - RX, CX + RX, '#fffaf0', '#f0d6b8'));
  for (let d = -75; d <= 75; d += 15) p.line([gp(deg(d), 0), gp(deg(d), KNEE)], STONE_D, 0.9);
  p.line(arcPts(-HALF, HALF, KNEE / 2), STONE_D, 0.8);

  // 3. the glass room: mint interior, dome base, and plants clipped to the glass
  p.poly(glassBand, hgrad(p, CX - RX, CX + RX, '#fdfffd', '#cdeedf'), null);
  p.poly(dome, p.vgrad(apex.y, CYT + RY, '#f4fffb', '#b6ecdd'), null);
  clipTo(p, [glassBand, dome], () => {
    palm(p, pt(CX - 26, CY - 4), pt(CX - 40, CY - 92), 1.1);
    palm(p, pt(CX + 28, CY - 2), pt(CX + 38, CY - 84), 1.02);
    p.foliage(CX - 50, CY - 2, 11, LEAF, 61, 7);
    p.foliage(CX + 50, CY - 4, 10, LEAF_L, 62, 7);
    const blooms: [number, number][] = [
      [CX - 12, CY - 28],
      [CX + 12, CY - 20],
      [CX - 54, CY - 40],
      [CX + 52, CY - 44],
      [CX - 26, CY - 70],
      [CX + 22, CY - 66],
      [CX + 2, CY - 100],
      [CX - 6, CY - 54],
    ];
    const bloomCols = [CORAL, BLUSH, PINK];
    blooms.forEach(([x, y], i) => p.flower(x, y, 6, bloomCols[i % bloomCols.length], YELLOW));
  });

  // 4. glass panels between the mint mullions, each with glossy streaks
  for (let i = 0; i < MULL.length; i++) {
    const b = i < MULL.length - 1 ? MULL[i + 1] : 90;
    for (const [a0, a1] of [
      [MULL[i], b],
      [-b, -MULL[i]],
    ]) {
      const q = band(deg(a0), deg(a1), KNEE, RIM);
      p.poly(q, GLASS_T, null);
      glint(p, q);
    }
  }
  for (const d of [-80, -62, -44, -26, -8, 8, 26, 44, 62, 80]) thick(p, [gp(deg(d), KNEE), gp(deg(d), RIM)], MINT, 3.2);
  thick(p, arcPts(-HALF, HALF, KNEE), CREAM_STONE, 3.6);
  thick(p, arcPts(-HALF, HALF, RIM), WHITE, 3.4);
  thick(p, arcPts(-HALF, HALF, (KNEE + RIM) / 2), WHITE, 1.6);

  // 5. the drum ring: white, with mint ribs, lit from the left
  p.poly(band(-HALF, HALF, RIM, DRUM), hgrad(p, CX - RX, CX + RX, '#ffffff', '#e2f5ed'));
  for (const d of [-80, -62, -44, -26, -8, 8, 26, 44, 62, 80]) thick(p, [gp(deg(d), RIM), gp(deg(d), DRUM)], MINT, 2.4);
  thick(p, arcPts(-HALF, HALF, DRUM), WHITE, 2.2);

  // 6. the double doors at the front, with a window and a flower garland
  const door = band(deg(-8), deg(8), 8, 40);
  p.poly(door, p.vgrad(gp(0, 40).y, gp(0, 8).y, MINT_L, MINT), p.outline, 1.2);
  const win = band(deg(-5), deg(5), 20, 32);
  p.poly(win, null, p.outline, 2.4);
  p.poly(win, AQUA_L, WHITE, 1.2);
  glint(p, win, 0.7);
  p.line([gp(0, 20), gp(0, 32)], WHITE, 1);
  const knob = gp(deg(4), 16);
  p.circle(knob.x, knob.y, 1.6, GOLD);
  const garlandCols = [CORAL, PINK, WHITE, BLUSH, CORAL];
  for (let d = -6; d <= 6; d += 3) {
    const q = gp(deg(d), 43);
    p.flower(q.x, q.y, 2.2, garlandCols[(d + 6) / 3]);
  }

  // 7. the dome: a ribbed glass hemisphere with a glossy sheen
  p.poly(dome, 'rgba(214,250,255,0.3)', null);
  glint(p, dome, 0.45);
  for (const d of [-80, -60, -40, -20, 0, 20, 40, 60, 80]) {
    const r: Pt[] = [];
    for (let i = 0; i <= 10; i++) r.push(domePt((i / 10) * (Math.PI / 2), deg(d)));
    thick(p, r, WHITE, 2.4);
  }
  const hoop: Pt[] = [];
  for (let j = 0; j <= 40; j++) hoop.push(domePt(0.5, (j / 40) * Math.PI * 2));
  p.line(hoop, 'rgba(255,255,255,0.85)', 1.2);
  const gloss: Pt[] = [];
  for (let i = 0; i <= 8; i++) gloss.push(domePt(0.3 + (i / 8) * 0.9, deg(-52)));
  p.line(gloss, 'rgba(255,255,255,0.9)', 2.4);
  p.poly(dome, null, p.outline, 1.6);

  // 8. the lantern cupola on the crown, a gold finial and a pink pennant
  const k = 1.25;
  p.ellipse(apex.x, apex.y + 4, 15 * k, 7 * k, MINT_D, p.outline);
  p.cylinder(apex.x, apex.y + 5, 12 * k, 20 * k, '#f6fffb');
  for (const dx of [-6, 0, 6]) p.line([pt(apex.x + dx * k, apex.y - 12 * k), pt(apex.x + dx * k, apex.y + 3)], MINT, 1.6);
  const rt = apex.y + 5 - 20 * k;
  p.poly([pt(apex.x - 16 * k, rt + 1), pt(apex.x, rt - 22 * k), pt(apex.x, rt + 1)], MINT);
  p.poly([pt(apex.x, rt - 22 * k), pt(apex.x + 16 * k, rt + 1), pt(apex.x, rt + 1)], shade(MINT, -0.2));
  p.ellipse(apex.x, rt + 1, 16 * k, 5 * k, MINT_D, p.outline);
  const top = rt - 22 * k;
  p.line([pt(apex.x, top), pt(apex.x, top - 8)], GOLD_D, 2);
  p.circle(apex.x, top - 11, 3.4, GOLD);
  p.line([pt(apex.x, top - 14), pt(apex.x, top - 27)], GOLD_D, 1.2);
  p.poly([pt(apex.x, top - 27), pt(apex.x + 13, top - 23), pt(apex.x, top - 19)], PENNANT, p.outline, 0.8);

  // 9. small stone steps on the front face, inside the footprint
  p.box(2.7, 2.7, 0.38, 0.38, 8, { top: STEP_TOP, left: CREAM_STONE, right: STONE_D });
  p.box(2.86, 2.86, 0.38, 0.38, 5, { top: STEP_TOP, left: CREAM_STONE, right: STONE_D });
  p.box(3.02, 3.02, 0.38, 0.38, 2, { top: STEP_TOP, left: CREAM_STONE, right: STONE_D });

  // 10. two round topiaries in planters, flanking the entrance
  for (const [u, v, seed] of [
    [2.3, 3.86, 3],
    [3.86, 2.3, 7],
  ] as [number, number, number][]) {
    const b = p.iso(u, v, 0);
    p.shadow(b.x, b.y + 2, 13, 6, 0.22);
    p.cylinder(b.x, b.y, 11, 13, TERRA);
    p.line([pt(b.x, b.y - 13), pt(b.x, b.y - 22)], WOOD_D, 2.2);
    p.foliage(b.x, b.y - 34, 13, seed === 3 ? LEAF : LEAF_L, seed, 8);
    p.flower(b.x - 6, b.y - 42, 2.6, PINK);
    p.flower(b.x + 6, b.y - 30, 2.6, WHITE);
  }
  for (const [x, y, col] of [
    [CX - 40, 298, PINK],
    [CX - 26, 303, WHITE],
    [CX + 30, 301, LILAC],
    [CX + 42, 296, YELLOW],
  ] as [number, number, string][]) {
    p.flower(x, y, 2.6, col);
  }

  sparkle(p, 40, 150, 3, '#ffffff');
  sparkle(p, 214, 130, 2.6, '#fff1a8');
  sparkle(p, 226, 214, 2.4, '#ffffff');
  sparkle(p, 30, 226, 2.2, '#fff1a8');
}

// ---------------------------------------------------------------------------
// Exports

export const sprites: SpriteSpec[] = [
  { key: 'deco:grand_greenhouse', fw: 4, fh: 4, height: 150, paint: grandGreenhouse },
  { key: 'deco:botanical_conservatory', fw: 4, fh: 4, height: 180, paint: botanicalConservatory },
];
