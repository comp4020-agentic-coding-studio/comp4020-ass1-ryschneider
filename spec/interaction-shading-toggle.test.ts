import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { JSDOM } from "jsdom";
import { describe, expect, it } from "vitest";

// This checks the flagship interaction is present and accessible in the
// built markup: the Gouraud/Phong toggle for the shading stage. The other
// half of the claim — that flipping it actually changes the rendered
// pixels — is proven at the code level in src/lib/raster/pipeline.test.ts,
// since jsdom has no real CanvasRenderingContext2D to render into here.
const doc = new JSDOM(readFileSync(resolve("dist/index.html"), "utf8")).window.document;

describe("interaction: shading mode toggle", () => {
  it("lives inside the shading stage section", () => {
    const shadingStage = doc.querySelector('[data-stage="shading"]');
    expect(shadingStage).toBeTruthy();
    expect(shadingStage?.querySelector("#shading-mode-toggle")).toBeTruthy();
  });

  it("is a real toggle button with an accessible pressed state", () => {
    const toggle = doc.querySelector("#shading-mode-toggle");
    expect(toggle?.tagName).toBe("BUTTON");
    expect(toggle?.hasAttribute("aria-pressed")).toBe(true);
    expect(["true", "false"]).toContain(toggle?.getAttribute("aria-pressed"));
  });

  it("labels both shading modes so the state change is legible", () => {
    const toggle = doc.querySelector("#shading-mode-toggle") as HTMLElement | null;
    expect(toggle?.dataset.onLabel).toMatch(/phong/i);
    expect(toggle?.dataset.offLabel).toMatch(/gouraud/i);
  });
});
