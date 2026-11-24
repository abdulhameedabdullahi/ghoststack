import type { ReactNode } from "react";
import "./Card.css";

export interface CardProps {
  title: string;
  children: ReactNode;
  footer?: ReactNode;
}

/** Bordered panel with a title bar, a body, and an optional footer. */
export function Card({ title, children, footer }: CardProps) {
  return (
    <section className="card">
      <header className="card__header">{title}</header>
      <div className="card__body">{children}</div>
      {footer !== undefined && footer !== null && footer !== false && (
        <footer className="card__footer">{footer}</footer>
      )}
    </section>
  );
}

export default Card;
