// Helper consumables (FarmVille 1). Helpers are handed out as items (by quests,
// the Prize Booth, ...) and moved straight into `state.helpers`, so they never
// clutter the barn or get sold. Mystery gifts and completed collections throw
// one in now and then. Using one applies the ordinary collect action to every
// ready animal or tree, so every bonus works as if done by hand.

import { CROPS } from '../content/crops';
import { COLLECTION_HELPERS, GIFT_HELPER_CHANCE, HELPERS, HELPER_LIST } from '../content/helpers';
import { registerFeature } from '../logic/features';
import { cropStatus, producerStatus } from '../logic/status';
import { GameError, type Action, type FarmState } from '../types';
import { fairTickets } from './fair';
import { applySubActions } from './vehicles';

declare module '../types' {
  interface FarmState {
    /** Helper id -> how many you have. */
    helpers?: Record<string, number>;
  }
  interface ExtraActions {
    useHelper: { type: 'useHelper'; helper: string };
    buyHelperPrize: { type: 'buyHelperPrize'; helper: string };
  }
  interface ExtraEvents {
    helperUsed: { type: 'helperUsed'; helper: string; count: number };
    helperFound: { type: 'helperFound'; helper: string; qty: number; from: 'gift' | 'collection' | 'other' };
  }
}

export function helperCount(state: FarmState, id: string): number {
  return state.helpers?.[id] ?? 0;
}

/** What using this helper would work on right now (object ids). */
export function helperTargets(state: FarmState, id: string, now: number): string[] {
  const def = HELPERS[id];
  if (!def) return [];
  return Object.values(state.objects)
    .filter((o) => {
      if (def.job === 'unwither') return o.kind === 'plot' && cropStatus(o, now).stage === 'withered';
      const kind = def.job === 'animals' ? 'animal' : 'tree';
      return o.kind === kind && producerStatus(o, now).ready;
    })
    .map((o) => o.id);
}

function give(state: FarmState, id: string, qty: number): void {
  const h = (state.helpers ??= {});
  h[id] = (h[id] ?? 0) + qty;
}

registerFeature({
  id: 'helpers',
  actions: {
    useHelper: (state, action: { helper: string }, ctx, events, kit) => {
      const def = Object.hasOwn(HELPERS, String(action.helper)) ? HELPERS[String(action.helper)] : undefined;
      if (!def) throw new GameError('Unknown helper');
      if (helperCount(state, def.id) < 1) throw new GameError(`You don't have a ${def.name}`);
      const targets = helperTargets(state, def.id, ctx.now);
      if (!targets.length) {
        throw new GameError(
          def.job === 'animals' ? 'No animals are ready yet' : def.job === 'trees' ? 'No trees are ready yet' : 'No crops have withered. Lucky you!',
        );
      }
      let count = 0;
      if (def.job === 'unwither') {
        for (const id of targets) {
          const plot = state.objects[id];
          if (plot.kind !== 'plot' || !plot.crop) continue;
          plot.plantedAt = ctx.now - CROPS[plot.crop].growSec * 1000;
          count++;
        }
      } else {
        const actions: Action[] = targets.map((id) => ({ type: 'collect', id }));
        count = applySubActions(state, actions, ctx, events);
      }
      if (!count) throw new GameError('Nothing to do right now');
      state.helpers![def.id] -= 1;
      if (!state.helpers![def.id]) delete state.helpers![def.id];
      kit.bumpStat(state, 'helper');
      kit.bumpStat(state, `helper:${def.id}`);
      if (def.job === 'unwither') kit.bumpStat(state, 'unwither', count);
      events.push({ type: 'helperUsed', helper: def.id, count });
    },
    buyHelperPrize: (state, action: { helper: string }, _ctx, events) => {
      const def = Object.hasOwn(HELPERS, String(action.helper)) ? HELPERS[String(action.helper)] : undefined;
      if (!def) throw new GameError("That isn't a fair prize");
      if (fairTickets(state) < def.tickets) throw new GameError(`You need ${def.tickets} prize tickets`);
      state.fair!.tickets -= def.tickets;
      give(state, def.id, 1);
      events.push({ type: 'helperFound', helper: def.id, qty: 1, from: 'other' });
    },
  },
  after: (state, action, _ctx, events, kit) => {
    // Mystery gifts sometimes come with a helper tucked inside.
    if (action.type === 'openGift' && kit.nextRandom(state) < GIFT_HELPER_CHANCE) {
      const def = HELPER_LIST[Math.floor(kit.nextRandom(state) * HELPER_LIST.length) % HELPER_LIST.length];
      give(state, def.id, 1);
      events.push({ type: 'helperFound', helper: def.id, qty: 1, from: 'gift' });
    }
    // Every completed collection brings a helper along.
    for (const e of events) {
      if (e.type !== 'collectionTraded') continue;
      const id = COLLECTION_HELPERS[e.collection] ?? 'unwither_charm';
      give(state, id, 1);
      events.push({ type: 'helperFound', helper: id, qty: 1, from: 'collection' });
    }
    // Helpers handed out as items (quest rewards, ...) go straight to the tool shed.
    for (const def of HELPER_LIST) {
      const n = state.inventory[def.id];
      if (!n) continue;
      delete state.inventory[def.id];
      give(state, def.id, n);
    }
  },
});
