// "Simple graphics" fallback (§9.1, §9.5): flat circle in the tier's gummy colour with the
// core art drawn on top and no shader. Used for very low-end devices and the
// simpleGraphics/reduce-motion settings.

import { Container, Graphics, Sprite, type Texture } from 'pixi.js';
import { tierDef } from '../config/tiers';

export interface SimpleBall {
  container: Container;
  setAngle(angle: number): void;
  setGaze(yawSign: number): void;
}

export function createSimpleBall(tier: number, radius: number, core: Texture): SimpleBall {
  const def = tierDef(tier);
  const container = new Container();
  const disc = new Graphics();
  disc.circle(0, 0, radius).fill({ color: def.rimColor, alpha: 0.85 });
  // soft highlight
  disc.circle(-radius * 0.3, -radius * 0.35, radius * 0.28).fill({ color: '#ffffff', alpha: 0.35 });
  container.addChild(disc);

  const face = new Sprite(core);
  face.anchor.set(0.5);
  face.width = radius * 1.6;
  face.height = radius * 1.6;
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
