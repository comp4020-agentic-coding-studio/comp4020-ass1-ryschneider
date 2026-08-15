import { describe, expect, it } from "vitest";
import { createFramebuffer } from "./framebuffer";
import { buildProjection, computeSceneBounds, renderScene, screenFractionToWorldXY } from "./pipeline";
import { ndcToScreen } from "./screen";
import { toNdc } from "./projection";
import { transformPoint } from "./mat4";
import { vec3 } from "./vec3";
import { createInitialState, identityTransform, tableRowsToMeshFields } from "../../state/scene";

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

  it("culls a vertex whose NDC z falls outside [-1, 1] instead of drawing it regardless of near/far", () => {
    const state = createInitialState();
    state.aspectRatio = 1;
    state.primitive = "points";
    // orthographic near/far default to [-10, 10]; a vertex at z=-20 (view-space,
    // since the view is un-engaged/identity) is well beyond far and must be culled.
    state.meshes[0] = {
      ...state.meshes[0]!,
      positions: [vec3(0.5, 0.5, -20)],
      normals: [vec3(0, 0, 1)],
      indices: [],
      vertexColors: [vec3(1, 1, 1)],
    };
    const fb = createFramebuffer(100, 100);

    renderScene(state, fb, [0, 0, 0]);

    const index = (50 * fb.width + 50) * 4;
    expect(fb.color[index]).toBe(0);
  });

  it("draws a vertex whose NDC z falls inside [-1, 1]", () => {
    const state = createInitialState();
    state.aspectRatio = 1;
    state.primitive = "points";
    state.meshes[0] = {
      ...state.meshes[0]!,
      positions: [vec3(0.5, 0.5, 0)],
      normals: [vec3(0, 0, 1)],
      indices: [],
      vertexColors: [vec3(1, 1, 1)],
    };
    const fb = createFramebuffer(100, 100);

    renderScene(state, fb, [0, 0, 0]);

    const index = (50 * fb.width + 50) * 4;
    expect(fb.color[index]).toBe(255);
  });
});

describe("screenFractionToWorldXY", () => {
  it("round-trips through buildProjection + ndcToScreen at a non-square aspect ratio", () => {
    const state = createInitialState();
    state.aspectRatio = 16 / 9;
    const width = 1600;
    const height = 900;
    const xFraction = 0.85;
    const yFraction = 0.2;

    const { x, y } = screenFractionToWorldXY(state, xFraction, yFraction);
    const clip = transformPoint(buildProjection(state), vec3(x, y, 0));
    const ndc = toNdc(clip);
    const screen = ndcToScreen(ndc, width, height);

    expect(screen.x / width).toBeCloseTo(xFraction, 10);
    expect(screen.y / height).toBeCloseTo(yFraction, 10);
  });

  it("reduces to plain passthrough when aspectRatio is 1 (matching the pre-fix square-canvas behavior)", () => {
    const state = createInitialState();
    state.aspectRatio = 1;

    const { x, y } = screenFractionToWorldXY(state, 0.3, 0.7);

    expect(x).toBeCloseTo(0.3, 10);
    expect(y).toBeCloseTo(0.7, 10);
  });
});

describe("buildProjection: orthographic anchor", () => {
  it("anchors at world (0.5, 0.5) while the view is un-engaged, matching stage 1's canvas-center convention", () => {
    const state = createInitialState();
    state.aspectRatio = 1;
    state.primitive = "points";
    state.meshes[0] = {
      ...state.meshes[0]!,
      positions: [vec3(0.5, 0.5, 0)],
      normals: [vec3(0, 0, 1)],
      indices: [],
      vertexColors: [vec3(1, 1, 1)],
    };
    const fb = createFramebuffer(100, 100);

    renderScene(state, fb, [0, 0, 0]);

    const index = (50 * fb.width + 50) * 4;
    expect(fb.color[index]).toBe(255);
  });

  it("anchors at the engaged view's target (view-space origin), not (0.5, 0.5), once the view is engaged", () => {
    const state = createInitialState();
    state.aspectRatio = 1;
    state.primitive = "points";
    state.viewEngaged = true;
    state.view = { azimuthDeg: 0, elevationDeg: 0, distance: 3, target: vec3(2, 5, -1) };
    state.meshes[0] = {
      ...state.meshes[0]!,
      positions: [vec3(2, 5, -1)],
      normals: [vec3(0, 0, 1)],
      indices: [],
      vertexColors: [vec3(1, 1, 1)],
    };
    const fb = createFramebuffer(100, 100);

    renderScene(state, fb, [0, 0, 0]);

    // A vertex placed exactly at the (arbitrary, off-(0.5,0.5)) view target
    // must render at canvas center once the view is engaged.
    const index = (50 * fb.width + 50) * 4;
    expect(fb.color[index]).toBe(255);
  });
});

describe("computeSceneBounds", () => {
  it("returns the center/radius of a single mesh's positions, respecting its transform", () => {
    const state = createInitialState();
    state.meshes = [
      {
        ...state.meshes[0]!,
        positions: [vec3(-1, -1, -1), vec3(1, 1, 1)],
        transform: { ...identityTransform(), translate: vec3(10, 20, 30) },
      },
    ];

    const { center, radius } = computeSceneBounds(state);

    expect(center.x).toBeCloseTo(10, 10);
    expect(center.y).toBeCloseTo(20, 10);
    expect(center.z).toBeCloseTo(30, 10);
    // Diagonal of the [-1,1]^3 box is 2*sqrt(3); radius is half that.
    expect(radius).toBeCloseTo(Math.sqrt(3), 10);
  });

  it("falls back to stage 1's default unit-square center when there are no vertices to bound", () => {
    const state = createInitialState();
    state.meshes = [{ ...state.meshes[0]!, positions: [] }];

    const { center, radius } = computeSceneBounds(state);

    expect(center).toEqual(vec3(0.5, 0.5, 0));
    expect(radius).toBe(0.5);
  });
});
