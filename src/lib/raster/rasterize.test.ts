import { describe, expect, it } from "vitest";
import { clear, createFramebuffer } from "./framebuffer";
import type { ScreenVertex } from "./rasterize";
import { rasterizeTriangle } from "./rasterize";

function readPixel(fb: ReturnType<typeof createFramebuffer>, x: number, y: number) {
  const i = (y * fb.width + x) * 4;
  return [fb.color[i], fb.color[i + 1], fb.color[i + 2], fb.color[i + 3]];
}

describe("rasterizeTriangle", () => {
  it("interpolates attributes across the triangle using barycentric weights", () => {
    const fb = createFramebuffer(2, 2);
    clear(fb, [0, 0, 0]);
    // Right triangle (0,0)-(2,0)-(0,2) over a 2x2 framebuffer: covers x+y <= 2.
    const v0: ScreenVertex = { x: 0, y: 0, depth: 0, invW: 1, attrs: { v: 0 } };
    const v1: ScreenVertex = { x: 2, y: 0, depth: 0, invW: 1, attrs: { v: 2 } };
    const v2: ScreenVertex = { x: 0, y: 2, depth: 0, invW: 1, attrs: { v: 0 } };

    const seen: Record<string, number> = {};
    rasterizeTriangle(v0, v1, v2, fb, (attrs, x, y) => {
      seen[`${x},${y}`] = attrs.v ?? Number.NaN;
      return [0, 0, 0];
    });

    expect(seen["0,0"]).toBeCloseTo(0.5);
    expect(seen["1,0"]).toBeCloseTo(1.5);
    expect(seen["0,1"]).toBeCloseTo(0.5);
    // (1,1)'s pixel center (1.5, 1.5) falls outside x + y <= 2, so it's never shaded.
    expect(seen["1,1"]).toBeUndefined();
  });

  it("writes the shaded color and full alpha for covered pixels", () => {
    const fb = createFramebuffer(2, 2);
    clear(fb, [0, 0, 0]);
    const v0: ScreenVertex = { x: -1, y: -1, depth: 0, invW: 1, attrs: {} };
    const v1: ScreenVertex = { x: 10, y: -1, depth: 0, invW: 1, attrs: {} };
    const v2: ScreenVertex = { x: -1, y: 10, depth: 0, invW: 1, attrs: {} };

    rasterizeTriangle(v0, v1, v2, fb, () => [10, 20, 30]);

    expect(readPixel(fb, 0, 0)).toEqual([10, 20, 30, 255]);
    expect(readPixel(fb, 1, 1)).toEqual([10, 20, 30, 255]);
  });

  it("keeps the nearer fragment regardless of draw order", () => {
    const fb = createFramebuffer(2, 2);
    clear(fb, [0, 0, 0]);
    const far: ScreenVertex[] = [
      { x: -1, y: -1, depth: 0.8, invW: 1, attrs: {} },
      { x: 10, y: -1, depth: 0.8, invW: 1, attrs: {} },
      { x: -1, y: 10, depth: 0.8, invW: 1, attrs: {} },
    ];
    const near: ScreenVertex[] = [
      { x: -1, y: -1, depth: 0.2, invW: 1, attrs: {} },
      { x: 10, y: -1, depth: 0.2, invW: 1, attrs: {} },
      { x: -1, y: 10, depth: 0.2, invW: 1, attrs: {} },
    ];

    // Draw the near triangle first...
    rasterizeTriangle(near[0]!, near[1]!, near[2]!, fb, () => [0, 255, 0]);
    // ...then the far one, which should lose the z-test everywhere.
    rasterizeTriangle(far[0]!, far[1]!, far[2]!, fb, () => [255, 0, 0]);

    expect(readPixel(fb, 0, 0)).toEqual([0, 255, 0, 255]);
    expect(readPixel(fb, 1, 1)).toEqual([0, 255, 0, 255]);
  });

  it("does not shade pixels for a degenerate (zero-area) triangle", () => {
    const fb = createFramebuffer(2, 2);
    const v0: ScreenVertex = { x: 0, y: 0, depth: 0, invW: 1, attrs: {} };
    const v1: ScreenVertex = { x: 1, y: 1, depth: 0, invW: 1, attrs: {} };
    const v2: ScreenVertex = { x: 2, y: 2, depth: 0, invW: 1, attrs: {} };

    let calls = 0;
    rasterizeTriangle(v0, v1, v2, fb, () => {
      calls++;
      return [0, 0, 0];
    });

    expect(calls).toBe(0);
  });
});
