import { describe, expect, it } from "vitest";
import { recordSale, saleTotal, type RecordSaleInput } from "./sales";
import type { Sale, SalesLogCard, Stack, StockCard } from "./types";

function deepFreeze<T>(o: T): T {
  if (o && typeof o === "object" && !Object.isFrozen(o)) {
    Object.freeze(o);
    for (const v of Object.values(o as object)) deepFreeze(v);
  }
  return o;
}

const existingSale: Sale = {
  id: "sale-0",
  itemId: "item-1",
  quantity: 1,
  unitPrice: 400,
  unitCost: 250,
  time: "2024-01-01T09:00:00.000Z",
};

function makeStack(): Stack {
  return {
    schemaVersion: 1,
    id: "stack-1",
    name: "Shop",
    currency: "NGN",
    cards: [
      {
        id: "stock-1",
        title: "Stock",
        type: "stock",
        items: [
          {
            id: "item-1",
            name: "Rice",
            quantity: 10,
            costPrice: 300,
            sellPrice: 500,
            lowStockLevel: 2,
          },
          {
            id: "item-2",
            name: "Beans",
            quantity: 5,
            costPrice: 100,
            sellPrice: 150,
            lowStockLevel: 1,
          },
        ],
      },
      { id: "sales-1", title: "Sales", type: "sales-log", sales: [existingSale] },
      { id: "debts-1", title: "Debts", type: "debts", debts: [] },
    ],
  };
}

function input(stack: Stack, over: Partial<RecordSaleInput> = {}): RecordSaleInput {
  return {
    stack,
    stockCardId: "stock-1",
    salesCardId: "sales-1",
    itemId: "item-1",
    quantity: 3,
    saleId: "sale-1",
    time: "2024-01-02T10:00:00.000Z",
    ...over,
  };
}

describe("saleTotal", () => {
  it("multiplies quantity by unit price", () => {
    expect(saleTotal({ ...existingSale, quantity: 3, unitPrice: 500 })).toBe(1500);
  });
});

describe("recordSale success", () => {
  it("lowers stock, appends the sale and copies prices", () => {
    const stack = deepFreeze(makeStack());
    const r = recordSale(input(stack));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const stock = r.value.cards[0] as StockCard;
    const sales = r.value.cards[1] as SalesLogCard;
    expect(stock.items[0].quantity).toBe(7);
    expect(stock.items[1].quantity).toBe(5);
    expect(sales.sales).toHaveLength(2);
    expect(sales.sales[0]).toEqual(existingSale);
    expect(sales.sales[1]).toEqual({
      id: "sale-1",
      itemId: "item-1",
      quantity: 3,
      unitPrice: 500,
      unitCost: 300,
      time: "2024-01-02T10:00:00.000Z",
    });
    expect(r.value.cards[2]).toBe(stack.cards[2]);
  });

  it("allows selling the whole stock down to zero", () => {
    const r = recordSale(input(makeStack(), { quantity: 10 }));
    expect(r.ok).toBe(true);
    if (r.ok) expect((r.value.cards[0] as StockCard).items[0].quantity).toBe(0);
  });

  it("does not change earlier sale prices when the item price changes later", () => {
    const stack = makeStack();
    (stack.cards[0] as StockCard).items[0].sellPrice = 999;
    const r = recordSale(input(stack));
    if (!r.ok) throw new Error("expected ok");
    const sales = (r.value.cards[1] as SalesLogCard).sales;
    expect(sales[0].unitPrice).toBe(400);
    expect(sales[1].unitPrice).toBe(999);
  });
});

describe("recordSale errors", () => {
  const code = (i: RecordSaleInput) => {
    const r = recordSale(i);
    return r.ok ? "OK" : r.error.code;
  };

  it("BAD_QUANTITY for zero, negative, fraction, NaN", () => {
    for (const q of [0, -1, 1.5, NaN, Infinity])
      expect(code(input(makeStack(), { quantity: q }))).toBe("BAD_QUANTITY");
  });

  it("CARD_NOT_FOUND for missing ids", () => {
    expect(code(input(makeStack(), { stockCardId: "nope" }))).toBe("CARD_NOT_FOUND");
    expect(code(input(makeStack(), { salesCardId: "nope" }))).toBe("CARD_NOT_FOUND");
  });

  it("CARD_NOT_FOUND for cards of the wrong kind", () => {
    expect(code(input(makeStack(), { stockCardId: "debts-1" }))).toBe("CARD_NOT_FOUND");
    expect(code(input(makeStack(), { stockCardId: "sales-1" }))).toBe("CARD_NOT_FOUND");
    expect(code(input(makeStack(), { salesCardId: "stock-1" }))).toBe("CARD_NOT_FOUND");
    expect(code(input(makeStack(), { salesCardId: "debts-1" }))).toBe("CARD_NOT_FOUND");
  });

  it("ITEM_NOT_FOUND for an unknown item", () => {
    expect(code(input(makeStack(), { itemId: "ghost" }))).toBe("ITEM_NOT_FOUND");
  });

  it("DUPLICATE_ID when the sale id is already used", () => {
    expect(code(input(makeStack(), { saleId: "sale-0" }))).toBe("DUPLICATE_ID");
  });

  it("DUPLICATE_ID when the id exists in another sales-log card", () => {
    const stack = makeStack();
    stack.cards.push({
      id: "sales-2",
      title: "More sales",
      type: "sales-log",
      sales: [{ ...existingSale, id: "sale-x" }],
    });
    expect(code(input(stack, { saleId: "sale-x" }))).toBe("DUPLICATE_ID");
  });

  it("NOT_ENOUGH_STOCK when quantity exceeds stock", () => {
    expect(code(input(makeStack(), { quantity: 11 }))).toBe("NOT_ENOUGH_STOCK");
  });

  it("AMOUNT_TOO_BIG when the total is not a safe integer", () => {
    const stack = makeStack();
    const item = (stack.cards[0] as StockCard).items[0];
    item.sellPrice = Number.MAX_SAFE_INTEGER;
    expect(code(input(stack, { quantity: 2 }))).toBe("AMOUNT_TOO_BIG");
  });

  it("error carries a message", () => {
    const r = recordSale(input(makeStack(), { quantity: 0 }));
    expect(!r.ok && r.error.message.length > 0).toBe(true);
  });
});

describe("recordSale does not mutate input", () => {
  it("leaves a deep-frozen stack unchanged on success", () => {
    const stack = deepFreeze(makeStack());
    const snapshot = structuredClone(stack);
    const r = recordSale(input(stack));
    expect(r.ok).toBe(true);
    expect(stack).toEqual(snapshot);
    if (r.ok) expect(r.value).not.toBe(stack);
  });

  it("leaves a deep-frozen stack unchanged on every error", () => {
    const stack = deepFreeze(makeStack());
    const snapshot = structuredClone(stack);
    const bad: Partial<RecordSaleInput>[] = [
      { quantity: 0 },
      { stockCardId: "nope" },
      { itemId: "ghost" },
      { saleId: "sale-0" },
      { quantity: 99 },
    ];
    for (const b of bad) expect(recordSale(input(stack, b)).ok).toBe(false);
    expect(stack).toEqual(snapshot);
  });
});
