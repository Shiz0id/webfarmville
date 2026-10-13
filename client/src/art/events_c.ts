// Thanksgiving, Festival of Lights (Diwali) and Mid-Autumn Moon Festival art:
// sweet potato, marigold and taro crops, a pie-bringing kid, a sparkler kid, a
// lantern kid with a rabbit lantern, autumn-leaf / marigold / bunny-ear
// costumes, a floating paper lantern, and the pie, diya and mooncake currency
// icons. Same house style as halloween.ts: chunky rounded shapes, dark
// outlines, top-left light, kawaii faces with blush.
import { type IconSpec, type Pen, type Pt, type SpriteSpec, shade, rng } from './kit';

const EYE = '#2b1b12';
const INK = '#2b1d14';
const WHITE = '#ffffff';
const BLUSH = 'rgba(255,120,150,0.5)';
const SKIN = '#ffdcc2';
const SHOE = '#3b2a45';
const GOLD = '#f6c343';

// crops
const LEAF = '#8fd14f';
const LEAF_DK = '#4f8f2c';
const STEM = '#9ad85a';
const VINE = '#6fb13f';
const SP_PURPLE = '#9450b4';
const SP_ORANGE = '#ffa24c';
const MARI_OR = '#ff8a1c';
const MARI_YL = '#ffc52e';
const MARI_GREEN = '#6cb34a';
const TARO_LEAF = '#6fb84f';
const TARO_LILAC = '#a88cc8';
const TARO_SPECK = '#5e3d8f';

// clothes and props
const SWEATER = '#e8833a';
const KURTA = '#ff6aa0';
const JACKET = '#d9473a';
const PANTS = '#6b4a36';
const PANTS_PLUM = '#4a3558';
const KID_H = 36;

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
function limb(p: Pen, a: Pt, b: Pt, w: number, color: string): void {
  p.line([a, b], p.outline, w + 1.2);
  p.line([a, b], color, w);
}

/** An outlined curved stroke (stems, sashes, ribbons). */
function stalk(p: Pen, a: Pt, c: Pt, b: Pt, color: string, w: number): void {
  p.curve(a, c, b, p.outline, w + 1.2);
  p.curve(a, c, b, color, w);
}

function eye(p: Pen, x: number, y: number, r = 1.6): void {
  p.circle(x, y, r, EYE, null);
  p.circle(x - r * 0.35, y - r * 0.4, r * 0.42, WHITE, null);
}

function blush(p: Pen, x: number, y: number, s = 1): void {
  p.ellipse(x, y, 1.9 * s, 1.1 * s, BLUSH, null);
}

/** Chunky face for tiny things (tubers, pompoms, icons). s scales it. */
function miniFace(p: Pen, x: number, y: number, s: number): void {
  for (const sx of [-1, 1]) {
    const ex = x + sx * 1.9 * s;
    p.ellipse(ex, y - 0.2 * s, 0.8 * s, 1 * s, EYE, null);
    p.circle(ex - 0.28 * s, y - 0.6 * s, 0.3 * s, WHITE, null);
    p.ellipse(x + sx * 2.9 * s, y + 0.9 * s, 0.7 * s, 0.45 * s, BLUSH, null);
  }
  p.curve({ x: x - 1 * s, y: y + 1 * s }, { x, y: y + 2.2 * s }, { x: x + 1 * s, y: y + 1 * s }, EYE, 0.6);
}

/** A heart-shaped leaf (like sweet potato or taro): notch at (x, y), tip pointing along `ang`. */
function heartLeaf(p: Pen, x: number, y: number, len: number, ang: number, color: string): void {
  const k = len / 22;
  const th = ang + Math.PI / 2;
  const cs = Math.cos(th);
  const sn = Math.sin(th);
  const ctx = p.ctx;
  ctx.beginPath();
  for (let i = 0; i <= 48; i++) {
    const t = (i / 48) * Math.PI * 2;
    const hx = 16 * Math.sin(t) ** 3 * k;
    const hy = (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t) - 5) * k;
    const px = x + hx * cs - hy * sn;
    const py = y + hx * sn + hy * cs;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.strokeStyle = p.outline;
  ctx.lineWidth = p.lineWidth;
  ctx.stroke();
  p.line(
    [
      { x, y },
      { x: x + Math.cos(ang) * len * 0.7, y: y + Math.sin(ang) * len * 0.7 },
    ],
    shade(color, -0.25),
    0.45,
  );
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

interface Spot extends Pt {
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

/** A fluffy two-ring pom-pom (marigold). (x, y) is its centre, r its overall radius. */
function pompom(p: Pen, x: number, y: number, r: number, seed: number, a = MARI_OR, b = MARI_YL): void {
  const rand = rng(seed);
  const outer: Pt[] = [];
  for (let i = 0; i < 12; i++) {
    const t = (i / 12) * Math.PI * 2 + rand() * 0.25;
    outer.push({ x: x + Math.cos(t) * r * 0.66, y: y + Math.sin(t) * r * 0.6 });
  }
  const inner: Pt[] = [];
  for (let i = 0; i < 7; i++) {
    const t = (i / 7) * Math.PI * 2 + rand() * 0.3;
    inner.push({ x: x + Math.cos(t) * r * 0.3, y: y + Math.sin(t) * r * 0.28 });
  }
  for (const q of outer) p.circle(q.x, q.y, r * 0.37 + 0.45, p.outline, null);
  for (const q of outer) p.circle(q.x, q.y, r * 0.37, shade(a, -0.08), null);
  for (const q of outer) p.circle(q.x - r * 0.08, q.y - r * 0.1, r * 0.14, shade(a, 0.3), null);
  for (const q of inner) p.circle(q.x, q.y, r * 0.28 + 0.4, p.outline, null);
  for (const q of inner) p.circle(q.x, q.y, r * 0.28, b, null);
  p.circle(x, y, r * 0.2, shade(a, 0.05), null);
}

/** A little tuber (sweet potato or taro root) with a purple skin, orange flesh patch and a shine. */
function tuber(p: Pen, x: number, y: number, r: number, withFace: boolean): void {
  p.shadow(x, y + r * 0.5, r * 1.6, r * 0.5, 0.26);
  // an oblong, tapered potato rather than a round plum
  p.ellipse(x, y, r * 1.45, r * 0.72, sphere(p, x, y, r * 1.45, SP_PURPLE), p.outline, -0.42);
  p.ellipse(x + r * 0.45, y + r * 0.35, r * 0.85, r * 0.32, SP_ORANGE, null, -0.42);
  p.ellipse(x - r * 0.45, y - r * 0.4, r * 0.4, r * 0.18, 'rgba(255,255,255,0.5)', null, -0.4);
  p.line(
    [
      { x: x - r * 1.1, y: y + r * 0.2 },
      { x: x - r * 1.5, y: y + r * 0.6 },
    ],
    '#7a5538',
    0.6,
  );
  p.line(
    [
      { x: x + r * 1.1, y: y - r * 0.1 },
      { x: x + r * 1.5, y: y - r * 0.5 },
    ],
    '#7a5538',
    0.6,
  );
  if (withFace) miniFace(p, x - r * 0.1, y - r * 0.1, 1.05);
}

// ---------------------------------------------------------------------------
// Crops: sweet potato

/** Stage 0: a patch of tiny vine sprouts, each with two heart leaves. */
function spSprout(p: Pen): void {
  spots(p, grid(3, 0.24, 0.76)).forEach((s, k) => {
    p.shadow(s.x, s.y, 3.6, 1.6, 0.25);
    const top = { x: s.x + 0.2, y: s.y - 4.2 };
    stalk(p, { x: s.x, y: s.y }, { x: s.x - 0.3, y: s.y - 2 }, top, STEM, 0.8);
    heartLeaf(p, top.x, top.y, 4.6, -Math.PI / 2 - 0.75, VINE);
    heartLeaf(p, top.x, top.y, 4.6, -Math.PI / 2 + 0.75, shade(VINE, -0.08));
    if (k % 3 === 0) sparkle(p, s.x + 4, s.y - 7, 1.2);
  });
}

/** Stage 1: leafy vines: an upright stalk with heart leaves, and a runner creeping along the soil. */
function spLeafy(p: Pen): void {
  for (const s of spots(p, QUINCUNX)) {
    p.shadow(s.x, s.y, 6, 2.7, 0.26);
    const dir = s.i % 2 ? 1 : -1;
    const runEnd = { x: s.x + dir * 9, y: s.y + 3 };
    p.curve({ x: s.x, y: s.y }, { x: s.x + dir * 4, y: s.y - 2 }, runEnd, shade(LEAF_DK, -0.1), 0.9);
    heartLeaf(p, runEnd.x, runEnd.y, 4.2, dir > 0 ? 0.3 : Math.PI - 0.3, VINE);
    const top = { x: s.x + 0.5, y: s.y - 12 };
    stalk(p, { x: s.x, y: s.y }, { x: s.x - 0.4, y: s.y - 6 }, top, STEM, 1.1);
    heartLeaf(p, top.x, top.y, 6.8, -Math.PI / 2 - 0.7, VINE);
    heartLeaf(p, top.x, top.y, 6.8, -Math.PI / 2 + 0.7, shade(VINE, -0.08));
  }
}

/** Stage 2: a leafy mound with plump purple-orange sweet potatoes peeking out; one has a face. */
function spBearing(p: Pen): void {
  for (const [u, v, r] of [
    [0.1, 0.5, 4.4],
    [0.5, 0.1, 4.2],
    [0.9, 0.5, 5],
  ] as const) {
    const q = p.iso(u, v);
    tuber(p, q.x, q.y - r * 0.4, r, false);
  }
  for (const s of spots(p, QUINCUNX)) {
    p.shadow(s.x, s.y, 6.4, 2.8, 0.22);
    const mid = { x: s.x - 0.6, y: s.y - 9 };
    const top = { x: s.x + 0.4, y: s.y - 17 };
    stalk(p, { x: s.x, y: s.y }, mid, top, STEM, 1.3);
    heartLeaf(p, mid.x, mid.y, 6.4, 0.3, LEAF);
    heartLeaf(p, mid.x, mid.y, 6.4, Math.PI + 0.3, shade(LEAF, -0.08));
    heartLeaf(p, top.x, top.y, 8.5, -Math.PI / 2 - 0.55, LEAF);
    heartLeaf(p, top.x, top.y, 8.5, -Math.PI / 2 + 0.55, shade(LEAF, -0.08));
  }
  const front = p.iso(0.5, 0.9);
  tuber(p, front.x, front.y - 2.4, 5.4, true);
}

// ---------------------------------------------------------------------------
// Crops: marigold

/** Stage 0: little green sprouts, some with a tiny orange bud. */
function mgSprout(p: Pen): void {
  spots(p, grid(3, 0.24, 0.76)).forEach((s, k) => {
    p.shadow(s.x, s.y, 3.6, 1.6, 0.25);
    stalk(p, { x: s.x, y: s.y }, { x: s.x - 0.3, y: s.y - 2 }, { x: s.x + 0.2, y: s.y - 4.6 }, STEM, 0.8);
    leaf(p, s.x + 0.2, s.y - 4.6, 4, -2.6, 1.6, MARI_GREEN);
    leaf(p, s.x + 0.2, s.y - 4.6, 4, -0.55, 1.6, shade(MARI_GREEN, -0.08));
    if (k % 2 === 0) p.ball(s.x + 0.4, s.y - 6.4, 1.4, MARI_OR);
  });
}

/** Stage 1: bushy green mounds with a few orange buds peeking out. */
function mgLeafy(p: Pen): void {
  for (const s of spots(p, QUINCUNX)) {
    p.shadow(s.x, s.y, 6.2, 2.8, 0.26);
    p.foliage(s.x, s.y - 5.5, 5.4, MARI_GREEN, s.i + 2, 6);
    p.ball(s.x + 2.2, s.y - 9.4, 1.3, MARI_OR);
    p.ball(s.x - 2.4, s.y - 8.6, 1.2, MARI_YL);
  }
}

/** Stage 2: bushes covered in fluffy orange-yellow pom-poms; the front one has a face. */
function mgBearing(p: Pen): void {
  const pts = spots(p, QUINCUNX);
  pts.forEach((s, idx) => {
    const front = idx === pts.length - 1;
    p.shadow(s.x, s.y, 6.6, 2.9, 0.26);
    p.foliage(s.x, s.y - 4.4, 4.8, MARI_GREEN, idx + 3, 6);
    const cy = s.y - 10.6;
    pompom(p, s.x, cy, 6.2, idx + 1);
    if (front) miniFace(p, s.x, cy + 0.2, 1.05);
  });
}

// ---------------------------------------------------------------------------
// Crops: taro

/** Stage 0: small taro sprouts with tiny heart leaves. */
function tarSprout(p: Pen): void {
  spots(p, grid(3, 0.26, 0.74)).forEach((s, k) => {
    p.shadow(s.x, s.y, 3.8, 1.7, 0.25);
    const top = { x: s.x + 0.2, y: s.y - 6 };
    stalk(p, { x: s.x, y: s.y }, { x: s.x - 0.4, y: s.y - 3 }, top, shade(TARO_LEAF, -0.1), 0.9);
    heartLeaf(p, top.x, top.y, 6.4, -Math.PI / 2 - 0.5, TARO_LEAF);
    heartLeaf(p, top.x, top.y, 6, -Math.PI / 2 + 0.6, shade(TARO_LEAF, -0.08));
    if (k % 4 === 0) sparkle(p, s.x + 4.5, s.y - 8, 1.2);
  });
}

const TARO_LEAVES: [number, number][] = [
  [0.3, 0.3],
  [0.72, 0.42],
  [0.42, 0.74],
];

/** Stage 1: big heart-shaped leaves on long stalks. */
function tarLeafy(p: Pen): void {
  for (const s of spots(p, TARO_LEAVES)) {
    p.shadow(s.x, s.y, 6.4, 2.8, 0.26);
    const top = { x: s.x + 1, y: s.y - 17 };
    stalk(p, { x: s.x, y: s.y }, { x: s.x - 0.8, y: s.y - 8 }, top, shade(TARO_LEAF, -0.12), 1.3);
    heartLeaf(p, top.x, top.y, 12, -Math.PI / 2 - 0.55, TARO_LEAF);
    heartLeaf(p, top.x, top.y, 11, -Math.PI / 2 + 0.6, shade(TARO_LEAF, -0.08));
    heartLeaf(p, s.x - 0.5, s.y - 8, 6.5, Math.PI + 0.35, shade(TARO_LEAF, 0.06));
  }
}

/** A round taro corm with purple speckles, a little root tuft and an optional face. */
function corm(p: Pen, x: number, y: number, r: number, seed: number, withFace: boolean): void {
  p.shadow(x, y + r * 0.45, r * 1.5, r * 0.5, 0.26);
  p.circle(x, y, r, sphere(p, x, y, r, TARO_LILAC));
  const rand = rng(seed);
  for (let i = 0; i < 12; i++) {
    const a = rand() * Math.PI * 2;
    const d = Math.sqrt(rand()) * r * 0.72;
    p.circle(x + Math.cos(a) * d, y + Math.sin(a) * d * 0.8, 0.6, TARO_SPECK, null);
  }
  // fuzzy brown crown of the root
  p.ellipse(x + 0.2, y - r * 0.78, r * 0.5, r * 0.22, '#8a6a4a', null, -0.2);
  p.line(
    [
      { x: x + 0.3, y: y - r + 0.6 },
      { x: x + 1.2, y: y - r - 1.8 },
    ],
    '#7a5538',
    0.8,
  );
  if (withFace) miniFace(p, x, y + 0.4, 1.05);
}

/** Stage 2: leaves plus round purple-speckled taro roots; the front root is smiling. */
function tarBearing(p: Pen): void {
  const back = p.iso(0.12, 0.5);
  corm(p, back.x, back.y - 2.2, 4.2, 4, false);
  const side = p.iso(0.92, 0.46);
  corm(p, side.x, side.y - 2.2, 4.4, 5, false);
  for (const s of spots(p, TARO_LEAVES)) {
    p.shadow(s.x, s.y, 6.4, 2.8, 0.22);
    const top = { x: s.x + 1, y: s.y - 17 };
    stalk(p, { x: s.x, y: s.y }, { x: s.x - 0.8, y: s.y - 8 }, top, shade(TARO_LEAF, -0.12), 1.3);
    heartLeaf(p, top.x, top.y, 12, -Math.PI / 2 - 0.55, TARO_LEAF);
    heartLeaf(p, top.x, top.y, 11, -Math.PI / 2 + 0.6, shade(TARO_LEAF, -0.08));
  }
  const front = p.iso(0.5, 0.9);
  corm(p, front.x, front.y - 3.4, 5, 6, true);
}

// ---------------------------------------------------------------------------
// Visitors: 36px tall, facing bottom-left, big heads, two frames each.

function local(p: Pen, draw: () => void): void {
  const c = p.center;
  p.save();
  p.ctx.translate(c.x, c.y);
  draw();
  p.restore();
}

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

/** Pie kid: cosy knit sweater, a pie held in oven mitts, and an autumn leaf tucked in the hair. */
function pieKid(p: Pen, walk: boolean): void {
  local(p, () => {
    const b = walk ? -0.9 : 0;
    p.shadow(0, 0, 9.5, 3.2, 0.25);
    kidLegs(p, walk, PANTS);

    // sweater body with knit stripes and a cream collar
    p.roundRect(-6, -17.6 + b, 12, 11.4, 3.4, SWEATER);
    for (let i = 0; i < 3; i++) {
      const y = -14.6 + b + i * 2.8;
      p.line(
        [
          { x: -5.2, y },
          { x: 5.4, y },
        ],
        shade(SWEATER, -0.2),
        0.7,
      );
    }
    p.curve({ x: -4, y: -17.6 + b }, { x: 0, y: -14.4 + b }, { x: 4, y: -17.6 + b }, '#fff3dc', 1.1);
    p.ellipse(3.6, -13.6 + b, 1.4, 2.4, 'rgba(255,255,255,0.3)', null, 0.2);

    // arm reaching out to the pie
    limb(p, { x: -5, y: -15.4 + b }, { x: -11.2, y: -11.4 + b }, 2.6, SWEATER);
    limb(p, { x: 4.6, y: -15.4 + b }, { x: -1.6, y: -10.6 + b }, 2.6, shade(SWEATER, -0.12));

    // a pumpkin pie in its dish
    const px = -8.6;
    const py = -10.6 + b;
    p.ellipse(px, py + 1.6, 7.4, 3.8, '#f4efe6');
    p.ellipse(px, py, 6.2, 3.3, '#c97a32');
    p.ellipse(px + 0.1, py + 0.1, 4.9, 2.4, '#f2a046');
    p.line(
      [
        { x: px - 3.4, y: py - 0.9 },
        { x: px + 1.8, y: py + 1.4 },
      ],
      '#f7c77a',
      0.5,
    );
    p.ball(px + 2.4, py - 0.6, 1.7, '#fffdf6');

    // oven mitts on either side of the dish
    p.circle(px - 5.9, py + 0.6, 2, '#d9413a');
    p.circle(px + 5.6, py + 0.2, 1.9, '#d9413a');

    // head with a little autumn leaf tucked behind the ear
    const hx = -0.4;
    const hy = -24 + b;
    kidHead(p, hx, hy, '#7a4a2a');
    leaf(p, hx + 2.8, hy - 7.4, 4.2, -1.1, 1.8, '#e0572e');
  });
}

/** Sparkler kid: a bright pink kurta with gold trim, a yellow scarf, and a lit sparkler held up high. */
function sparklerKid(p: Pen, walk: boolean): void {
  local(p, () => {
    const b = walk ? -0.9 : 0;
    p.shadow(0, 0, 9.5, 3.2, 0.25);
    kidLegs(p, walk, '#a8426f');

    p.roundRect(-6, -17.6 + b, 12, 11.4, 3.4, KURTA);
    p.curve({ x: -3.6, y: -17.4 + b }, { x: 0, y: -14.2 + b }, { x: 3.6, y: -17.4 + b }, GOLD, 1.0);
    p.line(
      [
        { x: -5.4, y: -7.4 + b },
        { x: 5.4, y: -7.4 + b },
      ],
      GOLD,
      1.0,
    );
    for (const dx of [-3.4, -1.1, 1.2, 3.5]) p.circle(dx, -9.6 + b, 0.5, GOLD, null);
    p.ellipse(3.6, -13.4 + b, 1.3, 2.4, 'rgba(255,255,255,0.28)', null, 0.2);

    // golden scarf draped over one shoulder
    stalk(p, { x: -5.6, y: -16.8 + b }, { x: -10.6, y: -12.4 + b }, { x: -7.8, y: -6.4 + b }, '#ffb020', 2.2);

    // free hand, then the sparkler arm raised high
    limb(p, { x: -5, y: -15.5 + b }, { x: -7.6, y: -9.4 + b }, 2.6, KURTA);
    p.circle(-7.8, -8.8 + b, 1.5, SKIN);
    limb(p, { x: 5.2, y: -15.5 + b }, { x: 8.8, y: -20.2 + b }, 2.6, KURTA);
    p.circle(9, -20.8 + b, 1.6, SKIN);

    // sparkler stick and its bright, fizzing tip
    p.line(
      [
        { x: 9, y: -20.8 + b },
        { x: 11.6, y: -30.4 + b },
      ],
      p.outline,
      2.2,
    );
    p.line(
      [
        { x: 9, y: -20.8 + b },
        { x: 11.6, y: -30.4 + b },
      ],
      '#9a8f84',
      1.1,
    );
    const tx = 11.8;
    const ty = -31.2 + b;
    p.glow(tx, ty, 11, '#ffe27a', 0.85);
    const rand = rng(walk ? 7 : 3);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2 + rand() * 0.3;
      const len = 3.2 + rand() * 3.2;
      p.line(
        [
          { x: tx, y: ty },
          { x: tx + Math.cos(a) * len, y: ty + Math.sin(a) * len },
        ],
        i % 2 ? '#fff4b8' : '#ffd23f',
        0.7,
      );
    }
    p.circle(tx, ty, 1.6, '#fffbe6', null);
    for (let i = 0; i < 3; i++) {
      const a = rand() * Math.PI * 2;
      const d = 5 + rand() * 4;
      sparkle(p, tx + Math.cos(a) * d, ty + Math.sin(a) * d, 0.9 + rand() * 0.4, i % 2 ? '#fff9d6' : GOLD);
    }

    // head with a high bun and a little smile
    const hx = -0.4;
    const hy = -24 + b;
    kidHead(p, hx, hy, '#2b1d14');
    p.circle(hx + 1.2, hy - 9.6, 3, '#2b1d14');
    p.ellipse(hx + 0.6, hy - 9.9, 1, 0.5, 'rgba(255,255,255,0.3)', null, -0.4);
  });
}

/** Lantern kid: a red jacket with frog-button trim, holding a glowing white rabbit lantern on a stick. */
function lanternKidRabbit(p: Pen, walk: boolean): void {
  local(p, () => {
    const b = walk ? -0.9 : 0;
    p.shadow(0, 0, 9.5, 3.2, 0.25);
    kidLegs(p, walk, PANTS_PLUM);

    p.roundRect(-6, -17.6 + b, 12, 11.4, 3.2, JACKET);
    p.curve({ x: -5.4, y: -17.2 + b }, { x: 0, y: -13.6 + b }, { x: 5.4, y: -17.2 + b }, GOLD, 1.0);
    p.line(
      [
        { x: 0, y: -13 + b },
        { x: 0, y: -7.2 + b },
      ],
      GOLD,
      0.8,
    );
    for (const dy of [-11, -8.4]) {
      p.circle(-1.4, dy + b, 0.7, GOLD, INK);
      p.circle(1.4, dy + b, 0.7, GOLD, INK);
    }
    p.ellipse(3.4, -14 + b, 1.3, 2.2, 'rgba(255,255,255,0.25)', null, 0.2);

    // free arm and hand at the side
    limb(p, { x: -5, y: -15.4 + b }, { x: -7.2, y: -9.2 + b }, 2.6, JACKET);
    p.circle(-7.4, -8.6 + b, 1.5, SKIN);

    // raised arm holding the lantern stick
    limb(p, { x: 5.2, y: -15.4 + b }, { x: 8.6, y: -19.6 + b }, 2.6, JACKET);
    p.circle(8.8, -20.2 + b, 1.6, SKIN);
    p.line(
      [
        { x: 8.8, y: -20.2 + b },
        { x: 10.8, y: -27.5 + b },
      ],
      p.outline,
      2.2,
    );
    p.line(
      [
        { x: 8.8, y: -20.2 + b },
        { x: 10.8, y: -27.5 + b },
      ],
      '#9b6a3a',
      1.0,
    );

    // rabbit lantern: glowing paper body, round head and two long ears
    const lx = 10.9;
    p.glow(lx, -35 + b, 13, '#fff0b8', 0.7);
    p.ellipse(lx - 0.2, -31 + b, 4.2, 3.8, '#fff6e0');
    p.ellipse(lx - 1.8, -43.6 + b, 1.2, 3.2, '#fff6e0', p.outline, -0.15);
    p.ellipse(lx + 1.6, -43.6 + b, 1.2, 3.2, '#fff6e0', p.outline, 0.15);
    p.ellipse(lx - 1.8, -43.2 + b, 0.55, 2, '#ffc4d4', null, -0.15);
    p.ellipse(lx + 1.6, -43.2 + b, 0.55, 2, '#ffc4d4', null, 0.15);
    p.circle(lx + 0.2, -37.2 + b, 3.4, '#fff6e0');
    p.circle(lx - 0.8, -37.4 + b, 0.5, EYE, null);
    p.circle(lx + 1.2, -37.4 + b, 0.5, EYE, null);
    p.ellipse(lx - 1.8, -36.2 + b, 0.8, 0.45, 'rgba(255,120,150,0.6)', null);
    p.ellipse(lx + 2.2, -36.2 + b, 0.8, 0.45, 'rgba(255,120,150,0.6)', null);

    // head with a little bun
    const hx = -0.4;
    const hy = -24 + b;
    kidHead(p, hx, hy, '#2b1d14');
    p.circle(hx + 1.2, hy - 9.4, 2.8, '#2b1d14');
  });
}

// ---------------------------------------------------------------------------
// Costume accessories (overlays, drawn at the animal head position)

/** A knitted pumpkin-orange beanie with a cream rib band, knit ribbing and a tiny stem-and-leaf on top. */
function knitBeanie(p: Pen): void {
  const cx = p.center.x;
  const base = p.center.y - 11;
  const PUMPKIN = '#ff8a2e';
  const CREAM = '#fff3dc';
  p.ellipse(cx, base - 3.6, 8.2, 5.6, sphere(p, cx - 2.5, base - 5.5, 8, PUMPKIN));
  for (const dx of [-4.2, -1.4, 1.4, 4.2]) {
    p.curve(
      { x: cx + dx * 0.5, y: base - 8.4 },
      { x: cx + dx * 1.25, y: base - 4.4 },
      { x: cx + dx, y: base - 1.4 },
      shade(PUMPKIN, -0.25),
      0.5,
    );
  }
  p.ellipse(cx - 3.8, base - 6.6, 1.8, 1, 'rgba(255,255,255,0.45)', null, -0.5);
  p.line([{ x: cx + 0.4, y: base - 8.6 }, { x: cx + 1, y: base - 11 }], '#7a5538', 1.1);
  heartLeaf(p, cx + 1, base - 11, 4.6, -Math.PI / 2 + 0.5, LEAF);
  p.roundRect(cx - 8.6, base - 1.4, 17.2, 4.6, 2, CREAM);
  for (let i = 0; i < 8; i++) {
    const x = cx - 7.4 + i * 2.1;
    p.line([{ x, y: base - 0.8 }, { x: x + 0.5, y: base + 2.6 }], shade(CREAM, -0.25), 0.4);
  }
}

/** Little ring of marigold flowers across the head. */
function marigoldCrown(p: Pen): void {
  const cx = p.center.x;
  const base = p.center.y - 11;
  const pts: Pt[] = [];
  for (let i = 0; i < 5; i++) {
    const a = Math.PI + (i / 4) * Math.PI;
    pts.push({ x: cx + Math.cos(a) * 7.4, y: base + 1 + Math.sin(a) * 5.4 });
  }
  for (let i = 0; i < pts.length - 1; i++) {
    const m = { x: (pts[i].x + pts[i + 1].x) / 2, y: (pts[i].y + pts[i + 1].y) / 2 - 0.8 };
    leaf(p, m.x, m.y + 0.4, 3.2, -Math.PI / 2 + (i - 1.5) * 0.9, 1.2, MARI_GREEN);
  }
  for (const q of pts) p.flower(q.x, q.y, 3, MARI_OR, '#ffe066');
}

/** Bunny ears: a pink-trimmed white headband with two long ears, pink insides. */
function bunnyEars(p: Pen): void {
  const cx = p.center.x;
  const base = p.center.y - 11;
  stalk(p, { x: cx - 6.4, y: base + 0.5 }, { x: cx, y: base - 1.6 }, { x: cx + 6.4, y: base + 0.5 }, '#ffa6c6', 1.4);
  for (const s of [-1, 1]) {
    const ex = cx + s * 3.4;
    p.ellipse(ex, base - 7.4, 2.6, 7.2, '#fffafc', p.outline, s * 0.12);
    p.ellipse(ex + s * 0.1, base - 7, 1.2, 5.2, '#ffb3c8', null, s * 0.12);
  }
}

// ---------------------------------------------------------------------------
// FX

/** A soft glowing paper lantern drifting in the air, with a tassel. */
function floatLantern(p: Pen): void {
  p.glow(20, 20, 19, '#ffd27a', 0.55);
  p.line(
    [
      { x: 20, y: 33 },
      { x: 20, y: 36.5 },
    ],
    '#c2402a',
    0.9,
  );
  p.ellipse(20, 38, 1.8, 2.4, '#e8a02a');
  const ctx = p.ctx;
  const g = ctx.createRadialGradient(18, 15, 1, 20, 19.5, 13);
  g.addColorStop(0, '#fff2b8');
  g.addColorStop(0.55, '#ffb545');
  g.addColorStop(1, '#f05a2a');
  p.ellipse(20, 19.5, 10.5, 12.5, g);
  const rib = shade('#f05a2a', -0.2);
  for (const dx of [-5, 0, 5]) {
    p.curve({ x: 20 + dx, y: 8 }, { x: 20 + dx * 1.5, y: 19.5 }, { x: 20 + dx, y: 31 }, rib, 0.6);
  }
  p.rect(15, 5.6, 10, 2.6, GOLD);
  p.rect(15, 31.2, 10, 2.6, GOLD);
  p.circle(20, 4.2, 1.6, GOLD);
  p.ellipse(15.4, 14.5, 1.8, 3.8, 'rgba(255,255,255,0.45)', null, -0.2);
  sparkle(p, 6, 9, 2.2);
  sparkle(p, 34, 14, 1.6);
  sparkle(p, 33, 31, 1.4, '#fff5d0');
}

// ---------------------------------------------------------------------------
// Icons (flat 40x40)

/** A wedge of pumpkin pie: crimped golden crust, orange filling, a cloud of whipped cream and a face. */
function iconPieSlice(p: Pen): void {
  const ox = 10;
  const oy = 34;
  const R = 25;
  const a0 = -Math.PI * 0.45;
  const a1 = -Math.PI * 0.1;
  p.shadow(20, 37.5, 13, 2.4, 0.25);
  p.arc(ox, oy, R, a0, a1, p.vgrad(10, 34, '#ffc978', '#f08a3c'));

  // crust band along the outer arc
  const ctx = p.ctx;
  ctx.beginPath();
  ctx.arc(ox, oy, R, a0, a1);
  ctx.arc(ox, oy, R - 4.8, a1, a0, true);
  ctx.closePath();
  ctx.fillStyle = p.vgrad(9, 22, '#ffd27a', '#c9782c');
  ctx.fill();
  ctx.strokeStyle = p.outline;
  ctx.lineWidth = 1;
  ctx.stroke();
  for (let i = 0; i < 6; i++) {
    const a = a0 + ((i + 0.5) / 6) * (a1 - a0);
    p.line(
      [
        { x: ox + Math.cos(a) * (R - 4.2), y: oy + Math.sin(a) * (R - 4.2) },
        { x: ox + Math.cos(a) * (R - 1.2), y: oy + Math.sin(a) * (R - 1.2) },
      ],
      shade('#c9782c', -0.35),
      0.6,
    );
  }

  miniFace(p, 17.8, 26.2, 2);

  // whipped cream cloud on the crust side
  p.circle(15.4, 17.4, 3.6, '#fffdf7');
  p.circle(19.6, 17.6, 4.2, '#fffdf7');
  p.circle(23.4, 15.6, 3.2, '#fffdf7');
  p.ellipse(19.2, 16.2, 2.6, 1.4, 'rgba(255,255,255,0.9)', null, -0.2);

  sparkle(p, 6, 8, 2.2);
  sparkle(p, 34, 9, 1.5);
}

/** A sweet potato: a plump purple tuber with an orange flesh patch and a leafy top. */
function iconSweetPotato(p: Pen): void {
  p.shadow(20, 35.5, 12, 2.8, 0.25);
  heartLeaf(p, 18, 15, 11, -Math.PI / 2 - 0.55, LEAF);
  heartLeaf(p, 19, 15.5, 10, -Math.PI / 2 + 0.6, shade(LEAF, -0.08));
  p.ellipse(21, 24, 14.5, 7.4, sphere(p, 17, 20, 12, SP_PURPLE), p.outline, -0.55);
  p.ellipse(25.5, 27.6, 8.2, 3.4, SP_ORANGE, null, -0.55);
  p.ellipse(14, 20.6, 4.6, 1.5, 'rgba(255,255,255,0.5)', null, -0.55);
  p.line(
    [
      { x: 7, y: 31.5 },
      { x: 4.6, y: 34.2 },
    ],
    '#7a5538',
    0.8,
  );
  for (const [x, y] of [
    [24, 19],
    [29, 23],
    [15, 26],
    [22, 14.6],
  ] as const) {
    p.circle(x, y, 0.55, shade(SP_PURPLE, -0.4), null);
  }
  p.line(
    [
      { x: 31.4, y: 30 },
      { x: 34.6, y: 33.4 },
    ],
    '#7a5538',
    0.7,
  );
  sparkle(p, 33, 8, 1.6);
}

/** A diya: a terracotta oil lamp with a bright, warm flame and a soft glow. */
function iconDiya(p: Pen): void {
  p.glow(20, 14, 15, '#ffd27a', 0.6);
  p.shadow(20, 36.5, 10, 2.2, 0.25);
  const ctx = p.ctx;

  // flame: a teardrop with a white-hot core
  ctx.beginPath();
  ctx.moveTo(20, 2.4);
  ctx.bezierCurveTo(25.6, 8, 25.4, 13.4, 20, 15.4);
  ctx.bezierCurveTo(14.6, 13.4, 14.4, 8, 20, 2.4);
  ctx.closePath();
  const fg = ctx.createRadialGradient(20, 12, 0.5, 20, 11, 7);
  fg.addColorStop(0, '#fffbe6');
  fg.addColorStop(0.5, '#ffe066');
  fg.addColorStop(1, '#ff9a2e');
  ctx.fillStyle = fg;
  ctx.fill();
  ctx.strokeStyle = p.outline;
  ctx.lineWidth = 0.9;
  ctx.stroke();
  p.ellipse(20, 12.4, 1.8, 2.8, '#fffdf0', null);
  p.line(
    [
      { x: 20, y: 15.4 },
      { x: 20, y: 18.4 },
    ],
    '#5a2a12',
    1.2,
  );

  // clay bowl: rim, oil and a body with a row of dots
  p.ellipse(20, 20.4, 14.2, 4.8, '#f5a25c');
  p.ellipse(20, 20.8, 11.4, 3.2, '#5b2a10', null);
  p.glow(20, 20.4, 9, '#ffb84a', 0.5);
  p.ellipse(16.2, 19.8, 2.2, 0.7, 'rgba(255,230,160,0.8)', null, -0.1);
  ctx.beginPath();
  ctx.moveTo(5.6, 21);
  ctx.bezierCurveTo(6.4, 31, 13, 34, 20, 34);
  ctx.bezierCurveTo(27, 34, 33.6, 31, 34.4, 21);
  ctx.closePath();
  ctx.fillStyle = p.vgrad(21, 34, '#e98a4c', '#b24f1e');
  ctx.fill();
  ctx.strokeStyle = p.outline;
  ctx.lineWidth = 1;
  ctx.stroke();
  for (const [x, y] of [
    [11.5, 27],
    [15.5, 28.6],
    [20, 29],
    [24.5, 28.6],
    [28.5, 27],
  ] as const) {
    p.circle(x, y, 0.9, '#ffd38a', null);
  }
  p.ellipse(20, 34, 6.2, 1.8, '#a2441a');
  sparkle(p, 6, 8, 2.2);
  sparkle(p, 34, 10, 1.6);
  sparkle(p, 33, 27, 1.2, '#fff5d0');
}

/** A bushy marigold: a green base under a fluffy orange-yellow pom-pom, with two leaves. */
function iconMarigold(p: Pen): void {
  p.shadow(20, 36, 11, 2.6, 0.25);
  p.line(
    [
      { x: 20, y: 26 },
      { x: 20, y: 34 },
    ],
    LEAF_DK,
    1.2,
  );
  leaf(p, 20, 33, 8, Math.PI + 0.45, 2.8, MARI_GREEN);
  leaf(p, 20, 33, 8, -0.45, 2.8, shade(MARI_GREEN, -0.08));
  pompom(p, 20, 17, 12.5, 9);
  miniFace(p, 20, 17.4, 0.9);
  sparkle(p, 6, 8, 2);
}

/** A mooncake: a golden disc with an embossed scalloped rim and a little smiling face. */
function iconMooncake(p: Pen): void {
  const base = '#f2b04a';
  p.shadow(20, 37, 14, 2.4, 0.25);
  thin(p, 0.8, () => {
    p.circle(20, 24.5, 14.5, shade(base, -0.4));
    const ctx = p.ctx;
    const g = ctx.createRadialGradient(16, 14, 2, 20, 20, 16);
    g.addColorStop(0, '#ffe9a0');
    g.addColorStop(0.6, base);
    g.addColorStop(1, '#d98a2c');
    p.circle(20, 20, 14.5, g);
    p.circle(20, 20, 11.6, null, shade(base, -0.25));
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      const x = 20 + Math.cos(a) * 9.1;
      const y = 20 + Math.sin(a) * 9.1;
      p.circle(x + 0.3, y + 0.4, 2, shade(base, -0.3), null);
      p.circle(x, y, 2, '#ffd77a', shade(base, -0.4));
    }
    p.ellipse(15.2, 12.6, 3, 1.3, 'rgba(255,255,255,0.5)', null, -0.5);
    miniFace(p, 20, 20, 1.6);
  });
  sparkle(p, 33, 8, 1.6);
  sparkle(p, 7, 13, 1.3);
}

/** Taro: a plump brown root with fuzzy ring lines and rootlets, a cut slice of speckled lilac flesh in front, a heart leaf and a face. */
function iconTaro(p: Pen): void {
  const SKIN_BROWN = '#b5834f';
  const FLESH = '#e2d2f4';
  p.shadow(20, 37, 13, 2.6, 0.25);
  // a short stalk and a small heart-shaped leaf on top
  p.line(
    [
      { x: 19, y: 16 },
      { x: 19, y: 13 },
    ],
    shade(TARO_LEAF, -0.2),
    1.3,
  );
  heartLeaf(p, 19, 13, 10, -Math.PI / 2 + 0.35, TARO_LEAF);

  // the whole root: plump, brown, with fuzzy horizontal rings
  p.ellipse(20, 25, 12, 9.5, sphere(p, 15, 21, 12, SKIN_BROWN), p.outline, -0.12);
  for (const y0 of [18.8, 31.2]) {
    p.curve(
      { x: 12.5, y: y0 },
      { x: 20, y: y0 + 1.3 },
      { x: 27.5, y: y0 },
      shade(SKIN_BROWN, -0.38),
      0.6,
    );
  }
  p.ellipse(14.5, 19.6, 3, 1.2, 'rgba(255,255,255,0.45)', null, -0.4);
  // rootlets
  for (const [a, b] of [
    [
      [14, 33.6],
      [12, 36.6],
    ],
    [
      [20, 34.4],
      [20, 37.2],
    ],
  ] as const) {
    p.line(
      [
        { x: a[0], y: a[1] },
        { x: b[0], y: b[1] },
      ],
      '#7a5538',
      0.6,
    );
  }
  miniFace(p, 19.5, 24.6, 1.5);

  // a cut slice in front: brown skin ring, pale lilac flesh with purple speckles
  p.ellipse(31, 32.6, 6.4, 5, '#6b4426');
  p.ellipse(31, 31.2, 6.4, 5, '#8a5a3a');
  p.ellipse(31, 31.2, 5.1, 3.9, FLESH);
  const rand = rng(21);
  for (let i = 0; i < 9; i++) {
    const a = rand() * Math.PI * 2;
    const d = Math.sqrt(rand()) * 0.8;
    p.circle(31 + Math.cos(a) * 5.1 * d, 31.2 + Math.sin(a) * 3.9 * d, 0.55, TARO_SPECK, null);
  }
  sparkle(p, 35, 9, 1.5);
}

// ---------------------------------------------------------------------------
// Exports

export const sprites: SpriteSpec[] = [
  { key: 'crop:sweet_potato:0', fw: 1, fh: 1, height: 26, paint: (p) => thin(p, 0.7, () => spSprout(p)) },
  { key: 'crop:sweet_potato:1', fw: 1, fh: 1, height: 26, paint: (p) => thin(p, 0.9, () => spLeafy(p)) },
  { key: 'crop:sweet_potato:2', fw: 1, fh: 1, height: 30, paint: (p) => thin(p, 0.9, () => spBearing(p)) },
  { key: 'crop:marigold:0', fw: 1, fh: 1, height: 26, paint: (p) => thin(p, 0.7, () => mgSprout(p)) },
  { key: 'crop:marigold:1', fw: 1, fh: 1, height: 28, paint: (p) => thin(p, 0.9, () => mgLeafy(p)) },
  { key: 'crop:marigold:2', fw: 1, fh: 1, height: 32, paint: (p) => thin(p, 0.8, () => mgBearing(p)) },
  { key: 'crop:taro:0', fw: 1, fh: 1, height: 26, paint: (p) => thin(p, 0.7, () => tarSprout(p)) },
  { key: 'crop:taro:1', fw: 1, fh: 1, height: 40, paint: (p) => thin(p, 0.9, () => tarLeafy(p)) },
  { key: 'crop:taro:2', fw: 1, fh: 1, height: 40, paint: (p) => thin(p, 0.9, () => tarBearing(p)) },

  { key: 'npc:pie_kid', fw: 1, fh: 1, height: KID_H, paint: (p) => pieKid(p, false) },
  { key: 'npc:pie_kid_walk', fw: 1, fh: 1, height: KID_H, paint: (p) => pieKid(p, true) },
  { key: 'npc:sparkler_kid', fw: 1, fh: 1, height: KID_H, paint: (p) => sparklerKid(p, false) },
  { key: 'npc:sparkler_kid_walk', fw: 1, fh: 1, height: KID_H, paint: (p) => sparklerKid(p, true) },
  { key: 'npc:lantern_kid_rabbit', fw: 1, fh: 1, height: KID_H, paint: (p) => lanternKidRabbit(p, false) },
  { key: 'npc:lantern_kid_rabbit_walk', fw: 1, fh: 1, height: KID_H, paint: (p) => lanternKidRabbit(p, true) },

  { key: 'costume:pilgrim_bonnet', fw: 1, fh: 1, height: 20, paint: knitBeanie },
  { key: 'costume:marigold_crown', fw: 1, fh: 1, height: 20, paint: marigoldCrown },
  { key: 'costume:rabbit_ears', fw: 1, fh: 1, height: 20, paint: bunnyEars },
];

export const icons: IconSpec[] = [
  { key: 'icon:pie_slice', paint: iconPieSlice },
  { key: 'icon:sweet_potato', paint: iconSweetPotato },
  { key: 'icon:diya', paint: iconDiya },
  { key: 'icon:marigold', paint: iconMarigold },
  { key: 'icon:mooncake', paint: iconMooncake },
  { key: 'icon:taro', paint: iconTaro },
  { key: 'fx:float_lantern', paint: floatLantern },
];
