import type { Mesh } from "./icosphere";
import { cross, normalize, sub, vec3 } from "./vec3";

/**
 * The simplest possible mesh: one triangle, facing +z. The early pipeline stages start here
 * before any mesh complexity is introduced.
 */
export function triangleMesh(): Mesh {
  const top = vec3(0, 0.8, 0);
  const left = vec3(-0.7, -0.5, 0);
  const right = vec3(0.7, -0.5, 0);
  const normal = normalize(cross(sub(left, top), sub(right, top)));

  return {
    positions: [top, left, right],
    normals: [normal, normal, normal],
    indices: [[0, 1, 2]],
  };
}
