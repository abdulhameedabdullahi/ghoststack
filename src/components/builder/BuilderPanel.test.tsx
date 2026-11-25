// @vitest-environment jsdom
import "../../test/setup";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { ERROR_MESSAGES, setCardHidden } from "../../domain";
import type { Stack } from "../../domain";
import { buildStarterStack } from "../../stacks/starterStack";
import { BuilderPanel } from "./BuilderPanel";

afterEach(cleanup);

const IDS = {
  stackId: "stack-1",
  stockCardId: "stock",
  salesCardId: "sales",
  debtsCardId: "debts",
  summaryCardId: "summary",
};

function makeStack(hiddenIds: string[] = []): Stack {
  let stack = buildStarterStack(IDS);
  for (const id of hiddenIds) {
    const r = setCardHidden(stack, id, true);
    if (!r.ok) throw new Error(r.error.message);
    stack = r.value;
  }
  return stack;
}

function titleOf(stack: Stack, id: string): string {
  return stack.cards.find((c) => c.id === id)!.title;
}

/** Keeps the Stack in state so the panel re-renders after a change. */
function Wrapper({ initial }: { initial: Stack }) {
  const [stack, setStack] = useState(initial);
  return (
    <BuilderPanel
      stack={stack}
      onStackChange={setStack}
      onOpenStarterChooser={vi.fn()}
    />
  );
}

function renderPanel(stack: Stack) {
  render(<Wrapper initial={stack} />);
}

function control(stack: Stack, id: string, name: "Rename" | "Move up" | "Move down" | "Hide" | "Show") {
  const title = titleOf(stack, id);
  const label =
    name === "Move up"
      ? `Move ${title} up`
      : name === "Move down"
        ? `Move ${title} down`
        : `${name} ${title}`;
  return screen.getByRole("button", { name: label }) as HTMLButtonElement;
}

describe("BuilderPanel", () => {
  it("shows a blank-name error inside the card rename dialog", () => {
    const stack = makeStack();
    renderPanel(stack);
    fireEvent.click(control(stack, "sales", "Rename"));
    const dialog = screen.getByRole("dialog");
    fireEvent.change(screen.getByLabelText("Card title"), {
      target: { value: "   " },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    const alert = screen.getByRole("alert");
    expect(alert.textContent).toBe(ERROR_MESSAGES.NAME_REQUIRED);
    expect(dialog.contains(alert)).toBe(true);
    expect(screen.getByLabelText("Card title").getAttribute("aria-invalid")).toBe(
      "true",
    );
  });

  it("shows a blank-name error inside the shop rename dialog", () => {
    const stack = makeStack();
    renderPanel(stack);
    fireEvent.click(screen.getByRole("button", { name: "Rename shop" }));
    fireEvent.change(screen.getByLabelText("Shop name"), {
      target: { value: "" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    const dialog = screen.getByRole("dialog");
    expect(dialog.contains(screen.getByRole("alert"))).toBe(true);
  });

  it("disables Move up on the first row and Move down on the last row", () => {
    const stack = makeStack();
    renderPanel(stack);
    const first = stack.cards[0].id;
    const last = stack.cards[stack.cards.length - 1].id;
    expect(control(stack, first, "Move up").disabled).toBe(true);
    expect(control(stack, first, "Move down").disabled).toBe(false);
    expect(control(stack, last, "Move down").disabled).toBe(true);
    expect(control(stack, last, "Move up").disabled).toBe(false);
  });

  it("disables Hide on the only visible card and shows the note", () => {
    const stack = makeStack(["sales", "debts", "summary"]);
    renderPanel(stack);
    expect(control(stack, "stock", "Hide").disabled).toBe(true);
    expect(
      screen.getAllByText("At least one card must stay showing."),
    ).toHaveLength(1);
    expect(control(stack, "sales", "Show").disabled).toBe(false);
  });

  it("does not show the note when several cards are showing", () => {
    renderPanel(makeStack());
    expect(screen.queryByText("At least one card must stay showing.")).toBeNull();
  });

  it("keeps focus on the same control after a move", () => {
    const stack = makeStack();
    renderPanel(stack);
    fireEvent.click(control(stack, "stock", "Move down"));
    expect(document.activeElement).toBe(control(stack, "stock", "Move down"));
    fireEvent.click(control(stack, "stock", "Move up"));
    // Back at the top, Move up is now disabled, so focus goes to Move down.
    expect(control(stack, "stock", "Move up").disabled).toBe(true);
    expect(document.activeElement).toBe(control(stack, "stock", "Move down"));
  });

  it("moves focus to Move up when a card reaches the bottom", () => {
    const stack = makeStack();
    renderPanel(stack);
    // Stock goes down three times to reach the last row.
    for (let i = 0; i < 3; i++) {
      fireEvent.click(control(stack, "stock", "Move down"));
    }
    expect(control(stack, "stock", "Move down").disabled).toBe(true);
    expect(document.activeElement).toBe(control(stack, "stock", "Move up"));
  });

  it("keeps focus on the same card's Hide and Show control", () => {
    const stack = makeStack();
    renderPanel(stack);
    fireEvent.click(control(stack, "sales", "Hide"));
    const show = control(stack, "sales", "Show");
    expect(document.activeElement).toBe(show);
    fireEvent.click(show);
    expect(document.activeElement).toBe(control(stack, "sales", "Hide"));
  });
});
