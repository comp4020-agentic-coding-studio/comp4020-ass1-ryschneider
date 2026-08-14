import { describe, expect, it } from "vitest";
import {
  identity,
  lookAt,
  multiply,
  orthographic,
  perspective,
  rotateY,
  scaleAxes,
  scaleUniform,
  transformPoint,
  translate,
} from "./mat4";
import { ndcToScreen } from "./screen";
import { toNdc } from "./projection";
import { vec3 } from "./vec3";

function expectVec3Close(
  actual: { x: number; y: number; z: number },
  expected: { x: number; y: number; z: number },
  precision = 6,
) {
  expect(actual.x).toBeCloseTo(expected.x, precision);
  expect(actual.y).toBeCloseTo(expected.y, precision);
  expect(actual.z).toBeCloseTo(expected.z, precision);
}

describe("mat4", () => {
  it("identity leaves a point unchanged", () => {
    const p = transformPoint(identity(), vec3(1, 2, 3));
    expectVec3Close(p, vec3(1, 2, 3));
    expect(p.w).toBe(1);
  });

  it("translate moves a point by the given offset", () => {
    const p = transformPoint(translate(vec3(5, -2, 1)), vec3(1, 1, 1));
    expectVec3Close(p, vec3(6, -1, 2));
  });

  it("scaleUniform scales a point about the origin", () => {
    const p = transformPoint(scaleUniform(2), vec3(1, 2, 3));
    expectVec3Close(p, vec3(2, 4, 6));
  });

  it("scaleAxes scales each axis independently", () => {
    const p = transformPoint(scaleAxes(vec3(2, 3, 4)), vec3(1, 1, 1));
    expectVec3Close(p, vec3(2, 3, 4));
  });

  it("rotateY rotates a point 90 degrees about the y axis", () => {
    const p = transformPoint(rotateY(Math.PI / 2), vec3(1, 0, 0));
    expectVec3Close(p, vec3(0, 0, -1));
  });

  it("multiply composes so (a * b) * v equals a * (b * v)", () => {
    const a = translate(vec3(1, 0, 0));
    const b = scaleUniform(2);
    const combined = multiply(a, b);

    const v = vec3(3, 4, 5);
    const viaCombined = transformPoint(combined, v);
    const bp = transformPoint(b, v);
    const viaSequential = transformPoint(a, { x: bp.x, y: bp.y, z: bp.z });

    expectVec3Close(viaCombined, viaSequential);
  });

  it("lookAt places the eye's forward axis toward the target", () => {
    const view = lookAt(vec3(0, 0, 5), vec3(0, 0, 0), vec3(0, 1, 0));
    // The eye itself should transform to the origin of view space.
    const eyeInView = transformPoint(view, vec3(0, 0, 5));
    expectVec3Close(eyeInView, vec3(0, 0, 0));
  });

  it("perspective maps a point on the near plane's center line toward -1 in NDC z after divide", () => {
    const proj = perspective(Math.PI / 2, 1, 1, 100);
    const clip = transformPoint(proj, vec3(0, 0, -1));
    expect(clip.w).toBeCloseTo(1);
    expect(clip.z / clip.w).toBeCloseTo(-1, 5);
  });

  it("perspective maps a point on the far plane toward 1 in NDC z after divide", () => {
    const proj = perspective(Math.PI / 2, 1, 1, 100);
    const clip = transformPoint(proj, vec3(0, 0, -100));
    expect(clip.z / clip.w).toBeCloseTo(1, 5);
  });

  it("orthographic(0, W, H, 0, -N, N) is the screen-space passthrough: a vertex at (x, y) lands on pixel (x, y)", () => {
    const width = 800;
    const height = 600;
    const proj = orthographic(0, width, height, 0, -1, 1);
    const clip = transformPoint(proj, vec3(10, 20, 0));
    expect(clip.w).toBeCloseTo(1);
    const screen = ndcToScreen(toNdc(clip), width, height);
    expect(screen.x).toBeCloseTo(10, 6);
    expect(screen.y).toBeCloseTo(20, 6);
  });
});
