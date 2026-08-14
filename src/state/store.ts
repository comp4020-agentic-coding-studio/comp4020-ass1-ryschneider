import type { SceneState } from "./scene";
import { createInitialState } from "./scene";

export type Listener = (state: SceneState) => void;

export interface Store {
  get(): SceneState;
  /** Replaces the whole state (callers pass a shallow-copied object). Notifies listeners synchronously. */
  set(next: SceneState): void;
  /** Convenience for `set({ ...get(), ...patch })`. */
  update(patch: (state: SceneState) => SceneState): void;
  subscribe(listener: Listener): () => void;
}

export function createStore(initial: SceneState = createInitialState()): Store {
  let state = initial;
  const listeners = new Set<Listener>();

  function notify(): void {
    for (const listener of listeners) listener(state);
  }

  return {
    get() {
      return state;
    },
    set(next) {
      state = next;
      notify();
    },
    update(patch) {
      state = patch(state);
      notify();
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
