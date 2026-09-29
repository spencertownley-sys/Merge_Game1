// Gaze / settle / spin math per GAME_DESIGN_MERGE_TIERS.md §9.2, the impact squash envelope
// per §9.2b, and the merge coin-flip. Pure functions: no Pixi, unit-testable.
//
//   orientation  = Rz(displayAngle) · Ry(yaw) · Rx(pitch)
//   displayAngle = wrapToPi(bodyAngle) × visualSpinScale × (1 − settle)
//   settle       = smoothstep(0, 0.5 s, timeAtRest)
//   yaw, pitch   = gaze toward pointer (max ±20°) + wobble from velocity

import { IMPACT_SQUASH } from '../config/physics';

export const ORIENTATION = {
  visualSpinScale: 0.6,
  /** "At rest" thresholds (§9.2). */
  restSpeedPxPerSec: 15,
  restAngvelRadPerSec: 0.3,
  settleRiseMs: 500,
  settleDecayMs: 150,
  gazeMaxDeg: 20,
  /** Pointer distance (px) at which gaze saturates. */
  gazeRangePx: 220,
  /** Velocity lean: yaw/pitch offset per px/s of velocity, capped at wobbleMaxDeg. */
  wobbleDegPerPxPerSec: 0.02,
  wobbleMaxDeg: 8,
  /** Merge coin-flip (§9.2): one full turn about Y. */
  coinFlipMs: 260,
  /** Merge result pop (§5.3): 0.8× → 1.0× with overshoot to 1.08×. */
  popMs: 140,
  /** Parents scale to 0 (§5.3). */
  parentShrinkMs: 80,
} as const;

const DEG = Math.PI / 180;

export function wrapToPi(a: number): number {
  let r = a % (2 * Math.PI);
  if (r > Math.PI) r -= 2 * Math.PI;
  if (r < -Math.PI) r += 2 * Math.PI;
  return r;
}

export function smoothstep(e0: number, e1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
}

export function isAtRest(vxPx: number, vyPx: number, angvel: number): boolean {
  return (
    Math.hypot(vxPx, vyPx) < ORIENTATION.restSpeedPxPerSec &&
    Math.abs(angvel) < ORIENTATION.restAngvelRadPerSec
  );
}

/** Per-ball smoothing state the renderer keeps between frames. */
export interface SettleState {
  timeAtRestMs: number;
  settle: number;
}

export function createSettleState(): SettleState {
  return { timeAtRestMs: 0, settle: 0 };
}

/** Advances settle by one render frame. Rises via smoothstep over 0.5 s at rest; when motion
 *  resumes it decays over 150 ms so there is no visible snap (§9.2). */
export function advanceSettle(state: SettleState, atRest: boolean, dtMs: number): number {
  if (atRest) {
    state.timeAtRestMs += dtMs;
    state.settle = Math.max(
      state.settle,
      smoothstep(0, ORIENTATION.settleRiseMs, state.timeAtRestMs),
    );
  } else {
    state.timeAtRestMs = 0;
    state.settle = Math.max(0, state.settle - dtMs / ORIENTATION.settleDecayMs);
  }
  return state.settle;
}

export interface GazeInput {
  /** Ball centre, board px. */
  x: number;
  y: number;
  /** Pointer position in board px, or null when the player isn't touching. */
  pointer: { x: number; y: number } | null;
  vxPx: number;
  vyPx: number;
}

/** yaw/pitch in radians. Positive yaw = face toward screen-right, positive pitch = face
 *  toward screen-up (the acceptance test in §9.3 checks the yaw direction). */
export function computeGaze(input: GazeInput): { yaw: number; pitch: number } {
  const max = ORIENTATION.gazeMaxDeg * DEG;
  let yaw = 0;
  let pitch = 0;
  if (input.pointer) {
    const dx = input.pointer.x - input.x;
    const dy = input.pointer.y - input.y; // board y is down
    yaw = Math.max(-1, Math.min(1, dx / ORIENTATION.gazeRangePx)) * max;
    pitch = Math.max(-1, Math.min(1, -dy / ORIENTATION.gazeRangePx)) * max;
  }
  const wobbleMax = ORIENTATION.wobbleMaxDeg * DEG;
  const lean = (v: number) =>
    Math.max(-wobbleMax, Math.min(wobbleMax, v * ORIENTATION.wobbleDegPerPxPerSec * DEG));
  yaw += lean(input.vxPx);
  pitch += lean(-input.vyPx);
  return { yaw, pitch };
}

export function displayAngleFor(bodyAngle: number, settle: number): number {
  return wrapToPi(bodyAngle) * ORIENTATION.visualSpinScale * (1 - settle);
}

/**
 * Builds uRot (object <- view) as a column-major mat3 for the shader.
 *
 * View space is x-right, y-UP, z toward the viewer (matching the shader's normal). Pixi's
 * body angle is positive-clockwise on screen, so the view<-object spin is Rz(-displayAngle);
 * positive pitch should look UP so it is Rx(-pitch). The shader wants object<-view, i.e. the
 * inverse, which for a pure rotation is the transpose — so we return M^T where
 * M = Rz(-displayAngle) · Ry(yaw) · Rx(-pitch).
 */
export function buildRotationMatrix(
  displayAngle: number,
  yaw: number,
  pitch: number,
  out: Float32Array = new Float32Array(9),
): Float32Array {
  const ca = Math.cos(-displayAngle);
  const sa = Math.sin(-displayAngle);
  const cy = Math.cos(yaw);
  const sy = Math.sin(yaw);
  const cp = Math.cos(-pitch);
  const sp = Math.sin(-pitch);

  // Row-major M = Rz · Ry · Rx
  // Rz = [ca -sa 0; sa ca 0; 0 0 1], Ry = [cy 0 sy; 0 1 0; -sy 0 cy], Rx = [1 0 0; 0 cp -sp; 0 sp cp]
  // Ry·Rx:
  const r00 = cy;
  const r01 = sy * sp;
  const r02 = sy * cp;
  const r10 = 0;
  const r11 = cp;
  const r12 = -sp;
  const r20 = -sy;
  const r21 = cy * sp;
  const r22 = cy * cp;
  // Rz·(Ry·Rx):
  const m00 = ca * r00 - sa * r10;
  const m01 = ca * r01 - sa * r11;
  const m02 = ca * r02 - sa * r12;
  const m10 = sa * r00 + ca * r10;
  const m11 = sa * r01 + ca * r11;
  const m12 = sa * r02 + ca * r12;
  const m20 = r20;
  const m21 = r21;
  const m22 = r22;

  // We need M^T in column-major order. Column-major of M^T == row-major of M laid out
  // column by column... i.e. out[col*3 + row] = (M^T)[row][col] = M[col][row].
  out[0] = m00;
  out[1] = m01;
  out[2] = m02;
  out[3] = m10;
  out[4] = m11;
  out[5] = m12;
  out[6] = m20;
  out[7] = m21;
  out[8] = m22;
  return out;
}

// --- §9.2b impact squash-and-stretch -------------------------------------------------------

/** Amplitude scales with impact speed and is clamped so a gentle settle barely squishes and a
 *  hard drop squishes noticeably. Returns 0..1. */
export function squashAmplitude(impactSpeedMps: number): number {
  const t = (impactSpeedMps - IMPACT_SQUASH.impactThresholdMps) / 6;
  return Math.min(1, Math.max(0.25, 0.25 + t));
}

/** Damped oscillation: quick flatten, one rebound overshoot, settle (~220 ms). */
export function squashEnvelope(tMs: number, amplitude: number): number {
  const D = IMPACT_SQUASH.durationMs;
  if (tMs < 0 || tMs > D) return 0;
  const periodMs = D / 1.5; // one flatten + one rebound inside the envelope
  const decay = 1 - tMs / D;
  return amplitude * decay * Math.cos((2 * Math.PI * tMs) / periodMs);
}

export function squashScales(envelope: number): { scaleX: number; scaleY: number } {
  return {
    scaleX: 1 + envelope * IMPACT_SQUASH.amplitudeX,
    scaleY: 1 - envelope * IMPACT_SQUASH.amplitudeY,
  };
}

// --- §5.3 merge result pop -----------------------------------------------------------------

/** 0.8× → 1.0× over 140 ms with an overshoot to 1.08× around two-thirds through. */
export function popScale(tMs: number): number {
  const D = ORIENTATION.popMs;
  if (tMs <= 0) return 0.8;
  if (tMs >= D) return 1;
  const t = tMs / D;
  // Ease out to 1.08 by t=0.66, then ease back to 1.0.
  if (t < 0.66) {
    const u = t / 0.66;
    return 0.8 + (1.08 - 0.8) * (1 - (1 - u) * (1 - u));
  }
  const u = (t - 0.66) / 0.34;
  return 1.08 + (1 - 1.08) * u;
}

/** Coin-flip yaw offset: one full turn over 260 ms, eased. */
export function coinFlipYaw(tMs: number): number {
  const D = ORIENTATION.coinFlipMs;
  if (tMs <= 0 || tMs >= D) return 0;
  const t = tMs / D;
  const eased = t * t * (3 - 2 * t);
  return eased * 2 * Math.PI;
}
