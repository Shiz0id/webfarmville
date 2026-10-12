// Helpers on the client: a "Helpers" section in the Garage (how many of each
// you have and a Use button that lights up when there's work for it), a
// cheerful toast when one turns up, and Prize Booth rows for the County Fair.

import { HELPERS, HELPER_LIST, fairTickets, helperCount, helperTargets, type GameEvent, type HelperDef } from '@farm/shared';
import { iconURL } from '../art';
import { sfx } from '../sfx';
import { confetti, toast } from '../ui/dom';
import { h } from '../util';
import type { Store } from '../store';
import type { FeatureContext } from './registry';
import { addGarageSection } from './vehicles';

let S: Store;

const ready = (def: HelperDef) => helperCount(S.state, def.id) > 0 && helperTargets(S.state, def.id, S.now()).length > 0;

export function init(ctx: FeatureContext): void {
  S = ctx.store;
  addGarageSection({
    id: 'helpers',
    badge: () => (S.visit ? 0 : HELPER_LIST.filter(ready).length),
    render: (body, rerender) => {
      const now = S.now();
      body.append(
        h('div', { class: 'section-title' }, 'Helpers'),
        h(
          'div',
          { class: 'hp-list' },
          ...HELPER_LIST.map((def) => {
            const have = helperCount(S.state, def.id);
            const work = helperTargets(S.state, def.id, now).length;
            const what = def.job === 'animals' ? 'animal' : def.job === 'trees' ? 'tree' : 'withered crop';
            return h(
              'div',
              { class: `hp-row${have ? '' : ' none'}` },
              h('img', { class: 'hp-img', src: iconURL(def.id), alt: '' }),
              h(
                'div',
                { class: 'hp-info' },
                h('div', { class: 'hp-name' }, def.name, h('span', { class: 'hp-count' }, `×${have}`)),
                h('div', { class: 'hp-sub' }, def.blurb, work ? h('b', null, ` ${work} ${what}${work === 1 ? '' : 's'} waiting.`) : ''),
              ),
              h(
                'button',
                {
                  class: `btn small${have && work ? ' green' : ''}`,
                  disabled: !have || !work,
                  onclick: () => {
                    S.dispatch({ type: 'useHelper', helper: def.id });
                    rerender();
                  },
                },
                'Use',
              ),
            );
          }),
        ),
        h('div', { class: 'gr-note' }, '🎁 Helpers come from quests, mystery gifts, completed collections and the County Fair Prize Booth.'),
      );
    },
  });
  S.onEvents((events) => {
    for (const e of events) {
      if (e.type === 'helperUsed') used(e);
      else if (e.type === 'helperFound') found(e);
    }
  });
}

function used(e: Extract<GameEvent, { type: 'helperUsed' }>): void {
  const def = HELPERS[e.helper];
  sfx.quest();
  confetti(24);
  const done =
    def?.job === 'animals'
      ? `collected from ${e.count} animal${e.count === 1 ? '' : 's'}`
      : def?.job === 'trees'
        ? `picked ${e.count} tree${e.count === 1 ? '' : 's'}`
        : `brought ${e.count} crop${e.count === 1 ? '' : 's'} back to life`;
  toast(`${def?.em ?? '✨'} Your ${def?.name ?? 'helper'} ${done}!`, 'good');
}

function found(e: Extract<GameEvent, { type: 'helperFound' }>): void {
  const def = HELPERS[e.helper];
  if (!def) return;
  sfx.pop();
  const where = e.from === 'gift' ? 'was tucked inside the gift' : e.from === 'collection' ? 'came along with your collection' : 'joined your farm';
  toast(`${def.em} A ${def.name} ${where}! Find it in the Garage.`, 'good');
}

/** Prize Booth rows for the County Fair (fair.ts). */
export function helperBoothRows(ticketImg: () => HTMLElement): HTMLElement[] {
  return HELPER_LIST.map((def) => {
    const can = fairTickets(S.state) >= def.tickets;
    const have = helperCount(S.state, def.id);
    return h(
      'div',
      { class: 'fa-prize' },
      h('img', { src: iconURL(def.id) }),
      h('div', { class: 'fa-name' }, def.name),
      h('div', { class: 'mk-sub' }, `${def.blurb}${have ? ` You have ${have}.` : ''}`),
      h(
        'button',
        { class: `btn small${can ? ' green' : ''}`, disabled: !can, onclick: () => S.dispatch({ type: 'buyHelperPrize', helper: def.id }) },
        ticketImg(),
        ` ${def.tickets}`,
      ),
    );
  });
}
