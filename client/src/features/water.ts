// Well water on the client: drawing water by tapping a Wishing Well or Water
// Pump, a 💧 bubble over wells that are ready, and splashes when you water.
// (The Water tool itself lives in the toolbar and FarmScene.paint.)

import Phaser from 'phaser';
import { CAN_SIZE, DECORATIONS, isWell, waterLevel, wellReadyAt, type FarmState } from '@farm/shared';
import { bus } from '../bus';
import { sfx } from '../sfx';
import { setTool } from '../tools';
import { toast } from '../ui/dom';
import { fmtDuration } from '../util';
import type { FarmScene } from '../scenes/FarmScene';
import type { Store } from '../store';
import type { FeatureContext } from './registry';

let S: Store;
let scene: FarmScene | null = null;

export function init(ctx: FeatureContext): void {
  S = ctx.store;
  bus.on('decoClick', (id: string, def: string) => {
    if (!isWell({ kind: 'deco', def })) return;
    const now = S.now();
    const ready = wellReadyAt(S.state, id);
    if (ready > now) return toast(`💧 The ${DECORATIONS[def]?.name ?? 'well'} is filling up again. Back in ${fmtDuration(ready - now)}.`);
    if (waterLevel(S.state, now) >= CAN_SIZE) return toast(`💧 Your watering can is already full (${CAN_SIZE}/${CAN_SIZE}). Pick up the Water tool and give your crops a drink!`);
    S.dispatch({ type: 'drawWater', id });
  });
  S.onEvents((events) => {
    let watered = 0;
    for (const e of events) {
      if (e.type === 'wateredCrop') {
        watered++;
        splash(e.x + 0.5, e.y + 0.5);
      } else if (e.type === 'drewWater') {
        sfx.splash();
        const obj = S.state.objects[e.id];
        if (obj) splash(obj.x + 0.5, obj.y + 0.5, 10);
        toast(`💧 Your watering can is full! (${CAN_SIZE}/${CAN_SIZE})`, 'good');
        setTool('water');
      }
    }
    if (watered) sfx.plop();
  });
  ctx.onScene((s) => {
    scene = s;
    new WellLayer(s);
  });
}

function splash(x: number, y: number, n = 6): void {
  if (!scene) return;
  const p = scene.tileToWorld(x, y);
  scene.burst(scene.textures.exists('wx:droplet') ? 'wx:droplet' : 'fx:sparkle', n, p.x, p.y - 6);
}

/** A 💧 bubble over every well that can fill your can right now. */
class WellLayer {
  private bubbles = new Map<string, Phaser.GameObjects.Container>();

  constructor(private sc: FarmScene) {
    sc.time.addEvent({ delay: 5000, loop: true, callback: () => this.sync() });
    S.onChange(() => this.sync());
    this.sync();
  }

  private sync(): void {
    const st: FarmState = S.state;
    const now = S.now();
    const want = new Set<string>();
    if (!S.visit && waterLevel(st, now) < CAN_SIZE)
      for (const o of Object.values(st.objects)) if (isWell(o) && wellReadyAt(st, o.id) <= now) want.add(o.id);
    for (const id of want) {
      const o = st.objects[id];
      const p = this.sc.tileToWorld(o.x + 0.5, o.y + 0.5);
      let b = this.bubbles.get(id);
      if (!b) {
        b = this.bubble();
        this.bubbles.set(id, b);
      }
      b.setPosition(p.x, p.y - 62).setDepth(this.sc.depthAt(o.x, o.y) + 1e5);
    }
    for (const [id, b] of this.bubbles)
      if (!want.has(id)) {
        b.destroy();
        this.bubbles.delete(id);
      }
  }

  private bubble(): Phaser.GameObjects.Container {
    const c = this.sc.add.container(0, 0);
    const g = this.sc.add.graphics();
    g.fillStyle(0xf0f8ff, 1).lineStyle(2, 0x4a3426, 1);
    g.fillCircle(0, 0, 12).strokeCircle(0, 0, 12);
    g.fillTriangle(-4, 9, 4, 9, 0, 15);
    g.lineBetween(-4, 10, 0, 15).lineBetween(4, 10, 0, 15);
    c.add([g, this.sc.add.text(0, 0, '💧', { fontSize: '13px' }).setOrigin(0.5)]);
    this.sc.tweens.add({ targets: c, y: '-=5', duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    return c;
  }
}
