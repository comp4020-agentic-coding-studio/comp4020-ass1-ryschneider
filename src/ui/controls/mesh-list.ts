import { buildModelMatrix } from "../../lib/raster/pipeline";
import { EXAMPLE_MESHES } from "../../lib/raster/meshes";
import { addMesh, removeMesh, setActiveMesh, setMeshTransform } from "../../state/actions";
import type { MeshInstance } from "../../state/scene";
import type { Store } from "../../state/store";
import { mountMatrixView } from "../matrix-view";
import { bindRangeField } from "./range-field";

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

function activeMesh(store: Store): MeshInstance {
  const state = store.get();
  const mesh = state.meshes.find((m) => m.id === state.activeMeshId) ?? state.meshes[0];
  if (!mesh) throw new Error("mesh-list: no meshes in state");
  return mesh;
}

/** Applies one transform-field edit to whichever mesh is currently active. */
function applyTransformField(store: Store, field: TransformField, value: number): void {
  const mesh = activeMesh(store);
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

function transformFieldOptions(field: TransformField): { hint: string; formatValue: (v: number) => string } {
  if (field.startsWith("translate")) {
    return { hint: `Translate along ${field.slice(-1)}`, formatValue: (v) => v.toFixed(2) };
  }
  if (field.startsWith("rotate")) {
    return { hint: `Rotate around the ${field.slice(-1)} axis`, formatValue: (v) => `${v}°` };
  }
  return { hint: `Scale along ${field.slice(-1)}`, formatValue: (v) => `${v.toFixed(2)}×` };
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
  const list: HTMLElement = listEl;

  addButton.addEventListener("click", () => {
    const kind = kindSelect.value as keyof typeof EXAMPLE_MESHES;
    addMesh(store, kind);
  });

  const transformFields = new Map<TransformField, { sync: (value: number) => void }>();
  for (const [field, input] of transformInputs) {
    transformFields.set(field, bindRangeField(input, transformFieldOptions(field)));
    input.addEventListener("input", () => applyTransformField(store, field, Number(input.value)));
  }

  function render(): void {
    const state = store.get();
    list.innerHTML = "";

    for (const mesh of state.meshes) {
      const li = document.createElement("li");

      const selectButton = document.createElement("button");
      selectButton.type = "button";
      selectButton.textContent = mesh.id === state.activeMeshId ? `● ${mesh.label}` : mesh.label;
      selectButton.setAttribute("aria-pressed", String(mesh.id === state.activeMeshId));
      selectButton.addEventListener("click", () => setActiveMesh(store, mesh.id));
      li.append(selectButton);

      if (!mesh.locked) {
        const removeButton = document.createElement("button");
        removeButton.type = "button";
        removeButton.textContent = "Remove";
        removeButton.addEventListener("click", () => removeMesh(store, mesh.id));
        li.append(removeButton);
      }

      list.append(li);
    }

    const mesh = activeMesh(store);
    for (const [field, input] of transformInputs) {
      const value = fieldValue(mesh, field);
      if (document.activeElement !== input) input.value = String(value);
      transformFields.get(field)?.sync(value);
    }
  }

  store.subscribe(render);
  render();

  if (matrixMount) {
    mountMatrixView(matrixMount, store, () => buildModelMatrix(activeMesh(store).transform), "Active mesh's model matrix");
  }
}
