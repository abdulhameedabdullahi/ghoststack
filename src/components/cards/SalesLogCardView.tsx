import type { SalesLogCard, Stack } from "../../domain/types";
import { saleTotal, salesNewestFirst } from "../../domain/sales";
import { formatKobo } from "../../domain-ui/money";
import { Card } from "../Card";
import "./SalesLogCardView.css";

export interface SalesLogCardViewProps {
  stack: Stack;
  card: SalesLogCard;
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
        <p className="sales-log__empty">No sales yet.</p>
      ) : (
        <ul className="sales-log__list">
          {sales.map((sale) => (
            <li key={sale.id} className="sales-log__row">
              <span className="sales-log__name">
                {names.get(sale.itemId) ?? "Deleted item"}
              </span>
              <span className="sales-log__detail">
                Quantity: {sale.quantity}
              </span>
              <span className="sales-log__detail">
                Total: {formatKobo(saleTotal(sale))}
              </span>
              <span className="sales-log__detail">
                {new Date(sale.time).toLocaleString()}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

export default SalesLogCardView;
