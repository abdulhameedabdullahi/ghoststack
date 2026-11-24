import { describe, expect, it } from "vitest";
import { domainError } from "../domain";
import { parseWholeNumber } from "./wholeNumber";

describe("parseWholeNumber", () => {
  it.each([
    ["0", 0],
    ["5", 5],
    [" 12 ", 12],
    ["007", 7],
  ])("accepts %j", (text, n) => {
    expect(parseWholeNumber(text)).toEqual({ ok: true, value: n });
  });

  it.each(["", "   ", "12abc", "1.5", "-1", "1e3", "0x10", "9007199254740993"])(
    "rejects %j with BAD_QUANTITY",
    (text) => {
      expect(parseWholeNumber(text)).toEqual({
        ok: false,
        error: domainError("BAD_QUANTITY"),
      });
    },
  );
});
