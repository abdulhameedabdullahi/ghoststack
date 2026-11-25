/**
 * Debt logic. Pure: no React, no storage imports, no clock, no id making.
 */
import { err, ok, type Result } from "./result";
import type { Card, Debt, DebtsCard, IsoString, Kobo, Stack } from "./types";
import { isPositiveWhole } from "./validate";

export interface RecordDebtInput {
  stack: Stack;
  debtsCardId: string;
  customer: string;
  amount: Kobo;
  debtId: string;
  date: IsoString;
}

export interface SettleDebtInput {
  stack: Stack;
  debtsCardId: string;
  debtId: string;
}

/** Sum of the amounts of all unpaid debts. */
export function totalOwed(debts: Debt[]): Kobo {
  return debts.reduce((sum, d) => (d.status === "unpaid" ? sum + d.amount : sum), 0);
}

/**
 * Returns the Debts with unpaid ones first, as a new array of the same Debt
 * objects. Inside each group, newest date first. A Debt whose date cannot be
 * parsed goes after the others in its group. Ties (and pairs of unparseable
 * dates) put the later input position first. Never changes its input.
 */
export function debtsUnpaidFirst(debts: readonly Debt[]): Debt[] {
  const indexed = debts.map((debt, index) => ({
    debt,
    index,
    t: Date.parse(debt.date),
  }));
  indexed.sort((a, b) => {
    const aPaid = a.debt.status === "paid";
    const bPaid = b.debt.status === "paid";
    if (aPaid !== bPaid) return aPaid ? 1 : -1;
    const aBad = Number.isNaN(a.t);
    const bBad = Number.isNaN(b.t);
    if (aBad !== bBad) return aBad ? 1 : -1;
    if (!aBad && a.t !== b.t) return b.t - a.t;
    return b.index - a.index;
  });
  return indexed.map((e) => e.debt);
}

/** One customer and the total they owe, in kobo. */
export interface CustomerTotal {
  name: string;
  total: Kobo;
}

/** Same customer test: trim, collapse whitespace runs, lower case. No accent folding. */
function customerKey(customer: string): string {
  return customer.trim().replace(/\s+/g, " ").toLowerCase();
}

/**
 * Totals unpaid debts per customer. Paid debts are ignored. The name is the
 * trimmed name from the customer's first unpaid debt. Largest total first;
 * ties put the customer whose first unpaid debt came earlier first. Returns
 * AMOUNT_TOO_BIG if any running sum is not a safe integer. Never changes its
 * input.
 */
export function debtsByCustomer(debts: readonly Debt[]): Result<CustomerTotal[]> {
  const groups = new Map<string, { name: string; total: number; first: number }>();
  for (let i = 0; i < debts.length; i++) {
    const debt = debts[i];
    if (debt.status === "paid") continue;
    const key = customerKey(debt.customer);
    let group = groups.get(key);
    if (!group) {
      group = { name: debt.customer.trim(), total: 0, first: i };
      groups.set(key, group);
    }
    group.total += debt.amount;
    if (!Number.isSafeInteger(group.total)) return err("AMOUNT_TOO_BIG");
  }
  const sorted = [...groups.values()].sort(
    (a, b) => b.total - a.total || a.first - b.first,
  );
  return ok(sorted.map(({ name, total }) => ({ name, total })));
}

function findDebtsCard(stack: Stack, id: string): DebtsCard | undefined {
  return stack.cards.find(
    (c): c is DebtsCard => c.id === id && c.type === "debts",
  );
}

/**
 * Records an unpaid debt. Returns a new Stack and never changes the input.
 * A card of the wrong kind counts as not found.
 */
export function recordDebt(input: RecordDebtInput): Result<Stack> {
  const { stack, debtsCardId, amount, debtId, date } = input;

  if (!isPositiveWhole(amount)) return err("BAD_AMOUNT");
  if (!Number.isSafeInteger(amount)) return err("AMOUNT_TOO_BIG");

  const customer = typeof input.customer === "string" ? input.customer.trim() : "";
  if (customer === "") return err("BAD_CUSTOMER");

  const card = findDebtsCard(stack, debtsCardId);
  if (!card) return err("CARD_NOT_FOUND");

  const idTaken = stack.cards.some(
    (c) => c.type === "debts" && c.debts.some((d) => d.id === debtId),
  );
  if (idTaken) return err("DUPLICATE_ID");

  if (!Number.isSafeInteger(totalOwed(card.debts) + amount)) {
    return err("AMOUNT_TOO_BIG");
  }

  const debt: Debt = { id: debtId, customer, amount, date, status: "unpaid" };
  const cards: Card[] = stack.cards.map((c) =>
    c.id === debtsCardId ? { ...card, debts: [...card.debts, debt] } : c,
  );
  return ok({ ...stack, cards });
}

/**
 * Marks a debt as paid. Returns a new Stack and never changes the input.
 * A card of the wrong kind counts as not found.
 */
export function settleDebt(input: SettleDebtInput): Result<Stack> {
  const { stack, debtsCardId, debtId } = input;

  const card = findDebtsCard(stack, debtsCardId);
  if (!card) return err("CARD_NOT_FOUND");

  const debt = card.debts.find((d) => d.id === debtId);
  if (!debt) return err("DEBT_NOT_FOUND");
  if (debt.status === "paid") return err("DEBT_ALREADY_PAID");

  const cards: Card[] = stack.cards.map((c) =>
    c.id === debtsCardId
      ? {
        ...card,
        debts: card.debts.map((d) =>
          d.id === debtId ? { ...d, status: "paid" as const } : d,
        ),
      }
      : c,
  );
  return ok({ ...stack, cards });
}
