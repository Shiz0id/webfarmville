import { describe, expect, it } from 'vitest';
import { VILLAGER_FARMS, createFarm, cropStatus, decodeFarm, encodeFarm, farmFromSnapshot, snapshotFarm, type FarmObject } from '@farm/shared';

const T0 = Date.UTC(2026, 2, 2, 9);

/** Everything about an object that a visitor can see. */
const looks = (objects: Record<string, FarmObject>) =>
  Object.values(objects)
    .map((o) => `${o.kind}:${o.kind === 'plot' ? (o.crop ?? '') : o.def}:${o.x},${o.y}:${o.kind === 'deco' && o.flip ? 'f' : ''}`)
    .sort();

describe('farm invite links', () => {
  it('a farm survives the trip through a link', async () => {
    const farm = createFarm("Clover's Farm", T0);
    Object.values(farm.objects).find((o) => o.kind === 'deco')!.flip = true;
    farm.kitty = { hearts: {}, met: {}, adopted: ['mochi'], petDay: {}, visitDay: {}, collectedUntil: 0 };
    const code = await encodeFarm(snapshotFarm(farm, 'Clover', T0));
    const snap = (await decodeFarm(code))!;
    expect(snap).toMatchObject({ by: 'Clover', name: "Clover's Farm", level: 1, size: farm.size, at: T0 });
    const copy = farmFromSnapshot(snap, T0 + 3600_000);
    expect(looks(copy.objects)).toEqual(looks(farm.objects));
    expect(copy.kitty?.adopted ?? []).toEqual(snap.cats);
    // The nearly-ripe tutorial strawberries are still growing, not wiped out.
    const plot = Object.values(copy.objects).find((o) => o.kind === 'plot' && o.crop)!;
    expect(cropStatus(plot as never, T0 + 3600_000).stage).not.toBe('empty');
  });

  it('even a villager showcase farm fits in a chat message', async () => {
    for (const def of VILLAGER_FARMS) {
      const farm = def.build(T0);
      const code = await encodeFarm(snapshotFarm(farm, def.username, T0));
      expect(code.length).toBeLessThan(1800);
      const copy = farmFromSnapshot((await decodeFarm(code))!, T0);
      expect(Object.keys(copy.objects).length).toBe(Object.keys(farm.objects).length);
    }
  });

  it('shrugs off broken and tampered links', async () => {
    expect(await decodeFarm('')).toBeNull();
    expect(await decodeFarm('zNOTAFARM')).toBeNull();
    expect(await decodeFarm('j' + btoa('{"hello":1}'))).toBeNull();
    const evil = JSON.stringify([1, 'x'.repeat(500), '', 5000, 9999, 0, ['nobody', 'mochi'], [
      ['d:not_a_thing', 0],
      ['b:farmhouse:99', 0, 0, 1],
      ['d:scarecrow', -4, 1.5, 3],
      ['p:corn:9', 5],
    ]]);
    const snap = (await decodeFarm('j' + btoa(evil).replace(/=+$/, '')))!;
    expect(snap.by.length).toBeLessThanOrEqual(16);
    expect(snap.size).toBeLessThanOrEqual(30);
    expect(snap.cats).toEqual(['mochi']);
    const farm = farmFromSnapshot(snap, T0);
    const objs = Object.values(farm.objects);
    // One farmhouse (the copies on the same tiles are dropped), clamped to a real workshop level.
    expect(objs.filter((o) => o.kind === 'building')).toHaveLength(1);
    expect(objs.every((o) => o.kind !== 'plot')).toBe(true);
    expect(objs.every((o) => o.x >= 0 && o.y >= 0 && o.x < farm.size && o.y < farm.size)).toBe(true);
  });
});
