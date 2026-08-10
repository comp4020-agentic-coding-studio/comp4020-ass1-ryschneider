import { describe, expect, it } from "vitest";
import { orbitView } from "./camera";
import { generateIcosphere } from "./icosphere";
import { identity, perspective } from "./mat4";
import { renderFrame } from "./pipeline";
import type { Light, Material } from "./shading";
import { vec3 } from "./vec3";

const mesh = generateIcosphere(1);
const model = identity();
const view = orbitView(0.4, 0.3, 4);
const projection = perspective(Math.PI / 3, 1, 0.1, 100);
const light: Light = { direction: vec3(0.6, 0.7, 1), color: vec3(1, 1, 1) };
const material: Material = { color: vec3(0.8, 0.2, 0.2), ambient: 0.1, diffuse: 0.6, specular: 0.6, shininess: 24 };

function nonBackgroundPixelCount(fb: ReturnType<typeof renderFrame>, background: [number, number, number]) {
  let count = 0;
  for (let i = 0; i < fb.width * fb.height; i++) {
    const r = fb.color[i * 4];
    const g = fb.color[i * 4 + 1];
    const b = fb.color[i * 4 + 2];
    if (r !== background[0] || g !== background[1] || b !== background[2]) count++;
  }
  return count;
}

describe("renderFrame", () => {
  const width = 64;
  const height = 64;
  const background: [number, number, number] = [18, 18, 24];

  it("rasterizes the mesh so a meaningful fraction of the frame is covered", () => {
    const fb = renderFrame({ mesh, model, view, projection, light, material, shadingMode: "gouraud", width, height, background });
    const covered = nonBackgroundPixelCount(fb, background);
    expect(covered).toBeGreaterThan((width * height) / 10);
  });

  it("produces a visibly different image for gouraud vs phong shading on the same scene", () => {
    const gouraud = renderFrame({ mesh, model, view, projection, light, material, shadingMode: "gouraud", width, height, background });
    const phong = renderFrame({ mesh, model, view, projection, light, material, shadingMode: "phong", width, height, background });

    let differingPixels = 0;
    for (let i = 0; i < width * height; i++) {
      const dr = Math.abs((gouraud.color[i * 4] ?? 0) - (phong.color[i * 4] ?? 0));
      const dg = Math.abs((gouraud.color[i * 4 + 1] ?? 0) - (phong.color[i * 4 + 1] ?? 0));
      const db = Math.abs((gouraud.color[i * 4 + 2] ?? 0) - (phong.color[i * 4 + 2] ?? 0));
      if (dr + dg + db > 6) differingPixels++;
    }

    // The two shading modes share the exact same rasterizer and triangle set; any
    // difference comes only from per-vertex vs per-fragment lighting. On a curved,
    // low-poly mesh under a directional light, that should show up on a solid chunk
    // of the rendered pixels, not just a stray one or two from floating-point noise.
    expect(differingPixels).toBeGreaterThan(50);
  });
});
