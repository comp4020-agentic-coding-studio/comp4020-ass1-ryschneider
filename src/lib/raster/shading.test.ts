import { describe, expect, it } from "vitest";
import {
  computeLighting,
  gouraudShadeFn,
  gouraudVertexAttrs,
  makePhongShadeFn,
  phongVertexAttrs,
} from "./shading";
import type { Light, Material, ShadingVertex } from "./shading";
import { vec3 } from "./vec3";

const material: Material = { color: vec3(1, 1, 1), ambient: 0.1, diffuse: 0.7, specular: 0.5, shininess: 32 };
const light: Light = { direction: vec3(0, 0, 1), color: vec3(1, 1, 1) };

describe("computeLighting", () => {
  it("lights a surface facing the light more than one facing away", () => {
    const towardLight = computeLighting(vec3(0, 0, 1), vec3(0, 0, 1), light, material);
    const awayFromLight = computeLighting(vec3(0, 0, -1), vec3(0, 0, 1), light, material);
    expect(towardLight.x).toBeGreaterThan(awayFromLight.x);
  });

  it("never lights a surface below the material's ambient floor", () => {
    const litAway = computeLighting(vec3(0, 1, 0), vec3(0, 0, 1), light, material);
    expect(litAway.x).toBeCloseTo(material.ambient * material.color.x);
  });

  it("adds a specular highlight when the view direction matches the reflection", () => {
    const dim: Material = { ...material, specular: 0 };
    const shiny: Material = { ...material, specular: 1 };
    const withoutSpecular = computeLighting(vec3(0, 0, 1), vec3(0, 0, 1), light, dim);
    const withSpecular = computeLighting(vec3(0, 0, 1), vec3(0, 0, 1), light, shiny);
    expect(withSpecular.x).toBeGreaterThan(withoutSpecular.x);
  });
});

describe("gouraud vs phong on a curved surface", () => {
  // Two triangles sharing an edge, angled to approximate a curved (icosphere-like) surface:
  // normals differ per vertex even though each triangle is flat.
  const v0: ShadingVertex = { viewPos: vec3(-1, 0, -5), viewNormal: vec3(-0.5, 0, 1) };
  const v1: ShadingVertex = { viewPos: vec3(0, 1, -5), viewNormal: vec3(0, 0.5, 1) };
  const v2: ShadingVertex = { viewPos: vec3(1, 0, -5), viewNormal: vec3(0.5, 0, 1) };

  it("gouraud interpolates already-lit vertex colors", () => {
    const attrs = gouraudVertexAttrs(v1, light, material);
    const [r, g, b] = gouraudShadeFn(attrs, 0, 0);
    expect(r).toBeGreaterThan(0);
    expect(r).toBe(g);
    expect(g).toBe(b);
  });

  it("phong lights from the interpolated (midpoint) normal, not a blend of endpoint colors", () => {
    // Simulate the rasterizer's midpoint interpolation of v0 and v2's raw attrs.
    const midAttrs = phongVertexAttrs({
      viewPos: vec3(0, 0, -5),
      viewNormal: vec3(0, 0, 1),
    });
    const shade = makePhongShadeFn(light, material);
    const [r] = shade(midAttrs, 0, 0);

    const gouraudMidColor =
      (gouraudShadeFn(gouraudVertexAttrs(v0, light, material), 0, 0)[0] +
        gouraudShadeFn(gouraudVertexAttrs(v2, light, material), 0, 0)[0]) /
      2;

    // The straight-ahead normal at the midpoint lights more brightly (facing the light
    // dead-on) than the average of the two tilted endpoint colors — this gap is exactly
    // the banding Gouraud shading introduces and Phong avoids.
    expect(r).toBeGreaterThan(gouraudMidColor);
  });
});
