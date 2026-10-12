// Villager friendships on the client: the Friends book (chat, gifts, hearts,
// favorite things, birthdays), the mailbox full of letters, and a little
// envelope that bobs over your mailbox when post arrives.

import Phaser from 'phaser';
import {
  DECORATIONS,
  FRIENDS,
  FRIEND_LIST,
  ITEMS,
  LETTERS,
  LETTER_HEARTS,
  MAX_HEARTS,
  canChat,
  canGift,
  giftTaste,
  heartProgress,
  heartsOf,
  isBirthday,
  unreadMail,
  type FriendDef,
  type Letter,
} from '@farm/shared';
import { artURL, hasArt, iconURL, texture } from '../art';
import { bus } from '../bus';
import { sfx } from '../sfx';
import { confetti, openModal, toast } from '../ui/dom';
import { portrait } from '../ui/villager';
import { fmtNum, h, nameOf } from '../util';
import type { FarmScene } from '../scenes/FarmScene';
import type { Store } from '../store';
import { addHudButton, type FeatureContext } from './registry';

let S: Store;
const day = { utcDay: (t: number) => new Date(t).toISOString().slice(0, 10) };
const icon = (key: string, fallback: string) => (hasArt(key) ? artURL(key) : iconURL(fallback));
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Something a villager just said, shown at the top of the Friends book. */
let lastSaid: { who: string; line: string; mood: string } | null = null;

export function init(ctx: FeatureContext): void {
  S = ctx.store;
  addHudButton({
    id: 'friends',
    em: '💌',
    label: 'Friends',
    where: 'corner',
    onClick: () => openFriends(unreadMail(S.state) ? 'mail' : 'villagers'),
    badge: () => (S.visit ? 0 : unreadMail(S.state)),
    pulse: () => !S.visit && unreadMail(S.state) > 0,
    hideWhileVisiting: true,
  });
  S.onEvents((events) => {
    for (const e of events) {
      if (e.type === 'chat') lastSaid = { who: e.who, line: e.line, mood: 'chat' };
      else if (e.type === 'gifted') {
        lastSaid = { who: e.who, line: e.line, mood: e.birthday ? 'love' : e.taste };
        if (e.taste === 'love' || e.birthday) {
          sfx.quest();
          confetti(40);
        } else sfx.pop();
      } else if (e.type === 'friendHeart') {
        toast(`💗 ${FRIENDS[e.who]?.name} now has ${e.hearts} heart${e.hearts === 1 ? '' : 's'} for you!`, 'good');
      } else if (e.type === 'mail') {
        setTimeout(() => {
          sfx.quest();
          toast(`💌 You've got mail from ${FRIENDS[e.from]?.name}! Check your mailbox.`, 'good');
        }, 900);
      } else if (e.type === 'letterClaimed') sfx.levelUp();
    }
  });
  bus.on('decoClick', (_id, def) => {
    if (def === 'mailbox' || def === 'love_mailbox' || def === 'monster_mailbox') openFriends('mail');
  });
  ctx.onScene((scene) => new MailFlag(scene));
}

// ---------------------------------------------------------------------------
// The Friends book

function openFriends(tab: 'villagers' | 'mail' = 'villagers'): void {
  let current = tab;
  let off = () => {};
  const tabs = h('div', { class: 'modal-tabs' });
  const m = openModal('Friends', { tabs, icon: icon('icon:friendship', 'love_letter'), onClose: () => off() });
  const render = () => {
    const unread = unreadMail(S.state);
    tabs.replaceChildren(
      ...(
        [
          ['villagers', 'Villagers'],
          ['mail', `Mailbox${unread ? ` (${unread})` : ''}`],
        ] as const
      ).map(([id, label]) =>
        h(
          'button',
          {
            class: `btn small tab${id === current ? ' active' : ''}`,
            onclick: () => {
              current = id;
              lastSaid = null;
              render();
            },
          },
          label,
        ),
      ),
    );
    m.body.replaceChildren(current === 'villagers' ? villagersView() : mailView());
  };
  render();
  off = S.onChange(render);
}

function heartRow(n: number, progress: number): HTMLElement {
  return h(
    'div',
    { class: 'fr-hearts', title: `${n} / ${MAX_HEARTS} hearts` },
    ...Array.from({ length: MAX_HEARTS }, (_, i) =>
      h('span', { class: i < n ? 'on' : i === n ? 'next' : '', style: i === n ? `--fill: ${Math.round(progress * 100)}%` : undefined }, '♥'),
    ),
  );
}

function villagersView(): HTMLElement {
  const st = S.state;
  const now = S.now();
  const wrap = h('div', { class: 'fr-wrap' });
  if (lastSaid && FRIENDS[lastSaid.who]) {
    const f = FRIENDS[lastSaid.who];
    wrap.append(
      h(
        'div',
        { class: `fr-say mood-${lastSaid.mood}` },
        portrait(f.name, 56),
        h('div', { class: 'fr-say-bubble' }, h('div', { class: 'fr-say-name' }, f.name), h('div', null, lastSaid.line)),
      ),
    );
  }
  const grid = h('div', { class: 'fr-grid' });
  for (const f of FRIEND_LIST) grid.append(villagerCard(f, st, now));
  wrap.append(grid, h('p', { class: 'muted small center' }, 'Chat and give one gift a day. Filling a villager\'s order makes them happy too. Letters arrive at 2, 4, 6, 8 and 10 hearts!'));
  return wrap;
}

function villagerCard(f: FriendDef, st: typeof S.state, now: number): HTMLElement {
  const hearts = heartsOf(st, f.id);
  const bday = isBirthday(f, now);
  const known = st.friends?.known[f.id] ?? [];
  const chat = canChat(st, f.id, now, day);
  const gift = canGift(st, f.id, now, day);
  const next = LETTER_HEARTS.find((x) => x > hearts);
  return h(
    'div',
    { class: `fr-card${bday ? ' birthday' : ''}${hearts >= MAX_HEARTS ? ' best' : ''}` },
    h(
      'div',
      { class: 'fr-top' },
      portrait(f.name, 60),
      h(
        'div',
        { class: 'grow' },
        h('div', { class: 'fr-name' }, f.name, hearts >= MAX_HEARTS ? h('span', { class: 'fr-tag' }, 'Best friends') : null),
        h('div', { class: 'fr-sub' }, bday ? h('b', { class: 'fr-bday' }, '🎂 Birthday today! Gifts count triple!') : `${cap(f.species)} · 🎂 ${MONTHS[f.birthday[0] - 1]} ${f.birthday[1]}`),
        heartRow(hearts, heartProgress(st, f.id)),
      ),
    ),
    h(
      'div',
      { class: 'fr-loves' },
      h('span', { class: 'fr-label' }, 'Loves'),
      ...f.loves.map((item) =>
        known.includes(item)
          ? h('img', { class: 'ico', src: iconURL(item), title: ITEMS[item]?.name ?? nameOf(item) })
          : h('span', { class: 'fr-unknown', title: 'Give gifts to find out!' }, '?'),
      ),
    ),
    h(
      'div',
      { class: 'fr-actions' },
      h('button', { class: 'btn small', disabled: !chat, onclick: () => S.dispatch({ type: 'chatVillager', who: f.id }) }, chat ? '💬 Chat' : '💬 Chatted'),
      h('button', { class: `btn small${gift ? ' green' : ''}`, disabled: !gift, onclick: () => openGiftPicker(f) }, gift ? '🎁 Give a gift' : '🎁 Gifted today'),
    ),
    next ? h('div', { class: 'fr-next' }, `💌 Letter at ${next} hearts`) : null,
  );
}

function openGiftPicker(f: FriendDef): void {
  const m = openModal(`A gift for ${f.name}`, { narrow: true });
  const known = new Set(S.state.friends?.known[f.id] ?? []);
  const items = Object.entries(S.state.inventory)
    .filter(([id, n]) => n > 0 && Object.hasOwn(ITEMS, id) && !DECORATIONS[id])
    .map(([id, n]) => ({ id, n, loved: known.has(id), liked: giftTaste(f, id, ITEMS[id].category) === 'like' }))
    .sort((a, b) => Number(b.loved) - Number(a.loved) || Number(b.liked) - Number(a.liked) || ITEMS[a.id].name.localeCompare(ITEMS[b.id].name));
  if (!items.length) {
    m.body.append(h('p', { class: 'center muted' }, 'Your barn is empty! Harvest, craft or cook something to give.'));
    return;
  }
  m.body.append(
    h('p', { class: 'muted small center' }, `${f.name} likes ${f.likes.map((c) => CAT_NAME[c] ?? c).join(' and ')}. Everyone has five favorite things!`),
    h(
      'div',
      { class: 'fr-gifts' },
      ...items.map((it) =>
        h(
          'button',
          {
            class: `fr-gift${it.loved ? ' loved' : it.liked ? ' liked' : ''}`,
            title: ITEMS[it.id].name,
            onclick: () => {
              if (S.dispatch({ type: 'giftVillager', who: f.id, item: it.id })) m.close();
            },
          },
          h('img', { src: iconURL(it.id) }),
          h('span', { class: 'n' }, fmtNum(it.n)),
          it.loved ? h('span', { class: 'heart' }, '❤') : it.liked ? h('span', { class: 'heart like' }, '♥') : null,
        ),
      ),
    ),
  );
}

const CAT_NAME: Record<string, string> = { crop: 'crops', fruit: 'fruit', animal: 'farm goods', good: 'crafted goods', dish: 'home cooking', fish: 'fish', bug: 'critters' };
const cap = (s: string) => s[0].toUpperCase() + s.slice(1);

// ---------------------------------------------------------------------------
// Mailbox

function mailView(): HTMLElement {
  const mail = [...(S.state.friends?.mail ?? [])].reverse();
  if (!mail.length)
    return h(
      'div',
      { class: 'fr-empty' },
      h('img', { src: icon('icon:letter', 'love_letter') }),
      h('div', null, 'No letters yet.'),
      h('div', { class: 'muted small' }, 'Make friends with the villagers and they will write to you!'),
    );
  return h(
    'div',
    { class: 'fr-mail' },
    ...mail.map((l) => {
      const f = FRIENDS[l.from];
      const fresh = !l.read || !l.claimed;
      return h(
        'button',
        { class: `fr-letter${fresh ? ' fresh' : ''}`, onclick: () => openLetter(l) },
        h('img', { class: 'env', src: icon(l.read ? 'icon:letter_open' : 'icon:letter', 'love_letter') }),
        portrait(f?.name ?? 'Mayor Maple', 40),
        h(
          'div',
          { class: 'grow' },
          h('div', { class: 'fr-name' }, `From ${f?.name ?? 'a friend'}`),
          h('div', { class: 'fr-sub' }, `${LETTER_HEARTS[l.tier]} hearts · ${new Date(l.at).toLocaleDateString()}`),
        ),
        !l.claimed ? h('span', { class: 'fr-tag gift' }, '🎁 Present') : !l.read ? h('span', { class: 'fr-tag' }, 'New') : null,
      );
    }),
  );
}

function openLetter(l: Letter): void {
  const f = FRIENDS[l.from];
  const letter = LETTERS[l.from]?.[l.tier];
  if (!f || !letter) return;
  if (!l.read) S.dispatch({ type: 'readLetter', id: l.id }, { quiet: true });
  const m = openModal('A letter', { narrow: true });
  const r = letter.reward;
  const gifts: HTMLElement[] = [];
  if (r.coins) gifts.push(h('div', { class: 'fr-present' }, h('img', { src: iconURL('coin') }), `${fmtNum(r.coins)} coins`));
  for (const [item, qty] of Object.entries(r.items ?? {})) gifts.push(h('div', { class: 'fr-present' }, h('img', { src: iconURL(item) }), `${qty} × ${ITEMS[item]?.name ?? nameOf(item)}`));
  if (r.deco) gifts.push(h('div', { class: 'fr-present deco' }, h('img', { src: iconURL(r.deco) }), DECORATIONS[r.deco]?.name ?? nameOf(r.deco)));
  const claimed = () => S.state.friends?.mail.find((x) => x.id === l.id)?.claimed;
  const btn = h(
    'button',
    {
      class: 'btn gold',
      disabled: !!claimed(),
      onclick: () => {
        if (S.dispatch({ type: 'claimLetter', id: l.id })) {
          btn.textContent = 'Thank you! 💕';
          (btn as HTMLButtonElement).disabled = true;
          confetti(50);
          if (r.deco) toast(`${DECORATIONS[r.deco]?.name} is in your barn. Place it from your Barn!`, 'good');
        }
      },
    },
    claimed() ? 'Present taken 💕' : 'Open the present 🎁',
  );
  m.body.append(
    h(
      'div',
      { class: 'fr-paper' },
      h('div', { class: 'fr-stamp' }, h('div', null, f.emoji)),
      h('div', { class: 'fr-text' }, letter.text),
      h('div', { class: 'fr-sign' }, portrait(f.name, 44)),
    ),
    h('div', { class: 'fr-presents' }, ...gifts),
    h('div', { class: 'fr-claim' }, btn),
  );
}

// ---------------------------------------------------------------------------
// An envelope bobbing over the mailbox when there is post.

class MailFlag {
  private flags: Phaser.GameObjects.Image[] = [];
  private sig = '';

  constructor(private scene: FarmScene) {
    scene.time.addEvent({ delay: 1000, loop: true, callback: () => this.sync() });
    S.onChange(() => this.sync());
    this.sync();
  }

  private sync(): void {
    const unread = !S.visit && unreadMail(S.state) > 0;
    const boxes = unread ? Object.values(S.state.objects).filter((o) => o.kind === 'deco' && /mailbox$/.test(o.def)) : [];
    const sig = boxes.map((b) => `${b.x},${b.y}`).join('|');
    if (sig === this.sig) return;
    this.sig = sig;
    for (const f of this.flags) f.destroy();
    this.flags = [];
    const key = hasArt('icon:letter') ? 'icon:letter' : 'icon:love_letter';
    for (const b of boxes) {
      const p = this.scene.tileToWorld(b.x + 0.5, b.y + 0.5);
      const img = this.scene.add
        .image(p.x, p.y - 58, texture(this.scene, key))
        .setScale(0.5)
        .setDepth(this.scene.depthAt(b.x, b.y) + 50)
        .setInteractive({ useHandCursor: true });
      img.on('pointerdown', (_p: Phaser.Input.Pointer, _x: number, _y: number, e: Phaser.Types.Input.EventData) => {
        e.stopPropagation();
        openFriends('mail');
      });
      this.scene.tweens.add({ targets: img, y: img.y - 6, angle: { from: -6, to: 6 }, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      this.flags.push(img);
    }
  }
}
