// Shared domain types — the shapes in API_DESIGN.md §2.5 and the LevelDef schema from
// GAME_DESIGN_MERGE_TIERS.md §10.4. SkinSet/Photo types are added in Phase 1.5, not here.

export type GameMode = 'classic' | 'journey';

/** One merge, as recorded in a run's mergeLog (API_DESIGN.md §2.5). `tier` is the NEW tier
 *  produced by the merge (or APEX_TIER for an apex merge, where no result ball exists and
 *  resultId is -1). */
export interface MergeEvent {
  tier: number;
  atMs: number;
  parentIds: [number, number];
  resultId: number;
}

export interface Run {
  id: string;
  mode: GameMode;
  levelId: number | null;
  seed: number;
  score: number;
  topTier: number;
  mergeLog: MergeEvent[];
  weights: Record<string, number> | null;
  playedAt: string;
}

// --- Journey (§10) ---

export type LandId =
  | 'sunmeadow-hollow'
  | 'driftmoor-cove'
  | 'whisperwood'
  | 'thistledown-hills'
  | 'copperleaf-orchard'
  | 'mistvale-marsh'
  | 'emberpeak'
  | 'cloudspire-isles'
  | 'frostglass-tundra'
  | 'neonoko-city'
  | 'starlit-harbor'
  | 'sunreach-spire'
  | 'skylight-sanctuary';

export type Goal =
  | { type: 'reachTier'; tier: number }
  | { type: 'score'; score: number }
  | { type: 'mergeCount'; tier: number; count: number }
  | { type: 'clearObstacle'; obstacle: 'ice' | 'rock'; count: number }
  | { type: 'survive'; seconds: number }
  | { type: 'apex' }
  /** JOURNEY_PLAN.md §2.4: reach a ×N combo, `times` times (default once). */
  | { type: 'combo'; combo: number; times?: number };

/** Initial obstacle placement, in board px (§10.3). `tier` applies to ice only — the tier
 *  the frozen ball becomes once thawed. Rocks have a fixed radius (config/physics.ts). */
export type Obstacle =
  | { type: 'rock'; x: number; y: number; removable?: boolean }
  | { type: 'ice'; x: number; y: number; tier: number };

/** A static glass block inside the box (JOURNEY_PLAN.md §2.4 "shaped boxes"), in board px
 *  from its top-left corner. A pillar rises from the floor; a block touching a side wall and
 *  reaching the drop rail narrows the box (and the range the player can drop in). */
export interface WallBlock {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface WindHazard {
  everySec: number;
  durationSec: number;
  /** Lateral acceleration in m/s² applied to every ball during a gust (mass-independent
   *  so all balls drift together). Direction alternates each gust, starting rightward. */
  force: number;
}

export type StarRule = {
  dropsRemainingAtLeast?: number;
  secondsRemainingAtLeast?: number;
  /** For levels without a drop/time budget (§10.5: "use score thresholds instead"). */
  scoreAtLeast?: number;
};

export interface LevelDef {
  id: number; // 1..N
  land: LandId;
  name: string;
  seed: number;
  goals: Goal[]; // all must be met
  dropLimit?: number;
  timeLimitSec?: number;
  spawnBag?: [number, number, number, number, number]; // counts for tiers 1..5
  /** 0 = fog (JOURNEY_PLAN.md §2.4): the Next preview is hidden. */
  previewCount?: 0 | 1 | 2;
  obstacles?: Obstacle[];
  walls?: WallBlock[];
  hazards?: { wind?: WindHazard };
  /** Journey levels may raise the merge contact requirement above the §5.1 default of 0. */
  mergeContactMs?: number;
  stars: { two: StarRule; three: StarRule };
  /** One line of story flavor shown on the level intro (ART_AND_STORY_DIRECTION.md §4). */
  flavor?: string;
}

export type Stars = 0 | 1 | 2 | 3;

export interface LevelProgress {
  stars: Stars;
  bestScore: number;
}

// --- Settings (API_DESIGN.md §2.4) ---

export interface Settings {
  sound: boolean;
  music: boolean;
  /** No-op placeholder until the native wrapper exists (Phase 4). */
  haptics: boolean;
  reduceMotion: boolean;
  simpleGraphics: boolean;
  showTierNumbers: boolean;
  /** The Journey intro story has played once; replays come from the map's button. */
  introSeen: boolean;
  /** Lands whose arrival story has played once (journey/stories.ts). */
  landStoriesSeen: LandId[];
}

export type SettingKey = keyof Settings;
export type SettingValue<K extends SettingKey> = Settings[K];
