import { describe, expect, it } from 'vitest';
import {
  CROP_LIST,
  CROPS,
  DECORATIONS,
  MASTERY_DECORATIONS,
  applyAction,
  createFarm,
  masteryGoals,
  masteryProgress,
  masteryStars,
  masterySignId,
  seedCost,
  weatherAt,
  type FarmState,
  type GameEvent,
} from '@farm/shared';

// A day without a rainbow (rainbows add +1 to harvests, which would muddle the counts).
let T0 = Date.UTC(2026, 9, 12, 12);
while (weatherAt(T0) === 'rainbow') T0 += 86_400_000;

function farmer(): { s: FarmState; plot: string } {
  const s = createFarm('Grower', T0);
  s.level = 20;
  s.coins = 1_000_000;
  s.objects = {};
  s.objects.p1 = { id: 'p1', kind: 'plot', x: 3, y: 3 };
  s.nextId = 10;
  return { s, plot: 'p1' };
}

/** Plant and harvest `crop` n times; returns the state and all events. */
function grow(s: FarmState, plot: string, crop: string, n: number) {
  const events: GameEvent[] = [];
  let t = T0;
  for (let i = 0; i < n; i++) {
    s = applyAction(s, { type: 'plant', id: plot, crop }, { now: t }).state;
    t += CROPS[crop].growSec * 1000;
    const r = applyAction(s, { type: 'harvest', id: plot }, { now: t });
    s = r.state;
    events.push(...r.events);
  }
  return { s, events };
}

describe('crop mastery', () => {
  it('every crop has rising goals and its own Mastery Sign keepsake', () => {
    expect(MASTERY_DECORATIONS).toHaveLength(CROP_LIST.length);
    for (const c of CROP_LIST) {
      const [a, b, d] = masteryGoals(c);
      expect(a).toBeGreaterThan(0);
      expect(b).toBeGreaterThan(a);
      expect(d).toBeGreaterThan(b);
      expect(DECORATIONS[masterySignId(c.id)]?.reward).toBeTruthy();
    }
    // Event crops are only around for a couple of weeks, so they need fewer harvests.
    expect(masteryGoals(CROPS.candy_corn)[2]).toBeLessThan(masteryGoals(CROPS.carrot)[2]);
  });

  it('earns the first star after enough harvests and discounts the seeds', () => {
    const { s: start, plot } = farmer();
    const goal = masteryGoals(CROPS.tomato)[0];
    const { s, events } = grow(start, plot, 'tomato', goal - 1);
    expect(masteryStars(s, 'tomato')).toBe(0);
    expect(masteryProgress(s, 'tomato')).toEqual({ have: goal - 1, need: goal, star: 1 });
    expect(seedCost(s, CROPS.tomato)).toBe(CROPS.tomato.cost);
    expect(events.some((e) => e.type === 'masteryStar')).toBe(false);
    const coins = s.coins;
    const r = grow(s, plot, 'tomato', 1);
    const star = r.events.find((e) => e.type === 'masteryStar');
    expect(star).toMatchObject({ crop: 'tomato', star: 1 });
    expect(masteryStars(r.s, 'tomato')).toBe(1);
    expect(seedCost(r.s, CROPS.tomato)).toBe(Math.floor(CROPS.tomato.cost * 0.9));
    expect(r.s.coins).toBe(coins - CROPS.tomato.cost + (star as { coins: number }).coins);
    expect(r.s.stats.masteryStar).toBe(1);
    // Planting now charges the discounted price.
    const planted = applyAction(r.s, { type: 'plant', id: plot, crop: 'tomato' }, { now: T0 });
    expect(planted.state.coins).toBe(r.s.coins - seedCost(r.s, CROPS.tomato));
  });

  it('three stars send a Mastery Sign and add +1 to every harvest', () => {
    const { s: start, plot } = farmer();
    const goals = masteryGoals(CROPS.corn);
    const { s, events } = grow(start, plot, 'corn', goals[2]);
    expect(masteryStars(s, 'corn')).toBe(3);
    expect(events.filter((e) => e.type === 'masteryStar').map((e) => (e as { star: number }).star)).toEqual([1, 2, 3]);
    expect(s.inventory[masterySignId('corn')]).toBe(1);
    expect(s.stats.mastered).toBe(1);
    expect(masteryProgress(s, 'corn')).toBeNull();
    const before = s.inventory.corn ?? 0;
    const r = grow(s, plot, 'corn', 1);
    const bumper = r.events.find((e) => e.type === 'bumperCrop') as { extra: number } | undefined;
    expect(bumper?.extra).toBeGreaterThanOrEqual(1);
    expect(r.s.inventory.corn).toBe(before + CROPS.corn.yield + bumper!.extra);
  });

  it('two stars give a bumper crop about a quarter of the time', () => {
    const { s: start, plot } = farmer();
    const goals = masteryGoals(CROPS.wheat);
    let { s } = grow(start, plot, 'wheat', goals[1]);
    expect(masteryStars(s, 'wheat')).toBe(2);
    const r = grow(s, plot, 'wheat', 80);
    s = r.s;
    const bumpers = r.events.filter((e) => e.type === 'bumperCrop').length;
    expect(bumpers).toBeGreaterThan(8);
    expect(bumpers).toBeLessThan(35);
  });

  it('crops harvested before mastery existed catch up on the next harvest', () => {
    const { s, plot } = farmer();
    s.stats['harvest:strawberry'] = 500;
    const r = grow(s, plot, 'strawberry', 1);
    expect(masteryStars(r.s, 'strawberry')).toBe(3);
    expect(r.events.filter((e) => e.type === 'masteryStar')).toHaveLength(3);
    expect(r.s.inventory[masterySignId('strawberry')]).toBe(1);
  });
});
