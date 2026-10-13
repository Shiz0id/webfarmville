import { describe, expect, it } from 'vitest';
import {
  CAN_REFILL,
  CAN_SIZE,
  CROPS,
  WEATHER,
  WELL_COOLDOWN,
  applyAction,
  createFarm,
  cropStatus,
  nextSplashAt,
  waterLevel,
  weatherAt,
  type FarmState,
  type PlotObject,
} from '@farm/shared';

// A dry hour (rain waters every crop for free, which would muddle these tests).
let T0 = Date.UTC(2026, 9, 12, 12);
while (WEATHER[weatherAt(T0)].wet || WEATHER[weatherAt(T0 + 12 * 3600_000)].wet) T0 += 86_400_000;

function farmer(plots = 12): FarmState {
  const s = createFarm('Waterer', T0);
  s.level = 10;
  s.coins = 100_000;
  s.objects = {};
  for (let i = 0; i < plots; i++) s.objects[`p${i}`] = { id: `p${i}`, kind: 'plot', x: i % 6, y: Math.floor(i / 6), crop: 'corn', plantedAt: T0 };
  s.objects.w1 = { id: 'w1', kind: 'deco', def: 'well', x: 10, y: 10 };
  s.nextId = 100;
  return s;
}

const act = (s: FarmState, a: Parameters<typeof applyAction>[1], now = T0) => applyAction(s, a, { now });

describe('well water', () => {
  it('watering a growing crop gives it a head start, once', () => {
    let s = farmer();
    const before = cropStatus(s.objects.p0 as PlotObject, T0 + 60_000).progress;
    const r = act(s, { type: 'waterCrop', id: 'p0' }, T0 + 60_000);
    s = r.state;
    const plot = s.objects.p0 as PlotObject;
    expect(plot.watered).toBe(true);
    expect(cropStatus(plot, T0 + 60_000).progress).toBeCloseTo(before + 0.25, 5);
    expect(waterLevel(s, T0 + 60_000)).toBe(CAN_SIZE - 1);
    expect(s.stats.waterCrop).toBe(1);
    expect(r.events.some((e) => e.type === 'wateredCrop')).toBe(true);
    expect(() => act(s, { type: 'waterCrop', id: 'p0' }, T0 + 60_000)).toThrow('already watered');
  });

  it('never pushes a crop past ripe, and ripe or empty plots need no water', () => {
    let s = farmer();
    const grow = CROPS.corn.growSec * 1000;
    s = act(s, { type: 'waterCrop', id: 'p1' }, T0 + grow * 0.9).state;
    expect(cropStatus(s.objects.p1 as PlotObject, T0 + grow * 0.9).stage).toBe('ready');
    expect(() => act(s, { type: 'waterCrop', id: 'p2' }, T0 + grow)).toThrow('growing');
    s.objects.p3 = { id: 'p3', kind: 'plot', x: 8, y: 8 };
    expect(() => act(s, { type: 'waterCrop', id: 'p3' }, T0)).toThrow('Plant');
  });

  it('the can runs dry, trickles back over time, and a well fills it up', () => {
    let s = farmer();
    for (let i = 0; i < CAN_SIZE; i++) s = act(s, { type: 'waterCrop', id: `p${i}` }, T0 + 1000).state;
    expect(waterLevel(s, T0 + 1000)).toBe(0);
    expect(() => act(s, { type: 'waterCrop', id: 'p10' }, T0 + 1000)).toThrow('empty');
    expect(nextSplashAt(s, T0 + 1000)).toBe(T0 + 1000 + CAN_REFILL);
    expect(waterLevel(s, T0 + 1000 + CAN_REFILL * 2.5)).toBe(2);
    // Using a splash keeps the progress toward the next one.
    s = act(s, { type: 'waterCrop', id: 'p10' }, T0 + 1000 + CAN_REFILL * 2.5).state;
    expect(waterLevel(s, T0 + 1000 + CAN_REFILL * 3)).toBe(2);
    const r = act(s, { type: 'drawWater', id: 'w1' }, T0 + 1000 + CAN_REFILL * 3);
    s = r.state;
    expect(waterLevel(s, T0 + 1000 + CAN_REFILL * 3)).toBe(CAN_SIZE);
    expect(r.events.find((e) => e.type === 'drewWater')).toMatchObject({ added: CAN_SIZE - 2 });
    s = act(s, { type: 'waterCrop', id: 'p11' }, T0 + 1000 + CAN_REFILL * 3).state;
    expect(() => act(s, { type: 'drawWater', id: 'w1' }, T0 + 1000 + CAN_REFILL * 3)).toThrow('filling up');
    // Two hours on the well is ready again (and the can has trickled full by itself).
    expect(() => act(s, { type: 'drawWater', id: 'w1' }, T0 + 1000 + CAN_REFILL * 3 + WELL_COOLDOWN)).toThrow('already full');
  });

  it('only wells and pumps hold water, and a full can needs none', () => {
    const s = farmer();
    s.objects.f1 = { id: 'f1', kind: 'deco', def: 'tulips_red', x: 12, y: 12 };
    expect(() => act(s, { type: 'drawWater', id: 'f1' })).toThrow('no water');
    expect(() => act(s, { type: 'drawWater', id: 'w1' })).toThrow('already full');
  });

  it('on a rainy day the sky does the watering', () => {
    let t = Date.UTC(2026, 9, 12, 12);
    while (!WEATHER[weatherAt(t)].wet) t += 3600_000;
    const s = farmer();
    for (const o of Object.values(s.objects)) if (o.kind === 'plot') o.plantedAt = t;
    // The rain reaches every crop on the next action.
    const wet = act(s, { type: 'rename', name: 'Rainy' }, t).state;
    expect((wet.objects.p0 as PlotObject).watered).toBe(true);
    expect(() => act(wet, { type: 'waterCrop', id: 'p0' }, t)).toThrow();
  });
});
