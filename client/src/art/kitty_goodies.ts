// Kitty Corner goodies: the cosy things cats sit, lie and play on or in, plus
// the little food, paw and purr icons that go with them. Every goodie in
// GOODIE_LIST gets a `deco:<id>` sprite. Goodies are low (a cat sits on them),
// except the scratching post and the castle.
import { type IconSpec, type Pen, type Pt, type SpriteSpec, OUTLINE, rgba, shade } from './kit';
import { GOODIE_LIST } from '@farm/shared';

const O = OUTLINE;
const TAU = Math.PI * 2;

const PINK = '#ffb3cf';
const PINK_D = '#e77fa6';
const PINK_L = '#ffdbe8';
const ROSE = '#d9557f';
const LILAC = '#c9b8f5';
const LILAC_D = '#9b86d6';
const MINT = '#a8e6cf';
const BUTTER = '#ffe49a';
const PEACH = '#ffc49a';
const CREAM = '#fff4e4';
const CARD = '#e3b27c';
const KRAFT = '#d7a46a';
const WOOD = '#c98b53';
const SISAL = '#ead29c';
const CARPET = '#c7b5ef';
const BLANKET = '#f08c94';
const GOLD = '#f4c24a';
const GRAY = '#b9bec7';
const ORANGE = '#f7974a';
const LEAF = '#6cbf55';
const FISH = '#9fd8f0';
const DARK = '#3b2a22';

type Painter = (p: Pen) => void;
type Fill = string | CanvasGradient | null;

// ---------------------------------------------------------------------------
// Helpers

/** Fill and/or stroke a free-form path built by `build`. */
function path(p: Pen, fill: Fill, stroke: string | null, build: (c: CanvasRenderingContext2D) => void, w = 1): void {
  const c = p.ctx;
  c.beginPath();
  build(c);
  if (fill) {
    c.fillStyle = fill;
    c.fill();
  }
  if (stroke) {
    c.strokeStyle = stroke;
    c.lineWidth = w;
    c.stroke();
  }
}

/** Run `fn` with drawing clipped to the path `clip` builds. */
function clipped(p: Pen, clip: (c: CanvasRenderingContext2D) => void, fn: () => void): void {
  const c = p.ctx;
  c.save();
  c.beginPath();
  clip(c);
  c.clip();
  fn();
  c.restore();
}

function hgrad(p: Pen, x0: number, x1: number, stops: [number, string][]): CanvasGradient {
  const g = p.ctx.createLinearGradient(x0, 0, x1, 0);
  for (const [t, col] of stops) g.addColorStop(t, col);
  return g;
}

function rgrad(p: Pen, x: number, y: number, r: number, inner: string, outer: string): CanvasGradient {
  const g = p.ctx.createRadialGradient(x - r * 0.3, y - r * 0.35, r * 0.1, x, y, r);
  g.addColorStop(0, inner);
  g.addColorStop(1, outer);
  return g;
}

/** An outlined thick stroke (rods, handles, strands). */
function thick(p: Pen, pts: Pt[], w: number, color: string): void {
  p.line(pts, O, w + 1.6);
  p.line(pts, color, w);
}

/** A tube lying along a→b, radius r, outlined. */
function capsule(p: Pen, a: Pt, b: Pt, r: number, color: string): void {
  p.line([a, b], O, r * 2 + 2.4);
  p.line([a, b], color, r * 2);
}

/** A soft, puffed-up cushion lying on the ground centred at (x, y). */
function puffy(p: Pen, x: number, y: number, rx: number, ht: number, color: string): void {
  const ry = rx * 0.5;
  const yt = y - ht;
  const tx = rx * 0.86;
  path(
    p,
    hgrad(p, x - rx, x + rx, [
      [0, shade(color, -0.18)],
      [0.3, shade(color, 0.22)],
      [0.62, color],
      [1, shade(color, -0.3)],
    ]),
    O,
    (c) => {
      c.moveTo(x - rx, y);
      c.bezierCurveTo(x - rx * 1.07, y - ht * 0.5, x - rx * 1.02, yt + ht * 0.2, x - tx, yt);
      c.ellipse(x, yt, tx, ry * 0.86, 0, Math.PI, 0, false);
      c.bezierCurveTo(x + rx * 1.02, yt + ht * 0.2, x + rx * 1.07, y - ht * 0.5, x + rx, y);
      c.ellipse(x, y, rx, ry, 0, 0, Math.PI, false);
      c.closePath();
    },
    1.1,
  );
  p.ellipse(x - rx * 0.3, yt + ry * 0.3, rx * 0.3, ry * 0.28, 'rgba(255,255,255,0.45)', null, -0.2);
}

/** A dashed stitch ring on a flat surface. */
function stitchRing(p: Pen, x: number, y: number, rx: number, ry: number, color: string): void {
  const c = p.ctx;
  c.save();
  c.setLineDash([2, 2]);
  c.beginPath();
  c.ellipse(x, y, rx, ry, 0, 0, TAU);
  c.strokeStyle = color;
  c.lineWidth = 0.8;
  c.stroke();
  c.restore();
}

/** A single feather whose quill starts at (x, y) and points along `ang`. */
function feather(p: Pen, x: number, y: number, len: number, ang: number, color: string): void {
  p.save();
  const c = p.ctx;
  c.translate(x, y);
  c.rotate(ang);
  c.beginPath();
  c.moveTo(0, 0);
  c.quadraticCurveTo(len * 0.55, -len * 0.24, len, 0);
  c.quadraticCurveTo(len * 0.55, len * 0.24, 0, 0);
  c.closePath();
  c.fillStyle = color;
  c.fill();
  c.strokeStyle = O;
  c.lineWidth = 0.8;
  c.stroke();
  c.beginPath();
  c.moveTo(0, 0);
  c.lineTo(len * 0.9, 0);
  c.strokeStyle = 'rgba(255,255,255,0.7)';
  c.lineWidth = 0.6;
  c.stroke();
  p.restore();
}

/** Little four-toe paw print centred on (x, y), `s` px across the pad. */
function pawPrint(p: Pen, x: number, y: number, s: number, color: string, stroke: string | null = null): void {
  p.ellipse(x, y, s, s * 0.8, color, stroke);
  const toes: [number, number, number][] = [
    [-s * 1.05, -s * 1.7, -0.35],
    [-s * 0.38, -s * 2.15, -0.1],
    [s * 0.38, -s * 2.15, 0.1],
    [s * 1.05, -s * 1.7, 0.35],
  ];
  for (const [dx, dy, rot] of toes) p.ellipse(x + dx, y + dy, s * 0.4, s * 0.5, color, stroke, rot);
}

/** Points on a wall: 'L' is the left face (v fixed at `edge`), 'R' the right (u fixed). */
function wallPt(p: Pen, side: 'L' | 'R', a: number, z: number, edge: number): Pt {
  return side === 'L' ? p.iso(a, edge, z) : p.iso(edge, a, z);
}

// ---------------------------------------------------------------------------
// Goodies (1x1 unless noted). Each painter draws around the footprint centre.

function kittyBowl(p: Pen): void {
  const { x: cx, y: cy } = p.center;
  p.shadow(cx, cy, 19, 9.5, 0.25);
  const t = cy - 19;
  const rx = 17;
  const ry = 8;
  p.ellipse(cx, cy - 0.5, 9, 4, shade(PINK_D, -0.15));
  // wall: from the rim down to the foot, front edge follows the lower half of the rim
  path(
    p,
    hgrad(p, cx - rx, cx + rx, [
      [0, shade(PINK, -0.15)],
      [0.3, shade(PINK, 0.3)],
      [0.65, PINK],
      [1, PINK_D],
    ]),
    O,
    (c) => {
      c.moveTo(cx - rx, t);
      c.bezierCurveTo(cx - rx + 1, t + 9, cx - 9, cy - 1, cx - 5, cy - 1);
      c.lineTo(cx + 5, cy - 1);
      c.bezierCurveTo(cx + 9, cy - 1, cx + rx - 1, t + 9, cx + rx, t);
      c.ellipse(cx, t, rx, ry, 0, 0, Math.PI, false);
      c.closePath();
    },
    1.1,
  );
  // rim and empty interior
  p.ellipse(cx, t, rx, ry, PINK_L);
  p.ellipse(cx, t + 0.8, rx - 3.5, ry - 2.6, shade(PINK, -0.22));
  p.ellipse(cx - 6, t - 1.5, 5, 1.5, 'rgba(255,255,255,0.45)', null, -0.25);
  // paw print on the front of the wall
  pawPrint(p, cx, cy - 4.8, 2.9, ROSE);
}

function yarnBall(p: Pen): void {
  const { x: cx, y: cy } = p.center;
  p.shadow(cx, cy, 18, 9, 0.25);
  const r = 11.5;
  const bx = cx - 2;
  const by = cy - r - 0.5;
  // loose strand trailing out of the ball onto the floor (drawn first, so the ball covers its root)
  const s0 = { x: bx + r * 0.6, y: by + r * 0.6 };
  const s1 = { x: bx + 17, y: cy - 7 };
  const s2 = { x: bx + 20, y: cy + 0.5 };
  p.curve(s0, s1, s2, O, 2.8);
  p.curve(s0, s1, s2, PINK_L, 1.2);
  p.ball(bx, by, r, PINK);
  clipped(
    p,
    (c) => c.arc(bx, by, r, 0, TAU),
    () => {
      p.ellipse(bx, by - r * 0.1, r * 1.2, r * 0.42, null, PINK_D, 0.5);
      p.ellipse(bx, by + r * 0.35, r * 1.2, r * 0.36, null, PINK_D, -0.45);
      p.ellipse(bx + r * 0.2, by - r * 0.6, r * 0.9, r * 0.25, null, PINK_L, 0.2);
    },
  );
  p.ellipse(bx - r * 0.4, by - r * 0.45, r * 0.26, r * 0.17, 'rgba(255,255,255,0.65)', null, -0.5);
}

function cardboardBox(p: Pen): void {
  const u0 = 0.14;
  const v0 = 0.14;
  const s = 0.72;
  const ht = 15;
  const u1 = u0 + s;
  const v1 = v0 + s;
  const I = (u: number, v: number, z = 0): Pt => p.iso(u, v, z);
  const c = p.center;
  p.shadow(c.x, c.y, 24, 12, 0.25);
  const flapCol = shade(CARD, 0.14);
  const flap = (a: Pt, b: Pt, dx: number, dy: number) =>
    p.poly([a, b, { x: b.x + dx, y: b.y + dy }, { x: a.x + dx, y: a.y + dy }], flapCol, O, 1);
  // back flaps tuck out behind the walls
  flap(I(u0, v0, ht), I(u0, v1, ht), -7, -6);
  flap(I(u0, v0, ht), I(u1, v0, ht), 7, -6);
  p.box(u0, v0, s, s, ht, { top: shade(CARD, 0.2), left: CARD, right: shade(CARD, -0.2) }, 0);
  // open top: dark inside with the inner walls showing
  const inset = 0.07;
  const hz = ht - 7;
  p.poly(
    [I(u0 + inset, v0 + inset, ht), I(u1 - inset, v0 + inset, ht), I(u1 - inset, v1 - inset, ht), I(u0 + inset, v1 - inset, ht)],
    shade(CARD, -0.45),
    O,
  );
  p.poly([I(u0 + inset, v0 + inset, ht), I(u0 + inset, v1 - inset, ht), I(u0 + inset, v1 - inset, hz), I(u0 + inset, v0 + inset, hz)], shade(CARD, -0.5), null);
  p.poly([I(u0 + inset, v0 + inset, ht), I(u1 - inset, v0 + inset, ht), I(u1 - inset, v0 + inset, hz), I(u0 + inset, v0 + inset, hz)], shade(CARD, -0.35), null);
  // front flaps folded out over the front edges
  flap(I(u0, v1, ht), I(u1, v1, ht), -5, 6);
  flap(I(u1, v0, ht), I(u1, v1, ht), 7, 3);
  // seam and a little heart on the front
  p.line([wallPt(p, 'R', 0.3, 7, u1), wallPt(p, 'R', 0.7, 7, u1)], shade(CARD, -0.3), 0.8);
  const hc = wallPt(p, 'L', (u0 + u1) / 2, 7.5, v1);
  p.heart(hc.x, hc.y, 2.8, PINK, ROSE);
}

function catCushion(p: Pen): void {
  const { x: cx, y: cy } = p.center;
  p.shadow(cx, cy, 19, 9.5, 0.25);
  puffy(p, cx, cy, 15, 8, LILAC);
  stitchRing(p, cx, cy - 8, 8.5, 4.2, 'rgba(255,255,255,0.75)');
  p.circle(cx, cy - 8, 1.8, BUTTER);
}

function paperBag(p: Pen): void {
  const R = 11;
  const { x: cx, y: cy } = p.center;
  const a = p.iso(0.22, 0.5, R);
  const b = p.iso(0.72, 0.5, R);
  p.shadow(cx, cy, 21, 10, 0.25);
  capsule(p, a, b, R, KRAFT);
  // highlight and crinkle folds
  p.line([{ x: a.x + 3, y: a.y - R * 0.55 }, { x: b.x - 4, y: b.y - R * 0.55 }], 'rgba(255,255,255,0.45)', 2);
  for (let i = 0; i < 5; i++) {
    const t = 0.2 + i * 0.13;
    const x = a.x + (b.x - a.x) * t;
    const y = a.y + (b.y - a.y) * t;
    p.line(
      [
        { x: x - 1.6, y: y - R * 0.7 },
        { x: x + 1.6, y: y - R * 0.2 },
        { x: x - 1.6, y: y + R * 0.3 },
        { x: x + 1.6, y: y + R * 0.75 },
      ],
      shade(KRAFT, -0.3),
      0.8,
    );
  }
  // the open mouth, with its rolled rim and dark inside
  const rot = Math.atan2(16, -32);
  p.ellipse(b.x, b.y, R * 0.8, R * 0.98, shade(KRAFT, 0.28), O, rot);
  p.ellipse(b.x, b.y, R * 0.5, R * 0.72, '#6e4a2c', null, rot);
  p.ellipse(b.x, b.y, R * 0.3, R * 0.4, '#8a5e38', null, rot);
  // closed end fold
  p.ellipse(a.x, a.y, R * 0.45, R * 0.9, shade(KRAFT, -0.12), O, rot);
}

function scratchPost(p: Pen): void {
  const { x: cx, y: cy } = p.center;
  p.shadow(cx, cy, 22, 11, 0.25);
  p.cylinder(cx, cy, 17, 6, CARPET);
  p.cylinder(cx, cy - 5, 7, 45, SISAL);
  const top = cy - 50;
  clipped(
    p,
    (c) => c.rect(cx - 7.5, top + 1.5, 15, 44),
    () => {
      for (let y = top - 2; y < cy; y += 2.6) p.line([{ x: cx - 8, y }, { x: cx + 8, y: y + 4.5 }], shade(SISAL, -0.22), 0.8);
    },
  );
  // dangling pom-pom on a string
  const sA = { x: cx + 5, y: top + 6 };
  const sC = { x: cx + 19, y: top + 12 };
  const sB = { x: cx + 13, y: top + 25 };
  p.curve(sA, sC, sB, O, 1.8);
  p.curve(sA, sC, sB, '#d9c9b0', 0.6);
  p.ball(sB.x, sB.y + 3, 5, PINK);
  for (const [dx, dy] of [
    [-3, -2],
    [1.5, -3.4],
    [3.3, 0.8],
    [-1.8, 2.8],
  ])
    p.line([{ x: sB.x + dx * 0.5, y: sB.y + 3 + dy * 0.5 }, { x: sB.x + dx, y: sB.y + 3 + dy }], 'rgba(255,255,255,0.7)', 0.7);
}

function catBed(p: Pen): void {
  const { x: cx, y: cy } = p.center;
  p.shadow(cx, cy, 22, 11, 0.25);
  p.cylinder(cx, cy, 17, 8, PEACH);
  const yt = cy - 8;
  // sprinkles around the donut ring
  const ringCols = [PINK, MINT, BUTTER, LILAC];
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * TAU + 0.3;
    p.ellipse(cx + Math.cos(a) * 13, yt + Math.sin(a) * 6.5, 1.3, 0.8, ringCols[i % ringCols.length], null, a);
  }
  // the hollow, with a cream pillow down inside
  p.ellipse(cx, yt, 9.5, 4.8, shade(PEACH, -0.35));
  p.ellipse(cx, yt + 1.2, 8, 3.8, CREAM);
  p.ellipse(cx - 3, yt, 2.5, 1, 'rgba(255,255,255,0.8)', null, -0.2);
}

function teaserWand(p: Pen): void {
  const { x: cx, y: cy } = p.center;
  p.shadow(cx, cy, 16, 8, 0.25);
  // little stand
  p.cylinder(cx - 6, cy, 9, 9, '#f4c98f');
  const base = { x: cx - 6, y: cy - 9 };
  const tip = { x: cx + 14, y: cy - 40 };
  thick(p, [base, tip], 2.4, WOOD);
  // feathers dangling from the tip
  feather(p, tip.x, tip.y, 15, 0.7, PINK);
  feather(p, tip.x, tip.y, 16, 1.4, MINT);
  feather(p, tip.x, tip.y, 14, 2.1, BUTTER);
  p.circle(tip.x, tip.y, 2.2, GOLD);
}

function fishPillow(p: Pen): void {
  const { x: cx, y: cy } = p.center;
  p.shadow(cx, cy, 22, 11, 0.25);
  const x = cx + 3;
  // tail fin behind the body
  p.poly(
    [
      { x: x - 9, y: cy - 2 },
      { x: x - 20, y: cy - 9 },
      { x: x - 17, y: cy - 1 },
      { x: x - 20, y: cy + 6 },
      { x: x - 9, y: cy + 1 },
    ],
    shade(FISH, -0.08),
  );
  puffy(p, x, cy, 15, 7, FISH);
  // dorsal fin, a stripe and a sweet little face
  p.poly(
    [
      { x: x - 4, y: cy - 6 },
      { x: x + 0.5, y: cy - 13 },
      { x: x + 5, y: cy - 6 },
    ],
    shade(FISH, 0.08),
  );
  p.curve({ x: x - 8, y: cy - 1 }, { x: x - 2, y: cy + 1 }, { x: x + 4, y: cy - 1 }, shade(FISH, -0.35), 0.8);
  p.circle(x + 7, cy - 3, 1.8, DARK, null);
  p.circle(x + 7.6, cy - 3.6, 0.6, '#ffffff', null);
  p.curve({ x: x + 10, y: cy }, { x: x + 12, y: cy + 1.5 }, { x: x + 13.5, y: cy - 1 }, O, 0.8);
}

function catTunnel(p: Pen): void {
  const R = 12;
  const { x: cx, y: cy } = p.center;
  const a = p.iso(0.12, 0.5, R);
  const b = p.iso(1.88, 0.5, R);
  p.shadow(cx, cy, 34, 15, 0.25);
  capsule(p, a, b, R, PINK);
  p.line([{ x: a.x, y: a.y + R * 0.55 }, { x: b.x, y: b.y + R * 0.55 }], shade(PINK, -0.2), 2);
  p.line([{ x: a.x + 2, y: a.y - R * 0.6 }, { x: b.x - 2, y: b.y - R * 0.6 }], 'rgba(255,255,255,0.5)', 2);
  // crinkly polka dots
  const dots = [0.14, 0.3, 0.46, 0.62, 0.78, 0.9];
  dots.forEach((t, i) => {
    const x = a.x + (b.x - a.x) * t;
    const y = a.y + (b.y - a.y) * t + (i % 2 ? -R * 0.35 : R * 0.15);
    p.circle(x, y, 2.1, i % 2 ? CREAM : LILAC, null);
  });
  // the two open ends
  const rot = Math.atan2(16, -32);
  for (const e of [a, b]) {
    p.ellipse(e.x, e.y, R * 0.8, R * 0.95, PINK_L, O, rot);
    p.ellipse(e.x, e.y, R * 0.5, R * 0.7, '#6b4a66', null, rot);
  }
}

function kotatsu(p: Pen): void {
  const { x: cx, y: cy } = p.center;
  p.shadow(cx, cy, 28, 14, 0.25);
  // quilted blanket skirt
  p.box(0.04, 0.04, 0.92, 0.92, 13, { top: shade(BLANKET, 0.15), left: BLANKET, right: shade(BLANKET, -0.22) }, 0);
  const q = 'rgba(255,255,255,0.65)';
  for (const z of [4.5, 9]) {
    p.line([wallPt(p, 'L', 0.1, z, 0.96), wallPt(p, 'L', 0.9, z, 0.96)], q, 0.9);
    p.line([wallPt(p, 'R', 0.1, z, 0.96), wallPt(p, 'R', 0.9, z, 0.96)], q, 0.9);
  }
  for (const a of [0.25, 0.5, 0.75]) {
    p.line([wallPt(p, 'L', a, 1.5, 0.96), wallPt(p, 'L', a, 11, 0.96)], q, 0.9);
    p.line([wallPt(p, 'R', a, 1.5, 0.96), wallPt(p, 'R', a, 11, 0.96)], q, 0.9);
  }
  // wooden table top
  p.box(0.02, 0.02, 0.96, 0.96, 2.5, { top: shade(WOOD, 0.22), left: WOOD, right: shade(WOOD, -0.2) }, 13);
  // mandarin on top, with a leaf
  const top = cy - 15.5;
  p.ball(cx + 1, top - 5.5, 5.5, '#ffa53a');
  p.curve({ x: cx + 1, y: top - 10.5 }, { x: cx + 3, y: top - 8 }, { x: cx + 1, y: top - 0.8 }, shade('#ffa53a', -0.35), 0.6);
  p.line([{ x: cx + 1, y: top - 11 }, { x: cx + 1.5, y: top - 13 }], O, 1);
  p.ellipse(cx + 4, top - 14, 3.2, 1.5, LEAF, O, -0.4);
}

function bigCushion(p: Pen): void {
  const { x: cx, y: cy } = p.center;
  p.shadow(cx, cy, 28, 14, 0.25);
  puffy(p, cx, cy, 27, 20, '#ffd2e4');
  stitchRing(p, cx, cy - 20, 14, 6.8, 'rgba(160,90,120,0.45)');
  p.ellipse(cx, cy - 20, 4.5, 2.2, shade(PINK, -0.12), null);
}

function sunnyMat(p: Pen): void {
  const { x: cx, y: cy } = p.center;
  const ht = 2.5;
  const tan = '#d8b777';
  p.shadow(cx, cy + 1, 26, 13, 0.18);
  p.box(0.03, 0.03, 0.94, 0.94, ht, { top: '#f6e4a2', left: shade('#f6e4a2', -0.2), right: shade('#f6e4a2', -0.32) }, 0);
  // woven pattern
  for (let i = 1; i < 8; i++) {
    const t = 0.03 + i * 0.12;
    p.line([p.iso(0.05, t, ht), p.iso(0.95, t, ht)], tan, 0.9);
    p.line([p.iso(t, 0.05, ht), p.iso(t, 0.95, ht)], shade(tan, 0.2), 0.7);
  }
  // soft sunbeam patch with rays
  const sx = cx + 2;
  const sy = cy - ht - 1;
  p.ellipse(sx, sy, 17, 8.5, rgba(BUTTER, 0.9), null);
  p.ellipse(sx, sy, 11, 5, 'rgba(255,250,205,0.9)', null);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * TAU + 0.4;
    p.line(
      [
        { x: sx + Math.cos(a) * 12, y: sy + Math.sin(a) * 6 },
        { x: sx + Math.cos(a) * 19, y: sy + Math.sin(a) * 9.5 },
      ],
      'rgba(255,236,150,0.9)',
      1.6,
    );
  }
}

function mouseToy(p: Pen): void {
  const { x: cx, y: cy } = p.center;
  p.shadow(cx, cy, 16, 8, 0.25);
  // tail
  p.curve({ x: cx - 9, y: cy - 4 }, { x: cx - 20, y: cy - 6 }, { x: cx - 17, y: cy - 15 }, O, 2.2);
  p.curve({ x: cx - 9, y: cy - 4 }, { x: cx - 20, y: cy - 6 }, { x: cx - 17, y: cy - 15 }, PINK, 0.9);
  // feet
  p.ellipse(cx - 4, cy - 1.5, 2.6, 1.6, shade(GRAY, -0.3));
  p.ellipse(cx + 2, cy - 1.5, 2.6, 1.6, shade(GRAY, -0.3));
  // body, head and snout
  p.ellipse(cx - 1, cy - 7, 10, 6.5, rgrad(p, cx - 1, cy - 7, 10, shade(GRAY, 0.25), shade(GRAY, -0.2)));
  p.ball(cx + 8, cy - 9, 5.5, GRAY);
  p.circle(cx + 6, cy - 16, 3.2, GRAY);
  p.circle(cx + 6, cy - 16, 1.8, PINK, null);
  p.ellipse(cx + 13, cy - 8, 2.3, 1.8, PINK);
  p.circle(cx + 10, cy - 10.5, 1, DARK, null);
  // wind-up key on its back
  p.line([{ x: cx - 2, y: cy - 13.5 }, { x: cx - 2, y: cy - 18 }], O, 2.6);
  p.line([{ x: cx - 2, y: cy - 13.5 }, { x: cx - 2, y: cy - 18 }], GOLD, 1.2);
  p.circle(cx - 2, cy - 20.5, 2.6, GOLD, O);
  p.circle(cx - 2, cy - 20.5, 0.9, PINK_L, null);
}

function cosyCastle(p: Pen): void {
  const { x: cx, y: cy } = p.center;
  p.shadow(cx, cy + 2, 56, 26, 0.25);
  const TOWER = PINK;
  const ROOF = LILAC_D;
  const tower = (u: number, v: number, h: number) => {
    const b = p.iso(u, v, 0);
    p.cylinder(b.x, b.y, 12, h, TOWER);
    for (const z of [h * 0.35, h * 0.7]) {
      p.ctx.beginPath();
      p.ctx.ellipse(b.x, b.y - z, 12, 6, 0, 0, Math.PI, false);
      p.ctx.strokeStyle = shade(TOWER, -0.3);
      p.ctx.lineWidth = 0.9;
      p.ctx.stroke();
    }
    const top = b.y - h;
    const apex = { x: b.x, y: top - 22 };
    path(
      p,
      ROOF,
      O,
      (c) => {
        c.moveTo(b.x - 14, top);
        c.lineTo(apex.x, apex.y);
        c.lineTo(b.x + 14, top);
        c.ellipse(b.x, top, 14, 7, 0, 0, Math.PI, false);
        c.closePath();
      },
      1.1,
    );
    p.line([apex, { x: apex.x, y: apex.y - 16 }], O, 1.3);
    p.poly(
      [
        { x: apex.x, y: apex.y - 16 },
        { x: apex.x + 12, y: apex.y - 12.5 },
        { x: apex.x, y: apex.y - 9 },
      ],
      PINK_L,
    );
    p.star(apex.x + 4, apex.y - 12.5, 2, GOLD, null);
  };
  tower(0.3, 0.3, 48);
  tower(1.7, 0.3, 48);
  tower(0.3, 1.7, 48);
  // cardboard walls
  p.box(0.25, 0.25, 1.5, 1.5, 30, { top: shade(CARD, 0.2), left: CARD, right: shade(CARD, -0.2) }, 0);
  p.line([wallPt(p, 'L', 0.25, 15, 1.75), wallPt(p, 'L', 1.75, 15, 1.75)], shade(CARD, -0.3), 0.8);
  p.line([wallPt(p, 'R', 0.25, 15, 1.75), wallPt(p, 'R', 1.75, 15, 1.75)], shade(CARD, -0.3), 0.8);
  // arched door on the left wall
  const P = (a: number, z: number) => wallPt(p, 'L', a, z, 1.75);
  path(
    p,
    DARK,
    O,
    (c) => {
      const a0 = P(0.85, 0);
      const a1 = P(1.15, 0);
      const a2 = P(1.15, 15);
      const top2 = P(1.0, 29);
      const a3 = P(0.85, 15);
      c.moveTo(a0.x, a0.y);
      c.lineTo(a1.x, a1.y);
      c.lineTo(a2.x, a2.y);
      c.quadraticCurveTo(top2.x, top2.y, a3.x, a3.y);
      c.closePath();
    },
    1,
  );
  // little pink mat at the door
  p.poly([P(0.75, 0), P(1.25, 0), P(1.25, -0.1), P(0.75, -0.1)], PINK);
  // two glowing windows on the right wall
  const Q = (a: number, z: number) => wallPt(p, 'R', a, z, 1.75);
  for (const a0 of [0.45, 1.3]) {
    const a1 = a0 + 0.25;
    p.poly([Q(a0, 17), Q(a1, 17), Q(a1, 25), Q(a0, 25)], BUTTER, O, 1);
    p.line([Q((a0 + a1) / 2, 17), Q((a0 + a1) / 2, 25)], O, 0.7);
    p.line([Q(a0, 21), Q(a1, 21)], O, 0.7);
  }
  // front tower
  tower(1.7, 1.7, 48);
}

function pumpkinBed(p: Pen): void {
  const { x: cx, y: cy } = p.center;
  p.shadow(cx, cy, 22, 11, 0.25);
  const body = ORANGE;
  // lobes and main round body
  p.ellipse(cx - 9, cy - 11, 10, 11, shade(body, -0.12));
  p.ellipse(cx + 9, cy - 11, 10, 11, shade(body, -0.12));
  p.ellipse(cx, cy - 13, 17, 13, rgrad(p, cx, cy - 13, 17, shade(body, 0.3), body));
  // ridges
  for (const dx of [-7, 0, 7]) p.curve({ x: cx + dx, y: cy - 25 }, { x: cx + dx * 1.3, y: cy - 13 }, { x: cx + dx, y: cy - 1 }, shade(body, -0.28), 0.7);
  // hollow top with a glow and a cushion inside
  const hy = cy - 26;
  p.ellipse(cx, hy, 14, 5, shade(body, -0.45));
  p.ellipse(cx, hy + 0.5, 11.5, 3.6, 'rgba(255,200,110,0.75)', null);
  p.ellipse(cx, hy + 1.6, 9.5, 3, LILAC, null);
  p.ellipse(cx - 2.5, hy + 0.8, 3.4, 1.1, 'rgba(255,255,255,0.6)', null, -0.1);
  // stem and leaf
  p.roundRect(cx - 2.5, cy - 33, 5, 6, 1.5, shade(LEAF, -0.3));
  p.ellipse(cx + 5, cy - 33, 4.4, 2.2, LEAF, O, -0.4);
  // carved smiling face
  const fy = cy - 13;
  for (const dx of [-7, 7]) {
    p.poly(
      [
        { x: cx + dx - 2.6, y: fy - 3.2 },
        { x: cx + dx + 2.6, y: fy - 3.2 },
        { x: cx + dx, y: fy + 1.6 },
      ],
      DARK,
      null,
    );
  }
  path(
    p,
    DARK,
    O,
    (c) => {
      c.moveTo(cx - 8, fy + 0.8);
      c.lineTo(cx + 8, fy + 0.8);
      c.quadraticCurveTo(cx, fy + 11, cx - 8, fy + 0.8);
      c.closePath();
    },
    0.8,
  );
  for (const dx of [-4, 0, 4]) {
    p.poly(
      [
        { x: cx + dx - 1.6, y: fy + 0.8 },
        { x: cx + dx + 1.6, y: fy + 0.8 },
        { x: cx + dx, y: fy + 3.6 },
      ],
      CREAM,
      null,
    );
  }
}

const TABLE: Record<string, [number, Painter]> = {
  kitty_bowl: [26, kittyBowl],
  yarn_ball: [30, yarnBall],
  cardboard_box: [30, cardboardBox],
  cat_cushion: [26, catCushion],
  paper_bag: [26, paperBag],
  mouse_toy: [28, mouseToy],
  scratch_post: [72, scratchPost],
  cat_bed: [26, catBed],
  teaser_wand: [36, teaserWand],
  fish_pillow: [24, fishPillow],
  cat_tunnel: [26, catTunnel],
  kotatsu: [30, kotatsu],
  big_cushion: [36, bigCushion],
  kitty_castle: [90, cosyCastle],
  sunny_mat: [14, sunnyMat],
  pumpkin_bed: [38, pumpkinBed],
};

export const sprites: SpriteSpec[] = GOODIE_LIST.filter((g) => TABLE[g.id]).map((g) => {
  const [height, paint] = TABLE[g.id];
  return { key: `deco:${g.id}`, fw: g.w ?? 1, fh: g.h ?? 1, height, paint };
});

// ---------------------------------------------------------------------------
// Icons (flat, 40x40 unless noted)

function iconKibble(p: Pen): void {
  // bag body with a crimped top seal
  path(
    p,
    hgrad(p, 8, 32, [
      [0, '#ffd08f'],
      [0.5, '#ffb874'],
      [1, '#f0953f'],
    ]),
    O,
    (c) => {
      c.moveTo(8, 11);
      c.lineTo(32, 11);
      c.quadraticCurveTo(34, 24, 31, 35);
      c.quadraticCurveTo(20, 37.5, 9, 35);
      c.quadraticCurveTo(6, 24, 8, 11);
      c.closePath();
    },
    1.2,
  );
  for (let x = 8; x < 32; x += 3) p.poly([{ x, y: 11 }, { x: x + 1.5, y: 7.5 }, { x: x + 3, y: 11 }], '#f7a25a', O, 0.8);
  // cat face on a cream label
  p.circle(20, 24, 8.5, CREAM);
  p.poly([{ x: 14.5, y: 22 }, { x: 15.2, y: 16.8 }, { x: 19, y: 20.5 }], '#ffa95c');
  p.poly([{ x: 25.5, y: 22 }, { x: 24.8, y: 16.8 }, { x: 21, y: 20.5 }], '#ffa95c');
  p.ellipse(20, 25, 6, 4.8, '#ffa95c');
  p.circle(17.6, 24.2, 1, DARK, null);
  p.circle(22.4, 24.2, 1, DARK, null);
  p.poly([{ x: 19, y: 26.4 }, { x: 21, y: 26.4 }, { x: 20, y: 27.5 }], PINK_D, null);
  p.line([{ x: 15, y: 26.4 }, { x: 10.5, y: 25.6 }], O, 0.6);
  p.line([{ x: 15, y: 27.4 }, { x: 10.8, y: 28 }], O, 0.6);
  p.line([{ x: 25, y: 26.4 }, { x: 29.5, y: 25.6 }], O, 0.6);
  p.line([{ x: 25, y: 27.4 }, { x: 29.2, y: 28 }], O, 0.6);
  // a few kibble bits on the label band
  p.ellipse(13, 33, 1.6, 1.2, '#c98b53', O, 0.4);
  p.ellipse(27, 33.5, 1.6, 1.2, '#c98b53', O, -0.3);
}

function iconTuna(p: Pen): void {
  // can body: a rounded-bottom tin with a tab on top
  path(
    p,
    hgrad(p, 9, 31, [
      [0, '#dfe7ee'],
      [0.5, '#f5f9fc'],
      [1, '#aab8c6'],
    ]),
    O,
    (c) => {
      c.moveTo(9, 13);
      c.lineTo(9, 33);
      c.ellipse(20, 33, 11, 3.6, 0, Math.PI, 0, true);
      c.lineTo(31, 13);
      c.closePath();
    },
    1.2,
  );
  // label band with a cute fish
  p.rect(9, 18, 22, 11, '#8ec5e8');
  p.poly([{ x: 24.5, y: 23.5 }, { x: 29.5, y: 20 }, { x: 29.5, y: 27 }], '#ff9fb8');
  p.ellipse(19, 23.5, 6, 3.8, '#ff9fb8');
  p.ellipse(17, 22, 2.5, 1.1, 'rgba(255,255,255,0.6)', null, -0.2);
  p.circle(15.8, 22.6, 1, DARK, null);
  p.circle(16.1, 22.2, 0.35, '#ffffff', null);
  p.curve({ x: 15, y: 25.3 }, { x: 16.5, y: 26.6 }, { x: 18.2, y: 25.3 }, O, 0.7);
  // top lid, with tab
  p.ellipse(20, 13, 11, 3.6, '#eef3f7');
  p.roundRect(17, 10, 6, 3, 1.4, '#c2ccd6');
}

function iconSashimi(p: Pen): void {
  // plate
  p.ellipse(20, 28, 17, 6.5, '#fffaf2');
  p.ellipse(20, 28, 12, 4.2, '#f1e5d6', null);
  // three salmon slices with fat stripes
  const slices: [number, number, number][] = [
    [13, 23, -0.25],
    [21, 21, 0.08],
    [28, 24.5, 0.32],
  ];
  for (const [x, y, rot] of slices) {
    p.save();
    p.ctx.translate(x, y);
    p.ctx.rotate(rot);
    p.roundRect(-6.5, -4, 13, 8, 3, '#ff9c7e');
    p.line([{ x: -3.5, y: -3 }, { x: -1.5, y: 3 }], '#fff2e8', 1.2);
    p.line([{ x: 1.5, y: -3 }, { x: 3.2, y: 2.6 }], '#fff2e8', 1.2);
    p.restore();
  }
  // a wasabi dot
  p.circle(33, 28, 2.2, '#b5e8a0');
}

function iconPaw(p: Pen): void {
  pawPrint(p, 20, 27, 8.5, PINK, O);
  p.ellipse(18, 24.5, 2.8, 1.7, 'rgba(255,255,255,0.55)', null, -0.3);
  p.ellipse(9.8, 15.5, 1.1, 0.7, 'rgba(255,255,255,0.55)', null, -0.3);
  p.ellipse(30.2, 15.5, 1.1, 0.7, 'rgba(255,255,255,0.55)', null, 0.3);
}

function iconFoodFull(p: Pen): void {
  // shadow and bowl wall
  p.ellipse(20, 35.5, 14, 3.2, 'rgba(60,40,30,0.18)', null);
  path(
    p,
    hgrad(p, 6, 34, [
      [0, shade(PINK, -0.12)],
      [0.35, shade(PINK, 0.25)],
      [1, PINK_D],
    ]),
    O,
    (c) => {
      c.moveTo(6, 19);
      c.bezierCurveTo(7, 31, 12, 35, 20, 35);
      c.bezierCurveTo(28, 35, 33, 31, 34, 19);
      c.closePath();
    },
    1.2,
  );
  // rim
  p.ellipse(20, 19, 14, 5, PINK_L);
  // a heaped mound of kibble
  path(
    p,
    '#d9975a',
    O,
    (c) => {
      c.moveTo(8, 19);
      c.quadraticCurveTo(9, 7.5, 20, 7.5);
      c.quadraticCurveTo(31, 7.5, 32, 19);
      c.ellipse(20, 19, 12, 4.6, 0, 0, Math.PI, false);
      c.closePath();
    },
    1,
  );
  const bits: [number, number, string][] = [
    [13, 14, '#f0b872'],
    [19, 11, '#b5703c'],
    [25, 13.5, '#f0b872'],
    [16, 17, '#b5703c'],
    [23, 17.5, '#f5c886'],
    [29, 17.5, '#b5703c'],
    [11, 18.5, '#f5c886'],
  ];
  for (const [x, y, col] of bits) p.ellipse(x, y, 1.8, 1.3, col, O, 0.3);
  // a paw on the wall
  pawPrint(p, 20, 28.5, 3, ROSE);
}

function iconPurr(p: Pen): void {
  p.heart(5.4, 8.6, 3.2, '#ff8fb1', '#c2456e');
  p.circle(4, 6.8, 0.7, '#ffd3e2', null);
  const pts = [];
  for (let x = 10; x <= 15; x += 0.5) pts.push({ x, y: 6 + Math.sin((x - 10) * 2.1) * 1.3 });
  p.line(pts, '#c2456e', 1.1);
}

export const icons: IconSpec[] = [
  { key: 'icon:kibble', paint: iconKibble },
  { key: 'icon:tuna', paint: iconTuna },
  { key: 'icon:sashimi', paint: iconSashimi },
  { key: 'icon:paw', paint: iconPaw },
  { key: 'kitty:food_full', paint: iconFoodFull },
  { key: 'fx:purr', paint: iconPurr, size: 16 },
];
