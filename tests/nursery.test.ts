import { describe, expect, it } from 'vitest';
import {
  ANIMALS,
  BABY_ANIMALS,
  BABY_NAMES,
  CUDDLE_EVERY,
  CUDDLE_SKIP,
  DECORATIONS,
  NURSERY_DECO,
  NURSERY_MULT,
  applyAction,
  applyHelp,
  babyGrowMs,
  babyPrice,
  createFarm,
  helpKind,
  isBaby,
  nearNursery,
  producerStatus,
  type FarmState,
  type ProducerObject,
} from '@farm/shared';

const T0 = Date.UTC(2026, 9, 12, 12);
const MIN = 60_000;

function farmer(level = 10, coins = 5000): FarmState {
  const s = createFarm('Nana', T0);
  s.level = level;
  s.coins = coins;
  return s;
}

function buyBaby(s: FarmState, def = 'cow', x = 12, y = 3, now = T0): { s: FarmState; obj: ProducerObject } {
  const r = applyAction(s, { type: 'buyBaby', def, x, y }, { now });
  const obj = Object.values(r.state.objects).find((o) => o.kind === 'animal' && o.x === x && o.y === y) as ProducerObject;
  return { s: r.state, obj };
}

describe('baby animals', () => {
  it('every baby is a real animal with a cute name; beehives do not come as babies', () => {
    for (const a of BABY_ANIMALS) {
      expect(ANIMALS[a]).toBeTruthy();
      expect(BABY_NAMES[a]).toBeTruthy();
    }
    expect(BABY_ANIMALS).not.toContain('beehive');
    expect(() => applyAction(farmer(), { type: 'buyBaby', def: 'beehive', x: 12, y: 3 }, { now: T0 })).toThrow('baby');
  });

  it('grow-up time is three cycles, kept between half an hour and half a day', () => {
    expect(babyGrowMs(ANIMALS.chicken)).toBe(30 * MIN);
    expect(babyGrowMs(ANIMALS.cow)).toBe(3 * 3600_000);
    expect(babyGrowMs(ANIMALS.goat)).toBe(12 * 3600_000);
  });

  it('costs half as much and grows into a producing adult', () => {
    const s0 = farmer();
    const { s, obj } = buyBaby(s0);
    expect(s.coins).toBe(s0.coins - babyPrice(ANIMALS.cow));
    expect(babyPrice(ANIMALS.cow)).toBe(150);
    expect(isBaby(obj, T0)).toBe(true);
    expect(obj.grownAt).toBe(T0 + babyGrowMs(ANIMALS.cow));
    expect(producerStatus(obj, T0).ready).toBe(false);
    expect(() => applyAction(s, { type: 'collect', id: obj.id }, { now: obj.grownAt! })).toThrow('Not ready');
    // The next action after it has grown up graduates it.
    const r = applyAction(s, { type: 'lonelyArrive' }, { now: obj.grownAt! + 1 });
    expect(r.events).toContainEqual(expect.objectContaining({ type: 'grewUp', id: obj.id, def: 'cow' }));
    const grown = r.state.objects[obj.id] as ProducerObject;
    expect(grown.grownAt).toBeUndefined();
    expect(r.state.stats.raised).toBe(1);
    const ready = obj.grownAt! + ANIMALS.cow.cycleSec * 1000;
    expect(producerStatus(grown, ready).ready).toBe(true);
    const c = applyAction(r.state, { type: 'collect', id: obj.id }, { now: ready });
    expect(c.state.inventory.milk).toBe(ANIMALS.cow.yield);
  });

  it('respects levels, money and space', () => {
    expect(() => applyAction(farmer(1), { type: 'buyBaby', def: 'cow', x: 12, y: 3 }, { now: T0 })).toThrow('level');
    expect(() => applyAction(farmer(10, 10), { type: 'buyBaby', def: 'cow', x: 12, y: 3 }, { now: T0 })).toThrow();
    const { s } = buyBaby(farmer());
    expect(() => applyAction(s, { type: 'buyBaby', def: 'cow', x: 12, y: 3 }, { now: T0 })).toThrow('place');
  });

  it('cuddles once an hour bring growing up closer', () => {
    let { s, obj } = buyBaby(farmer());
    const grow = babyGrowMs(ANIMALS.cow);
    let r = applyAction(s, { type: 'cuddleBaby', id: obj.id }, { now: T0 });
    s = r.state;
    expect((s.objects[obj.id] as ProducerObject).grownAt).toBe(T0 + grow - grow * CUDDLE_SKIP);
    expect(s.stats.cuddle).toBe(1);
    expect(r.events).toContainEqual(expect.objectContaining({ type: 'cuddled', grown: false }));
    expect(() => applyAction(s, { type: 'cuddleBaby', id: obj.id }, { now: T0 + 10 * MIN })).toThrow('napping');
    r = applyAction(s, { type: 'cuddleBaby', id: obj.id }, { now: T0 + CUDDLE_EVERY });
    expect(r.state.stats.cuddle).toBe(2);
    // Grown-ups can't be cuddled as babies.
    const later = (r.state.objects[obj.id] as ProducerObject).grownAt! + 1;
    expect(() => applyAction(r.state, { type: 'cuddleBaby', id: obj.id }, { now: later })).toThrow('grown up');
  });

  it('a Nursery Barn doubles every cuddle nearby', () => {
    expect(DECORATIONS[NURSERY_DECO]).toMatchObject({ w: 3, h: 3, set: 'nursery' });
    let s = applyAction(farmer(), { type: 'buy', def: NURSERY_DECO, x: 11, y: 10 }, { now: T0 }).state;
    expect(nearNursery(s, 11, 8)).toBe(true);
    expect(nearNursery(s, 2, 12)).toBe(false);
    const near = buyBaby(s, 'cow', 11, 8);
    const far = buyBaby(near.s, 'cow', 2, 12);
    s = far.s;
    s = applyAction(s, { type: 'cuddleBaby', id: near.obj.id }, { now: T0 }).state;
    s = applyAction(s, { type: 'cuddleBaby', id: far.obj.id }, { now: T0 }).state;
    const grow = babyGrowMs(ANIMALS.cow);
    expect((s.objects[near.obj.id] as ProducerObject).grownAt).toBe(T0 + grow - grow * CUDDLE_SKIP * NURSERY_MULT);
    expect((s.objects[far.obj.id] as ProducerObject).grownAt).toBe(T0 + grow - grow * CUDDLE_SKIP);
  });

  it('enough cuddles grow a chick up on the spot', () => {
    let { s, obj } = buyBaby(farmer(), 'chicken');
    let now = T0;
    let grown = false;
    for (let i = 0; i < 10 && !grown; i++, now += CUDDLE_EVERY) {
      const cur = s.objects[obj.id] as ProducerObject;
      if (!isBaby(cur, now)) break;
      const r = applyAction(s, { type: 'cuddleBaby', id: obj.id }, { now });
      s = r.state;
      grown = r.events.some((e) => e.type === 'grewUp');
    }
    // A chick takes 30 minutes; the hourly nap means it grows up on its own first.
    expect(isBaby(s.objects[obj.id] as ProducerObject, now)).toBe(false);
  });

  it("a neighbor's feeding helps a baby grow, never makes it produce early", () => {
    const { s, obj } = buyBaby(farmer());
    expect(helpKind(obj, T0)).toBe('feed');
    const target = structuredClone(s);
    applyHelp(target, obj.id, T0);
    const helped = target.objects[obj.id] as ProducerObject;
    expect(helped.grownAt).toBeLessThan(obj.grownAt!);
    expect(helped.cycleStart).toBe(helped.grownAt);
    expect(producerStatus(helped, helped.grownAt!).ready).toBe(false);
  });

  it('a stored-up old save keeps producing as before', () => {
    const s = farmer();
    const chick = Object.values(s.objects).find((o) => o.kind === 'animal') as ProducerObject;
    expect(isBaby(chick, T0)).toBe(false);
    expect(producerStatus(chick, chick.cycleStart + ANIMALS.chicken.cycleSec * 1000).ready).toBe(true);
  });
});
