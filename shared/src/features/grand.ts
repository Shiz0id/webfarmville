// Grand Projects: fund a landmark stage by stage, then enjoy its perk while it
// stands on your farm. The first finished stage hands you the landmark to
// place (from storage); the perks hook in after other actions, like the town's.

import { findRecipe } from '../content/buildings';
import { LANDMARKS, grandDone, type GrandProgress, type GrandState } from '../content/grand';
import { ITEMS } from '../content/items';
import { MYSTERY_GIFT } from '../content/orders';
import { registerFeature } from '../logic/features';
import { GameError, type FarmState, type GameEvent } from '../types';

declare module '../types' {
  interface ExtraActions {
    grandDonate: { type: 'grandDonate'; landmark: string; item: string; qty: number };
    balloonGift: { type: 'balloonGift'; id: string };
  }
  interface ExtraEvents {
    grandStage: { type: 'grandStage'; landmark: string; stage: number };
    balloonGift: { type: 'balloonGift'; coins: number; items: Record<string, number> };
  }
}

/** Bonus crop chance per harvest with the Glass Greenhouse. */
export const GREENHOUSE_CHANCE = 0.25;
/** How much craft time the Lighthouse Windmill saves. */
export const WINDMILL_SPEEDUP = 0.25;
/** Extra coins from sales and orders with the Botanical Conservatory. */
export const CONSERVATORY_BONUS = 0.1;
/** What the balloon might bring back from the city. */
const BALLOON_GOODS = ['bread', 'cheese', 'marmalade', 'yarn', 'lemonade', 'pancakes', 'latte', 'cotton_cloth', 'goat_cheese', 'grape_juice', 'butter', 'cherry_jam'];

function grand(state: FarmState): GrandState {
  return (state.grand ??= { projects: {} });
}

function progress(state: FarmState, id: string): GrandProgress {
  return (grand(state).projects[id] ??= { stage: 0, given: {} });
}

/** How many more of `item` a landmark's next stage needs (0 when finished or not asked for). */
export function grandStillNeeded(state: FarmState, id: string, item: string): number {
  const l = LANDMARKS[id];
  const p = state.grand?.projects[id];
  const stage = l?.stages[p?.stage ?? 0];
  if (!stage || !Object.hasOwn(stage.needs, item)) return 0;
  return Math.max(0, stage.needs[item] - (p?.given[item] ?? 0));
}

/** Can the player give anything toward this landmark right now? */
export function canGrandDonate(state: FarmState, id: string): boolean {
  const l = LANDMARKS[id];
  const stage = l?.stages[state.grand?.projects[id]?.stage ?? 0];
  if (!stage || state.level < l.level) return false;
  return Object.keys(stage.needs).some((item) => grandStillNeeded(state, id, item) > 0 && (item === 'coins' ? state.coins : (state.inventory[item] ?? 0)) > 0);
}

/** Coins from a sale or order on this farm, with the Botanical Conservatory's bonus on top. */
export function grandSaleCoins(state: FarmState, coins: number): number {
  return grandDone(state, 'botanical_conservatory') ? coins + Math.round(coins * CONSERVATORY_BONUS) : coins;
}

/** A recipe's craft time on this farm, after the Lighthouse Windmill's speed-up. */
export function grandCraftMs(state: FarmState, ms: number): number {
  return grandDone(state, 'lighthouse_windmill') ? ms - Math.round(ms * WINDMILL_SPEEDUP) : ms;
}

/** When the balloon's next gift can be collected: today (ready) or not at all. */
export function balloonReady(state: FarmState, day: string): boolean {
  return grandDone(state, 'balloon_dock') && state.grand?.giftDay !== day;
}

const coinsGained = (events: GameEvent[]) =>
  events.reduce((t, e) => (e.type === 'gain' && e.what === 'coins' ? t + e.amount : t), 0);

registerFeature({
  id: 'grand',
  actions: {
    grandDonate: (state, action: { landmark: string; item: string; qty: number }, _ctx, events, kit) => {
      const id = String(action.landmark);
      const l = Object.hasOwn(LANDMARKS, id) ? LANDMARKS[id] : undefined;
      if (!l) throw new GameError('Unknown project');
      if (state.level < l.level) throw new GameError(`${l.name} starts at level ${l.level}`);
      const p = progress(state, id);
      if (p.stage >= l.stages.length) throw new GameError(`${l.name} is finished!`);
      const item = String(action.item);
      const left = grandStillNeeded(state, id, item);
      if (!left) throw new GameError("That isn't needed");
      const qty = Number(action.qty);
      if (!Number.isInteger(qty) || qty < 1) throw new GameError('Invalid amount');
      const n = Math.min(qty, left);
      if (item === 'coins') kit.spend(state, n, events);
      else kit.takeItem(state, item, n);
      p.given[item] = (p.given[item] ?? 0) + n;
      kit.bumpStat(state, 'donate', item === 'coins' ? 1 : n);
      events.push({ type: 'donated', project: id, item, qty: n });
      if (Object.keys(l.stages[p.stage].needs).some((i) => grandStillNeeded(state, id, i) > 0)) return;
      p.stage++;
      p.given = {};
      kit.addXp(state, l.xp * p.stage, events);
      kit.bumpStat(state, 'grandStage');
      // The first stage marks out the building site: here it is, ready to place.
      if (p.stage === 1) kit.addItem(state, id, 1);
      events.push({ type: 'grandStage', landmark: id, stage: p.stage });
    },
    balloonGift: (state, action: { id: string }, ctx, events, kit) => {
      const dock = kit.getObject(state, String(action.id), 'deco');
      if (dock.def !== 'balloon_dock' || !grandDone(state, 'balloon_dock')) throw new GameError('The balloon dock is still being built');
      const day = kit.utcDay(ctx.now);
      if (state.grand?.giftDay === day) throw new GameError('The balloon is off to the city. It will be back tomorrow!');
      grand(state).giftDay = day;
      const at = kit.centerOf(dock);
      const coins = 400 * state.level;
      kit.earn(state, coins, events, at);
      const items: Record<string, number> = {};
      const pool = [...BALLOON_GOODS];
      for (let i = 0; i < 3; i++) {
        const [item] = pool.splice(Math.floor(kit.nextRandom(state) * pool.length), 1);
        items[item] = 2 + Math.floor(kit.nextRandom(state) * 2);
      }
      items[MYSTERY_GIFT] = 1;
      for (const [item, qty] of Object.entries(items)) kit.addItem(state, item, qty, events, at);
      kit.bumpStat(state, 'balloonGift');
      events.push({ type: 'balloonGift', coins, items });
    },
  },
  after: (state, action: { type: string; id?: string }, ctx, events, kit) => {
    // Glass Greenhouse: now and then a harvest comes up with a little extra.
    // Vehicles and helpers harvest through applyAction, so each of their plots passes through here as a 'harvest'.
    if (action.type === 'harvest' && grandDone(state, 'grand_greenhouse')) {
      // One roll per harvest, however many gains it made (mastery bonuses arrive as extra gains).
      const crop = events.find((e): e is Extract<GameEvent, { type: 'gain' }> => e.type === 'gain' && ITEMS[e.what]?.category === 'crop');
      if (crop && kit.nextRandom(state) < GREENHOUSE_CHANCE) kit.addItem(state, crop.what, 1, events, crop.x !== undefined ? { x: crop.x, y: crop.y! } : undefined);
    }
    // Lighthouse Windmill: the job just queued finishes sooner.
    if (action.type === 'craft' && action.id && grandDone(state, 'lighthouse_windmill')) {
      const b = state.objects[action.id];
      if (b?.kind === 'building' && b.queue.length) {
        const job = b.queue[b.queue.length - 1];
        const start = Math.max(ctx.now, b.queue.length > 1 ? b.queue[b.queue.length - 2].end : 0);
        if (findRecipe(b.def, job.recipe) && job.end > start) {
          job.end -= Math.round((job.end - start) * WINDMILL_SPEEDUP);
          job.dur = job.end - start;
        }
      }
    }
    // Botanical Conservatory: visitors pay a little extra for anything from your farm.
    if (['sellItem', 'sellItems', 'fulfillOrder', 'collectStall'].includes(action.type) && grandDone(state, 'botanical_conservatory')) {
      const bonus = Math.round(coinsGained(events) * CONSERVATORY_BONUS);
      if (bonus > 0) kit.earn(state, bonus, events);
    }
  },
});
