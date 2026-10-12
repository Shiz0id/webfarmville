// Blooms: the florist's flower cart (a 2x1 deco) and the bouquet icon that
// fronts the Flower Album. The cart is a little wooden barrow with mint paint,
// buckets heaped with round bushes of tulips, roses and little blooms, and a
// pink and cream striped scalloped canopy held up on four posts. Its long side
// runs along the grid's x axis, like the market stall, so the long front is the
// left face.
import { type IconSpec, type Pen, type Pt, type SpriteSpec, OUTLINE, rng, shade } from './kit';

const O = OUTLINE;

const MINT = '#a8e6cf';
const MINT_D = '#7fcdb0';
const CREAM = '#fff4e4';
const BUTTER = '#ffe49a';
const PINK = '#ffb3cf';
const PINK_D = '#e77fa6';
const PINK_L = '#ffdbe8';
const LILAC = '#c9b8f5';
const LEAF = '#6cbf55';
const WOOD = '#c98b53';
const WOOD_L = '#f2c58f';
const SOIL = '#8a5a34';
const BOARD = '#4f6e61';
const CHALK = '#fbf7ef';
const GOLD = '#f4c24a';
const GOLD_ROSE = '#ffc53a';
const GLOW = '#ffe68a';
const RED = '#ff6b7f';
const YELLOW = '#ffd84a';
const ORANGE = '#ffa15c';
const PURPLE = '#a983f0';
const WHITE = '#fff9f1';
const ROSE_PINK = '#ff8cbc';
const BLUE = '#7fb8ff';

/** The colours the little blooms in a bush are drawn from. */
const BLOOMS = [RED, YELLOW, ROSE_PINK, PURPLE, WHITE, ORANGE, BLUE, PINK];

// ---------------------------------------------------------------------------
// Helpers

/** A stalk: dark outline under a green line, bowed by a quadratic control point. */
function stalk(p: Pen, a: Pt, c: Pt, b: Pt, w = 1.4): void {
  p.curve(a, c, b, O, w + 1.2);
  p.curve(a, c, b, LEAF, w);
}

/** A pointed leaf from (x, y) at angle ang (radians) and length len. */
function leaf(p: Pen, x: number, y: number, ang: number, len: number, color = LEAF): void {
  const ctx = p.ctx;
  const dx = Math.cos(ang);
  const dy = Math.sin(ang);
  const nx = -dy;
  const ny = dx;
  const w = len * 0.34;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.quadraticCurveTo(x + dx * len * 0.5 + nx * w, y + dy * len * 0.5 + ny * w, x + dx * len, y + dy * len);
  ctx.quadraticCurveTo(x + dx * len * 0.5 - nx * w, y + dy * len * 0.5 - ny * w, x, y);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.strokeStyle = O;
  ctx.lineWidth = 0.9;
  ctx.stroke();
  p.line([{ x, y }, { x: x + dx * len * 0.78, y: y + dy * len * 0.78 }], shade(color, -0.3), 0.6);
}

/** A three-tipped tulip cup centred at (x, y); its stem leaves from the bottom at y + 0.9s. */
function tulip(p: Pen, x: number, y: number, s: number, color: string): void {
  const ctx = p.ctx;
  ctx.beginPath();
  ctx.moveTo(x - s, y - s * 0.7);
  ctx.quadraticCurveTo(x - s * 1.12, y + s * 0.5, x, y + s * 0.9);
  ctx.quadraticCurveTo(x + s * 1.12, y + s * 0.5, x + s, y - s * 0.7);
  ctx.lineTo(x + s * 0.46, y - s * 0.4);
  ctx.lineTo(x, y - s * 1.3);
  ctx.lineTo(x - s * 0.46, y - s * 0.4);
  ctx.closePath();
  const g = ctx.createLinearGradient(x - s, 0, x + s, 0);
  g.addColorStop(0, shade(color, 0.25));
  g.addColorStop(0.5, color);
  g.addColorStop(1, shade(color, -0.22));
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = O;
  ctx.lineWidth = 0.9;
  ctx.stroke();
  // a soft crease down the middle petal and a glint on the left
  p.line([{ x, y: y - s * 0.35 }, { x, y: y + s * 0.6 }], shade(color, -0.32), 0.6);
  p.ellipse(x - s * 0.55, y - s * 0.3, s * 0.18, s * 0.34, 'rgba(255,255,255,0.45)', null, 0.2);
}

/** A rosette rose: five scalloped petals around a swirled heart. */
function rose(p: Pen, x: number, y: number, r: number, color: string): void {
  const ctx = p.ctx;
  const pr = r * 0.56;
  const petals: Pt[] = [];
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + 0.4;
    petals.push({ x: x + Math.cos(a) * r * 0.5, y: y + Math.sin(a) * r * 0.5 });
  }
  // outline pass first, so the petals merge into one silhouette
  for (const q of petals) p.circle(q.x, q.y, pr + 0.9, O, null);
  p.circle(x, y, r * 0.78 + 0.9, O, null);
  for (const q of petals) p.circle(q.x, q.y, pr, shade(color, -0.1), null);
  p.circle(x, y, r * 0.72, color, shade(color, -0.4));
  // swirl of the bloom's heart
  ctx.beginPath();
  ctx.arc(x, y, r * 0.42, 0.5, Math.PI * 1.7);
  ctx.strokeStyle = shade(color, -0.36);
  ctx.lineWidth = 0.9;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(x + r * 0.05, y + r * 0.05, r * 0.2, Math.PI * 0.9, Math.PI * 2.5);
  ctx.stroke();
  // a little light on the upper left petal
  p.ellipse(x - r * 0.42, y - r * 0.5, r * 0.22, r * 0.14, 'rgba(255,255,255,0.5)', null, -0.5);
}

/** A round, bushy cluster of little blooms on a leafy ball. (cx, cy) is its centre. */
function bush(p: Pen, cx: number, cy: number, r: number, seed: number, count: number): void {
  p.foliage(cx, cy, r, LEAF, seed, 7);
  const rand = rng(seed * 7 + 3);
  for (let i = 0; i < count; i++) {
    const a = Math.PI * (1 + rand()); // the upper half of the ball
    const d = r * (0.35 + rand() * 0.5);
    const x = cx + Math.cos(a) * d;
    const y = cy + Math.sin(a) * d * 0.8;
    p.flower(x, y, 2.6, BLOOMS[Math.floor(rand() * BLOOMS.length)]);
  }
}

/** A tulip or rose head sitting above the bush centre c, offset by (dx, dy). */
interface Head {
  kind: 'tulip' | 'rose' | 'gold';
  color: string;
  dx: number;
  dy: number;
  s: number;
}

/** Short stalks and their heads poking out of a bush centred at c. */
function headsOn(p: Pen, c: Pt, heads: Head[]): void {
  for (const h of heads) {
    const hx = c.x + h.dx;
    const hy = c.y + h.dy;
    const base = h.kind === 'tulip' ? hy + h.s * 0.9 : hy + h.s * 1.05;
    stalk(p, c, { x: c.x + (hx - c.x) * 0.2, y: c.y + (base - c.y) * 0.6 }, { x: hx, y: base }, 1.2);
  }
  for (const h of heads) {
    const hx = c.x + h.dx;
    const hy = c.y + h.dy;
    if (h.kind === 'tulip') tulip(p, hx, hy, h.s, h.color);
    else if (h.kind === 'gold') {
      p.glow(hx, hy, h.s * 2.8, GLOW, 0.55);
      rose(p, hx, hy, h.s, h.color);
      // a sparkle over the golden bloom
      p.star(hx + h.s * 1.2, hy - h.s * 1.25, h.s * 0.55, '#fffbe6', shade(GOLD, -0.3));
    } else rose(p, hx, hy, h.s, h.color);
  }
}

// ---------------------------------------------------------------------------
// The flower cart (2x1 footprint)

const CART_H = 106; // headroom above the footprint for the canopy and posts

// Footprint layout (footprint-local tile coords).
const BED = { l: 0.08, r: 1.92, b: 0.16, f: 0.84, z0: 24, z1: 38 };
const CANOPY = { l: 0.1, r: 1.9, b: 0.0, f: 1.0, zb: 100, zf: 90 };
const canopyZ = (v: number): number => CANOPY.zb + ((v - CANOPY.b) / (CANOPY.f - CANOPY.b)) * (CANOPY.zf - CANOPY.zb);
const TRAY_Z = BED.z1;
const POST_U = [0.12, 1.88];

/** A wheel standing in the side plane of the cart: a disc in the (u, z) plane. */
function ptAt(c: Pt, r: number, s: number, a: number): Pt {
  const ex = 1.15 * r * s;
  const ey = r * s;
  return { x: c.x + Math.cos(a) * ex * 0.894, y: c.y + Math.cos(a) * ex * 0.447 + Math.sin(a) * ey };
}

function discPts(c: Pt, r: number, s: number, n = 28): Pt[] {
  const pts: Pt[] = [];
  for (let i = 0; i < n; i++) pts.push(ptAt(c, r, s, (i / n) * Math.PI * 2));
  return pts;
}

function wheel(p: Pen, u: number, v: number, z: number, r: number): void {
  const c = p.iso(u, v, z);
  // mint hoop, wooden face, spokes and a pink hub
  p.poly(discPts(c, r, 1), MINT_D, O, 1.2);
  p.poly(discPts(c, r, 0.8), WOOD_L, O, 0.9);
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2 + 0.25;
    const a0 = ptAt(c, r, 0.14, a);
    const a1 = ptAt(c, r, 0.74, a);
    p.line([a0, a1], O, 2.4);
    p.line([a0, a1], WOOD, 1.2);
  }
  p.circle(c.x, c.y, r * 0.2, PINK, O);
  p.circle(c.x - r * 0.06, c.y - r * 0.06, r * 0.07, 'rgba(255,255,255,0.7)', null);
}

/** One wooden post holding up the canopy at footprint point (u, v). */
function post(p: Pen, u: number, v: number): void {
  const b = p.iso(u, v, 0);
  p.cylinder(b.x, b.y, 2.6, canopyZ(v) - 3, shade(WOOD, -0.04));
}

function bed(p: Pen): void {
  const { l, r, b, f, z0, z1 } = BED;
  p.box(l, b, r - l, f - b, z1 - z0, { top: shade(MINT, 0.22), left: MINT, right: shade(MINT, -0.2) }, z0);
  // cream trim along the top rim, and a band with pink dots on the long front
  p.line([p.iso(l, f, z1), p.iso(r, f, z1), p.iso(r, b, z1)], CREAM, 2.4);
  p.line([p.iso(l, f, 31), p.iso(r, f, 31)], CREAM, 2);
  p.line([p.iso(r, f, 31), p.iso(r, b, 31)], CREAM, 2);
  for (let i = 0; i < 6; i++) {
    const d = p.iso(l + 0.22 + i * 0.27, f, 27.5);
    p.circle(d.x, d.y, 1.1, PINK, null);
  }
  // a little pink bow tied on the cream band of the short end, lying flat on that face
  const bc = p.iso(r, 0.5, 31);
  const ax = -0.894; // screen direction of the v axis
  const ay = 0.447;
  const rot = Math.atan2(ay, ax);
  const off = 3.6;
  p.ellipse(bc.x + ax * off, bc.y + ay * off - 0.4, 3.2, 2, PINK, O, rot);
  p.ellipse(bc.x - ax * off, bc.y - ay * off - 0.4, 3.2, 2, PINK, O, rot);
  p.ellipse(bc.x + ax * (off + 0.6), bc.y + ay * (off + 0.6) - 1.1, 1, 0.5, 'rgba(255,255,255,0.5)', null, rot);
  const t1 = { x: bc.x + 1, y: bc.y + 0.6 };
  const t2 = { x: bc.x + 2.2, y: bc.y + 5 };
  const t3 = { x: bc.x - 1, y: bc.y + 0.6 };
  const t4 = { x: bc.x - 2.4, y: bc.y + 5.2 };
  p.line([t1, t2], O, 2.6);
  p.line([t1, t2], PINK, 1.2);
  p.line([t3, t4], O, 2.6);
  p.line([t3, t4], PINK, 1.2);
  p.circle(bc.x, bc.y, 1.7, PINK_D, O);
  // the flat soil tray the buckets stand in
  p.poly([p.iso(0.16, 0.22, TRAY_Z), p.iso(1.84, 0.22, TRAY_Z), p.iso(1.84, 0.78, TRAY_Z), p.iso(0.16, 0.78, TRAY_Z)], SOIL, O, 0.9);
  p.line([p.iso(0.2, 0.25, TRAY_Z + 0.2), p.iso(1.8, 0.25, TRAY_Z + 0.2)], 'rgba(255,255,255,0.14)', 1);
}

/** One tin bucket heaped with a round bush of blooms, with a few tulips and roses on top. */
interface Bunch {
  u: number;
  v: number;
  color: string;
  seed: number;
  heads: Head[];
}

function bunch(p: Pen, b: Bunch): void {
  const base = p.iso(b.u, b.v, TRAY_Z);
  const ht = 10;
  p.cylinder(base.x, base.y, 6.2, ht, b.color);
  p.curve({ x: base.x - 6, y: base.y - 4.4 }, { x: base.x, y: base.y - 1.6 }, { x: base.x + 6, y: base.y - 4.4 }, CREAM, 1.3);
  // the bush sits on the bucket's mouth and spills over its rim
  const c = { x: base.x, y: base.y - ht - 3 };
  bush(p, c.x, c.y, 9.5, b.seed, 11);
  headsOn(p, c, b.heads);
}

/** A loose bunch lying on the bed's front lip: a small bush with a tulip across its front. */
function lipBunch(p: Pen, u: number, v: number, seed: number, color: string): void {
  const base = p.iso(u, v, TRAY_Z);
  const c = { x: base.x, y: base.y - 5 };
  bush(p, c.x, c.y, 7.5, seed, 8);
  leaf(p, c.x - 5, c.y + 5, -2.9, 6);
  tulip(p, c.x + 5, c.y + 3, 3.8, color);
}

// Five bunches across the whole bed, drawn back to front. The golden rose is the
// star of the front bunch.
const BUNCHES: Bunch[] = [
  {
    u: 0.36,
    v: 0.56,
    color: PINK,
    seed: 11,
    heads: [
      { kind: 'tulip', color: RED, dx: -8, dy: -10, s: 4 },
      { kind: 'rose', color: ROSE_PINK, dx: 0, dy: -12, s: 4.6 },
      { kind: 'tulip', color: YELLOW, dx: 8, dy: -9, s: 4 },
    ],
  },
  {
    u: 0.62,
    v: 0.27,
    color: BUTTER,
    seed: 23,
    heads: [
      { kind: 'tulip', color: PURPLE, dx: -8, dy: -9, s: 4 },
      { kind: 'rose', color: WHITE, dx: 1, dy: -13, s: 4.6 },
      { kind: 'tulip', color: ORANGE, dx: 8, dy: -9, s: 4 },
    ],
  },
  {
    u: 1.3,
    v: 0.4,
    color: LILAC,
    seed: 37,
    heads: [
      { kind: 'tulip', color: ROSE_PINK, dx: -7, dy: -10, s: 4 },
      { kind: 'rose', color: RED, dx: 6, dy: -12, s: 4.4 },
      { kind: 'tulip', color: WHITE, dx: 1, dy: -6, s: 3.8 },
    ],
  },
  {
    u: 1.75,
    v: 0.25,
    color: MINT,
    seed: 51,
    heads: [
      { kind: 'rose', color: PURPLE, dx: -6, dy: -10, s: 4.4 },
      { kind: 'tulip', color: YELLOW, dx: 6, dy: -11, s: 4 },
    ],
  },
  {
    u: 1.35,
    v: 0.75,
    color: PINK_L,
    seed: 67,
    heads: [
      { kind: 'tulip', color: RED, dx: -8, dy: -9, s: 4 },
      { kind: 'gold', color: GOLD_ROSE, dx: -1, dy: -14, s: 6 },
      { kind: 'rose', color: BLUE, dx: 7, dy: -8, s: 4.4 },
    ],
  },
];

function chalkSign(p: Pen): void {
  // hangs from the canopy's front edge, in front of the bed, clear of the near wheel
  const v = 1.1;
  const u0 = 1.36;
  const u1 = 1.9;
  const z0 = 28;
  const z1 = 46;
  const bp = (s: number, t: number): Pt => p.iso(u0 + (u1 - u0) * s, v, z0 + (z1 - z0) * t);
  p.line([p.iso(u0 + 0.06, CANOPY.f - 0.02, canopyZ(CANOPY.f) - 1), bp(0.05, 1)], O, 1);
  p.line([p.iso(u1 - 0.06, CANOPY.f - 0.02, canopyZ(CANOPY.f) - 1), bp(0.95, 1)], O, 1);
  // wooden frame
  p.poly([bp(-0.06, -0.08), bp(1.06, -0.08), bp(1.06, 1.06), bp(-0.06, 1.06)], WOOD, O, 1.1);
  p.line([bp(-0.02, 0.98), bp(1.02, 0.98)], WOOD_L, 1);
  // chalkboard, a heart and a tulip doodle, with a smudge of light
  p.poly([bp(0.09, 0.1), bp(0.91, 0.1), bp(0.91, 0.9), bp(0.09, 0.9)], BOARD, null);
  const h = bp(0.3, 0.56);
  p.heart(h.x, h.y, 2.9, PINK, PINK_D);
  const t = bp(0.7, 0.5);
  p.line([{ x: t.x, y: t.y + 1.6 }, { x: t.x, y: t.y + 4.2 }], CHALK, 0.8);
  p.ellipse(t.x - 1.5, t.y - 0.4, 1.3, 1.9, PINK_L, CHALK, -0.4);
  p.ellipse(t.x + 1.5, t.y - 0.4, 1.3, 1.9, PINK_L, CHALK, 0.4);
  p.line([bp(0.2, 0.2), bp(0.72, 0.2)], 'rgba(251,247,239,0.5)', 0.8);
}

/** The striped canopy, a shallow roof sloping down toward the front. */
function canopy(p: Pen): void {
  const n = 6;
  const { l, r, b, f } = CANOPY;
  const zb = canopyZ(b);
  const zf = canopyZ(f);
  for (let i = 0; i < n; i++) {
    const u0 = l + ((r - l) * i) / n;
    const u1 = l + ((r - l) * (i + 1)) / n;
    const col = i % 2 ? CREAM : PINK;
    p.poly([p.iso(u0, b, zb), p.iso(u1, b, zb), p.iso(u1, f, zf), p.iso(u0, f, zf)], col, O, 1);
  }
  // soft sheen along the back of the canopy
  p.line([p.iso(l + 0.1, b + 0.12, zb - 1.2), p.iso(r - 0.1, b + 0.12, zb - 1.2)], 'rgba(255,255,255,0.45)', 1.6);
}

/** The scalloped hem hanging from the canopy's front edge. */
function canopyHem(p: Pen): void {
  const n = 6;
  const { l, r, f } = CANOPY;
  const zf = canopyZ(f);
  const ctx = p.ctx;
  for (let i = 0; i < n; i++) {
    const u0 = l + ((r - l) * i) / n;
    const u1 = l + ((r - l) * (i + 1)) / n;
    const a = p.iso(u0, f, zf);
    const bb = p.iso(u1, f, zf);
    const c = { x: (a.x + bb.x) / 2, y: (a.y + bb.y) / 2 + 9 };
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.quadraticCurveTo(c.x, c.y, bb.x, bb.y);
    ctx.closePath();
    ctx.fillStyle = i % 2 ? CREAM : PINK;
    ctx.fill();
    ctx.strokeStyle = O;
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}

function floristCart(p: Pen): void {
  const { x: cx, y: cy } = p.center;
  p.shadow(cx, cy + 1, 46, 21, 0.25);

  // the far wheel and the back posts sit behind the bed
  wheel(p, 1.3, 0.08, 14, 14);
  for (const u of POST_U) post(p, u, 0.04);

  // the bed, its five bunches and two loose bunches on the front lip
  bed(p);
  for (const b of [...BUNCHES].sort((a, b) => a.u + a.v - (b.u + b.v))) bunch(p, b);
  lipBunch(p, 1.0, 0.94, 81, ROSE_PINK);
  lipBunch(p, 1.9, 0.72, 93, BLUE);

  // the near wheel, then the front posts in front of the bed
  wheel(p, 0.6, 0.92, 14, 14);
  for (const u of POST_U) post(p, u, 0.96);

  // the canopy sits above the blooms; its hem and the chalkboard hang from the front edge
  canopy(p);
  canopyHem(p);
  chalkSign(p);
}

// ---------------------------------------------------------------------------
// Icon (flat, 40x40): a bouquet of tulips and roses tied with a pink ribbon

function iconBlooms(p: Pen): void {
  p.shadow(20, 37, 11, 2.6, 0.25);
  const knot = { x: 20, y: 28 };
  const heads: Head[] = [
    { kind: 'tulip', color: PINK, dx: -10.5, dy: -13, s: 4.4 },
    { kind: 'tulip', color: YELLOW, dx: 10.5, dy: -13, s: 4.4 },
    { kind: 'rose', color: RED, dx: 0, dy: -19, s: 5.4 },
    { kind: 'rose', color: BLUE, dx: -6, dy: -8, s: 4.2 },
    { kind: 'rose', color: ROSE_PINK, dx: 6, dy: -8, s: 4.2 },
  ];
  // stalks fan out from the knot to the heads
  for (const h of heads) {
    const hx = knot.x + h.dx;
    const hy = knot.y + h.dy + (h.kind === 'tulip' ? h.s * 0.9 : h.s * 1.05);
    stalk(p, knot, { x: knot.x + (hx - knot.x) * 0.3, y: knot.y + (hy - knot.y) * 0.5 }, { x: hx, y: hy }, 1.3);
  }
  leaf(p, knot.x - 1, knot.y - 1, -2.6, 9);
  leaf(p, knot.x + 1, knot.y - 1, -0.55, 9);
  for (const h of heads) {
    const hx = knot.x + h.dx;
    const hy = knot.y + h.dy;
    if (h.kind === 'tulip') tulip(p, hx, hy, h.s, h.color);
    else rose(p, hx, hy, h.s, h.color);
  }
  // a mint paper wrap cone around the stems
  const ctx = p.ctx;
  ctx.beginPath();
  ctx.moveTo(12.5, 25);
  ctx.quadraticCurveTo(20, 27.2, 27.5, 25);
  ctx.lineTo(23.6, 37);
  ctx.quadraticCurveTo(20, 38.2, 16.4, 37);
  ctx.closePath();
  ctx.fillStyle = p.vgrad(25, 37, shade(MINT, 0.2), MINT_D);
  ctx.fill();
  ctx.strokeStyle = O;
  ctx.lineWidth = 1;
  ctx.stroke();
  p.line([{ x: 20, y: 26.4 }, { x: 19.2, y: 36.6 }], shade(MINT_D, -0.2), 0.8);
  p.line([{ x: 15.2, y: 30.4 }, { x: 15.9, y: 36.2 }], 'rgba(255,255,255,0.45)', 0.9);
  // a pink ribbon: tails first, then the loops and the knot on top
  const tails: [Pt, Pt, Pt][] = [
    [{ x: 20, y: 26.5 }, { x: 16.5, y: 31 }, { x: 14.6, y: 37.8 }],
    [{ x: 20, y: 26.5 }, { x: 23.8, y: 31 }, { x: 25.8, y: 37.8 }],
  ];
  for (const [a, c, b] of tails) {
    p.curve(a, c, b, O, 3.2);
    p.curve(a, c, b, PINK, 1.8);
  }
  p.ellipse(16.4, 24.8, 3.6, 2.3, PINK, O, -0.35);
  p.ellipse(23.6, 24.8, 3.6, 2.3, PINK, O, 0.35);
  p.ellipse(15.6, 24.2, 1.2, 0.6, 'rgba(255,255,255,0.5)', null, -0.35);
  p.circle(20, 26, 1.8, PINK_D, O);
  // a sparkle over the bouquet
  p.star(33.5, 8.5, 2.4, '#fffbe6', shade(GOLD, -0.3));
}

// ---------------------------------------------------------------------------
// Exports

export const sprites: SpriteSpec[] = [{ key: 'deco:florist_cart', fw: 2, fh: 1, height: CART_H, paint: floristCart }];

export const icons: IconSpec[] = [{ key: 'icon:blooms', paint: iconBlooms }];
