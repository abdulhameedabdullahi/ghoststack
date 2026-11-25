import type { Kobo } from "../domain/types";

/** An example item added to a new starter stack. It has no id. */
export interface SampleItemSpec {
  name: string;
  quantity: number;
  costPrice: Kobo;
  sellPrice: Kobo;
  lowStockLevel: number;
}

export const SAMPLE_ITEMS_BY_STARTER: Record<
  "provisions" | "farm-stall",
  readonly SampleItemSpec[]
> = {
  provisions: [
    { name: "Sample: Rice (bag)", quantity: 5, costPrice: 2500000, sellPrice: 2800000, lowStockLevel: 1 },
    { name: "Sample: Bread", quantity: 10, costPrice: 40000, sellPrice: 60000, lowStockLevel: 2 },
    { name: "Sample: Bottled water", quantity: 24, costPrice: 10000, sellPrice: 15000, lowStockLevel: 6 },
  ],
  "farm-stall": [
    { name: "Sample: Tomatoes (basket)", quantity: 8, costPrice: 300000, sellPrice: 400000, lowStockLevel: 2 },
    { name: "Sample: Yams", quantity: 20, costPrice: 50000, sellPrice: 80000, lowStockLevel: 5 },
    { name: "Sample: Eggs (crate)", quantity: 6, costPrice: 180000, sellPrice: 240000, lowStockLevel: 1 },
  ],
};
