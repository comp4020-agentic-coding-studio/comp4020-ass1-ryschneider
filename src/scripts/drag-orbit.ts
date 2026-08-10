export interface OrbitAngles {
  azimuth: number;
  elevation: number;
}

const ELEVATION_LIMIT = (Math.PI / 2) * 0.95;

/**
 * Lets the visitor drag (mouse) or touch-drag across a canvas to orbit a camera directly, instead
 * of only moving sliders. Elevation is clamped short of the poles to avoid a gimbal flip.
 */
export function bindDragOrbit(
  canvas: HTMLCanvasElement,
  get: () => OrbitAngles,
  set: (angles: OrbitAngles) => void,
  onChange: () => void,
): void {
  let dragging = false;
  let lastX = 0;
  let lastY = 0;

  canvas.style.touchAction = "none";
  canvas.style.cursor = "grab";

  canvas.addEventListener("pointerdown", (event) => {
    dragging = true;
    lastX = event.clientX;
    lastY = event.clientY;
    canvas.setPointerCapture(event.pointerId);
    canvas.style.cursor = "grabbing";
  });

  canvas.addEventListener("pointermove", (event) => {
    if (!dragging) return;
    const dx = event.clientX - lastX;
    const dy = event.clientY - lastY;
    lastX = event.clientX;
    lastY = event.clientY;

    const current = get();
    const azimuth = current.azimuth - dx * 0.01;
    const elevation = Math.max(-ELEVATION_LIMIT, Math.min(ELEVATION_LIMIT, current.elevation + dy * 0.01));
    set({ azimuth, elevation });
    onChange();
  });

  const stopDragging = (): void => {
    dragging = false;
    canvas.style.cursor = "grab";
  };

  canvas.addEventListener("pointerup", stopDragging);
  canvas.addEventListener("pointercancel", stopDragging);
  canvas.addEventListener("pointerleave", stopDragging);
}
