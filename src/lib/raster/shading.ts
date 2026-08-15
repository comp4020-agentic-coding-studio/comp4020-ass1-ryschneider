import type { Attrs, ShadeFn } from "./rasterize";
import type { Vec3 } from "./vec3";
import { add, dot, mul, normalize, scale, vec3 } from "./vec3";

export type ShadingMode = "gouraud" | "phong";

export interface Material {
  /** Base surface color, each channel in [0, 1]. */
  color: Vec3;
  ambient: number;
  diffuse: number;
  specular: number;
  shininess: number;
}

export interface Light {
  /** Unit direction the light shines from, in view space. */
  direction: Vec3;
  /** Light color, each channel in [0, 1]. */
  color: Vec3;
}

/** A vertex's view-space position and normal, the inputs both shading modes light from. */
export interface ShadingVertex {
  viewPos: Vec3;
  viewNormal: Vec3;
}

/** Blinn-Phong lighting: ambient + diffuse + specular, each channel in roughly [0, 1]. */
export function computeLighting(normal: Vec3, viewDir: Vec3, light: Light, material: Material): Vec3 {
  const n = normalize(normal);
  const l = normalize(light.direction);
  const v = normalize(viewDir);
  const h = normalize(add(l, v));

  const diffuseAmount = Math.max(dot(n, l), 0);
  const specularAmount = diffuseAmount > 0 ? Math.pow(Math.max(dot(n, h), 0), material.shininess) : 0;

  const ambientTerm = scale(material.color, material.ambient);
  const diffuseTerm = scale(mul(material.color, light.color), material.diffuse * diffuseAmount);
  const specularTerm = scale(light.color, material.specular * specularAmount);

  return add(add(ambientTerm, diffuseTerm), specularTerm);
}

function toByte(channel: number): number {
  return Math.round(Math.max(0, Math.min(1, channel)) * 255);
}

/** In view space the camera sits at the origin, so the direction to the eye is just -position. */
function viewDirFrom(viewPos: Vec3): Vec3 {
  return normalize(scale(viewPos, -1));
}

/** Gouraud shading: light once per vertex, then let the rasterizer interpolate the lit color. */
export function gouraudVertexAttrs(v: ShadingVertex, light: Light, material: Material): Attrs {
  const lit = computeLighting(v.viewNormal, viewDirFrom(v.viewPos), light, material);
  return { cr: lit.x, cg: lit.y, cb: lit.z };
}

export const gouraudShadeFn: ShadeFn = (attrs) => {
  return [toByte(attrs.cr ?? 0), toByte(attrs.cg ?? 0), toByte(attrs.cb ?? 0)];
};

/**
 * Phong shading: carry the raw normal, position, and per-vertex base color
 * through as interpolated attrs, and light once per fragment. Carrying the
 * color (rather than closing over one fixed `material.color`) is what lets
 * per-vertex mesh colors (stage 5) survive into per-pixel lighting (stage 7).
 */
export function phongVertexAttrs(v: ShadingVertex, baseColor: Vec3): Attrs {
  return {
    nx: v.viewNormal.x,
    ny: v.viewNormal.y,
    nz: v.viewNormal.z,
    px: v.viewPos.x,
    py: v.viewPos.y,
    pz: v.viewPos.z,
    cr: baseColor.x,
    cg: baseColor.y,
    cb: baseColor.z,
  };
}

/** `material.color` is only a fallback for attrs missing cr/cg/cb; per-vertex color wins. */
export function makePhongShadeFn(light: Light, material: Material): ShadeFn {
  return (attrs) => {
    const normal = vec3(attrs.nx ?? 0, attrs.ny ?? 0, attrs.nz ?? 0);
    const viewPos = vec3(attrs.px ?? 0, attrs.py ?? 0, attrs.pz ?? 0);
    const color = vec3(attrs.cr ?? material.color.x, attrs.cg ?? material.color.y, attrs.cb ?? material.color.z);
    const lit = computeLighting(normal, viewDirFrom(viewPos), light, { ...material, color });
    return [toByte(lit.x), toByte(lit.y), toByte(lit.z)];
  };
}
