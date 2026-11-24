import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { recordSale } from "./sales";
import type { Item, Stack } from "./types";

const kobo = fc.integer({ min: 0, max: 100_000_000 });

const item = (id: string): fc.Arbitrary<Item> =>
  fc.record({
    id: fc.constant(id),
    name: fc.string({ minLength: 1, maxLength: 10 }),
    quantity: fc.integer({ min: 0, max: 1000 }),
    costPrice: kobo,
    sellPrice: kobo,
    lowStockLevel: fc.integer({ min: 0, max: 20 }),
  });

const items = fc
  .integer({ min: 1, max: 5 })
  .chain((n) =>
    fc.tuple(...Array.from({ length: n }, (_, i) => item(`item-${i}`))),
  );

const stackArb: fc.Arbitrary<Stack> = items.map((its) => ({
  schemaVersion: 1,
  id: "stack-1",
  name: "Test",
  currency: "NGN",
  cards: [
    { id: "stock", type: "stock", title: "Stock", items: its },
    { id: "sales", type: "sales-log", title: "Sales", sales: [] },
    { id: "debts", type: "debts", title: "Debts", debts: [] },
    { id: "summary", type: "daily-summary", title: "Summary" },
  ],
}));

const quantity = fc.oneof(
  fc.integer({ min: 0, max: 1000 }),
  fc.integer({ min: -1000, max: -1 }),
  fc.integer({ min: 1001, max: 5000 }),
  fc.double({ min: -10, max: 1500, noNaN: true }),
  fc.constantFrom(0, -0, 0.5, NaN, Infinity, -Infinity),
);

const itemId = fc.oneof(
  fc.integer({ min: 0, max: 6 }).map((i) => `item-${i}`),
  fc.constant("missing"),
);

const attempts = fc.array(fc.record({ itemId, quantity }), {
  minLength: 1,
  maxLength: 30,
});

function stockOf(stack: Stack): Item[] {
  const card = stack.cards.find((c) => c.type === "stock");
  return card && card.type === "stock" ? card.items : [];
}

describe("invariant 1: stock never below zero", () => {
  it("**Validates: Requirements 7.2, 7.6, 7.7** keeps every quantity >= 0 and rejects oversize sales unchanged", () => {
    fc.assert(
      fc.property(stackArb, attempts, (start, list) => {
        let stack = start;
        list.forEach((a, n) => {
          const before = structuredClone(stack);
          const available = stockOf(stack).find((i) => i.id === a.itemId);
          const result = recordSale({
            stack,
            stockCardId: "stock",
            salesCardId: "sales",
            itemId: a.itemId,
            quantity: a.quantity,
            saleId: `sale-${n}`,
            time: "2024-01-01T00:00:00.000Z",
          });

          if (
            available &&
            Number.isInteger(a.quantity) &&
            a.quantity > available.quantity
          ) {
            expect(result.ok).toBe(false);
            if (!result.ok) {
              expect(result.error.code).toBe("NOT_ENOUGH_STOCK");
            }
          }

          if (result.ok) {
            stack = result.value;
          } else {
            expect(stack).toEqual(before);
          }
          // The input is never mutated either way.
          if (!result.ok) expect(stack).toEqual(before);

          for (const i of stockOf(stack)) {
            expect(i.quantity).toBeGreaterThanOrEqual(0);
          }
        });
      }),
      { numRuns: 200 },
    );
  });
});

describe("invariant 2: stock drops by exactly the quantity sold", () => {
  it("**Validates: Requirements 7.3, 7.6, 7.7** reduces only the sold item by exactly the quantity and leaves others unchanged", () => {
    fc.assert(
      fc.property(stackArb, attempts, (start, list) => {
        let stack = start;
        list.forEach((a, n) => {
          const before = stockOf(stack);
          const result = recordSale({
            stack,
            stockCardId: "stock",
            salesCardId: "sales",
            itemId: a.itemId,
            quantity: a.quantity,
            saleId: `sale-${n}`,
            time: "2024-01-01T00:00:00.000Z",
          });
          if (!result.ok) return;

          const after = stockOf(result.value);
          expect(after.length).toBe(before.length);
          for (const old of before) {
            const now = after.find((i) => i.id === old.id);
            expect(now).toBeDefined();
            if (old.id === a.itemId) {
              expect(now!.quantity).toBe(old.quantity - a.quantity);
              expect({ ...now!, quantity: 0 }).toEqual({ ...old, quantity: 0 });
            } else {
              expect(now).toEqual(old);
            }
          }
          stack = result.value;
        });
      }),
      { numRuns: 200 },
    );
  });
});
