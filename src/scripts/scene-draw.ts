import type { CameraBasis } from "../lib/raster/frustum";
import { frustumCorners } from "../lib/raster/frustum";
import type { Mesh } from "../lib/raster/icosphere";
import type { Mat4 } from "../lib/raster/mat4";
import { transformPoint } from "../lib/raster/mat4";
import { projectToScreen } from "../lib/raster/screen";
import type { Vec3 } from "../lib/raster/vec3";
import { vec3 } from "../lib/raster/vec3";

/**
 * Lightweight wireframe/diagram drawing on top of a 2D canvas context — a parallel path to the
 * software rasterizer in `src/lib/raster`, used for the schematic overlays (grid, axes, camera,
 * frustum) rather than filled, shaded triangles.
 */
function line(
  ctx: CanvasRenderingContext2D,
  viewProjection: Mat4,
  width: number,
  height: number,
  a: Vec3,
  b: Vec3,
): void {
  const pa = projectToScreen(viewProjection, a, width, height);
  const pb = projectToScreen(viewProjection, b, width, height);
  if (!pa || !pb) return;
  ctx.moveTo(pa.x, pa.y);
  ctx.lineTo(pb.x, pb.y);
}

export function drawGrid(
  ctx: CanvasRenderingContext2D,
  viewProjection: Mat4,
  width: number,
  height: number,
  size = 3,
  step = 1,
  color = "rgba(125, 211, 252, 0.25)",
): void {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let i = -size; i <= size; i += step) {
    line(ctx, viewProjection, width, height, vec3(i, 0, -size), vec3(i, 0, size));
    line(ctx, viewProjection, width, height, vec3(-size, 0, i), vec3(size, 0, i));
  }
  ctx.stroke();
  ctx.restore();
}

export function drawAxes(
  ctx: CanvasRenderingContext2D,
  viewProjection: Mat4,
  width: number,
  height: number,
  length = 1.4,
): void {
  const origin = vec3(0, 0, 0);
  const axes: [Vec3, string][] = [
    [vec3(length, 0, 0), "#f87171"],
    [vec3(0, length, 0), "#4ade80"],
    [vec3(0, 0, length), "#60a5fa"],
  ];
  ctx.save();
  ctx.lineWidth = 2;
  for (const [end, color] of axes) {
    ctx.strokeStyle = color;
    ctx.beginPath();
    line(ctx, viewProjection, width, height, origin, end);
    ctx.stroke();
  }
  ctx.restore();
}

export function drawWireframeMesh(
  ctx: CanvasRenderingContext2D,
  viewProjection: Mat4,
  width: number,
  height: number,
  mesh: Mesh,
  model: Mat4,
  color = "#f4f5f7",
): void {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (const [ia, ib, ic] of mesh.indices) {
    const a = mesh.positions[ia];
    const b = mesh.positions[ib];
    const c = mesh.positions[ic];
    if (!a || !b || !c) continue;

    const wa = transformPoint(model, a);
    const wb = transformPoint(model, b);
    const wc = transformPoint(model, c);
    const worldA = vec3(wa.x, wa.y, wa.z);
    const worldB = vec3(wb.x, wb.y, wb.z);
    const worldC = vec3(wc.x, wc.y, wc.z);

    line(ctx, viewProjection, width, height, worldA, worldB);
    line(ctx, viewProjection, width, height, worldB, worldC);
    line(ctx, viewProjection, width, height, worldC, worldA);
  }
  ctx.stroke();
  ctx.restore();
}

export function drawCameraGizmo(
  ctx: CanvasRenderingContext2D,
  viewProjection: Mat4,
  width: number,
  height: number,
  eye: Vec3,
  target: Vec3,
  color = "#facc15",
): void {
  const eyeScreen = projectToScreen(viewProjection, eye, width, height);

  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  line(ctx, viewProjection, width, height, eye, target);
  ctx.stroke();
  ctx.setLineDash([]);

  if (eyeScreen) {
    ctx.beginPath();
    ctx.arc(eyeScreen.x, eyeScreen.y, 5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

export function drawFrustumWireframe(
  ctx: CanvasRenderingContext2D,
  viewProjection: Mat4,
  width: number,
  height: number,
  basis: CameraBasis,
  fovY: number,
  aspect: number,
  near: number,
  far: number,
  color = "#facc15",
): void {
  const nearCorners = frustumCorners(basis, fovY, aspect, near);
  const farCorners = frustumCorners(basis, fovY, aspect, far);

  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  for (let i = 0; i < 4; i++) {
    const nc = nearCorners[i];
    const nn = nearCorners[(i + 1) % 4];
    const fc = farCorners[i];
    const ff = farCorners[(i + 1) % 4];
    line(ctx, viewProjection, width, height, nc, nn);
    line(ctx, viewProjection, width, height, fc, ff);
    line(ctx, viewProjection, width, height, nc, fc);
  }
  ctx.stroke();
  ctx.restore();
}

export function drawPixelGrid(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  cellSize = 8,
  color = "rgba(0, 0, 0, 0.6)",
): void {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.min(1, cellSize) * 0.15;
  ctx.beginPath();
  for (let x = 0; x <= width; x += cellSize) {
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
  }
  for (let y = 0; y <= height; y += cellSize) {
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
  }
  ctx.stroke();
  ctx.restore();
}
