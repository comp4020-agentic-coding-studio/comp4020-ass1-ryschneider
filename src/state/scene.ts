import type { Vec3 } from "../lib/raster/vec3";
import { vec3 } from "../lib/raster/vec3";
import type { Mesh } from "../lib/raster/icosphere";

export type PrimitiveMode = "points" | "lines" | "triangles";
export type FillMode = "solid" | "wireframe";
export type ProjectionKind = "orthographic" | "perspective";
export type BlendMode = "flat" | "linear";
export type LightingRate = "perVertex" | "perPixel";
export type MeshKind = "table" | "cube" | "pyramid" | "plane";

export interface RawVertexRow {
  id: string;
  x: number;
  y: number;
  z: number;
}

export interface MeshTransform {
  translate: Vec3;
  rotateDeg: Vec3;
  scale: Vec3;
}

export interface MeshInstance {
  id: string;
  label: string;
  kind: MeshKind;
  positions: Vec3[];
  normals: Vec3[];
  indices: readonly (readonly [number, number, number])[];
  vertexColors: Vec3[];
  meshColor: Vec3;
  transform: MeshTransform;
  locked?: boolean;
}

export function identityTransform(): MeshTransform {
  return { translate: vec3(0, 0, 0), rotateDeg: vec3(0, 0, 0), scale: vec3(1, 1, 1) };
}

export const STAGE1_TABLE_MESH_ID = "stage1-table";

/**
 * Kept small (well under 358 CSS px) so the identity-passthrough triangle
 * stays fully visible on a narrow phone canvas, not just a wide desktop one.
 */
export function defaultTableRows(): RawVertexRow[] {
  return [
    { id: "r0", x: 80, y: 90, z: 0 },
    { id: "r1", x: 280, y: 90, z: 0 },
    { id: "r2", x: 180, y: 230, z: 0 },
  ];
}

export interface SceneState {
  meshes: MeshInstance[];
  activeMeshId: string;
  tableRows: RawVertexRow[];
  primitive: PrimitiveMode;
  fill: FillMode;
  projectionKind: ProjectionKind;
  perspective: { fovYDeg: number; near: number; far: number };
  orthographic: { halfHeight: number; near: number; far: number; autoFit: boolean };
  viewEngaged: boolean;
  view: { azimuthDeg: number; elevationDeg: number; distance: number; target: Vec3 };
  blend: BlendMode;
  baseColor: Vec3;
  material: { ambient: number; diffuse: number; specular: number; shininess: number; enabled: boolean };
  light: { azimuthDeg: number; elevationDeg: number; distance: number; color: Vec3 };
  lightingRate: LightingRate;
  progress: { revealed: boolean[] };
}

/** meshes[0] is the stage-1 table, derived from tableRows via {@link tableRowsToMesh}. */
export function createInitialState(): SceneState {
  const tableRows = defaultTableRows();
  const stage1Mesh: MeshInstance = {
    id: STAGE1_TABLE_MESH_ID,
    label: "Table",
    kind: "table",
    ...tableRowsToMeshFields(tableRows, "triangles"),
    vertexColors: tableRows.map(() => vec3(1, 1, 1)),
    meshColor: vec3(1, 1, 1),
    transform: identityTransform(),
    locked: true,
  };

  return {
    meshes: [stage1Mesh],
    activeMeshId: STAGE1_TABLE_MESH_ID,
    tableRows,
    primitive: "triangles",
    fill: "solid",
    projectionKind: "orthographic",
    // near/far/distance are pixel-scale, matching the table's screen-space coordinates
    // (canvas-host.ts keeps target synced to the canvas center, same convention as
    // orthographic's canvas-matched box) -- unit-scale defaults would put the table
    // outside the frustum the moment perspective + view are both engaged.
    perspective: { fovYDeg: 60, near: 1, far: 5000 },
    orthographic: { halfHeight: 300, near: -1000, far: 1000, autoFit: true },
    viewEngaged: false,
    view: { azimuthDeg: 0, elevationDeg: 20, distance: 600, target: vec3(0, 0, 0) },
    blend: "linear",
    baseColor: vec3(1, 1, 1),
    // specular starts at 0, a non-degenerate point on its own continuous slider (unlike
    // orbit view's eye-coincides-with-target singularity), so stage 6's ambient+diffuse-
    // only regime shows no highlight until the user actually drags stage 7's slider up.
    material: { ambient: 0.3, diffuse: 0.7, specular: 0, shininess: 32, enabled: false },
    // A large default distance (well past the far plane) keeps the light reading as
    // roughly directional out of the box; the light-distance slider is what lets a
    // user drag it down to demonstrate point-light falloff-free positional character.
    light: { azimuthDeg: -45, elevationDeg: 45, distance: 5000, color: vec3(1, 1, 1) },
    lightingRate: "perVertex",
    progress: { revealed: [true, false, false, false, false, false, false] },
  };
}

/**
 * Groups the table's rows into consecutive non-overlapping pairs/triples
 * (remainder dropped), mirroring gl.POINTS/gl.LINES/gl.TRIANGLES draw-mode
 * semantics, and derives flat per-face normals for the "triangles" case.
 */
export function tableRowsToMeshFields(
  rows: RawVertexRow[],
  primitive: PrimitiveMode,
): Pick<Mesh, "positions" | "normals" | "indices"> {
  const positions = rows.map((r) => vec3(r.x, r.y, r.z));

  if (primitive === "triangles") {
    const indices: [number, number, number][] = [];
    for (let i = 0; i + 2 < positions.length; i += 3) {
      indices.push([i, i + 1, i + 2]);
    }
    return { positions, normals: positions.map(() => vec3(0, 0, 1)), indices };
  }

  // points/lines: no triangle faces to fill, but keep a consistent shape so
  // downstream code (lighting, matrix-view diagrams) never special-cases them.
  return { positions, normals: positions.map(() => vec3(0, 0, 1)), indices: [] };
}
