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

/** Stage 1 starts empty -- the user places their own vertices on the canvas. */
export function defaultTableRows(): RawVertexRow[] {
  return [];
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
  /** width/height of the canvas, kept in sync by canvas-host.ts on resize. */
  aspectRatio: number;
}

/** meshes[0] is the stage-1 table, derived from tableRows via {@link tableRowsToMesh}. */
export function createInitialState(): SceneState {
  const tableRows = defaultTableRows();
  const primitive: PrimitiveMode = "points";
  const stage1Mesh: MeshInstance = {
    id: STAGE1_TABLE_MESH_ID,
    label: "Table",
    kind: "table",
    ...tableRowsToMeshFields(tableRows, primitive),
    vertexColors: tableRows.map(() => vec3(1, 1, 1)),
    meshColor: vec3(1, 1, 1),
    transform: identityTransform(),
    locked: true,
  };

  return {
    meshes: [stage1Mesh],
    activeMeshId: STAGE1_TABLE_MESH_ID,
    tableRows,
    primitive,
    fill: "solid",
    projectionKind: "orthographic",
    // near/far/distance are unit-scale, matching the table's normalized 0..1
    // screen-space coordinates and meshes.ts's unit-cube-scale meshes.
    perspective: { fovYDeg: 60, near: 0.01, far: 10 },
    orthographic: { halfHeight: 0.5, near: -10, far: 10, autoFit: true },
    viewEngaged: false,
    view: { azimuthDeg: 0, elevationDeg: 20, distance: 3, target: vec3(0.5, 0.5, 0) },
    blend: "linear",
    baseColor: vec3(1, 1, 1),
    // specular starts at 0, a non-degenerate point on its own continuous slider (unlike
    // orbit view's eye-coincides-with-target singularity), so stage 6's ambient+diffuse-
    // only regime shows no highlight until the user actually drags stage 7's slider up.
    material: { ambient: 0.3, diffuse: 0.7, specular: 0, shininess: 32, enabled: false },
    // A large default distance (well past the far plane) keeps the light reading as
    // roughly directional out of the box; the light-distance slider is what lets a
    // user drag it down to demonstrate point-light falloff-free positional character.
    light: { azimuthDeg: -45, elevationDeg: 45, distance: 40, color: vec3(1, 1, 1) },
    lightingRate: "perVertex",
    progress: { revealed: [true, false, false, false, false, false, false] },
    aspectRatio: 16 / 9,
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
