import { describe, expect, it } from "vitest";
import { recordDebt, settleDebt, totalOwed } from "./debts";
import type { Debt, DebtsCard, Stack } from "./types";

function deepFreeze<T>(o: T): T {
  if (o && typeof o === "object" && !Object.isFrozen(o)) {
    Object.freeze(o);
    for (const v of Object.values(o as object)) deepFreeze(v);
  }
  return o;
}

const unpaid: Debt = {
  id: "d-1",
  customer: "Ada",
  amount: 500,
  date: "2024-01-01",
  status: "unpaid",
};
const paid: Debt = { ...unpaid, id: "d-2", customer: "Bola", amount: 300, status: "paid" };

function makeStack(debts: Debt[] = [unpaid, paid]): Stack {
  return {
    schemaVersion: 1,
    id: "stack-1",
    name: "Shop",
    currency: "NGN",
    cards: [
      { id: "stock-1", title: "Stock", type: "stock", items: [] },
      { id: "debts-1", title: "Debts", type: "debts", debts },
      { id: "debts-2", title: "Other Debts", type: "debts", debts: [] },
    ],
  };
}

const base = (stack: Stack) => ({
  stack,
  debtsCardId: "debts-1",
  customer: "Chi",
  amount: 1000,
  debtId: "d-new",
  date: "2024-02-02",
});

function debtsOf(stack: Stack, id = "debts-1"): Debt[] {
  return (stack.cards.find((c) => c.id === id) as DebtsCard).debts;
}

describe("totalOwed", () => {
  it("returns 0 for no debts", () => {
    expect(totalOwed([])).toBe(0);
  });
  it("ignores paid debts", () => {
    expect(totalOwed([unpaid, paid])).toBe(500);
    expect(totalOwed([paid])).toBe(0);
  });
});

describe("recordDebt", () => {
  it("appends an unpaid debt with trimmed customer", () => {
    const stack = deepFreeze(makeStack());
    const before = JSON.stringify(stack);
    const r = recordDebt({ ...base(stack), customer: "  Chi  " });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(debtsOf(r.value)).toEqual([
      unpaid,
      paid,
      { id: "d-new", customer: "Chi", amount: 1000, date: "2024-02-02", status: "unpaid" },
    ]);
    expect(debtsOf(r.value, "debts-2")).toEqual([]);
    expect(JSON.stringify(stack)).toBe(before);
  });

  it.each([0, -5, 1.5, NaN, Infinity])("BAD_AMOUNT for %s", (amount) => {
    const stack = deepFreeze(makeStack());
    const r = recordDebt({ ...base(stack), amount });
    expect(r).toMatchObject({ ok: false, error: expect.objectContaining({ code: "BAD_AMOUNT" }) });
  });

  it("AMOUNT_TOO_BIG for unsafe integer amount", () => {
    const r = recordDebt({ ...base(makeStack()), amount: Number.MAX_SAFE_INTEGER + 1 });
    expect(r).toMatchObject({ ok: false, error: expect.objectContaining({ code: "AMOUNT_TOO_BIG" }) });
  });

  it("AMOUNT_TOO_BIG when unpaid total would overflow", () => {
    const big: Debt = { ...unpaid, amount: Number.MAX_SAFE_INTEGER - 10 };
    const stack = deepFreeze(makeStack([big]));
    const r = recordDebt({ ...base(stack), amount: 11 });
    expect(r).toMatchObject({ ok: false, error: expect.objectContaining({ code: "AMOUNT_TOO_BIG" }) });
  });

  it("ignores paid debts for the overflow check", () => {
    const bigPaid: Debt = { ...paid, amount: Number.MAX_SAFE_INTEGER };
    const r = recordDebt({ ...base(makeStack([bigPaid])), amount: 5 });
    expect(r.ok).toBe(true);
  });

  it.each(["", "   ", "\t\n"])("BAD_CUSTOMER for %j", (customer) => {
    const r = recordDebt({ ...base(makeStack()), customer });
    expect(r).toMatchObject({ ok: false, error: expect.objectContaining({ code: "BAD_CUSTOMER" }) });
  });

  it("CARD_NOT_FOUND for missing card", () => {
    const r = recordDebt({ ...base(makeStack()), debtsCardId: "nope" });
    expect(r).toMatchObject({ ok: false, error: expect.objectContaining({ code: "CARD_NOT_FOUND" }) });
  });

  it("CARD_NOT_FOUND for wrong-kind card", () => {
    const r = recordDebt({ ...base(makeStack()), debtsCardId: "stock-1" });
    expect(r).toMatchObject({ ok: false, error: expect.objectContaining({ code: "CARD_NOT_FOUND" }) });
  });

  it("DUPLICATE_ID when id exists in any debts card", () => {
    expect(recordDebt({ ...base(makeStack()), debtId: "d-1" })).toMatchObject({
      ok: false,
      error: expect.objectContaining({ code: "DUPLICATE_ID" }),
    });
    expect(
      recordDebt({ ...base(makeStack()), debtsCardId: "debts-2", debtId: "d-2" }),
    ).toMatchObject({ ok: false, error: expect.objectContaining({ code: "DUPLICATE_ID" }) });
  });

  it("does not mutate the input on error", () => {
    const stack = deepFreeze(makeStack());
    const before = JSON.stringify(stack);
    recordDebt({ ...base(stack), amount: 0 });
    recordDebt({ ...base(stack), debtId: "d-1" });
    expect(JSON.stringify(stack)).toBe(before);
  });
});

describe("settleDebt", () => {
  const input = (stack: Stack, debtId = "d-1", debtsCardId = "debts-1") => ({
    stack,
    debtsCardId,
    debtId,
  });

  it("marks the debt paid without mutating input", () => {
    const stack = deepFreeze(makeStack());
    const before = JSON.stringify(stack);
    const r = settleDebt(input(stack));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(debtsOf(r.value)).toEqual([{ ...unpaid, status: "paid" }, paid]);
    expect(totalOwed(debtsOf(r.value))).toBe(0);
    expect(JSON.stringify(stack)).toBe(before);
  });

  it("CARD_NOT_FOUND for missing and wrong-kind cards", () => {
    const stack = deepFreeze(makeStack());
    expect(settleDebt(input(stack, "d-1", "nope"))).toMatchObject({
      ok: false,
      error: expect.objectContaining({ code: "CARD_NOT_FOUND" }),
    });
    expect(settleDebt(input(stack, "d-1", "stock-1"))).toMatchObject({
      ok: false,
      error: expect.objectContaining({ code: "CARD_NOT_FOUND" }),
    });
  });

  it("DEBT_NOT_FOUND for unknown debt or debt on another card", () => {
    const stack = deepFreeze(makeStack());
    expect(settleDebt(input(stack, "zzz"))).toMatchObject({ ok: false, error: expect.objectContaining({ code: "DEBT_NOT_FOUND" }) });
    expect(settleDebt(input(stack, "d-1", "debts-2"))).toMatchObject({
      ok: false,
      error: expect.objectContaining({ code: "DEBT_NOT_FOUND" }),
    });
  });

  it("DEBT_ALREADY_PAID for a paid debt, and after settling twice", () => {
    const stack = deepFreeze(makeStack());
    expect(settleDebt(input(stack, "d-2"))).toMatchObject({
      ok: false,
      error: expect.objectContaining({ code: "DEBT_ALREADY_PAID" }),
    });
    const once = settleDebt(input(stack));
    if (!once.ok) throw new Error("expected ok");
    expect(settleDebt(input(once.value))).toMatchObject({
      ok: false,
      error: expect.objectContaining({ code: "DEBT_ALREADY_PAID" }),
    });
  });
});
