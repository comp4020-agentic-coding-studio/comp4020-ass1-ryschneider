import { orbitEye, orbitView } from "./camera";
import { applyBlendMode } from "./blend";
import type { Framebuffer } from "./framebuffer";
import { clear } from "./framebuffer";
import type { Mat4 } from "./mat4";
import {
  identity,
  multiply,
  orthographic,
  perspective,
  rotateX,
  rotateY,
  rotateZ,
  scaleAxes,
  transformDirection,
  transformPoint,
  translate,
} from "./mat4";
import { drawLine, drawPoint, wireframeTriangle } from "./primitives";
import { toNdc } from "./projection";
import type { Attrs, ScreenVertex, ShadeFn } from "./rasterize";
import { rasterizeTriangle } from "./rasterize";
import { ndcToScreen } from "./screen";
import type { Light, Material } from "./shading";
import { gouraudShadeFn, gouraudVertexAttrs, makePhongShadeFn, phongVertexAttrs } from "./shading";
import type { Vec3 } from "./vec3";
import { vec3 } from "./vec3";
import type { MeshInstance, SceneState } from "../../state/scene";

const DEFAULT_BACKGROUND: readonly [number, number, number] = [24, 24, 28];

function toByte(channel: number): number {
  return Math.round(Math.max(0, Math.min(1, channel)) * 255);
}

/** Exported so actions.ts's fitEverythingIntoView can share this conversion rather than duplicate it. */
export function deg2rad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/** Exported so stage 2-4's matrix-view panels can compute the same matrices renderScene uses, not a drifted copy. */
export function buildModelMatrix(transform: MeshInstance["transform"]): Mat4 {
  const rotation = multiply(
    rotateZ(deg2rad(transform.rotateDeg.z)),
    multiply(rotateY(deg2rad(transform.rotateDeg.y)), rotateX(deg2rad(transform.rotateDeg.x))),
  );
  return multiply(translate(transform.translate), multiply(rotation, scaleAxes(transform.scale)));
}

/**
 * A normalized, canvas-matched orthographic box: `halfHeight` (corrected for
 * `state.aspectRatio`, kept in sync with the live canvas by canvas-host.ts)
 * around an anchor point, so mesh content never looks stretched even though
 * the box itself doesn't depend on actual pixel dimensions -- those only
 * enter the pipeline in the viewport step (`ndcToScreen`). The anchor is
 * `(0.5, 0.5)` while the view is un-engaged (identity view, so view-space ==
 * world-space, and world `(0.5, 0.5)` is stage 1's canvas-center convention),
 * but `(0, 0)` once the view is engaged: `lookAt` maps the camera's
 * `view.target` to view-space origin, not `(0.5, 0.5)`, so anchoring there
 * instead keeps engaged-view orthographic content centered on its target
 * rather than rendering ~0.5 units off-center.
 *
 * The b/t swap that cancels `ndcToScreen`'s Y-flip (see `orthographic`'s doc
 * comment in mat4.ts) is only correct for that un-engaged screen-space
 * passthrough -- once the view is engaged, orthographic must flip exactly
 * once (matching perspective's single flip from `ndcToScreen`), or content
 * renders vertically mirrored, and thus with reversed apparent winding,
 * relative to perspective.
 */
export function buildProjection(state: SceneState): Mat4 {
  if (state.projectionKind === "perspective") {
    const { fovYDeg, near, far } = state.perspective;
    return perspective(deg2rad(fovYDeg), state.aspectRatio, near, far);
  }
  const { halfHeight, near, far } = state.orthographic;
  const halfWidth = halfHeight * state.aspectRatio;
  const cx = state.viewEngaged ? 0 : 0.5;
  const cy = state.viewEngaged ? 0 : 0.5;
  const flip = state.viewEngaged ? -1 : 1;
  return orthographic(cx - halfWidth, cx + halfWidth, cy + flip * halfHeight, cy - flip * halfHeight, near, far);
}

/**
 * Inverts buildProjection's un-engaged-view orthographic box: turns a canvas
 * fraction (0..1, top-left origin, matching pointer coordinates) back into
 * the world (x, y) it renders at, so a vertex placed under the pointer always
 * lands at the pixel it was clicked at, regardless of aspect ratio. Only
 * valid for the identity-view case (stage 1's actual usage) -- it hardcodes
 * the (0.5, 0.5) anchor rather than branching on viewEngaged.
 */
export function screenFractionToWorldXY(state: SceneState, xFraction: number, yFraction: number): { x: number; y: number } {
  const { halfHeight } = state.orthographic;
  const halfWidth = halfHeight * state.aspectRatio;
  const ndcX = 2 * xFraction - 1;
  const ndcY = 1 - 2 * yFraction;
  return { x: ndcX * halfWidth + 0.5, y: 0.5 - ndcY * halfHeight };
}

/** Exported so stage 3's matrix-view panel can compute the same view matrix renderScene uses. */
export function buildView(state: SceneState): Mat4 {
  if (!state.viewEngaged) return identity();
  return orbitView(deg2rad(state.view.yawDeg), deg2rad(state.view.pitchDeg), state.view.distance, state.view.target);
}

export interface SceneBounds {
  center: Vec3;
  radius: number;
}

/**
 * World-space bounding sphere across every mesh's transformed vertices, used
 * by fitEverythingIntoView (actions.ts) to frame all current content. Falls
 * back to stage 1's own default unit-square scale when there are no vertices
 * to bound (e.g. an empty stage-1 table); floors the radius so a single
 * point (or coincident vertices) still yields a usable, non-degenerate fit.
 */
export function computeSceneBounds(state: SceneState): SceneBounds {
  let minX = Infinity;
  let minY = Infinity;
  let minZ = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let maxZ = -Infinity;

  for (const mesh of state.meshes) {
    const model = buildModelMatrix(mesh.transform);
    for (const p of mesh.positions) {
      const w = transformPoint(model, p);
      minX = Math.min(minX, w.x);
      maxX = Math.max(maxX, w.x);
      minY = Math.min(minY, w.y);
      maxY = Math.max(maxY, w.y);
      minZ = Math.min(minZ, w.z);
      maxZ = Math.max(maxZ, w.z);
    }
  }

  if (!Number.isFinite(minX)) return { center: vec3(0.5, 0.5, 0), radius: 0.5 };

  const center = vec3((minX + maxX) / 2, (minY + maxY) / 2, (minZ + maxZ) / 2);
  const dx = maxX - minX;
  const dy = maxY - minY;
  const dz = maxZ - minZ;
  const radius = Math.max(0.05, Math.sqrt(dx * dx + dy * dy + dz * dz) / 2);
  return { center, radius };
}

function buildLight(state: SceneState, view: Mat4): Light {
  const worldDirection = orbitEye(deg2rad(state.light.azimuthDeg), deg2rad(state.light.elevationDeg), 1);
  const direction = transformDirection(view, worldDirection);
  return { direction, color: state.light.color };
}

function vertexAttrs(state: SceneState, viewPos: Vec3, viewNormal: Vec3, baseColor: Vec3, light: Light): Attrs {
  if (!state.material.enabled) {
    return { cr: baseColor.x, cg: baseColor.y, cb: baseColor.z };
  }
  const material: Material = {
    color: baseColor,
    ambient: state.material.ambient,
    diffuse: state.material.diffuse,
    specular: state.material.specular,
    shininess: state.material.shininess,
  };
  if (state.lightingRate === "perVertex") {
    return gouraudVertexAttrs({ viewPos, viewNormal }, light, material);
  }
  return phongVertexAttrs({ viewPos, viewNormal }, baseColor);
}

function shadeFnFor(state: SceneState, light: Light): ShadeFn {
  if (!state.material.enabled) {
    return (attrs) => [toByte(attrs.cr ?? 0), toByte(attrs.cg ?? 0), toByte(attrs.cb ?? 0)];
  }
  if (state.lightingRate === "perVertex") return gouraudShadeFn;
  const material: Material = {
    color: state.baseColor,
    ambient: state.material.ambient,
    diffuse: state.material.diffuse,
    specular: state.material.specular,
    shininess: state.material.shininess,
  };
  return makePhongShadeFn(light, material);
}

/**
 * Renders every mesh in `state.meshes` into one shared framebuffer, in the
 * same pipeline formula from stage 1 onward: screen = viewport(toNdc(
 * Projection * View * Model * vertex)). Stages never branch this math: only
 * the default parameter values (identity Model/View, canvas-matched ortho
 * Projection) and which controls are visible change.
 */
export function renderScene(state: SceneState, fb: Framebuffer, background: readonly [number, number, number] = DEFAULT_BACKGROUND): void {
  clear(fb, background);

  const projection = buildProjection(state);
  const view = buildView(state);
  const light = buildLight(state, view);
  const shade = shadeFnFor(state, light);

  for (const mesh of state.meshes) {
    const model = buildModelMatrix(mesh.transform);
    const modelView = multiply(view, model);
    const viewProjection = multiply(projection, modelView);

    const screenVerts: (ScreenVertex | null)[] = mesh.positions.map((position, i) => {
      const viewPos4 = transformPoint(modelView, position);
      const viewPos = vec3(viewPos4.x, viewPos4.y, viewPos4.z);
      const viewNormal = transformDirection(modelView, mesh.normals[i] ?? vec3(0, 0, 1));

      const clip = transformPoint(viewProjection, position);
      if (clip.w <= 0) return null;
      const ndc = toNdc(clip);
      if (ndc.z < -1 || ndc.z > 1) return null;
      const screen = ndcToScreen(ndc, fb.width, fb.height);

      const baseColor = mesh.vertexColors[i] ?? mesh.meshColor;
      return {
        x: screen.x,
        y: screen.y,
        depth: ndc.z,
        invW: 1 / clip.w,
        attrs: vertexAttrs(state, viewPos, viewNormal, baseColor, light),
      };
    });

    if (state.primitive === "triangles") {
      for (const [a, b, c] of mesh.indices) {
        const v0 = screenVerts[a];
        const v1 = screenVerts[b];
        const v2 = screenVerts[c];
        if (!v0 || !v1 || !v2) continue;
        const [attrs0, attrs1, attrs2] = applyBlendMode(v0.attrs, v1.attrs, v2.attrs, state.blend);
        const sv0 = { ...v0, attrs: attrs0 };
        const sv1 = { ...v1, attrs: attrs1 };
        const sv2 = { ...v2, attrs: attrs2 };
        if (state.fill === "solid") rasterizeTriangle(sv0, sv1, sv2, fb, shade);
        else wireframeTriangle(sv0, sv1, sv2, fb, shade);
      }
    } else if (state.primitive === "lines") {
      for (let i = 0; i + 1 < screenVerts.length; i += 2) {
        const v0 = screenVerts[i];
        const v1 = screenVerts[i + 1];
        if (v0 && v1) drawLine(v0, v1, fb, shade);
      }
    } else {
      for (const v of screenVerts) if (v) drawPoint(v, fb, shade);
    }
  }
}
