// Grand Projects: the late game. Four landmarks you raise on your own farm in
// four funded stages (coins plus goods), each finished one granting a lasting
// perk, and a line of "Grand" decorations priced for a farm with millions in
// the bank. The landmark itself is a decoration: funding its first stage puts
// it in storage to place, and later stages build it up wherever it stands.

import type { DecoDef } from './decorations';
import type { FarmState } from '../types';

export interface LandmarkStage {
  name: string;
  /** What has to be donated. `coins` is a pseudo-item. */
  needs: Record<string, number>;
}

export interface LandmarkDef {
  id: string;
  name: string;
  giver: string;
  level: number;
  w: number;
  h: number;
  pitch: string;
  perk: string;
  charm: number;
  /** XP for each finished stage (multiplied by the stage number). */
  xp: number;
  stages: LandmarkStage[];
}

const STAGES = ['Foundations', 'The frame', 'Finishing touches', 'Grand opening'];
const st = (...needs: Record<string, number>[]): LandmarkStage[] => needs.map((n, i) => ({ name: STAGES[i], needs: n }));

export const LANDMARK_LIST: LandmarkDef[] = [
  {
    id: 'grand_greenhouse',
    name: 'Grand Greenhouse',
    giver: 'Grandma Fern',
    level: 15,
    w: 4,
    h: 4,
    pitch: "A glasshouse full of sunshine, dearie, where seedlings grow fat and happy all year round. Every harvest will come up a little more generous.",
    perk: 'A 1-in-4 chance of a bonus crop with every harvest',
    charm: 150,
    xp: 600,
    stages: st(
      { coins: 25_000, wheat: 100, flour: 30 },
      { coins: 60_000, sunflower: 60, cotton_cloth: 10 },
      { coins: 120_000, lavender: 50, honey: 40, yarn: 10 },
      { coins: 200_000, blueberry_muffin: 15, lavender_tea: 10 },
    ),
  },
  {
    id: 'lighthouse_windmill',
    name: 'Lighthouse Windmill',
    giver: 'Mayor Maple',
    level: 18,
    w: 3,
    h: 3,
    pitch: 'Hoo-hoo! A tall striped mill with a lamp on top, so every farmer can find their way home. Its sails will turn every workshop in the county!',
    perk: 'Workshops craft 25% faster',
    charm: 180,
    xp: 900,
    stages: st(
      { coins: 75_000, corn: 120, cornmeal: 30 },
      { coins: 150_000, bread: 30, butter: 20 },
      { coins: 250_000, cheese: 25, cornbread: 20 },
      { coins: 400_000, pancakes: 10, latte: 10 },
    ),
  },
  {
    id: 'balloon_dock',
    name: 'Hot-Air Balloon Dock',
    giver: 'Penny',
    level: 22,
    w: 3,
    h: 3,
    pitch: "Oink oink! A real balloon, with a basket and bunting! It could float to the city and back every day, and bring you presents!",
    perk: 'A balloon drops off a gift basket every day',
    charm: 220,
    xp: 1300,
    stages: st(
      { coins: 150_000, cotton: 150, wool: 60 },
      { coins: 300_000, cotton_cloth: 30, yarn: 25 },
      { coins: 500_000, quilt: 6, sweater: 10 },
      { coins: 800_000, grape_juice: 20, smoothie: 20 },
    ),
  },
  {
    id: 'botanical_conservatory',
    name: 'Botanical Conservatory',
    giver: 'Rosie',
    level: 26,
    w: 4,
    h: 4,
    pitch: "A great glass dome full of the rarest flowers in the world! Everyone will come to see it, and they'll pay a little extra for anything from your farm.",
    perk: '+10% coins from sales and orders',
    charm: 300,
    xp: 1800,
    stages: st(
      { coins: 250_000, watermelon: 100, coffee: 80 },
      { coins: 500_000, marmalade: 30, cherry_jam: 30 },
      { coins: 800_000, truffle: 30, goat_cheese: 25, angora: 40 },
      { coins: 1_200_000, truffle_pasta: 12, lavender_tea: 20, cranberry_sauce: 10 },
    ),
  },
];

export const LANDMARKS: Record<string, LandmarkDef> = Object.fromEntries(LANDMARK_LIST.map((l) => [l.id, l]));

const grand = (id: string, name: string, level: number, cost: number, charm: number, size = 1): DecoDef => ({
  id,
  name,
  category: 'grand',
  level,
  cost,
  charm,
  w: size,
  h: size,
  set: 'grand',
});

export const GRAND_DECORATIONS: DecoDef[] = [
  ...LANDMARK_LIST.map(
    (l): DecoDef => ({
      id: l.id,
      name: l.name,
      category: 'grand',
      level: l.level,
      cost: 0,
      charm: l.charm,
      w: l.w,
      h: l.h,
      set: 'grand',
      reward: `Grand Project: fund its first stage`,
    }),
  ),
  grand('golden_hay_bale', 'Golden Hay Bale', 20, 100_000, 40),
  grand('golden_cow_statue', 'Golden Cow Statue', 20, 150_000, 50),
  grand('starlight_lamp', 'Starlight Lamp Post', 21, 120_000, 45),
  grand('crystal_gazebo', 'Crystal Gazebo', 22, 400_000, 120, 2),
  grand('topiary_peacock', 'Topiary Peacock', 23, 200_000, 65),
  grand('cloud_rainbow_arch', 'Cloud Rainbow Arch', 24, 250_000, 80),
  grand('swan_fountain', 'Marble Swan Fountain', 25, 500_000, 140, 2),
  grand('moonlight_blossom', 'Moonlight Blossom Tree', 27, 350_000, 100),
  grand('golden_tractor', 'Golden Tractor', 28, 600_000, 150, 2),
  grand('pearl_carousel', 'Pearl Carousel', 30, 1_000_000, 260, 2),
  grand('golden_windmill', 'Golden Windmill', 32, 800_000, 200, 2),
  grand('royal_pavilion', 'Royal Picnic Pavilion', 35, 1_500_000, 320, 2),
];

export interface GrandProgress {
  /** Stages finished so far (0 to 4). */
  stage: number;
  /** Donations toward the next stage. */
  given: Record<string, number>;
}

export interface GrandState {
  projects: Record<string, GrandProgress>;
  /** UTC day the balloon last dropped off a gift. */
  giftDay?: string;
}

declare module '../types' {
  interface FarmState {
    grand?: GrandState;
  }
}

export function grandStage(state: FarmState, id: string): number {
  return state.grand?.projects[id]?.stage ?? 0;
}

/** Is this landmark finished (so its perk works)? It only counts while it stands on the farm. */
export function grandDone(state: FarmState, id: string): boolean {
  const l = LANDMARKS[id];
  if (!l || grandStage(state, id) < l.stages.length) return false;
  return Object.values(state.objects).some((o) => o.kind === 'deco' && o.def === id);
}
