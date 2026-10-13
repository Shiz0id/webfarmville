// Farm vehicles on the client: the Garage button and panel (buy a vehicle,
// pick the Seeder's seeds, watch the fuel gauge), the 'vehicle' tool that
// works a whole patch per tap (FarmScene highlights the patch), and a little
// drive-by animation. Other features can add sections to the Garage panel.

import {
  CROP_LIST,
  CROPS,
  FUEL_MAX,
  VEHICLES,
  VEHICLE_LIST,
  fuelLevel,
  isEventActive,
  EVENTS,
  nextFuelAt,
  ownsVehicle,
  type GameEvent,
  type VehicleDef,
} from '@farm/shared';
import { RES, artURL, hasArt, iconURL, texture } from '../art';
import { bus } from '../bus';
import { sfx } from '../sfx';
import { setTool, tools } from '../tools';
import { openModal, toast } from '../ui/dom';
import { fmtDuration, fmtNum, h } from '../util';
import type { FarmScene } from '../scenes/FarmScene';
import type { Store } from '../store';
import { addHudButton, addModeHint, type FeatureContext } from './registry';

let S: Store;
let scene: FarmScene | null = null;

/** Extra sections for the Garage panel (helpers, ...). */
export interface GarageSection {
  id: string;
  render: (body: HTMLElement, rerender: () => void) => void;
  badge?: () => number;
}
const SECTIONS: GarageSection[] = [];
export function addGarageSection(section: GarageSection): void {
  if (!SECTIONS.some((s) => s.id === section.id)) SECTIONS.push(section);
}

/** Tints for the borrowed tractor sprite until each vehicle is painted. */
const TINTS: Record<string, number> = { tractor: 0xffffff, seeder: 0xa8e6a0, harvester: 0xffcf7a };

export function vehicleImg(v: VehicleDef): HTMLElement {
  if (hasArt(`icon:vehicle_${v.id}`)) return h('img', { class: 'gr-img', src: artURL(`icon:vehicle_${v.id}`), alt: '' });
  return h('div', { class: 'gr-em' }, v.em);
}

export function init(ctx: FeatureContext): void {
  S = ctx.store;
  ctx.onScene((s) => (scene = s));
  addHudButton({
    id: 'garage',
    em: '🚜',
    label: 'Garage',
    where: 'toolbar',
    onClick: () => openGarage(),
    active: () => tools.tool === 'vehicle',
    badge: () => SECTIONS.reduce((n, s) => n + (s.badge?.() ?? 0), 0),
  });
  addModeHint(() => {
    if (tools.tool !== 'vehicle' || S.visit) return null;
    const v = VEHICLES[tools.vehicle];
    if (!v) return null;
    const fuel = fuelLevel(S.state, S.now());
    const what = v.job === 'plow' ? 'plow' : v.job === 'plant' ? `plant ${CROPS[tools.seed]?.name ?? 'seeds'} in` : 'harvest';
    if (!fuel) {
      const next = nextFuelAt(S.state, S.now());
      return `⛽ Out of fuel · more in ${next ? fmtDuration(next - S.now()) : 'a moment'} · Esc to stop`;
    }
    return `${v.em} ${v.name}: tap to ${what} a ${v.size}×${v.size} patch · ⛽ ${fuel}/${FUEL_MAX} · Esc to stop`;
  });
  S.onEvents((events) => {
    for (const e of events) {
      if (e.type === 'drove') drove(e);
      else if (e.type === 'boughtVehicle') {
        sfx.levelUp();
        toast(`${VEHICLES[e.vehicle]?.em ?? '🚜'} Your new ${VEHICLES[e.vehicle]?.name ?? 'vehicle'} is parked in the Garage. Tap Drive to take it out!`, 'good');
      }
    }
  });
}

function drove(e: Extract<GameEvent, { type: 'drove' }>): void {
  sfx.swoosh();
  if (!scene) return;
  const sc = scene;
  const midY = e.y + e.size / 2;
  const from = sc.tileToWorld(e.x - 0.3, midY);
  const to = sc.tileToWorld(e.x + e.size + 0.3, midY);
  const key = hasArt(`vehicle:${e.vehicle}`) ? `vehicle:${e.vehicle}` : 'deco:vintage_tractor';
  const img = sc.add
    .image(from.x, from.y, texture(sc, key, 2, 1))
    .setOrigin(0.5, 0.85)
    .setScale(0.6 / RES)
    .setDepth(sc.depthAt(e.x + e.size, midY) + 50)
    // Painted vehicles already face their way along x; the stand-in tractor faces the other way.
    .setFlipX(key === 'deco:vintage_tractor');
  if (key === 'deco:vintage_tractor' && TINTS[e.vehicle] !== 0xffffff) img.setTint(TINTS[e.vehicle]);
  for (let i = 0; i <= e.size; i++) {
    const p = sc.tileToWorld(e.x + i, midY);
    sc.time.delayedCall(i * 160, () => sc.burst('fx:dust', 3, p.x, p.y));
  }
  sc.tweens.add({
    targets: img,
    x: to.x,
    y: to.y,
    duration: 260 * (e.size + 1),
    ease: 'Sine.easeInOut',
    onComplete: () => sc.tweens.add({ targets: img, alpha: 0, duration: 250, onComplete: () => img.destroy() }),
  });
}

function seedChoices(): typeof CROP_LIST {
  const now = S.now();
  return CROP_LIST.filter((c) => c.level <= S.state.level && (!c.event || S.allEvents || isEventActive(EVENTS[c.event], now)));
}

export function openGarage(): void {
  let timer = 0;
  const m = openModal('Garage', { icon: artURL('ui:garage'), onClose: () => window.clearInterval(timer) });
  const render = () => {
    const now = S.now();
    const fuel = fuelLevel(S.state, now);
    const next = nextFuelAt(S.state, now);
    const body = m.body;
    body.replaceChildren(
      h(
        'div',
        { class: 'gr-fuel' },
        h('span', { class: 'gr-fuel-em' }, '⛽'),
        h(
          'div',
          { class: 'gr-fuel-main' },
          h('div', { class: 'gr-fuel-label' }, `Fuel ${fuel}/${FUEL_MAX}`),
          h('div', { class: 'gr-fuel-bar' }, h('div', { style: { width: `${(fuel / FUEL_MAX) * 100}%` } })),
        ),
        h('div', { class: 'gr-fuel-sub' }, next ? `+1 in ${fmtDuration(next - now)}` : 'Tank full!'),
      ),
      h('div', { class: 'gr-note' }, 'Each drive works a whole patch and uses 1 fuel. The tank refills a little every 10 minutes. Drag still pans the farm while driving.'),
    );
    const grid = h('div', { class: 'gr-grid' });
    for (const v of VEHICLE_LIST) {
      const owned = ownsVehicle(S.state, v.id);
      const locked = S.state.level < v.level;
      const action = owned
        ? h(
            'button',
            {
              class: 'btn green',
              disabled: v.job === 'plant' && !CROPS[tools.seed],
              onclick: () => {
                setTool('vehicle', { vehicle: v.id });
                m.close();
              },
            },
            'Drive',
          )
        : h(
            'button',
            {
              class: 'btn',
              disabled: locked || S.state.coins < v.cost,
              onclick: () => {
                if (S.dispatch({ type: 'buyVehicle', vehicle: v.id })) render();
              },
            },
            locked ? `🔒 Lv ${v.level}` : h('span', null, h('img', { class: 'ico', src: iconURL('coin') }), ` ${fmtNum(v.cost)}`),
          );
      const card = h(
        'div',
        { class: `gr-card${owned ? ' owned' : ''}${locked ? ' locked' : ''}` },
        vehicleImg(v),
        h('div', { class: 'gr-name' }, v.name),
        h('div', { class: 'gr-size' }, `${v.size}×${v.size} patch`),
        h('div', { class: 'gr-blurb' }, v.blurb),
        action,
      );
      if (v.job === 'plant' && owned) {
        const seeds = h('div', { class: 'gr-seeds' });
        for (const c of seedChoices())
          seeds.append(
            h(
              'button',
              {
                class: `gr-seed${c.id === tools.seed ? ' active' : ''}`,
                title: c.name,
                onclick: () => {
                  tools.seed = c.id;
                  bus.emit('tool');
                  render();
                },
              },
              h('img', { src: iconURL(c.id), alt: c.name }),
            ),
          );
        card.insertBefore(h('div', { class: 'gr-seed-label' }, `Seeds: ${CROPS[tools.seed]?.name ?? 'pick one'}`), action);
        card.insertBefore(seeds, action);
      }
      grid.append(card);
    }
    body.append(grid);
    for (const s of SECTIONS) s.render(body, render);
  };
  render();
  timer = window.setInterval(() => {
    if (!m.body.isConnected) return window.clearInterval(timer);
    // Only the fuel line ticks; re-rendering everything would eat clicks.
    const now = S.now();
    const next = nextFuelAt(S.state, now);
    const sub = m.body.querySelector('.gr-fuel-sub');
    if (sub) sub.textContent = next ? `+1 in ${fmtDuration(next - now)}` : 'Tank full!';
  }, 1000);
}
