import { describe, expect, it } from 'vitest';
import {
  ADOPT_HEARTS,
  DECORATIONS,
  GOODIE_LIST,
  KITTIES,
  KITTY_SLOT,
  applyAction,
  createFarm,
  kittyVisitors,
  pendingVisits,
  type FarmState,
} from '@farm/shared';

const T0 = Date.UTC(2026, 9, 12, 12, 0, 0);
const HOUR = 3600_000;

function withGoodies(...defs: string[]): FarmState {
  const s = createFarm('Cat Fan', T0);
  s.coins = 5000;
  s.level = 12;
  defs.forEach((def, i) => (s.objects[`k${i}`] = { id: `k${i}`, kind: 'deco', def, x: i, y: 0 }));
  return s;
}

const act = (s: FarmState, a: Parameters<typeof applyAction>[1], now = T0) => applyAction(s, a, { now });

describe('kitty corner', () => {
  it('every goodie is a shop decoration', () => {
    for (const g of GOODIE_LIST) expect(DECORATIONS[g.id]).toBeTruthy();
  });

  it('needs a bowl before feeding', () => {
    const s = withGoodies('yarn_ball');
    expect(() => act(s, { type: 'feedKitties', food: 'kibble' })).toThrow(/Bowl/);
  });

  it('cats visit goodies while food is out, deterministically', () => {
    let s = withGoodies('kitty_bowl', 'yarn_ball', 'cardboard_box', 'cat_cushion', 'paper_bag', 'mouse_toy');
    s = act(s, { type: 'feedKitties', food: 'tuna' }).state;
    let seen = 0;
    for (let t = T0; t < T0 + 8 * HOUR; t += KITTY_SLOT) {
      const v = kittyVisitors(s, t);
      expect(kittyVisitors(s, t)).toEqual(v);
      // No cat is in two places at once, and nobody sits in the bowl.
      expect(new Set(Object.values(v)).size).toBe(Object.values(v).length);
      expect(v.k0).toBeUndefined();
      seen += Object.keys(v).length;
    }
    expect(seen).toBeGreaterThan(5);
    // Once the food runs out, nobody comes.
    expect(Object.keys(kittyVisitors(s, T0 + 9 * HOUR))).toHaveLength(0);
  });

  it('rare cats need fancy food and their favorite goodie', () => {
    let s = withGoodies('kitty_bowl', 'big_cushion');
    s = act(s, { type: 'feedKitties', food: 'tuna' }).state;
    for (let t = T0; t < T0 + 8 * HOUR; t += KITTY_SLOT) expect(Object.values(kittyVisitors(s, t))).not.toContain('big_chonk');
  });

  it('collecting banks gifts and hearts once', () => {
    let s = withGoodies('kitty_bowl', 'yarn_ball', 'cardboard_box', 'cat_cushion');
    s = act(s, { type: 'feedKitties', food: 'kibble' }).state;
    const later = T0 + 5 * HOUR;
    const pending = pendingVisits(s, later);
    expect(pending.length).toBeGreaterThan(0);
    const coins = s.coins;
    const r = act(s, { type: 'collectKitties' }, later);
    const e = r.events.find((x) => x.type === 'kittyGifts');
    expect(e && e.type === 'kittyGifts' && e.visits).toBe(pending.length);
    expect(r.state.coins).toBeGreaterThan(coins);
    expect(pendingVisits(r.state, later)).toHaveLength(0);
    expect(() => act(r.state, { type: 'collectKitties' }, later)).toThrow();
  });

  it('pet a visiting cat once a day for a heart, and adopt at ten hearts', () => {
    let s = withGoodies('kitty_bowl', 'yarn_ball', 'cardboard_box', 'cat_cushion');
    s = act(s, { type: 'feedKitties', food: 'kibble' }).state;
    let t = T0;
    while (!Object.keys(kittyVisitors(s, t)).length) t += KITTY_SLOT;
    const cat = Object.values(kittyVisitors(s, t))[0];
    s = act(s, { type: 'petKitty', cat }, t).state;
    const hearts = s.kitty!.hearts[cat];
    const again = act(s, { type: 'petKitty', cat }, t);
    expect(again.state.kitty!.hearts[cat]).toBe(hearts);
    expect(again.events.some((e) => e.type === 'purr')).toBe(true);
    expect(() => act(s, { type: 'adoptKitty', cat }, t)).toThrow(/hearts/);
    s.kitty!.hearts[cat] = ADOPT_HEARTS;
    s = act(s, { type: 'adoptKitty', cat }, t).state;
    expect(s.kitty!.adopted).toContain(cat);
    // Adopted cats live on the farm and no longer visit goodies.
    for (let x = t; x < t + 4 * HOUR; x += KITTY_SLOT) expect(Object.values(kittyVisitors(s, x))).not.toContain(cat);
    expect(KITTIES[cat]).toBeTruthy();
  });

  it('sashimi costs fish from the barn', () => {
    const s = withGoodies('kitty_bowl');
    expect(() => act(s, { type: 'feedKitties', food: 'sashimi' })).toThrow(/fish/);
    s.inventory.minnow = 1;
    s.inventory.koi = 3;
    const r = act(s, { type: 'feedKitties', food: 'sashimi' }).state;
    expect(r.inventory.minnow ?? 0).toBe(0);
    expect(r.inventory.koi).toBe(2);
  });

  it('shrugs off hostile input', () => {
    const s = withGoodies('kitty_bowl');
    for (const bad of [
      { type: 'feedKitties', food: '__proto__' },
      { type: 'petKitty', cat: 'constructor' },
      { type: 'adoptKitty', cat: '__proto__' },
    ])
      expect(() => act(s, bad as never)).toThrow();
  });
});
