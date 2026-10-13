// Grand Projects: the construction site that fills a grand landmark's footprint
// while it is being built (grand:site_3, grand:site_4), the wooden scaffolding
// that climbs a half-built landmark (grand:scaffold_3, grand:scaffold_4) and the
// Grand Projects badge (icon:grand).
// Same house style as feedmill.ts: pastel fills, the warm brown OUTLINE, top-left
// light and soft shading. The scaffold is see-through on purpose: only poles,
// planks, braces, a ladder and ropes, so the half-built building shows through.
import { type IconSpec, type Pen, type Pt, type SpriteSpec, rng, shade } from './kit';

type Fill = string | CanvasGradient | null;
type Face = (s: number, z: number) => Pt;
type Ground = (a: number, b: number, z?: number) => Pt;

const DIRT = '#f5dcaa';
const DIRT_L = '#e6c084';
const DIRT_D = '#c9a062';
const PEBBLE = '#dcb87c';
const PEBBLE_L = '#fff3d6';
const TRACK = 'rgba(150,104,56,0.4)';
const WOOD = '#d9a06a';
const WOOD_L = '#f0c28e';
const WOOD_D = '#a8703f';
const TWINE = '#c7985a';
const PINK = '#ffb3cf';
const BRICK = '#ffa2c4';
const BLUSH = '#ff8fb1';
const BLUSH_D = '#e77fa6';
const MINT = '#a8e6cf';
const MINT_D = '#7fcdb0';
const BUTTER = '#ffe9a0';
const LILAC = '#c9b8f5';
const BLUEPRINT = '#bfe3fb';
const CONE = '#ffab78';
const CREAM = '#fff8ee';
const STAR = '#ffd84a';
const RIBBON = '#ff7eb3';
const AQUA = '#9fe6f2';
const AQUA_D = '#6fd0e6';
const GLASS_HI = '#f4feff';
const TYRE = '#8a6a58';
const SOIL = '#c99a63';
const STRING = '#6a4a32';
const BRACE = '#c98f5c';
const WHITE = '#ffffff';
const FLAGS = [PINK, MINT, BUTTER, LILAC];

/** Thickness of the packed dirt pad. Everything standing on the site sits at z = GZ. */
const GZ = 3;
/** Height of the fence stakes and the rope tied across their tops. */
const STAKE = 13;
const ROPE_Z = 11;

// ---------------------------------------------------------------------------
// Helpers

function shape(p: Pen, build: (c: CanvasRenderingContext2D) => void, fill: Fill, stroke: string | null = p.outline, width = p.lineWidth): void {
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

/** A line with an outline underneath (poles, handles, rails). */
function thick(p: Pen, pts: Pt[], color: string, w: number): void {
  p.line(pts, p.outline, w + 2);
  p.line(pts, color, w);
}

/** A four-point twinkle, centred at (x, y). */
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

/** One diagonal pair of an X brace across a panel of a face. */
function brace(p: Pen, face: Face, s0: number, s1: number, z0: number, z1: number): void {
  p.line([face(s0, z0), face(s1, z1)], BRACE, 1.2);
  p.line([face(s1, z0), face(s0, z1)], BRACE, 1.2);
}

// ---------------------------------------------------------------------------
// The construction site (3x3 and 4x4)

/**
 * A rope-and-stake fence run from footprint fraction (a0, b0) to (a1, b1), with a
 * pastel pennant hanging from the rope over each span.
 */
function fenceRun(p: Pen, ga: Ground, a0: number, b0: number, a1: number, b1: number, spans: number, flagStart: number): void {
  const at = (t: number, z: number): Pt => ga(a0 + (a1 - a0) * t, b0 + (b1 - b0) * t, z);
  for (let i = 0; i <= spans; i++) {
    const t = i / spans;
    const base = at(t, 0);
    const top = at(t, STAKE);
    p.roundRect(base.x - 1.5, top.y, 3, base.y - top.y, 1.2, WOOD);
  }
  for (let i = 0; i < spans; i++) {
    const A = at(i / spans, ROPE_Z);
    const B = at((i + 1) / spans, ROPE_Z);
    const mx = (A.x + B.x) / 2;
    const my = (A.y + B.y) / 2;
    // the control point sags the rope by 2.5px at its middle
    const c = { x: mx, y: my + 5 };
    p.curve(A, c, B, p.outline, 2.6);
    p.curve(A, c, B, TWINE, 1.3);
    const m = { x: mx, y: my + 2.5 };
    p.poly(
      [
        { x: m.x - 2.6, y: m.y - 0.4 },
        { x: m.x + 2.6, y: m.y - 0.4 },
        { x: m.x, y: m.y + 4.2 },
      ],
      FLAGS[(i + flagStart) % FLAGS.length],
    );
  }
}

/** A sign board on two legs, its face a pale blueprint with a little white house drawn on it. */
function signBoard(p: Pen): void {
  const { fw, fh } = p;
  const vB = 0.2 * fh;
  const uA = 0.34 * fw;
  const uB = uA + 1.2;
  const pt = (s: number, z: number): Pt => p.iso(s, vB, GZ + z);
  const poly = (s0: number, s1: number, z0: number, z1: number, fill: Fill, stroke: string | null = p.outline): void =>
    p.poly([pt(s0, z0), pt(s1, z0), pt(s1, z1), pt(s0, z1)], fill, stroke);

  // legs and cross-bar sit behind the board, standing on the pad
  for (const s of [uA + 0.2, uB - 0.2]) thick(p, [pt(s, 20), pt(s, 0)], WOOD, 2.4);
  thick(p, [pt(uA + 0.2, 9), pt(uB - 0.2, 9)], WOOD, 2);

  // wooden frame, then the blueprint
  poly(uA - 0.06, uB + 0.06, 18, 52, WOOD);
  poly(uA, uB, 21, 49, BLUEPRINT);
  const mid = (uA + uB) / 2;
  p.line([pt(uA + 0.2, 29), pt(uB - 0.2, 29)], WHITE, 1);
  p.line(
    [pt(uA + 0.35, 29), pt(uA + 0.35, 38), pt(mid, 45), pt(uB - 0.35, 38), pt(uB - 0.35, 29)],
    WHITE,
    0.9,
  );
  p.line([pt(uA + 0.2, 24), pt(uB - 0.2, 24)], 'rgba(255,255,255,0.85)', 0.6);
  p.line([pt(uA + 0.2, 23), pt(uA + 0.2, 25)], WHITE, 0.6);
  p.line([pt(uB - 0.2, 23), pt(uB - 0.2, 25)], WHITE, 0.6);
}

/** A stack of six planks: three layers of two, the top layer lighter. */
function plankStack(p: Pen, u0: number, v0: number): void {
  for (let k = 0; k < 3; k++) {
    const shift = k % 2 ? 0.12 : 0;
    for (let j = 0; j < 2; j++) {
      const colour = k === 2 ? WOOD_L : j ? WOOD : WOOD_L;
      p.box(u0 + shift, v0 + j * 0.28, 0.92, 0.24, 2.8, colour, GZ + 2.8 * k);
    }
  }
}

/** A little pyramid of pink bricks. */
function brickPile(p: Pen, u0: number, v0: number): void {
  const layers: [number, number][][] = [
    [
      [0, 0],
      [0.36, 0],
      [0.72, 0],
      [0.18, 0.22],
      [0.54, 0.22],
    ],
    [
      [0.18, 0.02],
      [0.54, 0.02],
      [0.36, 0.22],
    ],
    [[0.36, 0.1]],
  ];
  layers.forEach((layer, k) => {
    for (const [du, dv] of layer) p.box(u0 + du, v0 + dv, 0.34, 0.2, 3.6, BRICK, GZ + 3.6 * k);
  });
}

/** A pink toolbox with a carry handle, on the front-left. */
function toolbox(p: Pen, u0: number, v0: number): void {
  const du = 0.42;
  const dv = 0.26;
  const g = (u: number, v: number, z = 0): Pt => p.iso(u, v, GZ + z);
  p.box(u0, v0, du, dv, 6, BLUSH, GZ);
  p.line([g(u0, v0 + dv, 3.6), g(u0 + du, v0 + dv, 3.6)], shade(BLUSH, -0.25), 0.8);
  p.line([g(u0 + du, v0, 3.6), g(u0 + du, v0 + dv, 3.6)], shade(BLUSH, -0.25), 0.8);
  thick(p, [g(u0 + 0.12, v0 + 0.13, 6), g(u0 + 0.21, v0 + 0.13, 11.5), g(u0 + 0.3, v0 + 0.13, 6)], BLUSH_D, 1.6);
  const latch = g(u0 + du, v0 + 0.13, 3);
  p.circle(latch.x, latch.y, 0.9, CREAM, null);
}

/** A little wheelbarrow with soil heaped in its mint tub. */
function wheelbarrow(p: Pen): void {
  const { fw, fh } = p;
  const u0 = 0.42 * fw;
  const v0 = 0.56 * fh;
  const du = 0.6;
  const dv = 0.5;
  const g = (u: number, v: number, z = 0): Pt => p.iso(u, v, GZ + z);
  // handles reach back to the ground, behind the tub
  for (const v of [v0 + 0.1, v0 + dv - 0.1]) thick(p, [g(u0 + 0.05, v, 11), g(u0 - 0.55, v, 1)], WOOD, 2.2);
  p.box(u0, v0, du, dv, 7, MINT, GZ + 4);
  const soil = g(u0 + du / 2, v0 + dv / 2, 11);
  p.ellipse(soil.x, soil.y, 8, 4, SOIL, p.outline);
  p.circle(soil.x - 2.5, soil.y, 0.9, PEBBLE, null);
  p.circle(soil.x + 2.2, soil.y + 0.6, 0.8, PEBBLE_L, null);
  // the single wheel on the low front side
  const w = g(u0 + du * 0.9, v0 + dv / 2, 5.2);
  p.circle(w.x, w.y, 5.2, TYRE);
  p.circle(w.x, w.y, 2.4, WOOD_L, null);
  p.circle(w.x, w.y, 0.9, WOOD_D, null);
}

/** A striped traffic-cone-style post standing on the ground at ground point (x, y). */
function stripedCone(p: Pen, a: number, b: number): void {
  const H = 22;
  const R = 6;
  const c = p.iso(a * p.fw, b * p.fh, GZ);
  const half = (h: number): number => R * (1 - h / H);
  const tip = { x: c.x, y: c.y - H };
  p.ellipse(c.x, c.y, R + 1.2, (R + 1.2) / 2, shade(CONE, -0.3));
  const body = (cx: CanvasRenderingContext2D): void => {
    cx.moveTo(c.x - R, c.y);
    cx.lineTo(tip.x, tip.y);
    cx.lineTo(c.x + R, c.y);
    cx.quadraticCurveTo(c.x, c.y + R * 0.5, c.x - R, c.y);
    cx.closePath();
  };
  shape(p, body, CONE, null);
  for (const [h0, h1] of [
    [5, 9.5],
    [13, 17.5],
  ]) {
    const y0 = c.y - h0;
    const y1 = c.y - h1;
    p.poly(
      [
        { x: c.x - half(h0), y: y0 },
        { x: c.x + half(h0), y: y0 },
        { x: c.x + half(h1), y: y1 },
        { x: c.x - half(h1), y: y1 },
      ],
      CREAM,
      null,
    );
  }
  shape(p, body, null);
  p.circle(tip.x, tip.y + 0.6, 1.3, CONE);
}

function site(p: Pen): void {
  const { fw, fh } = p;
  // tile coordinates, lifted onto the pad
  const g = (u: number, v: number, z = 0): Pt => p.iso(u, v, GZ + z);
  // footprint fractions (a, b in 0..1), lifted onto the pad
  const ga: Ground = (a, b, z = 0) => g(a * fw, b * fh, z);

  // packed dirt pad covering the whole footprint diamond
  p.box(0, 0, fw, fh, GZ, { top: DIRT, left: DIRT_L, right: DIRT_D });
  const rand = rng('grand-site');
  for (let i = 0; i < fw * fh * 10; i++) {
    const q = g((0.05 + rand() * 0.9) * fw, (0.05 + rand() * 0.9) * fh);
    const r = rand();
    p.ellipse(q.x, q.y, 1.2 + r * 0.7, 0.7 + r * 0.35, r > 0.5 ? PEBBLE : PEBBLE_L, null);
  }
  // two tyre tracks worn through the dirt
  for (const b of [0.36, 0.52]) p.curve(ga(0.04, b), ga(0.5, b + 0.08), ga(0.96, b - 0.04), TRACK, 1.4);

  // the back fence, then the things on the site, back to front
  const spans = fw + 1;
  fenceRun(p, ga, 0.04, 0.04, 0.04, 0.96, spans, 0);
  fenceRun(p, ga, 0.04, 0.04, 0.96, 0.04, spans, 1);
  signBoard(p);
  plankStack(p, 0.12 * fw, 0.44 * fh);
  brickPile(p, 0.6 * fw, 0.1 * fh);
  toolbox(p, 0.1 * fw, 0.74 * fh);
  wheelbarrow(p);
  stripedCone(p, 0.86, 0.72);

  // the front fence, drawn last so it runs in front of the site
  fenceRun(p, ga, 0.96, 0.96, 0.04, 0.96, spans, 2);
  fenceRun(p, ga, 0.96, 0.04, 0.96, 0.96, spans, 3);
}

// ---------------------------------------------------------------------------
// The scaffolding (3x3 and 4x4)

/**
 * Wooden scaffolding drawn in front of a half-built landmark. Only the two front
 * faces are drawn (the back of the frame would show across the building): poles at
 * the left point, the front corner, the right point and the middle of each front
 * face, thin walkway boards every 40px all the way up, X braces between the poles,
 * a ladder leaning on the front-right face, a pulley and bucket on the front corner
 * pole and a pennant on the top of the left pole. Nothing is filled, so the building
 * shows through between the timber.
 */
function scaffold(p: Pen): void {
  const { fw, fh, height: H } = p;
  // The side points sit at the top of the canvas: their screen y is H + fh*16 - TOP,
  // so this puts the top of the left and right poles 14px below the canvas top.
  const TOP = H + fh * 16 - 14;
  const LEVEL = 40; // walkway spacing: the rhythm runs the whole height
  const P = (u: number, v: number, z = 0): Pt => p.iso(u, v, z);
  // the frame is inset from the footprint's left, front and right points so no pole is cut by the canvas edge
  const E = 0.2;
  const RU = fw - E; // the front-right face
  const FV = fh - E; // the front-left face

  // the walkway levels, plus the top of the poles
  const levels: number[] = [];
  for (let z = 0; z < TOP; z += LEVEL) levels.push(z);
  levels.push(TOP);

  // X braces on the two front faces, one X per panel between walkways
  const frontLeft: Face = (s, z) => P(s, FV, z); // runs along u
  const frontRight: Face = (s, z) => P(RU, s, z); // runs along v
  for (let k = 0; k + 1 < levels.length; k++) {
    const z0 = levels[k];
    const z1 = levels[k + 1];
    brace(p, frontLeft, E, fw / 2, z0, z1);
    brace(p, frontLeft, fw / 2, RU, z0, z1);
    brace(p, frontRight, E, fh / 2, z0, z1);
    brace(p, frontRight, fh / 2, FV, z0, z1);
  }

  // walkway boards along the two front faces only: thin boards, one row per level
  const t = 0.14;
  for (let z = LEVEL; z + 2 <= TOP; z += LEVEL) {
    p.box(E, FV - t, RU - E, t, 2, WOOD_L, z); // front-left face, left point to front corner
    p.box(RU - t, E, t, FV - E, 2, WOOD_L, z); // front-right face, front corner to right point
  }

  // poles: left point, middle and front corner of the front-left face, then the right point
  // and the middle of the front-right face, all the way to the top
  const poles: [number, number][] = [
    [E, FV],
    [fw / 2, FV],
    [RU, FV],
    [RU, fh / 2],
    [RU, E],
  ];
  for (const [u, v] of poles) thick(p, [P(u, v, 0), P(u, v, TOP)], WOOD, 2.6);

  // a ladder leaning on the front-right side, its feet outside the scaffold
  const LTOP = 204;
  const lu0 = RU + 0.36;
  const lu1 = RU + 0.04;
  const lv0 = fh * 0.58;
  const lv1 = lv0 + 0.3;
  for (let z = 12; z < LTOP - 4; z += 10) {
    const u = lu0 + (lu1 - lu0) * (z / LTOP);
    p.line([P(u, lv0, z), P(u, lv1, z)], WOOD_D, 1.3);
  }
  thick(p, [P(lu0, lv0, 0), P(lu1, lv0, LTOP)], WOOD_L, 2.2);
  thick(p, [P(lu0, lv1, 0), P(lu1, lv1, LTOP)], WOOD_L, 2.2);

  // a pulley on a bracket at the top of the front corner, with a bucket on its rope
  const mount = P(RU + 0.3, FV + 0.3, TOP);
  thick(p, [P(RU, FV, TOP), mount], WOOD, 2.2);
  p.circle(mount.x, mount.y + 4, 4.2, WOOD_L);
  p.circle(mount.x, mount.y + 4, 1.3, WOOD_D, null);
  const bx = mount.x + 2.8;
  const by = P(RU + 0.3, FV + 0.3, TOP - 34).y;
  p.line([{ x: bx, y: mount.y + 4 }, { x: bx, y: by }], STRING, 1.1);
  p.poly(
    [
      { x: bx - 5, y: by },
      { x: bx + 5, y: by },
      { x: bx + 3.6, y: by + 8.5 },
      { x: bx - 3.6, y: by + 8.5 },
    ],
    MINT,
  );
  p.curve({ x: bx - 5, y: by }, { x: bx, y: by - 7 }, { x: bx + 5, y: by }, p.outline, 1.1);
  p.line([{ x: bx - 5.4, y: by }, { x: bx + 5.4, y: by }], MINT_D, 1.6);

  // a small pennant on top of the left pole, the highest point of the frame
  const staffBase = P(E, FV, TOP);
  const staffTop = P(E, FV, TOP + 10);
  thick(p, [staffBase, staffTop], WOOD, 1.8);
  p.poly(
    [
      staffTop,
      { x: staffTop.x + 12, y: staffTop.y + 3.5 },
      { x: staffTop.x, y: staffTop.y + 7 },
    ],
    PINK,
  );
}

// ---------------------------------------------------------------------------
// Grand Projects badge (40 px icon)

/** A tall arched window whose bottom-centre is (x0 + w/2, yb). */
function archWindow(p: Pen, x0: number, yb: number, w: number, h: number): void {
  shape(
    p,
    (c) => {
      c.moveTo(x0, yb);
      c.lineTo(x0, yb - h + w / 2);
      c.arc(x0 + w / 2, yb - h + w / 2, w / 2, Math.PI, Math.PI * 2);
      c.lineTo(x0 + w, yb);
      c.closePath();
    },
    MINT,
    p.outline,
    1,
  );
  p.line([{ x: x0 + 1, y: yb - h * 0.45 }, { x: x0 + 1, y: yb - 1.2 }], WHITE, 0.7);
}

function grandBadge(p: Pen): void {
  // the dome sits on the drum's top edge at y = 17
  const DOME_Y = 17;
  const dome = (c: CanvasRenderingContext2D): void => {
    c.moveTo(10, DOME_Y);
    c.arc(20, DOME_Y, 10, Math.PI, Math.PI * 2);
    c.closePath();
  };

  // glass dome, aqua with a bright top-left sheen
  const g = p.ctx.createLinearGradient(12, 8, 28, DOME_Y);
  g.addColorStop(0, GLASS_HI);
  g.addColorStop(0.55, AQUA);
  g.addColorStop(1, AQUA_D);
  shape(p, dome, g, null);
  // mint frame, with its ribs
  shape(p, dome, null, p.outline, 3.4);
  shape(p, dome, null, MINT, 2.2);
  p.line([{ x: 20, y: 7.4 }, { x: 20, y: DOME_Y }], MINT, 1.2);
  p.curve({ x: 13.5, y: DOME_Y }, { x: 13, y: 11 }, { x: 20, y: 7.4 }, MINT, 1.2);
  p.curve({ x: 26.5, y: DOME_Y }, { x: 27, y: 11 }, { x: 20, y: 7.4 }, MINT, 1.2);
  p.ellipse(15, 12.5, 1.2, 3, 'rgba(255,255,255,0.85)', null, 0.35);

  // cream drum wall under the dome
  p.roundRect(7, DOME_Y, 26, 17, 2.5, CREAM);
  // two arched mint windows, and a tiny door between them
  archWindow(p, 9, 32, 4.5, 7.5);
  archWindow(p, 26.5, 32, 4.5, 7.5);
  p.roundRect(18, 26, 4, 7, 1.2, WOOD);
  p.circle(21.1, 29.6, 0.5, BUTTER, null);

  // pink ribbon banner draped across the front of the wall
  shape(
    p,
    (c) => {
      c.moveTo(7, 19);
      c.quadraticCurveTo(20, 25, 33, 19);
      c.lineTo(33, 22);
      c.quadraticCurveTo(20, 28, 7, 22);
      c.closePath();
    },
    RIBBON,
  );
  p.curve({ x: 9, y: 20.6 }, { x: 20, y: 26.6 }, { x: 31, y: 20.6 }, 'rgba(255,255,255,0.55)', 0.8);

  // small grassy base the drum stands on
  p.ellipse(20, 34, 17, 3.6, '#8fd46a');
  p.circle(11, 35.5, 0.7, '#b9ec8e', null);
  p.circle(29, 36, 0.7, '#b9ec8e', null);

  // gold star on top of the dome, and two sparkles
  p.star(20, 4.4, 3.4, STAR);
  sparkle(p, 3.5, 13, 2.4, WHITE);
  sparkle(p, 36.5, 11, 2.2, '#fff1a8');
}

// ---------------------------------------------------------------------------
// Exports

export const sprites: SpriteSpec[] = [
  { key: 'grand:site_3', fw: 3, fh: 3, height: 70, paint: site },
  { key: 'grand:site_4', fw: 4, fh: 4, height: 70, paint: site },
  { key: 'grand:scaffold_3', fw: 3, fh: 3, height: 230, paint: scaffold },
  { key: 'grand:scaffold_4', fw: 4, fh: 4, height: 180, paint: scaffold },
];

export const icons: IconSpec[] = [
  { key: 'icon:grand', paint: grandBadge },
  // The same badge on the HUD's Grand Projects button.
  { key: 'ui:grand', paint: grandBadge },
];
