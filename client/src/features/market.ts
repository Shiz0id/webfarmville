// Farmers' Market Stall on the client: the goods you listed sit on the
// counter, a coin pops up when something sells, and the stall panel lets you
// pick goods, a price and a quantity.

import Phaser from 'phaser';
import {
  ITEMS,
  MAX_LISTING,
  PRICE_TIERS,
  SHOPPERS,
  STALL_SLOTS,
  WEATHER,
  cravingFor,
  hasStall,
  isStall,
  quote,
  soldUnits,
  stallSlots,
  stallCoins,
  stallable,
  weatherAt,
  type PriceTier,
} from '@farm/shared';
import { artURL, hasArt, iconURL, texture } from '../art';
import { bus } from '../bus';
import { sfx } from '../sfx';
import { openModal, toast } from '../ui/dom';
import { openDecor } from '../ui/decor';
import { fmtDuration, fmtNum, h } from '../util';
import type { FarmScene } from '../scenes/FarmScene';
import type { Store } from '../store';
import type { FeatureContext } from './registry';

let S: Store;

export function init(ctx: FeatureContext): void {
  S = ctx.store;
  bus.on('decoClick', (_id, def) => {
    if (isStall(def)) openStall();
  });
  S.onEvents((events) => {
    for (const e of events)
      if (e.type === 'stallSales') {
        sfx.coin();
        toast(`🧺 Sold ${e.units} thing${e.units === 1 ? '' : 's'} at your stall for ${fmtNum(e.coins)} coins!`, 'good');
      }
  });
  ctx.onScene((scene) => new StallLayer(scene));
}

function shoppersNote(now: number): string {
  const w = WEATHER[weatherAt(now)];
  const f = SHOPPERS[w.id];
  return f < 1 ? `${w.emoji} ${w.name}: lots of shoppers out today, so things sell faster!` : f > 1 ? `${w.emoji} ${w.name}: fewer shoppers today, so things sell slower.` : `${w.emoji} ${w.name}: a normal market day.`;
}

export function openStall(): void {
  let off = () => {};
  const timer = window.setInterval(() => render(), 1000);
  const m = openModal("Farmers' Market", {
    icon: hasArt('icon:market') ? artURL('icon:market') : undefined,
    onClose: () => {
      off();
      clearInterval(timer);
    },
  });
  const render = () => {
    const st = S.state;
    const now = S.now();
    if (!hasStall(st)) {
      m.body.replaceChildren(
        h(
          'div',
          { class: 'mk-empty' },
          hasArt('deco:market_stall') ? h('img', { src: artURL('deco:market_stall') }) : null,
          h('div', { class: 'title' }, "Set up a Farmers' Market Stall"),
          h('div', { class: 'muted' }, 'Villagers pay more than the barn does, and something is always in demand! Find the stall on the Decor page.'),
          h('button', { class: 'btn green', onclick: () => (m.close(), openDecor({ q: "Farmers' Market Stall" })) }, 'Decor 🌷'),
        ),
      );
      return;
    }
    const crave = cravingFor(st, now);
    const coins = stallCoins(st, now);
    const listings = st.stall?.listings ?? [];
    const slots = h('div', { class: 'mk-slots' });
    listings.forEach((l, i) => {
      const sold = soldUnits(l, now);
      const next = sold < l.qty ? (now - l.at - sold * l.per) / l.per : 1;
      slots.append(
        h(
          'div',
          { class: `mk-slot${l.item === crave ? ' crave' : ''}` },
          h('img', { src: iconURL(l.item) }),
          h('div', { class: 'mk-name' }, ITEMS[l.item]?.name ?? l.item),
          h('div', { class: 'mk-sub' }, `${sold} / ${l.qty} sold · ${fmtNum(l.each)} each`),
          h('div', { class: 'mk-bar' }, h('div', { style: { width: `${Math.round(next * 100)}%` } })),
          h('div', { class: 'mk-sub' }, sold >= l.qty ? 'All sold!' : `Next sale in ${fmtDuration(l.per - (now - l.at - sold * l.per))}`),
          sold < l.qty ? h('button', { class: 'btn small', onclick: () => confirm(`Take the unsold ${ITEMS[l.item]?.name} back to your barn?`) && S.dispatch({ type: 'cancelListing', slot: i }) }, 'Take back') : null,
        ),
      );
    });
    for (let i = listings.length; i < stallSlots(st); i++)
      slots.append(h('button', { class: 'mk-slot add', onclick: () => openListPicker() }, h('div', { class: 'plus' }, '+'), h('div', { class: 'mk-sub' }, 'Put something out')));
    m.body.replaceChildren(
      h(
        'div',
        { class: 'mk-crave' },
        h('img', { src: iconURL(crave) }),
        h('div', { class: 'grow' }, h('div', { class: 'title' }, `Today everyone's craving ${ITEMS[crave]?.name}!`), h('div', { class: 'mk-sub' }, 'It sells for double at your stall today.')),
      ),
      h('div', { class: 'mk-weather muted small' }, shoppersNote(now)),
      slots,
      h(
        'div',
        { class: 'mk-collect' },
        h('img', { src: iconURL('coin') }),
        h('div', { class: 'grow' }, coins ? `${fmtNum(coins)} coins waiting in the till` : 'No sales yet. Shoppers come by all day!'),
        h('button', { class: `btn${coins ? ' gold' : ''}`, disabled: !coins, onclick: () => S.dispatch({ type: 'collectStall' }) }, 'Collect 💰'),
      ),
    );
  };
  render();
  off = S.onChange(render);
}

function openListPicker(): void {
  const st = S.state;
  const now = S.now();
  const crave = cravingFor(st, now);
  const items = Object.entries(st.inventory)
    .filter(([id, n]) => n > 0 && Object.hasOwn(ITEMS, id) && stallable(ITEMS[id]))
    .sort(([a], [b]) => Number(b === crave) - Number(a === crave) || ITEMS[b].sell - ITEMS[a].sell);
  const m = openModal('Put something out', { narrow: true });
  if (!items.length) {
    m.body.append(h('p', { class: 'center muted' }, 'Your barn is empty! Harvest, craft or cook something to sell.'));
    return;
  }
  let pick = items[0][0];
  let qty = 1;
  let tier: PriceTier = 'fair';
  const render = () => {
    const have = st.inventory[pick] ?? 0;
    qty = Math.max(1, Math.min(qty, have, MAX_LISTING));
    const grid = h(
      'div',
      { class: 'fr-gifts' },
      ...items.map(([id, n]) =>
        h(
          'button',
          { class: `fr-gift${id === pick ? ' picked' : ''}${id === crave ? ' loved' : ''}`, title: ITEMS[id].name, onclick: () => ((pick = id), render()) },
          h('img', { src: iconURL(id) }),
          h('span', { class: 'n' }, fmtNum(n)),
          id === crave ? h('span', { class: 'heart' }, '★') : null,
        ),
      ),
    );
    const tiers = h(
      'div',
      { class: 'mk-tiers' },
      ...(Object.keys(PRICE_TIERS) as PriceTier[]).map((t) => {
        const q = quote(ITEMS[pick], t, now, crave);
        return h(
          'button',
          { class: `mk-tier${t === tier ? ' active' : ''}`, onclick: () => ((tier = t), render()) },
          h('div', { class: 'title' }, PRICE_TIERS[t].name),
          h('div', { class: 'mk-price' }, h('img', { src: iconURL('coin') }), fmtNum(q.each)),
          h('div', { class: 'mk-sub' }, `~${fmtDuration(q.per)} each`),
        );
      }),
    );
    const q = quote(ITEMS[pick], tier, now, crave);
    m.body.replaceChildren(
      grid,
      h('div', { class: 'mk-picked' }, h('img', { src: iconURL(pick) }), h('b', null, ITEMS[pick].name), h('span', { class: 'muted small' }, ` (barn price ${ITEMS[pick].sell})`)),
      tiers,
      h(
        'div',
        { class: 'mk-qty' },
        h('button', { class: 'btn small', onclick: () => ((qty = Math.max(1, qty - 1)), render()) }, '−'),
        h('b', null, `${qty}`),
        h('button', { class: 'btn small', onclick: () => ((qty = Math.min(qty + 1, have, MAX_LISTING)), render()) }, '+'),
        h('button', { class: 'btn small', onclick: () => ((qty = Math.min(have, MAX_LISTING)), render()) }, 'Max'),
      ),
      h(
        'div',
        { class: 'fr-claim' },
        h(
          'button',
          {
            class: 'btn green',
            onclick: () => {
              if (S.dispatch({ type: 'listStall', item: pick, qty, tier })) {
                sfx.place();
                m.close();
              }
            },
          },
          `Put out ${qty} for ${fmtNum(q.each * qty)} coins 🧺`,
        ),
      ),
    );
  };
  render();
}

// ---------------------------------------------------------------------------
// Goods on the counter and a coin that pops up when something sells.

class StallLayer {
  private parts: Phaser.GameObjects.GameObject[] = [];
  private sig = '';

  constructor(private scene: FarmScene) {
    scene.time.addEvent({ delay: 1000, loop: true, callback: () => this.sync() });
    S.onChange(() => this.sync());
    this.sync();
  }

  private sync(): void {
    const st = S.state;
    const now = S.now();
    const stalls = Object.values(st.objects).filter((o) => o.kind === 'deco' && isStall(o.def));
    const goods = S.visit ? [] : (st.stall?.listings ?? []).filter((l) => soldUnits(l, now) < l.qty).map((l) => l.item);
    const coins = !S.visit && stallCoins(st, now) > 0;
    const sig = `${stalls.map((s) => `${s.x},${s.y},${s.kind === 'deco' && s.flip ? 1 : 0}`).join('|')}/${goods.join(',')}/${coins}`;
    if (sig === this.sig) return;
    this.sig = sig;
    for (const p of this.parts) p.destroy();
    this.parts = [];
    const stand = stalls[0];
    if (!stand) return;
    const flip = stand.kind === 'deco' && !!stand.flip;
    // The counter runs along the stall's long side.
    const along = (t: number) => (flip ? this.scene.tileToWorld(stand.x + 0.35, stand.y + 0.2 + t * 1.6) : this.scene.tileToWorld(stand.x + 0.2 + t * 1.6, stand.y + 0.35));
    const depth = this.scene.depthAt(stand.x + (flip ? 0 : 1), stand.y + (flip ? 1 : 0)) + 5;
    goods.slice(0, 6).forEach((item, i, all) => {
      const p = along((i + 0.5) / Math.max(STALL_SLOTS, all.length));
      const img = this.scene.add.image(p.x, p.y - 17, texture(this.scene, `icon:${item}`)).setScale(0.24).setDepth(depth);
      this.parts.push(img);
    });
    if (coins) {
      const p = along(0.5);
      const c = this.scene.add
        .image(p.x, p.y - 58, texture(this.scene, 'icon:coin'))
        .setScale(0.3)
        .setDepth(depth + 1)
        .setInteractive({ useHandCursor: true });
      c.on('pointerdown', (_p: Phaser.Input.Pointer, _x: number, _y: number, e: Phaser.Types.Input.EventData) => {
        e.stopPropagation();
        S.dispatch({ type: 'collectStall' });
      });
      this.scene.tweens.add({ targets: c, y: c.y - 7, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      this.parts.push(c);
    }
  }
}
