// Summer and Harvest event art: pineapple and butternut crops, the seashell and
// acorn currencies, a beach kid with a floaty ring and an ice cream, a harvest
// kid in overalls with a basket of apples, and the sun hat, lei and straw hat.
// Same house style as halloween.ts: chunky rounded shapes, dark outlines,
// top-left light, kawaii faces with blush. Never scary.
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
const SHINE = 'rgba(255,255,255,0.7)';

// pineapple and leaves
const GOLD = '#ffc53a';
const LEAF = '#7fcf4a';
const LEAF_LT = '#b6ea6a';
const BABY_FRUIT = '#9fdc5c';

// butternut
const SQUASH = '#f3d7a2';
const VINE = '#5f9f3a';
const BABY = '#8cc65a';
const STEM_BROWN = '#8a6a3a';

// seashell and acorn
const SHELL_LT = '#ffe6f0';
const SHELL = '#ffb0c8';
const SHELL_DK = '#e4628f';
const NUT = '#c98a3e';
const NUT_DK = '#8a5424';
const CAP = '#7a5232';

// beachgoer
const TURQ = '#3fc1d1';
const RING_PINK = '#ff8fb0';
const SANDAL = '#ff8fb0';
const HAIR_SUN = '#f2b04a';
const CONE = '#f0b860';
const MINT = '#b8f2dc';
const CHERRY = '#ff3b5c';

// harvest helper
const DENIM = '#4a7fd1';
const DENIM_DK = '#33609f';
const PLAID = '#e0523f';
const PLAID_DK = '#a8302a';
const BOOT = '#6b4a2a';
const HAIR_BR = '#7a4a2a';
const BASKET = '#d8a05a';
const BASKET_DK = '#a06a30';
const APPLE = '#ff4b3a';

// costumes
const STRAW = '#f6e0a6';
const STRAW_DK = '#c99a4a';
const STRAW_FARM = '#e6b962';
const RIBBON = '#ff7a9a';
const RED_BAND = '#d9433b';
const HIBISCUS = '#ff7fb0';
const PLUMERIA = '#fff8f0';
const ORANGE_FLOWER = '#ff9a4a';
const FLOWER_CENTER = '#ffd84a';
const STRING = '#c9b38a';

// ---------------------------------------------------------------------------
// Shared helpers

function thin(p: Pen, w: number, fn: () => void): void {
  const old = p.lineWidth;
  p.lineWidth = w;
  fn();
  p.lineWidth = old;
}

/** Shaded sphere gradient, lit from the top left. */
function glossy(p: Pen, x: number, y: number, r: number, color: string): CanvasGradient {
  const g = p.ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r * 1.2);
  g.addColorStop(0, shade(color, 0.4));
  g.addColorStop(0.6, color);
  g.addColorStop(1, shade(color, -0.25));
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

/** Paint in the kid's own space: (0, 0) is the ground centre. */
function local(p: Pen, draw: () => void): void {
  const c = p.center;
  p.save();
  p.ctx.translate(c.x, c.y);
  draw();
  p.restore();
}

/** A pointed leaf or spike from a to b; w is its half-width. */
function spike(p: Pen, a: P2, b: P2, w: number, color: string): void {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  const nx = (-dy / len) * w * 2;
  const ny = (dx / len) * w * 2;
  const mx = a.x + dx * 0.5;
  const my = a.y + dy * 0.5;
  const ctx = p.ctx;
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.quadraticCurveTo(mx + nx, my + ny, b.x, b.y);
  ctx.quadraticCurveTo(mx - nx, my - ny, a.x, a.y);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.strokeStyle = p.outline;
  ctx.lineWidth = p.lineWidth;
  ctx.stroke();
  p.curve(a, { x: mx, y: my }, { x: a.x + dx * 0.8, y: a.y + dy * 0.8 }, shade(color, -0.25), 0.5);
}

/** An outlined stem: a thick dark stroke under a coloured one. */
function stalk(p: Pen, a: P2, c: P2, b: P2, color: string, w: number): void {
  p.curve(a, c, b, p.outline, w + 1.2);
  p.curve(a, c, b, color, w);
}

/** Diagonal lattice clipped to an ellipse: the pineapple's diamond skin. */
function lattice(p: Pen, cx: number, cy: number, rx: number, ry: number, step: number): void {
  const ctx = p.ctx;
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(cx, cy, Math.max(0.1, rx - 0.5), Math.max(0.1, ry - 0.5), 0, 0, Math.PI * 2);
  ctx.clip();
  ctx.beginPath();
  for (let k = -ry * 2; k <= ry * 2; k += step) {
    ctx.moveTo(cx + k - ry, cy - ry);
    ctx.lineTo(cx + k + ry, cy + ry);
    ctx.moveTo(cx + k + ry, cy - ry);
    ctx.lineTo(cx + k - ry, cy + ry);
  }
  ctx.strokeStyle = 'rgba(150,75,0,0.42)';
  ctx.lineWidth = 0.6;
  ctx.stroke();
  ctx.restore();
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

// ---------------------------------------------------------------------------
// Pineapple crop

/** Spiky leaves fanning up and out from (x, y); the outer ones are a touch shorter. */
function fan(p: Pen, x: number, y: number, len: number, n: number, w: number, spread: number): void {
  for (let i = 0; i < n; i++) {
    const t = (i / (n - 1)) * 2 - 1;
    const a = -Math.PI / 2 + t * spread;
    const l = len * (1 - Math.abs(t) * 0.2);
    spike(p, { x, y }, { x: x + Math.cos(a) * l, y: y + Math.sin(a) * l }, w, i % 2 ? LEAF : LEAF_LT);
  }
}

/** A low, sprawling rosette on the ground: back leaves go before the fruit, front leaves after. */
function sprawl(p: Pen, x: number, y: number, len: number, n: number, w: number, part: 'back' | 'front'): void {
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + 0.35;
    if ((Math.sin(a) < 0) !== (part === 'back')) continue;
    const tip = { x: x + Math.cos(a) * len, y: y - 1 + Math.sin(a) * len * 0.45 };
    spike(p, { x, y: y - 0.5 }, tip, w, part === 'back' ? shade(LEAF, -0.14) : i % 2 ? LEAF : shade(LEAF, 0.06));
  }
}

/** Stage 0: a patch of tiny spiky rosettes. */
function pineSprout(p: Pen): void {
  spots(p, grid(3, 0.24, 0.76)).forEach((s, k) => {
    p.shadow(s.x, s.y, 3.6, 1.5, 0.25);
    const base = { x: s.x, y: s.y - 0.4 };
    const n = 4 + (k % 2); // four or five short, pointy leaves
    for (let i = 0; i < n; i++) {
      const t = (i / (n - 1)) * 2 - 1;
      const a = -Math.PI / 2 + t * 1.05;
      const l = 5.8 - Math.abs(t) * 1.1;
      const tip = { x: base.x + Math.cos(a) * l, y: base.y + Math.sin(a) * l };
      spike(p, base, tip, 1.3, i % 2 ? '#b4f274' : '#d4fca0');
      p.line(
        [
          { x: base.x + Math.cos(a) * l * 0.25, y: base.y + Math.sin(a) * l * 0.25 },
          { x: base.x + Math.cos(a) * l * 0.6, y: base.y + Math.sin(a) * l * 0.6 },
        ],
        'rgba(255,255,255,0.8)',
        0.4,
      );
    }
    p.circle(base.x, base.y, 1, '#eaffc4', null);
    if (k % 3 === 0) sparkle(p, s.x + 4.2, s.y - 7, 1.2);
  });
}

/** Stage 1: fuller spiky rosettes with a baby pineapple tucked in the middle. */
function pineLeafy(p: Pen): void {
  for (const s of spots(p, QUINCUNX)) {
    p.shadow(s.x, s.y, 6, 2.7, 0.26);
    fan(p, s.x, s.y - 1, 11.5, 7, 1.4, 1.3);
    p.ellipse(s.x, s.y - 5, 2.6, 3.4, BABY_FRUIT);
    spike(p, { x: s.x, y: s.y - 7.6 }, { x: s.x + 0.8, y: s.y - 11.2 }, 0.8, LEAF);
  }
}

/** A chunky golden pineapple standing on the ground point (gx, gy), with a leafy crown. */
function pineapple(p: Pen, gx: number, gy: number, mood: 'face' | 'shades' | 'plain'): void {
  const rx = 7.2;
  const ry = 9.4;
  const cx = gx;
  const cy = gy - ry - 0.6;
  const top = cy - ry;
  // crown first, so the body hides its base
  const base = { x: cx, y: top + 2.5 };
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + (i - 2) * 0.34;
    spike(p, base, { x: base.x + Math.cos(a) * 8.4, y: base.y + Math.sin(a) * 8.4 }, 1.1, i % 2 ? LEAF : LEAF_LT);
  }
  p.ellipse(cx, cy, rx, ry, glossy(p, cx, cy, ry, GOLD));
  lattice(p, cx, cy, rx, ry, 3.6);
  p.ellipse(cx - rx * 0.52, cy - ry * 0.22, 1.3, 2.7, SHINE, null, -0.2);
  if (mood === 'face') face(p, cx, cy + 1.8, 2.2);
  if (mood === 'shades') shades(p, cx, cy + 0.6);
}

/** Chunky pixel-cute sunglasses with a little smile. */
function shades(p: Pen, cx: number, cy: number): void {
  const LENS = '#2e3a5c';
  for (const sx of [-1, 1]) {
    const lx = cx + sx * 2.6;
    p.circle(lx, cy, 2.1, LENS);
    p.ellipse(lx - 0.8, cy - 0.9, 0.7, 0.35, 'rgba(255,255,255,0.85)', null, -0.5);
  }
  p.line(
    [
      { x: cx - 0.5, y: cy - 0.3 },
      { x: cx + 0.5, y: cy - 0.3 },
    ],
    p.outline,
    0.7,
  );
  p.curve({ x: cx - 1.2, y: cy + 2.6 }, { x: cx, y: cy + 3.6 }, { x: cx + 1.2, y: cy + 2.6 }, EYE, 0.6);
}

/** Stage 2: three chunky golden pineapples on sprawling rosettes. */
function pineBearing(p: Pen): void {
  const pts = spots(p, [
    [0.3, 0.6],
    [0.68, 0.3],
    [0.7, 0.72],
  ]);
  pts.forEach((s, idx) => {
    p.shadow(s.x, s.y, 8, 3.2, 0.26);
    sprawl(p, s.x, s.y, 10, 6, 1.5, 'back');
    pineapple(p, s.x, s.y, idx === 2 ? 'face' : idx === 1 ? 'shades' : 'plain');
    sprawl(p, s.x, s.y, 10, 6, 1.5, 'front');
    if (idx === 0) sparkle(p, s.x - 8, s.y - 26, 1.4);
  });
}

// ---------------------------------------------------------------------------
// Butternut crop

interface SquashOpts {
  color?: string;
  dir?: number;
  face?: boolean;
}

/** A butternut squash standing on the ground point (x, y): a fat bulb with a long neck. s scales it. */
function squash(p: Pen, x: number, y: number, s: number, o: SquashOpts = {}): void {
  const color = o.color ?? SQUASH;
  const R = 6.2 * s;
  const L = 9.4 * s;
  const N = 3.5 * s;
  const bulbY = -0.92 * R;
  const neckTop = -1.84 * R - L;
  const ctx = p.ctx;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(o.dir ?? 0);
  // dark silhouette pass, then the fill, so bulb and neck read as one squash
  p.roundRect(-N - 0.5, neckTop - 0.5, 2 * N + 1, bulbY - neckTop + 0.5, N + 0.5, p.outline, null);
  p.ellipse(0, bulbY, R + 0.5, 0.92 * R + 0.5, p.outline, null);
  p.roundRect(-N, neckTop, 2 * N, bulbY - neckTop, N, color, null);
  p.ellipse(0, bulbY, R, 0.92 * R, color, null);
  // shade the lower right, light the top left
  p.ellipse(R * 0.3, bulbY + R * 0.3, R * 0.7, R * 0.55, shade(color, -0.14), null);
  p.ellipse(-R * 0.25, bulbY - R * 0.18, R * 0.6, R * 0.5, shade(color, 0.08), null);
  p.line(
    [
      { x: N * 0.45, y: neckTop + L * 0.3 },
      { x: N * 0.45, y: bulbY - R * 0.3 },
    ],
    shade(color, -0.16),
    0.8,
  );
  p.ellipse(-R * 0.42, bulbY - R * 0.4, R * 0.2, R * 0.12, SHINE, null, -0.6);
  p.roundRect(-1, neckTop - 1.8, 2, 2.4, 0.8, STEM_BROWN);
  if (o.face) face(p, 0, bulbY + R * 0.2, 2.1 * s);
  ctx.restore();
}

/** A five-lobed butternut leaf centred at (x, y) with radius r. */
function palmate(p: Pen, x: number, y: number, r: number, color: string): void {
  const lobes: P2[] = [];
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + (i / 5) * Math.PI * 2;
    lobes.push({ x: x + Math.cos(a) * r * 0.6, y: y + Math.sin(a) * r * 0.6 });
  }
  for (const l of lobes) p.circle(l.x, l.y, r * 0.55 + 0.9, p.outline, null);
  p.circle(x, y, r * 0.6 + 0.9, p.outline, null);
  for (const l of lobes) p.circle(l.x, l.y, r * 0.55, color, null);
  p.circle(x, y, r * 0.6, color, null);
  for (const l of lobes) p.line([{ x, y }, l], shade(color, -0.25), 0.4);
}

/** A little curly tendril spiralling in from radius r. */
function tendril(p: Pen, x: number, y: number, r: number): void {
  const ctx = p.ctx;
  ctx.beginPath();
  for (let i = 0; i <= 30; i++) {
    const a = i * 0.45;
    const rr = r * (1 - i / 34);
    const px = x + Math.cos(a) * rr;
    const py = y + Math.sin(a) * rr;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.strokeStyle = VINE;
  ctx.lineWidth = 0.6;
  ctx.stroke();
}

/** Stage 0: sprouts with two round seed leaves. */
function squashSprout(p: Pen): void {
  spots(p, grid(3, 0.24, 0.76)).forEach((s, k) => {
    p.shadow(s.x, s.y, 3.4, 1.5, 0.25);
    stalk(p, { x: s.x, y: s.y }, { x: s.x - 0.3, y: s.y - 2 }, { x: s.x + 0.2, y: s.y - 3.6 }, VINE, 0.8);
    p.ellipse(s.x - 2, s.y - 4.4, 2.2, 1.4, LEAF, p.outline, -0.5);
    p.ellipse(s.x + 2.2, s.y - 4.4, 2.2, 1.4, shade(LEAF, -0.06), p.outline, 0.5);
    if (k % 3 === 0) sparkle(p, s.x + 4.2, s.y - 7, 1.2);
  });
}

/** Stage 1: sprawling vines with lobed leaves, curly tendrils and baby squashes. */
function squashLeafy(p: Pen): void {
  const vine = shade(VINE, -0.1);
  p.curve(p.iso(0.12, 0.34), p.iso(0.55, 0.02), p.iso(0.88, 0.46), vine, 1.1);
  p.curve(p.iso(0.22, 0.9), p.iso(0.5, 0.42), p.iso(0.8, 0.82), vine, 1.1);
  const tip = p.iso(0.5, 0.2);
  tendril(p, tip.x + 2.6, tip.y - 3, 2.6);
  for (const s of spots(p, [
    [0.18, 0.36],
    [0.46, 0.16],
    [0.86, 0.48],
    [0.3, 0.84],
    [0.6, 0.56],
    [0.82, 0.84],
  ])) {
    palmate(p, s.x, s.y - 3, 3.8 + (s.i % 3) * 0.3, s.i % 2 ? LEAF : shade(LEAF, 0.12));
  }
  for (const [u, v] of [
    [0.55, 0.42],
    [0.28, 0.66],
  ] as const) {
    const q = p.iso(u, v);
    squash(p, q.x, q.y, 0.5, { color: BABY, dir: u > 0.4 ? 0.2 : -0.25 });
  }
}

/** Stage 2: three ripe butternuts lying among the vines, one with a face. */
function squashBearing(p: Pen): void {
  const vine = shade(VINE, -0.1);
  p.curve(p.iso(0.06, 0.52), p.iso(0.5, 0.12), p.iso(0.94, 0.62), vine, 1.1);
  const pts = spots(p, [
    [0.26, 0.5],
    [0.66, 0.26],
    [0.72, 0.74],
  ]);
  pts.forEach((s, idx) => {
    p.shadow(s.x, s.y, 7.6, 3, 0.26);
    if (idx !== 1) palmate(p, s.x - 8, s.y - 2, 3.6, shade(LEAF, idx ? 0.06 : -0.06));
    squash(p, s.x, s.y, 1.15, { dir: idx === 2 ? -0.12 : idx === 1 ? 0.2 : -0.28, face: idx === 2 });
  });
}

// ---------------------------------------------------------------------------
// Visitor kids: 36px tall, facing bottom-left, big heads, two frames each.
// The walk frame strides the legs, swings the arms and bounces the body.

const KID_H = 36;

/** Two little legs with shoes; the walk frame strides and the far foot pushes back. */
function legs(p: Pen, walk: boolean, leg: string, shoe: string): void {
  if (walk) {
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

/** Big round head; `hair` is a cap across the top. */
function kidHead(p: Pen, hx: number, hy: number, hair: string): void {
  p.ball(hx, hy, 8.2, SKIN);
  p.ellipse(hx + 0.2, hy - 3.6, 8.6, 4.8, hair);
  p.ellipse(hx - 3, hy - 5.4, 2.4, 1.2, 'rgba(255,255,255,0.22)', null, -0.5);
  kidFace(p, hx, hy);
}

/** The floaty ring: a fat stripy torus seen from the side. a0..a1 picks the back or front half. */
function floatRing(p: Pen, cx: number, cy: number, rx: number, ry: number, a0: number, a1: number): void {
  const ctx = p.ctx;
  const arc = () => {
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, a0, a1);
  };
  arc();
  ctx.strokeStyle = p.outline;
  ctx.lineWidth = 5.2;
  ctx.stroke();
  arc();
  ctx.strokeStyle = WHITE;
  ctx.lineWidth = 3.6;
  ctx.stroke();
  arc();
  ctx.strokeStyle = RING_PINK;
  ctx.lineWidth = 3.6;
  ctx.setLineDash([2.6, 2.6]);
  ctx.stroke();
  ctx.setLineDash([]);
}

/** A little apple with a stem and a leaf. */
function apple(p: Pen, x: number, y: number, r: number): void {
  p.circle(x, y, r, glossy(p, x, y, r, APPLE));
  p.ellipse(x - r * 0.4, y - r * 0.3, r * 0.3, r * 0.2, SHINE, null, -0.5);
  p.line(
    [
      { x, y: y - r * 0.8 },
      { x: x + 0.6, y: y - r * 1.9 },
    ],
    STEM_BROWN,
    0.8,
  );
  spike(p, { x: x + 0.6, y: y - r * 1.5 }, { x: x + 2.8, y: y - r * 1.9 - 0.4 }, 0.8, LEAF);
}

/** Beachgoer: sun-kissed pigtails, a turquoise swimsuit, a pink floaty ring and an ice cream cone. */
function beachKid(p: Pen, walk: boolean): void {
  local(p, () => {
    const b = walk ? -0.9 : 0;
    p.shadow(0, 0, 9.5, 3.2, 0.25);
    legs(p, walk, SKIN, SANDAL);
    const ringY = -11.2 + b;
    floatRing(p, 0, ringY, 9, 4.6, Math.PI, Math.PI * 2); // back half, behind the body
    p.circle(-8, -23.5 + b, 2.9, HAIR_SUN);
    p.circle(8, -23.5 + b, 2.9, HAIR_SUN);
    // swimsuit with white polka dots
    p.roundRect(-5.2, -18.6 + b, 10.4, 10, 3.2, TURQ);
    for (const [dx, dy] of [
      [-2.6, -15.8],
      [2.2, -14.6],
      [-0.6, -11.2],
    ] as const) {
      p.circle(dx, dy + b, 0.85, WHITE, null);
    }
    floatRing(p, 0, ringY, 9, 4.6, 0, Math.PI); // front half, over the suit
    // the arm at the side swings in the walk
    const sideHand = walk ? { x: -9.2, y: -12.8 + b } : { x: -8, y: -10.8 + b };
    limb(p, { x: -4.6, y: -16.4 + b }, sideHand, 2.6, SKIN);
    p.circle(sideHand.x, sideHand.y, 1.7, SKIN);
    // the ice cream arm
    const hx = 10.2;
    const hy = -12.6 + b;
    limb(p, { x: 4.6, y: -16.4 + b }, { x: hx, y: hy }, 2.6, SKIN);
    // waffle cone, tip in the fist
    p.poly(
      [
        { x: hx - 3.8, y: hy - 8 },
        { x: hx + 3.8, y: hy - 8 },
        { x: hx, y: hy + 0.8 },
      ],
      CONE,
    );
    for (const k of [-1.6, 0.6]) {
      p.line(
        [
          { x: hx + k - 2.2, y: hy - 6.6 },
          { x: hx + k + 2.2, y: hy - 2.2 },
        ],
        shade(CONE, -0.3),
        0.5,
      );
      p.line(
        [
          { x: hx + k + 2.2, y: hy - 6.6 },
          { x: hx + k - 2.2, y: hy - 2.2 },
        ],
        shade(CONE, -0.3),
        0.5,
      );
    }
    // mint scoop with drips and a cherry on top
    p.circle(hx, hy - 10.8, 4.8, glossy(p, hx, hy - 10.8, 4.8, MINT));
    p.circle(hx - 3.2, hy - 7.6, 1.3, MINT);
    p.circle(hx + 3, hy - 8, 1.1, MINT);
    p.circle(hx + 0.4, hy - 16.4, 1.6, CHERRY);
    p.circle(hx, hy, 1.8, SKIN);
    // head with a pink flower clip
    kidHead(p, 0, -24 + b, HAIR_SUN);
    thin(p, 0.6, () => p.flower(5.2, -28.6 + b, 2.2, HIBISCUS, FLOWER_CENTER));
  });
}

/** Harvest helper: a plaid shirt under denim overalls, carrying a basket of apples. */
function harvestKid(p: Pen, walk: boolean): void {
  local(p, () => {
    const b = walk ? -0.9 : 0;
    p.shadow(0, 0, 9.5, 3.2, 0.25);
    legs(p, walk, DENIM, BOOT);
    // plaid shirt, with stripes clipped to the torso
    p.roundRect(-6, -19 + b, 12, 11.2, 3, PLAID);
    const c = p.ctx;
    c.save();
    c.beginPath();
    c.roundRect(-6, -19 + b, 12, 11.2, 3);
    c.clip();
    c.fillStyle = PLAID_DK;
    c.globalAlpha = 0.45;
    for (const y of [-16.8, -12.6, -8.4]) c.fillRect(-6, y + b, 12, 1.1);
    for (const x of [-4.2, 0.2, 4.6]) c.fillRect(x, -19 + b, 1.1, 12);
    c.globalAlpha = 0.55;
    c.fillStyle = WHITE;
    for (const y of [-15.2, -11, -6.8]) c.fillRect(-6, y + b, 12, 0.9);
    c.restore();
    // overalls: denim bib, pocket, straps and the waist
    p.rect(-5.6, -9.4 + b, 11.2, 3.6, DENIM);
    p.roundRect(-4.4, -16.4 + b, 8.8, 8.4, 1.8, DENIM);
    p.roundRect(-2.6, -12.8 + b, 5.2, 3.4, 1, DENIM_DK);
    limb(p, { x: -3.2, y: -16.2 + b }, { x: -3.4, y: -19.6 + b }, 1.8, DENIM);
    limb(p, { x: 3.2, y: -16.2 + b }, { x: 3.4, y: -19.6 + b }, 1.8, DENIM);
    p.circle(-3.4, -15.8 + b, 0.9, GOLD, null);
    p.circle(3.4, -15.8 + b, 0.9, GOLD, null);
    // the sleeve at the side swings in the walk
    const sideHand = walk ? { x: -9.6, y: -12.4 + b } : { x: -8.8, y: -10.4 + b };
    limb(p, { x: -5.4, y: -16.6 + b }, sideHand, 2.8, PLAID);
    p.circle(sideHand.x, sideHand.y, 1.7, SKIN);
    // the basket hangs from the right hand by its handle
    const hx = 10.4;
    const hy = -18 + b;
    limb(p, { x: 5.4, y: -16.6 + b }, { x: hx, y: hy }, 2.8, PLAID);
    p.curve({ x: 6.6, y: -12.4 + b }, { x: hx, y: -23.6 + b }, { x: 14.2, y: -12.4 + b }, p.outline, 2.4);
    p.curve({ x: 6.6, y: -12.4 + b }, { x: hx, y: -23.6 + b }, { x: 14.2, y: -12.4 + b }, BASKET_DK, 1.2);
    p.poly(
      [
        { x: 6.2, y: -12.6 + b },
        { x: 14.6, y: -12.6 + b },
        { x: 12.8, y: -4.8 + b },
        { x: 8, y: -4.8 + b },
      ],
      BASKET,
    );
    p.line(
      [
        { x: 7, y: -9.6 + b },
        { x: 13.8, y: -9.6 + b },
      ],
      BASKET_DK,
      0.6,
    );
    p.line(
      [
        { x: 7.6, y: -7.2 + b },
        { x: 13.2, y: -7.2 + b },
      ],
      BASKET_DK,
      0.6,
    );
    p.roundRect(5.6, -13.8 + b, 9.4, 2.2, 1, BASKET_DK);
    apple(p, 8.2, -15.6 + b, 2.5);
    apple(p, 12.4, -15.4 + b, 2.5);
    apple(p, 10.2, -13.2 + b, 2.5);
    p.circle(hx, hy, 1.8, SKIN);
    // head with brown hair, a sprig of leaf and a sleepy kawaii face
    kidHead(p, 0, -24 + b, HAIR_BR);
    spike(p, { x: 2.4, y: -29.8 + b }, { x: 5.6, y: -33.2 + b }, 1.2, LEAF);
  });
}

// ---------------------------------------------------------------------------
// Costume accessories (overlays, drawn at the animal head position)

/** Tiny straw sun hat: a soft crown, a floppy brim, a pink ribbon band and a little bow. */
function sunHat(p: Pen): void {
  const cx = p.center.x;
  const base = p.center.y - 11;
  p.ellipse(cx, base - 4, 6.2, 6.4, STRAW);
  // ribbon band around the crown, clipped to the dome
  const c = p.ctx;
  c.save();
  c.beginPath();
  c.ellipse(cx, base - 4, 6.2, 6.4, 0, 0, Math.PI * 2);
  c.clip();
  p.rect(cx - 7, base - 6.4, 14, 2.9, RIBBON, null);
  c.restore();
  // brim with a little weave
  p.ellipse(cx, base + 0.6, 10, 2.9, shade(STRAW, -0.04));
  for (const dx of [-6, -3, 0, 3, 6]) {
    p.line(
      [
        { x: cx + dx, y: base - 1.2 },
        { x: cx + dx + 1, y: base + 1.8 },
      ],
      STRAW_DK,
      0.4,
    );
  }
  // bow tied at the side of the band
  thin(p, 0.6, () => {
    p.ellipse(cx + 3.6, base - 4.6, 2, 1.3, RIBBON, p.outline, -0.4);
    p.ellipse(cx + 6, base - 4.6, 2, 1.3, RIBBON, p.outline, 0.4);
    p.circle(cx + 4.8, base - 4.6, 1, shade(RIBBON, -0.2));
  });
}

/** A tropical lei: a drooping garland of hibiscus and plumeria with leaves. */
function lei(p: Pen): void {
  const cx = p.center.x;
  const base = p.center.y - 11;
  const at = (t: number): P2 => ({ x: cx - 9 + 18 * t, y: base - 7 + 36 * t * (1 - t) });
  const cord: P2[] = [];
  for (let i = 0; i <= 12; i++) cord.push(at(i / 12));
  p.line(cord, STRING, 0.9);
  const petals = [HIBISCUS, PLUMERIA, ORANGE_FLOWER, HIBISCUS, PLUMERIA, ORANGE_FLOWER, HIBISCUS];
  thin(p, 0.6, () => {
    [0.08, 0.22, 0.36, 0.5, 0.64, 0.78, 0.92].forEach((t, i) => {
      const q = at(t);
      p.ellipse(q.x - 1.8, q.y + 1.6, 1.8, 1, LEAF, p.outline, 0.5);
      p.flower(q.x, q.y, 2.8, petals[i], FLOWER_CENTER);
    });
  });
}

/** Tiny farmer's straw hat: a tall pinched crown, a bold red band and a wide brim. */
function strawHat(p: Pen): void {
  const cx = p.center.x;
  const base = p.center.y - 11;
  p.roundRect(cx - 5.6, base - 12, 11.2, 11.6, 4.5, STRAW_FARM);
  p.ellipse(cx - 2.8, base - 8.6, 1.3, 0.8, 'rgba(255,255,255,0.45)', null, -0.3);
  for (const dx of [-3.6, -0.4, 2.8]) {
    p.line(
      [
        { x: cx + dx, y: base - 10.6 },
        { x: cx + dx + 1.2, y: base - 7.6 },
      ],
      STRAW_DK,
      0.4,
    );
  }
  p.rect(cx - 5.6, base - 6.4, 11.2, 3.4, RED_BAND, null);
  p.ellipse(cx, base + 0.2, 10.6, 3, shade(STRAW_FARM, 0.05));
  for (const dx of [-6, -3, 0, 3, 6]) {
    p.line(
      [
        { x: cx + dx, y: base - 1.4 },
        { x: cx + dx + 1, y: base + 1.8 },
      ],
      STRAW_DK,
      0.4,
    );
  }
}

// ---------------------------------------------------------------------------
// Icons (flat 40x40)

/** A pink scallop shell with a pearly sheen, ribs and a sparkle. */
function iconSeashell(p: Pen): void {
  p.shadow(20, 36, 13, 3, 0.25);
  const hx = 20;
  const hy = 33;
  const R = 16;
  const N = 5;
  p.roundRect(hx - 5, hy - 2.4, 10, 5, 2.2, SHELL_DK);
  // the fan: lobes swell between sharp cusps
  const pts: P2[] = [{ x: hx, y: hy }];
  const steps = 120;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const a = Math.PI * (1.1 + 0.8 * t);
    const r = R - 2.2 + 2.2 * Math.abs(Math.sin(t * N * Math.PI));
    pts.push({ x: hx + Math.cos(a) * r, y: hy + Math.sin(a) * r });
  }
  const g = p.ctx.createRadialGradient(hx, hy, 2, hx, hy, R + 2);
  g.addColorStop(0, SHELL_LT);
  g.addColorStop(0.55, SHELL);
  g.addColorStop(1, SHELL_DK);
  p.poly(pts, g);
  // ribs from the hinge: darker at the cusps, pearly between them
  for (let k = 0; k <= N; k++) {
    const a = Math.PI * (1.1 + 0.8 * (k / N));
    p.line(
      [
        { x: hx + Math.cos(a) * 3, y: hy + Math.sin(a) * 3 },
        { x: hx + Math.cos(a) * (R - 3), y: hy + Math.sin(a) * (R - 3) },
      ],
      SHELL_DK,
      0.6,
    );
  }
  for (let k = 0; k < N; k++) {
    const a = Math.PI * (1.1 + 0.8 * ((k + 0.5) / N));
    p.line(
      [
        { x: hx + Math.cos(a) * 5, y: hy + Math.sin(a) * 5 },
        { x: hx + Math.cos(a) * (R - 3.5), y: hy + Math.sin(a) * (R - 3.5) },
      ],
      'rgba(255,255,255,0.7)',
      0.5,
    );
  }
  // pearl sheen on the upper left lobes
  p.ellipse(hx - 6, hy - 9.5, 4.2, 2.2, SHINE, null, -0.7);
  p.circle(hx - 9.4, hy - 14.4, 1.1, WHITE, null);
  sparkle(p, 33, 9, 2.6);
  sparkle(p, 7, 14, 1.6);
}

/** A glossy acorn with a cap, a stalk and a kawaii face. */
function iconAcorn(p: Pen): void {
  p.shadow(20, 37, 11, 3, 0.25);
  p.line(
    [
      { x: 20.4, y: 11 },
      { x: 22.4, y: 4 },
    ],
    p.outline,
    3.4,
  );
  p.line(
    [
      { x: 20.4, y: 11 },
      { x: 22.4, y: 4 },
    ],
    NUT_DK,
    1.7,
  );
  p.ellipse(20, 25.5, 11.4, 12.4, glossy(p, 20, 24, 12, NUT));
  p.ellipse(15.6, 21.6, 2.6, 4.4, SHINE, null, -0.3);
  face(p, 20, 28, 3.4);
  // cap: a little dome with hatched texture and a darker rim
  p.ellipse(20, 14.6, 12.4, 7.4, glossy(p, 19, 12, 11, CAP));
  for (let i = -3; i <= 3; i++) {
    p.line(
      [
        { x: 20 + i * 2.6, y: 11.2 },
        { x: 20 + i * 2.6 + 0.9, y: 8.6 },
      ],
      shade(CAP, -0.4),
      0.6,
    );
  }
  p.ellipse(20, 19.6, 11.4, 2.6, shade(CAP, -0.25));
  sparkle(p, 6, 9, 2.1);
  sparkle(p, 34, 14, 1.5);
}

/** A golden pineapple with a crown and a happy face. */
function iconPineapple(p: Pen): void {
  p.shadow(20, 37, 12, 3, 0.25);
  const base = { x: 20, y: 15 };
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + (i - 2) * 0.32;
    spike(p, base, { x: base.x + Math.cos(a) * 11.5, y: base.y + Math.sin(a) * 11.5 }, 1.5, i % 2 ? LEAF : LEAF_LT);
  }
  p.ellipse(20, 25.5, 11.6, 12.6, glossy(p, 20, 24, 13, GOLD));
  lattice(p, 20, 25.5, 11.6, 12.6, 4.4);
  p.ellipse(13.4, 22, 2.2, 4.6, SHINE, null, -0.2);
  face(p, 20, 27, 3.4);
  sparkle(p, 6, 9, 2);
  sparkle(p, 34, 20, 1.6);
}

/** A butternut squash with a leafy stem and a face. */
function iconButternut(p: Pen): void {
  p.shadow(20, 37, 12, 3, 0.25);
  palmate(p, 27, 6, 5.2, LEAF);
  squash(p, 20, 36, 1.45, { dir: 0.1, face: true });
  sparkle(p, 6, 16, 2);
  sparkle(p, 34, 26, 1.5);
}

// ---------------------------------------------------------------------------
// Exports

export const sprites: SpriteSpec[] = [
  { key: 'crop:pineapple:0', fw: 1, fh: 1, height: 40, paint: (p) => thin(p, 0.6, () => pineSprout(p)) },
  { key: 'crop:pineapple:1', fw: 1, fh: 1, height: 40, paint: (p) => thin(p, 0.9, () => pineLeafy(p)) },
  { key: 'crop:pineapple:2', fw: 1, fh: 1, height: 40, paint: (p) => thin(p, 0.9, () => pineBearing(p)) },
  { key: 'crop:butternut:0', fw: 1, fh: 1, height: 36, paint: (p) => thin(p, 0.7, () => squashSprout(p)) },
  { key: 'crop:butternut:1', fw: 1, fh: 1, height: 36, paint: (p) => thin(p, 0.9, () => squashLeafy(p)) },
  { key: 'crop:butternut:2', fw: 1, fh: 1, height: 36, paint: (p) => thin(p, 0.9, () => squashBearing(p)) },

  { key: 'npc:beach_kid', fw: 1, fh: 1, height: KID_H, paint: (p) => beachKid(p, false) },
  { key: 'npc:beach_kid_walk', fw: 1, fh: 1, height: KID_H, paint: (p) => beachKid(p, true) },
  { key: 'npc:harvest_kid', fw: 1, fh: 1, height: KID_H, paint: (p) => harvestKid(p, false) },
  { key: 'npc:harvest_kid_walk', fw: 1, fh: 1, height: KID_H, paint: (p) => harvestKid(p, true) },

  { key: 'costume:sun_hat', fw: 1, fh: 1, height: 20, paint: sunHat },
  { key: 'costume:lei', fw: 1, fh: 1, height: 20, paint: lei },
  { key: 'costume:straw_hat', fw: 1, fh: 1, height: 20, paint: strawHat },
];

export const icons: IconSpec[] = [
  { key: 'icon:seashell', paint: iconSeashell },
  { key: 'icon:acorn', paint: iconAcorn },
  { key: 'icon:pineapple', paint: iconPineapple },
  { key: 'icon:butternut', paint: iconButternut },
];
