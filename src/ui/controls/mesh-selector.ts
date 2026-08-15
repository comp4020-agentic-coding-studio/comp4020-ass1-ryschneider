import { removeMesh, setActiveMesh } from "../../state/actions";
import type { Store } from "../../state/store";

export interface MeshSelectorOptions {
  /** Selector for the `<ul>` (or similar) to populate, e.g. '[data-mount="mesh-list"]'. */
  mount: string;
  /** Stage 4 shows a trash-icon remove button per unlocked mesh; stage 5 is selection-only. */
  removable?: boolean;
}

/**
 * Renders a list of mesh-select buttons synced to `state.activeMeshId`. Both
 * stage 4 and stage 5 mount this against the same store, so selecting a mesh
 * in one place updates the other automatically.
 */
export function mountMeshSelector(root: ParentNode, store: Store, options: MeshSelectorOptions): void {
  const listEl = root.querySelector<HTMLElement>(options.mount);
  if (!listEl) throw new Error(`mesh-selector: mount ${options.mount} not found`);
  const list: HTMLElement = listEl;

  function render(): void {
    const state = store.get();
    list.innerHTML = "";

    for (const mesh of state.meshes) {
      const li = document.createElement("li");

      const selectButton = document.createElement("button");
      selectButton.type = "button";
      selectButton.textContent = mesh.label;
      selectButton.setAttribute("aria-pressed", String(mesh.id === state.activeMeshId));
      selectButton.addEventListener("click", () => setActiveMesh(store, mesh.id));
      li.append(selectButton);

      if (options.removable && !mesh.locked) {
        const removeButton = document.createElement("button");
        removeButton.type = "button";
        removeButton.className = "remove-mesh-button";
        removeButton.textContent = "\u{1F5D1}\u{FE0F}";
        removeButton.setAttribute("aria-label", `Remove ${mesh.label}`);
        removeButton.title = `Remove ${mesh.label}`;
        removeButton.addEventListener("click", () => removeMesh(store, mesh.id));
        li.append(removeButton);
      }

      list.append(li);
    }
  }

  store.subscribe(render);
  render();
}
