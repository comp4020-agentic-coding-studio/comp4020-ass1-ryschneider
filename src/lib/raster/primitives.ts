import type { Framebuffer } from "./framebuffer";
import type { Attrs, ScreenVertex, ShadeFn } from "./rasterize";

function setPixel(fb: Framebuffer, x: number, y: number, depth: number, color: readonly [number, number, number]): void {
  if (x < 0 || x >= fb.width || y < 0 || y >= fb.height) return;
  const index = y * fb.width + x;
  if (depth >= (fb.depth[index] ?? Infinity)) return;
  fb.depth[index] = depth;
  fb.color[index * 4] = color[0];
  fb.color[index * 4 + 1] = color[1];
  fb.color[index * 4 + 2] = color[2];
  fb.color[index * 4 + 3] = 255;
}

/** Draws a vertex as a small filled disc, for "points" primitive mode. */
export function drawPoint(v: ScreenVertex, fb: Framebuffer, shade: ShadeFn, radius = 2): void {
  const cx = Math.round(v.x);
  const cy = Math.round(v.y);
  const color = shade(v.attrs, cx, cy);
  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      if (dx * dx + dy * dy > radius * radius) continue;
      setPixel(fb, cx + dx, cy + dy, v.depth, color);
    }
  }
}

/** Draws a line segment by parametric stepping, lerping depth and attrs, for "lines" primitive mode and wireframe fill. */
export function drawLine(v0: ScreenVertex, v1: ScreenVertex, fb: Framebuffer, shade: ShadeFn): void {
  const dx = v1.x - v0.x;
  const dy = v1.y - v0.y;
  const steps = Math.max(1, Math.round(Math.max(Math.abs(dx), Math.abs(dy))));
  const keys = new Set([...Object.keys(v0.attrs), ...Object.keys(v1.attrs)]);

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = Math.round(v0.x + dx * t);
    const y = Math.round(v0.y + dy * t);
    const depth = v0.depth + (v1.depth - v0.depth) * t;

    const attrs: Attrs = {};
    for (const key of keys) {
      attrs[key] = (v0.attrs[key] ?? 0) + ((v1.attrs[key] ?? 0) - (v0.attrs[key] ?? 0)) * t;
    }

    setPixel(fb, x, y, depth, shade(attrs, x, y));
  }
}

/** Draws a triangle's three edges only, for "wireframe" fill mode. */
export function wireframeTriangle(v0: ScreenVertex, v1: ScreenVertex, v2: ScreenVertex, fb: Framebuffer, shade: ShadeFn): void {
  drawLine(v0, v1, fb, shade);
  drawLine(v1, v2, fb, shade);
  drawLine(v2, v0, fb, shade);
}
