// Lonely animals on the client: once a day a lost little animal wanders onto
// the farm with a sad little heart bubble. Tap it to adopt it, or walk it over
// to a villager who has been hoping for one.

import Phaser from 'phaser';
import {
  ADOPT_XP,
  ANIMALS,
  FRIENDS,
  LONELY_HOMES,
  REHOME_XP,
  lonelyDue,
  lonelyWaiting,
  rehomeCoins,
  utcDay,
  type GameEvent,
} from '@farm/shared';
import { RES, artURL, iconURL, texture } from '../art';
import { sfx } from '../sfx';
import { tools } from '../tools';
import { confetti, modalOpen, openModal, toast } from '../ui/dom';
import { portrait } from '../ui/villager';
import { fmtNum, h } from '../util';
import type { FarmScene } from '../scenes/FarmScene';
import type { Store } from '../store';
import type { FeatureContext } from './registry';

let S: Store;
let layer: LonelyLayer | null = null;

/** How long after the farm opens before a lonely animal may turn up. */
const ARRIVE_AFTER = 25_000;
const CHECK_EVERY = 10_000;

const waiting = () => (S.visit ? null : lonelyWaiting(S.state, S.now(), utcDay));
const kindName = (animal: string) => (ANIMALS[animal]?.name ?? animal).replace(/^Angora /, '').toLowerCase();

export function init(ctx: FeatureContext): void {
  S = ctx.store;
  ctx.onScene((scene) => (layer = new LonelyLayer(scene)));
  const tryArrive = () => {
    if (!S.visit && !modalOpen() && lonelyDue(S.state, S.now(), utcDay)) S.dispatch({ type: 'lonelyArrive' }, { quiet: true });
  };
  window.setTimeout(() => {
    tryArrive();
    window.setInterval(tryArrive, CHECK_EVERY);
  }, ARRIVE_AFTER);
  S.onEvents((events) => {
    for (const e of events) {
      if (e.type === 'lonelyArrived') {
        sfx.pop();
        toast(`💔 A lonely little ${kindName(e.animal)} named ${e.name} wandered onto your farm! Tap it to say hello.`, 'info');
      } else if (e.type === 'lonelyAdopted') adopted(e);
      else if (e.type === 'lonelyRehomed') rehomed(e);
    }
  });
}

// ---------------------------------------------------------------------------
// The wanderer on the farm

class LonelyLayer {
  private img: Phaser.GameObjects.Image | null = null;
  private bubble: Phaser.GameObjects.Container | null = null;
  private animal = '';
  x = 0;
  y = 0;
  private walking: Phaser.Tweens.Tween | null = null;

  constructor(readonly scene: FarmScene) {
    scene.time.addEvent({ delay: 3800, loop: true, callback: () => this.wander() });
    S.onChange(() => this.sync());
    this.sync();
  }

  sync(): void {
    const l = waiting();
    if (!l?.animal) {
      if (S.state.lonely?.done === 'rehomed' && this.img) this.leave();
      else this.clear();
      return;
    }
    if (this.img && this.animal === l.animal) return;
    this.clear();
    this.animal = l.animal;
    const n = S.state.size;
    // Wander in from the near edge of the farm.
    this.x = n - 1.5;
    this.y = n / 2 + (Math.random() - 0.5) * 4;
    const sc = this.scene;
    this.img = sc.add.image(0, 0, texture(sc, `animal:${l.animal}`)).setOrigin(0.5, 1).setScale(1 / RES).setAlpha(0);
    this.img.setInteractive({ useHandCursor: true });
    this.img.on('pointerdown', (_p: unknown, _x: number, _y: number, ev: Phaser.Types.Input.EventData) => {
      if (tools.tool !== 'hand' || S.visit) return;
      ev.stopPropagation();
      sfx.click();
      sc.burst('fx:heart', 4, this.img!.x, this.img!.y - 30);
      openLonely(this.x, this.y);
    });
    this.bubble = this.makeBubble();
    sc.tweens.add({ targets: this.img, alpha: 1, duration: 600 });
    this.place();
    this.walkTo(n / 2 + (Math.random() - 0.5) * 3, n / 2 + (Math.random() - 0.5) * 3);
  }

  private makeBubble(): Phaser.GameObjects.Container {
    const sc = this.scene;
    const c = sc.add.container(0, 0);
    const g = sc.add.graphics();
    g.fillStyle(0xfff4f6, 1).lineStyle(2, 0x4a3426, 1);
    g.fillRoundedRect(-17, -13, 34, 24, 10).strokeRoundedRect(-17, -13, 34, 24, 10);
    g.fillTriangle(-4, 10, 4, 10, 0, 17);
    g.lineBetween(-4, 11, 0, 17).lineBetween(4, 11, 0, 17);
    c.add([g, sc.add.text(0, -1, '💔', { fontSize: '14px' }).setOrigin(0.5)]);
    sc.tweens.add({ targets: c, scale: 1.12, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    return c;
  }

  private place(): void {
    if (!this.img) return;
    const p = this.scene.tileToWorld(this.x, this.y);
    this.img.setPosition(p.x, p.y + 16);
    this.img.setDepth(this.scene.depthAt(this.x, this.y) + 0.4);
    this.bubble?.setPosition(p.x + 4, p.y + 16 - this.img.displayHeight - 4).setDepth(this.img.depth + 1e5);
  }

  private walkTo(tx: number, ty: number, done?: () => void): void {
    if (!this.img) return;
    this.walking?.stop();
    const from = this.scene.tileToWorld(this.x, this.y).x;
    this.img.setFlipX(this.scene.tileToWorld(tx, ty).x > from);
    const dist = Math.hypot(tx - this.x, ty - this.y);
    this.walking = this.scene.tweens.add({
      targets: this,
      x: tx,
      y: ty,
      duration: Math.max(300, dist * 900),
      onUpdate: () => this.place(),
      onComplete: () => {
        this.walking = null;
        done?.();
      },
    });
    // A little hop as it trots.
    this.scene.tweens.add({ targets: this.img, scaleY: (1 / RES) * 0.92, duration: 180, yoyo: true, repeat: Math.floor(dist * 2) });
  }

  private wander(): void {
    if (!this.img || this.walking || modalOpen() || Math.random() < 0.4) return;
    const n = S.state.size;
    const tx = Math.max(1, Math.min(n - 1.5, this.x + (Math.random() - 0.5) * 4));
    const ty = Math.max(1, Math.min(n - 1.5, this.y + (Math.random() - 0.5) * 4));
    this.walkTo(tx, ty);
  }

  /** Trot off the farm (to a villager's home) and fade away. */
  leave(): void {
    if (!this.img) return;
    this.walking?.stop();
    this.walking = null;
    this.animal = '';
    const img = this.img;
    const bubble = this.bubble;
    this.img = null;
    this.bubble = null;
    bubble?.destroy();
    const sc = this.scene;
    sc.tweens.add({ targets: img, alpha: 0, x: img.x + 160, y: img.y + 80, duration: 2200, onComplete: () => img.destroy() });
  }

  clear(): void {
    this.walking?.stop();
    this.walking = null;
    this.animal = '';
    this.img?.destroy();
    this.bubble?.destroy();
    this.img = null;
    this.bubble = null;
    this.animal = '';
  }

  /** Where the animal is standing, for the hearts when it's adopted. */
  screenPos(): { x: number; y: number } | null {
    return this.img ? { x: this.img.x, y: this.img.y } : null;
  }

  /** A free tile near where it's standing. */
  spot(): { x: number; y: number } {
    return { x: Math.floor(this.x), y: Math.floor(this.y) };
  }
}

// ---------------------------------------------------------------------------
// Panels

function openLonely(x: number, y: number): void {
  const l = waiting();
  if (!l?.animal || !l.name) return;
  const def = ANIMALS[l.animal];
  const home = LONELY_HOMES[l.animal];
  const friend = home ? FRIENDS[home.who] : undefined;
  const kind = kindName(l.animal);
  const m = openModal(`A Lonely ${def.name.replace(/^Angora /, '')}`, { narrow: true });
  m.body.append(
    h(
      'div',
      { class: 'catch-card' },
      h('div', { class: 'catch-burst lo-burst' }, h('img', { class: 'catch-img', src: artURL(`animal:${l.animal}`) })),
      h('div', { class: 'catch-name' }, l.name),
      h('div', { class: 'catch-note' }, `This little ${kind} has lost their way and is looking for somewhere to belong. Will you help ${l.name} find a home?`),
    ),
    h(
      'div',
      { class: 'lo-choices' },
      h(
        'div',
        { class: 'lo-choice' },
        h('div', { class: 'lo-choice-em' }, '🏡'),
        h('div', { class: 'title' }, `Adopt ${l.name}`),
        h('div', { class: 'sub' }, `${l.name} settles in on your farm with a little ${ANIMALS[l.animal].product.replace(/_/g, ' ')} to say thank you.`),
        h('div', { class: 'lo-reward' }, h('img', { class: 'ico', src: iconURL('xp') }), ` +${ADOPT_XP} XP · free ${kind}`),
        h(
          'button',
          {
            class: 'btn green',
            onclick: () => {
              const at = layer?.spot() ?? { x: Math.floor(x), y: Math.floor(y) };
              if (S.dispatch({ type: 'adoptLonely', x: at.x, y: at.y })) m.close();
            },
          },
          '💕 Adopt',
        ),
      ),
      friend
        ? h(
            'div',
            { class: 'lo-choice' },
            portrait(friend.name, 44),
            h('div', { class: 'title' }, `Walk to ${friend.name}'s`),
            h('div', { class: 'sub' }, `${friend.name} has been hoping for a ${kind} of their own!`),
            h('div', { class: 'lo-reward' }, h('img', { class: 'ico', src: iconURL('coin') }), ` ${fmtNum(rehomeCoins(l.animal))} · +${REHOME_XP} XP · 🎁 · ♥`),
            h(
              'button',
              {
                class: 'btn',
                onclick: () => {
                  if (S.dispatch({ type: 'rehomeLonely' })) m.close();
                },
              },
              '🤝 Find a home',
            ),
          )
        : null,
    ),
  );
}

function adopted(e: Extract<GameEvent, { type: 'lonelyAdopted' }>): void {
  sfx.levelUp();
  confetti(50);
  const sc = layer?.scene;
  const obj = S.state.objects[e.id];
  if (sc && obj) {
    const p = sc.tileToWorld(obj.x + 0.5, obj.y + 0.5);
    sc.burst('fx:heart', 10, p.x, p.y - 20);
  }
  toast(`💕 ${e.name} the ${kindName(e.animal)} has a forever home on your farm!`, 'good');
}

function rehomed(e: Extract<GameEvent, { type: 'lonelyRehomed' }>): void {
  sfx.quest();
  const friend = FRIENDS[e.who];
  const line = LONELY_HOMES[e.animal]?.line ?? 'Thank you so much!';
  const m = openModal('A Happy Ending', { narrow: true });
  m.body.append(
    h(
      'div',
      { class: 'catch-card' },
      h('div', { class: 'tw-pitch' }, portrait(friend?.name ?? 'Mayor Maple', 56), h('div', { class: 'fr-say-bubble' }, h('div', { class: 'fr-say-name' }, friend?.name ?? ''), line)),
      h('div', { class: 'catch-note' }, `${e.name} trots happily off to ${friend?.name ?? 'town'}'s.`),
      h('div', { class: 'catch-meta' }, `+${fmtNum(e.coins)} coins · +${REHOME_XP} XP · 🎁 a mystery gift · ♥ friendship`),
      h('button', { class: 'btn green', onclick: () => m.close() }, 'Aww! 💕'),
    ),
  );
}
