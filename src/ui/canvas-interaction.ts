import { setOrthoParam, setViewParam } from "../state/actions";
import type { Store } from "../state/store";

const AZIMUTH_DEG_PER_FULL_WIDTH = 360;
const ELEVATION_DEG_PER_FULL_HEIGHT = 180;
const ZOOM_SENSITIVITY = 0.001;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Wraps azimuth cyclically into [-180, 180) -- orbiting past the seam continues, it doesn't clamp. */
function wrapAzimuth(deg: number): number {
  return (((deg + 180) % 360) + 360) % 360 - 180;
}

/** Pure orbit math for a canvas drag: `dxFraction`/`dyFraction` are the drag delta as a fraction of the canvas's width/height. */
export function dragToOrbit(
  dxFraction: number,
  dyFraction: number,
  azimuthDeg: number,
  elevationDeg: number,
): { azimuthDeg: number; elevationDeg: number } {
  return {
    azimuthDeg: wrapAzimuth(azimuthDeg + dxFraction * AZIMUTH_DEG_PER_FULL_WIDTH),
    elevationDeg: clamp(elevationDeg - dyFraction * ELEVATION_DEG_PER_FULL_HEIGHT, -89, 89),
  };
}

/** Scroll-to-zoom for the orthographic half-height (matches index.html's halfHeight slider bounds). Positive deltaY (scroll down) zooms out. */
export function scrollZoomOrthographic(deltaY: number, halfHeight: number): number {
  return clamp(halfHeight * Math.exp(deltaY * ZOOM_SENSITIVITY), 0.05, 5);
}

/** Scroll-to-zoom for the perspective camera distance (matches index.html's distance slider bounds). Positive deltaY (scroll down) zooms out. */
export function scrollZoomPerspective(deltaY: number, distance: number): number {
  return clamp(distance * Math.exp(deltaY * ZOOM_SENSITIVITY), 0.25, 15);
}

/**
 * Wires drag-to-rotate and scroll-to-zoom on the scene canvas, each gated on
 * its own `state.controls` checkbox. Reuses `setViewParam`/`setOrthoParam` --
 * the same actions the stage 3/2 sliders call -- so dragging/scrolling
 * "engages" the view exactly like manual slider input already does.
 */
export function mountCanvasInteraction(canvas: HTMLCanvasElement, store: Store): void {
  let dragging = false;
  let lastX = 0;
  let lastY = 0;

  canvas.addEventListener("pointerdown", (event) => {
    if (!store.get().controls.dragToRotate) return;
    dragging = true;
    lastX = event.clientX;
    lastY = event.clientY;
    canvas.setPointerCapture(event.pointerId);
  });

  canvas.addEventListener("pointermove", (event) => {
    if (!dragging) return;
    const rect = canvas.getBoundingClientRect();
    const dxFraction = (event.clientX - lastX) / rect.width;
    const dyFraction = (event.clientY - lastY) / rect.height;
    lastX = event.clientX;
    lastY = event.clientY;

    const state = store.get();
    setViewParam(store, dragToOrbit(dxFraction, dyFraction, state.view.azimuthDeg, state.view.elevationDeg));
  });

  canvas.addEventListener("pointerup", (event) => {
    if (!dragging) return;
    dragging = false;
    canvas.releasePointerCapture(event.pointerId);
  });

  canvas.addEventListener(
    "wheel",
    (event) => {
      if (!store.get().controls.scrollToZoom) return;
      event.preventDefault();

      const state = store.get();
      if (state.projectionKind === "perspective") {
        setViewParam(store, { distance: scrollZoomPerspective(event.deltaY, state.view.distance) });
      } else {
        setOrthoParam(store, { halfHeight: scrollZoomOrthographic(event.deltaY, state.orthographic.halfHeight) });
      }
    },
    { passive: false },
  );
}
