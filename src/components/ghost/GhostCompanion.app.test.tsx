// @vitest-environment jsdom
import "fake-indexeddb/auto";
import "../../test/setup";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { deleteDB } from "idb";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactElement } from "react";
import App from "../../App";
import { DB_NAME } from "../../storage/db";
import { saveStack } from "../../storage/stackStore";
import { buildStarterStack } from "../../stacks/starterStack";
import type { Stack } from "../../domain/types";
import { GhostProvider } from "./GhostProvider";
import { TIPS } from "./ghostTips";

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
    cards: base.cards.map((card) =>
      card.type === "stock"
        ? {
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
          }
        : card,
    ),
  };
}

const withGhost = (): ReactElement => (
  <GhostProvider idleMs={1500} bubbleMs={20000} moodMs={{ wave: 100, cheer: 400 }}>
    <App />
  </GhostProvider>
);

function mood(): string | null {
  return document.querySelector("[data-mood]")?.getAttribute("data-mood") ?? null;
}

async function recordSale(quantity: string) {
  fireEvent.click(await screen.findByRole("button", { name: "Record a sale" }));
  fireEvent.change(screen.getByLabelText("Quantity sold"), {
    target: { value: quantity },
  });
  fireEvent.click(screen.getByRole("button", { name: "Save" }));
}

beforeEach(async () => {
  await deleteDB(DB_NAME);
  localStorage.clear();
  const saved = await saveStack(seedStack());
  expect(saved.ok).toBe(true);
});

afterEach(async () => {
  cleanup();
  await deleteDB(DB_NAME);
});

describe("App with a real GhostProvider", () => {
  it("cheers after a sale and shows a tip that names a button, outside any live region", async () => {
    render(withGhost());
    await screen.findByRole("tab", { name: /Stock/ });
    await recordSale("2");
    await screen.findByText("Sale recorded");

    await waitFor(() => expect(mood()).toBe("cheer"));

    const tip = await screen.findByText((text, el) =>
      el?.classList.contains("ghost-bubble__text") === true &&
      TIPS.saleRecorded.includes(text),
    );
    expect(tip.textContent).toMatch(/Record a (sale|debt)/);

    const bubble = tip.closest(".ghost-bubble");
    expect(bubble).not.toBeNull();
    expect(bubble!.closest("[aria-live], [role='alert'], [role='status'], [role='log']")).toBeNull();
    expect(bubble!.querySelector("[aria-live], [role='alert'], [role='status']")).toBeNull();

    // The existing sale notice keeps its own text.
    expect(screen.getByText("Sale recorded")).toBeTruthy();
  });

  it("leaves every role=alert element the same as without the ghost", async () => {
    const big = "99999999999999999999999";

    render(<App />);
    await screen.findByRole("tab", { name: /Stock/ });
    await recordSale(big);
    const plain = (await screen.findAllByRole("alert")).map((a) => a.textContent);
    cleanup();

    render(withGhost());
    await screen.findByRole("tab", { name: /Stock/ });
    await recordSale(big);
    const alerts = (await screen.findAllByRole("alert")).map((a) => a.textContent);

    expect(alerts).toEqual(plain);
    expect(alerts.length).toBeGreaterThan(0);
    await waitFor(() => expect(mood()).toBe("sorry"));
  });

  it("falls asleep after the idle time and wakes on a click", async () => {
    render(withGhost());
    await screen.findByRole("tab", { name: /Stock/ });

    await waitFor(() => expect(mood()).toBe("sleep"), { timeout: 4000 });
    expect(document.querySelector(".ghost-bubble")).toBeNull();

    fireEvent.pointerDown(document.body);
    await waitFor(() => expect(mood()).not.toBe("sleep"));
  });
});
