// Every stackable thing that can sit in a player's barn: harvested produce,
// animal products and crafted goods. Decorations held in storage use their
// decoration id instead and are looked up in DECORATIONS.

import { table } from './table';

export type ItemCategory = 'crop' | 'fruit' | 'animal' | 'good' | 'special';

export interface ItemDef {
  id: string;
  name: string;
  category: ItemCategory;
  /** Coins received when sold at the market. */
  sell: number;
}

const item = (id: string, name: string, category: ItemCategory, sell: number): ItemDef => ({
  id,
  name,
  category,
  sell,
});

export const ITEM_LIST: ItemDef[] = [
  // Crops
  item('strawberry', 'Strawberry', 'crop', 8),
  item('wheat', 'Wheat', 'crop', 5),
  item('carrot', 'Carrot', 'crop', 14),
  item('tomato', 'Tomato', 'crop', 15),
  item('potato', 'Potato', 'crop', 18),
  item('corn', 'Corn', 'crop', 22),
  item('blueberry', 'Blueberry', 'crop', 20),
  item('pumpkin', 'Pumpkin', 'crop', 55),
  item('sunflower', 'Sunflower', 'crop', 38),
  item('cotton', 'Cotton', 'crop', 45),
  item('grape', 'Grapes', 'crop', 45),
  item('rice', 'Rice', 'crop', 36),
  item('coffee', 'Coffee Beans', 'crop', 95),
  item('lavender', 'Lavender', 'crop', 70),
  item('watermelon', 'Watermelon', 'crop', 190),
  item('cranberry', 'Cranberry', 'crop', 85),
  item('candy_corn', 'Candy Corn', 'crop', 25),
  item('ghost_pumpkin', 'Ghost Pumpkin', 'crop', 70),
  // Halloween currency, spent in the Candy Shop.
  item('candy', 'Candy', 'special', 0),
  // Fruit
  item('apple', 'Apple', 'fruit', 20),
  item('cherry', 'Cherries', 'fruit', 22),
  item('orange', 'Orange', 'fruit', 35),
  item('lemon', 'Lemon', 'fruit', 40),
  item('peach', 'Peach', 'fruit', 55),
  item('banana', 'Banana', 'fruit', 70),
  item('coconut', 'Coconut', 'fruit', 95),
  item('maple_syrup', 'Maple Syrup', 'fruit', 120),
  // Animal products
  item('egg', 'Egg', 'animal', 12),
  item('milk', 'Milk', 'animal', 30),
  item('wool', 'Wool', 'animal', 45),
  item('honey', 'Honey', 'animal', 50),
  item('truffle', 'Truffle', 'animal', 120),
  item('feather', 'Feather', 'animal', 25),
  item('goat_milk', 'Goat Milk', 'animal', 75),
  item('angora', 'Angora Fluff', 'animal', 85),
  // Crafted goods
  item('flour', 'Flour', 'good', 20),
  item('cornmeal', 'Cornmeal', 'good', 55),
  item('rice_flour', 'Rice Flour', 'good', 120),
  item('bread', 'Bread', 'good', 75),
  item('blueberry_muffin', 'Blueberry Muffin', 'good', 120),
  item('cornbread', 'Cornbread', 'good', 150),
  item('pumpkin_pie', 'Pumpkin Pie', 'good', 140),
  item('butter', 'Butter', 'good', 80),
  item('cheese', 'Cheese', 'good', 125),
  item('ice_cream', 'Strawberry Ice Cream', 'good', 115),
  item('goat_cheese', 'Goat Cheese', 'good', 210),
  item('strawberry_jam', 'Strawberry Jam', 'good', 50),
  item('apple_jam', 'Apple Jam', 'good', 85),
  item('cherry_jam', 'Cherry Jam', 'good', 95),
  item('marmalade', 'Marmalade', 'good', 160),
  item('cranberry_sauce', 'Cranberry Sauce', 'good', 340),
  item('yarn', 'Yarn', 'good', 130),
  item('sweater', 'Cozy Sweater', 'good', 360),
  item('cotton_cloth', 'Cotton Cloth', 'good', 180),
  item('quilt', 'Patchwork Quilt', 'good', 720),
  item('lemonade', 'Lemonade', 'good', 115),
  item('veggie_juice', 'Veggie Juice', 'good', 110),
  item('grape_juice', 'Grape Juice', 'good', 240),
  item('smoothie', 'Peach Smoothie', 'good', 200),
  item('latte', 'Latte', 'good', 290),
  item('pancakes', 'Maple Pancakes', 'good', 330),
  item('truffle_pasta', 'Truffle Pasta', 'good', 420),
  item('lavender_tea', 'Lavender Honey Tea', 'good', 240),
];

export const ITEMS: Record<string, ItemDef> = table(ITEM_LIST);
