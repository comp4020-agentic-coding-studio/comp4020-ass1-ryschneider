import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { JSDOM } from "jsdom";
import { describe, expect, it } from "vitest";
import { buildProjection } from "../src/lib/raster/pipeline";
import { createInitialState } from "../src/state/scene";

describe("stage 2: projection matrix", () => {
  it("defaults to the canvas-matched orthographic passthrough", () => {
    const state = createInitialState();

    const projection = buildProjection(state);

    // The box is always centered at normalized (0.5, 0.5), regardless of
    // aspect ratio, so a vertex there should map to clip-space origin.
    const clipX = projection[0] * 0.5 + projection[12];
    const clipY = projection[5] * 0.5 + projection[13];
    expect(clipX).toBeCloseTo(0, 5);
    expect(clipY).toBeCloseTo(0, 5);
  });

  it("switches to a perspective matrix (non-orthographic) once projectionKind changes", () => {
    const state = createInitialState();
    state.projectionKind = "perspective";
    state.perspective = { fovYDeg: 60, near: 0.1, far: 100 };

    const projection = buildProjection(state);

    // Perspective matrices carry a -1 in row 3, col 2 (index 11) to divide by -z; orthographic never does.
    expect(projection[11]).toBeCloseTo(-1, 5);
  });

  it("stops auto-fitting to the canvas once a manual ortho param is set", () => {
    const state = createInitialState();
    expect(state.orthographic.autoFit).toBe(true);
  });
});

describe("stage 2: structural markup (built dist/index.html)", () => {
  const dist = resolve("dist/index.html");
  const doc = new JSDOM(readFileSync(dist, "utf8")).window.document;

  it("has a stage-2 panel with projection controls, starting hidden", () => {
    const stage2 = doc.querySelector('section[data-stage="2"]');
    expect(stage2?.hasAttribute("hidden")).toBe(true);
    expect(stage2?.querySelectorAll('input[name="projection-kind"]').length).toBe(2);
  });

  it("has fov/near/far/half-height range inputs", () => {
    for (const field of ["fovYDeg", "near", "far", "halfHeight"]) {
      expect(doc.querySelector(`[data-field="${field}"]`), `expected [data-field="${field}"]`).toBeTruthy();
    }
  });

  it("has a mount point for the projection matrix grid", () => {
    expect(doc.querySelector('[data-mount="stage2-matrix"]')).toBeTruthy();
  });
});
