// Festival decorations, set A: Hanami, Earth Day, Tanabata, Mid-Autumn and
// Thanksgiving. Covers FESTIVAL_DECORATIONS.slice(0, 17); footprints come from
// the content definitions. Painters go back-to-front and light from the top-left.
import { type IconSpec, type Pen, type Pt, type SpriteSpec, OUTLINE, mix, rgba, rng, shade } from './kit';
import { FESTIVAL_DECORATIONS } from '@farm/shared';

const O = OUTLINE;
const TAU = Math.PI * 2;
const WOOD = '#c98b53';
const WOOD_LT = '#ebb880';
const WOOD_DK = '#7a4b2e';
const LEAF = '#5fae4a';
const PINK = '#ff8fb3';
const RED = '#e5344f';
const GOLD = '#f4c24a';
const DARK = '#2b1d18';
const CREAM = '#fff6ea';

type Painter = (p: Pen) => void;
/** Footprint-local tile coordinates. */
type UV = { u: number; v: number };

// ---------------------------------------------------------------------------
// Helpers

/** Thick outlined stroke (branches, poles, handles). */
function thick(p: Pen, pts: Pt[], w: number, color: string): void {
  p.line(pts, O, w + 1.6);
  p.line(pts, color, w);
}

function thickCurve(p: Pen, a: Pt, c: Pt, b: Pt, w: number, color: string): void {
  p.curve(a, c, b, O, w + 1.6);
  p.curve(a, c, b, color, w);
}

/** Point on a quadratic curve. */
function qpt(a: Pt, c: Pt, b: Pt, t: number): Pt {
  const s = 1 - t;
  return { x: s * s * a.x + 2 * s * t * c.x + t * t * b.x, y: s * s * a.y + 2 * s * t * c.y + t * t * b.y };
}

function lerpPt(a: Pt, b: Pt, t: number): Pt {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

function lerpUV(a: UV, b: UV, t: number): UV {
  return { u: a.u + (b.u - a.u) * t, v: a.v + (b.v - a.v) * t };
}

function radial(p: Pen, x: number, y: number, r: number, inner: string, outer: string): CanvasGradient {
  const g = p.ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r);
  g.addColorStop(0, inner);
  g.addColorStop(1, outer);
  return g;
}

function hgrad(p: Pen, x0: number, x1: number, left: string, right: string): CanvasGradient {
  const g = p.ctx.createLinearGradient(x0, 0, x1, 0);
  g.addColorStop(0, left);
  g.addColorStop(1, right);
  return g;
}

/** Draw in a frame centred on (x, y), rotated and scaled. */
function withXform(p: Pen, x: number, y: number, rot: number, fn: () => void, s = 1): void {
  const ctx = p.ctx;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.scale(s, s);
  fn();
  ctx.restore();
}

/** Draw in the plane of an iso wall running along the u axis: x runs along the wall, y = -z. */
function onWallU(p: Pen, o: Pt, fn: () => void): void {
  const ctx = p.ctx;
  ctx.save();
  ctx.translate(o.x, o.y);
  ctx.transform(1, 0.5, 0, 1, 0, 0);
  fn();
  ctx.restore();
}

/** A flat quad on an iso wall from footprint point a to b, between heights z0 and z1. */
function wallQuad(p: Pen, a: UV, b: UV, z0: number, z1: number, fill: string): void {
  p.poly([p.iso(a.u, a.v, z1), p.iso(b.u, b.v, z1), p.iso(b.u, b.v, z0), p.iso(a.u, a.v, z0)], fill, O, 0.8);
}

/** A wooden or lacquered upright. (x, y) is its foot. */
function post(p: Pen, x: number, y: number, ht: number, color: string, w = 3.6): void {
  p.ellipse(x, y, w * 0.95, w * 0.42, shade(color, -0.3));
  p.rect(x - w / 2, y - ht, w, ht, hgrad(p, x - w / 2, x + w / 2, shade(color, 0.2), shade(color, -0.2)));
  p.ellipse(x, y - ht, w / 2, w / 4, shade(color, 0.35));
}

/** Kawaii face: glossy dot eyes, a small smile and pink cheeks. */
function face(p: Pen, x: number, y: number, s = 1): void {
  for (const dx of [-1.8, 1.8]) {
    p.ellipse(x + dx * s, y, 1.05 * s, 1.3 * s, DARK, null);
    p.circle(x + (dx + 0.4) * s, y - 0.5 * s, 0.42 * s, '#ffffff', null);
  }
  p.curve({ x: x - 1.1 * s, y: y + 1.5 * s }, { x, y: y + 2.9 * s }, { x: x + 1.1 * s, y: y + 1.5 * s }, DARK, Math.max(0.6, 0.6 * s));
  for (const dx of [-3.4, 3.4]) p.ellipse(x + dx * s, y + 1.2 * s, 1.2 * s, 0.75 * s, rgba('#ff7a9a', 0.75), null);
}

/** Five-petal cherry blossom. */
function sakura(p: Pen, x: number, y: number, r: number, col: string, rot = 0): void {
  const edge = shade(col, -0.35);
  p.lineWidth = r < 3 ? 0.6 : 0.8;
  for (let i = 0; i < 5; i++) {
    const a = rot + (i / 5) * TAU;
    p.ellipse(x + Math.cos(a) * r * 0.5, y + Math.sin(a) * r * 0.5, r * 0.52, r * 0.42, col, edge, a);
  }
  p.lineWidth = 1;
  p.circle(x, y, r * 0.2, '#ffe066', null);
}

/** A single petal, lying flat or drifting. */
function petal(p: Pen, x: number, y: number, s: number, rot: number, col: string): void {
  p.ellipse(x, y, s, s * 0.6, col, shade(col, -0.3), rot);
  p.ellipse(x - s * 0.3, y - s * 0.15, s * 0.45, s * 0.2, rgba('#ffffff', 0.6), null, rot);
}

/** A leaf from (x, y) pointing along ang. */
function leaf(p: Pen, x: number, y: number, len: number, ang: number, color: string): void {
  withXform(p, x, y, ang, () => {
    const ctx = p.ctx;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(len * 0.5, -len * 0.42, len, 0);
    ctx.quadraticCurveTo(len * 0.5, len * 0.42, 0, 0);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = O;
    ctx.lineWidth = 0.7;
    ctx.stroke();
  });
}

/** Four-point sparkle. */
function sparkle(p: Pen, x: number, y: number, r: number, color = '#fff6c0'): void {
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
    color,
    null,
  );
}

/** Teardrop flame with its base at (x, y). */
function flame(p: Pen, x: number, y: number, s: number): void {
  p.glow(x, y - s, s * 4, '#ffb03a', 0.5);
  const ctx = p.ctx;
  ctx.beginPath();
  ctx.moveTo(x, y - s * 2.6);
  ctx.quadraticCurveTo(x + s * 0.9, y - s * 1.4, x + s * 0.6, y - s * 0.6);
  ctx.quadraticCurveTo(x, y + s * 0.2, x - s * 0.6, y - s * 0.6);
  ctx.quadraticCurveTo(x - s * 0.9, y - s * 1.4, x, y - s * 2.6);
  ctx.closePath();
  ctx.fillStyle = '#ff9a2e';
  ctx.fill();
  ctx.strokeStyle = shade('#ff9a2e', -0.3);
  ctx.lineWidth = 0.7;
  ctx.stroke();
  p.ellipse(x, y - s * 0.9, s * 0.3, s * 0.6, '#fff3a6', null);
}

/** Round paper lantern hung from `top`, with a warm halo. */
function paperLantern(p: Pen, x: number, top: number, r: number, color: string): void {
  const cy = top + r + 1.5;
  p.glow(x, cy, r * 2.8, mix(color, '#fff3b0', 0.5), 0.5);
  p.line([{ x, y: top }, { x, y: cy - r }], O, 0.6);
  p.circle(x, cy, r, radial(p, x, cy, r * 1.2, shade(color, 0.5), shade(color, -0.1)));
  for (const k of [-0.55, 0, 0.55]) {
    const hw = Math.sqrt(1 - k * k) * r;
    p.curve({ x: x - hw, y: cy + k * r }, { x, y: cy + k * r + r * 0.2 }, { x: x + hw, y: cy + k * r }, shade(color, -0.3), 0.7);
  }
  p.rect(x - r * 0.4, cy - r - 1.2, r * 0.8, 1.6, GOLD);
  p.rect(x - r * 0.4, cy + r - 0.4, r * 0.8, 1.6, GOLD);
  p.ellipse(x - r * 0.45, cy - r * 0.2, r * 0.16, r * 0.3, rgba('#ffffff', 0.6), null);
}

/** Recycling chevrons: three arrows chasing round a circle. */
function recycleMark(p: Pen, x: number, y: number, r: number, color: string): void {
  for (let k = 0; k < 3; k++) {
    const a0 = (k / 3) * TAU - Math.PI / 2 + 0.25;
    const a1 = a0 + TAU / 3 - 0.6;
    const arc: Pt[] = [];
    for (let i = 0; i <= 8; i++) {
      const a = a0 + ((a1 - a0) * i) / 8;
      arc.push({ x: x + Math.cos(a) * r, y: y + Math.sin(a) * r });
    }
    p.line(arc, color, 1.1);
    const e = arc[arc.length - 1];
    const tx = -Math.sin(a1);
    const ty = Math.cos(a1);
    const nx = Math.cos(a1);
    const ny = Math.sin(a1);
    p.poly(
      [
        { x: e.x + tx * 2.4, y: e.y + ty * 2.4 },
        { x: e.x + nx * 1.5, y: e.y + ny * 1.5 },
        { x: e.x - nx * 1.5, y: e.y - ny * 1.5 },
      ],
      color,
      null,
    );
  }
}

/** Ribbon of constant width along a quadratic curve; `notch` cuts a swallowtail end. */
function ribbon(p: Pen, a: Pt, c: Pt, b: Pt, w: number, color: string, notch = true): void {
  const N = 10;
  const pts: Pt[] = [];
  for (let i = 0; i <= N; i++) pts.push(qpt(a, c, b, i / N));
  const L: Pt[] = [];
  const R: Pt[] = [];
  for (let i = 0; i <= N; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[Math.min(N, i + 1)];
    const dx = p1.x - p0.x;
    const dy = p1.y - p0.y;
    const len = Math.hypot(dx, dy) || 1;
    const nx = (-dy / len) * (w / 2);
    const ny = (dx / len) * (w / 2);
    L.push({ x: pts[i].x + nx, y: pts[i].y + ny });
    R.push({ x: pts[i].x - nx, y: pts[i].y - ny });
  }
  const end = pts[N];
  const back = pts[N - 1];
  const dl = Math.hypot(end.x - back.x, end.y - back.y) || 1;
  const notchPt = { x: end.x - ((end.x - back.x) / dl) * w * 0.7, y: end.y - ((end.y - back.y) / dl) * w * 0.7 };
  const shape = notch ? [...L, notchPt, ...R.reverse()] : [...L, ...R.reverse()];
  p.poly(shape, color, O, 0.8);
}

// ---------------------------------------------------------------------------
// Hanami (cherry blossom viewing)

function hanamiPicnic(p: Pen): void {
  const u0 = 0.1;
  const v0 = 0.1;
  const S = 1.8;
  // gingham sheet
  p.diamond(u0, v0, S, S, '#fff4f8', shade(PINK, -0.25), 0);
  const n = 6;
  const cs = S / n;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if ((i + j) % 2 === 0) p.diamond(u0 + i * cs, v0 + j * cs, cs, cs, rgba('#ffb3c9', 0.5), null, 0);
    }
  }
  p.diamond(u0 + 0.07, v0 + 0.07, S - 0.14, S - 0.14, null, rgba('#ffffff', 0.85), 0);

  // petals scattered on the sheet
  const rand = rng('hanami-picnic');
  for (let i = 0; i < 14; i++) {
    const q = p.iso(u0 + 0.15 + rand() * (S - 0.3), v0 + 0.15 + rand() * (S - 0.3), 0);
    petal(p, q.x, q.y, 2.6, rand() * 3.2, rand() < 0.5 ? '#ffc2d6' : '#ffe3ec');
  }

  // two-tier lacquered bento with a blossom on the lid
  p.box(0.3, 0.34, 0.6, 0.42, 3.5, '#c8423a', 0);
  p.box(0.34, 0.38, 0.52, 0.34, 2.6, '#fff6ea', 3.5);
  const lid = p.iso(0.6, 0.55, 6.1);
  sakura(p, lid.x, lid.y, 3.2, '#ff9fbe', 0.2);

  // green bento on the front edge
  p.box(1.12, 1.06, 0.44, 0.34, 3, '#fff6ea', 0);
  p.box(1.12, 1.06, 0.44, 0.34, 1.4, '#7fd8a0', 3);

  // dango plate
  const d = p.iso(0.7, 1.5, 0);
  p.ellipse(d.x, d.y - 1, 10, 5, '#ffffff');
  p.ellipse(d.x, d.y - 1.4, 8, 3.8, '#f3ece2', null);
  p.ball(d.x - 2.7, d.y - 3.6, 2.6, '#ffb3c8');
  p.ball(d.x + 2.7, d.y - 3.4, 2.6, '#fffdf7');
  p.ball(d.x, d.y - 6.6, 2.5, '#a8e6a0');

  // teapot with a face, and a cup of tea
  const t = p.iso(1.55, 0.42, 0);
  thickCurve(p, { x: t.x - 4, y: t.y - 6 }, { x: t.x - 9, y: t.y - 6 }, { x: t.x - 6, y: t.y - 1 }, 1.6, '#9ed98a');
  p.ball(t.x, t.y - 6, 5.6, '#b9e6c0');
  thickCurve(p, { x: t.x + 4.5, y: t.y - 6 }, { x: t.x + 8, y: t.y - 5 }, { x: t.x + 9, y: t.y - 10 }, 1.8, '#9ed98a');
  p.ellipse(t.x, t.y - 11.6, 2.4, 0.9, '#8fbf7a');
  p.circle(t.x, t.y - 12.6, 0.9, '#ffd166', null);
  face(p, t.x, t.y - 5.6, 0.6);
  const cup = p.iso(1.22, 0.9, 0);
  p.cylinder(cup.x, cup.y, 3, 3.6, '#ffffff');
  p.ellipse(cup.x, cup.y - 3.6, 3, 1.4, '#f6a3bf', null);

  // falling blossoms, drifting above the sheet
  const air = rng('hanami-air');
  for (let i = 0; i < 7; i++) {
    const q = p.iso(0.2 + air() * 1.6, 0.2 + air() * 1.6, 6 + air() * 22);
    petal(p, q.x, q.y, 2.4, air() * 3, '#ffc2d6');
  }
}

function sakuraArch(p: Pen): void {
  const { x, y } = p.center;
  p.shadow(x, y + 2, 26, 9, 0.2);
  const rand = rng('sakura-arch');
  for (let i = 0; i < 9; i++) {
    const q = p.iso(0.25 + rand() * 0.5, 0.25 + rand() * 0.5, 0);
    petal(p, q.x, q.y, 2.2, rand() * 3, '#ffc2d6');
  }
  const half = 20;
  const postHt = 30;
  const rise = 15;
  for (const sx of [-half, half]) post(p, x + sx, y, postHt, '#fbe9ee', 4.2);
  const a = { x: x - half, y: y - postHt };
  const b = { x: x + half, y: y - postHt };
  const cPt = { x, y: y - postHt - rise * 2 };
  thickCurve(p, a, cPt, b, 6, '#ffc7d9');
  const cols = ['#ffffff', '#ffb3c9', '#ff8fb3', '#ffd1df'];
  const blooms: { x: number; y: number; col: string }[] = [];
  for (let i = 0; i <= 12; i++) {
    const q = qpt(a, cPt, b, i / 12);
    blooms.push({ x: q.x, y: q.y - 1.5 + (i % 2) * 2, col: cols[i % cols.length] });
  }
  blooms.sort((m, n) => m.y - n.y);
  for (const f of blooms) sakura(p, f.x, f.y, 3.9, f.col, f.x);
  const apex = qpt(a, cPt, b, 0.5);
  p.line([{ x: apex.x, y: apex.y + 3 }, { x: apex.x, y: apex.y + 9 }], O, 0.6);
  p.ball(apex.x, apex.y + 10, 2.4, PINK);
}

function paperLanternTree(p: Pen): void {
  const { x, y } = p.center;
  // little picnic mat under the tree
  p.diamond(0.2, 0.2, 0.6, 0.6, '#ffe6ef', shade(PINK, -0.2), 0);
  p.shadow(x, y + 1, 18, 7, 0.2);
  const bark = '#7a4b2e';
  thick(p, [{ x, y }, { x: x - 1, y: y - 16 }, { x: x + 1, y: y - 26 }], 5, bark);
  thick(p, [{ x, y: y - 22 }, { x: x - 9, y: y - 32 }], 2.2, bark);
  thick(p, [{ x: x + 1, y: y - 24 }, { x: x + 9, y: y - 33 }], 2.2, bark);
  p.foliage(x, y - 40, 16, '#ffc2d6', 'lantern-tree', 8);
  const rand = rng('lantern-tree');
  for (let i = 0; i < 10; i++) {
    sakura(p, x + (rand() - 0.5) * 26, y - 40 + (rand() - 0.5) * 18, 2.4, rand() < 0.5 ? '#ffffff' : '#ff9fbe', rand() * TAU);
  }
  p.glow(x, y - 28, 24, '#ffd0dc', 0.22);
  paperLantern(p, x - 13, y - 27, 4.4, '#e5344f');
  paperLantern(p, x + 12, y - 26, 4.2, '#ff8a3d');
  paperLantern(p, x - 3, y - 22, 3.6, '#ffc2d6');
  paperLantern(p, x + 6, y - 19, 3.4, '#ffe066');
}

function dangoStand(p: Pen): void {
  const c = p.center;
  p.shadow(c.x, c.y + 2, 24, 9, 0.2);
  const wood = { top: '#fff1dc', left: '#e0a46a', right: '#b77a45' };
  // counter
  p.box(0.12, 0.3, 0.76, 0.52, 12, wood, 0);
  for (const z of [4, 8]) p.line([p.iso(0.12, 0.82, z), p.iso(0.88, 0.82, z)], shade(wood.left, -0.3), 0.8);
  // tray of dango skewers
  p.diamond(0.14, 0.34, 0.54, 0.38, '#fffaf3', O, 12.2);
  for (let k = 0; k < 3; k++) {
    const v = 0.42 + k * 0.1;
    const a = p.iso(0.2, v, 13.6);
    const b = p.iso(0.62, v, 13.6);
    p.line([a, b], '#c9955a', 1.2);
    const cols = [PINK, '#fffdf7', '#a8e6a0'];
    for (let j = 0; j < 3; j++) {
      const q = lerpPt(a, b, 0.25 + j * 0.25);
      p.ball(q.x, q.y - 2.2, 2.3, cols[(j + k) % 3]);
    }
  }
  // chibi dango mascot on the counter
  const m = p.iso(0.8, 0.5, 12);
  p.ball(m.x, m.y - 4.4, 4.4, '#fffaf4');
  p.ball(m.x, m.y - 10.2, 3.1, '#ffb3c8');
  face(p, m.x, m.y - 4.2, 0.6);

  // side posts with gold finials
  const L: UV = { u: 0.06, v: 0.94 };
  const F: UV = { u: 0.94, v: 0.94 };
  const R: UV = { u: 0.94, v: 0.06 };
  for (const q of [L, R]) {
    const b = p.iso(q.u, q.v, 0);
    post(p, b.x, b.y, 44, '#b77a45', 3.4);
    const t = p.iso(q.u, q.v, 44);
    p.circle(t.x, t.y - 2, 2, GOLD);
  }
  // striped valance and split noren curtain along both front edges
  for (const [a, b] of [
    [L, F],
    [F, R],
  ] as const) {
    const n = 6;
    for (let i = 0; i < n; i++) {
      wallQuad(p, lerpUV(a, b, i / n), lerpUV(a, b, (i + 1) / n), 38, 44, i % 2 ? CREAM : RED);
    }
    wallQuad(p, a, b, 24, 38, CREAM);
    wallQuad(p, a, b, 24, 26.5, RED);
  }
  // dango emblem on the noren
  const e = p.iso(0.5, 0.94, 35);
  p.ball(e.x - 2.4, e.y + 2.2, 2.2, PINK);
  p.ball(e.x + 2.4, e.y + 2.2, 2.2, '#a8e6a0');
  p.ball(e.x, e.y - 1.8, 2.2, '#fffdf7');
}

// ---------------------------------------------------------------------------
// Earth Day

function recyclingBins(p: Pen): void {
  const { x, y } = p.center;
  p.shadow(x, y + 2, 26, 8, 0.2);
  const bin = (bx: number, by: number, col: string): void => {
    const H = 15;
    p.cylinder(bx, by, 5.8, H, col);
    p.curve({ x: bx - 5.8, y: by - 5 }, { x: bx, y: by - 2 }, { x: bx + 5.8, y: by - 5 }, '#ffffff', 1.2);
    p.ellipse(bx, by - H - 0.4, 6.6, 3.5, shade(col, 0.12));
    p.rect(bx - 2.6, by - H - 1.4, 5.2, 1.4, '#2b2b2b', null);
    face(p, bx, by - 11, 0.8);
    recycleMark(p, bx, by - 5.2, 2.2, '#ffffff');
  };
  bin(x, y - 1, '#ffd84a');
  bin(x - 15, y + 1, '#4dabf7');
  bin(x + 15, y + 1, '#69db7c');
  sparkle(p, x - 23, y - 24, 2.6);
  sparkle(p, x + 22, y - 26, 2.2);
}

function solarLamp(p: Pen): void {
  const { x, y } = p.center;
  p.shadow(x, y + 1, 12, 5, 0.22);
  // stone base and pole
  p.cylinder(x, y, 6.5, 3.5, '#b7b0a4');
  p.rect(x - 1.4, y - 40, 2.8, 37, hgrad(p, x - 1.4, x + 1.4, '#9aa6b8', '#5b6474'));
  // lantern head with a glow and a kawaii face
  p.glow(x, y - 22, 22, '#fff1a8', 0.55);
  p.poly([{ x: x - 7, y: y - 27 }, { x: x + 7, y: y - 27 }, { x, y: y - 34 }], '#4a5568');
  p.ellipse(x, y - 21, 6.4, 7.2, radial(p, x, y - 21, 8, '#fffdf0', '#ffd166'));
  face(p, x, y - 20, 0.7);
  p.rect(x - 4.4, y - 14.8, 8.8, 2, '#5b6474');
  // tilted solar panel on top
  const panel: Pt[] = [
    { x: x - 11, y: y - 42 },
    { x: x + 11, y: y - 48 },
    { x: x + 11, y: y - 41 },
    { x: x - 11, y: y - 35 },
  ];
  p.poly(panel, '#2d4a7a', O, 1);
  for (const t of [0.25, 0.5, 0.75]) p.line([lerpPt(panel[0], panel[1], t), lerpPt(panel[3], panel[2], t)], '#6f93c7', 0.6);
  p.line([lerpPt(panel[0], panel[3], 0.5), lerpPt(panel[1], panel[2], 0.5)], '#6f93c7', 0.6);
  p.line([panel[0], panel[1]], '#b9d4ff', 1);
  sparkle(p, x + 15, y - 50, 2.2, '#ffe9a0');
}

function saplingPot(p: Pen): void {
  const { x, y } = p.center;
  p.shadow(x, y + 1, 14, 6, 0.2);
  // watering can, behind the pot
  const can = '#5fb3f0';
  thickCurve(p, { x: x + 8, y: y - 5 }, { x: x + 11, y: y - 15 }, { x: x + 15, y: y - 5 }, 1.4, can);
  thick(p, [{ x: x + 14.6, y: y - 3 }, { x: x + 19.5, y: y - 9 }], 1.4, can);
  p.cylinder(x + 11, y, 4.4, 7, can);
  p.ellipse(x + 11, y - 7, 2.2, 0.9, '#9ed8ff', null);
  // pot with a face
  p.poly(
    [
      { x: x - 7.5, y: y - 14 },
      { x: x + 7.5, y: y - 14 },
      { x: x + 5.5, y },
      { x: x - 5.5, y },
    ],
    hgrad(p, x - 7.5, x + 7.5, '#e8905e', '#c8643a'),
  );
  p.roundRect(x - 9, y - 17, 18, 4.5, 1.8, '#e27d4e');
  p.ellipse(x, y - 16.6, 7.6, 2.2, '#6b4226');
  face(p, x, y - 8, 0.8);
  // sapling with a heart-shaped leaf
  thick(p, [{ x, y: y - 17 }, { x: x + 0.5, y: y - 25 }], 1.6, '#8a5a3a');
  leaf(p, x + 0.5, y - 22, 5, -2.6, LEAF);
  leaf(p, x + 0.5, y - 22, 5, -0.5, '#8fd16a');
  p.heart(x + 0.5, y - 30, 4.2, '#7ed957');
  p.ellipse(x - 1.5, y - 31.5, 1.1, 0.6, rgba('#ffffff', 0.6), null, -0.5);
  sparkle(p, x - 13, y - 26, 2.2);
}

function globePlanter(p: Pen): void {
  const { x, y } = p.center;
  p.shadow(x, y + 1, 14, 6, 0.2);
  // wooden pedestal with a gold rim
  p.cylinder(x, y, 8, 5, '#b98a5c');
  p.curve({ x: x - 8, y: y - 4.5 }, { x, y: y - 1.5 }, { x: x + 8, y: y - 4.5 }, GOLD, 1.4);
  const R = 14;
  const cy = y - 5 - R;
  // ocean
  p.circle(x, cy, R, radial(p, x, cy, R * 1.25, '#9ee0ff', '#2f86d8'), null);
  // continents and a cloud, clipped to the globe
  const ctx = p.ctx;
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, cy, R, 0, TAU);
  ctx.clip();
  for (const [dx, dy, rx, ry, rot] of [
    [-6, -6, 6, 4, 0.4],
    [5, -8, 4, 2.6, -0.3],
    [7.5, 5, 2.6, 4.5, 0.2],
    [-8.5, 5, 3, 2, 0.2],
  ]) {
    p.ellipse(x + dx, cy + dy, rx, ry, '#6cc04a', null, rot);
  }
  p.ellipse(x - 2, cy - 11, 9, 2.5, rgba('#ffffff', 0.7), null);
  ctx.restore();
  p.circle(x, cy, R, null);
  p.ellipse(x - 6, cy - 7, 3, 1.8, rgba('#ffffff', 0.7), null, -0.6);
  face(p, x, cy + 4, 0.95);
  // soil on top and a bushy plant
  const top = cy - R;
  p.ellipse(x, top + 2, 6.2, 2.4, '#7a4b2e');
  p.foliage(x, top - 4, 7, '#6cc04a', 'globe-plant', 6);
  p.flower(x - 4.5, top - 9, 2.2, '#ff8fb3', '#ffd84a');
  p.flower(x + 4.5, top - 8, 2, '#ffe066', '#ff9a2e');
  leaf(p, x, top - 1, 5, -2.6, LEAF);
}

// ---------------------------------------------------------------------------
// Tanabata (Star Festival)

function wishBamboo(p: Pen): void {
  const { x, y } = p.center;
  p.shadow(x, y + 1, 16, 6, 0.2);
  const green = '#7cc46a';
  const top = y - 68;
  // stalk with nodes
  p.rect(x - 3, top, 6, 68, hgrad(p, x - 3, x + 3, shade(green, 0.3), shade(green, -0.25)));
  for (let yy = y - 9; yy > top + 4; yy -= 11) p.line([{ x: x - 3, y: yy }, { x: x + 3, y: yy }], shade(green, -0.35), 0.9);
  for (const [len, ang] of [
    [14, -2.7],
    [13, -1.9],
    [12, -0.5],
  ] as const) {
    leaf(p, x, top + 1, len, ang, LEAF);
  }
  // branch tied across the stalk
  p.line([{ x: x - 16, y: y - 46 }, { x: x + 16, y: y - 58 }], WOOD_DK, 1);
  // wish strips on threads
  const colors = [PINK, '#ffd84a', '#8fd0ff', '#a8e6a0', '#c7a6ff', '#ffb38a'];
  for (let k = 0; k < 6; k++) {
    const sx = -12 + k * 5;
    const by = y - 52 - sx * 0.375;
    const len = 10 + (k % 3) * 2;
    p.line([{ x: x + sx, y: by }, { x: x + sx, y: by + 1 }], O, 0.5);
    p.poly(
      [
        { x: x + sx - 1.9, y: by + 1 },
        { x: x + sx + 1.9, y: by + 1 },
        { x: x + sx + 1.9, y: by + len },
        { x: x + sx - 1.9, y: by + len },
      ],
      colors[k],
      O,
      0.6,
    );
    p.line([{ x: x + sx - 0.9, y: by + 4 }, { x: x + sx + 0.9, y: by + 4 }], rgba(DARK, 0.35), 0.5);
    p.line([{ x: x + sx - 0.9, y: by + 6.5 }, { x: x + sx + 0.9, y: by + 6.5 }], rgba(DARK, 0.35), 0.5);
  }
  // paper stars
  p.star(x - 9, y - 30, 3.6, '#ffd84a');
  p.star(x + 4, y - 40, 3, '#ff9ec4');
  // a gold star with a face
  p.star(x + 12, y - 26, 4.8, GOLD);
  face(p, x + 12, y - 26, 0.6);
  // vase at the foot
  p.cylinder(x, y, 6, 9, '#8fc8f0');
  face(p, x, y - 4.5, 0.8);
}

function starStreamers(p: Pen): void {
  const { x, y } = p.center;
  p.shadow(x, y + 1, 14, 6, 0.2);
  p.cylinder(x, y, 8, 4, WOOD_DK);
  post(p, x, y - 2, 62, WOOD, 3.4);
  const bar = y - 52;
  thick(p, [{ x: x - 15, y: bar }, { x: x + 15, y: bar }], 2.2, WOOD_LT);
  p.ball(x - 15, bar, 1.8, GOLD);
  p.ball(x + 15, bar, 1.8, GOLD);
  // long streamers with swallowtail ends
  const streamers: [number, number, number, number, string][] = [
    [-13, -20, 24, -17, PINK],
    [-6, -10, 30, -8, '#ffd84a'],
    [6, 10, 30, 8, '#a8e6a0'],
    [13, 20, 24, 17, '#c7a6ff'],
  ];
  for (const [ax, tx, ty, cx, col] of streamers) {
    ribbon(p, { x: x + ax, y: bar }, { x: x + cx, y: bar + 14 }, { x: x + tx, y: bar + ty }, 3.8, col);
  }
  // paper stars on threads
  p.line([{ x: x - 21, y: bar }, { x: x - 21, y: y - 42 }], O, 0.5);
  p.star(x - 21, y - 40, 4, PINK);
  p.line([{ x: x + 21, y: bar }, { x: x + 21, y: y - 44 }], O, 0.5);
  p.star(x + 21, y - 42, 4, GOLD);
  // finial star on top
  p.star(x, y - 69, 6.5, GOLD);
  p.ellipse(x - 1.5, y - 71, 1.3, 1, rgba('#ffffff', 0.7), null, -0.5);
}

function paperCranes(p: Pen): void {
  const { x, y } = p.center;
  p.shadow(x, y + 1, 14, 6, 0.2);
  const bar = y - 50;
  p.cylinder(x, y, 9, 3, WOOD_DK);
  thick(p, [{ x, y: y - 2 }, { x, y: bar }], 3, WOOD);
  p.circle(x, bar - 5, 2.2, null, GOLD);
  thick(p, [{ x: x - 21, y: bar }, { x: x + 21, y: bar }], 2.4, WOOD_LT);
  p.ball(x - 21, bar, 1.8, WOOD);
  p.ball(x + 21, bar, 1.8, WOOD);
  const crane = (cx: number, cy: number, rot: number, col: string): void => {
    withXform(
      p,
      cx,
      cy,
      rot,
      () => {
        p.poly(
          [
            { x: -1, y: -1 },
            { x: -5, y: -8 },
            { x: -7, y: -2 },
            { x: -2, y: 0 },
          ],
          shade(col, 0.22),
          O,
          0.7,
        );
        p.poly(
          [
            { x: -5, y: 1 },
            { x: 1, y: -2.5 },
            { x: 4, y: -0.8 },
            { x: 2, y: 3 },
          ],
          col,
          O,
          0.7,
        );
        p.poly(
          [
            { x: -5, y: 1 },
            { x: -9, y: -0.5 },
            { x: -7.5, y: 2.5 },
          ],
          shade(col, -0.12),
          O,
          0.6,
        );
        p.line([{ x: 3, y: -1 }, { x: 6, y: -6.5 }], col, 1.8);
        p.circle(7, -7.6, 1.7, col, O);
        p.poly(
          [
            { x: 8.5, y: -8.2 },
            { x: 10.8, y: -7.5 },
            { x: 8.5, y: -6.9 },
          ],
          '#ffb13b',
          O,
          0.5,
        );
        p.circle(6.6, -8, 0.42, DARK, null);
      },
      1.5,
    );
  };
  for (const [dx, len, col, rot] of [
    [-16, 12, '#ffb3c8', -0.12],
    [-6, 21, '#ffe066', 0.1],
    [5, 11, '#8fd0ff', -0.18],
    [16, 17, '#a8e6a0', 0.16],
  ] as const) {
    const rx = x + dx;
    p.line([{ x: rx, y: bar }, { x: rx, y: bar + len }], '#7a6a5a', 0.6);
    crane(rx, bar + len + 4, rot, col);
  }
}

// ---------------------------------------------------------------------------
// Mid-Autumn Moon Festival

function rabbitLantern(p: Pen): void {
  const { x, y } = p.center;
  p.shadow(x, y + 1, 14, 6, 0.2);
  // pedestal with a gold rim
  p.cylinder(x, y, 8, 4, WOOD);
  p.curve({ x: x - 8, y: y - 3.5 }, { x, y: y - 0.5 }, { x: x + 8, y: y - 3.5 }, GOLD, 1.4);
  // warm light from inside
  p.glow(x, y - 16, 26, '#ffd98a', 0.55);
  const cream = '#fffafc';
  // ears
  for (const dx of [-4.2, 4.2]) {
    const rot = dx < 0 ? -0.18 : 0.18;
    p.ellipse(x + dx, y - 40, 2.9, 8.5, cream, O, rot);
    p.ellipse(x + dx, y - 40, 1.3, 5.8, '#ffb3c8', null, rot);
  }
  // body, feet and paws
  p.ellipse(x, y - 12, 9, 10.5, radial(p, x, y - 12, 11, '#ffffff', '#ffe9c2'));
  p.ellipse(x - 4.5, y - 2.5, 3.6, 2.2, cream);
  p.ellipse(x + 4.5, y - 2.5, 3.6, 2.2, cream);
  p.ball(x - 6.5, y - 13, 2.6, cream);
  p.ball(x + 6.5, y - 13, 2.6, cream);
  // head with a face
  p.ball(x, y - 26, 9.6, cream);
  face(p, x, y - 25, 1.05);
  // gold moon-mark on the chest
  p.circle(x, y - 12, 2.4, null, shade(GOLD, -0.1));
  sparkle(p, x + 15, y - 40, 2.2);
}

function mooncakeTable(p: Pen): void {
  const c = p.center;
  p.shadow(c.x, c.y + 3, 22, 9, 0.2);
  table(p, 0.08, 0.08, 0.84, 0.84, 10, '#b8453a');
  const z = 13;
  // gold runner
  p.diamond(0.08, 0.44, 0.84, 0.12, '#f4c24a', null, z + 0.1);
  // plate of mooncakes
  const plate = p.iso(0.34, 0.32, z);
  p.ellipse(plate.x, plate.y - 1, 10, 5, '#ffffff');
  p.ellipse(plate.x, plate.y - 1.4, 8, 3.7, '#f3ece2', null);
  for (const [dx, dy] of [
    [-3.8, -1],
    [3.8, -1],
    [0, -4.2],
  ] as const) {
    const bx = plate.x + dx;
    const by = plate.y + dy;
    p.cylinder(bx, by, 4.2, 3, '#e2a94e');
    p.circle(bx, by - 3, 1.3, null, '#b8762a');
  }
  // a pomelo with its leaf
  const pom = p.iso(0.78, 0.2, z);
  p.ball(pom.x, pom.y - 4.4, 4.4, '#e6e46a');
  leaf(p, pom.x, pom.y - 8.4, 4.5, -2.4, LEAF);
  // two tea cups
  for (const [u, v] of [
    [0.52, 0.86],
    [0.9, 0.86],
  ] as const) {
    const q = p.iso(u, v, z);
    p.cylinder(q.x, q.y, 2.8, 3.6, '#ffffff');
    p.ellipse(q.x, q.y - 3.6, 2.8, 1.2, '#c9a06a', null);
  }
  // moon-white teapot with a face
  const t = p.iso(0.74, 0.6, z);
  p.circle(t.x - 5.4, t.y - 6, 2.2, null, O);
  p.ball(t.x, t.y - 6.5, 5.6, '#fff8e6');
  p.poly(
    [
      { x: t.x + 4.6, y: t.y - 5.5 },
      { x: t.x + 9.5, y: t.y - 10 },
      { x: t.x + 10.6, y: t.y - 8.4 },
      { x: t.x + 5.6, y: t.y - 3.6 },
    ],
    '#fff8e6',
  );
  p.ellipse(t.x, t.y - 12, 2.4, 0.9, '#f4c24a');
  p.circle(t.x, t.y - 13, 0.9, '#f4c24a', null);
  face(p, t.x, t.y - 6, 0.6);
}

/**
 * Moon gate: a chunky whitewashed garden wall along the 2x1 footprint with a
 * round opening through its front face, a terracotta tiled cap, a plum sprig
 * peeking over the top, and the full moon rising behind.
 */
function moonGate(p: Pen): void {
  const c = p.center;
  p.shadow(c.x, c.y + 4, 40, 12, 0.2);
  // the full moon glows above and behind the gate, with a face
  const my = p.height - 40;
  p.glow(c.x, my, 38, '#fff3b0', 0.6);
  p.circle(c.x, my, 13, radial(p, c.x, my, 15, '#fffbe6', '#ffe27a'), '#d9a93a');
  p.circle(c.x - 6, my - 6, 2, rgba('#e0b84a', 0.45), null);
  p.circle(c.x + 6, my + 5, 1.5, rgba('#e0b84a', 0.4), null);
  face(p, c.x, my + 1, 0.85);

  // stone plinth, then the whitewashed wall
  p.box(0.06, 0.38, 1.88, 0.24, 3, '#d8c9ae', 0);
  p.box(0.1, 0.42, 1.8, 0.16, 30, { top: '#fffdf7', left: '#f7efe1', right: '#e4d5ba' }, 3);

  // round opening through the front face, looking out onto a hedge and grass
  onWallU(p, p.iso(0, 0.58, 0), () => {
    const ctx = p.ctx;
    p.circle(32, -18, 12.5, '#f7efdf', O);
    p.circle(32, -18, 10.5, radial(p, 32, -18, 11, '#eaffd9', '#8fd07a'), O);
    ctx.save();
    ctx.beginPath();
    ctx.arc(32, -18, 10.5, 0, TAU);
    ctx.clip();
    p.ellipse(32, -25, 13, 5, '#4f9a4a', null);
    p.ellipse(32, -24.5, 11, 3, '#3d8240', null);
    p.curve({ x: 27, y: -8 }, { x: 31, y: -13 }, { x: 30, y: -19 }, '#f5e6bf', 2.2);
    p.circle(24, -11, 1.1, '#ffb3c8', null);
    p.circle(39, -9, 1.1, '#fff3a6', null);
    ctx.restore();
    p.circle(32, -18, 10.5, null, O);
  });

  // plum sprig peeking over the wall, drawn behind the roof cap
  const bark = '#7a4b2e';
  thick(p, [p.iso(1.55, 0.5, 30), p.iso(1.5, 0.5, 44), p.iso(1.7, 0.5, 56)], 2, bark);
  const blossoms: [number, number, number, string][] = [
    [1.5, 0.5, 47, '#ffb3c9'],
    [1.66, 0.5, 52, '#ffffff'],
    [1.72, 0.5, 57, '#ff8fb3'],
  ];
  for (const [u, v, z, col] of blossoms) {
    const q = p.iso(u, v, z);
    sakura(p, q.x, q.y, 2.8, col, u);
  }

  // terracotta tiled cap with upturned eaves
  onWallU(p, p.iso(0, 0.6, 0), () => {
    const ctx = p.ctx;
    const A: Pt = { x: -5, y: -35 };
    const C: Pt = { x: 32, y: -52 };
    const B: Pt = { x: 69, y: -35 };
    const low = -31;
    ctx.beginPath();
    ctx.moveTo(A.x, A.y);
    ctx.quadraticCurveTo(C.x, C.y, B.x, B.y);
    ctx.lineTo(B.x - 2, low);
    ctx.lineTo(A.x + 2, low);
    ctx.closePath();
    ctx.fillStyle = '#d97b52';
    ctx.fill();
    ctx.strokeStyle = O;
    ctx.lineWidth = 1;
    ctx.stroke();
    const ridge: Pt[] = [];
    for (let i = 0; i <= 12; i++) {
      const q = qpt(A, C, B, i / 12);
      ridge.push({ x: q.x, y: q.y + 2 });
    }
    p.line(ridge, '#f3a27c', 1.4);
    for (const k of [0.36, 0.7]) {
      const row: Pt[] = [];
      for (let i = 0; i <= 12; i++) {
        const q = qpt(A, C, B, i / 12);
        row.push({ x: q.x, y: q.y + (low - q.y) * k });
      }
      p.line(row, rgba('#a95a38', 0.85), 0.8);
    }
    p.line([{ x: A.x + 2, y: low - 0.5 }, { x: B.x - 2, y: low - 0.5 }], '#8a4428', 1.2);
  });

  // soft stepping stones and a few flowers at the foot of the wall
  for (const [u, v, r] of [
    [0.9, 0.95, 3.6],
    [1.35, 1.12, 3.2],
  ] as const) {
    const q = p.iso(u, v, 0);
    p.ellipse(q.x, q.y, r, r * 0.5, '#e8e0cc');
  }
  const f1 = p.iso(0.3, 0.8, 0);
  p.flower(f1.x, f1.y, 2.2, '#ffb3c8', '#ffd84a');
  const f2 = p.iso(1.8, 0.92, 0);
  p.flower(f2.x, f2.y, 2.2, '#fff3a6', '#ff9a2e');
}

function osmanthusTree(p: Pen): void {
  const { x, y } = p.center;
  p.shadow(x, y + 1, 16, 6, 0.2);
  const bark = '#7a5a3e';
  thickCurve(p, { x, y }, { x: x + 2, y: y - 14 }, { x: x - 1, y: y - 24 }, 5, bark);
  thick(p, [{ x, y: y - 18 }, { x: x - 8, y: y - 28 }], 2, bark);
  thick(p, [{ x, y: y - 20 }, { x: x + 8, y: y - 29 }], 2, bark);
  p.foliage(x, y - 36, 16, '#3f9a4e', 'osmanthus', 8);
  // tiny golden-orange blossoms in clusters
  const rand = rng('osmanthus');
  for (let i = 0; i < 26; i++) {
    const a = rand() * TAU;
    const d = Math.sqrt(rand()) * 13;
    const bx = x + Math.cos(a) * d * 1.1;
    const by = y - 36 + Math.sin(a) * d * 0.9;
    for (const [dx, dy] of [
      [-1, -0.6],
      [1, -0.4],
      [0, 1],
    ] as const) {
      p.circle(bx + dx, by + dy, 1.2, i % 2 ? '#ffb13b' : '#ffa53b', null);
    }
    p.circle(bx, by - 0.2, 0.5, '#fff0a0', null);
  }
  // fallen blossoms
  for (let i = 0; i < 6; i++) {
    const q = p.iso(0.2 + rand() * 0.6, 0.2 + rand() * 0.6, 0);
    p.circle(q.x, q.y, 1.2, '#ffb13b', null);
  }
}

// ---------------------------------------------------------------------------
// Thanksgiving

function turkeyStatue(p: Pen): void {
  const { x, y } = p.center;
  p.shadow(x, y + 1, 18, 7, 0.22);
  // round stone plinth
  p.cylinder(x, y, 12, 6, '#d8ccb8');
  // feet
  p.ellipse(x - 4, y - 6.5, 3.6, 1.6, '#f08a24');
  p.ellipse(x + 4, y - 6.5, 3.6, 1.6, '#f08a24');
  // fan tail behind the body, in autumn colours with eye-spots
  const cols = ['#e0712c', '#c4432a', '#f5b335', '#8a4a2a', '#e9913a', '#b7472b', '#ffd166'];
  const fx = x - 2;
  const fy = y - 20;
  for (let i = 0; i < 7; i++) {
    const ang = -Math.PI * (0.85 - (i * 0.7) / 6);
    leaf(p, fx, fy, 22, ang, cols[i]);
    p.circle(fx + Math.cos(ang) * 16, fy + Math.sin(ang) * 16, 1.8, '#fff1c0', O);
  }
  // body with a lighter chest and wing scallops
  p.ball(x, y - 20, 12, '#b8733c');
  p.ellipse(x + 4, y - 16, 5.5, 6.5, '#e8a46a', null, -0.3);
  p.curve({ x: x - 7, y: y - 22 }, { x: x - 3, y: y - 17 }, { x: x - 6, y: y - 12 }, '#8a4a22', 0.9);
  p.curve({ x: x - 3, y: y - 24 }, { x: x + 1, y: y - 19 }, { x: x - 2, y: y - 14 }, '#8a4a22', 0.9);
  // neck, head, comb, wattle and beak
  thick(p, [{ x: x + 5, y: y - 26 }, { x: x + 7, y: y - 32 }], 6, '#c27a40');
  p.ball(x + 8, y - 38, 6.4, '#c27a40');
  p.ellipse(x + 7.5, y - 44.5, 2.2, 2.6, RED);
  p.ellipse(x + 11.5, y - 33.5, 2, 3, '#ff5b6b');
  p.poly(
    [
      { x: x + 13, y: y - 39 },
      { x: x + 17.5, y: y - 37.5 },
      { x: x + 13, y: y - 36 },
    ],
    '#f5a623',
  );
  face(p, x + 6.5, y - 38, 0.72);
}

function feastTable(p: Pen): void {
  const c = p.center;
  p.shadow(c.x, c.y + 4, 40, 13, 0.2);
  table(p, 0.06, 0.14, 1.88, 0.72, 12, '#d9975a');
  const z = 15;
  // autumn runner with leaves
  p.diamond(0.06, 0.42, 1.88, 0.2, '#b8452a', null, z + 0.1);
  const leafCols = ['#e0712c', '#f5b335', '#b7472b', '#8fbf5a'];
  for (let k = 0; k < 6; k++) {
    const q = p.iso(0.3 + k * 0.28, 0.52, z + 0.2);
    leaf(p, q.x, q.y, 6, -0.9 + (k % 3) * 0.9, leafCols[k % leafCols.length]);
  }
  // candles on brass holders
  const candle = (u: number, v: number): void => {
    const b = p.iso(u, v, z);
    p.ellipse(b.x, b.y, 3.2, 1.5, '#c99a3a');
    p.cylinder(b.x, b.y - 0.5, 1.8, 9, '#fff6e0');
    flame(p, b.x, b.y - 9.5, 3.2);
  };
  candle(0.22, 0.28);
  candle(1.0, 0.2);
  // a roast on a platter
  const r = p.iso(0.7, 0.52, z);
  p.ellipse(r.x, r.y - 0.8, 11, 5.2, '#fffdf7', O);
  p.ellipse(r.x, r.y - 0.8, 9, 4.2, '#f0e6d6', null);
  p.ellipse(r.x, r.y - 2.6, 7.5, 4, radial(p, r.x, r.y - 2.6, 8, '#f3b15a', '#b8612a'));
  p.ellipse(r.x - 2.6, r.y - 4.4, 2.2, 1, rgba('#ffffff', 0.5), null, -0.3);
  thick(p, [{ x: r.x + 7, y: r.y - 3 }, { x: r.x + 10, y: r.y - 5.5 }], 1.2, '#fff8ef');
  leaf(p, r.x - 3, r.y - 4, 4, -2.3, LEAF);
  leaf(p, r.x + 1, r.y - 5, 4, -1.5, '#8fd16a');
  // pies: pumpkin and berry
  const pie = (u: number, v: number, filling: string): void => {
    const b = p.iso(u, v, z);
    p.cylinder(b.x, b.y, 6.2, 3.2, '#e0a050');
    const ctx = p.ctx;
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(b.x, b.y - 3.2, 6.2, 3.1, 0, 0, TAU);
    ctx.clip();
    p.ellipse(b.x, b.y - 3.2, 6.2, 3.1, filling, null);
    for (let k = -2; k <= 2; k++) {
      p.line([{ x: b.x + k * 2.6 - 3, y: b.y - 6.5 }, { x: b.x + k * 2.6 + 3, y: b.y }], rgba('#fff3d6', 0.8), 1);
      p.line([{ x: b.x + k * 2.6 + 3, y: b.y - 6.5 }, { x: b.x + k * 2.6 - 3, y: b.y }], rgba('#fff3d6', 0.8), 1);
    }
    ctx.restore();
  };
  pie(1.22, 0.62, '#e89a3a');
  pie(1.62, 0.26, '#b5395a');
  // corn cobs lying along the table, husks out
  const corn = (u: number, v: number): void => {
    const q = p.iso(u, v, z);
    withXform(p, q.x, q.y, 0.46, () => {
      p.ellipse(0, 0, 8, 3.4, '#ffd84a', O);
      for (let i = -3; i <= 3; i++) {
        for (let j = -1; j <= 1; j++) p.circle(i * 2, j * 1.3, 0.5, '#e0a020', null);
      }
      leaf(p, -7, 0, 6, Math.PI + 0.25, LEAF);
      leaf(p, 7, 0, 6, -0.25, LEAF);
    });
  };
  corn(0.3, 0.8);
  corn(1.1, 0.88);
  // cranberry bowl
  const bw = p.iso(1.62, 0.78, z);
  p.cylinder(bw.x, bw.y, 4.2, 3, '#fff8ef');
  p.ball(bw.x - 1.8, bw.y - 3.8, 1.5, '#e5344f');
  p.ball(bw.x + 1.5, bw.y - 4, 1.6, '#d72645');
  p.ball(bw.x, bw.y - 5.4, 1.4, '#ff5b6b');
}

/** Used only if a festival id has no painter: a cute cushion with a heart. */
function cuteFallback(p: Pen): void {
  const { x, y } = p.center;
  p.shadow(x, y + 1, 14, 6, 0.2);
  p.ellipse(x, y - 4, 10, 6, radial(p, x, y - 4, 12, '#ffd6e5', '#ff8fb3'));
  p.heart(x, y - 9, 3.5, '#ff5b7f');
}

/** Simple table: four legs and a box top whose surface sits at legHt + 3. */
function table(p: Pen, u0: number, v0: number, du: number, dv: number, legHt: number, top: string): void {
  const l = 0.07;
  const i0 = 0.02;
  const legs: [number, number][] = [
    [u0 + i0, v0 + i0],
    [u0 + du - l - i0, v0 + i0],
    [u0 + i0, v0 + dv - l - i0],
    [u0 + du - l - i0, v0 + dv - l - i0],
  ];
  for (const [u, v] of legs) p.box(u, v, l, l, legHt, WOOD_DK);
  p.box(u0, v0, du, dv, 3, top, legHt);
}

const SPECS: Record<string, { height: number; paint: Painter }> = {
  hanami_picnic: { height: 34, paint: hanamiPicnic },
  sakura_arch: { height: 52, paint: sakuraArch },
  paper_lantern_tree: { height: 60, paint: paperLanternTree },
  dango_stand: { height: 46, paint: dangoStand },
  recycling_bins: { height: 30, paint: recyclingBins },
  solar_lamp: { height: 46, paint: solarLamp },
  sapling_pot: { height: 34, paint: saplingPot },
  globe_planter: { height: 52, paint: globePlanter },
  wish_bamboo: { height: 70, paint: wishBamboo },
  star_streamers: { height: 70, paint: starStreamers },
  paper_cranes: { height: 60, paint: paperCranes },
  rabbit_lantern: { height: 56, paint: rabbitLantern },
  mooncake_table: { height: 44, paint: mooncakeTable },
  moon_gate: { height: 66, paint: moonGate },
  osmanthus_tree: { height: 56, paint: osmanthusTree },
  turkey_statue: { height: 52, paint: turkeyStatue },
  feast_table: { height: 40, paint: feastTable },
};

export const sprites: SpriteSpec[] = FESTIVAL_DECORATIONS.slice(0, 17).map((def) => {
  const spec: { height: number; paint: Painter } | undefined = SPECS[def.id];
  return {
    key: `deco:${def.id}`,
    fw: def.w,
    fh: def.h,
    height: spec ? spec.height : 44,
    paint: spec ? spec.paint : cuteFallback,
  };
});

export const icons: IconSpec[] = [];
