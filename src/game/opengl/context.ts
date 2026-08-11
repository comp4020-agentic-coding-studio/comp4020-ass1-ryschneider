/** Creates the one shared WebGL2 context every stage mounts into — browsers cap live contexts, so this runs once, not per-stage. */
export function createGLContext(canvas: HTMLCanvasElement): WebGL2RenderingContext {
  const gl = canvas.getContext("webgl2");
  if (!gl) {
    throw new Error("WebGL2 is not available in this browser");
  }
  return gl;
}
