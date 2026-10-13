// Farm invite links: a farm packed into a short code that fits in a URL, so a
// player can share their farm anywhere (a chat message, a Discord post) and a
// friend can stroll around it without any server.
//
// Only what you can see travels: the land, where everything stands, how far the
// crops have grown and the farm cats. Objects are grouped by what they are and
// their tiles are delta-coded, so rows of plots and fences pack down to almost
// nothing before compression.

import { CROPS } from '../content/crops';
import { BUILDINGS } from '../content/buildings';
import { DECORATIONS } from '../content/decorations';
import { KITTIES, MAX_ADOPTED } from '../content/kitties';
import { ANIMALS, TREES } from '../content/producers';
import { START_SIZE, EXPANSIONS } from '../content/progression';
import { MAX_WORKSHOP_LEVEL } from '../content/workshops';
import { createFarm } from './create';
import { footprint } from './catalog';
import { cropStatus, producerStatus } from './status';
import type { FarmObject, FarmState, ObjectSeed } from '../types';

/** A farm as an invite link carries it. */
export interface FarmSnapshot {
  /** The farmer who shared it. */
  by: string;
  name: string;
  level: number;
  size: number;
  /** When it was shared (ms). */
  at: number;
  cats: string[];
  /** [what, tile, tile, ...]: tiles are y*size+x, sorted, each after the first stored as the gap from the one before. */
  groups: [string, ...number[]][];
}

const MAX_SIZE = Math.max(START_SIZE, ...EXPANSIONS.map((e) => e.size));
const MAX_OBJECTS = 3000;
const CROP_STEPS = 4;

/** What an object looks like, as a short key ("p:corn:2", "d:gnome:f", ...). */
function lookKey(obj: FarmObject, now: number): string {
  switch (obj.kind) {
    case 'plot': {
      const st = cropStatus(obj, now);
      if (st.stage === 'empty') return 'p';
      // Withered crops travel as ripe ones: nobody needs to see that.
      const step = st.stage === 'ready' || st.stage === 'withered' ? CROP_STEPS : Math.min(CROP_STEPS - 1, Math.floor(st.progress * CROP_STEPS));
      return `p:${obj.crop}:${step}`;
    }
    case 'tree':
    case 'animal':
      return `${obj.kind[0]}:${obj.def}:${producerStatus(obj, now).ready ? 1 : 0}`;
    case 'building':
      return `b:${obj.def}:${obj.level ?? 1}`;
    case 'deco':
      return obj.flip ? `d:${obj.def}:f` : `d:${obj.def}`;
  }
}

export function snapshotFarm(state: FarmState, by: string, now: number): FarmSnapshot {
  const tiles = new Map<string, number[]>();
  for (const obj of Object.values(state.objects)) {
    const key = lookKey(obj, now);
    let list = tiles.get(key);
    if (!list) tiles.set(key, (list = []));
    list.push(obj.y * state.size + obj.x);
  }
  const groups: FarmSnapshot['groups'] = [...tiles].map(([key, list]) => {
    list.sort((a, b) => a - b);
    return [key, ...list.map((t, i) => (i ? t - list[i - 1] : t))];
  });
  return {
    by,
    name: state.name,
    level: state.level,
    size: state.size,
    at: now,
    cats: [...(state.kitty?.adopted ?? [])],
    groups,
  };
}

/** Turn an object key back into an object, or null if it isn't one this game knows. */
function fromKey(key: string, now: number): ObjectSeed | null {
  const [k, def, extra] = key.split(':');
  if (k === 'p') {
    if (def === undefined) return { kind: 'plot', x: 0, y: 0 };
    const crop = Object.hasOwn(CROPS, def) ? CROPS[def] : undefined;
    const step = Number(extra);
    if (!crop || !Number.isInteger(step) || step < 0 || step > CROP_STEPS) return null;
    // Just short of the step's end, so a ripe crop is ripe and a sprout is a sprout.
    const grown = step === CROP_STEPS ? 1 : (step + 0.5) / CROP_STEPS;
    return { kind: 'plot', x: 0, y: 0, crop: def, plantedAt: now - grown * crop.growSec * 1000 };
  }
  if (k === 't' || k === 'a') {
    const table = k === 't' ? TREES : ANIMALS;
    const pdef = Object.hasOwn(table, def) ? table[def] : undefined;
    if (!pdef) return null;
    const cycle = pdef.cycleSec * 1000;
    return { kind: k === 't' ? 'tree' : 'animal', def, x: 0, y: 0, cycleStart: now - (extra === '1' ? cycle : cycle / 2) };
  }
  if (k === 'b') {
    if (!Object.hasOwn(BUILDINGS, def)) return null;
    const level = Math.max(1, Math.min(MAX_WORKSHOP_LEVEL, Math.floor(Number(extra)) || 1));
    return { kind: 'building', def, x: 0, y: 0, queue: [], ...(level > 1 ? { level } : {}) };
  }
  if (k === 'd') {
    if (!Object.hasOwn(DECORATIONS, def)) return null;
    return { kind: 'deco', def, x: 0, y: 0, ...(extra === 'f' ? { flip: true } : {}) };
  }
  return null;
}

/**
 * A visitable farm from a snapshot. Links come from anywhere, so everything is
 * checked: unknown things are skipped, and nothing may overlap or leave the land.
 */
export function farmFromSnapshot(snap: FarmSnapshot, now: number): FarmState {
  const state = createFarm(snap.name, now);
  state.level = snap.level;
  state.size = snap.size;
  state.objects = {};
  const taken = new Set<number>();
  let n = 0;
  for (const [key, ...gaps] of snap.groups) {
    const proto = fromKey(key, now);
    if (!proto) continue;
    const { w, h } = footprint(proto as FarmObject);
    let tile = 0;
    for (let i = 0; i < gaps.length && n < MAX_OBJECTS; i++) {
      tile = i ? tile + gaps[i] : gaps[i];
      const x = tile % snap.size;
      const y = Math.floor(tile / snap.size);
      if (x + w > snap.size || y + h > snap.size) continue;
      const cover: number[] = [];
      for (let dy = 0; dy < h; dy++) for (let dx = 0; dx < w; dx++) cover.push((y + dy) * snap.size + x + dx);
      if (cover.some((t) => taken.has(t))) continue;
      for (const t of cover) taken.add(t);
      const id = `s${++n}`;
      state.objects[id] = { ...proto, x, y, id } as FarmObject;
    }
  }
  state.nextId = n + 1;
  if (snap.cats.length)
    state.kitty = { hearts: {}, met: {}, adopted: snap.cats, petDay: {}, visitDay: {}, collectedUntil: now };
  return state;
}

// --- the code itself ---------------------------------------------------------

const toBase64Url = (bytes: Uint8Array): string => {
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

const fromBase64Url = (text: string): Uint8Array => {
  const bin = atob(text.replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
};

async function pipe(bytes: Uint8Array, stream: CompressionStream | DecompressionStream): Promise<Uint8Array> {
  const out = new Response(new Blob([bytes as Uint8Array<ArrayBuffer>]).stream().pipeThrough(stream));
  return new Uint8Array(await out.arrayBuffer());
}

const canCompress = () => typeof CompressionStream === 'function' && typeof DecompressionStream === 'function';

/** The snapshot as URL-safe text: "z" + deflated JSON, or "j" + plain JSON where the browser can't compress. */
export async function encodeFarm(snap: FarmSnapshot): Promise<string> {
  const json = JSON.stringify([1, snap.by, snap.name, snap.level, snap.size, Math.round(snap.at / 1000), snap.cats, snap.groups]);
  const bytes = new TextEncoder().encode(json);
  if (canCompress()) return 'z' + toBase64Url(await pipe(bytes, new CompressionStream('deflate-raw')));
  return 'j' + toBase64Url(bytes);
}

const text = (v: unknown, max: number): string | null => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null);
const int = (v: unknown): v is number => Number.isInteger(v);

/** Read a farm code. Returns null for anything that isn't a farm. */
export async function decodeFarm(code: string): Promise<FarmSnapshot | null> {
  try {
    if (code.length > 60_000) return null;
    let bytes = fromBase64Url(code.slice(1));
    if (code[0] === 'z') {
      if (!canCompress()) return null;
      bytes = await pipe(bytes, new DecompressionStream('deflate-raw'));
    } else if (code[0] !== 'j') return null;
    if (bytes.length > 400_000) return null;
    const data: unknown = JSON.parse(new TextDecoder().decode(bytes));
    if (!Array.isArray(data) || data[0] !== 1) return null;
    const [, by, name, level, size, at, cats, groups] = data as unknown[];
    const snap: FarmSnapshot = {
      by: text(by, 16) ?? 'A farmer',
      name: text(name, 40) ?? 'A Farm',
      level: int(level) ? Math.max(1, Math.min(999, level)) : 1,
      size: int(size) ? Math.max(START_SIZE, Math.min(MAX_SIZE, size)) : START_SIZE,
      at: int(at) ? at * 1000 : 0,
      cats: Array.isArray(cats)
        ? [...new Set(cats.filter((c): c is string => typeof c === 'string' && Object.hasOwn(KITTIES, c)))].slice(0, MAX_ADOPTED)
        : [],
      groups: [],
    };
    if (!Array.isArray(groups)) return null;
    for (const g of groups) {
      if (!Array.isArray(g) || typeof g[0] !== 'string') continue;
      const tiles = g.slice(1);
      if (!tiles.every((t) => int(t) && t >= 0)) continue;
      snap.groups.push([g[0], ...(tiles as number[])]);
    }
    return snap;
  } catch {
    return null;
  }
}
