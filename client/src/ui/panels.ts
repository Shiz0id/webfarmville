import {
  ANIMAL_LIST,
  BABY_ANIMALS,
  BABY_NAMES,
  babyGrowMs,
  babyPrice,
  craftMs,
  workshopSlots,
  BUILDINGS,
  BUILDING_LIST,
  CHARM_TIERS,
  CROP_LIST,
  DECORATIONS,
  DECORATION_LIST,
  DECO_CATEGORIES,
  EVENTS,
  GIFT_LIST,
  ITEMS,
  ITEM_LIST,
  QUESTS,
  villagerFor,
  RIBBON_COLORS,
  RIBBON_LIST,
  TREE_LIST,
  buildingStatus,
  charmStars,
  dailyBonus,
  farmCharm,
  isQuestComplete,
  masteryProgress,
  masteryStars,
  seedCost,
  nextExpansion,
  questProgress,
  utcDay,
  type BuildingObject,
  type DecoCategory,
  type ItemCategory,
  GIFT_LEVEL_FROM,
  MYSTERY_GIFT,
  levelUpReward,
} from '@farm/shared';
import { artURL, iconURL } from '../art';
import type { Store } from '../store';
import { setTool } from '../tools';
import { fmtDuration, fmtNum, h, nameOf, timeAgo } from '../util';
import { confetti, openModal, toast } from './dom';
import { forFingers, isTouch } from './layout';
import { downloadBackup, pickBackup } from './backup';
import { shareInvite } from '../share';
import { LOCAL } from '../api';
import { portrait } from './villager';
import { eventLive as liveEvent } from '../events';
import { bus } from '../bus';
import { BUILDING_SECTIONS, CATALOG_TABS } from '../features/registry';
import { openDecor, storedCount } from './decor';
import { card, levelLock, startPlacing, tabsBar } from './cards';

let S: Store;
let recenter: () => void = () => {};

export function initPanels(store: Store, onVisitChange: () => void): void {
  S = store;
  recenter = onVisitChange;
}

const coin = () => h('img', { class: 'ico', src: iconURL('coin'), alt: 'coins' });


/** A modal whose body re-renders when the store changes (and optionally on a timer). */
function liveModal(
  title: string,
  render: (body: HTMLElement) => void,
  opts: { narrow?: boolean; tick?: boolean; tabs?: HTMLElement; icon?: string; top?: HTMLElement } = {},
) {
  const content = h('div');
  let off = () => {};
  let timer = 0;
  const m = openModal(title, {
    narrow: opts.narrow,
    tabs: opts.tabs,
    icon: opts.icon,
    onClose: () => {
      off();
      clearInterval(timer);
    },
  });
  if (opts.top) m.body.append(opts.top);
  m.body.append(content);
  const rerender = () => {
    const scroll = m.body.scrollTop;
    content.replaceChildren();
    render(content);
    m.body.scrollTop = scroll;
  };
  off = S.onChange(rerender);
  if (opts.tick) timer = window.setInterval(rerender, 1000);
  rerender();
  return { ...m, rerender };
}

function eventLive(ev: string): boolean {
  return liveEvent(ev, S.now(), S.allEvents);
}

// ---------------------------------------------------------------------------
// Shop

type ShopTab = 'seeds' | 'trees' | 'animals' | 'buildings' | 'decor' | 'land';

function owned(def: string): number {
  return Object.values(S.state.objects).filter((o) => o.kind !== 'plot' && o.def === def).length;
}

export function openShop(tab: Exclude<ShopTab, 'decor'> = 'seeds'): void {
  let current: ShopTab = tab;
  let babies = false;
  const tabs = tabsBar<ShopTab>(
    [
      { id: 'seeds', label: '🌱 Seeds' },
      { id: 'trees', label: '🌳 Trees' },
      { id: 'animals', label: '🐮 Animals' },
      { id: 'buildings', label: '🏠 Buildings' },
      { id: 'land', label: '🗺️ Land' },
      { id: 'decor', label: '🌷 Decor ›' },
    ],
    current,
    (t) => {
      // Decorations have a page of their own.
      if (t === 'decor') {
        m.close();
        openDecor({ tab: 'shop' });
        return;
      }
      current = t;
      m.rerender();
    },
  );
  const m = liveModal(
    'Market',
    (body) => {
      const st = S.state;
      if (current === 'seeds') {
        const grid = h('div', { class: 'grid' });
        for (const c of CROP_LIST) {
          if (c.event && !eventLive(c.event)) continue;
          grid.append(
            card({
              img: iconURL(c.id),
              name: c.event ? `🎃 ${c.name}` : c.name,
              price: seedCost(st, c),
              locked: levelLock(c.level),
              meta: [`⏱ ${fmtDuration(c.growSec * 1000)} · +${c.xp} XP`, `Harvest worth ${c.yield * ITEMS[c.id].sell}`, masteryLine(c.id)],
              onClick: () => {
                setTool('seed', { seed: c.id });
                m.close();
                toast(forFingers(`Click plots or grass to plant ${c.name}. Drag to plant many!`), 'info');
              },
            }),
          );
        }
        body.append(grid);
      } else if (current === 'trees' || current === 'animals') {
        const list = current === 'trees' ? TREE_LIST : ANIMAL_LIST;
        const grid = h('div', { class: 'grid' });
        if (current === 'animals') {
          const chip = (label: string, on: boolean) =>
            h(
              'button',
              {
                class: `chip${babies === on ? ' active' : ''}`,
                onclick: () => {
                  babies = on;
                  m.rerender();
                },
              },
              label,
            );
          body.append(h('div', { class: 'chips' }, chip('🐮 Grown-ups', false), chip('🍼 Babies', true)));
          if (babies) {
            body.append(h('div', { class: 'nu-hint' }, '🍼 Babies cost half as much. Give them cuddles every hour and they grow up into grown-ups that make goods. A Nursery Barn nearby makes every cuddle count double!'));
            for (const p of ANIMAL_LIST.filter((a) => BABY_ANIMALS.includes(a.id))) {
              const baby = BABY_NAMES[p.id];
              grid.append(
                card({
                  img: artURL(`animal:${p.id}`),
                  name: `Baby ${baby}`,
                  price: babyPrice(p),
                  locked: levelLock(p.level),
                  meta: [`🍼 Grows up in ${fmtDuration(babyGrowMs(p))}`, `Then makes ${nameOf(p.product)}`],
                  onClick: () => startPlacing(p.id, `baby ${baby.toLowerCase()}`, 'shop', m.close, true),
                }),
              );
            }
            body.append(grid);
            return;
          }
        }
        for (const p of list) {
          const prod = h('span', null, h('img', { class: 'ico', src: iconURL(p.product) }), ` ${p.yield}× every ${fmtDuration(p.cycleSec * 1000)}`);
          grid.append(
            card({
              img: artURL(`${p.kind}:${p.id}`),
              name: p.name,
              price: p.cost,
              locked: levelLock(p.level),
              owned: owned(p.id),
              meta: [prod],
              onClick: () => startPlacing(p.id, p.name, 'shop', m.close),
            }),
          );
        }
        body.append(grid);
      } else if (current === 'buildings') {
        const grid = h('div', { class: 'grid' });
        for (const b of BUILDING_LIST) {
          if (b.starter) continue;
          grid.append(
            card({
              img: artURL(`building:${b.id}`),
              name: b.name,
              price: b.cost,
              locked: levelLock(b.level),
              owned: owned(b.id),
              charm: b.charm,
              meta: [`Makes ${b.recipes.map((r) => nameOf(r.output)).join(', ')}`],
              onClick: () => startPlacing(b.id, b.name, 'shop', m.close),
            }),
          );
        }
        body.append(grid);
      } else {
        const next = nextExpansion(st.size);
        body.append(
          h(
            'div',
            { class: 'row' },
            h('div', { style: { fontSize: '40px' } }, '🗺️'),
            h(
              'div',
              { class: 'grow' },
              h('div', { class: 'title' }, `Your farm is ${st.size}×${st.size}`),
              h('div', { class: 'sub' }, next ? `Next: ${next.size}×${next.size} (level ${next.level})` : 'Your farm is fully grown!'),
            ),
            next
              ? h(
                  'button',
                  {
                    class: 'btn green',
                    disabled: st.level < next.level || st.coins < next.cost,
                    onclick: () => {
                      if (S.dispatch({ type: 'expand' })) {
                        confetti(80);
                        toast(`Your farm grew to ${next.size}×${next.size}!`, 'good');
                        m.close();
                      }
                    },
                  },
                  'Expand · ',
                  coin(),
                  fmtNum(next.cost),
                )
              : null,
          ),
        );
      }
    },
    { tabs, icon: iconURL('coin') },
  );
}

/** Mastery stars and progress for a seed card. */
function masteryLine(crop: string): HTMLElement {
  const stars = masteryStars(S.state, crop);
  const next = masteryProgress(S.state, crop);
  return h(
    'span',
    { class: 'mastery-line', title: next ? `${next.have} / ${next.need} harvests to mastery star ${next.star}` : 'Mastered!' },
    h('span', { class: 'ms-stars' }, '★'.repeat(stars), h('span', { class: 'ms-off' }, '★'.repeat(3 - stars))),
    next ? ` ${fmtNum(Math.min(next.have, next.need))}/${fmtNum(next.need)}` : ' Mastered',
  );
}

// ---------------------------------------------------------------------------
// Seed picker (from clicking an empty plot)

export function openSeedPicker(plotId: string | null): void {
  const m = openModal('Plant seeds', { icon: iconURL('strawberry') });
  const grid = h('div', { class: 'grid' });
  // What you can plant now, plus a peek at the next two crops (the Market lists them all).
  const peek = new Set(CROP_LIST.filter((c) => !c.event && c.level > S.state.level).slice(0, 2).map((c) => c.id));
  for (const c of CROP_LIST) {
    if (c.event && !eventLive(c.event)) continue;
    if (c.level > S.state.level && !peek.has(c.id)) continue;
    grid.append(
      card({
        img: iconURL(c.id),
        name: c.name,
        price: seedCost(S.state, c),
        locked: levelLock(c.level),
        meta: [`⏱ ${fmtDuration(c.growSec * 1000)} · +${c.xp} XP`, `Harvest worth ${c.yield * ITEMS[c.id].sell}`, masteryLine(c.id)],
        onClick: () => {
          setTool('seed', { seed: c.id });
          if (plotId) S.dispatch({ type: 'plant', id: plotId, crop: c.id });
          m.close();
          toast(`Seed bag: ${c.name}. Click or drag over plots to plant more.`, 'info');
        },
      }),
    );
  }
  m.body.append(grid);
}

// ---------------------------------------------------------------------------
// Barn: inventory and market

const CAT_LABEL: Record<ItemCategory, string> = {
  crop: '🌾 Crops',
  fruit: '🍎 Fruit',
  animal: '🥚 Animal goods',
  good: '🧺 Crafted goods',
  dish: '🍲 Home cooking',
  fish: '🐟 Fish',
  bug: '🦋 Critters',
  special: '🎟️ Event tokens',
};

/** How many of each crop or good "Sell extras" leaves in the barn. */
const KEEP_SPARE = 10;

/** Everything "Sell extras" would sell: farm produce beyond the spare stock and what orders still need. */
function extras(): Record<string, number> {
  const inv = S.state.inventory;
  const keep: Record<string, number> = {};
  for (const o of S.state.orders) for (const [id, n] of Object.entries(o.items)) keep[id] = (keep[id] ?? 0) + n;
  const out: Record<string, number> = {};
  for (const it of ITEM_LIST) {
    if (!['crop', 'fruit', 'animal', 'good'].includes(it.category)) continue;
    const n = (inv[it.id] ?? 0) - Math.max(KEEP_SPARE, keep[it.id] ?? 0);
    if (n > 0) out[it.id] = n;
  }
  return out;
}

export function openBarn(): void {
  liveModal(
    'Barn & Market',
    (body) => {
      const inv = S.state.inventory;
      let any = false;
      const extra = extras();
      const extraCoins = Object.entries(extra).reduce((t, [id, n]) => t + n * ITEMS[id].sell, 0);
      if (extraCoins > 0) {
        let armed = false;
        const btn = h('button', { class: 'btn gold' }, `Sell · ${fmtNum(extraCoins)}`);
        // Selling can't be undone, so the first tap only asks.
        btn.onclick = () => {
          if (!armed) {
            armed = true;
            btn.textContent = 'Tap again to sell';
            setTimeout(() => {
              armed = false;
              if (btn.isConnected) btn.textContent = `Sell · ${fmtNum(extraCoins)}`;
            }, 3000);
            return;
          }
          S.dispatch({ type: 'sellItems', items: extra });
        };
        body.append(
          h(
            'div',
            { class: 'row item-row sell-extras' },
            h('img', { src: iconURL('wheat'), alt: '' }),
            h(
              'div',
              { class: 'grow' },
              h('div', { class: 'title' }, 'Sell extras'),
              h('div', { class: 'sub' }, `Keeps ${KEEP_SPARE} of each for crafting and cooking, or more if an order needs it.`),
            ),
            btn,
          ),
        );
      }
      for (const cat of ['crop', 'fruit', 'animal', 'good', 'dish', 'special'] as ItemCategory[]) {
        const items = ITEM_LIST.filter((i) => i.category === cat && (inv[i.id] ?? 0) > 0);
        if (!items.length) continue;
        any = true;
        body.append(h('div', { class: 'section-title' }, CAT_LABEL[cat]));
        for (const it of items) {
          const qty = inv[it.id];
          body.append(
            h(
              'div',
              { class: 'row item-row' },
              h('img', { src: iconURL(it.id), alt: it.name }),
              h(
                'div',
                { class: 'grow' },
                h('div', { class: 'title' }, `${it.name} ×${qty}`),
                h('div', { class: 'sub' }, cat === 'special' ? 'Spend these in the seasonal token shop' : `Sells for ${it.sell} each`),
              ),
              cat === 'special'
                ? null
                : h('button', { class: 'btn small', onclick: () => S.dispatch({ type: 'sellItem', item: it.id, qty: 1 }) }, 'Sell 1'),
              qty > 1 && cat !== 'special'
                ? h(
                    'button',
                    { class: 'btn small gold', onclick: () => S.dispatch({ type: 'sellItem', item: it.id, qty }) },
                    `Sell all · ${fmtNum(qty * it.sell)}`,
                  )
                : null,
            ),
          );
        }
      }
      const gifts = inv.mystery_gift ?? 0;
      if (gifts > 0) {
        any = true;
        body.append(
          h('div', { class: 'section-title' }, '🎁 Mystery gifts'),
          h(
            'div',
            { class: 'row item-row gift-row' },
            h('img', { src: iconURL('mystery_gift'), class: 'wiggle' }),
            h('div', { class: 'grow' }, h('div', { class: 'title' }, `Mystery Gift ×${gifts}`), h('div', { class: 'sub' }, 'Found while farming. What could be inside?')),
            h('button', { class: 'btn pink', onclick: () => S.dispatch({ type: 'openGift' }) }, 'Open!'),
          ),
        );
      }
      const boxed = storedCount();
      if (boxed) {
        any = true;
        body.append(
          h('div', { class: 'section-title' }, '📦 Stored decorations'),
          h(
            'div',
            { class: 'row item-row' },
            h('img', { src: artURL('ui:decor'), alt: '' }),
            h('div', { class: 'grow' }, h('div', { class: 'title' }, `${fmtNum(boxed)} in storage`), h('div', { class: 'sub' }, 'They live on the Decor page now.')),
            h('button', { class: 'btn small green', onclick: () => (closeTop(), openDecor({ tab: 'storage' })) }, 'Open storage'),
          ),
        );
      }
      if (!any) body.append(h('div', { class: 'empty' }, 'Your barn is empty. Harvest some crops! 🌾'));
    },
    { icon: iconURL('wheat') },
  );
}

function closeTop(): void {
  // The newest panel (toasts and tooltips may sit after it in the DOM).
  const backs = document.querySelectorAll('.modal-back');
  backs[backs.length - 1]?.querySelector<HTMLButtonElement>('.close')?.click();
}

// ---------------------------------------------------------------------------
// Villager orders

export function readyOrders(): number {
  return S.state.orders?.filter((o) => Object.entries(o.items).every(([i, q]) => (S.state.inventory[i] ?? 0) >= q)).length ?? 0;
}

export function openOrders(): void {
  liveModal(
    'Order Board',
    (body) => {
      body.append(h('div', { class: 'sub', style: { fontWeight: '800', color: 'var(--muted)', marginBottom: '10px' } }, 'Villagers pay extra for deliveries, and sometimes add a little thank-you gift!'));
      const grid = h('div', { class: 'orders' });
      for (const o of S.state.orders ?? []) {
        let ok = true;
        const items = h('div', { class: 'inputs' });
        for (const [item, qty] of Object.entries(o.items)) {
          const have = S.state.inventory[item] ?? 0;
          if (have < qty) ok = false;
          items.append(h('span', { class: have < qty ? 'missing' : '', title: nameOf(item) }, h('img', { class: 'ico', src: iconURL(item) }), `${Math.min(have, qty)}/${qty}`));
        }
        grid.append(
          h(
            'div',
            { class: `order-card${ok ? ' ready' : ''}` },
            h('div', { class: 'pin' }),
            portrait(o.giver, 52),
            h('div', { class: 'order-from' }, o.giver),
            h('div', { class: 'order-note' }, `“I need these ${o.note}!”`),
            items,
            h(
              'div',
              { class: 'reward' },
              h('span', null, h('img', { src: iconURL('coin') }), fmtNum(o.coins)),
              h('span', null, h('img', { src: iconURL('xp') }), `${o.xp}`),
              o.bonus ? h('span', { title: nameOf(o.bonus) }, '+ ', h('img', { src: artURL(`deco:${o.bonus}`), style: { width: '26px', height: '26px' } })) : null,
            ),
            h(
              'div',
              { class: 'inline', style: { justifyContent: 'center', marginTop: '6px' } },
              h(
                'button',
                {
                  class: `btn green${ok ? ' pulse' : ''}`,
                  disabled: !ok,
                  onclick: () => {
                    if (S.dispatch({ type: 'fulfillOrder', order: o.id })) {
                      confetti(30);
                      toast(`${o.giver}: “Thank you so much!” 💕`, 'good');
                    }
                  },
                },
                'Deliver',
              ),
              h('button', { class: 'btn small', title: 'Swap for a new order', onclick: () => S.dispatch({ type: 'skipOrder', order: o.id }) }, '↻'),
            ),
          ),
        );
      }
      body.append(grid);
    },
    { icon: iconURL('mystery_gift') },
  );
}

/** Celebrate unwrapping a mystery gift. */
export function showUnwrap(item: string): void {
  const d = DECORATIONS[item];
  const m = openModal('Mystery Gift!', { narrow: true });
  m.body.append(
    h(
      'div',
      { class: 'levelup' },
      h('div', { class: 'unwrap-art' }, h('img', { src: artURL(`deco:${item}`) })),
      h('div', { style: { fontWeight: '900', fontSize: '20px' } }, d?.name ?? item),
      d?.charm ? h('div', { class: 'sub', style: { fontWeight: '800', color: 'var(--muted)', margin: '4px 0 12px' } }, `💗 +${d.charm} charm · added to your barn`) : null,
      h(
        'div',
        { class: 'inline', style: { justifyContent: 'center' } },
        h('button', { class: 'btn', onclick: () => m.close() }, 'Keep it'),
        h(
          'button',
          {
            class: 'btn green',
            onclick: () => {
              m.close();
              document.querySelectorAll<HTMLButtonElement>('.modal-back .close').forEach((b) => b.click());
              startPlacing(item, d?.name ?? item, 'inventory', () => {});
            },
          },
          'Place it now',
        ),
      ),
    ),
  );
  confetti(70);
}

// ---------------------------------------------------------------------------
// Crafting buildings

export function openBuilding(id: string): void {
  const obj = S.state.objects[id] as BuildingObject | undefined;
  if (!obj) return;
  const def = BUILDINGS[obj.def];
  liveModal(
    def.name,
    (body) => {
      const b = S.state.objects[id] as BuildingObject | undefined;
      if (!b) return closeTop();
      const now = S.now();
      const st = buildingStatus(b, now);
      for (const sec of BUILDING_SECTIONS) if (sec.where === 'top') sec.render(body, b);
      const queue = h('div', { class: 'queue' });
      const slots = workshopSlots(b, def);
      for (let i = 0; i < slots; i++) {
        const job = b.queue[i];
        if (!job) {
          queue.append(h('div', { class: 'slot' }, h('div', { style: { height: '34px', fontSize: '22px' } }, '·'), 'Empty slot'));
          continue;
        }
        const done = job.end <= now;
        const recipe = def.recipes.find((r) => r.id === job.recipe);
        queue.append(
          h(
            'div',
            { class: `slot filled${done ? ' ready' : ''}` },
            h('img', { src: iconURL(recipe?.output ?? job.recipe) }),
            h('div', null, nameOf(recipe?.output ?? job.recipe)),
            h('div', null, done ? '✅ Ready' : fmtDuration(job.end - now)),
          ),
        );
      }
      body.append(
        h(
          'div',
          { class: 'section-title' },
          `Production (${b.queue.length}/${slots})`,
          st.done
            ? h('button', { class: 'btn small green', onclick: () => S.dispatch({ type: 'collectCrafts', id }) }, `Collect ${st.done}`)
            : null,
        ),
        queue,
        h('div', { class: 'section-title' }, 'Recipes'),
      );
      for (const r of def.recipes) {
        const inputs = h('div', { class: 'inputs' });
        let ok = true;
        for (const [item, qty] of Object.entries(r.inputs)) {
          const have = S.state.inventory[item] ?? 0;
          if (have < qty) ok = false;
          inputs.append(
            h(
              'span',
              { class: have < qty ? 'missing' : '', title: nameOf(item) },
              h('img', { class: 'ico', src: iconURL(item) }),
              `${have}/${qty}`,
            ),
          );
        }
        body.append(
          h(
            'div',
            { class: 'recipe' },
            h('div', { class: 'out' }, h('img', { src: iconURL(r.output) })),
            h(
              'div',
              { class: 'grow', style: { flex: '1' } },
              h('div', { class: 'title', style: { fontWeight: '900' } }, `${nameOf(r.output)}${r.qty > 1 ? ` ×${r.qty}` : ''}`),
              inputs,
              h('div', { class: 'sub', style: { fontSize: '12px', color: 'var(--muted)', fontWeight: '800', marginTop: '3px' } }, `⏱ ${fmtDuration(craftMs(b, r))} · +${r.xp} XP · sells ${ITEMS[r.output].sell}🪙`),
            ),
            h(
              'button',
              {
                class: 'btn green',
                disabled: !ok || st.freeSlots === 0,
                onclick: () => S.dispatch({ type: 'craft', id, recipe: r.id }),
              },
              'Make',
            ),
          ),
        );
      }
      for (const sec of BUILDING_SECTIONS) if (sec.where !== 'top') sec.render(body, b);
    },
    { tick: true, icon: artURL(`building:${def.id}`) },
  );
}

// ---------------------------------------------------------------------------
// Quests

export function claimableQuests(): number {
  return S.state.quests.active.filter((q) => isQuestComplete(S.state, q)).length;
}

function rewardLine(reward: { coins: number; xp: number; items?: Record<string, number> }): HTMLElement {
  return h(
    'div',
    { class: 'reward' },
    'Reward:',
    reward.coins ? h('span', null, h('img', { src: iconURL('coin') }), fmtNum(reward.coins)) : null,
    reward.xp ? h('span', null, h('img', { src: iconURL('xp') }), `${reward.xp} XP`) : null,
    ...Object.entries(reward.items ?? {}).map(([id, n]) => h('span', null, h('img', { src: iconURL(id) }), `×${n}`)),
  );
}

export function openQuests(): void {
  liveModal(
    'Quests',
    (body) => {
      const qs = S.state.quests;
      if (!qs.active.length) {
        body.append(h('div', { class: 'empty' }, 'No quests right now. Level up to unlock more! 🌟'));
      }
      for (const id of qs.active) {
        const q = QUESTS[id];
        if (!q) continue;
        const done = isQuestComplete(S.state, id);
        const goals = questProgress(S.state, id).map((g) =>
          h(
            'div',
            { class: 'goal' },
            h('span', { class: `check${g.have >= g.need ? ' on' : ''}` }),
            ` ${g.label} (${fmtNum(g.have)}/${fmtNum(g.need)})`,
            h('div', { class: 'progress' }, h('div', { style: { width: `${(g.have / g.need) * 100}%` } })),
          ),
        );
        body.append(
          h(
            'div',
            { class: `quest${done ? ' done' : ''}` },
            h('div', { class: 'giver', title: q.giver }, portrait(q.giver, 56)),
            h(
              'div',
              { style: { flex: '1' } },
              h('div', { style: { fontWeight: '900', fontSize: '16px' } }, q.title),
              h('div', { class: 'text' }, `“${q.text}” · ${q.giver}`),
              ...goals,
              rewardLine(q.reward),
            ),
            done
              ? h(
                  'div',
                  { style: { alignSelf: 'center' } },
                  h(
                    'button',
                    {
                      class: 'btn gold pulse',
                      onclick: () => {
                        if (S.dispatch({ type: 'claimQuest', quest: id })) {
                          confetti(40);
                          toast(`Quest complete: ${q.title}!`, 'good');
                        }
                      },
                    },
                    'Claim!',
                  ),
                )
              : null,
          ),
        );
      }
      body.append(h('div', { class: 'sub', style: { textAlign: 'center', color: 'var(--muted)', fontWeight: '800' } }, `${qs.completed.length} ${qs.completed.length === 1 ? 'quest' : 'quests'} completed`));
    },
    { narrow: false, icon: artURL('ui:quests') },
  );
}

// ---------------------------------------------------------------------------
// Neighbors

const AVATAR_COLORS = ['#ff8fb1', '#7cc95a', '#8fd3f4', '#f5c542', '#c49bff', '#ff9b5e'];

function avatar(name: string, npc: boolean): HTMLElement {
  const villager = npc ? villagerFor(name) : undefined;
  if (villager) return portrait(villager, 44);
  const c = AVATAR_COLORS[[...name].reduce((a, ch) => a + ch.charCodeAt(0), 0) % AVATAR_COLORS.length];
  return h('div', { class: 'avatar', style: { background: npc ? '#b98552' : c } }, npc ? '🦉' : name[0].toUpperCase());
}

export function socialBadge(): number {
  const s = S.social;
  if (!s) return 0;
  return s.incoming.length + s.gifts.length + s.notifications.filter((n) => !n.seen).length;
}

export async function visit(username: string): Promise<void> {
  await S.startVisit(username);
  if (S.isVisiting) {
    recenter();
    toast(forFingers(`Welcome to ${S.visit!.state.name}! Click ✨ and 💧 bubbles to help.`), 'good');
  }
}

export function openNeighbors(): void {
  const input = h('input', { class: 'field', placeholder: "Neighbor's farmer name", maxlength: 16 });
  const add = async () => {
    const name = input.value.trim();
    if (!name) return;
    try {
      const { api } = await import('../api');
      const res = await api.requestFriend(name);
      toast(res.status === 'friends' ? `You and ${res.username} are now neighbors!` : `Request sent to ${res.username}`, 'good');
      input.value = '';
      await S.refreshSocial();
    } catch (err) {
      toast((err as Error).message, 'error');
    }
  };
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') void add();
  });
  const invite = h(
    'div',
    { class: 'invite-card' },
    h('div', { class: 'grow' }, h('div', { class: 'title' }, '💌 Invite a friend'), h('div', { class: 'sub' }, 'Send a link to your farm. It shows your farm as it looks right now, so share a fresh one after you redecorate!')),
    h('button', { class: 'btn green small', onclick: () => void shareInvite(S) }, '🔗 Share link'),
  );
  const top = LOCAL
    ? h('div', null, invite, h('div', { class: 'muted small center', style: { margin: '0 0 12px' } }, 'Open a friend\'s link to add them here. The villagers are always happy to see you too!'))
    : h(
    'div',
    null,
    h('div', { class: 'section-title' }, '➕ Add a neighbor'),
    h('div', { class: 'inline' }, input, h('button', { class: 'btn green', onclick: add }, 'Invite')),
    h('div', { class: 'sub', style: { fontSize: '12px', color: 'var(--muted)', fontWeight: '800', margin: '6px 0 12px' } }, `Share your farmer name: ${S.username}`),
    invite,
  );
  void S.refreshSocial().then(() => setTimeout(() => import('../api').then(({ api }) => api.seenNotifications()), 1500));

  liveModal(
    'Neighbors',
    (body) => {
      const s = S.social;
      if (!s) {
        body.append(h('div', { class: 'empty' }, 'Loading…'));
        return;
      }
      if (s.gifts.length) {
        body.append(h('div', { class: 'section-title' }, '🎁 Gifts for you'));
        for (const g of s.gifts) {
          body.append(
            h(
              'div',
              { class: 'row item-row' },
              h('img', { src: iconURL(g.item) }),
              h('div', { class: 'grow' }, h('div', { class: 'title' }, `${g.qty}× ${nameOf(g.item)}`), h('div', { class: 'sub' }, `from ${g.from.replace('_', ' ')} · ${timeAgo(g.createdAt, S.now())}`)),
              h('button', { class: 'btn green small', onclick: () => S.claimGift(g.id).then(() => toast(`Got ${g.qty}× ${nameOf(g.item)}!`, 'good')) }, 'Accept'),
            ),
          );
        }
      }
      if (s.incoming.length) {
        body.append(h('div', { class: 'section-title' }, '💌 Neighbor requests'));
        for (const name of s.incoming) {
          const respond = async (accept: boolean) => {
            const { api } = await import('../api');
            await api.respondFriend(name, accept).catch((e) => toast(e.message, 'error'));
            await S.refreshSocial();
          };
          body.append(
            h(
              'div',
              { class: 'row' },
              avatar(name, false),
              h('div', { class: 'grow' }, h('div', { class: 'title' }, name), h('div', { class: 'sub' }, 'wants to be your neighbor')),
              h('button', { class: 'btn green small', onclick: () => respond(true) }, 'Accept'),
              h('button', { class: 'btn small', onclick: () => respond(false) }, 'Decline'),
            ),
          );
        }
      }
      body.append(h('div', { class: 'section-title' }, `🏡 Your neighbors (${s.friends.length})`));
      for (const f of s.friends) {
        body.append(
          h(
            'div',
            { class: 'row' },
            avatar(f.username, f.isNpc),
            h(
              'div',
              { class: 'grow' },
              h('div', { class: 'title' }, f.username.replace('_', ' ')),
              h('div', { class: 'sub' }, `${f.farmName} · Lv ${f.level} · 💗${f.charm}`),
              h('div', { class: 'sub' }, `Helps left today: ${f.helpsLeft}/5${f.isNpc ? '' : ` · ${f.pal ? 'shared' : 'seen'} ${timeAgo(f.lastSeen, S.now())}`}`),
            ),
            f.pal
              ? h(
                  'button',
                  {
                    class: 'btn small',
                    title: 'Remove from your neighbors',
                    'aria-label': `Remove ${f.username}`,
                    onclick: async () => {
                      if (!confirm(`Remove ${f.username} from your neighbors? Opening their link again brings them back.`)) return;
                      const { api } = await import('../api');
                      await api.removeFriend(f.username).catch((e) => toast(e.message, 'error'));
                      await S.refreshSocial();
                    },
                  },
                  '✕',
                )
              : h(
                  'button',
                  { class: 'btn pink small', disabled: f.giftSent, onclick: () => openGiftPicker(f.username) },
                  f.giftSent ? 'Gift sent' : '🎁 Gift',
                ),
            h(
              'button',
              {
                class: 'btn sky small',
                onclick: () => {
                  closeTop();
                  void visit(f.username);
                },
              },
              'Visit',
            ),
          ),
        );
      }
      if (s.outgoing.length) {
        body.append(h('div', { class: 'section-title' }, '⏳ Waiting for reply'));
        body.append(h('div', { class: 'sub', style: { fontWeight: '800', color: 'var(--muted)' } }, s.outgoing.join(', ')));
      }
      if (s.notifications.length) {
        body.append(h('div', { class: 'section-title' }, '📰 Farm news'));
        for (const n of s.notifications.slice(0, 15)) {
          body.append(
            h(
              'div',
              { class: 'row', style: { padding: '6px 10px', background: n.seen ? '#fffdf6' : '#fff4c9' } },
              h('div', { class: 'grow' }, h('div', { style: { fontWeight: '800', fontSize: '13px' } }, n.text)),
              h('div', { class: 'sub' }, timeAgo(n.createdAt, S.now())),
            ),
          );
        }
      }
    },
    { top, icon: artURL('ui:neighbors') },
  );
}

export function openGiftPicker(username: string): void {
  const m = openModal(`Send a gift to ${username.replace('_', ' ')}`, { narrow: true });
  m.body.append(h('div', { class: 'sub', style: { fontWeight: '800', color: 'var(--muted)', marginBottom: '10px' } }, 'Gifts are free! You can send one gift to each neighbor every day.'));
  const grid = h('div', { class: 'grid' });
  for (const g of GIFT_LIST) {
    grid.append(
      card({
        img: iconURL(g.id),
        name: `${g.qty}× ${nameOf(g.id)}`,
        locked: levelLock(g.level),
        onClick: async () => {
          m.close();
          if (await S.sendGift(username, g.id)) toast(`Sent ${g.qty}× ${nameOf(g.id)} to ${username.replace('_', ' ')}! 💝`, 'good');
        },
      }),
    );
  }
  m.body.append(grid);
}

// ---------------------------------------------------------------------------
// Farmhouse: farm info, daily bonus, settings

export function dailyAvailable(): boolean {
  return S.state.daily.last !== utcDay(S.now());
}

export function openFarmhouse(): void {
  liveModal(
    'Farmhouse',
    (body) => {
      const st = S.state;
      const charm = farmCharm(st);
      const stars = charmStars(charm);
      const tier = CHARM_TIERS[stars];
      const nextTier = CHARM_TIERS[stars + 1];
      const nameInput = h('input', { class: 'field', value: st.name, maxlength: 24 });
      body.append(
        h('div', { class: 'section-title' }, '🏡 Farm name'),
        h(
          'div',
          { class: 'inline' },
          nameInput,
          h(
            'button',
            {
              class: 'btn',
              onclick: () => {
                if (S.dispatch({ type: 'rename', name: nameInput.value })) toast('Farm renamed!', 'good');
              },
            },
            'Rename',
          ),
        ),
      );

      const streak = st.daily.last === utcDay(S.now() - 86_400_000) ? st.daily.streak + 1 : 1;
      const bonus = dailyBonus(streak, stars);
      body.append(
        h('div', { class: 'section-title' }, '☀️ Daily bonus'),
        h(
          'div',
          { class: 'row' },
          h('div', { style: { fontSize: '36px' } }, '🎁'),
          h(
            'div',
            { class: 'grow' },
            h('div', { class: 'title' }, dailyAvailable() ? `Day ${streak} bonus is ready!` : 'Come back tomorrow!'),
            h('div', { class: 'sub' }, `Streak: ${st.daily.streak} day${st.daily.streak === 1 ? '' : 's'} · more charm stars = bigger bonus`),
          ),
          dailyAvailable()
            ? h(
                'button',
                {
                  class: 'btn gold pulse',
                  onclick: () => {
                    if (S.dispatch({ type: 'claimDaily' })) {
                      confetti(50);
                      toast(`Daily bonus: +${bonus.coins} coins, +${bonus.xp} XP`, 'good');
                    }
                  },
                },
                'Claim ',
                coin(),
                fmtNum(bonus.coins),
              )
            : null,
        ),
      );

      body.append(
        h('div', { class: 'section-title' }, '💗 Charm'),
        h(
          'div',
          { class: 'row' },
          h('div', { class: 'stars', style: { fontSize: '22px' } }, '★'.repeat(stars) + '☆'.repeat(5 - stars)),
          h(
            'div',
            { class: 'grow' },
            h('div', { class: 'title' }, `${tier.title} · ${charm} charm`),
            h('div', { class: 'sub' }, nextTier ? `${nextTier.min - charm} more charm for “${nextTier.title}”` : 'Maximum charm! Your farm is a dream.'),
            nextTier ? h('div', { class: 'progress' }, h('div', { style: { width: `${((charm - tier.min) / (nextTier.min - tier.min)) * 100}%` } })) : null,
          ),
        ),
      );

      const stat = (v: number | string, k: string) => h('div', { class: 'stat' }, h('div', { class: 'v' }, typeof v === 'number' ? fmtNum(v) : v), h('div', { class: 'k' }, k));
      body.append(
        h('div', { class: 'section-title' }, '📊 Farm stats'),
        h(
          'div',
          { class: 'stat-grid' },
          stat(st.level, 'Level'),
          stat(`${st.size}×${st.size}`, 'Farm size'),
          stat(st.stats.harvest ?? 0, 'Crops harvested'),
          stat(st.stats.collect ?? 0, 'Goods collected'),
          stat(st.stats.craft ?? 0, 'Items crafted'),
          stat(st.stats.help ?? 0, 'Neighbors helped'),
          stat(Object.values(st.objects).filter((o) => o.kind === 'deco').length, 'Decorations'),
          stat(st.quests.completed.length, 'Quests done'),
        ),
      );

      body.append(
        h('div', { class: 'section-title' }, '❓ How to play'),
        h(
          'ul',
          { class: 'help-list' },
          h('li', null, forFingers('Pick seeds from the Market (or click an empty plot), then click or drag over plots to plant.')),
          h('li', null, forFingers('Click ripe crops, animals and trees to collect, or pick up the 🧺 Harvest basket and sweep across the whole farm.')),
          h('li', null, "Crops wither if left too long after they're ready. Neighbors can revive them!"),
          h('li', null, 'Build workshops to turn produce into goods worth much more.'),
          h('li', null, 'Decorations add charm ⭐, which boosts your daily bonus.'),
          h('li', null, 'Seasonal decorations are only sold during their festival. Collect them all!'),
          h('li', null, 'Visit neighbors to fertilize, water and feed their farm for coins & XP.'),
          h('li', null, isTouch() ? 'Drag with the Hand to look around (two fingers with any other tool) and pinch to zoom.' : 'Drag with the Hand (or right-drag with any tool) to look around, scroll to zoom, WASD/arrows to move, R to flip, Esc to cancel.'),
        ),
        h(
          'div',
          { style: { marginTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', flexWrap: 'wrap' } },
          h('div', { class: 'sub', style: { fontWeight: '800', color: 'var(--muted)' } }, `Signed in as ${S.username}`),
          h(
            'button',
            {
              class: 'btn small sky',
              onclick: () => {
                closeTop();
                setTimeout(() => bus.emit('snapshot'), 250);
              },
            },
            '📸 Save a postcard',
          ),
          h('button', { class: 'btn small green', onclick: () => void shareInvite(S) }, '🔗 Invite a friend'),
          ...(LOCAL
            ? [
                h('button', { class: 'btn small', onclick: () => downloadBackup(st.name) }, '💾 Back up'),
                h(
                  'button',
                  {
                    class: 'btn small',
                    onclick: () => {
                      if (!confirm('Restore a backup? The farm on this device will be replaced by the one in the file.')) return;
                      pickBackup()
                        .then(() => location.reload())
                        .catch((err) => toast((err as Error).message, 'error'));
                    },
                  },
                  '📂 Restore',
                ),
              ]
            : [h('button', { class: 'btn small', onclick: () => S.logout() }, 'Log out')]),
        ),
      );
    },
    { icon: artURL('building:farmhouse') },
  );
}

// ---------------------------------------------------------------------------
// Level up celebration

export function showLevelUp(level: number): void {
  const unlocks: { img: string; name: string }[] = [];
  for (const c of CROP_LIST) if (c.level === level) unlocks.push({ img: iconURL(c.id), name: c.name });
  for (const t of TREE_LIST) if (t.level === level) unlocks.push({ img: artURL(`tree:${t.id}`), name: t.name });
  for (const a of ANIMAL_LIST) if (a.level === level) unlocks.push({ img: artURL(`animal:${a.id}`), name: a.name });
  for (const b of BUILDING_LIST) if (b.level === level && !b.starter) unlocks.push({ img: artURL(`building:${b.id}`), name: b.name });
  for (const d of DECORATION_LIST) if (d.level === level && !d.event && !d.reward) unlocks.push({ img: artURL(`deco:${d.id}`), name: d.name });
  const exp = nextExpansion(S.state.size);
  const m = openModal('Level up!', { narrow: true });
  m.body.append(
    h(
      'div',
      { class: 'levelup' },
      h('div', { class: 'big' }, `Level ${level}`),
      h(
        'div',
        { style: { fontWeight: '900', marginTop: '6px' } },
        'Bonus: ',
        coin(),
        fmtNum(levelUpReward(level)),
        level >= GIFT_LEVEL_FROM ? h('span', null, ' + ', h('img', { class: 'ico', src: iconURL(MYSTERY_GIFT), alt: '' }), ' Mystery Gift') : null,
      ),
      unlocks.length ? h('div', { class: 'section-title', style: { justifyContent: 'center' } }, 'New in the market') : null,
      !unlocks.length && level >= GIFT_LEVEL_FROM
        ? h('div', { class: 'muted small center' }, 'You’ve unlocked the whole market! Every new level brings a mystery gift to unwrap in your barn.')
        : null,
      h('div', { class: 'unlocks' }, ...unlocks.slice(0, 12).map((u) => h('div', null, h('img', { src: u.img }), h('div', null, u.name)))),
      exp && exp.level === level ? h('div', { style: { fontWeight: '900', margin: '6px 0' } }, `🗺️ You can now expand to ${exp.size}×${exp.size}!`) : null,
      h('button', { class: 'btn green big', onclick: () => m.close() }, 'Hooray!'),
    ),
  );
  confetti(100);
}


// ---------------------------------------------------------------------------
// Decoration catalog: an Animal Crossing style collection book.

export function decoCollected(id: string): boolean {
  const st = S.state;
  if (st.stats[`got:${id}`] || (st.inventory[id] ?? 0) > 0) return true;
  return Object.values(st.objects).some((o) => o.kind === 'deco' && o.def === id);
}

export function claimableRibbons(): number {
  const st = S.state;
  return RIBBON_LIST.filter((r) => {
    const tier = st.ribbons?.[r.id] ?? 0;
    return tier < 4 && (st.stats[r.stat] ?? 0) >= r.tiers[tier];
  }).length;
}

function renderRibbons(body: HTMLElement): void {
  const st = S.state;
  body.append(h('div', { class: 'sub', style: { fontWeight: '800', color: 'var(--muted)', marginBottom: '10px' } }, 'Earn yellow, white, red and blue ribbons for your farming milestones!'));
  for (const r of RIBBON_LIST) {
    const tier = st.ribbons?.[r.id] ?? 0;
    const value = st.stats[r.stat] ?? 0;
    const next = tier < 4 ? r.tiers[tier] : null;
    const ready = next !== null && value >= next;
    const rosettes = h(
      'div',
      { class: 'rosettes' },
      ...RIBBON_COLORS.map((c, i) => h('img', { src: iconURL(`ribbon_${c}`), class: i < tier ? 'won' : 'not-won', title: `${c} ribbon: ${fmtNum(r.tiers[i])} ${r.noun}` })),
    );
    body.append(
      h(
        'div',
        { class: `row ribbon-row${ready ? ' ready' : ''}` },
        rosettes,
        h(
          'div',
          { class: 'grow' },
          h('div', { class: 'title' }, r.name),
          h('div', { class: 'sub' }, next === null ? `All ribbons won! ${fmtNum(value)} ${r.noun}` : `${fmtNum(Math.min(value, next))} / ${fmtNum(next)} ${r.noun}`),
          next !== null ? h('div', { class: 'progress' }, h('div', { style: { width: `${Math.min(100, (value / next) * 100)}%` } })) : null,
        ),
        ready
          ? h(
              'button',
              {
                class: 'btn gold pulse',
                onclick: () => {
                  if (S.dispatch({ type: 'claimRibbon', ribbon: r.id })) confetti(60);
                },
              },
              `Claim ${RIBBON_COLORS[tier]}!`,
            )
          : null,
      ),
    );
  }
}

export function openCatalog(start?: string): void {
  let cat: DecoCategory = 'flowers';
  // With nothing asked for, open wherever there's something to claim.
  let view = start ?? (claimableRibbons() ? 'ribbons' : (CATALOG_TABS.find((t) => (t.badge?.() ?? 0) > 0)?.id ?? 'catalog'));
  const tabs = tabsBar<string>(
    [
      { id: 'catalog', label: '📖 Decor Catalog' },
      { id: 'ribbons', label: '🎀 Ribbons' },
      ...CATALOG_TABS.map((t) => ({ id: t.id, label: t.label })),
    ],
    view,
    (t) => {
      view = t;
      m.rerender();
    },
  );
  const m = liveModal(
    'Collections',
    (body) => {
      if (view === 'ribbons') return renderRibbons(body);
      const extra = CATALOG_TABS.find((t) => t.id === view);
      if (extra) return extra.render(body, () => m.rerender());
      const total = DECORATION_LIST.length;
      const have = DECORATION_LIST.filter((d) => decoCollected(d.id)).length;
      body.append(
        h(
          'div',
          { class: 'row' },
          h('div', { style: { fontSize: '34px' } }, '📖'),
          h(
            'div',
            { class: 'grow' },
            h('div', { class: 'title' }, `${have} / ${total} decorations collected`),
            h('div', { class: 'progress' }, h('div', { style: { width: `${(have / total) * 100}%` } })),
          ),
        ),
      );
      const chips = h('div', { class: 'chips' });
      for (const c of DECO_CATEGORIES) {
        const list = DECORATION_LIST.filter((d) => d.category === c.id);
        const n = list.filter((d) => decoCollected(d.id)).length;
        chips.append(
          h(
            'button',
            {
              class: `chip${c.id === cat ? ' active' : ''}`,
              onclick: () => {
                cat = c.id;
                m.rerender();
              },
            },
            `${c.name} ${n}/${list.length}`,
          ),
        );
      }
      body.append(chips);
      const grid = h('div', { class: 'grid catalog' });
      for (const d of DECORATION_LIST.filter((x) => x.category === cat)) {
        const got = decoCollected(d.id);
        grid.append(
          h(
            'div',
            { class: `card${got ? '' : ' unknown'}`, title: got ? d.name : 'Not collected yet' },
            h('div', { class: 'art' }, h('img', { src: artURL(`deco:${d.id}`), loading: 'lazy' })),
            h('div', { class: 'name' }, got ? d.name : '???'),
            h('div', { class: 'meta' }, d.event ? `${EVENTS[d.event]?.name ?? ''}` : got ? `💗 ${d.charm}` : `Lv ${d.level}`),
          ),
        );
      }
      body.append(grid);
    },
    { icon: iconURL('charm'), tabs },
  );
}
