import type { ReactNode, Ref } from "react";
import "./Button.css";

export interface ButtonProps {
  children: ReactNode;
  onClick: () => void;
  variant?: "main" | "danger";
  type?: "button" | "submit";
  disabled?: boolean;
  /** Optional ref to the underlying button element. */
  buttonRef?: Ref<HTMLButtonElement>;
  /** Optional data-* attributes for the underlying button element. */
  dataAttributes?: Record<`data-${string}`, string>;
  /** Optional accessible name, used when the visible text is short or vague. */
  ariaLabel?: string;
  /** Looks disabled and is announced as disabled, but stays focusable. */
  ariaDisabled?: boolean;
}

export function Button({
  children,
  onClick,
  variant = "main",
  type = "button",
  disabled = false,
  buttonRef,
  dataAttributes,
  ariaLabel,
  ariaDisabled,
}: ButtonProps) {
  return (
    <button
      ref={buttonRef}
      {...dataAttributes}
      type={type}
      className={`button button--${variant}`}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      aria-disabled={ariaDisabled ? true : undefined}
    >
      {variant === "danger" && (
        <span className="button__icon" aria-hidden="true">
          ⚠
        </span>
      )}
      {children}
    </button>
  );
}

export default Button;
