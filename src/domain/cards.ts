import { err, ok } from "./result";
import type { Result } from "./result";
import type { Card, Stack } from "./types";

/** Longest allowed shop or card name, after trimming. */
export const NAME_MAX_LENGTH = 40;

/** Trims, and checks 1-40 chars. Returns the trimmed name or an error. */
export function validateName(value: unknown): Result<string> {
  if (typeof value !== "string") return err("NAME_REQUIRED");
  const trimmed = value.trim();
  if (trimmed.length === 0) return err("NAME_REQUIRED");
  if (trimmed.length > NAME_MAX_LENGTH) return err("NAME_TOO_LONG");
  return ok(trimmed);
}

/** Position of the card in stack.cards (hidden cards included), or -1. */
export function findCardIndex(stack: Stack, cardId: string): number {
  return stack.cards.findIndex((c) => c.id === cardId);
}

/** Absent or false hidden counts as visible; only hidden === true is hidden. */
export function isVisible(card: Card): boolean {
  return card.hidden !== true;
}

/** Cards that are not hidden, in stack order. Does not change the stack. */
export function visibleCards(stack: Stack): Card[] {
  return stack.cards.filter(isVisible);
}

/** Changes only the stack name. Cards are untouched. */
export function renameStack(stack: Stack, name: unknown): Result<Stack> {
  const checked = validateName(name);
  if (!checked.ok) return checked;
  return ok({ ...stack, name: checked.value });
}

/** Changes only the title of one card. The name check runs first. */
export function renameCard(
  stack: Stack,
  cardId: string,
  title: unknown,
): Result<Stack> {
  const checked = validateName(title);
  if (!checked.ok) return checked;
  const index = findCardIndex(stack, cardId);
  if (index === -1) return err("CARD_NOT_FOUND");
  const cards = stack.cards.map((c, i) =>
    i === index ? { ...c, title: checked.value } : c,
  );
  return ok({ ...stack, cards });
}

/**
 * Swaps a card with its neighbour. Position counts over all cards, hidden
 * ones included. Checks run in this order: direction, card, neighbour.
 */
export function moveCard(
  stack: Stack,
  cardId: string,
  direction: unknown,
): Result<Stack> {
  if (direction !== "up" && direction !== "down") return err("BAD_DIRECTION");
  const index = findCardIndex(stack, cardId);
  if (index === -1) return err("CARD_NOT_FOUND");
  const other = direction === "up" ? index - 1 : index + 1;
  if (other < 0 || other >= stack.cards.length) {
    return err("CANNOT_MOVE_FURTHER");
  }
  const cards = [...stack.cards];
  [cards[index], cards[other]] = [cards[other], cards[index]];
  return ok({ ...stack, cards });
}

/**
 * Hides or shows one card. Checks run in this order: value, card, last
 * visible card. Showing removes the `hidden` key entirely.
 */
export function setCardHidden(
  stack: Stack,
  cardId: string,
  hidden: unknown,
): Result<Stack> {
  if (typeof hidden !== "boolean") return err("BAD_HIDDEN_VALUE");
  const index = findCardIndex(stack, cardId);
  if (index === -1) return err("CARD_NOT_FOUND");
  if (hidden && !stack.cards.some((c, i) => i !== index && isVisible(c))) {
    return err("MUST_STAY_VISIBLE");
  }
  const target = stack.cards[index];
  let updated: Card;
  if (hidden) {
    updated = { ...target, hidden: true };
  } else {
    const { hidden: _drop, ...rest } = target;
    updated = rest as Card;
  }
  const cards = stack.cards.map((c, i) => (i === index ? updated : c));
  return ok({ ...stack, cards });
}
