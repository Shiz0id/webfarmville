// Collections on the client: little treasures popping out of harvests, the
// Collectibles tab in the Collections panel (sets, swaps and turn-ins), and a
// celebration when a set is turned in.

import Phaser from 'phaser';
import {
  COLLECTIBLES,
  COLLECTION_LIST,
  COLLECTIONS,
  CROPS,
  DECORATIONS,
  SWAP_COST,
  canTrade,
  collectibleCount,
  setProgress,
  sparesIn,
  tradesDone,
  type CollectionDef,
  type GameEvent,
} from '@farm/shared';
import { RES, artURL, hasArt, iconURL, texture } from '../art';
import { sfx } from '../sfx';
import { confetti, openModal, toast } from '../ui/dom';
import { fmtNum, h } from '../util';
import type { FarmScene } from '../scenes/FarmScene';
import type { Store } from '../store';
import { addCatalogTab, type FeatureContext } from './registry';

let S: Store;
let scene: FarmScene | null = null;

/** A collectible's icon: painted art when it exists, its emoji otherwise. */
export function collectibleIcon(id: string, cls = 'cl-ico'): HTMLElement {
  const key = `icon:${id}`;
  return hasArt(key) ? h('img', { class: cls, src: artURL(key) }) : h('span', { class: `${cls} cl-emoji` }, COLLECTIBLES[id]?.emoji ?? '🎁');
}

/** A keepsake's sprite, or a little gift box until it's painted. */
function keepsakeImg(id: string, cls: string): HTMLElement {
  const key = `deco:${id}`;
  return hasArt(key) ? h('img', { class: cls, src: artURL(key), title: DECORATIONS[id]?.name }) : h('span', { class: `${cls} cl-emoji`, title: DECORATIONS[id]?.name }, '🎁');
}

const tradeable = () => COLLECTION_LIST.filter((c) => canTrade(S.state, c.id)).length;

export function init(ctx: FeatureContext): void {
  S = ctx.store;
  addCatalogTab({ id: 'collectibles', label: '🐞 Collectibles', render: renderSets, badge: () => (S.visit ? 0 : tradeable()) });
  ctx.onScene((s) => (scene = s));
  S.onEvents((events) => {
    for (const e of events) {
      if (e.type === 'collectible') found(e);
      else if (e.type === 'collectionTraded') setTimeout(() => traded(e), 200);
      else if (e.type === 'collectibleSwapped') {
        sfx.coin();
        toast(`🤝 The villagers swapped you a ${COLLECTIBLES[e.item]?.name}!`, 'good');
      }
    }
  });
}

function found(e: Extract<GameEvent, { type: 'collectible' }>): void {
  const item = COLLECTIBLES[e.item];
  const col = COLLECTIONS[e.collection];
  if (!item || !col) return;
  sfx.pop();
  setTimeout(() => sfx.quest(), 200);
  const have = setProgress(S.state, col);
  toast(`${item.emoji} Found a ${item.name}${e.first ? ' (new!)' : ''} · ${col.name} ${have}/5`, 'good');
  if (have === col.items.length && e.first) setTimeout(() => toast(`🎉 Your ${col.name} collection is complete! Turn it in from Collections.`, 'good'), 900);
  if (scene && e.x !== undefined && e.y !== undefined) floatUp(scene, e.item, e.x, e.y);
}

/** The treasure bounces up out of the soil with a sparkle. */
function floatUp(sc: FarmScene, id: string, x: number, y: number): void {
  const p = sc.tileToWorld(x, y);
  const key = `icon:${id}`;
  const obj: Phaser.GameObjects.Image | Phaser.GameObjects.Text = hasArt(key)
    ? sc.add.image(p.x, p.y - 30, texture(sc, key)).setScale(0.75 / RES)
    : sc.add.text(p.x, p.y - 30, COLLECTIBLES[id]?.emoji ?? '🎁', { fontSize: '26px' }).setOrigin(0.5);
  obj.setDepth(1e6).setAlpha(0);
  sc.burst('fx:sparkle', 8, p.x, p.y - 30);
  sc.tweens.add({
    targets: obj,
    alpha: 1,
    y: p.y - 70,
    duration: 420,
    ease: 'Back.easeOut',
    onComplete: () => sc.tweens.add({ targets: obj, y: p.y - 92, alpha: 0, delay: 900, duration: 600, onComplete: () => obj.destroy() }),
  });
}

function sources(col: CollectionDef): HTMLElement {
  return h(
    'div',
    { class: 'cl-sources', title: 'Turns up from these' },
    'From ',
    ...col.sources.map((s) =>
      s === 'tree' || s === 'animal'
        ? h('span', { class: 'cl-src' }, s === 'tree' ? '🌳 any tree' : '🐾 any animal')
        : h('img', { class: 'cl-src-ico', src: iconURL(s), title: CROPS[s]?.name ?? s }),
    ),
  );
}

function renderSets(body: HTMLElement): void {
  const st = S.state;
  const sets = COLLECTION_LIST.length;
  const done = COLLECTION_LIST.filter((c) => tradesDone(st, c.id) > 0).length;
  body.append(
    h(
      'div',
      { class: 'row cl-head' },
      h('div', { style: { fontSize: '34px' } }, '🐞'),
      h(
        'div',
        { class: 'grow' },
        h('div', { class: 'title' }, `${done} / ${sets} collections completed`),
        h('div', { class: 'sub' }, `Little treasures turn up while you harvest and collect. Find all five to turn a set in. Got spares? The villagers will swap ${SWAP_COST} of them for a piece you're missing.`),
        h('div', { class: 'progress' }, h('div', { style: { width: `${(done / sets) * 100}%` } })),
      ),
    ),
  );
  for (const col of COLLECTION_LIST) {
    const ready = canTrade(st, col.id);
    const spares = sparesIn(st, col);
    const trades = tradesDone(st, col.id);
    const keepsake = DECORATIONS[col.keepsake];
    const slots = h(
      'div',
      { class: 'cl-slots' },
      ...col.items.map((i) => {
        const n = collectibleCount(st, i.id);
        const seen = n > 0 || !!st.stats[`found:${i.id}`];
        const canSwap = n === 0 && spares >= SWAP_COST;
        return h(
          'div',
          { class: `cl-slot${n ? ' have' : ''}`, title: seen ? i.name : 'Not found yet' },
          n > 1 ? h('span', { class: 'cl-count' }, `×${n}`) : null,
          seen ? collectibleIcon(i.id) : h('span', { class: 'cl-ico cl-emoji cl-unknown' }, '?'),
          h('div', { class: 'cl-name' }, seen ? i.name : '???'),
          canSwap ? h('button', { class: 'btn small', onclick: () => S.dispatch({ type: 'swapCollectible', item: i.id }) }, `Swap ${SWAP_COST} spares`) : null,
        );
      }),
    );
    body.append(
      h(
        'div',
        { class: `cl-set${ready ? ' ready' : ''}` },
        h(
          'div',
          { class: 'cl-top' },
          h('div', { class: 'cl-em' }, col.emoji),
          h('div', { class: 'grow' }, h('div', { class: 'title' }, col.name, trades ? h('span', { class: 'cl-trades' }, `turned in ×${trades}`) : null), h('div', { class: 'sub' }, col.blurb), sources(col)),
          h(
            'div',
            { class: 'cl-reward', title: trades ? 'Reward for each set' : `First set also gives the ${keepsake?.name}` },
            h('div', null, h('img', { class: 'ico', src: iconURL('coin') }), fmtNum(col.reward.coins)),
            h('div', null, h('img', { class: 'ico', src: iconURL('xp') }), fmtNum(col.reward.xp)),
            h('div', null, '🎁 ×1'),
            !trades && keepsake ? keepsakeImg(keepsake.id, 'cl-keepsake') : null,
          ),
        ),
        slots,
        h(
          'div',
          { class: 'cl-foot' },
          h('span', { class: 'sub' }, `${setProgress(st, col)} / ${col.items.length} found${spares ? ` · ${spares} spare${spares === 1 ? '' : 's'}` : ''}`),
          h(
            'button',
            { class: `btn${ready ? ' gold pulse' : ''}`, disabled: !ready || !!S.visit, onclick: () => S.dispatch({ type: 'tradeCollection', collection: col.id }) },
            ready ? 'Turn in set! 🎉' : 'Turn in set',
          ),
        ),
      ),
    );
  }
}

function traded(e: Extract<GameEvent, { type: 'collectionTraded' }>): void {
  const col = COLLECTIONS[e.collection];
  if (!col) return;
  sfx.levelUp();
  confetti(e.keepsake ? 120 : 60);
  const keepsake = e.keepsake ? DECORATIONS[e.keepsake] : undefined;
  const m = openModal('Collection Complete!', { narrow: true });
  m.body.append(
    h(
      'div',
      { class: 'catch-card' },
      h('div', { class: `catch-burst${keepsake ? ' r5' : ' r4'}` }, keepsake && hasArt(`deco:${keepsake.id}`) ? keepsakeImg(keepsake.id, 'catch-img') : h('div', { class: 'cl-big-em' }, col.emoji)),
      h('div', { class: 'catch-name' }, col.name),
      h('div', { class: 'cl-row-icons' }, ...col.items.map((i) => collectibleIcon(i.id))),
      h('div', { class: 'catch-note' }, keepsake ? `The ${keepsake.name} is in your barn. Place it from Store!` : 'The villagers are thrilled with your treasures!'),
      h('div', { class: 'catch-meta' }, `+${fmtNum(e.coins)} coins · +${fmtNum(e.xp)} XP · 🎁 a mystery gift`),
      h('button', { class: 'btn green', onclick: () => m.close() }, 'Wonderful! 🧺'),
    ),
  );
}
