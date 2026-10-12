// The texture keys each art module is expected to provide, derived from game content.
import { ANIMAL_LIST, BUILDING_LIST, CROP_LIST, DECORATION_LIST, ITEM_LIST, TREE_LIST } from '@farm/shared';

export const UI_ICONS = ['coin', 'xp', 'charm', 'level'];

export function expectedKeys(mod: string): string[] {
  const byModule: Record<string, () => string[]> = {
    crops: () => [
      ...CROP_LIST.flatMap((c) => [0, 1, 2].map((s) => `crop:${c.id}:${s}`)),
      'crop:withered',
      ...CROP_LIST.map((c) => `icon:${c.id}`),
    ],
    trees: () => [
      ...TREE_LIST.flatMap((t) => [`tree:${t.id}`, `tree:${t.id}:ready`]),
      ...TREE_LIST.map((t) => `icon:${t.product}`),
    ],
    animals: () => [...ANIMAL_LIST.map((a) => `animal:${a.id}`), ...ANIMAL_LIST.map((a) => `icon:${a.product}`)],
    buildings: () => BUILDING_LIST.map((b) => `building:${b.id}`),
    goods: () => [
      ...ITEM_LIST.filter((i) => i.category === 'good').map((i) => `icon:${i.id}`),
      ...UI_ICONS.map((k) => `icon:${k}`),
    ],
    ground: () => [
      'ground:grass:0',
      'ground:grass:1',
      'ground:grass:2',
      'ground:grass:3',
      'ground:wild:0',
      'ground:wild:1',
      'ground:wild:2',
      'ground:plot',
      'ground:plot_fert',
      'wild:tree:0',
      'wild:tree:1',
      'wild:tree:2',
      'wild:rock',
      'wild:bush',
    ],
    decorations: () => DECORATION_LIST.filter((d) => !d.event).map((d) => `deco:${d.id}`),
    seasonal: () => DECORATION_LIST.filter((d) => d.event).map((d) => `deco:${d.id}`),
  };
  if (mod === 'all') return Object.values(byModule).flatMap((f) => f());
  return byModule[mod]?.() ?? [];
}
