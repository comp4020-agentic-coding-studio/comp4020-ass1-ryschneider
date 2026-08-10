export interface Loop {
  start(): void;
  stop(): void;
}

/** Wraps requestAnimationFrame, throttled to `fps`, so idle stages don't burn a full 60fps loop. */
export function createLoop(callback: (dtSeconds: number) => void, fps = 30): Loop {
  const interval = 1000 / fps;
  let rafId: number | null = null;
  let lastFrameTime: number | null = null;

  function frame(time: number): void {
    if (lastFrameTime === null || time - lastFrameTime >= interval) {
      const dt = lastFrameTime === null ? 0 : (time - lastFrameTime) / 1000;
      lastFrameTime = time;
      callback(dt);
    }
    rafId = requestAnimationFrame(frame);
  }

  return {
    start() {
      if (rafId !== null) return;
      lastFrameTime = null;
      rafId = requestAnimationFrame(frame);
    },
    stop() {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
    },
  };
}

export function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export interface StageElements {
  section: HTMLElement;
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
}

/** Looks up a stage's section/canvas/2D context by its `data-stage` id. Null if any piece is missing. */
export function getStageElements(stageId: string): StageElements | null {
  const section = document.querySelector<HTMLElement>(`[data-stage="${stageId}"]`);
  const canvas = section?.querySelector<HTMLCanvasElement>("[data-canvas]") ?? null;
  const ctx = canvas?.getContext("2d") ?? null;
  if (!section || !canvas || !ctx) return null;
  return { section, canvas, ctx };
}

/** Reads a <input type=range> as a number, returning `fallback` if the element is missing. */
export function readRange(id: string, fallback: number): number {
  const el = document.getElementById(id);
  if (!(el instanceof HTMLInputElement)) return fallback;
  const value = Number.parseFloat(el.value);
  return Number.isNaN(value) ? fallback : value;
}

/** Wires a range input to also update its paired <output>, and calls `onInput` on every change. */
export function bindRange(id: string, onInput: (value: number) => void): void {
  const input = document.getElementById(id);
  const output = document.getElementById(`${id}-output`);
  if (!(input instanceof HTMLInputElement)) return;

  const unit = input.dataset.unit ?? "";

  const apply = () => {
    const value = Number.parseFloat(input.value);
    if (output) output.textContent = `${input.value}${unit}`;
    onInput(value);
  };

  input.addEventListener("input", apply);
  apply();
}

/** Wires a toggle button (aria-pressed) and calls `onToggle` with the new pressed state on every click. */
export function bindToggle(id: string, onToggle: (pressed: boolean) => void): void {
  const button = document.getElementById(id);
  if (!(button instanceof HTMLButtonElement)) return;

  const onLabel = button.dataset.onLabel ?? button.textContent ?? "";
  const offLabel = button.dataset.offLabel ?? button.textContent ?? "";

  const apply = (pressed: boolean) => {
    button.setAttribute("aria-pressed", pressed ? "true" : "false");
    button.textContent = pressed ? onLabel : offLabel;
    onToggle(pressed);
  };

  button.addEventListener("click", () => {
    apply(button.getAttribute("aria-pressed") !== "true");
  });

  onToggle(button.getAttribute("aria-pressed") === "true");
}
