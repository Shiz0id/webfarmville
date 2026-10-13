// Baby animals on the client: tap a baby for a cuddle (once an hour), hearts
// and a toast when it grows up, and the Nursery Barn panel that lists every
// little one on the farm with a "cuddle everyone" button.
// (Babies are drawn small with a 💗 bubble by FarmScene.renderSpec.)

import {
  ANIMALS,
  BABY_NAMES,
  CUDDLE_SKIP,
  NURSERY_DECO,
  NURSERY_MULT,
  NURSERY_RANGE,
  babyGrowMs,
  bestFeed,
  cuddleReadyAt,
  isBaby,
  nearNursery,
  type GameEvent,
  type ProducerObject,
} from '@farm/shared';
import { artURL, hasArt } from '../art';
import { bus } from '../bus';
import { sfx } from '../sfx';
import { confetti, openModal, toast } from '../ui/dom';
import { fmtDuration, h } from '../util';
import type { FarmScene } from '../scenes/FarmScene';
import type { Store } from '../store';
import type { FeatureContext } from './registry';

let S: Store;
let scene: FarmScene | null = null;

const babyName = (def: string) => BABY_NAMES[def] ?? `baby ${ANIMALS[def]?.name ?? def}`;
const label = (o: ProducerObject) => (o.nick ? o.nick : `your ${babyName(o.def).toLowerCase()}`);

function babies(): ProducerObject[] {
  const now = S.now();
  return Object.values(S.state.objects).filter((o): o is ProducerObject => o.kind === 'animal' && isBaby(o, now));
}

export function init(ctx: FeatureContext): void {
  S = ctx.store;
  ctx.onScene((s) => (scene = s));
  bus.on('producerClick', (id: string) => {
    const obj = S.state.objects[id];
    const now = S.now();
    if (obj?.kind !== 'animal' || !isBaby(obj, now)) return;
    const ready = cuddleReadyAt(obj);
    if (ready <= now) S.dispatch({ type: 'cuddleBaby', id });
    // Napping babies still love a snack from the Feed Mill.
    else if (bestFeed(S.state)) S.dispatch({ type: 'feedAnimal', id });
    else toast(`💤 Shh, ${label(obj)} is napping. Cuddle again in ${fmtDuration(ready - now)}, or bring a snack from a Feed Mill.`);
  });
  bus.on('decoClick', (_id: string, def: string) => {
    if (def === NURSERY_DECO) openNursery();
  });
  // Celebrate as soon as a baby grows up, not just on the next thing you do.
  const checkGrown = () => {
    if (S.visit) return;
    const now = S.now();
    if (Object.values(S.state.objects).some((o) => o.kind === 'animal' && o.grownAt !== undefined && o.grownAt <= now))
      S.dispatch({ type: 'growUp' }, { quiet: true });
  };
  window.setTimeout(checkGrown, 2000);
  window.setInterval(checkGrown, 5000);
  S.onEvents((events) => {
    for (const e of events) {
      if (e.type === 'cuddled') cuddled(e);
      else if (e.type === 'grewUp') grewUp(e);
    }
  });
}

function hearts(obj: { x: number; y: number }, n: number): void {
  if (!scene) return;
  const p = scene.tileToWorld(obj.x + 0.5, obj.y + 0.5);
  scene.burst('fx:heart', n, p.x, p.y - 18);
}

function cuddled(e: Extract<GameEvent, { type: 'cuddled' }>): void {
  const obj = S.state.objects[e.id];
  if (obj) hearts(obj, 5);
  sfx.purr(0.8);
}

function grewUp(e: Extract<GameEvent, { type: 'grewUp' }>): void {
  const obj = S.state.objects[e.id];
  if (obj) hearts(obj, 10);
  sfx.levelUp();
  confetti(30);
  const grown = ANIMALS[e.def]?.name ?? 'grown-up';
  const who = e.nick ? `${e.nick} the ${babyName(e.def).toLowerCase()}` : `Your little ${babyName(e.def).toLowerCase()}`;
  toast(`🎉 ${who} is all grown up into a ${grown.toLowerCase()}! Now they can make ${nameOfProduct(e.def)}.`, 'good');
}

function nameOfProduct(def: string): string {
  return (ANIMALS[def]?.product ?? 'goods').replace(/_/g, ' ');
}

function openNursery(): void {
  let off = () => {};
  let timer = 0;
  const m = openModal('Nursery Barn', {
    narrow: true,
    onClose: () => {
      off();
      clearInterval(timer);
    },
  });
  const render = () => {
    const now = S.now();
    const list = babies().sort((a, b) => a.grownAt! - b.grownAt!);
    const awake = list.filter((o) => cuddleReadyAt(o) <= now);
    m.body.replaceChildren(
      h(
        'div',
        { class: 'nu-intro' },
        `Babies within ${NURSERY_RANGE} tiles of the barn feel extra snug: every cuddle and treat helps them grow ${NURSERY_MULT}× as much. Each cuddle skips ${Math.round(CUDDLE_SKIP * 100)}% of their growing time.`,
      ),
      list.length
        ? h(
            'div',
            { class: 'nu-list' },
            ...list.map((o) => {
              const total = babyGrowMs(ANIMALS[o.def]);
              const pct = Math.max(0, Math.min(1, 1 - (o.grownAt! - now) / total));
              const ready = cuddleReadyAt(o) <= now;
              return h(
                'div',
                { class: 'nu-row' },
                hasArt(`baby:${o.def}`)
                  ? h('img', { class: 'nu-img baby', src: artURL(`baby:${o.def}`) })
                  : h('img', { class: 'nu-img', src: artURL(`animal:${o.def}`) }),
                h(
                  'div',
                  { class: 'nu-info' },
                  h('div', { class: 'nu-name' }, o.nick ? `${o.nick} the ${babyName(o.def)}` : `Baby ${babyName(o.def)}`, nearNursery(S.state, o.x, o.y) ? h('span', { class: 'nu-snug' }, ' 🏠 snug') : null),
                  h('div', { class: 'nu-bar' }, h('div', { style: { width: `${Math.round(pct * 100)}%` } })),
                  h('div', { class: 'nu-sub' }, `Grows up in ${fmtDuration(o.grownAt! - now)}${ready ? '' : ` · napping ${fmtDuration(cuddleReadyAt(o) - now)}`}`),
                ),
                h(
                  'button',
                  {
                    class: `btn small${ready ? ' green' : ''}`,
                    disabled: !ready,
                    onclick: () => {
                      S.dispatch({ type: 'cuddleBaby', id: o.id });
                      render();
                    },
                  },
                  ready ? '💗 Cuddle' : '💤',
                ),
              );
            }),
          )
        : h('div', { class: 'nu-empty' }, '🍼 No little ones right now. Baby animals are half price in the Market (Animals → Babies), and lonely animals that you adopt arrive as babies too.'),
      awake.length > 1
        ? h(
            'button',
            {
              class: 'btn green nu-all',
              onclick: () => {
                for (const o of awake) S.dispatch({ type: 'cuddleBaby', id: o.id }, { quiet: true });
                render();
              },
            },
            `💗 Cuddle everyone (${awake.length})`,
          )
        : '',
    );
  };
  render();
  // Keep timers and naps current while it's open.
  off = S.onChange(render);
  timer = window.setInterval(render, 5000);
}
