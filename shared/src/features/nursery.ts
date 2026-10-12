// Baby animals and the Nursery Barn (FarmVille 2). A baby is an animal with a
// `grownAt` time: it doesn't produce until then, and its first production
// cycle starts the moment it grows up. Cuddles (once an hour), treats from the
// Feed Mill and neighbors' help all bring that moment closer, twice as much
// near a Nursery Barn.

import { ANIMALS } from '../content/producers';
import {
  BABY_ANIMALS,
  CUDDLE_EVERY,
  CUDDLE_SKIP,
  NURSERY_DECO,
  NURSERY_MULT,
  NURSERY_RANGE,
  babyGrowMs,
  babyPrice,
} from '../content/nursery';
import { footprint } from '../logic/catalog';
import { registerFeature } from '../logic/features';
import { GameError, type FarmState, type GameEvent, type ProducerObject } from '../types';

declare module '../types' {
  interface ProducerObject {
    /** A baby animal grows up at this time (absent once it's grown). */
    grownAt?: number;
    /** When it was last cuddled. */
    cuddledAt?: number;
  }
  interface ExtraActions {
    buyBaby: { type: 'buyBaby'; def: string; x: number; y: number; flip?: boolean };
    cuddleBaby: { type: 'cuddleBaby'; id: string };
    /** Celebrate babies whose time has come (the after-hook does the work). */
    growUp: { type: 'growUp' };
  }
  interface ExtraEvents {
    cuddled: { type: 'cuddled'; id: string; grown: boolean };
    grewUp: { type: 'grewUp'; id: string; def: string; nick?: string };
  }
}

export function isBaby(obj: { kind: string; grownAt?: number } | undefined, now: number): boolean {
  return obj?.kind === 'animal' && obj.grownAt !== undefined && obj.grownAt > now;
}

/** Is this tile within reach of a Nursery Barn's warmth? */
export function nearNursery(state: FarmState, x: number, y: number): boolean {
  return Object.values(state.objects).some((o) => {
    if (o.kind !== 'deco' || o.def !== NURSERY_DECO) return false;
    const { w, h } = footprint(o);
    return x >= o.x - NURSERY_RANGE && x < o.x + w + NURSERY_RANGE && y >= o.y - NURSERY_RANGE && y < o.y + h + NURSERY_RANGE;
  });
}

/** When this baby can be cuddled again (now or earlier means now). */
export function cuddleReadyAt(obj: ProducerObject): number {
  return (obj.cuddledAt ?? 0) + CUDDLE_EVERY;
}

/**
 * Bring a baby's growing-up time forward by `fraction` of its whole growing
 * time (doubled near a Nursery Barn). Returns true if it is now grown.
 */
export function helpGrow(state: FarmState, obj: ProducerObject, fraction: number, now: number): boolean {
  if (!isBaby(obj, now)) return false;
  const def = ANIMALS[obj.def];
  const mult = nearNursery(state, obj.x, obj.y) ? NURSERY_MULT : 1;
  obj.grownAt = Math.max(now, obj.grownAt! - babyGrowMs(def) * fraction * mult);
  obj.cycleStart = obj.grownAt;
  return obj.grownAt <= now;
}

/** Turn a freshly placed animal into a baby. */
export function makeBaby(obj: ProducerObject, now: number): void {
  obj.grownAt = now + babyGrowMs(ANIMALS[obj.def]);
  obj.cycleStart = obj.grownAt;
}

registerFeature({
  id: 'nursery',
  actions: {
    buyBaby: (state, action: { def: string; x: number; y: number; flip?: boolean }, ctx, events, kit) => {
      const def = Object.hasOwn(ANIMALS, String(action.def)) ? ANIMALS[String(action.def)] : undefined;
      if (!def || !BABY_ANIMALS.includes(def.id)) throw new GameError("That animal doesn't come as a baby");
      if (state.level < def.level) throw new GameError(`Unlocks at level ${def.level}`);
      if (!kit.canPlace(state, action.x, action.y, 1, 1)) throw new GameError("Can't place that there");
      kit.spend(state, babyPrice(def), events, { x: action.x + 0.5, y: action.y + 0.5 });
      const id = `o${state.nextId++}`;
      const obj: ProducerObject = { id, kind: 'animal', def: def.id, x: action.x, y: action.y, cycleStart: ctx.now };
      makeBaby(obj, ctx.now);
      state.objects[id] = obj;
      kit.bumpStat(state, 'buy:animal');
      kit.bumpStat(state, 'baby');
    },
    cuddleBaby: (state, action: { id: string }, ctx, events, kit) => {
      const obj = kit.getObject(state, String(action.id));
      if (obj.kind !== 'animal' || !isBaby(obj, ctx.now)) throw new GameError('All grown up!');
      if (cuddleReadyAt(obj) > ctx.now) throw new GameError('Shh, the little one is napping. Cuddle again later!');
      obj.cuddledAt = ctx.now;
      const grown = helpGrow(state, obj, CUDDLE_SKIP, ctx.now);
      kit.addXp(state, 1, events, kit.centerOf(obj));
      kit.bumpStat(state, 'cuddle');
      events.push({ type: 'cuddled', id: obj.id, grown });
    },
    growUp: (state, _a, ctx) => {
      if (!Object.values(state.objects).some((o) => o.kind === 'animal' && o.grownAt !== undefined && o.grownAt <= ctx.now))
        throw new GameError('Nobody is ready to grow up yet');
    },
  },
  // Babies whose time has come grow up (and count) on the next action.
  after: (state, _a, ctx, events: GameEvent[], kit) => {
    for (const o of Object.values(state.objects)) {
      if (o.kind !== 'animal' || o.grownAt === undefined || o.grownAt > ctx.now) continue;
      delete o.grownAt;
      delete o.cuddledAt;
      kit.bumpStat(state, 'raised');
      events.push({ type: 'grewUp', id: o.id, def: o.def, ...(o.nick ? { nick: o.nick } : {}) });
    }
  },
});
