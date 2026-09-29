// The gummy-candy sphere shader from GAME_DESIGN_MERGE_TIERS.md §9.3 (2026-09-28 revision:
// uCore/uGummyColor, soft-glow blur, refraction offset) plus the JS uniform wiring per §9.4.
// The fragment source below is the doc's reference implementation, verbatim. Do not build
// against the older opaque-decal shader.

import { GlProgram, Shader, Texture, UniformGroup } from 'pixi.js';
import { tierDef } from '../config/tiers';

/** §9.4 visual tuning defaults. Values baked into the GLSL (spec power, rim strengths,
 *  blur taps, refraction) are the doc's defaults too — change them there, not here. */
export const SHADER_DEFAULTS = {
  wrap: 0.5,
  /** Normalized in the shader. View space is y-up (see the fragment source). */
  lightDir: [-0.35, -0.55, 0.76] as const,
} as const;

export const BALL_VERTEX_SRC = /* glsl */ `
in vec2 aPosition;
in vec2 aUV;
out vec2 vUV;

uniform mat3 uProjectionMatrix;
uniform mat3 uWorldTransformMatrix;
uniform mat3 uTransformMatrix;

void main() {
  mat3 mvp = uProjectionMatrix * uWorldTransformMatrix * uTransformMatrix;
  gl_Position = vec4((mvp * vec3(aPosition, 1.0)).xy, 0.0, 1.0);
  vUV = aUV;
}
`;

export const BALL_FRAGMENT_SRC = /* glsl */ `#version 300 es
precision highp float;

in vec2 vUV;                 // 0..1 across the ball's quad
uniform sampler2D uCore;     // baked face texture: default mote art OR personalized
                              // photo/fused face, tight crop, radial-feathered alpha (§8.4)
uniform vec2  uCoreTexel;    // 1.0 / core texture size (for the soft-glow taps below)
uniform mat3  uRot;          // ball orientation (object <- view)
uniform vec3  uGummyColor;   // tier's gummy body color = its rim color (§3), never the photo
uniform vec3  uRimColor;     // tier rim color (accessibility ring, same value as uGummyColor)
uniform vec3  uLightDir;     // normalized, default (-0.35, -0.55, 0.76)
uniform float uWrap;         // 0 = flat/orthographic, 1 = fully wrapped. Default 0.5
uniform float uHalo;         // 0..1 shimmer for tier 11
out vec4 fragColor;

const float COV = 1.4;       // radians of longitude/latitude the core texture covers (~80 deg)

// Cheap 5-tap blur: the core "glows through" the gummy material rather than sitting
// printed on its surface, so it should soften with distance from center (see fres below).
vec4 sampleCoreSoft(vec2 uv, float px) {
  vec4 c = texture(uCore, uv) * 0.4;
  c += texture(uCore, uv + vec2( px, 0.0) * uCoreTexel) * 0.15;
  c += texture(uCore, uv - vec2( px, 0.0) * uCoreTexel) * 0.15;
  c += texture(uCore, uv + vec2(0.0,  px) * uCoreTexel) * 0.15;
  c += texture(uCore, uv - vec2(0.0,  px) * uCoreTexel) * 0.15;
  return c;
}

void main() {
  vec2 p = vUV * 2.0 - 1.0;
  float d2 = dot(p, p);
  float aa = fwidth(sqrt(d2));
  float edge = 1.0 - smoothstep(1.0 - aa * 1.5, 1.0, sqrt(d2));
  if (edge <= 0.0) discard;

  float z = sqrt(max(0.0, 1.0 - d2));
  vec3 n = vec3(p.x, -p.y, z);            // view-space normal, y up
  vec3 q = uRot * n;                      // direction in ball space
  float fres = pow(1.0 - z, 3.0);         // 0 at center, 1 at silhouette

  // Refraction fake: light bends as it exits the curved gummy surface, so the core
  // image appears to pull slightly toward center near the rim rather than sitting flat.
  vec2 refractOffset = -p * fres * 0.22;

  vec2 ortho = q.xy;
  vec2 equi  = vec2(atan(q.x, q.z), asin(clamp(q.y, -1.0, 1.0))) / COV;
  vec2 m     = mix(ortho, equi, uWrap) + refractOffset;
  vec2 uv    = vec2(0.5 + 0.5 * m.x, 0.5 - 0.5 * m.y);

  // Sharp/bright near center, hazier near the rim — this is the core change from the
  // old opaque-decal shader: the face reads as embedded light, not a printed surface.
  vec4 core = sampleCoreSoft(clamp(uv, 0.0, 1.0), mix(0.4, 3.0, fres));
  float inside = step(0.0, uv.x) * step(uv.x, 1.0) * step(0.0, uv.y) * step(uv.y, 1.0);
  float facing = smoothstep(-0.05, 0.30, q.z);
  float glowStrength = facing * mix(0.4, 1.0, inside) * mix(1.0, 0.55, fres);

  vec3 innerGlow = mix(uGummyColor * 0.6, core.rgb, glowStrength);
  vec3 body      = mix(uGummyColor, innerGlow, 0.75);   // gummy body always shows through a little

  vec3 L = normalize(uLightDir);
  float diff = max(dot(n, L), 0.0);
  vec3 R = reflect(-L, n);
  float spec = pow(max(R.z, 0.0), 48.0);   // tighter, glossier highlight than the old opaque look

  vec3 col = body * (0.55 + 0.45 * diff)
           + spec * 0.55                    // glossy sugared exterior
           + uRimColor * fres * 0.55         // rim tint — light passing through, not paint
           + uGummyColor * fres * 0.35        // translucency: body color glows outward at the rim
           + uHalo * fres * vec3(1.0, 0.9, 0.5);

  fragColor = vec4(col * edge, edge);      // premultiplied alpha
}
`;

let sharedProgram: GlProgram | null = null;

/** One program shared by every ball mesh (§9.5: one Mesh per ball, one Shader program). */
export function getBallProgram(): GlProgram {
  if (!sharedProgram) {
    sharedProgram = GlProgram.from({
      vertex: BALL_VERTEX_SRC,
      fragment: BALL_FRAGMENT_SRC,
      name: 'gummy-ball',
    });
  }
  return sharedProgram;
}

export function hexToRgb01(hex: string): [number, number, number] {
  const n = parseInt(hex.replace('#', ''), 16);
  return [((n >> 16) & 0xff) / 255, ((n >> 8) & 0xff) / 255, (n & 0xff) / 255];
}

export interface BallUniforms {
  uRot: Float32Array;
  uGummyColor: Float32Array;
  uRimColor: Float32Array;
  uLightDir: Float32Array;
  uCoreTexel: Float32Array;
  uWrap: number;
  uHalo: number;
}

export type BallUniformGroup = UniformGroup<{
  uRot: { value: Float32Array; type: 'mat3x3<f32>' };
  uGummyColor: { value: Float32Array; type: 'vec3<f32>' };
  uRimColor: { value: Float32Array; type: 'vec3<f32>' };
  uLightDir: { value: Float32Array; type: 'vec3<f32>' };
  uCoreTexel: { value: Float32Array; type: 'vec2<f32>' };
  uWrap: { value: number; type: 'f32' };
  uHalo: { value: number; type: 'f32' };
}>;

export const IDENTITY_MAT3 = new Float32Array([1, 0, 0, 0, 1, 0, 0, 0, 1]);

/** Builds a per-ball Shader instance over the shared program, wired per §9.4 defaults.
 *  `uGummyColor` and `uRimColor` both come from the tier's rim color (§3 revision) — never
 *  sampled from the core art. */
export function createBallShader(tier: number, core: Texture): Shader {
  const def = tierDef(tier);
  const rgb = hexToRgb01(def.rimColor);
  const uniforms: BallUniformGroup = new UniformGroup({
    uRot: { value: new Float32Array(IDENTITY_MAT3), type: 'mat3x3<f32>' },
    uGummyColor: { value: new Float32Array(rgb), type: 'vec3<f32>' },
    uRimColor: { value: new Float32Array(rgb), type: 'vec3<f32>' },
    uLightDir: { value: new Float32Array(SHADER_DEFAULTS.lightDir), type: 'vec3<f32>' },
    uCoreTexel: {
      value: new Float32Array([1 / core.source.pixelWidth, 1 / core.source.pixelHeight]),
      type: 'vec2<f32>',
    },
    uWrap: { value: SHADER_DEFAULTS.wrap, type: 'f32' },
    uHalo: { value: 0, type: 'f32' },
  });
  return new Shader({
    glProgram: getBallProgram(),
    resources: {
      ballUniforms: uniforms,
      uCore: core.source,
      uCoreSampler: core.source.style,
    },
  });
}

export function ballUniformsOf(shader: Shader): BallUniformGroup['uniforms'] {
  return (shader.resources.ballUniforms as BallUniformGroup).uniforms;
}
