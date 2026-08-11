import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { JSDOM } from "jsdom";
import { describe, expect, it } from "vitest";

// This checks the game shell's static scaffold in the BUILT page (dist/index.html) — the same
// contract invariants.test.ts checks against. Stage 1's actual buffer/index HUD content and its
// WebGL draw calls are built at runtime by src/game/stages/stage-01-triangle, which a static HTML
// read can't see; that runtime behaviour is only verified manually in a real browser (see
// PROCESS.md). This is a strictly narrower guarantee than the shading-toggle test it replaced —
// an accepted gap, not an oversight.
const dom = new JSDOM(readFileSync(resolve("dist/index.html"), "utf8"));
const doc = dom.window.document;

describe("stage-01-triangle: static game shell", () => {
  it("has a persistent WebGL canvas", () => {
    expect(doc.querySelector("#game-canvas")).toBeTruthy();
  });

  it("has a stage-progress nav landmark for the manager to populate", () => {
    const nav = doc.querySelector("nav.stage-progress");
    expect(nav).toBeTruthy();
    expect(nav?.getAttribute("aria-label")).toBeTruthy();
  });

  it("has a HUD region for the current stage's controls", () => {
    expect(doc.querySelector("#hud")).toBeTruthy();
  });

  it("has a next-stage button, hidden until a stage marks itself complete", () => {
    const button = doc.querySelector("#next-stage-button");
    expect(button).toBeTruthy();
    expect(button?.hasAttribute("hidden")).toBe(true);
  });

  it("titles the page as the rasterizer explainer", () => {
    expect(doc.querySelector("h1")?.textContent?.trim()).toBe("Rasterizer");
  });
});
