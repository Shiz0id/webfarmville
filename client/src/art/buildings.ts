// Crafting buildings and the farmhouse.
import { type IconSpec, type SpriteSpec, type Pen, type Pt, shade, rng, mix, boxColors } from './kit';
import { BUILDING_LIST } from '@farm/shared';

export const icons: IconSpec[] = [];

const GLASS_LIT = '#ffe39a';
const WOOD = '#b98352';
const INK = '#2b1d14';

// ---------------------------------------------------------------------------
// Faces: a wall plane we can paint details onto.
//   L(v)  — the front-left wall at v = const; s runs along u (left → right on screen).
//   R(u)  — the front-right wall at u = const; s runs along v.

interface Face {
  pt: (s: number, z: number) => Pt;
  /** A point pushed d tiles out from the wall. */
  out: (s: number, z: number, d: number) => Pt;
  /** Shading applied to colours painted on this face. */
  dim: number;
}

const faceL = (p: Pen, v: number): Face => ({
  pt: (s, z) => p.iso(s, v, z),
  out: (s, z, d) => p.iso(s, v + d, z),
  dim: 0,
});

const faceR = (p: Pen, u: number): Face => ({
  pt: (s, z) => p.iso(u, s, z),
  out: (s, z, d) => p.iso(u + d, s, z),
  dim: -0.18,
});

function quad(p: Pen, f: Face, s0: number, s1: number, z0: number, z1: number, fill: string | CanvasGradient | null, stroke: string | null = p.outline): void {
  p.poly([f.pt(s0, z0), f.pt(s1, z0), f.pt(s1, z1), f.pt(s0, z1)], fill, stroke);
}

function windowOn(
  p: Pen,
  f: Face,
  sc: number,
  z0: number,
  w: number,
  h: number,
  opts: { frame?: string; shutters?: string; arch?: boolean; panes?: boolean; inside?: (pt: (s: number, z: number) => Pt) => void } = {},
): void {
  const frame = shade(opts.frame ?? '#ffffff', f.dim);
  const s0 = sc - w / 2;
  const s1 = sc + w / 2;
  if (opts.shutters) {
    const sh = shade(opts.shutters, f.dim);
    quad(p, f, s0 - w * 0.42, s0 - 0.02, z0 - 0.5, z0 + h + 0.5, sh);
    quad(p, f, s1 + 0.02, s1 + w * 0.42, z0 - 0.5, z0 + h + 0.5, sh);
    for (const [a, b] of [
      [s0 - w * 0.42, s0 - 0.02],
      [s1 + 0.02, s1 + w * 0.42],
    ])
      for (const t of [0.33, 0.66]) p.line([f.pt(a + 0.02, z0 + h * t), f.pt(b - 0.02, z0 + h * t)], shade(sh, -0.25), 0.7);
  }
  quad(p, f, s0 - 0.035, s1 + 0.035, z0 - 2, z0 + h + 2, frame);
  const a = f.pt(s0, z0 + h);
  const b = f.pt(s1, z0);
  const g = p.vgrad(Math.min(a.y, b.y) - 2, Math.max(a.y, b.y) + 4, shade(GLASS_LIT, 0.35), shade('#ffc95a', f.dim));
  quad(p, f, s0, s1, z0, z0 + h, g, shade(frame, -0.35));
  opts.inside?.((s, z) => f.pt(s0 + (s1 - s0) * s, z0 + h * z));
  if (opts.panes !== false) {
    p.line([f.pt(sc, z0), f.pt(sc, z0 + h)], frame, 1.2);
    p.line([f.pt(s0, z0 + h / 2), f.pt(s1, z0 + h / 2)], frame, 1.2);
  }
  // glint
  p.line([f.pt(s0 + w * 0.12, z0 + h * 0.55), f.pt(s0 + w * 0.3, z0 + h * 0.85)], 'rgba(255,255,255,0.7)', 1);
  // sill
  quad(p, f, s0 - 0.06, s1 + 0.06, z0 - 3, z0 - 1.5, shade(frame, -0.08));
}

function door(p: Pen, f: Face, sc: number, w: number, h: number, color: string, z0 = 0): void {
  const c = shade(color, f.dim);
  const s0 = sc - w / 2;
  const s1 = sc + w / 2;
  quad(p, f, s0 - 0.03, s1 + 0.03, z0, z0 + h + 2, shade('#ffffff', f.dim - 0.05));
  quad(p, f, s0, s1, z0, z0 + h, c);
  quad(p, f, s0 + w * 0.2, s1 - w * 0.2, z0 + h * 0.62, z0 + h * 0.86, shade(GLASS_LIT, f.dim), shade(c, -0.35));
  quad(p, f, s0 + w * 0.2, s1 - w * 0.2, z0 + h * 0.12, z0 + h * 0.48, null, shade(c, -0.3));
  const k = f.pt(s1 - w * 0.18, z0 + h * 0.5);
  p.circle(k.x, k.y, 1.1, '#ffd34a', null);
}

/** Striped awning sticking out of a wall: top edge at z, front edge depth tiles out and drop px lower. */
function awning(p: Pen, f: Face, s0: number, s1: number, z: number, depth: number, drop: number, c1: string, c2: string, stripes = 6): void {
  const n = stripes;
  const ds = (s1 - s0) / n;
  for (let i = 0; i < n; i++) {
    const a = s0 + i * ds;
    const b = a + ds;
    const col = shade(i % 2 ? c2 : c1, f.dim);
    p.poly([f.pt(a, z), f.pt(b, z), f.out(b, z - drop, depth), f.out(a, z - drop, depth)], col, null);
    // scallop
    const m0 = f.out(a, z - drop, depth);
    const m1 = f.out(b, z - drop, depth);
    const mid = { x: (m0.x + m1.x) / 2, y: (m0.y + m1.y) / 2 };
    const r = Math.hypot(m1.x - m0.x, m1.y - m0.y) / 2;
    const ang = Math.atan2(m1.y - m0.y, m1.x - m0.x);
    p.ctx.beginPath();
    p.ctx.arc(mid.x, mid.y, r, ang, ang + Math.PI);
    p.ctx.closePath();
    p.ctx.fillStyle = shade(col, -0.06);
    p.ctx.fill();
    p.ctx.strokeStyle = p.outline;
    p.ctx.lineWidth = p.lineWidth;
    p.ctx.stroke();
  }
  p.poly([f.pt(s0, z), f.pt(s1, z), f.out(s1, z - drop, depth), f.out(s0, z - drop, depth)], null);
}

function flowerBox(p: Pen, f: Face, s0: number, s1: number, z: number, petals: string[], seed: string): void {
  const r = rng(seed);
  // leaves and flowers poke above the box
  const n = Math.max(3, Math.round((s1 - s0) * 14));
  for (let i = 0; i < n; i++) {
    const s = s0 + ((i + 0.5) / n) * (s1 - s0);
    const at = f.out(s, z + 2, 0.06);
    p.circle(at.x, at.y - 0.5, 2.1, '#5aa04a', '#3e7a35');
  }
  for (let i = 0; i < n; i++) {
    const s = s0 + ((i + 0.5) / n) * (s1 - s0);
    const at = f.out(s, z + 3.5 + r() * 1.5, 0.08);
    p.flower(at.x, at.y, 2.1, petals[i % petals.length]);
  }
  p.poly([f.out(s0, z, 0.12), f.out(s1, z, 0.12), f.out(s1, z - 4, 0.12), f.out(s0, z - 4, 0.12)], shade('#a8683c', f.dim));
}

/** A round hanging/standing sign in screen space. */
function roundSign(p: Pen, x: number, y: number, r: number, bg: string, emblem: (x: number, y: number, r: number) => void): void {
  p.circle(x, y + 1.2, r + 0.5, shade(bg, -0.35));
  p.circle(x, y, r, bg);
  p.circle(x, y, r - 2, null, shade(bg, -0.18));
  emblem(x, y, r);
}

function bracket(p: Pen, from: Pt, to: Pt): void {
  p.line([from, to], p.outline, 2.6);
  p.line([from, to], '#6a4a32', 1.2);
}

function smoke(p: Pen, x: number, y: number): void {
  p.circle(x + 1, y - 4, 3, 'rgba(255,255,255,0.75)', null);
  p.circle(x + 4, y - 10, 4, 'rgba(255,255,255,0.6)', null);
  p.circle(x + 9, y - 17, 5, 'rgba(255,255,255,0.45)', null);
}

/** A small tied sack of flour sitting on the ground at (u, v). */
function sackProp(p: Pen, u: number, v: number, s = 1, cloth = '#f4ead6'): void {
  const at = p.iso(u, v);
  const x = at.x;
  const y = at.y;
  p.shadow(x, y, 6 * s, 2.5 * s);
  const ctx = p.ctx;
  ctx.beginPath();
  ctx.moveTo(x - 2 * s, y - 9 * s);
  ctx.quadraticCurveTo(x - 5.5 * s, y - 6 * s, x - 5 * s, y - 1.5 * s);
  ctx.quadraticCurveTo(x, y + 1 * s, x + 5 * s, y - 1.5 * s);
  ctx.quadraticCurveTo(x + 5.5 * s, y - 6 * s, x + 2 * s, y - 9 * s);
  ctx.closePath();
  ctx.fillStyle = p.vgrad(y - 9 * s, y, shade(cloth, 0.2), shade(cloth, -0.12));
  ctx.fill();
  ctx.strokeStyle = p.outline;
  ctx.lineWidth = p.lineWidth;
  ctx.stroke();
  p.poly(
    [
      { x: x - 2 * s, y: y - 9 * s },
      { x: x - 3 * s, y: y - 12 * s },
      { x: x + 3 * s, y: y - 12 * s },
      { x: x + 2 * s, y: y - 9 * s },
    ],
    cloth,
  );
  p.line([{ x: x - 2.2 * s, y: y - 9.2 * s }, { x: x + 2.2 * s, y: y - 9.2 * s }], '#b07a4a', 1.4);
  p.ellipse(x, y - 4.5 * s, 1.6 * s, 1.6 * s, '#e0c27a', null);
}

function groundPad(p: Pen, color = 'rgba(110,80,45,0.16)'): void {
  const c = p.center;
  const w = (p.fw + p.fh) * 32;
  p.shadow(c.x, c.y, w * 0.47, w * 0.235, 0.3);
  p.diamond(0.08, 0.08, p.fw - 0.16, p.fh - 0.16, color, null);
}

function steppingStones(p: Pen, pts: [number, number][]): void {
  for (const [u, v] of pts) {
    const at = p.iso(u, v);
    p.ellipse(at.x, at.y, 4.2, 2.1, '#c9c2b4', shade('#c9c2b4', -0.3));
    p.ellipse(at.x - 0.8, at.y - 0.5, 2.2, 0.9, '#e2dccf', null);
  }
}

function bushAt(p: Pen, u: number, v: number, r: number, color: string, seed: string, flowers?: string): void {
  const at = p.iso(u, v);
  p.shadow(at.x, at.y, r * 1.2, r * 0.5);
  p.foliage(at.x, at.y - r * 0.8, r, color, seed, 6);
  if (flowers) {
    const rr = rng(seed + 'f');
    for (let i = 0; i < 4; i++) p.circle(at.x - r * 0.6 + rr() * r * 1.2, at.y - r * 1.4 + rr() * r * 0.9, 1.3, flowers, null);
  }
}

/**
 * Gable roof (ridge along u, gable end facing bottom-right), with a hook to
 * draw things — chimneys — between the back and front slopes.
 */
function gable(
  p: Pen,
  u: number,
  v: number,
  du: number,
  dv: number,
  wallHt: number,
  roofHt: number,
  color: string,
  wallColor: string,
  between?: () => void,
  o = 0.1,
): void {
  const z = wallHt;
  const mid = v + dv / 2;
  p.poly([p.iso(u + du, v, z), p.iso(u + du, v + dv, z), p.iso(u + du, mid, z + roofHt)], shade(wallColor, -0.22));
  const back = [p.iso(u - o, v - o, z), p.iso(u + du + o, v - o, z), p.iso(u + du + o, mid, z + roofHt), p.iso(u - o, mid, z + roofHt)];
  p.poly(back, shade(color, 0.12));
  between?.();
  const front = [p.iso(u - o, v + dv + o, z), p.iso(u + du + o, v + dv + o, z), p.iso(u + du + o, mid, z + roofHt), p.iso(u - o, mid, z + roofHt)];
  p.poly(front, p.vgrad(front[2].y, front[0].y, shade(color, 0.1), shade(color, -0.06)));
  // shingle rows
  for (const t of [0.28, 0.52, 0.76]) {
    const vv = mid + t * (dv / 2 + o);
    const zz = z + roofHt * (1 - t);
    p.line([p.iso(u - o + 0.02, vv, zz), p.iso(u + du + o - 0.02, vv, zz)], shade(color, -0.18), 1);
  }
  // ridge cap + eave highlight
  p.line([p.iso(u - o, mid, z + roofHt), p.iso(u + du + o, mid, z + roofHt)], shade(color, 0.3), 1.6);
  p.line([p.iso(u - o, mid, z + roofHt), p.iso(u + du + o, mid, z + roofHt)], p.outline, 0.8);
  // gable-end bargeboard
  p.line([p.iso(u + du + o, v + dv + o, z), p.iso(u + du + o, mid, z + roofHt)], shade(color, -0.3), 1.4);
}

function roofZ(v: number, v0: number, dv: number, wallHt: number, roofHt: number, o = 0.1): number {
  const mid = v0 + dv / 2;
  return wallHt + roofHt * (1 - Math.abs(v - mid) / (dv / 2 + o));
}

/** Stone foundation band along the bottom of both visible walls. */
function foundation(p: Pen, u: number, v: number, du: number, dv: number, ht: number, color = '#b9b0a2'): void {
  p.box(u - 0.03, v - 0.03, du + 0.06, dv + 0.06, ht, color);
  const r = rng('found' + u + v);
  const L = faceL(p, v + dv + 0.03);
  for (let s = u + 0.1; s < u + du - 0.05; s += 0.22 + r() * 0.08) p.line([L.pt(s, 0.5), L.pt(s, ht - 0.5)], shade(color, -0.2), 0.6);
}

// ---------------------------------------------------------------------------
// Farmhouse (3×3)

function farmhouse(p: Pen): void {
  groundPad(p);
  const U = 0.35;
  const V = 0.35;
  const DU = 2.2;
  const DV = 1.8;
  const WALL = 38;
  const ROOF = 34;
  const wall = '#fbf1dc';
  const roof = '#d65a4e';
  const blue = '#5b8fd6';
  const V1 = V + DV;
  const U1 = U + DU;

  steppingStones(p, [
    [1.45, 2.85],
    [1.62, 2.98],
  ]);
  foundation(p, U, V, DU, DV, 6);
  p.box(U, V, DU, DV, WALL - 6, wall, 6);
  // timber trim under the eaves
  const L = faceL(p, V1);
  const R = faceR(p, U1);
  quad(p, L, U, U1, WALL - 3, WALL, shade('#c99a6a', 0));
  p.poly([R.pt(V, WALL - 3), R.pt(V1, WALL - 3), R.pt(V1, WALL), R.pt(V, WALL)], shade('#c99a6a', -0.2));
  // corner boards
  quad(p, L, U, U + 0.05, 6, WALL - 3, shade(wall, -0.06));
  quad(p, L, U1 - 0.05, U1, 6, WALL - 3, shade(wall, -0.06));

  // front windows + flower boxes
  for (const sc of [0.75, 2.15]) {
    windowOn(p, L, sc, 15, 0.36, 13, { shutters: blue });
    flowerBox(p, L, sc - 0.22, sc + 0.22, 12, ['#ff8fb1', '#ffd34a', '#ff6b6b'], 'fh' + sc);
  }
  // side window
  windowOn(p, R, V + DV / 2, 15, 0.42, 13, { shutters: blue });
  door(p, L, 1.45, 0.3, 22, '#7a4a32', 4);

  // roof with a chimney rising from the back slope
  gable(p, U, V, DU, DV, WALL, ROOF, roof, wall, () => {
    const cz = roofZ(V + 0.75, V, DV, WALL, ROOF);
    p.box(U + 0.45, V + 0.45, 0.28, 0.3, ROOF + WALL + 14 - cz + 20, '#b86a4a', cz - 20);
    p.box(U + 0.42, V + 0.42, 0.34, 0.36, 4, '#8a5a4a', ROOF + WALL + 14);
    const top = p.iso(U + 0.6, V + 0.6, ROOF + WALL + 18);
    smoke(p, top.x, top.y);
  });
  // attic round window in the gable
  const aw = p.iso(U1, V + DV / 2, WALL + ROOF * 0.38);
  p.ellipse(aw.x, aw.y, 5.6, 6.4, shade('#ffffff', -0.2));
  p.ellipse(aw.x, aw.y, 4, 4.8, GLASS_LIT, shade('#ffffff', -0.5));
  p.line([{ x: aw.x, y: aw.y - 4.8 }, { x: aw.x, y: aw.y + 4.8 }], shade('#ffffff', -0.2), 1);
  p.line([{ x: aw.x - 4, y: aw.y }, { x: aw.x + 4, y: aw.y }], shade('#ffffff', -0.2), 1);

  // porch: deck with railings, steps, and a little canopy over the door
  const pu0 = 1.1;
  const pu1 = 1.8;
  const pv1 = V1 + 0.36;
  p.box(pu0, V1, pu1 - pu0, pv1 - V1, 4, WOOD);
  for (let s = pu0 + 0.12; s < pu1; s += 0.13) p.line([p.iso(s, V1, 4), p.iso(s, pv1, 4)], shade(WOOD, 0.25), 0.6);
  p.box(1.27, pv1, 0.36, 0.16, 2, shade(WOOD, -0.05));
  // railings on either side of the steps
  for (const [a0, a1] of [
    [pu0 + 0.02, 1.25],
    [1.65, pu1 - 0.02],
  ]) {
    p.line([p.iso(a0, pv1 - 0.03, 11), p.iso(a1, pv1 - 0.03, 11)], p.outline, 2.6);
    p.line([p.iso(a0, pv1 - 0.03, 11), p.iso(a1, pv1 - 0.03, 11)], '#fffaf0', 1.2);
    for (let s = a0; s <= a1 + 0.001; s += (a1 - a0) / 2) {
      p.line([p.iso(s, pv1 - 0.03, 4), p.iso(s, pv1 - 0.03, 11)], p.outline, 2.2);
      p.line([p.iso(s, pv1 - 0.03, 4), p.iso(s, pv1 - 0.03, 11)], '#fffaf0', 1);
    }
  }
  // lantern
  const ln = p.iso(1.2, V1 + 0.02, 19);
  p.glow(ln.x, ln.y, 7, '#ffd36a', 0.6);
  p.roundRect(ln.x - 1.6, ln.y - 2.5, 3.2, 5, 1, '#ffe7a0');
  // door canopy
  const cu0 = 1.24;
  const cu1 = 1.66;
  const pr = [p.iso(cu0, V1, 33), p.iso(cu1, V1, 33), p.iso(cu1, V1 + 0.2, 29), p.iso(cu0, V1 + 0.2, 29)];
  p.poly([pr[3], pr[2], { x: pr[2].x, y: pr[2].y + 2 }, { x: pr[3].x, y: pr[3].y + 2 }], shade(roof, -0.3));
  p.poly([pr[2], pr[1], { x: pr[1].x, y: pr[1].y + 2 }, { x: pr[2].x, y: pr[2].y + 2 }], shade(roof, -0.45));
  p.poly(pr, roof);
  // garden
  bushAt(p, 0.3, 2.55, 7, '#5aa04a', 'fhb1', '#ff8fb1');
  bushAt(p, 2.75, 2.2, 6.5, '#5aa04a', 'fhb2', '#ffd34a');
  bushAt(p, 2.8, 0.6, 6, '#62a852', 'fhb3');
}

// ---------------------------------------------------------------------------
// Windmill

function mill(p: Pen): void {
  groundPad(p);
  const cu = 1;
  const cv = 1;
  // stone base
  const stone = '#b9b0a2';
  p.box(0.3, 0.3, 1.4, 1.4, 12, stone);
  const r = rng('millstones');
  const L = faceL(p, 1.7);
  const R = faceR(p, 1.7);
  for (let row = 0; row < 2; row++) {
    for (let s = 0.35 + (row % 2) * 0.12; s < 1.65; s += 0.24) {
      quad(p, L, s, Math.min(s + 0.2, 1.68), 1 + row * 5.5, 5.5 + row * 5.5, shade(stone, (r() - 0.5) * 0.12), shade(stone, -0.3));
      quad(p, R, s, Math.min(s + 0.2, 1.68), 1 + row * 5.5, 5.5 + row * 5.5, shade(stone, -0.2 + (r() - 0.5) * 0.12), shade(stone, -0.45));
    }
  }

  // octagonal tapering tower
  const Z0 = 12;
  const Z1 = 70;
  const R0 = 0.58;
  const R1 = 0.38;
  const vert = (k: number, z: number) => {
    const a = (k * Math.PI) / 4 + Math.PI / 8;
    const rr = R0 + (R1 - R0) * ((z - Z0) / (Z1 - Z0));
    return p.iso(cu + Math.cos(a) * rr, cv + Math.sin(a) * rr, z);
  };
  const tower = '#f4ead8';
  const faceCols: Record<number, string> = { 7: shade(tower, -0.25), 0: shade(tower, -0.1), 1: tower };
  for (const k of [7, 0, 1]) {
    p.poly([vert(k, Z0), vert(k + 1, Z0), vert(k + 1, Z1), vert(k, Z1)], faceCols[k]);
    // plank lines
    for (let z = Z0 + 9; z < Z1; z += 9) p.line([vert(k, z), vert(k + 1, z)], shade(faceCols[k], -0.12), 0.7);
  }
  // timber band at the top
  for (const k of [7, 0, 1]) p.poly([vert(k, Z1 - 4), vert(k + 1, Z1 - 4), vert(k + 1, Z1), vert(k, Z1)], shade('#9a6a43', k === 7 ? -0.25 : k === 0 ? -0.1 : 0));
  // door & window on the front face (k = 0 faces the viewer)
  const fp = (s: number, z: number) => {
    const a = vert(0, z);
    const b = vert(1, z);
    return { x: a.x + (b.x - a.x) * s, y: a.y + (b.y - a.y) * s };
  };
  p.poly([fp(0.28, Z0), fp(0.72, Z0), fp(0.72, Z0 + 18), fp(0.28, Z0 + 18)], '#8a5a3a');
  p.circle(fp(0.5, Z0 + 18).x, fp(0.5, Z0 + 18).y, (fp(0.72, Z0).x - fp(0.28, Z0).x) / 2, '#8a5a3a');
  p.poly([fp(0.29, Z0 + 0.5), fp(0.71, Z0 + 0.5), fp(0.71, Z0 + 18), fp(0.29, Z0 + 18)], '#8a5a3a', null);
  p.line([fp(0.5, Z0 + 1), fp(0.5, Z0 + 22)], shade('#8a5a3a', -0.3), 0.8);
  const kn = fp(0.62, Z0 + 9);
  p.circle(kn.x, kn.y, 0.9, '#ffd34a', null);
  const wc = fp(0.5, Z0 + 38);
  p.circle(wc.x, wc.y, 5, '#ffffff');
  p.circle(wc.x, wc.y, 3.6, GLASS_LIT, shade('#ffffff', -0.5));
  p.line([{ x: wc.x - 3.6, y: wc.y }, { x: wc.x + 3.6, y: wc.y }], '#ffffff', 1);
  // side window
  const sp = (s: number, z: number) => {
    const a = vert(1, z);
    const b = vert(2, z);
    return { x: a.x + (b.x - a.x) * s, y: a.y + (b.y - a.y) * s };
  };
  const sw = sp(0.5, Z0 + 28);
  p.roundRect(sw.x - 3, sw.y - 4, 6, 8, 2, '#ffffff');
  p.roundRect(sw.x - 2, sw.y - 3, 4, 6, 1.5, GLASS_LIT, null);

  // cap
  const capTop = p.iso(cu, cv, Z1 + 24);
  const capVert = (k: number) => {
    const a = (k * Math.PI) / 4 + Math.PI / 8;
    return p.iso(cu + Math.cos(a) * (R1 + 0.1), cv + Math.sin(a) * (R1 + 0.1), Z1 - 1);
  };
  const capCol = '#c8524a';
  for (const k of [6, 7, 0, 1, 2]) {
    const col = k >= 6 || k === 7 ? shade(capCol, -0.22) : k === 0 ? shade(capCol, -0.08) : capCol;
    p.poly([capVert(k), capVert(k + 1), capTop], col);
  }
  p.circle(capTop.x, capTop.y - 1.5, 2.6, '#ffd34a');

  // sails, in the screen plane facing the viewer
  const hub = p.iso(cu + 0.42, cv + 0.42, Z1 + 3);
  const ctx = p.ctx;
  const L0 = 50;
  for (let i = 0; i < 4; i++) {
    const ang = (i * Math.PI) / 2 + 0.38;
    ctx.save();
    ctx.translate(hub.x, hub.y);
    ctx.rotate(ang);
    // lattice sail
    p.rect(9, 0.8, L0 - 9, 9, 'rgba(250,244,230,0.95)');
    for (let x = 9 + 6.8; x < L0; x += 6.8) p.line([{ x, y: 0.8 }, { x, y: 9.8 }], '#b98352', 0.8);
    p.line([{ x: 9, y: 5.3 }, { x: L0, y: 5.3 }], '#b98352', 0.8);
    // spar
    p.rect(0, -1.6, L0 + 2, 3.2, '#8a5a3a');
    ctx.restore();
  }
  p.circle(hub.x, hub.y, 4.5, '#6a4a32');
  p.circle(hub.x - 1, hub.y - 1, 1.5, '#a0785a', null);

  // flour sacks by the door
  sackProp(p, 1.82, 1.62, 0.9);
  sackProp(p, 1.68, 1.84, 1);
}

// ---------------------------------------------------------------------------
// Dairy

function dairy(p: Pen): void {
  groundPad(p);
  const U = 0.25;
  const V = 0.3;
  const DU = 1.5;
  const DV = 1.4;
  const WALL = 32;
  const ROOF = 30;
  const wall = '#f8f6f0';
  const blue = '#4f86c6';
  const U1 = U + DU;
  const V1 = V + DV;
  steppingStones(p, [
    [1.9, 0.95],
    [2.05, 1.12],
  ]);
  foundation(p, U, V, DU, DV, 5, '#b9c3cc');
  p.box(U, V, DU, DV, WALL - 5, wall, 5);
  const L = faceL(p, V1);
  const R = faceR(p, U1);
  // blue trim band and corner boards
  quad(p, L, U, U1, WALL - 3, WALL, blue);
  quad(p, L, U, U + 0.05, 5, WALL - 3, shade(blue, 0.1));
  quad(p, L, U1 - 0.05, U1, 5, WALL - 3, shade(blue, 0.1));
  // big barn door on the gable end
  const dv0 = V + DV / 2 - 0.34;
  const dv1 = V + DV / 2 + 0.34;
  quad(p, R, dv0 - 0.04, dv1 + 0.04, 0, 25, shade('#ffffff', R.dim - 0.05));
  quad(p, R, dv0, dv1, 0, 23, shade(blue, R.dim));
  const mid = V + DV / 2;
  for (const [a, b] of [
    [dv0, mid],
    [mid, dv1],
  ]) {
    p.line([R.pt(a, 0.5), R.pt(b, 22.5)], shade('#ffffff', R.dim), 1.6);
    p.line([R.pt(b, 0.5), R.pt(a, 22.5)], shade('#ffffff', R.dim), 1.6);
    quad(p, R, a, b, 0, 23, null, shade('#ffffff', R.dim));
  }
  // windows on the long wall
  windowOn(p, L, 0.65, 13, 0.32, 11, { frame: '#ffffff', shutters: blue });
  windowOn(p, L, 1.4, 13, 0.32, 11, { frame: '#ffffff', shutters: blue });
  gable(p, U, V, DU, DV, WALL, ROOF, blue, wall);
  // cupola on the ridge
  const rz = WALL + ROOF;
  const cuu = U + DU * 0.45;
  p.box(cuu - 0.12, mid - 0.12, 0.24, 0.24, 9, wall, rz - 4);
  p.hipRoof(cuu - 0.12, mid - 0.12, 0.24, 0.24, rz + 5, 8, blue, 0.05);
  // cow-spot sign
  const sg = p.iso(U1, mid, WALL + ROOF * 0.38);
  roundSign(p, sg.x, sg.y, 7.5, '#ffffff', (x, y) => {
    p.ellipse(x - 2.5, y - 1.5, 2.2, 1.8, INK, null);
    p.ellipse(x + 2.5, y + 2, 1.6, 1.3, INK, null);
    p.ellipse(x + 2, y - 2.5, 1, 0.8, INK, null);
  });
  // milk cans
  const can = (u: number, v: number) => {
    const at = p.iso(u, v);
    p.cylinder(at.x, at.y, 3.6, 9, '#c9d3dc');
    p.cylinder(at.x, at.y - 9, 2.2, 3, '#b0bcc8');
    p.line([{ x: at.x - 3.6, y: at.y - 4 }, { x: at.x + 3.6, y: at.y - 4 }], '#7f8c99', 0.8);
  };
  can(0.32, 1.88);
  can(0.55, 1.95);
  bushAt(p, 1.9, 0.35, 5.5, '#5aa04a', 'dairyb', '#ffffff');
}

// ---------------------------------------------------------------------------
// Bakery

function bakery(p: Pen): void {
  groundPad(p);
  const U = 0.25;
  const V = 0.25;
  const DU = 1.5;
  const DV = 1.35;
  const WALL = 34;
  const ROOF = 26;
  const brick = '#c8664e';
  const cream = '#f6e6c8';
  const roof = '#a65c3a';
  const U1 = U + DU;
  const V1 = V + DV;
  const L = faceL(p, V1);
  const R = faceR(p, U1);
  steppingStones(p, [
    [1.32, 1.85],
    [1.45, 1.98],
  ]);
  p.box(U, V, DU, DV, 12, brick);
  p.box(U, V, DU, DV, WALL - 12, cream, 12);
  // brick courses
  for (let z = 3; z < 12; z += 3) {
    p.line([L.pt(U, z), L.pt(U1, z)], shade(brick, -0.2), 0.6);
    p.line([R.pt(V, z), R.pt(V1, z)], shade(brick, -0.38), 0.6);
  }
  // display window with loaves
  windowOn(p, L, 0.75, 8, 0.62, 15, {
    panes: false,
    inside: (pt) => {
      for (const [s, h] of [
        [0.22, 0.25],
        [0.5, 0.25],
        [0.78, 0.25],
      ]) {
        const at = pt(s, h);
        p.ellipse(at.x, at.y - 1.5, 4.2, 2.6, '#d58a3a', shade('#d58a3a', -0.4));
        p.line([{ x: at.x - 1.5, y: at.y - 2.8 }, { x: at.x, y: at.y - 3.3 }], '#f8dca0', 0.8);
      }
      const sh = pt(0, 0.15);
      const sh2 = pt(1, 0.15);
      p.line([sh, sh2], '#8a5a3a', 1);
      for (const s of [0.3, 0.7]) {
        const at = pt(s, 0.68);
        p.ellipse(at.x, at.y - 1.5, 2.8, 2.2, '#e8a050', shade('#e8a050', -0.4));
        p.circle(at.x, at.y - 3, 1.2, '#f8f0e0', null);
      }
    },
  });
  door(p, L, 1.42, 0.27, 21, '#4f8a6a');
  awning(p, L, 0.38, 1.6, 31.5, 0.2, 6, '#e8424a', '#fff6ea', 8);
  windowOn(p, R, V + DV / 2, 15, 0.36, 11, { frame: '#fff6ea' });
  gable(p, U, V, DU, DV, WALL, ROOF, roof, cream, () => {
    const cz = roofZ(V + 0.45, V, DV, WALL, ROOF);
    p.box(U + 1.05, V + 0.25, 0.22, 0.22, WALL + ROOF + 10 - cz + 14, brick, cz - 14);
    const top = p.iso(U + 1.16, V + 0.36, WALL + ROOF + 10);
    smoke(p, top.x, top.y);
  });
  // bread sign hanging off the gable end
  const anchor = R.pt(V + 0.18, WALL - 4);
  const tip = R.out(V + 0.18, WALL - 4, 0.38);
  bracket(p, anchor, tip);
  p.line([tip, { x: tip.x, y: tip.y + 4 }], p.outline, 0.8);
  roundSign(p, tip.x, tip.y + 11, 8, '#fff3d6', (x, y) => {
    p.ellipse(x, y + 0.5, 5.4, 3.6, '#d58a3a', shade('#d58a3a', -0.45));
    for (const dx of [-2, 0.4, 2.8]) p.line([{ x: x + dx - 1, y: y + 0.5 }, { x: x + dx + 0.6, y: y - 1.6 }], '#f8dca0', 1);
  });
  // flour sack & a bench
  sackProp(p, 0.3, 1.82, 1);
  bushAt(p, 1.92, 0.3, 5, '#5aa04a', 'bakb', '#ff8fb1');
}

// ---------------------------------------------------------------------------
// Jam kitchen

function jamKitchen(p: Pen): void {
  groundPad(p);
  const U = 0.25;
  const V = 0.3;
  const DU = 1.45;
  const DV = 1.3;
  const WALL = 32;
  const ROOF = 30;
  const wall = '#fff4ea';
  const pink = '#e8607a';
  const roof = '#de4f63';
  const U1 = U + DU;
  const V1 = V + DV;
  const L = faceL(p, V1);
  const R = faceR(p, U1);
  steppingStones(p, [
    [1.25, 1.82],
    [1.4, 1.96],
  ]);
  foundation(p, U, V, DU, DV, 5, '#c9b8a8');
  p.box(U, V, DU, DV, WALL - 5, wall, 5);
  // pink half-timbering
  quad(p, L, U, U1, WALL - 3, WALL, pink);
  quad(p, L, U, U1, 5, 7, shade(pink, 0.15));
  // window with jars on a shelf
  windowOn(p, L, 0.7, 12, 0.56, 14, {
    frame: '#ffffff',
    shutters: '#f49ab0',
    panes: false,
    inside: (pt) => {
      const sh0 = pt(0, 0.12);
      const sh1 = pt(1, 0.12);
      p.line([sh0, sh1], '#8a5a3a', 1.2);
      const jars = ['#d9233c', '#f28a1c', '#8e1630', '#e2a33a'];
      jars.forEach((c, i) => {
        const at = pt(0.16 + i * 0.23, 0.12);
        p.roundRect(at.x - 2, at.y - 7, 4, 6.5, 1.2, c, shade(c, -0.5));
        p.rect(at.x - 2.2, at.y - 8.5, 4.4, 1.8, '#fff3e3', null);
      });
      const sh2 = pt(0, 0.6);
      const sh3 = pt(1, 0.6);
      p.line([sh2, sh3], '#8a5a3a', 1);
      [0.25, 0.55, 0.85].forEach((s, i) => {
        const at = pt(s, 0.6);
        const c = ['#e8424a', '#9b4ac0', '#f4b844'][i];
        p.roundRect(at.x - 1.6, at.y - 5, 3.2, 4.6, 1, c, shade(c, -0.5));
      });
    },
  });
  flowerBox(p, L, 0.42, 0.98, 10, ['#ff8fb1', '#ff5a7a'], 'jamfb');
  door(p, L, 1.38, 0.26, 21, '#d9475a');
  windowOn(p, R, V + DV / 2, 14, 0.32, 11, { frame: '#ffffff', shutters: '#f49ab0' });
  gable(p, U, V, DU, DV, WALL, ROOF, roof, wall, () => {
    const cz = roofZ(V + 0.45, V, DV, WALL, ROOF);
    p.box(U + 0.3, V + 0.25, 0.2, 0.2, WALL + ROOF + 8 - cz + 14, '#c9b8a8', cz - 14);
    const top = p.iso(U + 0.4, V + 0.35, WALL + ROOF + 8);
    smoke(p, top.x, top.y);
  });
  // heart in the gable
  const hz = p.iso(U1, V + DV / 2, WALL + ROOF * 0.4);
  p.heart(hz.x, hz.y, 4.6, '#ff8fa8', shade(roof, -0.3));
  // strawberry sign on a post
  const post = p.iso(0.18, 1.9);
  p.line([post, { x: post.x, y: post.y - 22 }], p.outline, 3);
  p.line([post, { x: post.x, y: post.y - 22 }], '#8a5a3a', 1.6);
  roundSign(p, post.x, post.y - 26, 8, '#fff3e3', (x, y) => {
    // jar emblem
    p.roundRect(x - 3.5, y - 3, 7, 7, 1.8, '#d9233c', shade('#d9233c', -0.5));
    p.rect(x - 4, y - 5, 8, 2.4, '#e8607a', null);
    p.line([{ x: x - 4, y: y - 2.8 }, { x: x + 4, y: y - 2.8 }], p.outline, 0.6);
    p.heart(x, y + 0.6, 1.6, '#ffffff', null);
  });
  bushAt(p, 1.9, 0.35, 5.5, '#5aa04a', 'jamb', '#e8424a');
}

// ---------------------------------------------------------------------------
// Loom (weaving workshop)

function loom(p: Pen): void {
  groundPad(p);
  const U = 0.25;
  const V = 0.3;
  const DU = 1.5;
  const DV = 1.35;
  const WALL = 32;
  const ROOF = 26;
  const wood = '#c99a64';
  const roof = '#7d6aa8';
  const U1 = U + DU;
  const V1 = V + DV;
  const L = faceL(p, V1);
  const R = faceR(p, U1);
  steppingStones(p, [
    [0.95, 1.85],
    [1.05, 2.0],
  ]);
  foundation(p, U, V, DU, DV, 4, '#a89c8e');
  p.box(U, V, DU, DV, WALL - 4, wood, 4);
  // vertical planks
  for (let s = U + 0.1; s < U1 - 0.02; s += 0.1) p.line([L.pt(s, 4.5), L.pt(s, WALL - 0.5)], shade(wood, -0.15), 0.6);
  for (let s = V + 0.1; s < V1 - 0.02; s += 0.1) p.line([R.pt(s, 4.5), R.pt(s, WALL - 0.5)], shade(wood, -0.35), 0.6);
  // big open double door showing the loom inside
  const s0 = 0.62;
  const s1 = 1.28;
  quad(p, L, s0 - 0.04, s1 + 0.04, 4, 27, '#8a5a3a');
  quad(p, L, s0, s1, 4, 25, '#4a3226');
  // loom frame + coloured warp threads
  quad(p, L, s0 + 0.1, s1 - 0.1, 6, 21, null, '#d9b98a');
  const warp = ['#ee6f8a', '#8cc0e6', '#ffd56a', '#9ad27a', '#c9a6ee'];
  for (let i = 0; i < 10; i++) {
    const s = s0 + 0.12 + (i / 9) * (s1 - s0 - 0.24);
    p.line([L.pt(s, 7), L.pt(s, 20)], warp[i % warp.length], 0.9);
  }
  quad(p, L, s0 + 0.1, s1 - 0.1, 9, 13, '#ee6f8a', null);
  // open door leaves
  p.poly([L.pt(s0, 4), L.out(s0 - 0.02, 4, 0.22), L.out(s0 - 0.02, 25, 0.22), L.pt(s0, 25)], shade(wood, -0.1));
  p.poly([L.pt(s1, 4), L.pt(s1 + 0.24, 4), L.pt(s1 + 0.24, 25), L.pt(s1, 25)], shade(wood, 0.08));
  p.line([L.pt(s1 + 0.02, 6), L.pt(s1 + 0.22, 23)], shade(wood, -0.3), 1);
  windowOn(p, R, V + DV / 2, 14, 0.36, 11, { frame: '#f6ead8' });
  gable(p, U, V, DU, DV, WALL, ROOF, roof, wood);
  // yarn-ball sign on the gable
  const sg = p.iso(U1, V + DV / 2, WALL + ROOF * 0.4);
  roundSign(p, sg.x, sg.y, 7.5, '#fff3e3', (x, y) => {
    p.ball(x, y, 4.6, '#ee6f8a', shade('#ee6f8a', -0.5));
    p.curve({ x: x - 4, y: y - 1 }, { x: x, y: y + 2 }, { x: x + 4, y: y - 2 }, shade('#ee6f8a', -0.3), 0.7);
    p.curve({ x: x - 2, y: y - 4 }, { x: x + 1, y: y }, { x: x - 1, y: y + 4 }, shade('#ee6f8a', 0.3), 0.7);
  });
  // basket of yarn balls
  const bk = p.iso(0.3, 1.92);
  p.ellipse(bk.x, bk.y - 4, 7, 3.2, '#c08a55');
  p.ball(bk.x - 3, bk.y - 6, 3, '#8cc0e6');
  p.ball(bk.x + 2.6, bk.y - 6.5, 3, '#ffd56a');
  p.ball(bk.x, bk.y - 8.5, 3, '#c9a6ee');
  p.poly(
    [
      { x: bk.x - 7, y: bk.y - 4 },
      { x: bk.x + 7, y: bk.y - 4 },
      { x: bk.x + 5.5, y: bk.y + 2 },
      { x: bk.x - 5.5, y: bk.y + 2 },
    ],
    '#b07a45',
  );
  p.line([{ x: bk.x - 6.3, y: bk.y - 1 }, { x: bk.x + 6.3, y: bk.y - 1 }], shade('#b07a45', -0.3), 0.7);
  // spools
  const sp = p.iso(1.88, 1.2);
  p.cylinder(sp.x, sp.y, 2.4, 7, '#e9d3b0');
  p.cylinder(sp.x, sp.y - 1.5, 2, 4, '#9ad27a', null);
  bushAt(p, 1.9, 0.35, 5, '#5aa04a', 'loomb', '#c9a6ee');
}

// ---------------------------------------------------------------------------
// Juice stand

function juiceBar(p: Pen): void {
  groundPad(p, 'rgba(255,230,160,0.25)');
  const yellow = '#ffd84a';
  const white = '#fffaf0';
  // back wall with a menu board
  p.box(0.3, 0.3, 1.4, 0.25, 40, '#7cc7a8');
  const B = faceL(p, 0.55);
  quad(p, B, 0.55, 1.15, 16, 30, '#3f5a4a');
  for (let i = 0; i < 3; i++) p.line([B.pt(0.62, 26 - i * 4), B.pt(1.0 - i * 0.05, 26 - i * 4)], '#ffffff', 0.8);
  const ms = B.pt(1.45, 24);
  p.ball(ms.x, ms.y, 4, '#ff9a3a');
  // rear posts
  for (const [u, v] of [[1.68, 0.6]] as [number, number][]) {
    const b = p.iso(u, v, 0);
    const t = p.iso(u, v, 50);
    p.line([b, t], p.outline, 3);
    p.line([b, t], white, 1.6);
  }
  // counter
  const CU0 = 0.3;
  const CU1 = 1.7;
  const CV0 = 1.0;
  const CV1 = 1.62;
  p.box(CU0, CV0, CU1 - CU0, CV1 - CV0, 16, { top: '#fff6e0', left: yellow, right: shade(yellow, -0.2) });
  const CL = faceL(p, CV1);
  for (let s = CU0 + 0.14; s < CU1 - 0.05; s += 0.28) quad(p, CL, s, s + 0.14, 0.5, 13, white, null);
  quad(p, CL, CU0, CU1, 13, 16, '#ff9a3a');
  const CR = faceR(p, CU1);
  quad(p, CR, CV0, CV1, 13, 16, shade('#ff9a3a', -0.2));
  p.box(CU0 - 0.03, CV0 - 0.03, CU1 - CU0 + 0.06, CV1 - CV0 + 0.06, 2, '#fff6e0', 16);
  // fruit on the counter
  const fruit = (u: number, v: number, col: string, r = 2.6) => {
    const at = p.iso(u, v, 18);
    p.ball(at.x, at.y - r, r, col);
  };
  // juice dispensers
  for (const [u, col] of [
    [0.55, '#ffb13a'],
    [0.85, '#f07aa0'],
  ] as [number, string][]) {
    const at = p.iso(u, 1.3, 18);
    p.cylinder(at.x, at.y, 4.2, 4, '#d9dde3');
    p.cylinder(at.x, at.y - 4, 3.8, 10, col);
    p.ellipse(at.x, at.y - 14, 3.8, 1.9, 'rgba(255,255,255,0.5)', p.outline);
    p.line([{ x: at.x - 2, y: at.y - 12 }, { x: at.x - 2, y: at.y - 6 }], 'rgba(255,255,255,0.7)', 1);
  }
  fruit(1.2, 1.2, '#ff9a3a');
  fruit(1.35, 1.15, '#ff9a3a');
  fruit(1.28, 1.35, '#f7d23a');
  fruit(1.5, 1.3, '#f7d23a');
  fruit(1.45, 1.5, '#7cbf4f', 2.4);
  fruit(1.12, 1.47, '#e8384a', 2);
  // front posts
  for (const [u, v] of [
    [0.32, 1.6],
    [1.68, 1.6],
  ] as [number, number][]) {
    const b = p.iso(u, v, 16);
    const t = p.iso(u, v, 45);
    p.line([b, t], p.outline, 3);
    p.line([b, t], white, 1.6);
  }
  // sloping striped canopy
  const n = 7;
  const u0 = 0.18;
  const u1 = 1.82;
  const du = (u1 - u0) / n;
  const zb = 54;
  const zf = 44;
  const v0 = 0.2;
  const v1 = 1.72;
  for (let i = 0; i < n; i++) {
    const a = u0 + i * du;
    const b = a + du;
    const col = i % 2 ? white : '#ff7a3a';
    p.poly([p.iso(a, v0, zb), p.iso(b, v0, zb), p.iso(b, v1, zf), p.iso(a, v1, zf)], col, null);
    const m0 = p.iso(a, v1, zf);
    const m1 = p.iso(b, v1, zf);
    const r = Math.hypot(m1.x - m0.x, m1.y - m0.y) / 2;
    const ang = Math.atan2(m1.y - m0.y, m1.x - m0.x);
    p.ctx.beginPath();
    p.ctx.arc((m0.x + m1.x) / 2, (m0.y + m1.y) / 2, r, ang, ang + Math.PI);
    p.ctx.closePath();
    p.ctx.fillStyle = shade(col, -0.08);
    p.ctx.fill();
    p.ctx.strokeStyle = p.outline;
    p.ctx.lineWidth = 1;
    p.ctx.stroke();
  }
  // canopy side edge
  p.poly([p.iso(u1, v0, zb), p.iso(u1, v1, zf), p.iso(u1, v1, zf - 3), p.iso(u1, v0, zb - 3)], shade('#ff7a3a', -0.3));
  p.poly([p.iso(u0, v0, zb), p.iso(u1, v0, zb), p.iso(u1, v1, zf), p.iso(u0, v1, zf)], null);
  // big orange-slice sign on top
  const sg = p.iso(1.0, 0.9, 56);
  p.line([{ x: sg.x, y: sg.y }, { x: sg.x, y: sg.y - 6 }], p.outline, 2);
  const cx = sg.x;
  const cy = sg.y - 14;
  p.circle(cx, cy, 10, '#ff9a3a');
  p.circle(cx, cy, 8, '#ffd08a', null);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    p.line([{ x: cx, y: cy }, { x: cx + Math.cos(a) * 8, y: cy + Math.sin(a) * 8 }], '#ff9a3a', 1);
  }
  p.circle(cx, cy, 1.4, '#fff6e0', null);
  leafy(p, cx + 7, cy - 9);
  // stool
  const st = p.iso(0.95, 1.92);
  p.line([st, { x: st.x, y: st.y - 9 }], p.outline, 1.6);
  p.ellipse(st.x, st.y - 10, 4.5, 2.2, '#4fb0d9');
}

function leafy(p: Pen, x: number, y: number): void {
  p.ellipse(x, y, 4, 2, '#6fb24c', p.outline, -0.6);
  p.line([{ x: x - 3, y: y + 2 }, { x: x + 3, y: y - 2 }], shade('#6fb24c', -0.3), 0.6);
}

// ---------------------------------------------------------------------------
// Café

function cafe(p: Pen): void {
  groundPad(p);
  const U = 0.25;
  const V = 0.2;
  const DU = 1.5;
  const DV = 1.1;
  const WALL = 34;
  const ROOF = 24;
  const wall = '#d9ecd4';
  const green = '#3f8a6a';
  const roof = '#7a4a32';
  const U1 = U + DU;
  const V1 = V + DV;
  const L = faceL(p, V1);
  const R = faceR(p, U1);
  // patio
  p.diamond(0.2, V1 + 0.02, 1.6, 0.55, '#e8d9c0', shade('#e8d9c0', -0.25));
  for (let s = 0.4; s < 1.8; s += 0.2) p.line([p.iso(s, V1 + 0.02), p.iso(s, V1 + 0.57)], shade('#e8d9c0', -0.12), 0.6);
  foundation(p, U, V, DU, DV, 5, '#a9988a');
  p.box(U, V, DU, DV, WALL - 5, wall, 5);
  quad(p, L, U, U1, WALL - 3, WALL, '#8a5a3a');
  // big café window
  windowOn(p, L, 0.72, 10, 0.6, 14, {
    frame: '#8a5a3a',
    panes: false,
    inside: (pt) => {
      // counter with a little cake stand
      p.line([pt(0, 0.25), pt(1, 0.25)], '#8a5a3a', 1.2);
      const cs = pt(0.3, 0.25);
      p.ellipse(cs.x, cs.y - 2.5, 3, 1.4, '#f39bb6', null);
      p.rect(cs.x - 2.6, cs.y - 2.4, 5.2, 2.2, '#f8f0e0', null);
      const cup = pt(0.7, 0.25);
      p.roundRect(cup.x - 1.6, cup.y - 3.5, 3.2, 3.2, 0.8, '#ffffff', null);
      // pendant lamp
      const lamp = pt(0.5, 0.92);
      p.line([pt(0.5, 1), lamp], INK, 0.6);
      p.glow(lamp.x, lamp.y + 2, 6, '#fff3c0', 0.8);
    },
  });
  door(p, L, 1.32, 0.26, 21, green);
  awning(p, L, 0.32, 1.62, 31, 0.2, 6, green, '#fff6ea', 8);
  windowOn(p, R, V + DV / 2, 14, 0.3, 11, { frame: '#8a5a3a' });
  gable(p, U, V, DU, DV, WALL, ROOF, roof, wall, () => {
    const cz = roofZ(V + 0.3, V, DV, WALL, ROOF);
    p.box(U + 1.0, V + 0.18, 0.18, 0.18, WALL + ROOF + 6 - cz + 12, '#b86a4a', cz - 12);
    const top = p.iso(U + 1.09, V + 0.27, WALL + ROOF + 6);
    smoke(p, top.x, top.y);
  });
  // coffee-cup sign standing on the roof ridge
  const sg = p.iso(U + 0.6, V + DV / 2, WALL + ROOF);
  p.line([sg, { x: sg.x, y: sg.y - 6 }], p.outline, 2);
  const sx = sg.x;
  const sy = sg.y - 14;
  roundSign(p, sx, sy, 10, '#fff3e3', (x, y) => {
    p.ctx.beginPath();
    p.ctx.arc(x + 4.2, y + 0.5, 2.2, -Math.PI / 2, Math.PI / 2);
    p.ctx.strokeStyle = '#b06a3a';
    p.ctx.lineWidth = 1.4;
    p.ctx.stroke();
    p.poly(
      [
        { x: x - 5, y: y - 2 },
        { x: x + 4, y: y - 2 },
        { x: x + 3, y: y + 4 },
        { x: x - 4, y: y + 4 },
      ],
      '#b06a3a',
      shade('#b06a3a', -0.45),
    );
    p.ellipse(x - 0.5, y - 2, 4.5, 1.2, '#6a3a1a', null);
    p.curve({ x: x - 2, y: y - 4 }, { x: x - 3.5, y: y - 6 }, { x: x - 1.5, y: y - 8 }, '#b06a3a', 0.9);
    p.curve({ x: x + 1, y: y - 4 }, { x: x - 0.5, y: y - 6 }, { x: x + 1.5, y: y - 8 }, '#b06a3a', 0.9);
  });
  // outdoor table with umbrella and chairs
  const chair = (u: number, v: number) => {
    p.box(u - 0.07, v - 0.07, 0.14, 0.14, 6, '#c98f5a');
    const bk = p.iso(u - 0.07, v + 0.07, 6);
    const bk2 = p.iso(u + 0.07, v + 0.07, 6);
    p.poly([bk, bk2, { x: bk2.x, y: bk2.y - 7 }, { x: bk.x, y: bk.y - 7 }], '#b07a45');
  };
  chair(0.55, 1.62);
  const tb = p.iso(0.8, 1.72);
  p.line([tb, { x: tb.x, y: tb.y - 9 }], p.outline, 2.4);
  p.line([tb, { x: tb.x, y: tb.y - 30 }], '#8a5a3a', 1.2);
  p.ellipse(tb.x, tb.y - 9, 7, 3.4, '#fffaf0');
  p.roundRect(tb.x - 1.5, tb.y - 13, 3, 3, 0.8, '#ffffff');
  p.ellipse(tb.x + 3.5, tb.y - 10, 1.8, 0.9, '#f39bb6', null);
  chair(1.05, 1.8);
  // umbrella
  const uy = tb.y - 30;
  const ux = tb.x;
  for (let i = 0; i < 6; i++) {
    const a0 = Math.PI + (i / 6) * Math.PI;
    const a1 = Math.PI + ((i + 1) / 6) * Math.PI;
    p.poly(
      [
        { x: ux, y: uy - 6 },
        { x: ux + Math.cos(a0) * 15, y: uy + 2 + Math.sin(a0 + Math.PI) * 0 },
        { x: ux + Math.cos(a1) * 15, y: uy + 2 },
      ],
      null,
      null,
    );
  }
  const ctx = p.ctx;
  ctx.beginPath();
  ctx.moveTo(ux - 15, uy + 2);
  ctx.quadraticCurveTo(ux - 10, uy - 6, ux, uy - 7);
  ctx.quadraticCurveTo(ux + 10, uy - 6, ux + 15, uy + 2);
  ctx.quadraticCurveTo(ux, uy + 5, ux - 15, uy + 2);
  ctx.closePath();
  ctx.fillStyle = green;
  ctx.fill();
  ctx.save();
  ctx.clip();
  for (const dx of [-7, 3]) p.poly([{ x: ux, y: uy - 7 }, { x: ux + dx - 3, y: uy + 6 }, { x: ux + dx + 3, y: uy + 6 }], '#fff6ea', null);
  ctx.restore();
  ctx.beginPath();
  ctx.moveTo(ux - 15, uy + 2);
  ctx.quadraticCurveTo(ux - 10, uy - 6, ux, uy - 7);
  ctx.quadraticCurveTo(ux + 10, uy - 6, ux + 15, uy + 2);
  ctx.quadraticCurveTo(ux, uy + 5, ux - 15, uy + 2);
  ctx.closePath();
  ctx.strokeStyle = p.outline;
  ctx.lineWidth = 1;
  ctx.stroke();
  p.circle(ux, uy - 7.5, 1.3, '#fff6ea');
  // potted plant by the door
  const pot = p.iso(1.72, 1.45);
  p.poly(
    [
      { x: pot.x - 3.5, y: pot.y - 6 },
      { x: pot.x + 3.5, y: pot.y - 6 },
      { x: pot.x + 2.6, y: pot.y },
      { x: pot.x - 2.6, y: pot.y },
    ],
    '#d0704a',
  );
  p.foliage(pot.x, pot.y - 10, 5, '#5aa04a', 'cafepot', 5);
}

// ---------------------------------------------------------------------------

function genericBuilding(id: string): (p: Pen) => void {
  const col = mix('#f6e6c8', ['#cfe3f2', '#f9d6e6', '#d9ecd4'][id.length % 3], 0.6);
  return (p) => {
    groundPad(p);
    const du = p.fw - 0.5;
    const dv = p.fh - 0.6;
    p.box(0.25, 0.3, du, dv, 30, boxColors(col));
    door(p, faceL(p, 0.3 + dv), 0.25 + du / 2, 0.26, 20, '#8a5a3a');
    gable(p, 0.25, 0.3, du, dv, 30, 24, '#c8524a', col);
  };
}

const BUILDING_ART: Record<string, { paint: (p: Pen) => void; height: number }> = {
  farmhouse: { paint: farmhouse, height: 100 },
  mill: { paint: mill, height: 106 },
  dairy: { paint: dairy, height: 92 },
  bakery: { paint: bakery, height: 92 },
  jam_kitchen: { paint: jamKitchen, height: 92 },
  loom: { paint: loom, height: 88 },
  juice_bar: { paint: juiceBar, height: 90 },
  cafe: { paint: cafe, height: 90 },
};

export const sprites: SpriteSpec[] = BUILDING_LIST.map((b) => {
  const art = BUILDING_ART[b.id];
  return {
    key: `building:${b.id}`,
    fw: b.w,
    fh: b.h,
    height: art?.height ?? 90,
    paint: art?.paint ?? genericBuilding(b.id),
  };
});
