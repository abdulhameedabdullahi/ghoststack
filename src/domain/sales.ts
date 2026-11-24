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
