// Weather perks. Rain waters growing crops (a 25% head start, once per
// crop), wind shakes extra fruit from trees, rainbows add +1 to harvests and
// snow days make cooking worth more XP. Fishing and kitties read the weather
// themselves (see weatherRarityBoost and weatherKittyAppeal).

import { CROPS } from '../content/crops';
import { TREES } from '../content/producers';
import { WEATHER, weatherAt } from '../content/weather';
import { registerFeature } from '../logic/features';
import { GameError, type FarmState, type GameEvent, type PlotObject } from '../types';

declare module '../types' {
  interface ExtraActions {
    /** Let the rain water crops planted before it started (no other effect). */
    feelRain: { type: 'feelRain' };
  }
  interface ExtraEvents {
    rained: { type: 'rained'; plots: string[] };
  }
}

export const RAIN_BOOST = 0.25;

function growing(plot: PlotObject, now: number): boolean {
  const def = plot.crop ? CROPS[plot.crop] : undefined;
  return !!def && plot.plantedAt !== undefined && now < plot.plantedAt + def.growSec * 1000;
}

/** Growing crops the rain hasn't reached yet (none unless it's wet). */
export function thirstyPlots(state: FarmState, now: number): PlotObject[] {
  if (!WEATHER[weatherAt(now)].wet) return [];
  return Object.values(state.objects).filter((o): o is PlotObject => o.kind === 'plot' && !o.watered && growing(o, now));
}

function water(state: FarmState, now: number, events: GameEvent[]): void {
  const plots = thirstyPlots(state, now);
  for (const p of plots) {
    const grow = CROPS[p.crop!].growSec * 1000;
    p.plantedAt = Math.max(p.plantedAt! - grow * RAIN_BOOST, now - grow);
    p.watered = true;
  }
  if (plots.length) events.push({ type: 'rained', plots: plots.map((p) => p.id) });
}

registerFeature({
  id: 'weather',
  actions: {
    feelRain: (state, _a, ctx) => {
      if (!thirstyPlots(state, ctx.now).length) throw new GameError('Nothing needs the rain');
    },
  },
  after: (state, action: { type: string; id?: string }, ctx, events, kit) => {
    const w = weatherAt(ctx.now);
    for (const o of Object.values(state.objects)) if (o.kind === 'plot' && o.watered && !o.crop) delete o.watered;
    water(state, ctx.now, events);

    if (w === 'windy' && action.type === 'collect' && action.id) {
      const tree = state.objects[action.id];
      if (tree?.kind === 'tree' && TREES[tree.def]) kit.addItem(state, TREES[tree.def].product, 1, events, kit.centerOf(tree));
    }
    if (w === 'rainbow' && action.type === 'harvest') {
      const got = events.find((e): e is Extract<GameEvent, { type: 'gain' }> => e.type === 'gain' && Object.hasOwn(CROPS, e.what));
      if (got) kit.addItem(state, got.what, 1, events, got.x !== undefined ? { x: got.x, y: got.y! } : undefined);
    }
    if (w === 'snow' && action.type === 'cook') {
      const xp = events.find((e): e is Extract<GameEvent, { type: 'gain' }> => e.type === 'gain' && e.what === 'xp');
      if (xp) kit.addXp(state, Math.round(xp.amount / 2), events);
    }
  },
});
