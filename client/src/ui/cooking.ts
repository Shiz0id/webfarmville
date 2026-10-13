// Cooking mini-games in the spirit of Cooking Mama: chop, stir, crack, mix,
// knead, flip, mind the heat and sprinkle toppings. Each step scores 0-100;
// the average decides how the dish turns out.

import { DISH_LIST, ITEMS, MAMA, cookTier, type CookStep, type DishDef } from '@farm/shared';
import { artURL, hasArt, iconURL } from '../art';
import { sfx } from '../sfx';
import type { Store } from '../store';
import { eventLive } from '../events';
import { fmtNum, h, nameOf } from '../util';
import { forFingers } from './layout';
import { confetti, openModal, toast } from './dom';
import { portrait } from './villager';

let S: Store;

export function initCooking(store: Store): void {
  S = store;
}

const STEP_INFO: Record<CookStep, { title: string; hint: string; cheer: string }> = {
  chop: { title: 'Chop!', hint: 'Click each dotted line, left to right!', cheer: 'Chop chop chop! Nice and neat, honey!' },
  stir: { title: 'Stir!', hint: 'Hold the mouse down and swirl round and round the pot!', cheer: 'Stir, stir, stir! Smells lovely!' },
  heat: { title: 'Watch the heat!', hint: 'Click STOP when the needle is in the green!', cheer: 'Not too hot, not too cold!' },
  mix: { title: 'Mix!', hint: 'Click the left and right sides of the bowl, back and forth, fast!', cheer: 'Whisk whisk whisk! Fluffy!' },
  sprinkle: { title: 'Sprinkle!', hint: 'Move the shaker over every sparkle on the plate!', cheer: 'A little sprinkle makes it special!' },
  crack: { title: 'Crack the eggs!', hint: 'Click when the ring is inside the target!', cheer: 'Tap tap... crack! Careful now!' },
  knead: { title: 'Knead!', hint: 'Click the dough each time the circle meets the ring!', cheer: 'Push and fold, push and fold!' },
  flip: { title: 'Flip!', hint: 'Click when the food is right at the top!', cheer: 'Up it goes! Catch it!' },
};

// ---------------------------------------------------------------------------
// Recipe book

function haveAll(d: DishDef): boolean {
  return Object.entries(d.inputs).every(([i, q]) => (S.state.inventory[i] ?? 0) >= q);
}

export function readyDishes(): number {
  return DISH_LIST.filter((d) => S.state.level >= d.level && (!d.event || eventLive(d.event, S.now(), S.allEvents)) && haveAll(d)).length;
}

export function openKitchen(): void {
  const m = openModal("Mama's Kitchen", { icon: hasArt('cook:pot') ? artURL('cook:pot') : iconURL('tomato_soup') });
  const render = () => {
    m.body.replaceChildren(
      h(
        'div',
        { class: 'row mama-row' },
        portrait(MAMA, 54),
        h(
          'div',
          { class: 'grow' },
          h('div', { class: 'title' }, MAMA),
          h('div', { class: 'sub' }, '“Pick a recipe, honey! Cook it perfectly and you\'ll make two!”'),
        ),
      ),
    );
    const grid = h('div', { class: 'recipes' });
    for (const d of DISH_LIST) {
      if (d.event && !eventLive(d.event, S.now(), S.allEvents)) continue;
      const locked = S.state.level < d.level;
      const ok = !locked && haveAll(d);
      const inputs = h('div', { class: 'inputs' });
      for (const [item, qty] of Object.entries(d.inputs)) {
        const have = S.state.inventory[item] ?? 0;
        inputs.append(
          h('span', { class: have < qty ? 'missing' : '', title: nameOf(item) }, h('img', { class: 'ico', src: iconURL(item) }), `${Math.min(have, qty)}/${qty}`),
        );
      }
      grid.append(
        h(
          'div',
          { class: `recipe-card${locked ? ' locked' : ''}${ok ? ' ready' : ''}` },
          h('img', { class: 'dish-img', src: iconURL(d.id) }),
          h('div', { class: 'name' }, d.event ? `🎃 ${d.name}` : d.name),
          inputs,
          h('div', { class: 'steps' }, ...d.steps.map((s) => h('span', null, STEP_INFO[s].title.replace('!', '')))),
          h('div', { class: 'meta' }, `Sells ${ITEMS[d.id].sell} · +${d.xp} XP`),
          locked
            ? h('div', { class: 'tag' }, `Lv ${d.level}`)
            : h(
                'button',
                {
                  class: `btn ${ok ? 'green' : ''}`,
                  disabled: !ok,
                  onclick: () => {
                    m.close();
                    void cook(d);
                  },
                },
                ok ? 'Cook! 🍳' : 'Need ingredients',
              ),
        ),
      );
    }
    m.body.append(grid);
  };
  render();
}

// ---------------------------------------------------------------------------
// The mini-game runner

interface Stage {
  root: HTMLElement;
  arena: HTMLElement;
  title: HTMLElement;
  hint: HTMLElement;
  timer: HTMLElement;
  bubble: HTMLElement;
}

function stage(dish: DishDef): Stage {
  const title = h('div', { class: 'k-title' });
  const hint = h('div', { class: 'k-hint' });
  const timer = h('div', { class: 'k-timer' }, h('div'));
  const arena = h('div', { class: 'k-arena' });
  const bubble = h('div', { class: 'k-bubble' });
  const root = h(
    'div',
    { class: 'kitchen' },
    h(
      'div',
      { class: 'k-top' },
      h('img', { class: 'k-dish', src: iconURL(dish.id) }),
      h('div', null, h('div', { class: 'k-dishname' }, dish.name), title, hint),
    ),
    timer,
    arena,
    h('div', { class: 'k-mama' }, portrait(MAMA, 72), bubble),
  );
  document.body.append(root);
  return { root, arena, title, hint, timer, bubble };
}

function say(st: Stage, text: string): void {
  st.bubble.textContent = text;
  st.bubble.classList.remove('pop');
  void st.bubble.offsetWidth;
  st.bubble.classList.add('pop');
}

function prop(name: string, size: number, cls = ''): HTMLImageElement {
  const key = `cook:${name}`;
  return h('img', { class: `k-prop ${cls}`, src: hasArt(key) ? artURL(key) : iconURL('mystery_gift'), style: { width: `${size}px`, height: `${size}px` } });
}

function wait(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/** Runs a timed step; `tick` gets elapsed fraction each frame; resolves with the step's score. */
function timed(st: Stage, seconds: number, setup: (finish: (score: number) => void) => (t: number) => void): Promise<number> {
  return new Promise((resolve) => {
    let done = false;
    const start = performance.now();
    const fill = st.timer.firstElementChild as HTMLElement;
    let tick: (t: number) => void = () => {};
    const finish = (score: number) => {
      if (done) return;
      done = true;
      resolve(Math.max(0, Math.min(100, Math.round(score))));
    };
    tick = setup(finish);
    const loop = () => {
      if (done) return;
      const t = (performance.now() - start) / (seconds * 1000);
      fill.style.width = `${Math.max(0, 100 - t * 100)}%`;
      tick(Math.min(1, t));
      if (t >= 1) {
        tick(1);
        return;
      }
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  });
}

function rel(e: PointerEvent, el: HTMLElement): { x: number; y: number } {
  const r = el.getBoundingClientRect();
  return { x: e.clientX - r.left, y: e.clientY - r.top };
}

function ingredientFor(dish: DishDef): string {
  return Object.keys(dish.inputs)[0];
}

// --- the steps ------------------------------------------------------------------

const STEPS: Record<CookStep, (st: Stage, dish: DishDef) => Promise<number>> = {
  // Click dotted cut lines left to right; accuracy matters.
  chop: (st, dish) =>
    timed(st, 7, (finish) => {
      const board = h('div', { class: 'k-board' }, prop('board', 300, 'k-under'));
      const food = h('img', { class: 'k-food', src: iconURL(ingredientFor(dish)) });
      board.append(food);
      const xs = [0.3, 0.42, 0.54, 0.66];
      const lines = xs.map((x) => {
        const l = h('div', { class: 'k-cut', style: { left: `${x * 100}%` } });
        board.append(l);
        return l;
      });
      const knife = prop('knife', 90, 'k-cursor');
      st.arena.append(board, knife);
      let next = 0;
      let total = 0;
      board.addEventListener('pointermove', (e) => {
        const p = rel(e, st.arena);
        knife.style.transform = `translate(${p.x - 20}px, ${p.y - 70}px)`;
      });
      board.addEventListener('pointerdown', (e) => {
        if (next >= lines.length) return;
        const p = rel(e, board);
        const target = xs[next] * board.clientWidth;
        const err = Math.abs(p.x - target);
        const acc = Math.max(0, 100 - err * 2.2);
        total += acc;
        lines[next].classList.add(acc > 60 ? 'cut-good' : 'cut-ok');
        knife.classList.remove('chop');
        void knife.offsetWidth;
        knife.classList.add('chop');
        sfx.plow();
        next++;
        if (next === lines.length) {
          food.classList.add('sliced');
          setTimeout(() => finish(total / lines.length), 350);
        }
      });
      return (t) => {
        if (t >= 1) finish((total / lines.length) * 0.9);
      };
    }),

  // Swirl around the pot: count rotations.
  stir: (st) =>
    timed(st, 6, (finish) => {
      const pot = h('div', { class: 'k-pot' }, prop('pot', 300, 'k-under'), h('div', { class: 'k-swirl' }));
      const spoon = prop('spoon', 90, 'k-cursor');
      st.arena.append(pot, spoon);
      let last: number | null = null;
      let turned = 0;
      const goal = Math.PI * 2 * 4;
      let down = false;
      pot.addEventListener('pointerdown', () => (down = true));
      const up = () => {
        down = false;
        if (!pot.isConnected) window.removeEventListener('pointerup', up);
      };
      window.addEventListener('pointerup', up);
      pot.addEventListener('pointermove', (e) => {
        const p = rel(e, st.arena);
        spoon.style.transform = `translate(${p.x - 30}px, ${p.y - 60}px)`;
        if (!down) {
          last = null;
          return;
        }
        const c = rel(e, pot);
        const a = Math.atan2(c.y - pot.clientHeight / 2, c.x - pot.clientWidth / 2);
        if (last !== null) {
          let d = a - last;
          if (d > Math.PI) d -= Math.PI * 2;
          if (d < -Math.PI) d += Math.PI * 2;
          turned += Math.abs(d);
          (pot.querySelector('.k-swirl') as HTMLElement).style.transform = `rotate(${turned}rad)`;
        }
        last = a;
        if (turned >= goal) finish(100);
      });
      return (t) => {
        if (t >= 1) finish((turned / goal) * 100);
      };
    }),

  // Stop the needle in the green zone.
  heat: (st) =>
    timed(st, 6, (finish) => {
      const zoneStart = 0.55 + Math.random() * 0.2;
      const gauge = h(
        'div',
        { class: 'k-gauge' },
        h('div', { class: 'k-zone', style: { left: `${zoneStart * 100}%`, width: '14%' } }),
        h('div', { class: 'k-needle' }),
      );
      const stop = h('button', { class: 'btn gold big k-stop' }, 'STOP! 🔥');
      st.arena.append(h('div', { class: 'k-oven' }, prop('oven', 230), prop('flame', 90, 'k-flame')), gauge, stop);
      let pos = 0;
      const needle = gauge.querySelector('.k-needle') as HTMLElement;
      stop.addEventListener('click', () => {
        const center = zoneStart + 0.07;
        finish(Math.max(0, 100 - Math.abs(pos - center) * 520));
        sfx.place();
      });
      return (t) => {
        pos = (Math.sin(t * Math.PI * 5) + 1) / 2;
        needle.style.left = `${pos * 100}%`;
        if (t >= 1) finish(0);
      };
    }),

  // Alternate clicking the left and right of the bowl.
  mix: (st) =>
    timed(st, 5, (finish) => {
      const bowl = h('div', { class: 'k-bowl' }, prop('bowl', 280, 'k-under'), prop('whisk', 110, 'k-whisk'));
      const left = h('div', { class: 'k-half left' }, '◀');
      const right = h('div', { class: 'k-half right' }, '▶');
      bowl.append(left, right);
      st.arena.append(bowl);
      const goal = 20;
      let count = 0;
      let side: 'left' | 'right' | null = null;
      const whisk = bowl.querySelector('.k-whisk') as HTMLElement;
      const hit = (s: 'left' | 'right') => {
        if (s === side) return;
        side = s;
        count++;
        whisk.style.transform = `translateX(${s === 'left' ? -50 : 50}px) rotate(${s === 'left' ? -15 : 15}deg)`;
        if (count % 4 === 0) sfx.click();
        if (count >= goal) finish(100);
      };
      left.addEventListener('pointerdown', () => hit('left'));
      right.addEventListener('pointerdown', () => hit('right'));
      return (t) => {
        if (t >= 1) finish((count / goal) * 100);
      };
    }),

  // Hover the shaker over sparkles on the plate.
  sprinkle: (st) =>
    timed(st, 7, (finish) => {
      const plate = h('div', { class: 'k-plate' }, prop('plate', 300, 'k-under'));
      const shaker = prop('shaker', 80, 'k-cursor');
      const spots = Array.from({ length: 6 }, (_, i) => {
        const a = (i / 6) * Math.PI * 2 + Math.random() * 0.4;
        const r = 60 + Math.random() * 40;
        const el = h('div', { class: 'k-spot', style: { left: `${150 + Math.cos(a) * r}px`, top: `${150 + Math.sin(a) * r * 0.75}px` } }, '✨');
        plate.append(el);
        return { el, fill: 0 };
      });
      st.arena.append(plate, shaker);
      let pointer = { x: -999, y: -999 };
      plate.addEventListener('pointermove', (e) => {
        pointer = rel(e, plate);
        const p = rel(e, st.arena);
        shaker.style.transform = `translate(${p.x - 30}px, ${p.y - 70}px) rotate(${Math.sin(performance.now() / 60) * 15}deg)`;
      });
      let lastT = 0;
      return (t) => {
        const dt = t - lastT;
        lastT = t;
        for (const s of spots) {
          const x = parseFloat(s.el.style.left);
          const y = parseFloat(s.el.style.top);
          if (Math.hypot(pointer.x - x, pointer.y - y) < 34 && s.fill < 1) {
            s.fill = Math.min(1, s.fill + dt * 7 * 3);
            s.el.style.opacity = String(1 - s.fill * 0.6);
            if (s.fill >= 1) {
              s.el.textContent = '🌟';
              sfx.pop();
            }
          }
        }
        const score = (spots.reduce((a, s) => a + s.fill, 0) / spots.length) * 100;
        if (score >= 100) finish(100);
        if (t >= 1) finish(score);
      };
    }),

  // Timing rings: click when the shrinking ring hits the target (eggs).
  crack: (st) => rings(st, 'egg', 3, 'crack'),
  knead: (st) => rings(st, 'dough', 5, 'knead'),

  // Click when the tossed food reaches its peak.
  flip: (st, dish) =>
    timed(st, 7, (finish) => {
      const pan = h('div', { class: 'k-panwrap' }, prop('pan', 260, 'k-under'));
      const food = h('img', { class: 'k-toss', src: iconURL(ingredientFor(dish)) });
      pan.append(food);
      st.arena.append(pan);
      const scores: number[] = [];
      let phase = 0;
      let t0 = performance.now();
      const period = 1100;
      pan.addEventListener('pointerdown', () => {
        const u = ((performance.now() - t0) % period) / period; // 0..1, peak at 0.5
        scores.push(Math.max(0, 100 - Math.abs(u - 0.5) * 320));
        sfx.place();
        phase++;
        t0 = performance.now();
        if (scores.length >= 3) finish(scores.reduce((a, b) => a + b, 0) / 3);
      });
      return (t) => {
        const u = ((performance.now() - t0) % period) / period;
        const y = Math.sin(u * Math.PI) * 150;
        food.style.transform = `translate(-50%, ${-y}px) rotate(${u * 360 * (phase % 2 ? -1 : 1)}deg)`;
        if (t >= 1) finish(scores.length ? scores.reduce((a, b) => a + b, 0) / 3 : 0);
      };
    }),
};

function rings(st: Stage, propName: string, beats: number, kind: 'crack' | 'knead'): Promise<number> {
  return timed(st, beats * 1.3 + 1, (finish) => {
    const target = h('div', { class: 'k-ringwrap' }, prop(propName, 170, kind === 'crack' ? 'k-egg' : 'k-dough'), h('div', { class: 'k-target' }), h('div', { class: 'k-ring' }));
    st.arena.append(target);
    const ring = target.querySelector('.k-ring') as HTMLElement;
    const item = target.querySelector('.k-prop') as HTMLElement;
    const scores: number[] = [];
    const period = 1300;
    const start = performance.now();
    let lastBeat = -1;
    target.addEventListener('pointerdown', () => {
      const u = ((performance.now() - start) % period) / period; // ring hits target at u = 0.75
      const beat = Math.floor((performance.now() - start) / period);
      if (beat === lastBeat) return;
      lastBeat = beat;
      const s = Math.max(0, 100 - Math.abs(u - 0.75) * 380);
      scores.push(s);
      item.classList.remove('squish');
      void item.offsetWidth;
      item.classList.add('squish');
      if (s > 60) sfx.pop();
      else sfx.click();
      if (scores.length >= beats) finish(scores.reduce((a, b) => a + b, 0) / beats);
    });
    return (t) => {
      const u = ((performance.now() - start) % period) / period;
      ring.style.transform = `translate(-50%, -50%) scale(${2.2 - u * 1.6})`;
      ring.style.opacity = String(u < 0.92 ? 1 : 0.2);
      if (t >= 1) finish(scores.reduce((a, b) => a + b, 0) / beats);
    };
  });
}

function verdict(score: number): string {
  if (score >= 90) return 'Perfect! ✨';
  if (score >= 70) return 'Great job!';
  if (score >= 40) return 'Okay!';
  return 'Oops!';
}

async function cook(dish: DishDef): Promise<void> {
  const err = S.check({ type: 'cook', dish: dish.id, score: 0 });
  if (err) {
    toast(err, 'error');
    return;
  }
  const st = stage(dish);
  const scores: number[] = [];
  say(st, `Let's make ${dish.name}! I'll be right here, honey.`);
  await wait(1200);
  for (const [i, step] of dish.steps.entries()) {
    const info = STEP_INFO[step];
    st.title.textContent = `Step ${i + 1}/${dish.steps.length}: ${info.title}`;
    st.hint.textContent = forFingers(info.hint);
    st.arena.replaceChildren();
    say(st, info.cheer);
    const go = h('div', { class: 'k-ready' }, 'Ready… Go!');
    st.arena.append(go);
    await wait(900);
    go.remove();
    const s = await STEPS[step](st, dish);
    scores.push(s);
    st.arena.append(h('div', { class: `k-verdict v${s >= 90 ? 'perfect' : s >= 70 ? 'great' : s >= 40 ? 'good' : 'oops'}` }, verdict(s)));
    if (s >= 90) sfx.quest();
    else if (s < 40) sfx.error();
    await wait(1000);
  }
  const score = scores.reduce((a, b) => a + b, 0) / scores.length;
  const grade = cookTier(score);
  st.arena.replaceChildren();
  st.title.textContent = grade.label;
  st.hint.textContent = '';
  say(st, grade.tier === 'perfect' ? "Wonderful! Even better than Mama! I'm so proud!" : grade.tier === 'oops' ? "Don't worry, honey. Mama will fix it!" : 'Mmm! That smells delicious!');
  const done = S.dispatch({ type: 'cook', dish: dish.id, score });
  const stars = grade.tier === 'perfect' ? 3 : grade.tier === 'great' ? 2 : grade.tier === 'good' ? 1 : 0;
  st.arena.append(
    h(
      'div',
      { class: 'k-result' },
      h('img', { class: 'k-final', src: iconURL(dish.id) }),
      h('div', { class: 'k-stars' }, '★'.repeat(stars) + '☆'.repeat(3 - stars)),
      h('div', { class: 'k-score' }, `Score ${Math.round(score)}`),
      done ? h('div', { class: 'k-got' }, `+${grade.qty} ${dish.name} · sells for ${fmtNum(ITEMS[dish.id].sell)} each`) : null,
      h(
        'div',
        { class: 'inline', style: { justifyContent: 'center' } },
        h('button', { class: 'btn green big', onclick: () => st.root.remove() }, 'Yummy!'),
        h(
          'button',
          {
            class: 'btn big',
            onclick: () => {
              st.root.remove();
              openKitchen();
            },
          },
          'Cook more',
        ),
      ),
    ),
  );
  if (grade.tier === 'perfect') {
    confetti(90);
    sfx.levelUp();
  }
}
