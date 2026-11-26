// @vitest-environment jsdom
import "../../test/setup";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import type { DebtsCard, SalesLogCard, Stack, StockCard } from "../../domain/types";
import { StockCardView } from "./StockCardView";
import { SalesLogCardView } from "./SalesLogCardView";
import { DebtsCardView } from "./DebtsCardView";

afterEach(cleanup);

const stock: StockCard = { id: "stock-1", type: "stock", title: "Stock", items: [] };
const sales: SalesLogCard = { id: "sales-1", type: "sales-log", title: "Sales", sales: [] };
const debts: DebtsCard = { id: "debts-1", type: "debts", title: "Debts", debts: [] };

const stack: Stack = {
  schemaVersion: 1,
  id: "stack-1",
  name: "My shop",
  currency: "NGN",
  cards: [stock, sales, debts],
};

function expectGhost(container: HTMLElement) {
  const ghost = container.querySelector("svg.ghost");
  expect(ghost).not.toBeNull();
  expect(ghost?.getAttribute("aria-hidden")).toBe("true");
}

describe("empty states", () => {
  it("Stock shows its message once, a tagline and a ghost", () => {
    const { container } = render(
      <StockCardView stack={stack} card={stock} onStackChange={vi.fn()} />,
    );
    expect(screen.getAllByText("You have no items yet.")).toHaveLength(1);
    expect(screen.getByText("Raise your first one!")).toBeTruthy();
    expectGhost(container);
  });

  it("Sales log shows its message once, a tagline and a ghost", () => {
    const { container } = render(<SalesLogCardView stack={stack} card={sales} />);
    expect(screen.getAllByText("No sales yet.")).toHaveLength(1);
    expect(screen.getByText("Your first sale will show up here.")).toBeTruthy();
    expectGhost(container);
  });

  it("Debts shows its message once, a tagline and a ghost", () => {
    const { container } = render(
      <DebtsCardView stack={stack} card={debts} onStackChange={vi.fn()} />,
    );
    expect(screen.getAllByText("You have no debts recorded yet.")).toHaveLength(1);
    expect(screen.getByText("Nobody owes you anything right now.")).toBeTruthy();
    expectGhost(container);
  });
});
