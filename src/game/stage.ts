import type { CallLog } from "./opengl/log";

/** Everything a stage needs to mount itself: the shared GL context, its canvas, and a place to render its HUD panel. */
export interface StageContext {
  gl: WebGL2RenderingContext;
  canvas: HTMLCanvasElement;
  /** Container the stage should render its semi-transparent GUI panel into. Cleared by the manager before each mount. */
  hud: HTMLElement;
  /** Shared "OpenGL calls" log — call `log.record(...)` right after each real `gl.*` call the stage issues. */
  log: CallLog;
  /** The stage calls this whenever its own completion condition changes, to show/hide the "Next Stage" button. */
  setComplete(complete: boolean): void;
}

export interface StageDefinition {
  id: string;
  title: string;
  /** Build the stage's scene + HUD into `ctx`. Returns a cleanup function that frees everything the stage created. */
  mount(ctx: StageContext): () => void;
}
