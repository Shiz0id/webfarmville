// Shop cards and the bits every shop shares: level and season locks, and
// starting to place something you bought or took out of storage.
import type { EventDef } from '@farm/shared';
import { iconURL } from '../art';
import type { Store } from '../store';
import { setTool } from '../tools';
import { fmtNum, h } from '../util';
import { toast } from './dom';

let S: Store;

export function initCards(store: Store): void {
  S = store;
}

const coin = () => h('img', { class: 'ico', src: iconURL('coin'), alt: 'coins' });
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export interface CardOpts {
  img: string;
  /** Extra classes for the card. */
  cls?: string;
  name: string;
  price?: number;
  tokens?: number;
  tokenIcon?: string;
  meta?: (string | Node)[];
  locked?: string | false;
  charm?: number;
  owned?: number;
  onClick?: () => void;
}

export function card(o: CardOpts): HTMLElement {
  const el = h(
    'div',
    { class: `card${o.locked ? ' locked' : ''}${o.cls ? ` ${o.cls}` : ''}`, title: o.locked || o.name },
    o.locked ? h('span', { class: 'tag' }, o.locked) : null,
    o.charm ? h('span', { class: 'tag charm' }, `💗${o.charm}`) : null,
    o.owned ? h('span', { class: 'owned' }, `×${o.owned}`) : null,
    h('div', { class: 'art' }, h('img', { src: o.img, alt: o.name, loading: 'lazy' })),
    h('div', { class: 'name' }, o.name),
    o.tokens
      ? h('div', { class: 'price candy' }, h('img', { class: 'ico', src: iconURL(o.tokenIcon ?? 'candy') }), fmtNum(o.tokens))
      : o.price !== undefined
        ? h('div', { class: 'price' }, coin(), o.price === 0 ? 'Free' : fmtNum(o.price))
        : null,
    ...(o.meta ?? []).map((m) => h('div', { class: 'meta' }, m)),
  );
  el.addEventListener('click', () => {
    if (o.locked) toast(o.locked.startsWith('Lv') ? `Unlocks at level ${o.locked.slice(3)}` : o.locked, 'error');
    else o.onClick?.();
  });
  return el;
}

export function levelLock(level: number): string | false {
  return S.state.level < level ? `Lv ${level}` : false;
}

export function eventReturn(ev: EventDef): string {
  return `Back ${MONTHS[ev.start[0] - 1]} ${ev.start[1]}`;
}

export function tabsBar<T extends string>(tabs: { id: T; label: string }[], active: T, onPick: (t: T) => void): HTMLElement {
  const bar = h('div', { class: 'modal-tabs' });
  const render = (cur: T) => {
    bar.replaceChildren(
      ...tabs.map((t) =>
        h(
          'button',
          {
            class: `btn small tab${t.id === cur ? ' active' : ''}`,
            onclick: () => {
              render(t.id);
              onPick(t.id);
            },
          },
          t.label,
        ),
      ),
    );
  };
  render(active);
  return bar;
}

export function startPlacing(def: string, name: string, source: 'shop' | 'inventory', close: () => void, baby = false): void {
  setTool('place', { place: { def, source, ...(baby ? { baby } : {}) } });
  close();
  toast(`Place your ${name}. Press R to flip, Esc or right-click to stop.`, 'info');
}
