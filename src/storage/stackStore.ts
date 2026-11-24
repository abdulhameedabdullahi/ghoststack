import type { Stack } from "../domain/types";
import { openGhostDb, STACKS_STORE } from "./db";
import type { GhostDb } from "./db";
import { isStack } from "./isStack";

export type StorageErrorCode = "NOT_FOUND" | "UNREADABLE_DATA" | "SAVE_FAILED";

export type StorageError = { code: StorageErrorCode; message: string };

export const STORAGE_ERROR_MESSAGES: Record<StorageErrorCode, string> = {
  NOT_FOUND:
    "We could not find that stack. It may have been removed. Go back to your stacks and pick another one.",
  UNREADABLE_DATA:
    "We could not read your saved data. Try again, or restore from a backup.",
  SAVE_FAILED:
    "We could not save your changes. Your device storage may be full or blocked. Free some space and try again.",
};

function storageError(code: StorageErrorCode): StorageError {
  return { code, message: STORAGE_ERROR_MESSAGES[code] };
}

export type SaveResult = { ok: true } | { ok: false; error: StorageError };
export type LoadResult =
  | { ok: true; value: Stack }
  | { ok: false; error: StorageError };

/** Runs fn with the given handle, or opens one and closes it afterwards. */
async function withDb<T>(
  db: GhostDb | undefined,
  fn: (db: GhostDb) => Promise<T>,
): Promise<T> {
  if (db) return fn(db);
  const opened = await openGhostDb();
  try {
    return await fn(opened);
  } finally {
    opened.close();
  }
}

export async function saveStack(
  stack: Stack,
  db?: GhostDb,
): Promise<SaveResult> {
  try {
    await withDb(db, (d) => d.put(STACKS_STORE, stack));
    return { ok: true };
  } catch {
    return { ok: false, error: storageError("SAVE_FAILED") };
  }
}

export async function loadStack(id: string, db?: GhostDb): Promise<LoadResult> {
  try {
    const record: unknown = await withDb(db, (d) => d.get(STACKS_STORE, id));
    if (record === undefined) {
      return { ok: false, error: storageError("NOT_FOUND") };
    }
    if (!isStack(record)) {
      return { ok: false, error: storageError("UNREADABLE_DATA") };
    }
    return { ok: true, value: record };
  } catch {
    return { ok: false, error: storageError("UNREADABLE_DATA") };
  }
}

export async function listStacks(
  db?: GhostDb,
): Promise<{ id: string; name: string }[]> {
  try {
    const records: unknown[] = await withDb(db, (d) => d.getAll(STACKS_STORE));
    return records.filter(isStack).map((s) => ({ id: s.id, name: s.name }));
  } catch {
    return [];
  }
}
