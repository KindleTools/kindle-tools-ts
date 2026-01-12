import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  getLogger,
  type Logger,
  logError,
  logWarning,
  resetLogger,
  setLogger,
} from "#errors/logger.js";
import type { AppError } from "#errors/types.js";

describe("logger", () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;
  const originalEnv = process.env.NODE_ENV;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    process.env.NODE_ENV = "test";
  });

  afterEach(() => {
    vi.restoreAllMocks();
    process.env.NODE_ENV = originalEnv;
    resetLogger(); // Always restore default logger after each test
  });

  describe("logError", () => {
    it("should log error to console.error", () => {
      const error: AppError = {
        code: "IMPORT_PARSE_ERROR",
        message: "Test error",
      };

      logError(error);

      expect(consoleErrorSpy).toHaveBeenCalled();
      const callArgs = consoleErrorSpy.mock.calls[0];
      const logEntry = JSON.parse(callArgs[0]);

      expect(logEntry).toEqual(
        expect.objectContaining({
          level: "error",
          code: "IMPORT_PARSE_ERROR",
          message: "Test error",
        }),
      );
    });

    it("should include context", () => {
      const error: AppError = { code: "UNKNOWN", message: "err" };
      logError(error, { operation: "test", path: "/tmp" });

      const logEntry = JSON.parse(consoleErrorSpy.mock.calls[0][0]);
      expect(logEntry.operation).toBe("test");
      expect(logEntry.path).toBe("/tmp");
    });

    it("should include stack if available", () => {
      const cause = new Error("root cause");
      const error: AppError = { code: "UNKNOWN", message: "err", cause };

      logError(error);

      const logEntry = JSON.parse(consoleErrorSpy.mock.calls[0][0]);
      expect(logEntry.stack).toBeDefined();
    });

    it("should format nicely in development", () => {
      process.env.NODE_ENV = "development";
      const error: AppError = { code: "UNKNOWN", message: "dev" };

      logError(error);

      expect(consoleErrorSpy).toHaveBeenCalledWith("[ERROR]", expect.stringContaining("{\n"));
    });
  });

  describe("logWarning", () => {
    it("should log warning to console.warn", () => {
      logWarning("Test warning");

      expect(consoleWarnSpy).toHaveBeenCalled();
      // In test env (production-like default in this setup mostly unless mocked), it logs JSON string directly
      // But valid JSON parsing might depend on if [WARN] prefix is added.
      // In 'test' env, the code uses 'production' logic (else block) because strict check === 'development' fails.

      const logEntry = JSON.parse(consoleWarnSpy.mock.calls[0][0]);
      expect(logEntry).toEqual(
        expect.objectContaining({
          level: "warn",
          code: "WARNING",
          message: "Test warning",
        }),
      );
    });

    it("should format nicely in development", () => {
      process.env.NODE_ENV = "development";
      logWarning("Dev warn");

      expect(consoleWarnSpy).toHaveBeenCalledWith("[WARN]", expect.stringContaining("{\n"));
    });
  });

  describe("logger injection", () => {
    it("setLogger should replace the default logger", () => {
      const customError = vi.fn();
      const customWarn = vi.fn();
      const customLogger: Logger = {
        error: customError,
        warn: customWarn,
      };

      setLogger(customLogger);
      const error: AppError = { code: "TEST", message: "test" };
      logError(error);

      expect(customError).toHaveBeenCalledOnce();
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    it("setLogger should work for warnings too", () => {
      const customError = vi.fn();
      const customWarn = vi.fn();
      const customLogger: Logger = {
        error: customError,
        warn: customWarn,
      };

      setLogger(customLogger);
      logWarning("test warning");

      expect(customWarn).toHaveBeenCalledOnce();
      expect(consoleWarnSpy).not.toHaveBeenCalled();
    });

    it("resetLogger should restore the default logger", () => {
      const customLogger: Logger = {
        error: vi.fn(),
        warn: vi.fn(),
      };

      setLogger(customLogger);
      resetLogger();

      const error: AppError = { code: "TEST", message: "test" };
      logError(error);

      expect(customLogger.error).not.toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it("getLogger should return the current logger", () => {
      const customLogger: Logger = {
        error: vi.fn(),
        warn: vi.fn(),
      };

      const defaultLogger = getLogger();
      setLogger(customLogger);
      const currentLogger = getLogger();

      expect(currentLogger).toBe(customLogger);
      expect(currentLogger).not.toBe(defaultLogger);
    });

    it("custom logger should receive full ErrorLogEntry", () => {
      const customError = vi.fn();
      const customLogger: Logger = {
        error: customError,
        warn: vi.fn(),
      };

      setLogger(customLogger);
      const cause = new Error("root cause");
      const error: AppError = { code: "TEST_CODE", message: "test message", cause };
      logError(error, { operation: "import", path: "/tmp/file.txt", data: { extra: "info" } });

      expect(customError).toHaveBeenCalledWith(
        expect.objectContaining({
          level: "error",
          code: "TEST_CODE",
          message: "test message",
          operation: "import",
          path: "/tmp/file.txt",
          data: { extra: "info" },
          stack: expect.any(String),
        }),
      );
    });
  });
});
