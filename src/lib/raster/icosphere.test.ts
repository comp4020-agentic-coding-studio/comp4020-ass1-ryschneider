import { describe, expect, it } from "vitest";
import { generateIcosphere } from "./icosphere";
import { length } from "./vec3";

describe("generateIcosphere", () => {
  it.each([0, 1, 2, 3])(
    "produces 10*4^n+2 vertices and 20*4^n faces at subdivision level %i",
    (n) => {
      const mesh = generateIcosphere(n);
      expect(mesh.positions.length).toBe(10 * 4 ** n + 2);
      expect(mesh.indices.length).toBe(20 * 4 ** n);
    },
  );

  it("places every vertex on the unit sphere", () => {
    const mesh = generateIcosphere(2);
    for (const p of mesh.positions) {
      expect(length(p)).toBeCloseTo(1, 6);
    }
  });

  it("only references valid vertex indices", () => {
    const mesh = generateIcosphere(2);
    for (const [a, b, c] of mesh.indices) {
      for (const i of [a, b, c]) {
        expect(i).toBeGreaterThanOrEqual(0);
        expect(i).toBeLessThan(mesh.positions.length);
      }
    }
  });

  it("gives every vertex a normal equal to its position (unit sphere at the origin)", () => {
    const mesh = generateIcosphere(1);
    expect(mesh.normals).toBe(mesh.positions);
  });
});
