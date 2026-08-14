import { describe, expect, it } from "vitest";
import { perspective } from "./mat4";
import { projectPoint, toNdc } from "./projection";
import { vec3 } from "./vec3";

describe("toNdc", () => {
  it("divides x, y, and z by w", () => {
    const ndc = toNdc({ x: 2, y: 4, z: -6, w: 2 });
    expect(ndc).toEqual({ x: 1, y: 2, z: -3 });
  });
});

describe("projectPoint", () => {
  const proj = perspective(Math.PI / 2, 1, 1, 100);

  it("maps a point straight ahead to the center of NDC (x=0, y=0)", () => {
    const ndc = projectPoint(proj, vec3(0, 0, -10));
    expect(ndc.x).toBeCloseTo(0);
    expect(ndc.y).toBeCloseTo(0);
  });

  it("maps the near plane to NDC z of -1 and the far plane to NDC z of 1", () => {
    const near = projectPoint(proj, vec3(0, 0, -1));
    const far = projectPoint(proj, vec3(0, 0, -100));
    expect(near.z).toBeCloseTo(-1, 5);
    expect(far.z).toBeCloseTo(1, 5);
  });

  it("maps points off the view axis to nonzero NDC x/y", () => {
    const ndc = projectPoint(proj, vec3(1, 0, -1));
    expect(ndc.x).toBeGreaterThan(0);
  });
});
