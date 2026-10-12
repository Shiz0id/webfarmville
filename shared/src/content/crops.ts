import { table } from './table';

export interface CropDef {
  id: string;
  name: string;
  level: number;
  /** Coins to buy seeds for one plot. */
  cost: number;
  /** Seconds from planting until harvest. */
  growSec: number;
  /** Items produced (item id equals crop id). */
  yield: number;
  xp: number;
  /** Palette hint for the renderer: [plant, produce, accent]. */
  colors: [string, string, string];
}

const crop = (
  id: string,
  name: string,
  level: number,
  cost: number,
  growSec: number,
  yieldQty: number,
  xp: number,
  colors: [string, string, string],
): CropDef => ({ id, name, level, cost, growSec, yield: yieldQty, xp, colors });

export const CROP_LIST: CropDef[] = [
  crop('strawberry', 'Strawberries', 1, 10, 60, 2, 1, ['#3f9b3a', '#e8344a', '#f7e36b']),
  crop('wheat', 'Wheat', 1, 5, 180, 3, 1, ['#8fbf4a', '#e9c35a', '#c99a2e']),
  crop('carrot', 'Carrots', 2, 15, 300, 2, 2, ['#4caf50', '#f08a24', '#2e7d32']),
  crop('tomato', 'Tomatoes', 3, 25, 600, 3, 2, ['#3d8b37', '#e5432f', '#f5d04c']),
  crop('potato', 'Potatoes', 4, 30, 1200, 3, 3, ['#5aa04a', '#c79b5b', '#f1f0e0']),
  crop('corn', 'Corn', 5, 35, 1800, 3, 3, ['#6cb33f', '#f6d443', '#a6d36b']),
  crop('blueberry', 'Blueberries', 6, 45, 2700, 4, 4, ['#3b7d3b', '#4a62c9', '#9db3ff']),
  crop('pumpkin', 'Pumpkins', 7, 60, 3600, 2, 5, ['#4f8f2f', '#f28c1e', '#c75f10']),
  crop('sunflower', 'Sunflowers', 8, 50, 5400, 3, 5, ['#4f9a3c', '#ffcf2e', '#6b4422']),
  crop('cotton', 'Cotton', 9, 70, 7200, 3, 6, ['#5b8f46', '#fbfbf4', '#a77c55']),
  crop('grape', 'Grapes', 10, 90, 10800, 4, 7, ['#4c8a33', '#8a3fb0', '#b98bd6']),
  crop('rice', 'Rice', 11, 80, 14400, 5, 8, ['#7cc261', '#efe7b4', '#4a8f3a']),
  crop('coffee', 'Coffee', 12, 120, 21600, 3, 10, ['#2f7a3a', '#b3261e', '#5b3a29']),
  crop('lavender', 'Lavender', 13, 100, 28800, 4, 10, ['#6f9a5a', '#9c7fe0', '#c8b6ff']),
  crop('watermelon', 'Watermelons', 14, 150, 36000, 2, 12, ['#3f8a35', '#2f9e44', '#e9445c']),
  crop('cranberry', 'Cranberries', 15, 140, 43200, 3, 12, ['#3e7a3a', '#c2183c', '#7a1027']),
];

export const CROPS: Record<string, CropDef> = table(CROP_LIST);

/** Plowing a plot costs this many coins. */
export const PLOW_COST = 15;
export const PLOW_XP = 1;

/** Ready crops start to wither after this long (at least two hours). */
export function witherAfterSec(def: CropDef): number {
  return Math.max(def.growSec * 2, 2 * 3600);
}
