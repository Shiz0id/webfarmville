import { describe, expect, it } from 'vitest';
import * as shared from '@farm/shared';

// Content is looked up by id, so two entries sharing an id in one list means
// one of them silently disappears (or worse, borrows the other's rules).
describe('content ids', () => {
  const lists = Object.entries(shared).filter(
    ([, v]) => Array.isArray(v) && v.length > 0 && v.every((x) => x && typeof x === 'object' && typeof (x as { id?: unknown }).id === 'string'),
  ) as [string, { id: string }[]][];

  it('finds the content lists', () => {
    expect(lists.map(([n]) => n)).toEqual(expect.arrayContaining(['QUEST_LIST', 'CROP_LIST', 'ITEM_LIST', 'DECORATION_LIST']));
  });

  it.each(lists)('%s has no duplicate ids', (_name, list) => {
    const seen = new Set<string>();
    const dupes = list.map((x) => x.id).filter((id) => (seen.has(id) ? true : (seen.add(id), false)));
    expect(dupes).toEqual([]);
  });
});
