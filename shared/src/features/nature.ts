// Fishing and critter catching. The client plays a little mini-game and sends
// how well it went; the species is rolled here with the farm's seeded random,
// so the client can preview exactly what is on the line.

import {
  CAST_BONUS,
  CRITTER_LIST,
  DAILY_CASTS,
  DAILY_NETS,
  JOURNAL_TIERS,
  NET_BONUS,
  RARITY_WEIGHT,
  critterAvailable,
  type CritterDef,
  type NatureKind,
} from '../content/nature';
import { EVENTS, isEventActive } from '../content/events';
import { weatherRarityBoost } from '../content/weather';
import { registerFeature, type FeatureKit } from '../logic/features';
import { GameError, type ActionContext, type FarmState, type GameEvent } from '../types';

export interface NatureState {
  day: string;
  casts: number;
  nets: number;
  /** Biggest catch (cm) of each species. */
  best: Record<string, number>;
  /** Journal milestones claimed per kind. */
  claimed: Record<NatureKind, number>;
}

declare module '../types' {
  interface FarmState {
    nature?: NatureState;
  }
  interface ExtraActions {
    fish: { type: 'fish'; score: number; hour: number };
    catchBug: { type: 'catchBug'; score: number; hour: number };
    claimJournal: { type: 'claimJournal'; kind: NatureKind };
  }
  interface ExtraEvents {
    caught: { type: 'caught'; kind: NatureKind; what: string; size: number; first: boolean; record: boolean };
    escaped: { type: 'escaped'; kind: NatureKind; what: string };
    journal: { type: 'journal'; kind: NatureKind; deco: string };
  }
}

/** Below this mini-game score the catch always slips away. */
export const MIN_SCORE = 25;

function nature(state: FarmState): NatureState {
  return (state.nature ??= { day: '', casts: 0, nets: 0, best: {}, claimed: { fish: 0, bug: 0 } });
}

function today(state: FarmState, now: number): NatureState {
  const n = nature(state);
  const day = new Date(now).toISOString().slice(0, 10);
  if (n.day !== day) {
    n.day = day;
    n.casts = 0;
    n.nets = 0;
  }
  return n;
}

function bonus(state: FarmState, table: Record<string, number>): number {
  const owned = new Set<string>();
  for (const o of Object.values(state.objects)) if (o.kind === 'deco' && Object.hasOwn(table, o.def)) owned.add(o.def);
  let n = 0;
  for (const d of owned) n += table[d];
  return n;
}

export function dailyLimit(state: FarmState, kind: NatureKind): number {
  return kind === 'fish' ? DAILY_CASTS + bonus(state, CAST_BONUS) : DAILY_NETS + bonus(state, NET_BONUS);
}

/** Casts or nets left today. */
export function triesLeft(state: FarmState, kind: NatureKind, now: number): number {
  const n = state.nature;
  const day = new Date(now).toISOString().slice(0, 10);
  const used = !n || n.day !== day ? 0 : kind === 'fish' ? n.casts : n.nets;
  return Math.max(0, dailyLimit(state, kind) - used);
}

function eventCheck(ctx: Pick<ActionContext, 'now' | 'allEvents'>) {
  return (e: string) => !!ctx.allEvents || isEventActive(EVENTS[e], ctx.now);
}

export function availableCritters(kind: NatureKind, hour: number, ctx: Pick<ActionContext, 'now' | 'allEvents'>): CritterDef[] {
  const on = eventCheck(ctx);
  return CRITTER_LIST.filter((c) => c.kind === kind && critterAvailable(c, ctx.now, hour, on));
}

function cleanHour(hour: unknown): number {
  const h = Math.floor(Number(hour));
  return Number.isFinite(h) ? ((h % 24) + 24) % 24 : 12;
}

function cleanScore(score: unknown): number {
  return Math.max(0, Math.min(100, Math.round(Number(score) || 0)));
}

/** Pick a species, weighted by rarity (`score` is the assumed skill, which tilts toward rarer finds). */
function roll(state: FarmState, kind: NatureKind, score: number, hour: number, ctx: ActionContext, rand: () => number): CritterDef {
  const pool = availableCritters(kind, hour, ctx);
  const wet = kind === 'fish' ? (r: number) => weatherRarityBoost(ctx.now, r) : () => 1;
  const weights = pool.map((c) => RARITY_WEIGHT[c.rarity] * (1 + (score / 100) * (c.rarity - 1) * 0.5) * wet(c.rarity));
  let r = rand() * weights.reduce((a, b) => a + b, 0);
  for (let i = 0; i < pool.length; i++) {
    r -= weights[i];
    if (r < 0) return pool[i];
  }
  return pool[pool.length - 1];
}

/**
 * What the next catch would be, without changing the farm. The client uses it
 * to show the right critter or fish shadow before the player commits.
 */
export function previewCatch(state: FarmState, kind: NatureKind, hour: number, ctx: ActionContext, kit: Pick<FeatureKit, 'nextRandom'>): CritterDef {
  const copy = { seed: state.seed } as FarmState;
  return roll(copy, kind, 70, cleanHour(hour), ctx, () => kit.nextRandom(copy));
}

/** Species discovered so far. */
export function discovered(state: FarmState, kind: NatureKind): number {
  return CRITTER_LIST.filter((c) => c.kind === kind && (state.stats[`catch:${c.id}`] ?? 0) > 0).length;
}

/** The next journal milestone that can be claimed, if any. */
export function claimableJournal(state: FarmState, kind: NatureKind): number {
  const claimed = state.nature?.claimed[kind] ?? 0;
  const tier = JOURNAL_TIERS[kind][claimed];
  return tier && discovered(state, kind) >= tier.count ? 1 : 0;
}

function attempt(kind: NatureKind) {
  return (state: FarmState, action: { score: number; hour: number }, ctx: ActionContext, events: GameEvent[], kit: FeatureKit) => {
    const n = today(state, ctx.now);
    if (triesLeft(state, kind, ctx.now) <= 0)
      throw new GameError(kind === 'fish' ? 'The fish are resting. Come back tomorrow!' : 'The critters are napping. Come back tomorrow!');
    if (kind === 'fish') n.casts++;
    else n.nets++;
    const hour = cleanHour(action.hour);
    const score = cleanScore(action.score);
    // Roll with the preview's assumed score so the critter the player saw is the one they get.
    const def = roll(state, kind, 70, hour, ctx, () => kit.nextRandom(state));
    // Rarer finds need steadier hands; a fumble lets anything go.
    const escapeChance = score < MIN_SCORE ? 1 : Math.max(0, (def.rarity - 1) * 0.1 - (score - 60) / 200);
    if (kit.nextRandom(state) < escapeChance) {
      events.push({ type: 'escaped', kind, what: def.id });
      return;
    }
    const size = Math.max(1, Math.round(def.size * (0.7 + 0.6 * kit.nextRandom(state)) * (0.9 + score / 500)));
    const first = !(state.stats[`catch:${def.id}`] > 0);
    const record = !first && size > (n.best[def.id] ?? 0);
    n.best[def.id] = Math.max(n.best[def.id] ?? 0, size);
    kit.addItem(state, def.id, 1, events);
    kit.addXp(state, def.xp + (first ? 10 : 0), events);
    kit.bumpStat(state, kind);
    kit.bumpStat(state, `catch:${def.id}`);
    if (first) kit.bumpStat(state, 'discover');
    events.push({ type: 'caught', kind, what: def.id, size, first, record });
  };
}

registerFeature({
  id: 'nature',
  migrate: (state) => void nature(state),
  actions: {
    fish: attempt('fish'),
    catchBug: attempt('bug'),
    claimJournal: (state, action: { kind: NatureKind }, _ctx, events, kit) => {
      const kind = action.kind;
      if (kind !== 'fish' && kind !== 'bug') throw new GameError('Unknown journal');
      const n = nature(state);
      const tier = JOURNAL_TIERS[kind][n.claimed[kind]];
      if (!tier) throw new GameError('Every page is complete!');
      if (discovered(state, kind) < tier.count) throw new GameError(`Discover ${tier.count} kinds first`);
      n.claimed[kind]++;
      kit.earn(state, tier.coins, events);
      kit.addXp(state, tier.xp, events);
      kit.addItem(state, tier.deco, 1, events);
      events.push({ type: 'journal', kind, deco: tier.deco });
    },
  },
});

