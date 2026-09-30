// Dev-only harness for the §9.3 shader-orientation acceptance test (CLAUDE.md Step 4).
// Renders a ball with a known asymmetric test texture next to a plain Sprite of the same
// texture (ground truth for "upright, unmirrored" in Pixi), and exposes controls on
// window.__shaderTest for the Playwright spec in tests/e2e/shader-orientation.spec.ts.

import { Application, Container, Mesh, Rectangle, Shader, Sprite, Texture } from 'pixi.js';
import { ballUniformsOf, createBallShader } from '../ballShader';
import { getQuadGeometry } from '../ballView';
import { buildRotationMatrix } from '../orientation';

export interface ShaderTestApi {
  setYaw(yaw: number): void;
  setPitch(pitch: number): void;
  setAngle(angle: number): void;
  /** Reads RGBA at CSS-pixel (x, y) of the canvas. */
  readPixel(x: number, y: number): [number, number, number, number];
  layout: {
    ballCx: number;
    ballCy: number;
    ballR: number;
    spriteX: number;
    spriteY: number;
    spriteSize: number;
  };
}

declare global {
  interface Window {
    __shaderTest?: ShaderTestApi;
  }
}

/** Quadrant texture: TL red, TR green, BL blue, BR yellow, white disc in the middle. */
function makeTestTexture(size = 256): Texture {
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d')!;
  const h = size / 2;
  ctx.fillStyle = '#ff0000';
  ctx.fillRect(0, 0, h, h);
  ctx.fillStyle = '#00ff00';
  ctx.fillRect(h, 0, h, h);
  ctx.fillStyle = '#0000ff';
  ctx.fillRect(0, h, h, h);
  ctx.fillStyle = '#ffff00';
  ctx.fillRect(h, h, h, h);
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(h, h, size * 0.14, 0, Math.PI * 2);
  ctx.fill();
  return Texture.from(c);
}

export async function mountShaderTest(host: HTMLElement): Promise<void> {
  const app = new Application();
  await app.init({
    preference: 'webgl',
    width: 480,
    height: 320,
    resolution: 1,
    antialias: false,
    backgroundColor: '#202020',
  });
  host.appendChild(app.canvas);

  const tex = makeTestTexture();
  const root = new Container();
  app.stage.addChild(root);

  const ballR = 100;
  const ballCx = 140;
  const ballCy = 160;
  const shader = createBallShader(1, tex);
  const u = ballUniformsOf(shader);
  // Neutral gummy so the quadrant colours stay identifiable.
  u.uGummyColor.set([0.5, 0.5, 0.5]);
  u.uRimColor.set([0.5, 0.5, 0.5]);
  u.uWrap = 0; // orthographic keeps the quadrant boundaries where the sprite has them
  const mesh = new Mesh<ReturnType<typeof getQuadGeometry>, Shader>({
    geometry: getQuadGeometry(),
    shader,
  });
  mesh.scale.set(ballR);
  mesh.position.set(ballCx, ballCy);
  root.addChild(mesh);

  const spriteSize = 160;
  const spriteX = 300;
  const spriteY = 80;
  const sprite = new Sprite(tex);
  sprite.width = spriteSize;
  sprite.height = spriteSize;
  sprite.position.set(spriteX, spriteY);
  root.addChild(sprite);

  let yaw = 0;
  let pitch = 0;
  let angle = 0;
  const apply = () => {
    u.uRot.set(buildRotationMatrix(angle, yaw, pitch));
    app.render();
  };
  apply();

  window.__shaderTest = {
    setYaw(v) {
      yaw = v;
      apply();
    },
    setPitch(v) {
      pitch = v;
      apply();
    },
    setAngle(v) {
      angle = v;
      apply();
    },
    readPixel(x, y) {
      const out = app.renderer.extract.pixels({
        target: root,
        frame: new Rectangle(x, y, 1, 1),
        resolution: 1,
      });
      const p = out.pixels;
      return [p[0], p[1], p[2], p[3]];
    },
    layout: { ballCx, ballCy, ballR, spriteX, spriteY, spriteSize },
  };
}
