import { describe, expect, it } from 'vitest';
import {
  BLOOMS,
  BLOOM_DECORATIONS,
  BLOOM_PERIOD,
  BLOOM_RECIPES,
  DECORATIONS,
  HYBRIDS,
  MAX_SPROUTS,
  WEATHER,
  applyAction,
  createFarm,
  weatherAt,
  type FarmState,
  type GameEvent,
} from '@farm/shared';

const T0 = Date.UTC(2026, 9, 12, 1);

function garden(...flowers: [string, number, number][]): FarmState {
  const s = createFarm('Florist', T0);
  s.level = 10;
  s.objects = {};
  for (const [def, x, y] of flowers) {
    const id = `o${s.nextId++}`;
    s.objects[id] = { id, kind: 'deco', def, x, y };
  }
  return s;
}

const idOf = (s: FarmState, def: string) => Object.values(s.objects).find((o) => o.kind === 'deco' && o.def === def)!.id;

/** Run checks over `periods` bloom periods, watering the parents each time and clearing sprouts. */
function grow(s: FarmState, parents: string[], periods: number, opts: { keep?: boolean; dry?: boolean } = {}) {
  const sprouts: Extract<GameEvent, { type: 'bloomed' }>[] = [];
  let t = T0;
  s = applyAction(s, { type: 'bloomCheck' }, { now: t }).state;
  for (let i = 0; i < periods; i++) {
    // The check at the end of a period breeds under that period's sky.
    const skip = opts.dry && WEATHER[weatherAt(t)].wet;
    for (const id of parents) s = applyAction(s, { type: 'waterFlower', id }, { now: t }).state;
    t += BLOOM_PERIOD;
    const r = applyAction(s, { type: 'bloomCheck' }, { now: t });
    s = r.state;
    for (const e of r.events)
      if (e.type === 'bloomed') {
        if (!skip) sprouts.push(e);
        if (!opts.keep) delete s.objects[e.id];
      }
  }
  return { s, sprouts };
}

describe('flower breeding', () => {
  it('every hybrid has a decoration and exactly one recipe of its own species', () => {
    expect(HYBRIDS.length).toBe(BLOOM_DECORATIONS.length);
    for (const h of HYBRIDS) {
      expect(DECORATIONS[h.id]?.reward, h.id).toBeTruthy();
      expect(BLOOM_RECIPES.filter((r) => r.child === h.id)).toHaveLength(1);
    }
    for (const r of BLOOM_RECIPES) {
      expect(BLOOMS[r.a].species).toBe(BLOOMS[r.child].species);
      expect(BLOOMS[r.b].species).toBe(BLOOMS[r.child].species);
    }
  });

  it('waters a flower once per period, and only tulips and roses', () => {
    let s = garden(['tulips_red', 3, 3], ['daisies', 5, 5]);
    s = applyAction(s, { type: 'waterFlower', id: idOf(s, 'tulips_red') }, { now: T0 }).state;
    expect(s.stats.waterFlower).toBe(1);
    expect(() => applyAction(s, { type: 'waterFlower', id: idOf(s, 'tulips_red') }, { now: T0 + 1000 })).toThrow(/already/);
    expect(() => applyAction(s, { type: 'waterFlower', id: idOf(s, 'daisies') }, { now: T0 })).toThrow(/tulips and roses/);
    applyAction(s, { type: 'waterFlower', id: idOf(s, 'tulips_red') }, { now: T0 + BLOOM_PERIOD });
  });

  it('the first check only starts the clock; one check per period', () => {
    let s = garden(['tulips_red', 3, 3], ['tulips_red', 4, 3]);
    const r = applyAction(s, { type: 'bloomCheck' }, { now: T0 });
    expect(r.events.some((e) => e.type === 'bloomed')).toBe(false);
    s = r.state;
    expect(() => applyAction(s, { type: 'bloomCheck' }, { now: T0 + 1000 })).toThrow(/Nothing new/);
    applyAction(s, { type: 'bloomCheck' }, { now: T0 + BLOOM_PERIOD });
  });

  it('red and yellow tulips sprout copies and orange hybrids next to them', () => {
    const s0 = garden(['tulips_red', 6, 6], ['tulips_yellow', 7, 6]);
    const { s, sprouts } = grow(s0, [idOf(s0, 'tulips_red'), idOf(s0, 'tulips_yellow')], 120);
    const kinds = new Set(sprouts.map((e) => e.def));
    expect(kinds.has('tulips_orange')).toBe(true);
    expect([...kinds].every((k) => ['tulips_red', 'tulips_yellow', 'tulips_orange'].includes(k))).toBe(true);
    for (const e of sprouts) expect(Math.abs(e.x - 6.5)).toBeLessThanOrEqual(1.5);
    expect(s.blooms!.found).toEqual(['tulips_orange']);
    expect(sprouts.filter((e) => e.first)).toHaveLength(1);
    expect(s.stats.hybrid).toBeGreaterThan(0);
  });

  it('different species never cross', () => {
    const s0 = garden(['tulips_red', 6, 6], ['roses_white', 7, 6]);
    const { sprouts } = grow(s0, [idOf(s0, 'tulips_red'), idOf(s0, 'roses_white')], 80);
    expect(sprouts.length).toBeGreaterThan(0); // lone clones still happen
    expect(sprouts.every((e) => e.def === 'tulips_red' || e.def === 'roses_white')).toBe(true);
  });

  it('golden roses never bloom on a dry day', () => {
    const s0 = garden(['roses_blue', 6, 6], ['roses_yellow', 7, 6]);
    const { sprouts } = grow(s0, [idOf(s0, 'roses_blue'), idOf(s0, 'roses_yellow')], 200, { dry: true });
    expect(sprouts.length).toBeGreaterThan(0);
    expect(sprouts.some((e) => e.def === 'roses_gold')).toBe(false);
  });

  it('caps sprouts per check and stops when the garden is crowded', () => {
    const row: [string, number, number][] = [];
    for (let x = 0; x < 12; x++) row.push(['roses_red', x, 4]);
    let s = garden(...row);
    s = applyAction(s, { type: 'bloomCheck' }, { now: T0 }).state;
    let t = T0;
    for (let i = 0; i < 30; i++) {
      t += BLOOM_PERIOD;
      const r = applyAction(s, { type: 'bloomCheck' }, { now: t });
      expect(r.events.filter((e) => e.type === 'bloomed').length).toBeLessThanOrEqual(MAX_SPROUTS);
      s = r.state;
    }
  });

  it("sends a Florist's Cart after five hybrids", () => {
    const s0 = garden(['tulips_red', 6, 6], ['tulips_yellow', 7, 6]);
    s0.blooms = { watered: {}, found: ['tulips_white', 'tulips_black', 'roses_yellow', 'roses_blue'] };
    const { s } = grow(s0, [idOf(s0, 'tulips_red'), idOf(s0, 'tulips_yellow')], 120);
    expect(s.blooms!.found).toHaveLength(5);
    expect(s.blooms!.florist).toBe(true);
    expect(s.inventory.florist_cart).toBe(1);
  });
});
