// Winter, New Year and Lunar New Year event art: peppermint, golden grapes and
// bok choy (crops), carolers, party guests, lion dancers and lantern kids,
// costume accessories for animals, the snowflake, confetti and red envelope
// currencies, and the confetti and red-lantern particles. Same house style as
// the rest of the art: chunky rounded shapes, dark outlines, top-left light,
// kawaii faces with blush. Warm, joyful and never loud.
import { type IconSpec, type Pen, type Pt, type SpriteSpec, rng, shade } from './kit';

const INK = '#2b1d14';
const EYE = '#2b1b12';
const WHITE = '#ffffff';
const BLUSH = 'rgba(255,120,150,0.5)';
const SKIN = '#ffdcc2';
const SHOE = '#3b2a45';
const HAIR_BROWN = '#7a4a2a';
const CREAM = '#fff3dc';
const GOLD = '#f2b632';
const GOLD_DK = '#b7801c';
const GOLD_LT = '#ffe27a';
const NOTE = '#8a3fa8';

// winter
const RED = '#e0392f';
const RED_DK = '#a8231c';
const CANDY_WHITE = '#fff9f5';
const CANDY_RED = '#e3343a';
const MINT = '#6fd6a0';
const STEM = '#8fdca8';
const ANTLER = '#a8703c';
const TEAL = '#3fa7b5';
const GREEN_COAT = '#56b86e';
const GREEN_HAT = '#2e9a5a';
const ICE = '#eaf8ff';
const ICE_EDGE = '#5a9fd0';

// new year
const PINK = '#ff5fa2';
const PURPLE = '#9b5de5';
const PURPLE_DK = '#5b3f9a';
const GRAPE = '#ffd64a';
const GRAPE_LT = '#fff4b0';
const UNRIPE = '#d8ec8a';
const VINE = '#5f9a3a';
const LEAF = '#7bd062';
const CONFETTI = ['#ff5fa2', '#ffd23f', '#4fd1c5', '#8b5cf6', '#3b82f6', '#fb923c'];

// lunar new year
const LANTERN = '#e8322b';
const LANTERN_DK = '#a81d1d';
const ROBE_RED = '#d8302c';
const LION_RED = '#dc2f2b';
const LION_MANE = '#ffb83a';
const BOK_DARK = '#2f8a3f';
const BOK_MID = '#4fb24e';
const BOK_BRIGHT = '#8fd45a';
const BOK_RIB = '#c6f08a';
const BOK_CELERY = '#eaf8cc';
const ENVELOPE = '#d92b25';
const ENVELOPE_DK = '#a51b18';

const KID_H = 36;

// ---------------------------------------------------------------------------
// Shared helpers (the same house kit as the other event art)

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

/** An outlined stroke that reads as a limb (round caps). */
function limb(p: Pen, a: Pt, b: Pt, w: number, color: string): void {
  p.line([a, b], p.outline, w + 1.2);
  p.line([a, b], color, w);
}

/** An arm ending in a little skin-coloured hand. */
function arm(p: Pen, shoulder: Pt, hand: Pt, sleeve: string): void {
  limb(p, shoulder, hand, 2.8, sleeve);
  p.circle(hand.x, hand.y, 1.7, SKIN);
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
function stalk(p: Pen, a: Pt, c: Pt, b: Pt, color: string, w: number): void {
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

/** A little curly tendril: a coil used on vines and as a streamer flourish. */
function curl(p: Pen, x: number, y: number, r: number, color: string): void {
  const ctx = p.ctx;
  ctx.beginPath();
  for (let i = 0; i <= 24; i++) {
    const t = i / 24;
    const a = t * Math.PI * 2.1;
    const rr = r * (1 - t * 0.72);
    const px = x + Math.cos(a) * rr;
    const py = y + Math.sin(a) * rr;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.1;
  ctx.stroke();
}

/** Paint everything inside a polygon: clips to it, runs fn, then restores. */
function clipTo(p: Pen, pts: Pt[], fn: () => void): void {
  const ctx = p.ctx;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.closePath();
  ctx.clip();
  fn();
  ctx.restore();
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
// Winter: peppermint

/**
 * A peppermint swirl: a white disc with two red spiral arms, a soft outline and
 * a glossy shine. (x, y) is its centre.
 */
function swirl(p: Pen, x: number, y: number, r: number): void {
  const ctx = p.ctx;
  p.circle(x, y, r, CANDY_WHITE, null);
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.clip();
  for (const arm0 of [0, Math.PI]) {
    ctx.beginPath();
    for (let i = 0; i <= 36; i++) {
      const t = i / 36;
      const a = arm0 + t * Math.PI * 2.2;
      const rr = r * 1.25 * t;
      const px = x + Math.cos(a) * rr;
      const py = y + Math.sin(a) * rr;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.strokeStyle = CANDY_RED;
    ctx.lineWidth = r * 0.42;
    ctx.stroke();
  }
  ctx.restore();
  p.circle(x, y, r, null, p.outline);
  p.ellipse(x - r * 0.38, y - r * 0.42, r * 0.26, r * 0.16, 'rgba(255,255,255,0.9)', null, -0.6);
}

/** Stage 0: tiny mint sprigs, each with a little pale candy bud. */
function peppermintSprout(p: Pen): void {
  spots(p, grid(3, 0.24, 0.76)).forEach((s, k) => {
    p.shadow(s.x, s.y, 3.6, 1.6, 0.25);
    stalk(p, { x: s.x, y: s.y }, { x: s.x - 0.3, y: s.y - 2 }, { x: s.x + 0.2, y: s.y - 4 }, STEM, 0.8);
    leaf(p, s.x, s.y - 3.6, 4.2, -2.5, 1.8, MINT);
    leaf(p, s.x, s.y - 3.6, 4.2, -0.65, 1.8, shade(MINT, -0.08));
    p.ball(s.x + 0.2, s.y - 5.4, 1.2, CANDY_WHITE);
    if (k % 3 === 0) sparkle(p, s.x + 4, s.y - 7, 1.3);
  });
}

/** Stage 1: leafy mint stalks, each topped with a small unopened swirl. */
function peppermintLeafy(p: Pen): void {
  for (const s of spots(p, QUINCUNX)) {
    p.shadow(s.x, s.y, 6, 2.7, 0.26);
    const mid = { x: s.x - 0.4, y: s.y - 8 };
    const top = { x: s.x + 0.4, y: s.y - 16 };
    stalk(p, { x: s.x, y: s.y }, mid, top, STEM, 1.2);
    leaf(p, s.x, s.y - 4, 6.5, -0.45, 2.4, MINT);
    leaf(p, s.x, s.y - 4, 6.5, Math.PI + 0.45, 2.4, shade(MINT, -0.1));
    leaf(p, mid.x, mid.y, 5.5, -1.0, 2.1, shade(MINT, 0.08));
    leaf(p, mid.x, mid.y, 5.5, Math.PI + 0.9, 2.1, MINT);
    swirl(p, top.x, top.y + 0.8, 2.8);
  }
}

/** Stage 2: stalks bearing ripe swirl candies, the front one with a face. */
function peppermintBearing(p: Pen): void {
  const pts = spots(p, QUINCUNX);
  pts.forEach((s, idx) => {
    const front = idx === pts.length - 1;
    p.shadow(s.x, s.y, 6.4, 2.8, 0.26);
    const mid = { x: s.x - 0.6, y: s.y - 12 };
    const top = { x: s.x + 0.4, y: s.y - 22 };
    stalk(p, { x: s.x, y: s.y }, mid, top, STEM, 1.5);
    leaf(p, s.x, s.y - 4, 8, -0.4, 3, MINT);
    leaf(p, s.x, s.y - 4, 8, Math.PI + 0.4, 3, shade(MINT, -0.1));
    leaf(p, mid.x, mid.y + 2, 6.5, Math.PI + 0.7, 2.6, shade(MINT, -0.1));
    const r = front ? 7.2 : 4.6;
    const cy = top.y + 1;
    swirl(p, top.x, cy, r);
    if (front) {
      // a cream face plate so the kawaii face reads over the red swirl
      p.ellipse(top.x, cy + 0.4, r * 0.66, r * 0.52, CANDY_WHITE, null);
      face(p, top.x, cy + 0.6, 2);
    }
    if (idx % 2 === 0) sparkle(p, top.x + r + 1.8, cy - r, 1.4);
    if (idx === 3) sparkle(p, s.x - 7, s.y - 16, 1.2);
  });
}

// ---------------------------------------------------------------------------
// Winter: carolers

/** Music note: a round head, a stem and a little flag. (x, y) is the head. */
function musicNote(p: Pen, x: number, y: number, s: number, color: string): void {
  p.ellipse(x, y, 2 * s, 1.5 * s, color, p.outline, -0.4);
  p.line([{ x: x + 1.8 * s, y: y - 0.2 * s }, { x: x + 1.8 * s, y: y - 6.6 * s }], color, 1 * s);
  p.curve({ x: x + 1.8 * s, y: y - 6.6 * s }, { x: x + 5 * s, y: y - 5 * s }, { x: x + 2.4 * s, y: y - 2.4 * s }, color, 1.2 * s);
}

/** A songbook held open-ish in a hand: a green cover, cream pages and staff lines. */
function songbook(p: Pen, x: number, y: number, rot: number): void {
  const ctx = p.ctx;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  p.roundRect(-4.6, -3.6, 9.2, 7.2, 1.2, '#2f7d5b');
  p.roundRect(-4, -3, 8, 6, 0.8, CREAM, null);
  for (const dy of [-1.6, 0, 1.6]) p.line([{ x: -2.8, y: dy }, { x: 2.8, y: dy }], '#7a5a3a', 0.45);
  ctx.restore();
}

/** Earmuff-style pads and a band for the red caroler. */
function earmuffs(p: Pen, hx: number, hy: number): void {
  p.curve({ x: hx - 7.8, y: hy + 0.4 }, { x: hx, y: hy - 12 }, { x: hx + 7.8, y: hy + 0.4 }, '#8e1f2a', 1.3);
  for (const sx of [-1, 1]) {
    const px = hx + sx * 8.4;
    p.circle(px, hy + 1.6, 2.4, '#ff6a5c');
    p.ellipse(px - sx * 0.6, hy + 0.6, 0.7, 0.5, 'rgba(255,255,255,0.75)', null);
  }
}

/** A little brass lantern with a warm flame. (x, y) is the centre of its body. */
function brassLantern(p: Pen, x: number, y: number): void {
  p.glow(x, y, 13, GOLD_LT, 0.6);
  p.curve({ x: x - 3, y: y - 4.4 }, { x, y: y - 10.4 }, { x: x + 3, y: y - 4.4 }, GOLD_DK, 1);
  p.roundRect(x - 4.2, y - 4.8, 8.4, 1.8, 0.9, GOLD_DK);
  p.roundRect(x - 3.6, y - 3, 7.2, 10.4, 2.4, '#ffd45a');
  p.ellipse(x, y + 1.6, 1.7, 3, '#fffbe0', null);
  p.roundRect(x - 4.2, y + 7.2, 8.4, 1.8, 0.9, GOLD_DK);
}

/** A round paper lantern with gold ribs, caps and a tassel. (x, y) is its centre. */
function paperLantern(p: Pen, x: number, y: number, rx: number, ry: number): void {
  p.ellipse(x, y, rx, ry, sphere(p, x - rx * 0.3, y - ry * 0.3, Math.max(rx, ry), LANTERN));
  for (const k of [-0.56, 0, 0.56]) {
    p.curve({ x: x + k * rx, y: y - ry * 0.9 }, { x: x + k * rx * 1.35, y }, { x: x + k * rx, y: y + ry * 0.9 }, GOLD, Math.max(0.6, rx * 0.12));
  }
  p.roundRect(x - rx * 0.42, y - ry - 1.6, rx * 0.84, 2.6, 1.2, GOLD);
  p.roundRect(x - rx * 0.42, y + ry - 1, rx * 0.84, 2.6, 1.2, GOLD);
  p.line([{ x, y: y + ry + 1.6 }, { x, y: y + ry + 3.8 }], GOLD_DK, Math.max(0.7, rx * 0.12));
  p.ellipse(x, y + ry + 5.2, rx * 0.2, ry * 0.2, GOLD);
  p.ellipse(x - rx * 0.45, y - ry * 0.45, rx * 0.22, ry * 0.2, 'rgba(255,255,255,0.45)', null, -0.5);
}

/** Two legs; the walk frame swaps them into mid-stride. */
function kidLegs(p: Pen, walk: boolean, leg: string): void {
  if (walk) {
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

/** Big round head with a hair cap across the top. */
function kidHead(p: Pen, hx: number, hy: number, hair: string): void {
  p.ball(hx, hy, 8.2, SKIN);
  p.ellipse(hx + 0.2, hy - 3.6, 8.6, 4.8, hair);
  p.ellipse(hx - 3, hy - 5.4, 2.4, 1.2, 'rgba(255,255,255,0.22)', null, -0.5);
  kidFace(p, hx, hy);
}

/** Red-coated caroler with a red scarf, earmuffs, songbook and a musical note. */
function carolerRed(p: Pen, walk: boolean): void {
  local(p, () => {
    const b = walk ? -0.9 : 0;
    const hx = -0.4;
    const hy = -24 + b;
    p.shadow(0, 0, 9.5, 3.2, 0.25);
    kidLegs(p, walk, '#33466e');

    const lh = { x: -8.6, y: -11.2 + b };
    const rh = walk ? { x: 8.4, y: -17 + b } : { x: 6.6, y: -9.6 + b };
    arm(p, { x: -5.2, y: -14.2 + b }, lh, RED);
    arm(p, { x: 5.2, y: -14.2 + b }, rh, RED);

    // coat with a cream fur hem and gold buttons
    p.roundRect(-6.2, -17.6 + b, 12.4, 12, 4, p.vgrad(-17.6 + b, -5.6 + b, '#ff6a5c', '#c8323a'));
    p.roundRect(-6.4, -7.6 + b, 12.8, 2.6, 1.3, CREAM);
    p.circle(0, -12.6 + b, 0.9, GOLD, null);
    p.circle(0, -9.4 + b, 0.9, GOLD, null);

    // knitted scarf at the neck with a tail down the chest
    p.poly(
      [
        { x: 3.2, y: -15.6 + b },
        { x: 6.2, y: -8.4 + b },
        { x: 8.8, y: -9 + b },
        { x: 5.8, y: -16.4 + b },
      ],
      RED,
    );
    p.line([{ x: 4.4, y: -13.2 + b }, { x: 7.6, y: -12.6 + b }], CREAM, 0.9);
    p.roundRect(-5.4, -17.4 + b, 10.8, 3.6, 1.8, CREAM);
    for (const sx of [-3, -0.2, 2.6]) p.rect(sx, -17.4 + b, 1.4, 3.6, RED, null);

    p.circle(lh.x, lh.y, 1.7, SKIN);
    songbook(p, lh.x - 1, lh.y - 1.6, walk ? 0.2 : -0.12);
    p.circle(rh.x, rh.y, 1.7, SKIN);

    kidHead(p, hx, hy, HAIR_BROWN);
    earmuffs(p, hx, hy);

    musicNote(p, 12, -33 + b, 1, NOTE);
    musicNote(p, 17.5, -27.5 + b, 0.8, '#c06ad8');
  });
}

/** Green-coated caroler in a bobble hat, holding a glowing lantern. */
function carolerGreen(p: Pen, walk: boolean): void {
  local(p, () => {
    const b = walk ? -0.9 : 0;
    const hx = -0.4;
    const hy = -24 + b;
    p.shadow(0, 0, 9.5, 3.2, 0.25);
    kidLegs(p, walk, '#6b4a33');

    const lh = walk ? { x: -9.6, y: -9.6 + b } : { x: -8.6, y: -10.8 + b };
    const rh = walk ? { x: 9.6, y: -15.6 + b } : { x: 10.8, y: -16.4 + b };
    arm(p, { x: -5.2, y: -14.2 + b }, lh, GREEN_COAT);
    arm(p, { x: 5.2, y: -14.2 + b }, rh, GREEN_COAT);

    p.roundRect(-6.2, -17.6 + b, 12.4, 12, 4, p.vgrad(-17.6 + b, -5.6 + b, '#7fd392', '#3c9a55'));
    p.ellipse(0, -17.4 + b, 4.8, 1.8, CREAM);
    for (const y of [-12.2, -8.8]) p.circle(0, y + b, 0.9, GOLD_LT, null);

    // the lantern rides up in the right hand
    const lx = walk ? 12.2 : 12.6;
    const ly = walk ? -21.2 + b : -22.2 + b;
    brassLantern(p, lx, ly);
    p.circle(rh.x, rh.y, 1.7, SKIN);

    // head with a bobble hat: green dome, cream ribbed band and a pompom
    p.ball(hx, hy, 8.2, SKIN);
    p.ellipse(hx + 0.2, hy - 3.8, 8.8, 5.4, GREEN_HAT);
    p.ellipse(hx - 3, hy - 6, 2.2, 1.2, 'rgba(255,255,255,0.25)', null, -0.5);
    p.roundRect(hx - 8.8, hy - 2.2, 17.6, 3.4, 1.7, CREAM);
    for (const sx of [-5, -1.6, 1.8, 5.2]) p.line([{ x: hx + sx, y: hy - 1.6 }, { x: hx + sx, y: hy + 0.6 }], '#c9b48a', 0.5);
    p.circle(hx + 0.2, hy - 9.8, 2.9, CREAM);
    kidFace(p, hx, hy);
  });
}

// ---------------------------------------------------------------------------
// New Year: golden grapes

/**
 * A hanging bunch of shiny grapes: a short stem, then a triangle of glossy
 * berries. (x, y) is where the bunch hangs from; s scales it.
 */
function grapeBunch(p: Pen, x: number, y: number, s: number, color: string): void {
  p.line([{ x, y: y - 2.6 * s }, { x, y: y + 0.4 * s }], VINE, 0.9 * s + 0.2);
  const r = 2.1 * s;
  for (const [dx, dy] of [
    [-3.6, 0],
    [0, 0],
    [3.6, 0],
    [-1.8, 3.4],
    [1.8, 3.4],
    [0, 6.8],
  ] as const) {
    const gx = x + dx * s;
    const gy = y + dy * s;
    p.ball(gx, gy, r, color);
    p.ellipse(gx - r * 0.4, gy - r * 0.45, r * 0.3, r * 0.2, 'rgba(255,255,255,0.85)', null, -0.5);
  }
}

/** Stage 0: vine sprouts with pale tendrils. */
function grapeSprout(p: Pen): void {
  spots(p, grid(3, 0.24, 0.76)).forEach((s, k) => {
    p.shadow(s.x, s.y, 3.4, 1.5, 0.25);
    stalk(p, { x: s.x, y: s.y }, { x: s.x - 0.4, y: s.y - 2 }, { x: s.x + 0.4, y: s.y - 3.6 }, VINE, 0.8);
    leaf(p, s.x, s.y - 3.2, 3.8, -2.5, 1.7, LEAF);
    leaf(p, s.x, s.y - 3.2, 3.8, -0.6, 1.7, shade(LEAF, -0.08));
    curl(p, s.x + 2.4, s.y - 4.6, 1.4, VINE);
    if (k % 3 === 0) sparkle(p, s.x - 4, s.y - 6, 1.2, GRAPE_LT);
  });
}

/** Stage 1: climbing vines with lobed leaves and little unripe green grapes. */
function grapeLeafy(p: Pen): void {
  for (const s of spots(p, QUINCUNX)) {
    p.shadow(s.x, s.y, 6, 2.7, 0.26);
    const mid = { x: s.x - 0.4, y: s.y - 8 };
    const top = { x: s.x + 0.4, y: s.y - 15 };
    stalk(p, { x: s.x, y: s.y }, mid, top, VINE, 1.2);
    lobedLeaf(p, s.x - 3.6, s.y - 4.4, 3.2, LEAF);
    lobedLeaf(p, mid.x + 3.4, mid.y - 1, 3, shade(LEAF, 0.08));
    grapeBunch(p, top.x + 2.4, top.y + 0.4, 0.7, UNRIPE);
    curl(p, mid.x - 3.4, mid.y - 3.6, 1.2, VINE);
  }
}

/** Stage 2: golden grape bunches hanging from the vines, glowing and sparkling. */
function grapeBearing(p: Pen): void {
  const pts = spots(p, QUINCUNX);
  pts.forEach((s, idx) => {
    const front = idx === pts.length - 1;
    p.shadow(s.x, s.y, 6.4, 2.8, 0.26);
    const mid = { x: s.x - 0.6, y: s.y - 12 };
    const top = { x: s.x + 0.4, y: s.y - 19 };
    stalk(p, { x: s.x, y: s.y }, mid, top, VINE, 1.5);
    leaf(p, s.x, s.y - 4, 8, -0.4, 3, LEAF);
    leaf(p, s.x, s.y - 4, 8, Math.PI + 0.4, 3, shade(LEAF, -0.08));
    lobedLeaf(p, mid.x - 0.5, mid.y + 2, 3.6, shade(LEAF, 0.06));
    const bunchY = top.y + 1;
    p.glow(top.x, bunchY + 3.6, front ? 9 : 7, GRAPE_LT, 0.4);
    grapeBunch(p, top.x, bunchY, front ? 1.15 : 0.95, GRAPE);
    if (front) sparkle(p, top.x + 8, top.y - 4, 1.7, '#fff8d0');
    if (idx % 2 === 1) sparkle(p, top.x - 7, top.y - 2, 1.2);
  });
}

// ---------------------------------------------------------------------------
// Lunar New Year: bok choy

/**
 * A bok choy head: a rosette of glossy green spoon-shaped leaves fanning out
 * from a chunky pale celadon base. (x, y) is the base; s scales it. faced puts
 * a kawaii face on the pale base.
 */
function bokChoy(p: Pen, x: number, y: number, s: number, faced: boolean): void {
  p.shadow(x, y + 0.6, 7.5 * s, 2.7 * s, 0.24);
  const pivot = { x, y: y - 1.8 * s };
  const len = 12.4 * s;
  // outer blades first, so the bright centre blades sit on top
  const blades: [number, string][] = [
    [-1.2, BOK_DARK],
    [1.2, BOK_DARK],
    [-0.66, BOK_MID],
    [0.66, BOK_MID],
    [-0.24, BOK_BRIGHT],
    [0.24, BOK_BRIGHT],
    [0, BOK_MID],
  ];
  for (const [off, dark] of blades) {
    const a = -Math.PI / 2 + off;
    const dx = Math.cos(a);
    const dy = Math.sin(a);
    const cx = pivot.x + dx * len * 0.5;
    const cy = pivot.y + dy * len * 0.5;
    // rounded spoon blade: a chunky ellipse whose long axis follows the fan
    p.ellipse(cx, cy, 3.6 * s, len * 0.5, sphere(p, cx - 1.2 * s, cy - 1.6 * s, len * 0.5, dark), p.outline, off);
    // a light midrib running up the blade
    p.line(
      [
        { x: pivot.x + dx * len * 0.2, y: pivot.y + dy * len * 0.2 },
        { x: pivot.x + dx * len * 0.78, y: pivot.y + dy * len * 0.78 },
      ],
      BOK_RIB,
      0.6 * s + 0.2,
    );
    // soft glossy highlight on the upper blade
    const hx = pivot.x + dx * len * 0.66 - 0.9 * s;
    const hy = pivot.y + dy * len * 0.66;
    p.ellipse(hx, hy, 0.8 * s, len * 0.16, 'rgba(255,255,255,0.45)', null, off);
  }
  // chunky pale celadon base where the stalks gather
  p.ellipse(x, y - 2.2 * s, 3.4 * s, 3 * s, sphere(p, x - 1 * s, y - 3.6 * s, 3.4 * s, BOK_CELERY));
  p.ellipse(x - 1.4 * s, y - 3.8 * s, 1.2 * s, 0.7 * s, 'rgba(255,255,255,0.85)', null, -0.4);
  if (faced) face(p, x, y - 2.8 * s, 1.3 * s);
}

/** Stage 0: tiny bok choy sprouts. */
function bokChoySprout(p: Pen): void {
  spots(p, grid(3, 0.24, 0.76)).forEach((s, k) => {
    bokChoy(p, s.x, s.y, 0.42, false);
    if (k % 3 === 0) sparkle(p, s.x + 4.4, s.y - 8, 1.2);
  });
}

/** Stage 1: five fresh bok choy heads. */
function bokChoyLeafy(p: Pen): void {
  for (const s of spots(p, QUINCUNX)) bokChoy(p, s.x, s.y, 0.8, false);
}

/** Stage 2: big bok choy heads, the front one smiling. */
function bokChoyBearing(p: Pen): void {
  const pts = spots(p, QUINCUNX);
  pts.forEach((s, idx) => {
    const front = idx === pts.length - 1;
    bokChoy(p, s.x, s.y, front ? 1.15 : 1, front);
    if (idx === 1) sparkle(p, s.x + 6.6, s.y - 18, 1.3);
  });
}

// ---------------------------------------------------------------------------
// Lunar New Year: lion dancer and lantern kid

/** A child inside a red-and-gold lion-dance head, with a fluffy mane and big eyes. */
function lionDancer(p: Pen, walk: boolean): void {
  local(p, () => {
    const b = walk ? -0.9 : 0;
    const hx = -0.4;
    const hy = -27 + b;
    p.shadow(0, 0, 10, 3.3, 0.25);
    kidLegs(p, walk, '#3a2a3a');

    const lp = walk ? { x: -10.4, y: -13.6 + b } : { x: -9.4, y: -11 + b };
    const rp = walk ? { x: 9.2, y: -9.8 + b } : { x: 9.4, y: -12.6 + b };
    arm(p, { x: -5.2, y: -14.2 + b }, lp, ROBE_RED);
    arm(p, { x: 5.2, y: -14.2 + b }, rp, ROBE_RED);
    p.circle(lp.x, lp.y, 2.6, GOLD);
    p.circle(rp.x, rp.y, 2.6, GOLD);

    // red robe with a gold hem and frogs
    p.roundRect(-6, -17.4 + b, 12, 11.4, 3.6, p.vgrad(-17.4 + b, -6 + b, '#ff4d45', LANTERN_DK));
    p.rect(-6, -8.8 + b, 12, 2.2, GOLD, null);
    for (const x of [-2.6, 2.6]) p.circle(x, -13 + b, 0.9, GOLD, null);

    // fluffy gold mane: an outline pass, then the puffs
    const puffs = Array.from({ length: 12 }, (_, i) => {
      const a = (i / 12) * Math.PI * 2 + 0.2;
      return { x: hx + Math.cos(a) * 9.2, y: hy + Math.sin(a) * 9.2, c: i % 2 ? LION_MANE : shade(LION_MANE, 0.1) };
    });
    for (const q of puffs) p.circle(q.x, q.y, 4.2, p.outline, null);
    for (const q of puffs) p.circle(q.x, q.y, 3.5, q.c, null);

    // the red face
    p.circle(hx, hy, 8.4, sphere(p, hx - 2.6, hy - 3, 8.4, LION_RED));
    for (const sx of [-1, 1]) {
      p.circle(hx + sx * 6.2, hy - 6.6, 2.4, LION_MANE);
      p.circle(hx + sx * 6.2, hy - 6.6, 1.1, LANTERN_DK, null);
    }
    p.ellipse(hx, hy - 4.8, 3.2, 1.9, LION_MANE, null);

    // big kawaii eyes
    for (const sx of [-1, 1]) {
      const ex = hx + sx * 3.6;
      const ey = hy - 0.4;
      p.circle(ex, ey, 2.7, WHITE);
      p.circle(ex + sx * 0.2 + 0.2, ey + 0.5, 1.7, EYE, null);
      p.circle(ex - 0.5, ey - 0.6, 0.6, WHITE, null);
      blush(p, hx + sx * 5.6, hy + 3.4, 0.9);
    }
    p.ellipse(hx, hy + 3.6, 4, 2.4, '#ffe08a');
    p.ellipse(hx, hy + 2.6, 1.6, 1.05, '#3b1a14', null);
    p.curve({ x: hx - 1.6, y: hy + 4.8 }, { x: hx, y: hy + 6.2 }, { x: hx + 1.6, y: hy + 4.8 }, INK, 0.7);
  });
}

/** A child in a gold tunic with a black bun, holding a round red paper lantern. */
function lanternKidRed(p: Pen, walk: boolean): void {
  local(p, () => {
    const b = walk ? -0.9 : 0;
    const hx = -0.4;
    const hy = -24 + b;
    p.shadow(0, 0, 9.5, 3.2, 0.25);
    kidLegs(p, walk, '#4a5a9a');

    const lh = walk ? { x: -9.6, y: -10.8 + b } : { x: -8.6, y: -11 + b };
    const rh = walk ? { x: 10.6, y: -13.4 + b } : { x: 9.6, y: -11.8 + b };
    arm(p, { x: -5.2, y: -14.2 + b }, lh, '#ffc94a');
    arm(p, { x: 5.2, y: -14.2 + b }, rh, '#ffc94a');

    // gold tunic with a red collar and frog closures
    p.roundRect(-6, -17.4 + b, 12, 11.4, 3.6, p.vgrad(-17.4 + b, -6 + b, '#ffe27a', '#f2a52a'));
    p.roundRect(-5.6, -17.6 + b, 11.2, 2.4, 1.2, LANTERN);
    for (const y of [-12.4, -9.4]) p.circle(-1.2, y + b, 0.9, LANTERN, null);

    kidHead(p, hx, hy, '#2a1d2a');
    p.circle(hx + 0.2, hy - 9.6, 3, '#2a1d2a');
    p.ellipse(hx - 0.8, hy - 10.6, 1, 0.6, 'rgba(255,255,255,0.3)', null, -0.4);

    paperLantern(p, 10.4, -5.4 + b, 5.4, 5.8);
  });
}

// ---------------------------------------------------------------------------
// Winter and new year: party kid

/** A party guest in a sparkly bodice, a striped cone hat and a noisemaker. */
function partyKid(p: Pen, walk: boolean): void {
  local(p, () => {
    const b = walk ? -0.9 : 0;
    const hx = -0.4;
    const hy = -24 + b;
    p.shadow(0, 0, 9.5, 3.2, 0.25);
    kidLegs(p, walk, PURPLE_DK);

    const lh = walk ? { x: -9.2, y: -12.6 + b } : { x: -8.4, y: -11.4 + b };
    const rh = walk ? { x: 9.6, y: -14.6 + b } : { x: 9, y: -12.4 + b };
    arm(p, { x: -5.2, y: -14.2 + b }, lh, PURPLE);
    arm(p, { x: 5.2, y: -14.2 + b }, rh, PURPLE);

    // sparkly bodice and a glittering hem
    p.roundRect(-6, -17.4 + b, 12, 11.4, 3.6, p.vgrad(-17.4 + b, -6 + b, '#c08bff', PURPLE));
    for (const [sx, sy] of [
      [-3.2, -14.2],
      [0, -15.4],
      [3.2, -14.2],
      [-1.6, -10.8],
      [1.6, -10.8],
    ]) {
      sparkle(p, sx, sy + b, 1.1, GOLD_LT);
    }
    p.roundRect(-6.2, -7.2 + b, 12.4, 2.2, 1, GOLD);

    // noisemaker: a gold tube, a pink bell and two curly streamers
    p.line([{ x: rh.x, y: rh.y }, { x: rh.x + 5, y: rh.y - 6.4 }], p.outline, 3.6);
    p.line([{ x: rh.x, y: rh.y }, { x: rh.x + 5, y: rh.y - 6.4 }], GOLD, 2);
    p.curve({ x: rh.x + 5.4, y: rh.y - 6.8 }, { x: rh.x + 10, y: rh.y - 9 }, { x: rh.x + 8.2, y: rh.y - 14 }, TEAL, 1.1);
    p.curve({ x: rh.x + 5.4, y: rh.y - 6.8 }, { x: rh.x + 5.8, y: rh.y - 14 }, { x: rh.x + 11, y: rh.y - 15 }, PINK, 1.1);
    p.circle(rh.x + 5.4, rh.y - 6.8, 2.5, PINK);

    kidHead(p, hx, hy, '#7a4a3a');

    // striped cone hat with a gold pompom
    const cone = [
      { x: hx - 5.6, y: hy - 6.4 },
      { x: hx + 5.6, y: hy - 6.4 },
      { x: hx + 2.6, y: hy - 16.4 },
    ];
    p.poly(cone, PINK);
    clipTo(p, cone, () => {
      p.rect(hx - 7, hy - 9.4, 16, 2.2, GOLD, null);
      p.rect(hx - 7, hy - 13.6, 16, 2.2, TEAL, null);
    });
    p.poly(cone, null);
    p.ellipse(hx, hy - 6.4, 6, 1.7, PINK);
    p.circle(hx + 2.6, hy - 17, 1.9, GOLD_LT);
  });
}

// ---------------------------------------------------------------------------
// Costume accessories (overlays, drawn at the animal head position)

/** A jolly red Santa hat with a white fur trim and a drooping pompom. */
function santaHat(p: Pen): void {
  const cx = p.center.x;
  const base = p.center.y - 11;
  const ctx = p.ctx;
  ctx.beginPath();
  ctx.moveTo(cx - 5.6, base);
  ctx.lineTo(cx + 5.6, base);
  ctx.quadraticCurveTo(cx + 5.4, base - 7, cx + 6.8, base - 14.4);
  ctx.quadraticCurveTo(cx + 0.4, base - 12.6, cx - 5.6, base - 1);
  ctx.closePath();
  ctx.fillStyle = RED;
  ctx.fill();
  ctx.strokeStyle = p.outline;
  ctx.lineWidth = p.lineWidth;
  ctx.stroke();
  p.ellipse(cx - 2.4, base - 6.4, 1.1, 2.6, 'rgba(255,255,255,0.35)', null, 0.25);
  p.roundRect(cx - 6.4, base - 2.6, 12.8, 3.6, 1.8, WHITE);
  p.circle(cx + 6.8, base - 14.8, 2.1, WHITE);
}

/** A pair of little antlers with a red bow where they meet. */
function reindeerAntlers(p: Pen): void {
  const cx = p.center.x;
  const base = p.center.y - 11;
  const antler = (pts: Pt[], w: number): void => {
    p.line(pts, p.outline, w + 1);
    p.line(pts, ANTLER, w);
  };
  for (const s of [-1, 1]) {
    const X = (d: number) => cx + s * d;
    antler(
      [
        { x: X(1.4), y: base },
        { x: X(4.6), y: base - 7 },
        { x: X(5.4), y: base - 14.5 },
      ],
      2,
    );
    antler(
      [
        { x: X(4.4), y: base - 7.2 },
        { x: X(9.4), y: base - 10.6 },
      ],
      1.5,
    );
    antler(
      [
        { x: X(5), y: base - 11.4 },
        { x: X(8.8), y: base - 16 },
      ],
      1.4,
    );
    p.circle(X(5.4), base - 14.5, 1.1, CREAM, p.outline);
    p.circle(X(9.4), base - 10.6, 0.9, CREAM, p.outline);
  }
  // a fat red bow where the antlers meet
  p.poly(
    [
      { x: cx, y: base + 0.8 },
      { x: cx - 4.2, y: base - 2.4 },
      { x: cx - 4.2, y: base + 3.6 },
    ],
    RED,
  );
  p.poly(
    [
      { x: cx, y: base + 0.8 },
      { x: cx + 4.2, y: base - 2.4 },
      { x: cx + 4.2, y: base + 3.6 },
    ],
    RED,
  );
  p.circle(cx, base + 0.8, 1.6, RED_DK);
}

/** A tiny striped knit beanie with a ribbed band and a cream pompom. */
function winterBeanie(p: Pen): void {
  const cx = p.center.x;
  const base = p.center.y - 11;
  // striped dome: teal with cream bands, clipped to its own outline
  p.save();
  p.ctx.beginPath();
  p.ctx.ellipse(cx, base - 6, 7.4, 8, 0, 0, Math.PI * 2);
  p.ctx.fillStyle = TEAL;
  p.ctx.fill();
  p.ctx.clip();
  for (const y of [-12.4, -8.4, -4.4]) p.rect(cx - 9, base + y, 18, 1.8, CREAM, null);
  p.restore();
  p.ellipse(cx, base - 6, 7.4, 8, null);
  p.roundRect(cx - 7.8, base - 2.8, 15.6, 4.6, 2, shade(TEAL, -0.2));
  for (const x of [-4.8, -1.6, 1.6, 4.8]) p.line([{ x: cx + x, y: base - 2.2 }, { x: cx + x, y: base + 1.4 }], shade(TEAL, -0.45), 0.5);
  p.circle(cx, base - 14.6, 2.6, CREAM);
}

/** A little red cap with a gold button and a dangling gold tassel. */
function luckyCap(p: Pen): void {
  const cx = p.center.x;
  const base = p.center.y - 11;
  // a flat-topped round red cap with a thin gold trim and a gold button
  p.ellipse(cx, base - 2.4, 7.6, 5.6, sphere(p, cx - 1.8, base - 5, 7.6, LANTERN));
  p.ellipse(cx - 2.8, base - 5.2, 2, 0.9, 'rgba(255,255,255,0.45)', null, -0.3);
  p.roundRect(cx - 7.4, base - 1.4, 14.8, 2.6, 1.2, GOLD);
  p.circle(cx, base - 7.8, 1.8, GOLD);
  // a long gold tassel: a curved cord down the side, ending in a fat bulb and fringe
  p.curve({ x: cx + 0.6, y: base - 6.4 }, { x: cx + 5.6, y: base - 4.6 }, { x: cx + 5.4, y: base + 2.6 }, GOLD_DK, 1.3);
  p.ellipse(cx + 5.4, base + 4.4, 2.4, 3.2, GOLD);
  p.line([{ x: cx + 4.2, y: base + 7 }, { x: cx + 3.9, y: base + 8.8 }], GOLD_DK, 0.7);
  p.line([{ x: cx + 6.6, y: base + 7 }, { x: cx + 6.9, y: base + 8.8 }], GOLD_DK, 0.7);
}

/** A striped party hat with a pom-pom on the tip. */
function partyHat(p: Pen): void {
  const cx = p.center.x;
  const base = p.center.y - 11;
  const cone = [
    { x: cx - 5.4, y: base - 0.6 },
    { x: cx + 5.4, y: base - 0.6 },
    { x: cx + 0.4, y: base - 16 },
  ];
  p.poly(cone, PINK);
  clipTo(p, cone, () => {
    p.rect(cx - 8, base - 3.8, 16, 2.2, GOLD, null);
    p.rect(cx - 8, base - 8.6, 16, 2.2, TEAL, null);
    p.rect(cx - 8, base - 13.4, 16, 2.2, GOLD, null);
  });
  p.poly(cone, null);
  p.ellipse(cx, base - 0.6, 6.2, 1.8, GOLD);
  p.circle(cx + 0.4, base - 16.4, 2.2, WHITE);
}

// ---------------------------------------------------------------------------
// Icons (flat 40x40)

/** A glittery six-arm snowflake with a tiny smile in the middle. */
function iconSnowflake(p: Pen): void {
  const cx = 20;
  const cy = 20;
  p.glow(cx, cy, 19, '#bfe9ff', 0.5);
  const segs: Pt[][] = [];
  for (let k = 0; k < 6; k++) {
    const a = -Math.PI / 2 + (k * Math.PI) / 3;
    const at = (t: number): Pt => ({ x: cx + Math.cos(a) * t, y: cy + Math.sin(a) * t });
    segs.push([{ x: cx, y: cy }, at(15)]);
    for (const t of [7, 11]) {
      const m = at(t);
      for (const s of [-1, 1]) {
        const b = a + s * 0.85;
        segs.push([m, { x: m.x + Math.cos(b) * 4.2, y: m.y + Math.sin(b) * 4.2 }]);
      }
    }
    sparkle(p, at(17.5).x, at(17.5).y, k % 2 ? 1.5 : 1.9, '#fffbe0');
  }
  for (const seg of segs) p.line(seg, p.outline, 3.2);
  for (const seg of segs) p.line(seg, ICE, 1.6);
  for (const seg of segs) p.line(seg, ICE_EDGE, 0.5);
  p.circle(cx, cy, 6.4, WHITE);
  face(p, cx, cy + 0.6, 1.6);
  sparkle(p, 5, 6, 2.2, '#fffbe0');
  sparkle(p, 34, 33, 1.8, '#fffbe0');
  sparkle(p, 33, 7, 1.2);
}

/** A swirl candy with a face, sprouting from two mint leaves. */
function iconPeppermint(p: Pen): void {
  p.shadow(20, 36, 11, 2.8, 0.25);
  leaf(p, 19, 13, 7, -Math.PI / 2 - 0.7, 2.8, MINT);
  leaf(p, 21, 13, 7, -Math.PI / 2 + 0.7, 2.8, shade(MINT, -0.1));
  swirl(p, 20, 22.4, 13);
  face(p, 20, 23.4, 2.6);
  sparkle(p, 6, 8, 2.2);
  sparkle(p, 34, 12, 1.5, '#fffbe0');
}

/** A burst of confetti from a party popper. */
function iconConfetti(p: Pen): void {
  p.shadow(14, 37, 10, 2.4, 0.22);
  const ctx = p.ctx;
  ctx.save();
  ctx.translate(10, 31);
  ctx.rotate(-0.78);
  p.roundRect(-3, -4.4, 16, 8.8, 3, PINK);
  ctx.fillStyle = GOLD;
  ctx.fillRect(1.6, -4.4, 2.2, 8.8);
  ctx.fillRect(8.6, -4.4, 2.2, 8.8);
  p.roundRect(-5.2, -3.2, 3, 6.4, 1.2, TEAL);
  p.ellipse(13.2, 0, 1.8, 4.8, GOLD);
  ctx.restore();

  const rand = rng('confetti-icon');
  const mx = 19.3;
  const my = 22;
  for (let i = 0; i < 14; i++) {
    const a = -1 + (rand() - 0.5) * 1.5;
    const d = 5 + rand() * 12;
    piece(p, mx + Math.cos(a) * d, my + Math.sin(a) * d, 3.4, 1.8, rand() * Math.PI, CONFETTI[i % CONFETTI.length], true);
  }
  p.curve({ x: mx, y: my }, { x: 27, y: 16 }, { x: 35, y: 14 }, '#4fd1c5', 1.1);
  curl(p, 31, 9, 2.2, '#8b5cf6');
  curl(p, 14, 12, 1.8, '#fb923c');
  sparkle(p, 34, 30, 1.6, '#fffbe0');
}

/** One confetti rectangle, rotated; optional outline for the bigger icon. */
function piece(p: Pen, x: number, y: number, w: number, h: number, rot: number, color: string, edge: boolean): void {
  const ctx = p.ctx;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.fillStyle = color;
  ctx.fillRect(-w / 2, -h / 2, w, h);
  if (edge) {
    ctx.strokeStyle = p.outline;
    ctx.lineWidth = 0.5;
    ctx.strokeRect(-w / 2, -h / 2, w, h);
  }
  ctx.restore();
}

/** Confetti scattered across the canvas, for the particle. */
function fxConfetti(p: Pen): void {
  const rand = rng('confetti-fx');
  for (let i = 0; i < 14; i++) {
    const x = 4 + rand() * 32;
    const y = 4 + rand() * 32;
    piece(p, x, y, 5 + rand() * 1.8, 2.6 + rand() * 0.9, rand() * Math.PI, CONFETTI[i % CONFETTI.length], false);
  }
  curl(p, 9, 30, 2.6, '#8b5cf6');
  curl(p, 31, 25, 2.6, '#fb923c');
  curl(p, 28, 6, 2.2, '#4fd1c5');
  curl(p, 6, 14, 2, '#ff5fa2');
  sparkle(p, 6, 6, 1.8, '#fffbe0');
  sparkle(p, 34, 14, 1.6, '#fffbe0');
  sparkle(p, 20, 36, 1.4, '#fffbe0');
}

/** A bunch of shiny golden grapes with a leaf and sparkles. */
function iconGoldenGrape(p: Pen): void {
  p.shadow(20, 36, 9, 2.4, 0.22);
  p.glow(20, 22, 15, GRAPE_LT, 0.45);
  leaf(p, 20, 9, 6, -Math.PI / 2 + 0.6, 2.6, LEAF);
  lobedLeaf(p, 28, 11, 4.4, LEAF);
  grapeBunch(p, 20, 13.4, 2, GRAPE);
  sparkle(p, 6, 9, 2, '#fffbe0');
  sparkle(p, 34, 27, 1.6, '#fffbe0');
  sparkle(p, 9, 30, 1.2, '#fffbe0');
}

/** A red envelope with a gold border, corner dots and a gold coin medallion. */
function iconRedEnvelope(p: Pen): void {
  p.shadow(20, 35, 12, 2.8, 0.22);
  p.roundRect(7.4, 8.4, 25.2, 26.4, 2.6, ENVELOPE);
  p.poly(
    [
      { x: 7.4, y: 8.4 },
      { x: 32.6, y: 8.4 },
      { x: 20, y: 22 },
    ],
    ENVELOPE_DK,
  );
  p.roundRect(9.6, 10.6, 20.8, 22.8, 1.6, null, GOLD);
  for (const [x, y] of [
    [12.4, 27.4],
    [27.6, 27.4],
    [12.4, 14],
    [27.6, 14],
  ] as const) {
    p.circle(x, y, 1.1, GOLD, null);
  }
  p.circle(20, 24.6, 5.2, sphere(p, 18.6, 23.4, 5.2, GOLD), GOLD_DK);
  p.rect(18.4, 23, 3.2, 3.2, ENVELOPE, null);
  p.ellipse(18.4, 22, 1.2, 0.6, 'rgba(255,255,255,0.7)', null, -0.4);
  sparkle(p, 33.4, 7, 1.6, '#fff3c0');
  sparkle(p, 6.4, 33, 1.3, '#fff3c0');
}

/** A bok choy head on a little shadow, with a smiling face on its heart. */
function iconBokChoy(p: Pen): void {
  bokChoy(p, 20, 35, 1.5, true);
  sparkle(p, 6, 9, 2, '#fffbe0');
  sparkle(p, 34, 14, 1.4, '#fffbe0');
}

/** A round glowing red paper lantern with a gold tassel. */
function fxRedLantern(p: Pen): void {
  p.glow(20, 20, 19, '#ffb08a', 0.5);
  paperLantern(p, 20, 18.6, 11.6, 12.4);
  sparkle(p, 6, 7, 1.8, '#fff3c0');
  sparkle(p, 34, 30, 1.4, '#fff3c0');
}

// ---------------------------------------------------------------------------
// Exports

export const sprites: SpriteSpec[] = [
  { key: 'crop:peppermint:0', fw: 1, fh: 1, height: 26, paint: (p) => thin(p, 0.7, () => peppermintSprout(p)) },
  { key: 'crop:peppermint:1', fw: 1, fh: 1, height: 40, paint: (p) => thin(p, 0.9, () => peppermintLeafy(p)) },
  { key: 'crop:peppermint:2', fw: 1, fh: 1, height: 40, paint: (p) => thin(p, 0.9, () => peppermintBearing(p)) },

  { key: 'npc:caroler_red', fw: 1, fh: 1, height: KID_H, paint: (p) => carolerRed(p, false) },
  { key: 'npc:caroler_red_walk', fw: 1, fh: 1, height: KID_H, paint: (p) => carolerRed(p, true) },
  { key: 'npc:caroler_green', fw: 1, fh: 1, height: KID_H, paint: (p) => carolerGreen(p, false) },
  { key: 'npc:caroler_green_walk', fw: 1, fh: 1, height: KID_H, paint: (p) => carolerGreen(p, true) },

  { key: 'costume:santa_hat', fw: 1, fh: 1, height: 20, paint: santaHat },
  { key: 'costume:reindeer_antlers', fw: 1, fh: 1, height: 20, paint: reindeerAntlers },
  { key: 'costume:winter_scarf', fw: 1, fh: 1, height: 20, paint: winterBeanie },

  { key: 'crop:golden_grape:0', fw: 1, fh: 1, height: 26, paint: (p) => thin(p, 0.7, () => grapeSprout(p)) },
  { key: 'crop:golden_grape:1', fw: 1, fh: 1, height: 40, paint: (p) => thin(p, 0.9, () => grapeLeafy(p)) },
  { key: 'crop:golden_grape:2', fw: 1, fh: 1, height: 40, paint: (p) => thin(p, 0.9, () => grapeBearing(p)) },

  { key: 'npc:party_kid', fw: 1, fh: 1, height: KID_H, paint: (p) => partyKid(p, false) },
  { key: 'npc:party_kid_walk', fw: 1, fh: 1, height: KID_H, paint: (p) => partyKid(p, true) },
  { key: 'costume:party_hat', fw: 1, fh: 1, height: 20, paint: partyHat },

  { key: 'crop:bok_choy:0', fw: 1, fh: 1, height: 26, paint: (p) => thin(p, 0.7, () => bokChoySprout(p)) },
  { key: 'crop:bok_choy:1', fw: 1, fh: 1, height: 40, paint: (p) => thin(p, 0.9, () => bokChoyLeafy(p)) },
  { key: 'crop:bok_choy:2', fw: 1, fh: 1, height: 40, paint: (p) => thin(p, 0.9, () => bokChoyBearing(p)) },

  { key: 'npc:lion_dancer', fw: 1, fh: 1, height: KID_H, paint: (p) => lionDancer(p, false) },
  { key: 'npc:lion_dancer_walk', fw: 1, fh: 1, height: KID_H, paint: (p) => lionDancer(p, true) },
  { key: 'npc:lantern_kid_red', fw: 1, fh: 1, height: KID_H, paint: (p) => lanternKidRed(p, false) },
  { key: 'npc:lantern_kid_red_walk', fw: 1, fh: 1, height: KID_H, paint: (p) => lanternKidRed(p, true) },
  { key: 'costume:lucky_cap', fw: 1, fh: 1, height: 20, paint: luckyCap },
];

export const icons: IconSpec[] = [
  { key: 'icon:snowflake', paint: iconSnowflake },
  { key: 'icon:peppermint', paint: iconPeppermint },
  { key: 'icon:confetti', paint: iconConfetti },
  { key: 'fx:confetti', paint: fxConfetti },
  { key: 'icon:golden_grape', paint: iconGoldenGrape },
  { key: 'icon:red_envelope', paint: iconRedEnvelope },
  { key: 'icon:bok_choy', paint: iconBokChoy },
  { key: 'fx:red_lantern', paint: fxRedLantern },
];
