import { BUILDINGS } from '../content/buildings';
import { DECORATIONS } from '../content/decorations';
import { ANIMALS, TREES } from '../content/producers';
import type { FarmObject } from '../types';

/** Anything that can be bought from the shop and placed on the map. */
export interface Placeable {
  def: string;
  kind: 'tree' | 'animal' | 'building' | 'deco';
  name: string;
  cost: number;
  level: number;
  w: number;
  h: number;
  charm: number;
  event?: string;
  /** Not sold in the shop (starter buildings, earned keepsakes). */
  starter?: boolean;
  flat?: boolean;
  /** Price in the event's currency instead of coins. */
  tokens?: number;
}

export function placeable(def: string): Placeable | undefined {
  const t = TREES[def] ?? ANIMALS[def];
  if (t) return { def, kind: t.kind, name: t.name, cost: t.cost, level: t.level, w: 1, h: 1, charm: 0 };
  const b = BUILDINGS[def];
  if (b)
    return { def, kind: 'building', name: b.name, cost: b.cost, level: b.level, w: b.w, h: b.h, charm: b.charm, starter: b.starter };
  const d = DECORATIONS[def];
  if (d)
    return {
      def,
      kind: 'deco',
      name: d.name,
      cost: d.cost,
      level: d.level,
      w: d.w,
      h: d.h,
      charm: d.charm,
      event: d.event,
      flat: d.flat,
      tokens: d.tokens,
      ...(d.reward ? { starter: true } : {}),
    };
  return undefined;
}

export function footprint(obj: Pick<FarmObject, 'kind'> & { def?: string }): { w: number; h: number } {
  if (obj.kind === 'plot' || !obj.def) return { w: 1, h: 1 };
  const p = placeable(obj.def);
  return p ? { w: p.w, h: p.h } : { w: 1, h: 1 };
}

export function objectDef(obj: FarmObject): string | undefined {
  return obj.kind === 'plot' ? undefined : obj.def;
}
