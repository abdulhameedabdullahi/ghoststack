import { useState } from "react";
import { Button } from "../Button";
import { Field } from "../Field";

export interface DebtFormProps {
  /** Starting customer name text. Empty when freshly opened. */
  initialCustomerText: string;
  /** Starting amount text. Empty when freshly opened. */
  initialAmountText: string;
  /** Called with the raw typed text when the owner saves. */
  onSubmit: (customerText: string, amountText: string) => void;
  onCancel: () => void;
  /** Error shown next to the customer name Field. */
  customerError?: string;
  /** Error shown next to the amount Field. */
  amountError?: string;
  /** An error that does not belong to a Field. Shown at the top. */
  formError?: string;
  /** Prefix for input ids. The customer input id is `{idPrefix}-customer`. */
  idPrefix?: string;
}

/** Form for recording money owed to you. Keeps both fields as raw text. */
export function DebtForm({
  initialCustomerText,
  initialAmountText,
  onSubmit,
  onCancel,
  customerError,
  amountError,
  formError,
  idPrefix = "debt-form",
}: DebtFormProps) {
  const [customerText, setCustomerText] = useState(initialCustomerText);
  const [amountText, setAmountText] = useState(initialAmountText);

  return (
    <form
      className="item-form"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(customerText, amountText);
      }}
    >
      <h3 className="item-form__title">Record a debt</h3>
      {formError && (
        <div className="item-form__error-row">
          <span aria-hidden="true">Problem:</span>
          <p className="item-form__error" role="alert">
            {formError}
          </p>
        </div>
      )}
      <Field
        id={`${idPrefix}-customer`}
        label="Who owes you?"
        value={customerText}
        onChange={setCustomerText}
        error={customerError}
      />
      <Field
        id={`${idPrefix}-amount`}
        label="Amount owed"
        value={amountText}
        onChange={setAmountText}
        inputMode="decimal"
        error={amountError}
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

export default DebtForm;
