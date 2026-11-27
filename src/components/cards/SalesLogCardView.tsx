import type { SalesLogCard, Stack } from "../../domain/types";
import { saleTotal, salesNewestFirst } from "../../domain/sales";
import { Card } from "../Card";
import { GhostGuide } from "../GhostGuide";
import { formatDisplay } from "../formatMoney";
import { friendlyTime } from "../friendlyTime";
import "./SalesLogCardView.css";

export interface SalesLogCardViewProps {
  stack: Stack;
  card: SalesLogCard;
}

function displayName(name: string): string {
  return name.startsWith("Sample: ") ? name.slice("Sample: ".length) : name;
}

/** Play-mode view of the Sales log card. Read only. */
export function SalesLogCardView({ stack, card }: SalesLogCardViewProps) {
  const names = new Map<string, string>();
  for (const c of stack.cards) {
    if (c.type === "stock") {
      for (const item of c.items) names.set(item.id, item.name);
    }
  }

  const sales = salesNewestFirst(card.sales);

  return (
    <Card title={card.title}>
      {sales.length === 0 ? (
        <div className="sales-log__empty-state">
          <GhostGuide hint="Record a sale in Stock — it'll show up here." />
        </div>
      ) : (
        <ul className="sales-log__list">
          {sales.map((sale) => {
            const rawName = names.get(sale.itemId) ?? "Deleted item";
            return (
              <li key={sale.id} className="sales-log__row">
                <div className="sales-log__top">
                  <span className="sales-log__name">{displayName(rawName)}</span>
                  <span className="sales-log__total">
                    {formatDisplay(saleTotal(sale))}
                  </span>
                </div>
                {sale.quantity !== 1 && (
                  <span className="sales-log__detail">× {sale.quantity}</span>
                )}
                <span className="sales-log__detail">
                  {friendlyTime(sale.time)}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

export default SalesLogCardView;
