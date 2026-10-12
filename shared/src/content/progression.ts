// Levels, land expansions, charm ratings and the daily bonus.

export const MAX_LEVEL = 50;

/** Total XP needed to reach `level` (level 1 needs 0). */
export function xpForLevel(level: number): number {
  if (level <= 1) return 0;
  const n = level - 1;
  return Math.round(25 * n + 12 * n ** 1.85);
}

export function levelForXp(xp: number): number {
  let level = 1;
  while (level < MAX_LEVEL && xp >= xpForLevel(level + 1)) level++;
  return level;
}

export function levelUpReward(level: number): number {
  return 50 * level;
}

export interface Expansion {
  size: number;
  cost: number;
  level: number;
}

export const START_SIZE = 14;
export const MAX_SIZE = 30;

export const EXPANSIONS: Expansion[] = [
  { size: 18, cost: 2000, level: 4 },
  { size: 22, cost: 6000, level: 8 },
  { size: 26, cost: 15000, level: 12 },
  { size: 30, cost: 35000, level: 16 },
];

export function nextExpansion(size: number): Expansion | undefined {
  return EXPANSIONS.find((e) => e.size > size);
}

export const CHARM_TIERS: { min: number; title: string }[] = [
  { min: 0, title: 'Humble Homestead' },
  { min: 25, title: 'Tidy Farm' },
  { min: 75, title: 'Pleasant Farm' },
  { min: 150, title: 'Charming Farm' },
  { min: 300, title: 'Lovely Farm' },
  { min: 600, title: 'Dream Farm' },
];

/** 0-5 stars. */
export function charmStars(charm: number): number {
  let stars = 0;
  for (let i = 0; i < CHARM_TIERS.length; i++) if (charm >= CHARM_TIERS[i].min) stars = i;
  return stars;
}

export function dailyBonus(streak: number, stars: number): { coins: number; xp: number } {
  return { coins: 60 + Math.min(streak, 7) * 15 + stars * 30, xp: 5 + Math.min(streak, 7) };
}

/** Selling placed objects returns a fraction of their price. */
export const SELL_BACK = 0.3;

/** Neighbor visits */
export const HELPS_PER_FRIEND_PER_DAY = 5;
export const HELP_REWARD = { coins: 10, xp: 2 };
/** Fraction of a growth/production cycle a neighbor's help skips. */
export const HELP_BOOST = 0.3;
