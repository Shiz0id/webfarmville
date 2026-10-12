// Holiday lifestyle scenes: cosy little moments of holiday living (dumpling
// feasts, cocoa stands, picnics, carving tables) sold during their event.
// Every entry of LIFESTYLE_DECORATIONS gets a painter; footprints always come
// from the content definition.
import { type IconSpec, type Pen, type Pt, type SpriteSpec, OUTLINE, mix, rgba, rng, shade } from './kit';
import { LIFESTYLE_DECORATIONS } from '@farm/shared';

const O = OUTLINE;
const TAU = Math.PI * 2;
const WOOD = '#c98b53';
const WOOD_LT = '#ebb880';
const WOOD_DK = '#7a4b2e';
const GOLD = '#f4c24a';
const LEAF = '#5fae4a';
const LEAF_DK = '#3f8f3c';
const RED = '#e5344f';
const PINK = '#ff8fb3';
const DARK = '#2b1d18';

type Painter = (p: Pen) => void;
type Fill = string | CanvasGradient | null;

// ---------------------------------------------------------------------------
// Low-level helpers (small copies of the seasonal.ts approach)

function fs(p: Pen, fill: Fill, stroke: string | null = O, w = 1): void {
  const ctx = p.ctx;
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = w;
    ctx.stroke();
  }
}

/** An outlined thick stroke (branches, handles, ribbons). */
function thick(p: Pen, pts: Pt[], w: number, color: string): void {
  p.line(pts, O, w + 1.6);
  p.line(pts, color, w);
}

function thickCurve(p: Pen, a: Pt, c: Pt, b: Pt, w: number, color: string): void {
  p.curve(a, c, b, O, w + 1.6);
  p.curve(a, c, b, color, w);
}

function radial(p: Pen, x: number, y: number, r: number, inner: string, outer: string): CanvasGradient {
  const g = p.ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r);
  g.addColorStop(0, inner);
  g.addColorStop(1, outer);
  return g;
}

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

/** Draw on a vertical face along the u axis. Inside fn, y = -z. */
function onFace(p: Pen, o: Pt, fn: () => void): void {
  const ctx = p.ctx;
  ctx.save();
  ctx.translate(o.x, o.y);
  ctx.transform(1, 0.5, 0, 1, 0, 0);
  fn();
  ctx.restore();
}

function withXform(p: Pen, x: number, y: number, rot: number, fn: () => void, sx = 1, sy = 1): void {
  const ctx = p.ctx;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.scale(sx, sy);
  fn();
  ctx.restore();
}

function post(p: Pen, x: number, y: number, ht: number, color = WOOD, w = 4): void {
  p.ellipse(x, y, w * 0.95, w * 0.42, shade(color, -0.25));
  p.rect(x - w / 2, y - ht, w, ht, shade(color, 0.05));
  p.ellipse(x, y - ht, w / 2, w / 4, shade(color, 0.3));
}

/** Teardrop flame whose base sits at (x, y). */
function flame(p: Pen, x: number, y: number, s: number, glow = true): void {
  if (glow) p.glow(x, y - s, s * 4.5, '#ffb03a', 0.5);
  const drop = (sc: number, yy: number, fill: string, stroke: string | null) => {
    const ctx = p.ctx;
    const r = sc * 0.8;
    ctx.beginPath();
    ctx.moveTo(x, yy - sc * 2.5);
    ctx.quadraticCurveTo(x + sc * 0.95, yy - sc * 1.5, x + r * Math.cos(-0.2), yy - r + r * Math.sin(-0.2));
    ctx.arc(x, yy - r, r, -0.2, Math.PI + 0.2, false);
    ctx.quadraticCurveTo(x - sc * 0.95, yy - sc * 1.5, x, yy - sc * 2.5);
    ctx.closePath();
    fs(p, fill, stroke, 0.8);
  };
  drop(s, y, '#ff9a2e', shade('#ff9a2e', -0.3));
  drop(s * 0.55, y - s * 0.15, '#fff3a6', null);
}

function leaf(p: Pen, x: number, y: number, len: number, ang: number, color: string, stroke: string | null = O): void {
  withXform(p, x, y, ang, () => {
    const ctx = p.ctx;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(len * 0.5, -len * 0.42, len, 0);
    ctx.quadraticCurveTo(len * 0.5, len * 0.42, 0, 0);
    ctx.closePath();
    fs(p, color, stroke, 0.8);
  });
}

function pumpkin(p: Pen, x: number, y: number, r: number, color = '#f28a2e'): void {
  const side = shade(color, -0.1);
  for (const dx of [-0.42, 0.42]) {
    const sx = x + r * dx;
    p.ellipse(sx, y, r * 0.62, r * 0.8, radial(p, sx, y, r, shade(side, 0.22), shade(side, -0.18)));
  }
  p.ellipse(x, y, r * 0.5, r * 0.86, radial(p, x, y, r, shade(color, 0.35), color));
  const ty = y - r * 0.8;
  p.poly(
    [
      { x: x - 1.2, y: ty + 0.5 },
      { x: x - 0.9, y: ty - 3.2 },
      { x: x + 1.9, y: ty - 4 },
      { x: x + 1.3, y: ty + 0.5 },
    ],
    '#6f8d3a',
  );
}

function egg(p: Pen, x: number, y: number, r: number, color: string, pat: number): void {
  const rx = r * 0.78;
  const ctx = p.ctx;
  p.ellipse(x, y, rx, r, radial(p, x, y, r * 1.2, shade(color, 0.35), color));
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(x, y, rx, r, 0, 0, TAU);
  ctx.clip();
  const deco = pat % 2 ? '#ffffff' : shade(color, -0.28);
  if (pat % 3 === 0) {
    p.rect(x - rx, y - r * 0.18, rx * 2, r * 0.36, deco, null);
  } else if (pat % 3 === 1) {
    const zz: Pt[] = [];
    for (let i = 0; i <= 6; i++) zz.push({ x: x - rx + (i * rx) / 3, y: y + (i % 2 ? -r * 0.22 : r * 0.12) });
    p.line(zz, deco, Math.max(1, r * 0.22));
  } else {
    for (const [dx, dy] of [
      [-0.4, -0.3],
      [0.35, -0.1],
      [-0.2, 0.35],
      [0.3, 0.5],
      [0, -0.7],
    ]) {
      p.circle(x + dx * rx, y + dy * r, r * 0.16, deco, null);
    }
  }
  ctx.restore();
  p.ellipse(x, y, rx, r, null);
  p.ellipse(x - rx * 0.38, y - r * 0.42, rx * 0.22, r * 0.22, rgba('#ffffff', 0.65), null);
}

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

function grassTufts(p: Pen, pts: Pt[]): void {
  for (const t of pts) {
    for (const dx of [-1.6, 0, 1.6]) {
      p.line([{ x: t.x + dx * 0.4, y: t.y }, { x: t.x + dx, y: t.y - 3 - Math.abs(dx) * -0.3 }], '#4f9a3c', 1.1);
    }
  }
}

function clover(p: Pen, x: number, y: number, s: number, color: string, four = false): void {
  p.line([{ x, y }, { x: x + 0.6, y: y - 4 }], '#3e8a35', 1);
  withXform(
    p,
    x + 0.6,
    y - 4.5,
    0,
    () => {
      const n = four ? 4 : 3;
      for (let k = 0; k < n; k++) {
        const a = (k / n) * TAU + (four ? Math.PI / 4 : 0);
        withXform(p, 0, 0, a, () => p.heart(0, -s * 0.9, s, color));
      }
      p.circle(0, 0, s * 0.25, shade(color, -0.2), null);
    },
    1,
    0.72,
  );
}

function chick(p: Pen, x: number, y: number, r: number): void {
  p.line([{ x: x - 1.5, y }, { x: x - 1.5, y: y - 1.5 }], '#f08a24', 1);
  p.line([{ x: x + 1.5, y }, { x: x + 1.5, y: y - 1.5 }], '#f08a24', 1);
  p.ball(x, y - r - 1, r, '#ffd84a');
  p.ellipse(x - r * 0.5, y - r * 0.85, r * 0.42, r * 0.3, '#f6c232', shade('#f6c232', -0.35), -0.5);
  p.poly(
    [
      { x: x + r * 0.55, y: y - r * 1.25 },
      { x: x + r * 1.15, y: y - r * 1.05 },
      { x: x + r * 0.55, y: y - r * 0.85 },
    ],
    '#ff9a2e',
  );
  p.circle(x + r * 0.15, y - r * 1.4, 0.75, DARK, null);
  p.ellipse(x + r * 0.05, y - r * 0.95, 1, 0.6, rgba('#ff8fa3', 0.8), null);
}

function wrappedCandy(p: Pen, x: number, y: number, color: string, ang: number): void {
  withXform(p, x, y, ang, () => {
    p.poly(
      [
        { x: -2.2, y: 0 },
        { x: -4.6, y: -2 },
        { x: -4.6, y: 2 },
      ],
      shade(color, 0.15),
    );
    p.poly(
      [
        { x: 2.2, y: 0 },
        { x: 4.6, y: -2 },
        { x: 4.6, y: 2 },
      ],
      shade(color, 0.15),
    );
    p.ellipse(0, 0, 2.8, 2.1, color);
    p.ellipse(-0.8, -0.7, 0.9, 0.5, rgba('#ffffff', 0.7), null);
  });
}

function candyCorn(p: Pen, x: number, y: number, ang: number): void {
  withXform(p, x, y, ang, () => {
    p.poly(
      [
        { x: -2.4, y: 2 },
        { x: 2.4, y: 2 },
        { x: 0, y: -3.4 },
      ],
      '#ffffff',
    );
    p.poly(
      [
        { x: -2.4, y: 2 },
        { x: 2.4, y: 2 },
        { x: 1.6, y: 0.2 },
        { x: -1.6, y: 0.2 },
      ],
      '#ffd23f',
      null,
    );
    p.poly(
      [
        { x: -1.6, y: 0.2 },
        { x: 1.6, y: 0.2 },
        { x: 0.75, y: -1.6 },
        { x: -0.75, y: -1.6 },
      ],
      '#ff8c1a',
      null,
    );
    p.poly(
      [
        { x: -2.4, y: 2 },
        { x: 2.4, y: 2 },
        { x: 0, y: -3.4 },
      ],
      null,
    );
  });
}

// ---------------------------------------------------------------------------
// Lifestyle-specific helpers

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

/** Wispy steam curls rising from (x, y). */
function steam(p: Pen, x: number, y: number, h: number, n = 2): void {
  const ctx = p.ctx;
  for (let i = 0; i < n; i++) {
    const ox = x + (i - (n - 1) / 2) * 4.5;
    ctx.beginPath();
    ctx.moveTo(ox, y);
    ctx.bezierCurveTo(ox + 3.2, y - h * 0.25, ox - 3.2, y - h * 0.5, ox, y - h * 0.7);
    ctx.bezierCurveTo(ox + 2.4, y - h * 0.82, ox - 0.8, y - h * 0.92, ox + 1, y - h);
    ctx.strokeStyle = rgba(O, 0.28);
    ctx.lineWidth = 2.6;
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.92)';
    ctx.lineWidth = 1.4;
    ctx.stroke();
  }
}

/** A little bow made of two loops and a knot. */
function bow(p: Pen, x: number, y: number, color: string, s = 1): void {
  p.ellipse(x - 3 * s, y, 3 * s, 1.9 * s, color, O, -0.4);
  p.ellipse(x + 3 * s, y, 3 * s, 1.9 * s, color, O, 0.4);
  p.circle(x, y, 1.3 * s, shade(color, -0.2));
}

function strawberry(p: Pen, x: number, y: number, r: number): void {
  p.ball(x, y, r, '#ff4d5e');
  for (const [dx, dy] of [
    [-0.45, -0.2],
    [0.4, -0.35],
    [0, 0.4],
    [-0.3, 0.55],
    [0.5, 0.3],
  ]) {
    p.circle(x + dx * r, y + dy * r, 0.45, '#fff3d6', null);
  }
  p.poly(
    [
      { x: x - r * 0.9, y: y - r * 0.45 },
      { x: x - r * 0.45, y: y - r * 0.95 },
      { x, y: y - r * 0.6 },
      { x: x + r * 0.45, y: y - r * 1.0 },
      { x: x + r * 0.9, y: y - r * 0.45 },
      { x, y: y - r * 0.1 },
    ],
    LEAF_DK,
    null,
  );
}

/** A soft dumpling with pleats along its top. y is where it rests. */
function dumpling(p: Pen, x: number, y: number, s: number): void {
  const cy = y - 3 * s;
  p.ellipse(x, cy, 4.6 * s, 3.6 * s, radial(p, x, cy, 5 * s, '#ffffff', '#f1e0bf'));
  for (let k = -2; k <= 2; k++) {
    const px = x + k * 1.5 * s;
    p.line([{ x: px, y: cy - 2.6 * s }, { x: px + 0.4 * s, y: cy - 1 * s }], shade('#f1e0bf', -0.35), 0.7);
  }
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

/** Gingham-ish blanket on the ground: a base diamond with crossed stripes. */
function blanket(p: Pen, u0: number, v0: number, du: number, dv: number, base: string, stripe: string, n: number): void {
  p.diamond(u0, v0, du, dv, base, shade(base, -0.3), 0);
  const w = du / n;
  const h = dv / n;
  for (let k = 0; k < n; k += 2) {
    p.diamond(u0 + k * w, v0, w, dv, rgba(stripe, 0.4), null, 0);
    p.diamond(u0, v0 + k * h, du, h, rgba(stripe, 0.4), null, 0);
  }
}

/** A polygon filled with alternating vertical bands, outlined. */
function stripedPoly(p: Pen, pts: Pt[], a: string, b: string, bands: number): void {
  const ctx = p.ctx;
  const x0 = Math.min(...pts.map((q) => q.x));
  const x1 = Math.max(...pts.map((q) => q.x));
  const y0 = Math.min(...pts.map((q) => q.y));
  const y1 = Math.max(...pts.map((q) => q.y));
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (const q of pts.slice(1)) ctx.lineTo(q.x, q.y);
  ctx.closePath();
  ctx.clip();
  const w = (x1 - x0) / bands;
  for (let i = 0; i < bands; i++) {
    ctx.fillStyle = i % 2 ? b : a;
    ctx.fillRect(x0 + i * w, y0 - 1, w + 0.5, y1 - y0 + 2);
  }
  ctx.restore();
  p.poly(pts, null, O, 0.9);
}

/** Deck chair seen from the front-left; (bx, by) is its front foot, k its scale. */
function deckChair(p: Pen, bx: number, by: number, k: number): void {
  const q = (dx: number, dy: number): Pt => ({ x: bx + dx * k, y: by + dy * k });
  thick(p, [q(-4, -2), q(-6, 0)], 1.6, WOOD_DK);
  thick(p, [q(8, -2), q(6, 0)], 1.6, WOOD_DK);
  stripedPoly(p, [q(-8, -6), q(-12, -22), q(-4, -24), q(4, -6)], PINK, '#fff8f0', 4);
  stripedPoly(p, [q(-8, -6), q(4, -6), q(8, -2), q(-4, -2)], PINK, '#fff8f0', 4);
}

/** Striped beach ball resting on the ground at (x, y). */
function beachBall(p: Pen, x: number, y: number, r: number): void {
  const cy = y - r;
  const cols = ['#ff6b6b', '#ffe066', '#4dabf7', '#ffffff', '#69db7c', '#ff9ec4'];
  cols.forEach((col, i) => {
    const a0 = (i / cols.length) * TAU - Math.PI / 2;
    p.arc(x, cy, r, a0, a0 + TAU / cols.length, col, O);
  });
  p.ellipse(x - r * 0.35, cy - r * 0.45, r * 0.22, r * 0.14, rgba('#ffffff', 0.7), null, -0.5);
}

function bee(p: Pen, x: number, y: number, s: number): void {
  p.ellipse(x - 2 * s, y - 4 * s, 2.4 * s, 1.6 * s, rgba('#ffffff', 0.85), O, -0.3);
  p.ellipse(x + 1 * s, y - 4 * s, 2.4 * s, 1.6 * s, rgba('#ffffff', 0.85), O, 0.3);
  p.ellipse(x, y, 3.4 * s, 2.5 * s, '#ffd23f');
  for (const dx of [-1.2, 1.2]) p.line([{ x: x + dx * s, y: y - 2.4 * s }, { x: x + dx * s, y: y + 2.4 * s }], DARK, 0.8 * s);
  p.circle(x + 2.6 * s, y - 0.4 * s, 0.6 * s, DARK, null);
}

/** Half-timber gingerbread person standing with feet on (x, y). */
function gingerbread(p: Pen, x: number, y: number, s: number): void {
  const body = '#d4884a';
  p.ellipse(x - 1.7 * s, y - 1.6 * s, 1.7 * s, 1.8 * s, body);
  p.ellipse(x + 1.7 * s, y - 1.6 * s, 1.7 * s, 1.8 * s, body);
  p.roundRect(x - 3.8 * s, y - 9.6 * s, 7.6 * s, 9 * s, 3 * s, body);
  p.ellipse(x - 4.8 * s, y - 6.4 * s, 1.5 * s, 2.8 * s, body, O, -0.3);
  p.ellipse(x + 4.8 * s, y - 6.4 * s, 1.5 * s, 2.8 * s, body, O, 0.3);
  p.circle(x, y - 13.2 * s, 4 * s, body);
  face(p, x, y - 13.2 * s, 0.55 * s);
  for (const dy of [-6.4, -3.4]) p.circle(x, y + dy * s, 0.9 * s, '#fff8f0', null);
}

/** A small ghost with a face, for hiding behind other props. (x, y) is the head centre. */
function ghostMini(p: Pen, x: number, y: number, s: number): void {
  const ctx = p.ctx;
  ctx.beginPath();
  ctx.moveTo(x - 4 * s, y + 5 * s);
  ctx.lineTo(x - 4 * s, y);
  ctx.arc(x, y, 4 * s, Math.PI, 0, false);
  ctx.lineTo(x + 4 * s, y + 5 * s);
  ctx.lineTo(x + 2 * s, y + 3.4 * s);
  ctx.lineTo(x, y + 5 * s);
  ctx.lineTo(x - 2 * s, y + 3.4 * s);
  ctx.closePath();
  fs(p, '#ffffff', O, 1);
  face(p, x, y + 0.6 * s, 0.5 * s);
}

// ---------------------------------------------------------------------------
// Lunar New Year

function dumplingTable(p: Pen): void {
  const c = p.center;
  p.shadow(c.x, c.y + 3, 42, 15);
  table(p, 0.06, 0.1, 1.88, 0.8, 11, '#c8423a');
  const z = 14;
  p.line([p.iso(0.06, 0.9, z), p.iso(1.94, 0.9, z)], GOLD, 1.2);
  // two bamboo steamers, each heaped with dumplings
  for (const u of [0.66, 1.34]) {
    const b = p.iso(u, 0.42, z);
    p.cylinder(b.x, b.y, 12, 8, '#ecc985');
    for (const dy of [2.5, 5.5]) {
      p.curve({ x: b.x - 12, y: b.y - dy }, { x: b.x, y: b.y - dy + 12 }, { x: b.x + 12, y: b.y - dy }, shade('#ecc985', -0.4), 0.8);
    }
    dumpling(p, b.x - 4.5, b.y - 7, 0.95);
    dumpling(p, b.x + 4.5, b.y - 7, 0.95);
    dumpling(p, b.x, b.y - 10, 1.05);
    steam(p, b.x - 1, b.y - 16, 14, 2);
  }
  // a sauce dish with a chibi dumpling sitting in it
  const d = p.iso(1.05, 0.82, z);
  p.ellipse(d.x, d.y - 1, 10, 5, '#ffffff');
  p.ellipse(d.x, d.y - 1.4, 7, 3.3, '#8a4a22', null);
  p.ellipse(d.x, d.y - 6, 5.2, 4.6, radial(p, d.x, d.y - 6, 6, '#ffffff', '#f3e4c4'));
  p.curve({ x: d.x - 4, y: d.y - 8 }, { x: d.x, y: d.y - 11.5 }, { x: d.x + 4, y: d.y - 8 }, shade('#f3e4c4', -0.35), 0.8);
  face(p, d.x, d.y - 5.5, 0.6);
  // chopsticks and a lucky red envelope
  const s1 = p.iso(1.4, 0.95, z);
  const s2 = p.iso(1.75, 0.6, z);
  p.line([s1, s2], '#a8673a', 1.7);
  p.line([{ x: s1.x + 1.2, y: s1.y - 0.6 }, { x: s2.x + 1.2, y: s2.y - 0.6 }], '#c98b53', 1.4);
  p.diamond(0.2, 0.72, 0.24, 0.16, '#d6312b', O, z);
  const seal = p.iso(0.32, 0.8, z);
  p.circle(seal.x, seal.y, 1, GOLD, null);
}

/** Lion dance drum on a wooden block, with a little lion on its head. */
function lionDrum(p: Pen): void {
  const { x, y } = p.center;
  p.shadow(x, y + 1, 17, 7);
  boxAt(p, x, y, 0.6, 0.6, 5, WOOD);
  const by = y - 5;
  p.cylinder(x, by, 12, 11, '#d6322b');
  for (const dy of [3, 8]) p.curve({ x: x - 12, y: by - dy }, { x, y: by - dy + 12 }, { x: x + 12, y: by - dy }, GOLD, 2);
  // gold tassels hanging off the drum rim
  for (const s of [-1, 1]) {
    thickCurve(p, { x: x + s * 11, y: by - 8 }, { x: x + s * 17, y: by - 5 }, { x: x + s * 14, y: by + 1 }, 1.8, RED);
    p.circle(x + s * 14, by + 2, 1.6, GOLD);
  }
  const hy = by - 11;
  p.ellipse(x, hy, 12, 6, '#fff1d0', O);
  // lion face on the drumhead
  p.circle(x - 4.5, hy - 6, 1.9, '#f7a53a');
  p.circle(x + 4.5, hy - 6, 1.9, '#f7a53a');
  p.circle(x, hy - 3, 6, '#f7a53a');
  p.circle(x, hy - 2.4, 4.2, '#ffe2a8', null);
  face(p, x, hy - 2.4, 0.75);
  // drumsticks resting on the head
  thick(p, [{ x: x - 16, y: hy - 18 }, { x: x - 8, y: hy - 4 }], 2, WOOD_LT);
  thick(p, [{ x: x + 16, y: hy - 18 }, { x: x + 8, y: hy - 4 }], 2, WOOD_LT);
  p.circle(x - 16, hy - 18, 2.6, RED);
  p.circle(x + 16, hy - 18, 2.6, RED);
  sparkle(p, x + 9, hy - 22, 2.4);
}

/** Potted tangerine tree with a smiling pot, fruit and hanging red envelopes. */
function tangerineTree(p: Pen): void {
  const { x, y } = p.center;
  p.shadow(x, y + 1, 18, 8);
  p.cylinder(x, y, 10.5, 11, '#e8553a');
  p.curve({ x: x - 10.5, y: y - 2 }, { x, y: y + 2.5 }, { x: x + 10.5, y: y - 2 }, GOLD, 1.6);
  p.ellipse(x, y - 11, 9.4, 4.2, WOOD_DK);
  face(p, x, y - 6, 0.8);
  thick(p, [{ x, y: y - 10 }, { x: x - 1, y: y - 20 }, { x: x + 1, y: y - 27 }], 3, '#8a5a3a');
  p.foliage(x, y - 38, 16, '#6cc04a', 'tangerine', 8);
  const fruit: [number, number][] = [
    [-9, -42],
    [3, -49],
    [10, -38],
    [-2, -34],
    [6, -28],
    [-12, -33],
  ];
  for (const [dx, dy] of fruit) {
    const fx = x + dx;
    const fy = y + dy;
    p.ball(fx, fy, 3.4, '#ff9d2e');
    leaf(p, fx, fy - 3, 3.5, -2.2, LEAF);
    p.ellipse(fx - 1, fy - 1, 0.9, 0.6, rgba('#ffffff', 0.7), null);
  }
  // hanging red envelopes with gold seals
  for (const dx of [-10, 7]) {
    const ex = x + dx;
    const ey = y - 23;
    p.line([{ x: ex + 2.5, y: y - 28 }, { x: ex + 2.5, y: ey }], O, 0.6);
    withXform(p, ex, ey, dx < 0 ? -0.12 : 0.1, () => {
      p.rect(0, 0, 6, 8, '#d6312b');
      p.circle(3, 3.6, 1.2, GOLD, null);
    });
  }
  sparkle(p, x + 15, y - 54, 2.6);
  sparkle(p, x - 16, y - 48, 2);
}

// ---------------------------------------------------------------------------
// Valentine's

/** Chocolate fondue on a gingham-clothed table, strawberries on skewers. */
function fondueTable(p: Pen): void {
  const c = p.center;
  p.shadow(c.x, c.y + 3, 28, 11);
  table(p, 0.04, 0.04, 0.92, 0.92, 10, '#fff7f9');
  const z = 13;
  for (let k = 1; k < 4; k++) {
    const u = 0.04 + (0.92 * k) / 4;
    p.line([p.iso(u, 0.04, z), p.iso(u, 0.96, z)], rgba(PINK, 0.55), 1.1);
    p.line([p.iso(0.04, u, z), p.iso(0.96, u, z)], rgba(PINK, 0.55), 1.1);
  }
  const pc = p.iso(0.5, 0.5, z);
  p.cylinder(pc.x, pc.y, 9, 8, '#f3d3a0');
  p.ellipse(pc.x, pc.y - 8, 7.6, 3.6, '#6b3a24', O);
  p.ellipse(pc.x - 2.5, pc.y - 8.6, 1.8, 0.9, rgba('#ffffff', 0.25), null);
  for (const [dx, dy] of [
    [-7, -18],
    [0, -24],
    [7, -17],
  ] as const) {
    const base = { x: pc.x + dx * 0.25, y: pc.y - 6 };
    const tip = { x: pc.x + dx, y: pc.y + dy };
    p.line([base, tip], '#d9a86a', 1.1);
    strawberry(p, tip.x, tip.y, 4.2);
  }
  // a little plate of marshmallows at the front
  const pl = p.iso(0.25, 0.78, z);
  p.ellipse(pl.x, pl.y - 1, 8, 4, '#ffffff');
  p.ball(pl.x - 2.6, pl.y - 4.5, 2.6, '#ffd6e5');
  p.ball(pl.x + 2.4, pl.y - 4.8, 2.6, '#ffffff');
  p.heart(pc.x - 13, pc.y - 30, 2.6, '#ff6b8e');
  p.heart(pc.x + 13, pc.y - 33, 2, '#ff9fbc');
}

/** Love letter mailbox: pink box on a wood post, stuffed with envelopes. */
function loveMailbox(p: Pen): void {
  const { x, y } = p.center;
  p.shadow(x, y + 1, 14, 6);
  post(p, x, y, 26, '#9a6a44', 4);
  const top = y - 26;
  p.roundRect(x - 12, top - 20, 24, 20, 9, p.vgrad(top - 20, top, '#ffbdd0', '#ec5a86'));
  // a glossy highlight and the letter slot
  p.ellipse(x - 7, top - 13, 1.6, 4, rgba('#ffffff', 0.55), null, 0.1);
  p.roundRect(x - 8, top - 10, 16, 3, 1.4, '#5b2a3a', null);
  // envelopes stuffed out of the slot
  for (const [dx, rot] of [
    [-4, -0.12],
    [0, 0.06],
    [4, 0.16],
  ] as const) {
    withXform(p, x + dx, top - 8.5, rot, () => {
      p.rect(-3.6, -2.8, 7.2, 5, '#fff7fa');
      p.line([{ x: -3.6, y: -2.8 }, { x: 0, y: 0.4 }, { x: 3.6, y: -2.8 }], '#ff8fb3', 0.6);
    });
  }
  // little red flag with a heart
  p.line([{ x: x + 13, y: top - 4 }, { x: x + 13, y: top - 24 }], O, 1);
  p.poly(
    [
      { x: x + 13, y: top - 24 },
      { x: x + 20, y: top - 21 },
      { x: x + 13, y: top - 18 },
    ],
    RED,
  );
  p.heart(x + 16, top - 21, 1.6, '#ffffff', null);
  // stray letters on the ground
  withXform(p, x + 12, y + 1, 0.3, () => p.rect(0, 0, 6, 3.5, '#ff9fbf'));
  withXform(p, x - 14, y, -0.2, () => p.rect(0, 0, 6, 3.5, '#ffc2d6'));
  p.heart(x - 16, top - 26, 3.2, '#ff5b7f');
  p.heart(x + 18, top - 30, 2.4, '#ff8fb3');
}

/** Picnic blanket for two: basket, heart cake, two cups. Flat on the ground. */
function picnicForTwo(p: Pen): void {
  blanket(p, 0.2, 0.2, 1.6, 1.6, '#fff1f5', PINK, 4);
  // wicker basket with a strawberry peeking out
  p.box(0.3, 0.32, 0.5, 0.4, 7, WOOD_LT);
  p.diamond(0.3, 0.32, 0.5, 0.4, '#fff5f8', O, 7);
  for (const [u, v] of [
    [0.42, 0.5],
    [0.62, 0.52],
  ] as const) {
    const q = p.iso(u, v, 7);
    strawberry(p, q.x, q.y - 2.2, 2.6);
  }
  // heart cake on a plate
  const cake = p.iso(1.22, 0.62, 0);
  p.ellipse(cake.x, cake.y, 10, 5, '#ffffff');
  withXform(p, cake.x, cake.y - 0.5, 0, () => {
    p.heart(0, 1.4, 4.6, shade(PINK, -0.25), null);
    p.heart(0, 0, 4.6, '#ffb3c8');
  }, 1, 0.6);
  p.cylinder(cake.x, cake.y - 1.2, 1.4, 4, '#fff6b0');
  flame(p, cake.x, cake.y - 5.2, 2.2, false);
  // two cups with hearts
  for (const [u, v] of [
    [1.36, 1.3],
    [1.62, 1.1],
  ] as const) {
    const b = p.iso(u, v, 0);
    p.cylinder(b.x, b.y, 4.4, 7, PINK);
    p.heart(b.x, b.y - 4, 1.7, '#ffffff', null);
  }
  for (const [u, v] of [
    [0.9, 1.6],
    [1.7, 1.7],
    [0.4, 1.7],
  ] as const) {
    const q = p.iso(u, v, 0);
    p.heart(q.x, q.y, 1.6, '#ff9fbc', null);
  }
}

// ---------------------------------------------------------------------------
// St. Patrick's

/** Shamrock tea table: a green teapot with a face, two cups with clovers. */
function shamrockTea(p: Pen): void {
  const c = p.center;
  p.shadow(c.x, c.y + 1, 18, 8);
  p.cylinder(c.x, c.y, 2.8, 12, WOOD_DK);
  p.cylinder(c.x, c.y - 12, 14, 3, '#5fbf6a');
  const Y = c.y - 15;
  const green = '#8fdc7a';
  // teapot
  p.ball(c.x, Y - 8, 8, green);
  face(p, c.x, Y - 7.5, 0.9);
  p.ellipse(c.x, Y - 15, 4.4, 2, '#b6ec9a');
  p.circle(c.x, Y - 17.2, 1.5, '#ffd166');
  thickCurve(p, { x: c.x + 6.5, y: Y - 6 }, { x: c.x + 13, y: Y - 6 }, { x: c.x + 15, y: Y - 14 }, 2.4, green);
  thickCurve(p, { x: c.x - 6.5, y: Y - 11 }, { x: c.x - 14, y: Y - 10 }, { x: c.x - 7.5, y: Y - 2 }, 2, green);
  steam(p, c.x + 15, Y - 16, 11, 1);
  // two cups with clovers on their saucers
  for (const dx of [-11, 11]) {
    const cx = c.x + dx;
    const cy = Y + 2.5;
    p.ellipse(cx, cy, 5.6, 2.6, '#f3f9f0');
    p.cylinder(cx, cy, 3.8, 4.8, '#ffffff');
    p.heart(cx, cy - 2.6, 1.6, LEAF, null);
  }
  p.heart(c.x, Y + 4.5, 0.6, '#ffffff', null);
}

/** Top hat turned planter: clovers sprout from the soil; the hat has a face. */
function hatPlanter(p: Pen): void {
  const c = p.center;
  p.shadow(c.x, c.y + 1, 15, 6);
  const hat = '#2d2b3d';
  p.ellipse(c.x, c.y, 13, 4.6, '#3a3850');
  p.cylinder(c.x, c.y, 8.5, 14, hat);
  p.curve({ x: c.x - 8.5, y: c.y - 4 }, { x: c.x, y: c.y - 0.5 }, { x: c.x + 8.5, y: c.y - 4 }, GOLD, 2.4);
  face(p, c.x, c.y - 9, 0.75);
  p.ellipse(c.x, c.y - 14, 7.2, 3.2, '#6b4226', null);
  clover(p, c.x - 3, c.y - 14, 3, '#46c15a');
  clover(p, c.x + 2.5, c.y - 15, 3.5, '#5fd46b', true);
  sparkle(p, c.x + 8, c.y - 24, 2.4);
}

/** Clover-backed garden bench with a tuft of lucky clovers on the grass. */
function cloverBench(p: Pen): void {
  const c = p.center;
  p.shadow(c.x, c.y + 2, 22, 9);
  for (const [u, v] of [
    [0.12, 0.85],
    [0.8, 0.12],
    [0.9, 0.9],
  ] as const) {
    const q = p.iso(u, v, 0);
    clover(p, q.x, q.y, 2.2, '#4fcf5f');
  }
  for (const [u, v] of [
    [0.14, 0.36],
    [0.82, 0.36],
    [0.14, 0.6],
    [0.82, 0.6],
  ] as const) {
    p.box(u, v, 0.05, 0.05, 7, WOOD_DK);
  }
  p.box(0.08, 0.32, 0.84, 0.36, 3, WOOD_LT, 7);
  p.box(0.08, 0.3, 0.84, 0.05, 14, '#63c46e', 10);
  onFace(p, p.iso(0.08, 0.35, 10), () => {
    for (const cx of [7, 14, 21]) {
      const s = 2;
      p.circle(cx - s, -6 - s * 0.2, s, '#e4ffd6', O);
      p.circle(cx + s, -6 - s * 0.2, s, '#e4ffd6', O);
      p.circle(cx, -6 - s * 1.1, s, '#e4ffd6', O);
      p.line([{ x: cx, y: -6 }, { x: cx, y: -3 }], '#3e8a35', 0.9);
    }
  });
}

// ---------------------------------------------------------------------------
// Spring

/** Egg painting table: paint pots with brushes, painted eggs and a chick. */
function eggPainting(p: Pen): void {
  const c = p.center;
  p.shadow(c.x, c.y + 3, 20, 8);
  table(p, 0.08, 0.1, 0.84, 0.8, 9, '#f2c48a');
  const z = 12;
  const pots: [number, number, string][] = [
    [0.24, 0.3, '#ff7fb0'],
    [0.42, 0.24, '#7cc8ff'],
    [0.22, 0.6, '#ffd84a'],
  ];
  for (const [u, v, col] of pots) {
    const b = p.iso(u, v, z);
    p.cylinder(b.x, b.y, 3.2, 4.5, col);
    thick(p, [{ x: b.x, y: b.y - 4.5 }, { x: b.x + 4, y: b.y - 12 }], 1.4, WOOD_LT);
    p.circle(b.x + 4, b.y - 12.4, 1.4, col);
  }
  const eggs: [number, number, string, number][] = [
    [0.6, 0.3, '#ffb3c8', 0],
    [0.76, 0.5, '#8fd0ff', 1],
    [0.55, 0.62, '#ffe07a', 2],
    [0.78, 0.8, '#c7a6ff', 3],
  ];
  for (const [u, v, col, pat] of eggs) {
    const b = p.iso(u, v, z);
    egg(p, b.x, b.y - 5.5, 5.5, col, pat);
  }
  // one egg has a happy face
  const fe = p.iso(0.76, 0.5, z);
  face(p, fe.x, fe.y - 6, 0.6);
  const ch = p.iso(0.36, 0.86, z);
  chick(p, ch.x, ch.y, 4.2);
  sparkle(p, c.x + 10, c.y - 22, 2.4);
}

/** Bunny peeking out of a grassy burrow mound. */
function bunnyBurrow(p: Pen): void {
  const { x, y } = p.center;
  p.shadow(x, y + 2, 20, 8);
  // mound
  p.ellipse(x, y - 1, 15, 10, radial(p, x, y - 1, 16, '#9be07a', '#5fae4a'));
  grassTufts(p, [
    { x: x - 9, y: y + 2 },
    { x: x + 8, y: y + 4 },
  ]);
  p.flower(x - 10, y - 2, 2, '#ffffff', '#ffd84a');
  p.flower(x + 10, y - 3, 2, '#ffd0e0', '#ffd84a');
  // burrow hole, then the bunny rising out of it (clipped at the hole's rim)
  p.ellipse(x, y - 4.5, 5.5, 2.6, '#3b2a20', O);
  const ctx = p.ctx;
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, p.W, y - 5.5);
  ctx.clip();
  const cream = '#fffafc';
  p.ellipse(x - 4.5, y - 28, 2.9, 7.5, cream, O, -0.18);
  p.ellipse(x + 4.5, y - 28, 2.9, 7.5, cream, O, 0.18);
  p.ellipse(x - 4.5, y - 28, 1.3, 5, '#ffb3c8', null, -0.18);
  p.ellipse(x + 4.5, y - 28, 1.3, 5, '#ffb3c8', null, 0.18);
  p.circle(x, y - 10.5, 8.5, radial(p, x, y - 10.5, 9, '#ffffff', '#f2e4ea'));
  face(p, x, y - 10.5, 0.95);
  ctx.restore();
  // a carrot by the burrow
  p.poly(
    [
      { x: x + 8, y: y + 1 },
      { x: x + 11, y: y + 1 },
      { x: x + 9.5, y: y + 7 },
    ],
    '#ff8a2a',
  );
  p.poly(
    [
      { x: x + 8.6, y: y + 1 },
      { x: x + 9.4, y: y - 2.5 },
      { x: x + 10.4, y: y + 1 },
    ],
    LEAF,
  );
}

/** Spring kite flying from a wooden post, with a smiling face. */
function kitePost(p: Pen): void {
  const { x, y } = p.center;
  p.shadow(x, y + 1, 14, 6);
  post(p, x, y, 52, WOOD, 3.6);
  const k = 1.5;
  const kx = x + 14;
  const ky = y - 68;
  p.curve({ x, y: y - 52 }, { x: x + 6, y: y - 44 }, { x: kx, y: ky + 16 * k }, '#6a5a4a', 0.8);
  const top = { x: kx, y: ky - 16 * k };
  const right = { x: kx + 10 * k, y: ky };
  const bottom = { x: kx, y: ky + 16 * k };
  const left = { x: kx - 10 * k, y: ky };
  const center = { x: kx, y: ky };
  p.poly([center, top, left], '#ff7fa8', null);
  p.poly([center, top, right], '#ffd166', null);
  p.poly([center, left, bottom], '#7fd8ff', null);
  p.poly([center, right, bottom], '#a8e6a0', null);
  p.poly([top, right, bottom, left], null, O, 1.1);
  face(p, kx, ky + 2, 1.15);
  // tail with bows
  p.curve(bottom, { x: kx - 10, y: ky + 26 }, { x: kx + 2, y: ky + 44 }, O, 0.8);
  for (const [dx, dy, col] of [
    [-4, 24, '#ff7fa8'],
    [0, 34, '#ffd166'],
    [-1, 44, '#7fd8ff'],
  ] as const) {
    bow(p, kx + dx, ky + dy, col, 1.1);
  }
}

/** Tiny blossom picnic with sakura petals and bento: flat, with petals drifting. */
function blossomPicnic(p: Pen): void {
  blanket(p, 0.2, 0.2, 1.6, 1.6, '#fff1f5', '#ffb3c9', 6);
  // bento boxes
  p.box(0.6, 0.62, 0.42, 0.34, 4, '#fff6ea', 0);
  p.box(0.6, 0.62, 0.42, 0.34, 2, RED, 4);
  for (const [u, v] of [
    [0.7, 0.75],
    [0.86, 0.85],
  ] as const) {
    const q = p.iso(u, v, 6);
    p.ball(q.x, q.y - 2, 2.6, '#fffdf7');
    p.rect(q.x - 1.4, q.y - 4.5, 2.8, 2.2, '#2b2b2b', null);
  }
  // blossom branch in a little blue vase
  const vase = p.iso(1.45, 1.1, 0);
  p.cylinder(vase.x, vase.y, 4, 8, '#8fc8f0');
  thick(p, [{ x: vase.x, y: vase.y - 8 }, { x: vase.x - 3, y: vase.y - 16 }, { x: vase.x + 4, y: vase.y - 22 }], 1.4, WOOD_DK);
  for (const [dx, dy] of [
    [-3, -17],
    [3, -14],
    [4, -23],
    [-1, -22],
  ] as const) {
    p.flower(vase.x + dx, vase.y + dy, 2.6, '#ffc2d6', '#ffd84a');
  }
  // petals scattered across the blanket
  const rand = rng('blossom-picnic');
  for (let i = 0; i < 14; i++) {
    const q = p.iso(0.3 + rand() * 1.4, 0.3 + rand() * 1.4, 0);
    p.ellipse(q.x, q.y, 2.2, 1.2, '#ffc2d6', null, rand() * 3);
  }
  // falling petals in the air
  for (let i = 0; i < 4; i++) {
    p.ellipse(p.center.x - 14 + i * 9, 6 + (i % 2) * 8, 1.8, 1, rgba('#ffc2d6', 0.9), null, i);
  }
}

// ---------------------------------------------------------------------------
// Summer

/** Ice cream cart with a striped umbrella and cones on top. */
function iceCreamCart(p: Pen): void {
  const c = p.center;
  p.shadow(c.x, c.y + 2, 24, 10);
  const body = '#ff9fc4';
  p.box(0.12, 0.22, 0.76, 0.56, 13, body, 5);
  // front face with a smiling face
  onFace(p, p.iso(0.12, 0.78, 0), () => {
    p.roundRect(0, -17, 22.8, 5, 1.5, '#fff3f8', null);
    face(p, 11.4, -11, 1.1);
  });
  // wheels on the front-left face
  for (const u of [0.32, 0.7]) {
    onFace(p, p.iso(0, 0.78, 0), () => {
      p.circle(u * 32, -4.5, 4.2, '#6b4a3a');
      p.circle(u * 32, -4.5, 1.6, GOLD);
    });
  }
  // cones on the counter
  for (const [u, v] of [
    [0.3, 0.55],
    [0.6, 0.6],
  ] as const) {
    const b = p.iso(u, v, 18);
    p.poly(
      [
        { x: b.x - 4, y: b.y - 9 },
        { x: b.x + 4, y: b.y - 9 },
        { x: b.x, y: b.y },
      ],
      '#e8b070',
    );
    p.ball(b.x, b.y - 11.5, 5, u < 0.5 ? '#ff8fb8' : '#8fe8d0');
  }
  // umbrella canopy on a pole at the back of the cart
  const pb = p.iso(0.5, 0.26, 18);
  const cx = pb.x;
  const cy = pb.y - 36;
  p.line([{ x: pb.x, y: pb.y }, { x: cx, y: cy }], WOOD_DK, 2);
  const canopyPath = () => {
    const ctx = p.ctx;
    ctx.beginPath();
    ctx.ellipse(cx, cy, 20, 12, 0, Math.PI, 0, false);
    for (let i = 0; i < 4; i++) {
      const x1 = cx + 20 - (i + 1) * 10;
      ctx.quadraticCurveTo(cx + 20 - i * 10 - 5, cy + 6, x1, cy);
    }
    ctx.closePath();
  };
  const ctx = p.ctx;
  ctx.save();
  canopyPath();
  ctx.clip();
  for (let i = 0; i < 8; i++) {
    ctx.fillStyle = i % 2 ? '#ffffff' : '#ff7fa8';
    ctx.fillRect(cx - 20 + i * 5, cy - 14, 5, 22);
  }
  ctx.restore();
  canopyPath();
  fs(p, null, O, 1);
  p.heart(cx, cy - 13, 2.4, '#ffffff', null);
  p.circle(cx, cy - 13.5, 0.6, '#ff5b7f', null);
  sparkle(p, cx + 18, cy - 16, 2.4);
}

/** Two striped deck chairs with a beach ball between them. */
function beachChairs(p: Pen): void {
  const c = p.center;
  p.shadow(c.x, c.y + 3, 40, 14, 0.2);
  const a = p.iso(0.55, 0.5, 0);
  const b = p.iso(1.45, 0.5, 0);
  deckChair(p, a.x, a.y, 1.3);
  deckChair(p, b.x, b.y, 1.3);
  beachBall(p, p.iso(1, 1.05, 0).x + 2, p.iso(1, 1.05, 0).y, 4.6);
}

/** Watermelon picnic: a green-striped blanket, a slice and a whole melon. */
function watermelonPicnic(p: Pen): void {
  blanket(p, 0.2, 0.2, 1.6, 1.6, '#e9fbe0', '#7ed16a', 4);
  // whole melon
  const m = p.iso(1.2, 0.6, 0);
  p.ball(m.x, m.y - 11, 11, '#4fae4a');
  p.curve({ x: m.x - 5, y: m.y - 21 }, { x: m.x - 8, y: m.y - 11 }, { x: m.x - 5, y: m.y - 1 }, '#2f7a34', 1.3);
  p.curve({ x: m.x + 5, y: m.y - 21 }, { x: m.x + 8, y: m.y - 11 }, { x: m.x + 5, y: m.y - 1 }, '#2f7a34', 1.3);
  p.ellipse(m.x - 4.5, m.y - 17, 2.4, 1.2, rgba('#ffffff', 0.6), null, -0.5);
  // slice standing on its flat edge
  const s = p.iso(0.55, 1.25, 0);
  p.arc(s.x, s.y, 13, Math.PI, TAU, '#3f9d46');
  p.arc(s.x, s.y, 11.2, Math.PI, TAU, '#f5fff0', null);
  p.arc(s.x, s.y, 10, Math.PI, TAU, '#ff5a6e', null);
  for (const [dx, dy] of [
    [-4.4, -3.6],
    [3.4, -5.4],
    [0, -2.8],
    [-1.4, -8],
    [5.4, -2.4],
  ]) {
    p.ellipse(s.x + dx, s.y + dy, 0.7, 1.4, DARK, null, 0.3);
  }
  bee(p, s.x + 8, s.y - 24, 1.2);
}

/** Lawn sprinkler throwing arcs of water with droplets. */
function sprinkler(p: Pen): void {
  const c = p.center;
  p.shadow(c.x, c.y + 1, 16, 6);
  p.ellipse(c.x, c.y + 1, 12, 5, rgba('#7cc8f0', 0.35), null);
  p.cylinder(c.x, c.y, 5.5, 3, '#6fc3e8');
  p.rect(c.x - 1.6, c.y - 12, 3.2, 9, '#6fc3e8');
  p.circle(c.x, c.y - 14, 4.6, radial(p, c.x, c.y - 14, 5, '#ffe38a', '#f4b43a'));
  face(p, c.x, c.y - 14, 0.55);
  for (const s of [-1, 1]) {
    p.curve({ x: c.x + s * 2, y: c.y - 16 }, { x: c.x + s * 11, y: c.y - 31 }, { x: c.x + s * 18, y: c.y - 6 }, '#8fd8ff', 2.2);
    p.curve({ x: c.x + s * 2, y: c.y - 16 }, { x: c.x + s * 13, y: c.y - 22 }, { x: c.x + s * 26, y: c.y - 4 }, '#8fd8ff', 1.8);
    p.curve({ x: c.x + s * 2, y: c.y - 16 }, { x: c.x + s * 11, y: c.y - 31 }, { x: c.x + s * 18, y: c.y - 6 }, '#ffffff', 0.7);
    for (const [dx, dy, r] of [
      [18, -4, 1.5],
      [24, -7, 1.2],
      [26, -2, 1.3],
    ] as const) {
      p.circle(c.x + s * dx, c.y + dy, r, '#bfeaff', O);
      p.circle(c.x + s * dx - 0.4, c.y + dy - 0.5, 0.4, '#ffffff', null);
    }
  }
  grassTufts(p, [
    { x: c.x - 10, y: c.y + 3 },
    { x: c.x + 10, y: c.y + 4 },
  ]);
}

// ---------------------------------------------------------------------------
// Harvest

/** Apple bobbing tub of water with red apples and a rubber duck. */
function appleBobbing(p: Pen): void {
  const { x, y } = p.center;
  p.shadow(x, y + 1, 18, 8);
  p.cylinder(x, y, 16, 12, WOOD);
  for (const dy of [3, 8]) p.curve({ x: x - 16, y: y - dy }, { x, y: y - dy + 7 }, { x: x + 16, y: y - dy }, shade(WOOD, -0.35), 1);
  p.ellipse(x, y - 12, 16, 7.5, shade(WOOD, 0.25));
  p.ellipse(x, y - 12, 13.4, 6.2, radial(p, x, y - 12, 14, '#bfeaff', '#4fb6e8'), null);
  p.ellipse(x - 6, y - 14, 3.4, 1, rgba('#ffffff', 0.6), null, -0.2);
  // apples bobbing
  for (const [dx, dy] of [
    [-6, -10],
    [4, -13],
  ] as const) {
    const ax = x + dx;
    const ay = y + dy;
    p.ball(ax, ay, 4.4, '#e5344f');
    leaf(p, ax, ay - 4, 3.8, -2.3, LEAF);
    p.ellipse(ax - 1.4, ay - 1.4, 1, 1.6, rgba('#ffffff', 0.7), null, 0.3);
  }
  // rubber duck with a face
  p.ball(x + 7, y - 12, 4.2, '#ffd84a');
  p.ball(x + 10, y - 17.5, 2.8, '#ffd84a');
  p.poly(
    [
      { x: x + 12.4, y: y - 18.6 },
      { x: x + 15, y: y - 17.2 },
      { x: x + 12.4, y: y - 16 },
    ],
    '#ff9a2e',
  );
  face(p, x + 9.6, y - 18, 0.45);
  // ripples
  p.ellipse(x - 3, y - 10, 7, 2.4, null, rgba('#ffffff', 0.7), 0);
}

/** Pie cooling rack with two lattice pies and a little steam. */
function pieRack(p: Pen): void {
  const c = p.center;
  p.shadow(c.x, c.y + 3, 22, 9);
  const z = 12;
  for (const [u, v] of [
    [0.12, 0.12],
    [0.82, 0.12],
    [0.12, 0.82],
    [0.82, 0.82],
  ] as const) {
    const bot = p.iso(u, v, 0);
    const up = p.iso(u, v, z);
    p.line([bot, up], '#9aa6b4', 2);
  }
  const grid = '#c9d2da';
  p.poly(
    [p.iso(0.06, 0.06, z), p.iso(0.94, 0.06, z), p.iso(0.94, 0.94, z), p.iso(0.06, 0.94, z)],
    rgba('#e5ebf0', 0.6),
    '#8a96a4',
    1,
  );
  for (let k = 1; k < 5; k++) {
    const t = 0.06 + (0.88 * k) / 5;
    p.line([p.iso(t, 0.06, z), p.iso(t, 0.94, z)], grid, 0.9);
    p.line([p.iso(0.06, t, z), p.iso(0.94, t, z)], grid, 0.9);
  }
  for (const [u, v, cherry] of [
    [0.35, 0.5, true],
    [0.72, 0.5, false],
  ] as const) {
    const b = p.iso(u, v, z);
    const r = 8.5;
    p.cylinder(b.x, b.y, r, 4, '#e0a04c');
    p.ellipse(b.x, b.y - 3.5, r, r / 2, cherry ? '#c4363f' : '#e8b25a', O);
    // lattice across the top
    const ctx = p.ctx;
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(b.x, b.y - 3.5, r - 0.5, r / 2 - 0.4, 0, 0, TAU);
    ctx.clip();
    for (let k = -4; k <= 4; k++) {
      p.line([{ x: b.x + k * 2.2 - 4, y: b.y - 3.5 + 4 }, { x: b.x + k * 2.2 + 4, y: b.y - 3.5 - 4 }], '#ffe3a0', 1);
    }
    ctx.restore();
    p.ellipse(b.x, b.y - 3.5, r, r / 2, null);
  }
  const s = p.iso(0.72, 0.5, z);
  steam(p, s.x, s.y - 8, 12, 2);
}

/** Hayride wagon full of hay bales and pumpkins, wheels on its front face. */
function hayrideWagon(p: Pen): void {
  const c = p.center;
  p.shadow(c.x, c.y + 3, 44, 16);
  p.box(0.15, 0.3, 1.7, 0.46, 6, '#d9a066', 6);
  // hay bales in the bed
  p.box(0.22, 0.38, 0.52, 0.32, 7, '#f6c85a', 12);
  p.box(1.12, 0.36, 0.5, 0.34, 7, '#f6c85a', 12);
  for (const [u, v] of [
    [0.48, 0.5],
    [1.4, 0.5],
  ] as const) {
    const q = p.iso(u, v, 19);
    for (let k = -2; k <= 2; k++) p.line([{ x: q.x - 9, y: q.y + k * 2.5 }, { x: q.x + 9, y: q.y + k * 2.5 - 1 }], '#e0a53a', 0.8);
  }
  // pumpkins on the bed
  for (const [u, v, r] of [
    [1.6, 0.5, 5.5],
    [0.8, 0.52, 5],
  ] as const) {
    const q = p.iso(u, v, 6);
    pumpkin(p, q.x, q.y - 0.86 * r, r);
  }
  // wheels on the front-left face
  for (const u of [0.45, 1.55]) {
    onFace(p, p.iso(0, 0.76, 0), () => {
      p.circle(u * 32, -8, 8, '#8a5a3a');
      p.circle(u * 32, -8, 6, null, shade('#8a5a3a', -0.3));
      for (let k = 0; k < 4; k++) {
        const a = (k / 4) * Math.PI;
        p.line([{ x: u * 32 + Math.cos(a) * 6, y: -8 + Math.sin(a) * 6 }, { x: u * 32 - Math.cos(a) * 6, y: -8 - Math.sin(a) * 6 }], shade('#8a5a3a', -0.3), 0.7);
      }
      p.circle(u * 32, -8, 1.6, GOLD);
    });
  }
}

// ---------------------------------------------------------------------------
// Halloween

/** Pumpkin carving table: half-carved glowing pumpkin, knife and scoop. */
function carvingTable(p: Pen): void {
  const c = p.center;
  p.shadow(c.x, c.y + 3, 26, 10);
  table(p, 0.06, 0.1, 0.88, 0.8, 9, '#e9a25a');
  const z = 12;
  const q = p.iso(0.5, 0.45, z);
  const r = 11;
  const cy = q.y - 0.86 * r;
  p.glow(q.x, cy, 16, '#ffb03a', 0.35);
  pumpkin(p, q.x, cy, r);
  // lid removed: a glowing hollow at the top
  p.ellipse(q.x, cy - 0.86 * r, r * 0.55, r * 0.22, radial(p, q.x, cy - 0.86 * r, r * 0.6, '#ffd27a', '#c25a12'), O);
  // carved face with light coming through
  const fx = q.x;
  const fy = cy + 1;
  p.glow(fx, fy - 1, 9, '#ffb03a', 0.45);
  p.poly(
    [
      { x: fx - 5, y: fy - 2 },
      { x: fx - 2.5, y: fy - 5.5 },
      { x: fx, y: fy - 2 },
    ],
    '#ffd34d',
    '#7a3b10',
    0.8,
  );
  p.poly(
    [
      { x: fx + 5, y: fy - 2 },
      { x: fx + 2.5, y: fy - 5.5 },
      { x: fx, y: fy - 2 },
    ],
    '#ffd34d',
    '#7a3b10',
    0.8,
  );
  p.poly(
    [
      { x: fx - 4.5, y: fy + 1.5 },
      { x: fx + 4.5, y: fy + 1.5 },
      { x: fx + 3, y: fy + 4.5 },
      { x: fx + 1.5, y: fy + 2.5 },
      { x: fx, y: fy + 4.8 },
      { x: fx - 1.5, y: fy + 2.5 },
      { x: fx - 3, y: fy + 4.5 },
    ],
    '#ffd34d',
    '#7a3b10',
    0.8,
  );
  // scoop and knife on the table
  const sc = p.iso(0.82, 0.3, z);
  p.line([{ x: sc.x - 4, y: sc.y }, { x: sc.x - 9, y: sc.y + 2 }], WOOD_DK, 1.6);
  p.ellipse(sc.x, sc.y, 3.4, 2, '#c9c9d4');
  const kn = p.iso(0.74, 0.7, z);
  p.poly([{ x: kn.x, y: kn.y }, { x: kn.x + 9, y: kn.y - 1 }, { x: kn.x + 9, y: kn.y + 1 }], '#d9dbe6');
  p.rect(kn.x - 4, kn.y - 1.5, 4, 3, WOOD_DK);
  for (const [dx, dy] of [
    [-6, 3],
    [4, 5],
    [-2, 6],
  ] as const) {
    p.ellipse(q.x + dx, q.y + dy - 4, 1.4, 0.8, '#ffe2a8', null, 0.5);
  }
}

/** Costume rack: witch hat, purple cape, bunny ears and a little pumpkin basket. */
function costumeRack(p: Pen): void {
  const { x, y } = p.center;
  p.shadow(x, y + 1, 16, 6);
  p.ellipse(x, y - 1, 13, 5, '#8a5a3a');
  post(p, x, y - 2, 46, WOOD_DK, 3.2);
  const bar = y - 48;
  thick(p, [{ x: x - 15, y: bar }, { x: x + 15, y: bar }], 2.4, WOOD_LT);
  // purple cape hanging from the bar
  const cape = '#7b4fb8';
  p.poly(
    [
      { x: x - 6, y: bar },
      { x: x + 6, y: bar },
      { x: x + 10, y: y - 13 },
      { x: x + 5, y: y - 10 },
      { x: x, y: y - 13 },
      { x: x - 5, y: y - 10 },
      { x: x - 10, y: y - 13 },
    ],
    cape,
  );
  p.poly(
    [
      { x: x - 3, y: bar + 2 },
      { x: x + 3, y: bar + 2 },
      { x: x + 4, y: y - 18 },
      { x: x - 4, y: y - 18 },
    ],
    shade(cape, 0.2),
    null,
  );
  p.circle(x, bar + 2, 1.4, GOLD);
  // witch hat sitting on the bar
  const hx = x - 11;
  p.ellipse(hx, bar - 0.5, 9, 2.6, '#2b2440');
  p.poly(
    [
      { x: hx - 6, y: bar - 1 },
      { x: hx + 6, y: bar - 1 },
      { x: hx + 1.5, y: bar - 13 },
      { x: hx - 2.5, y: bar - 19 },
    ],
    '#2b2440',
  );
  p.rect(hx - 5.6, bar - 5.5, 11.2, 2.2, GOLD, null);
  p.rect(hx - 1.2, bar - 5.6, 2.4, 2.4, '#ffe066', O);
  // bunny ears headband on the right
  const ex = x + 11;
  for (const dx of [-3, 3]) {
    p.ellipse(ex + dx, bar - 9, 2.6, 8, '#ffd0de', O, dx < 0 ? -0.15 : 0.15);
    p.ellipse(ex + dx, bar - 9, 1.2, 5.4, '#ff8fb3', null, dx < 0 ? -0.15 : 0.15);
  }
  p.curve({ x: ex - 4, y: bar - 2 }, { x: ex, y: bar + 1 }, { x: ex + 4, y: bar - 2 }, '#ff8fb3', 1.4);
  // little pumpkin basket on the ground
  pumpkin(p, x - 10, y - 5, 4.5);
  sparkle(p, x + 6, bar - 22, 2.2);
}

/** Trick-or-treat stand: a candy bowl on a post, spilling wrapped sweets, with a ghost. */
function candyBowl(p: Pen): void {
  const { x, y } = p.center;
  p.shadow(x, y + 1, 16, 6);
  post(p, x, y, 16, WOOD_DK, 4.5);
  const yr = y - 18;
  const ctx = p.ctx;
  ctx.beginPath();
  ctx.moveTo(x - 14, yr);
  ctx.quadraticCurveTo(x - 11, yr + 14, x, yr + 14);
  ctx.quadraticCurveTo(x + 11, yr + 14, x + 14, yr);
  ctx.closePath();
  fs(p, radial(p, x, yr, 14, '#ffb3cc', '#e0427a'), O, 1);
  face(p, x, yr + 6, 0.7);
  p.ellipse(x, yr, 14, 5.4, '#ffc6d9');
  p.ellipse(x, yr + 0.6, 12.2, 4.2, '#7a3d2a', null);
  ghostMini(p, x + 16, yr - 7, 1.25);
  wrappedCandy(p, x - 7, yr - 1, '#ffd23f', 0.5);
  wrappedCandy(p, x - 1, yr - 3.5, '#7bd36a', -0.3);
  wrappedCandy(p, x + 5, yr - 1.5, '#4fd1c5', 0.2);
  candyCorn(p, x - 4, yr - 6, -0.2);
  candyCorn(p, x + 2, yr - 7.5, 0.3);
}

// ---------------------------------------------------------------------------
// Festival of Lights

/** Festive sweets on lace-edged plates, with a little oil lamp glowing. */
function sweetsTable(p: Pen): void {
  const c = p.center;
  p.shadow(c.x, c.y + 3, 26, 10);
  table(p, 0.06, 0.06, 0.88, 0.88, 9, '#ffb84d');
  const z = 12;
  p.diamond(0.14, 0.14, 0.72, 0.72, null, '#ffe9a8', z);
  for (const [u, v] of [
    [0.36, 0.38],
    [0.66, 0.62],
  ] as const) {
    const b = p.iso(u, v, z);
    p.ellipse(b.x, b.y - 1, 9, 4.5, '#fff8f0', O);
    p.ellipse(b.x, b.y - 1.6, 7, 3.2, '#fde9c0', null);
    p.ball(b.x - 4, b.y - 4, 2.6, '#ffb020');
    p.ball(b.x + 2.5, b.y - 5, 2.6, '#ffc247');
    p.ball(b.x - 0.5, b.y - 2.8, 2.4, '#7a3e1d');
    p.ball(b.x + 4.6, b.y - 2, 2.2, '#f6e7c1');
    p.rect(b.x - 6.4, b.y - 3, 3.6, 2.2, '#f9e7c2', O);
    p.circle(b.x - 4.6, b.y - 2.2, 0.5, '#e8a04a', null);
  }
  // diya lamp at the front with a flame
  const d = p.iso(0.5, 0.92, z);
  p.ellipse(d.x, d.y - 1.5, 4.4, 2.2, '#e8945a');
  flame(p, d.x, d.y - 2.5, 4.6);
}

/** Paper star lantern on a post, glowing from within. */
function starLantern(p: Pen): void {
  const { x, y } = p.center;
  p.shadow(x, y + 1, 14, 6);
  post(p, x, y, 44, WOOD_DK, 3.4);
  const cy = y - 30;
  p.line([{ x, y: y - 44 }, { x, y: cy - 10 }], O, 0.7);
  p.glow(x, cy, 22, '#ffe27a', 0.55);
  // ribs
  const tips: Pt[] = [];
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + (i * TAU) / 5;
    tips.push({ x: x + Math.cos(a) * 9.6, y: cy + Math.sin(a) * 9.6 });
  }
  p.star(x, cy, 11, radial(p, x, cy, 12, '#fff6c0', '#ffb347'), O);
  for (const t of tips) p.line([{ x, y: cy }, t], shade('#ffb347', -0.3), 0.7);
  p.circle(x, cy, 2.5, '#fff8d0', null);
  face(p, x, cy + 0.5, 0.6);
  // tassel
  p.poly(
    [
      { x: x - 2, y: cy + 9 },
      { x: x + 2, y: cy + 9 },
      { x: x + 3, y: cy + 16 },
      { x: x - 3, y: cy + 16 },
    ],
    '#ff6b8a',
  );
  p.rect(x - 2.4, cy + 8, 4.8, 1.8, GOLD, null);
  sparkle(p, x - 15, cy - 6, 2.6);
  sparkle(p, x + 14, cy + 2, 2);
}

/** Shallow bowl of water with marigolds and a floating candle. */
function floatingFlowers(p: Pen): void {
  const { x, y } = p.center;
  p.shadow(x, y + 2, 15, 6.5);
  p.cylinder(x, y, 15, 5, '#ffb3c8');
  p.ellipse(x, y - 5, 13.2, 6.2, radial(p, x, y - 5, 14, '#bfeaff', mix('#4fb6e8', '#ffffff', 0.1)), null);
  p.ellipse(x + 1, y - 7, 3.2, 1.3, '#6fcf7a', O, 0.2);
  p.flower(x - 6, y - 5.5, 3.8, '#ffa42e', '#ffe066');
  p.flower(x + 6, y - 2.8, 3.2, '#ff8c1a', '#ffe066');
  // floating candle
  p.cylinder(x - 1, y - 5, 2.4, 4, '#fff6d0');
  flame(p, x - 1, y - 9, 5);
}

// ---------------------------------------------------------------------------
// Winter

/** Hot cocoa stand: a striped awning, mugs with marshmallows, and steam. */
function cocoaStand(p: Pen): void {
  const c = p.center;
  p.shadow(c.x, c.y + 2, 26, 10);
  p.box(0.06, 0.04, 0.88, 0.12, 34, '#fff1e0', 0);
  onFace(p, p.iso(0.06, 0.16, 0), () => {
    p.heart(14, -22, 4.5, PINK);
  });
  p.box(0.04, 0.3, 0.92, 0.5, 13, '#b8744a', 0);
  onFace(p, p.iso(0.04, 0.8, 0), () => {
    face(p, 15.4, -6.5, 1.1);
  });
  // striped awning sloping forward from the back panel
  for (let i = 0; i < 6; i++) {
    const u0 = 0.03 + i * 0.1533;
    const u1 = u0 + 0.1533;
    p.poly(
      [p.iso(u0, 0, 34), p.iso(u1, 0, 34), p.iso(u1, 0.95, 27), p.iso(u0, 0.95, 27)],
      i % 2 ? '#fff8f0' : '#ff6b7a',
      O,
      0.9,
    );
  }
  // mugs with marshmallow tops and happy faces
  for (const [u, v] of [
    [0.3, 0.5],
    [0.66, 0.56],
  ] as const) {
    const b = p.iso(u, v, 13);
    p.cylinder(b.x, b.y, 4.8, 8, PINK);
    p.ellipse(b.x, b.y - 8, 4.2, 2, '#6b3a22', null);
    face(p, b.x, b.y - 4.2, 0.55);
    p.ball(b.x, b.y - 11, 3.8, '#ffffff');
    steam(p, b.x - 1, b.y - 14, 10, 2);
  }
}

/** Cookie baking table: gingerbread people, iced cookies and a rolling pin. */
function cookieTable(p: Pen): void {
  const c = p.center;
  p.shadow(c.x, c.y + 3, 26, 10);
  table(p, 0.06, 0.06, 0.88, 0.88, 9, '#ffe8c8');
  const z = 12;
  // rolling pin
  thick(p, [p.iso(0.12, 0.74, z), p.iso(0.5, 0.74, z)], 3.6, '#f2dcae');
  for (const pt of [p.iso(0.12, 0.74, z), p.iso(0.5, 0.74, z)]) p.circle(pt.x, pt.y, 2.2, '#e8c58a');
  // round iced cookies
  for (const [u, v] of [
    [0.7, 0.6],
    [0.8, 0.82],
  ] as const) {
    const b = p.iso(u, v, z);
    p.ellipse(b.x, b.y, 5, 2.6, '#f2b76a', O);
    p.ellipse(b.x, b.y - 0.2, 4, 2, null, '#ffffff', 0);
    p.rect(b.x - 2, b.y - 0.4, 1.4, 0.7, '#ff6b8a', null);
    p.rect(b.x + 0.8, b.y + 0.2, 1.4, 0.7, '#7bd36a', null);
  }
  // two gingerbread people
  const g1 = p.iso(0.36, 0.42, z);
  const g2 = p.iso(0.46, 0.72, z);
  gingerbread(p, g1.x, g1.y, 1.3);
  gingerbread(p, g2.x, g2.y, 1.2);
  // flour dust
  const rand = rng('cookie-flour');
  for (let i = 0; i < 8; i++) {
    const q = p.iso(0.12 + rand() * 0.76, 0.12 + rand() * 0.76, z);
    p.circle(q.x, q.y, 0.6, '#ffffff', null);
  }
}

/** Red snow sled with gold runners, a striped scarf draped over its nose. */
function snowSled(p: Pen): void {
  const c = p.center;
  p.shadow(c.x, c.y + 2, 22, 8);
  p.ellipse(c.x, c.y + 1, 20, 7.5, '#ffffff', shade('#cfe6f5', -0.15));
  const steel = '#9aa6b5';
  for (const v of [0.3, 0.72]) {
    thick(p, [p.iso(0.1, v, 1), p.iso(0.92, v, 1)], 1.8, steel);
    thick(p, [p.iso(0.92, v, 1), p.iso(1.0, v, 4)], 1.8, steel);
    thick(p, [p.iso(0.3, v, 1), p.iso(0.3, v, 6)], 1.4, steel);
    thick(p, [p.iso(0.72, v, 1), p.iso(0.72, v, 6)], 1.4, steel);
  }
  // red sled body with a cushion on top
  p.box(0.16, 0.26, 0.7, 0.52, 7, '#ff6b7a', 5);
  p.diamond(0.22, 0.32, 0.58, 0.4, '#ff9aa6', O, 12);
  p.line([p.iso(0.5, 0.32, 12), p.iso(0.5, 0.72, 12)], '#ffffff', 1.2);
  // scarf draped over the front-left face, with a little fringe
  const sa = p.iso(0.22, 0.8, 12);
  const sc = p.iso(0.48, 0.8, -1);
  const sb = p.iso(0.74, 0.8, 12);
  thickCurve(p, sa, sc, sb, 5, '#ff5b7f');
  // knit stripes: a dashed white line down the middle of the scarf
  p.ctx.setLineDash([2.2, 2.2]);
  p.curve(sa, sc, sb, '#ffffff', 1.3);
  p.ctx.setLineDash([]);
  for (const t of [0.38, 0.52, 0.64]) {
    const a = p.iso(0.22 + t * 0.52, 0.8, 12 - 13 * (1 - Math.abs(0.5 - t) * 2));
    p.line([a, { x: a.x, y: a.y + 3.5 }], '#ff5b7f', 1.4);
  }
  sparkle(p, c.x - 15, c.y - 16, 2.6, '#ffffff');
  sparkle(p, c.x + 17, c.y - 18, 2.2, '#ffffff');
}

/** Fire pit ringed with stones, plaid blankets folded beside it, and a toasting marshmallow. */
function firePit(p: Pen): void {
  const c = p.center;
  p.shadow(c.x, c.y + 2, 24, 10);
  // plaid blankets folded on the ground
  for (const [u, v, col] of [
    [0.06, 0.52, '#ff7b8b'],
    [0.6, 0.64, '#7bb8ff'],
  ] as const) {
    p.box(u, v, 0.34, 0.3, 4, col);
    const z = 4;
    for (const k of [1, 2]) {
      p.line([p.iso(u + (0.34 * k) / 3, v, z), p.iso(u + (0.34 * k) / 3, v + 0.3, z)], rgba('#ffffff', 0.5), 1);
      p.line([p.iso(u, v + (0.3 * k) / 3, z), p.iso(u + 0.34, v + (0.3 * k) / 3, z)], rgba('#ffffff', 0.5), 1);
    }
  }
  p.glow(c.x, c.y - 6, 26, '#ffb03a', 0.4);
  const stones: { x: number; y: number }[] = [];
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * TAU;
    stones.push({ x: c.x + Math.cos(a) * 13, y: c.y + Math.sin(a) * 6.5 });
  }
  stones.sort((a, b) => a.y - b.y);
  const back = stones.filter((s) => s.y < c.y);
  const front = stones.filter((s) => s.y >= c.y);
  for (const s of back) p.ball(s.x, s.y, 3.4, '#a3a7b5');
  thick(p, [{ x: c.x - 8, y: c.y - 1 }, { x: c.x + 8, y: c.y + 2 }], 4, '#8a5a3a');
  thick(p, [{ x: c.x + 7, y: c.y - 2 }, { x: c.x - 6, y: c.y + 3 }], 4, '#9a6a44');
  p.circle(c.x + 8, c.y + 2, 1.6, '#e8c08a');
  p.circle(c.x - 8, c.y - 1, 1.6, '#e8c08a');
  flame(p, c.x - 2, c.y, 9);
  flame(p, c.x + 3, c.y + 1, 6, false);
  for (const s of front) p.ball(s.x, s.y, 3.4, '#b9bdca');
  // a marshmallow on a toasting stick
  thick(p, [{ x: c.x + 12, y: c.y + 4 }, { x: c.x + 20, y: c.y - 12 }], 1.2, '#c79a5a');
  p.ball(c.x + 20, c.y - 13, 2.8, '#fff3f7');
}

/** Reindeer topiary: a green hedge reindeer with antlers, a face and a red bow. */
function reindeerTopiary(p: Pen): void {
  const { x, y } = p.center;
  p.shadow(x, y + 1, 14, 6);
  p.cylinder(x, y, 9.5, 10, '#d9774a');
  p.ellipse(x, y - 10, 8.6, 3.8, '#5a3a2a', null);
  const g = '#5fb85a';
  p.foliage(x, y - 22, 11, g, 'deer-body', 7);
  p.foliage(x, y - 38, 10, g, 'deer-head', 7);
  // ears
  for (const s of [-1, 1]) {
    p.ellipse(x + s * 9.5, y - 41, 4, 2.2, g, O, s * 0.5);
    p.ellipse(x + s * 9.5, y - 41, 2, 1, '#ffb3c8', null, s * 0.5);
  }
  // antlers
  for (const s of [-1, 1]) {
    thickCurve(p, { x: x + s * 4, y: y - 46 }, { x: x + s * 8, y: y - 52 }, { x: x + s * 11, y: y - 58 }, 1.8, WOOD_DK);
    thick(p, [{ x: x + s * 7, y: y - 52 }, { x: x + s * 12, y: y - 50 }], 1.2, WOOD_DK);
  }
  face(p, x, y - 40, 0.85);
  p.circle(x, y - 35.5, 1.8, RED);
  bow(p, x + 4, y - 27, RED, 1.1);
  // fairy lights
  for (const [dx, dy] of [
    [-6, -30],
    [5, -24],
    [-8, -20],
    [7, -35],
  ] as const) {
    p.glow(x + dx, y + dy, 4, '#ffe066', 0.6);
    p.circle(x + dx, y + dy, 0.9, '#fff7b0', null);
  }
  sparkle(p, x + 14, y - 52, 2.2);
}

// ---------------------------------------------------------------------------
// New Year

/** Party snack table: cupcakes with cherries, popcorn, and a party hat. */
function partySnacks(p: Pen): void {
  const c = p.center;
  p.shadow(c.x, c.y + 3, 22, 9);
  table(p, 0.06, 0.08, 0.88, 0.84, 9, '#ffffff');
  const z = 12;
  // pastel stripes across the cloth
  for (let k = 0; k < 4; k++) {
    const u0 = 0.06 + k * 0.22;
    p.diamond(u0, 0.08, 0.11, 0.84, rgba(PINK, 0.25), null, z);
  }
  for (const [u, v] of [
    [0.32, 0.4],
    [0.7, 0.4],
    [0.5, 0.72],
  ] as const) {
    const b = p.iso(u, v, z);
    p.cylinder(b.x, b.y, 4.6, 5.5, '#ff8fb3');
    for (const dx of [-2, 0, 2]) p.line([{ x: b.x + dx, y: b.y - 5.2 }, { x: b.x + dx * 0.8, y: b.y - 0.6 }], '#ffd6e5', 0.6);
    p.ball(b.x, b.y - 8, 4.8, '#fff6fa');
    p.ball(b.x, b.y - 12.6, 1.8, '#e5344f');
  }
  // popcorn bowl
  const pb = p.iso(0.3, 0.72, z);
  p.cylinder(pb.x, pb.y, 4.6, 3, '#4fd1c5');
  for (const [dx, dy, col] of [
    [-3, -4, '#fff1b8'],
    [0, -5.5, '#fff7d6'],
    [3, -4, '#ffe38a'],
    [-1.5, -7, '#fff7d6'],
    [2, -7.4, '#fff1b8'],
  ] as const) {
    p.ball(pb.x + dx, pb.y + dy, 1.9, col);
  }
  // party hat
  const ph = p.iso(0.78, 0.2, z);
  p.poly(
    [
      { x: ph.x - 4, y: ph.y },
      { x: ph.x + 4, y: ph.y },
      { x: ph.x, y: ph.y - 11 },
    ],
    '#ffd23f',
  );
  p.line([{ x: ph.x - 2.4, y: ph.y - 4 }, { x: ph.x + 2.4, y: ph.y - 5 }], '#ff7fbf', 1.2);
  p.circle(ph.x, ph.y - 11.5, 1.5, '#ff7fbf');
  sparkle(p, c.x + 13, c.y - 22, 2.2);
}

/** Sparkler bucket: sparklers burst into sparks and glow. */
function sparklerBucket(p: Pen): void {
  const { x, y } = p.center;
  p.shadow(x, y + 1, 12, 5);
  p.cylinder(x, y, 9, 12, '#ffe07a');
  for (const dy of [3.5, 7.5]) p.curve({ x: x - 9, y: y - dy }, { x, y: y - dy + 4 }, { x: x + 9, y: y - dy }, '#e8a53a', 1);
  p.ellipse(x, y - 12, 9, 4.5, '#8a5a3a');
  face(p, x, y - 6, 0.6);
  const rand = rng('sparkler');
  const tips: { x: number; y: number }[] = [];
  for (let i = 0; i < 5; i++) {
    const bx = x - 5 + i * 2.5;
    const tx = bx + (i - 2) * 2.2;
    const ty = y - 42 - rand() * 8;
    p.line([{ x: bx, y: y - 11 }, { x: tx, y: ty }], '#5a4a3a', 1);
    tips.push({ x: tx, y: ty });
  }
  for (const t of tips) {
    p.glow(t.x, t.y, 8, '#ffe066', 0.6);
    sparkle(p, t.x, t.y, 2.8);
    for (let k = 0; k < 4; k++) {
      const a = rand() * TAU;
      const d = 3 + rand() * 4;
      p.circle(t.x + Math.cos(a) * d, t.y + Math.sin(a) * d, 0.7, '#fff6c0', null);
    }
  }
}

/** Wish board on two legs: paper notes, pins, and a little star on top. */
function wishBoard(p: Pen): void {
  const { x, y } = p.center;
  p.shadow(x, y + 1, 14, 6);
  thick(p, [{ x: x - 7, y }, { x: x - 6, y: y - 18 }], 2, WOOD_DK);
  thick(p, [{ x: x + 7, y }, { x: x + 6, y: y - 18 }], 2, WOOD_DK);
  const bx = x - 16;
  const by = y - 44;
  const bw = 32;
  const bh = 26;
  p.roundRect(bx - 1.5, by - 1.5, bw + 3, bh + 3, 4, WOOD);
  p.roundRect(bx, by, bw, bh, 3, '#f4d9a6', null);
  const notes: [number, number, number, number, string, number, string][] = [
    [bx + 6, by + 6, 9, 8, '#ffd6e7', -0.12, 'heart'],
    [bx + 18, by + 5, 9, 8, '#c8f2ff', 0.1, 'star'],
    [bx + 9, by + 16, 8, 7, '#fff3a0', 0.08, 'lines'],
    [bx + 21, by + 16, 8, 7, '#d8ffc8', -0.1, 'heart'],
  ];
  for (const [nx, ny, w, h, col, rot, icon] of notes) {
    withXform(p, nx, ny, rot, () => {
      p.rect(-w / 2, -h / 2, w, h, col);
      p.circle(0, -h / 2 + 0.5, 1, RED, null);
      if (icon === 'heart') p.heart(0, 0.8, 1.7, '#ff7fa8', null);
      if (icon === 'star') p.star(0, 0.4, 2.2, '#ffd23f', null);
      if (icon === 'lines') {
        p.line([{ x: -2.5, y: -0.6 }, { x: 2.5, y: -0.6 }], '#8a7a4a', 0.6);
        p.line([{ x: -2.5, y: 1.2 }, { x: 1.5, y: 1.2 }], '#8a7a4a', 0.6);
      }
    });
  }
  // star topper
  p.star(x, by - 5, 3.4, GOLD);
  sparkle(p, x + 9, by - 6, 1.8);
}

// ---------------------------------------------------------------------------
// Table

const ART: Record<string, { height: number; paint: Painter }> = {
  dumpling_table: { height: 40, paint: dumplingTable },
  lion_dance_drum: { height: 30, paint: lionDrum },
  tangerine_tree: { height: 48, paint: tangerineTree },
  fondue_table: { height: 40, paint: fondueTable },
  love_mailbox: { height: 52, paint: loveMailbox },
  picnic_for_two: { height: 26, paint: picnicForTwo },
  shamrock_tea: { height: 40, paint: shamrockTea },
  hat_planter: { height: 30, paint: hatPlanter },
  clover_bench: { height: 28, paint: cloverBench },
  egg_painting: { height: 36, paint: eggPainting },
  bunny_burrow: { height: 36, paint: bunnyBurrow },
  kite_post: { height: 84, paint: kitePost },
  blossom_picnic: { height: 26, paint: blossomPicnic },
  ice_cream_cart: { height: 66, paint: iceCreamCart },
  beach_chairs: { height: 36, paint: beachChairs },
  watermelon_picnic: { height: 28, paint: watermelonPicnic },
  sprinkler: { height: 36, paint: sprinkler },
  apple_bobbing: { height: 32, paint: appleBobbing },
  pie_rack: { height: 36, paint: pieRack },
  hayride_wagon: { height: 36, paint: hayrideWagon },
  carving_table: { height: 36, paint: carvingTable },
  costume_rack: { height: 60, paint: costumeRack },
  candy_bowl: { height: 32, paint: candyBowl },
  sweets_table: { height: 30, paint: sweetsTable },
  star_lantern: { height: 40, paint: starLantern },
  floating_flowers: { height: 28, paint: floatingFlowers },
  cocoa_stand: { height: 42, paint: cocoaStand },
  cookie_table: { height: 34, paint: cookieTable },
  snow_sled: { height: 30, paint: snowSled },
  fire_pit: { height: 30, paint: firePit },
  reindeer_topiary: { height: 56, paint: reindeerTopiary },
  party_snacks: { height: 34, paint: partySnacks },
  sparkler_bucket: { height: 48, paint: sparklerBucket },
  wish_board: { height: 40, paint: wishBoard },
};

/** Anything added to the event list without bespoke art still gets a present. */
function fallback(p: Pen): void {
  const c = p.center;
  p.shadow(c.x, c.y + 1, 14, 6);
  p.box(0.3, 0.3, 0.4, 0.4, 12, '#a678f0');
  const t = p.iso(0.5, 0.5, 12);
  p.ellipse(t.x - 3, t.y - 3, 2.6, 1.6, GOLD);
  p.ellipse(t.x + 3, t.y - 3, 2.6, 1.6, GOLD);
  p.circle(t.x, t.y - 3, 1.3, GOLD);
}

export const sprites: SpriteSpec[] = LIFESTYLE_DECORATIONS.map((d) => {
  const art = ART[d.id] ?? { height: 28, paint: fallback };
  return { key: `deco:${d.id}`, fw: d.w, fh: d.h, height: art.height, paint: art.paint };
});

export const icons: IconSpec[] = [];
