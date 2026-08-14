export interface Framebuffer {
  width: number;
  height: number;
  /** RGBA, 4 bytes per pixel, row-major from the top-left. */
  color: Uint8ClampedArray;
  /** NDC-space depth per pixel; smaller is nearer. Cleared to +Infinity. */
  depth: Float32Array;
}

export function createFramebuffer(width: number, height: number): Framebuffer {
  return {
    width,
    height,
    color: new Uint8ClampedArray(width * height * 4),
    depth: new Float32Array(width * height),
  };
}

export function clear(fb: Framebuffer, background: readonly [number, number, number]): void {
  const [r, g, b] = background;
  for (let i = 0; i < fb.width * fb.height; i++) {
    fb.color[i * 4] = r;
    fb.color[i * 4 + 1] = g;
    fb.color[i * 4 + 2] = b;
    fb.color[i * 4 + 3] = 255;
    fb.depth[i] = Infinity;
  }
}

/** The one DOM-touching function in the raster library: blits a framebuffer onto a 2D canvas. */
export function blitToCanvas(fb: Framebuffer, ctx: CanvasRenderingContext2D): void {
  const imageData = new ImageData(new Uint8ClampedArray(fb.color), fb.width, fb.height);
  ctx.putImageData(imageData, 0, 0);
}
