// Farm state is a plain JSON document. The server stores it per player and is
// the authority; the client runs the same reducer for instant feedback.

export interface Placed {
  id: string;
  x: number;
  y: number;
}

export interface PlotObject extends Placed {
  kind: 'plot';
  crop?: string;
  plantedAt?: number;
  /** A neighbor fertilized this crop: it grew faster and yields +1. */
  fertilized?: boolean;
}

export interface ProducerObject extends Placed {
  kind: 'tree' | 'animal';
  def: string;
  /** When the current production cycle started. */
  cycleStart: number;
  /** A neighbor already helped during this cycle. */
  helped?: boolean;
}

export interface CraftJob {
  recipe: string;
  /** When this job finishes; jobs run one after another. */
  end: number;
}

export interface BuildingObject extends Placed {
  kind: 'building';
  def: string;
  queue: CraftJob[];
}

export interface DecoObject extends Placed {
  kind: 'deco';
  def: string;
  /** Mirror horizontally. */
  flip?: boolean;
}

export type FarmObject = PlotObject | ProducerObject | BuildingObject | DecoObject;
export type ObjectKind = FarmObject['kind'];

export interface QuestState {
  /** Quest ids currently shown to the player. */
  active: string[];
  completed: string[];
  /** Stat values captured when each active quest started, keyed `${quest}:${goalIndex}`. */
  baselines: Record<string, number>;
}

export interface FarmState {
  version: 1;
  name: string;
  coins: number;
  xp: number;
  level: number;
  /** Side length of the square of land the player owns. */
  size: number;
  nextId: number;
  objects: Record<string, FarmObject>;
  /** Item and stored-decoration counts. */
  inventory: Record<string, number>;
  quests: QuestState;
  /** Lifetime counters used by quests ("harvest", "craft:bread", ...). */
  stats: Record<string, number>;
  daily: { last: string | null; streak: number };
  /** Last seed the player planted, so tapping an empty plot can replant it. */
  lastSeed: string;
  createdAt: number;
  /** Seed for deterministic randomness (orders, mystery gifts). */
  seed: number;
  /** The villager order board. */
  orders: Order[];
  /** Ribbon id -> number of tiers claimed (0-4). */
  ribbons: Record<string, number>;
  /** Trick-or-treaters greeted today. */
  treats: { day: string; count: number };
}

export interface Order {
  id: number;
  giver: string;
  note: string;
  items: Record<string, number>;
  coins: number;
  xp: number;
  /** A decoration given as a thank-you. */
  bonus?: string;
}

/** Something the UI may want to celebrate (floating text, sounds, popups). */
export type GameEvent =
  | { type: 'gain'; what: 'coins' | 'xp' | string; amount: number; x?: number; y?: number }
  | { type: 'spend'; amount: number; x?: number; y?: number }
  | { type: 'levelUp'; level: number }
  | { type: 'questReady'; quest: string }
  | { type: 'questComplete'; quest: string }
  | { type: 'mystery'; item: string }
  | { type: 'unwrap'; item: string }
  | { type: 'ribbon'; ribbon: string; tier: number };

export type Action =
  | { type: 'plow'; x: number; y: number }
  | { type: 'plant'; id: string; crop: string }
  | { type: 'harvest'; id: string }
  | { type: 'clearPlot'; id: string }
  | { type: 'collect'; id: string }
  | { type: 'buy'; def: string; x: number; y: number; flip?: boolean }
  | { type: 'placeStored'; def: string; x: number; y: number; flip?: boolean }
  | { type: 'move'; id: string; x: number; y: number; flip?: boolean }
  | { type: 'store'; id: string }
  | { type: 'sellObject'; id: string }
  | { type: 'craft'; id: string; recipe: string }
  | { type: 'collectCrafts'; id: string }
  | { type: 'sellItem'; item: string; qty: number }
  | { type: 'expand' }
  | { type: 'claimQuest'; quest: string }
  | { type: 'claimDaily' }
  | { type: 'fulfillOrder'; order: number }
  | { type: 'skipOrder'; order: number }
  | { type: 'openGift' }
  | { type: 'treat' }
  | { type: 'claimRibbon'; ribbon: string }
  | { type: 'rename'; name: string };

/** An action stamped with the client time it happened. */
export type TimedAction = Action & { t: number };

export interface ActionContext {
  now: number;
  /** Let every seasonal event's items be bought (dev/testing). */
  allEvents?: boolean;
}

export class GameError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GameError';
  }
}

/** A farm object before it has been given an id. */
export type ObjectSeed = FarmObject extends infer T ? (T extends FarmObject ? Omit<T, 'id'> : never) : never;
