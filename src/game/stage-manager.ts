import { createGLContext } from "./opengl/context";
import { resetToDefaults } from "./opengl/gl-state";
import { createCallLog } from "./opengl/log";
import type { StageDefinition } from "./stage";

export interface StageManagerElements {
  canvas: HTMLCanvasElement;
  nav: HTMLElement;
  hud: HTMLElement;
  nextButton: HTMLButtonElement;
}

export interface StageManager {
  start(): void;
}

export function createStageManager(elements: StageManagerElements, stages: readonly StageDefinition[]): StageManager {
  const { canvas, nav, hud, nextButton } = elements;
  const gl = createGLContext(canvas);
  const log = createCallLog();

  let currentIndex = 0;
  let disposeCurrent: (() => void) | null = null;

  function setViewport(): void {
    const width = canvas.clientWidth * window.devicePixelRatio;
    const height = canvas.clientHeight * window.devicePixelRatio;
    if (canvas.width !== width) canvas.width = width;
    if (canvas.height !== height) canvas.height = height;
    gl.viewport(0, 0, canvas.width, canvas.height);
  }

  function renderNavPips(): void {
    nav.replaceChildren();
    stages.forEach((stage, index) => {
      const pip = document.createElement("button");
      pip.type = "button";
      pip.className = "stage-pip";
      pip.textContent = String(index + 1);
      pip.setAttribute("aria-label", stage.title);
      pip.disabled = index > currentIndex;
      if (index === currentIndex) pip.setAttribute("aria-current", "step");
      pip.addEventListener("click", () => goTo(index));
      nav.append(pip);
    });
  }

  function renderPanel(className: string, heading: string, body: string): void {
    hud.replaceChildren();
    const panel = document.createElement("div");
    panel.className = className;

    const h2 = document.createElement("h2");
    h2.textContent = heading;
    const p = document.createElement("p");
    p.textContent = body;

    panel.append(h2, p);
    hud.append(panel);
  }

  function renderComingSoon(): void {
    renderPanel("hud-panel", `Stage ${currentIndex + 1}`, "Coming soon.");
  }

  function renderStageError(error: unknown): void {
    const message = error instanceof Error ? error.message : String(error);
    renderPanel("hud-panel hud-panel-error", "Stage failed to load", message);
  }

  function mountCurrent(): void {
    resetToDefaults(gl);
    setViewport();
    log.clear();
    hud.replaceChildren();
    nextButton.hidden = true;

    const stage = stages[currentIndex];
    if (!stage) {
      renderComingSoon();
      return;
    }

    try {
      disposeCurrent = stage.mount({
        gl,
        canvas,
        hud,
        log,
        setComplete(complete) {
          nextButton.hidden = !complete;
        },
      });
    } catch (error) {
      console.error(`stage "${stage.id}" failed to mount`, error);
      renderStageError(error);
    }
  }

  function goTo(index: number): void {
    if (index === currentIndex) return;
    if (disposeCurrent) {
      try {
        disposeCurrent();
      } catch (error) {
        console.error(`stage "${stages[currentIndex]?.id}" failed to dispose`, error);
      }
      disposeCurrent = null;
    }
    currentIndex = index;
    renderNavPips();
    mountCurrent();
  }

  nextButton.addEventListener("click", () => {
    goTo(Math.min(currentIndex + 1, stages.length));
  });

  window.addEventListener("resize", setViewport);

  canvas.addEventListener("webglcontextlost", (event) => {
    event.preventDefault();
  });
  canvas.addEventListener("webglcontextrestored", () => {
    mountCurrent();
  });

  return {
    start() {
      renderNavPips();
      mountCurrent();
    },
  };
}
