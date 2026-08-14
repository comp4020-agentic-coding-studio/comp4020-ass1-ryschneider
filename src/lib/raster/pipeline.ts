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

function deg2rad(deg: number): number {
  return (deg * Math.PI) / 180;
}

function buildModelMatrix(transform: MeshInstance["transform"]): Mat4 {
  const rotation = multiply(
    rotateZ(deg2rad(transform.rotateDeg.z)),
    multiply(rotateY(deg2rad(transform.rotateDeg.y)), rotateX(deg2rad(transform.rotateDeg.x))),
  );
  return multiply(translate(transform.translate), multiply(rotation, scaleAxes(transform.scale)));
}

/**
 * Canvas-matched orthographic box by default: `halfHeight` is kept in sync
 * with the live canvas height (see canvas-host.ts) until stage 2 is touched,
 * which is exactly when this reduces to the verified screen-space passthrough
 * (l=0, r=width, b=height, t=0).
 */
function buildProjection(state: SceneState, width: number, height: number): Mat4 {
  if (state.projectionKind === "perspective") {
    const { fovYDeg, near, far } = state.perspective;
    return perspective(deg2rad(fovYDeg), width / height, near, far);
  }
  const { halfHeight, near, far } = state.orthographic;
  const aspect = width / height;
  const halfWidth = halfHeight * aspect;
  const cx = width / 2;
  const cy = height / 2;
  return orthographic(cx - halfWidth, cx + halfWidth, cy + halfHeight, cy - halfHeight, near, far);
}

function buildView(state: SceneState): Mat4 {
  if (!state.viewEngaged) return identity();
  return orbitView(deg2rad(state.view.azimuthDeg), deg2rad(state.view.elevationDeg), state.view.distance, state.view.target);
}

function buildLight(state: SceneState, view: Mat4): Light {
  const worldDirection = orbitEye(deg2rad(state.light.azimuthDeg), deg2rad(state.light.elevationDeg), 1);
  return { direction: transformDirection(view, worldDirection), color: state.light.color };
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
 * Projection * View * Model * vertex)). Stages never branch this math — only
 * the default parameter values (identity Model/View, canvas-matched ortho
 * Projection) and which controls are visible change.
 */
export function renderScene(state: SceneState, fb: Framebuffer, background: readonly [number, number, number] = DEFAULT_BACKGROUND): void {
  clear(fb, background);

  const projection = buildProjection(state, fb.width, fb.height);
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
