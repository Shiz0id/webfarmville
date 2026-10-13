// The villagers' farms on the server. Everyone starts as neighbors with all of
// them, so visiting, helping and gifting work from day one. Farms are rebuilt
// whenever their layout version changes, so new decoration sets show up for
// returning players too. (The layouts themselves live in @farm/shared.)

import { NPC_NEIGHBORS, NPC_USERNAME, VILLAGER_FARMS, refreshNpcFarm } from '@farm/shared';
import type { DB } from './db';
import { insertFarm, loadFarm, saveFarm, userByName } from './repo';

export { NPC_USERNAME, refreshNpcFarm };

/** Create or update every villager farm, and make every farmer their neighbor. Returns the Mayor's id. */
export function ensureNpcs(db: DB, now: number): { mayorId: number; ids: number[] } {
  const ids: number[] = [];
  let mayorId = 0;
  for (const npc of VILLAGER_FARMS) {
    let user = userByName(db, npc.username);
    if (!user) {
      db.prepare("INSERT INTO users (username, pass_hash, salt, is_npc, created_at, last_seen) VALUES (?, '', '', 1, ?, ?)").run(
        npc.username,
        now,
        now,
      );
      user = userByName(db, npc.username)!;
      insertFarm(db, user.id, npc.build(now), now);
    } else {
      const farm = loadFarm(db, user.id);
      if (farm.state.stats.showcase !== npc.version) saveFarm(db, user.id, npc.build(now), now);
      else if (refreshNpcFarm(farm.state, now)) saveFarm(db, user.id, farm.state, now);
    }
    ids.push(user.id);
    if (npc.username === NPC_USERNAME) mayorId = user.id;
    db.prepare(
      `INSERT OR IGNORE INTO friendships (requester, addressee, status, created_at)
       SELECT ?, id, 'accepted', ? FROM users WHERE is_npc = 0`,
    ).run(user.id, now);
  }
  return { mayorId, ids };
}

export { NPC_NEIGHBORS };
