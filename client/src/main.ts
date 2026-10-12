import Phaser from 'phaser';
import { QUESTS } from '@farm/shared';
import './style.css';
import { ApiError, api, getToken, setToken, type MePayload } from './api';
import { buildArt } from './art';
import { bus } from './bus';
import { FarmScene } from './scenes/FarmScene';
import { Store } from './store';
import { setTool } from './tools';
import { showAuth } from './ui/auth';
import { closeAllModals, setupTooltip, toast } from './ui/dom';
import { mountHud } from './ui/hud';
import { initPanels, openBuilding, openFarmhouse, openSeedPicker, showLevelUp } from './ui/panels';

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

  store.onError((msg) => toast(msg, 'error'));
  bus.on('toast', (msg, kind) => toast(msg, kind));
  bus.on('openBuilding', (id) => openBuilding(id));
  bus.on('openFarmhouse', () => openFarmhouse());
  bus.on('openSeedPicker', (id) => openSeedPicker(id));
  bus.on('levelUp', (level) => {
    closeAllModals();
    showLevelUp(level);
  });
  bus.on('questReady', (id) => toast(`📜 Quest ready to claim: ${QUESTS[id]?.title ?? id}`, 'good'));

  void store.refreshSocial();
  if (import.meta.env.DEV || location.search.includes('debug')) Object.assign(window, { __farm: { store, scene } });
  if (store.state.stats.harvest === undefined) {
    setTimeout(() => toast('Welcome! Your strawberries are almost ripe. Click them when they sparkle 🍓', 'good'), 800);
  }
}

start().catch((err) => {
  console.error(err);
  const sub = document.querySelector('.boot-sub');
  if (sub) sub.textContent = `Oh no! ${(err as Error).message}. Refresh to try again.`;
});
