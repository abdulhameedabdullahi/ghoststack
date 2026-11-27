import { describe, expect, it } from "vitest";
import { buildDebtReminder } from "./buildDebtReminder";
import { SHARE_ERROR_MESSAGES } from "./types";

const base = {
  personName: "Ada",
  shopName: "Mama Ife's Shop",
  outstandingKobo: 125050,
  language: "en" as const,
};

describe("buildDebtReminder", () => {
  it("builds the exact text for a known input", () => {
    const r = buildDebtReminder(base);
    expect(r).toEqual({
      ok: true,
      value: {
        text: "Hello Ada, a gentle reminder from Mama Ife's Shop: you still owe ₦1,250.50. Thank you!",
      },
    });
  });

  it("shows a whole-naira amount without .00", () => {
    const r = buildDebtReminder({ ...base, outstandingKobo: 125000 });
    expect(r.ok && r.value.text).toContain("you still owe ₦1,250.");
    expect(r.ok && r.value.text).not.toContain(".00");
  });

  it("uses fallbacks for empty names", () => {
    const r = buildDebtReminder({ ...base, personName: "", shopName: "  " });
    expect(r.ok && r.value.text).toBe(
      "Hello there, a gentle reminder from my shop: you still owe ₦1,250.50. Thank you!",
    );
  });

  it("returns ALREADY_PAID for 0", () => {
    const r = buildDebtReminder({ ...base, outstandingKobo: 0 });
    expect(r).toEqual({
      ok: false,
      error: { code: "ALREADY_PAID", message: SHARE_ERROR_MESSAGES.ALREADY_PAID },
    });
  });

  it.each([-1, 1.5, NaN, Infinity, 2 ** 53])("returns INVALID_AMOUNT for %s", (n) => {
    const r = buildDebtReminder({ ...base, outstandingKobo: n });
    expect(r).toEqual({
      ok: false,
      error: { code: "INVALID_AMOUNT", message: SHARE_ERROR_MESSAGES.INVALID_AMOUNT },
    });
  });

  it("gives every error code a non-empty message", () => {
    for (const code of ["INVALID_AMOUNT", "ALREADY_PAID"] as const) {
      expect(SHARE_ERROR_MESSAGES[code].length).toBeGreaterThan(0);
    }
  });
});
