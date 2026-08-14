import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { JSDOM } from "jsdom";
import { describe, expect, it } from "vitest";
import { buildView } from "../src/lib/raster/pipeline";
import { identity } from "../src/lib/raster/mat4";
import { createInitialState } from "../src/state/scene";

describe("stage 3: view matrix", () => {
  it("stays the identity matrix until the camera is engaged", () => {
    const state = createInitialState();
    expect(state.viewEngaged).toBe(false);
    expect(Array.from(buildView(state))).toEqual(Array.from(identity()));
  });

  it("becomes a real orbit view once viewEngaged flips true", () => {
    const state = createInitialState();
    state.viewEngaged = true;
    state.view = { azimuthDeg: 30, elevationDeg: 20, distance: 5, target: state.view.target };

    const view = buildView(state);
    expect(Array.from(view)).not.toEqual(Array.from(identity()));
  });
});

describe("stage 3: structural markup (built dist/index.html)", () => {
  const dist = resolve("dist/index.html");
  const doc = new JSDOM(readFileSync(dist, "utf8")).window.document;

  it("has a stage-3 panel with azimuth/elevation/distance controls, starting hidden", () => {
    const stage3 = doc.querySelector('section[data-stage="3"]');
    expect(stage3?.hasAttribute("hidden")).toBe(true);
    for (const field of ["azimuthDeg", "elevationDeg", "distance"]) {
      expect(stage3?.querySelector(`[data-field="${field}"]`), `expected [data-field="${field}"]`).toBeTruthy();
    }
  });

  it("has a camera-engaged indicator", () => {
    expect(doc.querySelector('[data-testid="view-engage-indicator"]')).toBeTruthy();
  });

  it("has a mount point for the view matrix grid", () => {
    expect(doc.querySelector('[data-mount="stage3-matrix"]')).toBeTruthy();
  });
});
