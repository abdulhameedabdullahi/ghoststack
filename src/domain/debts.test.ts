import { describe, expect, it } from "vitest";
import { debtsByCustomer, debtsUnpaidFirst, recordDebt, settleDebt, totalOwed } from "./debts";
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

describe("debtsUnpaidFirst", () => {
  const mk = (id: string, status: Debt["status"], date: string): Debt => ({
    id,
    customer: "C",
    amount: 100,
    date,
    status,
  });
  const ids = (ds: Debt[]) => ds.map((d) => d.id);

  it("returns [] for an empty list", () => {
    expect(debtsUnpaidFirst([])).toEqual([]);
  });

  it("puts all unpaid debts before paid ones, newest first in each group", () => {
    const input = [
      mk("p-old", "paid", "2024-01-01"),
      mk("u-old", "unpaid", "2024-01-02"),
      mk("p-new", "paid", "2024-03-01"),
      mk("u-new", "unpaid", "2024-03-02"),
    ];
    expect(ids(debtsUnpaidFirst(input))).toEqual(["u-new", "u-old", "p-new", "p-old"]);
  });

  it("puts the later input position first when dates are equal", () => {
    const input = [
      mk("a", "unpaid", "2024-05-05"),
      mk("b", "unpaid", "2024-05-05"),
      mk("c", "unpaid", "2024-05-05"),
    ];
    expect(ids(debtsUnpaidFirst(input))).toEqual(["c", "b", "a"]);
  });

  it("sorts an unparseable date last within its group", () => {
    const input = [
      mk("bad-u", "unpaid", "not a date"),
      mk("good-u", "unpaid", "2020-01-01"),
      mk("bad-p", "paid", ""),
      mk("good-p", "paid", "2019-01-01"),
    ];
    expect(ids(debtsUnpaidFirst(input))).toEqual(["good-u", "bad-u", "good-p", "bad-p"]);
  });

  it("keeps later-first order for two unparseable dates", () => {
    const input = [mk("x", "unpaid", "nope"), mk("y", "unpaid", "also nope")];
    expect(ids(debtsUnpaidFirst(input))).toEqual(["y", "x"]);
  });

  it("does not change the input array order", () => {
    const input = deepFreeze([
      mk("a", "paid", "2024-01-01"),
      mk("b", "unpaid", "2024-02-01"),
      mk("c", "unpaid", "bad"),
    ]);
    const before = ids(input);
    const out = debtsUnpaidFirst(input);
    expect(ids(input)).toEqual(before);
    expect(out).not.toBe(input);
    expect(out[0]).toBe(input[1]);
  });
});

describe("debtsByCustomer", () => {
  const mk = (
    id: string,
    customer: string,
    amount: number,
    status: Debt["status"] = "unpaid",
  ): Debt => ({ id, customer, amount, date: "2024-01-01", status });

  it("returns ok([]) for an empty list", () => {
    expect(debtsByCustomer([])).toEqual({ ok: true, value: [] });
  });

  it("returns ok([]) when every debt is paid", () => {
    const r = debtsByCustomer([mk("1", "Ada", 100, "paid"), mk("2", "Bo", 50, "paid")]);
    expect(r).toEqual({ ok: true, value: [] });
  });

  it("treats 'Ada', ' ada ' and 'ADA' as one customer", () => {
    const r = debtsByCustomer([mk("1", "Ada", 100), mk("2", " ada ", 200), mk("3", "ADA", 300)]);
    expect(r).toEqual({ ok: true, value: [{ name: "Ada", total: 600 }] });
  });

  it("uses the trimmed name of the first unpaid debt", () => {
    const r = debtsByCustomer([mk("1", "  ADA ", 100), mk("2", "ada", 100)]);
    expect(r).toEqual({ ok: true, value: [{ name: "ADA", total: 200 }] });
  });

  it("takes the name from the first unpaid debt, not an earlier paid one", () => {
    const r = debtsByCustomer([mk("1", "ADA", 999, "paid"), mk("2", "Ada", 100)]);
    expect(r).toEqual({ ok: true, value: [{ name: "Ada", total: 100 }] });
  });

  it("does not add a paid debt to the customer's total", () => {
    const r = debtsByCustomer([mk("1", "Ada", 100), mk("2", "ada", 500, "paid")]);
    expect(r).toEqual({ ok: true, value: [{ name: "Ada", total: 100 }] });
  });

  it("sorts the largest total first", () => {
    const r = debtsByCustomer([mk("1", "Bo", 50), mk("2", "Ada", 300)]);
    expect(r).toEqual({
      ok: true,
      value: [
        { name: "Ada", total: 300 },
        { name: "Bo", total: 50 },
      ],
    });
  });

  it("puts the customer with the earlier first unpaid debt first on a tie", () => {
    const r = debtsByCustomer([mk("1", "Bo", 100), mk("2", "Ada", 100)]);
    expect(r).toEqual({
      ok: true,
      value: [
        { name: "Bo", total: 100 },
        { name: "Ada", total: 100 },
      ],
    });
  });

  it("returns AMOUNT_TOO_BIG, not a partial list, when a later addition overflows", () => {
    const r = debtsByCustomer([
      mk("1", "Bo", 10),
      mk("2", "Ada", Number.MAX_SAFE_INTEGER),
      mk("3", "ada", 1),
    ]);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("AMOUNT_TOO_BIG");
  });

  it("does not change its input", () => {
    const input = deepFreeze([mk("1", "Ada", 100), mk("2", "ada", 5)]);
    const before = JSON.stringify(input);
    debtsByCustomer(input);
    expect(JSON.stringify(input)).toBe(before);
  });
});
