import { buildView } from "../../lib/raster/pipeline";
import { setViewParam } from "../../state/actions";
import type { Store } from "../../state/store";
import { mountMatrixView } from "../matrix-view";

/**
 * Wires stage 3's orbit-camera sliders. Any interaction snaps `viewEngaged`
 * true (see actions.ts's setViewParam) — before that, View stays the
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

  azimuthInput.addEventListener("input", () => setViewParam(store, { azimuthDeg: Number(azimuthInput.value) }));
  elevationInput.addEventListener("input", () => setViewParam(store, { elevationDeg: Number(elevationInput.value) }));
  distanceInput.addEventListener("input", () => setViewParam(store, { distance: Number(distanceInput.value) }));

  function render(): void {
    const state = store.get();
    if (document.activeElement !== azimuthInput) azimuthInput.value = String(state.view.azimuthDeg);
    if (document.activeElement !== elevationInput) elevationInput.value = String(state.view.elevationDeg);
    if (document.activeElement !== distanceInput) distanceInput.value = String(state.view.distance);
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
