import { describe, expect, it } from "vitest";
import { addTableRowAt, clearPreviewVertex, setPreviewVertex, setPrimitiveMode } from "./actions";
import { createInitialState } from "./scene";
import { createStore } from "./store";

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
