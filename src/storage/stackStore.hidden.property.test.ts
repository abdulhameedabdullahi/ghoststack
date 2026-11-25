import "fake-indexeddb/auto";
import fc from "fast-check";
import { deleteDB } from "idb";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Card, Stack } from "../domain/types";
import { DB_NAME, openGhostDb, STACKS_STORE } from "./db";
import type { GhostDb } from "./db";
import { loadStack, saveStack } from "./stackStore";

/** Hidden flag: key absent, true, or false. */
const hiddenArb = fc.constantFrom<boolean | undefined>(undefined, true, false);

const withHidden = <T extends Card>(card: T, hidden: boolean | undefined): T =>
  hidden === undefined ? card : { ...card, hidden };

const cardArb = (id: string): fc.Arbitrary<Card> =>
  fc
    .tuple(
      fc.constantFrom("stock", "sales-log", "debts", "daily-summary"),
      fc.string({ minLength: 1, maxLength: 20 }).filter((s) => s.trim().length > 0),
      hiddenArb,
    )
    .map(([type, title, hidden]): Card => {
      switch (type) {
        case "stock":
          return withHidden(
            {
              id,
              type,
              title,
              items: [
                { id: `${id}-i`, name: "Rice", quantity: 3, costPrice: 100, sellPrice: 150, lowStockLevel: 1 },
              ],
            },
            hidden,
          );
        case "sales-log":
          return withHidden({ id, type, title, sales: [] }, hidden);
        case "debts":
          return withHidden({ id, type, title, debts: [] }, hidden);
        default:
          return withHidden({ id, type: "daily-summary", title }, hidden);
      }
    });

const stackArb: fc.Arbitrary<Stack> = fc
  .integer({ min: 1, max: 6 })
  .chain((n) =>
    fc.tuple(
      fc.string({ minLength: 1, maxLength: 20 }).filter((s) => s.trim().length > 0),
      fc.tuple(...Array.from({ length: n }, (_, i) => cardArb(`c${i}`))),
    ),
  )
  .map(([name, cards]) => ({
    schemaVersion: 1,
    id: "s1",
    name,
    currency: "NGN",
    cards,
  }));

let db: GhostDb;

beforeAll(async () => {
  await deleteDB(DB_NAME);
  db = await openGhostDb();
});

afterAll(async () => {
  db.close();
  await deleteDB(DB_NAME);
});

describe("stackStore hidden flags (property)", () => {
  // Feature: builder-mode-and-starter-stacks, Property 15: hidden flags survive save and load
  // **Validates: Requirements 5.7**
  it("save then load preserves hidden flags exactly", async () => {
    await fc.assert(
      fc.asyncProperty(stackArb, async (stack) => {
        await db.clear(STACKS_STORE);
        expect(await saveStack(stack, db)).toEqual({ ok: true });
        const r = await loadStack(stack.id, db);
        expect(r.ok).toBe(true);
        if (r.ok) expect(r.value).toStrictEqual(stack);
      }),
      { numRuns: 100 },
    );
  });
});
