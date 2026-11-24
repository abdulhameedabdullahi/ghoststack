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
  it("has the new BAD_ITEM_NAME and BAD_PRICE entries", () => {
    expect(ERROR_CODES).toContain("BAD_ITEM_NAME");
    expect(ERROR_CODES).toContain("BAD_PRICE");
    expect(ERROR_MESSAGES.BAD_PRICE).toBe(
      "Please type a price using numbers only, like 1250 or 1250.50.",
    );
  });
  it("never mentions kobo in any message", () => {
    for (const code of ERROR_CODES)
      expect(ERROR_MESSAGES[code].toLowerCase()).not.toContain("kobo");
  });
  it("leaves every pre-existing entry untouched", () => {
    const existing = {
      BAD_QUANTITY:
        "The amount must be a whole number, like 1 or 5. Please check it and try again.",
      NOT_ENOUGH_STOCK:
        "You do not have enough of this item in stock. Check the amount or add more stock.",
      BAD_AMOUNT:
        "The money amount must be more than zero. Please check it and try again.",
      AMOUNT_TOO_BIG:
        "This amount is too big to work with. Please use a smaller amount.",
      BAD_CUSTOMER: "Please type the customer's name.",
      ITEM_NOT_FOUND:
        "We could not find this item. Pick it from your stock list.",
      CARD_NOT_FOUND:
        "We could not find this card. Go back and pick it again.",
      DUPLICATE_ID:
        "This record already exists, so it was not added again. Please try again.",
      DEBT_NOT_FOUND:
        "We could not find this debt. Go back and pick it from the list.",
      DEBT_ALREADY_PAID: "This debt is already marked as paid.",
    };
    for (const [code, message] of Object.entries(existing))
      expect(ERROR_MESSAGES[code as keyof typeof ERROR_MESSAGES]).toBe(message);
    expect(ERROR_CODES.length).toBe(Object.keys(existing).length + 2);
  });
  it("builds ok and err results", () => {
    expect(ok(1)).toEqual({ ok: true, value: 1 });
    expect(err("BAD_QUANTITY")).toEqual({
      ok: false,
      error: domainError("BAD_QUANTITY"),
    });
  });
});
