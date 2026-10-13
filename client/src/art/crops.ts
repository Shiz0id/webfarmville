// Crops: three growth stages per crop, a generic withered patch, and produce icons.
//
// Crop sprites sit on top of a separately drawn plowed-soil tile, so they only
// paint plants. Plants are laid out at footprint-local (u, v) spots and drawn
// back-to-front (ascending u + v) so nearer plants overlap farther ones.
import { type IconSpec, type SpriteSpec, type Pen, type Pt, OUTLINE, shade, rng, mix } from './kit';
import { CROP_LIST, type CropDef } from '@farm/shared';

const UP = -Math.PI / 2;

// ---------------------------------------------------------------------------
// Small drawing helpers

function finish(p: Pen, fill: string | CanvasGradient | null, stroke: string | null = p.outline, w = p.lineWidth): void {
  const ctx = p.ctx;
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = w;
    ctx.stroke();
  }
}

/**
 * A pointed leaf from (x, y) heading along `ang` for `len` px. `w` is the
 * bulge (about twice the half-width); `droop` pulls the tip down.
 */
function leaf(p: Pen, x: number, y: number, len: number, ang: number, w: number, color: string, droop = 0, stroke: string | null = p.outline): void {
  const dx = Math.cos(ang);
  const dy = Math.sin(ang);
  const tx = x + dx * len;
  const ty = y + dy * len + droop;
  const cx = x + dx * len * 0.55;
  const cy = y + dy * len * 0.55;
  const ch = Math.hypot(tx - x, ty - y) || 1;
  const nx = (-(ty - y) / ch) * w;
  const ny = ((tx - x) / ch) * w;
  const ctx = p.ctx;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.quadraticCurveTo(cx + nx, cy + ny, tx, ty);
  ctx.quadraticCurveTo(cx - nx, cy - ny, x, y);
  ctx.closePath();
  finish(p, color, stroke);
  if (len > 6) p.curve({ x, y }, { x: cx, y: cy }, { x: x + (tx - x) * 0.8, y: y + (ty - y) * 0.8 }, shade(color, -0.22), 0.5);
}

/** An outlined stem: a thick dark stroke under a coloured one. */
function stem(p: Pen, a: Pt, c: Pt, b: Pt, color: string, w = 1.2): void {
  p.curve(a, c, b, p.outline, w + 1.2);
  p.curve(a, c, b, color, w);
}

/** Run fn with a thinner outline (keeps tiny shapes from turning into ink blobs). */
function thin(p: Pen, w: number, fn: () => void): void {
  const old = p.lineWidth;
  p.lineWidth = w;
  fn();
  p.lineWidth = old;
}

/** A small five-petal blossom with a merged outline (clean at 1-2 px). */
function blossom(p: Pen, x: number, y: number, r: number, petal: string, center: string): void {
  const pts = [0, 1, 2, 3, 4].map((i) => {
    const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
    return { x: x + Math.cos(a) * r * 0.55, y: y + Math.sin(a) * r * 0.55 };
  });
  for (const q of pts) p.circle(q.x, q.y, r * 0.5 + 0.6, p.outline, null);
  for (const q of pts) p.circle(q.x, q.y, r * 0.5, petal, null);
  p.circle(x, y, r * 0.32, center, null);
}

/** A three-lobed leaf (strawberry / clover style) with one merged outline. */
function trifoliate(p: Pen, x: number, y: number, s: number, color: string): void {
  const lobes = [
    [-0.8, 0.1],
    [0.8, 0.1],
    [0, -0.75],
  ];
  for (const [dx, dy] of lobes) p.circle(x + dx * s, y + dy * s, s * 0.78 + 0.8, p.outline, null);
  lobes.forEach(([dx, dy], i) => p.circle(x + dx * s, y + dy * s, s * 0.78, i === 2 ? shade(color, 0.1) : color, null));
  p.circle(x - s * 0.25, y - s * 0.95, s * 0.28, shade(color, 0.3), null);
}

function up(x: number, y: number, h: number, lean = 0): Pt {
  return { x: x + lean, y: y - h };
}

interface Spot extends Pt {
  u: number;
  v: number;
  i: number;
}

function spots(p: Pen, pts: [number, number][]): Spot[] {
  return pts
    .slice()
    .sort((a, b) => a[0] + a[1] - (b[0] + b[1]) || a[0] - a[1] - (b[0] - b[1]))
    .map(([u, v], i) => ({ u, v, i, ...p.iso(u, v) }));
}

function grid(n: number, lo = 0.22, hi = 0.78): [number, number][] {
  const out: [number, number][] = [];
  for (let i = 0; i < n; i++)
    for (let j = 0; j < n; j++) out.push([lo + ((hi - lo) * i) / (n - 1), lo + ((hi - lo) * j) / (n - 1)]);
  return out;
}

const QUINCUNX: [number, number][] = [
  [0.27, 0.27],
  [0.73, 0.27],
  [0.5, 0.5],
  [0.27, 0.73],
  [0.73, 0.73],
];

function groundShadow(p: Pen, s: Pt, r: number): void {
  p.shadow(s.x, s.y, r, r * 0.45, 0.28);
}

/** Strawberry-ish teardrop (point at the bottom). */
function berryShape(p: Pen, x: number, y: number, r: number, fill: string | CanvasGradient, stroke: string | null = p.outline): void {
  const ctx = p.ctx;
  ctx.beginPath();
  ctx.moveTo(x, y + r * 1.3);
  ctx.bezierCurveTo(x - r * 1.6, y + r * 0.2, x - r * 1.1, y - r * 1.05, x, y - r * 0.75);
  ctx.bezierCurveTo(x + r * 1.1, y - r * 1.05, x + r * 1.6, y + r * 0.2, x, y + r * 1.3);
  ctx.closePath();
  finish(p, fill, stroke);
}

function radial(p: Pen, x: number, y: number, r: number, color: string): CanvasGradient {
  const g = p.ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r * 1.2);
  g.addColorStop(0, shade(color, 0.35));
  g.addColorStop(0.6, color);
  g.addColorStop(1, shade(color, -0.25));
  return g;
}

/** Tiny shiny berry with a highlight dot (works at 1-2 px radius). */
function bead(p: Pen, x: number, y: number, r: number, color: string, hi = shade(color, 0.55)): void {
  p.circle(x, y, r, color, p.outline);
  p.circle(x - r * 0.35, y - r * 0.35, r * 0.38, hi, null);
}

/** A rounded leaf mound (a small, quieter cousin of pen.foliage). */
function mound(p: Pen, x: number, y: number, r: number, color: string, seed: number): void {
  const rand = rng(seed);
  const puffs: [number, number, number][] = [];
  for (let i = 0; i < 5; i++) {
    const a = Math.PI + (i / 4) * Math.PI;
    puffs.push([x + Math.cos(a) * r * 0.55, y + Math.sin(a) * r * 0.45 + r * 0.1, r * (0.5 + rand() * 0.12)]);
  }
  for (const [px, py, pr] of puffs) p.circle(px, py, pr + 1, p.outline, null);
  p.ellipse(x, y, r + 1, r * 0.75 + 1, p.outline, null);
  for (const [px, py, pr] of puffs) p.circle(px, py, pr, shade(color, -0.1), null);
  p.ellipse(x, y, r, r * 0.75, color, null);
  p.circle(x - r * 0.3, y - r * 0.35, r * 0.35, shade(color, 0.18), null);
}

// ---------------------------------------------------------------------------
// Kawaii helpers: faces, glossy streaks and the fresher palette for young plants

const EYE = '#2b1b12';

/**
 * A tiny kawaii face centred on (x, y): two dark dot eyes with a glint, pink
 * blush and a small smile. `k` is half the gap between the eyes in px. `sad`
 * swaps the smile for a little frown and drops the blush.
 */
function face(p: Pen, x: number, y: number, k: number, sad = false): void {
  for (const sx of [-1, 1]) {
    const ex = x + sx * k;
    const ey = y - k * 0.2;
    p.ellipse(ex, ey, k * 0.36, k * 0.5, EYE, null);
    if (!sad && k >= 1.6) p.circle(ex - k * 0.14, ey - k * 0.22, k * 0.14, '#ffffff', null);
    if (!sad) p.ellipse(x + sx * k * 1.6, y + k * 0.45, k * 0.42, k * 0.26, 'rgba(255,110,140,0.75)', null);
  }
  const lw = Math.max(0.45, k * 0.22);
  if (sad) p.curve({ x: x - k * 0.55, y: y + k }, { x, y: y + k * 0.1 }, { x: x + k * 0.55, y: y + k }, EYE, lw);
  else p.curve({ x: x - k * 0.55, y: y + k * 0.5 }, { x, y: y + k * 1.2 }, { x: x + k * 0.55, y: y + k * 0.5 }, EYE, lw);
}

/** A soft glossy streak on a round body (x, y = centre, r = radius). */
function gloss(p: Pen, x: number, y: number, r: number): void {
  p.ellipse(x - r * 0.4, y - r * 0.45, r * 0.3, r * 0.17, 'rgba(255,255,255,0.8)', null, -0.7);
}

/** A slightly lighter, fresher palette for growing plants. */
function young(c: CropDef): CropDef {
  return { ...c, colors: [shade(c.colors[0], 0.12), c.colors[1], c.colors[2]] };
}

// ---------------------------------------------------------------------------
// Stage 0: a sprout patch of plump round seed-leaves, tinted per crop

function sprout(p: Pen, c: CropDef): void {
  thin(p, 0.6, () => sproutInner(p, c));
}

function sproutInner(p: Pen, c: CropDef): void {
  const leafCol = mix(c.colors[0], '#c4f08a', 0.5);
  const stemCol = shade(c.colors[0], -0.1);
  spots(p, grid(3, 0.24, 0.76)).forEach((s, k) => {
    groundShadow(p, s, 3.6);
    p.line([{ x: s.x, y: s.y }, { x: s.x, y: s.y - 3 }], stemCol, 0.8);
    for (const sx of [-1, 1]) {
      const cx = s.x + sx * 2;
      const cy = s.y - 4;
      p.ellipse(cx, cy, 2.5, 2, leafCol, p.outline, sx * 0.35);
      p.circle(cx - 0.7, cy - 0.7, 0.6, shade(leafCol, 0.5), null);
    }
    if (k % 3 === 0) {
      // a tiny dew sparkle
      p.circle(s.x + 3.4, s.y - 6.4, 1.5, 'rgba(255,255,255,0.35)', null);
      p.circle(s.x + 3.4, s.y - 6.4, 0.6, '#ffffff', null);
    }
  });
}

// ---------------------------------------------------------------------------
// Per-crop painters for stages 1 and 2

type Painter = (p: Pen, stage: 1 | 2, c: CropDef) => void;

const strawberry: Painter = (p, stage, c) => {
  const [plant, fruit, accent] = c.colors;
  const pts = spots(p, QUINCUNX);
  for (const s of pts) {
    const front = s.i === pts.length - 1;
    const r = stage === 1 ? 5 : 6;
    const ls = stage === 1 ? 1.7 : 1.9;
    groundShadow(p, s, r + 2.5);
    const leaves: [number, number][] = [
      [-0.55, -1.1],
      [0.55, -1.1],
      [0, -1.5],
      [-0.95, -0.35],
      [0.95, -0.35],
      [0, -0.55],
    ];
    leaves.forEach(([dx, dy], i) => {
      const lx = s.x + dx * r;
      const ly = s.y + dy * r * 0.7 - 1;
      p.line([{ x: s.x, y: s.y - 0.5 }, { x: lx, y: ly }], shade(plant, -0.2), 0.7);
      trifoliate(p, lx, ly, ls, i % 2 ? plant : shade(plant, 0.08));
    });
    if (stage === 1) {
      blossom(p, s.x + 2, s.y - r * 0.9, 2.2, '#ffffff', accent);
    } else {
      blossom(p, s.x - 1, s.y - r * 1.25, 2, '#ffffff', accent);
      const berries: [number, number, number][] = [
        [-4, 1, 2.7],
        [3.8, 1.2, 2.7],
        [0, 3, 3.4],
      ];
      berries.forEach(([dx, dy, br], bi) => {
        const bx = s.x + dx;
        const by = s.y + dy;
        berryShape(p, bx, by, br, radial(p, bx, by, br * 1.15, fruit));
        if (front && bi === 2) {
          // the hero berry on the front plant smiles
          face(p, bx, by + 0.4, 1.2);
        } else {
          p.circle(bx - 0.6, by, 0.35, accent, null);
          p.circle(bx + 0.7, by + 0.6, 0.35, accent, null);
          p.circle(bx, by + 1.5, 0.35, accent, null);
        }
        gloss(p, bx, by - 0.3, br);
        thin(p, 0.6, () => {
          leaf(p, bx, by - 1.5, 2.2, UP - 1.0, 1.6, plant);
          leaf(p, bx, by - 1.5, 2.2, UP + 1.0, 1.6, plant);
        });
      });
    }
  }
};

function grainHead(p: Pen, x: number, y: number, ang: number, len: number, col: string, accent: string): void {
  const cx = x + Math.cos(ang) * len * 0.5;
  const cy = y + Math.sin(ang) * len * 0.5;
  p.ellipse(cx, cy, 1.9, len / 2, radial(p, cx, cy, len / 2, col), p.outline, ang + Math.PI / 2);
  for (let k = 1; k < 4; k++) {
    const t = k / 4;
    const mx = x + Math.cos(ang) * len * t;
    const my = y + Math.sin(ang) * len * t;
    p.line([{ x: mx - 1.2, y: my + 0.6 }, { x: mx, y: my - 0.4 }, { x: mx + 1.2, y: my + 0.6 }], accent, 0.5);
  }
  const tx = x + Math.cos(ang) * len;
  const ty = y + Math.sin(ang) * len;
  p.line([{ x: tx, y: ty }, { x: tx - 1.5, y: ty - 3 }], shade(col, -0.2), 0.5);
  p.line([{ x: tx, y: ty }, { x: tx + 1.5, y: ty - 3 }], shade(col, -0.2), 0.5);
}

const wheat: Painter = (p, stage, c) => {
  const [plant, grain, accent] = c.colors;
  const rand = rng('wheat' + stage);
  for (const s of spots(p, grid(3, 0.2, 0.8))) {
    groundShadow(p, s, 5);
    if (stage === 1) {
      thin(p, 0.7, () => {
        for (let k = 0; k < 4; k++) {
          const a = UP + (k - 1.5) * 0.28 + (rand() - 0.5) * 0.15;
          leaf(p, s.x + (k - 1.5), s.y, 10 + rand() * 4, a, 2.6, k % 2 ? plant : shade(plant, 0.12), 1);
        }
      });
    } else {
      const stalk = mix(grain, plant, 0.25);
      leaf(p, s.x, s.y, 8, UP - 0.6, 2, mix(plant, grain, 0.5), 2);
      leaf(p, s.x, s.y, 8, UP + 0.6, 2, mix(plant, grain, 0.4), 2);
      for (let k = 0; k < 3; k++) {
        const lean = (k - 1) * 3 + (rand() - 0.5) * 1.5;
        const h = 15 + rand() * 4 - Math.abs(k - 1) * 2;
        const top = up(s.x + (k - 1), s.y, h, lean);
        stem(p, { x: s.x + (k - 1) * 0.6, y: s.y }, up(s.x, s.y, h * 0.5, lean * 0.3), top, stalk, 0.8);
        grainHead(p, top.x, top.y, UP + lean * 0.06, 8, grain, accent);
      }
    }
  }
};

const carrot: Painter = (p, stage, c) => {
  const [plant, root, deep] = c.colors;
  const frond = shade(plant, 0.12);
  const pts = spots(p, grid(3, 0.22, 0.78));
  for (const s of pts) {
    const front = s.i === pts.length - 1;
    groundShadow(p, s, 4.5);
    const len = stage === 1 ? 7 : 9;
    if (stage === 2) {
      // fat orange shoulders poking out of the soil
      const rx = front ? 4.4 : 3.8;
      p.ellipse(s.x, s.y - 1, rx, rx * 0.78, radial(p, s.x, s.y - 1.5, rx, root));
      p.line([{ x: s.x - 2.4, y: s.y - 0.2 }, { x: s.x - 0.9, y: s.y + 0.3 }], shade(root, -0.3), 0.6);
      p.line([{ x: s.x + 0.9, y: s.y - 0.6 }, { x: s.x + 2.4, y: s.y - 0.4 }], shade(root, -0.3), 0.6);
      p.ellipse(s.x - 1.5, s.y - 2.2, 1.2, 0.45, 'rgba(255,255,255,0.7)', null, -0.3);
    }
    const base = { x: s.x, y: s.y - (stage === 2 ? 3 : 0) };
    const angs = stage === 1 ? [-0.45, 0.05, 0.5] : [-0.6, -0.2, 0.2, 0.6];
    thin(p, 0.6, () =>
      angs.forEach((da, k) => {
        const a = UP + da;
        const tip = { x: base.x + Math.cos(a) * len, y: base.y + Math.sin(a) * len };
        p.line([base, tip], shade(deep, -0.1), 0.9);
        // feathery leaflets
        for (const t of [0.55, 0.85]) {
          const lx = base.x + Math.cos(a) * len * t;
          const ly = base.y + Math.sin(a) * len * t;
          const col = k % 2 ? frond : plant;
          leaf(p, lx, ly, 2.8, a - 1.0, 2.4, col);
          leaf(p, lx, ly, 2.8, a + 1.0, 2.4, col);
        }
        p.ellipse(tip.x, tip.y, 1.2, 1.8, shade(frond, 0.08), p.outline, a + Math.PI / 2);
      }),
    );
    // the visible carrot top gets a face, drawn over the fronds
    if (stage === 2 && front) face(p, s.x, s.y - 1.1, 1.3);
  }
};

const tomato: Painter = (p, stage, c) => {
  const [plant, fruit, accent] = c.colors;
  const pts = spots(p, grid(2, 0.3, 0.7));
  for (const s of pts) {
    const front = s.i === pts.length - 1;
    groundShadow(p, s, 8);
    const stakeH = stage === 1 ? 18 : 26;
    p.rect(s.x + 3.5, s.y - stakeH, 1.8, stakeH + 1, '#b9875a');
    stem(p, s, up(s.x, s.y, 6, -1), up(s.x, s.y, stage === 1 ? 10 : 18), shade(plant, -0.1), 1.2);
    if (stage === 1) {
      p.foliage(s.x, s.y - 10, 6.8, plant, s.i + 3, 6);
      blossom(p, s.x - 3, s.y - 12, 2.2, accent, '#e08a20');
      blossom(p, s.x + 2.5, s.y - 7, 2, accent, '#e08a20');
      p.ball(s.x - 1, s.y - 5, 1.8, '#8cc152');
    } else {
      p.foliage(s.x + 0.5, s.y - 19, 5.8, shade(plant, 0.05), s.i + 11, 6);
      p.foliage(s.x, s.y - 9, 7.8, plant, s.i + 3, 7);
      p.line([{ x: s.x + 2.5, y: s.y - 15 }, { x: s.x + 5.5, y: s.y - 14 }], '#f2e3c4', 0.8);
      const tomatoes: [number, number, number][] = [
        [-4, -6, 3.1],
        [3, -10, 2.9],
        [-1.5, -14, 2.7],
        [4, -3.5, 2.9],
        [-3, -20, 2.5],
        [0.5, -5, 3.3],
      ];
      tomatoes.forEach(([dx, dy, r], ti) => {
        const tx = s.x + dx;
        const ty = s.y + dy;
        p.ball(tx, ty, r, fruit);
        gloss(p, tx, ty, r);
        p.star(tx, ty - r * 0.75, 1.4, shade(plant, -0.05), null);
        // the front plant's big centre tomato is the smiling one
        if (front && ti === 5) face(p, tx, ty + 0.4, 1.2);
      });
    }
  }
};

function leafyMound(p: Pen, x: number, y: number, r: number, color: string, seed: number): void {
  mound(p, x, y, r, color, seed);
  thin(p, 0.6, () => {
    for (const [dx, dy, a] of [
      [-0.45, -0.25, -2.4],
      [0.4, -0.35, -0.7],
      [0, -0.6, UP],
    ])
      leaf(p, x + dx * r, y + dy * r, r * 0.55, a, r * 0.45, shade(color, 0.12));
  });
}

const potato: Painter = (p, stage, c) => {
  const [plant, tuber, flower] = c.colors;
  const pts = spots(p, QUINCUNX);
  for (const s of pts) {
    const front = s.i === pts.length - 1;
    groundShadow(p, s, 7);
    if (stage === 1) {
      leafyMound(p, s.x, s.y - 4, 5.4, plant, s.i + 1);
    } else {
      // tubers peeking out at the base
      for (const [dx, dy, rx] of [
        [-4.5, 0.5, 3.2],
        [3.5, 1.5, 2.9],
      ]) {
        p.ellipse(s.x + dx, s.y + dy, rx, rx * 0.72, radial(p, s.x + dx, s.y + dy, rx, tuber));
        p.circle(s.x + dx - 0.8, s.y + dy - 0.2, 0.35, shade(tuber, -0.45), null);
        p.circle(s.x + dx + 0.9, s.y + dy + 0.4, 0.35, shade(tuber, -0.45), null);
      }
      leafyMound(p, s.x, s.y - 6, 6.8, plant, s.i + 1);
      for (const [dx, dy] of [
        [-3, -11],
        [2.5, -12.5],
        [4.5, -7.5],
      ])
        blossom(p, s.x + dx, s.y + dy, 2.2, flower, '#f2c94c');
      // one tuber rolled out in front; the front plant's one smiles
      const tx = s.x + 0.5;
      const ty = s.y + 2.6;
      const trx = front ? 3.6 : 2.6;
      p.ellipse(tx, ty, trx, trx * 0.72, radial(p, tx, ty, trx, tuber));
      p.ellipse(tx - trx * 0.45, ty - trx * 0.3, trx * 0.35, trx * 0.14, 'rgba(255,255,255,0.7)', null, -0.3);
      if (front) face(p, tx, ty + 0.2, 1.0);
    }
  }
};

function cornEar(p: Pen, x: number, y: number, ang: number, kernel: string, husk: string): void {
  const len = 12.5;
  const cx = x + Math.cos(ang) * len * 0.55;
  const cy = y + Math.sin(ang) * len * 0.55;
  leaf(p, x, y, 9, ang + 0.45, 3.5, shade(husk, -0.1));
  p.ellipse(cx, cy, 3.2, len / 2, radial(p, cx, cy, 4.5, kernel), p.outline, ang + Math.PI / 2);
  // glossy streak down the cob, on the lit side
  const nx = Math.sin(ang) * 1.5;
  const ny = -Math.cos(ang) * 1.5;
  p.line(
    [
      { x: cx - Math.cos(ang) * 4 + nx, y: cy - Math.sin(ang) * 4 + ny },
      { x: cx + Math.cos(ang) * 2.5 + nx, y: cy + Math.sin(ang) * 2.5 + ny },
    ],
    'rgba(255,255,255,0.6)',
    0.9,
  );
  for (let k = 1; k < 5; k++) {
    const mx = x + Math.cos(ang) * len * (0.2 + k * 0.17);
    const my = y + Math.sin(ang) * len * (0.2 + k * 0.17);
    p.circle(mx - 0.9, my + 0.4, 0.45, shade(kernel, -0.3), null);
    p.circle(mx + 0.9, my - 0.2, 0.45, shade(kernel, -0.3), null);
  }
  leaf(p, x, y, 8, ang - 0.4, 3.5, husk);
  const tx = x + Math.cos(ang) * (len + 0.5);
  const ty = y + Math.sin(ang) * (len + 0.5);
  p.line([{ x: tx, y: ty }, { x: tx + 1.5, y: ty - 2.5 }], '#b5652d', 0.8);
  p.line([{ x: tx, y: ty }, { x: tx + 2.8, y: ty - 1 }], '#b5652d', 0.8);
}

const corn: Painter = (p, stage, c) => {
  const [plant, kernel, husk] = c.colors;
  const pos: [number, number][] = [
    [0.28, 0.28],
    [0.72, 0.28],
    [0.28, 0.72],
    [0.72, 0.72],
  ];
  for (const s of spots(p, pos)) {
    groundShadow(p, s, 6);
    const h = stage === 1 ? 20 : 36;
    const top = up(s.x, s.y, h, 0.5);
    stem(p, s, up(s.x, s.y, h / 2), top, shade(plant, -0.05), stage === 1 ? 1.8 : 2.4);
    const n = stage === 1 ? 4 : 6;
    for (let k = 0; k < n; k++) {
      const z = 3 + (k * (h - 6)) / n;
      const side = k % 2 ? 1 : -1;
      const L = stage === 1 ? 10 - k : 13 - k;
      leaf(p, s.x, s.y - z, L, side > 0 ? -0.55 : Math.PI + 0.55, 3, k % 2 ? plant : shade(plant, 0.1), 7);
    }
    if (stage === 2) {
      cornEar(p, s.x + 1, s.y - 13, -1.0, kernel, husk);
      // tassel
      for (const d of [-0.6, -0.25, 0.1, 0.45]) {
        p.line([top, { x: top.x + Math.sin(d) * 6, y: top.y - Math.cos(d) * 5 + 1 }], '#c7a24a', 0.9);
      }
    } else {
      leaf(p, top.x, top.y + 2, 5, UP, 2.2, shade(plant, 0.15));
    }
  }
};

const blueberry: Painter = (p, stage, c) => {
  const [plant, berry, accent] = c.colors;
  const pts = spots(p, QUINCUNX);
  for (const s of pts) {
    const front = s.i === pts.length - 1;
    groundShadow(p, s, 8);
    const r = stage === 1 ? 6.2 : 7.6;
    stem(p, s, up(s.x, s.y, 2), up(s.x, s.y, 4), '#7a5a3a', 1.2);
    p.foliage(s.x, s.y - r - 1, r, stage === 1 ? shade(plant, 0.1) : plant, s.i + 21, 7);
    if (stage === 1) {
      p.circle(s.x - 2, s.y - r - 2, 0.9, '#f4f0ff', null);
      p.circle(s.x + 2.5, s.y - r, 0.9, '#f4f0ff', null);
    } else {
      const rand = rng(s.i + 5);
      for (let k = 0; k < 8; k++) {
        const a = rand() * Math.PI * 2;
        const d = r * (0.25 + rand() * 0.55);
        bead(p, s.x + Math.cos(a) * d, s.y - r - 1 + Math.sin(a) * d * 0.8 + 1, 2, k % 3 === 0 ? shade(berry, -0.15) : berry, accent);
      }
      if (front) {
        // one big glossy berry in front of the front bush, with a face
        const hx = s.x + 0.5;
        const hy = s.y - 3.2;
        p.circle(hx, hy, 4.4, radial(p, hx, hy, 4.4, berry));
        gloss(p, hx, hy, 4.4);
        face(p, hx, hy + 0.5, 1.2);
      }
    }
  }
};

function lobedLeaf(p: Pen, x: number, y: number, r: number, color: string): void {
  for (const [dx, dy] of [
    [-0.6, 0.1],
    [0.6, 0.1],
    [0, -0.45],
  ])
    p.circle(x + dx * r, y + dy * r, r * 0.7 + 1, p.outline, null);
  for (const [dx, dy] of [
    [-0.6, 0.1],
    [0.6, 0.1],
    [0, -0.45],
  ])
    p.circle(x + dx * r, y + dy * r, r * 0.7, color, null);
  p.line([{ x, y: y + r * 0.3 }, { x, y: y - r * 0.6 }], shade(color, -0.25), 0.5);
}

function vines(p: Pen, plant: string, seed: string, flowers: string | null): void {
  const rand = rng(seed);
  p.curve(p.iso(0.2, 0.3), p.iso(0.6, 0.1), p.iso(0.8, 0.5), shade(plant, -0.2), 1.2);
  p.curve(p.iso(0.3, 0.8), p.iso(0.5, 0.4), p.iso(0.75, 0.75), shade(plant, -0.2), 1.2);
  const ls = spots(p, [
    [0.2, 0.3],
    [0.45, 0.18],
    [0.8, 0.5],
    [0.3, 0.8],
    [0.55, 0.55],
    [0.78, 0.78],
    [0.2, 0.55],
  ]);
  for (const s of ls) {
    const r = 3.6 + rand() * 1.2;
    lobedLeaf(p, s.x, s.y - r * 0.6, r, s.i % 2 ? plant : shade(plant, 0.1));
    if (flowers && s.i % 3 === 1) p.star(s.x + 3, s.y - 2, 1.8, flowers, shade(flowers, -0.4));
  }
}

function pumpkinShape(p: Pen, x: number, y: number, rw: number, rh: number, col: string, stemCol: string): void {
  p.shadow(x, y + rh * 0.8, rw * 1.1, rh * 0.5, 0.35);
  p.ellipse(x - rw * 0.42, y, rw * 0.58, rh, radial(p, x - rw * 0.5, y, rw * 0.6, shade(col, -0.08)));
  p.ellipse(x + rw * 0.42, y, rw * 0.58, rh, radial(p, x + rw * 0.3, y, rw * 0.6, shade(col, -0.15)));
  p.ellipse(x, y, rw * 0.5, rh * 1.02, radial(p, x - rw * 0.15, y, rw * 0.6, col));
  p.ellipse(x - rw * 0.15, y - rh * 0.45, rw * 0.14, rh * 0.25, shade(col, 0.45), null);
  p.rect(x - 0.9, y - rh - 2.2, 1.8, 3, stemCol);
}

const pumpkin: Painter = (p, stage, c) => {
  const [plant, fruit] = c.colors;
  vines(p, plant, 'pumpkin', stage === 1 ? '#ffd23f' : null);
  if (stage === 1) {
    const s = p.iso(0.55, 0.45);
    p.ball(s.x, s.y - 2, 2.2, mix(plant, fruit, 0.4));
    return;
  }
  for (const [u, v, rw] of [
    [0.64, 0.3, 8.5],
    [0.32, 0.56, 9.5],
    [0.7, 0.7, 9.5],
  ] as const) {
    const pt = p.iso(u, v);
    const cy = pt.y - rw * 0.65;
    pumpkinShape(p, pt.x, cy, rw, rw * 0.72, fruit, '#6b8a2a');
    // the front pumpkin is the hero
    if (u === 0.7) face(p, pt.x, cy + 1.2, rw * 0.26);
    p.curve({ x: pt.x + 1, y: pt.y - rw * 1.35 }, { x: pt.x + 4, y: pt.y - rw * 1.6 }, { x: pt.x + 3, y: pt.y - rw * 1.1 }, shade(plant, -0.1), 0.7);
  }
};

function sunflowerHead(p: Pen, x: number, y: number, r: number, petal: string, center: string): void {
  const n = 12;
  for (let k = 0; k < n; k++) {
    const a = (k / n) * Math.PI * 2;
    p.ellipse(x + Math.cos(a) * r * 0.75, y + Math.sin(a) * r * 0.68, r * 0.24, r * 0.5, k % 2 ? petal : shade(petal, -0.08), shade(petal, -0.45), a + Math.PI / 2);
  }
  p.ellipse(x, y, r * 0.5, r * 0.46, radial(p, x, y, r * 0.5, center));
  for (let k = 0; k < 6; k++) {
    const a = k * 2.4;
    p.circle(x + Math.cos(a) * r * 0.25, y + Math.sin(a) * r * 0.22, 0.4, shade(center, 0.3), null);
  }
}

const sunflower: Painter = (p, stage, c) => {
  const [plant, petal, center] = c.colors;
  const pos: [number, number, number][] = [
    [0.3, 0.3, 38],
    [0.72, 0.3, 33],
    [0.3, 0.72, 33],
    [0.72, 0.72, 29],
  ];
  const ss = spots(
    p,
    pos.map(([u, v]) => [u, v]),
  );
  for (const s of ss) {
    const full = pos.find(([u, v]) => u === s.u && v === s.v)![2];
    const h = stage === 1 ? full * 0.55 : full;
    groundShadow(p, s, 5);
    const top = up(s.x, s.y, h, 1);
    stem(p, s, up(s.x, s.y, h / 2, -1), top, shade(plant, 0.05), 1.6);
    leaf(p, s.x, s.y - h * 0.3, 7, -0.5, 5, plant, 2);
    leaf(p, s.x, s.y - h * 0.5, 7, Math.PI + 0.5, 5, shade(plant, 0.1), 2);
    if (stage === 2) {
      leaf(p, s.x, s.y - h * 0.72, 5.5, -0.4, 4, plant, 1);
      sunflowerHead(p, top.x, top.y, 7.5, petal, center);
    } else {
      p.ball(top.x, top.y, 2.6, shade(plant, 0.1));
      p.star(top.x, top.y - 0.8, 1.5, petal, null);
    }
  }
};

const cotton: Painter = (p, stage, c) => {
  const [plant, boll, twig] = c.colors;
  for (const s of spots(p, QUINCUNX)) {
    groundShadow(p, s, 7);
    const h = stage === 1 ? 11 : 15;
    const top = up(s.x, s.y, h);
    stem(p, s, up(s.x, s.y, h / 2), top, twig, 1.1);
    const br: [number, number][] = [
      [-5, h * 0.75],
      [5, h * 0.6],
      [-4, h * 0.4],
      [4.5, h * 0.95],
    ];
    for (const [dx, z] of br) stem(p, up(s.x, s.y, z * 0.6), up(s.x + dx * 0.3, s.y, z * 0.8), up(s.x + dx, s.y, z), twig, 0.7);
    const lc = stage === 1 ? plant : mix(plant, twig, 0.25);
    leaf(p, s.x, s.y - h * 0.35, 5, -0.4, 4, lc, 1);
    leaf(p, s.x, s.y - h * 0.5, 5, Math.PI + 0.4, 4, shade(lc, 0.08), 1);
    if (stage === 1) {
      leaf(p, top.x, top.y, 5, UP + 0.6, 4, lc);
      leaf(p, top.x, top.y, 5, UP - 0.6, 4, shade(lc, 0.08));
      p.circle(s.x + 3, s.y - h * 0.7, 1.2, '#f4e1a0', null);
    } else {
      for (const [dx, z] of [...br, [0, h + 1] as [number, number]]) {
        const bx = s.x + dx;
        const by = s.y - z - 1.5;
        p.star(bx, by + 1.6, 1.8, shade(twig, -0.1), null);
        for (const [ox, oy] of [
          [-1.3, 0.3],
          [1.3, 0.3],
          [0, -1],
        ])
          p.circle(bx + ox, by + oy, 2, boll, '#9a8f84');
        p.circle(bx - 0.6, by - 1.3, 0.6, '#ffffff', null);
      }
    }
  }
};

function grapeBunch(p: Pen, x: number, y: number, col: string, hi: string): void {
  const rows = [4, 3, 2, 1];
  rows.forEach((n, ri) => {
    for (let k = 0; k < n; k++) bead(p, x + (k - (n - 1) / 2) * 2.2, y + ri * 2, 1.6, (k + ri) % 2 ? col : shade(col, -0.12), hi);
  });
}

const grape: Painter = (p, stage, c) => {
  const [plant, fruit, accent] = c.colors;
  const wood = '#a8754a';
  const vine = '#7a4f30';
  for (const v of [0.28, 0.74]) {
    const a = p.iso(0.1, v);
    const b = p.iso(0.9, v);
    p.shadow((a.x + b.x) / 2, (a.y + b.y) / 2, 20, 6, 0.2);
    p.rect(a.x - 1.1, a.y - 24, 2.2, 24, wood);
    for (const z of [12, 21]) p.line([p.iso(0.1, v, z), p.iso(0.9, v, z)], '#6b5a4a', 0.7);
    for (const u of [0.3, 0.7]) {
      stem(p, p.iso(u, v), p.iso(u + 0.08, v, 8), p.iso(u - 0.02, v, 13), vine, 1);
      stem(p, p.iso(u - 0.02, v, 13), p.iso(u - 0.1, v, 17), p.iso(u, v, 21), vine, 0.9);
    }
    const leaves = stage === 1 ? [0.22, 0.42, 0.62, 0.8] : [0.16, 0.34, 0.52, 0.7, 0.86];
    leaves.forEach((u, k) => {
      const q = p.iso(u, v, 21);
      if (stage === 1) {
        lobedLeaf(p, q.x, q.y - 1 - (k % 2) * 1.5, 3.2, k % 2 ? plant : shade(plant, 0.1));
        if (k % 2) p.curve(q, { x: q.x + 2, y: q.y + 3 }, { x: q.x + 0.5, y: q.y + 4 }, shade(plant, -0.2), 0.6);
      } else {
        p.foliage(q.x, q.y - 1.5, 4.8, k % 2 ? plant : shade(plant, 0.08), k * 7 + v * 10, 6);
      }
    });
    if (stage === 2) {
      for (const u of [0.25, 0.5, 0.75]) {
        const q = p.iso(u, v, 17);
        grapeBunch(p, q.x, q.y, fruit, accent);
      }
      if (v === 0.74) {
        // the front bunch's centre grape is a big glossy one with a face
        const q = p.iso(0.5, v, 17);
        const hx = q.x;
        const hy = q.y + 2.4;
        p.circle(hx, hy, 3.4, radial(p, hx, hy, 3.4, fruit));
        gloss(p, hx, hy, 3.4);
        face(p, hx, hy + 0.4, 0.95);
      }
    }
    p.rect(b.x - 1.1, b.y - 24, 2.2, 24, shade(wood, -0.1));
    p.rect(b.x - 1.6, b.y - 25, 3.2, 1.6, shade(wood, 0.1));
  }
};

const rice: Painter = (p, stage, c) => {
  const [plant, grain, deep] = c.colors;
  const rand = rng('rice' + stage);
  const gold = mix(grain, '#e6bb45', 0.55);
  for (const s of spots(p, grid(3, 0.2, 0.8))) {
    groundShadow(p, s, 5);
    const n = 5;
    thin(p, 0.7, () => {
      for (let k = 0; k < n; k++) {
        const a = UP + (k - 2) * 0.3;
        const col = stage === 2 ? mix(k % 2 ? plant : deep, gold, 0.25) : k % 2 ? plant : shade(deep, 0.15);
        leaf(p, s.x + (k - 2) * 0.5, s.y, (stage === 1 ? 9 : 11) + rand() * 3 - Math.abs(k - 2), a, 2.4, col, Math.abs(k - 2) * 1.2);
      }
    });
    if (stage === 2) {
      for (const side of [-1, 1]) {
        const base = up(s.x, s.y, 12);
        const tip = { x: s.x + side * 6.5, y: s.y - 6 };
        const ctl = { x: s.x + side * 4.5, y: s.y - 17 };
        p.curve(base, ctl, tip, '#9a7428', 0.9);
        for (let t = 0.3; t <= 1.01; t += 0.14) {
          const x = (1 - t) * (1 - t) * base.x + 2 * (1 - t) * t * ctl.x + t * t * tip.x;
          const y = (1 - t) * (1 - t) * base.y + 2 * (1 - t) * t * ctl.y + t * t * tip.y;
          p.ellipse(x, y, 1.05, 1.5, gold, '#9a7428', side * 0.6);
        }
      }
    }
  }
};

const coffee: Painter = (p, stage, c) => {
  const [plant, cherry, wood] = c.colors;
  for (const s of spots(p, QUINCUNX)) {
    groundShadow(p, s, 7);
    const levels = stage === 1 ? 2 : 4;
    const h = levels * 5 + 2;
    stem(p, s, up(s.x, s.y, h / 2), up(s.x, s.y, h), wood, 1.1);
    for (let k = 0; k < levels; k++) {
      const z = 3 + k * 5;
      const L = 8 - k * 1.3;
      const col = k % 2 ? plant : shade(plant, 0.1);
      leaf(p, s.x, s.y - z, L, -0.35, 3.6, col, 2);
      leaf(p, s.x, s.y - z, L, Math.PI + 0.35, 3.6, shade(col, -0.05), 2);
      if (stage === 2 && k < levels - 1) {
        for (const d of [-1, 1]) {
          const bx = s.x + d * 2.6;
          bead(p, bx, s.y - z + 0.5, 1.6, cherry);
          bead(p, bx + d * 1.6, s.y - z + 1.3, 1.45, k % 2 ? shade(cherry, -0.1) : '#e2442c');
        }
      }
    }
    leaf(p, s.x, s.y - h, 4.5, UP, 3, shade(plant, 0.15));
  }
};

const lavender: Painter = (p, stage, c) => {
  const [plant, bloom, light] = c.colors;
  for (const s of spots(p, QUINCUNX)) {
    groundShadow(p, s, 8);
    mound(p, s.x, s.y - 3, stage === 1 ? 4.5 : 5.5, plant, s.i + 40);
    const n = stage === 1 ? 5 : 9;
    for (let k = 0; k < n; k++) {
      const a = UP + (k / (n - 1) - 0.5) * 1.3;
      const L = (stage === 1 ? 8 : 13) - Math.abs(k / (n - 1) - 0.5) * 5;
      const bx = s.x + (k / (n - 1) - 0.5) * 4;
      const by = s.y - 4;
      const tx = bx + Math.cos(a) * L;
      const ty = by + Math.sin(a) * L;
      p.line([{ x: bx, y: by }, { x: tx, y: ty }], shade(plant, -0.25), 0.9);
      if (stage === 1) {
        p.ellipse(tx, ty, 1, 2, mix(shade(plant, 0.1), bloom, 0.55), null, a + Math.PI / 2);
      } else {
        for (let j = 0; j < 4; j++) {
          const t = 1 - j * 0.12;
          const ex = bx + Math.cos(a) * L * t;
          const ey = by + Math.sin(a) * L * t;
          p.ellipse(ex, ey, 1.2 - j * 0.08, 1.4, j % 2 ? bloom : shade(bloom, -0.12), shade(bloom, -0.5), a + Math.PI / 2);
        }
        p.circle(tx - 0.3, ty - 0.3, 0.5, light, null);
      }
    }
  }
};

function melon(p: Pen, x: number, y: number, rw: number, rh: number, col: string, rot: number): void {
  p.shadow(x, y + rh * 0.8, rw * 1.1, rh * 0.5, 0.35);
  p.ellipse(x, y, rw, rh, radial(p, x, y, rw, shade(col, 0.15)), p.outline, rot);
  const ctx = p.ctx;
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(x, y, rw, rh, rot, 0, Math.PI * 2);
  ctx.clip();
  for (let k = -2; k <= 2; k++) {
    const sx = x + k * rw * 0.38;
    p.curve({ x: sx - k * 0.8, y: y - rh }, { x: sx + 1.2, y }, { x: sx - k * 0.8, y: y + rh }, shade(col, -0.35), 1.3);
  }
  ctx.restore();
  p.ellipse(x - rw * 0.35, y - rh * 0.45, rw * 0.3, rh * 0.18, 'rgba(255,255,255,0.35)', null, rot);
}

const watermelon: Painter = (p, stage, c) => {
  const [plant, rind] = c.colors;
  vines(p, plant, 'melon', stage === 1 ? '#f7d54a' : null);
  if (stage === 1) {
    const s = p.iso(0.55, 0.5);
    p.ellipse(s.x, s.y - 2, 3, 2, rind);
    return;
  }
  for (const [u, v, rw, rot] of [
    [0.62, 0.3, 10, 0.35],
    [0.35, 0.62, 11.5, -0.3],
  ] as const) {
    const pt = p.iso(u, v);
    const cy = pt.y - 4.5;
    melon(p, pt.x, cy, rw, rw * 0.62, rind, rot);
    // the front melon is the hero
    if (u === 0.35) face(p, pt.x, cy + 1.2, 2.6);
  }
  const t = p.iso(0.8, 0.75);
  lobedLeaf(p, t.x, t.y - 2, 3.6, shade(plant, 0.08));
};

const cranberry: Painter = (p, stage, c) => {
  const [plant, berry, deep] = c.colors;
  const pts = spots(p, grid(4, 0.17, 0.83));
  for (const s of pts) {
    const front = s.i === pts.length - 1;
    mound(p, s.x, s.y - 1.5, stage === 1 ? 3.8 : 4.2, s.i % 2 ? plant : shade(plant, 0.1), s.i + 70);
    if (stage === 1) {
      if (s.i % 3 === 0) p.circle(s.x + 1, s.y - 3.2, 0.9, '#f6b3c4', null);
    } else {
      const rand = rng(s.i + 90);
      for (let k = 0; k < 3; k++) {
        bead(p, s.x + (rand() - 0.5) * 6, s.y - 2.5 + (rand() - 0.5) * 3, 1.5, k % 2 ? deep : berry, '#ff9fb0');
      }
      if (front) {
        // one plump glossy berry on the front mound, with a face
        const hx = s.x;
        const hy = s.y - 3.4;
        p.circle(hx, hy, 3.6, radial(p, hx, hy, 3.6, berry));
        gloss(p, hx, hy, 3.6);
        face(p, hx, hy + 0.5, 0.95);
      }
    }
  }
};

const PAINTERS: Record<string, Painter> = {
  strawberry,
  wheat,
  carrot,
  tomato,
  potato,
  corn,
  blueberry,
  pumpkin,
  sunflower,
  cotton,
  grape,
  rice,
  coffee,
  lavender,
  watermelon,
  cranberry,
};

const HEIGHTS: Record<string, number> = {
  strawberry: 18,
  wheat: 30,
  carrot: 20,
  tomato: 34,
  potato: 22,
  corn: 48,
  blueberry: 26,
  pumpkin: 22,
  sunflower: 46,
  cotton: 26,
  grape: 34,
  rice: 26,
  coffee: 30,
  lavender: 26,
  watermelon: 20,
  cranberry: 16,
};

function withered(p: Pen): void {
  const stemCol = '#8b6b48';
  const leafCols = ['#9a8460', '#7f7058', '#a8916a'];
  const rand = rng('withered');
  for (const s of spots(p, grid(3, 0.22, 0.78))) {
    groundShadow(p, s, 4.5);
    const side = s.i % 2 ? 1 : -1;
    const h = 9 + rand() * 4;
    const top = { x: s.x + side * 5, y: s.y - h * 0.55 };
    stem(p, s, { x: s.x + side, y: s.y - h }, top, stemCol, 1);
    leaf(p, s.x + side * 0.7, s.y - h * 0.45, 5, side > 0 ? 0.3 : Math.PI - 0.3, 3, leafCols[s.i % 3], 3);
    leaf(p, top.x, top.y, 3.5, side > 0 ? 1.1 : Math.PI - 1.1, 2.5, leafCols[(s.i + 1) % 3], 1);
    leaf(p, s.x, s.y - 1, 4, side > 0 ? Math.PI - 0.15 : 0.15, 2.6, leafCols[(s.i + 2) % 3], 1);
    // one sad little face on the front plant's drooping leaf
    if (s.i === 8) {
      // a pale, drooping leaf carries the sad face so it reads at tile size
      const fx = s.x + side * 3.4;
      const fy = s.y - h * 0.45 + 0.6;
      thin(p, 0.6, () => p.ellipse(fx, fy, 3, 2.5, '#d9c596'));
      face(p, fx, fy, 1.3, true);
    }
  }
  // a couple of fallen leaves
  for (const [u, v] of [
    [0.5, 0.15],
    [0.85, 0.55],
    [0.4, 0.88],
  ]) {
    const q = p.iso(u, v);
    p.ellipse(q.x, q.y, 1.8, 0.9, '#8a7350', shade('#8a7350', -0.4), 0.3);
  }
}

// ---------------------------------------------------------------------------
// Icons (flat 40×40)

type IconPainter = (p: Pen, c: CropDef) => void;

function iconShadow(p: Pen, y = 35, rx = 12): void {
  p.shadow(20, y, rx, 2.6, 0.25);
}

const ICONS: Record<string, IconPainter> = {
  strawberry: (p, c) => {
    const [plant, fruit, seed] = c.colors;
    iconShadow(p);
    berryShape(p, 20, 20, 9.5, radial(p, 20, 20, 12, fruit));
    // seeds ring the lower body, leaving room for the face
    const seeds: [number, number][] = [
      [-6, 2.5],
      [6, 2.5],
      [-3.4, 6.4],
      [3.4, 6.4],
      [0, 10],
    ];
    for (const [dx, dy] of seeds) p.ellipse(20 + dx, 20 + dy, 0.7, 1, seed, shade(seed, -0.4));
    for (const a of [Math.PI + 0.35, -0.35]) leaf(p, 20, 12.5, 7, a, 4, plant, 1);
    for (const a of [2.5, 1.6, 0.65]) leaf(p, 20, 12.5, 6, a, 3.6, shade(plant, 0.1));
    p.line([{ x: 20, y: 12.5 }, { x: 21, y: 7 }], shade(plant, -0.2), 1.6);
  },
  wheat: (p, c) => {
    const [, grain, accent] = c.colors;
    iconShadow(p, 36, 9);
    const stalks = [-0.42, -0.21, 0, 0.21, 0.42];
    for (const a of stalks) {
      const base = { x: 20 - a * 6, y: 34 };
      const tip = { x: 20 + Math.sin(a) * 18, y: 34 - Math.cos(a) * 22 };
      stem(p, base, { x: 20, y: 22 }, tip, shade(grain, -0.05), 1.2);
    }
    for (const a of stalks) {
      const tip = { x: 20 + Math.sin(a) * 18, y: 34 - Math.cos(a) * 22 };
      const ang = UP + a;
      grainHead(p, tip.x - Math.cos(ang) * 2, tip.y - Math.sin(ang) * 2, ang, 11, grain, accent);
    }
    p.roundRect(14.5, 24, 11, 4, 1.5, '#c0533a');
    p.line([{ x: 16, y: 26 }, { x: 24, y: 26 }], '#e07a5a', 0.8);
  },
  carrot: (p, c) => {
    const [plant, root, deep] = c.colors;
    iconShadow(p, 35, 10);
    // fronds
    for (const a of [-1.2, -0.75, -0.3]) leaf(p, 25, 13, 11, a - Math.PI / 4 - 0.2, 4, a < -1 ? deep : plant, 0);
    // root
    const ctx = p.ctx;
    ctx.beginPath();
    ctx.moveTo(20.5, 9.5);
    ctx.quadraticCurveTo(31, 13, 29, 18);
    ctx.quadraticCurveTo(20, 28, 8, 34);
    ctx.quadraticCurveTo(14, 22, 20.5, 9.5);
    ctx.closePath();
    const g = p.ctx.createLinearGradient(16, 12, 28, 22);
    g.addColorStop(0, shade(root, 0.25));
    g.addColorStop(0.6, root);
    g.addColorStop(1, shade(root, -0.2));
    finish(p, g);
    for (const [x0, y0, x1, y1] of [
      [19, 18, 23, 19],
      [15, 24, 19, 24.5],
      [22, 13.5, 25.5, 15],
      [13, 29, 15.5, 29],
    ])
      p.line([{ x: x0, y: y0 }, { x: x1, y: y1 }], shade(root, -0.35), 0.8);
    p.line([{ x: 18, y: 14 }, { x: 13, y: 25 }], 'rgba(255,255,255,0.45)', 1.4);
  },
  tomato: (p, c) => {
    const [plant, fruit] = c.colors;
    iconShadow(p);
    p.ellipse(20, 22, 13, 11.5, radial(p, 20, 22, 13, fruit));
    p.curve({ x: 13, y: 15 }, { x: 15, y: 22 }, { x: 14, y: 29 }, shade(fruit, -0.25), 0.8);
    p.curve({ x: 27, y: 15 }, { x: 25, y: 22 }, { x: 26, y: 29 }, shade(fruit, -0.25), 0.8);
    p.star(20, 12, 6, plant);
    p.rect(19, 6.5, 2, 5, shade(plant, -0.15));
    p.ellipse(14.5, 17.5, 3, 1.8, 'rgba(255,255,255,0.55)', null, -0.6);
  },
  potato: (p, c) => {
    const [, tuber] = c.colors;
    iconShadow(p, 33, 13);
    const ctx = p.ctx;
    ctx.beginPath();
    ctx.moveTo(7, 21);
    ctx.bezierCurveTo(6, 11, 19, 9, 26, 11);
    ctx.bezierCurveTo(34, 12, 36, 20, 32, 26);
    ctx.bezierCurveTo(28, 32, 9, 32, 7, 21);
    ctx.closePath();
    finish(p, radial(p, 18, 18, 15, tuber));
    for (const [x, y] of [
      [12, 17],
      [22, 15],
      [28, 21],
      [17, 25],
    ]) {
      p.ellipse(x, y, 1.2, 0.7, shade(tuber, -0.35), null);
      p.circle(x + 0.4, y - 0.6, 0.4, shade(tuber, 0.3), null);
    }
    p.ellipse(13, 14, 3.5, 1.6, 'rgba(255,255,255,0.35)', null, -0.3);
  },
  corn: (p, c) => {
    const [plant, kernel, husk] = c.colors;
    iconShadow(p, 35, 11);
    const ang = -0.75;
    p.save();
    p.ctx.translate(20, 19);
    p.ctx.rotate(ang);
    p.ellipse(1, 0, 13, 5.6, radial(p, -2, -2, 12, kernel));
    for (let i = -3; i <= 4; i++)
      for (let j = -1; j <= 1; j++) {
        const x = i * 3 + (j % 2 ? 1.5 : 0) + 1;
        const y = j * 2.8;
        if ((x - 1) * (x - 1) / 150 + (y * y) / 26 < 1) p.roundRect(x - 1.2, y - 1.1, 2.4, 2.2, 0.8, shade(kernel, 0.1), shade(kernel, -0.3));
      }
    p.restore();
    leaf(p, 9, 31, 17, -0.45, 7, husk);
    leaf(p, 9, 31, 16, -1.2, 7, plant);
    leaf(p, 9, 31, 12, -0.85, 5, shade(husk, 0.1));
    p.line([{ x: 30, y: 9 }, { x: 33, y: 5 }], '#b5652d', 1);
    p.line([{ x: 30, y: 9 }, { x: 35, y: 7 }], '#b5652d', 1);
  },
  blueberry: (p, c) => {
    const [plant, berry, hi] = c.colors;
    iconShadow(p, 34, 13);
    leaf(p, 20, 12, 9, -2.5, 6, plant);
    leaf(p, 20, 12, 9, -0.6, 6, shade(plant, 0.1));
    for (const [x, y, r] of [
      [13, 21, 7],
      [27, 21, 7],
      [20, 27, 7.5],
    ]) {
      p.circle(x, y, r, radial(p, x, y, r, berry));
      p.star(x + 0.5, y - r * 0.45, 2, shade(berry, -0.35), null);
      p.circle(x - r * 0.45, y - r * 0.1, r * 0.22, hi, null);
    }
  },
  pumpkin: (p, c) => {
    const [plant, fruit] = c.colors;
    iconShadow(p, 35, 15);
    leaf(p, 21, 9, 9, -0.35, 6, plant, 2);
    pumpkinShape(p, 20, 23, 15, 10.5, fruit, '#6b8a2a');
    p.curve({ x: 19, y: 9 }, { x: 14, y: 6 }, { x: 15, y: 10 }, shade(plant, -0.15), 1);
  },
  sunflower: (p, c) => {
    const [plant, petal, center] = c.colors;
    leaf(p, 20, 34, 9, -0.5, 6, plant, 2);
    leaf(p, 20, 34, 9, Math.PI + 0.5, 6, shade(plant, 0.1), 2);
    sunflowerHead(p, 20, 18, 13, petal, center);
  },
  cotton: (p, c) => {
    const [, boll, twig] = c.colors;
    iconShadow(p, 35, 12);
    p.star(20, 27, 9, shade(twig, -0.05));
    p.rect(19, 30, 2, 5, shade(twig, -0.15));
    for (const [x, y, r] of [
      [12.5, 20, 6.5],
      [27.5, 20, 6.5],
      [20, 13, 7],
      [20, 22, 7],
    ])
      p.circle(x, y, r, radial(p, x, y, r, boll), '#8f8070');
    for (const [x, y] of [
      [11, 18],
      [18, 11],
      [26, 18],
    ])
      p.circle(x, y, 1.6, '#ffffff', null);
  },
  grape: (p, c) => {
    const [plant, fruit, hi] = c.colors;
    iconShadow(p, 37, 9);
    p.line([{ x: 20, y: 9 }, { x: 22, y: 4 }], '#7a5236', 2);
    lobedLeaf(p, 26, 8, 5, plant);
    const rows = [5, 4, 3, 2, 1];
    rows.forEach((n, ri) => {
      for (let k = 0; k < n; k++) {
        const x = 20 + (k - (n - 1) / 2) * 5;
        const y = 13 + ri * 4.6;
        p.circle(x, y, 3, radial(p, x, y, 3, (k + ri) % 2 ? fruit : shade(fruit, -0.1)));
        p.circle(x - 1, y - 1, 0.9, hi, null);
      }
    });
  },
  rice: (p, c) => {
    const [plant, grain] = c.colors;
    iconShadow(p, 36, 13);
    // heap of rice in a bowl
    const ctx = p.ctx;
    ctx.beginPath();
    ctx.ellipse(20, 20, 12, 8, 0, Math.PI, 0);
    ctx.closePath();
    finish(p, radial(p, 17, 16, 12, grain));
    for (const [x, y, a] of [
      [14, 17, 0.5],
      [18, 14, -0.4],
      [23, 15, 0.8],
      [26, 18, -0.2],
      [20, 18, 0.1],
      [11, 19, -0.5],
    ])
      p.ellipse(x, y, 0.8, 1.6, '#ffffff', shade(grain, -0.35), a);
    ctx.beginPath();
    ctx.moveTo(6, 20);
    ctx.lineTo(34, 20);
    ctx.bezierCurveTo(33, 31, 26, 34, 20, 34);
    ctx.bezierCurveTo(14, 34, 7, 31, 6, 20);
    ctx.closePath();
    finish(p, p.vgrad(20, 34, '#5f9ad1', '#3c6fa3'));
    p.line([{ x: 8.5, y: 25 }, { x: 31.5, y: 25 }], '#f3f0e6', 1.4);
    leaf(p, 28, 13, 8, -0.9, 3, plant);
  },
  coffee: (p, c) => {
    const [plant, , bean] = c.colors;
    iconShadow(p, 34, 15);
    const beans: [number, number, number][] = [
      [13, 28, 0.5],
      [27, 28, -0.4],
      [20, 29, 0.1],
      [16, 21, -0.6],
      [24, 21, 0.6],
      [20, 14, 0.2],
    ];
    for (const [x, y, a] of beans) {
      p.ellipse(x, y, 5.5, 4, radial(p, x, y, 5.5, bean), p.outline, a);
      const ca = Math.cos(a);
      const sa = Math.sin(a);
      p.curve({ x: x - ca * 4, y: y - sa * 4 }, { x: x - sa * 1.5, y: y + ca * 1.5 }, { x: x + ca * 4, y: y + sa * 4 }, shade(bean, -0.5), 1);
      p.circle(x - 2 - sa, y - 1.5, 0.9, shade(bean, 0.35), null);
    }
    leaf(p, 26, 12, 9, -0.5, 5, plant);
  },
  lavender: (p, c) => {
    const [plant, bloom, light] = c.colors;
    const spikes = [-0.4, -0.2, 0, 0.2, 0.4];
    for (const a of spikes) {
      const base = { x: 20, y: 34 };
      const tip = { x: 20 + Math.sin(a) * 26, y: 34 - Math.cos(a) * 28 };
      p.line([base, tip], shade(plant, -0.1), 1.3);
      for (let j = 0; j < 6; j++) {
        const t = 1 - j * 0.08;
        const x = base.x + (tip.x - base.x) * t;
        const y = base.y + (tip.y - base.y) * t;
        p.ellipse(x, y, 1.9 - j * 0.1, 2.3, j % 2 ? bloom : shade(bloom, -0.12), shade(bloom, -0.5), a);
      }
      p.circle(tip.x - 0.6, tip.y - 0.5, 0.8, light, null);
    }
    // ribbon
    p.roundRect(15.5, 25, 9, 4, 1.5, '#e98fb3');
    p.ellipse(13.5, 27, 2.6, 1.6, '#e98fb3', p.outline, -0.4);
    p.ellipse(26.5, 27, 2.6, 1.6, '#e98fb3', p.outline, 0.4);
  },
  watermelon: (p, c) => {
    const [, rind, flesh] = c.colors;
    iconShadow(p, 35, 15);
    melon(p, 23, 17, 13, 9.5, rind, -0.25);
    // slice in front
    const ctx = p.ctx;
    const cx = 15;
    const cy = 23;
    ctx.beginPath();
    ctx.moveTo(cx - 11, cy);
    ctx.lineTo(cx + 11, cy);
    ctx.arc(cx, cy, 11, 0, Math.PI);
    ctx.closePath();
    finish(p, shade(rind, -0.1));
    ctx.beginPath();
    ctx.moveTo(cx - 9.5, cy);
    ctx.lineTo(cx + 9.5, cy);
    ctx.arc(cx, cy, 9.5, 0, Math.PI);
    ctx.closePath();
    finish(p, '#f4f1d0', null);
    ctx.beginPath();
    ctx.moveTo(cx - 8.5, cy);
    ctx.lineTo(cx + 8.5, cy);
    ctx.arc(cx, cy, 8.5, 0, Math.PI);
    ctx.closePath();
    finish(p, p.vgrad(cy, cy + 9, shade(flesh, 0.1), shade(flesh, -0.08)), null);
    p.line([{ x: cx - 11, y: cy }, { x: cx + 11, y: cy }], p.outline, 1);
    for (const [dx, dy] of [
      [-6, 1.5],
      [6, 1.5],
      [-1.8, 8],
      [2.2, 8],
    ])
      p.ellipse(cx + dx, cy + dy, 0.7, 1.1, '#3a2a20', null);
  },
  cranberry: (p, c) => {
    const [plant, berry, deep] = c.colors;
    iconShadow(p, 34, 13);
    leaf(p, 20, 12, 8, -2.6, 5, plant);
    leaf(p, 20, 12, 8, -0.5, 5, shade(plant, 0.1));
    for (const [x, y, r, col] of [
      [12, 20, 5.5, deep],
      [28, 20, 5.5, berry],
      [20, 18, 6, berry],
      [15, 28, 6, berry],
      [25, 28.5, 5.5, deep],
    ] as const) {
      p.circle(x, y, r, radial(p, x, y, r, col));
      p.circle(x - r * 0.4, y - r * 0.4, r * 0.25, 'rgba(255,255,255,0.6)', null);
    }
  },
};

/** Fallback icon: a shiny ball of produce. */
function genericIcon(p: Pen, c: CropDef): void {
  iconShadow(p);
  p.ball(20, 20, 12, c.colors[1]);
  leaf(p, 20, 9, 7, -0.7, 4, c.colors[0]);
}

/** Fallback plant: a leafy bush with produce dots. */
const genericPlant: Painter = (p, stage, c) => {
  for (const s of spots(p, QUINCUNX)) {
    groundShadow(p, s, 7);
    p.foliage(s.x, s.y - 6, stage === 1 ? 5 : 7, c.colors[0], s.i + 1, 6);
    if (stage === 2) for (const [dx, dy] of [[-3, -6], [2, -9], [3, -4]]) bead(p, s.x + dx, s.y + dy, 1.7, c.colors[1]);
  }
};

// ---------------------------------------------------------------------------
// Exports

export const sprites: SpriteSpec[] = [
  ...CROP_LIST.flatMap((c) => {
    const height = HEIGHTS[c.id] ?? 30;
    const painter = PAINTERS[c.id] ?? genericPlant;
    return [
      { key: `crop:${c.id}:0`, fw: 1, fh: 1, height, paint: (p: Pen) => sprout(p, c) },
      {
        key: `crop:${c.id}:1`,
        fw: 1,
        fh: 1,
        height,
        paint: (p: Pen) => {
          p.lineWidth = 0.8; // growing plants have softer outlines
          painter(p, 1, young(c));
        },
      },
      { key: `crop:${c.id}:2`, fw: 1, fh: 1, height, paint: (p: Pen) => painter(p, 2, c) },
    ];
  }),
  { key: 'crop:withered', fw: 1, fh: 1, height: 20, paint: withered },
];

/** Where each icon's face sits, as [x, y, k] (k = half the eye gap in px). */
const ICON_FACE: Record<string, [number, number, number]> = {
  strawberry: [20, 18, 3.2],
  wheat: [20, 16, 2.6],
  carrot: [19, 21, 2.6],
  tomato: [20, 22, 3.6],
  potato: [19, 20, 3],
  corn: [20, 19, 2.4],
  blueberry: [20.5, 28.5, 2.5],
  pumpkin: [20, 24, 4],
  sunflower: [20, 18.5, 2.6],
  cotton: [20, 21.5, 2.6],
  grape: [20, 22.4, 1.5],
  rice: [20, 16.5, 2.8],
  coffee: [20, 28.5, 2.2],
  lavender: [20, 17, 2.4],
  watermelon: [15, 27.5, 2.6],
  cranberry: [20, 18.5, 2.1],
};

export const icons: IconSpec[] = CROP_LIST.map((c) => ({
  key: `icon:${c.id}`,
  paint: (p: Pen) => {
    p.outline = OUTLINE;
    (ICONS[c.id] ?? genericIcon)(p, c);
    // every icon gets a face; unlisted (new) crops use the generic body's centre
    const [x, y, k] = ICON_FACE[c.id] ?? [20, 20, 3.2];
    p.glow(x - k, y - k * 1.2, k * 2.4, '#ffffff', 0.3); // soft highlight on the body
    face(p, x, y, k);
  },
}));
