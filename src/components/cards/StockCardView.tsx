import { useEffect, useRef, useState } from "react";
import type { Stack, StockCard } from "../../domain/types";
import { addItem, deleteItem, recordSale, updateItem } from "../../domain";
import { parseWholeNumber } from "../../domain-ui/wholeNumber";
import { SaleForm } from "./SaleForm";
import { formatKobo } from "../../domain-ui/money";
import { parseItemForm } from "../../domain-ui/itemForm";
import type { ItemFormErrors, ItemFormValues } from "../../domain-ui/itemForm";
import { Button } from "../Button";
import { Card } from "../Card";
import { ItemForm, EMPTY_ITEM_FORM_VALUES } from "./ItemForm";
import { ItemRow } from "./ItemRow";
import "./StockCardView.css";

export interface StockCardViewProps {
  stack: Stack;
  card: StockCard;
  onStackChange: (s: Stack) => void;
  /** Id of the Sales log card, or undefined when the shop has none. */
  salesCardId?: string | undefined;
}

type FormMode =
  | { kind: "closed" }
  | { kind: "add" }
  | { kind: "edit"; itemId: string }
  | { kind: "sale"; itemId: string };

interface SaleState {
  quantityText: string;
  error?: string;
  formError?: string;
}

type ConfirmState =
  | { kind: "closed" }
  | { kind: "confirm-delete"; itemId: string };

interface FormMessages {
  fieldErrors: ItemFormErrors;
  formError?: string;
}

const NO_MESSAGES: FormMessages = { fieldErrors: {} };

/** Play-mode view of the Stock card. */
export function StockCardView({
  stack,
  card,
  onStackChange,
  salesCardId,
}: StockCardViewProps) {
  const [formMode, setFormMode] = useState<FormMode>({ kind: "closed" });
  const [saleState, setSaleState] = useState<SaleState>({ quantityText: "1" });
  const [saleNotice, setSaleNotice] = useState("");
  const noticeTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );

  useEffect(() => {
    return () => {
      if (noticeTimeout.current !== undefined) clearTimeout(noticeTimeout.current);
    };
  }, []);

  const showSaleNotice = () => {
    if (noticeTimeout.current !== undefined) clearTimeout(noticeTimeout.current);
    setSaleNotice("Sale recorded");
    noticeTimeout.current = setTimeout(() => {
      noticeTimeout.current = undefined;
      setSaleNotice("");
    }, 3000);
  };

  const openSaleForm = (itemId: string) => {
    setSaleState({ quantityText: "1" });
    openForm({ kind: "sale", itemId });
  };

  const handleSaleSubmit = (itemId: string, quantityText: string) => {
    if (salesCardId === undefined) return;
    const parsed = parseWholeNumber(quantityText);
    if (!parsed.ok) {
      setSaleState({ quantityText, error: parsed.error.message });
      return;
    }
    const result = recordSale({
      stack,
      stockCardId: card.id,
      salesCardId,
      itemId,
      quantity: parsed.value,
      saleId: crypto.randomUUID(),
      time: new Date().toISOString(),
    });
    if (!result.ok) {
      if (result.error.code === "NOT_ENOUGH_STOCK") {
        setSaleState({ quantityText, error: "Not enough in stock." });
      } else {
        setSaleState({ quantityText, formError: result.error.message });
      }
      return;
    }
    closeForm();
    showSaleNotice();
    onStackChange(result.value);
  };

  const [messages, setMessages] = useState<FormMessages>(NO_MESSAGES);

  const [confirm, setConfirm] = useState<ConfirmState>({ kind: "closed" });
  const [deleteError, setDeleteError] = useState<string | undefined>();

  const openConfirm = (itemId: string) => {
    setDeleteError(undefined);
    setConfirm({ kind: "confirm-delete", itemId });
  };
  const closeConfirm = () => {
    setDeleteError(undefined);
    setConfirm({ kind: "closed" });
  };

  const handleDelete = (itemId: string) => {
    const result = deleteItem({ stack, stockCardId: card.id, itemId });
    if (!result.ok) {
      setDeleteError(result.error.message);
      return;
    }
    closeConfirm();
    onStackChange(result.value);
  };

  const openForm = (mode: FormMode) => {
    setMessages(NO_MESSAGES);
    setFormMode(mode);
  };
  const closeForm = () => openForm({ kind: "closed" });

  const handleAddSubmit = (values: ItemFormValues) => {
    const parsed = parseItemForm(values);
    if (!parsed.ok) {
      setMessages({ fieldErrors: parsed.errors });
      return;
    }
    const result = addItem({
      stack,
      stockCardId: card.id,
      itemId: crypto.randomUUID(),
      ...parsed.value,
    });
    if (!result.ok) {
      setMessages({ fieldErrors: {}, formError: result.error.message });
      return;
    }
    closeForm();
    onStackChange(result.value);
  };

  const handleEditSubmit = (itemId: string, values: ItemFormValues) => {
    const parsed = parseItemForm(values);
    if (!parsed.ok) {
      setMessages({ fieldErrors: parsed.errors });
      return;
    }
    const result = updateItem({
      stack,
      stockCardId: card.id,
      itemId,
      ...parsed.value,
    });
    if (!result.ok) {
      setMessages({ fieldErrors: {}, formError: result.error.message });
      return;
    }
    closeForm();
    onStackChange(result.value);
  };

  const editingItem =
    formMode.kind === "edit"
      ? card.items.find((i) => i.id === formMode.itemId)
      : undefined;
  const deletingItem =
    confirm.kind === "confirm-delete"
      ? card.items.find((i) => i.id === confirm.itemId)
      : undefined;
  const sellingItem =
    formMode.kind === "sale" && salesCardId !== undefined
      ? card.items.find((i) => i.id === formMode.itemId)
      : undefined;
  const formOpen =
    formMode.kind === "add" ||
    editingItem !== undefined ||
    sellingItem !== undefined;

  const addButton = (
    <Button onClick={() => openForm({ kind: "add" })}>Add an item</Button>
  );

  return (
    <Card title={card.title}>
      <p aria-live="polite">{saleNotice}</p>
      {sellingItem && (
        <SaleForm
          key={sellingItem.id}
          itemName={sellingItem.name}
          initialQuantityText={saleState.quantityText}
          error={saleState.error}
          formError={saleState.formError}
          onSubmit={(text) => handleSaleSubmit(sellingItem.id, text)}
          onCancel={closeForm}
          idPrefix="sale-form"
        />
      )}
      {formMode.kind === "add" && (
        <ItemForm
          title="Add an item"
          submitLabel="Save item"
          initialValues={EMPTY_ITEM_FORM_VALUES}
          fieldErrors={messages.fieldErrors}
          formError={messages.formError}
          onSubmit={handleAddSubmit}
          onCancel={closeForm}
          idPrefix="add-item"
        />
      )}
      {editingItem && (
        <ItemForm
          key={editingItem.id}
          title="Edit item"
          submitLabel="Save changes"
          initialValues={{
            name: editingItem.name,
            quantity: String(editingItem.quantity),
            costPrice: formatKobo(editingItem.costPrice),
            sellPrice: formatKobo(editingItem.sellPrice),
            lowStockLevel: String(editingItem.lowStockLevel),
          }}
          fieldErrors={messages.fieldErrors}
          formError={messages.formError}
          onSubmit={(values) => handleEditSubmit(editingItem.id, values)}
          onCancel={closeForm}
          idPrefix="edit-item"
        />
      )}
      {deletingItem && (
        <div className="stock-card__confirm" role="alertdialog" aria-labelledby="delete-item-title">
          <p id="delete-item-title" className="stock-card__confirm-text">
            Delete "{deletingItem.name}"? This cannot be undone.
          </p>
          {deleteError && (
            <p className="item-form__error" role="alert">
              {deleteError}
            </p>
          )}
          <div className="item-form__actions">
            <Button variant="danger" onClick={() => handleDelete(deletingItem.id)}>
              Delete item
            </Button>
            <Button onClick={closeConfirm}>Keep item</Button>
          </div>
        </div>
      )}
      {!formOpen && !deletingItem &&
        (card.items.length === 0 ? (
          <div className="stock-card__empty">
            <p>You have no items yet.</p>
            {addButton}
          </div>
        ) : (
          <div className="stock-card__content">
            <div className="stock-card__add">{addButton}</div>
            {salesCardId === undefined && (
              <p>Sales can't be recorded because this shop has no Sales log card.</p>
            )}
            <ul className="stock-card__list">
              {card.items.map((item) => (
                <ItemRow
                  key={item.id}
                  onRecordSale={salesCardId !== undefined ? openSaleForm : undefined}
                  item={item}
                  onEdit={(itemId) => openForm({ kind: "edit", itemId })}
                  onDelete={openConfirm}
                />
              ))}
            </ul>
          </div>
        ))}
    </Card>
  );
}

export default StockCardView;
