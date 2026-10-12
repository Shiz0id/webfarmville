import { CAN_SIZE, CROPS, EVENTS, EVENT_FEATURE_LIST, charmStars, farmCharm, needsAttention, waterLevel, xpForLevel } from '@farm/shared';
import { artURL, hasArt, iconURL } from '../art';
import { bus } from '../bus';
import type { Store } from '../store';
import { setTool, tools, type Tool } from '../tools';
import { activeFeatures } from '../events';
import { audioSettings, setMusic } from '../sfx';
import { openKitchen, readyDishes } from './cooking';
import { fmtNum, h } from '../util';
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

/** A painted UI icon (ui:<key>) when there is one, else the emoji. */
function uiIcon(key: string, em: string): Node {
  return hasArt(`ui:${key}`) ? h('img', { class: 'ui-ico', src: artURL(`ui:${key}`), alt: '' }) : document.createTextNode(em);
}

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
          if (t.hint) bus.emit('toast', t.hint, 'info');
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
  const hint = h('div', { class: 'mode-hint', style: { display: 'none' } });

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

  ui.append(hud, corner, toolbar, hint, zoomBox, banner);
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
    coins.textContent = fmtNum(st.coins);
    const live = new Set(activeFeatures(store.now()).map((f) => f.currency));
    for (const [cur, c] of currencyPills) {
      const n = st.inventory[cur] ?? 0;
      c.count.textContent = fmtNum(n);
      c.pill.style.display = live.has(cur) ? 'flex' : 'none';
    }
    const c = farmCharm(st);
    charm.textContent = fmtNum(c);
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
      visitSub.textContent = `${visiting.owner.username.replace('_', ' ')} · Lv ${visiting.state.level} · Helps left today: ${visiting.helpsLeft}/5`;
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
        hint.textContent = text;
        hint.style.display = 'block';
      }
    }
  };

  store.onChange(render);
  bus.on('tool', render);
  setInterval(render, 1000);
  render();
}
