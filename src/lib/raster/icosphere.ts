import type { Vec3 } from "./vec3";
import { normalize, vec3 } from "./vec3";

export interface Mesh {
  positions: Vec3[];
  // A unit icosphere is centered at the origin, so normal === position for
  // every vertex; kept as a separate field so callers don't have to know that.
  normals: Vec3[];
  indices: readonly (readonly [number, number, number])[];
}

const PHI = (1 + Math.sqrt(5)) / 2;

const BASE_POSITIONS: Vec3[] = [
  vec3(-1, PHI, 0),
  vec3(1, PHI, 0),
  vec3(-1, -PHI, 0),
  vec3(1, -PHI, 0),
  vec3(0, -1, PHI),
  vec3(0, 1, PHI),
  vec3(0, -1, -PHI),
  vec3(0, 1, -PHI),
  vec3(PHI, 0, -1),
  vec3(PHI, 0, 1),
  vec3(-PHI, 0, -1),
  vec3(-PHI, 0, 1),
].map(normalize);

const BASE_FACES: [number, number, number][] = [
  [0, 11, 5],
  [0, 5, 1],
  [0, 1, 7],
  [0, 7, 10],
  [0, 10, 11],
  [1, 5, 9],
  [5, 11, 4],
  [11, 10, 2],
  [10, 7, 6],
  [7, 1, 8],
  [3, 9, 4],
  [3, 4, 2],
  [3, 2, 6],
  [3, 6, 8],
  [3, 8, 9],
  [4, 9, 5],
  [2, 4, 11],
  [6, 2, 10],
  [8, 6, 7],
  [9, 8, 1],
];

/**
 * Builds a unit icosphere by recursively subdividing an icosahedron's edges
 * and re-normalizing new vertices onto the sphere. Vertex count follows
 * 10 * 4^subdivisions + 2; face count follows 20 * 4^subdivisions.
 */
export function generateIcosphere(subdivisions: number): Mesh {
  const positions = BASE_POSITIONS.slice();
  let faces = BASE_FACES.map((f): [number, number, number] => [...f]);

  for (let level = 0; level < subdivisions; level++) {
    const midpointCache = new Map<string, number>();
    const nextFaces: [number, number, number][] = [];

    const midpoint = (a: number, b: number): number => {
      const key = a < b ? `${a}:${b}` : `${b}:${a}`;
      const cached = midpointCache.get(key);
      if (cached !== undefined) return cached;

      const pa = positions[a];
      const pb = positions[b];
      if (!pa || !pb) throw new Error(`icosphere: invalid vertex index ${a}/${b}`);
      const mid = normalize({
        x: (pa.x + pb.x) / 2,
        y: (pa.y + pb.y) / 2,
        z: (pa.z + pb.z) / 2,
      });
      const index = positions.length;
      positions.push(mid);
      midpointCache.set(key, index);
      return index;
    };

    for (const [a, b, c] of faces) {
      const ab = midpoint(a, b);
      const bc = midpoint(b, c);
      const ca = midpoint(c, a);
      nextFaces.push([a, ab, ca], [b, bc, ab], [c, ca, bc], [ab, bc, ca]);
    }

    faces = nextFaces;
  }

  return { positions, normals: positions, indices: faces };
}
