// Farm animals (1×1 sprites, facing bottom-left in 3/4 view) and the icons of
// what they produce.
import { type IconSpec, type SpriteSpec, type Pen, shade, rng, mix } from './kit';
import { ANIMAL_LIST } from '@farm/shared';

const INK = '#2b1d14';
const BLUSH = 'rgba(255,120,140,0.45)';

// ---------------------------------------------------------------------------
// Shared bits

function eye(p: Pen, x: number, y: number, r = 1.5): void {
  p.circle(x, y, r, INK, null);
  p.circle(x - r * 0.35, y - r * 0.4, r * 0.42, '#ffffff', null);
}

function blush(p: Pen, x: number, y: number, s = 1): void {
  p.ellipse(x, y, 2.2 * s, 1.3 * s, BLUSH, null);
}

function leg(p: Pen, x: number, y: number, w: number, h: number, color: string, hoof?: string): void {
  p.roundRect(x - w / 2, y - h, w, h, Math.min(w / 2, 1.8), color);
  if (hoof) p.roundRect(x - w / 2, y - 2, w, 2, 0.8, hoof);
}

/** Puffy elliptical fluff cloud (wool, angora). Outline pass then fill pass. */
function fluff(p: Pen, x: number, y: number, rx: number, ry: number, color: string, seed: string, n = 10): void {
  const r = rng(seed);
  const puffs: { x: number; y: number; r: number }[] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + r() * 0.3;
    const pr = Math.min(rx, ry) * (0.42 + r() * 0.12);
    puffs.push({ x: x + Math.cos(a) * (rx - pr * 0.6), y: y + Math.sin(a) * (ry - pr * 0.6), r: pr });
  }
  for (const q of puffs) p.circle(q.x, q.y, q.r + p.lineWidth, p.outline, null);
  p.ellipse(x, y, rx * 0.8 + p.lineWidth, ry * 0.8 + p.lineWidth, p.outline, null);
  for (const q of puffs) p.circle(q.x, q.y, q.r, q.y > y ? shade(color, -0.07) : color, null);
  p.ellipse(x, y, rx * 0.8, ry * 0.8, color, null);
  for (const q of puffs) if (q.y < y - ry * 0.2) p.circle(q.x - q.r * 0.2, q.y - q.r * 0.25, q.r * 0.45, shade(color, 0.5), null);
}

function shadedEllipse(p: Pen, x: number, y: number, rx: number, ry: number, color: string, rot = 0): void {
  const g = p.ctx.createRadialGradient(x - rx * 0.35, y - ry * 0.45, Math.min(rx, ry) * 0.1, x, y, Math.max(rx, ry) * 1.05);
  g.addColorStop(0, shade(color, 0.25));
  g.addColorStop(0.65, color);
  g.addColorStop(1, shade(color, -0.18));
  p.ellipse(x, y, rx, ry, g, p.outline, rot);
}

/** Run `draw` with the context moved so (0, 0) is the centre of the footprint. */
function local(p: Pen, draw: () => void): void {
  const c = p.center;
  p.save();
  p.ctx.translate(c.x, c.y);
  draw();
  p.restore();
}

/** Clip to an ellipse while drawing markings, then re-stroke the outline. */
function within(p: Pen, x: number, y: number, rx: number, ry: number, draw: () => void, rot = 0): void {
  p.save();
  p.ctx.beginPath();
  p.ctx.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2);
  p.ctx.clip();
  draw();
  p.restore();
  p.ellipse(x, y, rx, ry, null, p.outline, rot);
}

// ---------------------------------------------------------------------------
// Animals

function chicken(p: Pen): void {
  local(p, () => {
    p.shadow(1, 0, 16, 6);
    const legC = '#f0a033';
    for (const lx of [-3, 4]) {
      p.line([{ x: lx, y: -8 }, { x: lx, y: -1 }], shade(legC, -0.2), 1.6);
      p.line([{ x: lx - 2.5, y: 0 }, { x: lx + 1.5, y: -0.5 }], shade(legC, -0.2), 1.3);
    }
    // tail feathers
    p.poly(
      [
        { x: 9, y: -12 },
        { x: 13, y: -26 },
        { x: 16, y: -22 },
        { x: 19, y: -24 },
        { x: 18, y: -14 },
      ],
      '#f6efe2',
    );
    shadedEllipse(p, 3, -13, 13, 10, '#fffaf0');
    p.ellipse(7, -13, 6.5, 4.5, shade('#fffaf0', -0.08), p.outline, -0.35);
    p.curve({ x: 4, y: -12 }, { x: 8, y: -10 }, { x: 11, y: -14 }, shade('#fffaf0', -0.25), 0.9);
    // comb behind the head
    for (const [cx, cy, cr] of [
      [-10, -32, 2.6],
      [-7, -34, 3],
      [-4, -32.5, 2.5],
    ])
      p.circle(cx, cy, cr, '#e8424a');
    shadedEllipse(p, -7, -25, 7.5, 7.5, '#fffaf0');
    // beak
    p.poly(
      [
        { x: -13.5, y: -27 },
        { x: -18.5, y: -24.5 },
        { x: -13.5, y: -22.5 },
      ],
      '#ffbf3a',
    );
    p.ellipse(-12.3, -19.8, 1.7, 2.6, '#e8424a');
    eye(p, -9.5, -26.5, 1.5);
    eye(p, -3.6, -26.8, 1.3);
    blush(p, -6, -22.5, 0.8);
  });
}

function cow(p: Pen): void {
  local(p, () => {
    p.shadow(1, 0, 22, 8);
    const white = '#fffaf2';
    const hoof = '#6b4a3a';
    leg(p, 11, -1, 4, 10, shade(white, -0.12), hoof);
    leg(p, 16, -3, 4, 10, shade(white, -0.12), hoof);
    // tail
    p.curve({ x: 19, y: -21 }, { x: 24, y: -16 }, { x: 22, y: -9 }, p.outline, 1.2);
    p.ellipse(22, -8, 1.8, 2.4, '#5a4038');
    shadedEllipse(p, 4, -17, 17, 11, white);
    within(p, 4, -17, 17, 11, () => {
      p.ellipse(10, -22, 6, 4.5, '#3d302b', null, 0.4);
      p.ellipse(-2, -12, 4, 3, '#3d302b', null);
      p.ellipse(18, -13, 4, 5, '#3d302b', null);
    });
    p.ellipse(7, -6.5, 3.5, 2, '#f7b2bd');
    leg(p, -6, 0, 4, 10, white, hoof);
    leg(p, 1, 1, 4, 10, white, hoof);
    // horns & ears
    p.curve({ x: -17, y: -31 }, { x: -19, y: -36 }, { x: -16, y: -38 }, '#efe2c2', 2.6);
    p.curve({ x: -7, y: -31 }, { x: -6, y: -36 }, { x: -9, y: -38 }, '#efe2c2', 2.6);
    p.ellipse(-23, -29, 4.5, 2.3, white, p.outline, 0.35);
    p.ellipse(-1, -29.5, 4.5, 2.3, white, p.outline, -0.35);
    p.ellipse(-23, -29, 2.5, 1.1, '#f7b2bd', null, 0.35);
    p.ellipse(-1, -29.5, 2.5, 1.1, '#f7b2bd', null, -0.35);
    shadedEllipse(p, -12, -25, 10, 9, white);
    within(p, -12, -25, 10, 9, () => p.ellipse(-5, -33, 5, 4, '#3d302b', null));
    // snout
    p.ellipse(-13.5, -18.5, 7.5, 4.6, '#f7b2bd');
    p.ellipse(-16, -18.5, 1.1, 1.5, shade('#f7b2bd', -0.4), null);
    p.ellipse(-11, -18.5, 1.1, 1.5, shade('#f7b2bd', -0.4), null);
    eye(p, -16.5, -26, 1.6);
    eye(p, -8.5, -26.5, 1.5);
    blush(p, -20, -22.5, 0.8);
    blush(p, -5, -23, 0.8);
    // bell
    p.circle(-7, -13, 2.4, '#ffd34a');
    p.circle(-7.6, -13.6, 0.7, '#fff2b0', null);
  });
}

function sheep(p: Pen): void {
  local(p, () => {
    p.shadow(1, 0, 20, 7);
    const face = '#5a4842';
    leg(p, 10, -2, 3.4, 9, face);
    leg(p, 15, -3.5, 3.4, 9, face);
    fluff(p, 4, -16, 17, 12, '#fbf6ea', 'sheep', 12);
    leg(p, -5, 0, 3.4, 9, face);
    leg(p, 1, 0.8, 3.4, 9, face);
    // ears
    p.ellipse(-20, -21, 4, 2, face, p.outline, 0.4);
    p.ellipse(-4, -22, 4, 2, face, p.outline, -0.4);
    shadedEllipse(p, -12, -20, 7.5, 8.5, face);
    // topknot
    fluff(p, -12, -28, 7, 4.5, '#fbf6ea', 'topknot', 6);
    eye(p, -15, -20, 1.7);
    eye(p, -8.5, -20.5, 1.6);
    p.circle(-15, -20, 2.4, null, '#fffaf0');
    p.circle(-8.5, -20.5, 2.3, null, '#fffaf0');
    p.ellipse(-12, -14.5, 1.6, 1, '#f3a0ad', null);
    blush(p, -17, -16.5, 0.7);
    blush(p, -6.5, -17, 0.7);
  });
}

function beehive(p: Pen): void {
  const c = p.center;
  p.shadow(c.x, c.y, 22, 9);
  p.box(0.2, 0.2, 0.6, 0.6, 5, '#9a6a43');
  local(p, () => {
    const straw = '#e8b44c';
    const top = -44;
    const base = -6;
    const ctx = p.ctx;
    ctx.beginPath();
    ctx.moveTo(-17, base);
    ctx.bezierCurveTo(-19, -24, -12, top, 0, top);
    ctx.bezierCurveTo(12, top, 19, -24, 17, base);
    ctx.bezierCurveTo(10, base + 4, -10, base + 4, -17, base);
    ctx.closePath();
    const g = ctx.createLinearGradient(-17, 0, 17, 0);
    g.addColorStop(0, shade(straw, 0.2));
    g.addColorStop(0.45, straw);
    g.addColorStop(1, shade(straw, -0.25));
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = p.outline;
    ctx.lineWidth = 1;
    ctx.stroke();
    // coil bands
    const bands = [-11, -17, -23, -29, -35, -40];
    for (const by of bands) {
      const t = (by - base) / (top - base);
      const w = 17.5 * Math.sqrt(Math.max(0, 1 - t * t * 0.95));
      p.curve({ x: -w, y: by }, { x: 0, y: by + 4 }, { x: w, y: by }, shade(straw, -0.32), 1);
    }
    p.ellipse(-4, -36, 4, 2, shade(straw, 0.45), null, -0.4);
    // entrance
    p.arc(-3, -6, 4.5, Math.PI, 0, '#3a2414');
    // honey drip
    p.ellipse(9, -9.5, 1.5, 3, '#f6a623', shade('#f6a623', -0.35));
    p.circle(9, -6.2, 1.9, '#f6a623', shade('#f6a623', -0.35));
    p.circle(8.4, -6.8, 0.6, '#ffe2a0', null);
    // bees
    const bee = (x: number, y: number, flip: number) => {
      p.ellipse(x + 0.5 * flip, y - 2.6, 2, 1.4, 'rgba(255,255,255,0.85)', shade('#cfe8ff', -0.3), -0.5 * flip);
      p.ellipse(x, y, 3, 2.2, '#ffd23f');
      p.line([{ x: x - 0.3, y: y - 2 }, { x: x - 0.3, y: y + 2 }], INK, 1);
      p.line([{ x: x + 1.4 * flip, y: y - 1.8 }, { x: x + 1.4 * flip, y: y + 1.8 }], INK, 1);
      p.circle(x - 2 * flip, y - 0.4, 0.6, INK, null);
    };
    const trail = (pts: { x: number; y: number }[]) => {
      p.ctx.setLineDash([1.2, 2]);
      p.curve(pts[0], pts[1], pts[2], 'rgba(74,52,38,0.55)', 0.8);
      p.ctx.setLineDash([]);
    };
    trail([
      { x: -12, y: -46 },
      { x: -22, y: -52 },
      { x: -24, y: -40 },
    ]);
    bee(-19, -48, 1);
    trail([
      { x: 14, y: -38 },
      { x: 24, y: -36 },
      { x: 22, y: -27 },
    ]);
    bee(19, -40, -1);
  });
}

function pig(p: Pen): void {
  local(p, () => {
    p.shadow(1, 0, 20, 7);
    const pink = '#f6b3bf';
    leg(p, 10, -2, 4, 7, shade(pink, -0.1));
    leg(p, 15, -3.5, 4, 7, shade(pink, -0.1));
    // curly tail
    const ctx = p.ctx;
    ctx.beginPath();
    ctx.arc(21, -17, 2.4, Math.PI * 0.9, Math.PI * 2.7);
    ctx.strokeStyle = shade(pink, -0.35);
    ctx.lineWidth = 1.4;
    ctx.stroke();
    shadedEllipse(p, 4, -14, 16, 11, pink);
    p.ellipse(12, -10, 3, 1.8, 'rgba(150,100,70,0.35)', null);
    p.ellipse(15, -13, 1.8, 1.2, 'rgba(150,100,70,0.3)', null);
    leg(p, -5, 0, 4, 7, pink);
    leg(p, 1, 0.8, 4, 7, pink);
    // ears
    p.poly(
      [
        { x: -19, y: -21 },
        { x: -22, y: -31 },
        { x: -13, y: -26 },
      ],
      shade(pink, -0.05),
    );
    p.poly(
      [
        { x: -6, y: -26 },
        { x: -2, y: -33 },
        { x: 0, y: -23 },
      ],
      shade(pink, -0.05),
    );
    shadedEllipse(p, -11, -18, 10, 9, pink);
    // snout
    p.ellipse(-14, -14.5, 5.2, 3.6, shade(pink, -0.08));
    p.ellipse(-16, -14.5, 0.9, 1.4, shade(pink, -0.45), null);
    p.ellipse(-12, -14.5, 0.9, 1.4, shade(pink, -0.45), null);
    eye(p, -16.5, -21, 1.5);
    eye(p, -8, -21.5, 1.5);
    blush(p, -20, -17, 0.75);
    blush(p, -5, -17.5, 0.75);
  });
}

function duck(p: Pen): void {
  local(p, () => {
    p.shadow(1, 0, 17, 6);
    const orange = '#f59a2e';
    for (const lx of [-2, 5]) {
      p.ellipse(lx - 1.5, -0.5, 3, 1.3, orange);
      p.line([{ x: lx, y: -5 }, { x: lx, y: -1 }], shade(orange, -0.15), 1.4);
    }
    // body
    const grey = '#e7e2d6';
    // tail
    p.poly(
      [
        { x: 11, y: -14 },
        { x: 18, y: -22 },
        { x: 17, y: -11 },
      ],
      shade(grey, -0.15),
    );
    p.curve({ x: 15, y: -20 }, { x: 15, y: -25 }, { x: 18, y: -25 }, INK, 1.4);
    shadedEllipse(p, 4, -11, 13, 8.5, grey);
    within(p, 4, -11, 13, 8.5, () => p.ellipse(-7, -11, 8, 9, '#a5603c', null));
    // wing
    p.ellipse(7, -12, 7, 4.2, shade(grey, -0.12), p.outline, -0.2);
    p.ellipse(9.5, -11, 3, 1.4, '#3f6fd0', null, -0.2);
    // neck & head
    p.poly(
      [
        { x: -9, y: -15 },
        { x: -6, y: -23 },
        { x: -1, y: -22 },
        { x: -2, y: -14 },
      ],
      '#2f8f5a',
      null,
    );
    p.line([{ x: -8.6, y: -16.5 }, { x: -2.2, y: -16 }], '#ffffff', 2);
    shadedEllipse(p, -5, -25, 7.5, 7, '#2f8f5a');
    p.ellipse(-12.5, -23, 5, 2.3, '#ffc93a', p.outline, 0.15);
    p.line([{ x: -16.5, y: -22.6 }, { x: -9, y: -22.2 }], shade('#ffc93a', -0.3), 0.8);
    eye(p, -8.5, -26.5, 1.5);
    eye(p, -2, -26.5, 1.3);
    blush(p, -5.5, -22.5, 0.7);
  });
}

function goat(p: Pen): void {
  local(p, () => {
    p.shadow(1, 0, 20, 7);
    const coat = '#efe5d2';
    const patch = '#b98a5e';
    const hoof = '#5e4436';
    leg(p, 11, -2, 3.2, 12, shade(coat, -0.12), hoof);
    leg(p, 16, -3.5, 3.2, 12, shade(coat, -0.12), hoof);
    // tail
    p.ellipse(19, -24, 2, 3.5, coat, p.outline, 0.6);
    shadedEllipse(p, 5, -19, 15, 9, coat);
    within(p, 5, -19, 15, 9, () => {
      p.ellipse(12, -23, 6, 5, patch, null);
      p.ellipse(0, -13, 3.5, 2.6, patch, null);
    });
    leg(p, -4, 0, 3.2, 12, coat, hoof);
    leg(p, 2, 0.8, 3.2, 12, coat, hoof);
    // horns sweeping back
    p.curve({ x: -13, y: -35 }, { x: -12, y: -42 }, { x: -4, y: -42 }, '#8a7464', 3);
    p.curve({ x: -7, y: -35 }, { x: -5, y: -41 }, { x: 2, y: -40 }, '#a68d7a', 3);
    // ears (floppy, sideways)
    p.ellipse(-21, -31, 5, 2.2, patch, p.outline, 0.5);
    p.ellipse(-2, -32, 5, 2.2, patch, p.outline, -0.5);
    // head (long face)
    const ctx = p.ctx;
    ctx.beginPath();
    ctx.moveTo(-18, -32);
    ctx.bezierCurveTo(-18, -39, -4, -39, -4, -32);
    ctx.bezierCurveTo(-4, -26, -7, -20, -11, -20);
    ctx.bezierCurveTo(-15, -20, -18, -26, -18, -32);
    ctx.closePath();
    ctx.fillStyle = p.vgrad(-38, -20, shade(coat, 0.2), coat);
    ctx.fill();
    ctx.strokeStyle = p.outline;
    ctx.lineWidth = 1;
    ctx.stroke();
    // beard
    p.poly(
      [
        { x: -13, y: -21 },
        { x: -11, y: -14 },
        { x: -9, y: -21 },
      ],
      '#fffaf0',
    );
    p.ellipse(-11, -23, 3.6, 2.3, '#f2c9b8', null);
    p.ellipse(-12, -23.5, 0.6, 0.9, shade('#f2c9b8', -0.45), null);
    p.ellipse(-10, -23.5, 0.6, 0.9, shade('#f2c9b8', -0.45), null);
    eye(p, -14.5, -30, 1.4);
    eye(p, -7.5, -30.2, 1.4);
    blush(p, -16.5, -26.5, 0.6);
    blush(p, -5.5, -26.5, 0.6);
    // bell collar
    p.line([{ x: -14, y: -21 }, { x: -6, y: -21 }], '#d2493f', 1.5);
    p.circle(-6.5, -18.6, 1.9, '#ffd34a');
  });
}

function rabbit(p: Pen): void {
  local(p, () => {
    p.shadow(1, 0, 18, 7);
    const fur = '#fdf3f2';
    // ears: one up, one flopped back
    const ear = (x: number, y: number, rot: number, len: number) => {
      p.ellipse(x, y, 3.2, len, fur, p.outline, rot);
      p.ellipse(x, y + 0.5, 1.6, len - 2.5, '#f8bccb', null, rot);
    };
    ear(-4, -40, 0.35, 8.5);
    fluff(p, 5, -12, 15, 11, fur, 'rabbitbody', 12);
    // tail puff
    fluff(p, 19, -14, 4, 4, '#ffffff', 'rabbittail', 5);
    fluff(p, -9, -24, 10.5, 9.5, fur, 'rabbithead', 9);
    ear(-14, -40, -0.15, 9);
    // front paws
    p.ellipse(-12, -3, 3.2, 2.2, fur);
    p.ellipse(-4, -2.5, 3.2, 2.2, fur);
    eye(p, -13.5, -24.5, 1.6);
    eye(p, -6, -25, 1.5);
    p.poly(
      [
        { x: -11, y: -21 },
        { x: -8.6, y: -21 },
        { x: -9.8, y: -19.6 },
      ],
      '#f08aa0',
      null,
    );
    p.curve({ x: -11.2, y: -18.6 }, { x: -9.8, y: -17.4 }, { x: -9.8, y: -19.4 }, shade('#f08aa0', -0.3), 0.7);
    p.curve({ x: -8.4, y: -18.6 }, { x: -9.8, y: -17.4 }, { x: -9.8, y: -19.4 }, shade('#f08aa0', -0.3), 0.7);
    blush(p, -16, -20.5, 0.8);
    blush(p, -3.5, -21, 0.8);
    // ribbon
    p.poly(
      [
        { x: -3, y: -33 },
        { x: 1.5, y: -36 },
        { x: 1.5, y: -30 },
      ],
      '#b79cf0',
    );
    p.poly(
      [
        { x: -3, y: -33 },
        { x: -7.5, y: -36 },
        { x: -7.5, y: -30 },
      ],
      '#b79cf0',
    );
    p.circle(-3, -33, 1.4, '#9b7ce6');
  });
}

const ANIMAL_ART: Record<string, { paint: (p: Pen) => void; height: number }> = {
  chicken: { paint: chicken, height: 34 },
  cow: { paint: cow, height: 40 },
  sheep: { paint: sheep, height: 32 },
  beehive: { paint: beehive, height: 44 },
  pig: { paint: pig, height: 32 },
  duck: { paint: duck, height: 32 },
  goat: { paint: goat, height: 44 },
  rabbit: { paint: rabbit, height: 44 },
};

function fallbackAnimal(id: string): (p: Pen) => void {
  const col = mix('#f4d6b0', ['#f6b3bf', '#cfe3ff', '#e6f0c0'][id.length % 3], 0.5);
  return (p) =>
    local(p, () => {
      p.shadow(0, 0, 16, 6);
      shadedEllipse(p, 2, -12, 13, 10, col);
      shadedEllipse(p, -9, -20, 8, 8, col);
      eye(p, -12, -21);
      eye(p, -6, -21.5);
      blush(p, -13, -17, 0.7);
    });
}

export const sprites: SpriteSpec[] = ANIMAL_LIST.map((a) => {
  const art = ANIMAL_ART[a.id];
  return { key: `animal:${a.id}`, fw: 1, fh: 1, height: art?.height ?? 36, paint: art?.paint ?? fallbackAnimal(a.id) };
});

// ---------------------------------------------------------------------------
// Product icons (40×40)

function iconShadow(p: Pen, y = 35, rx = 13): void {
  p.shadow(20, y, rx, 3.5, 0.25);
}

function egg(p: Pen): void {
  iconShadow(p, 35, 11);
  // little straw nest (back half)
  p.ellipse(20, 30, 14, 5, '#c98f45');
  p.ellipse(20, 29.5, 11, 3.2, '#8a5a2a', null);
  const ctx = p.ctx;
  ctx.beginPath();
  ctx.moveTo(20, 6);
  ctx.bezierCurveTo(29, 6, 32, 22, 30, 27);
  ctx.bezierCurveTo(28, 33, 12, 33, 10, 27);
  ctx.bezierCurveTo(8, 22, 11, 6, 20, 6);
  ctx.closePath();
  const g = ctx.createRadialGradient(15, 13, 1, 20, 20, 16);
  g.addColorStop(0, '#fffaf2');
  g.addColorStop(0.6, '#f6e2c4');
  g.addColorStop(1, '#ddbf98');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = p.outline;
  ctx.lineWidth = 1;
  ctx.stroke();
  p.ellipse(15.5, 13, 2.2, 3.6, 'rgba(255,255,255,0.85)', null, 0.35);
  p.circle(24, 22, 0.8, '#c9a079', null);
  p.circle(22, 26, 0.6, '#c9a079', null);
  // nest front rim over the egg's base
  p.ctx.save();
  p.ctx.beginPath();
  p.ctx.rect(0, 30, 40, 10);
  p.ctx.clip();
  p.ellipse(20, 30, 14, 5, '#d9a84a');
  p.restore();
  p.line([{ x: 6.3, y: 30 }, { x: 33.7, y: 30 }], p.outline, 1);
  for (let i = 0; i < 6; i++) {
    const x = 9 + i * 4.4;
    p.curve({ x: x - 2, y: 32 }, { x, y: 30.5 + (i % 2) * 3 }, { x: x + 3, y: 33 }, '#a8742e', 0.8);
  }
}

function milk(p: Pen): void {
  iconShadow(p);
  const ctx = p.ctx;
  // bottle silhouette
  ctx.beginPath();
  ctx.moveTo(15.5, 9);
  ctx.lineTo(24.5, 9);
  ctx.lineTo(24.5, 13);
  ctx.quadraticCurveTo(29, 16, 29, 21);
  ctx.lineTo(29, 32);
  ctx.quadraticCurveTo(29, 35, 26, 35);
  ctx.lineTo(14, 35);
  ctx.quadraticCurveTo(11, 35, 11, 32);
  ctx.lineTo(11, 21);
  ctx.quadraticCurveTo(11, 16, 15.5, 13);
  ctx.closePath();
  const g = ctx.createLinearGradient(11, 0, 29, 0);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(0.6, '#f4f6fa');
  g.addColorStop(1, '#cfd8e6');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = p.outline;
  ctx.lineWidth = 1;
  ctx.stroke();
  // label
  p.rect(11, 22, 18, 7, '#5aa0e6');
  p.rect(11, 24.5, 18, 2, '#ffffff', null);
  p.ellipse(16, 25.5, 1.6, 1.1, '#3d302b', null);
  p.ellipse(23, 25.5, 1.3, 1, '#3d302b', null);
  // cap
  p.roundRect(14.5, 5.5, 11, 4.5, 1.5, '#e8424a');
  p.line([{ x: 15.5, y: 7.5 }, { x: 24.5, y: 7.5 }], shade('#e8424a', 0.35), 0.8);
  p.line([{ x: 13.5, y: 18 }, { x: 13.5, y: 31 }], 'rgba(255,255,255,0.9)', 1.6);
}

function wool(p: Pen): void {
  iconShadow(p, 34, 14);
  fluff(p, 20, 22, 14, 10, '#fbf5e8', 'woolicon', 11);
  // crimp curls
  for (const [x, y] of [
    [14, 21],
    [21, 18],
    [26, 24],
    [18, 26],
  ]) {
    p.ctx.beginPath();
    p.ctx.arc(x, y, 2, 0.2, Math.PI * 1.6);
    p.ctx.strokeStyle = '#d8ccb4';
    p.ctx.lineWidth = 0.9;
    p.ctx.stroke();
  }
}

function honey(p: Pen): void {
  iconShadow(p);
  // dipper handle behind
  p.line([{ x: 25, y: 18 }, { x: 33, y: 3 }], p.outline, 3.6);
  p.line([{ x: 25, y: 18 }, { x: 33, y: 3 }], '#c98a4b', 2);
  // jar
  p.roundRect(9, 13, 22, 22, 6, p.vgrad(13, 35, '#ffc24a', '#e08a12'));
  p.rect(12, 20, 16, 9, '#fff3d6');
  p.text('HONEY', 20, 24.6, 4.2, '#b5651d');
  p.ellipse(20, 13, 11, 2.5, '#d18a2a');
  // cloth lid with string
  p.poly(
    [
      { x: 7, y: 13 },
      { x: 33, y: 13 },
      { x: 30, y: 8 },
      { x: 10, y: 8 },
    ],
    '#ef6b6b',
  );
  p.circle(14, 10.5, 0.9, '#ffffff', null);
  p.circle(20, 10.5, 0.9, '#ffffff', null);
  p.circle(26, 10.5, 0.9, '#ffffff', null);
  p.line([{ x: 9, y: 13 }, { x: 31, y: 13 }], '#8a5a2a', 1.2);
  // dipper head peeking out
  p.roundRect(30, 1, 6, 5, 2, '#d99a5b');
  p.line([{ x: 30.5, y: 3.5 }, { x: 35.5, y: 3.5 }], shade('#d99a5b', -0.3), 0.7);
  // drip
  p.poly(
    [
      { x: 13, y: 13 },
      { x: 17, y: 13 },
      { x: 15.5, y: 18 },
    ],
    '#f5a623',
    null,
  );
  p.circle(15.4, 18, 1.5, '#f5a623', null);
  p.line([{ x: 11.5, y: 17 }, { x: 11.5, y: 31 }], 'rgba(255,255,255,0.55)', 1.5);
}

function truffle(p: Pen): void {
  iconShadow(p, 33, 13);
  const r = rng('truffle');
  const brown = '#5b3d2e';
  const lumps = [
    [14, 22, 8],
    [24, 21, 9],
    [19, 15, 8],
    [19, 26, 8],
  ];
  for (const [x, y, rr] of lumps) p.circle(x, y, rr + 1, p.outline, null);
  for (const [x, y, rr] of lumps) p.ball(x, y, rr, brown, null);
  for (let i = 0; i < 26; i++) {
    const a = r() * Math.PI * 2;
    const d = r() * 11;
    p.circle(19 + Math.cos(a) * d, 21 + Math.sin(a) * d * 0.9, 0.7, shade(brown, r() > 0.5 ? 0.25 : -0.35), null);
  }
  p.ellipse(15, 14, 3, 1.5, 'rgba(255,255,255,0.3)', null, -0.5);
  // a little leaf
  p.ellipse(29, 10, 5, 2.4, '#6fb24c', p.outline, -0.6);
  p.line([{ x: 25.5, y: 13 }, { x: 32, y: 7.5 }], shade('#6fb24c', -0.3), 0.8);
}

function feather(p: Pen): void {
  iconShadow(p, 35, 10);
  const ctx = p.ctx;
  ctx.save();
  ctx.translate(20, 20);
  ctx.rotate(0.6);
  ctx.beginPath();
  ctx.moveTo(0, -17);
  ctx.bezierCurveTo(8, -12, 8, 4, 1, 12);
  ctx.lineTo(-1, 12);
  ctx.bezierCurveTo(-8, 4, -7, -12, 0, -17);
  ctx.closePath();
  const g = ctx.createLinearGradient(0, -17, 0, 12);
  g.addColorStop(0, '#5aa7c9');
  g.addColorStop(0.55, '#7fc2b8');
  g.addColorStop(1, '#f6f1e6');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = p.outline;
  ctx.lineWidth = 1;
  ctx.stroke();
  // notches
  p.line([{ x: 5.2, y: -4 }, { x: 2, y: -2.5 }], p.outline, 1);
  p.line([{ x: -5.5, y: 2 }, { x: -2.5, y: 3 }], p.outline, 1);
  // barbs
  for (let i = 0; i < 5; i++) {
    const y = -12 + i * 4.5;
    p.line([{ x: 0, y }, { x: 4, y: y - 2 }], 'rgba(255,255,255,0.5)', 0.7);
    p.line([{ x: 0, y }, { x: -4, y: y - 2 }], 'rgba(255,255,255,0.5)', 0.7);
  }
  p.line([{ x: 0, y: -15 }, { x: 0, y: 18 }], '#f8eedb', 1.6);
  p.line([{ x: 0, y: 12 }, { x: 0, y: 18 }], p.outline, 0.6);
  ctx.restore();
}

function goatMilk(p: Pen): void {
  iconShadow(p, 35, 12);
  const ctx = p.ctx;
  const cream = '#f3e6cf';
  // handle
  ctx.beginPath();
  ctx.arc(28.5, 22, 5, -Math.PI / 2, Math.PI / 2);
  ctx.strokeStyle = p.outline;
  ctx.lineWidth = 3.6;
  ctx.stroke();
  ctx.strokeStyle = shade(cream, -0.1);
  ctx.lineWidth = 2;
  ctx.stroke();
  // jug body
  ctx.beginPath();
  ctx.moveTo(10, 12);
  ctx.lineTo(7, 10);
  ctx.lineTo(13, 10);
  ctx.lineTo(27, 10);
  ctx.quadraticCurveTo(27, 15, 29, 20);
  ctx.quadraticCurveTo(32, 34, 24, 35);
  ctx.lineTo(14, 35);
  ctx.quadraticCurveTo(7, 34, 10, 20);
  ctx.quadraticCurveTo(12, 15, 10, 12);
  ctx.closePath();
  const g = ctx.createLinearGradient(8, 0, 31, 0);
  g.addColorStop(0, shade(cream, 0.4));
  g.addColorStop(0.5, cream);
  g.addColorStop(1, shade(cream, -0.18));
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = p.outline;
  ctx.lineWidth = 1;
  ctx.stroke();
  p.ellipse(18.5, 10.5, 8, 1.6, '#ffffff');
  // green band
  p.line([{ x: 10.5, y: 17 }, { x: 28, y: 17 }], '#7bb661', 2);
  // tag on a string with a goat face
  p.line([{ x: 12, y: 18 }, { x: 9, y: 25 }], '#b07a4a', 0.8);
  p.roundRect(3, 24, 12, 10, 2, '#fff7e0');
  p.curve({ x: 6.5, y: 27.5 }, { x: 5.5, y: 25 }, { x: 4, y: 25 }, '#8a7464', 1.2);
  p.curve({ x: 11.5, y: 27.5 }, { x: 12.5, y: 25 }, { x: 14, y: 25 }, '#8a7464', 1.2);
  p.ellipse(9, 29.5, 3, 3.2, '#e8dcc6', p.outline);
  p.circle(8, 29, 0.6, INK, null);
  p.circle(10, 29, 0.6, INK, null);
  p.poly(
    [
      { x: 8.3, y: 32.3 },
      { x: 9.7, y: 32.3 },
      { x: 9, y: 34.5 },
    ],
    '#ffffff',
    null,
  );
}

function angora(p: Pen): void {
  iconShadow(p, 34, 13);
  fluff(p, 18, 23, 12, 9, '#f9d6e6', 'angora1', 9);
  fluff(p, 25, 17, 8, 7, '#e4d6fa', 'angora2', 7);
  // wispy strands
  for (const [a, b, c] of [
    [
      { x: 8, y: 22 },
      { x: 4, y: 18 },
      { x: 5, y: 14 },
    ],
    [
      { x: 31, y: 13 },
      { x: 35, y: 9 },
      { x: 34, y: 5 },
    ],
    [
      { x: 29, y: 26 },
      { x: 34, y: 27 },
      { x: 36, y: 24 },
    ],
  ])
    p.curve(a, b, c, '#e7b4cf', 1);
  p.star(10, 9, 3, '#fff6b0', null);
  p.circle(10, 9, 0.9, '#ffffff', null);
}

const PRODUCT_ART: Record<string, (p: Pen) => void> = {
  egg,
  milk,
  wool,
  honey,
  truffle,
  feather,
  goat_milk: goatMilk,
  angora,
};

function fallbackProduct(p: Pen): void {
  iconShadow(p);
  p.ball(20, 20, 12, '#f2c879');
}

export const icons: IconSpec[] = ANIMAL_LIST.map((a) => ({
  key: `icon:${a.product}`,
  paint: PRODUCT_ART[a.product] ?? fallbackProduct,
}));
