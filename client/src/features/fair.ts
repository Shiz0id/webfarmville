// The County Fair on the client: the weekend contest tent (pick an entry,
// then watch the judge reveal the standings), and the Prize Booth where
// tickets turn into fairground decorations.

import {
  CONTEST_LIST,
  CONTESTS,
  DECORATIONS,
  FAIR_PRIZES,
  ITEMS,
  PLACE_NAMES,
  PLACE_RIBBON,
  canEnter,
  contestsLeft,
  entryValue,
  fairEndsAt,
  fairEntries,
  fairOpen,
  fairTickets,
  featuredItem,
  nextFairAt,
  type ContestDef,
  type ContestEntry,
  type ContestId,
} from '@farm/shared';
import { artURL, hasArt, iconURL } from '../art';
import { sfx } from '../sfx';
import { confetti, openModal, toast } from '../ui/dom';
import { portrait } from '../ui/villager';
import { fmtNum, h, nameOf } from '../util';
import type { Store } from '../store';
import { addHudButton, type FeatureContext } from './registry';
import { helperBoothRows } from './helpers';

let S: Store;

const open = () => fairOpen(S.now(), S.allEvents);
const itemName = (id: string) => ITEMS[id]?.name ?? DECORATIONS[id]?.name ?? nameOf(id);
const ticketImg = () => (hasArt('icon:ticket') ? h('img', { class: 'fa-ticket', src: artURL('icon:ticket') }) : h('span', null, '🎟️'));
const ribbonImg = (place: number, cls = 'fa-ribbon') => h('img', { class: cls, src: artURL(`icon:ribbon_${PLACE_RIBBON[place]}`) });

const JUDGE_LINES = [
  "Oh my stars, it's the best in show! Blue ribbon!",
  'Splendid! Just a whisker off the top. Red ribbon!',
  'Very nice indeed! A white ribbon for you.',
  "Thank you for entering, dear! Here's a ribbon for taking part.",
];

function enterable(c: ContestId): string[] {
  return Object.entries(S.state.inventory)
    .filter(([id, n]) => n > 0 && canEnter(c, id))
    .map(([id]) => id);
}

export function init(ctx: FeatureContext): void {
  S = ctx.store;
  addHudButton({
    id: 'fair',
    em: '🎡',
    label: 'Fair',
    where: 'corner',
    onClick: () => openFair(),
    badge: () => (!S.visit && open() ? contestsLeft(S.state, S.now()).filter((c) => enterable(c).length).length : 0),
    pulse: () => !S.visit && open() && contestsLeft(S.state, S.now()).length > 0,
    hideWhileVisiting: true,
  });
  S.onEvents((events) => {
    for (const e of events) {
      if (e.type === 'contestResult') reveal(CONTESTS[e.contest], e.entry, e.tickets);
      if (e.type === 'grandChampion') setTimeout(() => champion(e.tickets, e.trophy), 4200);
      if (e.type === 'fairPrize') {
        sfx.coin();
        toast(`🎁 ${itemName(e.deco)} was sent to your barn. Place it from Store!`, 'good');
      }
    }
  });
}

function countdown(ms: number): string {
  const m = Math.max(1, Math.ceil(ms / 60000));
  const d = Math.floor(m / 1440);
  const hrs = Math.floor((m % 1440) / 60);
  return d ? `${d}d ${hrs}h` : hrs ? `${hrs}h ${m % 60}m` : `${m}m`;
}

function openFair(tab: 'contests' | 'booth' = 'contests'): void {
  const tabs = h('div', { class: 'modal-tabs' });
  let off = () => {};
  const m = openModal('Meadowbrook County Fair', { tabs, icon: hasArt('icon:fair') ? artURL('icon:fair') : undefined, onClose: () => off() });
  const render = () => {
    tabs.replaceChildren(
      ...(['contests', 'booth'] as const).map((k) =>
        h(
          'button',
          {
            class: `btn small tab${k === tab ? ' active' : ''}`,
            onclick: () => {
              tab = k;
              render();
            },
          },
          k === 'contests' ? '🏆 Contests' : '🎪 Prize Booth',
        ),
      ),
    );
    const now = S.now();
    const head = h(
      'div',
      { class: `fa-banner${open() ? ' open' : ''}` },
      h(
        'div',
        { class: 'grow' },
        h('div', { class: 'title' }, open() ? '🎪 The fair is open!' : '🎡 The fair is packed away for the week'),
        h(
          'div',
          { class: 'sub' },
          open()
            ? `Enter each contest once.${fairOpen(now) ? ` Judging closes in ${countdown(fairEndsAt(now) - now)}.` : ''}`
            : `The next fair opens Saturday, in ${countdown(nextFairAt(now) - now)}. Get your entries ready!`,
        ),
      ),
      h('div', { class: 'fa-tickets', title: 'Prize tickets' }, ticketImg(), h('b', null, fmtNum(fairTickets(S.state)))),
    );
    m.body.replaceChildren(head, tab === 'contests' ? contests() : booth());
  };
  const contests = () => {
    const entries = fairEntries(S.state, S.now());
    return h('div', { class: 'fa-contests' }, ...CONTEST_LIST.map((c) => contestCard(c, entries[c.id])));
  };
  const contestCard = (c: ContestDef, entry: ContestEntry | undefined) => {
    const feat = featuredItem(S.state, c.id, S.now());
    const top = h(
      'div',
      { class: 'fa-top' },
      h('div', { class: 'fa-emoji' }, c.emoji),
      h('div', { class: 'grow' }, h('div', { class: 'fa-name' }, c.name), h('div', { class: 'mk-sub' }, `Judge: ${c.judge} · enter ${c.enter}`)),
      feat ? h('div', { class: 'fa-feat', title: 'Featured this fair: ×1.5 points' }, h('img', { src: iconURL(feat) }), h('div', null, h('b', null, '✨ Featured'), h('div', null, itemName(feat)))) : null,
    );
    if (entry) {
      const rows = [{ who: 'You', item: entry.item, score: entry.score, me: true }, ...entry.rivals.map((r) => ({ ...r, me: false }))].sort((a, b) => b.score - a.score);
      return h(
        'div',
        { class: `fa-card done p${entry.place}` },
        top,
        h('div', { class: 'fa-result' }, ribbonImg(entry.place), h('div', null, h('div', { class: 'fa-place' }, PLACE_NAMES[entry.place]), h('div', { class: 'mk-sub' }, `with your ${itemName(entry.item)}${entry.featured ? ' ✨' : ''}`))),
        board(rows),
      );
    }
    const have = enterable(c.id);
    return h(
      'div',
      { class: 'fa-card' },
      top,
      h('div', { class: 'tw-pitch' }, portrait(c.judge, 36), h('div', { class: 'fr-say-bubble' }, h('div', { class: 'fr-say-name' }, c.judge), c.blurb)),
      h(
        'div',
        { class: 'fa-actions' },
        h(
          'button',
          { class: `btn${open() && have.length ? ' green' : ''}`, disabled: !open() || !have.length, onclick: () => pick(c) },
          !open() ? 'Opens Saturday' : have.length ? 'Choose an entry' : `No ${c.enter} in your barn`,
        ),
      ),
    );
  };
  const booth = () =>
    h(
      'div',
      { class: 'fa-booth' },
      ...FAIR_PRIZES.map((p) => {
        const d = DECORATIONS[p.deco];
        const owned = (S.state.inventory[p.deco] ?? 0) + Object.values(S.state.objects).filter((o) => o.kind === 'deco' && o.def === p.deco).length;
        const can = fairTickets(S.state) >= p.tickets;
        return h(
          'div',
          { class: 'fa-prize' },
          h('img', { src: artURL(`deco:${p.deco}`) }),
          h('div', { class: 'fa-name' }, d?.name ?? p.deco),
          h('div', { class: 'mk-sub' }, `💗 +${d?.charm ?? 0} charm${owned ? ` · you have ${owned}` : ''}`),
          h('button', { class: `btn small${can ? ' green' : ''}`, disabled: !can, onclick: () => S.dispatch({ type: 'buyFairPrize', deco: p.deco }) }, ticketImg(), ` ${p.tickets}`),
        );
      }),
      // Helpers (helpers.ts) are on offer too.
      ...helperBoothRows(ticketImg),
      h('div', { class: 'muted small center fa-note' }, '🏆 Win all four contests at one fair to earn the Grand Champion Trophy and 50 bonus tickets!'),
    );
  render();
  off = S.onChange(render);
}

function board(rows: { who: string; item: string; score: number; me: boolean }[], hidden = 0): HTMLElement {
  return h(
    'div',
    { class: 'fa-board' },
    ...rows.map((r, i) =>
      h(
        'div',
        { class: `fa-row${r.me ? ' me' : ''}${i >= rows.length - hidden ? ' hidden' : ''}` },
        h('span', { class: 'fa-rank' }, `${i + 1}`),
        r.me ? h('span', { class: 'fa-you' }, '🧑‍🌾') : portrait(r.who, 26),
        h('span', { class: 'grow' }, h('b', null, r.who), ` · ${itemName(r.item)}`),
        h('img', { class: 'fa-row-ico', src: iconURL(r.item) }),
        h('b', { class: 'fa-score' }, fmtNum(r.score)),
      ),
    ),
  );
}

function pick(c: ContestDef): void {
  const feat = featuredItem(S.state, c.id, S.now());
  const m = openModal(`Enter the ${c.name}`, { narrow: true });
  const items = enterable(c.id).sort((a, b) => entryValue(b) * (b === feat ? 1.5 : 1) - entryValue(a) * (a === feat ? 1.5 : 1));
  m.body.append(
    h('div', { class: 'muted small center' }, `Pick one ${c.enter}. Points are its value${feat ? ` (×1.5 for the featured ${itemName(feat)})` : ''}, then the judge's taste.`),
    h(
      'div',
      { class: 'fa-pick' },
      ...items.map((id) =>
        h(
          'button',
          {
            class: `fa-pick-item${id === feat ? ' feat' : ''}`,
            onclick: () => {
              m.close();
              S.dispatch({ type: 'enterContest', contest: c.id, item: id });
            },
          },
          h('img', { src: iconURL(id) }),
          h('div', { class: 'fa-name' }, itemName(id)),
          h('div', { class: 'mk-sub' }, `~${fmtNum(Math.round(entryValue(id) * (id === feat ? 1.5 : 1)))} pts · have ${S.state.inventory[id]}`),
          id === feat ? h('div', { class: 'fa-feat-tag' }, '✨ Featured') : null,
        ),
      ),
    ),
  );
}

/** The judge tastes, sniffs and squints; then the standings appear one by one. */
function reveal(c: ContestDef | undefined, entry: ContestEntry, tickets: number): void {
  if (!c) return;
  const rows = [{ who: 'You', item: entry.item, score: entry.score, me: true }, ...entry.rivals.map((r) => ({ ...r, me: false }))].sort((a, b) => a.score - b.score);
  const m = openModal(c.name, { narrow: true });
  const say = h('div', { class: 'fr-say-bubble' }, h('div', { class: 'fr-say-name' }, c.judge), 'Hmm, let me have a good look at everything...');
  const list = h('div', { class: 'fa-board reveal' });
  const prize = h('div', { class: 'fa-prize-reveal' });
  m.body.append(h('div', { class: 'tw-pitch' }, portrait(c.judge, 48), say), list, prize);
  sfx.swoosh();
  rows.forEach((r, i) => {
    setTimeout(() => {
      const place = rows.length - 1 - i;
      list.prepend(
        h(
          'div',
          { class: `fa-row pop${r.me ? ' me' : ''}` },
          h('span', { class: 'fa-rank' }, `${place + 1}`),
          r.me ? h('span', { class: 'fa-you' }, '🧑‍🌾') : portrait(r.who, 26),
          h('span', { class: 'grow' }, h('b', null, r.who), ` · ${itemName(r.item)}`),
          h('img', { class: 'fa-row-ico', src: iconURL(r.item) }),
          h('b', { class: 'fa-score' }, fmtNum(r.score)),
        ),
      );
      if (r.me) sfx.pop();
      else sfx.click();
    }, 700 + i * 650);
  });
  setTimeout(
    () => {
      say.lastChild!.textContent = JUDGE_LINES[entry.place];
      if (entry.place === 0) {
        sfx.levelUp();
        confetti(90);
      } else sfx.quest();
      prize.append(
        ribbonImg(entry.place, 'fa-ribbon big'),
        h('div', { class: 'fa-place' }, PLACE_NAMES[entry.place]),
        h('div', { class: 'fa-won' }, '+', ticketImg(), ` ${tickets} prize tickets`),
        h('button', { class: 'btn green', onclick: () => m.close() }, entry.place === 0 ? 'Woohoo! 🎉' : 'Yay! 🎀'),
      );
    },
    700 + rows.length * 650 + 300,
  );
}

function champion(tickets: number, trophy: boolean): void {
  sfx.levelUp();
  confetti(160);
  const m = openModal('Grand Champion!', { narrow: true });
  m.body.append(
    h(
      'div',
      { class: 'catch-card' },
      h('div', { class: 'catch-burst r5' }, h('img', { src: artURL('deco:golden_trophy') })),
      h('div', { class: 'catch-name' }, 'Blue ribbons in every contest!'),
      h('div', { class: 'catch-note' }, `The whole county is talking about your farm. +${tickets} bonus prize tickets${trophy ? ', and the Grand Champion Trophy is in your barn!' : '!'}`),
      h('button', { class: 'btn green', onclick: () => m.close() }, 'Hip hip hooray! 🏆'),
    ),
  );
}

export { openFair };
