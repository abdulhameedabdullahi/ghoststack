import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { recordDebt, settleDebt, totalOwed } from "./debts";
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
