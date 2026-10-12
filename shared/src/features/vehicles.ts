// Farm vehicles (FarmVille 1): a Tractor, Seeder and Harvester that plow,
// plant or harvest a whole patch in one tap. All of them share one fuel tank
// that refills by itself over time; each drive burns one unit.
//
// A drive is a bundle of ordinary plow / plant / harvest actions applied one
// after another (`applySubActions`), so every bonus, drop and quest that
// works by hand works from the driver's seat too.

import { FUEL_MAX, FUEL_REFILL, VEHICLES, vehicleOrigin } from '../content/vehicles';
import { CROPS } from '../content/crops';
import { registerFeature } from '../logic/features';
import { applyAction, objectAt } from '../logic/reducer';
import { cropStatus } from '../logic/status';
import { GameError, type Action, type ActionContext, type FarmState, type GameEvent } from '../types';

export interface GarageState {
  owned: string[];
  /** Fuel in the tank at `at`. */
  fuel: number;
  at: number;
}

declare module '../types' {
  interface FarmState {
    garage?: GarageState;
  }
  interface ExtraActions {
    buyVehicle: { type: 'buyVehicle'; vehicle: string };
    drive: { type: 'drive'; vehicle: string; x: number; y: number; crop?: string };
  }
  interface ExtraEvents {
    drove: { type: 'drove'; vehicle: string; x: number; y: number; size: number; done: number };
    boughtVehicle: { type: 'boughtVehicle'; vehicle: string };
  }
}

/**
 * Apply `actions` to `state` one by one, as if the player had done each by
 * hand, skipping any that aren't allowed. Their events are appended to
 * `events`. Returns how many went through.
 */
export function applySubActions(state: FarmState, actions: Action[], ctx: ActionContext, events: GameEvent[]): number {
  let cur = state;
  let done = 0;
  for (const a of actions) {
    try {
      const r = applyAction(cur, a, ctx);
      cur = r.state;
      // The outer action refreshes quests once at the end.
      for (const e of r.events) if (e.type !== 'questReady') events.push(e);
      done++;
    } catch (err) {
      if (!(err instanceof GameError)) throw err;
    }
  }
  if (cur !== state) {
    for (const k of Object.keys(state)) if (!Object.hasOwn(cur, k)) delete (state as unknown as Record<string, unknown>)[k];
    Object.assign(state, cur);
  }
  return done;
}

export function ownsVehicle(state: FarmState, id: string): boolean {
  return !!state.garage?.owned.includes(id);
}

/** Fuel in the tank right now. */
export function fuelLevel(state: FarmState, now: number): number {
  const g = state.garage;
  if (!g) return FUEL_MAX;
  return Math.min(FUEL_MAX, g.fuel + Math.max(0, Math.floor((now - g.at) / FUEL_REFILL)));
}

/** When the next unit of fuel trickles in (null when the tank is full). */
export function nextFuelAt(state: FarmState, now: number): number | null {
  const g = state.garage;
  if (!g || fuelLevel(state, now) >= FUEL_MAX) return null;
  return g.at + (Math.floor((now - g.at) / FUEL_REFILL) + 1) * FUEL_REFILL;
}

/** Bank the refill so far (keeping progress toward the next unit) and return the garage. */
export function settleFuel(state: FarmState, now: number): GarageState {
  const g = (state.garage ??= { owned: [], fuel: FUEL_MAX, at: now });
  const fuel = fuelLevel(state, now);
  g.at = fuel >= FUEL_MAX ? now : g.at + Math.floor((now - g.at) / FUEL_REFILL) * FUEL_REFILL;
  g.fuel = fuel;
  return g;
}

/** The hand actions a vehicle would perform on its patch right now. */
export function driveActions(state: FarmState, vehicle: string, x: number, y: number, crop: string | undefined, now: number): Action[] {
  const def = VEHICLES[vehicle];
  if (!def) return [];
  const o = vehicleOrigin(def, x, y);
  const out: Action[] = [];
  for (let dy = 0; dy < def.size; dy++)
    for (let dx = 0; dx < def.size; dx++) {
      const tx = o.x + dx;
      const ty = o.y + dy;
      if (tx < 0 || ty < 0 || tx >= state.size || ty >= state.size) continue;
      const obj = objectAt(state, tx, ty);
      if (def.job === 'plow') {
        if (!obj) out.push({ type: 'plow', x: tx, y: ty });
      } else if (obj?.kind === 'plot') {
        if (def.job === 'plant' && !obj.crop && crop) out.push({ type: 'plant', id: obj.id, crop });
        else if (def.job === 'harvest' && cropStatus(obj, now).stage === 'ready') out.push({ type: 'harvest', id: obj.id });
      }
    }
  return out;
}

registerFeature({
  id: 'vehicles',
  actions: {
    buyVehicle: (state, action: { vehicle: string }, ctx, events, kit) => {
      const def = Object.hasOwn(VEHICLES, String(action.vehicle)) ? VEHICLES[String(action.vehicle)] : undefined;
      if (!def) throw new GameError('Unknown vehicle');
      if (state.level < def.level) throw new GameError(`Unlocks at level ${def.level}`);
      if (ownsVehicle(state, def.id)) throw new GameError(`You already have a ${def.name}`);
      kit.spend(state, def.cost, events);
      const g = settleFuel(state, ctx.now);
      g.owned.push(def.id);
      kit.bumpStat(state, 'vehicle');
      events.push({ type: 'boughtVehicle', vehicle: def.id });
    },
    drive: (state, action: { vehicle: string; x: number; y: number; crop?: string }, ctx, events, kit) => {
      const def = Object.hasOwn(VEHICLES, String(action.vehicle)) ? VEHICLES[String(action.vehicle)] : undefined;
      if (!def) throw new GameError('Unknown vehicle');
      if (!ownsVehicle(state, def.id)) throw new GameError(`You don't have a ${def.name} yet`);
      const x = Number(action.x);
      const y = Number(action.y);
      if (!Number.isInteger(x) || !Number.isInteger(y)) throw new GameError('Pick a spot on your farm');
      if (fuelLevel(state, ctx.now) < 1) throw new GameError('Out of fuel! The tank refills a little every 10 minutes.');
      let crop: string | undefined;
      if (def.job === 'plant') {
        crop = String(action.crop ?? '');
        if (!Object.hasOwn(CROPS, crop)) throw new GameError('Choose which seeds the Seeder should plant');
      }
      const todo = driveActions(state, def.id, x, y, crop, ctx.now);
      if (!todo.length) {
        throw new GameError(
          def.job === 'plow' ? 'No open grass to plow there' : def.job === 'plant' ? 'No empty plots to plant there' : 'Nothing ripe to harvest there',
        );
      }
      const done = applySubActions(state, todo, ctx, events);
      if (!done) throw new GameError(def.job === 'harvest' ? 'Nothing ripe to harvest there' : 'Not enough coins');
      const g = settleFuel(state, ctx.now);
      g.fuel -= 1;
      kit.bumpStat(state, 'drive');
      kit.bumpStat(state, `drive:${def.id}`);
      const o = vehicleOrigin(def, x, y);
      events.push({ type: 'drove', vehicle: def.id, x: o.x, y: o.y, size: def.size, done });
    },
  },
});
