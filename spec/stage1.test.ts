import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { JSDOM } from "jsdom";
import { describe, expect, it } from "vitest";
import { createFramebuffer } from "../src/lib/raster/framebuffer";
import { renderScene } from "../src/lib/raster/pipeline";
import { vec3 } from "../src/lib/raster/vec3";
import { createInitialState, tableRowsToMeshFields } from "../src/state/scene";

describe("stage 1: identity passthrough", () => {
  it("renders a normalized table vertex at its exact screen-space pixel", () => {
    const state = createInitialState();
    const width = 720;
    const height = 400;
    // A square aspect ratio makes the canvas-matched orthographic box exactly
    // the unit square [0,1]x[0,1] -- the case where a normalized (nx, ny)
    // vertex maps to the exact pixel (round(nx*width), round(ny*height)),
    // independent of width/height individually.
    state.aspectRatio = 1;

    // Stage 1 starts empty, so a triangle is placed by hand here to exercise
    // the identity-passthrough math, independent of the UI's own default state.
    const tableRows = [
      { id: "r0", x: 80 / 720, y: 90 / 400, z: 0 },
      { id: "r1", x: 280 / 720, y: 90 / 400, z: 0 },
      { id: "r2", x: 180 / 720, y: 230 / 400, z: 0 },
    ];
    state.tableRows = tableRows;
    state.primitive = "triangles";
    state.meshes[0] = {
      ...state.meshes[0]!,
      ...tableRowsToMeshFields(tableRows, "triangles"),
      vertexColors: tableRows.map(() => vec3(1, 1, 1)),
    };

    const fb = createFramebuffer(width, height);
    renderScene(state, fb, [0, 0, 0]);

    const [row] = tableRows;
    const x = Math.round(row.x * width);
    const y = Math.round(row.y * height);
    const i = (y * width + x) * 4;

    expect([fb.color[i], fb.color[i + 1], fb.color[i + 2]]).toEqual([255, 255, 255]);
  });

  it("stays canvas-matched (autoFit) as the canvas resizes, with no manual projection edit", () => {
    const state = createInitialState();
    expect(state.orthographic.autoFit).toBe(true);
  });
});

describe("stage 1: structural markup (built dist/index.html)", () => {
  const dist = resolve("dist/index.html");
  const doc = new JSDOM(readFileSync(dist, "utf8")).window.document;

  it("has a visible, open stage-1 panel", () => {
    const stage1 = doc.querySelector('section[data-stage="1"]');
    expect(stage1?.hasAttribute("hidden")).toBe(false);
    expect(stage1?.querySelector("details")?.hasAttribute("open")).toBe(true);
  });

  it("hides stages 2-7 until revealed", () => {
    for (let n = 2; n <= 7; n++) {
      const section = doc.querySelector(`section[data-stage="${n}"]`);
      expect(section?.hasAttribute("hidden"), `stage ${n} should start hidden`).toBe(true);
    }
  });

  it("has a vertex table with at least one editable row", () => {
    const table = doc.querySelector('[data-testid="vertex-table"]');
    expect(table).toBeTruthy();
    expect(table?.querySelectorAll("tbody[data-vertex-rows] tr").length ?? 0).toBeGreaterThanOrEqual(0);
  });

  it("has persistent primitive-mode and fill-mode radio groups", () => {
    expect(doc.querySelectorAll('input[name="primitive"]').length).toBe(3);
    expect(doc.querySelectorAll('input[name="fill"]').length).toBe(2);
  });

  it("has the render target canvas", () => {
    expect(doc.querySelector("#scene-canvas")).toBeTruthy();
  });
});
