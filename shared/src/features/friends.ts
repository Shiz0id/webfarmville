// Villager friendships. Chat once a day, give one gift a day (loved gifts
// count most, and triple on a birthday) and fill their orders; every 100
// points is a heart. At 2, 4, 6, 8 and 10 hearts a letter with a present
// arrives in your mailbox.

import {
  BIRTHDAY_MULT,
  CHAT_POINTS,
  FRIENDS,
  FRIEND_LIST,
  GIFT_POINTS,
  HEART_POINTS,
  LETTERS,
  LETTER_HEARTS,
  MAX_HEARTS,
  ORDER_POINTS,
  WEATHER_CHAT,
  friendByName,
  giftTaste,
  type FriendDef,
  type GiftTaste,
} from '../content/friends';
import { ITEMS } from '../content/items';
import { townDone } from '../content/town';
import { weatherAt } from '../content/weather';
import { registerFeature, type FeatureKit } from '../logic/features';
import { GameError, type FarmState, type GameEvent } from '../types';

export interface Letter {
  id: number;
  from: string;
  /** Index into LETTERS[from]. */
  tier: number;
  at: number;
  read?: boolean;
  claimed?: boolean;
}

export interface FriendsState {
  points: Record<string, number>;
  giftDay: Record<string, string>;
  chatDay: Record<string, string>;
  /** Loved gifts discovered so far, per villager. */
  known: Record<string, string[]>;
  mail: Letter[];
  nextMail: number;
}

declare module '../types' {
  interface FarmState {
    friends?: FriendsState;
  }
  interface ExtraActions {
    chatVillager: { type: 'chatVillager'; who: string };
    giftVillager: { type: 'giftVillager'; who: string; item: string };
    readLetter: { type: 'readLetter'; id: number };
    claimLetter: { type: 'claimLetter'; id: number };
  }
  interface ExtraEvents {
    chat: { type: 'chat'; who: string; line: string };
    gifted: { type: 'gifted'; who: string; item: string; taste: GiftTaste; birthday: boolean; line: string };
    friendHeart: { type: 'friendHeart'; who: string; hearts: number };
    mail: { type: 'mail'; from: string };
    letterClaimed: { type: 'letterClaimed'; id: number };
  }
}

const MAX_LETTERS = 40;

function friends(state: FarmState): FriendsState {
  return (state.friends ??= { points: {}, giftDay: {}, chatDay: {}, known: {}, mail: [], nextMail: 1 });
}

export function heartsOf(state: FarmState, who: string): number {
  return Math.min(MAX_HEARTS, Math.floor((state.friends?.points[who] ?? 0) / HEART_POINTS));
}

/** 0..1 progress toward the next heart. */
export function heartProgress(state: FarmState, who: string): number {
  if (heartsOf(state, who) >= MAX_HEARTS) return 1;
  return ((state.friends?.points[who] ?? 0) % HEART_POINTS) / HEART_POINTS;
}

export function isBirthday(friend: FriendDef, now: number): boolean {
  const d = new Date(now);
  return d.getUTCMonth() + 1 === friend.birthday[0] && d.getUTCDate() === friend.birthday[1];
}

export function canChat(state: FarmState, who: string, now: number, kit: Pick<FeatureKit, 'utcDay'>): boolean {
  return state.friends?.chatDay[who] !== kit.utcDay(now);
}

export function canGift(state: FarmState, who: string, now: number, kit: Pick<FeatureKit, 'utcDay'>): boolean {
  return state.friends?.giftDay[who] !== kit.utcDay(now);
}

export function unreadMail(state: FarmState): number {
  return state.friends?.mail.filter((l) => !l.read || !l.claimed).length ?? 0;
}

function friend(who: unknown): FriendDef {
  const id = String(who);
  if (!Object.hasOwn(FRIENDS, id)) throw new GameError('Unknown villager');
  return FRIENDS[id];
}

/** Add friendship points; send letters for every milestone crossed. */
export function befriend(state: FarmState, who: string, points: number, now: number, events: GameEvent[]): void {
  const f = friends(state);
  const before = heartsOf(state, who);
  f.points[who] = Math.min(MAX_HEARTS * HEART_POINTS, (f.points[who] ?? 0) + points);
  const after = heartsOf(state, who);
  if (after <= before) return;
  events.push({ type: 'friendHeart', who, hearts: after });
  LETTER_HEARTS.forEach((h, tier) => {
    if (before < h && after >= h && LETTERS[who]?.[tier]) {
      f.mail.push({ id: f.nextMail++, from: who, tier, at: now });
      events.push({ type: 'mail', from: who });
    }
  });
  // Keep the mailbox tidy: drop the oldest finished letters.
  while (f.mail.length > MAX_LETTERS) {
    const i = f.mail.findIndex((l) => l.read && l.claimed);
    if (i < 0) break;
    f.mail.splice(i, 1);
  }
}

function pick<T>(list: T[], r: number): T {
  return list[Math.floor(r * list.length) % list.length];
}

registerFeature({
  id: 'friends',
  migrate: (state) => void friends(state),
  actions: {
    chatVillager: (state, action: { who: string }, ctx, events, kit) => {
      const def = friend(action.who);
      const f = friends(state);
      const today = kit.utcDay(ctx.now);
      if (f.chatDay[def.id] === today) throw new GameError(`You already chatted with ${def.name} today`);
      f.chatDay[def.id] = today;
      const r = kit.nextRandom(state);
      const wx = WEATHER_CHAT[weatherAt(ctx.now)];
      const line = isBirthday(def, ctx.now)
        ? "It's my birthday today! Hee hee, I'm so happy you stopped by."
        : wx && r < 0.35
          ? wx
          : pick(def.chat, kit.nextRandom(state));
      events.push({ type: 'chat', who: def.id, line });
      befriend(state, def.id, CHAT_POINTS * (townDone(state, 'bandstand') ? 2 : 1), ctx.now, events);
      kit.bumpStat(state, 'chat');
    },
    giftVillager: (state, action: { who: string; item: string }, ctx, events, kit) => {
      const def = friend(action.who);
      const item = String(action.item);
      if (!Object.hasOwn(ITEMS, item)) throw new GameError("That can't be given as a gift");
      const f = friends(state);
      const today = kit.utcDay(ctx.now);
      if (f.giftDay[def.id] === today) throw new GameError(`${def.name} already got a gift from you today`);
      kit.takeItem(state, item, 1);
      f.giftDay[def.id] = today;
      const taste = giftTaste(def, item, ITEMS[item].category);
      const birthday = isBirthday(def, ctx.now);
      if (taste === 'love' && !(f.known[def.id] ??= []).includes(item)) f.known[def.id].push(item);
      const line = birthday ? def.react.birthday : pick(def.react[taste], kit.nextRandom(state));
      events.push({ type: 'gifted', who: def.id, item, taste, birthday, line });
      befriend(state, def.id, GIFT_POINTS[taste] * (birthday ? BIRTHDAY_MULT : 1), ctx.now, events);
      kit.addXp(state, taste === 'love' ? 10 : 4, events);
      kit.bumpStat(state, 'gift');
      if (taste === 'love') kit.bumpStat(state, 'giftLoved');
    },
    readLetter: (state, action: { id: number }) => {
      const letter = friends(state).mail.find((l) => l.id === Number(action.id));
      if (!letter) throw new GameError('That letter is gone');
      letter.read = true;
    },
    claimLetter: (state, action: { id: number }, _ctx, events, kit) => {
      const letter = friends(state).mail.find((l) => l.id === Number(action.id));
      if (!letter) throw new GameError('That letter is gone');
      if (letter.claimed) throw new GameError('You already took this present');
      const reward = LETTERS[letter.from]?.[letter.tier]?.reward;
      if (!reward) throw new GameError('That letter is gone');
      letter.claimed = true;
      letter.read = true;
      if (reward.coins) kit.earn(state, reward.coins, events);
      for (const [item, qty] of Object.entries(reward.items ?? {})) kit.addItem(state, item, qty, events);
      if (reward.deco) kit.addItem(state, reward.deco, 1, events);
      events.push({ type: 'letterClaimed', id: letter.id });
      kit.bumpStat(state, 'letters');
    },
  },
  after: (state, action: { type: string }, ctx, events) => {
    for (const e of events) {
      if (e.type !== 'orderDone') continue;
      const def = friendByName(e.giver);
      if (def) befriend(state, def.id, ORDER_POINTS, ctx.now, events);
    }
    if (action.type === 'mamaVisit') befriend(state, 'mama_marigold', CHAT_POINTS, ctx.now, events);
  },
});

/** Every villager, for listing. */
export const VILLAGERS = FRIEND_LIST;
