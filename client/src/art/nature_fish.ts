// Nature fish art: one icon per species in FISH_LIST (side-on, facing left),
// the four fish dishes, and the fishing mini-game props. Same house style as
// cooking.ts and crops.ts: chunky rounded bodies, the warm-brown outline, soft
// highlights, and kawaii dot-eyed faces with pink blush.
import { type IconSpec, type Pen, type Pt, rgba, rng, shade } from './kit';

type Ctx = CanvasRenderingContext2D;
type Fill = string | CanvasGradient | null;

const INK = '#2b1b12';
const WHITE = '#ffffff';
const BLUSH = 'rgba(255,110,140,0.55)';
const LINE = 1.05;

// ---------------------------------------------------------------------------
// Shared helpers

/** Build a path with raw canvas calls, then fill and/or outline it. */
function shape(p: Pen, build: (c: Ctx) => void, fill: Fill, stroke: string | null = p.outline, w = LINE): void {
  const c = p.ctx;
  c.beginPath();
  build(c);
  c.closePath();
  if (fill) {
    c.fillStyle = fill;
    c.fill();
  }
  if (stroke) {
    c.strokeStyle = stroke;
    c.lineWidth = w;
    c.stroke();
  }
}

/** Run fn with everything clipped to a path, so markings stay inside a body. */
function clipped(p: Pen, build: (c: Ctx) => void, fn: () => void): void {
  const c = p.ctx;
  c.save();
  c.beginPath();
  build(c);
  c.closePath();
  c.clip();
  fn();
  c.restore();
}

/** Run fn at k times scale, so 40-unit art can fill a bigger canvas. */
function scaled(p: Pen, k: number, fn: () => void): void {
  p.ctx.save();
  p.ctx.scale(k, k);
  fn();
  p.ctx.restore();
}

/** Scatter n dots of radius r inside a box, from a seeded PRNG so they never move. */
function speckle(p: Pen, seed: string, n: number, x0: number, x1: number, y0: number, y1: number, r: number, color: string): void {
  const rand = rng(seed);
  for (let i = 0; i < n; i++) p.circle(x0 + rand() * (x1 - x0), y0 + rand() * (y1 - y0), r, color, null);
}

/** Four-point twinkle. */
function sparkle(p: Pen, x: number, y: number, s: number): void {
  shape(
    p,
    (c) => {
      c.moveTo(x, y - s);
      c.quadraticCurveTo(x, y, x + s, y);
      c.quadraticCurveTo(x, y, x, y + s);
      c.quadraticCurveTo(x, y, x - s, y);
      c.quadraticCurveTo(x, y, x, y - s);
    },
    WHITE,
    'rgba(255,170,60,0.95)',
    0.6,
  );
}

/** Stroke a thick outlined curve: a dark rim under the coloured stroke. */
function stem(p: Pen, a: Pt, c: Pt, b: Pt, color: string, w = 1.2): void {
  p.curve(a, c, b, p.outline, w + 1.2);
  p.curve(a, c, b, color, w);
}

// ---------------------------------------------------------------------------
// Eyes and faces

/** A kawaii dot eye with a glint. */
function eye(p: Pen, x: number, y: number, r: number): void {
  p.ellipse(x, y, r * 0.82, r, INK, null);
  p.circle(x - r * 0.32, y - r * 0.42, Math.max(0.5, r * 0.34), WHITE, null);
}

/** Pink cheek. */
function blush(p: Pen, x: number, y: number, r: number): void {
  p.ellipse(x, y, r, r * 0.52, BLUSH, null);
}

/** Dish and prop faces: a pair of eyes, cheeks and a small smile. s scales it. */
function kface(p: Pen, x: number, y: number, s = 1): void {
  for (const sx of [-1, 1]) {
    const ex = x + sx * 3.2 * s;
    p.ellipse(ex, y - 0.4 * s, 1.25 * s, 1.5 * s, INK, null);
    p.circle(ex - 0.42 * s, y - 1 * s, 0.45 * s, WHITE, null);
    p.ellipse(x + sx * 5.4 * s, y + 1.9 * s, 1.5 * s, 0.9 * s, BLUSH, null);
  }
  p.curve({ x: x - 1.2 * s, y: y + 1.3 * s }, { x, y: y + 2.7 * s }, { x: x + 1.2 * s, y: y + 1.3 * s }, INK, Math.max(0.5, 0.65 * s));
}

// ---------------------------------------------------------------------------
// The generic side-on fish: body, tail, dorsal fin, pectoral fin, face.

interface Body {
  /** Nose x. */
  x0: number;
  /** Centre line y. */
  cy: number;
  /** Nose to tail base. */
  len: number;
  /** Half height at the widest point. */
  hh: number;
  /** Half height at the tail base. */
  ph: number;
}

type TailKind = 'fork' | 'round' | 'fan';

interface Tail {
  kind: TailKind;
  len: number;
  h: number;
}

interface FishOpts {
  x0: number;
  cy: number;
  len: number;
  hh: number;
  ph?: number;
  body: string;
  belly?: string;
  fin: string;
  outline?: string;
  tail?: Tail | null;
  /** [from, to, height] as fractions of len, plus height in px. */
  dorsal?: [number, number, number] | null;
  eyeAt?: number;
  eyeR?: number;
  mouth?: 'smile' | 'o' | 'none';
  pect?: boolean;
  alpha?: number;
  behind?: (b: Body) => void;
  marks?: (b: Body) => void;
  front?: (b: Body) => void;
  noFace?: boolean;
}

function bodyBuild(b: Body): (c: Ctx) => void {
  return (c) => {
    const xt = b.x0 + b.len;
    c.moveTo(b.x0, b.cy);
    c.bezierCurveTo(b.x0 + b.len * 0.06, b.cy - b.hh * 1.3, xt - b.len * 0.34, b.cy - b.hh * 1.12, xt, b.cy - b.ph);
    c.lineTo(xt, b.cy + b.ph);
    c.bezierCurveTo(xt - b.len * 0.34, b.cy + b.hh * 1.12, b.x0 + b.len * 0.06, b.cy + b.hh * 1.3, b.x0, b.cy);
  };
}

function tailBuild(b: Body, t: Tail): (c: Ctx) => void {
  return (c) => {
    const xs = b.x0 + b.len - 1.5;
    const xe = b.x0 + b.len + t.len;
    const top = b.cy - b.ph;
    const bot = b.cy + b.ph;
    const H = t.h;
    c.moveTo(xs, top);
    if (t.kind === 'fork') {
      c.lineTo(xe, b.cy - H);
      c.quadraticCurveTo(xe - t.len * 0.5, b.cy, xe, b.cy + H);
      c.lineTo(xs, bot);
    } else {
      const bulge = t.kind === 'fan' ? 1.35 : 1.1;
      c.quadraticCurveTo(xe + t.len * 0.12, b.cy - H * bulge, xe, b.cy);
      c.quadraticCurveTo(xe + t.len * 0.12, b.cy + H * bulge, xs, bot);
    }
  };
}

function dorsalBuild(b: Body, from: number, to: number, h: number): (c: Ctx) => void {
  return (c) => {
    const x1 = b.x0 + b.len * from;
    const x2 = b.x0 + b.len * to;
    const yb = b.cy - b.hh * 0.6;
    c.moveTo(x1, yb);
    c.quadraticCurveTo(x1 + (x2 - x1) * 0.25, b.cy - b.hh - h * 1.6, x2, b.cy - b.hh * 0.4);
    c.lineTo(x2 - 0.5, yb);
  };
}

/** Eyes, cheeks and a mouth at the front of a fish. */
function fishFace(p: Pen, b: Body, r: number, eyeAt: number, mouth: 'smile' | 'o' | 'none'): void {
  const ex = b.x0 + b.len * eyeAt;
  const ey = b.cy - b.hh * 0.12;
  blush(p, ex - r * 0.1, ey + r * 1.85, r * 0.85);
  eye(p, ex, ey, r);
  const mx = b.x0 + 2.4;
  const my = b.cy + b.hh * 0.42;
  if (mouth === 'o') p.circle(mx, my, 0.9, null, INK);
  else if (mouth === 'smile') p.curve({ x: mx - 1.1, y: my - 0.3 }, { x: mx, y: my + 1.1 }, { x: mx + 1.1, y: my - 0.3 }, INK, 0.6);
}

function fish(p: Pen, o: FishOpts): void {
  const b: Body = { x0: o.x0, cy: o.cy, len: o.len, hh: o.hh, ph: o.ph ?? o.hh * 0.38 };
  const ol = o.outline ?? p.outline;
  const c = p.ctx;
  o.behind?.(b);
  if (o.tail) shape(p, tailBuild(b, o.tail), o.fin, ol);
  if (o.dorsal) shape(p, dorsalBuild(b, o.dorsal[0], o.dorsal[1], o.dorsal[2]), o.fin, ol);

  c.save();
  c.globalAlpha = o.alpha ?? 1;
  shape(p, bodyBuild(b), p.vgrad(b.cy - b.hh, b.cy + b.hh, shade(o.body, 0.18), shade(o.body, -0.14)), null);
  if (o.belly) {
    const belly = o.belly;
    clipped(p, bodyBuild(b), () => p.ellipse(b.x0 + b.len * 0.5, b.cy + b.hh * 1.2, b.len * 0.62, b.hh * 0.9, belly, null));
  }
  c.restore();

  if (o.marks) clipped(p, bodyBuild(b), () => o.marks!(b));
  shape(p, bodyBuild(b), null, ol);
  if (o.pect !== false) p.ellipse(b.x0 + b.len * 0.3, b.cy + b.hh * 0.45, b.hh * 0.42 + 0.7, b.hh * 0.2 + 0.6, o.fin, ol, 0.5);
  if (!o.noFace) fishFace(p, b, o.eyeR ?? Math.min(2.7, Math.max(1.7, b.hh * 0.27)), o.eyeAt ?? 0.26, o.mouth ?? 'smile');
  o.front?.(b);
}

// ---------------------------------------------------------------------------
// The fish. Each painter sets its silhouette, colours and personality.

const bluegill = (p: Pen) =>
  fish(p, {
    x0: 5, cy: 20, len: 22, hh: 9.5, ph: 3.6,
    body: '#4bb5ad', belly: '#c4ece0', fin: '#2f86a0',
    tail: { kind: 'round', len: 8, h: 6 },
    dorsal: [0.12, 0.62, 5],
    marks: (b) => {
      p.ellipse(b.x0 + 4.6, b.cy + b.hh * 0.62, 5.2, 4.2, '#ff9d3e', null); // orange throat
      for (const x of [b.x0 + 8.5, b.x0 + 12, b.x0 + 15.5, b.x0 + 19]) p.line([{ x, y: b.cy - 9 }, { x: x + 0.4, y: b.cy + 9 }], '#2a7074', 1.3);
    },
  });

const minnow = (p: Pen) =>
  fish(p, {
    x0: 8, cy: 20, len: 19, hh: 5.2, ph: 2,
    body: '#c4d6e2', belly: '#fbfdff', fin: '#aac3d3',
    tail: { kind: 'fork', len: 6.5, h: 4.8 },
    marks: (b) => {
      p.line([{ x: b.x0 + 1, y: b.cy - 0.4 }, { x: b.x0 + b.len, y: b.cy - 0.4 }], '#7d96a8', 0.8);
      p.circle(b.x0 + 11, b.cy - 2, 0.6, WHITE, null);
    },
  });

const carp = (p: Pen) =>
  fish(p, {
    x0: 5, cy: 20, len: 24, hh: 11, ph: 4.2,
    body: '#c8903f', belly: '#f1d38f', fin: '#b57830',
    tail: { kind: 'fork', len: 7, h: 7.5 },
    dorsal: [0.12, 0.6, 5],
    mouth: 'o',
    marks: (b) => {
      for (let row = 0; row < 4; row++)
        for (let col = 0; col < 6; col++) p.circle(b.x0 + 3 + col * 3.6 + (row % 2) * 1.8, b.cy - 7 + row * 3.6, 1.9, null, '#8a5a24');
    },
    front: (b) => {
      // two chunky barbels hanging from the mouth
      p.curve({ x: b.x0 + 1, y: b.cy + 2.6 }, { x: b.x0 - 0.6, y: b.cy + 5.6 }, { x: b.x0 - 2.2, y: b.cy + 5 }, p.outline, 0.9);
      p.curve({ x: b.x0 + 1.4, y: b.cy + 3.6 }, { x: b.x0 + 0.4, y: b.cy + 7 }, { x: b.x0 - 1.4, y: b.cy + 8 }, p.outline, 0.9);
    },
  });

const perch = (p: Pen) =>
  fish(p, {
    x0: 5, cy: 20, len: 22, hh: 8.6, ph: 3.2,
    body: '#ffd447', belly: '#fff2b8', fin: '#eba62c',
    tail: { kind: 'fork', len: 8, h: 6.4 },
    dorsal: [0.1, 0.6, 6],
    marks: (b) => {
      for (const x of [b.x0 + 6.5, b.x0 + 10, b.x0 + 13.5, b.x0 + 17, b.x0 + 20.5]) p.line([{ x, y: b.cy - 9 }, { x: x + 0.5, y: b.cy + 9 }], '#3d3424', 1.5);
    },
  });

const tadpole = (p: Pen) => {
  // teardrop tail trailing from the head
  shape(
    p,
    (c) => {
      c.moveTo(17, 15.5);
      c.quadraticCurveTo(29, 9.5, 38, 20);
      c.quadraticCurveTo(29, 30.5, 17, 24.5);
    },
    '#d4f1a8',
  );
  p.curve({ x: 17, y: 20 }, { x: 27, y: 19.6 }, { x: 36.5, y: 20 }, shade('#9ccd74', -0.1), 0.9);
  // big round head
  p.circle(15, 20, 9, p.vgrad(11, 29, '#86c172', '#3f7249'));
  p.ellipse(16, 25.2, 5.2, 2.6, '#cdf0a0', null);
  p.circle(10.4, 13.4, 1.6, 'rgba(255,255,255,0.45)', null);
  eye(p, 11.6, 17.6, 2.6);
  blush(p, 10.8, 22.4, 1.9);
  p.curve({ x: 9.4, y: 23.8 }, { x: 10.6, y: 25 }, { x: 12, y: 24.2 }, INK, 0.6);
};

const crawfish = (p: Pen) => {
  const red = '#e8523f';
  const dark = '#a8302a';
  // walking legs
  for (const y of [22.5, 25.5, 28.5]) p.line([{ x: 13, y }, { x: 9.5, y: y + 2.4 }], p.outline, 1.1);
  // curled tail fan
  shape(
    p,
    (c) => {
      c.moveTo(26, 16.5);
      c.quadraticCurveTo(36.5, 10.5, 38.5, 20.5);
      c.quadraticCurveTo(37, 29, 26, 25);
    },
    red,
  );
  p.ellipse(25.3, 20.6, 5.6, 6, red);
  p.curve({ x: 22.4, y: 15.3 }, { x: 23.2, y: 20.6 }, { x: 22.4, y: 25.8 }, dark, 0.7);
  p.curve({ x: 27.2, y: 15.6 }, { x: 28, y: 20.6 }, { x: 27.2, y: 25.6 }, dark, 0.7);
  p.ellipse(22.6, 16.6, 1.1, 2.4, 'rgba(255,255,255,0.55)', null, 0.2);
  // head
  p.ball(14.6, 20.6, 7.2, red);
  // antennae
  p.curve({ x: 11.5, y: 14.2 }, { x: 9.4, y: 8.4 }, { x: 5.8, y: 6.8 }, p.outline, 0.7);
  p.curve({ x: 13, y: 13.4 }, { x: 13.2, y: 7.6 }, { x: 10.6, y: 4.6 }, p.outline, 0.7);
  // claws on arms
  stem(p, { x: 11, y: 17.2 }, { x: 8.6, y: 15.4 }, { x: 6.2, y: 14 }, red, 2);
  p.ball(4.8, 13.4, 3.4, red);
  p.line([{ x: 2.4, y: 12.2 }, { x: 5.6, y: 13.4 }], p.outline, 0.8);
  stem(p, { x: 11, y: 24 }, { x: 8.6, y: 25.6 }, { x: 6.6, y: 27 }, red, 2);
  p.ball(4.8, 27.4, 3.4, red);
  p.line([{ x: 2.4, y: 28.6 }, { x: 5.6, y: 27.4 }], p.outline, 0.8);
  // face on the head
  eye(p, 12.2, 18.6, 2.2);
  blush(p, 11.2, 22.4, 1.7);
  p.curve({ x: 9.6, y: 22.6 }, { x: 10.6, y: 23.8 }, { x: 11.8, y: 23.2 }, INK, 0.6);
};

const pumpkinseed = (p: Pen) =>
  fish(p, {
    x0: 5, cy: 20, len: 22, hh: 10, ph: 4,
    body: '#f7a84a', belly: '#ffd58c', fin: '#2e9a8e',
    tail: { kind: 'round', len: 8, h: 6.4 },
    dorsal: [0.12, 0.6, 5],
    marks: (b) => {
      speckle(p, 'pumpkin-teal', 22, b.x0 + 2, b.x0 + b.len - 2, b.cy - b.hh, b.cy + 1, 0.75, '#2e9a8e');
      speckle(p, 'pumpkin-or', 12, b.x0 + 2, b.x0 + b.len - 2, b.cy + 1, b.cy + b.hh, 0.6, '#d9622b');
      p.circle(b.x0 + 12.5, b.cy - 0.6, 1.9, '#e8643d', p.outline);
    },
  });

const catfish = (p: Pen) =>
  fish(p, {
    x0: 9, cy: 20, len: 19, hh: 6.8, ph: 3,
    body: '#8f9aa6', belly: '#e4e9ee', fin: '#7b8693',
    tail: { kind: 'fork', len: 6.5, h: 6 },
    dorsal: [0.14, 0.36, 4],
    front: (b) => {
      // long whiskers
      p.curve({ x: b.x0 + 1, y: b.cy + 0.6 }, { x: b.x0 - 2.4, y: b.cy - 1.2 }, { x: b.x0 - 5, y: b.cy - 4.2 }, p.outline, 0.9);
      p.curve({ x: b.x0 + 1, y: b.cy + 1.4 }, { x: b.x0 - 2.4, y: b.cy + 2.2 }, { x: b.x0 - 5.4, y: b.cy + 0.4 }, p.outline, 0.9);
      p.curve({ x: b.x0 + 1.2, y: b.cy + 2.2 }, { x: b.x0 - 1.4, y: b.cy + 4.4 }, { x: b.x0 - 3.6, y: b.cy + 5.4 }, p.outline, 0.8);
    },
  });

const rainbowTrout = (p: Pen) =>
  fish(p, {
    x0: 5, cy: 20, len: 22, hh: 8.4, ph: 3.2,
    body: '#84c7a9', belly: '#f8f3e8', fin: '#5fa98f',
    tail: { kind: 'fork', len: 8, h: 6 },
    dorsal: [0.12, 0.56, 4.5],
    marks: (b) => {
      p.line([{ x: b.x0, y: b.cy + 0.6 }, { x: b.x0 + b.len + 2, y: b.cy + 0.6 }], '#f47aa6', 2.4);
      speckle(p, 'trout-dots', 18, b.x0 + 2, b.x0 + b.len - 1, b.cy - b.hh, b.cy + b.hh * 0.5, 0.55, '#2c3b35');
    },
  });

const bass = (p: Pen) =>
  fish(p, {
    x0: 4, cy: 20, len: 23, hh: 9.6, ph: 3.8,
    body: '#5c9d3f', belly: '#eaf3b6', fin: '#3e7a2b',
    tail: { kind: 'fork', len: 8, h: 6.4 },
    dorsal: [0.1, 0.62, 5.5],
    eyeAt: 0.36,
    marks: (b) => {
      speckle(p, 'bass-moss', 16, b.x0 + 6, b.x0 + b.len, b.cy - b.hh, b.cy - 1, 1.1, '#2c5a24');
      p.line([{ x: b.x0 + 6, y: b.cy + 0.5 }, { x: b.x0 + b.len, y: b.cy - 1.2 }], '#2b4a25', 2);
    },
    front: (b) => {
      // a big gulping mouth
      shape(
        p,
        (c) => {
          c.moveTo(b.x0 - 0.5, b.cy - 1.2);
          c.quadraticCurveTo(b.x0 + 4, b.cy - 0.8, b.x0 + 6, b.cy + 1.2);
          c.quadraticCurveTo(b.x0 + 3, b.cy + 3, b.x0 - 0.5, b.cy + 1.8);
        },
        '#3b2a1f',
        null,
      );
    },
  });

const pondSmelt = (p: Pen) =>
  fish(p, {
    x0: 3, cy: 20, len: 26, hh: 4.4, ph: 1.8,
    body: '#9fbfdc', belly: '#fbfeff', fin: '#a9c8e2',
    tail: { kind: 'fork', len: 7, h: 4.6 },
    dorsal: [0.2, 0.5, 3],
    eyeR: 1.8,
    marks: (b) => {
      p.line([{ x: b.x0, y: b.cy + 0.2 }, { x: b.x0 + b.len, y: b.cy + 0.2 }], '#eef8ff', 1.1);
      for (const x of [b.x0 + 9, b.x0 + 15, b.x0 + 21]) sparkle(p, x, b.cy - 1.6, 1.1);
    },
  });

const goldfish = (p: Pen) =>
  fish(p, {
    x0: 6, cy: 20, len: 17, hh: 9.4, ph: 3.4,
    body: '#ff8a3a', belly: '#ffc57c', fin: '#ffab63',
    tail: { kind: 'fan', len: 11, h: 9.5 },
    dorsal: [0.2, 0.6, 4],
    eyeR: 2.9,
    front: (b) => {
      // the second, lighter veil of a fancy double tail
      shape(p, tailBuild(b, { kind: 'fan', len: 7, h: 6.2 }), '#ffd08c');
    },
  });

const koi = (p: Pen) =>
  fish(p, {
    x0: 4, cy: 20, len: 23, hh: 9.6, ph: 3.8,
    body: '#fff8f0', belly: '#ffffff', fin: '#ffdcc8',
    tail: { kind: 'fan', len: 8, h: 7 },
    dorsal: [0.14, 0.58, 4.5],
    marks: (b) => {
      p.ellipse(b.x0 + 7, b.cy - 3.2, 3.6, 2.6, '#e8443a', null, 0.3);
      p.ellipse(b.x0 + 14.5, b.cy + 1.8, 3.4, 2.4, '#e8443a', null, -0.2);
      p.ellipse(b.x0 + 12, b.cy - 6.4, 2.4, 1.8, '#e8443a', null);
      p.ellipse(b.x0 + 19, b.cy - 3, 1.8, 1.6, '#e8443a', null);
      p.circle(b.x0 + 18.5, b.cy + 4.5, 0.9, '#2b1b12', null);
    },
  });

const salmon = (p: Pen) =>
  fish(p, {
    x0: 4, cy: 20, len: 23, hh: 8.6, ph: 3.4,
    body: '#ff8a7a', belly: '#ffd7c9', fin: '#e5604f',
    tail: { kind: 'fork', len: 8, h: 6 },
    dorsal: [0.12, 0.56, 4.5],
    marks: (b) => speckle(p, 'salmon-spots', 14, b.x0 + 4, b.x0 + b.len, b.cy - b.hh, b.cy + 1, 0.65, '#3d2a2a'),
    front: (b) => {
      // the hooked lower jaw of a spawning salmon
      p.curve({ x: b.x0 + 4.5, y: b.cy + 2.8 }, { x: b.x0 + 1.5, y: b.cy + 3 }, { x: b.x0 + 0.2, y: b.cy + 0.6 }, p.outline, 1);
    },
  });

const pike = (p: Pen) =>
  fish(p, {
    x0: 2, cy: 20, len: 28, hh: 6.2, ph: 2.8,
    body: '#5f9f48', belly: '#f0eea6', fin: '#7fb55a',
    tail: { kind: 'fork', len: 6, h: 5.4 },
    dorsal: [0.5, 0.82, 3.5],
    eyeAt: 0.25,
    eyeR: 2.5,
    mouth: 'none',
    marks: (b) => speckle(p, 'pike-spots', 16, b.x0 + 4, b.x0 + 24, b.cy - b.hh * 0.9, b.cy + 0.6, 0.75, '#eef08a'),
    front: (b) => {
      // a toothy grin
      p.curve({ x: b.x0 + 0.2, y: b.cy + 0.6 }, { x: b.x0 + 4, y: b.cy + 2.6 }, { x: b.x0 + 9, y: b.cy + 1.6 }, INK, 1);
      for (const tx of [b.x0 + 2, b.x0 + 3.6, b.x0 + 5.2, b.x0 + 6.8, b.x0 + 8.2]) {
        const ty = b.cy + 0.6 + (tx - b.x0) * 0.11;
        shape(
          p,
          (c) => {
            c.moveTo(tx - 0.55, ty);
            c.lineTo(tx + 0.55, ty);
            c.lineTo(tx, ty + 1.4);
          },
          WHITE,
          p.outline,
          0.5,
        );
      }
    },
  });

const eel = (p: Pen) => {
  // a long wavy body built from tapering segments: outline, body, pale belly
  const N = 28;
  const pts: Pt[] = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    pts.push({ x: 11 + t * 25, y: 21 + Math.sin(t * Math.PI * 2.4 + 0.4) * 3.6 * (0.35 + 0.65 * t) });
  }
  const wid = (i: number) => 7.6 - 5.4 * (i / N);
  const body = '#3d7466';
  for (let i = 0; i < N; i++) p.line([pts[i], pts[i + 1]], p.outline, wid(i) + 1.8);
  for (let i = 0; i < N; i++) p.line([pts[i], pts[i + 1]], body, wid(i));
  for (let i = 0; i < N; i++) {
    const a = { x: pts[i].x, y: pts[i].y + wid(i) * 0.22 };
    const b = { x: pts[i + 1].x, y: pts[i + 1].y + wid(i) * 0.22 };
    p.line([a, b], '#d9eca8', wid(i) * 0.36);
  }
  // head: a rounder, friendlier front end
  const hx = pts[0].x;
  const hy = pts[0].y;
  p.circle(hx, hy, 5.8, p.outline, null);
  p.circle(hx, hy, 5.2, body, null);
  p.ellipse(hx - 0.3, hy + 2.6, 3.6, 1.8, '#d9eca8', null);
  eye(p, hx + 2.6, hy - 1.4, 2.3);
  blush(p, hx + 1.8, hy + 2, 1.5);
  p.curve({ x: hx - 2.6, y: hy + 1.6 }, { x: hx - 1.4, y: hy + 3 }, { x: hx + 0.2, y: hy + 2 }, INK, 0.6);
};

const sturgeon = (p: Pen) =>
  fish(p, {
    x0: 4, cy: 20, len: 26, hh: 7.6, ph: 3,
    body: '#8c949c', belly: '#e6e4da', fin: '#77808a',
    tail: null,
    dorsal: null,
    eyeR: 2.1,
    marks: (b) => {
      for (let x = b.x0 + 6; x < b.x0 + b.len; x += 4.2) p.ellipse(x, b.cy + 1.4, 0.9, 1.3, '#c8ced4', '#5e6670', 0.4);
    },
    behind: (b) => {
      // a shark-like upper tail lobe
      const xt = b.x0 + b.len;
      shape(
        p,
        (c) => {
          c.moveTo(xt - 1, b.cy - b.ph);
          c.lineTo(xt + 8, b.cy - 10.5);
          c.quadraticCurveTo(xt + 5.5, b.cy - 3, xt + 4, b.cy + 1);
          c.quadraticCurveTo(xt + 5, b.cy + 3.5, xt + 3.5, b.cy + 5.5);
          c.lineTo(xt - 1, b.cy + b.ph);
        },
        '#77808a',
      );
    },
    front: (b) => {
      // bony plates along the back
      for (let x = b.x0 + 4; x < b.x0 + b.len - 3; x += 3.3) {
        const y = b.cy - b.hh * 0.9;
        shape(
          p,
          (c) => {
            c.moveTo(x - 1.3, y + 0.5);
            c.lineTo(x, y - 2.4);
            c.lineTo(x + 1.3, y + 0.5);
          },
          '#c9cfd5',
          p.outline,
          0.7,
        );
      }
      // two little barbels under the snout
      p.curve({ x: b.x0 + 3.6, y: b.cy + 2.6 }, { x: b.x0 + 2.2, y: b.cy + 5 }, { x: b.x0 + 0.6, y: b.cy + 5.4 }, p.outline, 0.8);
      p.curve({ x: b.x0 + 5.4, y: b.cy + 2.6 }, { x: b.x0 + 4.6, y: b.cy + 5.4 }, { x: b.x0 + 3.2, y: b.cy + 6.2 }, p.outline, 0.8);
    },
  });

const goldenTrout = (p: Pen) =>
  fish(p, {
    x0: 5, cy: 20, len: 22, hh: 8.6, ph: 3.2,
    body: '#ffd24a', belly: '#fff1b0', fin: '#ffb020',
    tail: { kind: 'fork', len: 8, h: 6.6 },
    dorsal: [0.12, 0.58, 4.5],
    behind: (b) => p.glow(b.x0 + b.len * 0.5, b.cy, 17, '#ffe066', 0.5),
    marks: (b) => {
      speckle(p, 'gold-trout', 9, b.x0 + 3, b.x0 + b.len - 2, b.cy - b.hh * 0.9, b.cy + b.hh * 0.6, 0.55, '#c9781a');
      p.line([{ x: b.x0 + 2, y: b.cy - b.hh * 0.5 }, { x: b.x0 + b.len, y: b.cy - b.hh * 0.6 }], '#fff7c4', 1.1);
    },
    front: (b) => {
      sparkle(p, b.x0 + b.len + 7, b.cy - 9, 2.6);
      sparkle(p, b.x0 + 1, b.cy + 10, 1.6);
    },
  });

const starfin = (p: Pen) =>
  fish(p, {
    x0: 4, cy: 20, len: 22, hh: 9, ph: 3.6,
    body: '#2f4a92', belly: '#5b72b8', fin: '#3d5aa8',
    tail: { kind: 'fork', len: 8, h: 6.4 },
    dorsal: null,
    marks: (b) => {
      for (const [x, y] of [
        [b.x0 + 4, b.cy - 4],
        [b.x0 + 9, b.cy + 3],
        [b.x0 + 13, b.cy - 5],
        [b.x0 + 17, b.cy + 1],
        [b.x0 + 12, b.cy + 7],
        [b.x0 + 19, b.cy - 1],
      ])
        p.star(x, y, 1.3, '#fff0a8', null);
    },
    front: (b) => {
      // star-shaped dorsal fin and star tips on the tail
      p.star(b.x0 + 12, b.cy - b.hh - 2.4, 4.2, '#ffd95a', p.outline);
      p.star(b.x0 + b.len + 7, b.cy - 5, 2.4, '#ffd95a', p.outline);
      p.star(b.x0 + b.len + 7, b.cy + 5, 2.4, '#ffd95a', p.outline);
      sparkle(p, b.x0 + b.len + 4, b.cy, 1.8);
    },
  });

const goldenKoi = (p: Pen) =>
  fish(p, {
    x0: 4, cy: 20, len: 23, hh: 9.6, ph: 3.8,
    body: '#ffc23d', belly: '#fff0a0', fin: '#ffd76b',
    tail: { kind: 'fan', len: 8, h: 7.2 },
    dorsal: [0.14, 0.58, 4.5],
    marks: (b) => {
      p.ellipse(b.x0 + 9, b.cy - 4.2, 4.5, 1.2, rgba(WHITE, 0.8), null, -0.25);
      speckle(p, 'gold-koi-scales', 10, b.x0 + 4, b.x0 + b.len - 2, b.cy - b.hh, b.cy + b.hh, 0.6, '#e09a1e');
    },
    front: (b) => {
      sparkle(p, b.x0 + b.len + 6, b.cy - 9, 3.2);
      sparkle(p, b.x0 + 2, b.cy - 10, 1.9);
    },
  });

const coelacanth = (p: Pen) =>
  fish(p, {
    x0: 5, cy: 19, len: 21, hh: 10.5, ph: 4,
    body: '#2a4f8c', belly: '#4a6fb0', fin: '#2f5799',
    tail: null,
    dorsal: [0.14, 0.5, 3],
    eyeR: 2.7,
    mouth: 'o',
    behind: (b) => {
      const xt = b.x0 + b.len;
      // three-lobed tail
      shape(
        p,
        (c) => {
          c.moveTo(xt - 1, b.cy - b.ph);
          c.lineTo(xt + 7, b.cy - 8);
          c.lineTo(xt + 3.5, b.cy - 1.5);
          c.lineTo(xt + 9.5, b.cy + 0.5);
          c.lineTo(xt + 3.5, b.cy + 2);
          c.lineTo(xt + 7, b.cy + 8);
          c.lineTo(xt - 1, b.cy + b.ph);
        },
        '#2f5799',
      );
      // a fleshy lobed fin hanging below
      const fy = b.cy + b.hh + 2.8;
      p.line([{ x: b.x0 + 6, y: b.cy + b.hh * 0.6 }, { x: b.x0 + 6.5, y: fy - 1 }], p.outline, 2.6);
      p.line([{ x: b.x0 + 6, y: b.cy + b.hh * 0.6 }, { x: b.x0 + 6.5, y: fy - 1 }], '#2f5799', 1.4);
      p.ellipse(b.x0 + 6.5, fy + 0.6, 3.8, 2.2, '#2f5799', p.outline, -0.2);
      p.line([{ x: b.x0 + 4.2, y: fy + 1.4 }, { x: b.x0 + 8.4, y: fy + 0.2 }], p.outline, 0.5);
    },
    marks: (b) => speckle(p, 'coelacanth-flecks', 16, b.x0 + 2, b.x0 + b.len - 1, b.cy - b.hh, b.cy + b.hh * 0.8, 0.7, '#e9f4ff'),
    front: (b) => sparkle(p, b.x0 + b.len + 5, b.cy - 11, 2),
  });

const ghostFish = (p: Pen) =>
  fish(p, {
    x0: 5, cy: 20, len: 22, hh: 9.2, ph: 3.6,
    body: '#f7f4ff', belly: '#dcd7f2', fin: 'rgba(255,255,255,0.7)',
    outline: '#8a84b8',
    alpha: 0.85,
    tail: null,
    dorsal: null,
    behind: (b) => {
      p.glow(b.x0 + b.len * 0.5, b.cy, 18, '#c6d8ff', 0.4);
      // wavy ghostly tail
      const xs = b.x0 + b.len - 1.5;
      const xe = b.x0 + b.len + 8.5;
      shape(
        p,
        (c) => {
          c.moveTo(xs, b.cy - b.ph);
          c.quadraticCurveTo(xs + 4, b.cy - 7, xe, b.cy - 6);
          c.quadraticCurveTo(xe - 3.2, b.cy - 3.2, xe - 1.2, b.cy - 0.4);
          c.quadraticCurveTo(xe - 3.4, b.cy + 2.8, xe, b.cy + 6);
          c.quadraticCurveTo(xs + 4, b.cy + 7, xs, b.cy + b.ph);
        },
        'rgba(255,255,255,0.75)',
        '#8a84b8',
      );
    },
    marks: (b) => {
      p.ellipse(b.x0 + 7, b.cy - 4.6, 3, 1, WHITE, null, -0.4);
    },
  });

const iceFish = (p: Pen) =>
  fish(p, {
    x0: 5, cy: 20, len: 22, hh: 9, ph: 3.5,
    body: '#8fd6f2', belly: '#d6f4ff', fin: '#6cc3ea',
    tail: { kind: 'fork', len: 8, h: 6.4 },
    dorsal: [0.12, 0.56, 4.5],
    marks: (b) => {
      p.ellipse(b.x0 + b.len * 0.5, b.cy - b.hh * 1.1, b.len * 0.6, b.hh * 0.55, '#effbff', null);
      // snowflake marking
      const sx = b.x0 + 12.5;
      const sy = b.cy + 0.5;
      for (const a of [0, Math.PI / 3, (2 * Math.PI) / 3]) {
        const dx = Math.cos(a) * 3.8;
        const dy = Math.sin(a) * 3.8;
        p.line([{ x: sx - dx, y: sy - dy }, { x: sx + dx, y: sy + dy }], '#3f8fbd', 2.2);
        p.line([{ x: sx - dx, y: sy - dy }, { x: sx + dx, y: sy + dy }], WHITE, 1.1);
      }
      p.circle(sx, sy, 0.9, WHITE, null);
    },
  });

const heartGuppy = (p: Pen) =>
  fish(p, {
    x0: 6, cy: 20, len: 17, hh: 7, ph: 2.8,
    body: '#ff8fb6', belly: '#ffd3e2', fin: '#ff7fa9',
    tail: null,
    dorsal: [0.2, 0.6, 3.5],
    eyeR: 2.5,
    behind: (b) => {
      // heart-shaped tail, point against the body
      const hs = 4.2;
      const hx = b.x0 + b.len + 3 + 0.9 * hs;
      p.ctx.save();
      p.ctx.translate(hx, b.cy);
      p.ctx.rotate(Math.PI / 2);
      p.heart(0, 0, hs, '#ff7fa9', p.outline);
      p.ctx.restore();
    },
  });

const luckyMinnow = (p: Pen) =>
  fish(p, {
    x0: 8, cy: 20, len: 18, hh: 6, ph: 2.2,
    body: '#7fdc6a', belly: '#eafcd8', fin: '#5cc25a',
    tail: { kind: 'fork', len: 6.5, h: 5 },
    dorsal: [0.2, 0.56, 3],
    eyeR: 1.9,
    marks: (b) => {
      // a four-leaf clover on its side
      const cx = b.x0 + 8.5;
      const cy = b.cy - 0.2;
      for (const [dx, dy] of [
        [-1.5, 0],
        [1.5, 0],
        [0, -1.5],
        [0, 1.5],
      ])
        p.circle(cx + dx, cy + dy, 1.3, '#2f9446', null);
      p.circle(cx, cy, 0.9, '#2f9446', null);
    },
    front: (b) => sparkle(p, b.x0 + b.len + 1, b.cy - 6, 1.6),
  });

const sakuraTrout = (p: Pen) =>
  fish(p, {
    x0: 5, cy: 20, len: 22, hh: 8.4, ph: 3.2,
    body: '#ffc1d4', belly: '#fff2f7', fin: '#ff9dbd',
    tail: { kind: 'fork', len: 8, h: 6 },
    dorsal: [0.12, 0.56, 4.5],
    marks: (b) => {
      const rand = rng('sakura-petals');
      for (let i = 0; i < 9; i++) {
        const x = b.x0 + 3 + rand() * (b.len - 4);
        const y = b.cy - b.hh * 0.8 + rand() * b.hh * 1.5;
        for (let k = 0; k < 5; k++) {
          const a = (k / 5) * Math.PI * 2 - Math.PI / 2;
          p.circle(x + Math.cos(a) * 1.1, y + Math.sin(a) * 1.1, 0.8, '#ff6f98', null);
        }
        p.circle(x, y, 0.45, WHITE, null);
      }
    },
  });

const lanternFish = (p: Pen) =>
  fish(p, {
    x0: 8, cy: 22, len: 20, hh: 8.6, ph: 3.2,
    body: '#2f5a66', belly: '#7fb8b0', fin: '#264b56',
    tail: { kind: 'fork', len: 6, h: 5 },
    dorsal: [0.45, 0.8, 3],
    eyeR: 2.6,
    behind: (b) => {
      // the glow, then the lure stalk rising from the head
      p.glow(18, 7, 12, '#ffd36b', 0.6);
      stem(p, { x: b.x0 + 4.6, y: b.cy - b.hh * 0.9 }, { x: b.x0 + 4.4, y: b.cy - b.hh - 4 }, { x: b.x0 + 9.6, y: b.cy - b.hh - 5.6 }, '#5a4a3a', 0.9);
    },
    front: () => {
      // the paper-lantern lure
      p.ellipse(18, 7, 3.6, 4.2, p.vgrad(3, 11, '#ffe39a', '#f08a2e'));
      p.curve({ x: 15.6, y: 3.6 }, { x: 15, y: 7 }, { x: 15.6, y: 10.4 }, '#b5561f', 0.6);
      p.curve({ x: 20.4, y: 3.6 }, { x: 21, y: 7 }, { x: 20.4, y: 10.4 }, '#b5561f', 0.6);
      p.roundRect(16.2, 1.8, 3.6, 1.6, 0.6, '#5a2d1f', null);
      p.roundRect(16.2, 10.6, 3.6, 1.4, 0.6, '#5a2d1f', null);
      p.ellipse(16.4, 5.4, 0.7, 1.4, 'rgba(255,255,255,0.8)', null);
    },
  });

// ---------------------------------------------------------------------------
// Fish dishes (40x40, flat). Each sits on a plate with a cute face.

function plate(p: Pen, cx: number, cy: number, rx: number): void {
  const ry = rx * 0.3;
  p.ellipse(cx, cy + 2, rx, ry, shade('#e4ebf3', -0.14));
  p.ellipse(cx, cy, rx, ry, WHITE);
  p.ellipse(cx, cy, rx * 0.86, ry * 0.86, null, '#ffc4d4', 1.6);
  p.ellipse(cx, cy, rx * 0.66, ry * 0.66, null, rgba(INK, 0.2));
}

function lemonSlice(p: Pen, x: number, y: number, r: number): void {
  p.ellipse(x, y, r, r * 0.72, '#ffd23a');
  p.ellipse(x, y, r * 0.8, r * 0.58, '#fff6b8', null);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    p.line([{ x, y }, { x: x + Math.cos(a) * r * 0.66, y: y + Math.sin(a) * r * 0.47 }], '#ffd84a', 0.8);
  }
  p.circle(x, y, r * 0.14, '#ffe77a', null);
}

const fishTacos = (p: Pen) => {
  p.shadow(20, 35.5, 16, 3, 0.22);
  plate(p, 20, 31, 16);
  // the golden shell: a half-moon taco, seen from the side
  shape(
    p,
    (c) => {
      c.moveTo(5.5, 21);
      c.bezierCurveTo(6, 34, 34, 34, 34.5, 21);
      c.quadraticCurveTo(20, 16.5, 5.5, 21);
    },
    p.vgrad(17, 32, '#ffd66b', '#e09a33'),
  );
  p.curve({ x: 9.5, y: 25.5 }, { x: 12, y: 29 }, { x: 16.5, y: 30 }, shade('#e09a33', -0.25), 0.7);
  p.curve({ x: 30.5, y: 25.5 }, { x: 28, y: 29 }, { x: 23.5, y: 30 }, shade('#e09a33', -0.25), 0.7);
  // fish flakes heaped over the rim
  for (const [x, y] of [
    [12.5, 18.2],
    [19.5, 16.4],
    [26.5, 18],
  ] as const)
    p.ellipse(x, y, 3.2, 2, '#fff4ee', '#e8a890', 0.5);
  // lettuce on top, a tomato tucked in
  for (const [x, y, r] of [
    [9.6, 13.6, 2.6],
    [15.6, 11.6, 2.8],
    [21.6, 11.2, 2.6],
    [27.6, 12.4, 2.7],
    [31.4, 15.2, 2.2],
  ] as const)
    p.circle(x, y, r, '#8fd96a');
  p.circle(17.8, 14.4, 1.5, '#ff5d4f');
  kface(p, 20, 25.4, 1.05);
  sparkle(p, 35, 9, 2);
};

const fishAndChips = (p: Pen) => {
  p.shadow(20, 35.5, 17, 3, 0.22);
  plate(p, 21, 31, 17);
  // fries standing in a striped paper cup
  for (const [x, top] of [
    [26.5, 6],
    [29.6, 4.5],
    [32.7, 6.5],
  ] as const)
    p.roundRect(x, top, 1.9, 12, 0.8, '#ffd65c');
  shape(
    p,
    (c) => {
      c.moveTo(25, 16);
      c.lineTo(36, 16);
      c.lineTo(34.4, 29);
      c.lineTo(26.6, 29);
    },
    '#e8485a',
  );
  p.line([{ x: 28.4, y: 16.4 }, { x: 27.8, y: 28.8 }], WHITE, 1.4);
  p.line([{ x: 33.2, y: 16.4 }, { x: 32.8, y: 28.8 }], WHITE, 1.4);
  // golden battered fish fillet
  fish(p, {
    x0: 3, cy: 23, len: 15, hh: 6.4, ph: 2.8,
    body: '#f2b04a', belly: '#ffd98a', fin: '#e59a3a',
    tail: { kind: 'fork', len: 6, h: 5 },
    dorsal: [0.14, 0.56, 3],
    marks: (b) => speckle(p, 'batter', 14, b.x0 + 2, b.x0 + b.len, b.cy - b.hh, b.cy + b.hh, 0.55, '#cf8326'),
  });
};

const grilledTrout = (p: Pen) => {
  p.shadow(20, 35.5, 17, 3, 0.22);
  plate(p, 20, 31, 17);
  lemonSlice(p, 31, 29.4, 4.4);
  fish(p, {
    x0: 4, cy: 21, len: 24, hh: 7.6, ph: 3,
    body: '#e9a27a', belly: '#fff1d9', fin: '#d98a5a',
    tail: { kind: 'fork', len: 6.5, h: 5.5 },
    dorsal: [0.12, 0.56, 4],
    marks: (b) => {
      // grill marks
      for (let i = 0; i < 6; i++) {
        const x = b.x0 + 2 + i * 3.8;
        p.line([{ x, y: b.cy - b.hh }, { x: x + 3.6, y: b.cy + b.hh }], '#7a3d1e', 1.2);
      }
    },
  });
};

const salmonOnigiri = (p: Pen) => {
  p.shadow(20, 35.5, 14, 3, 0.22);
  const tri = (c: Ctx) => {
    c.moveTo(20, 5);
    c.lineTo(34, 33);
    c.lineTo(6, 33);
  };
  shape(p, tri, '#fffdf7', p.outline, 1.2);
  // seaweed band across the bottom
  clipped(p, tri, () => {
    p.rect(0, 27, 40, 8, '#2f4f38', null);
    p.line([{ x: 4, y: 28.2 }, { x: 36, y: 28.2 }], '#4f7a5a', 0.8);
  });
  // salmon filling
  p.roundRect(14, 18.6, 12, 6.4, 2.6, '#ff8b70');
  for (const y of [20.4, 22.6]) p.line([{ x: 16, y }, { x: 24, y: y + 0.3 }], '#ffc0a8', 0.8);
  speckle(p, 'onigiri-grains', 8, 10, 30, 9, 16, 0.5, '#e7e0cc');
  kface(p, 20, 14.2, 0.95);
};

// ---------------------------------------------------------------------------
// Fishing mini-game props

const bobber = (p: Pen) => {
  // ripple under the float
  p.ellipse(20, 33, 12, 3.6, '#bfe9fb', p.outline);
  p.ellipse(20, 33, 7.5, 2, '#e6f8ff', null);
  // fishing line
  p.line([{ x: 20, y: 1.5 }, { x: 20, y: 13.5 }], '#6b5444', 1);
  // a red-and-white float: white ball, red top half
  const cx = 20;
  const cy = 22;
  const r = 8.5;
  p.circle(cx, cy, r, WHITE, null);
  shape(
    p,
    (c) => {
      c.arc(cx, cy, r, Math.PI, 0);
    },
    '#e8483d',
    null,
  );
  p.circle(cx, cy, r, null, p.outline);
  p.ellipse(16.6, 18.4, 1.7, 0.95, rgba(WHITE, 0.85), null, -0.6);
  p.roundRect(18.6, 12.2, 2.8, 3.2, 1, '#fff3d6');
};

const splash = (p: Pen) => {
  // a ring of water
  p.ellipse(20, 28, 16, 5.6, '#8fd6f2', p.outline);
  p.ellipse(20, 28, 11, 3.4, '#d7f3ff', null);
  p.curve({ x: 12, y: 23 }, { x: 13, y: 17 }, { x: 18, y: 15.4 }, WHITE, 1.6);
  p.curve({ x: 28, y: 23 }, { x: 27, y: 17 }, { x: 22, y: 15.4 }, WHITE, 1.6);
  // droplets flicking up
  for (const [x, y, r] of [
    [11, 20, 2.4],
    [16, 12, 2.8],
    [24, 9, 3],
    [30, 15.6, 2.4],
    [8, 26, 1.5],
    [33, 25, 1.6],
    [20, 4.5, 1.4],
  ] as const) {
    p.circle(x, y, r, '#bfeaff');
    p.circle(x - r * 0.35, y - r * 0.35, r * 0.3, WHITE, null);
  }
};

const fishShadow = (p: Pen) => {
  // a dark, see-through fish silhouette seen from above
  const fill = 'rgba(28,54,56,0.42)';
  const b: Body = { x0: 6, cy: 20, len: 22, hh: 9, ph: 4 };
  shape(p, tailBuild(b, { kind: 'fork', len: 8, h: 7 }), fill, null);
  shape(p, bodyBuild(b), fill, null);
};

const reeds = (p: Pen) => {
  // muddy water under the clump
  p.ellipse(20, 34, 14, 4.2, '#6aa890');
  p.ellipse(20, 33.5, 10, 2.5, '#4f8a78', null);
  // long leaves
  const green = '#8fcf6e';
  blade(p, 14, 34, 9, 22, 1.8, green);
  blade(p, 26, 34, 32, 20, 1.8, green);
  blade(p, 20, 34, 15, 26, 1.4, '#7dbd60');
  blade(p, 22, 34, 30, 28, 1.3, '#7dbd60');
  // stalks with brown cattail heads
  const stalks: [number, number, number, number][] = [
    [14, 11.2, 4.5, 1],
    [18, 17.6, 1.8, 1],
    [22.5, 24.2, 6, 1],
    [27, 29.6, 9.5, 1],
    [20.5, 20.5, 15, 0],
  ];
  for (const [bx, tx, ty, head] of stalks) {
    stem(p, { x: bx, y: 34 }, { x: bx + (tx - bx) * 0.2, y: ty + 14 }, { x: tx, y: ty }, '#6cb35a', 1.2);
    if (!head) continue;
    p.roundRect(tx - 1.9, ty + 1.5, 3.8, 9.5, 1.9, p.vgrad(ty + 1.5, ty + 11, '#9b6a3e', '#5c3a1f'));
    p.line([{ x: tx - 0.9, y: ty + 3.2 }, { x: tx - 0.9, y: ty + 9.4 }], '#c99a64', 0.6);
  }
};

/** A tapered leaf from (x, y) up to (tx, ty), bulging w to each side. */
function blade(p: Pen, x: number, y: number, tx: number, ty: number, w: number, color: string): void {
  shape(
    p,
    (c) => {
      c.moveTo(x - w, y);
      c.quadraticCurveTo(x - w * 0.5 + (tx - x) * 0.4, (y + ty) / 2, tx, ty);
      c.quadraticCurveTo(x + w * 0.5 + (tx - x) * 0.4, (y + ty) / 2, x + w, y);
    },
    color,
  );
}

const lilyPad = (p: Pen) => {
  // ripples on the water
  p.ellipse(20, 26, 17.5, 9, null, '#8fd6ec');
  // the pad, with a notch cut out on the right
  p.arc(20, 25, 14, 0.35, Math.PI * 2 - 0.35, '#7ccb6b');
  for (let i = 0; i < 7; i++) {
    const a = 0.5 + (i / 6) * (Math.PI * 2 - 1.0);
    p.line([{ x: 20, y: 25 }, { x: 20 + Math.cos(a) * 12.5, y: 25 + Math.sin(a) * 12.5 }], '#b6ec9e', 0.7);
  }
  // a pink lily flower and a bud
  p.flower(18.5, 22.5, 4.2, '#ff9ec4', '#ffe066');
  p.ellipse(28, 16, 1.6, 2.6, '#ffb8d2', p.outline, 0.4);
};

const dock = (p: Pen) => {
  // water under the dock
  p.ellipse(20, 33.5, 17, 3.2, '#9ad8ee', p.outline);
  // front face (the thickness of the planks)
  p.rect(5, 22, 30, 4.5, '#8f5f36');
  // top planks, seen from slightly above
  for (let i = 0; i < 4; i++) {
    const y = 12 + i * 2.5;
    p.rect(5, y, 30, 2.5, i % 2 ? '#cf9760' : '#d9a46b');
    p.circle(8, y + 1.25, 0.45, '#6b4426', null);
    p.circle(32, y + 1.25, 0.45, '#6b4426', null);
  }
};

// ---------------------------------------------------------------------------
// Exports: the key set matches manifest.ts (nature_fish).

export const icons: IconSpec[] = [
  { key: 'icon:bluegill', paint: bluegill },
  { key: 'icon:minnow', paint: minnow },
  { key: 'icon:carp', paint: carp },
  { key: 'icon:perch', paint: perch },
  { key: 'icon:tadpole', paint: tadpole },
  { key: 'icon:crawfish', paint: crawfish },
  { key: 'icon:pumpkinseed', paint: pumpkinseed },
  { key: 'icon:catfish', paint: catfish },
  { key: 'icon:rainbow_trout', paint: rainbowTrout },
  { key: 'icon:bass', paint: bass },
  { key: 'icon:pond_smelt', paint: pondSmelt },
  { key: 'icon:goldfish', paint: goldfish },
  { key: 'icon:koi', paint: koi },
  { key: 'icon:salmon', paint: salmon },
  { key: 'icon:pike', paint: pike },
  { key: 'icon:eel', paint: eel },
  { key: 'icon:sturgeon', paint: sturgeon },
  { key: 'icon:golden_trout', paint: goldenTrout },
  { key: 'icon:starfin', paint: starfin },
  { key: 'icon:golden_koi', paint: goldenKoi },
  { key: 'icon:coelacanth', paint: coelacanth },
  { key: 'icon:ghost_fish', paint: ghostFish },
  { key: 'icon:ice_fish', paint: iceFish },
  { key: 'icon:heart_guppy', paint: heartGuppy },
  { key: 'icon:lucky_minnow', paint: luckyMinnow },
  { key: 'icon:sakura_trout', paint: sakuraTrout },
  { key: 'icon:lantern_fish', paint: lanternFish },

  { key: 'icon:fish_tacos', paint: fishTacos },
  { key: 'icon:fish_and_chips', paint: fishAndChips },
  { key: 'icon:grilled_trout', paint: grilledTrout },
  { key: 'icon:salmon_onigiri', paint: salmonOnigiri },

  { key: 'fishing:bobber', paint: bobber },
  { key: 'fishing:splash', paint: splash },
  { key: 'fishing:shadow', paint: fishShadow },
  { key: 'fishing:reeds', size: 64, paint: (p) => scaled(p, 1.6, () => reeds(p)) },
  { key: 'fishing:lily_pad', size: 64, paint: (p) => scaled(p, 1.6, () => lilyPad(p)) },
  { key: 'fishing:dock', size: 64, paint: (p) => scaled(p, 1.6, () => dock(p)) },
];
