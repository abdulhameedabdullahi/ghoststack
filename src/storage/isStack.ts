import type { Stack } from "../domain/types";

/**
 * Shape check for data loaded from storage. Checks field types and that
 * numbers are non-negative safe integers. Business rules are not re-checked.
 * Local checks only: storage never calls domain functions.
 */

const KNOWN_SCHEMA_VERSION = 1;

type Obj = Record<string, unknown>;

function isObj(v: unknown): v is Obj {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function isStr(v: unknown): v is string {
  return typeof v === "string";
}

function isNat(v: unknown): v is number {
  return typeof v === "number" && Number.isSafeInteger(v) && v >= 0;
}

function allOf(list: unknown, check: (v: Obj) => boolean): boolean {
  return Array.isArray(list) && list.every((x) => isObj(x) && check(x));
}

function isItem(i: Obj): boolean {
  return (
    isStr(i.id) &&
    isStr(i.name) &&
    isNat(i.quantity) &&
    isNat(i.costPrice) &&
    isNat(i.sellPrice) &&
    isNat(i.lowStockLevel)
  );
}

function isSale(s: Obj): boolean {
  return (
    isStr(s.id) &&
    isStr(s.itemId) &&
    isNat(s.quantity) &&
    isNat(s.unitPrice) &&
    isNat(s.unitCost) &&
    isStr(s.time)
  );
}

function isDebt(d: Obj): boolean {
  return (
    isStr(d.id) &&
    isStr(d.customer) &&
    isNat(d.amount) &&
    isStr(d.date) &&
    (d.status === "paid" || d.status === "unpaid")
  );
}

function isCard(c: Obj): boolean {
  if (!isStr(c.id) || !isStr(c.title)) return false;
  if (c.hidden !== undefined && typeof c.hidden !== "boolean") return false;
  switch (c.type) {
    case "stock":
      return allOf(c.items, isItem);
    case "sales-log":
      return allOf(c.sales, isSale);
    case "debts":
      return allOf(c.debts, isDebt);
    case "daily-summary":
      return true;
    default:
      return false;
  }
}

export function isStack(value: unknown): value is Stack {
  return (
    isObj(value) &&
    value.schemaVersion === KNOWN_SCHEMA_VERSION &&
    isStr(value.id) &&
    isStr(value.name) &&
    isStr(value.currency) &&
    allOf(value.cards, isCard)
  );
}
