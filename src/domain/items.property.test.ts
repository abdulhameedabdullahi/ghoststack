import { describe, expect, it } from "vitest";
import fc from "fast-check";
import {
  addItem,
  deleteItem,
  isLowStock,
  isOutOfStock,
  updateItem,
} from "./items";
import { recordSale } from "./sales";
import type { Item, Kobo, Sale, Stack, StockCard } from "./types";

const RUNS = { numRuns: 100 };

// ---- Shared generators (exported for later property tests) ----

/** Safe money amount in kobo, at least 0. */
export const arbKobo: fc.Arbitrary<Kobo> = fc.oneof(
  fc.integer({ min: 0, max: 100_000_000 }),
  fc.constantFrom(0, 1, Number.MAX_SAFE_INTEGER),
);

/** Non-blank name that is already trimmed. */
export const arbName: fc.Arbitrary<string> = fc
  .string({ minLength: 1, maxLength: 12 })
  .map((s) => s.trim())
  .filter((s) => s.length > 0);

const arbCount = fc.integer({ min: 0, max: 1000 });

/** A valid Item with the given id. */
export const arbItemWithId = (id: string): fc.Arbitrary<Item> =>
  fc.record({
    id: fc.constant(id),
    name: arbName,
    quantity: arbCount,
    costPrice: arbKobo,
    sellPrice: arbKobo,
    lowStockLevel: arbCount,
  });

/** A valid Item with a generated id. */
export const arbItem: fc.Arbitrary<Item> = fc
  .uuid()
  .chain((id) => arbItemWithId(`item-${id}`));

const arbSale = (itemId: string, n: number): fc.Arbitrary<Sale> =>
  fc.record({
    id: fc.constant(`sale-${n}`),
    itemId: fc.constant(itemId),
    quantity: fc.integer({ min: 1, max: 50 }),
    unitPrice: arbKobo,
    unitCost: arbKobo,
    time: fc.constant("2024-01-01T00:00:00.000Z"),
  });

export const STOCK_ID = "stock-1";
export const SALES_ID = "sales-1";

/**
 * A Stack with a Stock card holding 0 to 6 Items (unique ids `item-0`...),
 * and a Sales log whose Sales reference those Items, plus ids that may no
 * longer exist.
 */
export const arbStack: fc.Arbitrary<Stack> = fc
  .integer({ min: 0, max: 6 })
  .chain((n) =>
    fc.tuple(
      fc.tuple(...Array.from({ length: n }, (_, i) => arbItemWithId(`item-${i}`))),
      fc.array(
        fc
          .tuple(fc.integer({ min: 0, max: 7 }), fc.nat())
          .chain(([i, k]) => arbSale(`item-${i}`, k)),
        { maxLength: 6 },
      ),
    ),
  )
  .map(([items, sales]) => ({
    schemaVersion: 1,
    id: "stack-1",
    name: "Test",
    currency: "NGN",
    cards: [
      { id: STOCK_ID, type: "stock", title: "Stock", items },
      { id: SALES_ID, type: "sales-log", title: "Sales", sales },
      { id: "debts-1", type: "debts", title: "Debts", debts: [] },
      { id: "summary-1", type: "daily-summary", title: "Summary" },
    ],
  }));

// ---- Helpers ----

const pad = fc.constantFrom("", " ", "  ", "\t");

function stockOf(stack: Stack): Item[] {
  const card = stack.cards.find((c): c is StockCard => c.type === "stock");
  return card ? card.items : [];
}

function nonStockCards(stack: Stack) {
  return stack.cards.filter((c) => c.type !== "stock");
}

const arbFields = fc.record({
  name: arbName,
  before: pad,
  after: pad,
  quantity: arbCount,
  costPrice: arbKobo,
  sellPrice: arbKobo,
  lowStockLevel: arbCount,
});

describe("Property 1: adding an item grows the list by one with the item appended", () => {
  it("**Validates: Requirements 1.1, 1.2, 1.9, 14.4**", () => {
    fc.assert(
      fc.property(arbStack, arbFields, (stack, f) => {
        const before = structuredClone(stack);
        const result = addItem({
          stack,
          stockCardId: STOCK_ID,
          itemId: "new-item",
          name: `${f.before}${f.name}${f.after}`,
          quantity: f.quantity,
          costPrice: f.costPrice,
          sellPrice: f.sellPrice,
          lowStockLevel: f.lowStockLevel,
        });
        expect(result.ok).toBe(true);
        if (!result.ok) return;

        const oldItems = stockOf(before);
        const newItems = stockOf(result.value);
        expect(newItems).toHaveLength(oldItems.length + 1);
        expect(newItems.slice(0, -1)).toEqual(oldItems);
        expect(newItems[newItems.length - 1]).toEqual({
          id: "new-item",
          name: f.name,
          quantity: f.quantity,
          costPrice: f.costPrice,
          sellPrice: f.sellPrice,
          lowStockLevel: f.lowStockLevel,
        });
        expect(nonStockCards(result.value)).toEqual(nonStockCards(before));
        expect(stack).toEqual(before);
      }),
      RUNS,
    );
  });
});

describe("Property 2: updating an item changes only that item's fields", () => {
  it("**Validates: Requirements 2.1, 2.2, 2.7, 2.8, 14.6**", () => {
    const arbCase = arbStack
      .filter((s) => stockOf(s).length > 0)
      .chain((s) =>
        fc.tuple(
          fc.constant(s),
          fc.integer({ min: 0, max: stockOf(s).length - 1 }),
          arbFields,
        ),
      );
    fc.assert(
      fc.property(arbCase, ([stack, index, f]) => {
        const before = structuredClone(stack);
        const target = stockOf(before)[index];
        const result = updateItem({
          stack,
          stockCardId: STOCK_ID,
          itemId: target.id,
          name: `${f.before}${f.name}${f.after}`,
          quantity: f.quantity,
          costPrice: f.costPrice,
          sellPrice: f.sellPrice,
          lowStockLevel: f.lowStockLevel,
        });
        expect(result.ok).toBe(true);
        if (!result.ok) return;

        const oldItems = stockOf(before);
        const newItems = stockOf(result.value);
        expect(newItems).toHaveLength(oldItems.length);
        newItems.forEach((item, i) => {
          if (i === index) {
            expect(item).toEqual({
              id: target.id,
              name: f.name,
              quantity: f.quantity,
              costPrice: f.costPrice,
              sellPrice: f.sellPrice,
              lowStockLevel: f.lowStockLevel,
            });
          } else {
            expect(item).toEqual(oldItems[i]);
          }
        });
        expect(nonStockCards(result.value)).toEqual(nonStockCards(before));
        expect(stack).toEqual(before);
      }),
      RUNS,
    );
  });
});

describe("Property 3: deleting an item shrinks the list by one and preserves order and sales", () => {
  it("**Validates: Requirements 3.1, 3.5, 3.6, 14.7, 14.8**", () => {
    const arbCase = arbStack
      .filter((s) => stockOf(s).length > 0)
      .chain((s) =>
        fc.tuple(
          fc.constant(s),
          fc.integer({ min: 0, max: stockOf(s).length - 1 }),
        ),
      );
    fc.assert(
      fc.property(arbCase, ([stack, index]) => {
        const before = structuredClone(stack);
        const target = stockOf(before)[index];
        const result = deleteItem({
          stack,
          stockCardId: STOCK_ID,
          itemId: target.id,
        });
        expect(result.ok).toBe(true);
        if (!result.ok) return;

        const expected = stockOf(before).filter((_, i) => i !== index);
        expect(stockOf(result.value)).toEqual(expected);
        expect(stockOf(result.value)).toHaveLength(stockOf(before).length - 1);
        expect(nonStockCards(result.value)).toEqual(nonStockCards(before));
        expect(stack).toEqual(before);
      }),
      RUNS,
    );
  });
});

// ---- Rejected calls (Properties 4 to 6) ----

const arbBadCount = fc.constantFrom(
  -1,
  -5,
  1.5,
  0.1,
  NaN,
  Infinity,
  -Infinity,
);

const arbBadMoney = fc.constantFrom(
  -1,
  -100,
  1.5,
  NaN,
  Infinity,
  -Infinity,
  Number.MAX_SAFE_INTEGER + 1,
);

const arbBlankName = fc.constantFrom("", " ", "   ", "\t", "\n ");

type Fault =
  | "name"
  | "quantity"
  | "lowStockLevel"
  | "costPrice"
  | "sellPrice"
  | "card"
  | "wrongCardKind"
  | "duplicate"
  | "itemNotFound";

/** Valid fields with exactly one thing wrong. */
const arbRejectedFields = (faults: Fault[]) =>
  fc
    .tuple(arbFields, fc.constantFrom(...faults), arbBlankName, arbBadCount, arbBadMoney)
    .map(([f, fault, blank, badCount, badMoney]) => {
      const fields = {
        name: f.name,
        quantity: f.quantity,
        costPrice: f.costPrice,
        sellPrice: f.sellPrice,
        lowStockLevel: f.lowStockLevel,
      };
      let stockCardId = STOCK_ID;
      if (fault === "name") fields.name = blank;
      if (fault === "quantity") fields.quantity = badCount;
      if (fault === "lowStockLevel") fields.lowStockLevel = badCount;
      if (fault === "costPrice") fields.costPrice = badMoney;
      if (fault === "sellPrice") fields.sellPrice = badMoney;
      if (fault === "card") stockCardId = "missing-card";
      if (fault === "wrongCardKind") stockCardId = SALES_ID;
      return { fault, fields, stockCardId };
    });

describe("Property 4: rejected addItem calls never change the Stack", () => {
  it("**Validates: Requirements 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 14.4**", () => {
    const arbCase = arbStack.chain((stack) => {
      const existing = stockOf(stack).map((i) => i.id);
      const faults: Fault[] = [
        "name",
        "quantity",
        "lowStockLevel",
        "costPrice",
        "sellPrice",
        "card",
        "wrongCardKind",
      ];
      if (existing.length > 0) faults.push("duplicate");
      return fc.tuple(
        fc.constant(stack),
        arbRejectedFields(faults),
        fc.constantFrom(...(existing.length > 0 ? existing : ["x"])),
      );
    });
    fc.assert(
      fc.property(arbCase, ([stack, bad, existingId]) => {
        const before = structuredClone(stack);
        const result = addItem({
          stack,
          stockCardId: bad.stockCardId,
          itemId: bad.fault === "duplicate" ? existingId : "new-item",
          ...bad.fields,
        });
        expect(result.ok).toBe(false);
        expect(stack).toEqual(before);
      }),
      RUNS,
    );
  });
});

describe("Property 5: rejected updateItem calls never change the Stack", () => {
  it("**Validates: Requirements 2.4, 2.5, 2.6, 2.8, 14.4**", () => {
    const arbCase = arbStack
      .filter((s) => stockOf(s).length > 0)
      .chain((s) =>
        fc.tuple(
          fc.constant(s),
          fc.constantFrom(...stockOf(s).map((i) => i.id)),
          arbRejectedFields([
            "name",
            "quantity",
            "lowStockLevel",
            "costPrice",
            "sellPrice",
            "card",
            "wrongCardKind",
            "itemNotFound",
          ]),
        ),
      );
    fc.assert(
      fc.property(arbCase, ([stack, existingId, bad]) => {
        const before = structuredClone(stack);
        const result = updateItem({
          stack,
          stockCardId: bad.stockCardId,
          itemId: bad.fault === "itemNotFound" ? "missing-item" : existingId,
          ...bad.fields,
        });
        expect(result.ok).toBe(false);
        expect(stack).toEqual(before);
      }),
      RUNS,
    );
  });
});

describe("Property 6: rejected deleteItem calls never change the Stack", () => {
  it("**Validates: Requirements 3.3, 3.4, 3.6, 14.4**", () => {
    const arbCase = fc.tuple(
      arbStack,
      fc.constantFrom("card", "wrongCardKind", "itemNotFound"),
    );
    fc.assert(
      fc.property(arbCase, ([stack, fault]) => {
        const before = structuredClone(stack);
        const stockCardId =
          fault === "card"
            ? "missing-card"
            : fault === "wrongCardKind"
              ? SALES_ID
              : STOCK_ID;
        const result = deleteItem({
          stack,
          stockCardId,
          itemId: fault === "itemNotFound" ? "missing-item" : "item-0",
        });
        expect(result.ok).toBe(false);
        expect(stack).toEqual(before);
      }),
      RUNS,
    );
  });
});

// ---- Frozen input (Property 7) ----

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const key of Object.keys(value)) {
      deepFreeze((value as Record<string, unknown>)[key]);
    }
  }
  return value;
}

describe("Property 7: item functions never mutate a frozen input", () => {
  it("**Validates: Requirements 1.9, 2.8, 3.6, 14.3, 14.7, 14.8**", () => {
    const arbCase = fc.tuple(
      arbStack,
      arbItem,
      fc.constantFrom("addItem", "updateItem", "deleteItem", "isLowStock", "isOutOfStock"),
      arbFields,
      arbRejectedFields([
        "name",
        "quantity",
        "lowStockLevel",
        "costPrice",
        "sellPrice",
        "card",
        "wrongCardKind",
        "duplicate",
        "itemNotFound",
      ]),
      fc.boolean(),
      fc.nat({ max: 7 }),
    );
    fc.assert(
      fc.property(arbCase, ([stack, item, fn, f, bad, valid, n]) => {
        const stackSnapshot = structuredClone(stack);
        const itemSnapshot = structuredClone(item);
        deepFreeze(stack);
        deepFreeze(item);

        // Valid calls use real ids; invalid calls use the faulty input.
        const existingId = `item-${n}`;
        const fields = valid
          ? {
            name: `${f.before}${f.name}${f.after}`,
            quantity: f.quantity,
            costPrice: f.costPrice,
            sellPrice: f.sellPrice,
            lowStockLevel: f.lowStockLevel,
          }
          : bad.fields;
        const stockCardId = valid ? STOCK_ID : bad.stockCardId;

        if (fn === "addItem") {
          const itemId =
            valid || bad.fault !== "duplicate" ? "new-item" : "item-0";
          addItem({ stack, stockCardId, itemId, ...fields });
        } else if (fn === "updateItem") {
          const itemId =
            valid || bad.fault !== "itemNotFound" ? existingId : "missing-item";
          updateItem({ stack, stockCardId, itemId, ...fields });
        } else if (fn === "deleteItem") {
          const itemId =
            valid || bad.fault !== "itemNotFound" ? existingId : "missing-item";
          deleteItem({ stack, stockCardId, itemId });
        } else if (fn === "isLowStock") {
          expect(typeof isLowStock(item)).toBe("boolean");
        } else {
          expect(typeof isOutOfStock(item)).toBe("boolean");
        }

        expect(stack).toEqual(stackSnapshot);
        expect(item).toEqual(itemSnapshot);
      }),
      RUNS,
    );
  });
});

// ---- Add/update agreement (Property 8) ----

describe("Property 8: addItem and updateItem agree on validation errors", () => {
  it("**Validates: Requirements 2.4, 14.7, 14.8**", () => {
    const arbMaybe = <T>(good: fc.Arbitrary<T>, bad: fc.Arbitrary<T>) =>
      fc.tuple(fc.boolean(), good, bad).map(([isBad, g, b]) => ({
        isBad,
        value: isBad ? b : g,
      }));
    const arbCase = fc
      .tuple(
        arbStack.filter((s) => stockOf(s).length > 0),
        arbMaybe(arbName, arbBlankName),
        arbMaybe<number>(arbCount, arbBadCount),
        arbMaybe<number>(arbCount, arbBadCount),
        arbMaybe<number>(arbKobo, arbBadMoney),
        arbMaybe<number>(arbKobo, arbBadMoney),
      )
      .filter(([, n, q, l, c, s]) => n.isBad || q.isBad || l.isBad || c.isBad || s.isBad);
    fc.assert(
      fc.property(arbCase, ([stack, n, q, l, c, s]) => {
        const fields = {
          name: n.value,
          quantity: q.value,
          lowStockLevel: l.value,
          costPrice: c.value,
          sellPrice: s.value,
        };
        const existingId = stockOf(stack)[0].id;
        const added = addItem({
          stack,
          stockCardId: STOCK_ID,
          itemId: "new-item",
          ...fields,
        });
        const updated = updateItem({
          stack,
          stockCardId: STOCK_ID,
          itemId: existingId,
          ...fields,
        });
        expect(added.ok).toBe(false);
        expect(updated.ok).toBe(false);
        if (added.ok || updated.ok) return;
        expect(added.error.code).toBe(updated.error.code);
      }),
      RUNS,
    );
  });
});

// ---- Stock checks (Property 9) ----

describe("Property 9: isLowStock and isOutOfStock match their definitions", () => {
  it("**Validates: Requirements 4.3, 4.4, 14.7, 14.8**", () => {
    fc.assert(
      fc.property(arbItem, (item) => {
        expect(isLowStock(item)).toBe(item.quantity <= item.lowStockLevel);
        expect(isOutOfStock(item)).toBe(item.quantity === 0);
      }),
      RUNS,
    );
  });
});

// ---- Operation sequences (Property 13) ----

type ItemOperation =
  | { kind: "addItem"; itemId: string; fields: ItemFields; stockCardId: string }
  | { kind: "updateItem"; itemId: string; fields: ItemFields; stockCardId: string }
  | { kind: "deleteItem"; itemId: string; stockCardId: string }
  | {
    kind: "recordSale";
    itemId: string;
    quantity: number;
    saleId: string;
    stockCardId: string;
    salesCardId: string;
  };

interface ItemFields {
  name: string;
  quantity: number;
  costPrice: number;
  sellPrice: number;
  lowStockLevel: number;
}

const arbMaybeBad = <T>(good: fc.Arbitrary<T>, bad: fc.Arbitrary<T>) =>
  fc.oneof({ weight: 3, arbitrary: good }, { weight: 1, arbitrary: bad });

const arbOpFields: fc.Arbitrary<ItemFields> = fc.record({
  name: arbMaybeBad(arbName, arbBlankName),
  quantity: arbMaybeBad<number>(arbCount, arbBadCount),
  costPrice: arbMaybeBad<number>(arbKobo, arbBadMoney),
  sellPrice: arbMaybeBad<number>(arbKobo, arbBadMoney),
  lowStockLevel: arbMaybeBad<number>(arbCount, arbBadCount),
});

const arbOpItemId = fc.oneof(
  fc.integer({ min: 0, max: 7 }).map((n) => `item-${n}`),
  fc.integer({ min: 0, max: 3 }).map((n) => `new-${n}`),
);
const arbOpStockId = arbMaybeBad(
  fc.constant(STOCK_ID),
  fc.constantFrom("missing-card", SALES_ID),
);
const arbOpSalesId = arbMaybeBad(
  fc.constant(SALES_ID),
  fc.constantFrom("missing-card", STOCK_ID),
);

/** One addItem, updateItem, deleteItem or recordSale input, valid or not. */
export const arbItemOperation: fc.Arbitrary<ItemOperation> = fc.oneof(
  fc.record({
    kind: fc.constant("addItem" as const),
    itemId: arbOpItemId,
    fields: arbOpFields,
    stockCardId: arbOpStockId,
  }),
  fc.record({
    kind: fc.constant("updateItem" as const),
    itemId: arbOpItemId,
    fields: arbOpFields,
    stockCardId: arbOpStockId,
  }),
  fc.record({
    kind: fc.constant("deleteItem" as const),
    itemId: arbOpItemId,
    stockCardId: arbOpStockId,
  }),
  fc.record({
    kind: fc.constant("recordSale" as const),
    itemId: arbOpItemId,
    quantity: arbMaybeBad<number>(
      fc.integer({ min: 1, max: 60 }),
      fc.constantFrom(0, -1, 1.5, NaN, Infinity),
    ),
    saleId: fc.integer({ min: 0, max: 20 }).map((n) => `op-sale-${n}`),
    stockCardId: arbOpStockId,
    salesCardId: arbOpSalesId,
  }),
);

function applyOperation(stack: Stack, op: ItemOperation): Stack {
  const result =
    op.kind === "addItem"
      ? addItem({ stack, stockCardId: op.stockCardId, itemId: op.itemId, ...op.fields })
      : op.kind === "updateItem"
        ? updateItem({ stack, stockCardId: op.stockCardId, itemId: op.itemId, ...op.fields })
        : op.kind === "deleteItem"
          ? deleteItem({ stack, stockCardId: op.stockCardId, itemId: op.itemId })
          : recordSale({
            stack,
            stockCardId: op.stockCardId,
            salesCardId: op.salesCardId,
            itemId: op.itemId,
            quantity: op.quantity,
            saleId: op.saleId,
            time: "2024-01-01T00:00:00.000Z",
          });
  return result.ok ? result.value : stack;
}

function containsNaN(value: unknown): boolean {
  if (typeof value === "number") return Number.isNaN(value);
  if (value !== null && typeof value === "object") {
    return Object.values(value).some(containsNaN);
  }
  return false;
}

const isSafeMoneyValue = (n: number) => Number.isSafeInteger(n) && n >= 0;

function expectNoInvalidNumbers(stack: Stack) {
  expect(containsNaN(stack)).toBe(false);
  for (const card of stack.cards) {
    if (card.type === "stock") {
      for (const item of card.items) {
        expect(Number.isSafeInteger(item.quantity) && item.quantity >= 0).toBe(true);
        expect(Number.isSafeInteger(item.lowStockLevel) && item.lowStockLevel >= 0).toBe(true);
        expect(isSafeMoneyValue(item.costPrice)).toBe(true);
        expect(isSafeMoneyValue(item.sellPrice)).toBe(true);
      }
    } else if (card.type === "sales-log") {
      for (const sale of card.sales) {
        expect(Number.isSafeInteger(sale.quantity) && sale.quantity >= 1).toBe(true);
        expect(isSafeMoneyValue(sale.unitPrice)).toBe(true);
        expect(isSafeMoneyValue(sale.unitCost)).toBe(true);
        expect(isSafeMoneyValue(sale.quantity * sale.unitPrice)).toBe(true);
      }
    }
  }
}

describe("Property 13: no sequence of item and sale operations produces an invalid number", () => {
  it("**Validates: Requirements 14.2, 14.7, 14.8**", () => {
    // Start with no Sales so every Sale in the Stack came from recordSale.
    const arbStart = arbStack.map(
      (s): Stack => ({
        ...s,
        cards: s.cards.map((c) => (c.type === "sales-log" ? { ...c, sales: [] } : c)),
      }),
    );
    fc.assert(
      fc.property(
        arbStart,
        fc.array(arbItemOperation, { minLength: 1, maxLength: 25 }),
        (start, ops) => {
          expectNoInvalidNumbers(start);
          let stack = start;
          for (const op of ops) {
            stack = applyOperation(stack, op);
            expectNoInvalidNumbers(stack);
          }
        },
      ),
      RUNS,
    );
  });
});
