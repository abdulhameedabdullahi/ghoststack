/**
 * Domain types for GhostStack.
 *
 * Pure types only: no React, no storage imports.
 * Dates and times are ISO 8601 strings so a Stack stays plain JSON.
 */

/** Smallest money unit. Must always hold a safe integer. */
export type Kobo = number;

/** ISO 8601 date or date-time string. */
export type IsoString = string;

export interface Item {
  id: string;
  name: string;
  /** Whole number, at least 0. */
  quantity: number;
  costPrice: Kobo;
  sellPrice: Kobo;
  /** Whole number. */
  lowStockLevel: number;
}

export interface Sale {
  id: string;
  itemId: string;
  /** Whole number, at least 1. */
  quantity: number;
  /** Copied from the Item's sell price at the time of sale. */
  unitPrice: Kobo;
  /** Copied from the Item's cost price at the time of sale. */
  unitCost: Kobo;
  time: IsoString;
}

export type DebtStatus = "unpaid" | "paid";

export interface Debt {
  id: string;
  customer: string;
  /** Kobo, at least 1. */
  amount: Kobo;
  date: IsoString;
  status: DebtStatus;
}

interface CardBase {
  id: string;
  title: string;
  /** Absent or false means the card is visible. */
  hidden?: boolean;
}

export interface StockCard extends CardBase {
  type: "stock";
  items: Item[];
}

export interface SalesLogCard extends CardBase {
  type: "sales-log";
  sales: Sale[];
}

export interface DebtsCard extends CardBase {
  type: "debts";
  debts: Debt[];
}

/** Holds no records of its own. */
export interface DailySummaryCard extends CardBase {
  type: "daily-summary";
}

export type Card = StockCard | SalesLogCard | DebtsCard | DailySummaryCard;

export type CardType = Card["type"];

export const SCHEMA_VERSION = 1;
export const DEFAULT_CURRENCY = "NGN";

export interface Stack {
  schemaVersion: typeof SCHEMA_VERSION;
  id: string;
  name: string;
  /** Defaults to "NGN" (Naira). */
  currency: string;
  cards: Card[];
}
