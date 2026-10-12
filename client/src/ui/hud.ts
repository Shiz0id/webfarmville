import { CROPS, charmStars, farmCharm, needsAttention, xpForLevel } from '@farm/shared';
import { iconURL } from '../art';
import { bus } from '../bus';
import type { Store } from '../store';
import { setTool, tools, type Tool } from '../tools';
import { audioSettings, setMusic } from '../sfx';
import { fmtNum, h } from '../util';
import {
  claimableQuests,
  dailyAvailable,
  openBarn,
  openFarmhouse,
  openGiftPicker,
  openNeighbors,
  openOrders,
  openCatalog,
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

const TOOLS: { id: Tool | 'shop'; label: string; em: string; hint?: string }[] = [
  { id: 'hand', label: 'Hand', em: '✋' },
  { id: 'plow', label: 'Plow', em: '⛏️', hint: 'Click or drag over grass to plow plots (15 coins each)' },
  { id: 'seed', label: 'Seeds', em: '🌱' },
  { id: 'shop', label: 'Market', em: '🛒' },
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
  const hud = h(
    'div',
    { class: 'hud' },
    levelPill,
    coinPill,
    h('div', { class: 'pill', title: 'Farm charm' }, h('img', { class: 'ico', src: iconURL('charm') }), charm, stars),
  );

  // --- top-right buttons ---
  const roundBtn = (em: string, label: string, onclick: () => void) => {
    const badge = h('span', { class: 'badge', style: { display: 'none' } });
    const btn = h('button', { class: 'round-btn', onclick, 'aria-label': label }, em, badge, h('small', null, label));
    return { btn, badge };
  };
  const quests = roundBtn('📜', 'Quests', openQuests);
  const neighbors = roundBtn('🏘️', 'Neighbors', openNeighbors);
  const barn = roundBtn('🧺', 'Barn', openBarn);
  const orders = roundBtn('📋', 'Orders', openOrders);
  const daily = roundBtn('🏡', 'Farm', openFarmhouse);
  const catalog = roundBtn('📖', 'Catalog', openCatalog);
  const music = roundBtn(audioSettings.music ? '🎵' : '🔇', 'Music', () => {
    setMusic(!audioSettings.music);
    music.btn.firstChild!.textContent = audioSettings.music ? '🎵' : '🔇';
  });
  music.btn.classList.add('small-round');
  const corner = h('div', { class: 'corner' }, quests.btn, orders.btn, neighbors.btn, barn.btn, catalog.btn, daily.btn, music.btn);

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
    const em = t.id === 'seed' ? h('span', { class: 'em' }, seedImg) : h('span', { class: 'em' }, t.em);
    const btn = h(
      'button',
      {
        class: `tool${t.id === 'shop' ? ' shop' : ''}`,
        onclick: () => {
          if (t.id === 'shop') return openShop();
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
  }
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

    const seed = CROPS[tools.seed];
    seedImg.src = iconURL(seed?.id ?? 'strawberry');
    for (const [id, btn] of toolButtons) btn.classList.toggle('active', id === tools.tool);

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
      let text = '';
      if (tools.tool === 'seed') text = `🌱 Planting ${seed?.name ?? ''} · drag to plant many · Esc to stop`;
      else if (tools.tool === 'plow') text = '⛏️ Plowing · drag to plow many · Esc to stop';
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
