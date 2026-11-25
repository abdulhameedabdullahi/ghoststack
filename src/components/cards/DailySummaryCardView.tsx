import type { Stack } from "../../domain/types";
import { dailyTotal, estimatedProfit, lowStockItems, totalOwed } from "../../domain";
import type { Result } from "../../domain";
import type { DayRange } from "../../domain-ui/dayRange";
import { formatKobo, formatSignedKobo } from "../../domain-ui/money";
import { Card } from "../Card";
import "./DailySummaryCardView.css";

export interface DailySummaryCardViewProps {
  stack: Stack;
  dayRange: DayRange;
}

function amountText(r: Result<number>, format: (n: number) => string): string {
  return r.ok ? format(r.value) : r.error.message;
}

/** Play-mode view of the Daily summary card. Read-only; never reads the clock. */
export function DailySummaryCardView({ stack, dayRange }: DailySummaryCardViewProps) {
  const summary = stack.cards.find((c) => c.type === "daily-summary");
  const salesCard = stack.cards.find((c) => c.type === "sales-log");
  const debtsCard = stack.cards.find((c) => c.type === "debts");
  const sales = salesCard?.type === "sales-log" ? salesCard.sales : [];
  const debts = debtsCard?.type === "debts" ? debtsCard.debts : [];

  const total = dailyTotal(sales, dayRange.start, dayRange.end);
  const profit = estimatedProfit(sales, dayRange.start, dayRange.end);
  const lowItems = lowStockItems(stack);

  return (
    <Card title={summary?.title ?? "Daily summary"}>
      <dl className="daily-summary">
        <div className="daily-summary__row">
          <dt>Sales today</dt>
          <dd className="daily-summary__value">{amountText(total, formatKobo)}</dd>
        </div>
        <div className="daily-summary__row">
          <dt>Estimated profit</dt>
          <dd className="daily-summary__value">{amountText(profit, formatSignedKobo)}</dd>
        </div>
        <div className="daily-summary__row">
          <dt>Low on stock</dt>
          <dd className="daily-summary__value">
            {lowItems.length === 0 ? (
              "Nothing is low on stock right now."
            ) : (
              <ul className="daily-summary__list">
                {lowItems.map((item) => (
                  <li key={item.id}>{item.name}</li>
                ))}
              </ul>
            )}
          </dd>
        </div>
        <div className="daily-summary__row">
          <dt>Total owed to you</dt>
          <dd className="daily-summary__value">{formatKobo(totalOwed(debts))}</dd>
        </div>
      </dl>
    </Card>
  );
}

export default DailySummaryCardView;
