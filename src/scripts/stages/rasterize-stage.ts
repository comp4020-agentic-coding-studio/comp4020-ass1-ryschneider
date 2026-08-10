import { blitToCanvas } from "../../lib/raster/framebuffer";
import { generateIcosphere } from "../../lib/raster/icosphere";
import type { Mesh } from "../../lib/raster/icosphere";
import { rotateY } from "../../lib/raster/mat4";
import { renderFrame } from "../../lib/raster/pipeline";
import { bindRange, bindToggle, createLoop, getStageElements, prefersReducedMotion, readRange } from "../canvas-utils";
import { defaultLight, defaultMaterial, defaultProjection, defaultView } from "../scene";
import { drawPixelGrid } from "../scene-draw";
import type { RegisteredStage } from "../scroll-controller";

export function init(): RegisteredStage | null {
  const elements = getStageElements("rasterize");
  if (!elements) return null;
  const { canvas, ctx } = elements;

  let mesh: Mesh = generateIcosphere(readRange("rasterize-subdivisions", 0));
  let showPixelGrid = false;
  let angle = 0;
  const spinRate = prefersReducedMotion() ? 0 : 0.3;

  function render(): void {
    const fb = renderFrame({
      mesh,
      model: rotateY(angle),
      view: defaultView(),
      projection: defaultProjection(),
      light: defaultLight,
      material: defaultMaterial,
      shadingMode: "gouraud",
      width: canvas.width,
      height: canvas.height,
    });
    blitToCanvas(fb, ctx);
    if (showPixelGrid) {
      drawPixelGrid(ctx, canvas.width, canvas.height, 1);
    }
  }

  bindRange("rasterize-subdivisions", (value) => {
    mesh = generateIcosphere(Math.round(value));
    render();
  });
  bindToggle("rasterize-pixel-grid-toggle", (pressed) => {
    showPixelGrid = pressed;
    render();
  });

  const loop = createLoop((dt) => {
    angle += spinRate * dt;
    render();
  });

  render();

  return { id: "rasterize", start: loop.start, stop: loop.stop };
}
