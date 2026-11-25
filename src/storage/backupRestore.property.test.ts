import "fake-indexeddb/auto";
import fc from "fast-check";
import { deleteDB } from "idb";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { parseBackup, serializeStack } from "../domain-ui/backup";
import type { Stack } from "../domain/types";
import { DB_NAME, openGhostDb, STACKS_STORE } from "./db";
import type { GhostDb } from "./db";
import { makeUnusedStackId } from "./freshStackId";
import { listStacks, loadStack, saveStack } from "./stackStore";

const textArb = fc
  .string({ minLength: 1, maxLength: 20 })
  .filter((s) => s.trim().length > 0);

const stackArb = (id: string): fc.Arbitrary<Stack> =>
  fc
    .tuple(textArb, textArb, fc.integer({ min: 0, max: 5 }))
    .map(([name, title, qty]) => ({
      schemaVersion: 1,
      id,
      name,
      currency: "NGN",
      cards: [
        {
          id: "c0",
          type: "stock",
          title,
          items: [
            { id: "i0", name: "Rice", quantity: qty, costPrice: 100, sellPrice: 150, lowStockLevel: 1 },
          ],
        },
        { id: "c1", type: "sales-log", title: "Sales", sales: [] },
        { id: "c2", type: "daily-summary", title: "Today" },
      ],
    }));

/** 1 to 3 saved stacks with distinct ids, plus the index of the one the backup copies. */
const scenarioArb = fc
  .integer({ min: 1, max: 3 })
  .chain((n) =>
    fc.tuple(
      fc.tuple(...Array.from({ length: n }, (_, i) => stackArb(`saved-${i}`))),
      fc.integer({ min: 0, max: n - 1 }),
      textArb,
    ),
  )
  .map(([saved, pick, backupName]) => ({
    saved: saved as Stack[],
    // The backup's Stack has the same id as a saved Stack.
    backupStack: { ...saved[pick], name: backupName } as Stack,
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

/** Restores the file: picks a fresh unused id, parses, saves. Returns the new id. */
async function restore(text: string, makeId: () => string): Promise<string> {
  const id = await makeUnusedStackId(makeId);
  expect(id).not.toBeNull();
  const parsed = parseBackup(text, id as string);
  expect(parsed.ok).toBe(true);
  if (!parsed.ok) throw new Error("parse failed");
  expect(await saveStack(parsed.value, db)).toEqual({ ok: true });
  return parsed.value.id;
}

describe("backup restore (property)", () => {
  // Feature: pwa-offline-and-backup, Property 14: Restored stacks never overwrite saved stacks
  // **Validates: Requirements 11.1, 11.2, 11.3, 11.4, 11.5, 14.4**
  it("restoring adds one new stack each time and leaves saved stacks unchanged", async () => {
    await fc.assert(
      fc.asyncProperty(scenarioArb, async ({ saved, backupStack }) => {
        await db.clear(STACKS_STORE);
        for (const s of saved) expect(await saveStack(s, db)).toEqual({ ok: true });
        const text = serializeStack(backupStack);

        // The id maker first returns a saved id (taken), then fresh ids.
        let n = 0;
        const makeId = () => (n++ === 0 ? backupStack.id : `fresh-${n}`);

        const firstId = await restore(text, makeId);
        expect(saved.map((s) => s.id)).not.toContain(firstId);
        expect(await listStacks(db)).toHaveLength(saved.length + 1);
        for (const s of saved) {
          const r = await loadStack(s.id, db);
          expect(r.ok && r.value).toStrictEqual(s);
        }

        const secondId = await restore(text, makeId);
        expect(secondId).not.toBe(firstId);
        expect(saved.map((s) => s.id)).not.toContain(secondId);
        expect(await listStacks(db)).toHaveLength(saved.length + 2);
        for (const s of saved) {
          const r = await loadStack(s.id, db);
          expect(r.ok && r.value).toStrictEqual(s);
        }
      }),
      { numRuns: 25 },
    );
  });
});
