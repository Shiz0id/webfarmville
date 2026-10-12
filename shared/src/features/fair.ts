// The County Fair. On weekends each contest takes one entry: its score is the
// entry's value, a judge's whim (0.8x to 1.25x) and a bonus for the featured
// item, set against three villagers whose entries scale with your level.
// Places pay prize tickets, spent at the Prize Booth on fair decorations.

import { BLOOM_LIST } from '../content/blooms';
import { DISHES } from '../content/cooking';
import { CROPS } from '../content/crops';
import { DECORATIONS } from '../content/decorations';
import {
  CHAMPION_TICKETS,
  CONTESTS,
  CONTEST_LIST,
  FAIR_PRIZES,
  FEATURED_MULT,
  PLACE_TICKETS,
  PLACE_XP,
  RIVALS,
  RIVAL_SHARES,
  fairHash,
  fairKey,
  fairOpen,
  type ContestId,
} from '../content/fair';
import { ITEMS } from '../content/items';
import { CRITTER_LIST } from '../content/nature';
import { TREES } from '../content/producers';
import { registerFeature } from '../logic/features';
import { GameError, type FarmState } from '../types';

export interface ContestEntry {
  item: string;
  score: number;
  /** 0 = 1st place. */
  place: number;
  featured: boolean;
  rivals: { who: string; item: string; score: number }[];
}

export interface FairState {
  /** The fair the entries belong to. */
  key: string;
  entries: Partial<Record<ContestId, ContestEntry>>;
  tickets: number;
  /** Fairs where you won every contest. */
  champion: string[];
}

declare module '../types' {
  interface FarmState {
    fair?: FairState;
  }
  interface ExtraActions {
    enterContest: { type: 'enterContest'; contest: string; item: string };
    buyFairPrize: { type: 'buyFairPrize'; deco: string };
  }
  interface ExtraEvents {
    contestResult: { type: 'contestResult'; contest: string; entry: ContestEntry; tickets: number };
    grandChampion: { type: 'grandChampion'; tickets: number; trophy: boolean };
    fairPrize: { type: 'fairPrize'; deco: string };
  }
}

function fair(state: FarmState, now?: number): FairState {
  const f = (state.fair ??= { key: '', entries: {}, tickets: 0, champion: [] });
  if (now !== undefined && f.key !== fairKey(now)) {
    f.key = fairKey(now);
    f.entries = {};
  }
  return f;
}

// --- What each contest takes, what it's worth, and when you could have it ---

const LEVEL: Record<string, number> = {};
for (const c of Object.values(CROPS)) if (!c.event) LEVEL[c.id] = c.level;
for (const t of Object.values(TREES)) LEVEL[t.product] = Math.min(LEVEL[t.product] ?? 99, t.level);
for (const d of Object.values(DISHES)) if (!d.event) LEVEL[d.id] = d.level;

const FISH = CRITTER_LIST.filter((c) => c.kind === 'fish' && !c.event);
const POOLS: Record<ContestId, string[]> = {
  produce: Object.keys(LEVEL).filter((id) => ['crop', 'fruit'].includes(ITEMS[id]?.category ?? '')),
  bakeoff: Object.keys(LEVEL).filter((id) => ITEMS[id]?.category === 'dish'),
  flowers: BLOOM_LIST.map((b) => b.id),
  fishing: FISH.map((f) => f.id),
};

/** Can this item be entered in this contest? */
export function canEnter(contest: ContestId, item: string): boolean {
  return POOLS[contest]?.includes(item) ?? false;
}

/** An entry's base points before the judge's whim. */
export function entryValue(item: string): number {
  if (Object.hasOwn(DECORATIONS, item)) return DECORATIONS[item].cost;
  return ITEMS[item]?.sell ?? 0;
}

/** Things this farm could have made by now, for featured picks and rivals. */
function reachable(contest: ContestId, level: number): string[] {
  const pool = POOLS[contest];
  if (contest === 'produce' || contest === 'bakeoff') {
    const ok = pool.filter((id) => LEVEL[id] <= Math.max(1, level));
    return ok.length ? ok : pool.slice(0, 1);
  }
  return pool;
}

/** This fair's featured entry for a contest (none for flowers and fish). */
export function featuredItem(state: FarmState, contest: ContestId, now: number): string | undefined {
  if (!CONTESTS[contest]?.featured) return undefined;
  const pool = reachable(contest, state.level);
  return pool[Math.floor(fairHash(fairKey(now), contest) * pool.length) % pool.length];
}

/** The score the best villager aims for. */
function benchmark(contest: ContestId, level: number): number {
  if (contest === 'flowers') return 110;
  const values = reachable(contest, level)
    .map(entryValue)
    .sort((a, b) => a - b);
  if (contest === 'fishing') return values[Math.floor(values.length * 0.6)];
  return values[values.length - 1] * 0.9;
}

export function fairTickets(state: FarmState): number {
  return state.fair?.tickets ?? 0;
}

/** Contests still open to enter at this fair. */
export function contestsLeft(state: FarmState, now: number): ContestId[] {
  const f = state.fair;
  const fresh = !f || f.key !== fairKey(now);
  return CONTEST_LIST.map((c) => c.id).filter((id) => fresh || !f!.entries[id]);
}

/** The current fair's entries (empty if they belong to an older fair). */
export function fairEntries(state: FarmState, now: number): FairState['entries'] {
  return state.fair?.key === fairKey(now) ? state.fair.entries : {};
}

registerFeature({
  id: 'fair',
  migrate: (state) => void fair(state),
  actions: {
    enterContest: (state, action: { contest: string; item: string }, ctx, events, kit) => {
      if (!fairOpen(ctx.now, ctx.allEvents)) throw new GameError('The County Fair opens on Saturday');
      const id = String(action.contest) as ContestId;
      const def = Object.hasOwn(CONTESTS, id) ? CONTESTS[id] : undefined;
      if (!def) throw new GameError('There is no such contest');
      const f = fair(state, ctx.now);
      if (f.entries[id]) throw new GameError(`You already entered the ${def.name}`);
      const item = String(action.item);
      if (!canEnter(id, item)) throw new GameError(`The ${def.name} takes ${def.enter}`);
      kit.takeItem(state, item, 1);

      const featured = item === featuredItem(state, id, ctx.now);
      const whim = 0.8 + 0.45 * kit.nextRandom(state);
      const score = Math.max(1, Math.round(entryValue(item) * whim * (featured ? FEATURED_MULT : 1)));
      const bench = benchmark(id, state.level);
      const pool = reachable(id, state.level);
      const top = [...pool].sort((a, b) => entryValue(b) - entryValue(a)).slice(0, Math.max(3, Math.ceil(pool.length / 3)));
      const others = RIVALS.filter((r) => r !== def.judge);
      const start = Math.floor(kit.nextRandom(state) * others.length);
      const rivals = RIVAL_SHARES.map((share, i) => ({
        who: others[(start + i) % others.length],
        item: top[Math.floor(kit.nextRandom(state) * top.length) % top.length],
        score: Math.max(1, Math.round(bench * share * (0.9 + 0.2 * kit.nextRandom(state)))),
      }));
      const place = rivals.filter((r) => r.score > score).length;
      const entry: ContestEntry = { item, score, place, featured, rivals };
      f.entries[id] = entry;
      f.tickets += PLACE_TICKETS[place];
      kit.addXp(state, PLACE_XP[place], events);
      kit.bumpStat(state, 'contest');
      if (place === 0) kit.bumpStat(state, 'blueRibbon');
      events.push({ type: 'contestResult', contest: id, entry, tickets: PLACE_TICKETS[place] });

      const all = CONTEST_LIST.map((c) => f.entries[c.id]);
      if (all.every((e) => e?.place === 0) && !f.champion.includes(f.key)) {
        f.champion.push(f.key);
        f.tickets += CHAMPION_TICKETS;
        const trophy = !state.stats['got:golden_trophy'];
        if (trophy) {
          kit.addItem(state, 'golden_trophy', 1, events);
          state.stats['got:golden_trophy'] = 1;
        }
        kit.bumpStat(state, 'champion');
        events.push({ type: 'grandChampion', tickets: CHAMPION_TICKETS, trophy });
      }
    },
    buyFairPrize: (state, action: { deco: string }, _ctx, events, kit) => {
      const prize = FAIR_PRIZES.find((p) => p.deco === String(action.deco));
      if (!prize) throw new GameError("That isn't a fair prize");
      const f = fair(state);
      if (f.tickets < prize.tickets) throw new GameError(`You need ${prize.tickets} prize tickets`);
      f.tickets -= prize.tickets;
      kit.addItem(state, prize.deco, 1, events);
      state.stats[`got:${prize.deco}`] = 1;
      events.push({ type: 'fairPrize', deco: prize.deco });
    },
  },
});
