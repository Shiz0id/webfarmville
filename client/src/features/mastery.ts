// Crop mastery on the client: the Mastery tab in the Collections panel, and a
// celebration card whenever a crop earns a star.

import {
  CROP_LIST,
  CROPS,
  DECORATIONS,
  EVENTS,
  MASTERY_PERKS,
  MAX_MASTERY,
  masteryCount,
  masteryGoals,
  masteryStars,
  totalMasteryStars,
  type CropDef,
  type GameEvent,
} from '@farm/shared';
import { artURL, hasArt, iconURL } from '../art';
import { eventLive } from '../events';
import { sfx } from '../sfx';
import { confetti, openModal } from '../ui/dom';
import { fmtNum, h } from '../util';
import type { Store } from '../store';
import { addCatalogTab, type FeatureContext } from './registry';

let S: Store;

type StarEvent = Extract<GameEvent, { type: 'masteryStar' }>;

export const masteryIcon = (cls = 'ms-icon'): HTMLElement =>
  hasArt('icon:mastery') ? h('img', { class: cls, src: artURL('icon:mastery') }) : h('span', { class: `${cls} ms-emoji` }, '🏅');

/** ★★☆ with the unearned stars greyed out. */
export function starRow(stars: number, cls = 'ms-stars'): HTMLElement {
  return h('span', { class: cls }, '★'.repeat(stars), h('span', { class: 'ms-off' }, '★'.repeat(MAX_MASTERY - stars)));
}

export function init(ctx: FeatureContext): void {
  S = ctx.store;
  addCatalogTab({ id: 'mastery', label: '🏅 Crop Mastery', render: renderMastery });
  S.onEvents((events) => {
    const stars = events.filter((e): e is StarEvent => e.type === 'masteryStar');
    if (stars.length) setTimeout(() => celebrate(stars), 350);
  });
}

function shown(c: CropDef): boolean {
  return !c.event || eventLive(c.event, S.now(), S.allEvents) || masteryCount(S.state, c.id) > 0;
}

function renderMastery(body: HTMLElement): void {
  const st = S.state;
  const crops = CROP_LIST.filter(shown);
  const total = totalMasteryStars(st);
  const max = CROP_LIST.filter((c) => !c.event).length * MAX_MASTERY;
  body.append(
    h(
      'div',
      { class: 'row ms-head' },
      masteryIcon('ms-head-icon'),
      h(
        'div',
        { class: 'grow' },
        h('div', { class: 'title' }, `${fmtNum(total)} mastery stars earned`),
        h('div', { class: 'sub' }, 'Harvest a crop again and again to master it. Every star pays a reward and a perk for that crop.'),
        h('div', { class: 'progress' }, h('div', { style: { width: `${Math.min(100, (total / max) * 100)}%` } })),
      ),
    ),
    h(
      'div',
      { class: 'ms-perks' },
      ...MASTERY_PERKS.map((p, i) => h('div', { class: 'ms-perk' }, starRow(i + 1, 'ms-stars small'), h('b', null, p.title), h('span', null, p.text))),
    ),
  );
  const grid = h('div', { class: 'grid ms-grid' });
  for (const c of crops) {
    const stars = masteryStars(st, c.id);
    const goals = masteryGoals(c);
    const count = masteryCount(st, c.id);
    const done = stars >= MAX_MASTERY;
    const need = goals[Math.min(stars, MAX_MASTERY - 1)];
    const prev = stars ? goals[stars - 1] : 0;
    const pct = done ? 100 : Math.max(0, Math.min(100, ((count - prev) / (need - prev)) * 100));
    const locked = st.level < c.level;
    grid.append(
      h(
        'div',
        { class: `card ms-card${done ? ' done' : ''}${locked ? ' locked' : ''}`, title: done ? `${c.name}: mastered!` : `${count} / ${need} harvests for star ${stars + 1}` },
        c.event ? h('span', { class: 'tag' }, EVENTS[c.event]?.name ?? 'Event') : locked ? h('span', { class: 'tag' }, `Lv ${c.level}`) : null,
        h('div', { class: 'art' }, h('img', { src: iconURL(c.id), alt: c.name, loading: 'lazy' })),
        h('div', { class: 'name' }, c.name),
        starRow(stars),
        h('div', { class: 'progress ms-bar' }, h('div', { style: { width: `${pct}%` } })),
        h('div', { class: 'meta' }, done ? '🪧 Mastered!' : `${fmtNum(Math.min(count, need))} / ${fmtNum(need)} harvests`),
      ),
    );
  }
  body.append(grid);
}

/** One card per crop (the highest new star), with what it unlocked. */
function celebrate(events: StarEvent[]): void {
  const best = new Map<string, StarEvent>();
  for (const e of events) if ((best.get(e.crop)?.star ?? 0) < e.star) best.set(e.crop, e);
  for (const e of best.values()) {
    const crop = CROPS[e.crop];
    if (!crop) continue;
    const gained = events.filter((x) => x.crop === e.crop);
    const coins = gained.reduce((n, x) => n + x.coins, 0);
    const xp = gained.reduce((n, x) => n + x.xp, 0);
    sfx.levelUp();
    confetti(e.star === MAX_MASTERY ? 140 : 70);
    const m = openModal(e.star === MAX_MASTERY ? 'Crop Mastered!' : 'Mastery Star!', { narrow: true });
    const sign = e.sign ? DECORATIONS[e.sign] : undefined;
    m.body.append(
      h(
        'div',
        { class: 'catch-card' },
        h('div', { class: `catch-burst${e.star === MAX_MASTERY ? ' r5' : ' r3'}` }, h('img', { class: 'catch-img', src: iconURL(crop.id) })),
        h('div', { class: 'catch-name' }, crop.name, starRow(e.star, 'ms-stars big')),
        h(
          'div',
          { class: 'ms-unlocked' },
          ...gained.map((x) => {
            const p = MASTERY_PERKS[x.star - 1];
            return h('div', { class: 'ms-perk' }, starRow(x.star, 'ms-stars small'), h('b', null, p.title), h('span', null, p.text));
          }),
        ),
        sign
          ? h('div', { class: 'ms-sign' }, hasArt(`deco:${sign.id}`) ? h('img', { src: artURL(`deco:${sign.id}`) }) : h('span', { class: 'ms-sign-em' }, '🪧'), h('span', null, `Your ${sign.name} is in your barn. Place it from Store!`))
          : h('div', { class: 'catch-note' }, `Keep harvesting ${crop.name.toLowerCase()} for the next star!`),
        h('div', { class: 'catch-meta' }, `+${fmtNum(coins)} coins · +${fmtNum(xp)} XP`),
        h('button', { class: 'btn green', onclick: () => m.close() }, e.star === MAX_MASTERY ? 'I am a master grower! 🌟' : 'Hooray! ⭐'),
      ),
    );
  }
}
