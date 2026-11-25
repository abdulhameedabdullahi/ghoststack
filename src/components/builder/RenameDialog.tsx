import { useId, useState } from "react";
import type { FormEvent } from "react";
import { Button } from "../Button";
import { Dialog } from "../Dialog";
import { Field } from "../Field";
import "./RenameDialog.css";

export interface RenameDialogProps {
  /** Label for the field, for example "Shop name" or "Card title". */
  label: string;
  initialValue: string;
  error?: string;
  onSubmit: (value: string) => void;
  onClose: () => void;
}

export function RenameDialog({
  label,
  initialValue,
  error,
  onSubmit,
  onClose,
}: RenameDialogProps) {
  const titleId = useId();
  const fieldId = useId();
  const [value, setValue] = useState(initialValue);

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    onSubmit(value);
  }

  return (
    <Dialog titleId={titleId} onClose={onClose}>
      <form className="rename-dialog" onSubmit={handleSubmit} noValidate>
        <h2 id={titleId}>Change {label.toLowerCase()}</h2>
        <Field
          id={fieldId}
          label={label}
          value={value}
          onChange={setValue}
          error={error}
        />
        <div className="rename-dialog__actions">
          <Button type="submit" onClick={() => {}}>
            Save
          </Button>
          <Button onClick={onClose}>Cancel</Button>
        </div>
      </form>
    </Dialog>
  );
}

export default RenameDialog;
