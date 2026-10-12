import {
  ANIMAL_LIST,
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
  TREE_LIST,
  buildingStatus,
  charmStars,
  dailyBonus,
  farmCharm,
  isEventActive,
  isQuestComplete,
  nextExpansion,
  questProgress,
  utcDay,
  type BuildingObject,
  type DecoCategory,
  type EventDef,
  type ItemCategory,
} from '@farm/shared';
import { artURL, iconURL } from '../art';
import type { Store } from '../store';
import { setTool } from '../tools';
import { fmtDuration, fmtNum, h, nameOf, timeAgo } from '../util';
import { confetti, openModal, toast } from './dom';

let S: Store;
let recenter: () => void = () => {};

export function initPanels(store: Store, onVisitChange: () => void): void {
  S = store;
  recenter = onVisitChange;
}

const coin = () => h('img', { class: 'ico', src: iconURL('coin'), alt: 'coins' });
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const GIVERS: Record<string, string> = {
  'Mayor Maple': '🦉',
  Henrietta: '🐔',
  Penny: '🐷',
  Rosie: '🐰',
  'Grandma Fern': '🦔',
};

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

interface CardOpts {
  img: string;
  name: string;
  price?: number;
  meta?: (string | Node)[];
  locked?: string | false;
  charm?: number;
  owned?: number;
  onClick?: () => void;
}

function card(o: CardOpts): HTMLElement {
  const el = h(
    'div',
    { class: `card${o.locked ? ' locked' : ''}`, title: o.locked || o.name },
    o.locked ? h('span', { class: 'tag' }, o.locked) : null,
    o.charm ? h('span', { class: 'tag charm' }, `💗${o.charm}`) : null,
    o.owned ? h('span', { class: 'owned' }, `×${o.owned}`) : null,
    h('div', { class: 'art' }, h('img', { src: o.img, alt: o.name, loading: 'lazy' })),
    h('div', { class: 'name' }, o.name),
    o.price !== undefined ? h('div', { class: 'price' }, coin(), o.price === 0 ? 'Free' : fmtNum(o.price)) : null,
    ...(o.meta ?? []).map((m) => h('div', { class: 'meta' }, m)),
  );
  el.addEventListener('click', () => {
    if (o.locked) toast(o.locked.startsWith('Lv') ? `Unlocks at level ${o.locked.slice(3)}` : o.locked, 'error');
    else o.onClick?.();
  });
  return el;
}

function levelLock(level: number): string | false {
  return S.state.level < level ? `Lv ${level}` : false;
}

function eventReturn(ev: EventDef): string {
  return `Back ${MONTHS[ev.start[0] - 1]} ${ev.start[1]}`;
}

function tabsBar<T extends string>(tabs: { id: T; label: string }[], active: T, onPick: (t: T) => void): HTMLElement {
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

// ---------------------------------------------------------------------------
// Shop

type ShopTab = 'seeds' | 'trees' | 'animals' | 'buildings' | 'decor' | 'land';

function startPlacing(def: string, name: string, source: 'shop' | 'inventory', close: () => void): void {
  setTool('place', { place: { def, source } });
  close();
  toast(`Place your ${name}. Press R to flip, Esc or right-click to stop.`, 'info');
}

function owned(def: string): number {
  return Object.values(S.state.objects).filter((o) => o.kind !== 'plot' && o.def === def).length;
}

export function openShop(tab: ShopTab = 'seeds'): void {
  let current = tab;
  const now = S.now();
  const active = DECORATION_LIST.some((d) => d.event && isEventActive(EVENTS[d.event], now));
  let decoCat: DecoCategory = active ? 'seasonal' : 'flowers';
  const tabs = tabsBar<ShopTab>(
    [
      { id: 'seeds', label: '🌱 Seeds' },
      { id: 'trees', label: '🌳 Trees' },
      { id: 'animals', label: '🐮 Animals' },
      { id: 'buildings', label: '🏠 Buildings' },
      { id: 'decor', label: '🌷 Decor' },
      { id: 'land', label: '🗺️ Land' },
    ],
    current,
    (t) => {
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
          grid.append(
            card({
              img: iconURL(c.id),
              name: c.name,
              price: c.cost,
              locked: levelLock(c.level),
              meta: [`⏱ ${fmtDuration(c.growSec * 1000)} · +${c.xp} XP`, `Harvest worth ${c.yield * ITEMS[c.id].sell}`],
              onClick: () => {
                setTool('seed', { seed: c.id });
                m.close();
                toast(`Click plots or grass to plant ${c.name}. Drag to plant many!`, 'info');
              },
            }),
          );
        }
        body.append(grid);
      } else if (current === 'trees' || current === 'animals') {
        const list = current === 'trees' ? TREE_LIST : ANIMAL_LIST;
        const grid = h('div', { class: 'grid' });
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
      } else if (current === 'decor') {
        const chips = h('div', { class: 'chips' });
        for (const c of DECO_CATEGORIES) {
          chips.append(
            h(
              'button',
              {
                class: `chip${c.id === decoCat ? ' active' : ''}`,
                onclick: () => {
                  decoCat = c.id;
                  m.rerender();
                },
              },
              c.id === 'seasonal' ? `✨ ${c.name}` : c.name,
            ),
          );
        }
        body.append(chips);
        const now = S.now();
        const items = DECORATION_LIST.filter((d) => d.category === decoCat);
        if (decoCat === 'seasonal') {
          const evIds = [...new Set(items.map((d) => d.event!))];
          // Running events first.
          evIds.sort((a, b) => Number(isEventActive(EVENTS[b], now)) - Number(isEventActive(EVENTS[a], now)));
          for (const evId of evIds) {
            const ev = EVENTS[evId];
            const on = S.allEvents || isEventActive(ev, now);
            body.append(
              h(
                'div',
                { class: 'event-banner', style: { background: on ? ev.color : '#b9a993' } },
                h('span', null, `${on ? '🎉' : '🔒'} ${ev.name}`),
                h('span', null, on ? 'Available now!' : eventReturn(ev)),
              ),
            );
            const grid = h('div', { class: 'grid', style: { marginBottom: '14px' } });
            for (const d of items.filter((x) => x.event === evId)) {
              grid.append(
                card({
                  img: artURL(`deco:${d.id}`),
                  name: d.name,
                  price: d.cost,
                  charm: d.charm,
                  owned: owned(d.id),
                  locked: on ? false : eventReturn(ev),
                  onClick: () => startPlacing(d.id, d.name, 'shop', m.close),
                }),
              );
            }
            body.append(grid);
          }
        } else {
          const grid = h('div', { class: 'grid' });
          for (const d of items) {
            grid.append(
              card({
                img: artURL(`deco:${d.id}`),
                name: d.name,
                price: d.cost,
                charm: d.charm,
                owned: owned(d.id),
                locked: levelLock(d.level),
                meta: d.w * d.h > 1 ? [`${d.w}×${d.h} tiles`] : [],
                onClick: () => startPlacing(d.id, d.name, 'shop', m.close),
              }),
            );
          }
          body.append(grid);
        }
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

// ---------------------------------------------------------------------------
// Seed picker (from clicking an empty plot)

export function openSeedPicker(plotId: string | null): void {
  const m = openModal('Plant seeds', { icon: iconURL('strawberry') });
  const grid = h('div', { class: 'grid' });
  for (const c of CROP_LIST) {
    grid.append(
      card({
        img: iconURL(c.id),
        name: c.name,
        price: c.cost,
        locked: levelLock(c.level),
        meta: [`⏱ ${fmtDuration(c.growSec * 1000)} · +${c.xp} XP`, `Harvest worth ${c.yield * ITEMS[c.id].sell}`],
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
};

export function openBarn(): void {
  liveModal(
    'Barn & Market',
    (body) => {
      const inv = S.state.inventory;
      let any = false;
      for (const cat of ['crop', 'fruit', 'animal', 'good'] as ItemCategory[]) {
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
                h('div', { class: 'sub' }, `Sells for ${it.sell} each`),
              ),
              h('button', { class: 'btn small', onclick: () => S.dispatch({ type: 'sellItem', item: it.id, qty: 1 }) }, 'Sell 1'),
              qty > 1
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
      const stored = Object.entries(inv).filter(([id, n]) => DECORATIONS[id] && n > 0);
      if (stored.length) {
        any = true;
        body.append(h('div', { class: 'section-title' }, '📦 Stored decorations'));
        const grid = h('div', { class: 'grid' });
        for (const [id, n] of stored) {
          const d = DECORATIONS[id];
          grid.append(
            card({
              img: artURL(`deco:${id}`),
              name: d.name,
              owned: n,
              charm: d.charm,
              meta: ['Click to place'],
              onClick: () => startPlacing(id, d.name, 'inventory', closeTop),
            }),
          );
        }
        body.append(grid);
      }
      if (!any) body.append(h('div', { class: 'empty' }, 'Your barn is empty. Harvest some crops! 🌾'));
    },
    { icon: iconURL('wheat') },
  );
}

function closeTop(): void {
  document.querySelector<HTMLButtonElement>('.modal-back:last-child .close')?.click();
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
      const queue = h('div', { class: 'queue' });
      for (let i = 0; i < def.slots; i++) {
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
          `Production (${b.queue.length}/${def.slots})`,
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
              h('div', { class: 'sub', style: { fontSize: '12px', color: 'var(--muted)', fontWeight: '800', marginTop: '3px' } }, `⏱ ${fmtDuration(r.craftSec * 1000)} · +${r.xp} XP · sells ${ITEMS[r.output].sell}🪙`),
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
            `${g.have >= g.need ? '✅' : '⬜'} ${g.label} (${fmtNum(g.have)}/${fmtNum(g.need)})`,
            h('div', { class: 'progress' }, h('div', { style: { width: `${(g.have / g.need) * 100}%` } })),
          ),
        );
        body.append(
          h(
            'div',
            { class: `quest${done ? ' done' : ''}` },
            h('div', { class: 'giver', title: q.giver }, GIVERS[q.giver] ?? '🧑‍🌾'),
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
      body.append(h('div', { class: 'sub', style: { textAlign: 'center', color: 'var(--muted)', fontWeight: '800' } }, `${qs.completed.length} quests completed`));
    },
    { narrow: false },
  );
}

// ---------------------------------------------------------------------------
// Neighbors

const AVATAR_COLORS = ['#ff8fb1', '#7cc95a', '#8fd3f4', '#f5c542', '#c49bff', '#ff9b5e'];

function avatar(name: string, npc: boolean): HTMLElement {
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
    toast(`Welcome to ${S.visit!.state.name}! Click ✨ and 💧 bubbles to help.`, 'good');
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
  const top = h(
    'div',
    null,
    h('div', { class: 'section-title' }, '➕ Add a neighbor'),
    h('div', { class: 'inline' }, input, h('button', { class: 'btn green', onclick: add }, 'Invite')),
    h('div', { class: 'sub', style: { fontSize: '12px', color: 'var(--muted)', fontWeight: '800', margin: '6px 0 0' } }, `Share your farmer name: ${S.username}`),
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
              h('div', { class: 'sub' }, `Helps left today: ${f.helpsLeft}/5${f.isNpc ? '' : ` · seen ${timeAgo(f.lastSeen, S.now())}`}`),
            ),
            h(
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
    { top },
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
          h('li', null, 'Pick seeds from the Market (or click an empty plot), then click or drag over plots to plant.'),
          h('li', null, 'Click ripe crops, animals and trees to collect. Drag across a field to harvest it all.'),
          h('li', null, "Crops wither if left too long after they're ready. Neighbors can revive them!"),
          h('li', null, 'Build workshops to turn produce into goods worth much more.'),
          h('li', null, 'Decorations add charm ⭐, which boosts your daily bonus.'),
          h('li', null, 'Seasonal decorations are only sold during their festival. Collect them all!'),
          h('li', null, 'Visit neighbors to fertilize, water and feed their farm for coins & XP.'),
          h('li', null, 'Drag to pan, scroll or pinch to zoom, WASD/arrows to move, R to flip, Esc to cancel.'),
        ),
        h(
          'div',
          { style: { marginTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', flexWrap: 'wrap' } },
          h('div', { class: 'sub', style: { fontWeight: '800', color: 'var(--muted)' } }, `Signed in as ${S.username}`),
          h('button', { class: 'btn small', onclick: () => S.logout() }, 'Log out'),
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
  for (const d of DECORATION_LIST) if (d.level === level && !d.event) unlocks.push({ img: artURL(`deco:${d.id}`), name: d.name });
  const exp = nextExpansion(S.state.size);
  const m = openModal('Level up!', { narrow: true });
  m.body.append(
    h(
      'div',
      { class: 'levelup' },
      h('div', { class: 'big' }, `Level ${level}`),
      h('div', { style: { fontWeight: '900', marginTop: '6px' } }, 'Bonus: ', coin(), fmtNum(50 * level)),
      unlocks.length ? h('div', { class: 'section-title', style: { justifyContent: 'center' } }, 'New in the market') : null,
      h('div', { class: 'unlocks' }, ...unlocks.slice(0, 12).map((u) => h('div', null, h('img', { src: u.img }), h('div', null, u.name)))),
      exp && exp.level === level ? h('div', { style: { fontWeight: '900', margin: '6px 0' } }, `🗺️ You can now expand to ${exp.size}×${exp.size}!`) : null,
      h('button', { class: 'btn green big', onclick: () => m.close() }, 'Hooray!'),
    ),
  );
  confetti(100);
}

