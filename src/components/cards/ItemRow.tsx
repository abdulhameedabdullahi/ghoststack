import type { Item } from "../../domain/types";
import { isLowStock, isOutOfStock } from "../../domain";
import { formatKobo } from "../../domain-ui/money";
import { Button } from "../Button";

export interface ItemRowProps {
  item: Item;
  onEdit: (itemId: string) => void;
  onDelete: (itemId: string) => void;
}

/** One Item in the stock list. Out of stock is checked before low stock. */
export function ItemRow({ item, onEdit, onDelete }: ItemRowProps) {
  let warning: { icon: string; text: string } | null = null;
  if (isOutOfStock(item)) {
    warning = { icon: "✖", text: "Out of stock" };
  } else if (isLowStock(item)) {
    warning = { icon: "⚠", text: "Low stock" };
  }

  return (
    <li className="item-row">
      <div className="item-row__info">
        <span className="item-row__name">{item.name}</span>
        <span className="item-row__detail">
          Quantity: {item.quantity} · Price: {formatKobo(item.sellPrice)}
        </span>
        {warning && (
          <span className="item-row__warning">
            <span aria-hidden="true">{warning.icon}</span> {warning.text}
          </span>
        )}
      </div>
      <div className="item-row__actions">
        <Button onClick={() => onEdit(item.id)}>Edit</Button>
        <Button variant="danger" onClick={() => onDelete(item.id)}>
          Delete
        </Button>
      </div>
    </li>
  );
}

export default ItemRow;
