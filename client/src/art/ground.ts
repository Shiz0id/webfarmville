// Ground tiles (grass, wild land, plowed plots) and the scenery dotted around
// the edges of the farm (forest trees, rocks, bushes).
import { type IconSpec, type SpriteSpec, type Pen, type Pt, shade, rng, mix } from './kit';

export const icons: IconSpec[] = [];

// ---------------------------------------------------------------------------
// Helpers

/** The full tile diamond, grown by `grow` px so neighbouring tiles overlap and never seam. */
function tileDiamond(p: Pen, fill: string | CanvasGradient, grow = 0.6): void {
  const c = p.center;
  const hw = 32 + grow * 2;
  const hh = 16 + grow;
  p.poly(
    [
      { x: c.x, y: c.y - hh },
      { x: c.x + hw, y: c.y },
      { x: c.x, y: c.y + hh },
      { x: c.x - hw, y: c.y },
    ],
    fill,
    null,
  );
}

/** A random ground point well inside the tile (margin in tile units). */
function inner(p: Pen, r: () => number, m = 0.14): Pt {
  return p.iso(m + r() * (1 - 2 * m), m + r() * (1 - 2 * m));
}

function tuft(p: Pen, at: Pt, s: number, color: string): void {
  p.curve(at, { x: at.x - s * 0.3, y: at.y - s * 0.6 }, { x: at.x - s * 1.1, y: at.y - s * 1.0 }, color, 0.8);
  p.curve(at, { x: at.x + 0.2, y: at.y - s * 0.8 }, { x: at.x - s * 0.1, y: at.y - s * 1.5 }, color, 0.8);
  p.curve(at, { x: at.x + s * 0.4, y: at.y - s * 0.5 }, { x: at.x + s * 1.0, y: at.y - s * 0.9 }, color, 0.8);
}

function speckle(p: Pen, r: () => number, n: number, colors: string[]): void {
  for (let i = 0; i < n; i++) {
    const at = inner(p, r, 0.08);
    const col = colors[i % colors.length];
    p.ellipse(at.x, at.y, 1.1 + r() * 0.9, 0.55 + r() * 0.4, col, null);
  }
}

function clover(p: Pen, at: Pt, col: string): void {
  p.circle(at.x - 1.1, at.y, 1.1, col, null);
  p.circle(at.x + 1.1, at.y, 1.1, col, null);
  p.circle(at.x, at.y - 1.1, 1.1, col, null);
  p.circle(at.x - 0.4, at.y - 0.6, 0.5, shade(col, 0.3), null);
}

function grassTile(variant: number): SpriteSpec {
  const tones = [0, 0.008, -0.008, 0.004];
  const base = shade('#8cc865', tones[variant]);
  return {
    key: `ground:grass:${variant}`,
    fw: 1,
    fh: 1,
    height: 0,
    paint: (p) => {
      tileDiamond(p, base);
      const r = rng(100 + variant * 17);
      speckle(p, r, 7, [shade(base, 0.07), shade(base, -0.05)]);
      const dark = shade(base, -0.17);
      const tufts = [2, 3, 2, 2][variant];
      for (let i = 0; i < tufts; i++) tuft(p, inner(p, r, 0.2), 1.6 + r() * 0.8, dark);
      if (variant === 1) {
        clover(p, p.iso(0.62, 0.38), shade(base, -0.12));
      }
      if (variant === 3) {
        const at = p.iso(0.4, 0.62);
        p.line([at, { x: at.x, y: at.y - 2.5 }], shade(base, -0.25), 0.8);
        p.flower(at.x, at.y - 3, 2.1, '#ffb3c8', '#ffe066');
      }
      if (variant === 2) {
        const at = p.iso(0.66, 0.6);
        p.circle(at.x, at.y - 1, 0.9, '#fff9e6', null);
        p.circle(at.x + 2.5, at.y - 0.2, 0.8, '#ffe36e', null);
      }
    },
  };
}

function wildTile(variant: number): SpriteSpec {
  const tones = [0, -0.015, 0.01];
  const base = shade('#6f9a52', tones[variant]);
  return {
    key: `ground:wild:${variant}`,
    fw: 1,
    fh: 1,
    height: 0,
    paint: (p) => {
      tileDiamond(p, base);
      const r = rng(300 + variant * 23);
      speckle(p, r, 10, [shade(base, 0.06), shade(base, -0.08), mix(base, '#9a8a55', 0.35)]);
      const dark = shade(base, -0.25);
      const light = shade(base, 0.12);
      for (let i = 0; i < 6; i++) tuft(p, inner(p, r, 0.18), 1.8 + r() * 1.2, i % 3 === 0 ? light : dark);
      if (variant === 1) {
        const at = p.iso(0.55, 0.45);
        p.ellipse(at.x, at.y, 2.6, 1.4, '#9a958a', null);
        p.ellipse(at.x - 0.6, at.y - 0.5, 1.3, 0.6, '#b9b4a8', null);
      }
      if (variant === 2) clover(p, p.iso(0.4, 0.6), shade(base, -0.12));
    },
  };
}

/** A rounded diamond outline path at height z, inset by m tile units. */
function roundedDiamond(p: Pen, m: number, z: number, fill: string | CanvasGradient, stroke: string | null): void {
  const pts = [p.iso(m, m, z), p.iso(1 - m, m, z), p.iso(1 - m, 1 - m, z), p.iso(m, 1 - m, z)];
  const ctx = p.ctx;
  const k = 0.2;
  ctx.beginPath();
  for (let i = 0; i < 4; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % 4];
    const prev = pts[(i + 3) % 4];
    const s = { x: a.x + (prev.x - a.x) * k, y: a.y + (prev.y - a.y) * k };
    const e = { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k };
    if (i === 0) ctx.moveTo(s.x, s.y);
    else ctx.lineTo(s.x, s.y);
    ctx.quadraticCurveTo(a.x, a.y, e.x, e.y);
  }
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = p.lineWidth;
    ctx.stroke();
  }
}

function plotTile(key: string, soil: string, fert: boolean): SpriteSpec {
  const Z = 3.5;
  return {
    key,
    fw: 1,
    fh: 1,
    height: 6,
    paint: (p) => {
      const c = p.center;
      p.shadow(c.x, c.y + 1, 30, 14, 0.18);
      roundedDiamond(p, 0.07, 0, shade(soil, -0.32), p.outline);
      roundedDiamond(p, 0.07, Z, p.vgrad(c.y - 16, c.y + 14, shade(soil, 0.08), shade(soil, -0.06)), p.outline);
      // furrows along the u axis
      for (let i = 0; i < 5; i++) {
        const v = 0.22 + i * 0.14;
        const a = p.iso(0.2, v, Z);
        const b = p.iso(0.8, v, Z);
        p.line([{ x: a.x, y: a.y + 0.9 }, { x: b.x, y: b.y + 0.9 }], shade(soil, 0.16), 1);
        p.line([a, b], shade(soil, -0.3), 1.2);
      }
      const r = rng(key);
      for (let i = 0; i < 6; i++) {
        const at = p.iso(0.2 + r() * 0.6, 0.2 + r() * 0.6, Z);
        p.circle(at.x, at.y, 0.6 + r() * 0.4, shade(soil, r() > 0.5 ? 0.22 : -0.25), null);
      }
      if (fert) {
        for (let i = 0; i < 5; i++) {
          const at = p.iso(0.22 + r() * 0.56, 0.22 + r() * 0.56, Z);
          p.circle(at.x, at.y, 0.9, '#7fd05a', null);
        }
        const sparkle = (s: Pt, sz: number) => {
          p.line([{ x: s.x - sz, y: s.y }, { x: s.x + sz, y: s.y }], '#fff7c2', 0.9);
          p.line([{ x: s.x, y: s.y - sz }, { x: s.x, y: s.y + sz }], '#fff7c2', 0.9);
          p.circle(s.x, s.y, 0.7, '#ffffff', null);
        };
        sparkle(p.iso(0.3, 0.45, Z + 2), 2.2);
        sparkle(p.iso(0.65, 0.35, Z + 2), 1.6);
        sparkle(p.iso(0.6, 0.72, Z + 2), 1.9);
      }
    },
  };
}

// ---------------------------------------------------------------------------
// Scenery

function trunk(p: Pen, x: number, y: number, w: number, h: number, color: string): void {
  p.poly(
    [
      { x: x - w / 2 - 1, y },
      { x: x - w / 2 + 0.5, y: y - h },
      { x: x + w / 2 - 0.5, y: y - h },
      { x: x + w / 2 + 1, y },
    ],
    p.vgrad(y - h, y, shade(color, 0.05), shade(color, -0.15)),
  );
  p.line([{ x: x + w / 2 - 1.5, y: y - 2 }, { x: x + w / 2 - 1.2, y: y - h + 2 }], shade(color, -0.3), 1);
}

function pine(p: Pen): void {
  const c = p.center;
  p.shadow(c.x, c.y, 22, 10);
  trunk(p, c.x, c.y, 6, 16, '#7a5235');
  const green = '#3f8a4f';
  const tiers = [
    { y: c.y - 10, w: 25, h: 30 },
    { y: c.y - 30, w: 20, h: 28 },
    { y: c.y - 50, w: 14, h: 26 },
  ];
  for (const t of tiers) {
    const top = { x: c.x, y: t.y - t.h };
    p.poly(
      [top, { x: c.x + t.w, y: t.y }, { x: c.x + t.w * 0.5, y: t.y + 3 }, { x: c.x, y: t.y + 1 }, { x: c.x - t.w * 0.5, y: t.y + 3 }, { x: c.x - t.w, y: t.y }],
      green,
    );
    p.poly([top, { x: c.x + t.w, y: t.y }, { x: c.x + t.w * 0.5, y: t.y + 3 }, { x: c.x, y: t.y + 1 }], shade(green, -0.22), null);
    p.line([{ x: c.x - 2, y: top.y + 5 }, { x: c.x - t.w * 0.6, y: t.y - 1 }], shade(green, 0.25), 1.2);
    p.line([top, { x: c.x + t.w, y: t.y }], p.outline, 1);
  }
}

function oak(p: Pen): void {
  const c = p.center;
  p.shadow(c.x, c.y, 26, 12);
  trunk(p, c.x, c.y, 8, 30, '#8a5a3a');
  p.line([{ x: c.x, y: c.y - 24 }, { x: c.x - 8, y: c.y - 34 }], '#6a4329', 2.2);
  p.foliage(c.x, c.y - 52, 23, '#5aa04a', 'oak', 9);
  const r = rng('oakleaf');
  for (let i = 0; i < 5; i++) {
    p.circle(c.x - 14 + r() * 28, c.y - 64 + r() * 24, 1.4, shade('#5aa04a', 0.3), null);
  }
}

function birch(p: Pen): void {
  const c = p.center;
  p.shadow(c.x, c.y, 18, 9);
  const top = c.y - 58;
  p.poly(
    [
      { x: c.x - 4, y: c.y },
      { x: c.x - 2.5, y: top },
      { x: c.x + 2.5, y: top },
      { x: c.x + 4, y: c.y },
    ],
    p.vgrad(top, c.y, '#fbf8ef', '#ddd6c4'),
  );
  const r = rng('birch');
  for (let i = 0; i < 6; i++) {
    const y = c.y - 4 - i * 9 - r() * 3;
    const left = r() > 0.5;
    p.line([{ x: c.x + (left ? -3 : 0.5), y }, { x: c.x + (left ? -0.5 : 3), y: y + 0.6 }], '#3d3530', 1.3);
  }
  p.foliage(c.x - 7, c.y - 66, 15, '#9acb52', 'birch1', 7);
  p.foliage(c.x + 6, c.y - 58, 13, '#a6d35c', 'birch2', 6);
  p.foliage(c.x, c.y - 80, 13, '#b3db66', 'birch3', 6);
}

function rock(p: Pen): void {
  const c = p.center;
  p.shadow(c.x, c.y + 1, 22, 9);
  const stone = (x: number, y: number, w: number, h: number, col: string) => {
    const ctx = p.ctx;
    ctx.beginPath();
    ctx.moveTo(x - w, y);
    ctx.bezierCurveTo(x - w, y - h * 0.9, x - w * 0.5, y - h * 1.15, x + w * 0.1, y - h);
    ctx.bezierCurveTo(x + w * 0.8, y - h * 0.95, x + w * 1.05, y - h * 0.4, x + w, y);
    ctx.bezierCurveTo(x + w * 0.6, y + h * 0.25, x - w * 0.6, y + h * 0.25, x - w, y);
    ctx.closePath();
    const g = ctx.createLinearGradient(x - w, y - h, x + w, y);
    g.addColorStop(0, shade(col, 0.2));
    g.addColorStop(0.55, col);
    g.addColorStop(1, shade(col, -0.25));
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = p.outline;
    ctx.lineWidth = p.lineWidth;
    ctx.stroke();
    p.ellipse(x - w * 0.35, y - h * 0.7, w * 0.25, h * 0.12, shade(col, 0.35), null, -0.3);
  };
  stone(c.x + 4, c.y - 1, 15, 17, '#a39e93');
  stone(c.x - 11, c.y + 3, 9, 9, '#b3ada1');
  stone(c.x + 14, c.y + 5, 6, 5, '#9b968b');
  // a little moss
  p.ellipse(c.x + 2, c.y - 16, 4, 1.6, '#86b05a', null);
  p.ellipse(c.x - 12, c.y - 5, 2.5, 1.2, '#86b05a', null);
}

function bush(p: Pen): void {
  const c = p.center;
  p.shadow(c.x, c.y, 24, 10);
  p.foliage(c.x - 8, c.y - 10, 12, '#4f9a45', 'bushA', 6);
  p.foliage(c.x + 8, c.y - 9, 11, '#55a24a', 'bushB', 6);
  p.foliage(c.x, c.y - 17, 12, '#5daa50', 'bushC', 7);
  const r = rng('berries');
  for (let i = 0; i < 6; i++) {
    const x = c.x - 14 + r() * 28;
    const y = c.y - 22 + r() * 16;
    p.circle(x, y, 1.8, '#e2445a', shade('#e2445a', -0.4));
    p.circle(x - 0.6, y - 0.6, 0.6, '#ffd0d6', null);
  }
}

// ---------------------------------------------------------------------------

export const sprites: SpriteSpec[] = [
  ...[0, 1, 2, 3].map(grassTile),
  ...[0, 1, 2].map(wildTile),
  plotTile('ground:plot', '#9a6a43', false),
  plotTile('ground:plot_fert', '#6e4a2f', true),
  { key: 'wild:tree:0', fw: 1, fh: 1, height: 92, paint: pine },
  { key: 'wild:tree:1', fw: 1, fh: 1, height: 84, paint: oak },
  { key: 'wild:tree:2', fw: 1, fh: 1, height: 96, paint: birch },
  { key: 'wild:rock', fw: 1, fh: 1, height: 22, paint: rock },
  { key: 'wild:bush', fw: 1, fh: 1, height: 28, paint: bush },
];
