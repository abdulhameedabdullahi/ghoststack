import { describe, expect, it } from "vitest";
import fc from "fast-check";
import type { Card, Stack } from "../domain/types";
import { totalOwed } from "../domain/debts";
import { saleTotal } from "../domain/sales";
import {
  type BackupErrorCode,
  BACKUP_ERROR_MESSAGES,
  RESTORED_NAME_FALLBACK,
  RESTORED_SUFFIX,
  SIZE_LIMIT,
  backupFileName,
  parseBackup,
  serializeStack,
} from "./backup";

/* ------------------------------------------------------------------ */
/* Shared generators and helpers (later backup properties reuse these) */
/* ------------------------------------------------------------------ */

/** Recursively freezes a value so any accidental change throws. */
function deepFreeze<T>(value: T): T {
  if (typeof value === "object" && value !== null && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const v of Object.values(value as Record<string, unknown>)) {
      deepFreeze(v);
    }
  }
  return value;
}

/** Money in kobo: small and large safe integers. Never -0 or fractional. */
const moneyArb: fc.Arbitrary<number> = fc.oneof(
  fc.nat(),
  fc.integer({ min: 0, max: Number.MAX_SAFE_INTEGER }),
);

const quantityArb: fc.Arbitrary<number> = fc.oneof(
  fc.nat(),
  fc.integer({ min: 0, max: Number.MAX_SAFE_INTEGER }),
);

const idArb: fc.Arbitrary<string> = fc.string({ maxLength: 20 });

/** Text made of plain letters, spaces, and multi-unit characters, of an exact length. */
const exactLengthTextArb = (length: number): fc.Arbitrary<string> =>
  fc
    .array(fc.constantFrom("a", "Z", "7", " ", "é", "€", "😀"), {
      minLength: length,
      maxLength: length,
    })
    .map((parts) => parts.join(""));

/** Names and text: ordinary, full-unicode, and lengths around 29, 30, 40, 41. */
const nameArb: fc.Arbitrary<string> = fc.oneof(
  fc.string(),
  fc.string({ unit: "binary" }),
  fc
    .constantFrom(28, 29, 30, 31, 39, 40, 41, 42)
    .chain((n) => exactLengthTextArb(n)),
  fc
    .constantFrom(29, 30, 40, 41)
    .chain((n) => fc.string({ unit: "binary", minLength: n, maxLength: n })),
);

/** Card title: 1 to 40 characters after trimming. May have spaces around it. */
const titleArb: fc.Arbitrary<string> = fc
  .tuple(
    fc.oneof(
      fc.string({ minLength: 1, maxLength: 40 }),
      fc.string({ unit: "binary", minLength: 1, maxLength: 40 }),
      exactLengthTextArb(40),
    ),
    fc.constantFrom("", " ", "  "),
    fc.constantFrom("", " ", "  "),
  )
  .map(([core, pre, post]) => pre + core + post)
  .filter((t) => {
    const n = t.trim().length;
    return n >= 1 && n <= 40;
  });

/** `hidden` is true, false, or left out of the object entirely. */
const hiddenArb: fc.Arbitrary<{ hidden?: boolean }> = fc.oneof(
  fc.constant({}),
  fc.boolean().map((hidden) => ({ hidden })),
);

const itemArb = fc.record({
  id: idArb,
  name: nameArb,
  quantity: quantityArb,
  costPrice: moneyArb,
  sellPrice: moneyArb,
  lowStockLevel: quantityArb,
}, { noNullPrototype: true });

const saleArb = fc.record({
  id: idArb,
  itemId: idArb,
  quantity: quantityArb,
  unitPrice: moneyArb,
  unitCost: moneyArb,
  time: fc.string({ maxLength: 30 }),
}, { noNullPrototype: true });

const debtArb = fc.record({
  id: idArb,
  customer: nameArb,
  amount: moneyArb,
  date: fc.string({ maxLength: 30 }),
  status: fc.constantFrom<"paid" | "unpaid">("paid", "unpaid"),
}, { noNullPrototype: true });

const stockCardArb: fc.Arbitrary<Card> = fc
  .tuple(
    idArb,
    titleArb,
    hiddenArb,
    fc.array(itemArb, { maxLength: 4 }),
  )
  .map(([id, title, hidden, items]) => ({
    id,
    type: "stock" as const,
    title,
    ...hidden,
    items,
  }));

const salesLogCardArb: fc.Arbitrary<Card> = fc
  .tuple(idArb, titleArb, hiddenArb, fc.array(saleArb, { maxLength: 4 }))
  .map(([id, title, hidden, sales]) => ({
    id,
    type: "sales-log" as const,
    title,
    ...hidden,
    sales,
  }));

const debtsCardArb: fc.Arbitrary<Card> = fc
  .tuple(idArb, titleArb, hiddenArb, fc.array(debtArb, { maxLength: 4 }))
  .map(([id, title, hidden, debts]) => ({
    id,
    type: "debts" as const,
    title,
    ...hidden,
    debts,
  }));

const dailySummaryCardArb: fc.Arbitrary<Card> = fc
  .tuple(idArb, titleArb, hiddenArb)
  .map(([id, title, hidden]) => ({
    id,
    type: "daily-summary" as const,
    title,
    ...hidden,
  }));

/** A valid Stack that always holds all four card types, in a random order. */
const validStackArb: fc.Arbitrary<Stack> = fc
  .tuple(
    idArb,
    nameArb,
    fc.string({ maxLength: 6 }),
    fc.tuple(stockCardArb, salesLogCardArb, debtsCardArb, dailySummaryCardArb),
    fc.array(
      fc.oneof(
        stockCardArb,
        salesLogCardArb,
        debtsCardArb,
        dailySummaryCardArb,
      ),
      { maxLength: 3 },
    ),
  )
  .chain(([id, name, currency, four, extra]) => {
    const all = [...four, ...extra];
    return fc
      .shuffledSubarray(all, { minLength: all.length, maxLength: all.length })
      .map(
        (cards): Stack => ({
          schemaVersion: 1,
          id,
          name,
          currency,
          cards,
        }),
      );
  });

/** The restored name rule, written out separately from the code under test. */
function expectedRestoredName(original: string): string {
  const trimmed = original.trim();
  if (trimmed === "") return RESTORED_NAME_FALLBACK;
  let end = Math.min(trimmed.length, 40 - RESTORED_SUFFIX.length);
  if (end < trimmed.length) {
    const last = trimmed.charCodeAt(end - 1);
    if (last >= 0xd800 && last <= 0xdbff) end -= 1;
  }
  return trimmed.slice(0, end).trimEnd() + RESTORED_SUFFIX;
}

/* ------------------------------------------------------------------ */
/* Property 1                                                          */
/* ------------------------------------------------------------------ */

describe("backup properties", () => {
  // Feature: pwa-offline-and-backup, Property 1: Backup round trip
  // **Validates: Requirements 6.2, 6.3, 8.1, 9.1, 9.2, 9.7, 14.1, 14.8**
  it("Property 1: a saved backup restores to the same Stack, except id and name", () => {
    fc.assert(
      fc.property(validStackArb, idArb, (stack, freshId) => {
        deepFreeze(stack);

        const result = parseBackup(serializeStack(stack), freshId);

        expect(result.ok).toBe(true);
        if (!result.ok) return;
        expect(result.value).toStrictEqual({
          ...stack,
          id: freshId,
          name: expectedRestoredName(stack.name),
        });
        expect(result.value.name.length).toBeLessThanOrEqual(40);
      }),
      { numRuns: 200 },
    );
  });

  // Feature: pwa-offline-and-backup, Property 2: Serialized output shape
  // **Validates: Requirements 6.1, 6.2, 6.3, 6.4, 6.6, 14.7**
  it("Property 2: serialized text is indented JSON with the backup wrapper and the same Stack", () => {
    fc.assert(
      fc.property(validStackArb, (stack) => {
        const text = serializeStack(stack);

        const parsed = JSON.parse(text);
        expect(parsed.format).toBe("ghoststack-backup");
        expect(parsed.backupVersion).toBe(1);
        expect(parsed.stack).toStrictEqual(stack);
        expect(parsed.stack.schemaVersion).toBe(stack.schemaVersion);

        expect(text).toContain("\n");
        expect(text).toContain("\n  ");
        expect(JSON.stringify(parsed, null, 2)).toBe(text);
      }),
      { numRuns: 200 },
    );
  });

  // Feature: pwa-offline-and-backup, Property 3: Backup functions are pure and safe on frozen input
  // **Validates: Requirements 6.5, 6.8, 8.12, 9.8, 14.6, 14.9**
  it("Property 3: backup functions are pure and safe on frozen input", () => {
    /** Every object and array reachable from a value, by identity. */
    const collectObjects = (value: unknown, into: Set<object>): Set<object> => {
      if (typeof value === "object" && value !== null) {
        into.add(value);
        for (const v of Object.values(value as Record<string, unknown>)) {
          collectObjects(v, into);
        }
      }
      return into;
    };

    fc.assert(
      fc.property(validStackArb, idArb, (stack, freshId) => {
        const snapshot = structuredClone(stack);
        deepFreeze(stack);

        const text1 = serializeStack(stack);
        const text2 = serializeStack(stack);
        expect(text2).toBe(text1);
        expect(stack).toStrictEqual(snapshot);

        const result1 = parseBackup(text1, freshId);
        const result2 = parseBackup(text1, freshId);
        expect(result2).toStrictEqual(result1);
        expect(stack).toStrictEqual(snapshot);

        expect(result1.ok).toBe(true);
        if (!result1.ok) return;

        // The result must not share any nested object with the input Stack.
        const inputObjects = collectObjects(stack, new Set());
        for (const obj of collectObjects(result1.value, new Set())) {
          expect(inputObjects.has(obj)).toBe(false);
        }
        // The two parse results must not share objects with each other either.
        if (!result2.ok) return;
        const first = collectObjects(result1.value, new Set());
        for (const obj of collectObjects(result2.value, new Set())) {
          expect(first.has(obj)).toBe(false);
        }
      }),
      { numRuns: 200 },
    );
  });

  // Feature: pwa-offline-and-backup, Property 4: No NaN or undefined text
  // **Validates: Requirements 6.7, 14.5**
  it("Property 4: serialized text never contains NaN or undefined", () => {
    const BAD = ["NaN", "undefined"];
    /** True when no string value anywhere in the value holds a banned word. */
    const textIsClean = (value: unknown): boolean => {
      if (typeof value === "string") return BAD.every((w) => !value.includes(w));
      if (typeof value === "object" && value !== null) {
        return Object.values(value as Record<string, unknown>).every(
          textIsClean,
        );
      }
      return true;
    };

    fc.assert(
      fc.property(validStackArb.filter(textIsClean), (stack) => {
        const text = serializeStack(stack);
        expect(text).not.toContain("NaN");
        expect(text).not.toContain("undefined");
      }),
      { numRuns: 200 },
    );
  });
});

/* ------------------------------------------------------------------ */
/* Property 5                                                          */
/* ------------------------------------------------------------------ */

describe("backup money properties", () => {
  /** Money keys per object kind in the serialized Stack. */
  const MONEY_KEYS = new Set(["costPrice", "sellPrice", "unitPrice", "unitCost", "amount"]);
  const COUNT_KEYS = new Set(["quantity", "lowStockLevel"]);

  /** Every money and count field found anywhere in the value. */
  const collectNumbers = (value: unknown, out: unknown[]): unknown[] => {
    if (Array.isArray(value)) {
      for (const v of value) collectNumbers(v, out);
    } else if (typeof value === "object" && value !== null) {
      for (const [k, v] of Object.entries(value)) {
        if (MONEY_KEYS.has(k) || COUNT_KEYS.has(k)) out.push(v);
        else collectNumbers(v, out);
      }
    }
    return out;
  };

  /** Totals from existing domain functions; stock value has none, so it is summed here. */
  const totals = (stack: Stack) => {
    let stockValue = 0n;
    let sales = 0n;
    let owed = 0n;
    for (const card of stack.cards) {
      if (card.type === "stock") {
        for (const i of card.items) {
          stockValue += BigInt(i.quantity) * BigInt(i.costPrice);
        }
      } else if (card.type === "sales-log") {
        for (const s of card.sales) sales += BigInt(saleTotal(s));
      } else if (card.type === "debts") {
        owed += BigInt(totalOwed(card.debts));
      }
    }
    return { stockValue, sales, owed };
  };

  // Feature: pwa-offline-and-backup, Property 5: Money survives a backup exactly
  // **Validates: Requirements 6.9, 14.13**
  it("Property 5: money totals are equal after a backup and all money fields are whole numbers", () => {
    fc.assert(
      fc.property(validStackArb, idArb, (stack, freshId) => {
        const text = serializeStack(stack);

        const numbers = collectNumbers(JSON.parse(text).stack, []);
        expect(numbers.length).toBeGreaterThanOrEqual(0);
        for (const n of numbers) expect(Number.isInteger(n)).toBe(true);

        const result = parseBackup(text, freshId);
        expect(result.ok).toBe(true);
        if (!result.ok) return;
        expect(totals(result.value)).toStrictEqual(totals(stack));
      }),
      { numRuns: 200 },
    );
  });
});

/* ------------------------------------------------------------------ */
/* Property 6                                                          */
/* ------------------------------------------------------------------ */

describe("backup bad input properties", () => {
  const wrap = (stack: unknown): string =>
    JSON.stringify({ format: "ghoststack-backup", backupVersion: 1, stack });

  /** Text that is not valid JSON. */
  const notJsonArb: fc.Arbitrary<string> = fc
    .oneof(
      fc.string({ unit: "binary" }),
      fc.string().map((s) => "{" + s),
      fc.string().map((s) => "not json " + s),
    )
    .filter((s) => {
      try {
        JSON.parse(s);
        return false;
      } catch {
        return true;
      }
    });

  /** A wrapped backup whose `stack` is not a valid Stack. */
  const badStackShapeArb: fc.Arbitrary<string> = fc
    .oneof(
      fc.constant(null),
      fc.integer(),
      fc.string(),
      fc.array(fc.integer(), { maxLength: 3 }),
      fc.constant({}),
      fc.constant({ schemaVersion: 1 }),
      fc.constant({ schemaVersion: 1, id: 5, name: "x", currency: "", cards: [] }),
      fc.constant({ schemaVersion: 1, id: "a", name: "x", currency: "", cards: "no" }),
    )
    .map(wrap);

  /** Blank titles, or titles over 40 characters after trimming. */
  const badTitleArb: fc.Arbitrary<string> = fc.oneof(
    fc.constantFrom("", " ", "   ", "\t"),
    fc
      .tuple(
        fc.integer({ min: 41, max: 80 }),
        fc.constantFrom("", " ", "  "),
        fc.constantFrom("", " ", "  "),
      )
      .map(([n, pre, post]) => pre + "a".repeat(n) + post),
  );

  /** A valid Stack where one card has a bad title. */
  const badTitleBackupArb: fc.Arbitrary<string> = fc
    .tuple(validStackArb, badTitleArb, fc.nat())
    .map(([stack, title, pick]) => {
      const cards = stack.cards.map((c) => ({ ...c }));
      cards[pick % cards.length].title = title;
      return wrap({ ...stack, cards });
    });

  // Feature: pwa-offline-and-backup, Property 6: Bad input gives an error and never throws
  // **Validates: Requirements 8.3, 8.7, 8.9, 8.14, 14.2**
  it("Property 6: bad input gives an error and never throws", () => {
    fc.assert(
      fc.property(
        fc.oneof(notJsonArb, badStackShapeArb, badTitleBackupArb),
        idArb,
        (text, freshId) => {
          let result: ReturnType<typeof parseBackup> | undefined;
          expect(() => {
            result = parseBackup(text, freshId);
          }).not.toThrow();
          expect(result).toBeDefined();
          expect(result!.ok).toBe(false);
          if (result!.ok) return;
          expect(typeof result!.error.code).toBe("string");
          expect(result!.error.code.length).toBeGreaterThan(0);
          expect(result!.error.message.trim().length).toBeGreaterThan(0);
        },
      ),
      { numRuns: 200 },
    );
  });
});

/* ------------------------------------------------------------------ */
/* Property 7                                                          */
/* ------------------------------------------------------------------ */

describe("backup restored name properties", () => {
  /** Names for this property: the shared name generator plus edge cases. */
  const restoredNameInputArb: fc.Arbitrary<string> = fc.oneof(
    { weight: 4, arbitrary: nameArb },
    // Empty and space-only names (isStack accepts any string name).
    fc.constantFrom("", " ", "   ", "\t", "\n \t"),
    fc.integer({ min: 0, max: 50 }).map((n) => " ".repeat(n)),
    // Surrogate pair straddling the cut point (index 28 and 29).
    fc
      .tuple(
        fc.integer({ min: 25, max: 32 }),
        fc.constantFrom("😀", "𝒳", "🎃"),
        fc.string({ maxLength: 20 }),
      )
      .map(([n, pair, tail]) => "a".repeat(n) + pair + tail),
    // Spaces just before the cut point, so trimEnd matters.
    fc
      .tuple(
        fc.integer({ min: 20, max: 29 }),
        fc.integer({ min: 1, max: 10 }),
        fc.string({ minLength: 1, maxLength: 20 }),
      )
      .map(([n, gap, tail]) => "b".repeat(n) + " ".repeat(gap) + tail),
  );

  const stackWithNameArb: fc.Arbitrary<Stack> = fc
    .tuple(validStackArb, restoredNameInputArb)
    .map(([stack, name]) => ({ ...stack, name }));

  // Feature: pwa-offline-and-backup, Property 7: Restored name rules
  // **Validates: Requirements 9.3, 9.4, 9.5, 9.6, 9.9, 14.3**
  it("Property 7: restored name is short, ends with the suffix, and has a clean base", () => {
    fc.assert(
      fc.property(stackWithNameArb, idArb, (stack, freshId) => {
        const result = parseBackup(serializeStack(stack), freshId);
        expect(result.ok).toBe(true);
        if (!result.ok) return;
        const name = result.value.name;

        expect(name.length).toBeLessThanOrEqual(40);
        expect(name.endsWith(RESTORED_SUFFIX)).toBe(true);

        if (stack.name.trim() === "") {
          expect(name).toBe("My shop (restored)");
          return;
        }

        const base = name.slice(0, name.length - RESTORED_SUFFIX.length);
        // Base is trimmed at the end, so only the suffix's own space remains.
        expect(base).toBe(base.trimEnd());
        // Base never ends in a lone high surrogate.
        if (base.length > 0) {
          const last = base.charCodeAt(base.length - 1);
          expect(last >= 0xd800 && last <= 0xdbff).toBe(false);
        }
        // Base is a prefix of the trimmed original, and at most 29 chars.
        expect(base.length).toBeLessThanOrEqual(29);
        expect(stack.name.trim().startsWith(base)).toBe(true);
      }),
      { numRuns: 200 },
    );
  });
});

describe("backup restored name boundary properties", () => {
  /** Well-formed names of 29, 30, 40 or 41 characters, plus empty and space-only names. */
  const boundaryNameArb: fc.Arbitrary<string> = fc.oneof(
    fc
      .tuple(
        fc.constantFrom(28, 29, 30, 31, 40, 41),
        fc.constantFrom("", " ", "  "),
        fc.constantFrom("", " ", "  "),
      )
      .chain(([n, pre, post]) =>
        exactLengthTextArb(n).map((t) => pre + t + post),
      ),
    fc.integer({ min: 0, max: 45 }).map((n) => " ".repeat(n)),
    // Surrogate pairs only, so the cut can land between the two halves.
    fc
      .tuple(
        fc.integer({ min: 12, max: 16 }),
        fc.constantFrom("😀", "𝒳", "🎃"),
      )
      .map(([n, pair]) => pair.repeat(n)),
  );

  // Feature: pwa-offline-and-backup, Property 7: Restored name rules
  // **Validates: Requirements 9.3, 9.4, 9.5, 9.6, 9.9, 14.3**
  it("Property 7: names near the limits keep the trimmed name when short, and never split a pair", () => {
    fc.assert(
      fc.property(
        validStackArb,
        boundaryNameArb,
        idArb,
        (stack, original, freshId) => {
          const result = parseBackup(
            serializeStack({ ...stack, name: original }),
            freshId,
          );
          expect(result.ok).toBe(true);
          if (!result.ok) return;
          const name = result.value.name;
          const trimmed = original.trim();

          expect(name.length).toBeLessThanOrEqual(40);
          expect(name.endsWith(RESTORED_SUFFIX)).toBe(true);
          expect(name).toBe(expectedRestoredName(original));

          if (trimmed === "") {
            expect(name).toBe(RESTORED_NAME_FALLBACK);
            return;
          }
          if (trimmed.length <= 29) {
            expect(name).toBe(trimmed + RESTORED_SUFFIX);
          }
          const base = name.slice(0, name.length - RESTORED_SUFFIX.length);
          expect(trimmed.startsWith(base)).toBe(true);
          if (base.length < trimmed.length) {
            expect(base.endsWith(" ")).toBe(false);
          }
          if (base.length > 0) {
            const last = base.charCodeAt(base.length - 1);
            expect(last >= 0xd800 && last <= 0xdbff).toBe(false);
          }
        },
      ),
      { numRuns: 200 },
    );
  });
});

/* ------------------------------------------------------------------ */
/* Property 8                                                          */
/* ------------------------------------------------------------------ */

describe("backup version error properties", () => {
  /** JSON-safe values that are not the number 1. `undefined` means "leave the field out". */
  const notOneArb: fc.Arbitrary<unknown> = fc.oneof(
    fc.integer().filter((n) => n !== 1),
    fc.double({ noNaN: true, noDefaultInfinity: true }).filter((n) => n !== 1),
    fc.constantFrom(0, 2, -1, 1.5, 1e21),
    fc.constantFrom("1", "", "v1", "one"),
    fc.string(),
    fc.constantFrom(null, true, false),
    fc.constant([1]),
    fc.constant({ v: 1 }),
    fc.constant(undefined),
  );

  // Feature: pwa-offline-and-backup, Property 8: Version mismatch gives the matching error
  // **Validates: Requirements 8.5, 8.6, 14.11**
  it("Property 8: version mismatch gives the matching error", () => {
    fc.assert(
      fc.property(validStackArb, notOneArb, idArb, (stack, bad, freshId) => {
        // Wrong backupVersion, good Stack: WRONG_BACKUP_VERSION.
        const wrongBackup = JSON.stringify({
          format: "ghoststack-backup",
          backupVersion: bad,
          stack,
        });
        const r1 = parseBackup(wrongBackup, freshId);
        expect(r1.ok).toBe(false);
        if (!r1.ok) {
          expect(r1.error.code).toBe("WRONG_BACKUP_VERSION");
          expect(r1.error.message).toBe(BACKUP_ERROR_MESSAGES.WRONG_BACKUP_VERSION);
        }

        // Right backupVersion, wrong schemaVersion: WRONG_STACK_VERSION.
        const wrongStack = JSON.stringify({
          format: "ghoststack-backup",
          backupVersion: 1,
          stack: { ...stack, schemaVersion: bad },
        });
        const r2 = parseBackup(wrongStack, freshId);
        expect(r2.ok).toBe(false);
        if (!r2.ok) {
          expect(r2.error.code).toBe("WRONG_STACK_VERSION");
          expect(r2.error.message).toBe(BACKUP_ERROR_MESSAGES.WRONG_STACK_VERSION);
        }
      }),
      { numRuns: 200 },
    );
  });
});

/* ------------------------------------------------------------------ */
/* Property 9                                                          */
/* ------------------------------------------------------------------ */

describe("backup check order properties", () => {
  const notOne: fc.Arbitrary<unknown> = fc.oneof(
    fc.integer().filter((n) => n !== 1),
    fc.constantFrom("1", "", null, true, [1], { v: 1 }),
    fc.constant(undefined), // field left out
  );
  const notFormat: fc.Arbitrary<unknown> = fc.oneof(
    fc.string().filter((s) => s !== "ghoststack-backup"),
    fc.constantFrom(null, 1, false, [], {}),
    fc.constant(undefined),
  );

  /** A Stack with a damaged body: bad cards, or one blank title. */
  const damagedStackArb: fc.Arbitrary<Record<string, unknown>> = fc
    .tuple(validStackArb, fc.constantFrom("cards", "title", "id"), fc.nat())
    .map(([stack, how, pick]) => {
      if (how === "cards") return { ...stack, cards: "no" };
      if (how === "id") return { ...stack, id: 5 };
      const cards = stack.cards.map((c) => ({ ...c }));
      cards[pick % cards.length].title = "   ";
      return { ...stack, cards };
    });

  type Case = { text: string; expected: BackupErrorCode };

  /** Texts that fail several checks at once, with the earliest failed check. */
  const multiFailArb: fc.Arbitrary<Case> = fc.oneof(
    // Not JSON (so also not a backup, and so on).
    fc
      .oneof(
        fc.string({ unit: "binary" }),
        fc.string().map((s) => "{" + s),
        validStackArb.map((s) => serializeStack(s).slice(0, -1)),
      )
      .filter((s) => {
        try {
          JSON.parse(s);
          return false;
        } catch {
          return true;
        }
      })
      .map((text): Case => ({ text, expected: "NOT_JSON" })),
    // Not a backup, with bad versions and a damaged stack as well.
    fc
      .tuple(notFormat, notOne, notOne, damagedStackArb, fc.boolean())
      .map(([format, bv, sv, stack, withStack]): Case => {
        const obj: Record<string, unknown> = {
          format,
          backupVersion: bv,
        };
        if (withStack) obj.stack = { ...stack, schemaVersion: sv };
        return { text: JSON.stringify(obj), expected: "NOT_A_BACKUP" };
      }),
    fc
      .constantFrom("null", "5", '"text"', "[]", "[1,2]", "true")
      .map((text): Case => ({ text, expected: "NOT_A_BACKUP" })),
    // Wrong backup version, with a wrong stack version and a damaged stack.
    fc
      .tuple(notOne, notOne, damagedStackArb)
      .map(
        ([bv, sv, stack]): Case => ({
          text: JSON.stringify({
            format: "ghoststack-backup",
            backupVersion: bv,
            stack: { ...stack, schemaVersion: sv },
          }),
          expected: "WRONG_BACKUP_VERSION",
        }),
      ),
    // Right backup version, wrong stack version, and a damaged stack.
    fc
      .tuple(notOne, damagedStackArb)
      .map(
        ([sv, stack]): Case => ({
          text: JSON.stringify({
            format: "ghoststack-backup",
            backupVersion: 1,
            stack: { ...stack, schemaVersion: sv },
          }),
          expected: "WRONG_STACK_VERSION",
        }),
      ),
    // Only the stack is damaged.
    damagedStackArb.map(
      (stack): Case => ({
        text: JSON.stringify({
          format: "ghoststack-backup",
          backupVersion: 1,
          stack: { ...stack, schemaVersion: 1 },
        }),
        expected: "INVALID_STACK",
      }),
    ),
  );

  // Feature: pwa-offline-and-backup, Property 9: Checks run in a fixed order
  // **Validates: Requirements 8.10**
  it("Property 9: the code is the earliest failed check, every time", () => {
    fc.assert(
      fc.property(multiFailArb, idArb, ({ text, expected }, freshId) => {
        const r1 = parseBackup(text, freshId);
        const r2 = parseBackup(text, freshId);
        expect(r1.ok).toBe(false);
        if (r1.ok) return;
        expect(r1.error.code).toBe(expected);
        expect(r2).toStrictEqual(r1);
      }),
      { numRuns: 200 },
    );
  });

  // Feature: pwa-offline-and-backup, Property 9: Checks run in a fixed order
  // **Validates: Requirements 8.10**
  it("Property 9: an oversized text gives TOO_LARGE even when later checks fail too", () => {
    const oversizedArb = fc.oneof(
      // Not JSON, ASCII.
      fc.integer({ min: 1, max: 50 }).map((n) => "x".repeat(SIZE_LIMIT + n)),
      // Not JSON, multibyte: 2 bytes per unit, over the limit in bytes only.
      fc
        .integer({ min: 1, max: 50 })
        .map((n) => "é".repeat(SIZE_LIMIT / 2 + n)),
      // Valid JSON that is not a backup and has wrong versions.
      fc.integer({ min: 1, max: 50 }).map(
        (n) =>
          '{"format":"other","backupVersion":2,"pad":"' +
          "x".repeat(SIZE_LIMIT + n) +
          '"}',
      ),
    );
    fc.assert(
      fc.property(oversizedArb, idArb, (text, freshId) => {
        const r1 = parseBackup(text, freshId);
        expect(r1.ok).toBe(false);
        if (r1.ok) return;
        expect(r1.error.code).toBe("TOO_LARGE");
        expect(parseBackup(text, freshId)).toStrictEqual(r1);
      }),
      { numRuns: 6 },
    );
  });

  // Feature: pwa-offline-and-backup, Property 10: Size limit
  // **Validates: Requirements 8.2, 14.10**
  it("Property 10: text over SIZE_LIMIT bytes is TOO_LARGE, text within it is not", () => {
    const overArb = fc.oneof(
      // ASCII: one byte per character.
      fc.integer({ min: 1, max: 50 }).map((n) => "x".repeat(SIZE_LIMIT + n)),
      // Multibyte: 2 bytes per character, so fewer than SIZE_LIMIT characters.
      fc
        .integer({ min: 1, max: 50 })
        .map((n) => "é".repeat(SIZE_LIMIT / 2 + n)),
    );
    const withinArb = fc.oneof(
      fc.integer({ min: 0, max: 50 }).map((n) => "x".repeat(SIZE_LIMIT - n)),
      fc
        .integer({ min: 0, max: 50 })
        .map((n) => "é".repeat(SIZE_LIMIT / 2 - n)),
    );
    fc.assert(
      fc.property(overArb, withinArb, idArb, (over, within, freshId) => {
        const tooLarge = parseBackup(over, freshId);
        expect(tooLarge.ok).toBe(false);
        if (!tooLarge.ok) expect(tooLarge.error.code).toBe("TOO_LARGE");

        const ok = parseBackup(within, freshId);
        expect(ok.ok).toBe(false);
        if (!ok.ok) expect(ok.error.code).not.toBe("TOO_LARGE");
      }),
      { numRuns: 25 },
    );
  });
});

/* ------------------------------------------------------------------ */
/* Property 11                                                         */
/* ------------------------------------------------------------------ */

describe("backup file name properties", () => {
  /** A valid calendar date: real month and a day that exists in that month. */
  const dateArb = fc
    .date({
      min: new Date(Date.UTC(1000, 0, 1)),
      max: new Date(Date.UTC(9999, 11, 31)),
      noInvalidDate: true,
    })
    .map((d) => ({
      year: d.getUTCFullYear(),
      month: d.getUTCMonth() + 1,
      day: d.getUTCDate(),
    }));

  /** Shop names: any text, long text, text with many symbols, and empty-after-cleaning text. */
  const shopNameArb: fc.Arbitrary<string> = fc.oneof(
    fc.string(),
    fc.string({ unit: "binary" }),
    fc.string({ minLength: 40, maxLength: 120 }),
    fc.stringMatching(/^[A-Za-z0-9 ]{45,90}$/),
    // Long names where a hyphen may land at the cut point (index 48 or 49).
    fc
      .tuple(
        fc.integer({ min: 44, max: 52 }),
        fc.constantFrom(" ", "-", "!!", "  "),
        fc.string({ maxLength: 20 }),
      )
      .map(([n, sep, tail]) => "a".repeat(n) + sep + tail),
    fc.constantFrom("", " ", "---", "!!!", "é€😀", "   \t"),
  );

  const pad = (n: number, w: number) => String(n).padStart(w, "0");

  // Feature: pwa-offline-and-backup, Property 11: Backup file name shape
  // **Validates: Requirements 6.10, 6.11, 6.12, 6.13, 9.9, 14.12**
  it("Property 11: file name has a clean shop part, the date, and at most 60 characters before .json", () => {
    fc.assert(
      fc.property(shopNameArb, dateArb, (shopName, date) => {
        const name = backupFileName(shopName, date);
        const stamp = `${pad(date.year, 4)}-${pad(date.month, 2)}-${pad(date.day, 2)}`;
        const suffix = `-${stamp}.json`;

        expect(name.endsWith(suffix)).toBe(true);
        expect(name).toMatch(/^[a-z0-9-]+\.json$/);
        expect(name.split(".").length - 1).toBe(1);
        expect(name.length - ".json".length).toBeLessThanOrEqual(60);

        const shop = name.slice(0, name.length - suffix.length);
        expect(shop.length).toBeGreaterThan(0);
        expect(shop.startsWith("-")).toBe(false);
        expect(shop.endsWith("-")).toBe(false);

        // An empty cleaned name falls back to "shop".
        if (shopName.toLowerCase().replace(/[^a-z0-9]+/g, "") === "") {
          expect(shop).toBe("shop");
        }
      }),
      { numRuns: 300 },
    );
  });
});

/* ------------------------------------------------------------------ */
/* Property 13                                                         */
/* ------------------------------------------------------------------ */

describe("backup extra key properties", () => {
  /** Adds an own, enumerable key even when the name is `__proto__`. */
  const addKey = (obj: object, key: string, value: unknown): void => {
    if (Object.prototype.hasOwnProperty.call(obj, key)) return;
    Object.defineProperty(obj, key, {
      value,
      enumerable: true,
      writable: true,
      configurable: true,
    });
  };

  /**
   * Walks the value and adds extra keys to every object in it, including
   * objects inside arrays. Keys come from the pool, starting at an offset
   * that changes for each object.
   */
  const addExtraKeys = (
    value: unknown,
    pool: ReadonlyArray<readonly [string, unknown]>,
    counter: { n: number },
  ): void => {
    if (Array.isArray(value)) {
      for (const v of value) addExtraKeys(v, pool, counter);
      return;
    }
    if (typeof value !== "object" || value === null) return;
    // Walk the real children first, so the extras are not walked.
    for (const v of Object.values(value)) addExtraKeys(v, pool, counter);
    addKey(value, "__proto__", { polluted: true });
    addKey(value, "constructor", { polluted: true });
    addKey(value, "extraKey", counter.n);
    for (let i = 0; i < pool.length; i++) {
      const [key, extra] = pool[(counter.n + i) % pool.length];
      if (i % 2 === 0) addKey(value, key, extra);
    }
    counter.n += 1;
  };

  /** Every object in the value, with its path, for checking the result. */
  const everyObject = (value: unknown, out: object[] = []): object[] => {
    if (typeof value === "object" && value !== null) {
      out.push(value);
      for (const v of Object.values(value)) everyObject(v, out);
    }
    return out;
  };

  const extraPoolArb = fc.array(
    fc.tuple(
      fc.oneof(
        fc.string({ maxLength: 12 }),
        fc.constantFrom("__proto__", "constructor", "prototype", "toString"),
      ),
      fc.jsonValue({ maxDepth: 2 }),
    ),
    { minLength: 1, maxLength: 5 },
  );

  // Feature: pwa-offline-and-backup, Property 13: Extra keys are dropped at every level
  // **Validates: Requirements 8.13, 14.15**
  it("Property 13: extra keys are dropped at every level", () => {
    fc.assert(
      fc.property(validStackArb, extraPoolArb, idArb, (stack, pool, freshId) => {
        const cleanText = serializeStack(stack);
        const parsed = JSON.parse(cleanText);
        addExtraKeys(parsed, pool, { n: 0 });
        const dirtyText = JSON.stringify(parsed, null, 2);

        // The walk really did add keys, including an own "__proto__" key.
        expect(dirtyText).toContain('"__proto__"');
        expect(dirtyText.length).toBeGreaterThan(cleanText.length);

        const clean = parseBackup(cleanText, freshId);
        const dirty = parseBackup(dirtyText, freshId);
        expect(clean.ok).toBe(true);
        expect(dirty).toStrictEqual(clean);
        if (!dirty.ok) return;

        for (const obj of everyObject(dirty.value)) {
          expect(Object.getPrototypeOf(obj)).toBe(
            Array.isArray(obj) ? Array.prototype : Object.prototype,
          );
          const keys = Object.keys(obj);
          expect(keys).not.toContain("__proto__");
          expect(keys).not.toContain("constructor");
          expect(keys).not.toContain("extraKey");
        }
        expect(({} as Record<string, unknown>).polluted).toBeUndefined();
      }),
      { numRuns: 200 },
    );
  });
});
