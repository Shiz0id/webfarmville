// Quest-giver portraits: chibi head-and-shoulders busts on a pastel medallion.
// Keys are `portrait:<giverKey(name)>` (see manifest.ts giverKey).
import { type IconSpec, type SpriteSpec, type Pen, shade, mix, rgba } from './kit';

export const sprites: SpriteSpec[] = [];

const CX = 20;
const DISC = 18.6;
const LINE = 0.8;
const INK = '#2b1d14';
const WHITE = '#ffffff';
const BLUSH = 'rgba(255,115,140,0.5)';

// ---------------------------------------------------------------------------
// Shared bits

/** A softly lit blob: highlight up-left, shadow down-right. */
function puff(p: Pen, x: number, y: number, rx: number, ry: number, color: string): void {
  const g = p.ctx.createRadialGradient(x - rx * 0.35, y - ry * 0.4, Math.min(rx, ry) * 0.1, x, y, Math.max(rx, ry) * 1.05);
  g.addColorStop(0, shade(color, 0.3));
  g.addColorStop(0.62, color);
  g.addColorStop(1, shade(color, -0.16));
  p.ellipse(x, y, rx, ry, g, p.outline);
}

/** Pastel medallion background; the bust is clipped to it until `end`. */
function begin(p: Pen, bg: string): void {
  p.lineWidth = LINE;
  const g = p.ctx.createRadialGradient(14, 12, 1, CX, CX, DISC + 1);
  g.addColorStop(0, mix(bg, WHITE, 0.6));
  g.addColorStop(0.65, bg);
  g.addColorStop(1, shade(bg, -0.1));
  p.circle(CX, CX, DISC, g, null);
  p.circle(CX, CX, DISC - 2.6, null, rgba(WHITE, 0.6));
  p.save();
  p.ctx.beginPath();
  p.ctx.arc(CX, CX, DISC, 0, Math.PI * 2);
  p.ctx.clip();
}

/** A small four-point glint, the kind that makes a portrait feel alive. */
function sparkle(p: Pen, x: number, y: number, r: number): void {
  const k = r * 0.22;
  p.poly(
    [
      { x, y: y - r },
      { x: x + k, y: y - k },
      { x: x + r, y },
      { x: x + k, y: y + k },
      { x, y: y + r },
      { x: x - k, y: y + k },
      { x: x - r, y },
      { x: x - k, y: y - k },
    ],
    rgba(WHITE, 0.95),
    null,
  );
}

function end(p: Pen): void {
  p.restore();
  p.lineWidth = LINE;
  sparkle(p, 32.4, 8.4, 1.9);
  p.circle(CX, CX, DISC, null, p.outline);
}

/** Big kawaii eyes: dark ovals with a main and a small secondary highlight. */
function eyes(p: Pen, y: number, xs: [number, number], r = 2): void {
  for (const x of xs) {
    p.ellipse(x, y, r * 0.92, r * 1.18, INK, null);
    p.circle(x - r * 0.38, y - r * 0.5, r * 0.42, WHITE, null);
    p.circle(x + r * 0.42, y + r * 0.38, r * 0.2, WHITE, null);
  }
}

function blush(p: Pen, x: number, y: number): void {
  p.ellipse(x, y, 2.1, 1.2, BLUSH, null);
}

/** A soft satin highlight on a surface. */
function sheen(p: Pen, x: number, y: number, rx: number, ry: number, rot = 0, alpha = 0.45): void {
  p.ellipse(x, y, rx, ry, rgba(WHITE, alpha), null, rot);
}

function smile(p: Pen, x: number, y: number, w = 1.9): void {
  p.curve({ x: x - w, y }, { x, y: y + w * 0.9 }, { x: x + w, y }, INK, 0.75);
}

// ---------------------------------------------------------------------------
// The five givers

/** Mayor Maple: wise owl in spectacles, bow tie and a maple-leaf pin. */
function owl(p: Pen): void {
  begin(p, '#dcd0f5');
  const body = '#a8733f';
  const cream = '#fbeed0';
  const rim = '#c99a3e';
  const bow = '#d8455c';

  puff(p, CX, 38.5, 15, 10.5, '#8e5e35');
  p.ellipse(CX, 34.5, 6.4, 5.4, '#f3dcaa', p.outline);
  // wing feather scallops at the shoulders
  for (const sx of [-1, 1]) {
    const ox = CX + sx * 13.2;
    p.curve({ x: ox - sx * 1.2, y: 31.6 }, { x: ox, y: 33.2 }, { x: ox - sx * 1.6, y: 35.6 }, shade('#8e5e35', -0.3), 0.6);
  }

  // ear tufts, behind the head
  p.poly(
    [
      { x: 10, y: 14 },
      { x: 9.2, y: 4.8 },
      { x: 15.8, y: 9.8 },
    ],
    shade(body, -0.06),
  );
  p.poly(
    [
      { x: 30, y: 14 },
      { x: 30.8, y: 4.8 },
      { x: 24.2, y: 9.8 },
    ],
    shade(body, -0.06),
  );

  puff(p, CX, 18, 12.2, 11, body);

  // face discs
  p.circle(15.4, 18.6, 5.8, cream, shade(body, -0.35));
  p.circle(24.6, 18.6, 5.8, cream, shade(body, -0.35));

  // spectacles
  p.circle(15.4, 18.6, 3.9, rgba('#dff0ff', 0.35), rim);
  p.circle(24.6, 18.6, 3.9, rgba('#dff0ff', 0.35), rim);
  p.line([{ x: 19.3, y: 18.2 }, { x: 20.7, y: 18.2 }], rim, 0.8);

  sheen(p, 14.2, 11.6, 2.8, 1.3, -0.5);
  eyes(p, 18.9, [15.4, 24.6], 1.85);

  // beak
  p.poly(
    [
      { x: 18.7, y: 21.8 },
      { x: 21.3, y: 21.8 },
      { x: 20, y: 24.6 },
    ],
    '#f7a545',
  );

  // bow tie
  p.poly(
    [
      { x: 20, y: 28.9 },
      { x: 15.2, y: 26.6 },
      { x: 15.2, y: 31.2 },
    ],
    bow,
  );
  p.poly(
    [
      { x: 20, y: 28.9 },
      { x: 24.8, y: 26.6 },
      { x: 24.8, y: 31.2 },
    ],
    bow,
  );
  p.circle(CX, 28.9, 1.2, shade(bow, -0.2));

  // maple-leaf pin
  const leaf = '#e8703f';
  const lx = 27.6;
  const ly = 33.6;
  for (const a of [-90, -18, 54, 126, 198]) {
    const r = (a * Math.PI) / 180;
    p.circle(lx + Math.cos(r) * 2.1, ly + Math.sin(r) * 2.1, 1.3, leaf, shade(leaf, -0.45));
  }
  p.circle(lx, ly, 2, leaf, shade(leaf, -0.45));
  p.line([{ x: lx, y: ly }, { x: lx, y: ly + 2.6 }], shade(leaf, -0.4), 0.6);

  end(p);
}

/** Henrietta: motherly hen in a gingham headscarf and a gingham apron. */
function hen(p: Pen): void {
  begin(p, '#c9f1dd');
  const feather = '#fffaf0';
  const scarf = '#f0839a';
  const apron = '#8ccbf0';
  const comb = '#e8424a';

  puff(p, CX, 38.5, 15, 10.5, feather);

  // gingham apron bib
  p.save();
  p.ctx.beginPath();
  p.ctx.roundRect(12.5, 29.5, 15, 14, 3);
  p.ctx.clip();
  p.rect(12, 29, 16, 15, apron, null);
  p.ctx.fillStyle = rgba(WHITE, 0.5);
  for (let x = 12; x < 28; x += 3.5) p.ctx.fillRect(x, 28, 1.3, 16);
  for (let y = 29; y < 44; y += 3.5) p.ctx.fillRect(12, y, 16, 1.3);
  p.restore();
  p.roundRect(12.5, 29.5, 15, 14, 3, null);

  // comb bumps poking out above the scarf
  for (const [x, y] of [
    [16.4, 8],
    [20, 6.4],
    [23.6, 8],
  ])
    p.circle(x, y, 2.2, comb);

  puff(p, CX, 19.5, 11.5, 10.5, feather);

  // gingham headscarf
  const scarfPath = () => {
    const ctx = p.ctx;
    ctx.beginPath();
    ctx.moveTo(7.5, 19.5);
    ctx.quadraticCurveTo(20, -1.5, 32.5, 19.5);
    ctx.quadraticCurveTo(20, 11.5, 7.5, 19.5);
    ctx.closePath();
  };
  p.save();
  scarfPath();
  p.ctx.clip();
  p.ctx.fillStyle = scarf;
  p.ctx.fillRect(0, 0, 40, 40);
  p.ctx.fillStyle = rgba(WHITE, 0.5);
  for (let x = 4; x < 36; x += 4) p.ctx.fillRect(x, 0, 1.5, 40);
  for (let y = 0; y < 22; y += 4) p.ctx.fillRect(0, y, 40, 1.5);
  p.restore();
  p.save();
  scarfPath();
  p.ctx.strokeStyle = p.outline;
  p.ctx.lineWidth = LINE;
  p.ctx.stroke();
  p.restore();

  sheen(p, 15.4, 12.8, 2.6, 1.1, -0.35, 0.5);

  // knot tails at the side
  p.poly(
    [
      { x: 31.5, y: 17.5 },
      { x: 35.6, y: 22.5 },
      { x: 31, y: 23.5 },
    ],
    scarf,
  );

  eyes(p, 19.8, [15.6, 24.4], 2);

  // beak
  p.poly(
    [
      { x: 18.4, y: 22.8 },
      { x: 21.6, y: 22.8 },
      { x: 20, y: 25.4 },
    ],
    '#ffbf3a',
  );
  blush(p, 11.6, 23.4);
  blush(p, 28.4, 23.4);

  end(p);
}

/** Penny: cheerful pig shopkeeper with a polka-dot bandana and a coin pouch. */
function pig(p: Pen): void {
  begin(p, '#c4e8fb');
  const pink = '#ffc3d1';
  const deep = '#f29bb0';
  const bandana = '#e5495c';

  puff(p, CX, 38.5, 15, 10.5, '#ffb3c4');

  // floppy ears hanging out beside the head
  p.poly(
    [
      { x: 10.4, y: 11.4 },
      { x: 5.2, y: 10.6 },
      { x: 5.8, y: 18.6 },
      { x: 11.2, y: 16.4 },
    ],
    deep,
  );
  p.poly(
    [
      { x: 29.6, y: 11.4 },
      { x: 34.8, y: 10.6 },
      { x: 34.2, y: 18.6 },
      { x: 28.8, y: 16.4 },
    ],
    deep,
  );

  puff(p, CX, 19, 11.5, 10.5, pink);

  // snout
  puff(p, CX, 23.6, 4.8, 3.4, '#ffa9bc');
  p.ellipse(18.2, 23.6, 0.8, 1.1, '#b8566e', null);
  p.ellipse(21.8, 23.6, 0.8, 1.1, '#b8566e', null);

  eyes(p, 18.4, [15.6, 24.4], 2);
  blush(p, 11.4, 22.2);
  blush(p, 28.6, 22.2);

  // bandana wrapped over the top of the head, knot at the side
  p.ctx.save();
  p.ctx.beginPath();
  p.ctx.moveTo(8.2, 14.6);
  p.ctx.quadraticCurveTo(20, -1.5, 31.8, 14.6);
  p.ctx.quadraticCurveTo(20, 11.6, 8.2, 14.6);
  p.ctx.closePath();
  p.ctx.fillStyle = bandana;
  p.ctx.fill();
  p.ctx.strokeStyle = p.outline;
  p.ctx.lineWidth = LINE;
  p.ctx.stroke();
  p.ctx.restore();
  p.poly(
    [
      { x: 30.6, y: 13.4 },
      { x: 36.4, y: 10.2 },
      { x: 35.2, y: 15.6 },
      { x: 30.6, y: 15.4 },
    ],
    bandana,
  );
  p.poly(
    [
      { x: 30.6, y: 15.2 },
      { x: 35.6, y: 17.4 },
      { x: 33.8, y: 21.4 },
      { x: 30.4, y: 17.8 },
    ],
    shade(bandana, -0.08),
  );
  for (const [x, y] of [
    [20, 9.4],
    [14.2, 10.8],
    [25.8, 10.8],
    [10.6, 13.2],
    [29.4, 13.2],
  ])
    p.circle(x, y, 0.95, WHITE, null);

  // coin pouch with a gold coin peeking out
  puff(p, 12, 34.6, 4.1, 3.9, '#c98a4b');
  p.curve({ x: 8.4, y: 32 }, { x: 12, y: 33.6 }, { x: 15.6, y: 32 }, shade('#c98a4b', -0.45), 0.7);
  p.circle(12, 30.2, 2.5, '#ffd34a');
  p.circle(12, 30.2, 1.4, '#ffe98a', null);
  p.circle(11.4, 29.6, 0.45, WHITE, null);

  end(p);
}

/** Rosie: sweet bunny decorator with a flower crown. */
function bunny(p: Pen): void {
  begin(p, '#ffd8c2');
  const fur = '#fff9f1';
  const inner = '#ffa8b8';
  const vine = '#7fcf8a';

  puff(p, CX, 38.5, 15, 10.5, fur);
  // little bow at the neck
  const bow = '#ff8fb1';
  p.poly(
    [
      { x: 20, y: 29.6 },
      { x: 15.8, y: 27.4 },
      { x: 15.8, y: 31.8 },
    ],
    bow,
  );
  p.poly(
    [
      { x: 20, y: 29.6 },
      { x: 24.2, y: 27.4 },
      { x: 24.2, y: 31.8 },
    ],
    bow,
  );
  p.circle(CX, 29.6, 1, shade(bow, -0.2));

  // long ears behind the head
  for (const ex of [14.6, 25.4]) {
    p.ellipse(ex, 9.4, 3.4, 7.2, fur);
    p.ellipse(ex, 9.9, 1.6, 4.8, inner, null);
  }

  puff(p, CX, 19, 11.5, 10.5, fur);
  sheen(p, 14.6, 12.6, 2.8, 1.2, -0.45);

  // flower crown on a green vine
  p.ctx.beginPath();
  p.ctx.moveTo(9.2, 14.2);
  p.ctx.quadraticCurveTo(20, 2.6, 30.8, 14.2);
  p.ctx.strokeStyle = vine;
  p.ctx.lineWidth = 1.1;
  p.ctx.stroke();
  const petals = ['#ff9ab5', '#c9a6ff', '#ffe27a', '#ff9ab5', '#9fd8ff'];
  [
    [11, 12.4],
    [15.8, 8.6],
    [24.2, 8.6],
    [29, 12.4],
  ].forEach(([x, y], i) => p.flower(x, y, 2.5, petals[i]));

  eyes(p, 19.6, [15.6, 24.4], 2);
  // nose and "w" mouth
  p.ellipse(CX, 22.4, 1.3, 0.95, '#ff7f9c', null);
  p.ctx.beginPath();
  p.ctx.moveTo(CX, 23.3);
  p.ctx.quadraticCurveTo(18.6, 25.6, 17.2, 23.6);
  p.ctx.moveTo(CX, 23.3);
  p.ctx.quadraticCurveTo(21.4, 25.6, 22.8, 23.6);
  p.ctx.strokeStyle = INK;
  p.ctx.lineWidth = 0.7;
  p.ctx.stroke();
  blush(p, 11.4, 23.4);
  blush(p, 28.6, 23.4);

  end(p);
}

/** Grandma Fern: gentle hedgehog grandma with round glasses, a lilac shawl and a jam jar. */
function hedgehog(p: Pen): void {
  begin(p, '#fff0b0');
  const quill = '#7d5a3e';
  const face = '#f8e2c0';
  const shawl = '#d58fb5';
  const copper = '#b07a3e';

  puff(p, CX, 38.5, 15.5, 10.5, shawl);
  p.circle(CX, 31.6, 1.3, '#ffd34a');

  // quills fanning over the head, drawn before the face so their bases hide
  const quills: [number, number][] = [
    [186, 15.4],
    [212, 17.2],
    [240, 16],
    [270, 17.6],
    [300, 16.2],
    [328, 17],
    [354, 15.2],
  ];
  for (const [deg, len] of quills) {
    const a = (deg * Math.PI) / 180;
    const sp = 0.17;
    const at = (ang: number, rx: number, ry: number) => ({ x: CX + Math.cos(ang) * rx, y: 18.5 + Math.sin(ang) * ry });
    p.poly([at(a - sp, 10.8, 10), at(a, len, len * 0.95), at(a + sp, 10.8, 10)], quill);
  }

  puff(p, CX, 18.5, 11.2, 10.2, face);
  sheen(p, 14.4, 11.4, 2.6, 1.2, -0.5);

  // round glasses
  p.circle(15.6, 18.6, 3.6, rgba('#dff0ff', 0.3), copper);
  p.circle(24.4, 18.6, 3.6, rgba('#dff0ff', 0.3), copper);
  p.line([{ x: 19.2, y: 18.2 }, { x: 20.8, y: 18.2 }], copper, 0.8);
  p.line([{ x: 12, y: 18.2 }, { x: 12.4, y: 17.6 }], copper, 0.8);
  p.line([{ x: 28, y: 18.2 }, { x: 27.6, y: 17.6 }], copper, 0.8);

  eyes(p, 18.9, [15.6, 24.4], 1.85);

  // nose and smile
  p.ellipse(CX, 23.4, 1.5, 1.1, '#6b4a3e', null);
  smile(p, CX, 25.4, 1.6);
  blush(p, 11.4, 23.2);
  blush(p, 28.6, 23.2);

  // jam jar, lid tied with a gingham cloth
  p.roundRect(26.4, 31.2, 6.2, 6.4, 1.6, '#d8405a');
  p.roundRect(26.4, 29.3, 6.2, 2.5, 0.8, '#f8ecd6');
  p.line([{ x: 27.6, y: 33.4 }, { x: 27.6, y: 35.6 }], rgba(WHITE, 0.7), 0.8);

  end(p);
}

export const icons: IconSpec[] = [
  { key: 'portrait:mayor_maple', paint: owl },
  { key: 'portrait:henrietta', paint: hen },
  { key: 'portrait:penny', paint: pig },
  { key: 'portrait:rosie', paint: bunny },
  { key: 'portrait:grandma_fern', paint: hedgehog },
];
