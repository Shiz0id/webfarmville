import { describe, expect, it } from 'vitest';
import { ITEMS, PROJECT_LIST, activeProject, applyAction, createFarm, dailyLimit, stallSlots, townDone, type FarmState } from '@farm/shared';

const T0 = Date.UTC(2026, 9, 12, 12);
const act = (s: FarmState, a: Parameters<typeof applyAction>[1]) => applyAction(s, a, { now: T0 });

function rich(): FarmState {
  const s = createFarm('Mayor Fan', T0);
  s.level = 20;
  s.coins = 100_000;
  return s;
}

/** Donate everything the active project needs. */
function finish(s: FarmState): FarmState {
  const p = activeProject(s)!;
  for (const [item, n] of Object.entries(p.needs)) {
    if (item !== 'coins') s.inventory[item] = (s.inventory[item] ?? 0) + n;
    s = act(s, { type: 'donate', project: p.id, item, qty: n }).state;
  }
  return s;
}

describe('town projects', () => {
  it('only asks for real items', () => {
    for (const p of PROJECT_LIST) for (const item of Object.keys(p.needs)) if (item !== 'coins') expect(ITEMS[item], item).toBeTruthy();
  });

  it('takes partial donations and caps them at what is needed', () => {
    let s = rich();
    s.inventory.wheat = 100;
    s = act(s, { type: 'donate', project: 'pond_bridge', item: 'wheat', qty: 15 }).state;
    expect(s.town!.given.wheat).toBe(15);
    s = act(s, { type: 'donate', project: 'pond_bridge', item: 'wheat', qty: 99 }).state;
    expect(s.town!.given.wheat).toBe(40);
    expect(s.inventory.wheat).toBe(60);
    expect(() => act(s, { type: 'donate', project: 'pond_bridge', item: 'wheat', qty: 1 })).toThrow(/needed/);
  });

  it('projects go in order and need the level', () => {
    const s = rich();
    expect(() => act(s, { type: 'donate', project: 'market_square', item: 'coins', qty: 10 })).toThrow(/something else/);
    const low = createFarm('Newbie', T0);
    low.inventory.wheat = 5;
    expect(() => act(low, { type: 'donate', project: 'pond_bridge', item: 'wheat', qty: 5 })).toThrow(/level/);
  });

  it('finishing a project unlocks its perk', () => {
    let s = rich();
    const casts = dailyLimit(s, 'fish');
    s = finish(s);
    expect(townDone(s, 'pond_bridge')).toBe(true);
    expect(dailyLimit(s, 'fish')).toBe(casts + 3);
    expect(activeProject(s)!.id).toBe('market_square');
    const slots = stallSlots(s);
    s = finish(s);
    expect(stallSlots(s)).toBe(slots + 2);
  });

  it('the orchard adds fruit to every tree harvest', () => {
    let s = rich();
    s.town = { given: {}, done: ['pond_bridge', 'market_square', 'kitty_shelter', 'town_orchard'] };
    const tree = Object.values(s.objects).find((o) => o.kind === 'tree')!;
    if (tree.kind === 'tree') tree.cycleStart = T0 - 86_400_000;
    const before = s.inventory.apple ?? 0;
    s = act(s, { type: 'collect', id: tree.id }).state;
    expect((s.inventory.apple ?? 0) - before).toBeGreaterThanOrEqual(4);
  });

  it('shrugs off hostile input', () => {
    const s = rich();
    for (const bad of [
      { type: 'donate', project: 'pond_bridge', item: '__proto__', qty: 1 },
      { type: 'donate', project: 'pond_bridge', item: 'coins', qty: -5 },
      { type: 'donate', project: 'pond_bridge', item: 'coins', qty: 0.5 },
      { type: 'donate', project: '__proto__', item: 'coins', qty: 1 },
    ])
      expect(() => act(s, bad as never)).toThrow();
  });
});
