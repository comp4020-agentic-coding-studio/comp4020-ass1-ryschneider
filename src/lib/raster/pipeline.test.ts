import { describe, expect, it } from "vitest";
import { createFramebuffer } from "./framebuffer";
import { renderScene } from "./pipeline";
import { createInitialState } from "../../state/scene";

describe("renderScene", () => {
  it("stage 1 defaults (identity model/view, canvas-matched ortho) render the table as a solid white triangle at its exact pixel positions", () => {
    const state = createInitialState();
    // Canvas-matched: halfHeight tracks height/2, as canvas-host.ts keeps it synced pre-stage-2.
    state.orthographic.halfHeight = 400 / 2;
    const fb = createFramebuffer(720, 400);

    renderScene(state, fb, [0, 0, 0]);

    const row = state.tableRows[0];
    if (!row) throw new Error("expected a default table row");
    const x = Math.round(row.x);
    const y = Math.round(row.y);
    const index = (y * fb.width + x) * 4;
    expect(fb.color[index]).toBe(255);
    expect(fb.color[index + 1]).toBe(255);
    expect(fb.color[index + 2]).toBe(255);
  });

  it("wireframe fill only draws edges, leaving the triangle's interior at the background color", () => {
    const state = createInitialState();
    state.fill = "wireframe";
    state.orthographic.halfHeight = 400 / 2;
    const fb = createFramebuffer(720, 400);

    renderScene(state, fb, [0, 0, 0]);

    // The table's centroid (interior of the triangle) should stay background.
    const rows = state.tableRows;
    const cx = Math.round(rows.reduce((sum, r) => sum + r.x, 0) / rows.length);
    const cy = Math.round(rows.reduce((sum, r) => sum + r.y, 0) / rows.length);
    const index = (cy * fb.width + cx) * 4;
    expect(fb.color[index]).toBe(0);
  });
});
