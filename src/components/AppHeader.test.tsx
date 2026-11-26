// @vitest-environment jsdom
import "../test/setup";
import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { buildStarterStack } from "../stacks/starterStack";
import { DB_NAME } from "../storage/db";

// Wrap the real store functions so single tests can override them.
vi.mock("../storage/stackStore", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../storage/stackStore")>();
  return {
    ...actual,
    listStacks: vi.fn(actual.listStacks),
    loadStack: vi.fn(actual.loadStack),
  };
});

import * as store from "../storage/stackStore";
import App from "../App";
import { AppHeader } from "./AppHeader";

const { saveStack: realSave, listStacks: realList, loadStack: realLoad } =
  await vi.importActual<typeof import("../storage/stackStore")>(
    "../storage/stackStore",
  );

function deleteDb(): Promise<void> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.deleteDatabase(DB_NAME);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
    req.onblocked = () => resolve();
  });
}

beforeEach(async () => {
  cleanup();
  await deleteDb();
  localStorage.clear();
  vi.mocked(store.listStacks).mockImplementation(realList);
  vi.mocked(store.loadStack).mockImplementation(realLoad);
});

afterEach(() => {
  vi.clearAllMocks();
});

function expectOneHeader() {
  // Cards also use <header> for their title bars, so pick the app one.
  const headers = document.querySelectorAll("header.app-header");
  expect(headers.length).toBe(1);
  const h1s = screen.getAllByRole("heading", { level: 1 });
  expect(h1s.length).toBe(1);
  expect(h1s[0].textContent).toBe("GhostStack");
  expect(headers[0].contains(h1s[0])).toBe(true);
}

describe("AppHeader", () => {
  it("has one header with one h1 titled GhostStack", () => {
    const { container } = render(<AppHeader />);
    expect(container.querySelectorAll("header").length).toBe(1);
    const h1s = container.querySelectorAll("h1");
    expect(h1s.length).toBe(1);
    expect(h1s[0].textContent).toBe("GhostStack");
  });

  it("has a decorative ghost hidden from assistive tech", () => {
    const { container } = render(<AppHeader />);
    const svg = container.querySelector("header svg");
    expect(svg).not.toBeNull();
    expect(svg?.getAttribute("aria-hidden")).toBe("true");
    expect(svg?.getAttribute("role")).toBeNull();
  });

  it("has no buttons or links inside", () => {
    const { container } = render(<AppHeader />);
    const header = container.querySelector("header")!;
    expect(header.querySelectorAll("button, a, [role='button'], [role='link']").length).toBe(0);
  });
});

describe("App header on every load state", () => {
  it("shows the header while loading", () => {
    vi.mocked(store.listStacks).mockImplementation(() => new Promise(() => { }));
    render(<App />);
    expect(screen.getByText("Opening your shop…")).toBeTruthy();
    expectOneHeader();
  });

  it("shows the header while choosing a starter", async () => {
    render(<App />);
    await screen.findByRole("heading", { name: "Choose a starter" });
    expectOneHeader();
  });

  it("shows the header after a load error", async () => {
    await realSave(
      buildStarterStack({
        stackId: "s1",
        stockCardId: "s1-stock",
        salesCardId: "s1-sales",
        debtsCardId: "s1-debts",
        summaryCardId: "s1-summary",
      }),
    );
    vi.mocked(store.loadStack).mockResolvedValue({
      ok: false,
      error: { code: "UNREADABLE_DATA", message: "Could not read your shop." },
    } as never);
    render(<App />);
    expect((await screen.findByRole("alert")).textContent).toBe(
      "Could not read your shop.",
    );
    expectOneHeader();
  });

  it("shows the header when the shop is ready", async () => {
    await realSave(
      buildStarterStack({
        stackId: "s1",
        stockCardId: "s1-stock",
        salesCardId: "s1-sales",
        debtsCardId: "s1-debts",
        summaryCardId: "s1-summary",
      }),
    );
    render(<App />);
    await screen.findAllByRole("tab");
    expectOneHeader();
  });
});
