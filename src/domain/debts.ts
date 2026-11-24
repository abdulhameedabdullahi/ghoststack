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
