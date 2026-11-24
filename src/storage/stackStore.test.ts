import "fake-indexeddb/auto";
import { deleteDB } from "idb";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Stack } from "../domain/types";
import { DB_NAME, openGhostDb, STACKS_STORE } from "./db";
import type { GhostDb } from "./db";
import { listStacks, loadStack, saveStack } from "./stackStore";

const makeStack = (id = "s1", name = "Shop"): Stack =>
  ({
    schemaVersion: 1,
    id,
    name,
    currency: "NGN",
    cards: [
      {
        id: "c1",
        type: "stock",
        title: "Stock",
        items: [
          { id: "i1", name: "Rice", quantity: 3, costPrice: 100, sellPrice: 150, lowStockLevel: 1 },
        ],
      },
      { id: "c2", type: "daily-summary", title: "Today" },
    ],
  }) as unknown as Stack;

let db: GhostDb;

beforeEach(async () => {
  await deleteDB(DB_NAME);
  db = await openGhostDb();
});

afterEach(async () => {
  db.close();
  await deleteDB(DB_NAME);
});

describe("stackStore", () => {
  it("save then load returns an equal stack", async () => {
    const s = makeStack();
    expect(await saveStack(s, db)).toEqual({ ok: true });
    const r = await loadStack("s1", db);
    expect(r).toEqual({ ok: true, value: s });
  });

  it("saving again replaces the record", async () => {
    await saveStack(makeStack("s1", "Old"), db);
    await saveStack(makeStack("s1", "New"), db);
    const r = await loadStack("s1", db);
    expect(r.ok && r.value.name).toBe("New");
    expect(await db.count(STACKS_STORE)).toBe(1);
  });

  it("unknown id returns NOT_FOUND", async () => {
    const r = await loadStack("missing", db);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("NOT_FOUND");
  });

  it("malformed records return UNREADABLE_DATA", async () => {
    const frac = makeStack("frac") as any;
    frac.cards[0].items[0].quantity = 1.5;
    const badVersion = { ...makeStack("ver"), schemaVersion: 2 };
    const junk = { id: "junk", foo: "bar" };
    for (const rec of [frac, badVersion, junk]) {
      await (db as any).put(STACKS_STORE, rec);
      const r = await loadStack(rec.id, db);
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.error.code).toBe("UNREADABLE_DATA");
    }
  });

  it("listStacks returns ids and names and skips malformed", async () => {
    await saveStack(makeStack("a", "Alpha"), db);
    await saveStack(makeStack("b", "Beta"), db);
    await (db as any).put(STACKS_STORE, { id: "bad", schemaVersion: 9 });
    const list = await listStacks(db);
    expect(list).toHaveLength(2);
    expect(list).toEqual(
      expect.arrayContaining([
        { id: "a", name: "Alpha" },
        { id: "b", name: "Beta" },
      ]),
    );
  });
});
