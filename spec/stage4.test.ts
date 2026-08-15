import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { JSDOM } from "jsdom";
import { describe, expect, it } from "vitest";
import { createFramebuffer } from "../src/lib/raster/framebuffer";
import { renderScene } from "../src/lib/raster/pipeline";
import { vec3 } from "../src/lib/raster/vec3";
import { createInitialState, identityTransform } from "../src/state/scene";
import type { MeshInstance } from "../src/state/scene";

function triangleMesh(id: string, positions: ReturnType<typeof vec3>[], z: number, color: [number, number, number]): MeshInstance {
  const verts = positions.map((p) => vec3(p.x, p.y, z));
  return {
    id,
    label: id,
    kind: "plane",
    positions: verts,
    normals: verts.map(() => vec3(0, 0, 1)),
    indices: [[0, 1, 2]],
    vertexColors: verts.map(() => vec3(...color)),
    meshColor: vec3(...color),
    transform: identityTransform(),
  };
}

/** One triangle big enough to cover the whole normalized [0,1]x[0,1] box used in the occlusion test below. */
function bigTriangle(id: string, z: number, color: [number, number, number]): MeshInstance {
  return triangleMesh(id, [vec3(-10, -10, 0), vec3(10, -10, 0), vec3(0, 10, 0)], z, color);
}

describe("stage 4: multi-mesh rendering", () => {
  it("two meshes at different translations render distinguishably", () => {
    const state = createInitialState();
    // Square aspect ratio matches the square 400x400 framebuffer below, so the
    // canvas-matched box is exactly [0,1]x[0,1] and a normalized (nx, ny)
    // mesh vertex lands at pixel (nx*400, ny*400).
    state.aspectRatio = 1;
    const left = triangleMesh("left", [vec3(0, 0, 0), vec3(0.125, 0, 0), vec3(0.0625, 0.125, 0)], 0, [1, 0, 0]);
    const right = triangleMesh("right", [vec3(0.75, 0, 0), vec3(0.875, 0, 0), vec3(0.8125, 0.125, 0)], 0, [0, 0, 1]);
    state.meshes = [left, right];

    const fb = createFramebuffer(400, 400);
    renderScene(state, fb, [0, 0, 0]);

    const leftIndex = (25 * fb.width + 25) * 4;
    const rightIndex = (25 * fb.width + 325) * 4;
    expect([fb.color[leftIndex], fb.color[leftIndex + 1], fb.color[leftIndex + 2]]).toEqual([255, 0, 0]);
    expect([fb.color[rightIndex], fb.color[rightIndex + 1], fb.color[rightIndex + 2]]).toEqual([0, 0, 255]);
  });

  it("occludes correctly via the z-test regardless of draw order", () => {
    const state = createInitialState();
    state.aspectRatio = 1;
    const near = bigTriangle("near", -3, [1, 0, 0]);
    const far = bigTriangle("far", 3, [0, 0, 1]);

    const fbOrderA = createFramebuffer(200, 200);
    const stateA = { ...state, meshes: [far, near] };
    renderScene(stateA, fbOrderA, [0, 0, 0]);

    const fbOrderB = createFramebuffer(200, 200);
    const stateB = { ...state, meshes: [near, far] };
    renderScene(stateB, fbOrderB, [0, 0, 0]);

    const centerIndex = (100 * fbOrderA.width + 100) * 4;
    const pixelA = [fbOrderA.color[centerIndex], fbOrderA.color[centerIndex + 1], fbOrderA.color[centerIndex + 2]];
    const pixelB = [fbOrderB.color[centerIndex], fbOrderB.color[centerIndex + 1], fbOrderB.color[centerIndex + 2]];
    expect(pixelA).toEqual(pixelB);
    expect(pixelA).not.toEqual([24, 24, 28]);
  });
});

describe("stage 4: structural markup (built dist/index.html)", () => {
  const dist = resolve("dist/index.html");
  const doc = new JSDOM(readFileSync(dist, "utf8")).window.document;

  it("has a stage-4 panel with a mesh-kind selector and add button, starting hidden", () => {
    const stage4 = doc.querySelector('section[data-stage="4"]');
    expect(stage4?.hasAttribute("hidden")).toBe(true);
    expect(stage4?.querySelector('[data-field="mesh-kind"]')).toBeTruthy();
    expect(stage4?.querySelector('[data-action="add-mesh"]')).toBeTruthy();
  });

  it("has the 9 transform sliders (translate/rotate/scale x3)", () => {
    for (const field of ["translateX", "translateY", "translateZ", "rotateX", "rotateY", "rotateZ", "scaleX", "scaleY", "scaleZ"]) {
      expect(doc.querySelector(`[data-field="${field}"]`), `expected [data-field="${field}"]`).toBeTruthy();
    }
  });

  it("has mount points for the mesh list and the model matrix grid", () => {
    expect(doc.querySelector('[data-mount="mesh-list"]')).toBeTruthy();
    expect(doc.querySelector('[data-mount="stage4-matrix"]')).toBeTruthy();
  });
});
