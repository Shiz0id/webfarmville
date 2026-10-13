// Grand Projects on the client: the planning board where you fund each
// landmark stage by stage, placing it after the first, and the celebrations as
// it goes up. Tapping a finished Balloon Dock unpacks the day's gift.

import { ITEMS, LANDMARKS, LANDMARK_LIST, balloonReady, canGrandDonate, grandStage, grandStillNeeded, utcDay } from '@farm/shared';
import { artURL, hasArt, iconURL } from '../art';
import { bus } from '../bus';
import { sfx } from '../sfx';
import { startPlacing } from '../ui/cards';
import { closeAllModals, confetti, openModal, toast } from '../ui/dom';
import { portrait } from '../ui/villager';
import { fmtNum, h, nameOf } from '../util';
import type { Store } from '../store';
import { addHudButton, type FeatureContext } from './registry';

let S: Store;
let picked = LANDMARK_LIST[0].id;

const art = (id: string, cls = 'gp-art') => h('img', { class: cls, src: artURL(`deco:${id}`), alt: '' });
const onFarm = (id: string) => Object.values(S.state.objects).some((o) => o.kind === 'deco' && o.def === id);
const inStorage = (id: string) => (S.state.inventory[id] ?? 0) > 0;
const have = (item: string) => (item === 'coins' ? S.state.coins : (S.state.inventory[item] ?? 0));

/** Landmarks begun but sitting in storage: worth a nudge. */
function waiting(): number {
  return LANDMARK_LIST.filter((l) => grandStage(S.state, l.id) > 0 && !onFarm(l.id) && inStorage(l.id)).length;
}

export function init(ctx: FeatureContext): void {
  S = ctx.store;
  addHudButton({
    id: 'grand',
    em: '🏰',
    label: 'Grand Projects',
    where: 'corner',
    onClick: () => openGrand(),
    badge: () => (S.visit ? 0 : waiting() + (balloonReady(S.state, utcDay(S.now())) ? 1 : 0)),
    hideWhileVisiting: true,
  });
  bus.on('decoClick', (id: string, def: string) => {
    if (!LANDMARKS[def]) return;
    if (def === 'balloon_dock' && balloonReady(S.state, utcDay(S.now()))) S.dispatch({ type: 'balloonGift', id });
    else openGrand(def);
  });
  S.onEvents((events) => {
    for (const e of events) {
      if (e.type === 'grandStage') setTimeout(() => celebrate(e.landmark, e.stage), 300);
      if (e.type === 'balloonGift') {
        sfx.quest();
        const goods = Object.entries(e.items)
          .map(([item, n]) => `${n} ${ITEMS[item]?.name ?? nameOf(item)}`)
          .join(', ');
        toast(`🎈 The balloon is back from the city with ${fmtNum(e.coins)} coins, ${goods}!`, 'good');
      }
    }
  });
}

export function openGrand(focus?: string): void {
  if (focus && LANDMARKS[focus]) picked = focus;
  let off = () => {};
  const m = openModal('Grand Projects', { icon: hasArt('icon:grand') ? artURL('icon:grand') : undefined, onClose: () => off() });
  const render = () => {
    const st = S.state;
    const picks = h(
      'div',
      { class: 'gp-picks' },
      ...LANDMARK_LIST.map((l) => {
        const stage = grandStage(st, l.id);
        const locked = st.level < l.level;
        return h(
          'button',
          { class: `gp-pick${l.id === picked ? ' on' : ''}${locked ? ' locked' : ''}`, onclick: () => ((picked = l.id), render()) },
          art(l.id, 'gp-pick-art'),
          h('span', { class: 'gp-pick-name' }, l.name),
          locked
            ? h('span', { class: 'gp-pick-sub' }, `🔒 Level ${l.level}`)
            : h('span', { class: 'gp-dots' }, ...l.stages.map((_, i) => h('i', { class: i < stage ? 'full' : '' }))),
        );
      }),
    );
    m.body.replaceChildren(picks, detail(picked));
  };
  render();
  off = S.onChange(render);
}

function detail(id: string): HTMLElement {
  const st = S.state;
  const l = LANDMARKS[id];
  const stage = grandStage(st, id);
  const n = l.stages.length;
  const locked = st.level < l.level;
  const parts: HTMLElement[] = [
    h(
      'div',
      { class: 'tw-project' },
      art(id),
      h(
        'div',
        { class: 'grow' },
        h('div', { class: 'tw-name' }, l.name),
        h('div', { class: 'tw-perk' }, `✨ ${l.perk}`),
        h('div', { class: 'tw-pitch' }, portrait(l.giver, 40), h('div', { class: 'fr-say-bubble' }, h('div', { class: 'fr-say-name' }, l.giver), l.pitch)),
      ),
    ),
    h(
      'div',
      { class: 'gp-steps' },
      ...l.stages.map((s, i) => h('div', { class: `gp-step${i < stage ? ' done' : i === stage ? ' now' : ''}` }, h('b', null, i < stage ? '✓' : String(i + 1)), h('span', null, s.name))),
    ),
  ];
  if (locked) parts.push(h('div', { class: 'tw-locked' }, `🔒 ${l.giver} will start planning this at level ${l.level}. Keep farming!`));
  else if (stage < n) {
    parts.push(
      h('div', { class: 'tw-sub-title' }, stage === 0 ? `Stage 1: ${l.stages[0].name}. Fund it to mark out the building site.` : `Stage ${stage + 1}: ${l.stages[stage].name}`),
      h(
        'div',
        { class: 'tw-needs' },
        ...Object.entries(l.stages[stage].needs).map(([item, total]) => {
          const left = grandStillNeeded(st, id, item);
          const given = total - left;
          const give = Math.min(left, have(item));
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
              : h('button', { class: `btn small${give ? ' green' : ''}`, disabled: !give, onclick: () => S.dispatch({ type: 'grandDonate', landmark: id, item, qty: give }) }, give ? `Give ${fmtNum(give)}` : 'Need more'),
          );
        }),
      ),
    );
  }
  // Where the landmark itself is.
  if (stage > 0) {
    if (onFarm(id)) {
      if (stage >= n) {
        const note = id === 'balloon_dock' ? (balloonReady(st, utcDay(S.now())) ? ' The balloon is back: tap it on your farm to unpack!' : ' The balloon flies again tomorrow.') : '';
        parts.push(h('div', { class: 'gp-live' }, `🎉 Finished and working its magic on your farm.${note}`));
      } else parts.push(h('div', { class: 'gp-note muted small' }, '🏗️ It goes up a little more on your farm with every stage.'));
    } else if (inStorage(id)) {
      parts.push(
        h(
          'div',
          { class: 'gp-store' },
          h('span', null, stage >= n ? '📦 It’s in storage, so its perk is resting. Put it back out!' : '📦 Waiting in storage for a spot on your farm.'),
          h('button', { class: 'btn small green', onclick: () => startPlacing(id, l.name, 'inventory', closeAllModals) }, 'Place it'),
        ),
      );
    }
  }
  if (!locked && stage < n && !canGrandDonate(st, id) && stage > 0) parts.push(h('div', { class: 'muted small center' }, 'Gather more of what it needs and come back.'));
  return h('div', { class: 'gp-detail' }, ...parts);
}

function celebrate(id: string, stage: number): void {
  const l = LANDMARKS[id];
  if (!l) return;
  const n = l.stages.length;
  if (stage > 1 && stage < n) {
    sfx.quest();
    toast(`🏗️ ${l.name}: ${l.stages[stage - 1].name} finished! Stage ${stage} of ${n}.`, 'good');
    return;
  }
  sfx.levelUp();
  confetti(stage === n ? 160 : 70);
  const m = openModal(stage === n ? 'Grand opening!' : 'Building site ready!', { narrow: true });
  const first = stage === 1;
  m.body.append(
    h(
      'div',
      { class: 'catch-card' },
      h('div', { class: 'catch-burst r4' }, art(id, 'gp-art big')),
      h('div', { class: 'catch-name' }, first ? `The ${l.name} has a building site!` : `The ${l.name} is finished!`),
      h('div', { class: 'catch-note' }, first ? `Pick a ${l.w}×${l.h} spot on your farm. It will rise right there as you fund each stage.` : `${l.giver} cuts the ribbon while the whole town cheers!`),
      first ? h('div', { class: 'tw-perk big' }, `When finished: ${l.perk}`) : h('div', { class: 'tw-perk big' }, `✨ ${l.perk}`),
      first && inStorage(id) && !onFarm(id)
        ? h('button', { class: 'btn green', onclick: () => (m.close(), startPlacing(id, l.name, 'inventory', closeAllModals)) }, 'Place it now')
        : h('button', { class: 'btn green', onclick: () => m.close() }, 'Hooray! 🎉'),
    ),
  );
}
