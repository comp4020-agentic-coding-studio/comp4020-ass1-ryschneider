/** A CPU-side mirror of an OpenGL vertex buffer (positions only) plus an element buffer (triangle-list indices). */
export interface Vertex2 {
  x: number;
  y: number;
}

export interface BufferState {
  vertices: readonly Vertex2[];
  /** Flat triangle-list indices: every three entries is one triangle, indexing into `vertices`. */
  indices: readonly number[];
}

export function createBufferState(): BufferState {
  return { vertices: [], indices: [] };
}

export function addVertex(state: BufferState, x: number, y: number): BufferState {
  return { ...state, vertices: [...state.vertices, { x, y }] };
}

/** Appends one triangle by referencing three existing vertex indices — this is what "fixed indexing" means for an EBO. */
export function addTriangle(state: BufferState, a: number, b: number, c: number): BufferState {
  for (const index of [a, b, c]) {
    if (index < 0 || index >= state.vertices.length) {
      throw new RangeError(`vertex index ${index} is out of range for a buffer of ${state.vertices.length} vertices`);
    }
  }
  return { ...state, indices: [...state.indices, a, b, c] };
}

export function triangleCount(state: BufferState): number {
  return Math.floor(state.indices.length / 3);
}

/** The stage-1 completion condition: the learner has assembled at least two triangles. */
export function isComplete(state: BufferState): boolean {
  return triangleCount(state) >= 2;
}
