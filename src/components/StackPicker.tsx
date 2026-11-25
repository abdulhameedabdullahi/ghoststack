import { useId } from "react";
import "./StackPicker.css";

export interface StackPickerProps {
  stacks: { id: string; name: string }[];
  currentStackId: string;
  onPick: (id: string) => void;
  disabled: boolean;
}

export function StackPicker({
  stacks,
  currentStackId,
  onPick,
  disabled,
}: StackPickerProps) {
  const selectId = useId();

  if (stacks.length < 2) {
    const current = stacks.find((s) => s.id === currentStackId) ?? stacks[0];
    return (
      <div className="stack-picker">
        <span className="stack-picker__name">{current?.name ?? ""}</span>
      </div>
    );
  }

  return (
    <div className="stack-picker">
      <label className="stack-picker__label" htmlFor={selectId}>
        Stack
      </label>
      <select
        className="stack-picker__select"
        id={selectId}
        value={currentStackId}
        disabled={disabled}
        onChange={(e) => onPick(e.target.value)}
      >
        {stacks.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </select>
    </div>
  );
}

export default StackPicker;
