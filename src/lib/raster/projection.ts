import type { Mat4, Vec4 } from "./mat4";
import { transformPoint } from "./mat4";
import type { Vec3 } from "./vec3";

/** A point in normalized device coordinates: each axis in [-1, 1] when on-screen. */
export interface Ndc {
  x: number;
  y: number;
  z: number;
}

/** Applies the perspective divide that turns a clip-space point into NDC. */
export function toNdc(clip: Vec4): Ndc {
  return { x: clip.x / clip.w, y: clip.y / clip.w, z: clip.z / clip.w };
}

/** Projects a view-space point straight to NDC, for callers that don't need the clip-space value. */
export function projectPoint(projection: Mat4, viewSpacePoint: Vec3): Ndc {
  return toNdc(transformPoint(projection, viewSpacePoint));
}
