// Horticulture decorations: a cheerful gardening collection in the spirit of
// "Gardening Mama". Chunky round shapes, a warm bright palette, terracotta and
// wood, smiling plants and a sprinkle of sparkles. Footprints always come from
// the content definition, so each painter only has to lay out its own shapes.
import { type IconSpec, type SpriteSpec, type Pen, OUTLINE, shade, rgba } from './kit';
import { HORTICULTURE_DECORATIONS } from '@farm/shared';

const O = OUTLINE;
const UP = -Math.PI / 2;
const TERRA = '#e8834f';
const WOOD = '#d9a066';
const WOOD_D = '#9a6638';
const SOIL = '#6b4a32';
const LEAF = '#5cbf4f';
const LEAF_D = '#3f9a3c';
const INK = '#3d2a1e';
const BLUSH = '#ff8fa8';
const PETAL = '#ffcf3a';
const WHITE = '#fffdf6';
const SILVER = '#cfd8de';

type Fill = string | CanvasGradient | null;
type Painter = (p: Pen) => void;

// ---------------------------------------------------------------------------
// Helpers

/** Fill and/or stroke whatever path is currently on the context. */
function fs(p: Pen, fill: Fill, stroke: string | null = O, w = 1): void {
  const c = p.ctx;
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

/** Run fn with a thinner outline (keeps tiny shapes from turning into ink blobs). */
function thin(p: Pen, w: number, fn: () => void): void {
  const old = p.lineWidth;
  p.lineWidth = w;
  fn();
  p.lineWidth = old;
}

function radial(p: Pen, x: number, y: number, r: number, color: string): CanvasGradient {
  const g = p.ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r * 1.1);
  g.addColorStop(0, shade(color, 0.35));
  g.addColorStop(0.6, color);
  g.addColorStop(1, shade(color, -0.25));
  return g;
}

function hgrad(p: Pen, x0: number, x1: number, left: string, right: string): CanvasGradient {
  const g = p.ctx.createLinearGradient(x0, 0, x1, 0);
  g.addColorStop(0, left);
  g.addColorStop(1, right);
  return g;
}

/** A thick outlined stroke (stems, handles, poles). */
function thick(p: Pen, a: { x: number; y: number }, c: { x: number; y: number }, b: { x: number; y: number }, color: string, w: number): void {
  p.curve(a, c, b, O, w + 1.2);
  p.curve(a, c, b, color, w);
}

/** A pointed leaf from (x, y) heading along `ang` for `len` px; `w` is the half-bulge. */
function leafAt(p: Pen, x: number, y: number, len: number, ang: number, w: number, color: string): void {
  const dx = Math.cos(ang);
  const dy = Math.sin(ang);
  const tx = x + dx * len;
  const ty = y + dy * len;
  const cx = x + dx * len * 0.5;
  const cy = y + dy * len * 0.5;
  const nx = -dy * w;
  const ny = dx * w;
  const c = p.ctx;
  c.beginPath();
  c.moveTo(x, y);
  c.quadraticCurveTo(cx + nx, cy + ny, tx, ty);
  c.quadraticCurveTo(cx - nx, cy - ny, x, y);
  c.closePath();
  fs(p, color, O, 0.9);
}

/** Five-point sparkle glint. */
function sparkle(p: Pen, x: number, y: number, r: number): void {
  p.poly(
    [
      { x, y: y - r },
      { x: x + r * 0.25, y: y - r * 0.25 },
      { x: x + r, y },
      { x: x + r * 0.25, y: y + r * 0.25 },
      { x, y: y + r },
      { x: x - r * 0.25, y: y + r * 0.25 },
      { x: x - r, y },
      { x: x - r * 0.25, y: y - r * 0.25 },
    ],
    '#fff6c0',
    null,
  );
}

/** A smiling face: dot eyes with glints, a soft smile and pink cheeks. */
function face(p: Pen, x: number, y: number, s: number): void {
  for (const dx of [-2.3, 2.3]) {
    p.circle(x + dx * s, y, 1.05 * s, INK, null);
    p.circle(x + (dx + 0.35) * s, y - 0.4 * s, 0.38 * s, '#ffffff', null);
  }
  p.curve({ x: x - 1.5 * s, y: y + 1.1 * s }, { x, y: y + 2.9 * s }, { x: x + 1.5 * s, y: y + 1.1 * s }, INK, 0.7 * s + 0.3);
  for (const dx of [-3.9, 3.9]) p.ellipse(x + dx * s, y + 1.7 * s, 1.25 * s, 0.75 * s, rgba(BLUSH, 0.8), null);
}

/** A tapered terracotta pot standing with its base on (x, y). */
function pot(p: Pen, x: number, y: number, rx: number, ht: number, col = TERRA): void {
  const rb = rx * 0.78;
  const c = p.ctx;
  c.beginPath();
  c.moveTo(x - rx, y - ht);
  c.lineTo(x - rb, y);
  c.ellipse(x, y, rb, rb / 2, 0, Math.PI, 0, true);
  c.lineTo(x + rx, y - ht);
  c.closePath();
  fs(p, hgrad(p, x - rx, x + rx, shade(col, 0.16), shade(col, -0.26)), O, 1);
  p.cylinder(x, y - ht + 3.2, rx + 1.5, 3.2, shade(col, 0.04));
}

/** A little sprout: two round leaves on a curved stem rising from (x, y). */
function sprout(p: Pen, x: number, y: number, s: number, col = LEAF): void {
  const ctrl = { x: x - s * 0.4, y: y - s * 1.1 };
  const top = { x: x + s * 0.3, y: y - s * 2.2 };
  const w = Math.max(0.8, s * 0.55);
  p.curve({ x, y }, ctrl, top, O, w + 1.1);
  p.curve({ x, y }, ctrl, top, LEAF_D, w);
  leafAt(p, top.x, top.y, s * 1.3, UP - 0.7, s * 0.95, col);
  leafAt(p, top.x, top.y, s * 1.3, UP + 0.6, s * 0.95, shade(col, 0.12));
}

/** A wooden post standing on (x, y). */
function post(p: Pen, x: number, y: number, ht: number, w = 3.5): void {
  p.ellipse(x, y, w * 0.9, w * 0.4, shade(WOOD_D, 0), null);
  p.rect(x - w / 2, y - ht, w, ht, hgrad(p, x - w / 2, x + w / 2, shade(WOOD, 0.18), shade(WOOD_D, 0)));
}

type Xy = { x: number; y: number };

/** A thin outlined straight stroke (handles, rails, stakes). */
function stroke(p: Pen, a: Xy, b: Xy, color: string, w: number): void {
  p.line([a, b], O, w + 1.2);
  p.line([a, b], color, w);
}

/** A tiny picture for a seed packet. */
function packetPicture(p: Pen, kind: number, x: number, y: number): void {
  switch (kind) {
    case 0:
      p.flower(x, y, 2.2, '#ff8fb1', '#ffd23f');
      break;
    case 1:
      p.ball(x, y, 2.2, '#ff4d4d');
      p.star(x, y - 2, 1, LEAF_D, null);
      break;
    case 2:
      p.poly([{ x: x - 2, y: y - 2 }, { x: x + 2, y: y - 2 }, { x, y: y + 2.6 }], '#ff9a3c', O, 0.6);
      leafAt(p, x, y - 2, 3, UP, 1, LEAF);
      break;
    case 3:
      p.flower(x, y, 2.4, '#ffd23f', '#8a5530');
      break;
    case 4:
      p.ellipse(x, y, 2.4, 1.8, '#b8f08a', O);
      p.ellipse(x, y - 0.4, 1.1, 0.8, '#e8ffd0', null);
      break;
    case 5:
      p.ball(x, y - 0.5, 1.8, '#ff4d6d');
      p.ellipse(x, y + 1.8, 0.9, 1.2, '#fff5f5', null);
      break;
    default:
      p.ellipse(x, y, 3, 1.5, '#7cc96b', O, -0.4);
      p.circle(x - 1, y, 0.4, '#ffffff', null);
      p.circle(x + 0.8, y - 0.4, 0.4, '#ffffff', null);
  }
}

/** One seed packet hanging on a rack face: body, header band, picture and a label. */
function packet(p: Pen, col: string, kind: number, at: (t: number, z: number) => Xy, t0: number, t1: number, z0: number): void {
  const h = 15;
  p.poly([at(t0, z0), at(t1, z0), at(t1, z0 - h), at(t0, z0 - h)], col);
  p.poly([at(t0, z0), at(t1, z0), at(t1, z0 - 4), at(t0, z0 - 4)], shade(col, 0.3), O, 0.6);
  const m = at((t0 + t1) / 2, z0 - 7.5);
  packetPicture(p, kind, m.x, m.y);
  p.poly([at(t0 + 0.02, z0 - 11.5), at(t1 - 0.02, z0 - 11.5), at(t1 - 0.02, z0 - 13.2), at(t0 + 0.02, z0 - 13.2)], WHITE, O, 0.5);
}

/** A fuzzy striped bee with wings and a smiling face, centred on (x, y). */
function bee(p: Pen, x: number, y: number, r: number): void {
  for (const dx of [-1, 1]) p.ellipse(x + dx * r * 0.5, y - r * 1.1, r * 0.8, r * 0.5, rgba('#ffffff', 0.9), O, dx * 0.4);
  p.ball(x, y, r, '#ffd23f');
  for (const dx of [-0.42, 0.22]) p.ellipse(x + dx * r, y, r * 0.2, r * 0.8, INK, null);
  face(p, x, y + r * 0.1, r / 6.5);
}

function herbBasil(p: Pen, x: number, y: number): void {
  for (let k = 0; k < 6; k++) leafAt(p, x, y, 6.5, UP + (k - 2.5) * 0.6, 2.7, k % 2 ? '#4fb84a' : '#6cd46a');
}

function herbRosemary(p: Pen, x: number, y: number): void {
  for (let k = 0; k < 7; k++) {
    const a = UP + (k - 3) * 0.32;
    p.line([{ x, y }, { x: x + Math.cos(a) * 9, y: y + Math.sin(a) * 9 }], '#2f7a4a', 1.5);
  }
}

function herbThyme(p: Pen, x: number, y: number): void {
  p.foliage(x, y - 3, 4.2, '#9bd68a', 'thyme', 6);
  for (const [dx, dy] of [
    [-2, -6],
    [2, -5],
    [0, -1],
  ] as const) {
    p.circle(x + dx, y + dy, 0.7, '#ffb8d6', null);
  }
}

function herbLavender(p: Pen, x: number, y: number): void {
  for (const dx of [-2.5, 0, 2.5]) {
    const tip = { x: x + dx * 1.4, y: y - 14 };
    p.line([{ x: x + dx * 0.3, y }, tip], '#8fb86a', 1.2);
    p.ellipse(tip.x, tip.y, 1.5, 3.4, '#a77bdb', O, dx * 0.05);
  }
}

/** A little wooden stake with a coloured tag for a herb bed. */
function herbTag(p: Pen, x: number, y: number, dot: string): void {
  stroke(p, { x: x + 6, y }, { x: x + 6, y: y - 10 }, WOOD_D, 1.2);
  p.rect(x + 4.5, y - 10, 6, 4.4, WHITE, O);
  p.circle(x + 6.5, y - 7.8, 1.1, dot, null);
}

// ---------------------------------------------------------------------------
// Painters (one per decoration id)

/** Leaning tower of three pots; the top one sprouts. */
const terracottaStack: Painter = (p) => {
  const c = p.center;
  p.shadow(c.x, c.y + 1, 16, 7, 0.28);
  const y0 = c.y + 4;
  pot(p, c.x + 1, y0, 14, 12);
  face(p, c.x + 1, y0 - 6, 0.85);
  pot(p, c.x - 2, y0 - 11, 11, 10, shade(TERRA, 0.06));
  pot(p, c.x + 3, y0 - 20, 8, 9, shade(TERRA, 0.12));
  sprout(p, c.x + 3, y0 - 28, 6.5);
  sparkle(p, c.x - 13, y0 - 26, 2.6);
  sparkle(p, c.x + 14, y0 - 30, 2);
};

/** Shallow wooden tray with rows of tiny sprouts and little plant labels. */
const seedlingTray: Painter = (p) => {
  const c = p.center;
  p.shadow(c.x, c.y + 1, 17, 7, 0.26);
  const z = 6;
  // labels sit on the back edge, drawn first so the sprouts overlap them
  for (const [u, col] of [
    [0.3, '#ff6b8b'],
    [0.62, '#ffb347'],
  ] as const) {
    const s = p.iso(u, 0.2, z);
    p.line([s, { x: s.x, y: s.y - 11 }], WOOD_D, 1.4);
    p.rect(s.x - 1, s.y - 11, 6, 4.4, WHITE, O);
    p.circle(s.x + 2, s.y - 8.8, 1.1, col, null);
  }
  p.box(0.1, 0.16, 0.8, 0.68, 6, WOOD);
  const cols = ['#5cbf4f', '#7ed957', '#4fb36a', '#8cd45a', '#63c255', '#73c96a'];
  let k = 0;
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 2; j++) {
      const u = 0.2 + i * 0.25;
      const v = 0.3 + j * 0.3;
      p.diamond(u, v, 0.18, 0.2, SOIL, O, z);
      const s = p.iso(u + 0.09, v + 0.1, z);
      sprout(p, s.x, s.y + 1, 4.2, cols[k++]);
    }
  }
  sparkle(p, c.x + 15, c.y - 14, 2.2);
};

/** A big smiling sunflower sprouting from a round pot. */
const smilingSunflowerPot: Painter = (p) => {
  const c = p.center;
  p.shadow(c.x, c.y + 1, 14, 6.5, 0.28);
  const base = c.y + 2;
  const hx = c.x;
  const hy = base - 58;
  thick(p, { x: c.x, y: base - 10 }, { x: c.x - 2.5, y: base - 34 }, { x: hx, y: hy + 6 }, LEAF_D, 2.2);
  leafAt(p, c.x - 1, base - 24, 11, UP - 0.55, 4.2, LEAF);
  leafAt(p, c.x - 1, base - 36, 9, UP + 0.75, 3.6, shade(LEAF, 0.1));
  pot(p, c.x, base, 11.5, 14, '#f0925f');
  p.heart(c.x, base - 7, 2.6, BLUSH, null);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    p.ellipse(hx + Math.cos(a) * 9.6, hy + Math.sin(a) * 9.6, 5.2, 2.8, PETAL, O, a);
  }
  p.circle(hx, hy, 9.5, radial(p, hx, hy, 9.5, '#8a5530'));
  face(p, hx, hy + 0.5, 1);
  sparkle(p, hx + 16, hy - 12, 2.6);
  sparkle(p, hx - 17, hy - 2, 2);
};

/** A little wooden stand with a tap, a coiled green hose reel and a big round watering can with a face. */
const wateringStation: Painter = (p) => {
  const c = p.center;
  p.shadow(c.x, c.y + 2, 22, 8, 0.26);
  const top = 10;
  p.box(0.1, 0.12, 0.8, 0.78, top, '#f2c98a');
  // standpipe and tap at the back
  const sp = p.iso(0.2, 0.2, top);
  p.rect(sp.x - 2, sp.y - 22, 4, 22, SILVER);
  p.ellipse(sp.x, sp.y - 22, 4, 2.2, '#ff6b8b');
  stroke(p, { x: sp.x, y: sp.y - 13 }, { x: sp.x + 9, y: sp.y - 16 }, SILVER, 2);
  p.ellipse(sp.x + 9.5, sp.y - 13, 1.3, 2.2, '#5fc3ef', null);
  // coiled green hose reel on the right
  const rl = p.iso(0.85, 0.4, top);
  p.cylinder(rl.x, rl.y, 7.5, 9, '#3fa6e0');
  thin(p, 1.6, () => {
    for (let k = 0; k < 3; k++) p.ellipse(rl.x, rl.y - 3 - k * 2.2, 5.5, 2.8, null, LEAF_D, 0);
  });
  thick(p, { x: rl.x + 6, y: rl.y }, { x: rl.x + 12, y: rl.y + 10 }, { x: rl.x + 4, y: rl.y + 13 }, LEAF, 2);
  // big round watering can with a face, handle and spout drawn behind the body
  const wc = p.iso(0.42, 0.8, top);
  thick(p, { x: wc.x - 9, y: wc.y - 10 }, { x: wc.x - 2, y: wc.y - 27 }, { x: wc.x + 7, y: wc.y - 12 }, '#5fc3ef', 2.2);
  thick(p, { x: wc.x + 8, y: wc.y - 2 }, { x: wc.x + 12, y: wc.y - 10 }, { x: wc.x + 15, y: wc.y - 15 }, '#5fc3ef', 2.6);
  p.ellipse(wc.x + 16, wc.y - 16, 3.2, 2, '#5fc3ef', O, -0.8);
  for (const [dx, dy] of [
    [-1.2, 0],
    [0.4, 0.8],
    [1.6, -0.6],
  ] as const) {
    p.circle(wc.x + 16 + dx, wc.y - 16 + dy, 0.5, INK, null);
  }
  p.cylinder(wc.x, wc.y, 11, 14, '#5fc3ef');
  face(p, wc.x, wc.y - 7, 1);
  // puddle with sparkles
  p.ellipse(wc.x - 2, wc.y + 6, 15, 5, rgba('#5fc3ef', 0.4), null);
  p.circle(wc.x + 12, wc.y + 5, 1.2, '#9fe0ff', null);
  sparkle(p, wc.x - 15, wc.y + 1, 2.2);
  sparkle(p, c.x + 19, c.y - 22, 2.2);
};

/** A cute pegboard on two little legs with tools hanging from pegs by bright handles. */
const toolRack: Painter = (p) => {
  const c = p.center;
  p.shadow(c.x, c.y + 2, 17, 7, 0.26);
  const bz = 8;
  for (const u of [0.18, 0.72]) p.box(u, 0.22, 0.08, 0.08, bz, WOOD_D);
  p.box(0.1, 0.22, 0.8, 0.08, 46, '#f7d38c', bz);
  for (let i = 0; i < 5; i++) {
    for (const z of [14, 24, 34, 44]) {
      const q = p.iso(0.2 + i * 0.15, 0.3, z);
      p.circle(q.x, q.y, 0.9, shade(WOOD_D, -0.1), null);
    }
  }
  const at = (u: number, z: number) => p.iso(u, 0.33, z);
  // trowel: pink handle, silver blade
  stroke(p, at(0.27, 46), at(0.27, 30), '#ff6b8b', 2.8);
  p.poly([at(0.25, 30), at(0.22, 22), at(0.27, 17), at(0.32, 22), at(0.29, 30)], SILVER);
  // rake: green handle and three tines
  stroke(p, at(0.44, 50), at(0.44, 24), '#5cbf4f', 2.6);
  for (const u of [0.4, 0.44, 0.48]) p.line([at(u, 24), at(u, 15)], SILVER, 1.2);
  // fork: blue handle and three tines
  stroke(p, at(0.62, 46), at(0.62, 26), '#4fb3e8', 2.6);
  for (const u of [0.58, 0.62, 0.66]) p.line([at(u, 26), at(u, 17)], SILVER, 1.2);
  // coiled yellow twine on a peg
  const tw = at(0.8, 36);
  for (let k = 0; k < 3; k++) p.ellipse(tw.x, tw.y - k * 2, 4.2, 2.2, '#ffd23f', O);
  p.line([{ x: tw.x + 3, y: tw.y }, { x: tw.x + 5, y: tw.y + 9 }], '#ffd23f', 1.4);
  // pink gloves hanging from the top corner
  const g = at(0.84, 48);
  p.ball(g.x - 2.5, g.y, 2.6, '#ff8fb1');
  p.ball(g.x + 2.5, g.y + 1, 2.6, '#ff8fb1');
  sparkle(p, c.x + 18, c.y - 30, 2.4);
};

/** A ring cage of wire rounds around a bushy tomato plant with red fruit. */
const tomatoCage: Painter = (p) => {
  const c = p.center;
  p.shadow(c.x, c.y + 1, 15, 6.5, 0.26);
  p.ellipse(c.x, c.y + 1, 11, 5, '#7a5238', O);
  const rods = [-10, -4, 2, 8];
  for (const dx of rods) {
    if (dx < 0) thin(p, 1, () => p.line([{ x: c.x + dx, y: c.y - 2 }, { x: c.x + dx * 0.9, y: c.y - 48 }], '#9aa7ad', 1.6));
  }
  for (const z of [14, 30, 46]) {
    thin(p, 1.2, () => p.ellipse(c.x, c.y - z, 11, 5, null, '#9aa7ad', 0));
  }
  p.foliage(c.x, c.y - 26, 12, LEAF, 'tomcage', 7);
  for (const dx of rods) {
    if (dx >= 0) thin(p, 1, () => p.line([{ x: c.x + dx, y: c.y - 2 }, { x: c.x + dx * 0.9, y: c.y - 48 }], '#9aa7ad', 1.6));
  }
  const fruit: [number, number, number][] = [
    [-6, -12, 3.2],
    [5, -18, 3],
    [-1, -30, 3],
    [6, -6, 3.1],
    [-7, -32, 2.8],
  ];
  for (const [dx, dy, r] of fruit) {
    const x = c.x + dx;
    const y = c.y + dy;
    p.ball(x, y, r, '#ff4d4d');
    p.star(x, y - r * 0.85, 1.3, LEAF_D, null);
    p.circle(x - r * 0.35, y - r * 0.3, 0.6, 'rgba(255,255,255,0.7)', null);
  }
  face(p, c.x + 5, c.y - 18, 0.6);
  sparkle(p, c.x + 15, c.y - 42, 2.4);
};

/** Bamboo tripod with beans climbing up it, flowers and a little pot at the base. */
const beanTeepee: Painter = (p) => {
  const c = p.center;
  p.shadow(c.x, c.y + 3, 15, 6.5, 0.26);
  const top = { x: c.x, y: c.y - 62 };
  const bamboo = '#cdb36a';
  const backL = { x: c.x - 13, y: c.y - 2 };
  const backR = { x: c.x + 13, y: c.y - 2 };
  const front = { x: c.x, y: c.y + 8 };
  thick(p, backL, { x: (backL.x + top.x) / 2, y: (backL.y + top.y) / 2 }, top, bamboo, 2.2);
  thick(p, backR, { x: (backR.x + top.x) / 2, y: (backR.y + top.y) / 2 }, top, bamboo, 2.2);
  for (const [a, b] of [
    [0.2, 0.3],
    [0.5, 0.7],
  ] as const) {
    const pa = { x: backL.x + (top.x - backL.x) * a, y: backL.y + (top.y - backL.y) * a };
    const pb = { x: backR.x + (top.x - backR.x) * b, y: backR.y + (top.y - backR.y) * b };
    leafAt(p, pa.x, pa.y, 7, UP - 1.1, 2.8, LEAF);
    leafAt(p, pb.x, pb.y, 7, UP + 1.1, 2.8, shade(LEAF, 0.1));
  }
  p.rect(c.x - 2, c.y - 34, 5, 4, '#ff6b8b', O);
  pot(p, c.x, c.y + 8, 8, 6, '#e8834f');
  thick(p, front, { x: front.x - 2, y: front.y - 30 }, top, bamboo, 2.4);
  const beans: [number, number][] = [
    [-8, -16],
    [4, -26],
    [-4, -38],
    [8, -10],
  ];
  for (const [dx, dy] of beans) {
    const x = c.x + dx;
    const y = c.y + dy;
    leafAt(p, x, y, 6.5, UP - 0.5 + dx * 0.05, 2.6, LEAF_D);
    leafAt(p, x, y, 6, UP + 0.9, 2.4, LEAF);
    p.ellipse(x - 2, y + 4, 1.4, 4.5, '#7bd36a', O, 0.3);
  }
  for (const [dx, dy] of [
    [-3, -30],
    [5, -14],
  ] as const) {
    const x = c.x + dx;
    const y = c.y + dy;
    p.flower(x, y, 3.2, '#ff8fb1', '#fff3a6');
  }
  sparkle(p, c.x + 12, c.y - 50, 2.4);
};

/** Wooden bed on legs of soil with cabbages, lettuce and carrots (some smiling). */
const raisedVegBed: Painter = (p) => {
  const c = p.center;
  p.shadow(c.x, c.y + 2, 30, 10, 0.26);
  const h = 12;
  p.box(0.1, 0.1, 1.8, 0.8, h, WOOD);
  for (const z of [4, 8]) p.line([p.iso(0.1, 0.9, z), p.iso(1.9, 0.9, z)], shade(WOOD, -0.35), 0.8);
  p.diamond(0.14, 0.14, 1.72, 0.72, SOIL, O, h);
  const spots: [number, number, string][] = [
    [0.5, 0.45, 'cabbage'],
    [1.1, 0.35, 'carrot'],
    [1.6, 0.55, 'lettuce'],
    [0.9, 0.7, 'carrot'],
    [1.35, 0.25, 'cabbage'],
  ];
  spots.sort((a, b) => a[0] + a[1] - (b[0] + b[1]));
  for (const [u, v, kind] of spots) {
    const s = p.iso(u, v, h);
    if (kind === 'cabbage') {
      p.ellipse(s.x, s.y + 1, 8, 3.2, shade(SOIL, -0.2), null);
      for (let k = 0; k < 5; k++) {
        const a = UP + (k - 2) * 0.5;
        leafAt(p, s.x, s.y - 2, 8, a, 3.6, shade('#7fcf6a', (k % 2) * 0.08));
      }
      p.ball(s.x, s.y - 6, 5, '#8fdc74');
      face(p, s.x, s.y - 6, 0.6);
    } else if (kind === 'carrot') {
      for (const a of [UP - 0.5, UP, UP + 0.5]) leafAt(p, s.x, s.y - 4, 7, a, 2, LEAF);
      p.poly([{ x: s.x - 4, y: s.y - 5 }, { x: s.x + 4, y: s.y - 5 }, { x: s.x, y: s.y + 4 }], '#ff9a3c');
      p.line([{ x: s.x - 2.5, y: s.y - 3 }, { x: s.x, y: s.y + 2 }], shade('#ff9a3c', -0.3), 0.6);
      face(p, s.x, s.y - 5, 0.5);
    } else {
      for (const [dx, dy, rr] of [
        [-3.5, -1, 5],
        [3.5, -1, 5],
        [0, -3, 5.5],
      ] as const) {
        p.ellipse(s.x + dx, s.y + dy, rr, rr * 0.7, shade('#a6e07a', dx < 0 ? 0.05 : -0.05), O);
      }
      p.ellipse(s.x, s.y - 3, 3, 2, '#d4f5a8', null);
    }
  }
  sparkle(p, c.x + 26, c.y - 20, 2.4);
};

/** One smiling veggie standing on (x, y): carrot, radish, eggplant or tomato. */
function friend(p: Pen, kind: string, x: number, y: number): void {
  if (kind === 'carrot') {
    for (const a of [UP - 0.5, UP, UP + 0.5]) leafAt(p, x, y - 14, 8, a, 2.4, LEAF);
    p.poly([{ x: x - 4.6, y: y - 15 }, { x: x + 4.6, y: y - 15 }, { x: x + 0.8, y: y + 1 }, { x: x - 0.8, y: y + 1 }], '#ff9a3c');
    p.line([{ x: x - 3.5, y: y - 8 }, { x: x + 3.5, y: y - 8.5 }], shade('#ff9a3c', -0.3), 0.6);
    face(p, x, y - 10, 0.55);
  } else if (kind === 'radish') {
    for (const a of [UP - 0.6, UP + 0.6]) leafAt(p, x, y - 12, 8, a, 2.6, LEAF);
    p.ellipse(x, y - 1, 2.6, 1.6, '#fff5f5', O);
    p.ball(x, y - 7, 6, '#ff4d6d');
    face(p, x - 0.5, y - 7, 0.55);
  } else if (kind === 'eggplant') {
    p.line([{ x, y: y - 14 }, { x, y: y - 18 }], LEAF_D, 1.6);
    p.ellipse(x, y - 8, 6, 8, radial(p, x, y - 8, 7, '#9b6fdc'));
    p.ellipse(x, y - 14.5, 5, 2.4, LEAF, O);
    face(p, x, y - 8, 0.6);
  } else {
    p.ball(x, y - 6, 6, '#ff4d4d');
    p.star(x, y - 11, 2.4, LEAF_D, O);
    face(p, x, y - 5.5, 0.6);
  }
}

/** A wooden planter with four veggie friends (carrot, radish, eggplant, tomato), all smiling. */
const veggieFriends: Painter = (p) => {
  const c = p.center;
  p.shadow(c.x, c.y + 2, 17, 7, 0.28);
  const z = 12;
  p.box(0.08, 0.3, 0.84, 0.44, z, WOOD);
  p.line([p.iso(0.08, 0.74, 4), p.iso(0.92, 0.74, 4)], shade(WOOD, -0.35), 0.8);
  p.diamond(0.12, 0.34, 0.76, 0.36, SOIL, O, z);
  const crew: [number, number, string][] = [
    [0.22, 0.5, 'carrot'],
    [0.42, 0.42, 'radish'],
    [0.62, 0.56, 'eggplant'],
    [0.8, 0.44, 'tomato'],
  ];
  crew.sort((a, b) => a[0] + a[1] - (b[0] + b[1]));
  for (const [u, v, kind] of crew) {
    const s = p.iso(u, v, z);
    friend(p, kind, s.x, s.y + 1);
  }
  sparkle(p, c.x + 17, c.y - 26, 2.4);
};

/** A light wooden rack with seven bright seed packets (four on one face, three on the other) with tiny pictures. */
const seedPacketStand: Painter = (p) => {
  const c = p.center;
  p.shadow(c.x, c.y + 2, 17, 6.5, 0.26);
  p.box(0.1, 0.2, 0.7, 0.6, 3, '#f2c98a');
  const left = (t: number, z: number) => p.iso(t, 0.8, z);
  const right = (t: number, z: number) => p.iso(0.8, t, z);
  // top rails and corner posts
  stroke(p, left(0.1, 46), left(0.8, 46), '#f2c98a', 2.2);
  stroke(p, right(0.2, 46), right(0.8, 46), '#f2c98a', 2.2);
  post(p, left(0.1, 0).x, left(0.1, 0).y, 48, 3);
  post(p, left(0.8, 0).x, left(0.8, 0).y, 48, 3);
  post(p, right(0.2, 0).x, right(0.2, 0).y, 48, 3);
  const cols = ['#ff6b8b', '#ffb347', '#5cbf4f', '#4fb3e8', '#b57bff', '#ffd23f', '#ff8a5c'];
  for (let i = 0; i < 4; i++) packet(p, cols[i], i, left, 0.12 + i * 0.18, 0.27 + i * 0.18, 40);
  for (let i = 0; i < 3; i++) packet(p, cols[4 + i], 4 + i, right, 0.22 + i * 0.2, 0.38 + i * 0.2, 40);
  // a tiny sprout pot on top
  const top = p.iso(0.45, 0.5, 3);
  pot(p, top.x, top.y + 1, 4.5, 4.5, '#e8834f');
  sprout(p, top.x, top.y - 3, 4, LEAF);
  sparkle(p, c.x + 18, c.y - 16, 2.2);
};

/** A potting table on legs with a soil bag, a seedling pot and a trowel. */
const pottingBench: Painter = (p) => {
  const c = p.center;
  p.shadow(c.x, c.y + 2, 30, 10, 0.26);
  const top = 22;
  for (const [u, v] of [
    [0.15, 0.15],
    [1.75, 0.15],
    [0.15, 0.7],
    [1.75, 0.7],
  ] as const) {
    p.box(u, v, 0.1, 0.1, top, WOOD_D);
  }
  p.box(0.08, 0.06, 1.84, 0.84, 4, WOOD, top);
  // soil bag with a label and a trowel poking out
  p.box(0.3, 0.3, 0.4, 0.32, 12, '#8a5a3c', top + 4);
  const bag = p.iso(0.5, 0.62, top + 16);
  p.rect(bag.x - 4, bag.y - 4, 8, 5, WHITE, O);
  face(p, bag.x, bag.y - 8.4, 0.3);
  p.line([p.iso(0.62, 0.42, top + 30), p.iso(0.66, 0.38, top + 16)], WOOD, 2);
  p.poly([p.iso(0.62, 0.42, top + 30), p.iso(0.6, 0.42, top + 37), p.iso(0.66, 0.44, top + 38), p.iso(0.68, 0.42, top + 33)], SILVER);
  // seedling pots
  const a = p.iso(1.25, 0.4, top + 4);
  pot(p, a.x, a.y, 7, 8);
  const b = p.iso(1.55, 0.45, top + 4);
  pot(p, b.x, b.y, 5.5, 6);
  sprout(p, b.x, b.y - 6, 4.5, '#7ed957');
  sparkle(p, c.x + 14, c.y - 24, 2.4);
};

/** A pocket pot with strawberries spilling from the sides and a smiling face. */
const strawberryPot: Painter = (p) => {
  const c = p.center;
  p.shadow(c.x, c.y + 1, 14, 6.5, 0.28);
  const y = c.y + 2;
  const berry = (x: number, by: number, r: number) => {
    const ctx = p.ctx;
    ctx.beginPath();
    ctx.moveTo(x, by + r * 1.3);
    ctx.bezierCurveTo(x - r * 1.6, by + r * 0.2, x - r * 1.1, by - r * 1.05, x, by - r * 0.75);
    ctx.bezierCurveTo(x + r * 1.1, by - r * 1.05, x + r * 1.6, by + r * 0.2, x, by + r * 1.3);
    ctx.closePath();
    fs(p, radial(p, x, by, r * 1.5, '#ff4d5e'), O, 0.9);
    p.star(x, by - r * 0.7, r * 0.9, LEAF_D, null);
    p.circle(x - r * 0.4, by, 0.35, '#ffe98a', null);
    p.circle(x + r * 0.4, by + r * 0.5, 0.35, '#ffe98a', null);
  };
  pot(p, c.x, y, 12, 22, '#f0925f');
  for (const [dx, dy] of [
    [-7, -10],
    [7, -10],
  ] as const) {
    p.ellipse(c.x + dx, y + dy, 4.2, 3.2, shade('#f0925f', -0.3), O);
  }
  face(p, c.x, y - 16, 0.8);
  berry(c.x - 7, y - 2, 2.6);
  berry(c.x + 7, y + 1, 2.6);
  for (const [dx, dy] of [
    [-3, -30],
    [3, -28],
  ] as const) {
    leafAt(p, c.x + dx, y - 22 + dy * 0.2, 6, UP + (dx < 0 ? -0.8 : 0.8), 2.2, LEAF);
  }
  berry(c.x - 3, y - 27, 2.2);
  berry(c.x + 4, y - 25, 2.2);
  sparkle(p, c.x + 15, y - 30, 2.2);
};

/** A little wooden apron and straw hat hanging from a hook post. */
const apronHook: Painter = (p) => {
  const c = p.center;
  p.shadow(c.x, c.y + 1, 9, 4, 0.26);
  post(p, c.x, c.y + 1, 60, 3.5);
  p.line([{ x: c.x - 13, y: c.y - 50 }, { x: c.x + 13, y: c.y - 50 }], WOOD_D, 2.4);
  p.ellipse(c.x - 9, c.y - 49, 1.2, 1.2, SILVER, O);
  p.ellipse(c.x + 9, c.y - 49, 1.2, 1.2, SILVER, O);
  // straw hat on the right
  p.ellipse(c.x + 8, c.y - 40, 9, 3.2, '#f6d58a', O);
  p.ellipse(c.x + 8, c.y - 44, 5, 4.4, '#ffe3a0', O);
  p.line([{ x: c.x + 3, y: c.y - 42 }, { x: c.x + 13, y: c.y - 42 }], '#ff8fa8', 1.8);
  // apron on the left
  const ax = c.x - 6;
  p.ctx.beginPath();
  p.ctx.moveTo(ax - 7, c.y - 47);
  p.ctx.bezierCurveTo(ax - 8, c.y - 34, ax - 9, c.y - 22, ax - 9, c.y - 15);
  p.ctx.lineTo(ax + 9, c.y - 15);
  p.ctx.bezierCurveTo(ax + 9, c.y - 22, ax + 8, c.y - 34, ax + 7, c.y - 47);
  p.ctx.closePath();
  fs(p, hgrad(p, ax - 9, ax + 9, '#8fe0cc', '#5cc7b0'), O, 1);
  p.roundRect(ax - 5, c.y - 27, 10, 8, 2, '#c9f2e6', O);
  p.flower(ax + 3, c.y - 30, 2, '#ff8fa8', '#fff3a6');
  face(p, ax - 1, c.y - 35, 0.6);
  sparkle(p, c.x + 15, c.y - 56, 2.2);
};

/** A low wooden frame with a tilted glass lid, seedlings inside and shine on the glass. */
const coldFrame: Painter = (p) => {
  const c = p.center;
  p.shadow(c.x, c.y + 2, 16, 6.5, 0.28);
  const h = 12;
  p.box(0.08, 0.08, 0.84, 0.84, h, { top: SOIL, left: WOOD, right: shade(WOOD, -0.22) });
  const cols = ['#5cbf4f', '#7ed957', '#63c255', '#8cd45a'];
  [
    [0.3, 0.3],
    [0.6, 0.36],
    [0.36, 0.64],
    [0.66, 0.66],
  ].forEach(([u, v], i) => {
    const s = p.iso(u, v, h);
    sprout(p, s.x, s.y + 1, 4.6, cols[i]);
  });
  const lid = [p.iso(0.08, 0.08, 26), p.iso(0.92, 0.08, 26), p.iso(0.92, 0.92, h + 1), p.iso(0.08, 0.92, h + 1)];
  p.poly(lid, rgba('#bfe8ff', 0.5), O, 1);
  p.line([lid[0], lid[3]], shade('#bfe8ff', 0.6), 1);
  p.line([p.iso(0.3, 0.1, 25), p.iso(0.1, 0.3, 13)], rgba('#ffffff', 0.9), 2);
  p.line([p.iso(0.5, 0.1, 22), p.iso(0.3, 0.3, 13)], rgba('#ffffff', 0.6), 1);
  sparkle(p, c.x + 16, c.y - 18, 2.4);
};

/** A cute bee house: a wooden cottage with a pitched roof, round bamboo tube holes and two fuzzy bees. */
const beeHotel: Painter = (p) => {
  const c = p.center;
  p.shadow(c.x, c.y + 2, 16, 6.5, 0.26);
  p.box(0.16, 0.16, 0.68, 0.68, 22, '#f2c98a');
  for (const z of [5, 11, 17]) {
    for (const u of [0.28, 0.44, 0.6]) {
      const q = p.iso(u, 0.84, z);
      p.ellipse(q.x, q.y, 2.5, 1.8, '#e8c77a', O, -0.46);
      p.ellipse(q.x, q.y, 1.1, 0.75, INK, null, -0.46);
    }
  }
  p.gableRoof(0.16, 0.16, 0.68, 0.68, 22, 15, '#e05a47', '#f2c98a', 0.1);
  const b1 = p.iso(1.0, 0.62, 10);
  bee(p, b1.x, b1.y, 4.2);
  const b2 = p.iso(0.4, 1.1, 30);
  bee(p, b2.x, b2.y, 3.6);
  sparkle(p, c.x + 20, c.y - 36, 2.2);
};

/** A round red cottage with black spots, an arched door, a cone roof and a smiling ladybug on the roof. */
const ladybugHouse: Painter = (p) => {
  const c = p.center;
  p.shadow(c.x, c.y + 2, 16, 6.5, 0.26);
  const base = c.y + 2;
  const wall = 22;
  p.cylinder(c.x, base, 14, wall, '#ef4b3e');
  const rimY = base - wall;
  for (const [dx, dy] of [
    [-8, -6],
    [5, -12],
    [-2, -16],
    [9, -4],
  ] as const) {
    p.circle(c.x + dx, base - 10 + dy, 2.2, INK, null);
  }
  p.roundRect(c.x - 4, base - 10, 8, 10, 3.5, '#ffe6a6', O);
  // cone roof with a soft front edge
  const cc = p.ctx;
  cc.beginPath();
  cc.moveTo(c.x - 16, rimY);
  cc.lineTo(c.x, rimY - 20);
  cc.lineTo(c.x + 16, rimY);
  cc.ellipse(c.x, rimY, 16, 6, 0, 0, Math.PI, false);
  cc.closePath();
  fs(p, '#3d3050', O, 1);
  p.line([{ x: c.x - 9, y: rimY - 6 }, { x: c.x - 3, y: rimY - 16 }], rgba('#ffffff', 0.35), 1.6);
  // ladybug friend on the roof slope
  const lx = c.x + 10;
  const ly = rimY - 8;
  p.line([{ x: lx - 1, y: ly - 4 }, { x: lx - 3, y: ly - 8 }], INK, 0.8);
  p.line([{ x: lx + 1, y: ly - 4 }, { x: lx + 3, y: ly - 8 }], INK, 0.8);
  p.ball(lx, ly, 4.6, '#ff3b30');
  p.circle(lx - 2.6, ly + 1, 1, INK, null);
  p.circle(lx + 2.6, ly + 1.4, 1, INK, null);
  p.circle(lx, ly + 3, 0.9, INK, null);
  face(p, lx, ly - 0.8, 0.5);
  sparkle(p, c.x - 14, rimY - 14, 2.2);
};

/** A three-tier wooden stand with clay pots of flowers on each shelf. */
const tieredPlantStand: Painter = (p) => {
  const c = p.center;
  p.shadow(c.x, c.y + 2, 16, 7, 0.28);
  const base = c.y + 1;
  p.cylinder(c.x, base, 14, 4, WOOD);
  pot(p, c.x - 8, base - 3, 5, 6);
  pot(p, c.x + 8, base - 3, 5, 6, '#f0925f');
  p.foliage(c.x - 8, base - 12, 4.2, LEAF, 'tier1a', 5);
  p.foliage(c.x + 8, base - 12, 4.2, LEAF, 'tier1b', 5);
  p.flower(c.x - 8, base - 17, 2.6, '#ff8fb1');
  p.flower(c.x + 8, base - 17, 2.6, '#ffd23f');
  p.rect(c.x - 1.5, base - 42, 3, 38, WOOD_D);
  p.cylinder(c.x, base - 24, 10, 3, shade(WOOD, 0.1));
  pot(p, c.x, base - 25, 5.5, 6, '#ffb347');
  p.foliage(c.x, base - 33, 4.6, '#6cc35a', 'tier2', 5);
  p.cylinder(c.x, base - 44, 6, 3, WOOD);
  sprout(p, c.x, base - 47, 6, '#7ed957');
  p.flower(c.x + 5, base - 58, 2.6, '#ff8fb1');
  sparkle(p, c.x + 15, base - 46, 2.4);
};

/** A green compost bin with a lid, and a smiling pink worm peeking out of the top. */
const wormBin: Painter = (p) => {
  const c = p.center;
  p.shadow(c.x, c.y + 2, 13, 6, 0.28);
  p.box(0.18, 0.18, 0.64, 0.64, 20, '#7cc96b');
  p.box(0.14, 0.14, 0.72, 0.72, 4, '#5ab356', 20);
  const top = p.iso(0.5, 0.5, 24);
  p.ellipse(top.x, top.y, 4, 2, shade(SOIL, -0.1), O);
  p.curve({ x: top.x - 2, y: top.y }, { x: top.x - 9, y: top.y - 12 }, { x: top.x + 2, y: top.y - 20 }, O, 6.4);
  p.curve({ x: top.x - 2, y: top.y }, { x: top.x - 9, y: top.y - 12 }, { x: top.x + 2, y: top.y - 20 }, '#ff9fb0', 4.6);
  p.ball(top.x + 2, top.y - 22, 5, '#ff9fb0');
  face(p, top.x + 2.5, top.y - 22.5, 0.6);
  for (const [dx, dy] of [
    [-10, 3],
    [8, 4],
    [-4, 7],
  ] as const) {
    p.ellipse(c.x + dx, c.y + dy, 2, 1.2, shade(SOIL, 0.1), null, 0.4);
  }
  sparkle(p, c.x + 15, c.y - 30, 2.2);
};

/** A two-tile wooden cart with wheels, carrying three buckets of bright flowers. */
const flowerCart: Painter = (p) => {
  const c = p.center;
  p.shadow(c.x, c.y + 2, 30, 10, 0.26);
  p.box(0.2, 0.25, 1.6, 0.5, 10, WOOD, 6);
  for (const u of [0.5, 1.5]) {
    const q = p.iso(u, 0.78, 6);
    p.circle(q.x, q.y, 5.5, WOOD_D);
    p.circle(q.x, q.y, 2, SILVER, O);
    p.line([{ x: q.x, y: q.y - 4.5 }, { x: q.x, y: q.y + 4.5 }], shade(WOOD_D, -0.3), 1);
    p.line([{ x: q.x - 4.5, y: q.y }, { x: q.x + 4.5, y: q.y }], shade(WOOD_D, -0.3), 1);
  }
  const buckets: [number, number, string, string][] = [
    [0.45, 0.5, '#ff8fb1', '#ff5c8a'],
    [1.0, 0.5, '#7bd3ea', '#ffd23f'],
    [1.55, 0.5, '#ffd66b', '#b57bff'],
  ];
  for (const [u, v, bucket, petal] of buckets) {
    const b = p.iso(u, v, 16);
    p.cylinder(b.x, b.y, 6, 8, bucket);
    p.flower(b.x, b.y - 13, 5.2, petal, '#fff3a6');
    p.flower(b.x + 3, b.y - 9, 3, shade(petal, 0.2), '#ffffff');
  }
  sparkle(p, c.x + 20, c.y - 30, 2.4);
  sparkle(p, c.x - 20, c.y - 16, 2);
};

/** A shrub of purple flower spikes with two fluttering butterflies. */
const butterflyBush: Painter = (p) => {
  const c = p.center;
  p.shadow(c.x, c.y + 2, 14, 6.5, 0.26);
  const base = c.y + 2;
  pot(p, c.x, base, 9, 10, '#7fc8f0');
  p.foliage(c.x, base - 24, 15, '#5cbf4f', 'butterfly', 9);
  for (const [dx, dy] of [
    [-9, -40],
    [0, -46],
    [9, -38],
    [-4, -30],
    [6, -28],
  ] as const) {
    const x = c.x + dx;
    const y = base + dy;
    p.ellipse(x, y, 1.9, 4.2, '#b57bff', O, dx * 0.02);
    p.circle(x, y - 2.5, 0.8, '#ffffff', null);
    p.circle(x, y + 1, 0.8, '#ffffff', null);
  }
  for (const [dx, dy, col, rot] of [
    [-16, -28, '#ff8fd0', -0.4],
    [17, -42, '#ffd66b', 0.4],
  ] as const) {
    const x = c.x + dx;
    const y = base + dy;
    p.ellipse(x - 2.5, y, 2.6, 2.2, col, O, rot);
    p.ellipse(x + 2.5, y, 2.6, 2.2, col, O, -rot);
    p.line([{ x, y: y - 2 }, { x, y: y + 2 }], INK, 1.2);
  }
  sparkle(p, c.x - 17, base - 58, 2.2);
};

/** Kokedama moss balls hanging from a rope bar, each sprouting a little fern. */
const mossBalls: Painter = (p) => {
  const c = p.center;
  p.shadow(c.x, c.y + 2, 12, 5, 0.18);
  const barY = c.y - 58;
  p.line([{ x: c.x - 18, y: barY }, { x: c.x + 18, y: barY }], WOOD_D, 2.4);
  const hangs: [number, number, number, boolean][] = [
    [-12, -14, 8, false],
    [10, -24, 7, true],
    [0, -6, 6, false],
  ];
  for (const [dx, lift, r, smile] of hangs) {
    const x = c.x + dx;
    const y = c.y + lift;
    p.line([{ x: x, y: barY }, { x: x - dx * 0.2, y: y - r }], '#8a6a4a', 1);
    p.ball(x, y, r, '#5fae5a');
    for (let k = 0; k < 7; k++) {
      const a = k * 0.9 + dx;
      p.circle(x + Math.cos(a) * r * 0.6, y + Math.sin(a) * r * 0.55, 1, '#8fd77a', null);
    }
    leafAt(p, x, y - r + 1, 7, UP - 0.9, 2.2, LEAF);
    leafAt(p, x, y - r + 1, 7, UP + 0.9, 2.2, shade(LEAF, 0.1));
    if (smile) face(p, x, y + 1, 0.6);
  }
  sparkle(p, c.x + 18, c.y - 44, 2.2);
};

/** A giant orange pumpkin on a wooden pallet with a blue ribbon rosette. */
const prizePumpkin: Painter = (p) => {
  const c = p.center;
  p.shadow(c.x, c.y + 2, 20, 8, 0.28);
  p.box(0.12, 0.12, 0.76, 0.76, 4, WOOD);
  for (const u of [0.25, 0.5, 0.75]) p.line([p.iso(u, 0.88, 1), p.iso(u, 0.88, 3)], WOOD_D, 0.6);
  const base = p.iso(0.5, 0.5, 4);
  const r = 15;
  const cy = base.y - r * 0.8;
  const side = '#e9702a';
  for (const dx of [-0.45, 0.45]) {
    const sx = base.x + r * dx;
    p.ellipse(sx, cy, r * 0.62, r * 0.82, radial(p, sx, cy, r, shade(side, 0.2)), O);
  }
  p.ellipse(base.x, cy, r * 0.52, r * 0.88, radial(p, base.x, cy, r, '#ff9a3c'), O);
  face(p, base.x, cy + 2, 1.3);
  p.poly(
    [
      { x: base.x - 1.5, y: cy - r * 0.88 + 0.5 },
      { x: base.x - 1, y: cy - r * 0.88 - 4 },
      { x: base.x + 2.5, y: cy - r * 0.88 - 5.5 },
      { x: base.x + 2, y: cy - r * 0.88 + 0.5 },
    ],
    '#5f8d32',
  );
  const rx = base.x + 12;
  const ry = base.y - 4;
  p.line([{ x: rx - 2, y: ry }, { x: rx - 6, y: ry + 8 }], '#2f80ed', 3);
  p.line([{ x: rx + 2, y: ry }, { x: rx + 6, y: ry + 8 }], '#2f80ed', 3);
  p.circle(rx, ry - 2, 5, '#4a9dff');
  p.circle(rx, ry - 2, 2, '#ffffff', null);
  sparkle(p, base.x - 20, cy - 20, 2.6);
};

/** A raised spiral of stacked stones climbing toward the centre, with four herbs planted at its corners. */
const herbSpiral: Painter = (p) => {
  const c = p.center;
  p.shadow(c.x, c.y + 2, 30, 11, 0.24);
  p.diamond(0.02, 0.02, 1.96, 1.96, '#cfc6b5', O);
  p.diamond(0.12, 0.12, 1.76, 1.76, SOIL, null);
  const beds: [number, number, (p: Pen, x: number, y: number) => void, string][] = [
    [0.36, 0.36, herbBasil, '#5cbf4f'],
    [1.64, 0.36, herbRosemary, '#2f7a4a'],
    [0.36, 1.64, herbThyme, '#9bd68a'],
    [1.64, 1.64, herbLavender, '#a77bdb'],
  ];
  for (const [u, v, paint, dot] of beds) {
    const q = p.iso(u, v, 0);
    paint(p, q.x, q.y);
    herbTag(p, q.x, q.y, dot);
  }
  const stones: { u: number; v: number; z: number; r: number }[] = [];
  const n = 40;
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const a = t * Math.PI * 2 * 2.2;
    const rad = 0.8 * (1 - t) + 0.12;
    stones.push({ u: 1 + Math.cos(a) * rad, v: 1 + Math.sin(a) * rad, z: 2 + t * 32, r: 5.2 - t * 2 });
  }
  stones.sort((a, b) => a.u + a.v - (b.u + b.v));
  stones.forEach((s, i) => {
    const q = p.iso(s.u, s.v, s.z);
    p.ball(q.x, q.y, s.r, i % 3 === 0 ? '#e0d6c2' : i % 3 === 1 ? '#cdbfa6' : '#b9ab92');
  });
  sparkle(p, c.x + 26, c.y - 26, 2.4);
};

/** A round rose head: a ring of soft petals with a swirl in the middle. */
function roseHead(p: Pen, x: number, y: number, r: number, col: string): void {
  for (let k = 0; k < 5; k++) {
    const t = (k / 5) * Math.PI * 2;
    p.circle(x + Math.cos(t) * r * 0.5, y + Math.sin(t) * r * 0.5, r * 0.62, col, O);
  }
  p.circle(x, y, r * 0.55, shade(col, -0.12), O);
  p.curve({ x: x - r * 0.3, y }, { x: x + r * 0.3, y: y - r * 0.3 }, { x: x + r * 0.2, y: y + r * 0.2 }, shade(col, -0.4), 0.7);
}

/** A white lattice arch with climbing roses and a little green vine. */
const trellisRoses: Painter = (p) => {
  const c = p.center;
  p.shadow(c.x, c.y + 2, 16, 6.5, 0.26);
  const a = p.iso(0.1, 0.2, 0);
  const b = p.iso(0.9, 0.2, 0);
  const wood = '#f6efe2';
  for (const z of [10, 30, 50]) p.line([p.iso(0.1, 0.2, z), p.iso(0.9, 0.2, z)], wood, 2.2);
  for (let k = 0; k < 6; k++) {
    const u0 = 0.1 + (k * 0.8) / 6;
    const u1 = 0.1 + ((k + 1) * 0.8) / 6;
    p.line([p.iso(u0, 0.2, 10), p.iso(u1, 0.2, 50)], wood, 1.4);
  }
  post(p, a.x, a.y, 58, 3.5);
  post(p, b.x, b.y, 58, 3.5);
  for (const [u, z, col] of [
    [0.3, 40, '#ff6b8b'],
    [0.62, 28, '#ff8fb1'],
    [0.46, 16, '#e5344f'],
    [0.18, 22, '#ffb3c8'],
    [0.8, 46, '#ff6b8b'],
  ] as const) {
    const q = p.iso(u, 0.2, z);
    leafAt(p, q.x, q.y + 2, 6, UP + 0.8, 2.2, LEAF);
    leafAt(p, q.x, q.y + 2, 6, UP - 0.9, 2.2, shade(LEAF, 0.1));
    roseHead(p, q.x, q.y, 4.4, col);
  }
  sparkle(p, c.x + 17, c.y - 40, 2.4);
};

/** A low table with a shallow blue pot holding a curly bonsai. */
const bonsaiTable: Painter = (p) => {
  const c = p.center;
  p.shadow(c.x, c.y + 2, 20, 8, 0.26);
  p.box(0.22, 0.22, 0.56, 0.56, 10, WOOD);
  const t = p.iso(0.5, 0.5, 10);
  pot(p, t.x, t.y + 1, 11, 6, '#7aa7c7');
  p.ellipse(t.x, t.y - 5, 9, 3, SOIL, null);
  thick(p, { x: t.x, y: t.y - 6 }, { x: t.x - 7, y: t.y - 14 }, { x: t.x + 3, y: t.y - 22 }, '#8a5a3c', 3.4);
  p.foliage(t.x + 4, t.y - 27, 9, '#4fa84a', 'bonsai1', 7);
  p.foliage(t.x - 7, t.y - 17, 6, '#5cbf4f', 'bonsai2', 6);
  p.circle(t.x + 10, t.y - 4, 1.4, '#c9c3b5', O);
  sparkle(p, c.x + 18, c.y - 28, 2.4);
};

/** A slim wooden stand with a white pot of arching orchids. */
const orchidStand: Painter = (p) => {
  const c = p.center;
  p.shadow(c.x, c.y + 2, 9, 4, 0.26);
  const base = c.y + 2;
  post(p, c.x, base, 44, 3);
  p.ellipse(c.x, base - 44, 9, 3, WOOD, O);
  pot(p, c.x, base - 46, 7, 7, '#fff8f0');
  const top = base - 46 - 7;
  leafAt(p, c.x, top, 16, UP - 0.9, 3.4, LEAF);
  leafAt(p, c.x, top, 15, UP + 0.8, 3.2, shade(LEAF, 0.1));
  thick(p, { x: c.x, y: top - 2 }, { x: c.x - 10, y: top - 14 }, { x: c.x + 8, y: top - 26 }, '#b8e3a0', 1.6);
  for (const [dx, dy] of [
    [-4, -9],
    [-6, -13],
    [3, -20],
    [6, -23],
  ] as const) {
    const x = c.x + dx;
    const y = top + dy;
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * Math.PI * 2;
      p.circle(x + Math.cos(a) * 2.3, y + Math.sin(a) * 2.3, 1.9, '#ffb8d6', O);
    }
    p.circle(x, y, 1.1, '#e0457e', null);
  }
  sparkle(p, c.x + 14, top - 26, 2.2);
};

/** A giant white turnip with a purple shoulder, leafy top and a happy face. */
const giantTurnip: Painter = (p) => {
  const c = p.center;
  p.shadow(c.x, c.y + 2, 16, 6.5, 0.28);
  p.line([{ x: c.x, y: c.y - 2 }, { x: c.x - 2, y: c.y + 5 }], shade('#fff5f0', -0.25), 1.6);
  for (const a of [UP - 1.1, UP - 0.3, UP + 0.3, UP + 1.1]) leafAt(p, c.x, c.y - 26, 16, a, 4.4, LEAF);
  p.ellipse(c.x, c.y - 22, 13, 9, radial(p, c.x, c.y - 22, 13, '#b56bd6'), O);
  p.ellipse(c.x, c.y - 13, 14, 12.5, radial(p, c.x, c.y - 13, 14, '#fffaf2'), O);
  p.ellipse(c.x - 6, c.y - 17, 2.6, 1.6, rgba('#ffffff', 0.9), null, -0.3);
  face(p, c.x, c.y - 13, 1.2);
  sparkle(p, c.x + 17, c.y - 36, 2.4);
};

/** A rosette of succulent leaves, pale mint with pink-tipped edges. */
function succulent(p: Pen, x: number, y: number, r: number, col: string): void {
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2 - Math.PI / 2;
    leafAt(p, x, y, r, a, r * 0.32, shade(col, (k % 2) * 0.1));
  }
  p.circle(x, y, r * 0.22, '#ffb8c8', null);
}

/** A little red wagon with yellow wheels and four succulents in tiny pots. */
const succulentWagon: Painter = (p) => {
  const c = p.center;
  p.shadow(c.x, c.y + 2, 20, 7, 0.26);
  p.box(0.12, 0.22, 0.76, 0.56, 7, '#e5484d', 6);
  for (const u of [0.3, 0.72]) {
    const q = p.iso(u, 0.8, 5);
    p.circle(q.x, q.y, 4.5, '#ffd23f');
    p.circle(q.x, q.y, 1.6, '#e5484d', O);
  }
  const plants: [number, number, string, string][] = [
    [0.3, 0.38, '#c7f0c0', '#f08fa8'],
    [0.66, 0.34, '#9fe0b0', '#ffd66b'],
    [0.5, 0.56, '#d6f5a0', '#ff8fb1'],
    [0.28, 0.66, '#b8e8c8', '#b49aff'],
  ];
  plants.sort((a, b) => a[0] + a[1] - (b[0] + b[1]));
  for (const [u, v, col, tip] of plants) {
    const b = p.iso(u, v, 13);
    pot(p, b.x, b.y + 1, 4.2, 3.6, '#f6a86b');
    succulent(p, b.x, b.y - 4.5, 4.8, col);
    p.circle(b.x + 1.5, b.y - 7, 1, tip, null);
  }
  sparkle(p, c.x + 18, c.y - 22, 2.2);
};

/** A cute mole gardener sitting on a stone plinth with a straw hat and trowel. */
const moleStatue: Painter = (p) => {
  const c = p.center;
  p.shadow(c.x, c.y + 2, 14, 6, 0.26);
  const base = c.y + 2;
  p.cylinder(c.x, base, 11, 4, '#bdb6aa');
  const bodyBase = base - 4;
  p.ellipse(c.x, bodyBase - 10, 10, 11, radial(p, c.x, bodyBase - 10, 10, '#9c7560'), O);
  p.ball(c.x - 7, bodyBase - 8, 3, '#7d5a48');
  p.ball(c.x + 7, bodyBase - 8, 3, '#7d5a48');
  p.line([{ x: c.x + 6, y: bodyBase - 10 }, { x: c.x + 12, y: bodyBase - 18 }], WOOD, 1.8);
  p.poly([{ x: c.x + 11, y: bodyBase - 17 }, { x: c.x + 14, y: bodyBase - 25 }, { x: c.x + 17, y: bodyBase - 19 }], SILVER);
  const hy = bodyBase - 24;
  p.ellipse(c.x - 6, hy - 2, 2.6, 2.6, '#7d5a48', O);
  p.ellipse(c.x + 6, hy - 2, 2.6, 2.6, '#7d5a48', O);
  p.circle(c.x, hy, 8.5, radial(p, c.x, hy, 8.5, '#a9806a'), O);
  face(p, c.x, hy + 0.8, 0.85);
  p.ellipse(c.x, hy + 4, 2.4, 1.8, '#ffb3c1', O);
  p.ellipse(c.x, hy - 10, 10, 2.6, '#f6d58a', O);
  p.ellipse(c.x, hy - 13, 5.8, 4, '#ffe3a0', O);
  p.line([{ x: c.x - 4.5, y: hy - 14.5 }, { x: c.x + 5, y: hy - 14.5 }], '#ff8fa8', 1.8);
  sparkle(p, c.x - 16, hy - 16, 2.2);
};

/** A grey platform scale with a dial, a big ripe tomato and a blue ribbon. */
const harvestScale: Painter = (p) => {
  const c = p.center;
  p.shadow(c.x, c.y + 2, 16, 6.5, 0.26);
  p.box(0.12, 0.2, 0.76, 0.6, 4, '#b8c4cc');
  const plat = p.iso(0.5, 0.5, 4);
  p.rect(plat.x - 1.5, plat.y - 34, 3, 30, '#9aa8b2');
  p.circle(plat.x, plat.y - 40, 9, '#fffdf6');
  p.line([{ x: plat.x, y: plat.y - 40 }, { x: plat.x + 4, y: plat.y - 44 }], INK, 1.2);
  p.circle(plat.x, plat.y - 40, 1.2, '#e5344f', null);
  p.ball(plat.x, plat.y - 10, 9, '#ff4d4d');
  p.star(plat.x, plat.y - 18.5, 3, LEAF_D, O);
  face(p, plat.x, plat.y - 10, 1);
  p.line([{ x: plat.x + 7, y: plat.y - 26 }, { x: plat.x + 13, y: plat.y - 16 }], '#2f80ed', 3);
  p.circle(plat.x + 14, plat.y - 24, 4.5, '#4a9dff');
  sparkle(p, c.x + 18, c.y - 30, 2.2);
};

/** A glass greenhouse: white-framed light blue panes on walls and a glass roof, with plants inside and potted plants outside. */
const glassGreenhouse: Painter = (p) => {
  const c = p.center;
  p.shadow(c.x, c.y + 3, 46, 16, 0.26);
  const frame = '#fbfdff';
  const glass = rgba('#c4ecff', 0.42);
  const roofGlass = rgba('#d4f3ff', 0.55);
  const wallH = 40;
  const ridgeH = 66;
  p.box(0.08, 0.08, 1.84, 1.84, 4, '#eef6fb');
  // plants and flowers inside, drawn before the glass so they look sheltered
  for (const [u, v, col] of [
    [0.6, 0.6, '#4fa84a'],
    [1.35, 0.55, '#5cbf4f'],
    [0.55, 1.35, '#6cc35a'],
    [1.35, 1.35, '#3f9a3c'],
  ] as const) {
    const q = p.iso(u, v, 5);
    p.foliage(q.x, q.y - 12, 9, col, 'gh' + u + v, 7);
  }
  const f1 = p.iso(0.95, 1.05, 5);
  p.flower(f1.x, f1.y - 26, 3.4, '#ff8fb1', '#fff3a6');
  const f2 = p.iso(1.6, 0.85, 5);
  p.flower(f2.x, f2.y - 20, 3, '#ffd66b', '#ff8a2a');

  const fl = (u: number, z: number) => p.iso(u, 1.92, z);
  const fr = (v: number, z: number) => p.iso(1.92, v, z);
  // back roof slope (faces away from us)
  const eLb = p.iso(0.08, 0.08, wallH);
  const eRb = p.iso(1.92, 0.08, wallH);
  const rA = p.iso(0.08, 1.0, ridgeH);
  const rB = p.iso(1.92, 1.0, ridgeH);
  p.poly([eLb, eRb, rB, rA], rgba('#b6e4fa', 0.45), frame, 1.2);
  // left wall (front-left face): glass with mullions, a rail and a door
  p.poly([fl(0.08, 4), fl(1.92, 4), fl(1.92, wallH), fl(0.08, wallH)], glass, frame, 1.6);
  p.line([fl(0.08, 22), fl(1.92, 22)], frame, 1.4);
  for (const u of [0.5, 1.7]) p.line([fl(u, 4), fl(u, wallH)], frame, 1.4);
  p.poly([fl(0.9, 4), fl(1.3, 4), fl(1.3, 28), fl(0.9, 28)], WOOD, O, 1);
  p.circle(fl(1.22, 15).x, fl(1.22, 15).y, 0.8, '#ffd23f', null);
  p.line([fl(0.2, 36), fl(0.5, 26)], rgba('#ffffff', 0.9), 2);
  p.line([fl(1.0, 36), fl(1.2, 28)], rgba('#ffffff', 0.7), 1.2);
  // right wall (u = 1.92 face) and its gable triangle
  p.poly([fr(0.08, 4), fr(1.92, 4), fr(1.92, wallH), fr(0.08, wallH)], glass, frame, 1.6);
  p.line([fr(0.08, 22), fr(1.92, 22)], frame, 1.4);
  for (const v of [0.6, 1.3]) p.line([fr(v, 4), fr(v, wallH)], frame, 1.4);
  p.line([fr(0.3, 34), fr(0.8, 26)], rgba('#ffffff', 0.9), 2);
  p.poly([eRb, fr(1.92, wallH), rB], roofGlass, frame, 1.2);
  // front roof slope with rafters and shine streaks
  const eLf = fl(0.08, wallH);
  const eRf = fl(1.92, wallH);
  p.poly([eLf, eRf, rB, rA], roofGlass, frame, 1.4);
  for (const u of [0.5, 0.9, 1.3, 1.7]) {
    const e = fl(u, wallH);
    p.line([e, p.iso(u, 1.0, ridgeH)], frame, 1.3);
  }
  const slope = (u: number, s: number) => p.iso(u, 1.92 - 0.92 * s, wallH + (ridgeH - wallH) * s);
  p.line([slope(0.25, 0.2), slope(0.4, 0.6)], rgba('#ffffff', 0.95), 1.8);
  p.line([slope(1.0, 0.3), slope(1.2, 0.7)], rgba('#ffffff', 0.9), 1.6);
  p.line([slope(1.5, 0.2), slope(1.6, 0.5)], rgba('#ffffff', 0.9), 1.4);
  p.line([rA, rB], frame, 2.4);
  // potted plants outside the front and side
  const pa = p.iso(0.35, 1.98, 0);
  pot(p, pa.x, pa.y, 4.6, 6, '#f0925f');
  p.foliage(pa.x, pa.y - 9, 4.5, LEAF, 'ghpa', 6);
  p.flower(pa.x + 3, pa.y - 13, 2, '#ff8fb1', '#fff3a6');
  const pb = p.iso(1.98, 1.2, 0);
  pot(p, pb.x, pb.y, 4.6, 6, '#f0925f');
  p.foliage(pb.x, pb.y - 9, 4.5, '#6cc35a', 'ghpb', 6);
  sparkle(p, c.x + 24, c.y - 46, 3);
  sparkle(p, c.x - 28, c.y - 30, 2.4);
};

/** A two-tile podium with gold, silver and bronze blocks, prize veggies and bunting. */
const gardenShowStage: Painter = (p) => {
  const c = p.center;
  p.shadow(c.x, c.y + 2, 30, 10, 0.26);
  p.box(0.02, 0.2, 1.96, 0.64, 3, '#f4f0ea');
  // bunting strung between two posts at the back
  const pl = p.iso(0.05, 0.1, 0);
  const pr = p.iso(1.95, 0.1, 0);
  post(p, pl.x, pl.y, 50, 3);
  post(p, pr.x, pr.y, 50, 3);
  const bl = p.iso(0.05, 0.1, 46);
  const br = p.iso(1.95, 0.1, 46);
  p.curve(bl, { x: (bl.x + br.x) / 2, y: (bl.y + br.y) / 2 + 9 }, br, '#8a5a3c', 1);
  const flags = ['#ff6b8b', '#ffd23f', '#5cbf4f', '#4fb3e8', '#b57bff', '#ff9a3c'];
  for (let k = 0; k < 6; k++) {
    const t = (k + 0.5) / 6;
    const x = bl.x + (br.x - bl.x) * t;
    const y = bl.y + (br.y - bl.y) * t + Math.sin(t * Math.PI) * 9;
    p.poly([{ x: x - 3, y }, { x: x + 3, y }, { x, y: y + 6 }], flags[k], O, 0.8);
  }
  // podium blocks, back to front
  const blocks: [number, number, number, string, number, string][] = [
    [0.1, 0.25, 14, '#c9d3dc', 2, 'carrot'],
    [0.7, 0.25, 22, '#ffd66b', 1, 'tomato'],
    [1.3, 0.25, 10, '#e0a070', 3, 'radish'],
  ];
  for (const [u, v, ht, col, rank, veg] of blocks) {
    p.box(u, v, 0.6, 0.5, ht, col, 3);
    const front = p.iso(u + 0.3, v + 0.5, 3 + ht / 2);
    p.text(String(rank), front.x, front.y, 9, '#5b3a29');
    const top = p.iso(u + 0.3, v + 0.25, 3 + ht);
    friend(p, veg, top.x, top.y + 1);
  }
  sparkle(p, c.x + 24, c.y - 28, 2.6);
};

// ---------------------------------------------------------------------------
// Table

const ART: Record<string, { h: number; paint: Painter }> = {
  terracotta_stack: { h: 70, paint: terracottaStack },
  seedling_tray: { h: 40, paint: seedlingTray },
  smiling_sunflower_pot: { h: 80, paint: smilingSunflowerPot },
  watering_station: { h: 70, paint: wateringStation },
  tool_rack: { h: 60, paint: toolRack },
  tomato_cage: { h: 60, paint: tomatoCage },
  bean_teepee: { h: 80, paint: beanTeepee },
  raised_veg_bed: { h: 50, paint: raisedVegBed },
  veggie_friends: { h: 62, paint: veggieFriends },
  seed_packet_stand: { h: 60, paint: seedPacketStand },
  potting_bench: { h: 66, paint: pottingBench },
  strawberry_pot: { h: 62, paint: strawberryPot },
  apron_hook: { h: 70, paint: apronHook },
  cold_frame: { h: 56, paint: coldFrame },
  bee_hotel: { h: 62, paint: beeHotel },
  ladybug_house: { h: 64, paint: ladybugHouse },
  tiered_plant_stand: { h: 66, paint: tieredPlantStand },
  worm_bin: { h: 46, paint: wormBin },
  flower_cart: { h: 70, paint: flowerCart },
  butterfly_bush: { h: 80, paint: butterflyBush },
  moss_ball: { h: 70, paint: mossBalls },
  prize_pumpkin: { h: 66, paint: prizePumpkin },
  herb_spiral: { h: 60, paint: herbSpiral },
  trellis_roses: { h: 80, paint: trellisRoses },
  bonsai_table: { h: 62, paint: bonsaiTable },
  orchid_stand: { h: 80, paint: orchidStand },
  giant_turnip: { h: 66, paint: giantTurnip },
  succulent_wagon: { h: 60, paint: succulentWagon },
  mole_statue: { h: 70, paint: moleStatue },
  harvest_scale: { h: 72, paint: harvestScale },
  glass_greenhouse: { h: 100, paint: glassGreenhouse },
  garden_show_stage: { h: 90, paint: gardenShowStage },
};

/** Anything added to the collection without bespoke art gets a smiling potted sprout. */
function fallback(p: Pen): void {
  const c = p.center;
  p.shadow(c.x, c.y + 1, 12, 5, 0.28);
  pot(p, c.x, c.y + 3, 10, 10);
  face(p, c.x, c.y - 3, 0.6);
  sprout(p, c.x, c.y - 9, 5.5);
  sparkle(p, c.x + 13, c.y - 18, 2);
}

export const sprites: SpriteSpec[] = HORTICULTURE_DECORATIONS.map((d) => {
  const art = ART[d.id] ?? { h: 30, paint: fallback };
  return { key: `deco:${d.id}`, fw: d.w, fh: d.h, height: art.h, paint: art.paint };
});

export const icons: IconSpec[] = [];
