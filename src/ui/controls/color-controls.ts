import { setBlendMode, setMeshColor, setVertexColor } from "../../state/actions";
import type { BlendMode, MeshInstance } from "../../state/scene";
import { activeMesh } from "../../state/scene";
import type { Store } from "../../state/store";
import type { Vec3 } from "../../lib/raster/vec3";
import { vec3 } from "../../lib/raster/vec3";
import { mountButtonGroup } from "./button-group";
import { mountMeshSelector } from "./mesh-selector";

function hexToVec3(hex: string): Vec3 {
  const n = Number.parseInt(hex.slice(1), 16);
  return vec3(((n >> 16) & 0xff) / 255, ((n >> 8) & 0xff) / 255, (n & 0xff) / 255);
}

function vec3ToHex(color: Vec3): string {
  const channel = (v: number) => Math.round(Math.max(0, Math.min(1, v)) * 255).toString(16).padStart(2, "0");
  return `#${channel(color.x)}${channel(color.y)}${channel(color.z)}`;
}

/** Wires stage 5: the mesh selector (shared with stage 4), the active mesh's base color, its
 * per-vertex colors, and the flat/linear blend toggle. */
export function mountColorControls(root: ParentNode, store: Store): void {
  mountMeshSelector(root, store, { mount: '[data-mount="stage5-mesh-select"]', removable: false });

  const meshColorInput = root.querySelector<HTMLInputElement>('[data-field="mesh-color"]');
  const vertexList = root.querySelector<HTMLElement>('[data-mount="vertex-colors"]');
  const blendGroup = mountButtonGroup<BlendMode>(root, '[data-group="blend"]', (value) => setBlendMode(store, value));

  if (!meshColorInput || !vertexList) {
    throw new Error("color-controls: expected markup not found");
  }
  const meshColor: HTMLInputElement = meshColorInput;
  const vertexListEl: HTMLElement = vertexList;

  meshColor.addEventListener("input", () => {
    setMeshColor(store, activeMesh(store.get()).id, hexToVec3(meshColor.value));
  });

  let renderedMeshId: string | null = null;
  let vertexInputs: HTMLInputElement[] = [];

  function rebuildVertexList(mesh: MeshInstance): void {
    vertexListEl.innerHTML = "";
    vertexInputs = mesh.vertexColors.map((color, i) => {
      const li = document.createElement("li");
      const label = document.createElement("label");
      label.textContent = `Vertex ${i} `;
      const input = document.createElement("input");
      input.type = "color";
      input.value = vec3ToHex(color);
      input.addEventListener("input", () => setVertexColor(store, mesh.id, i, hexToVec3(input.value)));
      label.append(input);
      li.append(label);
      vertexListEl.append(li);
      return input;
    });
    renderedMeshId = mesh.id;
  }

  function render(): void {
    const state = store.get();
    const mesh = activeMesh(state);

    if (mesh.id !== renderedMeshId) rebuildVertexList(mesh);
    if (document.activeElement !== meshColor) meshColor.value = vec3ToHex(mesh.meshColor);
    for (const [i, input] of vertexInputs.entries()) {
      if (document.activeElement !== input) input.value = vec3ToHex(mesh.vertexColors[i] ?? mesh.meshColor);
    }
    blendGroup.sync(state.blend);
  }

  store.subscribe(render);
  render();
}
