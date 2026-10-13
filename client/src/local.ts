// The browser-only backend (the GitHub Pages build): the same `api` the
// server offers, but the farm is saved on this device and the villagers'
// farms are built right here. The game rules are the shared ones, so a farm
// behaves exactly as it would on the server.

import {
  GIFTS,
  GameError,
  HELPS_PER_FRIEND_PER_DAY,
  HELP_REWARD,
  NPC_NEIGHBORS,
  NPC_USERNAME,
  VILLAGER_FARMS,
  addItem,
  addXp,
  applyAction,
  applyHelp,
  bumpStat,
  completeQuestSet,
  createFarm,
  farmFromSnapshot,
  farmCharm,
  keepLevel,
  refreshNpcFarm,
  refreshQuests,
  utcDay,
  type FarmSnapshot,
  type FarmState,
  type GameEvent,
  type TimedAction,
} from '@farm/shared';
// Errors are the server's ApiError (status and message), so the store treats both backends alike.
import { ApiError, type ActionsPayload, type Friend, type HelpPayload, type MePayload, type SocialPayload, type VisitPayload } from './api';

export const SAVE_KEY = 'meadowbrook.save';

/** Everything a local farm keeps between visits. */
export interface LocalSave {
  v: 1;
  username: string;
  state: FarmState;
  rev: number;
  helps: { day: string; used: Record<string, number> };
  /** Neighbor → the day a gift was last sent to them. */
  giftsSent: Record<string, string>;
  inbox: { id: number; item: string; qty: number; from: string; createdAt: number }[];
  notifications: { id: number; text: string; createdAt: number; seen: boolean }[];
  nextId: number;
  /** Friends' farms saved from invite links, by the name they're listed under. */
  pals?: Record<string, { snap: FarmSnapshot; addedAt: number }>;
}

let save: LocalSave | null = null;
/** The villagers' farms for this session (rebuilt fresh each time the game opens). */
const villagers = new Map<string, FarmState>();
/** Friends' farms as built from their links (helps made today live here until the page closes). */
const palFarms = new Map<string, FarmState>();
const allEvents = new URLSearchParams(location.search).has('allEvents');
const ctx = (now: number) => ({ now, allEvents });

function read(): LocalSave | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as LocalSave;
    if (!s || s.v !== 1 || !s.state) return null;
    keepLevel(s.state);
    return s;
  } catch {
    return null;
  }
}

function load(): LocalSave {
  save ??= read();
  if (!save) throw new ApiError(401, 'No farm yet');
  return save;
}

function write(s: LocalSave): void {
  save = s;
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(s));
  } catch {
    /* storage full or blocked: the farm still plays for this visit */
  }
}

export function hasLocalFarm(): boolean {
  return (save ??= read()) !== null;
}

/** The whole save as a file-friendly string (for backups). */
export function exportSave(): string {
  return JSON.stringify(load());
}

/** Replace this device's farm with a backup. Throws if the file isn't a farm. */
export function importSave(text: string): void {
  let s: LocalSave;
  try {
    s = JSON.parse(text) as LocalSave;
  } catch {
    throw new ApiError(400, "That file isn't a Meadowbrook farm");
  }
  if (!s || s.v !== 1 || typeof s.username !== 'string' || !s.state?.objects) throw new ApiError(400, "That file isn't a Meadowbrook farm");
  write(s);
}

/** Ask the browser to keep our save even when space runs low. */
function persist(): void {
  void navigator.storage?.persist?.().catch(() => {});
}

function notify(s: LocalSave, text: string, now: number): void {
  s.notifications.unshift({ id: s.nextId++, text, createdAt: now, seen: false });
  s.notifications.length = Math.min(s.notifications.length, 30);
}

function mePayload(s: LocalSave): MePayload {
  return { user: { username: s.username, isNpc: false }, state: structuredClone(s.state), rev: s.rev, serverTime: Date.now(), allEvents };
}

const sameName = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

function villager(username: string, now: number): FarmState {
  const def = VILLAGER_FARMS.find((f) => f.username === username);
  if (!def) throw new ApiError(404, `No farmer named "${username}"`);
  let farm = villagers.get(def.username);
  if (!farm) {
    farm = def.build(now);
    villagers.set(def.username, farm);
  } else refreshNpcFarm(farm, now);
  return farm;
}

function palFarm(s: LocalSave, name: string, now: number): FarmState {
  let farm = palFarms.get(name);
  if (!farm) {
    farm = farmFromSnapshot(s.pals![name].snap, now);
    palFarms.set(name, farm);
  }
  return farm;
}

/** A neighbor by name: one of the villagers, or a friend saved from a link. */
function neighbor(s: LocalSave, username: string, now: number): { name: string; farm: FarmState; pal?: FarmSnapshot } {
  const npc = NPC_NEIGHBORS.find((v) => sameName(v.username, username));
  if (npc) return { name: npc.username, farm: villager(npc.username, now) };
  const name = Object.keys(s.pals ?? {}).find((p) => sameName(p, username));
  if (!name) throw new ApiError(404, `No farmer named "${username}"`);
  return { name, farm: palFarm(s, name, now), pal: s.pals![name].snap };
}

/**
 * Keep a friend's farm from an invite link. A newer link from the same friend
 * replaces their old one. Returns the name they're listed under, or null for a
 * link to this very farm.
 */
export function addPal(snap: FarmSnapshot): string | null {
  const s = load();
  if (sameName(snap.by, s.username) && snap.name === s.state.name) return null;
  s.pals ??= {};
  const taken = (n: string) => sameName(n, s.username) || NPC_NEIGHBORS.some((v) => sameName(v.username, n));
  let name = snap.by;
  for (let i = 2; taken(name); i++) name = `${snap.by} ${i}`;
  const old = Object.keys(s.pals).find((p) => sameName(p, name));
  if (old) delete s.pals[old];
  s.pals[name] = { snap, addedAt: Date.now() };
  palFarms.delete(name);
  write(s);
  return name;
}

function helpsUsed(s: LocalSave, username: string, now: number): number {
  if (s.helps.day !== utcDay(now)) s.helps = { day: utcDay(now), used: {} };
  return s.helps.used[username] ?? 0;
}

const giftSentToday = (s: LocalSave, username: string, now: number) => s.giftsSent[username] === utcDay(now);

/** Run a change to our own farm the way the server does: quest progress, then save. */
function changeMine(s: LocalSave, now: number, fn: (state: FarmState, events: GameEvent[]) => void): GameEvent[] {
  const events: GameEvent[] = [];
  const was = completeQuestSet(s.state);
  fn(s.state, events);
  refreshQuests(s.state, events, was, ctx(now));
  s.rev++;
  return events;
}

const resolve = <T>(fn: () => T): Promise<T> => {
  try {
    return Promise.resolve(fn());
  } catch (err) {
    if (err instanceof GameError) return Promise.reject(new ApiError(400, err.message));
    return Promise.reject(err);
  }
};

export const localApi = {
  register: (username: string, _password?: string) =>
    resolve(() => {
      const name = username.trim();
      if (name.length < 2 || name.length > 16) throw new ApiError(400, 'Farmer names are 2-16 characters');
      const now = Date.now();
      const s: LocalSave = {
        v: 1,
        username: name,
        state: createFarm(`${name}'s Farm`, now),
        rev: 1,
        helps: { day: utcDay(now), used: {} },
        giftsSent: {},
        inbox: [],
        notifications: [],
        nextId: 1,
      };
      s.inbox.push({ id: s.nextId++, item: 'tulips_pink', qty: 1, from: NPC_USERNAME, createdAt: now });
      notify(s, 'Mayor Maple welcomed you to the valley and sent you a housewarming gift!', now);
      write(s);
      persist();
      return { token: 'local', ...mePayload(s) };
    }),
  login: (_username: string, _password: string) =>
    resolve<MePayload & { token: string }>(() => {
      throw new ApiError(400, 'This farm lives on your device: no password needed');
    }),
  logout: () => resolve(() => ({ ok: true as const })),
  me: () => resolve(() => mePayload(load())),

  actions: (actions: TimedAction[]) =>
    resolve((): ActionsPayload => {
      const s = load();
      const now = Date.now();
      let state = s.state;
      let applied = 0;
      let error: string | undefined;
      for (const action of actions) {
        try {
          state = applyAction(state, action, ctx(typeof action.t === 'number' ? Math.min(action.t, now + 3000) : now)).state;
          applied++;
        } catch (err) {
          if (!(err instanceof GameError)) throw err;
          error = err.message;
          break;
        }
      }
      if (applied) {
        s.state = state;
        s.rev++;
        write(s);
      }
      return { ok: !error, error, applied, state: structuredClone(state), rev: s.rev, serverTime: now };
    }),

  social: () =>
    resolve((): SocialPayload => {
      const s = load();
      const now = Date.now();
      const friends: Friend[] = NPC_NEIGHBORS.map((n) => {
        const farm = villager(n.username, now);
        return {
          username: n.username,
          isNpc: true,
          farmName: farm.name,
          level: farm.level,
          charm: farmCharm(farm),
          lastSeen: now,
          helpsLeft: Math.max(0, HELPS_PER_FRIEND_PER_DAY - helpsUsed(s, n.username, now)),
          giftSent: giftSentToday(s, n.username, now),
        };
      });
      for (const [name, { snap }] of Object.entries(s.pals ?? {})) {
        const farm = palFarm(s, name, now);
        friends.push({
          username: name,
          isNpc: false,
          pal: true,
          farmName: farm.name,
          level: farm.level,
          charm: farmCharm(farm),
          lastSeen: snap.at,
          helpsLeft: Math.max(0, HELPS_PER_FRIEND_PER_DAY - helpsUsed(s, name, now)),
          giftSent: true,
        });
      }
      return { rev: s.rev, friends, incoming: [], outgoing: [], gifts: [...s.inbox], notifications: [...s.notifications] };
    }),
  seenNotifications: () =>
    resolve(() => {
      const s = load();
      for (const n of s.notifications) n.seen = true;
      write(s);
      return { ok: true };
    }),
  requestFriend: (_username: string) =>
    resolve<{ status: 'pending' | 'friends'; username: string }>(() => {
      throw new ApiError(400, 'Share a farm postcard to show friends your farm');
    }),
  respondFriend: (_username: string, _accept: boolean) => resolve(() => ({ ok: true })),
  removeFriend: (username: string) =>
    resolve(() => {
      const s = load();
      const name = Object.keys(s.pals ?? {}).find((p) => sameName(p, username));
      if (!name) throw new ApiError(400, 'The villagers will always be your neighbors');
      delete s.pals![name];
      palFarms.delete(name);
      write(s);
      return { ok: true };
    }),

  visit: (username: string) =>
    resolve((): VisitPayload => {
      const s = load();
      const now = Date.now();
      const { name, farm, pal } = neighbor(s, username, now);
      changeMine(s, now, (state) => bumpStat(state, 'visit'));
      write(s);
      return {
        owner: { username: name, isNpc: !pal },
        state: structuredClone(farm),
        helpsLeft: Math.max(0, HELPS_PER_FRIEND_PER_DAY - helpsUsed(s, name, now)),
        giftSent: pal ? true : giftSentToday(s, name, now),
        sharedAt: pal?.at,
        myState: structuredClone(s.state),
        myRev: s.rev,
        serverTime: now,
      };
    }),

  help: (username: string, objectId: string) =>
    resolve((): HelpPayload => {
      const s = load();
      const now = Date.now();
      const { name, farm } = neighbor(s, username, now);
      const used = helpsUsed(s, name, now);
      if (used >= HELPS_PER_FRIEND_PER_DAY) throw new ApiError(429, 'No helps left for this neighbor today');
      const result = applyHelp(farm, objectId, now);
      s.helps.used[name] = used + 1;
      const events = changeMine(s, now, (state, ev) => {
        state.coins += HELP_REWARD.coins;
        ev.push({ type: 'gain', what: 'coins', amount: HELP_REWARD.coins });
        addXp(state, HELP_REWARD.xp, ev);
        bumpStat(state, 'help');
      });
      write(s);
      return {
        state: structuredClone(farm),
        myState: structuredClone(s.state),
        myRev: s.rev,
        helpsLeft: HELPS_PER_FRIEND_PER_DAY - used - 1,
        result,
        events,
        serverTime: now,
      };
    }),

  sendGift: (username: string, giftId: string) =>
    resolve(() => {
      const s = load();
      const now = Date.now();
      const { name, pal } = neighbor(s, username, now);
      if (pal) throw new ApiError(400, "Gifts can't travel through a link (yet!)");
      const gift = GIFTS[giftId];
      if (!gift) throw new ApiError(400, 'Unknown gift');
      if (giftSentToday(s, name, now)) throw new ApiError(429, 'You already sent them a gift today');
      if (s.state.level < gift.level) throw new ApiError(400, `That gift unlocks at level ${gift.level}`);
      s.giftsSent[name] = utcDay(now);
      changeMine(s, now, (state) => bumpStat(state, 'gift'));
      write(s);
      return { ok: true as const, myState: structuredClone(s.state), myRev: s.rev };
    }),

  claimGift: (id: number) =>
    resolve(() => {
      const s = load();
      const gift = s.inbox.find((g) => g.id === id);
      if (!gift) throw new ApiError(404, 'That gift is gone');
      s.inbox = s.inbox.filter((g) => g !== gift);
      addItem(s.state, gift.item, gift.qty);
      s.rev++;
      write(s);
      return { ok: true as const, state: structuredClone(s.state), rev: s.rev };
    }),
};
