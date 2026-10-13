// Grand decor, set B: the luxury late-game pieces (350k to 1.5M coins). Each one
// is precious: polished gold with glossy white glints, pearl and marble, pastel
// tints and a few twinkling sparkles. Same house style as fair.ts and vehicles.ts:
// chunky rounded shapes, the warm brown OUTLINE, light from the top-left, soft
// ground shadows.
import { type Pen, type Pt, type SpriteSpec, OUTLINE, rng, shade } from './kit';

type Ctx = CanvasRenderingContext2D;
type Grad = string | CanvasGradient;

const O = OUTLINE;
const INK = '#2b1d14';
const WHITE = '#fffdf6';
const PEARL = '#fffaf3';
const PEARL_D = '#e8ddcf';
const MARBLE = '#f7f2ea';
const MARBLE_D = '#d6cabb';
const GOLD_L = '#fff0a6';
const GOLD = '#f4c24a';
const GOLD_D = '#c98b1f';
const AQUA_L = '#e8fffb';
const AQUA = '#b5efee';
const AQUA_D = '#73cfdb';
const LEAF = '#8ad474';
const LEAF_D = '#4f9a48';
const PINK = '#ffb3cf';
const PINK_L = '#ffdbe8';
const PINK_D = '#e77fa6';
const CREAM = '#fff4e4';
const LILAC = '#c9b8f5';
const LILAC_L = '#e4d9ff';
const MINT = '#a8e6cf';
const BUTTER = '#ffe49a';
const RUBY = '#f08a94';
const WOOD_L = '#f2c58f';
const TYRE = '#5b4232';
const BLUSH = 'rgba(255,110,140,0.5)';

// ---------------------------------------------------------------------------
// Helpers

const pt = (x: number, y: number): Pt => ({ x, y });

function lerpPt(a: Pt, b: Pt, t: number): Pt {
  return pt(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t);
}

/** A thick outlined stick between points (legs, poles, posts). */
function stick(p: Pen, pts: Pt[], w: number, color: string): void {
  p.line(pts, O, w + 1.6);
  p.line(pts, color, w);
}

/** A thick outlined curve (trunks, necks, spouts, handles). */
function bend(p: Pen, a: Pt, c: Pt, b: Pt, w: number, color: string): void {
  p.curve(a, c, b, O, w + 1.6);
  p.curve(a, c, b, color, w);
}

/** A four-point glint with a soft halo. */
function sparkle(p: Pen, x: number, y: number, r: number): void {
  p.glow(x, y, r * 2.6, '#fff6c2', 0.6);
  const pts: Pt[] = [];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 - Math.PI / 2;
    const rr = i % 2 === 0 ? r : r * 0.28;
    pts.push(pt(x + Math.cos(a) * rr, y + Math.sin(a) * rr));
  }
  p.poly(pts, '#ffffff', O, 0.6);
}

/** Polished gold across a span: a bright band between darker edges. */
function goldGrad(p: Pen, x0: number, x1: number): CanvasGradient {
  const g = p.ctx.createLinearGradient(x0, 0, x1, 0);
  g.addColorStop(0, GOLD_D);
  g.addColorStop(0.28, GOLD_L);
  g.addColorStop(0.5, GOLD);
  g.addColorStop(0.78, '#f9d77a');
  g.addColorStop(1, GOLD_D);
  return g;
}

/** Marble or pearl across a span: soft white with cool grey edges. */
function marbleGrad(p: Pen, x0: number, x1: number): CanvasGradient {
  const g = p.ctx.createLinearGradient(x0, 0, x1, 0);
  g.addColorStop(0, MARBLE_D);
  g.addColorStop(0.3, '#fffdf9');
  g.addColorStop(0.7, MARBLE);
  g.addColorStop(1, MARBLE_D);
  return g;
}

/** An outlined elliptical arc or full ring (bands, rims, trim). */
function ring(p: Pen, x: number, y: number, rx: number, ry: number, a0: number, a1: number, color: Grad, w: number): void {
  const c = p.ctx;
  c.beginPath();
  c.ellipse(x, y, rx, ry, 0, a0, a1);
  c.strokeStyle = O;
  c.lineWidth = w + 1.4;
  c.stroke();
  c.beginPath();
  c.ellipse(x, y, rx, ry, 0, a0, a1);
  c.strokeStyle = color;
  c.lineWidth = w;
  c.stroke();
}

/** An upright drum standing on (x, y): a custom side fill and a flat top. */
function drum(p: Pen, x: number, y: number, rx: number, ht: number, side: Grad, top: string): void {
  const c = p.ctx;
  const ry = rx / 2;
  c.beginPath();
  c.moveTo(x - rx, y - ht);
  c.lineTo(x - rx, y);
  c.ellipse(x, y, rx, ry, 0, Math.PI, 0, true);
  c.lineTo(x + rx, y - ht);
  c.closePath();
  c.fillStyle = side;
  c.fill();
  c.strokeStyle = O;
  c.lineWidth = 1;
  c.stroke();
  p.ellipse(x, y - ht, rx, ry, top);
}

/** A hanging scallop from a to b, dipping `depth` px below the line. */
function scallop(p: Pen, a: Pt, b: Pt, depth: number, fill: Grad): void {
  const c = p.ctx;
  c.beginPath();
  c.moveTo(a.x, a.y);
  c.quadraticCurveTo((a.x + b.x) / 2, (a.y + b.y) / 2 + depth * 2, b.x, b.y);
  c.closePath();
  c.fillStyle = fill;
  c.fill();
  c.strokeStyle = O;
  c.lineWidth = 1;
  c.stroke();
}

// ---------------------------------------------------------------------------
// 1. Marble swan fountain (2x2)

/** A marble swan on the water: body at (x, y), neck bowed out through `neckC` to a head at (hx, hy). */
function swan(p: Pen, x: number, y: number, f: number, neckC: Pt, hx: number, hy: number): void {
  // tail feathers flicked up behind
  p.poly([pt(x - f * 10, y - 2), pt(x - f * 20, y - 10), pt(x - f * 17, y + 1)], PEARL, O, 1);
  // the body: a soft pearl bean with a shaded underside
  p.ellipse(x, y, 14, 6.6, p.vgrad(y - 7, y + 7, '#ffffff', PEARL_D), O, -0.08 * f);
  // folded wing along the back
  p.ellipse(x - f * 2, y - 3, 9, 3.2, shade(PEARL_D, -0.04), O, -0.12 * f);
  p.curve(pt(x - f * 6, y - 4), pt(x, y - 6.5), pt(x + f * 5, y - 4.5), 'rgba(255,255,255,0.9)', 1);
  // the neck and head
  bend(p, pt(x + f * 10, y - 3), neckC, pt(hx, hy), 8, PEARL);
  p.curve(pt(x + f * 9, y - 4), neckC, pt(hx - f * 1.5, hy + 1), 'rgba(232,221,207,0.9)', 1.6);
  p.circle(hx, hy, 5.2, PEARL, O);
  // a golden beak and a dot eye
  p.poly([pt(hx + f * 3.5, hy - 1.8), pt(hx + f * 10, hy + 0.8), pt(hx + f * 3.5, hy + 2.8)], GOLD, O, 1);
  p.circle(hx + f * 1.5, hy - 1.4, 1.1, INK, null);
}

/** A little arch of water rising from (x, y) and falling back to the basin. */
function jet(p: Pen, x: number, y: number, f: number): void {
  p.curve(pt(x, y), pt(x + f * 2, y - 22), pt(x + f * 9, y - 12), 'rgba(255,255,255,0.95)', 1.6);
  p.circle(x + f * 9, y - 9, 1.5, 'rgba(255,255,255,0.95)', AQUA_D);
  p.circle(x + f * 5, y - 20, 1.2, 'rgba(255,255,255,0.95)', AQUA_D);
}

function lilyPad(p: Pen, x: number, y: number, bloom: boolean): void {
  p.ellipse(x, y, 6, 2.8, LEAF, LEAF_D);
  p.ellipse(x - 1.5, y - 1, 2.6, 0.8, 'rgba(255,255,255,0.5)', null);
  if (bloom) p.flower(x, y - 3, 2.6, PINK_L, BUTTER);
}

function swanFountain(p: Pen): void {
  const { x: cx, y: G } = p.center; // 64, 112
  const RX = 46;
  const RY = 23;
  const WALL = 14;
  const WATER_Y = G - WALL + 1;

  p.shadow(cx, G + 2, 52, 26, 0.26);

  // the marble basin: a drum with a gold band round its wall
  drum(p, cx, G, RX, WALL, marbleGrad(p, cx - RX, cx + RX), MARBLE);
  ring(p, cx, G - 6, RX, RY, 0, Math.PI, goldGrad(p, cx - RX, cx + RX), 2.4);

  // gold rim, then pale aqua water inside it
  ring(p, cx, G - WALL, RX, RY, 0, Math.PI * 2, goldGrad(p, cx - RX, cx + RX), 2);
  const water = p.ctx.createRadialGradient(cx - 8, WATER_Y - 5, 2, cx, WATER_Y, 40);
  water.addColorStop(0, AQUA_L);
  water.addColorStop(0.6, AQUA);
  water.addColorStop(1, AQUA_D);
  p.ellipse(cx, WATER_Y, 38, 18.5, water, null);
  p.ellipse(cx, WATER_Y, 26, 12.5, null, 'rgba(255,255,255,0.7)');

  // water sprays at the back, lily pads on the surface
  jet(p, cx - 26, G - 22, -1);
  jet(p, cx + 26, G - 22, 1);
  lilyPad(p, cx - 31, G - 20, true);
  lilyPad(p, cx + 33, G - 6, false);
  lilyPad(p, cx - 12, G + 2, false);

  // two swans facing each other; their necks arch out and meet over the middle
  swan(p, cx - 20, G - 6, 1, pt(cx - 24, G - 50), cx - 3, G - 35);
  swan(p, cx + 20, G - 6, -1, pt(cx + 24, G - 50), cx + 3, G - 35);

  // gold finials on the rim
  p.ball(cx - RX, G - WALL, 2.6, GOLD);
  p.ball(cx + RX, G - WALL, 2.6, GOLD);
  p.ball(cx, G - WALL - RY, 2.6, GOLD);
  p.ball(cx, G - WALL + RY, 2.6, GOLD);

  sparkle(p, 14, 64, 2.6);
  sparkle(p, 114, 56, 2.4);
  sparkle(p, 102, 94, 2.2);
}

// ---------------------------------------------------------------------------
// 2. Moonlight blossom tree (1x1)

/** A crescent moon charm, its horns pointing right. */
function crescent(p: Pen, x: number, y: number, r: number, fill: string): void {
  const c = p.ctx;
  p.glow(x, y, r * 2.4, '#fff7c2', 0.4);
  c.beginPath();
  c.moveTo(x + r * 0.3, y - r);
  c.quadraticCurveTo(x - r * 1.6, y, x + r * 0.3, y + r);
  c.quadraticCurveTo(x + r * 0.5, y, x + r * 0.3, y - r);
  c.closePath();
  c.fillStyle = fill;
  c.fill();
  c.strokeStyle = O;
  c.lineWidth = 1;
  c.stroke();
  p.ellipse(x - r * 0.5, y - r * 0.3, r * 0.2, r * 0.45, 'rgba(255,255,255,0.8)', null, 0.2);
}

/** A tiny star lantern on a thread from (fx, fy). */
function starLantern(p: Pen, fx: number, fy: number, x: number, y: number, r: number): void {
  p.line([pt(fx, fy), pt(x, y - r * 1.1)], O, 0.8);
  p.glow(x, y, r * 3, BUTTER, 0.55);
  p.star(x, y, r, BUTTER, O);
  p.circle(x, y, 0.9, WHITE, null);
}

function moonlightBlossom(p: Pen): void {
  const { x: cx, y: G } = p.center; // 32, 116
  const rand = rng('moonlight');
  p.shadow(cx, G + 1, 16, 7, 0.22);

  // a small round grassy patch with fallen petals on it
  p.ellipse(cx, G, 15, 7, '#a6e08f', O);
  p.ellipse(cx, G - 1, 11, 4.8, '#bdeca6', null);
  for (let i = 0; i < 4; i++) {
    const a = rand() * Math.PI * 2;
    p.line([pt(cx + Math.cos(a) * 9, G - 1 + Math.sin(a) * 4), pt(cx + Math.cos(a) * 10, G - 2.5 + Math.sin(a) * 4.5)], LEAF_D, 0.8);
  }
  for (let i = 0; i < 9; i++) {
    const a = rand() * Math.PI * 2;
    const d = Math.sqrt(rand()) * 0.85;
    p.ellipse(cx + Math.cos(a) * 12 * d, G + Math.sin(a) * 5.8 * d, 2.2, 1.2, i % 3 ? PINK_L : WHITE, null, rand() * 3);
  }

  // a chunky, curvy silver-lilac trunk with a soft shaded side and two branches
  const bark = '#dcd3f5';
  bend(p, pt(cx, G - 3), pt(cx - 9, G - 30), pt(cx + 2, G - 56), 11, bark);
  p.curve(pt(cx + 3, G - 8), pt(cx - 6, G - 30), pt(cx + 4, G - 54), '#b7a9d9', 1.4);
  bend(p, pt(cx - 4, G - 34), pt(cx - 12, G - 40), pt(cx - 10, G - 50), 3.6, bark);
  bend(p, pt(cx + 1, G - 38), pt(cx + 10, G - 44), pt(cx + 10, G - 52), 3.6, bark);

  // the big fluffy canopy: a glow, then lilac clumps with pale pink ones at the lower edge
  p.glow(cx, 44, 34, '#c9b8ff', 0.55);
  p.foliage(cx - 14, 46, 13, LILAC, 21, 5);
  p.foliage(cx + 14, 46, 13, LILAC, 23, 5);
  p.foliage(cx, 38, 24, LILAC, 7, 7);
  p.foliage(cx - 11, 54, 12, LILAC_L, 11, 5);
  p.foliage(cx + 11, 55, 11, PINK_L, 13, 5);

  // white blossoms dotted over the canopy
  for (let i = 0; i < 9; i++) {
    const a = rand() * Math.PI * 2;
    const d = Math.sqrt(rand()) * 19;
    const x = cx + Math.cos(a) * d;
    const y = 42 + Math.sin(a) * d * 0.8;
    p.flower(x, y, 2.3, i % 3 ? WHITE : '#ffd0e8', BUTTER);
  }

  // a gold crescent moon and two star lanterns on threads from the lower edge
  p.line([pt(19, 60), pt(15, 70)], O, 0.8);
  crescent(p, 15, 76, 5.8, GOLD);
  starLantern(p, 44, 62, 48, 74, 3.6);
  starLantern(p, 22, 64, 19, 88, 3.4);

  sparkle(p, 6, 28, 2.6);
  sparkle(p, 58, 24, 2.4);
  sparkle(p, 57, 98, 2.2);
}

// ---------------------------------------------------------------------------
// 3. Golden tractor (2x2)

/** A chunky tyre in the plane u = const, centred at (u, v, zc), with tread bumps round its edge. */
function tyreSide(p: Pen, u: number, v: number, zc: number, rv: number, rz: number): void {
  const at = (s: number, k: number): Pt => p.iso(u, v + rv * s * Math.cos(k), zc + rz * s * Math.sin(k));
  const edge = (s: number): Pt[] => {
    const out: Pt[] = [];
    for (let i = 0; i < 28; i++) out.push(at(s, (i / 28) * Math.PI * 2));
    return out;
  };
  p.poly(edge(1), TYRE, O, 1.2);
  for (let i = 0; i < 10; i++) {
    const q = at(1, (i / 10) * Math.PI * 2);
    p.circle(q.x, q.y, 1.5, '#7a5a48', O);
  }
  p.poly(edge(0.74), GOLD, GOLD_D, 0.9);
  p.poly(edge(0.5), PEARL, GOLD_D, 0.9);
  const c = p.iso(u, v, zc);
  p.circle(c.x, c.y, 1.6, GOLD, O);
}

/** A gold mudguard arching over the top of a side tyre. */
function fenderSide(p: Pen, u: number, v: number, zc: number, rv: number, rz: number): void {
  const pts: Pt[] = [];
  for (let i = 0; i <= 16; i++) {
    const t = Math.PI * (0.05 + (0.9 * i) / 16);
    pts.push(p.iso(u, v + (rv + 0.07) * Math.cos(t), zc + (rz + 4) * Math.sin(t)));
  }
  p.line(pts, O, 5.4);
  p.line(pts, GOLD, 3);
}

function goldenTractor(p: Pen): void {
  const { x: cx, y: G } = p.center; // 64, 102
  const P = (u: number, v: number, z = 0): Pt => p.iso(u, v, z);
  const plate = { top: GOLD_L, left: GOLD, right: GOLD_D };
  p.shadow(cx, G + 2, 40, 20, 0.26);

  // the far wheels, behind the chassis: two big rear ones and two small front ones
  tyreSide(p, 0.6, 0.6, 15, 0.3, 15);
  tyreSide(p, 0.6, 1.42, 10.5, 0.22, 10.5);

  // the low gold chassis
  p.box(0.6, 0.4, 0.8, 1.2, 6, plate, 6);

  // the driver seat: a pink cushion at the back with a tall pink backrest behind it
  p.box(0.66, 0.44, 0.68, 0.34, 4, PINK, 12);
  p.box(0.66, 0.4, 0.68, 0.08, 16, PINK, 16);

  // the steering column and a gold wheel in front of the seat
  stick(p, [P(1.0, 0.9, 12), P(1.0, 0.9, 26)], 2.2, GOLD);
  const steer: Pt[] = [];
  for (let i = 0; i <= 24; i++) {
    const t = (i / 24) * Math.PI * 2;
    steer.push(P(1.0 + Math.cos(t) * 0.14, 0.9, 28 + Math.sin(t) * 8));
  }
  p.line(steer, O, 3.2);
  p.line(steer, GOLD, 1.6);

  // the long rounded engine hood at the front: lit top, lit left, shaded right
  p.box(0.62, 0.98, 0.76, 0.74, 17, plate, 6);

  // the grille on the hood's front face, with a smiling face
  p.poly([P(0.72, 1.725, 9), P(1.28, 1.725, 9), P(1.28, 1.725, 20), P(0.72, 1.725, 20)], PEARL, O, 1);
  const eyeL = P(0.84, 1.73, 16.5);
  const eyeR = P(1.16, 1.73, 16.5);
  p.ellipse(eyeL.x, eyeL.y, 2, 2.6, INK, null);
  p.ellipse(eyeR.x, eyeR.y, 2, 2.6, INK, null);
  p.circle(eyeL.x + 0.6, eyeL.y - 0.9, 0.7, WHITE, null);
  p.circle(eyeR.x + 0.6, eyeR.y - 0.9, 0.7, WHITE, null);
  p.curve(P(0.84, 1.73, 13.5), P(1.0, 1.73, 11.2), P(1.16, 1.73, 13.5), INK, 1.2);
  const cheekL = P(0.77, 1.73, 13.5);
  const cheekR = P(1.23, 1.73, 13.5);
  p.ellipse(cheekL.x, cheekL.y, 1.8, 1.2, BLUSH, null);
  p.ellipse(cheekR.x, cheekR.y, 1.8, 1.2, BLUSH, null);

  // a pink bow at the top of the grille
  const bow = P(1.0, 1.73, 21.5);
  p.poly([pt(bow.x, bow.y), pt(bow.x - 7, bow.y - 5), pt(bow.x - 7, bow.y + 3)], PINK, O, 0.9);
  p.poly([pt(bow.x, bow.y), pt(bow.x + 7, bow.y - 5), pt(bow.x + 7, bow.y + 3)], PINK, O, 0.9);
  p.circle(bow.x, bow.y, 1.8, PINK_D, O);

  // a short gold exhaust stack on the hood with a pearl puff of smoke
  const ex = P(1.14, 1.1, 23);
  drum(p, ex.x, ex.y, 2.8, 14, goldGrad(p, ex.x - 3, ex.x + 3), GOLD_L);
  const top = ex.y - 14;
  p.circle(ex.x - 3, top - 4, 3.6, PEARL, 'rgba(74,52,38,0.35)');
  p.circle(ex.x + 2, top - 9, 4.4, PEARL, 'rgba(74,52,38,0.35)');
  p.circle(ex.x + 7, top - 3, 2.8, PEARL, 'rgba(74,52,38,0.35)');

  // a glossy streak along the lit top of the hood
  p.line([P(1.14, 1.05, 23), P(1.14, 1.6, 23)], 'rgba(255,255,255,0.85)', 1.3);

  // the near wheels, with the big rear one under a gold fender
  tyreSide(p, 1.4, 0.6, 15, 0.3, 15);
  fenderSide(p, 1.4, 0.6, 15, 0.3, 15);
  tyreSide(p, 1.4, 1.42, 10.5, 0.22, 10.5);
  fenderSide(p, 1.4, 1.42, 10.5, 0.22, 10.5);

  sparkle(p, 16, 62, 2.6);
  sparkle(p, 112, 70, 2.4);
  sparkle(p, 98, 26, 2.2);
}

// ---------------------------------------------------------------------------
// 4. Pearl carousel (2x2)

/** A pastel carousel horse on a gold pole: body at (x, y - 21), feet at y. f = +1 faces right. */
function carouselHorse(p: Pen, x: number, y: number, topY: number, body: string, f: number): void {
  const by = y - 21;
  stick(p, [pt(x, y), pt(x, topY)], 2.4, GOLD);
  stick(p, [pt(x + f * 5, by + 4), pt(x + f * 6, y - 1)], 3, body);
  stick(p, [pt(x - f * 5, by + 4), pt(x - f * 6, y - 1)], 3, body);
  bend(p, pt(x - f * 9, by - 2), pt(x - f * 18, by - 6), pt(x - f * 15, by + 5), 2.4, LILAC);
  p.ellipse(x, by, 10, 6, p.vgrad(by - 6, by + 6, '#ffffff', body));
  p.roundRect(x - 4.5, by - 7, 9, 4, 2, PINK);
  stick(p, [pt(x + f * 7, by - 3), pt(x + f * 10, by - 12)], 5.6, body);
  p.circle(x + f * 7, by - 9, 2, LILAC);
  p.circle(x + f * 9.5, by - 13, 1.8, LILAC);
  p.ellipse(x + f * 12, by - 14, 4, 3.2, body);
  p.ellipse(x + f * 14.5, by - 12.5, 2.2, 1.6, shade(body, 0.2));
  p.circle(x + f * 11, by - 15, 0.8, INK, null);
  p.ellipse(x + f * 10, by - 11, 1.6, 1, BLUSH, null);
}

function pearlCarousel(p: Pen): void {
  const { x: cx, y: G } = p.center; // 64, 152
  const FLOOR = G - 8;
  const RX = 44;
  const RY = 22;
  const TOP = G - 70; // the canopy rim, where the poles end
  const RXC = 46;
  const RYC = 22;
  const APEX = TOP - 44;
  const gold = (): CanvasGradient => goldGrad(p, cx - RX, cx + RX);

  p.shadow(cx, G + 2, 50, 25, 0.28);

  // the round base: a pearl drum with a pink band and gold studs
  drum(p, cx, G, RX, 8, marbleGrad(p, cx - RX, cx + RX), CREAM);
  ring(p, cx, G - 3, RX, RY, 0, Math.PI, PINK, 2.6);
  for (const a of [0.2, 0.5, 0.8]) {
    p.ball(cx + Math.cos(a * Math.PI) * RX, G - 3 + Math.sin(a * Math.PI) * RY, 2, GOLD);
  }

  // the striped floor, pink and cream wedges inside a gold ring
  const FR = 36;
  const FRY = 18;
  for (let i = 0; i < 12; i++) {
    const a0 = (i / 12) * Math.PI * 2;
    const a1 = ((i + 1) / 12) * Math.PI * 2;
    p.poly(
      [pt(cx, FLOOR), pt(cx + Math.cos(a0) * FR, FLOOR + Math.sin(a0) * FRY), pt(cx + Math.cos(a1) * FR, FLOOR + Math.sin(a1) * FRY)],
      i % 2 ? CREAM : PINK_L,
      null,
    );
  }
  ring(p, cx, FLOOR, FR, FRY, 0, Math.PI * 2, gold(), 2);
  ring(p, cx, FLOOR, RX, RY, 0, Math.PI * 2, gold(), 2.2);

  // the back horse first, behind the centre column
  carouselHorse(p, cx + 20, FLOOR - 14.6, TOP, '#dccfff', 1);

  // the gold centre column
  drum(p, cx, FLOOR, 4, FLOOR - TOP, goldGrad(p, cx - 4, cx + 4), GOLD_L);

  // the two front horses, a pink one and a mint one
  carouselHorse(p, cx - 27.5, FLOOR + 10.6, TOP, '#ffd6ea', -1);
  carouselHorse(p, cx + 27.5, FLOOR + 10.6, TOP, '#c9f2e0', 1);

  // the striped canopy: pearl and pink panels from a gold finial to a scalloped rim
  const rimPt = (t: number): Pt => pt(cx + Math.cos(t) * RXC, TOP + Math.sin(t) * RYC);
  const dome = (c: Ctx): void => {
    c.moveTo(cx - RXC, TOP);
    c.bezierCurveTo(cx - RXC, TOP - 34, cx - 12, APEX + 8, cx, APEX);
    c.bezierCurveTo(cx + 12, APEX + 8, cx + RXC, TOP - 34, cx + RXC, TOP);
    c.ellipse(cx, TOP, RXC, RYC, 0, 0, Math.PI, false);
    c.closePath();
  };
  const c = p.ctx;
  c.save();
  c.beginPath();
  dome(c);
  c.clip();
  for (let i = 0; i < 8; i++) {
    c.fillStyle = i % 2 ? PEARL : PINK;
    c.fillRect(cx - RXC + (i * 2 * RXC) / 8, APEX - 2, (2 * RXC) / 8 + 0.5, 70);
  }
  const shine = c.createLinearGradient(cx - RXC, 0, cx + RXC, 0);
  shine.addColorStop(0, 'rgba(255,255,255,0.4)');
  shine.addColorStop(0.5, 'rgba(255,255,255,0)');
  shine.addColorStop(1, 'rgba(120,60,80,0.14)');
  c.fillStyle = shine;
  c.fillRect(cx - RXC, APEX - 2, 2 * RXC, TOP - APEX + 30);
  c.restore();
  c.beginPath();
  dome(c);
  c.strokeStyle = O;
  c.lineWidth = 1.2;
  c.stroke();

  // the gold trim: a rim line, then scallops hanging from it, each with a tiny light
  ring(p, cx, TOP, RXC, RYC, 0, Math.PI, gold(), 2.2);
  const N = 9;
  for (let i = 0; i < N; i++) {
    scallop(p, rimPt((i / N) * Math.PI), rimPt(((i + 1) / N) * Math.PI), 5, goldGrad(p, cx - RXC, cx + RXC));
  }
  for (let i = 0; i < N; i++) {
    const m = rimPt(((i + 0.5) / N) * Math.PI);
    p.glow(m.x, m.y + 4, 6, BUTTER, 0.7);
    p.circle(m.x, m.y + 4, 1.6, '#fff8d6', O);
  }

  // the gold finial on the peak
  stick(p, [pt(cx, APEX), pt(cx, APEX - 8)], 2.4, GOLD);
  p.ball(cx, APEX - 11, 3.6, GOLD);

  sparkle(p, 14, 60, 2.8);
  sparkle(p, 114, 92, 2.4);
  sparkle(p, 102, 34, 2.2);
}

// ---------------------------------------------------------------------------
// 5. Golden windmill (2x2)

/** A gold-framed sail with cream canvas, from the hub (hx, hy) at angle a. */
function sail(p: Pen, hx: number, hy: number, a: number, L: number, w: number): void {
  const d = [Math.cos(a), Math.sin(a)];
  const n = [-d[1], d[0]];
  const at = (s: number, k: number): Pt => pt(hx + d[0] * s + n[0] * k, hy + d[1] * s + n[1] * k);
  const s0 = 5;
  const quad = [at(s0, -w / 2), at(L, -w / 2), at(L, w / 2), at(s0, w / 2)];
  p.poly(quad, '#fffbef', null);
  for (let i = 1; i < 4; i++) {
    const s = s0 + ((L - s0) * i) / 4;
    p.line([at(s, -w / 2), at(s, w / 2)], '#e2cb9c', 0.9);
  }
  p.poly(quad, null, O, 3.6);
  p.poly(quad, null, GOLD, 2);
}

function goldenWindmill(p: Pen): void {
  const { x: cx, y: G } = p.center; // 64, 172
  const TOP = G - 84; // where the tower meets the cap
  const HUB_Y = G - 68;
  const c = p.ctx;
  p.shadow(cx, G + 2, 40, 20, 0.26);

  // a round flower bed with a gold edge
  p.ellipse(cx, G, 38, 19, '#bfe9a3', O);
  ring(p, cx, G, 38, 19, 0, Math.PI * 2, GOLD, 2);
  const beds: [number, number, string][] = [
    [cx - 30, G - 2, PINK],
    [cx + 30, G - 2, BUTTER],
    [cx - 26, G + 8, LILAC],
    [cx + 26, G + 8, WHITE],
    [cx - 14, G + 14, BUTTER],
    [cx + 14, G + 14, PINK],
  ];
  for (const [x, y, col] of beds) p.flower(x, y, 2.6, col, WHITE);

  // the tapered cream tower
  const tower = c.createLinearGradient(cx - 22, 0, cx + 22, 0);
  tower.addColorStop(0, '#e8dac2');
  tower.addColorStop(0.3, '#fffaf0');
  tower.addColorStop(0.7, '#f6ecdb');
  tower.addColorStop(1, '#d9c8ab');
  c.beginPath();
  c.moveTo(cx - 22, G);
  c.lineTo(cx - 16, TOP);
  c.lineTo(cx + 16, TOP);
  c.lineTo(cx + 22, G);
  c.ellipse(cx, G, 22, 11, 0, 0, Math.PI, false);
  c.closePath();
  c.fillStyle = tower;
  c.fill();
  c.strokeStyle = O;
  c.lineWidth = 1.2;
  c.stroke();

  // gold bands round the tower
  for (const z of [7, 64]) {
    const r = 22 - (6 * z) / 84;
    ring(p, cx, G - z, r, r / 2, 0, Math.PI, GOLD, 2.4);
  }

  // an arched mint door with a gold frame and a step
  c.beginPath();
  c.moveTo(cx - 6, G);
  c.lineTo(cx - 6, G - 16);
  c.arc(cx, G - 16, 6, Math.PI, 0);
  c.lineTo(cx + 6, G);
  c.closePath();
  c.fillStyle = MINT;
  c.fill();
  c.strokeStyle = O;
  c.lineWidth = 3.6;
  c.stroke();
  c.strokeStyle = GOLD;
  c.lineWidth = 2;
  c.stroke();
  p.circle(cx + 3.2, G - 8, 1.1, GOLD, O);
  p.roundRect(cx - 8, G - 1, 16, 3, 1.2, MARBLE);

  // a round gold-framed window with a flower box beneath
  p.circle(cx, G - 46, 4.4, GOLD, O);
  p.circle(cx, G - 46, 2.8, '#dff4ff', null);
  p.roundRect(cx - 6.5, G - 38, 13, 3.4, 1.2, WOOD_L);
  p.flower(cx - 4, G - 40, 2.2, PINK, BUTTER);
  p.flower(cx + 3.5, G - 40, 2.2, LILAC, BUTTER);

  // the gold cap roof with its facets and a rim ring
  const cap = goldGrad(p, cx - 21, cx + 21);
  c.beginPath();
  c.moveTo(cx - 21, TOP);
  c.lineTo(cx, TOP - 38);
  c.lineTo(cx + 21, TOP);
  c.ellipse(cx, TOP, 21, 10.5, 0, 0, Math.PI, false);
  c.closePath();
  c.fillStyle = cap;
  c.fill();
  c.strokeStyle = O;
  c.lineWidth = 1.2;
  c.stroke();
  for (const dx of [-12, 0, 12]) {
    const e = pt(cx + dx, TOP + 10.5 * Math.sqrt(1 - (dx / 21) ** 2));
    p.line([pt(cx, TOP - 38), e], 'rgba(154,101,25,0.55)', 0.9);
  }
  ring(p, cx, TOP, 21, 10.5, 0, Math.PI, goldGrad(p, cx - 21, cx + 21), 2.6);

  // the finial and a gold weathervane star
  stick(p, [pt(cx, TOP - 38), pt(cx, TOP - 46)], 2, GOLD);
  p.ball(cx, TOP - 48, 2.8, GOLD);
  p.star(cx, TOP - 58, 4.6, GOLD, O);

  // four gold-framed sails in an X, in front of the tower
  for (const a of [-Math.PI / 4, Math.PI / 4, (3 * Math.PI) / 4, (-3 * Math.PI) / 4]) {
    sail(p, cx, HUB_Y, a, 40, 9);
  }
  p.circle(cx, HUB_Y, 5.6, GOLD, O);
  p.circle(cx, HUB_Y, 2.2, PEARL, null);

  sparkle(p, 14, 100, 2.8);
  sparkle(p, 116, 122, 2.4);
  sparkle(p, 104, 30, 2.2);
}

// ---------------------------------------------------------------------------
// 6. Royal picnic pavilion (2x2)

/** A marble column on the platform at footprint (u, v), with gold base and capital. */
function column(p: Pen, u: number, v: number): void {
  const b = p.iso(u, v, 8);
  drum(p, b.x, b.y, 3.6, 92, marbleGrad(p, b.x - 3.6, b.x + 3.6), '#fffdf9');
  p.ellipse(b.x, b.y, 4.6, 2.3, GOLD, O);
  drum(p, b.x, b.y - 88, 4.6, 4, goldGrad(p, b.x - 4.6, b.x + 4.6), GOLD_L);
}

/** A two-tier cake on a gold stand, with cherry on top. */
function cake(p: Pen, x: number, y: number): void {
  drum(p, x, y, 10, 2, goldGrad(p, x - 10, x + 10), GOLD_L);
  const t1 = y - 2;
  drum(p, x, t1, 8, 6, PINK, '#ffd6e8');
  ring(p, x, t1 - 6, 8, 4, 0, Math.PI, PEARL, 2);
  const t2 = t1 - 6;
  drum(p, x, t2, 5.6, 5, PEARL, WHITE);
  const t3 = t2 - 5;
  drum(p, x, t3, 3.4, 4, MINT, '#dff8ee');
  p.ball(x, t3 - 4 - 2, 2.2, RUBY);
}

/** A pink porcelain teapot with a gold band, spout and handle. */
function teapot(p: Pen, x: number, y: number): void {
  bend(p, pt(x - 5, y - 9), pt(x - 9, y - 13), pt(x - 13, y - 14), 2.4, PINK);
  bend(p, pt(x + 6, y - 11), pt(x + 13, y - 8), pt(x + 6, y - 2), 2, PINK);
  p.ellipse(x, y - 7, 7.5, 6, p.vgrad(y - 13, y - 1, '#ffffff', PINK));
  ring(p, x, y - 6, 7.5, 6, 0, Math.PI, GOLD, 1.4);
  p.ellipse(x, y - 13, 4.6, 1.8, WHITE);
  p.ball(x, y - 15.5, 1.6, GOLD);
}

/** A wicker basket with a pink cloth over it and two strawberries. */
function basket(p: Pen, x: number, y: number): void {
  drum(p, x, y, 9, 8, p.vgrad(y - 8, y, '#f7d9ab', '#d9a268'), WOOD_L);
  ring(p, x, y - 3, 9, 4.5, 0, Math.PI, '#a8703f', 1.2);
  ring(p, x, y - 6, 9, 4.5, 0, Math.PI, '#a8703f', 1.2);
  p.ellipse(x, y - 9, 10, 5, PINK);
  p.ellipse(x - 2, y - 10, 3, 1.6, 'rgba(255,255,255,0.6)', null);
  p.ball(x - 4, y - 14, 2.4, RUBY);
  p.ball(x + 3, y - 15, 2.2, RUBY);
  p.ellipse(x - 4, y - 16.6, 2.2, 1, LEAF, O);
}

function royalPavilion(p: Pen): void {
  const { x: cx, y: G } = p.center; // 64, 142
  const P = (u: number, v: number, z = 0): Pt => p.iso(u, v, z);
  const ROOF = 104;
  const PEAK = 118;
  p.shadow(cx, G + 3, 56, 28, 0.28);

  // a pink plinth under a marble platform with a gold edge
  p.box(0.04, 0.04, 1.92, 1.92, 3, { top: '#ffe3ef', left: PINK, right: shade(PINK, -0.2) }, 0);
  p.box(0.1, 0.1, 1.8, 1.8, 5, { top: '#fffdf9', left: MARBLE, right: MARBLE_D }, 3);
  p.poly([P(0.1, 0.1, 8), P(1.9, 0.1, 8), P(1.9, 1.9, 8), P(0.1, 1.9, 8)], null, GOLD, 2);

  // a pink and cream gingham picnic blanket
  for (const [u, v, idx] of [
    [0.4, 0.4, 0],
    [1.1, 0.4, 1],
    [0.4, 1.1, 1],
    [1.1, 1.1, 0],
  ] as [number, number, number][]) {
    p.poly([P(u, v, 8), P(u + 0.7, v, 8), P(u + 0.7, v + 0.7, 8), P(u, v + 0.7, 8)], idx ? PINK_L : CREAM, O, 0.8);
  }

  // the two back columns, the picnic, then the two front columns
  column(p, 0.14, 0.8);
  column(p, 0.8, 0.14);
  const cakeAt = P(0.5, 0.85, 8);
  cake(p, cakeAt.x, cakeAt.y);
  const potAt = P(0.9, 0.5, 8);
  teapot(p, potAt.x, potAt.y);
  const basketAt = P(0.8, 1.7, 8);
  basket(p, basketAt.x, basketAt.y);
  column(p, 0.5, 1.86);
  column(p, 1.86, 0.5);

  // the canopy: a shallow pyramid of pink and cream stripes with a scalloped hem
  const A = P(0.08, 0.08, ROOF);
  const B = P(1.92, 0.08, ROOF);
  const C = P(1.92, 1.92, ROOF);
  const D = P(0.08, 1.92, ROOF);
  const K = P(1, 1, PEAK);
  const edges: [Pt, Pt][] = [
    [A, B],
    [B, C],
    [C, D],
    [D, A],
  ];
  let s = 0;
  for (const [a, b] of edges) {
    for (let i = 0; i < 6; i++) {
      scallop(p, lerpPt(a, b, i / 6), lerpPt(a, b, (i + 1) / 6), 6, s++ % 2 ? CREAM : PINK);
    }
  }
  s = 0;
  for (const [a, b] of edges) {
    for (let i = 0; i < 6; i++) {
      p.poly([lerpPt(a, b, i / 6), lerpPt(a, b, (i + 1) / 6), K], s++ % 2 ? CREAM : PINK, null);
    }
    p.poly([a, b, K], null, O, 1.2);
  }
  p.poly([A, B, C, D], null, GOLD, 2);

  // gold tassels hanging from the corners
  for (const q of [B, C, D]) {
    p.line([q, pt(q.x, q.y + 9)], O, 1.2);
    p.ball(q.x, q.y + 11, 2.4, GOLD);
  }

  // a gold crown on the peak
  const kx = K.x;
  const ky = K.y;
  p.poly(
    [pt(kx - 8, ky + 1), pt(kx - 8, ky - 4), pt(kx - 4, ky - 1), pt(kx, ky - 8), pt(kx + 4, ky - 1), pt(kx + 8, ky - 4), pt(kx + 8, ky + 1)],
    goldGrad(p, kx - 8, kx + 8),
    O,
    1,
  );
  p.roundRect(kx - 8.5, ky, 17, 3, 1.2, GOLD);
  p.circle(kx, ky + 1.5, 1.6, PINK, O);
  for (const [tx, ty] of [
    [kx - 8, ky - 4],
    [kx, ky - 8],
    [kx + 8, ky - 4],
  ]) {
    p.circle(tx, ty, 1.4, GOLD_L, O);
  }

  sparkle(p, 12, 36, 2.8);
  sparkle(p, 118, 56, 2.4);
  sparkle(p, 100, 12, 2.2);
}

// ---------------------------------------------------------------------------
// Exports

export const sprites: SpriteSpec[] = [
  { key: 'deco:swan_fountain', fw: 2, fh: 2, height: 80, paint: swanFountain },
  { key: 'deco:moonlight_blossom', fw: 1, fh: 1, height: 100, paint: moonlightBlossom },
  { key: 'deco:golden_tractor', fw: 2, fh: 2, height: 70, paint: goldenTractor },
  { key: 'deco:pearl_carousel', fw: 2, fh: 2, height: 120, paint: pearlCarousel },
  { key: 'deco:golden_windmill', fw: 2, fh: 2, height: 140, paint: goldenWindmill },
  { key: 'deco:royal_pavilion', fw: 2, fh: 2, height: 110, paint: royalPavilion },
];
