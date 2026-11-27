import { describe, expect, it } from "vitest";
import { buildDailySummary } from "./buildDailySummary";
import { SHARE_ERROR_MESSAGES } from "./types";

const base = {
  shopName: "Mama Ife's Shop",
  dateLabel: "12 Mar 2025",
  salesKobo: 1250050,
  profitKobo: 300000,
  owedKobo: 50000,
  lowStockNames: ["Rice", "Beans"],
  language: "en" as const,
};

function textOf(overrides: Partial<typeof base>): string {
  const r = buildDailySummary({ ...base, ...overrides });
  if (!r.ok) throw new Error("expected ok");
  return r.value.text;
}

describe("buildDailySummary", () => {
  it("builds the exact five-line text for a known input", () => {
    expect(buildDailySummary(base)).toEqual({
      ok: true,
      value: {
        text: [
          "Mama Ife's Shop, 12 Mar 2025",
          "Sales: ₦12,500.50",
          "Profit: ₦3,000",
          "Owed to me: ₦500",
          "Low on stock: Rice, Beans",
        ].join("\n"),
      },
    });
  });

  it.each([
    [[], "nothing"],
    [["a"], "a"],
    [["a", "b", "c"], "a, b, c"],
    [["a", "b", "c", "d"], "a, b, c and 1 more"],
    [["a", "b", "c", "d", "e"], "a, b, c and 2 more"],
  ])("items line for %j", (names, expected) => {
    const lines = textOf({ lowStockNames: names }).split("\n");
    expect(lines).toHaveLength(5);
    expect(lines[4]).toBe(`Low on stock: ${expected}`);
  });

  it("drops empty item names before counting", () => {
    const lines = textOf({ lowStockNames: ["a", "", "  ", "b", "c", "d"] }).split("\n");
    expect(lines[4]).toBe("Low on stock: a, b, c and 1 more");
    expect(textOf({ lowStockNames: ["", " "] }).split("\n")[4]).toBe("Low on stock: nothing");
  });

  it("allows zero values", () => {
    const lines = textOf({ salesKobo: 0, profitKobo: 0, owedKobo: 0 }).split("\n");
    expect(lines.slice(1, 4)).toEqual(["Sales: ₦0", "Profit: ₦0", "Owed to me: ₦0"]);
  });

  const invalid = {
    ok: false,
    error: { code: "INVALID_AMOUNT", message: SHARE_ERROR_MESSAGES.INVALID_AMOUNT },
  };

  it.each(["salesKobo", "profitKobo", "owedKobo"] as const)(
    "returns INVALID_AMOUNT for negative, fractional or NaN %s",
    (field) => {
      for (const bad of [-1, 1.5, NaN]) {
        expect(buildDailySummary({ ...base, [field]: bad })).toEqual(invalid);
      }
    },
  );
});
