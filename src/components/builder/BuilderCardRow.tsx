import type { Card } from "../../domain";
import { Button } from "../Button";
import "./BuilderCardRow.css";

export interface BuilderCardRowProps {
  card: Card;
  isFirst: boolean;
  isLast: boolean;
  /** True when this card is the only card showing in the stack. */
  onlyVisible: boolean;
  /** Message to show next to the controls, if the last change failed. */
  error?: string;
  /** Opens the rename dialog for this card. */
  onRename: () => void;
  onMove: (direction: "up" | "down") => void;
  onToggleHidden: () => void;
}

export function BuilderCardRow({
  card,
  isFirst,
  isLast,
  onlyVisible,
  error,
  onRename,
  onMove,
  onToggleHidden,
}: BuilderCardRowProps) {
  const hidden = card.hidden === true;
  const data = (control: string) => ({
    "data-builder-card": card.id,
    "data-builder-control": control,
  });

  return (
    <li className="builder-row">
      <div className="builder-row__head">
        <span className="builder-row__title">{card.title}</span>
        <span className="builder-row__status">
          <span aria-hidden="true">{hidden ? "○" : "●"} </span>
          {hidden ? "Hidden" : "Showing"}
        </span>
      </div>
      <div className="builder-row__controls">
        <Button
          onClick={onRename}
          ariaLabel={`Rename ${card.title}`}
          dataAttributes={data("rename")}
        >
          Rename
        </Button>
        <Button
          onClick={() => onMove("up")}
          disabled={isFirst}
          ariaLabel={`Move ${card.title} up`}
          dataAttributes={data("up")}
        >
          Move up
        </Button>
        <Button
          onClick={() => onMove("down")}
          disabled={isLast}
          ariaLabel={`Move ${card.title} down`}
          dataAttributes={data("down")}
        >
          Move down
        </Button>
        <Button
          onClick={onToggleHidden}
          disabled={onlyVisible}
          ariaLabel={`${hidden ? "Show" : "Hide"} ${card.title}`}
          dataAttributes={data("hide-show")}
        >
          {hidden ? "Show" : "Hide"}
        </Button>
      </div>
      {onlyVisible && (
        <p className="builder-row__note">
          At least one card must stay showing.
        </p>
      )}
      {error && (
        <p className="builder-row__error" role="alert">
          <span aria-hidden="true">⚠ </span>
          {error}
        </p>
      )}
    </li>
  );
}

export default BuilderCardRow;
