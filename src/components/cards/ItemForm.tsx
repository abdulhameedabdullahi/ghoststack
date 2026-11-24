import { useState } from "react";
import type { ItemFormErrors, ItemFormValues } from "../../domain-ui/itemForm";
import { Button } from "../Button";
import { Field } from "../Field";

export interface ItemFormProps {
  /** Starting text for the five Fields. */
  initialValues: ItemFormValues;
  /** Called with the raw typed text when the owner saves. */
  onSubmit: (values: ItemFormValues) => void;
  onCancel: () => void;
  /** Errors to show next to each Field. */
  fieldErrors?: ItemFormErrors;
  /** An error that does not belong to one Field. Shown at the top. */
  formError?: string;
  title: string;
  submitLabel: string;
  /** Prefix for input ids, so two forms never share an id. */
  idPrefix?: string;
}

export const EMPTY_ITEM_FORM_VALUES: ItemFormValues = {
  name: "",
  quantity: "",
  costPrice: "",
  sellPrice: "",
  lowStockLevel: "",
};

/** Form for adding or editing an Item. Keeps every Field as raw text. */
export function ItemForm({
  initialValues,
  onSubmit,
  onCancel,
  fieldErrors = {},
  formError,
  title,
  submitLabel,
  idPrefix = "item-form",
}: ItemFormProps) {
  const [values, setValues] = useState<ItemFormValues>(initialValues);

  const set = (key: keyof ItemFormValues) => (value: string) =>
    setValues((prev) => ({ ...prev, [key]: value }));

  return (
    <form
      className="item-form"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(values);
      }}
    >
      <h3 className="item-form__title">{title}</h3>
      {formError && (
        <p className="item-form__error" role="alert">
          {formError}
        </p>
      )}
      <Field
        id={`${idPrefix}-name`}
        label="Item name"
        value={values.name}
        onChange={set("name")}
        error={fieldErrors.name}
      />
      <Field
        id={`${idPrefix}-quantity`}
        label="Quantity in stock"
        value={values.quantity}
        onChange={set("quantity")}
        inputMode="numeric"
        error={fieldErrors.quantity}
      />
      <Field
        id={`${idPrefix}-cost`}
        label="Cost price (₦)"
        value={values.costPrice}
        onChange={set("costPrice")}
        inputMode="decimal"
        hint="What you pay for one. Example: 1250 or 1250.50"
        error={fieldErrors.costPrice}
      />
      <Field
        id={`${idPrefix}-sell`}
        label="Sell price (₦)"
        value={values.sellPrice}
        onChange={set("sellPrice")}
        inputMode="decimal"
        hint="What a customer pays for one."
        error={fieldErrors.sellPrice}
      />
      <Field
        id={`${idPrefix}-low`}
        label="Low-stock level"
        value={values.lowStockLevel}
        onChange={set("lowStockLevel")}
        inputMode="numeric"
        hint="You get a warning when quantity is this number or less."
        error={fieldErrors.lowStockLevel}
      />
      <div className="item-form__actions">
        <Button type="submit" onClick={() => {}}>
          {submitLabel}
        </Button>
        <Button onClick={onCancel}>Cancel</Button>
      </div>
    </form>
  );
}

export default ItemForm;
