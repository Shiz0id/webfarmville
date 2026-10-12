// The villagers' farms. Everyone starts as neighbors with all of them, so
// visiting, helping and gifting work from day one, and each farm doubles as a
// themed showcase of decorations. Farms are rebuilt whenever their layout
// version changes, so new decoration sets show up for returning players too.

import {
  CROPS,
  NPC_NEIGHBORS,
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

/** Collects objects for a showcase farm, skipping anything that doesn't fit. */
class Layout {
  readonly state: FarmState;
  private n = 0;
  private seed: number;

  constructor(
    name: string,
    size: number,
    private now: number,
    seed: number,
  ) {
    this.state = createFarm(name, now);
    this.state.size = size;
    this.state.level = 25;
    this.state.objects = {};
    this.seed = seed;
  }

  rand(): number {
    this.seed = (this.seed * 1103515245 + 12345) & 0x7fffffff;
    return this.seed / 0x7fffffff;
  }

  add(seed: ObjectSeed): boolean {
    const { w, h } = footprint(seed as FarmObject);
    if (!canPlace(this.state, seed.x, seed.y, w, h)) return false;
    const id = `n${++this.n}`;
    this.state.objects[id] = { ...seed, id } as FarmObject;
    return true;
  }

  deco(def: string, x: number, y: number): boolean {
    return this.add({ kind: 'deco', def, x, y });
  }

  building(def: string, x: number, y: number): void {
    this.add({ kind: 'building', def, x, y, queue: [] });
  }

  /** A line of decorations, cycling through `defs`. */
  line(defs: string[], x: number, y: number, dx: number, dy: number, count: number): void {
    for (let i = 0; i < count; i++) this.deco(defs[i % defs.length], x + dx * i, y + dy * i);
  }

  field(crops: string[], x0: number, y0: number, w: number, h: number): void {
    for (let x = x0; x < x0 + w; x++)
      for (let y = y0; y < y0 + h; y++) this.add({ kind: 'plot', x, y, crop: crops[(x + y) % crops.length] });
  }

  animals(defs: string[], x0: number, y0: number, w: number): void {
    defs.forEach((def, i) => this.add({ kind: 'animal', def, x: x0 + (i % w) * 2, y: y0 + Math.floor(i / w) * 2, cycleStart: this.now }));
  }

  trees(defs: string[], x0: number, y0: number, dx: number, dy: number): void {
    defs.forEach((def, i) => this.add({ kind: 'tree', def, x: x0 + dx * i, y: y0 + dy * i, cycleStart: this.now }));
  }

  /** Sprinkle decorations onto random free tiles. */
  scatter(defs: string[], count: number): void {
    let placed = 0;
    for (let tries = 0; placed < count && tries < count * 40; tries++) {
      const def = defs[Math.floor(this.rand() * defs.length)];
      const x = Math.floor(this.rand() * this.state.size);
      const y = Math.floor(this.rand() * this.state.size);
      if (this.deco(def, x, y)) placed++;
    }
  }

  finish(version: number): FarmState {
    this.state.nextId = this.n + 1;
    this.state.stats.showcase = version;
    refreshNpcFarm(this.state, this.now);
    return this.state;
  }
}

const FLOWERS = ['tulips_red', 'tulips_yellow', 'tulips_pink', 'tulips_purple', 'roses_pink', 'hyacinths', 'daisies', 'pansies'];

interface NpcFarm {
  username: string;
  version: number;
  build: (now: number) => FarmState;
}

const FARMS: NpcFarm[] = [
  {
    username: 'Mayor_Maple',
    version: 2,
    build: (now) => {
      const f = new Layout("Mayor Maple's Meadow", 22, now, 11);
      f.building('farmhouse', 2, 2);
      f.building('mill', 7, 1);
      f.building('bakery', 10, 1);
      f.building('cafe', 13, 1);
      f.deco('fountain', 9, 9);
      f.deco('gazebo', 15, 15);
      f.deco('koi_pond', 3, 15);
      f.deco('cherry_blossom', 6, 15);
      f.deco('weeping_willow', 18, 17);
      f.deco('hot_air_balloon', 18, 1);
      f.deco('well', 6, 6);
      f.deco('flower_arch', 10, 13);
      f.deco('bench_white', 12, 11);
      f.deco('bench_white', 8, 11);
      f.deco('street_lamp', 8, 8);
      f.deco('street_lamp', 11, 8);
      // Halloween corner
      f.deco('haunted_house', 1, 6);
      f.deco('pumpkin_arch', 4, 6);
      f.deco('ghost_lantern', 4, 8);
      f.deco('pumpkin_tower', 5, 5);
      f.deco('friendly_ghost', 12, 6);
      f.deco('bubbling_cauldron', 3, 9);
      f.deco('glow_mushrooms', 1, 9);
      f.deco('jack_o_lantern', 6, 8);
      f.line(['path_cobble'], 0, 10, 1, 0, 22);
      f.line(['path_cobble'], 10, 4, 0, 1, 6);
      f.line(FLOWERS, 0, 21, 1, 0, 18);
      f.field(['wheat', 'corn', 'sunflower', 'pumpkin', 'strawberry', 'lavender', 'candy_corn'], 14, 4, 6, 4);
      f.trees(['apple_tree', 'cherry_tree', 'peach_tree', 'orange_tree', 'maple_tree'], 1, 12, 2, 0);
      f.animals(['cow', 'sheep', 'chicken', 'pig', 'goat', 'duck', 'rabbit', 'chicken'], 14, 11, 4);
      f.scatter(['garden_gnome', 'birdbath', 'tea_set', 'picnic_blanket', 'garden_lantern', 'round_bush'], 10);
      return f.finish(2);
    },
  },
  {
    username: 'Rosie_Bunny',
    version: 1,
    build: (now) => {
      const f = new Layout("Rosie's Blossom Garden", 18, now, 22);
      f.building('farmhouse', 1, 1);
      f.deco('glass_greenhouse', 6, 1);
      f.deco('wisteria_arch', 9, 8);
      f.deco('sakura_arch', 9, 4);
      f.deco('flower_cart', 12, 2);
      f.deco('herb_spiral', 13, 12);
      f.deco('hanami_picnic', 4, 12);
      f.deco('butterfly_bush', 7, 9);
      f.deco('topiary_bunny', 3, 6);
      f.deco('bunny_statue', 6, 6);
      f.deco('smiling_sunflower_pot', 9, 6);
      f.deco('tiered_plant_stand', 12, 6);
      f.deco('bench_white', 11, 9);
      f.line(['path_flower'], 9, 0, 0, 1, 18);
      f.line(FLOWERS, 0, 17, 1, 0, 18);
      f.line(['lilac_bush', 'hydrangea_pink', 'hydrangea_blue', 'azalea'], 0, 9, 1, 0, 9);
      f.line(['roses_pink', 'roses_red', 'roses_white'], 10, 9, 1, 0, 8);
      f.field(['lavender', 'sunflower', 'strawberry'], 12, 14, 6, 2);
      f.trees(['cherry_tree', 'peach_tree'], 15, 4, 0, 3);
      f.animals(['rabbit', 'rabbit', 'beehive'], 2, 14, 3);
      f.scatter(['cherry_blossom', 'magnolia_tree', 'potted_fern', 'bee_hotel', 'ladybug_house', 'moss_ball', 'orchid_stand'], 12);
      return f.finish(1);
    },
  },
  {
    username: 'Grandma_Fern',
    version: 1,
    build: (now) => {
      const f = new Layout("Fern's Cozy Cottage", 18, now, 33);
      f.building('farmhouse', 2, 2);
      f.building('jam_kitchen', 7, 2);
      f.building('loom', 10, 2);
      f.deco('laundry_line', 2, 7);
      f.deco('rocking_chair', 5, 5);
      f.deco('tea_set', 6, 6);
      f.deco('cat_tower', 1, 6);
      f.deco('dog_house', 6, 8);
      f.deco('bird_feeder', 9, 6);
      f.deco('well', 12, 7);
      f.deco('outdoor_bookshelf', 4, 9);
      f.deco('pie_rack', 8, 8);
      f.deco('apple_crate', 9, 9);
      f.deco('autumn_oak', 14, 1);
      f.deco('wagon_wheel', 13, 4);
      f.deco('hammock', 14, 10);
      f.line(['picket_fence'], 0, 11, 1, 0, 18);
      f.field(['strawberry', 'blueberry', 'cranberry', 'pumpkin'], 1, 13, 8, 3);
      f.trees(['apple_tree', 'cherry_tree', 'maple_tree', 'apple_tree'], 11, 13, 2, 0);
      f.animals(['sheep', 'sheep', 'goat', 'chicken'], 11, 16, 4);
      f.scatter(['fruit_hedge', 'lilac_bush', 'roses_white', 'barrel_planter', 'garden_gnome', 'potted_fern', 'pansies'], 14);
      return f.finish(1);
    },
  },
  {
    username: 'Penny_Pig',
    version: 1,
    build: (now) => {
      const f = new Layout("Penny's Market Farm", 22, now, 44);
      f.building('farmhouse', 1, 1);
      f.deco('red_barn', 5, 1);
      f.deco('grain_silo', 9, 1);
      f.building('bakery', 11, 1);
      f.building('juice_bar', 14, 1);
      f.deco('vintage_tractor', 9, 5);
      f.deco('flower_truck', 13, 5);
      f.deco('farm_stand', 17, 5);
      f.deco('windpump', 19, 2);
      f.line(['path_dirt'], 0, 7, 1, 0, 22);
      f.field(['wheat', 'corn', 'carrot', 'tomato', 'potato'], 1, 9, 9, 5);
      f.field(['pumpkin', 'watermelon', 'sunflower', 'cotton', 'rice'], 12, 9, 9, 5);
      f.line(['scarecrow', 'hay_bale', 'haystack'], 1, 15, 3, 0, 7);
      f.animals(['pig', 'pig', 'pig', 'cow', 'cow'], 2, 17, 5);
      f.trees(['orange_tree', 'lemon_tree', 'banana_tree', 'coconut_palm'], 14, 17, 2, 0);
      f.scatter(['apple_crate', 'milk_cans', 'wheelbarrow', 'hay_bale', 'signpost', 'barrel_planter'], 10);
      return f.finish(1);
    },
  },
  {
    username: 'Henrietta_Hen',
    version: 1,
    build: (now) => {
      const f = new Layout("Henrietta's Hen House", 18, now, 55);
      f.building('farmhouse', 1, 1);
      f.building('dairy', 6, 1);
      f.deco('chicken_coop', 9, 2);
      f.deco('chicken_coop', 11, 2);
      f.deco('water_tower', 14, 1);
      f.deco('duck_pond', 12, 8);
      f.deco('bunny_hutch', 2, 7);
      f.deco('weathervane', 5, 5);
      f.deco('haystack', 8, 6);
      f.line(['log_fence'], 0, 5, 1, 0, 4);
      f.line(['log_fence'], 0, 16, 1, 0, 18);
      f.animals(['chicken', 'chicken', 'chicken', 'chicken', 'chicken', 'chicken'], 3, 9, 3);
      f.animals(['duck', 'duck', 'duck'], 12, 11, 3);
      f.animals(['cow', 'cow', 'sheep', 'sheep', 'goat', 'goat'], 1, 13, 6);
      f.field(['wheat', 'corn'], 10, 13, 8, 2);
      f.scatter(['hay_bale', 'milk_cans', 'bird_feeder', 'round_bush', 'daisies', 'wheelbarrow'], 12);
      return f.finish(1);
    },
  },
];

/**
 * Keep villager farms looking lively: anything harvestable or withered is
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
        o.plantedAt = now - (CROPS[o.crop]?.growSec ?? 600) * 1000 * phase;
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

/** Create or update every villager farm, and make every farmer their neighbor. Returns the Mayor's id. */
export function ensureNpcs(db: DB, now: number): { mayorId: number; ids: number[] } {
  const ids: number[] = [];
  let mayorId = 0;
  for (const npc of FARMS) {
    let user = userByName(db, npc.username);
    if (!user) {
      db.prepare("INSERT INTO users (username, pass_hash, salt, is_npc, created_at, last_seen) VALUES (?, '', '', 1, ?, ?)").run(
        npc.username,
        now,
        now,
      );
      user = userByName(db, npc.username)!;
      insertFarm(db, user.id, npc.build(now), now);
    } else {
      const farm = loadFarm(db, user.id);
      if (farm.state.stats.showcase !== npc.version) saveFarm(db, user.id, npc.build(now), now);
      else if (refreshNpcFarm(farm.state, now)) saveFarm(db, user.id, farm.state, now);
    }
    ids.push(user.id);
    if (npc.username === NPC_USERNAME) mayorId = user.id;
    db.prepare(
      `INSERT OR IGNORE INTO friendships (requester, addressee, status, created_at)
       SELECT ?, id, 'accepted', ? FROM users WHERE is_npc = 0`,
    ).run(user.id, now);
  }
  return { mayorId, ids };
}

export { NPC_NEIGHBORS };
