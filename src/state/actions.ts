import { EXAMPLE_MESHES } from "../lib/raster/meshes";
import { vec3 } from "../lib/raster/vec3";
import type { Vec3 } from "../lib/raster/vec3";
import type {
  BlendMode,
  FillMode,
  LightingRate,
  MeshInstance,
  MeshTransform,
  PrimitiveMode,
  ProjectionKind,
  RawVertexRow,
  SceneState,
} from "./scene";
import { identityTransform, tableRowsToMeshFields } from "./scene";
import type { Store } from "./store";

/** Reveal is monotonic: only ever flips a stage's visibility on, never back off. */
function revealStage(revealed: boolean[], stageNumber: number): boolean[] {
  const next = revealed.slice();
  const index = stageNumber - 1;
  if (index >= 0 && index < next.length) next[index] = true;
  return next;
}

function withReveal(state: SceneState, stageNumber: number): Pick<SceneState, "progress"> {
  return { progress: { revealed: revealStage(state.progress.revealed, stageNumber) } };
}

function recomputeTableMesh(state: SceneState): MeshInstance {
  const table = state.meshes[0];
  if (!table) throw new Error("actions: meshes[0] (the stage-1 table) is missing");
  return {
    ...table,
    ...tableRowsToMeshFields(state.tableRows, state.primitive),
    vertexColors: state.tableRows.map((_, i) => table.vertexColors[i] ?? vec3(1, 1, 1)),
  };
}

let nextRowSeq = 0;
function freshRowId(): string {
  nextRowSeq += 1;
  return `row-${nextRowSeq}`;
}

let nextMeshSeq = 0;
function freshMeshId(): string {
  nextMeshSeq += 1;
  return `mesh-${nextMeshSeq}`;
}

// --- Stage 1: vertex table, primitive mode, fill mode ---

export function setTableRow(store: Store, rowId: string, patch: Partial<Pick<RawVertexRow, "x" | "y" | "z">>): void {
  store.update((state) => {
    const tableRows = state.tableRows.map((row) => (row.id === rowId ? { ...row, ...patch } : row));
    const withRows = { ...state, tableRows };
    const meshes = [recomputeTableMesh(withRows), ...state.meshes.slice(1)];
    return { ...withRows, meshes, ...withReveal(state, 2) };
  });
}

export function addTableRow(store: Store): void {
  store.update((state) => {
    const tableRows = [...state.tableRows, { id: freshRowId(), x: 300, y: 200, z: 0 }];
    const withRows = { ...state, tableRows };
    const meshes = [recomputeTableMesh(withRows), ...state.meshes.slice(1)];
    return { ...withRows, meshes, ...withReveal(state, 2) };
  });
}

export function removeTableRow(store: Store, rowId: string): void {
  store.update((state) => {
    if (state.tableRows.length <= 1) return state;
    const tableRows = state.tableRows.filter((row) => row.id !== rowId);
    const withRows = { ...state, tableRows };
    const meshes = [recomputeTableMesh(withRows), ...state.meshes.slice(1)];
    return { ...withRows, meshes, ...withReveal(state, 2) };
  });
}

export function setPrimitiveMode(store: Store, primitive: PrimitiveMode): void {
  store.update((state) => {
    const withMode = { ...state, primitive };
    const meshes = [recomputeTableMesh(withMode), ...state.meshes.slice(1)];
    return { ...withMode, meshes, ...withReveal(state, 2) };
  });
}

export function setFillMode(store: Store, fill: FillMode): void {
  store.update((state) => ({ ...state, fill, ...withReveal(state, 2) }));
}

// --- Stage 2: projection ---

export function setProjectionKind(store: Store, projectionKind: ProjectionKind): void {
  store.update((state) => ({ ...state, projectionKind, ...withReveal(state, 3) }));
}

export function setPerspectiveParam(store: Store, patch: Partial<SceneState["perspective"]>): void {
  store.update((state) => ({
    ...state,
    perspective: { ...state.perspective, ...patch },
    ...withReveal(state, 3),
  }));
}

/** Any manual halfHeight edit stops canvas-host.ts's auto-fit-to-canvas tracking (see there). */
export function setOrthoParam(store: Store, patch: Partial<Omit<SceneState["orthographic"], "autoFit">>): void {
  store.update((state) => ({
    ...state,
    orthographic: { ...state.orthographic, ...patch, autoFit: false },
    ...withReveal(state, 3),
  }));
}

export function resetProjection(store: Store): void {
  store.update((state) => ({
    ...state,
    projectionKind: "orthographic",
    perspective: { fovYDeg: 60, near: 1, far: 5000 },
    orthographic: { halfHeight: state.orthographic.halfHeight, near: -1000, far: 1000, autoFit: true },
  }));
}

export function loadPerspectiveExample(store: Store): void {
  store.update((state) => ({
    ...state,
    projectionKind: "perspective",
    perspective: { fovYDeg: 60, near: 1, far: 5000 },
    ...withReveal(state, 3),
  }));
}

// --- Stage 3: view ---

export function engageView(store: Store): void {
  store.update((state) => ({ ...state, viewEngaged: true, ...withReveal(state, 4) }));
}

export function setViewParam(store: Store, patch: Partial<SceneState["view"]>): void {
  store.update((state) => ({
    ...state,
    viewEngaged: true,
    view: { ...state.view, ...patch },
    ...withReveal(state, 4),
  }));
}

// --- Stage 4: model / multi-mesh ---

export function addMesh(store: Store, kind: keyof typeof EXAMPLE_MESHES): void {
  store.update((state) => {
    const example = EXAMPLE_MESHES[kind];
    const built = example.build();
    const instance: MeshInstance = {
      id: freshMeshId(),
      label: example.label,
      kind,
      positions: built.positions,
      normals: built.normals,
      indices: built.indices,
      vertexColors: built.positions.map(() => vec3(1, 1, 1)),
      meshColor: vec3(1, 1, 1),
      // Spawn at the current view target rather than the world origin --
      // `lookAt` guarantees that point is centered in the camera's frustum,
      // so a freshly-added mesh is always visible regardless of where the
      // camera has been orbited to.
      transform: { ...identityTransform(), translate: state.view.target },
    };
    return { ...state, meshes: [...state.meshes, instance], activeMeshId: instance.id, ...withReveal(state, 5) };
  });
}

export function removeMesh(store: Store, meshId: string): void {
  store.update((state) => {
    const target = state.meshes.find((m) => m.id === meshId);
    if (!target || target.locked) return state;
    const meshes = state.meshes.filter((m) => m.id !== meshId);
    const activeMeshId = state.activeMeshId === meshId ? (meshes[0]?.id ?? state.activeMeshId) : state.activeMeshId;
    return { ...state, meshes, activeMeshId };
  });
}

export function setActiveMesh(store: Store, meshId: string): void {
  store.update((state) => (state.meshes.some((m) => m.id === meshId) ? { ...state, activeMeshId: meshId } : state));
}

export function setMeshTransform(store: Store, meshId: string, patch: Partial<MeshTransform>): void {
  store.update((state) => {
    const meshes = state.meshes.map((m) =>
      m.id === meshId ? { ...m, transform: { ...m.transform, ...patch } } : m,
    );
    return { ...state, meshes, ...withReveal(state, 5) };
  });
}

// --- Stage 5: color / blend ---

/**
 * Paints every vertex of the mesh with `color`. Rendering always resolves a
 * vertex's color from `vertexColors[i]` (never a bare `meshColor` fallback,
 * since every mesh's `vertexColors` array is fully populated from creation)
 * -- so a bulk "mesh color" edit has to overwrite `vertexColors` itself to be
 * visible, not just the `meshColor` record.
 */
export function setMeshColor(store: Store, meshId: string, color: Vec3): void {
  store.update((state) => {
    const meshes = state.meshes.map((m) =>
      m.id === meshId ? { ...m, meshColor: color, vertexColors: m.vertexColors.map(() => color) } : m,
    );
    return { ...state, meshes, ...withReveal(state, 6) };
  });
}

export function setVertexColor(store: Store, meshId: string, vertexIndex: number, color: Vec3): void {
  store.update((state) => {
    const meshes = state.meshes.map((m) => {
      if (m.id !== meshId) return m;
      const vertexColors = m.vertexColors.slice();
      vertexColors[vertexIndex] = color;
      return { ...m, vertexColors };
    });
    return { ...state, meshes, ...withReveal(state, 6) };
  });
}

export function setBlendMode(store: Store, blend: BlendMode): void {
  store.update((state) => ({ ...state, blend, ...withReveal(state, 6) }));
}

// --- Stage 6 / 7: lighting ---

export function engageMaterial(store: Store): void {
  store.update((state) => ({
    ...state,
    material: { ...state.material, enabled: true },
    ...withReveal(state, 7),
  }));
}

export function setMaterialParam(store: Store, patch: Partial<SceneState["material"]>): void {
  store.update((state) => ({
    ...state,
    material: { ...state.material, ...patch, enabled: true },
    ...withReveal(state, 7),
  }));
}

export function setLightingRate(store: Store, lightingRate: LightingRate): void {
  store.update((state) => ({ ...state, lightingRate, ...withReveal(state, 7) }));
}

/** Engages material like setMaterialParam does -- otherwise moving the light before touching ambient/diffuse is a no-op with no visible feedback. */
export function setLightParam(store: Store, patch: Partial<SceneState["light"]>): void {
  store.update((state) => ({
    ...state,
    light: { ...state.light, ...patch },
    material: { ...state.material, enabled: true },
    ...withReveal(state, 7),
  }));
}
