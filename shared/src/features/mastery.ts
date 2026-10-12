// Crop mastery (FarmVille 1). Harvest a crop enough times and it earns up to
// three mastery stars. Each star pays coins and XP and unlocks a perk for that
// crop: cheaper seeds, a chance of bumper harvests, then +1 on every harvest
// and a Mastery Sign keepsake.

import { CROPS, type CropDef } from '../content/crops';
import {
  BUMPER_CHANCE,
  MASTERY_PERKS,
  MAX_MASTERY,
  SEED_DISCOUNT,
  masteryGoals,
  masteryReward,
  masterySignId,
} from '../content/mastery';
import { registerFeature } from '../logic/features';
import type { FarmState, GameEvent } from '../types';

export interface MasteryState {
  /** Crop id -> stars earned (1-3). */
  stars: Record<string, number>;
}

declare module '../types' {
  interface FarmState {
    mastery?: MasteryState;
  }
  interface ExtraEvents {
    masteryStar: { type: 'masteryStar'; crop: string; star: number; coins: number; xp: number; sign?: string };
    bumperCrop: { type: 'bumperCrop'; crop: string; extra: number; x?: number; y?: number };
  }
}

function mastery(state: FarmState): MasteryState {
  return (state.mastery ??= { stars: {} });
}

export function masteryStars(state: FarmState, crop: string): number {
  return state.mastery?.stars[crop] ?? 0;
}

export function masteryCount(state: FarmState, crop: string): number {
  return state.stats[`harvest:${crop}`] ?? 0;
}

/** Progress toward the next star, or null once all three are earned. */
export function masteryProgress(state: FarmState, crop: string): { have: number; need: number; star: number } | null {
  const def = CROPS[crop];
  if (!def) return null;
  const stars = masteryStars(state, crop);
  if (stars >= MAX_MASTERY) return null;
  return { have: masteryCount(state, crop), need: masteryGoals(def)[stars], star: stars + 1 };
}

/** What a plot of seeds costs this farm (mastered crops are cheaper). */
export function seedCost(state: FarmState, def: CropDef): number {
  return masteryStars(state, def.id) >= 1 ? Math.floor(def.cost * (1 - SEED_DISCOUNT)) : def.cost;
}

/** Total stars across every crop. */
export function totalMasteryStars(state: FarmState): number {
  return Object.values(state.mastery?.stars ?? {}).reduce((a, b) => a + b, 0);
}

export { MASTERY_PERKS };

registerFeature({
  id: 'mastery',
  migrate: (state) => void mastery(state),
  after: (state, action: { type: string }, _ctx, events, kit) => {
    if (action.type !== 'harvest') return;
    const got = events.find((e): e is Extract<GameEvent, { type: 'gain' }> => e.type === 'gain' && Object.hasOwn(CROPS, e.what));
    if (!got) return;
    const def = CROPS[got.what];
    const at = got.x !== undefined ? { x: got.x, y: got.y! } : undefined;
    const m = mastery(state);
    const before = m.stars[def.id] ?? 0;

    // Perks from stars already earned.
    let extra = before >= 3 ? 1 : 0;
    if (before >= 2 && kit.nextRandom(state) < BUMPER_CHANCE) extra++;
    if (extra) {
      kit.addItem(state, def.id, extra, events, at);
      events.push({ type: 'bumperCrop', crop: def.id, extra, ...at });
    }

    // New stars (several at once for crops harvested before mastery existed).
    const goals = masteryGoals(def);
    const count = state.stats[`harvest:${def.id}`] ?? 0;
    for (let star = before + 1; star <= MAX_MASTERY && count >= goals[star - 1]; star++) {
      m.stars[def.id] = star;
      const reward = masteryReward(def, star);
      kit.earn(state, reward.coins, events);
      kit.addXp(state, reward.xp, events);
      kit.bumpStat(state, 'masteryStar');
      let sign: string | undefined;
      if (star === MAX_MASTERY) {
        sign = masterySignId(def.id);
        kit.addItem(state, sign, 1, events);
        kit.bumpStat(state, 'mastered');
      }
      events.push({ type: 'masteryStar', crop: def.id, star, coins: reward.coins, xp: reward.xp, ...(sign ? { sign } : {}) });
    }
  },
});
