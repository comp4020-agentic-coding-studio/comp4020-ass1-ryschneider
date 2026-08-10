import { multiply, rotateY } from "../../lib/raster/mat4";
import { triangleMesh } from "../../lib/raster/triangle";
import { createLoop, getStageElements, prefersReducedMotion } from "../canvas-utils";
import { defaultProjection, defaultView } from "../scene";
import { drawAxes, drawWireframeMesh } from "../scene-draw";
import type { RegisteredStage } from "../scroll-controller";

export function init(): RegisteredStage | null {
  const elements = getStageElements("model");
  if (!elements) return null;
  const { canvas, ctx } = elements;

  const mesh = triangleMesh();
  const viewProjection = multiply(defaultProjection(), defaultView());
  let angle = 0;
  const spinRate = prefersReducedMotion() ? 0 : 0.35;

  function render(): void {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawAxes(ctx, viewProjection, canvas.width, canvas.height);
    drawWireframeMesh(ctx, viewProjection, canvas.width, canvas.height, mesh, rotateY(angle));
  }

  const loop = createLoop((dt) => {
    angle += spinRate * dt;
    render();
  });

  render();

  return { id: "model", start: loop.start, stop: loop.stop };
}
