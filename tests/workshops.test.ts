import { describe, expect, it } from 'vitest';
import {
  BUILDINGS,
  MAX_WORKSHOP_LEVEL,
  QUESTS,
  applyAction,
  buildingStatus,
  craftMs,
  createFarm,
  upgradeCost,
  workshopSlots,
  type BuildingObject,
  type FarmState,
} from '@farm/shared';

const T0 = Date.UTC(2026, 9, 12, 12);

function withMill(level = 12): { s: FarmState; id: string } {
  let s = createFarm('Penny', T0);
  s.level = level;
  s.coins = 50_000;
  s = applyAction(s, { type: 'buy', def: 'mill', x: 11, y: 10 }, { now: T0 }).state;
  const id = Object.values(s.objects).find((o) => o.kind === 'building' && o.def === 'mill')!.id;
  return { s, id };
}

describe('workshop upgrades', () => {
  it('cost coins and the workshop’s own goods, more at each level', () => {
    const mill = BUILDINGS.mill;
    const l2 = upgradeCost(mill, 2)!;
    const l3 = upgradeCost(mill, 3)!;
    expect(l2).toEqual({ coins: Math.round(mill.cost * 0.6), goods: { flour: 5 }, playerLevel: mill.level + 1 });
    expect(l3).toEqual({ coins: Math.round(mill.cost * 1.2), goods: { flour: 10, cornmeal: 5 }, playerLevel: mill.level + 3 });
    expect(upgradeCost(mill, 4)).toBeNull();
    // A one-recipe workshop asks for more of the same thing.
    expect(upgradeCost({ ...mill, recipes: [mill.recipes[0]] }, 3)!.goods).toEqual({ flour: 15 });
  });

  it('upgrading takes the coins and goods and raises the level', () => {
    let { s, id } = withMill();
    expect(() => applyAction(s, { type: 'upgradeWorkshop', id }, { now: T0 })).toThrow('Need 5 Flour');
    s.inventory.flour = 20;
    s.inventory.cornmeal = 5;
    const coins = s.coins;
    const r = applyAction(s, { type: 'upgradeWorkshop', id }, { now: T0 });
    s = r.state;
    expect((s.objects[id] as BuildingObject).level).toBe(2);
    expect(s.inventory.flour).toBe(15);
    expect(s.coins).toBe(coins - upgradeCost(BUILDINGS.mill, 2)!.coins);
    expect(r.events).toContainEqual({ type: 'workshopUpgraded', id, def: 'mill', level: 2 });
    s = applyAction(s, { type: 'upgradeWorkshop', id }, { now: T0 }).state;
    expect((s.objects[id] as BuildingObject).level).toBe(MAX_WORKSHOP_LEVEL);
    expect(s.inventory.flour).toBe(5);
    expect(s.inventory.cornmeal).toBeUndefined();
    expect(() => applyAction(s, { type: 'upgradeWorkshop', id }, { now: T0 })).toThrow('fully upgraded');
    expect(s.stats.upgrade).toBe(2);
  });

  it('needs a high enough farm level', () => {
    const { s, id } = withMill(BUILDINGS.mill.level);
    s.inventory.flour = 20;
    expect(() => applyAction(s, { type: 'upgradeWorkshop', id }, { now: T0 })).toThrow('farm level');
  });

  it('level 2 adds a slot and crafts faster', () => {
    let { s, id } = withMill();
    const b = s.objects[id] as BuildingObject;
    expect(workshopSlots(b, BUILDINGS.mill)).toBe(3);
    b.level = 2;
    expect(workshopSlots(b, BUILDINGS.mill)).toBe(4);
    const flour = BUILDINGS.mill.recipes[0];
    expect(craftMs(b, flour)).toBe(Math.round(flour.craftSec * 1000 * 0.85));
    s.inventory.wheat = 30;
    for (let i = 0; i < 4; i++) s = applyAction(s, { type: 'craft', id, recipe: 'flour' }, { now: T0 }).state;
    expect(() => applyAction(s, { type: 'craft', id, recipe: 'flour' }, { now: T0 })).toThrow('full');
    const q = (s.objects[id] as BuildingObject).queue;
    expect(q[0].end).toBe(T0 + craftMs(b, flour));
    expect(buildingStatus(s.objects[id] as BuildingObject, T0).freeSlots).toBe(0);
  });

  it('level 3 sometimes makes a bonus item', () => {
    let { s, id } = withMill();
    (s.objects[id] as BuildingObject).level = 3;
    s.inventory.wheat = 3 * 200;
    let made = 0;
    let bonus = 0;
    let now = T0;
    for (let round = 0; round < 40; round++) {
      for (let i = 0; i < 5; i++) s = applyAction(s, { type: 'craft', id, recipe: 'flour' }, { now }).state;
      now += 10 * 3600_000;
      const r = applyAction(s, { type: 'collectCrafts', id }, { now });
      s = r.state;
      made += 5;
      bonus += r.events.filter((e) => e.type === 'workshopBonus').length;
    }
    expect(s.inventory.flour).toBe(made + bonus);
    expect(bonus).toBeGreaterThan(made * 0.1);
    expect(bonus).toBeLessThan(made * 0.4);
  });

  it('starter buildings and unknown objects cannot be upgraded', () => {
    const { s } = withMill();
    const house = Object.values(s.objects).find((o) => o.kind === 'building' && o.def === 'farmhouse')!;
    expect(() => applyAction(s, { type: 'upgradeWorkshop', id: house.id }, { now: T0 })).toThrow("can't be upgraded");
    expect(QUESTS.workshop_wonders).toBeTruthy();
  });
});
