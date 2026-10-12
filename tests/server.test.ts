import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../server/src/app';
import { openDb } from '../server/src/db';
import { NPC_USERNAME } from '../server/src/npc';

let server: Server;
let base: string;
let clock = Date.UTC(2026, 9, 12, 12, 0, 0);

beforeAll(async () => {
  const app = createApp(openDb(':memory:'), { now: () => clock });
  server = app.listen(0);
  await new Promise((r) => server.once('listening', r));
  base = `http://localhost:${(server.address() as AddressInfo).port}`;
});

afterAll(() => {
  server.close();
});

async function call(path: string, body?: unknown, token?: string) {
  const res = await fetch(base + path, {
    method: body === undefined ? 'GET' : 'POST',
    headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: res.status, body: (await res.json()) as any };
}

async function register(username: string) {
  const res = await call('/api/auth/register', { username, password: 'hunter22' });
  expect(res.status).toBe(200);
  return res.body.token as string;
}

describe('farm server', () => {
  let alice: string;
  let bob: string;

  it('registers, logs in and rejects bad credentials', async () => {
    alice = await register('alice');
    bob = await register('bob');
    expect((await call('/api/auth/register', { username: 'ALICE', password: 'whatever' })).status).toBe(409);
    expect((await call('/api/auth/register', { username: 'x', password: 'whatever' })).status).toBe(400);
    expect((await call('/api/auth/login', { username: 'alice', password: 'nope' })).status).toBe(401);
    expect((await call('/api/auth/login', { username: NPC_USERNAME, password: '' })).status).toBe(400);
    const login = await call('/api/auth/login', { username: 'Alice', password: 'hunter22' });
    expect(login.status).toBe(200);
    expect(login.body.state.name).toBe("alice's Farm");
    expect((await call('/api/me')).status).toBe(401);
  });

  it('applies action batches and stops at the first invalid one', async () => {
    const before = (await call('/api/me', undefined, alice)).body;
    const res = await call(
      '/api/actions',
      {
        actions: [
          { type: 'plow', x: 12, y: 12, t: clock },
          { type: 'plow', x: 12, y: 12, t: clock }, // occupied
          { type: 'plow', x: 13, y: 12, t: clock },
        ],
      },
      alice,
    );
    expect(res.body.ok).toBe(false);
    expect(res.body.applied).toBe(1);
    expect(res.body.error).toMatch(/plow/i);
    expect(res.body.state.coins).toBe(before.state.coins - 15);
    expect(res.body.rev).toBe(before.rev + 1);
  });

  it('clamps client timestamps so the future cannot be harvested early', async () => {
    const me = (await call('/api/me', undefined, alice)).body;
    const plot = Object.values(me.state.objects).find((o: any) => o.crop === 'strawberry') as any;
    const res = await call('/api/actions', { actions: [{ type: 'harvest', id: plot.id, t: clock + 3600_000 }] }, alice);
    expect(res.body.ok).toBe(false);
    expect(res.body.error).toMatch(/not ready/i);
  });

  it('starts everyone as neighbors with Mayor Maple, with a welcome gift', async () => {
    const social = (await call('/api/social', undefined, alice)).body;
    expect(social.friends.map((f: any) => f.username)).toContain(NPC_USERNAME);
    expect(social.friends.filter((f: any) => f.isNpc)).toHaveLength(5);
    expect(social.gifts).toHaveLength(1);
    const claim = await call('/api/gifts/claim', { id: social.gifts[0].id }, alice);
    expect(claim.body.state.inventory.tulips_pink).toBe(1);
    expect((await call('/api/gifts/claim', { id: social.gifts[0].id }, alice)).status).toBe(404);
  });

  it('handles neighbor requests', async () => {
    expect((await call('/api/farms/bob/visit', {}, alice)).status).toBe(403);
    const req = await call('/api/friends/request', { username: 'bob' }, alice);
    expect(req.body.status).toBe('pending');
    const bobSocial = (await call('/api/social', undefined, bob)).body;
    expect(bobSocial.incoming).toEqual(['alice']);
    await call('/api/friends/respond', { username: 'alice', accept: true }, bob);
    const aliceSocial = (await call('/api/social', undefined, alice)).body;
    expect(aliceSocial.friends.map((f: any) => f.username)).toContain('bob');
  });

  it('lets neighbors visit and help, with a daily limit', async () => {
    // Bob plants a crop for Alice to fertilize.
    const bobMe = (await call('/api/me', undefined, bob)).body;
    const empty = Object.values(bobMe.state.objects).find((o: any) => o.kind === 'plot' && !o.crop) as any;
    await call('/api/actions', { actions: [{ type: 'plant', id: empty.id, crop: 'wheat', t: clock }] }, bob);

    const visit = await call('/api/farms/bob/visit', {}, alice);
    expect(visit.status).toBe(200);
    expect(visit.body.helpsLeft).toBe(5);
    expect(visit.body.myState.stats.visit).toBe(1);

    const help = await call('/api/farms/bob/help', { objectId: empty.id }, alice);
    expect(help.status).toBe(200);
    expect(help.body.result.kind).toBe('fertilize');
    expect(help.body.state.objects[empty.id].fertilized).toBe(true);
    expect(help.body.myState.stats.help).toBe(1);
    expect(help.body.helpsLeft).toBe(4);
    // Already fertilized.
    expect((await call('/api/farms/bob/help', { objectId: empty.id }, alice)).status).toBe(400);

    const bobSocial = (await call('/api/social', undefined, bob)).body;
    expect(bobSocial.notifications[0].text).toMatch(/alice fertilized your Wheat/);
  });

  it('lets players help Mayor Maple and caps helps per day', async () => {
    const visit = (await call(`/api/farms/${NPC_USERNAME}/visit`, {}, alice)).body;
    const targets = Object.values(visit.state.objects).filter((o: any) => o.kind === 'plot' && o.crop) as any[];
    for (let i = 0; i < 5; i++) {
      const r = await call(`/api/farms/${NPC_USERNAME}/help`, { objectId: targets[i].id }, alice);
      expect(r.status).toBe(200);
    }
    const capped = await call(`/api/farms/${NPC_USERNAME}/help`, { objectId: targets[5].id }, alice);
    expect(capped.status).toBe(429);
  });

  it('sends one gift per neighbor per day', async () => {
    const send = await call('/api/gifts/send', { username: 'bob', gift: 'egg' }, alice);
    expect(send.status).toBe(200);
    expect(send.body.myState.stats.gift).toBe(1);
    expect((await call('/api/gifts/send', { username: 'bob', gift: 'egg' }, alice)).status).toBe(429);
    const bobSocial = (await call('/api/social', undefined, bob)).body;
    const gift = bobSocial.gifts.find((g: any) => g.from === 'alice');
    expect(gift.item).toBe('egg');
    clock += 86_400_000;
    expect((await call('/api/gifts/send', { username: 'bob', gift: 'egg' }, alice)).status).toBe(200);
  });

  it('returns JSON errors for unknown routes', async () => {
    const res = await call('/api/nope');
    expect(res.status).toBe(404);
    expect(res.body.error).toBeDefined();
  });
});

describe('villager farms', () => {
  it('build full farms out of real content', async () => {
    const { placeable, CROPS, NPC_NEIGHBORS } = await import('@farm/shared');
    const { ensureNpcs } = await import('../server/src/npc');
    const { loadFarm } = await import('../server/src/repo');
    const db = openDb(':memory:');
    const { ids } = ensureNpcs(db, clock);
    expect(ids).toHaveLength(NPC_NEIGHBORS.length);
    for (const id of ids) {
      const { state } = loadFarm(db, id);
      const objs = Object.values(state.objects);
      expect(objs.length, state.name).toBeGreaterThan(40);
      for (const o of objs) {
        if (o.kind === 'plot') expect(CROPS[o.crop!], o.crop).toBeDefined();
        else expect(placeable(o.def), o.def).toBeDefined();
      }
    }
  });
});
