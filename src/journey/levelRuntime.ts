// Journey level runtime (§10.2–§10.5): goal tracking, constraint handling, and the star
// calculation. Pure state-machine over sim snapshots/events so it is unit-testable and the
// physics worker stays unaware of goals (it only knows the SimLevelConfig subset).

import { APEX_TIER } from '../config/tiers';
import type { SimEvent, SimLevelConfig, Snapshot } from '../engine/types';
import type { Goal, LevelDef, StarRule, Stars } from '../types';

export interface GoalProgress {
  goal: Goal;
  current: number;
  target: number;
  done: boolean;
  label: string;
  /** Whether "current/target" is meaningful to show (not for reach-a-tier / apex goals). */
  showCounter: boolean;
}

export interface LevelStatus {
  goals: GoalProgress[];
  allGoalsMet: boolean;
  /** 'playing' until goals are met (won) or a budget is exhausted / the board overflows. */
  outcome: 'playing' | 'won' | 'failed';
  failReason?: 'drops' | 'time' | 'board';
  dropsRemaining: number | null;
  secondsRemaining: number | null;
  stars: Stars;
}

export function goalLabel(goal: Goal, tierNames: (t: number) => string): string {
  switch (goal.type) {
    case 'reachTier':
      return `Make a ${tierNames(goal.tier)}`;
    case 'score':
      return `Score ${goal.score}`;
    case 'mergeCount':
      return `Make ${goal.count} ${tierNames(goal.tier)}${goal.count === 1 ? '' : 's'}`;
    case 'clearObstacle':
      return goal.obstacle === 'ice'
        ? `Free ${goal.count} frozen mote${goal.count === 1 ? '' : 's'}`
        : `Clear ${goal.count} rock${goal.count === 1 ? '' : 's'}`;
    case 'survive':
      return `Last ${goal.seconds} seconds`;
    case 'apex':
      return 'Reform the Skylight (apex merge)';
  }
}

/** The subset of a LevelDef the physics sim needs. */
export function toSimLevelConfig(level: LevelDef): SimLevelConfig {
  return {
    spawnBag: level.spawnBag,
    previewCount: level.previewCount,
    obstacles: level.obstacles,
    wind: level.hazards?.wind,
    mergeContactMs: level.mergeContactMs,
    dropLimit: level.dropLimit,
  };
}

export class LevelRuntime {
  private readonly level: LevelDef;
  private mergesByTier = new Map<number, number>();
  private thawed = 0;
  private rocksCleared = 0;
  private apexDone = false;
  private wonAtMs: number | null = null;
  private failed: LevelStatus['failReason'] | null = null;
  private lastSnapshot: Snapshot | null = null;
  /** Once drops run out we wait for the board to settle before declaring failure. */
  private outOfDropsSinceMs: number | null = null;
  private readonly tierNames: (t: number) => string;

  constructor(level: LevelDef, tierNames: (t: number) => string = (t) => `tier ${t}`) {
    this.level = level;
    this.tierNames = tierNames;
  }

  applyFrame(snapshot: Snapshot, events: SimEvent[]): LevelStatus {
    this.lastSnapshot = snapshot;
    for (const e of events) {
      if (e.type === 'merge')
        this.mergesByTier.set(e.tier, (this.mergesByTier.get(e.tier) ?? 0) + 1);
      if (e.type === 'apex') this.apexDone = true;
      if (e.type === 'thaw') this.thawed++;
    }
    return this.status();
  }

  status(): LevelStatus {
    const snap = this.lastSnapshot;
    const goals = this.level.goals.map((g) => this.progressFor(g, snap));
    const allGoalsMet = goals.every((g) => g.done);
    const dropsRemaining =
      this.level.dropLimit !== undefined
        ? Math.max(0, this.level.dropLimit - (snap?.dropsMade ?? 0))
        : null;
    const secondsRemaining =
      this.level.timeLimitSec !== undefined
        ? Math.max(0, this.level.timeLimitSec - (snap?.timeMs ?? 0) / 1000)
        : null;

    if (this.wonAtMs === null && allGoalsMet && snap) this.wonAtMs = snap.timeMs;

    if (this.wonAtMs === null && this.failed === null && snap) {
      if (snap.gameOver) this.failed = 'board';
      else if (secondsRemaining !== null && secondsRemaining <= 0) this.failed = 'time';
      else if (dropsRemaining !== null && dropsRemaining <= 0) {
        // Give the last drop's chain reactions ~3 s of sim time to finish.
        this.outOfDropsSinceMs ??= snap.timeMs;
        if (snap.timeMs - this.outOfDropsSinceMs > 3000) this.failed = 'drops';
      }
    }

    const outcome: LevelStatus['outcome'] =
      this.wonAtMs !== null ? 'won' : this.failed ? 'failed' : 'playing';
    const stars =
      outcome === 'won'
        ? calculateStars(this.level, { dropsRemaining, secondsRemaining, score: snap?.score ?? 0 })
        : 0;
    return {
      goals,
      allGoalsMet,
      outcome,
      failReason: this.failed ?? undefined,
      dropsRemaining,
      secondsRemaining,
      stars,
    };
  }

  private progressFor(goal: Goal, snap: Snapshot | null): GoalProgress {
    const label = goalLabel(goal, this.tierNames);
    switch (goal.type) {
      case 'reachTier': {
        const cur = snap?.topTier ?? 0;
        return {
          goal,
          label,
          current: Math.min(cur, goal.tier),
          target: goal.tier,
          done: cur >= goal.tier,
          showCounter: false,
        };
      }
      case 'score': {
        const cur = snap?.score ?? 0;
        return {
          goal,
          label,
          current: Math.min(cur, goal.score),
          target: goal.score,
          done: cur >= goal.score,
          showCounter: true,
        };
      }
      case 'mergeCount': {
        const cur = this.mergesByTier.get(goal.tier) ?? 0;
        return {
          goal,
          label,
          current: Math.min(cur, goal.count),
          target: goal.count,
          done: cur >= goal.count,
          showCounter: true,
        };
      }
      case 'clearObstacle': {
        const cur = goal.obstacle === 'ice' ? this.thawed : this.rocksCleared;
        return {
          goal,
          label,
          current: Math.min(cur, goal.count),
          target: goal.count,
          done: cur >= goal.count,
          showCounter: true,
        };
      }
      case 'survive': {
        const cur = (snap?.timeMs ?? 0) / 1000;
        return {
          goal,
          label,
          current: Math.min(Math.floor(cur), goal.seconds),
          target: goal.seconds,
          done: cur >= goal.seconds,
          showCounter: true,
        };
      }
      case 'apex':
        return {
          goal,
          label,
          current: this.apexDone ? 1 : 0,
          target: 1,
          done: this.apexDone,
          showCounter: false,
        };
    }
  }
}

function ruleMet(
  rule: StarRule,
  ctx: { dropsRemaining: number | null; secondsRemaining: number | null; score: number },
): boolean {
  if (
    rule.dropsRemainingAtLeast !== undefined &&
    (ctx.dropsRemaining ?? 0) < rule.dropsRemainingAtLeast
  )
    return false;
  if (
    rule.secondsRemainingAtLeast !== undefined &&
    (ctx.secondsRemaining ?? 0) < rule.secondsRemainingAtLeast
  )
    return false;
  if (rule.scoreAtLeast !== undefined && ctx.score < rule.scoreAtLeast) return false;
  return true;
}

/** §10.5 star rules: 1 star = goals met; 2/3 stars per the level's StarRules (authored from
 *  the 30% / 50% budget-remaining guidance, or score thresholds for budget-less levels). */
export function calculateStars(
  level: LevelDef,
  ctx: { dropsRemaining: number | null; secondsRemaining: number | null; score: number },
): Stars {
  if (ruleMet(level.stars.three, ctx)) return 3;
  if (ruleMet(level.stars.two, ctx)) return 2;
  return 1;
}

/** Helper for level authors: the 30%/50% rule from §10.5 for a drop budget. */
export function starsForDropBudget(dropLimit: number): LevelDef['stars'] {
  return {
    two: { dropsRemainingAtLeast: Math.ceil(dropLimit * 0.3) },
    three: { dropsRemainingAtLeast: Math.ceil(dropLimit * 0.5) },
  };
}

export function starsForTimeBudget(timeLimitSec: number): LevelDef['stars'] {
  return {
    two: { secondsRemainingAtLeast: Math.ceil(timeLimitSec * 0.3) },
    three: { secondsRemainingAtLeast: Math.ceil(timeLimitSec * 0.5) },
  };
}

/** Which tier a `reachTier` goal at `APEX_TIER` really means: the apex merge itself. */
export function isApexGoal(goal: Goal): boolean {
  return goal.type === 'apex' || (goal.type === 'reachTier' && goal.tier > APEX_TIER);
}
