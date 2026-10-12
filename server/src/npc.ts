// Mayor Maple: a friendly NPC neighbor everyone starts with, so visiting,
// helping and gifting work from day one. Her farm doubles as a showcase.

import {
  CROPS,
  canPlace,
  createFarm,
  cropStatus,
  footprint,
  producerStatus,
  type FarmObject,
  type FarmState,
  type ObjectSeed,
} from '@farm/shared';
import type { DB } from './db';
import { insertFarm, loadFarm, saveFarm, userByName } from './repo';

export const NPC_USERNAME = 'Mayor_Maple';

type Seed = ObjectSeed;

function showcaseFarm(now: number): FarmState {
  const state = createFarm("Mayor Maple's Meadow", now);
  state.size = 22;
  state.level = 20;
  state.objects = {};
  const seeds: Seed[] = [
    { kind: 'building', def: 'farmhouse', x: 2, y: 2, queue: [] },
    { kind: 'building', def: 'mill', x: 7, y: 1, queue: [] },
    { kind: 'building', def: 'bakery', x: 10, y: 1, queue: [] },
    { kind: 'building', def: 'cafe', x: 13, y: 1, queue: [] },
    { kind: 'deco', def: 'fountain', x: 9, y: 9 },
    { kind: 'deco', def: 'gazebo', x: 15, y: 15 },
    { kind: 'deco', def: 'koi_pond', x: 3, y: 15 },
    { kind: 'deco', def: 'cherry_blossom', x: 6, y: 15 },
    { kind: 'deco', def: 'cherry_blossom', x: 2, y: 17 },
    { kind: 'deco', def: 'weeping_willow', x: 18, y: 17 },
    { kind: 'deco', def: 'hot_air_balloon', x: 18, y: 2 },
    { kind: 'deco', def: 'well', x: 6, y: 6 },
    { kind: 'deco', def: 'flower_arch', x: 10, y: 13 },
    { kind: 'deco', def: 'bench_white', x: 12, y: 11 },
    { kind: 'deco', def: 'bench_white', x: 8, y: 11 },
    { kind: 'deco', def: 'street_lamp', x: 8, y: 8 },
    { kind: 'deco', def: 'street_lamp', x: 11, y: 9 },
    { kind: 'deco', def: 'jack_o_lantern', x: 5, y: 5 },
    { kind: 'deco', def: 'pumpkin_pile', x: 6, y: 5 },
    { kind: 'deco', def: 'friendly_ghost', x: 12, y: 6 },
    { kind: 'deco', def: 'cornucopia', x: 7, y: 5 },
    { kind: 'deco', def: 'garden_gnome', x: 5, y: 9 },
    { kind: 'deco', def: 'birdbath', x: 13, y: 13 },
    { kind: 'deco', def: 'picnic_blanket', x: 12, y: 15 },
    { kind: 'deco', def: 'tea_set', x: 14, y: 14 },
  ];
  // Paths through the middle of the farm.
  for (let i = 0; i < 22; i++) {
    if (i !== 9 && i !== 10) seeds.push({ kind: 'deco', def: 'path_cobble', x: i, y: 10 });
  }
  for (let y = 5; y < 9; y++) seeds.push({ kind: 'deco', def: 'path_cobble', x: 10, y });
  // Flower borders.
  const flowers = ['tulips_red', 'tulips_yellow', 'tulips_pink', 'tulips_purple', 'roses_pink', 'hyacinths'];
  for (let x = 0; x < 18; x++) seeds.push({ kind: 'deco', def: flowers[x % flowers.length], x, y: 21 });
  for (let x = 0; x < 6; x++) seeds.push({ kind: 'deco', def: 'picket_fence', x, y: 7 });
  // Crop field.
  const crops = ['wheat', 'corn', 'sunflower', 'pumpkin', 'strawberry', 'lavender'];
  for (let x = 14; x < 20; x++)
    for (let y = 4; y < 8; y++) seeds.push({ kind: 'plot', x, y, crop: crops[(x + y) % crops.length] });
  // Orchard and animals.
  const trees = ['apple_tree', 'cherry_tree', 'peach_tree', 'orange_tree', 'maple_tree'];
  trees.forEach((def, i) => seeds.push({ kind: 'tree', def, x: 1 + i * 2, y: 12, cycleStart: now }));
  const animals = ['cow', 'sheep', 'chicken', 'chicken', 'pig', 'goat', 'duck', 'rabbit'];
  animals.forEach((def, i) => seeds.push({ kind: 'animal', def, x: 14 + (i % 4), y: 11 + Math.floor(i / 4) * 2, cycleStart: now }));

  let n = 0;
  for (const s of seeds) {
    const { w, h } = footprint(s as FarmObject);
    if (!canPlace(state, s.x, s.y, w, h)) continue;
    const id = `n${++n}`;
    state.objects[id] = { ...s, id } as FarmObject;
  }
  state.nextId = n + 1;
  refreshNpcFarm(state, now);
  return state;
}

/**
 * Keep the Mayor's farm looking lively: anything harvestable or withered is
 * replanted part-way through its cycle so visitors always have something to help.
 */
export function refreshNpcFarm(state: FarmState, now: number): boolean {
  let changed = false;
  let i = 0;
  for (const o of Object.values(state.objects)) {
    i++;
    const phase = 0.15 + ((i * 37) % 60) / 100; // spread growth stages
    if (o.kind === 'plot' && o.crop) {
      const s = cropStatus(o, now).stage;
      if (o.plantedAt === undefined || s === 'ready' || s === 'withered') {
        o.plantedAt = now - CROPS[o.crop].growSec * 1000 * phase;
        delete o.fertilized;
        changed = true;
      }
    } else if ((o.kind === 'tree' || o.kind === 'animal') && (producerStatus(o, now).ready || o.helped)) {
      o.cycleStart = now - 1000 * 60 * 5 * phase;
      delete o.helped;
      changed = true;
    }
  }
  return changed;
}

export function ensureNpc(db: DB, now: number): number {
  const existing = userByName(db, NPC_USERNAME);
  if (existing) {
    const farm = loadFarm(db, existing.id);
    if (refreshNpcFarm(farm.state, now)) saveFarm(db, existing.id, farm.state, now);
    return existing.id;
  }
  const res = db
    .prepare("INSERT INTO users (username, pass_hash, salt, is_npc, created_at, last_seen) VALUES (?, '', '', 1, ?, ?)")
    .run(NPC_USERNAME, now, now);
  const id = Number(res.lastInsertRowid);
  insertFarm(db, id, showcaseFarm(now), now);
  return id;
}
