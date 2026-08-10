import { generateIcosphere } from "../../lib/raster/icosphere";
import { blitToCanvas } from "../../lib/raster/framebuffer";
import { rotateY } from "../../lib/raster/mat4";
import { renderFrame } from "../../lib/raster/pipeline";
import type { ShadingMode } from "../../lib/raster/shading";
import { vec3 } from "../../lib/raster/vec3";
import { bindRange, bindToggle, createLoop, getStageElements, prefersReducedMotion, readRange } from "../canvas-utils";
import { defaultMaterial, defaultProjection, defaultView } from "../scene";
import type { RegisteredStage } from "../scroll-controller";

// Deliberately coarser than the shared demo mesh: banding from per-vertex lighting is most
// visible when each triangle spans a larger patch of the curved surface.
const shadingMesh = generateIcosphere(1);

export function init(): RegisteredStage | null {
  const elements = getStageElements("shading");
  if (!elements) return null;
  const { canvas, ctx } = elements;

  let shadingMode: ShadingMode = "gouraud";
  let lightAzimuthDegrees = readRange("shading-light-azimuth", 40);
  let shininess = readRange("shading-shininess", 28);
  let angle = 0;
  const spinRate = prefersReducedMotion() ? 0 : 0.3;

  function render(): void {
    const lightRad = (lightAzimuthDegrees * Math.PI) / 180;
    const fb = renderFrame({
      mesh: shadingMesh,
      model: rotateY(angle),
      view: defaultView(),
      projection: defaultProjection(),
      light: { direction: vec3(Math.sin(lightRad), 0.7, Math.cos(lightRad)), color: vec3(1, 1, 1) },
      material: { ...defaultMaterial, shininess },
      shadingMode,
      width: canvas.width,
      height: canvas.height,
    });
    blitToCanvas(fb, ctx);
  }

  bindToggle("shading-mode-toggle", (pressed) => {
    shadingMode = pressed ? "phong" : "gouraud";
    render();
  });
  bindRange("shading-light-azimuth", (value) => {
    lightAzimuthDegrees = value;
    render();
  });
  bindRange("shading-shininess", (value) => {
    shininess = value;
    render();
  });

  const loop = createLoop((dt) => {
    angle += spinRate * dt;
    render();
  });

  render();

  return { id: "shading", start: loop.start, stop: loop.stop };
}
