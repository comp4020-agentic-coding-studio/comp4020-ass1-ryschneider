/**
 * Resets every piece of context-global GL state a stage might have left dirty, so stages sharing
 * one WebGL2 context don't leak state into each other across a transition. Owned by the stage
 * manager, called between every stage's `dispose()` and the next stage's `mount()`.
 *
 * GPU-touching — no unit test; verified manually in-browser alongside the stages that use it.
 */
export function resetToDefaults(gl: WebGL2RenderingContext): void {
  gl.useProgram(null);
  gl.bindVertexArray(null);
  gl.bindBuffer(gl.ARRAY_BUFFER, null);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);

  gl.disable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ZERO);

  gl.disable(gl.DEPTH_TEST);
  gl.depthFunc(gl.LESS);
  gl.depthMask(true);

  gl.disable(gl.CULL_FACE);
  gl.cullFace(gl.BACK);
  gl.frontFace(gl.CCW);

  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);

  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, null);

  gl.clearColor(0, 0, 0, 0);
}
