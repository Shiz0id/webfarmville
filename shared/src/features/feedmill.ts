// Feeding animals (FarmVille 2). Feed is crafted at the Feed Mill from crops.
// A fed grown-up skips part of its current wait and gives a bonus at its next
// collection (one feeding per collection). A fed baby grows up sooner, and
// little ones can have as many snacks as you like.

import { FEEDS, FEED_LIST } from '../content/feedmill';
import { ANIMALS } from '../content/producers';
import { registerFeature } from '../logic/features';
import { producerStatus } from '../logic/status';
import { GameError, type FarmState, type ProducerObject } from '../types';
import { helpGrow, isBaby } from './nursery';

declare module '../types' {
  interface ProducerObject {
    /** The feed this grown-up animal was given, until its next collection. */
    fed?: string;
  }
  interface ExtraActions {
    feedAnimal: { type: 'feedAnimal'; id: string; feed?: string };
  }
  interface ExtraEvents {
    fedAnimal: { type: 'fedAnimal'; id: string; feed: string; baby: boolean; grown: boolean };
    feedBonus: { type: 'feedBonus'; id: string; item: string; qty: number };
  }
}

/** The feed you'd use by default: plain Barnyard Feed first, Deluxe if that's all you have. */
export function bestFeed(state: FarmState): string | null {
  return FEED_LIST.find((f) => (state.inventory[f.id] ?? 0) > 0)?.id ?? null;
}

export function feedCount(state: FarmState): number {
  return FEED_LIST.reduce((n, f) => n + (state.inventory[f.id] ?? 0), 0);
}

/** Can this animal be fed right now? */
export function canFeed(obj: ProducerObject | undefined, now: number): boolean {
  if (obj?.kind !== 'animal' || !ANIMALS[obj.def]) return false;
  return isBaby(obj, now) || !obj.fed;
}

registerFeature({
  id: 'feedmill',
  actions: {
    feedAnimal: (state, action: { id: string; feed?: string }, ctx, events, kit) => {
      const obj = kit.getObject(state, String(action.id));
      if (obj.kind !== 'animal') throw new GameError('Only animals eat feed');
      const feedId = action.feed === undefined ? bestFeed(state) : String(action.feed);
      if (!feedId) throw new GameError('You have no animal feed. Make some at the Feed Mill!');
      const feed = Object.hasOwn(FEEDS, feedId) ? FEEDS[feedId] : undefined;
      if (!feed) throw new GameError("That isn't animal feed");
      const baby = isBaby(obj, ctx.now);
      if (!baby && obj.fed) throw new GameError('Already fed! Collect first, then feed again.');
      kit.takeItem(state, feed.id, 1);
      let grown = false;
      if (baby) {
        grown = helpGrow(state, obj, feed.babySkip, ctx.now);
      } else {
        obj.fed = feed.id;
        const cycle = ANIMALS[obj.def].cycleSec * 1000;
        if (!producerStatus(obj, ctx.now).ready) obj.cycleStart = Math.max(obj.cycleStart - cycle * feed.skip, ctx.now - cycle);
      }
      kit.bumpStat(state, 'feed');
      events.push({ type: 'fedAnimal', id: obj.id, feed: feed.id, baby, grown });
    },
  },
  // A fed animal gives its bonus when collected.
  after: (state, action, _ctx, events, kit) => {
    if (action.type !== 'collect') return;
    const obj = state.objects[(action as { id: string }).id];
    if (obj?.kind !== 'animal' || !obj.fed) return;
    const feed = FEEDS[obj.fed];
    delete obj.fed;
    const def = ANIMALS[obj.def];
    if (!feed || !def) return;
    kit.addItem(state, def.product, feed.bonus, events, kit.centerOf(obj));
    kit.bumpStat(state, 'feedBonus', feed.bonus);
    events.push({ type: 'feedBonus', id: obj.id, item: def.product, qty: feed.bonus });
  },
});
