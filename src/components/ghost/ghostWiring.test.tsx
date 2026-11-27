// @vitest-environment jsdom
import "../../test/setup";
import "fake-indexeddb/auto";
import { useState } from "react";
import type { ReactNode } from "react";
import { deleteDB } from "idb";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import App from "../../App";
import { DB_NAME } from "../../storage/db";
import { saveStack } from "../../storage/stackStore";
import { buildStarterStack } from "../../stacks/starterStack";
import type {
  Debt,
  DebtsCard,
  SalesLogCard,
  Stack,
  StockCard,
} from "../../domain/types";
import { StockCardView } from "../cards/StockCardView";
import { DebtsCardView } from "../cards/DebtsCardView";
import { GhostContext, GhostProvider, useGhost } from "./GhostProvider";
import type { GhostApi } from "./GhostProvider";
import { initialState } from "./ghostMachine";
import type { GhostEvent } from "./ghostTypes";

// Validates: Requirements 12.1, 12.2, 12.3, 12.4, 12.5, 12.8

/** Records every event the screens send to react(). */
function SpyProvider({
  events,
  children,
}: {
  events: GhostEvent[];
  children: ReactNode;
}) {
  const api: GhostApi = {
    state: initialState(false),
    stamp: 0,
    bubble: null,
    react: (e) => {
      events.push(
        typeof e !== "string"
          ? e
          : e === "midnightToggled"
            ? { type: e, on: false }
            : { type: e },
      );
    },
    dismissBubble: () => { },
    active: true,
  };
  return <GhostContext.Provider value={api}>{children}</GhostContext.Provider>;
}

const types = (events: GhostEvent[]) => events.map((e) => e.type);

function makeStack(items: StockCard["items"], debts: Debt[] = []): Stack {
  const stock: StockCard = { id: "stock-1", type: "stock", title: "Stock", items };
  const sales: SalesLogCard = { id: "sales-1", type: "sales-log", title: "Sales", sales: [] };
  const debtsCard: DebtsCard = { id: "debts-1", type: "debts", title: "Debts", debts };
  return {
    schemaVersion: 1,
    id: "stack-1",
    name: "My shop",
    currency: "NGN",
    cards: [stock, sales, debtsCard],
  };
}

const RICE = {
  id: "i1",
  name: "Rice",
  quantity: 10,
  costPrice: 1000,
  sellPrice: 1500,
  lowStockLevel: 2,
};

function StockWrapper({ initial }: { initial: Stack }) {
  const [stack, setStack] = useState(initial);
  return (
    <StockCardView
      stack={stack}
      card={stack.cards[0] as StockCard}
      onStackChange={setStack}
      salesCardId="sales-1"
    />
  );
}

function DebtsWrapper({ initial }: { initial: Stack }) {
  const [stack, setStack] = useState(initial);
  return (
    <DebtsCardView
      stack={stack}
      card={stack.cards[2] as DebtsCard}
      onStackChange={setStack}
    />
  );
}

function openSale(quantity: string) {
  fireEvent.click(screen.getByRole("button", { name: "Record a sale" }));
  fireEvent.change(screen.getByLabelText("Quantity sold"), {
    target: { value: quantity },
  });
  fireEvent.click(screen.getByRole("button", { name: "Save" }));
}

afterEach(cleanup);

describe("ghost wiring: Stock", () => {
  it("sends one saleRecorded for a recorded sale", () => {
    const events: GhostEvent[] = [];
    render(
      <SpyProvider events={events}>
        <StockWrapper initial={makeStack([RICE])} />
      </SpyProvider>,
    );
    openSale("2");
    expect(types(events)).toEqual(["saleRecorded"]);
  });

  it("sends one errorShown for a too-big number and keeps the alert text", () => {
    const events: GhostEvent[] = [];
    const big = "99999999999999999999999";

    // Same screen without a ghost: the text the owner would see anyway.
    render(<StockWrapper initial={makeStack([RICE])} />);
    openSale(big);
    const plain = screen.getByRole("alert").textContent;
    cleanup();

    render(
      <SpyProvider events={events}>
        <StockWrapper initial={makeStack([RICE])} />
      </SpyProvider>,
    );
    openSale(big);
    expect(types(events)).toEqual(["errorShown"]);
    const alerts = screen.getAllByRole("alert");
    expect(alerts).toHaveLength(1);
    expect(alerts[0].textContent).toBe(plain);
    expect(plain && plain.length).toBeGreaterThan(0);
  });

  it("does not send saleRecorded when the sale fails (not enough stock)", () => {
    const events: GhostEvent[] = [];
    render(
      <SpyProvider events={events}>
        <StockWrapper initial={makeStack([RICE])} />
      </SpyProvider>,
    );
    openSale("11");
    expect(types(events)).toEqual(["errorShown"]);
    expect(types(events)).not.toContain("saleRecorded");
  });

  it("sends one emptyScreen for an empty Stock card", () => {
    const events: GhostEvent[] = [];
    render(
      <SpyProvider events={events}>
        <StockWrapper initial={makeStack([])} />
      </SpyProvider>,
    );
    expect(types(events)).toEqual(["emptyScreen"]);
  });
});

describe("ghost wiring: Debts", () => {
  it("sends one debtAdded for a recorded debt", () => {
    const events: GhostEvent[] = [];
    render(
      <SpyProvider events={events}>
        <DebtsWrapper initial={makeStack([RICE])} />
      </SpyProvider>,
    );
    events.length = 0; // ignore emptyScreen from the empty Debts card
    fireEvent.click(screen.getByRole("button", { name: "Record a debt" }));
    fireEvent.change(screen.getByLabelText("Who owes you?"), {
      target: { value: "Ngozi" },
    });
    fireEvent.change(screen.getByLabelText("Amount owed"), {
      target: { value: "1250" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(types(events)).toEqual(["debtAdded"]);
  });

  it("does not send debtAdded when the debt fails", () => {
    const events: GhostEvent[] = [];
    render(
      <SpyProvider events={events}>
        <DebtsWrapper initial={makeStack([RICE])} />
      </SpyProvider>,
    );
    events.length = 0;
    fireEvent.click(screen.getByRole("button", { name: "Record a debt" }));
    fireEvent.change(screen.getByLabelText("Who owes you?"), {
      target: { value: "Ngozi" },
    });
    fireEvent.change(screen.getByLabelText("Amount owed"), {
      target: { value: "abc" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(types(events)).toEqual(["errorShown"]);
  });

  it("sends one debtPaid when a debt is marked as paid", () => {
    const events: GhostEvent[] = [];
    const debt: Debt = {
      id: "d1",
      customer: "Ada",
      amount: 5000,
      date: "2026-01-15T10:00:00.000Z",
      status: "unpaid",
    };
    render(
      <SpyProvider events={events}>
        <DebtsWrapper initial={makeStack([RICE], [debt])} />
      </SpyProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Mark as paid" }));
    fireEvent.click(screen.getByRole("button", { name: "Yes, mark as paid" }));
    expect(types(events)).toEqual(["debtPaid"]);
  });
});

describe("ghost wiring: App", () => {
  const ids = {
    stackId: "stack-1",
    stockCardId: "stock-1",
    salesCardId: "sales-1",
    debtsCardId: "debts-1",
    summaryCardId: "summary-1",
  };

  beforeEach(async () => {
    localStorage.clear();
    delete document.documentElement.dataset.theme;
    await deleteDB(DB_NAME);
  });
  afterEach(async () => {
    delete document.documentElement.dataset.theme;
    await deleteDB(DB_NAME);
  });

  async function seed() {
    const saved = await saveStack(buildStarterStack(ids));
    expect(saved.ok).toBe(true);
  }

  it("sends one midnightToggled with the right on value each toggle", async () => {
    await seed();
    const events: GhostEvent[] = [];
    render(
      <SpyProvider events={events}>
        <App />
      </SpyProvider>,
    );
    await screen.findByRole("tablist");
    const toggle = screen.getByRole("button", { name: "Toggle midnight mode" });
    const toggles = () => events.filter((e) => e.type === "midnightToggled");

    fireEvent.click(toggle);
    expect(toggles()).toEqual([{ type: "midnightToggled", on: true }]);
    fireEvent.click(toggle);
    expect(toggles()).toEqual([
      { type: "midnightToggled", on: true },
      { type: "midnightToggled", on: false },
    ]);
  });

  it("starts with the nightcap on when data-theme is midnight", async () => {
    await seed();
    document.documentElement.dataset.theme = "midnight";
    function Probe() {
      const { state } = useGhost();
      return <span data-testid="cap">{String(state.nightcap)}</span>;
    }
    render(
      <GhostProvider
        initialMidnight={document.documentElement.dataset.theme === "midnight"}
      >
        <Probe />
        <App />
      </GhostProvider>,
    );
    await screen.findByRole("tablist");
    expect(screen.getByTestId("cap").textContent).toBe("true");
  });
});
