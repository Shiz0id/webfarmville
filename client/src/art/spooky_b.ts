// Halloween decorations, part B: the back half of the Spooky set, from the stacked
// pumpkin tower through the Candy Shop exclusives. Painted in code with the shared kit.
import { type IconSpec, type Pen, type Pt, type SpriteSpec, OUTLINE, rgba, shade } from './kit';
import { SPOOKY_DECORATIONS } from '@farm/shared';

const O = OUTLINE;
const TAU = Math.PI * 2;
const WHITE = '#ffffff';
const INK = '#2a1f2e';
const BLUSH = '#ff8fb1';
const WOOD = '#b07a4a';
const PUMPKIN = '#f28a2e';
const CUT_EDGE = '#7a3510';
const GOLD = '#f4c24a';
const LEAF = '#5f9a3a';
const LIME = '#9be05a';
const PURPLE = '#7b4fc4';
const HAT = '#3e3352';
const GHOST_EDGE = '#6e5c96';

type Fill = string | CanvasGradient | null;

// ---------------------------------------------------------------------------
// Helpers

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

function qpt(a: Pt, c: Pt, b: Pt, t: number): Pt {
  const s = 1 - t;
  return { x: s * s * a.x + 2 * s * t * c.x + t * t * b.x, y: s * s * a.y + 2 * s * t * c.y + t * t * b.y };
}

/** An outlined thick stroke along a quadratic curve (trunks, branches, ribbons). */
function thickCurve(p: Pen, a: Pt, c: Pt, b: Pt, w: number, color: string): void {
  p.curve(a, c, b, O, w + 2);
  p.curve(a, c, b, color, w);
}

function withXform(p: Pen, x: number, y: number, rot: number, fn: () => void, s = 1): void {
  const c = p.ctx;
  c.save();
  c.translate(x, y);
  c.rotate(rot);
  c.scale(s, s);
  fn();
  c.restore();
}

/** Draw on a vertical face: x runs along the face (screen-right), y = -z. slope 0.5 for faces along u. */
function onFace(p: Pen, o: Pt, slope: number, fn: () => void): void {
  const c = p.ctx;
  c.save();
  c.translate(o.x, o.y);
  c.transform(1, slope, 0, 1, 0, 0);
  fn();
  c.restore();
}

function post(p: Pen, x: number, y: number, ht: number, color = WOOD, w = 4): void {
  p.ellipse(x, y, w * 0.95, w * 0.42, shade(color, -0.25));
  p.rect(x - w / 2, y - ht, w, ht, hgrad(p, x - w / 2, x + w / 2, shade(color, 0.18), shade(color, -0.22)));
  p.ellipse(x, y - ht, w / 2, w / 4, shade(color, 0.3));
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

function bat(p: Pen, x: number, y: number, s: number, body = '#3b2f4a'): void {
  const c = p.ctx;
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

function wrappedCandy(p: Pen, x: number, y: number, color: string, ang: number, s = 1): void {
  withXform(
    p,
    x,
    y,
    ang,
    () => {
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
    p.ellipse(-0.8, -0.7, 0.9, 0.5, rgba(WHITE, 0.7), null);
    },
    s,
  );
}

function candyCorn(p: Pen, x: number, y: number, ang: number): void {
  withXform(p, x, y, ang, () => {
    p.poly(
      [
        { x: -2.6, y: 2 },
        { x: 2.6, y: 2 },
        { x: 0, y: -3.6 },
      ],
      WHITE,
    );
    p.poly(
      [
        { x: -2.6, y: 2 },
        { x: 2.6, y: 2 },
        { x: 1.7, y: 0.2 },
        { x: -1.7, y: 0.2 },
      ],
      '#ffd23f',
      null,
    );
    p.poly(
      [
        { x: -1.7, y: 0.2 },
        { x: 1.7, y: 0.2 },
        { x: 0.8, y: -1.7 },
        { x: -0.8, y: -1.7 },
      ],
      '#ff8c1a',
      null,
    );
  });
}

function envelope(p: Pen, x: number, y: number, rot: number): void {
  withXform(p, x, y, rot, () => {
    p.rect(-4.5, -2.8, 9, 5.6, '#fffaf0', O);
    p.line(
      [
        { x: -4.5, y: -2.8 },
        { x: 0, y: 0.6 },
        { x: 4.5, y: -2.8 },
      ],
      '#c9b59a',
      0.7,
    );
    p.rect(2.2, -2.2, 1.8, 1.6, '#ff5b6b', null);
  });
}

/** Ghost silhouette: a dome of radius r centred on (x, y) with a three-scallop hem below. */
function ghostPath(p: Pen, x: number, y: number, r: number): void {
  const c = p.ctx;
  const hem = y + r * 1.15;
  c.beginPath();
  c.moveTo(x - r, y);
  c.arc(x, y, r, Math.PI, 0);
  c.lineTo(x + r, hem);
  const n = 3;
  const sw = (2 * r) / n;
  for (let i = 0; i < n; i++) {
    const xa = x + r - i * sw;
    c.quadraticCurveTo(xa - sw / 2, hem + r * 0.4, xa - sw, hem);
  }
  c.closePath();
}

/** Kawaii face: dot eyes with a white glint, blush, and a small smile. e = eye radius, d = half eye spacing. */
function kface(p: Pen, x: number, y: number, e: number, d: number, blush = true): void {
  for (const s of [-1, 1]) {
    p.ellipse(x + s * d, y, e * 0.85, e, INK, null);
    p.circle(x + s * d - e * 0.32, y - e * 0.42, e * 0.36, WHITE, null);
  }
  if (blush) {
    for (const s of [-1, 1]) p.ellipse(x + s * (d + e * 1.35), y + e * 1.3, e * 1.0, e * 0.6, rgba(BLUSH, 0.85), null);
  }
  p.curve({ x: x - e * 1.0, y: y + e * 1.0 }, { x, y: y + e * 2.3 }, { x: x + e * 1.0, y: y + e * 1.0 }, INK, Math.max(0.6, e * 0.36));
}

/** Happy closed eyes (^ ^). */
function happyEyes(p: Pen, x: number, y: number, e: number, d: number): void {
  for (const s of [-1, 1]) {
    p.curve(
      { x: x + s * d - e * 0.9, y: y + e * 0.4 },
      { x: x + s * d, y: y - e * 1.0 },
      { x: x + s * d + e * 0.9, y: y + e * 0.4 },
      INK,
      Math.max(0.8, e * 0.42),
    );
  }
}

function pumpkinGlow(p: Pen, x: number, y: number, r: number): void {
  p.glow(x, y, r * 2.4, '#ffb347', 0.42);
}

/** A plump three-lobed pumpkin body centred on (x, y). */
function pumpkinBody(p: Pen, x: number, y: number, r: number, color: string): void {
  const side = shade(color, -0.12);
  for (const dx of [-0.36, 0.36]) {
    const sx = x + r * dx;
    p.ellipse(sx, y, r * 0.66, r * 0.82, radial(p, sx, y, r, shade(side, 0.15), shade(side, -0.2)));
  }
  p.ellipse(x, y, r * 0.62, r * 0.9, radial(p, x, y, r, shade(color, 0.35), shade(color, -0.06)));
}

/** Leafy stem; (x, y) is its base. */
function pumpkinStem(p: Pen, x: number, y: number, s: number): void {
  p.poly(
    [
      { x: x - 1.5 * s, y: y + 0.5 },
      { x: x - 1 * s, y: y - 3.6 * s },
      { x: x + 1.8 * s, y: y - 4.4 * s },
      { x: x + 1.5 * s, y: y + 0.5 },
    ],
    '#6f8d3a',
  );
}

/** Carved features that glow from inside. expr 0 goofy grin, 1 happy and silly, 2 wink and zig-zag. */
function carve(p: Pen, x: number, y: number, r: number, expr: number): void {
  const c = p.ctx;
  const lit = radial(p, x, y, r * 0.6, '#fffbd0', '#ffb72e');
  const w = Math.max(0.6, r * 0.06);
  if (expr === 0) {
    for (const s of [-1, 1]) p.circle(x + s * r * 0.36, y - r * 0.2, r * 0.17, lit, CUT_EDGE);
    c.beginPath();
    c.moveTo(x - r * 0.5, y + r * 0.12);
    c.quadraticCurveTo(x, y + r * 0.98, x + r * 0.5, y + r * 0.12);
    c.closePath();
    fs(p, lit, CUT_EDGE, w);
    for (const tx of [-0.25, 0, 0.25]) {
      p.poly(
        [
          { x: x + tx * r - r * 0.08, y: y + r * 0.12 },
          { x: x + tx * r + r * 0.08, y: y + r * 0.12 },
          { x: x + tx * r, y: y + r * 0.38 },
        ],
        '#f7a447',
        CUT_EDGE,
        w,
      );
    }
  } else if (expr === 1) {
    for (const s of [-1, 1]) {
      const ex = x + s * r * 0.36;
      c.beginPath();
      c.moveTo(ex - r * 0.2, y - r * 0.08);
      c.quadraticCurveTo(ex, y - r * 0.55, ex + r * 0.2, y - r * 0.08);
      c.quadraticCurveTo(ex, y - r * 0.3, ex - r * 0.2, y - r * 0.08);
      c.closePath();
      fs(p, lit, CUT_EDGE, w);
    }
    p.ellipse(x, y + r * 0.42, r * 0.17, r * 0.22, lit, CUT_EDGE);
    p.ellipse(x + r * 0.02, y + r * 0.7, r * 0.1, r * 0.1, '#ff7f9f', null);
  } else {
    c.beginPath();
    c.moveTo(x - r * 0.44, y - r * 0.08);
    c.lineTo(x - r * 0.14, y - r * 0.08);
    c.lineTo(x - r * 0.29, y - r * 0.46);
    c.closePath();
    fs(p, lit, CUT_EDGE, w);
    p.curve(
      { x: x + r * 0.14, y: y - r * 0.08 },
      { x: x + r * 0.29, y: y - r * 0.5 },
      { x: x + r * 0.44, y: y - r * 0.08 },
      '#fff3a0',
      Math.max(1, r * 0.12),
    );
    c.beginPath();
    c.moveTo(x - r * 0.5, y + r * 0.1);
    c.lineTo(x + r * 0.5, y + r * 0.1);
    c.lineTo(x + r * 0.42, y + r * 0.5);
    c.lineTo(x + r * 0.22, y + r * 0.22);
    c.lineTo(x + r * 0.02, y + r * 0.5);
    c.lineTo(x - r * 0.18, y + r * 0.22);
    c.lineTo(x - r * 0.38, y + r * 0.5);
    c.closePath();
    fs(p, lit, CUT_EDGE, w);
  }
  p.glow(x, y, r * 0.7, '#ffe27a', 0.22);
}

/** A whole jack-o'-lantern (glow is added by the caller, so stacks don't wash each other). */
function jackPumpkin(p: Pen, x: number, y: number, r: number, color: string, expr: number): void {
  pumpkinBody(p, x, y, r, color);
  pumpkinStem(p, x + r * 0.1, y - r * 0.86, r / 12);
  carve(p, x, y, r, expr);
}

/** Tiny glowing features for very small lanterns. */
function miniGlow(p: Pen, x: number, y: number, r: number): void {
  for (const s of [-1, 1]) p.circle(x + s * r * 0.36, y - r * 0.12, r * 0.24, '#fff6b0', null);
  p.curve({ x: x - r * 0.35, y: y + r * 0.3 }, { x, y: y + r * 0.8 }, { x: x + r * 0.35, y: y + r * 0.3 }, '#fff6b0', 0.7);
}

/** Pulls a text label into a width, outlined so it reads on any wood. */
function fitText(p: Pen, s: string, x: number, y: number, maxW: number, size: number, color: string, edge: string): void {
  const c = p.ctx;
  let px = size;
  c.font = `bold ${px}px "Trebuchet MS", sans-serif`;
  const w = c.measureText(s).width;
  if (w > maxW) px = (px * maxW) / w;
  c.font = `bold ${px}px "Trebuchet MS", sans-serif`;
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.lineJoin = 'round';
  c.lineWidth = Math.max(1.2, px * 0.22);
  c.strokeStyle = edge;
  c.strokeText(s, x, y);
  c.fillStyle = color;
  c.fillText(s, x, y);
}

/** A small lollipop head with a swirl; the stick is drawn separately. */
function lollipopHead(p: Pen, x: number, y: number, r: number, c1: string, c2: string): void {
  p.ball(x, y, r, c1);
  const pts: Pt[] = [];
  for (let i = 0; i <= 30; i++) {
    const t = i / 30;
    const a = t * TAU * 2.2;
    const rr = r * 0.82 * t;
    pts.push({ x: x + Math.cos(a) * rr, y: y + Math.sin(a) * rr });
  }
  p.line(pts, c2, Math.max(0.7, r * 0.2));
  p.ellipse(x - r * 0.42, y - r * 0.45, r * 0.2, r * 0.13, rgba(WHITE, 0.75), null, -0.6);
}

function gumdrop(p: Pen, x: number, y: number, r: number, color: string): void {
  p.ellipse(x, y, r, r * 0.8, radial(p, x, y, r, shade(color, 0.4), shade(color, -0.22)));
  const dots = [
    { dx: -0.4, dy: -0.2 },
    { dx: 0.3, dy: 0.15 },
    { dx: 0.05, dy: -0.5 },
  ];
  for (const d of dots) p.circle(x + d.dx * r, y + d.dy * r, Math.max(0.6, r * 0.12), WHITE, null);
  p.ellipse(x - r * 0.4, y - r * 0.42, r * 0.2, r * 0.12, rgba(WHITE, 0.7), null, -0.5);
}

/** A tan sack with a tied neck and a tiny ghost print. */
function sack(p: Pen, x: number, y: number, w: number, h: number, color: string): void {
  const c = p.ctx;
  const top = y - h;
  c.beginPath();
  c.moveTo(x - w * 0.16, top + 2);
  c.quadraticCurveTo(x - w * 0.52, top + h * 0.42, x - w * 0.5, y - h * 0.3);
  c.quadraticCurveTo(x - w * 0.5, y + 1, x, y + 1);
  c.quadraticCurveTo(x + w * 0.5, y + 1, x + w * 0.5, y - h * 0.3);
  c.quadraticCurveTo(x + w * 0.52, top + h * 0.42, x + w * 0.16, top + 2);
  c.closePath();
  fs(p, hgrad(p, x - w / 2, x + w / 2, shade(color, 0.2), shade(color, -0.2)));
  p.ellipse(x, top + 2, w * 0.2, 2.2, shade(color, -0.3));
}

// ---------------------------------------------------------------------------
// Pumpkins and seasonal sets

function pumpkinTower(p: Pen): void {
  const { x, y } = p.center;
  p.shadow(x, y + 1, 17, 7);
  const tiers = [
    { cx: x, cy: y - 14, r: 15, color: PUMPKIN, expr: 0 },
    { cx: x + 1.2, cy: y - 37, r: 11, color: '#ff9a3c', expr: 1 },
    { cx: x - 0.8, cy: y - 54.5, r: 8.4, color: '#ffb35c', expr: 2 },
  ];
  for (const t of tiers) pumpkinGlow(p, t.cx, t.cy, t.r);
  for (const t of tiers) jackPumpkin(p, t.cx, t.cy, t.r, t.color, t.expr);
  sparkle(p, x - 21, y - 40, 2.6);
  sparkle(p, x + 21, y - 58, 2.2);
}

function jackStringLights(p: Pen, frame = 0): void {
  const a = p.iso(0.22, 0.5);
  const b = p.iso(1.78, 0.5);
  const H = 46;
  p.shadow(a.x, a.y + 1, 6, 3);
  p.shadow(b.x, b.y + 1, 6, 3);
  post(p, a.x, a.y, H, WOOD, 4);
  post(p, b.x, b.y, H, WOOD, 4);
  const ta = { x: a.x, y: a.y - H };
  const tb = { x: b.x, y: b.y - H };
  const mid = { x: (ta.x + tb.x) / 2, y: (ta.y + tb.y) / 2 };
  const ctrl = { x: mid.x, y: mid.y + 20 };
  p.curve(ta, ctrl, tb, '#3d3550', 0.9);
  const lights: Pt[] = [];
  for (let i = 0; i < 7; i++) lights.push(qpt(ta, ctrl, tb, 0.14 + i * 0.12));
  // twinkle: on frame 1 alternate pumpkins flare and dim (frame 0 is the steady glow)
  lights.forEach((q, i) => {
    const g = frame === 0 ? [11, 0.5] : (i + frame) % 2 === 0 ? [14, 0.9] : [8, 0.15];
    p.glow(q.x, q.y + 7, g[0], '#ffd45c', g[1]);
  });
  for (const q of lights) {
    p.line([q, { x: q.x, y: q.y + 2.5 }], '#3d3550', 0.7);
    const cy = q.y + 7;
    pumpkinBody(p, q.x, cy, 4.2, PUMPKIN);
    pumpkinStem(p, q.x, cy - 3.6, 0.35);
    miniGlow(p, q.x, cy, 4.2);
  }
}

function treatBags(p: Pen): void {
  const { x, y } = p.center;
  p.shadow(x, y + 1, 22, 9);
  // ghost sack, back left
  const sx = x - 12;
  sack(p, sx, y - 1, 22, 27, '#e7ddff');
  ghostPath(p, sx, y - 14, 4.6);
  fs(p, radial(p, sx, y - 14, 5, WHITE, '#ddd3f5'), GHOST_EDGE, 0.6);
  p.circle(sx - 1.6, y - 14.6, 0.9, INK, null);
  p.circle(sx + 1.6, y - 14.6, 0.9, INK, null);
  p.ellipse(sx - 2.8, y - 12.6, 0.9, 0.5, rgba(BLUSH, 0.8), null);
  p.ellipse(sx + 2.8, y - 12.6, 0.9, 0.5, rgba(BLUSH, 0.8), null);
  p.glow(x + 10, y - 9, 12, '#ffb347', 0.2);
  // pumpkin pail, right, with its wire handle behind
  thickCurve(p, { x: x + 3, y: y - 16 }, { x: x + 10, y: y - 31 }, { x: x + 17, y: y - 16 }, 1.6, INK);
  pumpkinGlow(p, x + 10, y - 9, 9);
  jackPumpkin(p, x + 10, y - 9, 9, PUMPKIN, 1);
  // candy spilling out in front
  wrappedCandy(p, x - 7, y + 2, '#ff6b8a', 0.3, 1.4);
  wrappedCandy(p, x + 5, y + 5, PURPLE, -0.2, 1.4);
  wrappedCandy(p, x - 17, y + 4, LIME, 0.5, 1.4);
  candyCorn(p, x + 17, y + 3.5, 0.4);
  candyCorn(p, x - 1, y + 6, -0.7);
  lollipopHead(p, x + 0.5, y + 1, 3.2, '#ff8c42', WHITE);
  p.line(
    [
      { x: x + 0.5, y: y + 4.2 },
      { x: x + 2.6, y: y + 9 },
    ],
    WHITE,
    1.2,
  );
}

// ---------------------------------------------------------------------------
// Trees, mushrooms and night creatures

function hauntedTree(p: Pen): void {
  const { x, y } = p.center;
  p.shadow(x, y + 1, 19, 8);
  const bark = '#6e4f6e';
  const base = { x, y };
  const c1 = { x: x - 7, y: y - 22 };
  const b1 = { x: x - 1, y: y - 46 };
  thickCurve(p, { x: x - 4, y }, { x: x - 9, y: y - 1 }, { x: x - 13, y: y + 2 }, 2, bark);
  thickCurve(p, { x: x + 4, y }, { x: x + 9, y: y - 1 }, { x: x + 13, y: y + 2 }, 2, bark);
  // bare branches with curly tips (drawn before the trunk so their roots tuck behind it)
  thickCurve(p, { x: x - 2, y: y - 38 }, { x: x - 12, y: y - 44 }, { x: x - 18, y: y - 58 }, 2.6, bark);
  thickCurve(p, { x: x - 18, y: y - 58 }, { x: x - 22, y: y - 63 }, { x: x - 25, y: y - 57 }, 1.4, bark);
  thickCurve(p, { x: x, y: y - 40 }, { x: x + 11, y: y - 46 }, { x: x + 16, y: y - 58 }, 2.6, bark);
  thickCurve(p, { x: x + 16, y: y - 58 }, { x: x + 19, y: y - 64 }, { x: x + 24, y: y - 61 }, 1.4, bark);
  thickCurve(p, { x: x - 1, y: y - 60 }, { x: x - 6, y: y - 66 }, { x: x - 6, y: y - 74 }, 2, bark);
  thickCurve(p, { x: x + 1, y: y - 64 }, { x: x + 5, y: y - 70 }, { x: x + 10, y: y - 71 }, 1.4, bark);
  // trunk and its upper stretch
  thickCurve(p, base, c1, b1, 15, bark);
  thickCurve(p, b1, { x: x - 2, y: y - 58 }, { x: x + 1, y: y - 66 }, 7, bark);
  thickCurve(p, { x: x + 1, y: y - 66 }, { x: x + 3, y: y - 73 }, { x: x + 7, y: y - 79 }, 2.4, bark);
  // the friendly face, carved into a lighter bark patch
  const f = qpt(base, c1, b1, 0.5);
  p.glow(f.x, f.y, 12, '#c8ff7a', 0.22);
  p.ellipse(f.x, f.y, 6, 7, '#9a7698', O);
  for (const s of [-1, 1]) {
    p.circle(f.x + s * 2.6, f.y - 1.6, 2.2, INK, null);
    p.circle(f.x + s * 2.6 - 0.7, f.y - 2.3, 0.7, WHITE, null);
    p.ellipse(f.x + s * 3.9, f.y + 1.8, 1.2, 0.7, rgba(BLUSH, 0.85), null);
  }
  const c = p.ctx;
  c.beginPath();
  c.moveTo(f.x - 2.8, f.y + 2.2);
  c.quadraticCurveTo(f.x, f.y + 6.2, f.x + 2.8, f.y + 2.2);
  c.quadraticCurveTo(f.x, f.y + 3.9, f.x - 2.8, f.y + 2.2);
  c.closePath();
  fs(p, INK, null);
  // hanging lantern
  const lx = x + 15;
  const ly = y - 42;
  p.line(
    [
      { x: x + 14, y: y - 55 },
      { x: lx, y: ly - 6 },
    ],
    O,
    0.8,
  );
  p.glow(lx, ly, 13, '#ffb347', 0.5);
  p.roundRect(lx - 3.4, ly - 4.5, 6.8, 9.5, 2.2, radial(p, lx, ly, 6, '#fff3a0', '#ff9a2e'));
  p.rect(lx - 2.4, ly - 6, 4.8, 1.6, '#3d3550');
  p.rect(lx - 2.4, ly + 4.4, 4.8, 1.6, '#3d3550');
  bat(p, x - 21, y - 68, 3.6);
  bat(p, x + 22, y - 76, 3.1);
}

/** A small mushroom: stem, underside rim, shaded dome and white spots. (mx, my) is the stem base. */
function mushroom(p: Pen, mx: number, my: number, s: number, cap: string): void {
  const stemH = 6 * s;
  const cy = my - stemH;
  const rx = 6.2 * s;
  const ry = 5.2 * s;
  p.glow(mx, cy, 9 * s, cap, 0.4);
  p.poly(
    [
      { x: mx - 2 * s, y: my },
      { x: mx - 1.4 * s, y: cy },
      { x: mx + 1.4 * s, y: cy },
      { x: mx + 2 * s, y: my },
    ],
    '#f4eeff',
  );
  p.ellipse(mx, cy, rx, ry * 0.36, shade(cap, -0.35));
  const c = p.ctx;
  c.beginPath();
  c.ellipse(mx, cy, rx, ry, 0, Math.PI, TAU);
  c.closePath();
  fs(p, radial(p, mx - rx * 0.3, cy - ry * 0.6, rx, shade(cap, 0.45), shade(cap, -0.12)));
  const spots = [
    { dx: -3, dy: -2.4, r: 1 },
    { dx: 2.6, dy: -2.8, r: 1.2 },
    { dx: 0.2, dy: -4.4, r: 0.8 },
  ];
  for (const sp of spots) p.circle(mx + sp.dx * s, cy + sp.dy * s, sp.r * s, rgba(WHITE, 0.9), null);
}

function glowMushrooms(p: Pen): void {
  const { x, y } = p.center;
  p.shadow(x, y + 1, 19, 8, 0.18);
  p.ellipse(x, y + 0.5, 21, 8.5, rgba('#6a4c9e', 0.4), null);
  p.glow(x, y - 9, 22, '#b98aff', 0.42);
  p.glow(x, y - 5, 12, '#7ff0e0', 0.25);
  const caps = ['#9b6bff', '#4fe0d0', '#e879f9', '#7ef0a0', '#b98aff', '#5fd4ff'];
  const specs: { x: number; y: number; s: number; cap: string }[] = [];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * TAU + 0.3;
    specs.push({ x: x + Math.cos(a) * 15, y: y + 2 + Math.sin(a) * 7, s: i % 2 ? 1.15 : 1.32, cap: caps[i] });
  }
  specs.push({ x, y: y + 1, s: 0.9, cap: '#ffb0f0' });
  specs.sort((a, b) => a.y - b.y);
  for (const m of specs) mushroom(p, m.x, m.y, m.s, m.cap);
  sparkle(p, x - 20, y - 24, 2.4, '#e9fff9');
  sparkle(p, x + 19, y - 30, 2.8, '#f6e6ff');
  const flies = [
    { x: x - 14, y: y - 18 },
    { x: x + 12, y: y - 22 },
    { x: x + 3, y: y - 36 },
  ];
  for (const f of flies) {
    p.glow(f.x, f.y, 4, '#f6ffb0', 0.9);
    p.circle(f.x, f.y, 0.9, '#fffde0', null);
  }
}

function owlPerch(p: Pen): void {
  const { x, y } = p.center;
  p.shadow(x, y + 1, 12, 5);
  const bar = y - 30;
  const body = '#a9805a';
  const bodyDk = shade(body, -0.25);
  post(p, x, y, 30, WOOD, 4.5);
  p.roundRect(x - 15, bar - 2.6, 30, 5.2, 2.4, hgrad(p, x - 15, x + 15, shade(WOOD, 0.22), shade(WOOD, -0.18)));
  // moon charm on a string off the right end of the perch
  const mx = x + 14;
  const my = bar + 12.5;
  p.line(
    [
      { x: mx, y: bar + 2.6 },
      { x: mx, y: my - 3.6 },
    ],
    '#3d3550',
    0.6,
  );
  p.glow(mx, my, 9, '#fff3b0', 0.45);
  const c = p.ctx;
  c.beginPath();
  c.arc(mx, my, 3.4, -1.9, 1.9);
  c.strokeStyle = O;
  c.lineWidth = 4.2;
  c.stroke();
  c.strokeStyle = '#ffe27a';
  c.lineWidth = 2.4;
  c.stroke();
  // wings, body, ear tufts and face
  p.ellipse(x - 9, bar - 12, 3.4, 6.5, bodyDk, O, 0.2);
  p.ellipse(x + 9, bar - 12, 3.4, 6.5, bodyDk, O, -0.2);
  p.ellipse(x, bar - 12, 10.5, 12, radial(p, x - 2, bar - 16, 12, shade(body, 0.2), shade(body, -0.1)));
  p.poly(
    [
      { x: x - 8, y: bar - 22 },
      { x: x - 10.5, y: bar - 33 },
      { x: x - 3.5, y: bar - 28.5 },
    ],
    body,
  );
  p.poly(
    [
      { x: x + 8, y: bar - 22 },
      { x: x + 10.5, y: bar - 33 },
      { x: x + 3.5, y: bar - 28.5 },
    ],
    body,
  );
  p.ellipse(x, bar - 21, 9, 7.5, radial(p, x, bar - 21, 9, '#f8ead0', '#e9cfa0'));
  for (const s of [-1, 1]) {
    p.curve({ x: x + s * 3.6 - 2.2, y: bar - 21.5 }, { x: x + s * 3.6, y: bar - 19.2 }, { x: x + s * 3.6 + 2.2, y: bar - 21.5 }, INK, 0.9);
    p.ellipse(x + s * 6, bar - 18, 1.6, 1, rgba(BLUSH, 0.7), null);
  }
  p.poly(
    [
      { x: x - 1.5, y: bar - 19 },
      { x: x + 1.5, y: bar - 19 },
      { x, y: bar - 16.6 },
    ],
    '#ffb347',
    O,
    0.7,
  );
  p.ellipse(x, bar - 9, 6, 6.8, radial(p, x, bar - 9, 6, '#fff3dc', '#f0dcb5'));
  for (const dx of [-3, 0, 3]) {
    p.curve({ x: x + dx - 1.4, y: bar - 7 }, { x: x + dx, y: bar - 5.2 }, { x: x + dx + 1.4, y: bar - 7 }, bodyDk, 0.6);
  }
  p.ellipse(x - 3.2, bar - 1.2, 2.2, 1.3, '#ffb347');
  p.ellipse(x + 3.2, bar - 1.2, 2.2, 1.3, '#ffb347');
  // tiny witch hat, tip bent to one side
  p.ellipse(x, bar - 29.5, 8.2, 2.2, HAT);
  c.beginPath();
  c.moveTo(x - 5.6, bar - 29.5);
  c.quadraticCurveTo(x - 3.5, bar - 38, x + 3.5, bar - 43.5);
  c.quadraticCurveTo(x + 1.8, bar - 38, x + 5.8, bar - 29.5);
  c.closePath();
  fs(p, hgrad(p, x - 6, x + 6, shade(HAT, 0.22), shade(HAT, -0.12)));
  p.ellipse(x + 0.2, bar - 31.2, 5.6, 1.1, '#ff8c42', null);
  p.rect(x - 1, bar - 32.2, 2.2, 2, GOLD);
  p.text('z', x + 11, bar - 36, 7, PURPLE);
}

// ---------------------------------------------------------------------------
// Decor, signs and stalls

function witchHatPlanter(p: Pen): void {
  const { x, y } = p.center;
  p.shadow(x, y + 1, 22, 9);
  const c = p.ctx;
  // the hat's cone, with its tip cut off to make room for soil
  c.beginPath();
  c.moveTo(x - 12, y - 8);
  c.quadraticCurveTo(x - 10, y - 28, x - 7.5, y - 40);
  c.lineTo(x + 7.5, y - 40);
  c.quadraticCurveTo(x + 10, y - 28, x + 12, y - 8);
  c.closePath();
  fs(p, hgrad(p, x - 12, x + 12, shade(HAT, 0.22), shade(HAT, -0.12)));
  p.ellipse(x, y - 40, 7.5, 2.6, '#6b4a33');
  // brim
  p.ellipse(x, y - 8, 20, 6, radial(p, x, y - 8, 20, shade(HAT, 0.2), shade(HAT, -0.2)));
  // orange band and gold buckle
  p.poly(
    [
      { x: x - 11.2, y: y - 14 },
      { x: x + 11.2, y: y - 14 },
      { x: x + 10.5, y: y - 19 },
      { x: x - 10.5, y: y - 19 },
    ],
    '#f08a2e',
  );
  p.rect(x - 2, y - 18.6, 4, 3.4, GOLD);
  p.star(x + 4.5, y - 29, 2.2, GOLD);
  // purple flowers spilling out of the top, and some down the sides
  leaf(p, x - 5, y - 41, 6, -2.4, LEAF);
  leaf(p, x + 5, y - 42, 6, -0.7, LEAF);
  p.flower(x - 4, y - 46, 3.2, '#b07cff');
  p.flower(x + 3.5, y - 49, 3.6, '#c79bff');
  p.flower(x - 0.5, y - 53, 2.8, '#9d6bff');
  p.flower(x - 9.5, y - 26, 2.6, '#b07cff');
  p.flower(x + 10, y - 21, 2.4, '#c79bff');
}

function ghostSwing(p: Pen): void {
  const { x, y } = p.center;
  p.shadow(x, y + 1, 20, 8);
  const bark = '#7d5a45';
  const rope = '#5b4a3a';
  // tree: trunk, then a branch that reaches over the swing, then the foliage
  thickCurve(p, { x: x - 11, y }, { x: x - 11, y: y - 16 }, { x: x - 9, y: y - 30 }, 6.5, bark);
  thickCurve(p, { x: x - 10, y: y - 30 }, { x: x - 2, y: y - 35 }, { x: x + 18, y: y - 35 }, 3, bark);
  p.foliage(x - 9, y - 44, 17, '#8dc85a', 'swing', 7);
  // ropes and the seat
  p.line(
    [
      { x: x - 3, y: y - 35 },
      { x: x - 4, y: y - 15 },
    ],
    rope,
    1.1,
  );
  p.line(
    [
      { x: x + 17, y: y - 35 },
      { x: x + 18, y: y - 15 },
    ],
    rope,
    1.1,
  );
  p.roundRect(x - 5, y - 15, 24, 4, 1.6, hgrad(p, x - 5, x + 19, shade(WOOD, 0.15), shade(WOOD, -0.18)));
  // the happy ghost, riding the swing (its hem hovers just above the seat)
  const cx = x + 7;
  const r = 8;
  const cy = y - 26;
  p.glow(cx, cy, 16, '#ffffff', 0.3);
  p.ellipse(cx - 9, cy - 4, 3.2, 1.8, '#f4f0ff', O, -0.9);
  p.ellipse(cx + 9, cy - 4, 3.2, 1.8, '#f4f0ff', O, 0.9);
  ghostPath(p, cx, cy, r);
  fs(p, radial(p, cx - 2, cy - 2, r * 1.3, WHITE, '#d9d0f2'));
  happyEyes(p, cx, cy - 0.8, 1.3, 3);
  for (const s of [-1, 1]) p.ellipse(cx + s * 5, cy + 2, 1.2, 0.7, rgba(BLUSH, 0.85), null);
  p.ellipse(cx, cy + 3.8, 1.1, 1.4, INK, null);
  // a little pumpkin at the roots
  pumpkinBody(p, x - 22, y - 4, 4.6, PUMPKIN);
  pumpkinStem(p, x - 22, y - 4 - 0.86 * 4.6, 0.4);
}

function moonPhotoBooth(p: Pen): void {
  const o = p.iso(0.2, 0.5);
  const len = 1.6 * 32;
  // Board coordinates (bx along the board, by up) mapped to screen. Round things are drawn
  // upright at these points, so only the frame carries the board's slope.
  const at = (bx: number, by: number) => ({ x: o.x + bx, y: o.y + by + bx * 0.5 });
  const ground = p.iso(1, 0.75);
  p.shadow(ground.x, ground.y + 1, 30, 10, 0.2);
  onFace(p, o, 0.5, () => {
    const c = p.ctx;
    // little feet, then the board itself
    p.rect(8, -6, 4, 6, shade(WOOD, -0.3));
    p.rect(len - 12, -6, 4, 6, shade(WOOD, -0.3));
    p.roundRect(1, -64, len - 2, 60, 3, hgrad(p, 0, len, shade(WOOD, 0.22), shade(WOOD, -0.15)));
    // night sky inside the frame
    const night = c.createLinearGradient(0, -60, 0, -8);
    night.addColorStop(0, '#5a3c9a');
    night.addColorStop(1, '#2c1d5c');
    p.roundRect(4, -60, len - 8, 52, 2, night, null);
    // festive bunting along the top
    const bw = (len - 12) / 6;
    const flagColours = ['#ff8c42', LIME, '#ff8fb1'];
    for (let i = 0; i < 6; i++) {
      const bx = 6 + i * bw;
      p.poly(
        [
          { x: bx, y: -60 },
          { x: bx + bw, y: -60 },
          { x: bx + bw / 2, y: -54.5 },
        ],
        flagColours[i % 3],
        O,
        0.6,
      );
    }
  });
  // big glowing harvest moon with craters
  const moon = at(33, -38);
  p.glow(moon.x, moon.y, 22, '#ffd27a', 0.5);
  p.circle(moon.x, moon.y, 11, radial(p, moon.x, moon.y, 11, '#fff6c4', '#ffb347'));
  const craters = [
    { dx: -4, dy: -3, r: 2.2 },
    { dx: 3, dy: 5, r: 1.6 },
    { dx: -2, dy: 4.5, r: 1.1 },
  ];
  for (const k of craters) p.circle(moon.x + k.dx, moon.y + k.dy, k.r, rgba('#e0883a', 0.6), null);
  const star1 = at(44, -50);
  const star2 = at(18, -50);
  sparkle(p, star1.x, star1.y, 1.8, WHITE);
  sparkle(p, star2.x, star2.y, 1.6, '#fff6c0');
  const b1 = at(24, -46);
  const b2 = at(44, -24);
  bat(p, b1.x, b1.y, 2.9);
  bat(p, b2.x, b2.y, 2.6);
  // cut-out face hole, ringed with lights
  const hole = at(13, -28);
  p.ellipse(hole.x, hole.y, 8.6, 10.4, GOLD);
  p.ellipse(hole.x, hole.y, 6.2, 8, '#ffe9b8', null);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TAU;
    p.circle(hole.x + Math.cos(a) * 9.6, hole.y + Math.sin(a) * 11.6, 1.1, '#fff7b0', null);
  }
  // props on a little table in front of the booth
  p.box(1.0, 0.85, 0.42, 0.3, 6, WOOD);
  const top = p.iso(1.21, 1.0, 6);
  pumpkinGlow(p, top.x - 4, top.y - 6, 4.5);
  jackPumpkin(p, top.x - 4, top.y - 5, 4.5, PUMPKIN, 1);
  // witch hat prop
  p.ellipse(top.x + 6, top.y - 3, 5, 1.6, HAT);
  p.poly(
    [
      { x: top.x + 3.2, y: top.y - 3 },
      { x: top.x + 8.8, y: top.y - 3 },
      { x: top.x + 6.8, y: top.y - 13 },
    ],
    HAT,
  );
  p.rect(top.x + 3.6, top.y - 5, 5.2, 1.6, '#ff8c42', null);
}

function monsterMailbox(p: Pen): void {
  const { x, y } = p.center;
  p.shadow(x + 2, y + 1, 14, 5);
  post(p, x, y, 22, WOOD, 4);
  const top = y - 40;
  const bot = y - 20;
  const purple = '#8e5cc9';
  // flag
  p.line(
    [
      { x: x + 14, y: top + 6 },
      { x: x + 14, y: top - 8 },
    ],
    O,
    0.8,
  );
  p.poly(
    [
      { x: x + 14, y: top - 8 },
      { x: x + 19.5, y: top - 6.5 },
      { x: x + 14, y: top - 4.5 },
    ],
    '#ff5b6b',
  );
  // depth side, front, and domed lid
  p.poly(
    [
      { x: x + 11, y: top + 1 },
      { x: x + 15, y: top - 2 },
      { x: x + 15, y: bot - 2 },
      { x: x + 11, y: bot },
    ],
    shade(purple, -0.25),
  );
  p.roundRect(x - 11, top + 1, 22, bot - top - 1, 2.5, hgrad(p, x - 11, x + 11, shade(purple, 0.15), shade(purple, -0.1)));
  const c = p.ctx;
  c.beginPath();
  c.moveTo(x - 11, top + 1);
  c.quadraticCurveTo(x, top - 10, x + 11, top + 1);
  c.closePath();
  fs(p, shade(purple, 0.25));
  // googly eyes poking over the lid
  for (const s of [-1, 1]) {
    const ex = x + s * 5.2;
    p.circle(ex, top - 0.5, 3.4, WHITE);
    p.circle(ex + 0.8, top + 0.2, 1.7, INK, null);
    p.circle(ex - 0.5, top - 0.6, 0.55, WHITE, null);
  }
  // toothy mouth
  p.roundRect(x - 9, top + 5, 18, 4.5, 2, INK, null);
  for (const tx of [-6.2, -2, 2.2, 6.4]) {
    p.poly(
      [
        { x: x + tx - 1.6, y: top + 5 },
        { x: x + tx + 1.6, y: top + 5 },
        { x: x + tx, y: top + 8.6 },
      ],
      WHITE,
      O,
      0.6,
    );
  }
  for (const tx of [-4.2, 0, 4.2]) {
    p.poly(
      [
        { x: x + tx - 1.4, y: top + 9.5 },
        { x: x + tx + 1.4, y: top + 9.5 },
        { x: x + tx, y: top + 7.2 },
      ],
      WHITE,
      O,
      0.5,
    );
  }
  envelope(p, x + 16, y - 1.5, 0.25);
  envelope(p, x - 15, y - 1, -0.2);
}

function catFencePost(p: Pen): void {
  const { x, y } = p.center;
  p.shadow(x, y + 1, 16, 6);
  pumpkinGlow(p, x + 12, y - 5.6, 5.6);
  jackPumpkin(p, x + 12, y - 5.6, 5.6, PUMPKIN, 2);
  const fur = '#2e2a3a';
  const hx = x - 2;
  const hy = y - 62;
  // tail hangs down beside the post, behind everything
  thickCurve(p, { x: x + 4, y: y - 47 }, { x: x + 14, y: y - 45 }, { x: x + 12, y: y - 32 }, 2.6, fur);
  post(p, x - 2, y, 38, WOOD, 5);
  p.roundRect(x - 6.5, y - 41.5, 13, 4, 2, shade(WOOD, 0.15));
  // body sitting on the cap
  p.ellipse(hx, y - 51, 8, 9.5, radial(p, hx - 2, y - 55, 9, '#4d4660', fur));
  p.ellipse(hx - 3, y - 41.8, 2.4, 1.6, fur);
  p.ellipse(hx + 3, y - 41.8, 2.4, 1.6, fur);
  // ears
  p.poly(
    [
      { x: hx - 6.5, y: hy - 3 },
      { x: hx - 7, y: hy - 12 },
      { x: hx - 0.5, y: hy - 7.5 },
    ],
    fur,
  );
  p.poly(
    [
      { x: hx + 6.5, y: hy - 3 },
      { x: hx + 7, y: hy - 12 },
      { x: hx + 0.5, y: hy - 7.5 },
    ],
    fur,
  );
  p.poly(
    [
      { x: hx - 5.2, y: hy - 4 },
      { x: hx - 5.6, y: hy - 9.5 },
      { x: hx - 2, y: hy - 6.6 },
    ],
    '#7a5a7a',
    null,
  );
  p.poly(
    [
      { x: hx + 5.2, y: hy - 4 },
      { x: hx + 5.6, y: hy - 9.5 },
      { x: hx + 2, y: hy - 6.6 },
    ],
    '#7a5a7a',
    null,
  );
  // head with huge yellow eyes
  p.circle(hx, hy, 7.5, radial(p, hx - 2, hy - 2, 8, '#4d4660', fur));
  for (const s of [-1, 1]) {
    const ex = hx + s * 3.4;
    p.circle(ex, hy - 0.5, 3, radial(p, ex, hy - 0.5, 3.4, '#fff6b0', '#ffd23f'), O);
    p.ellipse(ex + 0.4, hy + 0.1, 0.9, 2.2, '#1b1520', null);
    p.circle(ex - 0.9, hy - 1.3, 0.8, WHITE, null);
    p.ellipse(hx + s * 4.8, hy + 2.6, 1.3, 0.8, rgba(BLUSH, 0.7), null);
  }
  p.poly(
    [
      { x: hx - 0.9, y: hy + 2.3 },
      { x: hx + 0.9, y: hy + 2.3 },
      { x: hx, y: hy + 3.4 },
    ],
    BLUSH,
    O,
    0.5,
  );
  for (const s of [-1, 1]) {
    p.curve({ x: hx + s * 0.2, y: hy + 3.8 }, { x: hx + s * 1.2, y: hy + 5.4 }, { x: hx + s * 2.2, y: hy + 4 }, INK, 0.6);
    for (const k of [-1, 1]) {
      p.line(
        [
          { x: hx + s * 6, y: hy + 1.6 + k * 1.6 },
          { x: hx + s * 11.5, y: hy + 0.6 + k * 2.6 },
        ],
        rgba(INK, 0.7),
        0.5,
      );
    }
  }
  // orange collar with a gold bell
  p.curve({ x: hx - 6, y: hy + 6 }, { x: hx, y: hy + 8.4 }, { x: hx + 6, y: hy + 6 }, O, 3);
  p.curve({ x: hx - 6, y: hy + 6 }, { x: hx, y: hy + 8.4 }, { x: hx + 6, y: hy + 6 }, '#f08a2e', 1.8);
  p.circle(hx, hy + 8.6, 1.3, GOLD);
}

function pumpkinPatchSign(p: Pen): void {
  const { x, y } = p.center;
  p.shadow(x, y + 1, 22, 9);
  post(p, x - 17, y, 42, WOOD, 4.5);
  post(p, x + 17, y, 42, WOOD, 4.5);
  // arrow-shaped plank
  p.poly(
    [
      { x: x - 25, y: y - 41 },
      { x: x + 20, y: y - 41 },
      { x: x + 29, y: y - 33.5 },
      { x: x + 20, y: y - 26 },
      { x: x - 25, y: y - 26 },
    ],
    hgrad(p, x - 25, x + 29, shade(WOOD, 0.25), shade(WOOD, -0.12)),
  );
  p.line(
    [
      { x: x - 22, y: y - 36 },
      { x: x + 17, y: y - 36 },
    ],
    shade(WOOD, -0.22),
    0.6,
  );
  p.line(
    [
      { x: x - 22, y: y - 31 },
      { x: x + 17, y: y - 31 },
    ],
    shade(WOOD, -0.22),
    0.6,
  );
  fitText(p, 'PUMPKINS', x + 1, y - 33.5, 38, 10, '#5b2d8f', '#fff3d6');
  // pumpkins at the foot
  const feet = [
    { x: x - 9, y: y - 5, r: 5.4, c: PUMPKIN },
    { x: x + 4, y: y - 4, r: 6.2, c: '#e9772a' },
    { x: x + 18, y: y - 5, r: 4.6, c: '#f7a447' },
  ];
  for (const f of feet) {
    pumpkinBody(p, f.x, f.y, f.r, f.c);
    pumpkinStem(p, f.x + f.r * 0.1, f.y - f.r * 0.86, f.r / 12);
  }
  leaf(p, x + 9, y - 8, 5, -2.4, LEAF);
}

function candyCornPath(c: CanvasRenderingContext2D, x: number, yb: number): void {
  c.beginPath();
  c.moveTo(x - 15, yb - 2);
  c.quadraticCurveTo(x, yb + 4.5, x + 15, yb - 2);
  c.quadraticCurveTo(x + 9.5, yb - 26, x + 3.2, yb - 43);
  c.quadraticCurveTo(x, yb - 49, x - 3.2, yb - 43);
  c.quadraticCurveTo(x - 9.5, yb - 26, x - 15, yb - 2);
  c.closePath();
}

function candyCornStatue(p: Pen): void {
  const { x, y } = p.center;
  const yb = y - 7;
  p.glow(x, y - 30, 34, '#ffc4ea', 0.35);
  p.glow(x, y - 30, 20, '#fff3a0', 0.3);
  p.shadow(x, y + 1, 19, 8);
  // pedestal: pink box with a gold top
  p.box(0.19, 0.19, 0.62, 0.62, 7, '#ffc7dd');
  p.poly(
    [
      { x, y: y - 17 },
      { x: x + 20, y: y - 7 },
      { x, y: y - 3 },
      { x: x - 20, y: y - 7 },
    ],
    GOLD,
  );
  wrappedCandy(p, x - 24, y - 2, PURPLE, 0.3);
  wrappedCandy(p, x + 24, y - 1, LIME, -0.3);
  // the giant candy corn: cream base, orange middle, yellow tip
  const c = p.ctx;
  candyCornPath(c, x, yb);
  fs(p, '#fff9ec', null);
  c.save();
  candyCornPath(c, x, yb);
  c.clip();
  c.fillStyle = '#ffd23f';
  c.fillRect(x - 20, yb - 60, 40, 29);
  c.fillStyle = '#ff8c1a';
  c.fillRect(x - 20, yb - 31, 40, 18);
  c.restore();
  candyCornPath(c, x, yb);
  fs(p, null, O, 1.2);
  // kawaii face on the orange band
  kface(p, x, yb - 21, 2.1, 3.4);
  p.ellipse(x - 6, yb - 33, 1.6, 4.5, rgba(WHITE, 0.6), null, 0.25);
  sparkle(p, x - 22, y - 46, 4, '#fff6c0');
  sparkle(p, x + 24, y - 40, 3.4, '#ffe0f6');
  sparkle(p, x - 16, y - 62, 2.6, WHITE);
  sparkle(p, x + 14, y - 60, 2, '#fff6c0');
}

function caramelApple(p: Pen, x: number, y: number, r: number): void {
  p.line(
    [
      { x, y: y - r * 0.4 },
      { x: x + 0.4, y: y - r - 4.5 },
    ],
    '#f3e3c0',
    1.3,
  );
  p.ball(x, y, r, '#e8283c');
  const caramel = '#d68a2a';
  p.ellipse(x, y - r * 0.2, r * 0.98, r * 0.84, rgba(caramel, 0.9));
  p.ellipse(x - r * 0.5, y + r * 0.55, r * 0.14, r * 0.3, caramel);
  p.ellipse(x + r * 0.35, y + r * 0.6, r * 0.12, r * 0.25, caramel);
  const sprinkles = [
    { dx: -0.45, dy: -0.35, c: LIME },
    { dx: 0.05, dy: -0.55, c: PURPLE },
    { dx: 0.45, dy: -0.25, c: WHITE },
    { dx: -0.1, dy: 0.05, c: BLUSH },
    { dx: 0.35, dy: 0.25, c: LIME },
  ];
  for (const s of sprinkles) p.circle(x + s.dx * r, y + s.dy * r, 0.7, s.c, null);
  p.ellipse(x - r * 0.4, y - r * 0.5, r * 0.22, r * 0.14, rgba(WHITE, 0.7), null, -0.6);
}

function caramelAppleStand(p: Pen): void {
  const { x, y } = p.center;
  p.shadow(x, y + 1, 22, 8);
  const posts = '#8a5a3e';
  post(p, x - 20, y, 50, posts, 3.5);
  post(p, x + 20, y, 50, posts, 3.5);
  // counter with a plank top
  p.roundRect(x - 21, y - 16, 42, 16, 2, hgrad(p, x - 21, x + 21, shade(PURPLE, 0.12), shade(PURPLE, -0.2)));
  p.roundRect(x - 23, y - 19, 46, 4.5, 2, shade(PURPLE, 0.3));
  // apples on sticks, middle one behind
  caramelApple(p, x, y - 22, 7.5);
  caramelApple(p, x - 13, y - 20, 7.5);
  caramelApple(p, x + 13, y - 20, 7.5);
  // striped awning with a scalloped hem
  const stripeW = 44 / 6;
  for (let i = 0; i < 6; i++) {
    const col = i % 2 ? '#fff3dc' : '#ff8c42';
    const sx = x - 22 + i * stripeW;
    p.rect(sx, y - 50, stripeW, 8, col, null);
    p.circle(sx + stripeW / 2, y - 42, stripeW / 2, col, null);
  }
  const c = p.ctx;
  for (let i = 0; i < 6; i++) {
    const sx = x - 22 + i * stripeW;
    c.beginPath();
    c.arc(sx + stripeW / 2, y - 42, stripeW / 2, 0, Math.PI);
    fs(p, null, O, 0.7);
  }
  p.rect(x - 22, y - 50, 44, 8, null, O);
}

function ghostKitty(p: Pen): void {
  const { x, y } = p.center;
  p.shadow(x, y + 1, 10, 4, 0.14);
  p.glow(x, y - 30, 26, '#d9f0ff', 0.45);
  const hy = y - 42;
  const hemY = y - 7;
  // curly tail with a little curl at the tip
  p.curve({ x: x + 8, y: y - 20 }, { x: x + 21, y: y - 24 }, { x: x + 14, y: y - 38 }, GHOST_EDGE, 3.6);
  p.curve({ x: x + 8, y: y - 20 }, { x: x + 21, y: y - 24 }, { x: x + 14, y: y - 38 }, '#f6f3ff', 1.8);
  // ears
  p.poly(
    [
      { x: x - 8, y: hy - 3 },
      { x: x - 8.5, y: hy - 13 },
      { x: x - 1.8, y: hy - 7 },
    ],
    '#f6f3ff',
    GHOST_EDGE,
    0.9,
  );
  p.poly(
    [
      { x: x + 1.8, y: hy - 7 },
      { x: x + 8.5, y: hy - 13 },
      { x: x + 8, y: hy - 3 },
    ],
    '#f6f3ff',
    GHOST_EDGE,
    0.9,
  );
  // translucent body: head dome flowing into a wispy hem
  const c = p.ctx;
  c.beginPath();
  c.moveTo(x - 8.5, hy);
  c.arc(x, hy, 8.5, Math.PI, 0);
  c.quadraticCurveTo(x + 10.5, hy + 12, x + 9, hemY - 8);
  c.quadraticCurveTo(x + 8.5, hemY - 1, x + 6, hemY);
  c.quadraticCurveTo(x + 3, hemY + 4, x, hemY);
  c.quadraticCurveTo(x - 3, hemY + 4, x - 6, hemY);
  c.quadraticCurveTo(x - 8.5, hemY - 1, x - 9, hemY - 8);
  c.quadraticCurveTo(x - 10.5, hy + 12, x - 8.5, hy);
  c.closePath();
  fs(p, radial(p, x - 3, hy - 4, 14, 'rgba(255,255,255,0.96)', 'rgba(214,206,240,0.92)'), GHOST_EDGE, 1);
  kface(p, x, hy + 2, 1.6, 3.2);
  for (const s of [-1, 1]) {
    for (const k of [-1, 1]) {
      p.line(
        [
          { x: x + s * 5, y: hy + 4 + k * 1.5 },
          { x: x + s * 12, y: hy + 3 + k * 3 },
        ],
        rgba(GHOST_EDGE, 0.7),
        0.5,
      );
    }
  }
  sparkle(p, x - 16, y - 40, 2.2, WHITE);
  sparkle(p, x + 18, y - 46, 1.8, '#eaf6ff');
}

function goldenPumpkin(p: Pen): void {
  const { x, y } = p.center;
  p.shadow(x, y + 1, 17, 7);
  const cy = y - 32;
  const shine = '#f4c24a';
  // pedestal: gold foot, fluted column, velvet cushion
  p.ellipse(x, y - 2, 13, 5, shade(GOLD, -0.3));
  p.ellipse(x, y - 4.5, 10, 3.6, shine);
  p.rect(x - 4, y - 16, 8, 12, hgrad(p, x - 4, x + 4, shade(GOLD, 0.25), shade(GOLD, -0.2)));
  p.line(
    [
      { x: x - 1.4, y: y - 14 },
      { x: x - 1.4, y: y - 6 },
    ],
    shade(GOLD, 0.45),
    0.6,
  );
  p.line(
    [
      { x: x + 1.6, y: y - 14 },
      { x: x + 1.6, y: y - 6 },
    ],
    shade(GOLD, -0.35),
    0.6,
  );
  p.glow(x, cy, 30, '#ffe07a', 0.4);
  p.line(
    [
      { x: x - 12, y: y - 17 },
      { x: x - 13, y: y - 11.5 },
    ],
    '#5b2a86',
    1.4,
  );
  p.line(
    [
      { x: x + 12, y: y - 17 },
      { x: x + 13, y: y - 11.5 },
    ],
    '#5b2a86',
    1.4,
  );
  p.circle(x - 13, y - 10.5, 1.3, shine);
  p.circle(x + 13, y - 10.5, 1.3, shine);
  p.ellipse(x, y - 17, 13, 4.5, radial(p, x, y - 17, 13, '#9b5cd6', '#4b1f7a'));
  p.ellipse(x - 3, y - 19, 6, 1.4, rgba(WHITE, 0.25), null, 0.1);
  // the golden pumpkin itself
  pumpkinBody(p, x, cy, 12.5, GOLD);
  pumpkinStem(p, x + 1, cy - 11, 1.1);
  carve(p, x, cy, 12.5, 1);
  p.ellipse(x - 5, cy - 4, 1.8, 3.2, rgba(WHITE, 0.7), null, 0.4);
  sparkle(p, x - 21, cy - 9, 3.6, '#fffbe0');
  sparkle(p, x + 20, cy - 15, 3, WHITE);
  sparkle(p, x + 15, cy + 6, 2.2, '#fff6c0');
  sparkle(p, x - 16, cy + 6, 2, WHITE);
}

function lollipopTree(p: Pen): void {
  const { x, y } = p.center;
  p.shadow(x, y + 1, 20, 8);
  gumdrop(p, x - 15, y - 3, 4.2, LIME);
  gumdrop(p, x + 15, y - 2, 4, PURPLE);
  // licorice trunk with a glossy highlight
  const top = { x: x + 1, y: y - 46 };
  thickCurve(p, { x, y }, { x: x - 1, y: y - 24 }, top, 6.5, '#3e2d4f');
  p.curve({ x: x - 1.6, y: y - 4 }, { x: x - 2.4, y: y - 22 }, { x: x - 0.4, y: y - 40 }, '#7a6494', 1);
  // canopy: lollipop sticks first, then heads and gumdrops back to front
  const heads = [
    { x: x - 21, y: y - 47, r: 6, c1: '#ff8c42', c2: '#fff3dc' },
    { x: x + 21, y: y - 48, r: 6.2, c1: LIME, c2: PURPLE },
    { x: x - 13, y: y - 61, r: 7, c1: PURPLE, c2: LIME },
    { x: x + 13, y: y - 63, r: 7, c1: '#ff8c42', c2: INK },
    { x: x - 3, y: y - 74, r: 6.6, c1: LIME, c2: '#ff8c42' },
    { x: x + 8, y: y - 78, r: 6, c1: '#fff3dc', c2: '#ff8c42' },
    { x, y: y - 56, r: 7.5, c1: '#ff8c42', c2: PURPLE },
  ];
  for (const h of heads) p.line([{ x: h.x, y: h.y }, top], '#fff6fb', 1.3);
  const items: { y: number; draw: () => void }[] = heads.map((h) => ({
    y: h.y,
    draw: () => lollipopHead(p, h.x, h.y, h.r, h.c1, h.c2),
  }));
  const drops = [
    { x: x - 8, y: y - 38, r: 4.8, c: PURPLE },
    { x: x + 9, y: y - 37, r: 4.8, c: '#ff8c42' },
    { x: x - 24, y: y - 36, r: 4, c: LIME },
    { x: x + 25, y: y - 35, r: 4, c: PURPLE },
  ];
  for (const d of drops) items.push({ y: d.y, draw: () => gumdrop(p, d.x, d.y, d.r, d.c) });
  items.sort((a, b) => a.y - b.y);
  for (const it of items) it.draw();
  sparkle(p, x - 28, y - 64, 3);
  sparkle(p, x + 28, y - 70, 2.4, '#ffe0f6');
}

function fallback(p: Pen): void {
  const { x, y } = p.center;
  p.shadow(x, y + 1, 14, 6);
  pumpkinGlow(p, x, y - 9, 9);
  jackPumpkin(p, x, y - 9, 9, PUMPKIN, 1);
}

const ART: Record<string, { height: number; paint: (p: Pen) => void }> = {
  pumpkin_tower: { height: 70, paint: pumpkinTower },
  jack_string_lights: { height: 52, paint: jackStringLights },
  haunted_tree: { height: 80, paint: hauntedTree },
  glow_mushrooms: { height: 36, paint: glowMushrooms },
  owl_perch: { height: 70, paint: owlPerch },
  treat_bags: { height: 44, paint: treatBags },
  witch_hat_planter: { height: 62, paint: witchHatPlanter },
  ghost_swing: { height: 66, paint: ghostSwing },
  moon_photo_booth: { height: 72, paint: moonPhotoBooth },
  monster_mailbox: { height: 52, paint: monsterMailbox },
  cat_fence_post: { height: 70, paint: catFencePost },
  pumpkin_patch_sign: { height: 50, paint: pumpkinPatchSign },
  candy_corn_statue: { height: 72, paint: candyCornStatue },
  caramel_apple_stand: { height: 52, paint: caramelAppleStand },
  ghost_kitty: { height: 60, paint: ghostKitty },
  golden_pumpkin: { height: 70, paint: goldenPumpkin },
  lollipop_tree: { height: 80, paint: lollipopTree },
};

export const sprites: SpriteSpec[] = SPOOKY_DECORATIONS.slice(18).map((d) => {
  const art = ART[d.id] ?? { height: 26, paint: fallback };
  return { key: `deco:${d.id}`, fw: d.w, fh: d.h, height: art.height, paint: art.paint };
});

/** Animation frames `key#1..key#n`: the base sprite's footprint and height, repainted with `paint(p, frame)`. */
function animFrames(key: string, n: number, paint: (p: Pen, frame: number) => void): SpriteSpec[] {
  const base = sprites.find((s) => s.key === key);
  if (!base) return [];
  return Array.from({ length: n }, (_, i) => ({ ...base, key: `${key}#${i + 1}`, paint: (p: Pen) => paint(p, i + 1) }));
}

sprites.push(...animFrames('deco:jack_string_lights', 1, jackStringLights));

export const icons: IconSpec[] = [];
