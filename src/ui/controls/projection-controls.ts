import { buildProjection } from "../../lib/raster/pipeline";
import { loadPerspectiveExample, resetProjection, setOrthoParam, setPerspectiveParam, setProjectionKind } from "../../state/actions";
import type { ProjectionKind } from "../../state/scene";
import type { Store } from "../../state/store";
import { mountMatrixView } from "../matrix-view";
import type { CanvasHost } from "../canvas-host";

/** Wires stage 2's projection controls (kind toggle, fov/near/far/halfHeight, reset, preset) and its matrix-view mount. */
export function mountProjectionControls(root: ParentNode, store: Store, host: CanvasHost): void {
  const kindInputs = Array.from(root.querySelectorAll<HTMLInputElement>('input[name="projection-kind"]'));
  const fovInputEl = root.querySelector<HTMLInputElement>('[data-field="fovYDeg"]');
  const nearInputEl = root.querySelector<HTMLInputElement>('[data-field="near"]');
  const farInputEl = root.querySelector<HTMLInputElement>('[data-field="far"]');
  const halfHeightInputEl = root.querySelector<HTMLInputElement>('[data-field="halfHeight"]');
  const resetButton = root.querySelector<HTMLButtonElement>('[data-action="reset-projection"]');
  const presetButton = root.querySelector<HTMLButtonElement>('[data-action="load-perspective-example"]');
  const matrixMount = root.querySelector<HTMLElement>('[data-mount="stage2-matrix"]');

  if (!fovInputEl || !nearInputEl || !farInputEl || !halfHeightInputEl || !resetButton || !presetButton) {
    throw new Error("projection-controls: expected markup not found");
  }
  const fovInput: HTMLInputElement = fovInputEl;
  const nearInput: HTMLInputElement = nearInputEl;
  const farInput: HTMLInputElement = farInputEl;
  const halfHeightInput: HTMLInputElement = halfHeightInputEl;

  for (const input of kindInputs) {
    input.addEventListener("change", () => {
      if (input.checked) setProjectionKind(store, input.value as ProjectionKind);
    });
  }

  fovInput.addEventListener("input", () => setPerspectiveParam(store, { fovYDeg: Number(fovInput.value) }));

  nearInput.addEventListener("input", () => {
    const near = Number(nearInput.value);
    if (store.get().projectionKind === "perspective") setPerspectiveParam(store, { near });
    else setOrthoParam(store, { near });
  });

  farInput.addEventListener("input", () => {
    const far = Number(farInput.value);
    if (store.get().projectionKind === "perspective") setPerspectiveParam(store, { far });
    else setOrthoParam(store, { far });
  });

  halfHeightInput.addEventListener("input", () => setOrthoParam(store, { halfHeight: Number(halfHeightInput.value) }));

  resetButton.addEventListener("click", () => resetProjection(store));
  presetButton.addEventListener("click", () => loadPerspectiveExample(store));

  function render(): void {
    const state = store.get();
    for (const input of kindInputs) input.checked = input.value === state.projectionKind;

    fovInput.value = String(state.perspective.fovYDeg);
    halfHeightInput.value = String(state.orthographic.halfHeight);
    if (document.activeElement !== nearInput) {
      nearInput.value = String(state.projectionKind === "perspective" ? state.perspective.near : state.orthographic.near);
    }
    if (document.activeElement !== farInput) {
      farInput.value = String(state.projectionKind === "perspective" ? state.perspective.far : state.orthographic.far);
    }
  }

  store.subscribe(render);
  render();

  if (matrixMount) {
    mountMatrixView(matrixMount, store, () => buildProjection(store.get(), host.canvas.width, host.canvas.height), "Projection matrix");
  }
}
