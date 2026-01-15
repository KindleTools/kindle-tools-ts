import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  getLogger,
  type Logger,
  logDebug,
  logError,
  logInfo,
  logWarning,
  nullLogger,
  resetLogger,
  setLogger,
} from "#errors/logger.js";
import type { AppError } from "#errors/types.js";

describe("logger", () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;
  let consoleInfoSpy: ReturnType<typeof vi.spyOn>;
  let consoleDebugSpy: ReturnType<typeof vi.spyOn>;
  const originalEnv = process.env.NODE_ENV;
  const originalDebug = process.env.DEBUG;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    consoleInfoSpy = vi.spyOn(console, "info").mockImplementation(() => {});
    consoleDebugSpy = vi.spyOn(console, "debug").mockImplementation(() => {});
    process.env.NODE_ENV = "test";
    delete process.env.DEBUG;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    process.env.NODE_ENV = originalEnv;
    process.env.DEBUG = originalDebug;
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

  describe("logInfo", () => {
    it("should log info to console.info", () => {
      logInfo("Test info");
      expect(consoleInfoSpy).toHaveBeenCalledWith("[INFO]", "Test info", "");
    });

    it("should include context", () => {
      logInfo("Test info", { user: "me" });
      expect(consoleInfoSpy).toHaveBeenCalledWith(
        "[INFO]",
        "Test info",
        JSON.stringify({ user: "me" }),
      );
    });
  });

  describe("logDebug", () => {
    it("should NOT log debug in test/production by default", () => {
      logDebug("Test debug");
      expect(consoleDebugSpy).not.toHaveBeenCalled();
    });

    it("should log debug in development", () => {
      process.env.NODE_ENV = "development";
      logDebug("Test debug");
      expect(consoleDebugSpy).toHaveBeenCalledWith("[DEBUG]", "Test debug", "");
    });

    it("should log debug if DEBUG env var is set", () => {
      process.env.DEBUG = "true";
      logDebug("Test debug");
      expect(consoleDebugSpy).toHaveBeenCalledWith("[DEBUG]", "Test debug", "");
    });

    it("should include context", () => {
      process.env.NODE_ENV = "development";
      logDebug("Test debug", { data: 123 });
      expect(consoleDebugSpy).toHaveBeenCalledWith(
        "[DEBUG]",
        "Test debug",
        expect.stringContaining('{\n  "data": 123\n}'),
      );
    });
  });

  describe("logger injection", () => {
    it("setLogger should replace the default logger", () => {
      const customError = vi.fn();
      const customWarn = vi.fn();
      const customInfo = vi.fn();
      const customDebug = vi.fn();
      const customLogger: Logger = {
        error: customError,
        warn: customWarn,
        info: customInfo,
        debug: customDebug,
      };

      setLogger(customLogger);
      const error: AppError = { code: "TEST", message: "test" };
      logError(error);
      logInfo("info");
      logDebug("debug");

      expect(customError).toHaveBeenCalledOnce();
      expect(customInfo).toHaveBeenCalledOnce();
      expect(customDebug).toHaveBeenCalledOnce();
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    it("setLogger should work for warnings too", () => {
      const customLogger: Logger = {
        error: vi.fn(),
        warn: vi.fn(),
        info: vi.fn(),
        debug: vi.fn(),
      };

      setLogger(customLogger);
      logWarning("test warning");

      expect(customLogger.warn).toHaveBeenCalledOnce();
      expect(consoleWarnSpy).not.toHaveBeenCalled();
    });

    it("resetLogger should restore the default logger", () => {
      const customLogger: Logger = {
        error: vi.fn(),
        warn: vi.fn(),
        info: vi.fn(),
        debug: vi.fn(),
      };

      setLogger(customLogger);
      resetLogger();

      logInfo("test");

      expect(customLogger.info).not.toHaveBeenCalled();
      expect(consoleInfoSpy).toHaveBeenCalled();
    });

    it("getLogger should return the current logger", () => {
      const customLogger: Logger = {
        error: vi.fn(),
        warn: vi.fn(),
        info: vi.fn(),
        debug: vi.fn(),
      };

      const defaultLogger = getLogger();
      setLogger(customLogger);
      const currentLogger = getLogger();

      expect(currentLogger).toBe(customLogger);
      expect(currentLogger).not.toBe(defaultLogger);
    });

    it("nullLogger should silence all logs", () => {
      setLogger(nullLogger);

      const error: AppError = { code: "TEST", message: "test" };
      logError(error);
      logWarning("test warning");
      logInfo("test info");
      logDebug("test debug");

      expect(consoleErrorSpy).not.toHaveBeenCalled();
      expect(consoleWarnSpy).not.toHaveBeenCalled();
      expect(consoleInfoSpy).not.toHaveBeenCalled();
      expect(consoleDebugSpy).not.toHaveBeenCalled();
    });
  });
});
