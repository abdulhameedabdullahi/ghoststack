import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { cutText } from "./cutText";

const isHigh = (c: number) => c >= 0xd800 && c <= 0xdbff;
const isLow = (c: number) => c >= 0xdc00 && c <= 0xdfff;

describe("cutText property", () => {
  // Feature: pwa-offline-and-backup, Property 12: cutText is a safe prefix
  // **Validates: Requirements 6.13, 9.9**
  it("returns a safe prefix of the input", () => {
    fc.assert(
      fc.property(
        fc.oneof(fc.string({ unit: "binary" }) /* full Unicode (fast-check v4 replacement for fullUnicodeString) */, fc.string()),
        fc.integer({ min: 1, max: 300 }),
        (text, max) => {
          const out = cutText(text, max);
          expect(text.startsWith(out)).toBe(true);
          expect(out.length).toBeLessThanOrEqual(max);
          if (text.length <= max) expect(out).toBe(text);
          if (out.length > 0 && out.length < text.length) {
            const last = out.charCodeAt(out.length - 1);
            const next = text.charCodeAt(out.length);
            // Never end on a high surrogate that was split from its pair.
            expect(isHigh(last) && isLow(next)).toBe(false);
          }
        },
      ),
      { numRuns: 200 },
    );
  });
});
