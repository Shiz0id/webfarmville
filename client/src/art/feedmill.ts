// Feed Mill: the workshop that grinds crops into feed (building:feed_mill, 2x2),
// and its two feed sacks (icon:animal_feed, icon:deluxe_feed).
// The mill is a rustic timber house on a stone plinth: a turning water wheel on
// the front wall over a little stream, a chute from a hopper pouring grain onto
// a stack of mint and pink sacks by the door, and a porthole and weathervane in
// the gable. Same house style as market.ts and goods.ts: pastel fills, the warm
// brown OUTLINE, top-left light and soft shading.
import { type IconSpec, type Pen, type Pt, type SpriteSpec, shade } from './kit';
import { FEED_MILL_BUILDING } from '@farm/shared';

type Fill = string | CanvasGradient | null;
type Ctx = CanvasRenderingContext2D;

const WOOD = '#d9a06a';
const WOOD_L = '#f0c28e';
const WOOD_D = '#a8703f';
const STONE = '#cdc4b5';
const STONE_D = '#9d9485';
const ROOF = '#e3917a';
const TRIM = '#fff4e4';
const WHEEL = '#b97e4a';
const GLASS = '#ffe39a';
const WATER = '#a6e4f7';
const WATER_D = '#5fb9dd';
const GRAIN = '#f2c24a';
const MINT = '#a8e6cf';
const MINT_D = '#7fcdb0';
const PINK = '#ffb3cf';
const BURLAP = '#e6c48c';
const TWINE = '#c7985a';
const CARROT = '#ff9a3c';
const LEAF = '#6cbf55';
const LEAF_TAG = '#8fd46a';
const CORN = '#ffd23f';
const BLUE = '#6b7fd7';
const STAR = '#ffd84a';
const RIBBON = '#ff7eb3';
const CREAM = '#fff8ee';
const INK = '#2b1d14';

// ---------------------------------------------------------------------------
// Helpers

/** A wall plane we can paint onto: s runs along the wall, z is height. */
interface Face {
  pt: (s: number, z: number) => Pt;
  dim: number;
}

/** The front-left wall: v is fixed and s runs along u. */
const faceL = (p: Pen, v: number): Face => ({ pt: (s, z) => p.iso(s, v, z), dim: 0 });
/** The gable (right-hand) wall: u is fixed and s runs along v. */
const faceR = (p: Pen, u: number): Face => ({ pt: (s, z) => p.iso(u, s, z), dim: -0.12 });

function quad(p: Pen, f: Face, s0: number, s1: number, z0: number, z1: number, fill: Fill, stroke: string | null = p.outline): void {
  p.poly([f.pt(s0, z0), f.pt(s1, z0), f.pt(s1, z1), f.pt(s0, z1)], fill, stroke);
}

function shape(p: Pen, build: (c: Ctx) => void, fill: Fill, stroke: string | null = p.outline, width = p.lineWidth): void {
  const c = p.ctx;
  c.beginPath();
  build(c);
  if (fill) {
    c.fillStyle = fill;
    c.fill();
  }
  if (stroke) {
    c.strokeStyle = stroke;
    c.lineWidth = width;
    c.stroke();
  }
}

/** A line with an outline underneath (spokes, chutes, rails). */
function thick(p: Pen, pts: Pt[], color: string, w: number): void {
  p.line(pts, p.outline, w + 2);
  p.line(pts, color, w);
}

/** A little four-point twinkle, centred at (x, y). */
function sparkle(p: Pen, x: number, y: number, s: number, color: string): void {
  shape(
    p,
    (c) => {
      c.moveTo(x, y - s);
      c.quadraticCurveTo(x, y, x + s, y);
      c.quadraticCurveTo(x, y, x, y + s);
      c.quadraticCurveTo(x, y, x - s, y);
      c.quadraticCurveTo(x, y, x, y - s);
    },
    color,
    p.outline,
    0.6,
  );
}

/** A paw print: one pad and four toes, centred at (x, y) with size s. */
function pawPrint(p: Pen, x: number, y: number, s: number, color: string): void {
  p.ellipse(x, y + s * 0.2, s * 0.9, s * 0.7, color, null);
  for (const [dx, dy] of [
    [-0.95, -0.5],
    [-0.32, -1.0],
    [0.32, -1.0],
    [0.95, -0.5],
  ]) {
    p.circle(x + dx * s, y + dy * s, s * 0.36, color, null);
  }
}

/**
 * A plump feed sack standing on the ground, with its bottom centre at (bx, by),
 * gathered neck and tie, and a paw or heart print on the front.
 */
function sack(p: Pen, bx: number, by: number, w: number, h: number, cloth: string, print: 'paw' | 'heart', printCol: string): void {
  const hw = w / 2;
  const top = by - h;
  const g = p.ctx.createLinearGradient(bx - hw, 0, bx + hw, 0);
  g.addColorStop(0, shade(cloth, 0.2));
  g.addColorStop(0.55, cloth);
  g.addColorStop(1, shade(cloth, -0.2));
  shape(
    p,
    (c) => {
      c.moveTo(bx - hw * 0.45, top + h * 0.16);
      c.quadraticCurveTo(bx - hw * 1.25, top + h * 0.45, bx - hw, by - h * 0.32);
      c.quadraticCurveTo(bx - hw * 0.9, by, bx - hw * 0.4, by);
      c.lineTo(bx + hw * 0.4, by);
      c.quadraticCurveTo(bx + hw * 0.9, by, bx + hw, by - h * 0.32);
      c.quadraticCurveTo(bx + hw * 1.25, top + h * 0.45, bx + hw * 0.45, top + h * 0.16);
      c.closePath();
    },
    g,
  );
  // gathered ruffle at the neck
  shape(
    p,
    (c) => {
      c.moveTo(bx - hw * 0.5, top + h * 0.2);
      c.quadraticCurveTo(bx - hw * 0.7, top, bx - hw * 0.3, top - h * 0.05);
      c.quadraticCurveTo(bx, top - h * 0.1, bx + hw * 0.3, top - h * 0.05);
      c.quadraticCurveTo(bx + hw * 0.7, top, bx + hw * 0.5, top + h * 0.2);
      c.closePath();
    },
    shade(cloth, 0.14),
  );
  p.roundRect(bx - hw * 0.6, top + h * 0.14, hw * 1.2, h * 0.1, 1.2, CREAM);
  p.curve({ x: bx - hw * 0.72, y: top + h * 0.4 }, { x: bx - hw * 0.86, y: by - h * 0.4 }, { x: bx - hw * 0.6, y: by - h * 0.12 }, 'rgba(255,255,255,0.5)', 1);
  const s = Math.min(3.2, w * 0.17);
  if (print === 'paw') pawPrint(p, bx, by - h * 0.42, s, printCol);
  else p.heart(bx, by - h * 0.42, s * 0.95, printCol, null);
}

/** A little round blueberry-ish ball with a crown, for spills. */
function berry(p: Pen, x: number, y: number, r: number): void {
  p.ball(x, y, r, BLUE);
  p.circle(x + 0.4, y - r * 0.85, 0.6, '#3a4a8a', null);
}

// ---------------------------------------------------------------------------
// The Feed Mill

function feedMill(p: Pen): void {
  const HOUSE = 0.36; // timber house, a little inset from the plinth
  const HOUSE_E = 1.64;
  const PLINTH_E = 1.78;
  const WALL_TOP = 48;
  const ROOF_H = 24;
  const P = (u: number, v: number, z: number) => p.iso(u, v, z);
  const hl = faceL(p, HOUSE_E); // house, front-left
  const hr = faceR(p, HOUSE_E); // house, gable (bottom-right)
  const pl = faceL(p, PLINTH_E); // stone plinth
  const pr = faceR(p, PLINTH_E);

  const c = p.center;
  p.shadow(c.x, c.y + 2, 62, 28, 0.26);

  // stone plinth with block joints
  p.box(0.22, 0.22, PLINTH_E - 0.22, PLINTH_E - 0.22, 12, { top: shade(STONE, 0.14), left: STONE, right: shade(STONE, -0.2) });
  for (const s of [0.5, 0.95, 1.4]) {
    p.line([pl.pt(s, 1), pl.pt(s, 11)], shade(STONE_D, -0.1), 0.8);
    p.line([pr.pt(s, 1), pr.pt(s, 11)], shade(STONE_D, -0.2), 0.8);
  }
  p.line([pl.pt(0.22, 6), pl.pt(PLINTH_E, 6)], shade(STONE_D, -0.1), 0.8);
  p.line([pr.pt(0.22, 6), pr.pt(PLINTH_E, 6)], shade(STONE_D, -0.2), 0.8);

  // timber house with a gable roof
  p.box(HOUSE, HOUSE, HOUSE_E - HOUSE, HOUSE_E - HOUSE, WALL_TOP - 12, { top: shade(WOOD, 0.14), left: WOOD, right: shade(WOOD, -0.2) }, 12);
  for (let k = 1; k < 8; k++) {
    const s = HOUSE + ((HOUSE_E - HOUSE) * k) / 8;
    p.line([hl.pt(s, 14), hl.pt(s, WALL_TOP - 2)], shade(WOOD, -0.22), 0.7);
  }
  p.gableRoof(HOUSE, HOUSE, HOUSE_E - HOUSE, HOUSE_E - HOUSE, WALL_TOP, ROOF_H, ROOF, WOOD, 0.04);
  // roof tiles on the front slope and a ridge cap
  for (const t of [0.3, 0.6]) {
    const vt = 1.0 + (HOUSE_E + 0.12 - 1.0) * t;
    const zt = WALL_TOP + ROOF_H * (1 - t);
    p.line([P(HOUSE - 0.04, vt, zt), P(HOUSE_E + 0.04, vt, zt)], shade(ROOF, -0.3), 0.8);
  }
  thick(p, [P(HOUSE - 0.04, 1.0, WALL_TOP + ROOF_H), P(HOUSE_E + 0.04, 1.0, WALL_TOP + ROOF_H)], shade(ROOF, -0.12), 2.4);

  // porthole in the gable
  const port = P(HOUSE_E, 0.98, 58);
  p.circle(port.x, port.y, 4.6, TRIM);
  p.circle(port.x, port.y, 3.2, GLASS, shade(TRIM, -0.4));
  p.line([{ x: port.x - 2.2, y: port.y }, { x: port.x + 2.2, y: port.y }], WOOD_D, 0.7);

  // front-left wall: a small window
  quad(p, hl, 1.26, 1.52, 24, 38, TRIM);
  quad(p, hl, 1.31, 1.47, 26, 36, GLASS);
  p.line([hl.pt(1.39, 26), hl.pt(1.39, 36)], TRIM, 0.9);

  // water wheel on a pier, turning over a little stream
  // a little stream under the wheel, with ripples
  const stream = [P(0.4, 1.9, 0), P(0.86, 1.86, 0), P(1.34, 1.92, 0)];
  p.line(stream, p.outline, 6.4);
  p.line(stream, WATER_D, 4.6);
  p.line(stream, WATER, 2.6);
  p.line([P(0.55, 1.9, 0), P(0.72, 1.88, 0)], '#ffffff', 0.8);
  const uC = 0.84;
  const zC = 31;
  const rU = 0.36;
  const rZ = 16;
  const WV = 1.86;
  const rim = (k: number, a: number): Pt => P(uC + Math.cos(a) * rU * k, WV, zC + Math.sin(a) * rZ * k);
  p.line([P(uC, HOUSE_E, zC), P(uC, WV, zC)], WOOD_D, 2.4);
  const spokes = 8;
  for (let i = 0; i < spokes; i++) {
    const a = (i / spokes) * Math.PI * 2;
    p.line([P(uC, WV, zC), rim(1, a)], WHEEL, 1.6);
  }
  const outer: Pt[] = [];
  for (let i = 0; i < 24; i++) outer.push(rim(1, (i / 24) * Math.PI * 2));
  p.poly(outer, null, p.outline, 4.4);
  p.poly(outer, null, WHEEL, 2.4);
  for (let i = 0; i < spokes; i++) {
    const a = (i / spokes) * Math.PI * 2;
    thick(p, [rim(0.98, a), rim(1.24, a)], WOOD, 2.6);
  }
  const hub = P(uC, WV, zC);
  p.circle(hub.x, hub.y, 2.4, WOOD_D);
  p.circle(hub.x - 0.6, hub.y - 0.6, 0.8, WOOD_L, null);

  // hopper and chute on the gable wall, pouring grain onto the sacks
  quad(p, hr, 1.04, 1.34, 36, 46, WOOD_D);
  quad(p, hr, 1.08, 1.3, 38, 44, INK, null);
  thick(p, [P(HOUSE_E, 1.2, 40), P(1.98, 1.24, 31)], WOOD_L, 4);
  for (let i = 0; i < 3; i++) {
    const d = P(1.98, 1.24, 27 - i * 3.5);
    p.circle(d.x + i * 0.4, d.y, 1.1, GRAIN, shade(GRAIN, -0.4));
  }

  // the door, with a little step
  quad(p, hr, 0.52, 1.0, 12, 40, TRIM);
  quad(p, hr, 0.58, 0.94, 12, 38, WOOD_D);
  p.line([hr.pt(0.7, 13), hr.pt(0.7, 37)], shade(WOOD_D, -0.3), 0.8);
  p.line([hr.pt(0.82, 13), hr.pt(0.82, 37)], shade(WOOD_D, -0.3), 0.8);
  p.circle(hr.pt(0.9, 25).x, hr.pt(0.9, 25).y, 1, '#ffd34a', null);

  // feed sacks stacked by the door: mint and pink, with paw and heart prints
  const sA = P(1.96, 1.08, 0);
  sack(p, sA.x, sA.y, 21, 22, MINT, 'paw', CREAM);
  const sC = P(1.96, 1.08, 14);
  sack(p, sC.x, sC.y, 18, 17, PINK, 'heart', MINT_D);
  // grain pile where the chute pours onto the top sack
  for (const [dx, dy] of [
    [-2.4, 0.6],
    [0.2, -0.6],
    [2.6, 0.4],
  ]) {
    p.ellipse(sC.x + dx, sC.y - 19 + dy, 1.8, 1.1, GRAIN, shade(GRAIN, -0.4), 0.3);
  }
  const sB = P(1.84, 1.66, 0);
  sack(p, sB.x, sB.y, 19, 21, PINK, 'paw', CREAM);

  // a few tufts of grass and a flower or two by the plinth
  const fl = P(1.92, 0.42, 0);
  p.flower(fl.x, fl.y - 2, 2.2, '#ffffff', '#ffd84a');

  // a weathervane with a golden wheat ear on the ridge
  const wv = P(1.0, 1.0, WALL_TOP + ROOF_H);
  p.line([wv, { x: wv.x, y: wv.y - 13 }], WOOD_D, 1.2);
  p.ellipse(wv.x - 4, wv.y - 16, 3.5, 1.4, STAR, p.outline, -0.25);
  p.ellipse(wv.x + 2.5, wv.y - 15, 1.8, 1.4, STAR, p.outline);
  p.circle(wv.x, wv.y - 13, 1.4, STAR);
}

// ---------------------------------------------------------------------------
// Feed sacks (40 px icons)

function bagPath(c: Ctx): void {
  c.moveTo(13.5, 11.5);
  c.quadraticCurveTo(5.5, 16, 6, 25);
  c.quadraticCurveTo(6.5, 35.5, 14, 35.5);
  c.lineTo(26, 35.5);
  c.quadraticCurveTo(33.5, 35.5, 34, 25);
  c.quadraticCurveTo(34.5, 16, 26.5, 11.5);
  c.closePath();
}

function gatherTop(p: Pen, fill: string): void {
  shape(
    p,
    (c) => {
      c.moveTo(13.5, 12);
      c.quadraticCurveTo(11.5, 8.5, 14, 7.5);
      c.quadraticCurveTo(20, 5.5, 26, 7.5);
      c.quadraticCurveTo(28.5, 8.5, 26.5, 12);
      c.closePath();
    },
    fill,
  );
}

function animalFeed(p: Pen): void {
  p.shadow(20, 36.5, 14, 3.6, 0.25);

  // carrot tucked into the neck, behind the sack
  p.poly(
    [
      { x: 32.5, y: 7.6 },
      { x: 28.5, y: 5.4 },
      { x: 25.2, y: 16.2 },
    ],
    CARROT,
  );
  p.line([{ x: 29.5, y: 8 }, { x: 27.5, y: 10.5 }], shade(CARROT, -0.3), 0.6);
  p.ellipse(31.2, 4.6, 1, 3.1, LEAF, p.outline, -0.4);
  p.ellipse(33.5, 5.2, 0.9, 2.8, LEAF, p.outline, 0.45);

  // burlap body, its weave and gathered top
  const g = p.ctx.createLinearGradient(6, 0, 34, 0);
  g.addColorStop(0, shade(BURLAP, 0.22));
  g.addColorStop(0.55, BURLAP);
  g.addColorStop(1, shade(BURLAP, -0.2));
  shape(p, bagPath, g);
  for (let x = 10; x <= 30; x += 4) p.line([{ x, y: 17 }, { x, y: 34 }], 'rgba(120,80,40,0.28)', 0.7);
  for (const y of [21, 26, 31]) p.line([{ x: 8, y }, { x: 32, y }], 'rgba(120,80,40,0.22)', 0.7);
  p.curve({ x: 10, y: 19 }, { x: 8.2, y: 26 }, { x: 10.5, y: 32 }, 'rgba(255,255,255,0.45)', 1.2);
  gatherTop(p, shade(BURLAP, 0.1));

  // twine tied round the neck, with a little bow
  p.roundRect(12.5, 11, 15, 4, 2, TWINE);
  p.ellipse(18.6, 9.4, 2.3, 1.5, TWINE, p.outline, -0.5);
  p.ellipse(21.4, 9.4, 2.3, 1.5, TWINE, p.outline, 0.5);

  // green tag hanging from the twine, with a heart print
  p.line([{ x: 16, y: 15 }, { x: 16.5, y: 19.5 }], TWINE, 0.8);
  p.roundRect(15, 19.5, 10, 8.5, 2, LEAF_TAG);
  p.circle(17.4, 21.2, 0.9, CREAM, p.outline);
  p.heart(20, 25.4, 2.1, CREAM, null);

  // wheat grains spilling across the ground
  for (const [x, y, r] of [
    [30, 36.6, -0.5],
    [33.8, 37.4, 0.4],
    [36.8, 35.8, 0.9],
    [27.2, 37.8, -0.2],
    [6.8, 37.4, 0.6],
  ] as [number, number, number][]) {
    p.ellipse(x, y, 2, 1.1, GRAIN, shade(GRAIN, -0.45), r);
    p.line([{ x: x - 0.9, y: y - 0.2 }, { x: x + 0.6, y: y - 0.3 }], '#fff3c4', 0.5);
  }
}

function deluxeFeed(p: Pen): void {
  p.glow(20, 22, 19, '#fff3c4', 0.55);
  p.shadow(20, 36.5, 14, 3.6, 0.25);

  // pink satin body, cream gathered top
  const g = p.ctx.createLinearGradient(6, 0, 34, 0);
  g.addColorStop(0, shade(PINK, 0.25));
  g.addColorStop(0.55, PINK);
  g.addColorStop(1, shade(PINK, -0.18));
  shape(p, bagPath, g);
  for (const [x, y] of [
    [10.5, 21],
    [29.5, 21],
    [9.6, 31],
    [30.6, 30.5],
    [14.6, 34],
    [25.4, 34],
  ] as [number, number][]) {
    p.circle(x, y, 1.1, CREAM, null);
  }
  gatherTop(p, CREAM);
  p.curve({ x: 10, y: 19 }, { x: 8.2, y: 26 }, { x: 10.5, y: 32 }, 'rgba(255,255,255,0.6)', 1.2);

  // a star sticker in the middle
  p.star(20, 26, 6.6, '#ffffff');
  p.star(20, 26, 5, STAR);

  // ribbon bow at the neck
  p.poly(
    [
      { x: 19, y: 11 },
      { x: 16.4, y: 17.4 },
      { x: 19.8, y: 15.6 },
    ],
    shade(RIBBON, -0.08),
  );
  p.poly(
    [
      { x: 21, y: 11 },
      { x: 23.6, y: 17.4 },
      { x: 20.2, y: 15.6 },
    ],
    shade(RIBBON, -0.08),
  );
  p.ellipse(15.8, 9.4, 4.2, 2.5, RIBBON, p.outline, -0.45);
  p.ellipse(24.2, 9.4, 4.2, 2.5, RIBBON, p.outline, 0.45);
  p.roundRect(18.4, 8.2, 3.2, 4, 1.4, '#e8559a');

  // golden corn and blueberries spilling out at the front
  p.ellipse(30.6, 33.4, 3.3, 5.4, CORN, p.outline, 0.5);
  for (const [x, y] of [
    [29.4, 30.6],
    [31.6, 33.2],
    [29.6, 35.4],
    [31.6, 36.6],
  ] as [number, number][]) {
    p.circle(x, y, 0.55, shade(CORN, -0.3), null);
  }
  p.ellipse(34.4, 38.2, 2.6, 1.2, LEAF, p.outline, -0.6);
  berry(p, 7.4, 34.8, 2.2);
  berry(p, 11.6, 37.6, 2.2);
  berry(p, 4.8, 37.4, 2.0);

  // sparkles
  sparkle(p, 7.5, 12, 2.8, '#ffffff');
  sparkle(p, 33, 14, 2.3, '#fff1a8');
  sparkle(p, 34.6, 24, 1.8, '#ffffff');
}

// ---------------------------------------------------------------------------
// Exports

export const sprites: SpriteSpec[] = [
  {
    key: `building:${FEED_MILL_BUILDING.id}`,
    fw: FEED_MILL_BUILDING.w,
    fh: FEED_MILL_BUILDING.h,
    height: 90,
    paint: feedMill,
  },
];

export const icons: IconSpec[] = [
  { key: 'icon:animal_feed', paint: animalFeed },
  { key: 'icon:deluxe_feed', paint: deluxeFeed },
];
