// Halloween decorations, set A: the first 18 spooky items.
//
// Cute-spooky, never scary: lilac and plum houses, jack-o'-lanterns with glowing
// faces, friendly ghosts with blush, lime glows against orange and purple. Every
// piece is painted in code with the shared kit.
import { type IconSpec, type Pen, type Pt, type SpriteSpec, OUTLINE, rgba, rng, shade } from './kit';
import { SPOOKY_DECORATIONS } from '@farm/shared';

const O = OUTLINE;
const TAU = Math.PI * 2;
const PURPLE = '#8a5cc7';
const PLUM = '#4b2c74';
const LILAC = '#b993e6';
const ORANGE = '#f28a2e';
const ORANGE_L = '#ffb45c';
const LIME = '#c8ff5a';
const INK = '#2b2233';
const WOOD = '#b07a4a';
const CREAM = '#fff4d8';
const BLUSH = '#ff8fab';
const HAY = '#ecc05a';
const GREEN = '#6cc04f';
const GOLD = '#f4c24a';
const STONE = '#c9c2da';

type Fill = string | CanvasGradient | null;

// ---------------------------------------------------------------------------
// Low-level helpers

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

/** An outlined thick stroke (posts, stalks, bones). */
function thick(p: Pen, pts: Pt[], w: number, color: string): void {
  p.line(pts, O, w + 2);
  p.line(pts, color, w);
}

function thickCurve(p: Pen, a: Pt, c: Pt, b: Pt, w: number, color: string): void {
  p.curve(a, c, b, O, w + 2);
  p.curve(a, c, b, color, w);
}

function lerp(a: Pt, b: Pt, t: number): Pt {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

function qpt(a: Pt, c: Pt, b: Pt, t: number): Pt {
  const s = 1 - t;
  return { x: s * s * a.x + 2 * s * t * c.x + t * t * b.x, y: s * s * a.y + 2 * s * t * c.y + t * t * b.y };
}

function centroid(pts: Pt[]): Pt {
  return {
    x: pts.reduce((s, q) => s + q.x, 0) / pts.length,
    y: pts.reduce((s, q) => s + q.y, 0) / pts.length,
  };
}

function shrink(pts: Pt[], k: number): Pt[] {
  const c = centroid(pts);
  return pts.map((q) => lerp(c, q, k));
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

function withXform(p: Pen, x: number, y: number, rot: number, fn: () => void): void {
  const c = p.ctx;
  c.save();
  c.translate(x, y);
  c.rotate(rot);
  fn();
  c.restore();
}

/** Draw on a vertical face: x runs along the face, y = -z. slope 0.5 for u-faces. */
function onFace(p: Pen, o: Pt, slope: number, fn: () => void): void {
  const c = p.ctx;
  c.save();
  c.translate(o.x, o.y);
  c.transform(1, slope, 0, 1, 0, 0);
  fn();
  c.restore();
}

function clipTo(p: Pen, pts: Pt[]): void {
  const c = p.ctx;
  c.beginPath();
  c.moveTo(pts[0].x, pts[0].y);
  for (const q of pts.slice(1)) c.lineTo(q.x, q.y);
  c.closePath();
  c.clip();
}

/** Canvas point on the ground to footprint-local tile coords. */
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

/** Quad on a wall running along u at fixed v (bottom-left, bottom-right, top-right, top-left). */
function faceU(p: Pen, u0: number, u1: number, v: number, z0: number, z1: number): Pt[] {
  return [p.iso(u0, v, z0), p.iso(u1, v, z0), p.iso(u1, v, z1), p.iso(u0, v, z1)];
}

/** Quad on a wall running along v at fixed u. */
function faceV(p: Pen, u: number, v0: number, v1: number, z0: number, z1: number): Pt[] {
  return [p.iso(u, v0, z0), p.iso(u, v1, z0), p.iso(u, v1, z1), p.iso(u, v0, z1)];
}

/** A lit, paned window on a wall quad with a cream frame. Returns the glass. */
function glowWindow(p: Pen, pts: Pt[]): Pt[] {
  const c = centroid(pts);
  p.glow(c.x, c.y, 15, LIME, 0.5);
  p.poly(pts, CREAM, O, 1);
  const inner = shrink(pts, 0.72);
  const ci = centroid(inner);
  p.poly(inner, p.vgrad(ci.y - 5, ci.y + 5, '#fffbd6', '#d4ff7a'), null);
  const [bl, br, tr, tl] = pts;
  p.line([lerp(bl, br, 0.5), lerp(tl, tr, 0.5)], O, 0.6);
  p.line([lerp(bl, tl, 0.5), lerp(br, tr, 0.5)], O, 0.6);
  return inner;
}

// ---------------------------------------------------------------------------
// Characters and faces

/** Dot eye with a white highlight (kawaii). */
function dotEye(p: Pen, x: number, y: number, r: number): void {
  p.circle(x, y, r, INK, null);
  p.circle(x + r * 0.35, y - r * 0.35, Math.max(0.5, r * 0.38), '#ffffff', null);
}

function dotEyes(p: Pen, x: number, y: number, gap: number, r: number): void {
  dotEye(p, x - gap, y, r);
  dotEye(p, x + gap, y, r);
}

function blushes(p: Pen, x: number, y: number, gap: number, rx: number): void {
  p.ellipse(x - gap, y, rx, rx * 0.55, rgba(BLUSH, 0.8), null);
  p.ellipse(x + gap, y, rx, rx * 0.55, rgba(BLUSH, 0.8), null);
}

/** Small smile: a quadratic dipping below its ends. */
function smileAt(p: Pen, x: number, y: number, w: number, color = INK): void {
  p.curve({ x: x - w, y }, { x, y: y + w * 0.9 }, { x: x + w, y }, color, 0.9);
}

/** A friendly ghost: round head (x, y), radius r, over a three-scallop skirt. */
function ghostBody(p: Pen, x: number, y: number, r: number): void {
  const c = p.ctx;
  const bottom = y + r * 1.1;
  const sw = (2 * r) / 3;
  c.beginPath();
  c.arc(x, y, r, Math.PI, 0);
  c.lineTo(x + r, bottom);
  for (let i = 0; i < 3; i++) {
    const x0 = x + r - i * sw;
    c.quadraticCurveTo(x0 - sw / 2, bottom - r * 0.6, x0 - sw, bottom);
  }
  c.closePath();
  fs(p, radial(p, x - r * 0.3, y - r * 0.4, r * 1.6, '#ffffff', '#ddd2f5'), O, 1);
}

function ghostFace(p: Pen, x: number, y: number, r: number): void {
  dotEyes(p, x, y - r * 0.05, r * 0.4, r * 0.17);
  blushes(p, x, y + r * 0.3, r * 0.68, r * 0.2);
  smileAt(p, x, y + r * 0.3, r * 0.22);
}

/** A cute bat with spread wings. (x, y) is the body centre. */
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
    fs(p, body, O, 0.7);
  }
  p.poly(
    [
      { x: x - s * 0.55, y: y - s * 0.4 },
      { x: x - s * 0.5, y: y - s * 1.05 },
      { x: x - s * 0.1, y: y - s * 0.6 },
      { x: x + s * 0.1, y: y - s * 0.6 },
      { x: x + s * 0.5, y: y - s * 1.05 },
      { x: x + s * 0.55, y: y - s * 0.4 },
    ],
    body,
    O,
    0.7,
  );
  p.circle(x, y, s * 0.6, body, O);
  dotEyes(p, x, y - s * 0.05, s * 0.26, Math.max(0.6, s * 0.17));
}

/** Carved glowing face: light pours through the eyes and grin. */
function glowFace(p: Pen, x: number, y: number, s: number): void {
  p.glow(x, y, s * 2.6, '#ffe27a', 0.45);
  for (const dir of [-1, 1]) {
    const ex = x + dir * s * 0.42;
    const ey = y - s * 0.2;
    p.ellipse(ex, ey, s * 0.24, s * 0.3, radial(p, ex, ey, s * 0.3, '#fffbd6', '#ffd23f'), '#6b2a0a');
  }
  const c = p.ctx;
  c.beginPath();
  c.moveTo(x - s * 0.6, y + s * 0.2);
  c.quadraticCurveTo(x, y + s * 1.0, x + s * 0.6, y + s * 0.2);
  c.quadraticCurveTo(x, y + s * 0.55, x - s * 0.6, y + s * 0.2);
  c.closePath();
  fs(p, '#fff1a0', '#6b2a0a', 0.7);
  p.ellipse(x - s * 0.95, y + s * 0.55, s * 0.2, s * 0.12, rgba(BLUSH, 0.75), null);
  p.ellipse(x + s * 0.95, y + s * 0.55, s * 0.2, s * 0.12, rgba(BLUSH, 0.75), null);
}

/** A black cat sitting, facing the viewer. (x, y) is its base. */
function sittingCat(p: Pen, x: number, y: number, s: number): void {
  thickCurve(p, { x: x + s * 0.7, y: y - 1 }, { x: x + s * 2.4, y: y - 1.5 }, { x: x + s * 1.7, y: y - s * 2.7 }, 1.6, INK);
  p.ellipse(x, y - s, s * 0.95, s * 1.05, INK);
  p.poly(
    [
      { x: x - s * 0.8, y: y - s * 2.2 },
      { x: x - s * 0.7, y: y - s * 3.7 },
      { x: x - s * 0.1, y: y - s * 2.5 },
    ],
    INK,
  );
  p.poly(
    [
      { x: x + s * 0.8, y: y - s * 2.2 },
      { x: x + s * 0.7, y: y - s * 3.7 },
      { x: x + s * 0.1, y: y - s * 2.5 },
    ],
    INK,
  );
  p.circle(x, y - s * 2.3, s * 0.85, INK);
  for (const dir of [-1, 1]) {
    const ex = x + dir * s * 0.38;
    p.circle(ex, y - s * 2.3, s * 0.26, LIME, null);
    p.circle(ex, y - s * 2.3, s * 0.13, INK, null);
  }
  p.circle(x, y - s * 1.95, s * 0.1, BLUSH, null);
}

// ---------------------------------------------------------------------------
// Props

function post(p: Pen, x: number, y: number, ht: number, color = WOOD, w = 4): void {
  p.ellipse(x, y, w * 0.95, w * 0.42, shade(color, -0.25));
  p.rect(x - w / 2, y - ht, w, ht, hgrad(p, x - w / 2, x + w / 2, shade(color, 0.18), shade(color, -0.22)));
  p.ellipse(x, y - ht, w / 2, w / 4, shade(color, 0.3));
}

/** A round pumpkin whose base-centre is (x, y). */
function pumpkin(p: Pen, x: number, y: number, r: number, color = ORANGE): void {
  const side = shade(color, -0.12);
  for (const dx of [-0.42, 0.42]) {
    const sx = x + r * dx;
    p.ellipse(sx, y, r * 0.62, r * 0.8, radial(p, sx, y, r, shade(side, 0.2), shade(side, -0.2)));
  }
  p.ellipse(x, y, r * 0.5, r * 0.86, radial(p, x, y, r, shade(color, 0.35), color));
  p.ellipse(x - r * 0.3, y - r * 0.45, r * 0.12, r * 0.2, rgba('#ffffff', 0.5), null);
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

function leaf(p: Pen, x: number, y: number, len: number, ang: number, color: string): void {
  withXform(p, x, y, ang, () => {
    const c = p.ctx;
    c.beginPath();
    c.moveTo(0, 0);
    c.quadraticCurveTo(len * 0.5, -len * 0.42, len, 0);
    c.quadraticCurveTo(len * 0.5, len * 0.42, 0, 0);
    c.closePath();
    fs(p, color, O, 0.8);
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

/** Teardrop flame whose base sits at (x, y). */
function flame(p: Pen, x: number, y: number, s: number): void {
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
  drop(s, y, ORANGE, shade(ORANGE, -0.3));
  drop(s * 0.55, y - s * 0.15, '#fff3a6', null);
}

/** A corn cob with kernel lines, centred on (cx, cy). */
function cob(p: Pen, cx: number, cy: number, rot: number): void {
  withXform(p, cx, cy, rot, () => {
    const c = p.ctx;
    p.ellipse(0, 0, 3.4, 6.6, radial(p, 0, 0, 7, '#fff1a0', '#f2b829'));
    c.save();
    c.beginPath();
    c.ellipse(0, 0, 3.4, 6.6, 0, 0, TAU);
    c.clip();
    for (let i = -3; i <= 3; i++) p.line([{ x: -4, y: i * 1.9 }, { x: 4, y: i * 1.9 }], '#c98a1a', 0.6);
    for (let i = -2; i <= 2; i++) p.line([{ x: i * 1.6, y: -7 }, { x: i * 1.6, y: 7 }], '#c98a1a', 0.5);
    c.restore();
    p.ellipse(0, 0, 3.4, 6.6, null);
  });
}

/** A little glass bottle of bubbling potion standing on (u, v, z). */
function bottle(p: Pen, u: number, v: number, z: number, liquid: string): void {
  const b = p.iso(u, v, z);
  const r = 3.2;
  const by = b.y - r;
  p.glow(b.x, by, 8, liquid, 0.4);
  p.rect(b.x - 1.1, by - r - 3.6, 2.2, 3.8, '#eef7ff');
  p.rect(b.x - 1.5, by - r - 5.4, 3, 2, '#c99a5b');
  p.circle(b.x, by, r, radial(p, b.x, by, r, shade(liquid, 0.45), liquid));
  p.ellipse(b.x - 1.1, by - 0.8, 0.7, 1.4, rgba('#ffffff', 0.6), null);
  p.circle(b.x + 1, by + 1, 0.7, '#ffffff', null);
  p.circle(b.x - 0.4, by - 1.6, 0.5, '#ffffff', null);
  p.circle(b.x + 2.2, by - r - 7.6, 1.1, '#ffffff', O);
  p.circle(b.x + 0.6, by - r - 10.2, 0.8, '#ffffff', O);
}

// ---------------------------------------------------------------------------
// The 18 painters

/** Lopsided lilac Victorian: a turret, a crooked chimney, glowing windows, pumpkins on the steps. */
function hauntedHouse(p: Pen): void {
  const c = p.ctx;
  const ctr = p.center;
  p.shadow(ctr.x, ctr.y + 3, 50, 19, 0.22);
  // turret off the back-right corner, taller than the roof: that is the lopsided bit
  p.box(1.58, 0.12, 0.3, 0.3, 74, LILAC);
  p.hipRoof(1.58, 0.12, 0.3, 0.3, 74, 24, PLUM);
  // crooked chimney, drawn before the walls so the roof hides its foot
  const foot = p.iso(0.55, 0.42, 0);
  c.save();
  c.translate(foot.x, foot.y);
  c.rotate(-0.12);
  c.translate(-foot.x, -foot.y);
  p.box(0.44, 0.3, 0.22, 0.22, 64, '#a07aa8');
  p.box(0.42, 0.28, 0.26, 0.26, 5, '#6e5486', 64);
  c.restore();
  // main house
  p.box(0.3, 0.3, 1.4, 1.4, 40, LILAC);
  p.gableRoof(0.3, 0.3, 1.4, 1.4, 40, 26, PLUM, LILAC);
  const att = p.iso(1.7, 1.0, 46);
  p.glow(att.x, att.y, 14, LIME, 0.5);
  p.circle(att.x, att.y, 4, CREAM);
  p.circle(att.x, att.y, 2.8, p.vgrad(att.y - 3, att.y + 3, '#fffbd6', '#d4ff7a'), O);
  // front-left wall: two windows and a door
  const wA = glowWindow(p, faceU(p, 0.34, 0.8, 1.7, 15, 31));
  glowWindow(p, faceU(p, 1.28, 1.64, 1.7, 15, 31));
  // a ghost peeking out of the first window, clipped by the glass
  const g = centroid(wA);
  c.save();
  clipTo(p, wA);
  ghostBody(p, g.x, g.y + 1.5, 5);
  ghostFace(p, g.x, g.y + 1.5, 5);
  c.restore();
  // front-right wall
  glowWindow(p, faceV(p, 1.7, 0.34, 0.8, 15, 31));
  glowWindow(p, faceV(p, 1.7, 1.2, 1.64, 15, 31));
  // arched plum door with a round lit porthole
  const door = [p.iso(0.9, 1.7, 0), p.iso(1.2, 1.7, 0), p.iso(1.2, 1.7, 16), p.iso(1.05, 1.7, 21), p.iso(0.9, 1.7, 16)];
  p.poly(door, '#4d2a6e');
  const dl = p.iso(1.05, 1.7, 11);
  p.glow(dl.x, dl.y, 8, ORANGE_L, 0.5);
  p.circle(dl.x, dl.y - 1, 2, '#ffe27a', null);
  const kn = p.iso(1.15, 1.7, 7);
  p.circle(kn.x, kn.y, 1, GOLD);
  // steps with pumpkins on them
  p.box(0.8, 1.7, 0.6, 0.3, 4, '#d9cde9');
  const pa = p.iso(0.95, 1.86, 7.4);
  pumpkin(p, pa.x, pa.y, 4, ORANGE);
  const pb = p.iso(1.32, 1.9, 6.2);
  pumpkin(p, pb.x, pb.y, 3.4, '#f7a447');
  bat(p, ctr.x - 30, ctr.y - 86, 3.2);
}

/** Storybook cottage with a purple witch-hat roof, a green door, a cauldron and a cat on the sill. */
function witchCottage(p: Pen): void {
  const ctr = p.center;
  p.shadow(ctr.x, ctr.y + 3, 50, 19, 0.22);
  const WALL = '#f3dcb2';
  const BEAM = '#7a4b2e';
  const z = 40;
  const o = 0.2;
  p.box(0.25, 0.25, 1.5, 1.5, z, WALL);
  p.line([p.iso(0.25, 1.75, 30), p.iso(1.75, 1.75, 30)], BEAM, 1.6);
  p.line([p.iso(1.75, 0.25, 30), p.iso(1.75, 1.75, 30)], BEAM, 1.6);
  // the witch hat: a tall pointed roof with a brim
  p.hipRoof(0.25, 0.25, 1.5, 1.5, z, 62, PURPLE, o);
  const l = p.iso(0.25 - o, 1.75 + o, z);
  const btm = p.iso(1.75 + o, 1.75 + o, z);
  const r = p.iso(1.75 + o, 0.25 - o, z);
  const peak = p.iso(1, 1, z + 62);
  for (const t of [0.25, 0.5, 0.75]) {
    p.line([peak, lerp(l, btm, t)], shade(PURPLE, -0.3), 0.8);
    p.line([peak, lerp(btm, r, t)], shade(PURPLE, -0.3), 0.8);
  }
  p.line([lerp(l, peak, 0.3), lerp(btm, peak, 0.3), lerp(r, peak, 0.3)], ORANGE, 3);
  thickCurve(p, peak, { x: peak.x + 3, y: peak.y - 7 }, { x: peak.x + 9, y: peak.y - 4 }, 2.4, PURPLE);
  // arched green door on the front-left wall
  const dr = [p.iso(0.8, 1.75, 0), p.iso(1.15, 1.75, 0), p.iso(1.15, 1.75, 16), p.iso(0.975, 1.75, 22), p.iso(0.8, 1.75, 16)];
  p.poly(dr, GREEN);
  const kn = p.iso(1.1, 1.75, 8);
  p.circle(kn.x, kn.y, 1, GOLD);
  // a little window on the front-left wall
  glowWindow(p, faceU(p, 1.3, 1.62, 1.75, 19, 31));
  // a window on the front-right wall, with a sill and a cat sitting on it
  glowWindow(p, faceV(p, 1.75, 0.55, 1.15, 19, 31));
  p.box(1.75, 0.5, 0.14, 0.7, 2.5, WOOD, 17);
  const cat = p.iso(1.82, 0.85, 19.5);
  sittingCat(p, cat.x, cat.y, 4.6);
  // bubbling cauldron out front, with a little green glow and smoke
  const k = p.iso(0.42, 2.0, 0);
  p.shadow(k.x, k.y + 1, 11, 4.5, 0.25);
  p.glow(k.x, k.y - 12, 16, LIME, 0.45);
  p.ellipse(k.x - 5, k.y - 1, 1.6, 1.4, INK);
  p.ellipse(k.x + 5, k.y - 1, 1.6, 1.4, INK);
  p.ellipse(k.x, k.y - 9, 9, 7.5, radial(p, k.x, k.y - 9, 11, '#55505f', INK));
  p.ellipse(k.x, k.y - 15, 9.5, 3.2, '#2a2533');
  p.ellipse(k.x, k.y - 15, 7.8, 2.2, '#9af06a');
  p.circle(k.x + 2, k.y - 24, 2.6, rgba('#eaffd6', 0.85), null);
  p.circle(k.x + 4, k.y - 31, 3.2, rgba('#eaffd6', 0.8), null);
  p.circle(k.x + 1, k.y - 38, 2.4, rgba('#eaffd6', 0.75), null);
}

/** Arch of stacked jack-o'-lanterns on pillars, joined by a vine, with a glowing face on top. */
function pumpkinArch(p: Pen): void {
  const { x, y } = p.center;
  p.glow(x, y - 34, 32, '#ffb347', 0.32);
  p.shadow(x - 20, y + 1, 9, 4, 0.2);
  p.shadow(x + 20, y + 1, 9, 4, 0.2);
  for (const dx of [-20, 20]) {
    pumpkin(p, x + dx, y - 5, 7.2, ORANGE);
    pumpkin(p, x + dx, y - 16, 5.8, ORANGE_L);
  }
  const a = { x: x - 20, y: y - 24 };
  const b = { x: x + 20, y: y - 24 };
  const cc = { x, y: y - 68 };
  thickCurve(p, a, cc, b, 2.4, '#5f9a3a');
  const lv1 = qpt(a, cc, b, 0.22);
  leaf(p, lv1.x, lv1.y, 6, -2.6, '#6aa844');
  const lv2 = qpt(a, cc, b, 0.78);
  leaf(p, lv2.x, lv2.y, 6, -0.5, '#6aa844');
  for (const t of [0.4, 0.6]) {
    const q = qpt(a, cc, b, t);
    p.glow(q.x, q.y, 6, LIME, 0.6);
    p.circle(q.x, q.y, 1.2, LIME, O);
  }
  for (const [t, r] of [
    [0.14, 5.4],
    [0.3, 6.2],
    [0.7, 6.2],
    [0.86, 5.4],
  ] as [number, number][]) {
    const q = qpt(a, cc, b, t);
    pumpkin(p, q.x, q.y, r, t < 0.5 ? ORANGE : ORANGE_L);
  }
  const top = qpt(a, cc, b, 0.5);
  pumpkin(p, top.x, top.y, 7.8, ORANGE);
  glowFace(p, top.x, top.y, 3.4);
}

/** Lamp post whose lantern is a smiling ghost, glowing lime. */
function ghostLantern(p: Pen): void {
  const { x, y } = p.center;
  p.shadow(x, y + 1, 10, 4.5, 0.22);
  const iron = '#4f3a7a';
  p.roundRect(x - 5, y - 4, 10, 4, 1.5, '#9a8ab8');
  post(p, x, y - 4, 46, iron, 3.2);
  const cy = y - 59;
  p.glow(x, cy, 22, LIME, 0.5);
  p.roundRect(x - 7, cy - 7.5, 14, 17, 4, radial(p, x, cy, 12, '#fffde6', '#e6ffb0'), iron);
  ghostBody(p, x, cy - 2, 4.6);
  ghostFace(p, x, cy - 2, 4.6);
  p.poly(
    [
      { x: x - 9, y: cy - 7.5 },
      { x: x + 9, y: cy - 7.5 },
      { x, y: cy - 14 },
    ],
    PLUM,
  );
  p.circle(x, cy - 15, 2, ORANGE);
  p.rect(x - 8, cy + 8.5, 16, 2, iron);
}

/** Wooden birdhouse-style bat house with a purple roof and two cute bats hanging by it. */
function batHouse(p: Pen): void {
  const { x, y } = p.center;
  p.shadow(x, y + 1, 13, 5, 0.22);
  post(p, x, y, 13, WOOD, 3.4);
  const uv = toUV(p, x, y);
  const h = 0.3;
  boxAt(p, x, y, 0.6, 0.6, 22, WOOD, 13);
  p.gableRoof(uv.u - h, uv.v - h, 2 * h, 2 * h, 35, 13, PLUM, WOOD, 0.1);
  // round entry hole on the front-left wall
  const hole = p.iso(uv.u, uv.v + h, 24);
  p.ellipse(hole.x, hole.y, 4.2, 5, '#8a5a36');
  p.ellipse(hole.x, hole.y, 3.2, 4, INK);
  // two cute bats flitting about the house
  bat(p, x - 17, y - 42, 4.2);
  bat(p, x + 17, y - 31, 3.7);
}

/** A fence segment along the u centre line, with a cobweb and a fuzzy spider. */
function cobwebFence(p: Pen): void {
  const m = p.iso(0.5, 0.5, 0);
  p.shadow(m.x, m.y + 2, 30, 7, 0.2);
  const PICKET = '#cdb9ee';
  for (const z of [5, 13]) thick(p, [p.iso(0, 0.5, z), p.iso(1, 0.5, z)], 2.4, shade(PICKET, -0.2));
  for (const u of [0.04, 0.18, 0.32, 0.46, 0.6, 0.74, 0.88, 0.97]) {
    const w = 0.035;
    p.poly(
      [p.iso(u - w, 0.5, 0), p.iso(u + w, 0.5, 0), p.iso(u + w, 0.5, 17), p.iso(u, 0.5, 21), p.iso(u - w, 0.5, 17)],
      PICKET,
      O,
      0.9,
    );
  }
  // cobweb between two pickets
  const web = p.iso(0.53, 0.5, 14);
  const wr = 9;
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TAU;
    p.line([web, { x: web.x + Math.cos(a) * wr, y: web.y + Math.sin(a) * wr * 0.9 }], '#ffffff', 0.7);
  }
  for (const rr of [3, 6, 9]) {
    const ring: Pt[] = [];
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * TAU;
      ring.push({ x: web.x + Math.cos(a) * rr, y: web.y + Math.sin(a) * rr * 0.9 });
    }
    p.poly(ring, null, '#ffffff', 0.7);
  }
  // spider hanging on its thread, with big kawaii eyes
  const sp = { x: web.x + 0.5, y: web.y + 15 };
  p.line([web, { x: sp.x, y: sp.y - 4.5 }], '#ffffff', 0.7);
  for (const dir of [-1, 1]) {
    for (const k of [-1, 0, 1]) {
      p.curve(
        { x: sp.x + dir * 3, y: sp.y + k * 1.6 },
        { x: sp.x + dir * 6, y: sp.y + k * 1.6 - 0.8 },
        { x: sp.x + dir * 7.4, y: sp.y + k * 2.4 + 1.2 },
        INK,
        1,
      );
    }
  }
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * TAU;
    p.circle(sp.x + Math.cos(a) * 3.6, sp.y + Math.sin(a) * 3.1, 1.3, INK, null);
  }
  p.circle(sp.x, sp.y, 3.8, INK);
  dotEyes(p, sp.x, sp.y - 0.6, 1.7, 1.5);
  smileAt(p, sp.x, sp.y + 1.6, 1, '#ffffff');
}

/** Rounded lilac gravestone that says BOO, a comedic ghost popping out, and flowers. */
function sillyTombstone(p: Pen): void {
  const { x, y } = p.center;
  p.shadow(x, y + 1, 15, 6, 0.22);
  // ghost popping up from behind the stone
  const gx = x + 5;
  const gy = y - 39;
  p.glow(gx, gy, 12, '#ffffff', 0.35);
  ghostBody(p, gx, gy, 6);
  ghostFace(p, gx, gy, 6);
  // the stone: flat bottom, arched top
  const sx = x - 13;
  const ex = x + 13;
  const c = p.ctx;
  c.beginPath();
  c.moveTo(sx, y - 2);
  c.lineTo(sx, y - 21);
  c.arc(x, y - 21, 13, Math.PI, 0);
  c.lineTo(ex, y - 2);
  c.closePath();
  fs(p, hgrad(p, sx, ex, '#ece8f6', '#a7a0c2'), O, 1.2);
  p.roundRect(x - 15, y - 4, 30, 4, 1.5, '#bdb6d2');
  p.text('BOO', x, y - 16, 8, PLUM);
  p.circle(x - 8, y - 6, 1.2, '#7fcf5a', null);
  p.circle(x + 9, y - 7, 1, '#7fcf5a', null);
  p.flower(x - 17, y - 3, 2.6, '#ff8fb3');
  p.flower(x + 17, y - 3, 2.4, '#ffd84a');
}

/** Cartoon skeleton mid-dance, round skull with big eye holes, smile and a party hat. */
function friendlySkeleton(p: Pen): void {
  const { x, y } = p.center;
  p.shadow(x, y + 1, 11, 4.5, 0.22);
  const bone = '#f7f2e4';
  const boneD = shade(bone, -0.18);
  // legs: a little dance step, one foot kicked out
  thick(
    p,
    [
      { x: x - 2, y: y - 17 },
      { x: x - 6, y: y - 9 },
      { x: x - 5, y: y - 1 },
    ],
    2.4,
    bone,
  );
  thick(
    p,
    [
      { x: x + 2, y: y - 17 },
      { x: x + 7, y: y - 10 },
      { x: x + 11, y: y - 6 },
    ],
    2.4,
    bone,
  );
  p.ellipse(x - 5.5, y - 0.5, 2.6, 1.3, bone);
  p.ellipse(x + 11.5, y - 5.5, 2.2, 1.2, bone, O, -0.5);
  // pelvis, spine and ribs
  p.ellipse(x, y - 17.5, 4, 2.4, bone);
  thick(
    p,
    [
      { x, y: y - 19 },
      { x, y: y - 31 },
    ],
    2.4,
    bone,
  );
  for (const dy of [-24, -28]) {
    p.curve({ x: x - 4.5, y: y + dy }, { x, y: y + dy + 1.8 }, { x: x + 4.5, y: y + dy }, boneD, 1);
  }
  // arms: one waving high, one out
  thick(
    p,
    [
      { x: x + 1, y: y - 30 },
      { x: x + 8, y: y - 36 },
      { x: x + 12.5, y: y - 45 },
    ],
    2.2,
    bone,
  );
  thick(
    p,
    [
      { x: x - 1, y: y - 30 },
      { x: x - 8, y: y - 27 },
      { x: x - 12, y: y - 21 },
    ],
    2.2,
    bone,
  );
  p.circle(x + 12.5, y - 45, 1.9, bone);
  p.circle(x - 12, y - 21, 1.9, bone);
  // skull, jaw, eye holes, nose and grin
  p.roundRect(x - 4.4, y - 39, 8.8, 6.5, 2.5, bone);
  p.circle(x, y - 44, 8.6, radial(p, x - 2, y - 47, 10, '#ffffff', bone));
  for (const dir of [-1, 1]) {
    p.ellipse(x + dir * 3.4, y - 44.5, 2.9, 3.3, INK, null);
    p.circle(x + dir * 3.4 - 0.9, y - 46, 0.8, '#ffffff', null);
  }
  blushes(p, x, y - 38.5, 5.8, 1.4);
  p.poly(
    [
      { x: x - 1, y: y - 40 },
      { x: x + 1, y: y - 40 },
      { x, y: y - 38 },
    ],
    INK,
    null,
  );
  p.curve({ x: x - 4, y: y - 37 }, { x, y: y - 34 }, { x: x + 4, y: y - 37 }, INK, 0.9);
  p.line(
    [
      { x: x - 1.6, y: y - 36.4 },
      { x: x - 1.6, y: y - 34.6 },
    ],
    bone,
    0.6,
  );
  p.line(
    [
      { x: x + 1.6, y: y - 36.4 },
      { x: x + 1.6, y: y - 34.6 },
    ],
    bone,
    0.6,
  );
  // party hat, lime stripes and a pompom
  p.poly(
    [
      { x: x - 6, y: y - 49 },
      { x: x + 6, y: y - 49 },
      { x: x + 2.5, y: y - 68 },
    ],
    PURPLE,
  );
  p.line(
    [
      { x: x - 4.2, y: y - 55 },
      { x: x + 4.3, y: y - 55 },
    ],
    LIME,
    1.5,
  );
  p.line(
    [
      { x: x - 2.2, y: y - 62 },
      { x: x + 2.4, y: y - 62 },
    ],
    LIME,
    1.4,
  );
  p.circle(x + 2.5, y - 68.5, 2.2, LIME);
}

/** Cute green Frankenstein bust on a stone plinth: flat-top hair, bolts, blush, stitched smile. */
function frankieStatue(p: Pen): void {
  const { x, y } = p.center;
  p.shadow(x, y + 1, 14, 6, 0.22);
  boxAt(p, x, y, 0.5, 0.5, 9, STONE);
  const b = y - 9;
  const skin = radial(p, x, b - 22, 13, '#b8f08f', '#5fb64b');
  // jacket shoulders and neck
  p.roundRect(x - 11, b - 11, 22, 12, 5, '#5c3d8f');
  p.rect(x - 4.5, b - 14, 9, 4, shade('#5fb64b', -0.2));
  // head
  p.circle(x, b - 22, 11, skin);
  // neck bolts poking out at the temples
  for (const dir of [-1, 1]) {
    p.rect(dir > 0 ? x + 10 : x - 14, b - 25, 4, 3, '#a9b0c0');
  }
  // flat-top hair
  p.roundRect(x - 11.5, b - 37, 23, 7, 2.5, INK);
  // face
  dotEyes(p, x, b - 24, 4, 1.6);
  blushes(p, x, b - 18, 6.5, 1.8);
  const a = { x: x - 5, y: b - 16 };
  const c = { x, y: b - 11.5 };
  const e = { x: x + 5, y: b - 16 };
  p.curve(a, c, e, INK, 0.9);
  for (const t of [0.25, 0.5, 0.75]) {
    const q = qpt(a, c, e, t);
    p.line(
      [
        { x: q.x - 1.1, y: q.y - 1.1 },
        { x: q.x + 1.1, y: q.y + 1.1 },
      ],
      INK,
      0.7,
    );
    p.line(
      [
        { x: q.x + 1.1, y: q.y - 1.1 },
        { x: q.x - 1.1, y: q.y + 1.1 },
      ],
      INK,
      0.7,
    );
  }
}

/** Garden gnome wrapped in bandages: red hat, one big eye peeking through a gap. */
function mummyGnome(p: Pen): void {
  const { x, y } = p.center;
  p.shadow(x, y + 1, 12, 5, 0.22);
  const WRAP = '#f7f0dc';
  const WRAP_D = '#d9ccb0';
  const RED = '#e5443a';
  // feet
  p.ellipse(x - 4, y - 1.5, 3.4, 2, WRAP);
  p.ellipse(x + 4, y - 1.5, 3.4, 2, WRAP);
  // bandaged body with stripes
  p.ellipse(x, y - 13, 9.5, 12, radial(p, x - 3, y - 17, 13, '#ffffff', WRAP_D));
  const c = p.ctx;
  c.save();
  c.beginPath();
  c.ellipse(x, y - 13, 9.5, 12, 0, 0, TAU);
  c.clip();
  for (let k = 0; k < 4; k++) {
    p.line(
      [
        { x: x - 11, y: y - 4 - k * 5 },
        { x: x + 11, y: y - 9 - k * 5 },
      ],
      WRAP_D,
      1.2,
    );
  }
  c.restore();
  p.ellipse(x, y - 13, 9.5, 12, null);
  // head wrapped in bandage
  p.circle(x, y - 30, 8.5, radial(p, x - 2, y - 33, 10, '#ffffff', WRAP));
  p.line(
    [
      { x: x - 8, y: y - 35 },
      { x: x + 8, y: y - 33 },
    ],
    WRAP_D,
    1.2,
  );
  p.line(
    [
      { x: x - 8, y: y - 27 },
      { x: x + 8, y: y - 25 },
    ],
    WRAP_D,
    1.2,
  );
  // hat: red cone, bandage stripes, brim
  p.poly(
    [
      { x: x - 9, y: y - 37 },
      { x: x + 9, y: y - 37 },
      { x: x + 2, y: y - 58 },
    ],
    RED,
  );
  p.line(
    [
      { x: x - 6, y: y - 44 },
      { x: x + 6, y: y - 45 },
    ],
    WRAP,
    1.4,
  );
  p.ellipse(x, y - 37, 11, 3.4, shade(RED, -0.12));
  // beard of bandage
  p.ellipse(x, y - 22.5, 6, 4.2, WRAP);
  p.line(
    [
      { x: x - 3, y: y - 23 },
      { x: x + 3, y: y - 21.5 },
    ],
    WRAP_D,
    0.8,
  );
  // nose, one big eye and a blushy cheek
  p.circle(x - 0.5, y - 27, 1.8, '#fff0e0');
  p.circle(x + 2.5, y - 31, 3.4, '#ffffff');
  p.circle(x + 3.1, y - 30.6, 1.7, INK, null);
  p.circle(x + 2.2, y - 32, 0.6, '#ffffff', null);
  p.ellipse(x + 6.5, y - 26.5, 1.8, 1.1, rgba(BLUSH, 0.85), null);
}

/** Green hedge clipped into a bat with kawaii eyes, sitting in a purple pot. */
function batTopiary(p: Pen): void {
  const { x, y } = p.center;
  p.shadow(x, y + 1, 13, 5, 0.22);
  const POT = '#7b56b5';
  const LEAF_C = '#7cc24a';
  p.poly(
    [
      { x: x - 8.5, y: y - 12 },
      { x: x + 8.5, y: y - 12 },
      { x: x + 6, y },
      { x: x - 6, y },
    ],
    hgrad(p, x - 8.5, x + 8.5, shade(POT, 0.15), shade(POT, -0.2)),
  );
  // hedge silhouette: body, head, ears and scalloped wings
  // wings sweep wide with scalloped trailing edges; the body stays small
  const left: [number, number, number][] = [
    [-7, -30, 3.6],
    [-13, -36, 4],
    [-20, -35, 3.8],
    [-22, -29, 3.4],
    [-18, -23, 3.2],
    [-12, -20, 3.2],
  ];
  const blobs: [number, number, number][] = [
    [0, -26, 6],
    [0, -35, 4.8],
    [-3.2, -41, 2.6],
    [3.2, -41, 2.6],
    [0, -16, 4],
    ...left,
    ...left.map(([dx, dy, r]): [number, number, number] => [-dx, dy, r]),
  ];
  const pts = blobs.map(([dx, dy, r]) => ({ x: x + dx, y: y + dy, r }));
  for (const q of pts) p.circle(q.x, q.y, q.r + 1, O, null);
  for (const q of pts) p.circle(q.x, q.y, q.r, shade(LEAF_C, -0.15), null);
  for (const q of pts) p.circle(q.x - q.r * 0.25, q.y - q.r * 0.3, q.r * 0.6, LEAF_C, null);
  // clipped leaf texture
  const rand = rng('bat-topiary');
  for (let i = 0; i < 10; i++) {
    const q = pts[Math.floor(rand() * pts.length)];
    p.circle(q.x + (rand() - 0.5) * q.r, q.y + (rand() - 0.5) * q.r, 0.6, rgba('#2f7432', 0.5), null);
  }
  dotEyes(p, x, y - 30, 2.4, 1.5);
  blushes(p, x, y - 26.5, 4, 1.1);
  p.roundRect(x - 10, y - 15, 20, 4.5, 1.5, shade(POT, 0.1));
}

/** Wooden shelf of bubbling potion bottles in lilac, lime, orange and pink. */
function potionShelf(p: Pen): void {
  const ctr = p.center;
  p.shadow(ctr.x, ctr.y + 2, 26, 9, 0.22);
  const BOARD = '#c8925a';
  p.box(0.12, 0.06, 0.76, 0.12, 60, WOOD);
  p.box(0.08, 0.06, 0.12, 0.8, 60, WOOD);
  const liquids = ['#b993e6', '#9dff5c', '#ff9a3c', '#ff7aa8', '#5fd6c8', '#ffd84a'];
  [0, 22, 44].forEach((z, row) => {
    p.box(0.08, 0.2, 0.84, 0.62, 3, BOARD, z);
    const spots: [number, number][] = [
      [0.24, 0.44],
      [0.46, 0.5],
      [0.68, 0.42],
    ];
    spots.forEach(([u, v], k) => bottle(p, u, v, z + 3, liquids[(row * 3 + k) % liquids.length]));
  });
  p.box(0.86, 0.06, 0.08, 0.8, 60, WOOD);
}

/** Small round table with a purple cloth, a glowing crystal ball and star cards. */
function crystalBall(p: Pen): void {
  const { x, y } = p.center;
  p.shadow(x, y + 1, 16, 7, 0.22);
  p.cylinder(x, y, 14, 14, PURPLE);
  for (let i = -3; i <= 3; i++) p.circle(x + i * 3.6, y - 0.6, 1.9, shade(PURPLE, -0.15), null);
  // tarot-ish cards fanned on the table
  const card = (cx: number, cy: number, rot: number, fill: string) => {
    withXform(p, cx, cy, rot, () => {
      p.roundRect(-3.2, -4.6, 6.4, 9.2, 1.2, fill);
      p.star(0, 0, 1.9, GOLD, null);
    });
  };
  card(x - 9, y - 15, -0.35, CREAM);
  card(x + 9, y - 15, 0.35, '#d9c4ff');
  // the gold stand and the glowing ball
  p.ellipse(x, y - 14.5, 4.5, 1.6, GOLD);
  p.glow(x, y - 23, 20, LIME, 0.45);
  p.circle(x, y - 23, 8, radial(p, x, y - 23, 9, '#f5fff0', '#7fd6c4'));
  p.curve({ x: x - 4, y: y - 22 }, { x, y: y - 26 }, { x: x + 4, y: y - 21 }, rgba(PURPLE, 0.7), 0.7);
  p.ellipse(x - 3, y - 27, 2.2, 1.3, rgba('#ffffff', 0.85), null, -0.6);
  sparkle(p, x - 15, y - 30, 2.6);
  sparkle(p, x + 15, y - 31, 2.2, LIME);
}

/** Rack with three broomsticks standing in it, and a witch hat on top. */
function broomRack(p: Pen): void {
  const { x, y } = p.center;
  p.shadow(x, y + 1, 17, 6, 0.22);
  post(p, x - 12, y, 46, WOOD, 3.6);
  post(p, x + 12, y, 46, WOOD, 3.6);
  p.rect(x - 14, y - 47, 28, 4, shade(WOOD, 0.08));
  for (const dx of [-7, 0, 7]) {
    const bx = x + dx;
    thick(
      p,
      [
        { x: bx, y: y - 14 },
        { x: bx + 1.5, y: y - 60 },
      ],
      1.8,
      '#d9a46a',
    );
    p.poly(
      [
        { x: bx - 1, y: y - 16 },
        { x: bx + 1, y: y - 16 },
        { x: bx + 5, y: y - 1 },
        { x: bx - 5, y: y - 1 },
      ],
      '#f2cf6a',
    );
    p.line(
      [
        { x: bx - 4, y: y - 8 },
        { x: bx + 4, y: y - 8 },
      ],
      '#c99a3a',
      0.8,
    );
    p.rect(bx - 2.2, y - 12, 4.4, 2.2, PURPLE);
  }
  // witch hat on top of the rack
  const hy = y - 47;
  p.ellipse(x, hy, 10, 2.8, PLUM);
  p.poly(
    [
      { x: x - 6.5, y: hy - 0.5 },
      { x: x + 6.5, y: hy - 0.5 },
      { x: x + 2, y: hy - 19 },
    ],
    PLUM,
  );
  p.line(
    [
      { x: x - 6, y: hy - 4 },
      { x: x + 5.5, y: hy - 4.5 },
    ],
    LIME,
    1.6,
  );
  p.circle(x + 0.5, hy - 2, 1.2, GOLD);
  thickCurve(p, { x: x + 2, y: hy - 19 }, { x: x + 3.5, y: hy - 23 }, { x: x + 8, y: hy - 22 }, 2, PLUM);
}

/** Black cauldron bubbling green, with fire under it and a ladle. */
function bubblingCauldron(p: Pen): void {
  const { x, y } = p.center;
  p.shadow(x, y + 1, 16, 6, 0.22);
  p.glow(x, y - 3, 18, ORANGE, 0.5);
  thick(
    p,
    [
      { x: x - 8, y: y - 1 },
      { x: x + 8, y: y - 3 },
    ],
    2.6,
    '#8a5a36',
  );
  flame(p, x - 2, y - 2, 3.6);
  flame(p, x + 3, y - 2, 2.8);
  p.rect(x - 7, y - 7, 2.4, 6, INK);
  p.rect(x + 4.6, y - 7, 2.4, 6, INK);
  p.ellipse(x, y - 11, 11.5, 8.5, radial(p, x - 4, y - 14, 12, '#4a4558', INK));
  p.ellipse(x, y - 18, 12.5, 4.2, '#2d2836');
  p.ellipse(x, y - 18, 10.5, 3.1, '#86f25a');
  p.ellipse(x - 3, y - 18.5, 3, 0.8, rgba('#ffffff', 0.6), null);
  p.glow(x, y - 19, 16, LIME, 0.5);
  for (const [bx, by, br] of [
    [x - 4, y - 23, 2.2],
    [x + 3, y - 27, 1.6],
    [x - 0.5, y - 32, 2.7],
    [x + 5.5, y - 37, 1.2],
  ]) {
    p.circle(bx, by, br, '#b8ff8a', INK);
    p.circle(bx - br * 0.3, by - br * 0.3, br * 0.3, '#ffffff', null);
  }
  thick(
    p,
    [
      { x: x + 8, y: y - 17 },
      { x: x + 14, y: y - 30 },
      { x: x + 17, y: y - 36 },
    ],
    1.8,
    WOOD,
  );
  p.ellipse(x + 18, y - 37.5, 3, 2, '#b8c0c8');
}

/** Flat-ish hay bale maze with a glowing pumpkin in the middle and a tiny scarecrow. */
function hayMaze(p: Pen): void {
  const ctr = p.center;
  p.diamond(0, 0, 2, 2, '#a6d96c', '#5f9a3e');
  p.shadow(ctr.x, ctr.y + 3, 56, 22, 0.16);
  const rand = rng('hay-maze');

  const bale = (u: number, v: number, du: number, dv: number) => ({
    s: u + du / 2 + v + dv / 2,
    paint: () => {
      p.box(u, v, du, dv, 12, HAY);
      const twine = shade(HAY, -0.35);
      if (du > dv) {
        p.line([p.iso(u, v + dv, 6), p.iso(u + du, v + dv, 6)], twine, 0.8);
      } else {
        p.line([p.iso(u + du, v, 6), p.iso(u + du, v + dv, 6)], twine, 0.8);
      }
    },
  });

  const pc = p.iso(1.2, 1.2, 0);
  const sc = p.iso(0.5, 0.5, 0);
  const items: { s: number; paint: () => void }[] = [
    bale(0.1, 0.08, 1.8, 0.12),
    bale(0.08, 0.1, 0.12, 1.8),
    bale(0.1, 1.88, 0.8, 0.12),
    bale(1.1, 1.88, 0.8, 0.12),
    bale(1.88, 0.1, 0.12, 1.8),
    bale(0.88, 0.1, 0.12, 0.8),
    bale(0.9, 0.88, 0.6, 0.12),
    bale(1.48, 0.9, 0.12, 0.6),
    bale(0.5, 1.48, 1.0, 0.12),
    bale(0.48, 1.5, 0.12, 0.38),
    {
      s: 1.3,
      paint: () => {
        p.shadow(sc.x, sc.y + 1, 7, 3, 0.2);
        thick(p, [sc, { x: sc.x, y: sc.y - 34 }], 2.4, WOOD);
        thick(p, [{ x: sc.x - 9, y: sc.y - 25 }, { x: sc.x + 9, y: sc.y - 25 }], 2.2, WOOD);
        p.roundRect(sc.x - 4.5, sc.y - 23, 9, 12, 2, PURPLE);
        p.circle(sc.x, sc.y - 37, 4.6, radial(p, sc.x - 1, sc.y - 38, 6, '#fff0c4', '#e9c77a'));
        dotEyes(p, sc.x, sc.y - 37.5, 1.8, 0.9);
        smileAt(p, sc.x, sc.y - 34.5, 1.6);
        p.ellipse(sc.x, sc.y - 41, 7, 1.8, PLUM);
        p.poly(
          [
            { x: sc.x - 4.6, y: sc.y - 41 },
            { x: sc.x + 4.6, y: sc.y - 41 },
            { x: sc.x + 1, y: sc.y - 52 },
          ],
          PLUM,
        );
        p.line(
          [
            { x: sc.x - 4, y: sc.y - 44 },
            { x: sc.x + 4, y: sc.y - 44 },
          ],
          LIME,
          1.2,
        );
      },
    },
    {
      s: 2.4,
      paint: () => {
        p.shadow(pc.x, pc.y + 1, 14, 6, 0.22);
        pumpkin(p, pc.x, pc.y - 6, 6.6, ORANGE);
        glowFace(p, pc.x, pc.y - 6, 2.8);
      },
    },
  ];
  // loose straw on the grass
  for (let i = 0; i < 8; i++) {
    const q = p.iso(0.2 + rand() * 1.6, 0.2 + rand() * 1.6, 0);
    p.line([{ x: q.x - 1.5, y: q.y }, { x: q.x + 1.5, y: q.y - 0.5 }], shade(HAY, -0.1), 0.8);
  }
  items.sort((a, b) => a.s - b.s);
  for (const it of items) it.paint();
}

/** Tied bundle of corn stalks with cobs, an orange bow, and pumpkins at its feet. */
function cornBundle(p: Pen): void {
  const { x, y } = p.center;
  p.shadow(x, y + 1, 16, 6, 0.22);
  pumpkin(p, x - 9, y - 4, 4.6, ORANGE);
  pumpkin(p, x + 9, y - 3, 4.2, '#f6c445');
  const stalk = '#8fc24e';
  for (const [dx, top] of [
    [-5, -54],
    [-1.5, -60],
    [2.5, -58],
    [5.5, -50],
  ] as [number, number][]) {
    thickCurve(p, { x: x + dx * 0.4, y: y - 2 }, { x: x + dx * 0.9, y: y - 30 }, { x: x + dx * 1.1, y: y + top }, 2.4, stalk);
  }
  leaf(p, x - 4, y - 14, 12, -2.9, '#6aa844');
  leaf(p, x + 3, y - 22, 12, -0.25, '#6aa844');
  leaf(p, x - 1, y - 38, 11, -2.6, '#6aa844');
  leaf(p, x + 5, y - 46, 11, -0.4, '#6aa844');
  cob(p, x - 5, y - 24, -0.4);
  cob(p, x + 5, y - 20, 0.4);
  // orange bow tying the bundle
  thick(
    p,
    [
      { x: x - 7, y: y - 31 },
      { x: x + 7, y: y - 31 },
    ],
    2,
    ORANGE,
  );
  p.ellipse(x - 3.5, y - 34, 3.2, 2, ORANGE, O, -0.4);
  p.ellipse(x + 3.5, y - 34, 3.2, 2, ORANGE, O, 0.4);
  p.circle(x, y - 33.5, 1.4, '#d96a1a');
  thick(
    p,
    [
      { x: x - 1, y: y - 31 },
      { x: x - 3, y: y - 24 },
    ],
    1.4,
    ORANGE,
  );
  thick(
    p,
    [
      { x: x + 1, y: y - 31 },
      { x: x + 3, y: y - 25 },
    ],
    1.4,
    ORANGE,
  );
}

/** Two-tile wooden wagon heaped with orange and white pumpkins. */
function pumpkinWagon(p: Pen): void {
  const ctr = p.center;
  p.shadow(ctr.x, ctr.y + 2, 40, 14, 0.22);
  const u0 = 0.3;
  const u1 = 1.7;
  const v0 = 0.2;
  const v1 = 0.8;
  const zb = 8;
  const hb = 12;
  p.box(u0, v0, u1 - u0, v1 - v0, hb, WOOD, zb);
  const plank = shade(WOOD, -0.3);
  p.line([p.iso(u0, v1, zb + 4), p.iso(u1, v1, zb + 4)], plank, 0.8);
  p.line([p.iso(u1, v0, zb + 4), p.iso(u1, v1, zb + 4)], plank, 0.8);
  // wheels on the front side, drawn in the plane of that wall
  onFace(p, p.iso(0.55, v1, 0), 0.5, () => {
    for (const wx of [0, 28.8]) {
      p.circle(wx, -8, 7, '#6b4a2e');
      for (let k = 0; k < 4; k++) {
        const a = (k / 4) * TAU;
        p.line(
          [
            { x: wx, y: -8 },
            { x: wx + Math.cos(a) * 5.6, y: -8 + Math.sin(a) * 5.6 },
          ],
          '#a7784a',
          0.9,
        );
      }
      p.circle(wx, -8, 1.6, GOLD);
    }
  });
  // the heap of pumpkins
  const heap: [number, number, number, number, string][] = [
    [0.6, 0.45, zb + hb, 8, ORANGE],
    [1.0, 0.4, zb + hb, 8.2, '#f7f3ea'],
    [1.4, 0.5, zb + hb, 8, ORANGE],
    [0.8, 0.6, zb + hb, 7.8, '#f7a447'],
    [1.22, 0.62, zb + hb, 7.6, '#f0ece0'],
    [0.95, 0.5, zb + hb + 6, 7.6, ORANGE],
    [1.25, 0.45, zb + hb + 6, 7.2, '#f7a447'],
    [1.08, 0.55, zb + hb + 13, 6.8, '#f7f3ea'],
  ];
  const placed = heap
    .map(([u, v, z, r, col]) => ({ pt: p.iso(u, v, z + r * 0.8), r, col }))
    .sort((a, b) => a.pt.y - b.pt.y);
  for (const q of placed) pumpkin(p, q.pt.x, q.pt.y, q.r, q.col);
}

/** Cute stand-in for any id without its own painter. */
function fallback(p: Pen): void {
  const { x, y } = p.center;
  p.shadow(x, y + 1, 12, 5);
  pumpkin(p, x, y - 7, 8);
  glowFace(p, x, y - 7, 3);
}

// ---------------------------------------------------------------------------
// Export

const PAINT: Record<string, { height: number; paint: (p: Pen) => void }> = {
  haunted_house: { height: 100, paint: hauntedHouse },
  witch_cottage: { height: 100, paint: witchCottage },
  pumpkin_arch: { height: 84, paint: pumpkinArch },
  ghost_lantern: { height: 80, paint: ghostLantern },
  bat_house: { height: 60, paint: batHouse },
  cobweb_fence: { height: 34, paint: cobwebFence },
  silly_tombstone: { height: 50, paint: sillyTombstone },
  friendly_skeleton: { height: 70, paint: friendlySkeleton },
  frankie_statue: { height: 60, paint: frankieStatue },
  mummy_gnome: { height: 62, paint: mummyGnome },
  bat_topiary: { height: 52, paint: batTopiary },
  potion_shelf: { height: 68, paint: potionShelf },
  crystal_ball: { height: 46, paint: crystalBall },
  broom_rack: { height: 66, paint: broomRack },
  bubbling_cauldron: { height: 44, paint: bubblingCauldron },
  hay_maze: { height: 50, paint: hayMaze },
  corn_bundle: { height: 66, paint: cornBundle },
  pumpkin_wagon: { height: 66, paint: pumpkinWagon },
};

export const sprites: SpriteSpec[] = SPOOKY_DECORATIONS.slice(0, 18).map((d) => {
  const entry = PAINT[d.id] ?? { height: 40, paint: fallback };
  return { key: `deco:${d.id}`, fw: d.w, fh: d.h, height: entry.height, paint: entry.paint };
});

export const icons: IconSpec[] = [];
