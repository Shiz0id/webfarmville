import { BUILDINGS, findRecipe } from '../content/buildings';
import { CROPS, PLOW_COST, PLOW_XP } from '../content/crops';
import { DECORATIONS } from '../content/decorations';
import { EVENTS, isEventActive } from '../content/events';
import { ITEMS } from '../content/items';
import { ANIMALS, TREES } from '../content/producers';
import {
  SELL_BACK,
  charmStars,
  dailyBonus,
  levelForXp,
  levelUpReward,
  nextExpansion,
} from '../content/progression';
import { MYSTERY_CHANCE, MYSTERY_GIFT, ensureOrders, generateOrder, nextRandom, rollMysteryGift } from '../content/orders';
import { QUESTS } from '../content/quests';
import {
  GameError,
  type Action,
  type ActionContext,
  type FarmObject,
  type FarmState,
  type GameEvent,
} from '../types';
import { footprint, placeable } from './catalog';
import { completeQuestSet, farmCharm, isQuestComplete, refreshQuests } from './quests';
import { buildingStatus, cropStatus, producerStatus } from './status';

export interface ActionResult {
  state: FarmState;
  events: GameEvent[];
}

// ---------------------------------------------------------------------------
// Grid helpers

export function inBounds(state: FarmState, x: number, y: number, w = 1, h = 1): boolean {
  return Number.isInteger(x) && Number.isInteger(y) && x >= 0 && y >= 0 && x + w <= state.size && y + h <= state.size;
}

/** Map from "x,y" to the id of the object covering that tile. */
export function occupancy(state: FarmState, ignoreId?: string): Map<string, string> {
  const map = new Map<string, string>();
  for (const o of Object.values(state.objects)) {
    if (o.id === ignoreId) continue;
    const { w, h } = footprint(o);
    for (let dx = 0; dx < w; dx++) for (let dy = 0; dy < h; dy++) map.set(`${o.x + dx},${o.y + dy}`, o.id);
  }
  return map;
}

export function objectAt(state: FarmState, x: number, y: number): FarmObject | undefined {
  const id = occupancy(state).get(`${x},${y}`);
  return id ? state.objects[id] : undefined;
}

export function canPlace(state: FarmState, x: number, y: number, w: number, h: number, ignoreId?: string): boolean {
  if (!inBounds(state, x, y, w, h)) return false;
  const occ = occupancy(state, ignoreId);
  for (let dx = 0; dx < w; dx++) for (let dy = 0; dy < h; dy++) if (occ.has(`${x + dx},${y + dy}`)) return false;
  return true;
}

// ---------------------------------------------------------------------------
// Small state helpers

function spend(state: FarmState, coins: number, events: GameEvent[], at?: { x: number; y: number }): void {
  if (state.coins < coins) throw new GameError('Not enough coins');
  state.coins -= coins;
  if (coins > 0) events.push({ type: 'spend', amount: coins, ...at });
}

function earn(state: FarmState, coins: number, events: GameEvent[], at?: { x: number; y: number }): void {
  if (coins <= 0) return;
  state.coins += coins;
  events.push({ type: 'gain', what: 'coins', amount: coins, ...at });
}

export function addXp(state: FarmState, xp: number, events: GameEvent[], at?: { x: number; y: number }): void {
  if (xp <= 0) return;
  state.xp += xp;
  events.push({ type: 'gain', what: 'xp', amount: xp, ...at });
  const level = levelForXp(state.xp);
  while (state.level < level) {
    state.level++;
    state.coins += levelUpReward(state.level);
    events.push({ type: 'levelUp', level: state.level });
  }
}

export function addItem(state: FarmState, item: string, qty: number, events?: GameEvent[], at?: { x: number; y: number }): void {
  if (qty <= 0) return;
  state.inventory[item] = (state.inventory[item] ?? 0) + qty;
  events?.push({ type: 'gain', what: item, amount: qty, ...at });
}

function takeItem(state: FarmState, item: string, qty: number): void {
  const have = state.inventory[item] ?? 0;
  if (have < qty) throw new GameError(`Not enough ${ITEMS[item]?.name ?? DECORATIONS[item]?.name ?? item}`);
  if (have === qty) delete state.inventory[item];
  else state.inventory[item] = have - qty;
}

export function bumpStat(state: FarmState, stat: string, by = 1): void {
  state.stats[stat] = (state.stats[stat] ?? 0) + by;
}

function getObject<K extends FarmObject['kind']>(state: FarmState, id: string, kind?: K): Extract<FarmObject, { kind: K }> {
  const obj = Object.hasOwn(state.objects, id) ? state.objects[id] : undefined;
  if (!obj) throw new GameError('That object is gone');
  if (kind && obj.kind !== kind) throw new GameError('Wrong kind of object');
  return obj as Extract<FarmObject, { kind: K }>;
}

function maybeMysteryGift(state: FarmState, events: GameEvent[], at: { x: number; y: number }): void {
  if (nextRandom(state) >= MYSTERY_CHANCE) return;
  addItem(state, MYSTERY_GIFT, 1, events, at);
  events.push({ type: 'mystery', item: MYSTERY_GIFT });
}

function newId(state: FarmState): string {
  return `o${state.nextId++}`;
}

export function utcDay(now: number): string {
  return new Date(now).toISOString().slice(0, 10);
}

function centerOf(obj: FarmObject): { x: number; y: number } {
  const { w, h } = footprint(obj);
  return { x: obj.x + w / 2, y: obj.y + h / 2 };
}

function placeObject(state: FarmState, def: string, x: number, y: number, flip: boolean | undefined, now: number): FarmObject {
  const p = placeable(def);
  if (!p) throw new GameError('Unknown item');
  if (!canPlace(state, x, y, p.w, p.h)) throw new GameError("Can't place that there");
  const id = newId(state);
  let obj: FarmObject;
  switch (p.kind) {
    case 'tree':
    case 'animal':
      obj = { id, kind: p.kind, def, x, y, cycleStart: now };
      break;
    case 'building':
      obj = { id, kind: 'building', def, x, y, queue: [] };
      break;
    case 'deco':
      obj = { id, kind: 'deco', def, x, y, ...(flip ? { flip: true } : {}) };
      break;
  }
  state.objects[id] = obj;
  return obj;
}

// ---------------------------------------------------------------------------
// The reducer

/**
 * Apply one player action. Pure with respect to its inputs: the given state is
 * not modified; a new state is returned. Throws GameError when not allowed.
 */
export function applyAction(prev: FarmState, action: Action, ctx: ActionContext): ActionResult {
  if (!action || typeof action !== 'object' || typeof action.type !== 'string') throw new GameError('Unknown action');
  const state: FarmState = structuredClone(prev);
  const events: GameEvent[] = [];
  const now = ctx.now;
  ensureOrders(state);
  const wasComplete = completeQuestSet(state);

  switch (action.type) {
    case 'plow': {
      if (!canPlace(state, action.x, action.y, 1, 1)) throw new GameError("Can't plow there");
      spend(state, PLOW_COST, events, { x: action.x + 0.5, y: action.y + 0.5 });
      const id = newId(state);
      state.objects[id] = { id, kind: 'plot', x: action.x, y: action.y };
      addXp(state, PLOW_XP, events);
      bumpStat(state, 'plow');
      break;
    }

    case 'plant': {
      const plot = getObject(state, action.id, 'plot');
      const def = CROPS[action.crop];
      if (!def) throw new GameError('Unknown crop');
      if (plot.crop) throw new GameError('Something is already growing here');
      if (state.level < def.level) throw new GameError(`${def.name} unlock at level ${def.level}`);
      spend(state, def.cost, events, centerOf(plot));
      plot.crop = def.id;
      plot.plantedAt = now;
      delete plot.fertilized;
      state.lastSeed = def.id;
      bumpStat(state, 'plant');
      break;
    }

    case 'harvest': {
      const plot = getObject(state, action.id, 'plot');
      const status = cropStatus(plot, now);
      if (status.stage === 'withered') throw new GameError('This crop has withered');
      if (status.stage !== 'ready') throw new GameError('Not ready yet');
      const def = CROPS[plot.crop!];
      const at = centerOf(plot);
      addItem(state, def.id, def.yield + (plot.fertilized ? 1 : 0), events, at);
      addXp(state, def.xp, events, at);
      maybeMysteryGift(state, events, at);
      bumpStat(state, 'harvest');
      bumpStat(state, `harvest:${def.id}`);
      delete plot.crop;
      delete plot.plantedAt;
      delete plot.fertilized;
      break;
    }

    case 'clearPlot': {
      const plot = getObject(state, action.id, 'plot');
      if (cropStatus(plot, now).stage !== 'withered') throw new GameError('Nothing to clear');
      delete plot.crop;
      delete plot.plantedAt;
      delete plot.fertilized;
      break;
    }

    case 'collect': {
      const obj = getObject(state, action.id);
      if (obj.kind !== 'tree' && obj.kind !== 'animal') throw new GameError('Nothing to collect');
      if (!producerStatus(obj, now).ready) throw new GameError('Not ready yet');
      const def = obj.kind === 'tree' ? TREES[obj.def] : ANIMALS[obj.def];
      const at = centerOf(obj);
      addItem(state, def.product, def.yield, events, at);
      addXp(state, def.xp, events, at);
      maybeMysteryGift(state, events, at);
      bumpStat(state, 'collect');
      bumpStat(state, `collect:${def.id}`);
      obj.cycleStart = now;
      delete obj.helped;
      break;
    }

    case 'buy': {
      const p = placeable(action.def);
      if (!p || p.starter) throw new GameError('That is not for sale');
      if (state.level < p.level) throw new GameError(`Unlocks at level ${p.level}`);
      if (p.event && !ctx.allEvents && !isEventActive(EVENTS[p.event], now))
        throw new GameError(`Only available during ${EVENTS[p.event]?.name ?? 'its event'}`);
      spend(state, p.cost, events, { x: action.x + p.w / 2, y: action.y + p.h / 2 });
      placeObject(state, action.def, action.x, action.y, action.flip, now);
      if (p.kind === 'deco') {
        bumpStat(state, 'place:deco');
        if (p.event) bumpStat(state, 'place:seasonal');
      }
      bumpStat(state, `buy:${p.kind}`);
      break;
    }

    case 'placeStored': {
      const p = placeable(action.def);
      if (!p || p.kind !== 'deco') throw new GameError('Only decorations can be stored');
      takeItem(state, action.def, 1);
      placeObject(state, action.def, action.x, action.y, action.flip, now);
      bumpStat(state, 'place:deco');
      if (p.event) bumpStat(state, 'place:seasonal');
      break;
    }

    case 'move': {
      const obj = getObject(state, action.id);
      const { w, h } = footprint(obj);
      if (!canPlace(state, action.x, action.y, w, h, obj.id)) throw new GameError("Can't move it there");
      obj.x = action.x;
      obj.y = action.y;
      if (obj.kind === 'deco') {
        if (action.flip) obj.flip = true;
        else delete obj.flip;
      }
      break;
    }

    case 'store': {
      const obj = getObject(state, action.id, 'deco');
      delete state.objects[obj.id];
      addItem(state, obj.def, 1);
      break;
    }

    case 'sellObject': {
      const obj = getObject(state, action.id);
      if (obj.kind === 'plot') {
        delete state.objects[obj.id];
        break;
      }
      const p = placeable(obj.def);
      if (!p || p.starter) throw new GameError("You can't sell that");
      delete state.objects[obj.id];
      earn(state, Math.floor(p.cost * SELL_BACK), events, centerOf(obj));
      break;
    }

    case 'craft': {
      const b = getObject(state, action.id, 'building');
      const def = BUILDINGS[b.def];
      const recipe = findRecipe(b.def, action.recipe);
      if (!def || !recipe) throw new GameError("This building can't make that");
      if (b.queue.length >= def.slots) throw new GameError('The queue is full');
      for (const [item, qty] of Object.entries(recipe.inputs)) {
        if ((state.inventory[item] ?? 0) < qty) throw new GameError(`Need ${qty} ${ITEMS[item]?.name ?? item}`);
      }
      for (const [item, qty] of Object.entries(recipe.inputs)) takeItem(state, item, qty);
      const start = Math.max(now, b.queue.length ? b.queue[b.queue.length - 1].end : 0);
      b.queue.push({ recipe: recipe.id, end: start + recipe.craftSec * 1000 });
      break;
    }

    case 'collectCrafts': {
      const b = getObject(state, action.id, 'building');
      if (buildingStatus(b, now).done === 0) throw new GameError('Nothing is finished yet');
      const at = centerOf(b);
      const remaining = [];
      for (const job of b.queue) {
        if (job.end > now) {
          remaining.push(job);
          continue;
        }
        const recipe = findRecipe(b.def, job.recipe);
        if (!recipe) continue;
        addItem(state, recipe.output, recipe.qty, events, at);
        addXp(state, recipe.xp, events, at);
        bumpStat(state, 'craft', recipe.qty);
        bumpStat(state, `craft:${recipe.output}`, recipe.qty);
      }
      b.queue = remaining;
      break;
    }

    case 'sellItem': {
      const qty = action.qty;
      if (!Number.isInteger(qty) || qty <= 0) throw new GameError('Invalid amount');
      const item = ITEMS[action.item];
      const deco = DECORATIONS[action.item];
      if (!item && !deco) throw new GameError('Unknown item');
      takeItem(state, action.item, qty);
      const price = item ? item.sell : Math.floor(deco.cost * SELL_BACK);
      earn(state, price * qty, events);
      bumpStat(state, 'sell', qty);
      break;
    }

    case 'expand': {
      const next = nextExpansion(state.size);
      if (!next) throw new GameError('Your farm is as big as it gets!');
      if (state.level < next.level) throw new GameError(`Expansion unlocks at level ${next.level}`);
      spend(state, next.cost, events);
      state.size = next.size;
      bumpStat(state, 'expand');
      break;
    }

    case 'claimQuest': {
      const q = QUESTS[action.quest];
      if (!q || !state.quests.active.includes(q.id)) throw new GameError('Unknown quest');
      if (!isQuestComplete(state, q.id)) throw new GameError('Quest not complete yet');
      state.quests.active = state.quests.active.filter((id) => id !== q.id);
      state.quests.completed.push(q.id);
      for (const key of Object.keys(state.quests.baselines)) {
        if (key.startsWith(`${q.id}:`)) delete state.quests.baselines[key];
      }
      earn(state, q.reward.coins, events);
      addXp(state, q.reward.xp, events);
      for (const [item, qty] of Object.entries(q.reward.items ?? {})) addItem(state, item, qty, events);
      events.push({ type: 'questComplete', quest: q.id });
      break;
    }

    case 'claimDaily': {
      const today = utcDay(now);
      if (state.daily.last === today) throw new GameError('Already claimed today');
      const yesterday = utcDay(now - 86_400_000);
      state.daily.streak = state.daily.last === yesterday ? state.daily.streak + 1 : 1;
      state.daily.last = today;
      const bonus = dailyBonus(state.daily.streak, charmStars(farmCharm(state)));
      earn(state, bonus.coins, events);
      addXp(state, bonus.xp, events);
      break;
    }

    case 'fulfillOrder': {
      const idx = state.orders.findIndex((o) => o.id === action.order);
      if (idx < 0) throw new GameError('That order is gone');
      const order = state.orders[idx];
      for (const [item, qty] of Object.entries(order.items)) {
        if ((state.inventory[item] ?? 0) < qty) throw new GameError(`Need ${qty} ${ITEMS[item]?.name ?? item}`);
      }
      for (const [item, qty] of Object.entries(order.items)) takeItem(state, item, qty);
      earn(state, order.coins, events);
      addXp(state, order.xp, events);
      if (order.bonus) addItem(state, order.bonus, 1, events);
      state.orders.splice(idx, 1, generateOrder(state));
      bumpStat(state, 'order');
      break;
    }

    case 'skipOrder': {
      const idx = state.orders.findIndex((o) => o.id === action.order);
      if (idx < 0) throw new GameError('That order is gone');
      state.orders.splice(idx, 1, generateOrder(state));
      break;
    }

    case 'openGift': {
      takeItem(state, MYSTERY_GIFT, 1);
      const deco = rollMysteryGift(state);
      addItem(state, deco, 1);
      events.push({ type: 'unwrap', item: deco });
      bumpStat(state, 'unwrap');
      break;
    }

    case 'rename': {
      const name = String(action.name ?? '').trim().replace(/\s+/g, ' ');
      if (name.length < 1 || name.length > 24) throw new GameError('Farm names must be 1-24 characters');
      state.name = name;
      break;
    }

    default:
      throw new GameError('Unknown action');
  }

  refreshQuests(state, events, wasComplete);
  return { state, events };
}
