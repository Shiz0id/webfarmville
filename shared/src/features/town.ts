// Town projects: donate toward the active project; finishing it unlocks its
// perk. Perks for other features are checked with townDone() where they apply
// (fishing casts, stall slots, kitty visits, chat friendship); the orchard and
// kitchen perks are applied here after the action.

import { TREES } from '../content/producers';
import { activeProject, townDone, type TownState } from '../content/town';
import { registerFeature } from '../logic/features';
import { GameError, type FarmState, type GameEvent } from '../types';

declare module '../types' {
  interface ExtraActions {
    donate: { type: 'donate'; project: string; item: string; qty: number };
  }
  interface ExtraEvents {
    donated: { type: 'donated'; project: string; item: string; qty: number };
    projectDone: { type: 'projectDone'; project: string };
  }
}

function town(state: FarmState): TownState {
  return (state.town ??= { given: {}, done: [] });
}

/** How many more of `item` the active project needs. */
export function stillNeeded(state: FarmState, item: string): number {
  const p = activeProject(state);
  if (!p || !Object.hasOwn(p.needs, item)) return 0;
  return Math.max(0, p.needs[item] - (state.town?.given[item] ?? 0));
}

/** Can the player give anything to the active project right now? */
export function canDonate(state: FarmState): boolean {
  const p = activeProject(state);
  if (!p || state.level < p.level) return false;
  return Object.keys(p.needs).some((item) => stillNeeded(state, item) > 0 && (item === 'coins' ? state.coins : (state.inventory[item] ?? 0)) > 0);
}

registerFeature({
  id: 'town',
  migrate: (state) => void town(state),
  actions: {
    donate: (state, action: { project: string; item: string; qty: number }, _ctx, events, kit) => {
      const p = activeProject(state);
      if (!p || p.id !== String(action.project)) throw new GameError('The town is working on something else now');
      if (state.level < p.level) throw new GameError(`${p.name} starts at level ${p.level}`);
      const item = String(action.item);
      const left = stillNeeded(state, item);
      if (!left) throw new GameError("That isn't needed");
      const qty = Number(action.qty);
      if (!Number.isInteger(qty) || qty < 1) throw new GameError('Invalid amount');
      const n = Math.min(qty, left);
      if (item === 'coins') kit.spend(state, n, events);
      else kit.takeItem(state, item, n);
      const t = town(state);
      t.given[item] = (t.given[item] ?? 0) + n;
      kit.bumpStat(state, 'donate', item === 'coins' ? 1 : n);
      events.push({ type: 'donated', project: p.id, item, qty: n });
      if (Object.keys(p.needs).every((i) => stillNeeded(state, i) === 0)) {
        t.done.push(p.id);
        t.given = {};
        kit.addXp(state, p.xp, events);
        kit.bumpStat(state, 'projects');
        events.push({ type: 'projectDone', project: p.id });
      }
    },
  },
  after: (state, action: { type: string; id?: string }, _ctx, events, kit) => {
    if (action.type === 'collect' && action.id && townDone(state, 'town_orchard')) {
      const tree = state.objects[action.id];
      if (tree?.kind === 'tree' && TREES[tree.def]) kit.addItem(state, TREES[tree.def].product, 1, events, kit.centerOf(tree));
    }
    if (action.type === 'cook' && townDone(state, 'community_kitchen')) {
      const xp = events.find((e): e is Extract<GameEvent, { type: 'gain' }> => e.type === 'gain' && e.what === 'xp');
      if (xp) kit.addXp(state, Math.round(xp.amount / 4), events);
    }
  },
});
