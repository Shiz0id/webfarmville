// Pets: a fluffy shiba-style puppy and a calico kitten. Same house style as the
// farm animals (chubby, big head, dot eyes with a highlight, pink blush, dark
// brown outline, soft shadow), facing bottom-left. Each pet has a stand frame
// and a walk frame (legs and ears move) so alternating them reads as walking.
import { type IconSpec, type Pen, type SpriteSpec, shade } from './kit';

const INK = '#2b1d14';
const BLUSH = 'rgba(255,120,140,0.45)';
const PINK = '#f4919f';
const TONGUE = '#f7879a';

const ORANGE = '#eea052';
const CREAM = '#fff4e0';
const COLLAR = '#e2483d';
const GOLD = '#ffd34a';

const CAT_WHITE = '#fffdf8';
const CAT_ORANGE = '#f0a24e';
const CAT_BROWN = '#7a4a2e';
const BELL_BLUE = '#5aa9ef';
const ZZZ = '#7d6ab0';

/** Headroom above the footprint; the pets are drawn at 0.8 scale inside it. */
const HEIGHT = 34;
const SCALE = 0.8;

interface P2 {
  x: number;
  y: number;
}

// ---------------------------------------------------------------------------
// Shared bits

function eye(p: Pen, x: number, y: number, r = 1.7): void {
  p.circle(x, y, r, INK, null);
  p.circle(x - r * 0.35, y - r * 0.4, r * 0.42, '#ffffff', null);
}

function blush(p: Pen, x: number, y: number, s = 1): void {
  p.ellipse(x, y, 2 * s, 1.2 * s, BLUSH, null);
}

/** Ellipse with a soft top-left highlight, outlined. */
function softEllipse(p: Pen, x: number, y: number, rx: number, ry: number, color: string): void {
  const g = p.ctx.createRadialGradient(x - rx * 0.35, y - ry * 0.45, Math.min(rx, ry) * 0.1, x, y, Math.max(rx, ry) * 1.05);
  g.addColorStop(0, shade(color, 0.22));
  g.addColorStop(0.65, color);
  g.addColorStop(1, shade(color, -0.18));
  p.ellipse(x, y, rx, ry, g, p.outline);
}

/** Run `draw` clipped to an ellipse (for patches and markings). */
function clipped(p: Pen, x: number, y: number, rx: number, ry: number, draw: () => void): void {
  p.save();
  p.ctx.beginPath();
  p.ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  p.ctx.clip();
  draw();
  p.restore();
}

/** A stubby limb: round-capped stroke with an outline underneath. */
function limb(p: Pen, a: P2, b: P2, w: number, color: string): void {
  p.line([a, b], p.outline, w + 1.4);
  p.line([a, b], color, w);
}

/** A cubic swoosh (tails, collars) with an outline underneath. */
function swoosh(p: Pen, a: P2, c1: P2, c2: P2, b: P2, color: string, w: number): void {
  const ctx = p.ctx;
  const path = (col: string, width: number) => {
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.bezierCurveTo(c1.x, c1.y, c2.x, c2.y, b.x, b.y);
    ctx.strokeStyle = col;
    ctx.lineWidth = width;
    ctx.stroke();
  };
  path(p.outline, w + 1.4);
  path(color, w);
}

/** Paint in the pet's own space: (0, 0) is the ground centre, scaled down to size. */
function local(p: Pen, draw: () => void): void {
  const c = p.center;
  p.save();
  p.ctx.translate(c.x, c.y);
  p.ctx.scale(SCALE, SCALE);
  draw();
  p.restore();
}

function pet(key: string, paint: (p: Pen) => void): SpriteSpec {
  return { key, fw: 1, fh: 1, height: HEIGHT, paint };
}

// ---------------------------------------------------------------------------
// Puppy (shiba style)

/** Puppy head, drawn about its centre (hx, hy). `ear` lifts the ears (walk bounce). */
function puppyHead(p: Pen, hx: number, hy: number, ear: number): void {
  const at = (dx: number, dy: number): P2 => ({ x: hx + dx, y: hy + dy });
  // short, rounded, erect ears sit behind the head
  p.poly([at(-7.6, -3.2), at(-7.4, -11.8 - ear), at(-1.4, -7.6)], ORANGE);
  p.poly([at(-1.4, -7.8), at(3.4, -12.2 - ear), at(4.2, -3.8)], shade(ORANGE, -0.06));
  p.poly([at(-6.4, -5.2), at(-6.2, -9.6 - ear), at(-3.2, -6.8)], CREAM, null);
  p.poly([at(-2.2, -8.2), at(2.2, -10.6 - ear), at(3.2, -5)], CREAM, null);

  softEllipse(p, hx, hy, 8.2, 8.2, ORANGE);
  p.ellipse(hx + 1.8, hy - 5, 2.8, 1.4, shade(ORANGE, 0.35), null, -0.2);

  // cream cheeks (no outline, so the face reads as fur, not teeth)
  p.ellipse(hx - 3.4, hy + 4.4, 4.8, 3.3, CREAM, null);
  p.ellipse(hx + 4.8, hy + 2.6, 2.4, 2.1, CREAM, null);

  // small nose, happy open-mouth smile with a tiny tongue
  p.ellipse(hx - 7.6, hy + 1.8, 1.6, 1.2, INK, null);
  p.circle(hx - 8, hy + 1.3, 0.42, '#ffffff', null);
  p.arc(hx - 4.6, hy + 5.4, 2, 0, Math.PI, INK, null);
  p.ellipse(hx - 4.6, hy + 7, 1.1, 0.85, TONGUE, null);

  eye(p, hx - 2.2, hy - 2, 1.8);
  eye(p, hx + 3.2, hy - 2.4, 1.7);
  blush(p, hx - 6.8, hy + 1.2, 0.9);
  blush(p, hx + 4.4, hy - 0.4, 0.8);
}

/** Puppy collar: red band with a gold tag. */
function puppyCollar(p: Pen, a: P2, c1: P2, c2: P2, b: P2, tag: P2): void {
  swoosh(p, a, c1, c2, b, COLLAR, 2.4);
  p.circle(tag.x, tag.y, 1.8, GOLD);
}

/** Front or back leg with a cream paw at the bottom. */
function puppyLeg(p: Pen, top: P2, bottom: P2, color: string): void {
  limb(p, top, bottom, 3.4, color);
  p.ellipse(bottom.x, bottom.y, 2.3, 1.5, CREAM);
}

function puppyStandOrWalk(p: Pen, walk: boolean): void {
  p.shadow(0, 0, 12.5, 4.4, 0.25);

  // curly tail, cream tip
  const tip: P2 = walk ? { x: 12.2, y: -25.5 } : { x: 12.8, y: -24.5 };
  swoosh(p, { x: 8.5, y: -10 }, { x: 16.5, y: -11 }, { x: 18.5, y: -21 }, tip, ORANGE, 3.2);
  p.circle(tip.x, tip.y, 1.9, CREAM);

  // legs first so the body covers their tops; far pair is darker
  const far = shade(ORANGE, -0.14);
  if (walk) {
    // mid-stride: diagonal pairs swing opposite ways, one near paw is lifted
    puppyLeg(p, { x: 8.8, y: -6.5 }, { x: 4.6, y: -1.6 }, far); // far back, reaching forward
    puppyLeg(p, { x: -1.2, y: -6.5 }, { x: 2.8, y: -1.6 }, far); // far front, pushing back
    puppyLeg(p, { x: 5.8, y: -6.5 }, { x: 11.4, y: -1.6 }, ORANGE); // near back, pushing back
    puppyLeg(p, { x: -4.6, y: -6.5 }, { x: -9.8, y: -3.8 }, ORANGE); // near front, lifted
  } else {
    puppyLeg(p, { x: 8.8, y: -6.5 }, { x: 8.8, y: -1.4 }, far);
    puppyLeg(p, { x: -1.2, y: -6.5 }, { x: -1.2, y: -1.4 }, far);
    puppyLeg(p, { x: 5.8, y: -6.5 }, { x: 5.8, y: -1.4 }, ORANGE);
    puppyLeg(p, { x: -4.6, y: -6.5 }, { x: -4.6, y: -1.4 }, ORANGE);
  }

  // fluffy round body with a cream chest and a puffy ruff at the front edge
  softEllipse(p, 1.5, -9.5, 9.5, 7.5, ORANGE);
  clipped(p, 1.5, -9.5, 9.5, 7.5, () => p.ellipse(-3.8, -5.6, 4.6, 4.4, CREAM, null));
  p.ellipse(1.5, -9.5, 9.5, 7.5, null, p.outline);
  for (const [x, y, r] of [
    [-7.2, -8.4, 1.5],
    [-6.4, -5.2, 1.6],
  ])
    p.circle(x, y, r, CREAM);

  puppyHead(p, -7.5, -19.5, walk ? 1.2 : 0);
  puppyCollar(p, { x: -10.6, y: -14.4 }, { x: -6.4, y: -11.4 }, { x: -2.4, y: -12.2 }, { x: 1.2, y: -16.4 }, { x: -5.4, y: -10.2 });
}

function puppySit(p: Pen): void {
  p.shadow(1, 0, 12, 4.5, 0.25);

  // tail up and wagging
  swoosh(p, { x: 7, y: -5 }, { x: 15, y: -6 }, { x: 17, y: -16 }, { x: 12, y: -23 }, ORANGE, 3.2);
  p.circle(12, -23, 1.9, CREAM);

  // upright body, haunch on the ground
  softEllipse(p, 0.5, -12.5, 7.6, 9.2, ORANGE);
  clipped(p, 0.5, -12.5, 7.6, 9.2, () => p.ellipse(-2.6, -9.6, 3.6, 6, CREAM, null));
  p.ellipse(0.5, -12.5, 7.6, 9.2, null, p.outline);
  for (const [x, y, r] of [
    [-6.9, -10.2, 1.6],
    [-6.2, -7, 1.8],
  ])
    p.circle(x, y, r, CREAM);
  softEllipse(p, 4.6, -4.4, 5.6, 4.2, ORANGE);

  // front legs in cream socks
  puppyLeg(p, { x: -0.9, y: -7 }, { x: -0.9, y: -1.5 }, shade(CREAM, -0.12));
  puppyLeg(p, { x: -4.2, y: -7 }, { x: -4.2, y: -1.5 }, CREAM);

  puppyHead(p, -6.8, -24.5, 0);
  puppyCollar(p, { x: -9.6, y: -17.8 }, { x: -5.5, y: -14.8 }, { x: -1.5, y: -15.4 }, { x: 2.2, y: -20.2 }, { x: -4.4, y: -13.6 });
}

function puppy(p: Pen, pose: 'stand' | 'walk' | 'sit'): void {
  local(p, () => {
    if (pose === 'sit') puppySit(p);
    else puppyStandOrWalk(p, pose === 'walk');
  });
}

// ---------------------------------------------------------------------------
// Kitten (calico)

/** Kitten head about its centre (hx, hy). `ear` lifts the ears; `asleep` swaps the eyes for closed arcs. */
function kittenHead(p: Pen, hx: number, hy: number, ear: number, asleep = false): void {
  const at = (dx: number, dy: number): P2 => ({ x: hx + dx, y: hy + dy });
  // ears
  p.poly([at(-8.4, -3), at(-8.8, -14 - ear), at(-1.6, -7.8)], CAT_WHITE);
  p.poly([at(-1.9, -8), at(2.8, -14.6 - ear), at(4.6, -4)], CAT_WHITE);
  p.poly([at(-7.2, -5), at(-7.4, -11.4 - ear), at(-4.2, -7)], PINK, null);
  p.poly([at(-2.6, -7.8), at(1.4, -11.8 - ear), at(2.8, -5)], PINK, null);

  softEllipse(p, hx, hy, 9, 8.6, CAT_WHITE);
  clipped(p, hx, hy, 9, 8.6, () => {
    p.ellipse(hx + 4.5, hy - 5, 4.2, 3.4, CAT_ORANGE, null);
    p.ellipse(hx - 6.4, hy - 6.2, 2.6, 2.2, CAT_BROWN, null);
    p.ellipse(hx + 6.8, hy + 2.8, 2.2, 2, CAT_ORANGE, null);
  });
  p.ellipse(hx, hy, 9, 8.6, null, p.outline);

  if (asleep) {
    p.curve(at(-5.2, -0.6), at(-3.6, 1.5), at(-2, -0.6), INK, 1);
    p.curve(at(1, -1), at(2.6, 1.1), at(4.2, -1), INK, 1);
  } else {
    eye(p, hx - 3.6, hy - 0.8, 2);
    eye(p, hx + 2.6, hy - 1.2, 1.9);
  }

  // tiny pink nose, w-shaped mouth, whiskers
  p.poly([at(-8.2, 3.2), at(-5.8, 3.2), at(-7, 5)], PINK, INK);
  p.curve(at(-7, 5.2), at(-7.9, 6.8), at(-9, 5), INK, 0.7);
  p.curve(at(-7, 5.2), at(-6.1, 6.8), at(-4.9, 5), INK, 0.7);
  p.line([at(-8, 3.5), at(-15.2, 2.4)], 'rgba(43,29,20,0.85)', 0.6);
  p.line([at(-8, 4.8), at(-15.2, 6)], 'rgba(43,29,20,0.85)', 0.6);

  blush(p, hx - 6, hy + 2.6, 0.9);
  blush(p, hx + 3.2, hy + 3.4, 0.8);
}

/** Blue bell collar with a gold bell. */
function kittenCollar(p: Pen): void {
  swoosh(p, { x: -11.6, y: -13.4 }, { x: -7.2, y: -10.8 }, { x: -3, y: -11.4 }, { x: 1.8, y: -15.2 }, BELL_BLUE, 2.4);
  p.circle(-6.6, -9.4, 1.7, GOLD);
  p.circle(-7.1, -9.9, 0.6, '#fff2b0', null);
}

function kittenLeg(p: Pen, top: P2, bottom: P2, color: string): void {
  limb(p, top, bottom, 3, color);
}

function kittenStandOrWalk(p: Pen, walk: boolean): void {
  p.shadow(0, 0, 12, 4.2, 0.25);

  // tail up with a curl and a dark tip
  const tip: P2 = walk ? { x: 12.5, y: -23.5 } : { x: 13, y: -22.5 };
  swoosh(p, { x: 8.5, y: -8 }, { x: 16, y: -7.5 }, { x: 18.5, y: -17 }, tip, CAT_ORANGE, 2.8);
  p.circle(tip.x, tip.y, 1.5, CAT_BROWN, null);

  const far = shade(CAT_WHITE, -0.12);
  if (walk) {
    kittenLeg(p, { x: 6.2, y: -5.5 }, { x: 8.8, y: -1.4 }, far); // far back, reaching forward
    kittenLeg(p, { x: -0.8, y: -5.5 }, { x: 1.4, y: -1.4 }, far); // far front, pushing back
    kittenLeg(p, { x: 5.6, y: -5.5 }, { x: 9.6, y: -1.4 }, CAT_ORANGE); // near back, pushing back
    kittenLeg(p, { x: -4, y: -5.5 }, { x: -7.2, y: -3 }, CAT_WHITE); // near front, lifted
  } else {
    kittenLeg(p, { x: 8.6, y: -5.5 }, { x: 8.6, y: -1.4 }, far);
    kittenLeg(p, { x: -0.8, y: -5.5 }, { x: -0.8, y: -1.4 }, far);
    kittenLeg(p, { x: 5.6, y: -5.5 }, { x: 5.6, y: -1.4 }, CAT_ORANGE);
    kittenLeg(p, { x: -4, y: -5.5 }, { x: -4, y: -1.4 }, CAT_WHITE);
  }

  softEllipse(p, 2, -9.5, 8.6, 6.4, CAT_WHITE);
  clipped(p, 2, -9.5, 8.6, 6.4, () => {
    p.ellipse(7, -12, 4, 3.2, CAT_ORANGE, null);
    p.ellipse(-1, -12.5, 2.6, 2.2, CAT_BROWN, null);
  });
  p.ellipse(2, -9.5, 8.6, 6.4, null, p.outline);

  kittenHead(p, -7.8, -19.5, walk ? 1 : 0);
  kittenCollar(p);
}

function kittenSleep(p: Pen): void {
  p.shadow(1, 0, 14, 4.8, 0.25);

  // tail tucked round the front
  swoosh(p, { x: 9, y: -2.6 }, { x: 6, y: 2.6 }, { x: -6, y: 2.4 }, { x: -12, y: -1.6 }, CAT_ORANGE, 2.5);

  // loaf body
  softEllipse(p, 3, -7, 10.4, 6.5, CAT_WHITE);
  clipped(p, 3, -7, 10.4, 6.5, () => {
    p.ellipse(8.5, -9.5, 4, 3, CAT_ORANGE, null);
    p.ellipse(0.5, -10.5, 2.6, 2.2, CAT_BROWN, null);
  });
  p.ellipse(3, -7, 10.4, 6.5, null, p.outline);

  // head curled down on the front paw
  kittenHead(p, -8, -11.5, -2, true);
  p.ellipse(-4.5, -1.2, 3.4, 1.9, CAT_WHITE);

  p.text('z', 5, -22, 6.5, ZZZ);
  p.text('z', 10, -28, 4.8, ZZZ);
}

function kitten(p: Pen, pose: 'stand' | 'walk' | 'sleep'): void {
  local(p, () => {
    if (pose === 'sleep') kittenSleep(p);
    else kittenStandOrWalk(p, pose === 'walk');
  });
}

// ---------------------------------------------------------------------------
// Exports

export const sprites: SpriteSpec[] = [
  pet('pet:dog_stand', (p) => puppy(p, 'stand')),
  pet('pet:dog_walk', (p) => puppy(p, 'walk')),
  pet('pet:dog_sit', (p) => puppy(p, 'sit')),
  pet('pet:cat_stand', (p) => kitten(p, 'stand')),
  pet('pet:cat_walk', (p) => kitten(p, 'walk')),
  pet('pet:cat_sleep', (p) => kitten(p, 'sleep')),
];

export const icons: IconSpec[] = [];
