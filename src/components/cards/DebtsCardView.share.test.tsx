// @vitest-environment jsdom
import "../../test/setup";
import { describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { Debt, DebtsCard, Stack } from "../../domain/types";
import type { ShareEnvironment } from "../../domain-ui/share";
import { ShareProvider } from "../share/ShareProvider";
import { DebtsCardView } from "./DebtsCardView";

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

function renderWithShare(debts: Debt[], env: ShareEnvironment) {
  const card: DebtsCard = { id: "debts-1", type: "debts", title: "Debts", debts };
  const stack: Stack = {
    schemaVersion: 1,
    id: "stack-1",
    name: "My shop",
    currency: "NGN",
    cards: [card],
  };
  render(
    <ShareProvider env={env}>
      <DebtsCardView stack={stack} card={card} onStackChange={vi.fn()} />
    </ShareProvider>,
  );
}

function makeEnv(share: ShareEnvironment["share"]) {
  const env = {
    canShare: vi.fn(() => true),
    share: vi.fn(share),
    isOnline: vi.fn(() => true),
    openUrl: vi.fn(() => true),
    writeClipboard: vi.fn(async () => undefined),
  };
  return env satisfies ShareEnvironment;
}

describe("DebtsCardView: Send a reminder", () => {
  it("shows a labelled button for an open debt", () => {
    renderWithShare([makeDebt()], makeEnv(async () => undefined));
    const button = screen.getByRole("button", { name: "Send a reminder to Ada" });
    expect(button.textContent).toBe("Send a reminder");
    expect(button.getAttribute("aria-label")).toBe("Send a reminder to Ada");
  });

  it("shows no button for a paid debt", () => {
    renderWithShare([makeDebt({ status: "paid" })], makeEnv(async () => undefined));
    expect(screen.queryByRole("button", { name: /Send a reminder/ })).toBeNull();
  });

  it("passes the exact reminder text to share", async () => {
    const env = makeEnv(async () => undefined);
    renderWithShare([makeDebt()], env);
    fireEvent.click(screen.getByRole("button", { name: "Send a reminder to Ada" }));
    await waitFor(() => expect(env.share).toHaveBeenCalledTimes(1));
    expect(env.share).toHaveBeenCalledWith(
      "Hello Ada, a gentle reminder from My shop: you still owe ₦50. Thank you!",
    );
  });

  it("makes one share call for a double press and is aria-disabled only while pending", async () => {
    let finish!: () => void;
    const env = makeEnv(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        }),
    );
    renderWithShare([makeDebt()], env);
    const button = screen.getByRole("button", { name: "Send a reminder to Ada" });

    fireEvent.click(button);
    fireEvent.click(button);
    await waitFor(() => expect(button.getAttribute("aria-disabled")).toBe("true"));
    expect(env.share).toHaveBeenCalledTimes(1);

    await act(async () => {
      finish();
    });
    await waitFor(() => expect(button.getAttribute("aria-disabled")).not.toBe("true"));
    expect(env.share).toHaveBeenCalledTimes(1);
  });
});
