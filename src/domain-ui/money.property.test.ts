import { describe, it } from "vitest";
import fc from "fast-check";
import { formatKobo, parseKobo } from "./money";
import { ok } from "../domain/result";

const arbKobo = fc.oneof(
  fc.integer({ min: 0, max: Number.MAX_SAFE_INTEGER }),
  fc.constantFrom(0, 1, 99, 100, 101, 99_999, 100_000, Number.MAX_SAFE_INTEGER),
);

const arbSpaces = fc
  .array(fc.constantFrom(" ", "\t", "\n"), { maxLength: 4 })
  .map((a) => a.join(""));

describe("money round trip", () => {
  // Feature: app-shell-stock-card, Property 10: Money formatting and parsing round-trip
  it("parseKobo(formatKobo(k)) returns ok(k), with or without surrounding spaces", () => {
    // **Validates: Requirements 5.5, 14.5, 14.7, 14.8**
    fc.assert(
      fc.property(arbKobo, arbSpaces, arbSpaces, (k, lead, trail) => {
        const text = formatKobo(k);
        const plain = parseKobo(text);
        const padded = parseKobo(lead + text + trail);
        return (
          JSON.stringify(plain) === JSON.stringify(ok(k)) &&
          JSON.stringify(padded) === JSON.stringify(ok(k))
        );
      }),
      { numRuns: 200 },
    );
  });
});

// --- Property 11 ---

const NAIRA = "\u20A6";

const arbDigits = (min: number, max: number) =>
  fc
    .array(fc.constantFrom(..."0123456789".split("")), { minLength: min, maxLength: max })
    .map((a) => a.join(""));

const arbValidText = fc
  .tuple(arbDigits(1, 6), fc.option(arbDigits(1, 2), { nil: undefined }))
  .map(([w, f]) => (f === undefined ? w : `${w}.${f}`));

const arbInvalidBase: fc.Arbitrary<string> = fc.oneof(
  // empty or whitespace only
  arbSpaces,
  // letters only, or digits mixed with at least one letter
  fc
    .tuple(
      arbDigits(0, 4),
      fc.constantFrom(..."abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ".split("")),
      arbDigits(0, 4),
    )
    .map(([a, l, b]) => a + l + b),
  // more than two decimal places
  fc.tuple(arbDigits(1, 6), arbDigits(3, 6)).map(([w, f]) => `${w}.${f}`),
  // a minus sign
  fc.tuple(arbSpaces, arbValidText).map(([s, v]) => `-${s}${v}`),
  // above the safe limit (kobo > Number.MAX_SAFE_INTEGER)
  fc
    .tuple(
      fc.bigInt({ min: 90071992547410n, max: 10n ** 24n }),
      fc.option(arbDigits(1, 2), { nil: undefined }),
    )
    .map(([w, f]) => (f === undefined ? `${w}` : `${w}.${f}`)),
);

const arbPrefixed = fc
  .tuple(arbSpaces, arbSpaces, arbInvalidBase)
  .map(([a, b, base]) => `${a}${NAIRA}${b}${base}`);

const arbSpecialPrefix = fc
  .tuple(arbSpaces, arbSpaces, arbValidText, fc.constantFrom("", "\u20A6"))
  .map(([a, b, v, extra]) => `${a}${NAIRA}${extra}${b}${v}`);

const arbBareNaira = arbSpaces.map((s) => `${s}${NAIRA}${s}`);

const arbInvalidText = fc.oneof(
  arbInvalidBase,
  arbPrefixed,
  arbBareNaira,
  arbSpecialPrefix.filter((t) => t.split(NAIRA).length > 2),
  fc.constantFrom("", NAIRA, `${NAIRA}${NAIRA}5`, `${NAIRA}-5`, `${NAIRA}abc`),
);

describe("invalid typed prices", () => {
  // Feature: app-shell-stock-card, Property 11: Invalid typed prices are rejected with an error
  it("parseKobo rejects invalid text with BAD_PRICE", () => {
    // **Validates: Requirements 5.4, 14.13, 14.7, 14.8**
    fc.assert(
      fc.property(arbInvalidText, (text) => {
        const r = parseKobo(text);
        return !r.ok && r.error.code === "BAD_PRICE";
      }),
      { numRuns: 300 },
    );
  });
});
