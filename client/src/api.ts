import type { FarmState, GameEvent, HelpKind, TimedAction } from '@farm/shared';

const TOKEN_KEY = 'farm.token';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string | null): void {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* private mode: stay logged in for this tab only */
  }
}

async function request<T>(path: string, body?: unknown): Promise<T> {
  const token = getToken();
  let res: Response;
  try {
    res = await fetch(path, {
      method: body === undefined ? 'GET' : 'POST',
      headers: {
        'content-type': 'application/json',
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, "Can't reach the farm server");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, data.error ?? `Request failed (${res.status})`);
  return data as T;
}

export interface MePayload {
  user: { username: string; isNpc: boolean };
  state: FarmState;
  rev: number;
  serverTime: number;
  allEvents: boolean;
}

export interface ActionsPayload {
  ok: boolean;
  error?: string;
  applied: number;
  state: FarmState;
  rev: number;
  serverTime: number;
}

export interface Friend {
  username: string;
  isNpc: boolean;
  farmName: string;
  level: number;
  charm: number;
  lastSeen: number;
  helpsLeft: number;
  giftSent: boolean;
}

export interface SocialPayload {
  rev: number;
  friends: Friend[];
  incoming: string[];
  outgoing: string[];
  gifts: { id: number; item: string; qty: number; from: string; createdAt: number }[];
  notifications: { id: number; text: string; createdAt: number; seen: boolean }[];
}

export interface VisitPayload {
  owner: { username: string; isNpc: boolean };
  state: FarmState;
  helpsLeft: number;
  giftSent: boolean;
  myState?: FarmState;
  myRev?: number;
  serverTime: number;
}

export interface HelpPayload {
  state: FarmState;
  myState: FarmState;
  myRev: number;
  helpsLeft: number;
  result: { kind: HelpKind; name: string };
  events: GameEvent[];
  serverTime: number;
}

export const api = {
  register: (username: string, password: string) =>
    request<MePayload & { token: string }>('/api/auth/register', { username, password }),
  login: (username: string, password: string) =>
    request<MePayload & { token: string }>('/api/auth/login', { username, password }),
  logout: () => request<{ ok: true }>('/api/auth/logout', {}),
  me: () => request<MePayload>('/api/me'),
  actions: (actions: TimedAction[]) => request<ActionsPayload>('/api/actions', { actions }),
  social: () => request<SocialPayload>('/api/social'),
  seenNotifications: () => request('/api/notifications/seen', {}),
  requestFriend: (username: string) =>
    request<{ status: 'pending' | 'friends'; username: string }>('/api/friends/request', { username }),
  respondFriend: (username: string, accept: boolean) => request('/api/friends/respond', { username, accept }),
  removeFriend: (username: string) => request('/api/friends/remove', { username }),
  visit: (username: string) => request<VisitPayload>(`/api/farms/${encodeURIComponent(username)}/visit`, {}),
  help: (username: string, objectId: string) =>
    request<HelpPayload>(`/api/farms/${encodeURIComponent(username)}/help`, { objectId }),
  sendGift: (username: string, gift: string) =>
    request<{ ok: true; myState: FarmState; myRev: number }>('/api/gifts/send', { username, gift }),
  claimGift: (id: number) => request<{ ok: true; state: FarmState; rev: number }>('/api/gifts/claim', { id }),
};
