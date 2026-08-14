import type { Mesh } from "./icosphere";
import type { Vec3 } from "./vec3";
import { vec3 } from "./vec3";

/**
 * Appends one flat-shaded polygon face (triangle-fanned from its first
 * vertex) to positions/normals/indices, duplicating vertices per-face so
 * every triangle gets its own flat normal rather than sharing vertices
 * (and therefore normals) with neighboring faces.
 */
function addFace(
  positions: Vec3[],
  normals: Vec3[],
  indices: [number, number, number][],
  verts: readonly Vec3[],
  normal: Vec3,
): void {
  const first = verts[0];
  if (!first) return;
  for (let i = 1; i + 1 < verts.length; i++) {
    const a = verts[i];
    const b = verts[i + 1];
    if (!a || !b) continue;
    const base = positions.length;
    positions.push(first, a, b);
    normals.push(normal, normal, normal);
    indices.push([base, base + 1, base + 2]);
  }
}

function buildMesh(faces: { verts: readonly Vec3[]; normal: Vec3 }[]): Mesh {
  const positions: Vec3[] = [];
  const normals: Vec3[] = [];
  const indices: [number, number, number][] = [];
  for (const face of faces) addFace(positions, normals, indices, face.verts, face.normal);
  return { positions, normals, indices };
}

// Sized to sit alongside the stage-1 table (screen-pixel-scale coordinates,
// spanning ~100-300 units), not a classic unit cube -- at that scale a -0.5..0.5
// mesh is sub-pixel and invisible next to it.
const H = 60;
// prettier-ignore
const CUBE_CORNERS = {
  ppp: vec3(H, H, H), ppn: vec3(H, H, -H), pnp: vec3(H, -H, H), pnn: vec3(H, -H, -H),
  npp: vec3(-H, H, H), npn: vec3(-H, H, -H), nnp: vec3(-H, -H, H), nnn: vec3(-H, -H, -H),
};

/** Cube (extent -60..60 per axis), 6 faces x 2 triangles, flat per-face normals. */
export function cubeMesh(): Mesh {
  const c = CUBE_CORNERS;
  return buildMesh([
    { verts: [c.ppp, c.ppn, c.pnn, c.pnp], normal: vec3(1, 0, 0) },
    { verts: [c.npn, c.npp, c.nnp, c.nnn], normal: vec3(-1, 0, 0) },
    { verts: [c.ppp, c.npp, c.npn, c.ppn], normal: vec3(0, 1, 0) },
    { verts: [c.pnn, c.nnn, c.nnp, c.pnp], normal: vec3(0, -1, 0) },
    { verts: [c.pnp, c.nnp, c.npp, c.ppp], normal: vec3(0, 0, 1) },
    { verts: [c.ppn, c.npn, c.nnn, c.pnn], normal: vec3(0, 0, -1) },
  ]);
}

/** Square-base pyramid (base extent -60..60, apex at y=60), 4 triangular sides + 1 square base. */
export function pyramidMesh(): Mesh {
  const apex = vec3(0, H, 0);
  const pp = vec3(H, -H, H);
  const pn = vec3(H, -H, -H);
  const np = vec3(-H, -H, H);
  const nn = vec3(-H, -H, -H);

  const sideNormal = (a: Vec3, b: Vec3): Vec3 => {
    // Outward horizontal normal for the side face spanning base edge a->b,
    // by construction (base is axis-aligned) this is just the outward-facing
    // axis direction shared by a and b.
    const nx = a.x === b.x ? Math.sign(a.x) : 0;
    const nz = a.z === b.z ? Math.sign(a.z) : 0;
    return vec3(nx, 0.35, nz);
  };

  return buildMesh([
    { verts: [nn, np, pp, pn], normal: vec3(0, -1, 0) },
    { verts: [apex, pp, np], normal: sideNormal(pp, np) },
    { verts: [apex, np, nn], normal: sideNormal(np, nn) },
    { verts: [apex, nn, pn], normal: sideNormal(nn, pn) },
    { verts: [apex, pn, pp], normal: sideNormal(pn, pp) },
  ]);
}

/** A flat horizontal plane (extent -60..60) facing +Y, 2 triangles. */
export function planeMesh(): Mesh {
  return buildMesh([
    { verts: [vec3(-H, 0, H), vec3(H, 0, H), vec3(H, 0, -H), vec3(-H, 0, -H)], normal: vec3(0, 1, 0) },
  ]);
}

export const EXAMPLE_MESHES = {
  cube: { label: "Cube", build: cubeMesh },
  pyramid: { label: "Pyramid", build: pyramidMesh },
  plane: { label: "Plane", build: planeMesh },
} as const;
