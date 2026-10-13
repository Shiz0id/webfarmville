// Farm vehicles (FarmVille 1): a mint Tractor, a butter-yellow Seeder and a
// peach Harvester. Chunky toy-like machines with big chubby wheels and a little
// smiling face on the nose. The sprites face screen-right (their front is the
// high-u end of the footprint), so they drive across the field nose first. The
// icons show the same machines from a 3/4 view on a flat 40px canvas.
import { type BoxColors, type IconSpec, type Pen, type Pt, type SpriteSpec, OUTLINE, boxColors, rgba, rng, shade } from './kit';

type Proj = (u: number, v: number, z?: number) => Pt;

const O = OUTLINE;
const INK = '#2b1d14';
const WHITE = '#fffdf6';
const CREAM = '#fff4e4';
const BLUSH = '#ff8fa3';
const MINT = '#a8e6cf';
const BUTTER = '#ffe49a';
const SUN = '#ffd84a';
const PEACH = '#ffc9a8';
const PEACH_D = '#f5a98a';
const PINK = '#ffb3cf';
const LILAC = '#c9b8f5';
const LEAF = '#6cbf55';
const CHASSIS = '#7a5236';
const TYRE = '#5b4232';
const HUB = '#fff1c4';
const IRON = '#aab4ba';
const WOOD = '#c98b53';
const WHEAT = '#f4c24a';
const WHEAT_L = '#fff0a6';
const GLASS = '#e9f8ff';
const SMOKE = '#ffffff';
const EXHAUST = '#b9b2a6';

// ---------------------------------------------------------------------------
// Helpers

/** Projection for the sprite: the kit's isometric footprint. */
const iso =
  (p: Pen): Proj =>
  (u, v, z = 0) =>
    p.iso(u, v, z);

/** Projection for the icons: the same footprint foreshortened to a 3/4 view on 40px. */
function icon3q(dy = 0): Proj {
  return (u, v, z = 0) => ({ x: 14 + (u - v) * 12, y: 19 + dy + (u + v) * 5.6 - z * 0.9 });
}

/** A thick outlined stick between points (hitches, spouts, legs). */
function stick(p: Pen, pts: Pt[], w: number, color: string): void {
  p.line(pts, O, w + 1.6);
  p.line(pts, color, w);
}

/** A box in any projection: the kit's shaded box, but usable for icons too. */
function slab(p: Pen, P: Proj, u: number, v: number, du: number, dv: number, z: number, ht: number, c: BoxColors, w = 1.1): void {
  const b0 = P(u, v + dv, z);
  const b1 = P(u + du, v + dv, z);
  const b2 = P(u + du, v, z);
  const t0 = P(u, v + dv, z + ht);
  const t1 = P(u + du, v + dv, z + ht);
  const t2 = P(u + du, v, z + ht);
  const t3 = P(u, v, z + ht);
  p.poly([b0, b1, t1, t0], c.left, O, w);
  p.poly([b1, b2, t2, t1], c.right, O, w);
  p.poly([t0, t1, t2, t3], c.top, O, w);
}

/** Chubby toy wheel: dark tyre, a cream hubcap with a sunny middle and a glint. */
function wheel(p: Pen, x: number, y: number, r: number): void {
  p.circle(x, y, r, TYRE, O);
  p.circle(x, y, r * 0.72, shade(TYRE, 0.14), null);
  p.circle(x, y, r * 0.5, HUB, O);
  p.circle(x, y, r * 0.18, SUN, null);
  p.ellipse(x - r * 0.32, y - r * 0.4, r * 0.22, r * 0.1, rgba(WHITE, 0.75), null, -0.6);
}

/** A wheel standing on the ground at footprint point (u, v), with an optional mudguard behind it. */
function wheelOn(p: Pen, P: Proj, u: number, v: number, r: number, guard: string | null): void {
  const g = P(u, v, 0);
  const x = g.x;
  const y = g.y - r;
  if (guard) p.ellipse(x, y, r + 3.4, r + 2.4, guard);
  wheel(p, x, y, r);
}

/** A little kawaii face: dot eyes with glints, rosy cheeks and a smile. */
function face(p: Pen, x: number, y: number, r: number): void {
  const ex = r * 0.42;
  for (const s of [-1, 1]) {
    p.circle(x + s * ex, y - r * 0.1, Math.max(0.6, r * 0.13), INK, null);
    p.circle(x + s * ex + r * 0.05, y - r * 0.18, Math.max(0.3, r * 0.05), WHITE, null);
    p.ellipse(x + s * r * 0.76, y + r * 0.34, r * 0.2, r * 0.12, rgba(BLUSH, 0.75), null);
  }
  p.curve({ x: x - r * 0.3, y: y + r * 0.2 }, { x, y: y + r * 0.62 }, { x: x + r * 0.3, y: y + r * 0.2 }, INK, Math.max(0.6, r * 0.12));
}

/** A soft leaf or grain: an ellipse stretched along the segment a to b. */
function grain(p: Pen, a: Pt, b: Pt, w: number, color: string): void {
  const len = Math.hypot(b.x - a.x, b.y - a.y);
  p.ellipse((a.x + b.x) / 2, (a.y + b.y) / 2, len / 2, w, color, shade(color, -0.4), Math.atan2(b.y - a.y, b.x - a.x));
}

/** A little shiny plough hitched on the back: beam, leg and one share on the ground. */
function plough(p: Pen, P: Proj): void {
  stick(p, [P(0.22, 0.5, 9), P(-0.06, 0.5, 7)], 2.6, WOOD);
  stick(p, [P(-0.06, 0.5, 7), P(-0.14, 0.5, 2)], 2.2, IRON);
  // a wedge of share on the ground, with a glint along its edge
  p.poly([P(-0.14, 0.12, 0), P(-0.14, 0.88, 0), P(-0.4, 0.5, 0)], IRON, O, 1.3);
  p.line([P(-0.2, 0.3, 0.6), P(-0.3, 0.46, 0.6)], rgba(WHITE, 0.8), 0.9);
}

/** Seeds spilling off a patch of ground. */
function seedDots(p: Pen, pts: Pt[], colors: string[]): void {
  pts.forEach((q, i) => p.ellipse(q.x, q.y, 2.2, 1.5, colors[i % colors.length], O, 0.4));
}

// ---------------------------------------------------------------------------
// Sprites (2x1 footprint, facing screen-right)

/** Mint farm tractor: big back wheels, small front wheels, a yellow seat and a plough. */
function tractorSprite(p: Pen): void {
  const P = iso(p);
  const c = p.center;
  p.shadow(c.x, c.y + 2, 42, 17, 0.24);

  plough(p, P);

  // dark chassis, a mint cab with a yellow seat and a steering wheel
  slab(p, P, 0.22, 0.28, 1.5, 0.44, 3, 5, boxColors(CHASSIS));
  slab(p, P, 0.24, 0.2, 0.74, 0.6, 8, 19, boxColors(MINT));
  const seat = P(0.5, 0.5, 27);
  p.cylinder(seat.x, seat.y, 6.5, 5, SUN);
  const wheelBase = P(0.78, 0.5, 27);
  const wheelTop = P(0.86, 0.5, 38);
  stick(p, [wheelBase, wheelTop], 1.6, CHASSIS);
  p.ellipse(wheelTop.x, wheelTop.y - 1, 5, 3.4, null, '#6a4a32', 0);

  // a rounded hood with a smiling face on its nose and a little chimney
  const hood = P(1.42, 0.5, 8);
  p.cylinder(hood.x, hood.y, 10.5, 17, MINT);
  face(p, hood.x + 3.2, hood.y - 9, 6);
  const ch = P(1.1, 0.28, 25);
  p.cylinder(ch.x, ch.y, 2.6, 13, EXHAUST);
  p.circle(ch.x + 3, ch.y - 19, 3.8, SMOKE);
  p.circle(ch.x + 8, ch.y - 27, 4.6, SMOKE);
  p.circle(ch.x + 13.5, ch.y - 35, 5, SMOKE);

  // fat back wheels and small front wheels
  wheelOn(p, P, 0.6, 0.8, 14, MINT);
  wheelOn(p, P, 1.55, 0.82, 9, MINT);
}

/** Butter-yellow seeder: a mint hopper heaped with seeds and a flower, seed tubes at the back. */
function seederSprite(p: Pen): void {
  const P = iso(p);
  const c = p.center;
  p.shadow(c.x, c.y + 2, 42, 17, 0.24);

  slab(p, P, 0.22, 0.28, 1.5, 0.44, 3, 5, boxColors(CHASSIS));
  slab(p, P, 0.3, 0.2, 0.98, 0.6, 8, 11, boxColors(BUTTER));
  const hood = P(1.4, 0.5, 8);
  p.cylinder(hood.x, hood.y, 10, 13, BUTTER);
  face(p, hood.x + 3, hood.y - 6, 5.5);

  // the hopper, heaped with seeds, with a flower stuck in the top
  slab(p, P, 0.34, 0.16, 0.96, 0.7, 19, 14, boxColors(MINT));
  const r = rng('seeder-seeds');
  const seedCols = [CREAM, PINK, SUN, LILAC, '#ffb36b', LEAF];
  for (let i = 0; i < 18; i++) {
    const q = P(0.42 + r() * 0.8, 0.2 + r() * 0.58, 33);
    p.ellipse(q.x, q.y, 2.4, 1.7, seedCols[i % seedCols.length], shade(seedCols[i % seedCols.length], -0.35), r() * 3);
  }
  const fs = P(0.84, 0.5, 33);
  const ft = P(0.84, 0.5, 46);
  stick(p, [fs, ft], 1.6, LEAF);
  p.ellipse(ft.x - 4.5, ft.y + 6, 4.2, 2, LEAF, O, -0.5);
  p.flower(ft.x, ft.y, 5, PINK, SUN);

  // seed tubes hang off the hopper's back edge and drop seeds on the ground
  for (const v of [0.28, 0.5, 0.72]) {
    const top = P(0.4, v, 18);
    const end = P(0.2, v, 6);
    stick(p, [top, end], 2.8, LILAC);
    seedDots(p, [{ x: end.x - 1, y: end.y + 3 }, { x: end.x + 3, y: end.y + 5 }], [PINK, SUN]);
  }

  wheelOn(p, P, 0.75, 0.8, 12, BUTTER);
  wheelOn(p, P, 1.55, 0.84, 9, BUTTER);
}

/** Peach harvester: a spinning reel at the front, a grain spout, a wheat sheaf on its side. */
function harvesterSprite(p: Pen): void {
  const P = iso(p);
  const c = p.center;
  p.shadow(c.x, c.y + 2, 44, 17, 0.24);

  // the grain spout, bent up and over the tank, with a few grains tumbling out
  stick(p, [P(0.9, 0.12, 27), P(0.92, 0.12, 40), P(1.3, 0.12, 44)], 3.2, BUTTER);
  const spout = P(1.3, 0.12, 44);
  p.circle(spout.x, spout.y, 2.8, HUB);
  seedDots(p, [{ x: spout.x + 2, y: spout.y + 6 }, { x: spout.x - 1, y: spout.y + 9 }], [WHEAT, WHEAT_L]);

  slab(p, P, 0.2, 0.28, 1.65, 0.44, 3, 5, boxColors(CHASSIS));
  // the grain tank (peach) with a pink cab at the back
  slab(p, P, 0.5, 0.2, 1.0, 0.6, 8, 20, boxColors(PEACH));
  slab(p, P, 0.2, 0.22, 0.34, 0.56, 8, 22, boxColors(PINK));
  const win = [P(0.28, 0.78, 17), P(0.48, 0.78, 17), P(0.48, 0.78, 25), P(0.28, 0.78, 25)];
  p.poly(win, GLASS, O, 1);

  // a wheat sheaf tied with a pink ribbon on the tank's side
  const base = P(1.2, 0.8, 10);
  for (const k of [-0.2, -0.1, 0, 0.1, 0.2]) {
    const tip = P(1.2 + k, 0.8, 24 - Math.abs(k) * 14);
    grain(p, base, tip, 2.2, k === 0 ? WHEAT_L : WHEAT);
  }
  p.ellipse(base.x, base.y - 1, 4, 2.4, PINK, O);
  const nose = P(1.5, 0.5, 17);
  face(p, nose.x, nose.y, 5);

  // the reel: a spinning ring of paddles on the front header, with motion arcs
  slab(p, P, 1.5, 0.12, 0.32, 0.76, 5, 9, boxColors(PEACH_D));
  const R = P(1.86, 0.5, 31);
  stick(p, [P(1.66, 0.2, 14), P(1.86, 0.2, 29)], 1.8, IRON);
  stick(p, [P(1.66, 0.42, 14), P(1.86, 0.42, 29)], 1.8, IRON);
  p.ellipse(R.x, R.y, 11, 11, '#fff8e8', O);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + 0.3;
    stick(p, [R, { x: R.x + Math.cos(a) * 9, y: R.y + Math.sin(a) * 9 }], 2, SUN);
  }
  p.circle(R.x, R.y, 2.6, CREAM);

  wheelOn(p, P, 0.66, 0.82, 14, PEACH_D);
  wheelOn(p, P, 1.5, 0.86, 9.5, PEACH_D);
}

// ---------------------------------------------------------------------------
// Icons (40x40, 3/4 view)

function tractorIcon(p: Pen): void {
  const P = icon3q();
  const c = P(1, 0.5);
  p.shadow(c.x, c.y + 1, 15, 5, 0.22);

  plough(p, P);
  slab(p, P, 0.2, 0.3, 1.6, 0.4, 1, 3, boxColors(CHASSIS));
  slab(p, P, 0.2, 0.15, 0.8, 0.7, 3, 12, boxColors(MINT));
  const seat = P(0.6, 0.5, 15);
  p.ellipse(seat.x, seat.y, 3.6, 2.2, SUN, O);
  slab(p, P, 1.0, 0.2, 0.85, 0.6, 3, 8, boxColors(MINT));
  const f = P(1.85, 0.5, 7);
  face(p, f.x, f.y, 3.8);
  wheelOn(p, P, 0.6, 0.86, 5.6, null);
  wheelOn(p, P, 1.6, 0.92, 4, null);
}

function seederIcon(p: Pen): void {
  const P = icon3q();
  const c = P(1, 0.5);
  p.shadow(c.x, c.y + 1, 15, 5, 0.22);

  for (const v of [0.3, 0.6]) stick(p, [P(0.42, v, 12), P(0.2, v, 2)], 2, LILAC);
  slab(p, P, 0.2, 0.3, 1.6, 0.4, 1, 3, boxColors(CHASSIS));
  slab(p, P, 0.3, 0.2, 0.98, 0.6, 3, 8, boxColors(BUTTER));
  slab(p, P, 0.34, 0.16, 0.96, 0.7, 11, 9, boxColors(MINT));
  // seeds heaped on the hopper, and a little flower
  const seedCols = [CREAM, PINK, SUN, LILAC];
  [[0.5, 0.4], [0.7, 0.6], [1.0, 0.4], [1.1, 0.7]].forEach(([u, v], i) => {
    const q = P(u, v, 20);
    p.circle(q.x, q.y, 1.9, seedCols[i % seedCols.length], shade(seedCols[i % seedCols.length], -0.35));
  });
  const fs = P(0.84, 0.5, 20);
  const ft = P(0.84, 0.5, 26);
  stick(p, [fs, ft], 1.2, LEAF);
  p.flower(ft.x, ft.y, 3.6, PINK, SUN);
  const hood = P(1.85, 0.5, 4);
  face(p, hood.x, hood.y, 3.4);
  wheelOn(p, P, 0.6, 0.86, 5.6, null);
  wheelOn(p, P, 1.6, 0.92, 4, null);
}

function harvesterIcon(p: Pen): void {
  const P = icon3q();
  const c = P(1, 0.5);
  p.shadow(c.x, c.y + 1, 15, 5, 0.22);

  stick(p, [P(0.9, 0.12, 14), P(0.92, 0.12, 23), P(1.2, 0.12, 25)], 2.2, BUTTER);
  slab(p, P, 0.2, 0.3, 1.6, 0.4, 1, 3, boxColors(CHASSIS));
  slab(p, P, 0.5, 0.2, 1.0, 0.6, 3, 13, boxColors(PEACH));
  slab(p, P, 0.2, 0.22, 0.34, 0.56, 3, 15, boxColors(PINK));
  slab(p, P, 1.5, 0.12, 0.32, 0.76, 2, 5, boxColors(PEACH_D));
  // a little wheat sheaf on the tank side
  const base = P(0.98, 0.8, 6);
  for (const k of [-0.1, 0, 0.1]) grain(p, base, P(0.98 + k, 0.8, 14 - Math.abs(k) * 8), 1.3, WHEAT);
  // the reel up front
  const nose = P(1.85, 0.5, 6);
  face(p, nose.x, nose.y, 3.4);
  const R = P(1.8, 0.5, 17);
  p.circle(R.x, R.y, 6.2, rgba(WHITE, 0.35), O);
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + 0.4;
    stick(p, [R, { x: R.x + Math.cos(a) * 4.8, y: R.y + Math.sin(a) * 4.8 }], 1.4, SUN);
  }
  p.circle(R.x, R.y, 1.5, CREAM);
  wheelOn(p, P, 0.66, 0.82, 5.6, null);
  wheelOn(p, P, 1.2, 0.84, 4, null);
}

// ---------------------------------------------------------------------------
// Exports

export const sprites: SpriteSpec[] = [
  { key: 'vehicle:tractor', fw: 2, fh: 1, height: 50, paint: tractorSprite },
  { key: 'vehicle:seeder', fw: 2, fh: 1, height: 50, paint: seederSprite },
  { key: 'vehicle:harvester', fw: 2, fh: 1, height: 50, paint: harvesterSprite },
];

export const icons: IconSpec[] = [
  { key: 'icon:vehicle_tractor', paint: tractorIcon },
  { key: 'icon:vehicle_seeder', paint: seederIcon },
  { key: 'icon:vehicle_harvester', paint: harvesterIcon },
];
