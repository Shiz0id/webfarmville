import { describe, expect, it } from 'vitest';
import {
  ANIMALS,
  COLLECTION_LIST,
  CROPS,
  HELPERS,
  HELPER_LIST,
  ITEMS,
  MYSTERY_GIFT,
  QUESTS,
  TREES,
  applyAction,
  createFarm,
  cropStatus,
  helperCount,
  helperTargets,
  producerStatus,
  type FarmState,
  type PlotObject,
  type ProducerObject,
} from '@farm/shared';

const T0 = Date.UTC(2026, 9, 12, 12);

function farmer(): FarmState {
  const s = createFarm('Helpy', T0);
  s.level = 10;
  s.coins = 50_000;
  return s;
}

describe('helpers', () => {
  it('are special items that can never be sold', () => {
    for (const h of HELPER_LIST) {
      expect(ITEMS[h.id]?.category).toBe('special');
      expect(h.tickets).toBeGreaterThan(0);
    }
    const s = farmer();
    s.inventory.farmhand = 1;
    expect(() => applyAction(s, { type: 'sellItem', item: 'farmhand', qty: 1 }, { now: T0 })).toThrow();
  });

  it('given as items, they move straight to the tool shed', () => {
    let s = farmer();
    s.inventory.farmhand = 2;
    s = applyAction(s, { type: 'rename', name: 'Helpy Farm' }, { now: T0 }).state;
    expect(s.inventory.farmhand).toBeUndefined();
    expect(helperCount(s, 'farmhand')).toBe(2);
  });

  it('a Farmhand collects every ready animal, with all the usual rewards', () => {
    let s = farmer();
    for (const [i, x] of [3, 4, 5].entries()) s = applyAction(s, { type: 'buy', def: i ? 'cow' : 'chicken', x, y: 12 }, { now: T0 }).state;
    s.helpers = { farmhand: 1 };
    const later = T0 + ANIMALS.cow.cycleSec * 1000;
    const ready = helperTargets(s, 'farmhand', later);
    expect(ready).toHaveLength(4); // the starter chicken too
    const r = applyAction(s, { type: 'useHelper', helper: 'farmhand' }, { now: later });
    s = r.state;
    expect(s.inventory.egg).toBe(2 * ANIMALS.chicken.yield);
    expect(s.inventory.milk).toBe(2 * ANIMALS.cow.yield);
    expect(s.stats.collect).toBe(4);
    expect(helperCount(s, 'farmhand')).toBe(0);
    expect(r.events).toContainEqual({ type: 'helperUsed', helper: 'farmhand', count: 4 });
    for (const id of ready) expect(producerStatus(s.objects[id] as ProducerObject, later).ready).toBe(false);
    expect(() => applyAction(s, { type: 'useHelper', helper: 'farmhand' }, { now: later })).toThrow("don't have");
  });

  it('an Arborist picks every ready tree, and refuses when none are', () => {
    let s = farmer();
    s.helpers = { arborist: 1 };
    expect(() => applyAction(s, { type: 'useHelper', helper: 'arborist' }, { now: T0 })).toThrow('No trees');
    const tree = Object.values(s.objects).find((o) => o.kind === 'tree') as ProducerObject;
    const later = tree.cycleStart + TREES[tree.def].cycleSec * 1000;
    s = applyAction(s, { type: 'useHelper', helper: 'arborist' }, { now: later }).state;
    expect(s.inventory[TREES[tree.def].product]).toBeGreaterThanOrEqual(TREES[tree.def].yield);
    expect(s.helpers?.arborist).toBeUndefined();
  });

  it('an Unwither Charm brings every withered crop back, ripe', () => {
    let s = farmer();
    s.helpers = { unwither_charm: 1 };
    const plots = Object.values(s.objects).filter((o): o is PlotObject => o.kind === 'plot');
    for (const p of plots) {
      p.crop = 'wheat';
      p.plantedAt = T0 - 100 * 86_400_000;
    }
    expect(cropStatus(plots[0], T0).stage).toBe('withered');
    s = applyAction(s, { type: 'useHelper', helper: 'unwither_charm' }, { now: T0 }).state;
    for (const p of plots) expect(cropStatus(s.objects[p.id] as PlotObject, T0).stage).toBe('ready');
    expect(s.stats.unwither).toBe(plots.length);
    const h = applyAction(s, { type: 'harvest', id: plots[0].id }, { now: T0 }).state;
    expect(h.inventory.wheat).toBeGreaterThanOrEqual(CROPS.wheat.yield);
  });

  it('can be won at the Prize Booth with fair tickets', () => {
    let s = farmer();
    s.fair = { key: '', entries: {}, tickets: 20, champion: [] };
    s = applyAction(s, { type: 'buyHelperPrize', helper: 'farmhand' }, { now: T0 }).state;
    expect(s.fair!.tickets).toBe(20 - HELPERS.farmhand.tickets);
    expect(helperCount(s, 'farmhand')).toBe(1);
    expect(() => applyAction(s, { type: 'buyHelperPrize', helper: 'unwither_charm' }, { now: T0 })).toThrow('tickets');
  });

  it('turn up in some mystery gifts', () => {
    let s = farmer();
    s.inventory[MYSTERY_GIFT] = 60;
    let found = 0;
    for (let i = 0; i < 60; i++) {
      const r = applyAction(s, { type: 'openGift' }, { now: T0 });
      s = r.state;
      found += r.events.filter((e) => e.type === 'helperFound').length;
    }
    expect(found).toBeGreaterThan(3);
    expect(found).toBeLessThan(30);
    expect(HELPER_LIST.reduce((n, h) => n + helperCount(s, h.id), 0)).toBe(found);
  });

  it('come with every completed collection', () => {
    let s = farmer();
    const col = COLLECTION_LIST.find((c) => c.id === 'barnyard')!;
    s.collections = { have: Object.fromEntries(col.items.map((i) => [i.id, 1])), traded: {} };
    const r = applyAction(s, { type: 'tradeCollection', collection: col.id }, { now: T0 });
    expect(r.events).toContainEqual({ type: 'helperFound', helper: 'farmhand', qty: 1, from: 'collection' });
    s = r.state;
    expect(helperCount(s, 'farmhand')).toBe(1);
  });

  it('quests hand them out', () => {
    expect(QUESTS.many_hands.reward.items).toMatchObject({ farmhand: 2, arborist: 1 });
    expect(QUESTS.fairy_charm.reward.items).toMatchObject({ unwither_charm: 2 });
  });
});
