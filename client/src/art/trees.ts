// Fruit trees: a healthy and a "ready" (laden with fruit) sprite per tree, plus
// produce icons. Every tree stands on a 1×1 footprint with its trunk rooted at
// the footprint centre and a soft contact shadow underneath.
import { type IconSpec, type SpriteSpec, type Pen, type Pt, shade, rng } from './kit';
import { TREE_LIST, type ProducerDef } from '@farm/shared';

const UP = -Math.PI / 2;

// ---------------------------------------------------------------------------
// Helpers

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

function radial(p: Pen, x: number, y: number, r: number, color: string, hi = 0.35): CanvasGradient {
  const g = p.ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r * 1.2);
  g.addColorStop(0, shade(color, hi));
  g.addColorStop(0.6, color);
  g.addColorStop(1, shade(color, -0.25));
  return g;
}

/** A pointed leaf from (x, y) along `ang`; `w` is the bulge, `droop` pulls the tip down. */
function leaf(p: Pen, x: number, y: number, len: number, ang: number, w: number, color: string, droop = 0, vein = true): void {
  const tx = x + Math.cos(ang) * len;
  const ty = y + Math.sin(ang) * len + droop;
  const cx = x + Math.cos(ang) * len * 0.55;
  const cy = y + Math.sin(ang) * len * 0.55 - droop * 0.15;
  const ch = Math.hypot(tx - x, ty - y) || 1;
  const nx = (-(ty - y) / ch) * w;
  const ny = ((tx - x) / ch) * w;
  const ctx = p.ctx;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.quadraticCurveTo(cx + nx, cy + ny, tx, ty);
  ctx.quadraticCurveTo(cx - nx, cy - ny, x, y);
  ctx.closePath();
  finish(p, color);
  if (vein) p.curve({ x, y }, { x: cx, y: cy }, { x: x + (tx - x) * 0.85, y: y + (ty - y) * 0.85 }, shade(color, 0.25), 0.7);
}

/** Point on a quadratic curve. */
function qpt(a: Pt, c: Pt, b: Pt, t: number): Pt {
  const s = 1 - t;
  return { x: s * s * a.x + 2 * s * t * c.x + t * t * b.x, y: s * s * a.y + 2 * s * t * c.y + t * t * b.y };
}

/**
 * A long drooping leaf (banana / palm frond) following a curve from `base`.
 * `cuts` adds notches toward the midrib so it reads as torn or feathered.
 */
function longLeaf(p: Pen, base: Pt, ang: number, len: number, droop: number, w: number, color: string, cuts: number): void {
  const tip = { x: base.x + Math.cos(ang) * len, y: base.y + Math.sin(ang) * len + droop };
  const ctl = { x: base.x + Math.cos(ang) * len * 0.55, y: base.y + Math.sin(ang) * len * 0.55 - Math.abs(droop) * 0.35 };
  const N = 14;
  const left: Pt[] = [];
  const right: Pt[] = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const q = qpt(base, ctl, tip, t);
    const q2 = qpt(base, ctl, tip, Math.min(1, t + 0.02));
    const q1 = qpt(base, ctl, tip, Math.max(0, t - 0.02));
    const dx = q2.x - q1.x;
    const dy = q2.y - q1.y;
    const d = Math.hypot(dx, dy) || 1;
    const half = w * Math.sin(Math.PI * Math.min(1, t * 1.1)) * (t < 0.15 ? t / 0.15 : 1) * 0.5;
    left.push({ x: q.x - (dy / d) * half, y: q.y + (dx / d) * half });
    right.push({ x: q.x + (dy / d) * half, y: q.y - (dx / d) * half });
  }
  p.poly([...left, ...right.reverse()], color);
  // the lower half of the leaf is in shade
  p.poly([...left.slice(0, N + 1), ...Array.from({ length: N + 1 }, (_, i) => qpt(base, ctl, tip, (N - i) / N))], shade(color, -0.12), null);
  p.curve(base, ctl, { x: tip.x - (tip.x - ctl.x) * 0.08, y: tip.y - (tip.y - ctl.y) * 0.08 }, shade(color, 0.3), 0.8);
  right.reverse();
  for (let k = 1; k <= cuts; k++) {
    const t = 0.2 + (k / (cuts + 1)) * 0.75;
    const i = Math.round(t * N);
    const mid = qpt(base, ctl, tip, t + 0.04);
    for (const edge of [left[i], right[i]]) p.line([edge, { x: edge.x * 0.4 + mid.x * 0.6, y: edge.y * 0.4 + mid.y * 0.6 }], shade(color, -0.45), 0.8);
  }
}

/** Tapered trunk from the footprint centre; returns the top point. */
function trunk(p: Pen, h: number, w: number, color: string, lean = 0): Pt {
  const c = p.center;
  p.shadow(c.x, c.y, 22, 9, 0.3);
  const top = { x: c.x + lean, y: c.y - h };
  const ctx = p.ctx;
  ctx.beginPath();
  ctx.moveTo(c.x - w * 0.95, c.y + 1.5);
  ctx.quadraticCurveTo(c.x - w * 0.45, c.y - 1, c.x - w * 0.42, c.y - h * 0.3);
  ctx.lineTo(top.x - w * 0.3, top.y);
  ctx.lineTo(top.x + w * 0.3, top.y);
  ctx.lineTo(c.x + w * 0.42, c.y - h * 0.3);
  ctx.quadraticCurveTo(c.x + w * 0.45, c.y - 1, c.x + w * 0.95, c.y + 1.5);
  ctx.quadraticCurveTo(c.x, c.y + 3, c.x - w * 0.95, c.y + 1.5);
  ctx.closePath();
  const g = ctx.createLinearGradient(c.x - w, 0, c.x + w, 0);
  g.addColorStop(0, shade(color, 0.15));
  g.addColorStop(0.5, color);
  g.addColorStop(1, shade(color, -0.3));
  finish(p, g);
  // bark marks
  p.curve({ x: c.x - 1, y: c.y - h * 0.25 }, { x: c.x - 2, y: c.y - h * 0.35 }, { x: c.x - 1, y: c.y - h * 0.48 }, shade(color, -0.3), 0.8);
  p.curve({ x: c.x + 1.5, y: c.y - 3 }, { x: c.x + 2.2, y: c.y - h * 0.12 }, { x: c.x + 1.2, y: c.y - h * 0.2 }, shade(color, -0.3), 0.8);
  // forks reaching into the canopy
  for (const d of [-1, 1]) {
    p.curve({ x: top.x, y: top.y + 3 }, { x: top.x + d * 3, y: top.y - 2 }, { x: top.x + d * 7, y: top.y - 6 }, p.outline, 3.4);
    p.curve({ x: top.x, y: top.y + 3 }, { x: top.x + d * 3, y: top.y - 2 }, { x: top.x + d * 7, y: top.y - 6 }, d < 0 ? shade(color, 0.05) : shade(color, -0.15), 2.2);
  }
  return top;
}

/** Deterministic, evenly spread spots inside an ellipse (biased to the front/lower half). */
function scatter(cx: number, cy: number, rx: number, ry: number, n: number, seed: string, minD = 6): Pt[] {
  const rand = rng(seed);
  const out: Pt[] = [];
  for (let tries = 0; out.length < n && tries < 600; tries++) {
    const a = rand() * Math.PI * 2;
    const d = Math.sqrt(rand());
    const pt = { x: cx + Math.cos(a) * rx * d, y: cy + Math.sin(a) * ry * d * 0.9 + ry * 0.1 };
    if (out.every((q) => Math.hypot(q.x - pt.x, q.y - pt.y) >= minD)) out.push(pt);
  }
  return out.sort((a, b) => a.y - b.y);
}

type Clump = [number, number, number, string, number?]; // dx, dy, r, colour, vertical stretch

function canopy(p: Pen, x: number, y: number, clumps: Clump[], seed: string): void {
  clumps.forEach(([dx, dy, r, col, stretch], i) => {
    if (!stretch) return p.foliage(x + dx, y + dy, r, col, seed + i, r > 14 ? 9 : 7);
    p.save();
    p.ctx.translate(x + dx, y + dy);
    p.ctx.scale(1 / Math.sqrt(stretch), stretch);
    p.foliage(0, 0, r, col, seed + i, 9);
    p.restore();
  });
}

function tinyLeaf(p: Pen, x: number, y: number, ang: number, color = '#4f9a3a'): void {
  leaf(p, x, y, 3.6, ang, 2.6, color, 0, false);
}

// ---------------------------------------------------------------------------
// Fruit painters (shared by trees and icons)

function apple(p: Pen, x: number, y: number, r: number, col = '#e53935'): void {
  p.ball(x, y, r, col);
  p.line([{ x, y: y - r * 0.7 }, { x: x + r * 0.15, y: y - r * 1.25 }], '#6b4426', Math.max(0.8, r * 0.18));
  if (r > 4) leaf(p, x + r * 0.15, y - r * 1.05, r * 0.75, -0.5, r * 0.55, '#5aa83a');
  p.circle(x - r * 0.4, y - r * 0.35, r * 0.22, 'rgba(255,255,255,0.7)', null);
}

function cherryPair(p: Pen, x: number, y: number, r: number, col = '#d81b3c'): void {
  const top = { x: x + r * 0.3, y: y - r * 2.6 };
  p.curve({ x: x - r * 0.9, y: y - r * 0.6 }, { x: x - r * 0.6, y: y - r * 2 }, top, '#5d7a2a', Math.max(0.7, r * 0.22));
  p.curve({ x: x + r * 1.0, y: y + r * 0.1 }, { x: x + r * 1.2, y: y - r * 1.6 }, top, '#5d7a2a', Math.max(0.7, r * 0.22));
  p.ball(x - r * 0.9, y, r, shade(col, -0.08));
  p.ball(x + r * 1.0, y + r * 0.6, r, col);
  p.circle(x - r * 1.2, y - r * 0.35, r * 0.25, 'rgba(255,255,255,0.75)', null);
  p.circle(x + r * 0.7, y + r * 0.25, r * 0.25, 'rgba(255,255,255,0.75)', null);
}

function orange(p: Pen, x: number, y: number, r: number): void {
  p.ball(x, y, r, '#f7931e');
  p.circle(x + r * 0.05, y - r * 0.75, Math.max(0.5, r * 0.12), '#6b8a2a', null);
  p.circle(x - r * 0.4, y - r * 0.35, r * 0.22, 'rgba(255,255,255,0.65)', null);
}

function lemonShape(p: Pen, x: number, y: number, r: number, rot: number): void {
  const ctx = p.ctx;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.beginPath();
  ctx.moveTo(-r * 1.35, 0);
  ctx.bezierCurveTo(-r * 1.0, -r * 1.05, r * 1.0, -r * 1.05, r * 1.35, 0);
  ctx.bezierCurveTo(r * 1.0, r * 1.05, -r * 1.0, r * 1.05, -r * 1.35, 0);
  ctx.closePath();
  finish(p, radial(p, 0, 0, r * 1.2, '#f9dc3a', 0.45));
  ctx.beginPath();
  ctx.ellipse(-r * 0.35, -r * 0.35, r * 0.4, r * 0.18, -0.2, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.fill();
  ctx.restore();
}

function peach(p: Pen, x: number, y: number, r: number): void {
  const g = p.ctx.createRadialGradient(x - r * 0.4, y - r * 0.4, r * 0.1, x, y, r * 1.2);
  g.addColorStop(0, '#ffd9a0');
  g.addColorStop(0.5, '#ffad7a');
  g.addColorStop(1, '#e8607a');
  p.circle(x, y, r, g);
  p.curve({ x: x + r * 0.1, y: y - r * 0.9 }, { x: x - r * 0.45, y: y }, { x: x + r * 0.05, y: y + r * 0.85 }, 'rgba(190,70,80,0.7)', Math.max(0.6, r * 0.12));
  if (r > 4) leaf(p, x + r * 0.1, y - r * 0.9, r * 0.8, -0.6, r * 0.55, '#6aa840');
  else tinyLeaf(p, x + r * 0.1, y - r * 0.9, -0.6, '#6aa840');
}

function banana(p: Pen, base: Pt, ang: number, len: number, curl: number, col = '#f6d23c', thick = Math.abs(curl) * 0.6): void {
  const tip = { x: base.x + Math.cos(ang) * len, y: base.y + Math.sin(ang) * len };
  const mx = (base.x + tip.x) / 2;
  const my = (base.y + tip.y) / 2;
  const nx = -Math.sin(ang);
  const ny = Math.cos(ang);
  const ctx = p.ctx;
  ctx.beginPath();
  ctx.moveTo(base.x, base.y);
  const out = curl + Math.sign(curl) * thick;
  const inn = curl - Math.sign(curl) * thick;
  ctx.quadraticCurveTo(mx + nx * out, my + ny * out, tip.x, tip.y);
  ctx.quadraticCurveTo(mx + nx * inn, my + ny * inn, base.x, base.y);
  ctx.closePath();
  const g = ctx.createLinearGradient(mx - nx * 3, my - ny * 3, mx + nx * curl, my + ny * curl);
  g.addColorStop(0, shade(col, 0.3));
  g.addColorStop(1, shade(col, -0.15));
  finish(p, g);
  p.circle(tip.x, tip.y, Math.max(0.6, len * 0.06), '#5a3e22', null);
}

function coconut(p: Pen, x: number, y: number, r: number): void {
  p.ball(x, y, r, '#8a5a32');
  for (const [dx, dy] of [
    [-0.25, -0.1],
    [0.15, -0.25],
    [0.05, 0.15],
  ])
    p.circle(x + dx * r, y + dy * r, Math.max(0.4, r * 0.12), '#4a2e1a', null);
}

function mapleLeaf(p: Pen, x: number, y: number, s: number, color: string, rot = 0): void {
  const half: [number, number][] = [
    [0, -1],
    [0.2, -0.6],
    [0.42, -0.78],
    [0.38, -0.32],
    [0.85, -0.5],
    [0.72, -0.15],
    [1, 0.02],
    [0.55, 0.2],
    [0.62, 0.45],
    [0.12, 0.3],
    [0.06, 0.8],
  ];
  const pts = [...half, ...half.slice(1).reverse().map(([a, b]) => [-a, b] as [number, number])];
  const cs = Math.cos(rot);
  const sn = Math.sin(rot);
  p.poly(
    pts.map(([a, b]) => ({ x: x + (a * cs - b * sn) * s, y: y + (a * sn + b * cs) * s })),
    color,
  );
}

// ---------------------------------------------------------------------------
// Species

interface TreeArt {
  height: number;
  paint: (p: Pen, ready: boolean) => void;
}

/** A round broadleaf fruit tree: trunk, layered canopy, optional fruit. */
function broadleaf(opts: {
  seed: string;
  trunk: string;
  trunkH: number;
  trunkW?: number;
  canopyZ: number;
  clumps: Clump[];
  fruit: (p: Pen, x: number, y: number, i: number) => void;
  fruitN: number;
  fruitArea: [number, number];
  minD?: number;
  healthy?: (p: Pen, cx: number, cy: number) => void;
}): (p: Pen, ready: boolean) => void {
  return (p, ready) => {
    trunk(p, opts.trunkH, opts.trunkW ?? 7, opts.trunk);
    const c = p.center;
    const cy = c.y - opts.canopyZ;
    canopy(p, c.x, cy, opts.clumps, opts.seed);
    if (ready) {
      scatter(c.x, cy, opts.fruitArea[0], opts.fruitArea[1], opts.fruitN, opts.seed, opts.minD ?? 6).forEach((q, i) => opts.fruit(p, q.x, q.y, i));
    } else if (opts.healthy) {
      opts.healthy(p, c.x, cy);
    }
  };
}

const appleTree: TreeArt = {
  height: 74,
  paint: broadleaf({
    seed: 'apple',
    trunk: '#8b5a3c',
    trunkH: 26,
    canopyZ: 44,
    clumps: [
      [0, 0, 22, '#5aa83c'],
    ],
    fruit: (p, x, y, i) => apple(p, x, y, 3, i % 3 === 2 ? '#d32f2f' : '#e8433a'),
    fruitN: 10,
    fruitArea: [18, 16],
  }),
};

const cherryTree: TreeArt = {
  height: 74,
  paint: broadleaf({
    seed: 'cherry',
    trunk: '#7a4636',
    trunkH: 27,
    canopyZ: 44,
    clumps: [
      [-9, 3, 13, '#3f8a42'],
      [9, 3, 13, '#3a8040'],
      [0, -7, 15, '#46954a'],
    ],
    fruit: (p, x, y) => cherryPair(p, x, y, 1.8),
    fruitN: 9,
    fruitArea: [19, 15],
    minD: 6.5,
    healthy: (p, cx, cy) => {
      for (const q of scatter(cx, cy, 19, 15, 10, 'blossom', 6)) {
        for (let k = 0; k < 5; k++) {
          const a = (k / 5) * Math.PI * 2 - Math.PI / 2;
          p.circle(q.x + Math.cos(a) * 1.1, q.y + Math.sin(a) * 1.1, 1, '#ffc2d6', null);
        }
        p.circle(q.x, q.y, 0.6, '#ff7aa2', null);
      }
    },
  }),
};

const orangeTree: TreeArt = {
  height: 72,
  paint: broadleaf({
    seed: 'orange',
    trunk: '#87603f',
    trunkH: 24,
    canopyZ: 42,
    clumps: [
      [0, 0, 21, '#3d8a3a'],
      [5, -9, 10, '#47973f'],
      [-7, -6, 9, '#4a9c44'],
    ],
    fruit: (p, x, y) => orange(p, x, y, 3.2),
    fruitN: 9,
    fruitArea: [17, 15],
    minD: 7,
    healthy: (p, cx, cy) => {
      for (const q of scatter(cx, cy, 17, 14, 5, 'orange-bloom', 9)) {
        for (let k = 0; k < 5; k++) {
          const a = (k / 5) * Math.PI * 2;
          p.circle(q.x + Math.cos(a) * 1, q.y + Math.sin(a) * 1, 0.85, '#ffffff', null);
        }
        p.circle(q.x, q.y, 0.5, '#ffd54a', null);
      }
    },
  }),
};

const lemonTree: TreeArt = {
  height: 80,
  paint: broadleaf({
    seed: 'lemon',
    trunk: '#8e6a4a',
    trunkH: 26,
    trunkW: 6,
    canopyZ: 48,
    clumps: [
      [0, 0, 21, '#6eac3e', 1.3],
    ],
    fruit: (p, x, y, i) => lemonShape(p, x, y, 3.1, i % 2 ? 0.5 : -0.4),
    fruitN: 8,
    fruitArea: [16, 22],
    minD: 7,
  }),
};

const peachTree: TreeArt = {
  height: 68,
  paint: broadleaf({
    seed: 'peach',
    trunk: '#83503f',
    trunkH: 24,
    trunkW: 7.5,
    canopyZ: 38,
    clumps: [
      [-10, 2, 14, '#7fb550'],
      [10, 2, 14, '#78ad4b'],
      [0, -4, 17, '#88be58'],
    ],
    fruit: (p, x, y) => peach(p, x, y, 3.3),
    fruitN: 8,
    fruitArea: [21, 12],
    minD: 7.5,
  }),
};

const bananaTree: TreeArt = {
  height: 80,
  paint: (p, ready) => {
    const c = p.center;
    p.shadow(c.x, c.y, 22, 9, 0.3);
    const h = 30;
    const top = { x: c.x + 1, y: c.y - h };
    // pseudostem built from overlapping leaf sheaths
    const ctx = p.ctx;
    ctx.beginPath();
    ctx.moveTo(c.x - 6, c.y + 1);
    ctx.quadraticCurveTo(c.x - 4.5, c.y - h * 0.5, top.x - 3.5, top.y);
    ctx.lineTo(top.x + 3.5, top.y);
    ctx.quadraticCurveTo(c.x + 4.5, c.y - h * 0.5, c.x + 6, c.y + 1);
    ctx.quadraticCurveTo(c.x, c.y + 3, c.x - 6, c.y + 1);
    ctx.closePath();
    const g = ctx.createLinearGradient(c.x - 6, 0, c.x + 6, 0);
    g.addColorStop(0, '#b5b863');
    g.addColorStop(0.5, '#93a04c');
    g.addColorStop(1, '#6b7a36');
    finish(p, g);
    for (const t of [0.25, 0.55, 0.8])
      p.curve({ x: c.x - 4.5, y: c.y - h * t + 3 }, { x: c.x, y: c.y - h * t - 2 }, { x: c.x + 4.5, y: c.y - h * t - 5 }, '#5e6a2e', 0.8);
    p.curve({ x: c.x - 2.5, y: c.y - 2 }, { x: c.x - 3.5, y: c.y - 12 }, { x: c.x - 2.5, y: c.y - 20 }, '#c8c97a', 0.8);
    const leafCol = '#78bf45';
    const back: [number, number, number][] = [
      [-2.2, 27, 2],
      [-0.95, 27, 2],
      [-1.6, 22, -4],
    ];
    const front: [number, number, number][] = [
      [-2.85, 28, 22],
      [-0.3, 28, 22],
      [-2.5, 25, 12],
      [-0.65, 25, 12],
    ];
    back.forEach(([a, len, droop], i) => longLeaf(p, top, a, len, droop, 10, shade(leafCol, -0.1 + i * 0.04), 2));
    if (ready) {
      // a bunch of bananas hanging from the crown, tipped by a purple flower bud
      const stalkEnd = { x: top.x + 7, y: top.y + 17 };
      p.curve({ x: top.x + 1, y: top.y + 1 }, { x: top.x + 8, y: top.y + 2 }, stalkEnd, p.outline, 2.6);
      p.curve({ x: top.x + 1, y: top.y + 1 }, { x: top.x + 8, y: top.y + 2 }, stalkEnd, '#7a8a3a', 1.6);
      const old = p.lineWidth;
      p.lineWidth = 0.75;
      for (let row = 0; row < 2; row++) {
        const y = top.y + 7 + row * 5.5;
        const x = top.x + 7.5 - row * 0.2;
        for (let k = -2; k <= 2; k++) banana(p, { x: x + k * 2, y: y + 3 - Math.abs(k) * 0.5 }, UP + k * 0.3, 8.5 - row * 0.8, -2.2 - k * 0.2, row ? '#e9c832' : '#f6d23c', 2.3);
      }
      p.lineWidth = old;
      p.ellipse(stalkEnd.x, stalkEnd.y + 3, 2.6, 3.8, radial(p, stalkEnd.x, stalkEnd.y + 3, 3.4, '#9a2e62'));
      p.line([{ x: stalkEnd.x - 0.5, y: stalkEnd.y + 1 }, { x: stalkEnd.x - 1, y: stalkEnd.y + 5 }], '#c45a8a', 0.8);
    }
    front.forEach(([a, len, droop], i) => longLeaf(p, top, a, len, droop, 10, shade(leafCol, i * 0.05), 2));
    longLeaf(p, top, UP + 0.15, 13, -2, 6, shade(leafCol, 0.15), 0);
  },
};

const coconutPalm: TreeArt = {
  height: 86,
  paint: (p, ready) => {
    const c = p.center;
    p.shadow(c.x + 2, c.y, 20, 8, 0.3);
    const base = { x: c.x, y: c.y + 1 };
    const ctl = { x: c.x - 8, y: c.y - 30 };
    const top = { x: c.x + 6, y: c.y - 54 };
    const N = 16;
    const L: Pt[] = [];
    const R: Pt[] = [];
    for (let i = 0; i <= N; i++) {
      const t = i / N;
      const q = qpt(base, ctl, top, t);
      const q2 = qpt(base, ctl, top, Math.min(1, t + 0.02));
      const q1 = qpt(base, ctl, top, Math.max(0, t - 0.02));
      const dx = q2.x - q1.x;
      const dy = q2.y - q1.y;
      const d = Math.hypot(dx, dy) || 1;
      const half = 4.2 - t * 1.6 + (t < 0.08 ? (0.08 - t) * 25 : 0);
      L.push({ x: q.x + (dy / d) * half, y: q.y - (dx / d) * half });
      R.push({ x: q.x - (dy / d) * half, y: q.y + (dx / d) * half });
    }
    const g = p.ctx.createLinearGradient(c.x - 8, 0, c.x + 8, 0);
    g.addColorStop(0, '#c9a27a');
    g.addColorStop(1, '#8a6544');
    p.poly([...L, ...R.slice().reverse()], g);
    for (let i = 2; i < N; i += 2) {
      const m = qpt(base, ctl, top, i / N + 0.02);
      p.curve(L[i], { x: m.x, y: m.y + 1.2 }, R[i], '#7a5636', 0.9);
    }
    const crown = { x: top.x, y: top.y + 1 };
    const col = '#5cae45';
    const fronds: [number, number, number][] = [
      [-2.5, 28, 12],
      [-0.6, 28, 12],
      [-2.0, 24, -3],
      [-1.15, 24, -3],
    ];
    fronds.forEach(([a, len, droop], i) => longLeaf(p, crown, a, len, droop, 9, shade(col, -0.1 + i * 0.03), 4));
    if (ready) {
      for (const [dx, dy] of [
        [-3.5, 3.5],
        [3.5, 3.8],
        [0, 5.5],
      ])
        coconut(p, crown.x + dx, crown.y + dy, 3.8);
    }
    const front: [number, number, number][] = [
      [-3.0, 24, 16],
      [-0.1, 24, 16],
      [-2.35, 18, 13],
      [-0.75, 18, 13],
    ];
    front.forEach(([a, len, droop], i) => longLeaf(p, crown, a, len, droop, 9, shade(col, i * 0.04), 4));
    p.circle(crown.x, crown.y, 2.6, '#7a5636');
  },
};

const mapleTree: TreeArt = {
  height: 80,
  paint: (p, ready) => {
    const c = p.center;
    const t = trunk(p, 30, 7, '#7a5a46');
    void t;
    const cy = c.y - 48;
    canopy(
      p,
      c.x,
      cy,
      [
        [0, 2, 21, '#e0682a'],
        [-8, -8, 12, '#d9502b'],
        [9, -6, 11, '#f0a03a'],
      ],
      'maple',
    );
    // fallen leaves on the ground
    for (const [u, v, col, r] of [
      [0.2, 0.55, '#e36a2c', 0.6],
      [0.75, 0.35, '#d9472b', -0.4],
      [0.68, 0.8, '#f2a33a', 1.2],
    ] as const) {
      const q = p.iso(u, v);
      p.lineWidth = 0.7;
      mapleLeaf(p, q.x, q.y, 2.8, col, r);
      p.lineWidth = 1;
    }
    if (ready) {
      // tap and sap bucket on the trunk
      const bx = c.x + 0.5;
      const by = c.y - 9;
      p.line([{ x: bx, y: by - 8 }, { x: bx + 0.5, y: by - 5 }], '#9aa3ab', 1.6);
      p.line([{ x: bx - 3.5, y: by - 9 }, { x: bx + 3.5, y: by - 9 }], '#5a6168', 0.9);
      p.cylinder(bx, by, 4, 6, '#b8c2cc');
      p.ellipse(bx, by - 6, 3.2, 1.3, '#d38a2a', null);
      p.ellipse(bx - 0.8, by - 6.3, 1.2, 0.4, '#f2c060', null);
      p.line([{ x: bx - 4, y: by - 4 }, { x: bx + 4, y: by - 4 }], '#8a949e', 0.7);
      p.circle(bx + 0.5, by - 4.2, 0.9, '#e6a23a', null);
    }
  },
};

const TREES_ART: Record<string, TreeArt> = {
  apple_tree: appleTree,
  cherry_tree: cherryTree,
  orange_tree: orangeTree,
  lemon_tree: lemonTree,
  peach_tree: peachTree,
  banana_tree: bananaTree,
  coconut_palm: coconutPalm,
  maple_tree: mapleTree,
};

/** Fallback for any future tree: a generic leafy tree with golden fruit. */
function fallbackTree(t: ProducerDef): TreeArt {
  return {
    height: 74,
    paint: broadleaf({
      seed: t.id,
      trunk: '#8b5a3c',
      trunkH: 26,
      canopyZ: 44,
      clumps: [[0, 0, 21, '#5aa83c']],
      fruit: (p, x, y) => p.ball(x, y, 3, '#f2b53a'),
      fruitN: 8,
      fruitArea: [17, 15],
    }),
  };
}

// ---------------------------------------------------------------------------
// Icons (flat 40×40)

function iconShadow(p: Pen, y = 35, rx = 12): void {
  p.shadow(20, y, rx, 2.6, 0.25);
}

const ICONS: Record<string, (p: Pen) => void> = {
  apple: (p) => {
    iconShadow(p);
    const ctx = p.ctx;
    ctx.beginPath();
    ctx.moveTo(20, 11);
    ctx.bezierCurveTo(26, 6, 35, 10, 33, 21);
    ctx.bezierCurveTo(32, 30, 25, 35, 20, 32);
    ctx.bezierCurveTo(15, 35, 8, 30, 7, 21);
    ctx.bezierCurveTo(5, 10, 14, 6, 20, 11);
    ctx.closePath();
    finish(p, radial(p, 18, 19, 14, '#e53935'));
    p.curve({ x: 20, y: 12 }, { x: 19.5, y: 8 }, { x: 22, y: 4 }, '#6b4426', 1.8);
    leaf(p, 21, 8, 9, -0.35, 6, '#5aa83a');
    p.ellipse(13, 17, 2.4, 3.6, 'rgba(255,255,255,0.6)', null, 0.4);
  },
  cherry: (p) => {
    iconShadow(p, 35, 13);
    leaf(p, 22, 6, 9, -0.3, 5.5, '#5aa83a');
    cherryPair(p, 17, 25, 6.5);
  },
  orange: (p) => {
    iconShadow(p, 35, 13);
    p.ball(20, 22, 12.5, '#f7931e');
    const rand = rng('orange-icon');
    for (let k = 0; k < 14; k++) {
      const a = rand() * Math.PI * 2;
      const d = rand() * 9;
      p.circle(20 + Math.cos(a) * d, 22 + Math.sin(a) * d, 0.5, 'rgba(160,70,0,0.35)', null);
    }
    p.circle(20, 10.5, 1.4, '#6b8a2a', null);
    leaf(p, 20, 10, 9, -0.45, 5.5, '#4f9a3a');
    p.ellipse(14.5, 17, 2.6, 3.6, 'rgba(255,255,255,0.55)', null, 0.5);
  },
  lemon: (p) => {
    iconShadow(p, 34, 14);
    leaf(p, 26, 13, 9, -0.6, 5.5, '#5aa83a');
    lemonShape(p, 20, 22, 10, -0.35);
  },
  peach: (p) => {
    iconShadow(p, 35, 13);
    peach(p, 20, 22, 12);
  },
  banana: (p) => {
    iconShadow(p, 34, 14);
    for (const [ang, len, curl, col] of [
      [-0.55, 25, 7, '#f0c62e'],
      [-0.25, 26, 7, '#f6d23c'],
      [0.05, 24, 7, '#fbdc52'],
    ] as const)
      banana(p, { x: 8, y: 26 }, ang, len, -curl, col, 5);
    p.roundRect(5, 23, 5, 5, 1.5, '#7a8a3a');
  },
  coconut: (p) => {
    iconShadow(p, 35, 15);
    p.ball(24, 18, 11, '#8a5a32');
    const rand = rng('husk');
    for (let k = 0; k < 10; k++) {
      const x = 17 + rand() * 14;
      const y = 10 + rand() * 14;
      p.line([{ x, y }, { x: x + 1.5, y: y + 1 }], '#5e3a1e', 0.7);
    }
    for (const [dx, dy] of [
      [-2, -6],
      [2, -6.5],
      [0, -3.5],
    ])
      p.circle(24 + dx, 18 + dy, 1.1, '#3e2614', null);
    // a cracked half in front
    const ctx = p.ctx;
    ctx.beginPath();
    ctx.ellipse(14, 26, 10, 9, 0, 0, Math.PI);
    ctx.closePath();
    finish(p, radial(p, 14, 28, 10, '#7a4a28'));
    p.ellipse(14, 26, 10, 3.6, '#7a4a28');
    p.ellipse(14, 26, 8.4, 2.8, '#fbf6ea', null);
    p.ellipse(14, 26.4, 6, 1.8, '#eef3f6', null);
  },
  maple_syrup: (p) => {
    iconShadow(p, 36, 12);
    const ctx = p.ctx;
    // jug handle
    ctx.beginPath();
    ctx.ellipse(28.5, 19, 4.5, 5.5, 0, -Math.PI / 2, Math.PI / 2);
    ctx.strokeStyle = p.outline;
    ctx.lineWidth = 3.6;
    ctx.stroke();
    ctx.strokeStyle = '#e6eef2';
    ctx.lineWidth = 2;
    ctx.stroke();
    // glass jug
    ctx.beginPath();
    ctx.moveTo(16, 8);
    ctx.lineTo(24, 8);
    ctx.lineTo(24, 12);
    ctx.bezierCurveTo(31, 14, 31, 18, 31, 24);
    ctx.lineTo(31, 31);
    ctx.quadraticCurveTo(31, 35, 27, 35);
    ctx.lineTo(13, 35);
    ctx.quadraticCurveTo(9, 35, 9, 31);
    ctx.lineTo(9, 24);
    ctx.bezierCurveTo(9, 18, 9, 14, 16, 12);
    ctx.closePath();
    finish(p, 'rgba(235,245,250,0.9)');
    // amber syrup
    ctx.save();
    ctx.clip();
    p.rect(8, 17, 24, 19, p.vgrad(17, 35, '#e89a2a', '#a8551a'), null);
    p.rect(8, 17, 24, 1.6, '#f7c35a', null);
    ctx.restore();
    ctx.beginPath();
    ctx.moveTo(16, 8);
    ctx.lineTo(24, 8);
    ctx.lineTo(24, 12);
    ctx.bezierCurveTo(31, 14, 31, 18, 31, 24);
    ctx.lineTo(31, 31);
    ctx.quadraticCurveTo(31, 35, 27, 35);
    ctx.lineTo(13, 35);
    ctx.quadraticCurveTo(9, 35, 9, 31);
    ctx.lineTo(9, 24);
    ctx.bezierCurveTo(9, 18, 9, 14, 16, 12);
    ctx.closePath();
    finish(p, null);
    // cap
    p.roundRect(15, 4.5, 10, 4.5, 1.2, '#c0533a');
    // label with a maple leaf
    p.roundRect(11.5, 21, 17, 11, 2, '#fbf3df');
    mapleLeaf(p, 20, 26.5, 4.2, '#d9472b');
    // glass shine
    p.line([{ x: 11.5, y: 18 }, { x: 11.5, y: 30 }], 'rgba(255,255,255,0.7)', 1.2);
  },
};

function fallbackIcon(p: Pen): void {
  iconShadow(p);
  p.ball(20, 20, 12, '#f2b53a');
}

// ---------------------------------------------------------------------------
// Exports

export const sprites: SpriteSpec[] = TREE_LIST.flatMap((t) => {
  const art = TREES_ART[t.id] ?? fallbackTree(t);
  return [
    { key: `tree:${t.id}`, fw: 1, fh: 1, height: art.height, paint: (p: Pen) => art.paint(p, false) },
    { key: `tree:${t.id}:ready`, fw: 1, fh: 1, height: art.height, paint: (p: Pen) => art.paint(p, true) },
  ];
});

export const icons: IconSpec[] = TREE_LIST.map((t) => ({
  key: `icon:${t.product}`,
  paint: (p: Pen) => (ICONS[t.product] ?? fallbackIcon)(p),
}));

