// @vitest-environment jsdom
import "../../test/setup";
import { useState } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { SalesLogCard, Stack, StockCard } from "../../domain/types";
import { installMatchMedia, removeMatchMedia } from "../../test/mockMatchMedia";
import { StockCardView } from "./StockCardView";

// Validates: Requirements 13.6, 13.11

function makeStack(): Stack {
  const stock: StockCard = {
    id: "stock-1",
    type: "stock",
    title: "Stock",
    items: [
      {
        id: "i1",
        name: "Rice",
        quantity: 10,
        costPrice: 1000,
        sellPrice: 1500,
        lowStockLevel: 2,
      },
    ],
  };
  const sales: SalesLogCard = {
    id: "sales-1",
    type: "sales-log",
    title: "Sales",
    sales: [],
  };
  return {
    schemaVersion: 1,
    id: "stack-1",
    name: "My shop",
    currency: "NGN",
    cards: [stock, sales],
  };
}

/** Keeps the Stack in state so the view re-renders after each sale. */
function Wrapper() {
  const [stack, setStack] = useState(makeStack);
  const card = stack.cards[0] as StockCard;
  return (
    <StockCardView
      stack={stack}
      card={card}
      onStackChange={setStack}
      salesCardId="sales-1"
    />
  );
}

function sell() {
  fireEvent.click(screen.getByRole("button", { name: "Record a sale" }));
  fireEvent.click(screen.getByRole("button", { name: "Save" }));
}

function getNotice(): HTMLElement {
  return screen.getByText("Sale recorded");
}

let restore: (() => void) | undefined;

afterEach(() => {
  cleanup();
  restore?.();
  restore = undefined;
});

describe("StockCardView sale notice animation", () => {
  it("uses sale-notice--pop when motion is allowed", () => {
    restore = installMatchMedia(false).restore;
    render(<Wrapper />);
    sell();
    const notice = getNotice();
    expect(notice.classList.contains("sale-notice")).toBe(true);
    expect(notice.classList.contains("sale-notice--pop")).toBe(true);
    expect(notice.classList.contains("sale-notice--pop-b")).toBe(false);
  });

  it("has no pop class when reduced motion is on", () => {
    restore = installMatchMedia(true).restore;
    render(<Wrapper />);
    sell();
    const notice = getNotice();
    expect(notice.classList.contains("sale-notice--pop")).toBe(false);
    expect(notice.classList.contains("sale-notice--pop-b")).toBe(false);
  });

  it("has no pop class when matchMedia is missing", () => {
    restore = removeMatchMedia();
    render(<Wrapper />);
    sell();
    const notice = getNotice();
    expect(notice.classList.contains("sale-notice--pop")).toBe(false);
    expect(notice.classList.contains("sale-notice--pop-b")).toBe(false);
  });

  it("keeps the same node and swaps the pop class on a second sale", () => {
    restore = installMatchMedia(false).restore;
    render(<Wrapper />);
    sell();
    const first = getNotice();
    expect(first.classList.contains("sale-notice--pop")).toBe(true);
    expect(first.classList.contains("sale-notice--pop-b")).toBe(false);

    sell();
    const second = getNotice();
    expect(second === first).toBe(true);
    expect(second.textContent).toBe("Sale recorded");
    expect(second.classList.contains("sale-notice--pop-b")).toBe(true);
    expect(second.classList.contains("sale-notice--pop")).toBe(false);
  });
});
