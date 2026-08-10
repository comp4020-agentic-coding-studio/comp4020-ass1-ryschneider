import { blitToCanvas } from "../../lib/raster/framebuffer";
import { multiply, rotateY, scaleUniform } from "../../lib/raster/mat4";
import { renderFrame } from "../../lib/raster/pipeline";
import { bindRange, getStageElements, readRange } from "../canvas-utils";
import { defaultLight, defaultMaterial, defaultProjection, defaultView, mesh } from "../scene";
import type { RegisteredStage } from "../scroll-controller";

export function init(): RegisteredStage | null {
  const elements = getStageElements("world");
  if (!elements) return null;
  const { canvas, ctx } = elements;

  let rotationDegrees = readRange("world-rotation", 45);
  let scale = readRange("world-scale", 1);

  function render(): void {
    const model = multiply(rotateY((rotationDegrees * Math.PI) / 180), scaleUniform(scale));
    const fb = renderFrame({
      mesh,
      model,
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

  bindRange("world-rotation", (value) => {
    rotationDegrees = value;
    render();
  });
  bindRange("world-scale", (value) => {
    scale = value;
    render();
  });

  render();

  // The transform is fully determined by the sliders, so there's nothing to animate
  // between interactions — no render loop needed while this stage is in view.
  return { id: "world", start: () => {}, stop: () => {} };
}
