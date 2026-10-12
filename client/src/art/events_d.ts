// Spring event art: Hanami (cherry blossom picnic), Earth Day (heirloom tomatoes
// and nature scouts) and the spring egg hunt (painted eggs and rainbow radishes).
// Same house style as halloween.ts: chunky rounded shapes, dark outlines, light
// from the top left, kawaii faces with blush. Never scary.
import { type IconSpec, type Pen, type SpriteSpec, shade } from './kit';

interface P2 {
  x: number;
  y: number;
}

interface Spot extends P2 {
  u: number;
  v: number;
  i: number;
}

const EYE = '#2b1b12';
const INK = '#2b1d14';
const WHITE = '#ffffff';
const BLUSH = 'rgba(255,120,150,0.5)';
const SKIN = '#ffdcc2';
const SHOE = '#3b2a45';
const HAIR_BROWN = '#5a3a2a';

const SAKURA = '#ffb7cf';
const SAKURA_LT = '#fff1f7';
const POLLEN = '#ffd84a';
const GOLD = '#f2b632';
const GOLD_DK = '#b07a2a';
const TWIG = '#7a5538';
const CORD_PINK = '#e8476f';
const CLIP = '#ff8fb8';

const TEA = '#3f8f3a';
const TEA_TIP = '#c8f563';
const LEAF = '#8fd14f';
const LEAF_DK = '#4f8f2c';
const STEM = '#9ad85a';
const WOOD = '#d9a66a';
const WOOD_DK = '#9a6a3a';
const STAKE = '#c99a5b';
const SOIL = '#7a4f2a';
const CLAY = '#d9825a';
const CLAY_LT = '#e8966c';

const TOMATO_O = '#ff8a3d';
const TOMATO_P = '#8e4fa3';
const TOMATO_R = '#e8473b';
const UNRIPE = '#b6e26a';

const RADISH_PINK = '#ff7eb6';
const RADISH_PURPLE = '#a66ad8';
const RADISH_WHITE = '#fff9f4';
const RADISH_RED = '#e8403f';

const EGG_LILAC = '#cdb7ff';
const EGG_MINT = '#a8ebd0';
const EGG_PINK = '#ffb3d1';
const EGG_YELLOW = '#ffe68a';

const SCOUT_SHIRT = '#dcc08a';
const SCOUT_POCKET = '#c9a86c';
const SCOUT_LEG = '#6f8a4f';
const SCOUT_SHOE = '#5a3b26';
const SCOUT_HAT = '#4f8a4e';
const SCOUT_HAT_DK = '#3f7a3e';
const NECKER = '#e8583d';
const SASH = '#3f7a4a';

const PICNIC_DRESS = '#ffc6dc';
const PICNIC_TOP = '#ffe0ee';
const TIGHTS = '#c9b8f0';
const CLOTH = '#ff8fb8';

const BIB = '#9fc8ff';
const MINT = '#c9f5dc';
const PEACH_HAIR = '#ffd98a';
const BAND = '#ffb3d1';
const EAR_WHITE = '#fff8fb';

const KID_H = 36;

// ---------------------------------------------------------------------------
// Shared helpers

function thin(p: Pen, w: number, fn: () => void): void {
  const old = p.lineWidth;
  p.lineWidth = w;
  fn();
  p.lineWidth = old;
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

/** Chunky face for tiny characters and crops: s scales it. */
function miniFace(p: Pen, x: number, y: number, s: number): void {
  for (const sx of [-1, 1]) {
    const ex = x + sx * 1.9 * s;
    p.ellipse(ex, y - 0.2 * s, 0.8 * s, 1 * s, EYE, null);
    p.circle(ex - 0.28 * s, y - 0.6 * s, 0.3 * s, WHITE, null);
    p.ellipse(x + sx * 2.9 * s, y + 0.9 * s, 0.7 * s, 0.45 * s, BLUSH, null);
  }
  p.curve({ x: x - s, y: y + s }, { x, y: y + 2.2 * s }, { x: x + s, y: y + s }, EYE, 0.6);
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
function stalk(p: Pen, a: P2, c: P2, b: P2, color: string, w: number): void {
  p.curve(a, c, b, p.outline, w + 1.2);
  p.curve(a, c, b, color, w);
}

/** Footprint points as canvas spots, drawn back to front (ascending u + v). */
function spots(p: Pen, pts: [number, number][]): Spot[] {
  return pts
    .slice()
    .sort((a, b) => a[0] + a[1] - (b[0] + b[1]) || a[0] - a[1] - (b[0] - b[1]))
    .map(([u, v], i) => ({ u, v, i, ...p.iso(u, v) }));
}

/** One sakura petal: a soft heart shape with a notch at the tip. Base at (x, y). */
function petal(p: Pen, x: number, y: number, R: number, ang: number, fill: string): void {
  const ctx = p.ctx;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(ang);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.bezierCurveTo(-R * 0.95, -R * 0.2, -R * 0.9, -R * 1.1, -R * 0.2, -R * 0.95);
  ctx.quadraticCurveTo(0, -R * 0.7, R * 0.2, -R * 0.95);
  ctx.bezierCurveTo(R * 0.9, -R * 1.1, R * 0.95, -R * 0.2, 0, 0);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = p.outline;
  ctx.lineWidth = p.lineWidth * 0.7;
  ctx.stroke();
  ctx.restore();
}

/** A five-petal sakura blossom with a pollen centre. R is the petal length. */
function sakura(p: Pen, x: number, y: number, R: number, rot = 0, fill = SAKURA): void {
  for (let i = 0; i < 5; i++) petal(p, x, y, R, rot + (i / 5) * Math.PI * 2, fill);
  p.circle(x, y, R * 0.26, POLLEN, null);
}

/** A ball-shaped tomato with a green star calyx on top. */
function tomatoBall(p: Pen, x: number, y: number, r: number, color: string): void {
  p.ball(x, y, r, color);
  p.star(x, y - r * 0.92, r * 0.42, LEAF, LEAF_DK);
  p.ellipse(x - r * 0.38, y - r * 0.36, r * 0.26, r * 0.14, 'rgba(255,255,255,0.6)', null, -0.5);
}

/** Three leaves fanning up from (x, y). */
function rosette(p: Pen, x: number, y: number, len: number, w: number): void {
  leaf(p, x, y, len, -2.25, w, LEAF);
  leaf(p, x, y, len * 1.1, -Math.PI / 2, w, shade(LEAF, -0.06));
  leaf(p, x, y, len, -0.9, w, LEAF);
}

/** A radish bulb with a little tap root. (x, y) is the bulb centre. */
function radishBulb(p: Pen, x: number, y: number, r: number, color: string): void {
  p.curve({ x, y: y + r * 0.8 }, { x: x + 0.5, y: y + r * 1.5 }, { x: x - 0.5, y: y + r * 1.95 }, p.outline, Math.max(1.4, r * 0.34));
  p.curve({ x, y: y + r * 0.8 }, { x: x + 0.5, y: y + r * 1.5 }, { x: x - 0.5, y: y + r * 1.95 }, shade(color, -0.12), Math.max(0.7, r * 0.15));
  p.ball(x, y, r, color);
  p.ellipse(x - r * 0.42, y - r * 0.42, r * 0.28, r * 0.16, 'rgba(255,255,255,0.6)', null, -0.6);
}

/** A tied wooden stake from (x, yb) up to (x, yt). */
function stake(p: Pen, x: number, yb: number, yt: number): void {
  p.line([{ x, y: yb }, { x, y: yt }], p.outline, 2.2);
  p.line([{ x, y: yb }, { x, y: yt }], STAKE, 1.0);
}

/** A rounded tea bush with bright tips. (x, y) is the bush centre. */
function teaBush(p: Pen, x: number, y: number, r: number, seed: number, tips: boolean): void {
  p.shadow(x, y + r * 0.7, r * 1.2, r * 0.42, 0.22);
  p.foliage(x, y, r, TEA, seed, 6);
  if (tips) {
    for (const [dx, dy] of [
      [-0.45, -0.8],
      [0.25, -0.98],
      [0.62, -0.42],
      [-0.12, -0.42],
    ] as const) {
      p.circle(x + dx * r, y + dy * r, Math.max(0.6, r * 0.17), TEA_TIP, null);
    }
  }
}

// ---------------------------------------------------------------------------
// Crops (no soil; the footprint is one tile)

const BUSH_ROWS: [number, number][] = [
  [0.22, 0.3],
  [0.78, 0.3],
  [0.22, 0.72],
  [0.78, 0.72],
];

/** Matcha stage 0: low seedling bushes with pale new growth. */
function matchaStage0(p: Pen): void {
  for (const s of spots(p, BUSH_ROWS)) teaBush(p, s.x, s.y - 1.5, 3.6, s.i + 2, false);
}

/** Matcha stage 1: fuller bushes in two neat rows, a few with tips. */
function matchaStage1(p: Pen): void {
  for (const s of spots(p, BUSH_ROWS)) teaBush(p, s.x, s.y - 3, 5, s.i + 5, s.i % 2 === 0);
}

/** Matcha stage 2: bright fresh tips, and a happy face on the front bush. */
function matchaStage2(p: Pen): void {
  const pts = spots(p, BUSH_ROWS);
  pts.forEach((s, idx) => {
    const front = idx === pts.length - 1;
    teaBush(p, s.x, s.y - 4.5, 6.4, idx + 9, true);
    if (front) miniFace(p, s.x, s.y - 4.4, 1.55);
    if (idx === 1) sparkle(p, s.x + 7, s.y - 14, 1.2);
  });
}

const QUIN: [number, number][] = [
  [0.27, 0.27],
  [0.73, 0.27],
  [0.5, 0.5],
  [0.27, 0.73],
  [0.73, 0.73],
];

/** Heirloom stage 0: tiny staked seedlings. */
function tomatoStage0(p: Pen): void {
  for (const s of spots(p, QUIN.slice(0, 4))) {
    p.shadow(s.x, s.y, 3.6, 1.5, 0.22);
    stake(p, s.x + 1.2, s.y, s.y - 8);
    stalk(p, { x: s.x, y: s.y }, { x: s.x - 0.2, y: s.y - 2.4 }, { x: s.x, y: s.y - 4.2 }, STEM, 0.8);
    leaf(p, s.x, s.y - 4, 4.6, -2.5, 2, LEAF);
    leaf(p, s.x, s.y - 4, 4.6, -0.6, 2, shade(LEAF, -0.06));
  }
}

/** Heirloom stage 1: bushier staked plants with unripe green fruit. */
function tomatoStage1(p: Pen): void {
  for (const s of spots(p, QUIN)) {
    p.shadow(s.x, s.y, 5.4, 2.2, 0.24);
    stake(p, s.x + 1.5, s.y, s.y - 16);
    p.foliage(s.x, s.y - 7.5, 4.8, LEAF, s.i + 3, 6);
    tomatoBall(p, s.x + 2.8, s.y - 3.2, 1.9, UNRIPE);
    if (s.i % 2 === 0) tomatoBall(p, s.x - 2.6, s.y - 5.6, 1.7, UNRIPE);
  }
}

/** Heirloom stage 2: chunky orange, purple and red tomatoes; a face on the front one. */
function tomatoStage2(p: Pen): void {
  const pts = spots(p, [
    [0.26, 0.6],
    [0.7, 0.3],
    [0.72, 0.8],
  ]);
  pts.forEach((s, idx) => {
    p.shadow(s.x, s.y, 6.4, 2.8, 0.26);
    stake(p, s.x + 1.6, s.y, s.y - 27);
    p.foliage(s.x, s.y - 11, 6.4, LEAF, idx + 4, 6);
    if (idx === 0) {
      tomatoBall(p, s.x - 3.4, s.y - 6.4, 3.3, TOMATO_O);
      tomatoBall(p, s.x + 3.2, s.y - 14, 2.9, TOMATO_P);
    } else if (idx === 1) {
      tomatoBall(p, s.x - 3.2, s.y - 14.6, 3, TOMATO_R);
      tomatoBall(p, s.x + 3.6, s.y - 6.2, 3.2, TOMATO_O);
    } else {
      tomatoBall(p, s.x + 0.2, s.y - 2.6, 2.9, TOMATO_O);
      tomatoBall(p, s.x + 3.8, s.y - 10.6, 3.4, TOMATO_P);
      tomatoBall(p, s.x - 3.8, s.y - 6.2, 3.9, TOMATO_R);
      miniFace(p, s.x - 3.8, s.y - 6.4, 1.05);
    }
  });
}

/** Rainbow radish stage 0: tiny leafy rosettes with pink tops just showing. */
function radishStage0(p: Pen): void {
  for (const s of spots(p, QUIN)) {
    p.shadow(s.x, s.y, 3.4, 1.5, 0.24);
    p.circle(s.x, s.y - 1, 1.6, RADISH_PINK);
    rosette(p, s.x, s.y - 1, 4.6, 1.6);
  }
}

const RADISH_COLS = [RADISH_PINK, RADISH_PURPLE, RADISH_WHITE, RADISH_RED, RADISH_PINK];

/** Rainbow radish stage 1: leafy rosettes with radish shoulders showing. */
function radishStage1(p: Pen): void {
  for (const s of spots(p, QUIN)) {
    p.shadow(s.x, s.y, 5.4, 2.3, 0.24);
    radishBulb(p, s.x, s.y - 2.2, 2.7, RADISH_COLS[s.i % RADISH_COLS.length]);
    rosette(p, s.x, s.y - 3.6, 6.4, 2.1);
  }
}

/** Rainbow radish stage 2: pink, purple, white and red radishes; a face on the front one. */
function radishStage2(p: Pen): void {
  const pts = spots(p, QUIN);
  pts.forEach((s, idx) => {
    const front = idx === pts.length - 1;
    const r = front ? 5.6 : 5.1;
    p.shadow(s.x, s.y, 6.4, 2.8, 0.26);
    rosette(p, s.x, s.y - r - 1, 9.4, 2.7);
    radishBulb(p, s.x, s.y - r + 0.2, r, RADISH_COLS[idx % RADISH_COLS.length]);
    if (front) miniFace(p, s.x, s.y - r + 0.4, 1.2);
  });
}

// ---------------------------------------------------------------------------
// Kids: 36px tall, facing bottom-left, two frames each (the walk frame swaps the
// legs into mid-stride and bounces the body). Paint space: (0, 0) is ground centre.

function local(p: Pen, draw: () => void): void {
  const c = p.center;
  p.save();
  p.ctx.translate(c.x, c.y);
  draw();
  p.restore();
}

function kidLegs(p: Pen, walk: boolean, leg: string, shoe: string = SHOE): void {
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

/** A little oval egg with a glint. */
function eggOval(p: Pen, x: number, y: number, rx: number, ry: number, color: string): void {
  p.ellipse(x, y, rx, ry, color);
  p.ellipse(x - rx * 0.4, y - ry * 0.4, rx * 0.25, ry * 0.22, 'rgba(255,255,255,0.7)', null);
}

/** Picnicker: pastel dress, bob with a sakura clip, a basket and a sakura branch. */
function kidPicnic(p: Pen, walk: boolean): void {
  local(p, () => {
    const b = walk ? -0.9 : 0;
    p.shadow(0, 0, 9.5, 3.2, 0.25);
    kidLegs(p, walk, TIGHTS);

    // flared dress with a ribbon hem, then a bodice
    p.poly(
      [
        { x: -5.2, y: -17.6 + b },
        { x: 5.2, y: -17.6 + b },
        { x: 9.2, y: -6.4 + b },
        { x: -9.2, y: -6.4 + b },
      ],
      PICNIC_DRESS,
    );
    p.poly(
      [
        { x: -9.2, y: -8.6 + b },
        { x: 9.2, y: -8.6 + b },
        { x: 9.2, y: -6.4 + b },
        { x: -9.2, y: -6.4 + b },
      ],
      CLOTH,
      null,
    );
    p.roundRect(-5.4, -18.4 + b, 10.8, 7.4, 2.8, PICNIC_TOP);
    for (const s of [-1, 1]) {
      p.poly(
        [
          { x: 0, y: -12.4 + b },
          { x: s * 3.4, y: -14.6 + b },
          { x: s * 3.4, y: -10.2 + b },
        ],
        CLOTH,
        p.outline,
        0.7,
      );
    }
    p.circle(0, -12.4 + b, 0.9, '#ff5f9e', null);

    // basket hung from the left hand
    limb(p, { x: -4.8, y: -16.4 + b }, { x: -12.6, y: -14 + b }, 2.4, PICNIC_TOP);
    p.curve({ x: -15.6, y: -10.2 + b }, { x: -12.6, y: -18.4 + b }, { x: -9.2, y: -10.2 + b }, p.outline, 2.2);
    p.curve({ x: -15.6, y: -10.2 + b }, { x: -12.6, y: -18.4 + b }, { x: -9.2, y: -10.2 + b }, WOOD_DK, 1.0);
    p.poly(
      [
        { x: -16.4, y: -10.2 + b },
        { x: -8.6, y: -10.2 + b },
        { x: -9.6, y: -3.6 + b },
        { x: -15.4, y: -3.6 + b },
      ],
      p.vgrad(-10.2 + b, -3.6 + b, '#e8bd82', '#b98348'),
    );
    p.line(
      [
        { x: -15.2, y: -7.2 + b },
        { x: -9.6, y: -7.2 + b },
      ],
      WOOD_DK,
      0.6,
    );
    p.rect(-16.6, -11.4 + b, 8.4, 1.8, CLOTH);
    p.rect(-8.4, -11.4 + b, 0.1, 1.8, CLOTH, null);
    p.circle(-12.6, -14 + b, 1.6, SKIN);

    // tiny sakura branch in the right hand
    limb(p, { x: 5, y: -16.4 + b }, { x: 9.6, y: -12.4 + b }, 2.4, PICNIC_TOP);
    p.line(
      [
        { x: 9.6, y: -12.2 + b },
        { x: 12.8, y: -25 + b },
      ],
      p.outline,
      2.1,
    );
    p.line(
      [
        { x: 9.6, y: -12.2 + b },
        { x: 12.8, y: -25 + b },
      ],
      TWIG,
      0.9,
    );
    sakura(p, 11.6, -18.6 + b, 2.2, -0.4, SAKURA_LT);
    sakura(p, 12.8, -25.4 + b, 2.8, 0.2);
    sakura(p, 15.4, -20.2 + b, 2.3, 0.9, SAKURA_LT);
    p.circle(9.6, -12.2 + b, 1.6, SKIN);

    // head: bob hair, a sakura hair clip, and the kawaii face
    const hx = -0.4;
    const hy = -24 + b;
    p.ball(hx, hy, 8.2, SKIN);
    p.ellipse(hx + 0.2, hy - 3.6, 8.6, 4.8, HAIR_BROWN);
    p.ellipse(hx - 7.6, hy + 1.8, 1.9, 4.6, HAIR_BROWN);
    p.ellipse(hx + 7.8, hy + 1.8, 1.9, 4.6, HAIR_BROWN);
    p.ellipse(hx - 3, hy - 5.4, 2.4, 1.2, 'rgba(255,255,255,0.22)', null, -0.5);
    sakura(p, hx + 5.6, hy - 4.6, 2.3, 0.3, CLIP);
    kidFace(p, hx, hy);
  });
}

/** Nature scout: khaki uniform, neckerchief, sash with a badge, scout hat, and a potted sapling. */
function kidScout(p: Pen, walk: boolean): void {
  local(p, () => {
    const b = walk ? -0.9 : 0;
    p.shadow(0, 0, 9.5, 3.2, 0.25);
    kidLegs(p, walk, SCOUT_LEG, SCOUT_SHOE);

    p.roundRect(-6, -17.6 + b, 12, 11.4, 3, SCOUT_SHIRT);
    p.roundRect(2.2, -14.6 + b, 3.4, 3.2, 1, SCOUT_POCKET, null);

    // left arm and hand
    limb(p, { x: -5.2, y: -16 + b }, { x: -7.8, y: -9.6 + b }, 2.4, SCOUT_SHIRT);
    p.circle(-7.8, -9.2 + b, 1.6, SKIN);

    // right arm reaching for a clay pot with a sapling in it
    limb(p, { x: 5.2, y: -16 + b }, { x: 7.4, y: -9.4 + b }, 2.4, SCOUT_SHIRT);
    p.poly(
      [
        { x: 6.4, y: -11.8 + b },
        { x: 13, y: -11.8 + b },
        { x: 11.9, y: -4.8 + b },
        { x: 7.5, y: -4.8 + b },
      ],
      CLAY,
    );
    stalk(p, { x: 9.8, y: -12.2 + b }, { x: 9.6, y: -17.2 + b }, { x: 10.8, y: -21.4 + b }, STEM, 1.2);
    leaf(p, 10.2, -18.4 + b, 4.6, -2.5, 1.9, LEAF);
    leaf(p, 10.6, -20.2 + b, 4.2, -0.7, 1.8, shade(LEAF, -0.06));
    p.rect(5.8, -13.2 + b, 8.2, 2, CLAY_LT);
    p.circle(7.6, -8.8 + b, 1.6, SKIN);

    // neckerchief and sash with a badge
    p.poly(
      [
        { x: -4.4, y: -17.8 + b },
        { x: 4.4, y: -17.8 + b },
        { x: 0, y: -13.2 + b },
      ],
      NECKER,
    );
    p.line(
      [
        { x: -5.4, y: -16.2 + b },
        { x: 5.2, y: -7.2 + b },
      ],
      p.outline,
      3.8,
    );
    p.line(
      [
        { x: -5.4, y: -16.2 + b },
        { x: 5.2, y: -7.2 + b },
      ],
      SASH,
      2.4,
    );
    p.circle(0.2, -11.4 + b, 2.1, GOLD);
    p.star(0.2, -11.4 + b, 1.1, '#fff1b8', null);

    // head: hair under a green scout hat with a brim and a gold badge
    const hx = -0.4;
    const hy = -24 + b;
    p.ball(hx, hy, 8.2, SKIN);
    p.ellipse(hx - 3.2, hy - 0.4, 2.6, 1.5, HAIR_BROWN);
    p.ellipse(hx + 4.2, hy - 0.6, 2.2, 1.4, HAIR_BROWN);
    kidFace(p, hx, hy);
    p.ellipse(hx + 0.2, hy - 6.4, 8.4, 5.4, SCOUT_HAT);
    p.ellipse(hx - 3, hy - 8.4, 2.4, 1.1, 'rgba(255,255,255,0.25)', null, -0.4);
    p.ellipse(hx + 0.2, hy - 3.6, 10.8, 2.5, SCOUT_HAT_DK);
    p.line(
      [
        { x: hx - 7.4, y: hy - 4.8 },
        { x: hx + 7.6, y: hy - 4.8 },
      ],
      '#e8c04a',
      1.2,
    );
    p.circle(hx - 4.6, hy - 7.4, 1.3, GOLD, null);
  });
}

/** Egg hunter: mint shirt and blue overalls, a basket of eggs, a raised egg and bunny-ear headband. */
function kidEgg(p: Pen, walk: boolean): void {
  local(p, () => {
    const b = walk ? -0.9 : 0;
    p.shadow(0, 0, 9.5, 3.2, 0.25);
    kidLegs(p, walk, BIB);

    p.roundRect(-6, -17.6 + b, 12, 11, 3, MINT);
    p.roundRect(-4.6, -13.8 + b, 9.2, 7.8, 2, BIB);
    p.rect(-4.4, -18 + b, 1.9, 4.6, BIB);
    p.rect(2.5, -18 + b, 1.9, 4.6, BIB);
    p.circle(-2.4, -12.2 + b, 0.9, GOLD, null);
    p.circle(2.4, -12.2 + b, 0.9, GOLD, null);

    // left arm holding a basket of eggs
    limb(p, { x: -5.2, y: -16 + b }, { x: -9.4, y: -11.2 + b }, 2.4, MINT);
    p.curve({ x: -15.4, y: -11.2 + b }, { x: -11.6, y: -19 + b }, { x: -7.6, y: -11.2 + b }, p.outline, 2.0);
    p.curve({ x: -15.4, y: -11.2 + b }, { x: -11.6, y: -19 + b }, { x: -7.6, y: -11.2 + b }, WOOD_DK, 0.9);
    p.poly(
      [
        { x: -16, y: -11.2 + b },
        { x: -7.2, y: -11.2 + b },
        { x: -8.2, y: -4.4 + b },
        { x: -14.8, y: -4.4 + b },
      ],
      p.vgrad(-11.2 + b, -4.4 + b, '#e8bd82', '#b98348'),
    );
    p.line(
      [
        { x: -15.2, y: -7.6 + b },
        { x: -8.4, y: -7.6 + b },
      ],
      WOOD_DK,
      0.6,
    );
    eggOval(p, -13.4, -13.4 + b, 1.9, 2.5, EGG_PINK);
    eggOval(p, -10.2, -14.2 + b, 1.9, 2.5, EGG_MINT);
    eggOval(p, -8.4, -12.6 + b, 1.7, 2.3, EGG_YELLOW);
    p.rect(-16.4, -11.8 + b, 9.6, 1.6, '#c98f52');
    p.circle(-9.4, -11 + b, 1.6, SKIN);

    // right arm raising a painted egg up high
    limb(p, { x: 5.2, y: -16 + b }, { x: 9.4, y: -20.2 + b }, 2.4, MINT);
    p.circle(9.6, -20.4 + b, 1.6, SKIN);
    eggOval(p, 10.6, -25.6 + b, 3.1, 3.9, EGG_YELLOW);
    p.line(
      [
        { x: 7.9, y: -26.6 + b },
        { x: 9.3, y: -24.8 + b },
        { x: 10.7, y: -26.6 + b },
        { x: 12.1, y: -24.8 + b },
        { x: 13.3, y: -26.6 + b },
      ],
      '#ff8fc0',
      1.1,
    );

    // head: bunny ears, peach hair, a pink headband and the kawaii face
    const hx = -0.4;
    const hy = -24 + b;
    for (const s of [-1, 1]) {
      p.ellipse(hx + s * 4.4, hy - 10.4, 2.1, 4.6, EAR_WHITE, p.outline, s * 0.18);
      p.ellipse(hx + s * 4.4, hy - 10.2, 1, 3.4, BAND, null, s * 0.18);
    }
    p.ball(hx, hy, 8.2, SKIN);
    p.ellipse(hx + 0.2, hy - 3.6, 8.6, 4.8, PEACH_HAIR);
    p.ellipse(hx - 3, hy - 5.4, 2.4, 1.2, 'rgba(255,255,255,0.3)', null, -0.5);
    p.ellipse(hx + 0.2, hy - 4.2, 8.5, 1.5, BAND);
    kidFace(p, hx, hy);
  });
}

// ---------------------------------------------------------------------------
// Costume overlays (drawn on the animal's head; (cx, cy) is the crown line)

/** A ring of sakura blossoms, pink and white, with a little green vine under them. */
function flowerCrown(p: Pen): void {
  const cx = p.center.x;
  const cy = p.center.y - 14;
  p.ellipse(cx, cy, 11, 3.6, null, LEAF_DK, 0);
  const bl: { x: number; y: number; back: boolean; i: number }[] = [];
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2 + 0.25;
    bl.push({ x: cx + Math.cos(a) * 11, y: cy + Math.sin(a) * 3.6, back: Math.sin(a) < 0, i });
  }
  for (let i = 0; i < 7; i++) {
    const a = ((i + 0.5) / 7) * Math.PI * 2 + 0.25;
    const x = cx + Math.cos(a) * 11;
    const y = cy + Math.sin(a) * 3.6;
    leaf(p, x, y, 3.4, -Math.PI / 2 + Math.cos(a) * 0.9, 1.3, LEAF);
  }
  bl.sort((a, b) => a.y - b.y);
  for (const f of bl) sakura(p, f.x, f.y, f.back ? 3.1 : 3.7, f.i * 0.8, f.i % 2 ? SAKURA_LT : SAKURA);
}

/** A crown of green leaves fanning out from a thin vine ring. */
function leafCrown(p: Pen): void {
  const cx = p.center.x;
  const cy = p.center.y - 14;
  p.ellipse(cx, cy, 10.6, 3.4, null, LEAF_DK);
  const items: { x: number; y: number; back: boolean; a: number; i: number }[] = [];
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2 + 0.2;
    items.push({ x: cx + Math.cos(a) * 10.6, y: cy + Math.sin(a) * 3.4, back: Math.sin(a) < 0, a, i });
  }
  items.sort((a, b) => a.y - b.y);
  for (const it of items) {
    const ang = -Math.PI / 2 + Math.cos(it.a) * 0.95;
    leaf(p, it.x, it.y, it.back ? 5.2 : 6.6, ang, it.back ? 1.8 : 2.4, it.i % 2 ? LEAF : shade(LEAF, 0.1));
  }
}

/** A pink headband with two long white bunny ears. */
function bunnyEars(p: Pen): void {
  const cx = p.center.x;
  const cy = p.center.y - 14;
  for (const s of [-1, 1]) {
    const ex = cx + s * 4.6;
    const ey = cy - 8;
    p.ellipse(ex, ey, 2.9, 7.6, EAR_WHITE, p.outline, s * 0.16);
    p.ellipse(ex, ey + 0.6, 1.3, 5.2, BAND, null, s * 0.16);
  }
  p.ellipse(cx, cy + 0.6, 9.4, 2.4, BAND);
  p.ellipse(cx + 7.4, cy + 1, 2.2, 1.6, CLIP);
}

// ---------------------------------------------------------------------------
// Icons (flat 40x40)

function iconSakuraCharm(p: Pen): void {
  p.shadow(20, 37, 7, 2, 0.22);
  // loop at the top of the cord
  p.ellipse(20, 4.6, 2.4, 2.4, null, GOLD_DK);
  p.line(
    [
      { x: 20, y: 6.8 },
      { x: 20, y: 8.6 },
    ],
    GOLD_DK,
    1.2,
  );
  // tassel strands
  for (const dx of [-2.8, -1.4, 0, 1.4, 2.8]) {
    const a = { x: 20 + dx * 0.4, y: 28.6 };
    const b = { x: 20 + dx, y: 35 };
    p.line([a, b], p.outline, 2.2);
    p.line([a, b], CORD_PINK, 1.1);
  }
  p.circle(20, 27.6, 2.4, GOLD);
  // the flower
  sakura(p, 20, 17.4, 10.2, 0);
  p.ellipse(15.2, 11.2, 1.4, 0.8, 'rgba(255,255,255,0.7)', null, -0.5);
  sparkle(p, 6, 8, 2.2);
  sparkle(p, 34, 12, 1.6);
}

/** A cup of frothy matcha with bubbles on top and a kawaii face on the cup. */
function iconMatcha(p: Pen): void {
  p.shadow(20, 36.6, 12, 2.8, 0.22);
  const ctx = p.ctx;
  const cup = (): void => {
    ctx.beginPath();
    ctx.moveTo(8.2, 15.4);
    ctx.lineTo(31.8, 15.4);
    ctx.quadraticCurveTo(30.8, 31.6, 27.4, 34.6);
    ctx.quadraticCurveTo(20, 36.6, 12.6, 34.6);
    ctx.quadraticCurveTo(9.2, 31.6, 8.2, 15.4);
    ctx.closePath();
  };
  cup();
  ctx.fillStyle = p.vgrad(15, 35, '#fffdf6', '#e6dcc4');
  ctx.fill();
  ctx.save();
  cup();
  ctx.clip();
  ctx.fillStyle = '#b9e58a';
  ctx.fillRect(7, 28, 26, 9);
  ctx.restore();
  cup();
  ctx.strokeStyle = p.outline;
  ctx.lineWidth = 1;
  ctx.stroke();

  // the matcha surface with frothy bubbles
  p.ellipse(20, 15.4, 11.8, 3.6, p.vgrad(12, 19, '#8fd05a', '#4f9a32'));
  for (const [x, y, r] of [
    [15.4, 14.6, 1.3],
    [20.2, 13.6, 1.5],
    [24.8, 15.2, 1.2],
    [18.2, 16.6, 0.9],
    [22.6, 16.8, 0.8],
  ] as const) {
    p.circle(x, y, r, '#eaffd0', null);
  }
  miniFace(p, 20, 25, 2.4);
  sparkle(p, 6, 9, 2.2);
  sparkle(p, 34, 10, 1.6);
}

/** A wooden token with a sprouting seedling on it. */
function iconSeedToken(p: Pen): void {
  p.shadow(20, 37, 12, 2.8, 0.22);
  p.circle(20, 24, 13.8, WOOD_DK);
  p.ball(20, 21.4, 13.8, WOOD);
  p.circle(20, 21.4, 10.6, null, WOOD_DK);
  p.curve({ x: 9.6, y: 16.4 }, { x: 15.6, y: 13.8 }, { x: 22.4, y: 15.6 }, WOOD_DK, 0.6);
  p.curve({ x: 12.4, y: 26.8 }, { x: 20, y: 25.4 }, { x: 28.6, y: 27.2 }, WOOD_DK, 0.6);
  p.ellipse(20, 29.4, 6.2, 1.9, SOIL);
  stalk(p, { x: 20, y: 29.2 }, { x: 19.2, y: 25 }, { x: 20.4, y: 20.6 }, STEM, 1.8);
  leaf(p, 20.2, 21, 6.4, -2.6, 2.9, LEAF);
  leaf(p, 20.4, 21, 6.6, -0.55, 2.9, shade(LEAF, -0.06));
  p.ellipse(15.6, 14.8, 2.6, 1.2, 'rgba(255,255,255,0.5)', null, -0.4);
  sparkle(p, 6, 8, 2.2);
  sparkle(p, 34, 12, 1.5);
}

/** A bunch of heirloom tomatoes, orange, purple and red, with a face on the red one. */
function iconHeirloomTomato(p: Pen): void {
  p.shadow(20, 36.6, 13, 3, 0.22);
  leaf(p, 20, 14.6, 6.4, -2.5, 2.6, LEAF);
  leaf(p, 20, 14.6, 6.6, -0.6, 2.6, shade(LEAF, -0.06));
  tomatoBall(p, 11.6, 25.4, 7.2, TOMATO_O);
  tomatoBall(p, 28.4, 24.6, 7.2, TOMATO_P);
  tomatoBall(p, 20, 29.6, 8.6, TOMATO_R);
  miniFace(p, 20, 30.2, 1.3);
  sparkle(p, 5, 8, 2);
  sparkle(p, 34, 12, 1.5);
}

/** One big radish with its leafy top. Its face, if any, sits on the bulb. */
function bigRadish(p: Pen, x: number, y: number, r: number, color: string, face: boolean): void {
  rosette(p, x, y - r * 0.9, r * 1.5, r * 0.3);
  radishBulb(p, x, y, r, color);
  if (face) miniFace(p, x, y + r * 0.15, r / 6);
}

/** A cluster of rainbow radishes in pink, purple, white and red. */
function iconRainbowRadish(p: Pen): void {
  p.shadow(20, 36.6, 13, 3, 0.22);
  bigRadish(p, 11.4, 26.4, 5.6, RADISH_PINK, false);
  bigRadish(p, 28.6, 25.6, 5.6, RADISH_PURPLE, false);
  bigRadish(p, 20.2, 27.6, 7.4, RADISH_WHITE, true);
  bigRadish(p, 31.4, 33.4, 4.4, RADISH_RED, false);
  sparkle(p, 6, 9, 2);
  sparkle(p, 34, 12, 1.5);
}

/** The egg outline, shaped like a real egg. */
function eggPath(ctx: CanvasRenderingContext2D): void {
  ctx.beginPath();
  ctx.moveTo(20, 4.5);
  ctx.bezierCurveTo(29.5, 4.5, 33.6, 19, 33.2, 26.4);
  ctx.bezierCurveTo(32.8, 33.6, 27.2, 36.6, 20, 36.6);
  ctx.bezierCurveTo(12.8, 36.6, 7.2, 33.6, 6.8, 26.4);
  ctx.bezierCurveTo(6.4, 19, 10.5, 4.5, 20, 4.5);
  ctx.closePath();
}

/** A pastel painted egg with zigzag bands and dots. */
function iconPaintedEgg(p: Pen): void {
  p.shadow(20, 36.8, 9, 2.4, 0.22);
  const ctx = p.ctx;
  eggPath(ctx);
  ctx.fillStyle = p.vgrad(4.5, 36.6, '#e4d8ff', EGG_LILAC);
  ctx.fill();
  ctx.save();
  eggPath(ctx);
  ctx.clip();
  const zigzag = (y: number, amp: number, color: string): void => {
    ctx.beginPath();
    let k = 0;
    for (let x = -2; x <= 42; x += 5, k++) {
      const yy = y + (k % 2 ? amp : -amp);
      if (k === 0) ctx.moveTo(x, yy);
      else ctx.lineTo(x, yy);
    }
    ctx.strokeStyle = color;
    ctx.lineWidth = 3.2;
    ctx.stroke();
  };
  zigzag(15.4, 2.2, EGG_PINK);
  zigzag(27.4, 2.0, EGG_MINT);
  p.circle(11.2, 31.8, 1.5, EGG_YELLOW, null);
  p.circle(24.6, 33.6, 1.6, EGG_YELLOW, null);
  p.circle(17.8, 36.2, 1.2, WHITE, null);
  p.circle(29.6, 22.4, 1.2, WHITE, null);
  p.circle(9.6, 22.2, 1.0, WHITE, null);
  ctx.fillStyle = 'rgba(70,40,110,0.14)';
  ctx.fillRect(24, 0, 20, 40);
  ctx.restore();
  eggPath(ctx);
  ctx.strokeStyle = p.outline;
  ctx.lineWidth = 1;
  ctx.stroke();
  p.ellipse(13.4, 13.6, 1.9, 3.4, 'rgba(255,255,255,0.75)', null, 0.35);
  sparkle(p, 33, 8, 2);
  sparkle(p, 6, 30, 1.4);
}

// ---------------------------------------------------------------------------
// Exports

export const sprites: SpriteSpec[] = [
  { key: 'crop:matcha:0', fw: 1, fh: 1, height: 14, paint: (p) => thin(p, 0.7, () => matchaStage0(p)) },
  { key: 'crop:matcha:1', fw: 1, fh: 1, height: 20, paint: (p) => thin(p, 0.9, () => matchaStage1(p)) },
  { key: 'crop:matcha:2', fw: 1, fh: 1, height: 26, paint: (p) => thin(p, 0.9, () => matchaStage2(p)) },

  { key: 'crop:heirloom_tomato:0', fw: 1, fh: 1, height: 14, paint: (p) => thin(p, 0.7, () => tomatoStage0(p)) },
  { key: 'crop:heirloom_tomato:1', fw: 1, fh: 1, height: 22, paint: (p) => thin(p, 0.9, () => tomatoStage1(p)) },
  { key: 'crop:heirloom_tomato:2', fw: 1, fh: 1, height: 32, paint: (p) => thin(p, 0.9, () => tomatoStage2(p)) },

  { key: 'crop:rainbow_radish:0', fw: 1, fh: 1, height: 14, paint: (p) => thin(p, 0.7, () => radishStage0(p)) },
  { key: 'crop:rainbow_radish:1', fw: 1, fh: 1, height: 20, paint: (p) => thin(p, 0.9, () => radishStage1(p)) },
  { key: 'crop:rainbow_radish:2', fw: 1, fh: 1, height: 30, paint: (p) => thin(p, 0.9, () => radishStage2(p)) },

  { key: 'npc:picnic_kid', fw: 1, fh: 1, height: KID_H, paint: (p) => kidPicnic(p, false) },
  { key: 'npc:picnic_kid_walk', fw: 1, fh: 1, height: KID_H, paint: (p) => kidPicnic(p, true) },
  { key: 'npc:scout_kid', fw: 1, fh: 1, height: KID_H, paint: (p) => kidScout(p, false) },
  { key: 'npc:scout_kid_walk', fw: 1, fh: 1, height: KID_H, paint: (p) => kidScout(p, true) },
  { key: 'npc:egg_hunter', fw: 1, fh: 1, height: KID_H, paint: (p) => kidEgg(p, false) },
  { key: 'npc:egg_hunter_walk', fw: 1, fh: 1, height: KID_H, paint: (p) => kidEgg(p, true) },

  { key: 'costume:flower_crown', fw: 1, fh: 1, height: 20, paint: flowerCrown },
  { key: 'costume:leaf_crown', fw: 1, fh: 1, height: 20, paint: leafCrown },
  { key: 'costume:bunny_ears', fw: 1, fh: 1, height: 20, paint: bunnyEars },
];

export const icons: IconSpec[] = [
  { key: 'icon:sakura_charm', paint: iconSakuraCharm },
  { key: 'icon:matcha', paint: iconMatcha },
  { key: 'icon:seed_token', paint: iconSeedToken },
  { key: 'icon:heirloom_tomato', paint: iconHeirloomTomato },
  { key: 'icon:painted_egg', paint: iconPaintedEgg },
  { key: 'icon:rainbow_radish', paint: iconRainbowRadish },
];
