import { orbitView } from "../lib/raster/camera";
import { generateIcosphere } from "../lib/raster/icosphere";
import type { Mat4 } from "../lib/raster/mat4";
import { perspective } from "../lib/raster/mat4";
import type { Light, Material } from "../lib/raster/shading";
import { vec3 } from "../lib/raster/vec3";

/** Shared defaults every stage starts from; each stage's controls override only what it teaches. */
export const mesh = generateIcosphere(2);

export const defaultMaterial: Material = {
  color: vec3(0.85, 0.35, 0.25),
  ambient: 0.12,
  diffuse: 0.65,
  specular: 0.55,
  shininess: 28,
};

export const defaultLight: Light = { direction: vec3(0.6, 0.8, 1), color: vec3(1, 1, 1) };

export function defaultProjection(fovRadians = Math.PI / 3.2, aspect = 1): Mat4 {
  return perspective(fovRadians, aspect, 0.1, 100);
}

export function defaultView(distance = 3.2): Mat4 {
  return orbitView(0.5, 0.35, distance);
}
