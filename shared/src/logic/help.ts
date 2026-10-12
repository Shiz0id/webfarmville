// Neighbor help: when visiting a friend you can give each crop, tree or animal
// one helping hand per cycle.

import { CROPS } from '../content/crops';
import { ANIMALS, TREES } from '../content/producers';
import { HELP_BOOST } from '../content/progression';
import { GameError, type FarmObject, type FarmState } from '../types';
import { cropStatus, producerStatus } from './status';

export type HelpKind = 'fertilize' | 'revive' | 'feed' | 'water';

/** What helping this object would do, or null if it can't be helped right now. */
export function helpKind(obj: FarmObject, now: number): HelpKind | null {
  if (obj.kind === 'plot') {
    const s = cropStatus(obj, now).stage;
    if (s === 'withered') return 'revive';
    if ((s === 'sprout' || s === 'growing') && !obj.fertilized) return 'fertilize';
    return null;
  }
  if (obj.kind === 'tree' || obj.kind === 'animal') {
    if (obj.helped || producerStatus(obj, now).ready) return null;
    return obj.kind === 'tree' ? 'water' : 'feed';
  }
  return null;
}

export const HELP_VERBS: Record<HelpKind, string> = {
  fertilize: 'fertilized',
  revive: 'revived',
  feed: 'fed',
  water: 'watered',
};

/** Apply a neighbor's help to `target` in place. Returns what happened. */
export function applyHelp(target: FarmState, objectId: string, now: number): { kind: HelpKind; name: string } {
  const obj = Object.hasOwn(target.objects, objectId) ? target.objects[objectId] : undefined;
  if (!obj) throw new GameError('That is gone');
  const kind = helpKind(obj, now);
  if (!kind) throw new GameError("That doesn't need help right now");
  if (obj.kind === 'plot') {
    const def = CROPS[obj.crop!];
    const grow = def.growSec * 1000;
    if (kind === 'revive') {
      obj.plantedAt = now - grow;
    } else {
      obj.plantedAt = Math.max(obj.plantedAt! - grow * HELP_BOOST, now - grow);
      obj.fertilized = true;
    }
    return { kind, name: def.name };
  }
  if (obj.kind === 'tree' || obj.kind === 'animal') {
    const def = obj.kind === 'tree' ? TREES[obj.def] : ANIMALS[obj.def];
    const cycle = def.cycleSec * 1000;
    obj.cycleStart = Math.max(obj.cycleStart - cycle * HELP_BOOST, now - cycle);
    obj.helped = true;
    return { kind, name: def.name };
  }
  throw new GameError("That doesn't need help right now");
}
