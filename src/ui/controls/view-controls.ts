import { buildView } from "../../lib/raster/pipeline";
import { setViewParam } from "../../state/actions";
import type { Store } from "../../state/store";
import { mountMatrixView } from "../matrix-view";
import { bindRangeField } from "./range-field";

/**
 * Wires stage 3's orbit-camera sliders. Any interaction snaps `viewEngaged`
 * true (see actions.ts's setViewParam); before that, View stays the
 * identity matrix, since an orbit camera at azimuth/elevation/distance 0 is
 * degenerate (eye coincides with target).
 */
export function mountViewControls(root: ParentNode, store: Store): void {
  const azimuthInputEl = root.querySelector<HTMLInputElement>('[data-field="azimuthDeg"]');
  const elevationInputEl = root.querySelector<HTMLInputElement>('[data-field="elevationDeg"]');
  const distanceInputEl = root.querySelector<HTMLInputElement>('[data-field="distance"]');
  const indicatorEl = root.querySelector<HTMLElement>('[data-testid="view-engage-indicator"]');
  const matrixMount = root.querySelector<HTMLElement>('[data-mount="stage3-matrix"]');

  if (!azimuthInputEl || !elevationInputEl || !distanceInputEl || !indicatorEl) {
    throw new Error("view-controls: expected markup not found");
  }
  const azimuthInput: HTMLInputElement = azimuthInputEl;
  const elevationInput: HTMLInputElement = elevationInputEl;
  const distanceInput: HTMLInputElement = distanceInputEl;
  const indicator: HTMLElement = indicatorEl;

  const azimuthField = bindRangeField(azimuthInput, {
    hint: "Rotates the camera left/right around the target, like walking in a circle around it",
    formatValue: (v) => `${v}°`,
  });
  const elevationField = bindRangeField(elevationInput, {
    hint: "Tilts the camera up/down around the target — 0° is eye-level, 90° is looking straight down",
    formatValue: (v) => `${v}°`,
  });
  const distanceField = bindRangeField(distanceInput, {
    hint: "How far the camera sits from the target; together with azimuth/elevation this builds the View matrix",
    formatValue: (v) => v.toFixed(2),
  });

  azimuthInput.addEventListener("input", () => setViewParam(store, { azimuthDeg: Number(azimuthInput.value) }));
  elevationInput.addEventListener("input", () => setViewParam(store, { elevationDeg: Number(elevationInput.value) }));
  distanceInput.addEventListener("input", () => setViewParam(store, { distance: Number(distanceInput.value) }));

  function render(): void {
    const state = store.get();
    if (document.activeElement !== azimuthInput) azimuthInput.value = String(state.view.azimuthDeg);
    azimuthField.sync(state.view.azimuthDeg);
    if (document.activeElement !== elevationInput) elevationInput.value = String(state.view.elevationDeg);
    elevationField.sync(state.view.elevationDeg);
    if (document.activeElement !== distanceInput) distanceInput.value = String(state.view.distance);
    distanceField.sync(state.view.distance);
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
