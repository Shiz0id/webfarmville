import Phaser from 'phaser';
import { EVENTS, QUESTS, RIBBONS, RIBBON_COLORS } from '@farm/shared';
import './style.css';
import { ApiError, api, getToken, setToken, type MePayload } from './api';
import { buildArt } from './art';
import { bus } from './bus';
import { FarmScene } from './scenes/FarmScene';
import { Store } from './store';
import { featuredEvent } from './events';
import { setMusicStyle, sfx, unlockAudioOnGesture } from './sfx';
import { setTool } from './tools';
import { showAuth } from './ui/auth';
import { closeAllModals, setupTooltip, toast } from './ui/dom';
import { mountHud } from './ui/hud';
import { dailyAvailable, initPanels, showUnwrap, openBuilding, openFarmhouse, openQuests, openSeedPicker, showLevelUp } from './ui/panels';
import { villagerSay } from './ui/villager';

async function signIn(): Promise<MePayload> {
  if (getToken()) {
    try {
      return await api.me();
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) setToken(null);
      else {
        document.querySelector('.boot-sub')!.textContent = (err as Error).message;
        throw err;
      }
    }
  }
  document.getElementById('boot')?.remove();
  return showAuth();
}

async function start(): Promise<void> {
  // Paint all the art while we talk to the server.
  await new Promise((r) => setTimeout(r, 0));
  buildArt();
  const me = await signIn();
  document.getElementById('boot')?.remove();

  const store = new Store(me);
  const feature = featuredEvent(store.now(), store.allEvents);
  setMusicStyle(feature?.music ?? 'default');
  if (feature) {
    document.body.classList.add('festive', `event-${feature.event}`);
    document.body.style.setProperty('--event', EVENTS[feature.event].color);
  }
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    backgroundColor: '#6f9e4c',
    scale: { mode: Phaser.Scale.RESIZE, width: window.innerWidth, height: window.innerHeight },
    render: { antialias: true, roundPixels: false },
    input: { activePointers: 3 },
    scene: [],
  });
  game.scene.add('farm', FarmScene, true, { store });
  const scene = () => game.scene.getScene('farm') as FarmScene;

  const recenter = () => scene().centerCamera();
  initPanels(store, recenter);
  setupTooltip();
  mountHud({
    store,
    goHome: () => {
      store.endVisit();
      setTool('hand');
      recenter();
    },
    zoom: (f) => scene().zoomBy(f),
  });

  store.onError((msg) => {
    toast(msg, 'error');
    sfx.error();
  });
  unlockAudioOnGesture();
  store.onAction((a) => {
    switch (a.type) {
      case 'plow':
        return sfx.plow();
      case 'plant':
        return sfx.plant();
      case 'harvest':
      case 'collect':
      case 'collectCrafts':
      case 'clearPlot':
        return sfx.pop();
      case 'buy':
      case 'placeStored':
      case 'move':
      case 'store':
        return sfx.place();
      case 'sellItem':
      case 'sellObject':
        return sfx.coin();
      case 'claimQuest':
      case 'claimDaily':
      case 'expand':
        return sfx.quest();
      default:
        return sfx.click();
    }
  });
  store.onEvents((events) => {
    for (const e of events) {
      if (e.type === 'mystery') {
        toast('🎁 You found a Mystery Gift! Open it from your barn.', 'good');
        setTimeout(() => sfx.quest(), 100);
      } else if (e.type === 'ribbon') {
        const r = RIBBONS[e.ribbon];
        toast(`🎀 You won the ${RIBBON_COLORS[e.tier - 1]} ${r?.name ?? ''} ribbon!`, 'good');
        sfx.levelUp();
      } else if (e.type === 'unwrap') {
        sfx.levelUp();
        showUnwrap(e.item);
      }
    }
    if (events.some((e) => e.type === 'levelUp')) setTimeout(() => sfx.levelUp(), 150);
    else if (events.some((e) => e.type === 'questReady')) setTimeout(() => sfx.quest(), 250);
  });
  document.getElementById('ui')!.addEventListener('click', (e) => {
    if ((e.target as HTMLElement).closest('button, .card, .chip')) sfx.click();
  });
  bus.on('toast', (msg, kind) => toast(msg, kind));
  bus.on('openBuilding', (id) => openBuilding(id));
  bus.on('openFarmhouse', () => openFarmhouse());
  bus.on('snapshot', () => {
    // A keepsake postcard of the farm, saved as a PNG.
    game.renderer.snapshot((img) => {
      const src = (img as HTMLImageElement).src;
      const a = document.createElement('a');
      a.href = src;
      a.download = `${store.state.name.replace(/[^a-z0-9]+/gi, '-')}-postcard.png`;
      a.click();
      toast('📸 Postcard saved!', 'good');
    });
  });
  bus.on('openSeedPicker', (id) => openSeedPicker(id));
  bus.on('levelUp', (level) => {
    closeAllModals();
    showLevelUp(level);
  });
  bus.on('questReady', (id) => {
    const q = QUESTS[id];
    if (!q) return;
    villagerSay(q.giver, `You finished “${q.title}”! Come collect your reward, dear.`, { label: 'Claim reward', onClick: openQuests });
  });

  void store.refreshSocial();
  if (import.meta.env.DEV || location.search.includes('debug')) Object.assign(window, { __farm: { store, scene } });
  const introSeen = feature ? `farm.intro.${feature.event}.${new Date(store.now()).getUTCFullYear()}` : '';
  let seen = true;
  try {
    seen = !!introSeen && localStorage.getItem(introSeen) === '1';
  } catch {
    /* ignore */
  }
  if (feature && !seen && store.state.stats.harvest !== undefined) {
    try {
      localStorage.setItem(introSeen, '1');
    } catch {
      /* ignore */
    }
    setTimeout(() => villagerSay(feature.intro.giver, feature.intro.text, { label: 'Event quests ✨', onClick: openQuests }), 1100);
  } else if (store.state.stats.harvest === undefined) {
    setTimeout(
      () =>
        villagerSay(
          'Mayor Maple',
          `Hoo-hoo! Welcome to Meadowbrook, ${store.username}! Your strawberries are almost ripe. Tap them when they sparkle, then check your quests.`,
        ),
      900,
    );
  } else if (dailyAvailable()) {
    setTimeout(
      () => villagerSay('Penny', 'Good morning, neighbor! Your daily bonus is waiting at the farmhouse.', { label: 'Open farmhouse', onClick: openFarmhouse }),
      1200,
    );
  }
}

start().catch((err) => {
  console.error(err);
  const sub = document.querySelector('.boot-sub');
  if (sub) sub.textContent = `Oh no! ${(err as Error).message}. Refresh to try again.`;
});
