import { buildProjection } from "../../lib/raster/pipeline";
import {
  loadPerspectiveExample,
  resetProjection,
  setDragToRotate,
  setOrthoParam,
  setPerspectiveParam,
  setProjectionKind,
  setScrollToZoom,
} from "../../state/actions";
import type { ProjectionKind } from "../../state/scene";
import type { Store } from "../../state/store";
import { mountMatrixView } from "../matrix-view";
import { mountButtonGroup } from "./button-group";
import { bindRangeField } from "./range-field";

/** Wires stage 2's projection controls (kind toggle, fov/near/far/halfHeight, reset, preset, canvas-interaction toggles) and its matrix-view mount. */
export function mountProjectionControls(root: ParentNode, store: Store): void {
  const kindGroup = mountButtonGroup<ProjectionKind>(root, '[data-group="projection-kind"]', (value) =>
    setProjectionKind(store, value),
  );
  const fovInputEl = root.querySelector<HTMLInputElement>('[data-field="fovYDeg"]');
  const nearInputEl = root.querySelector<HTMLInputElement>('[data-field="near"]');
  const farInputEl = root.querySelector<HTMLInputElement>('[data-field="far"]');
  const halfHeightInputEl = root.querySelector<HTMLInputElement>('[data-field="halfHeight"]');
  const resetButton = root.querySelector<HTMLButtonElement>('[data-action="reset-projection"]');
  const presetButton = root.querySelector<HTMLButtonElement>('[data-action="load-perspective-example"]');
  const dragToRotateInputEl = root.querySelector<HTMLInputElement>('[data-field="drag-to-rotate"]');
  const scrollToZoomInputEl = root.querySelector<HTMLInputElement>('[data-field="scroll-to-zoom"]');
  const matrixMount = root.querySelector<HTMLElement>('[data-mount="stage2-matrix"]');

  if (
    !fovInputEl ||
    !nearInputEl ||
    !farInputEl ||
    !halfHeightInputEl ||
    !resetButton ||
    !presetButton ||
    !dragToRotateInputEl ||
    !scrollToZoomInputEl
  ) {
    throw new Error("projection-controls: expected markup not found");
  }
  const fovInput: HTMLInputElement = fovInputEl;
  const nearInput: HTMLInputElement = nearInputEl;
  const farInput: HTMLInputElement = farInputEl;
  const halfHeightInput: HTMLInputElement = halfHeightInputEl;
  const dragToRotateInput: HTMLInputElement = dragToRotateInputEl;
  const scrollToZoomInput: HTMLInputElement = scrollToZoomInputEl;

  const fovField = bindRangeField(fovInput, { hint: "Vertical field of view", formatValue: (v) => `${v}°` });
  const nearField = bindRangeField(nearInput, { hint: "Near clip plane distance", formatValue: (v) => v.toFixed(3) });
  const farField = bindRangeField(farInput, { hint: "Far clip plane distance", formatValue: (v) => v.toFixed(1) });
  const halfHeightField = bindRangeField(halfHeightInput, {
    hint: "Half-height of the orthographic view box",
    formatValue: (v) => v.toFixed(2),
  });

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

  dragToRotateInput.addEventListener("change", () => setDragToRotate(store, dragToRotateInput.checked));
  scrollToZoomInput.addEventListener("change", () => setScrollToZoom(store, scrollToZoomInput.checked));

  function render(): void {
    const state = store.get();
    kindGroup.sync(state.projectionKind);
    dragToRotateInput.checked = state.controls.dragToRotate;
    scrollToZoomInput.checked = state.controls.scrollToZoom;

    fovInput.value = String(state.perspective.fovYDeg);
    fovField.sync(state.perspective.fovYDeg);
    halfHeightInput.value = String(state.orthographic.halfHeight);
    halfHeightField.sync(state.orthographic.halfHeight);
    if (document.activeElement !== nearInput) {
      const near = state.projectionKind === "perspective" ? state.perspective.near : state.orthographic.near;
      nearInput.value = String(near);
      nearField.sync(near);
    }
    if (document.activeElement !== farInput) {
      const far = state.projectionKind === "perspective" ? state.perspective.far : state.orthographic.far;
      farInput.value = String(far);
      farField.sync(far);
    }
  }

  store.subscribe(render);
  render();

  if (matrixMount) {
    mountMatrixView(matrixMount, store, () => buildProjection(store.get()), "Projection matrix");
  }
}
