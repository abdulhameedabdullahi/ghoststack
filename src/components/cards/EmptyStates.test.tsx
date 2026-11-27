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
  it("Stock shows the ghost guide hint once and a ghost", () => {
    const { container } = render(
      <StockCardView stack={stack} card={stock} onStackChange={vi.fn()} />,
    );
    expect(
      screen.getAllByText("Tap 'Add an item' to list your first product."),
    ).toHaveLength(1);
    expectGhost(container);
  });

  it("Sales log shows the ghost guide hint once and a ghost", () => {
    const { container } = render(<SalesLogCardView stack={stack} card={sales} />);
    expect(
      screen.getAllByText("Record a sale in Stock — it'll show up here."),
    ).toHaveLength(1);
    expectGhost(container);
  });

  it("Debts shows the ghost guide hint once and a ghost", () => {
    const { container } = render(
      <DebtsCardView stack={stack} card={debts} onStackChange={vi.fn()} />,
    );
    expect(
      screen.getAllByText("Tap 'Record a debt' to log a customer tab."),
    ).toHaveLength(1);
    expectGhost(container);
  });
});
