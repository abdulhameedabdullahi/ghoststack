import "./Field.css";

export interface FieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint?: string;
  error?: string;
  type?: "text" | "number";
  inputMode?: "text" | "numeric" | "decimal";
}

export function Field({
  id,
  label,
  value,
  onChange,
  hint,
  error,
  type = "text",
  inputMode,
}: FieldProps) {
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy =
    [hint ? hintId : "", error ? errorId : ""].filter(Boolean).join(" ") ||
    undefined;

  return (
    <div className="field">
      <label className="field__label" htmlFor={id}>
        {label}
      </label>
      <input
        className="field__input"
        id={id}
        type={type}
        inputMode={inputMode}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-describedby={describedBy}
        aria-invalid={error ? true : undefined}
      />
      {hint ? (
        <span className="field__hint" id={hintId}>
          {hint}
        </span>
      ) : null}
      {error ? (
        <div className="field__error-row">
          <span className="field__error-icon" aria-hidden="true">
            Problem:
          </span>
          <span className="field__error" id={errorId} role="alert">
            {error}
          </span>
        </div>
      ) : null}
    </div>
  );
}

export default Field;
