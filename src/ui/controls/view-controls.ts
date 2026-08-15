import { buildView } from "../../lib/raster/pipeline";
import { setDragToRotate, setViewParam } from "../../state/actions";
import type { Store } from "../../state/store";
import { mountMatrixView } from "../matrix-view";
import { bindRangeField } from "./range-field";

/**
 * Wires stage 3's orbit-camera sliders. Any interaction snaps `viewEngaged`
 * true (see actions.ts's setViewParam); before that, View stays the
 * identity matrix, since an orbit camera at yaw/pitch/distance 0 is
 * degenerate (eye coincides with target).
 */
export function mountViewControls(root: ParentNode, store: Store): void {
  const yawInputEl = root.querySelector<HTMLInputElement>('[data-field="yawDeg"]');
  const pitchInputEl = root.querySelector<HTMLInputElement>('[data-field="pitchDeg"]');
  const distanceInputEl = root.querySelector<HTMLInputElement>('[data-field="distance"]');
  const dragToRotateInputEl = root.querySelector<HTMLInputElement>('[data-field="drag-to-rotate"]');
  const indicatorEl = root.querySelector<HTMLElement>('[data-testid="view-engage-indicator"]');
  const matrixMount = root.querySelector<HTMLElement>('[data-mount="stage3-matrix"]');

  if (!yawInputEl || !pitchInputEl || !distanceInputEl || !dragToRotateInputEl || !indicatorEl) {
    throw new Error("view-controls: expected markup not found");
  }
  const yawInput: HTMLInputElement = yawInputEl;
  const pitchInput: HTMLInputElement = pitchInputEl;
  const distanceInput: HTMLInputElement = distanceInputEl;
  const dragToRotateInput: HTMLInputElement = dragToRotateInputEl;
  const indicator: HTMLElement = indicatorEl;

  const yawField = bindRangeField(yawInput, {
    hint: "Rotates the camera left/right around the target, like walking in a circle around it",
    formatValue: (v) => `${v}°`,
  });
  const pitchField = bindRangeField(pitchInput, {
    hint: "Tilts the camera up/down around the target — 0° is eye-level, 90° is looking straight down",
    formatValue: (v) => `${v}°`,
  });
  const distanceField = bindRangeField(distanceInput, {
    hint: "How far the camera sits from the target; together with yaw/pitch this builds the View matrix",
    formatValue: (v) => v.toFixed(2),
  });

  yawInput.addEventListener("input", () => setViewParam(store, { yawDeg: Number(yawInput.value) }));
  pitchInput.addEventListener("input", () => setViewParam(store, { pitchDeg: Number(pitchInput.value) }));
  distanceInput.addEventListener("input", () => setViewParam(store, { distance: Number(distanceInput.value) }));
  dragToRotateInput.addEventListener("change", () => setDragToRotate(store, dragToRotateInput.checked));

  function render(): void {
    const state = store.get();
    if (document.activeElement !== yawInput) yawInput.value = String(state.view.yawDeg);
    yawField.sync(state.view.yawDeg);
    if (document.activeElement !== pitchInput) pitchInput.value = String(state.view.pitchDeg);
    pitchField.sync(state.view.pitchDeg);
    if (document.activeElement !== distanceInput) distanceInput.value = String(state.view.distance);
    distanceField.sync(state.view.distance);
    dragToRotateInput.checked = state.controls.dragToRotate;
    indicator.textContent = state.viewEngaged
      ? "Camera: engaged (orbiting the origin)"
      : "Camera: not yet engaged (identity view)";
  }

  store.subscribe(render);
  render();

  if (matrixMount) {
    mountMatrixView(matrixMount, store, () => buildView(store.get()), "View matrix");
  }
}
