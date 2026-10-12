// The drawing kit every piece of game art is painted with.
//
// All art is generated at boot from code: each SpriteSpec paints onto a canvas
// that becomes a Phaser texture. Painters work in *logical* pixels; the canvas
// is rendered at RES× for crispness when zoomed in.
//
// Isometric conventions
// ---------------------
// A tile is a 64×32 diamond. A sprite covers a footprint of `fw` tiles along the
// grid's x axis (down-right on screen) and `fh` tiles along the grid's y axis
// (down-left on screen). Its canvas is exactly as wide as the footprint diamond,
// (fw + fh) * 32, and as tall as the diamond plus `height` px of headroom for
// whatever sticks up. The bottom corner of the footprint touches the bottom edge
// of the canvas.
//
//            top = iso(0, 0)
//              /\
//  iso(0,fh)  /  \  iso(fw,0)
//             \  /
//              \/
//          bottom = iso(fw, fh)
//
// `pen.iso(u, v)` turns footprint-local tile coordinates (0..fw, 0..fh) into
// canvas coordinates, so `pen.iso(fw/2, fh/2)` is the centre of the footprint.

export const TW = 64;
export const TH = 32;
export const RES = 2;
export const ICON = 40;

export const OUTLINE = '#4a3426';

export interface SpriteSpec {
  key: string;
  /** Footprint size in tiles. */
  fw: number;
  fh: number;
  /** Logical px of headroom above the footprint's top corner. */
  height: number;
  paint: (p: Pen) => void;
}

export interface IconSpec {
  key: string;
  /** Paints into an ICON×ICON logical canvas (flat, not isometric), or size×size if given. */
  paint: (p: Pen) => void;
  size?: number;
}

export interface Pt {
  x: number;
  y: number;
}

type Fill = string | CanvasGradient | null;

export interface BoxColors {
  top: string;
  left: string;
  right: string;
}

// ---------------------------------------------------------------------------
// Colour helpers

function parseHex(hex: string): [number, number, number] {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function toHex(r: number, g: number, b: number): string {
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
  return `#${c(r)}${c(g)}${c(b)}`;
}

/** Lighten (amt > 0) or darken (amt < 0) a hex colour; amt in -1..1. */
export function shade(hex: string, amt: number): string {
  const [r, g, b] = parseHex(hex);
  if (amt >= 0) return toHex(r + (255 - r) * amt, g + (255 - g) * amt, b + (255 - b) * amt);
  return toHex(r * (1 + amt), g * (1 + amt), b * (1 + amt));
}

/** Linear mix of two hex colours, t in 0..1. */
export function mix(a: string, b: string, t: number): string {
  const [r1, g1, b1] = parseHex(a);
  const [r2, g2, b2] = parseHex(b);
  return toHex(r1 + (r2 - r1) * t, g1 + (g2 - g1) * t, b1 + (b2 - b1) * t);
}

export function rgba(hex: string, alpha: number): string {
  const [r, g, b] = parseHex(hex);
  return `rgba(${r},${g},${b},${alpha})`;
}

/** Standard lit-from-top-left shading for an isometric box of a base colour. */
export function boxColors(base: string): BoxColors {
  return { top: shade(base, 0.18), left: base, right: shade(base, -0.22) };
}

/** Small deterministic PRNG so scattered details look identical every boot. */
export function rng(seed: number | string): () => number {
  let s = typeof seed === 'number' ? seed : [...seed].reduce((a, c) => (a * 31 + c.charCodeAt(0)) | 0, 7);
  s = s >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return ((s >>> 0) % 100000) / 100000;
  };
}

// ---------------------------------------------------------------------------
// The pen

export class Pen {
  readonly ctx: CanvasRenderingContext2D;
  /** Logical canvas size. */
  readonly W: number;
  readonly H: number;
  /** Footprint (0 for icons). */
  readonly fw: number;
  readonly fh: number;
  /** Headroom above the footprint. */
  readonly height: number;
  /** Default outline width in logical px. */
  lineWidth = 1;
  outline: string = OUTLINE;

  constructor(ctx: CanvasRenderingContext2D, W: number, H: number, fw = 0, fh = 0, height = 0) {
    this.ctx = ctx;
    this.W = W;
    this.H = H;
    this.fw = fw;
    this.fh = fh;
    this.height = height;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
  }

  // --- isometric geometry -------------------------------------------------

  /** Footprint-local tile coords → canvas coords (z lifts the point up by z px). */
  iso(u: number, v: number, z = 0): Pt {
    return { x: this.fh * 32 + (u - v) * 32, y: this.height + (u + v) * 16 - z };
  }

  /** Centre of the footprint on the ground. */
  get center(): Pt {
    return this.iso(this.fw / 2, this.fh / 2);
  }

  /** Fill a footprint-local rectangle on the ground (or raised by z) as a diamond. */
  diamond(u: number, v: number, du: number, dv: number, fill: Fill, stroke: string | null = null, z = 0): void {
    this.poly([this.iso(u, v, z), this.iso(u + du, v, z), this.iso(u + du, v + dv, z), this.iso(u, v + dv, z)], fill, stroke);
  }

  /**
   * An isometric box with its base at footprint coords (u, v) spanning du × dv
   * tiles, floating z px above ground and ht px tall. Colours may be a single
   * base colour (auto-shaded) or explicit faces.
   */
  box(u: number, v: number, du: number, dv: number, ht: number, colors: string | BoxColors, z = 0, stroke: string | null = this.outline): void {
    const c = typeof colors === 'string' ? boxColors(colors) : colors;
    const b0 = this.iso(u, v + dv, z); // left
    const b1 = this.iso(u + du, v + dv, z); // bottom
    const b2 = this.iso(u + du, v, z); // right
    const t0 = this.iso(u, v + dv, z + ht);
    const t1 = this.iso(u + du, v + dv, z + ht);
    const t2 = this.iso(u + du, v, z + ht);
    const t3 = this.iso(u, v, z + ht);
    this.poly([b0, b1, t1, t0], c.left, stroke);
    this.poly([b1, b2, t2, t1], c.right, stroke);
    this.poly([t0, t1, t2, t3], c.top, stroke);
  }

  /**
   * A gabled roof sitting on a box (u, v, du, dv) whose walls are wallHt tall.
   * The ridge runs along the u axis, so the triangular gable end faces the
   * bottom-right; pass the wall colour so that triangle matches the walls.
   */
  gableRoof(
    u: number,
    v: number,
    du: number,
    dv: number,
    wallHt: number,
    roofHt: number,
    color: string,
    wallColor?: string,
    overhang = 0.1,
  ): void {
    const o = overhang;
    const z = wallHt;
    if (wallColor) {
      const gable = [this.iso(u + du, v, z), this.iso(u + du, v + dv, z), this.iso(u + du, v + dv / 2, z + roofHt)];
      this.poly(gable, shade(wallColor, -0.22), this.outline);
    }
    const back = [this.iso(u - o, v - o, z), this.iso(u + du + o, v - o, z), this.iso(u + du + o, v + dv / 2, z + roofHt), this.iso(u - o, v + dv / 2, z + roofHt)];
    const front = [this.iso(u - o, v + dv + o, z), this.iso(u + du + o, v + dv + o, z), this.iso(u + du + o, v + dv / 2, z + roofHt), this.iso(u - o, v + dv / 2, z + roofHt)];
    this.poly(back, shade(color, 0.12), this.outline);
    this.poly(front, color, this.outline);
  }

  /** A pyramid/hip roof over a box footprint. */
  hipRoof(u: number, v: number, du: number, dv: number, wallHt: number, roofHt: number, color: string, overhang = 0.08): void {
    const o = overhang;
    const z = wallHt;
    const l = this.iso(u - o, v + dv + o, z);
    const btm = this.iso(u + du + o, v + dv + o, z);
    const r = this.iso(u + du + o, v - o, z);
    const peak = this.iso(u + du / 2, v + dv / 2, z + roofHt);
    this.poly([l, btm, peak], color, this.outline);
    this.poly([btm, r, peak], shade(color, -0.22), this.outline);
  }

  /** A vertical cylinder; (x, y) is the centre of its base ellipse in canvas coords. */
  cylinder(x: number, y: number, rx: number, ht: number, color: string, stroke: string | null = this.outline): void {
    const ry = rx / 2;
    const ctx = this.ctx;
    const g = ctx.createLinearGradient(x - rx, 0, x + rx, 0);
    g.addColorStop(0, shade(color, 0.08));
    g.addColorStop(0.45, color);
    g.addColorStop(1, shade(color, -0.3));
    ctx.beginPath();
    ctx.moveTo(x - rx, y - ht);
    ctx.lineTo(x - rx, y);
    ctx.ellipse(x, y, rx, ry, 0, Math.PI, 0, true);
    ctx.lineTo(x + rx, y - ht);
    ctx.closePath();
    ctx.fillStyle = g;
    ctx.fill();
    if (stroke) this.strokePath(stroke);
    this.ellipse(x, y - ht, rx, ry, shade(color, 0.2), stroke);
  }

  // --- flat primitives -----------------------------------------------------

  poly(pts: Pt[], fill: Fill, stroke: string | null = this.outline, width = this.lineWidth): void {
    if (pts.length < 2) return;
    const ctx = this.ctx;
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.closePath();
    if (fill) {
      ctx.fillStyle = fill;
      ctx.fill();
    }
    if (stroke) this.strokePath(stroke, width);
  }

  rect(x: number, y: number, w: number, h: number, fill: Fill, stroke: string | null = this.outline): void {
    this.poly(
      [
        { x, y },
        { x: x + w, y },
        { x: x + w, y: y + h },
        { x, y: y + h },
      ],
      fill,
      stroke,
    );
  }

  roundRect(x: number, y: number, w: number, h: number, r: number, fill: Fill, stroke: string | null = this.outline): void {
    const ctx = this.ctx;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
    if (fill) {
      ctx.fillStyle = fill;
      ctx.fill();
    }
    if (stroke) this.strokePath(stroke);
  }

  ellipse(x: number, y: number, rx: number, ry: number, fill: Fill, stroke: string | null = this.outline, rot = 0): void {
    const ctx = this.ctx;
    ctx.beginPath();
    ctx.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rot, 0, Math.PI * 2);
    if (fill) {
      ctx.fillStyle = fill;
      ctx.fill();
    }
    if (stroke) this.strokePath(stroke);
  }

  circle(x: number, y: number, r: number, fill: Fill, stroke: string | null = this.outline): void {
    this.ellipse(x, y, r, r, fill, stroke);
  }

  /** Pie/arc wedge, angles in radians. */
  arc(x: number, y: number, r: number, a0: number, a1: number, fill: Fill, stroke: string | null = this.outline): void {
    const ctx = this.ctx;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.arc(x, y, r, a0, a1);
    ctx.closePath();
    if (fill) {
      ctx.fillStyle = fill;
      ctx.fill();
    }
    if (stroke) this.strokePath(stroke);
  }

  line(pts: Pt[], color: string = this.outline, width = this.lineWidth): void {
    if (pts.length < 2) return;
    const ctx = this.ctx;
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.stroke();
  }

  /** Quadratic curve from a to b bending through control point c. */
  curve(a: Pt, c: Pt, b: Pt, color: string = this.outline, width = this.lineWidth): void {
    const ctx = this.ctx;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.quadraticCurveTo(c.x, c.y, b.x, b.y);
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.stroke();
  }

  /** Soft contact shadow on the ground. */
  shadow(x: number, y: number, rx: number, ry = rx / 2, alpha = 0.22): void {
    const ctx = this.ctx;
    const g = ctx.createRadialGradient(x, y, 0, x, y, rx);
    g.addColorStop(0, `rgba(30,40,20,${alpha})`);
    g.addColorStop(1, 'rgba(30,40,20,0)');
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(1, ry / rx);
    ctx.translate(-x, -y);
    ctx.beginPath();
    ctx.arc(x, y, rx, 0, Math.PI * 2);
    ctx.fillStyle = g;
    ctx.fill();
    ctx.restore();
  }

  /** A shaded sphere-ish ball (fruit, berries, ornaments, bush clumps). */
  ball(x: number, y: number, r: number, color: string, stroke: string | null = this.outline): void {
    const ctx = this.ctx;
    const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r);
    g.addColorStop(0, shade(color, 0.35));
    g.addColorStop(0.6, color);
    g.addColorStop(1, shade(color, -0.25));
    this.circle(x, y, r, g, stroke);
  }

  /**
   * A puffy canopy made of overlapping balls: great for bushes and tree tops.
   * (x, y) is the canopy centre; r its overall radius.
   */
  foliage(x: number, y: number, r: number, color: string, seed: number | string = 1, puffs = 7): void {
    const rand = rng(seed);
    const pts: { x: number; y: number; r: number }[] = [];
    for (let i = 0; i < puffs; i++) {
      const a = (i / puffs) * Math.PI * 2 + rand() * 0.6;
      const d = r * (0.45 + rand() * 0.2);
      pts.push({ x: x + Math.cos(a) * d, y: y + Math.sin(a) * d * 0.8, r: r * (0.45 + rand() * 0.15) });
    }
    // outline pass then fill pass gives a single merged silhouette
    for (const p of pts) this.circle(p.x, p.y, p.r + this.lineWidth, this.outline, null);
    this.circle(x, y, r * 0.75 + this.lineWidth, this.outline, null);
    for (const p of pts) this.circle(p.x, p.y, p.r, shade(color, -0.12), null);
    this.circle(x, y, r * 0.75, color, null);
    for (const p of pts.slice(0, Math.ceil(puffs / 2))) {
      if (p.y < y) this.circle(p.x - p.r * 0.15, p.y - p.r * 0.15, p.r * 0.7, shade(color, 0.12), null);
    }
    this.circle(x - r * 0.3, y - r * 0.35, r * 0.25, shade(color, 0.28), null);
  }

  /** A simple 5-petal flower head. */
  flower(x: number, y: number, r: number, petal: string, center = '#ffd84a'): void {
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
      this.circle(x + Math.cos(a) * r * 0.6, y + Math.sin(a) * r * 0.6, r * 0.55, petal, shade(petal, -0.35));
    }
    this.circle(x, y, r * 0.35, center, null);
  }

  /** A five-point star. */
  star(x: number, y: number, r: number, fill: Fill, stroke: string | null = this.outline): void {
    const pts: Pt[] = [];
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
      const rr = i % 2 === 0 ? r : r * 0.45;
      pts.push({ x: x + Math.cos(a) * rr, y: y + Math.sin(a) * rr });
    }
    this.poly(pts, fill, stroke);
  }

  /** A heart centred at (x, y). */
  heart(x: number, y: number, s: number, fill: Fill, stroke: string | null = this.outline): void {
    const ctx = this.ctx;
    ctx.beginPath();
    ctx.moveTo(x, y + s * 0.9);
    ctx.bezierCurveTo(x - s * 1.4, y - s * 0.1, x - s * 0.6, y - s * 1.1, x, y - s * 0.35);
    ctx.bezierCurveTo(x + s * 0.6, y - s * 1.1, x + s * 1.4, y - s * 0.1, x, y + s * 0.9);
    ctx.closePath();
    if (fill) {
      ctx.fillStyle = fill;
      ctx.fill();
    }
    if (stroke) this.strokePath(stroke);
  }

  /** Vertical linear gradient helper. */
  vgrad(y0: number, y1: number, top: string, bottom: string): CanvasGradient {
    const g = this.ctx.createLinearGradient(0, y0, 0, y1);
    g.addColorStop(0, top);
    g.addColorStop(1, bottom);
    return g;
  }

  /** Small glowing halo (lamps, lanterns, fireflies). */
  glow(x: number, y: number, r: number, color: string, alpha = 0.55): void {
    const ctx = this.ctx;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, rgba(color, alpha));
    g.addColorStop(1, rgba(color, 0));
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = g;
    ctx.fill();
  }

  text(s: string, x: number, y: number, size: number, color: string, weight = 'bold'): void {
    const ctx = this.ctx;
    ctx.font = `${weight} ${size}px "Trebuchet MS", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = color;
    ctx.fillText(s, x, y);
  }

  save(): void {
    this.ctx.save();
  }

  restore(): void {
    this.ctx.restore();
  }

  private strokePath(color: string, width = this.lineWidth): void {
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = width;
    this.ctx.stroke();
  }
}

// ---------------------------------------------------------------------------
// Rendering specs to canvases

export function spriteSize(spec: Pick<SpriteSpec, 'fw' | 'fh' | 'height'>): { w: number; h: number } {
  return { w: (spec.fw + spec.fh) * 32, h: (spec.fw + spec.fh) * 16 + spec.height };
}

export function renderSprite(spec: SpriteSpec): HTMLCanvasElement {
  const { w, h } = spriteSize(spec);
  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(w * RES);
  canvas.height = Math.ceil(h * RES);
  const ctx = canvas.getContext('2d')!;
  ctx.scale(RES, RES);
  spec.paint(new Pen(ctx, w, h, spec.fw, spec.fh, spec.height));
  return canvas;
}

export function renderIcon(spec: IconSpec): HTMLCanvasElement {
  const size = spec.size ?? ICON;
  const canvas = document.createElement('canvas');
  canvas.width = size * RES;
  canvas.height = size * RES;
  const ctx = canvas.getContext('2d')!;
  ctx.scale(RES, RES);
  spec.paint(new Pen(ctx, size, size));
  return canvas;
}
