import { describe, expect, it } from 'vitest';
import {
  DECORATIONS,
  FRIENDS,
  FRIEND_LIST,
  HEART_POINTS,
  ITEMS,
  LETTERS,
  LETTER_HEARTS,
  applyAction,
  createFarm,
  heartsOf,
  placeable,
  unreadMail,
  type FarmState,
} from '@farm/shared';

const T0 = Date.UTC(2026, 9, 12, 12);
const DAY = 24 * 3600_000;
const act = (s: FarmState, a: Parameters<typeof applyAction>[1], now = T0) => applyAction(s, a, { now });

describe('friendship content', () => {
  it('every loved item, letter present and keepsake exists', () => {
    for (const f of FRIEND_LIST) {
      for (const item of f.loves) expect(ITEMS[item], `${f.id} loves ${item}`).toBeTruthy();
      expect(LETTERS[f.id]).toHaveLength(LETTER_HEARTS.length);
      for (const l of LETTERS[f.id]) {
        for (const item of Object.keys(l.reward.items ?? {})) expect(ITEMS[item], item).toBeTruthy();
        if (l.reward.deco) {
          expect(DECORATIONS[l.reward.deco]?.reward).toBeTruthy();
          expect(placeable(l.reward.deco)?.starter).toBe(true);
        }
      }
    }
  });
});

describe('friendships', () => {
  it('chat once a day', () => {
    let s = createFarm('Pal', T0);
    const r = act(s, { type: 'chatVillager', who: 'rosie' });
    expect(r.events.some((e) => e.type === 'chat' && e.line.length > 0)).toBe(true);
    s = r.state;
    expect(s.friends!.points.rosie).toBeGreaterThan(0);
    expect(() => act(s, { type: 'chatVillager', who: 'rosie' })).toThrow(/already/);
    expect(() => act(s, { type: 'chatVillager', who: 'rosie' }, T0 + DAY)).not.toThrow();
  });

  it('loved gifts count most and are remembered', () => {
    const s = createFarm('Pal', T0);
    s.inventory = { carrot: 1, wheat: 1, egg: 1 };
    const loved = act(s, { type: 'giftVillager', who: 'rosie', item: 'carrot' }).state;
    const liked = act(s, { type: 'giftVillager', who: 'rosie', item: 'wheat' }).state;
    const meh = act(s, { type: 'giftVillager', who: 'rosie', item: 'egg' }).state;
    expect(loved.friends!.points.rosie).toBeGreaterThan(liked.friends!.points.rosie);
    expect(liked.friends!.points.rosie).toBeGreaterThan(meh.friends!.points.rosie);
    expect(loved.friends!.known.rosie).toEqual(['carrot']);
    expect(loved.inventory.carrot ?? 0).toBe(0);
    expect(() => act(loved, { type: 'giftVillager', who: 'rosie', item: 'wheat' })).toThrow(/already/);
  });

  it('birthdays triple the gift', () => {
    const [m, d] = FRIENDS.penny.birthday;
    const bday = Date.UTC(2027, m - 1, d, 12);
    const s = createFarm('Pal', bday);
    s.inventory = { pizza: 2 };
    const r = act(s, { type: 'giftVillager', who: 'penny', item: 'pizza' }, bday);
    expect(r.state.friends!.points.penny).toBe(240);
    expect(r.events.some((e) => e.type === 'gifted' && e.birthday)).toBe(true);
  });

  it('heart milestones mail a letter with a present, claimed once', () => {
    const s = createFarm('Pal', T0);
    s.friends = { points: { henrietta: 4 * HEART_POINTS - 10 }, giftDay: {}, chatDay: {}, known: {}, mail: [], nextMail: 1 };
    s.inventory = { corn: 1 };
    const r = act(s, { type: 'giftVillager', who: 'henrietta', item: 'corn' });
    expect(heartsOf(r.state, 'henrietta')).toBe(4);
    expect(r.events.some((e) => e.type === 'mail')).toBe(true);
    expect(unreadMail(r.state)).toBe(1);
    const letter = r.state.friends!.mail[0];
    expect(letter.tier).toBe(1);
    const c = act(r.state, { type: 'claimLetter', id: letter.id });
    expect(c.state.inventory.bread_cart).toBe(1);
    expect(unreadMail(c.state)).toBe(0);
    expect(() => act(c.state, { type: 'claimLetter', id: letter.id })).toThrow();
  });

  it('jumping several hearts at once sends every letter', () => {
    const s = createFarm('Pal', T0);
    s.friends = { points: { penny: 0 }, giftDay: {}, chatDay: {}, known: {}, mail: [], nextMail: 1 };
    s.friends.points.penny = 9 * HEART_POINTS + 50;
    s.inventory = { pizza: 1 };
    const r = act(s, { type: 'giftVillager', who: 'penny', item: 'pizza' });
    expect(heartsOf(r.state, 'penny')).toBe(10);
    expect(r.state.friends!.mail.map((l) => l.tier)).toEqual([4]);
  });

  it('filling an order makes friends with whoever asked', () => {
    const s = createFarm('Pal', T0);
    const order = s.orders[0];
    for (const [item, qty] of Object.entries(order.items)) s.inventory[item] = qty;
    const r = act(s, { type: 'fulfillOrder', order: order.id });
    const who = FRIEND_LIST.find((f) => f.name === order.giver)!;
    expect(r.state.friends!.points[who.id]).toBeGreaterThan(0);
  });

  it('shrugs off hostile input', () => {
    const s = createFarm('Pal', T0);
    s.inventory = { carrot: 1 };
    for (const bad of [
      { type: 'chatVillager', who: '__proto__' },
      { type: 'giftVillager', who: 'rosie', item: '__proto__' },
      { type: 'giftVillager', who: 'rosie', item: 'mailbox' },
      { type: 'giftVillager', who: 'constructor', item: 'carrot' },
      { type: 'claimLetter', id: 'x' },
    ])
      expect(() => act(s, bad as never)).toThrow();
  });
});
