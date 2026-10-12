// Home cooking art: one icon per dish in DISH_LIST, the kitchen props the
// mini-games are played with (96px), Mama Marigold's portrait and her two walk
// frames. Same house style as the rest of the art: chunky rounded shapes,
// dark-brown outlines, top-left light, kawaii dot-eyed faces with blush.
import { DISH_LIST } from '@farm/shared';
import { type IconSpec, type Pen, type SpriteSpec, mix, rgba, rng, shade } from './kit';

type Ctx = CanvasRenderingContext2D;
type Fill = string | CanvasGradient | null;
interface P2 {
  x: number;
  y: number;
}

const INK = '#2b1d14';
const WHITE = '#ffffff';
const BLUSH = 'rgba(255,110,140,0.5)';
const CREAM = '#fff6e6';

// ---------------------------------------------------------------------------
// Shared helpers

/** Build a path with raw canvas calls, then fill and outline it. */
function shape(p: Pen, build: (ctx: Ctx) => void, fill: Fill, stroke: string | null = p.outline, width = p.lineWidth): void {
  const ctx = p.ctx;
  ctx.beginPath();
  build(ctx);
  ctx.closePath();
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = width;
    ctx.stroke();
  }
}

/** Left-lit horizontal gradient (glazed ceramic, wood, metal). */
function hgrad(p: Pen, x0: number, x1: number, color: string, lit = 0.28, dark = -0.22): CanvasGradient {
  const g = p.ctx.createLinearGradient(x0, 0, x1, 0);
  g.addColorStop(0, shade(color, lit));
  g.addColorStop(0.55, color);
  g.addColorStop(1, shade(color, dark));
  return g;
}

/** Soft sphere shading, lit from the top left. */
function sphere(p: Pen, x: number, y: number, r: number, color: string): CanvasGradient {
  const g = p.ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r * 1.2);
  g.addColorStop(0, shade(color, 0.4));
  g.addColorStop(0.6, color);
  g.addColorStop(1, shade(color, -0.22));
  return g;
}

/** A softly lit blob (ellipse) for puffy shapes like shoulders and heads. */
function puff(p: Pen, x: number, y: number, rx: number, ry: number, color: string): void {
  p.ellipse(x, y, rx, ry, sphere(p, x - rx * 0.2, y, Math.max(rx, ry), color), p.outline);
}

/** A glossy highlight dab. */
function gloss(p: Pen, x: number, y: number, rx: number, ry: number, rot = -0.4, alpha = 0.75): void {
  p.ellipse(x, y, rx, ry, rgba(WHITE, alpha), null, rot);
}

/** Four-point twinkle. */
function glint(p: Pen, x: number, y: number, s: number, color = WHITE): void {
  shape(
    p,
    (ctx) => {
      ctx.moveTo(x, y - s);
      ctx.quadraticCurveTo(x, y, x + s, y);
      ctx.quadraticCurveTo(x, y, x, y + s);
      ctx.quadraticCurveTo(x, y, x - s, y);
      ctx.quadraticCurveTo(x, y, x, y - s);
    },
    color,
    null,
  );
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

/** Kawaii face: dot eyes with glints, pink cheeks and a small smile. s scales it. */
function kface(p: Pen, x: number, y: number, s = 1, ink = INK): void {
  for (const sx of [-1, 1]) {
    const ex = x + sx * 3.2 * s;
    p.ellipse(ex, y - 0.4 * s, 1.25 * s, 1.5 * s, ink, null);
    p.circle(ex - 0.42 * s, y - 1 * s, 0.45 * s, WHITE, null);
    p.ellipse(x + sx * 5.4 * s, y + 1.9 * s, 1.5 * s, 0.9 * s, BLUSH, null);
  }
  p.curve({ x: x - 1.2 * s, y: y + 1.3 * s }, { x, y: y + 2.7 * s }, { x: x + 1.2 * s, y: y + 1.3 * s }, ink, Math.max(0.5, 0.65 * s));
}

/** Plain ring stroke (for pastel rims and decorative edges). */
function ring(p: Pen, x: number, y: number, rx: number, ry: number, color: string, width: number, rot = 0): void {
  const ctx = p.ctx;
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2);
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.stroke();
}

/** A round ceramic bowl. `top` is the rim's centre height, `depth` how far the bowl drops below it. */
function bowl(p: Pen, cx: number, top: number, rx: number, depth: number, color: string, band?: string): void {
  shape(
    p,
    (ctx) => {
      ctx.moveTo(cx - rx, top);
      ctx.bezierCurveTo(cx - rx, top + depth * 0.7, cx - rx * 0.5, top + depth, cx, top + depth);
      ctx.bezierCurveTo(cx + rx * 0.5, top + depth, cx + rx, top + depth * 0.7, cx + rx, top);
    },
    hgrad(p, cx - rx, cx + rx, color),
  );
  if (band) {
    p.curve(
      { x: cx - rx * 0.92, y: top + depth * 0.42 },
      { x: cx, y: top + depth * 0.62 },
      { x: cx + rx * 0.92, y: top + depth * 0.42 },
      band,
      2.2,
    );
  }
  p.ellipse(cx, top, rx, rx * 0.26, shade(color, 0.42));
}

/** A flat plate seen from slightly above, with a pastel rim ring. */
function plate(p: Pen, cx: number, cy: number, rx: number, rimColor = '#ffc4d4'): void {
  const ry = rx * 0.3;
  p.ellipse(cx, cy + 2, rx, ry, shade('#e4ebf3', -0.14));
  p.ellipse(cx, cy, rx, ry, '#ffffff');
  ring(p, cx, cy, rx * 0.86, ry * 0.86, rimColor, 1.6);
  p.ellipse(cx, cy, rx * 0.66, ry * 0.66, null, rgba(INK, 0.2));
}

/** A tapering drum (pot, cake, cup) with its top ellipse; `top` is the top's centre height. */
function drum(p: Pen, cx: number, top: number, rx: number, ry: number, ht: number, color: string, topColor = shade(color, 0.22)): void {
  const bot = top + ht;
  shape(
    p,
    (ctx) => {
      ctx.moveTo(cx - rx, top);
      ctx.lineTo(cx - rx, bot);
      ctx.ellipse(cx, bot, rx, ry, 0, Math.PI, 0, true);
      ctx.lineTo(cx + rx, top);
      ctx.ellipse(cx, top, rx, ry, 0, 0, -Math.PI, true);
    },
    hgrad(p, cx - rx, cx + rx, color, 0.3, -0.28),
  );
  p.ellipse(cx, top, rx, ry, topColor);
}

/** A little drip running down from (x, y), used for honey, icing and sauce. */
function drip(p: Pen, x: number, y: number, len: number, w: number, color: string): void {
  shape(
    p,
    (ctx) => {
      ctx.moveTo(x - w, y);
      ctx.lineTo(x + w, y);
      ctx.lineTo(x + w, y + len);
      ctx.quadraticCurveTo(x, y + len + w * 1.6, x - w, y + len);
    },
    color,
  );
}

// ---------------------------------------------------------------------------
// Dish icons (40x40, flat)

function gardenSalad(p: Pen): void {
  p.shadow(20, 36, 15, 3, 0.22);
  bowl(p, 20, 21, 15, 12, '#fff4e6', '#7fc8e8');
  p.ellipse(20, 21, 13.2, 3.3, '#eaf8df', null);
  p.foliage(20, 18, 9.5, '#8ed46a', 'salad', 6);
  p.ball(13.5, 18, 3.4, '#ff5d4f');
  p.star(13.5, 14.6, 1.2, '#5fbf4a', null);
  p.ball(26.5, 16.5, 3.2, '#ff5d4f');
  p.circle(19.5, 22.6, 2.4, '#ff9d3c');
  p.circle(19.5, 22.6, 1, '#ffd28a', null);
  p.circle(30, 21.4, 2.2, '#ff9d3c');
  p.circle(30, 21.4, 0.9, '#ffd28a', null);
  p.circle(23.5, 14.5, 2.2, '#c3eaa6');
  kface(p, 20, 28.5, 1);
  glint(p, 34, 9, 2.2);
}

function tomatoSoup(p: Pen): void {
  p.shadow(20, 36, 14, 3, 0.22);
  bowl(p, 20, 22, 15, 12, '#fff7ef', '#e8485a');
  p.ellipse(20, 22, 13.2, 3.3, '#ff7a4f');
  gloss(p, 15, 21.4, 2.6, 0.7, -0.2, 0.6);
  p.curve({ x: 14.5, y: 22.4 }, { x: 19, y: 19.4 }, { x: 25, y: 22.4 }, '#fff8ea', 1.2);
  p.curve({ x: 17.5, y: 23.6 }, { x: 21, y: 21.2 }, { x: 26, y: 23.2 }, '#fff8ea', 0.9);
  // basil leaf
  p.ellipse(27.4, 19.4, 2.4, 1.1, '#5fbf5a', p.outline, -0.5);
  p.line([{ x: 26.4, y: 20 }, { x: 28.4, y: 18.8 }], shade('#5fbf5a', -0.3), 0.5);
  kface(p, 20, 30, 1);
  steam(p, 14, 15, 10);
  steam(p, 21, 14, 12);
  steam(p, 27, 15.5, 8);
}

function omelette(p: Pen): void {
  p.shadow(20, 36, 16, 3, 0.22);
  plate(p, 20, 31, 17);
  shape(
    p,
    (ctx) => {
      ctx.moveTo(6.5, 28);
      ctx.bezierCurveTo(4.6, 16, 13, 8.6, 20.4, 8.6);
      ctx.bezierCurveTo(29.6, 8.6, 36, 16.6, 33.4, 28);
      ctx.quadraticCurveTo(20, 33.4, 6.5, 28);
    },
    p.vgrad(8, 32, '#ffe68a', '#f2b23e'),
  );
  // the folded seam and fluffy highlights
  p.curve({ x: 12.6, y: 21 }, { x: 19.6, y: 16.4 }, { x: 28.4, y: 20.4 }, '#e09a2e', 1);
  gloss(p, 13.4, 14.8, 3.2, 1.4, -0.4, 0.7);
  gloss(p, 27.8, 17, 1.6, 0.8, -0.2, 0.6);
  for (const [x, y] of [
    [10.6, 25.6],
    [29.8, 25],
    [22.4, 26.8],
  ] as const) {
    p.circle(x, y, 0.8, '#5fbf5a', null);
  }
  kface(p, 20, 22.4, 1.1);
  glint(p, 35, 9, 2);
}

function veggieStirfry(p: Pen): void {
  p.shadow(20, 36, 16, 3, 0.22);
  // wooden handle, behind the wok
  p.line([{ x: 32, y: 21 }, { x: 38.6, y: 16.4 }], p.outline, 5.4);
  p.line([{ x: 32, y: 21 }, { x: 38.6, y: 16.4 }], '#b07a4a', 3.2);
  p.line([{ x: 34, y: 19.6 }, { x: 37, y: 17.6 }], rgba(WHITE, 0.4), 0.9);
  // wok body
  shape(
    p,
    (ctx) => {
      ctx.moveTo(5.6, 21);
      ctx.quadraticCurveTo(7, 33.5, 20, 33.5);
      ctx.quadraticCurveTo(33, 33.5, 34.4, 21);
    },
    hgrad(p, 5, 35, '#55505e', 0.3, -0.3),
  );
  p.ellipse(20, 21, 14.4, 4, '#2f2b35');
  // stir-fry in the pan
  p.ellipse(15, 20, 2.1, 0.9, '#ffe16b', null, -0.4);
  p.circle(14, 18.2, 2.5, '#ff9a3a');
  p.circle(14, 18.2, 1, '#ffc27a', null);
  p.ball(18.6, 16.2, 3, '#6fbf4a');
  p.ball(25, 17, 3.2, '#7fd05a');
  p.circle(23.4, 20.6, 2.2, '#ff9a3a');
  p.line([{ x: 20.4, y: 21.2 }, { x: 27.4, y: 20.2 }], '#ff4f5f', 2);
  p.circle(30.2, 19.4, 1.1, '#fff1d6', null);
  // the rim, drawn last so the food sits inside it
  ring(p, 20, 21, 14.4, 4, p.outline, 1);
  kface(p, 20, 28.6, 1, '#fff6e8');
  steam(p, 17, 11, 6);
  steam(p, 25, 10, 5);
  glint(p, 34, 8, 1.9);
}

function cornChowder(p: Pen): void {
  p.shadow(20, 36, 15, 3, 0.22);
  // corn cob leaning on the rim
  p.ellipse(33.4, 11.6, 2.5, 6.2, '#ffd23f', p.outline, 0.45);
  p.line([{ x: 32.4, y: 8 }, { x: 33.6, y: 15 }], shade('#ffd23f', -0.3), 0.5);
  p.line([{ x: 34.4, y: 9 }, { x: 35, y: 14 }], shade('#ffd23f', -0.3), 0.5);
  p.ellipse(31.2, 7.4, 2.4, 1.8, '#8fd14f', p.outline, -0.6);
  bowl(p, 20, 21, 15, 12, '#fff1d6', '#f7b33a');
  p.ellipse(20, 21, 13.2, 3.3, '#ffe9a0');
  for (const [x, y] of [
    [14.5, 20.6],
    [18, 19.4],
    [21.6, 21.4],
    [25.4, 19.8],
    [28.4, 21.2],
  ] as const) {
    p.ellipse(x, y, 1.5, 1.1, '#ffc83a', shade('#ffc83a', -0.4), 0.3);
  }
  // potato cubes and chives
  p.roundRect(10.6, 19.6, 3.2, 3, 0.8, '#fff8ea');
  p.roundRect(22.2, 22.2, 3, 2.8, 0.8, '#fff8ea');
  for (const [x, y] of [
    [16.8, 22.6],
    [25.6, 23.8],
  ] as const) {
    p.circle(x, y, 0.7, '#5fbf5a', null);
  }
  kface(p, 20, 29.4, 1);
  steam(p, 15, 12, 8);
  steam(p, 22, 11, 9);
}

function buttery(p: Pen): void {
  p.shadow(20, 36, 16, 3, 0.22);
  plate(p, 20, 31, 16);
  // a fluffy mound of mash
  p.ellipse(20, 28.6, 13, 4.6, '#fff2d6', p.outline);
  puff(p, 14.2, 24.6, 5.2, 4.8, '#fff7e6');
  puff(p, 25.8, 24.6, 5.2, 4.8, '#fff7e6');
  puff(p, 20, 21.6, 6.4, 5.8, '#fffbf1');
  p.curve({ x: 15.6, y: 25.6 }, { x: 18, y: 22.6 }, { x: 22.6, y: 23.2 }, '#e6d2ae', 0.8);
  // a melting butter pat
  p.poly(
    [
      { x: 19.4, y: 14.6 },
      { x: 24.4, y: 16.2 },
      { x: 20.8, y: 18.4 },
      { x: 15.6, y: 16.8 },
    ],
    '#fff09a',
  );
  p.poly(
    [
      { x: 15.6, y: 16.8 },
      { x: 20.8, y: 18.4 },
      { x: 20.8, y: 19.8 },
      { x: 15.6, y: 18.2 },
    ],
    '#efd76a',
  );
  glint(p, 27.6, 11, 1.8, '#fff6c8');
  kface(p, 20, 24.4, 0.95);
  // chives
  for (const [x, y] of [
    [11.6, 22.6],
    [29, 22],
  ] as const) {
    p.circle(x, y, 0.8, '#5fbf5a', null);
  }
  steam(p, 22, 12, 6);
}

function shortcake(p: Pen): void {
  p.shadow(20, 36, 16, 3, 0.22);
  plate(p, 20, 32, 16);
  // sponge slice with a strawberry layer
  shape(
    p,
    (ctx) => {
      ctx.moveTo(8.6, 21);
      ctx.lineTo(31.4, 21);
      ctx.lineTo(31.4, 31);
      ctx.quadraticCurveTo(20, 33.4, 8.6, 31);
    },
    hgrad(p, 8, 32, '#ffe08a', 0.2, -0.2),
  );
  p.rect(8.6, 24.6, 22.8, 3.4, '#ff6f86');
  p.rect(8.6, 24.6, 22.8, 1, rgba(WHITE, 0.4), null);
  // whipped cream cloud on top, scalloped
  for (const x of [10.6, 14.6, 18.6, 22.6, 26.6, 30.4]) p.circle(x, 20.6, 3.2, '#fffdf7');
  p.rect(9.2, 20.8, 21.8, 2.4, '#fffdf7', null);
  p.curve({ x: 11, y: 25.4 }, { x: 16, y: 25.8 }, { x: 22, y: 24.8 }, rgba(WHITE, 0.6), 0.7);
  // strawberries on top
  for (const [x, y, s] of [
    [16.4, 13.6, 1.25],
    [25, 13, 1.1],
  ] as const) {
    shape(
      p,
      (ctx) => {
        ctx.moveTo(x - 3.4 * s, y - 2 * s);
        ctx.quadraticCurveTo(x, y - 3.6 * s, x + 3.4 * s, y - 2 * s);
        ctx.quadraticCurveTo(x + 3 * s, y + 2.4 * s, x, y + 4.4 * s);
        ctx.quadraticCurveTo(x - 3 * s, y + 2.4 * s, x - 3.4 * s, y - 2 * s);
      },
      '#ff4a5e',
      shade('#ff4a5e', -0.45),
    );
    p.poly(
      [
        { x: x - 2.6 * s, y: y - 2.4 * s },
        { x, y: y - 1.4 * s },
        { x: x + 2.6 * s, y: y - 2.4 * s },
        { x, y: y - 4 * s },
      ],
      '#5fbf4a',
      null,
    );
    p.circle(x - 1.2 * s, y, 0.4, '#ffe9a8', null);
    p.circle(x + 1.1 * s, y + 0.6, 0.4, '#ffe9a8', null);
  }
  kface(p, 20, 28.4, 0.95);
  glint(p, 34, 10, 2);
}

function berryParfait(p: Pen): void {
  p.shadow(20, 36, 11, 2.6, 0.22);
  const body = (ctx: Ctx) => {
    ctx.moveTo(10.4, 11);
    ctx.lineTo(29.6, 11);
    ctx.lineTo(27, 34);
    ctx.quadraticCurveTo(26.8, 35.4, 25, 35.4);
    ctx.lineTo(15, 35.4);
    ctx.quadraticCurveTo(13.2, 35.4, 13, 34);
  };
  shape(p, body, 'rgba(235,248,255,0.5)', null);
  p.save();
  p.ctx.beginPath();
  body(p.ctx);
  p.ctx.closePath();
  p.ctx.clip();
  p.rect(8, 26.5, 24, 10, '#6b6fd9', null); // blueberries
  p.rect(8, 19, 24, 7.5, '#fff1d6', null); // yogurt
  p.rect(8, 12.5, 24, 6.5, '#ff6a86', null); // strawberry
  for (const [x, y] of [
    [15.4, 31],
    [20, 29.6],
    [24.8, 31.4],
    [18, 33.4],
    [23.4, 33.2],
  ] as const) {
    p.circle(x, y, 1.1, '#4a4ec4', null);
  }
  for (const [x, y] of [
    [16, 16.6],
    [24.4, 15.8],
  ] as const) {
    p.circle(x, y, 1.2, '#ffe9ec', null);
  }
  p.restore();
  // cream dollop with a cherry on top
  for (const [x, y, r] of [
    [14.4, 10.8, 3.4],
    [20, 8.6, 3.8],
    [25.6, 10.8, 3.4],
  ] as const) {
    p.circle(x, y, r, WHITE);
  }
  p.circle(20, 7.4, 1.3, '#ff4a5e');
  shape(p, body, null);
  // glass shine
  p.line([{ x: 13.6, y: 15 }, { x: 14.6, y: 30 }], rgba(WHITE, 0.8), 1.5);
  // little mint leaf and a spoon
  p.ellipse(27.8, 6.4, 2.2, 1, '#5fbf5a', p.outline, -0.6);
  p.line([{ x: 27.4, y: 9 }, { x: 33.6, y: 2.6 }], p.outline, 2.6);
  p.line([{ x: 27.4, y: 9 }, { x: 33.6, y: 2.6 }], '#dfe6ee', 1.2);
  kface(p, 20, 23.8, 0.9);
}

function applePie(p: Pen): void {
  p.shadow(20, 36, 16, 3, 0.22);
  // deep ceramic dish with the pie filling level with its rim
  bowl(p, 20, 22, 15.6, 11, '#f8e6d6', '#9fd3f0');
  p.ellipse(20, 22, 13.6, 4.4, '#e4574f');
  p.save();
  p.ctx.beginPath();
  p.ctx.ellipse(20, 22, 13.6, 4.4, 0, 0, Math.PI * 2);
  p.ctx.clip();
  // a golden lattice crust with juicy apple showing through the gaps
  for (let i = -3; i <= 3; i++) {
    p.line([{ x: 20 + i * 4.6 - 7, y: 27 }, { x: 20 + i * 4.6 + 7, y: 17 }], shade('#ffc766', 0.15), 2.4);
    p.line([{ x: 20 + i * 4.6 + 7, y: 27 }, { x: 20 + i * 4.6 - 7, y: 17 }], shade('#ffc766', 0.15), 2.4);
  }
  p.restore();
  ring(p, 20, 22, 13.6, 4.4, '#c98a3e', 1.5);
  // crimped crust edge
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    p.circle(20 + Math.cos(a) * 13.6, 22 + Math.sin(a) * 4.4, 1, '#e9a85a', shade('#c98a3e', -0.2));
  }
  // a green leaf from grandma's garden
  p.ellipse(30.6, 16.4, 3, 1.3, '#6fb24c', p.outline, -0.7);
  p.line([{ x: 29, y: 17.8 }, { x: 32, y: 15 }], shade('#6fb24c', -0.35), 0.5);
  kface(p, 20, 30, 1);
  steam(p, 14, 13, 7);
  steam(p, 22, 12, 8);
}

function carrotCake(p: Pen): void {
  p.shadow(20, 36, 15, 3, 0.22);
  // a round orange sponge on a cake board
  drum(p, 20, 22, 13, 6.5, 11, '#f2a05c', '#ffb878');
  // cream cheese icing over the top, with drips
  p.ellipse(20, 22, 12.4, 5.9, '#fff8ef');
  for (const x of [11.2, 17, 23.6, 29]) drip(p, x, 22.8, 4 + (x % 3), 1.5, '#fff8ef');
  for (const x of [11.2, 17, 23.6, 29]) p.circle(x, 22.6 + 4, 1.5, '#fff8ef');
  // swirl dots on the icing
  for (const [x, y] of [
    [15, 21.4],
    [25, 22.8],
  ] as const) {
    p.circle(x, y, 0.9, '#ffe9c8', null);
  }
  // an icing carrot poking out of the top
  p.poly(
    [
      { x: 18.4, y: 18.2 },
      { x: 24.2, y: 12.8 },
      { x: 26.8, y: 15 },
      { x: 21.4, y: 21.2 },
    ],
    '#ff8a3d',
  );
  p.line([{ x: 20.6, y: 18.8 }, { x: 23, y: 16.6 }], shade('#ff8a3d', -0.3), 0.6);
  p.ellipse(23.4, 11.4, 1.8, 3, '#5fbf4a', p.outline, 0.6);
  p.ellipse(25.8, 10.6, 1.3, 2.4, '#7fd05a', p.outline, -0.4);
  kface(p, 20, 29.6, 1);
  glint(p, 33, 11, 2);
}

function pumpkinSoup(p: Pen): void {
  p.shadow(20, 36, 16, 3, 0.22);
  // the pumpkin itself, three lobes
  p.ellipse(12.4, 27, 9.4, 8.2, sphere(p, 9, 24, 10, '#ffa23e'));
  p.ellipse(27.6, 27, 9.4, 8.2, sphere(p, 25, 24, 10, '#ffa23e'));
  p.ellipse(20, 27.6, 11.6, 9, sphere(p, 16, 23, 12, '#ff9430'));
  p.curve({ x: 16.4, y: 19.4 }, { x: 13.6, y: 27.6 }, { x: 16.4, y: 35.6 }, shade('#ff9430', -0.35), 0.7);
  p.curve({ x: 23.6, y: 19.4 }, { x: 26.4, y: 27.6 }, { x: 23.6, y: 35.6 }, shade('#ff9430', -0.35), 0.7);
  gloss(p, 12.4, 21.6, 2.4, 1.2, -0.4, 0.5);
  // the stalk
  p.roundRect(16.6, 9.4, 6.8, 6, 2, '#6b8a2a');
  p.line([{ x: 21, y: 13 }, { x: 24.8, y: 8.6 }], p.outline, 2.8);
  p.line([{ x: 21, y: 13 }, { x: 24.8, y: 8.6 }], '#7fa23a', 1.4);
  // soup surface peeking out of the top, with a cream swirl and seeds
  p.ellipse(20, 19.6, 11.8, 3.6, p.outline, null);
  p.ellipse(20, 19.6, 11, 3.2, '#ffc766');
  p.curve({ x: 14.4, y: 19.8 }, { x: 18.8, y: 17.6 }, { x: 25, y: 19.9 }, '#fff4dc', 1.1);
  for (const [x, y] of [
    [17.4, 20.6],
    [22.4, 18.6],
  ] as const) {
    p.ellipse(x, y, 0.9, 0.5, '#fff4dc', null);
  }
  kface(p, 20, 29.6, 1.05, '#4a2a14');
  steam(p, 14, 13, 7);
  steam(p, 27, 12, 6);
}

function farmhousePizza(p: Pen): void {
  p.shadow(20, 36, 16, 3, 0.22);
  // round crust, tomato sauce, cheese
  p.ellipse(20, 21.6, 15.2, 12.6, '#f0b35a');
  p.ellipse(20, 21.6, 13, 10.8, '#e8483f');
  // slice lines
  for (const a of [0.2, 1.8, 3.4, 5]) {
    p.line([{ x: 20, y: 21.6 }, { x: 20 + Math.cos(a) * 13, y: 21.6 + Math.sin(a) * 10.8 }], rgba(INK, 0.22), 0.7);
  }
  // cheese blobs
  for (const [x, y, r] of [
    [14.4, 17.4, 4.6],
    [24, 16.4, 4.2],
    [27.6, 24.4, 4.4],
    [14, 25.8, 4],
    [20.2, 27.4, 3.4],
  ] as const) {
    p.circle(x, y, r, '#ffe27a', shade('#ffe27a', -0.25));
    gloss(p, x - r * 0.3, y - r * 0.4, r * 0.4, r * 0.22, -0.4, 0.7);
  }
  // veggie toppings
  for (const [x, y] of [
    [24.5, 21.6],
    [17.8, 22.6],
  ] as const) {
    p.circle(x, y, 1.8, '#ff6a5a', shade('#ff6a5a', -0.4));
    p.circle(x, y, 0.8, '#ffb4a8', null);
  }
  ring(p, 11.6, 13.4, 1.8, 1.6, '#6fbf4a', 1.1);
  p.circle(31, 12.8, 0.9, '#2b2a26', null);
  p.circle(29.8, 17.6, 0.9, '#2b2a26', null);
  p.ellipse(10.8, 27.8, 2.4, 1.1, '#5fbf5a', p.outline, 0.6);
  kface(p, 20, 20.6, 1.15);
  glint(p, 34, 7, 2);
}

function honeyCookies(p: Pen): void {
  p.shadow(20, 36, 16, 3, 0.22);
  plate(p, 20, 32, 16);
  // back cookie
  p.ellipse(12, 24.4, 7, 5.4, shade('#d99a4e', -0.1));
  p.ellipse(12, 23, 7, 5.4, '#e8b167');
  // front cookie with a face
  p.ellipse(26.6, 27.6, 7.4, 5.6, '#c98a3e');
  p.ellipse(26.6, 26.2, 7.4, 5.6, '#eab56c');
  for (const [x, y] of [
    [9.4, 22.4],
    [13.8, 24.6],
    [24.4, 24.8],
    [29.6, 26.8],
    [20.4, 25.2],
  ] as const) {
    p.circle(x, y, 1.15, '#6b3e22', null);
  }
  // honey drizzle and a wooden dipper
  p.curve({ x: 19.4, y: 25.4 }, { x: 22.4, y: 23.4 }, { x: 27, y: 24.6 }, '#f5a623', 1.6);
  p.line([{ x: 36, y: 3 }, { x: 28.6, y: 15.4 }], p.outline, 4.2);
  p.line([{ x: 36, y: 3 }, { x: 28.6, y: 15.4 }], '#c98a4a', 2.2);
  p.ball(28.2, 17.4, 2.8, '#f5a623');
  drip(p, 28.2, 17.8, 4.4, 1.5, '#f5a623');
  p.circle(28.2, 22.2, 1.5, '#f5a623', shade('#f5a623', -0.3));
  gloss(p, 27.2, 16.6, 0.8, 0.5, -0.4, 0.8);
  kface(p, 26.6, 26.2, 0.9);
  glint(p, 6, 10, 2);
}

function sushiRolls(p: Pen): void {
  p.shadow(20, 36, 16, 3, 0.22);
  plate(p, 20, 30, 17, '#7fc8e8');
  // a roll: dark nori band around snowy rice, with carrot and cucumber in the middle
  const roll = (x: number, y: number, r: number) => {
    p.circle(x, y, r, '#2f4a3b');
    p.circle(x, y, r * 0.74, '#fffdf5');
    p.circle(x, y, r * 0.4, '#ff9b3d');
    p.circle(x + r * 0.16, y - r * 0.16, r * 0.2, '#8fd16a', null);
    p.circle(x - r * 0.34, y - r * 0.42, r * 0.2, WHITE, null);
  };
  roll(10.8, 24.4, 7.4);
  roll(29.4, 23.2, 7.4);
  roll(20, 29.8, 8);
  kface(p, 20, 29.4, 0.9);
  // a dab of wasabi and a sliver of ginger
  p.circle(33.6, 31.6, 1.8, '#a6e07a');
  p.ellipse(7.4, 33.8, 2.4, 1.1, '#f5b6c2', p.outline, -0.3);
  glint(p, 34, 12, 1.8);
}

/** An apple with a dimple on top, glossy red candy coating (x, y is its centre). */
function appleShape(p: Pen, x: number, y: number, r: number, color: string): void {
  shape(
    p,
    (ctx) => {
      ctx.moveTo(x, y - r * 0.72);
      ctx.bezierCurveTo(x + r * 0.45, y - r * 1.02, x + r * 1.1, y - r * 0.92, x + r * 1.02, y - r * 0.1);
      ctx.bezierCurveTo(x + r * 0.98, y + r * 0.8, x + r * 0.5, y + r * 1.05, x, y + r * 0.85);
      ctx.bezierCurveTo(x - r * 0.5, y + r * 1.05, x - r * 0.98, y + r * 0.8, x - r * 1.02, y - r * 0.1);
      ctx.bezierCurveTo(x - r * 1.1, y - r * 0.92, x - r * 0.45, y - r * 1.02, x, y - r * 0.72);
    },
    sphere(p, x - r * 0.3, y - r * 0.3, r, color),
  );
}

function candyApples(p: Pen): void {
  p.shadow(20, 36, 16, 3, 0.22);
  // back apple
  appleShape(p, 27.6, 20.4, 7.6, '#e8383f');
  p.line([{ x: 27.6, y: 12.4 }, { x: 28.6, y: 6.2 }], '#c9a06a', 1.8);
  p.ellipse(31.6, 8.6, 2.8, 1.3, '#6fb24c', p.outline, -0.5);
  gloss(p, 23.8, 16.4, 1.8, 0.9, -0.5, 0.7);
  // front apple, with a face
  appleShape(p, 14, 25.4, 9, '#f0424c');
  p.line([{ x: 14, y: 15.6 }, { x: 15.4, y: 9.6 }], '#c9a06a', 2);
  p.ellipse(19, 11.6, 3, 1.4, '#6fb24c', p.outline, -0.4);
  // candy shine and sprinkles
  gloss(p, 8.6, 20.6, 2.8, 1.4, -0.5, 0.85);
  for (const [x, y, c] of [
    [18.6, 27.8, '#ffffff'],
    [11.6, 29.4, '#ffe16b'],
    [16.8, 32.2, '#ffffff'],
    [22.4, 22, '#ffe16b'],
    [8.6, 25.4, '#ffffff'],
    [29.8, 24.2, '#ffe16b'],
  ] as const) {
    p.ellipse(x, y, 0.9, 0.5, c, null, 0.6);
  }
  kface(p, 14.2, 24.8, 0.9);
  glint(p, 35, 13, 2);
  glint(p, 4, 15, 1.6);
}

const DISH_ART: Record<string, (p: Pen) => void> = {
  veggie_salad: gardenSalad,
  tomato_soup: tomatoSoup,
  omelette,
  veggie_stirfry: veggieStirfry,
  corn_chowder: cornChowder,
  mashed_potatoes: buttery,
  strawberry_shortcake: shortcake,
  berry_parfait: berryParfait,
  apple_pie: applePie,
  carrot_cake: carrotCake,
  pumpkin_soup: pumpkinSoup,
  pizza: farmhousePizza,
  honey_cookies: honeyCookies,
  sushi_rolls: sushiRolls,
  candy_apples: candyApples,
};

/** A cute bowl with a letter for any dish that has no painter yet. */
function fallbackDish(id: string): (p: Pen) => void {
  const col = mix('#ffd1a8', '#ffb3c6', 0.5);
  return (p) => {
    p.shadow(20, 36, 14, 3, 0.22);
    bowl(p, 20, 21, 15, 12, col);
    kface(p, 20, 28, 1);
    p.text(id.charAt(0).toUpperCase(), 20, 14, 10, shade(col, -0.5));
  };
}

// ---------------------------------------------------------------------------
// Kitchen props (96x96; painted with a thicker outline)

function board(p: Pen): void {
  p.shadow(48, 86, 38, 5, 0.22);
  p.roundRect(9, 26, 78, 58, 10, '#a86a34');
  p.roundRect(9, 20, 78, 58, 10, hgrad(p, 9, 87, '#f4c57e', 0.25, -0.18));
  // a darker inner border, like a worn wooden rim
  p.roundRect(14, 25, 68, 48, 7, null, rgba('#b57a3e', 0.5));
  for (const y of [34, 46, 58, 70]) {
    p.curve({ x: 18, y }, { x: 46, y: y - 3 }, { x: 78, y: y + 1 }, rgba('#a0602c', 0.45), 1.3);
  }
  p.circle(21, 29, 3.2, '#8a5426');
  p.circle(20, 28.2, 1.2, '#c48a52', null);
  gloss(p, 36, 26.4, 16, 2.2, 0, 0.35);
  // a few crumbs of carrot
  for (const [x, y] of [
    [62, 60],
    [68, 64],
    [56, 70],
  ] as const) {
    p.circle(x, y, 2.4, '#ff9d3c');
    p.circle(x, y, 1, '#ffd28a', null);
  }
}

function knife(p: Pen): void {
  p.shadow(50, 80, 42, 4, 0.22);
  // steel blade, tip pointing right
  shape(
    p,
    (ctx) => {
      ctx.moveTo(42, 40);
      ctx.lineTo(80, 41.5);
      ctx.quadraticCurveTo(93, 46.5, 92, 51);
      ctx.quadraticCurveTo(84, 60, 42, 59.5);
    },
    hgrad(p, 42, 92, '#e4eaf2', 0.3, -0.25),
  );
  p.curve({ x: 46, y: 43.6 }, { x: 70, y: 43 }, { x: 86, y: 46.6 }, WHITE, 1.6);
  // bolster
  p.roundRect(33, 38.6, 11, 22.4, 4, hgrad(p, 33, 44, '#c8d2de', 0.3, -0.2));
  // pastel handle with rivets and a little heart
  p.roundRect(6, 37, 34, 24, 11, hgrad(p, 6, 40, '#ff8fb8', 0.35, -0.25));
  p.roundRect(9, 40, 22, 3.2, 1.6, rgba(WHITE, 0.45), null);
  for (const x of [16, 26]) p.circle(x, 52, 1.8, WHITE, null);
  p.heart(22, 46.6, 1.9, '#ffe2ec', null);
}

function pot(p: Pen): void {
  p.shadow(48, 88, 38, 5, 0.22);
  // handles on either side
  p.curve({ x: 14, y: 40 }, { x: 0.6, y: 42 }, { x: 13.6, y: 60 }, p.outline, 6.6);
  p.curve({ x: 14, y: 40 }, { x: 0.6, y: 42 }, { x: 13.6, y: 60 }, '#ff8a7c', 3.6);
  p.curve({ x: 82, y: 40 }, { x: 95.4, y: 42 }, { x: 82.4, y: 60 }, p.outline, 6.6);
  p.curve({ x: 82, y: 40 }, { x: 95.4, y: 42 }, { x: 82.4, y: 60 }, '#ff8a7c', 3.6);
  // the pot body with a rim, viewed from slightly above
  drum(p, 48, 36, 34, 8, 44, '#ff6f63', '#ffb0a2');
  // tomato soup filling the pot
  p.ellipse(48, 36.4, 28.4, 5.8, p.outline, null);
  p.ellipse(48, 36.4, 27.6, 5.2, shade('#ff9c3d', 0.1));
  p.ellipse(48, 37, 22, 3.6, '#ffb24a', null);
  p.curve({ x: 36, y: 36 }, { x: 46, y: 33.6 }, { x: 60, y: 37 }, '#fff4dc', 1.5);
  for (const [x, y, r] of [
    [30, 37, 1.6],
    [66, 38.4, 1.3],
    [56, 34.6, 1],
  ] as const) {
    p.circle(x, y, r, '#fff2d0', null);
  }
  gloss(p, 24, 58, 2.4, 9, -0.1, 0.45);
  kface(p, 48, 60, 2.8);
}

function pan(p: Pen): void {
  p.shadow(42, 84, 38, 5, 0.22);
  // handle with a hanging hole, behind the pan
  p.line([{ x: 66, y: 52 }, { x: 88, y: 46 }], p.outline, 11);
  p.line([{ x: 66, y: 52 }, { x: 88, y: 46 }], '#3a353f', 8);
  p.line([{ x: 70, y: 50 }, { x: 84, y: 47 }], rgba(WHITE, 0.4), 1.6);
  p.circle(88.6, 44.2, 2.2, '#c8ced6');
  // iron pan: thick underside, then the top face
  p.ellipse(42, 56, 34, 22, '#23202a');
  p.ellipse(42, 52, 34, 22, hgrad(p, 8, 76, '#6a6472', 0.25, -0.25));
  p.ellipse(42, 52, 27.4, 16.8, '#3f3a46');
  // a sunny-side-up egg cooking in it
  p.ellipse(40, 52, 14, 9, '#fffdf6');
  p.ellipse(41.4, 51.4, 5.4, 4.4, '#ffb31f');
  gloss(p, 38.8, 49.2, 2.2, 1, -0.3, 0.9);
  // sizzle
  glint(p, 16, 30, 4.2);
  glint(p, 22, 18, 2.6);
  glint(p, 64, 24, 2.2, '#ffe6a0');
}

function bigBowl(p: Pen): void {
  p.shadow(48, 88, 36, 5, 0.22);
  // a deep blue mixing bowl
  shape(
    p,
    (ctx) => {
      ctx.moveTo(8, 30);
      ctx.bezierCurveTo(8, 62, 26, 84, 48, 84);
      ctx.bezierCurveTo(70, 84, 88, 62, 88, 30);
    },
    hgrad(p, 8, 88, '#9fd8ff', 0.3, -0.25),
  );
  p.curve({ x: 9.4, y: 50 }, { x: 48, y: 58 }, { x: 86.6, y: 50 }, WHITE, 2.4);
  p.ellipse(48, 30, 40, 9.4, shade('#9fd8ff', 0.3));
  // pale batter with whisk marks
  p.ellipse(48, 30.4, 36.4, 6.8, '#fff3c4');
  p.curve({ x: 22, y: 30 }, { x: 36, y: 25.4 }, { x: 52, y: 31.6 }, '#f5d98a', 1.2);
  p.curve({ x: 52, y: 31.6 }, { x: 62, y: 28.4 }, { x: 74, y: 30 }, '#f5d98a', 1.2);
  gloss(p, 26, 27.5, 4, 1.2, -0.2, 0.8);
  p.circle(68, 33, 1.4, '#ffffff', null);
  kface(p, 48, 66, 2.8);
  glint(p, 86, 14, 3);
}

function whisk(p: Pen): void {
  p.shadow(48, 90, 14, 3, 0.22);
  // wooden handle with a ribbon
  p.roundRect(42.4, 62, 11.2, 30, 5.6, hgrad(p, 42, 54, '#d9a062', 0.3, -0.25));
  p.line([{ x: 48, y: 68 }, { x: 48, y: 88 }], rgba('#9a6230', 0.5), 0.9);
  p.ellipse(48, 70, 8, 3.2, '#ff8fb8');
  p.ellipse(48, 70, 8, 3.2, null, p.outline);
  // balloon of wire loops
  const loops: [number, number][] = [
    [11, 0],
    [7.4, 0],
    [3.4, 0],
  ];
  for (const [rx] of loops) {
    ring(p, 48, 40, rx, 27, p.outline, 5);
    ring(p, 48, 40, rx, 27, '#dfe6ee', 2.6);
  }
  ring(p, 48, 40, 11, 3.4, p.outline, 3.2);
  ring(p, 48, 40, 11, 3.4, '#cfd8e2', 1.4);
  // a wire glint
  p.line([{ x: 42, y: 26 }, { x: 40, y: 34 }], rgba(WHITE, 0.9), 1.4);
  glint(p, 74, 18, 3.4, '#fff6c8');
  glint(p, 22, 46, 2.2);
}

function oven(p: Pen): void {
  p.shadow(48, 91, 40, 4, 0.22);
  // little feet
  p.roundRect(16, 84, 10, 7, 2.5, '#5b4a44');
  p.roundRect(70, 84, 10, 7, 2.5, '#5b4a44');
  // the mint body
  p.roundRect(11, 8, 74, 80, 12, hgrad(p, 11, 85, '#a8e6cf', 0.3, -0.2));
  // control panel with two dials and a face
  p.roundRect(17, 13, 62, 16, 6, shade('#a8e6cf', 0.22));
  for (const x of [26, 70]) {
    p.circle(x, 21, 4.4, '#fff8ec');
    p.circle(x, 21, 2.6, '#ffd6a0', null);
    p.line([{ x, y: 21 }, { x, y: 18.4 }], p.outline, 1.2);
  }
  kface(p, 48, 21, 1.1);
  // glowing window with cookies on a rack
  p.roundRect(16, 34, 64, 40, 8, '#fff7ec');
  p.roundRect(20, 38, 56, 32, 5, '#c85f3a');
  p.roundRect(21, 39, 54, 30, 4, hgrad(p, 21, 75, '#ffb35c', 0.2, -0.25));
  for (const [x, y] of [
    [32, 52],
    [46, 50],
    [60, 54],
  ] as const) {
    p.circle(x, y, 4.4, '#e8b067', shade('#c98a3e', -0.1));
    p.circle(x - 1.2, y - 1.2, 1, '#a0602c', null);
  }
  p.rect(24, 58, 48, 2.6, '#ffe7c2', null);
  gloss(p, 30, 44, 6, 1.8, -0.5, 0.45);
  // chrome handle bar
  p.roundRect(16, 76, 64, 4.6, 2.3, '#e8eef4');
  p.circle(22, 78.3, 1.1, '#9aa6b4', null);
  p.circle(74, 78.3, 1.1, '#9aa6b4', null);
}

function platePrimed(p: Pen): void {
  p.shadow(48, 84, 40, 6, 0.22);
  // thick underside, then a white plate seen from slightly above
  p.ellipse(48, 56, 40, 27, '#d9e2ec');
  p.ellipse(48, 52, 40, 27, '#ffffff');
  ring(p, 48, 52, 35, 23.4, '#ffb3c8', 4);
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2;
    p.circle(48 + Math.cos(a) * 35, 52 + Math.sin(a) * 23.4, 1.4, '#ffffff', shade('#ffb3c8', -0.25));
  }
  p.ellipse(48, 52, 27, 17.6, '#f5f9fd', rgba(INK, 0.22));
  gloss(p, 26, 40, 9, 3, -0.45, 0.9);
}

function egg(p: Pen): void {
  p.shadow(48, 90, 24, 5, 0.22);
  shape(
    p,
    (ctx) => {
      ctx.moveTo(48, 10);
      ctx.bezierCurveTo(70, 10, 76, 44, 74, 60);
      ctx.bezierCurveTo(72, 78, 62, 86, 48, 86);
      ctx.bezierCurveTo(34, 86, 24, 78, 22, 60);
      ctx.bezierCurveTo(20, 44, 26, 10, 48, 10);
    },
    sphere(p, 40, 34, 40, '#fff8ee'),
  );
  // speckles and a little crack
  for (const [x, y] of [
    [30, 26],
    [64, 36],
    [58, 70],
    [34, 72],
  ] as const) {
    p.circle(x, y, 1.1, '#e8c7a0', null);
  }
  p.curve({ x: 60, y: 18 }, { x: 56, y: 22 }, { x: 60, y: 26 }, shade('#fff8ee', -0.3), 0.8);
  gloss(p, 32, 26, 5, 2.4, -0.7, 0.9);
  kface(p, 48, 52, 2.4);
}

function shaker(p: Pen): void {
  p.shadow(48, 90, 22, 4, 0.22);
  // salt crystals and sparkles tumbling out of the holes
  glint(p, 20, 12, 3.2, '#fffbe6');
  glint(p, 74, 10, 2.8, '#fffbe6');
  glint(p, 48, 4, 2.2, '#fff3a8');
  glint(p, 26, 4, 1.6);
  glint(p, 62, 3, 1.6);
  // body in pastel blue
  p.roundRect(28, 34, 40, 52, 12, hgrad(p, 28, 68, '#8fd0f5', 0.3, -0.22));
  // cap with a grid of holes
  p.roundRect(26, 20, 44, 16, 7, hgrad(p, 26, 70, '#ffffff', 0.1, -0.12));
  for (const y of [25, 30]) {
    for (const x of [34, 40, 46, 52, 58, 64]) p.circle(x, y, 1.3, '#5b6a78', null);
  }
  // label with a face
  p.roundRect(36, 52, 24, 22, 7, '#fff7ea');
  kface(p, 48, 62, 1.5);
  gloss(p, 34, 44, 1.6, 15, 0.05, 0.7);
}

function dough(p: Pen): void {
  p.shadow(48, 84, 30, 5, 0.22);
  // a plump ball of dough
  p.circle(48, 52, 29, sphere(p, 40, 40, 30, '#ffe7a6'));
  const r = rng('dough');
  for (let i = 0; i < 16; i++) {
    const a = r() * Math.PI * 2;
    const d = 10 + r() * 16;
    p.circle(48 + Math.cos(a) * d, 52 + Math.sin(a) * d * 0.75, 1.1 + r() * 0.8, WHITE, null);
  }
  // a folded seam across the top
  p.curve({ x: 32, y: 34 }, { x: 46, y: 28 }, { x: 64, y: 34 }, shade('#ffe7a6', -0.25), 1.3);
  gloss(p, 34, 38, 6, 3, -0.6, 0.8);
  kface(p, 48, 56, 2.4);
  glint(p, 78, 22, 2.6);
}

function burnerFlame(p: Pen): void {
  p.shadow(48, 88, 36, 6, 0.22);
  p.glow(48, 52, 42, '#ffb347', 0.35);
  // the burner ring
  p.ellipse(48, 80, 34, 8, '#6b6b78');
  p.ellipse(48, 78, 30, 6, '#3a3a46');
  for (const x of [30, 40, 56, 66]) p.line([{ x, y: 74 }, { x, y: 82 }], '#7a7a88', 1.2);
  // outer flame
  shape(
    p,
    (ctx) => {
      ctx.moveTo(48, 8);
      ctx.bezierCurveTo(62, 26, 72, 40, 70, 58);
      ctx.bezierCurveTo(68, 72, 58, 78, 48, 78);
      ctx.bezierCurveTo(38, 78, 28, 72, 26, 58);
      ctx.bezierCurveTo(24, 44, 34, 32, 38, 20);
      ctx.bezierCurveTo(42, 28, 44, 32, 48, 32);
      ctx.bezierCurveTo(46, 20, 44, 14, 48, 8);
    },
    p.vgrad(8, 78, '#ffb03a', '#ff5a2e'),
  );
  // inner flame
  shape(
    p,
    (ctx) => {
      ctx.moveTo(48, 40);
      ctx.bezierCurveTo(56, 52, 60, 58, 59, 68);
      ctx.bezierCurveTo(58, 74, 53, 76, 48, 76);
      ctx.bezierCurveTo(43, 76, 38, 74, 37, 68);
      ctx.bezierCurveTo(36, 58, 42, 52, 48, 40);
    },
    p.vgrad(40, 76, '#ffe36a', '#ffb53a'),
  );
  // white hot core
  p.ellipse(48, 66, 4, 5.4, '#fff8d0', null);
  kface(p, 48, 64, 1.1);
  gloss(p, 35.6, 40, 1.4, 4, 0.3, 0.45);
}

function woodenSpoon(p: Pen): void {
  p.shadow(44, 88, 20, 4, 0.22);
  // handle, a chunky tapered stick
  p.line([{ x: 50, y: 45 }, { x: 16, y: 86 }], p.outline, 8.4);
  p.line([{ x: 50, y: 45 }, { x: 16, y: 86 }], '#d9a066', 5.4);
  p.line([{ x: 46, y: 49 }, { x: 26, y: 72 }], rgba(WHITE, 0.3), 1.2);
  // the bowl of the spoon, with a dab of tomato sauce
  p.ellipse(59.5, 33, 19, 13, hgrad(p, 46, 74, '#e4aa6e', 0.3, -0.2), p.outline, -0.88);
  p.ellipse(63.4, 27.4, 8.2, 4.8, '#e0463c', null, -0.88);
  gloss(p, 56.6, 25.6, 4.4, 1.5, -0.88, 0.7);
  p.ellipse(64, 28.5, 2.2, 1.2, '#ff8d7e', null, -0.88);
  glint(p, 70, 12, 2.2);
}

const COOK_PROP_ART: Record<string, (p: Pen) => void> = {
  board,
  knife,
  pot,
  pan,
  bowl: bigBowl,
  whisk,
  oven,
  plate: platePrimed,
  egg,
  shaker,
  dough,
  flame: burnerFlame,
  spoon: woodenSpoon,
};

// ---------------------------------------------------------------------------
// Mama Marigold: portrait (40x40, matches portraits.ts) and walking sprites

const FUR = '#b8733f';
const MUZZLE = '#f4d7aa';
const SCARF = '#e8505f';
const APRON = '#fff4e6';
const APRON_PINK = '#ff9fb4';
const SHOE = '#c24b54';
const PLATTER = '#fffaf2';
const DOME = '#ffb8a0';
const WOOD = '#d9a062';
const CX = 20;
const DISC = 18.6;

/** Pastel medallion background; the bust is clipped to it until `finishPortrait`. */
function portraitBegin(p: Pen, bg: string): void {
  p.lineWidth = 0.8;
  const g = p.ctx.createRadialGradient(14, 12, 1, CX, CX, DISC + 1);
  g.addColorStop(0, mix(bg, WHITE, 0.6));
  g.addColorStop(0.65, bg);
  g.addColorStop(1, shade(bg, -0.1));
  p.circle(CX, CX, DISC, g, null);
  p.circle(CX, CX, DISC - 2.6, null, rgba(WHITE, 0.6));
  p.save();
  p.ctx.beginPath();
  p.ctx.arc(CX, CX, DISC, 0, Math.PI * 2);
  p.ctx.clip();
}

function portraitEnd(p: Pen): void {
  p.restore();
  p.lineWidth = 0.8;
  glint(p, 32.4, 8.4, 1.9, rgba(WHITE, 0.95));
  p.circle(CX, CX, DISC, null, p.outline);
}

function mamaPortrait(p: Pen): void {
  portraitBegin(p, '#ffc4ab');

  // ladle tucked behind the shoulder, bowl peeking into the medallion
  p.line([{ x: 26, y: 33 }, { x: 34.4, y: 21.6 }], p.outline, 2.8);
  p.line([{ x: 26, y: 33 }, { x: 34.4, y: 21.6 }], WOOD, 1.4);
  p.ellipse(35.4, 19.8, 2.8, 3.8, WOOD, p.outline, -0.5);

  puff(p, CX, 39.2, 15.4, 10.4, FUR);

  // gingham apron bib
  p.save();
  p.ctx.beginPath();
  p.ctx.roundRect(12.4, 29.6, 15.2, 13.6, 4);
  p.ctx.clip();
  p.rect(12, 29, 16, 15, APRON, null);
  p.ctx.fillStyle = rgba(APRON_PINK, 0.7);
  for (let x = 12.6; x < 28; x += 3.6) p.ctx.fillRect(x, 28, 1.2, 16);
  for (let y = 29.6; y < 44; y += 3.6) p.ctx.fillRect(12, y, 16, 1.2);
  p.restore();
  p.roundRect(12.4, 29.6, 15.2, 13.6, 4, null);
  // ruffled frill along the bib's top edge
  for (let x = 13.2; x <= 26.8; x += 2.8) p.circle(x, 29.6, 1.5, APRON);

  // ears peeking out beside the scarf
  for (const ex of [9.2, 30.8]) {
    p.circle(ex, 11.8, 3.2, FUR);
    p.circle(ex, 11.9, 1.6, '#f0b08a', null);
  }

  puff(p, CX, 19.4, 11.4, 10.4, FUR);
  p.ellipse(CX, 24.6, 5.4, 3.9, MUZZLE, null);

  // gingham headscarf with a knot at the side
  const scarfPath = (ctx: Ctx) => {
    ctx.moveTo(7.8, 16.4);
    ctx.quadraticCurveTo(20, 4.6, 32.2, 16.4);
    ctx.quadraticCurveTo(20, 10.6, 7.8, 16.4);
  };
  p.save();
  p.ctx.beginPath();
  scarfPath(p.ctx);
  p.ctx.closePath();
  p.ctx.fillStyle = SCARF;
  p.ctx.fill();
  p.ctx.clip();
  p.ctx.fillStyle = rgba(WHITE, 0.55);
  for (let x = 6; x < 36; x += 4) p.ctx.fillRect(x, 0, 1.4, 40);
  for (let y = 4; y < 20; y += 4) p.ctx.fillRect(0, y, 40, 1.4);
  p.restore();
  p.save();
  p.ctx.beginPath();
  scarfPath(p.ctx);
  p.ctx.closePath();
  p.ctx.strokeStyle = p.outline;
  p.ctx.lineWidth = 0.8;
  p.ctx.stroke();
  p.restore();
  p.poly(
    [
      { x: 31.2, y: 15.4 },
      { x: 36.2, y: 11.6 },
      { x: 35.6, y: 17.2 },
    ],
    SCARF,
  );
  p.poly(
    [
      { x: 31.4, y: 17.2 },
      { x: 36.4, y: 21.4 },
      { x: 33.6, y: 23.2 },
    ],
    shade(SCARF, -0.1),
  );
  p.circle(31.6, 16.2, 1.8, shade(SCARF, -0.2));
  gloss(p, 15.6, 11.8, 2.8, 1.1, -0.3, 0.45);

  // face: kawaii dot eyes, a button nose, blush and a smile
  for (const ex of [15.6, 24.4]) {
    p.ellipse(ex, 20.6, 1.9, 2.2, INK, null);
    p.circle(ex - 0.7, 19.6, 0.7, WHITE, null);
  }
  p.ellipse(CX, 22.2, 1.6, 1.1, '#4e3024', null);
  p.curve({ x: 18.4, y: 25.4 }, { x: CX, y: 26.8 }, { x: 21.6, y: 25.4 }, INK, 0.75);
  p.ellipse(11.4, 23.6, 2.1, 1.2, BLUSH, null);
  p.ellipse(28.6, 23.6, 2.1, 1.2, BLUSH, null);

  portraitEnd(p);
}

const NPC_BODY = '#b8733f';

/** Mama Marigold painted about the ground centre; walk swaps the legs and bounces her. */
function mamaNpc(p: Pen, walk: boolean): void {
  const c = p.center;
  p.save();
  p.ctx.translate(c.x, c.y);
  const b = walk ? -0.9 : 0;
  p.shadow(0, 0, 13, 4, 0.25);

  // stubby legs in red clogs; walking has one foot reaching forward
  const legs: [P2, P2][] = walk
    ? [
        [
          { x: -3.6, y: -8 },
          { x: -7, y: -2.6 },
        ],
        [
          { x: 4, y: -8 },
          { x: 6.4, y: -1.2 },
        ],
      ]
    : [
        [
          { x: -4, y: -8 },
          { x: -4.4, y: -2 },
        ],
        [
          { x: 4, y: -8 },
          { x: 4.4, y: -2 },
        ],
      ];
  for (const [top, foot] of legs) {
    p.line([top, foot], p.outline, 5.8);
    p.line([top, foot], NPC_BODY, 4.4);
    p.ellipse(foot.x - 0.6, foot.y + 0.4, 3.6, 2, SHOE);
  }

  // plump, motherly body and arms that hold the covered dish
  puff(p, 0, -15.6 + b, 11.6, 10.2, NPC_BODY);
  p.line([{ x: -9.2, y: -18 + b }, { x: -9.8, y: -7.6 + b }], p.outline, 5.6);
  p.line([{ x: -9.2, y: -18 + b }, { x: -9.8, y: -7.6 + b }], NPC_BODY, 4.2);
  p.line([{ x: 9.2, y: -18 + b }, { x: 9.8, y: -7.6 + b }], p.outline, 5.6);
  p.line([{ x: 9.2, y: -18 + b }, { x: 9.8, y: -7.6 + b }], NPC_BODY, 4.2);

  // frilly gingham apron
  const apronPath = (ctx: Ctx) => {
    ctx.moveTo(-4.4, -25 + b);
    ctx.lineTo(4.4, -25 + b);
    ctx.quadraticCurveTo(6.6, -18 + b, 7.8, -10.6 + b);
    ctx.lineTo(-7.8, -10.6 + b);
    ctx.quadraticCurveTo(-6.6, -18 + b, -4.4, -25 + b);
  };
  shape(p, apronPath, APRON);
  p.save();
  apronPath(p.ctx);
  p.ctx.clip();
  p.ctx.fillStyle = rgba(APRON_PINK, 0.7);
  for (let x = -7; x < 8; x += 3.6) p.ctx.fillRect(x, -26 + b, 1.2, 18);
  for (let y = -22 + b; y < -9 + b; y += 3.6) p.ctx.fillRect(-9, y, 18, 1.2);
  p.restore();
  apronPath(p.ctx);
  p.ctx.strokeStyle = p.outline;
  p.ctx.lineWidth = p.lineWidth;
  p.ctx.stroke();
  // scalloped frill along the hem and a bow tie at the side
  for (let x = -7.2; x <= 7.2; x += 3.1) p.circle(x, -10.4 + b, 1.7, APRON);
  p.poly(
    [
      { x: 7.8, y: -17 + b },
      { x: 11.4, y: -19.4 + b },
      { x: 11.4, y: -14.6 + b },
    ],
    APRON_PINK,
  );
  p.circle(8.8, -17 + b, 1.2, shade(APRON_PINK, -0.2));

  // wooden ladle tucked in the apron, its bowl poking out to the right
  p.line([{ x: 4.6, y: -21 + b }, { x: 11.6, y: -30 + b }], p.outline, 3.2);
  p.line([{ x: 4.6, y: -21 + b }, { x: 11.6, y: -30 + b }], WOOD, 1.6);
  p.ellipse(12.4, -32.2 + b, 3, 3.9, WOOD, p.outline, -0.5);

  // ears, head and the muzzle
  for (const ex of [-9.4, 9.4]) {
    p.circle(ex, -41 + b, 3.8, NPC_BODY);
    p.circle(ex, -40.8 + b, 1.9, '#e9a886', null);
  }
  puff(p, 0, -34.5 + b, 10, 9.8, NPC_BODY);
  puff(p, 0, -27.2 + b, 5.2, 3.9, MUZZLE);

  // gingham headscarf, tied at the side
  const scarfPath = (ctx: Ctx) => {
    ctx.moveTo(-10.6, -39 + b);
    ctx.quadraticCurveTo(0, -49 + b, 10.6, -39 + b);
    ctx.quadraticCurveTo(0, -29.5 + b, -10.6, -39 + b);
    ctx.closePath();
  };
  shape(p, scarfPath, SCARF, null);
  p.save();
  scarfPath(p.ctx);
  p.ctx.clip();
  p.ctx.fillStyle = rgba(WHITE, 0.55);
  for (let x = -10; x < 11; x += 4) p.ctx.fillRect(x, -50 + b, 1.4, 22);
  for (let y = -48 + b; y < -30 + b; y += 4) p.ctx.fillRect(-12, y, 24, 1.4);
  p.restore();
  shape(p, scarfPath, null);
  p.poly(
    [
      { x: 9.8, y: -38 + b },
      { x: 14.2, y: -41.4 + b },
      { x: 13.6, y: -36.4 + b },
    ],
    SCARF,
  );
  p.poly(
    [
      { x: 9.8, y: -37 + b },
      { x: 14.4, y: -34.4 + b },
      { x: 10.4, y: -33.2 + b },
    ],
    shade(SCARF, -0.1),
  );
  p.circle(9.9, -38 + b, 2, shade(SCARF, -0.2));
  gloss(p, -5.4, -41.4 + b, 3.2, 1.2, -0.3, 0.45);

  // kawaii face and blush
  for (const ex of [-3.9, 3.7]) {
    p.ellipse(ex, -31.4 + b, 1.9, 2.2, INK, null);
    p.circle(ex - 0.7, -32.4 + b, 0.7, WHITE, null);
  }
  p.ellipse(-0.1, -29.2 + b, 1.7, 1.1, '#4e3024', null);
  p.curve({ x: -1.6, y: -26.4 + b }, { x: 0, y: -25 + b }, { x: 1.6, y: -26.4 + b }, INK, 0.75);
  p.ellipse(-6.4, -28.2 + b, 2, 1.2, BLUSH, null);
  p.ellipse(6.4, -28.2 + b, 2, 1.2, BLUSH, null);

  // covered dish held out in front, with steam curling from under the dome
  p.ellipse(0, -5.4 + b, 10, 2.4, shade(PLATTER, -0.14));
  p.ellipse(0, -6.2 + b, 10, 2.6, PLATTER);
  shape(
    p,
    (ctx) => {
      ctx.moveTo(-7, -6.6 + b);
      ctx.bezierCurveTo(-7.4, -17.4 + b, 7.4, -17.4 + b, 7, -6.6 + b);
    },
    sphere(p, -2.4, -12 + b, 8, DOME),
  );
  gloss(p, -3.6, -12.6 + b, 2.2, 1, -0.5, 0.8);
  p.circle(0, -17.8 + b, 1.5, CREAM);
  steam(p, -3, -18.6 + b, 7.2);
  steam(p, 3.2, -18.8 + b, 6.4);
  // paws gripping the platter edges
  p.circle(-9.2, -6.8 + b, 2.5, NPC_BODY);
  p.circle(9.2, -6.8 + b, 2.5, NPC_BODY);

  p.restore();
}

// ---------------------------------------------------------------------------
// Exports

export const sprites: SpriteSpec[] = [
  { key: 'npc:mama', fw: 1, fh: 1, height: 44, paint: (p) => mamaNpc(p, false) },
  { key: 'npc:mama_walk', fw: 1, fh: 1, height: 44, paint: (p) => mamaNpc(p, true) },
];

export const icons: IconSpec[] = [
  ...DISH_LIST.map((d) => ({ key: `icon:${d.id}`, paint: DISH_ART[d.id] ?? fallbackDish(d.id) })),
  ...Object.entries(COOK_PROP_ART).map(([name, paint]) => ({
    key: `cook:${name}`,
    size: 96,
    paint: (p: Pen) => {
      p.lineWidth = 1.6;
      paint(p);
    },
  })),
  { key: 'portrait:mama_marigold', paint: mamaPortrait },
];
