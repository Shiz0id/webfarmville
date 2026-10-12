// Free daily gifts neighbors can send each other. Gift ids refer to an item or
// a decoration id, both of which land in the recipient's inventory.

export interface GiftDef {
  id: string;
  qty: number;
  level: number;
}

export const GIFT_LIST: GiftDef[] = [
  { id: 'egg', qty: 3, level: 1 },
  { id: 'strawberry', qty: 5, level: 1 },
  { id: 'tulips_pink', qty: 1, level: 1 },
  { id: 'daisies', qty: 1, level: 1 },
  { id: 'hay_bale', qty: 1, level: 1 },
  { id: 'milk', qty: 2, level: 3 },
  { id: 'garden_lantern', qty: 1, level: 3 },
  { id: 'wheat', qty: 6, level: 2 },
  { id: 'flour', qty: 2, level: 4 },
  { id: 'wool', qty: 2, level: 5 },
  { id: 'garden_gnome', qty: 1, level: 5 },
  { id: 'honey', qty: 1, level: 6 },
  { id: 'birdbath', qty: 1, level: 6 },
  { id: 'apple', qty: 4, level: 2 },
];

export const GIFTS: Record<string, GiftDef> = Object.fromEntries(GIFT_LIST.map((g) => [g.id, g]));
