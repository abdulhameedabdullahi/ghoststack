// @vitest-environment jsdom
import "../../test/setup";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import type { Debt, DebtsCard, Stack } from "../../domain/types";
import { ERROR_MESSAGES } from "../../domain";
import { DebtsCardView } from "./DebtsCardView";
import { DebtsPanel } from "./DebtsPanel";

function makeDebt(overrides: Partial<Debt> = {}): Debt {
  return {
    id: "d1",
    customer: "Ada",
    amount: 5000,
    date: "2026-01-15T10:00:00.000Z",
    status: "unpaid",
    ...overrides,
  };
}

function makeStack(debts: Debt[]): { stack: Stack; card: DebtsCard } {
  const card: DebtsCard = { id: "debts-1", type: "debts", title: "Debts", debts };
  const stack: Stack = {
    schemaVersion: 1,
    id: "stack-1",
    name: "My shop",
    currency: "NGN",
    cards: [card],
  };
  return { stack, card };
}

/** Keeps the Stack in state so the view re-renders after a change. */
function Wrapper({
  initial,
  spy,
}: {
  initial: Stack;
  spy: (s: Stack) => void;
}) {
  const [stack, setStack] = useState(initial);
  const card = stack.cards[0] as DebtsCard;
  return (
    <DebtsCardView
      stack={stack}
      card={card}
      onStackChange={(s) => {
        spy(s);
        setStack(s);
      }}
    />
  );
}

function renderView(debts: Debt[]) {
  const { stack } = makeStack(debts);
  const spy = vi.fn();
  render(<Wrapper initial={stack} spy={spy} />);
  return { spy };
}

describe("DebtsCardView", () => {
  it("shows the empty state with a message, a Record a debt button and zero total", () => {
    renderView([]);
    expect(screen.getByText("You have no debts recorded yet.")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Record a debt" })).toBeTruthy();
    expect(screen.getByText("₦0.00")).toBeTruthy();
  });

  it("shows a paid debt as Paid with no Mark as paid button", () => {
    renderView([makeDebt({ status: "paid" })]);
    expect(screen.getByText(/Paid/)).toBeTruthy();
    expect(screen.queryByText(/Not paid/)).toBeNull();
    expect(screen.queryByRole("button", { name: "Mark as paid" })).toBeNull();
  });

  it("shows an unpaid debt as Not paid with a Mark as paid button", () => {
    renderView([makeDebt()]);
    expect(screen.getByText(/Not paid/)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Mark as paid" })).toBeTruthy();
  });

  it("marks a debt as paid after confirmation and re-renders the list", () => {
    const { spy } = renderView([makeDebt()]);
    fireEvent.click(screen.getByRole("button", { name: "Mark as paid" }));
    fireEvent.click(screen.getByRole("button", { name: "Yes, mark as paid" }));
    expect(spy).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("button", { name: "Mark as paid" })).toBeNull();
    expect(screen.getByText(/Paid/)).toBeTruthy();
  });

  it("shows the too-big message instead of a Naira total when the sum is unsafe", () => {
    renderView([
      makeDebt({ id: "a", customer: "Ada", amount: Number.MAX_SAFE_INTEGER }),
      makeDebt({ id: "b", customer: "Bola", amount: Number.MAX_SAFE_INTEGER }),
      makeDebt({ id: "c", customer: "Chi", amount: 100 }),
    ]);
    expect(screen.getByText(ERROR_MESSAGES.AMOUNT_TOO_BIG)).toBeTruthy();
    expect(screen.getAllByText("Ada").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Bola").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Chi").length).toBeGreaterThan(0);
    expect(screen.getAllByRole("button", { name: "Mark as paid" })).toHaveLength(3);
  });

  it("still renders a debt whose date cannot be parsed", () => {
    renderView([makeDebt({ date: "not a date" })]);
    expect(screen.getAllByText("Ada").length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "Mark as paid" })).toBeTruthy();
  });
});

describe("DebtsPanel", () => {
  it("shows the missing-card message when there is no Debts card", () => {
    const { stack } = makeStack([]);
    render(<DebtsPanel stack={stack} card={undefined} onStackChange={vi.fn()} />);
    expect(
      screen.getByText("Debts can't be shown because this shop has no Debts card."),
    ).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Record a debt" })).toBeNull();
  });

  it("shows the Debts card view when there is a card", () => {
    const { stack, card } = makeStack([]);
    render(<DebtsPanel stack={stack} card={card} onStackChange={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Record a debt" })).toBeTruthy();
  });
});

describe("DebtsCardView: Record a debt", () => {
  const FRIENDLY = "Please type an amount using numbers only, like 1250 or 1250.50.";

  function openAndType(customer: string, amount: string) {
    fireEvent.click(screen.getByRole("button", { name: "Record a debt" }));
    fireEvent.change(screen.getByLabelText("Who owes you?"), {
      target: { value: customer },
    });
    fireEvent.change(screen.getByLabelText("Amount owed"), {
      target: { value: amount },
    });
  }

  const save = () => fireEvent.click(screen.getByRole("button", { name: "Save" }));

  it("saves a debt, shows it in the lists and total, and closes the form", () => {
    const { spy } = renderView([]);
    openAndType("Ngozi", "1250.50");
    save();
    expect(spy).toHaveBeenCalledTimes(1);
    expect(screen.queryByLabelText("Who owes you?")).toBeNull();
    expect(screen.getByText("Who owes you")).toBeTruthy();
    expect(screen.getAllByText("Ngozi").length).toBeGreaterThan(0);
    expect(screen.getAllByText("₦1,250.50").length).toBeGreaterThan(0);
    expect(screen.getByText(/Not paid/)).toBeTruthy();
  });

  it("shows the customer message next to the customer Field and keeps the form open", () => {
    const { spy } = renderView([]);
    openAndType("", "100");
    save();
    expect(spy).not.toHaveBeenCalled();
    const input = screen.getByLabelText("Who owes you?");
    const error = document.getElementById("debt-form-customer-error");
    expect(error?.textContent).toBe(ERROR_MESSAGES.BAD_CUSTOMER);
    expect(input.getAttribute("aria-describedby")).toContain("debt-form-customer-error");
    expect((screen.getByLabelText("Amount owed") as HTMLInputElement).value).toBe("100");
  });

  it("shows friendly wording for unreadable amount text without calling onStackChange", () => {
    const { spy } = renderView([]);
    openAndType("Ada", "abc");
    save();
    expect(spy).not.toHaveBeenCalled();
    const error = document.getElementById("debt-form-amount-error");
    expect(error?.textContent).toBe(FRIENDLY);
    expect(error?.textContent?.toLowerCase()).not.toContain("kobo");
    expect((screen.getByLabelText("Who owes you?") as HTMLInputElement).value).toBe("Ada");
    expect((screen.getByLabelText("Amount owed") as HTMLInputElement).value).toBe("abc");
  });

  it("shows friendly wording next to the amount Field when recordDebt rejects the amount", () => {
    const { spy } = renderView([]);
    openAndType("Ada", "0");
    save();
    expect(spy).not.toHaveBeenCalled();
    const error = document.getElementById("debt-form-amount-error");
    expect(error?.textContent).toBe(FRIENDLY);
    expect(error?.textContent?.toLowerCase()).not.toContain("kobo");
  });

  it("shows a form-level alert at the top when the Debts card is not in the Stack", () => {
    const { stack, card } = makeStack([]);
    const spy = vi.fn();
    render(
      <DebtsCardView
        stack={stack}
        card={{ ...card, id: "missing-card" }}
        onStackChange={spy}
      />,
    );
    openAndType("Ada", "100");
    save();
    expect(spy).not.toHaveBeenCalled();
    const alerts = screen.getAllByRole("alert");
    expect(
      alerts.some((a) => a.textContent === ERROR_MESSAGES.CARD_NOT_FOUND),
    ).toBe(true);
    expect(document.getElementById("debt-form-customer-error")).toBeNull();
    expect(document.getElementById("debt-form-amount-error")).toBeNull();
    expect(screen.getByLabelText("Who owes you?")).toBeTruthy();
  });

  it("closes the form on Cancel without calling onStackChange", () => {
    const { spy } = renderView([]);
    openAndType("Ada", "100");
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(spy).not.toHaveBeenCalled();
    expect(screen.queryByLabelText("Who owes you?")).toBeNull();
  });
});

describe("DebtsCardView: Mark as paid", () => {
  const twoDebts = () => [
    makeDebt({ id: "d1", customer: "Ada", amount: 5000 }),
    makeDebt({ id: "d2", customer: "Bola", amount: 2500 }),
  ];

  const payFor = (id: string) =>
    document.querySelector(`[data-debt-pay-button="${id}"]`) as HTMLElement;

  it("shows the confirmation with the customer name and amount", () => {
    renderView(twoDebts());
    fireEvent.click(payFor("d1"));
    expect(screen.getByRole("alertdialog").textContent).toContain(
      "Mark Ada's debt of ₦50.00 as paid?",
    );
    expect(screen.getByRole("button", { name: "Yes, mark as paid" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Not yet" })).toBeTruthy();
  });

  it("shows only one confirmation when a second Mark as paid is tapped", () => {
    renderView(twoDebts());
    fireEvent.click(payFor("d1"));
    fireEvent.click(payFor("d2"));
    expect(screen.getAllByRole("alertdialog")).toHaveLength(1);
    expect(screen.getAllByRole("button", { name: "Yes, mark as paid" })).toHaveLength(1);
    expect(screen.getByRole("alertdialog").textContent).toContain("Bola");
  });

  it("settles the debt on Yes and lowers the total owed by exactly that amount", () => {
    const { spy } = renderView(twoDebts());
    expect(screen.getByText("₦75.00", { selector: "strong" })).toBeTruthy();
    fireEvent.click(payFor("d2"));
    fireEvent.click(screen.getByRole("button", { name: "Yes, mark as paid" }));
    expect(spy).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect(screen.getByText(/Paid/)).toBeTruthy();
    expect(screen.getAllByRole("button", { name: "Mark as paid" })).toHaveLength(1);
    expect(payFor("d2")).toBeNull();
    expect(screen.getByText("₦50.00", { selector: "strong" })).toBeTruthy();
  });

  it("leaves the debt unpaid on Not yet and does not call onStackChange", () => {
    const { spy } = renderView(twoDebts());
    fireEvent.click(screen.getAllByRole("button", { name: "Mark as paid" })[0]);
    fireEvent.click(screen.getByRole("button", { name: "Not yet" }));
    expect(spy).not.toHaveBeenCalled();
    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect(screen.getAllByRole("button", { name: "Mark as paid" })).toHaveLength(2);
    expect(screen.queryByText(/✓/)).toBeNull();
    expect(screen.getByText("₦75.00", { selector: "strong" })).toBeTruthy();
  });

  it("shows the message and calls nothing when the debt is already paid in the Stack", () => {
    const { stack, card } = makeStack([makeDebt({ status: "paid" })]);
    const staleCard: DebtsCard = { ...card, debts: [makeDebt()] };
    const spy = vi.fn();
    render(<DebtsCardView stack={stack} card={staleCard} onStackChange={spy} />);
    fireEvent.click(screen.getByRole("button", { name: "Mark as paid" }));
    fireEvent.click(screen.getByRole("button", { name: "Yes, mark as paid" }));
    expect(spy).not.toHaveBeenCalled();
    expect(screen.queryByRole("alertdialog")).toBeNull();
    const alert = screen.getByRole("alert");
    expect(alert.textContent).toBe(ERROR_MESSAGES.DEBT_ALREADY_PAID);
    expect(screen.getByText(/Not paid/)).toBeTruthy();
  });

  it("shows the message and calls nothing when the debt is missing from the Stack", () => {
    const { stack, card } = makeStack([]);
    const staleCard: DebtsCard = { ...card, debts: [makeDebt()] };
    const spy = vi.fn();
    render(<DebtsCardView stack={stack} card={staleCard} onStackChange={spy} />);
    fireEvent.click(screen.getByRole("button", { name: "Mark as paid" }));
    fireEvent.click(screen.getByRole("button", { name: "Yes, mark as paid" }));
    expect(spy).not.toHaveBeenCalled();
    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect(screen.getByRole("alert").textContent).toBe(ERROR_MESSAGES.DEBT_NOT_FOUND);
    expect(stack.cards[0]).toBe(card);
  });
});

describe("DebtsCardView: notices", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  const advance = (ms: number) =>
    act(() => {
      vi.advanceTimersByTime(ms);
    });

  const recordDebtNow = () => {
    fireEvent.click(screen.getByRole("button", { name: "Record a debt" }));
    fireEvent.change(screen.getByLabelText("Who owes you?"), {
      target: { value: "Ngozi" },
    });
    fireEvent.change(screen.getByLabelText("Amount owed"), {
      target: { value: "100" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
  };

  const payFirstDebt = () => {
    fireEvent.click(screen.getAllByRole("button", { name: "Mark as paid" })[0]);
    fireEvent.click(screen.getByRole("button", { name: "Yes, mark as paid" }));
  };

  it("shows 'Debt recorded' after a save and clears it after 3 seconds", () => {
    vi.useFakeTimers();
    renderView([]);
    recordDebtNow();
    expect(screen.getByText("Debt recorded")).toBeTruthy();
    advance(2999);
    expect(screen.queryByText("Debt recorded")).not.toBeNull();
    advance(1);
    expect(screen.queryByText("Debt recorded")).toBeNull();
  });

  it("shows 'Debt marked as paid' and clears it after 3 seconds", () => {
    vi.useFakeTimers();
    renderView([makeDebt()]);
    payFirstDebt();
    expect(screen.getByText("Debt marked as paid")).toBeTruthy();
    advance(2999);
    expect(screen.queryByText("Debt marked as paid")).not.toBeNull();
    advance(1);
    expect(screen.queryByText("Debt marked as paid")).toBeNull();
  });

  it("restarts the timer on a second action so the first timer does not clear the new message early", () => {
    vi.useFakeTimers();
    renderView([makeDebt()]);
    recordDebtNow();
    expect(screen.getByText("Debt recorded")).toBeTruthy();
    advance(2000);
    payFirstDebt();
    expect(screen.getByText("Debt marked as paid")).toBeTruthy();
    advance(2000); // 4s since the first action
    expect(screen.queryByText("Debt marked as paid")).not.toBeNull();
    advance(1000);
    expect(screen.queryByText("Debt marked as paid")).toBeNull();
  });

  it("causes no warning or error when unmounted with a pending notice", () => {
    vi.useFakeTimers();
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => { });
    const { stack } = makeStack([]);
    const { unmount } = render(<Wrapper initial={stack} spy={vi.fn()} />);
    recordDebtNow();
    expect(screen.getByText("Debt recorded")).toBeTruthy();
    unmount();
    expect(() => advance(5000)).not.toThrow();
    expect(errorSpy).not.toHaveBeenCalled();
  });
});

describe("DebtsCardView: focus", () => {
  const recordBtn = () => screen.getByRole("button", { name: "Record a debt" });
  const payFor = (id: string) =>
    document.querySelector(`[data-debt-pay-button="${id}"]`) as HTMLElement;

  it("moves focus to the customer Field when the form opens", () => {
    renderView([]);
    fireEvent.click(recordBtn());
    expect(document.activeElement).toBe(screen.getByLabelText("Who owes you?"));
  });

  it("returns focus to Record a debt after Cancel", () => {
    renderView([]);
    fireEvent.click(recordBtn());
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(document.activeElement).toBe(recordBtn());
  });

  it("returns focus to Record a debt after a successful save", () => {
    renderView([]);
    fireEvent.click(recordBtn());
    fireEvent.change(screen.getByLabelText("Who owes you?"), {
      target: { value: "Ngozi" },
    });
    fireEvent.change(screen.getByLabelText("Amount owed"), {
      target: { value: "100" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(document.activeElement).toBe(recordBtn());
  });

  it("focuses Not yet when a confirmation opens", () => {
    renderView([makeDebt()]);
    fireEvent.click(payFor("d1"));
    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: "Not yet" }),
    );
  });

  it("returns focus to that debt's Mark as paid button after Not yet", () => {
    renderView([
      makeDebt({ id: "d1", customer: "Ada" }),
      makeDebt({ id: "d2", customer: "Bola" }),
    ]);
    fireEvent.click(payFor("d2"));
    fireEvent.click(screen.getByRole("button", { name: "Not yet" }));
    expect(document.activeElement).toBe(payFor("d2"));
  });

  it("falls back to Record a debt after Yes, because the Mark as paid button is gone", () => {
    renderView([makeDebt()]);
    fireEvent.click(payFor("d1"));
    fireEvent.click(screen.getByRole("button", { name: "Yes, mark as paid" }));
    expect(payFor("d1")).toBeNull();
    expect(document.activeElement).toBe(recordBtn());
  });
});
