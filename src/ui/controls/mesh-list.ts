import { buildModelMatrix } from "../../lib/raster/pipeline";
import { EXAMPLE_MESHES } from "../../lib/raster/meshes";
import { addMesh, setMeshTransform } from "../../state/actions";
import { activeMesh } from "../../state/scene";
import type { MeshInstance } from "../../state/scene";
import type { Store } from "../../state/store";
import { mountMatrixView } from "../matrix-view";
import { mountMeshSelector } from "./mesh-selector";

type TransformField =
  | "translateX"
  | "translateY"
  | "translateZ"
  | "rotateX"
  | "rotateY"
  | "rotateZ"
  | "scaleX"
  | "scaleY"
  | "scaleZ";

/** Applies one transform-field edit to whichever mesh is currently active. */
function applyTransformField(store: Store, field: TransformField, value: number): void {
  const mesh = activeMesh(store.get());
  const t = mesh.transform;
  const patch =
    field === "translateX"
      ? { translate: { ...t.translate, x: value } }
      : field === "translateY"
        ? { translate: { ...t.translate, y: value } }
        : field === "translateZ"
          ? { translate: { ...t.translate, z: value } }
          : field === "rotateX"
            ? { rotateDeg: { ...t.rotateDeg, x: value } }
            : field === "rotateY"
              ? { rotateDeg: { ...t.rotateDeg, y: value } }
              : field === "rotateZ"
                ? { rotateDeg: { ...t.rotateDeg, z: value } }
                : field === "scaleX"
                  ? { scale: { ...t.scale, x: value } }
                  : field === "scaleY"
                    ? { scale: { ...t.scale, y: value } }
                    : { scale: { ...t.scale, z: value } };
  setMeshTransform(store, mesh.id, patch);
}

function fieldValue(mesh: MeshInstance, field: TransformField): number {
  const t = mesh.transform;
  switch (field) {
    case "translateX":
      return t.translate.x;
    case "translateY":
      return t.translate.y;
    case "translateZ":
      return t.translate.z;
    case "rotateX":
      return t.rotateDeg.x;
    case "rotateY":
      return t.rotateDeg.y;
    case "rotateZ":
      return t.rotateDeg.z;
    case "scaleX":
      return t.scale.x;
    case "scaleY":
      return t.scale.y;
    case "scaleZ":
      return t.scale.z;
  }
}

const TRANSFORM_FIELDS: TransformField[] = [
  "translateX",
  "translateY",
  "translateZ",
  "rotateX",
  "rotateY",
  "rotateZ",
  "scaleX",
  "scaleY",
  "scaleZ",
];

/** Wires stage 4: add/remove/select built-in meshes, per-active-mesh transform sliders, model matrix-view. */
export function mountMeshList(root: ParentNode, store: Store): void {
  const kindSelectEl = root.querySelector<HTMLSelectElement>('[data-field="mesh-kind"]');
  const addButton = root.querySelector<HTMLButtonElement>('[data-action="add-mesh"]');
  const listEl = root.querySelector<HTMLElement>('[data-mount="mesh-list"]');
  const matrixMount = root.querySelector<HTMLElement>('[data-mount="stage4-matrix"]');

  const transformInputs = new Map<TransformField, HTMLInputElement>();
  for (const field of TRANSFORM_FIELDS) {
    const input = root.querySelector<HTMLInputElement>(`[data-field="${field}"]`);
    if (input) transformInputs.set(field, input);
  }

  if (!kindSelectEl || !addButton || !listEl) {
    throw new Error("mesh-list: expected markup not found");
  }
  const kindSelect: HTMLSelectElement = kindSelectEl;

  addButton.addEventListener("click", () => {
    const kind = kindSelect.value as keyof typeof EXAMPLE_MESHES;
    addMesh(store, kind);
  });

  mountMeshSelector(root, store, { mount: '[data-mount="mesh-list"]', removable: true });

  for (const [field, input] of transformInputs) {
    input.addEventListener("input", () => {
      const value = Number(input.value);
      if (Number.isFinite(value)) applyTransformField(store, field, value);
    });
  }

  function render(): void {
    const mesh = activeMesh(store.get());
    for (const [field, input] of transformInputs) {
      if (document.activeElement !== input) input.value = String(fieldValue(mesh, field));
    }
  }

  store.subscribe(render);
  render();

  if (matrixMount) {
    mountMatrixView(matrixMount, store, () => buildModelMatrix(activeMesh(store.get()).transform), "Active mesh's model matrix");
  }
}
