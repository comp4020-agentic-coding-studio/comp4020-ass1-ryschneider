import { blitToCanvas, createFramebuffer } from "../lib/raster/framebuffer";
import { renderScene } from "../lib/raster/pipeline";
import type { Store } from "../state/store";
import type { CanvasHost } from "./canvas-host";

/** Subscribes to the store and redraws the whole scene on every change. */
export function mountRenderLoop(host: CanvasHost, store: Store): void {
  function draw(): void {
    const { canvas, ctx } = host;
    const fb = createFramebuffer(canvas.width, canvas.height);
    renderScene(store.get(), fb);
    blitToCanvas(fb, ctx);
  }

  store.subscribe(draw);
  new ResizeObserver(draw).observe(host.canvas);
  draw();
}
