// Town projects: Meadowbrook improvements the whole village chips in for, one
// at a time. Donate goods and coins; each finished project gives your farm a
// lasting perk.

import type { FarmState } from '../types';

export interface ProjectDef {
  id: string;
  name: string;
  giver: string;
  level: number;
  pitch: string;
  /** What has to be donated. `coins` is a pseudo-item. */
  needs: Record<string, number>;
  perk: string;
  xp: number;
}

export const PROJECT_LIST: ProjectDef[] = [
  {
    id: 'pond_bridge',
    name: 'Mend the Pond Bridge',
    giver: 'Grandma Fern',
    level: 3,
    pitch: "The little bridge over Meadow Pond has gone wobbly, dearie. If we fix it up, there'll be lovely new fishing spots on the far bank.",
    needs: { wheat: 40, corn: 20, flour: 10, coins: 1500 },
    perk: '+3 fishing casts every day',
    xp: 150,
  },
  {
    id: 'market_square',
    name: 'Market Square',
    giver: 'Penny',
    level: 5,
    pitch: 'Oink! Imagine a whole square of market stalls, with bunting and a fountain! More shoppers means more room on your stall!',
    needs: { bread: 8, strawberry_jam: 6, apple: 20, coins: 3000 },
    perk: '+2 slots at your market stall',
    xp: 250,
  },
  {
    id: 'kitty_shelter',
    name: 'Kitty Shelter',
    giver: 'Rosie',
    level: 6,
    pitch: "Some of the neighborhood kitties don't have a cozy place to sleep. Let's build them a shelter with heaps of blankets!",
    needs: { wool: 12, yarn: 6, cotton: 20, coins: 2500 },
    perk: 'Kitties visit your farm more often',
    xp: 250,
  },
  {
    id: 'town_orchard',
    name: 'Town Orchard',
    giver: 'Mayor Maple',
    level: 8,
    pitch: 'Hoo-hoo! A grand orchard on the hill, where everyone can picnic under the blossoms. The trees will bless every farm in town!',
    needs: { apple: 30, cherry: 20, orange: 15, honey: 10, coins: 5000 },
    perk: '+1 fruit from every tree',
    xp: 400,
  },
  {
    id: 'community_kitchen',
    name: 'Community Kitchen',
    giver: 'Mama Marigold',
    level: 10,
    pitch: "A big kitchen where the whole village can cook together! I'll teach everyone my secret recipes, sweet pea.",
    needs: { butter: 10, cheese: 8, egg: 40, milk: 20, coins: 6000 },
    perk: '+25% XP from cooking',
    xp: 500,
  },
  {
    id: 'bandstand',
    name: 'Village Bandstand',
    giver: 'Henrietta',
    level: 12,
    pitch: 'Bok! Summer concerts on the green, with lemonade and pie! Everybody will be in such a good mood.',
    needs: { cotton_cloth: 6, lemonade: 10, pumpkin_pie: 4, coins: 8000 },
    perk: 'Chatting with villagers gives double friendship',
    xp: 600,
  },
];

export const PROJECTS: Record<string, ProjectDef> = Object.fromEntries(PROJECT_LIST.map((p) => [p.id, p]));

/** Has this farm finished a town project? */
export function townDone(state: FarmState, id: string): boolean {
  return !!state.town?.done.includes(id);
}

/** The project the town is working on now (the first unfinished one). */
export function activeProject(state: FarmState): ProjectDef | undefined {
  return PROJECT_LIST.find((p) => !townDone(state, p.id));
}

export interface TownState {
  /** Donations so far to the active project. */
  given: Record<string, number>;
  done: string[];
}

declare module '../types' {
  interface FarmState {
    town?: TownState;
  }
}
