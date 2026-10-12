// Crop mastery: one wooden Mastery Sign per crop, planted in a tuft of grass on
// a 1x1 footprint. The cream board shows a simple, colour-coded drawing of the
// crop, three gold stars arch above it, and a gold rosette is pinned to the
// post. The tab icon is a gold rosette with pink ribbon tails and a smiling star.
import { CROP_LIST, type CropDef } from '@farm/shared';
import { type IconSpec, type Pen, type Pt, type SpriteSpec, OUTLINE, shade } from './kit';

const O = OUTLINE;

const CREAM = '#fff4e4';
const WOOD = '#c98b53';
const WOOD_L = '#f2c58f';
const GRASS = '#9ed87a';
const GRASS_D = '#5aa04a';
const GOLD = '#f4c24a';
const GOLD_L = '#ffe27a';
const PALE_GOLD = '#fff6c9';
const PINK = '#ff8cbc';
const PINK_D = '#e77fa6';
const PINK_L = '#ffb3cf';
const SEED = '#3b2417';
const WHITE = '#fffdf7';
const GLINT = 'rgba(255,255,255,0.7)';

/** Headroom above the footprint. The board's top sits at HEAD, the footprint centre 16px below it. */
const HEAD = 64;
const GROUND = HEAD + 16;
/** Horizontal centre of the sign, and the centre of the board's face. */
const CX = 32;
const CY = 39.5;

// ---------------------------------------------------------------------------
// Per-crop produce: what the board draws and in which colours

type Kind =
  | 'round'
  | 'drop'
  | 'carrot'
  | 'tuber'
  | 'cob'
  | 'cluster'
  | 'grapes'
  | 'pumpkin'
  | 'flower'
  | 'rose'
  | 'cotton'
  | 'stalk'
  | 'spike'
  | 'wedge'
  | 'candy'
  | 'swirl'
  | 'bean'
  | 'bowl'
  | 'leafy'
  | 'clover'
  | 'pineapple'
  | 'squash'
  | 'radish';

interface Produce {
  kind: Kind;
  /** The produce's main colour. */
  main: string;
  /** Leaves, stems and calyxes. */
  leaf: string;
  /** Detail colour: seeds, stripes, centres, highlights. */
  alt: string;
  /** A variant of the kind, such as a starred melon or a ghost pumpkin. */
  v?: string;
}

const PRODUCE: Record<string, Produce> = {
  strawberry: { kind: 'drop', main: '#e8344a', leaf: '#3f9b3a', alt: '#f7e36b' },
  wheat: { kind: 'stalk', main: '#e9c35a', leaf: '#8fbf4a', alt: '#c99a2e' },
  carrot: { kind: 'carrot', main: '#f08a24', leaf: '#4caf50', alt: '#c9641a' },
  tomato: { kind: 'round', main: '#e5432f', leaf: '#3d8b37', alt: '#ffb3a3' },
  potato: { kind: 'tuber', main: '#c79b5b', leaf: '#5aa04a', alt: '#8f5f30' },
  corn: { kind: 'cob', main: '#f6d443', leaf: '#6cb33f', alt: '#e0a92a' },
  blueberry: { kind: 'cluster', main: '#4a62c9', leaf: '#3b7d3b', alt: '#b9c8ff' },
  pumpkin: { kind: 'pumpkin', main: '#f28c1e', leaf: '#4f8f2f', alt: '#c75f10' },
  sunflower: { kind: 'flower', main: '#ffcf2e', leaf: '#4f9a3c', alt: '#6b4422' },
  cotton: { kind: 'cotton', main: '#fbfbf4', leaf: '#5b8f46', alt: '#c9c2dc' },
  grape: { kind: 'grapes', main: '#8a3fb0', leaf: '#4c8a33', alt: '#d6b3ef' },
  rice: { kind: 'stalk', v: 'rice', main: '#efe7b4', leaf: '#4a8f3a', alt: '#7cc261' },
  coffee: { kind: 'bean', main: '#8a5235', leaf: '#2f7a3a', alt: '#3b2417' },
  lavender: { kind: 'spike', main: '#9c7fe0', leaf: '#6f9a5a', alt: '#d9ccff' },
  watermelon: { kind: 'wedge', main: '#e9445c', leaf: '#2f9e44', alt: '#3f8a35' },
  cranberry: { kind: 'cluster', v: 'oval', main: '#c2183c', leaf: '#3e7a3a', alt: '#ffa3b5' },
  candy_corn: { kind: 'candy', main: '#ffb02e', leaf: '#5f9e3a', alt: '#fff4d6' },
  ghost_pumpkin: { kind: 'pumpkin', v: 'ghost', main: '#f4f1ea', leaf: '#4f8f2f', alt: '#8a7fb8' },
  peppermint: { kind: 'swirl', main: '#e5383b', leaf: '#3f9b5a', alt: '#ffffff' },
  golden_grape: { kind: 'grapes', main: '#ffd23f', leaf: '#4c8a33', alt: '#fff3a6' },
  bok_choy: { kind: 'leafy', main: '#f1fae5', leaf: '#6cbf5a', alt: '#3a7d2c' },
  sweetheart_rose: { kind: 'rose', main: '#ff4d8d', leaf: '#3f8a3a', alt: '#ffd1e3' },
  four_leaf_clover: { kind: 'clover', main: '#59d47a', leaf: '#2fa84f', alt: '#ffd23f' },
  star_melon: { kind: 'round', v: 'star', main: '#ffe066', leaf: '#3f8a35', alt: '#8f7cf7' },
  sweet_potato: { kind: 'tuber', v: 'long', main: '#f2a65a', leaf: '#5a9e4a', alt: '#c8553d' },
  marigold: { kind: 'flower', v: 'pom', main: '#ff9f1c', leaf: '#4f9a3c', alt: '#c96a12' },
  taro: { kind: 'tuber', v: 'round', main: '#a68ab0', leaf: '#4f8f4a', alt: '#e7dcef' },
  matcha: { kind: 'bowl', main: '#9fd0f2', leaf: '#4a8f3a', alt: '#7cb342' },
  heirloom_tomato: { kind: 'round', v: 'stripes', main: '#f77f00', leaf: '#3d8b37', alt: '#9d0208' },
  rainbow_radish: { kind: 'radish', main: '#ff8fab', leaf: '#5aa04a', alt: '#c77dff' },
  pineapple: { kind: 'pineapple', main: '#ffc300', leaf: '#5aa02e', alt: '#d98e04' },
  butternut: { kind: 'squash', main: '#e8a85c', leaf: '#5a8f3a', alt: '#f6d28a' },
};

/** A crop with no entry above is drawn as a round fruit in its own palette hint. */
function produceFor(c: CropDef): Produce {
  return PRODUCE[c.id] ?? { kind: 'round', main: c.colors[1], leaf: c.colors[0], alt: shade(c.colors[1], 0.35) };
}

// ---------------------------------------------------------------------------
// Helpers

/** A pointed leaf from (x, y) along angle a, with a midrib. */
function leafShape(p: Pen, x: number, y: number, a: number, len: number, color: string): void {
  const ctx = p.ctx;
  const dx = Math.cos(a);
  const dy = Math.sin(a);
  const nx = -dy;
  const ny = dx;
  const w = len * 0.36;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.quadraticCurveTo(x + dx * len * 0.5 + nx * w, y + dy * len * 0.5 + ny * w, x + dx * len, y + dy * len);
  ctx.quadraticCurveTo(x + dx * len * 0.5 - nx * w, y + dy * len * 0.5 - ny * w, x, y);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.strokeStyle = O;
  ctx.lineWidth = 0.9;
  ctx.stroke();
  p.line([{ x, y }, { x: x + dx * len * 0.72, y: y + dy * len * 0.72 }], shade(color, -0.3), 0.6);
}

/** A thick outlined stick between points (stems, posts). */
function stick(p: Pen, pts: Pt[], w: number, color: string): void {
  p.line(pts, O, w + 1.6);
  p.line(pts, color, w);
}

/** Overlapping circles that read as one silhouette: all outlines first, then all fills. */
function blob(p: Pen, circles: [number, number, number][], fill: string): void {
  for (const [x, y, r] of circles) p.circle(x, y, r + 0.9, O, null);
  for (const [x, y, r] of circles) p.circle(x, y, r, fill, null);
}

/** An ellipse with its own outline width. */
function ellipseW(p: Pen, x: number, y: number, rx: number, ry: number, fill: string | null, stroke: string | null, rot: number, w: number): void {
  const old = p.lineWidth;
  p.lineWidth = w;
  p.ellipse(x, y, rx, ry, fill, stroke, rot);
  p.lineWidth = old;
}

/** A soft white glint on the upper left of a rounded shape. */
function glint(p: Pen, x: number, y: number, r: number): void {
  p.ellipse(x, y, r * 0.3, r * 0.2, GLINT, null, -0.6);
}

/** A five-leaf green calyx sitting on the top of a fruit, opening from (x, y). */
function calyx(p: Pen, x: number, y: number, s: number, color: string, spread = 0.62): void {
  for (let i = 0; i < 5; i++) leafShape(p, x, y, -Math.PI / 2 + (i - 2) * spread, s, color);
}

// ---------------------------------------------------------------------------
// Produce painters, drawn into the board's face around (CX, CY)

function round(p: Pen, d: Produce): void {
  const x = CX;
  const y = CY + 1;
  const r = 8.4;
  stick(p, [{ x, y: y - r }, { x: x + 0.8, y: y - r - 3 }], 1.4, shade(d.leaf, -0.15));
  p.ball(x, y, r, d.main);
  if (d.v === 'stripes') {
    p.curve({ x: x - 6.5, y: y - 3.2 }, { x, y: y - 1 }, { x: x + 6.5, y: y - 3.2 }, d.alt, 1.2);
    p.curve({ x: x - 6, y: y + 3.4 }, { x, y: y + 5.2 }, { x: x + 6, y: y + 3.4 }, d.alt, 1.2);
  }
  if (d.v === 'star') {
    // rind stripes, and a lilac star low on the melon
    for (const k of [-1, 1]) {
      p.curve({ x: x + k * 1.2, y: y - r + 0.5 }, { x: x + k * 6.4, y: y }, { x: x + k * 1.2, y: y + r - 0.5 }, d.leaf, 1.2);
    }
    p.star(x, y + 2.2, 3.4, d.alt);
  }
  calyx(p, x, y - r + 1.2, 5, d.leaf);
  glint(p, x - 3.4, y - 3.6, r);
}

function drop(p: Pen, d: Produce): void {
  const x = CX;
  const y = CY;
  const ctx = p.ctx;
  ctx.beginPath();
  ctx.moveTo(x, y + 9);
  ctx.bezierCurveTo(x - 6.5, y + 5.5, x - 9, y + 0.5, x - 7.5, y - 3.5);
  ctx.quadraticCurveTo(x, y - 7.5, x + 7.5, y - 3.5);
  ctx.bezierCurveTo(x + 9, y + 0.5, x + 6.5, y + 5.5, x, y + 9);
  ctx.closePath();
  ctx.fillStyle = d.main;
  ctx.fill();
  ctx.strokeStyle = O;
  ctx.lineWidth = 1;
  ctx.stroke();
  for (const [dx, dy] of [
    [-4, -1],
    [0, -2.2],
    [4, -1],
    [-2, 2.8],
    [2, 2.8],
    [0, 6.2],
  ]) {
    p.ellipse(x + dx, y + dy, 0.8, 1.1, d.alt, null);
  }
  calyx(p, x, y - 3.8, 5.8, d.leaf, 0.9);
  glint(p, x - 4.4, y - 1.2, 6);
}

function carrot(p: Pen, d: Produce): void {
  const x = CX;
  const y = CY;
  const ctx = p.ctx;
  for (const a of [-2.5, -1.57, -0.64]) leafShape(p, x + 0.5, y - 6, a, 8, d.leaf);
  ctx.beginPath();
  ctx.moveTo(x - 6.5, y - 6);
  ctx.quadraticCurveTo(x - 7, y + 5, x + 1.5, y + 10.5);
  ctx.quadraticCurveTo(x + 6.5, y + 4, x + 6.5, y - 6);
  ctx.quadraticCurveTo(x, y - 8.5, x - 6.5, y - 6);
  ctx.closePath();
  ctx.fillStyle = d.main;
  ctx.fill();
  ctx.strokeStyle = O;
  ctx.lineWidth = 1;
  ctx.stroke();
  p.line([{ x: x - 5, y: y - 1.5 }, { x: x + 5, y: y - 1.5 }], d.alt, 1.1);
  p.line([{ x: x - 4.2, y: y + 3 }, { x: x + 4.2, y: y + 3 }], d.alt, 1.1);
  p.line([{ x: x - 3.8, y: y - 3.5 }, { x: x - 3.2, y: y + 1.5 }], GLINT, 1.2);
}

function tuber(p: Pen, d: Produce): void {
  const x = CX;
  const y = CY + 2;
  if (d.v === 'long') {
    leafShape(p, x + 6, y - 2, -1.9, 7, d.leaf);
    leafShape(p, x + 6, y - 2, -1.0, 6, d.leaf);
    p.ellipse(x, y, 10, 5.6, d.main, O, -0.35);
    for (const [dx, dy] of [
      [-4.5, -1.2],
      [0.5, 1.4],
      [4.5, -1.6],
    ]) {
      p.circle(x + dx, y + dy, 0.8, d.alt, null);
    }
  } else if (d.v === 'round') {
    p.ball(x, y, 8.6, d.main);
    for (const [dx, dy] of [
      [-3.4, -3],
      [3.2, -2.4],
      [-0.8, 3.2],
      [4, 3.2],
    ]) {
      p.circle(x + dx, y + dy, 0.9, d.alt, null);
    }
    leafShape(p, x, y - 7.5, -2.3, 6.5, d.leaf);
    leafShape(p, x, y - 7.5, -0.8, 6.5, d.leaf);
  } else {
    leafShape(p, x - 1, y - 6, -2.4, 7, d.leaf);
    leafShape(p, x - 1, y - 6, -0.9, 7, d.leaf);
    p.ellipse(x, y, 9, 6.6, d.main, O, 0.1);
    for (const [dx, dy] of [
      [-4.2, -1.8],
      [1.8, 2.2],
      [4.6, -2.4],
    ]) {
      p.circle(x + dx, y + dy, 0.9, d.alt, null);
    }
  }
}

function cob(p: Pen, d: Produce): void {
  const x = CX;
  const y = CY;
  // husk leaves wrap up from the bottom, behind the cob
  leafShape(p, x, y + 11, -2.25, 14, d.leaf);
  leafShape(p, x, y + 11, -0.9, 14, d.leaf);
  leafShape(p, x, y + 11, -1.57, 13, shade(d.leaf, -0.12));
  p.ellipse(x, y - 0.5, 5.8, 10.4, d.main, O);
  for (const row of [-6, -2.2, 1.6, 5.4]) {
    for (const col of [-2.3, 0, 2.3]) p.circle(x + col, y - 0.5 + row, 1.05, d.alt, null);
  }
  // a tuft of silk at the tip
  p.curve({ x, y: y - 10 }, { x: x + 2.5, y: y - 13.5 }, { x: x + 4.5, y: y - 11.5 }, '#fff1b8', 1.1);
  p.curve({ x, y: y - 10 }, { x: x - 1.5, y: y - 13 }, { x: x - 3, y: y - 11 }, '#fff1b8', 1.1);
}

function cluster(p: Pen, d: Produce): void {
  const x = CX;
  const y = CY;
  leafShape(p, x + 1, y - 7, -0.35, 8, d.leaf);
  stick(p, [{ x, y: y - 7 }, { x: x + 0.6, y: y - 9.5 }], 1.3, shade(d.leaf, -0.2));
  const berries: [number, number][] = [
    [-4.2, -1.5],
    [4.2, -1.5],
    [0, -5.5],
    [0, 2.5],
    [-5.5, 5],
    [5.5, 5],
  ];
  for (const [dx, dy] of berries) {
    if (d.v === 'oval') {
      p.ellipse(x + dx, y + dy, 3.6, 2.8, d.main, O, -0.3);
      p.ellipse(x + dx - 1, y + dy - 1, 1, 0.6, d.alt, null, -0.3);
    } else {
      p.ball(x + dx, y + dy, 3.6, d.main);
      p.circle(x + dx - 1.2, y + dy - 1.2, 0.8, d.alt, null);
    }
  }
}

function grapes(p: Pen, d: Produce): void {
  const x = CX;
  const y = CY;
  stick(p, [{ x, y: y - 8.5 }, { x: x + 0.6, y: y - 11.5 }], 1.4, shade(d.leaf, -0.2));
  leafShape(p, x + 1, y - 8, -0.3, 8, d.leaf);
  const rows: [number, number][] = [
    [-3, -6],
    [3, -6],
    [-6, -2.6],
    [0, -2.6],
    [6, -2.6],
    [-3, 0.8],
    [3, 0.8],
    [0, 4.2],
  ];
  for (const [dx, dy] of rows) {
    p.ball(x + dx, y + dy, 3, d.main);
    p.circle(x + dx - 0.9, y + dy - 1, 0.8, d.alt, null);
  }
}

function pumpkin(p: Pen, d: Produce): void {
  const x = CX;
  const y = CY + 2;
  const ghost = d.v === 'ghost';
  stick(p, [{ x, y: y - 6.5 }, { x: x + 0.6, y: y - 10 }], 2.6, shade(d.leaf, -0.1));
  leafShape(p, x + 1, y - 8, -0.6, 7, d.leaf);
  p.ellipse(x, y, 10, 7.4, d.main, O);
  const rib = ghost ? d.alt : shade(d.main, -0.3);
  ellipseW(p, x - 4.2, y, 4.4, 7.1, null, rib, 0, 1.1);
  ellipseW(p, x + 4.2, y, 4.4, 7.1, null, rib, 0, 1.1);
  if (ghost) {
    p.circle(x - 3.6, y - 0.5, 1.2, SEED, null);
    p.circle(x + 3.6, y - 0.5, 1.2, SEED, null);
    p.circle(x - 6.2, y + 2.4, 1.5, PINK, null);
    p.circle(x + 6.2, y + 2.4, 1.5, PINK, null);
    p.curve({ x: x - 2, y: y + 3 }, { x, y: y + 5.2 }, { x: x + 2, y: y + 3 }, SEED, 0.9);
  } else {
    p.ellipse(x - 5.5, y - 3, 1.3, 2.3, GLINT, null, 0.4);
  }
}

function flower(p: Pen, d: Produce): void {
  const x = CX;
  const y = CY;
  const pom = d.v === 'pom';
  leafShape(p, x - 1, y + 3, 2.1, 7, d.leaf);
  const n = pom ? 12 : 8;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const px = x + Math.cos(a) * 6;
    const py = y + Math.sin(a) * 6;
    if (pom) p.circle(px, py, 2.9, d.main, shade(d.main, -0.3));
    else p.ellipse(px, py, 3.7, 2.6, d.main, shade(d.main, -0.35), a);
  }
  p.circle(x, y, pom ? 4 : 4.2, d.alt, O);
  if (!pom) {
    for (const [dx, dy] of [
      [-1.6, -1.1],
      [1.3, -1.6],
      [0, 1.4],
      [1.9, 1],
      [-1.2, 1.9],
    ]) {
      p.circle(x + dx, y + dy, 0.55, shade(d.alt, 0.3), null);
    }
  }
}

function rose(p: Pen, d: Produce): void {
  const x = CX;
  const y = CY - 1;
  stick(p, [{ x, y: y + 5 }, { x: x + 0.5, y: y + 11 }], 1.4, d.leaf);
  leafShape(p, x + 0.5, y + 9, -0.4, 6, d.leaf);
  const petals: [number, number, number][] = [];
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + 0.4;
    petals.push([x + Math.cos(a) * 3.6, y + Math.sin(a) * 3.6, 4.2]);
  }
  blob(p, petals, d.main);
  p.circle(x, y, 4.2, d.main, shade(d.main, -0.35));
  p.ctx.beginPath();
  p.ctx.arc(x, y, 2.6, 0.5, Math.PI * 1.7);
  p.ctx.strokeStyle = shade(d.main, -0.35);
  p.ctx.lineWidth = 0.9;
  p.ctx.stroke();
  p.circle(x + 0.2, y + 0.2, 1.4, d.alt, null);
  p.ellipse(x - 3.4, y - 3.2, 1.3, 0.9, GLINT, null, -0.5);
}

function cotton(p: Pen, d: Produce): void {
  const x = CX;
  const y = CY;
  leafShape(p, x - 1, y + 7, -2.4, 7, d.leaf);
  leafShape(p, x + 1, y + 7, -0.7, 7, d.leaf);
  blob(
    p,
    [
      [x, y - 1.5, 6.6],
      [x - 5, y - 4.6, 4.2],
      [x + 5, y - 4.6, 4.2],
      [x - 6, y + 1.6, 4],
      [x + 6, y + 1.6, 4],
      [x, y + 3.4, 4.4],
    ],
    d.main,
  );
  // soft lilac shading along the underside of the cloud
  p.ctx.beginPath();
  p.ctx.arc(x, y + 1.2, 8.4, 0.25, Math.PI - 0.25);
  p.ctx.strokeStyle = d.alt;
  p.ctx.lineWidth = 1.1;
  p.ctx.stroke();
  p.circle(x - 3.6, y - 5.2, 1.4, WHITE, null);
}

function stalk(p: Pen, d: Produce): void {
  const x = CX;
  const y = CY;
  if (d.v === 'rice') {
    for (const k of [-1, 0, 1]) {
      const tx = x + k * 5;
      const ty = y - 7 + Math.abs(k) * 1.5;
      const a = { x: x + k, y: y + 10 };
      const c = { x: x + k * 4.5, y: y + 2 };
      p.curve(a, c, { x: tx, y: ty }, O, 2.6);
      p.curve(a, c, { x: tx, y: ty }, d.leaf, 1.2);
      for (let j = 0; j < 3; j++) {
        ellipseW(p, tx + (j - 1) * 2.2, ty + 1.6 + j * 1.1, 2.6, 1.6, d.main, O, 1.1, 0.9);
      }
    }
    return;
  }
  stick(p, [{ x, y: y + 10 }, { x, y: y - 6 }], 1.5, d.alt);
  for (let i = 0; i < 4; i++) {
    const gy = y - 5 + i * 3.3;
    ellipseW(p, x - 2.6, gy - 0.6, 2.9, 1.5, d.main, O, 0.6, 0.9);
    ellipseW(p, x + 2.6, gy - 0.6, 2.9, 1.5, d.main, O, -0.6, 0.9);
  }
  ellipseW(p, x, y - 9, 1.7, 3, d.main, O, 0, 0.9);
}

function spike(p: Pen, d: Produce): void {
  const x = CX;
  const y = CY;
  leafShape(p, x, y + 8, -2.7, 7, d.leaf);
  leafShape(p, x, y + 8, -0.45, 7, d.leaf);
  stick(p, [{ x, y: y + 9 }, { x, y: y - 8 }], 1.3, d.leaf);
  for (let i = 0; i < 6; i++) {
    const by = y - 7 + i * 2.7;
    const bx = x + (i % 2 ? 1.9 : -1.9);
    ellipseW(p, bx, by, 2.5 - i * 0.12, 1.9, i % 2 ? d.main : shade(d.main, -0.12), O, i % 2 ? -0.5 : 0.5, 0.8);
    p.circle(bx - 0.5, by - 0.6, 0.5, d.alt, null);
  }
  ellipseW(p, x, y - 9.5, 1.6, 2.2, d.main, O, 0, 0.8);
}

function wedge(p: Pen, d: Produce): void {
  const ctx = p.ctx;
  const x = CX;
  const top = CY - 7;
  const R = 12;
  const half = (r: number, fill: string, stroke: string | null): void => {
    ctx.beginPath();
    ctx.moveTo(x - r, top);
    ctx.lineTo(x + r, top);
    ctx.arc(x, top, r, 0, Math.PI);
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  };
  half(R, d.alt, O);
  half(R - 1.8, '#d9f2c8', null);
  half(R - 3, d.main, null);
  for (const [dx, dy] of [
    [-4.6, 2.6],
    [4.6, 2.6],
    [0, 2.2],
    [-2.4, 5.6],
    [2.4, 5.6],
  ]) {
    p.ellipse(x + dx, top + dy, 0.75, 1.25, SEED, null, 0.4);
  }
}

function candy(p: Pen, d: Produce): void {
  const x = CX;
  const top = CY - 9;
  const tip = CY + 10.5;
  const hw = 8.6;
  const L = (t: number): Pt => ({ x: x - hw + hw * t, y: top + (tip - top) * t });
  const R = (t: number): Pt => ({ x: x + hw - hw * t, y: top + (tip - top) * t });
  const band = (t0: number, t1: number, col: string): void => p.poly([L(t0), R(t0), R(t1), L(t1)], col, null);
  band(0, 0.36, '#ffd23f');
  band(0.36, 0.7, d.main);
  band(0.7, 1, d.alt);
  p.poly(
    [
      { x: x - hw, y: top },
      { x: x + hw, y: top },
      { x, y: tip },
    ],
    null,
    O,
    1.1,
  );
  // a sleepy face on the orange band
  p.circle(x - 2.4, CY + 3.4, 1, SEED, null);
  p.circle(x + 2.4, CY + 3.4, 1, SEED, null);
  p.curve({ x: x - 1.2, y: CY + 5 }, { x, y: CY + 6.2 }, { x: x + 1.2, y: CY + 5 }, SEED, 0.7);
}

function swirl(p: Pen, d: Produce): void {
  const x = CX;
  const y = CY + 1.5;
  const r = 8.4;
  leafShape(p, x, y - r + 1.5, -2.6, 6, d.leaf);
  leafShape(p, x, y - r + 1.5, -0.55, 6, d.leaf);
  p.circle(x, y, r, d.alt, null);
  for (let k = 0; k < 4; k++) p.arc(x, y, r, k * (Math.PI / 2), k * (Math.PI / 2) + Math.PI / 4, d.main, null);
  p.circle(x, y, r, null, O);
  p.ellipse(x - 3.5, y - 3.5, 1.3, 0.9, GLINT, null, -0.7);
}

function bean(p: Pen, d: Produce): void {
  const ctx = p.ctx;
  const x = CX;
  const y = CY;
  leafShape(p, x + 1, y - 7, -0.7, 8, d.leaf);
  leafShape(p, x - 1, y - 6, -2.3, 6, d.leaf);
  p.ellipse(x, y + 0.5, 6.4, 8.4, d.main, O);
  ctx.beginPath();
  ctx.moveTo(x, y - 7.5);
  ctx.bezierCurveTo(x + 3, y - 4, x - 3, y - 1.5, x, y + 0.5);
  ctx.bezierCurveTo(x + 3, y + 2.5, x - 3, y + 5, x, y + 8);
  ctx.strokeStyle = d.alt;
  ctx.lineWidth = 1.2;
  ctx.stroke();
  p.ellipse(x - 3.4, y - 3, 1, 2.2, GLINT, null, 0.2);
}

function bowl(p: Pen, d: Produce): void {
  const ctx = p.ctx;
  const x = CX;
  const y = CY - 1;
  // foot ring, then the body, the band, the rim and the tea
  p.ellipse(x, y + 10.5, 4.2, 1.2, shade(d.main, -0.25), O);
  ctx.beginPath();
  ctx.moveTo(x - 10.5, y);
  ctx.bezierCurveTo(x - 10, y + 7, x - 5.5, y + 10.5, x, y + 10.5);
  ctx.bezierCurveTo(x + 5.5, y + 10.5, x + 10, y + 7, x + 10.5, y);
  ctx.closePath();
  ctx.fillStyle = d.main;
  ctx.fill();
  ctx.strokeStyle = O;
  ctx.lineWidth = 1;
  ctx.stroke();
  p.curve({ x: x - 9.3, y: y + 3.6 }, { x, y: y + 7.4 }, { x: x + 9.3, y: y + 3.6 }, WHITE, 1.6);
  p.ellipse(x, y, 10.5, 3.2, d.main, O);
  p.ellipse(x, y + 0.1, 8.4, 2.1, d.alt, shade(d.alt, -0.3));
  p.circle(x - 3, y - 0.3, 0.9, WHITE, null);
  p.circle(x + 2.6, y + 0.5, 0.6, WHITE, null);
  p.circle(x + 0.4, y - 0.9, 0.5, WHITE, null);
}

function leafy(p: Pen, d: Produce): void {
  const x = CX;
  const y = CY + 6;
  stick(p, [{ x, y: y + 2 }, { x, y: y - 4 }], 2.4, d.main);
  for (const a of [-2.3, -0.84]) p.ellipse(x + Math.cos(a) * 6.5, y + Math.sin(a) * 6.5, 6.8, 3.9, d.leaf, O, a);
  p.ellipse(x, y - 6, 4.6, 7.4, d.leaf, O);
  p.line([{ x, y: y - 1.5 }, { x, y: y - 11 }], shade(d.leaf, -0.3), 0.7);
  p.line([{ x: x - 0.5, y: y - 4 }, { x: x - 2.6, y: y - 8 }], shade(d.leaf, -0.3), 0.6);
  p.line([{ x: x + 0.5, y: y - 4 }, { x: x + 2.6, y: y - 8 }], shade(d.leaf, -0.3), 0.6);
  p.ellipse(x - 2.2, y - 9, 0.9, 2, GLINT, null, 0.2);
}

function clover(p: Pen, d: Produce): void {
  const x = CX;
  const y = CY - 1;
  stick(p, [{ x, y: y + 4 }, { x: x + 1, y: y + 12 }], 1.5, d.leaf);
  blob(
    p,
    [
      [x, y - 4.6, 4.2],
      [x - 4.6, y - 0.6, 4.2],
      [x + 4.6, y - 0.6, 4.2],
      [x, y + 3.4, 4.2],
    ],
    d.main,
  );
  p.circle(x, y - 0.6, 1.6, d.alt, null);
  glint(p, x - 4.8, y - 4.8, 3.6);
}

function pineapple(p: Pen, d: Produce): void {
  const x = CX;
  const y = CY + 3;
  const rx = 7.6;
  const ry = 8.6;
  const ctx = p.ctx;
  // crown first, so the body covers the base of its leaves
  for (const a of [-2.25, -1.85, -1.57, -1.29, -0.89]) leafShape(p, x, y - ry + 1.5, a, 6.5, d.leaf);
  p.ellipse(x, y, rx, ry, d.main, O);
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.clip();
  ctx.strokeStyle = d.alt;
  ctx.lineWidth = 0.8;
  for (let k = -5; k <= 5; k++) {
    ctx.beginPath();
    ctx.moveTo(x + k * 3.2 - 12, y - 12);
    ctx.lineTo(x + k * 3.2 + 12, y + 12);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + k * 3.2 + 12, y - 12);
    ctx.lineTo(x + k * 3.2 - 12, y + 12);
    ctx.stroke();
  }
  ctx.restore();
  p.ellipse(x, y, rx, ry, null, O);
  p.ellipse(x - 3.6, y - 2.5, 1.1, 2.6, GLINT, null, 0.3);
}

function squash(p: Pen, d: Produce): void {
  const ctx = p.ctx;
  const x = CX;
  const y = CY;
  leafShape(p, x + 1, y - 9, -0.6, 6.5, d.leaf);
  stick(p, [{ x: x + 0.5, y: y - 8.5 }, { x: x + 1.2, y: y - 11.5 }], 1.4, shade(d.leaf, -0.15));
  const neck = (): void => {
    ctx.beginPath();
    ctx.roundRect(x - 3.6, y - 8.5, 7.2, 12, [3.6, 3.6, 4, 4]);
  };
  const bulb = (): void => {
    ctx.beginPath();
    ctx.ellipse(x, y + 4, 8.4, 6.6, 0, 0, Math.PI * 2);
  };
  // outline pass then fill pass, so neck and bulb read as one silhouette
  for (const path of [neck, bulb]) {
    path();
    ctx.strokeStyle = O;
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  for (const path of [neck, bulb]) {
    path();
    ctx.fillStyle = d.main;
    ctx.fill();
  }
  p.ellipse(x - 4.6, y + 4, 1.5, 3.2, d.alt, null, 0.15);
  p.ellipse(x - 2.2, y - 4.5, 0.9, 1.8, d.alt, null, 0.15);
}

function radish(p: Pen, d: Produce): void {
  const ctx = p.ctx;
  const x = CX;
  const y = CY;
  for (const a of [-2.55, -1.57, -0.6]) leafShape(p, x, y - 5.5, a, 8.5, d.leaf);
  ctx.beginPath();
  ctx.moveTo(x - 2.8, y + 4);
  ctx.quadraticCurveTo(x - 2.2, y + 9, x + 0.4, y + 11.5);
  ctx.quadraticCurveTo(x + 2.4, y + 8.5, x + 2.8, y + 4);
  ctx.closePath();
  ctx.fillStyle = '#fbe7ff';
  ctx.fill();
  ctx.strokeStyle = O;
  ctx.lineWidth = 1;
  ctx.stroke();
  // a pink bulb with a purple shoulder
  p.circle(x, y, 7.2, d.main, null);
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.arc(x, y, 7.2, Math.PI, 0);
  ctx.closePath();
  ctx.fillStyle = d.alt;
  ctx.fill();
  p.circle(x, y, 7.2, null, O);
  p.ellipse(x - 3.4, y - 2.6, 1.4, 1, GLINT, null, -0.5);
}

const DRAW: Record<Kind, (p: Pen, d: Produce) => void> = {
  round,
  drop,
  carrot,
  tuber,
  cob,
  cluster,
  grapes,
  pumpkin,
  flower,
  rose,
  cotton,
  stalk,
  spike,
  wedge,
  candy,
  swirl,
  bean,
  bowl,
  leafy,
  clover,
  pineapple,
  squash,
  radish,
};

// ---------------------------------------------------------------------------
// The sign: post, board, stars and rosette

/** A scalloped gold rosette centred at (x, y), R its radius. */
function medal(p: Pen, x: number, y: number, R: number): void {
  const pts: Pt[] = [];
  for (let i = 0; i < 48; i++) {
    const a = (i / 48) * Math.PI * 2;
    const r = R * (0.9 + 0.1 * Math.cos(a * 12));
    pts.push({ x: x + Math.cos(a) * r, y: y + Math.sin(a) * r });
  }
  p.poly(pts, GOLD, O, Math.max(1, R * 0.1));
  p.circle(x, y, R * 0.66, GOLD_L, shade(GOLD, -0.35));
}

/** Two pink ribbon tails hanging under a medal, scaled by s from its centre. */
function ribbons(p: Pen, x: number, y: number, s: number): void {
  const at = (dx: number, dy: number): Pt => ({ x: x + dx * s, y: y + dy * s });
  const left = [at(-4.2, 0.8), at(-0.6, 0.8), at(-2.1, 11), at(-4.2, 9.6), at(-6.6, 11.5)];
  const right = [at(4.2, 0.8), at(0.6, 0.8), at(2.1, 11), at(4.2, 9.6), at(6.6, 11.5)];
  p.poly(left, PINK, O, 1.1);
  p.poly(right, PINK_D, O, 1.1);
  p.line([at(-2.6, 3), at(-2.2, 6.5)], 'rgba(255,255,255,0.45)', 1);
}

/** A grass tuft at the foot of the post: a mound with blades. */
function grassTuft(p: Pen, front: boolean): void {
  if (!front) {
    p.shadow(CX, GROUND + 1.5, 15, 6, 0.25);
    p.ellipse(CX, GROUND + 1, 13, 4.8, GRASS, O);
    leafShape(p, CX - 2, GROUND, -2.35, 10, GRASS_D);
    leafShape(p, CX + 2, GROUND, -0.8, 10, GRASS_D);
    return;
  }
  leafShape(p, CX - 3, GROUND + 1, -2.7, 6.5, GRASS);
  leafShape(p, CX + 3, GROUND + 1, -0.45, 6.5, GRASS);
  p.flower(CX - 9, GROUND + 0.5, 2.2, PINK_L, GOLD_L);
}

function board(p: Pen): void {
  const ctx = p.ctx;
  // the wooden frame, with an arched top
  ctx.beginPath();
  ctx.roundRect(14.5, 23.5, 35, 31, [13, 13, 4, 4]);
  ctx.fillStyle = WOOD;
  ctx.fill();
  ctx.strokeStyle = O;
  ctx.lineWidth = 1.3;
  ctx.stroke();
  // a light bevel along the frame's top
  p.ctx.beginPath();
  p.ctx.roundRect(16.2, 25.2, 31.6, 4, [10, 10, 0, 0]);
  p.ctx.fillStyle = WOOD_L;
  p.ctx.fill();
  // the cream face
  ctx.beginPath();
  ctx.roundRect(17, 26.5, 30, 25.5, [9.5, 9.5, 2, 2]);
  ctx.fillStyle = CREAM;
  ctx.fill();
  ctx.strokeStyle = O;
  ctx.lineWidth = 1;
  ctx.stroke();
}

function stars(p: Pen): void {
  p.star(CX, 11, 5.6, GOLD, O);
  p.star(CX - 14.5, 15.5, 4.2, GOLD, O);
  p.star(CX + 14.5, 15.5, 4.2, GOLD, O);
  p.circle(CX - 1.8, 9.4, 0.9, WHITE, null);
  p.circle(CX - 15.6, 13.6, 0.7, WHITE, null);
  p.circle(CX + 13.4, 13.6, 0.7, WHITE, null);
}

function sign(p: Pen, d: Produce): void {
  grassTuft(p, false);
  // post
  stick(p, [{ x: CX, y: 52 }, { x: CX, y: GROUND - 1 }], 3.6, WOOD);
  board(p);
  DRAW[d.kind](p, d);
  stars(p);
  // a gold rosette pinned to the post, with its ribbons
  ribbons(p, CX, 62, 0.5);
  medal(p, CX, 62, 5.4);
  grassTuft(p, true);
}

// ---------------------------------------------------------------------------
// Exports

export const sprites: SpriteSpec[] = CROP_LIST.map((c) => ({
  key: `deco:mastery_${c.id}`,
  fw: 1,
  fh: 1,
  height: HEAD,
  paint: (p: Pen) => sign(p, produceFor(c)),
}));

function iconMastery(p: Pen): void {
  const x = 20;
  const y = 15;
  const ctx = p.ctx;
  // ribbon tails first, so the rosette sits on top of them
  ribbons(p, x, y, 1.9);
  medal(p, x, y, 12.5);
  // a ring of light, then a smiling star in the middle
  ctx.beginPath();
  ctx.arc(x, y, 10.2, Math.PI * 1.1, Math.PI * 1.4);
  ctx.strokeStyle = GLINT;
  ctx.lineWidth = 1.2;
  ctx.stroke();
  p.star(x, y + 0.6, 6.4, PALE_GOLD, O);
  p.circle(x - 2, y + 0.4, 0.75, SEED, null);
  p.circle(x + 2, y + 0.4, 0.75, SEED, null);
  p.curve({ x: x - 1.1, y: y + 2 }, { x, y: y + 3.1 }, { x: x + 1.1, y: y + 2 }, SEED, 0.6);
  p.circle(x - 3.4, y + 1.6, 1, PINK_L, null);
  p.circle(x + 3.4, y + 1.6, 1, PINK_L, null);
  // two tiny sparkles
  p.star(34.5, 5, 2.3, WHITE, null);
  p.star(6, 10, 1.6, WHITE, null);
}

export const icons: IconSpec[] = [{ key: 'icon:mastery', paint: iconMastery }];
