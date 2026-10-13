// Seasonal life on the farm: costumed visitors, animal costumes and
// event particles. Every event gets these; Halloween was the first.
import Phaser from 'phaser';
import { footprint, type EventFeature, type FarmState } from '@farm/shared';
import { RES, texture } from '../art';

// ---------------------------------------------------------------------------
// Animal costumes

/** Where each animal's head is, relative to its tile centre (sprites face bottom-left). */
const HEADS: Record<string, [number, number]> = {
  chicken: [-8, -27],
  cow: [-13, -30],
  sheep: [-12, -25],
  pig: [-12, -23],
  duck: [-7, -29],
  goat: [-12, -34],
  rabbit: [-8, -37],
  beehive: [0, -44],
};

export function costumeFor(id: string, def: string, feature: EventFeature): { key: string; dx: number; dy: number } {
  const hash = [...id].reduce((a, c) => a * 31 + c.charCodeAt(0), 7) >>> 0;
  const [dx, dy] = HEADS[def] ?? [-8, -28];
  const list = feature.costumes;
  return { key: def === 'beehive' ? list[0] : list[hash % list.length], dx, dy };
}

// ---------------------------------------------------------------------------
// Costumed visitors (trick-or-treaters, carolers, lion dancers, ...)

interface WalkerOpts {
  isoX: (x: number, y: number) => number;
  isoY: (x: number, y: number) => number;
  depthFor: (x: number, y: number) => number;
  state: () => FarmState;
}

export class Visitor {
  img: Phaser.GameObjects.Image;
  bubble: Phaser.GameObjects.Container;
  x: number;
  y: number;
  leaving = false;
  waiting = false;
  private frameTimer?: Phaser.Time.TimerEvent;
  private kind: string;

  constructor(
    private scene: Phaser.Scene,
    private o: WalkerOpts,
    /** The event this visitor belongs to, or null for Mama Marigold. */
    readonly feature: EventFeature | null,
    private onGone: () => void,
    look: { kinds: string[]; icon: string } = { kinds: feature?.visitors ?? [], icon: `icon:${feature?.currency}` },
  ) {
    const st = o.state();
    const kinds = look.kinds;
    this.kind = kinds[Math.floor(Math.random() * kinds.length)];
    // Arrive from the lane along the bottom-right edge of the farm.
    this.x = st.size + 1.5;
    this.y = Math.floor(st.size / 2) + 0.5;
    this.img = scene.add.image(0, 0, texture(scene, `npc:${this.kind}`)).setOrigin(0.5, 1).setScale(1 / RES);
    this.bubble = scene.add.container(0, 0).setDepth(999_000).setVisible(false);
    const g = scene.add.graphics();
    g.fillStyle(0xfffaf0, 1).lineStyle(2, 0x4a3426, 1);
    g.fillRoundedRect(-20, -14, 40, 24, 10).strokeRoundedRect(-20, -14, 40, 24, 10);
    g.fillTriangle(-4, 9, 4, 9, 0, 15);
    this.bubble.add(g);
    this.bubble.add(scene.add.image(-7, -2, texture(scene, look.icon)).setDisplaySize(18, 18));
    this.bubble.add(scene.add.text(3, -2, '?', { fontFamily: 'Nunito, sans-serif', fontSize: '16px', fontStyle: '900', color: '#4a3426' }).setOrigin(0, 0.5));
    this.place();
    const target = this.pickDoorstep();
    this.walkTo(target.x, target.y, () => {
      this.waiting = true;
      this.bubble.setVisible(true);
      scene.tweens.add({ targets: this.bubble, scale: 1.12, duration: 500, yoyo: true, repeat: -1 });
      // Wander off if nobody answers the door.
      scene.time.delayedCall(70_000, () => this.leave());
    });
  }

  private pickDoorstep(): { x: number; y: number } {
    const st = this.o.state();
    const blocked = new Set<string>();
    for (const obj of Object.values(st.objects)) {
      const { w, h } = footprint(obj);
      for (let dx = 0; dx < w; dx++) for (let dy = 0; dy < h; dy++) blocked.add(`${obj.x + dx},${obj.y + dy}`);
    }
    // Somewhere free near the middle of the farm, close to the farmhouse side.
    const options: { x: number; y: number; d: number }[] = [];
    for (let x = 0; x < st.size; x++)
      for (let y = 0; y < st.size; y++)
        if (!blocked.has(`${x},${y}`)) options.push({ x, y, d: Math.hypot(x - st.size * 0.4, y - st.size * 0.45) });
    options.sort((a, b) => a.d - b.d);
    const pick = options[Math.floor(Math.random() * Math.min(6, options.length))] ?? { x: 4, y: 4 };
    return { x: pick.x + 0.5, y: pick.y + 0.5 };
  }

  private place(): void {
    const sx = this.o.isoX(this.x, this.y);
    const sy = this.o.isoY(this.x, this.y) + 16;
    this.img.setPosition(sx, sy);
    this.img.setDepth(this.o.depthFor(Math.floor(this.x), Math.floor(this.y)) + 0.4);
    this.bubble.setPosition(sx, sy - 52);
  }

  private walkTo(tx: number, ty: number, done: () => void): void {
    const dist = Math.hypot(tx - this.x, ty - this.y);
    this.img.setFlipX(this.o.isoX(tx, ty) - this.o.isoX(this.x, this.y) > 0);
    let step = false;
    this.frameTimer?.remove();
    this.frameTimer = this.scene.time.addEvent({
      delay: 170,
      loop: true,
      callback: () => {
        step = !step;
        this.img.setTexture(texture(this.scene, `npc:${this.kind}${step ? '_walk' : ''}`));
      },
    });
    this.scene.tweens.add({
      targets: this,
      x: tx,
      y: ty,
      duration: dist * 620,
      onUpdate: () => this.place(),
      onComplete: () => {
        this.frameTimer?.remove();
        this.img.setTexture(texture(this.scene, `npc:${this.kind}`));
        done();
      },
    });
  }

  at(tx: number, ty: number): boolean {
    return this.waiting && Math.abs(Math.floor(this.x) - tx) <= 0 && Math.abs(Math.floor(this.y) - ty) <= 0;
  }

  /** Thank you, bye! */
  happy(): void {
    this.waiting = false;
    this.bubble.setVisible(false);
    this.scene.tweens.add({
      targets: this.img,
      y: this.img.y - 10,
      duration: 140,
      yoyo: true,
      repeat: 2,
      onComplete: () => this.leave(),
    });
  }

  leave(): void {
    if (this.leaving) return;
    this.leaving = true;
    this.waiting = false;
    this.bubble.setVisible(false);
    const st = this.o.state();
    this.walkTo(st.size + 2, this.y + 2, () => this.destroy());
  }

  destroy(): void {
    this.frameTimer?.remove();
    this.scene.tweens.killTweensOf(this);
    this.scene.tweens.killTweensOf(this.bubble);
    this.img.destroy();
    this.bubble.destroy();
    this.onGone();
  }
}

/** Event particles: bats swoop across, lanterns rise, everything else drifts down. */
export function spawnEventParticles(scene: Phaser.Scene, feature: EventFeature, depth: number): void {
  const { width, height } = scene.scale;
  for (const tex of feature.particles) {
    const key = texture(scene, tex);
    let config: Phaser.Types.GameObjects.Particles.ParticleEmitterConfig;
    if (tex === 'fx:bat') {
      config = { x: -60, y: { min: 0, max: height * 0.6 }, lifespan: 9000, speedX: { min: 90, max: 170 }, speedY: { min: -25, max: 15 }, scale: { min: 0.35, max: 0.6 }, frequency: 2600 };
    } else if (/lantern/.test(tex)) {
      config = { x: { min: 0, max: width }, y: height + 40, lifespan: 16000, speedY: { min: -40, max: -22 }, speedX: { min: -6, max: 6 }, scale: { min: 0.35, max: 0.6 }, alpha: { values: [0, 1, 1, 0] }, frequency: 2200 };
    } else if (tex === 'fx:snow' || tex === 'fx:petal' || /leaf/.test(tex)) {
      continue; // the seasonal weather already covers these
    } else {
      config = { x: { min: -width, max: width * 2 }, y: -40, lifespan: 14000, speedY: { min: 25, max: 55 }, speedX: { min: -15, max: 25 }, rotate: { start: 0, end: 360 }, scale: { min: 0.22, max: 0.38 }, alpha: { start: 0.95, end: 0.6 }, frequency: 1100 };
    }
    scene.add.particles(0, 0, key, config).setScrollFactor(0).setDepth(depth);
  }
}
