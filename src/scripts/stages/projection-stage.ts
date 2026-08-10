import { orbitEye, orbitView } from "../../lib/raster/camera";
import { cameraBasis } from "../../lib/raster/frustum";
import { blitToCanvas } from "../../lib/raster/framebuffer";
import { identity, multiply, perspective } from "../../lib/raster/mat4";
import { renderFrame } from "../../lib/raster/pipeline";
import { triangleMesh } from "../../lib/raster/triangle";
import { vec3 } from "../../lib/raster/vec3";
import { bindRange, getStageElements, readRange } from "../canvas-utils";
import { bindDragOrbit } from "../drag-orbit";
import { defaultLight, defaultMaterial, defaultProjection } from "../scene";
import { drawAxes, drawCameraGizmo, drawFrustumWireframe, drawGrid, drawWireframeMesh } from "../scene-draw";
import type { RegisteredStage } from "../scroll-controller";

const mesh = triangleMesh();
const OBSERVER_DISTANCE = 6;
// Fixed camera placement — this stage isolates field of view as the one variable, so the
// camera itself doesn't move (that's what stage 3 teaches).
const CAMERA_AZIMUTH = (40 * Math.PI) / 180;
const CAMERA_ELEVATION = (20 * Math.PI) / 180;
const CAMERA_DISTANCE = 3.2;

export function init(): RegisteredStage | null {
  const elements = getStageElements("projection");
  if (!elements) return null;
  const { canvas, ctx, section } = elements;

  const insetCanvas = section.querySelector<HTMLCanvasElement>("[data-canvas-inset]");
  const insetCtx = insetCanvas?.getContext("2d") ?? null;

  let fovDegrees = readRange("projection-fov", 55);
  const observer = { azimuth: -0.7, elevation: 0.4 };

  function render(): void {
    const fovRadians = (fovDegrees * Math.PI) / 180;
    const cameraEye = orbitEye(CAMERA_AZIMUTH, CAMERA_ELEVATION, CAMERA_DISTANCE);
    const basis = cameraBasis(cameraEye, vec3(0, 0, 0));

    const observerView = orbitView(observer.azimuth, observer.elevation, OBSERVER_DISTANCE);
    const viewProjection = multiply(defaultProjection(), observerView);

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawGrid(ctx, viewProjection, canvas.width, canvas.height);
    drawAxes(ctx, viewProjection, canvas.width, canvas.height);
    drawWireframeMesh(ctx, viewProjection, canvas.width, canvas.height, mesh, identity());
    drawCameraGizmo(ctx, viewProjection, canvas.width, canvas.height, cameraEye, vec3(0, 0, 0));
    drawFrustumWireframe(ctx, viewProjection, canvas.width, canvas.height, basis, fovRadians, 1, 0.5, 4);

    if (insetCanvas && insetCtx) {
      const fb = renderFrame({
        mesh,
        model: identity(),
        view: orbitView(CAMERA_AZIMUTH, CAMERA_ELEVATION, CAMERA_DISTANCE),
        projection: perspective(fovRadians, 1, 0.1, 100),
        light: defaultLight,
        material: defaultMaterial,
        shadingMode: "gouraud",
        width: insetCanvas.width,
        height: insetCanvas.height,
      });
      blitToCanvas(fb, insetCtx);
    }
  }

  bindRange("projection-fov", (value) => {
    fovDegrees = value;
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

  return { id: "projection", start: () => {}, stop: () => {} };
}
