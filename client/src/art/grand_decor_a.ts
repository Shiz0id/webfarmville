// Grand decorations, set A: the luxury pieces for late-game farms (100k to 1.5M
// coins). Polished gold, pearl, marble and crystal, each with a few twinkles.
// Same house style as fair.ts and feedmill.ts: soft pastel accents, the warm
// brown OUTLINE, top-left light and glossy highlights. The animal statues get
// closed-eye smiles and blush.
import { type Pen, type Pt, type SpriteSpec, OUTLINE, shade } from './kit';

type Ctx = CanvasRenderingContext2D;
type Fill = string | CanvasGradient | null;
type Side = (x0: number, x1: number) => string | CanvasGradient;

const O = OUTLINE;
const INK = '#2b1d14';
const CHALK = '#fffdf5';
const BLUSH = 'rgba(255,110,140,0.5)';
const GLASS_EDGE = 'rgba(74,52,38,0.55)';

const GOLD_L = '#fff0a6';
const GOLD = '#f4c24a';
const GOLD_D = '#c98b1f';
const PEARL = '#fffaf4';
const MARBLE = '#f5efe6';
const MARBLE_D = '#d6c8b2';
const PINK = '#ffb3cf';
const PINK_D = '#e77fa6';
const PINK_L = '#ffdbe8';
const LILAC = '#c9b8f5';
const BUTTER = '#ffe49a';
const AQUA = '#bdf0ff';
const LEAF = '#6cbf55';
const LEAF_L = '#9ddc7a';
const TEAL = '#5fb9a6';
const BLUE = '#8fc8f5';
const BLUE_D = '#4f8fd8';
const ORANGE = '#ffb35c';
const WHITE = '#fffdf6';

// ---------------------------------------------------------------------------
// Helpers

const pt = (x: number, y: number): Pt => ({ x, y });
const lerp = (a: Pt, b: Pt, t: number): Pt => pt(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t);

/** Polished gold lit from the top-left: a bright band, a warm body and a dark rim. */
function goldAt(c: Ctx, x0: number, x1: number): CanvasGradient {
  const g = c.createLinearGradient(x0, 0, x1, 0);
  g.addColorStop(0, GOLD_D);
  g.addColorStop(0.3, GOLD_L);
  g.addColorStop(0.62, GOLD);
  g.addColorStop(1, shade(GOLD_D, -0.12));
  return g;
}

/** Pearl: a cool lilac shadow side and a white sheen. */
function pearlAt(c: Ctx, x0: number, x1: number): CanvasGradient {
  const g = c.createLinearGradient(x0, 0, x1, 0);
  g.addColorStop(0, '#dcd2e8');
  g.addColorStop(0.3, '#ffffff');
  g.addColorStop(0.7, '#fff6f0');
  g.addColorStop(1, '#d6cce2');
  return g;
}

const goldSide = (p: Pen): Side => (x0, x1) => goldAt(p.ctx, x0, x1);
const pearlSide = (p: Pen): Side => (x0, x1) => pearlAt(p.ctx, x0, x1);

/** A vertical drum standing on the ground point (x, y), with a flat top. */
function drum(p: Pen, x: number, y: number, rx: number, ht: number, side: Side, top: Fill): void {
  const c = p.ctx;
  const ry = rx / 2;
  c.beginPath();
  c.moveTo(x - rx, y - ht);
  c.lineTo(x - rx, y);
  c.ellipse(x, y, rx, ry, 0, Math.PI, 0, true);
  c.lineTo(x + rx, y - ht);
  c.closePath();
  c.fillStyle = side(x - rx, x + rx);
  c.fill();
  c.strokeStyle = p.outline;
  c.lineWidth = p.lineWidth;
  c.stroke();
  p.ellipse(x, y - ht, rx, ry, top);
}

/** A thick line with a dark outline under it: ribbons, stems, handles. */
function tube(p: Pen, pts: Pt[], color: string, w: number): void {
  p.line(pts, O, w + 1.6);
  p.line(pts, color, w);
}

/** The same thick-with-outline treatment for a quadratic curve. */
function curveTube(p: Pen, a: Pt, c: Pt, b: Pt, color: string, w: number): void {
  p.curve(a, c, b, O, w + 1.6);
  p.curve(a, c, b, color, w);
}

/** An elliptical arc, stroked with no outline. */
function arcLine(p: Pen, x: number, y: number, rx: number, ry: number, a0: number, a1: number, color: string, w: number): void {
  const c = p.ctx;
  c.beginPath();
  c.ellipse(x, y, rx, ry, 0, a0, a1);
  c.strokeStyle = color;
  c.lineWidth = w;
  c.stroke();
}

/** A thick elliptical arc with an outline under it. */
function arcTube(p: Pen, x: number, y: number, rx: number, ry: number, a0: number, a1: number, color: string, w: number): void {
  arcLine(p, x, y, rx, ry, a0, a1, O, w + 1.6);
  arcLine(p, x, y, rx, ry, a0, a1, color, w);
}

/** A raw canvas path, filled and/or stroked. */
function shape(p: Pen, build: (c: Ctx) => void, fill: Fill, stroke: string | null = O, width = 1): void {
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
    c.lineWidth = width;
    c.stroke();
  }
}

/** A soft white highlight: a small tilted ellipse of light. */
function glint(p: Pen, x: number, y: number, rx: number, ry: number, rot = -0.5): void {
  p.ellipse(x, y, rx, ry, 'rgba(255,255,255,0.85)', null, rot);
}

/** A four-point twinkle with a warm halo; r is the arm length. */
function sparkle(p: Pen, x: number, y: number, r: number): void {
  p.glow(x, y, r * 2.4, '#fff6c2', 0.6);
  const pts: Pt[] = [];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 - Math.PI / 2;
    const rr = i % 2 === 0 ? r : r * 0.28;
    pts.push(pt(x + Math.cos(a) * rr, y + Math.sin(a) * rr));
  }
  p.poly(pts, CHALK, O, 0.7);
}

/** A fluffy white cloud centred at (x, y); s scales it. */
function cloud(p: Pen, x: number, y: number, s: number): void {
  const puffs: [number, number, number][] = [
    [-6, 1, 4.4],
    [-1.4, -2.6, 5.6],
    [4.6, -0.2, 4.8],
    [9.2, 2.2, 3.2],
  ];
  for (const [dx, dy, r] of puffs) p.circle(x + dx * s, y + dy * s, r * s + 0.9, O, null);
  p.roundRect(x - 10 * s - 0.9, y - 0.4 * s - 0.9, 20 * s + 1.8, 6 * s + 1.8, 3 * s + 0.9, O, null);
  p.roundRect(x - 10 * s, y - 0.4 * s, 20 * s, 6 * s, 3 * s, '#efe9fa', null);
  for (const [dx, dy, r] of puffs) p.circle(x + dx * s, y + dy * s, r * s, WHITE, null);
}

/** Overlapping leafy puffs read as one clipped-hedge silhouette: outlines, then fills. */
function puffs(p: Pen, list: [number, number, number][], color: string): void {
  for (const [x, y, r] of list) p.circle(x, y, r + 0.9, O, null);
  for (const [x, y, r] of list) p.circle(x, y, r, color, null);
  for (const [x, y, r] of list) p.circle(x - r * 0.3, y - r * 0.35, r * 0.42, shade(color, 0.22), null);
}

/** A bauble for the peacock's tail: a blue or gold ball with a dot of the other colour. */
function bauble(p: Pen, x: number, y: number, gold: boolean): void {
  p.ball(x, y, 2.9, gold ? GOLD : BLUE_D);
  p.circle(x, y, 1.2, gold ? BLUE_D : GOLD_L, null);
  p.circle(x - 0.9, y - 1, 0.5, 'rgba(255,255,255,0.9)', null);
}

// ---------------------------------------------------------------------------
// 1. Golden hay bale (1x1)

function goldenHayBale(p: Pen): void {
  const { x: cx, y: G } = p.center; // (32, 56)
  p.shadow(cx, G + 4, 21, 9, 0.25);

  const rx = 18;
  const ht = 25;
  const y = G + 4; // ground centre of the drum
  const top = y - ht;
  drum(p, cx, y, rx, ht, goldSide(p), goldAt(p.ctx, cx - rx, cx + rx));

  // short angled straw strokes, kept clear of the ribbons and bow
  for (const [dx, z] of [
    [-13, 12],
    [-11, 16],
    [12, 9],
    [13, 16],
    [-14, 8],
  ] as [number, number][]) {
    p.line([pt(cx + dx, y - z), pt(cx + dx + 2.6, y - z - 2.6)], GOLD_D, 0.9);
  }

  // two pink satin ribbons round the drum, each with a sheen along its front
  const band = (z: number): void => {
    arcTube(p, cx, y - z, rx + 0.5, rx / 2 + 0.6, 0, Math.PI, PINK, 3.4);
    arcLine(p, cx, y - z - 0.9, rx + 0.5, rx / 2 + 0.2, Math.PI * 0.62, Math.PI * 0.8, 'rgba(255,255,255,0.8)', 0.9);
  };
  band(5);
  band(20);

  // the bow, tied on the front between the ribbons
  const bx = cx;
  const by = y - 12.5 + rx / 2 + 0.6;
  p.poly([pt(bx, by), pt(bx - 4.2, by + 9), pt(bx - 1, by + 9.6)], PINK_D, O, 0.9);
  p.poly([pt(bx, by), pt(bx + 4.2, by + 9), pt(bx + 1, by + 9.6)], PINK_D, O, 0.9);
  p.ellipse(bx - 4.8, by - 2, 4.8, 3.2, PINK, O, -0.45);
  p.ellipse(bx + 4.8, by - 2, 4.8, 3.2, PINK, O, 0.45);
  p.ellipse(bx - 4.8, by - 3, 2, 0.9, 'rgba(255,255,255,0.8)', null, -0.45);
  p.ellipse(bx + 4.8, by - 3, 2, 0.9, 'rgba(255,255,255,0.8)', null, 0.45);
  p.ellipse(bx, by, 2.8, 2.4, PINK_D, O);

  // a spiral on the cut top
  p.ellipse(cx, top, 11.5, 5.7, null, GOLD_D);
  p.ellipse(cx, top, 5.5, 2.7, null, GOLD_D);

  glint(p, cx - 11, y - 14, 1.8, 5.5, 0.2);
  glint(p, cx - 6, top - 1.5, 2.6, 1.1, -0.2);

  sparkle(p, cx + 22, G - 24, 3);
  sparkle(p, cx - 22, G - 12, 2.4);
}

// ---------------------------------------------------------------------------
// 2. Golden cow statue (1x1)

function goldenCowStatue(p: Pen): void {
  const { x: cx, y: G } = p.center; // (32, 72)
  p.shadow(cx, G + 1, 19, 8, 0.25);

  // a cream marble plinth with a gold top trim and grey veins
  p.box(0.2, 0.2, 0.6, 0.6, 14, { top: '#fffaf2', left: MARBLE, right: MARBLE_D });
  const plinthTop = 14;
  tube(p, [p.iso(0.2, 0.8, plinthTop), p.iso(0.8, 0.8, plinthTop), p.iso(0.8, 0.2, plinthTop)], GOLD, 2.2);
  p.curve(p.iso(0.3, 0.8, 3), p.iso(0.45, 0.8, 10), p.iso(0.7, 0.8, 5), MARBLE_D, 0.9);
  p.curve(p.iso(0.8, 0.3, 4), p.iso(0.8, 0.5, 11), p.iso(0.8, 0.7, 6), MARBLE_D, 0.9);

  // stubby gold legs with dark hooves, drawn before the body
  for (const x of [19.5, 38]) {
    p.roundRect(x, 46, 6.5, 12, 3, goldAt(p.ctx, x, x + 6.5));
    p.ellipse(x + 3.25, 57.6, 4, 2, GOLD_D);
  }

  // a little curled tail on the right
  curveTube(p, pt(48, 40), pt(56, 36), pt(55, 47), GOLD, 1.9);
  p.ball(55, 48, 2.4, GOLD_D);

  // the chubby body with darker gold patches and a sheen
  p.ellipse(cx, 42, 17, 11, goldAt(p.ctx, 15, 49));
  p.ellipse(24.5, 39.5, 4.6, 3.2, '#e3a23c', null, 0.3);
  p.ellipse(40.5, 46, 3.6, 2.6, '#e3a23c', null, -0.2);
  p.ellipse(31, 48.5, 2.6, 2, '#e3a23c', null, 0);
  glint(p, 19.5, 40, 1.4, 4.5, 0.25);
  p.curve(pt(22, 35.5), pt(26, 33.5), pt(31, 33), 'rgba(255,255,255,0.8)', 1.3);

  // a pink collar with a tiny gold bell
  arcTube(p, cx, 33, 10.6, 3.2, 0, Math.PI, PINK, 3);
  p.ball(cx, 38.2, 2.8, GOLD);
  p.line([pt(cx - 1.2, 39.8), pt(cx + 1.2, 39.8)], GOLD_D, 0.8);

  // the head: round, with ears, gold horns and a cream muzzle
  p.ellipse(cx, 21.5, 13, 11.5, goldAt(p.ctx, 19, 45));
  p.ellipse(19.6, 18, 5.4, 3, GOLD, O, -0.5);
  p.ellipse(20.2, 18, 2.9, 1.5, PINK, null, -0.5);
  p.ellipse(44.4, 18, 5.4, 3, GOLD, O, 0.5);
  p.ellipse(43.8, 18, 2.9, 1.5, PINK, null, 0.5);
  curveTube(p, pt(24.5, 13), pt(20, 8), pt(23, 3.5), GOLD_L, 2.2);
  curveTube(p, pt(39.5, 13), pt(44, 8), pt(41, 3.5), GOLD_L, 2.2);
  p.ellipse(cx, 28.5, 8, 4.8, '#fff4cf', O);
  p.circle(29.2, 28.2, 0.9, INK, null);
  p.circle(34.8, 28.2, 0.9, INK, null);
  p.curve(pt(28.5, 30.6), pt(32, 32.6), pt(35.5, 30.6), INK, 1.1);

  // closed-eye smiles, blush, and a glossy head highlight
  p.curve(pt(22.5, 20), pt(25.5, 22.6), pt(28.5, 20), INK, 1.5);
  p.curve(pt(35.5, 20), pt(38.5, 22.6), pt(41.5, 20), INK, 1.5);
  p.ellipse(21.5, 26, 3, 1.8, BLUSH, null);
  p.ellipse(42.5, 26, 3, 1.8, BLUSH, null);
  p.curve(pt(21.5, 16), pt(23.5, 12.5), pt(28, 11.5), 'rgba(255,255,255,0.9)', 1.4);

  sparkle(p, 11, 26, 3);
  sparkle(p, 53, 13, 2.6);
  sparkle(p, 12, 48, 2.4);
}

// ---------------------------------------------------------------------------
// 3. Starlight lamp (1x1, tall)

function starlightLamp(p: Pen): void {
  const { x: cx, y: G } = p.center; // (32, 106)
  p.shadow(cx, G + 1, 16, 7, 0.25);

  // a pearl plinth with a gold collar
  drum(p, cx, G + 1, 10, 6, pearlSide(p), '#fffdf8');
  drum(p, cx, G - 5, 6.4, 2.6, goldSide(p), GOLD_L);

  // the curly gold post: a wiggling stem, two scroll curls and beads
  const post: Pt[] = [];
  for (let i = 0; i <= 28; i++) {
    const t = i / 28;
    post.push(pt(cx + Math.sin(t * Math.PI * 3) * 1.3, G - 8 - t * 58));
  }
  p.line(post, O, 4.4);
  p.line(post, GOLD, 2.6);
  p.line(
    post.map((q) => pt(q.x - 0.8, q.y)),
    GOLD_L,
    0.8,
  );
  arcTube(p, cx + 4.6, 84, 4.6, 4.6, Math.PI * 0.95, Math.PI * 2.35, GOLD, 2);
  arcTube(p, cx - 4.6, 62, 4.6, 4.6, -Math.PI * 1.35, Math.PI * 0.05, GOLD, 2);
  p.ball(cx, 94, 2, GOLD);
  p.ball(cx, 72, 2, GOLD);

  // the lantern: a warm glow, glass panes in a gold frame, and a glowing star
  p.glow(cx, 30, 27, '#ffe27a', 0.5);
  p.ellipse(cx, 42, 6.6, 2.4, goldAt(p.ctx, cx - 6.6, cx + 6.6));
  p.roundRect(23, 20, 18, 22, 6, p.vgrad(20, 42, 'rgba(255,253,236,0.97)', 'rgba(255,222,132,0.94)'));
  p.glow(cx, 30, 10, '#fff8b8', 0.9);
  p.line([pt(27.6, 23), pt(27.6, 39)], GOLD, 1.2);
  p.line([pt(36.4, 23), pt(36.4, 39)], GOLD, 1.2);
  p.star(cx, 31, 6.6, '#fffbd6', GOLD_D);
  p.ctx.beginPath();
  p.ctx.roundRect(23, 20, 18, 22, 6);
  p.ctx.strokeStyle = O;
  p.ctx.lineWidth = 3.6;
  p.ctx.stroke();
  p.ctx.strokeStyle = GOLD;
  p.ctx.lineWidth = 2.2;
  p.ctx.stroke();

  // the cap: a gold dome on a ring, with a finial
  shape(
    p,
    (c) => {
      c.moveTo(20, 21);
      c.quadraticCurveTo(32, 2, 44, 21);
    },
    goldAt(p.ctx, 20, 44),
  );
  p.roundRect(19, 18.4, 26, 4, 2, goldAt(p.ctx, 19, 45));
  p.ball(32, 8.5, 2.6, GOLD);
  p.roundRect(20.5, 39.6, 23, 4, 2, goldAt(p.ctx, 20.5, 43.5));

  // a gold arm reaching out to a hanging basket of flowers
  curveTube(p, pt(cx, 56), pt(43, 56), pt(50, 42), GOLD, 2.2);
  p.circle(50, 40.5, 2.2, GOLD_L, O);
  p.line([pt(47.6, 41.5), pt(44.5, 50)], 'rgba(74,52,38,0.7)', 0.8);
  p.line([pt(52.4, 41.5), pt(55.5, 50)], 'rgba(74,52,38,0.7)', 0.8);
  p.foliage(52, 49, 6.2, LEAF_L, 7, 6);
  shape(
    p,
    (c) => {
      c.moveTo(43.5, 50);
      c.quadraticCurveTo(44, 61, 52, 61);
      c.quadraticCurveTo(60, 61, 60.5, 50);
    },
    PINK_L,
  );
  arcLine(p, 52, 53.5, 8.4, 2.8, 0, Math.PI, PINK_D, 0.9);
  arcLine(p, 52, 56.8, 7.2, 2.4, 0, Math.PI, PINK_D, 0.9);
  p.ellipse(52, 50, 8.6, 2.9, GOLD_L);
  p.flower(46.5, 46.5, 2.8, PINK);
  p.flower(54.8, 45.2, 3.1, LILAC);
  p.flower(51.2, 48.8, 2.4, BUTTER);

  sparkle(p, 13, 28, 3);
  sparkle(p, 56, 18, 2.6);
  sparkle(p, 16, 64, 2.4);
}

// ---------------------------------------------------------------------------
// 4. Crystal gazebo (2x2, the centrepiece)

/** A thin full ring (ellipse outline) in a colour, for trims. */
function ringLine(p: Pen, x: number, y: number, rx: number, ry: number, color: string, w: number): void {
  arcLine(p, x, y, rx, ry, 0, Math.PI * 2, color, w);
}

function crystalGazebo(p: Pen): void {
  const { x: cx, y: G } = p.center; // (64, 122)
  const STONE = '#e9e3ef';
  const STONE_L = '#fbf8ff';
  const STONE_D = '#c6bcd4';
  const DOME_A = '#fdf9ff';
  const DOME_B = '#e5dcff';
  p.shadow(cx, G + 2, 52, 25, 0.25);

  // a two-step round stone platform; the lower step is the wider one
  const stoneSide: Side = (x0, x1) => {
    const g = p.ctx.createLinearGradient(x0, 0, x1, 0);
    g.addColorStop(0, STONE_D);
    g.addColorStop(0.35, STONE);
    g.addColorStop(1, shade(STONE_D, -0.1));
    return g;
  };
  drum(p, cx, G, 47.5, 4, stoneSide, STONE_L);
  ringLine(p, cx, G - 4, 47.5, 23.75, GOLD, 1.6);
  arcLine(p, cx, G - 2, 46, 23, 0, Math.PI, STONE_D, 0.8);
  drum(p, cx, G - 4, 41.6, 4, stoneSide, STONE_L);
  ringLine(p, cx, G - 8, 41.6, 20.8, GOLD, 1.2);

  // eight slim pearl columns on an octagon; vertex k sits at angle pi/8 + k*pi/4
  const ang = (k: number): number => Math.PI / 8 + (k * Math.PI) / 4;
  const at = (r: number, k: number, z: number): Pt => p.iso(1 + r * Math.cos(ang(k)), 1 + r * Math.sin(ang(k)), z);
  /** Painter's depth: larger is nearer the viewer. */
  const dep = (r: number, k: number): number => 2 + r * (Math.cos(ang(k)) + Math.sin(ang(k)));
  /** How much a surface facing angle a catches the top-left light. */
  const lit = (a: number): number => Math.cos(a - (3 * Math.PI) / 4);
  const tint = (base: string, L: number): string => shade(base, L >= 0 ? 0.22 * L : 0.2 * L);
  const glass = (a: Pt, b: Pt): CanvasGradient => {
    const g = p.ctx.createLinearGradient(a.x, a.y, b.x, b.y);
    g.addColorStop(0, 'rgba(222,208,255,0.8)');
    g.addColorStop(0.5, 'rgba(186,240,255,0.6)');
    g.addColorStop(1, 'rgba(255,222,242,0.75)');
    return g;
  };
  const COL = 0.8;

  const items: { d: number; draw: () => void }[] = [];
  for (let k = 0; k < 8; k++) {
    const back = dep(COL, k + 0.5) < 2.3;
    const top0 = at(COL, k, 58);
    const top1 = at(COL, k + 1, 58);
    items.push({
      d: dep(COL, k + 0.5),
      draw: () => {
        // only the far spans get a low crystal rail; the near side stays open
        if (back) {
          const a0 = at(COL, k, 8);
          const a1 = at(COL, k + 1, 8);
          const b0 = at(COL, k, 26);
          const b1 = at(COL, k + 1, 26);
          p.poly([a0, a1, b1, b0], glass(b0, a1), GLASS_EDGE, 0.9);
          tube(p, [b0, b1], GOLD, 2);
        }
        // an open gold arch springs between the column capitals
        const m = lerp(top0, top1, 0.5);
        curveTube(p, top0, pt(m.x, m.y - 24), top1, GOLD, 2.2);
      },
    });
    items.push({
      d: dep(COL, k),
      draw: () => {
        const base = at(COL, k, 8);
        drum(p, base.x, base.y, 3.6, 2, goldSide(p), GOLD_L);
        const shaft = at(COL, k, 10);
        drum(p, shaft.x, shaft.y, 2.6, 48, pearlSide(p), PEARL);
        const cap = at(COL, k, 58);
        drum(p, cap.x, cap.y, 3.6, 4, goldSide(p), GOLD_L);
      },
    });
  }

  // a pink bench against the far side, and a potted flower on the near side
  items.push({
    d: 1.8,
    draw: () => {
      p.box(0.8, 0.8, 0.4, 0.05, 15, { top: PINK, left: PINK_D, right: shade(PINK_D, -0.2) }, 8);
      p.box(0.8, 0.85, 0.4, 0.13, 5, { top: PINK_L, left: PINK, right: PINK_D }, 8);
    },
  });
  items.push({
    d: 2.5,
    draw: () => {
      const b = p.iso(1.42, 1.22, 8);
      const potSide: Side = (x0, x1) => {
        const g = p.ctx.createLinearGradient(x0, 0, x1, 0);
        g.addColorStop(0, PINK_L);
        g.addColorStop(0.35, '#ffd3e5');
        g.addColorStop(1, PINK_D);
        return g;
      };
      drum(p, b.x, b.y, 4.4, 6, potSide, PINK_L);
      p.foliage(b.x, b.y - 10, 5.6, LEAF, 4, 5);
      p.flower(b.x - 3.6, b.y - 15, 2.4, PINK);
      p.flower(b.x + 3.4, b.y - 16.5, 2.6, LILAC);
      p.flower(b.x, b.y - 19, 2.2, BUTTER);
    },
  });
  items.sort((a, b) => a.d - b.d);
  for (const it of items) it.draw();

  // fairy lights draped under each arch
  const bulbs = [BUTTER, PINK_L, AQUA];
  for (let k = 0; k < 8; k++) {
    const a = at(COL, k, 50);
    const b = at(COL, k + 1, 50);
    const m = lerp(a, b, 0.5);
    p.curve(a, pt(m.x, m.y + 20), b, 'rgba(74,52,38,0.7)', 1);
    const bulb = pt(m.x, m.y + 10);
    p.glow(bulb.x, bulb.y, 9, bulbs[k % bulbs.length], 0.9);
    p.circle(bulb.x, bulb.y, 2.4, '#fff8c8', O);
  }

  // the gold eave band, with a scalloped lower edge
  const apexZ = 100;
  const apex = p.iso(1, 1, apexZ);
  drum(p, cx, p.iso(1, 1, 70).y, 44.3, 4, goldSide(p), GOLD_L);

  // a low onion dome of pale panels: gold only on the ribs and rings
  const ringAt = (r: number, a: number, z: number): Pt => p.iso(1 + r * Math.cos(a), 1 + r * Math.sin(a), z);
  const depA = (r: number, a: number): number => 2 + r * (Math.cos(a) + Math.sin(a));
  const N = 16;
  const seg = (j: number): number => (j / N) * Math.PI * 2 + Math.PI / N;
  const RINGS: [number, number][] = [
    [0.98, 74],
    [1.0, 81],
    [0.9, 88],
    [0.6, 94],
    [0.26, 97],
  ];
  const faces: { d: number; draw: () => void }[] = [];
  for (let j = 0; j < N; j++) {
    const a0 = seg(j);
    const a1 = seg(j + 1);
    const am = (a0 + a1) / 2;
    const L = lit(am);
    for (let r = 0; r < RINGS.length - 1; r++) {
      const [ra, za] = RINGS[r];
      const [rb, zb] = RINGS[r + 1];
      const fill = (j + r) % 2 ? DOME_B : DOME_A;
      faces.push({
        d: depA((ra + rb) / 2, am),
        draw: () =>
          p.poly(
            [ringAt(ra, a0, za), ringAt(ra, a1, za), ringAt(rb, a1, zb), ringAt(rb, a0, zb)],
            tint(fill, L),
            GOLD,
            1.5,
          ),
      });
    }
    const [rl, zl] = RINGS[RINGS.length - 1];
    faces.push({
      d: depA(rl / 2, am),
      draw: () => p.poly([ringAt(rl, a0, zl), ringAt(rl, a1, zl), apex], tint(DOME_A, L), GOLD, 1.5),
    });
  }
  faces.sort((a, b) => a.d - b.d);
  for (const f of faces) f.draw();

  // scalloped skirt along the eave's lower edge
  const SC = 28;
  for (let j = 0; j < SC; j++) {
    const q = ringAt(0.98, (j / SC) * Math.PI * 2, 70);
    p.circle(q.x, q.y, 3.4, GOLD, O);
  }

  // the star finial
  p.glow(apex.x, apex.y - 6, 12, '#fff3a6', 0.6);
  tube(p, [pt(apex.x, apex.y), pt(apex.x, apex.y - 3)], GOLD_D, 1.8);
  p.star(apex.x, apex.y - 7, 5.6, GOLD_L, O);

  // a few flowers at the foot of the platform
  const foot: [number, string][] = [
    [-30, PINK],
    [-5, BUTTER],
    [20, LILAC],
    [45, PINK_L],
    [70, BUTTER],
    [95, LILAC],
    [120, PINK],
  ];
  for (const [deg, color] of foot) {
    const d = (deg * Math.PI) / 180;
    const q = p.iso(1 + 1.14 * Math.cos(d), 1 + 1.14 * Math.sin(d), 0);
    p.ellipse(q.x, q.y + 1, 4.2, 2, LEAF, O);
    p.flower(q.x, q.y - 2, 2.5, color);
  }

  sparkle(p, 10, 98, 2.6);
  sparkle(p, 118, 58, 3);
  sparkle(p, 14, 34, 2.4);
  sparkle(p, 112, 26, 2.4);
}

// ---------------------------------------------------------------------------
// 5. Topiary peacock (1x1, tall)

function topiaryPeacock(p: Pen): void {
  const { x: cx, y: G } = p.center; // (32, 86)
  p.shadow(cx, G + 1, 17, 7, 0.25);

  // a pink ceramic planter with a gold lip, soil and a gold band
  const pinkSide: Side = (x0, x1) => {
    const g = p.ctx.createLinearGradient(x0, 0, x1, 0);
    g.addColorStop(0, PINK_L);
    g.addColorStop(0.35, '#ffd3e5');
    g.addColorStop(1, PINK_D);
    return g;
  };
  drum(p, cx, G, 11.5, 13, pinkSide, PINK_L);
  drum(p, cx, G - 12, 12.6, 3, goldSide(p), GOLD_L);
  p.ellipse(cx, G - 15, 10.4, 4.6, '#8a6442', O);
  arcTube(p, cx, G - 4, 11.6, 5.8, 0, Math.PI, GOLD, 1.8);

  // the fanned tail: two rings of teal puffs, then the gold and blue eyes
  const inner: [number, number, number][] = [
    [34.1, 50.2, 5],
    [38.7, 50.3, 5.2],
    [42.9, 52.2, 5],
    [46.1, 55.5, 4.6],
  ];
  const outer: [number, number, number][] = [
    [29.5, 40, 6.6],
    [37, 37.6, 6.8],
    [45, 38.4, 6.8],
    [52.4, 43.2, 6.8],
    [57.2, 51, 6.2],
    [56.6, 60, 5.8],
  ];
  puffs(p, inner, shade(TEAL, -0.14));
  puffs(p, outer, TEAL);
  outer.forEach(([x, y], i) => bauble(p, x, y, i % 2 === 0));

  // the body, neck, chest and head, all trimmed from the same hedge
  p.foliage(33, 59, 12, LEAF, 3, 8);
  p.foliage(26, 50, 5.5, LEAF, 9, 5);
  p.foliage(27, 60, 5.8, LEAF_L, 5, 6);

  // a crest of three plumes with blue tips
  const crest: [Pt, Pt, Pt][] = [
    [pt(20, 35), pt(15.5, 28), pt(16, 21.5)],
    [pt(23, 34), pt(22, 26), pt(23.5, 19.5)],
    [pt(25.5, 34.5), pt(29, 28), pt(31, 23)],
  ];
  for (const [a, c, b] of crest) curveTube(p, a, c, b, LEAF_L, 2.2);
  for (const [, , b] of crest) p.ball(b.x, b.y, 2.4, BLUE);

  p.foliage(22, 40, 7.2, LEAF, 8, 6);
  p.poly([pt(16.5, 38.5), pt(9.5, 41), pt(16.5, 43.2)], ORANGE, O, 0.9);
  p.curve(pt(19.6, 38.6), pt(21.8, 40.6), pt(24, 38.6), INK, 1.1);
  p.ellipse(25.2, 42.6, 1.8, 1.1, BLUSH, null);
  glint(p, 19.5, 35.5, 1.6, 0.8, -0.3);
  glint(p, 27, 53, 2, 1, -0.5);

  sparkle(p, 8, 27, 3);
  sparkle(p, 52, 22, 2.8);
  sparkle(p, 60, 31, 2.2);
}

// ---------------------------------------------------------------------------
// 6. Rainbow arch (1x1, tall)

function rainbowArch(p: Pen): void {
  const c = p.ctx;
  const { x: cx, y: G } = p.center; // (32, 96)
  p.glow(cx, 34, 30, '#fff6c4', 0.45);
  p.shadow(cx, G, 25, 9, 0.2);

  // the arch is a soft rainbow: six bands in a tall half-ellipse whose feet sit on
  // the clouds. It lies across the footprint's horizontal diagonal.
  const FEET = 88;
  const BW = 2.8;
  const BANDS = ['#ff9aa8', '#ffc08a', '#fff0a0', '#b5ead7', '#a8d8ff', '#cbb8ff'];
  const rx = (k: number): number => 18.6 - BW * k;
  const arch = (k: number): void => {
    c.beginPath();
    c.ellipse(cx, FEET, rx(k), rx(k) * 3, 0, Math.PI, Math.PI * 2);
  };
  // one dark outline behind the whole stack, then the bands over it
  for (let k = 0; k < BANDS.length; k++) {
    arch(k);
    c.strokeStyle = O;
    c.lineWidth = BW + 1.6;
    c.stroke();
  }
  for (let k = 0; k < BANDS.length; k++) {
    arch(k);
    c.strokeStyle = BANDS[k];
    c.lineWidth = BW;
    c.stroke();
  }
  arcLine(p, cx, FEET, rx(0) - 0.4, rx(0) * 3 - 0.4, Math.PI * 1.2, Math.PI * 1.45, 'rgba(255,255,255,0.85)', 0.9);

  // fluffy clouds at both feet
  cloud(p, cx - 19.5, 92, 1);
  cloud(p, cx + 19.5, 92, 1);

  // stars scattered around the arch
  p.star(cx, 14, 4.2, '#fff1a8');
  p.star(cx - 21, 20, 3, '#fff1a8');
  p.star(cx + 21, 24, 3.2, '#ffd6e8');
  p.star(cx - 24, 46, 2.4, '#ffd6e8');
  p.star(cx + 24, 52, 2.4, '#fff1a8');

  sparkle(p, cx - 12, 10, 2.4);
  sparkle(p, 12, 60, 2.6);
  sparkle(p, 53, 78, 2.2);
}

// ---------------------------------------------------------------------------
// Exports

export const sprites: SpriteSpec[] = [
  { key: 'deco:golden_hay_bale', fw: 1, fh: 1, height: 40, paint: goldenHayBale },
  { key: 'deco:golden_cow_statue', fw: 1, fh: 1, height: 56, paint: goldenCowStatue },
  { key: 'deco:starlight_lamp', fw: 1, fh: 1, height: 90, paint: starlightLamp },
  { key: 'deco:crystal_gazebo', fw: 2, fh: 2, height: 90, paint: crystalGazebo },
  { key: 'deco:topiary_peacock', fw: 1, fh: 1, height: 70, paint: topiaryPeacock },
  { key: 'deco:cloud_rainbow_arch', fw: 1, fh: 1, height: 80, paint: rainbowArch },
];
