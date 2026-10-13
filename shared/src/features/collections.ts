// Collections (FarmVille 1). Harvests and collections sometimes turn up a
// collectible; fill a set of five and turn it in for coins, XP and a mystery
// gift (plus a keepsake decoration the first time). Three spares from a set
// can be swapped with the villagers for a piece you're missing.

import {
  COLLECTIBLES,
  COLLECTIBLE_CHANCE,
  COLLECTIBLE_WEIGHTS,
  COLLECTIONS,
  SWAP_COST,
  TRADE_GIFTS,
  collectionsFor,
  type CollectionDef,
} from '../content/collections';
import { CROPS } from '../content/crops';
import { MYSTERY_GIFT } from '../content/orders';
import { registerFeature, type FeatureKit } from '../logic/features';
import { GameError, type FarmState, type GameEvent } from '../types';

export interface CollectionsState {
  /** Collectible id -> how many you hold. */
  have: Record<string, number>;
  /** Collection id -> sets turned in. */
  traded: Record<string, number>;
}

declare module '../types' {
  interface FarmState {
    collections?: CollectionsState;
  }
  interface ExtraActions {
    tradeCollection: { type: 'tradeCollection'; collection: string };
    swapCollectible: { type: 'swapCollectible'; item: string };
  }
  interface ExtraEvents {
    collectible: { type: 'collectible'; item: string; collection: string; first: boolean; x?: number; y?: number };
    collectionTraded: { type: 'collectionTraded'; collection: string; coins: number; xp: number; keepsake?: string };
    collectibleSwapped: { type: 'collectibleSwapped'; item: string };
  }
}

function cols(state: FarmState): CollectionsState {
  return (state.collections ??= { have: {}, traded: {} });
}

export function collectibleCount(state: FarmState, item: string): number {
  return state.collections?.have[item] ?? 0;
}

/** Pieces of a set you hold at least one of. */
export function setProgress(state: FarmState, col: CollectionDef): number {
  return col.items.filter((i) => collectibleCount(state, i.id) > 0).length;
}

export function canTrade(state: FarmState, collection: string): boolean {
  const col = COLLECTIONS[collection];
  return !!col && setProgress(state, col) === col.items.length;
}

/** Spare pieces (beyond the first of each) in a set. */
export function sparesIn(state: FarmState, col: CollectionDef): number {
  return col.items.reduce((n, i) => n + Math.max(0, collectibleCount(state, i.id) - 1), 0);
}

export function tradesDone(state: FarmState, collection: string): number {
  return state.collections?.traded[collection] ?? 0;
}

function roll(state: FarmState, source: string, kind: 'tree' | 'animal' | undefined, at: { x: number; y: number } | undefined, events: GameEvent[], kit: FeatureKit): void {
  const options = collectionsFor(source, kind);
  if (!options.length || kit.nextRandom(state) >= COLLECTIBLE_CHANCE) return;
  const col = options[Math.floor(kit.nextRandom(state) * options.length) % options.length];
  const total = COLLECTIBLE_WEIGHTS.reduce((a, b) => a + b, 0);
  let r = kit.nextRandom(state) * total;
  let idx = 0;
  while (idx < col.items.length - 1 && r >= COLLECTIBLE_WEIGHTS[idx]) r -= COLLECTIBLE_WEIGHTS[idx++];
  const item = col.items[idx].id;
  const c = cols(state);
  const first = !state.stats[`found:${item}`];
  c.have[item] = (c.have[item] ?? 0) + 1;
  state.stats[`found:${item}`] = 1;
  kit.bumpStat(state, 'collectible');
  events.push({ type: 'collectible', item, collection: col.id, first, ...at });
}

registerFeature({
  id: 'collections',
  migrate: (state) => void cols(state),
  actions: {
    tradeCollection: (state, action: { collection: string }, _ctx, events, kit) => {
      const col = Object.hasOwn(COLLECTIONS, String(action.collection)) ? COLLECTIONS[String(action.collection)] : undefined;
      if (!col) throw new GameError('Unknown collection');
      if (!canTrade(state, col.id)) throw new GameError(`Your ${col.name} collection isn't complete yet`);
      const c = cols(state);
      for (const i of col.items) {
        if (c.have[i.id] === 1) delete c.have[i.id];
        else c.have[i.id]--;
      }
      const first = !c.traded[col.id];
      c.traded[col.id] = (c.traded[col.id] ?? 0) + 1;
      kit.earn(state, col.reward.coins, events);
      kit.addXp(state, col.reward.xp, events);
      kit.addItem(state, MYSTERY_GIFT, TRADE_GIFTS, events);
      if (first) kit.addItem(state, col.keepsake, 1, events);
      kit.bumpStat(state, 'collectionTrade');
      events.push({ type: 'collectionTraded', collection: col.id, coins: col.reward.coins, xp: col.reward.xp, ...(first ? { keepsake: col.keepsake } : {}) });
    },
    swapCollectible: (state, action: { item: string }, _ctx, events, kit) => {
      const want = Object.hasOwn(COLLECTIBLES, String(action.item)) ? COLLECTIBLES[String(action.item)] : undefined;
      if (!want) throw new GameError('Unknown collectible');
      const col = COLLECTIONS[want.collection];
      if (collectibleCount(state, want.id) > 0) throw new GameError(`You already have a ${want.name}`);
      if (sparesIn(state, col) < SWAP_COST) throw new GameError(`The villagers want ${SWAP_COST} spare ${col.name} pieces for it`);
      const c = cols(state);
      // Give away the most plentiful spares first.
      for (let n = 0; n < SWAP_COST; n++) {
        const spare = col.items.reduce((best, i) => (collectibleCount(state, i.id) > collectibleCount(state, best.id) ? i : best));
        c.have[spare.id]--;
      }
      c.have[want.id] = 1;
      state.stats[`found:${want.id}`] = 1;
      kit.bumpStat(state, 'collectibleSwap');
      events.push({ type: 'collectibleSwapped', item: want.id });
    },
  },
  after: (state, action: { type: string; id?: string }, _ctx, events, kit) => {
    if (action.type === 'harvest') {
      const got = events.find((e): e is Extract<GameEvent, { type: 'gain' }> => e.type === 'gain' && Object.hasOwn(CROPS, e.what));
      if (got) roll(state, got.what, undefined, got.x !== undefined ? { x: got.x, y: got.y! } : undefined, events, kit);
    } else if (action.type === 'collect' && action.id) {
      const obj = state.objects[action.id];
      if (obj?.kind === 'tree' || obj?.kind === 'animal') roll(state, obj.def, obj.kind, kit.centerOf(obj), events, kit);
    }
  },
});
