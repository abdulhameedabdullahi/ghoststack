import { useEffect, useRef, useState } from "react";
import {
  isVisible,
  moveCard,
  renameCard,
  renameStack,
  setCardHidden,
  visibleCards,
} from "../../domain";
import type { Stack } from "../../domain";
import { Button } from "../Button";
import { BuilderCardRow } from "./BuilderCardRow";
import { RenameDialog } from "./RenameDialog";
import "./BuilderPanel.css";

export interface BuilderPanelProps {
  stack: Stack;
  onStackChange: (s: Stack) => void;
  onOpenStarterChooser: () => void;
}

type PendingFocus =
  | undefined
  | { cardId: string; control: "up" | "down" | "hide-show" };

type RenameTarget = { kind: "stack" } | { kind: "card"; cardId: string };

/** Escapes a value for use inside a quoted attribute selector. */
function escapeAttr(value: string): string {
  if (typeof CSS !== "undefined" && typeof CSS.escape === "function") {
    return CSS.escape(value);
  }
  return value.replace(/["\\]/g, "\\$&").replace(/\n/g, "\\a ");
}

export function BuilderPanel({
  stack,
  onStackChange,
  onOpenStarterChooser,
}: BuilderPanelProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const [pendingFocus, setPendingFocus] = useState<PendingFocus>(undefined);
  const [renaming, setRenaming] = useState<RenameTarget | undefined>(
    undefined,
  );
  const [renameError, setRenameError] = useState<string | undefined>(
    undefined,
  );
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!pendingFocus) return;
    const root = rootRef.current;
    const find = (control: string) =>
      root?.querySelector<HTMLButtonElement>(
        `[data-builder-card="${escapeAttr(pendingFocus.cardId)}"][data-builder-control="${control}"]`,
      ) ?? null;
    let target = find(pendingFocus.control);
    if (target?.disabled) {
      if (pendingFocus.control === "up") target = find("down");
      else if (pendingFocus.control === "down") target = find("up");
    }
    target?.focus();
    setPendingFocus(undefined);
  }, [pendingFocus, stack.cards]);

  function setRowError(cardId: string, message: string | undefined) {
    setRowErrors((prev) => {
      const next = { ...prev };
      if (message === undefined) delete next[cardId];
      else next[cardId] = message;
      return next;
    });
  }

  function openRename(target: RenameTarget) {
    openerRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    setRenameError(undefined);
    setRenaming(target);
  }

  function closeRename() {
    setRenaming(undefined);
    setRenameError(undefined);
    const opener = openerRef.current;
    openerRef.current = null;
    opener?.focus();
  }

  function submitRename(value: string) {
    if (!renaming) return;
    const result =
      renaming.kind === "stack"
        ? renameStack(stack, value)
        : renameCard(stack, renaming.cardId, value);
    if (!result.ok) {
      setRenameError(result.error.message);
      return;
    }
    onStackChange(result.value);
    closeRename();
  }

  function handleMove(cardId: string, direction: "up" | "down") {
    const result = moveCard(stack, cardId, direction);
    if (!result.ok) {
      setRowError(cardId, result.error.message);
      return;
    }
    setRowError(cardId, undefined);
    onStackChange(result.value);
    setPendingFocus({ cardId, control: direction });
  }

  function handleToggleHidden(cardId: string, currentlyHidden: boolean) {
    const result = setCardHidden(stack, cardId, !currentlyHidden);
    if (!result.ok) {
      setRowError(cardId, result.error.message);
      return;
    }
    setRowError(cardId, undefined);
    onStackChange(result.value);
    setPendingFocus({ cardId, control: "hide-show" });
  }

  const onlyOneVisible = visibleCards(stack).length === 1;
  const renamingCard =
    renaming?.kind === "card"
      ? stack.cards.find((c) => c.id === renaming.cardId)
      : undefined;

  return (
    <div className="builder-panel" ref={rootRef}>
      <div className="builder-panel__shop">
        <h2 className="builder-panel__name">{stack.name}</h2>
        <Button onClick={() => openRename({ kind: "stack" })}>
          Rename shop
        </Button>
      </div>

      <ul className="builder-panel__list">
        {stack.cards.map((card, index) => (
          <BuilderCardRow
            key={card.id}
            card={card}
            isFirst={index === 0}
            isLast={index === stack.cards.length - 1}
            onlyVisible={onlyOneVisible && isVisible(card)}
            error={rowErrors[card.id]}
            onRename={() => openRename({ kind: "card", cardId: card.id })}
            onMove={(direction) => handleMove(card.id, direction)}
            onToggleHidden={() =>
              handleToggleHidden(card.id, card.hidden === true)
            }
          />
        ))}
      </ul>

      <div className="builder-panel__footer">
        <Button onClick={onOpenStarterChooser}>Choose a starter</Button>
      </div>

      {renaming?.kind === "stack" && (
        <RenameDialog
          label="Shop name"
          initialValue={stack.name}
          error={renameError}
          onSubmit={submitRename}
          onClose={closeRename}
        />
      )}
      {renamingCard && (
        <RenameDialog
          label="Card title"
          initialValue={renamingCard.title}
          error={renameError}
          onSubmit={submitRename}
          onClose={closeRename}
        />
      )}
    </div>
  );
}

export default BuilderPanel;
