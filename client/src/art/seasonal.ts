// Seasonal event decorations: holiday items that are only sold while their
// event runs (Animal Crossing style). Every decoration with an `event` gets a
// painter here; the footprint always comes from the content definition.
import { type IconSpec, type SpriteSpec, type Pen, type Pt, OUTLINE, shade, rng, mix, boxColors, rgba } from './kit';
import { DECORATION_LIST } from '@farm/shared';

const O = OUTLINE;
const TAU = Math.PI * 2;
const WOOD = '#b07a4a';
const GOLD = '#f4c24a';
const LEAF = '#5fae4a';
const SNOW = '#f7fbff';
const FLAME = '#ff9a2e';

type Fill = string | CanvasGradient | null;
type Painter = (p: Pen) => void;

// ---------------------------------------------------------------------------
// Low-level helpers

/** Fill and/or stroke whatever path is currently on the context. */
function fs(p: Pen, fill: Fill, stroke: string | null = O, w = 1): void {
  const c = p.ctx;
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

/** An outlined thick stroke (branches, poles, ribbons). */
function thick(p: Pen, pts: Pt[], w: number, color: string): void {
  p.line(pts, O, w + 2);
  p.line(pts, color, w);
}

function thickCurve(p: Pen, a: Pt, c: Pt, b: Pt, w: number, color: string): void {
  p.curve(a, c, b, O, w + 2);
  p.curve(a, c, b, color, w);
}

/** Point on a quadratic curve. */
function qpt(a: Pt, c: Pt, b: Pt, t: number): Pt {
  const s = 1 - t;
  return { x: s * s * a.x + 2 * s * t * c.x + t * t * b.x, y: s * s * a.y + 2 * s * t * c.y + t * t * b.y };
}

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

/**
 * Draw on a vertical face. Inside fn, x runs along the face (screen-rightwards)
 * and y = -z. slope 0.5 for faces along the u axis, -0.5 for faces along v.
 */
function onFace(p: Pen, o: Pt, slope: number, fn: () => void): void {
  const c = p.ctx;
  c.save();
  c.translate(o.x, o.y);
  c.transform(1, slope, 0, 1, 0, 0);
  fn();
  c.restore();
}

function withXform(p: Pen, x: number, y: number, rot: number, fn: () => void, sx = 1, sy = 1): void {
  const c = p.ctx;
  c.save();
  c.translate(x, y);
  c.rotate(rot);
  c.scale(sx, sy);
  fn();
  c.restore();
}

// ---------------------------------------------------------------------------
// Reusable pieces

function post(p: Pen, x: number, y: number, ht: number, color = WOOD, w = 4): void {
  p.ellipse(x, y, w * 0.95, w * 0.42, shade(color, -0.25));
  p.rect(x - w / 2, y - ht, w, ht, hgrad(p, x - w / 2, x + w / 2, shade(color, 0.18), shade(color, -0.22)));
  p.ellipse(x, y - ht, w / 2, w / 4, shade(color, 0.3));
}

/** Teardrop flame whose base sits at (x, y). */
function flame(p: Pen, x: number, y: number, s: number, glow = true): void {
  if (glow) p.glow(x, y - s, s * 4.5, '#ffb03a', 0.5);
  const drop = (sc: number, yy: number, fill: string, stroke: string | null) => {
    const c = p.ctx;
    const r = sc * 0.8;
    c.beginPath();
    c.moveTo(x, yy - sc * 2.5);
    c.quadraticCurveTo(x + sc * 0.95, yy - sc * 1.5, x + r * Math.cos(-0.2), yy - r + r * Math.sin(-0.2));
    c.arc(x, yy - r, r, -0.2, Math.PI + 0.2, false);
    c.quadraticCurveTo(x - sc * 0.95, yy - sc * 1.5, x, yy - sc * 2.5);
    c.closePath();
    fs(p, fill, stroke, 0.8);
  };
  drop(s, y, FLAME, shade(FLAME, -0.3));
  drop(s * 0.55, y - s * 0.15, '#fff3a6', null);
}

function leaf(p: Pen, x: number, y: number, len: number, ang: number, color: string, stroke: string | null = O): void {
  withXform(p, x, y, ang, () => {
    const c = p.ctx;
    c.beginPath();
    c.moveTo(0, 0);
    c.quadraticCurveTo(len * 0.5, -len * 0.42, len, 0);
    c.quadraticCurveTo(len * 0.5, len * 0.42, 0, 0);
    c.closePath();
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

function chineseLantern(p: Pen, x: number, top: number, r: number, color = '#e3342f'): void {
  const cy = top + 2 + r * 0.85;
  p.glow(x, cy, r * 2.8, '#ffb347', 0.5);
  p.line([{ x, y: top }, { x, y: cy - r * 0.8 }], O);
  p.ellipse(x, cy, r, r * 0.85, radial(p, x, cy, r * 1.15, shade(color, 0.5), shade(color, -0.12)));
  const rib = shade(color, -0.32);
  for (const k of [-0.6, 0, 0.6]) {
    p.curve({ x: x + k * r * 0.35, y: cy - r * 0.8 }, { x: x + k * r * 1.45, y: cy }, { x: x + k * r * 0.35, y: cy + r * 0.8 }, rib, 0.8);
  }
  p.ellipse(x - r * 0.45, cy - r * 0.25, r * 0.15, r * 0.3, rgba('#ffffff', 0.55), null);
  p.rect(x - r * 0.45, cy - r * 0.85 - 1.4, r * 0.9, 2.2, GOLD);
  p.rect(x - r * 0.4, cy + r * 0.72, r * 0.8, 2.2, GOLD);
  const ty = cy + r * 0.72 + 2.2;
  p.poly(
    [
      { x: x - 1.3, y: ty },
      { x: x + 1.3, y: ty },
      { x: x + 2, y: ty + r * 0.8 + 1.5 },
      { x: x - 2, y: ty + r * 0.8 + 1.5 },
    ],
    '#ffcf3f',
  );
}

/** Round accordion paper lantern (New Year). */
function globeLantern(p: Pen, x: number, top: number, r: number, color: string): void {
  const cy = top + r + 1.5;
  p.glow(x, cy, r * 2.6, mix(color, '#fff3b0', 0.5), 0.5);
  p.line([{ x, y: top }, { x, y: cy - r }], O);
  p.circle(x, cy, r, radial(p, x, cy, r * 1.2, shade(color, 0.55), shade(color, -0.05)));
  for (const k of [-0.5, 0, 0.5]) {
    const yy = cy + k * r;
    const hw = Math.sqrt(1 - k * k) * r;
    p.curve({ x: x - hw, y: yy }, { x, y: yy + r * 0.25 }, { x: x + hw, y: yy }, shade(color, -0.25), 0.8);
  }
  p.rect(x - r * 0.35, cy - r - 1, r * 0.7, 1.8, '#3d3550');
  p.rect(x - r * 0.35, cy + r - 0.8, r * 0.7, 1.8, '#3d3550');
  p.ellipse(x - r * 0.4, cy - r * 0.35, r * 0.18, r * 0.3, rgba('#ffffff', 0.6), null);
}

function rose(p: Pen, x: number, y: number, r: number, color = '#e5344f'): void {
  p.ball(x, y, r, color);
  const d = shade(color, -0.35);
  p.curve({ x: x - r * 0.5, y: y - r * 0.1 }, { x, y: y - r * 0.8 }, { x: x + r * 0.5, y: y - r * 0.1 }, d, 0.8);
  p.curve({ x: x - r * 0.25, y }, { x, y: y + r * 0.45 }, { x: x + r * 0.3, y: y - r * 0.15 }, d, 0.8);
}

function egg(p: Pen, x: number, y: number, r: number, color: string, pat: number): void {
  const rx = r * 0.78;
  const c = p.ctx;
  p.ellipse(x, y, rx, r, radial(p, x, y, r * 1.2, shade(color, 0.35), color));
  c.save();
  c.beginPath();
  c.ellipse(x, y, rx, r, 0, 0, TAU);
  c.clip();
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
  c.restore();
  p.ellipse(x, y, rx, r, null);
  p.ellipse(x - rx * 0.38, y - r * 0.42, rx * 0.22, r * 0.22, rgba('#ffffff', 0.65), null);
}

/** Present: an iso box with ribbon cross and bow, base centred on (x, y). */
function gift(p: Pen, x: number, y: number, du: number, dv: number, ht: number, color: string, ribbon: string, z = 0): void {
  const { u, v } = toUV(p, x, y);
  const u0 = u - du / 2;
  const v0 = v - dv / 2;
  p.box(u0, v0, du, dv, ht, boxColors(color), z);
  const zt = z + ht;
  const rw = Math.max(1.4, Math.min(2.2, ht * 0.14));
  p.line([p.iso(u, v0 + dv, z), p.iso(u, v0 + dv, zt), p.iso(u, v0, zt)], ribbon, rw);
  p.line([p.iso(u0 + du, v, z), p.iso(u0 + du, v, zt), p.iso(u0, v, zt)], ribbon, rw);
  const b = p.iso(u, v, zt);
  const s = Math.max(2, Math.min(3.4, (du + dv) * 4.5));
  p.ellipse(b.x - s * 0.7, b.y - s * 0.45, s * 0.75, s * 0.48, ribbon, O, -0.4);
  p.ellipse(b.x + s * 0.7, b.y - s * 0.45, s * 0.75, s * 0.48, ribbon, O, 0.4);
  p.circle(b.x, b.y - s * 0.3, s * 0.35, shade(ribbon, -0.12));
}

/** Screen-parallel arch: two posts and a bowed band. Returns the band's curve. */
function arch(p: Pen, x: number, y: number, half: number, postHt: number, rise: number, postColor: string, bandW: number, bandColor: string): [Pt, Pt, Pt] {
  p.shadow(x - half, y + 1, 8, 4);
  p.shadow(x + half, y + 1, 8, 4);
  p.shadow(x, y + 1, half, half * 0.3, 0.1);
  post(p, x - half, y, postHt, postColor, 4);
  post(p, x + half, y, postHt, postColor, 4);
  const a = { x: x - half, y: y - postHt };
  const b = { x: x + half, y: y - postHt };
  const c = { x, y: y - postHt - rise * 2 };
  if (bandW > 0) thickCurve(p, a, c, b, bandW, bandColor);
  return [a, c, b];
}

function cloud(p: Pen, x: number, y: number, s: number): void {
  const puffs: [number, number, number][] = [
    [-0.75, 0.1, 0.5],
    [-0.3, -0.25, 0.62],
    [0.3, -0.2, 0.58],
    [0.78, 0.12, 0.45],
    [0, 0.2, 0.6],
  ];
  for (const [dx, dy, r] of puffs) p.circle(x + dx * s, y + dy * s, r * s + 1, O, null);
  for (const [dx, dy, r] of puffs) p.circle(x + dx * s, y + dy * s, r * s, '#e8eef8', null);
  for (const [dx, dy, r] of puffs) p.circle(x + dx * s - r * s * 0.12, y + dy * s - r * s * 0.15, r * s * 0.82, '#ffffff', null);
}

function bat(p: Pen, x: number, y: number, s: number): void {
  const c = p.ctx;
  const body = '#3b2f4a';
  for (const dir of [-1, 1]) {
    c.beginPath();
    c.moveTo(x, y - s * 0.3);
    c.quadraticCurveTo(x + dir * s * 1.2, y - s * 1.3, x + dir * s * 2.2, y - s * 0.4);
    c.quadraticCurveTo(x + dir * s * 1.8, y + s * 0.1, x + dir * s * 1.5, y + s * 0.2);
    c.quadraticCurveTo(x + dir * s * 1.2, y - s * 0.1, x + dir * s * 0.9, y + s * 0.35);
    c.quadraticCurveTo(x + dir * s * 0.5, y, x, y + s * 0.3);
    c.closePath();
    fs(p, body);
  }
  p.poly(
    [
      { x: x - s * 0.55, y: y - s * 0.4 },
      { x: x - s * 0.45, y: y - s * 1.05 },
      { x: x - s * 0.1, y: y - s * 0.6 },
      { x: x + s * 0.1, y: y - s * 0.6 },
      { x: x + s * 0.45, y: y - s * 1.05 },
      { x: x + s * 0.55, y: y - s * 0.4 },
    ],
    body,
  );
  p.circle(x, y, s * 0.6, body);
  p.circle(x - s * 0.22, y - s * 0.1, s * 0.16, '#fff6d8', null);
  p.circle(x + s * 0.22, y - s * 0.1, s * 0.16, '#fff6d8', null);
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

// ---------------------------------------------------------------------------
// Lunar New Year

function redLanternPost(p: Pen): void {
  const { x, y } = p.center;
  p.shadow(x, y + 1, 18, 8);
  boxAt(p, x, y, 0.3, 0.3, 5, '#b9aea0');
  const lac = '#b8302c';
  post(p, x, y - 4, 52, lac, 4);
  const by = y - 52;
  p.roundRect(x - 20, by - 2, 40, 4, 2, hgrad(p, x - 20, x + 20, shade(lac, 0.15), shade(lac, -0.2)));
  p.circle(x - 20, by - 1, 2.2, GOLD);
  p.circle(x + 20, by - 1, 2.2, GOLD);
  p.circle(x, y - 58, 2.8, GOLD);
  p.rect(x - 2.5, by - 0.5, 5, 2, GOLD);
  chineseLantern(p, x - 14, by + 2, 7);
  chineseLantern(p, x + 14, by + 2, 7);
  // tiny gold fu-diamond on the post
  const dy = y - 26;
  p.poly(
    [
      { x, y: dy - 5 },
      { x: x + 4, y: dy },
      { x, y: dy + 5 },
      { x: x - 4, y: dy },
    ],
    '#e8443c',
  );
  p.circle(x, dy, 1.4, GOLD, null);
}

function dragonStatue(p: Pen): void {
  const { x, y } = p.center;
  p.shadow(x, y + 1, 22, 10);
  boxAt(p, x, y, 0.62, 0.62, 7, '#cbbfad');
  const b = y - 7;
  const red = '#e5443a';
  // tail
  thickCurve(p, { x: x - 6, y: b - 5 }, { x: x - 22, y: b - 4 }, { x: x - 18, y: b - 19 }, 4, red);
  p.star(x - 18, b - 21, 3.6, GOLD);
  // back spikes
  for (const [sx, sy] of [
    [-10, -9],
    [-10, -15],
    [-7, -20],
  ]) {
    p.poly(
      [
        { x: x + sx + 2, y: b + sy - 2 },
        { x: x + sx - 3.5, y: b + sy },
        { x: x + sx + 2, y: b + sy + 2.5 },
      ],
      GOLD,
    );
  }
  // body
  p.ellipse(x, b - 10, 10, 10, radial(p, x, b - 10, 12, shade(red, 0.3), shade(red, -0.12)));
  p.ellipse(x + 3, b - 8, 5.5, 7, '#ffe2a8');
  for (const yy of [-11, -8, -5]) p.line([{ x: x - 1.5, y: b + yy }, { x: x + 7.5, y: b + yy }], shade('#ffe2a8', -0.25), 0.8);
  // feet + arm
  p.ellipse(x - 5, b - 1.2, 3.6, 2.2, shade(red, -0.05));
  p.ellipse(x + 6, b - 0.8, 3.6, 2.2, shade(red, -0.05));
  p.ellipse(x + 7, b - 13, 2.6, 2, red, O, -0.5);
  // mane
  for (const [mx, my] of [
    [-6, -21],
    [-7, -26],
    [-4, -31],
    [1, -33],
  ]) {
    p.circle(x + mx, b + my, 3, GOLD);
  }
  // horns
  thickCurve(p, { x: x - 1, y: b - 31 }, { x: x - 3, y: b - 35 }, { x: x - 5, y: b - 37 }, 1.6, GOLD);
  thickCurve(p, { x: x + 4, y: b - 32 }, { x: x + 5, y: b - 36 }, { x: x + 4, y: b - 39 }, 1.6, GOLD);
  // head
  p.ball(x + 2, b - 24, 8.5, red);
  p.ellipse(x + 9.5, b - 21, 5, 3.8, '#f47a63');
  p.circle(x + 11.5, b - 22.3, 0.6, O, null);
  p.circle(x + 13, b - 21.8, 0.6, O, null);
  p.curve({ x: x + 7, y: b - 19 }, { x: x + 10, y: b - 17.4 }, { x: x + 13, y: b - 19.4 }, O, 0.9);
  // eyes + blush
  for (const ex of [-1.8, 4.2]) {
    p.ellipse(x + ex, b - 26.5, 2.1, 2.7, '#ffffff');
    p.circle(x + ex + 0.4, b - 26, 1.3, '#2b1d18', null);
    p.circle(x + ex - 0.1, b - 26.9, 0.5, '#ffffff', null);
  }
  p.ellipse(x + 6.5, b - 22.5, 1.9, 1.1, rgba('#ff9db0', 0.85), null);
  p.ellipse(x - 3.5, b - 22.5, 1.6, 1, rgba('#ff9db0', 0.85), null);
  // whiskers
  p.curve({ x: x + 13.5, y: b - 23 }, { x: x + 17, y: b - 27 }, { x: x + 20, y: b - 25 }, GOLD, 1.2);
  p.curve({ x: x + 13.5, y: b - 20.5 }, { x: x + 17, y: b - 18 }, { x: x + 20, y: b - 20.5 }, GOLD, 1.2);
}

function plumBlossom(p: Pen): void {
  const { x, y } = p.center;
  p.shadow(x, y + 1, 22, 9);
  const bark = '#5a3a2e';
  type Seg = [number, number][];
  const trunk: Seg = [
    [0, 0],
    [-2, -14],
    [1, -26],
  ];
  const branches: Seg[] = [
    [
      [1, -26],
      [-8, -36],
      [-18, -44],
    ],
    [
      [1, -26],
      [8, -38],
      [17, -46],
    ],
    [
      [1, -26],
      [0, -42],
      [-3, -58],
    ],
  ];
  const twigs: Seg[] = [
    [
      [-8, -36],
      [-15, -35],
      [-23, -38],
    ],
    [
      [-18, -44],
      [-21, -53],
    ],
    [
      [8, -38],
      [18, -36],
      [23, -40],
    ],
    [
      [17, -46],
      [14, -56],
    ],
    [
      [0, -42],
      [8, -52],
      [10, -62],
    ],
    [
      [-3, -58],
      [-9, -66],
    ],
    [
      [-3, -58],
      [2, -68],
    ],
  ];
  const abs = (s: Seg) => s.map(([dx, dy]) => ({ x: x + dx, y: y + dy }));
  thick(p, [{ x: x - 5, y: y + 1 }, { x, y: y - 3 }, { x: x + 5, y: y + 1 }], 2, bark);
  thick(p, abs(trunk), 5, bark);
  for (const s of branches) thick(p, abs(s), 3, bark);
  for (const s of twigs) thick(p, abs(s), 1.4, bark);
  p.line(abs(trunk).map((q) => ({ x: q.x - 1.2, y: q.y })), shade(bark, 0.25), 1);
  // blossoms scattered along the branches
  const rand = rng('plum');
  const all = [...branches, ...twigs];
  const blooms: { x: number; y: number; c: string }[] = [];
  for (const seg of all) {
    const s = abs(seg);
    for (let k = 0; k < s.length - 1; k++) {
      const a = s[k];
      const b = s[k + 1];
      for (let j = 0; j < 3; j++) {
        const t = (j + 0.5 + (rand() - 0.5) * 0.6) / 3;
        blooms.push({
          x: a.x + (b.x - a.x) * t + (rand() - 0.5) * 6,
          y: a.y + (b.y - a.y) * t + (rand() - 0.5) * 5,
          c: rand() < 0.6 ? '#ff9fbe' : rand() < 0.5 ? '#ffe3ec' : '#f26b96',
        });
      }
    }
  }
  blooms.sort((a, b) => a.y - b.y);
  for (const f of blooms) p.flower(f.x, f.y, 2.7, f.c, '#ffd84a');
}

function cracker(p: Pen, x: number, y: number, ang: number): void {
  withXform(p, x, y, ang, () => {
    p.line(
      [
        { x: 0, y: -4 },
        { x: 0, y: -5.5 },
      ],
      O,
      0.8,
    );
    p.roundRect(-2.2, -4, 4.4, 8, 1.4, hgrad(p, -2.2, 2.2, '#ff6a55', '#c4241f'));
    p.rect(-2.2, -0.7, 4.4, 1.4, GOLD, null);
  });
}

function firecrackerString(p: Pen): void {
  const { x, y } = p.center;
  p.shadow(x, y + 1, 16, 7);
  const lac = '#b8302c';
  const px = x + 7;
  boxAt(p, px, y + 1, 0.22, 0.22, 4, '#b9aea0');
  post(p, px, y - 3, 52, lac, 4);
  thickCurve(p, { x: px, y: y - 54 }, { x: px - 1, y: y - 63 }, { x: x - 6, y: y - 60 }, 2.4, lac);
  p.circle(px, y - 56, 2.4, GOLD);
  const sx = x - 6;
  p.line([{ x: sx, y: y - 60 }, { x: sx, y: y - 15 }], '#c79a2e', 1.2);
  // chinese knot
  p.poly(
    [
      { x: sx, y: y - 61 },
      { x: sx + 4, y: y - 57 },
      { x: sx, y: y - 53 },
      { x: sx - 4, y: y - 57 },
    ],
    '#e8443c',
  );
  p.circle(sx, y - 57, 1.3, GOLD, null);
  for (let i = 0; i < 7; i++) {
    const cy = y - 47 + i * 4.8;
    cracker(p, sx - 3, cy, -0.6);
    cracker(p, sx + 3, cy + 2.4, 0.6);
  }
  // tassel
  p.poly(
    [
      { x: sx - 1.4, y: y - 14 },
      { x: sx + 1.4, y: y - 14 },
      { x: sx + 2.6, y: y - 7 },
      { x: sx - 2.6, y: y - 7 },
    ],
    GOLD,
  );
  // paper bits on the ground
  const rand = rng('confetti-red');
  for (let i = 0; i < 6; i++) {
    p.rect(x - 16 + rand() * 30, y + 2 + rand() * 6, 2, 1.4, i % 2 ? '#e8443c' : GOLD, null);
  }
}

// ---------------------------------------------------------------------------
// Valentine's

function heartArch(p: Pen): void {
  const { x, y } = p.center;
  const [a, c, b] = arch(p, x, y, 23, 34, 17, '#fbe9ee', 4, '#ffb3cb');
  // rose garland along the band
  for (let i = 0; i <= 10; i++) {
    const q = qpt(a, c, b, i / 10);
    if (i % 2 === 0) leaf(p, q.x, q.y, 5, i < 5 ? -2.4 : -0.7, LEAF);
  }
  for (let i = 0; i <= 10; i++) {
    if (i === 5) continue;
    const q = qpt(a, c, b, i / 10);
    rose(p, q.x, q.y, 2.8, i % 3 === 1 ? '#ff7aa2' : '#e5344f');
  }
  // vines on posts
  for (const sx of [-23, 23]) {
    for (let k = 0; k < 4; k++) {
      leaf(p, x + sx + (k % 2 ? 1 : -1), y - 8 - k * 7, 4, k % 2 ? -0.4 : -2.7, LEAF);
    }
    rose(p, x + sx, y - 16, 2.3, '#ff7aa2');
  }
  // big heart crest
  const top = qpt(a, c, b, 0.5);
  p.heart(x, top.y - 2, 8.5, radial(p, x, top.y - 4, 10, '#ff7a90', '#e02c4f'));
  p.ellipse(x - 3.5, top.y - 5.5, 1.6, 1, rgba('#ffffff', 0.7), null, -0.5);
  // little hanging hearts
  for (const t of [0.27, 0.73]) {
    const q = qpt(a, c, b, t);
    p.line([q, { x: q.x, y: q.y + 8 }], '#e5344f', 0.8);
    p.heart(q.x, q.y + 10, 2.6, '#ff5b7f');
  }
}

function heartTopiary(p: Pen): void {
  const { x, y } = p.center;
  p.shadow(x, y + 1, 14, 6);
  // pot
  const terra = '#d9774a';
  p.poly(
    [
      { x: x - 9, y: y - 11 },
      { x: x + 9, y: y - 11 },
      { x: x + 6.5, y },
      { x: x - 6.5, y },
    ],
    hgrad(p, x - 9, x + 9, shade(terra, 0.15), shade(terra, -0.2)),
  );
  p.roundRect(x - 10.5, y - 14, 21, 4, 1.5, shade(terra, 0.12));
  p.heart(x, y - 6, 2.2, '#ffd6e0', null);
  // trunk + bow
  p.rect(x - 1.3, y - 24, 2.6, 10, '#8a5a3a');
  // heart hedge
  const hx = x;
  const hy = y - 35;
  const s = 15;
  const c = p.ctx;
  p.heart(hx, hy, s, radial(p, hx, hy, s * 1.3, '#79c862', '#3f8f3c'));
  c.save();
  p.heart(hx, hy, s, null, null);
  c.clip();
  const rand = rng('topiary');
  for (let i = 0; i < 40; i++) {
    const lx = hx - s * 1.1 + rand() * s * 2.2;
    const ly = hy - s * 0.9 + rand() * s * 1.8;
    const light = ly < hy - 2 && lx < hx + 3;
    p.circle(lx, ly, 1.6 + rand(), light ? rgba('#a6e07f', 0.7) : rgba('#2f7432', 0.45), null);
  }
  c.restore();
  p.heart(hx, hy, s, null);
  const fr = rng('topiary-fl');
  for (let i = 0; i < 7; i++) {
    p.circle(hx - 10 + fr() * 20, hy - 7 + fr() * 14, 1.3, i % 2 ? '#ff8fb3' : '#ffffff', shade('#ff8fb3', -0.3));
  }
  // ribbon bow on the trunk
  p.ellipse(x - 3, y - 20, 3, 1.8, '#ff5b7f', O, -0.4);
  p.ellipse(x + 3, y - 20, 3, 1.8, '#ff5b7f', O, 0.4);
  p.circle(x, y - 20, 1.3, '#e5344f');
}

function loveBench(p: Pen): void {
  const c = p.center;
  p.shadow(c.x, c.y + 2, 24, 10);
  const frame = '#7a4b2e';
  for (const [u, v] of [
    [0.22, 0.4],
    [0.78, 0.4],
    [0.22, 0.68],
    [0.78, 0.68],
  ]) {
    p.box(u - 0.03, v - 0.03, 0.06, 0.06, 8, frame);
  }
  // backrest posts + rail
  const bv = 0.36;
  for (const u of [0.22, 0.78]) thick(p, [p.iso(u, bv, 8), p.iso(u, bv, 22)], 2, frame);
  thick(p, [p.iso(0.22, bv, 14), p.iso(0.78, bv, 14)], 1.6, frame);
  onFace(p, p.iso(0, bv), 0.5, () => {
    p.heart(16, -24, 10.5, radial(p, 16, -26, 12, '#ff7d93', '#d92f50'));
    p.heart(16, -24, 6, '#ffc2d1', shade('#ffc2d1', -0.3));
    p.ellipse(11, -28, 1.8, 1.1, rgba('#ffffff', 0.7), null, -0.5);
  });
  // seat
  p.box(0.18, 0.36, 0.64, 0.36, 3, '#e3a46c', 8);
  for (const v of [0.48, 0.6]) p.line([p.iso(0.18, v, 11), p.iso(0.82, v, 11)], shade('#e3a46c', -0.25), 0.8);
  // armrests
  for (const u of [0.18, 0.79]) p.box(u, 0.36, 0.03, 0.36, 2, frame, 16);
  for (const u of [0.195, 0.805]) thick(p, [p.iso(u, 0.7, 11), p.iso(u, 0.7, 16)], 1.2, frame);
  // a little heart cushion
  const cu = p.iso(0.62, 0.55, 11);
  p.heart(cu.x, cu.y - 3, 3.3, '#ff9fbc');
}

function roseBouquet(p: Pen): void {
  const { x, y } = p.center;
  p.shadow(x, y + 1, 15, 6);
  const vase = '#f6dbe6';
  p.ellipse(x, y - 7, 9, 7.5, radial(p, x, y - 7, 11, '#ffffff', shade(vase, -0.1)));
  p.rect(x - 4.5, y - 17, 9, 5, hgrad(p, x - 4.5, x + 4.5, '#ffffff', shade(vase, -0.12)));
  p.heart(x, y - 7, 2.8, '#ff7a9a', null);
  p.ellipse(x, y - 17, 6.5, 2.4, shade(vase, 0.2));
  // leaves fanning out
  for (const a of [-2.7, -2.2, -1.6, -1.0, -0.45]) leaf(p, x, y - 19, 11, a, a < -1.5 ? '#4f9e45' : '#5fb24f');
  // roses dome
  const roses: [number, number, string][] = [
    [-7, -32, '#e5344f'],
    [1, -35, '#ff6b8a'],
    [8, -31, '#e5344f'],
    [-10, -26, '#ff6b8a'],
    [-3, -28, '#d72645'],
    [5, -27, '#e5344f'],
    [11, -24, '#ff6b8a'],
    [-6, -21, '#e5344f'],
    [1, -22, '#ff8fab'],
    [7, -20, '#d72645'],
  ];
  for (const [dx, dy, col] of roses) rose(p, x + dx, y + dy, 4.3, col);
  const r = rng('babybreath');
  for (let i = 0; i < 10; i++) p.circle(x - 12 + r() * 24, y - 37 + r() * 16, 0.9, '#ffffff', null);
  // bow
  p.ellipse(x - 4.5, y - 15, 4, 2.2, '#ff5b7f', O, -0.35);
  p.ellipse(x + 4.5, y - 15, 4, 2.2, '#ff5b7f', O, 0.35);
  p.line([{ x: x - 1, y: y - 14 }, { x: x - 4, y: y - 7 }], '#ff5b7f', 1.6);
  p.line([{ x: x + 1, y: y - 14 }, { x: x + 4, y: y - 8 }], '#ff5b7f', 1.6);
  p.circle(x, y - 15, 1.6, '#e5344f');
}

// ---------------------------------------------------------------------------
// St. Patrick's

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

function cloverPatch(p: Pen): void {
  const { x, y } = p.center;
  p.ellipse(x, y, 25, 11.5, '#6cbf52', shade('#6cbf52', -0.4));
  p.ellipse(x - 3, y - 2, 18, 7, rgba('#9be07a', 0.5), null);
  const rand = rng('clover');
  const pts: { x: number; y: number; c: string }[] = [];
  for (let i = 0; i < 16; i++) {
    const a = rand() * TAU;
    const d = Math.sqrt(rand());
    pts.push({ x: x + Math.cos(a) * d * 19, y: y + Math.sin(a) * d * 8, c: rand() < 0.5 ? '#3fae4a' : '#58c45a' });
  }
  pts.push({ x: x + 2, y: y + 4, c: 'four' });
  pts.sort((a, b) => a.y - b.y);
  for (const q of pts) {
    if (q.c === 'four') {
      clover(p, q.x, q.y, 4.4, '#46c15a', true);
      sparkle(p, q.x + 7, q.y - 11, 3);
      sparkle(p, q.x - 7, q.y - 9, 2);
    } else {
      clover(p, q.x, q.y, 3.1, q.c);
    }
  }
  for (const [dx, dy] of [
    [-12, -1],
    [11, -3],
  ]) {
    p.line([{ x: x + dx, y: y + dy }, { x: x + dx, y: y + dy - 6 }], '#3e8a35', 1);
    p.circle(x + dx, y + dy - 7, 2, '#fff2f6', shade('#ffb3cb', -0.2));
  }
}

function potOfGold(p: Pen): void {
  const { x, y } = p.center;
  p.shadow(x, y + 1, 18, 8);
  const iron = '#3d3a48';
  for (const dx of [-7, 7]) p.ellipse(x + dx, y - 1, 2.5, 1.6, iron);
  p.ellipse(x, y - 9, 13, 10, radial(p, x, y - 9, 15, '#6b6680', iron));
  p.ellipse(x - 5, y - 12, 2, 3.5, rgba('#ffffff', 0.25), null, 0.4);
  // rim back
  p.ellipse(x, y - 17, 12.5, 4.5, '#2a2733');
  // coin heap
  const rand = rng('gold');
  p.ellipse(x, y - 18, 11, 4, '#e0a92c', null);
  const coins: Pt[] = [];
  for (let i = 0; i < 26; i++) {
    const a = rand() * Math.PI;
    const d = Math.sqrt(rand());
    coins.push({ x: x + Math.cos(a) * d * 10, y: y - 18 - Math.sin(a) * d * 9 });
  }
  coins.sort((a, b) => a.y - b.y);
  for (const q of coins) {
    p.ellipse(q.x, q.y, 3, 1.7, radial(p, q.x, q.y, 3.2, '#fff0a0', '#e9b52f'), shade('#c48a1a', -0.25));
  }
  // front rim
  const c = p.ctx;
  c.beginPath();
  c.ellipse(x, y - 17, 12.5, 4.5, 0, 0, Math.PI);
  c.strokeStyle = O;
  c.lineWidth = 4;
  c.stroke();
  c.strokeStyle = '#5a556b';
  c.lineWidth = 2.2;
  c.stroke();
  // spilled coins + sparkles
  for (const [dx, dy] of [
    [13, 4],
    [17, 1],
    [-15, 3],
  ]) {
    p.ellipse(x + dx, y + dy, 2.8, 1.4, GOLD, shade('#c48a1a', -0.25));
  }
  sparkle(p, x - 8, y - 29, 3.2);
  sparkle(p, x + 9, y - 27, 2.4);
  sparkle(p, x + 1, y - 33, 2.6, '#ffffff');
}

function rainbowArch(p: Pen): void {
  const o = p.iso(0.15, 0.5);
  const len = 1.7 * 32;
  const mid = { x: o.x + len / 2, y: o.y + len / 4 };
  p.shadow(mid.x, mid.y + 2, 40, 14, 0.15);
  const bands = ['#ff6b6b', '#ffa94d', '#ffe066', '#69db7c', '#4dabf7', '#9775fa'];
  const bw = 3.4;
  const R = 23;
  const RY = 42;
  onFace(p, o, 0.5, () => {
    const c = p.ctx;
    c.lineCap = 'butt';
    const cx = len / 2;
    const outerR = R;
    const arcPath = (rx: number, ry: number) => {
      c.beginPath();
      c.ellipse(cx, -2, Math.max(1, rx), Math.max(1, ry), 0, Math.PI, TAU);
    };
    // outline under the whole band
    arcPath(outerR - (bw * bands.length) / 2, RY - (bw * bands.length) / 2);
    c.strokeStyle = O;
    c.lineWidth = bw * bands.length + 2;
    c.stroke();
    bands.forEach((col, i) => {
      arcPath(outerR - bw * (i + 0.5), RY - bw * (i + 0.5));
      c.strokeStyle = col;
      c.lineWidth = bw + 0.3;
      c.stroke();
    });
    arcPath(outerR - bw * 0.35, RY - bw * 0.35);
    c.strokeStyle = rgba('#ffffff', 0.45);
    c.lineWidth = 0.8;
    c.stroke();
  });
  // clouds hide the rainbow's feet
  const L = { x: o.x + (len / 2 - R + 10), y: o.y + (len / 2 - R + 10) / 2 };
  const Rt = { x: o.x + (len / 2 + R - 10), y: o.y + (len / 2 + R - 10) / 2 };
  cloud(p, L.x, L.y - 3, 12.5);
  cloud(p, Rt.x, Rt.y - 3, 12.5);
  sparkle(p, mid.x - 2, mid.y - 52, 3);
  sparkle(p, mid.x + 16, mid.y - 40, 2.2);
}

// ---------------------------------------------------------------------------
// Spring

const PASTELS = ['#ff9ec4', '#8fd0ff', '#c7a6ff', '#ffe07a', '#a8e6a0', '#ffb38a'];

function eggBasket(p: Pen): void {
  const { x, y } = p.center;
  p.shadow(x, y + 1, 18, 7);
  const wick = '#d39b55';
  const ry = y - 12;
  // handle
  thickCurve(p, { x: x - 12, y: ry }, { x, y: y - 40 }, { x: x + 12, y: ry }, 2.2, shade(wick, 0.1));
  p.ellipse(x, ry, 13, 5.5, '#8c5a2b');
  for (let i = 0; i < 9; i++) p.line([{ x: x - 10 + i * 2.5, y: ry + 1 }, { x: x - 9 + i * 2.5, y: ry - 3 }], '#8fd16a', 1);
  const eggs: [number, number, number][] = [
    [-7, -3, 0],
    [0, -5, 1],
    [7, -3, 2],
    [-3.5, 0, 3],
    [4, 0.5, 4],
  ];
  eggs.forEach(([dx, dy, i]) => egg(p, x + dx, ry + dy, 4.6, PASTELS[i], i));
  // basket body
  const c = p.ctx;
  const body = () => {
    c.beginPath();
    c.moveTo(x + 13, ry);
    c.ellipse(x, ry, 13, 5.5, 0, 0, Math.PI, false);
    c.lineTo(x - 10, y - 2);
    c.quadraticCurveTo(x, y + 2.5, x + 10, y - 2);
    c.closePath();
  };
  body();
  fs(p, hgrad(p, x - 13, x + 13, shade(wick, 0.12), shade(wick, -0.22)));
  c.save();
  body();
  c.clip();
  for (let i = 0; i < 4; i++) {
    const yy = ry + 3 + i * 3;
    p.curve({ x: x - 14, y: yy - 1 }, { x, y: yy + 3 }, { x: x + 14, y: yy - 1 }, shade(wick, -0.3), 0.8);
  }
  for (let i = -5; i <= 5; i++) p.line([{ x: x + i * 2.4, y: ry + 2 }, { x: x + i * 2, y: y + 2 }], rgba('#6b4423', 0.35), 0.8);
  c.restore();
  c.beginPath();
  c.ellipse(x, ry, 13, 5.5, 0, 0, Math.PI, false);
  c.strokeStyle = O;
  c.lineWidth = 3.4;
  c.stroke();
  c.strokeStyle = shade(wick, 0.2);
  c.lineWidth = 1.6;
  c.stroke();
  // bow on handle
  p.ellipse(x - 9.5, ry - 7, 2.6, 1.6, '#ff8fb3', O, -0.6);
  p.ellipse(x - 7, ry - 9.5, 2.6, 1.6, '#ff8fb3', O, -1.2);
}

function eggTree(p: Pen): void {
  const { x, y } = p.center;
  p.shadow(x, y + 1, 18, 7);
  grassTufts(p, [
    { x: x - 9, y: y + 2 },
    { x: x + 8, y: y + 3 },
  ]);
  const bark = '#8a5f3e';
  p.poly(
    [
      { x: x - 3.5, y: y + 1 },
      { x: x - 2, y: y - 30 },
      { x: x + 2, y: y - 30 },
      { x: x + 3.5, y: y + 1 },
    ],
    hgrad(p, x - 3.5, x + 3.5, shade(bark, 0.15), shade(bark, -0.2)),
  );
  p.foliage(x, y - 42, 19, '#8fd16a', 'eggtree', 8);
  const fr = rng('eggtree-fl');
  for (let i = 0; i < 9; i++) p.flower(x - 14 + fr() * 28, y - 56 + fr() * 22, 1.8, '#ffffff', '#ffd84a');
  const eggs: [number, number][] = [
    [-14, -30],
    [-6, -26],
    [5, -28],
    [14, -32],
    [-10, -46],
    [9, -47],
    [0, -40],
  ];
  eggs.forEach(([dx, dy], i) => {
    const ex = x + dx;
    const ey = y + dy;
    p.line([{ x: ex, y: ey - 9 }, { x: ex, y: ey - 3.5 }], '#ff7aa2', 0.9);
    egg(p, ex, ey, 3.7, PASTELS[i % PASTELS.length], i);
  });
}

function chick(p: Pen, x: number, y: number, r: number, shell = false): void {
  p.line([{ x: x - 1.5, y: y }, { x: x - 1.5, y: y - 1.5 }], '#f08a24', 1);
  p.line([{ x: x + 1.5, y: y }, { x: x + 1.5, y: y - 1.5 }], '#f08a24', 1);
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
  p.circle(x + r * 0.15, y - r * 1.4, 0.75, '#2b1d18', null);
  p.ellipse(x + r * 0.05, y - r * 0.95, 1, 0.6, rgba('#ff8fa3', 0.8), null);
  if (shell) {
    const top = y - r * 2 - 0.5;
    p.poly(
      [
        { x: x - r * 0.75, y: top + 1.5 },
        { x: x - r * 0.5, y: top - 1.5 },
        { x: x - r * 0.2, y: top + 0.2 },
        { x: x + r * 0.1, y: top - 2 },
        { x: x + r * 0.4, y: top + 0.2 },
        { x: x + r * 0.7, y: top - 1.2 },
        { x: x + r * 0.8, y: top + 1.5 },
      ],
      '#fffaf0',
    );
  }
}

function chickFamily(p: Pen): void {
  const { x, y } = p.center;
  p.shadow(x, y + 2, 21, 8);
  const hen = '#fff4e2';
  const hx = x - 5;
  const hy = y - 1;
  // tail
  p.poly(
    [
      { x: hx - 7, y: hy - 9 },
      { x: hx - 14, y: hy - 19 },
      { x: hx - 11, y: hy - 9 },
      { x: hx - 15, y: hy - 14 },
      { x: hx - 9, y: hy - 5 },
    ],
    shade(hen, -0.08),
  );
  p.line([{ x: hx - 2, y: hy }, { x: hx - 2, y: hy - 3 }], '#f08a24', 1.2);
  p.line([{ x: hx + 3, y: hy }, { x: hx + 3, y: hy - 3 }], '#f08a24', 1.2);
  p.ellipse(hx, hy - 10, 10, 8, radial(p, hx, hy - 10, 12, '#ffffff', shade(hen, -0.1)));
  p.ellipse(hx - 2, hy - 10, 5.5, 3.5, shade(hen, -0.1), shade(hen, -0.45), -0.25);
  // head
  p.circle(hx + 7, hy - 19, 2.2, '#e8443c');
  p.circle(hx + 9, hy - 20.5, 2, '#e8443c');
  p.circle(hx + 8, hy - 17, 5, hen);
  p.poly(
    [
      { x: hx + 12.5, y: hy - 18 },
      { x: hx + 15.5, y: hy - 16.8 },
      { x: hx + 12.5, y: hy - 15.5 },
    ],
    '#ffb02e',
  );
  p.ellipse(hx + 12.6, hy - 13.7, 1.1, 1.7, '#e8443c', null);
  p.circle(hx + 9.5, hy - 18, 0.8, '#2b1d18', null);
  p.ellipse(hx + 9, hy - 15.8, 1.3, 0.8, rgba('#ff8fa3', 0.8), null);
  // chicks
  chick(p, x + 15, y - 4, 3.6, true);
  chick(p, x + 8, y + 4, 4);
  chick(p, x - 4, y + 7, 3.8);
  chick(p, x - 16, y + 3, 3.4);
}

function tulip(p: Pen, x: number, y: number, color: string): void {
  p.line([{ x, y }, { x, y: y - 6 }], '#3f8f3c', 1.1);
  const ty = y - 6;
  p.poly(
    [
      { x: x - 2.6, y: ty },
      { x: x - 2.8, y: ty - 4.2 },
      { x: x - 1.2, y: ty - 2.8 },
      { x, y: ty - 5 },
      { x: x + 1.2, y: ty - 2.8 },
      { x: x + 2.8, y: ty - 4.2 },
      { x: x + 2.6, y: ty },
      { x, y: ty + 1.6 },
    ],
    hgrad(p, x - 2.8, x + 2.8, shade(color, 0.2), shade(color, -0.15)),
  );
}

function tulipCart(p: Pen): void {
  const c = p.center;
  p.shadow(c.x, c.y + 2, 42, 16);
  const wood = '#c98b53';
  // handles at the back
  for (const v of [0.35, 0.65]) thick(p, [p.iso(0.32, v, 12), p.iso(0.02, v, 7)], 1.6, shade(wood, -0.15));
  thick(p, [p.iso(0.03, 0.33, 7), p.iso(0.03, 0.67, 7)], 1.8, shade(wood, -0.15));
  // back wheel
  onFace(p, p.iso(0, 0.22), 0.5, () => {
    p.circle(32, -8, 7.5, shade(wood, -0.35));
  });
  // support leg
  thick(p, [p.iso(0.45, 0.5, 9), p.iso(0.42, 0.5, 0)], 1.6, shade(wood, -0.2));
  // bed
  p.box(0.3, 0.25, 1.4, 0.5, 9, wood, 8);
  for (const z of [11, 14]) p.line([p.iso(0.3, 0.75, z), p.iso(1.7, 0.75, z)], shade(wood, -0.25), 0.7);
  p.diamond(0.36, 0.3, 1.28, 0.4, '#6b4a2e', null, 17);
  // tulips, back to front
  const cols = ['#ff5a6e', '#ffd23f', '#ff8fc0', '#ffffff', '#ff8c3a', '#c98bff'];
  const rand = rng('tulipcart');
  const items: { u: number; v: number; col: string }[] = [];
  for (const v of [0.34, 0.47, 0.6, 0.71]) {
    for (let u = 0.42; u < 1.66; u += 0.15) items.push({ u: u + (rand() - 0.5) * 0.05, v, col: cols[Math.floor(rand() * cols.length)] });
  }
  items.sort((a, b) => a.u + a.v - (b.u + b.v));
  for (const t of items) {
    const q = p.iso(t.u, t.v, 17);
    leaf(p, q.x, q.y, 4, -1.9 + (rand() - 0.5), '#4f9e45', null);
    tulip(p, q.x, q.y, t.col);
  }
  // front wheel
  onFace(p, p.iso(0, 0.78), 0.5, () => {
    p.circle(32, -8, 7.5, '#8a5a34');
    p.circle(32, -8, 5, null, shade('#8a5a34', -0.35));
    for (let k = 0; k < 4; k++) {
      const a = (k / 4) * Math.PI;
      p.line(
        [
          { x: 32 + Math.cos(a) * 5, y: -8 + Math.sin(a) * 5 },
          { x: 32 - Math.cos(a) * 5, y: -8 - Math.sin(a) * 5 },
        ],
        shade('#8a5a34', -0.35),
        0.9,
      );
    }
    p.circle(32, -8, 1.5, GOLD);
  });
}

// ---------------------------------------------------------------------------
// Summer festival

function beachUmbrella(p: Pen): void {
  // towel
  p.diamond(0.06, 0.48, 0.42, 0.46, '#ff7b8a', O);
  for (const t of [0.12, 0.24, 0.36]) {
    p.line([p.iso(0.06 + t, 0.48), p.iso(0.06 + t, 0.94)], '#ffffff', 1.6);
  }
  // beach ball
  const bb = p.iso(0.82, 0.78);
  p.shadow(bb.x, bb.y, 5, 2.5);
  p.ball(bb.x, bb.y - 4, 4, '#ffffff');
  p.arc(bb.x, bb.y - 4, 4, -Math.PI / 2, Math.PI / 6, '#ff5a5a', null);
  p.arc(bb.x, bb.y - 4, 4, (Math.PI * 5) / 6, (Math.PI * 3) / 2, '#4dabf7', null);
  p.circle(bb.x, bb.y - 4, 4, null);
  const base = p.iso(0.55, 0.42);
  p.shadow(base.x - 4, base.y + 2, 24, 10, 0.18);
  // pole
  p.rect(base.x - 1, base.y - 50, 2, 50, '#fff6e6');
  for (let i = 0; i < 4; i++) p.rect(base.x - 1, base.y - 44 + i * 11, 2, 4, '#ff6b6b', null);
  // canopy
  const ax = base.x;
  const ay = base.y - 56;
  const cy = base.y - 44;
  const rx = 24;
  const ry = 9;
  const n = 10;
  const wedges: { a0: number; a1: number; i: number }[] = [];
  for (let i = 0; i < n; i++) wedges.push({ a0: (i / n) * TAU, a1: ((i + 1) / n) * TAU, i });
  wedges.sort((a, b) => Math.sin((a.a0 + a.a1) / 2) - Math.sin((b.a0 + b.a1) / 2));
  for (const w of wedges) {
    const am = (w.a0 + w.a1) / 2;
    const p0 = { x: ax + Math.cos(w.a0) * rx, y: cy + Math.sin(w.a0) * ry };
    const p1 = { x: ax + Math.cos(w.a1) * rx, y: cy + Math.sin(w.a1) * ry };
    const pm = { x: ax + Math.cos(am) * rx * 0.92, y: cy + Math.sin(am) * ry + 2.2 };
    const col = w.i % 2 ? '#fff4e0' : '#ff6b6b';
    const lit = Math.cos(am) < 0 ? 0.08 : -0.12;
    const c = p.ctx;
    c.beginPath();
    c.moveTo(ax, ay);
    c.lineTo(p0.x, p0.y);
    c.quadraticCurveTo(pm.x, pm.y, p1.x, p1.y);
    c.closePath();
    fs(p, shade(col, lit));
  }
  p.circle(ax, ay - 1, 2, '#ff6b6b');
}

function sandcastle(p: Pen): void {
  const { x, y } = p.center;
  const sand = '#ecca8c';
  p.shadow(x, y + 2, 24, 10);
  p.ellipse(x, y, 23, 10, radial(p, x, y, 24, shade(sand, 0.2), shade(sand, -0.08)));
  const crenels = (cx: number, cy: number, r: number) => {
    const n = 7;
    const pts: Pt[] = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU + 0.3;
      pts.push({ x: cx + Math.cos(a) * r * 0.8, y: cy + Math.sin(a) * r * 0.4 });
    }
    pts.sort((a, b) => a.y - b.y);
    for (const q of pts) p.roundRect(q.x - 1.5, q.y - 3, 3, 3.5, 0.8, shade(sand, 0.15));
  };
  // main tower
  p.cylinder(x, y - 5, 7, 20, sand);
  crenels(x, y - 25, 7);
  p.roundRect(x - 1.6, y - 19, 3.2, 4, 1.5, '#7a5a3a');
  // flag
  p.line([{ x, y: y - 27 }, { x, y: y - 39 }], O, 1);
  p.poly(
    [
      { x: x + 0.5, y: y - 39 },
      { x: x + 9, y: y - 36.5 },
      { x: x + 0.5, y: y - 34 },
    ],
    '#ff5a5a',
  );
  // front wall
  p.rect(x - 11, y - 10, 22, 10, hgrad(p, x - 11, x + 11, shade(sand, 0.05), shade(sand, -0.15)));
  for (let i = 0; i < 5; i++) p.rect(x - 9 + i * 4, y - 12.5, 2.5, 2.5, shade(sand, 0.05));
  p.poly(
    [
      { x: x - 3, y },
      { x: x - 3, y: y - 5 },
      { x, y: y - 7.5 },
      { x: x + 3, y: y - 5 },
      { x: x + 3, y },
    ],
    '#7a5a3a',
  );
  // side towers
  for (const dx of [-12, 12]) {
    p.cylinder(x + dx, y + 2, 5, 13, sand);
    crenels(x + dx, y - 11, 5);
    p.roundRect(x + dx - 1, y - 6, 2, 3, 1, '#7a5a3a');
  }
  // shells + bucket
  p.arc(x - 18, y + 4, 2.4, Math.PI, TAU, '#ffb3c1');
  p.arc(x + 6, y + 7, 2, Math.PI, TAU, '#fff2e0');
  p.cylinder(x + 20, y + 4, 3.4, 5, '#4dabf7');
  p.curve({ x: x + 16.6, y: y - 1 }, { x: x + 20, y: y - 6 }, { x: x + 23.4, y: y - 1 }, O, 0.8);
}

function lemonadeStand(p: Pen): void {
  const c = p.center;
  p.shadow(c.x, c.y + 2, 26, 11);
  const wood = '#f1d39b';
  const postC = '#d9a65e';
  // back posts
  for (const u of [0.23, 0.77]) thick(p, [p.iso(u, 0.36, 18), p.iso(u, 0.36, 41)], 1.6, postC);
  // counter
  p.box(0.2, 0.32, 0.6, 0.45, 18, wood);
  onFace(p, p.iso(0.2, 0.77), 0.5, () => {
    p.rect(0, -16, 19.2, 3, '#ffd84a', null);
    p.ellipse(9.6, -7.5, 5.5, 4.2, radial(p, 9.6, -7.5, 6, '#fff3a0', '#ffd23f'));
    p.ellipse(9.6, -7.5, 3.2, 2.4, null, '#f0b400', 0.8);
    leaf(p, 13, -11, 4, -0.6, LEAF);
  });
  onFace(p, p.iso(0.8, 0.77), -0.5, () => {
    for (let i = 0; i < 3; i++) p.rect(2 + i * 4.5, -16, 2.2, 14, rgba('#ffffff', 0.35), null);
  });
  // goods on the counter
  const pit = p.iso(0.38, 0.52, 18);
  p.cylinder(pit.x, pit.y, 3.4, 8, '#ffe36e');
  p.curve({ x: pit.x + 3.4, y: pit.y - 7 }, { x: pit.x + 7, y: pit.y - 5 }, { x: pit.x + 3.4, y: pit.y - 2 }, O, 1.2);
  for (const [u, v] of [
    [0.55, 0.62],
    [0.66, 0.5],
  ]) {
    const q = p.iso(u, v, 18);
    p.cylinder(q.x, q.y, 2, 4, '#fff7c2');
  }
  const lm = p.iso(0.6, 0.38, 18);
  p.ball(lm.x - 2, lm.y - 2, 2.2, '#ffd23f');
  p.ball(lm.x + 2, lm.y - 2, 2.2, '#ffd23f');
  p.ball(lm.x, lm.y - 4, 2.2, '#ffd23f');
  // front posts
  for (const u of [0.23, 0.77]) thick(p, [p.iso(u, 0.74, 18), p.iso(u, 0.74, 41)], 1.6, postC);
  // striped awning
  const z = 41;
  const u0 = 0.12;
  const v0 = 0.24;
  const du = 0.76;
  const dv = 0.6;
  const n = 6;
  for (let i = 0; i < n; i++) {
    p.diamond(u0 + (i * du) / n, v0, du / n, dv, i % 2 ? '#ffffff' : '#ffd23f', null, z + 3);
  }
  p.diamond(u0, v0, du, dv, null, O, z + 3);
  // valance scallops along the two front edges
  for (let i = 0; i < n; i++) {
    const a = p.iso(u0 + (i * du) / n, v0 + dv, z + 3);
    const b = p.iso(u0 + ((i + 1) * du) / n, v0 + dv, z + 3);
    const m = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 + 5 };
    p.poly([a, b, m], i % 2 ? '#ffffff' : '#ffd23f');
  }
  for (let i = 0; i < 5; i++) {
    const a = p.iso(u0 + du, v0 + dv - (i * dv) / 5, z + 3);
    const b = p.iso(u0 + du, v0 + dv - ((i + 1) * dv) / 5, z + 3);
    const m = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 + 5 };
    p.poly([a, b, m], shade(i % 2 ? '#ffffff' : '#ffd23f', -0.12));
  }
  // lemon sign on top
  const s = p.iso(0.5, 0.54, z + 3);
  p.line([s, { x: s.x, y: s.y - 6 }], O, 1.2);
  p.circle(s.x, s.y - 12, 6.5, '#ffe36e');
  p.circle(s.x, s.y - 12, 4.8, '#fff7c8', '#f0b400');
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * TAU;
    p.line(
      [
        { x: s.x, y: s.y - 12 },
        { x: s.x + Math.cos(a) * 4.6, y: s.y - 12 + Math.sin(a) * 4.6 },
      ],
      '#f0b400',
      0.8,
    );
  }
}

function tikiTorch(p: Pen): void {
  const { x, y } = p.center;
  p.shadow(x, y + 1, 10, 5);
  p.glow(x, y, 16, '#ffb347', 0.2);
  const bam = '#d9b26a';
  p.rect(x - 2, y - 42, 4, 42, hgrad(p, x - 2, x + 2, shade(bam, 0.2), shade(bam, -0.2)));
  for (const k of [10, 22, 34]) p.line([{ x: x - 2, y: y - k }, { x: x + 2, y: y - k }], shade(bam, -0.4), 1);
  // woven head
  const hd = '#7a5530';
  p.poly(
    [
      { x: x - 6, y: y - 50 },
      { x: x + 6, y: y - 50 },
      { x: x + 3.5, y: y - 41 },
      { x: x - 3.5, y: y - 41 },
    ],
    hgrad(p, x - 6, x + 6, shade(hd, 0.15), shade(hd, -0.2)),
  );
  for (let i = 0; i < 3; i++) {
    p.line([{ x: x - 5 + i * 0.6, y: y - 47.5 + i * 3 }, { x: x + 5 - i * 0.6, y: y - 47.5 + i * 3 }], shade(hd, 0.35), 0.8);
  }
  p.ellipse(x, y - 50, 6, 1.8, '#4a3020');
  flame(p, x, y - 50, 4.4);
  grassTufts(p, [
    { x: x - 6, y: y + 2 },
    { x: x + 6, y: y + 1 },
  ]);
}

function kiddiePool(p: Pen): void {
  const { x, y } = p.center;
  const R = 50;
  const IR = 38;
  const wall = 7;
  p.shadow(x, y + 3, R + 8, (R + 8) / 2, 0.22);
  p.cylinder(x, y, R, wall, '#4fb0ee');
  const ty = y - wall;
  const c = p.ctx;
  c.save();
  c.beginPath();
  c.ellipse(x, ty, R, R / 2, 0, 0, TAU);
  c.ellipse(x, ty, IR, IR / 2, 0, 0, TAU);
  c.clip('evenodd');
  const n = 18;
  for (let i = 0; i < n; i++) {
    const a0 = (i / n) * TAU;
    const a1 = ((i + 1) / n) * TAU;
    p.poly(
      [
        { x, y: ty },
        { x: x + Math.cos(a0) * R * 1.3, y: ty + Math.sin(a0) * R * 0.65 },
        { x: x + Math.cos(a1) * R * 1.3, y: ty + Math.sin(a1) * R * 0.65 },
      ],
      i % 2 ? '#fff8ee' : '#7cc8f5',
      null,
    );
  }
  p.ellipse(x - 10, ty - 16, 22, 3, rgba('#ffffff', 0.45), null);
  c.restore();
  p.ellipse(x, ty, R, R / 2, null);
  // inner wall + water
  c.save();
  c.beginPath();
  c.ellipse(x, ty, IR, IR / 2, 0, 0, TAU);
  c.clip();
  p.ellipse(x, ty, IR, IR / 2, '#a9dcf7', null);
  const wg = c.createLinearGradient(0, ty - IR / 2, 0, ty + IR / 2);
  wg.addColorStop(0, '#7fd3f7');
  wg.addColorStop(1, '#3ea6e6');
  p.ellipse(x, ty + 4, IR, IR / 2, wg, null);
  p.ellipse(x, ty + 4, IR, IR / 2, null, rgba('#ffffff', 0.6), 1.2);
  for (const [dx, dy, w] of [
    [-18, 2, 9],
    [-4, 10, 7],
    [14, -2, 6],
    [-22, 10, 5],
  ]) {
    p.curve({ x: x + dx - w, y: ty + dy }, { x: x + dx, y: ty + dy - 2 }, { x: x + dx + w, y: ty + dy }, rgba('#ffffff', 0.7), 1);
  }
  c.restore();
  p.ellipse(x, ty, IR, IR / 2, null);
  // rubber duck
  const dx = x + 12;
  const dy = ty + 6;
  p.ellipse(dx, dy + 2, 9, 2.5, rgba('#ffffff', 0.4), null);
  p.ellipse(dx, dy, 7, 4.2, radial(p, dx, dy, 8, '#fff07a', '#ffc81e'));
  p.poly(
    [
      { x: dx - 6.5, y: dy - 1 },
      { x: dx - 9, y: dy - 4 },
      { x: dx - 5, y: dy - 2.5 },
    ],
    '#ffd23f',
  );
  p.ball(dx + 3, dy - 6, 3.6, '#ffd84a');
  p.ellipse(dx + 7, dy - 5.5, 2.2, 1.2, '#ff8c1a');
  p.circle(dx + 4, dy - 7, 0.8, '#2b1d18', null);
  p.ellipse(dx - 1, dy - 0.5, 3, 1.6, shade('#ffd23f', -0.08), shade('#ffd23f', -0.35), -0.2);
}

function festivalBunting(p: Pen): void {
  const A = p.iso(0.16, 0.5);
  const B = p.iso(1.84, 0.5);
  const ht = 40;
  p.shadow(A.x, A.y + 1, 7, 3.5);
  p.shadow(B.x, B.y + 1, 7, 3.5);
  post(p, A.x, A.y, ht, WOOD, 3.6);
  const ta = { x: A.x, y: A.y - ht + 2 };
  const tb = { x: B.x, y: B.y - ht + 2 };
  const cols = ['#ff6b8a', '#ffd23f', '#4fd1c5', '#a678f0', '#ff9a3c', '#7bd36a'];
  const strings: [number, number, number][] = [
    [0, 14, 0],
    [9, 9, 3],
  ];
  for (const [drop, sag, off] of strings) {
    const a = { x: ta.x, y: ta.y + drop };
    const b = { x: tb.x, y: tb.y + drop };
    const cc = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 + sag * 2 };
    p.curve(a, cc, b, O, 1);
    const n = drop ? 7 : 9;
    for (let i = 0; i < n; i++) {
      const t = (i + 0.6) / (n + 0.2);
      const l = qpt(a, cc, b, t - 0.035);
      const r = qpt(a, cc, b, t + 0.035);
      const m = qpt(a, cc, b, t);
      p.poly([l, r, { x: m.x, y: m.y + (drop ? 6 : 8) }], cols[(i + off) % cols.length]);
    }
  }
  post(p, B.x, B.y, ht, WOOD, 3.6);
  p.circle(ta.x, ta.y - 3, 2.4, GOLD);
  p.circle(tb.x, tb.y - 3, 2.4, GOLD);
  // pennants on the posts
  for (const t of [ta, tb]) {
    p.line([{ x: t.x, y: t.y - 5 }, { x: t.x, y: t.y - 12 }], O, 1);
    p.poly(
      [
        { x: t.x + 0.5, y: t.y - 12 },
        { x: t.x + 7, y: t.y - 10 },
        { x: t.x + 0.5, y: t.y - 8 },
      ],
      '#ff6b8a',
    );
  }
}

// ---------------------------------------------------------------------------
// Harvest festival

function cornucopia(p: Pen): void {
  const { x, y } = p.center;
  p.shadow(x, y + 2, 24, 9);
  const P0 = { x: x - 19, y: y - 22 };
  const P1 = { x: x - 22, y: y - 2 };
  const P2 = { x: x + 1, y: y - 9 };
  const wick = '#d39b55';
  const N = 24;
  const up: Pt[] = [];
  const dn: Pt[] = [];
  const frames: { c: Pt; n: Pt; r: number }[] = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const cpt = qpt(P0, P1, P2, t);
    const dx = 2 * (1 - t) * (P1.x - P0.x) + 2 * t * (P2.x - P1.x);
    const dy = 2 * (1 - t) * (P1.y - P0.y) + 2 * t * (P2.y - P1.y);
    const len = Math.hypot(dx, dy) || 1;
    const n = { x: -dy / len, y: dx / len };
    const r = 0.8 + 9.5 * Math.pow(t, 1.5);
    up.push({ x: cpt.x + n.x * r, y: cpt.y + n.y * r });
    dn.push({ x: cpt.x - n.x * r, y: cpt.y - n.y * r });
    frames.push({ c: cpt, n, r });
  }
  p.poly([...up, ...dn.reverse()], hgrad(p, x - 22, x + 4, shade(wick, 0.15), shade(wick, -0.15)));
  for (let i = 3; i < N; i += 3) {
    const f = frames[i];
    p.line(
      [
        { x: f.c.x + f.n.x * f.r, y: f.c.y + f.n.y * f.r },
        { x: f.c.x - f.n.x * f.r, y: f.c.y - f.n.y * f.r },
      ],
      shade(wick, -0.35),
      0.8,
    );
  }
  p.circle(P0.x, P0.y, 1.6, shade(wick, -0.1));
  // mouth
  const f = frames[N];
  const ang = Math.atan2(f.n.y, f.n.x);
  p.ellipse(f.c.x, f.c.y, f.r, f.r * 0.5, '#6b4423', O, ang);
  // produce spilling out
  for (let i = 0; i < 6; i++) p.ball(x + 2 + (i % 3) * 3, y - 15 + Math.floor(i / 3) * 3 + (i % 2), 2.2, '#8e5bd0');
  withXform(p, x + 10, y - 13, -0.7, () => {
    p.ellipse(0, 0, 6, 2.6, '#ffd23f');
    for (let k = -4; k <= 4; k += 2) p.line([{ x: k, y: -2.2 }, { x: k, y: 2.2 }], shade('#ffd23f', -0.3), 0.6);
    leaf(p, -5, 0, 7, 2.8, '#c9b56a');
  });
  pumpkin(p, x + 14, y - 3, 6.2, '#f08a2e');
  p.ball(x + 4, y - 3, 3.8, '#e8443c');
  p.line([{ x: x + 4, y: y - 6.5 }, { x: x + 5, y: y - 8 }], O, 1);
  p.ellipse(x + 8, y + 3, 2.8, 3.4, radial(p, x + 8, y + 3, 4, '#e9f08a', '#b8c93a'));
  p.ball(x - 2, y + 2, 3, '#ff6a3d');
  leaf(p, x + 18, y - 9, 5, -0.6, '#d9862b');
  leaf(p, x - 6, y - 1, 5, 2.6, '#c84b2f');
}

function harvestWreath(p: Pen): void {
  const { x, y } = p.center;
  p.shadow(x, y + 2, 16, 7);
  const wood = '#9a6a42';
  // little cross-footed stand with a hook
  thick(p, [{ x: x - 9, y: y + 1 }, { x: x + 9, y: y - 1 }], 2, shade(wood, -0.1));
  thick(p, [{ x: x - 5, y: y - 3 }, { x: x + 5, y: y + 3 }], 2, shade(wood, -0.1));
  post(p, x, y, 50, wood, 3.6);
  p.circle(x, y - 51, 2.2, GOLD);
  thickCurve(p, { x, y: y - 46 }, { x: x + 4, y: y - 46 }, { x: x + 3, y: y - 42 }, 0.8, '#6b6070');
  // wreath
  const cy = y - 29;
  p.line([{ x: x + 3, y: y - 42 }, { x: x - 3, y: cy - 12 }], '#a8323e', 1.2);
  p.line([{ x: x + 3, y: y - 42 }, { x: x + 7, y: cy - 10 }], '#a8323e', 1.2);
  const R = 12.5;
  const c = p.ctx;
  c.beginPath();
  c.arc(x, cy, R, 0, TAU);
  c.strokeStyle = O;
  c.lineWidth = 9;
  c.stroke();
  c.strokeStyle = '#8b5e34';
  c.lineWidth = 7;
  c.stroke();
  const cols = ['#e8513a', '#f08a2e', '#f6c445', '#c8452f', '#b5652b'];
  const rand = rng('wreath');
  for (let i = 0; i < 34; i++) {
    const a = (i / 34) * TAU + rand() * 0.2;
    const r = R + (i % 2 ? 2.5 : -2.5) + (rand() - 0.5) * 1.5;
    if (i % 3 === 0) withXform(p, x + Math.cos(a) * r, cy + Math.sin(a) * r, a, () => p.star(0, 0, 3.4, cols[i % cols.length], shade(cols[i % cols.length], -0.4)));
    else leaf(p, x + Math.cos(a) * r - Math.cos(a + 1.2) * 3, cy + Math.sin(a) * r - Math.sin(a + 1.2) * 3, 7, a + 1.2, cols[i % cols.length]);
  }
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TAU + 0.3;
    p.circle(x + Math.cos(a) * R, cy + Math.sin(a) * R, 1.6, '#c0283a', shade('#c0283a', -0.4));
  }
  pumpkin(p, x - 8, cy + 9, 3.6, '#f08a2e');
  pumpkin(p, x + 9, cy - 8, 3, '#f6c445');
  // bow
  p.line([{ x: x + 1, y: cy + R }, { x: x - 3, y: cy + R + 7 }], '#a8323e', 2);
  p.line([{ x: x + 1, y: cy + R }, { x: x + 5, y: cy + R + 6 }], '#a8323e', 2);
  p.ellipse(x - 3, cy + R - 1, 3.6, 2.2, '#c0394a', O, -0.3);
  p.ellipse(x + 5, cy + R - 1, 3.6, 2.2, '#c0394a', O, 0.3);
  p.circle(x + 1, cy + R - 0.5, 1.6, '#a8323e');
}

function strawFace(p: Pen, pts: Pt[], seed: string): void {
  const c = p.ctx;
  c.save();
  c.beginPath();
  c.moveTo(pts[0].x, pts[0].y);
  for (const q of pts.slice(1)) c.lineTo(q.x, q.y);
  c.closePath();
  c.clip();
  const rand = rng(seed);
  const xs = pts.map((q) => q.x);
  const ys = pts.map((q) => q.y);
  const x0 = Math.min(...xs);
  const x1 = Math.max(...xs);
  const y0 = Math.min(...ys);
  const y1 = Math.max(...ys);
  for (let i = 0; i < 26; i++) {
    const sx = x0 + rand() * (x1 - x0);
    const sy = y0 + rand() * (y1 - y0);
    p.line(
      [
        { x: sx, y: sy },
        { x: sx + 3 + rand() * 2, y: sy + (rand() - 0.5) * 2 },
      ],
      rand() < 0.5 ? rgba('#a8822c', 0.6) : rgba('#fff2b0', 0.7),
      0.8,
    );
  }
  c.restore();
}

function hayPumpkins(p: Pen): void {
  const c = p.center;
  p.shadow(c.x, c.y + 2, 26, 11);
  const hay = '#e9c45e';
  const u0 = 0.16;
  const v0 = 0.28;
  const du = 0.66;
  const dv = 0.42;
  const ht = 13;
  p.box(u0, v0, du, dv, ht, hay);
  strawFace(p, [p.iso(u0, v0 + dv), p.iso(u0 + du, v0 + dv), p.iso(u0 + du, v0 + dv, ht), p.iso(u0, v0 + dv, ht)], 'hayL');
  strawFace(p, [p.iso(u0 + du, v0 + dv), p.iso(u0 + du, v0), p.iso(u0 + du, v0, ht), p.iso(u0 + du, v0 + dv, ht)], 'hayR');
  for (const t of [0.3, 0.7]) {
    const u = u0 + du * t;
    p.line([p.iso(u, v0 + dv), p.iso(u, v0 + dv, ht), p.iso(u, v0, ht)], '#9b6b2a', 1.1);
  }
  const top = p.iso(u0 + du * 0.55, v0 + dv * 0.5, ht);
  leaf(p, top.x - 5, top.y - 1, 6, 2.8, '#5f9a3a');
  pumpkin(p, top.x, top.y - 5.5, 7, '#f28a2e');
  const g1 = p.iso(0.22, 0.88);
  pumpkin(p, g1.x, g1.y - 4, 4.8, '#f3ead8');
  const g2 = p.iso(0.9, 0.8);
  pumpkin(p, g2.x, g2.y - 4.5, 5.4, '#e9772a');
  p.curve({ x: g2.x - 5, y: g2.y }, { x: g2.x - 9, y: g2.y - 2 }, { x: g2.x - 11, y: g2.y + 1 }, '#5f9a3a', 1);
}

function leafPile(p: Pen): void {
  const { x, y } = p.center;
  p.shadow(x, y + 2, 24, 10);
  p.ellipse(x, y - 3, 21, 10, radial(p, x, y - 5, 22, '#f5a04a', '#d0602f'));
  const cols = ['#e8513a', '#f08a2e', '#f6c445', '#c8452f', '#b5652b', '#ff9e3d'];
  const rand = rng('leafpile');
  const ls: { x: number; y: number; c: string; a: number; star: boolean }[] = [];
  for (let i = 0; i < 46; i++) {
    const a = rand() * TAU;
    const d = Math.sqrt(rand());
    ls.push({ x: x + Math.cos(a) * d * 18, y: y - 4 + Math.sin(a) * d * 8 - (1 - d) * 5, c: cols[i % cols.length], a: rand() * TAU, star: rand() < 0.55 });
  }
  ls.sort((a, b) => a.y - b.y);
  for (const l of ls) {
    if (l.star) withXform(p, l.x, l.y, l.a, () => p.star(0, 0, 3.4, l.c, shade(l.c, -0.4)), 1, 0.8);
    else leaf(p, l.x, l.y, 5.5, l.a, l.c, shade(l.c, -0.4));
  }
  for (const [dx, dy, i] of [
    [-24, 4, 0],
    [22, 2, 2],
    [12, 9, 1],
    [-12, 9, 3],
  ]) {
    p.star(x + dx, y + dy, 3, cols[i], shade(cols[i], -0.4));
  }
  withXform(p, x + 10, y - 22, 0.6, () => p.star(0, 0, 3, '#f6c445', shade('#f6c445', -0.4)));
}

function ciderStand(p: Pen): void {
  const c = p.center;
  p.shadow(c.x, c.y + 2, 26, 11);
  const wood = '#a86b3d';
  // back posts
  for (const u of [0.16, 0.66]) thick(p, [p.iso(u, 0.32, 16), p.iso(u, 0.32, 34)], 1.6, shade(wood, -0.15));
  p.box(0.13, 0.3, 0.56, 0.45, 16, wood);
  for (const z of [6, 11]) p.line([p.iso(0.13, 0.75, z), p.iso(0.69, 0.75, z)], shade(wood, -0.3), 0.7);
  onFace(p, p.iso(0.13, 0.75), 0.5, () => {
    p.ball(9, -8, 4.6, '#e8443c');
    p.line([{ x: 9, y: -12.5 }, { x: 10, y: -14.5 }], O, 1);
    leaf(p, 10, -13.5, 3.5, -0.5, LEAF);
  });
  // barrel + mugs
  const br = p.iso(0.5, 0.45, 16);
  p.cylinder(br.x, br.y, 5.5, 11, '#9a5f32');
  for (const k of [3, 8]) {
    const cx = p.ctx;
    cx.beginPath();
    cx.ellipse(br.x, br.y - k, 5.5, 2.75, 0, 0, Math.PI);
    cx.strokeStyle = '#4b4040';
    cx.lineWidth = 1.2;
    cx.stroke();
  }
  p.rect(br.x - 4, br.y - 5, 2, 2, GOLD, O);
  for (const [u, v] of [
    [0.25, 0.62],
    [0.36, 0.68],
  ]) {
    const q = p.iso(u, v, 16);
    p.cylinder(q.x, q.y, 2.2, 4.5, '#f0a640');
    p.ellipse(q.x, q.y - 4.5, 2.2, 1.1, '#fff4dc', null);
  }
  for (const u of [0.16, 0.66]) thick(p, [p.iso(u, 0.73, 16), p.iso(u, 0.73, 34)], 1.6, shade(wood, -0.15));
  p.gableRoof(0.13, 0.3, 0.56, 0.45, 34, 11, '#c84b3c', '#e8d2a8');
  // apple crate
  p.box(0.74, 0.42, 0.22, 0.38, 7, '#c9925a');
  const ap = rng('crate');
  const apples: Pt[] = [];
  for (let i = 0; i < 6; i++) apples.push(p.iso(0.77 + ap() * 0.16, 0.46 + ap() * 0.3, 8));
  apples.sort((a, b) => a.y - b.y);
  for (const a of apples) p.ball(a.x, a.y - 1, 2.4, ap() < 0.7 ? '#e8443c' : '#9bc43a');
}

function autumnMaple(p: Pen): void {
  const { x, y } = p.center;
  p.shadow(x, y + 1, 22, 9);
  const cols = ['#e8513a', '#f08a2e', '#f6c445', '#c8452f'];
  const rand = rng('maple-ground');
  for (let i = 0; i < 8; i++) {
    const a = rand() * TAU;
    p.star(x + Math.cos(a) * (10 + rand() * 10), y + Math.sin(a) * (4 + rand() * 4), 2.4, cols[i % 4], shade(cols[i % 4], -0.4));
  }
  const bark = '#7a4f33';
  p.poly(
    [
      { x: x - 4.5, y: y + 1 },
      { x: x - 2.5, y: y - 30 },
      { x: x + 2.5, y: y - 30 },
      { x: x + 4.5, y: y + 1 },
    ],
    hgrad(p, x - 4.5, x + 4.5, shade(bark, 0.15), shade(bark, -0.25)),
  );
  thick(p, [{ x: x + 1, y: y - 24 }, { x: x + 8, y: y - 32 }], 1.6, bark);
  thick(p, [{ x: x - 1, y: y - 26 }, { x: x - 8, y: y - 34 }], 1.6, bark);
  p.foliage(x, y - 47, 21, '#e3503a', 'maple', 9);
  const lr = rng('maple-leaves');
  for (let i = 0; i < 14; i++) {
    const a = lr() * TAU;
    const d = Math.sqrt(lr()) * 16;
    const col = i % 3 === 0 ? '#f6c445' : '#f08a2e';
    withXform(p, x + Math.cos(a) * d, y - 47 + Math.sin(a) * d * 0.8, lr(), () => p.star(0, 0, 2.6, col, shade(col, -0.35)));
  }
  withXform(p, x + 20, y - 22, 0.5, () => p.star(0, 0, 2.6, '#e8513a', shade('#e8513a', -0.4)));
  withXform(p, x - 19, y - 14, -0.4, () => p.star(0, 0, 2.4, '#f6c445', shade('#f6c445', -0.4)));
}

// ---------------------------------------------------------------------------
// Halloween

function jackOLantern(p: Pen): void {
  const { x, y } = p.center;
  p.glow(x, y, 28, '#ffb347', 0.35);
  p.shadow(x, y + 1, 14, 6);
  const cy = y - 11;
  pumpkin(p, x, cy, 12, '#f28a2e');
  leaf(p, x + 1.5, cy - 13, 6, -0.3, '#5f9a3a');
  p.curve({ x: x - 1, y: cy - 12 }, { x: x - 6, y: cy - 16 }, { x: x - 4, y: cy - 19 }, '#5f9a3a', 1.1);
  const glowFill = radial(p, x, cy - 2, 10, '#fff7b0', '#ffb72e');
  for (const dir of [-1, 1]) {
    const ex = x + dir * 5;
    p.poly(
      [
        { x: ex - 3, y: cy - 1.5 },
        { x: ex + 3, y: cy - 1.5 },
        { x: ex + dir * 0.6, y: cy - 6.5 },
      ],
      glowFill,
      '#8a3d12',
    );
  }
  const c = p.ctx;
  c.beginPath();
  c.moveTo(x - 7.5, cy + 2);
  c.quadraticCurveTo(x, cy + 4.5, x + 7.5, cy + 2);
  c.quadraticCurveTo(x, cy + 11.5, x - 7.5, cy + 2);
  c.closePath();
  fs(p, glowFill, '#8a3d12');
  p.rect(x - 1.2, cy + 3, 2.4, 2.4, '#f28a2e', null);
  p.glow(x, cy + 1, 10, '#ffe27a', 0.3);
  p.ellipse(x - 8, cy + 4, 1.8, 1.1, rgba('#ff6f6f', 0.45), null);
  p.ellipse(x + 8, cy + 4, 1.8, 1.1, rgba('#ff6f6f', 0.45), null);
}

function pumpkinPile(p: Pen): void {
  const { x, y } = p.center;
  p.shadow(x, y + 2, 24, 10);
  pumpkin(p, x - 8, y - 8, 8, '#f08a2e');
  pumpkin(p, x + 9, y - 7, 7.5, '#e9772a');
  leaf(p, x + 2, y - 19, 7, -2.5, '#5f9a3a');
  pumpkin(p, x + 1, y - 19, 6.4, '#f7a447');
  pumpkin(p, x - 14, y + 2, 4.8, '#f3ead8');
  pumpkin(p, x + 17, y, 4.2, '#9fb35a');
  pumpkin(p, x + 4, y + 3, 5.4, '#f28a2e');
  p.curve({ x: x - 4, y: y + 6 }, { x: x - 9, y: y + 9 }, { x: x - 6, y: y + 11 }, '#5f9a3a', 1);
  leaf(p, x - 4, y + 7, 5, 2.5, '#6aa844');
}

function friendlyGhost(p: Pen): void {
  const { x, y } = p.center;
  p.shadow(x, y + 1, 11, 5, 0.18);
  const top = y - 31;
  p.glow(x, top + 8, 24, '#ffffff', 0.3);
  const c = p.ctx;
  // arms
  p.ellipse(x - 12, top + 11, 3.8, 2.3, '#f1ecfa', O, 0.5);
  p.ellipse(x + 12.5, top + 6, 3.8, 2.3, '#f1ecfa', O, -0.7);
  c.beginPath();
  c.moveTo(x - 11, top);
  c.arc(x, top, 11, Math.PI, 0);
  c.lineTo(x + 11, top + 17);
  const sc = 22 / 4;
  for (let i = 0; i < 4; i++) {
    const x0 = x + 11 - i * sc;
    c.quadraticCurveTo(x0 - sc / 2, top + 22.5, x0 - sc, top + 17 + (i === 3 ? 0 : 0));
  }
  c.closePath();
  fs(p, radial(p, x, top + 4, 22, '#ffffff', '#ddd5f2'));
  for (const ex of [-4, 4]) {
    p.ellipse(x + ex, top + 1, 2.1, 3, '#3a2e3a', null);
    p.circle(x + ex - 0.6, top - 0.4, 0.8, '#ffffff', null);
  }
  p.ellipse(x - 7, top + 5.5, 2.2, 1.2, rgba('#ff9db0', 0.8), null);
  p.ellipse(x + 7, top + 5.5, 2.2, 1.2, rgba('#ff9db0', 0.8), null);
  c.beginPath();
  c.arc(x, top + 5, 2, 0.1, Math.PI - 0.1);
  fs(p, '#7a3b4a', '#3a2e3a', 0.8);
  p.ellipse(x - 5, top - 6, 3, 1.6, rgba('#ffffff', 0.9), null, -0.5);
}

function spookyTree(p: Pen): void {
  const { x, y } = p.center;
  p.shadow(x, y + 1, 20, 8);
  const bark = '#5d4a5e';
  thickCurve(p, { x: x - 1, y: y - 3 }, { x: x - 6, y: y - 1 }, { x: x - 10, y: y + 3 }, 2.4, bark);
  thickCurve(p, { x: x + 1, y: y - 3 }, { x: x + 6, y: y }, { x: x + 9, y: y + 3 }, 2.4, bark);
  thickCurve(p, { x, y }, { x: x - 6, y: y - 14 }, { x: x + 1, y: y - 28 }, 6, bark);
  // branches with curly tips
  thickCurve(p, { x: x, y: y - 26 }, { x: x - 10, y: y - 30 }, { x: x - 14, y: y - 40 }, 3, bark);
  thickCurve(p, { x: x - 14, y: y - 40 }, { x: x - 19, y: y - 46 }, { x: x - 22, y: y - 41 }, 1.6, bark);
  thickCurve(p, { x: x + 1, y: y - 27 }, { x: x + 12, y: y - 30 }, { x: x + 17, y: y - 40 }, 3, bark);
  thickCurve(p, { x: x + 17, y: y - 40 }, { x: x + 22, y: y - 46 }, { x: x + 24, y: y - 40 }, 1.6, bark);
  thickCurve(p, { x: x + 1, y: y - 28 }, { x: x - 3, y: y - 44 }, { x: x + 3, y: y - 54 }, 2.6, bark);
  thickCurve(p, { x: x + 3, y: y - 54 }, { x: x + 9, y: y - 60 }, { x: x + 10, y: y - 54 }, 1.4, bark);
  thickCurve(p, { x: x - 1, y: y - 44 }, { x: x - 8, y: y - 50 }, { x: x - 7, y: y - 57 }, 1.4, bark);
  p.curve({ x: x - 1, y: y - 4 }, { x: x - 4, y: y - 14 }, { x: x, y: y - 25 }, shade(bark, 0.3), 1);
  // hollow
  p.ellipse(x - 1.5, y - 13, 2.4, 3.4, '#2a1f2e');
  // little lantern hanging from the right branch
  const lx = x + 15;
  const ly = y - 36;
  p.line([{ x: lx, y: ly - 1 }, { x: lx, y: ly + 4 }], O, 0.9);
  p.glow(lx, ly + 9, 13, '#ffb347', 0.55);
  p.rect(lx - 2, ly + 3, 4, 1.6, '#3d3550');
  p.roundRect(lx - 3.2, ly + 4.6, 6.4, 7.5, 2, radial(p, lx, ly + 8, 6, '#fff3a0', '#ff9a2e'));
  p.rect(lx - 2.4, ly + 12, 4.8, 1.4, '#3d3550');
  bat(p, x - 13, y - 58, 3.4);
  bat(p, x + 15, y - 64, 2.8);
  // tiny pumpkin at the roots
  pumpkin(p, x + 11, y + 1, 3.6, '#f28a2e');
}

function candyCauldron(p: Pen): void {
  const { x, y } = p.center;
  p.shadow(x, y + 1, 18, 8);
  const iron = '#3a3442';
  for (const dx of [-8, 0, 8]) p.ellipse(x + dx, y - (dx === 0 ? -1 : 0.5), 2.2, 1.6, iron);
  p.ellipse(x, y - 10, 13.5, 10.5, radial(p, x, y - 10, 16, '#6c6182', iron));
  p.rect(x - 13, y - 9, 26, 3, '#f08a2e', null);
  p.ellipse(x, y - 10, 13.5, 10.5, null);
  p.ellipse(x - 5, y - 13, 1.8, 3.2, rgba('#ffffff', 0.25), null, 0.4);
  p.ellipse(x, y - 18, 12.5, 4.5, '#251f2c');
  // candy heap
  const rand = rng('cauldron');
  const cols = ['#ff6b8a', '#8f6bf0', '#4fd1c5', '#ffd23f', '#7bd36a', '#ff9a3c'];
  const pts: { x: number; y: number; k: number }[] = [];
  for (let i = 0; i < 15; i++) {
    const a = rand() * Math.PI;
    const d = Math.sqrt(rand());
    pts.push({ x: x + Math.cos(a) * d * 9.5, y: y - 18.5 - Math.sin(a) * d * 7, k: i });
  }
  pts.sort((a, b) => a.y - b.y);
  for (const q of pts) {
    if (q.k % 4 === 3) candyCorn(p, q.x, q.y, (rand() - 0.5) * 1.5);
    else wrappedCandy(p, q.x, q.y, cols[q.k % cols.length], (rand() - 0.5) * 1.6);
  }
  // lollipop sticking up
  p.line([{ x: x + 5, y: y - 21 }, { x: x + 8, y: y - 31 }], '#ffffff', 1.4);
  p.circle(x + 8.3, y - 33, 3.4, '#ff6b8a');
  p.curve({ x: x + 6.5, y: y - 33 }, { x: x + 8.3, y: y - 36 }, { x: x + 10, y: y - 33 }, '#ffffff', 1);
  const c = p.ctx;
  c.beginPath();
  c.ellipse(x, y - 18, 12.5, 4.5, 0, 0, Math.PI);
  c.strokeStyle = O;
  c.lineWidth = 4;
  c.stroke();
  c.strokeStyle = '#5c536c';
  c.lineWidth = 2.2;
  c.stroke();
  wrappedCandy(p, x + 15, y + 3, '#8f6bf0', 0.4);
  candyCorn(p, x - 15, y + 3, -0.3);
}

function witchScarecrow(p: Pen): void {
  const { x, y } = p.center;
  p.shadow(x, y + 1, 14, 6);
  const wood = '#8a5a3a';
  p.rect(x - 1.8, y - 42, 3.6, 42, hgrad(p, x - 2, x + 2, shade(wood, 0.15), shade(wood, -0.2)));
  p.rect(x - 17, y - 36, 34, 3, wood);
  const shirt = '#8a5cc2';
  // sleeves + straw hands
  for (const dir of [-1, 1]) {
    const sx = x + dir * 15;
    for (const k of [-1.5, 0, 1.5]) p.line([{ x: sx, y: y - 34.5 + k }, { x: sx + dir * 5, y: y - 34.5 + k * 1.6 }], '#e9c45e', 1.1);
    p.roundRect(dir < 0 ? x - 16 : x + 6, y - 38, 10, 6.5, 2, shirt);
  }
  // tattered skirt
  p.poly(
    [
      { x: x - 8, y: y - 22 },
      { x: x + 8, y: y - 22 },
      { x: x + 10, y: y - 12 },
      { x: x + 6.5, y: y - 14.5 },
      { x: x + 4, y: y - 11 },
      { x: x + 0.5, y: y - 14 },
      { x: x - 3, y: y - 11 },
      { x: x - 6.5, y: y - 14.5 },
      { x: x - 10, y: y - 12 },
    ],
    '#4b3a63',
  );
  for (const k of [-6, -1, 5]) p.line([{ x: x + k, y: y - 13 }, { x: x + k - 0.5, y: y - 9 }], '#e9c45e', 1);
  // body
  p.poly(
    [
      { x: x - 8.5, y: y - 38 },
      { x: x + 8.5, y: y - 38 },
      { x: x + 7.5, y: y - 21 },
      { x: x - 7.5, y: y - 21 },
    ],
    hgrad(p, x - 8.5, x + 8.5, shade(shirt, 0.15), shade(shirt, -0.15)),
  );
  p.rect(x + 1, y - 33, 4.5, 4.5, '#f08a2e', null);
  p.line([{ x: x + 1, y: y - 31 }, { x: x + 5.5, y: y - 31 }], shade('#f08a2e', -0.3), 0.6);
  p.line([{ x: x + 3, y: y - 33 }, { x: x + 3, y: y - 28.5 }], shade('#f08a2e', -0.3), 0.6);
  p.rect(x - 8, y - 24, 16, 2.2, '#c99a4a');
  // head
  const hy = y - 44;
  for (const dir of [-1, 1]) for (const k of [0, 2]) p.line([{ x: x + dir * 5, y: hy + k }, { x: x + dir * 9, y: hy + 2 + k * 1.5 }], '#e9c45e', 1.2);
  p.circle(x, hy, 7, radial(p, x, hy, 8, '#f3dcab', '#d9b77a'));
  p.circle(x - 2.6, hy - 0.5, 1.2, '#3a2e3a', null);
  p.circle(x + 2.6, hy - 0.5, 1.2, '#3a2e3a', null);
  p.ellipse(x - 4.4, hy + 2, 1.4, 0.8, rgba('#ff8f8f', 0.7), null);
  p.ellipse(x + 4.4, hy + 2, 1.4, 0.8, rgba('#ff8f8f', 0.7), null);
  p.curve({ x: x - 3, y: hy + 2.5 }, { x, y: hy + 5 }, { x: x + 3, y: hy + 2.5 }, O, 0.9);
  for (const k of [-2, 0, 2]) p.line([{ x: x + k, y: hy + 3 }, { x: x + k, y: hy + 4.6 }], O, 0.6);
  // witch hat
  const hat = '#3e3352';
  p.ellipse(x, hy - 5, 12, 3, hat);
  const c = p.ctx;
  c.beginPath();
  c.moveTo(x - 6.5, hy - 5.5);
  c.quadraticCurveTo(x - 3, hy - 14, x + 1, hy - 18);
  c.quadraticCurveTo(x + 4, hy - 21, x + 8, hy - 20);
  c.quadraticCurveTo(x + 4, hy - 16, x + 6.5, hy - 5.5);
  c.closePath();
  fs(p, hgrad(p, x - 7, x + 7, shade(hat, 0.2), shade(hat, -0.1)));
  p.poly(
    [
      { x: x - 6.3, y: hy - 6 },
      { x: x + 6.3, y: hy - 6 },
      { x: x + 5.6, y: hy - 9 },
      { x: x - 5.4, y: hy - 9 },
    ],
    '#f08a2e',
  );
  p.rect(x - 1.5, hy - 8.8, 3, 2.6, GOLD);
  p.star(x + 8.5, hy - 20, 2, GOLD);
}

function blackCat(p: Pen): void {
  const { x, y } = p.center;
  p.shadow(x, y + 1, 17, 8);
  boxAt(p, x, y, 0.5, 0.5, 6, '#a294b8');
  const b = y - 6;
  const fur = '#2e2a3a';
  thickCurve(p, { x: x + 5, y: b - 2 }, { x: x + 17, y: b - 3 }, { x: x + 13, y: b - 17 }, 2.6, fur);
  p.ellipse(x, b - 9, 8.5, 9, radial(p, x, b - 9, 11, '#544c66', fur));
  p.ellipse(x - 3, b - 1.2, 2.6, 1.8, fur);
  p.ellipse(x + 3, b - 1.2, 2.6, 1.8, fur);
  // collar + bell
  p.curve({ x: x - 6, y: b - 16 }, { x, y: b - 13 }, { x: x + 6, y: b - 16 }, O, 3.4);
  p.curve({ x: x - 6, y: b - 16 }, { x, y: b - 13 }, { x: x + 6, y: b - 16 }, '#f08a2e', 2);
  // head
  const hy = b - 22;
  for (const dir of [-1, 1]) {
    p.poly(
      [
        { x: x + dir * 8, y: hy - 2 },
        { x: x + dir * 6.5, y: hy - 12 },
        { x: x + dir * 1.5, y: hy - 7 },
      ],
      fur,
    );
    p.poly(
      [
        { x: x + dir * 6.5, y: hy - 4 },
        { x: x + dir * 6, y: hy - 9.5 },
        { x: x + dir * 3, y: hy - 6.5 },
      ],
      '#ff9db0',
      null,
    );
  }
  p.ellipse(x, hy, 8.5, 7.5, radial(p, x, hy, 10, '#544c66', fur));
  p.ball(x, b - 13.5, 1.8, GOLD);
  for (const dir of [-1, 1]) {
    const ex = x + dir * 3.6;
    p.ellipse(ex, hy - 0.5, 2.7, 3.2, '#ffd84a', null);
    p.ellipse(ex, hy - 0.3, 1, 2.4, '#1c1824', null);
    p.circle(ex - 0.8, hy - 1.6, 0.8, '#ffffff', null);
    p.line([{ x: x + dir * 5, y: hy + 3 }, { x: x + dir * 10, y: hy + 2 }], '#bdb3cc', 0.6);
    p.line([{ x: x + dir * 5, y: hy + 4 }, { x: x + dir * 10, y: hy + 4.5 }], '#bdb3cc', 0.6);
  }
  p.poly(
    [
      { x: x - 1, y: hy + 2.6 },
      { x: x + 1, y: hy + 2.6 },
      { x, y: hy + 3.6 },
    ],
    '#ff9db0',
    null,
  );
  p.curve({ x: x - 1.6, y: hy + 4.4 }, { x: x - 0.8, y: hy + 5.4 }, { x, y: hy + 4.2 }, '#bdb3cc', 0.6);
  p.curve({ x, y: hy + 4.2 }, { x: x + 0.8, y: hy + 5.4 }, { x: x + 1.6, y: hy + 4.4 }, '#bdb3cc', 0.6);
  p.ellipse(x - 5.5, hy + 2.5, 1.4, 0.8, rgba('#ff9db0', 0.5), null);
  p.ellipse(x + 5.5, hy + 2.5, 1.4, 0.8, rgba('#ff9db0', 0.5), null);
}

// ---------------------------------------------------------------------------
// Festival of Lights

function diya(p: Pen, x: number, y: number): void {
  const clay = '#d0683a';
  const c = p.ctx;
  c.beginPath();
  c.moveTo(x - 6, y - 4);
  c.quadraticCurveTo(x - 5, y + 1.5, x, y + 1.5);
  c.quadraticCurveTo(x + 5, y + 1.5, x + 6.5, y - 3);
  c.lineTo(x + 9, y - 5.5);
  c.lineTo(x + 5.5, y - 5);
  c.closePath();
  fs(p, hgrad(p, x - 6, x + 8, shade(clay, 0.2), shade(clay, -0.15)));
  p.ellipse(x, y - 4, 6, 2.2, shade(clay, 0.2));
  p.ellipse(x, y - 3.8, 4.3, 1.4, '#e8b23c', null);
  for (const dx of [-3.5, 0, 3.5]) p.circle(x + dx, y - 1, 0.7, dx === 0 ? '#fff2a0' : '#ffffff', null);
  flame(p, x + 7.5, y - 5.5, 2.1, false);
}

function diyaLamps(p: Pen): void {
  const { x, y } = p.center;
  p.glow(x, y - 4, 32, '#ffb347', 0.32);
  const rand = rng('petals');
  for (let i = 0; i < 26; i++) {
    const a = rand() * TAU;
    const d = 8 + rand() * 16;
    p.circle(x + Math.cos(a) * d, y + Math.sin(a) * d * 0.45, 1.2, i % 3 ? '#ffa31a' : '#ffd23f', null);
  }
  const pos: [number, number][] = [
    [-20, -2],
    [-7, 1],
    [6, -1],
    [19, 2],
  ];
  for (const [dx, dy] of pos) p.shadow(x + dx, y + dy + 1, 7, 3);
  for (const [dx, dy] of pos) diya(p, x + dx - 1, y + dy);
  for (const [dx, dy] of pos) p.glow(x + dx + 6.5, y + dy - 8, 9, '#ffcf5a', 0.45);
}

function rangoli(p: Pen): void {
  const { x, y } = p.center;
  const c = p.ctx;
  c.save();
  c.translate(x, y);
  c.scale(1, 0.5);
  p.circle(0, 0, 21.5, rgba('#fff4e0', 0.45), null);
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * TAU;
    p.circle(Math.cos(a) * 20.6, Math.sin(a) * 20.6, 1.3, i % 2 ? '#ffffff' : '#ffd23f', null);
  }
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * TAU;
    p.ellipse(Math.cos(a) * 14.5, Math.sin(a) * 14.5, 5.4, 2.9, i % 2 ? '#ff8c1a' : '#e83e8c', O, a);
    p.ellipse(Math.cos(a) * 15, Math.sin(a) * 15, 2.4, 1, rgba('#ffffff', 0.7), null, a);
  }
  p.circle(0, 0, 10, '#ffd23f');
  for (let i = 0; i < 8; i++) {
    const a = ((i + 0.5) / 8) * TAU;
    p.ellipse(Math.cos(a) * 6, Math.sin(a) * 6, 3.6, 1.9, '#20b2a6', O, a);
  }
  for (let i = 0; i < 12; i++) {
    const a = ((i + 0.5) / 12) * TAU;
    p.circle(Math.cos(a) * 9, Math.sin(a) * 9, 0.8, '#ffffff', null);
  }
  p.circle(0, 0, 3.4, '#7b4bc4');
  p.circle(0, 0, 1.3, '#ffffff', null);
  c.restore();
}

function skyLantern(p: Pen): void {
  const { x, y } = p.center;
  const px = x + 9;
  p.shadow(px, y + 1, 8, 4);
  post(p, px, y + 1, 20, WOOD, 3);
  p.circle(px, y - 20, 1.6, GOLD);
  const lx = x - 3;
  const by = y - 42;
  p.curve({ x: px, y: y - 20 }, { x: px + 6, y: y - 34 }, { x: lx, y: by }, O, 0.8);
  p.glow(lx, by - 10, 28, '#ffc35a', 0.5);
  const c = p.ctx;
  c.beginPath();
  c.moveTo(lx - 5.5, by);
  c.lineTo(lx - 8, by - 17);
  c.quadraticCurveTo(lx, by - 25, lx + 8, by - 17);
  c.lineTo(lx + 5.5, by);
  c.quadraticCurveTo(lx, by + 1.6, lx - 5.5, by);
  c.closePath();
  const g = c.createRadialGradient(lx, by - 6, 1, lx, by - 10, 14);
  g.addColorStop(0, '#fff7c2');
  g.addColorStop(0.6, '#ffc35a');
  g.addColorStop(1, '#ff8c2e');
  fs(p, g);
  for (const k of [-0.5, 0, 0.5]) {
    p.curve({ x: lx + k * 11, y: by - 18 }, { x: lx + k * 12, y: by - 9 }, { x: lx + k * 7.6, y: by }, rgba('#d0602f', 0.5), 0.8);
  }
  p.heart(lx, by - 11, 2.4, rgba('#e5344f', 0.6), null);
  p.ellipse(lx, by, 5.5, 1.5, '#7a3b1e');
  flame(p, lx, by + 0.5, 1.4, false);
  sparkle(p, lx - 13, by - 18, 2.4);
  sparkle(p, lx + 13, by - 4, 2);
}

function marigoldGarland(p: Pen): void {
  const { x, y } = p.center;
  const [a, c, b] = arch(p, x, y, 23, 38, 15, '#9a6a42', 2, '#7a4b2e');
  // marigold wraps on the posts
  for (const sx of [-23, 23]) {
    for (let k = 0; k < 9; k++) p.ball(x + sx + (k % 2 ? 1.6 : -1.6), y - 3 - k * 4.2, 2.3, k % 2 ? '#ffd23f' : '#ff9f1c');
  }
  // hanging strands
  for (let s = 1; s <= 5; s++) {
    const t = s / 6;
    const q = qpt(a, c, b, t);
    const len = 2 + (s % 2 ? 0 : 1) + (s === 3 ? 1 : 0);
    p.line([q, { x: q.x, y: q.y + len * 4 }], '#5f9a3a', 0.8);
    for (let k = 0; k < len; k++) p.ball(q.x, q.y + 3 + k * 4, 1.9, (k + s) % 2 ? '#ffd23f' : '#ff9f1c');
    leaf(p, q.x, q.y + 3 + len * 4, 3.5, Math.PI / 2, LEAF);
  }
  // swag of marigolds along the arch
  for (let i = 0; i <= 18; i++) {
    const q = qpt(a, c, b, i / 18);
    p.ball(q.x, q.y, 2.6, i % 2 ? '#ffd23f' : '#ff9f1c');
  }
  // mango leaves on top + bell
  for (let i = 1; i < 8; i++) {
    const q = qpt(a, c, b, i / 8);
    leaf(p, q.x, q.y - 2, 5, -Math.PI / 2 + (i - 4) * 0.15, '#4f9e45');
  }
  const top = qpt(a, c, b, 0.5);
  p.glow(top.x, top.y - 6, 10, '#ffe27a', 0.5);
  p.circle(top.x, top.y - 5, 3, '#ff6b2e');
  p.flower(top.x, top.y - 5, 3.4, '#ff9f1c', '#e8443c');
}

// ---------------------------------------------------------------------------
// Winter holidays

function pineTier(p: Pen, x: number, top: number, bottom: number, hw: number, color: string): void {
  const c = p.ctx;
  const mid = (top + bottom) / 2;
  c.beginPath();
  c.moveTo(x, top);
  c.quadraticCurveTo(x + hw * 0.45, mid, x + hw, bottom);
  const n = 4;
  for (let i = 0; i < n; i++) {
    const xa = x + hw - (i * 2 * hw) / n;
    const xb = x + hw - ((i + 1) * 2 * hw) / n;
    c.quadraticCurveTo((xa + xb) / 2, bottom + 4, xb, bottom);
  }
  c.quadraticCurveTo(x - hw * 0.45, mid, x, top);
  c.closePath();
  fs(p, hgrad(p, x - hw, x + hw, shade(color, 0.15), shade(color, -0.2)));
}

function decoratedPine(p: Pen): void {
  const { x, y } = p.center;
  p.shadow(x, y + 1, 22, 9);
  p.rect(x - 3, y - 8, 6, 8, '#7a4f33');
  const g = '#3f9a55';
  const tiers: [number, number, number][] = [
    [y - 38, y - 8, 22],
    [y - 54, y - 26, 17],
    [y - 68, y - 42, 12],
  ];
  const balls = ['#e5484d', '#ffd23f', '#4dabf7', '#ff8fc0'];
  const rand = rng('pine');
  tiers.forEach(([t, b, hw], ti) => {
    pineTier(p, x, t, b, hw, g);
    // garland swag
    const l = { x: x - hw * 0.72, y: b - (b - t) * 0.42 };
    const r = { x: x + hw * 0.72, y: b - (b - t) * 0.22 };
    p.curve(l, { x, y: (l.y + r.y) / 2 + 6 }, r, '#fff1b0', 1.4);
    // ornaments along the hem
    const n = 3 + (2 - ti);
    for (let i = 0; i < n; i++) {
      const ox = x - hw * 0.8 + (i + 0.5) * ((hw * 1.6) / n);
      p.ball(ox, b - 1 + (i % 2) * 1.5, 2.5, balls[(i + ti) % balls.length]);
    }
    // twinkle lights
    for (let i = 0; i < 3; i++) {
      const lx = x + (rand() - 0.5) * hw * 1.1;
      const ly = t + (b - t) * (0.45 + rand() * 0.3);
      p.glow(lx, ly, 4, '#fff3a0', 0.8);
      p.circle(lx, ly, 0.9, '#fffbe0', null);
    }
  });
  p.glow(x, y - 70, 14, '#fff3a0', 0.7);
  p.star(x, y - 70, 6.5, radial(p, x, y - 70, 7, '#fff7b0', GOLD));
}

function snowball(p: Pen, x: number, y: number, r: number): void {
  p.circle(x, y, r, radial(p, x, y, r * 1.2, '#ffffff', '#cfdff0'));
}

function snowman(p: Pen): void {
  const { x, y } = p.center;
  p.ellipse(x, y, 19, 8.5, SNOW, '#b7c9dc');
  p.shadow(x + 2, y + 1, 12, 5, 0.15);
  // arms
  thick(p, [{ x: x - 6, y: y - 25 }, { x: x - 17, y: y - 33 }], 1.2, '#7a4f33');
  thick(p, [{ x: x + 6, y: y - 25 }, { x: x + 17, y: y - 31 }], 1.2, '#7a4f33');
  p.line([{ x: x - 13, y: y - 30 }, { x: x - 14, y: y - 35 }], '#7a4f33', 1);
  p.circle(x - 17.5, y - 33.5, 2.3, '#e5484d');
  p.circle(x + 17.5, y - 31.5, 2.3, '#e5484d');
  snowball(p, x, y - 9, 11);
  snowball(p, x, y - 24, 8);
  for (const k of [-26, -21]) p.circle(x, y + k, 1, '#3a3442', null);
  snowball(p, x, y - 37, 7);
  // face
  p.circle(x - 2.4, y - 37.2, 0.95, '#3a3442', null);
  p.circle(x + 2.4, y - 37.2, 0.95, '#3a3442', null);
  p.poly(
    [
      { x: x - 0.2, y: y - 36 },
      { x: x + 6, y: y - 34.6 },
      { x: x - 0.2, y: y - 34.4 },
    ],
    '#ff8c2e',
  );
  for (const k of [-1.5, -0.5, 0.5, 1.5]) p.circle(x + k * 1.5, y - 32.6 - Math.abs(k) * 0.4, 0.5, '#3a3442', null);
  p.ellipse(x - 4.4, y - 35, 1.4, 0.8, rgba('#ff8fa3', 0.7), null);
  p.ellipse(x + 4.4, y - 35, 1.4, 0.8, rgba('#ff8fa3', 0.7), null);
  // scarf
  const red = '#e5484d';
  p.roundRect(x - 7, y - 31.5, 14, 4, 2, red);
  p.poly(
    [
      { x: x + 2, y: y - 29 },
      { x: x + 6, y: y - 29 },
      { x: x + 7, y: y - 20 },
      { x: x + 3, y: y - 20.5 },
    ],
    shade(red, -0.08),
  );
  for (const k of [-4, 0, 4]) p.line([{ x: x + k, y: y - 31 }, { x: x + k, y: y - 28 }], '#ffffff', 1);
  p.line([{ x: x + 3.3, y: y - 23 }, { x: x + 6.6, y: y - 23.2 }], '#ffffff', 1);
  // beanie
  const hat = '#3fa66b';
  const c = p.ctx;
  c.beginPath();
  c.arc(x, y - 41.5, 6.6, Math.PI, 0);
  c.closePath();
  fs(p, hgrad(p, x - 6, x + 6, shade(hat, 0.15), shade(hat, -0.15)));
  p.roundRect(x - 7.3, y - 42.5, 14.6, 3, 1.5, '#ffffff');
  p.circle(x, y - 48.5, 2.6, '#ffffff');
}

function giftPile(p: Pen): void {
  const { x, y } = p.center;
  p.shadow(x, y + 2, 22, 9);
  gift(p, x + 5, y - 4, 0.46, 0.46, 15, '#e5484d', GOLD);
  gift(p, x + 5, y - 4, 0.24, 0.24, 8, '#4dabf7', '#ffffff', 15);
  gift(p, x - 11, y - 1, 0.34, 0.34, 10, '#3fa66b', '#e5484d');
  gift(p, x + 14, y + 4, 0.22, 0.24, 6, '#ff8fc0', '#ffffff');
  gift(p, x - 1, y + 6, 0.32, 0.28, 8, '#ffd23f', '#a678f0');
}

function candyCane(p: Pen): void {
  const { x, y } = p.center;
  p.shadow(x, y + 1, 12, 5);
  p.ellipse(x, y, 11, 4.8, SNOW, '#b7c9dc');
  const c = p.ctx;
  const path = () => {
    c.beginPath();
    c.moveTo(x + 4, y - 1);
    c.lineTo(x + 4, y - 46);
    c.arc(x - 3, y - 46, 7, 0, Math.PI, true);
    c.lineTo(x - 10, y - 41);
  };
  c.save();
  c.lineCap = 'round';
  path();
  c.strokeStyle = O;
  c.lineWidth = 7.5;
  c.stroke();
  path();
  c.strokeStyle = '#fffaf5';
  c.lineWidth = 5.5;
  c.stroke();
  c.lineCap = 'butt';
  c.setLineDash([3, 3]);
  path();
  c.strokeStyle = '#e5344f';
  c.lineWidth = 5.5;
  c.stroke();
  c.setLineDash([]);
  c.restore();
  p.line([{ x: x + 2.6, y: y - 3 }, { x: x + 2.6, y: y - 44 }], rgba('#ffffff', 0.55), 1);
  // bow with holly
  const by = y - 30;
  p.ellipse(x + 0.5, by, 3.6, 2.2, '#3fa66b', O, -0.4);
  p.ellipse(x + 7.5, by, 3.6, 2.2, '#3fa66b', O, 0.4);
  p.line([{ x: x + 3, y: by + 1 }, { x: x + 1, y: by + 7 }], '#3fa66b', 1.6);
  p.line([{ x: x + 5, y: by + 1 }, { x: x + 7, y: by + 6 }], '#3fa66b', 1.6);
  p.circle(x + 3.4, by - 0.2, 1.4, '#e5344f');
  p.circle(x + 5, by + 0.6, 1.4, '#e5344f');
}

function sleigh(p: Pen): void {
  const c = p.center;
  p.shadow(c.x, c.y + 2, 40, 14);
  const red = '#d9363e';
  const body = () => {
    const cx = p.ctx;
    cx.beginPath();
    cx.moveTo(12, -6);
    cx.quadraticCurveTo(5, -16, 7, -27);
    cx.quadraticCurveTo(11, -32, 16, -27);
    cx.quadraticCurveTo(21, -18, 30, -17);
    cx.lineTo(42, -17);
    cx.quadraticCurveTo(50, -18, 52, -26);
    cx.quadraticCurveTo(54, -32, 48.5, -31);
    cx.quadraticCurveTo(45, -29, 47.5, -26);
    cx.quadraticCurveTo(48, -11, 40, -6);
    cx.closePath();
  };
  const runner = (col: string) => {
    const cx = p.ctx;
    const path = () => {
      cx.beginPath();
      cx.moveTo(6, -1);
      cx.lineTo(50, -1);
      cx.quadraticCurveTo(60, -1, 60, -9);
      cx.quadraticCurveTo(60, -14, 56, -13);
      cx.quadraticCurveTo(53, -11, 56.5, -9);
    };
    path();
    cx.strokeStyle = O;
    cx.lineWidth = 3.4;
    cx.stroke();
    path();
    cx.strokeStyle = col;
    cx.lineWidth = 1.8;
    cx.stroke();
    for (const s of [16, 36]) thick(p, [{ x: s, y: -1.5 }, { x: s, y: -6.5 }], 1.2, col);
  };
  onFace(p, p.iso(0, 0.34), 0.5, () => runner(shade(GOLD, -0.2)));
  onFace(p, p.iso(0, 0.34), 0.5, () => {
    body();
    fs(p, shade(red, -0.3));
  });
  for (let v = 0.36; v < 0.66; v += 0.02) {
    onFace(p, p.iso(0, v), 0.5, () => {
      body();
      fs(p, shade(red, -0.38), null);
    });
  }
  // gifts riding inside
  const g1 = p.iso(0.95, 0.5);
  gift(p, g1.x, g1.y, 0.38, 0.28, 18, '#3fa66b', '#e5484d', 4);
  const g2 = p.iso(1.3, 0.5);
  gift(p, g2.x, g2.y, 0.26, 0.26, 15, '#4dabf7', '#ffffff', 4);
  gift(p, g1.x, g1.y, 0.22, 0.2, 6, '#ffd23f', '#a678f0', 22);
  // front side
  onFace(p, p.iso(0, 0.66), 0.5, () => {
    body();
    fs(p, p.vgrad(-32, -6, shade(red, 0.15), shade(red, -0.1)));
    const cx = p.ctx;
    cx.beginPath();
    cx.moveTo(7, -27);
    cx.quadraticCurveTo(11, -32, 16, -27);
    cx.quadraticCurveTo(21, -18, 30, -17);
    cx.lineTo(42, -17);
    cx.quadraticCurveTo(50, -18, 52, -26);
    cx.strokeStyle = GOLD;
    cx.lineWidth = 1.3;
    cx.stroke();
    p.curve({ x: 18, y: -11 }, { x: 27, y: -15 }, { x: 36, y: -11 }, GOLD, 1.2);
    p.circle(27, -11, 1.8, GOLD);
    runner(GOLD);
  });
}

function menorah(p: Pen): void {
  const { x, y } = p.center;
  p.glow(x, y - 30, 32, '#ffcf5a', 0.22);
  p.shadow(x, y + 1, 16, 7);
  boxAt(p, x, y, 0.42, 0.42, 4, '#9a8f86');
  const brass = '#e0b545';
  p.ellipse(x, y - 5, 6, 2.4, shade(brass, -0.1));
  const ay = y - 22;
  const sp = 4.6;
  const c = p.ctx;
  for (let k = 4; k >= 1; k--) {
    c.beginPath();
    c.arc(x, ay, k * sp, 0, Math.PI, false);
    c.strokeStyle = O;
    c.lineWidth = 3.4;
    c.stroke();
    c.strokeStyle = brass;
    c.lineWidth = 1.6;
    c.stroke();
  }
  p.rect(x - 1.5, y - 35, 3, 30, hgrad(p, x - 1.5, x + 1.5, shade(brass, 0.25), shade(brass, -0.2)));
  const candles: { x: number; base: number; tall: number; col: string }[] = [];
  for (let k = -4; k <= 4; k++) {
    if (k === 0) continue;
    candles.push({ x: x + k * sp, base: ay - 1.5, tall: 7, col: Math.abs(k) % 2 ? '#7fb6ff' : '#ffffff' });
  }
  candles.push({ x, base: y - 36.5, tall: 8, col: '#ffffff' });
  for (const cd of candles) {
    p.rect(cd.x - 2.2, cd.base, 4.4, 1.8, brass);
    p.rect(cd.x - 1.2, cd.base - cd.tall, 2.4, cd.tall, cd.col);
  }
  for (const cd of candles) {
    const fy = cd.base - cd.tall;
    p.glow(cd.x, fy - 2.5, 7, '#ffcf5a', 0.55);
    flame(p, cd.x, fy, 1.5, false);
  }
}

function gingerbreadHouse(p: Pen): void {
  const c = p.center;
  p.shadow(c.x, c.y + 2, 26, 11);
  const ginger = '#c27a42';
  const u0 = 0.22;
  const v0 = 0.25;
  const du = 0.56;
  const dv = 0.5;
  const ht = 18;
  p.box(u0, v0, du, dv, ht, ginger);
  const icing = '#ffffff';
  const squiggle = (w: number, yy: number) => {
    const pts: Pt[] = [];
    for (let i = 0; i <= 12; i++) pts.push({ x: (i / 12) * w, y: yy + (i % 2 ? 1.2 : 0) });
    p.line(pts, icing, 1.2);
  };
  // long side: windows
  onFace(p, p.iso(u0, v0 + dv), 0.5, () => {
    squiggle(du * 32, -16);
    p.glow(9, -9, 7, '#ffd25a', 0.5);
    p.roundRect(5.5, -12.5, 7, 6.5, 1, '#ffe48a', icing);
    p.line([{ x: 9, y: -12.5 }, { x: 9, y: -6 }], icing, 1);
    p.line([{ x: 5.5, y: -9.3 }, { x: 12.5, y: -9.3 }], icing, 1);
    p.circle(15, -4, 1.4, '#e5484d', null);
    p.circle(3, -4, 1.4, '#3fa66b', null);
  });
  // gable end: door + round window
  onFace(p, p.iso(u0 + du, v0 + dv), -0.5, () => {
    squiggle(dv * 32, -16);
    p.roundRect(5, -11, 6, 11, 2.5, '#6b3b22', icing);
    p.circle(9.6, -5.5, 0.6, GOLD, null);
    for (const sx of [2.6, 13.4]) {
      p.line([{ x: sx, y: 0 }, { x: sx, y: -7 }], O, 2.6);
      p.line([{ x: sx, y: 0 }, { x: sx, y: -7 }], '#ffffff', 1.4);
      p.ctx.setLineDash([1.2, 1.2]);
      p.line([{ x: sx, y: 0 }, { x: sx, y: -7 }], '#e5344f', 1.4);
      p.ctx.setLineDash([]);
    }
  });
  p.gableRoof(u0, v0, du, dv, ht, 14, '#fff8f4', ginger);
  onFace(p, p.iso(u0 + du, v0 + dv), -0.5, () => {
    p.circle(8, -24, 2.6, '#ffe48a', icing);
  });
  // icing drips along the eaves
  const o = 0.1;
  const ev: Pt[] = [];
  for (let i = 0; i <= 10; i++) ev.push(p.iso(u0 - o + ((du + 2 * o) * i) / 10, v0 + dv + o, ht));
  for (let i = 0; i < 10; i++) {
    const a = ev[i];
    const b = ev[i + 1];
    p.ellipse((a.x + b.x) / 2, (a.y + b.y) / 2 + 1, 2.4, 1.8, icing, '#d9cfe0');
  }
  // gumdrops + peppermints on the roof
  const cols = ['#e5484d', '#3fa66b', '#ffd23f', '#4dabf7', '#ff8fc0'];
  let i = 0;
  for (const t of [0.3, 0.65]) {
    for (const u of [0.3, 0.5, 0.7]) {
      const q = p.iso(u0 + du * u - 0.04, v0 + dv + o - (dv / 2 + o) * t, ht + 14 * t);
      if ((i + (t > 0.5 ? 1 : 0)) % 2) {
        p.circle(q.x, q.y, 2.2, '#ffffff');
        p.arc(q.x, q.y, 2.2, 0, Math.PI / 2, '#e5344f', null);
        p.arc(q.x, q.y, 2.2, Math.PI, Math.PI * 1.5, '#e5344f', null);
        p.circle(q.x, q.y, 2.2, null);
      } else {
        p.ellipse(q.x, q.y, 2.2, 1.9, cols[i % cols.length]);
        p.circle(q.x - 0.7, q.y - 0.6, 0.6, rgba('#ffffff', 0.8), null);
      }
      i++;
    }
  }
  // chimney
  const ch = p.iso(u0 + du * 0.3, v0 + dv * 0.3, ht + 9);
  p.rect(ch.x - 2.5, ch.y - 7, 5, 9, ginger);
  p.rect(ch.x - 3.2, ch.y - 8.5, 6.4, 2.2, icing);
}

function snowGlobe(p: Pen): void {
  const { x, y } = p.center;
  p.shadow(x, y + 1, 17, 7);
  p.cylinder(x, y - 1, 13, 9, '#c0392b');
  const c = p.ctx;
  c.beginPath();
  c.ellipse(x, y - 4, 13, 6.5, 0, 0, Math.PI);
  c.strokeStyle = GOLD;
  c.lineWidth = 1.4;
  c.stroke();
  p.roundRect(x - 4, y - 3, 8, 3.4, 1, GOLD);
  const cy = y - 24;
  const R = 15;
  c.save();
  c.beginPath();
  c.arc(x, cy, R, 0, TAU);
  c.clip();
  p.rect(x - R, cy - R, R * 2, R * 2, p.vgrad(cy - R, cy + R, '#d8efff', '#a8d6f5'), null);
  p.ellipse(x, cy + 11, 16, 6, SNOW, '#b7c9dc');
  // tiny pine
  const tx = x - 5;
  const tyy = cy + 8;
  p.rect(tx - 0.8, tyy - 2, 1.6, 3, '#7a4f33', null);
  p.poly(
    [
      { x: tx, y: tyy - 14 },
      { x: tx + 5, y: tyy - 2 },
      { x: tx - 5, y: tyy - 2 },
    ],
    '#3f9a55',
  );
  p.star(tx, tyy - 14, 1.6, GOLD, null);
  // tiny house
  const hx = x + 5;
  const hy = cy + 9;
  p.rect(hx - 3.5, hy - 5, 7, 5, '#e5484d');
  p.poly(
    [
      { x: hx - 5, y: hy - 5 },
      { x: hx, y: hy - 9.5 },
      { x: hx + 5, y: hy - 5 },
    ],
    '#ffffff',
  );
  p.rect(hx - 1, hy - 3, 2, 3, '#ffe48a', null);
  const rand = rng('globe');
  for (let i = 0; i < 22; i++) p.circle(x - R + rand() * R * 2, cy - R + rand() * R * 1.6, 0.5 + rand() * 0.6, '#ffffff', null);
  c.restore();
  p.circle(x, cy, R, rgba('#ffffff', 0.08));
  c.beginPath();
  c.arc(x, cy, R - 3, Math.PI * 1.1, Math.PI * 1.45);
  c.strokeStyle = rgba('#ffffff', 0.85);
  c.lineWidth = 1.8;
  c.stroke();
  p.circle(x + 7, cy - 9, 1.3, rgba('#ffffff', 0.85), null);
}

// ---------------------------------------------------------------------------
// New Year

function partyLanterns(p: Pen): void {
  const { x, y } = p.center;
  p.shadow(x, y + 1, 18, 8);
  const navy = '#4b3f72';
  boxAt(p, x, y, 0.26, 0.26, 4, '#b9aea0');
  post(p, x, y - 3, 50, navy, 3.6);
  const top = y - 50;
  thickCurve(p, { x, y: top + 2 }, { x: x - 14, y: top - 2 }, { x: x - 19, y: top + 5 }, 1.6, navy);
  thickCurve(p, { x, y: top + 2 }, { x: x + 14, y: top - 2 }, { x: x + 19, y: top + 5 }, 1.6, navy);
  p.circle(x - 19, top + 6, 1.6, GOLD);
  p.circle(x + 19, top + 6, 1.6, GOLD);
  p.glow(x, top - 6, 10, '#fff3a0', 0.6);
  p.star(x, top - 6, 4.8, GOLD);
  globeLantern(p, x - 18, top + 7, 5, '#a66bf0');
  globeLantern(p, x + 18, top + 7, 5, '#4fd1c5');
  globeLantern(p, x - 9, top + 2, 4.4, '#ffcc4d');
  globeLantern(p, x + 9, top + 2, 4.4, '#ff7fbf');
  // ribbon bow on the post
  p.ellipse(x - 3, top + 16, 3, 1.8, '#ff7fbf', O, -0.4);
  p.ellipse(x + 3, top + 16, 3, 1.8, '#ff7fbf', O, 0.4);
  p.circle(x, top + 16, 1.3, '#e85a9c');
}

function countdownClock(p: Pen): void {
  const { x, y } = p.center;
  p.shadow(x, y + 1, 14, 6);
  const plum = '#5b4a8a';
  boxAt(p, x, y, 0.3, 0.3, 5, '#7a6a9e');
  post(p, x, y - 4, 44, plum, 4);
  for (const k of [12, 30]) p.rect(x - 2.6, y - 4 - k, 5.2, 2, GOLD);
  const cy = y - 58;
  const R = 12;
  p.circle(x, cy, R + 2, radial(p, x, cy, R + 3, '#ffe28a', '#d9a32a'));
  p.circle(x, cy, R, '#fffaf0');
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * TAU;
    const r0 = i % 3 === 0 ? R - 3 : R - 2;
    p.line(
      [
        { x: x + Math.cos(a) * r0, y: cy + Math.sin(a) * r0 },
        { x: x + Math.cos(a) * (R - 0.8), y: cy + Math.sin(a) * (R - 0.8) },
      ],
      i === 9 ? '#e5344f' : '#7a6a9e',
      i % 3 === 0 ? 1.3 : 0.8,
    );
  }
  p.line([{ x, y: cy }, { x: x - 0.6, y: cy - 6 }], O, 1.8);
  p.line([{ x, y: cy }, { x: x - 1.2, y: cy - 9.5 }], O, 1.1);
  p.circle(x, cy, 1.3, '#e5344f', null);
  // party hat
  const hy = cy - R - 1;
  p.poly(
    [
      { x: x - 5, y: hy + 1 },
      { x: x + 5, y: hy + 1 },
      { x: x + 2, y: hy - 12 },
    ],
    '#ff7fbf',
  );
  p.line([{ x: x - 3, y: hy - 3 }, { x: x + 3.6, y: hy - 4.5 }], '#ffd23f', 1.3);
  p.line([{ x: x - 1, y: hy - 8 }, { x: x + 2.6, y: hy - 8.8 }], '#ffd23f', 1.3);
  p.circle(x + 2, hy - 13, 2, '#ffd23f');
  // confetti specks
  const rand = rng('clock');
  const cols = ['#ff7fbf', '#4fd1c5', '#ffcc4d', '#a66bf0'];
  for (let i = 0; i < 10; i++) {
    const a = rand() * TAU;
    const d = R + 5 + rand() * 7;
    p.rect(x + Math.cos(a) * d, cy + Math.sin(a) * d, 1.8, 1.2, cols[i % cols.length], null);
  }
}

function confettiCannon(p: Pen): void {
  const { x, y } = p.center;
  p.shadow(x, y + 1, 18, 8);
  const rand = rng('cannon');
  const ang = -0.65;
  const piv = { x: x - 3, y: y - 10 };
  const mz = { x: piv.x + Math.cos(ang) * 15, y: piv.y + Math.sin(ang) * 15 };
  // back wheel
  p.circle(x + 4, y - 5, 5, '#6b4a8a');
  boxAt(p, x - 2, y, 0.42, 0.26, 6, '#a678f0');
  // barrel
  withXform(p, piv.x, piv.y, ang, () => {
    p.roundRect(-8, -5, 22, 10, 4, p.vgrad(-5, 5, '#b49cff', '#6c4bd0'));
    for (const s of [-2, 5]) p.rect(s, -5, 2.2, 10, GOLD);
    p.star(10, 0, 2.2, '#ffffff', null);
    p.ellipse(14, 0, 2.4, 5.6, '#ffd23f');
    p.ellipse(14.4, 0, 1.4, 3.8, '#3d3550');
  });
  // front wheel
  const wx = x - 6;
  const wy = y - 4;
  p.circle(wx, wy, 6, '#ffd23f');
  p.circle(wx, wy, 4, null, shade('#ffd23f', -0.4));
  for (let k = 0; k < 3; k++) {
    const a = (k / 3) * Math.PI;
    p.line(
      [
        { x: wx + Math.cos(a) * 4, y: wy + Math.sin(a) * 4 },
        { x: wx - Math.cos(a) * 4, y: wy - Math.sin(a) * 4 },
      ],
      shade('#ffd23f', -0.4),
      1,
    );
  }
  p.circle(wx, wy, 1.5, '#e5344f');
  // confetti burst
  const cols = ['#ff7fbf', '#4fd1c5', '#ffcc4d', '#a66bf0', '#7bd36a', '#ff9a3c'];
  for (let i = 0; i < 6; i++) {
    const a = -1.75 + rand() * 1.2;
    const d = 12 + rand() * 12;
    const e = { x: mz.x + Math.cos(a) * d, y: mz.y + Math.sin(a) * d };
    p.curve({ x: mz.x + Math.cos(a) * 4, y: mz.y + Math.sin(a) * 4 }, { x: (mz.x + e.x) / 2 + 3, y: (mz.y + e.y) / 2 - 2 }, e, cols[i % cols.length], 1.2);
  }
  for (let i = 0; i < 30; i++) {
    const a = -1.9 + rand() * 1.4;
    const d = 5 + rand() * 20;
    const q = { x: mz.x + Math.cos(a) * d, y: mz.y + Math.sin(a) * d };
    withXform(p, q.x, q.y, rand() * TAU, () => p.rect(-1.2, -0.8, 2.4, 1.6, cols[i % cols.length], null));
  }
  sparkle(p, mz.x + 4, mz.y - 22, 3);
  sparkle(p, mz.x - 12, mz.y - 16, 2.4);
  // ground confetti
  for (let i = 0; i < 8; i++) p.rect(x - 14 + rand() * 30, y + 1 + rand() * 6, 2, 1.3, cols[i % cols.length], null);
}

// ---------------------------------------------------------------------------
// Table

const ART: Record<string, { h: number; paint: Painter }> = {
  // Lunar New Year
  red_lanterns: { h: 50, paint: redLanternPost },
  dragon_statue: { h: 34, paint: dragonStatue },
  plum_blossom: { h: 58, paint: plumBlossom },
  firecracker_string: { h: 52, paint: firecrackerString },
  // Valentine's
  heart_arch: { h: 52, paint: heartArch },
  heart_topiary: { h: 36, paint: heartTopiary },
  love_bench: { h: 26, paint: loveBench },
  rose_bouquet: { h: 30, paint: roseBouquet },
  // St. Patrick's
  clover_patch: { h: 12, paint: cloverPatch },
  pot_of_gold: { h: 24, paint: potOfGold },
  rainbow_arch: { h: 44, paint: rainbowArch },
  // Spring
  egg_basket: { h: 22, paint: eggBasket },
  egg_tree: { h: 50, paint: eggTree },
  chick_family: { h: 14, paint: chickFamily },
  tulip_cart: { h: 22, paint: tulipCart },
  // Summer
  beach_umbrella: { h: 46, paint: beachUmbrella },
  sandcastle: { h: 28, paint: sandcastle },
  lemonade_stand: { h: 50, paint: lemonadeStand },
  tiki_torch: { h: 54, paint: tikiTorch },
  kiddie_pool: { h: 8, paint: kiddiePool },
  festival_bunting: { h: 44, paint: festivalBunting },
  // Harvest
  cornucopia: { h: 14, paint: cornucopia },
  harvest_wreath: { h: 42, paint: harvestWreath },
  hay_pumpkins: { h: 20, paint: hayPumpkins },
  leaf_pile: { h: 14, paint: leafPile },
  apple_cider_stand: { h: 40, paint: ciderStand },
  autumn_maple: { h: 58, paint: autumnMaple },
  // Halloween
  jack_o_lantern: { h: 22, paint: jackOLantern },
  pumpkin_pile: { h: 20, paint: pumpkinPile },
  friendly_ghost: { h: 32, paint: friendlyGhost },
  spooky_tree: { h: 56, paint: spookyTree },
  candy_cauldron: { h: 24, paint: candyCauldron },
  witch_scarecrow: { h: 52, paint: witchScarecrow },
  black_cat: { h: 28, paint: blackCat },
  // Festival of Lights
  diya_lamps: { h: 14, paint: diyaLamps },
  rangoli: { h: 2, paint: rangoli },
  sky_lantern: { h: 56, paint: skyLantern },
  marigold_garland: { h: 48, paint: marigoldGarland },
  // Winter holidays
  decorated_pine: { h: 64, paint: decoratedPine },
  snowman: { h: 36, paint: snowman },
  gift_pile: { h: 20, paint: giftPile },
  candy_cane: { h: 44, paint: candyCane },
  sleigh: { h: 28, paint: sleigh },
  menorah: { h: 34, paint: menorah },
  gingerbread_house: { h: 30, paint: gingerbreadHouse },
  snow_globe: { h: 32, paint: snowGlobe },
  // New Year
  party_lanterns: { h: 50, paint: partyLanterns },
  countdown_clock: { h: 74, paint: countdownClock },
  confetti_cannon: { h: 32, paint: confettiCannon },
};

/** Anything added to the event list without bespoke art still gets a present. */
function fallback(p: Pen): void {
  const { x, y } = p.center;
  p.shadow(x, y + 1, 14, 6);
  gift(p, x, y, 0.4, 0.4, 12, '#a678f0', GOLD);
}

export const sprites: SpriteSpec[] = DECORATION_LIST.filter((d) => d.event).map((d) => {
  const art = ART[d.id] ?? { h: 24, paint: fallback };
  return { key: `deco:${d.id}`, fw: d.w, fh: d.h, height: art.h, paint: art.paint };
});

export const icons: IconSpec[] = [];
