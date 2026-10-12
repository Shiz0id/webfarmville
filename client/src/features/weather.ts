// Weather on the client: the forecast pill, rain / snow / wind / rainbow
// effects over the farm, puddle ripples, lightning and a weather sound bed.
// `?weather=rain` previews any weather's look without changing the rules.

import Phaser from 'phaser';
import { WEATHER, forecast, thirstyPlots, weatherAt, type Weather } from '@farm/shared';
import { dayPhase } from '../scenes/ambience';
import { setAmbient, thunder } from '../sfx';
import { openModal, toast } from '../ui/dom';
import { h } from '../util';
import type { FarmScene } from '../scenes/FarmScene';
import type { Store } from '../store';
import { addHudPill, type FeatureContext } from './registry';

let S: Store;

const DEPTH = 1_000_000 - 190;
const RIPPLE_DEPTH = -50_000 + 5_000;

function forced(): Weather | null {
  const w = new URLSearchParams(location.search).get('weather');
  return w && Object.hasOwn(WEATHER, w) ? (w as Weather) : null;
}

/** The weather to draw right now. */
const shown = (): Weather => forced() ?? weatherAt(S.now());

export function init(ctx: FeatureContext): void {
  S = ctx.store;
  const em = h('span', { class: 'wx-em' });
  const label = h('span', { class: 'wx-label' });
  const pill = h('div', { class: 'pill wx-pill', title: 'Weather', onclick: openForecast }, em, label);
  addHudPill(pill);
  const paint = () => {
    const def = WEATHER[shown()];
    em.textContent = def.emoji;
    label.textContent = def.name;
    pill.title = `${def.name}: ${def.perk}\nClick for the forecast.`;
    pill.dataset.wx = def.id;
  };
  paint();
  setInterval(paint, 30_000);

  S.onEvents((events) => {
    for (const e of events) if (e.type === 'rained' && e.plots.length > 1) toast(`🌧️ The rain watered ${e.plots.length} crops: they'll be ready sooner!`, 'good');
  });

  // Rain that starts while crops are already growing waters them too.
  const feel = () => {
    if (!S.visit && thirstyPlots(S.state, S.now()).length) S.dispatch({ type: 'feelRain' }, { quiet: true });
  };
  ctx.onScene((scene) => {
    new WeatherLayer(scene);
    setTimeout(feel, 2500);
  });
  setInterval(feel, 30_000);
}

function openForecast(): void {
  const m = openModal(`${WEATHER[shown()].emoji} Weather`, { narrow: true });
  const names = ['Today', 'Tomorrow'];
  const days = forecast(S.now(), 3);
  if (forced()) days[0].weather = forced()!;
  m.body.append(
    h(
      'div',
      { class: 'wx-days' },
      ...days.map((d, i) => {
        const def = WEATHER[d.weather];
        const name = names[i] ?? new Date(d.day).toLocaleDateString(undefined, { weekday: 'long', timeZone: 'UTC' });
        return h(
          'div',
          { class: `wx-day wx-${def.id}${i === 0 ? ' today' : ''}` },
          h('div', { class: 'wx-day-name' }, name),
          h('div', { class: 'wx-day-em' }, def.emoji),
          h('div', { class: 'wx-day-title' }, def.name),
          h('div', { class: 'wx-day-perk' }, def.perk),
        );
      }),
    ),
    h('p', { class: 'muted small center' }, 'Every farm in the valley shares the same sky. New weather rolls in at midnight (UTC).'),
  );
}

// ---------------------------------------------------------------------------
// Textures, drawn once with Phaser graphics.

function makeTextures(scene: Phaser.Scene): void {
  const t = scene.textures;
  const g = scene.make.graphics({}, false);
  if (!t.exists('wx:drop')) {
    g.clear();
    g.fillStyle(0xdcecff, 0.85);
    g.fillRoundedRect(0, 0, 3, 18, 1.5);
    g.generateTexture('wx:drop', 3, 18);
  }
  if (!t.exists('wx:ripple')) {
    g.clear();
    g.lineStyle(2, 0xe8f4ff, 0.9);
    g.strokeEllipse(16, 8, 28, 12);
    g.generateTexture('wx:ripple', 32, 16);
  }
  if (!t.exists('wx:droplet')) {
    g.clear();
    g.fillStyle(0x8fd0ff, 1);
    g.fillCircle(6, 6, 5);
    g.fillStyle(0xffffff, 0.9);
    g.fillCircle(4.5, 4.5, 1.6);
    g.generateTexture('wx:droplet', 12, 12);
  }
  if (!t.exists('wx:gust')) {
    g.clear();
    g.lineStyle(3, 0xffffff, 0.9);
    g.beginPath();
    g.moveTo(2, 10);
    g.lineTo(40, 10);
    g.arc(40, 4, 6, Math.PI / 2, -Math.PI * 0.9, true);
    g.strokePath();
    g.generateTexture('wx:gust', 50, 14);
  }
  if (!t.exists('wx:flake')) {
    g.clear();
    g.fillStyle(0xffffff, 0.95);
    g.fillCircle(8, 8, 6);
    g.fillStyle(0xffffff, 0.35);
    g.fillCircle(8, 8, 8);
    g.generateTexture('wx:flake', 16, 16);
  }
  g.destroy();
  if (!t.exists('wx:rainbow')) {
    const c = document.createElement('canvas');
    c.width = 640;
    c.height = 330;
    const x = c.getContext('2d')!;
    const bands = ['#ff9aa8', '#ffc48a', '#fff09a', '#a8eaa0', '#9fd4ff', '#c7b2ff'];
    x.lineCap = 'round';
    bands.forEach((col, i) => {
      x.strokeStyle = col;
      x.lineWidth = 15;
      x.beginPath();
      x.arc(320, 320, 300 - i * 14, Math.PI, 0);
      x.stroke();
    });
    // Fade the feet of the arc into the sky.
    x.globalCompositeOperation = 'destination-out';
    const fade = x.createLinearGradient(0, 160, 0, 330);
    fade.addColorStop(0, 'rgba(0,0,0,0)');
    fade.addColorStop(1, 'rgba(0,0,0,1)');
    x.fillStyle = fade;
    x.fillRect(0, 0, 640, 330);
    t.addCanvas('wx:rainbow', c);
  }
  if (!t.exists('wx:beam')) {
    const c = document.createElement('canvas');
    c.width = 160;
    c.height = 900;
    const x = c.getContext('2d')!;
    const grad = x.createLinearGradient(0, 0, 160, 0);
    grad.addColorStop(0, 'rgba(255,244,200,0)');
    grad.addColorStop(0.5, 'rgba(255,244,200,1)');
    grad.addColorStop(1, 'rgba(255,244,200,0)');
    x.fillStyle = grad;
    x.fillRect(0, 0, 160, 900);
    x.globalCompositeOperation = 'destination-out';
    const fade = x.createLinearGradient(0, 0, 0, 900);
    fade.addColorStop(0, 'rgba(0,0,0,0)');
    fade.addColorStop(1, 'rgba(0,0,0,1)');
    x.fillStyle = fade;
    x.fillRect(0, 0, 160, 900);
    t.addCanvas('wx:beam', c);
  }
}

// ---------------------------------------------------------------------------

const TINTS: Partial<Record<Weather, [number, number]>> = {
  cloudy: [0x8a93a8, 0.1],
  rain: [0x50648a, 0.17],
  storm: [0x34406a, 0.28],
  snow: [0xe4edff, 0.1],
  rainbow: [0xfff0d0, 0.05],
};

class WeatherLayer {
  private weather: Weather | null = null;
  private key = '';
  private parts: Phaser.GameObjects.GameObject[] = [];
  private timers: Phaser.Time.TimerEvent[] = [];
  private flash: Phaser.GameObjects.Rectangle;
  /** Screen-space layer that cancels out the camera zoom, so effects always fill the view. */
  private root: Phaser.GameObjects.Container;

  constructor(private scene: FarmScene) {
    makeTextures(scene);
    this.root = scene.add.container(0, 0).setScrollFactor(0).setDepth(DEPTH);
    this.flash = scene.add.rectangle(0, 0, 10, 10, 0xffffff, 0).setOrigin(0);
    const unzoom = () => {
      const z = scene.cameras.main.zoom;
      const { width, height } = scene.scale;
      this.root.setScale(1 / z).setPosition(width / 2 - width / 2 / z, height / 2 - height / 2 / z);
    };
    unzoom();
    scene.events.on(Phaser.Scenes.Events.PRE_RENDER, unzoom);
    this.refresh();
    scene.time.addEvent({ delay: 20_000, loop: true, callback: () => this.refresh() });
    scene.time.addEvent({ delay: 3000, loop: true, callback: () => setAmbient(ambientFor(this.weather)) });
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => setAmbient('none'));
    S.onEvents((events) => {
      for (const e of events) if (e.type === 'rained') for (const id of e.plots) this.splash(id);
    });
  }

  private refresh(): void {
    const w = shown();
    const key = `${w}|${dayPhase()}`;
    if (key === this.key) return;
    this.key = key;
    this.weather = w;
    for (const p of this.parts) p.destroy();
    for (const t of this.timers) t.remove();
    this.parts = [];
    this.timers = [];
    this.build(w);
    // Everything except the ground ripples lives in the screen layer, flash on top.
    for (const p of this.parts) if (p.getData('world') !== true) this.root.add(p);
    this.root.add(this.flash);
    setAmbient(ambientFor(w));
  }

  private get view() {
    return this.scene.scale;
  }

  private build(w: Weather): void {
    const sc = this.scene;
    const tint = TINTS[w];
    if (tint) {
      const r = sc.add.rectangle(0, 0, 10, 10, tint[0], tint[1]).setScrollFactor(0).setOrigin(0).setDepth(DEPTH);
      this.fit(r);
      this.parts.push(r);
    }
    if (w === 'rain' || w === 'storm') this.rain(w === 'storm');
    if (w === 'storm') this.lightning();
    if (w === 'snow') this.snow();
    if (w === 'windy') this.wind();
    const daylight = dayPhase() !== 'night';
    if (w === 'rainbow' && daylight) this.rainbow();
    if (w === 'sunny' && daylight && dayPhase() !== 'dusk') this.sunbeams();
  }

  /** Keep a screen-space rectangle covering the view at any zoom. */
  private fit(r: Phaser.GameObjects.Rectangle): void {
    const size = () => r.setPosition(0, 0).setSize(this.view.width, this.view.height);
    size();
    this.scene.scale.on('resize', size);
    r.once(Phaser.GameObjects.Events.DESTROY, () => this.scene.scale.off('resize', size));
  }

  private rain(storm: boolean): void {
    const sc = this.scene;
    const { width } = this.view;
    const drops = sc.add.particles(0, 0, 'wx:drop', {
      x: { min: -width * 0.2, max: width * 1.3 },
      y: { min: -60, max: -20 },
      lifespan: 1300,
      advance: 1300,
      speedY: { min: 700, max: 860 },
      speedX: storm ? { min: -280, max: -220 } : { min: -120, max: -90 },
      rotate: storm ? 18 : 8,
      scale: { min: 0.8, max: 1.3 },
      alpha: { min: 0.4, max: 0.75 },
      frequency: storm ? 4 : 8,
      quantity: storm ? 4 : 3,
    });
    drops.setScrollFactor(0).setDepth(DEPTH + 2);
    this.parts.push(drops);
    // Ripples land on whatever part of the farm is on screen.
    const cam = sc.cameras.main;
    const ripples = sc.add.particles(0, 0, 'wx:ripple', {
      emitZone: {
        type: 'random',
        source: {
          getRandomPoint: (p: Phaser.Types.Math.Vector2Like) => {
            const v = cam.worldView;
            p.x = v.x + Math.random() * v.width;
            p.y = v.y + Math.random() * v.height;
            return p;
          },
        },
      } as Phaser.Types.GameObjects.Particles.EmitZoneData,
      lifespan: 700,
      scale: { start: 0.3, end: 1.1 },
      alpha: { start: 0.7, end: 0 },
      frequency: storm ? 8 : 16,
    });
    ripples.setDepth(RIPPLE_DEPTH).setData('world', true);
    this.parts.push(ripples);
  }

  private lightning(): void {
    const strike = () => {
      const f = this.flash;
      f.setSize(this.view.width, this.view.height);
      this.scene.tweens.chain({
        targets: f,
        tweens: [
          { fillAlpha: 0.55, duration: 60 },
          { fillAlpha: 0.1, duration: 90 },
          { fillAlpha: 0.4, duration: 50 },
          { fillAlpha: 0, duration: 500 },
        ],
      });
      this.scene.time.delayedCall(400 + Math.random() * 900, thunder);
      this.timers.push(this.scene.time.delayedCall(14_000 + Math.random() * 22_000, strike));
    };
    this.timers.push(this.scene.time.delayedCall(4000 + Math.random() * 6000, strike));
  }

  private snow(): void {
    const { width } = this.view;
    for (const [freq, scale, speed] of [
      [70, { min: 0.25, max: 0.45 }, { min: 30, max: 55 }],
      [160, { min: 0.55, max: 0.8 }, { min: 55, max: 80 }],
    ] as const) {
      const flakes = this.scene.add.particles(0, 0, 'wx:flake', {
        x: { min: -width * 0.1, max: width * 1.1 },
        y: -20,
        lifespan: 16_000,
        advance: 16_000,
        speedY: speed,
        speedX: { min: -18, max: 18 },
        accelerationX: { min: -6, max: 6 },
        scale,
        alpha: { start: 0.95, end: 0.7 },
        frequency: freq,
      });
      flakes.setScrollFactor(0).setDepth(DEPTH + 2);
      this.parts.push(flakes);
    }
  }

  private wind(): void {
    const { width, height } = this.view;
    const month = new Date(S.now()).getUTCMonth();
    const leaves = month >= 2 && month <= 4 ? ['fx:petal'] : month >= 5 && month <= 7 ? ['fx:fluff'] : ['fx:leaf_red', 'fx:leaf_orange', 'fx:leaf_yellow'];
    for (const tex of leaves) {
      const e = this.scene.add.particles(0, 0, tex, {
        x: -40,
        y: { min: -height * 0.1, max: height * 0.9 },
        lifespan: 7000,
        advance: 5000,
        speedX: { min: 220, max: 380 },
        speedY: { min: 10, max: 70 },
        rotate: { start: 0, end: 720 },
        scale: { min: 0.3, max: 0.48 },
        frequency: 200 * leaves.length,
      });
      e.setScrollFactor(0).setDepth(DEPTH + 2);
      this.parts.push(e);
    }
    const gusts = this.scene.add.particles(0, 0, 'wx:gust', {
      x: { min: -60, max: width * 0.6 },
      y: { min: 0, max: height },
      lifespan: 1600,
      speedX: { min: 260, max: 360 },
      scaleX: { start: 0.6, end: 1.8 },
      scaleY: 1,
      alpha: { values: [0, 0.75, 0.6, 0] },
      frequency: 500,
    });
    gusts.setScrollFactor(0).setDepth(DEPTH + 1);
    this.parts.push(gusts);
  }

  private rainbow(): void {
    const sc = this.scene;
    const bow = sc.add.image(0, 0, 'wx:rainbow').setScrollFactor(0).setOrigin(0.5, 1).setDepth(DEPTH + 1).setAlpha(0);
    const place = () => {
      const { width, height } = this.view;
      bow.setPosition(width * 0.62, height * 0.5).setScale(Math.max(0.7, Math.min(1.6, width / 900)));
    };
    place();
    sc.scale.on('resize', place);
    bow.once(Phaser.GameObjects.Events.DESTROY, () => sc.scale.off('resize', place));
    sc.tweens.add({ targets: bow, alpha: 0.42, duration: 2500 });
    sc.tweens.add({ targets: bow, alpha: { from: 0.42, to: 0.3 }, duration: 3200, yoyo: true, repeat: -1, delay: 2500, ease: 'Sine.easeInOut' });
    const { width, height } = this.view;
    const glints = sc.add.particles(0, 0, 'fx:sparkle', {
      x: { min: width * 0.3, max: width * 0.95 },
      y: { min: height * 0.05, max: height * 0.5 },
      lifespan: 1800,
      scale: { start: 0.25, end: 0 },
      alpha: { values: [0, 0.9, 0] },
      frequency: 420,
      blendMode: Phaser.BlendModes.ADD,
    });
    glints.setScrollFactor(0).setDepth(DEPTH + 2);
    this.parts.push(bow, glints);
  }

  /** Soft slanted beams of sunlight, gently breathing. */
  private sunbeams(): void {
    const sc = this.scene;
    for (let i = 0; i < 3; i++) {
      const b = sc.add
        .image(0, 0, 'wx:beam')
        .setScrollFactor(0)
        .setOrigin(0.5, 0)
        .setAngle(-28)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(DEPTH)
        .setAlpha(0);
      const place = () => b.setPosition(this.view.width * (0.08 + i * 0.13), -60).setScale(0.6 + i * 0.35, Math.max(1, this.view.height / 700));
      place();
      sc.scale.on('resize', place);
      b.once(Phaser.GameObjects.Events.DESTROY, () => sc.scale.off('resize', place));
      sc.tweens.add({ targets: b, alpha: { from: 0.05, to: 0.13 }, duration: 4000 + i * 1300, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      this.parts.push(b);
    }
  }

  /** Raindrops plink onto a crop the rain just watered. */
  private splash(id: string): void {
    const obj = S.state.objects[id];
    if (!obj) return;
    const p = this.scene.tileToWorld(obj.x + 0.5, obj.y + 0.5);
    this.scene.burst('wx:droplet', 6, p.x, p.y - 6);
  }
}

function ambientFor(w: Weather | null) {
  return w === 'rain' ? 'rain' : w === 'storm' ? 'storm' : w === 'windy' ? 'wind' : 'none';
}
