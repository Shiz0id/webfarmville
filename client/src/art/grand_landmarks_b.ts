// Grand landmarks B: two showpiece 3x3 builds for the grand tier.
//   deco:lighthouse_windmill  a cherry-pink and cream lighthouse on a round stone
//                             plinth, with a cottage annex, a four-sail lattice
//                             windmill on its front and a glowing lantern room
//                             under a red-pink cone roof.
//   deco:balloon_dock         a round wooden deck with a plank floor, steps, a
//                             mooring post and bunting, with a big striped hot-air
//                             balloon above it, a wicker basket on tether ropes and
//                             sandbags on the rim.
// Same house style as feedmill.ts and nursery.ts: warm brown OUTLINE, top-left
// light, soft pastel fills, glossy white highlights and little sparkles. Both are
// built from the ground up so a partly built (cropped) sprite shows the base first.
import { type IconSpec, type Pen, type Pt, type SpriteSpec, shade } from './kit';

type Ctx = CanvasRenderingContext2D;

const PI = Math.PI;

const CREAM = '#fff8ee';
const CREAM_D = '#f0dcc0';
const PINK = '#ffb3cf';
const PINK_D = '#e77fa6';
const CHERRY = '#ff8fb1';
const ROOF_RED = '#f27a8e';
const STONE = '#ddd3c2';
const STONE_D = '#a79d8c';
const WOOD = '#d9a06a';
const WOOD_L = '#f3c995';
const WOOD_D = '#a8703f';
const ROD = '#8a6a55';
const GLASS = '#ffe9a0';
const LAMP = '#ffd84a';
const GOLD = '#f4c24a';
const GOLD_D = '#c98b1f';
const MINT = '#a8e6cf';
const LILAC = '#c9b8f5';
const BUTTER = '#ffe49a';
const BURLAP = '#eedcb4';
const ROPE = '#6a4a32';
const LEAF = '#7fd06a';
const FLOWERS = ['#ffffff', '#ff8fb1', '#c9b8f5', '#ffd27a'];

// ---------------------------------------------------------------------------
// Round bodies: a tapered drum (or cone) standing on the ground

/** A tapered round body on the ground at (cx, gy): radius r0 at height z0, r1 at z1. */
interface Drum {
  cx: number;
  gy: number;
  z0: number;
  r0: number;
  z1: number;
  r1: number;
}

const radiusAt = (d: Drum, z: number): number => d.r0 + ((d.r1 - d.r0) * (z - d.z0)) / (d.z1 - d.z0);

/** A point on a drum's surface at height z and angle a (0 = right, PI/2 = front, PI = left). */
function onDrum(d: Drum, z: number, a: number): Pt {
  const r = radiusAt(d, z);
  return { x: d.cx + r * Math.cos(a), y: d.gy - z + (r / 2) * Math.sin(a) };
}

/** Points along a horizontal ellipse at height z, radius r, from angle a0 to a1. */
function arcPts(cx: number, gy: number, z: number, r: number, a0: number, a1: number, n = 20): Pt[] {
  const pts: Pt[] = [];
  for (let i = 0; i <= n; i++) {
    const a = a0 + ((a1 - a0) * i) / n;
    pts.push({ x: cx + r * Math.cos(a), y: gy - z + (r / 2) * Math.sin(a) });
  }
  return pts;
}

/** Light from the top-left: a horizontal gradient across a round body. */
function sideGrad(c: Ctx, cx: number, half: number, color: string): CanvasGradient {
  const g = c.createLinearGradient(cx - half, 0, cx + half, 0);
  g.addColorStop(0, shade(color, 0.22));
  g.addColorStop(0.42, color);
  g.addColorStop(1, shade(color, -0.24));
  return g;
}

function drumPath(c: Ctx, d: Drum): void {
  const yb = d.gy - d.z0;
  const yt = d.gy - d.z1;
  c.beginPath();
  c.moveTo(d.cx - d.r0, yb);
  c.lineTo(d.cx - d.r1, yt);
  c.ellipse(d.cx, yt, d.r1, d.r1 / 2, 0, PI, 0, false); // over the top
  c.lineTo(d.cx + d.r0, yb);
  c.ellipse(d.cx, yb, d.r0, d.r0 / 2, 0, 0, PI, false); // under the bottom
  c.closePath();
}

function outlineDrum(p: Pen, d: Drum): void {
  const c = p.ctx;
  drumPath(c, d);
  c.strokeStyle = p.outline;
  c.lineWidth = 1.6;
  c.stroke();
}

function drum(p: Pen, d: Drum, color: string): void {
  const c = p.ctx;
  drumPath(c, d);
  c.fillStyle = sideGrad(c, d.cx, Math.max(d.r0, d.r1), color);
  c.fill();
  outlineDrum(p, d);
  p.ellipse(d.cx, d.gy - d.z1, d.r1, d.r1 / 2, shade(color, 0.22), p.outline);
}

/** A curved horizontal band on a drum between heights za < zb (front edges bow downward). */
function bandPath(c: Ctx, d: Drum, za: number, zb: number): void {
  const ya = d.gy - za;
  const yb = d.gy - zb;
  const ra = radiusAt(d, za);
  const rb = radiusAt(d, zb);
  c.beginPath();
  c.moveTo(d.cx - 90, yb);
  c.lineTo(d.cx - rb, yb);
  c.ellipse(d.cx, yb, rb, rb / 2, 0, PI, 0, true); // front edge, left to right
  c.lineTo(d.cx + 90, yb);
  c.lineTo(d.cx + 90, ya);
  c.lineTo(d.cx + ra, ya);
  c.ellipse(d.cx, ya, ra, ra / 2, 0, 0, PI, false); // front edge, right to left
  c.lineTo(d.cx - 90, ya);
  c.closePath();
}

/** Alternating horizontal stripes on a drum, clipped to its silhouette. */
function bands(p: Pen, d: Drum, colA: string, colB: string, z0: number, z1: number, n: number): void {
  const c = p.ctx;
  const h = (z1 - z0) / n;
  c.save();
  drumPath(c, d);
  c.clip();
  for (let k = 0; k < n; k++) {
    const za = z0 + k * h;
    bandPath(c, d, za, za + h);
    c.fillStyle = sideGrad(c, d.cx, Math.max(d.r0, d.r1), k % 2 ? colB : colA);
    c.fill();
    if (k > 0) p.line(arcPts(d.cx, d.gy, za, radiusAt(d, za), 0, PI), 'rgba(74,52,38,0.22)', 0.8);
  }
  c.restore();
}

// ---------------------------------------------------------------------------
// Little parts

/** A thick rail: dark outline first, then the colour on top. */
function rail(p: Pen, pts: Pt[], color: string): void {
  p.line(pts, p.outline, 3.6);
  p.line(pts, color, 1.8);
}

/** Posts and a top rail around a ring: from height z0 up to z1, angles a0..a1, radius r. */
function railing(p: Pen, cx: number, gy: number, z0: number, z1: number, r: number, a0: number, a1: number, color: string): void {
  rail(p, arcPts(cx, gy, z1, r, a0, a1, 24), color);
  const n = 8;
  for (let i = 0; i <= n; i++) {
    const a = a0 + ((a1 - a0) * i) / n;
    const x = cx + r * Math.cos(a);
    const yTop = gy - z1 + (r / 2) * Math.sin(a);
    const yBase = gy - z0 + (r / 2) * Math.sin(a);
    p.rect(x - 1.3, yTop, 2.6, yBase - yTop, color);
  }
}

/** A window with an arched (pill) frame, a warm glass pane, and a flower box on the sill. */
function archWindow(p: Pen, x: number, yb: number, w: number, h: number): void {
  p.roundRect(x - w / 2 - 1.2, yb - h - 1.2, w + 2.4, h + 2.4, (w + 2.4) / 2, CREAM);
  p.roundRect(x - w / 2, yb - h, w, h, w / 2, p.vgrad(yb - h, yb, '#fff6d6', GLASS));
  p.line([{ x, y: yb - h + 4 }, { x, y: yb - 2 }], CREAM, 1);
  p.roundRect(x - w / 2 - 2.5, yb, w + 5, 5, 1.8, PINK_D);
  [-w / 3, 0, w / 3].forEach((dx, i) => p.flower(x + dx, yb - 0.5, 2.3, FLOWERS[(i + 1) % FLOWERS.length], '#fff3b0'));
}

/** A small fluffy cloud, outline pass then fill pass so the puffs merge into one shape. */
function cloud(p: Pen, x: number, y: number, s: number): void {
  const puffs: [number, number, number][] = [
    [0, 0, 9],
    [-9, 3, 6.5],
    [9, 3, 7],
    [-3, -6, 7.5],
    [6, -4, 6],
  ];
  for (const [dx, dy, r] of puffs) p.circle(x + dx * s, y + dy * s, r * s + 1, p.outline, null);
  for (const [dx, dy, r] of puffs) p.circle(x + dx * s, y + dy * s, r * s, '#ffffff', null);
  p.ellipse(x, y + 4 * s, 13 * s, 3 * s, 'rgba(170,205,235,0.6)', null);
}

/** A small round bush with a few flower heads on top. */
function bush(p: Pen, x: number, y: number, r: number, seed: number): void {
  const cy = y - r * 0.7;
  p.foliage(x, cy, r, LEAF, seed, 6);
  for (let i = 0; i < 4; i++) {
    const a = i * 1.6 + seed;
    p.flower(x + Math.cos(a) * r * 0.6, cy + Math.sin(a) * r * 0.35 - 2, 2.4, FLOWERS[(i + seed) % FLOWERS.length]);
  }
}

// ---------------------------------------------------------------------------
// Lighthouse windmill

/** One lattice sail on the tower's front-left face: a wooden frame over cream canvas. */
function sail(p: Pen, hx: number, hy: number, ang: number): void {
  // the face runs along the grid's u axis (screen slope 0.22), so the rotor plane is
  // a touch foreshortened: e1 is the face's horizontal, e2 the vertical
  const e1x = 0.976;
  const e1y = 0.218;
  const cosA = Math.cos(ang);
  const sinA = Math.sin(ang);
  const dx = cosA * e1x;
  const dy = cosA * e1y - sinA;
  const nx = -sinA * e1x;
  const ny = -sinA * e1y - cosA;
  const P = (s: number, t: number): Pt => ({ x: hx + dx * s + nx * t, y: hy + dy * s + ny * t });
  const S0 = 7;
  const L = 80;
  const W = 11;
  const K = 4;
  p.poly([P(S0, -W), P(L, -W), P(L, W), P(S0, W)], CREAM, null);
  for (let i = 0; i < K; i++) {
    const a = S0 + ((L - S0) * i) / K;
    const b = S0 + ((L - S0) * (i + 1)) / K;
    p.line([P(a, -W), P(b, W)], WOOD_L, 1);
    p.line([P(a, W), P(b, -W)], WOOD_L, 1);
    if (i > 0) p.line([P(a, -W), P(a, W)], WOOD, 1.8);
  }
  p.poly([P(S0, -W), P(L, -W), P(L, W), P(S0, W)], null, p.outline, 2.2);
}

/** The little cottage annex on the front-left of the plinth. */
function cottage(p: Pen): void {
  const U0 = 0.4;
  const U1 = 1.1;
  const V0 = 2.0;
  const V1 = 2.7;
  const H = 30;
  p.box(U0, V0, U1 - U0, V1 - V0, H, { top: shade(CREAM, 0.14), left: CREAM, right: shade(CREAM, -0.12) });
  for (const s of [0.6, 0.75, 0.9]) p.line([p.iso(s, V1, 3), p.iso(s, V1, H - 3)], CREAM_D, 0.8);
  p.gableRoof(U0, V0, U1 - U0, V1 - V0, H, 22, MINT, CREAM, 0.1);

  // arched pink door on the front-right wall
  const F = (s: number, z: number): Pt => p.iso(U1, s, z);
  p.poly([F(2.22, 0), F(2.44, 0), F(2.44, 12), F(2.4, 14.5), F(2.33, 16.5), F(2.26, 14.5), F(2.22, 12)], PINK);
  p.circle(F(2.4, 7).x, F(2.4, 7).y, 1.1, GOLD, null);

  // window with a flower box on the front-left wall
  const G = (s: number, z: number): Pt => p.iso(s, V1, z);
  p.poly([G(0.5, 12), G(0.8, 12), G(0.8, 22), G(0.5, 22)], CREAM);
  p.poly([G(0.53, 13.5), G(0.77, 13.5), G(0.77, 20.5), G(0.53, 20.5)], GLASS, null);
  p.line([G(0.65, 13.5), G(0.65, 20.5)], CREAM, 0.8);
  p.poly([G(0.47, 6), G(0.83, 6), G(0.83, 12), G(0.47, 12)], PINK_D);
  [0.53, 0.65, 0.77].forEach((s, i) => {
    const q = G(s, 12);
    p.flower(q.x, q.y - 1, 2.2, FLOWERS[(i + 1) % FLOWERS.length], '#fff3b0');
  });
}

/** A little lilac bench on the front of the plinth. */
function bench(p: Pen): void {
  p.box(2.0, 2.15, 0.9, 0.06, 10, WOOD_L, 10); // backrest
  p.box(2.0, 2.15, 0.9, 0.22, 3, PINK, 7); // seat
  p.box(2.04, 2.36, 0.05, 0.05, 7, WOOD_D, 0); // front legs
  p.box(2.86, 2.36, 0.05, 0.05, 7, WOOD_D, 0);
}

function lighthouseWindmill(p: Pen): void {
  const c = p.ctx;
  const cx = p.center.x;
  const gy = p.center.y;
  const plinth: Drum = { cx, gy, z0: 0, r0: 54, z1: 18, r1: 54 };
  const tower: Drum = { cx, gy, z0: 18, r0: 46, z1: 168, r1: 36 };
  const deck: Drum = { cx, gy, z0: 166, r0: 44, z1: 172, r1: 44 };
  const lantern: Drum = { cx, gy, z0: 172, r0: 23, z1: 200, r1: 23 };
  const roofY = gy - 200;
  const apexY = gy - 236;
  const hub = onDrum(tower, 126, PI / 2); // on the front, two-thirds up

  p.shadow(cx, gy + 3, 66, 31, 0.26);

  // 1. round stone plinth with courses and joints
  drum(p, plinth, STONE);
  for (const z of [6, 12]) p.line(arcPts(cx, gy, z, 54, 0.04 * PI, 0.96 * PI), STONE_D, 1);
  for (const a of [0.2, 0.38, 0.62, 0.8]) p.line([onDrum(plinth, 0, a * PI), onDrum(plinth, 18, a * PI)], STONE_D, 1);

  // 2. the tower: cherry-pink and cream stripes, a glossy highlight, two windows
  drum(p, tower, CREAM);
  bands(p, tower, CREAM, CHERRY, 18, 168, 10);
  outlineDrum(p, tower);
  p.line([onDrum(tower, 30, 0.8 * PI), onDrum(tower, 150, 0.8 * PI)], 'rgba(255,255,255,0.85)', 3);
  for (const a of [0.2, 0.8]) {
    const at = onDrum(tower, 40, a * PI);
    archWindow(p, at.x, at.y, 11, 24);
  }

  // 3. balcony: the back railing, then the lantern room, then the front railing
  drum(p, deck, CREAM_D);
  railing(p, cx, gy, 172, 186, 44, PI, 2 * PI, CREAM);
  drum(p, lantern, GLASS);
  p.glow(cx, gy - 186, 56, LAMP, 0.85);
  p.circle(cx, gy - 186, 7.5, '#fffbe6', p.outline);
  p.circle(cx - 2.5, gy - 188.5, 2.4, '#ffffff', null);
  for (const a of [0.3, 0.5, 0.7]) rail(p, [onDrum(lantern, 172, a * PI), onDrum(lantern, 200, a * PI)], CREAM);
  railing(p, cx, gy, 172, 186, 44, 0, PI, CREAM);

  // 4. the conical red-pink roof with a scalloped cream hem and a gold vane
  c.beginPath();
  c.moveTo(cx - 33, roofY);
  c.lineTo(cx, apexY);
  c.lineTo(cx + 33, roofY);
  c.ellipse(cx, roofY, 33, 16.5, 0, 0, PI, false);
  c.closePath();
  c.fillStyle = sideGrad(c, cx, 33, ROOF_RED);
  c.fill();
  c.strokeStyle = p.outline;
  c.lineWidth = 1.8;
  c.stroke();
  for (const a of [0.3, 0.5, 0.7]) {
    p.line([{ x: cx, y: apexY }, { x: cx + 33 * Math.cos(a * PI), y: roofY + 16.5 * Math.sin(a * PI) }], 'rgba(255,255,255,0.3)', 1);
  }
  for (const q of arcPts(cx, gy, 200, 33, 0.02 * PI, 0.98 * PI, 14)) p.circle(q.x, q.y + 1.5, 3.2, CREAM);
  p.line([{ x: cx - 8, y: apexY + 10 }, { x: cx - 24, y: roofY - 6 }], 'rgba(255,255,255,0.85)', 2.2);
  p.line([{ x: cx, y: apexY }, { x: cx, y: apexY - 24 }], p.outline, 2.6);
  p.line([{ x: cx, y: apexY }, { x: cx, y: apexY - 24 }], GOLD, 1.2);
  p.poly([{ x: cx - 13, y: apexY - 16 }, { x: cx - 20, y: apexY - 21 }, { x: cx - 19, y: apexY - 11 }], GOLD);
  p.line([{ x: cx - 13, y: apexY - 16 }, { x: cx + 12, y: apexY - 16 }], GOLD_D, 1.6);
  p.poly([{ x: cx + 11, y: apexY - 21 }, { x: cx + 19, y: apexY - 16 }, { x: cx + 11, y: apexY - 11 }], GOLD);
  p.circle(cx, apexY - 25, 2.8, GOLD);
  p.glow(cx, gy - 184, 34, LAMP, 0.25);
  p.circle(cx, apexY, 3.2, GOLD);

  // 5. the cottage annex, a bench and some flower bushes
  cottage(p);
  bench(p);
  bush(p, p.iso(2.85, 0.8, 0).x, p.iso(2.85, 0.8, 0).y, 9, 3);
  bush(p, p.iso(2.6, 2.8, 0).x, p.iso(2.6, 2.8, 0).y, 8, 5);

  // 6. four lattice sails on the front of the tower, with the hub
  for (const a of [PI / 4, (3 * PI) / 4, (5 * PI) / 4, (7 * PI) / 4]) sail(p, hub.x, hub.y, a);
  p.circle(hub.x, hub.y, 6.5, WOOD_D);
  p.circle(hub.x, hub.y, 3, GOLD);

  // 7. sparkles
  p.star(22, 70, 4, '#fff3b0');
  p.star(170, 50, 3.4, '#ffffff');
  p.star(18, 170, 3, '#ffffff');
  p.star(176, 150, 3.2, '#fff3b0');
}

// ---------------------------------------------------------------------------
// Balloon dock

// The balloon envelope: centre height, vertical and horizontal semi-axes.
const LIFT = 30; // how far the basket and balloon hover above the deck
const EZ = 158 + LIFT;
const EV = 62;
const ER = 62;

/** Half-width of the envelope at height z (the lower half is pinched in toward the mouth). */
function envHalfW(z: number): number {
  const t = (z - EZ) / EV;
  return ER * Math.sqrt(Math.max(0, 1 - t * t)) * (t < 0 ? 0.8 : 1);
}

function balloonDock(p: Pen): void {
  const c = p.ctx;
  const cx = p.center.x;
  const gy = p.center.y;
  const DZ = 9; // deck side height: a low platform
  const RAD = 1.4; // octagon radius in tiles, nearly filling the footprint
  const rimZ = 66 + LIFT; // basket rim
  const bottomZ = 44 + LIFT; // basket floor
  const V: { u: number; v: number }[] = [];
  for (let k = 0; k < 8; k++) {
    const a = (k * PI) / 4;
    V.push({ u: 1.5 + RAD * Math.cos(a), v: 1.5 + RAD * Math.sin(a) });
  }
  const at = (k: number, z: number): Pt => p.iso(V[k % 8].u, V[k % 8].v, z);

  // clouds, behind everything
  cloud(p, 24, 150, 1.1);
  cloud(p, 172, 116, 1.0);

  p.shadow(cx, gy + 4, 70, 34, 0.24);

  // 1. the octagonal deck: visible sides, then the plank floor
  for (let k = 0; k < 8; k++) {
    const m = ((2 * k + 1) * PI) / 8;
    if (Math.cos(m) + Math.sin(m) <= 0) continue;
    const side = Math.sin(m) > Math.cos(m) ? '#eab683' : '#c98e5a';
    p.poly([at(k, 0), at(k + 1, 0), at(k + 1, DZ), at(k, DZ)], side);
    p.line([at(k, DZ / 2), at(k + 1, DZ / 2)], WOOD_D, 0.8);
  }
  c.beginPath();
  V.forEach((_, k) => (k ? c.lineTo(at(k, DZ).x, at(k, DZ).y) : c.moveTo(at(k, DZ).x, at(k, DZ).y)));
  c.closePath();
  c.save();
  c.clip();
  for (let j = 0; j < 14; j++) {
    const v0 = 0.05 + j * 0.2;
    const q = (u: number, v: number) => p.iso(u, v, DZ);
    p.poly([q(0, v0), q(3, v0), q(3, v0 + 0.2), q(0, v0 + 0.2)], j % 2 ? WOOD_L : '#f0b97c', null);
    p.line([q(0, v0), q(3, v0)], WOOD_D, 0.7);
  }
  c.restore();
  p.poly(V.map((_, k) => at(k, DZ)), null, p.outline, 1.6);
  // soft shadow on the deck, under the hovering basket
  p.shadow(cx, gy - DZ, 16, 8, 0.3);

  // 2. two steps up to the deck on the front-left edge
  p.box(0.95, 2.8, 0.4, 0.18, 8, WOOD_L, 0);
  p.box(0.95, 2.98, 0.4, 0.18, 4, WOOD_L, 0);

  // 3. railing all round, a bunting string on the front-right edges, a mooring post
  for (let k = 0; k < 8; k++) {
    rail(p, [at(k, DZ + 8), at(k + 1, DZ + 8)], CREAM);
    rail(p, [at(k, DZ + 16), at(k + 1, DZ + 16)], CREAM);
  }
  for (let k = 0; k < 8; k++) p.rect(at(k, DZ).x - 1.4, at(k, DZ + 16).y, 2.8, 16, CREAM);
  for (const k of [0, 1]) {
    const a = at(k, DZ + 14);
    const b = at(k + 1, DZ + 14);
    const pts: Pt[] = [];
    for (let i = 0; i <= 6; i++) {
      const t = i / 6;
      pts.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t + 4 * Math.sin(t * PI) });
    }
    p.line(pts, p.outline, 0.9);
    const cols = [PINK, MINT, BUTTER, LILAC, PINK];
    for (let i = 1; i < 6; i++) {
      const q = pts[i];
      p.poly([{ x: q.x - 2.6, y: q.y }, { x: q.x + 2.6, y: q.y }, { x: q.x, y: q.y + 5 }], cols[i - 1], p.outline, 0.7);
    }
  }
  const post = p.iso(V[7].u, V[7].v, DZ);
  p.cylinder(post.x, post.y, 5, 56, WOOD_D);
  for (const h of [18, 24, 30]) {
    p.curve({ x: post.x - 5, y: post.y - h }, { x: post.x, y: post.y - h + 3 }, { x: post.x + 5, y: post.y - h }, ROPE, 1.4);
  }
  p.ball(post.x, post.y - 58, 5, WOOD_L);

  // cleats on the deck, where the tether ropes end
  const cleatUV: [number, number][] = [
    [2.65, 1.98],
    [1.98, 2.65],
    [1.02, 2.65],
  ];
  for (const [u, v] of cleatUV) p.box(u - 0.08, v - 0.08, 0.16, 0.16, 6, WOOD_D, DZ);

  // 4. the balloon envelope: pastel gores, a shaded body, a trim band with bunting
  const sil: Pt[] = [];
  for (let i = 0; i <= 56; i++) {
    const a = -PI / 2 + (2 * PI * i) / 56;
    const s = Math.sin(a);
    sil.push({ x: cx + ER * Math.cos(a) * (s < 0 ? 0.8 : 1), y: gy - (EZ + EV * s) });
  }
  const zs: number[] = [];
  for (let z = EZ - EV; z <= EZ + EV; z += 3) zs.push(z);
  const edge = (s: number): Pt[] => zs.map((z) => ({ x: cx + envHalfW(z) * s, y: gy - z }));
  const bounds = [-1, -0.6, -0.2, 0.2, 0.6, 1];
  const gores = [PINK, MINT, BUTTER, CREAM, PINK];
  gores.forEach((col, i) => {
    p.poly([...edge(bounds[i]), ...edge(bounds[i + 1]).reverse()], col, null);
  });
  for (const s of [-0.6, -0.2, 0.2, 0.6]) p.line(edge(s), 'rgba(74,52,38,0.28)', 0.9);

  // soft shading: light from the top-left, a rosy shadow on the right
  const shadeG = c.createLinearGradient(cx - ER, 0, cx + ER, 0);
  shadeG.addColorStop(0, 'rgba(255,255,255,0.3)');
  shadeG.addColorStop(0.45, 'rgba(255,255,255,0)');
  shadeG.addColorStop(1, 'rgba(90,40,80,0.26)');
  p.poly(sil, shadeG, null);
  p.poly(sil, null, p.outline, 2.2);

  // trim band with scallops, and tiny bunting along its middle
  const zTop = 128 + LIFT;
  const zBot = 116 + LIFT;
  const bulge = (s: number): number => 5 * (1 - s * s);
  const bandAt = (z: number, s: number): Pt => ({ x: cx + envHalfW(z) * s, y: gy - z + bulge(s) });
  const bandPts: Pt[] = [];
  for (let i = 0; i <= 20; i++) bandPts.push(bandAt(zTop, -1 + (2 * i) / 20));
  for (let i = 20; i >= 0; i--) bandPts.push(bandAt(zBot, -1 + (2 * i) / 20));
  p.poly(bandPts, CREAM, p.outline, 1.4);
  for (let i = 0; i <= 9; i++) {
    const s = -0.9 + (1.8 * i) / 9;
    const q = bandAt(zBot, s);
    p.circle(q.x, q.y + 1.5, 3.4, CREAM);
  }
  const midLine: Pt[] = [];
  for (let i = 0; i <= 16; i++) midLine.push(bandAt(122 + LIFT, -0.8 + (1.6 * i) / 16));
  p.line(midLine, 'rgba(74,52,38,0.6)', 0.8);
  [-0.7, -0.35, 0, 0.35, 0.7].forEach((s, i) => {
    const q = bandAt(122 + LIFT, s);
    p.poly([{ x: q.x - 2.6, y: q.y - 1.2 }, { x: q.x + 2.6, y: q.y - 1.2 }, { x: q.x, y: q.y + 4 }], [PINK, MINT, BUTTER, LILAC, PINK][i], p.outline, 0.7);
  });

  // glossy highlight on the upper left and a little sheen spot
  const hi: Pt[] = [];
  for (let i = 0; i <= 10; i++) {
    const a = 0.62 * PI + (0.33 * PI * i) / 10;
    hi.push({ x: cx + (ER - 9) * Math.cos(a), y: gy - (EZ + (EV - 8) * Math.sin(a)) });
  }
  p.line(hi, 'rgba(255,255,255,0.9)', 3.2);
  p.ellipse(cx - 36, gy - 176, 3.2, 7, 'rgba(255,255,255,0.9)', null, 0.35);

  // the mouth under the envelope, the top cap and the pennant
  p.ellipse(cx, gy - (EZ - EV), 10, 4.5, CREAM, p.outline);
  const topZ = EZ + EV;
  p.ellipse(cx, gy - topZ + 2, 5, 2.6, WOOD, p.outline);
  p.line([{ x: cx, y: gy - topZ }, { x: cx, y: gy - topZ - 18 }], p.outline, 2.6);
  p.line([{ x: cx, y: gy - topZ }, { x: cx, y: gy - topZ - 18 }], ROD, 1.1);
  p.poly([{ x: cx, y: gy - topZ - 18 }, { x: cx + 20, y: gy - topZ - 13 }, { x: cx, y: gy - topZ - 8 }], MINT, p.outline, 1.2);
  p.circle(cx, gy - topZ - 18, 2, GOLD);

  // 5. ropes from the mouth to the basket rim
  for (const s of [-1, 1]) {
    p.line([{ x: cx + s * 8, y: gy - (EZ - EV) + 2 }, { x: cx + s * 15, y: gy - rimZ }], p.outline, 2.2);
    p.line([{ x: cx + s * 8, y: gy - (EZ - EV) + 2 }, { x: cx + s * 15, y: gy - rimZ }], ROPE, 0.9);
  }

  // 6. the wicker basket with a rim and sandbags hanging on it
  const bTop = gy - rimZ;
  const bBot = gy - bottomZ;
  c.beginPath();
  c.moveTo(cx - 15, bTop);
  c.lineTo(cx + 15, bTop);
  c.lineTo(cx + 11, bBot);
  c.quadraticCurveTo(cx, bBot + 6, cx - 11, bBot);
  c.closePath();
  c.fillStyle = sideGrad(c, cx, 15, WOOD);
  c.fill();
  c.strokeStyle = p.outline;
  c.lineWidth = 1.8;
  c.stroke();
  for (const z of [rimZ - 6, rimZ - 13]) {
    const hw = 15 - (4 * (rimZ - z)) / 22;
    p.curve({ x: cx - hw, y: gy - z }, { x: cx, y: gy - z + 5 }, { x: cx + hw, y: gy - z }, WOOD_D, 1.1);
  }
  for (let x = -9; x <= 9; x += 4.5) p.line([{ x: cx + x, y: bTop + 3 }, { x: cx + x + 2.5, y: bBot - 2 }], WOOD_D, 0.8);
  p.ellipse(cx, bTop, 15, 4, WOOD_L, p.outline);
  for (const s of [-1, 1]) {
    const bx = cx + s * 19;
    const by = gy - (rimZ - 12);
    p.line([{ x: cx + s * 14, y: bTop + 1 }, { x: bx, y: by - 6 }], ROPE, 1.2);
    p.ellipse(bx, by, 5.2, 6.8, BURLAP, p.outline);
    p.curve({ x: bx - 4, y: by }, { x: bx, y: by + 1.5 }, { x: bx + 4, y: by }, '#c9a86a', 0.8);
    p.ellipse(bx, by - 6.5, 2.2, 1.6, BURLAP, p.outline);
  }

  // 7. tether ropes from the basket down to the cleats, sagging a little
  const tether = (a: Pt, b: Pt, sag: number): void => {
    const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 + 2 * sag };
    p.curve(a, mid, b, p.outline, 2.4);
    p.curve(a, mid, b, ROPE, 1.1);
  };
  const cl = cleatUV.map(([u, v]) => p.iso(u, v, DZ + 6));
  tether({ x: cx - 10, y: bBot }, cl[2], 7);
  tether({ x: cx + 10, y: bBot }, cl[0], 7);
  tether({ x: cx, y: bBot + 4 }, cl[1], 4);

  // 8. sparkles
  p.star(24, 70, 4, '#fff3b0');
  p.star(176, 84, 3.4, '#ffffff');
  p.star(60, 28, 3, '#fff3b0');
  p.star(182, 206, 3, '#ffffff');
}

// ---------------------------------------------------------------------------
// Exports

export const sprites: SpriteSpec[] = [
  { key: 'deco:lighthouse_windmill', fw: 3, fh: 3, height: 230, paint: lighthouseWindmill },
  { key: 'deco:balloon_dock', fw: 3, fh: 3, height: 230, paint: balloonDock },
];

export const icons: IconSpec[] = [];
