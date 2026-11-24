import { err, ok } from "../domain";
import type { Result } from "../domain";

/** Reads quantity / low-stock text. Digits only, safe integer, no parseInt. */
export function parseWholeNumber(text: string): Result<number> {
  const trimmed = text.trim();
  if (!/^\d+$/.test(trimmed)) return err("BAD_QUANTITY");
  const n = Number(trimmed);
  if (!Number.isSafeInteger(n)) return err("BAD_QUANTITY");
  return ok(n);
}
