// Flower cross-breeding on the client: tap a tulip or rose with the hand tool
// to water it, watch new flowers sprout beside their parents, and keep track
// of every hybrid (with villagers' hints for the ones still to find) in the
// Flower Album.

import Phaser from 'phaser';
import {
  BLOOMS,
  BLOOM_LIST,
  DECORATIONS,
  FLORIST_AT,
  HYBRIDS,
  WEATHER,
  hybridsFound,
  isBloom,
  isWatered,
  nextBloomAt,
  recipeOf,
  weatherAt,
  type GameEvent,
} from '@farm/shared';
import { artURL, hasArt, texture } from '../art';
import { bus } from '../bus';
import { sfx } from '../sfx';
import { confetti, openModal, toast } from '../ui/dom';
import { portrait } from '../ui/villager';
import { h } from '../util';
import type { FarmScene } from '../scenes/FarmScene';
import type { Store } from '../store';
import { addHudButton, type FeatureContext } from './registry';

let S: Store;
let scene: FarmScene | null = null;

const deco = (id: string) => (hasArt(`deco:${id}`) ? artURL(`deco:${id}`) : '');
const nameOfBloom = (id: string) => DECORATIONS[id]?.name ?? id;

export function init(ctx: FeatureContext): void {
  S = ctx.store;
  addHudButton({
    id: 'blooms',
    em: '🌷',
    label: 'Flowers',
    where: 'corner',
    onClick: openAlbum,
    hideWhileVisiting: true,
  });

  bus.on('decoClick', (id: string, def: string) => {
    if (!BLOOMS[def]) return;
    if (isWatered(S.state, id, S.now())) {
      toast(WEATHER[weatherAt(S.now())].wet ? '🌧️ The rain is watering your flowers today.' : '💧 Already watered. Check back later!');
      return;
    }
    S.dispatch({ type: 'waterFlower', id });
  });

  S.onEvents((events) => {
    const sprouts: Extract<GameEvent, { type: 'bloomed' }>[] = [];
    for (const e of events) {
      if (e.type === 'wateredFlower') {
        sfx.splash();
        splash(e.id);
      }
      if (e.type === 'bloomed') sprouts.push(e);
      if (e.type === 'florist') setTimeout(showFlorist, 900);
    }
    if (!sprouts.length) return;
    for (const e of sprouts) sparkle(e);
    const first = sprouts.find((e) => e.first);
    if (first) setTimeout(() => showHybrid(first.def), 500);
    else {
      sfx.plant();
      const hy = sprouts.find((e) => e.hybrid);
      toast(
        hy
          ? `🌸 ${nameOfBloom(hy.def)} sprouted in your garden!`
          : sprouts.length > 1
            ? `🌱 ${sprouts.length} new flowers sprouted in your garden!`
            : `🌱 A new ${nameOfBloom(sprouts[0].def)} sprouted!`,
        'good',
      );
    }
  });

  // Four times a day the garden checks for new sprouts.
  const check = () => {
    if (!S.visit) S.dispatch({ type: 'bloomCheck' }, { quiet: true });
  };
  ctx.onScene((s) => {
    scene = s;
    new DewLayer(s);
    setTimeout(check, 3000);
  });
  setInterval(check, 60_000);
}

function splash(id: string): void {
  const obj = S.state.objects[id];
  if (!scene || !obj) return;
  const p = scene.tileToWorld(obj.x + 0.5, obj.y + 0.5);
  scene.burst('wx:droplet', 7, p.x, p.y - 10);
}

function sparkle(e: { x: number; y: number; hybrid: boolean }): void {
  if (!scene) return;
  const p = scene.tileToWorld(e.x + 0.5, e.y + 0.5);
  scene.burst('fx:sparkle', e.hybrid ? 14 : 8, p.x, p.y - 8);
  if (e.hybrid) scene.burst('fx:heart', 6, p.x, p.y - 8);
}

/** A tiny dewdrop bobbing over each flower you've watered this period. */
class DewLayer {
  private drops: Phaser.GameObjects.Image[] = [];
  private sig = '';

  constructor(private scene: FarmScene) {
    scene.time.addEvent({ delay: 5000, loop: true, callback: () => this.sync() });
    S.onChange(() => this.sync());
    this.sync();
  }

  private sync(): void {
    const now = S.now();
    const rainy = !!WEATHER[weatherAt(now)].wet;
    const list = S.visit || rainy ? [] : Object.values(S.state.objects).filter((o) => isBloom(o) && isWatered(S.state, o.id, now));
    const sig = list.map((o) => `${o.id}@${o.x},${o.y}`).join('|');
    if (sig === this.sig) return;
    this.sig = sig;
    for (const d of this.drops) d.destroy();
    this.drops = [];
    for (const o of list) {
      const p = this.scene.tileToWorld(o.x + 0.5, o.y + 0.5);
      const img = this.scene.add
        .image(p.x + 12, p.y - 36, texture(this.scene, 'wx:droplet'))
        .setScale(0.42)
        .setDepth(this.scene.depthAt(o.x, o.y) + 40);
      this.scene.tweens.add({ targets: img, y: img.y - 4, duration: 1100 + (o.x * 37 + o.y * 53) % 400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      this.drops.push(img);
    }
  }
}

// ---------------------------------------------------------------------------
// The Flower Album

function countdown(ms: number): string {
  const m = Math.max(1, Math.ceil(ms / 60000));
  return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m`;
}

function openAlbum(): void {
  let off = () => {};
  const m = openModal('Flower Album', { icon: hasArt('icon:blooms') ? artURL('icon:blooms') : undefined, onClose: () => off() });
  const render = () => {
    const st = S.state;
    const now = S.now();
    const found = hybridsFound(st);
    const garden = Object.values(st.objects).filter(isBloom);
    const watered = garden.filter((o) => isWatered(st, o.id, now)).length;
    const wet = !!WEATHER[weatherAt(now)].wet;
    const goal = Math.min(FLORIST_AT, HYBRIDS.length);
    const head = h(
      'div',
      { class: 'journal-head' },
      h(
        'div',
        { class: 'grow' },
        h('div', { class: 'title' }, `${found.length} / ${HYBRIDS.length} hybrids discovered`),
        h(
          'div',
          { class: 'sub' },
          garden.length
            ? `${garden.length} tulips & roses in your garden · ${wet ? '🌧️ the rain is watering them all' : `💧 ${watered} watered`} · next sprouting in ${countdown(nextBloomAt(now) - now)}`
            : 'Plant tulips or roses next to each other to start breeding!',
        ),
      ),
      st.blooms?.florist
        ? h('div', { class: 'sub' }, "🛒 Florist's Cart earned!")
        : h(
            'div',
            { class: 'journal-reward' },
            deco('florist_cart') ? h('img', { class: 'ico big', src: deco('florist_cart') }) : null,
            h(
              'div',
              null,
              h('div', { class: 'sub' }, `Breed ${goal}: Florist's Cart`),
              h('div', { class: 'xpbar' }, h('div', { style: { width: `${Math.min(100, (found.length / goal) * 100)}%` } })),
            ),
          ),
    );
    const how = h(
      'div',
      { class: 'bl-how' },
      h('b', null, 'How it works: '),
      'Tulips and roses next to their own kind may sprout a new flower on a free tile beside them, four times a day. Tap a flower with the hand ✋ to water it and it is much more likely to breed. The right colour pairs can bloom into rare hybrids!',
    );
    const card = (id: string) => {
      const b = BLOOMS[id];
      const name = nameOfBloom(id);
      const n = garden.filter((o) => o.def === id).length;
      if (!b.hybrid)
        return h('div', { class: 'journal-card bl-card' }, h('img', { src: deco(id) }), h('div', { class: 'name' }, name), h('div', { class: 'when' }, n ? `${n} in your garden` : 'Buy in Market › Decor'));
      const r = recipeOf(id)!;
      const known = found.includes(id);
      const rare = r.odds <= 0.25 ? ' r5' : r.odds <= 0.4 ? ' r4' : ' r3';
      if (known)
        return h(
          'div',
          { class: `journal-card bl-card${rare}` },
          h('img', { src: deco(id) }),
          h('div', { class: 'name' }, name),
          h('div', { class: 'when' }, `${nameOfBloom(r.a)} + ${nameOfBloom(r.b)}${r.wet ? ' · in the rain' : ''}`),
          h('div', { class: 'meta' }, n ? `${n} in your garden` : 'Stored in your barn'),
        );
      return h(
        'div',
        { class: 'journal-card bl-card unknown bl-hint' },
        h('img', { class: 'silhouette', src: deco(id) }),
        h('div', { class: 'name' }, '???'),
        h('div', { class: 'bl-hint-row' }, portrait(r.hinter, 26), h('div', { class: 'bl-hint-text' }, `“${r.hint}”`)),
      );
    };
    const tulips = BLOOM_LIST.filter((b) => b.species === 'tulips').map((b) => card(b.id));
    const roses = BLOOM_LIST.filter((b) => b.species === 'roses').map((b) => card(b.id));
    m.body.replaceChildren(
      head,
      how,
      h('div', { class: 'tw-sub-title' }, '🌷 Tulips'),
      h('div', { class: 'journal-grid bl-grid' }, ...tulips),
      h('div', { class: 'tw-sub-title' }, '🌹 Roses'),
      h('div', { class: 'journal-grid bl-grid' }, ...roses),
    );
  };
  render();
  off = S.onChange(render);
}

function showHybrid(id: string): void {
  sfx.catch();
  confetti(60);
  const r = recipeOf(id);
  const m = openModal('A new flower bloomed!', { narrow: true });
  m.body.append(
    h(
      'div',
      { class: 'catch-card' },
      h('div', { class: `catch-burst ${r && r.odds <= 0.25 ? 'r5' : 'r4'}` }, h('img', { src: deco(id) })),
      h('div', { class: 'catch-name' }, nameOfBloom(id)),
      h('div', { class: 'catch-note' }, r ? `Your ${nameOfBloom(r.a)} and ${nameOfBloom(r.b)} cross-pollinated into something brand new!` : 'Something brand new sprouted!'),
      h('div', { class: 'catch-note' }, `It's been added to your Flower Album (${hybridsFound(S.state).length} / ${HYBRIDS.length}).`),
      h('button', { class: 'btn green', onclick: () => m.close() }, 'How lovely! 🌸'),
    ),
  );
}

function showFlorist(): void {
  sfx.levelUp();
  confetti(100);
  toast("🛒 You've bred five hybrids! A Florist's Cart was sent to your barn.", 'good');
}
