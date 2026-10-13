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

  // round striped base: a pink drum with cream stripes and a gold inlay
  p.cylinder(cx, G + 1, 18, 5, PINK);
  for (const x of [cx - 13, cx - 5, cx + 3, cx + 11]) p.rect(x, G - 6, 3.4, 11, CREAM, null);
  p.ellipse(cx, G - 4, 12, 6, GOLD, O);

  // the striped pole, up through the middle of the back, with a finial
  for (let i = 0; i < 7; i++) p.rect(cx - 2.2, G - 4 - (i + 1) * 7, 4.4, 7, i % 2 ? PINK : GOLD);
  p.ball(cx, G - 55, 2.8, GOLD);

  // tail, flowing off the rump
  stick(p, [pt(43, G - 40), pt(51, G - 44), pt(55, G - 38)], 3.4, LILAC);
  p.circle(55, G - 38, 3.3, LILAC);

  // tucked-up fore legs (one bent forward) and hind legs held together
  stick(p, [pt(22, G - 32), pt(16, G - 27), pt(18, G - 22)], 4.6, HORSE);
  stick(p, [pt(26, G - 30), pt(25, G - 24), pt(29, G - 21)], 4.6, HORSE);
  stick(p, [pt(38, G - 30), pt(37, G - 22), pt(40, G - 17)], 4.6, HORSE);
  stick(p, [pt(42, G - 30), pt(43, G - 22), pt(46, G - 17)], 4.6, HORSE);
  for (const [x, y] of [[18, G - 21], [29, G - 20], [40, G - 16], [46, G - 16]] as [number, number][]) {
    p.ellipse(x, y, 2.6, 1.9, GOLD, O);
  }

  // neck, then the round plush body over its base
  stick(p, [pt(22, G - 42), pt(17, G - 52)], 11, HORSE);
  p.ellipse(31, G - 37, 14, 9, p.vgrad(G - 46, G - 28, '#fff4fa', HORSE));
  p.ellipse(31, G - 30, 10, 2.2, shade(HORSE, -0.12), null);
  p.curve(pt(20, G - 38), pt(23, G - 42), pt(27, G - 43), 'rgba(255,255,255,0.7)', 1.4);

  // lilac mane in soft curls down the back of the neck and up the crest
  const curls: [number, number, number][] = [
    [26.4, G - 46, 3.2],
    [24.3, G - 51, 3.2],
    [21.6, G - 55.5, 3.2],
    [18.4, G - 59.5, 3],
    [11.6, G - 63.5, 2.6],
    [16.6, G - 64.5, 2.6],
  ];
  for (const [x, y, r] of curls) p.circle(x, y, r, LILAC);
  for (const [x, y, r] of curls) p.circle(x - r * 0.3, y - r * 0.3, r * 0.35, 'rgba(255,255,255,0.45)', null);

  // a big round head with a closed-eye smile and blush
  p.ellipse(19.5, G - 65.5, 2.6, 3.8, HORSE, O, 0.3);
  p.ellipse(19.5, G - 65, 1.3, 2.2, PINK_D, null, 0.3);
  p.ellipse(15, G - 57, 8.5, 8, HORSE, O);
  p.ellipse(9.5, G - 52, 4.6, 3.8, shade(HORSE, 0.2), O);
  p.circle(7.6, G - 53.5, 0.7, PINK_D, null);
  p.curve(pt(7.5, G - 50), pt(9.5, G - 48.2), pt(11.5, G - 50), INK, 1.1);
  p.curve(pt(12, G - 58), pt(14.5, G - 60.5), pt(17, G - 58), INK, 1.5);
  p.ellipse(11, G - 53.5, 2.4, 1.4, BLUSH, null);
  p.ellipse(19, G - 53, 2.2, 1.3, BLUSH, null);
  p.ellipse(12, G - 62, 2.2, 1.1, 'rgba(255,255,255,0.7)', null, -0.4);

  // a little saddle with a heart
  p.roundRect(22, G - 50, 15, 9, 4, MINT);
  p.heart(30, G - 45.5, 3.2, PINK, PINK_D);

  sparkle(p, 54, G - 60, 2.6);
  sparkle(p, 58, G - 28, 2);
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
  const deg = (d: number): number => (d * Math.PI) / 180;

  // the hub sits high on the stand; the wheel is a circle in the plane v = 1
  const hub = p.iso(1, 1, 62);
  const rimAt = (t: number, s = 1): Pt =>
    pt(hub.x + Math.cos(t) * 32 * s, hub.y + Math.cos(t) * 16 * s - Math.sin(t) * 52 * s);

  p.shadow(ctr.x, ctr.y + 2, 42, 20, 0.25);

  // the round platform, with a grassy top
  p.cylinder(ctr.x, ctr.y + 1, 38, 9, MINT);
  const topY = ctr.y + 1 - 9;
  p.ellipse(ctr.x, topY, 33, 16.5, '#c6eeb0', O);

  // a pastel picket fence round the platform: back half first, front later
  const fence = (back: boolean): void => {
    const rx = 34.5;
    const ry = 17.3;
    const c = p.ctx;
    const arc = (): void => {
      c.beginPath();
      c.ellipse(ctr.x, topY - 5, rx, ry, 0, back ? Math.PI : 0, back ? Math.PI * 2 : Math.PI);
    };
    arc();
    c.strokeStyle = O;
    c.lineWidth = 2.4;
    c.stroke();
    arc();
    c.strokeStyle = CREAM;
    c.lineWidth = 1.2;
    c.stroke();
    for (let i = 0; i < 20; i++) {
      const a = (i / 20) * Math.PI * 2;
      const s = Math.sin(a);
      if ((s < 0) !== back) continue;
      p.rect(ctr.x + Math.cos(a) * rx - 1.3, topY + s * ry - 6, 2.6, 6, i % 2 ? PINK : CREAM);
    }
  };
  fence(true);

  // the A-frame: two pairs of legs from the hub axle, splaying to the platform
  const feet: [number, number][] = [
    [0.3, 0.7],
    [1.7, 0.7],
    [0.3, 1.3],
    [1.7, 1.3],
  ];
  for (const [u, v] of feet) {
    const f = p.iso(u, v, 9);
    stick(p, [hub, f], 4, LILAC);
    p.ellipse(f.x, f.y, 3.4, 1.7, shade(LILAC, -0.12), O);
  }
  // a cross-brace inside each pair
  for (const v of [0.7, 1.3]) {
    const a = p.iso(0.3, v, 9);
    const b = p.iso(1.7, v, 9);
    const at = (q: Pt): Pt => pt(q.x + (hub.x - q.x) * 0.45, q.y + (hub.y - q.y) * 0.45);
    stick(p, [at(a), at(b)], 2.2, LILAC);
  }

  // twelve radial struts between the two rings, and twelve spokes
  for (let k = 0; k < 12; k++) {
    stick(p, [rimAt(deg(15 + 30 * k), 0.84), rimAt(deg(15 + 30 * k), 1)], 2, CREAM);
  }
  for (let k = 0; k < 12; k++) stick(p, [hub, rimAt(deg(30 * k), 1)], 1.8, CREAM);

  // the double rim: an outer cream ring and an inner pink ring
  const ring = (s: number): Pt[] => {
    const pts: Pt[] = [];
    for (let i = 0; i <= 96; i++) pts.push(rimAt((i / 96) * Math.PI * 2, s));
    return pts;
  };
  p.line(ring(1), O, 5.4);
  p.line(ring(1), '#fff8ec', 3);
  p.line(ring(0.84), O, 4);
  p.line(ring(0.84), PINK_L, 2);

  // twelve gondolas, each hung from the outer rim on a short pin
  const cars = [PINK, MINT, BUTTER, LILAC, BLUE, PINK_L];
  for (let k = 0; k < 12; k++) {
    const r0 = rimAt(deg(30 * k), 1);
    const col = cars[k % cars.length];
    p.line([r0, pt(r0.x, r0.y + 3.5)], O, 1.4);
    shape(
      p,
      (c) => {
        c.moveTo(r0.x - 6.5, r0.y + 7);
        c.lineTo(r0.x, r0.y + 3.5);
        c.lineTo(r0.x + 6.5, r0.y + 7);
      },
      shade(col, -0.12),
      O,
      1,
    );
    p.roundRect(r0.x - 5.5, r0.y + 7, 11, 9, 2.5, col);
    p.circle(r0.x, r0.y + 11.5, 1.6, 'rgba(255,255,255,0.85)', null);
  }

  // twelve star lights, evenly spaced on the outer rim, each with a glow
  for (let k = 0; k < 12; k++) p.glow(rimAt(deg(15 + 30 * k), 1).x, rimAt(deg(15 + 30 * k), 1).y, 6.5, BUTTER, 0.6);
  for (let k = 0; k < 12; k++) {
    const s = rimAt(deg(15 + 30 * k), 1);
    p.star(s.x, s.y, 2.6, '#fff1a8', O);
  }

  // the hub
  p.circle(hub.x, hub.y, 6, GOLD, O);
  p.circle(hub.x, hub.y, 2.4, PINK, O);

  // a little ticket booth at the front-left of the platform
  const z0 = 9;
  p.box(0.5, 1.4, 0.4, 0.4, 12, { top: CREAM, left: '#ffe3ee', right: shade('#ffe3ee', -0.2) }, z0);
  p.hipRoof(0.5, 1.4, 0.4, 0.4, 12, 13, MINT, 0.04);
  p.poly(
    [p.iso(0.6, 1.8, z0 + 3), p.iso(0.8, 1.8, z0 + 3), p.iso(0.8, 1.8, z0 + 8), p.iso(0.6, 1.8, z0 + 8)],
    '#fffdf6',
    O,
    0.9,
  );

  // the fence's front half, then flower tufts on the grass
  fence(false);
  for (const [a, s] of [
    [0.9, 0.62],
    [2.1, 0.7],
    [3.9, 0.55],
    [5.1, 0.72],
  ] as [number, number][]) {
    p.flower(ctr.x + Math.cos(a) * 30 * s, topY + Math.sin(a) * 15 * s, 2.6, a < 3 ? PINK : BUTTER);
  }

  sparkle(p, 10, 62, 3.2);
  sparkle(p, 118, 72, 2.6);
  sparkle(p, 116, 112, 2);
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

  const x0 = 4;
  const x1 = 36;
  const y0 = 10;
  const y1 = 30;
  const mid = 20;
  const n = 3.6; // notch radius
  const perf = 28.5; // the perforation, between the main ticket and its stub
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
  p.star(15, mid, 6, GOLD, O);
  p.ellipse(12.6, mid - 2.8, 1.3, 0.7, 'rgba(255,255,255,0.85)', null, -0.5);
  p.circle(8.5, 14.5, 0.9, PINK_L, null);
  p.circle(22, 25.5, 0.9, PINK_L, null);
  p.heart(32.6, mid, 2.2, PINK, PINK_D);

  c.restore();
}

// ---------------------------------------------------------------------------
// Exports

export const sprites: SpriteSpec[] = [
  { key: 'deco:carousel_horse', fw: 1, fh: 1, height: 62, paint: carouselHorse },
  { key: 'deco:cotton_candy_cart', fw: 1, fh: 1, height: 78, paint: cottonCandyCart },
  { key: 'deco:ribbon_board', fw: 1, fh: 1, height: 58, paint: ribbonBoard },
  { key: 'deco:blue_ribbon_pumpkin', fw: 1, fh: 1, height: 46, paint: prizePumpkin },
  { key: 'deco:high_striker', fw: 1, fh: 1, height: 86, paint: highStriker },
  { key: 'deco:ferris_wheel', fw: 2, fh: 2, height: 92, paint: ferrisWheel },
  { key: 'deco:golden_trophy', fw: 1, fh: 1, height: 44, paint: goldenTrophy },
];

export const icons: IconSpec[] = [
  { key: 'icon:fair', paint: iconFair },
  { key: 'icon:ticket', paint: iconTicket },
];
