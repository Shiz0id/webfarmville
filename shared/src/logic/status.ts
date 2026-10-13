import { BUILDINGS } from '../content/buildings';
import { CROPS, witherAfterSec } from '../content/crops';
import { ANIMALS, TREES } from '../content/producers';
import { craftMs, workshopSlots } from '../content/workshops';
import type { BuildingObject, FarmState, PlotObject, ProducerObject } from '../types';

export type CropStage = 'empty' | 'sprout' | 'growing' | 'ready' | 'withered';

export interface CropStatus {
  stage: CropStage;
  /** 0..1 growth progress. */
  progress: number;
  readyAt: number;
  witherAt: number;
}

export function cropStatus(plot: PlotObject, now: number): CropStatus {
  const def = plot.crop ? CROPS[plot.crop] : undefined;
  if (!def || plot.plantedAt === undefined) return { stage: 'empty', progress: 0, readyAt: 0, witherAt: 0 };
  const readyAt = plot.plantedAt + def.growSec * 1000;
  const witherAt = readyAt + witherAfterSec(def) * 1000;
  const progress = Math.max(0, Math.min(1, (now - plot.plantedAt) / (def.growSec * 1000)));
  let stage: CropStage;
  if (now >= witherAt) stage = 'withered';
  else if (now >= readyAt) stage = 'ready';
  else stage = progress < 0.4 ? 'sprout' : 'growing';
  return { stage, progress, readyAt, witherAt };
}

export interface ProducerStatus {
  ready: boolean;
  progress: number;
  readyAt: number;
}

export function producerStatus(obj: ProducerObject, now: number): ProducerStatus {
  const def = obj.kind === 'tree' ? TREES[obj.def] : ANIMALS[obj.def];
  const cycle = (def?.cycleSec ?? 3600) * 1000;
  // A baby animal's first cycle only starts once it has grown up.
  const start = Math.max(obj.cycleStart, obj.grownAt ?? 0);
  const readyAt = start + cycle;
  return { ready: now >= readyAt, progress: Math.max(0, Math.min(1, (now - start) / cycle)), readyAt };
}

export interface BuildingStatus {
  /** Jobs finished and waiting to be collected. */
  done: number;
  /** The job currently in progress, if any. */
  active?: { recipe: string; progress: number; end: number };
  freeSlots: number;
}

export function buildingStatus(b: BuildingObject, now: number): BuildingStatus {
  const def = BUILDINGS[b.def];
  const done = b.queue.filter((j) => j.end <= now).length;
  const next = b.queue.find((j) => j.end > now);
  let active: BuildingStatus['active'];
  if (next) {
    const recipe = def?.recipes.find((r) => r.id === next.recipe);
    const dur = recipe ? craftMs(b, recipe) : 1000;
    active = { recipe: next.recipe, progress: Math.max(0, Math.min(1, 1 - (next.end - now) / dur)), end: next.end };
  }
  return { done, active, freeSlots: Math.max(0, workshopSlots(b, def) - b.queue.length) };
}

/** Anything on the farm that wants the player's attention right now. */
export function needsAttention(state: FarmState, now: number): number {
  let n = 0;
  for (const o of Object.values(state.objects)) {
    if (o.kind === 'plot') {
      const s = cropStatus(o, now).stage;
      if (s === 'ready' || s === 'withered') n++;
    } else if (o.kind === 'tree' || o.kind === 'animal') {
      if (producerStatus(o, now).ready) n++;
    } else if (o.kind === 'building') {
      if (buildingStatus(o, now).done > 0) n++;
    }
  }
  return n;
}
