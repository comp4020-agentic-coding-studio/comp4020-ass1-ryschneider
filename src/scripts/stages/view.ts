import { orbitView } from "../../lib/raster/camera";
import { blitToCanvas } from "../../lib/raster/framebuffer";
import { identity } from "../../lib/raster/mat4";
import { renderFrame } from "../../lib/raster/pipeline";
import { bindRange, getStageElements, readRange } from "../canvas-utils";
import { defaultLight, defaultMaterial, defaultProjection, mesh } from "../scene";
import type { RegisteredStage } from "../scroll-controller";

export function init(): RegisteredStage | null {
  const elements = getStageElements("view");
  if (!elements) return null;
  const { canvas, ctx } = elements;

  let azimuthDegrees = readRange("view-azimuth", 40);
  let elevationDegrees = readRange("view-elevation", 20);
  let distance = readRange("view-distance", 3.2);

  function render(): void {
    const view = orbitView(
      (azimuthDegrees * Math.PI) / 180,
      (elevationDegrees * Math.PI) / 180,
      distance,
    );
    const fb = renderFrame({
      mesh,
      model: identity(),
      view,
      projection: defaultProjection(),
      light: defaultLight,
      material: defaultMaterial,
      shadingMode: "gouraud",
      width: canvas.width,
      height: canvas.height,
    });
    blitToCanvas(fb, ctx);
  }

  bindRange("view-azimuth", (value) => {
    azimuthDegrees = value;
    render();
  });
  bindRange("view-elevation", (value) => {
    elevationDegrees = value;
    render();
  });
  bindRange("view-distance", (value) => {
    distance = value;
    render();
  });

  render();

  return { id: "view", start: () => {}, stop: () => {} };
}
