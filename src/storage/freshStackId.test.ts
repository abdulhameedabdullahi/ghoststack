import "fake-indexeddb/auto";
import { deleteDB } from "idb";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Stack } from "../domain/types";
import { DB_NAME, openGhostDb, STACKS_STORE } from "./db";
import type { GhostDb } from "./db";
import { makeUnusedStackId } from "./freshStackId";

const makeStack = (id: string): Stack =>
  ({
    schemaVersion: 1,
    id,
    name: "Shop",
    currency: "NGN",
    cards: [{ id: "c1", type: "daily-summary", title: "Today" }],
  }) as unknown as Stack;

/** Returns ids from the list in order, then keeps repeating the last one. */
function sequence(ids: string[]): () => string {
  let i = 0;
  return () => ids[Math.min(i++, ids.length - 1)];
}

let db: GhostDb;

beforeEach(async () => {
  await deleteDB(DB_NAME);
  db = await openGhostDb();
});

afterEach(async () => {
  db.close();
  await deleteDB(DB_NAME);
});

describe("makeUnusedStackId", () => {
  it("returns the first id that is not found", async () => {
    expect(await makeUnusedStackId(sequence(["a", "b"]))).toBe("a");
  });

  it("skips an id that is already saved", async () => {
    await db.put(STACKS_STORE, makeStack("a"));
    expect(await makeUnusedStackId(sequence(["a", "b"]))).toBe("b");
  });

  it("skips an id whose stored record fails isStack", async () => {
    await db.put(STACKS_STORE, { id: "a", junk: true } as unknown as Stack);
    expect(await makeUnusedStackId(sequence(["a", "b"]))).toBe("b");
  });

  it("returns null after maxTries when every id is taken", async () => {
    await db.put(STACKS_STORE, makeStack("a"));
    let calls = 0;
    const result = await makeUnusedStackId(() => {
      calls++;
      return "a";
    }, 3);
    expect(result).toBeNull();
    expect(calls).toBe(3);
  });

  it("writes nothing", async () => {
    await db.put(STACKS_STORE, makeStack("a"));
    await makeUnusedStackId(sequence(["a", "b"]));
    expect(await db.getAllKeys(STACKS_STORE)).toEqual(["a"]);
  });
});
