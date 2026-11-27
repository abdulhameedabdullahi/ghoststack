import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { formatDisplay } from "../../components/formatMoney";
import {
  checkProperty,
  lowStockNamesArb,
  nameArb,
  zeroOrMoreKoboArb,
} from "../../test/shareArbitraries";
import { buildDailySummary } from "./buildDailySummary";
import { ITEM_MAX, NAME_MAX, sanitiseText } from "./sanitise";
import type { DailySummaryInput } from "./types";

type Kobo = Parameters<typeof formatDisplay>[0];

const BAD_PATTERNS = [/NaN/, /undefined/, /null/, /\[object/, /\.\d{3,}/];

/** Cuts every sanitised user-supplied string out of the text (decision 7). */
function cutUserStrings(text: string, input: DailySummaryInput): string {
  let out = text;
  const cleaned = [
    sanitiseText(input.shopName, NAME_MAX),
    sanitiseText(input.dateLabel, NAME_MAX),
    ...input.lowStockNames.map((n) => sanitiseText(n, ITEM_MAX)),
  ];
  for (const clean of cleaned) {
    if (clean) out = out.split(clean).join("");
  }
  return out;
}

const inputArb: fc.Arbitrary<DailySummaryInput> = fc.record({
  shopName: nameArb,
  dateLabel: nameArb,
  salesKobo: zeroOrMoreKoboArb,
  profitKobo: zeroOrMoreKoboArb,
  owedKobo: zeroOrMoreKoboArb,
  lowStockNames: lowStockNamesArb,
  language: fc.constant("en" as const),
});

const codePoints4 = "😀".repeat(200);

describe("buildDailySummary properties", () => {
  // Property P2: valid input gives ok; text satisfies 4.1, 4.2, 3.3.
  // **Validates: Requirements 2.1, 2.3, 3.3, 4.1, 4.2**
  it("P2: valid input gives a clean, bounded text with the amounts", () => {
    checkProperty(
      fc.property(inputArb, (input) => {
        const r = buildDailySummary(input);
        if (!r.ok) return false;
        const text = r.value.text;
        const rest = cutUserStrings(text, input);
        return (
          BAD_PATTERNS.every((p) => !p.test(rest)) &&
          text.includes(formatDisplay(input.salesKobo as Kobo)) &&
          text.includes(formatDisplay(input.profitKobo as Kobo)) &&
          text.includes(formatDisplay(input.owedKobo as Kobo)) &&
          encodeURIComponent(text).length <= 1800
        );
      }),
    );
  });

  it("P2: worst case of 4-byte code points stays within 1800", () => {
    const r = buildDailySummary({
      shopName: codePoints4,
      dateLabel: codePoints4,
      salesKobo: Number.MAX_SAFE_INTEGER,
      profitKobo: Number.MAX_SAFE_INTEGER,
      owedKobo: Number.MAX_SAFE_INTEGER,
      lowStockNames: Array.from({ length: 50 }, () => codePoints4),
      language: "en",
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(encodeURIComponent(r.value.text).length).toBeLessThanOrEqual(1800);
    }
  });

  // Property P3: the text survives an encode/decode round trip.
  // **Validates: Requirements 3.3**
  it("P3: decodeURIComponent(encodeURIComponent(text)) equals text", () => {
    checkProperty(
      fc.property(inputArb, (input) => {
        const r = buildDailySummary(input);
        if (!r.ok) return false;
        return decodeURIComponent(encodeURIComponent(r.value.text)) === r.value.text;
      }),
    );
  });

  // Property P7: same input twice gives the same text.
  // **Validates: Requirements 2.1, 2.3, 4.3**
  it("P7: is deterministic", () => {
    checkProperty(
      fc.property(inputArb, (input) => {
        const a = buildDailySummary(input);
        const b = buildDailySummary({ ...input, lowStockNames: [...input.lowStockNames] });
        return JSON.stringify(a) === JSON.stringify(b);
      }),
    );
  });
});
