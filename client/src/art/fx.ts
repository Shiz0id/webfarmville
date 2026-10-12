// Small particle textures for ambience and feedback effects.
import { type IconSpec, type SpriteSpec, shade } from './kit';

const fx = (key: string, paint: IconSpec['paint']): IconSpec => ({ key: `fx:${key}`, paint });

export const sprites: SpriteSpec[] = [];

export const icons: IconSpec[] = [
  fx('sparkle', (p) => {
    p.glow(20, 20, 16, '#fff6b0', 0.7);
    p.star(20, 20, 11, '#fff3a3', null);
    p.star(20, 20, 6, '#ffffff', null);
  }),
  fx('heart', (p) => {
    p.heart(20, 21, 11, '#ff8fb1', '#c2456e');
    p.circle(15, 16, 2.5, '#ffd3e2', null);
  }),
  fx('leaf_red', (p) => leaf(p, '#e2572e')),
  fx('leaf_orange', (p) => leaf(p, '#f29b2e')),
  fx('leaf_yellow', (p) => leaf(p, '#f4c843')),
  fx('petal', (p) => {
    p.ellipse(20, 20, 9, 6, '#ffc4d8', '#e58aab', 0.5);
    p.ellipse(17, 18, 3, 2, '#ffe3ec', null, 0.5);
  }),
  fx('snow', (p) => {
    p.glow(20, 20, 14, '#ffffff', 0.6);
    p.circle(20, 20, 6, '#ffffff', '#cfe6f5');
  }),
  fx('fluff', (p) => {
    p.glow(20, 20, 12, '#ffffff', 0.5);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      p.line([{ x: 20, y: 20 }, { x: 20 + Math.cos(a) * 9, y: 20 + Math.sin(a) * 9 }], '#ffffff', 1.2);
    }
    p.circle(20, 20, 2, '#e9e2c6', null);
  }),
  fx('firefly', (p) => {
    p.glow(20, 20, 18, '#e8ff7a', 0.85);
    p.circle(20, 20, 3.5, '#fbffd0', null);
  }),
  fx('dust', (p) => {
    p.circle(20, 20, 12, 'rgba(214, 190, 150, 0.85)', null);
    p.circle(16, 16, 5, 'rgba(240, 225, 195, 0.9)', null);
  }),
  fx('smoke', (p) => {
    p.circle(20, 20, 13, 'rgba(240, 240, 240, 0.8)', null);
    p.circle(15, 16, 6, 'rgba(255, 255, 255, 0.9)', null);
  }),
  fx('cloud', (p) => {
    p.ellipse(20, 20, 19, 12, 'rgba(30, 40, 70, 0.5)', null);
  }),
];

icons.push({
  key: 'icon:mystery_gift',
  paint: (p) => {
    p.glow(20, 22, 19, '#fff3a3', 0.55);
    p.shadow(20, 35, 12, 3);
    p.roundRect(8, 17, 24, 17, 3, '#c49bff');
    p.roundRect(6, 12, 28, 7, 3, '#d8bcff');
    p.rect(17.5, 12, 5, 22, '#ff8fb1');
    p.ellipse(15, 10, 5, 3.5, '#ff8fb1', undefined, -0.5);
    p.ellipse(25, 10, 5, 3.5, '#ff8fb1', undefined, 0.5);
    p.circle(20, 11, 2.5, '#ffb3cb');
    p.text('?', 13, 26, 9, '#ffffff', '900');
    p.star(31, 8, 3.5, '#fff6b0', null);
    p.star(7, 24, 2.5, '#fff6b0', null);
  },
});

function leaf(p: Parameters<IconSpec['paint']>[0], c: string): void {
  p.ctx.save();
  p.ctx.translate(20, 20);
  p.ctx.rotate(-0.6);
  p.ctx.translate(-20, -20);
  p.ellipse(20, 20, 10, 6, c, shade(c, -0.35));
  p.line([{ x: 11, y: 20 }, { x: 29, y: 20 }], shade(c, -0.35), 1);
  p.ctx.restore();
}
