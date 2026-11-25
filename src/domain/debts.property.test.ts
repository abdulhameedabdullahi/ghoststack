import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { debtsByCustomer, debtsUnpaidFirst, recordDebt, settleDebt, totalOwed } from "./debts";
import type { Debt, Stack } from "./types";

const DATE = "2024-01-01";

const debtArb = (id: string): fc.Arbitrary<Debt> =>
  fc.record({
    id: fc.constant(id),
    customer: fc.string({ minLength: 1, maxLength: 10 }),
    amount: fc.integer({ min: 1, max: 1_000_000 }),
    date: fc.constant(DATE),
    status: fc.constantFrom("unpaid" as const, "paid" as const),
  });

const debtsArb = fc
  .integer({ min: 0, max: 8 })
  .chain((n) =>
    fc.tuple(...Array.from({ length: n }, (_, i) => debtArb(`debt-${i}`))),
  );

const stackArb: fc.Arbitrary<Stack> = debtsArb.map((debts) => ({
  schemaVersion: 1,
  id: "stack-1",
  name: "Test",
  currency: "NGN",
  cards: [
    { id: "stock", type: "stock", title: "Stock", items: [] },
    { id: "sales", type: "sales-log", title: "Sales", sales: [] },
    { id: "debts", type: "debts", title: "Debts", debts },
    { id: "summary", type: "daily-summary", title: "Summary" },
  ],
}));

function debtsOf(stack: Stack): Debt[] {
  const card = stack.cards.find((c) => c.type === "debts");
  return card && card.type === "debts" ? card.debts : [];
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const v of Object.values(value)) deepFreeze(v);
  }
  return value;
}

describe("invariant 5: total owed", () => {
  it("**Validates: Requirements 7.4, 7.6, 7.7** equals the sum of unpaid amounts", () => {
    fc.assert(
      fc.property(debtsArb, (debts) => {
        const expected = debts
          .filter((d) => d.status === "unpaid")
          .reduce((s, d) => s + d.amount, 0);
        expect(totalOwed(debts)).toBe(expected);
      }),
      { numRuns: 200 },
    );
  });

  it("**Validates: Requirements 7.4, 7.6, 7.7** settling an unpaid debt lowers it by exactly its amount", () => {
    fc.assert(
      fc.property(stackArb, (stack) => {
        for (const d of debtsOf(stack).filter((x) => x.status === "unpaid")) {
          const before = totalOwed(debtsOf(stack));
          const result = settleDebt({
            stack,
            debtsCardId: "debts",
            debtId: d.id,
          });
          expect(result.ok).toBe(true);
          if (result.ok) {
            expect(totalOwed(debtsOf(result.value))).toBe(before - d.amount);
          }
        }
      }),
      { numRuns: 200 },
    );
  });

  it("**Validates: Requirements 7.4, 7.6, 7.7** recording a debt raises it by exactly its amount", () => {
    fc.assert(
      fc.property(
        stackArb,
        fc.integer({ min: 1, max: 1_000_000 }),
        (stack, amount) => {
          const before = totalOwed(debtsOf(stack));
          const result = recordDebt({
            stack,
            debtsCardId: "debts",
            customer: "Ada",
            amount,
            debtId: "new-debt",
            date: DATE,
          });
          expect(result.ok).toBe(true);
          if (result.ok) {
            expect(totalOwed(debtsOf(result.value))).toBe(before + amount);
          }
        },
      ),
      { numRuns: 200 },
    );
  });
});

describe("requirement 7.9: debt functions do not mutate their input", () => {
  const amount = fc.oneof(
    fc.integer({ min: 1, max: 1_000_000 }),
    fc.constantFrom(0, -5, 0.5, NaN, Infinity, Number.MAX_SAFE_INTEGER),
  );
  const cardId = fc.constantFrom("debts", "stock", "missing");
  const debtId = fc.oneof(
    fc.integer({ min: 0, max: 10 }).map((i) => `debt-${i}`),
    fc.constant("new-debt"),
  );
  const customer = fc.oneof(fc.string({ maxLength: 10 }), fc.constant("  "));

  it("**Validates: Requirements 7.9** leaves a deep-frozen Stack unchanged on success and on error", () => {
    fc.assert(
      fc.property(
        stackArb,
        fc.array(
          fc.record({ cardId, debtId, customer, amount, settle: fc.boolean() }),
          { minLength: 1, maxLength: 10 },
        ),
        (start, list) => {
          let stack = deepFreeze(start);
          for (const a of list) {
            const snapshot = structuredClone(stack);
            const result = a.settle
              ? settleDebt({ stack, debtsCardId: a.cardId, debtId: a.debtId })
              : recordDebt({
                stack,
                debtsCardId: a.cardId,
                customer: a.customer,
                amount: a.amount,
                debtId: a.debtId,
                date: DATE,
              });
            totalOwed(debtsOf(stack));
            expect(stack).toEqual(snapshot);
            if (result.ok) stack = deepFreeze(result.value);
          }
        },
      ),
      { numRuns: 200 },
    );
  });
});

// ---------------------------------------------------------------------------
// Shared generators for the debts-card-ui properties (bounded: amounts
// 1 to 1,000,000 and lists of 0 to 8, so sums never overflow).
// ---------------------------------------------------------------------------

/** A valid ISO instant string. */
export const arbIsoInstant: fc.Arbitrary<string> = fc
  .date({
    min: new Date("2000-01-01T00:00:00.000Z"),
    max: new Date("2100-01-01T00:00:00.000Z"),
    noInvalidDate: true,
  })
  .map((d) => d.toISOString());

/** Mostly valid instants (4 in 5), sometimes a string Date.parse rejects. */
export const arbDebtDate: fc.Arbitrary<string> = fc.oneof(
  { weight: 4, arbitrary: arbIsoInstant },
  { weight: 1, arbitrary: fc.constantFrom("", "not-a-date", "2024-13-45") },
);

const BASE_NAMES = ["Ada", "Bola", "chidi", "Ngozi Eze", "ZAINAB"];

/** Customer names that collide on the Customer key: padding, inner spaces, case. */
export const arbCustomerName: fc.Arbitrary<string> = fc
  .tuple(
    fc.constantFrom(...BASE_NAMES),
    fc.constantFrom("", " ", "  ", "\t"),
    fc.constantFrom("", " ", "  "),
    fc.constantFrom("same", "upper", "lower"),
    fc.boolean(),
  )
  .map(([base, lead, trail, mode, wide]) => {
    let name = mode === "upper" ? base.toUpperCase() : mode === "lower" ? base.toLowerCase() : base;
    if (wide) name = name.replace(/ /g, "   ");
    return `${lead}${name}${trail}`;
  });

/** One Debt with a given unique id; names collide often. */
export const arbDebtWithKeyCollisions = (id: string): fc.Arbitrary<Debt> =>
  fc.record({
    id: fc.constant(id),
    customer: arbCustomerName,
    amount: fc.integer({ min: 1, max: 1_000_000 }),
    date: arbDebtDate,
    status: fc.constantFrom("unpaid" as const, "paid" as const),
  });

/** Short list (0 to 8) of Debts with unique ids. */
export const arbDebtList: fc.Arbitrary<Debt[]> = fc
  .integer({ min: 0, max: 8 })
  .chain((n) =>
    fc.tuple(...Array.from({ length: n }, (_, i) => arbDebtWithKeyCollisions(`d-${i}`))),
  )
  .map((list) => list as Debt[]);

describe("debtsUnpaidFirst", () => {
  it("**Validates: Requirements 1.1, 1.7, 8.4, 8.14, 8.15** Property 1: is a permutation of its input, unpaid before paid", () => {
    fc.assert(
      fc.property(arbDebtList, (debts) => {
        const result = debtsUnpaidFirst(debts);
        expect(result).not.toBe(debts);
        expect(result.length).toBe(debts.length);
        // Same objects by reference: none lost, none repeated, none added.
        expect(new Set(result).size).toBe(result.length);
        for (const d of debts) {
          expect(result.filter((r) => r === d).length).toBe(1);
        }
        // Every unpaid Debt comes before every paid Debt.
        const firstPaid = result.findIndex((d) => d.status === "paid");
        if (firstPaid !== -1) {
          expect(result.slice(firstPaid).every((d) => d.status === "paid")).toBe(true);
        }
      }),
      { numRuns: 200 },
    );
  });
});

/** Few distinct dates so ties are common. Two spellings of one instant, two unparseable. */
const arbTieDate: fc.Arbitrary<string> = fc.constantFrom(
  "2024-01-01T00:00:00.000Z",
  "2024-01-01T00:00:00Z",
  "2024-01-02T00:00:00.000Z",
  "2024-01-03T12:30:00.000Z",
  "not-a-date",
  "",
);

const arbTieDebtList: fc.Arbitrary<Debt[]> = fc
  .integer({ min: 0, max: 8 })
  .chain((n) =>
    fc.tuple(
      ...Array.from({ length: n }, (_, i) =>
        fc.record({
          id: fc.constant(`d-${i}`),
          customer: fc.constant("Ada"),
          amount: fc.integer({ min: 1, max: 1_000_000 }),
          date: arbTieDate,
          status: fc.constantFrom("unpaid" as const, "paid" as const),
        }),
      ),
    ),
  )
  .map((list) => list as Debt[]);

describe("debtsUnpaidFirst ordering", () => {
  it("**Validates: Requirements 1.2, 1.3, 1.4, 8.5, 8.14** Property 2: groups unpaid before paid and orders each group newest-first with later-input ties winning", () => {
    fc.assert(
      fc.property(arbTieDebtList, (debts) => {
        const result = debtsUnpaidFirst(debts);
        expect(result.length).toBe(debts.length);
        const pos = (d: Debt) => debts.indexOf(d);

        for (let i = 0; i + 1 < result.length; i++) {
          const a = result[i];
          const b = result[i + 1];
          // Unpaid before paid.
          if (a.status !== b.status) {
            expect(a.status).toBe("unpaid");
            continue;
          }
          const ta = Date.parse(a.date);
          const tb = Date.parse(b.date);
          const aBad = Number.isNaN(ta);
          const bBad = Number.isNaN(tb);
          // Unparseable after valid in the same group.
          if (aBad !== bBad) {
            expect(aBad).toBe(false);
            continue;
          }
          if (aBad && bBad) {
            // Two unparseable dates: later input first.
            expect(pos(a)).toBeGreaterThan(pos(b));
          } else if (ta !== tb) {
            // Newest first, compared as instants.
            expect(ta).toBeGreaterThan(tb);
          } else {
            // Equal instants: later input first.
            expect(pos(a)).toBeGreaterThan(pos(b));
          }
        }
      }),
      { numRuns: 200 },
    );
  });
});

describe("debtsUnpaidFirst frozen input", () => {
  it("**Validates: Requirements 1.5, 1.6, 8.6, 8.14** Property 7: debtsUnpaidFirst never mutates a frozen input", () => {
    fc.assert(
      fc.property(arbDebtList, (debts) => {
        const snapshot = structuredClone(debts);
        deepFreeze(debts);
        const result = debtsUnpaidFirst(debts);
        expect(debts).toEqual(snapshot);
        expect(result).not.toBe(debts);
        expect(Object.isFrozen(result)).toBe(false);
      }),
      { numRuns: 200 },
    );
  });
});

describe("debtsByCustomer ignores paid debts", () => {
  const arbPaidFields = fc.record({
    customer: arbCustomerName,
    amount: fc.integer({ min: 1, max: 1_000_000 }),
    date: arbDebtDate,
  });
  const arbExtraPaid = fc.array(
    fc.record({
      customer: arbCustomerName,
      amount: fc.integer({ min: 1, max: 1_000_000 }),
      date: arbDebtDate,
      at: fc.nat({ max: 100 }),
    }),
    { maxLength: 4 },
  );

  it("**Validates: Requirements 2.2, 8.8, 8.14** Property 3: changing, adding or removing paid debts does not change the result", () => {
    fc.assert(
      fc.property(
        arbDebtList,
        fc.array(arbPaidFields, { minLength: 8, maxLength: 8 }),
        arbExtraPaid,
        (debts, changes, extras) => {
          const snapshot = structuredClone(debts);
          const base = debtsByCustomer(debts);

          // Change a paid Debt's customer, amount and date.
          const changed = debts.map((d, i) =>
            d.status === "paid" ? { ...d, ...changes[i] } : d,
          );
          expect(debtsByCustomer(changed)).toEqual(base);

          // Remove every paid Debt.
          const removed = debts.filter((d) => d.status === "unpaid");
          expect(debtsByCustomer(removed)).toEqual(base);

          // Add paid Debts at arbitrary positions.
          const added = [...debts];
          extras.forEach((e, i) => {
            const paid: Debt = {
              id: `extra-${i}`,
              customer: e.customer,
              amount: e.amount,
              date: e.date,
              status: "paid",
            };
            added.splice(e.at % (added.length + 1), 0, paid);
          });
          expect(debtsByCustomer(added)).toEqual(base);

          // Input was not changed.
          expect(debts).toEqual(snapshot);
        },
      ),
      { numRuns: 200 },
    );
  });
});

describe("debtsByCustomer grouping", () => {
  // Independent reference for the Customer key: trim, collapse whitespace, lower case.
  const refKey = (name: string): string =>
    name.trim().split(/\s+/).join(" ").toLowerCase();

  it("**Validates: Requirements 2.3, 2.4, 8.9, 8.14** Property 4: groups unpaid debts by Customer key, with the first-typed name and the correct sum", () => {
    fc.assert(
      fc.property(arbDebtList, (debts) => {
        // Expected groups, built in input order from unpaid debts only.
        const expected = new Map<string, { name: string; total: number }>();
        for (const d of debts) {
          if (d.status !== "unpaid") continue;
          const key = refKey(d.customer);
          const group = expected.get(key);
          if (group) group.total += d.amount;
          else expected.set(key, { name: d.customer.trim(), total: d.amount });
        }

        const result = debtsByCustomer(debts);
        expect(result.ok).toBe(true);
        if (!result.ok) return;

        // One entry per distinct key.
        expect(result.value.length).toBe(expected.size);
        const seen = new Set<string>();
        for (const entry of result.value) {
          const key = refKey(entry.name);
          expect(seen.has(key)).toBe(false);
          seen.add(key);
          // No entry for a key without an unpaid Debt.
          const want = expected.get(key);
          expect(want).toBeDefined();
          if (!want) continue;
          // First unpaid name, trimmed, and the exact sum.
          expect(entry.name).toBe(want.name);
          expect(entry.total).toBe(want.total);
        }
        expect(seen.size).toBe(expected.size);
      }),
      { numRuns: 200 },
    );
  });
});

describe("debtsByCustomer ordering", () => {
  const refKey = (name: string): string =>
    name.trim().split(/\s+/).join(" ").toLowerCase();

  // Few names and tiny amounts (1 to 3) so equal totals happen often.
  const arbTieList: fc.Arbitrary<Debt[]> = fc
    .integer({ min: 0, max: 8 })
    .chain((n) =>
      fc.tuple(
        ...Array.from({ length: n }, (_, i) =>
          fc.record({
            id: fc.constant(`d-${i}`),
            customer: fc.constantFrom("Ada", " ada ", "Bola", "Chidi", "Ngozi"),
            amount: fc.integer({ min: 1, max: 3 }),
            date: fc.constant("2024-01-01T00:00:00.000Z"),
            status: fc.constantFrom("unpaid" as const, "paid" as const, "unpaid" as const),
          }),
        ),
      ),
    )
    .map((list) => list as Debt[]);

  it("**Validates: Requirements 2.5, 8.9, 8.14** Property 5: orders totals largest-first, equal totals by earlier first unpaid Debt", () => {
    fc.assert(
      fc.property(arbTieList, (debts) => {
        // Reference: first unpaid index per key, from the input.
        const first = new Map<string, number>();
        debts.forEach((d, i) => {
          if (d.status !== "unpaid") return;
          const key = refKey(d.customer);
          if (!first.has(key)) first.set(key, i);
        });

        const result = debtsByCustomer(debts);
        expect(result.ok).toBe(true);
        if (!result.ok) return;

        for (let i = 0; i + 1 < result.value.length; i++) {
          const a = result.value[i];
          const b = result.value[i + 1];
          expect(a.total).toBeGreaterThanOrEqual(b.total);
          if (a.total === b.total) {
            const fa = first.get(refKey(a.name));
            const fb = first.get(refKey(b.name));
            expect(fa).toBeDefined();
            expect(fb).toBeDefined();
            expect(fa as number).toBeLessThan(fb as number);
          }
        }
      }),
      { numRuns: 200 },
    );
  });
});

/**
 * Short lists (1 to 4) of unpaid Debts that share one Customer key, with
 * amounts near Number.MAX_SAFE_INTEGER. The one property that does not use
 * bounded generators.
 */
export const arbOverflowingDebts: fc.Arbitrary<Debt[]> = fc
  .integer({ min: 1, max: 4 })
  .chain((n) =>
    fc.tuple(
      ...Array.from({ length: n }, (_, i) =>
        fc.record({
          id: fc.constant(`big-${i}`),
          customer: fc.constantFrom("Ada", " ada ", "ADA", "  Ada"),
          amount: fc.integer({
            min: Math.floor(Number.MAX_SAFE_INTEGER / 4),
            max: Number.MAX_SAFE_INTEGER,
          }),
          date: fc.constant("2024-01-01T00:00:00.000Z"),
          status: fc.constant("unpaid" as const),
        }),
      ),
    ),
  )
  .map((list) => list as Debt[]);

describe("debtsByCustomer overflow", () => {
  const check = (debts: Debt[]) => {
    const exact = debts
      .filter((d) => d.status === "unpaid")
      .reduce((s, d) => s + BigInt(d.amount), 0n);
    const result = debtsByCustomer(debts);
    if (result.ok) {
      for (const entry of result.value) {
        expect(Number.isNaN(entry.total)).toBe(false);
        expect(Number.isFinite(entry.total)).toBe(true);
        expect(Number.isSafeInteger(entry.total)).toBe(true);
      }
      // Single-customer lists with unpaid debts: the one total is the exact sum.
      if (
        debts.some((d) => d.status === "unpaid") &&
        debts.every((d) => d.customer.trim().toLowerCase() === "ada")
      ) {
        expect(result.value.length).toBe(1);
        expect(BigInt(result.value[0].total)).toBe(exact);
      }
    } else {
      expect(result.error.code).toBe("AMOUNT_TOO_BIG");
    }
    return result;
  };

  it("**Validates: Requirements 2.7, 2.10, 8.11, 8.14, 8.15** Property 6: never returns NaN or an unsafe total, and overflow returns AMOUNT_TOO_BIG", () => {
    fc.assert(
      fc.property(arbOverflowingDebts, (debts) => {
        const exact = debts.reduce((s, d) => s + BigInt(d.amount), 0n);
        const result = check(debts);
        if (exact > BigInt(Number.MAX_SAFE_INTEGER)) {
          expect(result.ok).toBe(false);
          if (!result.ok) expect(result.error.code).toBe("AMOUNT_TOO_BIG");
        } else {
          expect(result.ok).toBe(true);
          if (result.ok) {
            expect(result.value.length).toBe(1);
            expect(BigInt(result.value[0].total)).toBe(exact);
          }
        }
      }),
      { numRuns: 200 },
    );
  });

  it("**Validates: Requirements 2.7, 2.10, 8.11, 8.14, 8.15** Property 6: ordinary bounded lists never give NaN or an unsafe total", () => {
    fc.assert(
      fc.property(arbDebtList, (debts) => {
        const result = check(debts);
        expect(result.ok).toBe(true);
      }),
      { numRuns: 200 },
    );
  });
});

describe("debtsByCustomer frozen input", () => {
  const check = (debts: Debt[]) => {
    const snapshot = structuredClone(debts);
    deepFreeze(debts);
    const result = debtsByCustomer(debts);
    expect(debts).toEqual(snapshot);
    if (result.ok) expect(Object.isFrozen(result.value)).toBe(false);
  };

  it("**Validates: Requirements 2.8, 2.9, 8.10, 8.14** Property 7: debtsByCustomer never mutates a frozen valid list", () => {
    fc.assert(
      fc.property(arbDebtList, (debts) => check(debts)),
      { numRuns: 200 },
    );
  });

  it("**Validates: Requirements 2.8, 2.9, 8.10, 8.14** Property 7: debtsByCustomer never mutates a frozen overflowing list", () => {
    fc.assert(
      fc.property(arbOverflowingDebts, (debts) => check(debts)),
      { numRuns: 200 },
    );
  });
});

describe("debtsByCustomer sum", () => {
  it("**Validates: Requirements 8.7, 8.14** Property 8: the sum of Customer totals equals totalOwed", () => {
    fc.assert(
      fc.property(fc.oneof(arbDebtList, arbOverflowingDebts), (debts) => {
        const result = debtsByCustomer(debts);
        // Skip overflow cases: no totals to compare.
        if (!result.ok) return;
        const sum = result.value.reduce((s, c) => s + c.total, 0);
        expect(sum).toBe(totalOwed(debts));
      }),
      { numRuns: 200 },
    );
  });
});

describe("settleDebt and debtsByCustomer", () => {
  // Independent reference for the Customer key: trim, collapse whitespace, lower case.
  const refKey = (name: string): string =>
    name.trim().split(/\s+/).join(" ").toLowerCase();

  const totalsByKey = (debts: Debt[]): Map<string, number> => {
    const result = debtsByCustomer(debts);
    expect(result.ok).toBe(true);
    const map = new Map<string, number>();
    if (result.ok) for (const c of result.value) map.set(refKey(c.name), c.total);
    return map;
  };

  const arbStackWithUnpaid: fc.Arbitrary<Stack> = arbDebtList
    .filter((debts) => debts.some((d) => d.status === "unpaid"))
    .map((debts) => ({
      schemaVersion: 1,
      id: "stack-1",
      name: "Test",
      currency: "NGN",
      cards: [
        { id: "stock", type: "stock", title: "Stock", items: [] },
        { id: "sales", type: "sales-log", title: "Sales", sales: [] },
        { id: "debts", type: "debts", title: "Debts", debts },
        { id: "summary", type: "daily-summary", title: "Summary" },
      ],
    }));

  it("**Validates: Requirements 8.12, 8.14** Property 9: settling a debt reduces exactly that customer's total by that debt's amount", () => {
    fc.assert(
      fc.property(arbStackWithUnpaid, fc.nat(), (stack, pick) => {
        const unpaid = debtsOf(stack).filter((d) => d.status === "unpaid");
        const d = unpaid[pick % unpaid.length];

        const before = totalsByKey(debtsOf(stack));
        const settled = settleDebt({ stack, debtsCardId: "debts", debtId: d.id });
        expect(settled.ok).toBe(true);
        if (!settled.ok) return;
        const after = totalsByKey(debtsOf(settled.value));

        const dKey = refKey(d.customer);
        const keys = new Set([...before.keys(), ...after.keys()]);
        for (const key of keys) {
          const b = before.get(key) ?? 0;
          const a = after.get(key) ?? 0;
          expect(a).toBe(key === dKey ? b - d.amount : b);
        }
      }),
      { numRuns: 200 },
    );
  });
});
