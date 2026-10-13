import { describe, expect, it } from 'vitest';
import { CROPS, WEATHER, applyAction, createFarm, forecast, weatherAt, type FarmState, type PlotObject, type Weather } from '@farm/shared';

const DAY = 24 * 3600_000;
const YEAR = Array.from({ length: 365 }, (_, i) => Date.UTC(2026, 0, 1, 12) + i * DAY);

/** The first noon of 2026 with this weather. */
function dayWith(w: Weather): number {
  const t = YEAR.find((d) => weatherAt(d) === w);
  if (!t) throw new Error(`no ${w} day in 2026`);
  return t;
}

function plots(s: FarmState): PlotObject[] {
  return Object.values(s.objects).filter((o): o is PlotObject => o.kind === 'plot');
}

describe('weather', () => {
  it('is the same all day and known in advance', () => {
    const t = Date.UTC(2026, 3, 9, 1);
    expect(weatherAt(t)).toBe(weatherAt(t + 20 * 3600_000));
    const f = forecast(t, 3);
    expect(f).toHaveLength(3);
    expect(f[1].weather).toBe(weatherAt(t + DAY));
  });

  it('has every kind of day over a year, in the right seasons', () => {
    const seen = new Set(YEAR.map(weatherAt));
    for (const w of Object.keys(WEATHER)) expect(seen).toContain(w);
    for (const d of YEAR) {
      const m = new Date(d).getUTCMonth();
      const w = weatherAt(d);
      if (w === 'snow') expect([11, 0, 1]).toContain(m);
      if (w === 'storm') expect([5, 6, 7]).toContain(m);
      if (w === 'rainbow') expect(WEATHER[weatherAt(d - DAY)].wet).toBe(true);
    }
  });

  it('rain waters each growing crop once', () => {
    const t = dayWith('rain');
    let s = createFarm('Rainy', t);
    const before = plots(s).filter((p) => p.crop)[0];
    s = applyAction(s, { type: 'feelRain' }, { now: t }).state;
    const after = s.objects[before.id] as PlotObject;
    expect(after.watered).toBe(true);
    expect(after.plantedAt!).toBeLessThan(before.plantedAt!);
    expect(() => applyAction(s, { type: 'feelRain' }, { now: t })).toThrow();
    // A crop planted in the rain gets a head start too.
    const empty = plots(s).find((p) => !p.crop)!;
    s = applyAction(s, { type: 'plant', id: empty.id, crop: 'strawberry' }, { now: t + 1000 }).state;
    const planted = s.objects[empty.id] as PlotObject;
    expect(planted.watered).toBe(true);
    expect(t + 1000 - planted.plantedAt!).toBe(CROPS.strawberry.growSec * 1000 * 0.25);
  });

  it('dry days need no rain', () => {
    const t = dayWith('sunny');
    expect(() => applyAction(createFarm('Dry', t), { type: 'feelRain' }, { now: t })).toThrow();
  });

  it('wind shakes an extra apple from the tree', () => {
    for (const [w, extra] of [['windy', 1], ['sunny', 0]] as const) {
      const t = dayWith(w);
      const s = createFarm('Breezy', t);
      const tree = Object.values(s.objects).find((o) => o.kind === 'tree')!;
      if (tree.kind === 'tree') tree.cycleStart = t - DAY;
      const r = applyAction(s, { type: 'collect', id: tree.id }, { now: t }).state;
      expect(r.inventory.apple).toBe(3 + extra);
    }
  });

  it('a rainbow adds one to every harvest', () => {
    const t = dayWith('rainbow');
    const s = createFarm('Lucky', t);
    const ripe = plots(s).find((p) => p.crop)!;
    ripe.plantedAt = t - 3600_000;
    const r = applyAction(s, { type: 'harvest', id: ripe.id }, { now: t }).state;
    expect(r.inventory.strawberry).toBe(CROPS.strawberry.yield + 1);
  });

  it('snow days make cooking worth more XP', () => {
    const xpFor = (t: number) => {
      const s = createFarm('Chef', t);
      s.level = 5;
      s.inventory = { carrot: 2, tomato: 2 };
      const r = applyAction(s, { type: 'cook', dish: 'veggie_salad', score: 100 }, { now: t }).state;
      return r.xp - s.xp;
    };
    expect(xpFor(dayWith('snow'))).toBeGreaterThan(xpFor(dayWith('cloudy')));
  });
});
