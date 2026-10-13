// Well water (FarmVille 2). A watering can that slowly refills by itself, and
// can be filled to the brim from a Wishing Well or Water Pump on the farm (each
// once every couple of hours). Watering a growing crop gives it the same head
// start as a rain shower, once per crop; a rainy sky waters everything for free.

import { CROPS } from '../content/crops';
import { DECORATIONS } from '../content/decorations';
import { WEATHER, weatherAt } from '../content/weather';
import { registerFeature } from '../logic/features';
import { GameError, type FarmState, type PlotObject } from '../types';
import { RAIN_BOOST } from './weather';

/** How much water the can holds. */
export const CAN_SIZE = 10;
/** The can refills itself one splash every this many ms. */
export const CAN_REFILL = 6 * 60_000;
/** A well can fill the can once every this many ms. */
export const WELL_COOLDOWN = 2 * 3600_000;
/** Decorations you can draw water from. */
export const WELLS = ['well', 'water_pump'];
/** Fraction of the growing time a watered crop skips (the same as rain). */
export const WATER_BOOST = RAIN_BOOST;

export interface WaterState {
  /** Water in the can at `at`. */
  level: number;
  at: number;
  /** Well object id -> when it was last drawn from. */
  wells: Record<string, number>;
}

declare module '../types' {
  interface FarmState {
    water?: WaterState;
  }
  interface ExtraActions {
    waterCrop: { type: 'waterCrop'; id: string };
    drawWater: { type: 'drawWater'; id: string };
  }
  interface ExtraEvents {
    wateredCrop: { type: 'wateredCrop'; id: string; x: number; y: number };
    drewWater: { type: 'drewWater'; id: string; added: number };
  }
}

function water(state: FarmState): WaterState {
  return (state.water ??= { level: CAN_SIZE, at: 0, wells: {} });
}

/** Water in the can right now. */
export function waterLevel(state: FarmState, now: number): number {
  const w = state.water;
  if (!w) return CAN_SIZE;
  return Math.min(CAN_SIZE, w.level + Math.max(0, Math.floor((now - w.at) / CAN_REFILL)));
}

/** When the next splash trickles into the can (null when it's full). */
export function nextSplashAt(state: FarmState, now: number): number | null {
  const w = state.water;
  if (!w || waterLevel(state, now) >= CAN_SIZE) return null;
  return w.at + (Math.floor((now - w.at) / CAN_REFILL) + 1) * CAN_REFILL;
}

/** Bank the trickle so far, keeping the progress toward the next splash. */
function settle(state: FarmState, now: number): WaterState {
  const w = water(state);
  const level = waterLevel(state, now);
  w.at = level >= CAN_SIZE ? now : w.at + Math.floor((now - w.at) / CAN_REFILL) * CAN_REFILL;
  w.level = level;
  return w;
}

export function isWell(obj: { kind: string; def?: string } | undefined): boolean {
  return obj?.kind === 'deco' && !!obj.def && WELLS.includes(obj.def);
}

/** When this well can fill the can again (now or earlier means ready). */
export function wellReadyAt(state: FarmState, id: string): number {
  const wells = state.water?.wells ?? {};
  const last = wells[id] ?? putAway(state)[0]?.[1];
  return last === undefined ? 0 : last + WELL_COOLDOWN;
}

/**
 * Draws from wells that have since been stored or sold, oldest first. A well
 * put away and set back out (with a new id) is still filling up, so a fresh
 * well takes over the oldest of these.
 */
function putAway(state: FarmState): [string, number][] {
  return Object.entries(state.water?.wells ?? {})
    .filter(([id]) => !isWell(state.objects[id]))
    .sort((a, b) => a[1] - b[1]);
}

/** Can this plot use a drink? (Growing, and not already watered by you or the rain.) */
export function thirsty(plot: PlotObject, now: number): boolean {
  const def = plot.crop ? CROPS[plot.crop] : undefined;
  return !!def && plot.plantedAt !== undefined && !plot.watered && now < plot.plantedAt + def.growSec * 1000;
}

registerFeature({
  id: 'water',
  migrate: (state) => void water(state),
  actions: {
    waterCrop: (state, action: { id: string }, ctx, events, kit) => {
      const plot = kit.getObject(state, String(action.id), 'plot');
      if (!plot.crop) throw new GameError('Plant something first');
      if (plot.watered) throw new GameError('That crop is already watered');
      if (!thirsty(plot, ctx.now)) throw new GameError('Only growing crops need water');
      if (WEATHER[weatherAt(ctx.now)].wet) throw new GameError('The rain is watering everything today!');
      const w = settle(state, ctx.now);
      if (w.level < 1) throw new GameError('Your watering can is empty. Fill it at a well!');
      w.level--;
      const grow = CROPS[plot.crop].growSec * 1000;
      plot.plantedAt = Math.max(plot.plantedAt! - grow * WATER_BOOST, ctx.now - grow);
      plot.watered = true;
      kit.bumpStat(state, 'waterCrop');
      kit.addXp(state, 1, events, kit.centerOf(plot));
      events.push({ type: 'wateredCrop', id: plot.id, x: plot.x, y: plot.y });
    },
    drawWater: (state, action: { id: string }, ctx, events, kit) => {
      const obj = state.objects[String(action.id)];
      if (!isWell(obj)) throw new GameError("There's no water there");
      const w = settle(state, ctx.now);
      if (wellReadyAt(state, obj.id) > ctx.now) throw new GameError(`The ${DECORATIONS[(obj as { def: string }).def]?.name ?? 'well'} is still filling up`);
      if (w.level >= CAN_SIZE) throw new GameError('Your watering can is already full');
      const added = CAN_SIZE - w.level;
      w.level = CAN_SIZE;
      w.at = ctx.now;
      const away = putAway(state);
      if (w.wells[obj.id] === undefined && away.length) delete w.wells[away.shift()![0]];
      for (const [id, t] of away) if (t + WELL_COOLDOWN <= ctx.now) delete w.wells[id];
      w.wells[obj.id] = ctx.now;
      kit.bumpStat(state, 'drawWater');
      events.push({ type: 'drewWater', id: obj.id, added });
    },
  },
});
