import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { JSDOM } from "jsdom";
import { describe, expect, it } from "vitest";
import { createFramebuffer } from "../src/lib/raster/framebuffer";
import { renderScene } from "../src/lib/raster/pipeline";
import { vec3 } from "../src/lib/raster/vec3";
import { createInitialState, identityTransform } from "../src/state/scene";
import type { MeshInstance } from "../src/state/scene";

/** One flat triangle with a distinct color at each vertex, so blend mode is the only variable. */
function triColorTriangle(): MeshInstance {
  const positions = [vec3(0, 0, 0), vec3(0.125, 0, 0), vec3(0.0625, 0.125, 0)];
  return {
    id: "tri",
    label: "tri",
    kind: "plane",
    positions,
    normals: positions.map(() => vec3(0, 0, 1)),
    indices: [[0, 1, 2]],
    vertexColors: [vec3(1, 0, 0), vec3(0, 1, 0), vec3(0, 0, 1)],
    meshColor: vec3(1, 1, 1),
    transform: identityTransform(),
  };
}

describe("stage 5: color & blending", () => {
  it("flat blend fills the whole face with v0's color, regardless of which vertex a sample sits near", () => {
    const state = createInitialState();
    state.material.enabled = false;
    state.blend = "flat";
    state.aspectRatio = 1;
    state.primitive = "triangles";
    state.meshes = [triColorTriangle()];

    const fb = createFramebuffer(400, 400);
    renderScene(state, fb, [0, 0, 0]);

    const nearV0 = (5 * fb.width + 5) * 4;
    const nearV1 = (5 * fb.width + 45) * 4;
    expect([fb.color[nearV0], fb.color[nearV0 + 1], fb.color[nearV0 + 2]]).toEqual([255, 0, 0]);
    expect([fb.color[nearV1], fb.color[nearV1 + 1], fb.color[nearV1 + 2]]).toEqual([255, 0, 0]);
  });

  it("linear blend interpolates a gradient, biasing color toward whichever vertex a sample sits near", () => {
    const state = createInitialState();
    state.material.enabled = false;
    state.blend = "linear";
    state.aspectRatio = 1;
    state.primitive = "triangles";
    state.meshes = [triColorTriangle()];

    const fb = createFramebuffer(400, 400);
    renderScene(state, fb, [0, 0, 0]);

    const nearV0 = (5 * fb.width + 5) * 4;
    const nearV1 = (5 * fb.width + 45) * 4;
    // Near v0 (red) the red channel should dominate; near v1 (green) green should dominate.
    expect(fb.color[nearV0]).toBeGreaterThan(fb.color[nearV1]);
    expect(fb.color[nearV1 + 1]).toBeGreaterThan(fb.color[nearV0 + 1]);
  });
});

describe("stage 5: structural markup (built dist/index.html)", () => {
  const dist = resolve("dist/index.html");
  const doc = new JSDOM(readFileSync(dist, "utf8")).window.document;

  it("has a stage-5 panel with mesh color, per-vertex colors, and a blend toggle, starting hidden", () => {
    const stage5 = doc.querySelector('section[data-stage="5"]');
    expect(stage5?.hasAttribute("hidden")).toBe(true);
    expect(stage5?.querySelector('[data-field="mesh-color"]')).toBeTruthy();
    expect(stage5?.querySelector('[data-mount="vertex-colors"]')).toBeTruthy();
    for (const value of ["flat", "linear"]) {
      expect(
        stage5?.querySelector(`[data-group="blend"] button[data-value="${value}"]`),
        `expected blend=${value}`,
      ).toBeTruthy();
    }
  });
});
