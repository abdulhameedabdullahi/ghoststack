import { describe, expect, it } from "vitest";
import { domainError } from "../domain";
import { formatKobo, formatSignedKobo, parseKobo } from "./money";

describe("formatKobo", () => {
  it.each([
    [0, "₦0.00"],
    [5, "₦0.05"],
    [125050, "₦1,250.50"],
    [123456789, "₦1,234,567.89"],
  ])("formats %d as %s", (kobo, text) => {
    expect(formatKobo(kobo)).toBe(text);
  });
});

describe("parseKobo", () => {
  it.each([
    ["1250", 125000],
    ["1250.5", 125050],
    ["1250.50", 125050],
    ["1,250.50", 125050],
    ["₦1,250.50", 125050],
    [" ₦ 1,250.50 ", 125050],
  ])("accepts %j", (text, kobo) => {
    expect(parseKobo(text)).toEqual({ ok: true, value: kobo });
  });

  it.each([
    ["empty", ""],
    ["naira sign alone", "₦"],
    ["double naira sign", "₦₦5"],
    ["letters", "abc"],
    ["three decimal places", "1.234"],
    ["negative", "-5"],
    ["over the safe limit", "90071992547409.92"],
  ])("rejects %s with BAD_PRICE", (_label, text) => {
    expect(parseKobo(text)).toEqual({
      ok: false,
      error: domainError("BAD_PRICE"),
    });
  });
});

describe("formatSignedKobo", () => {
  it("formats zero as Profit", () => {
    expect(formatSignedKobo(0)).toBe("Profit: " + formatKobo(0));
  });

  it("formats a positive amount as Profit", () => {
    expect(formatSignedKobo(125050)).toBe("Profit: " + formatKobo(125050));
  });

  it("formats a negative amount as Loss with no minus sign", () => {
    const text = formatSignedKobo(-125050);
    expect(text.startsWith("Loss: ")).toBe(true);
    expect(text).not.toContain("-");
    expect(text).toBe("Loss: " + formatKobo(125050));
  });

  it("handles Number.MAX_SAFE_INTEGER and its negation", () => {
    expect(formatSignedKobo(Number.MAX_SAFE_INTEGER)).toBe(
      "Profit: " + formatKobo(Number.MAX_SAFE_INTEGER),
    );
    expect(formatSignedKobo(-Number.MAX_SAFE_INTEGER)).toBe(
      "Loss: " + formatKobo(Number.MAX_SAFE_INTEGER),
    );
  });
});