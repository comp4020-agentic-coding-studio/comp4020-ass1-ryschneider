import { describe, expect, it } from "vitest";
import { triangleIndicesToLineIndices } from "./geometry";

describe("triangleIndicesToLineIndices", () => {
  it("emits the three edges of a single triangle", () => {
    expect(triangleIndicesToLineIndices([0, 1, 2])).toEqual([0, 1, 1, 2, 2, 0]);
  });

  it("returns nothing for an empty index buffer", () => {
    expect(triangleIndicesToLineIndices([])).toEqual([]);
  });

  it("dedupes an edge shared by two triangles, regardless of winding direction", () => {
    // Triangle A: 0-1-2 (edge 1-2). Triangle B: 1-2-3 shares that same edge, traversed as 1-2 not 2-1.
    const lines = triangleIndicesToLineIndices([0, 1, 2, 1, 2, 3]);

    const edgeKey = (from: number, to: number) => (from < to ? `${from}:${to}` : `${to}:${from}`);
    const edges = new Set<string>();
    for (let i = 0; i + 1 < lines.length; i += 2) {
      const a = lines[i];
      const b = lines[i + 1];
      edges.add(edgeKey(a, b));
    }

    // 5 distinct edges total (0-1, 1-2, 2-0, 2-3, 3-1); the shared 1-2 edge counted once.
    expect(edges.size).toBe(5);
    expect(lines.length).toBe(10);
  });
});
