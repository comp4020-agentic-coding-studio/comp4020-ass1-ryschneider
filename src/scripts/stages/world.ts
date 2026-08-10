import { multiply, rotateY, scaleUniform, translate } from "../../lib/raster/mat4";
import { triangleMesh } from "../../lib/raster/triangle";
import { vec3 } from "../../lib/raster/vec3";
import { bindRange, getStageElements, readRange } from "../canvas-utils";
import { defaultProjection, defaultView } from "../scene";
import { drawAxes, drawGrid, drawWireframeMesh } from "../scene-draw";
import type { RegisteredStage } from "../scroll-controller";

const mesh = triangleMesh();

export function init(): RegisteredStage | null {
  const elements = getStageElements("world");
  if (!elements) return null;
  const { canvas, ctx } = elements;

  const viewProjection = multiply(defaultProjection(), defaultView(5));
  let rotationDegrees = readRange("world-rotation", 45);
  let scale = readRange("world-scale", 1);
  let translateX = readRange("world-translate-x", 0);
  let translateZ = readRange("world-translate-z", 0);

  function render(): void {
    const model = multiply(
      translate(vec3(translateX, 0, translateZ)),
      multiply(rotateY((rotationDegrees * Math.PI) / 180), scaleUniform(scale)),
    );
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawGrid(ctx, viewProjection, canvas.width, canvas.height);
    drawAxes(ctx, viewProjection, canvas.width, canvas.height);
    drawWireframeMesh(ctx, viewProjection, canvas.width, canvas.height, mesh, model);
  }

  bindRange("world-rotation", (value) => {
    rotationDegrees = value;
    render();
  });
  bindRange("world-scale", (value) => {
    scale = value;
    render();
  });
  bindRange("world-translate-x", (value) => {
    translateX = value;
    render();
  });
  bindRange("world-translate-z", (value) => {
    translateZ = value;
    render();
  });

  render();

  // The transform is fully determined by the sliders, so there's nothing to animate
  // between interactions — no render loop needed while this stage is in view.
  return { id: "world", start: () => {}, stop: () => {} };
}
