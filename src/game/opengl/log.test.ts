import { describe, expect, it, vi } from "vitest";
import { createCallLog } from "./log";

describe("createCallLog", () => {
  it("starts empty", () => {
    expect(createCallLog().entries).toEqual([]);
  });

  it("records messages in order with increasing ids", () => {
    const log = createCallLog();
    log.record("gl.bindBuffer(ARRAY_BUFFER, vbo)");
    log.record("gl.drawElements(TRIANGLES, 3, ...)");
    expect(log.entries.map((e) => e.message)).toEqual([
      "gl.bindBuffer(ARRAY_BUFFER, vbo)",
      "gl.drawElements(TRIANGLES, 3, ...)",
    ]);
    expect(log.entries[0].id).toBeLessThan(log.entries[1].id);
  });

  it("notifies subscribers on record and clear", () => {
    const log = createCallLog();
    const listener = vi.fn();
    const unsubscribe = log.subscribe(listener);

    log.record("gl.clear(COLOR_BUFFER_BIT)");
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenLastCalledWith(log.entries);

    log.clear();
    expect(listener).toHaveBeenCalledTimes(2);
    expect(log.entries).toEqual([]);

    unsubscribe();
    log.record("gl.drawArrays(...)");
    expect(listener).toHaveBeenCalledTimes(2);
  });
});
