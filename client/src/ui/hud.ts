import { CAN_SIZE, CROPS, EVENTS, EVENT_FEATURE_LIST, charmStars, farmCharm, needsAttention, waterLevel, xpForLevel } from '@farm/shared';
import { artURL, hasArt, iconURL } from '../art';
import { bus } from '../bus';
import type { Store } from '../store';
import { setTool, tools, type Tool } from '../tools';
import { activeFeatures } from '../events';
import { audioSettings, setMusic } from '../sfx';
import { installRow } from './install';
import { forFingers, isTouch, layout, onLayout, type Layout } from './layout';
import { openKitchen, readyDishes } from './cooking';
import { fmtNum, h, timeAgo } from '../util';
import { LOCAL } from '../api';
import { HUD_BUTTONS, HUD_PILLS, MODE_HINTS, catalogTabBadges } from '../features/registry';
import {
  claimableQuests,
  dailyAvailable,
  openBarn,
  openFarmhouse,
  openGiftPicker,
  openNeighbors,
  openOrders,
  openCatalog,
  claimableRibbons,
  readyOrders,
  openQuests,
  openSeedPicker,
  openShop,
  socialBadge,
} from './panels';

interface HudDeps {
  store: Store;
  goHome: () => void;
  zoom: (factor: number) => void;
}

/** A painted UI icon (ui:<key>) when there is one, else the emoji (or three dots for ''). */
function uiIcon(key: string, em: string): Node {
  if (hasArt(`ui:${key}`)) return h('img', { class: 'ui-ico', src: artURL(`ui:${key}`), alt: '' });
  return em ? document.createTextNode(em) : h('span', { class: 'dots' }, h('i'), h('i'), h('i'));
}


/** Rolls a number shown in `el` towards `to`, like a little tally counter. */
const counters = new WeakMap<HTMLElement, { shown: number; to: number; raf: number }>();
function countTo(el: HTMLElement, to: number): void {
  let c = counters.get(el);
  if (!c) {
    counters.set(el, { shown: to, to, raf: 0 });
    el.textContent = fmtNum(to);
    return;
  }
  if (c.to === to) return;
  c.to = to;
  cancelAnimationFrame(c.raf);
  const from = c.shown;
  const start = performance.now();
  const dur = Math.min(700, 250 + Math.abs(to - from) * 4);
  const step = (t: number) => {
    const k = Math.min(1, (t - start) / dur);
    c!.shown = Math.round(from + (to - from) * (1 - (1 - k) ** 3));
    el.textContent = fmtNum(c!.shown);
    if (k < 1) c!.raf = requestAnimationFrame(step);
  };
  c.raf = requestAnimationFrame(step);
}

/** The level each feature's button appears at (its first quest's level). */
const FEATURE_UNLOCK: Record<string, number> = { kitties: 3, fish: 3, journal: 3, friends: 4, town: 4, garage: 4, fair: 4, blooms: 5 };

const TOOLS: { id: Tool | 'shop' | 'cook'; label: string; em: string; hint?: string }[] = [
  { id: 'hand', label: 'Hand', em: '✋' },
  { id: 'plow', label: 'Plow', em: '⛏️', hint: 'Click or drag over grass to plow plots (15 coins each)' },
  { id: 'seed', label: 'Seeds', em: '🌱' },
  { id: 'water', label: 'Water', em: '💧', hint: 'Click or drag over growing crops to water them. Tap a Wishing Well or Water Pump to fill your can.' },
  { id: 'shop', label: 'Market', em: '🛒' },
  { id: 'cook', label: 'Cook', em: '🍳' },
  { id: 'move', label: 'Move', em: '🔀', hint: 'Click something to pick it up, then click where it should go' },
  { id: 'store', label: 'Store', em: '📦', hint: 'Click a decoration to put it in your barn' },
  { id: 'sell', label: 'Sell', em: '💰', hint: 'Click something to sell it (or remove a plot)' },
];

export function mountHud({ store, goHome, zoom }: HudDeps): void {
  const ui = document.getElementById('ui')!;

  // --- top-left stats ---
  const levelNum = h('div', { class: 'level-badge' });
  const xpFill = h('div');
  const xpText = h('div', { class: 'xp-text' });
  const coins = h('span');
  const charm = h('span');
  const stars = h('span', { class: 'stars' });
  const farmName = h('span', { class: 'farm-name' });
  const levelPill = h(
    'div',
    { class: 'pill level-pill', title: 'Level & experience' },
    levelNum,
    h('div', null, farmName, h('div', { class: 'xpbar' }, xpFill), xpText),
  );
  const coinPill = h('div', { class: 'pill', title: 'Coins' }, h('img', { class: 'ico', src: iconURL('coin') }), coins);
  // One pill per running event currency (e.g. candy at Halloween).
  const currencyPills = new Map<string, { pill: HTMLElement; count: HTMLElement }>();
  for (const f of EVENT_FEATURE_LIST) {
    const count = h('span');
    const pill = h(
      'div',
      {
        class: 'pill candy-pill',
        title: `${f.currencyName}: spend them in the ${EVENTS[f.event].name} shop (Market › Decor › Seasonal)`,
        onclick: () => openShop('decor'),
      },
      h('img', { class: 'ico', src: iconURL(f.currency) }),
      count,
    );
    pill.style.display = 'none';
    currencyPills.set(f.currency, { pill, count });
  }
  const hud = h(
    'div',
    { class: 'hud' },
    levelPill,
    coinPill,
    h('div', { class: 'pill', title: 'Farm charm' }, h('img', { class: 'ico', src: iconURL('charm') }), charm, stars),
    ...[...currencyPills.values()].map((c) => c.pill),
    ...HUD_PILLS,
  );

  // --- top-right buttons ---
  const roundBtn = (key: string, em: string, label: string, onclick: () => void) => {
    const badge = h('span', { class: 'badge', style: { display: 'none' } });
    const btn = h('button', { class: 'round-btn', onclick, 'aria-label': label }, uiIcon(key, em), badge, h('small', null, label));
    return { btn, badge };
  };
  const quests = roundBtn('quests', '📜', 'Quests', openQuests);
  const neighbors = roundBtn('neighbors', '🏘️', 'Neighbors', openNeighbors);
  const barn = roundBtn('barn', '🧺', 'Barn', openBarn);
  const orders = roundBtn('orders', '📋', 'Orders', openOrders);
  const daily = roundBtn('farm', '🏡', 'Farm', openFarmhouse);
  const catalog = roundBtn('collections', '📖', 'Collections', () => openCatalog());
  const musicIcon = () => (audioSettings.music ? uiIcon('music', '🎵') : uiIcon('music_off', '🔇'));
  const music = roundBtn('music', '🎵', 'Music', () => {
    setMusic(!audioSettings.music);
    music.btn.firstChild!.replaceWith(musicIcon());
  });
  music.btn.firstChild!.replaceWith(musicIcon());
  music.btn.classList.add('small-round');
  // Feature buttons (fishing, critters, ...) slot in before Farm and Music.
  const extraCorner = HUD_BUTTONS.filter((b) => b.where === 'corner').map((b) => ({ def: b, ...roundBtn(b.id, b.em, b.label, b.onClick) }));
  const corner = h(
    'div',
    { class: 'corner' },
    quests.btn,
    orders.btn,
    neighbors.btn,
    barn.btn,
    catalog.btn,
    ...extraCorner.map((b) => b.btn),
    daily.btn,
    music.btn,
  );

  // Icons fly from the farm into the HUD when you earn things.
  let flying = 0;
  bus.on('fly', (icon, x, y, target) => {
    if (flying > 14) return;
    const el = target === 'coins' ? coinPill : target === 'xp' ? levelPill : barn.btn;
    const r = el.getBoundingClientRect();
    const img = h('img', { class: 'flyer', src: iconURL(icon.replace(/^icon:/, '')) });
    img.style.left = `${x - 14}px`;
    img.style.top = `${y - 14}px`;
    document.body.append(img);
    flying++;
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        img.style.transform = `translate(${r.left + r.width / 2 - x}px, ${r.top + r.height / 2 - y}px) scale(0.7)`;
      }),
    );
    setTimeout(() => {
      img.remove();
      flying--;
      el.classList.remove('bump');
      void el.offsetWidth;
      el.classList.add('bump');
    }, 620);
  });

  // --- toolbar ---
  const toolButtons = new Map<string, HTMLButtonElement>();
  const seedImg = h('img', { alt: '' });
  const toolbar = h('div', { class: 'toolbar' });
  for (const t of TOOLS) {
    const em = h('span', { class: 'em' }, t.id === 'seed' ? seedImg : uiIcon(t.id === 'shop' ? 'market' : t.id, t.em));
    const btn = h(
      'button',
      {
        class: `tool${t.id === 'shop' ? ' shop' : ''}`,
        onclick: () => {
          if (t.id === 'shop') return openShop();
          if (t.id === 'cook') return openKitchen();
          if (t.id === 'seed') return openSeedPicker(null);
          setTool(t.id);
          if (t.hint) bus.emit('toast', forFingers(t.hint), 'info');
        },
      },
      em,
      t.label,
    );
    toolButtons.set(t.id, btn);
    toolbar.append(btn);
    // Feature tools sit right after Cook.
    if (t.id === 'cook')
      for (const b of HUD_BUTTONS.filter((x) => x.where === 'toolbar')) {
        const fb = h('button', { class: 'tool', style: { position: 'relative' }, onclick: b.onClick }, h('span', { class: 'em' }, uiIcon(b.id, b.em)), b.label);
        toolButtons.set(`feature:${b.id}`, fb);
        toolbar.append(fb);
      }
  }
  const waterCount = h('span', { class: 'tool-count' });
  toolButtons.get('water')?.append(waterCount);
  const hintText = h('span');
  const flipBtn = h('button', { class: 'hint-btn', onclick: () => ((tools.flip = !tools.flip), bus.emit('tool')) }, '↔ Flip');
  const doneBtn = h('button', { class: 'hint-btn done', onclick: () => setTool('hand') }, '✓ Done');
  const hint = h('div', { class: 'mode-hint', style: { display: 'none' } }, hintText, flipBtn, doneBtn);

  // --- zoom ---
  const zoomBox = h(
    'div',
    { class: 'zoom' },
    h('button', { class: 'round-btn', onclick: () => zoom(1.2), 'aria-label': 'Zoom in' }, '+'),
    h('button', { class: 'round-btn', onclick: () => zoom(1 / 1.2), 'aria-label': 'Zoom out' }, '−'),
  );

  // --- visit banner ---
  const visitWho = h('div', { class: 'who' });
  const visitSub = h('div', { class: 'sub' });
  const giftBtn = h('button', { class: 'btn pink' }, '🎁 Gift');
  const banner = h(
    'div',
    { class: 'visit-banner', style: { display: 'none' } },
    h('div', null, visitWho, visitSub),
    giftBtn,
    h('button', { class: 'btn green', onclick: goHome }, '🏠 Go home'),
  );
  giftBtn.addEventListener('click', () => {
    if (store.visit) openGiftPicker(store.visit.owner.username);
  });

  // --- phone layout ---
  // A six-slot dock: the everyday tools stay out and the rest wait in a tray
  // behind "More". The busiest corner buttons stay on screen and the rest
  // live in a Farm Menu sheet.
  const toolOrder = [...toolbar.children] as HTMLElement[];
  const DOCK = new Set(['hand', 'plow', 'seed', 'water', 'shop']);
  const trayTools = [...toolButtons].filter(([id]) => !DOCK.has(id)).map(([, b]) => b);
  const moreBadge = h('span', { class: 'badge', style: { display: 'none' } });
  const moreTools = h('button', { class: 'tool more-tools', 'aria-label': 'More tools' }, h('span', { class: 'em' }, uiIcon('more_tools', '')), 'More', moreBadge);
  const tray = h('div', { class: 'tool-tray' });
  const closeTray = () => {
    tray.classList.remove('open');
    moreTools.classList.remove('open');
  };
  moreTools.addEventListener('click', () => {
    const open = !tray.classList.contains('open');
    tray.classList.toggle('open', open);
    moreTools.classList.toggle('open', open);
  });
  tray.addEventListener('click', (e) => {
    if ((e.target as HTMLElement).closest('button')) closeTray();
  });

  const cornerOrder = [...corner.children] as HTMLElement[];
  const ON_SCREEN = new Set<HTMLElement>([quests.btn, orders.btn, barn.btn]);
  const drawerGrid = h('div', { class: 'drawer-grid' });
  const drawerBack = h(
    'div',
    { class: 'drawer-back' },
    h('div', { class: 'drawer' }, h('div', { class: 'drawer-handle' }), h('div', { class: 'drawer-title' }, 'Farm Menu'), drawerGrid, installRow()),
  );
  const closeDrawer = () => drawerBack.classList.remove('open');
  const menu = roundBtn('menu', '', 'Menu', () => drawerBack.classList.add('open'));
  menu.btn.classList.add('menu-btn');
  drawerBack.addEventListener('click', (e) => {
    const t = e.target as HTMLElement;
    if (t === drawerBack || t.closest('button')) closeDrawer();
  });
  document.addEventListener('pointerdown', (e) => {
    const t = e.target as Node;
    if (tray.classList.contains('open') && !tray.contains(t) && !moreTools.contains(t)) closeTray();
  });

  ui.append(hud, corner, toolbar, tray, hint, zoomBox, banner, drawerBack);
  // A tap shouldn't leave a keyboard focus ring behind once Esc is pressed.
  for (const el of [corner, toolbar, zoomBox])
    el.addEventListener('pointerup', (e) => (e.target as HTMLElement).closest('button')?.blur());

  const setBadge = (badge: HTMLElement, n: number) => {
    badge.style.display = n > 0 ? 'grid' : 'none';
    badge.textContent = n > 9 ? '9+' : String(n);
  };

  const render = () => {
    const st = store.state;
    const lo = xpForLevel(st.level);
    const hi = xpForLevel(st.level + 1);
    levelNum.textContent = String(st.level);
    farmName.textContent = st.name;
    xpFill.style.width = `${Math.min(100, ((st.xp - lo) / Math.max(1, hi - lo)) * 100)}%`;
    xpText.textContent = `${fmtNum(st.xp - lo)} / ${fmtNum(hi - lo)} XP`;
    countTo(coins, st.coins);
    const live = new Set(activeFeatures(store.now()).map((f) => f.currency));
    for (const [cur, c] of currencyPills) {
      const n = st.inventory[cur] ?? 0;
      c.count.textContent = fmtNum(n);
      c.pill.style.display = live.has(cur) ? 'flex' : 'none';
    }
    const c = farmCharm(st);
    countTo(charm, c);
    const s = charmStars(c);
    stars.replaceChildren('★'.repeat(s), h('span', { style: { opacity: '0.3' } }, '★'.repeat(5 - s)));

    setBadge(quests.badge, claimableQuests());
    quests.btn.classList.toggle('pulse', claimableQuests() > 0);
    setBadge(neighbors.badge, socialBadge());
    setBadge(daily.badge, dailyAvailable() ? 1 : 0);
    setBadge(barn.badge, st.inventory.mystery_gift ?? 0);
    setBadge(orders.badge, readyOrders());
    setBadge(catalog.badge, claimableRibbons() + catalogTabBadges());
    for (const b of extraCorner) {
      setBadge(b.badge, b.def.badge?.() ?? 0);
      b.btn.classList.toggle('pulse', !!b.def.pulse?.());
      b.btn.style.display = store.visit && b.def.hideWhileVisiting ? 'none' : '';
    }
    for (const def of HUD_BUTTONS.filter((x) => x.where === 'toolbar')) {
      const btn = toolButtons.get(`feature:${def.id}`);
      if (!btn) continue;
      let b = btn.querySelector('.badge') as HTMLElement | null;
      if (!b) btn.append((b = h('span', { class: 'badge' })));
      setBadge(b, def.badge?.() ?? 0);
      btn.classList.toggle('pulse', !!def.pulse?.());
      btn.classList.toggle('active', !!def.active?.());
    }
    const cookBtn = toolButtons.get('cook');
    if (cookBtn) {
      let b = cookBtn.querySelector('.badge') as HTMLElement | null;
      if (!b) {
        b = h('span', { class: 'badge' });
        cookBtn.style.position = 'relative';
        cookBtn.append(b);
      }
      setBadge(b, readyDishes());
    }

    const seed = CROPS[tools.seed];
    seedImg.src = iconURL(seed?.id ?? 'strawberry');
    for (const [id, btn] of toolButtons) if (!id.startsWith('feature:')) btn.classList.toggle('active', id === tools.tool);
    const lvl = waterLevel(st, store.now());
    waterCount.textContent = `${lvl}`;
    waterCount.classList.toggle('empty', lvl === 0);

    const visiting = store.visit;
    toolbar.style.display = visiting ? 'none' : 'flex';
    banner.style.display = visiting ? 'flex' : 'none';
    hint.style.display = 'none';
    if (visiting) {
      visitWho.textContent = `Visiting ${visiting.state.name}`;
      const helps = `Helps left today: ${visiting.helpsLeft}/5`;
      const shared = visiting.sharedAt === undefined ? '' : `shared ${timeAgo(visiting.sharedAt, store.now())}`;
      // A farm from a link on the server build is just for looking: there's no one there to help.
      const parts = visiting.sharedAt === undefined ? [helps] : LOCAL ? [helps, shared] : [shared];
      visitSub.textContent = [`${visiting.owner.username.replace('_', ' ')}`, `Lv ${visiting.state.level}`, ...parts].join(' · ');
      giftBtn.style.display = visiting.sharedAt === undefined ? '' : 'none';
      giftBtn.disabled = visiting.giftSent;
      giftBtn.textContent = visiting.giftSent ? '🎁 Gift sent' : '🎁 Gift';
    } else {
      let text = MODE_HINTS.map((f) => f()).find(Boolean) ?? '';
      if (text) {
        /* a feature's tool */
      } else if (tools.tool === 'seed') text = `🌱 Planting ${seed?.name ?? ''} · drag to plant many · Esc to stop`;
      else if (tools.tool === 'plow') text = '⛏️ Plowing · drag to plow many · Esc to stop';
      else if (tools.tool === 'water') {
        const lvl = waterLevel(st, store.now());
        text = lvl ? `💧 Watering · ${lvl}/${CAN_SIZE} in your can · drag over growing crops · Esc to stop` : '💧 Your can is empty · tap a Wishing Well or Water Pump, or wait for it to trickle back';
      }
      else if (tools.tool === 'place') text = '📍 Placing · R to flip · right-click or Esc to stop';
      else if (tools.tool === 'move') text = tools.moving ? '🔀 Click a free spot to drop it · R to flip' : '🔀 Click something to move';
      else if (tools.tool === 'store') text = '📦 Click a decoration to store it';
      else if (tools.tool === 'sell') text = '💰 Click something to sell it';
      else {
        const n = needsAttention(st, store.now());
        if (n) text = `✨ ${n} thing${n === 1 ? '' : 's'} ready to collect`;
      }
      if (text) {
        const touch = isTouch();
        hintText.textContent = forFingers(text);
        // Fingers have no Esc or R key: give them buttons instead.
        const working = tools.tool !== 'hand';
        flipBtn.style.display = touch && (tools.tool === 'place' || (tools.tool === 'move' && tools.moving)) ? '' : 'none';
        doneBtn.style.display = touch && working ? '' : 'none';
        hint.classList.toggle('has-btns', touch && working);
        hint.style.display = 'flex';
      }
    }
  };

  // The phone's dock and menu collect the badges of what they hide.
  const sumBadges = (els: Iterable<Element>) => {
    let n = 0;
    let pulse = false;
    for (const el of els) {
      if ((el as HTMLElement).style.display === 'none' || el.classList.contains('locked-out')) continue;
      const b = el.querySelector('.badge') as HTMLElement | null;
      if (b && b.style.display !== 'none') n += b.textContent === '9+' ? 10 : Number(b.textContent) || 0;
      pulse ||= el.classList.contains('pulse');
    }
    return { n, pulse };
  };
  const renderPhone = () => {
    if (layout() !== 'phone') return;
    const m = sumBadges(drawerGrid.children);
    setBadge(menu.badge, m.n);
    menu.btn.classList.toggle('pulse', m.pulse);
    const t = sumBadges(tray.children);
    setBadge(moreBadge, t.n);
    moreTools.classList.toggle('active', trayTools.some((b) => b.classList.contains('active')));
  };

  const applyLayout = (l: Layout) => {
    closeTray();
    closeDrawer();
    const phone = l === 'phone';
    for (const b of toolOrder) toolbar.append(b);
    for (const b of cornerOrder) corner.append(b);
    moreTools.remove();
    menu.btn.remove();
    if (phone) {
      for (const b of trayTools) tray.append(b);
      toolbar.append(moreTools);
      for (const b of cornerOrder) if (!ON_SCREEN.has(b)) drawerGrid.append(b);
      corner.append(menu.btn);
    }
    render();
  };

  // A new farm starts simple: buttons for side activities wait for the level
  // their first quest arrives at, then appear with a gentle pulse.
  const UNLOCK_AT: [HTMLElement | undefined, number][] = [
    [toolButtons.get('move'), 2],
    [toolButtons.get('store'), 2],
    [toolButtons.get('sell'), 2],
    [toolButtons.get('cook'), 2],
    [orders.btn, 2],
    [neighbors.btn, 2],
    [catalog.btn, 3],
    ...extraCorner.map((b): [HTMLElement, number] => [b.btn, FEATURE_UNLOCK[b.def.id] ?? 1]),
    ...HUD_BUTTONS.filter((b) => b.where === 'toolbar').map((b): [HTMLElement | undefined, number] => [toolButtons.get(`feature:${b.id}`), FEATURE_UNLOCK[b.id] ?? 1]),
  ];
  let unlockedSoFar: Set<HTMLElement> | null = null;
  const applyUnlocks = () => {
    const level = store.state.level;
    const now = new Set<HTMLElement>();
    for (const [el, at] of UNLOCK_AT) {
      if (!el) continue;
      const open = level >= at;
      el.classList.toggle('locked-out', !open);
      if (!open) continue;
      now.add(el);
      // Only pulse buttons that appear while you play, not on every page load.
      if (unlockedSoFar && !unlockedSoFar.has(el)) {
        el.classList.add('just-unlocked');
        el.addEventListener('click', () => el.classList.remove('just-unlocked'), { once: true });
      }
    }
    unlockedSoFar = now;
    moreTools.classList.toggle('locked-out', !trayTools.some((b) => !b.classList.contains('locked-out')));
  };
  applyUnlocks();
  store.onChange(applyUnlocks);

  store.onChange(render);
  store.onChange(renderPhone);
  bus.on('tool', render);
  bus.on('tool', renderPhone);
  setInterval(renderPhone, 1000);
  onLayout(applyLayout);
  applyLayout(layout());
  setInterval(render, 1000);
  render();
}
