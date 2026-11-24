import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { DEFAULT_CURRENCY, SCHEMA_VERSION } from "../domain/types";
import { isStack } from "../storage/isStack";
import { buildStarterStack, type StarterStackIds } from "./starterStack";

const ids: StarterStackIds = {
  stackId: "s1",
  stockCardId: "c1",
  salesCardId: "c2",
  debtsCardId: "c3",
  summaryCardId: "c4",
};

describe("buildStarterStack", () => {
  it("sets name, schema version and currency", () => {
    const s = buildStarterStack(ids);
    expect(s.id).toBe("s1");
    expect(s.name).toBe("Provisions shop");
    expect(s.schemaVersion).toBe(SCHEMA_VERSION);
    expect(s.currency).toBe(DEFAULT_CURRENCY);
  });

  it("has four cards in order with types, titles and ids", () => {
    const s = buildStarterStack(ids);
    expect(s.cards.map((c) => [c.id, c.type, c.title])).toEqual([
      ["c1", "stock", "Stock"],
      ["c2", "sales-log", "Sales log"],
      ["c3", "debts", "Money owed to you"],
      ["c4", "daily-summary", "Daily summary"],
    ]);
  });

  it("starts with empty lists", () => {
    const [stock, sales, debts] = buildStarterStack(ids).cards;
    expect(stock).toMatchObject({ items: [] });
    expect(sales).toMatchObject({ sales: [] });
    expect(debts).toMatchObject({ debts: [] });
  });

  it("is deterministic for the same ids", () => {
    expect(buildStarterStack(ids)).toEqual(buildStarterStack({ ...ids }));
  });

  it("passes isStack", () => {
    expect(isStack(buildStarterStack(ids))).toBe(true);
  });
});

describe("Property 12: starter stack has a fixed shape", () => {
  // Feature: app-shell-stock-card, Property 12: The starter stack always has the same fixed shape
  // **Validates: Requirements 13.1, 13.2, 13.3, 13.4, 13.5, 14.7, 14.8**
  it("holds for any five distinct ids", () => {
    fc.assert(
      fc.property(
        fc.uniqueArray(fc.string({ minLength: 1 }), { minLength: 5, maxLength: 5 }),
        ([stackId, stockCardId, salesCardId, debtsCardId, summaryCardId]) => {
          const input = { stackId, stockCardId, salesCardId, debtsCardId, summaryCardId };
          const s = buildStarterStack(input);
          expect(s.id).toBe(stackId);
          expect(s.name).toBe("Provisions shop");
          expect(s.schemaVersion).toBe(SCHEMA_VERSION);
          expect(s.currency).toBe(DEFAULT_CURRENCY);
          expect(s.cards.map((c) => [c.id, c.type, c.title])).toEqual([
            [stockCardId, "stock", "Stock"],
            [salesCardId, "sales-log", "Sales log"],
            [debtsCardId, "debts", "Money owed to you"],
            [summaryCardId, "daily-summary", "Daily summary"],
          ]);
          expect(s.cards[0]).toMatchObject({ items: [] });
          expect(s.cards[1]).toMatchObject({ sales: [] });
          expect(s.cards[2]).toMatchObject({ debts: [] });
          expect(buildStarterStack({ ...input })).toEqual(s);
          expect(isStack(s)).toBe(true);
        },
      ),
      { numRuns: 100 },
    );
  });
});
