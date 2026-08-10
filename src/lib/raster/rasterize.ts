import type { Framebuffer } from "./framebuffer";

/** Flat numeric attributes carried per vertex and interpolated across a triangle. */
export type Attrs = Record<string, number>;

export interface ScreenVertex {
  /** Pixel-space x, y (not necessarily integers, and not yet clipped to the framebuffer). */
  x: number;
  y: number;
  /** NDC-space depth (smaller is nearer), interpolated linearly in screen space for the z-buffer test. */
  depth: number;
  /** 1/w from the clip-space vertex, used to perspective-correct attribute interpolation. */
  invW: number;
  attrs: Attrs;
}

export type ShadeFn = (attrs: Attrs, screenX: number, screenY: number) => readonly [number, number, number];

function edgeFunction(
  a: { x: number; y: number },
  b: { x: number; y: number },
  c: { x: number; y: number },
): number {
  return (c.x - a.x) * (b.y - a.y) - (c.y - a.y) * (b.x - a.x);
}

/**
 * Fills one triangle into `fb` using an edge-function/barycentric scan over its bounding box,
 * with a per-pixel z-buffer test. Both Gouraud and Phong shading share this exact fill: they
 * differ only in what `shade` does with the interpolated attrs, not in how pixels are chosen.
 */
export function rasterizeTriangle(
  v0: ScreenVertex,
  v1: ScreenVertex,
  v2: ScreenVertex,
  fb: Framebuffer,
  shade: ShadeFn,
): void {
  const area = edgeFunction(v0, v1, v2);
  if (area === 0) return;

  const minX = Math.max(0, Math.floor(Math.min(v0.x, v1.x, v2.x)));
  const maxX = Math.min(fb.width - 1, Math.ceil(Math.max(v0.x, v1.x, v2.x)));
  const minY = Math.max(0, Math.floor(Math.min(v0.y, v1.y, v2.y)));
  const maxY = Math.min(fb.height - 1, Math.ceil(Math.max(v0.y, v1.y, v2.y)));

  const keys = Object.keys(v0.attrs);

  for (let py = minY; py <= maxY; py++) {
    for (let px = minX; px <= maxX; px++) {
      const p = { x: px + 0.5, y: py + 0.5 };
      const w0 = edgeFunction(v1, v2, p) / area;
      const w1 = edgeFunction(v2, v0, p) / area;
      const w2 = edgeFunction(v0, v1, p) / area;

      // Same-sign test against the (signed) area handles both winding orders.
      if (w0 < 0 || w1 < 0 || w2 < 0) continue;

      const depth = w0 * v0.depth + w1 * v1.depth + w2 * v2.depth;
      const pixelIndex = py * fb.width + px;
      if (depth >= (fb.depth[pixelIndex] ?? Infinity)) continue;

      const invWInterp = w0 * v0.invW + w1 * v1.invW + w2 * v2.invW;
      const pc0 = (w0 * v0.invW) / invWInterp;
      const pc1 = (w1 * v1.invW) / invWInterp;
      const pc2 = (w2 * v2.invW) / invWInterp;

      const attrs: Attrs = {};
      for (const key of keys) {
        attrs[key] = pc0 * (v0.attrs[key] ?? 0) + pc1 * (v1.attrs[key] ?? 0) + pc2 * (v2.attrs[key] ?? 0);
      }

      const [r, g, b] = shade(attrs, px, py);
      fb.depth[pixelIndex] = depth;
      fb.color[pixelIndex * 4] = r;
      fb.color[pixelIndex * 4 + 1] = g;
      fb.color[pixelIndex * 4 + 2] = b;
      fb.color[pixelIndex * 4 + 3] = 255;
    }
  }
}
