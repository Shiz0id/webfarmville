// Trees and animals both produce goods on a repeating cycle, so they share a shape.

import { table } from './table';

export interface ProducerDef {
  id: string;
  name: string;
  kind: 'tree' | 'animal';
  level: number;
  cost: number;
  cycleSec: number;
  product: string;
  yield: number;
  xp: number;
}

const tree = (
  id: string,
  name: string,
  level: number,
  cost: number,
  cycleSec: number,
  product: string,
  yieldQty: number,
  xp: number,
): ProducerDef => ({ id, name, kind: 'tree', level, cost, cycleSec, product, yield: yieldQty, xp });

const animal = (
  id: string,
  name: string,
  level: number,
  cost: number,
  cycleSec: number,
  product: string,
  yieldQty: number,
  xp: number,
): ProducerDef => ({ id, name, kind: 'animal', level, cost, cycleSec, product, yield: yieldQty, xp });

export const TREE_LIST: ProducerDef[] = [
  tree('apple_tree', 'Apple Tree', 2, 150, 3600, 'apple', 3, 3),
  tree('cherry_tree', 'Cherry Tree', 3, 200, 7200, 'cherry', 4, 4),
  tree('orange_tree', 'Orange Tree', 4, 250, 10800, 'orange', 3, 5),
  tree('lemon_tree', 'Lemon Tree', 6, 300, 14400, 'lemon', 3, 6),
  tree('peach_tree', 'Peach Tree', 8, 380, 21600, 'peach', 3, 7),
  tree('banana_tree', 'Banana Tree', 10, 450, 28800, 'banana', 3, 8),
  tree('coconut_palm', 'Coconut Palm', 12, 600, 36000, 'coconut', 3, 10),
  tree('maple_tree', 'Sugar Maple', 14, 700, 43200, 'maple_syrup', 2, 12),
];

export const ANIMAL_LIST: ProducerDef[] = [
  animal('chicken', 'Chicken', 1, 100, 600, 'egg', 2, 2),
  animal('cow', 'Cow', 3, 300, 3600, 'milk', 2, 4),
  animal('sheep', 'Sheep', 5, 400, 7200, 'wool', 2, 5),
  animal('beehive', 'Beehive', 6, 350, 5400, 'honey', 2, 5),
  animal('pig', 'Pig', 7, 500, 10800, 'truffle', 1, 6),
  animal('duck', 'Duck', 9, 450, 7200, 'feather', 3, 6),
  animal('goat', 'Goat', 11, 600, 14400, 'goat_milk', 2, 8),
  animal('rabbit', 'Angora Rabbit', 13, 650, 14400, 'angora', 2, 9),
];

export const TREES: Record<string, ProducerDef> = table(TREE_LIST);
export const ANIMALS: Record<string, ProducerDef> = table(ANIMAL_LIST);
