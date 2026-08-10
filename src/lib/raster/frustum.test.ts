import { describe, expect, it } from "vitest";
import { cameraBasis, frustumCorners } from "./frustum";
import { dot, length, sub, vec3 } from "./vec3";

describe("cameraBasis", () => {
  it("produces an orthonormal basis for an eye looking down -z", () => {
    const basis = cameraBasis(vec3(0, 0, 5), vec3(0, 0, 0));
    expect(basis.forward.z).toBeCloseTo(-1);
    expect(length(basis.right)).toBeCloseTo(1);
    expect(length(basis.up)).toBeCloseTo(1);
    expect(dot(basis.forward, basis.right)).toBeCloseTo(0);
    expect(dot(basis.forward, basis.up)).toBeCloseTo(0);
  });
});

describe("frustumCorners", () => {
  const basis = cameraBasis(vec3(0, 0, 5), vec3(0, 0, 0));

  it("centers the four corners on the forward axis", () => {
    const corners = frustumCorners(basis, Math.PI / 2, 1, 2);
    const centerX = corners.reduce((sum, c) => sum + c.x, 0) / 4;
    const centerY = corners.reduce((sum, c) => sum + c.y, 0) / 4;
    expect(centerX).toBeCloseTo(0);
    expect(centerY).toBeCloseTo(0);
  });

  it("widens as fov increases", () => {
    const narrow = frustumCorners(basis, Math.PI / 6, 1, 2);
    const wide = frustumCorners(basis, (Math.PI / 6) * 3, 1, 2);
    const narrowWidth = length(sub(narrow[0], narrow[1]));
    const wideWidth = length(sub(wide[0], wide[1]));
    expect(wideWidth).toBeGreaterThan(narrowWidth);
  });

  it("widens as distance increases", () => {
    const near = frustumCorners(basis, Math.PI / 3, 1, 1);
    const far = frustumCorners(basis, Math.PI / 3, 1, 4);
    const nearWidth = length(sub(near[0], near[1]));
    const farWidth = length(sub(far[0], far[1]));
    expect(farWidth).toBeGreaterThan(nearWidth);
  });
});
