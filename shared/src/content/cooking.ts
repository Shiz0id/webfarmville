// Home cooking: turn farm ingredients into dishes through little cooking
// mini-games. The better you cook, the more you make.

import { table } from './table';

/** The mini-game steps a recipe walks through. */
export type CookStep = 'chop' | 'stir' | 'heat' | 'mix' | 'sprinkle' | 'crack' | 'knead' | 'flip';

export interface DishDef {
  id: string;
  name: string;
  level: number;
  inputs: Record<string, number>;
  steps: CookStep[];
  sell: number;
  xp: number;
  /** Seasonal dishes need their event to be running. */
  event?: string;
}

const dish = (
  id: string,
  name: string,
  level: number,
  inputs: Record<string, number>,
  steps: CookStep[],
  sell: number,
  xp: number,
  event?: string,
): DishDef => ({ id, name, level, inputs, steps, sell, xp, ...(event ? { event } : {}) });

export const DISH_LIST: DishDef[] = [
  dish('veggie_salad', 'Garden Salad', 2, { carrot: 2, tomato: 2 }, ['chop', 'chop', 'sprinkle'], 110, 6),
  dish('tomato_soup', 'Tomato Soup', 3, { tomato: 3, egg: 1 }, ['chop', 'stir', 'heat'], 140, 8),
  dish('omelette', 'Fluffy Omelette', 3, { egg: 3, tomato: 1 }, ['crack', 'mix', 'flip'], 130, 8),
  dish('veggie_stirfry', 'Veggie Stir-Fry', 5, { carrot: 2, corn: 2, potato: 1 }, ['chop', 'flip', 'sprinkle'], 210, 10),
  dish('corn_chowder', 'Corn Chowder', 5, { corn: 3, potato: 2, milk: 1 }, ['chop', 'stir', 'heat'], 270, 12),
  dish('mashed_potatoes', 'Buttery Mash', 5, { potato: 3, butter: 1, milk: 1 }, ['chop', 'knead', 'stir'], 260, 12),
  dish('strawberry_shortcake', 'Strawberry Shortcake', 5, { strawberry: 5, flour: 1, egg: 1, milk: 1 }, ['crack', 'mix', 'heat', 'sprinkle'], 320, 16),
  dish('berry_parfait', 'Berry Parfait', 6, { blueberry: 3, strawberry: 3, milk: 1 }, ['mix', 'sprinkle'], 240, 12),
  dish('apple_pie', 'Grandma\'s Apple Pie', 6, { apple: 4, flour: 2, butter: 1 }, ['chop', 'knead', 'heat'], 360, 18),
  dish('carrot_cake', 'Carrot Cake', 6, { carrot: 3, flour: 2, egg: 2 }, ['chop', 'mix', 'heat', 'sprinkle'], 340, 18),
  dish('pumpkin_soup', 'Pumpkin Soup', 7, { pumpkin: 1, milk: 1, butter: 1 }, ['chop', 'stir', 'heat'], 320, 16),
  dish('pizza', 'Farmhouse Pizza', 7, { flour: 2, tomato: 3, cheese: 1 }, ['knead', 'sprinkle', 'heat'], 380, 20),
  dish('honey_cookies', 'Honey Cookies', 7, { flour: 2, butter: 1, egg: 1, honey: 1 }, ['crack', 'mix', 'knead', 'heat'], 340, 18),
  dish('sushi_rolls', 'Veggie Sushi Rolls', 11, { rice: 3, carrot: 1 }, ['chop', 'knead', 'chop'], 320, 18),
  dish('fish_tacos', 'Fish Tacos', 4, { bluegill: 2, tomato: 1, corn: 1 }, ['chop', 'flip', 'sprinkle'], 230, 12),
  dish('fish_and_chips', 'Fish & Chips', 6, { carp: 1, potato: 2, flour: 1 }, ['chop', 'mix', 'heat'], 300, 15),
  dish('grilled_trout', 'Lemon Grilled Trout', 8, { rainbow_trout: 1, butter: 1, lemon: 1 }, ['sprinkle', 'heat', 'flip'], 360, 18),
  dish('salmon_onigiri', 'Salmon Onigiri', 11, { salmon: 1, rice: 2 }, ['chop', 'knead', 'sprinkle'], 420, 20),
  dish('candy_apples', 'Candy Apples', 2, { apple: 3, candy: 5 }, ['stir', 'sprinkle'], 220, 14, 'halloween'),
];

export const DISHES: Record<string, DishDef> = table(DISH_LIST);

export type CookTier = 'perfect' | 'great' | 'good' | 'oops';

/** Grade a cooking score (0-100). Perfect cooking makes two dishes. */
export function cookTier(score: number): { tier: CookTier; qty: number; xpMult: number; label: string } {
  if (score >= 90) return { tier: 'perfect', qty: 2, xpMult: 2, label: 'Better than Mama!' };
  if (score >= 70) return { tier: 'great', qty: 1, xpMult: 1.5, label: 'Delicious!' };
  if (score >= 40) return { tier: 'good', qty: 1, xpMult: 1, label: 'Not bad at all!' };
  return { tier: 'oops', qty: 1, xpMult: 0.5, label: "Don't worry, Mama will fix it!" };
}

// ---------------------------------------------------------------------------
// Mama Marigold: a cheerful bear who strolls over once a day to show off her
// garden and bring a home-cooked meal.

export const MAMA = 'Mama Marigold';

export const MAMA_BRAGS = [
  'My tomatoes this year are as big as pumpkins! Well, almost. Here, try my cooking!',
  'Oh honey, my sunflowers grew taller than my roof! I brought you something warm.',
  "I've been talking to my carrots every morning. They LOVE it. Eat up, dear!",
  'My herb spiral smells like heaven today. I made you something with love!',
  'Have you seen my greenhouse? Everyone says it\'s the prettiest in the valley!',
  'My strawberries won a blue ribbon. Again! I saved you a little treat.',
  "A garden is just a kitchen that hasn't been cooked yet! Here, I made lunch.",
  'My roses smell so sweet the bees line up. Come visit my garden sometime!',
];
