// Town projects on the client: the notice board where you chip in toward
// Meadowbrook's next improvement, and a celebration when one is finished.

import { ITEMS, PROJECTS, PROJECT_LIST, activeProject, canDonate, stillNeeded, townDone } from '@farm/shared';
import { artURL, hasArt, iconURL } from '../art';
import { sfx } from '../sfx';
import { confetti, openModal } from '../ui/dom';
import { portrait } from '../ui/villager';
import { fmtNum, h, nameOf } from '../util';
import type { Store } from '../store';
import { addHudButton, type FeatureContext } from './registry';

let S: Store;
const art = (key: string) => (hasArt(key) ? h('img', { class: 'tw-art', src: artURL(key) }) : h('div', { class: 'tw-art emoji' }, '🏛️'));

export function init(ctx: FeatureContext): void {
  S = ctx.store;
  addHudButton({
    id: 'town',
    em: '🏛️',
    label: 'Town',
    where: 'corner',
    onClick: openTown,
    badge: () => (!S.visit && canDonate(S.state) ? 1 : 0),
    hideWhileVisiting: true,
  });
  S.onEvents((events) => {
    for (const e of events) {
      if (e.type === 'donated') sfx.coin();
      if (e.type === 'projectDone') setTimeout(() => celebrate(e.project), 300);
    }
  });
}

function have(item: string): number {
  return item === 'coins' ? S.state.coins : (S.state.inventory[item] ?? 0);
}

function openTown(): void {
  let off = () => {};
  const m = openModal('Town Projects', { icon: hasArt('icon:town') ? artURL('icon:town') : undefined, onClose: () => off() });
  const render = () => {
    const st = S.state;
    const p = activeProject(st);
    const parts: HTMLElement[] = [];
    if (!p) {
      parts.push(h('div', { class: 'tw-done-all' }, h('div', { class: 'title' }, '🎉 Every project is finished!'), h('div', { class: 'muted' }, 'Meadowbrook has never looked lovelier, thanks to you.')));
    } else {
      const locked = st.level < p.level;
      const needs = Object.entries(p.needs).map(([item, total]) => {
        const given = total - stillNeeded(st, item);
        const left = total - given;
        const n = Math.min(left, have(item));
        return h(
          'div',
          { class: `tw-need${left === 0 ? ' full' : ''}` },
          h('img', { src: iconURL(item === 'coins' ? 'coin' : item) }),
          h(
            'div',
            { class: 'grow' },
            h('div', { class: 'tw-need-name' }, item === 'coins' ? 'Coins' : (ITEMS[item]?.name ?? nameOf(item))),
            h('div', { class: 'mk-bar' }, h('div', { style: { width: `${Math.round((given / total) * 100)}%` } })),
            h('div', { class: 'mk-sub' }, `${fmtNum(given)} / ${fmtNum(total)}${left ? ` · you have ${fmtNum(have(item))}` : ''}`),
          ),
          left === 0
            ? h('span', { class: 'tw-check' }, '✓')
            : h(
                'button',
                { class: `btn small${n ? ' green' : ''}`, disabled: locked || !n, onclick: () => S.dispatch({ type: 'donate', project: p.id, item, qty: n }) },
                n ? `Give ${fmtNum(n)}` : 'Need more',
              ),
        );
      });
      parts.push(
        h(
          'div',
          { class: 'tw-project' },
          art(`town:${p.id}`),
          h(
            'div',
            { class: 'grow' },
            h('div', { class: 'tw-name' }, p.name),
            h('div', { class: 'tw-perk' }, `✨ Perk: ${p.perk}`),
            h('div', { class: 'tw-pitch' }, portrait(p.giver, 40), h('div', { class: 'fr-say-bubble' }, h('div', { class: 'fr-say-name' }, p.giver), p.pitch)),
          ),
        ),
        locked ? h('div', { class: 'tw-locked' }, `🔒 This project starts at level ${p.level}. Keep farming!`) : h('div', { class: 'tw-needs' }, ...needs),
      );
    }
    const done = PROJECT_LIST.filter((x) => townDone(st, x.id));
    if (done.length)
      parts.push(
        h('div', { class: 'tw-sub-title' }, 'Finished projects'),
        h(
          'div',
          { class: 'tw-done' },
          ...done.map((x) => h('div', { class: 'tw-done-card', title: x.perk }, art(`town:${x.id}`), h('div', { class: 'tw-need-name' }, x.name), h('div', { class: 'mk-sub' }, x.perk))),
        ),
      );
    const upcoming = PROJECT_LIST.filter((x) => !townDone(st, x.id) && x !== p);
    if (upcoming.length) parts.push(h('div', { class: 'muted small center' }, `Coming up: ${upcoming.map((x) => x.name).join(' · ')}`));
    m.body.replaceChildren(...parts);
  };
  render();
  off = S.onChange(render);
}

function celebrate(id: string): void {
  const p = PROJECTS[id];
  if (!p) return;
  sfx.levelUp();
  confetti(120);
  const m = openModal('Project complete!', { narrow: true });
  m.body.append(
    h(
      'div',
      { class: 'catch-card' },
      h('div', { class: 'catch-burst r4' }, art(`town:${id}`)),
      h('div', { class: 'catch-name' }, `${p.name} is finished!`),
      h('div', { class: 'catch-note' }, `Thanks to you, ${p.giver} and the whole town are celebrating!`),
      h('div', { class: 'tw-perk big' }, `✨ ${p.perk}`),
      h('button', { class: 'btn green', onclick: () => m.close() }, 'Hooray! 🎉'),
    ),
  );
}
