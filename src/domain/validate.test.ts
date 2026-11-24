import { describe, expect, it } from "vitest";
import { isPositiveWhole, isSafeMoney, isWholeNumber } from "./validate";
import { ERROR_CODES, ERROR_MESSAGES, domainError, err, ok } from "./result";

describe("isWholeNumber", () => {
  it("accepts integers of any sign", () => {
    for (const v of [0, 1, -3, 1000]) expect(isWholeNumber(v)).toBe(true);
  });
  it("rejects fractions, NaN, Infinity and non-numbers", () => {
    for (const v of [1.5, NaN, Infinity, -Infinity, "1", null, undefined])
      expect(isWholeNumber(v)).toBe(false);
  });
});

describe("isPositiveWhole", () => {
  it("accepts 1 and above", () => {
    expect(isPositiveWhole(1)).toBe(true);
    expect(isPositiveWhole(50)).toBe(true);
  });
  it("rejects zero, negatives and fractions", () => {
    for (const v of [0, -1, 0.5, NaN]) expect(isPositiveWhole(v)).toBe(false);
  });
});

describe("isSafeMoney", () => {
  it("accepts zero and the max safe integer", () => {
    expect(isSafeMoney(0)).toBe(true);
    expect(isSafeMoney(Number.MAX_SAFE_INTEGER)).toBe(true);
  });
  it("rejects negatives, fractions, unsafe and non-numbers", () => {
    for (const v of [-1, 1.5, Number.MAX_SAFE_INTEGER + 1, NaN, Infinity, "5"])
      expect(isSafeMoney(v)).toBe(false);
  });
});

describe("error table", () => {
  it("gives every error code a non-empty message", () => {
    expect(ERROR_CODES.length).toBeGreaterThan(0);
    for (const code of ERROR_CODES) {
      expect(ERROR_MESSAGES[code].trim().length).toBeGreaterThan(0);
      expect(domainError(code)).toEqual({
        code,
        message: ERROR_MESSAGES[code],
      });
    }
  });
  it("builds ok and err results", () => {
    expect(ok(1)).toEqual({ ok: true, value: 1 });
    expect(err("BAD_QUANTITY")).toEqual({
      ok: false,
      error: domainError("BAD_QUANTITY"),
    });
  });
});
