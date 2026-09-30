// Art style presets for the motes (admin-selectable). Each style decides how a BallView is
// built: the gummy shader (§9.3), a watercolor-paper disc, or a bold flat fruit-merge look.
// Custom per-tier art (any image URL) layers on top of any style as the core/face texture.

import { Assets, Texture } from 'pixi.js';
import type { ArtStyleId } from '../config/tuning';
import { TIER_COUNT } from '../config/tiers';
import { drawPlaceholderCore, TIER_ART_URLS } from './coreArt';

let styleId: ArtStyleId = 'gummy';
let overrides: Partial<Record<number, string>> = {};
/** Bumped whenever textures must be rebuilt (style or override change). */
let generation = 0;
const cache = new Map<string, Texture>();

export function currentArtStyle(): ArtStyleId {
  return styleId;
}

export function artGeneration(): number {
  return generation;
}

export function setArtStyle(id: ArtStyleId): boolean {
  if (id === styleId) return false;
  styleId = id;
  generation++;
  return true;
}

export function setTierArtOverrides(next: Partial<Record<number, string>>): boolean {
  const same = JSON.stringify(next ?? {}) === JSON.stringify(overrides);
  if (same) return false;
  overrides = { ...(next ?? {}) };
  generation++;
  return true;
}

function keyFor(tier: number): string {
  return `${styleId}:${overrides[tier] ?? TIER_ART_URLS[tier] ?? 'builtin'}:${tier}`;
}

/** Synchronous accessor; returns the built-in placeholder immediately and swaps in a custom
 *  image once it has loaded (the ball views re-read textures on the next generation bump). */
export function coreTextureFor(tier: number): Texture {
  const key = keyFor(tier);
  const hit = cache.get(key);
  if (hit) return hit;
  const tex = Texture.from(drawPlaceholderCore(tier, undefined, styleId));
  cache.set(key, tex);
  const url = overrides[tier] ?? TIER_ART_URLS[tier];
  if (url) {
    Assets.load<Texture>({ src: url, alias: `${url}#${tier}`, loadParser: 'loadTextures' })
      .then((loaded) => {
        cache.set(key, loaded);
        generation++;
      })
      .catch((err) =>
        console.warn(`Tier ${tier} art failed to load (${url}); keeping placeholder.`, err),
      );
  }
  return tex;
}

export async function preloadCoreTextures(): Promise<void> {
  for (let t = 1; t <= TIER_COUNT; t++) coreTextureFor(t);
}
