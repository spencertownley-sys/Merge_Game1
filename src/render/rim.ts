// Rim-style tier distinction (§3): solid / dashed / double so tiers read without colour.
// Styled as a soft painted ring just inside the glossy silhouette
// (ART_AND_STORY_DIRECTION.md §2 note).

import { Graphics } from 'pixi.js';
import { tierDef } from '../config/tiers';

export function drawRim(g: Graphics, tier: number, radius: number): Graphics {
  const def = tierDef(tier);
  g.clear();
  const r = radius * 0.86;
  const width = Math.max(1.5, radius * 0.07);
  const alpha = 0.75;
  const stroke = { width, color: def.rimColor, alpha, cap: 'round' as const };
  switch (def.rimStyle) {
    case 'solid':
      g.circle(0, 0, r).stroke(stroke);
      break;
    case 'dashed': {
      const dashes = 10;
      for (let i = 0; i < dashes; i++) {
        const a0 = (i / dashes) * Math.PI * 2;
        const a1 = a0 + ((Math.PI * 2) / dashes) * 0.55;
        g.arc(0, 0, r, a0, a1).stroke(stroke);
      }
      break;
    }
    case 'double':
      g.circle(0, 0, r).stroke(stroke);
      g.circle(0, 0, r - width * 2.2).stroke({ ...stroke, width: width * 0.7 });
      break;
  }
  return g;
}
