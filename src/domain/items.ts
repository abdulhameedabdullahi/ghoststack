/**
 * Item logic. Pure: no React, no storage imports, no clock, no id making.
 */
import { err, ok, type Result } from "./result";
import type { Card, Item, Kobo, Stack, StockCard } from "./types";
import { isSafeMoney, isWholeNumber } from "./validate";

export interface AddItemInput {
  stack: Stack;
  stockCardId: string;
  itemId: string;
  name: string;
  quantity: number;
  costPrice: Kobo;
  sellPrice: Kobo;
  lowStockLevel: number;
}

export type UpdateItemInput = AddItemInput;

/** Checks 1 to 3 shared by addItem and updateItem. Returns the trimmed name. */
function validateItemFields(input: AddItemInput): Result<string> {
  const { quantity, costPrice, sellPrice, lowStockLevel } = input;

  const name = typeof input.name === "string" ? input.name.trim() : "";
  if (name === "") return err("BAD_ITEM_NAME");

  if (!isWholeNumber(quantity) || quantity < 0) return err("BAD_QUANTITY");
  if (!isWholeNumber(lowStockLevel) || lowStockLevel < 0) {
    return err("BAD_QUANTITY");
  }

  if (!isSafeMoney(costPrice) || !isSafeMoney(sellPrice)) {
    return err("BAD_PRICE");
  }
  return ok(name);
}

/**
 * Replaces an Item's fields on a Stock card. Keeps the id and list position.
 * Returns a new Stack and never changes the input.
 */
export function updateItem(input: UpdateItemInput): Result<Stack> {
  const { stack, stockCardId, itemId, quantity, costPrice, sellPrice } = input;

  const checked = validateItemFields(input);
  if (!checked.ok) return checked;
  const name = checked.value;

  const stockCard = stack.cards.find(
    (c): c is StockCard => c.id === stockCardId && c.type === "stock",
  );
  if (!stockCard) return err("CARD_NOT_FOUND");

  const index = stockCard.items.findIndex((i) => i.id === itemId);
  if (index === -1) return err("ITEM_NOT_FOUND");

  const updated: Item = {
    id: itemId,
    name,
    quantity,
    costPrice,
    sellPrice,
    lowStockLevel: input.lowStockLevel,
  };
  const items = stockCard.items.map((i, n) => (n === index ? updated : i));
  const cards: Card[] = stack.cards.map((c) =>
    c === stockCard ? { ...stockCard, items } : c,
  );
  return ok({ ...stack, cards });
}

export interface DeleteItemInput {
  stack: Stack;
  stockCardId: string;
  itemId: string;
}

/**
 * Removes an Item from a Stock card. The other Items keep their order.
 * Sales are left as they were. Returns a new Stack and never changes the input.
 */
export function deleteItem(input: DeleteItemInput): Result<Stack> {
  const { stack, stockCardId, itemId } = input;

  const stockCard = stack.cards.find(
    (c): c is StockCard => c.id === stockCardId && c.type === "stock",
  );
  if (!stockCard) return err("CARD_NOT_FOUND");

  if (!stockCard.items.some((i) => i.id === itemId)) {
    return err("ITEM_NOT_FOUND");
  }

  const items = stockCard.items.filter((i) => i.id !== itemId);
  const cards: Card[] = stack.cards.map((c) =>
    c === stockCard ? { ...stockCard, items } : c,
  );
  return ok({ ...stack, cards });
}

/**
 * Adds an Item to a Stock card. Returns a new Stack and never changes the
 * input. A card of the wrong kind counts as not found.
 */
export function addItem(input: AddItemInput): Result<Stack> {
  const {
    stack,
    stockCardId,
    itemId,
    quantity,
    costPrice,
    sellPrice,
    lowStockLevel,
  } = input;

  const checked = validateItemFields(input);
  if (!checked.ok) return checked;
  const name = checked.value;

  const stockCard = stack.cards.find(
    (c): c is StockCard => c.id === stockCardId && c.type === "stock",
  );
  if (!stockCard) return err("CARD_NOT_FOUND");

  const idTaken = stack.cards.some(
    (c) => c.type === "stock" && c.items.some((i) => i.id === itemId),
  );
  if (idTaken) return err("DUPLICATE_ID");

  const item: Item = {
    id: itemId,
    name,
    quantity,
    costPrice,
    sellPrice,
    lowStockLevel,
  };

  const cards: Card[] = stack.cards.map((c) =>
    c === stockCard ? { ...stockCard, items: [...stockCard.items, item] } : c,
  );

  return ok({ ...stack, cards });
}

/** True when the quantity is at or below the Item's low-stock level. */
export function isLowStock(item: Item): boolean {
  return item.quantity <= item.lowStockLevel;
}

/** True when the Item has no stock left. */
export function isOutOfStock(item: Item): boolean {
  return item.quantity === 0;
}
