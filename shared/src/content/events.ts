// Seasonal events. Event decorations can only be bought while their event is
// running (like Animal Crossing's seasonal items); once placed they stay forever.

export interface EventDef {
  id: string;
  name: string;
  /** Inclusive [month, day] window, months 1-12. Windows may wrap the new year. */
  start: [number, number];
  end: [number, number];
  color: string;
}

export const EVENT_LIST: EventDef[] = [
  { id: 'lunar_new_year', name: 'Lunar New Year', start: [1, 15], end: [2, 20], color: '#d7263d' },
  { id: 'valentines', name: "Valentine's Day", start: [2, 1], end: [2, 20], color: '#ff6f91' },
  { id: 'st_patricks', name: "St. Patrick's Day", start: [3, 1], end: [3, 20], color: '#2fa84f' },
  { id: 'spring', name: 'Spring Egg Hunt', start: [3, 15], end: [4, 30], color: '#a78bfa' },
  { id: 'summer', name: 'Summer Festival', start: [6, 15], end: [8, 31], color: '#ffb703' },
  { id: 'harvest', name: 'Harvest Festival', start: [9, 15], end: [11, 30], color: '#d97706' },
  { id: 'halloween', name: 'Halloween', start: [10, 1], end: [11, 2], color: '#f97316' },
  { id: 'diwali', name: 'Festival of Lights', start: [10, 10], end: [11, 15], color: '#facc15' },
  { id: 'winter', name: 'Winter Holidays', start: [12, 1], end: [12, 31], color: '#38bdf8' },
  { id: 'new_year', name: 'New Year', start: [12, 26], end: [1, 7], color: '#c084fc' },
];

export const EVENTS: Record<string, EventDef> = Object.fromEntries(EVENT_LIST.map((e) => [e.id, e]));

const key = (m: number, d: number) => m * 100 + d;

export function isEventActive(ev: EventDef, now: number): boolean {
  const date = new Date(now);
  const today = key(date.getUTCMonth() + 1, date.getUTCDate());
  const s = key(...ev.start);
  const e = key(...ev.end);
  return s <= e ? today >= s && today <= e : today >= s || today <= e;
}

export function activeEvents(now: number): EventDef[] {
  return EVENT_LIST.filter((ev) => isEventActive(ev, now));
}
