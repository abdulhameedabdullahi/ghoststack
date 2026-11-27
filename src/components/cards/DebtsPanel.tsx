import type { DebtsCard, Stack } from "../../domain/types";
import { DebtsCardView } from "./DebtsCardView";

export interface DebtsPanelProps {
  stack: Stack;
  card?: DebtsCard;
  onStackChange: (s: Stack) => void;
}

/** Shows the Debts card view, or a friendly message when the shop has no Debts card. */
export function DebtsPanel({ stack, card, onStackChange }: DebtsPanelProps) {
  if (card === undefined) {
    return <p>To track debts, add a Debts card in Builder.</p>;
  }
  return <DebtsCardView stack={stack} card={card} onStackChange={onStackChange} />;
}
