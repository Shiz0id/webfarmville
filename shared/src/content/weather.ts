// Daily weather. It is the same for every farm on a given (UTC) day and is a
// pure function of the date, so tomorrow's forecast is always known.

import { seasonOf, type Season } from './nature';

export type Weather = 'sunny' | 'cloudy' | 'rain' | 'storm' | 'windy' | 'snow' | 'rainbow';

export interface WeatherDef {
  id: Weather;
  name: string;
  emoji: string;
  /** What it does on the farm. */
  perk: string;
  /** Crops and fish like it: rain, storms. */
  wet?: boolean;
  /** Cats look for somewhere cozy to shelter. */
  cozy?: boolean;
}

export const WEATHER: Record<Weather, WeatherDef> = {
  sunny: { id: 'sunny', name: 'Sunny', emoji: '☀️', perk: 'Clear skies: a lovely farming day.' },
  cloudy: { id: 'cloudy', name: 'Cloudy', emoji: '⛅', perk: 'Soft and grey. Fish bite a little more boldly.' },
  rain: { id: 'rain', name: 'Rainy', emoji: '🌧️', perk: 'Rain waters every crop: they grow 25% faster. Rare fish rise and kitties drop by to shelter.', wet: true, cozy: true },
  storm: { id: 'storm', name: 'Thunderstorm', emoji: '⛈️', perk: 'Crops grow 25% faster, the rarest fish come out and kitties hurry in from the storm.', wet: true, cozy: true },
  windy: { id: 'windy', name: 'Windy', emoji: '🍃', perk: 'The wind shakes the trees: +1 fruit from every tree.' },
  snow: { id: 'snow', name: 'Snowy', emoji: '❄️', perk: 'A cozy snow day: cooking gives +50% XP and kitties curl up on your goodies.', cozy: true },
  rainbow: { id: 'rainbow', name: 'Rainbow', emoji: '🌈', perk: 'Rainbow luck: +1 from every harvest!' },
};

/** Relative chances per season. A rainbow can only follow a wet day. */
const CHANCES: Record<Season, [Weather, number][]> = {
  spring: [['sunny', 40], ['cloudy', 18], ['rain', 30], ['windy', 6], ['rainbow', 6]],
  summer: [['sunny', 58], ['cloudy', 10], ['rain', 12], ['storm', 14], ['rainbow', 6]],
  autumn: [['sunny', 34], ['cloudy', 22], ['rain', 18], ['windy', 22], ['rainbow', 4]],
  winter: [['sunny', 34], ['cloudy', 24], ['snow', 42]],
};

const DAY = 24 * 3600_000;

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  h ^= h >>> 13;
  h = Math.imul(h, 0x5bd1e995);
  h ^= h >>> 15;
  return (h >>> 0) / 4294967296;
}

function roll(dayStart: number): Weather {
  const table = CHANCES[seasonOf(dayStart)];
  let r = hash(`weather:${new Date(dayStart).toISOString().slice(0, 10)}`) * table.reduce((a, [, w]) => a + w, 0);
  for (const [w, n] of table) {
    r -= n;
    if (r < 0) return w;
  }
  return table[0][0];
}

/** The weather for the UTC day containing `now`. */
export function weatherAt(now: number): Weather {
  const start = Math.floor(now / DAY) * DAY;
  const w = roll(start);
  if (w === 'rainbow' && !WEATHER[roll(start - DAY)].wet) return 'sunny';
  return w;
}

/** Today and the next few days. */
export function forecast(now: number, days = 3): { day: number; weather: Weather }[] {
  const start = Math.floor(now / DAY) * DAY;
  return Array.from({ length: days }, (_, i) => ({ day: start + i * DAY, weather: weatherAt(start + i * DAY) }));
}

/** Rare fish are more likely in wet weather: multiplies a species' weight. */
export function weatherRarityBoost(now: number, rarity: number): number {
  const w = weatherAt(now);
  const per = w === 'storm' ? 0.5 : w === 'rain' ? 0.3 : w === 'cloudy' ? 0.1 : 0;
  return 1 + per * (rarity - 1);
}

/** Extra appeal for the kitty bowl when cats are looking for shelter. */
export function weatherKittyAppeal(now: number): number {
  return WEATHER[weatherAt(now)].cozy ? 0.15 : 0;
}
