// FarmVille-style collections: the thirty little treasures (40px trinket icons)
// and the six keepsake decorations a finished set unlocks. Same house style as
// market.ts and fair.ts: pastel fills, the warm brown OUTLINE, a soft top-left
// light, gentle gradients and glossy glints.
import { type IconSpec, type Pen, type Pt, type SpriteSpec, OUTLINE, boxColors, rng, shade } from './kit';

type Ctx = CanvasRenderingContext2D;
type Fill = string | CanvasGradient | null;

const O = OUTLINE;
const TAU = Math.PI * 2;
const INK = '#2b1d14';
const CHALK = '#fffdf5';
const CREAM = '#fff4e4';
const BUTTER = '#ffe49a';
const STRAW = '#f6d67a';
const GOLD = '#f4c24a';
const GOLD_L = '#fff0a6';
const GOLD_D = '#c98b1f';
const PINK = '#ffb3cf';
const PINK_D = '#e77fa6';
const PINK_L = '#ffdbe8';
const ROSE = '#ef6f8f';
const RED = '#f0746c';
const LILAC = '#c9b8f5';
const LILAC_D = '#9b86d6';
const MINT = '#a8e6cf';
const LEAF = '#6cbf55';
const LEAF_L = '#9ad977';
const WOOD = '#c98b53';
const WOOD_L = '#f2c58f';
const WOOD_DD = '#7a4f2e';
const SILVER = '#d5dce7';
const SILVER_L = '#f5f8fc';
const SILVER_D = '#97a3b5';
const BLUE = '#8fc8f5';
const BERRY = '#6b74d9';
const JAM = '#e0506f';
const PEACH = '#ffc9a0';
const TERRA = '#e8926a';
const TEA = '#e9b384';
const CAP = '#9b6a43';
const LEAF_OR = '#f0874f';
const NEST = '#c28450';
const NEST_D = '#8f5c33';
const HONEY = '#f5b13c';
const HONEY_L = '#ffe38a';
const LAV = '#a983f0';

// ---------------------------------------------------------------------------
// Helpers

const pt = (x: number, y: number): Pt => ({ x, y });

/** Fill and/or stroke a free-form path. `build` lays it out (close it yourself). */
function path(p: Pen, build: (c: Ctx) => void, fill: Fill, stroke: string | null = O, width = 1.1): void {
  const c = p.ctx;
  c.beginPath();
  build(c);
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

/** An outlined thick stroke (handles, stalks, rods). */
function thick(p: Pen, pts: Pt[], w: number, color: string): void {
  p.line(pts, O, w + 1.6);
  p.line(pts, color, w);
}

/** An outlined thick curve. */
function thickCurve(p: Pen, a: Pt, c: Pt, b: Pt, w: number, color: string): void {
  p.curve(a, c, b, O, w + 1.6);
  p.curve(a, c, b, color, w);
}

/** Linear gradient from (x0, y0) to (x1, y1). */
function lin(p: Pen, x0: number, y0: number, x1: number, y1: number, stops: [number, string][]): CanvasGradient {
  const g = p.ctx.createLinearGradient(x0, y0, x1, y1);
  for (const [t, col] of stops) g.addColorStop(t, col);
  return g;
}

/** A soft radial highlight lit from the top-left. */
function radial(p: Pen, x: number, y: number, r: number, inner: string, outer: string): CanvasGradient {
  const g = p.ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r);
  g.addColorStop(0, inner);
  g.addColorStop(1, outer);
  return g;
}

/** A four-point glint. */
function sparkle(p: Pen, x: number, y: number, r: number, color = CHALK): void {
  const pts: Pt[] = [];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TAU - Math.PI / 2;
    const rr = i % 2 === 0 ? r : r * 0.3;
    pts.push(pt(x + Math.cos(a) * rr, y + Math.sin(a) * rr));
  }
  p.poly(pts, color, O, 0.7);
}

/** A white gloss highlight. */
function glint(p: Pen, x: number, y: number, rx: number, ry: number, rot = -0.5): void {
  p.ellipse(x, y, rx, ry, 'rgba(255,255,255,0.7)', null, rot);
}

/** Soft contact shadow under an icon. */
function groundShadow(p: Pen, rx: number, y = 36): void {
  p.shadow(20, y, rx, rx * 0.28, 0.22);
}

/** A tiny two-loop bow with a knot centred at (x, y); s sets its size. */
function bow(p: Pen, x: number, y: number, s: number, color: string): void {
  p.poly([pt(x, y), pt(x - s * 1.7, y - s), pt(x - s * 1.5, y + s * 0.9)], color, O, 0.9);
  p.poly([pt(x, y), pt(x + s * 1.7, y - s), pt(x + s * 1.5, y + s * 0.9)], color, O, 0.9);
  p.circle(x, y, s * 0.45 + 0.4, shade(color, -0.16), O);
}

/** Six-sided cell, pointy top, for honeycomb. */
function hexPts(x: number, y: number, r: number): Pt[] {
  return Array.from({ length: 6 }, (_, i) => {
    const a = (i / 6) * TAU + Math.PI / 6;
    return pt(x + Math.cos(a) * r, y + Math.sin(a) * r);
  });
}

/** A speckled egg centred at (x, y). */
function egg(p: Pen, x: number, y: number, rx: number, ry: number): void {
  p.ellipse(x, y, rx, ry, CREAM, O);
  for (const [dx, dy] of [
    [-1.3, -1.6],
    [1.4, -0.4],
    [-0.2, 1.7],
  ]) {
    p.circle(x + dx, y + dy, 0.7, '#b5785a', null);
  }
}

/** A cow-bell silhouette: narrow neck at (x, y), flared mouth h below, w across. */
function bellPath(c: Ctx, x: number, y: number, w: number, h: number): void {
  c.moveTo(x - w * 0.18, y);
  c.bezierCurveTo(x - w * 0.2, y + h * 0.35, x - w * 0.5, y + h * 0.5, x - w * 0.5, y + h);
  c.quadraticCurveTo(x, y + h * 1.08, x + w * 0.5, y + h);
  c.bezierCurveTo(x + w * 0.5, y + h * 0.5, x + w * 0.2, y + h * 0.35, x + w * 0.18, y);
  c.closePath();
}

// ---------------------------------------------------------------------------
// Garden Party

function iconSeedPacket(p: Pen): void {
  groundShadow(p, 11);
  const c = p.ctx;
  c.save();
  c.translate(20, 20);
  c.rotate(-0.14);
  c.translate(-20, -20);
  p.roundRect(8, 10, 24, 24, 3, lin(p, 8, 0, 32, 0, [[0, '#fff3c4'], [0.5, BUTTER], [1, '#f5cf70']]));
  p.roundRect(11.5, 17, 17, 14, 3, CREAM, null);
  c.save();
  c.setLineDash([1.4, 1.2]);
  c.strokeStyle = PINK_D;
  c.lineWidth = 0.8;
  c.strokeRect(13, 18.5, 14, 11);
  c.restore();
  thick(p, [pt(20, 28), pt(20, 21.5)], 1.8, LEAF);
  p.ellipse(17.2, 21.2, 2.8, 1.45, LEAF_L, O, -0.5);
  p.ellipse(22.8, 20.4, 2.8, 1.45, LEAF_L, O, 0.5);
  // the crimped flap across the top
  p.roundRect(7, 6.5, 26, 6, 2.5, PINK);
  for (let x = 10; x <= 30; x += 4) p.circle(x, 12.3, 2, PINK, O);
  c.restore();
  sparkle(p, 32, 8, 2.4);
}

function iconGardenGlove(p: Pen): void {
  groundShadow(p, 11);
  const fingers: Pt[][] = [
    [pt(12.5, 16), pt(12, 7.5)],
    [pt(17.5, 15), pt(17, 4.8)],
    [pt(22.5, 15), pt(23, 5.6)],
    [pt(27.5, 16), pt(28.6, 9.2)],
  ];
  const thumb: Pt[] = [pt(10.5, 23), pt(5.4, 17.6)];
  const parts = [...fingers, thumb];
  for (const f of parts) p.line(f, O, 7);
  for (const f of parts) p.line(f, MINT, 5.4);
  p.roundRect(8.5, 13, 23, 17, 7, lin(p, 8, 13, 31, 30, [[0, '#cbf2df'], [1, MINT]]));
  p.roundRect(8.5, 26.5, 23, 7.5, 2.5, PINK);
  for (let x = 11.5; x <= 28.5; x += 3.2) p.circle(x, 30.25, 0.6, CHALK, null);
  // the gaps between the fingers
  for (const [x, y] of [
    [15, 9],
    [20, 7.5],
    [25, 9],
  ]) {
    p.line([pt(x, y), pt(x, 13.2)], O, 0.9);
  }
  p.line([pt(14, 21.5), pt(18.5, 19.8)], shade(MINT, -0.28), 0.9);
  p.line([pt(24.5, 21.5), pt(27.5, 19.8)], shade(MINT, -0.28), 0.9);
  p.line([pt(11, 14.8), pt(10.8, 10.2)], 'rgba(255,255,255,0.75)', 1.2);
}

function iconLadybugButton(p: Pen): void {
  groundShadow(p, 11, 35);
  // the ladybug's head peeks over the top of the dome
  p.ellipse(20, 6.5, 4.6, 3, INK, null);
  p.circle(18.4, 6.2, 0.8, CHALK, null);
  p.circle(21.6, 6.2, 0.8, CHALK, null);
  p.circle(20, 21, 13, radial(p, 20, 21, 13, '#ff9b92', '#e4574f'), O);
  p.line([pt(20, 9.5), pt(20, 33)], INK, 1.3);
  for (const [x, y] of [
    [13.5, 16.5],
    [26.5, 16.5],
    [12.5, 25.5],
    [27.5, 25.5],
  ]) {
    p.circle(x, y, 2.3, INK, null);
  }
  glint(p, 15, 13.5, 3.4, 1.8, -0.7);
}

function iconTinyTrowel(p: Pen): void {
  groundShadow(p, 10);
  thick(p, [pt(19.5, 20), pt(29, 9.5)], 4.2, WOOD);
  thick(p, [pt(25.2, 14.8), pt(27.6, 12.4)], 4.8, PINK);
  p.circle(29.6, 8.9, 2.6, WOOD, O);
  p.circle(20.2, 19.6, 2.6, SILVER_D, O);
  path(
    p,
    (c) => {
      c.moveTo(19.5, 18.5);
      c.lineTo(13, 25.2);
      c.quadraticCurveTo(7.5, 31, 12.2, 34.6);
      c.quadraticCurveTo(18.5, 38, 23, 31.6);
      c.quadraticCurveTo(25.2, 26, 19.5, 18.5);
      c.closePath();
    },
    lin(p, 8, 20, 24, 36, [
      [0, SILVER_L],
      [0.55, SILVER],
      [1, SILVER_D],
    ]),
    O,
    1.2,
  );
  p.line([pt(14.5, 29), pt(18.8, 23.4)], 'rgba(255,255,255,0.8)', 1.2);
  p.circle(9.6, 33.6, 1.2, '#b9825a', null);
  p.circle(7.2, 31, 0.9, '#b9825a', null);
}

function iconSnailShell(p: Pen): void {
  groundShadow(p, 14, 35);
  // the snail's body and one eye stalk
  p.roundRect(5, 27, 27, 7.5, 3.8, '#fbd9c9');
  thick(p, [pt(9.5, 27.5), pt(6.6, 19.8)], 1.8, '#fbd9c9');
  p.circle(6.4, 18.9, 2.1, CHALK, O);
  p.circle(6.8, 18.9, 0.9, INK, null);
  // the shell with its spiral
  const cx = 21;
  const cy = 20;
  p.circle(cx, cy, 11.6, radial(p, cx, cy, 11.6, '#ffe2cc', PEACH), O);
  const c = p.ctx;
  c.beginPath();
  for (let t = 0; t <= 3.9 * Math.PI; t += 0.1) {
    const r = 0.5 + t * 0.62;
    const x = cx + Math.cos(t + 0.9) * r;
    const y = cy + Math.sin(t + 0.9) * r;
    if (t === 0) c.moveTo(x, y);
    else c.lineTo(x, y);
  }
  c.strokeStyle = TERRA;
  c.lineWidth = 1.1;
  c.stroke();
  glint(p, 25.5, 12.5, 3.2, 1.6, -0.6);
}

// ---------------------------------------------------------------------------
// Golden Fields

function iconStrawHat(p: Pen): void {
  groundShadow(p, 14, 35);
  p.ellipse(20, 25.5, 16.5, 5.5, lin(p, 4, 0, 36, 0, [[0, shade(STRAW, 0.15)], [0.5, STRAW], [1, shade(STRAW, -0.18)]]), O);
  // weave on the brim
  const c = p.ctx;
  c.save();
  c.setLineDash([1.2, 1.6]);
  c.beginPath();
  c.ellipse(20, 25.5, 14.2, 4.1, 0, 0, TAU);
  c.strokeStyle = shade(STRAW, -0.3);
  c.lineWidth = 0.7;
  c.stroke();
  c.restore();
  path(
    p,
    (k) => {
      k.moveTo(12.2, 25.5);
      k.lineTo(12.6, 13);
      k.lineTo(27.4, 13);
      k.lineTo(27.8, 25.5);
      k.quadraticCurveTo(20, 29.5, 12.2, 25.5);
      k.closePath();
    },
    lin(p, 12, 0, 28, 0, [[0, shade(STRAW, -0.02)], [0.5, STRAW], [1, shade(STRAW, -0.2)]]),
    O,
    1.1,
  );
  p.ellipse(20, 13, 7.4, 2.6, shade(STRAW, 0.25), O);
  p.rect(12.4, 19.2, 15.2, 4.4, PINK, O);
  bow(p, 24.8, 21.4, 2.5, ROSE);
  glint(p, 16.5, 16.5, 1.3, 2.6, 0.2);
}

function iconSunflowerSeed(p: Pen): void {
  groundShadow(p, 11);
  const c = p.ctx;
  // a ring of sunflower petals behind the seed
  for (let i = 0; i < 8; i++) {
    c.save();
    c.translate(20, 20);
    c.rotate((i / 8) * TAU);
    p.ellipse(10.8, 0, 4.6, 2.6, GOLD, O, 0);
    c.restore();
  }
  // the seed itself, striped and tilted
  c.save();
  c.translate(20, 20);
  c.rotate(0.55);
  path(
    p,
    (k) => {
      k.moveTo(0, -11);
      k.bezierCurveTo(5.5, -11, 6.5, -3, 5.5, 2);
      k.quadraticCurveTo(4.5, 8.5, 0, 11);
      k.quadraticCurveTo(-4.5, 8.5, -5.5, 2);
      k.bezierCurveTo(-6.5, -3, -5.5, -11, 0, -11);
      k.closePath();
    },
    lin(p, 0, -11, 0, 11, [[0, '#8a6a52'], [1, '#4d3626']]),
    O,
    1.1,
  );
  c.beginPath();
  c.moveTo(-2.6, -8);
  c.quadraticCurveTo(-3.4, 0, -1.6, 7);
  c.moveTo(2.6, -8);
  c.quadraticCurveTo(3.4, 0, 1.6, 7);
  c.strokeStyle = CREAM;
  c.lineWidth = 1.1;
  c.stroke();
  c.restore();
  sparkle(p, 8.5, 9, 2.8, CHALK);
  sparkle(p, 32, 31, 2.2, GOLD_L);
  sparkle(p, 32, 9, 1.8, GOLD_L);
}

function iconCornDoll(p: Pen): void {
  groundShadow(p, 10);
  // husk skirt
  path(
    p,
    (c) => {
      c.moveTo(12, 22);
      c.lineTo(28, 22);
      c.quadraticCurveTo(31.5, 29, 32.5, 35);
      c.quadraticCurveTo(26, 32.4, 20, 35.6);
      c.quadraticCurveTo(14, 32.4, 7.5, 35);
      c.quadraticCurveTo(8.5, 29, 12, 22);
      c.closePath();
    },
    lin(p, 8, 22, 32, 35, [[0, '#fbeeb8'], [1, '#e8c674']]),
    O,
    1.1,
  );
  for (const x of [13.5, 16.8, 20, 23.2, 26.5]) {
    p.line([pt(x, 25), pt(20 + (x - 20) * 1.15, 33)], 'rgba(150,110,50,0.4)', 0.8);
  }
  // arms and waist ribbon
  thick(p, [pt(12.6, 23.5), pt(8.4, 28)], 2.4, '#fbeeb8');
  thick(p, [pt(27.4, 23.5), pt(31.6, 28)], 2.4, '#fbeeb8');
  thick(p, [pt(12.4, 21.8), pt(27.6, 21.8)], 2.6, PINK);
  // head with a little husk tuft
  p.ellipse(20, 14.2, 7.6, 8.8, lin(p, 13, 6, 27, 23, [[0, '#fffbe0'], [1, '#f5daa0']]), O);
  for (const [x, y, tx, ty] of [
    [16.8, 7.4, 14.6, 3.8],
    [20, 6, 20.6, 2.4],
    [23.2, 7.4, 25.4, 3.8],
  ]) {
    p.line([pt(x, y), pt(tx, ty)], '#e4bf6a', 1.5);
  }
  // face
  p.circle(17.4, 14.2, 1, INK, null);
  p.circle(22.6, 14.2, 1, INK, null);
  p.ellipse(15.4, 17.2, 1.7, 1, PINK, null);
  p.ellipse(24.6, 17.2, 1.7, 1, PINK, null);
  path(
    p,
    (c) => c.arc(20, 16.2, 1.7, Math.PI * 0.2, Math.PI * 0.8),
    null,
    INK,
    0.9,
  );
}

function iconHarvestBell(p: Pen): void {
  groundShadow(p, 11);
  // knob, bow and the brass dome
  p.circle(20, 7, 2.3, GOLD, O);
  p.poly([pt(20, 11.5), pt(13.5, 8), pt(14, 15)], PINK, O, 0.9);
  p.poly([pt(20, 11.5), pt(26.5, 8), pt(26, 15)], PINK, O, 0.9);
  p.circle(20, 11.5, 1.8, PINK_D, O);
  path(
    p,
    (c) => {
      c.moveTo(9.5, 28);
      c.bezierCurveTo(9.5, 15, 13.5, 8.5, 20, 8.5);
      c.bezierCurveTo(26.5, 8.5, 30.5, 15, 30.5, 28);
      c.closePath();
    },
    lin(p, 9, 8, 31, 28, [
      [0, GOLD_L],
      [0.45, GOLD],
      [1, GOLD_D],
    ]),
    O,
    1.2,
  );
  p.roundRect(7.5, 26.5, 25, 5, 2.5, shade(GOLD, -0.12));
  p.circle(20, 33, 2.4, GOLD_D, O);
  p.line([pt(14, 16.5), pt(14, 24)], 'rgba(255,255,255,0.7)', 1.6);
  sparkle(p, 31, 13, 2);
}

function iconGoldenSheaf(p: Pen): void {
  groundShadow(p, 12);
  // stalks tied at the bottom, fanning out to golden heads
  for (const [x, top] of [
    [12, 9],
    [16, 6],
    [20, 5.5],
    [24, 6],
    [28, 9],
  ]) {
    const b = pt(20 + (x - 20) * 0.1, 34);
    const ctrl = pt((x + 20) / 2 + (x - 20) * 0.2, (34 + top) / 2 + 2);
    thickCurve(p, b, ctrl, pt(x, top + 3), 1.5, '#f0bd4c');
    p.ellipse(x - 1.4, top + 3.6, 1.5, 2.8, GOLD_L, O, 0.3);
    p.ellipse(x + 1.4, top + 3.6, 1.5, 2.8, GOLD_L, O, -0.3);
    p.ellipse(x, top + 1, 1.5, 2.8, '#fff7cf', O, 0);
  }
  // tie, tails and a bow
  p.poly([pt(18.5, 24.5), pt(15.2, 33), pt(19.4, 31.4)], PINK_D, O, 0.9);
  p.poly([pt(21.5, 24.5), pt(24.8, 33), pt(20.6, 31.4)], PINK_D, O, 0.9);
  p.roundRect(12, 20.5, 16, 5, 2.5, PINK);
  bow(p, 20, 23, 2.6, ROSE);
  sparkle(p, 32, 9, 2.2);
}

// ---------------------------------------------------------------------------
// Berry Basket

function iconGinghamBow(p: Pen): void {
  groundShadow(p, 10);
  const c = p.ctx;
  // tails first, so the knot sits on top of them
  p.poly([pt(18.5, 22), pt(12.5, 35), pt(17, 34.5), pt(19.5, 25)], PINK_D, O, 0.9);
  p.poly([pt(21.5, 22), pt(27.5, 35), pt(23, 34.5), pt(20.5, 25)], PINK_D, O, 0.9);
  // two gingham loops
  const loops = [
    { x: 12.6, y: 19.5, rot: -0.35 },
    { x: 27.4, y: 19.5, rot: 0.35 },
  ];
  for (const l of loops) {
    c.save();
    c.beginPath();
    c.ellipse(l.x, l.y, 9, 6.5, l.rot, 0, TAU);
    c.fillStyle = CREAM;
    c.fill();
    c.clip();
    c.fillStyle = 'rgba(255,118,160,0.6)';
    for (let x = 2; x < 38; x += 6) c.fillRect(x, 8, 3, 24);
    for (let y = 8; y < 32; y += 6) c.fillRect(2, y, 36, 3);
    c.restore();
    c.beginPath();
    c.ellipse(l.x, l.y, 9, 6.5, l.rot, 0, TAU);
    c.strokeStyle = O;
    c.lineWidth = 1.1;
    c.stroke();
  }
  p.roundRect(16.5, 16, 7, 8, 2.5, PINK, O);
  glint(p, 10, 17.5, 1.6, 0.9, -0.3);
}

function iconJamJar(p: Pen): void {
  groundShadow(p, 12);
  p.roundRect(9.5, 13, 21, 22, 5, lin(p, 9.5, 0, 30.5, 0, [[0, shade(JAM, 0.25)], [0.4, JAM], [1, shade(JAM, -0.28)]]));
  // label with a little heart
  p.roundRect(12.5, 21, 15, 10, 2.5, CREAM);
  p.heart(20, 26, 2.6, PINK, PINK_D);
  // gingham cloth cover, scalloped at the bottom
  const c = p.ctx;
  c.save();
  c.beginPath();
  c.ellipse(20, 11, 12.5, 4.5, 0, 0, TAU);
  for (let x = 10.5; x <= 29.5; x += 4.75) {
    c.moveTo(x + 2.4, 14.5);
    c.arc(x, 14.5, 2.4, 0, TAU);
  }
  c.fillStyle = CREAM;
  c.fill();
  c.clip();
  c.fillStyle = 'rgba(255,118,160,0.6)';
  for (let x = 6; x < 34; x += 4.5) c.fillRect(x, 6, 2, 12);
  for (let y = 7; y < 16; y += 4.5) c.fillRect(6, y, 28, 1.8);
  c.restore();
  c.save();
  c.beginPath();
  c.ellipse(20, 11, 12.5, 4.5, 0, 0, TAU);
  for (let x = 10.5; x <= 29.5; x += 4.75) {
    c.moveTo(x + 2.4, 14.5);
    c.arc(x, 14.5, 2.4, 0, TAU);
  }
  c.strokeStyle = O;
  c.lineWidth = 1.1;
  c.stroke();
  c.restore();
  glint(p, 11.5, 24, 1.1, 6.5, 0.05);
}

function iconPieTin(p: Pen): void {
  groundShadow(p, 15, 35);
  // tin thickness, then the rim on top
  p.ellipse(20, 28.5, 16, 6.8, shade(SILVER, -0.3), O);
  p.ellipse(20, 26.5, 16, 6.8, lin(p, 4, 20, 36, 32, [[0, SILVER_L], [0.5, SILVER], [1, SILVER_D]]), O);
  // the pie: a crust side, a golden crust ring and the berry filling
  p.ellipse(20, 28.8, 12.6, 5.2, '#d99a4a', O);
  p.ellipse(20, 26.6, 12.6, 5.2, '#f2bd62', O);
  p.ellipse(20, 26.6, 9.8, 3.9, radial(p, 20, 26.6, 10, '#f08aa8', '#c44d7c'), O);
  // golden lattice strips over the filling
  const c = p.ctx;
  c.save();
  c.beginPath();
  c.ellipse(20, 26.6, 9.8, 3.9, 0, 0, TAU);
  c.clip();
  c.strokeStyle = GOLD_L;
  c.lineWidth = 1.7;
  c.beginPath();
  for (let x = 4; x <= 36; x += 8) {
    c.moveTo(x, 20);
    c.lineTo(x + 10, 34);
    c.moveTo(x + 10, 20);
    c.lineTo(x, 34);
  }
  c.stroke();
  c.restore();
  p.ball(13, 27.5, 1.6, BERRY);
  p.ball(27, 25.5, 1.6, BERRY);
  glint(p, 10.5, 24.5, 2.8, 1.1, -0.2);
}

function iconBerryThimble(p: Pen): void {
  groundShadow(p, 10);
  // dome and body
  path(
    p,
    (c) => {
      c.moveTo(11.5, 28);
      c.lineTo(11.5, 17);
      c.bezierCurveTo(11.5, 7, 28.5, 7, 28.5, 17);
      c.lineTo(28.5, 28);
      c.closePath();
    },
    lin(p, 11, 0, 29, 0, [[0, '#cfe3ff'], [0.5, BLUE], [1, '#6fa3e6']]),
    O,
    1.2,
  );
  // rows of dimples
  for (const [y, xs] of [
    [13, [17, 20, 23]],
    [18.5, [14.5, 17.5, 20.5, 23.5, 26.5]],
  ] as [number, number[]][]) {
    for (const x of xs) p.circle(x, y, 0.9, shade(BLUE, -0.32), null);
  }
  p.roundRect(9.5, 24.5, 21, 5.5, 2.5, shade(BLUE, -0.14));
  // a blueberry resting on the dome
  p.ball(30, 9.5, 3.8, BERRY);
  p.line([pt(29, 6.2), pt(31.2, 5.4)], LEAF, 1.2);
  glint(p, 16, 14, 1.4, 3.2, 0.2);
}

function iconPicnicNapkin(p: Pen): void {
  groundShadow(p, 11);
  const c = p.ctx;
  c.save();
  c.translate(20, 20);
  c.rotate(0.2);
  c.translate(-20, -20);
  p.roundRect(8, 9, 24, 24, 1.5, CREAM);
  // gingham check, clipped to the napkin
  c.save();
  c.beginPath();
  c.rect(8, 9, 24, 24);
  c.clip();
  c.fillStyle = MINT;
  for (let i = 0; i < 6; i++) {
    for (let j = 0; j < 6; j++) {
      if ((i + j) % 2 === 0) c.fillRect(8 + i * 4, 9 + j * 4, 4, 4);
    }
  }
  c.restore();
  p.roundRect(8, 9, 24, 24, 1.5, null, O);
  // a dashed stitch line and a folded corner
  c.save();
  c.setLineDash([1.2, 1.2]);
  c.strokeStyle = PINK_D;
  c.lineWidth = 0.7;
  c.strokeRect(10.6, 11.6, 18.8, 18.8);
  c.restore();
  p.poly([pt(24, 9), pt(32, 9), pt(32, 17)], '#fffdf6', O, 1);
  c.restore();
  sparkle(p, 33, 31, 2);
}

// ---------------------------------------------------------------------------
// Barnyard Treasures

function iconWoolPom(p: Pen): void {
  groundShadow(p, 11);
  // a loose strand of yarn trailing off the bottom right
  thickCurve(p, pt(24, 28), pt(35, 25), pt(31.5, 36), 1.6, LILAC_D);
  // fluffy puffs around a soft centre
  const rand = rng('wool-pom');
  const puffs: { x: number; y: number; r: number }[] = [];
  for (let i = 0; i < 13; i++) {
    const a = (i / 13) * TAU + rand() * 0.3;
    const d = 8.2 + rand() * 1.4;
    puffs.push({ x: 20 + Math.cos(a) * d, y: 19 + Math.sin(a) * d, r: 3.3 + rand() * 0.8 });
  }
  for (const q of puffs) p.circle(q.x, q.y, q.r + 0.9, O, null);
  for (const q of puffs) p.circle(q.x, q.y, q.r, shade(LILAC, 0.06), null);
  p.circle(20, 19, 8.8, radial(p, 20, 19, 8.8, '#f1ebff', LILAC), null);
  // wraps of yarn
  const c = p.ctx;
  for (let k = 0; k < 4; k++) {
    c.beginPath();
    c.arc(20, 19, 3 + k * 1.6, Math.PI * (0.2 + k * 0.1), Math.PI * (1.2 + k * 0.1));
    c.strokeStyle = shade(LILAC, -0.22);
    c.lineWidth = 0.7;
    c.stroke();
  }
  glint(p, 15.5, 13.5, 2.4, 1.2, -0.6);
}

function iconFeatherQuill(p: Pen): void {
  groundShadow(p, 9);
  const c = p.ctx;
  c.save();
  c.translate(20, 20);
  c.rotate(-0.72);
  // the vane
  c.beginPath();
  c.moveTo(-13, 0);
  c.bezierCurveTo(-7, -10, 7, -10.5, 16.5, -0.5);
  c.bezierCurveTo(7, 3.5, -6, 4.5, -13, 0);
  c.closePath();
  c.fillStyle = lin(p, -13, -10, 16, 4, [[0, CHALK], [0.6, '#e9e1ff'], [1, LILAC]]);
  c.fill();
  c.strokeStyle = O;
  c.lineWidth = 1.1;
  c.stroke();
  // barbs
  c.beginPath();
  for (let x = -9; x <= 12; x += 3.2) {
    c.moveTo(x, 0);
    c.lineTo(x + 4, -5.5);
    c.moveTo(x, 0);
    c.lineTo(x + 4, 3.5);
  }
  c.strokeStyle = 'rgba(155,134,214,0.6)';
  c.lineWidth = 0.6;
  c.stroke();
  // the spine and the nib
  p.line([pt(-19, 1), pt(16, -0.5)], O, 2.4);
  p.line([pt(-19, 1), pt(16, -0.5)], CHALK, 1);
  p.poly([pt(-13, -1.4), pt(-22.5, 1.8), pt(-13, 1.2)], BUTTER, O, 0.9);
  c.restore();
  sparkle(p, 34, 31, 2.2);
}

function iconCowBell(p: Pen): void {
  groundShadow(p, 12);
  // a rounded bell: narrow neck, full shoulders, a flared mouth
  path(
    p,
    (c) => {
      c.moveTo(17, 11);
      c.bezierCurveTo(16, 17, 9.5, 18.5, 9.2, 25);
      c.bezierCurveTo(9, 29.5, 8, 31, 8.6, 32.6);
      c.quadraticCurveTo(20, 35.6, 31.4, 32.6);
      c.bezierCurveTo(32, 31, 31, 29.5, 30.8, 25);
      c.bezierCurveTo(30.5, 18.5, 24, 17, 23, 11);
      c.closePath();
    },
    lin(p, 9, 0, 31, 0, [
      [0, '#ffffff'],
      [0.4, SILVER],
      [1, SILVER_D],
    ]),
    O,
    1.2,
  );
  // rosy collar strap with white dots
  p.roundRect(9.5, 4.5, 21, 6.2, 3, ROSE);
  for (let x = 12.5; x <= 28; x += 3.6) p.circle(x, 7.6, 0.8, CHALK, null);
  // dark mouth of the bell and the clapper
  p.ellipse(20, 32.4, 11.2, 2.2, '#6b7385', O, 0);
  p.circle(20, 34.2, 2, GOLD, O);
  p.circle(14.5, 19, 1.1, SILVER_D, null);
  p.circle(25.5, 19, 1.1, SILVER_D, null);
  glint(p, 13.5, 19, 1.2, 4.2, 0.1);
}

function iconHorseshoe(p: Pen): void {
  groundShadow(p, 13);
  const c = p.ctx;
  const cx = 20;
  const cy = 19;
  const r = 11.5;
  // outlined steel U, then the shiny metal on top
  c.beginPath();
  c.arc(cx, cy, r, 0, Math.PI);
  c.strokeStyle = O;
  c.lineWidth = 8.6;
  c.stroke();
  c.strokeStyle = lin(p, 8, 0, 32, 0, [[0, SILVER_L], [0.5, SILVER], [1, SILVER_D]]);
  c.lineWidth = 5.8;
  c.stroke();
  c.beginPath();
  c.arc(cx, cy, r - 1.4, Math.PI * 0.62, Math.PI * 0.85);
  c.strokeStyle = 'rgba(255,255,255,0.85)';
  c.lineWidth = 1.2;
  c.stroke();
  // nail holes along the bottom
  for (const a of [0.3, 0.5, 0.7]) {
    p.circle(cx + Math.cos(a * Math.PI) * r, cy + Math.sin(a * Math.PI) * r, 0.9, INK, null);
  }
  // a lucky clover tucked in the open end
  for (const [dx, dy] of [
    [-2.2, 0],
    [2.2, 0],
    [0, -2.2],
    [0, 2.2],
  ]) {
    p.circle(20 + dx, 10.8 + dy, 2.1, LEAF_L, O);
  }
  p.circle(20, 10.8, 1.2, LEAF, null);
  sparkle(p, 33, 9, 2.2);
}

function iconGoldenEgg(p: Pen): void {
  groundShadow(p, 10);
  path(
    p,
    (c) => {
      c.moveTo(20, 5);
      c.bezierCurveTo(28.5, 5, 32.5, 15, 32.5, 24);
      c.bezierCurveTo(32.5, 31.5, 27, 35.5, 20, 35.5);
      c.bezierCurveTo(13, 35.5, 7.5, 31.5, 7.5, 24);
      c.bezierCurveTo(7.5, 15, 11.5, 5, 20, 5);
      c.closePath();
    },
    radial(p, 20, 20, 16, GOLD_L, GOLD_D),
    O,
    1.2,
  );
  // a little band of dots round the middle
  path(p, (c) => {
    c.moveTo(9.2, 22);
    c.quadraticCurveTo(20, 26.5, 30.8, 22);
  }, null, GOLD_D, 1.1);
  for (const x of [14, 20, 26]) p.circle(x, 24.3, 1, CHALK, null);
  glint(p, 14.5, 14.5, 2.6, 4.4, 0.3);
  sparkle(p, 33, 9, 2.6);
  sparkle(p, 7, 11, 2, CHALK);
}

// ---------------------------------------------------------------------------
// Orchard Keepsakes

function iconAcornCap(p: Pen): void {
  groundShadow(p, 10);
  thick(p, [pt(20.5, 10), pt(22.5, 4.5)], 2.6, WOOD_DD);
  // the nut
  path(
    p,
    (c) => {
      c.moveTo(11.5, 15);
      c.bezierCurveTo(10, 26, 13, 35, 20, 35);
      c.bezierCurveTo(27, 35, 30, 26, 28.5, 15);
      c.closePath();
    },
    lin(p, 11, 0, 29, 0, [[0, '#f8d49a'], [0.45, '#e4a85f'], [1, '#b8763e']]),
    O,
    1.2,
  );
  // the cap, with a scalloped rim and little dots
  path(
    p,
    (c) => {
      c.moveTo(8.5, 17);
      c.bezierCurveTo(8, 6.5, 32, 6.5, 31.5, 17);
      c.closePath();
    },
    lin(p, 8, 0, 32, 0, [[0, shade(CAP, 0.15)], [0.5, CAP], [1, shade(CAP, -0.25)]]),
    O,
    1.2,
  );
  for (let x = 10.5; x <= 30; x += 4.2) p.circle(x, 16.8, 2.2, shade(CAP, -0.1), O);
  for (const [x, y] of [
    [13, 11],
    [17.5, 9.5],
    [22.5, 9.5],
    [27, 11],
  ]) {
    p.circle(x, y, 0.7, shade(CAP, -0.35), null);
  }
  glint(p, 16.5, 25, 1.7, 3.6, 0.2);
}

function iconPressedLeaf(p: Pen): void {
  groundShadow(p, 11);
  const c = p.ctx;
  c.save();
  c.translate(20, 20);
  c.rotate(-0.12);
  // the paper card with a dashed border and corner tape
  p.roundRect(-13, -14, 26, 28, 2.5, '#fff8ec');
  c.save();
  c.setLineDash([1.4, 1.4]);
  c.strokeStyle = '#e2b98f';
  c.lineWidth = 0.8;
  c.strokeRect(-10, -11, 20, 22);
  c.restore();
  p.rect(-13.6, -10.5, 4.2, 2.4, 'rgba(230,220,200,0.8)', null);
  p.rect(9.4, 8.2, 4.2, 2.4, 'rgba(230,220,200,0.8)', null);
  // the pressed leaf
  c.save();
  c.rotate(0.5);
  thick(p, [pt(-10, 0), pt(-14.5, 3.4)], 1.4, LEAF);
  path(
    p,
    (k) => {
      k.moveTo(-10, 0);
      k.quadraticCurveTo(-2, -9, 10, 0);
      k.quadraticCurveTo(-2, 9, -10, 0);
      k.closePath();
    },
    LEAF_OR,
    O,
    1,
  );
  const vein = shade(LEAF_OR, -0.35);
  p.line([pt(-9, 0), pt(8, 0)], vein, 0.8);
  p.line([pt(-3, 0), pt(0, -4.4)], vein, 0.7);
  p.line([pt(1, 0), pt(4, -3.6)], vein, 0.7);
  p.line([pt(-3, 0), pt(0, 4.4)], vein, 0.7);
  p.line([pt(1, 0), pt(4, 3.6)], vein, 0.7);
  c.restore();
  c.restore();
  sparkle(p, 34, 7, 2);
}

function iconBlossomPin(p: Pen): void {
  groundShadow(p, 8);
  // the two prongs of the hairpin
  thick(p, [pt(17.5, 20), pt(15.5, 35)], 1.9, SILVER_D);
  thick(p, [pt(22.5, 20), pt(24.5, 35)], 1.9, SILVER_D);
  // a five-petal blossom with glossy petals
  p.flower(20, 15, 8.5, PINK, GOLD);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * TAU - Math.PI / 2;
    p.circle(20 + Math.cos(a) * 5.1 - 0.8, 15 + Math.sin(a) * 5.1 - 0.8, 0.9, 'rgba(255,255,255,0.75)', null);
  }
  sparkle(p, 32, 9, 2);
}

function iconBirdsNest(p: Pen): void {
  groundShadow(p, 14, 35);
  const c = p.ctx;
  // the bowl of twigs
  path(
    p,
    (k) => {
      k.moveTo(5.5, 21);
      k.bezierCurveTo(6, 33, 34, 33, 34.5, 21);
      k.closePath();
    },
    lin(p, 5, 0, 35, 0, [[0, '#d9a36a'], [0.5, NEST], [1, NEST_D]]),
    O,
    1.2,
  );
  c.beginPath();
  for (const [x1, y1, x2, y2] of [
    [9, 27, 13, 25],
    [15, 31, 20, 29],
    [24, 30, 29, 27],
    [11, 24, 14, 22],
    [26, 25, 31, 23],
  ]) {
    c.moveTo(x1, y1);
    c.lineTo(x2, y2);
  }
  c.strokeStyle = 'rgba(110,68,36,0.7)';
  c.lineWidth = 0.9;
  c.stroke();
  // the rim, the hollow and two speckled eggs
  p.ellipse(20, 21, 14.5, 5.2, '#b87a4a', O);
  p.ellipse(20, 21.5, 11, 3.4, '#6b4628', null);
  egg(p, 15.5, 19.4, 4, 4.8);
  egg(p, 24.6, 18.8, 3.6, 4.4);
  // the front lip of the nest, across the eggs
  c.beginPath();
  c.ellipse(20, 21.5, 11, 3.4, 0, 0, Math.PI);
  c.strokeStyle = '#b87a4a';
  c.lineWidth = 2.2;
  c.stroke();
  c.beginPath();
  c.ellipse(20, 21.5, 11, 3.4, 0, 0, Math.PI);
  c.strokeStyle = O;
  c.lineWidth = 0.9;
  c.stroke();
}

function iconHoneyDipper(p: Pen): void {
  groundShadow(p, 11);
  // wooden handle
  thick(p, [pt(31, 5), pt(18.5, 19.5)], 4.6, WOOD);
  p.line([pt(29.2, 7.4), pt(21, 17)], 'rgba(255,255,255,0.4)', 1.1);
  // honey pooled on the dipper, with a drip
  p.circle(18.5, 24, 6.6, radial(p, 18.5, 24, 6.6, HONEY_L, HONEY), O);
  p.circle(13.2, 29.5, 2, HONEY, O);
  p.ellipse(15.5, 21.4, 1.9, 1, 'rgba(255,255,255,0.85)', null, -0.5);
  // a honeycomb cell
  p.poly(hexPts(30, 29, 4.8), '#ffd25e', O, 1);
  p.poly(hexPts(30, 29, 2.2), null, shade(GOLD_D, 0.2), 0.8);
}

// ---------------------------------------------------------------------------
// Afternoon Tea

function iconSugarCube(p: Pen): void {
  groundShadow(p, 12);
  p.poly([pt(7, 14), pt(20, 7.5), pt(33, 14), pt(20, 20.5)], '#ffffff', O, 1.1);
  p.poly([pt(7, 14), pt(20, 20.5), pt(20, 34), pt(7, 27.5)], '#dfe7f5', O, 1.1);
  p.poly([pt(20, 20.5), pt(33, 14), pt(33, 27.5), pt(20, 34)], '#c4d1e8', O, 1.1);
  // sugar grains and a little stamped heart
  for (const [x, y] of [
    [10.5, 22],
    [14.5, 26],
    [17, 25],
    [24, 26],
    [29, 21],
    [27.5, 27],
  ]) {
    p.circle(x, y, 0.7, '#9fb3d9', null);
  }
  p.heart(20, 14, 2.2, PINK, PINK_D);
  sparkle(p, 33, 7, 2.6);
}

function iconLaceDoily(p: Pen): void {
  groundShadow(p, 12);
  const c = p.ctx;
  const cx = 20;
  const cy = 20;
  const n = 12;
  // scalloped rim: outline pass, then the fill pass over it
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU;
    p.circle(cx + Math.cos(a) * 12.6, cy + Math.sin(a) * 12.6, 5.1, O, null);
  }
  p.circle(cx, cy, 12.3, O, null);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU;
    p.circle(cx + Math.cos(a) * 12.6, cy + Math.sin(a) * 12.6, 4.2, CHALK, null);
  }
  p.circle(cx, cy, 11.4, CHALK, null);
  // lace: cut-out holes, a ring of stitching
  c.save();
  c.globalCompositeOperation = 'destination-out';
  c.fillStyle = '#000';
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * TAU;
    c.beginPath();
    c.arc(cx + Math.cos(a) * 7, cy + Math.sin(a) * 7, 1.9, 0, TAU);
    c.fill();
  }
  c.beginPath();
  c.arc(cx, cy, 2.6, 0, TAU);
  c.fill();
  c.restore();
  c.save();
  c.setLineDash([1, 1.2]);
  c.beginPath();
  c.arc(cx, cy, 9.4, 0, TAU);
  c.strokeStyle = 'rgba(150,120,90,0.55)';
  c.lineWidth = 0.7;
  c.stroke();
  c.restore();
}

function iconSilverSpoon(p: Pen): void {
  groundShadow(p, 10);
  // handle with a flat, engraved end
  thick(p, [pt(18.5, 20), pt(31, 34)], 3.6, SILVER);
  p.ellipse(31.5, 34.5, 3.2, 2.2, lin(p, 28, 32, 35, 37, [[0, SILVER_L], [1, SILVER_D]]), O, 0.78);
  p.heart(25.5, 27.5, 1.6, null, SILVER_D);
  // the bowl
  p.ellipse(13.5, 13, 7, 9, lin(p, 7, 4, 20, 22, [[0, '#ffffff'], [0.45, SILVER], [1, SILVER_D]]), O, 0.6);
  glint(p, 11, 9.5, 2.2, 1, -0.6);
}

function iconLavenderSachet(p: Pen): void {
  groundShadow(p, 10);
  // a lavender sprig poking out of the top
  thick(p, [pt(20, 15), pt(18.5, 3.5)], 1.4, LEAF);
  for (const [x, y] of [
    [18.6, 9],
    [19.9, 6.4],
    [18.2, 4],
  ]) {
    p.ellipse(x, y, 1.8, 2.6, LAV, O, 0);
  }
  p.ellipse(22.5, 13, 2.6, 1.2, LEAF_L, O, -0.6);
  // the pouch
  path(
    p,
    (c) => {
      c.moveTo(10, 16);
      c.bezierCurveTo(8, 27, 10, 34, 20, 34);
      c.bezierCurveTo(30, 34, 32, 27, 30, 16);
      c.closePath();
    },
    lin(p, 10, 0, 30, 0, [[0, '#dcc8ff'], [0.5, LILAC], [1, LILAC_D]]),
    O,
    1.2,
  );
  p.ellipse(20, 16, 10, 3.2, shade(LILAC, 0.25), O);
  // ribbon tie and its tails
  p.roundRect(15.5, 14.5, 9, 4, 2, PINK);
  p.poly([pt(18, 18), pt(16, 23), pt(19, 21.5)], PINK_D, O, 0.9);
  p.poly([pt(22, 18), pt(24, 23), pt(21, 21.5)], PINK_D, O, 0.9);
  // a dotted pattern
  for (const [x, y] of [
    [14.5, 26],
    [25.5, 26],
    [20, 30],
  ]) {
    p.circle(x, y, 1.1, CHALK, null);
  }
  glint(p, 12.5, 25, 1.1, 4, 0.1);
}

function iconTeacup(p: Pen): void {
  const c = p.ctx;
  // steam wisps
  p.curve(pt(16, 12), pt(12.5, 8), pt(16, 3.5), '#b9a6c9', 1.3);
  p.curve(pt(23, 12), pt(19.5, 8), pt(23, 4), '#b9a6c9', 1.3);
  // the saucer
  p.ellipse(20, 31.5, 16, 5, CHALK, O);
  p.ellipse(20, 31.2, 12.2, 3.5, null, GOLD);
  // the handle, behind the cup
  c.beginPath();
  c.arc(31, 21, 4.6, -Math.PI / 2, Math.PI / 2);
  c.strokeStyle = O;
  c.lineWidth = 4;
  c.stroke();
  c.strokeStyle = CHALK;
  c.lineWidth = 1.7;
  c.stroke();
  // the cup, with a gold band and a rosebud
  path(
    p,
    (k) => {
      k.moveTo(9.5, 16);
      k.lineTo(10.5, 25.5);
      k.bezierCurveTo(10.8, 30, 14, 31, 20, 31);
      k.bezierCurveTo(26, 31, 29.2, 30, 29.5, 25.5);
      k.lineTo(30.5, 16);
      k.closePath();
    },
    lin(p, 9, 0, 31, 0, [[0, '#ffffff'], [0.5, '#fff0f5'], [1, '#f2c9d6']]),
    O,
    1.2,
  );
  p.line([pt(10.2, 20.6), pt(29.8, 20.6)], GOLD, 1.1);
  p.circle(20, 25, 3, ROSE, O);
  p.circle(20, 24.8, 1.2, PINK, null);
  p.ellipse(16.3, 27.8, 2, 1, LEAF, O, 0.6);
  p.ellipse(23.7, 27.8, 2, 1, LEAF, O, -0.6);
  // tea in the cup
  p.ellipse(20, 16, 10.5, 3.4, '#ffffff', O);
  p.ellipse(20, 16.4, 8.6, 2.4, TEA, null);
  p.line([pt(13, 20), pt(13, 27)], 'rgba(255,255,255,0.7)', 1.2);
}

// ---------------------------------------------------------------------------
// Keepsake decorations (sprites)

/** A front-facing arc along a cylinder's side, for bindings and ribbons. */
function frontArc(c: Ctx, x: number, y: number, rx: number, ry: number): void {
  c.beginPath();
  c.ellipse(x, y, rx, ry, 0, 0, Math.PI);
}

/** A wooden chair: four legs, a seat and a backrest on the min or max u side. */
/**
 * A small garden chair on the ground: four legs, a seat and a backrest on the
 * outer side (min or max u), with a heart cut into the backrest's inner face.
 */
function chair(p: Pen, u0: number, v0: number, du: number, dv: number, backAt: 'min' | 'max', color: string): void {
  const bt = 0.06;
  for (const [u, v] of [
    [u0 + 0.02, v0 + 0.02],
    [u0 + du - 0.05, v0 + 0.02],
    [u0 + 0.02, v0 + dv - 0.05],
    [u0 + du - 0.05, v0 + dv - 0.05],
  ]) {
    p.box(u, v, 0.034, 0.034, 9, WOOD_DD, 0);
  }
  p.box(u0, v0, du, dv, 2.4, boxColors(color), 9);
  const backU = backAt === 'min' ? u0 : u0 + du - bt;
  p.box(backU, v0, bt, dv, 15, boxColors(color), 9);
  // the heart cut-out sits on the backrest face that looks toward the viewer
  const h = p.iso(backU + bt, v0 + dv / 2, 17);
  p.heart(h.x, h.y, 2.2, shade(color, 0.5), null);
}

/** A little jam jar standing with its base at (x, y): body, cloth lid and label. */
function jarAt(p: Pen, x: number, y: number, jam: string): void {
  p.roundRect(x - 4, y - 9.5, 8, 9.5, 2.2, lin(p, x - 4, 0, x + 4, 0, [[0, shade(jam, 0.25)], [0.45, jam], [1, shade(jam, -0.25)]]));
  p.roundRect(x - 2.6, y - 6.4, 5.2, 3.4, 1, CREAM, null);
  p.roundRect(x - 4.8, y - 12.6, 9.6, 3.6, 1.4, CREAM);
  for (const dx of [-2.4, 0, 2.4]) p.line([pt(x + dx, y - 12.6), pt(x + dx, y - 9)], PINK, 0.8);
  p.line([pt(x - 2.6, y - 8.4), pt(x - 2.6, y - 2)], 'rgba(255,255,255,0.6)', 1);
}

function ladybugBench(p: Pen): void {
  const { x: cx, y: G } = p.center;
  p.shadow(cx, G, 19, 5.4, 0.24);
  // legs, seat and a tall red backrest
  for (const [u, v] of [
    [0.12, 0.3],
    [0.8, 0.3],
    [0.12, 0.62],
    [0.8, 0.62],
  ]) {
    p.box(u, v, 0.08, 0.08, 10, WOOD_DD, 0);
  }
  p.box(0.06, 0.28, 0.88, 0.44, 3, boxColors(RED), 10);
  for (const u of [0.12, 0.8]) p.box(u, 0.2, 0.08, 0.08, 16, boxColors(RED), 13);
  p.box(0.06, 0.2, 0.88, 0.09, 13, boxColors(RED), 13);
  // a black wing line and seven-spot style dots on the backrest
  const f = 0.29;
  p.line([p.iso(0.5, f, 14), p.iso(0.5, f, 25)], INK, 1);
  for (const [u, z] of [
    [0.24, 21.5],
    [0.4, 16.5],
    [0.62, 21.5],
    [0.78, 16.5],
  ]) {
    const s = p.iso(u, f, z);
    p.circle(s.x, s.y, 2, INK, null);
  }
  // the ladybug's head, with two antennae curling up
  const h = p.iso(0.5, 0.245, 26);
  p.ellipse(h.x, h.y - 1, 4.4, 2.8, INK, null);
  p.circle(h.x - 1.9, h.y - 1.6, 0.8, CHALK, null);
  p.circle(h.x + 1.9, h.y - 1.6, 0.8, CHALK, null);
  p.curve({ x: h.x - 2, y: h.y - 3 }, { x: h.x - 4.5, y: h.y - 6 }, { x: h.x - 7, y: h.y - 10 }, INK, 1);
  p.circle(h.x - 7, h.y - 10, 1.1, INK, null);
  p.curve({ x: h.x + 2, y: h.y - 3 }, { x: h.x + 4.5, y: h.y - 6 }, { x: h.x + 7, y: h.y - 10 }, INK, 1);
  p.circle(h.x + 7, h.y - 10, 1.1, INK, null);
}

function goldenSheafStack(p: Pen): void {
  const { x: cx, y: G } = p.center;
  const c = p.ctx;
  p.shadow(cx, G, 17, 5, 0.24);
  // the bottom bale, with binding strings and a pink ribbon
  p.cylinder(cx, G, 14, 12, '#f3c24f');
  for (const z of [2.5, 9]) {
    frontArc(c, cx, G - z, 14, 7);
    c.strokeStyle = shade('#f3c24f', -0.4);
    c.lineWidth = 0.9;
    c.stroke();
  }
  frontArc(c, cx, G - 6, 14, 7);
  c.strokeStyle = O;
  c.lineWidth = 4;
  c.stroke();
  frontArc(c, cx, G - 6, 14, 7);
  c.strokeStyle = PINK;
  c.lineWidth = 2;
  c.stroke();
  // the smaller top bale
  p.cylinder(cx, G - 11, 11, 10, '#ffd978');
  for (const z of [2.5, 6.5]) {
    frontArc(c, cx, G - 11 - z, 11, 5.5);
    c.strokeStyle = shade('#ffd978', -0.4);
    c.lineWidth = 0.9;
    c.stroke();
  }
  // wheat heads poking out of the top
  for (const [dx, rise] of [
    [-8, 30],
    [-4, 37],
    [0, 40],
    [4, 37],
    [8, 30],
  ]) {
    const base = pt(cx + dx * 0.3, G - 18);
    const tip = pt(cx + dx, G - rise);
    thick(p, [base, tip], 1.5, '#f0b84a');
    p.ellipse(tip.x - 1.2, tip.y + 2.6, 1.6, 2.9, '#ffe58a', O, 0.35);
    p.ellipse(tip.x + 1.2, tip.y + 2.6, 1.6, 2.9, '#ffe58a', O, -0.35);
    p.ellipse(tip.x, tip.y - 0.4, 1.6, 3, '#fff1b0', O, 0);
  }
  bow(p, cx, G - 14, 2.6, PINK);
}

function jamStand(p: Pen): void {
  const { x: cx, y: G } = p.center;
  p.shadow(cx, G, 17, 5, 0.24);
  // a plank stand
  p.box(0.1, 0.16, 0.8, 0.68, 13, boxColors(WOOD_L));
  for (const z of [4, 8.5]) p.line([p.iso(0.1, 0.84, z), p.iso(0.9, 0.84, z)], shade(WOOD, -0.3), 0.9);
  // the jars on top, back to front
  for (const [u, v, jam] of [
    [0.24, 0.7, '#e8506f'],
    [0.5, 0.5, '#c9466e'],
    [0.76, 0.3, '#f0708a'],
  ] as [number, number, string][]) {
    const b = p.iso(u, v, 13);
    jarAt(p, b.x, b.y, jam);
  }
  // a little hanging sign on the front
  const s = p.iso(0.5, 0.84, 6);
  p.line([pt(s.x - 4, s.y - 4.5), pt(s.x - 4, s.y - 6.5)], O, 1);
  p.line([pt(s.x + 4, s.y - 4.5), pt(s.x + 4, s.y - 6.5)], O, 1);
  p.roundRect(s.x - 7, s.y - 4.5, 14, 9, 1.8, CREAM);
  p.text('JAM', s.x, s.y, 6, JAM);
}

function cowbellGate(p: Pen): void {
  const { x: cx, y: G } = p.center;
  p.shadow(cx, G, 20, 6, 0.24);
  // pickets, leaving the middle clear for the bell
  for (const u of [0.16, 0.3, 0.42, 0.58, 0.7, 0.84]) p.box(u, 0.46, 0.06, 0.08, 22, boxColors(CREAM), 0);
  // pink rails
  p.box(0.04, 0.46, 0.92, 0.08, 4, boxColors(PINK), 17);
  p.box(0.04, 0.46, 0.92, 0.08, 4, boxColors(PINK), 5);
  // posts with ball caps
  for (const u of [0.04, 0.9]) {
    p.box(u, 0.44, 0.1, 0.12, 30, boxColors(CREAM), 0);
    const t = p.iso(u + 0.05, 0.5, 30);
    p.ball(t.x, t.y - 2, 2.4, PINK);
  }
  // a pink bow on the top rail with the cow bell hanging from it
  const top = p.iso(0.5, 0.5, 17);
  bow(p, top.x, top.y + 0.5, 2.2, ROSE);
  path(
    p,
    (c) => bellPath(c, top.x, top.y + 4, 12, 12),
    lin(p, top.x - 6, 0, top.x + 6, 0, [[0, '#fff3b8'], [0.5, GOLD], [1, GOLD_D]]),
    O,
    1.1,
  );
  p.circle(top.x, top.y + 18, 1.8, GOLD_D, O);
  // flowers at the foot of the gate
  for (const [u, v, col] of [
    [0.1, 0.78, PINK],
    [0.26, 0.94, BUTTER],
    [0.74, 0.94, LILAC],
    [0.9, 0.78, PINK_L],
  ] as [number, number, string][]) {
    const f = p.iso(u, v, 0);
    p.foliage(f.x, f.y - 3, 4, LEAF, `gate${u}`, 5);
    p.flower(f.x, f.y - 6, 3.2, col);
  }
}

function orchardBirdhouse(p: Pen): void {
  const { x: cx, y: G } = p.center;
  const c = p.ctx;
  p.shadow(cx, G, 12, 4, 0.24);
  // the pole
  p.cylinder(cx, G, 2.4, 30, '#b8794a');
  // the apple crate: a box with horizontal slats on both visible faces
  p.box(0.2, 0.2, 0.6, 0.6, 20, boxColors(WOOD_L), 30);
  const slat = shade(WOOD, -0.35);
  for (const z of [34, 39, 44, 49]) {
    p.line([p.iso(0.2, 0.8, z), p.iso(0.8, 0.8, z)], slat, 1);
    p.line([p.iso(0.8, 0.2, z), p.iso(0.8, 0.8, z)], slat, 1);
  }
  // a cute apple stamped on the front, above the doorway
  const a = p.iso(0.5, 0.8, 44.5);
  p.circle(a.x, a.y, 4, '#ff7f86', O);
  p.ellipse(a.x - 1.2, a.y - 2.6, 1.2, 0.6, 'rgba(255,255,255,0.7)', null, -0.4);
  p.line([pt(a.x, a.y - 4), pt(a.x + 0.8, a.y - 6)], WOOD_DD, 1);
  p.ellipse(a.x + 2, a.y - 5.4, 2, 1, LEAF, O, -0.4);
  // the round doorway, with a bird's face peeking out of it
  const hole = p.iso(0.5, 0.8, 37);
  p.ellipse(hole.x, hole.y, 5.6, 5.1, '#4a3426', O, 0);
  c.save();
  c.beginPath();
  c.ellipse(hole.x, hole.y, 5.6, 5.1, 0, 0, TAU);
  c.clip();
  // the bird's head, with a cream face patch, big eyes and rosy cheeks
  p.circle(hole.x, hole.y + 1.4, 4.4, '#9fd3f7', O);
  p.ellipse(hole.x + 0.6, hole.y + 2.8, 2.8, 1.8, CREAM, null);
  p.circle(hole.x - 1.7, hole.y - 0.6, 1.2, INK, null);
  p.circle(hole.x - 1.2, hole.y - 1, 0.45, CHALK, null);
  p.ellipse(hole.x + 0.9, hole.y + 1.2, 1.1, 0.7, PINK, null);
  c.restore();
  // the beak, poking out of the doorway
  p.poly([pt(hole.x + 3.8, hole.y + 0.6), pt(hole.x + 6.6, hole.y + 2), pt(hole.x + 3.8, hole.y + 3.2)], TERRA, O, 0.8);
  p.ellipse(hole.x, hole.y, 5.6, 5.1, null, O, 0);
  // a little perch peg under the door
  thick(p, [p.iso(0.5, 0.8, 30), p.iso(0.5, 1.02, 30)], 1.8, WOOD_DD);
  // a proportionate pitched roof, with a leafy twig and an apple on its slope
  p.gableRoof(0.2, 0.2, 0.6, 0.6, 50, 10, ROSE, WOOD_L, 0.04);
  const t0 = p.iso(0.6, 0.7, 54);
  const t1 = pt(t0.x + 6, t0.y - 7);
  thick(p, [t0, t1], 1.4, '#8c6a3f');
  p.ellipse(t0.x + 2.5, t0.y - 3.5, 2.6, 1.2, LEAF, O, -0.9);
  p.ellipse(t1.x - 1.2, t1.y + 0.8, 2.4, 1.1, LEAF_L, O, 0.6);
  p.circle(t1.x + 0.4, t1.y + 2.8, 2.6, '#ff7f86', O);
  p.ellipse(t1.x + 0.2, t1.y + 0.2, 0.9, 0.5, 'rgba(255,255,255,0.7)', null, -0.5);
}

function gardenTeaTable(p: Pen): void {
  const { x: cx, y: G } = p.center;
  const c = p.ctx;
  // a rug under the set, a soft shadow, and flower tufts around the edge
  p.shadow(cx, G, 40, 14, 0.2);
  p.ellipse(cx, G, 34, 17, '#fbe3ec', O);
  c.save();
  c.setLineDash([2, 2]);
  c.beginPath();
  c.ellipse(cx, G, 27, 13.5, 0, 0, TAU);
  c.strokeStyle = PINK_D;
  c.lineWidth = 0.8;
  c.stroke();
  c.restore();
  for (const [dx, dy, col] of [
    [-30, 7, PINK],
    [30, 6, BUTTER],
    [3, 13, LILAC],
  ] as [number, number, string][]) {
    p.foliage(cx + dx, G + dy - 2, 3.4, LEAF, `tuft${dx}`, 5);
    p.flower(cx + dx, G + dy - 4, 2.6, col);
  }
  // the first chair, tucked in at the back-left of the table
  chair(p, 0.2, 0.82, 0.3, 0.34, 'min', BUTTER);
  // foot, pedestal and the lace cloth
  p.ellipse(cx, G, 9, 4.2, WOOD, O);
  p.cylinder(cx, G - 1, 2.6, 13, WOOD_DD);
  p.cylinder(cx, G - 12, 21, 12, '#fff3f7');
  for (let i = 0; i <= 12; i++) {
    const a = (i / 12) * Math.PI;
    p.circle(cx + Math.cos(a) * 21, G - 12 + Math.sin(a) * 10.5, 2.2, CHALK, O);
  }
  p.ellipse(cx, G - 24, 21, 10.5, '#fffafc', O);
  c.save();
  c.setLineDash([2, 2]);
  c.beginPath();
  c.ellipse(cx, G - 24, 16.5, 8.2, 0, 0, TAU);
  c.strokeStyle = PINK_D;
  c.lineWidth = 0.8;
  c.stroke();
  c.restore();
  // the tea set on top
  const tx = cx - 6;
  const ty = G - 25;
  c.beginPath();
  c.moveTo(tx - 4.5, ty - 8.5);
  c.quadraticCurveTo(tx - 9.5, ty - 5, tx - 4.5, ty - 1.5);
  c.strokeStyle = O;
  c.lineWidth = 3.2;
  c.stroke();
  c.strokeStyle = PINK;
  c.lineWidth = 1.4;
  c.stroke();
  p.ball(tx, ty - 5.5, 5.2, PINK);
  thick(p, [pt(tx + 3.8, ty - 4), pt(tx + 8.2, ty - 9.5)], 2, PINK);
  p.ellipse(tx, ty - 10.6, 2.6, 1.1, PINK_D, O);
  p.circle(tx, ty - 12.3, 1, GOLD, O);
  // a cake on a plate, with a cherry
  const kx = cx + 6.5;
  const ky = G - 22;
  p.ellipse(kx, ky, 6, 2.8, CHALK, O);
  p.cylinder(kx, ky - 0.6, 4, 4.4, '#ffe2a6');
  p.ellipse(kx, ky - 5, 4, 1.9, PINK_L, O);
  p.ball(kx, ky - 6.6, 1.2, '#e8506f');
  // two cups on saucers
  for (const [sx, sy, col] of [
    [cx - 13, G - 21, MINT],
    [cx + 13, G - 26, LILAC],
  ] as [number, number, string][]) {
    p.ellipse(sx, sy, 4.6, 2.1, CHALK, O);
    p.cylinder(sx, sy - 0.4, 3.1, 4.6, col);
  }
  // the second chair, tucked in at the front-right, facing the table
  chair(p, 1.5, 0.84, 0.3, 0.34, 'max', MINT);
}

// ---------------------------------------------------------------------------
// Exports

export const sprites: SpriteSpec[] = [
  { key: 'deco:ladybug_bench', fw: 1, fh: 1, height: 46, paint: ladybugBench },
  { key: 'deco:golden_sheaf_stack', fw: 1, fh: 1, height: 48, paint: goldenSheafStack },
  { key: 'deco:jam_stand', fw: 1, fh: 1, height: 40, paint: jamStand },
  { key: 'deco:cowbell_gate', fw: 1, fh: 1, height: 40, paint: cowbellGate },
  { key: 'deco:orchard_birdhouse', fw: 1, fh: 1, height: 60, paint: orchardBirdhouse },
  { key: 'deco:garden_tea_table', fw: 2, fh: 2, height: 48, paint: gardenTeaTable },
];

export const icons: IconSpec[] = [
  // Garden Party
  { key: 'icon:col_seed_packet', paint: iconSeedPacket },
  { key: 'icon:col_garden_glove', paint: iconGardenGlove },
  { key: 'icon:col_ladybug_button', paint: iconLadybugButton },
  { key: 'icon:col_tiny_trowel', paint: iconTinyTrowel },
  { key: 'icon:col_snail_shell', paint: iconSnailShell },
  // Golden Fields
  { key: 'icon:col_straw_hat', paint: iconStrawHat },
  { key: 'icon:col_sunflower_seed', paint: iconSunflowerSeed },
  { key: 'icon:col_corn_doll', paint: iconCornDoll },
  { key: 'icon:col_harvest_bell', paint: iconHarvestBell },
  { key: 'icon:col_golden_sheaf', paint: iconGoldenSheaf },
  // Berry Basket
  { key: 'icon:col_gingham_bow', paint: iconGinghamBow },
  { key: 'icon:col_jam_jar', paint: iconJamJar },
  { key: 'icon:col_pie_tin', paint: iconPieTin },
  { key: 'icon:col_berry_thimble', paint: iconBerryThimble },
  { key: 'icon:col_picnic_napkin', paint: iconPicnicNapkin },
  // Barnyard Treasures
  { key: 'icon:col_wool_pom', paint: iconWoolPom },
  { key: 'icon:col_feather_quill', paint: iconFeatherQuill },
  { key: 'icon:col_cow_bell', paint: iconCowBell },
  { key: 'icon:col_horseshoe', paint: iconHorseshoe },
  { key: 'icon:col_golden_egg', paint: iconGoldenEgg },
  // Orchard Keepsakes
  { key: 'icon:col_acorn_cap', paint: iconAcornCap },
  { key: 'icon:col_pressed_leaf', paint: iconPressedLeaf },
  { key: 'icon:col_blossom_pin', paint: iconBlossomPin },
  { key: 'icon:col_birds_nest', paint: iconBirdsNest },
  { key: 'icon:col_honey_dipper', paint: iconHoneyDipper },
  // Afternoon Tea
  { key: 'icon:col_sugar_cube', paint: iconSugarCube },
  { key: 'icon:col_lace_doily', paint: iconLaceDoily },
  { key: 'icon:col_silver_spoon', paint: iconSilverSpoon },
  { key: 'icon:col_lavender_sachet', paint: iconLavenderSachet },
  { key: 'icon:col_teacup', paint: iconTeacup },
];
