import type { Vec3 } from "./vec3";
import { cross, dot, normalize, sub } from "./vec3";

// Column-major 4x4 matrix, OpenGL convention: element (row, col) lives at
// index col * 4 + row. Multiplying a Mat4 by a column Vec4 applies the
// transform; multiply(a, b) composes so that (a * b) * v === a * (b * v).
export type Mat4 = Float64Array;

export interface Vec4 {
  x: number;
  y: number;
  z: number;
  w: number;
}

export function identity(): Mat4 {
  // prettier-ignore
  return new Float64Array([
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    0, 0, 0, 1,
  ]);
}

export function multiply(a: Mat4, b: Mat4): Mat4 {
  const out = new Float64Array(16);
  for (let col = 0; col < 4; col++) {
    for (let row = 0; row < 4; row++) {
      let sum = 0;
      for (let k = 0; k < 4; k++) {
        sum += (a[k * 4 + row] ?? 0) * (b[col * 4 + k] ?? 0);
      }
      out[col * 4 + row] = sum;
    }
  }
  return out;
}

export function translate(v: Vec3): Mat4 {
  const m = identity();
  m[12] = v.x;
  m[13] = v.y;
  m[14] = v.z;
  return m;
}

export function scaleUniform(s: number): Mat4 {
  const m = identity();
  m[0] = s;
  m[5] = s;
  m[10] = s;
  return m;
}

export function rotateX(theta: number): Mat4 {
  const c = Math.cos(theta);
  const s = Math.sin(theta);
  const m = identity();
  m[5] = c;
  m[6] = s;
  m[9] = -s;
  m[10] = c;
  return m;
}

export function rotateY(theta: number): Mat4 {
  const c = Math.cos(theta);
  const s = Math.sin(theta);
  const m = identity();
  m[0] = c;
  m[2] = -s;
  m[8] = s;
  m[10] = c;
  return m;
}

export function rotateZ(theta: number): Mat4 {
  const c = Math.cos(theta);
  const s = Math.sin(theta);
  const m = identity();
  m[0] = c;
  m[1] = s;
  m[4] = -s;
  m[5] = c;
  return m;
}

export function lookAt(eye: Vec3, target: Vec3, up: Vec3): Mat4 {
  const zAxis = normalize(sub(eye, target));
  const xAxis = normalize(cross(up, zAxis));
  const yAxis = cross(zAxis, xAxis);

  const m = new Float64Array(16);
  m[0] = xAxis.x;
  m[1] = yAxis.x;
  m[2] = zAxis.x;
  m[3] = 0;
  m[4] = xAxis.y;
  m[5] = yAxis.y;
  m[6] = zAxis.y;
  m[7] = 0;
  m[8] = xAxis.z;
  m[9] = yAxis.z;
  m[10] = zAxis.z;
  m[11] = 0;
  m[12] = -dot(xAxis, eye);
  m[13] = -dot(yAxis, eye);
  m[14] = -dot(zAxis, eye);
  m[15] = 1;
  return m;
}

/** fovY in radians. Standard OpenGL-style perspective projection. */
export function perspective(fovY: number, aspect: number, near: number, far: number): Mat4 {
  const f = 1 / Math.tan(fovY / 2);
  const m = new Float64Array(16);
  m[0] = f / aspect;
  m[5] = f;
  m[10] = (far + near) / (near - far);
  m[11] = -1;
  m[14] = (2 * far * near) / (near - far);
  return m;
}

export function transformPoint(m: Mat4, v: Vec3, w = 1): Vec4 {
  return {
    x: (m[0] ?? 0) * v.x + (m[4] ?? 0) * v.y + (m[8] ?? 0) * v.z + (m[12] ?? 0) * w,
    y: (m[1] ?? 0) * v.x + (m[5] ?? 0) * v.y + (m[9] ?? 0) * v.z + (m[13] ?? 0) * w,
    z: (m[2] ?? 0) * v.x + (m[6] ?? 0) * v.y + (m[10] ?? 0) * v.z + (m[14] ?? 0) * w,
    w: (m[3] ?? 0) * v.x + (m[7] ?? 0) * v.y + (m[11] ?? 0) * v.z + (m[15] ?? 0) * w,
  };
}

/** Transforms a direction (normal), ignoring translation (w = 0). */
export function transformDirection(m: Mat4, v: Vec3): Vec3 {
  const p = transformPoint(m, v, 0);
  return { x: p.x, y: p.y, z: p.z };
}
