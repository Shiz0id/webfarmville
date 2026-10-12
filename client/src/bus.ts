// A tiny typed event bus connecting the Phaser scene and the DOM UI.

export interface HoverInfo {
  x: number;
  y: number;
  title: string;
  lines: string[];
}

export interface BusEvents {
  toast: [message: string, kind?: 'info' | 'error' | 'good'];
  hover: [info: HoverInfo | null];
  /** Fly an icon from a screen position to a HUD element. */
  fly: [icon: string, x: number, y: number, target: 'coins' | 'xp' | 'barn'];
  openBuilding: [id: string];
  openFarmhouse: [];
  openSeedPicker: [plotId: string | null];
  tool: [];
  snapshot: [];
  mama: [];
  levelUp: [level: number];
  questReady: [quest: string];
}

type Handler<K extends keyof BusEvents> = (...args: BusEvents[K]) => void;

class Bus {
  private handlers = new Map<keyof BusEvents, Set<(...args: never[]) => void>>();

  on<K extends keyof BusEvents>(event: K, fn: Handler<K>): () => void {
    let set = this.handlers.get(event);
    if (!set) this.handlers.set(event, (set = new Set()));
    set.add(fn as (...args: never[]) => void);
    return () => set!.delete(fn as (...args: never[]) => void);
  }

  emit<K extends keyof BusEvents>(event: K, ...args: BusEvents[K]): void {
    for (const fn of this.handlers.get(event) ?? []) (fn as Handler<K>)(...args);
  }
}

export const bus = new Bus();
