import { describe, expect, it } from "vitest";
import {
  addTableRowAt,
  clearPreviewVertex,
  fitEverythingIntoView,
  setPreviewVertex,
  setPrimitiveMode,
  setProjectionKind,
  setViewParam,
} from "./actions";
import { createInitialState } from "./scene";
import { createStore } from "./store";
import { buildProjection, buildView } from "../lib/raster/pipeline";
import { multiply, transformPoint } from "../lib/raster/mat4";
import { toNdc } from "../lib/raster/projection";
import { vec3 } from "../lib/raster/vec3";

describe("addTableRowAt", () => {
  it("rounds placed coordinates to 4 decimal places", () => {
    const store = createStore(createInitialState());
    addTableRowAt(store, 1 / 3, 2 / 3);

    const [row] = store.get().tableRows;
    expect(row?.x).toBe(0.3333);
    expect(row?.y).toBe(0.6667);
  });

  it("clears any in-progress preview vertex once a row is committed", () => {
    const store = createStore(createInitialState());
    setPreviewVertex(store, 0.1, 0.2);
    expect(store.get().previewRow).not.toBeNull();

    addTableRowAt(store, 0.3, 0.4);
    expect(store.get().previewRow).toBeNull();
  });
});

describe("setPreviewVertex / clearPreviewVertex", () => {
  it("extends the rendered mesh without writing into tableRows", () => {
    const store = createStore(createInitialState());
    setPrimitiveMode(store, "triangles");
    addTableRowAt(store, 0, 0);
    addTableRowAt(store, 0.5, 0);

    setPreviewVertex(store, 0.25, 0.5);
    const state = store.get();
    expect(state.tableRows).toHaveLength(2);
    expect(state.meshes[0]?.positions).toHaveLength(3);

    clearPreviewVertex(store);
    const cleared = store.get();
    expect(cleared.previewRow).toBeNull();
    expect(cleared.meshes[0]?.positions).toHaveLength(2);
  });

  it("does not fool the stage-1 -> stage-2 reveal gate (2 real rows + 1 preview row stays gated)", () => {
    const store = createStore(createInitialState());
    setPrimitiveMode(store, "triangles");
    addTableRowAt(store, 0, 0);
    addTableRowAt(store, 0.5, 0);

    setPreviewVertex(store, 0.25, 0.5);
    expect(store.get().progress.revealed[1]).toBe(false);

    addTableRowAt(store, 0.25, 0.5);
    expect(store.get().progress.revealed[1]).toBe(true);
  });
});

describe("fitEverythingIntoView", () => {
  function withOffCenterMesh(store: ReturnType<typeof createStore>): void {
    store.update((state) => ({
      ...state,
      meshes: [
        {
          ...state.meshes[0]!,
          positions: [vec3(9, 19, 29), vec3(11, 21, 31)],
          normals: [vec3(0, 0, 1), vec3(0, 0, 1)],
          indices: [],
          vertexColors: [vec3(1, 1, 1), vec3(1, 1, 1)],
        },
      ],
    }));
  }

  it("frames an off-center mesh in orthographic mode: its extreme corners land within [-1, 1] NDC x/y", () => {
    const store = createStore(createInitialState());
    withOffCenterMesh(store);

    fitEverythingIntoView(store);

    const state = store.get();
    expect(state.viewEngaged).toBe(true);
    expect(state.projectionKind).toBe("orthographic");

    const viewProjection = multiply(buildProjection(state), buildView(state));
    for (const corner of [vec3(9, 19, 29), vec3(11, 21, 31)]) {
      const ndc = toNdc(transformPoint(viewProjection, corner));
      expect(Math.abs(ndc.x)).toBeLessThanOrEqual(1);
      expect(Math.abs(ndc.y)).toBeLessThanOrEqual(1);
      expect(ndc.z).toBeGreaterThanOrEqual(-1);
      expect(ndc.z).toBeLessThanOrEqual(1);
    }
  });

  it("frames the same off-center mesh in perspective mode", () => {
    const store = createStore(createInitialState());
    setProjectionKind(store, "perspective");
    withOffCenterMesh(store);

    fitEverythingIntoView(store);

    const state = store.get();
    expect(state.viewEngaged).toBe(true);
    expect(state.projectionKind).toBe("perspective");

    const viewProjection = multiply(buildProjection(state), buildView(state));
    for (const corner of [vec3(9, 19, 29), vec3(11, 21, 31)]) {
      const clip = transformPoint(viewProjection, corner);
      expect(clip.w).toBeGreaterThan(0);
      const ndc = toNdc(clip);
      expect(Math.abs(ndc.x)).toBeLessThanOrEqual(1);
      expect(Math.abs(ndc.y)).toBeLessThanOrEqual(1);
      expect(ndc.z).toBeGreaterThanOrEqual(-1);
      expect(ndc.z).toBeLessThanOrEqual(1);
    }
  });

  it("reveals stage 3 but not stage 4 on its own -- fitting the view isn't 'playing with the camera'", () => {
    const store = createStore(createInitialState());
    withOffCenterMesh(store);

    fitEverythingIntoView(store);

    const revealed = store.get().progress.revealed;
    expect(revealed[2]).toBe(true);
    expect(revealed[3]).toBe(false);
  });
});

describe("setViewParam", () => {
  it("does not reveal stage 4 on a single nudge, but does once the camera has been genuinely played with", () => {
    const store = createStore(createInitialState());

    for (let i = 0; i < 7; i++) {
      setViewParam(store, { yawDeg: i });
      expect(store.get().progress.revealed[3]).toBe(false);
    }

    setViewParam(store, { yawDeg: 7 });
    expect(store.get().progress.revealed[3]).toBe(true);
  });
});
