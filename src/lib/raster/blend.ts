import type { Attrs } from "./rasterize";

export type BlendMode = "flat" | "linear";

/**
 * "flat": clone v0's attrs onto v1/v2 before rasterizing, so the existing
 * barycentric interpolation produces a constant value across the face for
 * free (whichever vertex-selected color/lighting attrs were computed).
 * "linear": untouched — the rasterizer's ordinary per-vertex interpolation.
 */
export function applyBlendMode(v0: Attrs, v1: Attrs, v2: Attrs, mode: BlendMode): [Attrs, Attrs, Attrs] {
  if (mode === "flat") return [v0, { ...v0 }, { ...v0 }];
  return [v0, v1, v2];
}
