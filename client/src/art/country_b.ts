// Country set B: the roadside farm stand, the critters' homes, and the trees and
// shrubs the core set lacks. Painted in the kit's isometric style: lit from the
// top left, chunky rounded shapes, dark-brown outlines, and kawaii faces on the
// animals only. Every item is a 1x1 footprint (fw/fh come from the def).
import { type IconSpec, type Pen, type SpriteSpec, mix, rgba, rng, shade } from './kit';
import { COUNTRY_DECORATIONS } from '@farm/shared';

type Painter = (p: Pen) => void;
interface Pt {
  x: number;
  y: number;
}

const TAU = Math.PI * 2;

const WOOD = '#b98352';
const WOOD_D = '#8d5c36';
const WOOD_L = '#d9aa74';
const IRON = '#3d4549';
const STONE = '#b3afa4';
const BRASS = '#e0ab45';
const TERRA = '#d9824f';
const RED = '#d8483a';
const STRIPE = '#e0624a';
const CREAM = '#fff6e4';
const LEAF = '#5fae4a';
const LEAF_D = '#43893c';
const LEAF_L = '#8fd06a';
const STEM = '#4f8f3a';
const SOIL = '#6b4a2f';
const CARPET = '#7fc4b8';
const ORANGE = '#f2a65a';
const BLUSH = '#ff8fa3';
const INK = '#2b2320';
const LILAC = '#b98be8';
const WISTERIA = '#9a7ae0';

interface BirdColors {
  back: string;
  belly: string;
  head: string;
  beak: string;
}
const BLUEBIRD: BirdColors = { back: '#4c8fe0', belly: '#f6f1e4', head: '#4c8fe0', beak: '#f2a33a' };
const ROBIN: BirdColors = { back: '#7a5036', belly: '#f08a4a', head: '#5a3c2c', beak: '#f2c14a' };

// ---------------------------------------------------------------------------
// Helpers

function qpt(a: Pt, c: Pt, b: Pt, t: number): Pt {
  const s = 1 - t;
  return { x: s * s * a.x + 2 * s * t * c.x + t * t * b.x, y: s * s * a.y + 2 * s * t * c.y + t * t * b.y };
}

function lerp(a: Pt, b: Pt, t: number): Pt {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

/** Soft contact shadow under the footprint centre. */
function contact(p: Pen, rx: number, alpha = 0.24): void {
  const c = p.center;
  p.shadow(c.x, c.y + 1, rx, rx * 0.45, alpha);
}

/** A straight rod with a dark outline underneath: posts, stems, handles. */
function rod(p: Pen, a: Pt, b: Pt, color: string, w: number): void {
  p.line([a, b], p.outline, w + 1.6);
  p.line([a, b], color, w);
}

/** A curved rod bending through control point c. */
function bow(p: Pen, a: Pt, c: Pt, b: Pt, color: string, w: number): void {
  p.curve(a, c, b, p.outline, w + 1.6);
  p.curve(a, c, b, color, w);
}

/** A tapered ribbon along a quadratic curve: trunks, limbs, palm stems. */
function ribbon(p: Pen, a: Pt, c: Pt, b: Pt, w0: number, w1: number, fill: string | CanvasGradient, stroke: string | null = p.outline): void {
  const N = 12;
  const L: Pt[] = [];
  const R: Pt[] = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const q = qpt(a, c, b, t);
    const s0 = qpt(a, c, b, Math.max(0, t - 0.02));
    const s1 = qpt(a, c, b, Math.min(1, t + 0.02));
    const dx = s1.x - s0.x;
    const dy = s1.y - s0.y;
    const d = Math.hypot(dx, dy) || 1;
    const half = (w0 + (w1 - w0) * t) / 2;
    L.push({ x: q.x - (dy / d) * half, y: q.y + (dx / d) * half });
    R.push({ x: q.x + (dy / d) * half, y: q.y - (dx / d) * half });
  }
  p.poly([...L, ...[...R].reverse()], fill, stroke);
}

/** Horizontal gradient for bark and wood: light on the left, shaded on the right. */
function barkGrad(p: Pen, x: number, half: number, base: string): CanvasGradient {
  const g = p.ctx.createLinearGradient(x - half, 0, x + half, 0);
  g.addColorStop(0, shade(base, 0.2));
  g.addColorStop(0.45, base);
  g.addColorStop(1, shade(base, -0.3));
  return g;
}

/** A small pointed leaf from (x, y) along angle ang. */
function blade(p: Pen, x: number, y: number, len: number, ang: number, w: number, color: string): void {
  const tip = { x: x + Math.cos(ang) * len, y: y + Math.sin(ang) * len };
  const mid = { x: x + Math.cos(ang) * len * 0.5, y: y + Math.sin(ang) * len * 0.5 };
  const nx = -Math.sin(ang) * w;
  const ny = Math.cos(ang) * w;
  const c = p.ctx;
  c.beginPath();
  c.moveTo(x, y);
  c.quadraticCurveTo(mid.x + nx, mid.y + ny, tip.x, tip.y);
  c.quadraticCurveTo(mid.x - nx, mid.y - ny, x, y);
  c.closePath();
  c.fillStyle = color;
  c.fill();
  c.strokeStyle = shade(color, -0.45);
  c.lineWidth = 0.6;
  c.stroke();
}

/** A vine with leaves hanging alternately to either side. */
function ivyVine(p: Pen, a: Pt, b: Pt, n: number, seed: string): void {
  const r = rng(seed);
  const mid = { x: (a.x + b.x) / 2 + (r() - 0.5) * 3, y: (a.y + b.y) / 2 };
  p.curve(a, mid, b, STEM, 1.1);
  for (let k = 1; k <= n; k++) {
    const q = qpt(a, mid, b, k / (n + 1));
    const left = k % 2 === 1;
    blade(p, q.x, q.y, 4.6 + r() * 1.5, left ? Math.PI + 0.5 : -0.5, 2.1, k % 3 ? LEAF : LEAF_L);
  }
}

/** A drooping palm frond: a tapered leaf that arcs out and falls to its tip. */
function frond(p: Pen, base: Pt, ang: number, len: number, droop: number, w: number, color: string): void {
  const tip = { x: base.x + Math.cos(ang) * len, y: base.y + Math.sin(ang) * len + droop };
  const ctl = { x: base.x + Math.cos(ang) * len * 0.55, y: base.y + Math.sin(ang) * len * 0.55 - Math.abs(droop) * 0.1 };
  const N = 12;
  const L: Pt[] = [];
  const R: Pt[] = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const q = qpt(base, ctl, tip, t);
    const s0 = qpt(base, ctl, tip, Math.max(0, t - 0.03));
    const s1 = qpt(base, ctl, tip, Math.min(1, t + 0.03));
    const dx = s1.x - s0.x;
    const dy = s1.y - s0.y;
    const d = Math.hypot(dx, dy) || 1;
    const half = w * Math.pow(Math.sin(Math.PI * t), 0.8) * 0.5 + 0.2;
    L.push({ x: q.x - (dy / d) * half, y: q.y + (dx / d) * half });
    R.push({ x: q.x + (dy / d) * half, y: q.y - (dx / d) * half });
  }
  p.poly([...L, ...[...R].reverse()], color, shade(color, -0.4), 0.7);
  p.curve(base, ctl, tip, shade(color, 0.22), 0.7);
  for (let k = 2; k < N - 1; k += 2) {
    const q = qpt(base, ctl, tip, k / N);
    p.line([L[k], lerp(L[k], q, 0.5)], shade(color, -0.4), 0.5);
    p.line([R[k], lerp(R[k], q, 0.5)], shade(color, -0.4), 0.5);
  }
}

/** A kawaii face: dot eyes with glints and two blush spots. */
function face(p: Pen, x: number, y: number, s: number): void {
  for (const dx of [-0.42, 0.42]) {
    p.circle(x + dx * s, y, s * 0.14, INK, null);
    p.circle(x + dx * s - s * 0.05, y - s * 0.06, s * 0.05, '#ffffff', null);
  }
  for (const dx of [-0.72, 0.72]) p.ellipse(x + dx * s, y + s * 0.3, s * 0.2, s * 0.12, rgba(BLUSH, 0.75), null);
}

/** A sleeping face: two little downward arcs for closed eyes. */
function sleepFace(p: Pen, x: number, y: number, s: number): void {
  for (const dx of [-0.42, 0.42]) {
    p.curve({ x: x + (dx - 0.16) * s, y }, { x: x + dx * s, y: y + s * 0.26 }, { x: x + (dx + 0.16) * s, y }, INK, 0.7);
  }
  for (const dx of [-0.72, 0.72]) p.ellipse(x + dx * s, y + s * 0.3, s * 0.2, s * 0.12, rgba(BLUSH, 0.75), null);
}

/** A round-topped opening cut into a wall that lies in the plane v = const. */
function archOnV(p: Pen, u0: number, u1: number, v: number, z0: number, zTop: number, fill: string): void {
  const uc = (u0 + u1) / 2;
  const ru = (u1 - u0) / 2;
  const rPx = ru * 32;
  const pts: Pt[] = [p.iso(u0, v, z0), p.iso(u1, v, z0)];
  for (let k = 0; k <= 10; k++) {
    const a = (k / 10) * Math.PI;
    pts.push(p.iso(uc + ru * Math.cos(a), v, zTop - rPx + rPx * Math.sin(a)));
  }
  p.poly(pts, fill, p.outline, 0.9);
}

/** Front arc of an iron hoop around a barrel. */
function hoop(p: Pen, x: number, y: number, rx: number, ry: number): void {
  const c = p.ctx;
  c.beginPath();
  c.ellipse(x, y, rx, ry, 0, 0, Math.PI);
  c.strokeStyle = p.outline;
  c.lineWidth = 2.4;
  c.stroke();
  c.strokeStyle = IRON;
  c.lineWidth = 1.1;
  c.stroke();
}

/** A songbird facing right (or left when flipped), centred on its body. */
function songbird(p: Pen, x: number, y: number, s: number, col: BirdColors, flip = false): void {
  const d = flip ? -1 : 1;
  p.poly(
    [
      { x: x - d * 3 * s, y: y + 0.6 * s },
      { x: x - d * 10 * s, y: y - 2.6 * s },
      { x: x - d * 8.6 * s, y: y + 2.8 * s },
    ],
    shade(col.back, -0.2),
    p.outline,
    0.7,
  );
  p.line([{ x: x - 1 * s, y: y + 4 * s }, { x: x - 1.6 * s, y: y + 6 * s }], '#8a5a34', 0.8);
  p.line([{ x: x + 1.6 * s, y: y + 4 * s }, { x: x + 1.2 * s, y: y + 6 * s }], '#8a5a34', 0.8);
  p.ellipse(x, y, 5.6 * s, 4.4 * s, col.back);
  p.ellipse(x + d * 1.4 * s, y + 1.6 * s, 3.4 * s, 2.7 * s, col.belly, null);
  p.ellipse(x - d * 0.8 * s, y - 0.4 * s, 3 * s, 1.9 * s, shade(col.back, -0.22), null, -d * 0.25);
  p.circle(x + d * 3.6 * s, y - 4.6 * s, 3.9 * s, col.head);
  p.poly(
    [
      { x: x + d * 7.2 * s, y: y - 5.6 * s },
      { x: x + d * 10.2 * s, y: y - 4.5 * s },
      { x: x + d * 7.2 * s, y: y - 3.4 * s },
    ],
    col.beak,
    p.outline,
    0.6,
  );
  p.circle(x + d * 4.6 * s, y - 5.2 * s, 1.05 * s, INK, null);
  p.circle(x + d * 4.25 * s, y - 5.6 * s, 0.38 * s, '#ffffff', null);
  p.ellipse(x + d * 3.2 * s, y - 2.6 * s, 1.1 * s, 0.7 * s, rgba(BLUSH, 0.75), null);
}

/** A little white bone lying on the ground. */
function bone(p: Pen, x: number, y: number): void {
  p.line([{ x: x - 4.5, y }, { x: x + 4.5, y }], p.outline, 3.6);
  p.line([{ x: x - 4.5, y }, { x: x + 4.5, y }], '#fffaf0', 1.9);
  for (const dx of [-4.5, 4.5]) {
    p.circle(x + dx, y - 1.1, 1.6, '#fffaf0');
    p.circle(x + dx, y + 1.1, 1.6, '#fffaf0');
  }
}

/** A cupped dog bowl with kibble, centred on the bowl's rim. */
function bowl(p: Pen, x: number, y: number): void {
  const c = p.ctx;
  c.beginPath();
  c.moveTo(x - 6, y - 4);
  c.quadraticCurveTo(x, y + 6, x + 6, y - 4);
  c.closePath();
  c.fillStyle = '#e8553f';
  c.fill();
  c.strokeStyle = p.outline;
  c.lineWidth = 1;
  c.stroke();
  p.ellipse(x, y - 4, 6, 2.2, '#fbf3e6');
  p.ellipse(x, y - 4, 4.6, 1.5, '#b87a45', null);
  for (const dx of [-2.4, 0.6, 2.4]) p.circle(x + dx, y - 4, 0.45, '#7a4a25', null);
}

// ---------------------------------------------------------------------------
// Stalls and homes

function farmStand(p: Pen): void {
  contact(p, 28);
  rod(p, p.iso(0.1, 0.3, 0), p.iso(0.1, 0.3, 40), WOOD_D, 2.2);
  rod(p, p.iso(0.9, 0.3, 0), p.iso(0.9, 0.3, 40), WOOD_D, 2.2);
  p.box(0.08, 0.32, 0.84, 0.48, 16, WOOD);
  for (const z of [5.5, 11]) p.line([p.iso(0.08, 0.8, z), p.iso(0.92, 0.8, z)], shade(WOOD, -0.3), 0.6);
  p.box(0.04, 0.3, 0.92, 0.58, 2.5, WOOD_L, 16);
  // price chalkboard on the front-left face
  p.poly([p.iso(0.14, 0.8, 8), p.iso(0.46, 0.8, 8), p.iso(0.46, 0.8, 15), p.iso(0.14, 0.8, 15)], '#3e4f45', WOOD_D, 1.2);
  const m = p.iso(0.3, 0.8, 11.5);
  p.text('$2', m.x, m.y, 5.5, '#f4f1e8');
  // produce crates on the ground out front, heaped with apples and oranges
  p.box(0.52, 0.84, 0.2, 0.13, 6, '#d9a060');
  p.box(0.75, 0.84, 0.18, 0.13, 6, '#c98d4a');
  for (const [u, v] of [
    [0.56, 0.9],
    [0.64, 0.9],
    [0.6, 0.94],
  ] as const) {
    const q = p.iso(u, v, 9);
    p.ball(q.x, q.y, 3, '#e8433a');
  }
  for (const [u, v] of [
    [0.79, 0.9],
    [0.86, 0.9],
    [0.83, 0.94],
  ] as const) {
    const q = p.iso(u, v, 9);
    p.ball(q.x, q.y, 2.8, '#f7931e');
  }
  rod(p, p.iso(0.06, 0.86, 0), p.iso(0.06, 0.86, 32), WOOD_D, 2.4);
  rod(p, p.iso(0.95, 0.86, 0), p.iso(0.95, 0.86, 32), WOOD_D, 2.4);
  // striped awning with a scalloped valance
  const n = 6;
  const stripes: [number, number][] = [];
  for (let i = 0; i < n; i++) stripes.push([0.02 + (i * 0.96) / n, 0.02 + ((i + 1) * 0.96) / n]);
  stripes.forEach(([u0, u1], i) => {
    p.poly([p.iso(u0, 0.26, 41), p.iso(u1, 0.26, 41), p.iso(u1, 0.86, 32), p.iso(u0, 0.86, 32)], i % 2 ? CREAM : STRIPE, p.outline, 0.8);
  });
  stripes.forEach(([u0, u1], i) => {
    const sc = p.iso((u0 + u1) / 2, 0.86, 32);
    p.circle(sc.x, sc.y + 1.5, 2.9, i % 2 ? CREAM : STRIPE, p.outline);
  });
}

function haystack(p: Pen): void {
  contact(p, 27, 0.28);
  const { x: cx, y: cy } = p.center;
  const c = p.ctx;
  const path = (): void => {
    c.beginPath();
    c.moveTo(cx - 24, cy + 1);
    c.bezierCurveTo(cx - 29, cy - 22, cx - 15, cy - 35, cx + 1, cy - 34);
    c.bezierCurveTo(cx + 17, cy - 34, cx + 29, cy - 21, cx + 24, cy + 1);
    c.quadraticCurveTo(cx, cy + 5, cx - 24, cy + 1);
    c.closePath();
  };
  path();
  const g = c.createRadialGradient(cx - 9, cy - 24, 2, cx, cy - 14, 32);
  g.addColorStop(0, '#fbe9a6');
  g.addColorStop(0.55, '#e8c35a');
  g.addColorStop(1, '#b98a35');
  c.fillStyle = g;
  c.fill();
  // straw strands, clipped to the stack
  p.save();
  path();
  c.clip();
  const r = rng('haystack');
  const cols = ['#c99a3a', '#f5d882', '#a87a2c', '#fff0b8'];
  for (let i = 0; i < 64; i++) {
    const x = cx - 28 + r() * 56;
    const y = cy - 38 + r() * 42;
    const a = (r() < 0.5 ? -1 : 1) * (0.55 + r() * 0.7);
    const len = 4 + r() * 4;
    p.line([{ x, y }, { x: x + Math.cos(a) * len, y: y + Math.sin(a) * len }], cols[i % cols.length], 0.8);
  }
  p.restore();
  path();
  c.strokeStyle = p.outline;
  c.lineWidth = 1.1;
  c.stroke();
  // loose straw poking out of the top and sides
  for (const [x, y, a] of [
    [cx - 12, cy - 33, -1.9],
    [cx + 4, cy - 34, -1.5],
    [cx + 14, cy - 30, -0.9],
    [cx - 22, cy - 24, -2.6],
    [cx + 24, cy - 18, -0.3],
  ] as const) {
    p.line([{ x, y }, { x: x + Math.cos(a) * 6, y: y + Math.sin(a) * 6 }], '#c99a3a', 0.9);
  }
  p.curve({ x: cx - 17, y: cy - 22 }, { x: cx - 12, y: cy - 29 }, { x: cx - 3, y: cy - 30 }, rgba('#ffffff', 0.5), 1.4);
  bow(p, { x: cx - 22, y: cy - 11 }, { x: cx, y: cy - 6 }, { x: cx + 22, y: cy - 11 }, '#8d5c36', 1.6);
  // pitchfork stuck in the front of the stack
  const hb = { x: cx + 8, y: cy - 22 };
  const ht = { x: cx + 19, y: cy - 53 };
  rod(p, hb, ht, WOOD_L, 2);
  for (const dx of [-2.6, 0, 2.6]) p.line([{ x: hb.x + dx, y: hb.y + 1 }, { x: hb.x + dx * 0.6, y: hb.y + 7 }], IRON, 1.1);
}

function barrelPlanter(p: Pen): void {
  contact(p, 19, 0.26);
  const { x: cx, y: cy } = p.center;
  const H = 21;
  const R = 15;
  p.cylinder(cx, cy, R, H, WOOD);
  for (const s of [-0.6, -0.22, 0.2, 0.6]) {
    p.line([{ x: cx + s * R, y: cy - H + 7 }, { x: cx + s * R * 0.92, y: cy - 1 }], shade(WOOD, -0.3), 0.6);
  }
  hoop(p, cx, cy - H + 5, R, R / 2);
  hoop(p, cx, cy - 4, R, R / 2);
  p.ellipse(cx, cy - H, R - 2.5, (R - 2.5) / 2, SOIL, shade(SOIL, -0.3));
  p.foliage(cx, cy - H - 6, 12, LEAF, 'barrel', 7);
  const petunias: [number, number, string][] = [
    [-10, -14, '#f25c9a'],
    [0, -18, '#ffffff'],
    [9, -14, '#9a7ae0'],
    [-5, -10, '#ff8fb8'],
    [5, -8, '#f25c9a'],
    [-14, -5, '#9a7ae0'],
    [13, -4, '#ff8fb8'],
    [-2, -2, '#c04fd0'],
    [7, 1, '#ffffff'],
    [-9, 2, '#f25c9a'],
  ];
  for (const [dx, dy, col] of petunias) p.flower(cx + dx, cy - H + dy, 3, col, '#fff1a8');
  // trailing vines spilling over the front of the barrel
  for (const [dx, len, seed] of [
    [-11, 13, 'bv1'],
    [1, 16, 'bv2'],
    [11, 11, 'bv3'],
  ] as const) {
    ivyVine(p, { x: cx + dx, y: cy - H + 2 }, { x: cx + dx * 1.15, y: cy - H + len + 2 }, 3, seed);
  }
}

function wagonWheel(p: Pen): void {
  contact(p, 22, 0.24);
  const { x: cx, y: cy } = p.center;
  const R = 16;
  const hub = { x: cx - 5, y: cy - R - 1 };
  const postX = cx + 15;
  rod(p, { x: postX, y: cy + 1 }, { x: postX, y: cy - 38 }, WOOD_D, 3);
  ivyVine(p, { x: postX, y: cy }, { x: postX - 1, y: cy - 36 }, 7, 'ivy-post');
  // the wheel: outline, then a wooden felloe, then spokes and an iron hub
  const c = p.ctx;
  c.beginPath();
  c.arc(hub.x, hub.y, R, 0, TAU);
  c.strokeStyle = p.outline;
  c.lineWidth = 5.4;
  c.stroke();
  c.strokeStyle = WOOD;
  c.lineWidth = 3.6;
  c.stroke();
  c.strokeStyle = WOOD_L;
  c.lineWidth = 0.9;
  c.beginPath();
  c.arc(hub.x, hub.y, R - 0.6, Math.PI * 1.05, Math.PI * 1.7);
  c.stroke();
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * TAU + 0.2;
    const tip = { x: hub.x + Math.cos(a) * (R - 1.8), y: hub.y + Math.sin(a) * (R - 1.8) };
    p.line([hub, tip], p.outline, 2.4);
    p.line([hub, tip], WOOD_L, 1.2);
  }
  p.circle(hub.x, hub.y, 3.6, IRON);
  p.circle(hub.x - 1, hub.y - 1, 1.1, '#7b858c', null);
  ivyVine(p, { x: hub.x - R + 3, y: cy - 1 }, { x: hub.x - R + 7, y: cy - 22 }, 4, 'ivy-wheel');
}

function weathervane(p: Pen): void {
  contact(p, 13, 0.26);
  const { x: cx, y: cy } = p.center;
  p.cylinder(cx, cy, 6.5, 4.5, STONE);
  rod(p, { x: cx, y: cy - 3 }, { x: cx, y: cy - 58 }, IRON, 2);
  // compass ring with N, E, S, W on little cream tags so they read over the pole
  p.ellipse(cx, cy - 34, 11, 4.6, BRASS);
  p.ellipse(cx, cy - 34, 6.5, 2.7, null, shade(BRASS, -0.35));
  for (const [s, x, y] of [
    ['N', cx, cy - 43],
    ['S', cx, cy - 25],
    ['E', cx + 16, cy - 34],
    ['W', cx - 16, cy - 34],
  ] as const) {
    p.circle(x, y, 4.2, CREAM, WOOD_D);
    p.text(s, x, y + 0.3, 5.5, '#4a3426');
  }
  // rooster on top, facing right
  p.save();
  p.ctx.translate(cx, cy - 60);
  p.ctx.scale(1.5, 1.5);
  p.poly(
    [
      { x: -5, y: 0 },
      { x: -13, y: -6 },
      { x: -11, y: -1 },
      { x: -14, y: 0 },
      { x: -10, y: 2 },
      { x: -5, y: 2 },
    ],
    shade(BRASS, -0.05),
  );
  p.ellipse(0, 0, 7, 4.2, BRASS, p.outline, -0.2);
  p.ellipse(-1, -0.5, 4, 2.2, shade(BRASS, -0.25), null, -0.2);
  p.circle(6, -6, 3.4, BRASS);
  p.poly(
    [
      { x: 4.6, y: -8.6 },
      { x: 6, y: -11.5 },
      { x: 7.2, y: -8.7 },
      { x: 8.6, y: -11 },
      { x: 8.8, y: -7.6 },
    ],
    '#d9482f',
    p.outline,
    0.6,
  );
  p.poly(
    [
      { x: 9.2, y: -6 },
      { x: 12.5, y: -5 },
      { x: 9.2, y: -4 },
    ],
    '#e8862e',
    p.outline,
    0.6,
  );
  p.circle(8, -3.2, 1.2, '#d9482f', null);
  p.circle(6.6, -6.8, 0.8, INK, null);
  p.restore();
}

function birdFeeder(p: Pen): void {
  contact(p, 13, 0.24);
  const { x: cx, y: cy } = p.center;
  rod(p, { x: cx, y: cy + 1 }, { x: cx, y: cy - 36 }, WOOD, 3);
  p.rect(cx - 10, cy - 40, 20, 13, WOOD_L);
  p.circle(cx, cy - 35, 3.2, '#5a4030', p.outline);
  p.rect(cx - 12, cy - 28.5, 24, 2.6, WOOD_D);
  for (let k = -2; k <= 2; k++) p.circle(cx + k * 4, cy - 29.6, 0.9, '#f7d354', null);
  // house roof: lit left slope, shaded right slope
  p.poly(
    [
      { x: cx - 14, y: cy - 40 },
      { x: cx, y: cy - 54 },
      { x: cx + 14, y: cy - 40 },
    ],
    TERRA,
  );
  p.poly(
    [
      { x: cx, y: cy - 54 },
      { x: cx + 14, y: cy - 40 },
      { x: cx, y: cy - 40 },
    ],
    shade(TERRA, -0.22),
    null,
  );
  p.rect(cx - 15, cy - 41.5, 30, 2.6, shade(TERRA, -0.1));
  songbird(p, cx - 6, cy - 52, 1, BLUEBIRD);
  songbird(p, cx + 8, cy - 50, 1, BLUEBIRD, true);
}

function bunnyHutch(p: Pen): void {
  contact(p, 22, 0.26);
  for (const [u, v] of [
    [0.22, 0.24],
    [0.8, 0.24],
    [0.22, 0.78],
    [0.8, 0.78],
  ] as const) {
    rod(p, p.iso(u, v, 0), p.iso(u, v, 11), WOOD_D, 2.2);
  }
  p.box(0.18, 0.2, 0.66, 0.62, 16, WOOD, 11);
  for (const z of [17, 23]) p.line([p.iso(0.18, 0.82, z), p.iso(0.84, 0.82, z)], shade(WOOD, -0.3), 0.6);
  // mesh window on the right wall
  const w0 = p.iso(0.84, 0.36, 15);
  const w1 = p.iso(0.84, 0.66, 15);
  const w2 = p.iso(0.84, 0.66, 24);
  const w3 = p.iso(0.84, 0.36, 24);
  p.poly([w0, w1, w2, w3], '#e6f2f0', p.outline, 0.9);
  for (const t of [1 / 3, 2 / 3]) {
    p.line([lerp(w0, w1, t), lerp(w3, w2, t)], '#9fb8b4', 0.5);
    p.line([lerp(w0, w3, t), lerp(w1, w2, t)], '#9fb8b4', 0.5);
  }
  archOnV(p, 0.4, 0.6, 0.82, 11, 19, '#4a3426');
  p.gableRoof(0.14, 0.16, 0.74, 0.7, 27, 9, TERRA, WOOD, 0.1);
  // a bunny peeking out of the door, and a carrot on the grass
  const hd = p.iso(0.5, 0.95, 12);
  p.ellipse(hd.x - 2.6, hd.y - 8, 1.9, 5.2, '#fbf7f0', p.outline, -0.12);
  p.ellipse(hd.x + 2.4, hd.y - 8.2, 1.9, 5.2, '#fbf7f0', p.outline, 0.12);
  p.ellipse(hd.x - 2.6, hd.y - 8, 0.9, 3.4, '#f7b6c8', null, -0.12);
  p.ellipse(hd.x + 2.4, hd.y - 8.2, 0.9, 3.4, '#f7b6c8', null, 0.12);
  p.circle(hd.x, hd.y, 5.2, '#fbf7f0');
  face(p, hd.x, hd.y + 0.6, 4.6);
  p.ellipse(hd.x, hd.y + 2.6, 1, 0.7, '#f28aa8', null);
  const g = p.iso(0.78, 0.96, 0);
  ribbon(p, { x: g.x - 6, y: g.y - 1 }, { x: g.x - 2, y: g.y - 2 }, { x: g.x + 2, y: g.y + 0.5 }, 3.2, 0.6, '#f08a3a');
  blade(p, g.x - 6, g.y - 1, 4.5, -2.5, 1.8, LEAF);
}

function dogHouse(p: Pen): void {
  contact(p, 24, 0.26);
  p.box(0.12, 0.2, 0.76, 0.6, 19, RED);
  for (const z of [6, 12.5]) p.line([p.iso(0.12, 0.8, z), p.iso(0.88, 0.8, z)], shade(RED, -0.3), 0.6);
  archOnV(p, 0.34, 0.66, 0.8, 0, 12.5, '#3a2a22');
  // name sign on the right wall (the roof's front slope would hide one above the door)
  p.poly([p.iso(0.88, 0.36, 9), p.iso(0.88, 0.64, 9), p.iso(0.88, 0.64, 15), p.iso(0.88, 0.36, 15)], CREAM, WOOD_D, 1);
  const sc = p.iso(0.88, 0.5, 12);
  p.text('Rex', sc.x, sc.y + 0.5, 5.5, '#8a3b2a');
  p.gableRoof(0.1, 0.12, 0.8, 0.7, 19, 10, '#9d3a2f', RED, 0.08);
  const bw = p.iso(0.4, 0.96, 0);
  bowl(p, bw.x, bw.y);
  const bn = p.iso(0.8, 0.92, 0);
  bone(p, bn.x, bn.y);
}

function catTower(p: Pen): void {
  contact(p, 19, 0.26);
  const { x: cx, y: cy } = p.center;
  // rope-wrapped centre post
  p.rect(cx - 2.6, cy - 56, 5.2, 52, '#e6c996');
  for (let y = cy - 53; y < cy - 4; y += 3.2) p.line([{ x: cx - 2.6, y }, { x: cx + 2.6, y: y + 1 }], '#b58a55', 0.7);
  p.cylinder(cx, cy, 15, 4, CARPET);
  p.cylinder(cx, cy - 16, 12, 4, CARPET);
  p.cylinder(cx, cy - 34, 10, 4, CARPET);
  p.cylinder(cx, cy - 52, 13, 5, CARPET);
  // a dangling yarn ball on a string
  p.curve({ x: cx + 11, y: cy - 55 }, { x: cx + 19, y: cy - 48 }, { x: cx + 17, y: cy - 31 }, '#7a6a5a', 0.6);
  p.ball(cx + 17, cy - 28, 4.2, '#ff7aa2');
  p.curve({ x: cx + 13.4, y: cy - 29.6 }, { x: cx + 17, y: cy - 26.8 }, { x: cx + 20.6, y: cy - 27.6 }, rgba('#ffffff', 0.55), 0.6);
  // sleeping kitten on the top perch, scaled up a touch so it reads at tile size
  const kx = cx - 1;
  const ky = cy - 58;
  p.save();
  p.ctx.translate(kx, ky);
  p.ctx.scale(1.3, 1.3);
  p.ctx.translate(-kx, -ky);
  ribbon(p, { x: kx + 7, y: ky + 1 }, { x: kx + 15, y: ky + 2 }, { x: kx + 13, y: ky - 8 }, 2.6, 1.6, ORANGE);
  p.ellipse(kx, ky, 8, 4.6, ORANGE);
  for (const dx of [-3, 1.5, 5]) p.curve({ x: kx + dx, y: ky - 4 }, { x: kx + dx + 1.5, y: ky }, { x: kx + dx, y: ky + 3 }, shade(ORANGE, -0.35), 0.8);
  p.poly(
    [
      { x: kx - 10.5, y: ky - 4.5 },
      { x: kx - 10, y: ky - 10 },
      { x: kx - 5.5, y: ky - 6.8 },
    ],
    ORANGE,
  );
  p.poly(
    [
      { x: kx - 7.5, y: ky - 7.2 },
      { x: kx - 4.5, y: ky - 11 },
      { x: kx - 3.6, y: ky - 5 },
    ],
    ORANGE,
  );
  p.circle(kx - 7, ky - 3, 5.2, ORANGE);
  p.ellipse(kx - 3, ky + 3, 2, 1.2, CREAM);
  sleepFace(p, kx - 7, ky - 2.5, 4);
  p.restore();
}

/** One canoe lying hull-up along the u axis: a long, low, convex hull with pointed, upturned ends. */
function upturnedCanoe(p: Pen, vc: number, u0: number, u1: number, zRail: number, color: string): void {
  const N = 18;
  const PH = 4;
  const HW = 0.17;
  const us: number[] = [];
  for (let i = 0; i <= N; i++) us.push(i / N);
  const sEnd = (t: number): number => Math.pow(Math.sin(Math.PI * t), 0.5);
  const uAt = (t: number): number => u0 + (u1 - u0) * t;
  const hw = (t: number): number => HW * sEnd(t);
  const gun = (t: number): number => zRail + 1 + 3 * (1 - sEnd(t));
  const ridge = (t: number): number => gun(t) + 6 * Math.pow(sEnd(t), 0.6);
  // a point on the hull: along t, across phi (0 = ridge, 1 = gunwale) on side sgn
  const P = (t: number, phi: number, sgn: number): Pt => {
    const ang = (phi * Math.PI) / 2;
    return p.iso(uAt(t), vc + sgn * hw(t) * Math.sin(ang), gun(t) + (ridge(t) - gun(t)) * Math.cos(ang));
  };
  // shaded mesh: lit from the top left, lighter toward the ridge
  for (const sgn of [-1, 1]) {
    for (let i = 0; i < N; i++) {
      for (let j = 0; j < PH; j++) {
        const f0 = j / PH;
        const f1 = (j + 1) / PH;
        const lum = (sgn > 0 ? -0.06 : -0.2) + 0.2 * (1 - (f0 + f1) / 2);
        const col = shade(color, lum);
        p.poly([P(us[i], f0, sgn), P(us[i + 1], f0, sgn), P(us[i + 1], f1, sgn), P(us[i], f1, sgn)], col, col, 0.5);
      }
    }
  }
  // bright gunwale stripe along each edge, and a glossy streak along the ridge
  for (const sgn of [-1, 1]) {
    const edge = us.map((t) => P(t, 1, sgn));
    p.line(edge, p.outline, 1.6);
    p.line(edge, CREAM, 0.8);
  }
  p.line(
    us.slice(2, N - 1).map((t) => P(t, 0.02, 1)),
    rgba('#ffffff', 0.6),
    0.9,
  );
}

/** A chunky wooden end frame in the plane u = const: two splayed legs and a tie beam. */
function rackFrameAt(p: Pen, u: number): void {
  rod(p, p.iso(u, 0.06, 0), p.iso(u, 0.28, 22), WOOD_D, 3);
  rod(p, p.iso(u, 0.94, 0), p.iso(u, 0.72, 22), WOOD_D, 3);
  rod(p, p.iso(u, 0.2, 9), p.iso(u, 0.8, 9), WOOD, 2.4);
}

/** A wooden A-frame rack with two upturned canoes on its rails, and a paddle leaning on it. */
function canoeRack(p: Pen): void {
  contact(p, 26, 0.26);
  rackFrameAt(p, 0.1);
  // two rails running the length of the rack, lifted on the frames
  p.box(0.02, 0.2, 0.96, 0.16, 3, WOOD_L, 22);
  p.box(0.02, 0.64, 0.96, 0.16, 3, WOOD_L, 22);
  upturnedCanoe(p, 0.28, 0.03, 0.97, 25, '#e8553f');
  upturnedCanoe(p, 0.72, 0.03, 0.97, 25, '#2fa7a0');
  rackFrameAt(p, 0.9);
  // paddle with a darker shaft so it stands apart from the frame
  rod(p, p.iso(0.98, 0.5, 0), p.iso(0.9, 0.5, 36), '#6b4426', 2);
  const bl = p.iso(0.9, 0.5, 38);
  p.ellipse(bl.x, bl.y, 3.2, 5.4, '#f2a33a', p.outline, 0.1);
}

// ---------------------------------------------------------------------------
// Trees and shrubs

interface OakPalette {
  dark: string;
  mid: string;
  light: string;
  trunk: string;
}

const OAK_GREEN: OakPalette = { dark: '#3d7f3a', mid: '#5aa64a', light: '#8fcb62', trunk: '#7a5236' };
const OAK_GOLD: OakPalette = { dark: '#c4601f', mid: '#e8912f', light: '#f9c64a', trunk: '#7a5236' };

function drawOak(p: Pen, pal: OakPalette, seed: string, fallen: boolean): void {
  contact(p, 26, 0.28);
  const { x: cx, y: cy } = p.center;
  for (const dx of [-7, 7]) p.ellipse(cx + dx, cy + 0.5, 2.6, 1.6, pal.trunk);
  ribbon(p, { x: cx, y: cy + 1 }, { x: cx - 1.5, y: cy - 16 }, { x: cx + 1, y: cy - 30 }, 9, 5.5, barkGrad(p, cx, 5, pal.trunk));
  ribbon(p, { x: cx, y: cy - 24 }, { x: cx - 8, y: cy - 30 }, { x: cx - 14, y: cy - 40 }, 4.6, 2.2, barkGrad(p, cx, 3, pal.trunk));
  ribbon(p, { x: cx + 1, y: cy - 26 }, { x: cx + 8, y: cy - 32 }, { x: cx + 13, y: cy - 40 }, 4.6, 2.2, barkGrad(p, cx, 3, pal.trunk));
  // canopy: a dark back layer, the main mass, then lit highlights
  p.foliage(cx - 10, cy - 40, 14, pal.dark, seed + 'a', 8);
  p.foliage(cx + 11, cy - 40, 14, pal.dark, seed + 'b', 8);
  p.foliage(cx, cy - 48, 20, pal.mid, seed + 'c', 9);
  p.foliage(cx - 5, cy - 54, 11, pal.light, seed + 'd', 7);
  const r = rng(seed + 'dapples');
  for (let k = 0; k < 14; k++) {
    const x = cx - 18 + r() * 36;
    const y = cy - 66 + r() * 34;
    p.circle(x, y, 1.1, rgba(pal.light, 0.9), null);
  }
  if (fallen) {
    const lr = rng(seed + 'leaves');
    const cols = ['#e36a2c', '#d9472b', '#f2a33a', '#c4601f'];
    for (let k = 0; k < 9; k++) {
      const q = p.iso(0.12 + lr() * 0.76, 0.12 + lr() * 0.76);
      p.ellipse(q.x, q.y, 2.2, 1.1, cols[k % cols.length], null, lr() * 3);
    }
  }
}

/** A cup-shaped magnolia bloom: three overlapping petals, white to pale pink, deeper pink at the base. */
function magnoliaBloom(p: Pen, x: number, y: number, r: number, tilt: number): void {
  const g = p.ctx.createLinearGradient(0, y - r, 0, y + r);
  g.addColorStop(0, '#fffaf6');
  g.addColorStop(0.55, '#fbe1ea');
  g.addColorStop(1, '#f2a0b9');
  p.ellipse(x, y - r * 0.15, r * 0.5, r * 0.85, g, p.outline, tilt);
  p.ellipse(x - r * 0.4, y + r * 0.05, r * 0.46, r * 0.8, g, p.outline, tilt - 0.4);
  p.ellipse(x + r * 0.4, y + r * 0.05, r * 0.46, r * 0.8, g, p.outline, tilt + 0.4);
  p.ellipse(x, y + r * 0.62, r * 0.36, r * 0.22, '#e07a9a', null, tilt);
  p.ellipse(x - r * 0.5, y - r * 0.2, r * 0.12, r * 0.3, rgba('#ffffff', 0.7), null, tilt - 0.4);
}

/** A closed magnolia bud with a green sepal base. */
function magnoliaBud(p: Pen, x: number, y: number, r: number, tilt: number): void {
  p.ellipse(x, y, r * 0.5, r * 0.85, '#f7cbd9', p.outline, tilt);
  p.ellipse(x, y + r * 0.62, r * 0.4, r * 0.25, '#6f9e42', null, tilt);
}

function magnoliaTree(p: Pen): void {
  contact(p, 26, 0.28);
  const { x: cx, y: cy } = p.center;
  const bark = '#7a5236';
  // chunky warm trunk with little root feet, as on the oak
  for (const dx of [-7, 7]) p.ellipse(cx + dx, cy + 0.5, 2.6, 1.6, bark);
  ribbon(p, { x: cx, y: cy + 1 }, { x: cx - 1.5, y: cy - 16 }, { x: cx + 1, y: cy - 30 }, 9, 5.5, barkGrad(p, cx, 5, bark));
  // a few short limbs peeking out under the crown
  ribbon(p, { x: cx, y: cy - 24 }, { x: cx - 8, y: cy - 30 }, { x: cx - 14, y: cy - 38 }, 4.4, 2, barkGrad(p, cx, 3, bark));
  ribbon(p, { x: cx + 1, y: cy - 26 }, { x: cx + 8, y: cy - 31 }, { x: cx + 14, y: cy - 38 }, 4.4, 2, barkGrad(p, cx, 3, bark));
  // pale-pink cloud crown built like the oak's canopy: a wide, rounded dome of
  // dark-outlined puffs, with deeper pink on the lower-right lobes
  const pale = '#f7dbe6';
  const deep = '#eeb6c9';
  p.foliage(cx - 14, cy - 40, 12, pale, 'mg-wl', 7);
  p.foliage(cx + 14, cy - 40, 12, deep, 'mg-wr', 7);
  p.foliage(cx + 8, cy - 34, 10, deep, 'mg-lr', 7);
  p.foliage(cx - 6, cy - 42, 13, pale, 'mg-bl', 8);
  p.foliage(cx, cy - 48, 19, pale, 'mg-main', 9);
  p.foliage(cx - 5, cy - 57, 11, '#fbeaf1', 'mg-top', 7);
  // about 26 cup blossoms over the cloud, biased outward so a few overlap the edge
  const r = rng('magnolia-blooms');
  const pts: Pt[] = [];
  for (let tries = 0; tries < 1500 && pts.length < 26; tries++) {
    const a = r() * TAU;
    const d = 0.45 + 0.6 * Math.sqrt(r());
    const q = { x: cx + Math.cos(a) * 23 * d, y: cy - 49 + Math.sin(a) * 17 * d };
    if (pts.every((o) => Math.hypot(o.x - q.x, o.y - q.y) >= 5.4)) pts.push(q);
  }
  pts.sort((a, b) => a.y - b.y).forEach((q, i) => {
    if (i % 6 === 5) magnoliaBud(p, q.x, q.y, 3.4, r() * 0.8 - 0.4);
    else magnoliaBloom(p, q.x, q.y, 4.6 + r() * 1.6, r() * 0.8 - 0.4);
  });
  // fallen petals on the grass
  const pr = rng('magnolia-petals');
  for (let k = 0; k < 6; k++) {
    const q = p.iso(0.15 + pr() * 0.7, 0.15 + pr() * 0.7);
    p.ellipse(q.x, q.y, 2.2, 1.2, k % 2 ? '#f7b6cf' : '#fde4ee', null, pr() * 3);
  }
}

function wisteriaArch(p: Pen): void {
  contact(p, 24, 0.24);
  const { x: cx, y: cy } = p.center;
  const L = { x: cx - 16, y: cy - 36 };
  const Rt = { x: cx + 16, y: cy - 36 };
  const K = { x: cx, y: cy - 58 };
  rod(p, { x: cx - 16, y: cy + 1 }, L, WOOD_D, 3);
  rod(p, { x: cx + 16, y: cy + 1 }, Rt, WOOD_D, 3);
  rod(p, { x: cx - 16, y: cy - 16 }, { x: cx + 16, y: cy - 16 }, WOOD_L, 1.4);
  bow(p, L, K, Rt, WOOD, 3.2);
  // hanging wisteria clusters from the arch
  const r = rng('wisteria');
  for (const t of [0.14, 0.32, 0.5, 0.68, 0.86]) {
    const q = qpt(L, K, Rt, t);
    const len = 14 + r() * 7;
    p.line([q, { x: q.x + (r() - 0.5) * 2, y: q.y + 3 }], STEM, 0.8);
    blade(p, q.x - 1, q.y + 2, 4.5, -2.1, 1.8, LEAF);
    for (let k = 0; k < 7; k++) {
      const yy = q.y + 3 + k * (len / 7);
      const xx = q.x + Math.sin(k * 1.3 + t * 9) * 1.2;
      const col = [WISTERIA, LILAC, '#7a5ad0', '#c8b4f4'][(k + Math.round(t * 10)) % 4];
      p.circle(xx, yy, Math.max(1.2, 2.7 - k * 0.22), col, shade(WISTERIA, -0.45));
    }
  }
}

function lilacCone(p: Pen, x: number, y: number, s: number, col: string): void {
  for (let i = 0; i < 4; i++) {
    const yy = y + i * s * 1.25;
    for (let j = 0; j <= i; j++) {
      const xx = x + (j - i / 2) * s * 1.25;
      p.circle(xx, yy, s * 0.62, mix(col, '#ffffff', ((i + j) % 3) * 0.08), shade(col, -0.45));
    }
  }
}

function lilacBush(p: Pen): void {
  contact(p, 22, 0.25);
  const { x: cx, y: cy } = p.center;
  p.foliage(cx - 9, cy - 9, 11, LEAF_D, 'lilac-a', 7);
  p.foliage(cx + 9, cy - 9, 11, LEAF_D, 'lilac-b', 7);
  p.foliage(cx, cy - 15, 15, '#5aaa48', 'lilac', 8);
  const cones: [number, number, number, string][] = [
    [-4, -22, 2.6, LILAC],
    [-13, -29, 2.6, '#9a6ad8'],
    [15, -27, 2.5, '#d3a8f0'],
    [2, -36, 2.7, '#b98be8'],
  ];
  for (const [dx, dy, s, col] of cones) lilacCone(p, cx + dx, cy + dy, s, col);
}

function palmTree(p: Pen): void {
  contact(p, 20, 0.28);
  const { x: cx, y: cy } = p.center;
  const base = { x: cx - 1, y: cy + 1 };
  const ctl = { x: cx - 8, y: cy - 26 };
  const crown = { x: cx + 3, y: cy - 50 };
  ribbon(p, base, ctl, crown, 6.4, 3.6, barkGrad(p, cx, 4, '#a6774f'));
  for (let t = 0.12; t < 0.95; t += 0.14) {
    const q = qpt(base, ctl, crown, t);
    p.line([{ x: q.x - 2.8, y: q.y + 0.4 }, { x: q.x + 2.8, y: q.y - 0.4 }], '#7a5236', 0.7);
  }
  p.ball(crown.x - 2, crown.y + 3, 2.6, '#8a5a32');
  p.ball(crown.x + 2, crown.y + 3.5, 2.6, '#8a5a32');
  p.ball(crown.x, crown.y + 6, 2.6, '#8a5a32');
  const fronds: [number, number, number, number, string][] = [
    [-2.95, 24, 6, 9, LEAF_D],
    [-2.3, 26, 9, 9, '#4f9e42'],
    [-1.55, 20, 7, 8, '#5cae45'],
    [-0.95, 16, 4, 7, LEAF],
    [-0.2, 16, 9, 7, '#4f9e42'],
    [0.5, 14, 10, 6, LEAF_D],
  ];
  for (const [ang, len, droop, w, col] of fronds) frond(p, crown, ang, len, droop, w, col);
  p.circle(crown.x, crown.y, 2.4, '#7a5636');
}

function fruitHedge(p: Pen): void {
  contact(p, 25, 0.26);
  const { x: cx, y: cy } = p.center;
  p.foliage(cx - 10, cy - 9, 11, '#4a9a3e', 'hedge-a', 7);
  p.foliage(cx + 10, cy - 9, 11, '#4a9a3e', 'hedge-b', 7);
  p.foliage(cx, cy - 14, 14, '#5aaa48', 'hedge-c', 8);
  const berries: [number, number, string][] = [
    [-13, -8, '#e8434a'],
    [-4, -4, '#5a6fd0'],
    [5, -6, '#e8434a'],
    [13, -9, '#5a6fd0'],
    [-9, -17, '#5a6fd0'],
    [0, -20, '#e8434a'],
    [9, -17, '#e8434a'],
    [-16, -2, '#e8434a'],
    [15, -2, '#5a6fd0'],
    [-1, -11, '#e8434a'],
    [3, 1, '#5a6fd0'],
  ];
  for (const [dx, dy, col] of berries) p.ball(cx + dx, cy + dy, 1.9, col);
  songbird(p, cx + 7, cy - 36, 1.05, ROBIN);
}

function fallbackPlant(p: Pen): void {
  contact(p, 20);
  const { x: cx, y: cy } = p.center;
  p.foliage(cx, cy - 12, 13, LEAF, 'fallback', 7);
  p.flower(cx - 6, cy - 19, 2.6, '#f48fb8', '#fff1a8');
  p.flower(cx + 5, cy - 21, 2.6, '#ffd84a', '#f39a3c');
}

// ---------------------------------------------------------------------------
// Exports

const TABLE: Record<string, [number, Painter]> = {
  farm_stand: [42, farmStand],
  haystack: [46, haystack],
  barrel_planter: [40, barrelPlanter],
  wagon_wheel: [34, wagonWheel],
  weathervane: [66, weathervane],
  bird_feeder: [50, birdFeeder],
  bunny_hutch: [40, bunnyHutch],
  dog_house: [38, dogHouse],
  cat_tower: [62, catTower],
  canoe_rack: [40, canoeRack],
  oak_tree: [80, (p) => drawOak(p, OAK_GREEN, 'oak', false)],
  autumn_oak: [80, (p) => drawOak(p, OAK_GOLD, 'autumn', true)],
  magnolia_tree: [76, magnoliaTree],
  wisteria_arch: [52, wisteriaArch],
  lilac_bush: [36, lilacBush],
  palm_tree: [66, palmTree],
  fruit_hedge: [42, fruitHedge],
};

const FALLBACK: [number, Painter] = [34, fallbackPlant];

export const sprites: SpriteSpec[] = COUNTRY_DECORATIONS.slice(18).map((d) => {
  const [height, paint] = TABLE[d.id] ?? FALLBACK;
  return { key: `deco:${d.id}`, fw: d.w, fh: d.h, height, paint };
});

export const icons: IconSpec[] = [];
