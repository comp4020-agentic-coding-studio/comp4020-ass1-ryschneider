import { describe, expect, it } from "vitest";
import { orbitEye, orbitView } from "./camera";
import { transformPoint } from "./mat4";
import { vec3 } from "./vec3";

describe("orbitEye", () => {
  it("sits on +z at azimuth 0, elevation 0", () => {
    const eye = orbitEye(0, 0, 5);
    expect(eye.x).toBeCloseTo(0);
    expect(eye.y).toBeCloseTo(0);
    expect(eye.z).toBeCloseTo(5);
  });

  it("sits on +x at azimuth 90 degrees, elevation 0", () => {
    const eye = orbitEye(Math.PI / 2, 0, 5);
    expect(eye.x).toBeCloseTo(5);
    expect(eye.y).toBeCloseTo(0);
    expect(eye.z).toBeCloseTo(0, 5);
  });

  it("sits on +y at elevation 90 degrees", () => {
    const eye = orbitEye(0, Math.PI / 2, 5);
    expect(eye.x).toBeCloseTo(0, 5);
    expect(eye.y).toBeCloseTo(5);
    expect(eye.z).toBeCloseTo(0, 5);
  });

  it("scales with distance", () => {
    const eye = orbitEye(0.3, 0.4, 10);
    expect(Math.hypot(eye.x, eye.y, eye.z)).toBeCloseTo(10);
  });
});

describe("orbitView", () => {
  it("produces a view matrix that maps the orbiting eye to the view-space origin", () => {
    const view = orbitView(0.7, 0.2, 8);
    const eye = orbitEye(0.7, 0.2, 8);
    const eyeInView = transformPoint(view, eye);
    expect(eyeInView.x).toBeCloseTo(0);
    expect(eyeInView.y).toBeCloseTo(0);
    expect(eyeInView.z).toBeCloseTo(0);
  });

  it("maps a custom target to the view-space origin", () => {
    const target = vec3(1, 2, 3);
    const view = orbitView(0, 0, 5, target);
    const targetInView = transformPoint(view, target);
    expect(targetInView.x).toBeCloseTo(0);
    expect(targetInView.y).toBeCloseTo(0);
  });
});
