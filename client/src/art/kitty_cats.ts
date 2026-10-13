// Kitty Corner cats and the farm's pet kitten, in a Neko Atsume style: soft
// rounded silhouettes (big head merging into a bean body), tiny triangle ears
// with pink insides, stubby legs, a fat tail, thin warm outlines, flat fills,
// and dot faces with a pink nose and a small omega mouth.
//
// One parametric painter (paintCat) draws every cat. A coat (see COATS) says
// what colours and markings it has, and a pose says how it sits, lies or walks.
// Cats are painted in local px with their ground centre at the origin, the same
// frame the farm pets use, so every sprite lines up on the footprint centre.

import { KITTY_LIST } from '@farm/shared';
import { ICON, type IconSpec, type Pen, type SpriteSpec, shade } from './kit';

const OUT = '#6e5548';
/** Outline thickness in device-independent px (stays the same at any cat size). */
const OUT_W = 0.9;
const INK = '#2b1d14';
const PINK = '#f2a0ab';
const GOLD = '#f5c542';
const RED = '#e2483d';
const ZZZ = '#8a7aa8';
const PUMPKIN = '#f08a24';
const PUMPKIN_DARK = '#c3661a';
const HAT_BLACK = '#34303a';
const TIARA_PINK = '#f7a8c0';

const CAT_H = 30;
const PET_H = 34;

export type CatPose = 'sit' | 'loaf' | 'sleep' | 'sleep1' | 'play' | 'play1' | 'walk' | 'walk1' | 'stand';

export interface Coat {
  /** Main fur colour. */
  fur: string;
  /** Chest, bib and chin. */
  belly?: string;
  /** Paws and socks (defaults to the points colour). */
  feet?: string;
  /** Tabby stripes or marble bands. */
  stripes?: string;
  /** Marble: wavy bands instead of tabby stripes. */
  swirl?: boolean;
  /** Organic blobs: [head over one ear and eye, back, side]. */
  patches?: string[];
  /** Big round blob with a sunk head, tiny legs and a short tail. */
  chonk?: boolean;
  /** Siamese points: ears, face mask, feet and tail. */
  points?: string;
  /** One very subtle shade on the lower right of the body. */
  shade?: string;
  /** Eye colour (dark coats use a light dot so the eyes read). */
  eye?: string;
  eyes?: 'dot' | 'gold';
  /** Torso bulk: 1 is a normal cat. */
  bulk?: number;
  /** Overall scale: 1 is a normal cat, about 22px tall. */
  size?: number;
  /** Puffy tail and ruff. */
  fluff?: boolean;
  hat?: 'tiara' | 'pirate';
  bandana?: boolean;
  /** Red collar with a gold bell. */
  bell?: boolean;
  /** Raised beckoning paw (sit only). */
  beckon?: boolean;
}

/** One coat per Kitty Corner cat, keyed by kitty id. */
export const COATS: Record<string, Coat> = {
  snowball: { fur: '#fbf8f2', shade: '#e6dfd3' },
  mochi: { fur: '#fff0d6', bulk: 1.14, shade: '#f0d7ae' },
  pepper: { fur: '#3e3638', belly: '#fbf8f2', feet: '#fbf8f2', eye: '#f6eedc' },
  ginger: { fur: '#eda25a', stripes: '#c0692c', shade: '#dd8c45' },
  smokey: { fur: '#a9a6ae', shade: '#928f98' },
  patches: { fur: '#fbf7ee', patches: ['#eda25a', '#3e3638', '#eda25a'] },
  socks: { fur: '#3e3638', feet: '#fbf8f2', eye: '#f6eedc' },
  marble: { fur: '#a29c97', stripes: '#5f5853', swirl: true, shade: '#8f8983' },
  biscuit: { fur: '#d9ae7c', belly: '#fff6ea' },
  noodle: { fur: '#f6ecd9', points: '#6d4431' },
  pudding: { fur: '#eda25a', belly: '#fff8ec', feet: '#fff8ec', bulk: 1.16, shade: '#dc8c45' },
  shadow: { fur: '#2e2829', eyes: 'gold', eye: GOLD },
  peaches: { fur: '#f5c79c', fluff: true, shade: '#e8b282' },
  bean: { fur: '#b5b1b9', belly: '#fbf8f2', feet: '#fbf8f2', size: 0.7 },
  big_chonk: { fur: '#f6f4f0', patches: ['#b3b0b8', '#b3b0b8'], bulk: 1.3, size: 1.6, chonk: true, shade: '#e4e0d9' },
  princess_pearl: { fur: '#fbf9f5', fluff: true, hat: 'tiara', shade: '#ebe6dc' },
  captain_mittens: { fur: '#eda25a', stripes: '#bd692d', hat: 'pirate' },
  lucky: { fur: '#fbf8f2', patches: ['#eda25a', '#3e3638', '#eda25a'], bell: true, beckon: true },
  boo: { fur: '#33292b', eye: '#f6eedc', bandana: true },
};

/** The farm's pet kitten: orange with a white bib and paws. */
export const PET_KITTEN: Coat = { fur: '#f0a24e', belly: '#fff8ec', feet: '#fff8ec', shade: '#dd8e42', size: 0.86 };

// ---------------------------------------------------------------------------
// Shapes. Each Part is either a filled shape or, with `w`, a stroked limb.

interface Pt {
  x: number;
  y: number;
}

interface Head {
  x: number;
  y: number;
  r: number;
}

interface Ell {
  x: number;
  y: number;
  rx: number;
  ry: number;
}

interface Part {
  path: Path2D;
  w?: number;
}

interface Geo {
  /** Ground shadow radii, or null for portraits. */
  shadow: [number, number] | null;
  /** Drawn first, behind the body (far legs, a tail on the ground). */
  back?: { parts: Part[]; fill: string };
  /** The fur silhouette: head, ears, torso, limbs, paws. */
  body: Part[];
  /** Drawn over the body last, in the same fur (a tail wrapped round the front). */
  front?: Part[];
  head: Head;
  torso: Ell;
  belly: Ell[];
  feet: Ell[];
  bands: Path2D[];
  /** Tail stroke, so siamese points can colour it. */
  tail?: Part;
  closed?: boolean;
  look?: number;
  decor?: (p: Pen) => void;
}

function ellPath(x: number, y: number, rx: number, ry: number): Path2D {
  const path = new Path2D();
  path.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), 0, 0, Math.PI * 2);
  return path;
}

function ell(x: number, y: number, rx: number, ry = rx): Part {
  return { path: ellPath(x, y, rx, ry) };
}

function poly(pts: Pt[]): Part {
  const path = new Path2D();
  path.moveTo(pts[0].x, pts[0].y);
  for (const q of pts.slice(1)) path.lineTo(q.x, q.y);
  path.closePath();
  return { path };
}

function limb(a: Pt, b: Pt, w: number): Part {
  const path = new Path2D();
  path.moveTo(a.x, a.y);
  path.lineTo(b.x, b.y);
  return { path, w };
}

function curvy(a: Pt, c1: Pt, c2: Pt, b: Pt, w: number): Part {
  const path = new Path2D();
  path.moveTo(a.x, a.y);
  path.bezierCurveTo(c1.x, c1.y, c2.x, c2.y, b.x, b.y);
  return { path, w };
}

function headR(c: Coat, base = 6.1): number {
  return base * (1 + ((c.bulk ?? 1) - 1) * 0.4);
}

/** Two triangle ears, left then right, as outer outlines. */
function earShapes(h: Head): Pt[][] {
  const { x, y, r } = h;
  const left = [
    { x: x - 0.98 * r, y: y - 0.12 * r },
    { x: x - 0.86 * r, y: y - 1.52 * r },
    { x: x - 0.1 * r, y: y - 0.86 * r },
  ];
  const right = left.map((q) => ({ x: 2 * x - q.x, y: q.y }));
  return [left, right];
}

function innerEar(pts: Pt[]): Pt[] {
  const cx = (pts[0].x + pts[1].x + pts[2].x) / 3;
  const cy = (pts[0].y + pts[1].y + pts[2].y) / 3;
  return pts.map((q) => ({ x: cx + (q.x - cx) * 0.5, y: cy + (q.y - cy) * 0.55 }));
}

function headParts(h: Head): Part[] {
  const [l, r] = earShapes(h);
  return [ell(h.x, h.y, h.r, h.r * 0.94), poly(l), poly(r)];
}

/** Stripe bands down a torso, one per x offset (in units of rx). */
function bands(t: Ell, xs: number[], swirl: boolean): Path2D[] {
  return xs.map((xo) => {
    const dir = xo < 0 ? -1 : 1;
    const x = t.x + xo * t.rx;
    const path = new Path2D();
    path.moveTo(x, t.y - 0.95 * t.ry);
    if (swirl) {
      path.bezierCurveTo(x + 2.2 * dir, t.y - 0.3 * t.ry, x - 2.2 * dir, t.y + 0.3 * t.ry, x, t.y + 0.9 * t.ry);
    } else {
      path.quadraticCurveTo(x + 1.4 * dir, t.y, x + 0.5 * dir, t.y + 0.8 * t.ry);
    }
    return path;
  });
}

/** Little forehead ticks (tabby) or one swirl across the brow (marble). */
function headBands(h: Head, swirl: boolean): Path2D[] {
  const k = h.r / 6.1;
  if (swirl) {
    const a = new Path2D();
    a.moveTo(h.x - 1.1 * h.r, h.y - 0.25 * h.r);
    a.quadraticCurveTo(h.x, h.y - 1.0 * h.r, h.x + 1.1 * h.r, h.y - 0.25 * h.r);
    return [a];
  }
  const out: Path2D[] = [];
  for (const xo of [-1.7, 0, 1.7]) {
    const t = new Path2D();
    t.moveTo(h.x + xo * k, h.y - 0.98 * h.r);
    t.lineTo(h.x + xo * k * 0.8, h.y - 0.5 * h.r);
    out.push(t);
  }
  for (const sx of [-1, 1]) {
    const t = new Path2D();
    t.moveTo(h.x + sx * 0.96 * h.r, h.y - 0.05 * h.r);
    t.lineTo(h.x + sx * 0.66 * h.r, h.y + 0.25 * h.r);
    out.push(t);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Poses. Each returns the geometry for one frame of one cat.

function geoSit(c: Coat): Geo {
  const b = c.bulk ?? 1;
  const head: Head = { x: 0, y: -13.2, r: headR(c) };
  const torso: Ell = { x: 0, y: -5.4, rx: 6.3 * b, ry: 5.5 * Math.sqrt(b) };
  const tx = torso.rx;
  const tail = curvy({ x: tx * 0.82, y: -2.4 }, { x: tx + 4.2, y: -2.6 }, { x: tx + 4.8, y: -8.4 }, { x: tx + 1.4, y: -9.8 }, c.fluff ? 3.4 : 2.4);
  const body: Part[] = [ell(torso.x, torso.y, torso.rx, torso.ry), tail, ...headParts(head)];
  if (c.beckon) body.push(limb({ x: -tx * 0.7, y: -6.6 }, { x: -8.4, y: -12.4 }, 2.5), ell(-8.6, -13.0, 1.9));
  return {
    shadow: [7.6, 2.4],
    body,
    head,
    torso,
    belly: [
      { x: 0, y: torso.y + 1.2, rx: torso.rx * 0.6, ry: torso.ry * 0.78 },
      { x: head.x, y: head.y + 0.56 * head.r, rx: 0.52 * head.r, ry: 0.32 * head.r },
    ],
    feet: [
      { x: -2.7, y: -0.8, rx: 2.4, ry: 1.5 },
      { x: 2.7, y: -0.8, rx: 2.4, ry: 1.5 },
    ],
    bands: bands(torso, [-0.62, 0.62], !!c.swirl),
    tail,
  };
}

function geoLoaf(c: Coat): Geo {
  const b = c.bulk ?? 1;
  const head: Head = { x: 0, y: -11, r: headR(c, 5.7) };
  const torso: Ell = { x: 0, y: -4.4, rx: 8.4 * b, ry: 4.9 * Math.sqrt(b) };
  const tail = curvy({ x: torso.rx * 0.8, y: -1.6 }, { x: torso.rx + 2.8, y: -1.8 }, { x: torso.rx + 2.6, y: -6.4 }, { x: torso.rx + 0.2, y: -6.8 }, c.fluff ? 3.2 : 2.4);
  return {
    shadow: [9.4, 2.8],
    body: [ell(torso.x, torso.y, torso.rx, torso.ry), tail, ...headParts(head)],
    head,
    torso,
    belly: [
      { x: 0, y: torso.y + 2.6, rx: torso.rx * 0.5, ry: 2.1 },
      { x: head.x, y: head.y + 0.56 * head.r, rx: 0.52 * head.r, ry: 0.32 * head.r },
    ],
    feet: [],
    bands: bands(torso, [-0.55, 0, 0.55], !!c.swirl),
    tail,
  };
}

function geoSleep(c: Coat, breathe: boolean): Geo {
  const b = c.bulk ?? 1;
  const g = breathe ? 1.05 : 1;
  const head: Head = { x: -4.5, y: -7.6, r: headR(c, 5.0) };
  const torso: Ell = { x: 0.6, y: -4.3, rx: 8.4 * b * g, ry: 4.6 * g };
  const wrap = curvy({ x: -6.6, y: -0.6 }, { x: -4.0, y: 1.6 }, { x: 4.6, y: 1.8 }, { x: 8.6, y: -1.8 }, c.fluff ? 3.2 : 2.6);
  return {
    shadow: [9.6, 2.9],
    body: [ell(torso.x, torso.y, torso.rx, torso.ry), ...headParts(head)],
    front: [wrap],
    head,
    torso,
    belly: [],
    feet: [{ x: -4.2, y: -0.6, rx: 2.5, ry: 1.4 }],
    bands: bands(torso, [-0.5, 0.2, 0.75], !!c.swirl),
    closed: true,
    decor: breathe
      ? (p) => {
          p.text('z', 9.5, -17, 4.8, ZZZ);
          p.text('z', 13.5, -22.5, 3.6, ZZZ);
        }
      : undefined,
  };
}

/** On its back, paws in the air. Alt: batting a pink yarn ball with one paw. */
function geoPlay(c: Coat, alt: boolean): Geo {
  const b = c.bulk ?? 1;
  const head: Head = { x: 7.2, y: -6.2, r: headR(c, 5.4) };
  const torso: Ell = { x: 0, y: -3.6, rx: 8 * b, ry: 3.8 };
  const tail = alt
    ? curvy({ x: 5.6, y: -0.4 }, { x: 8.4, y: 1.6 }, { x: 11.4, y: 1.0 }, { x: 12.4, y: -2.2 }, c.fluff ? 3.2 : 2.4)
    : curvy({ x: -7.4, y: -1.6 }, { x: -11.8, y: -1.8 }, { x: -12.4, y: -6.4 }, { x: -9.8, y: -7.4 }, c.fluff ? 3.2 : 2.6);
  // short stubby legs, each ending in a round bean paw
  const legs: Part[] = alt
    ? [limb({ x: -4.8, y: -4 }, { x: -8.4, y: -5.8 }, 2.4)]
    : [limb({ x: -5.2, y: -4.2 }, { x: -6.4, y: -7.4 }, 2.3), limb({ x: -1.6, y: -4.6 }, { x: -1.2, y: -7.8 }, 2.3)];
  const paws: Ell[] = alt
    ? [
        { x: -9, y: -6.2, rx: 1.7, ry: 1.4 },
        { x: -1.8, y: -0.6, rx: 1.8, ry: 1.1 },
        { x: 3.8, y: -0.5, rx: 1.8, ry: 1.1 },
      ]
    : [
        { x: -6.4, y: -8.4, rx: 1.7, ry: 1.5 },
        { x: -1.2, y: -8.8, rx: 1.7, ry: 1.5 },
        { x: 3.8, y: -0.5, rx: 1.8, ry: 1.1 },
        { x: -4.6, y: -0.3, rx: 1.8, ry: 1.1 },
      ];
  const yarn = (p: Pen): void => {
    p.circle(-12.2, -4.2, 2.1, '#f4a6b8', OUT);
    p.curve({ x: -13.8, y: -5.6 }, { x: -12, y: -3.2 }, { x: -10.6, y: -4.8 }, '#d9708a', 0.5);
    p.curve({ x: -13.4, y: -2.4 }, { x: -12.4, y: -4.8 }, { x: -11.2, y: -2.2 }, '#d9708a', 0.5);
  };
  return {
    shadow: [10, 3],
    back: { parts: [tail], fill: c.fur },
    body: [ell(torso.x, torso.y, torso.rx, torso.ry), ...legs, ...headParts(head)],
    head,
    torso,
    belly: [{ x: 0.2, y: -1.6, rx: 6 * b, ry: 1.9 }],
    feet: paws,
    bands: bands(torso, [-0.4, 0.4], !!c.swirl),
    look: -0.4,
    decor: alt ? yarn : undefined,
  };
}

/** Trotting to the left, side view, with a tail up. Phase 1 swaps the legs. */
function geoWalk(c: Coat, phase: 0 | 1): Geo {
  const b = c.bulk ?? 1;
  const head: Head = { x: -7.6, y: -12.6, r: headR(c, 5.6) };
  const torso: Ell = { x: 0.8, y: -8.6, rx: 7.2 * b, ry: 4.8 * Math.sqrt(b) };
  const far = shade(c.fur, -0.14);
  // [near front, near back, far front, far back] as [top, paw] pairs
  const legs =
    phase === 0
      ? [
          [{ x: -4.4, y: -5.2 }, { x: -7.6, y: -2.6 }],
          [{ x: 4.6, y: -5.2 }, { x: 7, y: -0.8 }],
          [{ x: -1.4, y: -5.2 }, { x: -1.6, y: -0.8 }],
          [{ x: 1.6, y: -5.2 }, { x: 0.2, y: -2.6 }],
        ]
      : [
          [{ x: -4.4, y: -5.2 }, { x: -2.6, y: -0.8 }],
          [{ x: 4.6, y: -5.2 }, { x: 2.4, y: -2.6 }],
          [{ x: -1.4, y: -5.2 }, { x: -4.6, y: -2.6 }],
          [{ x: 1.6, y: -5.2 }, { x: 4.2, y: -0.8 }],
        ];
  const tail = curvy({ x: 6.8, y: -10.6 }, { x: 10.2, y: -11.2 }, { x: 11.2, y: -16.2 }, { x: phase ? 9.2 : 8.4, y: -20.4 }, c.fluff ? 3.2 : 2.3);
  const near = [limb(legs[0][0], legs[0][1], 2.6), limb(legs[1][0], legs[1][1], 2.6)];
  return {
    shadow: [9.4, 2.6],
    back: { parts: [limb(legs[2][0], legs[2][1], 2.4), limb(legs[3][0], legs[3][1], 2.4)], fill: far },
    body: [ell(torso.x, torso.y, torso.rx, torso.ry), tail, ...near, ...headParts(head)],
    head,
    torso,
    belly: [{ x: 0.8, y: -5.6, rx: torso.rx * 0.75, ry: 1.8 }],
    feet: [legs[0][1], legs[1][1]].map((q) => ({ x: q.x, y: q.y, rx: 1.7, ry: 1.4 })),
    bands: bands(torso, [-0.5, 0.05, 0.6], !!c.swirl),
    tail,
  };
}

/** Standing square on four stubby legs (pets only). */
function geoStand(c: Coat): Geo {
  const b = c.bulk ?? 1;
  const head: Head = { x: 0, y: -13.8, r: headR(c, 5.8) };
  const torso: Ell = { x: 0, y: -7.2, rx: 5.8 * b, ry: 5 * Math.sqrt(b) };
  const tail = curvy({ x: 4.6, y: -4.6 }, { x: 8.4, y: -5 }, { x: 9.6, y: -11.2 }, { x: 7.8, y: -15.2 }, c.fluff ? 3 : 2.2);
  return {
    shadow: [6.6, 2.2],
    body: [
      ell(torso.x, torso.y, torso.rx, torso.ry),
      limb({ x: -2.6, y: -4.6 }, { x: -2.8, y: -0.8 }, 2.5),
      limb({ x: 2.6, y: -4.6 }, { x: 2.8, y: -0.8 }, 2.5),
      tail,
      ...headParts(head),
    ],
    head,
    torso,
    belly: [
      { x: 0, y: -6.4, rx: 3.4, ry: 4 },
      { x: head.x, y: head.y + 0.56 * head.r, rx: 0.52 * head.r, ry: 0.32 * head.r },
    ],
    feet: [
      { x: -2.8, y: -0.5, rx: 1.9, ry: 1.3 },
      { x: 2.8, y: -0.5, rx: 1.9, ry: 1.3 },
    ],
    bands: [],
    tail,
  };
}

/** big_chonk: a round mochi blob with the head sunk into it, tiny legs and a short tail. */
function geoChonk(c: Coat, loaf: boolean): Geo {
  const torso: Ell = loaf ? { x: 0, y: -4.6, rx: 12.6, ry: 6.2 } : { x: 0, y: -6.6, rx: 10.8, ry: 7.6 };
  const head: Head = { x: 0, y: loaf ? -10.8 : -11.6, r: 5.4 };
  const tail = curvy({ x: torso.rx * 0.9, y: -2 }, { x: torso.rx + 3, y: -2.4 }, { x: torso.rx + 3.4, y: -6.4 }, { x: torso.rx + 1.2, y: -7 }, 2.6);
  return {
    shadow: loaf ? [13.5, 3.8] : [12.5, 3.6],
    body: [ell(torso.x, torso.y, torso.rx, torso.ry), tail, ...headParts(head)],
    head,
    torso,
    belly: [
      { x: 0, y: torso.y + 1.6, rx: torso.rx * 0.5, ry: torso.ry * 0.75 },
      { x: head.x, y: head.y + 0.56 * head.r, rx: 0.52 * head.r, ry: 0.32 * head.r },
    ],
    feet: loaf ? [] : [{ x: -4.8, y: 0.4, rx: 2, ry: 1.1 }, { x: 4.8, y: 0.4, rx: 2, ry: 1.1 }],
    bands: [],
    tail,
  };
}

/** Icon head and shoulders: a big round face with ears near the top, a hint of shoulders below. */
function geoPortrait(c: Coat): Geo {
  const b = c.bulk ?? 1;
  const head: Head = { x: 0, y: 0, r: 6.1 };
  const torso: Ell = { x: 0, y: 9.4, rx: 6.4 * b, ry: 5.4 };
  return {
    shadow: null,
    body: [ell(torso.x, torso.y, torso.rx, torso.ry), ...headParts(head)],
    head,
    torso,
    belly: [
      { x: 0, y: 7, rx: 3.6, ry: 3.6 },
      { x: head.x, y: head.y + 0.56 * head.r, rx: 0.52 * head.r, ry: 0.32 * head.r },
    ],
    feet: [],
    bands: bands(torso, [-0.55, 0.55], !!c.swirl),
  };
}

function geometry(c: Coat, pose: CatPose): Geo {
  switch (pose) {
    case 'sit':
      return c.chonk ? geoChonk(c, false) : geoSit(c);
    case 'loaf':
      return c.chonk ? geoChonk(c, true) : geoLoaf(c);
    case 'sleep':
      return geoSleep(c, false);
    case 'sleep1':
      return geoSleep(c, true);
    case 'play':
      return geoPlay(c, false);
    case 'play1':
      return geoPlay(c, true);
    case 'walk':
      return geoWalk(c, 0);
    case 'walk1':
      return geoWalk(c, 1);
    case 'stand':
      return geoStand(c);
  }
}

// ---------------------------------------------------------------------------
// The painter

/** Fill a silhouette: every part in outline colour (slightly fatter), then in fur. Overlaps merge into one shape. */
function layer(ctx: CanvasRenderingContext2D, parts: Part[], fill: string, lw: number): void {
  ctx.fillStyle = OUT;
  ctx.strokeStyle = OUT;
  for (const part of parts) {
    if (part.w) {
      ctx.lineWidth = part.w + lw * 2;
      ctx.stroke(part.path);
    } else {
      ctx.fill(part.path);
      ctx.lineWidth = lw * 2;
      ctx.stroke(part.path);
    }
  }
  ctx.fillStyle = fill;
  ctx.strokeStyle = fill;
  for (const part of parts) {
    if (part.w) {
      ctx.lineWidth = part.w;
      ctx.stroke(part.path);
    } else {
      ctx.fill(part.path);
    }
  }
}

/** An organic blob: seven jittered points joined through their midpoints. */
function blobPath(cx: number, cy: number, rx: number, ry: number, seed: number): Path2D {
  const n = 7;
  const pts: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const j = 0.78 + 0.4 * (Math.abs(Math.sin((i + 1) * 12.9898 + seed * 78.233)) % 1);
    pts.push({ x: cx + Math.cos(a) * rx * j, y: cy + Math.sin(a) * ry * j });
  }
  const mid = (a: Pt, b: Pt): Pt => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
  const path = new Path2D();
  const start = mid(pts[n - 1], pts[0]);
  path.moveTo(start.x, start.y);
  for (let i = 0; i < n; i++) {
    const m = mid(pts[i], pts[(i + 1) % n]);
    path.quadraticCurveTo(pts[i].x, pts[i].y, m.x, m.y);
  }
  path.closePath();
  return path;
}

function fillPts(ctx: CanvasRenderingContext2D, pts: Pt[]): void {
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (const q of pts.slice(1)) ctx.lineTo(q.x, q.y);
  ctx.closePath();
  ctx.fill();
}

function face(p: Pen, c: Coat, h: Head, closed: boolean, look: number, ink: string): void {
  const ctx = p.ctx;
  const k = h.r / 6.1;
  const ey = h.y + 0.5 * k;
  for (const sx of [-1, 1]) {
    const ex = h.x + sx * 2.5 * k + look;
    if (closed) {
      ctx.beginPath();
      ctx.moveTo(ex - 1.1 * k, ey - 0.2 * k);
      ctx.quadraticCurveTo(ex, ey + 1.2 * k, ex + 1.1 * k, ey - 0.2 * k);
      ctx.strokeStyle = ink;
      ctx.lineWidth = 0.8;
      ctx.stroke();
    } else if (c.eyes === 'gold') {
      p.circle(ex, ey, 1.3 * k, GOLD, ink);
      p.ellipse(ex, ey, 0.32 * k, 0.9 * k, INK, null);
    } else {
      p.circle(ex, ey, 0.95 * k, ink, null);
    }
  }
  const nx = h.x;
  const ny = h.y + 2.2 * k;
  p.ellipse(nx, ny, 1.0 * k, 0.72 * k, PINK, null);
  ctx.beginPath();
  for (const sx of [-1, 1]) {
    ctx.moveTo(nx, ny + 0.6 * k);
    ctx.quadraticCurveTo(nx + sx * 0.9 * k, ny + 2.3 * k, nx + sx * 1.8 * k, ny + 0.8 * k);
  }
  ctx.strokeStyle = ink;
  ctx.lineWidth = 0.6;
  ctx.stroke();
}

function extras(p: Pen, c: Coat, h: Head, lw: number): void {
  const k = h.r / 6.1;
  if (c.hat === 'tiara') {
    const top = h.y - 0.92 * h.r;
    p.poly(
      [
        { x: h.x - 2.4 * k, y: top },
        { x: h.x + 2.4 * k, y: top },
        { x: h.x + 2.4 * k, y: top + 1.2 * k },
        { x: h.x - 2.4 * k, y: top + 1.2 * k },
      ],
      GOLD,
      OUT,
      lw,
    );
    for (const xo of [-1.6, 0, 1.6]) {
      const x = h.x + xo * k;
      p.poly(
        [
          { x: x - 0.7 * k, y: top },
          { x, y: top - 1.9 * k },
          { x: x + 0.7 * k, y: top },
        ],
        GOLD,
        OUT,
        lw,
      );
    }
    p.circle(h.x, top + 0.6 * k, 0.6 * k, TIARA_PINK, null);
  }
  if (c.hat === 'pirate') {
    p.poly(
      [
        { x: h.x - 5.8 * k, y: h.y - 2.4 * k },
        { x: h.x - 4.2 * k, y: h.y - 5.4 * k },
        { x: h.x - 1.6 * k, y: h.y - 6.9 * k },
        { x: h.x + 1.6 * k, y: h.y - 6.9 * k },
        { x: h.x + 4.2 * k, y: h.y - 5.4 * k },
        { x: h.x + 5.8 * k, y: h.y - 2.4 * k },
        { x: h.x, y: h.y - 1.6 * k },
      ],
      HAT_BLACK,
      OUT,
      lw,
    );
    p.line(
      [
        { x: h.x - 4.4 * k, y: h.y - 3.2 * k },
        { x: h.x + 4.4 * k, y: h.y - 3.2 * k },
      ],
      GOLD,
      0.8 * k,
    );
    p.circle(h.x, h.y - 4.6 * k, 0.8 * k, '#fffdf8', null);
  }
  if (c.bandana) {
    p.poly(
      [
        { x: h.x - 5.4 * k, y: h.y + 4.8 * k },
        { x: h.x + 5.4 * k, y: h.y + 4.8 * k },
        { x: h.x, y: h.y + 11.6 * k },
      ],
      PUMPKIN,
      OUT,
      lw,
    );
    for (const sx of [-1, 1]) p.line([{ x: h.x + sx * 2.6 * k, y: h.y + 6.4 * k }, { x: h.x + sx * 1.4 * k, y: h.y + 9.4 * k }], PUMPKIN_DARK, 0.6);
  }
  if (c.bell) {
    p.curve({ x: h.x - 5.4 * k, y: h.y + 4.6 * k }, { x: h.x, y: h.y + 7.4 * k }, { x: h.x + 5.4 * k, y: h.y + 4.6 * k }, RED, 1.9 * k);
    p.circle(h.x, h.y + 8.6 * k, 1.4 * k, GOLD, OUT);
  }
}

function drawGeo(p: Pen, c: Coat, g: Geo, s: number, withShadow: boolean): void {
  const ctx = p.ctx;
  const lw = OUT_W / s;
  p.lineWidth = lw;
  const ink = c.eye ?? INK;
  const feet = c.feet ?? c.points;
  const body = [...g.body, ...g.feet.map((e) => ell(e.x, e.y, e.rx, e.ry))];
  const fillParts = body.filter((q) => !q.w);
  const union = new Path2D();
  for (const q of fillParts) union.addPath(q.path);
  const torsoPath = ellPath(g.torso.x, g.torso.y, g.torso.rx, g.torso.ry);

  if (withShadow && g.shadow) p.shadow(0, 0.6, g.shadow[0], g.shadow[1], 0.22);
  if (g.back) layer(ctx, g.back.parts, g.back.fill, lw);
  layer(ctx, body, c.fur, lw);

  if (c.shade) {
    // lit from the top left: the lower right edge of the torso stays in the shade colour
    ctx.save();
    ctx.clip(torsoPath);
    ctx.fillStyle = c.shade;
    ctx.fill(torsoPath);
    ctx.translate(-0.8, -1);
    ctx.fillStyle = c.fur;
    ctx.fill(torsoPath);
    ctx.restore();
  }

  ctx.save();
  ctx.clip(union);
  if (c.patches) {
    const h = g.head;
    const t = g.torso;
    ctx.fillStyle = c.patches[0];
    ctx.fill(blobPath(h.x - 0.7 * h.r, h.y - 0.6 * h.r, 0.62 * h.r, 0.7 * h.r, 1));
    ctx.fillStyle = c.patches[1];
    ctx.fill(blobPath(t.x + 0.25 * t.rx, t.y - 0.5 * t.ry, 0.5 * t.rx, 0.5 * t.ry, 2));
    if (c.patches[2]) {
      ctx.fillStyle = c.patches[2];
      ctx.fill(blobPath(t.x - 0.72 * t.rx, t.y + 0.3 * t.ry, 0.34 * t.rx, 0.5 * t.ry, 3));
    }
  }
  if (c.stripes) {
    ctx.strokeStyle = c.stripes;
    ctx.lineWidth = c.swirl ? 1.3 : 0.95;
    ctx.lineCap = 'round';
    for (const path of [...g.bands, ...headBands(g.head, !!c.swirl)]) ctx.stroke(path);
  }
  if (c.belly) {
    ctx.fillStyle = c.belly;
    for (const e of g.belly) ctx.fill(ellPath(e.x, e.y, e.rx, e.ry));
  }
  if (feet) {
    ctx.fillStyle = feet;
    for (const e of g.feet) ctx.fill(ellPath(e.x, e.y, e.rx, e.ry));
  }
  if (c.points) {
    ctx.fillStyle = c.points;
    for (const ear of earShapes(g.head)) fillPts(ctx, ear);
    const h = g.head;
    const k = h.r / 6.1;
    ctx.fill(ellPath(h.x, h.y + 3.7 * k, 3 * k, 2 * k));
  }
  ctx.restore();

  if (c.points && g.tail) {
    ctx.strokeStyle = c.points;
    ctx.lineWidth = g.tail.w ?? 2.4;
    ctx.stroke(g.tail.path);
  }
  if (g.front) layer(ctx, g.front, c.fur, lw);

  // inner ears
  ctx.fillStyle = PINK;
  for (const ear of earShapes(g.head)) fillPts(ctx, innerEar(ear));

  extras(p, c, g.head, lw);
  face(p, c, g.head, !!g.closed, g.look ?? 0, ink);
  g.decor?.(p);
}

/** Paint one cat frame. Every cat and the farm kitten go through here. */
export function paintCat(p: Pen, coat: Coat, pose: CatPose): void {
  const s = coat.size ?? 1;
  const at = p.center;
  p.save();
  p.ctx.translate(at.x, at.y);
  p.ctx.scale(s, s);
  drawGeo(p, coat, geometry(coat, pose), s, true);
  p.restore();
}

/** Collection-book portrait: the head fills about three quarters of the icon, transparent background. */
function paintPortrait(p: Pen, coat: Coat): void {
  p.save();
  p.ctx.beginPath();
  p.ctx.rect(0, 0, ICON, ICON);
  p.ctx.clip();
  p.ctx.translate(ICON / 2, 24.6);
  p.ctx.scale(2.45, 2.45);
  drawGeo(p, coat, geoPortrait(coat), 2.45, false);
  p.restore();
}

// ---------------------------------------------------------------------------
// Exports

const FRAMES: [string, CatPose][] = [
  ['sit', 'sit'],
  ['loaf', 'loaf'],
  ['sleep', 'sleep'],
  ['sleep#1', 'sleep1'],
  ['play', 'play'],
  ['play#1', 'play1'],
  ['walk', 'walk'],
  ['walk#1', 'walk1'],
];

function sprite(key: string, h: number, paint: (p: Pen) => void): SpriteSpec {
  return { key, fw: 1, fh: 1, height: h, paint };
}

export const sprites: SpriteSpec[] = [
  ...KITTY_LIST.flatMap((k) => {
    const coat = COATS[k.id];
    if (!coat) return [];
    return FRAMES.map(([frame, pose]) => sprite(`cat:${k.id}:${frame}`, CAT_H, (p) => paintCat(p, coat, pose)));
  }),
  sprite('pet:cat_stand', PET_H, (p) => paintCat(p, PET_KITTEN, 'stand')),
  sprite('pet:cat_walk', PET_H, (p) => paintCat(p, PET_KITTEN, 'walk')),
  sprite('pet:cat_sleep', PET_H, (p) => paintCat(p, PET_KITTEN, 'sleep')),
];

export const icons: IconSpec[] = KITTY_LIST.flatMap((k) => {
  const coat = COATS[k.id];
  if (!coat) return [];
  return [{ key: `icon:cat_${k.id}`, paint: (p: Pen) => paintPortrait(p, coat) }];
});
