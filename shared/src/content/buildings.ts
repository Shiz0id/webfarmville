export interface RecipeDef {
  id: string;
  /** Output item id. */
  output: string;
  qty: number;
  inputs: Record<string, number>;
  craftSec: number;
  xp: number;
}

export interface BuildingDef {
  id: string;
  name: string;
  level: number;
  cost: number;
  w: number;
  h: number;
  /** How many recipes may be queued at once. */
  slots: number;
  charm: number;
  recipes: RecipeDef[];
  /** Starter buildings cannot be bought or sold. */
  starter?: boolean;
}

const r = (
  output: string,
  inputs: Record<string, number>,
  craftSec: number,
  xp: number,
  qty = 1,
): RecipeDef => ({ id: output, output, qty, inputs, craftSec, xp });

export const BUILDING_LIST: BuildingDef[] = [
  {
    id: 'farmhouse',
    name: 'Farmhouse',
    level: 1,
    cost: 0,
    w: 3,
    h: 3,
    slots: 0,
    charm: 10,
    recipes: [],
    starter: true,
  },
  {
    id: 'mill',
    name: 'Windmill',
    level: 4,
    cost: 800,
    w: 2,
    h: 2,
    slots: 3,
    charm: 4,
    recipes: [
      r('flour', { wheat: 3 }, 120, 2),
      r('cornmeal', { corn: 2 }, 300, 3),
      r('rice_flour', { rice: 3 }, 900, 6),
    ],
  },
  {
    id: 'dairy',
    name: 'Dairy',
    level: 5,
    cost: 1200,
    w: 2,
    h: 2,
    slots: 3,
    charm: 3,
    recipes: [
      r('butter', { milk: 2 }, 300, 3),
      r('cheese', { milk: 3 }, 1200, 5),
      r('ice_cream', { milk: 2, strawberry: 4 }, 900, 5),
      r('goat_cheese', { goat_milk: 2 }, 1800, 8),
    ],
  },
  {
    id: 'bakery',
    name: 'Bakery',
    level: 6,
    cost: 1500,
    w: 2,
    h: 2,
    slots: 3,
    charm: 4,
    recipes: [
      r('bread', { flour: 2, egg: 1 }, 600, 4),
      r('blueberry_muffin', { flour: 1, blueberry: 2, egg: 2 }, 1200, 6),
      r('cornbread', { cornmeal: 2, egg: 1 }, 900, 6),
      r('pumpkin_pie', { flour: 1, pumpkin: 1, egg: 1 }, 1800, 7),
    ],
  },
  {
    id: 'jam_kitchen',
    name: 'Jam Kitchen',
    level: 7,
    cost: 1400,
    w: 2,
    h: 2,
    slots: 3,
    charm: 4,
    recipes: [
      r('strawberry_jam', { strawberry: 4 }, 600, 3),
      r('apple_jam', { apple: 3 }, 900, 4),
      r('cherry_jam', { cherry: 3 }, 1200, 5),
      r('marmalade', { orange: 2, lemon: 1 }, 1800, 7),
      r('cranberry_sauce', { cranberry: 3 }, 2400, 10),
    ],
  },
  {
    id: 'loom',
    name: 'Weaving Loom',
    level: 9,
    cost: 1800,
    w: 2,
    h: 2,
    slots: 2,
    charm: 3,
    recipes: [
      r('yarn', { wool: 2 }, 600, 5),
      r('cotton_cloth', { cotton: 3 }, 1200, 6),
      r('sweater', { yarn: 2 }, 2400, 10),
      r('quilt', { cotton_cloth: 2, angora: 2 }, 5400, 18),
    ],
  },
  {
    id: 'juice_bar',
    name: 'Juice Stand',
    level: 10,
    cost: 2000,
    w: 2,
    h: 2,
    slots: 3,
    charm: 5,
    recipes: [
      r('lemonade', { lemon: 2, strawberry: 1 }, 600, 5),
      r('veggie_juice', { carrot: 2, tomato: 2 }, 900, 5),
      r('grape_juice', { grape: 4 }, 1800, 8),
      r('smoothie', { peach: 2, milk: 1 }, 1500, 8),
    ],
  },
  {
    id: 'cafe',
    name: 'Cozy Café',
    level: 12,
    cost: 2500,
    w: 2,
    h: 2,
    slots: 2,
    charm: 8,
    recipes: [
      r('latte', { coffee: 2, milk: 1 }, 900, 8),
      r('lavender_tea', { lavender: 2, honey: 1 }, 1200, 8),
      r('pancakes', { flour: 2, egg: 2, maple_syrup: 1 }, 2400, 12),
      r('truffle_pasta', { flour: 2, truffle: 1, cheese: 1 }, 3600, 14),
    ],
  },
];

export const BUILDINGS: Record<string, BuildingDef> = Object.fromEntries(BUILDING_LIST.map((b) => [b.id, b]));

export function findRecipe(buildingId: string, recipeId: string): RecipeDef | undefined {
  return BUILDINGS[buildingId]?.recipes.find((rc) => rc.id === recipeId);
}
