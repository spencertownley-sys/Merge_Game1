// Land metadata for the Journey map (ART_AND_STORY_DIRECTION.md §4.3). Level content per
// land lives in levels/. Only the first lands have levels at launch; the rest are listed so
// the map shows where the story is going.

import type { LandId } from '../types';

export interface LandDef {
  id: LandId;
  name: string;
  /** One-line story beat shown on the map / level intro. */
  blurb: string;
  /** What changes when it's restored. */
  restored: string;
}

export const LANDS: readonly LandDef[] = [
  {
    id: 'sunmeadow-hollow',
    name: 'Sunmeadow Hollow',
    blurb: 'A peaceful farming village where the shadow has barely reached. A good place to learn.',
    restored: 'The windmill turns again and the wildflowers find their colour.',
  },
  {
    id: 'driftmoor-cove',
    name: 'Driftmoor Cove',
    blurb: 'A foggy fishing cove where motes have been caught in the morning chill.',
    restored: 'The lighthouse lights, and the mist lifts off the water.',
  },
  {
    id: 'whisperwood',
    name: 'Whisperwood',
    blurb: 'A quiet forest where fallen logs and stones lie tangled with light.',
    restored: 'Dappled sun returns to the clearing and the moss glows green.',
  },
  {
    id: 'thistledown-hills',
    name: 'Thistledown Hills',
    blurb: 'Windswept hills. The gusts here push everything sideways.',
    restored: 'The thistledown drifts lavender again on a gentle breeze.',
  },
  {
    id: 'copperleaf-orchard',
    name: 'Copperleaf Orchard',
    blurb: 'An autumn orchard readying for a harvest festival.',
    restored: 'Copper and amber leaves catch the light; the banners go up.',
  },
  {
    id: 'mistvale-marsh',
    name: 'Mistvale Marsh',
    blurb: 'Misty wetlands with wooden walkways and hovering wisps.',
    restored: 'The wisps settle into soft teal lanterns over still water.',
  },
  {
    id: 'emberpeak',
    name: 'Emberpeak',
    blurb: 'Warm volcanic foothills at dusk.',
    restored: 'Embers drift upward in coral and rose.',
  },
  {
    id: 'cloudspire-isles',
    name: 'Cloudspire Isles',
    blurb: 'Floating islands joined by rope bridges.',
    restored: 'The lavender-pink sky returns and motes drift between islands.',
  },
  {
    id: 'frostglass-tundra',
    name: 'Frostglass Tundra',
    blurb: 'A pale icy plain under a soft winter sky.',
    restored: 'An aurora shimmers over the crystalline ice.',
  },
  {
    id: 'neonoko-city',
    name: 'Neonoko City',
    blurb: 'A bustling night market of pastel-neon lanterns. Speed and flourish win here.',
    restored: 'The lantern signs glow pink, lavender and mint.',
  },
  {
    id: 'starlit-harbor',
    name: 'Starlit Harbor',
    blurb: 'The quiet harbor after the market winds down. A breather.',
    restored: 'Lantern light reflects on calm silver-blue water.',
  },
  {
    id: 'sunreach-spire',
    name: 'Sunreach Spire',
    blurb: 'A tall tower climbing toward sunrise. The hardest climb.',
    restored: 'Gold and coral light pours down the floating stairways.',
  },
  {
    id: 'skylight-sanctuary',
    name: 'The Skylight Sanctuary',
    blurb: 'Open to the sky. Everything you have learned, to make the Skylight whole.',
    restored: 'The Skylight is whole again, and colour washes back over every land.',
  },
];

export function landDef(id: LandId): LandDef {
  const d = LANDS.find((l) => l.id === id);
  if (!d) throw new Error(`Unknown land ${id}`);
  return d;
}
