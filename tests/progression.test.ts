import { describe, expect, it } from 'vitest';
import { GIFT_LEVEL_FROM, MYSTERY_GIFT, addXp, createFarm, keepLevel, xpForLevel } from '@farm/shared';

const T0 = Date.UTC(2026, 2, 2, 9);

describe('levels', () => {
  it('a farm saved under the old curve keeps its level', () => {
    const s = createFarm('Old', T0);
    s.level = 20;
    s.xp = 3300;
    keepLevel(s);
    expect(s.level).toBe(20);
    expect(s.xp).toBe(xpForLevel(20));
  });

  it('levels past the last market unlock come with a mystery gift', () => {
    const s = createFarm('Gift', T0);
    s.level = GIFT_LEVEL_FROM - 2;
    s.xp = xpForLevel(s.level);
    addXp(s, xpForLevel(GIFT_LEVEL_FROM) - s.xp, []);
    expect(s.level).toBe(GIFT_LEVEL_FROM);
    expect(s.inventory[MYSTERY_GIFT]).toBe(1);
  });
});
