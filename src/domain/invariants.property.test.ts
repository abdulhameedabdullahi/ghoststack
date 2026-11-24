import { describe, expect, it } from "vitest";
import fc from "fast-check";
import {
  recordDebt,
  recordSale,
  saleTotal,
  settleDebt,
  totalOwed,
  type Item,
  type Stack,
} from "./index";

const TIME = "2024-01-01T10:00:00.000Z";

const priceArb = fc.oneof(
  fc.integer({ min: 0, max: 100_000 }),
  fc.constantFrom(Number.MAX_SAFE_INTEGER, Math.floor(Number.MAX_SAFE_INTEGER / 2)),
);

const itemArb = (id: string): fc.Arbitrary<Item> =>
  fc.record({
    id: fc.constant(id),
    name: fc.constant(id),
    quantity: fc.integer({ min: 0, max: 50 }),
    costPrice: priceArb,
    sellPrice: priceArb,
    lowStockLevel: fc.integer({ min: 0, max: 5 }),
  });

const stackArb: fc.Arbitrary<Stack> = fc
  .tuple(itemArb("item-0"), itemArb("item-1"), itemArb("item-2"))
  .map((items) => ({
    schemaVersion: 1,
    id: "stack-1",
    name: "Test",
    currency: "NGN",
    cards: [
      { id: "stock", type: "stock", title: "Stock", items },
      { id: "sales", type: "sales-log", title: "Sales", sales: [] },
      { id: "debts", type: "debts", title: "Debts", debts: [] },
      { id: "summary", type: "daily-summary", title: "Summary" },
    ],
  }));

type Op =
  | {
      kind: "sale";
      stockId: string;
      salesId: string;
      itemId: string;
      quantity: number;
      saleId: string;
    }
  | {
      kind: "debt";
      cardId: string;
      customer: string;
      amount: number;
      debtId: string;
    }
  | { kind: "settle"; cardId: string; debtId: string };

const idIndex = fc.integer({ min: 0, max: 6 });
const numberArb = fc.oneof(
  fc.integer({ min: -3, max: 60 }),
  fc.integer({ min: 1, max: 1_000_000 }),
  fc.constantFrom(0, 0.5, -1, NaN, Infinity, Number.MAX_SAFE_INTEGER),
);

const opArb: fc.Arbitrary<Op> = fc.oneof(
  fc.record({
    kind: fc.constant("sale" as const),
    stockId: fc.constantFrom("stock", "stock", "sales", "missing"),
    salesId: fc.constantFrom("sales", "sales", "stock", "missing"),
    itemId: fc.oneof(
      fc.integer({ min: 0, max: 3 }).map((i) => `item-${i}`),
      fc.constant("nope"),
    ),
    quantity: numberArb,
    saleId: idIndex.map((i) => `sale-${i}`),
  }),
  fc.record({
    kind: fc.constant("debt" as const),
    cardId: fc.constantFrom("debts", "debts", "stock", "missing"),
    customer: fc.oneof(fc.string({ maxLength: 8 }), fc.constant("  ")),
    amount: numberArb,
    debtId: idIndex.map((i) => `debt-${i}`),
  }),
  fc.record({
    kind: fc.constant("settle" as const),
    cardId: fc.constantFrom("debts", "debts", "stock", "missing"),
    debtId: idIndex.map((i) => `debt-${i}`),
  }),
);

function applyOp(stack: Stack, op: Op) {
  switch (op.kind) {
    case "sale":
      return recordSale({
        stack,
        stockCardId: op.stockId,
        salesCardId: op.salesId,
        itemId: op.itemId,
        quantity: op.quantity,
        saleId: op.saleId,
        time: TIME,
      });
    case "debt":
      return recordDebt({
        stack,
        debtsCardId: op.cardId,
        customer: op.customer,
        amount: op.amount,
        debtId: op.debtId,
        date: "2024-01-01",
      });
    case "settle":
      return settleDebt({
        stack,
        debtsCardId: op.cardId,
        debtId: op.debtId,
      });
  }
}

const isSafeMoneyValue = (n: number) =>
  Number.isSafeInteger(n) && n >= 0;

function expectSound(stack: Stack) {
  for (const card of stack.cards) {
    if (card.type === "stock") {
      for (const i of card.items) {
        expect(Number.isNaN(i.quantity)).toBe(false);
        expect(Number.isInteger(i.quantity)).toBe(true);
        expect(i.quantity).toBeGreaterThanOrEqual(0);
        expect(Number.isInteger(i.lowStockLevel)).toBe(true);
        expect(isSafeMoneyValue(i.costPrice)).toBe(true);
        expect(isSafeMoneyValue(i.sellPrice)).toBe(true);
      }
    } else if (card.type === "sales-log") {
      for (const s of card.sales) {
        expect(Number.isInteger(s.quantity)).toBe(true);
        expect(s.quantity).toBeGreaterThanOrEqual(1);
        expect(isSafeMoneyValue(s.unitPrice)).toBe(true);
        expect(isSafeMoneyValue(s.unitCost)).toBe(true);
        expect(isSafeMoneyValue(saleTotal(s))).toBe(true);
      }
    } else if (card.type === "debts") {
      for (const d of card.debts) {
        expect(isSafeMoneyValue(d.amount)).toBe(true);
        expect(d.amount).toBeGreaterThanOrEqual(1);
      }
      expect(isSafeMoneyValue(totalOwed(card.debts))).toBe(true);
    }
  }
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const v of Object.values(value)) deepFreeze(v);
  }
  return value;
}

describe("invariant 7: no NaN, no negative stock, safe whole numbers", () => {
  it("**Validates: Requirements 7.5, 7.6, 7.7** holds after every step of random operation sequences", () => {
    fc.assert(
      fc.property(
        stackArb,
        fc.array(opArb, { minLength: 1, maxLength: 25 }),
        (start, ops) => {
          let stack = start;
          expectSound(stack);
          for (const op of ops) {
            const result = applyOp(stack, op);
            if (result.ok) stack = result.value;
            expectSound(stack);
          }
        },
      ),
      { numRuns: 300 },
    );
  });
});

describe("requirement 7.9: recordSale does not mutate its input", () => {
  it("**Validates: Requirements 7.9** leaves a deep-frozen Stack unchanged on success and on error", () => {
    fc.assert(
      fc.property(
        stackArb,
        fc.array(opArb, { minLength: 1, maxLength: 15 }),
        (start, ops) => {
          let stack = deepFreeze(start);
          for (const op of ops) {
            if (op.kind !== "sale") continue;
            const snapshot = structuredClone(stack);
            const result = applyOp(stack, op);
            expect(stack).toEqual(snapshot);
            if (result.ok) stack = deepFreeze(result.value);
          }
        },
      ),
      { numRuns: 200 },
    );
  });
});
