import { describe, expect, it, vi } from "vitest";
import { setLogger } from "../../../src/errors/logger.js";
import { measureTime } from "../../../src/utils/system/performance.js";

describe("performance utils", () => {
  it("measureTime returns the result of the function", async () => {
    const result = await measureTime("test-fn", async () => {
      return "success";
    });
    expect(result).toBe("success");
  });

  it("measureTime logs duration", async () => {
    const debugMock = vi.fn();
    setLogger({
      debug: debugMock,
      info: () => {},
      warn: () => {},
      error: () => {},
    });

    await measureTime("test-fn", async () => {
      // Simulate work
      await new Promise((resolve) => setTimeout(resolve, 10));
    });

    expect(debugMock).toHaveBeenCalledWith(
      "test-fn completed",
      expect.objectContaining({
        operation: "performance_measure",
        data: expect.objectContaining({
          name: "test-fn",
          durationMs: expect.any(Number),
        }),
      }),
    );
  });
});
