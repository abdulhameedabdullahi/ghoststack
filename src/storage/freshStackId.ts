import { loadStack } from "./stackStore";

/**
 * Returns an id that no saved record uses, or null after maxTries.
 * Uses loadStack only (listStacks hides records that fail isStack).
 * Never writes.
 */
export async function makeUnusedStackId(
  makeId: () => string = () => crypto.randomUUID(),
  maxTries = 5,
): Promise<string | null> {
  for (let i = 0; i < maxTries; i++) {
    const candidate = makeId();
    const result = await loadStack(candidate);
    if (!result.ok && result.error.code === "NOT_FOUND") {
      return candidate;
    }
  }
  return null;
}
