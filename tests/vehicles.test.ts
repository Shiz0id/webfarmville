import { describe, expect, it } from 'vitest';
import {
  CROPS,
  FUEL_MAX,
  FUEL_REFILL,
  VEHICLES,
  VEHICLE_LIST,
  applyAction,
  createFarm,
  cropStatus,
  fuelLevel,
  objectAt,
  vehicleOrigin,
  type FarmState,
  type PlotObject,
} from '@farm/shared';

const T0 = Date.UTC(2026, 9, 12, 12);

function farmer(): FarmState {
  let s = createFarm('Wheels', T0);
  s.level = 10;
  s.coins = 20_000;
  for (const v of VEHICLE_LIST) s = applyAction(s, { type: 'buyVehicle', vehicle: v.id }, { now: T0 }).state;
  return s;
}
const plotsIn = (s: FarmState, x: number, y: number, n: number) => {
  const out: PlotObject[] = [];
  for (let dy = 0; dy < n; dy++) for (let dx = 0; dx < n; dx++) {
    const o = objectAt(s, x + dx, y + dy);
    if (o?.kind === 'plot') out.push(o);
  }
  return out;
};

describe('vehicles', () => {
  it('are bought once each, from their level', () => {
    let s = createFarm('Wheels', T0);
    s.coins = 20_000;
    expect(() => applyAction(s, { type: 'buyVehicle', vehicle: 'tractor' }, { now: T0 })).toThrow('level');
    s.level = VEHICLES.tractor.level;
    s = applyAction(s, { type: 'buyVehicle', vehicle: 'tractor' }, { now: T0 }).state;
    expect(s.coins).toBe(20_000 - VEHICLES.tractor.cost);
    expect(s.garage!.owned).toEqual(['tractor']);
    expect(fuelLevel(s, T0)).toBe(FUEL_MAX);
    expect(() => applyAction(s, { type: 'buyVehicle', vehicle: 'tractor' }, { now: T0 })).toThrow('already');
    expect(() => applyAction(s, { type: 'drive', vehicle: 'harvester', x: 1, y: 11 }, { now: T0 })).toThrow("don't have");
  });

  it('the tractor plows a 2x2 patch of grass for one unit of fuel', () => {
    const s0 = farmer();
    const r = applyAction(s0, { type: 'drive', vehicle: 'tractor', x: 1, y: 11 }, { now: T0 });
    const s = r.state;
    expect(plotsIn(s, 1, 11, 2)).toHaveLength(4);
    expect(s.coins).toBe(s0.coins - 4 * 15);
    expect(s.stats.plow).toBe((s0.stats.plow ?? 0) + 4);
    expect(fuelLevel(s, T0)).toBe(FUEL_MAX - 1);
    expect(r.events).toContainEqual(expect.objectContaining({ type: 'drove', vehicle: 'tractor', done: 4, size: 2 }));
    // Nothing left to plow there: no fuel spent.
    expect(() => applyAction(s, { type: 'drive', vehicle: 'tractor', x: 1, y: 11 }, { now: T0 })).toThrow('No open grass');
  });

  it('the seeder plants the chosen crop, paying for seeds as usual', () => {
    let s = farmer();
    s = applyAction(s, { type: 'drive', vehicle: 'tractor', x: 1, y: 11 }, { now: T0 }).state;
    expect(() => applyAction(s, { type: 'drive', vehicle: 'seeder', x: 1, y: 11 }, { now: T0 })).toThrow('Choose');
    const coins = s.coins;
    s = applyAction(s, { type: 'drive', vehicle: 'seeder', x: 1, y: 11, crop: 'wheat' }, { now: T0 }).state;
    const plots = plotsIn(s, 1, 11, 2);
    expect(plots.every((p) => p.crop === 'wheat' && p.plantedAt === T0)).toBe(true);
    expect(s.coins).toBe(coins - 4 * CROPS.wheat.cost);
    expect(s.stats['plant:wheat']).toBe(4);
  });

  it('the harvester harvests every ripe crop in a 3x3 patch, with all the usual rewards', () => {
    let s = farmer();
    // The starter farm's six strawberry plots sit at (7..9, 5..6).
    for (const p of plotsIn(s, 7, 5, 3)) {
      p.crop = 'strawberry';
      p.plantedAt = T0 - CROPS.strawberry.growSec * 1000;
    }
    const at = T0 + 1000;
    const before = s.inventory.strawberry ?? 0;
    const r = applyAction(s, { type: 'drive', vehicle: 'harvester', x: 8, y: 6 }, { now: at });
    s = r.state;
    expect(vehicleOrigin(VEHICLES.harvester, 8, 6)).toEqual({ x: 7, y: 5 });
    const plots = plotsIn(s, 7, 5, 3);
    expect(plots).toHaveLength(6);
    expect(plots.every((p) => !p.crop)).toBe(true);
    expect(s.inventory.strawberry).toBeGreaterThanOrEqual(before + 6 * CROPS.strawberry.yield);
    expect(s.stats.harvest).toBe(6);
    // Mastery and quests notice, and only once each.
    expect(s.stats['harvest:strawberry']).toBe(6);
    expect(r.events.filter((e) => e.type === 'drove')).toHaveLength(1);
  });

  it('skips unripe crops and refuses an empty run', () => {
    let s = farmer();
    for (const p of plotsIn(s, 7, 5, 3)) {
      p.crop = 'wheat';
      p.plantedAt = T0;
    }
    expect(() => applyAction(s, { type: 'drive', vehicle: 'harvester', x: 8, y: 6 }, { now: T0 + 1000 })).toThrow('Nothing ripe');
    const one = plotsIn(s, 7, 5, 3)[0];
    one.plantedAt = T0 - CROPS.wheat.growSec * 1000;
    s = applyAction(s, { type: 'drive', vehicle: 'harvester', x: 8, y: 6 }, { now: T0 + 1000 }).state;
    expect(plotsIn(s, 7, 5, 3).filter((p) => p.crop)).toHaveLength(5);
    expect(cropStatus(plotsIn(s, 7, 5, 3).find((p) => p.crop)!, T0 + 1000).stage).not.toBe('ready');
  });

  it('runs out of fuel and refills over time', () => {
    let s = farmer();
    let now = T0;
    // Plow then un-plow the same patch to keep driving.
    for (let i = 0; i < FUEL_MAX; i++) {
      s = applyAction(s, { type: 'drive', vehicle: 'tractor', x: 1, y: 11 }, { now }).state;
      for (const p of plotsIn(s, 1, 11, 2)) delete s.objects[p.id];
    }
    expect(fuelLevel(s, now)).toBe(0);
    expect(() => applyAction(s, { type: 'drive', vehicle: 'tractor', x: 1, y: 11 }, { now })).toThrow('Out of fuel');
    now += FUEL_REFILL;
    expect(fuelLevel(s, now)).toBe(1);
    s = applyAction(s, { type: 'drive', vehicle: 'tractor', x: 1, y: 11 }, { now }).state;
    expect(fuelLevel(s, now)).toBe(0);
    expect(fuelLevel(s, now + FUEL_REFILL * 100)).toBe(FUEL_MAX);
  });

  it('stops at the edge of the farm and when coins run out', () => {
    let s = farmer();
    // Aimed at the bottom edge: only the row inside the farm gets plowed.
    const edge = applyAction(s, { type: 'drive', vehicle: 'tractor', x: 0, y: s.size - 1 }, { now: T0 }).state;
    expect(plotsIn(edge, 0, s.size - 1, 2)).toHaveLength(2);
    s.coins = 20;
    const r = applyAction(s, { type: 'drive', vehicle: 'tractor', x: 1, y: 11 }, { now: T0 });
    expect(plotsIn(r.state, 1, 11, 2)).toHaveLength(1);
    s.coins = 0;
    expect(() => applyAction(s, { type: 'drive', vehicle: 'tractor', x: 1, y: 11 }, { now: T0 })).toThrow('coins');
  });
});
