// Farmers' Market: the stall villagers shop at, plus the crate, basket and
// chalkboard sign that go with it. The stall is a 2x1 footprint with its long
// side along the grid's x axis, so its long counter front is the left face.
// The counter top is kept clear: the game lays the goods for sale on it.
import { type IconSpec, type Pen, type Pt, type SpriteSpec, OUTLINE, shade } from './kit';

const O = OUTLINE;

const MINT = '#a8e6cf';
const MINT_D = '#7fcdb0';
const CREAM = '#fff4e4';
const BUTTER = '#ffe49a';
const PINK = '#ffb3cf';
const PINK_D = '#e77fa6';
const PINK_L = '#ffdbe8';
const LILAC = '#c9b8f5';
const LEAF = '#6cbf55';
const WOOD = '#c98b53';
const WOOD_L = '#f2c58f';
const WOOD_DD = '#7a4f2e';
const TERRA = '#e8926a';
const GOLD = '#f4c24a';
const BOARD = '#4f6e61';
const CHALK = '#fbf7ef';
const WICKER = '#e2b070';
const CRATE = '#d9a066';

// ---------------------------------------------------------------------------
// Helpers

/** A thick outlined stick between points (posts, handles, legs). */
function stick(p: Pen, pts: Pt[], w: number, color: string): void {
  p.line(pts, O, w + 1.6);
  p.line(pts, color, w);
}

/** A small potted plant: leafy bush on a terracotta pot, flowers on top. */
function flowerPot(p: Pen, u: number, v: number, seed: number, petals: [string, string]): void {
  const b = p.iso(u, v, 0);
  p.shadow(b.x, b.y, 9, 4.5, 0.22);
  p.foliage(b.x, b.y - 15, 6.5, LEAF, seed, 6);
  p.cylinder(b.x, b.y, 5.8, 9, TERRA);
  p.flower(b.x - 3.2, b.y - 20, 3.6, petals[0]);
  p.flower(b.x + 3.4, b.y - 17.5, 3, petals[1]);
}

// ---------------------------------------------------------------------------
// The stall (2x1 footprint)

const STALL_H = 66; // headroom above the footprint, enough for the awning

// Footprint layout (footprint-local tile coords).
const COUNTER = { l: 0.2, r: 1.8, b: 0.3, f: 0.8 };
const AWN = { l: 0.1, r: 1.9, b: 0.0, f: 1.1, zb: 58, zf: 48 };
const awnZ = (v: number): number => AWN.zb + ((v - AWN.b) / (AWN.f - AWN.b)) * (AWN.zf - AWN.zb);

function post(p: Pen, u: number, v: number): void {
  const b = p.iso(u, v, 0);
  p.cylinder(b.x, b.y, 2.7, awnZ(v) - 3, shade(WOOD, -0.06));
}

function counterBody(p: Pen): void {
  const { l, r, b, f } = COUNTER;
  p.box(l, b, r - l, f - b, 15, { top: WOOD_L, left: WOOD, right: shade(WOOD, -0.2) });
  // horizontal planks on the long front and the short end
  for (const z of [5, 10]) {
    p.line([p.iso(l, f, z), p.iso(r, f, z)], shade(WOOD, -0.36), 1);
    p.line([p.iso(r, b, z), p.iso(r, f, z)], shade(WOOD, -0.36), 1);
  }
  // a couple of knots and a light edge along the top board of the front
  const k1 = p.iso(0.55, f, 12);
  const k2 = p.iso(1.5, f, 2.6);
  p.ellipse(k1.x, k1.y, 1.4, 0.9, shade(WOOD, -0.45), null, -0.3);
  p.ellipse(k2.x, k2.y, 1.3, 0.8, shade(WOOD, -0.45), null, 0.3);
  p.line([p.iso(l + 0.05, f, 13.4), p.iso(r - 0.05, f, 13.4)], 'rgba(255,240,215,0.45)', 1);
  // a little gingham cloth draped over the short end
  const cz = 15;
  const cHem = 9.5;
  const tl = p.iso(r, 0.36, cz);
  const tr = p.iso(r, 0.78, cz);
  const br = p.iso(r, 0.78, cHem);
  const bl = p.iso(r, 0.36, cHem);
  const ctx = p.ctx;
  ctx.beginPath();
  ctx.moveTo(tl.x, tl.y);
  ctx.lineTo(tr.x, tr.y);
  ctx.lineTo(br.x, br.y);
  // scalloped hem: one soft dip between the two bottom corners
  ctx.quadraticCurveTo((br.x + bl.x) / 2, (br.y + bl.y) / 2 + 6, bl.x, bl.y);
  ctx.closePath();
  ctx.fillStyle = CREAM;
  ctx.fill();
  ctx.strokeStyle = O;
  ctx.lineWidth = 1;
  ctx.stroke();
  for (const v of [0.48, 0.6, 0.7]) p.line([p.iso(r, v, cz - 0.4), p.iso(r, v, 10)], PINK, 1.3);
  // counter top: a wooden board with a few grain lines, left clear for the goods
  p.box(l - 0.06, b - 0.06, r - l + 0.12, f - b + 0.1, 2.5, { top: '#f5d19c', left: shade(WOOD, 0.12), right: shade(WOOD, -0.08) }, 15);
  for (const v of [0.45, 0.62]) p.line([p.iso(l - 0.06, v, 17.5), p.iso(r + 0.06, v, 17.5)], 'rgba(160,100,60,0.35)', 0.7);
}

function awning(p: Pen): void {
  const n = 6;
  const { l, r, b, f } = AWN;
  const zf = awnZ(f);
  const zb = awnZ(b);
  for (let i = 0; i < n; i++) {
    const u0 = l + ((r - l) * i) / n;
    const u1 = l + ((r - l) * (i + 1)) / n;
    const col = i % 2 ? CREAM : MINT;
    p.poly([p.iso(u0, b, zb), p.iso(u1, b, zb), p.iso(u1, f, zf), p.iso(u0, f, zf)], col, O, 1);
  }
  // a soft sheen along the back of the canopy
  p.line([p.iso(l + 0.1, b + 0.12, zb - 1), p.iso(r - 0.1, b + 0.12, zb - 1)], 'rgba(255,255,255,0.45)', 1.6);
}

function scallops(p: Pen): void {
  const n = 6;
  const { l, r, f } = AWN;
  const zf = awnZ(f);
  for (let i = 0; i < n; i++) {
    const u0 = l + ((r - l) * i) / n;
    const u1 = l + ((r - l) * (i + 1)) / n;
    const a = p.iso(u0, f, zf);
    const bb = p.iso(u1, f, zf);
    const c = { x: (a.x + bb.x) / 2, y: (a.y + bb.y) / 2 + 10 };
    const ctx = p.ctx;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.quadraticCurveTo(c.x, c.y, bb.x, bb.y);
    ctx.closePath();
    ctx.fillStyle = i % 2 ? CREAM : MINT;
    ctx.fill();
    ctx.strokeStyle = O;
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}

function chalkSign(p: Pen): void {
  // hangs in front of the counter from the awning's front edge
  const v = 1.06;
  const u0 = 0.62;
  const u1 = 1.38;
  const z0 = 23;
  const z1 = 40;
  const bp = (s: number, t: number): Pt => p.iso(u0 + (u1 - u0) * s, v, z0 + (z1 - z0) * t);
  // two little strings from the awning
  p.line([p.iso(u0 + 0.05, AWN.f - 0.05, awnZ(AWN.f) - 1), bp(0.03, 1)], O, 1);
  p.line([p.iso(u1 - 0.05, AWN.f - 0.05, awnZ(AWN.f) - 1), bp(0.97, 1)], O, 1);
  // wooden frame
  p.poly([bp(-0.06, -0.08), bp(1.06, -0.08), bp(1.06, 1.06), bp(-0.06, 1.06)], WOOD, O, 1.1);
  p.line([bp(-0.02, 0.98), bp(1.02, 0.98)], WOOD_L, 1);
  // chalkboard face
  p.poly([bp(0.09, 0.1), bp(0.91, 0.1), bp(0.91, 0.9), bp(0.09, 0.9)], BOARD, null);
  // chalk doodles: a heart, a coin and a squiggle, with a smudge of light
  const h = bp(0.5, 0.6);
  p.heart(h.x, h.y, 3.2, PINK, PINK_D);
  const c = bp(0.27, 0.3);
  p.circle(c.x, c.y, 2.5, GOLD, shade(GOLD, -0.35));
  p.curve(bp(0.52, 0.3), bp(0.68, 0.14), bp(0.84, 0.3), CHALK, 0.9);
  p.line([bp(0.2, 0.84), bp(0.8, 0.84)], 'rgba(251,247,239,0.5)', 0.8);
  p.line([bp(0.18, 0.12), bp(0.5, 0.12)], 'rgba(251,247,239,0.25)', 0.8);
}

function marketStall(p: Pen): void {
  const { x: cx, y: cy } = p.center;
  p.shadow(cx, cy + 1, 44, 20, 0.25);

  // back posts sit behind the counter
  post(p, 0.16, 0.1);
  post(p, 1.84, 0.1);

  counterBody(p);

  // front posts stand just in front of the counter
  post(p, 0.16, 0.98);
  post(p, 1.84, 0.98);

  // potted flowers at either end of the stall
  flowerPot(p, 0.42, 1.22, 11, [PINK, BUTTER]);
  flowerPot(p, 2.0, 0.55, 23, [LILAC, PINK_L]);

  // the striped canopy and its scalloped hem
  awning(p);
  scallops(p);

  chalkSign(p);
}

// ---------------------------------------------------------------------------
// Icons (flat, 40x40)

function iconMarket(p: Pen): void {
  p.shadow(20, 36, 15, 3, 0.25);
  // posts and counter
  p.rect(9, 15, 3, 19, shade(WOOD, -0.06));
  p.rect(28, 15, 3, 19, shade(WOOD, -0.06));
  p.rect(6, 22, 28, 13, WOOD);
  p.line([{ x: 6, y: 27 }, { x: 34, y: 27 }], shade(WOOD, -0.36), 0.9);
  p.line([{ x: 6, y: 31.5 }, { x: 34, y: 31.5 }], shade(WOOD, -0.36), 0.9);
  p.rect(5, 19.5, 30, 4, WOOD_L);
  // striped awning with scalloped hem
  for (let i = 0; i < 6; i++) {
    const x = 5 + i * 5;
    const ctx = p.ctx;
    ctx.beginPath();
    ctx.moveTo(x, 7);
    ctx.lineTo(x + 5, 7);
    ctx.lineTo(x + 5, 14);
    ctx.arc(x + 2.5, 14, 2.5, 0, Math.PI, false);
    ctx.closePath();
    ctx.fillStyle = i % 2 ? CREAM : MINT;
    ctx.fill();
    ctx.strokeStyle = O;
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  p.roundRect(4, 3.5, 32, 4.5, 2, MINT_D);
  // a gold coin tucked at the counter's corner
  p.circle(31, 30, 7, '#ffd34a', O);
  p.circle(31, 30, 4.8, null, shade(GOLD, -0.2));
  p.ellipse(28.5, 27.6, 1.8, 1, 'rgba(255,255,255,0.7)', null, -0.5);
}

/** An iso point on a 40px icon, footprint-local (0..1 across the crate). */
function crateProj(u: number, v: number, z: number): Pt {
  return { x: 20 + (u - v) * 14, y: 19 + (u + v) * 6.8 - z };
}

function iconCrate(p: Pen): void {
  const ht = 13;
  const P = crateProj;
  const quad = (pts: Pt[], fill: string, stroke: string | null = O, w = 1): void => p.poly(pts, fill, stroke, w);
  p.shadow(20, 33, 15, 4, 0.25);
  // inside: the far walls and the floor of the empty crate
  const ui = 0.13;
  const uo = 0.87;
  const floorZ = ht - 4.5;
  quad([P(ui, ui, ht), P(ui, uo, ht), P(ui, uo, floorZ), P(ui, ui, floorZ)], shade(WOOD_DD, 0.1), null);
  quad([P(ui, ui, ht), P(uo, ui, ht), P(uo, ui, floorZ), P(ui, ui, floorZ)], shade(WOOD_DD, 0.22), null);
  quad([P(ui, ui, floorZ), P(uo, ui, floorZ), P(uo, uo, floorZ), P(ui, uo, floorZ)], '#8a5a34', null);
  // outer walls: left (front-left) and right (front-right) faces
  const lo = 0.04;
  const hi = 0.96;
  quad([P(lo, hi, 0), P(hi, hi, 0), P(hi, hi, ht), P(lo, hi, ht)], CRATE);
  quad([P(hi, lo, 0), P(hi, hi, 0), P(hi, hi, ht), P(hi, lo, ht)], shade(CRATE, -0.22));
  // slats and corner posts
  for (const z of [ht * 0.36, ht * 0.7]) {
    p.line([P(lo, hi, z), P(hi, hi, z)], shade(CRATE, -0.35), 0.9);
    p.line([P(hi, lo, z), P(hi, hi, z)], shade(CRATE, -0.35), 0.9);
  }
  p.line([P(hi, hi, 0), P(hi, hi, ht)], shade(CRATE, -0.4), 1.2);
  p.line([P(lo, hi, 0), P(lo, hi, ht)], shade(CRATE, -0.1), 1);
  // a little heart stamped on the front
  const hc = P(0.5, hi, ht * 0.5);
  p.heart(hc.x, hc.y, 2.2, PINK, PINK_D);
  // rim: the open top's lip, drawn as a ring over the inside
  const ctx = p.ctx;
  ctx.beginPath();
  for (const pt of [P(lo, lo, ht), P(hi, lo, ht), P(hi, hi, ht), P(lo, hi, ht)]) ctx.lineTo(pt.x, pt.y);
  ctx.closePath();
  ctx.moveTo(P(ui, ui, ht).x, P(ui, ui, ht).y);
  ctx.lineTo(P(ui, uo, ht).x, P(ui, uo, ht).y);
  ctx.lineTo(P(uo, uo, ht).x, P(uo, uo, ht).y);
  ctx.lineTo(P(uo, ui, ht).x, P(uo, ui, ht).y);
  ctx.closePath();
  ctx.fillStyle = shade(CRATE, 0.2);
  ctx.fill('evenodd');
  ctx.strokeStyle = O;
  ctx.lineWidth = 1;
  ctx.stroke();
}

function iconBasket(p: Pen): void {
  p.shadow(20, 35, 14, 3, 0.25);
  // handle first, so the rim sits over its ends
  const ctx = p.ctx;
  ctx.beginPath();
  ctx.ellipse(20, 18, 12.5, 13, 0, Math.PI, 0);
  ctx.strokeStyle = O;
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.strokeStyle = WICKER;
  ctx.lineWidth = 2;
  ctx.stroke();
  // body: a rounded bowl hanging below the rim
  const body = [{ x: 5, y: 19 }, { x: 35, y: 19 }];
  ctx.beginPath();
  ctx.moveTo(body[0].x, body[0].y);
  ctx.bezierCurveTo(6, 28, 12, 33, 20, 33);
  ctx.bezierCurveTo(28, 33, 34, 28, 35, 19);
  ctx.ellipse(20, 19, 15, 5.2, 0, 0, Math.PI, false);
  ctx.closePath();
  ctx.fillStyle = p.vgrad(19, 33, shade(WICKER, 0.18), shade(WICKER, -0.2));
  ctx.fill();
  // weave: clipped to the body so the wicker stops at its edge
  ctx.save();
  ctx.clip();
  const weave = shade(WICKER, -0.38);
  for (let i = -3; i <= 3; i++) {
    const x = 20 + i * 5;
    p.line([{ x: x - 4, y: 14 }, { x: x + 2, y: 34 }], weave, 0.9);
    p.line([{ x: x + 4, y: 14 }, { x: x - 2, y: 34 }], weave, 0.9);
  }
  for (const y of [24.5, 29.5]) p.curve({ x: 4, y }, { x: 20, y: y + 2.5 }, { x: 36, y }, weave, 0.9);
  ctx.restore();
  // body outline
  ctx.beginPath();
  ctx.moveTo(body[0].x, body[0].y);
  ctx.bezierCurveTo(6, 28, 12, 33, 20, 33);
  ctx.bezierCurveTo(28, 33, 34, 28, 35, 19);
  ctx.ellipse(20, 19, 15, 5.2, 0, 0, Math.PI, false);
  ctx.closePath();
  ctx.strokeStyle = O;
  ctx.lineWidth = 1.2;
  ctx.stroke();
  // a pink ribbon around the middle
  p.curve({ x: 6.5, y: 25.5 }, { x: 20, y: 28.5 }, { x: 33.5, y: 25.5 }, PINK_D, 2.4);
  p.curve({ x: 6.5, y: 25.5 }, { x: 20, y: 28.5 }, { x: 33.5, y: 25.5 }, PINK, 1.2);
  // rim with the dark, empty interior showing
  p.ellipse(20, 19, 15, 5.2, shade(WICKER, 0.25));
  p.ellipse(20, 19.4, 12, 3.4, WOOD_DD, null);
  p.ellipse(15, 17.6, 4, 0.9, 'rgba(255,255,255,0.35)', null, -0.1);
  // a little pink bow on the handle
  p.ellipse(18.2, 6.6, 2.4, 1.6, PINK, O, -0.4);
  p.ellipse(21.8, 6.6, 2.4, 1.6, PINK, O, 0.4);
  p.circle(20, 6.8, 1.3, PINK_D, O);
}

function iconSign(p: Pen): void {
  p.shadow(20, 36, 12, 2.6, 0.25);
  // A-frame legs, behind the board
  stick(p, [{ x: 20, y: 7 }, { x: 9, y: 35 }], 3.2, shade(WOOD, -0.05));
  stick(p, [{ x: 20, y: 7 }, { x: 31, y: 35 }], 3.2, shade(WOOD, -0.05));
  stick(p, [{ x: 12.4, y: 28.5 }, { x: 27.6, y: 28.5 }], 2, WOOD);
  // wooden frame and chalkboard
  p.roundRect(6.5, 5.5, 27, 22, 3.5, WOOD);
  p.roundRect(9, 8, 22, 17, 2, BOARD, null);
  p.ellipse(13.5, 10.5, 3.2, 1, 'rgba(255,255,255,0.14)', null, -0.3);
  // chalk doodles: a heart and a coin, plus a squiggle of chalk
  p.heart(16, 16.3, 3.6, PINK, PINK_D);
  p.circle(25.2, 13.5, 2.9, GOLD, shade(GOLD, -0.35));
  p.circle(25.2, 13.5, 1.5, null, shade(GOLD, -0.1));
  p.curve({ x: 12.5, y: 22.2 }, { x: 18.5, y: 20.2 }, { x: 24, y: 22.2 }, CHALK, 0.9);
  p.curve({ x: 24, y: 22.2 }, { x: 27, y: 20.4 }, { x: 28.5, y: 22.4 }, CHALK, 0.9);
  // a couple of chalk sparkles
  p.line([{ x: 27.4, y: 9.2 }, { x: 27.4, y: 11.4 }], CHALK, 0.8);
  p.line([{ x: 26.3, y: 10.3 }, { x: 28.5, y: 10.3 }], CHALK, 0.8);
}

// ---------------------------------------------------------------------------
// Exports

export const sprites: SpriteSpec[] = [{ key: 'deco:market_stall', fw: 2, fh: 1, height: STALL_H, paint: marketStall }];

export const icons: IconSpec[] = [
  { key: 'icon:market', paint: iconMarket },
  { key: 'market:crate', paint: iconCrate },
  { key: 'market:basket', paint: iconBasket },
  { key: 'market:sign', paint: iconSign },
];

