// County Fair: the Meadowbrook County Fair midway. Sprites are the carousel
// horse, cotton candy cart, ribbon easel, prize pumpkin, high striker, ferris
// wheel and golden trophy; icons are the fair tent and the raffle ticket.
// Same house style as market.ts and town.ts: pastel fills, the warm brown
// OUTLINE, top-left light, soft gradients and glossy highlights.
import { type IconSpec, type Pen, type Pt, type SpriteSpec, OUTLINE, shade } from './kit';

type Ctx = CanvasRenderingContext2D;
type Fill = string | CanvasGradient | null;

const O = OUTLINE;
const INK = '#2b1d14';
const CHALK = '#fffdf5';
const BLUSH = 'rgba(255,110,140,0.5)';

const MINT = '#a8e6cf';
const CREAM = '#fff4e4';
const BUTTER = '#ffe49a';
const PINK = '#ffb3cf';
const PINK_D = '#e77fa6';
const PINK_L = '#ffdbe8';
const LILAC = '#c9b8f5';
const LEAF = '#6cbf55';
const WOOD = '#c98b53';
const WOOD_L = '#f2c58f';
const WOOD_DD = '#7a4f2e';
const STEM = '#8c6a3f';
const GOLD = '#f4c24a';
const GOLD_L = '#fff0a6';
const GOLD_D = '#c98b1f';
const BLUE = '#8fc8f5';
const RED = '#f08a94';
const WHITE = '#fffdf6';
const YELLOW = '#ffd84a';
const CORK = '#e9c9a0';
const ORANGE = '#ffb35c';
const HORSE = '#ffd6ea';
const MALLET = '#f38b9b';

// ---------------------------------------------------------------------------
// Helpers

const pt = (x: number, y: number): Pt => ({ x, y });

/** A thick outlined stick between points (legs, poles, handles). */
function stick(p: Pen, pts: Pt[], w: number, color: string): void {
  p.line(pts, O, w + 1.6);
  p.line(pts, color, w);
}

/** Build a path with raw canvas calls, then fill and/or stroke it. */
function shape(p: Pen, build: (c: Ctx) => void, fill: Fill, stroke: string | null = O, width = 1.1): void {
  const c = p.ctx;
  c.beginPath();
  build(c);
  c.closePath();
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

/** An open curve drawn thick with an outline (handles, tails). */
function thickCurve(p: Pen, build: (c: Ctx) => void, color: string, w: number): void {
  const c = p.ctx;
  c.beginPath();
  build(c);
  c.strokeStyle = O;
  c.lineWidth = w + 1.6;
  c.stroke();
  c.beginPath();
  build(c);
  c.strokeStyle = color;
  c.lineWidth = w;
  c.stroke();
}

/** A four-point glint. */
function sparkle(p: Pen, x: number, y: number, r: number, color = CHALK): void {
  const pts: Pt[] = [];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 - Math.PI / 2;
    const rr = i % 2 === 0 ? r : r * 0.3;
    pts.push(pt(x + Math.cos(a) * rr, y + Math.sin(a) * rr));
  }
  p.poly(pts, color, O, 0.7);
}

/** A pleated prize rosette with two ribbon tails, centred at (x, y). */
function rosette(p: Pen, x: number, y: number, r: number, color: string): void {
  const tail = shade(color, -0.16);
  p.poly([pt(x - r * 0.45, y + r * 0.4), pt(x - r * 1.05, y + r * 1.75), pt(x - r * 0.1, y + r * 1.45)], tail, O, 0.8);
  p.poly([pt(x + r * 0.45, y + r * 0.4), pt(x + r * 0.1, y + r * 1.45), pt(x + r * 1.05, y + r * 1.75)], tail, O, 0.8);
  // pleats: outline pass first so the scallops read as one silhouette
  const n = 9;
  const pleats: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    pleats.push(pt(x + Math.cos(a) * r * 0.72, y + Math.sin(a) * r * 0.72));
  }
  for (const q of pleats) p.circle(q.x, q.y, r * 0.42 + 0.8, O, null);
  for (const q of pleats) p.circle(q.x, q.y, r * 0.42, color, null);
  p.circle(x, y, r * 0.82, color, O);
  p.circle(x, y, r * 0.52, shade(color, 0.22), null);
  p.circle(x, y, r * 0.2, shade(color, -0.25), null);
  p.ellipse(x - r * 0.3, y - r * 0.36, r * 0.2, r * 0.12, 'rgba(255,255,255,0.65)', null, -0.5);
}

// ---------------------------------------------------------------------------
// 1. Carousel horse (1x1)

function carouselHorse(p: Pen): void {
  const { x: cx, y: G } = p.center;
  p.shadow(cx, G + 2, 21, 10, 0.25);

  // round base: a pink drum with a gold inlay on top
  p.cylinder(cx, G + 1, 18, 5, PINK);
  p.ellipse(cx, G - 4, 12, 6, GOLD, O);

  // the striped pole: gold and pink rings, a gold finial on top
  for (let i = 0; i < 7; i++) p.rect(cx - 2.2, G - 4 - (i + 1) * 7, 4.4, 7, i % 2 ? PINK : GOLD);
  p.ball(cx, G - 56, 3, GOLD);

  // legs: two fore, two hind, each ending in a little gold hoof
  stick(p, [pt(22, G - 34), pt(15, G - 21)], 4, HORSE);
  stick(p, [pt(27, G - 33), pt(25, G - 19)], 4, HORSE);
  stick(p, [pt(37, G - 33), pt(40, G - 19)], 4, HORSE);
  stick(p, [pt(42, G - 35), pt(50, G - 23)], 4, HORSE);
  const hooves: [number, number][] = [
    [15, G - 21],
    [25, G - 19],
    [40, G - 19],
    [50, G - 23],
  ];
  for (const [x, y] of hooves) p.ellipse(x, y, 2.4, 1.8, GOLD, O);

  // tail, flowing back to the right
  stick(p, [pt(46, G - 43), pt(54, G - 47), pt(57, G - 40)], 3.2, LILAC);
  p.circle(57, G - 40, 3.4, LILAC);

  // body, a soft gradient from cream at the top to pink below
  p.roundRect(19, G - 48, 28, 17, 8, p.vgrad(G - 48, G - 31, '#fff3f9', HORSE));
  p.ellipse(33, G - 34, 10, 2.4, shade(HORSE, -0.1), null);
  p.curve(pt(21, G - 37), pt(24, G - 35), pt(27, G - 34), 'rgba(255,255,255,0.7)', 1.4);

  // neck, then the lilac mane puffing along its back
  stick(p, [pt(22, G - 44), pt(14, G - 56)], 9, HORSE);
  const mane: [number, number, number][] = [
    [24.4, G - 46.4, 3.2],
    [22, G - 50, 3.2],
    [19.6, G - 53.6, 3.1],
    [18, G - 56, 3],
  ];
  for (const [x, y, r] of mane) p.circle(x, y, r, LILAC);

  // ear, head, muzzle and face
  p.poly([pt(9.5, G - 61), pt(8.5, G - 67.5), pt(14, G - 62.5)], HORSE, O, 1);
  p.poly([pt(10.4, G - 62.4), pt(9.8, G - 65.6), pt(12.6, G - 63)], PINK_D, null);
  p.ellipse(11.5, G - 58, 6.2, 5, HORSE, O, -0.35);
  p.ellipse(7.2, G - 54.5, 3.6, 3, shade(HORSE, 0.25), O, -0.3);
  p.circle(5.2, G - 55.5, 0.6, PINK_D, null);
  p.circle(12, G - 59.5, 1.5, INK, null);
  p.circle(12.5, G - 60, 0.5, '#ffffff', null);
  p.ellipse(14.5, G - 55, 2, 1.2, BLUSH, null);

  // a tiny saddle on the back, with a heart
  p.roundRect(25, G - 52, 14, 10, 4, MINT);
  p.line([pt(26.8, G - 43.6), pt(37.2, G - 43.6)], shade(MINT, -0.3), 0.9);
  p.heart(32, G - 47, 3.2, PINK, PINK_D);

  sparkle(p, 55, G - 61, 2.8);
  sparkle(p, 58, G - 30, 2);
}

// ---------------------------------------------------------------------------
// 2. Cotton candy cart (1x1)

function cottonCandyCart(p: Pen): void {
  const { x: cx, y: G } = p.center;
  p.shadow(cx, G + 1, 27, 13, 0.25);

  // the cart: a pink box, with a cream band and polka dots on its front faces
  p.box(0.14, 0.14, 0.72, 0.72, 22, { top: '#ffe8f3', left: PINK, right: shade(PINK, -0.2) });
  p.poly([p.iso(0.14, 0.86, 9), p.iso(0.86, 0.86, 9), p.iso(0.86, 0.86, 13), p.iso(0.14, 0.86, 13)], CREAM, O, 0.8);
  p.poly([p.iso(0.86, 0.14, 9), p.iso(0.86, 0.86, 9), p.iso(0.86, 0.86, 13), p.iso(0.86, 0.14, 13)], shade(CREAM, -0.06), O, 0.8);
  for (const u of [0.26, 0.42, 0.58, 0.74]) {
    const d = p.iso(u, 0.86, 11);
    p.circle(d.x, d.y, 1.1, PINK_D, null);
  }

  // two little wheels on the front-left face
  for (const u of [0.3, 0.7]) {
    const w = p.iso(u, 0.86, 5);
    p.circle(w.x, w.y, 4.2, WOOD_DD, O);
    p.circle(w.x, w.y, 1.4, WOOD_L, null);
  }

  // umbrella poles rise from the cart's two top corners
  const yb = G - 66; // hem of the canopy
  const left = p.iso(0.14, 0.86, 22);
  const right = p.iso(0.86, 0.14, 22);
  stick(p, [left, pt(left.x, yb)], 2.4, WOOD);
  stick(p, [right, pt(right.x, yb)], 2.4, WOOD);

  // the bowl and the spinning cloud of candy floss
  p.cylinder(cx, G - 22, 10.5, 6, CREAM);
  const cy = G - 41;
  const puffs: [number, number, number, string][] = [
    [-10, 3, 6.5, PINK],
    [10, 3, 6.5, BLUE],
    [-5, -5, 7.5, BLUE],
    [6, -5, 7.5, PINK],
    [0, -10, 6, PINK],
    [-6, 7, 6, BLUE],
    [6, 7, 6, PINK],
    [0, 1, 8, '#efe3ff'],
  ];
  for (const [dx, dy, r] of puffs) p.circle(cx + dx, cy + dy, r + 1.1, O, null);
  for (const [dx, dy, r, col] of puffs) p.circle(cx + dx, cy + dy, r, col, null);
  for (const [dx, dy, r] of puffs) p.ellipse(cx + dx - r * 0.35, cy + dy - r * 0.4, r * 0.36, r * 0.24, 'rgba(255,255,255,0.8)', null, -0.5);
  // motion ticks to show it spinning
  p.curve(pt(cx - 20, cy - 6), pt(cx - 23, cy), pt(cx - 20, cy + 6), PINK_D, 1.2);
  p.curve(pt(cx + 20, cy - 6), pt(cx + 23, cy), pt(cx + 20, cy + 6), PINK_D, 1.2);

  // two cones on a wooden rack at the front corners of the cart
  for (const x of [17.3, 46.7]) {
    const base = G - 25;
    p.roundRect(x - 7.5, base, 15, 3, 1.2, WOOD_L);
    shape(
      p,
      (c) => {
        c.moveTo(x - 4.5, base);
        c.lineTo(x - 1.2, base - 14.5);
        c.quadraticCurveTo(x, base - 16, x + 1.2, base - 14.5);
        c.lineTo(x + 4.5, base);
      },
      '#f6c27a',
      O,
      1,
    );
    p.line([pt(x - 2.6, base - 4), pt(x + 2.6, base - 8)], WOOD, 0.7);
    p.line([pt(x + 2.6, base - 4), pt(x - 2.6, base - 8)], WOOD, 0.7);
    p.ball(x, base - 17, 3.4, PINK);
  }

  // the striped umbrella: pink and cream wedges, scalloped hem, gold knob
  const dome = (c: Ctx): void => {
    c.moveTo(9, yb);
    c.bezierCurveTo(9, yb - 25, 55, yb - 25, 55, yb);
  };
  const ctx = p.ctx;
  ctx.save();
  ctx.beginPath();
  dome(ctx);
  ctx.closePath();
  ctx.clip();
  const sw = 46 / 6;
  for (let i = 0; i < 6; i++) {
    ctx.fillStyle = i % 2 ? CREAM : PINK;
    ctx.fillRect(9 + i * sw, yb - 30, sw + 0.5, 40);
  }
  ctx.restore();
  shape(p, dome, null, O, 1.1);
  for (let i = 0; i < 6; i++) {
    const x0 = 9 + i * sw;
    const x1 = x0 + sw;
    shape(
      p,
      (c) => {
        c.moveTo(x0, yb);
        c.quadraticCurveTo((x0 + x1) / 2, yb + 10, x1, yb);
      },
      i % 2 ? CREAM : PINK,
      O,
      1,
    );
  }
  p.ball(cx, yb - 21, 2.6, GOLD);
}

// ---------------------------------------------------------------------------
// 3. Ribbon board (1x1)

function ribbonBoard(p: Pen): void {
  const { x: cx, y: G } = p.center;
  p.shadow(cx, G + 1, 17, 6, 0.25);

  // A-frame easel legs, tucked behind the board
  stick(p, [pt(cx, G - 40), pt(19, G - 1)], 3.4, WOOD);
  stick(p, [pt(cx, G - 40), pt(45, G - 1)], 3.4, WOOD);

  // the board: a wooden frame around a cork face
  p.roundRect(8, G - 58, 48, 42, 4, WOOD);
  p.roundRect(11.5, G - 54.5, 41, 35, 2.5, CORK, 'rgba(122,79,46,0.6)');
  p.line([pt(13, G - 56.6), pt(40, G - 56.6)], 'rgba(255,240,215,0.6)', 1);

  // rosettes in a 4x3 grid, alternating blue, red, white and yellow
  const colours = [BLUE, RED, WHITE, YELLOW];
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 4; c++) {
      rosette(p, 18 + c * 9, G - 49 + r * 10, 4.1, colours[(r * 2 + c) % 4]);
    }
  }

  // the ledge the board rests on
  p.roundRect(20, G - 18, 24, 4, 1.6, WOOD_L);

  // a gold "1st" star on top
  p.star(cx, G - 62, 9.5, '#ffd84a', O);
  p.text('1st', cx, G - 62.5, 5, '#7a4a10');
}

// ---------------------------------------------------------------------------
// 4. Prize pumpkin (1x1)

function prizePumpkin(p: Pen): void {
  const { x: cx, y: G } = p.center;
  p.shadow(cx, G + 1, 27, 12, 0.25);

  // the wooden pallet it sits on
  p.box(0.1, 0.1, 0.8, 0.8, 5, { top: '#f5d19c', left: WOOD, right: shade(WOOD, -0.2) });
  for (const v of [0.3, 0.5, 0.7]) p.line([p.iso(0.1, v, 5), p.iso(0.9, v, 5)], shade(WOOD, -0.3), 1);

  // the enormous pumpkin, resting on the pallet
  const cy = G - 24;
  const body = p.ctx.createRadialGradient(cx - 8, cy - 8, 2, cx, cy, 26);
  body.addColorStop(0, shade(ORANGE, 0.35));
  body.addColorStop(0.6, ORANGE);
  body.addColorStop(1, shade(ORANGE, -0.22));
  p.ellipse(cx, cy, 25, 19, body);
  for (const s of [-1, 1]) {
    p.curve(pt(cx + s * 5, cy - 18), pt(cx + s * 19, cy), pt(cx + s * 5, cy + 18), shade(ORANGE, -0.3), 1.1);
    p.curve(pt(cx + s * 14, cy - 15), pt(cx + s * 22, cy), pt(cx + s * 14, cy + 15), shade(ORANGE, -0.3), 1);
  }
  p.ellipse(cx - 11, cy - 8, 5, 2.8, 'rgba(255,255,255,0.5)', null, -0.5);

  // stem and leaf on top
  stick(p, [pt(cx + 1, cy - 18), pt(cx + 2, cy - 27)], 4, STEM);
  p.ellipse(cx + 8, cy - 25, 6, 3.2, LEAF, O, -0.35);
  p.line([pt(cx + 4, cy - 24), pt(cx + 11, cy - 26)], shade(LEAF, -0.3), 0.8);

  // a cheerful, closed-eye face
  p.curve(pt(cx - 11, cy - 4), pt(cx - 8, cy - 8), pt(cx - 5, cy - 4), O, 1.3);
  p.curve(pt(cx + 5, cy - 4), pt(cx + 8, cy - 8), pt(cx + 11, cy - 4), O, 1.3);
  p.curve(pt(cx - 4, cy + 1), pt(cx, cy + 5), pt(cx + 4, cy + 1), O, 1.2);
  p.ellipse(cx - 13, cy + 1, 2.6, 1.6, BLUSH, null);
  p.ellipse(cx + 13, cy + 1, 2.6, 1.6, BLUSH, null);

  // the big blue prize rosette
  rosette(p, cx, cy + 12.5, 5.6, BLUE);
}

// ---------------------------------------------------------------------------
// 5. High striker (1x1, tall)

function highStriker(p: Pen): void {
  const { x: cx, y: G } = p.center;
  p.shadow(cx, G + 1, 17, 7, 0.25);

  // a round wooden base
  p.cylinder(cx, G + 1, 14, 6, WOOD);

  // the mallet, leaning against the base
  stick(p, [pt(cx + 12, G - 1), pt(cx + 21, G - 26)], 3, WOOD_L);
  p.ellipse(cx + 21.5, G - 28, 4.8, 3.2, MALLET, O, -0.5);

  // the striker post: stacked rings, each labelled with its strength
  const cols = [PINK, BUTTER, MINT, LILAC, PINK];
  const labels = ['5', '10', '25', '50', '100'];
  for (let i = 0; i < 5; i++) {
    const y = G - 5 - i * 14;
    p.cylinder(cx, y, 5.5, 14, cols[i]);
    p.text(labels[i], cx, y - 7, labels[i].length > 2 ? 5 : 6.5, INK);
  }

  // the bell on top
  const yb = G - 75;
  const bell = p.ctx.createLinearGradient(cx - 9, 0, cx + 9, 0);
  bell.addColorStop(0, GOLD_L);
  bell.addColorStop(0.45, GOLD);
  bell.addColorStop(1, GOLD_D);
  shape(
    p,
    (c) => {
      c.moveTo(cx - 9, yb);
      c.bezierCurveTo(cx - 9, yb - 12, cx - 4.5, yb - 19, cx, yb - 19);
      c.bezierCurveTo(cx + 4.5, yb - 19, cx + 9, yb - 12, cx + 9, yb);
    },
    bell,
    O,
    1.1,
  );
  p.curve(pt(cx - 5.5, yb - 6), pt(cx - 6, yb - 11), pt(cx - 3, yb - 15), 'rgba(255,255,255,0.75)', 1.2);
  p.ellipse(cx, yb, 9, 2.6, '#f0b53a', O);
  p.circle(cx, yb - 20.5, 2.2, GOLD, O);
  p.circle(cx, yb + 3, 1.8, GOLD_D, O);
  sparkle(p, cx + 13, yb - 15, 2.6);
}

// ---------------------------------------------------------------------------
// 6. Ferris wheel (2x2, the centrepiece)

function ferrisWheel(p: Pen): void {
  const ctr = p.center; // footprint centre on the ground
  p.shadow(ctr.x, ctr.y + 2, 46, 22, 0.25);

  // the round platform, with a grassy top and a few flowers round its edge
  p.cylinder(ctr.x, ctr.y + 1, 44, 10, MINT);
  const topY = ctr.y + 1 - 10;
  p.ellipse(ctr.x, topY, 37, 18, '#c6eeb0', O);
  const flowerCols = [PINK, BUTTER, LILAC, PINK, BUTTER];
  [1.25, 1.75, 2.3, 5.1, 5.7].forEach((a, i) => {
    p.flower(ctr.x + Math.cos(a) * 31, topY + Math.sin(a) * 15.5, 2.6, flowerCols[i]);
  });

  // the A-frame stand, its feet on the platform and its tip at the hub
  const hub = p.iso(1, 1, 58);
  const lb = p.iso(0.3, 1, 10);
  const rb = p.iso(1.7, 1, 10);
  stick(p, [lb, hub], 4.2, LILAC);
  stick(p, [rb, hub], 4.2, LILAC);
  const along = (a: Pt, b: Pt, t: number): Pt => pt(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t);
  stick(p, [along(lb, hub, 0.4), along(rb, hub, 0.4)], 2.2, LILAC);
  p.ellipse(lb.x, lb.y, 3.6, 1.8, shade(LILAC, -0.1), O);
  p.ellipse(rb.x, rb.y, 3.6, 1.8, shade(LILAC, -0.1), O);

  // the wheel is a circle in the plane of the stand: wide along the grid's
  // x axis, tall along the screen's y axis, so it reads as iso-correct
  const RU = { x: 28.8, y: 14.4 };
  const RZ = 40;
  const rim = (t: number): Pt => pt(hub.x + Math.cos(t) * RU.x, hub.y + Math.cos(t) * RU.y - Math.sin(t) * RZ);
  const deg = (d: number): number => (d * Math.PI) / 180;

  // spokes
  for (let k = 0; k < 6; k++) stick(p, [hub, rim(deg(30 + 60 * k))], 1.6, CREAM);

  // the rim
  const ring: Pt[] = [];
  for (let i = 0; i <= 72; i++) ring.push(rim((i / 72) * Math.PI * 2));
  p.line(ring, O, 5);
  p.line(ring, '#fff8ec', 2.6);

  // six gondolas hanging from the rim
  const cars = [PINK, MINT, BUTTER, LILAC, BLUE, PINK_L];
  for (let k = 0; k < 6; k++) {
    const r0 = rim(deg(30 + 60 * k));
    const col = cars[k];
    p.line([r0, pt(r0.x, r0.y + 4)], O, 1.2);
    p.roundRect(r0.x - 5.5, r0.y + 3.5, 11, 10, 3, col);
    p.ellipse(r0.x, r0.y + 3.5, 5.5, 2.2, shade(col, 0.25));
    p.circle(r0.x, r0.y + 8.5, 1.8, 'rgba(255,255,255,0.85)', null);
  }

  // the hub
  p.circle(hub.x, hub.y, 4.6, GOLD, O);
  p.circle(hub.x, hub.y, 1.9, PINK, O);

  // twelve star lights along the rim, each with a warm glow
  for (let k = 0; k < 12; k++) {
    const s = rim(deg(15 + 30 * k));
    p.glow(s.x, s.y, 6.5, BUTTER, 0.6);
  }
  for (let k = 0; k < 12; k++) {
    const s = rim(deg(15 + 30 * k));
    p.star(s.x, s.y, 2.6, '#fff1a8', O);
  }

  sparkle(p, 14, ctr.y - 60, 3.2);
  sparkle(p, 114, ctr.y - 50, 2.6);
  sparkle(p, 112, ctr.y - 12, 2);
}

// ---------------------------------------------------------------------------
// 7. Golden trophy (1x1)

function goldenTrophy(p: Pen): void {
  const { x: cx, y: G } = p.center;
  p.shadow(cx, G + 1, 17, 8, 0.25);

  // the wooden plinth, with a pink ribbon and bow wrapped round its front
  p.box(0.22, 0.22, 0.56, 0.56, 12, { top: '#f7dcb0', left: WOOD, right: shade(WOOD, -0.2) });
  p.poly([p.iso(0.22, 0.78, 8), p.iso(0.78, 0.78, 8), p.iso(0.78, 0.78, 4), p.iso(0.22, 0.78, 4)], PINK, O, 0.9);
  const bow = p.iso(0.5, 0.78, 6);
  p.poly([pt(bow.x, bow.y), pt(bow.x - 5, bow.y + 4.5), pt(bow.x - 2.5, bow.y + 6)], PINK_D, O, 0.8);
  p.poly([pt(bow.x, bow.y), pt(bow.x + 5, bow.y + 4.5), pt(bow.x + 2.5, bow.y + 6)], PINK_D, O, 0.8);
  p.ellipse(bow.x - 3.4, bow.y - 0.6, 3, 2.2, PINK, O, -0.3);
  p.ellipse(bow.x + 3.4, bow.y - 0.6, 3, 2.2, PINK, O, 0.3);
  p.circle(bow.x, bow.y - 0.4, 1.2, PINK_D, O);

  // foot, stem and knot
  p.cylinder(cx, G - 12, 9, 3, GOLD);
  stick(p, [pt(cx, G - 14), pt(cx, G - 28)], 3.4, GOLD);
  p.ball(cx, G - 21, 2.8, GOLD);

  // the two handles, drawn before the bowl so its sides cover their ends
  const yr = G - 46; // rim of the cup
  const yb = G - 29; // bottom of the bowl
  const handle = (s: number): void => {
    thickCurve(
      p,
      (c) => {
        c.moveTo(cx + s * 13, yr + 2);
        c.quadraticCurveTo(cx + s * 24, yr + 2, cx + s * 22, yr + 12);
        c.quadraticCurveTo(cx + s * 20, yr + 19, cx + s * 12, yr + 17);
      },
      GOLD,
      2.4,
    );
  };
  handle(-1);
  handle(1);

  // the cup: a gold gradient bowl with a dark, open mouth
  const g = p.ctx.createLinearGradient(cx - 15, 0, cx + 15, 0);
  g.addColorStop(0, GOLD_D);
  g.addColorStop(0.3, GOLD_L);
  g.addColorStop(0.55, GOLD);
  g.addColorStop(1, GOLD_D);
  shape(
    p,
    (c) => {
      c.moveTo(cx - 15, yr);
      c.bezierCurveTo(cx - 15, yr + 13, cx - 5, yb, cx, yb);
      c.bezierCurveTo(cx + 5, yb, cx + 15, yr + 13, cx + 15, yr);
    },
    g,
    O,
    1.1,
  );
  p.ellipse(cx, yr, 15, 4, GOLD_L, O);
  p.ellipse(cx, yr, 11.5, 2.8, shade(GOLD_D, -0.25), null);
  p.curve(pt(cx - 10, yr + 6), pt(cx - 11.5, yr + 11), pt(cx - 8.5, yr + 16), 'rgba(255,255,255,0.85)', 1.4);
  p.star(cx, yr + 10, 4.4, PINK, O);
  p.ellipse(cx + 2.5, yr + 8, 1.2, 0.7, 'rgba(255,255,255,0.8)', null, -0.5);

  sparkle(p, cx - 22, yr - 6, 3.2);
  sparkle(p, cx + 22, yr - 10, 2.6);
}

// ---------------------------------------------------------------------------
// Icons (flat, 40x40)

/** A striped fair tent with a flag on top. */
function iconFair(p: Pen): void {
  p.shadow(20, 35.5, 15, 3, 0.25);
  p.ellipse(20, 35, 17, 3, LEAF, null);

  // the tent: a triangle of pink and cream stripes
  const ctx = p.ctx;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(4, 33);
  ctx.lineTo(20, 9);
  ctx.lineTo(36, 33);
  ctx.closePath();
  ctx.clip();
  for (let i = 0; i < 6; i++) {
    ctx.fillStyle = i % 2 ? CREAM : PINK;
    ctx.fillRect(4 + i * 5.3, 6, 5.4, 30);
  }
  ctx.restore();
  shape(
    p,
    (c) => {
      c.moveTo(4, 33);
      c.lineTo(20, 9);
      c.lineTo(36, 33);
    },
    null,
    O,
    1.2,
  );

  // the arched doorway
  shape(
    p,
    (c) => {
      c.moveTo(14, 33);
      c.lineTo(14, 26);
      c.quadraticCurveTo(20, 17, 26, 26);
      c.lineTo(26, 33);
    },
    '#7d6bb8',
    O,
    1,
  );
  p.line([pt(17, 31), pt(17, 28)], 'rgba(255,255,255,0.35)', 0.9);

  // the pole, the gold finial and a flag with a little star
  p.line([pt(20, 9), pt(20, 2)], O, 1.4);
  p.circle(20, 9, 1.8, GOLD, O);
  p.poly([pt(20.5, 2.5), pt(29, 4.8), pt(20.5, 7.2)], PINK, O, 0.9);
  p.star(24, 4.8, 1.5, CHALK, null);
  sparkle(p, 6, 10, 2.2);
}

/** A pink-and-cream admit-one raffle ticket with a star, tilted. */
function iconTicket(p: Pen): void {
  const c = p.ctx;
  c.save();
  c.translate(20, 20);
  c.rotate(-0.24);
  c.translate(-20, -20);

  const x0 = 5;
  const x1 = 35;
  const y0 = 11;
  const y1 = 29;
  const mid = 20;
  const n = 3.4; // notch radius
  const perf = 27.5; // the perforation, between the main ticket and its stub
  const body = (k: Ctx): void => {
    k.moveTo(x0 + 2, y0);
    k.lineTo(x1 - 2, y0);
    k.quadraticCurveTo(x1, y0, x1, y0 + 2);
    k.lineTo(x1, mid - n);
    k.arc(x1, mid, n, -Math.PI / 2, Math.PI / 2, true);
    k.lineTo(x1, y1 - 2);
    k.quadraticCurveTo(x1, y1, x1 - 2, y1);
    k.lineTo(x0 + 2, y1);
    k.quadraticCurveTo(x0, y1, x0, y1 - 2);
    k.lineTo(x0, mid + n);
    k.arc(x0, mid, n, Math.PI / 2, -Math.PI / 2, true);
    k.lineTo(x0, y0 + 2);
    k.quadraticCurveTo(x0, y0, x0 + 2, y0);
    k.closePath();
  };

  // pink main ticket, cream stub
  c.beginPath();
  body(c);
  c.save();
  c.clip();
  c.fillStyle = PINK;
  c.fillRect(x0 - 2, y0 - 2, x1 - x0 + 4, y1 - y0 + 4);
  c.fillStyle = CREAM;
  c.fillRect(perf, y0 - 2, x1 - perf + 4, y1 - y0 + 4);
  c.restore();
  c.beginPath();
  body(c);
  c.strokeStyle = O;
  c.lineWidth = 1.2;
  c.stroke();

  // dashed perforation
  c.setLineDash([2, 1.6]);
  p.line([pt(perf, y0 + 2), pt(perf, y1 - 2)], O, 0.9);
  c.setLineDash([]);

  // the star, with a glint, and a tiny heart on the stub
  p.star(14.5, mid, 5.4, GOLD, O);
  p.ellipse(12.5, mid - 2.5, 1.2, 0.7, 'rgba(255,255,255,0.85)', null, -0.5);
  p.circle(9, 14.5, 0.9, PINK_L, null);
  p.circle(21.5, 25.5, 0.9, PINK_L, null);
  p.heart(31.2, mid, 2.2, PINK, PINK_D);

  c.restore();
}

// ---------------------------------------------------------------------------
// Exports

export const sprites: SpriteSpec[] = [
  { key: 'deco:carousel_horse', fw: 1, fh: 1, height: 60, paint: carouselHorse },
  { key: 'deco:cotton_candy_cart', fw: 1, fh: 1, height: 78, paint: cottonCandyCart },
  { key: 'deco:ribbon_board', fw: 1, fh: 1, height: 58, paint: ribbonBoard },
  { key: 'deco:prize_pumpkin', fw: 1, fh: 1, height: 46, paint: prizePumpkin },
  { key: 'deco:high_striker', fw: 1, fh: 1, height: 86, paint: highStriker },
  { key: 'deco:ferris_wheel', fw: 2, fh: 2, height: 80, paint: ferrisWheel },
  { key: 'deco:golden_trophy', fw: 1, fh: 1, height: 44, paint: goldenTrophy },
];

export const icons: IconSpec[] = [
  { key: 'icon:fair', paint: iconFair },
  { key: 'icon:ticket', paint: iconTicket },
];
