import type { Store } from "../state/store";

export interface CanvasHost {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
}

/**
 * Owns the canvas element: keeps its backing-store resolution in device
 * pixels (crisp on high-DPI screens) while CSS controls the display size,
 * and — as long as `state.orthographic.autoFit` hasn't been switched off by
 * a manual stage-2 edit — keeps `orthographic.halfHeight` synced to half the
 * canvas's CSS height, so the default projection stays the exact
 * screen-space passthrough as the canvas resizes (including on a phone
 * viewport, or a resize mid-interaction).
 */
export function mountCanvasHost(canvas: HTMLCanvasElement, store: Store): CanvasHost {
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas-host: 2D rendering context unavailable");

  function resize(): void {
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const width = Math.max(1, Math.round(rect.width * dpr));
    const height = Math.max(1, Math.round(rect.height * dpr));

    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }

    if (store.get().orthographic.autoFit) {
      store.update((state) => ({
        ...state,
        orthographic: { ...state.orthographic, halfHeight: height / 2 },
      }));
    }
  }

  resize();
  new ResizeObserver(resize).observe(canvas);
  window.addEventListener("orientationchange", resize);

  return { canvas, ctx };
}
