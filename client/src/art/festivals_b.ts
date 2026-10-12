// Festival set B: Thanksgiving (2), Winter (4) and the year-round party collection (11).
// Chunky, cheerful, kawaii: round shapes, dot-eyed faces, warm palettes, a light
// from the top-left with highlights. Footprints always come from the content
// definition, so each painter only lays out its own shapes.
import { type IconSpec, type Pen, type Pt, type SpriteSpec, OUTLINE, rgba, rng, shade } from './kit';
import { FESTIVAL_DECORATIONS } from '@farm/shared';

const O = OUTLINE;
const TAU = Math.PI * 2;
const WOOD = '#b07a4a';
const WOOD_DK = '#7a4b2e';
const GOLD = '#f4c24a';
const DARK = '#2b1d18';

type Painter = (p: Pen) => void;

// ---------------------------------------------------------------------------
// Helpers

function radial(p: Pen, x: number, y: number, r: number, inner: string, outer: string): CanvasGradient {
  const g = p.ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r);
  g.addColorStop(0, inner);
  g.addColorStop(1, outer);
  return g;
}

function hgrad(p: Pen, x0: number, x1: number, left: string, right: string): CanvasGradient {
  const g = p.ctx.createLinearGradient(x0, 0, x1, 0);
  g.addColorStop(0, left);
  g.addColorStop(1, right);
  return g;
}

/** An outlined thick stroke (branches, ribbon tails). */
function thick(p: Pen, pts: Pt[], w: number, color: string): void {
  p.line(pts, O, w + 1.6);
  p.line(pts, color, w);
}

function withXform(p: Pen, x: number, y: number, rot: number, fn: () => void): void {
  const ctx = p.ctx;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  fn();
  ctx.restore();
}

/** Kawaii face: glossy dot eyes, a small smile and pink blush. s scales it all. */
function face(p: Pen, x: number, y: number, s = 1): void {
  for (const dx of [-1.7, 1.7]) {
    const ex = x + dx * s;
    p.ellipse(ex, y, 1.05 * s, 1.3 * s, DARK, null);
    p.circle(ex + 0.4 * s, y - 0.5 * s, 0.42 * s, '#ffffff', null);
  }
  p.curve({ x: x - 1.1 * s, y: y + 1.5 * s }, { x, y: y + 2.9 * s }, { x: x + 1.1 * s, y: y + 1.5 * s }, DARK, Math.max(0.6, 0.6 * s));
  for (const dx of [-3.4, 3.4]) p.ellipse(x + dx * s, y + 1.2 * s, 1.2 * s, 0.75 * s, rgba('#ff7a9a', 0.75), null);
}

/** A small table: four legs and a box top whose surface sits at legHt + 3. */
function table(p: Pen, u0: number, v0: number, du: number, dv: number, legHt: number, top: string): void {
  const l = 0.07;
  const i0 = 0.02;
  const legs: [number, number][] = [
    [u0 + i0, v0 + i0],
    [u0 + du - l - i0, v0 + i0],
    [u0 + i0, v0 + dv - l - i0],
    [u0 + du - l - i0, v0 + dv - l - i0],
  ];
  for (const [u, v] of legs) p.box(u, v, l, l, legHt, WOOD_DK);
  p.box(u0, v0, du, dv, 3, top, legHt);
}

/** A flat paper leaf with a midrib, base at (x, y). */
function paperLeaf(p: Pen, x: number, y: number, len: number, ang: number, color: string): void {
  withXform(p, x, y, ang, () => {
    const c = p.ctx;
    c.beginPath();
    c.moveTo(0, 0);
    c.quadraticCurveTo(len * 0.5, -len * 0.5, len, 0);
    c.quadraticCurveTo(len * 0.5, len * 0.5, 0, 0);
    c.closePath();
    c.fillStyle = color;
    c.fill();
    c.strokeStyle = O;
    c.lineWidth = 0.8;
    c.stroke();
    c.beginPath();
    c.moveTo(0.8, 0);
    c.lineTo(len * 0.8, 0);
    c.strokeStyle = rgba(O, 0.5);
    c.lineWidth = 0.5;
    c.stroke();
  });
}

// ---------------------------------------------------------------------------
// Thanksgiving

/** Canvas point on the ground → footprint-local tile coords. */
function toUV(p: Pen, x: number, y: number): { u: number; v: number } {
  const d = (x - p.fh * 32) / 32;
  const s = (y - p.height) / 16;
  return { u: (s + d) / 2, v: (s - d) / 2 };
}

/** An iso box whose base is centred on a canvas ground point. */
function boxAt(p: Pen, x: number, y: number, du: number, dv: number, ht: number, color: string, z = 0): void {
  const { u, v } = toUV(p, x, y);
  p.box(u - du / 2, v - dv / 2, du, dv, ht, color, z);
}

/** Small bare tree hung with paper autumn leaves and tiny hearts. */
function gratitudeTree(p: Pen): void {
  const { x, y } = p.center;
  const at = (dx: number, dy: number): Pt => ({ x: x + dx, y: y + dy });
  p.shadow(x, y + 1, 16, 6);
  p.ellipse(x, y + 0.5, 6, 2.6, '#8a5f3e', O);
  // tapered trunk with a little face
  p.poly([at(-4, 1), at(-2.2, -26), at(2.2, -26), at(4, 1)], hgrad(p, x - 4, x + 4, shade(WOOD, 0.15), shade(WOOD, -0.25)));
  face(p, x, y - 14, 0.7);
  // bare branches
  const branches: Pt[][] = [
    [at(0, -24), at(-8, -36), at(-15, -42)],
    [at(0, -24), at(9, -34), at(16, -41)],
    [at(0, -30), at(-1, -44), at(2, -52)],
    [at(-8, -36), at(-12, -48)],
    [at(9, -34), at(12, -46)],
  ];
  for (const br of branches) thick(p, br, 2.4, '#8a5f3e');
  // paper leaves hung from the twigs, back to front
  const leaves: [number, number, number, string][] = [
    [-8, -33, -2.0, '#f4c24a'],
    [-4, -40, -2.9, '#ffb13a'],
    [6, -39, -0.2, '#e8553a'],
    [11, -31, 0.4, '#ff9d2e'],
    [-15, -42, -2.6, '#e8553a'],
    [-11, -48, -2.2, '#ff9d2e'],
    [12, -46, -0.9, '#d9622b'],
    [16, -41, -0.5, '#f4c24a'],
    [2, -52, -1.6, '#c8423a'],
  ];
  leaves.sort((a, b) => a[1] - b[1]);
  leaves.forEach(([dx, dy, ang, col], i) => {
    const lx = x + dx;
    const ly = y + dy;
    paperLeaf(p, lx, ly, 8, ang, col);
    if (i % 3 === 0) {
      p.heart(lx + Math.cos(ang) * 4.5, ly + Math.sin(ang) * 4.5, 1.5, '#ff5b7f');
    }
  });
  // a few tiny hearts drifting from the tips
  p.heart(x - 19, y - 34, 1.6, '#ff5b7f');
  p.heart(x + 20, y - 28, 1.3, '#ff8fa8');
  p.heart(x + 4, y - 60, 1.3, '#e5344f');
}

/** A gold, silver or bronze rosette with its ribbon tails, centred on (x, y). */
function rosette(p: Pen, x: number, y: number, color: string, label: string): void {
  p.poly([{ x: x - 1, y }, { x: x - 2.9, y: y + 5.2 }, { x: x - 0.6, y: y + 3.8 }], shade(color, -0.15));
  p.poly([{ x: x + 1, y }, { x: x + 2.9, y: y + 5.2 }, { x: x + 0.6, y: y + 3.8 }], shade(color, -0.15));
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * TAU;
    p.circle(x + Math.cos(a) * 2.4, y + Math.sin(a) * 2.4, 2.5, radial(p, x, y, 5, shade(color, 0.35), color), O);
  }
  p.circle(x, y, 2.4, shade(color, 0.12), null);
  p.text(label, x, y + 0.2, 4.6, DARK);
}

/** A round fruit pie on a crust dish, top at (x, y - dish). */
function pie(p: Pen, x: number, y: number, r: number, filling: string, crust: string): void {
  const dish = 3.5;
  p.cylinder(x, y, r, dish, crust);
  const ty = y - dish;
  p.ellipse(x, ty, r, r / 2, radial(p, x, ty, r, shade(crust, 0.25), crust));
  p.ellipse(x, ty, r * 0.72, r * 0.36, filling, null);
  // lattice crust across the filling
  const c = p.ctx;
  c.save();
  c.beginPath();
  c.ellipse(x, ty, r * 0.72, r * 0.36, 0, 0, TAU);
  c.clip();
  for (const k of [-0.5, 0, 0.5]) {
    const cy = ty + k * r * 0.6;
    p.line([{ x: x - r, y: cy - r * 0.4 }, { x: x + r, y: cy + r * 0.4 }], rgba('#fff3d6', 0.85), 0.9);
    p.line([{ x: x - r, y: cy + r * 0.4 }, { x: x + r, y: cy - r * 0.4 }], rgba('#fff3d6', 0.85), 0.9);
  }
  c.restore();
  p.ellipse(x - r * 0.3, ty - r * 0.15, r * 0.22, r * 0.1, rgba('#ffffff', 0.6), null, -0.4);
}

/** Three pies on a table, each with a ribbon rosette for 1st, 2nd and 3rd place. */
function pieContest(p: Pen): void {
  const c = p.center;
  p.shadow(c.x, c.y + 3, 30, 12);
  const legHt = 9;
  table(p, 0.06, 0.06, 0.88, 0.88, legHt, '#f6d7a7');
  const z = legHt + 3;
  const ribbons = { gold: '#f4c24a', silver: '#c9d3dc', bronze: '#d9896a' };
  // back-to-front by depth (u + v)
  const pies = [
    { u: 0.5, v: 0.4, r: 9, filling: '#c8423a', rank: '1', ribbon: ribbons.gold },
    { u: 0.26, v: 0.66, r: 7.5, filling: '#e8a33a', rank: '2', ribbon: ribbons.silver },
    { u: 0.74, v: 0.66, r: 7.5, filling: '#5a4fa8', rank: '3', ribbon: ribbons.bronze },
  ].sort((a, b) => a.u + a.v - (b.u + b.v));
  for (const pi of pies) {
    const b = p.iso(pi.u, pi.v, z);
    pie(p, b.x, b.y, pi.r, pi.filling, '#e0a45a');
    const rim = b.y - 3.5 + pi.r * 0.5 + 1.5;
    rosette(p, b.x, rim, pi.ribbon, pi.rank);
  }
  const sp = p.iso(0.5, 0.2, z);
  p.poly(
    [
      { x: sp.x, y: sp.y - 22 },
      { x: sp.x + 1, y: sp.y - 20 },
      { x: sp.x + 3, y: sp.y - 19.5 },
      { x: sp.x + 1.4, y: sp.y - 18 },
      { x: sp.x + 1.8, y: sp.y - 16 },
      { x: sp.x, y: sp.y - 17.2 },
      { x: sp.x - 1.8, y: sp.y - 16 },
      { x: sp.x - 1.4, y: sp.y - 18 },
      { x: sp.x - 3, y: sp.y - 19.5 },
      { x: sp.x - 1, y: sp.y - 20 },
    ],
    GOLD,
    O,
    0.6,
  );
}

// ---------------------------------------------------------------------------
// Winter

const LEAF = '#5fae4a';
const SNOW_SHADE = '#cfe2f3';
const BARK = '#8a5f3e';

/** A four-point sparkle centred on (x, y). */
function sparkle(p: Pen, x: number, y: number, r: number, color = '#fff6c0'): void {
  p.poly(
    [
      { x, y: y - r },
      { x: x + r * 0.25, y: y - r * 0.25 },
      { x: x + r, y },
      { x: x + r * 0.25, y: y + r * 0.25 },
      { x, y: y + r },
      { x: x - r * 0.25, y: y + r * 0.25 },
      { x: x - r, y },
      { x: x - r * 0.25, y: y - r * 0.25 },
    ],
    color,
    null,
  );
}

/** A little penguin standing with its feet on (x, y). */
function penguin(p: Pen, x: number, y: number, s: number): void {
  const navy = '#2d3550';
  p.ellipse(x - 1.8 * s, y - 0.4 * s, 1.8 * s, 0.9 * s, '#f6a53a');
  p.ellipse(x + 1.8 * s, y - 0.4 * s, 1.8 * s, 0.9 * s, '#f6a53a');
  p.poly([{ x: x - 3.8 * s, y: y - 8 * s }, { x: x - 6.2 * s, y: y - 4 * s }, { x: x - 3.6 * s, y: y - 4 * s }], navy);
  p.poly([{ x: x + 3.8 * s, y: y - 8 * s }, { x: x + 6.2 * s, y: y - 4 * s }, { x: x + 3.6 * s, y: y - 4 * s }], navy);
  p.ellipse(x, y - 6 * s, 4.2 * s, 6 * s, navy);
  p.ellipse(x, y - 5.2 * s, 2.6 * s, 4.4 * s, '#ffffff', null);
  face(p, x, y - 11 * s, 0.5 * s);
  p.poly([{ x: x - 1.1 * s, y: y - 8.6 * s }, { x: x + 1.1 * s, y: y - 8.6 * s }, { x, y: y - 7.2 * s }], '#ffb13a', O, 0.6);
}

/** Igloo: a dome of snow blocks, a glowing doorway and a penguin friend outside. */
function igloo(p: Pen): void {
  const { x, y } = p.center;
  p.shadow(x, y + 2, 28, 10);
  const c = p.ctx;
  const r = 20;
  const h = 22;
  // packed-snow mound at the base
  p.ellipse(x, y + 1, 25, 6.5, '#ffffff', O);
  // the dome, lit from the top-left
  c.beginPath();
  c.moveTo(x - r, y);
  c.ellipse(x, y, r, h, 0, Math.PI, 0);
  c.closePath();
  c.fillStyle = radial(p, x - 5, y - h * 0.6, 16, '#ffffff', SNOW_SHADE);
  c.fill();
  c.strokeStyle = O;
  c.lineWidth = 1.2;
  c.stroke();
  // block courses and seams
  c.beginPath();
  c.ellipse(x, y, r * 0.66, h * 0.66, 0, Math.PI, 0);
  c.strokeStyle = '#b8d3ea';
  c.lineWidth = 1;
  c.stroke();
  for (const a of [-2.6, -2.0, -1.4, -0.8]) {
    p.line(
      [
        { x: x + Math.cos(a) * r, y: y + Math.sin(a) * h },
        { x: x + Math.cos(a) * r * 0.5, y: y + Math.sin(a) * h * 0.5 },
      ],
      '#b8d3ea',
      1,
    );
  }
  // warm light spilling from the doorway
  p.glow(x, y - 6, 16, '#ffb347', 0.6);
  c.beginPath();
  c.moveTo(x - 6, y);
  c.lineTo(x - 6, y - 8);
  c.ellipse(x, y - 8, 6, 5, 0, Math.PI, 0);
  c.lineTo(x + 6, y);
  c.closePath();
  c.fillStyle = radial(p, x, y - 6, 9, '#fff3b0', '#ffb347');
  c.fill();
  c.strokeStyle = O;
  c.lineWidth = 1;
  c.stroke();
  penguin(p, x + 15, y + 3, 1.35);
  sparkle(p, x - 14, y - 22, 3);
  sparkle(p, x + 12, y - 30, 2.2, '#ffffff');
}

/** Flat frozen pond with a snowy rim, skate trails, a dropped scarf and a bunny on skates. */
function skatingPond(p: Pen): void {
  const c = p.center;
  // snowy rim
  p.diamond(0.02, 0.02, 1.96, 1.96, '#ffffff', O);
  // ice, lit from the top
  const g = p.ctx.createLinearGradient(c.x, c.y - 30, c.x, c.y + 30);
  g.addColorStop(0, '#f0fbff');
  g.addColorStop(1, '#8fd3f5');
  p.diamond(0.14, 0.14, 1.72, 1.72, g, shade('#8fd3f5', -0.35));
  p.diamond(0.3, 0.3, 0.5, 0.5, rgba('#ffffff', 0.35), null);
  // skate trails
  const trails: [Pt, Pt, Pt][] = [
    [p.iso(0.35, 1.7), p.iso(0.9, 1.1), p.iso(1.6, 0.4)],
    [p.iso(0.5, 1.6), p.iso(1.0, 1.2), p.iso(1.45, 0.55)],
    [p.iso(0.8, 0.5), p.iso(0.6, 0.9), p.iso(0.4, 1.25)],
  ];
  for (const [a, m, b] of trails) p.curve(a, m, b, rgba('#ffffff', 0.95), 1.3);
  // snowy lumps piled along the rim
  for (const t of [0.12, 0.35, 0.6, 0.85]) {
    const q = p.iso(t * 2, 0.07);
    p.circle(q.x, q.y, 2.4, '#ffffff', O);
    const r2 = p.iso(0.07, t * 2);
    p.circle(r2.x, r2.y, 2.4, '#ffffff', O);
  }
  // red scarf dropped across the front corner of the rim
  const s1 = p.iso(1.5, 1.94);
  const s2 = p.iso(1.94, 1.5);
  thick(p, [s1, s2], 3.6, '#e5344f');
  p.line([{ x: (s1.x + s2.x) / 2 - 1, y: (s1.y + s2.y) / 2 - 1.2 }, { x: (s1.x + s2.x) / 2 + 1, y: (s1.y + s2.y) / 2 + 1.2 }], '#fff8f0', 0.8);
  p.line([s1, { x: s1.x - 1, y: s1.y + 2.6 }], '#e5344f', 1.4);
  // a tiny bunny on skates
  const b = p.iso(0.95, 1.0);
  const cream = '#fffafc';
  p.line([{ x: b.x - 7, y: b.y - 0.3 }, { x: b.x + 7, y: b.y - 0.3 }], '#5a6e88', 1.4);
  p.ellipse(b.x - 3.4, b.y - 2.2, 2, 1.6, '#ff8fb3');
  p.ellipse(b.x + 3.4, b.y - 2.2, 2, 1.6, '#ff8fb3');
  p.ellipse(b.x, b.y - 7.5, 4.8, 5, cream);
  p.ellipse(b.x - 2.4, b.y - 25, 1.5, 4.6, cream, O, -0.15);
  p.ellipse(b.x + 2.4, b.y - 25, 1.5, 4.6, cream, O, 0.15);
  p.ellipse(b.x - 2.4, b.y - 25, 0.7, 3, '#ffb3c8', null, -0.15);
  p.ellipse(b.x + 2.4, b.y - 25, 0.7, 3, '#ffb3c8', null, 0.15);
  p.circle(b.x, b.y - 15, 4.6, radial(p, b.x, b.y - 15, 5, '#ffffff', cream));
  face(p, b.x, b.y - 14.5, 0.5);
  p.line([{ x: b.x - 4, y: b.y - 10.5 }, { x: b.x + 4, y: b.y - 10.5 }], '#e5344f', 1.8);
}

/** Giant snow bunny sculpture with red berry eyes and leaf ears. */
function snowBunny(p: Pen): void {
  const { x, y } = p.center;
  const rand = rng('snowbunny');
  p.shadow(x, y + 2, 24, 10);
  // drift base
  p.ellipse(x, y - 1, 21, 7, '#ffffff', O);
  // fat sculpted body
  p.ellipse(x, y - 15, 13, 14, radial(p, x - 3, y - 20, 14, '#ffffff', SNOW_SHADE));
  p.curve({ x: x - 9, y: y - 18 }, { x, y: y - 12 }, { x: x + 9, y: y - 18 }, SNOW_SHADE, 0.9);
  p.curve({ x: x - 10, y: y - 9 }, { x, y: y - 4 }, { x: x + 10, y: y - 9 }, SNOW_SHADE, 0.9);
  // front paws
  p.ellipse(x - 5, y - 3, 3.8, 2.8, '#ffffff');
  p.ellipse(x + 5, y - 3, 3.8, 2.8, '#ffffff');
  // leaf ears, behind the head
  paperLeaf(p, x - 2, y - 40, 20, -2.2, LEAF);
  paperLeaf(p, x + 4, y - 40, 20, -1.1, '#7ccc5a');
  // head
  p.circle(x + 1, y - 33, 11, radial(p, x - 3, y - 37, 12, '#ffffff', SNOW_SHADE));
  // red berry eyes, each with a tiny leaf sprig
  for (const ex of [x - 3, x + 5]) {
    p.circle(ex, y - 34, 2.4, radial(p, ex, y - 34, 2.6, '#ff8a9a', '#c8102e'));
    p.ellipse(ex - 0.8, y - 35, 0.7, 0.5, rgba('#ffffff', 0.8), null);
    paperLeaf(p, ex, y - 36.5, 3.6, -1.9, LEAF);
  }
  // pink nose, blush and a little smile
  p.poly([{ x: x - 0.9, y: y - 30.5 }, { x: x + 2.9, y: y - 30.5 }, { x: x + 1, y: y - 28.6 }], '#ff8fb3', O, 0.7);
  p.curve({ x: x - 0.8, y: y - 27.4 }, { x: x + 1, y: y - 26 }, { x: x + 2.8, y: y - 27.4 }, DARK, 0.7);
  p.ellipse(x - 5.5, y - 30, 1.6, 1, rgba('#ff7a9a', 0.6), null);
  p.ellipse(x + 7.5, y - 30, 1.6, 1, rgba('#ff7a9a', 0.6), null);
  // packed-snow speckles
  for (let i = 0; i < 10; i++) p.circle(x - 11 + rand() * 22, y - 26 + rand() * 20, 0.7, SNOW_SHADE, null);
  sparkle(p, x - 17, y - 48, 2.6);
  sparkle(p, x + 17, y - 54, 2);
}

/** One snowman with a stick-arm pair, a face and either a top hat (knit null) or a knit hat. */
function snowman(p: Pen, x: number, y: number, s: number, knit: string | null): void {
  p.ball(x, y - 9 * s, 9 * s, '#ffffff');
  p.ball(x, y - 23 * s, 6.5 * s, '#ffffff');
  p.ball(x, y - 34 * s, 5 * s, '#ffffff');
  // coal-dark buttons
  p.circle(x, y - 24 * s, 0.9 * s, DARK, null);
  p.circle(x, y - 19 * s, 0.9 * s, DARK, null);
  // twig arms with forked tips
  thick(p, [{ x: x - 5 * s, y: y - 23 * s }, { x: x - 11 * s, y: y - 27 * s }], 1.2, BARK);
  thick(p, [{ x: x + 5 * s, y: y - 22 * s }, { x: x + 12 * s, y: y - 27 * s }], 1.2, BARK);
  p.line([{ x: x - 11 * s, y: y - 27 * s }, { x: x - 13 * s, y: y - 31 * s }], BARK, 0.9);
  p.line([{ x: x + 12 * s, y: y - 27 * s }, { x: x + 14 * s, y: y - 31 * s }], BARK, 0.9);
  // scarf with a hanging tail
  p.ellipse(x, y - 29.5 * s, 5.4 * s, 1.9 * s, '#e5344f', O);
  p.poly([{ x: x + 2 * s, y: y - 28.6 * s }, { x: x + 3.6 * s, y: y - 21.6 * s }, { x: x + 1 * s, y: y - 21 * s }], '#e5344f');
  p.line([{ x: x - 4 * s, y: y - 28.4 * s }, { x: x + 4 * s, y: y - 28.4 * s }], '#ffe0e8', 0.7);
  face(p, x, y - 34 * s, 0.8 * s);
  if (knit) {
    p.ellipse(x, y - 37 * s, 5.4 * s, 4 * s, knit, O);
    p.circle(x, y - 42 * s, 1.6 * s, '#ffffff');
  } else {
    p.rect(x - 4.2 * s, y - 52 * s, 8.4 * s, 14 * s, DARK);
    p.rect(x - 4.2 * s, y - 40 * s, 8.4 * s, 2.2 * s, '#e5344f', null);
    p.ellipse(x, y - 38.5 * s, 6.6 * s, 1.8 * s, DARK);
  }
}

/** A snowman family on a soft snow hill, with a steaming cocoa mug. */
function cocoaSledHill(p: Pen): void {
  const c = p.center;
  p.shadow(c.x, c.y + 2, 34, 12);
  p.diamond(0.06, 0.06, 1.88, 0.88, '#ffffff', O);
  p.diamond(0.1, 0.1, 1.8, 0.8, rgba('#ddeaf6', 0.6), null);
  const family: { u: number; v: number; s: number; knit: string | null }[] = [
    { u: 0.62, v: 0.5, s: 1.05, knit: null },
    { u: 1.32, v: 0.42, s: 0.78, knit: '#5fae4a' },
    { u: 1.4, v: 0.88, s: 0.52, knit: '#ffb13a' },
  ];
  const mug = p.iso(0.98, 0.92);
  p.cylinder(mug.x, mug.y, 3.4, 5, '#fff8f0');
  p.ellipse(mug.x, mug.y - 5, 3.4, 1.4, '#6b3a24', O);
  p.heart(mug.x + 1.2, mug.y - 2.4, 1.2, '#ff5b7f', null);
  for (const f of family) {
    const q = p.iso(f.u, f.v, 0);
    snowman(p, q.x, q.y, f.s, f.knit);
  }
}

// ---------------------------------------------------------------------------
// Party (year-round)

const PASTELS = ['#ff9ec4', '#8fd0ff', '#c7a6ff', '#ffe07a', '#a8e6a0', '#ffb38a'];

/** Teardrop flame whose base sits at (x, y), with a warm glow. */
function flame(p: Pen, x: number, y: number, s: number): void {
  p.glow(x, y - s, s * 4.5, '#ffb03a', 0.55);
  const drop = (sc: number, yy: number, fill: string, stroke: string | null) => {
    const c = p.ctx;
    const r = sc * 0.8;
    c.beginPath();
    c.moveTo(x, yy - sc * 2.5);
    c.quadraticCurveTo(x + sc * 0.95, yy - sc * 1.5, x + r * Math.cos(-0.2), yy - r + r * Math.sin(-0.2));
    c.arc(x, yy - r, r, -0.2, Math.PI + 0.2, false);
    c.quadraticCurveTo(x - sc * 0.95, yy - sc * 1.5, x, yy - sc * 2.5);
    c.closePath();
    c.fillStyle = fill;
    c.fill();
    if (stroke) {
      c.strokeStyle = stroke;
      c.lineWidth = 0.8;
      c.stroke();
    }
  };
  drop(s, y, '#ff9a2e', shade('#ff9a2e', -0.3));
  drop(s * 0.55, y - s * 0.15, '#fff3a6', null);
}

/** A wrapped present standing on (u, v) at height z, with a ribbon cross and bow. */
function present(p: Pen, u: number, v: number, du: number, dv: number, ht: number, color: string, ribbon: string, z: number): void {
  p.box(u, v, du, dv, ht, color, z);
  const top = z + ht;
  p.line([p.iso(u + du / 2, v, top), p.iso(u + du / 2, v + dv, top)], ribbon, 1.8);
  p.line([p.iso(u, v + dv / 2, top), p.iso(u + du, v + dv / 2, top)], ribbon, 1.8);
  const b = p.iso(u + du / 2, v + dv / 2, top);
  p.ellipse(b.x - 2.2, b.y - 1.6, 2.2, 1.4, ribbon, O, -0.4);
  p.ellipse(b.x + 2.2, b.y - 1.6, 2.2, 1.4, ribbon, O, 0.4);
}

/** Small table with a three-tier birthday cake, candles aglow and presents. */
function birthdayCake(p: Pen): void {
  const c = p.center;
  const rand = rng('birthday');
  p.shadow(c.x, c.y + 3, 30, 12);
  const legHt = 9;
  const top = legHt + 3;
  table(p, 0.08, 0.08, 0.84, 0.84, legHt, '#ffe3ef');
  present(p, 0.6, 0.1, 0.28, 0.3, 6, '#8fd0ff', '#ffe07a', top);
  // three tiers, bottom up; each has a dripping icing rim
  const tiers: [number, number, string][] = [
    [13, 6, '#ff9ec4'],
    [9.5, 5, '#fff3e0'],
    [6, 5, '#c7a6ff'],
  ];
  let z = top;
  for (const [rx, ht, col] of tiers) {
    const b = p.iso(0.5, 0.5, z);
    p.cylinder(b.x, b.y, rx, ht, col);
    const ry = rx / 2;
    for (let i = -2; i <= 2; i++) {
      const dx = i * rx * 0.34;
      const rimY = b.y - ht + ry * Math.sqrt(1 - (dx / rx) ** 2);
      p.ellipse(b.x + dx, rimY + 1.8, 1.4, 2.4, '#ffffff', null);
    }
    z += ht;
  }
  // pearl sprinkles on the top ellipse
  const t = p.iso(0.5, 0.5, z);
  for (let i = 0; i < 9; i++) {
    const a = rand() * TAU;
    const d = Math.sqrt(rand()) * 5.5;
    p.circle(t.x + Math.cos(a) * d, t.y + Math.sin(a) * d * 0.5, 0.8, PASTELS[i % 4], null);
  }
  // candles, each with a flame
  const cols = ['#ff8fb3', '#8fd0ff', '#ffe07a'];
  [-4, 0, 4].forEach((dx, i) => {
    const cx = t.x + dx;
    const cy = t.y + (i === 1 ? -0.5 : 0.8);
    p.rect(cx - 0.9, cy - 8, 1.8, 8, cols[i]);
    flame(p, cx, cy - 8, 2.4);
  });
  present(p, 0.12, 0.6, 0.3, 0.26, 5, '#ff9ec4', '#fff7f0', top);
  sparkle(p, c.x + 15, c.y - 52, 2.6);
}

/** A shiny balloon: egg-shaped gradient body, a knot below and a glossy highlight. */
function balloon(p: Pen, x: number, y: number, rx: number, ry: number, color: string): void {
  p.ellipse(x, y, rx, ry, radial(p, x - rx * 0.3, y - ry * 0.3, rx * 1.3, shade(color, 0.5), shade(color, -0.12)));
  p.poly([{ x: x - 1.4, y: y + ry + 1 }, { x: x + 1.4, y: y + ry + 1 }, { x, y: y + ry - 1.4 }], shade(color, -0.2), O, 0.6);
  p.ellipse(x - rx * 0.45, y - ry * 0.35, rx * 0.2, ry * 0.3, rgba('#ffffff', 0.75), null, -0.3);
  p.circle(x - rx * 0.3, y - ry * 0.72, rx * 0.09, rgba('#ffffff', 0.9), null);
}

/** Bunch of pastel balloons tied to a wooden weight. */
function balloonBunch(p: Pen): void {
  const { x, y } = p.center;
  p.shadow(x, y + 1, 12, 5);
  p.box(0.36, 0.36, 0.28, 0.28, 6, WOOD);
  const tieY = y - 6;
  const list: [number, number, number, number, string][] = [
    [-9, -34, 7, 8.5, '#ff9ec4'],
    [4, -40, 7.5, 9, '#8fd0ff'],
    [11, -30, 6.5, 8, '#ffe07a'],
    [-2, -26, 7, 8.5, '#a8e6a0'],
    [-15, -22, 6, 7.5, '#c7a6ff'],
    [14, -18, 6, 7.5, '#ffb38a'],
  ];
  // strings first, so they sit behind the balloons
  for (const [dx, dy, , ry] of list) {
    const kx = x + dx;
    const ky = tieY + dy + ry;
    p.curve({ x: kx, y: ky + 1.5 }, { x: (kx + x) / 2 + (dx < 0 ? -1.5 : 1.5), y: (ky + tieY) / 2 }, { x, y: tieY }, '#7a6a5a', 0.6);
  }
  // back-to-front by height
  const sorted = [...list].sort((a, b) => a[1] - b[1]);
  for (const [dx, dy, rx, ry, col] of sorted) {
    const bx = x + dx;
    const by = tieY + dy;
    balloon(p, bx, by, rx, ry, col);
    if (col === '#8fd0ff') face(p, bx, by + 1, 0.5);
  }
  p.line([{ x: x - 4, y: tieY - 1 }, { x: x + 4, y: tieY - 1 }], '#ff8fb3', 1.4);
}

/** Point on a quadratic curve from a to b bending through c. */
function qpt(a: Pt, c: Pt, b: Pt, t: number): Pt {
  const s = 1 - t;
  return { x: s * s * a.x + 2 * s * t * c.x + t * t * b.x, y: s * s * a.y + 2 * s * t * c.y + t * t * b.y };
}

function lerpPt(a: Pt, b: Pt, t: number): Pt {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

/** A 2x2 white garden marquee: scalloped pastel trim, striped roof, bunting and string lights. */
function partyTent(p: Pen): void {
  const c = p.center;
  p.shadow(c.x, c.y + 3, 46, 18);
  // negative overhang: the tent is inset so its corners stay inside the canvas
  const o = -0.06;
  const wall = 34;
  const roof = 40;
  const top = (u: number, v: number): Pt => p.iso(u, v, wall);
  const low = (u: number, v: number): Pt => p.iso(u, v, 0);
  // walls on the two front faces, with soft pleats
  p.poly([top(-o, 2 + o), top(2 + o, 2 + o), low(2 + o, 2 + o), low(-o, 2 + o)], '#fdf7f0', O);
  p.poly([top(2 + o, 2 + o), top(2 + o, -o), low(2 + o, -o), low(2 + o, 2 + o)], shade('#fdf7f0', -0.1), O);
  for (let k = 1; k < 6; k++) {
    const a = top(-o + ((2 + 2 * o) * k) / 6, 2 + o);
    p.line([a, { x: a.x, y: a.y + wall }], '#eadfd2', 0.9);
    const b = top(2 + o, 2 + o - ((2 + 2 * o) * k) / 6);
    p.line([b, { x: b.x, y: b.y + wall }], '#e0d2c2', 0.9);
  }
  // peaked roof, then alternating pastel stripes on each slope
  p.hipRoof(0, 0, 2, 2, wall, roof, '#fffdf8', o);
  const peak = p.iso(1, 1, wall + roof);
  const L = top(-o, 2 + o);
  const B = top(2 + o, 2 + o);
  const R = top(2 + o, -o);
  for (let i = 1; i < 6; i += 2) {
    p.poly([peak, lerpPt(L, B, i / 6), lerpPt(L, B, (i + 1) / 6)], rgba('#ff9ec4', 0.7), null);
    p.poly([peak, lerpPt(B, R, i / 6), lerpPt(B, R, (i + 1) / 6)], rgba('#8fd0ff', 0.7), null);
  }
  // bunting on a sagging string across each front eave, with string lights
  for (const [a, b] of [
    [L, B],
    [B, R],
  ]) {
    const a2 = { x: a.x, y: a.y + 5 };
    const b2 = { x: b.x, y: b.y + 5 };
    p.line([a2, b2], '#6a5a4a', 0.7);
    for (let k = 1; k < 8; k++) {
      const q = lerpPt(a2, b2, k / 8);
      p.poly([{ x: q.x - 2.2, y: q.y }, { x: q.x + 2.2, y: q.y }, { x: q.x, y: q.y + 5 }], PASTELS[k % 4], O, 0.6);
    }
  }
  // scalloped pastel trim along the roof eaves
  for (const [a, b, off] of [
    [L, B, 0],
    [B, R, 2],
  ] as [Pt, Pt, number][]) {
    for (let k = 0; k <= 8; k++) {
      const q = lerpPt(a, b, k / 8);
      p.circle(q.x, q.y + 2, 2.8, PASTELS[(k + off) % 4], O);
      if (k % 2 === 0) {
        p.glow(q.x, q.y + 7, 4, '#fff3a6', 0.6);
        p.circle(q.x, q.y + 7, 1, '#fff6c0', null);
      }
    }
  }
  // gold front pole and a little pennant on the peak
  thick(p, [low(2 + o, 2 + o), B], 2.4, WOOD);
  p.ball(peak.x, peak.y - 2.6, 2.4, '#ffe07a');
  p.poly([{ x: peak.x, y: peak.y - 5 }, { x: peak.x + 6, y: peak.y - 3.4 }, { x: peak.x, y: peak.y - 1.8 }], '#ff9ec4', O, 0.6);
  // flowers at the front of the tent
  const f1 = low(0.9, 2.6);
  const f2 = low(1.7, 2.4);
  p.flower(f1.x, f1.y - 2, 2.2, '#ff8fb3', '#ffd84a');
  p.flower(f2.x, f2.y - 2, 2.2, '#ffffff', '#ffd84a');
  sparkle(p, c.x - 22, c.y - 60, 2.6);
}

/** Rainbow balloon arch between two posts. */
function confettiArch(p: Pen): void {
  const { x, y } = p.center;
  p.shadow(x, y + 2, 30, 10);
  const half = 22;
  const postHt = 34;
  const rise = 14;
  for (const sx of [-half, half]) {
    p.ellipse(x + sx, y + 1, 4.2, 1.8, '#d9cde6');
    p.cylinder(x + sx, y, 2.6, postHt, '#fff8fb');
  }
  const a = { x: x - half, y: y - postHt };
  const c = { x, y: y - postHt - rise * 2 };
  const b = { x: x + half, y: y - postHt };
  p.curve(a, c, b, O, 4);
  p.curve(a, c, b, '#ffe6f2', 2.2);
  const n = 10;
  const pts: { q: Pt; i: number }[] = [];
  for (let i = 0; i < n; i++) pts.push({ q: qpt(a, c, b, i / (n - 1)), i });
  pts.sort((m, k) => m.q.y - k.q.y);
  for (const { q, i } of pts) balloon(p, q.x, q.y - 4, 5.6, 6.6, PASTELS[i % PASTELS.length]);
  sparkle(p, x - 14, y - postHt - rise - 14, 2.6);
  sparkle(p, x + 16, y - postHt - rise - 6, 2);
}

/** An iridescent soap bubble with a pastel rainbow rim. */
function bubble(p: Pen, x: number, y: number, r: number): void {
  p.circle(x, y, r, radial(p, x - r * 0.3, y - r * 0.3, r * 1.2, 'rgba(255,255,255,0.15)', 'rgba(170,220,255,0.35)'), '#6fb0d8');
  const c = p.ctx;
  PASTELS.slice(0, 4).forEach((col, i) => {
    const a0 = -2.6 + i * 1.3;
    c.beginPath();
    c.arc(x, y, r - 0.7, a0, a0 + 1.0);
    c.strokeStyle = rgba(col, 0.95);
    c.lineWidth = 0.9;
    c.stroke();
  });
  p.ellipse(x - r * 0.45, y - r * 0.4, r * 0.22, r * 0.14, rgba('#ffffff', 0.9), null, -0.6);
}

/** Cute bubble machine with a face, blowing a stream of iridescent bubbles. */
function bubbleMachine(p: Pen): void {
  const { x, y } = p.center;
  p.shadow(x, y + 1, 16, 7);
  p.ellipse(x - 6, y - 0.4, 3, 1.6, '#ffd166');
  p.ellipse(x + 6, y - 0.4, 3, 1.6, '#ffd166');
  p.cylinder(x, y - 2, 12, 16, '#8fd0ff');
  p.cylinder(x, y - 18, 13, 3, '#ffe07a');
  face(p, x, y - 9, 1.1);
  p.circle(x - 6.5, y - 4.5, 1.4, '#ff6b8a');
  p.circle(x + 6.5, y - 4.5, 1.4, '#7fd8a0');
  // nozzle, wand arm and hoop
  thick(p, [{ x: x + 1, y: y - 23 }, { x: x + 4, y: y - 27 }], 1.2, '#ff9ec4');
  p.rect(x - 2.2, y - 25, 4.4, 4.5, '#ff9ec4');
  p.ellipse(x + 8, y - 31, 4.6, 5.2, null, '#ff9ec4');
  bubble(p, x + 14, y - 40, 3.4);
  bubble(p, x + 22, y - 50, 2.6);
  bubble(p, x + 11, y - 56, 4.2);
  bubble(p, x + 25, y - 36, 2);
  bubble(p, x + 18, y - 64, 2.4);
  bubble(p, x + 6, y - 66, 3);
}

/** Long garden party table: lace cloth, teapots, sandwiches, cupcakes and a posy. */
function gardenPartyTable(p: Pen): void {
  const c = p.center;
  p.shadow(c.x, c.y + 3, 44, 14);
  const legHt = 11;
  const topZ = legHt + 3;
  const zt = topZ + 1;
  table(p, 0.06, 0.1, 1.88, 0.8, legHt, '#fff7f0');
  // lace cloth over the top, with a scalloped skirt on the two front edges
  p.box(0.02, 0.06, 1.96, 0.88, 1, '#fffdf7', topZ);
  for (let k = 0; k <= 9; k++) {
    const q = p.iso(0.02 + (1.96 * k) / 9, 0.94, topZ);
    p.circle(q.x, q.y + 1.8, 1.7, '#fffdf7', O);
    const r = p.iso(1.98, 0.06 + (0.88 * k) / 9, topZ);
    p.circle(r.x, r.y + 1.8, 1.7, '#fffdf7', O);
  }
  for (const [u, v] of [
    [0.3, 0.3],
    [0.9, 0.2],
    [1.5, 0.3],
    [0.5, 0.75],
    [1.2, 0.8],
    [1.7, 0.6],
  ] as [number, number][]) {
    const q = p.iso(u, v, zt);
    p.circle(q.x, q.y, 0.9, '#ffc2d6', null);
  }
  const at = (u: number, v: number): Pt => p.iso(u, v, zt);
  // back-to-front by depth
  const tp1 = at(0.36, 0.5);
  teapot(p, tp1.x, tp1.y, 1, '#ff9ec4');
  const sp = at(0.7, 0.66);
  p.ellipse(sp.x, sp.y - 1, 7, 3.2, '#ffffff');
  p.poly([{ x: sp.x - 5.6, y: sp.y - 2 }, { x: sp.x - 0.4, y: sp.y - 2 }, { x: sp.x - 3, y: sp.y - 7 }], '#fff1c6');
  p.poly([{ x: sp.x + 0.4, y: sp.y - 2 }, { x: sp.x + 5.6, y: sp.y - 2 }, { x: sp.x + 3, y: sp.y - 7 }], '#ffd6e5');
  p.circle(sp.x - 3, sp.y - 3.5, 0.9, '#a8e6a0', null);
  p.circle(sp.x + 3, sp.y - 3.5, 0.9, '#a8e6a0', null);
  const vs = at(1.0, 0.5);
  p.cylinder(vs.x, vs.y, 2.8, 6, '#8fc8f0');
  for (const [dx, dy, col] of [
    [-4, -12, '#ffb3c8'],
    [0, -15, '#ffe066'],
    [4.5, -11, '#c7a6ff'],
  ] as const) {
    p.line([{ x: vs.x, y: vs.y - 6 }, { x: vs.x + dx, y: vs.y + dy }], '#4f9e45', 1);
    p.flower(vs.x + dx, vs.y + dy, 3, col, '#ffd84a');
  }
  const cu1 = at(1.6, 0.2);
  cupcake(p, cu1.x, cu1.y, '#ffb3c8');
  const tp2 = at(1.3, 0.8);
  teapot(p, tp2.x, tp2.y, 0.9, '#8fdc7a');
  const cu2 = at(1.8, 0.7);
  cupcake(p, cu2.x, cu2.y, '#c7a6ff');
}

/** Flat checkered dance floor with twinkly light dots and disco sparkles. */
function danceFloor(p: Pen): void {
  const n = 4;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const col = (i + j) % 2 ? '#ff9ec4' : '#fff8f0';
      p.diamond((i * 2) / n, (j * 2) / n, 2 / n, 2 / n, col, rgba(O, 0.35));
    }
  }
  p.diamond(0, 0, 2, 2, null, '#f4c24a');
  p.diamond(-0.02, -0.02, 2.04, 2.04, null, O);
  const rand = rng('dancefloor');
  const lights = ['#fff6c0', '#8fd0ff', '#c7a6ff', '#a8e6a0'];
  for (let i = 0; i < 16; i++) {
    const q = p.iso(0.15 + rand() * 1.7, 0.15 + rand() * 1.7);
    p.glow(q.x, q.y, 5, lights[i % lights.length], 0.6);
    p.circle(q.x, q.y, 1.1, '#ffffff', null);
  }
  const c = p.center;
  sparkle(p, c.x, c.y, 3.2);
  const s1 = p.iso(0.5, 1.5);
  const s2 = p.iso(1.5, 0.5);
  sparkle(p, s1.x, s1.y, 2.2, '#ffffff');
  sparkle(p, s2.x, s2.y, 2.2, '#ffffff');
}

/** A cupcake with a striped wrapper, a frosting dome and a cherry; base at (x, y). */
function cupcake(p: Pen, x: number, y: number, color: string): void {
  p.cylinder(x, y, 3.6, 4.5, '#fff8f0');
  p.line([{ x: x - 1.6, y: y - 0.6 }, { x: x - 1.6, y: y - 3.8 }], '#ff9ec4', 0.9);
  p.line([{ x: x + 1.6, y: y - 0.6 }, { x: x + 1.6, y: y - 3.8 }], '#ff9ec4', 0.9);
  p.ball(x, y - 6.8, 4.2, color);
  p.ball(x, y - 11.6, 1.6, '#e5344f');
  p.line([{ x, y: y - 13.2 }, { x: x + 0.8, y: y - 15 }], '#4f9e45', 0.7);
}

/** A round teapot with a face, spout and handle; base at (x, y). */
function teapot(p: Pen, x: number, y: number, s: number, color: string): void {
  thick(p, [{ x: x - 5 * s, y: y - 8 * s }, { x: x - 8 * s, y: y - 6 * s }, { x: x - 5 * s, y: y - 2.5 * s }], 1.3 * s, color);
  p.ball(x, y - 6 * s, 6 * s, color);
  thick(p, [{ x: x + 4.5 * s, y: y - 5 * s }, { x: x + 8 * s, y: y - 7.5 * s }, { x: x + 9 * s, y: y - 10 * s }], 1.4 * s, color);
  p.ellipse(x, y - 12 * s, 2.5 * s, 1 * s, shade(color, 0.2));
  p.circle(x, y - 13.4 * s, 0.9 * s, GOLD, null);
  face(p, x, y - 6 * s, 0.5 * s);
}

/** A spoked wheel whose ground contact is (x, y). */
function wheel(p: Pen, x: number, y: number, r: number): void {
  p.circle(x, y - r, r, '#5a4a4a');
  p.circle(x, y - r, r * 0.72, null, '#8a7a6a');
  p.line([{ x: x - r * 0.7, y: y - r }, { x: x + r * 0.7, y: y - r }], '#8a7a6a', 0.6);
  p.line([{ x, y: y - r * 1.7 }, { x, y: y - r * 0.3 }], '#8a7a6a', 0.6);
  p.circle(x, y - r, r * 0.38, GOLD);
}

/** Three-tier stand of pastel cupcakes with a cherry on top. */
function cupcakeTower(p: Pen): void {
  const { x, y } = p.center;
  p.shadow(x, y + 1, 16, 7);
  p.rect(x - 1.2, y - 34, 2.4, 33, GOLD);
  // [plate base y, plate radius, plate colour, cupcake count]
  const tiers: [number, number, string, number][] = [
    [y, 15, '#ffd6e8', 4],
    [y - 18, 9.5, '#ffe066', 3],
    [y - 33, 5.5, '#c7a6ff', 1],
  ];
  tiers.forEach(([yb, r, plate, n], ti) => {
    const topY = yb - 2.6;
    p.cylinder(x, yb, r, 2.6, plate);
    if (n === 1) {
      cupcake(p, x, topY, '#ff8fb3');
      return;
    }
    const rx = r * 0.6;
    const ry = rx * 0.5;
    const cakes: { x: number; y: number; col: string }[] = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU + 0.4;
      cakes.push({ x: x + Math.cos(a) * rx, y: topY + Math.sin(a) * ry, col: PASTELS[(i + ti) % PASTELS.length] });
    }
    cakes.sort((m, k) => m.y - k.y).forEach((q) => cupcake(p, q.x, q.y, q.col));
  });
}

/** Rainbow llama pinata hanging by a rope from a wooden post with a crossbar. */
function pinata(p: Pen): void {
  const { x, y } = p.center;
  const c = p.ctx;
  p.shadow(x + 2, y + 1, 12, 5);
  const px = x - 17;
  p.ellipse(px, y, 4, 1.6, shade(WOOD, -0.25));
  thick(p, [{ x: px, y }, { x: px, y: y - 50 }], 3.2, WOOD);
  thick(p, [{ x: px, y: y - 50 }, { x: x + 14, y: y - 50 }], 2.6, WOOD_DK);
  const rx = x + 2;
  p.line([{ x: rx, y: y - 50 }, { x: rx, y: y - 31 }], '#c7a26a', 1);
  const bands = ['#ff9ec4', '#ffe07a', '#a8e6a0', '#8fd0ff', '#c7a6ff'];
  // neck, then the body with rainbow bands clipped to its shape
  thick(p, [{ x: rx + 4, y: y - 27 }, { x: rx + 7, y: y - 33 }], 5, '#fff8f0');
  c.save();
  c.beginPath();
  c.ellipse(rx, y - 22, 10, 8, 0, 0, TAU);
  c.clip();
  bands.forEach((col, i) => {
    c.fillStyle = col;
    c.fillRect(rx - 11, y - 30 + i * 3.2, 22, 3.2);
  });
  c.restore();
  p.ellipse(rx, y - 22, 10, 8, null, O);
  // tissue fringe along the bottom
  for (let i = 0; i < 6; i++) {
    const fx = rx - 8 + i * 3.2;
    p.poly([{ x: fx - 1.6, y: y - 15 }, { x: fx + 1.6, y: y - 15 }, { x: fx, y: y - 10.5 }], bands[i % bands.length], O, 0.6);
  }
  // ears, head, a rainbow mane and a snout
  p.poly([{ x: rx + 5, y: y - 39 }, { x: rx + 6.2, y: y - 46 }, { x: rx + 9.2, y: y - 41 }], '#fff8f0');
  p.poly([{ x: rx + 9, y: y - 40 }, { x: rx + 10.6, y: y - 45 }, { x: rx + 12, y: y - 40.5 }], '#fff8f0');
  p.ball(rx + 8, y - 36, 6, '#fff8f0');
  for (let i = 0; i < 5; i++) p.circle(rx + 4.6 + i * 2, y - 41 - (i % 2) * 1.6, 1.5, bands[i], O);
  p.ellipse(rx + 12.6, y - 34, 2.6, 1.8, '#ffe0ec');
  face(p, rx + 7.4, y - 37, 0.72);
}

/** Giant golden picture frame on an easel: a sunny pastel photo, a heart and little props. */
function photoFrame(p: Pen): void {
  const { x, y } = p.center;
  const c = p.ctx;
  p.shadow(x, y + 1, 18, 7);
  // easel
  thick(p, [{ x, y: y - 40 }, { x: x - 16, y }], 2.2, WOOD);
  thick(p, [{ x, y: y - 40 }, { x: x + 16, y }], 2.2, WOOD);
  p.rect(x - 15, y - 40, 30, 2.6, WOOD_DK);
  // golden frame resting on the tray
  const gx = x - 20;
  const gy = y - 76;
  const gw = 40;
  const gh = 38;
  const gold = c.createLinearGradient(gx, gy, gx + gw, gy + gh);
  gold.addColorStop(0, '#ffe9a0');
  gold.addColorStop(1, '#e0a92c');
  p.roundRect(gx, gy, gw, gh, 4, gold);
  // pastel sky photo inside
  const sky = c.createLinearGradient(0, gy + 4, 0, gy + gh - 4);
  sky.addColorStop(0, '#ffe9f2');
  sky.addColorStop(1, '#cfeaff');
  p.roundRect(gx + 4, gy + 4, gw - 8, gh - 8, 2, sky, shade(GOLD, -0.45));
  p.circle(gx + 12, gy + 12, 3.2, '#ffe07a', null);
  p.poly([{ x: gx + 5, y: gy + gh - 5 }, { x: gx + 14, y: gy + 19 }, { x: gx + 23, y: gy + gh - 5 }], '#a8e6a0', null);
  p.poly([{ x: gx + 17, y: gy + gh - 5 }, { x: gx + 27, y: gy + 22 }, { x: gx + gw - 5, y: gy + gh - 5 }], '#7fd08a', null);
  p.heart(x, gy + 17, 6.4, radial(p, x, gy + 17, 8, '#ff7a90', '#e02c4f'));
  for (const [sx, sy] of [
    [gx + 2, gy + 2],
    [gx + gw - 2, gy + 2],
    [gx + 2, gy + gh - 2],
    [gx + gw - 2, gy + gh - 2],
  ]) {
    p.circle(sx, sy, 1.3, '#fff3b0', O);
  }
  // props: a potted flower and a little heart
  p.cylinder(x + 22, y, 3.4, 4.5, '#d9774a');
  p.line([{ x: x + 22, y: y - 4.5 }, { x: x + 22, y: y - 9 }], '#4f9e45', 1);
  p.flower(x + 22, y - 10, 3.2, '#ff8fb3', '#ffd84a');
  p.heart(x - 24, y - 4, 2.8, '#ff5b7f');
  sparkle(p, x - 26, y - 62, 3);
  sparkle(p, x + 27, y - 70, 2.4);
}

/** Vintage ice cream tricycle cart with a striped umbrella and two cones. */
function iceCreamBike(p: Pen): void {
  const c = p.center;
  const cx = c.x;
  const cy = c.y;
  p.shadow(cx, cy + 3, 36, 13);
  // frame and wheels, behind the cart
  thick(p, [{ x: cx - 14, y: cy + 2 }, { x: cx, y: cy - 6 }, { x: cx + 14, y: cy + 2 }], 1.6, '#6a6a7a');
  wheel(p, cx + 14, cy + 2, 7);
  wheel(p, cx - 16, cy + 3, 6);
  // striped umbrella on a pole
  thick(p, [{ x: cx + 6, y: cy - 20 }, { x: cx + 6, y: cy - 50 }], 1.6, WOOD);
  const cnx = cx + 6;
  const cny = cy - 50;
  const rx = 22;
  const ry = 9;
  const ctx = p.ctx;
  ctx.save();
  ctx.translate(cnx, cny);
  ctx.scale(1, ry / rx);
  for (let i = 0; i < 6; i++) p.arc(0, 0, rx, (i * TAU) / 6, ((i + 1) * TAU) / 6, i % 2 ? '#fffdf7' : '#ff9ec4', null);
  ctx.restore();
  p.ellipse(cnx, cny, rx, ry, null, O);
  for (let k = 0; k <= 6; k++) {
    const a = 0.25 + (k / 6) * (Math.PI - 0.5);
    p.circle(cnx + Math.cos(a) * rx, cny + Math.sin(a) * ry + 1, 2.2, k % 2 ? '#fffdf7' : '#ff9ec4', O);
  }
  // cart with a white lid
  boxAt(p, cx, cy - 3, 0.8, 0.56, 12, '#ff9ec4', 7);
  boxAt(p, cx, cy - 3, 0.86, 0.62, 2.5, '#fffdf7', 19);
  // two cones with scoops
  for (const [dx, dy, col] of [
    [-9, -22, '#8fd0ff'],
    [1, -23, '#ffe07a'],
  ] as const) {
    const bx = cx + dx;
    const by = cy + dy;
    p.poly([{ x: bx - 4, y: by }, { x: bx + 4, y: by }, { x: bx, y: by + 10 }], '#f4c28a');
    p.line([{ x: bx - 3, y: by + 2.5 }, { x: bx + 2, y: by + 7 }], '#c98b53', 0.6);
    p.line([{ x: bx + 3, y: by + 2.5 }, { x: bx - 2, y: by + 7 }], '#c98b53', 0.6);
    p.ball(bx, by - 2, 4.6, col);
  }
  // handlebar with a little bell
  thick(p, [{ x: cx - 12, y: cy - 20 }, { x: cx - 16, y: cy - 31 }, { x: cx - 22, y: cy - 32 }], 1.4, '#6a6a7a');
  p.circle(cx - 17, cy - 33, 1.5, GOLD);
}

// ---------------------------------------------------------------------------
// Table and exports

type Art = { height: number; paint: Painter };

const ART: Record<string, Art> = {
  gratitude_tree: { height: 62, paint: gratitudeTree },
  pie_contest: { height: 40, paint: pieContest },
  igloo: { height: 40, paint: igloo },
  skating_pond: { height: 26, paint: skatingPond },
  snow_bunny: { height: 64, paint: snowBunny },
  cocoa_sled_hill: { height: 58, paint: cocoaSledHill },
  birthday_cake: { height: 52, paint: birthdayCake },
  balloon_bunch: { height: 58, paint: balloonBunch },
  party_tent: { height: 100, paint: partyTent },
  confetti_arch: { height: 66, paint: confettiArch },
  bubble_machine: { height: 66, paint: bubbleMachine },
  garden_party_table: { height: 42, paint: gardenPartyTable },
  dance_floor: { height: 20, paint: danceFloor },
  cupcake_tower: { height: 58, paint: cupcakeTower },
  pinata: { height: 64, paint: pinata },
  photo_frame: { height: 76, paint: photoFrame },
  ice_cream_bike: { height: 66, paint: iceCreamBike },
};

/** Anything added to the festival list without bespoke art gets a smiling pastel bauble. */
function fallback(p: Pen): void {
  const c = p.center;
  p.shadow(c.x, c.y + 1, 12, 5, 0.28);
  p.ball(c.x, c.y - 9, 8, '#ffd6e8');
  face(p, c.x, c.y - 9, 0.7);
  sparkle(p, c.x + 11, c.y - 20, 2.4);
}

export const sprites: SpriteSpec[] = FESTIVAL_DECORATIONS.slice(17).map((d) => {
  const art = ART[d.id] ?? { height: 30, paint: fallback };
  return { key: `deco:${d.id}`, fw: d.w, fh: d.h, height: art.height, paint: art.paint };
});

export const icons: IconSpec[] = [];
