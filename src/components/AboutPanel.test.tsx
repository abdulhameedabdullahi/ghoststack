// @vitest-environment jsdom
import "../test/setup";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach } from "vitest";
import { AboutPanel } from "./AboutPanel";

beforeAll(() => {
  // jsdom may not implement showModal; polyfill so the component mounts cleanly.
  if (!HTMLDialogElement.prototype.showModal) {
    HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) {
      this.setAttribute("open", "");
    };
  }
  if (!HTMLDialogElement.prototype.close) {
    HTMLDialogElement.prototype.close = function (this: HTMLDialogElement) {
      this.removeAttribute("open");
      this.dispatchEvent(new Event("close"));
    };
  }
});

afterEach(cleanup);

describe("AboutPanel", () => {
  it("shows the brand name, tagline and subline", () => {
    render(<AboutPanel onClose={() => {}} />);
    expect(screen.getByRole("heading", { level: 2 }).textContent).toBe("GhostStack");
    expect(screen.getByText("Raise your shop.")).toBeTruthy();
    expect(screen.getByText("Stock, sales and debts. Offline. In Naira.")).toBeTruthy();
  });

  it("renders the ghost mark with an accessible title", () => {
    render(<AboutPanel onClose={() => {}} />);
    const img = screen.getByRole("img");
    expect(img.textContent).toContain("GhostStack mark");
  });

  it("calls onClose when the close button is clicked", () => {
    const onClose = vi.fn();
    render(<AboutPanel onClose={onClose} />);
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("dialog has an accessible label", () => {
    render(<AboutPanel onClose={() => {}} />);
    const dialog = document.querySelector("dialog")!;
    expect(dialog.getAttribute("aria-label")).toBe("About GhostStack");
  });
});
