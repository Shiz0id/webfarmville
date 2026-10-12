// FarmVille-style crop mastery. Every crop can earn up to three mastery stars
// by being harvested again and again. Each star pays a reward and unlocks a
// perk for that crop, and the third star sends a Mastery Sign keepsake.

import { CROP_LIST, type CropDef } from './crops';
import type { DecoDef } from './decorations';

export const MAX_MASTERY = 3;

export interface MasteryPerk {
  title: string;
  text: string;
}

/** What each star unlocks (index 0 is the first star). */
export const MASTERY_PERKS: MasteryPerk[] = [
  { title: 'Seed Savvy', text: 'Seeds cost 10% less' },
  { title: 'Bumper Crop', text: '1 in 4 harvests gives +1 extra' },
  { title: 'Master Grower', text: '+1 on every harvest, and a Mastery Sign' },
];

/** Seed discount from the first star. */
export const SEED_DISCOUNT = 0.1;
/** Chance of an extra item from the second star on. */
export const BUMPER_CHANCE = 0.25;

/** Harvests needed for stars 1, 2 and 3. Quick crops need more; event crops need fewer. */
export function masteryGoals(def: CropDef): [number, number, number] {
  const g = def.growSec;
  const base: [number, number, number] =
    g <= 180 ? [20, 60, 150] : g <= 900 ? [15, 45, 110] : g <= 3600 ? [10, 30, 75] : g <= 14400 ? [8, 24, 60] : [6, 18, 45];
  return def.event ? (base.map((n) => Math.ceil(n / 2)) as [number, number, number]) : base;
}

/** Coins and XP for reaching `star` (1-3). */
export function masteryReward(def: CropDef, star: number): { coins: number; xp: number } {
  const mult = [1, 2, 4][star - 1] ?? 1;
  return { coins: Math.max(50, def.cost * 4) * mult, xp: [10, 25, 50][star - 1] ?? 10 };
}

export const masterySignId = (crop: string): string => `mastery_${crop}`;

/** One Mastery Sign keepsake per crop, earned with its third star. */
export const MASTERY_DECORATIONS: DecoDef[] = CROP_LIST.map((c) => ({
  id: masterySignId(c.id),
  name: `${c.name} Mastery Sign`,
  category: 'garden',
  level: 1,
  cost: 0,
  charm: 3,
  w: 1,
  h: 1,
  set: 'mastery',
  reward: `Earn 3 mastery stars for ${c.name}`,
}));
