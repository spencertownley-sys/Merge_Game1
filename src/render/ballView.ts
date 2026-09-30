// One rendered ball: a quad Mesh with the gummy shader (high quality) or the flat sprite
// fallback (simpleSprite.ts), plus the accessibility rim ring and optional tier numeral.

import { Container, Graphics, Mesh, MeshGeometry, Shader, Text, type Texture } from 'pixi.js';
import { ballUniformsOf, createBallShader } from './ballShader';
import { drawRim } from './rim';
import { createSimpleBall, type SimpleBall } from './simpleSprite';
import { tierDef } from '../config/tiers';
import type { ArtStyleId } from '../config/tuning';

let quadGeometry: MeshGeometry | null = null;

/** A unit quad (-1..1) whose UVs run 0..1 left→right, top→bottom, shared by every ball. */
export function getQuadGeometry(): MeshGeometry {
  if (!quadGeometry) {
    quadGeometry = new MeshGeometry({
      positions: new Float32Array([-1, -1, 1, -1, 1, 1, -1, 1]),
      uvs: new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]),
      indices: new Uint32Array([0, 1, 2, 0, 2, 3]),
    });
  }
  return quadGeometry;
}

export type GraphicsQuality = 'high' | 'simple';

export interface BallViewOptions {
  tier: number;
  radius: number;
  quality: GraphicsQuality;
  /** Admin art style. 'gummy' uses the shader (unless quality is 'simple'); the others are
   *  sprite-based and ignore quality. */
  artStyle?: ArtStyleId;
  coreTexture: Texture;
  showTierNumber: boolean;
  /** Journey obstacles render with an overlay. */
  kind?: 'ball' | 'rock' | 'ice';
}

export class BallView {
  readonly container = new Container();
  /** Squash/pop scale is applied here so the rim and numeral distort with the body. */
  readonly body = new Container();
  private mesh: Mesh<MeshGeometry, Shader> | null = null;
  private simple: SimpleBall | null = null;
  private rim: Graphics | null = null;
  private overlay: Graphics | null = null;
  private label: Text | null = null;
  readonly tier: number;
  readonly radius: number;
  private kind: 'ball' | 'rock' | 'ice';

  constructor(opts: BallViewOptions) {
    this.tier = opts.tier;
    this.radius = opts.radius;
    this.kind = opts.kind ?? 'ball';
    this.container.addChild(this.body);

    if (this.kind === 'rock') {
      const g = new Graphics();
      g.circle(0, 0, opts.radius).fill({ color: '#8b8378' });
      g.circle(-opts.radius * 0.3, -opts.radius * 0.3, opts.radius * 0.35).fill({
        color: '#a59c8e',
        alpha: 0.7,
      });
      g.circle(0, 0, opts.radius).stroke({ width: 2, color: '#5f574d', alpha: 0.8 });
      this.body.addChild(g);
      return;
    }

    const style = opts.artStyle ?? 'gummy';
    if (style === 'gummy' && opts.quality === 'high') {
      const shader = createBallShader(opts.tier, opts.coreTexture);
      this.mesh = new Mesh({ geometry: getQuadGeometry(), shader });
      this.mesh.scale.set(opts.radius);
      this.body.addChild(this.mesh);
    } else {
      this.simple = createSimpleBall(
        opts.tier,
        opts.radius,
        opts.coreTexture,
        style === 'gummy' ? 'watercolor' : style,
      );
      this.body.addChild(this.simple.container);
    }

    // The bold fruit style carries its own outline; the accessibility rim still draws (§3),
    // slightly inset so it reads as a second ring rather than doubling the outline.
    this.rim = drawRim(
      new Graphics(),
      opts.tier,
      style === 'fruit' ? opts.radius * 0.9 : opts.radius,
    );
    this.body.addChild(this.rim);

    if (this.kind === 'ice') this.setFrozen(true);
    if (opts.showTierNumber) this.setTierNumberVisible(true);
  }

  /** Ice glaze (§10.3 "looks glazed"); removed on thaw. */
  setFrozen(frozen: boolean): void {
    if (frozen && !this.overlay) {
      const g = new Graphics();
      g.circle(0, 0, this.radius).fill({ color: '#dff4ff', alpha: 0.55 });
      g.circle(0, 0, this.radius * 0.97).stroke({ width: 2, color: '#ffffff', alpha: 0.9 });
      // a couple of frost cracks
      g.moveTo(-this.radius * 0.5, -this.radius * 0.2)
        .lineTo(-this.radius * 0.1, 0.1 * this.radius)
        .lineTo(this.radius * 0.35, -this.radius * 0.4)
        .stroke({ width: 1.5, color: '#ffffff', alpha: 0.8 });
      this.overlay = g;
      this.body.addChild(g);
      this.kind = 'ice';
    } else if (!frozen && this.overlay) {
      this.overlay.destroy();
      this.overlay = null;
      this.kind = 'ball';
    }
  }

  setTierNumberVisible(visible: boolean): void {
    if (visible && !this.label && this.kind !== 'rock') {
      const def = tierDef(this.tier);
      this.label = new Text({
        text: String(this.tier),
        style: {
          fontFamily: 'system-ui, sans-serif',
          fontSize: Math.max(10, this.radius * 0.5),
          fontWeight: '700',
          fill: '#ffffff',
          stroke: { color: def.rimColor, width: Math.max(2, this.radius * 0.1) },
        },
      });
      this.label.anchor.set(0.5);
      this.label.position.set(0, this.radius * 0.55);
      this.container.addChild(this.label);
    } else if (!visible && this.label) {
      this.label.destroy();
      this.label = null;
    }
  }

  setTransform(x: number, y: number, angle: number): void {
    this.container.position.set(x, y);
    // The shader handles the visual spin via uRot; the simple fallback rotates the sprite.
    if (this.simple) this.simple.setAngle(angle);
    if (this.rim) this.rim.rotation = angle;
  }

  setSquash(scaleX: number, scaleY: number): void {
    this.body.scale.set(scaleX, scaleY);
  }

  setPop(scale: number): void {
    this.container.scale.set(scale);
  }

  setOrientation(rot: Float32Array): void {
    if (!this.mesh) return;
    const u = ballUniformsOf(this.mesh.shader!);
    u.uRot.set(rot);
  }

  setHalo(value: number): void {
    if (!this.mesh) return;
    ballUniformsOf(this.mesh.shader!).uHalo = value;
  }

  setPointerFacing(yawSign: number): void {
    this.simple?.setGaze(yawSign);
  }

  destroy(): void {
    this.mesh?.shader?.destroy();
    this.container.destroy({ children: true });
  }
}
