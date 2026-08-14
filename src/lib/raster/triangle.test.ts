import { describe, expect, it } from "vitest";
import { triangleMesh } from "./triangle";
import { cross, length, normalize, sub } from "./vec3";

describe("triangleMesh", () => {
  it("has exactly three vertices and one face", () => {
    const mesh = triangleMesh();
    expect(mesh.positions.length).toBe(3);
    expect(mesh.indices).toEqual([[0, 1, 2]]);
  });

  it("gives every vertex the same normal, matching the winding order", () => {
    const mesh = triangleMesh();
    const [p0, p1, p2] = mesh.positions;
    const expected = normalize(cross(sub(p1, p0), sub(p2, p0)));
    for (const n of mesh.normals) {
      expect(n.x).toBeCloseTo(expected.x);
      expect(n.y).toBeCloseTo(expected.y);
      expect(n.z).toBeCloseTo(expected.z);
    }
  });

  it("produces a unit normal", () => {
    const mesh = triangleMesh();
    expect(length(mesh.normals[0])).toBeCloseTo(1);
  });
});
