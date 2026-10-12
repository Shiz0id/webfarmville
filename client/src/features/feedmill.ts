// Feeding animals on the client: tap a hungry grown-up to feed it (babies are
// fed by the nursery module when they're napping), crumbs and a bonus float
// when it pays off, and a "feed everyone" button in the Feed Mill's panel.

import {
  ANIMALS,
  FEEDS,
  FEED_MILL,
  bestFeed,
  canFeed,
  feedCount,
  isBaby,
  producerStatus,
  type BuildingObject,
  type GameEvent,
  type ProducerObject,
} from '@farm/shared';
import { borrowArt, iconURL } from '../art';
import { bus } from '../bus';
import { sfx } from '../sfx';
import { toast } from '../ui/dom';
import { h, nameOf } from '../util';
import type { FarmScene } from '../scenes/FarmScene';
import type { Store } from '../store';
import { addBuildingSection, type FeatureContext } from './registry';

// Until they're painted: a meadow-green Windmill and recoloured flour sacks.
borrowArt(`building:${FEED_MILL}`, 'building:mill', '#6fbf4a');
borrowArt('icon:animal_feed', 'icon:flour', '#9ccc4a');
borrowArt('icon:deluxe_feed', 'icon:cornmeal', '#ff8fb1');

let S: Store;
let scene: FarmScene | null = null;

/** Grown-ups who'd love a snack right now. */
function hungry(): ProducerObject[] {
  const now = S.now();
  return Object.values(S.state.objects).filter(
    (o): o is ProducerObject => o.kind === 'animal' && !isBaby(o, now) && canFeed(o, now) && !producerStatus(o, now).ready,
  );
}

export function init(ctx: FeatureContext): void {
  S = ctx.store;
  ctx.onScene((s) => (scene = s));
  bus.on('producerClick', (id: string) => {
    const obj = S.state.objects[id];
    const now = S.now();
    if (obj?.kind !== 'animal' || isBaby(obj, now)) return;
    const name = ANIMALS[obj.def]?.name.toLowerCase() ?? 'animal';
    if (obj.fed) return toast(`🌾 This ${name} has had a snack. Collect it for a little extra!`);
    if (!bestFeed(S.state)) {
      const hasMill = Object.values(S.state.objects).some((o) => o.kind === 'building' && o.def === FEED_MILL);
      return toast(hasMill ? '🌾 Out of feed! Make Barnyard Feed at your Feed Mill.' : `🌾 This ${name} is busy. A Feed Mill (Market › Buildings) makes feed that speeds animals up.`);
    }
    S.dispatch({ type: 'feedAnimal', id });
  });
  S.onEvents((events) => {
    for (const e of events) {
      if (e.type === 'fedAnimal') fed(e);
      else if (e.type === 'feedBonus') bonus(e);
    }
  });
  addBuildingSection({ id: 'feedmill', render: renderMillSection });
}

function at(id: string): { x: number; y: number } | null {
  const obj = S.state.objects[id];
  if (!obj || !scene) return null;
  return scene.tileToWorld(obj.x + 0.5, obj.y + 0.5);
}

function fed(e: Extract<GameEvent, { type: 'fedAnimal' }>): void {
  const p = at(e.id);
  if (p && scene) scene.burst(scene.textures.exists('fx:sparkle') ? 'fx:sparkle' : 'fx:heart', 5, p.x, p.y - 12);
  sfx.plop();
}

function bonus(e: Extract<GameEvent, { type: 'feedBonus' }>): void {
  const p = at(e.id);
  if (p && scene) scene.burst('fx:heart', 3, p.x, p.y - 24);
}

function renderMillSection(body: HTMLElement, b: BuildingObject): void {
  if (b.def !== FEED_MILL) return;
  const list = hungry();
  const have = feedCount(S.state);
  body.append(
    h('div', { class: 'section-title' }, 'Feeding time'),
    h(
      'div',
      { class: 'fm-feed' },
      h(
        'div',
        { class: 'fm-sacks' },
        ...Object.values(FEEDS).map((f) =>
          h('span', { class: 'fm-sack', title: f.name }, h('img', { class: 'ico', src: iconURL(f.id) }), `${S.state.inventory[f.id] ?? 0}`),
        ),
      ),
      h(
        'div',
        { class: 'fm-text' },
        `Tap a busy animal to feed it: ${nameOf('animal_feed')} skips a quarter of its wait and adds +1 to its next collection (Deluxe: half and +2). Babies grow up faster with every snack.`,
      ),
      h(
        'button',
        {
          class: 'btn green',
          disabled: !list.length || !have,
          onclick: () => {
            let n = 0;
            for (const o of hungry()) {
              if (!bestFeed(S.state)) break;
              if (S.dispatch({ type: 'feedAnimal', id: o.id }, { quiet: true })) n++;
            }
            if (n) toast(`🌾 Fed ${n} hungry animal${n === 1 ? '' : 's'}!`, 'good');
          },
        },
        !have ? '🌾 No feed yet' : list.length ? `🌾 Feed hungry animals (${Math.min(list.length, have)})` : '🌾 Everyone is fed',
      ),
    ),
  );
}
