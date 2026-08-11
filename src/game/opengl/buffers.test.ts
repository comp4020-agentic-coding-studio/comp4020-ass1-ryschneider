import { describe, expect, it } from "vitest";
import { addTriangle, addVertex, createBufferState, isComplete, triangleCount } from "./buffers";

describe("buffers", () => {
  it("starts empty", () => {
    const state = createBufferState();
    expect(state.vertices).toEqual([]);
    expect(state.indices).toEqual([]);
    expect(triangleCount(state)).toBe(0);
  });

  it("appends vertices without mutating the previous state", () => {
    const empty = createBufferState();
    const withOne = addVertex(empty, 1, 2);
    expect(empty.vertices).toEqual([]);
    expect(withOne.vertices).toEqual([{ x: 1, y: 2 }]);
  });

  it("adds a triangle by referencing three vertex indices", () => {
    let state = createBufferState();
    state = addVertex(state, 0, 0);
    state = addVertex(state, 1, 0);
    state = addVertex(state, 0, 1);
    state = addTriangle(state, 0, 1, 2);
    expect(state.indices).toEqual([0, 1, 2]);
    expect(triangleCount(state)).toBe(1);
  });

  it("rejects a triangle referencing an out-of-range vertex index", () => {
    const state = addVertex(createBufferState(), 0, 0);
    expect(() => addTriangle(state, 0, 1, 2)).toThrow(RangeError);
  });

  it("is not complete until two triangles have been added", () => {
    let state = createBufferState();
    for (let i = 0; i < 4; i++) state = addVertex(state, i, i);
    expect(isComplete(state)).toBe(false);

    state = addTriangle(state, 0, 1, 2);
    expect(isComplete(state)).toBe(false);

    state = addTriangle(state, 1, 2, 3);
    expect(isComplete(state)).toBe(true);
  });
});
