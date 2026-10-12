// Nursery: the Nursery Barn (deco:nursery_barn, 3x3), where baby animals are
// cosseted. A pastel-pink cousin of the red barn: a gambrel roof with a scalloped
// cream eave, a heart window in the gable, big open double doors with warm straw
// inside, a chick weathervane, a picket-fenced yard corner with a straw bale and
// two chicks, a baby-bottle sign and a star mobile over the door.
// Same house style as country_a.ts: warm brown OUTLINE, top-left light, soft shading.
import { type IconSpec, type Pen, type Pt, type SpriteSpec, rgba, shade } from './kit';
import { NURSERY_DECORATIONS } from '@farm/shared';

type Fill = string | CanvasGradient | null;

const WALL = '#ffd3e1';
const WALL_LINE = '#f0a6bf';
const ROOF = '#f7a6c3';
const ROOF_LINE = '#d56d97';
const TRIM = '#fff8ee';
const PINK = '#ffb3cf';
const PINK_D = '#e77fa6';
const BLUSH = '#ff8fb1';
const GLASS = '#ffe39a';
const STRAW = '#f6d77e';
const STRAW_D = '#d9a94a';
const INSIDE = '#9a5a34';
const CHICK = '#ffe066';
const BEAK = '#ff9a3c';
const STAR = '#ffd84a';
const MINT = '#a8e6cf';
const LILAC = '#c9b8f5';
const ROD = '#8a6a55';
const STRING = '#6a4a32';
const INK = '#2b1d14';
const FENCE = '#fffaf2';
const FLOWERS = ['#ffffff', '#ff8fb1', '#c9b8f5'];

// ---------------------------------------------------------------------------
// Helpers

/** A wall plane we can paint onto: s runs along the wall, z is height. */
interface Face {
  pt: (s: number, z: number) => Pt;
  /** Shade applied to colours painted on this face (the gable faces are a touch darker). */
  dim: number;
}

/** The front-left wall: v is fixed and s runs along u (left to right on screen). */
const faceL = (p: Pen, v: number): Face => ({ pt: (s, z) => p.iso(s, v, z), dim: 0 });
/** The gable wall (faces bottom-right): u is fixed and s runs along v. */
const faceR = (p: Pen, u: number): Face => ({ pt: (s, z) => p.iso(u, s, z), dim: -0.1 });

const tint = (f: Face, col: string): string => shade(col, f.dim);

function quad(p: Pen, f: Face, s0: number, s1: number, z0: number, z1: number, fill: Fill, stroke: string | null = p.outline): void {
  p.poly([f.pt(s0, z0), f.pt(s1, z0), f.pt(s1, z1), f.pt(s0, z1)], fill, stroke);
}

/** A line with an outline underneath (rails, rope, trim). */
function thick(p: Pen, pts: Pt[], color: string, w: number): void {
  p.line(pts, p.outline, w + 2);
  p.line(pts, color, w);
}

/** Scalloped shingle rows across one roof slope, from edge a to edge b. */
function shingles(p: Pen, ua: number, ub: number, a: { v: number; z: number }, b: { v: number; z: number }): void {
  [0.3, 0.64].forEach((s, idx) => {
    const v = a.v + (b.v - a.v) * s;
    const z = a.z + (b.z - a.z) * s;
    const off = idx ? 0.14 : 0;
    for (let u = ua + 0.16 + off; u < ub - 0.08; u += 0.28) {
      const q = p.iso(u, v, z);
      p.curve({ x: q.x - 2.8, y: q.y }, { x: q.x, y: q.y + 3 }, { x: q.x + 2.8, y: q.y }, ROOF_LINE, 0.8);
    }
  });
}

/** A little baby chick (also the weathervane). (x, y) is its centre, r its body radius. */
function chick(p: Pen, x: number, y: number, r: number): void {
  // tail tuft
  p.poly(
    [
      { x: x - r * 0.7, y: y - r * 0.3 },
      { x: x - r * 1.7, y: y - r * 0.9 },
      { x: x - r * 0.9, y: y + r * 0.2 },
    ],
    shade(CHICK, -0.08),
    p.outline,
    0.7,
  );
  p.ball(x, y, r, CHICK);
  p.ellipse(x - r * 0.3, y + r * 0.25, r * 0.5, r * 0.32, shade(CHICK, -0.2), null, -0.3);
  // beak
  p.poly(
    [
      { x: x + r * 0.7, y: y - r * 0.2 },
      { x: x + r * 1.55, y: y + r * 0.1 },
      { x: x + r * 0.7, y: y + r * 0.45 },
    ],
    BEAK,
    p.outline,
    0.6,
  );
  p.circle(x + r * 0.35, y - r * 0.25, Math.max(0.7, r * 0.14), INK, null);
  p.circle(x + r * 0.42, y - r * 0.32, Math.max(0.3, r * 0.05), '#ffffff', null);
  p.ellipse(x + r * 0.05, y + r * 0.42, r * 0.28, r * 0.16, rgba(BLUSH, 0.75), null);
}

/** A row of white picket fence from ground spot a to b, with n+1 pickets. */
interface Spot {
  u: number;
  v: number;
}

function picketRun(p: Pen, a: Spot, b: Spot, n: number): void {
  const at = (t: number, z: number) => p.iso(a.u + (b.u - a.u) * t, a.v + (b.v - a.v) * t, z);
  thick(p, [at(0, 12), at(1, 12)], FENCE, 2);
  thick(p, [at(0, 5), at(1, 5)], FENCE, 2);
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const g = at(t, 0);
    const sh = at(t, 13);
    const tip = at(t, 17);
    p.poly(
      [
        { x: g.x - 2, y: g.y },
        { x: g.x - 2, y: sh.y },
        { x: g.x, y: tip.y },
        { x: g.x + 2, y: sh.y },
        { x: g.x + 2, y: g.y },
      ],
      FENCE,
      p.outline,
      0.9,
    );
  }
}

/** A round straw bale on the grass; (x, y) is its ground centre. */
function strawBale(p: Pen, x: number, y: number): void {
  p.shadow(x, y, 15, 5, 0.22);
  p.roundRect(x - 13, y - 17, 26, 17, 6, p.vgrad(y - 17, y, '#ffeaa8', STRAW_D));
  for (const dx of [-4, 3]) {
    p.curve({ x: x + dx, y: y - 15 }, { x: x + dx + 2, y: y - 8.5 }, { x: x + dx, y: y - 2 }, STRAW_D, 0.8);
  }
  p.ellipse(x - 8, y - 8.5, 3.6, 7.5, '#fff0bd', STRAW_D, 0);
  p.line([{ x: x - 9.5, y: y - 13 }, { x: x - 9.5, y: y - 4 }], STRAW_D, 0.7);
}

/** A little bottle-shaped baby bottle, base centre at (x, y). */
function babyBottle(p: Pen, x: number, y: number): void {
  p.roundRect(x - 3, y - 5, 6, 9.5, 2.4, '#ffffff');
  p.roundRect(x - 2.6, y - 1, 5.2, 5, 1.6, '#ffc4dc', null);
  p.roundRect(x - 2.2, y - 8.4, 4.4, 3.6, 1.2, BLUSH);
  p.poly(
    [
      { x: x - 1, y: y - 8.6 },
      { x: x + 1, y: y - 8.6 },
      { x: x + 0.5, y: y - 11.4 },
      { x: x - 0.5, y: y - 11.4 },
    ],
    '#ffe9d6',
    p.outline,
    0.6,
  );
}

// ---------------------------------------------------------------------------
// The Nursery Barn

function nurseryBarn(p: Pen): void {
  const ua = 0.2;
  const ub = 2.8;
  const v0 = 0.7;
  const v1 = 2.3;
  const ea = ua - 0.14; // the roof overhangs a little
  const eb = ub + 0.14;
  const ZE = 52; // eave
  const ZW = 54; // wall top
  const ZB = 74; // gambrel break
  const ZR = 94; // ridge
  const DOOR = 48; // door top
  const P = (u: number, v: number, z: number) => p.iso(u, v, z);
  const L = faceL(p, v1); // front-left wall
  const R = faceR(p, ub); // gable wall

  // walls, with cream corner boards
  const c = p.center;
  p.shadow(c.x, c.y + 2, 84, 38, 0.26);
  p.box(ua, v0, ub - ua, v1 - v0, ZW, { top: shade(WALL, 0.14), left: WALL, right: shade(WALL, -0.1) });
  for (const z of [12, 26, 40]) {
    p.line([L.pt(ua + 0.08, z), L.pt(ub - 0.08, z)], WALL_LINE, 0.8);
    p.line([R.pt(v0 + 0.08, z), R.pt(v1 - 0.08, z)], tint(R, WALL_LINE), 0.8);
  }
  quad(p, L, ua, ua + 0.1, 0, ZW, TRIM);
  quad(p, L, ub - 0.1, ub, 0, ZW, TRIM);
  quad(p, R, v0, v0 + 0.1, 0, ZW, tint(R, TRIM));
  quad(p, R, v1 - 0.1, v1, 0, ZW, tint(R, TRIM));

  // back slopes, behind the ridge
  p.poly([P(ea, 0.58, ZE), P(eb, 0.58, ZE), P(eb, 1.0, ZB), P(ea, 1.0, ZB)], shade(ROOF, 0.2));
  shingles(p, ea, eb, { v: 0.58, z: ZE }, { v: 1.0, z: ZB });
  p.poly([P(ea, 1.0, ZB), P(eb, 1.0, ZB), P(eb, 1.5, ZR), P(ea, 1.5, ZR)], shade(ROOF, 0.34));
  shingles(p, ea, eb, { v: 1.0, z: ZB }, { v: 1.5, z: ZR });
  // front slopes
  p.poly([P(ea, 1.5, ZR), P(eb, 1.5, ZR), P(eb, 2.0, ZB), P(ea, 2.0, ZB)], ROOF);
  shingles(p, ea, eb, { v: 1.5, z: ZR }, { v: 2.0, z: ZB });
  p.poly([P(ea, 2.0, ZB), P(eb, 2.0, ZB), P(eb, 2.42, ZE), P(ea, 2.42, ZE)], shade(ROOF, -0.1));
  shingles(p, ea, eb, { v: 2.0, z: ZB }, { v: 2.42, z: ZE });
  // soft cream ridge cap and rake
  thick(p, [P(ea, 1.5, ZR), P(eb, 1.5, ZR)], TRIM, 3.2);
  p.line([P(eb, 0.58, ZE), P(eb, 2.42, ZE)], TRIM, 2.4);
  // scalloped front eave: a row of cream bumps
  const bumps = 6;
  for (let i = 0; i <= bumps; i++) {
    const q = P(ea + ((eb - ea) * i) / bumps, 2.42, ZE);
    p.circle(q.x, q.y + 1.6, 2.4, TRIM);
  }

  // gable end, with a rounded top and a little heart window
  const gable = [P(ub, v0, ZW), P(ub, 1.0, ZB), P(ub, 1.5, ZR), P(ub, 2.0, ZB), P(ub, v1, ZW)];
  p.poly(gable, shade(WALL, -0.08));
  thick(p, gable, TRIM, 2.2);
  p.line([P(ub, v0, ZW), P(ub, v1, ZW)], TRIM, 1.6);
  const hw = P(ub, 1.5, 78);
  p.circle(hw.x, hw.y, 7, TRIM);
  p.circle(hw.x, hw.y, 5.2, p.vgrad(hw.y - 5.2, hw.y + 5.2, '#fff6d6', GLASS));
  p.heart(hw.x, hw.y + 0.8, 2.3, BLUSH, null);

  // big open double doors, with warm straw inside
  const dv0 = 0.95;
  const dv1 = 2.05;
  quad(p, R, dv0 - 0.07, dv1 + 0.07, 0, DOOR + 3, TRIM);
  const top = R.pt(1.5, DOOR);
  const bot = R.pt(1.5, 0);
  quad(p, R, dv0, dv1, 0, DOOR, p.vgrad(top.y, bot.y, INSIDE, STRAW));
  const mound = R.pt(1.5, 7);
  p.ellipse(mound.x, mound.y, 11, 4.5, STRAW, p.outline);
  for (let i = 0; i < 4; i++) {
    const s = dv0 + 0.16 + i * 0.2;
    p.line([R.pt(s, 9), R.pt(s + 0.08, 16 + (i % 2) * 5)], STRAW_D, 1);
  }
  // the two door leaves, swung open towards the viewer
  const leaf = (hinge: number, free: number) => {
    const o = (v: number, z: number) => p.iso(ub + 0.3, v, z);
    p.poly([R.pt(hinge, 0), R.pt(hinge, DOOR), o(free, DOOR), o(free, 0)], shade(PINK, -0.02));
    const mid = p.iso(ub + 0.15, (hinge + free) / 2, 26);
    p.heart(mid.x, mid.y, 2.6, TRIM, null);
  };
  leaf(dv0, 0.72);
  leaf(dv1, 2.56);

  // a star mobile hanging over the door
  const MZ = 64;
  thick(p, [p.iso(ub + 0.22, 1.2, MZ), p.iso(ub + 0.22, 1.8, MZ)], TRIM, 1.6);
  const stars: [number, number, string, number][] = [
    [1.28, 46, STAR, 3.4],
    [1.5, 38, MINT, 3],
    [1.72, 44, LILAC, 3.1],
  ];
  for (const [v, z, col, r] of stars) {
    const hang = p.iso(ub + 0.22, v, MZ);
    const at = p.iso(ub + 0.22, v, z);
    p.line([hang, { x: at.x, y: at.y - r * 1.2 }], STRING, 0.6);
    p.star(at.x, at.y, r, col);
  }

  // front-left wall: a window with a flower box
  const wsc = 1.06;
  quad(p, L, wsc - 0.34, wsc + 0.34, 22, 42, TRIM);
  quad(p, L, wsc - 0.27, wsc + 0.27, 24, 40, GLASS);
  p.line([L.pt(wsc, 24), L.pt(wsc, 40)], TRIM, 1);
  p.line([L.pt(wsc - 0.27, 32), L.pt(wsc + 0.27, 32)], TRIM, 1);
  quad(p, L, wsc - 0.4, wsc + 0.4, 17, 22, PINK_D);
  [-0.26, 0, 0.26].forEach((d, i) => {
    const q = L.pt(wsc + d, 23);
    p.flower(q.x, q.y - 1, 2.6, FLOWERS[i], '#fff3b0');
  });

  // a baby-bottle sign hanging by the corner
  const sc = 2.46;
  p.line([L.pt(sc - 0.3, 47), L.pt(sc + 0.26, 47)], ROD, 1.6);
  p.line([L.pt(sc - 0.2, 47), L.pt(sc - 0.2, 42)], STRING, 0.6);
  p.line([L.pt(sc + 0.18, 47), L.pt(sc + 0.18, 42)], STRING, 0.6);
  quad(p, L, sc - 0.24, sc + 0.24, 18, 42, PINK_D);
  quad(p, L, sc - 0.19, sc + 0.19, 21, 39, TRIM, null);
  const bottleAt = L.pt(sc, 26);
  babyBottle(p, bottleAt.x, bottleAt.y);

  // the fenced yard corner in front of the left wall, with a straw bale and two chicks
  picketRun(p, { u: 0.12, v: 2.4 }, { u: 0.12, v: 2.92 }, 3);
  strawBale(p, p.iso(1.0, 2.62, 0).x, p.iso(1.0, 2.62, 0).y);
  const cA = p.iso(1.46, 2.56, 4);
  chick(p, cA.x, cA.y, 3.6);
  const cB = p.iso(1.22, 2.42, 4);
  chick(p, cB.x, cB.y, 3.2);
  picketRun(p, { u: 0.12, v: 2.92 }, { u: 1.62, v: 2.92 }, 5);

  // chick weathervane on the ridge
  const wv = P(1.5, 1.5, ZR);
  p.line([wv, { x: wv.x, y: wv.y - 14 }], ROD, 1.4);
  chick(p, wv.x, wv.y - 18.4, 4.4);
  p.star(wv.x + 13, wv.y - 22, 2.6, '#ffffff', p.outline);
  p.star(wv.x - 14, wv.y - 8, 2, '#fff3b0', p.outline);
}

// ---------------------------------------------------------------------------
// Exports

export const sprites: SpriteSpec[] = NURSERY_DECORATIONS.map((d) => ({
  key: `deco:${d.id}`,
  fw: d.w,
  fh: d.h,
  height: 112,
  paint: nurseryBarn,
}));

export const icons: IconSpec[] = [];
