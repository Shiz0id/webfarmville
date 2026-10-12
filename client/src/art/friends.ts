// Friendship keepsakes: the gifts your villager friends mail you as you grow
// closer (FRIEND_DECORATIONS), plus the letter and friendship-heart icons.
//
// Same language as kitty_goodies.ts and nature_bugs.ts: chunky rounded shapes,
// the warm brown OUTLINE, soft radial shading with glossy streaks and little
// sparkle glints. Each keepsake is painted on its footprint (w x h tiles).
import { type IconSpec, type Pen, type Pt, type SpriteSpec, OUTLINE, rng, shade } from './kit';
import { FRIEND_DECORATIONS } from '@farm/shared';

const O = OUTLINE;
const TAU = Math.PI * 2;

type Painter = (p: Pen) => void;
type Fill = string | CanvasGradient | null;
type Ctx = CanvasRenderingContext2D;

const CREAM = '#fff4e4';
const WHITE = '#ffffff';
const WOOD = '#d9a066';
const WOOD_L = '#ecc08a';
const WOOD_D = '#9a6638';
const BUTTER = '#ffe49a';
const MINT = '#a8e6cf';
const PINK = '#ffb3cf';
const PINK_D = '#e77fa6';
const PINK_L = '#ffdbe8';
const ROSE = '#d9557f';
const LILAC = '#c9b8f5';
const PEACH = '#ffc49a';
const SKY = '#bfe6f7';
const GOLD = '#ffd24a';
const GOLD_D = '#c98f22';
const HONEY = '#f5b53a';
const HONEY_D = '#d98a14';
const LEAF = '#7cc75e';
const LEAF_D = '#3f9a3c';
const ORANGE = '#f7974a';
const ORANGE_D = '#d9702a';
const PEBBLE = '#c9c0b4';
const MUD_L = '#a8734f';
const MUD = '#7d4f33';
const DARK = '#3b2a22';
const SPARK = '#fff6c0';
const STRAW = '#f2d27a';
const STRAW_D = '#c9963e';
const BARK = '#b98055';
const BARK_D = '#7e5033';
const WICKER = '#e2b67e';
const WICKER_D = '#b9854f';

// ---------------------------------------------------------------------------
// Helpers

/** Fill and/or stroke a free-form path built by `build`. */
function path(p: Pen, fill: Fill, stroke: string | null, build: (c: Ctx) => void, w = 1.1): void {
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
function clipped(p: Pen, clip: (c: Ctx) => void, fn: () => void): void {
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

function vgrad(p: Pen, y0: number, y1: number, stops: [number, string][]): CanvasGradient {
  const g = p.ctx.createLinearGradient(0, y0, 0, y1);
  for (const [t, col] of stops) g.addColorStop(t, col);
  return g;
}

/** A round or oval body, lit from the top left. */
function soft(p: Pen, x: number, y: number, rx: number, ry: number, color: string, stroke: string | null = O): void {
  const g = p.ctx.createRadialGradient(x - rx * 0.3, y - ry * 0.35, Math.min(rx, ry) * 0.1, x, y, Math.max(rx, ry) * 1.1);
  g.addColorStop(0, shade(color, 0.35));
  g.addColorStop(0.6, color);
  g.addColorStop(1, shade(color, -0.25));
  p.ellipse(x, y, rx, ry, g, stroke);
}

/** A glossy streak. */
function shine(p: Pen, x: number, y: number, r: number): void {
  p.ellipse(x, y, r, r * 0.55, 'rgba(255,255,255,0.8)', null, -0.5);
}

/** Five-point sparkle glint. */
function sparkle(p: Pen, x: number, y: number, r: number, fill = SPARK): void {
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
    fill,
    null,
  );
}

/** Run fn with a different outline width (keeps tiny details from turning to ink). */
function thin(p: Pen, w: number, fn: () => void): void {
  const old = p.lineWidth;
  p.lineWidth = w;
  fn();
  p.lineWidth = old;
}

/** An outlined thick stroke (rods, handles, posts, strands). */
function thick(p: Pen, pts: Pt[], w: number, color: string): void {
  p.line(pts, O, w + 1.6);
  p.line(pts, color, w);
}

/** A pointed leaf from (x, y) heading along `ang` for `len` px. */
function leaf(p: Pen, x: number, y: number, len: number, ang: number, w: number, color: string): void {
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
  c.fillStyle = color;
  c.fill();
  c.strokeStyle = O;
  c.lineWidth = 0.9;
  c.stroke();
}

/** A five-lobed maple leaf, pointing up, centred on (x, y) with radius r. */
function maple(p: Pen, x: number, y: number, r: number, color: string): void {
  const pts: Pt[] = [];
  const n = 70;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU;
    const lobe = Math.pow(Math.abs(Math.cos(2.5 * a)), 1.3);
    const rr = r * (0.4 + 0.6 * lobe);
    const aa = a - Math.PI / 2;
    pts.push({ x: x + Math.cos(aa) * rr, y: y + Math.sin(aa) * rr });
  }
  p.line(
    [
      { x, y: y + r * 0.6 },
      { x, y: y + r * 1.5 },
    ],
    '#8a5a3a',
    1.3,
  );
  p.poly(pts, color, O, 0.9);
  p.line(
    [
      { x, y: y + r * 0.55 },
      { x, y: y - r * 0.5 },
    ],
    shade(color, -0.3),
    0.7,
  );
}

/** A tiny bumblebee: striped yellow body, flat white wings, a dot eye. */
function bee(p: Pen, x: number, y: number, s: number): void {
  p.ellipse(x - s * 0.5, y - s * 1.2, s * 0.9, s * 0.55, 'rgba(255,255,255,0.92)', O, -0.4);
  p.ellipse(x + s * 0.4, y - s * 1.3, s * 0.8, s * 0.5, 'rgba(255,255,255,0.92)', O, 0.35);
  soft(p, x, y, s * 1.45, s * 1.05, '#ffd84a', O);
  thin(p, 0.8, () => {
    p.line([{ x: x - s * 0.55, y: y - s * 0.95 }, { x: x - s * 0.55, y: y + s * 0.95 }], DARK, s * 0.4);
    p.line([{ x: x + s * 0.2, y: y - s * 0.9 }, { x: x + s * 0.2, y: y + s * 0.9 }], DARK, s * 0.4);
  });
  p.circle(x + s * 0.95, y - s * 0.15, s * 0.22, DARK, null);
}

/** A flat, rounded rose: a ring of petals around a glossy centre, in any colour. */
function rose(p: Pen, x: number, y: number, r: number, color = ROSE): void {
  p.circle(x, y, r, color, O);
  p.circle(x, y, r * 0.62, shade(color, 0.22), null);
  p.curve({ x: x - r * 0.5, y: y + r * 0.1 }, { x, y: y - r * 0.55 }, { x: x + r * 0.5, y: y + r * 0.1 }, shade(color, -0.4), 0.7);
  p.circle(x - r * 0.35, y - r * 0.4, r * 0.22, 'rgba(255,255,255,0.7)', null);
}

// ---------------------------------------------------------------------------
// Keepsakes (footprints come from FRIEND_DECORATIONS; each painter is drawn
// around the footprint centre, `p.center`).

/** Mayor Maple: a grandfather clock whose face is a sleepy-cute owl. */
const owlClock: Painter = (p) => {
  const { x: cx, y: cy } = p.center;
  p.shadow(cx, cy + 1, 15, 7, 0.26);

  // plinth
  p.roundRect(cx - 13, cy - 5, 26, 6.5, 2.4, WOOD_D);

  // tapered case
  path(
    p,
    hgrad(p, cx - 12, cx + 12, [
      [0, WOOD_L],
      [0.3, WOOD],
      [0.75, shade(WOOD, -0.1)],
      [1, WOOD_D],
    ]),
    O,
    (c) => {
      c.moveTo(cx - 11.5, cy - 4);
      c.lineTo(cx - 9, cy - 50);
      c.lineTo(cx + 9, cy - 50);
      c.lineTo(cx + 11.5, cy - 4);
      c.closePath();
    },
    1.2,
  );
  p.rect(cx - 8, cy - 46, 1.8, 36, 'rgba(255,255,255,0.3)', null);

  // hood with owl ears
  path(
    p,
    hgrad(p, cx - 12.5, cx + 12.5, [
      [0, shade(WOOD_L, 0.1)],
      [0.55, WOOD_L],
      [1, WOOD],
    ]),
    O,
    (c) => {
      c.moveTo(cx - 12.5, cy - 47);
      c.lineTo(cx - 12.5, cy - 57);
      c.lineTo(cx - 9.5, cy - 66);
      c.quadraticCurveTo(cx - 7, cy - 61, cx - 4, cy - 59.5);
      c.lineTo(cx + 4, cy - 59.5);
      c.quadraticCurveTo(cx + 7, cy - 61, cx + 9.5, cy - 66);
      c.lineTo(cx + 12.5, cy - 57);
      c.lineTo(cx + 12.5, cy - 47);
      c.closePath();
    },
    1.2,
  );
  // carved maple leaf on top of the hood
  maple(p, cx, cy - 62, 5.4, ORANGE);

  // brass rim and the owl face (the clock dial)
  p.circle(cx, cy - 39, 12.6, GOLD_D);
  const faceG = p.ctx.createRadialGradient(cx - 3, cy - 44, 1, cx, cy - 39, 12);
  faceG.addColorStop(0, WHITE);
  faceG.addColorStop(0.7, CREAM);
  faceG.addColorStop(1, '#f2dcb8');
  p.circle(cx, cy - 39, 11.2, faceG);

  // big round eyes, each with a glint
  for (const sx of [-1, 1]) {
    const ex = cx + sx * 4.8;
    const ey = cy - 40.5;
    p.circle(ex, ey, 4.3, WHITE, O);
    p.circle(ex + sx * 0.25, ey + 0.5, 2.3, DARK, null);
    p.circle(ex - 0.5, ey - 1, 0.85, WHITE, null);
    p.ellipse(cx + sx * 8.4, cy - 34.6, 1.9, 1.2, 'rgba(255,120,150,0.55)', null);
  }
  // beak
  p.poly(
    [
      { x: cx - 2, y: cy - 36.5 },
      { x: cx + 2, y: cy - 36.5 },
      { x: cx, y: cy - 33.2 },
    ],
    '#f7a04a',
    O,
    0.9,
  );

  // pendulum window
  const wx = cx - 6.5;
  const wy = cy - 27;
  p.roundRect(wx - 1.2, wy - 1.2, 15.4, 19.4, 3.8, WOOD_D);
  const glass = vgrad(p, wy, wy + 17, [
    [0, '#effaff'],
    [0.5, SKY],
    [1, '#8fd0ee'],
  ]);
  p.roundRect(wx, wy, 13, 17, 2.8, glass, null);
  p.line(
    [
      { x: cx, y: wy + 1.5 },
      { x: cx, y: cy - 17 },
    ],
    GOLD_D,
    1,
  );
  soft(p, cx, cy - 14.5, 3.6, 3.6, GOLD);
  shine(p, cx - 1.2, cy - 16, 0.9);
};

/** Mayor's Gazebo: a white octagonal gazebo with a mint roof, on a 2x2 footprint. */
const mayorGazebo: Painter = (p) => {
  const { x: cx, y: cy } = p.center;
  p.shadow(cx, cy + 1, 54, 27, 0.22);

  // platform
  p.box(0.1, 0.1, 1.8, 1.8, 6, { top: '#fff6ea', left: '#eccb9f', right: '#c99d70' }, 0);

  const N = 8;
  const R = 0.8;
  const R2 = 0.9;
  const ang = (i: number) => (i / N) * TAU + Math.PI / 8;
  const col = (i: number) => ({ u: 1 + R * Math.cos(ang(i)), v: 1 + R * Math.sin(ang(i)) });
  const depth = (a: number) => Math.cos(a) + Math.sin(a);

  // order the eight posts from back to front
  const order = [...Array(N).keys()].sort((a, b) => depth(ang(a)) - depth(ang(b)));

  // back posts first
  for (const i of order) {
    const q = col(i);
    const b = p.iso(q.u, q.v, 6);
    const t = p.iso(q.u, q.v, 58);
    p.rect(t.x - 2.3, t.y, 4.6, b.y - t.y, hgrad(p, t.x - 2.3, t.x + 2.3, [[0, WHITE], [0.5, CREAM], [1, '#e2c4a0']]));
    p.ellipse(b.x, b.y, 3.8, 1.9, WOOD);
  }

  // roof: eight triangular faces up to a single apex, back faces first
  const apex = p.iso(1, 1, 92);
  const eave = [...Array(N).keys()].map((i) => {
    const a = ang(i);
    return p.iso(1 + R2 * Math.cos(a), 1 + R2 * Math.sin(a), 58);
  });
  const faces = [...Array(N).keys()].map((i) => {
    const j = (i + 1) % N;
    const mid = (depth(ang(i)) + depth(ang(j))) / 2;
    return { i, j, mid };
  });
  faces.sort((a, b) => a.mid - b.mid);
  for (const f of faces) {
    const a = eave[f.i];
    const b = eave[f.j];
    const cxF = (a.x + b.x + apex.x) / 3;
    const base = cxF < cx - 4 ? shade(MINT, 0.12) : cxF > cx + 4 ? shade(MINT, -0.12) : MINT;
    p.poly([a, b, apex], base, O, 1.1);
    // a pastel stripe down the middle of each panel
    p.line(
      [
        { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
        { x: apex.x + (a.x + b.x - 2 * apex.x) * 0.02, y: apex.y },
      ],
      'rgba(255,255,255,0.35)',
      1.2,
    );
  }

  // scalloped trim along the front eave
  for (const f of faces) {
    if (f.mid < -0.2) continue;
    const a = eave[f.i];
    const b = eave[f.j];
    for (let k = 0; k < 4; k++) {
      const t = (k + 0.5) / 4;
      const x = a.x + (b.x - a.x) * t;
      const y = a.y + (b.y - a.y) * t;
      thin(p, 0.9, () => p.circle(x, y + 1.6, 2.7, '#fffaf2', O));
    }
  }

  // railing and bunting on the front of the platform
  for (let i = 0; i < N; i++) {
    const j = (i + 1) % N;
    if ((depth(ang(i)) + depth(ang(j))) / 2 < -0.2) continue;
    const a = col(i);
    const b = col(j);
    const pa = p.iso(a.u, a.v, 14);
    const pb = p.iso(b.u, b.v, 14);
    thick(p, [pa, pb], 2.4, CREAM);

    const ta = p.iso(a.u, a.v, 52);
    const tb = p.iso(b.u, b.v, 52);
    const ctrl = { x: (ta.x + tb.x) / 2, y: (ta.y + tb.y) / 2 + 13 };
    p.curve(ta, ctrl, tb, '#8a5a3a', 0.9);
    const flags = [PINK, BUTTER, MINT, LILAC, PEACH];
    for (let k = 1; k <= 4; k++) {
      const t = k / 5;
      const x = (1 - t) * (1 - t) * ta.x + 2 * (1 - t) * t * ctrl.x + t * t * tb.x;
      const y = (1 - t) * (1 - t) * ta.y + 2 * (1 - t) * t * ctrl.y + t * t * tb.y;
      p.poly(
        [
          { x: x - 2.6, y: y + 0.4 },
          { x: x + 2.6, y: y + 0.4 },
          { x, y: y + 5.2 },
        ],
        flags[(k + i) % flags.length],
        O,
        0.7,
      );
    }
  }

  // flower boxes on the two front edges of the platform
  const flowerBox = (u: number, v: number, du: number, dv: number, petals: string[]) => {
    p.box(u, v, du, dv, 5, { top: '#e6b783', left: WOOD, right: WOOD_D }, 6);
    for (let k = 0; k < 4; k++) {
      const t = (k + 0.5) / 4;
      const pt = p.iso(u + du * t, v + dv * 0.5, 13);
      p.circle(pt.x, pt.y + 1.2, 2.3, '#8fd17a', null);
      p.flower(pt.x, pt.y - 0.4, 2.7, petals[k % petals.length]);
    }
  };
  flowerBox(0.34, 1.72, 0.7, 0.16, [PINK, WHITE, PINK_D]);
  flowerBox(1.72, 0.34, 0.16, 0.7, [WHITE, PINK, LILAC]);

  // the finial: a gold ball, a pole and a little maple-leaf flag
  thick(p, [apex, { x: apex.x, y: apex.y - 12 }], 1.6, GOLD_D);
  p.poly(
    [
      { x: apex.x, y: apex.y - 12 },
      { x: apex.x + 10, y: apex.y - 9.5 },
      { x: apex.x, y: apex.y - 7 },
    ],
    ORANGE,
    O,
    0.9,
  );
  maple(p, apex.x + 4, apex.y - 9.6, 2.1, WHITE);
  soft(p, apex.x, apex.y, 3, 3, GOLD);
  shine(p, apex.x - 1, apex.y - 1.2, 0.8);
};

/** Bakery Bread Cart: a wooden cart with a striped awning and loaves on top. */
const breadCart: Painter = (p) => {
  const { x: cx, y: cy } = p.center;
  p.shadow(cx, cy + 1, 17, 8, 0.25);

  // back awning poles
  thick(p, [p.iso(0.2, 0.2, 14), p.iso(0.2, 0.2, 38)], 1.8, WOOD_D);
  thick(p, [p.iso(0.8, 0.2, 14), p.iso(0.8, 0.2, 38)], 1.8, WOOD_D);

  // cart body
  p.box(0.18, 0.2, 0.64, 0.56, 12, { top: '#f7d6a2', left: '#e2a66b', right: '#b97c44' }, 9);

  // wheels on the two visible sides
  const wheel = (x: number, y: number) => {
    p.circle(x, y, 6, WOOD_D);
    p.circle(x, y, 4.2, WOOD, O);
    p.circle(x, y, 1.1, WOOD_D, null);
    p.line(
      [
        { x: x - 3.4, y },
        { x: x + 3.4, y },
      ],
      WOOD_D,
      0.8,
    );
  };
  wheel(p.iso(0.5, 0.76, 6).x, p.iso(0.5, 0.76, 6).y);
  wheel(p.iso(0.8, 0.5, 6).x, p.iso(0.8, 0.5, 6).y);

  // baked goods on the cart top
  const top = (u: number, v: number) => p.iso(u, v, 21);
  const baguette = (a: Pt, b: Pt) => {
    thick(p, [a, b], 2.8, '#e8a54b');
    for (let k = 1; k < 4; k++) {
      const t = k / 4;
      const x = a.x + (b.x - a.x) * t;
      const y = a.y + (b.y - a.y) * t;
      p.line([{ x: x - 0.8, y: y - 1.6 }, { x: x + 0.8, y: y + 0.6 }], '#c77b2e', 0.7);
    }
  };
  baguette(top(0.3, 0.42), top(0.42, 0.26));
  baguette({ x: top(0.36, 0.5).x - 1, y: top(0.36, 0.5).y + 1 }, { x: top(0.52, 0.42).x - 1, y: top(0.52, 0.42).y + 1 });
  // round loaves with a scored top
  const loaf = (pt: Pt, r: number) => {
    soft(p, pt.x, pt.y, r, r * 0.85, '#e9a25a');
    p.line([{ x: pt.x - r * 0.45, y: pt.y - r * 0.2 }, { x: pt.x + r * 0.35, y: pt.y - r * 0.5 }], '#b96f2e', 0.8);
  };
  loaf(top(0.64, 0.56), 4.6);
  loaf(top(0.68, 0.34), 3.6);
  // little muffins with pink and blueberry tops
  const muffin = (pt: Pt, lid: string) => {
    p.poly(
      [
        { x: pt.x - 3.4, y: pt.y },
        { x: pt.x + 3.4, y: pt.y },
        { x: pt.x + 2.6, y: pt.y + 3.2 },
        { x: pt.x - 2.6, y: pt.y + 3.2 },
      ],
      '#f1c08a',
      O,
      0.8,
    );
    p.ellipse(pt.x, pt.y, 3.9, 2.4, lid, O);
    p.circle(pt.x - 1, pt.y - 0.4, 0.5, '#3b3f7a', null);
    p.circle(pt.x + 1.3, pt.y + 0.3, 0.5, '#3b3f7a', null);
  };
  muffin(top(0.36, 0.7), PINK);
  muffin(top(0.56, 0.2), '#7b74d8');

  // wheels sit in front of the body; now the awning canopy over the top
  const stripes = [BUTTER, CREAM, BUTTER, CREAM, BUTTER, CREAM];
  const u0 = 0.12;
  const u1 = 0.9;
  for (let k = 0; k < stripes.length; k++) {
    const a = u0 + ((u1 - u0) * k) / stripes.length;
    const b = u0 + ((u1 - u0) * (k + 1)) / stripes.length;
    p.poly(
      [p.iso(a, 0.12, 40), p.iso(b, 0.12, 40), p.iso(b, 0.92, 34), p.iso(a, 0.92, 34)],
      stripes[k],
      O,
      1,
    );
    // scalloped valance under the front edge
    const m = (a + b) / 2;
    const sc = p.iso(m, 0.92, 31);
    const sw = (p.iso(b, 0.92, 34).x - p.iso(a, 0.92, 34).x) / 2 + 0.5;
    p.poly(
      [p.iso(a, 0.92, 34), p.iso(b, 0.92, 34), p.iso(b, 0.92, 31), p.iso(a, 0.92, 31)],
      stripes[k],
      O,
      1,
    );
    p.circle(sc.x, sc.y + 3.5, Math.max(2.4, Math.abs(sw)), stripes[k], O);
  }
  // front poles
  thick(p, [p.iso(0.1, 0.92, 22), p.iso(0.1, 0.92, 34)], 1.6, WOOD_D);
  thick(p, [p.iso(0.9, 0.92, 22), p.iso(0.9, 0.92, 34)], 1.6, WOOD_D);
};

/** Golden Egg Nest: a straw nest on a stump with a shiny golden egg. */
const goldenEggNest: Painter = (p) => {
  const { x: cx, y: cy } = p.center;
  p.shadow(cx, cy + 3, 17, 8, 0.24);
  p.glow(cx, cy - 22, 22, '#ffe27a', 0.4);

  // little wooden stump
  p.cylinder(cx, cy + 3, 15, 13, WOOD);
  p.ellipse(cx, cy - 10, 8.5, 4, null, WOOD_D);

  // back half of the nest: a darker rim with a hollow in the middle
  const nestTop = cy - 11;
  p.ellipse(cx, nestTop, 18.5, 7.2, STRAW_D);
  p.ellipse(cx, nestTop - 0.6, 13, 4.4, '#a8752a');
  p.ellipse(cx, nestTop - 1, 11.2, 3.6, '#c08a3a', null);
  // golden egg
  const egg = (c: Ctx) => {
    c.moveTo(cx, cy - 32);
    c.bezierCurveTo(cx + 5.8, cy - 32, cx + 8, cy - 26, cx + 8, cy - 21);
    c.bezierCurveTo(cx + 8, cy - 15, cx + 4.8, cy - 11.5, cx, cy - 11.5);
    c.bezierCurveTo(cx - 4.8, cy - 11.5, cx - 8, cy - 15, cx - 8, cy - 21);
    c.bezierCurveTo(cx - 8, cy - 26, cx - 5.8, cy - 32, cx, cy - 32);
    c.closePath();
  };
  const eg = p.ctx.createLinearGradient(cx - 8, 0, cx + 8, 0);
  eg.addColorStop(0, '#fff3b0');
  eg.addColorStop(0.35, '#ffd24a');
  eg.addColorStop(0.75, GOLD_D);
  eg.addColorStop(1, '#a8701a');
  path(p, eg, O, egg, 1.2);
  // egg glints
  p.ellipse(cx - 3.2, cy - 24, 1.8, 3.8, 'rgba(255,255,255,0.85)', null, 0.2);
  p.circle(cx + 2.4, cy - 27.5, 0.9, 'rgba(255,255,255,0.8)', null);

  // ribbon band and a little pink bow
  p.line(
    [
      { x: cx - 7.2, y: cy - 17 },
      { x: cx + 7.2, y: cy - 17 },
    ],
    PINK_D,
    2,
  );
  p.ellipse(cx + 4, cy - 19.5, 2.6, 1.8, PINK, O, -0.5);
  p.ellipse(cx - 1, cy - 19.5, 2.6, 1.8, PINK, O, 0.5);
  p.circle(cx + 1.6, cy - 17.8, 1.5, ROSE, O);
  p.line(
    [
      { x: cx + 1.2, y: cy - 16.3 },
      { x: cx + 2.4, y: cy - 12.6 },
    ],
    PINK,
    1.1,
  );

  // front half of the nest, covering the bottom of the egg
  path(
    p,
    hgrad(p, cx - 18.5, cx + 18.5, [
      [0, shade(STRAW, 0.15)],
      [0.5, STRAW],
      [1, STRAW_D],
    ]),
    O,
    (c) => {
      c.moveTo(cx - 18.5, nestTop);
      c.ellipse(cx, nestTop, 18.5, 7.2, 0, Math.PI, 0, false);
      c.closePath();
    },
    1.1,
  );
  // straw strands woven across the front rim
  const strands: [number, number, number][] = [
    [-14, 2.2, 5],
    [-7, 3.4, 6],
    [0, 3.2, 5],
    [7, 3, 6],
    [13, 1.8, 4],
    [-10, 5, 4],
    [4, 5.2, 5],
  ];
  for (const [dx, dy, len] of strands) {
    p.line(
      [
        { x: cx + dx, y: nestTop + dy },
        { x: cx + dx + len, y: nestTop + dy - 1.6 },
      ],
      STRAW_D,
      0.9,
    );
  }
  // sparkles
  sparkle(p, cx + 13, cy - 33, 4.2);
  sparkle(p, cx - 13, cy - 29, 2.8);
  sparkle(p, cx + 10, cy - 41, 2);
};

/** Piggy Mud Spa: a shallow tub of cocoa mud with a rubber duck and flowers. */
const mudSpa: Painter = (p) => {
  const { x: cx, y: cy } = p.center;
  p.shadow(cx, cy + 2, 26, 13, 0.24);

  // pebbles and flowers on the ground around the tub
  const ringPt = (a: number, rx: number, ry: number): Pt => ({ x: cx + Math.cos(a) * rx, y: cy + 2 + Math.sin(a) * ry });
  for (const a of [0.3, 1.1, 2.9, 3.9, 4.8, 5.7]) {
    const pt = ringPt(a, 27, 13.5);
    p.ellipse(pt.x, pt.y, 2.7, 1.8, PEBBLE, O);
    p.ellipse(pt.x - 0.6, pt.y - 0.5, 1, 0.5, 'rgba(255,255,255,0.6)', null);
  }
  for (const a of [0.8, 2.3, 5.2]) {
    const pt = ringPt(a, 25, 12.5);
    p.flower(pt.x, pt.y - 1, 3.2, PINK);
  }

  // the tub: a rounded ceramic ring with a shallow mud pool
  p.cylinder(cx, cy + 2, 22, 8, '#f7c3cf');
  const rim = { x: cx, y: cy - 6 };
  const mudG = p.ctx.createRadialGradient(cx - 4, rim.y - 2, 2, cx, rim.y, 20);
  mudG.addColorStop(0, MUD_L);
  mudG.addColorStop(0.7, MUD);
  mudG.addColorStop(1, shade(MUD, -0.2));
  p.ellipse(rim.x, rim.y, 18.5, 9.3, mudG, null);
  // ripples and bubbles in the mud
  p.ellipse(rim.x + 3, rim.y - 1.5, 9, 3.6, null, 'rgba(255,220,190,0.35)');
  p.circle(cx - 8, rim.y - 2, 1.5, 'rgba(255,255,255,0.35)', null);
  p.circle(cx - 3, rim.y + 3, 1, 'rgba(255,255,255,0.3)', null);
  p.circle(cx + 9, rim.y + 2, 1.2, 'rgba(255,255,255,0.3)', null);

  // rubber duck floating in the mud
  p.ellipse(cx + 5, rim.y - 1.5, 5.2, 3.3, GOLD, O);
  p.circle(cx + 9.4, rim.y - 6.2, 3.3, GOLD, O);
  p.poly(
    [
      { x: cx + 11.8, y: rim.y - 5.8 },
      { x: cx + 15, y: rim.y - 4.8 },
      { x: cx + 11.8, y: rim.y - 3.8 },
    ],
    '#ff9a3a',
    O,
    0.8,
  );
  p.circle(cx + 10.2, rim.y - 7.2, 0.8, DARK, null);
  shine(p, cx + 3.5, rim.y - 3.2, 1.2);

  // a tiny folded towel on the back rim
  const tw = ringPt(4.1, 22, 11);
  p.save();
  p.ctx.translate(tw.x - 1, tw.y - 2);
  p.ctx.rotate(-0.2);
  p.roundRect(-5, -2.6, 10, 5.2, 1.4, MINT);
  p.line(
    [
      { x: -5, y: 0 },
      { x: 5, y: 0 },
    ],
    'rgba(255,255,255,0.7)',
    0.8,
  );
  p.restore();

  // a pink flower or two on the near rim
  p.flower(cx - 16, cy - 2, 2.6, PINK_L);
  p.flower(cx + 17, cy - 3, 2.4, LILAC);
};

/** Brick Pizza Oven: a warm terracotta dome on a stone base, with a glowing arched mouth and a pizza inside. */
const pizzaOven: Painter = (p) => {
  const { x: cx, y: cy } = p.center;
  p.shadow(cx, cy + 1, 23, 11, 0.25);

  const TERRA = '#b8643e';
  const TERRA_L = '#dd8f63';
  const TERRA_D = '#83402a';
  const GROUT = '#f2c9a4';

  // chimney at the back-right, drawn first so the dome sits in front of it
  p.box(0.66, 0.14, 0.14, 0.14, 20, { top: TERRA_L, left: TERRA, right: TERRA_D }, 22);
  const cPt = p.iso(0.73, 0.21, 42);
  p.circle(cPt.x, cPt.y - 3, 3.3, 'rgba(255,255,255,0.75)', 'rgba(120,100,90,0.35)');
  p.circle(cPt.x + 3, cPt.y - 9, 4.2, 'rgba(255,255,255,0.7)', 'rgba(120,100,90,0.3)');
  p.circle(cPt.x - 1, cPt.y - 16, 3.4, 'rgba(255,255,255,0.55)', 'rgba(120,100,90,0.25)');

  // stone base, then the terracotta brick body
  p.box(0.06, 0.06, 0.88, 0.88, 6, { top: '#e2dbd0', left: '#b9b0a4', right: '#8f877c' }, 0);
  p.box(0.12, 0.12, 0.76, 0.76, 16, { top: TERRA_L, left: TERRA, right: TERRA_D }, 6);
  // brick courses with staggered joints on the two visible faces
  for (let row = 0; row < 4; row++) {
    const zb = 6 + row * 4;
    const zt = zb + 4;
    if (row > 0) {
      p.line([p.iso(0.12, 0.88, zb), p.iso(0.88, 0.88, zb)], GROUT, 1);
      p.line([p.iso(0.88, 0.12, zb), p.iso(0.88, 0.88, zb)], GROUT, 1);
    }
    const joints = row % 2 ? [0.2, 0.4, 0.6, 0.8] : [0.3, 0.5, 0.7];
    for (const a of joints) {
      p.line([p.iso(a, 0.88, zb), p.iso(a, 0.88, zt)], GROUT, 0.9);
      p.line([p.iso(0.88, a, zb), p.iso(0.88, a, zt)], GROUT, 0.9);
    }
  }

  // domed roof of the oven
  const yb = cy - 22;
  const domeBuild = (c: Ctx) => {
    c.moveTo(cx - 21, yb);
    c.bezierCurveTo(cx - 21, yb - 26, cx + 21, yb - 26, cx + 21, yb);
    c.ellipse(cx, yb, 21, 9.5, 0, 0, Math.PI, false);
    c.closePath();
  };
  const dg = p.ctx.createRadialGradient(cx - 7, yb - 12, 2, cx, yb - 8, 25);
  dg.addColorStop(0, '#f3a57c');
  dg.addColorStop(0.55, TERRA);
  dg.addColorStop(1, TERRA_D);
  path(p, dg, O, domeBuild, 1.2);
  clipped(p, domeBuild, () => {
    for (const k of [5, 11, 17]) {
      p.curve({ x: cx - 23, y: yb - k + 5 }, { x: cx, y: yb - k - 5 }, { x: cx + 23, y: yb - k + 5 }, GROUT, 1.1);
    }
  });
  p.roundRect(cx - 3, yb - 22, 6, 4.5, 1.2, '#f2b48f');
  p.ellipse(cx - 9, yb - 13, 4, 1.8, 'rgba(255,255,255,0.35)', null, -0.4);

  // glowing arched mouth on the left face, in a stone frame
  const L = (a: number, z: number) => p.iso(a, 0.88, z);
  const arch = (c: Ctx, a0: number, a1: number, zb: number, zt: number, zc: number) => {
    const bl = L(a0, zb);
    const br = L(a1, zb);
    const tr = L(a1, zt);
    const tl = L(a0, zt);
    const top = L((a0 + a1) / 2, zc);
    c.moveTo(bl.x, bl.y);
    c.lineTo(br.x, br.y);
    c.lineTo(tr.x, tr.y);
    c.quadraticCurveTo(top.x, top.y, tl.x, tl.y);
    c.closePath();
  };
  path(p, '#d8d0c4', O, (c) => arch(c, 0.22, 0.78, 5, 16.5, 24), 1.2);
  const mc = L(0.5, 10);
  p.glow(mc.x, mc.y, 16, '#ff9a3a', 0.6);
  const mg = p.ctx.createRadialGradient(mc.x, mc.y - 2, 1, mc.x, mc.y, 11);
  mg.addColorStop(0, '#fff3b0');
  mg.addColorStop(0.5, '#ffa23a');
  mg.addColorStop(1, '#b8461c');
  path(p, mg, O, (c) => arch(c, 0.27, 0.73, 7, 15, 23), 1.2);

  // a round pizza sitting in the mouth, sauce, cheese and pepperoni
  const rot = 0.46;
  const pz = L(0.5, 9.5);
  const at = (dx: number, dy: number): Pt => ({
    x: pz.x + dx * Math.cos(rot) - dy * Math.sin(rot),
    y: pz.y + dx * Math.sin(rot) + dy * Math.cos(rot),
  });
  p.ellipse(pz.x, pz.y, 8.6, 6.2, '#e7a54e', O, rot);
  p.ellipse(pz.x, pz.y, 7, 4.9, '#e0484f', null, rot);
  p.ellipse(pz.x, pz.y, 5.8, 4, '#ffe08a', null, rot);
  p.ellipse(pz.x - 1, pz.y - 1.5, 2.6, 1.2, 'rgba(255,255,255,0.45)', null, rot);
  for (const [dx, dy] of [
    [-2.6, -1],
    [2.4, -0.9],
    [0.2, 1.4],
    [-1.6, 2.2],
  ] as const) {
    const q = at(dx, dy);
    p.circle(q.x, q.y, 1.3, '#b8323a', null);
  }

  // wooden peel leaning against the right side
  thick(p, [p.iso(0.98, 0.56, 0), p.iso(1.12, 0.3, 30)], 1.8, WOOD_L);
  const pad = p.iso(1.0, 0.6, 1);
  p.ellipse(pad.x, pad.y, 6, 3.2, WOOD, O, -0.46);
};

/** Carrot Lamp: a garden lamp shaped like a carrot, with a warm lantern on top. */
const carrotLamp: Painter = (p) => {
  const { x: cx, y: cy } = p.center;
  p.shadow(cx, cy + 1, 13, 6.5, 0.24);

  // the carrot post, its tip in the soil
  path(
    p,
    hgrad(p, cx - 8, cx + 8, [
      [0, shade(ORANGE, 0.25)],
      [0.4, ORANGE],
      [1, ORANGE_D],
    ]),
    O,
    (c) => {
      c.moveTo(cx - 7.5, cy - 22);
      c.quadraticCurveTo(cx - 8, cy - 8, cx, cy + 1);
      c.quadraticCurveTo(cx + 8, cy - 8, cx + 7.5, cy - 22);
      c.closePath();
    },
    1.2,
  );
  // carrot rings and streaks
  p.curve({ x: cx - 7, y: cy - 16 }, { x: cx, y: cy - 14 }, { x: cx + 6.6, y: cy - 16 }, shade(ORANGE_D, -0.15), 0.9);
  p.curve({ x: cx - 5.4, y: cy - 8 }, { x: cx, y: cy - 6.5 }, { x: cx + 4.6, y: cy - 8 }, shade(ORANGE_D, -0.15), 0.9);
  p.line(
    [
      { x: cx - 3.6, y: cy - 20 },
      { x: cx - 2.4, y: cy - 11 },
    ],
    'rgba(255,255,255,0.45)',
    1.3,
  );
  p.ellipse(cx + 2.5, cy - 14, 0.7, 1.3, shade(ORANGE_D, -0.3), null);
  p.ellipse(cx - 1.5, cy - 4, 0.6, 1, shade(ORANGE_D, -0.3), null);
  // collar
  p.ellipse(cx, cy - 22, 7.6, 3, shade(ORANGE, 0.12), O);

  // warm glow and the lantern on the post
  p.glow(cx, cy - 31, 25, '#ffe27a', 0.5);
  const glass = vgrad(p, cy - 36, cy - 23, [
    [0, '#fffbe0'],
    [0.6, '#ffe07a'],
    [1, '#ffc24d'],
  ]);
  p.roundRect(cx - 6, cy - 36, 12, 13, 3, glass);
  p.line(
    [
      { x: cx - 2.2, y: cy - 35 },
      { x: cx - 2.2, y: cy - 24 },
    ],
    WOOD_D,
    0.9,
  );
  p.line(
    [
      { x: cx + 2.2, y: cy - 35 },
      { x: cx + 2.2, y: cy - 24 },
    ],
    WOOD_D,
    0.9,
  );
  p.poly(
    [
      { x: cx - 8, y: cy - 36 },
      { x: cx, y: cy - 42 },
      { x: cx + 8, y: cy - 36 },
    ],
    '#b97a46',
    O,
    1,
  );
  p.circle(cx, cy - 43, 1.7, GOLD);
  sparkle(p, cx + 9, cy - 40, 2.4);

  // leafy green top sprouting from the lantern cap
  leaf(p, cx, cy - 43, 15, -Math.PI / 2, 4.2, LEAF);
  leaf(p, cx, cy - 43, 12, -Math.PI / 2 - 0.65, 3.6, LEAF_D);
  leaf(p, cx, cy - 43, 12, -Math.PI / 2 + 0.65, 3.6, LEAF_D);
};

/** Rose Arbor: a lush white garden arch with a lattice backdrop, buried in pink and red roses and leaves. */
const roseArbor: Painter = (p) => {
  const { x: cx, y: cy } = p.center;
  p.shadow(cx, cy + 1, 22, 11, 0.22);
  const r = rng('arbor');
  const WHITE_WOOD = '#fffaf2';
  const ROSE_COLS = [ROSE, '#ff7fa6', '#c2324f', '#ff9dbd'];
  const top = 36;
  const A = p.iso(0.08, 0.5, 0);
  const At = p.iso(0.08, 0.5, top);
  const B = p.iso(0.92, 0.5, 0);
  const Bt = p.iso(0.92, 0.5, top);

  // lattice backdrop between the posts, on the back edge
  const L = (u: number, z: number) => p.iso(u, 0.2, z);
  path(
    p,
    '#fff8ef',
    O,
    (c) => {
      const a = L(0.08, 3);
      const b = L(0.92, 3);
      const d = L(0.92, 31);
      const e = L(0.08, 31);
      c.moveTo(a.x, a.y);
      c.lineTo(b.x, b.y);
      c.lineTo(d.x, d.y);
      c.lineTo(e.x, e.y);
      c.closePath();
    },
    1,
  );
  for (const z of [10, 17, 24]) p.line([L(0.08, z), L(0.92, z)], '#e0c4a2', 1.6);
  for (const u of [0.25, 0.42, 0.58, 0.75]) p.line([L(u, 3), L(u, 31)], '#e0c4a2', 1.6);

  // chunky white posts and a fat, curved top
  p.ellipse(A.x, A.y, 4, 2, '#e8d6c0');
  p.ellipse(B.x, B.y, 4, 2, '#e8d6c0');
  thick(p, [A, At], 5.4, WHITE_WOOD);
  thick(p, [B, Bt], 5.4, WHITE_WOOD);
  const ctrl = { x: (At.x + Bt.x) / 2, y: (At.y + Bt.y) / 2 - 34 };
  const bez = (t: number): Pt => ({
    x: (1 - t) * (1 - t) * At.x + 2 * (1 - t) * t * ctrl.x + t * t * Bt.x,
    y: (1 - t) * (1 - t) * At.y + 2 * (1 - t) * t * ctrl.y + t * t * Bt.y,
  });
  p.curve(At, ctrl, Bt, O, 9.4);
  p.curve(At, ctrl, Bt, WHITE_WOOD, 7);

  // leaves bursting out of the arch, and a few hanging underneath
  for (let t = 0.02; t <= 1; t += 0.06) {
    const q = bez(t);
    for (const side of [-1, 1]) {
      const a = -Math.PI / 2 + side * (0.7 + r() * 0.5);
      leaf(p, q.x, q.y, 4.2 + r() * 3, a, 2.1 + r() * 0.6, r() < 0.55 ? LEAF : LEAF_D);
    }
    if (r() < 0.5) leaf(p, q.x, q.y + 1, 4 + r() * 2, Math.PI / 2 + (r() - 0.5), 2, LEAF_D);
  }

  // roses covering the top of the arch, in pinks and reds of mixed sizes
  for (const t of [0.05, 0.14, 0.23, 0.32, 0.41, 0.6, 0.69, 0.78, 0.87, 0.95]) {
    const q = bez(t);
    const size = 2.6 + r() * 1.3;
    rose(p, q.x + (r() - 0.5) * 2, q.y - 3 - r() * 2.5, size, ROSE_COLS[Math.floor(r() * ROSE_COLS.length)]);
  }
  // a couple of small buds
  const bud = bez(0.5);
  p.circle(bud.x - 6, bud.y - 2, 1.7, PINK, O);
  p.circle(bud.x + 6.5, bud.y - 1.5, 1.7, '#c2324f', O);

  // roses and leaves trailing down both posts
  for (const side of [-1, 1]) {
    for (let k = 0; k < 4; k++) {
      const z = top - 6 - k * 7;
      const pt = p.iso(side < 0 ? 0.08 : 0.92, 0.5, z);
      const x = pt.x + side * 3.4;
      leaf(p, x, pt.y, 5, Math.PI / 2 + side * 0.5, 2.2, LEAF_D);
      leaf(p, x, pt.y + 1, 4.4, Math.PI / 2 - side * 0.6, 2, LEAF);
      rose(p, x, pt.y + 2, 2.3 + r() * 0.7, ROSE_COLS[(k + (side > 0 ? 1 : 0)) % ROSE_COLS.length]);
    }
  }

  // little heart sign hanging from the arch
  const peak = bez(0.5);
  p.line(
    [
      { x: peak.x, y: peak.y + 1.5 },
      { x: peak.x, y: peak.y + 6.5 },
    ],
    '#8a5a3a',
    0.8,
  );
  p.heart(peak.x, peak.y + 10, 4, '#ff7fa6', O);
  p.circle(peak.x - 1.2, peak.y + 8.6, 0.7, 'rgba(255,255,255,0.8)', null);

  // flowers at the foot of the posts
  p.flower(cx - 11, cy + 4, 2.6, PINK_L);
  p.flower(cx + 12, cy + 4, 2.8, '#ff8fb1');
};

/** Knitting Basket: a wicker basket overflowing with pastel yarn, two needles and a striped scarf. */
const knittingBasket: Painter = (p) => {
  const { x: cx, y: cy } = p.center;
  p.shadow(cx, cy + 2, 18, 9, 0.25);
  const rimY = cy - 12;

  // wicker body
  p.cylinder(cx, cy + 3, 16, 15, WICKER);
  const bodyClip = (c: Ctx) => {
    c.moveTo(cx - 16, cy - 12);
    c.lineTo(cx - 16, cy + 3);
    c.ellipse(cx, cy + 3, 16, 8, 0, Math.PI, 0, true);
    c.lineTo(cx + 16, cy - 12);
    c.ellipse(cx, cy - 12, 16, 8, 0, 0, Math.PI, true);
    c.closePath();
  };
  clipped(p, bodyClip, () => {
    for (let k = -6; k <= 6; k++) {
      const x0 = cx - 18 + k * 4;
      p.line(
        [
          { x: x0, y: cy - 14 },
          { x: x0 + 12, y: cy + 5 },
        ],
        WICKER_D,
        0.8,
      );
      p.line(
        [
          { x: x0 + 12, y: cy - 14 },
          { x: x0, y: cy + 5 },
        ],
        WICKER_D,
        0.8,
      );
    }
  });
  // rim (no dark disc: the yarn fills the opening)
  p.ellipse(cx, rimY, 16, 8, shade(WICKER, 0.1), O);

  // two knitting needles poking out at an angle, behind the yarn
  thick(
    p,
    [
      { x: cx - 3, y: rimY - 4 },
      { x: cx - 14, y: cy - 50 },
    ],
    1.6,
    WOOD_L,
  );
  thick(
    p,
    [
      { x: cx + 3, y: rimY - 4 },
      { x: cx + 13, y: cy - 48 },
    ],
    1.6,
    WOOD_L,
  );
  p.circle(cx - 14, cy - 50, 1.7, WOOD, O);
  p.circle(cx + 13, cy - 48, 1.7, WOOD, O);

  // round yarn balls packed into the basket, with strand lines
  const yarn = (x: number, y: number, r: number, color: string) => {
    p.ball(x, y, r, color);
    p.curve({ x: x - r * 0.8, y: y + r * 0.1 }, { x, y: y - r * 0.5 }, { x: x + r * 0.8, y: y - r * 0.1 }, shade(color, -0.25), 0.7);
    p.curve({ x: x - r * 0.4, y: y + r * 0.7 }, { x: x + r * 0.2, y: y + r * 0.1 }, { x: x + r * 0.7, y: y + r * 0.8 }, shade(color, -0.25), 0.7);
  };
  yarn(cx - 9, rimY - 3, 5.6, MINT);
  yarn(cx + 1, rimY - 7, 6.2, PINK);
  yarn(cx + 10.5, rimY - 2, 5.2, BUTTER);
  yarn(cx - 3, rimY + 2, 5, LILAC);
  yarn(cx + 6, rimY + 4, 4.4, MINT);
  // a loose strand dangling from the lilac ball
  p.curve({ x: cx - 5, y: rimY + 4 }, { x: cx - 9, y: cy - 2 }, { x: cx - 7, y: cy + 5 }, shade(LILAC, -0.3), 1.3);

  // front lip of the basket, over the bottoms of the balls
  path(p, null, WICKER_D, (c) => c.ellipse(cx, rimY, 16, 8, 0, 0, Math.PI, false), 2.2);

  // striped scarf draping over the front edge
  const scarf = [
    { x: cx + 4, y: rimY - 1 },
    { x: cx + 7, y: rimY + 4 },
    { x: cx + 7, y: cy + 2 },
    { x: cx + 10, y: cy + 6 },
    { x: cx + 9, y: cy + 11 },
  ];
  p.line(scarf, O, 7.6);
  const stripes = [MINT, PINK, BUTTER, MINT];
  for (let k = 0; k < scarf.length - 1; k++) {
    p.line([scarf[k], scarf[k + 1]], stripes[k % stripes.length], 5.2);
  }
  const end = scarf[scarf.length - 1];
  for (const dx of [-2, 0, 2]) {
    p.line(
      [
        { x: end.x + dx * 0.5, y: end.y },
        { x: end.x + dx, y: end.y + 3 },
      ],
      PINK_D,
      1,
    );
  }
};

/** Quilt Clothesline: two posts, a sagging line and three patchwork quilts (2x1). */
const quiltLine: Painter = (p) => {
  const { x: cx, y: cy } = p.center;
  p.shadow(cx, cy + 3, 40, 14, 0.2);

  const top = 42;
  const A = p.iso(0.12, 0.5, 0);
  const At = p.iso(0.12, 0.5, top);
  const B = p.iso(1.88, 0.5, 0);
  const Bt = p.iso(1.88, 0.5, top);
  thick(p, [A, At], 3.4, WOOD_L);
  thick(p, [B, Bt], 3.4, WOOD_L);
  p.ellipse(A.x, A.y, 4, 2, WOOD_D);
  p.ellipse(B.x, B.y, 4, 2, WOOD_D);

  // the line, sagging between the posts
  const C = { x: (At.x + Bt.x) / 2, y: (At.y + Bt.y) / 2 + 16 };
  const rope = (t: number): Pt => ({
    x: (1 - t) * (1 - t) * At.x + 2 * (1 - t) * t * C.x + t * t * Bt.x,
    y: (1 - t) * (1 - t) * At.y + 2 * (1 - t) * t * C.y + t * t * Bt.y,
  });
  p.curve(At, C, Bt, O, 2.2);
  p.curve(At, C, Bt, '#c9a77a', 1);

  const palette = [PINK, MINT, BUTTER, LILAC, PEACH, SKY];
  const quilts = [
    { t: 0.24, w: 13, h: 19, seed: 0 },
    { t: 0.5, w: 15, h: 22, seed: 2 },
    { t: 0.76, w: 13, h: 18, seed: 4 },
  ];
  for (const q of quilts) {
    const pt = rope(q.t);
    const x = pt.x;
    const y = pt.y + 1;
    // background cloth
    p.rect(x - q.w / 2, y, q.w, q.h, CREAM, null);
    const cell = q.w / 3;
    const rowH = q.h / 3;
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        const isHeart = q.seed === 2 && r === 1 && c === 1;
        const color = palette[(r * 3 + c + q.seed) % palette.length];
        const sx = x - q.w / 2 + c * cell;
        const sy = y + r * rowH;
        if (isHeart) {
          p.rect(sx + 0.6, sy + 0.6, cell - 1.2, rowH - 1.2, CREAM, null);
          p.heart(sx + cell / 2, sy + rowH / 2 + 1, 2.6, ROSE, null);
        } else {
          p.rect(sx + 0.6, sy + 0.6, cell - 1.2, rowH - 1.2, color, null);
        }
      }
    }
    // stitched edges and outline
    p.rect(x - q.w / 2, y, q.w, q.h, null, O);
    thin(p, 0.5, () => {
      p.line(
        [
          { x: x - q.w / 2 + 0.5, y: y + q.h - 1.2 },
          { x: x + q.w / 2 - 0.5, y: y + q.h - 1.2 },
        ],
        'rgba(255,255,255,0.8)',
        0.5,
      );
    });
    // clothes pegs
    p.roundRect(x - q.w * 0.3 - 1.2, y - 2.8, 2.6, 4.4, 0.9, '#f3d09a', O);
    p.roundRect(x + q.w * 0.3 - 1.2, y - 2.8, 2.6, 4.4, 0.9, '#f3d09a', O);
  }
};

/** Honey Pot Shelf: a standing cottage shelf unit with a back panel, sides, shelves and honey jars. */
const honeyShelf: Painter = (p) => {
  const { x: cx, y: cy } = p.center;
  p.shadow(cx, cy + 1, 20, 10, 0.24);
  const PLANK = { top: '#f7d19a', left: WOOD, right: WOOD_D };
  const BACK = { top: WOOD_L, left: '#e6b47c', right: WOOD };

  // back panel and two side panels, standing on the ground
  p.box(0.12, 0.08, 0.76, 0.07, 48, BACK, 0);
  p.box(0.06, 0.08, 0.08, 0.66, 48, PLANK, 0);
  p.box(0.86, 0.08, 0.08, 0.66, 48, PLANK, 0);
  // two shelves between the sides
  p.box(0.06, 0.08, 0.88, 0.66, 3.5, PLANK, 12);
  p.box(0.06, 0.08, 0.88, 0.66, 3.5, PLANK, 28);
  // top board with a scalloped trim along its front edge
  p.box(0.04, 0.06, 0.92, 0.72, 4, PLANK, 46);
  for (let k = 0; k < 6; k++) {
    const pt = p.iso(0.12 + k * 0.14, 0.78, 46);
    p.circle(pt.x, pt.y + 2, 2.6, WOOD_L, O);
  }

  const jar = (u: number, v: number, z: number, rx: number, ht: number, lid: string) => {
    const b = p.iso(u, v, z);
    p.cylinder(b.x, b.y, rx, ht, HONEY);
    // cream label band
    p.rect(b.x - rx + 0.6, b.y - ht * 0.62, rx * 2 - 1.2, 3.4, CREAM, null);
    // gingham cloth cover over the lid
    const lidY = b.y - ht;
    p.ellipse(b.x, lidY, rx + 0.9, (rx + 0.9) * 0.5, lid, O);
    clipped(p, (c) => c.ellipse(b.x, lidY, rx + 0.9, (rx + 0.9) * 0.5, 0, 0, TAU), () => {
      for (let k = -2; k <= 2; k++) {
        p.line(
          [
            { x: b.x + k * 2.2, y: lidY - 4 },
            { x: b.x + k * 2.2, y: lidY + 4 },
          ],
          'rgba(255,255,255,0.85)',
          0.8,
        );
        p.line(
          [
            { x: b.x - rx - 2, y: lidY + k * 1.2 },
            { x: b.x + rx + 2, y: lidY + k * 1.2 },
          ],
          'rgba(255,255,255,0.85)',
          0.8,
        );
      }
    });
    p.line(
      [
        { x: b.x - rx * 0.55, y: b.y - ht * 0.45 },
        { x: b.x - rx * 0.55, y: b.y - ht * 0.15 },
      ],
      'rgba(255,255,255,0.8)',
      1.2,
    );
    return { x: b.x, y: lidY };
  };

  // bottom shelf: big, medium and small jars
  jar(0.22, 0.36, 15.5, 5.6, 10, PINK_L);
  jar(0.48, 0.4, 15.5, 4.4, 8, MINT);
  jar(0.72, 0.34, 15.5, 3.4, 6, BUTTER);
  // middle shelf, with a honey dipper leaning out of one jar
  const jt = jar(0.28, 0.4, 31.5, 4.2, 8, LILAC);
  thick(
    p,
    [
      { x: jt.x, y: jt.y },
      { x: jt.x + 6, y: jt.y - 12 },
    ],
    1.5,
    WOOD_L,
  );
  p.circle(jt.x + 6, jt.y - 12.5, 2.2, HONEY, O);
  shine(p, jt.x + 5.3, jt.y - 13.4, 0.7);
  jar(0.6, 0.38, 31.5, 3.4, 6.2, PINK_L);
  // a little jar on the top board
  jar(0.5, 0.42, 49.5, 2.8, 4.8, MINT);

  // a little bee buzzing above the unit
  bee(p, cx + 15, cy - 60, 3);
};

/** Honey Tree: a chubby round tree with a honey-dripping hollow, bees and a hanging hive. */
const honeyTree: Painter = (p) => {
  const { x: cx, y: cy } = p.center;
  p.shadow(cx, cy + 1, 13, 6.5, 0.24);

  // trunk with flared roots
  p.ellipse(cx, cy - 1, 9, 3.6, BARK_D);
  path(
    p,
    hgrad(p, cx - 7, cx + 7, [
      [0, shade(BARK, 0.2)],
      [0.4, BARK],
      [1, BARK_D],
    ]),
    O,
    (c) => {
      c.moveTo(cx - 6.8, cy - 1);
      c.quadraticCurveTo(cx - 5, cy - 16, cx - 4.4, cy - 30);
      c.lineTo(cx + 4.4, cy - 30);
      c.quadraticCurveTo(cx + 5, cy - 16, cx + 6.8, cy - 1);
      c.closePath();
    },
    1.2,
  );

  // hollow in the trunk, dripping with honey
  p.ellipse(cx, cy - 16, 3.8, 4.6, '#5a3a22', O);
  p.ellipse(cx - 1, cy - 18, 1.8, 2, '#7a5035', null);
  const drip = (x: number, y0: number, len: number) => {
    p.line(
      [
        { x, y: y0 },
        { x, y: y0 + len },
      ],
      HONEY_D,
      1.5,
    );
    p.circle(x, y0 + len + 0.6, 1.8, HONEY, O);
    shine(p, x - 0.5, y0 + len, 0.5);
  };
  drip(cx - 2, cy - 11.5, 5.5);
  drip(cx + 2.5, cy - 11.5, 3.5);
  // honey pooling at the foot of the tree
  p.ellipse(cx + 6, cy + 1, 4.5, 1.8, HONEY, O);
  shine(p, cx + 4.5, cy + 0.6, 0.9);

  // canopy
  p.foliage(cx, cy - 42, 20, '#b4e07a', 'honey-canopy', 10);
  // a few blossoms tucked into the canopy
  p.flower(cx - 12, cy - 47, 2.4, PINK_L, '#ffd84a');
  p.flower(cx + 10, cy - 54, 2.2, WHITE, '#ffd84a');
  p.flower(cx + 13, cy - 38, 2.2, PINK, '#ffd84a');

  // beehive hanging from a branch
  const hx = cx + 12;
  p.line(
    [
      { x: hx, y: cy - 24 },
      { x: hx, y: cy - 17 },
    ],
    '#8a5a3a',
    0.9,
  );
  path(
    p,
    hgrad(p, hx - 6, hx + 6, [
      [0, '#f6d088'],
      [0.6, '#e8b35a'],
      [1, '#c98a3a'],
    ]),
    O,
    (c) => {
      c.moveTo(hx, cy - 17);
      c.bezierCurveTo(hx + 1, cy - 17, hx + 5.6, cy - 12, hx + 5.6, cy - 7.5);
      c.bezierCurveTo(hx + 5.6, cy - 3.5, hx + 3, cy - 1.8, hx, cy - 1.8);
      c.bezierCurveTo(hx - 3, cy - 1.8, hx - 5.6, cy - 3.5, hx - 5.6, cy - 7.5);
      c.bezierCurveTo(hx - 5.6, cy - 12, hx - 1, cy - 17, hx, cy - 17);
      c.closePath();
    },
    1,
  );
  p.line(
    [
      { x: hx - 5, y: cy - 8 },
      { x: hx + 5, y: cy - 8 },
    ],
    shade('#c98a3a', -0.2),
    0.8,
  );
  p.line(
    [
      { x: hx - 5, y: cy - 4.8 },
      { x: hx + 5, y: cy - 4.8 },
    ],
    shade('#c98a3a', -0.2),
    0.8,
  );
  p.circle(hx, cy - 2.6, 1.1, '#5a3a22', null);

  // two little bees
  bee(p, cx - 21, cy - 30, 2.8);
  bee(p, cx - 6, cy - 60, 2.4);
};

/** Fallback for a keepsake added without bespoke art: a little sparkly box. */
const fallback: Painter = (p) => {
  const c = p.center;
  p.shadow(c.x, c.y + 1, 14, 6, 0.28);
  p.box(0.3, 0.3, 0.4, 0.4, 16, '#e9b872', 0);
  sparkle(p, c.x + 12, c.y - 24, 2.4);
};

const TABLE: Record<string, [number, Painter]> = {
  owl_clock: [74, owlClock],
  mayor_gazebo: [88, mayorGazebo],
  bread_cart: [52, breadCart],
  golden_egg_nest: [48, goldenEggNest],
  mud_spa: [28, mudSpa],
  pizza_oven: [66, pizzaOven],
  carrot_lamp: [62, carrotLamp],
  rose_arbor: [66, roseArbor],
  knitting_basket: [58, knittingBasket],
  quilt_line: [50, quiltLine],
  honey_shelf: [70, honeyShelf],
  honey_tree: [66, honeyTree],
};

export const sprites: SpriteSpec[] = FRIEND_DECORATIONS.map((d) => {
  const [height, paint] = TABLE[d.id] ?? [40, fallback];
  return { key: `deco:${d.id}`, fw: d.w, fh: d.h, height, paint };
});

// ---------------------------------------------------------------------------
// Icons (flat, 40x40)

/** A cream envelope with a pink heart wax seal, tilted a touch. */
function iconLetter(p: Pen): void {
  p.save();
  p.ctx.translate(20, 21);
  p.ctx.rotate(-0.12);
  p.ellipse(1.5, 12.5, 14, 2.6, 'rgba(60,40,30,0.18)', null);
  // body
  const body = vgrad(p, -9, 10, [
    [0, '#fffaf2'],
    [1, '#f6dcc0'],
  ]);
  p.roundRect(-14, -9, 28, 19, 2.6, body, O);
  // flap
  p.poly(
    [
      { x: -14, y: -9 },
      { x: 14, y: -9 },
      { x: 0, y: 2 },
    ],
    '#fff0dc',
    O,
    1.1,
  );
  // wax seal
  const sealG = p.ctx.createRadialGradient(-1.5, -1.5, 0.5, 0, 0, 5);
  sealG.addColorStop(0, '#ff9dbd');
  sealG.addColorStop(1, ROSE);
  p.circle(0, 1.2, 4.6, sealG, O);
  p.heart(0, 1.4, 2.2, '#ffe3ec', null);
  p.circle(-1.8, -0.8, 0.8, 'rgba(255,255,255,0.8)', null);
  p.restore();
}

/** An open envelope with a letter peeking out and a tiny heart on it. */
function iconLetterOpen(p: Pen): void {
  p.save();
  p.ctx.translate(20, 22);
  p.ellipse(0, 13.5, 14, 2.6, 'rgba(60,40,30,0.18)', null);
  // open back flap
  p.poly(
    [
      { x: -14, y: -3 },
      { x: 0, y: -18 },
      { x: 14, y: -3 },
    ],
    shade('#fff0dc', -0.1),
    O,
    1.1,
  );
  // letter
  p.roundRect(-9, -16, 18, 17, 1.6, WHITE, O);
  p.line(
    [
      { x: -5.5, y: -11.5 },
      { x: 2, y: -11.5 },
    ],
    PINK_D,
    0.9,
  );
  p.line(
    [
      { x: -5.5, y: -8.5 },
      { x: 4.5, y: -8.5 },
    ],
    PINK_D,
    0.9,
  );
  p.heart(-0.5, -4.2, 2.6, ROSE, null);
  // envelope body and front flap
  const body = vgrad(p, -3, 14, [
    [0, '#fffaf2'],
    [1, '#f6dcc0'],
  ]);
  p.roundRect(-14, -3, 28, 17, 2.4, body, O);
  p.poly(
    [
      { x: -14, y: -3 },
      { x: 14, y: -3 },
      { x: 0, y: 8 },
    ],
    '#fff0dc',
    O,
    1.1,
  );
  p.restore();
}

/** Two overlapping pink hearts with a sparkle: friendship. */
function iconFriendship(p: Pen): void {
  p.heart(14.5, 22.5, 9, LILAC, O);
  shine(p, 11.5, 18.2, 1.4);
  const hg = p.ctx.createRadialGradient(24, 17, 1, 25, 21, 12);
  hg.addColorStop(0, '#ffd6e6');
  hg.addColorStop(0.6, PINK);
  hg.addColorStop(1, PINK_D);
  p.heart(25, 21, 10.5, hg, O);
  shine(p, 21.5, 15.5, 1.8);
  sparkle(p, 33.5, 9, 4.2);
  sparkle(p, 7.5, 9.5, 2.4);
}

export const icons: IconSpec[] = [
  { key: 'icon:letter', paint: iconLetter },
  { key: 'icon:letter_open', paint: iconLetterOpen },
  { key: 'icon:friendship', paint: iconFriendship },
];
