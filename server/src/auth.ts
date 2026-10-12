import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import type { DB } from './db';
import { HttpError } from './errors';
import { userById, type UserRow } from './repo';

const SESSION_DAYS = 60;
export const USERNAME_RE = /^[A-Za-z0-9_]{3,16}$/;

export function hashPassword(password: string, salt = randomBytes(16).toString('hex')): { hash: string; salt: string } {
  return { hash: scryptSync(password, salt, 32).toString('hex'), salt };
}

export function verifyPassword(user: UserRow, password: string): boolean {
  if (!user.pass_hash) return false; // NPCs cannot log in
  const { hash } = hashPassword(password, user.salt);
  const a = Buffer.from(hash, 'hex');
  const b = Buffer.from(user.pass_hash, 'hex');
  return a.length === b.length && timingSafeEqual(a, b);
}

export function createSession(db: DB, userId: number, now: number): string {
  const token = randomBytes(24).toString('base64url');
  db.prepare('INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)').run(
    token,
    userId,
    now + SESSION_DAYS * 86_400_000,
  );
  db.prepare('DELETE FROM sessions WHERE expires_at < ?').run(now);
  return token;
}

export function deleteSession(db: DB, token: string): void {
  db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
}

export function tokenFrom(req: Request): string | undefined {
  const header = req.headers.authorization;
  return header?.startsWith('Bearer ') ? header.slice(7) : undefined;
}

declare module 'express-serve-static-core' {
  interface Request {
    user?: UserRow;
  }
}

/** Express middleware that requires a valid session and attaches `req.user`. */
export function requireAuth(db: DB) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const token = tokenFrom(req);
    const row = token
      ? (db.prepare('SELECT user_id, expires_at FROM sessions WHERE token = ?').get(token) as
          | { user_id: number; expires_at: number }
          | undefined)
      : undefined;
    const now = Date.now();
    if (!row || row.expires_at < now) return next(new HttpError(401, 'Please log in'));
    const user = userById(db, row.user_id);
    if (!user) return next(new HttpError(401, 'Please log in'));
    if (now - user.last_seen > 60_000) db.prepare('UPDATE users SET last_seen = ? WHERE id = ?').run(now, user.id);
    req.user = user;
    next();
  };
}

/** A tiny fixed-window rate limiter keyed by IP, for login/register. */
export function rateLimit(limit: number, windowMs: number) {
  const hits = new Map<string, { count: number; reset: number }>();
  return (req: Request, _res: Response, next: NextFunction) => {
    const key = req.ip ?? 'unknown';
    const now = Date.now();
    const entry = hits.get(key);
    if (!entry || entry.reset < now) {
      hits.set(key, { count: 1, reset: now + windowMs });
      if (hits.size > 10_000) for (const [k, v] of hits) if (v.reset < now) hits.delete(k);
      return next();
    }
    if (++entry.count > limit) return next(new HttpError(429, 'Too many attempts, try again in a minute'));
    next();
  };
}
