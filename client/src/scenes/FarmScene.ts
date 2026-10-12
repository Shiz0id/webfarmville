import Phaser from 'phaser';
import {
  ANIMALS,
  BUILDINGS,
  CROPS,
  DECORATIONS,
  MAX_SIZE,
  TREES,
  buildingStatus,
  canPlace,
  cropStatus,
  findRecipe,
  footprint,
  helpKind,
  objectAt,
  placeable,
  producerStatus,
  type FarmObject,
  type FarmState,
  type GameEvent,
} from '@farm/shared';
import { RES, artMeta, hasArt, registerTextures, texture } from '../art';
import { rng } from '../art/kit';
import { Ambience } from './ambience';
import { Pet } from './pets';
import { Visitor, costumeFor, spawnEventParticles } from './eventLife';
import { featuredEvent } from '../events';
import { sfx } from '../sfx';
import { bus } from '../bus';
import type { Store } from '../store';
import { setTool, tools } from '../tools';
import { fmtDuration, nameOf } from '../util';

const HALF_W = 32;
const HALF_H = 16;
const MARGIN = 7;
const DEPTH_GROUND = -100_000;
const DEPTH_FLAT = -50_000;
const DEPTH_UI = 1_000_000;
const MIN_ZOOM = 0.35;
const MAX_ZOOM = 2.2;

interface Tile {
  x: number;
  y: number;
}

interface Bubble {
  key: string;
  container: Phaser.GameObjects.Container;
}

interface ObjSprite {
  sig: string;
  kind: FarmObject['kind'];
  ready: boolean;
  smoke?: { x: number; y: number };
  glow?: Phaser.GameObjects.Image;
  costume?: Phaser.GameObjects.Image;
  main: Phaser.GameObjects.Image;
  overlay?: Phaser.GameObjects.Image;
  bubble?: Bubble;
  bar?: Phaser.GameObjects.Graphics;
}

interface RenderSpec {
  tex: string;
  flat: boolean;
  overlay?: string;
  bubble?: { icon?: string; emoji?: string };
  progress?: number;
  ready?: boolean;
  smoke?: boolean;
  glow?: boolean;
}

/** Decorations that bob gently in the air. */
const FLOATERS = /ghost|balloon|sky_lantern|kite|lantern_tree|bubble|pinata|paper_cranes|float/;
/** Decorations that sway in the breeze. */
const SWAYERS =
  /(^|_)(tree|willow|blossom|bamboo|sunflower|wildflowers|swing|bunting|streamers|windchime|scarecrow|laundry|hanging|wisteria|lilac|magnolia|palm|osmanthus|maple|pine|oak)($|_)/;
const NO_SWAY = /stump|house|tower|planter|statue|topiary|lantern|arch/;

/** Decorations that light up at night. */
const GLOWING = /lamp|lantern|torch|candle|diya|campfire|fire_pit|menorah|jack_o|firefly|string_lights|sparkler|decorated_pine|marigold/;

const isoX = (x: number, y: number) => (x - y) * HALF_W;
const isoY = (x: number, y: number) => (x + y) * HALF_H;

export class FarmScene extends Phaser.Scene {
  private store!: Store;
  private sprites = new Map<string, ObjSprite>();
  private ground: Phaser.GameObjects.GameObject[] = [];
  private groundKey = '';
  private hover!: Phaser.GameObjects.Graphics;
  private border!: Phaser.GameObjects.Graphics;
  private ghost?: Phaser.GameObjects.Image;
  private ghostKey = '';
  private dirty = true;
  private hoverTile: Tile | null = null;
  private pointerScreen = { x: 0, y: 0 };
  private keys?: Record<string, Phaser.Input.Keyboard.Key>;
  private ambience!: Ambience;
  /** Ids already on screen once, so only genuinely new things pop in. */
  private known = new Set<string>();
  private settled = false;
  private emitters = new Map<string, Phaser.GameObjects.Particles.ParticleEmitter>();
  private pets: Pet[] = [];
  private treater: Visitor | null = null;
  private mama: Visitor | null = null;

  private drag: {
    mode: 'none' | 'pending' | 'pan' | 'paint' | 'harvest' | 'pinch';
    sx: number;
    sy: number;
    camX: number;
    camY: number;
    lastTile: string;
    errored: boolean;
    pinchDist: number;
    pinchZoom: number;
  } = { mode: 'none', sx: 0, sy: 0, camX: 0, camY: 0, lastTile: '', errored: false, pinchDist: 0, pinchZoom: 1 };

  constructor() {
    super('farm');
  }

  init(data: { store: Store }): void {
    this.store = data.store;
  }

  create(): void {
    registerTextures(this);
    this.cameras.main.setBackgroundColor('#6f9e4c');
    this.hover = this.add.graphics().setDepth(DEPTH_FLAT + 10_000);
    this.border = this.add.graphics().setDepth(DEPTH_FLAT - 1);
    this.input.mouse?.disableContextMenu();
    this.input.addPointer(1);
    this.setupInput();
    this.setupKeyboard();

    const offChange = this.store.onChange(() => (this.dirty = true));
    const offEvents = this.store.onEvents((e) => this.showEvents(e));
    const offTool = bus.on('tool', () => {
      this.dirty = true;
      this.updateGhost();
    });
    this.events.once('shutdown', () => {
      offChange();
      offEvents();
      offTool();
    });
    this.time.addEvent({ delay: 1000, loop: true, callback: () => (this.dirty = true) });
    this.scale.on('resize', () => this.clampCamera());

    this.sync();
    this.centerCamera();
    this.spawnButterflies();
    this.ambience = new Ambience(
      this,
      () => {
        const n = this.store.viewed.size;
        return { x: isoX(n / 2, n / 2), y: isoY(n / 2, n / 2), r: (n + 8) * HALF_W };
      },
      DEPTH_UI - 200,
      featuredEvent(this.store.now(), this.store.allEvents),
    );
    this.dirty = true;
    this.time.addEvent({ delay: 450, loop: true, callback: () => this.twinkle() });
    this.time.addEvent({ delay: 700, loop: true, callback: () => this.puffSmoke() });
    this.time.addEvent({ delay: 1800, loop: true, callback: () => this.animalLife() });
    const petOpts = {
      isoX,
      isoY,
      depthFor: (x: number, y: number) => this.depthFor(x, y, 1, 1),
      state: () => this.store.state,
      hidden: () => this.store.isVisiting,
    };
    this.pets = [new Pet(this, 'dog', petOpts), new Pet(this, 'cat', petOpts)];

    // Mama Marigold drops by once a day with a home-cooked meal.
    this.time.addEvent({ delay: 15_000, loop: true, callback: () => this.maybeMama() });
    const feature = this.feature;
    if (feature) {
      spawnEventParticles(this, feature, DEPTH_UI - 190);
      this.time.addEvent({ delay: 8000, loop: true, callback: () => this.maybeTrickOrTreat() });
    }
    bus.emit('sceneReady');
  }

  /** The seasonal event currently setting the mood, if any. */
  private get feature() {
    return featuredEvent(this.store.now(), this.store.allEvents);
  }

  private maybeMama(): void {
    if (this.mama || this.store.isVisiting) return;
    const today = new Date(this.store.now()).toISOString().slice(0, 10);
    if (this.store.state.mama?.day === today) return;
    this.mama = new Visitor(
      this,
      { isoX, isoY, depthFor: (x, y) => this.depthFor(x, y, 1, 1), state: () => this.store.state },
      null,
      () => (this.mama = null),
      { kinds: ['mama'], icon: 'icon:tomato_soup' },
    );
  }

  /** Send a costumed visitor over if there are visits left today. */
  private maybeTrickOrTreat(): void {
    const feature = this.feature;
    if (this.treater || this.store.isVisiting || !feature) return;
    const t = this.store.state.treats;
    const today = new Date(this.store.now()).toISOString().slice(0, 10);
    if (t && t.day === today && t.count >= 6) return;
    if (Math.random() < 0.55) return;
    this.treater = new Visitor(
      this,
      {
        isoX,
        isoY,
        depthFor: (x, y) => this.depthFor(x, y, 1, 1),
        state: () => this.store.state,
      },
      feature,
      () => (this.treater = null),
    );
  }

  // -------------------------------------------------------------------------
  // Little bits of life

  /** A little particle burst (hearts, sparkles) at a world position. For features. */
  burst(tex: string, n: number, x: number, y: number): void {
    this.emitter(tex, 'burst').explode(n, x, y);
  }

  private emitter(tex: string, kind: 'burst' | 'twinkle' | 'smoke' | 'dust'): Phaser.GameObjects.Particles.ParticleEmitter {
    const key = `${tex}|${kind}`;
    let e = this.emitters.get(key);
    if (e) return e;
    const configs: Record<typeof kind, Phaser.Types.GameObjects.Particles.ParticleEmitterConfig> = {
      burst: {
        speed: { min: 50, max: 130 },
        angle: { min: 200, max: 340 },
        gravityY: 260,
        lifespan: 750,
        scale: { start: 0.32, end: 0 },
        rotate: { min: 0, max: 360 },
        emitting: false,
      },
      twinkle: {
        speed: { min: 2, max: 10 },
        lifespan: 900,
        scale: { values: [0, 0.28, 0] },
        emitting: false,
      },
      smoke: {
        speedY: { min: -26, max: -16 },
        speedX: { min: 4, max: 14 },
        lifespan: 2600,
        scale: { start: 0.14, end: 0.5 },
        alpha: { start: 0.75, end: 0 },
        emitting: false,
      },
      dust: {
        speed: { min: 20, max: 60 },
        angle: { min: 160, max: 380 },
        lifespan: 500,
        scale: { start: 0.35, end: 0.05 },
        alpha: { start: 0.9, end: 0 },
        emitting: false,
      },
    };
    e = this.add.particles(0, 0, texture(this, tex), configs[kind]);
    e.setDepth(kind === 'dust' ? DEPTH_FLAT + 20_000 : DEPTH_UI - 5);
    this.emitters.set(key, e);
    return e;
  }

  private twinkle(): void {
    const ready = [...this.sprites.values()].filter((s) => s.ready && s.main.visible);
    if (!ready.length) return;
    const s = ready[Math.floor(Math.random() * ready.length)];
    const m = s.overlay ?? s.main;
    const x = m.x + Math.random() * m.displayWidth;
    const y = m.y - m.displayHeight * (0.3 + Math.random() * 0.6);
    this.emitter('fx:sparkle', 'twinkle').explode(1, x, y);
  }

  private puffSmoke(): void {
    for (const s of this.sprites.values()) {
      if (s.smoke && Math.random() < 0.6) this.emitter('fx:smoke', 'smoke').explode(1, s.smoke.x, s.smoke.y);
    }
  }

  private animalLife(): void {
    const animals = [...this.sprites.values()].filter((s) => s.kind === 'animal' && s.main.alpha === 1);
    for (const a of animals) {
      if (Math.random() > 0.35) continue;
      const m = a.main;
      if (Math.random() < 0.3) {
        m.setFlipX(!m.flipX);
        if (a.costume) {
          // Mirror the hat to the other side of the head.
          const cx = m.x + m.displayWidth / 2;
          a.costume.x = cx - (a.costume.x - cx);
          a.costume.setFlipX(m.flipX);
        }
      }
      const targets = a.costume ? [m, a.costume] : [m];
      for (const t of targets)
        this.tweens.add({ targets: t, y: t.y - 5, duration: 130, yoyo: true, repeat: 0, ease: 'Quad.easeOut' });
    }
  }

  update(time: number, delta: number): void {
    this.stepAnimations(time);
    if (this.dirty) {
      this.dirty = false;
      this.sync();
      this.updateGhost();
      this.refreshHover();
    }
    this.keyboardPan(delta);
    for (const p of this.pets) p.update();
  }

  // -------------------------------------------------------------------------
  // Camera

  /** Centre the camera on the current farm. */
  centerCamera(): void {
    const size = this.store.viewed.size;
    const cam = this.cameras.main;
    const fit = Math.min(this.scale.width / ((size + 4) * HALF_W * 2), this.scale.height / ((size + 6) * HALF_H * 2));
    cam.setZoom(Phaser.Math.Clamp(Math.max(fit, 0.6), MIN_ZOOM, 1.2));
    cam.centerOn(isoX(size / 2, size / 2), isoY(size / 2, size / 2));
  }

  private clampCamera(): void {
    const cam = this.cameras.main;
    const size = this.store.viewed.size;
    const c = { x: isoX(size / 2, size / 2), y: isoY(size / 2, size / 2) };
    const rx = (MAX_SIZE / 2 + MARGIN) * HALF_W * 2;
    const ry = (MAX_SIZE / 2 + MARGIN) * HALF_H * 2;
    const mid = cam.midPoint;
    const nx = Phaser.Math.Clamp(mid.x, c.x - rx, c.x + rx);
    const ny = Phaser.Math.Clamp(mid.y, c.y - ry, c.y + ry);
    if (nx !== mid.x || ny !== mid.y) cam.centerOn(nx, ny);
  }

  private zoomAt(factor: number, sx: number, sy: number): void {
    const cam = this.cameras.main;
    const before = cam.getWorldPoint(sx, sy);
    cam.setZoom(Phaser.Math.Clamp(cam.zoom * factor, MIN_ZOOM, MAX_ZOOM));
    cam.preRender();
    const after = cam.getWorldPoint(sx, sy);
    cam.scrollX += before.x - after.x;
    cam.scrollY += before.y - after.y;
  }

  /** Screen position of a tile's centre (used by the e2e smoke test). */
  tileToScreen(x: number, y: number): { x: number; y: number } {
    const cam = this.cameras.main;
    return {
      x: (isoX(x + 0.5, y + 0.5) - cam.worldView.x) * cam.zoom,
      y: (isoY(x + 0.5, y + 0.5) - cam.worldView.y) * cam.zoom,
    };
  }

  zoomBy(factor: number): void {
    this.zoomAt(factor, this.scale.width / 2, this.scale.height / 2);
  }

  // -------------------------------------------------------------------------
  // Rendering

  private rebuildGround(state: FarmState): void {
    for (const g of this.ground) g.destroy();
    this.ground = [];
    const lo = -MARGIN;
    const hi = MAX_SIZE + MARGIN;
    // Grass turns a little golden in autumn and frosty in winter.
    const month = new Date(this.store.now()).getMonth();
    const groundTint = month >= 8 && month <= 10 ? 0xfff0c8 : month === 11 || month <= 1 ? 0xe6f2ff : 0xffffff;
    for (let x = lo; x < hi; x++) {
      for (let y = lo; y < hi; y++) {
        const owned = x >= 0 && y >= 0 && x < state.size && y < state.size;
        const h = Math.abs((x * 73856093) ^ (y * 19349663)) % 997;
        const key = owned ? `ground:grass:${h % 4}` : `ground:wild:${h % 3}`;
        const img = this.add
          .image(isoX(x, y) - HALF_W, isoY(x, y) + HALF_H * 2, texture(this, key))
          .setOrigin(0, 1)
          .setScale(1 / RES)
          .setDepth(DEPTH_GROUND);
        if (groundTint !== 0xffffff) img.setTint(groundTint);
        this.ground.push(img);
        // Scenery outside the land you own.
        if (owned) continue;
        const inside = x >= 0 && y >= 0 && x < MAX_SIZE && y < MAX_SIZE;
        const r = rng(x * 1000 + y)();
        let deco: string | null = null;
        if (!inside && r < 0.42) deco = `wild:tree:${h % 3}`;
        else if (!inside && r < 0.5) deco = 'wild:bush';
        else if (inside && r < 0.035) deco = 'wild:rock';
        else if (inside && r < 0.08) deco = 'wild:bush';
        else if (inside && r < 0.1) deco = `wild:tree:${h % 3}`;
        if (deco) {
          const s = this.add.image(0, 0, texture(this, deco));
          this.placeImage(s, x, y, 1, 1);
          s.setDepth(this.depthFor(x, y, 1, 1));
          this.ground.push(s);
        }
      }
    }
    this.border.clear();
    this.border.lineStyle(2, 0xfff6d5, 0.55);
    const n = state.size;
    this.border.strokePoints(
      [
        new Phaser.Math.Vector2(isoX(0, 0), isoY(0, 0)),
        new Phaser.Math.Vector2(isoX(n, 0), isoY(n, 0)),
        new Phaser.Math.Vector2(isoX(n, n), isoY(n, n)),
        new Phaser.Math.Vector2(isoX(0, n), isoY(0, n)),
      ],
      true,
    );
  }

  private placeImage(img: Phaser.GameObjects.Image, x: number, y: number, w: number, h: number): void {
    img.setOrigin(0, 1);
    img.setScale(1 / RES);
    img.setPosition(isoX(x, y + h), isoY(x + w, y + h));
  }

  /** World position of a (fractional) tile coordinate, at ground level. For features. */
  tileToWorld(x: number, y: number): { x: number; y: number } {
    return { x: isoX(x, y), y: isoY(x, y) };
  }

  /** Draw depth for something standing on tile (x, y). For features. */
  depthAt(x: number, y: number): number {
    return this.depthFor(Math.floor(x), Math.floor(y), 1, 1);
  }

  private depthFor(x: number, y: number, w: number, h: number): number {
    return (x + w + y + h) * 100 + (x + w) * 0.5;
  }

  private renderSpec(obj: FarmObject, now: number, visiting: boolean): RenderSpec {
    switch (obj.kind) {
      case 'plot': {
        const st = cropStatus(obj, now);
        const spec: RenderSpec = { tex: obj.fertilized ? 'ground:plot_fert' : 'ground:plot', flat: true };
        if (st.stage === 'sprout') spec.overlay = `crop:${obj.crop}:0`;
        else if (st.stage === 'growing') spec.overlay = `crop:${obj.crop}:1`;
        else if (st.stage === 'ready') {
          spec.overlay = `crop:${obj.crop}:2`;
          spec.ready = !visiting;
        }
        else if (st.stage === 'withered') spec.overlay = 'crop:withered';
        if (visiting && helpKind(obj, now)) spec.bubble = { emoji: st.stage === 'withered' ? '💧' : '✨' };
        return spec;
      }
      case 'tree':
      case 'animal': {
        const ready = producerStatus(obj, now).ready;
        const def = obj.kind === 'tree' ? TREES[obj.def] : ANIMALS[obj.def];
        const spec: RenderSpec = {
          tex: obj.kind === 'tree' ? `tree:${obj.def}${ready ? ':ready' : ''}` : `animal:${obj.def}`,
          flat: false,
        };
        if (visiting) {
          if (helpKind(obj, now)) spec.bubble = { emoji: obj.kind === 'tree' ? '💧' : '🌾' };
        } else if (ready && def) {
          spec.bubble = { icon: `icon:${def.product}` };
          spec.ready = true;
        }
        return spec;
      }
      case 'building': {
        const spec: RenderSpec = { tex: `building:${obj.def}`, flat: false };
        if (BUILDINGS[obj.def]?.starter) spec.smoke = true;
        if (visiting) return spec;
        const st = buildingStatus(obj, now);
        if (st.done > 0) {
          const job = obj.queue.find((j) => j.end <= now)!;
          const r = findRecipe(obj.def, job.recipe);
          spec.bubble = { icon: `icon:${r?.output ?? job.recipe}` };
          spec.ready = true;
        } else if (st.active) {
          spec.progress = st.active.progress;
          spec.smoke = true;
        }
        return spec;
      }
      case 'deco': {
        const def = DECORATIONS[obj.def];
        return { tex: `deco:${obj.def}`, flat: !!def?.flat, glow: def?.category === 'lights' || GLOWING.test(obj.def) };
      }
    }
  }

  private sync(): void {
    const state = this.store.viewed;
    const visiting = this.store.isVisiting;
    // Help bubbles only matter while you still have helps left.
    const helping = visiting && (this.store.visit?.helpsLeft ?? 0) > 0;
    const groundKey = `${this.store.visit?.owner.username ?? '@me'}:${state.size}`;
    if (groundKey !== this.groundKey) {
      this.groundKey = groundKey;
      this.rebuildGround(state);
      for (const id of [...this.sprites.keys()]) this.removeSprite(id);
      this.known.clear();
      this.settled = false;
    }
    const now = this.store.now();
    const seen = new Set<string>();
    for (const obj of Object.values(state.objects)) {
      seen.add(obj.id);
      const spec = this.renderSpec(obj, now, visiting);
      if (visiting && !helping) delete spec.bubble;
      const night = !!spec.glow && !!this.ambience?.isNight;
      const { w, h } = footprint(obj);
      const flip = obj.kind === 'deco' && !!obj.flip;
      const moving = tools.moving === obj.id;
      const progressBucket = spec.progress === undefined ? '' : Math.floor(spec.progress * 20);
      const sig = [
        spec.tex,
        spec.overlay,
        spec.bubble?.icon,
        spec.bubble?.emoji,
        progressBucket,
        obj.x,
        obj.y,
        flip,
        moving,
        night,
      ].join('|');
      const existing = this.sprites.get(obj.id);
      if (existing?.sig === sig) continue;
      const fresh = !this.settled ? null : !this.known.has(obj.id) ? 'new' : existing && existing.sig.split('|', 2).join() !== sig.split('|', 2).join() ? 'changed' : null;
      if (existing) this.removeSprite(obj.id);
      this.createSprite(obj, spec, sig, w, h, flip, moving, night, fresh);
      this.known.add(obj.id);
    }
    for (const id of [...this.sprites.keys()]) if (!seen.has(id)) this.removeSprite(id);
    this.settled = true;
  }

  private createSprite(
    obj: FarmObject,
    spec: RenderSpec,
    sig: string,
    w: number,
    h: number,
    flip: boolean,
    moving: boolean,
    night: boolean,
    fresh: 'new' | 'changed' | null,
  ) {
    const main = this.add.image(0, 0, texture(this, spec.tex, w, h));
    this.placeImage(main, obj.x, obj.y, w, h);
    main.setFlipX(flip);
    main.setDepth(spec.flat ? DEPTH_FLAT + obj.x + obj.y : this.depthFor(obj.x, obj.y, w, h));
    if (moving) main.setAlpha(0.35);
    const entry: ObjSprite = { sig, main, kind: obj.kind, ready: !!spec.ready };

    if (spec.overlay) {
      const ov = this.add.image(0, 0, texture(this, spec.overlay, 1, 1));
      this.placeImage(ov, obj.x, obj.y, 1, 1);
      ov.setDepth(this.depthFor(obj.x, obj.y, 1, 1));
      if (moving) ov.setAlpha(0.35);
      entry.overlay = ov;
    }

    const feature = this.feature;
    if (obj.kind === 'animal' && !moving && feature && !this.store.isVisiting) {
      const c = costumeFor(obj.id, obj.def, feature);
      entry.costume = this.add
        .image(main.x + main.displayWidth / 2 + c.dx, main.y - 16 + c.dy, texture(this, c.key))
        .setScale(1 / RES)
        .setDepth(main.depth + 0.05);
    }
    if (!moving) this.animate(entry, spec.tex, obj);

    if (obj.kind === 'animal' && !moving) {
      // Gentle breathing.
      this.tweens.add({
        targets: main,
        scaleY: main.scaleY * 0.965,
        duration: 700 + ((obj.x * 37 + obj.y * 11) % 500),
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }

    const cxw = isoX(obj.x + w / 2, obj.y + h / 2);
    const cyw = isoY(obj.x + w / 2, obj.y + h / 2);
    if (fresh === 'new' && !moving) {
      // Pop into existence with a puff of dust.
      for (const img of [main, entry.overlay]) {
        if (!img) continue;
        const sx = img.scaleX;
        const sy = img.scaleY;
        img.setScale(sx * 0.6, sy * 0.3);
        this.tweens.add({ targets: img, scaleX: sx, scaleY: sy, duration: 380, ease: 'Back.easeOut' });
      }
      this.emitter('fx:dust', 'dust').explode(6, cxw, cyw);
    } else if (fresh === 'changed' && !moving) {
      const img = entry.overlay ?? main;
      const sy = img.scaleY;
      img.setScale(img.scaleX, sy * 0.85);
      this.tweens.add({ targets: img, scaleY: sy, duration: 260, ease: 'Back.easeOut' });
    }

    if (spec.smoke) {
      const chimney = obj.kind === 'building' && BUILDINGS[obj.def]?.starter;
      entry.smoke = {
        x: main.x + main.displayWidth * (chimney ? 0.63 : 0.5),
        y: main.y - main.displayHeight + (chimney ? 22 : 16),
      };
    }
    if (night) {
      const top = main.y - main.displayHeight * 0.7;
      entry.glow = this.add
        .image(cxw, top, texture(this, 'fx:firefly'))
        .setTint(0xffc46b)
        .setScale(0.9 * Math.max(w, h))
        .setAlpha(0.75)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(DEPTH_UI - 150);
      this.tweens.add({ targets: entry.glow, alpha: 0.5, duration: 1400 + Math.random() * 600, yoyo: true, repeat: -1 });
    }

    const top = main.y - main.displayHeight + (artMeta(spec.tex).height > 40 ? 12 : 4);
    const cx = isoX(obj.x + w / 2, obj.y + h / 2);
    if (spec.bubble) entry.bubble = this.makeBubble(cx, top, spec.bubble);
    if (spec.progress !== undefined) {
      const bar = this.add.graphics().setDepth(DEPTH_UI - 1);
      const bw = 40;
      bar.fillStyle(0x4a3426, 0.85).fillRoundedRect(cx - bw / 2 - 2, top - 4, bw + 4, 9, 4);
      bar.fillStyle(0xfff3d6, 1).fillRoundedRect(cx - bw / 2, top - 2, bw, 5, 2.5);
      bar.fillStyle(0x7cc95a, 1).fillRoundedRect(cx - bw / 2, top - 2, Math.max(5, bw * spec.progress), 5, 2.5);
      entry.bar = bar;
    }
    this.sprites.set(obj.id, entry);
  }

  private makeBubble(x: number, y: number, b: { icon?: string; emoji?: string }): Bubble {
    const c = this.add.container(x, y - 16).setDepth(DEPTH_UI - 2);
    const g = this.add.graphics();
    g.fillStyle(0x4a3426, 0.25).fillEllipse(0, 18, 18, 6);
    g.fillStyle(0xfffaf0, 1).lineStyle(2, 0x4a3426, 1);
    g.fillCircle(0, 0, 13).strokeCircle(0, 0, 13);
    g.fillTriangle(-5, 10, 5, 10, 0, 17);
    g.lineBetween(-5, 11, 0, 17).lineBetween(5, 11, 0, 17);
    c.add(g);
    if (b.icon) c.add(this.add.image(0, 0, texture(this, b.icon)).setDisplaySize(22, 22));
    else if (b.emoji) {
      c.add(this.add.text(0, 0, b.emoji, { fontSize: '15px' }).setOrigin(0.5));
      c.setScale(0.75);
    }
    this.tweens.add({ targets: c, y: y - 21, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    return { key: b.icon ?? b.emoji ?? '', container: c };
  }

  /**
   * Bring a sprite to life: cycle painted animation frames (key#1, key#2, ...)
   * and give suitable decorations a gentle float or sway.
   */
  private animate(entry: ObjSprite, tex: string, obj: FarmObject): void {
    const frames = [tex];
    for (let i = 1; hasArt(`${tex}#${i}`); i++) frames.push(`${tex}#${i}`);
    const seed = (obj.x * 7 + obj.y * 13) % 17;
    if (frames.length > 1) {
      // Animals idle with blinks/tail swishes (base, #1, base, #2...); machines loop.
      const sequence = obj.kind === 'animal' ? frames.slice(1).flatMap((f) => [frames[0], frames[0], f]) : frames;
      const fps = tex === 'building:mill' ? 8 : /fire|torch|campfire|cauldron|sprinkler|fountain/.test(tex) ? 6 : obj.kind === 'animal' ? 2.5 : 4;
      this.animated.set(entry.main, { frames: sequence, fps, phase: seed });
    }
    if (obj.kind !== 'deco') return;
    const def = obj.def;
    if (FLOATERS.test(def)) {
      this.tweens.add({ targets: entry.main, y: entry.main.y - 5, duration: 1600 + seed * 40, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    } else if (SWAYERS.test(def) && !NO_SWAY.test(def)) {
      // Pivot at the bottom centre so it sways like it's rooted.
      const m = entry.main;
      m.setOrigin(0.5, 1);
      m.x += m.displayWidth / 2;
      this.tweens.add({ targets: m, angle: { from: -1.4, to: 1.4 }, duration: 2200 + seed * 60, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }
  }

  private animated = new Map<Phaser.GameObjects.Image, { frames: string[]; fps: number; phase: number }>();

  private stepAnimations(time: number): void {
    for (const [img, a] of this.animated) {
      if (!img.active) {
        this.animated.delete(img);
        continue;
      }
      const key = a.frames[Math.floor(time / (1000 / a.fps) + a.phase) % a.frames.length];
      if (img.texture.key !== key) img.setTexture(texture(this, key));
    }
  }

  private removeSprite(id: string): void {
    const s = this.sprites.get(id);
    if (!s) return;
    this.animated.delete(s.main);
    this.tweens.killTweensOf(s.main);
    s.main.destroy();
    s.overlay?.destroy();
    if (s.bubble) {
      this.tweens.killTweensOf(s.bubble.container);
      s.bubble.container.destroy();
    }
    s.bar?.destroy();
    if (s.glow) {
      this.tweens.killTweensOf(s.glow);
      s.glow.destroy();
    }
    if (s.costume) {
      this.tweens.killTweensOf(s.costume);
      s.costume.destroy();
    }
    this.sprites.delete(id);
  }

  // -------------------------------------------------------------------------
  // Ghost (placing and moving)

  private ghostTarget(): { def?: string; tex: string; w: number; h: number; flat: boolean; ignore?: string } | null {
    if (this.store.isVisiting) return null;
    if (tools.tool === 'place' && tools.place) {
      const p = placeable(tools.place.def);
      if (!p) return null;
      return { def: p.def, tex: `${p.kind}:${p.def}`, w: p.w, h: p.h, flat: !!p.flat };
    }
    if (tools.tool === 'move' && tools.moving) {
      const obj = this.store.state.objects[tools.moving];
      if (!obj) return null;
      const { w, h } = footprint(obj);
      const spec = this.renderSpec(obj, this.store.now(), false);
      return { tex: spec.tex, w, h, flat: spec.flat, ignore: obj.id };
    }
    return null;
  }

  private ghostOrigin(tile: Tile, w: number, h: number): Tile {
    return { x: tile.x - Math.floor((w - 1) / 2), y: tile.y - Math.floor((h - 1) / 2) };
  }

  private updateGhost(): void {
    const target = this.ghostTarget();
    const tile = this.hoverTile;
    if (!target || !tile) {
      this.ghost?.destroy();
      this.ghost = undefined;
      this.ghostKey = '';
      return;
    }
    if (!this.ghost || this.ghostKey !== target.tex) {
      this.ghost?.destroy();
      this.ghost = this.add.image(0, 0, texture(this, target.tex, target.w, target.h));
      this.ghostKey = target.tex;
    }
    const o = this.ghostOrigin(tile, target.w, target.h);
    this.placeImage(this.ghost, o.x, o.y, target.w, target.h);
    this.ghost.setDepth(DEPTH_UI - 10);
    const ok = canPlace(this.store.state, o.x, o.y, target.w, target.h, target.ignore);
    const flippable = target.w === target.h;
    this.ghost.setFlipX(flippable && tools.flip);
    this.ghost.setAlpha(0.8);
    if (ok) this.ghost.clearTint();
    else this.ghost.setTint(0xff7b7b);
  }

  // -------------------------------------------------------------------------
  // Hover highlight + tooltip

  private refreshHover(): void {
    this.hover.clear();
    const tile = this.hoverTile;
    if (!tile) {
      bus.emit('hover', null);
      return;
    }
    const state = this.store.viewed;
    const target = this.ghostTarget();
    let x = tile.x;
    let y = tile.y;
    let w = 1;
    let h = 1;
    let ok = true;
    const obj = target ? undefined : objectAt(state, tile.x, tile.y);
    if (target) {
      const o = this.ghostOrigin(tile, target.w, target.h);
      ({ x, y } = o);
      w = target.w;
      h = target.h;
      ok = canPlace(this.store.state, x, y, w, h, target.ignore);
    } else if (obj) {
      ({ x, y } = obj);
      ({ w, h } = footprint(obj));
    }
    const inside = x >= 0 && y >= 0 && x + w <= state.size && y + h <= state.size;
    if (!inside && !target) {
      bus.emit('hover', null);
      return;
    }
    const color = ok ? 0xfffbe0 : 0xff6b6b;
    this.hover.fillStyle(color, 0.28).lineStyle(2, color, 0.9);
    const pts = [
      new Phaser.Math.Vector2(isoX(x, y), isoY(x, y)),
      new Phaser.Math.Vector2(isoX(x + w, y), isoY(x + w, y)),
      new Phaser.Math.Vector2(isoX(x + w, y + h), isoY(x + w, y + h)),
      new Phaser.Math.Vector2(isoX(x, y + h), isoY(x, y + h)),
    ];
    this.hover.fillPoints(pts, true).strokePoints(pts, true);

    if (obj && !target) bus.emit('hover', { x: this.pointerScreen.x, y: this.pointerScreen.y, ...this.describe(obj) });
    else bus.emit('hover', null);
  }

  private describe(obj: FarmObject): { title: string; lines: string[] } {
    const now = this.store.now();
    const visiting = this.store.isVisiting;
    switch (obj.kind) {
      case 'plot': {
        if (!obj.crop) return { title: 'Plowed plot', lines: [visiting ? 'Ready for seeds' : 'Click to plant seeds'] };
        const def = CROPS[obj.crop];
        const st = cropStatus(obj, now);
        const lines: string[] = [];
        if (st.stage === 'ready') lines.push(visiting ? 'Ready to harvest' : '✅ Ready! Click to harvest');
        else if (st.stage === 'withered') lines.push(visiting ? '🥀 Withered: click to revive!' : '🥀 Withered: click to clear');
        else lines.push(`🌱 ${Math.floor(st.progress * 100)}% · ready in ${fmtDuration(st.readyAt - now)}`);
        if (st.stage === 'ready') lines.push(`Withers in ${fmtDuration(st.witherAt - now)}`);
        if (obj.fertilized) lines.push('✨ Fertilized by a neighbor (+1 harvest)');
        if (visiting && helpKind(obj, now) === 'fertilize') lines.push('Click to fertilize!');
        return { title: def.name, lines };
      }
      case 'tree':
      case 'animal': {
        const def = obj.kind === 'tree' ? TREES[obj.def] : ANIMALS[obj.def];
        const st = producerStatus(obj, now);
        const lines = [
          st.ready
            ? visiting
              ? `${nameOf(def.product)} ready`
              : `✅ ${nameOf(def.product)} ready! Click to collect`
            : `${nameOf(def.product)} in ${fmtDuration(st.readyAt - now)}`,
        ];
        if (visiting && helpKind(obj, now)) lines.push(`Click to ${obj.kind === 'tree' ? 'water' : 'feed'}!`);
        return { title: def.name, lines };
      }
      case 'building': {
        const def = BUILDINGS[obj.def];
        if (def.starter) return { title: this.store.viewed.name, lines: visiting ? ['Home sweet home'] : ['Click for farm info & daily bonus'] };
        if (visiting) return { title: def.name, lines: [] };
        const st = buildingStatus(obj, now);
        const lines: string[] = [];
        if (st.done) lines.push(`✅ ${st.done} ready to collect`);
        if (st.active) lines.push(`Making ${nameOf(st.active.recipe)} · ${fmtDuration(st.active.end - now)}`);
        if (!st.done && !st.active) lines.push('Idle: click to craft');
        return { title: def.name, lines };
      }
      case 'deco': {
        const def = DECORATIONS[obj.def];
        return { title: def?.name ?? 'Decoration', lines: def?.charm ? [`💗 +${def.charm} charm`] : [] };
      }
    }
  }

  // -------------------------------------------------------------------------
  // Input

  private tileAt(wx: number, wy: number): Tile {
    const fx = (wx / HALF_W + wy / HALF_H) / 2;
    const fy = (wy / HALF_H - wx / HALF_W) / 2;
    return { x: Math.floor(fx), y: Math.floor(fy) };
  }

  private setupInput(): void {
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      const cam = this.cameras.main;
      const d = this.drag;
      if (this.input.pointer1.isDown && this.input.pointer2.isDown) {
        d.mode = 'pinch';
        d.pinchDist = Phaser.Math.Distance.Between(
          this.input.pointer1.x,
          this.input.pointer1.y,
          this.input.pointer2.x,
          this.input.pointer2.y,
        );
        d.pinchZoom = cam.zoom;
        return;
      }
      d.sx = p.x;
      d.sy = p.y;
      d.camX = cam.scrollX;
      d.camY = cam.scrollY;
      d.errored = false;
      const tile = this.tileAt(p.worldX, p.worldY);
      d.lastTile = `${tile.x},${tile.y}`;
      // Touch screens have no hover, so show the tooltip for whatever was tapped.
      this.pointerScreen = { x: p.x, y: p.y };
      this.hoverTile = tile;
      this.refreshHover();
      if (p.rightButtonDown() || p.middleButtonDown()) {
        if (p.rightButtonDown() && (tools.tool === 'place' || tools.moving)) {
          setTool(tools.tool === 'place' ? 'hand' : 'move');
          return;
        }
        d.mode = 'pan';
        return;
      }
      const visiting = this.store.isVisiting;
      if (!visiting && (tools.tool === 'plow' || tools.tool === 'seed')) {
        d.mode = 'paint';
        this.paint(tile);
      } else if (!visiting && tools.tool === 'hand' && this.quickAction(tile, true)) {
        d.mode = 'harvest';
        this.quickAction(tile, false);
      } else {
        d.mode = 'pending';
      }
    });

    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      this.pointerScreen = { x: p.x, y: p.y };
      const d = this.drag;
      const cam = this.cameras.main;
      if (d.mode === 'pinch') {
        if (this.input.pointer1.isDown && this.input.pointer2.isDown) {
          const dist = Phaser.Math.Distance.Between(
            this.input.pointer1.x,
            this.input.pointer1.y,
            this.input.pointer2.x,
            this.input.pointer2.y,
          );
          const target = Phaser.Math.Clamp((d.pinchZoom * dist) / Math.max(1, d.pinchDist), MIN_ZOOM, MAX_ZOOM);
          this.zoomAt(target / cam.zoom, (this.input.pointer1.x + this.input.pointer2.x) / 2, (this.input.pointer1.y + this.input.pointer2.y) / 2);
        }
        return;
      }
      if (d.mode === 'pending' && Phaser.Math.Distance.Between(p.x, p.y, d.sx, d.sy) > 6) d.mode = 'pan';
      if (d.mode === 'pan') {
        cam.scrollX = d.camX - (p.x - d.sx) / cam.zoom;
        cam.scrollY = d.camY - (p.y - d.sy) / cam.zoom;
        this.clampCamera();
      }
      const tile = this.tileAt(p.worldX, p.worldY);
      const key = `${tile.x},${tile.y}`;
      if ((d.mode === 'paint' || d.mode === 'harvest') && p.isDown && key !== d.lastTile) {
        d.lastTile = key;
        if (d.mode === 'paint') this.paint(tile);
        else this.quickAction(tile, false);
      }
      if (!this.hoverTile || this.hoverTile.x !== tile.x || this.hoverTile.y !== tile.y) {
        this.hoverTile = tile;
        this.updateGhost();
      }
      this.refreshHover();
    });

    this.input.on('pointerup', (p: Phaser.Input.Pointer) => {
      const d = this.drag;
      if (d.mode === 'pending' && !p.rightButtonReleased()) this.click(this.tileAt(p.worldX, p.worldY));
      if (d.mode === 'pinch' && (this.input.pointer1.isDown || this.input.pointer2.isDown)) return;
      d.mode = 'none';
    });

    this.input.on('gameout', () => {
      this.hoverTile = null;
      this.updateGhost();
      this.refreshHover();
    });

    this.input.on('wheel', (p: Phaser.Input.Pointer, _objs: unknown, _dx: number, dy: number) => {
      this.zoomAt(dy > 0 ? 0.9 : 1.1, p.x, p.y);
    });
  }

  private setupKeyboard(): void {
    const kb = this.input.keyboard;
    if (!kb) return;
    this.keys = kb.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT,Q,E', false) as Record<string, Phaser.Input.Keyboard.Key>;
    kb.on('keydown', (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT') return;
      if (e.key === 'Escape') setTool('hand');
      else if (e.key === 'r' || e.key === 'R') {
        tools.flip = !tools.flip;
        this.updateGhost();
      } else if (e.key === '+' || e.key === '=') this.zoomBy(1.15);
      else if (e.key === '-') this.zoomBy(1 / 1.15);
    });
  }

  private keyboardPan(delta: number): void {
    const k = this.keys;
    if (!k || document.activeElement?.tagName === 'INPUT') return;
    const cam = this.cameras.main;
    const speed = (0.6 * delta) / cam.zoom;
    let dx = 0;
    let dy = 0;
    if (k.A.isDown || k.LEFT.isDown) dx -= speed;
    if (k.D.isDown || k.RIGHT.isDown) dx += speed;
    if (k.W.isDown || k.UP.isDown) dy -= speed;
    if (k.S.isDown || k.DOWN.isDown) dy += speed;
    if (k.Q.isDown) this.zoomBy(1 - delta * 0.0015);
    if (k.E.isDown) this.zoomBy(1 + delta * 0.0015);
    if (dx || dy) {
      cam.scrollX += dx;
      cam.scrollY += dy;
      this.clampCamera();
    }
  }

  /** Harvest/collect/clear in one tap. With dryRun, only report whether there is one. */
  private quickAction(tile: Tile, dryRun: boolean): boolean {
    const obj = objectAt(this.store.state, tile.x, tile.y);
    if (!obj) return false;
    const now = this.store.now();
    let action: Parameters<Store['dispatch']>[0] | null = null;
    if (obj.kind === 'plot') {
      const st = cropStatus(obj, now).stage;
      if (st === 'ready') action = { type: 'harvest', id: obj.id };
      else if (st === 'withered') action = { type: 'clearPlot', id: obj.id };
    } else if ((obj.kind === 'tree' || obj.kind === 'animal') && producerStatus(obj, now).ready) {
      action = { type: 'collect', id: obj.id };
    } else if (obj.kind === 'building' && buildingStatus(obj, now).done > 0) {
      action = { type: 'collectCrafts', id: obj.id };
    }
    if (!action) return false;
    if (!dryRun) this.store.dispatch(action, { quiet: true });
    return true;
  }

  private paintError(msg: string | null): void {
    if (msg && !this.drag.errored) {
      this.drag.errored = true;
      bus.emit('toast', msg, 'error');
    }
  }

  private paint(tile: Tile): void {
    const state = this.store.state;
    if (tile.x < 0 || tile.y < 0 || tile.x >= state.size || tile.y >= state.size) return;
    const obj = objectAt(state, tile.x, tile.y);
    if (tools.tool === 'plow') {
      if (obj) return;
      this.paintError(this.store.check({ type: 'plow', x: tile.x, y: tile.y }));
      this.store.dispatch({ type: 'plow', x: tile.x, y: tile.y }, { quiet: true });
    } else if (tools.tool === 'seed') {
      let plotId = obj?.kind === 'plot' && !obj.crop ? obj.id : null;
      if (!obj) {
        const err = this.store.check({ type: 'plow', x: tile.x, y: tile.y });
        if (err) return this.paintError(err);
        this.store.dispatch({ type: 'plow', x: tile.x, y: tile.y }, { quiet: true });
        plotId = objectAt(this.store.state, tile.x, tile.y)?.id ?? null;
      }
      if (!plotId) {
        if (obj && this.quickAction(tile, false)) return;
        return;
      }
      const action = { type: 'plant' as const, id: plotId, crop: tools.seed };
      this.paintError(this.store.check(action));
      this.store.dispatch(action, { quiet: true });
    }
  }

  private click(tile: Tile): void {
    const store = this.store;
    const state = store.viewed;
    const obj = objectAt(state, tile.x, tile.y);

    if (store.isVisiting) {
      if (!obj) return;
      if (helpKind(obj, store.now()) && (store.visit?.helpsLeft ?? 0) > 0) {
        sfx.help();
        void store.help(obj.id);
      } else if (helpKind(obj, store.now())) bus.emit('toast', 'No helps left for this neighbor today. Come back tomorrow!', 'info');
      return;
    }

    if (this.mama?.at(tile.x, tile.y) && tools.tool === 'hand') {
      const mama = this.mama;
      if (store.dispatch({ type: 'mamaVisit' })) {
        mama.happy();
        sfx.quest();
        this.emitter('fx:heart', 'burst').explode(6, mama.img.x, mama.img.y - 34);
        bus.emit('mama');
      } else mama.leave();
      return;
    }
    if (this.treater?.at(tile.x, tile.y) && tools.tool === 'hand' && this.treater.feature) {
      const kid = this.treater;
      if (store.dispatch({ type: 'treat', event: kid.feature!.event })) {
        kid.happy();
        sfx.quest();
        this.emitter('fx:heart', 'burst').explode(5, kid.img.x, kid.img.y - 30);
        bus.emit('toast', kid.feature!.visitorThanks, 'good');
      } else kid.leave();
      return;
    }
    const pet = tools.tool === 'hand' ? this.pets.find((p) => p.at(tile.x, tile.y)) : undefined;
    if (pet) {
      pet.pet();
      if (pet.kind === 'dog') sfx.bark();
      else {
        sfx.meow();
        setTimeout(() => sfx.purr(1.3), 350);
      }
      this.emitter('fx:heart', 'burst').explode(4, pet.img.x, pet.img.y - 24);
      return;
    }

    switch (tools.tool) {
      case 'hand': {
        if (!obj) return;
        if (obj.kind === 'plot' && !obj.crop) bus.emit('openSeedPicker', obj.id);
        else if (obj.kind === 'building') {
          if (BUILDINGS[obj.def]?.starter) bus.emit('openFarmhouse');
          else bus.emit('openBuilding', obj.id);
        }
        return;
      }
      case 'move': {
        if (!tools.moving) {
          if (obj) {
            tools.moving = obj.id;
            this.dirty = true;
          }
          return;
        }
        const moving = store.state.objects[tools.moving];
        if (!moving) return setTool('move');
        const { w, h } = footprint(moving);
        const o = this.ghostOrigin(tile, w, h);
        if (store.dispatch({ type: 'move', id: moving.id, x: o.x, y: o.y, flip: w === h && tools.flip })) {
          tools.moving = null;
          tools.flip = false;
          this.dirty = true;
        }
        return;
      }
      case 'store': {
        if (!obj) return;
        if (obj.kind !== 'deco') return bus.emit('toast', 'Only decorations can be put in storage', 'error');
        store.dispatch({ type: 'store', id: obj.id });
        return;
      }
      case 'sell': {
        if (!obj) return;
        if (obj.kind === 'plot') {
          store.dispatch({ type: 'sellObject', id: obj.id });
          return;
        }
        const p = placeable(obj.def);
        if (!p || p.starter) return bus.emit('toast', "That can't be sold", 'error');
        const refund = Math.floor(p.cost * 0.3);
        if (confirm(`Sell ${p.name} for ${refund} coins?`)) store.dispatch({ type: 'sellObject', id: obj.id });
        return;
      }
      case 'place': {
        const mode = tools.place;
        if (!mode) return;
        const p = placeable(mode.def);
        if (!p) return;
        const o = this.ghostOrigin(tile, p.w, p.h);
        const flip = p.w === p.h && tools.flip;
        const ok =
          mode.source === 'shop'
            ? store.dispatch({ type: 'buy', def: p.def, x: o.x, y: o.y, flip })
            : store.dispatch({ type: 'placeStored', def: p.def, x: o.x, y: o.y, flip });
        if (!ok) return;
        const keepGoing =
          p.kind === 'deco' &&
          (mode.source === 'shop' ? store.state.coins >= p.cost : (store.state.inventory[p.def] ?? 0) > 0);
        if (!keepGoing) setTool('hand');
        return;
      }
      default:
        return;
    }
  }

  // -------------------------------------------------------------------------
  // Feedback

  private showEvents(events: GameEvent[]): void {
    const stacks = new Map<string, number>();
    for (const e of events) {
      if (e.type === 'levelUp') bus.emit('levelUp', e.level);
      else if (e.type === 'questReady') bus.emit('questReady', e.quest);
      if ((e.type !== 'gain' && e.type !== 'spend') || e.x === undefined || e.y === undefined) continue;
      const key = `${e.x},${e.y}`;
      const n = stacks.get(key) ?? 0;
      stacks.set(key, n + 1);
      const wx = isoX(e.x, e.y);
      const wy = isoY(e.x, e.y) - 34 - n * 18;
      let icon: string | null = null;
      let label: string;
      let color = '#fff8e1';
      if (e.type === 'spend') {
        icon = 'icon:coin';
        label = `-${e.amount}`;
        color = '#ffd0c4';
      } else if (e.what === 'coins') {
        icon = 'icon:coin';
        label = `+${e.amount}`;
        color = '#ffe57a';
      } else if (e.what === 'xp') {
        icon = 'icon:xp';
        label = `+${e.amount}`;
        color = '#b6f0ff';
      } else {
        icon = `icon:${e.what}`;
        label = `+${e.amount}`;
      }
      this.floatText(wx, wy, label, color, icon, n * 90);
      if (e.type === 'gain') {
        const cam = this.cameras.main;
        const sx = (wx - cam.worldView.x) * cam.zoom;
        const sy = (wy - cam.worldView.y) * cam.zoom;
        const target = e.what === 'coins' ? 'coins' : e.what === 'xp' ? 'xp' : 'barn';
        if (target === 'barn') this.emitter('fx:sparkle', 'burst').explode(5, wx, wy + 24);
        setTimeout(() => bus.emit('fly', `icon:${e.what === 'coins' ? 'coin' : e.what}`, sx, sy, target), 150 + n * 90);
      }
    }
  }

  private floatText(x: number, y: number, label: string, color: string, icon: string | null, delay: number): void {
    const c = this.add.container(x, y).setDepth(DEPTH_UI).setAlpha(0);
    const t = this.add
      .text(icon ? 4 : 0, 0, label, {
        fontFamily: '"Nunito", "Trebuchet MS", sans-serif',
        fontStyle: '900',
        fontSize: '15px',
        color,
        stroke: '#4a3426',
        strokeThickness: 4,
      })
      .setOrigin(0, 0.5);
    if (icon) {
      const img = this.add.image(0, 0, texture(this, icon)).setDisplaySize(18, 18).setOrigin(1, 0.5);
      c.add(img);
    }
    c.add(t);
    c.x -= t.width / 2;
    this.tweens.add({
      targets: c,
      alpha: { from: 0, to: 1 },
      y: y - 10,
      duration: 180,
      delay,
      onComplete: () =>
        this.tweens.add({ targets: c, y: y - 46, alpha: 0, duration: 900, delay: 350, onComplete: () => c.destroy() }),
    });
  }

  /** A few butterflies drifting over the farm for ambience. */
  private spawnButterflies(): void {
    const colors = [0xffb3d9, 0xfff1a1, 0xb9e6ff, 0xffffff];
    for (let i = 0; i < 6; i++) {
      const g = this.add.graphics().setDepth(DEPTH_UI - 50);
      const col = colors[i % colors.length];
      g.fillStyle(col, 1).lineStyle(1, 0x4a3426, 0.8);
      g.fillEllipse(-3, 0, 6, 5).strokeEllipse(-3, 0, 6, 5);
      g.fillEllipse(3, 0, 6, 5).strokeEllipse(3, 0, 6, 5);
      const flyTo = () => {
        const size = this.store.viewed.size;
        const tx = Phaser.Math.FloatBetween(0, size);
        const ty = Phaser.Math.FloatBetween(0, size);
        this.tweens.add({
          targets: g,
          x: isoX(tx, ty),
          y: isoY(tx, ty) - 40,
          duration: Phaser.Math.Between(5000, 9000),
          ease: 'Sine.easeInOut',
          onComplete: flyTo,
        });
      };
      const size = this.store.viewed.size;
      g.setPosition(isoX(Math.random() * size, Math.random() * size), isoY(Math.random() * size, Math.random() * size) - 40);
      this.tweens.add({ targets: g, scaleX: 0.3, duration: 160, yoyo: true, repeat: -1 });
      flyTo();
    }
  }
}
