import { describe, expect, it } from 'vitest';
import {
  CRITTERS,
  CRITTER_LIST,
  DECORATIONS,
  ITEMS,
  JOURNAL_TIERS,
  applyAction,
  availableCritters,
  createFarm,
  dailyLimit,
  discovered,
  nextRandom,
  placeable,
  previewCatch,
  triesLeft,
  type FarmState,
  type GameEvent,
} from '@farm/shared';

const T0 = Date.UTC(2026, 9, 12, 12, 0, 0); // Oct 12: autumn, Halloween running

function farm(): FarmState {
  return createFarm('Tester', T0);
}

describe('nature content', () => {
  it('every critter is an item and every keepsake a decoration', () => {
    for (const c of CRITTER_LIST) expect(ITEMS[c.id]?.category).toBe(c.kind);
    for (const k of ['fish', 'bug'] as const) for (const t of JOURNAL_TIERS[k]) expect(DECORATIONS[t.deco]?.reward).toBeTruthy();
  });

  it('keepsakes cannot be bought', () => {
    const s = farm();
    expect(placeable('golden_fish_statue')?.starter).toBe(true);
    expect(() => applyAction(s, { type: 'buy', def: 'golden_fish_statue', x: 0, y: 0 }, { now: T0 })).toThrow();
  });

  it('there is always something to catch, day and night, all year', () => {
    for (let m = 0; m < 12; m++)
      for (const hour of [3, 12, 22]) {
        const now = Date.UTC(2026, m, 15, 12);
        expect(availableCritters('fish', hour, { now }).length).toBeGreaterThan(3);
        expect(availableCritters('bug', hour, { now }).length).toBeGreaterThan(1);
      }
  });

  it('festival species only appear during their festival', () => {
    const oct = availableCritters('fish', 12, { now: T0 }).map((c) => c.id);
    expect(oct).toContain('ghost_fish');
    expect(availableCritters('fish', 12, { now: Date.UTC(2026, 4, 2) }).map((c) => c.id)).not.toContain('ghost_fish');
  });
});

describe('fishing and catching', () => {
  it('a good cast catches exactly what the preview promised', () => {
    let s = farm();
    for (let i = 0; i < 6; i++) {
      const promised = previewCatch(s, 'fish', 12, { now: T0 }, { nextRandom });
      const r = applyAction(s, { type: 'fish', score: 100, hour: 12 }, { now: T0 });
      const e = r.events.find((x) => x.type === 'caught' || x.type === 'escaped') as Extract<GameEvent, { what: string }>;
      expect(e.what).toBe(promised.id);
      if (e.type === 'caught') expect(r.state.inventory[promised.id]).toBeGreaterThan(s.inventory[promised.id] ?? 0);
      s = r.state;
    }
    expect(s.stats.fish).toBeGreaterThan(0);
    expect(discovered(s, 'fish')).toBeGreaterThan(0);
  });

  it('a fumbled cast always escapes but uses the cast', () => {
    const s = farm();
    const r = applyAction(s, { type: 'fish', score: 0, hour: 12 }, { now: T0 });
    expect(r.events.some((e) => e.type === 'escaped')).toBe(true);
    expect(triesLeft(r.state, 'fish', T0)).toBe(dailyLimit(s, 'fish') - 1);
  });

  it('runs out of casts for the day, then resets tomorrow', () => {
    let s = farm();
    const n = dailyLimit(s, 'fish');
    for (let i = 0; i < n; i++) s = applyAction(s, { type: 'fish', score: 80, hour: 12 }, { now: T0 }).state;
    expect(() => applyAction(s, { type: 'fish', score: 80, hour: 12 }, { now: T0 })).toThrow(/resting/);
    const tomorrow = T0 + 24 * 3600_000;
    expect(() => applyAction(s, { type: 'fish', score: 80, hour: 12 }, { now: tomorrow })).not.toThrow();
  });

  it('critter catching uses its own daily nets', () => {
    let s = farm();
    s = applyAction(s, { type: 'catchBug', score: 100, hour: 12 }, { now: T0 }).state;
    expect(triesLeft(s, 'bug', T0)).toBe(dailyLimit(s, 'bug') - 1);
    expect(triesLeft(s, 'fish', T0)).toBe(dailyLimit(s, 'fish'));
  });

  it('shrugs off hostile input', () => {
    const s = farm();
    for (const bad of [
      { type: 'fish', score: 'lots', hour: '__proto__' },
      { type: 'fish', score: 1e9, hour: -5 },
      { type: 'catchBug', score: NaN, hour: Infinity },
    ])
      expect(() => applyAction(s, bad as never, { now: T0 })).not.toThrow();
    expect(() => applyAction(s, { type: 'claimJournal', kind: '__proto__' } as never, { now: T0 })).toThrow();
  });

  it('journal milestones pay out once each', () => {
    let s = farm();
    for (const c of CRITTER_LIST.filter((x) => x.kind === 'fish').slice(0, 5)) s.stats[`catch:${c.id}`] = 1;
    s = applyAction(s, { type: 'claimJournal', kind: 'fish' }, { now: T0 }).state;
    expect(s.inventory.fishing_bench).toBe(1);
    expect(() => applyAction(s, { type: 'claimJournal', kind: 'fish' }, { now: T0 })).toThrow(/Discover 10/);
  });

  it('a fishing dock on the farm gives extra casts', () => {
    const s = farm();
    const base = dailyLimit(s, 'fish');
    s.objects.dock = { id: 'dock', kind: 'deco', def: 'fishing_dock', x: 0, y: 0 };
    expect(dailyLimit(s, 'fish')).toBe(base + 6);
    expect(CRITTERS.golden_koi.rarity).toBe(5);
  });
});
