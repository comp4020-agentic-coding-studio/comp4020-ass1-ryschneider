import { describe, expect, it } from "vitest";
import { identity, multiply, perspective, translate } from "./mat4";
import { ndcToScreen, projectToScreen } from "./screen";
import { vec3 } from "./vec3";

describe("ndcToScreen", () => {
  it("maps NDC center to the pixel center", () => {
    expect(ndcToScreen({ x: 0, y: 0, z: 0 }, 200, 100)).toEqual({ x: 100, y: 50 });
  });

  it("maps NDC corners to pixel corners, flipping y", () => {
    expect(ndcToScreen({ x: -1, y: 1, z: 0 }, 200, 100)).toEqual({ x: 0, y: 0 });
    expect(ndcToScreen({ x: 1, y: -1, z: 0 }, 200, 100)).toEqual({ x: 200, y: 100 });
  });
});

describe("projectToScreen", () => {
  it("projects a point in front of the camera onto the screen", () => {
    const view = translate(vec3(0, 0, -3));
    const projection = perspective(Math.PI / 2, 1, 0.1, 100);
    const result = projectToScreen(multiply(projection, view), vec3(0, 0, 0), 200, 200);
    expect(result).not.toBeNull();
    expect(result?.x).toBeCloseTo(100);
    expect(result?.y).toBeCloseTo(100);
  });

  it("returns null for a point behind the camera", () => {
    const view = identity();
    const projection = perspective(Math.PI / 2, 1, 0.1, 100);
    const result = projectToScreen(multiply(projection, view), vec3(0, 0, 10), 200, 200);
    expect(result).toBeNull();
  });
});
