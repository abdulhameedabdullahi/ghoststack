import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { ERROR_MESSAGES } from "../domain/result";
import { parseItemForm } from "./itemForm";
import type { ItemFormValues } from "./itemForm";

const RUNS = { numRuns: 100 };

const FIELDS = ["name", "quantity", "costPrice", "sellPrice", "lowStockLevel"] as const;
type Field = (typeof FIELDS)[number];

/** One Field's generated text, whether it is valid, and the value it should parse to. */
interface FieldCase {
  text: string;
  valid: boolean;
  expected?: string | number;
}

const arbPad = fc.constantFrom("", " ", "  ", "\t", "\n");

const arbName: fc.Arbitrary<FieldCase> = fc.oneof(
  fc
    .tuple(arbPad, fc.stringMatching(/^[A-Za-z0-9][A-Za-z0-9 ]{0,20}$/), arbPad)
    .map(([a, n, b]) => ({ text: a + n + b, valid: true, expected: n.trim() })),
  fc
    .array(fc.constantFrom(" ", "\t", "\n"), { maxLength: 6 })
    .map((w) => ({ text: w.join(""), valid: false })),
);

const arbWhole: fc.Arbitrary<FieldCase> = fc.oneof(
  fc
    .tuple(arbPad, fc.integer({ min: 0, max: Number.MAX_SAFE_INTEGER }), arbPad)
    .map(([a, n, b]) => ({ text: a + String(n) + b, valid: true, expected: n })),
  fc
    .constantFrom("", " ", "-1", "1.5", "1e3", "12abc", "abc", "9007199254740992")
    .map((text) => ({ text, valid: false })),
);

const arbPrice: fc.Arbitrary<FieldCase> = fc.oneof(
  fc
    .tuple(
      arbPad,
      fc.boolean(),
      fc.integer({ min: 0, max: 900_000_000_000_000 }),
      arbPad,
    )
    .map(([a, sign, kobo, b]) => {
      const naira = Math.floor(kobo / 100);
      const rest = String(kobo % 100).padStart(2, "0");
      return {
        text: a + (sign ? "\u20A6" : "") + `${naira}.${rest}` + b,
        valid: true,
        expected: kobo,
      };
    }),
  fc
    .constantFrom("", " ", "abc", "-5", "1.234", "\u20A6", "\u20A6\u20A65", "5.", "1.2.3")
    .map((text) => ({ text, valid: false })),
);

const arbCases: fc.Arbitrary<Record<Field, FieldCase>> = fc.record({
  name: arbName,
  quantity: arbWhole,
  costPrice: arbPrice,
  sellPrice: arbPrice,
  lowStockLevel: arbWhole,
});

/** Generates raw form text for the five Fields, mixing valid and bad text. */
export const arbItemFormValues: fc.Arbitrary<ItemFormValues> = arbCases.map((c) => ({
  name: c.name.text,
  quantity: c.quantity.text,
  costPrice: c.costPrice.text,
  sellPrice: c.sellPrice.text,
  lowStockLevel: c.lowStockLevel.text,
}));

const MESSAGES: Record<Field, string> = {
  name: ERROR_MESSAGES.BAD_ITEM_NAME,
  quantity: ERROR_MESSAGES.BAD_QUANTITY,
  costPrice: ERROR_MESSAGES.BAD_PRICE,
  sellPrice: ERROR_MESSAGES.BAD_PRICE,
  lowStockLevel: ERROR_MESSAGES.BAD_QUANTITY,
};

// Feature: app-shell-stock-card, Property 15: parseItemForm returns parsed values for valid text and per-field errors for invalid text
describe("Property 15: parseItemForm", () => {
  /** **Validates: Requirements 9.8, 9.9, 14.12, 14.7, 14.8** */
  it("returns parsed values when every Field is valid, else an error for exactly the bad Fields", () => {
    fc.assert(
      fc.property(arbCases, (c) => {
        const input: ItemFormValues = {
          name: c.name.text,
          quantity: c.quantity.text,
          costPrice: c.costPrice.text,
          sellPrice: c.sellPrice.text,
          lowStockLevel: c.lowStockLevel.text,
        };
        const result = parseItemForm(input);
        const bad = FIELDS.filter((f) => !c[f].valid);

        if (bad.length === 0) {
          expect(result).toEqual({
            ok: true,
            value: {
              name: c.name.expected,
              quantity: c.quantity.expected,
              costPrice: c.costPrice.expected,
              sellPrice: c.sellPrice.expected,
              lowStockLevel: c.lowStockLevel.expected,
            },
          });
        } else {
          expect(result.ok).toBe(false);
          if (!result.ok) {
            expect(Object.keys(result.errors).sort()).toEqual([...bad].sort());
            for (const f of bad) expect(result.errors[f]).toBe(MESSAGES[f]);
          }
        }
      }),
      RUNS,
    );
  });

  it("arbItemFormValues always produces five string Fields", () => {
    fc.assert(
      fc.property(arbItemFormValues, (v) => {
        for (const f of FIELDS) expect(typeof v[f]).toBe("string");
        expect(() => parseItemForm(v)).not.toThrow();
      }),
      RUNS,
    );
  });
});
