// Farm vehicles (FarmVille 1). Each one works a whole patch of the farm in a
// single tap and burns one unit of fuel; the tank slowly refills by itself.

export type VehicleJob = 'plow' | 'plant' | 'harvest';

export interface VehicleDef {
  id: string;
  name: string;
  em: string;
  job: VehicleJob;
  /** Works an n×n patch. */
  size: number;
  level: number;
  cost: number;
  blurb: string;
}

export const VEHICLE_LIST: VehicleDef[] = [
  {
    id: 'tractor',
    name: 'Tractor',
    em: '🚜',
    job: 'plow',
    size: 2,
    level: 4,
    cost: 1200,
    blurb: 'Plows a 2×2 patch of grass in one go (each plot still costs its usual 15 coins).',
  },
  {
    id: 'seeder',
    name: 'Seeder',
    em: '🌱',
    job: 'plant',
    size: 2,
    level: 5,
    cost: 1500,
    blurb: 'Plants your chosen seeds in every empty plot of a 2×2 patch.',
  },
  {
    id: 'harvester',
    name: 'Harvester',
    em: '🌾',
    job: 'harvest',
    size: 3,
    level: 6,
    cost: 2000,
    blurb: 'Harvests every ripe crop in a 3×3 patch.',
  },
];

export const VEHICLES: Record<string, VehicleDef> = Object.fromEntries(VEHICLE_LIST.map((v) => [v.id, v]));

/** How much fuel the shared tank holds. */
export const FUEL_MAX = 12;
/** The tank refills one unit every this many ms. */
export const FUEL_REFILL = 10 * 60_000;

/** Top-left tile of the patch a vehicle works when aimed at (x, y). */
export function vehicleOrigin(def: Pick<VehicleDef, 'size'>, x: number, y: number): { x: number; y: number } {
  const back = Math.floor((def.size - 1) / 2);
  return { x: x - back, y: y - back };
}
