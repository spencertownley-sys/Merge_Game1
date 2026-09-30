// "Simple graphics" fallback (§9.1, §9.5): flat circle in the tier's gummy colour with the
// core art drawn on top and no shader. Used for very low-end devices and the
// simpleGraphics/reduce-motion settings.

import { Container, Graphics, Sprite, type Texture } from 'pixi.js';
import { tierDef } from '../config/tiers';
import type { ArtStyleId } from '../config/tuning';

export interface SimpleBall {
  container: Container;
  setAngle(angle: number): void;
  setGaze(yawSign: number): void;
}

function darken(hex: string, amount: number): string {
  const n = parseInt(hex.replace('#', ''), 16);
  const f = (c: number) => Math.round(c * (1 - amount));
  return `rgb(${f((n >> 16) & 0xff)}, ${f((n >> 8) & 0xff)}, ${f(n & 0xff)})`;
}

export function createSimpleBall(
  tier: number,
  radius: number,
  core: Texture,
  style: ArtStyleId = 'watercolor',
): SimpleBall {
  const def = tierDef(tier);
  const container = new Container();
  const disc = new Graphics();
  if (style === 'fruit') {
    // Bold flat fruit: saturated fill, thick darker outline, crisp gloss dot.
    disc.circle(0, 0, radius).fill({ color: def.rimColor });
    disc
      .circle(0, 0, radius - 1)
      .stroke({ width: Math.max(2, radius * 0.09), color: darken(def.rimColor, 0.35) });
    disc
      .ellipse(-radius * 0.35, -radius * 0.4, radius * 0.22, radius * 0.14)
      .fill({ color: '#ffffff', alpha: 0.75 });
    disc
      .circle(radius * 0.3, radius * 0.35, radius * 0.5)
      .fill({ color: darken(def.rimColor, 0.18), alpha: 0.35 });
  } else {
    // Watercolor paper: soft wash with a slightly darker bleeding edge, painted highlight.
    disc.circle(0, 0, radius).fill({ color: def.rimColor, alpha: 0.72 });
    disc
      .circle(0, 0, radius * 0.94)
      .stroke({ width: radius * 0.12, color: def.rimColor, alpha: 0.35 });
    disc.circle(0, 0, radius * 0.75).fill({ color: '#ffffff', alpha: 0.18 });
    disc
      .circle(-radius * 0.3, -radius * 0.35, radius * 0.28)
      .fill({ color: '#ffffff', alpha: 0.35 });
  }
  container.addChild(disc);

  const face = new Sprite(core);
  face.anchor.set(0.5);
  const faceSize = style === 'fruit' ? radius * 1.7 : radius * 1.6;
  face.width = faceSize;
  face.height = faceSize;
  container.addChild(face);

  return {
    container,
    setAngle(angle: number) {
      face.rotation = angle * 0.6; // visualSpinScale-ish, keeps faces readable
    },
    setGaze(yawSign: number) {
      face.x = yawSign * radius * 0.08;
    },
  };
}
