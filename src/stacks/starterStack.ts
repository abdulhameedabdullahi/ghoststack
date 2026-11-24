import { DEFAULT_CURRENCY, SCHEMA_VERSION } from "../domain/types";
import type { Stack } from "../domain/types";

export interface StarterStackIds {
  stackId: string;
  stockCardId: string;
  salesCardId: string;
  debtsCardId: string;
  summaryCardId: string;
}

/** Builds the empty "Provisions shop" starter stack from caller-supplied ids. */
export function buildStarterStack(ids: StarterStackIds): Stack {
  return {
    schemaVersion: SCHEMA_VERSION,
    id: ids.stackId,
    name: "Provisions shop",
    currency: DEFAULT_CURRENCY,
    cards: [
      { id: ids.stockCardId, type: "stock", title: "Stock", items: [] },
      { id: ids.salesCardId, type: "sales-log", title: "Sales log", sales: [] },
      { id: ids.debtsCardId, type: "debts", title: "Money owed to you", debts: [] },
      { id: ids.summaryCardId, type: "daily-summary", title: "Daily summary" },
    ],
  };
}
