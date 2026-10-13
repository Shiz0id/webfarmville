// Town projects: the notice-board vignettes (one 96px diorama per PROJECT_LIST
// entry) and the town hall icon for the panel header. Same house style as
// cooking.ts and kitty_goodies.ts: chunky rounded shapes, the warm brown
// OUTLINE, top-left light, glossy highlights and pastel colour. Every scene
// sits on a small rounded grassy tile with a dirt edge.
import { PROJECT_LIST } from '@farm/shared';
import { type IconSpec, type Pen, type Pt, OUTLINE, rgba, rng, shade } from './kit';

const O = OUTLINE;
const WHITE = '#ffffff';
const INK = '#2b1d14';
const BLUSH = 'rgba(255,110,140,0.5)';
const NOTE = '#8a68d6';

const GRASS_L = '#c9f29a';
const GRASS = '#93d874';
const GRASS_D = '#5fb24f';
const DIRT = '#c8905c';
const DIRT_D = '#8c5a34';

const WOOD = '#dca36a';
const WOOD_D = '#9a6638';
const WOOD_L = '#f0c98f';
const STONE = '#dcd7cc';
const STONE_L = '#eeebe3';
const STONE_D = '#a9a295';
const WATER = '#86d8f0';
const WATER_D = '#3f9cc8';
const BLUE_GLASS = '#c4ecff';
const LEAF = '#6cc45a';
const PINK = '#ffb3cf';
const PINK_D = '#e77fa6';
const PINK_L = '#ffe2ee';
const RED = '#f0707a';
const CREAM = '#fff6e6';
const BUTTER = '#ffe49a';
const MINT = '#a8e6cf';
const LILAC = '#c9b8f5';
const PEACH = '#ffc49a';
const ORANGE = '#ff9d4a';
const CORAL = '#ef8a7e';
const FUR = '#f9b98c';

type Ctx = CanvasRenderingContext2D;
type Fill = string | CanvasGradient | null;

// ---------------------------------------------------------------------------
// Helpers

/** Build a path with raw canvas calls, then fill and/or stroke it. */
function shape(p: Pen, build: (c: Ctx) => void, fill: Fill, stroke: string | null = O, width = p.lineWidth): void {
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

/** Left-lit horizontal gradient (wood, paint, fabric). */
function hgrad(p: Pen, x0: number, x1: number, color: string, lit = 0.28, dark = -0.22): CanvasGradient {
  const g = p.ctx.createLinearGradient(x0, 0, x1, 0);
  g.addColorStop(0, shade(color, lit));
  g.addColorStop(0.55, color);
  g.addColorStop(1, shade(color, dark));
  return g;
}

/** A glossy highlight dab. */
function gloss(p: Pen, x: number, y: number, rx: number, ry: number, rot = -0.4, alpha = 0.75): void {
  p.ellipse(x, y, rx, ry, rgba(WHITE, alpha), null, rot);
}

/** Plain ring stroke (ripples, decorative edges). */
function ring(p: Pen, x: number, y: number, rx: number, ry: number, color: string, width: number): void {
  const c = p.ctx;
  c.beginPath();
  c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  c.strokeStyle = color;
  c.lineWidth = width;
  c.stroke();
}

/** A thick outlined stick: posts, rods, stems. */
function stick(p: Pen, pts: Pt[], w: number, color: string): void {
  p.line(pts, O, w + 1.6);
  p.line(pts, color, w);
}

/** Point on a quadratic bezier at t. */
function qpt(a: Pt, c: Pt, b: Pt, t: number): Pt {
  const u = 1 - t;
  return { x: u * u * a.x + 2 * u * t * c.x + t * t * b.x, y: u * u * a.y + 2 * u * t * c.y + t * t * b.y };
}

/** Unit normal of a quadratic bezier at t. */
function qnorm(a: Pt, c: Pt, b: Pt, t: number): Pt {
  const dx = 2 * (1 - t) * (c.x - a.x) + 2 * t * (b.x - c.x);
  const dy = 2 * (1 - t) * (c.y - a.y) + 2 * t * (b.y - c.y);
  const l = Math.hypot(dx, dy) || 1;
  return { x: -dy / l, y: dx / l };
}

/** A shaded sphere-ish ball, used for fruit and berries. */
function fruit(p: Pen, x: number, y: number, r: number, color: string): void {
  p.ball(x, y, r, color, O);
  p.circle(x - r * 0.35, y - r * 0.35, r * 0.25, rgba(WHITE, 0.85), null);
}

/** Wispy steam: an S-curve with a faint dark edge so it reads on pale backgrounds. */
function steam(p: Pen, x: number, y: number, h: number): void {
  const edge = 'rgba(74,52,38,0.22)';
  const curves = (col: string, w: number) => {
    p.curve({ x, y }, { x: x - 2.4, y: y - h * 0.35 }, { x: x + 0.6, y: y - h * 0.55 }, col, w);
    p.curve({ x: x + 0.6, y: y - h * 0.55 }, { x: x + 2.6, y: y - h * 0.75 }, { x: x + 0.2, y: y - h }, col, w);
  };
  curves(edge, 2.6);
  curves(rgba(WHITE, 0.95), 1.3);
}

/** A striped shop awning from x0 to x1 (top at y0), scalloped along its lower edge at y1. */
function awning(p: Pen, x0: number, x1: number, y0: number, y1: number, n: number, a: string, b: string): void {
  const w = (x1 - x0) / n;
  for (let i = 0; i < n; i++) {
    const xa = x0 + i * w;
    const col = i % 2 === 0 ? a : b;
    shape(
      p,
      (c) => {
        c.moveTo(xa, y0);
        c.lineTo(xa + w, y0);
        c.lineTo(xa + w, y1);
        c.lineTo(xa, y1);
      },
      col,
    );
  }
  for (let i = 0; i < n; i++) {
    const xa = x0 + i * w;
    p.arc(xa + w / 2, y1, w / 2, 0, Math.PI, i % 2 === 0 ? a : b);
  }
}

/** A tiny cloud of wrapped bunting: a sagging string with triangle flags. */
function bunting(p: Pen, a: Pt, c: Pt, b: Pt, n: number, cols: string[], flagH = 6.5): void {
  p.curve(a, c, b, O, 0.9);
  for (let i = 1; i < n; i++) {
    const q = qpt(a, c, b, i / n);
    p.poly([{ x: q.x - 3, y: q.y }, { x: q.x + 3, y: q.y }, { x: q.x, y: q.y + flagH }], cols[i % cols.length], O, 0.9);
  }
}

/** A folded-over grassy diorama tile with a dirt edge: the stage for every scene. */
function tile(p: Pen, seed: number | string, cx = 48, cy = 66, rx = 42, ry = 20): void {
  // the dirt side shows as a crescent below the grass
  p.ellipse(cx, cy + 6, rx, ry, p.vgrad(cy, cy + ry + 6, DIRT, DIRT_D));
  const g = p.ctx.createRadialGradient(cx - rx * 0.3, cy - ry * 0.5, 2, cx, cy, rx * 1.1);
  g.addColorStop(0, GRASS_L);
  g.addColorStop(0.55, GRASS);
  g.addColorStop(1, GRASS_D);
  p.ellipse(cx, cy, rx, ry, g);
  // little grass tufts scattered over the top
  const r = rng(seed);
  for (let i = 0; i < 18; i++) {
    const x = cx + (r() * 2 - 1) * rx * 0.82;
    const y = cy + (r() * 2 - 1) * ry * 0.78;
    const dx = (x - cx) / rx;
    const dy = (y - cy) / ry;
    if (dx * dx + dy * dy > 0.62) continue;
    p.line(
      [
        { x: x - 2, y: y + 1 },
        { x: x - 1, y: y - 2.2 },
        { x, y: y + 1 },
      ],
      GRASS_D,
      0.9,
    );
    p.line(
      [
        { x: x + 1.2, y: y + 1 },
        { x: x + 2, y: y - 1.8 },
        { x: x + 3, y: y + 1 },
      ],
      GRASS_D,
      0.9,
    );
  }
}

/** A round lily pad with a little notch cut out of one side. */
function lilyPad(p: Pen, x: number, y: number, r: number): void {
  p.ellipse(x, y, r, r * 0.6, '#84d670');
  p.poly([{ x, y }, { x: x + r * 1.05, y: y - r * 0.2 }, { x: x + r * 1.05, y: y + r * 0.2 }], WATER, null);
  p.ellipse(x - r * 0.3, y - r * 0.2, r * 0.45, r * 0.12, rgba(WHITE, 0.6), null, -0.2);
}

/** A reed with a brown cattail head. */
function reed(p: Pen, x: number, y: number, h: number, lean: number): void {
  const top = { x: x + lean, y: y - h };
  const mid = { x: x + lean * 0.35, y: y - h * 0.55 };
  stick(p, [{ x, y }, mid, top], 1.4, '#9fdc78');
  p.ellipse(top.x, top.y + 3.6, 1.9, 3.8, WOOD_D);
  p.line([{ x: top.x, y: top.y + 0.5 }, { x: top.x, y: top.y - 2 }], O, 0.6);
}

// ---------------------------------------------------------------------------
// Scene 1: the pond bridge

function pondBridge(p: Pen): void {
  tile(p, 'pond');
  // water with ripples and a glint
  p.ellipse(46, 64, 26, 10, p.vgrad(54, 74, '#bff1fd', WATER_D));
  ring(p, 40, 67, 9, 2.1, rgba(WHITE, 0.85), 0.9);
  ring(p, 56, 70, 4.5, 1.2, rgba(WHITE, 0.7), 0.8);
  gloss(p, 30, 61, 5, 1.2, -0.2, 0.8);
  // reeds on the bank
  reed(p, 22, 76, 20, -3);
  reed(p, 29, 80, 13, 2);
  reed(p, 74, 78, 22, 3);
  reed(p, 68, 81, 12, -2);
  // lily pads and a pink bloom
  lilyPad(p, 32, 67, 5.5);
  lilyPad(p, 50, 73, 4);
  lilyPad(p, 60, 61, 5);
  p.flower(60, 60, 2.4, PINK);

  // the arched footbridge: deck, planks, railing with posts
  const a = { x: 10, y: 70 };
  const c = { x: 46, y: 22 };
  const b = { x: 82, y: 70 };
  p.curve(a, c, b, O, 9.6);
  p.curve(a, c, b, WOOD, 6.6);
  p.curve({ x: a.x, y: a.y - 1.8 }, { x: c.x, y: c.y - 1.8 }, { x: b.x, y: b.y - 1.8 }, WOOD_L, 1.4);
  for (const t of [0.15, 0.3, 0.45, 0.6, 0.75, 0.9]) {
    const q = qpt(a, c, b, t);
    const n = qnorm(a, c, b, t);
    p.line(
      [
        { x: q.x - n.x * 3.4, y: q.y - n.y * 3.4 },
        { x: q.x + n.x * 3.4, y: q.y + n.y * 3.4 },
      ],
      WOOD_D,
      0.9,
    );
  }
  for (const t of [0.06, 0.32, 0.68, 0.94]) {
    const q = qpt(a, c, b, t);
    stick(p, [q, { x: q.x, y: q.y - 11 }], 2.2, WOOD_L);
  }
  const ra = { x: a.x, y: a.y - 11 };
  const rc = { x: c.x, y: c.y - 11 };
  const rb = { x: b.x, y: b.y - 11 };
  p.curve(ra, rc, rb, O, 4.4);
  p.curve(ra, rc, rb, WOOD_L, 2.4);

  // a fishing rod leaning on the railing, line dropping to a bobber
  stick(p, [{ x: 76, y: 78 }, { x: 70, y: 22 }], 1.8, '#a06a3e');
  p.line([{ x: 76, y: 78 }, { x: 75.2, y: 72 }], '#ff9fc0', 2.6);
  p.curve({ x: 70, y: 22 }, { x: 72, y: 44 }, { x: 56, y: 62 }, rgba(INK, 0.7), 0.7);
  p.circle(56, 64, 2.4, RED);
  p.arc(56, 64, 2.4, Math.PI, 0, WHITE, null);
}

// ---------------------------------------------------------------------------
// Scene 2: the market square

function stall(p: Pen, x0: number, colors: [string, string], goods: 'apples' | 'bread'): void {
  // posts, counter top and front
  p.rect(x0 + 1, 36, 2.6, 18, WOOD_D);
  p.rect(x0 + 22.4, 36, 2.6, 18, WOOD_D);
  p.roundRect(x0 - 1, 50, 28, 4, 1.5, hgrad(p, x0, x0 + 26, WOOD_L));
  p.roundRect(x0, 54, 26, 12, 1.5, hgrad(p, x0, x0 + 26, WOOD));
  p.line([{ x: x0 + 3, y: 58.5 }, { x: x0 + 23, y: 58.5 }], rgba(WOOD_D, 0.5), 0.9);
  // the awning on top
  awning(p, x0 - 4, x0 + 30, 30, 40, 4, colors[0], colors[1]);
  if (goods === 'apples') {
    fruit(p, x0 + 6, 48, 2.7, RED);
    fruit(p, x0 + 11.5, 47.2, 2.7, RED);
    fruit(p, x0 + 17, 48, 2.7, RED);
    p.ellipse(x0 + 12.4, 44.4, 1.6, 0.8, LEAF, O, -0.4);
  } else {
    p.ellipse(x0 + 8, 47.5, 4.2, 2.6, '#e9b26b');
    p.line([{ x: x0 + 5.8, y: 46.6 }, { x: x0 + 9.6, y: 45.6 }], rgba(WOOD_D, 0.7), 0.8);
    p.ellipse(x0 + 17, 47.5, 3.6, 2.4, '#f2c07a');
    p.line([{ x: x0 + 15.4, y: 46.8 }, { x: x0 + 18.4, y: 46.2 }], rgba(WOOD_D, 0.7), 0.8);
    p.roundRect(x0 + 21.5, 41.5, 4, 6, 1.2, PINK_D);
    p.rect(x0 + 21.2, 40.5, 4.6, 1.6, '#ffe9a8');
  }
}

function fountain(p: Pen, cx: number, cy: number): void {
  // stone basin with water
  p.ellipse(cx, cy, 12, 5.5, hgrad(p, cx - 12, cx + 12, STONE, 0.25, -0.2));
  p.ellipse(cx, cy - 0.6, 9.4, 3.8, p.vgrad(cy - 4, cy + 3, '#c6f2ff', WATER_D));
  gloss(p, cx - 4.5, cy - 1.8, 2.4, 0.7, -0.2, 0.7);
  // pillar and upper bowl
  p.roundRect(cx - 2.2, cy - 14, 4.4, 10.5, 1.2, hgrad(p, cx - 2.2, cx + 2.2, STONE_L, 0.2, -0.2));
  p.ellipse(cx, cy - 14, 6, 2.6, hgrad(p, cx - 6, cx + 6, STONE_L, 0.2, -0.2));
  p.ellipse(cx, cy - 14.4, 4.2, 1.5, WATER, null);
  // spout drop and splash ring
  p.circle(cx, cy - 19.5, 1.5, WATER, O);
  ring(p, cx, cy + 0.5, 15.5, 6.8, rgba(WHITE, 0.55), 0.8);
}

function marketSquare(p: Pen): void {
  tile(p, 'market');
  // bunting strung between the two stalls
  const cols = [PINK, BUTTER, MINT, LILAC, PEACH];
  bunting(p, { x: 6, y: 20 }, { x: 48, y: 36 }, { x: 90, y: 20 }, 12, cols);
  stall(p, 10, [RED, CREAM], 'apples');
  stall(p, 60, [MINT, CREAM], 'bread');
  fountain(p, 48, 66);
  // a couple of blossoms along the front
  p.flower(20, 79, 2.2, PINK_L);
  p.flower(76, 80, 2.2, PINK_L);
}

// ---------------------------------------------------------------------------
// Scene 3: the kitty shelter

function kittyShelter(p: Pen): void {
  tile(p, 'shelter');
  // house body with plank lines
  p.roundRect(22, 40, 48, 32, 3, hgrad(p, 22, 70, '#f3c08d', 0.22, -0.18));
  for (const y of [50, 58, 66]) p.line([{ x: 23.5, y }, { x: 68.5, y }], rgba(WOOD_D, 0.4), 0.9);
  // round windows
  for (const x of [30, 62]) {
    p.circle(x, 52, 3.8, BLUE_GLASS);
    p.line([{ x: x - 3.2, y: 52 }, { x: x + 3.2, y: 52 }], O, 0.7);
    p.line([{ x, y: 48.8 }, { x, y: 55.2 }], O, 0.7);
  }
  // round-topped door
  shape(
    p,
    (c) => {
      c.moveTo(38, 72);
      c.lineTo(38, 62);
      c.arc(46, 62, 8, Math.PI, 0);
      c.lineTo(54, 72);
    },
    p.vgrad(54, 72, '#b4eed4', '#74cba4'),
  );
  p.circle(50.5, 67, 1.2, '#ffd34a', O);

  // a stack of folded blankets beside the house
  p.roundRect(71, 62, 18, 7, 2.5, hgrad(p, 71, 89, LILAC, 0.2, -0.2));
  p.line([{ x: 74, y: 65.5 }, { x: 86, y: 65.5 }], rgba(WHITE, 0.6), 0.9);
  p.roundRect(73, 55, 15, 7, 2.5, hgrad(p, 73, 88, BUTTER, 0.2, -0.2));
  p.line([{ x: 76, y: 58.5 }, { x: 85, y: 58.5 }], rgba(WHITE, 0.6), 0.9);

  // cat-ear roof, drawn over the body
  shape(
    p,
    (c) => {
      c.moveTo(14, 46);
      c.lineTo(20, 18);
      c.lineTo(34, 33);
      c.lineTo(58, 33);
      c.lineTo(72, 18);
      c.lineTo(78, 46);
    },
    hgrad(p, 14, 78, '#ffa8c0', 0.25, -0.2),
  );
  p.poly(
    [
      { x: 21, y: 25 },
      { x: 26.5, y: 36 },
      { x: 18.5, y: 40 },
    ],
    PINK_L,
    null,
  );
  p.poly(
    [
      { x: 71, y: 25 },
      { x: 65.5, y: 36 },
      { x: 73.5, y: 40 },
    ],
    PINK_L,
    null,
  );
  p.line([{ x: 22, y: 40 }, { x: 70, y: 40 }], 'rgba(190,80,110,0.5)', 0.9);
  p.line([{ x: 30, y: 27 }, { x: 62, y: 27 }], 'rgba(190,80,110,0.45)', 0.9);
  gloss(p, 29, 40, 3.5, 1.1, -0.1, 0.6);

  // food bowl with kibble
  p.arc(16, 74, 6, 0, Math.PI, '#ff8fb0');
  p.ellipse(16, 74, 6, 2, '#ffd0de');
  p.ellipse(16, 73.8, 4.4, 1.2, '#b06a3c', null);
  for (const [x, y] of [
    [14, 73.4],
    [17.2, 72.8],
    [16, 74.6],
  ] as const) {
    p.circle(x, y, 0.9, '#e0a06a', null);
  }

  // a sleepy cat curled up at the door
  p.curve({ x: 54, y: 82 }, { x: 70, y: 88 }, { x: 66, y: 75 }, O, 4.4);
  p.curve({ x: 54, y: 82 }, { x: 70, y: 88 }, { x: 66, y: 75 }, FUR, 2.2);
  p.ellipse(45, 80, 12, 5.6, hgrad(p, 33, 57, FUR, 0.25, -0.2));
  p.curve({ x: 39, y: 76.4 }, { x: 41, y: 77.4 }, { x: 43, y: 75.6 }, '#e28a55', 0.9);
  p.curve({ x: 47, y: 76.6 }, { x: 49, y: 77.6 }, { x: 51, y: 75.8 }, '#e28a55', 0.9);
  // head with ears
  shape(
    p,
    (c) => {
      c.moveTo(28.6, 74.6);
      c.lineTo(29.6, 67.4);
      c.lineTo(35.4, 72.6);
    },
    FUR,
  );
  shape(
    p,
    (c) => {
      c.moveTo(32.6, 72.6);
      c.lineTo(38.4, 67.4);
      c.lineTo(39.4, 74.6);
    },
    FUR,
  );
  p.poly(
    [
      { x: 30.4, y: 72.4 },
      { x: 31, y: 70 },
      { x: 33, y: 71.8 },
    ],
    PINK_L,
    null,
  );
  p.ellipse(34, 78.4, 6.2, 5.2, hgrad(p, 28, 40, FUR, 0.25, -0.2));
  // closed, content eyes and a tiny smile
  p.curve({ x: 30.6, y: 78.2 }, { x: 31.6, y: 79.6 }, { x: 32.8, y: 78.2 }, INK, 0.9);
  p.curve({ x: 35.4, y: 78.2 }, { x: 36.4, y: 79.6 }, { x: 37.6, y: 78.2 }, INK, 0.9);
  p.ellipse(29.6, 81, 1.4, 0.8, BLUSH, null);
  p.ellipse(38.6, 81, 1.4, 0.8, BLUSH, null);
  p.curve({ x: 33.2, y: 81 }, { x: 34, y: 81.8 }, { x: 34.8, y: 81 }, INK, 0.6);
  // a paw tucked under the chin
  p.ellipse(41.5, 84.2, 2.4, 1.4, CREAM);

  // sleepy zs
  p.text('z', 84, 36, 8, NOTE);
  p.text('z', 90, 26, 6.5, NOTE);
}

// ---------------------------------------------------------------------------
// Scene 4: the town orchard

function hillPath(c: Ctx): void {
  c.moveTo(8, 70);
  c.bezierCurveTo(20, 44, 34, 40, 48, 40);
  c.bezierCurveTo(64, 40, 78, 44, 88, 70);
  c.ellipse(48, 70, 40, 16, 0, 0, Math.PI, false);
  c.closePath();
}

function townOrchard(p: Pen): void {
  tile(p, 'orchard');
  // a grassy hill rising from the tile
  shape(p, hillPath, p.vgrad(40, 86, '#c4f29c', GRASS), null);
  p.ctx.beginPath();
  p.ctx.moveTo(8, 70);
  p.ctx.bezierCurveTo(20, 44, 34, 40, 48, 40);
  p.ctx.bezierCurveTo(64, 40, 78, 44, 88, 70);
  p.ctx.strokeStyle = O;
  p.ctx.lineWidth = 1.6;
  p.ctx.stroke();
  p.ctx.beginPath();
  p.ctx.ellipse(48, 70, 40, 16, 0, 0, Math.PI, false);
  p.ctx.strokeStyle = GRASS_D;
  p.ctx.lineWidth = 1.2;
  p.ctx.stroke();

  // cherry tree on the crown of the hill, blossoms in pink
  stick(p, [{ x: 48, y: 50 }, { x: 48, y: 36 }], 4.2, WOOD);
  p.foliage(48, 30, 13, PINK, 'cherry', 8);
  for (const [x, y] of [
    [42, 26],
    [50, 22],
    [55, 30],
    [43, 34],
    [53, 36],
  ] as const) {
    p.circle(x, y, 1.6, '#fff0f6', PINK_D);
  }

  // apple tree on the left, red apples
  stick(p, [{ x: 22, y: 62 }, { x: 22, y: 48 }], 4, WOOD);
  p.foliage(22, 42, 12, LEAF, 'apple', 7);
  for (const [x, y] of [
    [16, 40],
    [24, 36],
    [27, 45],
    [18, 47],
  ] as const) {
    fruit(p, x, y, 2.2, RED);
  }

  // orange tree on the right, golden fruit
  stick(p, [{ x: 74, y: 62 }, { x: 74, y: 49 }], 4, WOOD);
  p.foliage(74, 42, 12, '#7fcf5f', 'orange', 7);
  for (const [x, y] of [
    [68, 40],
    [77, 36],
    [80, 45],
    [72, 47],
  ] as const) {
    fruit(p, x, y, 2.3, ORANGE);
  }

  // picnic blanket with a checked pattern and a basket of apples
  const bx = 38;
  const by = 81;
  const rx = 17;
  const ry = 6.2;
  p.ellipse(bx, by + 0.8, rx, ry, WOOD_D);
  p.ellipse(bx, by, rx, ry, '#ff8fa8');
  p.save();
  p.ctx.beginPath();
  p.ctx.ellipse(bx, by, rx, ry, 0, 0, Math.PI * 2);
  p.ctx.clip();
  // a checkered cloth: cream squares on a pink base
  for (let i = 0; i < 8; i++) {
    for (let j = 0; j < 2; j++) {
      if ((i + j) % 2 === 0) p.rect(bx - rx + i * 4.25, by - ry + j * ry, 4.25, ry, '#fff6e6', null);
    }
  }
  p.restore();
  p.ellipse(bx, by, rx, ry, null, O);
  // a wicker basket of apples on the corner
  const kx = bx + 7;
  const ky = by - 4;
  p.arc(kx, ky, 5.2, 0, Math.PI, '#e8b070');
  for (const d of [-2.2, 0.8]) p.line([{ x: kx - 4.6, y: ky + d + 1.2 }, { x: kx + 4.6, y: ky + d + 1.2 }], rgba(WOOD_D, 0.6), 0.7);
  p.ellipse(kx, ky, 5.2, 1.6, '#c98b53');
  fruit(p, kx - 2.4, ky - 2.6, 2.2, RED);
  fruit(p, kx + 2.4, ky - 2.9, 2.2, RED);
  p.ellipse(kx + 0.2, ky - 5.2, 1.4, 0.7, LEAF, O, -0.3);
  p.flower(bx - 11, by - 4, 1.8, PINK);
}

// ---------------------------------------------------------------------------
// Scene 5: the community kitchen

function pie(p: Pen, x: number, y: number, r: number): void {
  p.ellipse(x, y + 1.2, r, r * 0.5, '#d8903e');
  p.ellipse(x, y, r, r * 0.52, '#f5b25a');
  p.line([{ x: x - r * 0.7, y: y - r * 0.2 }, { x: x + r * 0.7, y: y + r * 0.2 }], '#c98b3a', 0.8);
  p.line([{ x: x + r * 0.6, y: y - r * 0.25 }, { x: x - r * 0.6, y: y + r * 0.25 }], '#c98b3a', 0.8);
  gloss(p, x - r * 0.4, y - r * 0.2, 1.1, 0.5, -0.3, 0.7);
}

function communityKitchen(p: Pen): void {
  tile(p, 'kitchen');
  // chimney with a puff of steam, behind the roof
  p.roundRect(60, 20, 9, 18, 1.5, hgrad(p, 60, 69, '#e09a80', 0.2, -0.2));
  p.line([{ x: 60, y: 27 }, { x: 69, y: 27 }], rgba(O, 0.35), 0.8);
  p.line([{ x: 60, y: 33 }, { x: 69, y: 33 }], rgba(O, 0.35), 0.8);
  p.roundRect(58, 16, 13, 4.5, 1.5, '#c46a52');
  steam(p, 64.5, 14, 11);

  // cottage walls
  p.roundRect(20, 44, 56, 30, 3, hgrad(p, 20, 76, '#fff0c9', 0.2, -0.16));
  // gable roof with shingle rows
  shape(
    p,
    (c) => {
      c.moveTo(12, 46);
      c.lineTo(48, 14);
      c.lineTo(84, 46);
    },
    hgrad(p, 12, 84, CORAL, 0.25, -0.2),
  );
  p.line([{ x: 22, y: 38 }, { x: 74, y: 38 }], 'rgba(160,50,50,0.4)', 0.9);
  p.line([{ x: 31, y: 30 }, { x: 65, y: 30 }], 'rgba(160,50,50,0.4)', 0.9);

  // window with a striped awning and pies cooling on the sill
  p.rect(26, 52, 18, 12, BLUE_GLASS);
  p.line([{ x: 35, y: 52 }, { x: 35, y: 64 }], O, 0.8);
  p.line([{ x: 26, y: 58 }, { x: 44, y: 58 }], O, 0.8);
  awning(p, 24, 46, 46, 50, 4, CORAL, CREAM);
  p.rect(24, 63, 22, 3, WOOD_L);
  pie(p, 30, 60, 4.7);
  pie(p, 40, 60, 4.7);

  // door with a little heart sign
  shape(
    p,
    (c) => {
      c.moveTo(54, 74);
      c.lineTo(54, 60);
      c.arc(61, 60, 7, Math.PI, 0);
      c.lineTo(68, 74);
    },
    hgrad(p, 54, 68, '#c9875a', 0.2, -0.2),
  );
  p.circle(65, 67, 1.1, '#ffd34a', O);
  p.heart(61, 49, 2.2, PINK_D);

  // flowers in front
  p.flower(16, 77, 2.4, PINK);
  p.flower(79, 79, 2.4, '#ffe39a');
  p.flower(84, 72, 1.8, PINK_L);
}

// ---------------------------------------------------------------------------
// Scene 6: the village bandstand

function bandColumn(p: Pen, x: number, base: number): void {
  p.ellipse(x, base, 3.4, 1.4, STONE_D, null);
  p.roundRect(x - 2.2, base - 22, 4.4, 22, 1.4, hgrad(p, x - 2.2, x + 2.2, WHITE, 0.1, -0.2));
  p.rect(x - 3, base - 2, 6, 2.2, STONE_L);
}

function bandNote(p: Pen, x: number, y: number, s: number, color: string): void {
  p.ellipse(x, y, 2.6 * s, 1.9 * s, color, O, -0.4);
  p.line(
    [
      { x: x + 2.4 * s, y },
      { x: x + 2.4 * s, y: y - 9 * s },
    ],
    O,
    0.9,
  );
  p.curve({ x: x + 2.4 * s, y: y - 9 * s }, { x: x + 6 * s, y: y - 7 * s }, { x: x + 4.2 * s, y: y - 3.8 * s }, O, 1.2);
}

function bandstand(p: Pen): void {
  tile(p, 'bandstand');
  // round platform with a side and a glossy top
  p.ellipse(48, 68, 26, 8, '#e6d2b0');
  p.ellipse(48, 63, 26, 8, hgrad(p, 22, 74, '#fffaf0', 0.1, -0.1));
  ring(p, 48, 63, 19, 5, 'rgba(200,170,130,0.5)', 0.9);

  // back columns first, then the front ones
  const cols: [number, number][] = [
    [38, 58.5],
    [58, 58.5],
    [28, 63],
    [68, 63],
    [38, 67.5],
    [58, 67.5],
  ];
  for (const [x, base] of cols.slice(0, 2)) bandColumn(p, x, base);
  for (const [x, base] of cols.slice(2)) bandColumn(p, x, base);

  // a scalloped dome roof, striped in red and cream
  const roof = (c: Ctx) => {
    c.moveTo(20, 41);
    c.bezierCurveTo(20, 24, 34, 19, 48, 19);
    c.bezierCurveTo(62, 19, 76, 24, 76, 41);
    c.ellipse(48, 41, 28, 6, 0, 0, Math.PI, false);
    c.closePath();
  };
  shape(p, roof, RED);
  p.save();
  p.ctx.beginPath();
  roof(p.ctx);
  p.ctx.clip();
  for (let x = 30; x < 72; x += 8) p.rect(x, 12, 4, 40, CREAM, null);
  p.restore();
  shape(p, roof, null);
  // scallops along the lower rim
  for (let i = 0; i < 7; i++) {
    const x = 24 + i * 8;
    const yEdge = 41 + 6 * Math.sqrt(Math.max(0, 1 - ((x - 48) / 28) ** 2));
    p.circle(x, yEdge - 1, 4, i % 2 === 0 ? RED : CREAM);
  }
  p.circle(48, 16.5, 2.6, BUTTER);

  // bunting strung under the rim
  bunting(p, { x: 22, y: 45 }, { x: 48, y: 58 }, { x: 74, y: 45 }, 7, [PINK, BUTTER, MINT, LILAC], 5.5);

  // music notes floating above
  bandNote(p, 10, 34, 1.1, LILAC);
  bandNote(p, 82, 24, 0.95, MINT);
  bandNote(p, 86, 48, 0.8, PINK);
}

// ---------------------------------------------------------------------------
// The town hall icon (40px header)

function townHall(p: Pen): void {
  p.lineWidth = 1.1;
  p.shadow(20, 37, 16, 3, 0.25);
  // steps
  p.roundRect(4, 33, 32, 4, 1.2, STONE);
  // the hall body
  p.roundRect(7, 17, 26, 17, 1.5, hgrad(p, 7, 33, '#fff4e0', 0.2, -0.15));
  p.line([{ x: 13, y: 18 }, { x: 13, y: 33 }], rgba(O, 0.25), 0.7);
  p.line([{ x: 27, y: 18 }, { x: 27, y: 33 }], rgba(O, 0.25), 0.7);
  // a pediment roof
  p.poly(
    [
      { x: 4, y: 18 },
      { x: 20, y: 7 },
      { x: 36, y: 18 },
    ],
    '#f08a8a',
  );
  // clock face in the pediment
  p.circle(20, 14.6, 3.6, WHITE);
  p.line([{ x: 20, y: 14.6 }, { x: 20, y: 12 }], INK, 0.7);
  p.line([{ x: 20, y: 14.6 }, { x: 22, y: 15.6 }], INK, 0.7);
  // windows and the arched door
  p.roundRect(9, 21, 4.5, 5, 1.2, BLUE_GLASS);
  p.roundRect(26.5, 21, 4.5, 5, 1.2, BLUE_GLASS);
  p.roundRect(16.5, 25, 7, 9, 3.5, hgrad(p, 16.5, 23.5, WOOD_D, 0.2, -0.2));
  // flag on a little pole
  p.line([{ x: 20, y: 7 }, { x: 20, y: 0.8 }], O, 0.9);
  p.poly(
    [
      { x: 20, y: 1 },
      { x: 27, y: 3 },
      { x: 20, y: 5.2 },
    ],
    '#ff7aa2',
    O,
    0.7,
  );
}

// ---------------------------------------------------------------------------
// Exports

const PAINTERS: Record<string, (p: Pen) => void> = {
  pond_bridge: pondBridge,
  market_square: marketSquare,
  kitty_shelter: kittyShelter,
  town_orchard: townOrchard,
  community_kitchen: communityKitchen,
  bandstand,
};

export const icons: IconSpec[] = [
  ...PROJECT_LIST.map((proj) => ({
    key: `town:${proj.id}`,
    size: 96,
    paint: (p: Pen) => {
      p.lineWidth = 1.6;
      (PAINTERS[proj.id] ?? ((q: Pen) => tile(q, proj.id)))(p);
    },
  })),
  { key: 'icon:town', paint: townHall },
];
