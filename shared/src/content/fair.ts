// The Meadowbrook County Fair: every weekend (Saturday and Sunday, UTC) four
// contests open. Enter your best produce, a dish, a flower and a fish once
// each; the judges score them against the villagers' entries and hand out
// ribbons and prize tickets to spend at the Prize Booth.

import type { DecoDef } from './decorations';

export type ContestId = 'produce' | 'bakeoff' | 'flowers' | 'fishing';

export interface ContestDef {
  id: ContestId;
  name: string;
  emoji: string;
  /** The villager judging it (a portrait name). */
  judge: string;
  blurb: string;
  /** What you can enter, in words. */
  enter: string;
  /** Has a featured entry each fair worth extra. */
  featured: boolean;
}

export const CONTEST_LIST: ContestDef[] = [
  {
    id: 'produce',
    name: 'Prize Produce',
    emoji: '🎃',
    judge: 'Henrietta',
    blurb: 'The plumpest, shiniest harvest in the county!',
    enter: 'a crop or fruit',
    featured: true,
  },
  {
    id: 'bakeoff',
    name: 'Great Meadowbrook Bake-Off',
    emoji: '🥧',
    judge: 'Mama Marigold',
    blurb: 'Bring your tastiest home cooking for a nibble.',
    enter: 'a dish you cooked',
    featured: true,
  },
  {
    id: 'flowers',
    name: 'Flower Show',
    emoji: '🌷',
    judge: 'Grandma Fern',
    blurb: 'Rare colours and lovely blooms win the day.',
    enter: 'tulips or roses from your barn',
    featured: false,
  },
  {
    id: 'fishing',
    name: 'Biggest Catch',
    emoji: '🐟',
    judge: 'Mayor Maple',
    blurb: 'Rare fish and whoppers impress the Mayor most.',
    enter: 'a fish',
    featured: false,
  },
];

export const CONTESTS: Record<string, ContestDef> = Object.fromEntries(CONTEST_LIST.map((c) => [c.id, c]));

/** Villagers who enter the contests against you (never their own judge). */
export const RIVALS = ['Henrietta', 'Penny', 'Rosie', 'Grandma Fern', 'Mama Marigold', 'Mayor Maple'];

/** Featured entries score this much more. */
export const FEATURED_MULT = 1.5;
/** Rivals score this share of the bench mark, best first. */
export const RIVAL_SHARES = [1.0, 0.8, 0.6];
/** Tickets and XP for 1st, 2nd, 3rd and 4th place. */
export const PLACE_TICKETS = [30, 18, 10, 5];
export const PLACE_XP = [40, 25, 15, 5];
/** Ribbon colour by place. */
export const PLACE_RIBBON = ['blue', 'red', 'white', 'yellow'] as const;
export const PLACE_NAMES = ['1st place', '2nd place', '3rd place', '4th place'];
/** Winning every contest in one fair. */
export const CHAMPION_TICKETS = 50;

const DAY = 86400_000;

/** Is the fair open (any Saturday or Sunday, UTC)? */
export function fairOpen(now: number, all = false): boolean {
  const d = new Date(now).getUTCDay();
  return all || d === 6 || d === 0;
}

/** The Saturday ("YYYY-MM-DD") of the current fair, or the next one on weekdays. */
export function fairKey(now: number): string {
  const d = new Date(now).getUTCDay();
  const back = d === 0 ? 1 : d === 6 ? 0 : -(6 - d);
  return new Date(Math.floor(now / DAY) * DAY - back * DAY).toISOString().slice(0, 10);
}

/** When the next fair opens (midnight UTC Saturday), or now if it is open. */
export function nextFairAt(now: number): number {
  if (fairOpen(now)) return now;
  return Date.parse(fairKey(now) + 'T00:00:00Z');
}

/** When the current fair closes (midnight UTC Monday). */
export function fairEndsAt(now: number): number {
  return Date.parse(fairKey(now) + 'T00:00:00Z') + 2 * DAY;
}

/** A stable 0..1 number for a fair and a salt. */
export function fairHash(key: string, salt: string): number {
  let h = 2166136261;
  for (const ch of key + '|' + salt) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return ((h >>> 0) % 100000) / 100000;
}

// ---------------------------------------------------------------------------
// The Prize Booth

export interface FairPrize {
  deco: string;
  tickets: number;
}

const fd = (id: string, name: string, charm: number, w = 1, h = 1): DecoDef => ({
  id,
  name,
  category: 'party',
  level: 1,
  cost: 0,
  charm,
  w,
  h,
  set: 'fair',
  reward: 'County Fair Prize Booth',
});

export const FAIR_DECORATIONS: DecoDef[] = [
  fd('ribbon_board', 'Prize Ribbon Board', 4),
  fd('cotton_candy_cart', 'Cotton Candy Cart', 5),
  fd('carousel_horse', 'Carousel Horse', 5),
  fd('blue_ribbon_pumpkin', 'Blue Ribbon Pumpkin', 6),
  fd('high_striker', 'High Striker', 6),
  fd('ferris_wheel', 'Little Ferris Wheel', 14, 2, 2),
  { ...fd('golden_trophy', 'Grand Champion Trophy', 10), reward: 'Win every contest at one County Fair' },
];

export const FAIR_PRIZES: FairPrize[] = [
  { deco: 'ribbon_board', tickets: 40 },
  { deco: 'cotton_candy_cart', tickets: 55 },
  { deco: 'carousel_horse', tickets: 70 },
  { deco: 'blue_ribbon_pumpkin', tickets: 80 },
  { deco: 'high_striker', tickets: 90 },
  { deco: 'ferris_wheel', tickets: 200 },
];
