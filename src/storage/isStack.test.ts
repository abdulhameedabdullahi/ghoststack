import { describe, expect, it } from "vitest";
import { isStack } from "./isStack";

const good = () => ({
  schemaVersion: 1,
  id: "s1",
  name: "Shop",
  currency: "NGN",
  cards: [
    {
      id: "c1",
      type: "stock",
      title: "Stock",
      items: [{ id: "i1", name: "Rice", quantity: 3, costPrice: 100, sellPrice: 150, lowStockLevel: 1 }],
    },
    { id: "c2", type: "daily-summary", title: "Today" },
  ],
});

describe("isStack", () => {
  it("accepts a valid stack", () => {
    expect(isStack(good())).toBe(true);
  });

  it("rejects bad version, fractional quantity, unknown card type", () => {
    expect(isStack({ ...good(), schemaVersion: 2 })).toBe(false);
    const frac = good();
    (frac.cards[0] as any).items[0].quantity = 1.5;
    expect(isStack(frac)).toBe(false);
    const bad = good();
    (bad.cards[1] as any).type = "nope";
    expect(isStack(bad)).toBe(false);
    expect(isStack(null)).toBe(false);
  });
});
