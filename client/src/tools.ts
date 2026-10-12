import { bus } from './bus';

export type Tool = 'hand' | 'plow' | 'seed' | 'move' | 'store' | 'sell' | 'place';

export interface PlaceMode {
  def: string;
  source: 'shop' | 'inventory';
}

export const tools: {
  tool: Tool;
  seed: string;
  place: PlaceMode | null;
  /** Object being moved by the move tool. */
  moving: string | null;
  flip: boolean;
} = {
  tool: 'hand',
  seed: 'strawberry',
  place: null,
  moving: null,
  flip: false,
};

export function setTool(tool: Tool, opts: { seed?: string; place?: PlaceMode } = {}): void {
  tools.tool = tool;
  tools.moving = null;
  tools.place = tool === 'place' ? (opts.place ?? null) : null;
  if (opts.seed) tools.seed = opts.seed;
  if (tool !== 'place' && tool !== 'move') tools.flip = false;
  bus.emit('tool');
}
