// Helper consumables (FarmVille 1): a Farmhand collects every ready animal, an
// Arborist every ready tree, and an Unwither Charm brings every withered crop
// back, ripe. They're never bought with coins: they come from quests, mystery
// gifts, completed collections and the County Fair's Prize Booth.

import type { ItemDef } from './items';

export type HelperJob = 'animals' | 'trees' | 'unwither';

export interface HelperDef {
  id: string;
  name: string;
  em: string;
  job: HelperJob;
  blurb: string;
  /** Price at the County Fair's Prize Booth, in prize tickets. */
  tickets: number;
}

export const HELPER_LIST: HelperDef[] = [
  { id: 'farmhand', name: 'Farmhand', em: '🧑‍🌾', job: 'animals', blurb: 'Collects from every animal that is ready.', tickets: 15 },
  { id: 'arborist', name: 'Arborist', em: '🧺', job: 'trees', blurb: 'Picks every tree that is ready.', tickets: 15 },
  { id: 'unwither_charm', name: 'Unwither Charm', em: '🧚', job: 'unwither', blurb: 'Brings every withered crop back to life, ripe and ready.', tickets: 20 },
];

export const HELPERS: Record<string, HelperDef> = Object.fromEntries(HELPER_LIST.map((h) => [h.id, h]));

/** Helpers count as special items (so quests and prizes can hand them out); they move to your tool shed. */
export const HELPER_ITEMS: ItemDef[] = HELPER_LIST.map((h) => ({ id: h.id, name: h.name, category: 'special', sell: 0 }));

/** Chance that opening a mystery gift also turns up a helper. */
export const GIFT_HELPER_CHANCE = 0.2;

/** Which helper each completed collection brings along (any other collection: an Unwither Charm). */
export const COLLECTION_HELPERS: Record<string, string> = {
  barnyard: 'farmhand',
  orchard: 'arborist',
};
