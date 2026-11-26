import { useState } from "react";
import { Button } from "../Button";
import { Field } from "../Field";

export interface SaleFormProps {
  /** Name of the Item being sold. */
  itemName: string;
  /** Starting quantity text. "1" when freshly opened. */
  initialQuantityText: string;
  /** Called with the raw typed quantity when the owner saves. */
  onSubmit: (quantityText: string) => void;
  onCancel: () => void;
  /** Error shown next to the quantity Field. */
  error?: string;
  /** An error that does not belong to the Field. Shown at the top. */
  formError?: string;
  /** Prefix for input ids, so two forms never share an id. */
  idPrefix?: string;
}

/** Form for recording a sale of one Item. Keeps the quantity as raw text. */
export function SaleForm({
  itemName,
  initialQuantityText,
  onSubmit,
  onCancel,
  error,
  formError,
  idPrefix = "sale-form",
}: SaleFormProps) {
  const [quantityText, setQuantityText] = useState(initialQuantityText);

  return (
    <form
      className="item-form"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(quantityText);
      }}
    >
      <h3 className="item-form__title">Record a sale: {itemName}</h3>
      {formError && (
        <div className="item-form__error-row">
          <span aria-hidden="true">Problem:</span>
          <p className="item-form__error" role="alert">
            {formError}
          </p>
        </div>
      )}
      <Field
        id={`${idPrefix}-quantity`}
        label="Quantity sold"
        value={quantityText}
        onChange={setQuantityText}
        inputMode="numeric"
        error={error}
      />
      <div className="item-form__actions">
        <Button type="submit" onClick={() => { }}>
          Save
        </Button>
        <Button onClick={onCancel}>Cancel</Button>
      </div>
    </form>
  );
}

export default SaleForm;
