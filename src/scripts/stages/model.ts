import { blitToCanvas } from "../../lib/raster/framebuffer";
import { generateIcosphere } from "../../lib/raster/icosphere";
import { rotateY } from "../../lib/raster/mat4";
import type { Mesh } from "../../lib/raster/icosphere";
import { renderFrame } from "../../lib/raster/pipeline";
import { bindRange, createLoop, getStageElements, prefersReducedMotion, readRange } from "../canvas-utils";
import { defaultLight, defaultMaterial, defaultProjection, defaultView } from "../scene";
import type { RegisteredStage } from "../scroll-controller";

export function init(): RegisteredStage | null {
  const elements = getStageElements("model");
  if (!elements) return null;
  const { canvas, ctx } = elements;

  let mesh: Mesh = generateIcosphere(readRange("model-subdivisions", 1));
  let angle = 0;
  const spinRate = prefersReducedMotion() ? 0 : 0.35;

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
  }

  bindRange("model-subdivisions", (value) => {
    mesh = generateIcosphere(Math.round(value));
    render();
  });

  const loop = createLoop((dt) => {
    angle += spinRate * dt;
    render();
  });

  render();

  return { id: "model", start: loop.start, stop: loop.stop };
}
