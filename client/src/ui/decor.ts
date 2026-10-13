// The Decor page: every decoration in the game, with a shelf for the ones in
// storage. There are hundreds, so it has a search box, a category rail,
// sorting and a couple of filters. The page remembers where you were, so
// placing something and coming back drops you on the same shelf.

import {
  DECORATIONS,
  DECORATION_LIST,
  DECO_CATEGORIES,
  EVENTS,
  EVENT_FEATURES,
  isEventActive,
  type DecoCategory,
  type DecoDef,
} from '@farm/shared';
import { artURL, iconURL } from '../art';
import { eventLive } from '../events';
import type { Store } from '../store';
import { setTool } from '../tools';
import { fmtNum, h } from '../util';
import { openModal, toast } from './dom';
import { forFingers, isTouch } from './layout';
import { card, eventReturn, levelLock, startPlacing } from './cards';

let S: Store;

export function initDecor(store: Store): void {
  S = store;
}

type Tab = 'shop' | 'storage';
type Cat = DecoCategory | 'all' | 'rewards';
type Sort = 'featured' | 'cheap' | 'pricey' | 'charm' | 'name';

const SORTS: { id: Sort; label: string }[] = [
  { id: 'featured', label: 'Featured' },
  { id: 'cheap', label: 'Price: low to high' },
  { id: 'pricey', label: 'Price: high to low' },
  { id: 'charm', label: 'Most charm' },
  { id: 'name', label: 'A to Z' },
];

/** Where you were last time (kept for the session). */
const view: { tab: Tab; cat: Cat | null; q: string; sort: Sort; afford: boolean; fresh: boolean; scroll: number } = {
  tab: 'shop',
  cat: null,
  q: '',
  sort: 'featured',
  afford: false,
  fresh: false,
  scroll: 0,
};

/** How many cards to draw at a time; more appear as you scroll. */
const BATCH = 48;
/** How many are drawn so far on this shelf (kept when the page refreshes). */
let depth = BATCH;

const live = (d: DecoDef) => !d.event || eventLive(d.event, S.now(), S.allEvents);
const forSale = DECORATION_LIST.filter((d) => !d.reward);
const rewards = DECORATION_LIST.filter((d) => d.reward);

function catName(c: Cat): string {
  if (c === 'all') return 'Everything';
  if (c === 'rewards') return 'Rewards';
  return DECO_CATEGORIES.find((x) => x.id === c)!.name;
}

/** A category's picture on the rail: one of its own decorations. */
const CAT_ART: Partial<Record<Cat, string>> = {
  all: 'garden_gnome',
  flowers: 'tulips_pink',
  plants: 'topiary_bunny',
  fences: 'picket_fence',
  paths: 'path_flower',
  furniture: 'bench_white',
  lights: 'stone_lantern',
  water: 'fountain',
  garden: 'birdhouse',
  whimsy: 'owl_statue',
  horticulture: 'smiling_sunflower_pot',
  country: 'chicken_coop',
  party: 'birthday_cake',
  kitty: 'cat_bed',
};

function catArt(c: Cat): string {
  if (c === 'rewards') return iconURL('ribbon_blue');
  const id = CAT_ART[c];
  // The seasonal shelf shows off whichever festival is on.
  const pick = (id && DECORATIONS[id]) || (c === 'seasonal' ? (forSale.find((d) => d.event && live(d)) ?? forSale.find((d) => d.event)) : forSale.find((d) => d.category === c));
  return pick ? artURL(`deco:${pick.id}`) : iconURL('coin');
}

/** Decorations you have, out on the farm and tucked away. */
function ownedCounts(): Map<string, number> {
  const n = new Map<string, number>();
  for (const o of Object.values(S.state.objects)) if (o.kind === 'deco') n.set(o.def, (n.get(o.def) ?? 0) + 1);
  for (const [id, q] of Object.entries(S.state.inventory)) if (DECORATIONS[id] && q > 0) n.set(id, (n.get(id) ?? 0) + q);
  return n;
}

const stored = (): [DecoDef, number][] =>
  Object.entries(S.state.inventory)
    .filter(([id, q]) => DECORATIONS[id] && q > 0)
    .map(([id, q]) => [DECORATIONS[id], q]);

export function storedCount(): number {
  return stored().reduce((s, [, q]) => s + q, 0);
}

function matches(d: DecoDef, q: string): boolean {
  if (!q) return true;
  const ev = d.event ? EVENTS[d.event]?.name ?? '' : '';
  const hay = `${d.name} ${catName(d.category)} ${ev} ${d.reward ?? ''}`.toLowerCase();
  return q
    .toLowerCase()
    .split(/\s+/)
    .every((w) => hay.includes(w));
}

/** The price to sort by: event tokens count as a little more than coins. */
const priceOf = (d: DecoDef) => (d.tokens ? d.tokens * 50 : d.cost);

function sorted(list: DecoDef[]): DecoDef[] {
  const out = [...list];
  switch (view.sort) {
    case 'cheap':
      return out.sort((a, b) => priceOf(a) - priceOf(b));
    case 'pricey':
      return out.sort((a, b) => priceOf(b) - priceOf(a));
    case 'charm':
      return out.sort((a, b) => b.charm - a.charm || priceOf(a) - priceOf(b));
    case 'name':
      return out.sort((a, b) => a.name.localeCompare(b.name));
    default:
      // In season first, then by the level they unlock at.
      return out.sort((a, b) => Number(live(b)) - Number(live(a)) || a.level - b.level);
  }
}

function affordable(d: DecoDef): boolean {
  if (!live(d) || S.state.level < d.level) return false;
  if (d.tokens) return (S.state.inventory[EVENT_FEATURES[d.event ?? '']?.currency ?? ''] ?? 0) >= d.tokens;
  return S.state.coins >= d.cost;
}

/** The decorations on the current shop shelf. */
function shopItems(cat: Cat, owned: Map<string, number>): DecoDef[] {
  let list: DecoDef[];
  if (cat === 'rewards') list = rewards;
  else if (cat === 'all') list = view.q ? forSale : forSale.filter(live);
  else list = forSale.filter((d) => d.category === cat);
  list = list.filter((d) => matches(d, view.q));
  if (view.afford && cat !== 'rewards') list = list.filter(affordable);
  if (view.fresh) list = list.filter((d) => !owned.get(d.id));
  return sorted(list);
}

function defaultCat(): Cat {
  return forSale.some((d) => d.event && live(d)) ? 'seasonal' : 'all';
}

export function openDecor(opts: { tab?: Tab; cat?: Cat; q?: string } = {}): void {
  if (opts.cat || opts.tab) {
    // Sent to a particular shelf: start at its top.
    view.tab = opts.tab ?? 'shop';
    if (opts.cat) view.cat = opts.cat;
    view.q = '';
    view.afford = view.fresh = false;
    view.scroll = 0;
    depth = BATCH;
  }
  if (opts.q) {
    view.tab = 'shop';
    view.cat = 'all';
    view.q = opts.q;
    view.afford = view.fresh = false;
    view.scroll = 0;
    depth = BATCH;
  }
  view.cat ??= defaultCat();

  const tabBtn = (id: Tab, label: () => string) => {
    const b = h('button', { class: 'btn small tab', onclick: () => go(id) });
    const paint = () => {
      b.textContent = label();
      b.classList.toggle('active', view.tab === id);
    };
    return { b, paint };
  };
  const shopTab = tabBtn('shop', () => '🛍️ Shop');
  const storeTab = tabBtn('storage', () => `📦 Storage${storedCount() ? ` (${fmtNum(storedCount())})` : ''}`);
  const tabs = h('div', { class: 'modal-tabs' }, shopTab.b, storeTab.b);

  const m = openModal('Decor', { tabs, icon: artURL('ui:decor'), onClose: () => off() });
  m.el.classList.add('decor-modal');
  m.body.classList.add('decor-body');

  // --- the rail of categories ---
  const rail = h('div', { class: 'decor-rail' });
  // --- search, sort and filters ---
  const search = h('input', {
    class: 'decor-search',
    type: 'search',
    placeholder: 'Search decorations…',
    value: view.q,
    'aria-label': 'Search decorations',
  }) as HTMLInputElement;
  const clear = h('button', { class: 'decor-clear', 'aria-label': 'Clear search', onclick: () => ((search.value = ''), search.dispatchEvent(new Event('input')), search.focus()) }, '✕');
  const sort = h(
    'select',
    { class: 'decor-sort', 'aria-label': 'Sort' },
    ...SORTS.map((s) => h('option', { value: s.id, ...(s.id === view.sort ? { selected: true } : {}) }, s.label)),
  ) as HTMLSelectElement;
  const toggle = (key: 'afford' | 'fresh', label: string) => {
    const b = h('button', { class: 'chip', onclick: () => ((view[key] = !view[key]), reshelve()) }, label);
    return { b, paint: () => b.classList.toggle('active', view[key]) };
  };
  const afford = toggle('afford', '🪙 Can afford');
  const fresh = toggle('fresh', '✨ New to me');
  const summary = h('div', { class: 'decor-summary' });
  const tools = h(
    'div',
    { class: 'decor-tools' },
    h('div', { class: 'decor-search-wrap' }, h('span', { class: 'decor-glass' }, '🔍'), search, clear),
    h('div', { class: 'decor-filters' }, sort, afford.b, fresh.b),
    summary,
  );
  const results = h('div', { class: 'decor-results' });
  const main = h('div', { class: 'decor-main' }, tools, results);
  m.body.append(rail, main);

  results.addEventListener('scroll', () => (view.scroll = results.scrollTop), { passive: true });

  let timer = 0;
  search.addEventListener('input', () => {
    clearTimeout(timer);
    clear.style.visibility = search.value ? 'visible' : 'hidden';
    timer = window.setTimeout(() => {
      view.q = search.value.trim();
      reshelve();
    }, 120);
  });
  clear.style.visibility = view.q ? 'visible' : 'hidden';
  sort.addEventListener('change', () => {
    view.sort = sort.value as Sort;
    reshelve();
  });

  function go(tab: Tab) {
    if (view.tab === tab) return;
    view.tab = tab;
    reshelve();
  }

  function pickCat(c: Cat) {
    view.cat = c;
    reshelve();
    rail.querySelector('.active')?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }

  function paintRail(owned: Map<string, number>) {
    const cats: Cat[] = ['all', ...DECO_CATEGORIES.map((c) => c.id), 'rewards'];
    const inStore = stored();
    rail.replaceChildren(
      ...cats.flatMap((c) => {
        let count: string;
        if (view.tab === 'storage') {
          const n = inStore.filter(([d]) => c === 'all' || (c === 'rewards' ? d.reward : d.category === c && !d.reward)).reduce((s, [, q]) => s + q, 0);
          if (!n && c !== 'all') return [];
          count = fmtNum(n);
        } else if (c === 'rewards') count = `${rewards.filter((d) => owned.get(d.id)).length}/${rewards.length}`;
        else if (c === 'all') count = fmtNum(forSale.filter(live).length);
        else count = fmtNum(forSale.filter((d) => d.category === c).length);
        const hot = c === 'seasonal' && forSale.some((d) => d.event && live(d));
        return [
          h(
            'button',
            { class: `decor-cat${view.cat === c ? ' active' : ''}${hot ? ' hot' : ''}`, onclick: () => pickCat(c) },
            h('img', { src: catArt(c), alt: '' }),
            h('span', { class: 'decor-cat-name' }, catName(c)),
            h('span', { class: 'decor-cat-n' }, count),
          ),
        ];
      }),
    );
    if (view.tab === 'shop') {
      const have = DECORATION_LIST.filter((d) => owned.get(d.id)).length;
      rail.append(
        h(
          'div',
          { class: 'decor-collected', title: 'Kinds of decoration you own, out on the farm or in storage' },
          h('b', null, `${have} / ${DECORATION_LIST.length}`),
          h('span', null, 'collected'),
          h('div', { class: 'decor-bar' }, h('i', { style: { width: `${(have / DECORATION_LIST.length) * 100}%` } })),
        ),
      );
    }
  }

  /** Draws cards a batch at a time as the shelf scrolls into view. */
  function lazyGrid(defs: DecoDef[], make: (d: DecoDef) => HTMLElement, into: HTMLElement) {
    const grid = h('div', { class: 'grid' });
    into.append(grid);
    let shown = 0;
    const more = (n: number) => {
      for (const d of defs.slice(shown, shown + n)) grid.append(make(d));
      shown += n;
      depth = Math.max(depth, shown);
      if (shown < defs.length) {
        const sentinel = h('div', { class: 'decor-more' }, 'More…');
        grid.after(sentinel);
        const io = new IntersectionObserver(
          (es) => {
            if (!es.some((e) => e.isIntersecting)) return;
            io.disconnect();
            sentinel.remove();
            more(BATCH);
          },
          { root: results, rootMargin: '400px' },
        );
        io.observe(sentinel);
      }
    };
    more(depth);
  }

  function shopCard(d: DecoDef, owned: Map<string, number>): HTMLElement {
    const n = owned.get(d.id) ?? 0;
    if (d.reward) {
      const inBox = S.state.inventory[d.id] ?? 0;
      return card({
        img: artURL(`deco:${d.id}`),
        name: d.name,
        charm: d.charm,
        owned: n,
        cls: n ? 'earned' : 'unearned',
        meta: [n ? (inBox ? forFingers('In storage · click to place') : '✓ Earned') : `🏆 ${d.reward}`],
        onClick: () => (inBox ? startPlacing(d.id, d.name, 'inventory', m.close) : toast(n ? `${d.name} is already on your farm.` : `🏆 ${d.reward}`, 'info')),
      });
    }
    const ev = d.event ? EVENTS[d.event] : null;
    const evOn = !ev || isEventActive(ev, S.now()) || eventLive(d.event!, S.now(), S.allEvents);
    return card({
      img: artURL(`deco:${d.id}`),
      name: d.name,
      price: d.cost,
      tokens: d.tokens,
      tokenIcon: EVENT_FEATURES[d.event ?? '']?.currency,
      charm: d.charm,
      owned: n,
      cls: affordable(d) ? '' : 'poor',
      locked: ev && !evOn ? eventReturn(ev) : levelLock(d.level),
      meta: [...(d.w * d.h > 1 ? [`${d.w}×${d.h} tiles`] : []), ...(ev && view.cat !== 'seasonal' ? [`${ev.name}`] : [])],
      onClick: () => startPlacing(d.id, d.name, 'shop', m.close),
    });
  }

  function paintShop(owned: Map<string, number>) {
    const cat = view.cat!;
    const items = shopItems(cat, owned);
    summary.textContent = `${catName(cat)} · ${items.length} ${items.length === 1 ? 'decoration' : 'decorations'}${view.q ? ` matching “${view.q}”` : ''}`;
    if (!items.length) {
      results.append(h('div', { class: 'empty' }, view.q || view.afford || view.fresh ? 'Nothing here matches. Try clearing a filter! 🌼' : 'Nothing here yet.'));
      return;
    }
    // The seasonal shelf is grouped by festival, running ones first, with their token shops.
    if (cat === 'seasonal' && view.sort === 'featured') {
      const evIds = [...new Set(items.map((d) => d.event!))].sort(
        (a, b) => Number(eventLive(b, S.now(), S.allEvents)) - Number(eventLive(a, S.now(), S.allEvents)) || (EVENT_FEATURES[a]?.priority ?? 99) - (EVENT_FEATURES[b]?.priority ?? 99),
      );
      for (const evId of evIds) {
        const ev = EVENTS[evId];
        const on = eventLive(evId, S.now(), S.allEvents);
        const section = h('div', { class: 'decor-section' });
        section.append(
          h(
            'div',
            { class: 'event-banner', style: { background: on ? ev.color : '#b9a993' } },
            h('span', null, `${on ? '🎉' : '🔒'} ${ev.name}`),
            h('span', null, on ? 'Available now!' : eventReturn(ev)),
          ),
        );
        const evItems = items.filter((x) => x.event === evId).sort((a, b) => Number(!!b.tokens) - Number(!!a.tokens));
        const feature = EVENT_FEATURES[evId];
        if (on && feature && evItems.some((x) => x.tokens)) {
          section.append(
            h(
              'div',
              { class: 'candy-banner' },
              h('img', { src: iconURL(feature.currency) }),
              h(
                'div',
                null,
                h('b', null, `${ev.name} Token Shop`),
                h('div', null, `Exclusives paid in ${feature.currencyName.toLowerCase()}. Harvest, collect and greet ${feature.visitorName}s to earn more!`),
              ),
              h('div', { class: 'candy-count' }, fmtNum(S.state.inventory[feature.currency] ?? 0)),
            ),
          );
        }
        section.append(h('div', { class: 'grid' }, ...evItems.map((d) => shopCard(d, owned))));
        results.append(section);
      }
      return;
    }
    if (cat === 'rewards' && !view.q)
      results.append(h('div', { class: 'nu-hint' }, '🏆 Rewards are never sold: earn them from collections, mastery, the County Fair and friends.'));
    lazyGrid(items, (d) => shopCard(d, owned), results);
  }

  function paintStorage() {
    const cat = view.cat!;
    let list = stored().filter(([d]) => cat === 'all' || (cat === 'rewards' ? d.reward : d.category === cat && !d.reward));
    if (!list.length && cat !== 'all') {
      // Nothing of this kind left in storage: show everything instead.
      view.cat = 'all';
      return paintAll();
    }
    list = list.filter(([d]) => matches(d, view.q));
    const qty = new Map(list.map(([d, q]) => [d.id, q]));
    const defs = sorted(list.map(([d]) => d));
    const total = list.reduce((s, [, q]) => s + q, 0);
    summary.textContent = `${total} in storage${view.q ? ` matching “${view.q}”` : ''}`;
    results.append(
      h(
        'div',
        { class: 'decor-tidy' },
        h('span', null, forFingers('📦 Tidy up: the Store tool tucks decorations away here. Click one to put it back out.')),
        h('button', { class: 'btn small', onclick: () => (m.close(), setTool('store'), toast(forFingers('Click a decoration to put it in storage.'), 'info')) }, '📦 Store tool'),
      ),
    );
    if (!defs.length) {
      results.append(h('div', { class: 'empty' }, view.q ? 'Nothing in storage matches. 🌼' : 'Storage is empty. Everything you own is out on the farm! 🏡'));
      return;
    }
    lazyGrid(
      defs,
      (d) =>
        card({
          img: artURL(`deco:${d.id}`),
          name: d.name,
          charm: d.charm,
          owned: qty.get(d.id),
          meta: [forFingers('Click to place')],
          onClick: () => startPlacing(d.id, d.name, 'inventory', m.close),
        }),
      results,
    );
  }

  /** Show a different shelf (or filter): start from the top with one batch. */
  function reshelve() {
    depth = BATCH;
    results.scrollTop = 0;
    paintAll();
  }

  function paintAll() {
    shopTab.paint();
    storeTab.paint();
    afford.paint();
    fresh.paint();
    afford.b.style.display = view.tab === 'shop' ? '' : 'none';
    fresh.b.style.display = view.tab === 'shop' ? '' : 'none';
    const owned = ownedCounts();
    const scroll = results.scrollTop;
    results.replaceChildren();
    if (view.tab === 'shop') paintShop(owned);
    else paintStorage();
    paintRail(owned);
    results.scrollTop = scroll;
  }

  // Coins and storage change while the page is open (selling, earning): keep it fresh.
  let queued = 0;
  const off = S.onChange(() => {
    cancelAnimationFrame(queued);
    queued = requestAnimationFrame(paintAll);
  });
  paintAll();
  results.scrollTop = view.scroll;
  rail.querySelector('.active')?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  if (!isTouch()) search.focus({ preventScroll: true });
}
