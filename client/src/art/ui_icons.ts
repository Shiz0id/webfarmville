// UI icons: the painted faces of the HUD buttons, the bottom toolbar and the
// round corner buttons, which used to be emoji. Each is a flat 40px icon with no
// plate (the button supplies the tile), in the house style of blooms.ts and
// collections.ts: the warm brown OUTLINE, soft pastel gradients, a white glint
// up top and a gentle shade underneath, with at most one sparkle.
import { type IconSpec, type Pen, type Pt, OUTLINE, shade } from './kit';

const O = OUTLINE;
const pt = (x: number, y: number): Pt => ({ x, y });

const CREAM = '#fff4e4';
const CREAM_W = '#fffbf3';
const BUTTER = '#ffe49a';
const BUTTER_L = '#fff2c4';
const GOLD = '#f4c24a';
const GOLD_L = '#ffe27a';
const GOLD_D = '#e8a92c';
const PINK = '#ffb3cf';
const PINK_DD = '#e77fa6';
const MINT = '#a8e6cf';
const MINT_D = '#19c8b9';
const PEACH = '#e18c6f';
const SKY = '#889df0';
const SKY_L = '#cfd8fb';
const LILAC = '#b77dee';
const LEAF = '#8ac68a';
const LEAF_D = '#5fae6b';
const STEM = '#6cbf55';
const WOOD = '#c98b53';
const WOOD_L = '#f2c58f';
const SOIL = '#8a5a34';
const SOIL_L = '#b07a4a';
const RED = '#ff6b7f';
const RED_D = '#e0485f';
const ORANGE = '#ffa15c';
const STEEL = '#c9d3e2';
const TIRE = '#6b5145';
const INK = 'rgba(74,52,38,0.42)';
const SPARK = '#fffbe6';

// ---------------------------------------------------------------------------
// Helpers

/** Soft contact shadow for something standing on the ground. */
function ground(p: Pen, cx: number, rx: number, y = 36.8): void {
  p.shadow(cx, y, rx, rx * 0.2, 0.2);
}

/** A soft white highlight dab. */
function glint(p: Pen, x: number, y: number, rx: number, ry: number, rot = -0.5, alpha = 0.7): void {
  p.ellipse(x, y, rx, ry, `rgba(255,255,255,${alpha})`, null, rot);
}

/** A chunky rounded bar (handles, sticks, posts) with an outline underlay. */
function bar(p: Pen, pts: Pt[], w: number, color: string): void {
  p.line(pts, O, w + 2.2);
  p.line(pts, color, w);
}

/** A thick arc with an outline underlay. */
function arcBar(p: Pen, x: number, y: number, r: number, a0: number, a1: number, w: number, color: string): void {
  const c = p.ctx;
  c.beginPath();
  c.arc(x, y, r, a0, a1);
  c.strokeStyle = O;
  c.lineWidth = w + 2.2;
  c.stroke();
  c.beginPath();
  c.arc(x, y, r, a0, a1);
  c.strokeStyle = color;
  c.lineWidth = w;
  c.stroke();
}

/** A curved stalk with an outline underlay. */
function stalk(p: Pen, a: Pt, c: Pt, b: Pt, w = 1.5): void {
  p.curve(a, c, b, O, w + 1.2);
  p.curve(a, c, b, STEM, w);
}

/** A pointed leaf from (x, y) along angle ang (radians), with a midrib. */
function leaf(p: Pen, x: number, y: number, ang: number, len: number, color = LEAF): void {
  const c = p.ctx;
  const dx = Math.cos(ang);
  const dy = Math.sin(ang);
  const nx = -dy;
  const ny = dx;
  const w = len * 0.34;
  c.beginPath();
  c.moveTo(x, y);
  c.quadraticCurveTo(x + dx * len * 0.5 + nx * w, y + dy * len * 0.5 + ny * w, x + dx * len, y + dy * len);
  c.quadraticCurveTo(x + dx * len * 0.5 - nx * w, y + dy * len * 0.5 - ny * w, x, y);
  c.closePath();
  c.fillStyle = color;
  c.fill();
  c.strokeStyle = O;
  c.lineWidth = 0.9;
  c.stroke();
  p.line([pt(x, y), pt(x + dx * len * 0.72, y + dy * len * 0.72)], shade(color, -0.3), 0.6);
}

/** A three-pointed tulip cup centred at (x, y), s its size. */
function tulip(p: Pen, x: number, y: number, s: number, color: string): void {
  const c = p.ctx;
  c.beginPath();
  c.moveTo(x - s, y - s * 0.7);
  c.quadraticCurveTo(x - s * 1.12, y + s * 0.5, x, y + s * 0.9);
  c.quadraticCurveTo(x + s * 1.12, y + s * 0.5, x + s, y - s * 0.7);
  c.lineTo(x + s * 0.46, y - s * 0.4);
  c.lineTo(x, y - s * 1.3);
  c.lineTo(x - s * 0.46, y - s * 0.4);
  c.closePath();
  const g = c.createLinearGradient(x - s, 0, x + s, 0);
  g.addColorStop(0, shade(color, 0.25));
  g.addColorStop(0.5, color);
  g.addColorStop(1, shade(color, -0.22));
  c.fillStyle = g;
  c.fill();
  c.strokeStyle = O;
  c.lineWidth = 0.9;
  c.stroke();
  p.line([pt(x, y - s * 0.35), pt(x, y + s * 0.6)], shade(color, -0.32), 0.6);
  glint(p, x - s * 0.55, y - s * 0.3, s * 0.18, s * 0.34, 0.2, 0.45);
}

/** A soft teardrop of water, tip up, s its radius. */
function drop(p: Pen, x: number, y: number, s: number): void {
  const c = p.ctx;
  c.beginPath();
  c.moveTo(x, y - 2 * s);
  c.quadraticCurveTo(x + s * 0.6, y - s * 0.9, x + s, y + s * 0.2);
  c.arc(x, y + s * 0.2, s, 0, Math.PI, false);
  c.quadraticCurveTo(x - s * 0.6, y - s * 0.9, x, y - 2 * s);
  c.closePath();
  c.fillStyle = '#9fd8ff';
  c.fill();
  c.strokeStyle = O;
  c.lineWidth = 0.9;
  c.stroke();
  glint(p, x - s * 0.45, y + s * 0.1, s * 0.22, s * 0.42, 0.1, 0.8);
}

/** The one sparkle a few icons carry. */
function sparkle(p: Pen, x: number, y: number, r: number): void {
  p.star(x, y, r, SPARK, shade(GOLD, -0.3));
}

/** A tick mark in a 3.6px box whose top-left corner is (x, y). */
function tick(p: Pen, x: number, y: number): void {
  const pts = [pt(x + 0.7, y + 1.9), pt(x + 1.5, y + 2.9), pt(x + 3.1, y + 0.6)];
  p.line(pts, O, 2.8);
  p.line(pts, LEAF_D, 1.3);
}

/** A small z, for sleeping. */
function zGlyph(p: Pen, x: number, y: number, s: number, color: string): void {
  p.line([pt(x, y), pt(x + s, y), pt(x, y + s), pt(x + s, y + s)], color, 1.1);
}

// ---------------------------------------------------------------------------
// Toolbar

/** A cream pointing hand tapping: the index finger up and to the left, the other fingers curled, a pink cuff, and tap lines. */
function uiHand(p: Pen): void {
  p.lineWidth = 1.1;
  const c = p.ctx;
  // the hand is drawn upright in its own frame, then tipped up-left about the centre
  const tilt = -0.5;
  const cream = p.vgrad(8, 36, CREAM_W, '#f5dfc0');
  const curled: [number, number, number][] = [
    [24.4, 17.4, 3.2],
    [24.8, 21.6, 3.2],
    [24.2, 25.6, 3],
  ];
  p.save();
  c.translate(20, 20);
  c.rotate(tilt);
  c.translate(-20, -20);
  // outline pass: the curled knuckles, the index finger, the thumb and the fist
  for (const [x, y, r] of curled) p.circle(x, y, r + 1.1, O, null);
  p.line([pt(18, 21), pt(18, 9.2)], O, 7.6);
  p.line([pt(13.6, 22.4), pt(10.6, 16.8)], O, 6.6);
  p.roundRect(11.4, 14.4, 15.1, 16.7, 6.1, O, null);
  // fills, so they merge into one hand
  for (const [x, y, r] of curled) p.circle(x, y, r, cream, null);
  p.line([pt(18, 21), pt(18, 9.2)], CREAM_W, 5.4);
  p.line([pt(13.6, 22.4), pt(10.6, 16.8)], CREAM_W, 4.4);
  p.roundRect(12.5, 15.5, 12.5, 14.5, 5, cream, null);
  // creases between the curled fingers
  p.line([pt(23.2, 19.5), pt(25.8, 19.5)], O, 0.9);
  p.line([pt(23.2, 23.6), pt(25.6, 23.6)], O, 0.9);
  // a little pink cuff at the wrist
  p.roundRect(12.5, 28.8, 14.5, 6, 2.6, PINK);
  glint(p, 15.2, 31.2, 3.2, 0.7, 0, 0.6);
  // highlights on the index finger and the fist
  glint(p, 16.2, 12.6, 0.8, 2.4, 0.1, 0.8);
  glint(p, 15.6, 20.4, 1, 2.2, 0.1, 0.6);
  p.restore();
  // tap lines radiating from the fingertip, drawn in the page's own frame
  const cs = Math.cos(tilt);
  const sn = Math.sin(tilt);
  const world = (x: number, y: number): Pt => pt(20 + (x - 20) * cs - (y - 20) * sn, 20 + (x - 20) * sn + (y - 20) * cs);
  const tip = world(18, 9.2);
  const dirs = [-2.07, -1.32, -2.82];
  for (const a of dirs) {
    const ux = Math.cos(a);
    const uy = Math.sin(a);
    const from = a === -2.07 ? 4.2 : 4;
    const to = a === -2.07 ? 7.4 : 6.6;
    p.line([pt(tip.x + ux * from, tip.y + uy * from), pt(tip.x + ux * to, tip.y + uy * to)], O, 1.4);
  }
}

/** A garden hoe stuck in a mound of soil, with a sprout beside it. */
function uiPlow(p: Pen): void {
  p.lineWidth = 1.1;
  ground(p, 20, 14);
  // the hoe: a wooden handle with a grip knob, its steel blade buried in the soil
  bar(p, [pt(27, 7), pt(19.5, 28.5)], 2.6, WOOD);
  p.circle(27, 6.4, 2.5, p.vgrad(4, 9, WOOD_L, WOOD));
  glint(p, 26.2, 5.6, 0.8, 0.6, -0.4, 0.8);
  bar(p, [pt(15.4, 26.4), pt(23.6, 29.6)], 3.6, STEEL);
  // the soil mound, which hides the blade and the foot of the handle
  const c = p.ctx;
  c.beginPath();
  c.moveTo(5.5, 35.5);
  c.bezierCurveTo(7, 24.5, 33, 24.5, 34.5, 35.5);
  c.closePath();
  c.fillStyle = p.vgrad(24.5, 35.5, SOIL_L, SOIL);
  c.fill();
  c.strokeStyle = O;
  c.lineWidth = 1.1;
  c.stroke();
  p.circle(12.5, 31.5, 0.9, '#5c3a22', null);
  p.circle(27.5, 32.8, 1.1, '#5c3a22', null);
  p.circle(21.5, 33.8, 0.7, '#5c3a22', null);
  glint(p, 13, 29.2, 2.6, 0.8, -0.2, 0.35);
  // a sprout with two leaves
  stalk(p, pt(11.5, 30), pt(10.4, 25), pt(12.4, 20.2));
  leaf(p, 12.4, 20.4, -2.5, 6.4);
  leaf(p, 12.4, 20.4, -0.5, 6.8);
}

/** A mint watering can, pouring three droplets from its rose. */
function uiWater(p: Pen): void {
  p.lineWidth = 1.1;
  drop(p, 4.8, 21.5, 1.4);
  drop(p, 3.4, 27.4, 1.5);
  drop(p, 8.2, 31.2, 1.3);
  // spout, rising from the body's lower left to a rose
  bar(p, [pt(15.6, 27), pt(6.6, 15.8)], 3.2, shade(MINT, -0.04));
  p.ellipse(5.6, 14.6, 2.6, 1.8, shade(MINT, -0.14), O, -0.8);
  // the handle over the top
  arcBar(p, 23, 16.4, 6, Math.PI, 0, 2.4, shade(MINT, -0.08));
  // body and lid
  p.roundRect(14.5, 16.5, 17, 14.5, 5, p.vgrad(16.5, 31, shade(MINT, 0.3), shade(MINT, -0.12)));
  p.ellipse(23, 16.6, 6, 1.4, shade(MINT, 0.22));
  glint(p, 18.2, 22.5, 1.1, 4.2, 0.1, 0.7);
}

/** A little striped shop stall with a pink and cream scalloped awning. */
function uiMarket(p: Pen): void {
  p.lineWidth = 1.1;
  const c = p.ctx;
  // the counter, with planks and a heart sticker on its front
  p.roundRect(7.5, 20, 25, 14, 2, p.vgrad(20, 34, WOOD_L, WOOD));
  for (const x of [13, 27]) p.line([pt(x, 22.5), pt(x, 33)], shade(WOOD, -0.28), 0.8);
  p.heart(20, 27.5, 2.6, PINK, PINK_DD);
  p.roundRect(5.5, 18.4, 29, 3.4, 1.5, CREAM_W);
  // the awning: six stripes with scalloped hems
  const n = 6;
  const x0 = 4;
  const x1 = 36;
  const w = (x1 - x0) / n;
  for (let i = 0; i < n; i++) {
    const a = x0 + i * w;
    const b = a + w;
    const m = a + w / 2;
    c.beginPath();
    c.moveTo(a, 8.8);
    c.lineTo(b, 8.8);
    c.lineTo(b, 15.5);
    c.arc(m, 15.5, w / 2, 0, Math.PI, false);
    c.closePath();
    c.fillStyle = i % 2 ? CREAM_W : PINK;
    c.fill();
    c.strokeStyle = O;
    c.lineWidth = 1.1;
    c.stroke();
  }
  // the valance along the top
  p.roundRect(3, 6.6, 34, 2.8, 1.3, PINK_DD);
  glint(p, 9, 7.6, 6, 0.5, 0, 0.6);
}

/** A glowing garden lantern on a stone plinth, with a pink bow on its post and a little pink flower beside it. */
function uiDecor(p: Pen): void {
  p.lineWidth = 1.1;
  ground(p, 20, 12.5);
  // a warm halo, drawn first so it sits behind the lantern
  p.glow(20, 21, 14, BUTTER, 0.6);
  // the squat stone plinth the lantern stands on
  p.roundRect(9.6, 30.8, 20.8, 5.2, 2.2, p.vgrad(30.8, 36, '#f6e3cc', '#d9b596'));
  // the wide wooden collar, which sits on the plinth
  p.roundRect(13.6, 27.6, 12.8, 3.6, 1.4, WOOD_L);
  // the chunky lantern body: a wide tapered box of butter glass, lit from within
  p.poly(
    [pt(13.4, 14.4), pt(26.6, 14.4), pt(28, 28.4), pt(12, 28.4)],
    p.vgrad(14.4, 28.4, BUTTER_L, '#ffd66e'),
  );
  p.ellipse(20, 21.2, 3.6, 4.8, CREAM_W, null);
  glint(p, 15.2, 20.8, 1.1, 4.4, 0.1, 0.8);
  // the wide pink peaked cap, with a butter finial
  p.poly([pt(8.4, 15), pt(31.6, 15), pt(20, 7.2)], p.vgrad(7.2, 15, '#ffd0e0', PINK));
  p.circle(20, 5.8, 1.5, BUTTER);
  glint(p, 15.6, 11.4, 1.1, 0.55, -0.55, 0.8);
  // a small pink bow tied on the collar: two loops and a knot
  p.poly([pt(20, 29.4), pt(16.2, 26.6), pt(16.4, 32.2)], PINK);
  p.poly([pt(20, 29.4), pt(23.8, 26.6), pt(23.6, 32.2)], PINK);
  p.circle(20, 29.4, 1.5, PINK_DD);
  // a bigger flower tucked close beside the plinth: a stalk, a leaf, five petals
  stalk(p, pt(33.2, 36.2), pt(32.8, 33.4), pt(33.8, 30.8), 1.4);
  leaf(p, 33, 34.2, -0.5, 4.2);
  const fx = 33.8;
  const fy = 28.2;
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
    p.circle(fx + Math.cos(a) * 2.6, fy + Math.sin(a) * 2.6, 2.6, PINK, O);
  }
  p.circle(fx, fy, 1.6, BUTTER, O);
  // one small sparkle in the top right
  sparkle(p, 34.4, 9.6, 2.4);
}

/** A frying pan with a sunny-side egg and a wisp of steam. */
function uiCook(p: Pen): void {
  p.lineWidth = 1.1;
  const c = p.ctx;
  // steam rising from the egg
  for (const [x, h] of [
    [12.4, 7.5],
    [21.6, 8.6],
  ]) {
    c.beginPath();
    c.moveTo(x, 14);
    c.bezierCurveTo(x - 3, 14 - h * 0.3, x + 3, 14 - h * 0.6, x, 14 - h);
    c.strokeStyle = 'rgba(255,255,255,0.85)';
    c.lineWidth = 3;
    c.stroke();
    c.strokeStyle = '#a3ade8';
    c.lineWidth = 1.2;
    c.stroke();
  }
  // the wooden handle
  bar(p, [pt(27, 23.6), pt(36.8, 19.6)], 3.4, WOOD);
  // the pan: iron rim, then the darker cooking surface
  p.ellipse(17, 24, 14, 6.8, p.vgrad(17.2, 30.8, '#a18678', '#6f5a4f'));
  p.ellipse(17, 23.2, 11.2, 4.9, p.vgrad(18.3, 28.1, '#7c6659', '#5e4a41'));
  glint(p, 9.5, 20.4, 3.2, 0.9, -0.2, 0.5);
  // the egg: a white with a soft yolk, outline pass then fills
  const whites: [number, number, number, number][] = [
    [16.2, 22.4, 6.2, 4.2],
    [21.9, 21.2, 3.6, 3.4],
  ];
  for (const [x, y, rx, ry] of whites) p.ellipse(x, y, rx + 1.1, ry + 1.1, O, null);
  for (const [x, y, rx, ry] of whites) p.ellipse(x, y, rx, ry, CREAM_W, null);
  p.circle(15.8, 22.2, 2.7, p.vgrad(19.5, 24.9, GOLD_L, GOLD_D));
  glint(p, 14.8, 21.2, 0.9, 0.6, -0.5, 0.9);
}

/** A red and white bobber on a rod that curves over the water. */
function uiFish(p: Pen): void {
  p.lineWidth = 1.1;
  const c = p.ctx;
  // the rod, arched over, with a cork grip at the base
  const base = pt(5.5, 35);
  const ctrl = pt(13, 2);
  const tip = pt(34, 10);
  p.curve(base, ctrl, tip, O, 3.6);
  p.curve(base, ctrl, tip, WOOD, 2.1);
  bar(p, [pt(5, 36), pt(8.2, 30.8)], 3.8, PEACH);
  // the line down to the bobber
  p.curve(tip, pt(34.2, 22), pt(28.5, 25.2), O, 0.6);
  // water rings around the bobber
  p.ellipse(28.5, 32.6, 6.2, 1.5, null, '#7fb8ff');
  p.ellipse(28.5, 32.6, 8.8, 2.3, null, '#7fb8ff');
  // the bobber: a red top, a white bottom, outlined
  c.beginPath();
  c.arc(28.5, 28, 2.9, Math.PI, 0);
  c.closePath();
  c.fillStyle = RED;
  c.fill();
  c.beginPath();
  c.arc(28.5, 28, 2.9, 0, Math.PI);
  c.closePath();
  c.fillStyle = CREAM_W;
  c.fill();
  p.circle(28.5, 28, 2.9, null, O);
  glint(p, 27.2, 26.6, 0.7, 0.5, -0.4, 0.9);
}

/** A cute red tractor in side view, with a big back wheel. */
function uiGarage(p: Pen): void {
  p.lineWidth = 1.1;
  ground(p, 20, 14.5);
  // the chassis
  p.roundRect(12.5, 24.4, 20, 3.8, 1.5, shade(RED, -0.35));
  // the exhaust stack, the hood with its grille and headlight
  p.roundRect(24.6, 7, 2.6, 10, 1, CREAM);
  p.roundRect(16.5, 15.5, 16, 10, 3, p.vgrad(15.5, 25.5, '#ff8fa0', RED));
  p.roundRect(28.5, 19.5, 3.2, 4.8, 1, shade(RED, -0.3));
  p.circle(32.6, 18.2, 1.5, BUTTER);
  // the cab over the back wheel, with a sky-blue window
  p.roundRect(4.5, 7, 13, 16.5, 3, p.vgrad(7, 23.5, '#ff8fa0', RED));
  p.roundRect(7.5, 10, 7, 6, 2, p.vgrad(10, 16, '#eef7ff', '#a9d6ff'));
  glint(p, 9.2, 11.7, 1, 1.6, -0.3, 0.8);
  // the big back wheel with its red fender
  p.circle(12.5, 25.5, 8.2, TIRE);
  p.circle(12.5, 25.5, 6.2, null, shade(TIRE, 0.25));
  p.circle(12.5, 25.5, 3.6, BUTTER);
  p.circle(12.5, 25.5, 1.4, PINK);
  arcBar(p, 12.5, 25.5, 10.6, Math.PI * 1.12, Math.PI * 1.88, 2.6, RED);
  // the small front wheel
  p.circle(31, 30.5, 4.6, TIRE);
  p.circle(31, 30.5, 1.8, BUTTER);
}

/** Four soft mint arrowheads pointing out from a cream centre: "move this around". */
function uiMove(p: Pen): void {
  p.lineWidth = 1.1;
  const cx = 20;
  const cy = 20;
  // each arm: a stubby shaft, then a chunky arrowhead with rounded corners
  const arms: [number, number][] = [
    [0, -1],
    [0, 1],
    [-1, 0],
    [1, 0],
  ];
  for (const [ux, uy] of arms) {
    bar(p, [pt(cx + ux * 4, cy + uy * 4), pt(cx + ux * 11.6, cy + uy * 11.6)], 4, MINT);
  }
  for (const [ux, uy] of arms) {
    const nx = -uy;
    const ny = ux;
    const tipPt = pt(cx + ux * 15.4, cy + uy * 15.4);
    const b1 = pt(cx + ux * 11 + nx * 5.2, cy + uy * 11 + ny * 5.2);
    const b2 = pt(cx + ux * 11 - nx * 5.2, cy + uy * 11 - ny * 5.2);
    // a fat outline stroke rounds the corners, then the mint fill sits inside it
    p.poly([tipPt, b1, b2], O, O, 3.6);
    p.poly([tipPt, b1, b2], MINT, MINT, 1.8);
    p.circle(cx + ux * 12.4 - nx * 2.2, cy + uy * 12.4 - ny * 2.2, 0.9, 'rgba(255,255,255,0.8)', null);
  }
  // the cream centre
  p.circle(cx, cy, 4.8, CREAM_W);
  glint(p, 18.4, 18.2, 1.4, 0.8, -0.5, 0.8);
}

/** A cardboard box with a heart sticker on the tape. */
function uiStore(p: Pen): void {
  p.lineWidth = 1.1;
  ground(p, 20, 13);
  const card = '#e8b97e';
  // the side face, then the top, then the front
  p.poly([pt(31.5, 15.5), pt(36, 11.5), pt(36, 31.5), pt(31.5, 35.5)], shade(card, -0.14));
  p.poly([pt(8, 15.5), pt(31.5, 15.5), pt(36, 11.5), pt(12.5, 11.5)], '#fbe2b8');
  p.rect(8, 15.5, 23.5, 20, p.vgrad(15.5, 35.5, '#f7d7a4', card));
  // tape across the top and down the front
  p.poly([pt(17.5, 15.5), pt(21.5, 15.5), pt(25.5, 11.5), pt(21.5, 11.5)], BUTTER_L);
  p.rect(17.5, 15.5, 4, 20, BUTTER_L, O);
  p.heart(19.5, 23, 2.6, PINK, PINK_DD);
  glint(p, 10, 19, 0.8, 9, 0.05, 0.5);
}

/** A plump coin sack, tied with twine, with a gold coin in front. */
function uiSell(p: Pen): void {
  p.lineWidth = 1.1;
  const c = p.ctx;
  ground(p, 18, 13);
  // the sack: a plump bag with a gathered neck
  c.beginPath();
  c.moveTo(15, 14);
  c.bezierCurveTo(9.5, 16, 4.5, 22, 5.8, 29);
  c.bezierCurveTo(7.2, 35.2, 30.8, 35.2, 32.2, 29);
  c.bezierCurveTo(33.5, 22, 28.5, 16, 23, 14);
  c.closePath();
  c.fillStyle = p.vgrad(14, 35, CREAM_W, '#ecd09c');
  c.fill();
  c.strokeStyle = O;
  c.lineWidth = 1.1;
  c.stroke();
  glint(p, 10.5, 24, 1.1, 5, 0.25, 0.6);
  // the gathered neck, its twine and a loose tie end
  p.ellipse(19, 13.6, 5, 1.6, CREAM_W);
  bar(p, [pt(14.2, 15.6), pt(23.8, 15.6)], 2.2, WOOD);
  p.line([pt(19.4, 16.6), pt(18, 20.2)], WOOD, 1.2);
  p.text('$', 18.4, 25.6, 12, '#b7743f', 'bold');
  // the gold coin in front of the sack
  p.circle(30.5, 31.6, 5.4, p.vgrad(26, 37, GOLD_L, GOLD_D));
  p.circle(30.5, 31.6, 3.4, null, shade(GOLD, -0.3));
  glint(p, 28.4, 29.4, 1.2, 2, 0.4, 0.8);
}

/** A wicker basket with a handle, one big strawberry in front and a carrot tucked behind, with two light swoosh arcs on the left for a quick swipe. */
function uiHarvest(p: Pen): void {
  p.lineWidth = 1.1;
  const c = p.ctx;
  ground(p, 20, 12.5, 36.6);
  // the handle: a thin clean arch behind everything, its ends hidden under the rim
  arcBar(p, 20, 21.5, 8.6, Math.PI, Math.PI * 2, 1.8, WOOD);
  // the carrot, tucked behind the strawberry with its leafy top poking out
  const top = pt(28.4, 14.6);
  const tipPt = pt(31.2, 23.4);
  const dx = tipPt.x - top.x;
  const dy = tipPt.y - top.y;
  const len = Math.hypot(dx, dy);
  const ux = dx / len;
  const uy = dy / len;
  const at = (t: number, s: number): Pt => pt(top.x + ux * len * t - uy * s, top.y + uy * len * t + ux * s);
  p.poly([at(0, -2.2), at(0.25, -2.5), at(0.9, -0.9), at(1, 0), at(0.9, 0.9), at(0.25, 2.5), at(0, 2.2)], ORANGE);
  leaf(p, top.x, top.y, -2.3, 3.6, LEAF_D);
  leaf(p, top.x, top.y, -1, 3.8);
  // the basket body: a tapered wicker bowl, light and warm, outlined at its edges
  const body = (): void => {
    c.beginPath();
    c.moveTo(8.6, 23);
    c.lineTo(31.4, 23);
    c.lineTo(29.6, 33.4);
    c.quadraticCurveTo(29.2, 35.2, 27.2, 35.2);
    c.lineTo(12.8, 35.2);
    c.quadraticCurveTo(10.8, 35.2, 10.4, 33.4);
    c.closePath();
  };
  body();
  c.fillStyle = p.vgrad(23, 35.2, WOOD_L, WOOD);
  c.fill();
  c.strokeStyle = O;
  c.lineWidth = 1.1;
  c.stroke();
  // two soft horizontal weave bands, with a few short vertical ticks between them
  c.save();
  body();
  c.clip();
  for (const y of [27.2, 31.4]) p.line([pt(7, y), pt(33, y)], 'rgba(74,52,38,0.22)', 1);
  for (const x of [14.6, 20, 25.4]) p.line([pt(x, 28.4), pt(x, 30.2)], 'rgba(74,52,38,0.26)', 0.9);
  c.restore();
  // the rim
  p.roundRect(7, 21.4, 26, 4.2, 2.1, WOOD_L);
  // the big strawberry, front and centre, overlapping the rim
  c.beginPath();
  c.moveTo(20, 25.8);
  c.bezierCurveTo(16.4, 23.8, 14.2, 20.6, 14.2, 17.8);
  c.bezierCurveTo(14.2, 16.6, 17, 16.2, 20, 16.6);
  c.bezierCurveTo(23, 16.2, 25.8, 16.6, 25.8, 17.8);
  c.bezierCurveTo(25.8, 20.6, 23.6, 23.8, 20, 25.8);
  c.closePath();
  c.fillStyle = p.vgrad(16.2, 25.8, '#ff97a5', RED_D);
  c.fill();
  c.strokeStyle = O;
  c.lineWidth = 1.1;
  c.stroke();
  for (const [x, y] of [
    [18.8, 19.6],
    [23.2, 19.6],
    [17.4, 22.6],
    [22.6, 22.6],
  ] as [number, number][]) {
    p.circle(x, y, 0.8, CREAM_W, null);
  }
  glint(p, 16.2, 19.4, 0.9, 2.2, 0.35, 0.8);
  // a clear green leafy cap: two spreading leaves and a stubby one up top
  leaf(p, 20, 17.2, 2.9, 5, LEAF_D);
  leaf(p, 20, 17.2, 0.24, 5, LEAF_D);
  leaf(p, 20, 17.2, -1.57, 3.2, LEAF);
  // two soft motion arcs on the left: quadratic curves whose width swells then tapers, cream with a thin outline
  const swoosh = (P0: Pt, P1: Pt, P2: Pt, maxW: number): void => {
    const N = 10;
    const at = (t: number): Pt =>
      pt(
        (1 - t) * (1 - t) * P0.x + 2 * (1 - t) * t * P1.x + t * t * P2.x,
        (1 - t) * (1 - t) * P0.y + 2 * (1 - t) * t * P1.y + t * t * P2.y,
      );
    const segs: [Pt, Pt, number][] = [];
    for (let i = 0; i < N; i++) {
      segs.push([at(i / N), at((i + 1) / N), 1 + (maxW - 1) * Math.sin((Math.PI * (i + 0.5)) / N)]);
    }
    c.lineCap = 'round';
    // the outline underlay first, so the cream strokes don't show seams
    for (const [a, b, w] of segs) p.line([a, b], O, w + 1.1);
    for (const [a, b, w] of segs) p.line([a, b], CREAM_W, w);
    c.lineCap = 'butt';
  };
  swoosh(pt(11.5, 8.8), pt(4.2, 14.6), pt(8.2, 19.2), 2.6);
  swoosh(pt(5.6, 24.6), pt(1.6, 27.8), pt(4.6, 33.4), 2.2);
}

// ---------------------------------------------------------------------------
// Corner buttons

/** A parchment scroll with a red ribbon and bow. */
function uiQuests(p: Pen): void {
  p.lineWidth = 1.1;
  // the parchment, with a few lines of writing
  p.rect(8.5, 9.5, 21, 21.5, p.vgrad(9.5, 31, '#fffaf0', '#ffe9bf'));
  const lines: [number, number][] = [
    [14.8, 24],
    [18.6, 24],
    [28.6, 19],
  ];
  for (const [y, x1] of lines) p.line([pt(12, y), pt(x1, y)], INK, 0.9);
  // the two rolls
  p.roundRect(6, 6.4, 26, 5.8, 2.9, p.vgrad(6.4, 12.2, '#ffeab8', '#f0c27a'));
  p.roundRect(6, 28.8, 26, 5.8, 2.9, p.vgrad(28.8, 34.6, '#ffeab8', '#f0c27a'));
  // the red ribbon around the middle, with its bow
  p.rect(25.4, 5.5, 4.4, 29, RED);
  p.ellipse(22.8, 22.4, 3.4, 2.3, RED, O, -0.35);
  p.ellipse(32.4, 22.4, 3.4, 2.3, RED, O, 0.35);
  p.poly([pt(26.2, 23.4), pt(24.2, 27.4), pt(26.8, 26.4)], RED);
  p.poly([pt(29, 23.4), pt(31, 27.4), pt(28.4, 26.4)], RED);
  p.circle(27.6, 22.4, 1.9, RED_D);
  glint(p, 22.1, 21.8, 0.9, 0.5, -0.4, 0.7);
}

/** A clipboard with a checklist: two ticks and one box still to do. */
function uiOrders(p: Pen): void {
  p.lineWidth = 1.1;
  // the board, then the sheet, then the clip
  p.roundRect(6.5, 7.5, 27, 29.5, 3.5, p.vgrad(7.5, 37, WOOD_L, WOOD));
  p.roundRect(9.5, 12.2, 21, 22.6, 1.5, CREAM_W);
  p.roundRect(14.5, 4.8, 11, 6, 2.5, MINT);
  glint(p, 16.6, 6.4, 2.2, 0.7, 0, 0.7);
  const rows: [number, boolean][] = [
    [16.4, true],
    [22, true],
    [27.6, false],
  ];
  for (const [y, done] of rows) {
    p.roundRect(12.4, y, 3.6, 3.6, 0.9, '#ffffff', O);
    if (done) tick(p, 12.4, y);
    p.line([pt(18.2, y + 1.8), pt(26.2, y + 1.8)], INK, 1.3);
  }
}

/** Two little houses side by side: a pink roof and a blue roof. */
function uiNeighbors(p: Pen): void {
  p.lineWidth = 1.1;
  const house = (x: number, roof: string, chimney: boolean): void => {
    const w = 14.5;
    if (chimney) p.roundRect(x + w - 4.2, 7.5, 2.8, 8.5, 0.8, PEACH);
    p.rect(x, 19.5, w, 14, p.vgrad(19.5, 33.5, CREAM_W, '#f3dcc0'));
    p.poly([pt(x - 1.6, 20.2), pt(x + w + 1.6, 20.2), pt(x + w / 2, 8.6)], roof);
    glint(p, x + 3.4, 15.2, 0.9, 3, 0.35, 0.5);
    p.roundRect(x + w / 2 - 2.3, 25.2, 4.6, 8.3, 2.2, WOOD);
    p.roundRect(x + 2, 22.6, 3.8, 3.8, 0.9, SKY_L);
  };
  house(2.2, PINK, false);
  house(21.5, SKY, true);
  // a strip of grass under both
  p.roundRect(1.5, 33.5, 37, 3, 1.5, LEAF);
}

/** A woven basket heaped with an apple, an egg and a carrot. */
function uiBarn(p: Pen): void {
  p.lineWidth = 1.1;
  const c = p.ctx;
  // the carrot, lying back in the heap
  const top = pt(28, 9.5);
  const tipPt = pt(31, 25);
  const dx = tipPt.x - top.x;
  const dy = tipPt.y - top.y;
  const len = Math.hypot(dx, dy);
  const ux = dx / len;
  const uy = dy / len;
  const at = (t: number, s: number): Pt => pt(top.x + ux * len * t - uy * s, top.y + uy * len * t + ux * s);
  p.poly([at(0, -2.6), at(0.22, -2.7), at(1, 0), at(0.22, 2.7), at(0, 2.6)], ORANGE);
  p.line([at(0.42, -2.5), at(0.42, 2.5)], shade(ORANGE, -0.28), 0.7);
  p.line([at(0.7, -1.6), at(0.7, 1.6)], shade(ORANGE, -0.28), 0.7);
  leaf(p, top.x, top.y, -2.3, 5.6);
  leaf(p, top.x, top.y, -0.8, 5.6);
  // the egg, then the apple in front of it
  p.ellipse(21, 14.8, 3.9, 4.8, CREAM_W);
  glint(p, 19.4, 12, 0.9, 1.6, -0.4, 0.8);
  p.ball(13.5, 17.5, 5.2, '#ff7a86');
  glint(p, 11.2, 15, 1.2, 0.8, -0.6, 0.8);
  p.line([pt(13.6, 12.4), pt(14.6, 10.2)], '#7a4a2a', 1.4);
  leaf(p, 14.6, 10.4, -0.9, 4.6);
  // the basket: its body, woven lines clipped to the body, and a rim
  const basket = (): void => {
    c.beginPath();
    c.moveTo(6, 22);
    c.lineTo(34, 22);
    c.bezierCurveTo(33, 30, 27, 35.6, 20, 35.6);
    c.bezierCurveTo(13, 35.6, 7, 30, 6, 22);
    c.closePath();
  };
  basket();
  c.fillStyle = p.vgrad(22, 35.6, '#e9ad70', WOOD);
  c.fill();
  c.strokeStyle = O;
  c.lineWidth = 1.1;
  c.stroke();
  c.save();
  basket();
  c.clip();
  for (const y of [25.6, 29.8, 34]) p.line([pt(4, y), pt(36, y)], 'rgba(74,52,38,0.3)', 1);
  for (const x of [12, 20, 28]) p.curve(pt(x, 22), pt(x - 1.6, 29), pt(x, 36), shade(WOOD, -0.3), 1);
  c.restore();
  p.roundRect(4.5, 19.6, 31, 4.6, 2.2, WOOD_L);
}

/** An open storybook with a star bookmark hanging from the spine. */
function uiCollections(p: Pen): void {
  p.lineWidth = 1.1;
  const c = p.ctx;
  // one half of the book: s = -1 for the left page, +1 for the right; g grows it outwards
  const half = (s: number, g: number): void => {
    const X = (d: number): number => 20 + s * d;
    c.beginPath();
    c.moveTo(X(0), 12.4 - g);
    c.quadraticCurveTo(X(8.5), 8.4 - g, X(16.8 + g), 10 - g);
    c.lineTo(X(16.8 + g), 31.4 + g);
    c.quadraticCurveTo(X(8.5), 28.6 + g, X(0), 33.6 + g);
    c.closePath();
  };
  // the lilac cover peeks out round the pages
  for (const s of [-1, 1]) {
    half(s, 1.5);
    c.fillStyle = LILAC;
    c.fill();
    c.strokeStyle = O;
    c.lineWidth = 1.1;
    c.stroke();
  }
  // the cream pages
  for (const s of [-1, 1]) {
    half(s, 0);
    c.fillStyle = p.vgrad(10, 34, CREAM_W, '#fbe9cf');
    c.fill();
    c.strokeStyle = O;
    c.lineWidth = 1.1;
    c.stroke();
  }
  for (const y of [15.5, 19.8, 24.1]) {
    p.line([pt(7, y), pt(16, y + 0.4)], INK, 0.9);
    p.line([pt(24, y + 0.4), pt(33, y)], INK, 0.9);
  }
  p.line([pt(20, 12.4), pt(20, 33.6)], O, 1.1);
  // the pink ribbon and its gold star
  p.roundRect(22.6, 32.4, 1.9, 2.6, 0.4, PINK);
  p.star(23.6, 34.2, 3.3, GOLD_L, shade(GOLD, -0.3));
}

/** A terracotta pot with two tulips on leafy stalks. */
function uiBlooms(p: Pen): void {
  p.lineWidth = 1.1;
  const c = p.ctx;
  ground(p, 20, 9.5);
  // the pot body and its rim
  c.beginPath();
  c.moveTo(9, 19);
  c.lineTo(31, 19);
  c.lineTo(28, 35.2);
  c.lineTo(12, 35.2);
  c.closePath();
  c.fillStyle = p.vgrad(19, 35.2, '#f6b49a', PEACH);
  c.fill();
  c.strokeStyle = O;
  c.lineWidth = 1.1;
  c.stroke();
  glint(p, 12.8, 27, 1.1, 5, 0.08, 0.5);
  p.roundRect(7, 16.6, 26, 4.6, 2, '#f0a286');
  // leaves and stems rise out of the soil, which hides their feet
  leaf(p, 17.5, 18.4, -2.5, 7);
  leaf(p, 22.5, 18.4, -0.6, 7);
  stalk(p, pt(16.4, 18), pt(15.6, 15.2), pt(15.4, 14.4), 1.4);
  stalk(p, pt(23.6, 18), pt(24.4, 15.4), pt(24.6, 13.4), 1.4);
  p.ellipse(20, 17.9, 9.6, 1.9, SOIL);
  tulip(p, 15.4, 10.6, 4.2, '#ff9fbd');
  tulip(p, 24.6, 9.6, 4.2, BUTTER);
}

/** A little ferris wheel with a lilac pennant on a tall pole. */
function uiFair(p: Pen): void {
  p.lineWidth = 1.1;
  const hub = pt(17, 19.5);
  const R = 10;
  // the A-frame legs and the base
  bar(p, [hub, pt(11, 35)], 2, WOOD);
  bar(p, [hub, pt(23, 35)], 2, WOOD);
  p.roundRect(7.5, 34, 19, 2.6, 1.2, WOOD_L);
  // spokes, then the rim
  const cars = [MINT, PINK, BUTTER, SKY_L];
  for (let k = 0; k < 6; k++) {
    const a = -Math.PI / 2 + (k * Math.PI) / 3;
    p.line([hub, pt(hub.x + Math.cos(a) * R, hub.y + Math.sin(a) * R)], O, 0.9);
  }
  arcBar(p, hub.x, hub.y, R, 0, Math.PI * 2, 2, CREAM_W);
  // a gondola hanging from each spoke end
  for (let k = 0; k < 6; k++) {
    const a = -Math.PI / 2 + (k * Math.PI) / 3;
    const cx = hub.x + Math.cos(a) * R;
    const cy = hub.y + Math.sin(a) * R + 2.6;
    p.roundRect(cx - 1.9, cy - 1.6, 3.8, 3.4, 1, cars[k % cars.length]);
  }
  p.circle(hub.x, hub.y, 2, BUTTER);
  // the pole and the pennant
  bar(p, [pt(31.5, 36), pt(31.5, 5)], 1.6, WOOD);
  p.poly([pt(31.5, 5.2), pt(37, 7.2), pt(31.5, 9.6)], LILAC);
  glint(p, 33.2, 6.8, 1.4, 0.5, 0.2, 0.6);
}

/** A love-letter envelope, pink flap and a heart wax seal. */
function uiFriends(p: Pen): void {
  p.lineWidth = 1.1;
  ground(p, 20, 13, 36.6);
  p.rect(3.5, 10, 33, 23, p.vgrad(10, 33, '#fffaf4', '#ffe0ea'));
  p.line([pt(4, 32.6), pt(16.4, 22.6)], O, 0.9);
  p.line([pt(36, 32.6), pt(23.6, 22.6)], O, 0.9);
  p.poly([pt(3.5, 10), pt(36.5, 10), pt(20, 25.2)], p.vgrad(10, 25, '#ffc8dc', PINK));
  glint(p, 11.5, 13.5, 6, 0.8, 0.1, 0.5);
  // the wax seal, with a cream heart pressed into it
  p.circle(20, 23.6, 4.4, RED);
  p.heart(20, 23.9, 2.1, CREAM_W, null);
  glint(p, 18.2, 21.6, 1, 0.6, -0.5, 0.8);
}

/** A round orange tabby face with blush cheeks. */
function uiKitties(p: Pen): void {
  p.lineWidth = 1.1;
  // ears: orange with pink insides, under the head
  p.poly([pt(6.6, 16.6), pt(8.4, 4.6), pt(18.4, 11.4)], ORANGE);
  p.poly([pt(33.4, 16.6), pt(31.6, 4.6), pt(21.6, 11.4)], ORANGE);
  p.poly([pt(9.2, 14.2), pt(9.9, 8.6), pt(14.4, 11.6)], PINK, null);
  p.poly([pt(30.8, 14.2), pt(30.1, 8.6), pt(25.6, 11.6)], PINK, null);
  // the head
  p.circle(20, 22.4, 14, p.vgrad(8.4, 36.4, '#ffbb7e', ORANGE));
  // tabby stripes on the forehead and the cheeks
  const stripe = shade(ORANGE, -0.32);
  p.line([pt(20, 10.2), pt(20, 14.2)], stripe, 1.5);
  p.line([pt(16.2, 11), pt(17, 14.6)], stripe, 1.5);
  p.line([pt(23.8, 11), pt(23, 14.6)], stripe, 1.5);
  p.line([pt(7.4, 20.4), pt(10.6, 21.4)], stripe, 1.2);
  p.line([pt(32.6, 20.4), pt(29.4, 21.4)], stripe, 1.2);
  // the cream muzzle, the nose and the mouth
  p.ellipse(20, 27.4, 6.8, 4.6, CREAM_W, null);
  p.ellipse(14.6, 21.6, 1.5, 2.1, O, null);
  p.ellipse(25.4, 21.6, 1.5, 2.1, O, null);
  glint(p, 15.1, 20.6, 0.5, 0.6, 0, 0.9);
  glint(p, 25.9, 20.6, 0.5, 0.6, 0, 0.9);
  p.poly([pt(18.2, 24.6), pt(21.8, 24.6), pt(20, 26.6)], PINK_DD, O, 0.8);
  p.curve(pt(20, 26.6), pt(19.6, 28.8), pt(17.2, 28.6), O, 0.9);
  p.curve(pt(20, 26.6), pt(20.4, 28.8), pt(22.8, 28.6), O, 0.9);
  // blush cheeks and whiskers
  p.ellipse(10.6, 26, 2.8, 1.7, 'rgba(255,128,172,0.6)', null);
  p.ellipse(29.4, 26, 2.8, 1.7, 'rgba(255,128,172,0.6)', null);
  for (const [a, b] of [
    [pt(8.4, 23.6), pt(1.8, 22.6)],
    [pt(8.4, 25.6), pt(1.8, 26.4)],
    [pt(31.6, 23.6), pt(38.2, 22.6)],
    [pt(31.6, 25.6), pt(38.2, 26.4)],
  ] as [Pt, Pt][]) {
    p.line([a, b], O, 0.7);
  }
  glint(p, 11.4, 13.8, 3.2, 1.8, -0.7, 0.45);
}

/** A green nature journal with a mint leaf on its cover. */
function uiJournal(p: Pen): void {
  p.lineWidth = 1.1;
  ground(p, 20, 11, 36.6);
  // the pages peeking out at the right, then the cover over them
  p.roundRect(29, 8.5, 4.5, 25, 1.2, CREAM_W);
  p.roundRect(7.5, 6.5, 24, 28, 2.5, p.vgrad(6.5, 34.5, '#a5dba0', '#6fb86f'));
  p.roundRect(7.5, 6.5, 3.6, 28, 1.4, shade(LEAF_D, -0.1));
  // the label
  p.roundRect(14, 10.5, 12, 4.5, 1.2, CREAM_W);
  p.line([pt(16.2, 12.8), pt(23.8, 12.8)], INK, 0.8);
  // the leaf, with a smaller one beside it
  leaf(p, 17.4, 31, -2.2, 7, '#dff6c8');
  leaf(p, 17, 31, -1.2, 15, MINT);
  glint(p, 19, 23.5, 0.6, 3, -0.4, 0.6);
  // a pink ribbon bookmark
  p.poly([pt(24.5, 33), pt(27.2, 33), pt(27.2, 37.2), pt(25.85, 35.9), pt(24.5, 37.2)], PINK);
}

/** A tiny town hall: columns, a mint dome and a flag. */
function uiTown(p: Pen): void {
  p.lineWidth = 1.1;
  // the steps
  p.roundRect(4.5, 32.5, 31, 4, 1.4, '#fbeed9');
  // the body and its entablature
  p.rect(6.5, 20, 27, 12.5, p.vgrad(20, 32.5, '#fffaf1', '#f3e1c6'));
  p.roundRect(4.5, 17.5, 31, 3.8, 1, '#fff0dc');
  // the mint dome on its drum, a finial and the flag
  const c = p.ctx;
  c.beginPath();
  c.arc(20, 17.5, 5.6, Math.PI, 0);
  c.closePath();
  c.fillStyle = p.vgrad(11.9, 17.5, shade(MINT, 0.3), shade(MINT, -0.1));
  c.fill();
  c.strokeStyle = O;
  c.lineWidth = 1.1;
  c.stroke();
  glint(p, 17.2, 14.6, 1, 2.2, 0.3, 0.6);
  p.circle(20, 11.9, 0.9, BUTTER);
  p.line([pt(20, 11.6), pt(20, 4)], O, 1.1);
  p.poly([pt(20, 4.2), pt(26, 5.8), pt(20, 8)], RED);
  // the columns and the arched door between them
  for (const x of [9.5, 15.5, 24.5, 30.5]) p.roundRect(x - 1.3, 21.5, 2.6, 10.5, 0.6, CREAM_W);
  c.beginPath();
  c.moveTo(17.5, 32.5);
  c.lineTo(17.5, 26.5);
  c.arc(20, 26.5, 2.5, Math.PI, 0);
  c.lineTo(22.5, 32.5);
  c.closePath();
  c.fillStyle = WOOD;
  c.fill();
  c.strokeStyle = O;
  c.lineWidth = 1.1;
  c.stroke();
}

/** A farmhouse with a red roof, a chimney and a heart-shaped puff of smoke. */
function uiFarm(p: Pen): void {
  p.lineWidth = 1.1;
  // the chimney, then the walls and the windows
  p.roundRect(25, 6, 4, 11, 0.8, '#e8957a');
  p.rect(7.5, 21.5, 25, 13, p.vgrad(21.5, 34.5, '#fff4e4', '#f5dcb8'));
  p.roundRect(10, 23.5, 5, 5, 1, SKY_L);
  p.roundRect(25, 23.5, 5, 5, 1, SKY_L);
  p.line([pt(12.5, 23.5), pt(12.5, 28.5)], O, 0.7);
  p.line([pt(27.5, 23.5), pt(27.5, 28.5)], O, 0.7);
  // the mint door
  p.roundRect(16.5, 24, 7, 10.5, 3.2, MINT);
  // the red roof over all
  p.poly([pt(3.5, 22), pt(36.5, 22), pt(20, 8.5)], RED);
  glint(p, 11, 16.5, 1, 4, 0.5, 0.45);
  // a grass strip underneath
  p.roundRect(3, 34.6, 34, 2.4, 1.2, LEAF);
  // the heart-shaped puff of smoke, with two little bubbles leading to it
  p.circle(27.6, 3.2, 0.9, CREAM_W, O);
  p.heart(32.4, 4.6, 2.7, CREAM_W, O);
}

/** Two joined mint eighth notes with a sparkle. */
function notes(p: Pen, dx: number, dy: number, fill: string | CanvasGradient, stem: string): void {
  const h1 = pt(12.3 + dx, 30.4 + dy);
  const h2 = pt(26.3 + dx, 27.4 + dy);
  const s1 = pt(h1.x + 3.5, h1.y);
  const s2 = pt(h2.x + 3.5, h2.y);
  const top1 = pt(s1.x, 9.8 + dy);
  const top2 = pt(s2.x, 6.8 + dy);
  // stems and beam first, then the note heads over their feet
  bar(p, [s1, top1], 1.8, stem);
  bar(p, [s2, top2], 1.8, stem);
  bar(p, [top1, top2], 3.4, stem);
  p.ellipse(h1.x, h1.y, 3.9, 3, fill, O, -0.35);
  p.ellipse(h2.x, h2.y, 3.9, 3, fill, O, -0.35);
  glint(p, h1.x - 1, h1.y - 0.8, 1, 0.5, -0.35, 0.7);
  glint(p, h2.x - 1, h2.y - 0.8, 1, 0.5, -0.35, 0.7);
}

/** Two mint eighth notes, joined by a beam, with a sparkle. */
function uiMusic(p: Pen): void {
  p.lineWidth = 1.1;
  notes(p, 0, 0, p.vgrad(6, 33, '#c8f4e3', MINT_D), MINT_D);
  sparkle(p, 34.5, 15.5, 2.3);
}

/** The same notes, greyed and faded, with a little "z z". */
function uiMusicOff(p: Pen): void {
  p.lineWidth = 1.1;
  const c = p.ctx;
  c.globalAlpha = 0.8;
  notes(p, -2, 2, p.vgrad(6, 33, '#eceaf0', '#b9b4c6'), '#b9b4c6');
  c.globalAlpha = 1;
  zGlyph(p, 30.5, 10.5, 2.8, '#9b93ab');
  zGlyph(p, 33, 3.4, 3.6, '#9b93ab');
}

/** A red mailbox on a wooden post, with its flag up. */
function uiMail(p: Pen): void {
  p.lineWidth = 1.1;
  const c = p.ctx;
  ground(p, 20, 12, 36.6);
  // the flag pole, which rises from the box's side
  bar(p, [pt(30, 22), pt(30, 5.4)], 1.6, WOOD);
  p.rect(30, 5.2, 6, 4.6, BUTTER);
  // the post
  p.rect(18.2, 26, 3.4, 9.6, WOOD);
  // the box: a domed top over a red body
  c.beginPath();
  c.roundRect(6.5, 13, 25, 14, [7, 7, 2, 2]);
  c.fillStyle = p.vgrad(13, 27, '#ff9aaa', RED);
  c.fill();
  c.strokeStyle = O;
  c.lineWidth = 1.1;
  c.stroke();
  glint(p, 10.5, 17.5, 1, 4, 0.2, 0.6);
  // the letter slot
  p.roundRect(11.5, 19.5, 14, 2.2, 1, shade(RED, -0.45));
}

// ---------------------------------------------------------------------------
// Exports

export const icons: IconSpec[] = [
  // Toolbar
  { key: 'ui:hand', paint: uiHand },
  { key: 'ui:harvest', paint: uiHarvest },
  { key: 'ui:plow', paint: uiPlow },
  { key: 'ui:water', paint: uiWater },
  { key: 'ui:market', paint: uiMarket },
  { key: 'ui:decor', paint: uiDecor },
  { key: 'ui:cook', paint: uiCook },
  { key: 'ui:fish', paint: uiFish },
  { key: 'ui:garage', paint: uiGarage },
  { key: 'ui:move', paint: uiMove },
  { key: 'ui:store', paint: uiStore },
  { key: 'ui:sell', paint: uiSell },
  // Corner buttons
  { key: 'ui:quests', paint: uiQuests },
  { key: 'ui:orders', paint: uiOrders },
  { key: 'ui:neighbors', paint: uiNeighbors },
  { key: 'ui:barn', paint: uiBarn },
  { key: 'ui:collections', paint: uiCollections },
  { key: 'ui:blooms', paint: uiBlooms },
  { key: 'ui:fair', paint: uiFair },
  { key: 'ui:friends', paint: uiFriends },
  { key: 'ui:kitties', paint: uiKitties },
  { key: 'ui:journal', paint: uiJournal },
  { key: 'ui:town', paint: uiTown },
  { key: 'ui:farm', paint: uiFarm },
  { key: 'ui:music', paint: uiMusic },
  { key: 'ui:music_off', paint: uiMusicOff },
  { key: 'ui:mail', paint: uiMail },
];
