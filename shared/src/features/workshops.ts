// Workshop upgrades (FarmVille 2). Level 2: one more queue slot and 15%
// faster crafting. Level 3: two more slots, 30% faster, and a 1-in-4 chance of
// a bonus item per job. Upgrades cost coins plus some of the workshop's own
// goods. (Slots, speed and the bonus are applied by the reducer's craft and
// collectCrafts via content/workshops.ts.)

import { BUILDINGS } from '../content/buildings';
import { ITEMS } from '../content/items';
import { MAX_WORKSHOP_LEVEL, upgradeCost } from '../content/workshops';
import { registerFeature } from '../logic/features';
import { GameError } from '../types';

declare module '../types' {
  interface ExtraActions {
    upgradeWorkshop: { type: 'upgradeWorkshop'; id: string };
  }
  interface ExtraEvents {
    workshopUpgraded: { type: 'workshopUpgraded'; id: string; def: string; level: number };
    workshopBonus: { type: 'workshopBonus'; id: string; item: string };
  }
}

registerFeature({
  id: 'workshops',
  actions: {
    upgradeWorkshop: (state, action: { id: string }, _ctx, events, kit) => {
      const b = kit.getObject(state, String(action.id), 'building');
      const def = BUILDINGS[b.def];
      if (!def || def.starter || !def.recipes.length) throw new GameError("That can't be upgraded");
      const next = (b.level ?? 1) + 1;
      if (next > MAX_WORKSHOP_LEVEL) throw new GameError(`Your ${def.name} is already fully upgraded`);
      const cost = upgradeCost(def, next)!;
      if (state.level < cost.playerLevel) throw new GameError(`Upgrading to level ${next} unlocks at farm level ${cost.playerLevel}`);
      for (const [item, qty] of Object.entries(cost.goods))
        if ((state.inventory[item] ?? 0) < qty) throw new GameError(`Need ${qty} ${ITEMS[item]?.name ?? item}`);
      kit.spend(state, cost.coins, events, kit.centerOf(b));
      for (const [item, qty] of Object.entries(cost.goods)) kit.takeItem(state, item, qty);
      b.level = next;
      kit.bumpStat(state, 'upgrade');
      events.push({ type: 'workshopUpgraded', id: b.id, def: def.id, level: next });
    },
  },
});
