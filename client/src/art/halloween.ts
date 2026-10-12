// Halloween event art: candy corn and ghost pumpkins (crops), trick-or-treater
// kids, costume accessories for animals, the candy currency, county-fair ribbons
// and a flying bat. Same house style as the rest of the art: chunky rounded
// shapes, dark outlines, top-left light, kawaii faces with blush. Never scary.
import { type IconSpec, type Pen, type SpriteSpec, shade } from './kit';

interface P2 {
  x: number;
  y: number;
}

const INK = '#2b1d14';
const EYE = '#2b1b12';
const WHITE = '#ffffff';
const BLUSH = 'rgba(255,120,150,0.5)';
const PURPLE = '#7b4fb8';
const PURPLE_LT = '#b08ae6';
const PURPLE_DK = '#4a2a78';
const ORANGE = '#ff9a2e';
const ORANGE_DK = '#d8640f';
const YELLOW = '#ffd23f';
const LIME = '#c4f25a';
const LEAF = '#8fd14f';
const LEAF_DK = '#4f8f2c';
const STEM = '#9ad85a';
const GHOST = '#f6f1ff';
const GOLD = '#f2b632';
const SKIN = '#ffdcc2';
const SHOE = '#3b2a45';

// ---------------------------------------------------------------------------
// Shared helpers

function thin(p: Pen, w: number, fn: () => void): void {
  const old = p.lineWidth;
  p.lineWidth = w;
  fn();
  p.lineWidth = old;
}

/** Shaded sphere gradient, lit from the top left. */
function sphere(p: Pen, x: number, y: number, r: number, color: string): CanvasGradient {
  const g = p.ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r * 1.2);
  g.addColorStop(0, shade(color, 0.35));
  g.addColorStop(0.6, color);
  g.addColorStop(1, shade(color, -0.22));
  return g;
}

/** A four-point twinkle. */
function sparkle(p: Pen, x: number, y: number, s: number, color = WHITE): void {
  const ctx = p.ctx;
  ctx.beginPath();
  ctx.moveTo(x, y - s);
  ctx.quadraticCurveTo(x, y, x + s, y);
  ctx.quadraticCurveTo(x, y, x, y + s);
  ctx.quadraticCurveTo(x, y, x - s, y);
  ctx.quadraticCurveTo(x, y, x, y - s);
  ctx.fillStyle = color;
  ctx.fill();
}

/** Outlined stroke that reads as a limb (round caps). */
function limb(p: Pen, a: P2, b: P2, w: number, color: string): void {
  p.line([a, b], p.outline, w + 1.2);
  p.line([a, b], color, w);
}

function eye(p: Pen, x: number, y: number, r = 1.6): void {
  p.circle(x, y, r, EYE, null);
  p.circle(x - r * 0.35, y - r * 0.4, r * 0.42, WHITE, null);
}

function blush(p: Pen, x: number, y: number, s = 1): void {
  p.ellipse(x, y, 1.9 * s, 1.1 * s, BLUSH, null);
}

/** Kawaii face: dot eyes with glints, pink cheeks and a small smile. k = half the eye gap. */
function face(p: Pen, x: number, y: number, k: number): void {
  for (const sx of [-1, 1]) {
    const ex = x + sx * k;
    const ey = y - k * 0.2;
    p.ellipse(ex, ey, k * 0.36, k * 0.5, EYE, null);
    if (k >= 1.2) p.circle(ex - k * 0.14, ey - k * 0.22, k * 0.14, WHITE, null);
    p.ellipse(x + sx * k * 1.7, y + k * 0.5, k * 0.42, k * 0.26, BLUSH, null);
  }
  const lw = Math.max(0.45, k * 0.22);
  p.curve({ x: x - k * 0.55, y: y + k * 0.5 }, { x, y: y + k * 1.2 }, { x: x + k * 0.55, y: y + k * 0.5 }, EYE, lw);
}

/** A pointed leaf from (x, y) heading along `ang` for `len` px. */
function leaf(p: Pen, x: number, y: number, len: number, ang: number, w: number, color: string): void {
  const tx = x + Math.cos(ang) * len;
  const ty = y + Math.sin(ang) * len;
  const cx = x + Math.cos(ang) * len * 0.55;
  const cy = y + Math.sin(ang) * len * 0.55;
  const ch = Math.hypot(tx - x, ty - y) || 1;
  const nx = (-(ty - y) / ch) * w;
  const ny = ((tx - x) / ch) * w;
  const ctx = p.ctx;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.quadraticCurveTo(cx + nx, cy + ny, tx, ty);
  ctx.quadraticCurveTo(cx - nx, cy - ny, x, y);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.strokeStyle = p.outline;
  ctx.lineWidth = p.lineWidth;
  ctx.stroke();
  p.curve({ x, y }, { x: cx, y: cy }, { x: x + (tx - x) * 0.8, y: y + (ty - y) * 0.8 }, shade(color, -0.25), 0.5);
}

/** An outlined stem: a thick dark stroke under a coloured one. */
function stalk(p: Pen, a: P2, c: P2, b: P2, color: string, w: number): void {
  p.curve(a, c, b, p.outline, w + 1.2);
  p.curve(a, c, b, color, w);
}

/** A three-lobed leaf cluster with one merged outline. */
function lobedLeaf(p: Pen, x: number, y: number, r: number, color: string): void {
  const lobes: [number, number][] = [
    [-0.6, 0.1],
    [0.6, 0.1],
    [0, -0.45],
  ];
  for (const [dx, dy] of lobes) p.circle(x + dx * r, y + dy * r, r * 0.7 + 1, p.outline, null);
  for (const [dx, dy] of lobes) p.circle(x + dx * r, y + dy * r, r * 0.7, color, null);
  p.line([{ x, y: y + r * 0.3 }, { x, y: y - r * 0.6 }], shade(color, -0.25), 0.5);
}

/** A pale unripe bud on a short stalk. */
function bud(p: Pen, x: number, y: number, r: number): void {
  p.line([{ x, y: y + r * 0.6 }, { x: x + 0.6, y: y - r * 1.4 }], shade(LEAF_DK, -0.1), 0.7);
  p.ball(x, y, r, '#eef8e6');
}

interface Spot extends P2 {
  u: number;
  v: number;
  i: number;
}

/** Footprint points as canvas spots, drawn back to front (ascending u + v). */
function spots(p: Pen, pts: [number, number][]): Spot[] {
  return pts
    .slice()
    .sort((a, b) => a[0] + a[1] - (b[0] + b[1]) || a[0] - a[1] - (b[0] - b[1]))
    .map(([u, v], i) => ({ u, v, i, ...p.iso(u, v) }));
}

function grid(n: number, lo = 0.22, hi = 0.78): [number, number][] {
  const out: [number, number][] = [];
  for (let i = 0; i < n; i++)
    for (let j = 0; j < n; j++) out.push([lo + ((hi - lo) * i) / (n - 1), lo + ((hi - lo) * j) / (n - 1)]);
  return out;
}

const QUINCUNX: [number, number][] = [
  [0.27, 0.27],
  [0.73, 0.27],
  [0.5, 0.5],
  [0.27, 0.73],
  [0.73, 0.73],
];

/**
 * One candy-corn kernel: a plump, rounded triangle pointing up with yellow,
 * orange and white bands. (x, y) is the centre of its base.
 */
function kernelPath(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  ctx.beginPath();
  ctx.moveTo(-w / 2, 0);
  ctx.quadraticCurveTo(-w * 0.34, -h * 0.5, -w * 0.12, -h * 0.9);
  ctx.quadraticCurveTo(0, -h * 1.06, w * 0.12, -h * 0.9);
  ctx.quadraticCurveTo(w * 0.34, -h * 0.5, w / 2, 0);
  ctx.quadraticCurveTo(0, w * 0.12, -w / 2, 0);
  ctx.closePath();
}

function kernel(p: Pen, x: number, y: number, w: number, h: number, rot = 0): void {
  const ctx = p.ctx;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  kernelPath(ctx, w, h);
  ctx.fillStyle = YELLOW;
  ctx.fill();
  ctx.save();
  ctx.clip();
  ctx.fillStyle = ORANGE;
  ctx.fillRect(-w, -h * 0.74, w * 2, h * 0.34);
  ctx.fillStyle = WHITE;
  ctx.fillRect(-w, -h * 1.2, w * 2, h * 0.46);
  ctx.restore();
  kernelPath(ctx, w, h);
  ctx.strokeStyle = p.outline;
  ctx.lineWidth = Math.min(p.lineWidth, 0.9);
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.beginPath();
  ctx.ellipse(-w * 0.22, -h * 0.4, w * 0.09, h * 0.16, 0.25, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/**
 * A glowing ghost pumpkin: three soft lobes in pale lilac-white, faint ribs,
 * a little stalk and a kawaii face. (x, y) is its centre.
 */
function ghostSphere(p: Pen, x: number, y: number, r: number): CanvasGradient {
  const g = p.ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r * 1.2);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(0.6, '#f7f3ff');
  g.addColorStop(1, '#e0d6f5');
  return g;
}

function ghostPumpkin(p: Pen, x: number, y: number, rw: number, rh: number, faceK: number): void {
  p.glow(x, y, rw * 2.2, '#e6ffc0', 0.4);
  p.ellipse(x - rw * 0.42, y, rw * 0.58, rh, ghostSphere(p, x - rw * 0.5, y, rw * 0.6));
  p.ellipse(x + rw * 0.42, y, rw * 0.58, rh, ghostSphere(p, x + rw * 0.3, y, rw * 0.6));
  p.ellipse(x, y, rw * 0.5, rh * 1.02, ghostSphere(p, x - rw * 0.15, y, rw * 0.6));
  p.curve({ x: x - rw * 0.22, y: y - rh * 0.9 }, { x: x - rw * 0.6, y }, { x: x - rw * 0.22, y: y + rh * 0.9 }, shade(GHOST, -0.3), 0.6);
  p.curve({ x: x + rw * 0.24, y: y - rh * 0.9 }, { x: x + rw * 0.62, y }, { x: x + rw * 0.24, y: y + rh * 0.9 }, shade(GHOST, -0.3), 0.6);
  p.rect(x - 0.9, y - rh - 2.2, 1.8, 3.2, LEAF_DK);
  p.ellipse(x - rw * 0.22, y - rh * 0.5, rw * 0.14, rh * 0.24, WHITE, null, -0.3);
  face(p, x, y + rh * 0.12, faceK);
}

// ---------------------------------------------------------------------------
// Crops

/** Stage 0: a patch of tiny sprouts, each with a yellow kernel bud. */
function candyCornSprout(p: Pen): void {
  spots(p, grid(3, 0.24, 0.76)).forEach((s, k) => {
    p.shadow(s.x, s.y, 3.6, 1.6, 0.25);
    stalk(p, { x: s.x, y: s.y }, { x: s.x - 0.3, y: s.y - 2 }, { x: s.x + 0.2, y: s.y - 4 }, STEM, 0.8);
    leaf(p, s.x, s.y - 3.6, 4, -2.5, 1.8, LEAF);
    leaf(p, s.x, s.y - 3.6, 4, -0.65, 1.8, shade(LEAF, -0.06));
    p.circle(s.x + 0.2, s.y - 5.2, 1.1, YELLOW);
    if (k % 3 === 0) sparkle(p, s.x + 4, s.y - 7, 1.3);
  });
}

/** Stage 1: leafy stalks, each topped with an unopened kernel. */
function candyCornLeafy(p: Pen): void {
  for (const s of spots(p, QUINCUNX)) {
    p.shadow(s.x, s.y, 6, 2.7, 0.26);
    const mid = { x: s.x - 0.4, y: s.y - 8 };
    const top = { x: s.x + 0.4, y: s.y - 16 };
    stalk(p, { x: s.x, y: s.y }, mid, top, STEM, 1.2);
    leaf(p, s.x, s.y - 4, 6.5, -0.45, 2.4, LEAF);
    leaf(p, s.x, s.y - 4, 6.5, Math.PI + 0.45, 2.4, shade(LEAF, -0.08));
    leaf(p, mid.x, mid.y, 5.5, -1.0, 2.1, shade(LEAF, 0.06));
    leaf(p, mid.x, mid.y, 5.5, Math.PI + 0.9, 2.1, LEAF);
    kernel(p, top.x, top.y + 1, 4.4, 5.8);
  }
}

/** Stage 2: stalks bearing chunky candy-corn kernels, with faces and sparkles. */
function candyCornBearing(p: Pen): void {
  const pts = spots(p, QUINCUNX);
  pts.forEach((s, idx) => {
    const front = idx === pts.length - 1;
    p.shadow(s.x, s.y, 6.4, 2.8, 0.26);
    const mid = { x: s.x - 0.6, y: s.y - 12 };
    const top = { x: s.x + 0.4, y: s.y - 24 };
    stalk(p, { x: s.x, y: s.y }, mid, top, STEM, 1.5);
    leaf(p, s.x, s.y - 4, 8, -0.4, 3, LEAF);
    leaf(p, s.x, s.y - 4, 8, Math.PI + 0.4, 3, shade(LEAF, -0.08));
    leaf(p, mid.x, mid.y + 2, 6.5, Math.PI + 0.7, 2.6, shade(LEAF, -0.08));
    kernel(p, mid.x, mid.y + 0.6, 4.6, 6, -1.05);
    const bx = top.x;
    const by = top.y + 1.2;
    const w = front ? 8.4 : 6.6;
    const h = front ? 11.2 : 8.8;
    kernel(p, bx, by, w - 1.6, h - 1.2, -0.5);
    kernel(p, bx, by, w - 1.6, h - 1.2, 0.5);
    kernel(p, bx, by, w, h, 0);
    if (front || idx === 1) face(p, bx, by - h * 0.58, front ? 1.5 : 1.2);
    if (idx % 2 === 0) sparkle(p, bx + 6.2, by - h - 2, 1.5);
    if (idx === 3) sparkle(p, s.x - 7, s.y - 16, 1.2);
  });
}

/** Ghost pumpkin stage 0: tiny vine sprouts with pale buds. */
function ghostSprout(p: Pen): void {
  spots(p, grid(3, 0.24, 0.76)).forEach((s, k) => {
    p.shadow(s.x, s.y, 3.4, 1.5, 0.25);
    stalk(p, { x: s.x, y: s.y }, { x: s.x - 0.4, y: s.y - 2 }, { x: s.x + 0.4, y: s.y - 3.6 }, STEM, 0.8);
    leaf(p, s.x, s.y - 3.2, 3.8, -2.5, 1.7, LEAF);
    leaf(p, s.x, s.y - 3.2, 3.8, -0.6, 1.7, shade(LEAF, -0.06));
    if (k % 2 === 0) bud(p, s.x + 2.4, s.y - 0.8, 1.4);
  });
}

/** Ghost pumpkin stage 1: trailing vines with lobed leaves, pale buds and a lilac flower. */
function ghostLeafy(p: Pen): void {
  const vine = shade(LEAF_DK, -0.1);
  p.curve(p.iso(0.12, 0.34), p.iso(0.55, 0.02), p.iso(0.88, 0.46), vine, 1.1);
  p.curve(p.iso(0.22, 0.9), p.iso(0.5, 0.42), p.iso(0.8, 0.82), vine, 1.1);
  const tip = p.iso(0.5, 0.2);
  p.curve(tip, { x: tip.x + 3.4, y: tip.y - 2 }, { x: tip.x + 1.6, y: tip.y - 4.6 }, vine, 0.6);
  for (const s of spots(p, [
    [0.18, 0.36],
    [0.46, 0.16],
    [0.86, 0.48],
    [0.3, 0.84],
    [0.6, 0.56],
    [0.82, 0.84],
  ])) {
    const r = 3.6 + (s.i % 3) * 0.3;
    lobedLeaf(p, s.x, s.y - r * 0.6, r, s.i % 2 ? LEAF : shade(LEAF, 0.12));
  }
  for (const [u, v] of [
    [0.55, 0.42],
    [0.28, 0.66],
  ] as const) {
    const q = p.iso(u, v);
    bud(p, q.x, q.y - 2.4, 2.4);
  }
  const f = p.iso(0.72, 0.3);
  p.star(f.x, f.y - 4, 1.9, PURPLE_LT, shade(PURPLE, -0.4));
}

/** Ghost pumpkin stage 2: three glowing white ghost pumpkins, each with a face. */
function ghostBearing(p: Pen): void {
  for (const [u, v, rw, k] of [
    [0.32, 0.56, 9.2, 2.5],
    [0.64, 0.3, 8.4, 2.3],
    [0.7, 0.72, 9.6, 2.7],
  ] as const) {
    const pt = p.iso(u, v);
    const y = pt.y - rw * 0.66;
    p.shadow(pt.x, pt.y - 1, rw * 1.1, rw * 0.5, 0.28);
    ghostPumpkin(p, pt.x, y, rw, rw * 0.74, k);
    sparkle(p, pt.x + rw * 1.15, y - rw * 0.9, 1.2, '#f4ffe0');
  }
}

// ---------------------------------------------------------------------------
// Costume accessories (overlays, drawn at the animal head position)

/** Pointy purple witch hat with an orange band and a gold buckle. */
function witchHat(p: Pen): void {
  const cx = p.center.x;
  const base = p.center.y - 11;
  const cone = [
    { x: cx - 5.2, y: base - 0.8 },
    { x: cx + 5.2, y: base - 0.8 },
    { x: cx + 2.6, y: base - 16 },
  ];
  p.poly(cone, PURPLE);
  p.poly(
    [
      { x: cx + 0.6, y: base - 0.8 },
      { x: cx + 5.2, y: base - 0.8 },
      { x: cx + 2.6, y: base - 16 },
    ],
    shade(PURPLE, -0.22),
    null,
  );
  p.save();
  p.ctx.beginPath();
  p.ctx.moveTo(cone[0].x, cone[0].y);
  p.ctx.lineTo(cone[1].x, cone[1].y);
  p.ctx.lineTo(cone[2].x, cone[2].y);
  p.ctx.closePath();
  p.ctx.clip();
  p.rect(cx - 8, base - 6, 16, 2.6, ORANGE, null);
  p.restore();
  p.poly(cone, null);
  p.rect(cx - 1.4, base - 5.6, 2.8, 2.4, GOLD);
  p.ellipse(cx, base, 8, 2.2, PURPLE);
}

/** A tiny jack-o'-lantern hat with a stem and a leaf; its carved face glows lime. */
function pumpkinHat(p: Pen): void {
  const cx = p.center.x;
  const base = p.center.y - 11;
  leaf(p, cx + 1.4, base - 9.4, 4.2, -0.7, 1.8, LEAF);
  p.ellipse(cx - 2.8, base - 4.6, 4.4, 4.2, sphere(p, cx - 3.6, base - 5.6, 4.4, ORANGE_DK));
  p.ellipse(cx + 2.8, base - 4.6, 4.4, 4.2, sphere(p, cx + 2, base - 5.6, 4.4, ORANGE_DK));
  p.ellipse(cx, base - 4.6, 5.4, 4.8, sphere(p, cx - 1, base - 6, 5.4, ORANGE));
  p.rect(cx - 0.9, base - 9.6, 1.8, 3.2, '#6b8a2a');
  p.glow(cx, base - 4.4, 6, LIME, 0.3);
  p.poly(
    [
      { x: cx - 3.6, y: base - 6.4 },
      { x: cx - 1.2, y: base - 6.4 },
      { x: cx - 2.4, y: base - 4.2 },
    ],
    LIME,
    null,
  );
  p.poly(
    [
      { x: cx + 1.2, y: base - 6.4 },
      { x: cx + 3.6, y: base - 6.4 },
      { x: cx + 2.4, y: base - 4.2 },
    ],
    LIME,
    null,
  );
  p.curve({ x: cx - 2.8, y: base - 2.4 }, { x: cx, y: base - 0.2 }, { x: cx + 2.8, y: base - 2.4 }, LIME, 1);
}

/** A little black bat-wing bow with a purple knot. */
function batBow(p: Pen): void {
  const cx = p.center.x;
  const cy = p.center.y - 15;
  for (const s of [-1, 1]) {
    const X = (dx: number) => cx + s * dx;
    const ctx = p.ctx;
    ctx.beginPath();
    ctx.moveTo(X(0.8), cy - 0.8);
    ctx.quadraticCurveTo(X(4.6), cy - 5.6, X(8.2), cy - 4.6);
    ctx.quadraticCurveTo(X(6), cy - 2.6, X(6.4), cy - 0.6);
    ctx.quadraticCurveTo(X(5.2), cy + 1.4, X(3.6), cy + 2.6);
    ctx.quadraticCurveTo(X(2.2), cy + 0.6, X(0.8), cy + 0.6);
    ctx.closePath();
    ctx.fillStyle = '#2b1d2e';
    ctx.fill();
    ctx.strokeStyle = p.outline;
    ctx.lineWidth = 0.8;
    ctx.stroke();
    p.ellipse(X(4.4), cy - 2.2, 1, 0.5, 'rgba(255,255,255,0.35)', null, -0.3);
  }
  p.ellipse(cx, cy, 1.7, 2, sphere(p, cx - 0.5, cy - 0.6, 1.8, PURPLE_LT));
  p.circle(cx - 0.6, cy - 0.9, 0.35, WHITE, null);
}

// ---------------------------------------------------------------------------
// Trick-or-treater kids: 36px tall, facing bottom-left, big heads, two frames
// each. The walk frame swaps the legs into mid-stride and bounces the body.

const KID_H = 36;

function kidLegs(p: Pen, walk: boolean, leg: string): void {
  if (walk) {
    // mid-stride: the near leg reaches forward, the far one pushes back
    limb(p, { x: -2.4, y: -6 }, { x: -6, y: -2.6 }, 3, leg);
    p.ellipse(-6.6, -2, 2.4, 1.5, SHOE);
    limb(p, { x: 2.6, y: -6 }, { x: 4.4, y: -0.8 }, 3, leg);
    p.ellipse(4.8, -0.5, 2.4, 1.4, SHOE);
  } else {
    limb(p, { x: -2.6, y: -6 }, { x: -2.8, y: -1 }, 3, leg);
    p.ellipse(-3.2, -0.5, 2.4, 1.4, SHOE);
    limb(p, { x: 2.6, y: -6 }, { x: 2.6, y: -1 }, 3, leg);
    p.ellipse(2.4, -0.5, 2.4, 1.4, SHOE);
  }
}

function kidFace(p: Pen, hx: number, hy: number): void {
  eye(p, hx - 3.4, hy + 2.8, 1.7);
  eye(p, hx + 2.4, hy + 2.6, 1.6);
  blush(p, hx - 5.6, hy + 5.4, 1);
  blush(p, hx + 4.8, hy + 5.1, 0.9);
  p.curve({ x: hx - 1.2, y: hy + 5.4 }, { x: hx - 0.2, y: hy + 7 }, { x: hx + 0.9, y: hy + 5.4 }, INK, 0.8);
}

/** Big round head; `hair` (if any) is a cap across the top. */
function kidHead(p: Pen, hx: number, hy: number, hair: string | null): void {
  p.ball(hx, hy, 8.2, SKIN);
  if (hair) {
    p.ellipse(hx + 0.2, hy - 3.6, 8.6, 4.8, hair);
    p.ellipse(hx - 3, hy - 5.4, 2.4, 1.2, 'rgba(255,255,255,0.22)', null, -0.5);
  }
  kidFace(p, hx, hy);
}

/** The ghost sheet: a dome over the head, flared sides and a wavy hem. */
function sheetPath(ctx: CanvasRenderingContext2D, hx: number, hy: number): void {
  ctx.beginPath();
  ctx.moveTo(hx - 8.6, hy + 2.5);
  ctx.bezierCurveTo(hx - 9.6, hy - 14, hx + 9.6, hy - 14, hx + 8.6, hy + 2.5);
  ctx.quadraticCurveTo(hx + 10.6, hy + 8, hx + 10.8, -5);
  ctx.quadraticCurveTo(hx + 8.2, -2, hx + 5.4, -5);
  ctx.quadraticCurveTo(hx + 2.7, -2, hx, -5);
  ctx.quadraticCurveTo(hx - 2.7, -2, hx - 5.4, -5);
  ctx.quadraticCurveTo(hx - 8.2, -2, hx - 10.8, -5);
  ctx.quadraticCurveTo(hx - 10.6, hy + 8, hx - 8.6, hy + 2.5);
  ctx.closePath();
}

function kidGhost(p: Pen, walk: boolean): void {
  local(p, () => {
    const b = walk ? -0.9 : 0;
    p.shadow(0, 0, 9.5, 3.2, 0.25);
    kidLegs(p, walk, '#bfb0ea');

    const hx = -0.4;
    const hy = -22.5 + b;
    const ctx = p.ctx;
    sheetPath(ctx, hx, hy);
    ctx.fillStyle = p.vgrad(hy - 10, -5, WHITE, '#e6dcf8');
    ctx.fill();
    ctx.strokeStyle = p.outline;
    ctx.lineWidth = p.lineWidth;
    ctx.stroke();
    p.curve({ x: hx - 6.4, y: -12 + b }, { x: hx - 7.6, y: -8.5 + b }, { x: hx - 6, y: -5.6 }, '#d3c4ee', 0.7);
    p.curve({ x: hx + 6.2, y: -12 + b }, { x: hx + 7.2, y: -8.5 + b }, { x: hx + 5.6, y: -5.6 }, '#d3c4ee', 0.7);

    // eye holes, with cute big eyes peeking out
    for (const [ex, ey, rx] of [
      [hx - 3.2, hy + 3.2, 2.5],
      [hx + 2.8, hy + 2.9, 2.3],
    ] as const) {
      p.ellipse(ex, ey, rx, 2.8, '#3b2a52');
      p.circle(ex + 0.2, ey + 0.3, 1.8, WHITE, null);
      p.circle(ex + 0.5, ey + 0.5, 1.15, INK, null);
      p.circle(ex - 0.1, ey - 0.4, 0.45, WHITE, null);
    }
    blush(p, hx - 5.6, hy + 6.6, 1);
    blush(p, hx + 5, hy + 6.4, 0.9);
    p.curve({ x: hx - 1.2, y: hy + 7.2 }, { x: hx, y: hy + 8.4 }, { x: hx + 1.2, y: hy + 7.2 }, INK, 0.7);

    // sheet sleeve reaching for the pumpkin pail
    limb(p, { x: -7.4, y: -12 + b }, { x: -11, y: -17.2 + b }, 2.6, GHOST);
    const top = -13.4 + b;
    p.poly(
      [
        { x: -14.6, y: top },
        { x: -7.4, y: top },
        { x: -6.6, y: -6.4 + b },
        { x: -15.4, y: -6.4 + b },
      ],
      p.vgrad(top, -6.4 + b, '#ffb24a', ORANGE_DK),
    );
    p.line([{ x: -14.9, y: -10.4 + b }, { x: -7, y: -10.4 + b }], INK, 0.8);
    p.line([{ x: -15.2, y: -8.2 + b }, { x: -6.8, y: -8.2 + b }], INK, 0.8);
    p.curve({ x: -14.6, y: top }, { x: -11, y: top - 7.6 }, { x: -7.4, y: top }, INK, 0.9);
    p.circle(-11, top - 3.8, 1.7, GHOST);
  });
}

function kidPumpkin(p: Pen, walk: boolean): void {
  local(p, () => {
    const b = walk ? -0.9 : 0;
    p.shadow(0, 0, 10, 3.3, 0.25);
    kidLegs(p, walk, '#7a5538');

    // round pumpkin costume
    const by = -13 + b;
    p.ellipse(0, by, 10.2, 8.4, sphere(p, -3, by - 3, 10, ORANGE));
    p.curve({ x: -3.8, y: by - 7.8 }, { x: -7.6, y: by }, { x: -3.8, y: by + 7.8 }, ORANGE_DK, 0.7);
    p.curve({ x: 3.8, y: by - 7.8 }, { x: 7.6, y: by }, { x: 3.8, y: by + 7.8 }, ORANGE_DK, 0.7);
    p.ellipse(-4.6, by - 4.6, 2.2, 1.2, 'rgba(255,255,255,0.5)', null, -0.5);

    // head with a leafy hood and a sprout on top
    const hx = -0.4;
    const hy = -24 + b;
    kidHead(p, hx, hy, LEAF);
    p.line([{ x: hx + 1.6, y: hy - 8 }, { x: hx + 2.6, y: hy - 10.8 }], '#6b4a2a', 1.1);
    leaf(p, hx + 2.6, hy - 10.8, 3.8, -0.9, 1.9, LEAF);

    // candy bag in the left hand
    const bagTop = -15 + b;
    p.poly(
      [
        { x: -14.4, y: bagTop },
        { x: -7.2, y: bagTop },
        { x: -6.4, y: -6.6 + b },
        { x: -15.2, y: -6.6 + b },
      ],
      p.vgrad(bagTop, -6.6 + b, PURPLE_LT, PURPLE),
    );
    p.rect(-14.8, bagTop, 8.2, 1.9, '#d9c2ff');
    p.star(-10.6, -10.6 + b, 2.1, GOLD);
    p.curve({ x: -12.4, y: bagTop }, { x: -10.8, y: bagTop - 5 }, { x: -8.8, y: bagTop }, INK, 0.9);
    p.circle(-10.8, bagTop - 2.5, 1.5, SKIN);
  });
}

function kidWitch(p: Pen, walk: boolean): void {
  local(p, () => {
    const b = walk ? -0.9 : 0;
    p.shadow(0, 0, 9.5, 3.2, 0.25);
    // cape flaring out behind the body
    p.poly(
      [
        { x: -6, y: -17.6 + b },
        { x: 6, y: -17.6 + b },
        { x: 9.6, y: -4.6 },
        { x: -9.6, y: -4.6 },
      ],
      PURPLE_DK,
    );
    kidLegs(p, walk, '#3f2a66');
    p.roundRect(-6, -17.4 + b, 12, 11, 3, '#5c3a8f');
    p.rect(-6, -10.6 + b, 12, 1.8, ORANGE, null);

    // star wand in the right hand
    limb(p, { x: 5.4, y: -14.6 + b }, { x: 8.4, y: -11.4 + b }, 2.6, '#5c3a8f');
    limb(p, { x: 8.4, y: -11.6 + b }, { x: 11.6, y: -25 + b }, 1.2, '#9b6a3a');
    p.glow(12.2, -26.4 + b, 7, '#fff3a0', 0.7);
    p.star(12.2, -26.4 + b, 3.2, GOLD);
    sparkle(p, 15.8, -30.4 + b, 1.2);
    p.circle(8.6, -11.2 + b, 1.6, SKIN);

    // little black pail of lime potion in the left hand
    limb(p, { x: -5.4, y: -14.8 + b }, { x: -8.4, y: -12 + b }, 2.6, '#5c3a8f');
    p.poly(
      [
        { x: -14.4, y: -16 + b },
        { x: -6.8, y: -16 + b },
        { x: -7.6, y: -7 + b },
        { x: -13.6, y: -7 + b },
      ],
      '#3a2a4a',
    );
    p.ellipse(-10.6, -16 + b, 3.8, 1.2, LIME);
    p.curve({ x: -14.2, y: -16 + b }, { x: -10.6, y: -21 + b }, { x: -7, y: -16 + b }, INK, 0.9);
    p.circle(-8.4, -11.6 + b, 1.6, SKIN);

    // head, then the pointy hat on top
    const hx = -0.6;
    const hy = -23 + b;
    kidHead(p, hx, hy, '#3d2a4a');
    const cone = [
      { x: hx - 5.8, y: hy - 7 },
      { x: hx + 5.8, y: hy - 7 },
      { x: hx + 3.2, y: hy - 15 },
    ];
    p.poly(cone, PURPLE);
    p.save();
    p.ctx.beginPath();
    p.ctx.moveTo(cone[0].x, cone[0].y);
    p.ctx.lineTo(cone[1].x, cone[1].y);
    p.ctx.lineTo(cone[2].x, cone[2].y);
    p.ctx.closePath();
    p.ctx.clip();
    p.rect(hx - 8, hy - 9.6, 16, 2.2, ORANGE, null);
    p.restore();
    p.poly(cone, null);
    p.rect(hx - 1.2, hy - 9.8, 2.4, 2.2, GOLD);
    p.star(hx + 1.8, hy - 12.4, 1.1, GOLD, null);
    p.ellipse(hx + 0.2, hy - 7, 10.2, 2.4, PURPLE);
  });
}

/** Paint in the kid's own space: (0, 0) is the ground centre. */
function local(p: Pen, draw: () => void): void {
  const c = p.center;
  p.save();
  p.ctx.translate(c.x, c.y);
  draw();
  p.restore();
}

// ---------------------------------------------------------------------------
// FX

/** A cute round bat with big eyes and spread wings. Used as a flying particle. */
function bat(p: Pen): void {
  const ctx = p.ctx;
  p.glow(20, 22, 18, '#c9a6ff', 0.3);
  for (const s of [-1, 1]) {
    const X = (x: number) => 20 + s * (x - 20);
    ctx.beginPath();
    ctx.moveTo(X(18.2), 21);
    ctx.bezierCurveTo(X(13), 12.5, X(7), 8.6, X(2.2), 10.2);
    ctx.quadraticCurveTo(X(4.8), 13.2, X(5.4), 15.6);
    ctx.quadraticCurveTo(X(3.2), 16.6, X(4.2), 19.4);
    ctx.quadraticCurveTo(X(7.6), 19.6, X(9.2), 22.8);
    ctx.quadraticCurveTo(X(11.6), 23.6, X(13.6), 26.6);
    ctx.lineTo(X(18.2), 24.2);
    ctx.closePath();
    ctx.fillStyle = PURPLE;
    ctx.fill();
    ctx.strokeStyle = p.outline;
    ctx.lineWidth = 1;
    ctx.stroke();
    p.line([{ x: X(17), y: 21.5 }, { x: X(6), y: 14.6 }], PURPLE_DK, 0.6);
    p.line([{ x: X(16.4), y: 22.4 }, { x: X(9.4), y: 20.6 }], PURPLE_DK, 0.6);
    p.ellipse(X(9.4), 15.4, 2.6, 1.1, 'rgba(255,255,255,0.28)', null, -0.5 * s);
  }
  // ears
  p.poly(
    [
      { x: 15.4, y: 16.6 },
      { x: 16.2, y: 11.2 },
      { x: 19.4, y: 15.4 },
    ],
    '#4a3366',
  );
  p.poly(
    [
      { x: 24.6, y: 16.6 },
      { x: 23.8, y: 11.2 },
      { x: 20.6, y: 15.4 },
    ],
    '#4a3366',
  );
  p.ellipse(20, 21.6, 6.6, 6, sphere(p, 17.5, 18.8, 6.6, '#4a3366'));
  // big shiny eyes
  for (const [ex, ey] of [
    [16.8, 20.2],
    [23.2, 20.2],
  ] as const) {
    p.circle(ex, ey, 2.6, WHITE);
    p.circle(ex + 0.5, ey + 0.6, 1.6, INK, null);
    p.circle(ex - 0.2, ey - 0.2, 0.55, WHITE, null);
  }
  p.ellipse(14.6, 24.4, 1.6, 1, 'rgba(255,120,160,0.7)', null);
  p.ellipse(25.4, 24.4, 1.6, 1, 'rgba(255,120,160,0.7)', null);
  p.curve({ x: 18.6, y: 24.8 }, { x: 20, y: 26.2 }, { x: 21.4, y: 24.8 }, INK, 0.7);
  sparkle(p, 5, 6, 1.8, '#f4ffe0');
  sparkle(p, 35, 7, 1.4, '#f4ffe0');
}

// ---------------------------------------------------------------------------
// Icons (flat 40x40)

function iconCandyCorn(p: Pen): void {
  p.shadow(20, 36, 11, 3, 0.25);
  leaf(p, 17, 33, 7, Math.PI + 0.5, 2.8, LEAF);
  leaf(p, 23, 33, 7, -0.5, 2.8, shade(LEAF, -0.06));
  kernel(p, 20, 34, 22, 29);
  face(p, 20, 34 - 29 * 0.58, 3.3);
  sparkle(p, 6, 9, 2.2);
  sparkle(p, 33, 12, 1.6);
}

function iconGhostPumpkin(p: Pen): void {
  p.shadow(20, 35, 13, 3, 0.25);
  ghostPumpkin(p, 20, 23, 12.6, 10.4, 4.8);
  leaf(p, 23, 13.4, 6, -1.0, 2.4, LEAF);
  sparkle(p, 6, 10, 2, '#f4ffe0');
  sparkle(p, 34, 30, 1.5, '#f4ffe0');
}

/** The candy: a striped wrapped sweet with twisted ends, and a lollipop peeking out behind. */
function iconCandy(p: Pen): void {
  p.shadow(20, 36, 12, 3, 0.25);
  // lollipop stick, then its lime head with a purple swirl
  p.line([{ x: 25, y: 18 }, { x: 22, y: 31 }], p.outline, 3.2);
  p.line([{ x: 25, y: 18 }, { x: 22, y: 31 }], '#fff4e0', 1.5);
  p.circle(28.5, 10.5, 7.4, sphere(p, 28.5, 10.5, 7.4, LIME));
  const ctx = p.ctx;
  ctx.beginPath();
  for (let i = 0; i <= 44; i++) {
    const a = i * 0.34;
    const r = 0.5 + i * 0.13;
    const x = 28.5 + Math.cos(a) * r;
    const y = 10.5 + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.strokeStyle = PURPLE;
  ctx.lineWidth = 1.2;
  ctx.stroke();
  p.circle(28.5, 10.5, 7.4, null, p.outline);

  // twisted wrapper ends, drawn behind the sweet
  p.poly(
    [
      { x: 12.8, y: 19.4 },
      { x: 3.8, y: 13.6 },
      { x: 5.4, y: 21.2 },
      { x: 3.6, y: 27.2 },
      { x: 12.8, y: 24.8 },
    ],
    PURPLE,
  );
  p.poly(
    [
      { x: 25.2, y: 19.4 },
      { x: 34.2, y: 13.6 },
      { x: 32.6, y: 21.2 },
      { x: 34.4, y: 27.2 },
      { x: 25.2, y: 24.8 },
    ],
    ORANGE,
  );
  p.line([{ x: 5.2, y: 16.6 }, { x: 7.2, y: 18.8 }, { x: 5.4, y: 20.8 }], shade(PURPLE, -0.35), 0.7);
  p.line([{ x: 4.4, y: 23.2 }, { x: 6.4, y: 25.2 }, { x: 4.6, y: 26.4 }], shade(PURPLE, -0.35), 0.7);
  p.line([{ x: 34.8, y: 16.6 }, { x: 32.8, y: 18.8 }, { x: 34.6, y: 20.8 }], shade(ORANGE, -0.3), 0.7);
  p.line([{ x: 35.6, y: 23.2 }, { x: 33.6, y: 25.2 }, { x: 35.4, y: 26.4 }], shade(ORANGE, -0.3), 0.7);

  // the striped sweet itself
  const bx = 20;
  const by = 22.4;
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(bx, by, 8.6, 7, 0, 0, Math.PI * 2);
  ctx.fillStyle = ORANGE;
  ctx.fill();
  ctx.clip();
  for (let i = -6; i <= 6; i += 2) {
    ctx.beginPath();
    ctx.moveTo(bx + i * 2.6 - 8, by + 8);
    ctx.lineTo(bx + i * 2.6 + 8, by - 8);
    ctx.strokeStyle = PURPLE;
    ctx.lineWidth = 2.2;
    ctx.stroke();
  }
  ctx.restore();
  p.ellipse(bx, by, 8.6, 7, null, p.outline);
  p.ellipse(15.6, 18.6, 3, 1.2, 'rgba(255,255,255,0.85)', null, -0.5);
  sparkle(p, 6.5, 6.5, 2.2);
  sparkle(p, 34, 34, 1.6);
}

/**
 * A county-fair rosette: a ruffled, pleated disc with a centre medallion and
 * two tails. The white ribbon is pearly cream with a gold centre.
 */
function ribbon(p: Pen, base: string, pearl: boolean): void {
  const cx = 20;
  const cy = 15;
  const tail = shade(base, -0.22);
  p.poly(
    [
      { x: 14.6, y: 20 },
      { x: 9.6, y: 37 },
      { x: 14.8, y: 34 },
      { x: 18.4, y: 38 },
      { x: 19.4, y: 22 },
    ],
    tail,
  );
  p.poly(
    [
      { x: 25.4, y: 20 },
      { x: 30.4, y: 37 },
      { x: 25.2, y: 34 },
      { x: 21.6, y: 38 },
      { x: 20.6, y: 22 },
    ],
    tail,
  );

  const N = 16;
  const ruffle = (i: number) => {
    const a = (i / N) * Math.PI * 2;
    return { x: cx + Math.cos(a) * 10.4, y: cy + Math.sin(a) * 10.4 };
  };
  // outline pass for the ruffled edge, then the fill pass
  for (let i = 0; i < N; i++) p.circle(ruffle(i).x, ruffle(i).y, 3.9, p.outline, null);
  for (let i = 0; i < N; i++) {
    const q = ruffle(i);
    p.circle(q.x, q.y, 3.3, i % 2 ? base : shade(base, -0.1), null);
  }
  p.circle(cx, cy, 10.2, sphere(p, cx - 3, cy - 3, 10.2, base), p.outline);
  // pleats radiating from the centre
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2;
    p.line(
      [
        { x: cx + Math.cos(a) * 6.6, y: cy + Math.sin(a) * 6.6 },
        { x: cx + Math.cos(a) * 9.8, y: cy + Math.sin(a) * 9.8 },
      ],
      shade(base, -0.28),
      0.6,
    );
  }
  p.ellipse(cx - 5, cy - 5.6, 2.6, 1.2, 'rgba(255,255,255,0.45)', null, -0.6);

  // centre medallion
  if (pearl) {
    p.circle(cx, cy, 5.6, sphere(p, cx - 1.5, cy - 1.5, 5.6, GOLD), '#b7801c');
    p.ellipse(cx - 1.6, cy - 2, 1.8, 0.9, 'rgba(255,255,255,0.7)', null, -0.5);
  } else {
    p.circle(cx, cy, 5.6, '#fff7e6', '#c98a1a');
    p.circle(cx, cy, 3.6, null, '#e8b040');
    p.ellipse(cx - 1.6, cy - 2, 1.6, 0.8, 'rgba(255,255,255,0.8)', null, -0.5);
  }
}

// ---------------------------------------------------------------------------
// Exports

export const sprites: SpriteSpec[] = [
  { key: 'crop:candy_corn:0', fw: 1, fh: 1, height: 40, paint: (p) => thin(p, 0.7, () => candyCornSprout(p)) },
  { key: 'crop:candy_corn:1', fw: 1, fh: 1, height: 40, paint: (p) => thin(p, 0.9, () => candyCornLeafy(p)) },
  { key: 'crop:candy_corn:2', fw: 1, fh: 1, height: 40, paint: (p) => thin(p, 0.9, () => candyCornBearing(p)) },
  { key: 'crop:ghost_pumpkin:0', fw: 1, fh: 1, height: 26, paint: (p) => thin(p, 0.7, () => ghostSprout(p)) },
  { key: 'crop:ghost_pumpkin:1', fw: 1, fh: 1, height: 26, paint: (p) => thin(p, 0.9, () => ghostLeafy(p)) },
  { key: 'crop:ghost_pumpkin:2', fw: 1, fh: 1, height: 26, paint: (p) => thin(p, 0.9, () => ghostBearing(p)) },

  { key: 'npc:kid_ghost', fw: 1, fh: 1, height: KID_H, paint: (p) => kidGhost(p, false) },
  { key: 'npc:kid_ghost_walk', fw: 1, fh: 1, height: KID_H, paint: (p) => kidGhost(p, true) },
  { key: 'npc:kid_pumpkin', fw: 1, fh: 1, height: KID_H, paint: (p) => kidPumpkin(p, false) },
  { key: 'npc:kid_pumpkin_walk', fw: 1, fh: 1, height: KID_H, paint: (p) => kidPumpkin(p, true) },
  { key: 'npc:kid_witch', fw: 1, fh: 1, height: KID_H, paint: (p) => kidWitch(p, false) },
  { key: 'npc:kid_witch_walk', fw: 1, fh: 1, height: KID_H, paint: (p) => kidWitch(p, true) },

  { key: 'costume:witch_hat', fw: 1, fh: 1, height: 20, paint: witchHat },
  { key: 'costume:pumpkin_hat', fw: 1, fh: 1, height: 20, paint: pumpkinHat },
  { key: 'costume:bat_bow', fw: 1, fh: 1, height: 20, paint: batBow },
];

export const icons: IconSpec[] = [
  { key: 'icon:candy_corn', paint: iconCandyCorn },
  { key: 'icon:ghost_pumpkin', paint: iconGhostPumpkin },
  { key: 'icon:candy', paint: iconCandy },
  { key: 'icon:ribbon_yellow', paint: (p) => ribbon(p, YELLOW, false) },
  { key: 'icon:ribbon_white', paint: (p) => ribbon(p, '#fffaf0', true) },
  { key: 'icon:ribbon_red', paint: (p) => ribbon(p, '#e2483d', false) },
  { key: 'icon:ribbon_blue', paint: (p) => ribbon(p, '#3f8fe0', false) },
  { key: 'fx:bat', paint: bat },
];
