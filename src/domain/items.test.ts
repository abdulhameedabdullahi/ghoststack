import { describe, expect, it } from "vitest";
import {
  addItem,
  deleteItem,
  isLowStock,
  isOutOfStock,
  updateItem,
  type AddItemInput,
} from "./items";
import type { Item, Sale, Stack, StockCard } from "./types";

const rice: Item = {
  id: "i-1",
  name: "Rice",
  quantity: 10,
  costPrice: 100,
  sellPrice: 150,
  lowStockLevel: 2,
};
const sale: Sale = {
  id: "s-1",
  itemId: "i-1",
  quantity: 1,
  unitPrice: 150,
  unitCost: 100,
  time: "2024-01-01T10:00:00Z",
};

function makeStack(): Stack {
  return {
    schemaVersion: 1,
    id: "stack-1",
    name: "Shop",
    currency: "NGN",
    cards: [
      { id: "stock-1", title: "Stock", type: "stock", items: [rice] },
      { id: "stock-2", title: "Stock B", type: "stock", items: [] },
      { id: "sales-1", title: "Sales", type: "sales-log", sales: [sale] },
    ],
  };
}

const addInput = (over: Partial<AddItemInput> = {}): AddItemInput => ({
  stack: makeStack(),
  stockCardId: "stock-1",
  itemId: "i-2",
  name: "Beans",
  quantity: 5,
  costPrice: 200,
  sellPrice: 300,
  lowStockLevel: 1,
  ...over,
});

const updInput = (over: Partial<AddItemInput> = {}) =>
  addInput({ itemId: "i-1", ...over });

function code(r: { ok: boolean; error?: { code: string } }) {
  return r.ok ? "OK" : r.error?.code;
}

describe("addItem", () => {
  it("adds an item to the end of the card", () => {
    const r = addItem(addInput());
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const card = r.value.cards[0] as StockCard;
    expect(card.items.map((i) => i.id)).toEqual(["i-1", "i-2"]);
    expect(card.items[1]).toMatchObject({ name: "Beans", quantity: 5 });
  });

  it("trims the name", () => {
    const r = addItem(addInput({ name: "  Rice  " }));
    expect(r.ok && (r.value.cards[0] as StockCard).items[1].name).toBe("Rice");
  });

  it("rejects a duplicate id, even on another stock card", () => {
    expect(code(addItem(addInput({ itemId: "i-1" })))).toBe("DUPLICATE_ID");
    expect(code(addItem(addInput({ itemId: "i-1", stockCardId: "stock-2" })))).toBe("DUPLICATE_ID");
  });

  it("rejects a blank name", () => {
    expect(code(addItem(addInput({ name: "   " })))).toBe("BAD_ITEM_NAME");
  });

  it("rejects a bad quantity", () => {
    expect(code(addItem(addInput({ quantity: -1 })))).toBe("BAD_QUANTITY");
    expect(code(addItem(addInput({ quantity: 1.5 })))).toBe("BAD_QUANTITY");
  });

  it("rejects a bad low-stock level", () => {
    expect(code(addItem(addInput({ lowStockLevel: -1 })))).toBe("BAD_QUANTITY");
    expect(code(addItem(addInput({ lowStockLevel: 0.5 })))).toBe("BAD_QUANTITY");
  });

  it("rejects a bad cost price", () => {
    expect(code(addItem(addInput({ costPrice: -1 })))).toBe("BAD_PRICE");
  });

  it("rejects a bad sell price", () => {
    expect(code(addItem(addInput({ sellPrice: NaN })))).toBe("BAD_PRICE");
  });

  it("rejects a missing card", () => {
    expect(code(addItem(addInput({ stockCardId: "nope" })))).toBe("CARD_NOT_FOUND");
  });

  it("rejects a card of the wrong kind", () => {
    expect(code(addItem(addInput({ stockCardId: "sales-1" })))).toBe("CARD_NOT_FOUND");
  });
});

describe("updateItem", () => {
  it("replaces fields, keeps id and position, and trims the name", () => {
    const stack = makeStack();
    (stack.cards[0] as StockCard).items.push({ ...rice, id: "i-3", name: "Salt" });
    const r = updateItem(updInput({ stack, name: "  Rice  ", quantity: 7 }));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const items = (r.value.cards[0] as StockCard).items;
    expect(items.map((i) => i.id)).toEqual(["i-1", "i-3"]);
    expect(items[0]).toMatchObject({ name: "Rice", quantity: 7, costPrice: 200 });
  });

  it("rejects a blank name", () => {
    expect(code(updateItem(updInput({ name: "" })))).toBe("BAD_ITEM_NAME");
  });

  it("rejects a bad quantity", () => {
    expect(code(updateItem(updInput({ quantity: -2 })))).toBe("BAD_QUANTITY");
  });

  it("rejects a bad low-stock level", () => {
    expect(code(updateItem(updInput({ lowStockLevel: 1.2 })))).toBe("BAD_QUANTITY");
  });

  it("rejects a bad cost price", () => {
    expect(code(updateItem(updInput({ costPrice: 1.5 })))).toBe("BAD_PRICE");
  });

  it("rejects a bad sell price", () => {
    expect(code(updateItem(updInput({ sellPrice: -5 })))).toBe("BAD_PRICE");
  });

  it("rejects a missing card", () => {
    expect(code(updateItem(updInput({ stockCardId: "nope" })))).toBe("CARD_NOT_FOUND");
  });

  it("rejects a card of the wrong kind", () => {
    expect(code(updateItem(updInput({ stockCardId: "sales-1" })))).toBe("CARD_NOT_FOUND");
  });

  it("rejects a missing item", () => {
    expect(code(updateItem(updInput({ itemId: "nope" })))).toBe("ITEM_NOT_FOUND");
  });

  it("leaves Sales unchanged", () => {
    const r = updateItem(updInput({ sellPrice: 999 }));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.cards[2]).toEqual(makeStack().cards[2]);
  });
});

describe("deleteItem", () => {
  const del = (over = {}) => ({
    stack: makeStack(),
    stockCardId: "stock-1",
    itemId: "i-1",
    ...over,
  });

  it("removes the item", () => {
    const r = deleteItem(del());
    expect(r.ok && (r.value.cards[0] as StockCard).items).toEqual([]);
  });

  it("rejects a missing card", () => {
    expect(code(deleteItem(del({ stockCardId: "nope" })))).toBe("CARD_NOT_FOUND");
  });

  it("rejects a card of the wrong kind", () => {
    expect(code(deleteItem(del({ stockCardId: "sales-1" })))).toBe("CARD_NOT_FOUND");
  });

  it("rejects a missing item", () => {
    expect(code(deleteItem(del({ itemId: "nope" })))).toBe("ITEM_NOT_FOUND");
  });

  it("leaves Sales unchanged", () => {
    const r = deleteItem(del());
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.cards[2]).toEqual(makeStack().cards[2]);
  });
});

describe("isLowStock / isOutOfStock boundaries", () => {
  const item = (quantity: number, lowStockLevel: number): Item => ({
    ...rice,
    quantity,
    lowStockLevel,
  });

  it("isLowStock is true at and below the level, false above", () => {
    expect(isLowStock(item(2, 2))).toBe(true);
    expect(isLowStock(item(1, 2))).toBe(true);
    expect(isLowStock(item(3, 2))).toBe(false);
    expect(isLowStock(item(0, 0))).toBe(true);
  });

  it("isOutOfStock is true only at zero", () => {
    expect(isOutOfStock(item(0, 2))).toBe(true);
    expect(isOutOfStock(item(1, 2))).toBe(false);
  });
});
