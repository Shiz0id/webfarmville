// Helper consumables (FarmVille 1): the Farmhand, the Arborist's fruit basket and
// the Unwither Charm. Flat 40px icons in the same pastel, warm-outline house
// style as the rest of the farm, with soft highlights and rosy cheeks.
import { type IconSpec, type Pen, type Pt, OUTLINE, rgba, shade } from './kit';

const O = OUTLINE;
const INK = '#2b1d14';
const WHITE = '#fffdf6';
const SKIN = '#ffdcc2';
const SKIN_D = '#f2b898';
const BLUSH = '#ff8fa3';
const STRAW = '#f6d68a';
const STRAW_D = '#e2b463';
const PINK = '#ffb3cf';
const RIBBON = PINK;
const SHIRT = '#ffd9e6';
const DENIM = '#8fc8f5';
const DENIM_D = '#6aaee3';
const BUTTON = '#ffd84a';
const MINT = '#a8e6cf';
const MINT_D = '#7fcdb0';
const WICKER = '#e2b070';
const WICKER_D = '#c98b53';
const WOOD = '#c98b53';
const WOOD_L = '#f2c58f';
const APPLE = '#ff8a8a';
const APPLE_D = '#e85c6a';
const PEAR = '#d8ee8a';
const CHERRY = '#ff6f8a';
const CHERRY_D = '#d8415f';
const LEAF = '#6cbf55';
const LEAF_D = '#4f9a40';
const STEM = '#8c6a3f';
const LILAC = '#c9b8f5';
const LILAC_D = '#a48fe0';
const GEM = '#ff9fc4';
const GEM_D = '#e77fa6';
const GOLD = '#f4c24a';

// ---------------------------------------------------------------------------
// Helpers

const pt = (x: number, y: number): Pt => ({ x, y });

/** A thick outlined stick between points (handles, ladder rails, stems). */
function stick(p: Pen, pts: Pt[], w: number, color: string): void {
  p.line(pts, O, w + 1.4);
  p.line(pts, color, w);
}

/** A little kawaii face: dot eyes with glints, rosy cheeks and a smile. */
function face(p: Pen, x: number, y: number, r: number): void {
  const ex = r * 0.42;
  for (const s of [-1, 1]) {
    p.circle(x + s * ex, y - r * 0.08, Math.max(0.7, r * 0.12), INK, null);
    p.circle(x + s * ex + r * 0.05, y - r * 0.16, Math.max(0.35, r * 0.05), WHITE, null);
    p.ellipse(x + s * r * 0.78, y + r * 0.34, r * 0.22, r * 0.14, rgba(BLUSH, 0.75), null);
  }
  p.curve({ x: x - r * 0.32, y: y + r * 0.2 }, { x, y: y + r * 0.66 }, { x: x + r * 0.32, y: y + r * 0.2 }, INK, Math.max(0.7, r * 0.12));
}

/** A soft leaf stretched along the segment a to b. */
function leaf(p: Pen, a: Pt, b: Pt, w: number, color: string): void {
  const len = Math.hypot(b.x - a.x, b.y - a.y);
  p.ellipse((a.x + b.x) / 2, (a.y + b.y) / 2, len / 2, w, color, shade(color, -0.4), Math.atan2(b.y - a.y, b.x - a.x));
}

/** A round fruit with a gloss and a little stalk. */
function fruit(p: Pen, x: number, y: number, r: number, color: string, stalk = true): void {
  if (stalk) stick(p, [pt(x, y - r * 0.7), pt(x + r * 0.2, y - r * 1.5)], 1, STEM);
  p.ball(x, y, r, color);
  p.ellipse(x - r * 0.4, y - r * 0.38, r * 0.22, r * 0.12, rgba(WHITE, 0.8), null, -0.6);
}

/** A pear: a round base tapering up to a neck. */
function pear(p: Pen, x: number, y: number, r: number, color: string): void {
  stick(p, [pt(x + r * 0.1, y - r * 1.1), pt(x + r * 0.4, y - r * 1.8)], 1, STEM);
  p.ball(x, y + r * 0.2, r, color);
  p.ball(x - r * 0.05, y - r * 0.85, r * 0.62, color);
  p.ellipse(x - r * 0.42, y + r * 0.1, r * 0.2, r * 0.12, rgba(WHITE, 0.8), null, -0.5);
}

/** A little sparkle: a four-point star with a soft round middle. */
function sparkle(p: Pen, x: number, y: number, r: number, color = WHITE): void {
  const pts: Pt[] = [];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 - Math.PI / 2;
    const rr = i % 2 === 0 ? r : r * 0.28;
    pts.push(pt(x + Math.cos(a) * rr, y + Math.sin(a) * rr));
  }
  p.poly(pts, color, shade(GOLD, -0.2), 0.7);
}

// ---------------------------------------------------------------------------
// Farmhand: a round-faced helper in a straw hat and overalls, with a pail.

function farmhand(p: Pen): void {
  // straw hat brim behind the head
  p.ellipse(19, 13.5, 15.5, 4.6, STRAW, O);
  p.ellipse(19, 13.5, 13, 2.8, STRAW_D, null, 0);
  // the hat's crown and a pink ribbon around it
  p.roundRect(11.5, 3.6, 15, 11.2, 6, STRAW, O);
  p.roundRect(11.8, 9.6, 14.4, 2.8, 1.2, RIBBON, null);
  for (let i = 0; i < 3; i++) p.line([pt(14 + i * 4, 5.5), pt(12.8 + i * 4, 8.5)], shade(STRAW, -0.22), 0.6);

  // shirt and overalls
  p.roundRect(8.5, 26, 22, 12.5, 6, SHIRT, O);
  p.roundRect(13, 27.5, 12, 10.5, 3, DENIM, O);
  stick(p, [pt(14.4, 26.8), pt(13.8, 22.5)], 1.6, DENIM_D);
  stick(p, [pt(23.6, 26.8), pt(24.2, 22.5)], 1.6, DENIM_D);
  p.circle(16.4, 30.2, 0.9, BUTTON, O);
  p.circle(21.6, 30.2, 0.9, BUTTON, O);

  // the round face
  p.circle(19, 20.5, 9.8, SKIN, O);
  p.ellipse(15.6, 14.9, 4.2, 1.8, shade(SKIN, -0.1), null, 0.1);
  face(p, 19, 21.4, 4.6);

  // a little pail held in the hand on the right, with a pink flower sticking out
  p.poly([pt(30, 27.5), pt(38, 27.5), pt(36.4, 36), pt(31.6, 36)], MINT, O, 1.2);
  p.ellipse(34, 27.5, 4, 1.4, MINT_D, O);
  p.ellipse(33.6, 27.5, 2.8, 0.8, '#b5ecd8', null);
  stick(p, [pt(30.6, 26.5), pt(34, 17)], 0.9, STEM);
  p.flower(34.2, 14.6, 3, PINK, GOLD);
  p.line([pt(30.4, 30), pt(30.6, 24)], shade(MINT, -0.06), 0.9);
  p.circle(31, 33, 2.1, SKIN_D, O);
}

// ---------------------------------------------------------------------------
// Arborist: a wicker basket of apples, pears and cherries, with a ladder leaning on it.

function arborist(p: Pen): void {
  // a wooden ladder leaning on the basket: two rails and three rungs
  const railA: [Pt, Pt] = [pt(3.5, 38), pt(14.5, 8.5)];
  const railB: [Pt, Pt] = [pt(10.5, 38), pt(21, 9)];
  const at = (r: [Pt, Pt], k: number) => pt(r[0].x + (r[1].x - r[0].x) * k, r[0].y + (r[1].y - r[0].y) * k);
  for (const k of [0.3, 0.52, 0.74]) stick(p, [at(railA, k), at(railB, k)], 1.3, WOOD_L);
  stick(p, railA, 2.4, WOOD);
  stick(p, railB, 2.4, WOOD);

  // leaves poking out of the fruit
  leaf(p, pt(30.5, 8), pt(37.2, 2.6), 2.2, LEAF);
  leaf(p, pt(24, 6), pt(18.5, 1.8), 1.9, LEAF_D);

  // fruit heaped over the rim: apples, a pear and a pair of cherries
  fruit(p, 18.8, 18.6, 4.9, APPLE);
  fruit(p, 26.8, 16.4, 5.2, APPLE_D);
  pear(p, 34.2, 17.6, 4.7, PEAR);
  stick(p, [pt(22.6, 13.4), pt(26.4, 4.6)], 0.9, STEM);
  stick(p, [pt(28.6, 12.6), pt(26.6, 4.6)], 0.9, STEM);
  p.ball(22.4, 13.6, 2.9, CHERRY);
  p.ball(28.6, 13, 2.8, CHERRY_D);
  p.ellipse(21.6, 12.6, 0.9, 0.5, rgba(WHITE, 0.8), null, -0.4);

  // the wicker basket: a rounded trapezoid, woven with a few lines
  const bask = [pt(13.5, 22.5), pt(38, 22.5), pt(34.8, 38), pt(16.8, 38)];
  p.poly(bask, WICKER, O, 1.3);
  for (const y of [28, 33]) {
    const dx = (y - 22.5) * 0.11;
    p.line([pt(13.5 + dx, y), pt(38 - dx, y)], WICKER_D, 1);
  }
  for (const x of [20.5, 26, 31.5]) p.line([pt(x + 0.8, 24), pt(x - 0.3 + (x - 26) * -0.06, 37)], WICKER_D, 0.9);
  p.roundRect(11, 20.4, 29.5, 4.2, 2, shade(WICKER, -0.14), O);
  // soft shine along the front of the basket
  p.line([pt(20, 31), pt(21, 35.6)], 'rgba(255,255,255,0.45)', 1.1);
}

// ---------------------------------------------------------------------------
// Unwither Charm: a pastel pendant ring with a pink seedling-heart gem, little wings and sparkles.

function unwitherCharm(p: Pen): void {
  // wings behind the ring
  for (const s of [-1, 1]) {
    const cx = 20 + s * 12.8;
    p.ellipse(cx, 15.5, 5, 3.8, rgba(WHITE, 0.92), '#b9a8e8', s * 0.5);
    p.ellipse(cx + s * 0.6, 21.5, 4.2, 2.8, rgba(WHITE, 0.85), '#b9a8e8', s * 0.2);
    p.line([pt(cx - s * 3.2, 13.6), pt(cx + s * 2.6, 15.8)], '#c9b8f5', 0.6);
  }

  // the pendant ring: a lilac rim with a mint inside
  p.circle(20, 20.5, 13.2, LILAC, O);
  p.circle(20, 20.5, 9.8, MINT, O);
  p.ellipse(15.5, 14.7, 3.6, 1.6, rgba(WHITE, 0.6), null, -0.5);
  p.circle(20, 7.6, 1.7, LILAC_D, O);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    p.circle(20 + Math.cos(a) * 11.5, 20.5 + Math.sin(a) * 11.5, 0.7, rgba(WHITE, 0.9), null);
  }

  // the pink gem: a heart with a seedling sprouting from its top
  p.heart(20, 22.6, 5.6, GEM, GEM_D);
  p.ellipse(18.2, 19.9, 1.5, 0.8, rgba(WHITE, 0.7), null, -0.6);
  stick(p, [pt(20, 17.2), pt(20, 13.4)], 1.2, STEM);
  leaf(p, pt(20, 13.8), pt(15.6, 10.2), 2, LEAF);
  leaf(p, pt(20, 13.4), pt(24.6, 9.6), 2, LEAF_D);

  // sparkles
  sparkle(p, 5.4, 6.4, 3.4);
  sparkle(p, 35.4, 6.8, 2.9);
  sparkle(p, 34.6, 34.4, 2.4, '#fff0a6');
  sparkle(p, 6.2, 33.4, 2, '#fff0a6');
  p.circle(10.6, 13.8, 0.9, GOLD, null);
  p.circle(30.2, 30.6, 0.9, GOLD, null);
}

// ---------------------------------------------------------------------------
// Exports

export const icons: IconSpec[] = [
  { key: 'icon:farmhand', paint: farmhand },
  { key: 'icon:arborist', paint: arborist },
  { key: 'icon:unwither_charm', paint: unwitherCharm },
];
