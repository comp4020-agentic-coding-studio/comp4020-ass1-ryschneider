import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { JSDOM } from "jsdom";
import { describe, expect, it } from "vitest";
import { orbitEye } from "../src/lib/raster/camera";
import { createFramebuffer } from "../src/lib/raster/framebuffer";
import { renderScene } from "../src/lib/raster/pipeline";
import { add, normalize, scale, sub, vec3 } from "../src/lib/raster/vec3";
import type { Vec3 } from "../src/lib/raster/vec3";
import { createInitialState, identityTransform } from "../src/state/scene";
import type { MeshInstance } from "../src/state/scene";

function deg2rad(deg: number): number {
  return (deg * Math.PI) / 180;
}

function flatTriangle(id: string, positions: Vec3[], normal: Vec3): MeshInstance {
  return {
    id,
    label: id,
    kind: "plane",
    positions,
    normals: positions.map(() => normal),
    indices: [[0, 1, 2]],
    vertexColors: positions.map(() => vec3(1, 1, 1)),
    meshColor: vec3(1, 1, 1),
    transform: identityTransform(),
  };
}

/**
 * Both triangles sit ~0.7 world units from the origin (the camera, since
 * view stays identity) so their per-vertex viewDir barely varies across
 * their small spread -- letting one shared half-vector, computed from a
 * single reference point, stand in for "the" half-vector each triangle's
 * own vertices resolve to.
 */
describe("stage 7: specular highlight is spatially localized", () => {
  it("raising specular changes a face aligned with the light/view half-vector, but not one merely facing the light", () => {
    const state = createInitialState();
    state.material.ambient = 0.2;
    state.material.diffuse = 0.6;
    state.material.shininess = 32;
    state.material.enabled = true;
    state.light = { azimuthDeg: 20, elevationDeg: 30, distance: 5000 / 400, color: vec3(1, 1, 1) };
    state.aspectRatio = 1;
    state.orthographic.halfHeight = 4 / 400;

    const reference = vec3(198 / 400, 198 / 400, -5 / 400);
    const lightPos = orbitEye(deg2rad(state.light.azimuthDeg), deg2rad(state.light.elevationDeg), state.light.distance);
    const lightDir = normalize(sub(lightPos, reference));
    const viewDir = normalize(scale(reference, -1));
    const halfVec = normalize(add(lightDir, viewDir));

    // "hot": normal == the half-vector, so dot(n,h) = 1 -> maximal specular response.
    const hot = flatTriangle(
      "hot",
      [vec3(197 / 400, 197 / 400, -5 / 400), vec3(199 / 400, 197 / 400, -5 / 400), vec3(198 / 400, 199 / 400, -5 / 400)],
      halfVec,
    );
    // "cold": normal == the light direction, so it's fully diffuse-lit (dot(n,l)=1),
    // but dot(n,h) is well below 1 -- raised to shininess 32 that's negligible.
    const cold = flatTriangle(
      "cold",
      [vec3(201 / 400, 197 / 400, -5 / 400), vec3(203 / 400, 197 / 400, -5 / 400), vec3(202 / 400, 199 / 400, -5 / 400)],
      lightDir,
    );
    state.meshes = [hot, cold];

    const hotPixel = (specular: number) => {
      const fb = createFramebuffer(400, 400);
      renderScene({ ...state, material: { ...state.material, specular } }, fb, [0, 0, 0]);
      const idx = (100 * fb.width + 100) * 4;
      return [fb.color[idx], fb.color[idx + 1], fb.color[idx + 2]];
    };
    const coldPixel = (specular: number) => {
      const fb = createFramebuffer(400, 400);
      renderScene({ ...state, material: { ...state.material, specular } }, fb, [0, 0, 0]);
      const idx = (100 * fb.width + 300) * 4;
      return [fb.color[idx], fb.color[idx + 1], fb.color[idx + 2]];
    };

    const hotLow = hotPixel(0);
    const hotHigh = hotPixel(1);
    const coldLow = coldPixel(0);
    const coldHigh = coldPixel(1);

    // Sanity: sample points must actually land inside each triangle (not the background).
    expect(hotLow).not.toEqual([0, 0, 0]);
    expect(coldLow).not.toEqual([0, 0, 0]);

    expect(hotHigh[0]).toBeGreaterThan(hotLow[0]);
    expect(coldHigh).toEqual(coldLow);
  });
});

describe("stage 7: structural markup (built dist/index.html)", () => {
  const dist = resolve("dist/index.html");
  const doc = new JSDOM(readFileSync(dist, "utf8")).window.document;

  it("has a stage-7 panel with specular and shininess fields, starting hidden", () => {
    const stage7 = doc.querySelector('section[data-stage="7"]');
    expect(stage7?.hasAttribute("hidden")).toBe(true);
    expect(stage7?.querySelector('[data-field="specular"]')).toBeTruthy();
    expect(stage7?.querySelector('[data-field="shininess"]')).toBeTruthy();
  });
});
