import { blitToCanvas } from "../../lib/raster/framebuffer";
import { identity } from "../../lib/raster/mat4";
import { renderFrame } from "../../lib/raster/pipeline";
import { bindRange, getStageElements, readRange } from "../canvas-utils";
import { defaultLight, defaultMaterial, defaultProjection, defaultView, mesh } from "../scene";
import type { RegisteredStage } from "../scroll-controller";

export function init(): RegisteredStage | null {
  const elements = getStageElements("projection");
  if (!elements) return null;
  const { canvas, ctx } = elements;

  let fovDegrees = readRange("projection-fov", 55);
  let distance = readRange("projection-distance", 3.2);

  function render(): void {
    const fb = renderFrame({
      mesh,
      model: identity(),
      view: defaultView(distance),
      projection: defaultProjection((fovDegrees * Math.PI) / 180),
      light: defaultLight,
      material: defaultMaterial,
      shadingMode: "gouraud",
      width: canvas.width,
      height: canvas.height,
    });
    blitToCanvas(fb, ctx);
  }

  bindRange("projection-fov", (value) => {
    fovDegrees = value;
    render();
  });
  bindRange("projection-distance", (value) => {
    distance = value;
    render();
  });

  render();

  return { id: "projection", start: () => {}, stop: () => {} };
}
