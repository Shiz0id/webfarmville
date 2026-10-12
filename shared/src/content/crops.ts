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
  /** Only plantable while this seasonal event is running. */
  event?: string;
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
  crop('tomato', 'Tomatoes', 3, 27, 600, 3, 2, ['#3d8b37', '#e5432f', '#f5d04c']),
  crop('potato', 'Potatoes', 4, 32, 1200, 3, 3, ['#5aa04a', '#c79b5b', '#f1f0e0']),
  crop('corn', 'Corn', 5, 40, 1800, 3, 3, ['#6cb33f', '#f6d443', '#a6d36b']),
  crop('blueberry', 'Blueberries', 6, 50, 2700, 4, 4, ['#3b7d3b', '#4a62c9', '#9db3ff']),
  crop('pumpkin', 'Pumpkins', 7, 76, 3600, 2, 5, ['#4f8f2f', '#f28c1e', '#c75f10']),
  crop('sunflower', 'Sunflowers', 8, 76, 5400, 3, 5, ['#4f9a3c', '#ffcf2e', '#6b4422']),
  crop('cotton', 'Cotton', 9, 93, 7200, 3, 6, ['#5b8f46', '#fbfbf4', '#a77c55']),
  crop('grape', 'Grapes', 10, 132, 10800, 4, 7, ['#4c8a33', '#8a3fb0', '#b98bd6']),
  crop('rice', 'Rice', 11, 126, 14400, 5, 8, ['#7cc261', '#efe7b4', '#4a8f3a']),
  crop('coffee', 'Coffee', 12, 223, 21600, 3, 10, ['#2f7a3a', '#b3261e', '#5b3a29']),
  crop('lavender', 'Lavender', 13, 210, 28800, 4, 10, ['#6f9a5a', '#9c7fe0', '#c8b6ff']),
  crop('watermelon', 'Watermelons', 14, 300, 36000, 2, 12, ['#3f8a35', '#2f9e44', '#e9445c']),
  crop('cranberry', 'Cranberries', 15, 165, 43200, 3, 12, ['#3e7a3a', '#c2183c', '#7a1027']),
  // Halloween specials
  { ...crop('candy_corn', 'Candy Corn', 1, 20, 300, 3, 2, ['#5f9e3a', '#ffb02e', '#fff4d6']), event: 'halloween' },
  { ...crop('ghost_pumpkin', 'Ghost Pumpkins', 3, 45, 1500, 2, 4, ['#4f8f2f', '#f4f1ea', '#8a7fb8']), event: 'halloween' },
  // Other seasonal specials
  { ...crop('peppermint', 'Peppermint', 1, 20, 600, 3, 2, ['#3f9b5a', '#ffffff', '#e5383b']), event: 'winter' },
  { ...crop('golden_grape', 'Golden Grapes', 1, 30, 900, 3, 3, ['#4c8a33', '#ffd23f', '#f7b801']), event: 'new_year' },
  { ...crop('bok_choy', 'Bok Choy', 1, 20, 600, 3, 2, ['#6cbf5a', '#f1fae5', '#3a7d2c']), event: 'lunar_new_year' },
  { ...crop('sweetheart_rose', 'Sweetheart Roses', 1, 25, 900, 3, 3, ['#3f8a3a', '#ff4d8d', '#ffb3cf']), event: 'valentines' },
  { ...crop('four_leaf_clover', 'Four-Leaf Clovers', 1, 20, 600, 3, 2, ['#2fa84f', '#59d47a', '#ffd23f']), event: 'st_patricks' },
  { ...crop('star_melon', 'Star Melons', 1, 35, 1200, 2, 3, ['#3f8a35', '#ffe066', '#818cf8']), event: 'tanabata' },
  { ...crop('sweet_potato', 'Sweet Potatoes', 1, 20, 900, 3, 3, ['#5a9e4a', '#c8553d', '#f2a65a']), event: 'thanksgiving' },
  { ...crop('marigold', 'Marigolds', 1, 20, 600, 3, 2, ['#4f9a3c', '#ff9f1c', '#ffbf69']), event: 'diwali' },
  { ...crop('taro', 'Taro', 1, 20, 900, 3, 3, ['#4f8f4a', '#a68ab0', '#e7dcef']), event: 'mid_autumn' },
  { ...crop('matcha', 'Matcha Tea', 1, 25, 900, 3, 3, ['#4a8f3a', '#7cb342', '#c5e1a5']), event: 'hanami' },
  { ...crop('heirloom_tomato', 'Heirloom Tomatoes', 1, 20, 600, 3, 2, ['#3d8b37', '#f77f00', '#9d0208']), event: 'earth_day' },
  { ...crop('rainbow_radish', 'Rainbow Radishes', 1, 20, 600, 3, 2, ['#5aa04a', '#c77dff', '#ff8fab']), event: 'spring' },
  { ...crop('pineapple', 'Pineapples', 1, 35, 1200, 2, 3, ['#4c8a33', '#ffc300', '#7cb518']), event: 'summer' },
  { ...crop('butternut', 'Butternut Squash', 1, 25, 900, 3, 3, ['#5a8f3a', '#f4a259', '#e8c07d']), event: 'harvest' },
];

export const CROPS: Record<string, CropDef> = table(CROP_LIST);

/** Plowing a plot costs this many coins. */
export const PLOW_COST = 15;
export const PLOW_XP = 1;

/** Ready crops start to wither after this long (at least eight hours, so a crop planted in the morning keeps until the evening). */
export function witherAfterSec(def: CropDef): number {
  return Math.max(def.growSec * 2, 8 * 3600);
}
