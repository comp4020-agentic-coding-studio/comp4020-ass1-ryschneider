import { describe, expect, it } from "vitest";
import { createFramebuffer } from "./framebuffer";
import { renderScene } from "./pipeline";
import { vec3 } from "./vec3";
import { createInitialState, tableRowsToMeshFields } from "../../state/scene";

/** Stage 1 starts empty, so tests exercising its rendering place a triangle by hand. */
const TABLE_ROWS = [
  { id: "r0", x: 80 / 720, y: 90 / 400, z: 0 },
  { id: "r1", x: 280 / 720, y: 90 / 400, z: 0 },
  { id: "r2", x: 180 / 720, y: 230 / 400, z: 0 },
];

function withTableTriangle(state: ReturnType<typeof createInitialState>): void {
  state.tableRows = TABLE_ROWS;
  state.primitive = "triangles";
  state.meshes[0] = {
    ...state.meshes[0]!,
    ...tableRowsToMeshFields(TABLE_ROWS, "triangles"),
    vertexColors: TABLE_ROWS.map(() => vec3(1, 1, 1)),
  };
}

describe("renderScene", () => {
  it("stage 1 defaults (identity model/view, canvas-matched ortho) render the table as a solid white triangle at its exact pixel positions", () => {
    const state = createInitialState();
    // A square aspect ratio makes the canvas-matched orthographic box exactly
    // the unit square [0,1]x[0,1], so a normalized table vertex (nx, ny) maps
    // to the exact pixel (round(nx*width), round(ny*height)).
    state.aspectRatio = 1;
    withTableTriangle(state);
    const fb = createFramebuffer(720, 400);

    renderScene(state, fb, [0, 0, 0]);

    const [row] = state.tableRows;
    if (!row) throw new Error("expected a table row");
    const x = Math.round(row.x * fb.width);
    const y = Math.round(row.y * fb.height);
    const index = (y * fb.width + x) * 4;
    expect(fb.color[index]).toBe(255);
    expect(fb.color[index + 1]).toBe(255);
    expect(fb.color[index + 2]).toBe(255);
  });

  it("wireframe fill only draws edges, leaving the triangle's interior at the background color", () => {
    const state = createInitialState();
    state.fill = "wireframe";
    state.aspectRatio = 1;
    withTableTriangle(state);
    const fb = createFramebuffer(720, 400);

    renderScene(state, fb, [0, 0, 0]);

    // The table's centroid (interior of the triangle) should stay background.
    const rows = state.tableRows;
    const cx = Math.round((rows.reduce((sum, r) => sum + r.x, 0) / rows.length) * fb.width);
    const cy = Math.round((rows.reduce((sum, r) => sum + r.y, 0) / rows.length) * fb.height);
    const index = (cy * fb.width + cx) * 4;
    expect(fb.color[index]).toBe(0);
  });
});
