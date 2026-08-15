import type { Mat4 } from "./mat4";
import { lookAt } from "./mat4";
import type { Vec3 } from "./vec3";
import { add, vec3 } from "./vec3";

/**
 * Places an eye on a sphere of the given radius around `target` (default:
 * the origin). azimuth is the angle (radians) around the y axis, measured
 * from +z; elevation is the angle (radians) up from the xz plane. Called
 * directly (with the default origin-centered target) for light positioning,
 * where there's no look-at point -- only orbitView's camera use needs the
 * eye to orbit an arbitrary target.
 */
export function orbitEye(azimuth: number, elevation: number, distance: number, target: Vec3 = vec3(0, 0, 0)): Vec3 {
  const cosElevation = Math.cos(elevation);
  return add(
    target,
    vec3(distance * cosElevation * Math.sin(azimuth), distance * Math.sin(elevation), distance * cosElevation * Math.cos(azimuth)),
  );
}

/** Builds a view matrix for an orbit camera looking at `target` (default: the origin), orbiting at `distance` from it. */
export function orbitView(
  azimuth: number,
  elevation: number,
  distance: number,
  target: Vec3 = vec3(0, 0, 0),
  up: Vec3 = vec3(0, 1, 0),
): Mat4 {
  const eye = orbitEye(azimuth, elevation, distance, target);
  return lookAt(eye, target, up);
}
