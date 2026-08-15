import { EXAMPLE_MESHES } from "../lib/raster/meshes";
import { computeSceneBounds, deg2rad } from "../lib/raster/pipeline";
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

function withReveals(state: SceneState, ...stageNumbers: number[]): Pick<SceneState, "progress"> {
  return { progress: { revealed: stageNumbers.reduce(revealStage, state.progress.revealed) } };
}

/** Stage 2 unlocks once the user has drawn an actual triangle: 3+ vertices, in Triangle mode. */
function stage1Ready(state: SceneState): boolean {
  return state.tableRows.length >= 3 && state.primitive === "triangles";
}

function withStage1Reveal(state: SceneState): Pick<SceneState, "progress"> {
  return stage1Ready(state) ? withReveal(state, 2) : { progress: state.progress };
}

/** Matches --color-highlight in styles.css, so the in-progress preview vertex visually reads as "not yet placed". */
const PREVIEW_COLOR = vec3(0.976, 0.451, 0.098);

function recomputeTableMesh(state: SceneState): MeshInstance {
  const table = state.meshes[0];
  if (!table) throw new Error("actions: meshes[0] (the stage-1 table) is missing");
  const rows = state.previewRow ? [...state.tableRows, state.previewRow] : state.tableRows;
  return {
    ...table,
    ...tableRowsToMeshFields(rows, state.primitive),
    vertexColors: rows.map((_, i) =>
      state.previewRow && i === rows.length - 1 ? PREVIEW_COLOR : (table.vertexColors[i] ?? vec3(1, 1, 1)),
    ),
  };
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
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
    return { ...withRows, meshes, ...withStage1Reveal(withRows) };
  });
}

/** Adds a vertex at the given normalized 0..1 position -- used by click-to-place on the canvas. */
export function addTableRowAt(store: Store, x: number, y: number): void {
  store.update((state) => {
    const tableRows = [...state.tableRows, { id: freshRowId(), x: round4(x), y: round4(y), z: 0 }];
    const withRows = { ...state, tableRows, previewRow: null };
    const meshes = [recomputeTableMesh(withRows), ...state.meshes.slice(1)];
    return { ...withRows, meshes, ...withStage1Reveal(withRows) };
  });
}

/** Live-updates the in-progress vertex while placement is armed; never written to `tableRows`. */
export function setPreviewVertex(store: Store, x: number, y: number): void {
  store.update((state) => {
    const withPreview = { ...state, previewRow: { id: "preview", x, y, z: 0 } };
    const meshes = [recomputeTableMesh(withPreview), ...state.meshes.slice(1)];
    return { ...withPreview, meshes };
  });
}

/** Removes the in-progress preview vertex -- canvas leave, Escape, or re-clicking "Add vertex" to cancel. */
export function clearPreviewVertex(store: Store): void {
  store.update((state) => {
    if (!state.previewRow) return state;
    const withoutPreview = { ...state, previewRow: null };
    const meshes = [recomputeTableMesh(withoutPreview), ...state.meshes.slice(1)];
    return { ...withoutPreview, meshes };
  });
}

export function setPrimitiveMode(store: Store, primitive: PrimitiveMode): void {
  store.update((state) => {
    const withMode = { ...state, primitive };
    const meshes = [recomputeTableMesh(withMode), ...state.meshes.slice(1)];
    return { ...withMode, meshes, ...withStage1Reveal(withMode) };
  });
}

export function setFillMode(store: Store, fill: FillMode): void {
  store.update((state) => {
    const withMode = { ...state, fill };
    return { ...withMode, ...withStage1Reveal(withMode) };
  });
}

// --- Stage 2: projection ---

export function setProjectionKind(store: Store, projectionKind: ProjectionKind): void {
  store.update((state) => {
    // Perspective with an identity view is as degenerate as orbitView(0,0,0) -- the
    // eye coincides with the z=0 table/mesh vertices, so the perspective divide (w = -z)
    // hits zero and every vertex drops behind the near plane, i.e. a silent black canvas.
    // Engaging view here (its defaults are already sensible) keeps "switch to perspective"
    // a working default instead of a dead end, mirroring stage 3's own engagement ratchet.
    const engageView = projectionKind === "perspective" && !state.viewEngaged;
    return {
      ...state,
      projectionKind,
      viewEngaged: state.viewEngaged || engageView,
      ...withReveal(state, 3),
    };
  });
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
    perspective: { fovYDeg: 60, near: 0.01, far: 10 },
    orthographic: { halfHeight: state.orthographic.halfHeight, near: -10, far: 10, autoFit: true },
  }));
}

const ORTHO_HALF_HEIGHT_BOUNDS = { min: 0.05, max: 5 }; // matches the halfHeight slider
const VIEW_DISTANCE_BOUNDS = { min: 0.25, max: 15 }; // matches the distance slider
const FIT_PADDING = 1.2;

function clamp(v: number, { min, max }: { min: number; max: number }): number {
  return Math.min(max, Math.max(min, v));
}

/**
 * Frames every current mesh in view, in whichever projection is active
 * (orthographic or perspective) -- keeps `projectionKind` and the camera's
 * azimuth/elevation as they are, only deriving `view.target`/`view.distance`
 * (and the relevant projection's near/far or halfHeight) from content.
 * Engages the view unconditionally: `buildView` returns identity while
 * `!viewEngaged`, so target/distance would otherwise have no effect.
 */
export function fitEverythingIntoView(store: Store): void {
  store.update((state) => {
    const { center, radius } = computeSceneBounds(state);
    const paddedRadius = radius * FIT_PADDING;

    if (state.projectionKind === "orthographic") {
      const halfHeight = clamp(paddedRadius / Math.min(1, state.aspectRatio), ORTHO_HALF_HEIGHT_BOUNDS);
      const distance = clamp(paddedRadius * 2, VIEW_DISTANCE_BOUNDS);
      // Prefer the same near/far resetProjection defaults use; only widen past them as a
      // safety floor when content genuinely doesn't fit inside the normal range.
      const far = Math.max(10, distance + paddedRadius);
      const near = Math.min(-10, -(distance + paddedRadius));
      return {
        ...state,
        viewEngaged: true,
        view: { ...state.view, target: center, distance },
        orthographic: { ...state.orthographic, halfHeight, near, far, autoFit: false },
        ...withReveals(state, 3, 4),
      };
    }

    const verticalHalf = deg2rad(state.perspective.fovYDeg) / 2;
    const horizontalHalf = Math.atan(Math.tan(verticalHalf) * state.aspectRatio);
    const distance = clamp(paddedRadius / Math.sin(Math.min(verticalHalf, horizontalHalf)), VIEW_DISTANCE_BOUNDS);
    const far = clamp(Math.max(10, distance + paddedRadius), { min: state.perspective.near, max: 20 });
    return {
      ...state,
      viewEngaged: true,
      view: { ...state.view, target: center, distance },
      perspective: { ...state.perspective, far },
      ...withReveals(state, 3, 4),
    };
  });
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

// --- Canvas interaction toggles ---

export function setDragToRotate(store: Store, dragToRotate: boolean): void {
  store.update((state) => ({ ...state, controls: { ...state.controls, dragToRotate } }));
}

export function setScrollToZoom(store: Store, scrollToZoom: boolean): void {
  store.update((state) => ({ ...state, controls: { ...state.controls, scrollToZoom } }));
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
