// @vitest-environment jsdom
import "fake-indexeddb/auto";
import "./test/setup";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { deleteDB } from "idb";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import App from "./App";
import { DB_NAME } from "./storage/db";
import { loadStack, saveStack } from "./storage/stackStore";
import { buildStarterStack } from "./stacks/starterStack";
import type { SalesLogCard, Stack } from "./domain/types";

const IDS = {
  stackId: "stack-1",
  stockCardId: "stock-1",
  salesCardId: "sales-1",
  debtsCardId: "debts-1",
  summaryCardId: "summary-1",
};

function seedStack(): Stack {
  const base = buildStarterStack(IDS);
  return {
    ...base,
    cards: base.cards.map((card) => {
      if (card.type === "stock") {
        return {
          ...card,
          items: [
            {
              id: "item-1",
              name: "Rice",
              quantity: 10,
              costPrice: 300,
              sellPrice: 500,
              lowStockLevel: 2,
            },
          ],
        };
      }
      if (card.type === "sales-log") {
        return {
          ...card,
          sales: [
            {
              id: "sale-0",
              itemId: "item-1",
              quantity: 2,
              unitPrice: 500,
              unitCost: 300,
              time: new Date().toISOString(),
            },
          ],
        };
      }
      return card;
    }),
  };
}

async function hideSalesLog() {
  fireEvent.click(screen.getByRole("button", { name: /Builder/ }));
  fireEvent.click(await screen.findByRole("button", { name: "Hide Sales log" }));
  await screen.findByRole("button", { name: "Show Sales log" });
  fireEvent.click(screen.getByRole("button", { name: /Play/ }));
}

beforeEach(async () => {
  await deleteDB(DB_NAME);
  localStorage.clear();
  const saved = await saveStack(seedStack());
  expect(saved.ok).toBe(true);
});

afterEach(async () => {
  await deleteDB(DB_NAME);
});

describe("App with the Sales log card hidden", () => {
  it("still records a sale from the Stock view and saves it on the hidden card", async () => {
    render(<App />);
    await screen.findByRole("tab", { name: /Stock/ });
    await hideSalesLog();

    expect(screen.queryByRole("tab", { name: /Sales log/ })).toBeNull();

    fireEvent.click(await screen.findByRole("button", { name: "Record a sale" }));
    fireEvent.change(screen.getByLabelText("Quantity sold"), {
      target: { value: "3" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await screen.findByText("Sale recorded");

    await waitFor(async () => {
      const loaded = await loadStack(IDS.stackId);
      expect(loaded.ok).toBe(true);
      if (!loaded.ok) return;
      const sales = loaded.value.cards.find(
        (c): c is SalesLogCard => c.id === IDS.salesCardId,
      );
      expect(sales?.hidden).toBe(true);
      expect(sales?.sales).toHaveLength(2);
      expect(sales?.sales.some((s) => s.quantity === 3 && s.itemId === "item-1")).toBe(
        true,
      );
    });
  });

  it("shows the same Daily summary figures before and after hiding a card", async () => {
    render(<App />);
    fireEvent.click(await screen.findByRole("tab", { name: /Daily summary/ }));
    const before = (await screen.findByRole("tabpanel")).textContent;
    expect(before).toContain("Sales today");

    await hideSalesLog();
    fireEvent.click(await screen.findByRole("tab", { name: /Daily summary/ }));
    const after = (await screen.findByRole("tabpanel")).textContent;

    expect(after).toBe(before);
  });
});
