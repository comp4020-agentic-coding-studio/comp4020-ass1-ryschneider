import type { Mat4 } from "./mat4";
import { lookAt } from "./mat4";
import type { Vec3 } from "./vec3";
import { vec3 } from "./vec3";

/**
 * Places an eye on a sphere of the given radius around the origin.
 * azimuth is the angle (radians) around the y axis, measured from +z;
 * elevation is the angle (radians) up from the xz plane.
 */
export function orbitEye(azimuth: number, elevation: number, distance: number): Vec3 {
  const cosElevation = Math.cos(elevation);
  return vec3(
    distance * cosElevation * Math.sin(azimuth),
    distance * Math.sin(elevation),
    distance * cosElevation * Math.cos(azimuth),
  );
}

/** Builds a view matrix for an orbit camera looking at `target` (default: the origin). */
export function orbitView(
  azimuth: number,
  elevation: number,
  distance: number,
  target: Vec3 = vec3(0, 0, 0),
  up: Vec3 = vec3(0, 1, 0),
): Mat4 {
  const eye = orbitEye(azimuth, elevation, distance);
  return lookAt(eye, target, up);
}
