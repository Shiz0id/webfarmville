// Kitty Corner. Fill a food bowl and neighborhood cats drop by to play on
// your goodies. Who visits is a pure function of the clock, your goodies and
// the food, so the client can show visitors without asking the server; gifts
// and hearts are banked when you collect them.

import { EVENTS, isEventActive } from '../content/events';
import { CRITTER_LIST } from '../content/nature';
import {
  ADOPT_HEARTS,
  KITTIES,
  KITTY_FOOD,
  KITTY_LIST,
  MAX_ADOPTED,
  goodiePose,
  type KittyDef,
} from '../content/kitties';
import { weatherKittyAppeal } from '../content/weather';
import { registerFeature } from '../logic/features';
import { GameError, type FarmState } from '../types';

export interface KittyState {
  food?: { kind: string; from: number; until: number };
  /** Hearts per cat (0 to ADOPT_HEARTS+). */
  hearts: Record<string, number>;
  /** Visits seen per cat. */
  met: Record<string, number>;
  adopted: string[];
  /** Last day each cat was petted, and last day a visit earned a heart. */
  petDay: Record<string, string>;
  visitDay: Record<string, string>;
  /** Visits before this time have been collected. */
  collectedUntil: number;
}

declare module '../types' {
  interface FarmState {
    kitty?: KittyState;
  }
  interface ExtraActions {
    feedKitties: { type: 'feedKitties'; food: string };
    collectKitties: { type: 'collectKitties' };
    petKitty: { type: 'petKitty'; cat: string };
    adoptKitty: { type: 'adoptKitty'; cat: string };
  }
  interface ExtraEvents {
    kittyGifts: { type: 'kittyGifts'; coins: number; visits: number; cats: string[]; newCats: string[] };
    purr: { type: 'purr'; cat: string; heart: boolean };
    adopted: { type: 'adopted'; cat: string };
  }
}

/** Cats change goodies every half hour. */
export const KITTY_SLOT = 30 * 60_000;
/** Collect at most this many slots at once (two days). */
const MAX_SLOTS = 96;

function kitty(state: FarmState): KittyState {
  return (state.kitty ??= { hearts: {}, met: {}, adopted: [], petDay: {}, visitDay: {}, collectedUntil: 0 });
}

const day = (t: number) => new Date(t).toISOString().slice(0, 10);

/** A small deterministic hash -> [0, 1). */
function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  h ^= h >>> 13;
  h = Math.imul(h, 0x5bd1e995);
  h ^= h >>> 15;
  return (h >>> 0) / 4294967296;
}

/** Goodies on the farm, as [objectId, def], in a stable order. */
function goodies(state: FarmState): [string, string][] {
  return Object.values(state.objects)
    .filter((o) => o.kind === 'deco' && goodiePose(o.def))
    .map((o) => [o.id, (o as { def: string }).def] as [string, string])
    .sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
}

export function hasBowl(state: FarmState): boolean {
  return Object.values(state.objects).some((o) => o.kind === 'deco' && o.def === 'kitty_bowl');
}

/** Which cat is on which goodie during the slot containing `t`. */
export function kittyVisitors(state: FarmState, t: number, allEvents = false): Record<string, string> {
  const k = state.kitty;
  const food = k?.food && KITTY_FOOD[k.food.kind];
  const out: Record<string, string> = {};
  if (!k?.food || !food) return out;
  const slot = Math.floor(t / KITTY_SLOT);
  const start = slot * KITTY_SLOT;
  if (k.food.from >= start + KITTY_SLOT || start >= k.food.until || !hasBowl(state)) return out;
  const taken = new Set(k.adopted);
  const appeal = food.appeal + weatherKittyAppeal(start);
  for (const [id, def] of goodies(state)) {
    if (def === 'kitty_bowl') continue;
    if (hash(`${state.createdAt}:${id}:${slot}:come`) >= appeal) continue;
    const pool: [KittyDef, number][] = [];
    for (const c of KITTY_LIST) {
      if (taken.has(c.id)) continue;
      if (c.event && !allEvents && !isEventActive(EVENTS[c.event], start)) continue;
      if (c.rare && !(food.fancy && c.favorite === def)) continue;
      pool.push([c, c.favorite === def ? 4 : 1]);
    }
    if (!pool.length) continue;
    let r = hash(`${state.createdAt}:${id}:${slot}:who`) * pool.reduce((a, [, w]) => a + w, 0);
    let pick = pool[pool.length - 1][0];
    for (const [c, w] of pool) {
      r -= w;
      if (r < 0) {
        pick = c;
        break;
      }
    }
    taken.add(pick.id);
    out[id] = pick.id;
  }
  return out;
}

/** Completed visits not yet collected: [slotStart, catId][]. */
export function pendingVisits(state: FarmState, now: number, allEvents = false): [number, string][] {
  const k = state.kitty;
  if (!k?.food) return [];
  const first = Math.max(k.collectedUntil, Math.floor(k.food.from / KITTY_SLOT) * KITTY_SLOT);
  const last = Math.min(Math.floor(now / KITTY_SLOT) * KITTY_SLOT, k.food.until);
  const out: [number, string][] = [];
  for (let t = Math.max(first, last - MAX_SLOTS * KITTY_SLOT); t < last; t += KITTY_SLOT)
    for (const cat of Object.values(kittyVisitors(state, t, allEvents))) out.push([t, cat]);
  return out;
}

export function giftFor(state: FarmState, slot: number, cat: string): number {
  const rare = KITTIES[cat]?.rare;
  const r = hash(`${state.createdAt}:${cat}:${slot}:gift`);
  return rare ? 40 + Math.floor(r * 50) : 3 + Math.floor(r * 6);
}

export function canAdopt(state: FarmState, cat: string): boolean {
  const k = state.kitty;
  return !!k && (k.hearts[cat] ?? 0) >= ADOPT_HEARTS && !k.adopted.includes(cat) && k.adopted.length < MAX_ADOPTED;
}

function fishInBarn(state: FarmState): string[] {
  return CRITTER_LIST.filter((c) => c.kind === 'fish' && (state.inventory[c.id] ?? 0) > 0)
    .sort((a, b) => a.sell - b.sell)
    .map((c) => c.id);
}

registerFeature({
  id: 'kitties',
  migrate: (state) => void kitty(state),
  actions: {
    feedKitties: (state, action: { food: string }, ctx, events, kit) => {
      const food = Object.hasOwn(KITTY_FOOD, action.food) ? KITTY_FOOD[action.food] : undefined;
      if (!food) throw new GameError('Unknown kitty food');
      if (!hasBowl(state)) throw new GameError('Place a Kitty Food Bowl first (Market › Decor › Kitty Corner)');
      const k = kitty(state);
      if (k.food && k.food.until - ctx.now > 60 * 60_000) throw new GameError('The bowls are still full!');
      if (food.fish) {
        // Cheapest fish first, any kind.
        let need = food.fish;
        const fish = fishInBarn(state);
        const have = fish.reduce((a, f) => a + (state.inventory[f] ?? 0), 0);
        if (have < need) throw new GameError(`Needs ${need} fish from Meadow Pond`);
        for (const f of fish) {
          const n = Math.min(need, state.inventory[f] ?? 0);
          if (n > 0) kit.takeItem(state, f, n);
          need -= n;
          if (!need) break;
        }
      } else kit.spend(state, food.coins, events);
      // Bank anything earned from the previous bowl before it is replaced.
      collect(state, ctx.now, !!ctx.allEvents, events, kit);
      k.food = { kind: food.id, from: ctx.now, until: ctx.now + food.hours * 3600_000 };
      k.collectedUntil = Math.floor(ctx.now / KITTY_SLOT) * KITTY_SLOT;
      kit.bumpStat(state, 'kittyFeed');
    },
    collectKitties: (state, _a, ctx, events, kit) => {
      if (!collect(state, ctx.now, !!ctx.allEvents, events, kit)) throw new GameError('No gifts yet. Check back soon!');
    },
    petKitty: (state, action: { cat: string }, ctx, events, kit) => {
      const cat = String(action.cat);
      if (!Object.hasOwn(KITTIES, cat)) throw new GameError('Unknown kitty');
      const k = kitty(state);
      const here = k.adopted.includes(cat) || Object.values(kittyVisitors(state, ctx.now, ctx.allEvents)).includes(cat);
      if (!here) throw new GameError(`${KITTIES[cat].name} wandered off`);
      const today = day(ctx.now);
      const heart = k.petDay[cat] !== today;
      if (heart) {
        k.petDay[cat] = today;
        k.hearts[cat] = (k.hearts[cat] ?? 0) + 1;
        kit.addXp(state, 2, events);
        if (k.adopted.includes(cat)) kit.earn(state, 10, events);
      }
      kit.bumpStat(state, 'pet');
      events.push({ type: 'purr', cat, heart });
    },
    adoptKitty: (state, action: { cat: string }, _ctx, events, kit) => {
      const cat = String(action.cat);
      if (!Object.hasOwn(KITTIES, cat)) throw new GameError('Unknown kitty');
      const k = kitty(state);
      if (k.adopted.includes(cat)) throw new GameError('Already part of the family!');
      if (k.adopted.length >= MAX_ADOPTED) throw new GameError(`Your farm has room for ${MAX_ADOPTED} cats`);
      if ((k.hearts[cat] ?? 0) < ADOPT_HEARTS) throw new GameError(`${KITTIES[cat].name} needs ${ADOPT_HEARTS} hearts first`);
      k.adopted.push(cat);
      kit.addXp(state, 50, events);
      kit.bumpStat(state, 'adopt');
      events.push({ type: 'adopted', cat });
    },
  },
});

function collect(
  state: FarmState,
  now: number,
  allEvents: boolean,
  events: import('../types').GameEvent[],
  kit: import('../logic/features').FeatureKit,
): boolean {
  const k = kitty(state);
  const visits = pendingVisits(state, now, allEvents);
  if (!visits.length) return false;
  let coins = 0;
  const cats = new Set<string>();
  const newCats: string[] = [];
  for (const [slot, cat] of visits) {
    coins += giftFor(state, slot, cat);
    cats.add(cat);
    if (!k.met[cat]) newCats.push(cat);
    k.met[cat] = (k.met[cat] ?? 0) + 1;
    const d = day(slot);
    if (k.visitDay[cat] !== d) {
      k.visitDay[cat] = d;
      k.hearts[cat] = (k.hearts[cat] ?? 0) + 1;
    }
  }
  k.collectedUntil = Math.min(Math.floor(now / KITTY_SLOT) * KITTY_SLOT, k.food?.until ?? now);
  kit.earn(state, coins, events);
  kit.addXp(state, Math.min(40, visits.length), events);
  kit.bumpStat(state, 'kittyVisit', visits.length);
  events.push({ type: 'kittyGifts', coins, visits: visits.length, cats: [...cats], newCats });
  return true;
}
