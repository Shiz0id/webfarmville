// Which seasonal events are running right now, as far as the client's visuals go.
import { EVENTS, EVENT_FEATURES, EVENT_FEATURE_LIST, isEventActive, type EventFeature } from '@farm/shared';

/** `?event=winter` previews an event's look and feel any time of year. */
function forcedEvent(): string | null {
  return new URLSearchParams(location.search).get('event');
}

export function activeFeatures(now: number, allEvents = false): EventFeature[] {
  const forced = forcedEvent();
  return EVENT_FEATURE_LIST.filter((f) => f.event === forced || allEvents || isEventActive(EVENTS[f.event], now)).sort(
    (a, b) => a.priority - b.priority,
  );
}

/** The event that sets the mood (music, visitors, costumes) when several overlap. */
export function featuredEvent(now: number, allEvents = false): EventFeature | null {
  const forced = forcedEvent();
  if (forced && EVENT_FEATURES[forced]) return EVENT_FEATURES[forced];
  if (allEvents) return null;
  return activeFeatures(now)[0] ?? null;
}

export function eventLive(event: string, now: number, allEvents = false): boolean {
  return forcedEvent() === event || allEvents || isEventActive(EVENTS[event], now);
}
