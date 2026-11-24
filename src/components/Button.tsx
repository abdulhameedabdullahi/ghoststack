import type { ReactNode } from "react";
import "./Button.css";

export interface ButtonProps {
  children: ReactNode;
  onClick: () => void;
  variant?: "main" | "danger";
  type?: "button" | "submit";
  disabled?: boolean;
}

export function Button({
  children,
  onClick,
  variant = "main",
  type = "button",
  disabled = false,
}: ButtonProps) {
  return (
    <button
      type={type}
      className={`button button--${variant}`}
      onClick={onClick}
      disabled={disabled}
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
