import express, { type NextFunction, type Request, type Response } from 'express';
import {
  DECORATIONS,
  GIFTS,
  GameError,
  HELPS_PER_FRIEND_PER_DAY,
  HELP_REWARD,
  HELP_VERBS,
  ITEMS,
  addItem,
  addXp,
  applyAction,
  applyHelp,
  bumpStat,
  createFarm,
  farmCharm,
  refreshQuests,
  completeQuestSet,
  utcDay,
  type FarmState,
  type GameEvent,
  type TimedAction,
} from '@farm/shared';
import {
  USERNAME_RE,
  createSession,
  deleteSession,
  hashPassword,
  rateLimit,
  requireAuth,
  tokenFrom,
  verifyPassword,
} from './auth';
import { tx, type DB } from './db';
import { HttpError } from './errors';
import { NPC_USERNAME, ensureNpc, refreshNpcFarm } from './npc';
import {
  areFriends,
  giftSentToday,
  helpsUsed,
  insertFarm,
  loadFarm,
  notify,
  requireUser,
  saveFarm,
  userByName,
  type UserRow,
} from './repo';

export interface AppOptions {
  /** Make every seasonal event's decorations purchasable (handy for testing). */
  allEvents?: boolean;
  /** Override the clock (tests). */
  now?: () => number;
}

/** How far a client's action timestamp may differ from the server clock. */
const MAX_CLOCK_BEHIND = 30_000;
const MAX_CLOCK_AHEAD = 3_000;
const MAX_BATCH = 200;

function str(v: unknown, field: string): string {
  if (typeof v !== 'string' || !v) throw new HttpError(400, `Missing ${field}`);
  return v;
}

function publicUser(u: UserRow) {
  return { username: u.username, isNpc: !!u.is_npc };
}

function itemName(id: string): string {
  return ITEMS[id]?.name ?? DECORATIONS[id]?.name ?? id;
}

export function createApp(db: DB, opts: AppOptions = {}) {
  const clock = opts.now ?? Date.now;
  const ctx = (now: number) => ({ now, allEvents: opts.allEvents });
  const app = express();
  app.set('trust proxy', 1);
  app.use(express.json({ limit: '256kb' }));
  const auth = requireAuth(db);
  const npcId = ensureNpc(db, clock());

  function befriendNpc(userId: number, now: number) {
    db.prepare(
      "INSERT OR IGNORE INTO friendships (requester, addressee, status, created_at) VALUES (?, ?, 'accepted', ?)",
    ).run(npcId, userId, now);
  }

  function mePayload(user: UserRow) {
    const farm = loadFarm(db, user.id);
    return { user: publicUser(user), state: farm.state, rev: farm.rev, serverTime: clock(), allEvents: !!opts.allEvents };
  }

  // --- auth ----------------------------------------------------------------

  const limiter = rateLimit(20, 60_000);

  app.post('/api/auth/register', limiter, (req, res) => {
    const username = str(req.body?.username, 'username').trim();
    const password = str(req.body?.password, 'password');
    if (!USERNAME_RE.test(username)) throw new HttpError(400, 'Usernames are 3-16 letters, numbers or _');
    if (password.length < 6) throw new HttpError(400, 'Passwords need at least 6 characters');
    const now = clock();
    const token = tx(db, () => {
      if (userByName(db, username)) throw new HttpError(409, 'That username is taken');
      const { hash, salt } = hashPassword(password);
      const id = Number(
        db
          .prepare('INSERT INTO users (username, pass_hash, salt, created_at, last_seen) VALUES (?, ?, ?, ?, ?)')
          .run(username, hash, salt, now, now).lastInsertRowid,
      );
      insertFarm(db, id, createFarm(`${username}'s Farm`, now), now);
      befriendNpc(id, now);
      db.prepare('INSERT INTO gifts (from_id, to_id, item, qty, day, created_at) VALUES (?, ?, ?, ?, ?, ?)').run(
        npcId,
        id,
        'tulips_pink',
        1,
        utcDay(now),
        now,
      );
      notify(db, id, 'Mayor Maple welcomed you to the valley and sent you a housewarming gift!', now);
      return createSession(db, id, now);
    });
    res.json({ token, ...mePayload(userByName(db, username)!) });
  });

  app.post('/api/auth/login', limiter, (req, res) => {
    const username = str(req.body?.username, 'username').trim();
    const password = str(req.body?.password, 'password');
    const user = userByName(db, username);
    if (!user || !verifyPassword(user, password)) throw new HttpError(401, 'Wrong username or password');
    const token = createSession(db, user.id, clock());
    res.json({ token, ...mePayload(user) });
  });

  app.post('/api/auth/logout', (req, res) => {
    const token = tokenFrom(req);
    if (token) deleteSession(db, token);
    res.json({ ok: true });
  });

  // --- own farm ------------------------------------------------------------

  app.get('/api/me', auth, (req, res) => {
    res.json(mePayload(req.user!));
  });

  app.post('/api/actions', auth, (req, res) => {
    const actions = req.body?.actions as TimedAction[] | undefined;
    if (!Array.isArray(actions) || actions.length === 0 || actions.length > MAX_BATCH)
      throw new HttpError(400, 'Send 1-200 actions');
    const user = req.user!;
    const result = tx(db, () => {
      const farm = loadFarm(db, user.id);
      let state = farm.state;
      let applied = 0;
      let error: string | undefined;
      const serverNow = clock();
      for (const action of actions) {
        const t = typeof action?.t === 'number' ? action.t : serverNow;
        const now = Math.min(serverNow + MAX_CLOCK_AHEAD, Math.max(serverNow - MAX_CLOCK_BEHIND, t));
        try {
          state = applyAction(state, action, ctx(now)).state;
          applied++;
        } catch (err) {
          if (!(err instanceof GameError)) throw err;
          error = err.message;
          break;
        }
      }
      const rev = applied > 0 ? saveFarm(db, user.id, state, serverNow) : farm.rev;
      return { ok: !error, error, applied, state, rev };
    });
    res.json({ ...result, serverTime: clock() });
  });

  // --- neighbors -------------------------------------------------------------

  app.get('/api/social', auth, (req, res) => {
    const me = req.user!;
    const now = clock();
    const friends = db
      .prepare(
        `SELECT u.id, u.username, u.is_npc, u.last_seen, f.state FROM friendships fr
         JOIN users u ON u.id = CASE WHEN fr.requester = ? THEN fr.addressee ELSE fr.requester END
         JOIN farms f ON f.user_id = u.id
         WHERE (fr.requester = ? OR fr.addressee = ?) AND fr.status = 'accepted'
         ORDER BY u.is_npc DESC, u.username COLLATE NOCASE`,
      )
      .all(me.id, me.id, me.id) as { id: number; username: string; is_npc: number; last_seen: number; state: string }[];
    const pending = db
      .prepare(
        `SELECT fr.requester, fr.addressee, u1.username AS from_name, u2.username AS to_name FROM friendships fr
         JOIN users u1 ON u1.id = fr.requester JOIN users u2 ON u2.id = fr.addressee
         WHERE (fr.requester = ? OR fr.addressee = ?) AND fr.status = 'pending'`,
      )
      .all(me.id, me.id) as { requester: number; addressee: number; from_name: string; to_name: string }[];
    const gifts = db
      .prepare(
        `SELECT g.id, g.item, g.qty, g.created_at, u.username AS from_name FROM gifts g
         JOIN users u ON u.id = g.from_id WHERE g.to_id = ? AND g.claimed = 0 ORDER BY g.id`,
      )
      .all(me.id) as { id: number; item: string; qty: number; created_at: number; from_name: string }[];
    const notifications = db
      .prepare('SELECT id, text, created_at, seen FROM notifications WHERE user_id = ? ORDER BY id DESC LIMIT 30')
      .all(me.id) as { id: number; text: string; created_at: number; seen: number }[];
    const rev = (db.prepare('SELECT rev FROM farms WHERE user_id = ?').get(me.id) as { rev: number }).rev;

    res.json({
      rev,
      friends: friends.map((f) => {
        const s = JSON.parse(f.state) as FarmState;
        return {
          username: f.username,
          isNpc: !!f.is_npc,
          farmName: s.name,
          level: s.level,
          charm: farmCharm(s),
          lastSeen: f.last_seen,
          helpsLeft: Math.max(0, HELPS_PER_FRIEND_PER_DAY - helpsUsed(db, me.id, f.id, now)),
          giftSent: giftSentToday(db, me.id, f.id, now),
        };
      }),
      incoming: pending.filter((p) => p.addressee === me.id).map((p) => p.from_name),
      outgoing: pending.filter((p) => p.requester === me.id).map((p) => p.to_name),
      gifts: gifts.map((g) => ({ id: g.id, item: g.item, qty: g.qty, from: g.from_name, createdAt: g.created_at })),
      notifications: notifications.map((n) => ({ id: n.id, text: n.text, createdAt: n.created_at, seen: !!n.seen })),
    });
  });

  app.post('/api/notifications/seen', auth, (req, res) => {
    db.prepare('UPDATE notifications SET seen = 1 WHERE user_id = ?').run(req.user!.id);
    res.json({ ok: true });
  });

  app.post('/api/friends/request', auth, (req, res) => {
    const me = req.user!;
    const other = requireUser(db, str(req.body?.username, 'username').trim());
    if (other.id === me.id) throw new HttpError(400, "You can't befriend yourself (but we like the spirit)");
    const now = clock();
    const status = tx(db, () => {
      if (areFriends(db, me.id, other.id)) return 'friends';
      const theirs = db
        .prepare("SELECT 1 FROM friendships WHERE requester = ? AND addressee = ? AND status = 'pending'")
        .get(other.id, me.id);
      if (theirs) {
        db.prepare("UPDATE friendships SET status = 'accepted' WHERE requester = ? AND addressee = ?").run(other.id, me.id);
        notify(db, other.id, `${me.username} is now your neighbor!`, now);
        return 'friends';
      }
      db.prepare(
        "INSERT OR IGNORE INTO friendships (requester, addressee, status, created_at) VALUES (?, ?, 'pending', ?)",
      ).run(me.id, other.id, now);
      notify(db, other.id, `${me.username} wants to be your neighbor.`, now);
      return 'pending';
    });
    res.json({ status, username: other.username });
  });

  app.post('/api/friends/respond', auth, (req, res) => {
    const me = req.user!;
    const other = requireUser(db, str(req.body?.username, 'username').trim());
    const accept = !!req.body?.accept;
    const now = clock();
    tx(db, () => {
      const row = db
        .prepare("SELECT 1 FROM friendships WHERE requester = ? AND addressee = ? AND status = 'pending'")
        .get(other.id, me.id);
      if (!row) throw new HttpError(404, 'No request from that farmer');
      if (accept) {
        db.prepare("UPDATE friendships SET status = 'accepted' WHERE requester = ? AND addressee = ?").run(other.id, me.id);
        notify(db, other.id, `${me.username} accepted your neighbor request!`, now);
      } else {
        db.prepare('DELETE FROM friendships WHERE requester = ? AND addressee = ?').run(other.id, me.id);
      }
    });
    res.json({ ok: true });
  });

  app.post('/api/friends/remove', auth, (req, res) => {
    const me = req.user!;
    const other = requireUser(db, str(req.body?.username, 'username').trim());
    if (other.id === npcId) throw new HttpError(400, 'Mayor Maple will always be your neighbor');
    db.prepare(
      'DELETE FROM friendships WHERE (requester = ? AND addressee = ?) OR (requester = ? AND addressee = ?)',
    ).run(me.id, other.id, other.id, me.id);
    res.json({ ok: true });
  });

  // --- visiting ---------------------------------------------------------------

  function friendOrThrow(me: UserRow, username: string): UserRow {
    const other = requireUser(db, username);
    if (other.id !== me.id && !areFriends(db, me.id, other.id)) throw new HttpError(403, 'You can only visit neighbors');
    return other;
  }

  app.post('/api/farms/:username/visit', auth, (req, res) => {
    const me = req.user!;
    const other = friendOrThrow(me, String(req.params.username));
    const now = clock();
    const out = tx(db, () => {
      const target = loadFarm(db, other.id);
      if (other.is_npc && refreshNpcFarm(target.state, now)) saveFarm(db, other.id, target.state, now);
      let myState: FarmState | undefined;
      let myRev: number | undefined;
      if (other.id !== me.id) {
        const mine = loadFarm(db, me.id);
        const was = completeQuestSet(mine.state);
        bumpStat(mine.state, 'visit');
        refreshQuests(mine.state, [], was, ctx(now));
        myRev = saveFarm(db, me.id, mine.state, now);
        myState = mine.state;
      }
      return { target: target.state, myState, myRev };
    });
    res.json({
      owner: publicUser(other),
      state: out.target,
      helpsLeft: Math.max(0, HELPS_PER_FRIEND_PER_DAY - helpsUsed(db, me.id, other.id, now)),
      giftSent: giftSentToday(db, me.id, other.id, now),
      myState: out.myState,
      myRev: out.myRev,
      serverTime: now,
    });
  });

  app.post('/api/farms/:username/help', auth, (req, res) => {
    const me = req.user!;
    const other = friendOrThrow(me, String(req.params.username));
    if (other.id === me.id) throw new HttpError(400, 'Help your neighbors, not yourself!');
    const objectId = str(req.body?.objectId, 'objectId');
    const now = clock();
    const out = tx(db, () => {
      const used = helpsUsed(db, me.id, other.id, now);
      if (used >= HELPS_PER_FRIEND_PER_DAY) throw new HttpError(429, 'No helps left for this neighbor today');
      const target = loadFarm(db, other.id);
      const result = applyHelp(target.state, objectId, now);
      saveFarm(db, other.id, target.state, now);
      db.prepare(
        `INSERT INTO helps (helper, target, day, count) VALUES (?, ?, ?, 1)
         ON CONFLICT (helper, target, day) DO UPDATE SET count = count + 1`,
      ).run(me.id, other.id, utcDay(now));
      const mine = loadFarm(db, me.id);
      const events: GameEvent[] = [];
      const was = completeQuestSet(mine.state);
      mine.state.coins += HELP_REWARD.coins;
      events.push({ type: 'gain', what: 'coins', amount: HELP_REWARD.coins });
      addXp(mine.state, HELP_REWARD.xp, events);
      bumpStat(mine.state, 'help');
      refreshQuests(mine.state, events, was, ctx(now));
      const myRev = saveFarm(db, me.id, mine.state, now);
      if (!other.is_npc) notify(db, other.id, `${me.username} ${HELP_VERBS[result.kind]} your ${result.name}.`, now);
      return { target: target.state, myState: mine.state, myRev, result, events, helpsLeft: HELPS_PER_FRIEND_PER_DAY - used - 1 };
    });
    res.json({ ...out, state: out.target, serverTime: now });
  });

  // --- gifts --------------------------------------------------------------------

  app.post('/api/gifts/send', auth, (req, res) => {
    const me = req.user!;
    const other = friendOrThrow(me, str(req.body?.username, 'username'));
    if (other.id === me.id) throw new HttpError(400, "That's very generous, but no");
    const gift = GIFTS[str(req.body?.gift, 'gift')];
    if (!gift) throw new HttpError(400, 'Unknown gift');
    const now = clock();
    const out = tx(db, () => {
      if (giftSentToday(db, me.id, other.id, now)) throw new HttpError(429, 'You already sent them a gift today');
      const mine = loadFarm(db, me.id);
      if (mine.state.level < gift.level) throw new HttpError(400, `That gift unlocks at level ${gift.level}`);
      db.prepare('INSERT INTO gifts (from_id, to_id, item, qty, day, created_at) VALUES (?, ?, ?, ?, ?, ?)').run(
        me.id,
        other.id,
        gift.id,
        gift.qty,
        utcDay(now),
        now,
      );
      const was = completeQuestSet(mine.state);
      bumpStat(mine.state, 'gift');
      refreshQuests(mine.state, [], was, ctx(now));
      const myRev = saveFarm(db, me.id, mine.state, now);
      if (!other.is_npc) notify(db, other.id, `${me.username} sent you ${gift.qty}× ${itemName(gift.id)}!`, now);
      return { myState: mine.state, myRev };
    });
    res.json({ ok: true, ...out, serverTime: now });
  });

  app.post('/api/gifts/claim', auth, (req, res) => {
    const me = req.user!;
    const id = Number(req.body?.id);
    const now = clock();
    const out = tx(db, () => {
      const gift = db.prepare('SELECT * FROM gifts WHERE id = ? AND to_id = ? AND claimed = 0').get(id, me.id) as
        | { item: string; qty: number }
        | undefined;
      if (!gift) throw new HttpError(404, 'That gift is gone');
      db.prepare('UPDATE gifts SET claimed = 1 WHERE id = ?').run(id);
      const mine = loadFarm(db, me.id);
      addItem(mine.state, gift.item, gift.qty);
      const rev = saveFarm(db, me.id, mine.state, now);
      return { state: mine.state, rev };
    });
    res.json({ ok: true, ...out, serverTime: now });
  });

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, npc: NPC_USERNAME });
  });

  app.use('/api', (_req, _res, next) => next(new HttpError(404, 'Not found')));

  app.use((err: unknown, _req: Request, res: Response, next: NextFunction) => {
    if (res.headersSent) return next(err);
    if (err instanceof HttpError) return res.status(err.status).json({ error: err.message });
    if (err instanceof GameError) return res.status(400).json({ error: err.message });
    if (err instanceof SyntaxError) return res.status(400).json({ error: 'Bad JSON' });
    console.error(err);
    res.status(500).json({ error: 'Something went wrong on the farm' });
  });

  return app;
}
