import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { BANNED_WORDS, TIPS, pickTip, type TipKind } from "./ghostTips";

const NUM_RUNS = 100;
const KINDS = Object.keys(TIPS) as TipKind[];
const ALL_TIPS = KINDS.flatMap((k) => [...TIPS[k]]);

function findBanned(tip: string): string[] {
  return BANNED_WORDS.filter((w) =>
    new RegExp(`\\b${w}\\b`, "i").test(tip),
  );
}

const kindArb = fc.constantFrom(...KINDS);
const counterArb = fc.integer({ min: -1_000_000, max: 1_000_000 });

describe("ghostTips", () => {
  // Feature: ghost-companion, Property 10: Tips are short and free of banned words
  // **Validates: Requirements 7.2, 11.4, 13.1, 13.6**
  it("Property 10: every tip is at most 60 chars with no banned words", () => {
    fc.assert(
      fc.property(fc.constantFrom(...ALL_TIPS), (tip) => {
        expect(tip.length).toBeLessThanOrEqual(60);
        expect(findBanned(tip)).toEqual([]);
      }),
      { numRuns: NUM_RUNS },
    );
  });

  // Feature: ghost-companion, Property 11: pickTip stays in its group and cycles
  // **Validates: Requirements 11.1, 11.2, 11.5**
  it("Property 11: pickTip stays in group, is periodic, and advances by one", () => {
    fc.assert(
      fc.property(
        kindArb,
        counterArb,
        fc.integer({ min: -50, max: 50 }),
        (kind, c, k) => {
          const list = TIPS[kind];
          const n = list.length;
          expect(list).toContain(pickTip(kind, c));
          expect(pickTip(kind, c + k * n)).toBe(pickTip(kind, c));
          const i = list.indexOf(pickTip(kind, c));
          expect(pickTip(kind, c + 1)).toBe(list[(i + 1) % n]);
        },
      ),
      { numRuns: NUM_RUNS },
    );
  });

  it("every kind has at least 2 non-empty tips", () => {
    for (const kind of KINDS) {
      expect(TIPS[kind].length).toBeGreaterThanOrEqual(2);
      for (const tip of TIPS[kind]) expect(tip.trim().length).toBeGreaterThan(0);
    }
  });

  it("banned-word matcher catches a made-up tip", () => {
    expect(findBanned("Sync your inventory")).toEqual(["inventory", "sync"]);
    expect(findBanned("Tap Add an item")).toEqual([]);
  });
});
