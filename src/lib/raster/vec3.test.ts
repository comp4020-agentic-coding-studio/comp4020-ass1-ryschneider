import { describe, expect, it } from "vitest";
import { add, cross, dot, length, lerp, mul, normalize, scale, sub, vec3 } from "./vec3";

describe("vec3", () => {
  it("adds and subtracts componentwise", () => {
    expect(add(vec3(1, 2, 3), vec3(4, 5, 6))).toEqual(vec3(5, 7, 9));
    expect(sub(vec3(4, 5, 6), vec3(1, 2, 3))).toEqual(vec3(3, 3, 3));
  });

  it("scales componentwise", () => {
    expect(scale(vec3(1, -2, 3), 2)).toEqual(vec3(2, -4, 6));
  });

  it("computes the componentwise product", () => {
    expect(mul(vec3(2, 3, 4), vec3(5, 6, 7))).toEqual(vec3(10, 18, 28));
  });

  it("computes the dot product", () => {
    expect(dot(vec3(1, 0, 0), vec3(0, 1, 0))).toBe(0);
    expect(dot(vec3(1, 2, 3), vec3(1, 2, 3))).toBe(14);
  });

  it("computes the cross product of orthogonal unit vectors", () => {
    expect(cross(vec3(1, 0, 0), vec3(0, 1, 0))).toEqual(vec3(0, 0, 1));
  });

  it("computes length as the euclidean norm", () => {
    expect(length(vec3(3, 4, 0))).toBe(5);
  });

  it("normalizes to unit length, and treats the zero vector as zero", () => {
    const n = normalize(vec3(3, 4, 0));
    expect(length(n)).toBeCloseTo(1);
    expect(normalize(vec3(0, 0, 0))).toEqual(vec3(0, 0, 0));
  });

  it("lerps linearly between two points", () => {
    expect(lerp(vec3(0, 0, 0), vec3(10, 10, 10), 0.5)).toEqual(vec3(5, 5, 5));
    expect(lerp(vec3(0, 0, 0), vec3(10, 0, 0), 0)).toEqual(vec3(0, 0, 0));
    expect(lerp(vec3(0, 0, 0), vec3(10, 0, 0), 1)).toEqual(vec3(10, 0, 0));
  });
});
