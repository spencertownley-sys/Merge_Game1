// Where the bundled Higgsfield-generated art lives (public/assets). Every path goes through the
// build's base URL, so the art loads the same from a root deploy or a sub-path like GitHub Pages.
// Admin URL overrides (config/tuning.ts ArtOverrides) still win over these defaults.

import type { LandId } from '../types';

const base = (): string => import.meta.env.BASE_URL ?? '/';

/** The illustrated mote for a tier (1..11): a round orb cut out with a circular alpha edge. */
export function moteArtUrl(tier: number): string {
  return `${base()}assets/motes/tier-${String(tier).padStart(2, '0')}.webp`;
}

/** A land's painted backdrop (portrait), used behind the board and on the Journey map. */
export function landBackdropUrl(land: LandId): string {
  return `${base()}assets/lands/${land}.webp`;
}

/** A land's painted frame; its centre is plain and sits under the board. */
export function landFrameUrl(land: LandId): string {
  return `${base()}assets/frames/${land}.webp`;
}

/** Panels of the Journey intro cut scene, 1-based. */
export function introPanelUrl(n: number): string {
  return `${base()}assets/story/intro-${n}.webp`;
}

/** Wick, the paper-lantern moth who guides the Keeper (transparent background). */
/** A land's arrival story panel: public/assets/story/<land>-N.webp. */
export function landStoryPanelUrl(land: LandId, n: number): string {
  return `${base()}assets/story/${land}-${n}.webp`;
}

export function wickUrl(): string {
  return `${base()}assets/story/wick.webp`;
}

/** The mote art is a 512 px square with the orb's edge 2 px inside; drawing the sprite this
 *  much larger than the collider's diameter lines the painted edge up with the physics circle. */
export const MOTE_ART_EDGE_SCALE = 512 / 508;
