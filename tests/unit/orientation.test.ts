import { describe, expect, it } from 'vitest';
import {
  ORIENTATION,
  advanceSettle,
  buildRotationMatrix,
  coinFlipYaw,
  computeGaze,
  createSettleState,
  displayAngleFor,
  isAtRest,
  popScale,
  squashAmplitude,
  squashEnvelope,
  squashScales,
  wrapToPi,
} from '../../src/render/orientation';
import { IMPACT_SQUASH } from '../../src/config/physics';

describe('orientation math (§9.2)', () => {
  it('wrapToPi keeps angles in (-π, π]', () => {
    expect(wrapToPi(0)).toBe(0);
    expect(wrapToPi(Math.PI * 3)).toBeCloseTo(Math.PI);
    expect(wrapToPi(-Math.PI * 1.5)).toBeCloseTo(Math.PI / 2);
  });

  it('at-rest thresholds are speed < 15 px/s and |angvel| < 0.3 rad/s', () => {
    expect(isAtRest(10, 5, 0.2)).toBe(true);
    expect(isAtRest(20, 0, 0)).toBe(false);
    expect(isAtRest(0, 0, 0.5)).toBe(false);
  });

  it('settle rises over 0.5 s at rest and decays over 150 ms when motion resumes', () => {
    const s = createSettleState();
    advanceSettle(s, true, 250);
    expect(s.settle).toBeCloseTo(0.5); // smoothstep midpoint
    advanceSettle(s, true, 250);
    expect(s.settle).toBe(1);
    advanceSettle(s, false, 75);
    expect(s.settle).toBeCloseTo(0.5);
    advanceSettle(s, false, 100);
    expect(s.settle).toBe(0);
  });

  it('displayAngle scales by visualSpinScale and vanishes when fully settled', () => {
    expect(displayAngleFor(1, 0)).toBeCloseTo(ORIENTATION.visualSpinScale);
    expect(displayAngleFor(1, 1)).toBe(0);
  });

  it('gaze is capped at ±20° and points toward the pointer (right = positive yaw)', () => {
    const max = (ORIENTATION.gazeMaxDeg * Math.PI) / 180;
    const right = computeGaze({ x: 200, y: 300, pointer: { x: 1000, y: 300 }, vxPx: 0, vyPx: 0 });
    expect(right.yaw).toBeCloseTo(max);
    const up = computeGaze({ x: 200, y: 300, pointer: { x: 200, y: -1000 }, vxPx: 0, vyPx: 0 });
    expect(up.pitch).toBeCloseTo(max);
    const none = computeGaze({ x: 200, y: 300, pointer: null, vxPx: 0, vyPx: 0 });
    expect(none).toEqual({ yaw: 0, pitch: 0 });
  });

  it('identity rotation gives the identity matrix', () => {
    const m = buildRotationMatrix(0, 0, 0);
    const identity = [1, 0, 0, 0, 1, 0, 0, 0, 1];
    identity.forEach((v, i) => expect(m[i]).toBeCloseTo(v)); // tolerant of -0
  });

  it('the rotation matrix is orthonormal (a pure rotation)', () => {
    const m = buildRotationMatrix(0.7, 0.3, -0.2);
    // columns are unit length and mutually perpendicular
    const col = (i: number) => [m[i * 3], m[i * 3 + 1], m[i * 3 + 2]];
    const dot = (a: number[], b: number[]) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
    for (let i = 0; i < 3; i++) expect(dot(col(i), col(i))).toBeCloseTo(1);
    expect(dot(col(0), col(1))).toBeCloseTo(0);
    expect(dot(col(1), col(2))).toBeCloseTo(0);
  });
});

describe('impact squash (§9.2b) and merge pop (§5.3)', () => {
  it('envelope is zero outside 0..220 ms and starts fully compressed', () => {
    expect(squashEnvelope(-1, 1)).toBe(0);
    expect(squashEnvelope(IMPACT_SQUASH.durationMs + 1, 1)).toBe(0);
    expect(squashEnvelope(0, 1)).toBeCloseTo(1);
    expect(squashEnvelope(IMPACT_SQUASH.durationMs, 1)).toBeCloseTo(0);
  });

  it('scales widen X by 0.22 and flatten Y by 0.30 at full compression', () => {
    expect(squashScales(1)).toEqual({ scaleX: 1.22, scaleY: 0.7 });
    expect(squashScales(0)).toEqual({ scaleX: 1, scaleY: 1 });
  });

  it('amplitude scales with impact speed and is clamped', () => {
    expect(squashAmplitude(IMPACT_SQUASH.impactThresholdMps)).toBeCloseTo(0.25);
    expect(squashAmplitude(100)).toBe(1);
  });

  it('pop runs 0.8× → overshoot 1.08× → 1.0× over 140 ms', () => {
    expect(popScale(0)).toBeCloseTo(0.8);
    expect(popScale(ORIENTATION.popMs * 0.66)).toBeCloseTo(1.08, 2);
    expect(popScale(ORIENTATION.popMs)).toBe(1);
  });

  it('coin-flip is one full turn over 260 ms', () => {
    expect(coinFlipYaw(0)).toBe(0);
    expect(coinFlipYaw(ORIENTATION.coinFlipMs / 2)).toBeCloseTo(Math.PI);
    expect(coinFlipYaw(ORIENTATION.coinFlipMs)).toBe(0);
  });
});
