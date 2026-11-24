import { ERROR_MESSAGES } from "../domain/result";
import type { Kobo } from "../domain/types";
import { parseKobo } from "./money";
import { parseWholeNumber } from "./wholeNumber";

/** Raw typed text for the five item Fields. */
export interface ItemFormValues {
  name: string;
  quantity: string;
  costPrice: string;
  sellPrice: string;
  lowStockLevel: string;
}

export interface ParsedItemValues {
  name: string; // trimmed
  quantity: number;
  costPrice: Kobo;
  sellPrice: Kobo;
  lowStockLevel: number;
}

export type ItemFormErrors = Partial<Record<keyof ItemFormValues, string>>;

export type ParseItemFormResult =
  | { ok: true; value: ParsedItemValues }
  | { ok: false; errors: ItemFormErrors };

/** Reads the raw form text. Checks every Field; never calls the domain. */
export function parseItemForm(values: ItemFormValues): ParseItemFormResult {
  const errors: ItemFormErrors = {};

  const name = values.name.trim();
  if (name === "") errors.name = ERROR_MESSAGES.BAD_ITEM_NAME;

  const quantity = parseWholeNumber(values.quantity);
  if (!quantity.ok) errors.quantity = quantity.error.message;

  const costPrice = parseKobo(values.costPrice);
  if (!costPrice.ok) errors.costPrice = costPrice.error.message;

  const sellPrice = parseKobo(values.sellPrice);
  if (!sellPrice.ok) errors.sellPrice = sellPrice.error.message;

  const lowStockLevel = parseWholeNumber(values.lowStockLevel);
  if (!lowStockLevel.ok) errors.lowStockLevel = lowStockLevel.error.message;

  if (quantity.ok && costPrice.ok && sellPrice.ok && lowStockLevel.ok && name !== "") {
    return {
      ok: true,
      value: {
        name,
        quantity: quantity.value,
        costPrice: costPrice.value,
        sellPrice: sellPrice.value,
        lowStockLevel: lowStockLevel.value,
      },
    };
  }
  return { ok: false, errors };
}
