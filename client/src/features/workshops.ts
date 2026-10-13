// Workshop upgrades on the client: an "Upgrades" section at the bottom of
// every workshop's panel (what the next level gives and costs), a celebration
// when one is upgraded, and a sparkle when a level 3 workshop makes a bonus.

import {
  BUILDINGS,
  ITEMS,
  MAX_WORKSHOP_LEVEL,
  WORKSHOP_LEVELS,
  upgradeCost,
  workshopLevel,
  type BuildingObject,
  type GameEvent,
} from '@farm/shared';
import { iconURL } from '../art';
import { sfx } from '../sfx';
import { confetti, toast } from '../ui/dom';
import { fmtNum, h, nameOf } from '../util';
import type { FarmScene } from '../scenes/FarmScene';
import type { Store } from '../store';
import { addBuildingSection, type FeatureContext } from './registry';

let S: Store;
let scene: FarmScene | null = null;

const stars = (n: number) => h('span', { class: 'ws-stars' }, '★'.repeat(n), h('span', { class: 'ws-off' }, '★'.repeat(MAX_WORKSHOP_LEVEL - n)));

function perks(level: number): string {
  const lv = WORKSHOP_LEVELS[level - 1];
  const out = [`+${lv.slots} queue slot${lv.slots === 1 ? '' : 's'}`, `${Math.round((1 - lv.speed) * 100)}% faster`];
  if (lv.bonus) out.push(`${Math.round(lv.bonus * 100)}% chance of a bonus item`);
  return out.join(' · ');
}

export function init(ctx: FeatureContext): void {
  S = ctx.store;
  ctx.onScene((s) => (scene = s));
  addBuildingSection({ id: 'workshops', render: renderUpgrade });
  S.onEvents((events) => {
    for (const e of events) {
      if (e.type === 'workshopUpgraded') upgraded(e);
      else if (e.type === 'workshopBonus') bonus(e);
    }
  });
}

function renderUpgrade(body: HTMLElement, b: BuildingObject): void {
  const def = BUILDINGS[b.def];
  if (!def || def.starter || !def.recipes.length) return;
  const level = workshopLevel(b).level;
  const box = h('div', { class: 'ws-box' });
  body.append(h('div', { class: 'section-title' }, 'Upgrades ', stars(level)), box);
  if (level >= MAX_WORKSHOP_LEVEL) {
    box.append(h('div', { class: 'ws-text' }, h('b', null, 'Fully upgraded! '), perks(level)));
    return;
  }
  const next = level + 1;
  const cost = upgradeCost(def, next)!;
  const lockedBy = S.state.level < cost.playerLevel ? `Farm level ${cost.playerLevel}` : '';
  let ok = !lockedBy && S.state.coins >= cost.coins;
  const needs = h('div', { class: 'inputs ws-needs' });
  needs.append(h('span', { class: S.state.coins < cost.coins ? 'missing' : '' }, h('img', { class: 'ico', src: iconURL('coin') }), fmtNum(cost.coins)));
  for (const [item, qty] of Object.entries(cost.goods)) {
    const have = S.state.inventory[item] ?? 0;
    if (have < qty) ok = false;
    needs.append(h('span', { class: have < qty ? 'missing' : '', title: nameOf(item) }, h('img', { class: 'ico', src: iconURL(item) }), `${have}/${qty}`));
  }
  box.append(
    h(
      'div',
      { class: 'ws-text' },
      h('b', null, `Level ${next}: `),
      perks(next),
      level > 1 ? h('div', { class: 'ws-now' }, `Now: ${perks(level)}`) : '',
      needs,
    ),
    h(
      'button',
      { class: `btn${ok ? ' green' : ''}`, disabled: !ok, onclick: () => S.dispatch({ type: 'upgradeWorkshop', id: b.id }) },
      lockedBy ? `🔒 ${lockedBy}` : '⬆️ Upgrade',
    ),
  );
}

function upgraded(e: Extract<GameEvent, { type: 'workshopUpgraded' }>): void {
  sfx.levelUp();
  confetti(40);
  const obj = S.state.objects[e.id];
  if (obj && scene) {
    const p = scene.tileToWorld(obj.x + 1, obj.y + 1);
    scene.burst('fx:sparkle', 14, p.x, p.y - 40);
  }
  toast(`⬆️ Your ${BUILDINGS[e.def]?.name ?? 'workshop'} is now level ${e.level}: ${perks(e.level)}!`, 'good');
}

function bonus(e: Extract<GameEvent, { type: 'workshopBonus' }>): void {
  const obj = S.state.objects[e.id];
  if (obj && scene) {
    const p = scene.tileToWorld(obj.x + 1, obj.y + 1);
    scene.burst('fx:sparkle', 6, p.x, p.y - 30);
  }
  toast(`✨ Bonus! Your ${BUILDINGS[obj?.kind === 'building' ? obj.def : '']?.name ?? 'workshop'} made an extra ${ITEMS[e.item]?.name ?? nameOf(e.item)}.`, 'good');
}
