// Data access helpers shared by the route modules.

import { keepLevel, utcDay, type FarmState } from '@farm/shared';
import type { DB } from './db';
import { HttpError } from './errors';

export interface UserRow {
  id: number;
  username: string;
  pass_hash: string;
  salt: string;
  is_npc: number;
  created_at: number;
  last_seen: number;
}

export interface FarmRow {
  state: FarmState;
  rev: number;
}

export function userByName(db: DB, username: string): UserRow | undefined {
  return db.prepare('SELECT * FROM users WHERE username = ?').get(username) as UserRow | undefined;
}

export function userById(db: DB, id: number): UserRow | undefined {
  return db.prepare('SELECT * FROM users WHERE id = ?').get(id) as UserRow | undefined;
}

export function requireUser(db: DB, username: string): UserRow {
  const user = userByName(db, username);
  if (!user) throw new HttpError(404, `No farmer named "${username}"`);
  return user;
}

export function loadFarm(db: DB, userId: number): FarmRow {
  const row = db.prepare('SELECT state, rev FROM farms WHERE user_id = ?').get(userId) as
    | { state: string; rev: number }
    | undefined;
  if (!row) throw new HttpError(404, 'Farm not found');
  const state = JSON.parse(row.state) as FarmState;
  keepLevel(state);
  return { state, rev: row.rev };
}

export function saveFarm(db: DB, userId: number, state: FarmState, now: number): number {
  db.prepare('UPDATE farms SET state = ?, rev = rev + 1, updated_at = ? WHERE user_id = ?').run(
    JSON.stringify(state),
    now,
    userId,
  );
  return (db.prepare('SELECT rev FROM farms WHERE user_id = ?').get(userId) as { rev: number }).rev;
}

export function insertFarm(db: DB, userId: number, state: FarmState, now: number): void {
  db.prepare('INSERT INTO farms (user_id, state, rev, updated_at) VALUES (?, ?, 1, ?)').run(
    userId,
    JSON.stringify(state),
    now,
  );
}

export function areFriends(db: DB, a: number, b: number): boolean {
  return !!db
    .prepare(
      `SELECT 1 FROM friendships WHERE status = 'accepted'
       AND ((requester = ? AND addressee = ?) OR (requester = ? AND addressee = ?))`,
    )
    .get(a, b, b, a);
}

export function notify(db: DB, userId: number, text: string, now: number): void {
  db.prepare('INSERT INTO notifications (user_id, text, created_at) VALUES (?, ?, ?)').run(userId, text, now);
  // Keep only the 50 most recent notifications per player.
  db.prepare(
    `DELETE FROM notifications WHERE user_id = ? AND id NOT IN
     (SELECT id FROM notifications WHERE user_id = ? ORDER BY id DESC LIMIT 50)`,
  ).run(userId, userId);
}

export function helpsUsed(db: DB, helper: number, target: number, now: number): number {
  const row = db
    .prepare('SELECT count FROM helps WHERE helper = ? AND target = ? AND day = ?')
    .get(helper, target, utcDay(now)) as { count: number } | undefined;
  return row?.count ?? 0;
}

export function giftSentToday(db: DB, from: number, to: number, now: number): boolean {
  return !!db.prepare('SELECT 1 FROM gifts WHERE from_id = ? AND to_id = ? AND day = ?').get(from, to, utcDay(now));
}
