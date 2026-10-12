// Nature: fishing at Meadow Pond, catching critters that wander the farm, and
// the Nature Journal that remembers every species you've found.

import Phaser from 'phaser';
import {
  CRITTERS,
  CRITTER_LIST,
  JOURNAL_TIERS,
  RARITY_NAMES,
  claimableJournal,
  dailyLimit,
  discovered,
  nextRandom,
  previewCatch,
  seasonOf,
  triesLeft,
  type CritterDef,
  type GameEvent,
  type NatureKind,
} from '@farm/shared';
import { RES, artURL, hasArt, iconURL, texture } from '../art';
import { localHour } from '../scenes/ambience';
import { sfx } from '../sfx';
import { tools } from '../tools';
import { confetti, openModal, toast } from '../ui/dom';
import { portrait } from '../ui/villager';
import { h } from '../util';
import type { Store } from '../store';
import type { FarmScene } from '../scenes/FarmScene';
import { addHudButton, type FeatureContext } from './registry';

let S: Store;

const ctxNow = () => ({ now: S.now(), allEvents: S.allEvents });
const preview = (kind: NatureKind): CritterDef => previewCatch(S.state, kind, localHour(), ctxNow(), { nextRandom });
const stars = (r: number) => '★'.repeat(r) + '☆'.repeat(5 - r);
const art = (key: string, fallback: string) => (hasArt(key) ? artURL(key) : fallback);

export function init(ctx: FeatureContext): void {
  S = ctx.store;
  addHudButton({
    id: 'fish',
    em: '🎣',
    label: 'Fish',
    where: 'toolbar',
    onClick: openPond,
  });
  addHudButton({
    id: 'journal',
    em: '📗',
    label: 'Journal',
    where: 'corner',
    onClick: () => openJournal(),
    badge: () => claimableJournal(S.state, 'fish') + claimableJournal(S.state, 'bug'),
    hideWhileVisiting: true,
  });
  S.onEvents((events) => {
    for (const e of events) if (e.type === 'journal') showKeepsake(e.deco);
  });
  ctx.onScene((scene) => new CritterSpawner(scene));
}

// ---------------------------------------------------------------------------
// Catch reveal

function waitForResult(kind: NatureKind): Promise<GameEvent | null> {
  return new Promise((resolve) => {
    let done = false;
    const off = S.onEvents((events) => {
      const e = events.find((x) => (x.type === 'caught' || x.type === 'escaped') && x.kind === kind);
      if (!e || done) return;
      done = true;
      off();
      resolve(e);
    });
    setTimeout(() => {
      if (done) return;
      done = true;
      off();
      resolve(null);
    }, 1500);
  });
}

function showCatch(e: Extract<GameEvent, { type: 'caught' }>, onDone?: () => void): void {
  const def = CRITTERS[e.what];
  sfx.catch();
  if (e.first || def.rarity >= 4) confetti(def.rarity >= 4 ? 90 : 40);
  const m = openModal(e.first ? 'New species!' : e.kind === 'fish' ? 'You caught a fish!' : 'You caught a critter!', {
    narrow: true,
    onClose: onDone,
  });
  m.body.append(
    h(
      'div',
      { class: 'catch-card' },
      h('div', { class: `catch-burst r${def.rarity}` }, h('img', { src: iconURL(def.id), class: 'catch-img' })),
      h('div', { class: 'catch-name' }, def.name, e.first ? h('span', { class: 'new-tag' }, 'NEW!') : null),
      h('div', { class: `catch-rarity r${def.rarity}` }, `${stars(def.rarity)} ${RARITY_NAMES[def.rarity]}`),
      h('div', { class: 'catch-size' }, `${e.size} cm`, e.record ? h('span', { class: 'record-tag' }, '🏆 Personal best!') : null),
      h('div', { class: 'catch-note' }, `“${def.note}”`),
      h('div', { class: 'catch-meta' }, `Sells for ${def.sell} coins · +${def.xp + (e.first ? 10 : 0)} XP`),
      h('button', { class: 'btn green', onclick: () => m.close() }, 'Yay! ✨'),
    ),
  );
}

// ---------------------------------------------------------------------------
// Fishing at Meadow Pond

interface Pond {
  root: HTMLElement;
  water: HTMLElement;
  bobber: HTMLElement;
  shadow: HTMLElement;
  info: HTMLElement;
  castBtn: HTMLButtonElement;
  meter: HTMLElement;
  bubble: HTMLElement;
  closed: boolean;
}

let pond: Pond | null = null;

const POND_TIPS = [
  'Wait for the bobber to plunge all the way under, then click!',
  "Little nibbles aren't bites. Patience, dear!",
  'Hold the mouse (or space) to raise the green bar. Keep the fish inside it!',
  'Some fish only come out at night. The pond is lovely under the moon.',
  'Every season brings different fish to Meadow Pond.',
  'Put a Fishing Dock or Duck Pond on your farm for extra casts each day.',
  'Festivals bring very special visitors to the pond...',
];

function openPond(): void {
  if (pond || S.visit) return;
  const water = h('div', { class: 'pond-water' });
  const bobber = h('img', { class: 'pond-bobber', src: art('fishing:bobber', iconURL('xp')) });
  const shadow = h('img', { class: 'pond-shadow', src: art('fishing:shadow', iconURL('bluegill')) });
  const info = h('div', { class: 'pond-info' });
  const bubble = h('div', { class: 'k-bubble' }, POND_TIPS[Math.floor(Math.random() * POND_TIPS.length)]);
  const meter = h('div', { class: 'pond-meter', style: { display: 'none' } });
  const castBtn = h('button', { class: 'btn green big', onclick: () => void cast() }, '🎣 Cast!') as HTMLButtonElement;
  const close = () => {
    if (!pond) return;
    pond.closed = true;
    pond.root.remove();
    document.body.classList.remove('pond-open');
    pond = null;
    document.removeEventListener('keydown', onKey);
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && !document.querySelector('.modal-back')) close();
  };
  document.addEventListener('keydown', onKey);
  const decor: HTMLElement[] = [];
  const place = (key: string, cls: string) => hasArt(key) && decor.push(h('img', { class: cls, src: artURL(key) }));
  place('fishing:reeds', 'pond-reeds a');
  place('fishing:reeds', 'pond-reeds b');
  place('fishing:lily_pad', 'pond-lily a');
  place('fishing:lily_pad', 'pond-lily b');
  place('fishing:lily_pad', 'pond-lily c');
  place('fishing:dock', 'pond-dock');
  water.append(...decor, shadow, bobber, h('div', { class: 'pond-ripples' }));
  const night = localHour() >= 19 || localHour() < 6;
  const root = h(
    'div',
    { class: `pond ${seasonOf(S.now())}${night ? ' night' : ''}` },
    h(
      'div',
      { class: 'pond-top' },
      h('img', { class: 'k-dish', src: art('icon:rod', iconURL('bluegill')) }),
      h('div', { class: 'grow' }, h('div', { class: 'k-dishname' }, 'Meadow Pond'), info),
      h('button', { class: 'btn', onclick: () => openJournal('fish') }, '📗 Journal'),
      h('button', { class: 'close', onclick: close, 'aria-label': 'Close' }, '✕'),
    ),
    water,
    meter,
    h('div', { class: 'pond-bottom' }, castBtn),
    h('div', { class: 'k-mama' }, portrait('Grandma Fern', 72), bubble),
  );
  document.body.append(root);
  document.body.classList.add('pond-open');
  pond = { root, water, bobber, shadow, info, castBtn, meter, bubble, closed: false };
  renderPondInfo();
}

function renderPondInfo(): void {
  if (!pond) return;
  const left = triesLeft(S.state, 'fish', S.now());
  const season = seasonOf(S.now());
  const night = localHour() >= 19 || localHour() < 6;
  pond.info.textContent = `${left} of ${dailyLimit(S.state, 'fish')} casts left today · ${season[0].toUpperCase()}${season.slice(1)} ${night ? 'night 🌙' : 'day ☀️'} · ${discovered(S.state, 'fish')} kinds of fish found`;
  pond.castBtn.disabled = left <= 0;
  pond.castBtn.textContent = left > 0 ? '🎣 Cast!' : '😴 The fish are resting';
}

function grannySays(text: string): void {
  if (!pond) return;
  pond.bubble.textContent = text;
  pond.bubble.classList.remove('pop');
  void pond.bubble.offsetWidth;
  pond.bubble.classList.add('pop');
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Resolve on the next click/space inside the pond, or after `ms` (false). */
function waitClick(p: Pond, ms: number): Promise<boolean> {
  return new Promise((resolve) => {
    let done = false;
    const finish = (v: boolean) => {
      if (done) return;
      done = true;
      p.water.removeEventListener('pointerdown', click);
      document.removeEventListener('keydown', key);
      resolve(v);
    };
    const click = () => finish(true);
    const key = (e: KeyboardEvent) => e.code === 'Space' && (e.preventDefault(), finish(true));
    p.water.addEventListener('pointerdown', click);
    document.addEventListener('keydown', key);
    setTimeout(() => finish(false), ms);
  });
}

async function cast(): Promise<void> {
  const p = pond;
  if (!p || triesLeft(S.state, 'fish', S.now()) <= 0) return;
  p.castBtn.disabled = true;
  const def = preview('fish');
  // The bobber lands somewhere on the water.
  const bx = 30 + Math.random() * 40;
  const by = 35 + Math.random() * 30;
  p.bobber.style.left = `${bx}%`;
  p.bobber.style.top = `${by}%`;
  p.bobber.className = 'pond-bobber flying';
  sfx.swoosh();
  await sleep(550);
  p.bobber.className = 'pond-bobber floating';
  sfx.plop();
  // A shadow (bigger for bigger fish) drifts toward the bobber.
  const scale = Math.max(0.45, Math.min(1.6, def.size / 45));
  p.shadow.style.setProperty('--s', String(scale));
  p.shadow.style.left = `${bx + (Math.random() < 0.5 ? -25 : 25)}%`;
  p.shadow.style.top = `${by + 18}%`;
  p.shadow.className = 'pond-shadow show';
  await sleep(300);
  p.shadow.style.left = `${bx}%`;
  p.shadow.style.top = `${by + 4}%`;
  grannySays('Shh... something is looking at your bait...');

  // A few nibbles, then the real bite. Clicking early scares the fish.
  const nibbles = Math.floor(Math.random() * 3);
  for (let i = 0; i <= nibbles; i++) {
    const early = await waitClick(p, 900 + Math.random() * 1600);
    if (p.closed) return;
    if (early) return finish(p, 0, 'Too soon! You scared it away. Wait for the big plunge!');
    if (i < nibbles) {
      p.bobber.className = 'pond-bobber nibble';
      sfx.plop();
      await sleep(350);
      p.bobber.className = 'pond-bobber floating';
    }
  }
  p.bobber.className = 'pond-bobber bite';
  sfx.splash();
  const bang = h('div', { class: 'pond-bang', style: { left: `${bx}%`, top: `${by - 12}%` } }, '!');
  p.water.append(bang);
  const hooked = await waitClick(p, 900 + Math.max(0, 4 - def.rarity) * 120);
  bang.remove();
  if (p.closed) return;
  if (!hooked) return finish(p, 0, 'Oh! It stole the bait. Click as soon as the bobber plunges!');
  grannySays('Hooked! Hold to reel, keep it in the green!');
  const score = await reel(p, def);
  if (p.closed) return;
  return finish(p, score, score === 0 ? 'Aww, it slipped off the hook. You\'ll get the next one!' : '');
}

async function finish(p: Pond, score: number, line: string): Promise<void> {
  p.shadow.className = 'pond-shadow';
  p.bobber.className = 'pond-bobber';
  const result = waitForResult('fish');
  S.dispatch({ type: 'fish', score, hour: localHour() });
  const e = await result;
  if (line) grannySays(line);
  if (e?.type === 'caught') showCatch(e, renderPondInfo);
  else if (e?.type === 'escaped' && score > 0) grannySays(`A ${CRITTERS[e.what]?.name ?? 'fish'}! It wriggled free at the last second... so close!`);
  renderPondInfo();
}

/** The reeling mini-game. Returns a score from 0 (lost it) to 100. */
function reel(p: Pond, def: CritterDef): Promise<number> {
  return new Promise((resolve) => {
    const fishEl = h('img', { class: 'reel-fish', src: iconURL(def.id) });
    const bar = h('div', { class: 'reel-bar' });
    const fill = h('div', { class: 'reel-fill' });
    p.meter.replaceChildren(h('div', { class: 'reel-track' }, bar, fishEl), h('div', { class: 'reel-progress' }, fill));
    p.meter.style.display = 'flex';
    const H = 260;
    const barH = 78 - def.rarity * 6;
    bar.style.height = `${barH}px`;
    let barY = H - barH;
    let barV = 0;
    let fishY = H / 2;
    let fishTarget = H / 2;
    let progress = 30;
    let inside = 0;
    let frames = 0;
    let holding = false;
    const speed = 0.6 + def.rarity * 0.35;
    const down = (e: Event) => {
      if (e instanceof KeyboardEvent) {
        if (e.code !== 'Space') return;
        e.preventDefault();
      }
      holding = true;
    };
    const up = (e: Event) => {
      if (e instanceof KeyboardEvent && e.code !== 'Space') return;
      holding = false;
    };
    window.addEventListener('pointerdown', down);
    window.addEventListener('pointerup', up);
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    let last = performance.now();
    const tick = (t: number) => {
      const dt = Math.min(50, t - last) / 16.7;
      last = t;
      if (p.closed) return cleanup(0);
      // The fish darts around; rarer fish are livelier.
      if (Math.random() < 0.025 * speed * dt) fishTarget = 12 + Math.random() * (H - 24);
      fishY += (fishTarget - fishY) * 0.04 * speed * dt;
      barV += (holding ? -0.55 : 0.4) * dt;
      barV *= 0.92;
      barY = Math.max(0, Math.min(H - barH, barY + barV * dt));
      if ((barY === 0 || barY === H - barH) && Math.abs(barV) > 1) barV *= -0.3;
      const ok = fishY > barY && fishY < barY + barH;
      progress += (ok ? 0.6 : -0.32) * dt;
      frames++;
      if (ok) {
        inside++;
        sfx.reel();
      }
      bar.style.transform = `translateY(${barY}px)`;
      bar.classList.toggle('on', ok);
      fishEl.style.transform = `translateY(${fishY - 16}px)`;
      fill.style.height = `${Math.max(0, Math.min(100, progress))}%`;
      if (progress >= 100) return cleanup(Math.round(50 + (inside / Math.max(1, frames)) * 50));
      if (progress <= 0) return cleanup(0);
      requestAnimationFrame(tick);
    };
    const cleanup = (score: number) => {
      window.removeEventListener('pointerdown', down);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      p.meter.style.display = 'none';
      resolve(score);
    };
    requestAnimationFrame(tick);
  });
}

// ---------------------------------------------------------------------------
// Critters wandering the farm

class CritterSpawner {
  private img?: Phaser.GameObjects.Image;
  private busy = false;

  constructor(private scene: FarmScene) {
    scene.time.addEvent({ delay: 6000, loop: true, callback: () => this.tick() });
    scene.time.delayedCall(2500, () => this.tick());
  }

  private tick(): void {
    if (this.busy) return;
    const hidden = !!S.visit || triesLeft(S.state, 'bug', S.now()) <= 0;
    if (this.img && (hidden || !this.img.active)) this.despawn();
    if (hidden || this.img) return;
    if (Math.random() < 0.45) this.spawn();
  }

  private spawn(): void {
    const st = S.state;
    const def = preview('bug');
    const tile = { x: 1 + Math.random() * (st.size - 2), y: 1 + Math.random() * (st.size - 2) };
    const sc = this.scene;
    const pos = sc.tileToWorld(tile.x, tile.y);
    const flier = /butterfly|white|monarch|morpho|moth|dragonfly|firefly|bee/.test(def.id);
    const img = sc.add
      .image(pos.x, pos.y - (flier ? 30 : 4), texture(sc, `icon:${def.id}`))
      .setScale(0.55 / RES)
      .setDepth(sc.depthAt(tile.x, tile.y) + 0.5)
      .setAlpha(0)
      .setInteractive({ useHandCursor: true });
    this.img = img;
    sc.tweens.add({ targets: img, alpha: 1, duration: 600 });
    if (flier) {
      // Flutter in loops around the spawn point.
      sc.tweens.add({ targets: img, y: img.y - 10, duration: 500 + Math.random() * 300, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
      sc.tweens.add({ targets: img, x: img.x + (Math.random() < 0.5 ? -40 : 40), duration: 3000, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
      sc.tweens.add({ targets: img, scaleY: (0.55 / RES) * 0.75, duration: 140, yoyo: true, repeat: -1 });
    } else {
      sc.tweens.add({ targets: img, x: img.x + (Math.random() < 0.5 ? -24 : 24), y: img.y + 6, duration: 5000, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
      sc.tweens.add({ targets: img, angle: { from: -6, to: 6 }, duration: 300, yoyo: true, repeat: -1 });
    }
    if (def.rarity >= 3) {
      const glow = sc.add.image(img.x, img.y, texture(sc, 'fx:sparkle')).setScale(0.5 / RES).setDepth(img.depth + 0.1).setAlpha(0.8);
      sc.tweens.add({ targets: glow, alpha: 0.1, duration: 700, yoyo: true, repeat: -1 });
      img.once('destroy', () => glow.destroy());
      sc.events.on('update', () => glow.active && img.active && glow.setPosition(img.x + 8, img.y - 10));
    }
    img.on('pointerdown', (_p: Phaser.Input.Pointer, _x: number, _y: number, ev: Phaser.Types.Input.EventData) => {
      ev.stopPropagation();
      if (tools.tool !== 'hand') return;
      this.swing();
    });
    // Wander off after a while.
    sc.time.delayedCall(40_000 + Math.random() * 20_000, () => this.img === img && this.despawn());
  }

  private swing(): void {
    const img = this.img;
    if (!img || this.busy) return;
    this.busy = true;
    const sc = this.scene;
    sfx.swoosh();
    const net = sc.add.image(img.x + 26, img.y - 26, texture(sc, 'icon:net')).setScale(0.8 / RES).setDepth(img.depth + 1).setAngle(40);
    sc.tweens.add({
      targets: net,
      angle: -30,
      x: img.x,
      y: img.y - 6,
      duration: 220,
      ease: 'Back.in',
      onComplete: () => {
        sc.tweens.add({ targets: net, alpha: 0, duration: 400, delay: 300, onComplete: () => net.destroy() });
        void this.resolve();
      },
    });
  }

  private async resolve(): Promise<void> {
    const result = waitForResult('bug');
    S.dispatch({ type: 'catchBug', score: 100, hour: localHour() });
    const e = await result;
    const img = this.img;
    if (e?.type === 'caught') {
      img?.destroy();
      this.img = undefined;
      showCatch(e);
    } else if (img) {
      toast(`🍃 The ${CRITTERS[e?.type === 'escaped' ? e.what : '']?.name ?? 'critter'} got away!`, 'info');
      this.scene.tweens.add({ targets: img, y: img.y - 120, alpha: 0, duration: 900, onComplete: () => img.destroy() });
      this.img = undefined;
    }
    this.busy = false;
  }

  private despawn(): void {
    const img = this.img;
    this.img = undefined;
    if (!img) return;
    this.scene.tweens.add({ targets: img, alpha: 0, duration: 500, onComplete: () => img.destroy() });
  }
}

// ---------------------------------------------------------------------------
// The Nature Journal

function openJournal(tab?: NatureKind): void {
  let kind: NatureKind = tab ?? (claimableJournal(S.state, 'bug') && !claimableJournal(S.state, 'fish') ? 'bug' : 'fish');
  const tabs = h('div', { class: 'modal-tabs' });
  let off = () => {};
  const m = openModal('Nature Journal', { tabs, icon: art('icon:journal', iconURL('bluegill')), onClose: () => off() });
  const render = () => {
    tabs.replaceChildren(
      ...(['fish', 'bug'] as const).map((k) =>
        h(
          'button',
          {
            class: `btn small tab${k === kind ? ' active' : ''}`,
            style: { position: 'relative' },
            onclick: () => {
              kind = k;
              render();
            },
          },
          k === 'fish' ? '🐟 Fish' : '🦋 Critters',
          claimableJournal(S.state, k) ? h('span', { class: 'badge' }, '1') : null,
        ),
      ),
    );
    const list = CRITTER_LIST.filter((c) => c.kind === kind);
    const found = discovered(S.state, kind);
    const tiers = JOURNAL_TIERS[kind];
    const claimed = S.state.nature?.claimed[kind] ?? 0;
    const next = tiers[claimed];
    const left = triesLeft(S.state, kind, S.now());
    const header = h(
      'div',
      { class: 'journal-head' },
      h('div', { class: 'grow' }, h('div', { class: 'title' }, `${found} / ${list.length} discovered`), h('div', { class: 'sub' }, kind === 'fish' ? `${left} casts left today at Meadow Pond` : `${left} catches left today. Tap critters on your farm with the hand tool!`)),
      next
        ? h(
            'div',
            { class: 'journal-reward' },
            h('img', { class: 'ico big', src: artURL(`deco:${next.deco}`) }),
            h('div', null, h('div', { class: 'sub' }, `Find ${next.count}: ${next.coins} coins + keepsake`), h('div', { class: 'xpbar' }, h('div', { style: { width: `${Math.min(100, (found / next.count) * 100)}%` } }))),
            h(
              'button',
              { class: 'btn green', disabled: found < next.count, onclick: () => S.dispatch({ type: 'claimJournal', kind }) },
              found >= next.count ? 'Claim! 🎁' : `${found}/${next.count}`,
            ),
          )
        : h('div', { class: 'sub' }, '🏆 Every keepsake collected!'),
    );
    const grid = h('div', { class: 'journal-grid' });
    for (const c of list) {
      const n = S.state.stats[`catch:${c.id}`] ?? 0;
      const best = S.state.nature?.best[c.id];
      const when = `${c.seasons === 'all' ? 'All year' : c.seasons.map((s) => s[0].toUpperCase() + s.slice(1)).join(', ')} · ${c.time === 'any' ? 'any time' : c.time === 'day' ? 'daytime' : 'night'}`;
      grid.append(
        n > 0
          ? h(
              'div',
              { class: `journal-card r${c.rarity}`, title: c.note },
              h('img', { src: iconURL(c.id) }),
              h('div', { class: 'name' }, c.name),
              h('div', { class: 'rar' }, stars(c.rarity)),
              h('div', { class: 'meta' }, `×${n}${best ? ` · best ${best} cm` : ''}`),
              h('div', { class: 'when' }, c.event ? `🎉 ${when}` : when),
            )
          : h(
              'div',
              { class: 'journal-card unknown' },
              h('img', { src: iconURL(c.id), class: 'silhouette' }),
              h('div', { class: 'name' }, '???'),
              h('div', { class: 'when' }, c.event ? '🎉 Festival only' : when),
            ),
      );
    }
    m.body.replaceChildren(header, grid);
  };
  render();
  off = S.onChange(render);
}

function showKeepsake(deco: string): void {
  sfx.levelUp();
  confetti(70);
  toast(`📗 Journal milestone! A keepsake was added to your barn.`, 'good');
  void deco;
}
