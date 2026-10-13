// Client-side game state with optimistic updates.
//
// Every action runs through the shared reducer immediately so the farm feels
// instant, and is queued for the server. When the server answers with its
// authoritative state, any actions still in flight are replayed on top of it.

import { GameError, applyAction, farmFromSnapshot, type Action, type FarmSnapshot, type FarmState, type GameEvent, type TimedAction } from '@farm/shared';
import { ApiError, api, setToken, type MePayload, type SocialPayload, type VisitPayload } from './api';

export interface Visit {
  owner: { username: string; isNpc: boolean };
  state: FarmState;
  helpsLeft: number;
  giftSent: boolean;
  /** A farm from an invite link: when it was shared. */
  sharedAt?: number;
}

type Listener = () => void;
type EventListener = (events: GameEvent[]) => void;
type ErrorListener = (message: string) => void;
type ActionListener = (action: Action) => void;

const FLUSH_DELAY = 250;
const SOCIAL_POLL = 15_000;

export class Store {
  username: string;
  allEvents: boolean;
  /** Last state confirmed by the server. */
  private confirmed: FarmState;
  rev: number;
  /** What the player sees: confirmed + in-flight + pending actions. */
  state: FarmState;
  private inflight: TimedAction[] = [];
  private pending: TimedAction[] = [];
  private offset: number;
  private flushTimer: number | undefined;
  private retryDelay = 1000;

  visit: Visit | null = null;
  social: SocialPayload | null = null;

  private listeners = new Set<Listener>();
  private eventListeners = new Set<EventListener>();
  private errorListeners = new Set<ErrorListener>();
  private actionListeners = new Set<ActionListener>();

  constructor(me: MePayload) {
    this.username = me.user.username;
    this.allEvents = me.allEvents;
    this.confirmed = me.state;
    this.state = me.state;
    this.rev = me.rev;
    this.offset = me.serverTime - Date.now();
    window.setInterval(() => void this.refreshSocial(), SOCIAL_POLL);
    window.addEventListener('beforeunload', () => {
      if (this.pending.length) void this.flush();
    });
  }

  /** Server-aligned current time. */
  now(): number {
    return Date.now() + this.offset;
  }

  /** The farm currently on screen (yours or the neighbor's you're visiting). */
  get viewed(): FarmState {
    return this.visit?.state ?? this.state;
  }

  get isVisiting(): boolean {
    return this.visit !== null;
  }

  get busy(): boolean {
    return this.pending.length > 0 || this.inflight.length > 0;
  }

  onChange(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  onEvents(fn: EventListener): () => void {
    this.eventListeners.add(fn);
    return () => this.eventListeners.delete(fn);
  }

  onError(fn: ErrorListener): () => void {
    this.errorListeners.add(fn);
    return () => this.errorListeners.delete(fn);
  }

  onAction(fn: ActionListener): () => void {
    this.actionListeners.add(fn);
    return () => this.actionListeners.delete(fn);
  }

  private emit(): void {
    for (const fn of this.listeners) fn();
  }

  private emitEvents(events: GameEvent[]): void {
    if (events.length) for (const fn of this.eventListeners) fn(events);
  }

  error(message: string): void {
    for (const fn of this.errorListeners) fn(message);
  }

  private syncClock(serverTime: number): void {
    // Smooth out jitter; never jump by more than a few seconds per response.
    const target = serverTime - Date.now();
    this.offset += Math.max(-5000, Math.min(5000, target - this.offset)) * 0.5;
  }

  /** Try an action locally. Returns false (and reports why) if it isn't allowed. */
  dispatch(action: Action, opts: { quiet?: boolean } = {}): boolean {
    if (this.visit) {
      if (!opts.quiet) this.error("You're visiting a neighbor. Head home to do that!");
      return false;
    }
    const t = this.now();
    try {
      const { state, events } = applyAction(this.state, action, { now: t, allEvents: this.allEvents });
      this.state = state;
      this.pending.push({ ...action, t } as TimedAction);
      this.scheduleFlush();
      this.emit();
      for (const fn of this.actionListeners) fn(action);
      this.emitEvents(events);
      return true;
    } catch (err) {
      if (!(err instanceof GameError)) throw err;
      if (!opts.quiet) this.error(err.message);
      return false;
    }
  }

  /** Would this action succeed right now? (No side effects.) */
  check(action: Action): string | null {
    try {
      applyAction(this.state, action, { now: this.now(), allEvents: this.allEvents });
      return null;
    } catch (err) {
      if (err instanceof GameError) return err.message;
      throw err;
    }
  }

  private scheduleFlush(delay = FLUSH_DELAY): void {
    if (this.flushTimer !== undefined) return;
    this.flushTimer = window.setTimeout(() => {
      this.flushTimer = undefined;
      void this.flush();
    }, delay);
  }

  private replay(): void {
    let state = this.confirmed;
    const kept: TimedAction[] = [];
    for (const list of [this.inflight, this.pending]) {
      for (const a of list) {
        try {
          state = applyAction(state, a, { now: a.t, allEvents: this.allEvents }).state;
          if (list === this.pending) kept.push(a);
        } catch {
          /* drop actions the authoritative state no longer allows */
        }
      }
    }
    this.pending = kept;
    this.state = state;
  }

  async flush(): Promise<void> {
    if (this.inflight.length || !this.pending.length) return;
    this.inflight = this.pending;
    this.pending = [];
    try {
      const res = await api.actions(this.inflight);
      this.retryDelay = 1000;
      this.syncClock(res.serverTime);
      this.confirmed = res.state;
      this.rev = res.rev;
      this.inflight = [];
      if (!res.ok) {
        // The server disagreed (usually a timing edge case). Trust it.
        this.error(res.error ?? 'Something got out of sync');
      }
      this.replay();
      this.emit();
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) return this.logout();
      if (err instanceof ApiError && err.status >= 400 && err.status < 500) {
        this.inflight = [];
        this.error(err.message);
        this.replay();
        this.emit();
      } else {
        // Network trouble: put the batch back and retry with backoff.
        this.pending = [...this.inflight, ...this.pending];
        this.inflight = [];
        this.retryDelay = Math.min(this.retryDelay * 2, 30_000);
        this.scheduleFlush(this.retryDelay);
        return;
      }
    }
    if (this.pending.length) this.scheduleFlush();
  }

  /** Replace our confirmed state with one the server sent from another endpoint. */
  adoptServerState(state: FarmState, rev: number): void {
    if (rev < this.rev) return;
    this.confirmed = state;
    this.rev = rev;
    this.replay();
    this.emit();
  }

  async refreshSocial(): Promise<void> {
    try {
      this.social = await api.social();
      if (this.social.rev !== this.rev && !this.busy) {
        const me = await api.me();
        if (!this.busy) {
          this.syncClock(me.serverTime);
          this.adoptServerState(me.state, me.rev);
        }
      }
      this.emit();
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) this.logout();
    }
  }

  // --- visiting ----------------------------------------------------------------

  private applyVisit(v: VisitPayload): void {
    this.syncClock(v.serverTime);
    this.visit = { owner: v.owner, state: v.state, helpsLeft: v.helpsLeft, giftSent: v.giftSent, sharedAt: v.sharedAt };
    if (v.myState && v.myRev !== undefined) this.adoptServerState(v.myState, v.myRev);
  }

  async startVisit(username: string): Promise<void> {
    await this.flush();
    try {
      this.applyVisit(await api.visit(username));
      this.emit();
    } catch (err) {
      this.error((err as Error).message);
    }
  }

  /** Stroll around a farm from an invite link (a look-only visit: there's no one to help). */
  async viewSnapshot(snap: FarmSnapshot): Promise<void> {
    await this.flush();
    this.visit = { owner: { username: snap.by, isNpc: false }, state: farmFromSnapshot(snap, this.now()), helpsLeft: 0, giftSent: true, sharedAt: snap.at };
    this.emit();
  }

  endVisit(): void {
    this.visit = null;
    this.emit();
    void this.refreshSocial();
  }

  private helping = new Set<string>();

  async help(objectId: string): Promise<void> {
    const visit = this.visit;
    // A quick double tap would send the same help twice, and the second one fails.
    if (!visit || this.helping.has(objectId)) return;
    this.helping.add(objectId);
    try {
      const res = await api.help(visit.owner.username, objectId);
      if (this.visit !== visit) return;
      this.syncClock(res.serverTime);
      visit.state = res.state;
      visit.helpsLeft = res.helpsLeft;
      this.adoptServerState(res.myState, res.myRev);
      const obj = res.state.objects[objectId];
      this.emitEvents(res.events.map((e) => (e.type === 'gain' && obj ? { ...e, x: obj.x + 0.5, y: obj.y + 0.5 } : e)));
      this.emit();
    } catch (err) {
      this.error((err as Error).message);
    } finally {
      this.helping.delete(objectId);
    }
  }

  async sendGift(username: string, gift: string): Promise<boolean> {
    try {
      const res = await api.sendGift(username, gift);
      this.adoptServerState(res.myState, res.myRev);
      if (this.visit?.owner.username === username) this.visit.giftSent = true;
      await this.refreshSocial();
      return true;
    } catch (err) {
      this.error((err as Error).message);
      return false;
    }
  }

  private claiming = new Set<number>();

  /** Accept a gift; true once it's in the barn. A second tap while one is in flight is ignored. */
  async claimGift(id: number): Promise<boolean> {
    if (this.claiming.has(id)) return false;
    this.claiming.add(id);
    await this.flush();
    try {
      const res = await api.claimGift(id);
      this.adoptServerState(res.state, res.rev);
      await this.refreshSocial();
      return true;
    } catch (err) {
      this.error((err as Error).message);
      return false;
    } finally {
      this.claiming.delete(id);
    }
  }

  async logout(): Promise<void> {
    await api.logout().catch(() => {});
    setToken(null);
    location.reload();
  }
}
