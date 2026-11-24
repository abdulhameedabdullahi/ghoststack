/**
 * Input validation helpers. Pure: no React, no storage imports.
 */

/** True for finite integers of any sign (no NaN, Infinity or fractions). */
export function isWholeNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value);
}

/** True for whole numbers of at least 1. */
export function isPositiveWhole(value: unknown): value is number {
  return isWholeNumber(value) && value >= 1;
}

/** True for whole, non-negative numbers within Number.MAX_SAFE_INTEGER. */
export function isSafeMoney(value: unknown): value is number {
  return Number.isSafeInteger(value) && (value as number) >= 0;
}
