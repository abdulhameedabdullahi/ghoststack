/**
 * Demo stack: "Mama Ife's Provision Shop".
 * Built entirely through domain functions — never writes raw storage.
 * All sample data is prefixed "Sample:" so it is easy to identify and remove.
 */
import { addItem } from "../domain/items";
import { recordSale } from "../domain/sales";
import { recordDebt } from "../domain/debts";
import { renameStack } from "../domain/cards";
import type { Stack } from "../domain/types";
import type { StarterStackIds } from "./starterStack";
import { buildStarterStack } from "./starterStack";

function isoAt(today: Date, daysAgo: number, hour: number): string {
  const d = new Date(today);
  d.setDate(d.getDate() - daysAgo);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
}

function must<T>(result: { ok: boolean; value?: T; error?: { message: string } }): T {
  if (!result.ok || result.value === undefined) throw new Error((result as { error: { message: string } }).error.message);
  return result.value;
}

/**
 * Builds a fully populated demo stack.
 * @param ids  - Caller-supplied card/stack IDs (same shape as StarterStackIds).
 * @param today - Date to anchor sale timestamps to; "today" sales show in daily summary.
 */
export function buildDemoStack(ids: StarterStackIds, today: Date): Stack {
  const { stackId, stockCardId, salesCardId, debtsCardId, summaryCardId } = ids;

  // ── Bootstrap ───────────────────────────────────────────────────────────
  let s = must(
    renameStack(
      buildStarterStack({ stackId, stockCardId, salesCardId, debtsCardId, summaryCardId }),
      "Mama Ife's Provision Shop",
    ),
  );

  // ── Items ───────────────────────────────────────────────────────────────
  const ITEMS = [
    { id: "di1", name: "Sample: Indomie Noodles", quantity: 120, costPrice: 7000, sellPrice: 10000, lowStockLevel: 10 },
    { id: "di2", name: "Sample: Peak Milk Tin", quantity: 60, costPrice: 20000, sellPrice: 25000, lowStockLevel: 5 },
    { id: "di3", name: "Sample: Milo 400g", quantity: 50, costPrice: 150000, sellPrice: 180000, lowStockLevel: 4 },
    { id: "di4", name: "Sample: Dettol Soap", quantity: 80, costPrice: 15000, sellPrice: 20000, lowStockLevel: 6 },
    { id: "di5", name: "Sample: Vegetable Oil 2L", quantity: 40, costPrice: 150000, sellPrice: 200000, lowStockLevel: 3 },
    { id: "di6", name: "Sample: Tom Tom Sweets", quantity: 300, costPrice: 2000, sellPrice: 3000, lowStockLevel: 20 },
    { id: "di7", name: "Sample: Cabin Biscuit", quantity: 100, costPrice: 25000, sellPrice: 35000, lowStockLevel: 8 },
    { id: "di8", name: "Sample: Spaghetti 500g", quantity: 60, costPrice: 50000, sellPrice: 65000, lowStockLevel: 5 },
    // Low-stock items (quantity ≤ lowStockLevel — clearly labelled)
    { id: "di9", name: "Sample: Zobo Drink Packs", quantity: 3, costPrice: 100000, sellPrice: 150000, lowStockLevel: 5 },
    { id: "di10", name: "Sample: Sugar 1kg", quantity: 2, costPrice: 50000, sellPrice: 70000, lowStockLevel: 10 },
  ] as const;

  for (const item of ITEMS) {
    s = must(addItem({ stack: s, stockCardId, itemId: item.id, ...item }));
  }

  // ── Sales (spread across 7 days; today's sales show in daily summary) ──
  const SALES: Array<{ id: string; itemId: string; quantity: number; daysAgo: number; hour: number }> = [
    { id: "ds1",  itemId: "di1", quantity: 5,  daysAgo: 0, hour: 9  }, // today morning
    { id: "ds2",  itemId: "di2", quantity: 2,  daysAgo: 0, hour: 9  },
    { id: "ds3",  itemId: "di3", quantity: 1,  daysAgo: 0, hour: 14 }, // today afternoon
    { id: "ds4",  itemId: "di4", quantity: 3,  daysAgo: 0, hour: 14 },
    { id: "ds5",  itemId: "di1", quantity: 8,  daysAgo: 1, hour: 10 },
    { id: "ds6",  itemId: "di7", quantity: 4,  daysAgo: 1, hour: 15 },
    { id: "ds7",  itemId: "di5", quantity: 2,  daysAgo: 2, hour: 11 },
    { id: "ds8",  itemId: "di6", quantity: 20, daysAgo: 2, hour: 16 },
    { id: "ds9",  itemId: "di8", quantity: 5,  daysAgo: 3, hour: 9  },
    { id: "ds10", itemId: "di4", quantity: 2,  daysAgo: 3, hour: 13 },
    { id: "ds11", itemId: "di2", quantity: 3,  daysAgo: 4, hour: 10 },
    { id: "ds12", itemId: "di1", quantity: 6,  daysAgo: 4, hour: 15 },
    { id: "ds13", itemId: "di5", quantity: 1,  daysAgo: 5, hour: 11 },
    { id: "ds14", itemId: "di7", quantity: 2,  daysAgo: 5, hour: 14 },
    { id: "ds15", itemId: "di8", quantity: 3,  daysAgo: 6, hour: 9  },
    { id: "ds16", itemId: "di6", quantity: 15, daysAgo: 6, hour: 15 },
  ];

  for (const sale of SALES) {
    s = must(
      recordSale({
        stack: s,
        stockCardId,
        salesCardId,
        itemId: sale.itemId,
        quantity: sale.quantity,
        saleId: sale.id,
        time: isoAt(today, sale.daysAgo, sale.hour),
      }),
    );
  }

  // ── Debts (4 unpaid) ────────────────────────────────────────────────────
  const DEBTS: Array<{ id: string; customer: string; amount: number; daysAgo: number }> = [
    { id: "dd1", customer: "Mama Kemi",    amount: 500000,  daysAgo: 3 },
    { id: "dd2", customer: "Mr. Tunde",    amount: 1250000, daysAgo: 5 },
    { id: "dd3", customer: "Uncle Biodun", amount: 300000,  daysAgo: 2 },
    { id: "dd4", customer: "Iya Risi",     amount: 800000,  daysAgo: 1 },
  ];

  for (const debt of DEBTS) {
    s = must(
      recordDebt({
        stack: s,
        debtsCardId,
        debtId: debt.id,
        customer: debt.customer,
        amount: debt.amount,
        date: isoAt(today, debt.daysAgo, 12),
      }),
    );
  }

  return s;
}
