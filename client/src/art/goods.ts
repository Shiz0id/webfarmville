// Icons for crafted goods plus the core UI currency/progress icons.
import { type IconSpec, type SpriteSpec, type Pen, shade, rng, mix } from './kit';
import { ITEM_LIST } from '@farm/shared';

export const sprites: SpriteSpec[] = [];

const INK = '#2b1d14';
type Ctx = CanvasRenderingContext2D;

// ---------------------------------------------------------------------------
// Helpers

/** Build a path with raw canvas calls, then fill and outline it. */
function shape(p: Pen, build: (ctx: Ctx) => void, fill: string | CanvasGradient | null, stroke: string | null = p.outline): void {
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
    ctx.lineWidth = p.lineWidth;
    ctx.stroke();
  }
}

function hgrad(p: Pen, x0: number, x1: number, color: string, lit = 0.25, dark = -0.2): CanvasGradient {
  const g = p.ctx.createLinearGradient(x0, 0, x1, 0);
  g.addColorStop(0, shade(color, lit));
  g.addColorStop(0.5, color);
  g.addColorStop(1, shade(color, dark));
  return g;
}

function base(p: Pen, y = 35, rx = 13): void {
  p.shadow(20, y, rx, 3.5, 0.25);
}

function shine(p: Pen, x: number, y0: number, y1: number, alpha = 0.7): void {
  p.line([{ x, y: y0 }, { x, y: y1 }], `rgba(255,255,255,${alpha})`, 1.5);
}

function sparkle(p: Pen, x: number, y: number, s: number, color = '#ffffff'): void {
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

function leaf(p: Pen, x: number, y: number, len: number, rot: number, color = '#6fb24c'): void {
  p.ellipse(x, y, len, len * 0.45, color, p.outline, rot);
  const dx = Math.cos(rot) * len * 0.8;
  const dy = Math.sin(rot) * len * 0.8;
  p.line([{ x: x - dx, y: y - dy }, { x: x + dx, y: y + dy }], shade(color, -0.3), 0.7);
}

// --- small emblems ----------------------------------------------------------

function wheatEmblem(p: Pen, x: number, y: number, col = '#d9a93e'): void {
  p.line([{ x, y: y + 5 }, { x, y: y - 4 }], shade(col, -0.3), 1);
  for (let i = 0; i < 3; i++) {
    const yy = y - 3 + i * 2.6;
    p.ellipse(x - 1.6, yy, 1.5, 0.8, col, null, -0.6);
    p.ellipse(x + 1.6, yy, 1.5, 0.8, col, null, 0.6);
  }
  p.ellipse(x, y - 4.5, 0.9, 1.5, col, null);
}

function cornEmblem(p: Pen, x: number, y: number): void {
  p.ellipse(x - 2.5, y + 1, 1.6, 4.5, '#7cbf4f', null, 0.4);
  p.ellipse(x + 2.5, y + 1, 1.6, 4.5, '#7cbf4f', null, -0.4);
  p.ellipse(x, y - 0.5, 2.2, 5, '#ffd23f', shade('#ffd23f', -0.4));
  p.line([{ x: x - 1.5, y: y - 1.5 }, { x: x + 1.5, y: y - 1.5 }], shade('#ffd23f', -0.3), 0.5);
  p.line([{ x: x - 1.5, y: y + 1 }, { x: x + 1.5, y: y + 1 }], shade('#ffd23f', -0.3), 0.5);
}

function riceEmblem(p: Pen, x: number, y: number): void {
  p.ellipse(x - 2.4, y + 0.5, 1.2, 2.2, '#ffffff', '#b9b2a6', 0.5);
  p.ellipse(x + 2.4, y + 0.5, 1.2, 2.2, '#ffffff', '#b9b2a6', -0.5);
  p.ellipse(x, y - 1.2, 1.2, 2.2, '#ffffff', '#b9b2a6');
}

function strawberryEmblem(p: Pen, x: number, y: number, s = 1): void {
  shape(
    p,
    (ctx) => {
      ctx.moveTo(x - 3.2 * s, y - 2 * s);
      ctx.quadraticCurveTo(x, y - 3.4 * s, x + 3.2 * s, y - 2 * s);
      ctx.quadraticCurveTo(x + 3 * s, y + 2 * s, x, y + 3.8 * s);
      ctx.quadraticCurveTo(x - 3 * s, y + 2 * s, x - 3.2 * s, y - 2 * s);
    },
    '#e8384a',
    shade('#e8384a', -0.45),
  );
  p.poly(
    [
      { x: x - 2.4 * s, y: y - 2.6 * s },
      { x, y: y - 1.5 * s },
      { x: x + 2.4 * s, y: y - 2.6 * s },
      { x, y: y - 3.8 * s },
    ],
    '#5fae45',
    null,
  );
  for (const [dx, dy] of [
    [-1.2, 0],
    [1.2, 0.2],
    [0, 1.8],
  ])
    p.circle(x + dx * s, y + dy * s, 0.35 * s, '#ffe9a8', null);
}

function appleEmblem(p: Pen, x: number, y: number): void {
  p.ball(x, y + 0.5, 3.4, '#e8494a', shade('#e8494a', -0.45));
  p.line([{ x, y: y - 2.6 }, { x: x + 0.6, y: y - 4.4 }], '#7a5235', 0.9);
  p.ellipse(x + 2, y - 3.6, 1.6, 0.8, '#6fb24c', null, -0.4);
}

function cherryEmblem(p: Pen, x: number, y: number): void {
  p.curve({ x: x - 2.2, y: y + 1 }, { x: x - 1, y: y - 3 }, { x: x + 1.5, y: y - 4 }, '#6a8a3a', 0.8);
  p.curve({ x: x + 2.4, y: y + 1.5 }, { x: x + 2.2, y: y - 2 }, { x: x + 1.5, y: y - 4 }, '#6a8a3a', 0.8);
  p.ball(x - 2.2, y + 1.6, 2.2, '#c81d3a', shade('#c81d3a', -0.4));
  p.ball(x + 2.4, y + 2, 2.2, '#c81d3a', shade('#c81d3a', -0.4));
}

function orangeSlice(p: Pen, x: number, y: number, r: number, col = '#ffa53a'): void {
  p.circle(x, y, r, col, shade(col, -0.4));
  p.circle(x, y, r * 0.78, shade(col, 0.45), null);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    p.line([{ x, y }, { x: x + Math.cos(a) * r * 0.78, y: y + Math.sin(a) * r * 0.78 }], col, 0.6);
  }
}

// --- containers -------------------------------------------------------------

/** Tied cloth/burlap sack with an emblem; `spill` adds a little heap at its foot. */
function sack(p: Pen, cloth: string, tie: string, emblem: (p: Pen) => void, spill?: string, patch?: string): void {
  base(p, 35, 14);
  shape(
    p,
    (ctx) => {
      ctx.moveTo(14, 12);
      ctx.quadraticCurveTo(8, 18, 8, 27);
      ctx.quadraticCurveTo(8, 35, 15, 35);
      ctx.lineTo(25, 35);
      ctx.quadraticCurveTo(32, 35, 32, 27);
      ctx.quadraticCurveTo(32, 18, 26, 12);
    },
    hgrad(p, 8, 32, cloth, 0.2, -0.2),
  );
  // gathered top
  shape(
    p,
    (ctx) => {
      ctx.moveTo(14, 12);
      ctx.lineTo(11, 6);
      ctx.quadraticCurveTo(15, 4, 17, 7);
      ctx.quadraticCurveTo(20, 3.5, 23, 7);
      ctx.quadraticCurveTo(25, 4, 29, 6);
      ctx.lineTo(26, 12);
    },
    shade(cloth, 0.08),
  );
  p.line([{ x: 17, y: 8 }, { x: 18, y: 11 }], shade(cloth, -0.25), 0.7);
  p.line([{ x: 23, y: 8 }, { x: 22, y: 11 }], shade(cloth, -0.25), 0.7);
  p.roundRect(13, 10.5, 14, 3, 1.5, tie);
  if (patch) p.roundRect(13, 19, 14, 11, 3, patch);
  emblem(p);
  p.curve({ x: 11, y: 18 }, { x: 9.5, y: 25 }, { x: 11, y: 31 }, 'rgba(255,255,255,0.45)', 1.2);
  if (spill) {
    shape(
      p,
      (ctx) => {
        ctx.moveTo(26, 36);
        ctx.quadraticCurveTo(31, 29, 37, 36);
      },
      spill,
    );
  }
}

/** Glass jam jar with a lid style and a fruit label. */
function jar(
  p: Pen,
  jam: string,
  lid: { kind: 'cloth' | 'metal'; color: string; pattern?: 'gingham' | 'dots' },
  label: (p: Pen) => void,
  wide = false,
): void {
  base(p, 35, wide ? 15 : 12);
  const x0 = wide ? 7 : 10;
  const w = wide ? 26 : 20;
  const top = wide ? 15 : 12;
  p.roundRect(x0, top, w, 35 - top, 5, hgrad(p, x0, x0 + w, jam, 0.15, -0.3));
  p.rect(x0 + 1, top + 1, w - 2, 2.5, 'rgba(255,255,255,0.35)', null);
  // label
  p.roundRect(x0 + 3, top + 9, w - 6, wide ? 9 : 10, 3, '#fff7e6');
  label(p);
  shine(p, x0 + 2.6, top + 4, 31, 0.55);
  const cx = x0 + w / 2;
  if (lid.kind === 'metal') {
    p.roundRect(x0 + 1, top - 5, w - 2, 6, 2, hgrad(p, x0, x0 + w, lid.color, 0.3, -0.25));
    for (let x = x0 + 3; x < x0 + w - 2; x += 2.5) p.line([{ x, y: top - 4 }, { x, y: top }], shade(lid.color, -0.25), 0.6);
  } else {
    const pts = [
      { x: x0 - 2, y: top + 1 },
      { x: x0 + 2, y: top - 5 },
      { x: x0 + w - 2, y: top - 5 },
      { x: x0 + w + 2, y: top + 1 },
    ];
    p.poly(pts, lid.color);
    p.save();
    p.ctx.beginPath();
    p.ctx.moveTo(pts[0].x, pts[0].y);
    for (const q of pts.slice(1)) p.ctx.lineTo(q.x, q.y);
    p.ctx.closePath();
    p.ctx.clip();
    if (lid.pattern === 'gingham') {
      for (let x = x0 - 2; x < x0 + w + 2; x += 3) p.rect(x, top - 6, 1.5, 8, 'rgba(255,255,255,0.55)', null);
      for (let y = top - 5; y < top + 2; y += 3) p.rect(x0 - 3, y, w + 6, 1.5, 'rgba(255,255,255,0.55)', null);
    } else if (lid.pattern === 'dots') {
      for (let x = x0 + 1; x < x0 + w; x += 4) p.circle(x, top - 2, 0.9, '#ffffff', null);
    }
    p.restore();
    p.poly(pts, null);
    p.line([{ x: x0 - 0.5, y: top }, { x: x0 + w + 0.5, y: top }], '#8a5a2a', 1.3);
    p.circle(cx + w / 2 - 1, top + 1, 1, '#8a5a2a', null);
  }
}

/** A tall glass with a drink, optional garnish and straw. */
function glass(p: Pen, drink: string, opts: { straw?: string; ice?: boolean; foam?: string } = {}): void {
  base(p, 36, 11);
  if (opts.straw) {
    p.line([{ x: 22, y: 14 }, { x: 28, y: 3 }], p.outline, 3.4);
    p.line([{ x: 22, y: 14 }, { x: 28, y: 3 }], opts.straw, 2);
    p.line([{ x: 23.2, y: 11.5 }, { x: 24.6, y: 9 }], '#ffffff', 2);
    p.line([{ x: 25.8, y: 7 }, { x: 27.2, y: 4.5 }], '#ffffff', 2);
  }
  // glass body (tapered)
  const body = (ctx: Ctx) => {
    ctx.moveTo(11, 10);
    ctx.lineTo(29, 10);
    ctx.lineTo(27, 34);
    ctx.quadraticCurveTo(27, 36, 25, 36);
    ctx.lineTo(15, 36);
    ctx.quadraticCurveTo(13, 36, 13, 34);
  };
  shape(p, body, 'rgba(235,248,255,0.55)', null);
  p.save();
  p.ctx.beginPath();
  body(p.ctx);
  p.ctx.closePath();
  p.ctx.clip();
  p.rect(8, 15, 24, 22, p.vgrad(15, 36, shade(drink, 0.15), shade(drink, -0.12)), null);
  p.ellipse(20, 15, 9.5, 1.8, shade(drink, 0.3), null);
  if (opts.foam) p.rect(8, 12.5, 24, 4, opts.foam, null);
  if (opts.ice) {
    p.roundRect(14, 18, 5, 5, 1, 'rgba(255,255,255,0.55)', 'rgba(255,255,255,0.8)');
    p.roundRect(20, 22, 5, 5, 1, 'rgba(255,255,255,0.5)', 'rgba(255,255,255,0.8)');
  }
  p.restore();
  shape(p, body, null);
  p.ellipse(20, 10, 9, 1.6, 'rgba(255,255,255,0.4)');
  shine(p, 13.8, 13, 33, 0.75);
}

// ---------------------------------------------------------------------------
// Goods

const flour = (p: Pen) =>
  sack(p, '#f4ead6', '#c8a26a', (p) => wheatEmblem(p, 20, 24), '#fffaf0');

const cornmeal = (p: Pen) =>
  sack(p, '#d7b07a', '#7a5235', (p) => cornEmblem(p, 20, 24), '#ffd65a', '#f6e8c6');

const riceFlour = (p: Pen) =>
  sack(p, '#cfe3f2', '#e46a8a', (p) => riceEmblem(p, 20, 24), undefined, '#ffffff');

function bread(p: Pen): void {
  base(p, 33, 16);
  shape(
    p,
    (ctx) => {
      ctx.moveTo(5, 28);
      ctx.bezierCurveTo(3, 18, 12, 11, 20, 11);
      ctx.bezierCurveTo(30, 11, 37, 18, 35, 28);
      ctx.quadraticCurveTo(34, 32, 30, 32);
      ctx.lineTo(10, 32);
      ctx.quadraticCurveTo(6, 32, 5, 28);
    },
    p.vgrad(11, 32, '#e6a24e', '#b86a2a'),
  );
  for (const x of [12, 19, 26]) {
    p.curve({ x: x - 2, y: 20 }, { x: x + 1, y: 15 }, { x: x + 4, y: 16 }, '#f8dca0', 2.2);
    p.curve({ x: x - 2, y: 20 }, { x: x + 1, y: 15 }, { x: x + 4, y: 16 }, shade('#b86a2a', -0.2), 0.6);
  }
  p.ellipse(13, 15, 4, 1.5, 'rgba(255,240,200,0.5)', null, -0.4);
}

function muffin(p: Pen): void {
  base(p, 35, 12);
  // paper cup
  shape(
    p,
    (ctx) => {
      ctx.moveTo(9, 21);
      ctx.lineTo(31, 21);
      ctx.lineTo(28, 35);
      ctx.lineTo(12, 35);
    },
    '#f39bb6',
  );
  for (let x = 12; x <= 28; x += 3.2) p.line([{ x, y: 22 }, { x: 12 + (x - 12) * 0.85 + 1.2, y: 34.5 }], shade('#f39bb6', -0.25), 0.8);
  // top
  shape(
    p,
    (ctx) => {
      ctx.moveTo(7, 22);
      ctx.bezierCurveTo(5, 13, 13, 7, 20, 7);
      ctx.bezierCurveTo(27, 7, 35, 13, 33, 22);
      ctx.quadraticCurveTo(20, 25, 7, 22);
    },
    p.vgrad(7, 23, '#f2c27a', '#c98a3e'),
  );
  const r = rng('muffin');
  for (let i = 0; i < 7; i++) {
    const x = 11 + r() * 18;
    const y = 11 + r() * 9;
    p.circle(x, y, 1.9, '#4a5fc4', shade('#4a5fc4', -0.45));
    p.circle(x - 0.5, y - 0.6, 0.5, '#b8c4ff', null);
  }
  p.ellipse(14, 11, 3, 1.4, 'rgba(255,245,220,0.55)', null, -0.4);
}

function cornbread(p: Pen): void {
  base(p, 34, 15);
  // skillet
  p.line([{ x: 30, y: 30 }, { x: 38, y: 33 }], p.outline, 4);
  p.line([{ x: 30, y: 30 }, { x: 38, y: 33 }], '#5a5450', 2.4);
  p.ellipse(19, 27, 16, 8, '#4a4542');
  p.ellipse(19, 25, 14, 6.5, '#6a6460', null);
  // golden slab cut into wedges
  p.ellipse(19, 23, 13, 6, p.vgrad(17, 29, '#ffd56a', '#e4a33a'));
  p.ellipse(19, 21.5, 12, 5, '#f7c652', null);
  p.line([{ x: 7.5, y: 22 }, { x: 30.5, y: 22 }], shade('#e4a33a', -0.25), 0.8);
  p.line([{ x: 19, y: 16.8 }, { x: 19, y: 27.5 }], shade('#e4a33a', -0.25), 0.8);
  // butter pat
  p.poly(
    [
      { x: 20, y: 17 },
      { x: 25, y: 18.5 },
      { x: 22, y: 21 },
      { x: 17, y: 19.5 },
    ],
    '#fff3a8',
  );
  p.poly(
    [
      { x: 17, y: 19.5 },
      { x: 22, y: 21 },
      { x: 22, y: 22.5 },
      { x: 17, y: 21 },
    ],
    '#efd76a',
  );
  for (const [x, y] of [
    [12, 20],
    [27, 23],
    [14, 24],
  ])
    p.circle(x, y, 0.7, '#c98a2a', null);
}

function pumpkinPie(p: Pen): void {
  base(p, 34, 16);
  p.ellipse(20, 28, 16, 6.5, '#d9dfe6');
  p.ellipse(20, 24, 16, 7, p.vgrad(17, 31, '#e9b36a', '#c47c34'));
  p.ellipse(20, 22.5, 13, 5.2, p.vgrad(17, 28, '#f39a3a', '#d8731f'));
  // crimped crust rim
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2;
    p.circle(20 + Math.cos(a) * 14.4, 23.4 + Math.sin(a) * 6, 1.6, '#f0c07a', null);
  }
  // whipped cream dollop
  shape(
    p,
    (ctx) => {
      ctx.moveTo(14, 22);
      ctx.quadraticCurveTo(13, 18, 17, 17.5);
      ctx.quadraticCurveTo(18, 13, 21, 14.5);
      ctx.quadraticCurveTo(24, 15, 23, 17.5);
      ctx.quadraticCurveTo(27, 18, 26, 22);
      ctx.quadraticCurveTo(20, 24, 14, 22);
    },
    '#fffaf2',
  );
  p.curve({ x: 17, y: 19.5 }, { x: 20, y: 18 }, { x: 23, y: 19.5 }, '#e6ddd0', 0.8);
  p.circle(21, 12.5, 0.9, '#c47c34', null);
  leaf(p, 30, 17, 3, -0.5);
}

function butter(p: Pen): void {
  base(p, 33, 15);
  // plate
  p.ellipse(20, 29, 16, 6, '#cfe5f5');
  p.ellipse(20, 28.5, 12, 4, '#e6f3fc', null);
  // block
  const top = [
    { x: 8, y: 19 },
    { x: 22, y: 14 },
    { x: 32, y: 18 },
    { x: 18, y: 23 },
  ];
  p.poly([top[0], top[3], { x: 18, y: 31 }, { x: 8, y: 27 }], '#f2d65a');
  p.poly([top[3], top[2], { x: 32, y: 26 }, { x: 18, y: 31 }], '#e0bf3e');
  p.poly(top, '#fff09a');
  // paper wrap on the back half
  p.poly(
    [
      { x: 22, y: 14 },
      { x: 32, y: 18 },
      { x: 32, y: 26 },
      { x: 26, y: 28 },
      { x: 26, y: 19.5 },
      { x: 16, y: 16 },
    ],
    'rgba(255,255,255,0.9)',
  );
  p.line([{ x: 28, y: 21 }, { x: 31, y: 20 }], '#7fb3d9', 1);
  p.line([{ x: 28, y: 23.5 }, { x: 31, y: 22.5 }], '#7fb3d9', 1);
  // knife curl
  p.curve({ x: 10, y: 20 }, { x: 14, y: 17 }, { x: 17, y: 21 }, '#fffbe0', 1.5);
}

function cheese(p: Pen): void {
  base(p, 34, 15);
  const yel = '#ffcf3f';
  // wedge: top triangle + front and side faces
  const tip = { x: 6, y: 28 };
  const backL = { x: 22, y: 12 };
  const backR = { x: 35, y: 18 };
  const lowR = { x: 35, y: 26 };
  const lowTip = { x: 6, y: 33 };
  p.poly([tip, backR, lowR, lowTip], shade(yel, -0.05));
  p.poly([backL, backR, lowR, { x: 22, y: 20 }], shade(yel, -0.25));
  p.poly([tip, backL, backR], shade(yel, 0.3));
  // holes
  for (const [x, y, r] of [
    [14, 28, 2],
    [24, 26, 1.6],
    [30, 22.5, 1.3],
    [19, 31, 1.1],
  ])
    p.ellipse(x, y, r, r * 0.9, shade(yel, -0.35), null);
  p.ellipse(22, 18, 2.2, 1, shade(yel, -0.15), null);
  p.ellipse(28, 18.5, 1.5, 0.7, shade(yel, -0.15), null);
  // rind
  p.line([backR, lowR], '#e8a020', 1.6);
}

function iceCream(p: Pen): void {
  base(p, 37, 7);
  // cone
  shape(
    p,
    (ctx) => {
      ctx.moveTo(11, 20);
      ctx.lineTo(29, 20);
      ctx.lineTo(20, 38);
    },
    p.vgrad(20, 38, '#e8b56a', '#c98a3e'),
  );
  p.save();
  p.ctx.beginPath();
  p.ctx.moveTo(11, 20);
  p.ctx.lineTo(29, 20);
  p.ctx.lineTo(20, 38);
  p.ctx.closePath();
  p.ctx.clip();
  for (let i = -4; i < 6; i++) {
    p.line([{ x: 8 + i * 4, y: 20 }, { x: 22 + i * 4, y: 40 }], shade('#c98a3e', -0.15), 0.7);
    p.line([{ x: 32 - i * 4, y: 20 }, { x: 18 - i * 4, y: 40 }], shade('#c98a3e', -0.15), 0.7);
  }
  p.restore();
  // scoop
  shape(
    p,
    (ctx) => {
      ctx.moveTo(9, 21);
      ctx.bezierCurveTo(6, 10, 14, 6, 20, 6);
      ctx.bezierCurveTo(26, 6, 34, 10, 31, 21);
      ctx.quadraticCurveTo(28, 24, 25, 21);
      ctx.quadraticCurveTo(22, 24.5, 19, 21);
      ctx.quadraticCurveTo(16, 24, 13, 21);
      ctx.quadraticCurveTo(11, 23.5, 9, 21);
    },
    p.vgrad(6, 23, '#ffc9d9', '#f58bab'),
  );
  for (const [x, y] of [
    [14, 15],
    [24, 13],
    [20, 18],
    [27, 18],
  ])
    p.ellipse(x, y, 1.1, 0.6, '#e2405a', null, 0.5);
  p.ellipse(14, 10.5, 3, 1.5, 'rgba(255,255,255,0.6)', null, -0.5);
  strawberryEmblem(p, 23, 5, 0.9);
}

function goatCheese(p: Pen): void {
  base(p, 34, 16);
  // wooden board
  p.ellipse(20, 29, 17, 6.5, '#c9935a');
  p.ellipse(20, 28, 15, 5, '#dcaa70', null);
  // round of chèvre with a slice cut
  p.cylinder(17, 27, 10, 9, '#fbf7ee');
  p.cylinder(30, 30, 4.2, 6, '#fbf7ee');
  const r = rng('chevre');
  for (let i = 0; i < 9; i++) {
    const a = r() * Math.PI * 2;
    const d = r() * 7;
    p.ellipse(17 + Math.cos(a) * d, 18 + Math.sin(a) * d * 0.45, 0.9, 0.5, i % 3 ? '#6f9a4a' : '#4e7a32', null, a);
  }
  leaf(p, 11, 15, 3.4, -0.6, '#7cb85a');
}

const strawberryJam = (p: Pen) => jar(p, '#d9233c', { kind: 'cloth', color: '#e8424a', pattern: 'gingham' }, (p) => strawberryEmblem(p, 20, 26, 1.1));
const appleJam = (p: Pen) => jar(p, '#e2a33a', { kind: 'metal', color: '#7cbf4f' }, (p) => appleEmblem(p, 20, 26));
const cherryJam = (p: Pen) => jar(p, '#8e1630', { kind: 'cloth', color: '#f49ac1', pattern: 'dots' }, (p) => cherryEmblem(p, 20, 25.5));
const marmalade = (p: Pen) =>
  jar(p, '#f28a1c', { kind: 'metal', color: '#ffd23f' }, (p) => orangeSlice(p, 20, 28.5, 4), true);

function cranberrySauce(p: Pen): void {
  base(p, 34, 16);
  // bowl
  shape(
    p,
    (ctx) => {
      ctx.moveTo(4, 20);
      ctx.quadraticCurveTo(5, 34, 20, 34);
      ctx.quadraticCurveTo(35, 34, 36, 20);
    },
    hgrad(p, 4, 36, '#fdf6ec', 0.4, -0.15),
  );
  p.line([{ x: 7, y: 27 }, { x: 33, y: 27 }], '#4a8fd0', 1.4);
  p.ellipse(20, 20, 16, 5.5, '#f4ece0');
  p.ellipse(20, 20.5, 14, 4.4, p.vgrad(16, 25, '#d0233f', '#8e1630'), null);
  const r = rng('cranberry');
  for (let i = 0; i < 7; i++) {
    const x = 10 + r() * 20;
    const y = 18 + r() * 4;
    p.ball(x, y, 2.4, '#c8183a', shade('#c8183a', -0.45));
  }
  leaf(p, 26, 15, 3.5, -0.4, '#5f9e45');
  leaf(p, 31, 16, 3, 0.4, '#6fb24c');
}

function yarn(p: Pen): void {
  base(p, 35, 13);
  // knitting needles
  p.line([{ x: 8, y: 6 }, { x: 31, y: 34 }], p.outline, 3);
  p.line([{ x: 8, y: 6 }, { x: 31, y: 34 }], '#d8c0a0', 1.8);
  p.line([{ x: 33, y: 7 }, { x: 10, y: 34 }], p.outline, 3);
  p.line([{ x: 33, y: 7 }, { x: 10, y: 34 }], '#d8c0a0', 1.8);
  p.circle(8, 6, 2.2, '#f4b844');
  p.circle(33, 7, 2.2, '#f4b844');
  const col = '#ee6f8a';
  p.ball(20, 22, 11.5, col);
  p.save();
  p.ctx.beginPath();
  p.ctx.arc(20, 22, 11, 0, Math.PI * 2);
  p.ctx.clip();
  const dark = shade(col, -0.3);
  for (let i = -3; i <= 3; i++) p.curve({ x: 8, y: 22 + i * 3.5 - 6 }, { x: 18, y: 22 + i * 3.5 + 3 }, { x: 33, y: 22 + i * 3.5 - 4 }, dark, 0.8);
  for (let i = -2; i <= 2; i++) p.curve({ x: 20 + i * 4 - 4, y: 9 }, { x: 22 + i * 4 + 4, y: 22 }, { x: 18 + i * 4, y: 34 }, shade(col, 0.25), 0.8);
  p.restore();
  p.circle(20, 22, 11.5, null);
  // loose tail
  p.curve({ x: 28, y: 30 }, { x: 34, y: 34 }, { x: 37, y: 30 }, col, 1.6);
}

function sweater(p: Pen): void {
  base(p, 36, 15);
  const red = '#d9474f';
  shape(
    p,
    (ctx) => {
      ctx.moveTo(14, 7);
      ctx.quadraticCurveTo(20, 11, 26, 7);
      ctx.lineTo(33, 10);
      ctx.lineTo(37, 25);
      ctx.lineTo(32, 26);
      ctx.lineTo(29, 18);
      ctx.lineTo(29, 34);
      ctx.lineTo(11, 34);
      ctx.lineTo(11, 18);
      ctx.lineTo(8, 26);
      ctx.lineTo(3, 25);
      ctx.lineTo(7, 10);
    },
    hgrad(p, 3, 37, red, 0.15, -0.2),
  );
  // collar, cuffs, hem ribbing
  p.curve({ x: 14, y: 7 }, { x: 20, y: 13 }, { x: 26, y: 7 }, '#fff3e3', 2.2);
  p.rect(11, 31, 18, 3, '#b8333b');
  p.line([{ x: 3.5, y: 24 }, { x: 8.2, y: 25 }], '#fff3e3', 2);
  p.line([{ x: 31.8, y: 25 }, { x: 36.5, y: 24 }], '#fff3e3', 2);
  // fair-isle band
  p.rect(11, 20, 18, 5, '#fff3e3', null);
  for (let x = 12.5; x < 29; x += 3) {
    p.poly(
      [
        { x, y: 22.5 },
        { x: x + 1.2, y: 21 },
        { x: x + 2.4, y: 22.5 },
        { x: x + 1.2, y: 24 },
      ],
      '#4f9a5a',
      null,
    );
  }
  p.heart(20, 15.5, 2.2, '#fff3e3', null);
  p.line([{ x: 11, y: 20 }, { x: 29, y: 20 }], shade(red, -0.25), 0.6);
  p.line([{ x: 11, y: 25 }, { x: 29, y: 25 }], shade(red, -0.25), 0.6);
}

function cottonCloth(p: Pen): void {
  base(p, 35, 16);
  const cloth = '#f7f1e4';
  const stripe = '#8cc0e6';
  // unrolled length of fabric draping forward
  shape(
    p,
    (ctx) => {
      ctx.moveTo(12, 28);
      ctx.lineTo(30, 28);
      ctx.quadraticCurveTo(34, 31, 36, 36);
      ctx.lineTo(16, 36);
      ctx.quadraticCurveTo(14, 31, 12, 28);
    },
    shade(cloth, -0.06),
  );
  for (const t of [0.33, 0.66]) p.line([{ x: 13 + t * 4, y: 28 + t * 8 }, { x: 30 + t * 6, y: 28 + t * 8 }], stripe, 1.2);
  // the roll: a lying cylinder
  p.rect(10, 10, 22, 18, hgrad(p, 10, 32, cloth, 0, 0), null);
  p.save();
  p.ctx.beginPath();
  p.ctx.rect(10, 10, 22, 18);
  p.ctx.clip();
  p.rect(10, 10, 22, 18, p.vgrad(10, 28, shade(cloth, 0.3), shade(cloth, -0.18)), null);
  for (let x = 13; x < 32; x += 4.5) p.rect(x, 9, 1.8, 20, stripe, null);
  p.rect(10, 12, 22, 2, 'rgba(255,255,255,0.55)', null);
  p.restore();
  p.line([{ x: 10, y: 10 }, { x: 32, y: 10 }], p.outline, 1);
  p.line([{ x: 10, y: 28 }, { x: 32, y: 28 }], p.outline, 1);
  p.ellipse(32, 19, 4.5, 9, shade(cloth, -0.15));
  p.ellipse(10, 19, 4.5, 9, '#fbf7ee');
  // spiral end
  p.ctx.beginPath();
  for (let i = 0; i < 40; i++) {
    const a = i * 0.45;
    const rr = 0.5 + i * 0.09;
    const x = 10 + Math.cos(a) * rr * 0.5;
    const y = 19 + Math.sin(a) * rr;
    if (i === 0) p.ctx.moveTo(x, y);
    else p.ctx.lineTo(x, y);
  }
  p.ctx.strokeStyle = '#c9bfae';
  p.ctx.lineWidth = 0.7;
  p.ctx.stroke();
  p.ellipse(10, 19, 1.4, 2.6, '#b07a4a', null);
  // ribbon tie with a tag
  p.rect(20, 10, 2.5, 18, '#e46a8a', null);
  p.line([{ x: 22, y: 12 }, { x: 27, y: 5 }], '#b07a4a', 0.8);
  p.roundRect(25, 1.5, 8, 6, 1.5, '#fff6d8');
  p.line([{ x: 27, y: 4.5 }, { x: 31, y: 4.5 }], '#c9bfae', 0.8);
}

function quilt(p: Pen): void {
  base(p, 35, 16);
  const colors = ['#f28b9b', '#8cc0e6', '#ffd56a', '#9ad27a', '#c9a6ee', '#f6b37a'];
  // folded stack: two layers of patches
  const layer = (y: number, offset: number) => {
    const cols = 4;
    const w = 7;
    for (let i = 0; i < cols; i++) {
      p.rect(5 + i * w, y, w, 6, colors[(i + offset) % colors.length], null);
      p.rect(5 + i * w, y + 6, w, 6, colors[(i + offset + 3) % colors.length], null);
    }
    p.roundRect(5, y, 28, 12, 2, null);
    // stitching
    p.ctx.setLineDash([1.2, 1.2]);
    p.line([{ x: 5.8, y: y + 6 }, { x: 32.2, y: y + 6 }], 'rgba(255,255,255,0.85)', 0.7);
    for (let i = 1; i < cols; i++) p.line([{ x: 5 + i * w, y: y + 0.8 }, { x: 5 + i * w, y: y + 11.2 }], 'rgba(255,255,255,0.85)', 0.7);
    p.ctx.setLineDash([]);
  };
  layer(22, 2);
  p.rect(6, 21, 26, 2, '#fff3e3', null);
  layer(9, 0);
  p.roundRect(4.5, 8.5, 29, 26, 3, null);
  p.heart(33, 8, 3, '#f06a8a');
}

function lemonade(p: Pen): void {
  glass(p, '#fff07a', { straw: '#f28b9b', ice: true });
  orangeSlice(p, 29, 12, 5, '#f7d23a');
  p.circle(15, 26, 0.8, '#fffbe0', null);
  p.circle(23, 30, 0.6, '#fffbe0', null);
}

function veggieJuice(p: Pen): void {
  glass(p, '#f26b2a', { straw: '#7cbf4f' });
  // carrot garnish
  shape(
    p,
    (ctx) => {
      ctx.moveTo(25, 13);
      ctx.lineTo(34, 9);
      ctx.lineTo(28, 17);
    },
    '#ff9a3a',
  );
  leaf(p, 34.5, 7, 2.5, -1.1, '#5fae45');
  leaf(p, 36, 9.5, 2.5, -0.2, '#6fb24c');
  // a celery-ish leaf on the rim
  leaf(p, 12, 9, 3, -0.8, '#7cbf4f');
}

function grapeJuice(p: Pen): void {
  base(p, 36, 12);
  // wine-style bottle
  shape(
    p,
    (ctx) => {
      ctx.moveTo(17, 4);
      ctx.lineTo(23, 4);
      ctx.lineTo(23, 13);
      ctx.quadraticCurveTo(29, 15, 29, 21);
      ctx.lineTo(29, 34);
      ctx.quadraticCurveTo(29, 36, 27, 36);
      ctx.lineTo(13, 36);
      ctx.quadraticCurveTo(11, 36, 11, 34);
      ctx.lineTo(11, 21);
      ctx.quadraticCurveTo(11, 15, 17, 13);
    },
    hgrad(p, 11, 29, '#7a3aa8', 0.25, -0.3),
  );
  p.rect(17, 4, 6, 3.5, '#f1d36a');
  p.roundRect(13, 21, 14, 10, 2, '#fff7e6');
  // grape cluster label
  for (const [x, y] of [
    [17.5, 24],
    [20, 24],
    [22.5, 24],
    [18.8, 26.2],
    [21.2, 26.2],
    [20, 28.4],
  ])
    p.circle(x, y, 1.3, '#8e44c0', shade('#8e44c0', -0.4));
  p.ellipse(22.5, 22.3, 1.6, 0.8, '#6fb24c', null, -0.4);
  shine(p, 13.5, 17, 33, 0.5);
}

function smoothie(p: Pen): void {
  base(p, 36, 11);
  // cup with dome lid
  shape(
    p,
    (ctx) => {
      ctx.moveTo(10, 15);
      ctx.lineTo(30, 15);
      ctx.lineTo(27, 36);
      ctx.lineTo(13, 36);
    },
    p.vgrad(15, 36, '#ffc49a', '#f49a6a'),
  );
  p.line([{ x: 11, y: 22 }, { x: 29, y: 22 }], 'rgba(255,255,255,0.6)', 1);
  p.roundRect(13, 24, 14, 7, 3, '#fff7e6');
  p.heart(20, 27.5, 2.2, '#f49a6a', null);
  // whipped top
  shape(
    p,
    (ctx) => {
      ctx.moveTo(9, 15.5);
      ctx.quadraticCurveTo(9, 9, 15, 9);
      ctx.quadraticCurveTo(17, 5, 21, 6);
      ctx.quadraticCurveTo(28, 6, 28, 10);
      ctx.quadraticCurveTo(32, 11, 31, 15.5);
    },
    '#fff6ee',
  );
  p.line([{ x: 22, y: 8 }, { x: 28, y: 1 }], p.outline, 3.4);
  p.line([{ x: 22, y: 8 }, { x: 28, y: 1 }], '#7cc7e8', 2);
  // peach slice
  shape(
    p,
    (ctx) => {
      ctx.moveTo(8, 10);
      ctx.arc(12, 10, 5, Math.PI, Math.PI * 1.9);
    },
    '#ffb36a',
  );
  p.line([{ x: 7.5, y: 10 }, { x: 16.5, y: 8.5 }], '#ffe0b0', 1);
  shine(p, 12, 17, 33, 0.5);
}

function latte(p: Pen): void {
  base(p, 35, 16);
  // saucer
  p.ellipse(20, 31, 17, 5.5, '#f6efe4');
  p.ellipse(20, 30.5, 10, 3, '#e8ddcd', null);
  // handle
  p.ctx.beginPath();
  p.ctx.arc(30, 22, 4.5, -Math.PI / 2, Math.PI / 2);
  p.ctx.strokeStyle = p.outline;
  p.ctx.lineWidth = 3.6;
  p.ctx.stroke();
  p.ctx.strokeStyle = '#7fb3d9';
  p.ctx.lineWidth = 2;
  p.ctx.stroke();
  // cup
  shape(
    p,
    (ctx) => {
      ctx.moveTo(8, 15);
      ctx.lineTo(32, 15);
      ctx.quadraticCurveTo(31, 31, 20, 31);
      ctx.quadraticCurveTo(9, 31, 8, 15);
    },
    hgrad(p, 8, 32, '#9ccbe8', 0.3, -0.2),
  );
  p.line([{ x: 9.2, y: 20 }, { x: 30.8, y: 20 }], '#ffffff', 1.2);
  p.ellipse(20, 15, 12, 3.6, '#ffffff');
  p.ellipse(20, 15.2, 10.5, 2.8, '#b7743e', null);
  p.heart(20, 15.3, 2.1, '#fff2e0', null);
  // steam
  p.curve({ x: 15, y: 10 }, { x: 13, y: 6 }, { x: 16, y: 2 }, 'rgba(255,255,255,0.85)', 1.4);
  p.curve({ x: 24, y: 10 }, { x: 22, y: 6 }, { x: 25, y: 2 }, 'rgba(255,255,255,0.85)', 1.4);
}

function pancakes(p: Pen): void {
  base(p, 35, 17);
  p.ellipse(20, 31, 17, 5.5, '#eef4fa');
  for (let i = 0; i < 4; i++) {
    const y = 28 - i * 4;
    p.ellipse(20, y + 1.5, 13, 4.2, '#c98a3e');
    p.ellipse(20, y, 13, 4.2, i === 3 ? '#f2c27a' : '#e6aa5a');
  }
  // syrup dripping over the stack
  shape(
    p,
    (ctx) => {
      ctx.moveTo(10, 16);
      ctx.quadraticCurveTo(20, 11, 30, 16);
      ctx.lineTo(30, 20);
      ctx.quadraticCurveTo(29, 23, 28, 20);
      ctx.lineTo(27, 18);
      ctx.quadraticCurveTo(20, 21, 14, 19);
      ctx.lineTo(13, 24);
      ctx.quadraticCurveTo(12, 26, 11, 23.5);
      ctx.lineTo(10, 18);
    },
    'rgba(160,80,20,0.85)',
    null,
  );
  p.ellipse(17, 15.5, 3, 0.8, 'rgba(255,220,160,0.6)', null);
  // butter pat
  p.poly(
    [
      { x: 20, y: 12 },
      { x: 24.5, y: 13.5 },
      { x: 20.5, y: 15.5 },
      { x: 16, y: 14 },
    ],
    '#fff3a8',
  );
  p.poly(
    [
      { x: 16, y: 14 },
      { x: 20.5, y: 15.5 },
      { x: 20.5, y: 17 },
      { x: 16, y: 15.5 },
    ],
    '#efd76a',
  );
  strawberryEmblem(p, 29, 11.5, 0.7);
}

function trufflePasta(p: Pen): void {
  base(p, 34, 17);
  // bowl
  shape(
    p,
    (ctx) => {
      ctx.moveTo(3, 20);
      ctx.quadraticCurveTo(5, 34, 20, 34);
      ctx.quadraticCurveTo(35, 34, 37, 20);
    },
    hgrad(p, 3, 37, '#f6f1ea', 0.4, -0.15),
  );
  p.line([{ x: 6, y: 26 }, { x: 34, y: 26 }], '#d9474f', 1.2);
  p.ellipse(20, 20, 17, 5.6, '#ece4d6');
  // noodle nest
  p.ellipse(20, 18, 13, 5.5, '#f6d58a', shade('#f6d58a', -0.35));
  for (let i = 0; i < 4; i++) {
    p.ctx.beginPath();
    p.ctx.ellipse(20 + (i - 1.5) * 2, 17.5 - i * 0.6, 10 - i * 2.2, 3.8 - i * 0.7, 0, 0, Math.PI * 2);
    p.ctx.strokeStyle = shade('#f6d58a', -0.22);
    p.ctx.lineWidth = 0.8;
    p.ctx.stroke();
  }
  // truffle shavings
  for (const [x, y, rot] of [
    [15, 15, 0.3],
    [22, 14, -0.4],
    [26, 18, 0.2],
    [18, 19.5, -0.2],
  ])
    p.ellipse(x, y, 2.2, 1.3, '#5b3d2e', p.outline, rot);
  // fork
  p.line([{ x: 30, y: 15 }, { x: 37, y: 4 }], p.outline, 3);
  p.line([{ x: 30, y: 15 }, { x: 37, y: 4 }], '#d9dde3', 1.6);
  leaf(p, 11, 15.5, 2.4, -0.3, '#5fae45');
}

function lavenderTea(p: Pen): void {
  base(p, 35, 16);
  p.ellipse(20, 31, 16, 5, '#f4eefb');
  p.ctx.beginPath();
  p.ctx.arc(29.5, 23, 4, -Math.PI / 2, Math.PI / 2);
  p.ctx.strokeStyle = p.outline;
  p.ctx.lineWidth = 3.4;
  p.ctx.stroke();
  p.ctx.strokeStyle = '#ffffff';
  p.ctx.lineWidth = 1.8;
  p.ctx.stroke();
  shape(
    p,
    (ctx) => {
      ctx.moveTo(8, 18);
      ctx.lineTo(32, 18);
      ctx.quadraticCurveTo(31, 31, 20, 31);
      ctx.quadraticCurveTo(9, 31, 8, 18);
    },
    hgrad(p, 8, 32, '#ffffff', 0.2, -0.15),
  );
  // purple floral rim pattern
  for (let x = 11; x <= 29; x += 4.5) p.circle(x, 23, 1.1, '#b48ee6', null);
  p.ellipse(20, 18, 12, 3.2, '#ffffff');
  p.ellipse(20, 18.2, 10.5, 2.5, '#d7a85a', null);
  // lavender sprig leaning in the cup
  p.line([{ x: 15, y: 18 }, { x: 10, y: 3 }], '#6a9a4a', 1);
  for (let i = 0; i < 5; i++) {
    const t = i / 5;
    const x = 10 + t * 2.6;
    const y = 3 + t * 8;
    p.ellipse(x - 1.4, y, 1.4, 1.9, '#9b6fd6', shade('#9b6fd6', -0.4), -0.5);
    p.ellipse(x + 1.4, y + 0.8, 1.4, 1.9, '#b48ee6', shade('#9b6fd6', -0.4), 0.5);
  }
  p.ellipse(9.8, 1.8, 1, 1.5, '#c9a6ee', null);
  // honey drop + steam
  p.circle(27, 16.2, 1.4, '#f5a623', null);
  p.curve({ x: 22, y: 13 }, { x: 20, y: 9 }, { x: 23, y: 5 }, 'rgba(255,255,255,0.85)', 1.4);
}

const GOOD_ART: Record<string, (p: Pen) => void> = {
  flour,
  cornmeal,
  rice_flour: riceFlour,
  bread,
  blueberry_muffin: muffin,
  cornbread,
  pumpkin_pie: pumpkinPie,
  butter,
  cheese,
  ice_cream: iceCream,
  goat_cheese: goatCheese,
  strawberry_jam: strawberryJam,
  apple_jam: appleJam,
  cherry_jam: cherryJam,
  marmalade,
  cranberry_sauce: cranberrySauce,
  yarn,
  sweater,
  cotton_cloth: cottonCloth,
  quilt,
  lemonade,
  veggie_juice: veggieJuice,
  grape_juice: grapeJuice,
  smoothie,
  latte,
  pancakes,
  truffle_pasta: trufflePasta,
  lavender_tea: lavenderTea,
};

function fallbackGood(id: string): (p: Pen) => void {
  const r = rng(id);
  const col = mix('#f2c879', ['#f28b9b', '#8cc0e6', '#9ad27a'][Math.floor(r() * 3)], 0.5);
  return (p) => {
    base(p);
    p.roundRect(9, 10, 22, 24, 5, hgrad(p, 9, 31, col));
    p.text(id.charAt(0).toUpperCase(), 20, 22, 12, shade(col, -0.5));
  };
}

const EYE = '#2b1b12';

/**
 * A tiny kawaii face centred on (x, y): two dark dot eyes with a glint, pink
 * blush and a small smile. `k` is half the gap between the eyes in px.
 */
function face(p: Pen, x: number, y: number, k: number): void {
  for (const sx of [-1, 1]) {
    const ex = x + sx * k;
    const ey = y - k * 0.2;
    p.ellipse(ex, ey, k * 0.36, k * 0.5, EYE, null);
    if (k >= 1.6) p.circle(ex - k * 0.14, ey - k * 0.22, k * 0.14, '#ffffff', null);
    p.ellipse(x + sx * k * 1.6, y + k * 0.45, k * 0.42, k * 0.26, 'rgba(255,110,140,0.75)', null);
  }
  const lw = Math.max(0.45, k * 0.22);
  p.curve({ x: x - k * 0.55, y: y + k * 0.5 }, { x, y: y + k * 1.2 }, { x: x + k * 0.55, y: y + k * 0.5 }, EYE, lw);
}

/** Paints `art`, then the item's face if it has one. */
function withFace(art: (p: Pen) => void, f: [number, number, number] | undefined): (p: Pen) => void {
  return (p) => {
    art(p);
    if (f) {
      const [x, y, k] = f;
      p.glow(x - k, y - k * 1.2, k * 2.4, '#ffffff', 0.3); // soft highlight on the body, as on the crops
      face(p, x, y, k);
    }
  };
}

/** Where each crafted good's face sits, as [x, y, k] (k = half the eye gap in px). */
const GOOD_FACE: Record<string, [number, number, number]> = {
  flour: [20, 31.5, 2],
  cornmeal: [20, 31.5, 2],
  rice_flour: [20, 31.5, 2],
  bread: [20, 25, 2.8],
  blueberry_muffin: [20, 28, 2.4],
  cornbread: [19, 25.5, 2],
  pumpkin_pie: [20, 26.5, 2.4],
  butter: [13.5, 24.5, 1.8],
  cheese: [18, 21.5, 2.2],
  ice_cream: [20, 15.5, 2.4],
  goat_cheese: [17, 24.5, 2.2],
  strawberry_jam: [20, 17.6, 2],
  apple_jam: [20, 17.6, 2],
  cherry_jam: [20, 17.6, 2],
  marmalade: [20, 20.6, 2],
  cranberry_sauce: [20, 30.5, 2],
  yarn: [20, 21.5, 2.6],
  sweater: [20, 28, 2],
  cotton_cloth: [15.5, 19.5, 2.2],
  quilt: [19, 16.5, 2.4],
  lemonade: [19.5, 30, 2.4],
  veggie_juice: [20, 26, 2.4],
  grape_juice: [20, 17.5, 2.3],
  smoothie: [20, 19, 2.4],
  latte: [20, 24.5, 2.3],
  pancakes: [20, 23.5, 2.1],
  truffle_pasta: [20, 29.8, 2],
  lavender_tea: [20, 26.5, 2.2],
};

// ---------------------------------------------------------------------------
// UI icons

function coin(p: Pen): void {
  p.shadow(20, 36, 13, 3, 0.25);
  p.circle(20, 21, 15.5, '#c98a1a');
  p.circle(20, 19.5, 15, p.vgrad(5, 34, '#ffe27a', '#f0a91e'));
  p.circle(20, 19.5, 11.5, null, shade('#f0a91e', -0.15));
  p.circle(20, 19.5, 11, '#ffd34a', null);
  // embossed sprout
  const emb = shade('#f0a91e', -0.28);
  p.line([{ x: 20, y: 27 }, { x: 20, y: 17 }], emb, 2);
  p.ellipse(16, 15.5, 4.2, 2.2, emb, null, -0.5);
  p.ellipse(24, 14, 4.6, 2.4, emb, null, 0.6);
  p.ellipse(15.6, 14.8, 3.3, 1.4, '#ffe9a0', null, -0.5);
  p.ellipse(23.6, 13.2, 3.6, 1.5, '#ffe9a0', null, 0.6);
  p.line([{ x: 19.4, y: 26 }, { x: 19.4, y: 18 }], '#ffe9a0', 0.8);
  p.ellipse(13, 10, 3, 1.5, 'rgba(255,255,255,0.75)', null, -0.7);
  sparkle(p, 32, 7, 3);
}

function xp(p: Pen): void {
  p.shadow(20, 36, 12, 3, 0.25);
  const ctx = p.ctx;
  // rounded star
  ctx.save();
  ctx.lineJoin = 'round';
  const pts: { x: number; y: number }[] = [];
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
    const rr = i % 2 === 0 ? 17 : 8;
    pts.push({ x: 20 + Math.cos(a) * rr, y: 21 + Math.sin(a) * rr });
  }
  p.poly(pts, p.outline, p.outline, 4);
  p.poly(pts, p.vgrad(4, 36, '#7ff0e0', '#22a6b8'), null);
  ctx.restore();
  // inner star highlight
  p.star(20, 21, 9, 'rgba(255,255,255,0.28)', null);
  p.ellipse(15.5, 15, 3, 1.5, 'rgba(255,255,255,0.8)', null, -0.6);
  p.circle(17, 21, 1.4, INK, null);
  p.circle(23, 21, 1.4, INK, null);
  p.curve({ x: 18.5, y: 24 }, { x: 20, y: 25.5 }, { x: 21.5, y: 24 }, INK, 1);
  sparkle(p, 33, 6, 3);
}

function charm(p: Pen): void {
  p.shadow(20, 36, 12, 3, 0.25);
  p.heart(20, 21, 15, p.vgrad(6, 36, '#ffa3c4', '#e8457a'));
  p.ellipse(13, 15, 3.4, 2, 'rgba(255,255,255,0.75)', null, -0.7);
  p.heart(20, 22, 6, 'rgba(255,255,255,0.25)', null);
  sparkle(p, 31, 7, 4.5, '#fff6c2');
  sparkle(p, 36, 15, 2.2, '#ffffff');
  sparkle(p, 6, 30, 2, '#ffffff');
}

function level(p: Pen): void {
  p.shadow(20, 37, 10, 2.5, 0.25);
  // tails
  p.poly(
    [
      { x: 13, y: 22 },
      { x: 9, y: 37 },
      { x: 13, y: 35 },
      { x: 16, y: 38 },
      { x: 19, y: 24 },
    ],
    '#4a8fd0',
  );
  p.poly(
    [
      { x: 27, y: 22 },
      { x: 31, y: 37 },
      { x: 27, y: 35 },
      { x: 24, y: 38 },
      { x: 21, y: 24 },
    ],
    '#3a78b8',
  );
  // rosette petals
  const n = 12;
  const pts: { x: number; y: number }[] = [];
  for (let i = 0; i < n * 2; i++) {
    const a = (i / (n * 2)) * Math.PI * 2;
    const rr = i % 2 === 0 ? 14 : 11.5;
    pts.push({ x: 20 + Math.cos(a) * rr, y: 16 + Math.sin(a) * rr });
  }
  p.poly(pts, '#ffcc3a');
  p.circle(20, 16, 10, '#e89b1a', null);
  p.circle(20, 16, 9, p.vgrad(7, 25, '#ffe58a', '#f5b22a'));
  p.star(20, 16.5, 5.5, '#fff6d0', shade('#e89b1a', -0.2));
  p.ellipse(15, 10.5, 2.5, 1.2, 'rgba(255,255,255,0.7)', null, -0.6);
}

const UI_ART: Record<string, (p: Pen) => void> = { coin, xp, charm, level };

export const icons: IconSpec[] = [
  ...ITEM_LIST.filter((i) => i.category === 'good').map((i) => ({
    key: `icon:${i.id}`,
    paint: withFace(GOOD_ART[i.id] ?? fallbackGood(i.id), GOOD_FACE[i.id]),
  })),
  ...Object.entries(UI_ART).map(([k, paint]) => ({ key: `icon:${k}`, paint })),
];
