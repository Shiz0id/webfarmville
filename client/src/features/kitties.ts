// Kitty Corner on the client: cats lounging on your goodies, pets and purrs,
// the kitty panel with food, gifts and the cat album, and adopted cats who
// roam the farm.

import Phaser from 'phaser';
import {
  ADOPT_HEARTS,
  GOODIES,
  KITTIES,
  KITTY_FOODS,
  KITTY_LIST,
  MAX_ADOPTED,
  canAdopt,
  footprint,
  giftFor,
  goodiePose,
  hasBowl,
  kittyVisitors,
  pendingVisits,
  type FarmState,
  type KittyPose,
} from '@farm/shared';
import { RES, artURL, hasArt, iconURL, texture } from '../art';
import { sfx } from '../sfx';
import { tools } from '../tools';
import { confetti, openModal, toast } from '../ui/dom';
import { openShop } from '../ui/panels';
import { fmtDuration, h, nameOf } from '../util';
import type { FarmScene } from '../scenes/FarmScene';
import type { Store } from '../store';
import { addHudButton, type FeatureContext } from './registry';

let S: Store;

/** How high above the ground a cat sits on each goodie (logical px). */
const LIFT: Record<string, number> = {
  cardboard_box: 7,
  cat_cushion: 7,
  cat_bed: 6,
  big_cushion: 16,
  kotatsu: 13,
  kitty_castle: 22,
  cat_tower: 36,
  fish_pillow: 6,
  pumpkin_bed: 9,
  paper_bag: 3,
  sunny_mat: 1,
};

const visitors = () => kittyVisitors(S.state, S.now(), S.allEvents);
const pending = () => pendingVisits(S.state, S.now(), S.allEvents);
const catIcon = (id: string) => (hasArt(`icon:cat_${id}`) ? artURL(`icon:cat_${id}`) : iconURL('paw'));
const hearts = (n: number) => '♥'.repeat(Math.min(ADOPT_HEARTS, n)) + '♡'.repeat(Math.max(0, ADOPT_HEARTS - n));

export function init(ctx: FeatureContext): void {
  S = ctx.store;
  addHudButton({
    id: 'kitties',
    em: '🐱',
    label: 'Kitties',
    where: 'corner',
    onClick: openKittyCorner,
    badge: () => (S.visit ? 0 : (pending().length ? 1 : 0) + KITTY_LIST.filter((c) => canAdopt(S.state, c.id)).length),
    pulse: () => !S.visit && KITTY_LIST.some((c) => canAdopt(S.state, c.id)),
    hideWhileVisiting: true,
  });
  S.onEvents((events) => {
    for (const e of events) {
      if (e.type === 'kittyGifts') {
        sfx.coin();
        toast(`🐾 ${e.visits} kitty visit${e.visits === 1 ? '' : 's'}! They left you ${e.coins} coins.`, 'good');
        for (const c of e.newCats) setTimeout(() => toast(`✨ New kitty friend: ${KITTIES[c]?.name}!`, 'good'), 600);
      } else if (e.type === 'adopted') {
        sfx.levelUp();
        confetti(80);
        showAdopted(e.cat);
      }
    }
  });
  ctx.onScene((scene) => new KittyLayer(scene));
}

// ---------------------------------------------------------------------------
// The farm scene: cats on goodies, full food bowls, roaming adopted cats

interface CatSprite {
  img: Phaser.GameObjects.Image;
  cat: string;
  base: string;
  frame: boolean;
}

class KittyLayer {
  private onGoodie = new Map<string, CatSprite>();
  private bowls = new Map<string, Phaser.GameObjects.Image>();
  private roamers = new Map<string, Roamer>();

  constructor(private scene: FarmScene) {
    scene.time.addEvent({ delay: 2000, loop: true, callback: () => this.sync() });
    scene.time.addEvent({ delay: 700, loop: true, callback: () => this.animate() });
    S.onChange(() => this.sync());
    this.sync();
  }

  private get state(): FarmState {
    return S.viewed;
  }

  private sync(): void {
    const st = this.state;
    const visiting = !!S.visit;
    // Visitors are only simulated for your own farm.
    const now = visiting ? {} : visitors();
    const seen = new Set<string>();
    for (const [objId, cat] of Object.entries(now)) {
      const obj = st.objects[objId];
      if (!obj || obj.kind !== 'deco') continue;
      const pose: KittyPose = goodiePose(obj.def) ?? 'sit';
      const key = `${objId}:${cat}`;
      seen.add(key);
      const { w, h } = footprint(obj);
      const pos = this.scene.tileToWorld(obj.x + w / 2, obj.y + h / 2);
      const base = `cat:${cat}:${pose}`;
      let s = this.onGoodie.get(key);
      if (!s) {
        const img = this.scene.add.image(0, 0, texture(this.scene, base)).setOrigin(0.5, 1).setScale(1 / RES).setAlpha(0);
        img.setInteractive({ useHandCursor: true, pixelPerfect: false });
        img.on('pointerdown', (_p: unknown, _x: number, _y: number, ev: Phaser.Types.Input.EventData) => {
          if (tools.tool !== 'hand' || S.visit) return;
          ev.stopPropagation();
          pet(this.scene, img, cat);
        });
        this.scene.tweens.add({ targets: img, alpha: 1, duration: 500 });
        s = { img, cat, base, frame: false };
        this.onGoodie.set(key, s);
      }
      s.img.setPosition(pos.x, pos.y + 16 - (LIFT[obj.def] ?? 2));
      s.img.setDepth(this.scene.depthFor(obj.x, obj.y, w, h) + 0.6);
    }
    for (const [key, s] of this.onGoodie)
      if (!seen.has(key)) {
        this.onGoodie.delete(key);
        this.scene.tweens.add({ targets: s.img, alpha: 0, duration: 400, onComplete: () => s.img.destroy() });
      }

    // Full food bowls.
    const fed = !visiting && !!st.kitty?.food && st.kitty.food.until > S.now();
    const bowlIds = new Set<string>();
    if (fed)
      for (const o of Object.values(st.objects)) {
        if (o.kind !== 'deco' || o.def !== 'kitty_bowl') continue;
        bowlIds.add(o.id);
        const pos = this.scene.tileToWorld(o.x + 0.5, o.y + 0.5);
        let img = this.bowls.get(o.id);
        if (!img) {
          img = this.scene.add.image(0, 0, texture(this.scene, 'kitty:food_full')).setScale(0.5 / RES);
          this.bowls.set(o.id, img);
        }
        img.setPosition(pos.x, pos.y - 2).setDepth(this.scene.depthAt(o.x, o.y) + 0.5);
      }
    for (const [id, img] of this.bowls)
      if (!bowlIds.has(id)) {
        img.destroy();
        this.bowls.delete(id);
      }

    // Adopted cats roam your farm (and show off on a friend's farm).
    const adopted = new Set(st.kitty?.adopted ?? []);
    for (const cat of adopted) if (!this.roamers.has(cat)) this.roamers.set(cat, new Roamer(this.scene, cat, () => this.state));
    for (const [cat, r] of this.roamers)
      if (!adopted.has(cat)) {
        r.destroy();
        this.roamers.delete(cat);
      }
  }

  private animate(): void {
    for (const s of this.onGoodie.values()) {
      const alt = `${s.base}#1`;
      if (!hasArt(alt)) continue;
      s.frame = !s.frame;
      s.img.setTexture(texture(this.scene, s.frame ? alt : s.base));
    }
  }
}

function pet(scene: FarmScene, img: Phaser.GameObjects.Image, cat: string): void {
  sfx.purr(1.5);
  scene.burst(hasArt('fx:purr') ? 'fx:purr' : 'fx:heart', 5, img.x, img.y - 22);
  scene.tweens.add({ targets: img, scaleY: (1 / RES) * 0.9, scaleX: (1 / RES) * 1.06, duration: 140, yoyo: true, repeat: 2 });
  S.dispatch({ type: 'petKitty', cat }, { quiet: true });
}

/** An adopted cat wandering the farm: trot, sit, nap. */
class Roamer {
  img: Phaser.GameObjects.Image;
  private x: number;
  private y: number;
  private timer?: Phaser.Time.TimerEvent;
  private tween?: Phaser.Tweens.Tween;
  private pose = 'sit';
  private walking = false;
  private frame = false;
  private loop: Phaser.Time.TimerEvent;

  constructor(
    private scene: FarmScene,
    private cat: string,
    private state: () => FarmState,
  ) {
    const n = state().size;
    this.x = 1 + Math.random() * (n - 2);
    this.y = 1 + Math.random() * (n - 2);
    this.img = scene.add.image(0, 0, texture(scene, `cat:${cat}:sit`)).setOrigin(0.5, 1).setScale(1 / RES);
    this.img.setInteractive({ useHandCursor: true });
    this.img.on('pointerdown', (_p: unknown, _x: number, _y: number, ev: Phaser.Types.Input.EventData) => {
      if (tools.tool !== 'hand') return;
      ev.stopPropagation();
      this.tween?.stop();
      this.walking = false;
      this.setPose('sit');
      if (S.visit) {
        sfx.purr(1.2);
        scene.burst('fx:heart', 4, this.img.x, this.img.y - 22);
      } else pet(scene, this.img, cat);
    });
    this.place();
    this.loop = scene.time.addEvent({ delay: 3500 + Math.random() * 2500, loop: true, callback: () => this.think() });
    this.timer = scene.time.addEvent({ delay: 600, loop: true, callback: () => this.flip() });
  }

  private place(): void {
    this.img.setPosition(this.scene.tileToWorld(this.x, this.y).x, this.scene.tileToWorld(this.x, this.y).y + 16);
    this.img.setDepth(this.scene.depthAt(this.x, this.y) + 0.35);
  }

  private setPose(p: string): void {
    this.pose = p;
    this.frame = false;
    this.img.setTexture(texture(this.scene, `cat:${this.cat}:${p}`));
  }

  private flip(): void {
    const alt = `cat:${this.cat}:${this.pose}#1`;
    if (!hasArt(alt) || (this.pose !== 'walk' && this.pose !== 'sleep' && this.pose !== 'play')) return;
    this.frame = !this.frame;
    this.img.setTexture(texture(this.scene, this.frame ? alt : `cat:${this.cat}:${this.pose}`));
  }

  private think(): void {
    if (this.walking) return;
    const r = Math.random();
    if (r < 0.25) return this.setPose('sleep');
    if (r < 0.4) return this.setPose('loaf');
    if (r < 0.5) return this.setPose('play');
    const n = this.state().size;
    const tx = Math.max(0.5, Math.min(n - 0.5, this.x + (Math.random() - 0.5) * 6));
    const ty = Math.max(0.5, Math.min(n - 0.5, this.y + (Math.random() - 0.5) * 6));
    const dist = Math.hypot(tx - this.x, ty - this.y);
    const from = this.scene.tileToWorld(this.x, this.y).x;
    this.img.setFlipX(this.scene.tileToWorld(tx, ty).x > from);
    this.walking = true;
    this.setPose('walk');
    this.tween = this.scene.tweens.add({
      targets: this,
      x: tx,
      y: ty,
      duration: dist * 650,
      onUpdate: () => this.place(),
      onComplete: () => {
        this.walking = false;
        this.setPose(Math.random() < 0.5 ? 'sit' : 'loaf');
      },
    });
  }

  destroy(): void {
    this.loop.remove();
    this.timer?.remove();
    this.tween?.stop();
    this.img.destroy();
  }
}

// ---------------------------------------------------------------------------
// The Kitty Corner panel

function openKittyCorner(): void {
  let off = () => {};
  const m = openModal('Kitty Corner', { icon: hasArt('icon:paw') ? artURL('icon:paw') : undefined, onClose: () => off() });
  const render = () => {
    const st = S.state;
    const k = st.kitty;
    const now = S.now();
    const body: HTMLElement[] = [];

    // Food
    const food = k?.food && k.food.until > now ? k.food : null;
    const foodRow = h('div', { class: 'kitty-food' });
    if (!hasBowl(st)) {
      foodRow.append(
        h('img', { class: 'ico big', src: artURL('deco:kitty_bowl') }),
        h('div', { class: 'grow' }, h('div', { class: 'title' }, 'Put out a Kitty Food Bowl'), h('div', { class: 'sub' }, 'Cats only visit farms with food. Find bowls and goodies in Market › Decor › Kitty Corner.')),
        h('button', { class: 'btn green', onclick: () => (m.close(), openShop('decor')) }, 'Shop 🛒'),
      );
    } else {
      foodRow.append(
        h('img', { class: 'ico big', src: artURL(food ? 'kitty:food_full' : 'deco:kitty_bowl') }),
        h(
          'div',
          { class: 'grow' },
          h('div', { class: 'title' }, food ? `Bowls full of ${KITTY_FOODS.find((f) => f.id === food.kind)?.name ?? 'food'}` : 'The bowls are empty'),
          h('div', { class: 'sub' }, food ? `${fmtDuration(food.until - now)} left. Cats drop by every half hour.` : 'Fill them up and see who comes to play!'),
        ),
      );
      const choices = h('div', { class: 'kitty-foods' });
      for (const f of KITTY_FOODS) {
        const tooFull = !!food && food.until - now > 3600_000;
        choices.append(
          h(
            'button',
            {
              class: 'btn small',
              disabled: tooFull,
              title: f.fancy ? 'Fancy food: rare cats might visit their favorite goodie!' : `Lasts ${f.hours} hours`,
              onclick: () => S.dispatch({ type: 'feedKitties', food: f.id }),
            },
            h('img', { class: 'ico', src: iconURL(f.id) }),
            `${f.name} · ${f.fish ? `${f.fish} fish` : `${f.coins}🪙`}${f.fancy ? ' ✨' : ''}`,
          ),
        );
      }
      foodRow.append(choices);
    }
    body.push(foodRow);

    // Gifts
    const p = pendingVisits(st, now, S.allEvents);
    if (p.length) {
      const coins = p.reduce((a, [slot, cat]) => a + giftFor(st, slot, cat), 0);
      body.push(
        h(
          'div',
          { class: 'kitty-gifts' },
          h('div', { class: 'grow' }, h('div', { class: 'title' }, `🎁 ${p.length} visit${p.length === 1 ? '' : 's'} while you were busy`), h('div', { class: 'sub' }, `The kitties left ${coins} coins and lots of fur.`)),
          h('button', { class: 'btn green', onclick: () => S.dispatch({ type: 'collectKitties' }) }, 'Collect 🐾'),
        ),
      );
    }

    // Visiting now
    const v = kittyVisitors(st, now, S.allEvents);
    const here = Object.entries(v);
    body.push(h('h3', null, here.length ? '🐾 Visiting right now (tap them on your farm to pet!)' : '🐾 Nobody visiting right now'));
    if (here.length)
      body.push(
        h(
          'div',
          { class: 'kitty-now' },
          ...here.map(([objId, cat]) => {
            const obj = st.objects[objId];
            const goodie = obj && obj.kind === 'deco' ? obj.def : '';
            return h('div', { class: 'kitty-chip' }, h('img', { src: catIcon(cat) }), h('div', null, h('b', null, KITTIES[cat].name), h('div', { class: 'sub' }, `on the ${nameOf(goodie)}`)));
          }),
        ),
      );

    // Album
    const visitingNow = new Set(Object.values(v));
    const known = (id: string) => (k?.met[id] ?? 0) > 0 || (k?.hearts[id] ?? 0) > 0 || !!k?.adopted.includes(id) || visitingNow.has(id);
    const met = KITTY_LIST.filter((c) => known(c.id)).length;
    body.push(h('h3', null, `📒 Cat Album · ${met} / ${KITTY_LIST.length} met · ${k?.adopted.length ?? 0} / ${MAX_ADOPTED} adopted`));
    const grid = h('div', { class: 'kitty-album' });
    for (const c of KITTY_LIST) {
      const n = k?.met[c.id] ?? 0;
      const adopted = k?.adopted.includes(c.id);
      const fav = GOODIES[c.favorite] ? GOODIES[c.favorite].name : nameOf(c.favorite);
      if (!known(c.id)) {
        grid.append(
          h(
            'div',
            { class: 'kitty-card unknown' },
            h('img', { src: catIcon(c.id), class: 'silhouette' }),
            h('div', { class: 'name' }, '???'),
            h('div', { class: 'sub' }, c.rare ? `✨ Rare. Loves the ${fav} and fancy food` : c.event ? '🎉 Festival visitor' : `Loves the ${fav}`),
          ),
        );
        continue;
      }
      const hs = k?.hearts[c.id] ?? 0;
      grid.append(
        h(
          'div',
          { class: `kitty-card${c.rare ? ' rare' : ''}${adopted ? ' home' : ''}` },
          h('img', { src: catIcon(c.id) }),
          h('div', { class: 'name' }, c.name),
          h('div', { class: 'hearts', title: `${hs} hearts` }, hearts(hs)),
          h('div', { class: 'sub' }, c.personality),
          h('div', { class: 'sub' }, `Favorite: ${fav} · ${n} visit${n === 1 ? '' : 's'}`),
          visitingNow.has(c.id) ? h('div', { class: 'tag' }, '🐾 Visiting now!') : null,
          adopted
            ? h('div', { class: 'tag' }, '🏡 Lives on your farm')
            : canAdopt(st, c.id)
              ? h('button', { class: 'btn green small', onclick: () => S.dispatch({ type: 'adoptKitty', cat: c.id }) }, 'Adopt 💕')
              : null,
        ),
      );
    }
    body.push(grid);
    m.body.replaceChildren(...body);
  };
  render();
  off = S.onChange(render);
}

function showAdopted(cat: string): void {
  const c = KITTIES[cat];
  if (!c) return;
  const m = openModal('A Forever Home!', { narrow: true });
  m.body.append(
    h(
      'div',
      { class: 'catch-card' },
      h('div', { class: 'catch-burst r4' }, h('img', { src: catIcon(cat), class: 'catch-img' })),
      h('div', { class: 'catch-name' }, `${c.name} moved in!`),
      h('div', { class: 'catch-note' }, `“${c.personality}”`),
      h('div', { class: 'catch-meta' }, 'Adopted cats roam your farm. Pet them every day for a little thank-you!'),
      h('button', { class: 'btn green', onclick: () => m.close() }, 'Welcome home! 🐾'),
    ),
  );
}
