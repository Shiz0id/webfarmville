// Lonely animals (FarmVille 1). Once a day (from level 3) the client invites a
// lost little animal onto the farm. The player can adopt it (it settles on the
// nearest free tile, keeps its name and brings a full first collection) or
// walk it over to a villager, who thanks you with coins, XP, a mystery gift
// and friendship.

import {
  ADOPT_XP,
  LONELY_ANIMALS,
  LONELY_HOMES,
  LONELY_LEVEL,
  LONELY_LEVEL_AHEAD,
  LONELY_NAMES,
  REHOME_POINTS,
  REHOME_XP,
} from '../content/lonely';
import { MYSTERY_GIFT } from '../content/orders';
import { ANIMALS } from '../content/producers';
import { registerFeature } from '../logic/features';
import { GameError, type FarmState, type ProducerObject } from '../types';
import { befriend } from './friends';

export interface LonelyState {
  /** The UTC day the last lonely animal arrived. */
  day: string;
  animal?: string;
  name?: string;
  /** What became of today's visitor. */
  done?: 'adopted' | 'rehomed';
}

declare module '../types' {
  interface FarmState {
    lonely?: LonelyState;
  }
  interface ProducerObject {
    /** The name of an adopted lonely animal. */
    nick?: string;
  }
  interface ExtraActions {
    lonelyArrive: { type: 'lonelyArrive' };
    adoptLonely: { type: 'adoptLonely'; x: number; y: number };
    rehomeLonely: { type: 'rehomeLonely' };
  }
  interface ExtraEvents {
    lonelyArrived: { type: 'lonelyArrived'; animal: string; name: string };
    lonelyAdopted: { type: 'lonelyAdopted'; animal: string; name: string; id: string };
    lonelyRehomed: { type: 'lonelyRehomed'; animal: string; name: string; who: string; coins: number };
  }
}

/** Today's lonely animal, if one is waiting on the farm. */
export function lonelyWaiting(state: FarmState, now: number, utcDay: (n: number) => string): LonelyState | null {
  const l = state.lonely;
  return l && l.animal && !l.done && l.day === utcDay(now) ? l : null;
}

/** Could a lonely animal turn up right now? */
export function lonelyDue(state: FarmState, now: number, utcDay: (n: number) => string): boolean {
  return state.level >= LONELY_LEVEL && state.lonely?.day !== utcDay(now);
}

/** Reward coins for walking an animal to a villager. */
export function rehomeCoins(animal: string): number {
  return Math.round((ANIMALS[animal]?.cost ?? 100) * 0.4);
}

/** The free tile nearest to (x, y), searching outward ring by ring. */
function nearestFree(state: FarmState, x: number, y: number, free: (x: number, y: number) => boolean): { x: number; y: number } | null {
  const cx = Math.max(0, Math.min(state.size - 1, Math.round(x)));
  const cy = Math.max(0, Math.min(state.size - 1, Math.round(y)));
  for (let r = 0; r < state.size; r++)
    for (let dy = -r; dy <= r; dy++)
      for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
        if (free(cx + dx, cy + dy)) return { x: cx + dx, y: cy + dy };
      }
  return null;
}

function waiting(state: FarmState, now: number, utcDay: (n: number) => string): LonelyState & { animal: string; name: string } {
  const l = lonelyWaiting(state, now, utcDay);
  if (!l) throw new GameError('The little visitor has wandered off');
  return l as LonelyState & { animal: string; name: string };
}

registerFeature({
  id: 'lonely',
  actions: {
    lonelyArrive: (state, _a, ctx, events, kit) => {
      if (state.level < LONELY_LEVEL) throw new GameError(`Lonely animals visit from level ${LONELY_LEVEL}`);
      const today = kit.utcDay(ctx.now);
      if (state.lonely?.day === today) throw new GameError('No more visitors today');
      const options = LONELY_ANIMALS.filter((a) => ANIMALS[a] && ANIMALS[a].level <= state.level + LONELY_LEVEL_AHEAD);
      const animal = options[Math.floor(kit.nextRandom(state) * options.length) % options.length];
      const name = LONELY_NAMES[Math.floor(kit.nextRandom(state) * LONELY_NAMES.length) % LONELY_NAMES.length];
      state.lonely = { day: today, animal, name };
      events.push({ type: 'lonelyArrived', animal, name });
    },
    adoptLonely: (state, action: { x: number; y: number }, ctx, events, kit) => {
      const l = waiting(state, ctx.now, kit.utcDay);
      const spot = nearestFree(state, Number(action.x) || 0, Number(action.y) || 0, (x, y) => kit.canPlace(state, x, y, 1, 1));
      if (!spot) throw new GameError('There is no room on your farm for another animal');
      const def = ANIMALS[l.animal];
      const id = `o${state.nextId++}`;
      // Arrives with a little something to collect right away.
      const obj: ProducerObject = { id, kind: 'animal', def: def.id, x: spot.x, y: spot.y, cycleStart: ctx.now - def.cycleSec * 1000, nick: l.name };
      state.objects[id] = obj;
      l.done = 'adopted';
      kit.addXp(state, ADOPT_XP, events, { x: spot.x + 0.5, y: spot.y + 0.5 });
      kit.bumpStat(state, 'lonely');
      kit.bumpStat(state, 'lonelyAdopted');
      kit.bumpStat(state, `buy:animal`);
      events.push({ type: 'lonelyAdopted', animal: def.id, name: l.name, id });
    },
    rehomeLonely: (state, _a, ctx, events, kit) => {
      const l = waiting(state, ctx.now, kit.utcDay);
      const home = LONELY_HOMES[l.animal];
      l.done = 'rehomed';
      const coins = rehomeCoins(l.animal);
      kit.earn(state, coins, events);
      kit.addXp(state, REHOME_XP, events);
      kit.addItem(state, MYSTERY_GIFT, 1, events);
      if (home) befriend(state, home.who, REHOME_POINTS, ctx.now, events);
      kit.bumpStat(state, 'lonely');
      kit.bumpStat(state, 'lonelyRehomed');
      events.push({ type: 'lonelyRehomed', animal: l.animal, name: l.name, who: home?.who ?? 'mayor_maple', coins });
    },
  },
});
