/**
 * Derives a line-list index buffer from a triangle-list index buffer, for faking wireframe mode —
 * WebGL2 has no `glPolygonMode(GL_LINE)`, so wireframe is drawn as `gl.LINES` over these indices.
 * Edges shared between two triangles (e.g. two triangles glued along one side) are only emitted
 * once, so the shared edge isn't drawn twice as a visually doubled line.
 */
export function triangleIndicesToLineIndices(indices: readonly number[]): number[] {
  const seen = new Set<string>();
  const lines: number[] = [];

  for (let t = 0; t + 2 < indices.length; t += 3) {
    const a = indices[t];
    const b = indices[t + 1];
    const c = indices[t + 2];
    for (const [from, to] of [
      [a, b],
      [b, c],
      [c, a],
    ] as const) {
      const key = from < to ? `${from}:${to}` : `${to}:${from}`;
      if (seen.has(key)) continue;
      seen.add(key);
      lines.push(from, to);
    }
  }

  return lines;
}
