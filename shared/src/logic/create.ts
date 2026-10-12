import { START_SIZE } from '../content/progression';
import type { FarmObject, FarmState, ObjectSeed } from '../types';
import { refreshQuests } from './quests';

type Seed = ObjectSeed;

/** A brand-new farm with a cottage, a few plots, a hen and an apple tree. */
export function createFarm(name: string, now: number): FarmState {
  const seeds: Seed[] = [
    { kind: 'building', def: 'farmhouse', x: 1, y: 1, queue: [] },
    { kind: 'deco', def: 'mailbox', x: 4, y: 3 },
    { kind: 'deco', def: 'path_stone', x: 4, y: 4 },
    { kind: 'deco', def: 'path_stone', x: 5, y: 4 },
    { kind: 'deco', def: 'tulips_red', x: 1, y: 4 },
    { kind: 'deco', def: 'tulips_yellow', x: 2, y: 4 },
    { kind: 'deco', def: 'round_bush', x: 4, y: 1 },
    { kind: 'deco', def: 'picket_fence', x: 7, y: 9 },
    { kind: 'deco', def: 'picket_fence', x: 8, y: 9 },
    { kind: 'deco', def: 'scarecrow', x: 10, y: 6 },
    // Three almost-ripe strawberry plots and three empty ones for the tutorial.
    { kind: 'plot', x: 7, y: 5, crop: 'strawberry', plantedAt: now - 50_000 },
    { kind: 'plot', x: 8, y: 5, crop: 'strawberry', plantedAt: now - 50_000 },
    { kind: 'plot', x: 9, y: 5, crop: 'strawberry', plantedAt: now - 50_000 },
    { kind: 'plot', x: 7, y: 6 },
    { kind: 'plot', x: 8, y: 6 },
    { kind: 'plot', x: 9, y: 6 },
    { kind: 'animal', def: 'chicken', x: 2, y: 8, cycleStart: now - 600_000 },
    { kind: 'tree', def: 'apple_tree', x: 11, y: 2, cycleStart: now - 2_400_000 },
  ];

  const objects: Record<string, FarmObject> = {};
  seeds.forEach((s, i) => {
    const id = `o${i + 1}`;
    objects[id] = { ...s, id } as FarmObject;
  });

  const state: FarmState = {
    version: 1,
    name,
    coins: 300,
    xp: 0,
    level: 1,
    size: START_SIZE,
    nextId: seeds.length + 1,
    objects,
    inventory: {},
    quests: { active: [], completed: [], baselines: {} },
    stats: {},
    daily: { last: null, streak: 0 },
    lastSeed: 'strawberry',
    createdAt: now,
  };
  refreshQuests(state, []);
  return state;
}
