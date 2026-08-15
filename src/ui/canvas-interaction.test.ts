import { describe, expect, it } from "vitest";
import { dragToOrbit, scrollZoomOrthographic, scrollZoomPerspective } from "./canvas-interaction";

describe("dragToOrbit", () => {
  it("wraps yaw cyclically past the +180 seam", () => {
    const { yawDeg } = dragToOrbit(0.9, 0, 170, 0);
    // 170 + 0.9*360 = 494 -> wraps to 494 - 360 = 134
    expect(yawDeg).toBeCloseTo(134, 5);
  });

  it("wraps yaw cyclically past the -180 seam", () => {
    const { yawDeg } = dragToOrbit(-0.9, 0, -170, 0);
    expect(yawDeg).toBeCloseTo(-134, 5);
  });

  it("clamps pitch at the poles instead of wrapping", () => {
    expect(dragToOrbit(0, -1, 0, 85).pitchDeg).toBe(89);
    expect(dragToOrbit(0, 1, 0, -85).pitchDeg).toBe(-89);
  });

  it("leaves yaw/pitch unchanged for a zero-delta drag", () => {
    expect(dragToOrbit(0, 0, 42, -17)).toEqual({ yawDeg: 42, pitchDeg: -17 });
  });
});

describe("scrollZoomOrthographic", () => {
  it("increases halfHeight (zooms out) for positive deltaY", () => {
    expect(scrollZoomOrthographic(100, 1)).toBeGreaterThan(1);
  });

  it("decreases halfHeight (zooms in) for negative deltaY", () => {
    expect(scrollZoomOrthographic(-100, 1)).toBeLessThan(1);
  });

  it("clamps to the slider's [0.05, 5] bounds", () => {
    expect(scrollZoomOrthographic(100000, 1)).toBe(5);
    expect(scrollZoomOrthographic(-100000, 1)).toBe(0.05);
  });
});

describe("scrollZoomPerspective", () => {
  it("increases distance (zooms out) for positive deltaY", () => {
    expect(scrollZoomPerspective(100, 3)).toBeGreaterThan(3);
  });

  it("decreases distance (zooms in) for negative deltaY", () => {
    expect(scrollZoomPerspective(-100, 3)).toBeLessThan(3);
  });

  it("clamps to the slider's [0.25, 15] bounds", () => {
    expect(scrollZoomPerspective(100000, 3)).toBe(15);
    expect(scrollZoomPerspective(-100000, 3)).toBe(0.25);
  });
});
