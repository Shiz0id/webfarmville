// Valentine's, St. Patrick's and Star Festival (Tanabata) event art: love letters
// and sweetheart roses, cupid and mail-carrier visitors, lucky clovers and a
// leprechaun, star melons and a wish-strip kid. Same house style as the rest of
// the art: chunky rounded shapes, dark outlines, top-left light, kawaii faces.
import { type IconSpec, type Pen, type SpriteSpec, shade } from './kit';

interface P2 {
  x: number;
  y: number;
}

const INK = '#2b1d14';
const EYE = '#2b1b12';
const WHITE = '#ffffff';
const BLUSH = 'rgba(255,120,150,0.5)';
const SKIN = '#ffdcc2';
const SHOE = '#3b2a45';

const PINK = '#ff8fb8';
const PINK_LT = '#ffc4da';
const PINK_DK = '#e0507f';
const RED = '#e8344e';
const ROSE = '#ff6f9c';
const LEAF = '#8fd14f';
const LEAF_DK = '#4f8f2c';
const STEM = '#9ad85a';
const CLOVER = '#5cc46a';
const CLOVER_LT = '#a6e88f';
const CLOVER_DK = '#2c7d42';
const GOLD = '#ffd23f';
const GOLD_DK = '#c98a1a';
const GREEN_COAT = '#2e9c4e';
const GREEN_HAT = '#2fa35a';
const HAIR_RED = '#c9542a';
const HAIR_BROWN = '#7a4a2e';
const HAIR_DARK = '#2a1f3a';
const NAVY = '#3a6fb8';
const CAP = '#2d4f8a';
const ROBE = '#3b4fb0';
const ROBE_DK = '#25357d';
const MELON = '#ffd84a';
const MELON_DK = '#e89a1c';
const VINE = '#7fbf4a';

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

/** A quadratic bezier point. */
function qb(a: P2, c: P2, b: P2, t: number): P2 {
  const u = 1 - t;
  return { x: u * u * a.x + 2 * u * t * c.x + t * t * b.x, y: u * u * a.y + 2 * u * t * c.y + t * t * b.y };
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

/** Chunky face for small things (candy-sized hearts, clovers, melons). s scales it. */
function miniFace(p: Pen, x: number, y: number, s: number): void {
  for (const sx of [-1, 1]) {
    const ex = x + sx * 1.9 * s;
    p.ellipse(ex, y - 0.2 * s, 0.8 * s, 1 * s, EYE, null);
    p.circle(ex - 0.28 * s, y - 0.6 * s, 0.3 * s, WHITE, null);
    p.ellipse(x + sx * 2.9 * s, y + 0.9 * s, 0.7 * s, 0.45 * s, BLUSH, null);
  }
  p.curve({ x: x - 1 * s, y: y + 1 * s }, { x, y: y + 2.2 * s }, { x: x + 1 * s, y: y + 1 * s }, EYE, 0.6);
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

/** A five-point star outline (points, not drawn). */
function starPts(x: number, y: number, r: number, ratio = 0.5): P2[] {
  const out: P2[] = [];
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
    const rr = i % 2 === 0 ? r : r * ratio;
    out.push({ x: x + Math.cos(a) * rr, y: y + Math.sin(a) * rr });
  }
  return out;
}

function starShape(p: Pen, x: number, y: number, r: number, fill: string | CanvasGradient, stroke: string | null = p.outline, ratio = 0.5): void {
  p.poly(starPts(x, y, r, ratio), fill, stroke);
}

/**
 * A heart centred on (x, y) and w px wide. Pen.heart's anchor sits at the tip-side
 * of the heart, so this shifts it so the visual middle lands on (x, y).
 */
function heartAt(p: Pen, x: number, y: number, w: number, fill: string | CanvasGradient, stroke: string | null = p.outline): void {
  const s = w / 1.5;
  p.heart(x, y - 0.15 * s, s, fill, stroke);
}

/**
 * A heart-shaped clover leaf whose point touches the centre (cx, cy), lying out
 * along angle `a`. `s` is the heart's size: the leaf runs about 1.5 s from the centre.
 */
function cloverLeaf(p: Pen, cx: number, cy: number, s: number, a: number, fill: string): void {
  const dist = s * 0.9 + 0.8;
  const ctx = p.ctx;
  ctx.save();
  ctx.translate(cx + Math.cos(a) * dist, cy + Math.sin(a) * dist);
  ctx.rotate(a + Math.PI / 2);
  p.heart(0, 0, s, fill);
  p.ellipse(-0.36 * s, -0.42 * s, 0.2 * s, 0.1 * s, 'rgba(255,255,255,0.55)', null, -0.5);
  ctx.restore();
}

const TREFOIL_ANGLES = [-Math.PI / 2, Math.PI / 6, (5 * Math.PI) / 6];
const FOUR_ANGLES = [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2];

/** A three-leaf shamrock sprig. */
function trefoil(p: Pen, cx: number, cy: number, s: number, color: string): void {
  for (const a of TREFOIL_ANGLES) cloverLeaf(p, cx, cy, s, a, color);
}

/** A four-leaf clover, leaves meeting in the middle. */
function fourLeaf(p: Pen, cx: number, cy: number, s: number, color: string): void {
  for (const a of FOUR_ANGLES) cloverLeaf(p, cx, cy, s, a, color);
}

/** A paper letter tilted by ang, with a flap line. */
function letter(p: Pen, x: number, y: number, ang: number, color = PINK_LT): void {
  const ctx = p.ctx;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(ang);
  p.rect(-2.4, -1.7, 4.8, 3.4, color, p.outline);
  p.line([{ x: -2.4, y: -1.7 }, { x: 0, y: 0.4 }, { x: 2.4, y: -1.7 }], shade(color, -0.25), 0.5);
  ctx.restore();
}

/** A paper wish strip (tanzaku) hanging from (x, y) on a short string, tilted by ang. */
function wishStrip(p: Pen, x: number, y: number, color: string, ang = 0, k = 1): void {
  const ctx = p.ctx;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(ang);
  ctx.scale(k, k);
  p.line([{ x: 0, y: -1.4 }, { x: 0, y: 0.4 }], p.outline, 0.4);
  p.poly(
    [
      { x: -1.6, y: 0.4 },
      { x: 1.6, y: 0.4 },
      { x: 1.6, y: 7 },
      { x: 0, y: 8.4 },
      { x: -1.6, y: 7 },
    ],
    color,
    p.outline,
    0.6,
  );
  p.line([{ x: -0.9, y: 2.4 }, { x: 0.9, y: 2.4 }], 'rgba(60,30,50,0.45)', 0.45);
  p.line([{ x: -0.9, y: 4 }, { x: 0.9, y: 4 }], 'rgba(60,30,50,0.45)', 0.45);
  ctx.restore();
}

// ---------------------------------------------------------------------------
// Valentine's: love letter icon, sweetheart roses

function iconLoveLetter(p: Pen): void {
  // hearts floating around the envelope
  heartAt(p, 7, 8, 6, PINK_LT);
  heartAt(p, 33, 6.5, 4.6, PINK);
  heartAt(p, 35, 32, 4.2, PINK_LT);
  heartAt(p, 4.5, 31, 3.2, PINK);
  p.shadow(20, 35, 14, 3, 0.25);
  // envelope body
  p.roundRect(4.5, 11, 31, 22, 3.5, p.vgrad(11, 33, '#ffd6e6', '#ff9ec2'));
  // the flap, folding down to a point
  p.poly(
    [
      { x: 5.2, y: 11.6 },
      { x: 20, y: 24.6 },
      { x: 34.8, y: 11.6 },
    ],
    PINK,
  );
  p.line(
    [
      { x: 7.4, y: 13.6 },
      { x: 20, y: 24 },
      { x: 32.6, y: 13.6 },
    ],
    'rgba(255,255,255,0.55)',
    0.8,
  );
  // red heart seal
  heartAt(p, 20, 23.6, 8.4, sphere(p, 18, 22, 4.5, RED), INK);
  p.ellipse(17.2, 21.4, 1.3, 0.6, 'rgba(255,255,255,0.85)', null, -0.5);
  sparkle(p, 37, 19, 1.8, '#fffbe6');
  sparkle(p, 2.6, 22, 1.4, '#fffbe6');
}

function iconSweetheartRose(p: Pen): void {
  p.shadow(20, 36, 10, 2.6, 0.25);
  stalk(p, { x: 20, y: 35 }, { x: 18.4, y: 29 }, { x: 20, y: 24 }, STEM, 2);
  leaf(p, 19.2, 29.6, 8, -2.6, 3, LEAF);
  leaf(p, 20.2, 31.4, 8, -0.5, 3, shade(LEAF, -0.08));
  // the heart-shaped rose, with a petal swirl
  heartAt(p, 20, 15.6, 27, sphere(p, 14.5, 9, 15, ROSE));
  const sc = p.ctx;
  sc.strokeStyle = PINK_DK;
  sc.lineWidth = 1.1;
  sc.beginPath();
  sc.arc(20, 13, 4.8, -0.4, 3.6);
  sc.stroke();
  sc.beginPath();
  sc.arc(20, 13, 2.4, 2.6, 6.6);
  sc.stroke();
  p.circle(20.2, 12.8, 0.7, PINK_DK, null);
  p.ellipse(11.8, 8.4, 3.2, 1.6, 'rgba(255,255,255,0.5)', null, -0.6);
  sparkle(p, 33, 7, 2);
  sparkle(p, 6.8, 29, 1.6);
}

function roseSprout(p: Pen): void {
  spots(p, grid(3, 0.24, 0.76)).forEach((s, k) => {
    p.shadow(s.x, s.y, 3.6, 1.6, 0.25);
    stalk(p, { x: s.x, y: s.y }, { x: s.x - 0.3, y: s.y - 2 }, { x: s.x + 0.2, y: s.y - 4 }, STEM, 0.8);
    leaf(p, s.x, s.y - 3.6, 4, -2.5, 1.8, LEAF);
    leaf(p, s.x, s.y - 3.6, 4, -0.65, 1.8, shade(LEAF, -0.06));
    p.circle(s.x + 0.2, s.y - 5.4, 1.3, PINK);
    if (k % 3 === 0) sparkle(p, s.x + 4, s.y - 7, 1.3);
  });
}

function roseLeafy(p: Pen): void {
  for (const s of spots(p, QUINCUNX)) {
    p.shadow(s.x, s.y, 6.4, 2.8, 0.26);
    p.foliage(s.x, s.y - 6, 5.2, LEAF, s.i + 3, 6);
    p.ball(s.x - 2.8, s.y - 11.2, 1.8, PINK_LT);
    p.ball(s.x + 2.6, s.y - 8.8, 1.6, PINK);
  }
}

function roseBearing(p: Pen): void {
  const pts = spots(p, QUINCUNX);
  pts.forEach((s, idx) => {
    const front = idx === pts.length - 1;
    p.shadow(s.x, s.y, 6.6, 2.9, 0.26);
    p.foliage(s.x, s.y - 5.2, 4.9, LEAF, idx + 4, 6);
    const w = front ? 11.4 : 8.6;
    const hx = s.x + (idx % 2 ? 1.2 : -0.8);
    const hy = s.y - 15.4 - (front ? 1.6 : 0);
    stalk(p, { x: s.x, y: s.y - 7 }, { x: s.x - 0.4, y: s.y - 10 }, { x: hx, y: hy + 3 }, STEM, 1.3);
    if (front) p.glow(hx, hy, 11, '#ffd6e6', 0.45);
    heartAt(p, hx, hy, w, sphere(p, hx - w * 0.2, hy - w * 0.2, w * 0.6, ROSE));
    p.curve({ x: hx - w * 0.18, y: hy - w * 0.1 }, { x: hx + w * 0.22, y: hy - w * 0.3 }, { x: hx + w * 0.06, y: hy + w * 0.12 }, PINK_DK, 0.6);
    p.ellipse(hx - w * 0.25, hy - w * 0.3, w * 0.12, w * 0.07, 'rgba(255,255,255,0.6)', null, -0.5);
    if (front) miniFace(p, hx, hy + 0.5, 1.1);
    if (idx % 2 === 0) sparkle(p, hx + w * 0.7, hy - w * 0.55, 1.3);
  });
}

// ---------------------------------------------------------------------------
// St. Patrick's: lucky clover icon, four-leaf crop, fx

function iconLuckyClover(p: Pen): void {
  p.glow(20, 18, 19, '#c8ffd4', 0.5);
  p.shadow(20, 36, 8, 2.4, 0.25);
  stalk(p, { x: 20, y: 25 }, { x: 20.6, y: 30 }, { x: 22, y: 36 }, STEM, 2);
  leaf(p, 21.2, 31, 6, -0.3, 2.6, LEAF);
  const cx = 20;
  const cy = 17;
  const d = 8.2;
  const r = 6.6;
  // one merged outline for the four glossy lobes
  for (const a of FOUR_ANGLES) p.circle(cx + Math.cos(a) * d, cy + Math.sin(a) * d, r + 0.9, p.outline, null);
  for (const a of FOUR_ANGLES) {
    const x = cx + Math.cos(a) * d;
    const y = cy + Math.sin(a) * d;
    p.circle(x, y, r, sphere(p, x, y, r, CLOVER), null);
    p.ellipse(x - r * 0.38, y - r * 0.5, r * 0.3, r * 0.14, 'rgba(255,255,255,0.75)', null, -0.5);
  }
  p.circle(cx, cy, 3.4, GOLD, p.outline);
  p.ellipse(cx - 1.1, cy - 1.2, 1, 0.5, 'rgba(255,255,255,0.8)', null, -0.5);
  sparkle(p, 34, 5, 2.6, '#fffbe6');
  sparkle(p, 6, 31, 1.6, '#fffbe6');
}

function iconFourLeafClover(p: Pen): void {
  // a mound of grass with two small shamrocks, and a big four-leaf in front
  p.shadow(20, 36, 15, 3.2, 0.25);
  p.ellipse(20, 33, 14, 4.6, CLOVER_DK);
  trefoil(p, 8.5, 30.5, 3.8, CLOVER_LT);
  trefoil(p, 31.5, 30.5, 3.8, CLOVER_LT);
  stalk(p, { x: 20, y: 30 }, { x: 19.6, y: 24 }, { x: 20, y: 17 }, STEM, 1.6);
  fourLeaf(p, 20, 15.5, 6, CLOVER);
  p.ellipse(16.2, 9.4, 2.8, 1.2, 'rgba(255,255,255,0.45)', null, -0.6);
  p.circle(20, 15.5, 1.8, GOLD);
  sparkle(p, 33, 6, 2.2, '#fff4b8');
  sparkle(p, 6, 12, 1.5, '#fff4b8');
  sparkle(p, 32, 20, 1.2, '#fff4b8');
}

function cloverSprout(p: Pen): void {
  spots(p, grid(3, 0.24, 0.76)).forEach((s, k) => {
    p.shadow(s.x, s.y, 3.4, 1.5, 0.25);
    stalk(p, { x: s.x, y: s.y }, { x: s.x - 0.2, y: s.y - 2 }, { x: s.x + 0.2, y: s.y - 3.4 }, STEM, 0.8);
    trefoil(p, s.x + 0.2, s.y - 4.6, 2.4, LEAF);
    if (k % 3 === 0) sparkle(p, s.x + 4.2, s.y - 7, 1.1, '#fffbe6');
  });
}

function cloverLeafy(p: Pen): void {
  for (const s of spots(p, QUINCUNX)) {
    p.shadow(s.x, s.y, 6, 2.7, 0.26);
    p.foliage(s.x, s.y - 4.6, 4.6, CLOVER, s.i + 2, 6);
    trefoil(p, s.x - 2.6, s.y - 11.2, 2.8, CLOVER_LT);
    trefoil(p, s.x + 2.6, s.y - 9.2, 2.3, CLOVER_LT);
  }
}

function cloverBearing(p: Pen): void {
  const pts = spots(p, QUINCUNX);
  pts.forEach((s, idx) => {
    const front = idx === pts.length - 1;
    p.shadow(s.x, s.y, 6.4, 2.8, 0.26);
    p.foliage(s.x, s.y - 4, 4.6, shade(CLOVER, -0.12), s.i + 9, 6);
    const cx = s.x + (idx % 2 ? 1 : -0.6);
    const cy = s.y - 15.4 - (front ? 2 : 0);
    stalk(p, { x: s.x, y: s.y - 5 }, { x: s.x - 0.6, y: s.y - 10 }, { x: cx, y: cy + 5 }, STEM, 1.2);
    if (front) p.glow(cx, cy, 10, '#fff3a0', 0.4);
    fourLeaf(p, cx, cy, 4.4, CLOVER);
    if (front) {
      p.circle(cx, cy, 3.6, '#fff7c2', p.outline);
      miniFace(p, cx, cy + 0.3, 1.05);
    } else {
      p.circle(cx, cy, 1, GOLD, null);
    }
    sparkle(p, cx + 7, cy - 6, idx % 2 ? 1.6 : 2.1, '#ffe27a');
    if (idx % 2 === 0) sparkle(p, cx - 7.4, cy + 2.6, 1.2, '#ffe27a');
  });
}

function fxClover(p: Pen): void {
  p.glow(20, 19, 19, '#c8ffd4', 0.5);
  p.curve({ x: 20, y: 18 }, { x: 18.6, y: 27 }, { x: 20.6, y: 37 }, LEAF_DK, 1.8);
  for (const a of TREFOIL_ANGLES) cloverLeaf(p, 20, 17, 10, a, CLOVER);
  sparkle(p, 34, 6, 2.2, '#fffbe0');
  sparkle(p, 5, 30, 1.6, '#fffbe0');
}

// ---------------------------------------------------------------------------
// Tanabata: wish star icon, star melon crop, fx

function iconWishStar(p: Pen): void {
  p.glow(19, 19, 19, '#fff1a0', 0.5);
  p.shadow(20, 37, 11, 2.8, 0.25);
  // the wish strip, tied on with a little red knot
  wishStrip(p, 30.6, 23.4, '#ff7aa8', 0.22, 1.35);
  starShape(p, 19, 19.6, 15.2, p.vgrad(4, 35, '#fff6b0', '#ffb524'), '#b8740e', 0.52);
  p.ellipse(11.4, 11.2, 4, 1.7, 'rgba(255,255,255,0.7)', null, -0.6);
  p.circle(28.2, 26.2, 1.6, RED, p.outline);
  face(p, 19, 21, 2.6);
  sparkle(p, 5, 6, 2.2);
  sparkle(p, 35, 12, 1.4);
}

function melonSprout(p: Pen): void {
  spots(p, grid(3, 0.24, 0.76)).forEach((s, k) => {
    p.shadow(s.x, s.y, 3.4, 1.5, 0.25);
    stalk(p, { x: s.x, y: s.y }, { x: s.x - 0.5, y: s.y - 2 }, { x: s.x + 0.3, y: s.y - 3.6 }, VINE, 0.8);
    leaf(p, s.x + 0.3, s.y - 3.4, 3.8, -2.4, 1.8, LEAF);
    leaf(p, s.x + 0.3, s.y - 3.4, 3.8, -0.7, 1.8, shade(LEAF, -0.06));
    p.curve({ x: s.x - 0.5, y: s.y - 2 }, { x: s.x - 2.6, y: s.y - 2.4 }, { x: s.x - 2, y: s.y - 0.4 }, LEAF_DK, 0.5);
    if (k % 2 === 0) p.ball(s.x - 1.4, s.y - 1.4, 1.2, '#e4f59a');
  });
}

function melonLeafy(p: Pen): void {
  for (const s of spots(p, QUINCUNX)) {
    p.shadow(s.x, s.y, 6, 2.7, 0.26);
    const mid = { x: s.x - 0.4, y: s.y - 8 };
    const top = { x: s.x + 0.4, y: s.y - 16 };
    stalk(p, { x: s.x, y: s.y }, mid, top, VINE, 1.2);
    leaf(p, s.x, s.y - 4, 6.5, -0.45, 2.4, LEAF);
    leaf(p, s.x, s.y - 4, 6.5, Math.PI + 0.45, 2.4, shade(LEAF, -0.08));
    leaf(p, mid.x, mid.y, 5, -1.0, 2.1, shade(LEAF, 0.06));
    p.ball(top.x + 1.6, top.y + 2.6, 2.9, '#c2e866');
    sparkle(p, top.x + 1.6, top.y + 2.2, 0.9, '#f7ffd6');
  }
}

function melonBearing(p: Pen): void {
  const pts = spots(p, QUINCUNX);
  pts.forEach((s, idx) => {
    const front = idx === pts.length - 1;
    p.shadow(s.x, s.y, 6.4, 2.8, 0.26);
    const mid = { x: s.x - 0.6, y: s.y - 9 };
    const mx = s.x + 0.4;
    const my = s.y - 18.5;
    const r = front ? 6.6 : 5.4;
    stalk(p, { x: s.x, y: s.y }, mid, { x: mx, y: my + r * 0.5 }, VINE, 1.4);
    leaf(p, mid.x, mid.y + 2, 6.4, Math.PI + 0.7, 2.6, shade(LEAF, -0.08));
    leaf(p, mid.x, mid.y, 5.6, -0.9, 2.3, LEAF);
    p.glow(mx, my, r * 2.6, '#fff3a0', front ? 0.6 : 0.4);
    p.ball(mx, my, r, MELON);
    // melon stripes and star-shaped markings, kept to the right of the face
    p.curve({ x: mx - r * 0.1, y: my - r }, { x: mx - r * 0.6, y: my }, { x: mx - r * 0.1, y: my + r }, MELON_DK, 0.5);
    starShape(p, mx + r * 0.45, my - r * 0.35, r * 0.3, '#ff9f2e', shade(MELON_DK, -0.2), 0.5);
    starShape(p, mx + r * 0.2, my + r * 0.55, r * 0.22, '#ff9f2e', shade(MELON_DK, -0.2), 0.5);
    if (front) {
      miniFace(p, mx - r * 0.2, my + 0.2, 0.95);
      sparkle(p, mx + r * 1.15, my - r * 0.9, 1.4, '#fffbe0');
    }
    if (idx % 2 === 0) sparkle(p, mx - r * 1.1, my - r * 0.8, 1.1, '#fffbe0');
  });
}

function iconStarMelon(p: Pen): void {
  p.glow(20, 22, 18, '#fff3a0', 0.5);
  p.shadow(20, 36, 12, 3, 0.25);
  stalk(p, { x: 20, y: 11 }, { x: 19.4, y: 8 }, { x: 21, y: 6 }, VINE, 1.6);
  leaf(p, 21, 10, 7, -1.2, 2.8, LEAF);
  p.circle(20, 22, 12.2, sphere(p, 16, 17, 12.2, MELON));
  p.curve({ x: 18, y: 10.6 }, { x: 12.4, y: 22 }, { x: 18, y: 33.6 }, MELON_DK, 0.7);
  p.curve({ x: 25.2, y: 11.2 }, { x: 28.6, y: 22 }, { x: 25.4, y: 33 }, MELON_DK, 0.7);
  starShape(p, 26.4, 15.8, 3.4, '#f57f16', '#7a3e08', 0.5);
  starShape(p, 25.2, 25.6, 2.6, '#f57f16', '#7a3e08', 0.5);
  starShape(p, 15.2, 27.6, 2.8, '#f57f16', '#7a3e08', 0.5);
  p.ellipse(14.6, 15.4, 3.2, 1.5, 'rgba(255,255,255,0.7)', null, -0.6);
  miniFace(p, 19.6, 22.6, 1.25);
  sparkle(p, 6.4, 7, 2, '#fffbe0');
  sparkle(p, 35, 32, 1.6, '#fffbe0');
}

function fxStar(p: Pen): void {
  p.glow(20, 20, 19, '#fff6b0', 0.7);
  starShape(p, 20, 21.5, 17, p.vgrad(4, 36, '#fffbd6', '#ffc53a'), '#c7830f', 0.5);
  p.ellipse(14.4, 13.8, 4, 1.6, 'rgba(255,255,255,0.75)', null, -0.6);
  p.circle(20, 21.5, 2.6, 'rgba(255,255,255,0.35)', null);
  sparkle(p, 5, 6, 2.2, '#ffffff');
  sparkle(p, 34, 33, 1.8, '#ffffff');
  sparkle(p, 35, 8, 1.2, '#ffffff');
}

// ---------------------------------------------------------------------------
// Visitors: 36px tall kids facing bottom-left, two frames each

const KID_H = 36;

/** Paint in the kid's own space: (0, 0) is the ground centre. */
function local(p: Pen, draw: () => void): void {
  const c = p.center;
  p.save();
  p.ctx.translate(c.x, c.y);
  draw();
  p.restore();
}

function kidLegs(p: Pen, walk: boolean, leg: string, shoe = SHOE): void {
  if (walk) {
    // mid-stride: the near leg reaches forward, the far one pushes back
    limb(p, { x: -2.4, y: -6 }, { x: -6, y: -2.6 }, 3, leg);
    p.ellipse(-6.6, -2, 2.4, 1.5, shoe);
    limb(p, { x: 2.6, y: -6 }, { x: 4.4, y: -0.8 }, 3, leg);
    p.ellipse(4.8, -0.5, 2.4, 1.4, shoe);
  } else {
    limb(p, { x: -2.6, y: -6 }, { x: -2.8, y: -1 }, 3, leg);
    p.ellipse(-3.2, -0.5, 2.4, 1.4, shoe);
    limb(p, { x: 2.6, y: -6 }, { x: 2.6, y: -1 }, 3, leg);
    p.ellipse(2.4, -0.5, 2.4, 1.4, shoe);
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

/** A little hand: a round skin dot at the end of a sleeve. */
function hand(p: Pen, x: number, y: number): void {
  p.circle(x, y, 1.5, SKIN);
}

function cupidKid(p: Pen, walk: boolean): void {
  local(p, () => {
    const b = walk ? -0.9 : 0;
    const flutter = walk ? 0.18 : 0;
    p.shadow(0, 0, 9.5, 3.2, 0.25);
    // little white wings behind the body, tilted outwards
    for (const s of [-1, 1]) {
      p.ellipse(s * 9.6, -17.4 + b, 4.4, 7.4, WHITE, p.outline, s * (0.45 + flutter));
      p.ellipse(s * 9.4, -17.2 + b, 2.2, 4.2, '#dfeaff', null, s * (0.45 + flutter));
      p.ellipse(s * 11.8, -10.4 + b, 2.6, 3.2, WHITE, p.outline, s * 0.2);
    }
    kidLegs(p, walk, '#f08fb6');
    // pink tutu skirt
    p.poly(
      [
        { x: -4.8, y: -11.4 + b },
        { x: 4.8, y: -11.4 + b },
        { x: 6.4, y: -6.4 + b },
        { x: -6.4, y: -6.4 + b },
      ],
      PINK,
    );
    // tunic with a red heart on the chest
    p.roundRect(-5.2, -17.6 + b, 10.4, 7.6, 3, PINK_LT);
    heartAt(p, 0, -13.4 + b, 4, RED);
    // left arm hangs; right arm holds a toy bow with a heart-tipped arrow
    limb(p, { x: -4.4, y: -15.2 + b }, { x: -7.8, y: -11.2 + b }, 2.6, PINK_LT);
    hand(p, -8, -10.8 + b);
    limb(p, { x: 4.4, y: -15.2 + b }, { x: 9.2, y: -14.2 + b }, 2.6, PINK_LT);
    hand(p, 9.4, -14 + b);
    const bx = 10.8;
    p.curve({ x: bx, y: -22.4 + b }, { x: bx + 3.4, y: -16 + b }, { x: bx, y: -9.6 + b }, '#9a5d2e', 1.1);
    p.line([{ x: bx, y: -22.4 + b }, { x: bx, y: -9.6 + b }], 'rgba(255,255,255,0.85)', 0.35);
    p.line([{ x: bx - 0.2, y: -14.2 + b }, { x: bx + 6.4, y: -14.2 + b }], '#fff4e0', 0.6);
    heartAt(p, bx + 7.4, -14.2 + b, 2.8, PINK_DK, null);

    // head: chestnut hair, a heart bow and a little golden halo
    const hx = -0.4;
    const hy = -24 + b;
    kidHead(p, hx, hy, HAIR_BROWN);
    heartAt(p, hx - 5.4, hy - 5.6, 5.2, PINK);
    p.circle(hx - 5.4, hy - 5.2, 0.9, PINK_DK);
    p.ellipse(hx + 0.2, hy - 11.6, 4.6, 1.2, null, GOLD, 0);
  });
}

function mailCarrier(p: Pen, walk: boolean): void {
  local(p, () => {
    const b = walk ? -0.9 : 0;
    p.shadow(0, 0, 9.5, 3.2, 0.25);
    kidLegs(p, walk, '#2f4a78');
    // navy uniform coat
    p.roundRect(-5.6, -17.6 + b, 11.2, 11.4, 3, NAVY);
    // brass buttons and a gold badge
    for (const y of [-12.4, -9.2]) p.circle(0.2, y + b, 0.8, GOLD);
    starShape(p, -2.8, -14.2 + b, 1.9, GOLD, p.outline);
    // satchel strap across the chest
    p.line([{ x: -4.6, y: -16.4 + b }, { x: 4.6, y: -6.6 + b }], '#6b4426', 1.5);
    // the satchel, stuffed with pink letters
    p.roundRect(2.6, -11.6 + b, 7.4, 7.4, 1.8, '#a06a38');
    p.line([{ x: 3.6, y: -10.2 + b }, { x: 8.9, y: -10.2 + b }], '#6b4426', 0.6);
    letter(p, 4.6, -12.4 + b, -0.25, PINK);
    letter(p, 7.6, -13.2 + b, 0.3, '#ffd0e2');
    // arms: left holds the strap, right swings a bundle of letters
    limb(p, { x: -4.4, y: -15.2 + b }, { x: -7.8, y: -10.8 + b }, 2.6, NAVY);
    hand(p, -8, -10.4 + b);
    limb(p, { x: 4.4, y: -15.2 + b }, { x: 6.8, y: -9.8 + b }, 2.6, NAVY);
    hand(p, 7, -9.4 + b);

    // head: brown hair under a navy peaked cap with a gold badge
    const hx = -0.4;
    const hy = -24 + b;
    kidHead(p, hx, hy, HAIR_BROWN);
    p.ellipse(hx + 0.3, hy - 4.6, 8.4, 4.5, CAP);
    p.ellipse(hx - 4.6, hy - 1.4, 5.8, 1.6, shade(CAP, -0.25), p.outline, -0.22);
    starShape(p, hx + 0.2, hy - 6.8, 1.6, GOLD, p.outline);
  });
}

/** A gold pot of coins held out to the left. */
function potOfGold(p: Pen, b: number): void {
  const x = -12.6;
  const y = -9 + b;
  p.glow(x, y - 3.4, 7, '#ffe27a', 0.5);
  p.roundRect(x - 3.6, y - 2.4, 7.2, 5.8, 2, p.vgrad(y - 2.4, y + 3.4, '#5a4130', '#2e2118'));
  p.roundRect(x - 4.2, y - 3.4, 8.4, 1.9, 1, '#6a4d38');
  p.ellipse(x, y - 3.4, 3.6, 1.3, GOLD, p.outline);
  p.circle(x - 1.4, y - 4.2, 0.9, '#fff0a0', p.outline);
  p.circle(x + 1.2, y - 4.4, 0.8, GOLD_DK, p.outline);
  p.ellipse(x - 1.6, y - 4.8, 0.9, 0.4, 'rgba(255,255,255,0.85)', null, -0.5);
}

function leprechaunKid(p: Pen, walk: boolean): void {
  local(p, () => {
    const b = walk ? -0.9 : 0;
    p.shadow(0, 0, 9.5, 3.2, 0.25);
    kidLegs(p, walk, '#1f6b3a', '#1d1a22');
    potOfGold(p, b);
    // green coat with gold buttons
    p.roundRect(-5.6, -17.6 + b, 11.2, 11.4, 3, GREEN_COAT);
    for (const y of [-13.6, -10]) p.circle(0.2, y + b, 0.85, GOLD);
    limb(p, { x: -4.4, y: -15.2 + b }, { x: -8.4, y: -10.6 + b }, 2.6, GREEN_COAT);
    hand(p, -8.6, -10.2 + b);
    limb(p, { x: 4.4, y: -15.2 + b }, { x: 7.6, y: -11.8 + b }, 2.6, GREEN_COAT);
    hand(p, 7.8, -11.4 + b);

    // head: red hair, then a tiny green top hat with a gold buckle
    const hx = -0.4;
    const hy = -24 + b;
    kidHead(p, hx, hy, HAIR_RED);
    p.roundRect(hx - 4.4, hy - 16.2, 8.8, 9.4, 1.8, p.vgrad(hy - 16.2, hy - 6.8, shade(GREEN_HAT, 0.14), GREEN_HAT));
    p.ellipse(hx, hy - 6.8, 6.6, 1.9, GREEN_HAT);
    p.rect(hx - 4.4, hy - 9.4, 8.8, 2.2, '#1d2a22', null);
    p.rect(hx - 1.2, hy - 9.8, 2.4, 2.8, GOLD, p.outline);
  });
}

function wishKid(p: Pen, walk: boolean): void {
  local(p, () => {
    const b = walk ? -0.9 : 0;
    p.shadow(0, 0, 9.5, 3.2, 0.25);
    kidLegs(p, walk, ROBE_DK, '#1d1a22');
    // starry robe with a gold sash
    p.roundRect(-5.6, -17.6 + b, 11.2, 11.4, 3, ROBE);
    for (const [x, y, r] of [
      [-2.8, -14.6, 1.6],
      [2.6, -12.2, 1.3],
      [-0.6, -9.2, 1.4],
      [3.4, -16.2, 1.1],
      [-3.9, -11.2, 1],
    ] as const) {
      starShape(p, x, y + b, r, '#fff7c2', null);
    }
    p.rect(-5.6, -10.4 + b, 11.2, 1.8, GOLD, null);
    limb(p, { x: -4.4, y: -15.2 + b }, { x: -7.8, y: -10.6 + b }, 2.6, ROBE);
    hand(p, -8, -10.2 + b);

    // bamboo branch in the right hand, with paper wish strips
    const hand0 = { x: 8.2, y: -11.8 + b };
    const ctrl = { x: 11.6, y: -25 + b };
    const top = { x: 13.4, y: -39 + b };
    limb(p, { x: 4.4, y: -15.2 + b }, hand0, 2.6, ROBE);
    hand(p, hand0.x, hand0.y);
    p.curve(hand0, ctrl, top, p.outline, 3.2);
    p.curve(hand0, ctrl, top, '#7fc46a', 2);
    for (const t of [0.4, 0.78]) {
      const q = qb(hand0, ctrl, top, t);
      p.line([{ x: q.x - 1.3, y: q.y }, { x: q.x + 1.3, y: q.y }], '#3f7a33', 0.6);
    }
    leaf(p, top.x, top.y, 6, -2.2, 2, LEAF);
    leaf(p, top.x, top.y + 1, 5.4, -0.6, 1.9, shade(LEAF, -0.06));
    const s1 = qb(hand0, ctrl, top, 0.5);
    const s2 = qb(hand0, ctrl, top, 0.65);
    const s3 = qb(hand0, ctrl, top, 0.84);
    wishStrip(p, s1.x, s1.y, RED, 0.12);
    wishStrip(p, s2.x, s2.y, '#5aa6f0', -0.1);
    wishStrip(p, s3.x, s3.y, GOLD, 0.16);

    // head: dark hair with a little topknot
    const hx = -0.4;
    const hy = -24 + b;
    kidHead(p, hx, hy, HAIR_DARK);
    p.ball(hx + 1.2, hy - 9.4, 2.6, HAIR_DARK);
  });
}

// ---------------------------------------------------------------------------
// Costume accessories (overlays at the animal head position)

/** A pink heart-shaped hair bow with two little ribbon tails. */
function heartBow(p: Pen): void {
  const cx = p.center.x;
  const cy = p.center.y - 14;
  p.poly(
    [
      { x: cx, y: cy },
      { x: cx - 2.8, y: cy + 5.2 },
      { x: cx - 1, y: cy + 5.8 },
      { x: cx, y: cy + 1.4 },
    ],
    PINK_DK,
  );
  p.poly(
    [
      { x: cx, y: cy },
      { x: cx + 2.8, y: cy + 5.2 },
      { x: cx + 1, y: cy + 5.8 },
      { x: cx, y: cy + 1.4 },
    ],
    PINK_DK,
  );
  for (const s of [-1, 1]) {
    heartAt(p, cx + s * 4.2, cy - 0.6, 7.2, sphere(p, cx + s * 4.2 - 1, cy - 2, 3.4, PINK));
    p.ellipse(cx + s * 4.2 - 1.8, cy - 2.6, 1.2, 0.6, 'rgba(255,255,255,0.7)', null, -0.5);
  }
  p.circle(cx, cy, 1.9, shade(PINK_DK, 0.1));
  p.ellipse(cx - 0.6, cy - 0.6, 0.6, 0.4, 'rgba(255,255,255,0.8)', null);
}

/** A tiny green top hat with a shamrock on the crown. */
function shamrockHat(p: Pen): void {
  const cx = p.center.x;
  const base = p.center.y - 11;
  p.ellipse(cx, base, 8, 2.3, shade(GREEN_HAT, 0.05));
  p.roundRect(cx - 4.6, base - 13, 9.2, 13, 2, p.vgrad(base - 13, base, shade(GREEN_HAT, 0.3), shade(GREEN_HAT, 0.02)));
  p.ellipse(cx, base - 13, 4.6, 1.2, shade(GREEN_HAT, 0.4));
  p.rect(cx - 4.6, base - 4.4, 9.2, 2.4, '#2a3a30', null);
  p.rect(cx - 1.2, base - 4.8, 2.4, 2.8, GOLD, p.outline);
  // a pale, outlined shamrock badge on the front of the crown
  p.line([{ x: cx, y: base - 6.6 }, { x: cx, y: base - 5.4 }], shade(LEAF_DK, -0.1), 0.6);
  for (const a of TREFOIL_ANGLES) {
    p.circle(cx + Math.cos(a) * 1.9, base - 8.8 + Math.sin(a) * 1.9, 1.5, '#d6f8c2', shade(LEAF_DK, -0.25));
  }
}

/** A little yellow star hairclip, with a smaller star beside it. */
function starClip(p: Pen): void {
  const cx = p.center.x;
  const cy = p.center.y - 14;
  starShape(p, cx - 1.2, cy - 0.4, 6.4, p.vgrad(cy - 6, cy + 6, '#fff98a', '#ffc21a'), GOLD_DK, 0.5);
  p.ellipse(cx - 3.2, cy - 3, 1.5, 0.7, 'rgba(255,255,255,0.9)', null, -0.6);
  starShape(p, cx + 5.8, cy + 4.2, 2.8, GOLD, GOLD_DK, 0.5);
}

// ---------------------------------------------------------------------------
// Exports

export const sprites: SpriteSpec[] = [
  { key: 'crop:sweetheart_rose:0', fw: 1, fh: 1, height: 36, paint: (p) => thin(p, 0.7, () => roseSprout(p)) },
  { key: 'crop:sweetheart_rose:1', fw: 1, fh: 1, height: 36, paint: (p) => thin(p, 0.9, () => roseLeafy(p)) },
  { key: 'crop:sweetheart_rose:2', fw: 1, fh: 1, height: 36, paint: (p) => thin(p, 0.9, () => roseBearing(p)) },
  { key: 'crop:four_leaf_clover:0', fw: 1, fh: 1, height: 30, paint: (p) => thin(p, 0.6, () => cloverSprout(p)) },
  { key: 'crop:four_leaf_clover:1', fw: 1, fh: 1, height: 30, paint: (p) => thin(p, 0.8, () => cloverLeafy(p)) },
  { key: 'crop:four_leaf_clover:2', fw: 1, fh: 1, height: 36, paint: (p) => thin(p, 0.8, () => cloverBearing(p)) },
  { key: 'crop:star_melon:0', fw: 1, fh: 1, height: 30, paint: (p) => thin(p, 0.7, () => melonSprout(p)) },
  { key: 'crop:star_melon:1', fw: 1, fh: 1, height: 36, paint: (p) => thin(p, 0.9, () => melonLeafy(p)) },
  { key: 'crop:star_melon:2', fw: 1, fh: 1, height: 36, paint: (p) => thin(p, 0.9, () => melonBearing(p)) },

  { key: 'npc:cupid_kid', fw: 1, fh: 1, height: KID_H, paint: (p) => cupidKid(p, false) },
  { key: 'npc:cupid_kid_walk', fw: 1, fh: 1, height: KID_H, paint: (p) => cupidKid(p, true) },
  { key: 'npc:mail_carrier', fw: 1, fh: 1, height: KID_H, paint: (p) => mailCarrier(p, false) },
  { key: 'npc:mail_carrier_walk', fw: 1, fh: 1, height: KID_H, paint: (p) => mailCarrier(p, true) },
  { key: 'npc:leprechaun_kid', fw: 1, fh: 1, height: KID_H, paint: (p) => leprechaunKid(p, false) },
  { key: 'npc:leprechaun_kid_walk', fw: 1, fh: 1, height: KID_H, paint: (p) => leprechaunKid(p, true) },
  { key: 'npc:wish_kid', fw: 1, fh: 1, height: KID_H, paint: (p) => wishKid(p, false) },
  { key: 'npc:wish_kid_walk', fw: 1, fh: 1, height: KID_H, paint: (p) => wishKid(p, true) },

  { key: 'costume:heart_bow', fw: 1, fh: 1, height: 20, paint: heartBow },
  { key: 'costume:shamrock_hat', fw: 1, fh: 1, height: 20, paint: shamrockHat },
  { key: 'costume:star_clip', fw: 1, fh: 1, height: 20, paint: starClip },
];

export const icons: IconSpec[] = [
  { key: 'icon:love_letter', paint: iconLoveLetter },
  { key: 'icon:sweetheart_rose', paint: iconSweetheartRose },
  { key: 'icon:lucky_clover', paint: iconLuckyClover },
  { key: 'icon:four_leaf_clover', paint: iconFourLeafClover },
  { key: 'icon:wish_star', paint: iconWishStar },
  { key: 'icon:star_melon', paint: iconStarMelon },
  { key: 'fx:clover', paint: fxClover },
  { key: 'fx:star', paint: fxStar },
];
