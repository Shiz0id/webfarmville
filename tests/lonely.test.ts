import { describe, expect, it } from 'vitest';
import {
  ANIMALS,
  LONELY_ANIMALS,
  LONELY_HOMES,
  LONELY_LEVEL,
  applyAction,
  babyGrowMs,
  createFarm,
  heartsOf,
  lonelyDue,
  lonelyWaiting,
  producerStatus,
  utcDay,
  type FarmState,
  type ProducerObject,
} from '@farm/shared';

const T0 = Date.UTC(2026, 9, 12, 12);
const DAY = 86_400_000;

function farmer(level = 6): FarmState {
  const s = createFarm('Kindly', T0);
  s.level = level;
  return s;
}

describe('lonely animals', () => {
  it('every lonely animal is a real animal with a villager who would take it in', () => {
    for (const a of LONELY_ANIMALS) {
      expect(ANIMALS[a]).toBeTruthy();
      expect(LONELY_HOMES[a]?.who).toBeTruthy();
    }
  });

  it('one visitor a day, from level 3', () => {
    expect(() => applyAction(farmer(LONELY_LEVEL - 1), { type: 'lonelyArrive' }, { now: T0 })).toThrow('level');
    let s = farmer();
    expect(lonelyDue(s, T0, utcDay)).toBe(true);
    const r = applyAction(s, { type: 'lonelyArrive' }, { now: T0 });
    s = r.state;
    const e = r.events.find((x) => x.type === 'lonelyArrived') as { animal: string; name: string };
    expect(LONELY_ANIMALS).toContain(e.animal);
    expect(ANIMALS[e.animal].level).toBeLessThanOrEqual(s.level + 4);
    expect(lonelyWaiting(s, T0, utcDay)?.name).toBe(e.name);
    expect(lonelyDue(s, T0, utcDay)).toBe(false);
    expect(() => applyAction(s, { type: 'lonelyArrive' }, { now: T0 + 1000 })).toThrow('No more');
    // It wanders off at the end of the day and someone new may come.
    expect(lonelyWaiting(s, T0 + DAY, utcDay)).toBeNull();
    expect(() => applyAction(s, { type: 'adoptLonely', x: 5, y: 5 }, { now: T0 + DAY })).toThrow('wandered off');
    expect(applyAction(s, { type: 'lonelyArrive' }, { now: T0 + DAY }).state.lonely?.day).toBe(utcDay(T0 + DAY));
  });

  it('adopting settles the animal on the nearest free tile, named, as a baby who grows up', () => {
    let s = applyAction(farmer(), { type: 'lonelyArrive' }, { now: T0 }).state;
    const { animal, name } = s.lonely!;
    // (2, 8) holds the starter chicken, so it settles right next to it.
    const r = applyAction(s, { type: 'adoptLonely', x: 2, y: 8 }, { now: T0 });
    s = r.state;
    const ev = r.events.find((x) => x.type === 'lonelyAdopted') as { id: string };
    const obj = s.objects[ev.id] as ProducerObject;
    expect(obj).toMatchObject({ kind: 'animal', def: animal, nick: name });
    expect(Math.max(Math.abs(obj.x - 2), Math.abs(obj.y - 8))).toBe(1);
    // Lonely animals arrive as babies: nothing to collect until they grow up.
    expect(obj.grownAt).toBe(T0 + babyGrowMs(ANIMALS[animal]));
    expect(producerStatus(obj, T0).ready).toBe(false);
    expect(s.lonely!.done).toBe('adopted');
    expect(s.stats.lonely).toBe(1);
    expect(() => applyAction(s, { type: 'rehomeLonely' }, { now: T0 })).toThrow('wandered off');
    expect(() => applyAction(s, { type: 'collect', id: obj.id }, { now: T0 })).toThrow('Not ready');
    const later = obj.grownAt! + ANIMALS[animal].cycleSec * 1000;
    expect(applyAction(s, { type: 'collect', id: obj.id }, { now: later }).state.inventory[ANIMALS[animal].product]).toBeGreaterThan(0);
  });

  it('a villager can give it a home instead, and becomes a closer friend', () => {
    let s = applyAction(farmer(), { type: 'lonelyArrive' }, { now: T0 }).state;
    const home = LONELY_HOMES[s.lonely!.animal];
    const coins = s.coins;
    const r = applyAction(s, { type: 'rehomeLonely' }, { now: T0 });
    s = r.state;
    expect(s.coins).toBeGreaterThan(coins);
    expect(s.inventory.mystery_gift).toBe(1);
    expect(s.friends!.points[home.who]).toBe(60);
    expect(heartsOf(s, home.who)).toBe(0);
    expect(s.lonely!.done).toBe('rehomed');
    expect(r.events.find((x) => x.type === 'lonelyRehomed')).toMatchObject({ who: home.who });
  });
});
