/**
 * Index a content list by id. The result has no prototype, so ids that arrive
 * from the network ("constructor", "__proto__", ...) can never match anything
 * but real content.
 */
export function table<T extends { id: string }>(list: T[]): Record<string, T> {
  const out = Object.create(null) as Record<string, T>;
  for (const item of list) out[item.id] = item;
  return out;
}
