import type { Vec3 } from "./vec3";
import { add, cross, normalize, scale, sub, vec3 } from "./vec3";

export interface CameraBasis {
  eye: Vec3;
  forward: Vec3;
  right: Vec3;
  up: Vec3;
}

/** Builds an orthonormal camera basis from the same eye/target/up inputs `lookAt` takes. */
export function cameraBasis(eye: Vec3, target: Vec3, up: Vec3 = vec3(0, 1, 0)): CameraBasis {
  const forward = normalize(sub(target, eye));
  const right = normalize(cross(forward, up));
  const trueUp = cross(right, forward);
  return { eye, forward, right, up: trueUp };
}

/**
 * The four world-space corners (top-left, top-right, bottom-right, bottom-left) of the camera's
 * view cross-section at `distance` along its forward axis, used to draw a frustum wireframe.
 */
export function frustumCorners(
  basis: CameraBasis,
  fovY: number,
  aspect: number,
  distance: number,
): [Vec3, Vec3, Vec3, Vec3] {
  const halfHeight = Math.tan(fovY / 2) * distance;
  const halfWidth = halfHeight * aspect;
  const center = add(basis.eye, scale(basis.forward, distance));
  const upOffset = scale(basis.up, halfHeight);
  const rightOffset = scale(basis.right, halfWidth);

  const topLeft = add(sub(center, rightOffset), upOffset);
  const topRight = add(add(center, rightOffset), upOffset);
  const bottomRight = sub(add(center, rightOffset), upOffset);
  const bottomLeft = sub(sub(center, rightOffset), upOffset);

  return [topLeft, topRight, bottomRight, bottomLeft];
}
