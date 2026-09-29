// Default Skylight-mote core textures. Until the commissioned pastel/gummy art
// (ART_AND_STORY_DIRECTION.md §2 Higgsfield prompts) is dropped into public/assets/tiers/,
// each tier gets an original, procedurally drawn placeholder: a soft glowing centre with a
// simple cute face, radial-feathered alpha (opaque centre → transparent by the crop edge)
// exactly as the §9.3 shader expects. No text, no copied designs.

import { Assets, Texture } from 'pixi.js';
import { TIER_COUNT, tierDef } from '../config/tiers';

/** Drop real art here: tier -> URL under public/. Missing tiers use the placeholder. */
export const TIER_ART_URLS: Partial<Record<number, string>> = {};

/** Display names from ART_AND_STORY_DIRECTION.md §2. */
export const TIER_NAMES: readonly string[] = [
  'Dewdrop Mote',
  'Petal Spark',
  'Glimmer Bead',
  'Moonstone Marble',
  'Lantern Wisp',
  'Bloom Orb',
  'Snowglobe Charm',
  'Cloud Balloon',
  'Moon Shard',
  'Sun Shard',
  'Skylight',
];

export function tierName(tier: number): string {
  return TIER_NAMES[tier - 1] ?? `Tier ${tier}`;
}

function lighten(hex: string, amount: number): string {
  const n = parseInt(hex.replace('#', ''), 16);
  const r = (n >> 16) & 0xff;
  const g = (n >> 8) & 0xff;
  const b = n & 0xff;
  const mix = (c: number) => Math.round(c + (255 - c) * amount);
  return `rgb(${mix(r)}, ${mix(g)}, ${mix(b)})`;
}

/** Draws the placeholder core for a tier into a fresh canvas of the tier's bake size. */
export function drawPlaceholderCore(tier: number, size?: number): HTMLCanvasElement {
  const def = tierDef(tier);
  const S = size ?? def.bakeTextureSize;
  const canvas = document.createElement('canvas');
  canvas.width = S;
  canvas.height = S;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;
  const c = S / 2;
  const R = S / 2;

  // Inner light: bright, near-white centre fading into the tier's glow colour.
  const glow = ctx.createRadialGradient(c, c, 0, c, c, R);
  glow.addColorStop(0, 'rgba(255, 252, 240, 1)');
  glow.addColorStop(0.35, lighten(def.rimColor, 0.55));
  glow.addColorStop(0.7, lighten(def.rimColor, 0.25));
  glow.addColorStop(1, lighten(def.rimColor, 0.1));
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, S, S);

  // Higher tiers get a few soft sparkles — "the most luminous and detailed orb in the set".
  const sparkles = Math.max(0, tier - 4);
  for (let i = 0; i < sparkles; i++) {
    const a = (i / sparkles) * Math.PI * 2 + tier;
    const rr = R * (0.55 + 0.2 * ((i * 7) % 3) * 0.5);
    const sx = c + Math.cos(a) * rr;
    const sy = c + Math.sin(a) * rr;
    const g2 = ctx.createRadialGradient(sx, sy, 0, sx, sy, S * 0.06);
    g2.addColorStop(0, 'rgba(255,255,255,0.95)');
    g2.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g2;
    ctx.beginPath();
    ctx.arc(sx, sy, S * 0.06, 0, Math.PI * 2);
    ctx.fill();
  }

  // Face: soft ink, gentle and simple. Eye shape alternates a little by tier so the set
  // reads as a family without being identical.
  const ink = 'rgba(58, 43, 63, 0.92)';
  const eyeY = c - S * 0.04;
  const eyeDx = S * 0.16;
  const eyeR = S * (tier % 2 === 0 ? 0.055 : 0.05);
  ctx.fillStyle = ink;
  for (const sgn of [-1, 1]) {
    ctx.beginPath();
    if (tier >= 9) {
      // star-eyed for the shards / apex
      ctx.ellipse(c + sgn * eyeDx, eyeY, eyeR * 1.1, eyeR * 1.35, 0, 0, Math.PI * 2);
    } else {
      ctx.ellipse(c + sgn * eyeDx, eyeY, eyeR, eyeR * 1.25, 0, 0, Math.PI * 2);
    }
    ctx.fill();
    // catchlight
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.beginPath();
    ctx.arc(c + sgn * eyeDx - eyeR * 0.3, eyeY - eyeR * 0.4, eyeR * 0.35, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = ink;
  }
  // Smile
  ctx.strokeStyle = ink;
  ctx.lineWidth = Math.max(1.5, S * 0.018);
  ctx.lineCap = 'round';
  ctx.beginPath();
  const smileW = S * (0.06 + 0.01 * Math.min(tier, 6));
  ctx.arc(c, c + S * 0.07, smileW, Math.PI * 0.15, Math.PI * 0.85);
  ctx.stroke();
  // Blush
  ctx.fillStyle = 'rgba(242, 120, 140, 0.35)';
  for (const sgn of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(c + sgn * S * 0.24, c + S * 0.05, S * 0.06, S * 0.035, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Radial feather: opaque centre, fully transparent by the edge (§8.4 / §9.3 expectation).
  ctx.globalCompositeOperation = 'destination-in';
  const feather = ctx.createRadialGradient(c, c, 0, c, c, R);
  feather.addColorStop(0, 'rgba(0,0,0,1)');
  feather.addColorStop(0.5, 'rgba(0,0,0,1)');
  feather.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = feather;
  ctx.fillRect(0, 0, S, S);
  ctx.globalCompositeOperation = 'source-over';
  return canvas;
}

const cache = new Map<number, Texture>();

/** Loads (or lazily draws) the core texture for a tier. Cached per tier. */
export async function loadCoreTexture(tier: number): Promise<Texture> {
  const cached = cache.get(tier);
  if (cached) return cached;
  let tex: Texture | null = null;
  const url = TIER_ART_URLS[tier];
  if (url) {
    try {
      tex = await Assets.load<Texture>(url);
    } catch (err) {
      console.warn(`Tier ${tier} art failed to load (${url}); using placeholder.`, err);
    }
  }
  if (!tex) tex = Texture.from(drawPlaceholderCore(tier));
  cache.set(tier, tex);
  return tex;
}

export async function preloadAllCoreTextures(): Promise<Texture[]> {
  const out: Texture[] = [];
  for (let t = 1; t <= TIER_COUNT; t++) out.push(await loadCoreTexture(t));
  return out;
}

/** Synchronous accessor once preloaded — the renderer never awaits mid-frame. */
export function getCoreTexture(tier: number): Texture {
  const t = cache.get(tier);
  if (!t) {
    const drawn = Texture.from(drawPlaceholderCore(tier));
    cache.set(tier, drawn);
    return drawn;
  }
  return t;
}
