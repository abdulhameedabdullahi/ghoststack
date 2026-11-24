import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { parseWholeNumber } from "./wholeNumber";

const RUNS = { numRuns: 100 };

const arbDigits = fc
  .array(fc.constantFrom(..."0123456789".split("")), { minLength: 1, maxLength: 25 })
  .map((d) => d.join(""));
const arbPad = fc.constantFrom("", " ", "  ", "\t", "\n");

// Feature: app-shell-stock-card, Property 14: parseWholeNumber accepts exactly digit strings that are safe integers
describe("Property 14: parseWholeNumber", () => {
  /** **Validates: Requirements 9.7, 14.11, 14.7, 14.8** */
  it("returns ok(n) iff trimmed text is digits-only and a safe integer", () => {
    const arbText = fc.oneof(
      fc.string(),
      fc.nat().map(String),
      arbDigits,
      fc.tuple(arbPad, arbDigits, arbPad).map(([a, d, b]) => a + d + b),
      fc.constantFrom("", " ", "-1", "1.5", "1e3", "12abc", "٣", "9007199254740992"),
    );
    fc.assert(
      fc.property(arbText, (text) => {
        const trimmed = text.trim();
        const result = parseWholeNumber(text);
        const expectOk =
          /^\d+$/.test(trimmed) && Number.isSafeInteger(Number(trimmed));
        expect(result.ok).toBe(expectOk);
        if (result.ok) expect(result.value).toBe(Number(trimmed));
      }),
      RUNS,
    );
  });

  /** **Validates: Requirements 9.7, 14.11, 14.7, 14.8** */
  it("round-trips every non-negative safe integer", () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.nat(),
          fc.integer({ min: 0, max: Number.MAX_SAFE_INTEGER }),
          fc.constantFrom(0, Number.MAX_SAFE_INTEGER),
        ),
        (n) => {
          const result = parseWholeNumber(String(n));
          expect(result).toEqual({ ok: true, value: n });
        },
      ),
      RUNS,
    );
  });
});
