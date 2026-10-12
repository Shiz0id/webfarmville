import { describe, expect, it } from 'vitest';
import {
  ANIMAL_LIST,
  BUILDING_LIST,
  CROP_LIST,
  CROPS,
  DECORATION_LIST,
  GIFT_LIST,
  ITEMS,
  QUEST_LIST,
  QUESTS,
  TREE_LIST,
  applyAction,
  applyHelp,
  createFarm,
  cropStatus,
  isEventActive,
  EVENTS,
  isQuestComplete,
  levelForXp,
  objectAt,
  placeable,
  xpForLevel,
  type Action,
  type FarmState,
  type PlotObject,
} from '@farm/shared';

const T0 = Date.UTC(2026, 9, 12, 12, 0, 0); // Oct 12: Halloween + Harvest running

function act(state: FarmState, action: Action, now = T0) {
  return applyAction(state, action, { now });
}

function plots(state: FarmState): PlotObject[] {
  return Object.values(state.objects).filter((o): o is PlotObject => o.kind === 'plot');
}

describe('content integrity', () => {
  it('has unique ids across placeables', () => {
    const ids = [...TREE_LIST, ...ANIMAL_LIST, ...BUILDING_LIST, ...DECORATION_LIST].map((d) => d.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every produced or consumed item exists', () => {
    for (const c of CROP_LIST) expect(ITEMS[c.id], c.id).toBeDefined();
    for (const p of [...TREE_LIST, ...ANIMAL_LIST]) expect(ITEMS[p.product], p.product).toBeDefined();
    for (const b of BUILDING_LIST)
      for (const r of b.recipes) {
        expect(ITEMS[r.output], r.output).toBeDefined();
        for (const input of Object.keys(r.inputs)) expect(ITEMS[input], input).toBeDefined();
      }
    for (const g of GIFT_LIST) expect(ITEMS[g.id] ?? placeable(g.id), g.id).toBeDefined();
  });

  it('quests reference real quests and are ordered after their requirements', () => {
    QUEST_LIST.forEach((q, i) => {
      for (const r of q.requires) {
        expect(QUESTS[r], r).toBeDefined();
        expect(QUEST_LIST.findIndex((x) => x.id === r)).toBeLessThan(i);
      }
    });
  });

  it('has a big decoration catalogue with seasonal sets', () => {
    expect(DECORATION_LIST.length).toBeGreaterThan(130);
    const events = new Set(DECORATION_LIST.filter((d) => d.event).map((d) => d.event));
    expect(events.size).toBeGreaterThanOrEqual(10);
    for (const e of events) expect(EVENTS[e!], e).toBeDefined();
  });

  it('levels are monotonic', () => {
    for (let l = 2; l <= 50; l++) expect(xpForLevel(l)).toBeGreaterThan(xpForLevel(l - 1));
    expect(levelForXp(0)).toBe(1);
    expect(levelForXp(xpForLevel(10))).toBe(10);
  });
});

describe('farming loop', () => {
  it('starts with ripening strawberries and harvests them', () => {
    let s = createFarm('Test', T0);
    expect(s.quests.active).toContain('welcome');
    const ripe = plots(s).filter((p) => p.crop);
    expect(ripe).toHaveLength(3);
    expect(() => act(s, { type: 'harvest', id: ripe[0].id })).toThrow('Not ready');
    const later = T0 + 15_000;
    for (const p of ripe) s = applyAction(s, { type: 'harvest', id: p.id }, { now: later }).state;
    expect(s.inventory.strawberry).toBe(6);
    expect(isQuestComplete(s, 'welcome')).toBe(true);
    const claimed = applyAction(s, { type: 'claimQuest', quest: 'welcome' }, { now: later });
    expect(claimed.state.quests.completed).toContain('welcome');
    expect(claimed.state.quests.active).toContain('dig_in');
  });

  it('plows, plants, grows, withers and clears', () => {
    let s = createFarm('Test', T0);
    const coins = s.coins;
    s = act(s, { type: 'plow', x: 12, y: 12 }).state;
    expect(s.coins).toBe(coins - 15);
    const plot = objectAt(s, 12, 12) as PlotObject;
    expect(plot.kind).toBe('plot');
    expect(() => act(s, { type: 'plow', x: 12, y: 12 })).toThrow();
    expect(() => act(s, { type: 'plant', id: plot.id, crop: 'pumpkin' })).toThrow('level');
    s = act(s, { type: 'plant', id: plot.id, crop: 'wheat' }).state;
    const p = s.objects[plot.id] as PlotObject;
    expect(cropStatus(p, T0 + 1000).stage).toBe('sprout');
    expect(cropStatus(p, T0 + 120_000).stage).toBe('growing');
    expect(cropStatus(p, T0 + 180_000).stage).toBe('ready');
    const withered = T0 + 180_000 + 2 * 3600_000 + 1;
    expect(cropStatus(p, withered).stage).toBe('withered');
    expect(() => applyAction(s, { type: 'harvest', id: p.id }, { now: withered })).toThrow('withered');
    s = applyAction(s, { type: 'clearPlot', id: p.id }, { now: withered }).state;
    expect((s.objects[p.id] as PlotObject).crop).toBeUndefined();
  });

  it('does not mutate the input state', () => {
    const s = createFarm('Test', T0);
    const copy = structuredClone(s);
    act(s, { type: 'plow', x: 12, y: 12 });
    expect(s).toEqual(copy);
  });

  it('rejects overlapping and out-of-bounds placement', () => {
    const s = createFarm('Test', T0);
    expect(() => act(s, { type: 'buy', def: 'tulips_red', x: 2, y: 2 })).toThrow(); // farmhouse
    expect(() => act(s, { type: 'buy', def: 'tulips_red', x: 14, y: 0 })).toThrow();
    expect(() => act(s, { type: 'buy', def: 'farmhouse', x: 10, y: 10 })).toThrow('not for sale');
  });

  it('collects from animals and crafts in buildings', () => {
    let s = createFarm('Test', T0);
    s.level = 6;
    s.coins = 10_000;
    const hen = Object.values(s.objects).find((o) => o.kind === 'animal')!;
    s = act(s, { type: 'collect', id: hen.id }).state;
    expect(s.inventory.egg).toBe(2);
    expect(() => act(s, { type: 'collect', id: hen.id })).toThrow('Not ready');

    s = act(s, { type: 'buy', def: 'mill', x: 10, y: 10 }).state;
    const mill = objectAt(s, 11, 11)!;
    s.inventory.wheat = 9;
    s = act(s, { type: 'craft', id: mill.id, recipe: 'flour' }).state;
    s = act(s, { type: 'craft', id: mill.id, recipe: 'flour' }).state;
    expect(s.inventory.wheat).toBe(3);
    expect(() => act(s, { type: 'collectCrafts', id: mill.id })).toThrow();
    // Jobs run back to back: first done at +120s, second at +240s.
    s = applyAction(s, { type: 'collectCrafts', id: mill.id }, { now: T0 + 130_000 }).state;
    expect(s.inventory.flour).toBe(1);
    s = applyAction(s, { type: 'collectCrafts', id: mill.id }, { now: T0 + 250_000 }).state;
    expect(s.inventory.flour).toBe(2);
    expect(s.stats['craft:flour']).toBe(2);
  });

  it('only sells seasonal decorations during their event', () => {
    const s = createFarm('Test', T0);
    expect(isEventActive(EVENTS.halloween, T0)).toBe(true);
    expect(() => act(s, { type: 'buy', def: 'jack_o_lantern', x: 12, y: 12 })).not.toThrow();
    expect(() => act(s, { type: 'buy', def: 'snowman', x: 12, y: 12 })).toThrow('Winter');
    expect(() => applyAction(s, { type: 'buy', def: 'snowman', x: 12, y: 12 }, { now: T0, allEvents: true })).not.toThrow();
    // New Year wraps around the end of the year.
    expect(isEventActive(EVENTS.new_year, Date.UTC(2027, 0, 3))).toBe(true);
    expect(isEventActive(EVENTS.new_year, Date.UTC(2026, 11, 28))).toBe(true);
    expect(isEventActive(EVENTS.new_year, Date.UTC(2026, 5, 1))).toBe(false);
  });

  it('stores and re-places decorations, and sells items', () => {
    let s = createFarm('Test', T0);
    const bush = objectAt(s, 4, 1)!;
    s = act(s, { type: 'store', id: bush.id }).state;
    expect(s.inventory.round_bush).toBe(1);
    s = act(s, { type: 'placeStored', def: 'round_bush', x: 12, y: 0 }).state;
    expect(s.inventory.round_bush).toBeUndefined();
    s.inventory.strawberry = 5;
    const coins = s.coins;
    s = act(s, { type: 'sellItem', item: 'strawberry', qty: 5 }).state;
    expect(s.coins).toBe(coins + 5 * ITEMS.strawberry.sell);
    expect(() => act(s, { type: 'sellItem', item: 'strawberry', qty: 1 })).toThrow();
  });

  it('levels up and pays a reward', () => {
    const s = createFarm('Test', T0);
    s.xp = xpForLevel(2) - 1;
    const { state, events } = act(s, { type: 'plow', x: 12, y: 12 });
    expect(state.level).toBe(2);
    expect(events.some((e) => e.type === 'levelUp')).toBe(true);
  });

  it('claims the daily bonus once per day and tracks streaks', () => {
    let s = createFarm('Test', T0);
    s = act(s, { type: 'claimDaily' }).state;
    expect(s.daily.streak).toBe(1);
    expect(() => act(s, { type: 'claimDaily' })).toThrow('Already');
    s = applyAction(s, { type: 'claimDaily' }, { now: T0 + 86_400_000 }).state;
    expect(s.daily.streak).toBe(2);
    s = applyAction(s, { type: 'claimDaily' }, { now: T0 + 4 * 86_400_000 }).state;
    expect(s.daily.streak).toBe(1);
  });

  it('expands the farm when the level allows', () => {
    const s = createFarm('Test', T0);
    s.coins = 100_000;
    expect(() => act(s, { type: 'expand' })).toThrow('level');
    s.level = 4;
    expect(act(s, { type: 'expand' }).state.size).toBe(18);
  });
});

describe('neighbor help', () => {
  it('fertilizes growing crops once and revives withered ones', () => {
    let s = createFarm('Test', T0);
    s = act(s, { type: 'plow', x: 12, y: 12 }).state;
    const plot = objectAt(s, 12, 12)!;
    s = act(s, { type: 'plant', id: plot.id, crop: 'wheat' }).state;
    const res = applyHelp(s, plot.id, T0 + 10_000);
    expect(res.kind).toBe('fertilize');
    const p = s.objects[plot.id] as PlotObject;
    expect(p.fertilized).toBe(true);
    expect(cropStatus(p, T0 + 10_000).progress).toBeGreaterThan(0.3);
    expect(() => applyHelp(s, plot.id, T0 + 11_000)).toThrow();
    const late = T0 + 10 * 3600_000;
    expect(applyHelp(s, plot.id, late).kind).toBe('revive');
    expect(cropStatus(p, late).stage).toBe('ready');
    // Fertilized crops yield one extra.
    s = applyAction(s, { type: 'harvest', id: plot.id }, { now: late }).state;
    expect(s.inventory.wheat).toBe(CROPS.wheat.yield + 1);
  });
});

describe('hostile input', () => {
  it('rejects prototype keys without touching state or Object.prototype', () => {
    const s = createFarm('Test', T0);
    const before = JSON.stringify(s);
    const attempts: unknown[] = [
      { type: 'plant', id: 'o14', crop: 'constructor' },
      { type: 'plant', id: 'o14', crop: '__proto__' },
      { type: 'buy', def: 'toString', x: 12, y: 12 },
      { type: 'move', id: '__proto__', x: 1, y: 1 },
      { type: 'move', id: 'constructor', x: 1, y: 1 },
      { type: 'collect', id: 'hasOwnProperty' },
      { type: 'sellItem', item: '__proto__', qty: 1 },
      { type: 'sellItem', item: 'strawberry', qty: 1.5 },
      { type: 'claimQuest', quest: 'constructor' },
      { type: 'plow', x: '1', y: 1 },
      { type: 'nope' },
      null,
    ];
    for (const a of attempts) expect(() => act(s, a as Action), JSON.stringify(a)).toThrow();
    expect(JSON.stringify(s)).toBe(before);
    expect(({} as Record<string, unknown>).x).toBeUndefined();
  });
});
