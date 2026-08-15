import type { Store } from "../state/store";

export interface CanvasHost {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
}

/**
 * Owns the canvas element: keeps its backing-store resolution in device
 * pixels (crisp on high-DPI screens) while CSS controls the display size,
 * and keeps `state.aspectRatio` synced to the canvas's own width/height
 * ratio on every resize (including on a phone viewport, or a resize
 * mid-interaction). The normalized 0..1 orthographic box (`halfHeight:
 * 0.5`, centered at (0.5, 0.5)) is canvas-matched by construction at any
 * resolution once corrected for `aspectRatio`, so unlike the old
 * screen-pixel-scale convention, no other scene value needs resize-time
 * mutation to stay in sync.
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

    store.update((state) => ({ ...state, aspectRatio: width / height }));
  }

  resize();
  new ResizeObserver(resize).observe(canvas);
  window.addEventListener("orientationchange", resize);

  return { canvas, ctx };
}
