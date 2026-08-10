import type { Framebuffer } from "./framebuffer";
import { clear, createFramebuffer } from "./framebuffer";
import type { Mat4 } from "./mat4";
import { multiply, transformDirection, transformPoint } from "./mat4";
import type { Mesh } from "./icosphere";
import { toNdc } from "./projection";
import type { ScreenVertex } from "./rasterize";
import { rasterizeTriangle } from "./rasterize";
import type { Light, Material, ShadingMode } from "./shading";
import { gouraudShadeFn, gouraudVertexAttrs, makePhongShadeFn, phongVertexAttrs } from "./shading";
import { normalize } from "./vec3";

export interface RenderOptions {
  mesh: Mesh;
  /** Model → world transform. */
  model: Mat4;
  /** World → view (camera) transform. */
  view: Mat4;
  projection: Mat4;
  light: Light;
  material: Material;
  shadingMode: ShadingMode;
  width: number;
  height: number;
  background?: readonly [number, number, number];
}

/**
 * Runs the full model → world → view → projection → rasterize → shade pipeline for one frame.
 * Every stage's demo calls this same function; they differ only in which parameters their
 * sliders feed in, not in how the frame is actually produced.
 */
export function renderFrame(options: RenderOptions): Framebuffer {
  const { mesh, model, view, projection, light, material, shadingMode, width, height } = options;
  const fb = createFramebuffer(width, height);
  clear(fb, options.background ?? [18, 18, 24]);

  const modelView = multiply(view, model);
  const viewPositions = mesh.positions.map((p) => transformPoint(modelView, p));
  const viewNormals = mesh.normals.map((n) => normalize(transformDirection(modelView, n)));

  const shade = shadingMode === "gouraud" ? gouraudShadeFn : makePhongShadeFn(light, material);

  for (const [ia, ib, ic] of mesh.indices) {
    const screenVerts = [ia, ib, ic].map((i): ScreenVertex | null => {
      const viewPos = viewPositions[i];
      const viewNormal = viewNormals[i];
      if (!viewPos || !viewNormal) return null;

      const clip = transformPoint(projection, { x: viewPos.x, y: viewPos.y, z: viewPos.z });
      if (clip.w <= 0) return null; // behind the eye; skip rather than clip properly (out of scope)

      const ndc = toNdc(clip);
      const attrs =
        shadingMode === "gouraud"
          ? gouraudVertexAttrs({ viewPos, viewNormal }, light, material)
          : phongVertexAttrs({ viewPos, viewNormal });

      return {
        x: (ndc.x * 0.5 + 0.5) * width,
        y: (1 - (ndc.y * 0.5 + 0.5)) * height,
        depth: ndc.z,
        invW: 1 / clip.w,
        attrs,
      };
    });

    const [v0, v1, v2] = screenVerts;
    if (!v0 || !v1 || !v2) continue;

    rasterizeTriangle(v0, v1, v2, fb, shade);
  }

  return fb;
}
