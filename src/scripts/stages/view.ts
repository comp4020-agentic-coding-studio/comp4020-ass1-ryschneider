import { orbitEye, orbitView } from "../../lib/raster/camera";
import { blitToCanvas } from "../../lib/raster/framebuffer";
import { identity, multiply } from "../../lib/raster/mat4";
import { renderFrame } from "../../lib/raster/pipeline";
import { triangleMesh } from "../../lib/raster/triangle";
import { vec3 } from "../../lib/raster/vec3";
import { bindRange, getStageElements, readRange } from "../canvas-utils";
import { bindDragOrbit } from "../drag-orbit";
import { defaultLight, defaultMaterial, defaultProjection } from "../scene";
import { drawAxes, drawCameraGizmo, drawGrid, drawWireframeMesh } from "../scene-draw";
import type { RegisteredStage } from "../scroll-controller";

const mesh = triangleMesh();
const OBSERVER_DISTANCE = 6;

export function init(): RegisteredStage | null {
  const elements = getStageElements("view");
  if (!elements) return null;
  const { canvas, ctx, section } = elements;

  const insetCanvas = section.querySelector<HTMLCanvasElement>("[data-canvas-inset]");
  const insetCtx = insetCanvas?.getContext("2d") ?? null;

  let azimuthDegrees = readRange("view-azimuth", 40);
  let elevationDegrees = readRange("view-elevation", 20);
  let distance = readRange("view-distance", 3.2);

  // A fixed outside vantage point for the schematic, dragged independently of the taught
  // camera — you can't see your own camera's rig from inside it.
  const observer = { azimuth: 0.9, elevation: 0.45 };

  function render(): void {
    const azimuthRad = (azimuthDegrees * Math.PI) / 180;
    const elevationRad = (elevationDegrees * Math.PI) / 180;
    const cameraEye = orbitEye(azimuthRad, elevationRad, distance);

    const observerView = orbitView(observer.azimuth, observer.elevation, OBSERVER_DISTANCE);
    const viewProjection = multiply(defaultProjection(), observerView);

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawGrid(ctx, viewProjection, canvas.width, canvas.height);
    drawAxes(ctx, viewProjection, canvas.width, canvas.height);
    drawWireframeMesh(ctx, viewProjection, canvas.width, canvas.height, mesh, identity());
    drawCameraGizmo(ctx, viewProjection, canvas.width, canvas.height, cameraEye, vec3(0, 0, 0));

    if (insetCanvas && insetCtx) {
      const fb = renderFrame({
        mesh,
        model: identity(),
        view: orbitView(azimuthRad, elevationRad, distance),
        projection: defaultProjection(),
        light: defaultLight,
        material: defaultMaterial,
        shadingMode: "gouraud",
        width: insetCanvas.width,
        height: insetCanvas.height,
      });
      blitToCanvas(fb, insetCtx);
    }
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

  bindDragOrbit(
    canvas,
    () => observer,
    (angles) => {
      observer.azimuth = angles.azimuth;
      observer.elevation = angles.elevation;
    },
    render,
  );

  render();

  return { id: "view", start: () => {}, stop: () => {} };
}
