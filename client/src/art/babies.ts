// Baby animals: a chick, calf, lamb, piglet, duckling, kid and bunny kit, one
// for each animal that can be bought as a baby (BABY_ANIMALS in the nursery
// content). Each is its grown-up in animals.ts at a young age: the same colours,
// markings, outline weight and 3/4 face, with a big round head, huge sparkly
// eyes and tiny stubby legs. Painted at BABY_SCALE of the adult's size, standing
// on the tile centre with a soft round shadow.
import { type Pen, type SpriteSpec, shade, rng } from './kit';

type Painter = (p: Pen) => void;

/** Babies are drawn at this fraction of the adult's size. */
const BABY_SCALE = 0.6;

const INK = '#2b1d14';
const WHITE = '#ffffff';
const BLUSH = 'rgba(255,120,140,0.5)';

/**
 * Runs `draw` in the adult's design units, shrunk to BABY_SCALE and standing on
 * the footprint centre. Strokes are thickened back so the outline reads at the
 * adults' 1px weight. Explicit stroke widths inside `draw` go through `px()`.
 */
function baby(p: Pen, draw: () => void): void {
  const c = p.center;
  const weight = p.lineWidth;
  p.save();
  p.ctx.translate(c.x, c.y);
  p.ctx.scale(BABY_SCALE, BABY_SCALE);
  p.lineWidth = 1 / BABY_SCALE;
  draw();
  p.lineWidth = weight;
  p.restore();
}

/** A stroke `n` canvas px wide, in the design units `baby` draws in. */
function px(n: number): number {
  return n / BABY_SCALE;
}

/** A soft round shadow on the ground, drawn in canvas space under the baby. */
function groundShadow(p: Pen, rx: number): void {
  const c = p.center;
  p.shadow(c.x + 1, c.y, rx, rx * 0.5, 0.24);
}

/** A huge sparkly baby eye: a black bead with two catch-lights. `ring` adds a light outline for dark faces. */
function eye(p: Pen, x: number, y: number, r = 3.4, ring = false): void {
  if (ring) p.circle(x, y, r + px(1.2), null, '#fffaf0');
  p.circle(x, y, r, INK, null);
  p.circle(x - r * 0.36, y - r * 0.42, r * 0.44, WHITE, null);
  p.circle(x + r * 0.42, y + r * 0.34, r * 0.2, WHITE, null);
}

function blush(p: Pen, x: number, y: number, s = 1): void {
  p.ellipse(x, y, 2.6 * s, 1.6 * s, BLUSH, null);
}

/** A tiny stubby leg standing on (x, y), with a darker hoof or paw at the foot when given. */
function stub(p: Pen, x: number, y: number, w: number, h: number, color: string, hoof?: string): void {
  p.roundRect(x - w / 2, y - h, w, h, w / 2, color);
  if (hoof) p.roundRect(x - w / 2, y - h * 0.4, w, h * 0.4, w / 2, hoof);
}

/** Puffy elliptical fluff cloud (wool, down, angora). Outline pass then fill pass. */
function fluff(p: Pen, x: number, y: number, rx: number, ry: number, color: string, seed: string, n = 10): void {
  const r = rng(seed);
  const puffs: { x: number; y: number; r: number }[] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + r() * 0.3;
    const pr = Math.min(rx, ry) * (0.42 + r() * 0.12);
    puffs.push({ x: x + Math.cos(a) * (rx - pr * 0.6), y: y + Math.sin(a) * (ry - pr * 0.6), r: pr });
  }
  for (const q of puffs) p.circle(q.x, q.y, q.r + p.lineWidth, p.outline, null);
  p.ellipse(x, y, rx * 0.8 + p.lineWidth, ry * 0.8 + p.lineWidth, p.outline, null);
  for (const q of puffs) p.circle(q.x, q.y, q.r, q.y > y ? shade(color, -0.07) : color, null);
  p.ellipse(x, y, rx * 0.8, ry * 0.8, color, null);
  for (const q of puffs) if (q.y < y - ry * 0.2) p.circle(q.x - q.r * 0.2, q.y - q.r * 0.25, q.r * 0.45, shade(color, 0.5), null);
}

function shadedEllipse(p: Pen, x: number, y: number, rx: number, ry: number, color: string, rot = 0): void {
  const g = p.ctx.createRadialGradient(x - rx * 0.35, y - ry * 0.45, Math.min(rx, ry) * 0.1, x, y, Math.max(rx, ry) * 1.05);
  g.addColorStop(0, shade(color, 0.25));
  g.addColorStop(0.65, color);
  g.addColorStop(1, shade(color, -0.18));
  p.ellipse(x, y, rx, ry, g, p.outline, rot);
}

/** Clip to an ellipse while drawing markings, then re-stroke the outline. */
function within(p: Pen, x: number, y: number, rx: number, ry: number, draw: () => void, rot = 0): void {
  p.save();
  p.ctx.beginPath();
  p.ctx.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2);
  p.ctx.clip();
  draw();
  p.restore();
  p.ellipse(x, y, rx, ry, null, p.outline, rot);
}

// ---------------------------------------------------------------------------
// Chick (the chicken's baby): a yellow ball of down, orange beak and feet.

const CHICK_YELLOW = '#ffe27a';
const CHICK_LEG = '#f0a033';
const CHICK_BEAK = '#ffbf3a';
const COMB = '#e8424a';

function chick(p: Pen): void {
  groundShadow(p, 10);
  baby(p, () => {
    // tail down, then the stubby orange legs (their feet show under the body)
    fluff(p, 14, -14, 3.6, 3.2, CHICK_YELLOW, 'chick-tail', 5);
    for (const lx of [-2, 5]) {
      p.line([{ x: lx, y: -6 }, { x: lx, y: 0 }], shade(CHICK_LEG, -0.2), px(2.4));
      p.ellipse(lx - 0.6, 0, 2.6, 1.2, CHICK_LEG);
    }
    fluff(p, 4, -13.5, 12, 8.5, CHICK_YELLOW, 'chick-body', 10);
    // a little wing stub
    p.ellipse(6.5, -13.5, 3.6, 2.2, shade(CHICK_YELLOW, -0.12), p.outline, -0.35);
    // big fluffy head with a downy tuft and a tiny red comb
    fluff(p, -6, -22, 10, 10, CHICK_YELLOW, 'chick-head', 9);
    fluff(p, -6, -31, 3.6, 2.5, CHICK_YELLOW, 'chick-tuft', 4);
    p.circle(-6.8, -33.2, 1.3, COMB);
    p.circle(-4.2, -33.6, 1.1, COMB);
    // short beak
    p.poly(
      [
        { x: -14.5, y: -23.5 },
        { x: -19, y: -21.5 },
        { x: -14.5, y: -19.5 },
      ],
      CHICK_BEAK,
    );
    eye(p, -10.5, -23.5, 3.4);
    eye(p, -2.6, -24, 3.2);
    blush(p, -11, -17.5, 0.95);
    blush(p, 0, -18, 0.95);
  });
}

// ---------------------------------------------------------------------------
// Calf (the cow's baby): white with black patches, pink snout, little horn nubs.

function calf(p: Pen): void {
  groundShadow(p, 11.5);
  const white = '#fffaf2';
  const hoof = '#6b4a3a';
  const patch = '#3d302b';
  baby(p, () => {
    // curly tail with a dark tuft
    p.curve({ x: 16, y: -13 }, { x: 21, y: -15 }, { x: 20, y: -9.5 }, p.outline, px(1.2));
    p.ellipse(20, -8.5, 1.6, 2, patch);
    stub(p, -5, 0.5, 4, 5.5, shade(white, -0.12), hoof);
    stub(p, 11, -1, 4, 5.5, shade(white, -0.12), hoof);
    shadedEllipse(p, 4, -10, 13, 9, white);
    within(p, 4, -10, 13, 9, () => {
      p.ellipse(10, -13, 4.5, 3.5, patch, null, 0.4);
      p.ellipse(-2, -6.5, 3, 2.5, patch, null);
    });
    stub(p, 1, 0.8, 4, 5.5, white, hoof);
    stub(p, 15.5, -1.5, 4, 5.5, white, hoof);
    // floppy ear behind the head
    p.ellipse(2, -26.5, 3.4, 1.9, white, p.outline, -0.45);
    p.ellipse(-17.5, -22, 3.4, 1.9, white, p.outline, 0.45);
    p.ellipse(-17.5, -22, 1.6, 0.9, '#f7b2bd', null, 0.45);
    // head with a black patch on the crown
    shadedEllipse(p, -7, -21.5, 10.5, 10, white);
    within(p, -7, -21.5, 10.5, 10, () => p.ellipse(-4, -30, 6, 4.5, patch, null));
    // horn nubs
    p.curve({ x: -11, y: -30 }, { x: -12.5, y: -33.5 }, { x: -10, y: -34.5 }, '#efe2c2', px(2.4));
    p.curve({ x: -4, y: -31 }, { x: -3, y: -34 }, { x: -1, y: -33.5 }, '#efe2c2', px(2.4));
    // pink snout
    p.ellipse(-13.5, -15.5, 5, 3.4, '#f7b2bd');
    p.ellipse(-15.8, -15.5, 0.9, 1.2, shade('#f7b2bd', -0.45), null);
    p.ellipse(-11.2, -15.5, 0.9, 1.2, shade('#f7b2bd', -0.45), null);
    eye(p, -12, -23, 3.4);
    eye(p, -3.4, -23.4, 3.2);
    blush(p, -1.5, -18.5, 0.9);
  });
}

// ---------------------------------------------------------------------------
// Lamb (the sheep's baby): a fluffy cream cloud with a dark face and a topknot.

function lamb(p: Pen): void {
  groundShadow(p, 11.5);
  const cream = '#fbf6ea';
  const face = '#5a4842';
  baby(p, () => {
    stub(p, -4, 0, 3.6, 5, shade(face, -0.1));
    stub(p, 10, -1, 3.6, 5, shade(face, -0.1));
    fluff(p, 4, -10, 13, 9, cream, 'lamb-body', 12);
    stub(p, 0, 0.5, 3.6, 5, face);
    stub(p, 14, -2, 3.6, 5, face);
    // small floppy ears sticking out sideways from the face
    p.ellipse(-17.5, -18.5, 4.2, 2, face, p.outline, 0.25);
    p.ellipse(2.5, -20, 4.2, 2, face, p.outline, -0.25);
    // one whole rounded oval face, sitting below a fluffy cream wool topknot
    shadedEllipse(p, -7, -19, 9.5, 9, face);
    fluff(p, -7, -29, 7.5, 4, cream, 'lamb-top', 7);
    eye(p, -11.5, -19.5, 3.3, true);
    eye(p, -3.2, -20, 3.1, true);
    blush(p, -13.5, -14, 0.9);
    blush(p, -1.5, -14.5, 0.9);
    // tiny nose and smile
    p.ellipse(-7, -13, 1.5, 1, '#c98a8a', null);
    p.curve({ x: -9, y: -11.5 }, { x: -7.5, y: -10.5 }, { x: -6, y: -11.5 }, INK, px(0.9));
  });
}

// ---------------------------------------------------------------------------
// Piglet (the pig's baby): pink, floppy ears, a curly tail and a snout.

function piglet(p: Pen): void {
  groundShadow(p, 10.5);
  const pink = '#f6b3bf';
  baby(p, () => {
    // curly tail
    p.ctx.beginPath();
    p.ctx.arc(18, -14, 2.4, Math.PI * 0.9, Math.PI * 2.7);
    p.ctx.strokeStyle = shade(pink, -0.35);
    p.ctx.lineWidth = px(1.3);
    p.ctx.stroke();
    stub(p, -4, 0, 4, 5, shade(pink, -0.1));
    stub(p, 10, -0.8, 4, 5, shade(pink, -0.1));
    shadedEllipse(p, 4, -10, 12.5, 9, pink);
    stub(p, 0, 0.8, 4, 5, pink);
    stub(p, 14, -1.5, 4, 5, pink);
    // floppy triangular ears
    p.poly(
      [
        { x: -13, y: -24 },
        { x: -18, y: -33 },
        { x: -8, y: -29 },
      ],
      shade(pink, -0.05),
    );
    p.poly(
      [
        { x: -5, y: -28 },
        { x: -2, y: -35 },
        { x: 2, y: -26 },
      ],
      shade(pink, -0.05),
    );
    shadedEllipse(p, -8, -21, 10.5, 10, pink);
    // round snout with two nostrils
    p.ellipse(-15.5, -14.5, 5, 3.6, shade(pink, -0.08));
    p.ellipse(-17.3, -14.5, 0.9, 1.3, shade(pink, -0.45), null);
    p.ellipse(-13.7, -14.5, 0.9, 1.3, shade(pink, -0.45), null);
    eye(p, -11.5, -22.5, 3.3);
    eye(p, -3.5, -23, 3.1);
    blush(p, -1.5, -17.5, 0.95);
  });
}

// ---------------------------------------------------------------------------
// Duckling (the duck's baby): yellow down with a green crown, orange bill and a blue wing spot.

const DOWN = '#ffe98c';
const MALLARD_GREEN = '#2f8f5a';
const DUCK_ORANGE = '#f59a2e';

function duckling(p: Pen): void {
  groundShadow(p, 10.5);
  baby(p, () => {
    // webbed feet
    for (const lx of [-3, 5]) {
      p.line([{ x: lx, y: -4 }, { x: lx, y: -1 }], shade(DUCK_ORANGE, -0.15), px(2.2));
      p.ellipse(lx - 1, -0.8, 2.8, 1.3, DUCK_ORANGE);
    }
    fluff(p, 15, -12, 3.4, 3, DOWN, 'duck-tail', 5);
    fluff(p, 4, -10, 12.5, 9, DOWN, 'duck-body', 11);
    // wing with a blue speculum
    p.ellipse(6, -11.5, 4.2, 2.4, shade(DOWN, -0.12), p.outline, -0.25);
    p.ellipse(7.5, -11, 1.6, 0.8, '#3f6fd0', null, -0.25);
    // head: yellow, with a green crown like the mallard
    shadedEllipse(p, -7, -21, 10.5, 10, DOWN);
    within(p, -7, -21, 10.5, 10, () => p.ellipse(-7, -31, 11, 5.5, MALLARD_GREEN, null));
    // flat little bill
    p.ellipse(-16.5, -18.5, 4.6, 2, '#ffc93a', p.outline, 0.12);
    eye(p, -10, -22.5, 3.4);
    eye(p, -2.6, -23, 3.2);
    blush(p, -2.5, -16.5, 0.9);
  });
}

// ---------------------------------------------------------------------------
// Kid (the goat's baby): cream coat with a brown patch, tiny horns and beard, and a bell.

function kid(p: Pen): void {
  groundShadow(p, 11);
  const coat = '#efe5d2';
  const patch = '#b98a5e';
  const hoof = '#5e4436';
  baby(p, () => {
    stub(p, -4, 0, 3.6, 5.5, shade(coat, -0.12), hoof);
    stub(p, 9, -0.5, 3.6, 5.5, shade(coat, -0.12), hoof);
    // stub tail
    p.ellipse(18, -14, 2.4, 3.2, coat, p.outline, 0.6);
    shadedEllipse(p, 4, -10, 13, 9, coat);
    within(p, 4, -10, 13, 9, () => {
      p.ellipse(9, -13, 4.5, 3.8, patch, null);
      p.ellipse(-1, -6.5, 2.6, 2, patch, null);
    });
    stub(p, 1, 0.8, 3.6, 5.5, coat, hoof);
    stub(p, 14, -2, 3.6, 5.5, coat, hoof);
    // horns and floppy ears, sideways
    p.curve({ x: -12, y: -30 }, { x: -13, y: -35 }, { x: -9, y: -37 }, '#8a7464', px(2.2));
    p.curve({ x: -6, y: -30 }, { x: -5, y: -35 }, { x: -1, y: -35 }, '#a68d7a', px(2.2));
    p.ellipse(-18, -23, 4.2, 2, patch, p.outline, 0.5);
    p.ellipse(1, -24, 4.2, 2, patch, p.outline, -0.5);
    // long little face
    shadedEllipse(p, -7, -21, 10, 9.5, coat);
    // small beard
    p.poly(
      [
        { x: -11, y: -14 },
        { x: -9, y: -8.5 },
        { x: -7, y: -14 },
      ],
      '#fffaf0',
    );
    eye(p, -11.5, -22.5, 3.2);
    eye(p, -3.5, -23, 3);
    p.ellipse(-10, -16.5, 2, 1.2, '#f2c9b8', null);
    blush(p, -15.5, -18, 0.9);
    blush(p, -1, -17.5, 0.9);
    // red collar with a tiny gold bell
    p.line([{ x: -10, y: -13 }, { x: -2, y: -11.5 }], '#d2493f', px(1.8));
    p.circle(-2.5, -9.5, 1.6, '#ffd34a');
  });
}

// ---------------------------------------------------------------------------
// Bunny kit (the angora rabbit's baby): a soft cloud of angora with long ears and a lilac bow.

function bunny(p: Pen): void {
  groundShadow(p, 10.5);
  const fur = '#fdf3f2';
  const inner = '#f8bccb';
  const lilac = '#b79cf0';
  baby(p, () => {
    // ears: one up, one flopped back
    p.ellipse(-13, -35, 3.2, 8.5, fur, p.outline, 0.2);
    p.ellipse(-13, -35, 1.6, 6.3, inner, null, 0.2);
    p.ellipse(1.5, -29.5, 3.2, 7, fur, p.outline, -0.9);
    p.ellipse(1.5, -29.5, 1.6, 4.8, inner, null, -0.9);
    fluff(p, 16.5, -12, 4, 4, WHITE, 'kit-tail', 5);
    fluff(p, 4, -10, 12.5, 9.5, fur, 'kit-body', 11);
    stub(p, -8, -0.5, 3, 4, fur);
    stub(p, 1, -0.5, 3, 4, fur);
    fluff(p, -7, -21, 10.5, 10, fur, 'kit-head', 10);
    // a lilac bow between the ears
    p.poly(
      [
        { x: -5.5, y: -30.5 },
        { x: -10.5, y: -34.5 },
        { x: -10.5, y: -26.5 },
      ],
      lilac,
    );
    p.poly(
      [
        { x: -5.5, y: -30.5 },
        { x: -0.5, y: -34.5 },
        { x: -0.5, y: -26.5 },
      ],
      lilac,
    );
    p.circle(-5.5, -30.5, 1.8, '#9b7ce6');
    eye(p, -11, -21.5, 3.5);
    eye(p, -3, -22, 3.3);
    // pink nose
    p.poly(
      [
        { x: -8.8, y: -17.2 },
        { x: -6.4, y: -17.2 },
        { x: -7.6, y: -15.8 },
      ],
      '#f08aa0',
      null,
    );
    blush(p, -14.5, -16.5, 0.95);
    blush(p, -0.5, -17, 0.95);
  });
}

// ---------------------------------------------------------------------------
// The sprites: one per baby, each the same footprint and height as its adult.

const BABY_ART: [string, Painter, number][] = [
  ['chicken', chick, 34],
  ['cow', calf, 40],
  ['sheep', lamb, 32],
  ['pig', piglet, 32],
  ['duck', duckling, 32],
  ['goat', kid, 44],
  ['rabbit', bunny, 44],
];

export const sprites: SpriteSpec[] = BABY_ART.map(([id, paint, height]) => ({
  key: `baby:${id}`,
  fw: 1,
  fh: 1,
  height,
  paint,
}));
