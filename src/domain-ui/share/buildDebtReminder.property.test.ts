import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { formatDisplay } from "../../components/formatMoney";
import { checkProperty, nameArb, validKoboArb } from "../../test/shareArbitraries";
import { buildDebtReminder } from "./buildDebtReminder";
import { NAME_MAX, sanitiseText } from "./sanitise";
import type { DebtReminderInput } from "./types";

type Kobo = Parameters<typeof formatDisplay>[0];

const BAD_PATTERNS = [/NaN/, /undefined/, /null/, /\[object/, /\.\d{3,}/];

/** Cuts every sanitised user-supplied string out of the text (decision 7). */
function cutUserStrings(text: string, input: DebtReminderInput): string {
  let out = text;
  for (const raw of [input.personName, input.shopName]) {
    const clean = sanitiseText(raw, NAME_MAX);
    if (clean) out = out.split(clean).join("");
  }
  return out;
}

const inputArb: fc.Arbitrary<DebtReminderInput> = fc.record({
  personName: nameArb,
  shopName: nameArb,
  outstandingKobo: validKoboArb,
  language: fc.constant("en" as const),
});

const codePoints4 = "😀".repeat(200);

describe("buildDebtReminder properties", () => {
  // Property P1: valid input gives ok; text satisfies 4.1, 4.2, 3.3.
  // **Validates: Requirements 1.1, 3.3, 4.1, 4.2**
  it("P1: valid input gives a clean, bounded text with the amount", () => {
    checkProperty(
      fc.property(inputArb, (input) => {
        const r = buildDebtReminder(input);
        if (!r.ok) return false;
        const text = r.value.text;
        const rest = cutUserStrings(text, input);
        return (
          BAD_PATTERNS.every((p) => !p.test(rest)) &&
          text.includes(formatDisplay(input.outstandingKobo as Kobo)) &&
          encodeURIComponent(text).length <= 1800
        );
      }),
    );
  });

  it("P1: worst case of 4-byte code points stays within 1800", () => {
    const r = buildDebtReminder({
      personName: codePoints4,
      shopName: codePoints4,
      outstandingKobo: Number.MAX_SAFE_INTEGER,
      language: "en",
    });
    expect(r.ok).toBe(true);
    if (r.ok) expect(encodeURIComponent(r.value.text).length).toBeLessThanOrEqual(1800);
  });

  // Property P3: the text survives an encode/decode round trip.
  // **Validates: Requirements 3.3**
  it("P3: decodeURIComponent(encodeURIComponent(text)) equals text", () => {
    checkProperty(
      fc.property(inputArb, (input) => {
        const r = buildDebtReminder(input);
        if (!r.ok) return false;
        return decodeURIComponent(encodeURIComponent(r.value.text)) === r.value.text;
      }),
    );
  });

  // Property P5: invalid amounts give INVALID_AMOUNT, zero gives ALREADY_PAID.
  // **Validates: Requirements 1.3, 4.3**
  it("P5: non-safe-integer or negative amounts give INVALID_AMOUNT", () => {
    const badArb = fc.oneof(
      fc.integer({ min: Number.MIN_SAFE_INTEGER, max: -1 }),
      fc.double({ noInteger: false }).filter((n) => !Number.isSafeInteger(n) || n < 1).filter((n) => n !== 0),
      fc.constantFrom(
        NaN,
        Infinity,
        -Infinity,
        0.5,
        1.5,
        -1,
        Number.MAX_SAFE_INTEGER + 1,
        Number.MAX_VALUE,
      ),
    );
    checkProperty(
      fc.property(nameArb, nameArb, badArb, (personName, shopName, outstandingKobo) => {
        const r = buildDebtReminder({ personName, shopName, outstandingKobo, language: "en" });
        return !r.ok && r.error.code === "INVALID_AMOUNT";
      }),
    );
  });

  it("P5: 0 and -0 give ALREADY_PAID", () => {
    for (const outstandingKobo of [0, -0]) {
      const r = buildDebtReminder({
        personName: "Ada",
        shopName: "Shop",
        outstandingKobo,
        language: "en",
      });
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.error.code).toBe("ALREADY_PAID");
    }
  });

  // Property P7: same input twice gives the same text.
  // **Validates: Requirements 4.3**
  it("P7: is deterministic", () => {
    checkProperty(
      fc.property(inputArb, (input) => {
        const a = buildDebtReminder(input);
        const b = buildDebtReminder({ ...input });
        return JSON.stringify(a) === JSON.stringify(b);
      }),
    );
  });
});
