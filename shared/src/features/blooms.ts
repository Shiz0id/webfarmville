// Flower cross-breeding. Four times a day (the client asks with bloomCheck)
// each tulip and rose may pair with a neighbour of its kind and sprout a new
// flower on a free tile beside them: a copy of a parent, or with the right
// colours, a rare hybrid. Watering a flower (or a rainy sky) makes it far more
// likely to breed in the next check.

import {
  BLOOMS,
  BLOOM_CHANCE,
  BLOOM_PERIOD,
  FLORIST_AT,
  HYBRIDS,
  HYBRID_XP,
  LONE_CLONE,
  MAX_BLOOMS,
  MAX_SPROUTS,
  SPROUT_XP,
  WATERED_MULT,
  recipeFor,
} from '../content/blooms';
import { WEATHER, weatherAt } from '../content/weather';
import { registerFeature, type FeatureKit } from '../logic/features';
import { GameError, type DecoObject, type FarmState, type GameEvent } from '../types';

export interface BloomsState {
  /** The last breeding period checked. */
  period?: number;
  /** Flower id -> the period it was watered in. */
  watered: Record<string, number>;
  /** Hybrids bred so far, in order of discovery. */
  found: string[];
  florist?: boolean;
}

declare module '../types' {
  interface FarmState {
    blooms?: BloomsState;
  }
  interface ExtraActions {
    waterFlower: { type: 'waterFlower'; id: string };
    bloomCheck: { type: 'bloomCheck' };
  }
  interface ExtraEvents {
    wateredFlower: { type: 'wateredFlower'; id: string };
    bloomed: { type: 'bloomed'; id: string; def: string; x: number; y: number; hybrid: boolean; first: boolean };
    florist: { type: 'florist' };
  }
}

function blooms(state: FarmState): BloomsState {
  return (state.blooms ??= { watered: {}, found: [] });
}

export const bloomPeriod = (now: number): number => Math.floor(now / BLOOM_PERIOD);

export function isBloom(obj: { kind: string; def?: string } | undefined): obj is DecoObject {
  return obj?.kind === 'deco' && !!obj.def && Object.hasOwn(BLOOMS, obj.def);
}

/** Watered for the coming check (by hand this period, or by the rain). */
export function isWatered(state: FarmState, id: string, now: number): boolean {
  return state.blooms?.watered[id] === bloomPeriod(now) || !!WEATHER[weatherAt(now)].wet;
}

/** When the next bloom check happens. */
export function nextBloomAt(now: number): number {
  return (bloomPeriod(now) + 1) * BLOOM_PERIOD;
}

export function hybridsFound(state: FarmState): string[] {
  return state.blooms?.found ?? [];
}

const NEAR = [
  [-1, -1], [0, -1], [1, -1],
  [-1, 0], [1, 0],
  [-1, 1], [0, 1], [1, 1],
] as const; // prettier-ignore

const num = (id: string) => Number(id.slice(1)) || 0;

/** One breeding round; `wetSky` is the weather of the period that just ended. */
function breed(state: FarmState, period: number, wetSky: boolean, events: GameEvent[], kit: FeatureKit): void {
  const b = blooms(state);
  const flowers = Object.values(state.objects)
    .filter(isBloom)
    .sort((p, q) => num(p.id) - num(q.id));
  if (flowers.length >= MAX_BLOOMS) return;
  const at = new Map(flowers.map((f) => [`${f.x},${f.y}`, f]));
  const used = new Set<string>();
  let sprouts = 0;
  const free = (around: DecoObject[]) => {
    const spots: [number, number][] = [];
    for (const f of around)
      for (const [dx, dy] of NEAR) {
        const x = f.x + dx;
        const y = f.y + dy;
        if (!spots.some(([sx, sy]) => sx === x && sy === y) && kit.canPlace(state, x, y, 1, 1)) spots.push([x, y]);
      }
    return spots;
  };
  for (const f of flowers) {
    if (sprouts >= MAX_SPROUTS || flowers.length + sprouts >= MAX_BLOOMS) break;
    if (used.has(f.id)) continue;
    const wet = wetSky || b.watered[f.id] === period;
    if (kit.nextRandom(state) >= BLOOM_CHANCE * (wet ? WATERED_MULT : 1)) continue;
    used.add(f.id);
    const species = BLOOMS[f.def].species;
    const mates = NEAR.map(([dx, dy]) => at.get(`${f.x + dx},${f.y + dy}`)).filter(
      (m): m is DecoObject => !!m && !used.has(m.id) && BLOOMS[m.def].species === species,
    );
    let child: string;
    let around: DecoObject[];
    if (mates.length) {
      const mate = mates[Math.floor(kit.nextRandom(state) * mates.length) % mates.length];
      used.add(mate.id);
      const recipe = recipeFor(f.def, mate.def);
      const r = kit.nextRandom(state);
      if (recipe && (!recipe.wet || wetSky) && r < recipe.odds) child = recipe.child;
      else child = kit.nextRandom(state) < 0.5 ? f.def : mate.def;
      around = [f, mate];
    } else {
      if (kit.nextRandom(state) >= LONE_CLONE) continue;
      child = f.def;
      around = [f];
    }
    const spots = free(around);
    if (!spots.length) continue;
    const [x, y] = spots[Math.floor(kit.nextRandom(state) * spots.length) % spots.length];
    const id = `o${state.nextId++}`;
    state.objects[id] = { id, kind: 'deco', def: child, x, y };
    used.add(id);
    sprouts++;
    state.stats[`got:${child}`] = 1;
    const hybrid = BLOOMS[child].hybrid;
    const first = hybrid && !b.found.includes(child);
    if (first) b.found.push(child);
    events.push({ type: 'bloomed', id, def: child, x, y, hybrid, first });
    kit.bumpStat(state, 'sprout');
    if (hybrid) kit.bumpStat(state, 'hybrid');
    kit.addXp(state, first ? HYBRID_XP : SPROUT_XP, events, { x: x + 0.5, y: y + 0.5 });
  }
  if (!b.florist && b.found.length >= Math.min(FLORIST_AT, HYBRIDS.length)) {
    b.florist = true;
    kit.addItem(state, 'florist_cart', 1, events);
    events.push({ type: 'florist' });
  }
}

registerFeature({
  id: 'blooms',
  migrate: (state) => void blooms(state),
  actions: {
    waterFlower: (state, action: { id: string }, ctx, events, kit) => {
      const obj = state.objects[String(action.id)];
      if (!isBloom(obj)) throw new GameError('Only tulips and roses need watering');
      const b = blooms(state);
      const period = bloomPeriod(ctx.now);
      if (b.watered[obj.id] === period) throw new GameError('That flower is already watered');
      b.watered[obj.id] = period;
      events.push({ type: 'wateredFlower', id: obj.id });
      kit.bumpStat(state, 'waterFlower');
    },
    bloomCheck: (state, _a, ctx, events, kit) => {
      const b = blooms(state);
      const period = bloomPeriod(ctx.now);
      if (b.period === period) throw new GameError('Nothing new in the garden yet');
      const last = b.period;
      b.period = period;
      // Only breed when a check is due; a brand-new garden just starts the clock.
      if (last !== undefined) breed(state, last, !!WEATHER[weatherAt(last * BLOOM_PERIOD)].wet, events, kit);
      for (const [id, p] of Object.entries(b.watered)) if (p < period || !isBloom(state.objects[id])) delete b.watered[id];
    },
  },
});
