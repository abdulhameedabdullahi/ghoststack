/**
 * Sales logic. Pure: no React, no storage imports, no clock, no id making.
 */
import { err, ok, type Result } from "./result";
import type {
  Card,
  IsoString,
  Kobo,
  Sale,
  SalesLogCard,
  Stack,
  StockCard,
} from "./types";
import { isPositiveWhole } from "./validate";

export interface RecordSaleInput {
  stack: Stack;
  stockCardId: string;
  salesCardId: string;
  itemId: string;
  quantity: number;
  saleId: string;
  time: IsoString;
}

/** Total money for a sale: quantity times unit price. */
export function saleTotal(sale: Sale): Kobo {
  return sale.quantity * sale.unitPrice;
}

/**
 * Sum of sale amounts for Sales with start <= time < end.
 * Times are compared as parsed instants, never as strings. A Sale whose time
 * cannot be parsed is skipped. Returns AMOUNT_TOO_BIG if a Sale's own amount
 * or the running sum is not a safe integer. Never changes its input.
 */
export function dailyTotal(
  sales: readonly Sale[],
  start: IsoString,
  end: IsoString,
): Result<Kobo> {
  const startMs = Date.parse(start);
  const endMs = Date.parse(end);
  let sum = 0;
  for (const sale of sales) {
    const t = Date.parse(sale.time);
    if (Number.isNaN(t) || t < startMs || t >= endMs) continue;
    const amount = saleTotal(sale);
    if (!Number.isSafeInteger(amount)) return err("AMOUNT_TOO_BIG");
    sum += amount;
    if (!Number.isSafeInteger(sum)) return err("AMOUNT_TOO_BIG");
  }
  return ok(sum);
}

/**
 * Sum of (unitPrice - unitCost) * quantity for Sales with start <= time < end.
 * Uses each Sale's own prices. Times are compared as parsed instants. A Sale
 * whose time cannot be parsed is skipped. Returns AMOUNT_TOO_BIG if a Sale's
 * own amount or the running sum is not a safe integer. Amounts can be negative,
 * so the result can depend on order: it stops at the first unsafe running sum.
 * Never changes its input.
 */
export function estimatedProfit(
  sales: readonly Sale[],
  start: IsoString,
  end: IsoString,
): Result<Kobo> {
  const startMs = Date.parse(start);
  const endMs = Date.parse(end);
  let sum = 0;
  for (const sale of sales) {
    const t = Date.parse(sale.time);
    if (Number.isNaN(t) || t < startMs || t >= endMs) continue;
    const amount = (sale.unitPrice - sale.unitCost) * sale.quantity;
    if (!Number.isSafeInteger(amount)) return err("AMOUNT_TOO_BIG");
    sum += amount;
    if (!Number.isSafeInteger(sum)) return err("AMOUNT_TOO_BIG");
  }
  return ok(sum);
}

/**
 * Returns the Sales newest first, as a new array. Times are compared as parsed
 * instants. A Sale whose time cannot be parsed goes after all others. Ties
 * (and pairs of unparseable times) put the later input position first.
 * Never changes its input.
 */
export function salesNewestFirst(sales: readonly Sale[]): Sale[] {
  const indexed = sales.map((sale, index) => ({
    sale,
    index,
    t: Date.parse(sale.time),
  }));
  indexed.sort((a, b) => {
    const aBad = Number.isNaN(a.t);
    const bBad = Number.isNaN(b.t);
    if (aBad !== bBad) return aBad ? 1 : -1;
    if (!aBad && a.t !== b.t) return b.t - a.t;
    return b.index - a.index;
  });
  return indexed.map((entry) => entry.sale);
}

/**
 * Records a sale. Returns a new Stack and never changes the input.
 * A card of the wrong kind counts as not found.
 */
export function recordSale(input: RecordSaleInput): Result<Stack> {
  const { stack, stockCardId, salesCardId, itemId, quantity, saleId, time } =
    input;

  if (!isPositiveWhole(quantity)) return err("BAD_QUANTITY");

  const stockCard = stack.cards.find(
    (c): c is StockCard => c.id === stockCardId && c.type === "stock",
  );
  const salesCard = stack.cards.find(
    (c): c is SalesLogCard => c.id === salesCardId && c.type === "sales-log",
  );
  if (!stockCard || !salesCard) return err("CARD_NOT_FOUND");

  const item = stockCard.items.find((i) => i.id === itemId);
  if (!item) return err("ITEM_NOT_FOUND");

  const idTaken = stack.cards.some(
    (c) => c.type === "sales-log" && c.sales.some((s) => s.id === saleId),
  );
  if (idTaken) return err("DUPLICATE_ID");

  if (quantity > item.quantity) return err("NOT_ENOUGH_STOCK");

  const sale: Sale = {
    id: saleId,
    itemId,
    quantity,
    unitPrice: item.sellPrice,
    unitCost: item.costPrice,
    time,
  };
  if (!Number.isSafeInteger(saleTotal(sale))) return err("AMOUNT_TOO_BIG");

  const cards: Card[] = stack.cards.map((c) => {
    if (c.id === stockCardId) {
      return {
        ...stockCard,
        items: stockCard.items.map((i) =>
          i.id === itemId ? { ...i, quantity: i.quantity - quantity } : i,
        ),
      };
    }
    if (c.id === salesCardId) {
      return { ...salesCard, sales: [...salesCard.sales, sale] };
    }
    return c;
  });

  return ok({ ...stack, cards });
}
