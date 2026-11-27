// @vitest-environment jsdom
import "../../test/setup";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { Stack } from "../../domain/types";
import { todayRange } from "../../domain-ui/dayRange";
import { SHARE_ERROR_MESSAGES, type ShareEnvironment } from "../../domain-ui/share";
import { ShareProvider } from "../share/ShareProvider";
import { ShareStatus } from "../share/ShareStatus";
import { formatDateLabel } from "../share/dateLabel";
import { DailySummaryCardView } from "./DailySummaryCardView";

const NOON = new Date(2026, 0, 15, 12, 0, 0);
const dayRange = todayRange(NOON);

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

function renderSummary(unitPrice: number, unitCost: number, env: ShareEnvironment) {
  const stack: Stack = {
    schemaVersion: 1,
    id: "stack-1",
    name: "My shop",
    currency: "NGN",
    cards: [
      { id: "stock-1", type: "stock", title: "Stock", items: [] },
      {
        id: "sales-1",
        type: "sales-log",
        title: "Sales",
        sales: [
          {
            id: "s1",
            itemId: "i1",
            quantity: 2,
            unitPrice,
            unitCost,
            time: NOON.toISOString(),
          },
        ],
      },
      {
        id: "debts-1",
        type: "debts",
        title: "Debts",
        debts: [
          {
            id: "d1",
            customer: "Ada",
            amount: 5000,
            date: NOON.toISOString(),
            status: "unpaid",
          },
        ],
      },
      { id: "summary-1", type: "daily-summary", title: "Daily summary" },
    ],
  };
  render(
    <ShareProvider env={env}>
      <DailySummaryCardView stack={stack} dayRange={dayRange} />
      <ShareStatus />
    </ShareProvider>,
  );
}

describe("DailySummaryCardView: Share today's totals", () => {
  it("passes the exact summary text to share", async () => {
    const env = makeEnv(async () => undefined);
    renderSummary(10000, 6000, env);
    fireEvent.click(screen.getByRole("button", { name: "Share today's totals" }));
    await waitFor(() => expect(env.share).toHaveBeenCalledTimes(1));
    expect(env.share).toHaveBeenCalledWith(
      [
        `My shop, ${formatDateLabel(dayRange.start)}`,
        "Sales: ₦200",
        "Profit: ₦80",
        "Owed to me: ₦50",
        "Low on stock: nothing",
      ].join("\n"),
    );
  });

  it("shows the INVALID_AMOUNT message and does not share when the day has a loss", async () => {
    const env = makeEnv(async () => undefined);
    renderSummary(4000, 6000, env);
    fireEvent.click(screen.getByRole("button", { name: "Share today's totals" }));
    await waitFor(() =>
      expect(screen.getByRole("status").textContent).toBe(SHARE_ERROR_MESSAGES.INVALID_AMOUNT),
    );
    expect(env.share).not.toHaveBeenCalled();
  });
});
