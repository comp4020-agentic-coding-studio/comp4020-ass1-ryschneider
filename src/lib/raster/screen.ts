import type { Mat4 } from "./mat4";
import { transformPoint } from "./mat4";
import type { Ndc } from "./projection";
import { toNdc } from "./projection";
import type { Vec3 } from "./vec3";

/** Maps an NDC point (each axis in [-1, 1]) to pixel coordinates, flipping y so +y is down. */
export function ndcToScreen(ndc: Ndc, width: number, height: number): { x: number; y: number } {
  return {
    x: (ndc.x * 0.5 + 0.5) * width,
    y: (1 - (ndc.y * 0.5 + 0.5)) * height,
  };
}

/**
 * Projects a point through a combined view*projection matrix straight to pixel coordinates, for
 * diagram/wireframe drawing that doesn't go through the full rasterizer. Returns null when the
 * point is behind the eye (same convention `pipeline.ts` uses).
 */
export function projectToScreen(
  viewProjection: Mat4,
  point: Vec3,
  width: number,
  height: number,
): { x: number; y: number; depth: number } | null {
  const clip = transformPoint(viewProjection, point);
  if (clip.w <= 0) return null;
  const ndc = toNdc(clip);
  return { ...ndcToScreen(ndc, width, height), depth: ndc.z };
}
