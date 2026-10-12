// A puppy and a kitten who wander around your farm. Purely for joy.
import Phaser from 'phaser';
import { footprint, type FarmState } from '@farm/shared';
import { RES, texture } from '../art';

type Kind = 'dog' | 'cat';

interface PetOpts {
  isoX: (x: number, y: number) => number;
  isoY: (x: number, y: number) => number;
  depthFor: (x: number, y: number) => number;
  state: () => FarmState;
  hidden: () => boolean;
}

export class Pet {
  img: Phaser.GameObjects.Image;
  x: number;
  y: number;
  private mode: 'idle' | 'walk' | 'rest' = 'idle';
  private frameTimer?: Phaser.Time.TimerEvent;
  private moveTween?: Phaser.Tweens.Tween;

  constructor(
    private scene: Phaser.Scene,
    readonly kind: Kind,
    private o: PetOpts,
  ) {
    const st = o.state();
    this.x = Math.min(st.size - 1, kind === 'dog' ? 5 : 3) + 0.5;
    this.y = Math.min(st.size - 1, kind === 'dog' ? 7 : 5) + 0.5;
    this.img = scene.add.image(0, 0, texture(scene, `pet:${kind}_stand`)).setOrigin(0.5, 1).setScale(1 / RES);
    this.place();
    scene.time.addEvent({ delay: 2500 + Math.random() * 2000, loop: true, callback: () => this.think() });
  }

  private place(): void {
    // Sprite canvases are one tile wide; the footprint centre sits 16px above the bottom.
    this.img.setPosition(this.o.isoX(this.x, this.y), this.o.isoY(this.x, this.y) + 16);
    this.img.setDepth(this.o.depthFor(Math.floor(this.x), Math.floor(this.y)) + 0.3);
    this.img.setVisible(!this.o.hidden());
  }

  /** Free, owned tiles a pet can trot to (flat things like paths and plots are fine). */
  private freeTiles(): { x: number; y: number }[] {
    const st = this.o.state();
    const blocked = new Set<string>();
    for (const obj of Object.values(st.objects)) {
      if (obj.kind === 'plot') continue;
      if (obj.kind === 'deco' && /^path_|picnic|rangoli/.test(obj.def)) continue;
      const { w, h } = footprint(obj);
      for (let dx = 0; dx < w; dx++) for (let dy = 0; dy < h; dy++) blocked.add(`${obj.x + dx},${obj.y + dy}`);
    }
    const out: { x: number; y: number }[] = [];
    const cx = Math.floor(this.x);
    const cy = Math.floor(this.y);
    for (let x = cx - 4; x <= cx + 4; x++)
      for (let y = cy - 4; y <= cy + 4; y++)
        if (x >= 0 && y >= 0 && x < st.size && y < st.size && !blocked.has(`${x},${y}`)) out.push({ x, y });
    return out;
  }

  private think(): void {
    if (this.mode === 'walk') return;
    const r = Math.random();
    const restChance = this.kind === 'cat' ? 0.55 : 0.25;
    if (r < restChance) return this.rest();
    const tiles = this.freeTiles();
    if (!tiles.length) return this.rest();
    const t = tiles[Math.floor(Math.random() * tiles.length)];
    this.walkTo(t.x + 0.5, t.y + 0.5);
  }

  private rest(): void {
    this.mode = 'rest';
    this.frameTimer?.remove();
    this.img.setTexture(texture(this.scene, `pet:${this.kind === 'dog' ? 'dog_sit' : 'cat_sleep'}`));
  }

  private walkTo(tx: number, ty: number): void {
    this.mode = 'walk';
    const dist = Math.hypot(tx - this.x, ty - this.y);
    if (dist < 0.1) return void (this.mode = 'idle');
    // Sprites face bottom-left; flip when heading right on screen.
    const screenDx = this.o.isoX(tx, ty) - this.o.isoX(this.x, this.y);
    this.img.setFlipX(screenDx > 0);
    let step = false;
    this.frameTimer?.remove();
    this.frameTimer = this.scene.time.addEvent({
      delay: 160,
      loop: true,
      callback: () => {
        step = !step;
        this.img.setTexture(texture(this.scene, `pet:${this.kind}_${step ? 'walk' : 'stand'}`));
      },
    });
    this.moveTween?.stop();
    this.moveTween = this.scene.tweens.add({
      targets: this,
      x: tx,
      y: ty,
      duration: dist * (this.kind === 'dog' ? 520 : 700),
      onUpdate: () => this.place(),
      onComplete: () => {
        this.frameTimer?.remove();
        this.img.setTexture(texture(this.scene, `pet:${this.kind}_stand`));
        this.mode = 'idle';
      },
    });
  }

  /** Was this tile tapped? */
  at(tx: number, ty: number): boolean {
    return this.img.visible && Math.floor(this.x) === tx && Math.floor(this.y) === ty;
  }

  /** A happy little hop when petted. */
  pet(): void {
    this.moveTween?.stop();
    this.frameTimer?.remove();
    this.mode = 'idle';
    this.img.setTexture(texture(this.scene, `pet:${this.kind === 'dog' ? 'dog_sit' : 'cat_stand'}`));
    const y = this.img.y;
    this.scene.tweens.add({ targets: this.img, y: y - 8, duration: 120, yoyo: true, repeat: 1, ease: 'Quad.easeOut' });
  }

  update(): void {
    if (this.mode !== 'walk') this.place();
  }
}
