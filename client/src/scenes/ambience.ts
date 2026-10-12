// Atmosphere: time-of-day lighting, drifting cloud shadows, seasonal particles
// and fireflies at night. Purely cosmetic.
import Phaser from 'phaser';

export type DayPhase = 'dawn' | 'day' | 'dusk' | 'night';

export function dayPhase(date = new Date()): DayPhase {
  const forced = new URLSearchParams(location.search).get('hour');
  const h = forced !== null ? Number(forced) : date.getHours() + date.getMinutes() / 60;
  if (h >= 5.5 && h < 7.5) return 'dawn';
  if (h >= 7.5 && h < 17.5) return 'day';
  if (h >= 17.5 && h < 20) return 'dusk';
  return 'night';
}

const TINT: Record<DayPhase, { color: number; alpha: number }> = {
  dawn: { color: 0xffc89a, alpha: 0.1 },
  day: { color: 0xffffff, alpha: 0 },
  dusk: { color: 0xff8a5c, alpha: 0.14 },
  night: { color: 0x1b2456, alpha: 0.38 },
};

type Season = 'spring' | 'summer' | 'autumn' | 'winter';

function season(date = new Date()): Season {
  const m = date.getMonth();
  if (m >= 2 && m <= 4) return 'spring';
  if (m >= 5 && m <= 7) return 'summer';
  if (m >= 8 && m <= 10) return 'autumn';
  return 'winter';
}

export class Ambience {
  private overlay: Phaser.GameObjects.Rectangle;
  private clouds: Phaser.GameObjects.Image[] = [];
  private fireflies?: Phaser.GameObjects.Particles.ParticleEmitter;
  phase: DayPhase = dayPhase();

  constructor(
    private scene: Phaser.Scene,
    private center: () => { x: number; y: number; r: number },
    depth: number,
  ) {
    this.overlay = scene.add
      .rectangle(0, 0, 10, 10, 0xffffff, 0)
      .setScrollFactor(0)
      .setOrigin(0.5)
      .setDepth(depth + 5);
    this.resize();
    scene.scale.on('resize', () => this.resize());
    this.applyPhase();
    scene.time.addEvent({ delay: 60_000, loop: true, callback: () => this.applyPhase() });

    this.spawnClouds(depth);
    this.spawnSeasonal(depth + 2);
    this.fireflies = scene.add.particles(0, 0, 'fx:firefly', {
      x: { min: -400, max: 400 },
      y: { min: -250, max: 250 },
      lifespan: 4000,
      speedX: { min: -12, max: 12 },
      speedY: { min: -12, max: 6 },
      scale: { start: 0.12, end: 0.05 },
      alpha: { values: [0, 1, 0.6, 1, 0] },
      frequency: 260,
      blendMode: Phaser.BlendModes.ADD,
      emitting: false,
    });
    this.fireflies.setDepth(depth + 6);
    this.updateFireflies();
  }

  get isNight(): boolean {
    return this.phase === 'night';
  }

  private resize(): void {
    const { width, height } = this.scene.scale;
    // Big enough to cover the view at minimum zoom (zoom scales around the centre).
    this.overlay.setPosition(width / 2, height / 2).setSize(width * 4, height * 4);
  }

  private applyPhase(): void {
    this.phase = dayPhase();
    const t = TINT[this.phase];
    this.overlay.setFillStyle(t.color, t.alpha);
    this.updateFireflies();
  }

  private updateFireflies(): void {
    if (!this.fireflies) return;
    const c = this.center();
    this.fireflies.setPosition(c.x, c.y);
    if (this.phase === 'night' || this.phase === 'dusk') this.fireflies.start();
    else this.fireflies.stop();
  }

  private spawnClouds(depth: number): void {
    for (let i = 0; i < 4; i++) {
      const img = this.scene.add.image(0, 0, 'fx:cloud').setDepth(depth).setAlpha(0.09);
      img.setScale(9 + Math.random() * 6, 6 + Math.random() * 4);
      this.clouds.push(img);
      this.driftCloud(img, true);
    }
  }

  private driftCloud(img: Phaser.GameObjects.Image, first: boolean): void {
    const c = this.center();
    const startX = first ? c.x - c.r + Math.random() * c.r * 2 : c.x - c.r * 1.4;
    const y = c.y - c.r * 0.5 + Math.random() * c.r;
    img.setPosition(startX, y);
    const endX = c.x + c.r * 1.4;
    const duration = ((endX - startX) / 12) * 1000;
    this.scene.tweens.add({ targets: img, x: endX, y: y + 60, duration, onComplete: () => this.driftCloud(img, false) });
  }

  private spawnSeasonal(depth: number): void {
    const s = season();
    const { width } = this.scene.scale;
    const textures: Record<Season, string[]> = {
      spring: ['fx:petal'],
      summer: ['fx:fluff'],
      autumn: ['fx:leaf_red', 'fx:leaf_orange', 'fx:leaf_yellow'],
      winter: ['fx:snow'],
    };
    const list = textures[s];
    for (const tex of list) {
      const emitter = this.scene.add.particles(0, 0, tex, {
        x: { min: -width, max: width * 2 },
        y: -40,
        lifespan: 14_000,
        speedY: s === 'winter' ? { min: 25, max: 50 } : { min: 30, max: 60 },
        speedX: s === 'winter' ? { min: -10, max: 10 } : { min: 10, max: 50 },
        rotate: s === 'winter' || s === 'summer' ? 0 : { start: 0, end: 540 },
        scale: s === 'winter' ? { min: 0.08, max: 0.16 } : { min: 0.18, max: 0.3 },
        alpha: { start: 0.95, end: 0.6 },
        frequency: (s === 'winter' ? 180 : 650) * list.length,
      });
      emitter.setScrollFactor(0).setDepth(depth);
    }
  }
}
