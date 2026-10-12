import { describe, expect, it } from 'vitest';
import {
  CONTEST_LIST,
  DECORATIONS,
  FAIR_PRIZES,
  PLACE_TICKETS,
  applyAction,
  canEnter,
  contestsLeft,
  createFarm,
  fairKey,
  fairOpen,
  featuredItem,
  nextFairAt,
  type FarmState,
} from '@farm/shared';

const SAT = Date.UTC(2026, 9, 17, 12); // Saturday
const SUN = Date.UTC(2026, 9, 18, 20);
const MON = Date.UTC(2026, 9, 12, 12);
const act = (s: FarmState, a: Parameters<typeof applyAction>[1], now = SAT) => applyAction(s, a, { now });

function farmer(level = 12): FarmState {
  const s = createFarm('Fairgoer', SAT);
  s.level = level;
  return s;
}

describe('county fair', () => {
  it('runs on weekends and keys each weekend by its Saturday', () => {
    expect(fairOpen(SAT)).toBe(true);
    expect(fairOpen(SUN)).toBe(true);
    expect(fairOpen(MON)).toBe(false);
    expect(fairOpen(MON, true)).toBe(true);
    expect(fairKey(SAT)).toBe('2026-10-17');
    expect(fairKey(SUN)).toBe('2026-10-17');
    expect(fairKey(MON)).toBe('2026-10-17');
    expect(nextFairAt(MON)).toBe(Date.UTC(2026, 9, 17));
  });

  it('only opens on weekends', () => {
    const s = farmer();
    s.inventory.wheat = 1;
    expect(() => act(s, { type: 'enterContest', contest: 'produce', item: 'wheat' }, MON)).toThrow(/Saturday/);
    expect(() => applyAction(s, { type: 'enterContest', contest: 'produce', item: 'wheat' }, { now: MON, allEvents: true })).not.toThrow();
  });

  it('takes the right kind of entry, once per contest per fair', () => {
    let s = farmer();
    s.inventory = { ...s.inventory, wheat: 2, apple: 1, roses_white: 1 };
    expect(() => act(s, { type: 'enterContest', contest: 'bakeoff', item: 'wheat' })).toThrow(/dish/);
    expect(canEnter('flowers', 'roses_white')).toBe(true);
    expect(canEnter('flowers', 'daisies')).toBe(false);
    const r = act(s, { type: 'enterContest', contest: 'produce', item: 'wheat' });
    s = r.state;
    const e = s.fair!.entries.produce!;
    expect(e.rivals).toHaveLength(3);
    expect(s.fair!.tickets).toBe(PLACE_TICKETS[e.place]);
    expect(s.inventory.wheat).toBe(1);
    expect(() => act(s, { type: 'enterContest', contest: 'produce', item: 'wheat' }, SUN)).toThrow(/already/);
    expect(contestsLeft(s, SUN)).toEqual(['bakeoff', 'flowers', 'fishing']);
    // Next weekend the slate is clean.
    s = act(s, { type: 'enterContest', contest: 'produce', item: 'apple' }, SAT + 7 * 86400_000).state;
    expect(s.fair!.entries.produce!.item).toBe('apple');
  });

  it('rare entries beat cheap ones', () => {
    let wins = 0;
    let losses = 0;
    for (let i = 0; i < 40; i++) {
      const s = farmer();
      s.seed = i * 7919;
      s.inventory = { ...s.inventory, roses_gold: 1, tulips_red: 1 };
      if (act(s, { type: 'enterContest', contest: 'flowers', item: 'roses_gold' }).state.fair!.entries.flowers!.place === 0) wins++;
      if (act(s, { type: 'enterContest', contest: 'flowers', item: 'tulips_red' }).state.fair!.entries.flowers!.place === 3) losses++;
    }
    expect(wins).toBe(40);
    expect(losses).toBe(40);
  });

  it('has a featured item a farm of that level can grow or cook', () => {
    const s = farmer(3);
    for (const c of CONTEST_LIST) {
      const f = featuredItem(s, c.id, SAT);
      if (c.featured) expect(f && canEnter(c.id, f)).toBe(true);
      else expect(f).toBeUndefined();
    }
  });

  it('crowns a grand champion once and sells prizes for tickets', () => {
    let s = farmer();
    s.inventory = { ...s.inventory, roses_gold: 1 };
    // Force first place everywhere: the champion check reads every entry.
    s.fair = { key: fairKey(SAT), tickets: 0, champion: [], entries: {} };
    for (const c of CONTEST_LIST.filter((c) => c.id !== 'flowers'))
      s.fair.entries[c.id] = { item: 'x', score: 999, place: 0, featured: false, rivals: [] };
    const r = act(s, { type: 'enterContest', contest: 'flowers', item: 'roses_gold' });
    expect(r.events.some((e) => e.type === 'grandChampion')).toBe(true);
    s = r.state;
    expect(s.inventory.golden_trophy).toBe(1);
    expect(s.fair!.tickets).toBe(PLACE_TICKETS[0] + 50);
    const prize = FAIR_PRIZES[0];
    expect(DECORATIONS[prize.deco]).toBeTruthy();
    s = act(s, { type: 'buyFairPrize', deco: prize.deco }).state;
    expect(s.inventory[prize.deco]).toBe(1);
    expect(s.fair!.tickets).toBe(PLACE_TICKETS[0] + 50 - prize.tickets);
    expect(() => act(s, { type: 'buyFairPrize', deco: 'ferris_wheel' })).toThrow(/tickets/);
  });
});
