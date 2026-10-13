// A small plug-in system for game mechanics. Each feature lives in its own
// file under shared/src/features, registers its actions here and may migrate
// old saves or react after every action. The reducer hands features a kit of
// its helpers so they all follow the same rules for coins, XP and items.

import type { ActionContext, FarmObject, FarmState, GameEvent } from '../types';

type At = { x: number; y: number };

export interface FeatureKit {
  spend(state: FarmState, coins: number, events: GameEvent[], at?: At): void;
  earn(state: FarmState, coins: number, events: GameEvent[], at?: At): void;
  addXp(state: FarmState, xp: number, events: GameEvent[], at?: At): void;
  addItem(state: FarmState, item: string, qty: number, events?: GameEvent[], at?: At): void;
  /** Throws a GameError when the player has too few. */
  takeItem(state: FarmState, item: string, qty: number): void;
  bumpStat(state: FarmState, stat: string, by?: number): void;
  getObject<K extends FarmObject['kind']>(state: FarmState, id: string, kind?: K): Extract<FarmObject, { kind: K }>;
  /** Seeded random in [0, 1): the same on client and server. Never use Math.random in shared code. */
  nextRandom(state: FarmState): number;
  /** "YYYY-MM-DD" in UTC. */
  utcDay(now: number): string;
  eventOn(ctx: ActionContext, event: string): boolean;
  canPlace(state: FarmState, x: number, y: number, w: number, h: number, ignoreId?: string): boolean;
  centerOf(obj: FarmObject): At;
}

export type FeatureHandler = (state: FarmState, action: any, ctx: ActionContext, events: GameEvent[], kit: FeatureKit) => void; // eslint-disable-line @typescript-eslint/no-explicit-any

export interface FeatureDef {
  id: string;
  /** Action type -> handler. The state is already a private copy; mutate it freely. */
  actions?: Record<string, FeatureHandler>;
  /** Fill in this feature's fields on saves made before it existed. Runs before every action. */
  migrate?: (state: FarmState) => void;
  /** Runs after every successful action (core or feature), before quests refresh. */
  after?: FeatureHandler;
}

const FEATURES: FeatureDef[] = [];
const HANDLERS: Record<string, FeatureHandler> = Object.create(null);

export function registerFeature(def: FeatureDef): void {
  if (FEATURES.some((f) => f.id === def.id)) return;
  FEATURES.push(def);
  for (const [type, fn] of Object.entries(def.actions ?? {})) HANDLERS[type] = fn;
}

export function featureHandler(type: string): FeatureHandler | undefined {
  return Object.hasOwn(HANDLERS, type) ? HANDLERS[type] : undefined;
}

export function migrateFeatures(state: FarmState): void {
  for (const f of FEATURES) f.migrate?.(state);
}

export function afterFeatures(state: FarmState, action: unknown, ctx: ActionContext, events: GameEvent[], kit: FeatureKit): void {
  for (const f of FEATURES) f.after?.(state, action, ctx, events, kit);
}
