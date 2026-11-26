import type { Item } from "../../domain/types";
import { isLowStock, isOutOfStock } from "../../domain";
import { formatDisplay } from "../formatMoney";
import { Button } from "../Button";

export interface ItemRowProps {
  item: Item;
  onEdit: (itemId: string) => void;
  onDelete: (itemId: string) => void;
  /** When given, a "Record a sale" button is shown. */
  onRecordSale?: (itemId: string) => void;
}

function displayName(name: string): string {
  return name.startsWith("Sample: ") ? name.slice("Sample: ".length) : name;
}

/** One Item in the stock list. Out of stock is checked before low stock. */
export function ItemRow({ item, onEdit, onDelete, onRecordSale }: ItemRowProps) {
  let warning: { icon: string; text: string } | null = null;
  if (isOutOfStock(item)) {
    warning = { icon: "✖", text: "Out of stock" };
  } else if (isLowStock(item)) {
    warning = { icon: "⚠", text: "Low stock" };
  }

  return (
    <li className="item-row">
      <div className="item-row__top">
        <span className="item-row__name">{displayName(item.name)}</span>
        <span className="item-row__price">{formatDisplay(item.sellPrice)}</span>
      </div>
      {item.quantity !== 1 && (
        <span className="item-row__qty">× {item.quantity}</span>
      )}
      {warning && (
        <span className="item-row__warning">
          <span aria-hidden="true">{warning.icon}</span> {warning.text}
        </span>
      )}
      <div className="item-row__actions">
        {onRecordSale && (
          <Button onClick={() => onRecordSale(item.id)}>Record a sale</Button>
        )}
        <Button onClick={() => onEdit(item.id)}>Edit</Button>
        <Button variant="danger" onClick={() => onDelete(item.id)}>
          Delete
        </Button>
      </div>
    </li>
  );
}

export default ItemRow;
