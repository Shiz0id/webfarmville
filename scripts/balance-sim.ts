// Plays a simulated farmer through the real game rules for a few weeks to check
// pacing: how long each level takes, where coins pile up or run dry, and which
// quests stall. The farmer only does the core loop (crops, animals, trees,
// workshops, orders, quests, land and a few decorations), so cooking, fishing,
// friends and the other side activities would make a real player a bit faster.
// Usage: npx tsx scripts/balance-sim.ts [days=30] [profile=casual|keen|both]
// With SAVE=<path> it also writes each farmer's farm as a browser save
// (<path>-<profile>.json) to load into the Pages build for playtests.

import {
  ANIMAL_LIST,
  BUILDINGS,
  BUILDING_LIST,
  CROP_LIST,
  DECORATION_LIST,
  ITEMS,
  MYSTERY_GIFT,
  QUESTS,
  TREE_LIST,
  applyAction,
  buildingStatus,
  canPlace,
  createFarm,
  cropStatus,
  isQuestComplete,
  nextExpansion,
  producerStatus,
  questProgress,
  xpForLevel,
  type Action,
  type BuildingObject,
  type FarmState,
  type PlotObject,
  type ProducerObject,
  witherAfterSec,
} from '@farm/shared';

import { writeFileSync } from 'node:fs';

const DAYS = Number(process.argv[2] ?? 30);
const WHICH = process.argv[3] ?? 'both';
const START = Date.UTC(2026, 2, 2, 7, 0); // An ordinary Monday in March, no seasonal event.
const H = 3600_000;

/** Times of day (hours) a player of each style drops in. */
const PROFILES: Record<string, number[]> = {
  casual: [8, 12.5, 18, 21.5],
  keen: [7, 8.5, 10, 11.5, 13, 14.5, 16, 17.5, 19, 20.5, 22, 23],
};
/** How much of the farm each style gives over to crops (the rest is decorations and paths). */
const PLOT_SHARE: Record<string, number> = { casual: 0.6, keen: 1 };

function run(profile: string) {
  let st = createFarm('Sim', START);
  let now = START;
  const log: string[] = [];
  const levelAt: Record<number, number> = {};
  const questAt: Record<string, number> = {};
  let withered = 0;
  const seen: Record<number, number> = {};
  const sales: Record<string, number> = {};
  let actions = 0;
  const income: Record<string, number> = { crops: 0, goods: 0, orders: 0, quests: 0, daily: 0, levelUp: 0, crafts: 0 };

  const act = (a: Action, source?: string): boolean => {
    try {
      const before = st.coins;
      const r = applyAction(st, a, { now });
      st = r.state;
      actions++;
      for (const e of r.events) {
        if (e.type === 'levelUp') {
          levelAt[e.level] = now;
          income.levelUp += 50 * e.level;
        }
      }
      if (source && st.coins > before) income[source] = (income[source] ?? 0) + st.coins - before;
      if (process.env.DEBUG && st.coins - before > Number(process.env.DEBUG)) console.log(((now - START) / 60000).toFixed(0) + 'm', JSON.stringify(a), '+' + (st.coins - before), 'L' + st.level);
      return true;
    } catch {
      return false;
    }
  };

  const objs = () => Object.values(st.objects);
  const plots = () => objs().filter((o): o is PlotObject => o.kind === 'plot');
  const producers = () => objs().filter((o): o is ProducerObject => o.kind === 'animal' || o.kind === 'tree');
  const buildings = () => objs().filter((o): o is BuildingObject => o.kind === 'building');
  const inv = (id: string) => st.inventory[id] ?? 0;

  function freeSpot(w: number, h: number): { x: number; y: number } | null {
    for (let y = 0; y + h <= st.size; y++) for (let x = 0; x + w <= st.size; x++) if (canPlace(st, x, y, w, h)) return { x, y };
    return null;
  }

  // What active quests are asking for.
  function questWants() {
    const crops: string[] = [];
    const crafts: string[] = [];
    const own: string[] = [];
    let charm = 0;
    let decos = 0;
    let trees = 0;
    for (const id of st.quests.active) {
      const q = QUESTS[id];
      if (!q || isQuestComplete(st, id)) continue;
      const prog = questProgress(st, id);
      q.goals.forEach((g, i) => {
        if (prog[i].have >= prog[i].need) return;
        if (g.type === 'stat') {
          const [kind, what] = g.stat.split(':');
          if ((kind === 'harvest' || kind === 'plant') && what) crops.push(what);
          if (kind === 'harvest' && !what) crops.push('strawberry');
          if (kind === 'craft' && what) crafts.push(what);
          if (g.stat === 'place:deco') decos = Math.max(decos, prog[i].need - prog[i].have);
        } else if (g.what === 'charm') charm = Math.max(charm, g.count);
        else if (g.what === 'kind:tree') trees = Math.max(trees, g.count - prog[i].have);
        else if (g.what.startsWith('own:')) own.push(g.what.slice(4));
      });
    }
    return { crops, crafts, own, charm, decos, trees };
  }

  function buy(def: string, w = 1, h = 1): boolean {
    const spot = freeSpot(w, h);
    return !!spot && act({ type: 'buy', def, x: spot.x, y: spot.y });
  }

  function session(next: number) {
    act({ type: 'claimDaily' }, 'daily');
    while (inv(MYSTERY_GIFT) > 0 && act({ type: 'openGift' }));

    for (const p of plots()) {
      const s = cropStatus(p, now).stage;
      if (s === 'ready') act({ type: 'harvest', id: p.id });
      else if (s === 'withered') {
        withered++;
        act({ type: 'clearPlot', id: p.id });
      }
    }
    for (const p of producers()) if (producerStatus(p, now).ready) act({ type: 'collect', id: p.id });
    for (const b of buildings()) if (buildingStatus(b, now).done) act({ type: 'collectCrafts', id: b.id });

    const claimQuests = () => {
      for (const id of [...st.quests.active]) if (isQuestComplete(st, id) && act({ type: 'claimQuest', quest: id }, 'quests')) questAt[id] = now;
    };
    claimQuests();

    // Orders: fill what we can, swap out any that have sat for a day with no hope.
    for (const o of [...st.orders]) {
      seen[o.id] ??= now;
      if (Object.entries(o.items).every(([i, n]) => inv(i) >= n)) act({ type: 'fulfillOrder', order: o.id }, 'orders');
      else if (now - seen[o.id] > 24 * H) act({ type: 'skipOrder', order: o.id });
    }

    const wants = questWants();
    const plotCost = 15;
    const reserve = () => 60 + plots().length * 12;
    const spare = () => st.coins - reserve();

    // Quest purchases first.
    for (const def of wants.own) {
      const p = BUILDINGS[def] ?? ANIMAL_LIST.find((a) => a.id === def) ?? TREE_LIST.find((t) => t.id === def);
      if (p && p.level <= st.level && spare() >= p.cost) buy(def, 'w' in p ? p.w : 1, 'h' in p ? p.h : 1);
    }
    for (const out of wants.crafts) {
      const b = BUILDING_LIST.find((b) => b.recipes.some((r) => r.output === out));
      if (b && !buildings().some((x) => x.def === b.id) && b.level <= st.level && spare() >= b.cost) buy(b.id, b.w, b.h);
    }
    for (let i = 0; i < wants.trees; i++) {
      const t = TREE_LIST.filter((t) => t.level <= st.level).sort((a, b) => a.cost - b.cost)[0];
      if (t && spare() >= t.cost) buy(t.id);
    }
    const decoChoices = DECORATION_LIST.filter((d) => !d.event && !d.tokens && !d.reward && d.level <= st.level && d.cost > 0 && d.charm > 0);
    for (let i = 0; i < wants.decos; i++) {
      const d = [...decoChoices].sort((a, b) => a.cost - b.cost)[0];
      if (d && spare() >= d.cost) buy(d.id, d.w, d.h);
    }
    if (wants.charm) {
      const best = [...decoChoices].sort((a, b) => b.charm / b.cost - a.charm / a.cost);
      for (let i = 0; i < 6; i++) {
        const d = best.find((d) => spare() >= d.cost * 2);
        if (!d || !buy(d.id, d.w, d.h)) break;
      }
    }

    // Land.
    const exp = nextExpansion(st.size);
    if (exp && exp.level <= st.level && st.coins >= exp.cost + reserve()) act({ type: 'expand' });

    // Grow the farm: workshops once each, then a few animals and trees of each kind.
    for (const b of BUILDING_LIST) {
      if (b.starter || b.level > st.level || b.recipes.length === 0) continue;
      if (buildings().some((x) => x.def === b.id)) continue;
      if (spare() >= b.cost * 2.5) buy(b.id, b.w, b.h);
    }
    const herd = Math.min(6, 1 + Math.floor(st.level / 3));
    for (const a of [...ANIMAL_LIST, ...TREE_LIST].filter((a) => a.level <= st.level)) {
      const have = producers().filter((p) => p.def === a.id).length;
      if (have < herd && spare() >= a.cost * 3) buy(a.id);
    }

    // Plow up to a sensible number of plots for the level and land.
    const targetPlots = Math.round(Math.min(10 + st.level * 4, st.size * st.size * 0.35) * PLOT_SHARE[profile]);
    while (plots().length < targetPlots && spare() >= plotCost + 40) {
      const spot = freeSpot(1, 1);
      if (!spot || !act({ type: 'plow', x: spot.x, y: spot.y })) break;
    }

    // Workshops: quest crafts, then order needs, then the best value recipe we can afford.
    const orderNeeds: Record<string, number> = {};
    for (const o of st.orders) for (const [i, n] of Object.entries(o.items)) orderNeeds[i] = (orderNeeds[i] ?? 0) + n;
    for (const b of buildings()) {
      const def = BUILDINGS[b.def];
      if (!def?.recipes.length) continue;
      for (let k = 0; k < 6 && buildingStatus(b, now).freeSlots > 0; k++) {
        const fresh = st.objects[b.id] as BuildingObject;
        if (buildingStatus(fresh, now).freeSlots <= 0) break;
        const ok = def.recipes.filter((r) => Object.entries(r.inputs).every(([i, n]) => inv(i) >= n));
        const value = (r: (typeof ok)[number]) =>
          (wants.crafts.includes(r.output) ? 1e6 : 0) +
          (orderNeeds[r.output] ? 1e4 : 0) +
          (ITEMS[r.output]?.sell ?? 0) * r.qty -
          Object.entries(r.inputs).reduce((s, [i, n]) => s + (ITEMS[i]?.sell ?? 0) * n, 0);
        const pick = ok.sort((a, b) => value(b) - value(a))[0];
        if (!pick || value(pick) < 0 || !act({ type: 'craft', id: b.id, recipe: pick.id })) break;
      }
    }

    // Sell what nobody is asking for, keeping workshop ingredients and order items.
    const keep: Record<string, number> = { ...orderNeeds };
    for (const b of buildings()) for (const r of BUILDINGS[b.def]?.recipes ?? []) for (const [i, n] of Object.entries(r.inputs)) keep[i] = Math.max(keep[i] ?? 0, n * 3 + (orderNeeds[i] ?? 0));
    for (const c of wants.crops) keep[c] = (keep[c] ?? 0) + 10;
    for (const [id, n] of Object.entries(st.inventory)) {
      const item = ITEMS[id];
      if (!item || item.category === 'special' || item.category === 'dish') continue;
      const extra = n - (keep[id] ?? 0);
      const c0 = st.coins;
      if (extra > 0 && act({ type: 'sellItem', item: id, qty: extra }, item.category === 'crop' ? 'crops' : 'goods')) sales[id] = (sales[id] ?? 0) + st.coins - c0;
    }
    claimQuests();

    // Plant: quest crops on a few plots, then the most profitable crop that's ready by the next visit.
    const gap = (next - now) / 1000;
    const crops = CROP_LIST.filter((c) => !c.event && c.level <= st.level);
    const fits = crops.filter((c) => c.growSec <= gap);
    const score = (c: (typeof crops)[number]) => c.yield * (ITEMS[c.id]?.sell ?? 0) - c.cost + c.xp * 4;
    const best = (fits.length ? fits : [crops[0]]).sort((a, b) => score(b) - score(a))[0];
    // Quest crops only when they'll still be fresh at the next visit.
    const questCrops = wants.crops.filter((c) => crops.some((x) => x.id === c && x.growSec <= gap && x.growSec + witherAfterSec(x) >= gap));
    let q = 0;
    for (const p of plots()) {
      if (cropStatus(p, now).stage !== 'empty') continue;
      const crop = q < questCrops.length * 6 ? questCrops[Math.floor(q / 6)] : best.id;
      if (st.coins < (CROP_LIST.find((c) => c.id === crop)?.cost ?? 0)) break;
      act({ type: 'plant', id: p.id, crop });
      q++;
    }
  }

  // Day one starts with a 25 minute sitting, then the profile's routine.
  const times: number[] = [];
  for (let m = 0; m < 25; m++) times.push(START + m * 60_000);
  for (let d = 0; d < DAYS; d++) for (const h of PROFILES[profile]) {
    const t = START - 7 * H + d * 24 * H + h * H;
    if (t > times[times.length - 1]) times.push(t);
  }
  const daily: string[] = [];
  for (let i = 0; i < times.length; i++) {
    now = times[i];
    session(times[i + 1] ?? now + 8 * H);
    const day = Math.floor((now - START + 7 * H) / (24 * H));
    const nextDay = Math.floor(((times[i + 1] ?? Infinity) - START + 7 * H) / (24 * H));
    if (nextDay !== day && [0, 1, 2, 4, 6, 9, 13, 20, 29, 44, 59, 89, 119, 149, 179].includes(day))
      daily.push(`  day ${String(day + 1).padStart(2)}: L${st.level} (${st.xp - xpForLevel(st.level)}/${xpForLevel(st.level + 1) - xpForLevel(st.level)} xp) ${st.coins}c, ${plots().length} plots, ${producers().length} animals+trees, ${buildings().length - 1} workshops, land ${st.size}, ${st.quests.completed.length} quests`);
  }

  console.log(`\n=== ${profile} (${PROFILES[profile].length} visits a day, ${DAYS} days) ===`);
  console.log(daily.join('\n'));
  const fmt = (t: number) => {
    const hrs = (t - START) / H;
    return hrs < 1 ? `${Math.round(hrs * 60)}m` : hrs < 48 ? `${hrs.toFixed(1)}h` : `${(hrs / 24).toFixed(1)}d`;
  };
  console.log('  levels: ' + Object.entries(levelAt).map(([l, t]) => `L${l}@${fmt(t)}`).join(' '));
  console.log('  income: ' + Object.entries(income).map(([k, v]) => `${k} ${v}`).join(', '));
  console.log(`  withered: ${withered}, actions: ${actions}`);
  console.log('  top sales: ' + Object.entries(sales).sort((a, b) => b[1] - a[1]).slice(0, 12).map(([k, v]) => `${k} ${v}`).join(', '));
  console.log('  stuck quests: ' + st.quests.active.map((id) => `${id}(${questProgress(st, id).map((g) => `${g.label} ${g.have}/${g.need}`).join('; ')})`).join(', '));
  if (process.env.SAVE) {
    const save = { v: 1, username: `Sim ${profile}`, state: st, rev: 1, helps: { day: '', used: {} }, giftsSent: {}, inbox: [], notifications: [], nextId: 1 };
    writeFileSync(`${process.env.SAVE}-${profile}.json`, JSON.stringify(save));
  }
  return { levelAt, st };
}

for (const p of WHICH === 'both' ? ['casual', 'keen'] : [WHICH]) run(p);
