import { describe, expect, it } from 'vitest';
import {
  ANIMALS,
  BUILDINGS,
  FEEDS,
  FEED_LIST,
  FEED_MILL,
  ITEMS,
  QUESTS,
  applyAction,
  babyGrowMs,
  bestFeed,
  canFeed,
  createFarm,
  producerStatus,
  type FarmState,
  type ProducerObject,
} from '@farm/shared';

const T0 = Date.UTC(2026, 9, 12, 12);
const MIN = 60_000;

function farmer(): FarmState {
  const s = createFarm('Fern', T0);
  s.level = 10;
  s.coins = 5000;
  return s;
}
const chickenOf = (s: FarmState) => Object.values(s.objects).find((o) => o.kind === 'animal' && o.def === 'chicken') as ProducerObject;

describe('feed mill', () => {
  it('is a real workshop whose feed is a sellable good', () => {
    const mill = BUILDINGS[FEED_MILL];
    expect(mill).toMatchObject({ w: 2, h: 2, slots: 3 });
    for (const f of FEED_LIST) {
      expect(ITEMS[f.id]?.category).toBe('good');
      expect(mill.recipes.some((r) => r.output === f.id)).toBe(true);
    }
    expect(QUESTS.fresh_feed).toBeTruthy();
  });

  it('grinds wheat and carrots into Barnyard Feed', () => {
    let s = farmer();
    s.inventory.wheat = 4;
    s.inventory.carrot = 2;
    s = applyAction(s, { type: 'buy', def: FEED_MILL, x: 11, y: 10 }, { now: T0 }).state;
    const mill = Object.values(s.objects).find((o) => o.def === FEED_MILL)!;
    s = applyAction(s, { type: 'craft', id: mill.id, recipe: 'animal_feed' }, { now: T0 }).state;
    expect(s.inventory.wheat).toBe(2);
    s = applyAction(s, { type: 'collectCrafts', id: mill.id }, { now: T0 + 90_000 }).state;
    expect(s.inventory.animal_feed).toBe(3);
    expect(s.stats['craft:animal_feed']).toBe(3);
  });

  it('a fed grown-up gets going sooner and gives a bonus at its next collection', () => {
    let s = farmer();
    s.inventory.animal_feed = 2;
    const hen = chickenOf(s);
    const cycle = ANIMALS.chicken.cycleSec * 1000;
    // Just collected: a fresh cycle.
    hen.cycleStart = T0;
    const r = applyAction(s, { type: 'feedAnimal', id: hen.id }, { now: T0 });
    s = r.state;
    expect(r.events).toContainEqual(expect.objectContaining({ type: 'fedAnimal', feed: 'animal_feed', baby: false }));
    expect(s.inventory.animal_feed).toBe(1);
    const fed = s.objects[hen.id] as ProducerObject;
    expect(fed.fed).toBe('animal_feed');
    expect(fed.cycleStart).toBe(T0 - cycle * FEEDS.animal_feed.skip);
    expect(canFeed(fed, T0)).toBe(false);
    expect(() => applyAction(s, { type: 'feedAnimal', id: hen.id }, { now: T0 })).toThrow('Already fed');
    const ready = producerStatus(fed, T0).readyAt;
    expect(ready).toBe(T0 + cycle * 0.75);
    const c = applyAction(s, { type: 'collect', id: hen.id }, { now: ready });
    expect(c.state.inventory.egg).toBe(ANIMALS.chicken.yield + FEEDS.animal_feed.bonus);
    expect(c.events).toContainEqual(expect.objectContaining({ type: 'feedBonus', item: 'egg', qty: 1 }));
    expect((c.state.objects[hen.id] as ProducerObject).fed).toBeUndefined();
    // And it can be fed again afterwards.
    expect(canFeed(c.state.objects[hen.id] as ProducerObject, ready)).toBe(true);
  });

  it('Deluxe Feed gives more, and is used only when there is no plain feed', () => {
    let s = farmer();
    s.inventory.deluxe_feed = 1;
    expect(bestFeed(s)).toBe('deluxe_feed');
    s.inventory.animal_feed = 1;
    expect(bestFeed(s)).toBe('animal_feed');
    const hen = chickenOf(s);
    hen.cycleStart = T0;
    s = applyAction(s, { type: 'feedAnimal', id: hen.id, feed: 'deluxe_feed' }, { now: T0 }).state;
    const c = applyAction(s, { type: 'collect', id: hen.id }, { now: T0 + ANIMALS.chicken.cycleSec * 500 });
    expect(c.state.inventory.egg).toBe(ANIMALS.chicken.yield + 2);
  });

  it('feeding a ready animal keeps it ready and still pays the bonus', () => {
    let s = farmer();
    s.inventory.animal_feed = 1;
    const hen = chickenOf(s);
    hen.cycleStart = T0 - 2 * ANIMALS.chicken.cycleSec * 1000;
    s = applyAction(s, { type: 'feedAnimal', id: hen.id }, { now: T0 }).state;
    expect(producerStatus(s.objects[hen.id] as ProducerObject, T0).ready).toBe(true);
    expect(applyAction(s, { type: 'collect', id: hen.id }, { now: T0 }).state.inventory.egg).toBe(ANIMALS.chicken.yield + 1);
  });

  it('feeding a baby helps it grow up, as often as you like', () => {
    let s = farmer();
    s.inventory.animal_feed = 10;
    s = applyAction(s, { type: 'buyBaby', def: 'cow', x: 12, y: 4 }, { now: T0 }).state;
    const calf = Object.values(s.objects).find((o) => o.kind === 'animal' && o.def === 'cow') as ProducerObject;
    const grow = babyGrowMs(ANIMALS.cow);
    s = applyAction(s, { type: 'feedAnimal', id: calf.id }, { now: T0 }).state;
    s = applyAction(s, { type: 'feedAnimal', id: calf.id }, { now: T0 + MIN }).state;
    const fed = s.objects[calf.id] as ProducerObject;
    expect(fed.grownAt).toBe(T0 + grow - 2 * grow * FEEDS.animal_feed.babySkip);
    expect(fed.fed).toBeUndefined();
    expect(s.stats.feed).toBe(2);
  });

  it('needs feed, and only animals eat it', () => {
    const s = farmer();
    expect(() => applyAction(s, { type: 'feedAnimal', id: chickenOf(s).id }, { now: T0 })).toThrow('Feed Mill');
    s.inventory.animal_feed = 1;
    s.inventory.wheat = 1;
    const tree = Object.values(s.objects).find((o) => o.kind === 'tree')!;
    expect(() => applyAction(s, { type: 'feedAnimal', id: tree.id }, { now: T0 })).toThrow('Only animals');
    expect(() => applyAction(s, { type: 'feedAnimal', id: chickenOf(s).id, feed: 'wheat' }, { now: T0 })).toThrow('feed');
  });
});
