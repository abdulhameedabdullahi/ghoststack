// @vitest-environment jsdom
import "./test/setup";
import "fake-indexeddb/auto";
import { deleteDB } from "idb";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import App from "./App";
import { DB_NAME } from "./storage/db";
import { saveStack } from "./storage/stackStore";
import { buildStarterStack } from "./stacks/starterStack";
import type { Stack } from "./domain/types";

const ids = {
  stackId: "stack-1",
  stockCardId: "stock-1",
  salesCardId: "sales-1",
  debtsCardId: "debts-1",
  summaryCardId: "summary-1",
};

async function openApp(stack: Stack) {
  const saved = await saveStack(stack);
  expect(saved.ok).toBe(true);
  render(<App />);
  await screen.findByRole("tablist");
}

function tabLabels(): string[] {
  return within(screen.getByRole("tablist"))
    .getAllByRole("tab")
    .map((t) => t.textContent?.replace("▸", "").trim() ?? "");
}

describe("App tabs", () => {
  beforeEach(async () => {
    localStorage.clear();
    await deleteDB(DB_NAME);
  });
  afterEach(async () => {
    await deleteDB(DB_NAME);
  });

  it("shows the default tabs when no card is hidden", async () => {
    await openApp(buildStarterStack(ids));
    expect(tabLabels()).toEqual([
      "Stock",
      "Sales log",
      "Money owed to you",
      "Daily summary",
    ]);
  });

  it("shows card titles in Stack order", async () => {
    const base = buildStarterStack(ids);
    const [stock, sales, debts, summary] = base.cards;
    await openApp({ ...base, cards: [summary, debts, stock, sales] });
    expect(tabLabels()).toEqual([
      "Daily summary",
      "Money owed to you",
      "Stock",
      "Sales log",
    ]);
  });

  it("shows the first visible card after hiding the selected card", async () => {
    await openApp(buildStarterStack(ids));
    expect(
      screen.getByRole("tab", { name: "Stock", selected: true }),
    ).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /Builder/ }));
    fireEvent.click(screen.getByRole("button", { name: "Hide Stock" }));
    fireEvent.click(screen.getByRole("button", { name: /Play/ }));

    expect(tabLabels()).toEqual([
      "Sales log",
      "Money owed to you",
      "Daily summary",
    ]);
    const tab = screen.getByRole("tab", { selected: true });
    expect(tab.textContent).toContain("Sales log");
    expect(tab.id).toBe(`tab-${ids.salesCardId}`);
    const panel = screen.getByRole("tabpanel");
    expect(panel.id).toBe(`panel-${ids.salesCardId}`);
    expect(tab.getAttribute("aria-controls")).toBe(panel.id);
    expect(panel.getAttribute("aria-labelledby")).toBe(tab.id);
    expect(within(panel).getByText("No sales yet.")).toBeTruthy();
  });

  it("shows a renamed card's new tab label", async () => {
    await openApp(buildStarterStack(ids));

    fireEvent.click(screen.getByRole("button", { name: /Builder/ }));
    fireEvent.click(screen.getByRole("button", { name: "Rename Sales log" }));
    const input = screen.getByLabelText("Card title");
    fireEvent.change(input, { target: { value: "Daily book" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    fireEvent.click(screen.getByRole("button", { name: /Play/ }));

    expect(tabLabels()).toEqual([
      "Stock",
      "Daily book",
      "Money owed to you",
      "Daily summary",
    ]);
  });
});
