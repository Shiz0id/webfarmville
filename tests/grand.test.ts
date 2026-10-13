import { describe, expect, it } from 'vitest';
import {
  CONSERVATORY_BONUS,
  CROPS,
  DECORATIONS,
  ITEMS,
  LANDMARKS,
  LANDMARK_LIST,
  applyAction,
  balloonReady,
  buildingStatus,
  grandCraftMs,
  createFarm,
  grandDone,
  grandStage,
  type BuildingObject,
  type FarmState,
} from '@farm/shared';

const T0 = Date.UTC(2026, 9, 12, 12);
const act = (s: FarmState, a: Parameters<typeof applyAction>[1], now = T0) => applyAction(s, a, { now });

function rich(): FarmState {
  const s = createFarm('Tycoon', T0);
  s.level = 40;
  s.coins = 50_000_000;
  s.size = 30;
  return s;
}

/** Donate everything a landmark's next stage needs. */
function stage(s: FarmState, id: string): FarmState {
  const l = LANDMARKS[id];
  for (const [item, n] of Object.entries(l.stages[grandStage(s, id)].needs)) {
    if (item !== 'coins') s.inventory[item] = (s.inventory[item] ?? 0) + n;
    s = act(s, { type: 'grandDonate', landmark: id, item, qty: n }).state;
  }
  return s;
}

/** Fund every stage and put the landmark on the farm. */
function build(s: FarmState, id: string, x = 20, y = 20): FarmState {
  s = stage(s, id);
  s = act(s, { type: 'placeStored', def: id, x, y }).state;
  for (let i = 1; i < LANDMARKS[id].stages.length; i++) s = stage(s, id);
  return s;
}

describe('grand projects', () => {
  it('asks only for real items, and each landmark is a placeable reward decoration', () => {
    for (const l of LANDMARK_LIST) {
      expect(l.stages).toHaveLength(4);
      for (const st of l.stages) for (const item of Object.keys(st.needs)) if (item !== 'coins') expect(ITEMS[item], item).toBeTruthy();
      expect(DECORATIONS[l.id]?.reward).toBeTruthy();
      expect(DECORATIONS[l.id].w).toBe(l.w);
    }
  });

  it('funds stage by stage; the first stage hands over the landmark to place', () => {
    let s = rich();
    const xp = s.xp;
    s.inventory.wheat = 30;
    s = act(s, { type: 'grandDonate', landmark: 'grand_greenhouse', item: 'wheat', qty: 30 }).state;
    expect(s.grand!.projects.grand_greenhouse.given.wheat).toBe(30);
    expect(grandStage(s, 'grand_greenhouse')).toBe(0);
    s = stage(s, 'grand_greenhouse');
    expect(grandStage(s, 'grand_greenhouse')).toBe(1);
    expect(s.inventory.grand_greenhouse).toBe(1);
    expect(s.xp).toBeGreaterThan(xp);
    expect(s.grand!.projects.grand_greenhouse.given).toEqual({});
    // It can't be sold, but it can be stored and placed again without losing progress.
    s = act(s, { type: 'placeStored', def: 'grand_greenhouse', x: 20, y: 20 }).state;
    const obj = Object.values(s.objects).find((o) => o.kind === 'deco' && o.def === 'grand_greenhouse')!;
    expect(() => act(s, { type: 'sellObject', id: obj.id })).toThrow();
    s = act(s, { type: 'store', id: obj.id }).state;
    expect(grandStage(s, 'grand_greenhouse')).toBe(1);
  });

  it('needs the level, and refuses what is not asked for or already finished', () => {
    const low = createFarm('Newbie', T0);
    low.inventory.wheat = 5;
    expect(() => act(low, { type: 'grandDonate', landmark: 'grand_greenhouse', item: 'wheat', qty: 5 })).toThrow(/level/);
    let s = rich();
    s.inventory.egg = 5;
    expect(() => act(s, { type: 'grandDonate', landmark: 'grand_greenhouse', item: 'egg', qty: 5 })).toThrow(/needed/);
    expect(() => act(s, { type: 'grandDonate', landmark: '__proto__', item: 'coins', qty: 5 })).toThrow(/Unknown/);
    s = build(s, 'grand_greenhouse');
    expect(() => act(s, { type: 'grandDonate', landmark: 'grand_greenhouse', item: 'coins', qty: 5 })).toThrow(/finished/);
  });

  it('perks only work once finished and standing on the farm', () => {
    let s = rich();
    for (let i = 0; i < 3; i++) s = stage(s, 'grand_greenhouse');
    expect(grandDone(s, 'grand_greenhouse')).toBe(false);
    s = stage(s, 'grand_greenhouse');
    expect(grandStage(s, 'grand_greenhouse')).toBe(4);
    expect(grandDone(s, 'grand_greenhouse')).toBe(false); // still in storage
    s = act(s, { type: 'placeStored', def: 'grand_greenhouse', x: 20, y: 20 }).state;
    expect(grandDone(s, 'grand_greenhouse')).toBe(true);
  });

  it('the greenhouse sometimes adds a bonus crop', () => {
    let s = build(rich(), 'grand_greenhouse');
    s.objects.p = { id: 'p', kind: 'plot', x: 0, y: 20 };
    let bonus = 0;
    for (let i = 0; i < 80; i++) {
      Object.assign(s.objects.p, { crop: 'strawberry', plantedAt: T0 - 120_000 });
      const before = s.inventory.strawberry ?? 0;
      s = act(s, { type: 'harvest', id: 'p' }).state;
      bonus += (s.inventory.strawberry ?? 0) - before - CROPS.strawberry.yield;
    }
    expect(bonus).toBeGreaterThan(5);
    expect(bonus).toBeLessThan(40);
  });

  it('the greenhouse rolls once per plot when a harvester does the harvesting', () => {
    // Against the same farm without it: mastery adds bonus crops of its own.
    const run = (built: boolean) => {
      let s = rich();
      if (built) s = build(s, 'grand_greenhouse');
      s = act(s, { type: 'buyVehicle', vehicle: 'harvester' }).state;
      const plots = Object.values(s.objects).filter((o) => o.kind === 'plot' && o.x >= 7 && o.x <= 9 && o.y >= 5 && o.y <= 7);
      let got = 0;
      for (let i = 0; i < 80; i++) {
        const now = T0 + i * 3600_000;
        for (const p of plots) Object.assign(s.objects[p.id], { crop: 'strawberry', plantedAt: now - 120_000 });
        const before = s.inventory.strawberry ?? 0;
        s = act(s, { type: 'drive', vehicle: 'harvester', x: 8, y: 6 }, now).state;
        got += (s.inventory.strawberry ?? 0) - before;
      }
      return got / (80 * plots.length);
    };
    // About one extra in four per plot, as by hand (rolling twice would give nearly double).
    const extra = run(true) - run(false);
    expect(extra).toBeLessThan(0.36);
    expect(extra).toBeGreaterThan(0.14);
  });

  it('the windmill speeds up crafting', () => {
    const plain = rich();
    plain.inventory.wheat = 50;
    plain.objects.mill = { id: 'mill', kind: 'building', def: 'mill', x: 10, y: 0, queue: [] };
    const slow = act(plain, { type: 'craft', id: 'mill', recipe: 'flour' }).state;
    const fast = act(build(structuredClone(plain), 'lighthouse_windmill'), { type: 'craft', id: 'mill', recipe: 'flour' }).state;
    const len = (s: FarmState) => (s.objects.mill as { queue: { end: number }[] }).queue[0].end - T0;
    expect(len(fast)).toBe(Math.round(len(slow) * 0.75));
    // What the workshop panel shows, and the progress bar starts from empty.
    expect(grandCraftMs(fast, len(slow))).toBe(len(fast));
    expect(buildingStatus(fast.objects.mill as BuildingObject, T0).active?.progress).toBe(0);
  });

  it('the conservatory adds to sales', () => {
    let s = build(rich(), 'botanical_conservatory');
    s.inventory.wheat = 100;
    const coins = s.coins;
    s = act(s, { type: 'sellItem', item: 'wheat', qty: 100 }).state;
    const base = 100 * ITEMS.wheat.sell;
    expect(s.coins - coins).toBe(base + Math.round(base * CONSERVATORY_BONUS));
  });

  it('the balloon brings one gift a day', () => {
    let s = build(rich(), 'balloon_dock');
    const dock = Object.values(s.objects).find((o) => o.kind === 'deco' && o.def === 'balloon_dock')!;
    expect(balloonReady(s, '2026-10-12')).toBe(true);
    const coins = s.coins;
    const r = act(s, { type: 'balloonGift', id: dock.id });
    s = r.state;
    expect(s.coins).toBe(coins + 400 * s.level);
    expect(s.inventory.mystery_gift).toBeGreaterThan(0);
    expect(r.events.some((e) => e.type === 'balloonGift')).toBe(true);
    expect(balloonReady(s, '2026-10-12')).toBe(false);
    expect(() => act(s, { type: 'balloonGift', id: dock.id })).toThrow(/tomorrow/);
    s = act(s, { type: 'balloonGift', id: dock.id }, T0 + 86_400_000).state;
  });
});
