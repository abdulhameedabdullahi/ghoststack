import { describe, expect, it } from "vitest";
import { TEMPLATES } from "./templates";

const t = TEMPLATES.en;

const BANNED = [
  "overdue",
  "final",
  "legal",
  "police",
  "court",
  "shame",
  "urgent",
  "immediately",
  "or else",
  "deadline",
  "pay now",
];

const EMOJI = /\p{Extended_Pictographic}/u;

const reminder = t.debtReminder({ personName: "Ada", shopName: "Mama Put", amount: "₦1,500" });
const summary = t.dailySummary({
  shopName: "Mama Put",
  dateLabel: "Mon 3 Mar",
  sales: "₦10,000",
  profit: "₦2,500",
  owed: "₦1,500",
  items: "Rice, Beans and 2 more",
});

describe("English templates", () => {
  it("builds the exact debt reminder text", () => {
    expect(reminder).toBe(
      "Hello Ada, a gentle reminder from Mama Put: you still owe ₦1,500. Thank you!",
    );
  });

  it("builds the exact daily summary text", () => {
    expect(summary).toBe(
      "Mama Put, Mon 3 Mar\nSales: ₦10,000\nProfit: ₦2,500\nOwed to me: ₦1,500\nLow on stock: Rice, Beans and 2 more",
    );
  });

  it("has the fallback names and item helpers", () => {
    expect(t.fallbackPerson).toBe("there");
    expect(t.fallbackShop).toBe("my shop");
    expect(t.itemsNone).toBe("nothing");
    expect(t.itemsSeparator).toBe(", ");
    expect(t.itemsMore(2)).toBe(" and 2 more");
  });

  it("uses no banned word in any template output", () => {
    const outputs = [
      reminder,
      summary,
      t.fallbackPerson,
      t.fallbackShop,
      t.itemsNone,
      t.itemsMore(5),
      t.dailySummary({
        shopName: t.fallbackShop,
        dateLabel: "x",
        sales: "₦0",
        profit: "₦0",
        owed: "₦0",
        items: t.itemsNone,
      }),
    ].map((s) => s.toLowerCase());
    for (const out of outputs) {
      for (const word of BANNED) expect(out).not.toContain(word);
    }
  });

  it("uses no emoji in any template output", () => {
    for (const out of [reminder, summary, t.itemsMore(3), t.fallbackPerson, t.fallbackShop, t.itemsNone]) {
      expect(EMOJI.test(out)).toBe(false);
    }
  });
});
