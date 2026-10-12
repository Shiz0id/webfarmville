import { BUILDINGS } from '../content/buildings';
import { DECORATIONS } from '../content/decorations';
import { EVENTS, isEventActive } from '../content/events';
import { MAX_ACTIVE_QUESTS, QUESTS, QUEST_LIST, type QuestGoal } from '../content/quests';
import type { FarmState, GameEvent } from '../types';

export function farmCharm(state: FarmState): number {
  let charm = 0;
  for (const o of Object.values(state.objects)) {
    if (o.kind === 'deco') charm += DECORATIONS[o.def]?.charm ?? 0;
    else if (o.kind === 'building') charm += BUILDINGS[o.def]?.charm ?? 0;
  }
  return charm;
}

function haveValue(state: FarmState, what: string): number {
  if (what === 'level') return state.level;
  if (what === 'charm') return farmCharm(state);
  if (what === 'size') return state.size;
  const objs = Object.values(state.objects);
  if (what.startsWith('own:')) {
    const def = what.slice(4);
    return objs.filter((o) => o.kind !== 'plot' && o.def === def).length;
  }
  if (what.startsWith('kind:')) {
    const kind = what.slice(5);
    return objs.filter((o) => o.kind === kind).length;
  }
  return 0;
}

export interface GoalProgress {
  label: string;
  have: number;
  need: number;
}

function goalProgress(state: FarmState, questId: string, index: number, goal: QuestGoal): GoalProgress {
  let have: number;
  if (goal.type === 'stat') {
    const base = state.quests.baselines[`${questId}:${index}`] ?? 0;
    have = (state.stats[goal.stat] ?? 0) - base;
  } else {
    have = haveValue(state, goal.what);
  }
  return { label: goal.label, have: Math.max(0, Math.min(goal.count, have)), need: goal.count };
}

export function questProgress(state: FarmState, questId: string): GoalProgress[] {
  const q = QUESTS[questId];
  return q ? q.goals.map((g, i) => goalProgress(state, questId, i, g)) : [];
}

export function isQuestComplete(state: FarmState, questId: string): boolean {
  const p = questProgress(state, questId);
  return p.length > 0 && p.every((g) => g.have >= g.need);
}

/**
 * Activate newly unlocked quests (capturing stat baselines) and report quests
 * that just became claimable. `wasComplete` is the set of active quests that
 * were already complete before the current action.
 */
export function refreshQuests(
  state: FarmState,
  events: GameEvent[],
  wasComplete?: Set<string>,
  ctx?: { now: number; allEvents?: boolean },
): void {
  const qs = state.quests;
  const eventOn = (ev: string) => !!ctx && (!!ctx.allEvents || isEventActive(EVENTS[ev], ctx.now));
  if (ctx) {
    // Seasonal quests leave once their event is over.
    qs.active = qs.active.filter((id) => !QUESTS[id]?.event || eventOn(QUESTS[id].event!));
  }
  const normalActive = () => qs.active.filter((id) => !QUESTS[id]?.event).length;
  for (const q of QUEST_LIST) {
    if (qs.completed.includes(q.id) || qs.active.includes(q.id)) continue;
    // Event quests don't count toward the cap, so they always show up.
    if (q.event ? !eventOn(q.event) : normalActive() >= MAX_ACTIVE_QUESTS) continue;
    if (state.level < q.level) continue;
    if (!q.requires.every((r) => qs.completed.includes(r))) continue;
    qs.active.push(q.id);
    q.goals.forEach((g, i) => {
      if (g.type === 'stat') qs.baselines[`${q.id}:${i}`] = state.stats[g.stat] ?? 0;
    });
  }
  if (wasComplete) {
    for (const id of qs.active) {
      if (!wasComplete.has(id) && isQuestComplete(state, id)) events.push({ type: 'questReady', quest: id });
    }
  }
}

export function completeQuestSet(state: FarmState): Set<string> {
  return new Set(state.quests.active.filter((id) => isQuestComplete(state, id)));
}
