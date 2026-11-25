import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { DEFAULT_CURRENCY, SCHEMA_VERSION } from "../domain/types";
import { isStack } from "../storage/isStack";
import { buildFarmStallStack, buildStarterStack, type StarterStackIds } from "./starterStack";

const ids: StarterStackIds = {
  stackId: "s1",
  stockCardId: "c1",
  salesCardId: "c2",
  debtsCardId: "c3",
  summaryCardId: "c4",
};

describe("buildFarmStallStack", () => {
  it("sets id, name, schema version and currency", () => {
    const s = buildFarmStallStack(ids);
    expect(s.id).toBe("s1");
    expect(s.name).toBe("Farm produce stall");
    expect(s.schemaVersion).toBe(SCHEMA_VERSION);
    expect(s.currency).toBe(DEFAULT_CURRENCY);
    expect(s.currency).toBe(buildStarterStack(ids).currency);
    expect(s.schemaVersion).toBe(buildStarterStack(ids).schemaVersion);
  });

  it("has four cards in order with types, titles and ids", () => {
    expect(buildFarmStallStack(ids).cards.map((c) => [c.id, c.type, c.title])).toEqual([
      ["c1", "stock", "Produce in stock"],
      ["c2", "sales-log", "Sales book"],
      ["c3", "debts", "Money owed to you"],
      ["c4", "daily-summary", "Today's totals"],
    ]);
  });

  it("starts with empty records and no hidden card", () => {
    const s = buildFarmStallStack(ids);
    expect(s.cards[0]).toMatchObject({ items: [] });
    expect(s.cards[1]).toMatchObject({ sales: [] });
    expect(s.cards[2]).toMatchObject({ debts: [] });
    expect(s.cards.some((c) => "hidden" in c)).toBe(false);
  });

  it("passes isStack", () => {
    expect(isStack(buildFarmStallStack(ids))).toBe(true);
  });
});

describe("Property 13: each Starter_Function returns its fixed shape", () => {
  // Feature: builder-mode-and-starter-stacks, Property 13: Each Starter_Function returns its fixed shape for any ids, and the result is always accepted by the Stack_Checker
  // **Validates: Requirements 9.2, 9.3, 9.4, 9.5, 9.6, 9.7, 9.8, 13.7**
  const expected = [
    {
      build: buildStarterStack,
      name: "Provisions shop",
      titles: ["Stock", "Sales log", "Money owed to you", "Daily summary"],
    },
    {
      build: buildFarmStallStack,
      name: "Farm produce stall",
      titles: ["Produce in stock", "Sales book", "Money owed to you", "Today's totals"],
    },
  ];

  it("holds for any non-empty-string ids", () => {
    const idArb = fc.string({ minLength: 1 });
    fc.assert(
      fc.property(
        fc.record({
          stackId: idArb,
          stockCardId: idArb,
          salesCardId: idArb,
          debtsCardId: idArb,
          summaryCardId: idArb,
        }),
        (input) => {
          for (const { build, name, titles } of expected) {
            const s = build(input);
            expect(s.id).toBe(input.stackId);
            expect(s.name).toBe(name);
            expect(s.schemaVersion).toBe(SCHEMA_VERSION);
            expect(s.currency).toBe(DEFAULT_CURRENCY);
            expect(s.cards.map((c) => [c.id, c.type, c.title])).toEqual([
              [input.stockCardId, "stock", titles[0]],
              [input.salesCardId, "sales-log", titles[1]],
              [input.debtsCardId, "debts", titles[2]],
              [input.summaryCardId, "daily-summary", titles[3]],
            ]);
            expect(s.cards[0]).toMatchObject({ items: [] });
            expect(s.cards[1]).toMatchObject({ sales: [] });
            expect(s.cards[2]).toMatchObject({ debts: [] });
            expect(s.cards.some((c) => "hidden" in c)).toBe(false);
            expect(build({ ...input })).toEqual(s);
            expect(isStack(s)).toBe(true);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
