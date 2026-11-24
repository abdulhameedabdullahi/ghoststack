import { describe, expect, it } from "vitest";
import { ERROR_MESSAGES } from "../domain/result";
import { parseItemForm } from "./itemForm";
import type { ItemFormValues } from "./itemForm";

const valid: ItemFormValues = {
  name: "Rice",
  quantity: "10",
  costPrice: "1,000",
  sellPrice: "1250.50",
  lowStockLevel: "3",
};

describe("parseItemForm", () => {
  it("returns parsed values for an all-valid form", () => {
    expect(parseItemForm(valid)).toEqual({
      ok: true,
      value: {
        name: "Rice",
        quantity: 10,
        costPrice: 100000,
        sellPrice: 125050,
        lowStockLevel: 3,
      },
    });
  });

  it.each([
    ["name", "   ", ERROR_MESSAGES.BAD_ITEM_NAME],
    ["quantity", "abc", ERROR_MESSAGES.BAD_QUANTITY],
    ["costPrice", "12.345", ERROR_MESSAGES.BAD_PRICE],
    ["sellPrice", "", ERROR_MESSAGES.BAD_PRICE],
    ["lowStockLevel", "-1", ERROR_MESSAGES.BAD_QUANTITY],
  ] as const)("reports only the %s Field when it is bad", (field, text, message) => {
    expect(parseItemForm({ ...valid, [field]: text })).toEqual({
      ok: false,
      errors: { [field]: message },
    });
  });

  it("reports one error per Field when all five are bad", () => {
    expect(
      parseItemForm({
        name: "",
        quantity: "x",
        costPrice: "x",
        sellPrice: "x",
        lowStockLevel: "x",
      }),
    ).toEqual({
      ok: false,
      errors: {
        name: ERROR_MESSAGES.BAD_ITEM_NAME,
        quantity: ERROR_MESSAGES.BAD_QUANTITY,
        costPrice: ERROR_MESSAGES.BAD_PRICE,
        sellPrice: ERROR_MESSAGES.BAD_PRICE,
        lowStockLevel: ERROR_MESSAGES.BAD_QUANTITY,
      },
    });
  });

  it("trims the name", () => {
    const result = parseItemForm({ ...valid, name: "  Rice bag \t" });
    expect(result.ok && result.value.name).toBe("Rice bag");
  });
});
