// Tier table per GAME_DESIGN_MERGE_TIERS.md §3.
// Radius is ALWAYS computed from the formula — the values in the doc's table are
// rounded for reading only. Never hardcode a tier radius anywhere else in the codebase.

export const TIER_COUNT = 11;

/** r(n) = 14 * 1.22^(n-1) px, per game design doc §3. n is 1-indexed (tier 1..11). */
export function tierRadiusPx(tier: number): number {
  if (tier < 1 || tier > TIER_COUNT) {
    throw new Error(`tierRadiusPx: tier ${tier} out of range 1..${TIER_COUNT}`);
  }
  return 14 * Math.pow(1.22, tier - 1);
}

export type RimStyle = 'solid' | 'dashed' | 'double';

export interface TierDef {
  tier: number;
  /** Default (non-personalized) skin name — see ART_AND_STORY_DIRECTION.md §2 for the
   *  actual in-game names ("Dewdrop Mote", etc.); this is the mechanical placeholder id. */
  defaultSkinId: string;
  /** Also serves as the tier's gummy body color per the 2026-09-28 material revision
   *  (GAME_DESIGN_MERGE_TIERS.md §3 note, §9.3) — never sampled from a personalized photo. */
  rimColor: string;
  rimStyle: RimStyle;
  /** Baked texture size in px for this tier's core/portrait texture (§3). */
  bakeTextureSize: 128 | 256 | 512;
}

export const TIERS: readonly TierDef[] = [
  {
    tier: 1,
    defaultSkinId: 'pebble',
    rimColor: '#F25F5C',
    rimStyle: 'solid',
    bakeTextureSize: 128,
  },
  {
    tier: 2,
    defaultSkinId: 'seashell',
    rimColor: '#FF9F1C',
    rimStyle: 'solid',
    bakeTextureSize: 128,
  },
  { tier: 3, defaultSkinId: 'coin', rimColor: '#FFD23F', rimStyle: 'solid', bakeTextureSize: 128 },
  {
    tier: 4,
    defaultSkinId: 'marble',
    rimColor: '#9BD770',
    rimStyle: 'solid',
    bakeTextureSize: 128,
  },
  {
    tier: 5,
    defaultSkinId: 'lantern',
    rimColor: '#2EC4B6',
    rimStyle: 'dashed',
    bakeTextureSize: 256,
  },
  {
    tier: 6,
    defaultSkinId: 'beach-ball',
    rimColor: '#3AA6F0',
    rimStyle: 'dashed',
    bakeTextureSize: 256,
  },
  {
    tier: 7,
    defaultSkinId: 'snow-globe',
    rimColor: '#5B6CFF',
    rimStyle: 'dashed',
    bakeTextureSize: 256,
  },
  {
    tier: 8,
    defaultSkinId: 'balloon',
    rimColor: '#9B5DE5',
    rimStyle: 'dashed',
    bakeTextureSize: 256,
  },
  { tier: 9, defaultSkinId: 'moon', rimColor: '#F15BB5', rimStyle: 'double', bakeTextureSize: 512 },
  { tier: 10, defaultSkinId: 'sun', rimColor: '#E07A5F', rimStyle: 'double', bakeTextureSize: 512 },
  {
    tier: 11,
    defaultSkinId: 'globe-apex',
    rimColor: '#FFD700',
    rimStyle: 'double',
    bakeTextureSize: 512,
  },
] as const;

export function tierDef(tier: number): TierDef {
  const def = TIERS[tier - 1];
  if (!def) throw new Error(`tierDef: tier ${tier} out of range 1..${TIER_COUNT}`);
  return def;
}

/** Only tiers 1-5 can be dropped by the player (§4). */
export const DROPPABLE_TIERS = [1, 2, 3, 4, 5] as const;

/** Two tier-11 balls merging is the apex merge (§5.4) — no tier-12 exists. */
export const APEX_TIER = 11;
