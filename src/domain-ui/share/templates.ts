/**
 * All message wording, keyed by Language. A new language edits only this record.
 */

import type { Language } from "./types";

export interface Templates {
  fallbackPerson: string;
  fallbackShop: string;
  itemsNone: string;
  itemsSeparator: string;
  itemsMore(n: number): string;
  debtReminder(p: { personName: string; shopName: string; amount: string }): string;
  dailySummary(p: {
    shopName: string;
    dateLabel: string;
    sales: string;
    profit: string;
    owed: string;
    items: string;
  }): string;
}

export const TEMPLATES: Record<Language, Templates> = {
  en: {
    fallbackPerson: "there",
    fallbackShop: "my shop",
    itemsNone: "nothing",
    itemsSeparator: ", ",
    itemsMore: (n) => ` and ${n} more`,
    debtReminder: ({ personName, shopName, amount }) =>
      `Hello ${personName}, a gentle reminder from ${shopName}: you still owe ${amount}. Thank you!`,
    dailySummary: ({ shopName, dateLabel, sales, profit, owed, items }) =>
      [
        `${shopName}, ${dateLabel}`,
        `Sales: ${sales}`,
        `Profit: ${profit}`,
        `Owed to me: ${owed}`,
        `Low on stock: ${items}`,
      ].join("\n"),
  },
};
