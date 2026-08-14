import { describe, expect, it } from "vitest";
import { clear, createFramebuffer } from "./framebuffer";

describe("createFramebuffer", () => {
  it("allocates a color buffer of width * height * 4 bytes and a depth buffer of width * height floats", () => {
    const fb = createFramebuffer(4, 3);
    expect(fb.color.length).toBe(4 * 3 * 4);
    expect(fb.depth.length).toBe(4 * 3);
  });
});

describe("clear", () => {
  it("fills every pixel with the background color and full alpha, and resets depth to +Infinity", () => {
    const fb = createFramebuffer(2, 2);
    clear(fb, [10, 20, 30]);

    for (let i = 0; i < 4; i++) {
      expect(fb.color[i * 4]).toBe(10);
      expect(fb.color[i * 4 + 1]).toBe(20);
      expect(fb.color[i * 4 + 2]).toBe(30);
      expect(fb.color[i * 4 + 3]).toBe(255);
      expect(fb.depth[i]).toBe(Infinity);
    }
  });
});
