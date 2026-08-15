import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { JSDOM } from "jsdom";
import { describe, expect, it } from "vitest";
import { orbitEye } from "../src/lib/raster/camera";
import { createFramebuffer } from "../src/lib/raster/framebuffer";
import { renderScene } from "../src/lib/raster/pipeline";
import type { Vec3 } from "../src/lib/raster/vec3";
import { normalize, sub, vec3 } from "../src/lib/raster/vec3";
import { createInitialState, identityTransform } from "../src/state/scene";
import type { MeshInstance, SceneState } from "../src/state/scene";

function deg2rad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/** One flat, uniformly-colored triangle, small and near the canvas origin like stage4/5's test meshes. */
function flatTriangle(normal: Vec3, color: Vec3): MeshInstance {
  const positions = [vec3(0, 0, -0.0125), vec3(0.125, 0, -0.0125), vec3(0.0625, 0.125, -0.0125)];
  return {
    id: "tri",
    label: "tri",
    kind: "plane",
    positions,
    normals: positions.map(() => normal),
    indices: [[0, 1, 2]],
    vertexColors: positions.map(() => color),
    meshColor: color,
    transform: identityTransform(),
  };
}

function samplePixel(state: SceneState): number[] {
  const fb = createFramebuffer(400, 400);
  renderScene(state, fb, [0, 0, 0]);
  const idx = (20 * fb.width + 25) * 4;
  return [fb.color[idx], fb.color[idx + 1], fb.color[idx + 2]];
}

describe("stage 6: ambient & diffuse lighting", () => {
  it("material.enabled=false shows the raw vertex color, ignoring the light entirely", () => {
    const state = createInitialState();
    state.material.enabled = false;
    state.aspectRatio = 1;
    state.meshes = [flatTriangle(vec3(0, 0, 1), vec3(1, 0, 0))];

    expect(samplePixel(state)).toEqual([255, 0, 0]);
  });

  it("ambient alone lights a surface uniformly, independent of the light's direction", () => {
    const base = createInitialState();
    base.material = { ambient: 0.4, diffuse: 0, specular: 0, shininess: 32, enabled: true };
    base.aspectRatio = 1;
    const mesh = flatTriangle(vec3(0, 0, 1), vec3(1, 1, 1));

    const stateA: SceneState = {
      ...base,
      light: { azimuthDeg: 0, elevationDeg: 0, distance: base.light.distance, color: vec3(1, 1, 1) },
      meshes: [mesh],
    };
    const stateB: SceneState = {
      ...base,
      light: { azimuthDeg: 170, elevationDeg: -60, distance: base.light.distance, color: vec3(1, 1, 1) },
      meshes: [mesh],
    };

    const pixelA = samplePixel(stateA);
    const pixelB = samplePixel(stateB);
    expect(pixelA).toEqual(pixelB);
    expect(pixelA[0]).toBeGreaterThan(0);
  });

  it("raising diffuse brightens a face turned toward the light", () => {
    const base = createInitialState();
    // Point the normal straight at the light so diffuseAmount is maxed regardless of diffuse's value.
    // The light sits far enough away (base.light.distance) that its direction barely varies across
    // the small triangle below, so one representative surface point stands in for all three vertices.
    const lightPos = orbitEye(deg2rad(base.light.azimuthDeg), deg2rad(base.light.elevationDeg), base.light.distance);
    const lightDir = normalize(sub(lightPos, vec3(25 / 400, 50 / 3 / 400, -5 / 400)));
    base.aspectRatio = 1;
    const mesh = flatTriangle(lightDir, vec3(1, 1, 1));

    const dim: SceneState = { ...base, material: { ambient: 0.1, diffuse: 0.2, specular: 0, shininess: 32, enabled: true }, meshes: [mesh] };
    const bright: SceneState = { ...base, material: { ambient: 0.1, diffuse: 0.9, specular: 0, shininess: 32, enabled: true }, meshes: [mesh] };

    expect(samplePixel(bright)[0]).toBeGreaterThan(samplePixel(dim)[0]);
  });
});

describe("stage 6: structural markup (built dist/index.html)", () => {
  const dist = resolve("dist/index.html");
  const doc = new JSDOM(readFileSync(dist, "utf8")).window.document;

  it("has a stage-6 panel with ambient/diffuse/light fields and a lighting-rate toggle, starting hidden", () => {
    const stage6 = doc.querySelector('section[data-stage="6"]');
    expect(stage6?.hasAttribute("hidden")).toBe(true);
    for (const field of ["ambient", "diffuse", "lightAzimuthDeg", "lightElevationDeg"]) {
      expect(stage6?.querySelector(`[data-field="${field}"]`), `expected field=${field}`).toBeTruthy();
    }
    for (const value of ["perVertex", "perPixel"]) {
      expect(
        stage6?.querySelector(`input[name="lighting-rate"][value="${value}"]`),
        `expected lighting-rate=${value}`,
      ).toBeTruthy();
    }
    expect(doc.querySelector('[data-testid="material-engage-indicator"]')).toBeTruthy();
  });
});
