import { bus } from './bus';

export type Tool = 'hand' | 'harvest' | 'plow' | 'seed' | 'water' | 'move' | 'store' | 'sell' | 'place' | 'vehicle';

export interface PlaceMode {
  def: string;
  source: 'shop' | 'inventory';
  /** Buying a baby animal rather than a grown-up. */
  baby?: boolean;
}

export const tools: {
  tool: Tool;
  seed: string;
  place: PlaceMode | null;
  /** Object being moved by the move tool. */
  moving: string | null;
  flip: boolean;
  /** The vehicle being driven with the 'vehicle' tool. */
  vehicle: string;
} = {
  tool: 'hand',
  seed: 'strawberry',
  place: null,
  moving: null,
  flip: false,
  vehicle: 'tractor',
};

export function setTool(tool: Tool, opts: { seed?: string; place?: PlaceMode; vehicle?: string } = {}): void {
  tools.tool = tool;
  if (opts.vehicle) tools.vehicle = opts.vehicle;
  tools.moving = null;
  tools.place = tool === 'place' ? (opts.place ?? null) : null;
  if (opts.seed) tools.seed = opts.seed;
  if (tool !== 'place' && tool !== 'move') tools.flip = false;
  bus.emit('tool');
}
