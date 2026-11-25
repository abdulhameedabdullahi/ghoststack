import { describe, expect, it } from "vitest";
import { addItem } from "../domain/items";
import { SCHEMA_VERSION, type Stack } from "../domain/types";
import { SAMPLE_ITEMS_BY_STARTER } from "./sampleItems";

const fixture: Stack = {
  schemaVersion: SCHEMA_VERSION,
  id: "stack-1",
  name: "Test stack",
  currency: "NGN",
  cards: [{ id: "stock-1", type: "stock", title: "Stock", items: [] }],
};

const lists = Object.entries(SAMPLE_ITEMS_BY_STARTER);

describe("SAMPLE_ITEMS_BY_STARTER", () => {
  it.each(lists)("%s has at least one entry", (_key, list) => {
    expect(list.length).toBeGreaterThanOrEqual(1);
  });

  it("the two lists share no name", () => {
    const a = new Set(SAMPLE_ITEMS_BY_STARTER.provisions.map((i) => i.name));
    const shared = SAMPLE_ITEMS_BY_STARTER["farm-stall"].filter((i) =>
      a.has(i.name),
    );
    expect(shared).toEqual([]);
  });

  it.each(lists)("%s: every name contains Sample", (_key, list) => {
    for (const item of list) expect(item.name).toContain("Sample");
  });

  it.each(lists)("%s: every entry is accepted by addItem", (_key, list) => {
    list.forEach((item, n) => {
      const result = addItem({
        stack: fixture,
        stockCardId: "stock-1",
        itemId: `item-${n}`,
        name: item.name,
        quantity: item.quantity,
        costPrice: item.costPrice,
        sellPrice: item.sellPrice,
        lowStockLevel: item.lowStockLevel,
      });
      expect(result.ok).toBe(true);
    });
  });
});
