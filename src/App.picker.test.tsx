// @vitest-environment jsdom
import "./test/setup";
import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { Stack } from "./domain/types";
import { buildStarterStack } from "./stacks/starterStack";
import { DB_NAME } from "./storage/db";

// Wrap the real store functions so single tests can override them.
vi.mock("./storage/stackStore", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./storage/stackStore")>();
  return {
    ...actual,
    saveStack: vi.fn(actual.saveStack),
    loadStack: vi.fn(actual.loadStack),
  };
});

import * as store from "./storage/stackStore";
import App from "./App";

const LAST_OPENED_KEY = "ghoststack:lastOpenedStackId";

function makeStack(id: string, name: string, itemName: string): Stack {
  const base = buildStarterStack({
    stackId: id,
    stockCardId: `${id}-stock`,
    salesCardId: `${id}-sales`,
    debtsCardId: `${id}-debts`,
    summaryCardId: `${id}-summary`,
  });
  return {
    ...base,
    name,
    cards: base.cards.map((c) =>
      c.type === "stock"
        ? {
          ...c,
          items: [
            {
              id: `${id}-item`,
              name: itemName,
              quantity: 5,
              costPrice: 100,
              sellPrice: 200,
              lowStockLevel: 1,
            },
          ],
        }
        : c,
    ),
  };
}

function deleteDb(): Promise<void> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.deleteDatabase(DB_NAME);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
    req.onblocked = () => resolve();
  });
}

const { saveStack: realSave, loadStack: realLoad } =
  await vi.importActual<typeof import("./storage/stackStore")>(
    "./storage/stackStore",
  );

async function seedTwoStacks() {
  await realSave(makeStack("a-stack", "Shop A", "Rice"));
  await realSave(makeStack("b-stack", "Shop B", "Beans"));
}

function picker(): HTMLSelectElement {
  return screen.getByLabelText("Stack") as HTMLSelectElement;
}

async function editOpenItem(newName: string) {
  fireEvent.click(await screen.findByRole("button", { name: "Edit" }));
  fireEvent.change(await screen.findByLabelText("Item name"), {
    target: { value: newName },
  });
  fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
}

beforeEach(async () => {
  await deleteDb();
  localStorage.clear();
  vi.mocked(store.saveStack).mockImplementation(realSave);
  vi.mocked(store.loadStack).mockImplementation(realLoad);
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("App stack picker", () => {
  it("keeps an edit after switching away and back", async () => {
    await seedTwoStacks();
    render(<App />);
    await screen.findByText("Rice");

    await editOpenItem("Brown rice");
    await screen.findByText("Brown rice");

    await waitFor(() => expect(picker().disabled).toBe(false));
    fireEvent.change(picker(), { target: { value: "b-stack" } });
    await screen.findByText("Beans");
    expect(screen.queryByText("Brown rice")).toBeNull();

    await waitFor(() => expect(picker().disabled).toBe(false));
    fireEvent.change(picker(), { target: { value: "a-stack" } });
    await screen.findByText("Brown rice");
    expect(screen.queryByText("Rice")).toBeNull();

    const saved = await realLoad("a-stack");
    expect(saved.ok && JSON.stringify(saved.value)).toContain("Brown rice");
  });

  it("disables the picker while a save is in flight", async () => {
    await seedTwoStacks();
    render(<App />);
    await screen.findByText("Rice");

    let release: () => void = () => { };
    const gate = new Promise<void>((r) => {
      release = r;
    });
    vi.mocked(store.saveStack).mockImplementation(async (s, db) => {
      await gate;
      return realSave(s, db);
    });

    await editOpenItem("Brown rice");
    await waitFor(() => expect(picker().disabled).toBe(true));

    release();
    await waitFor(() => expect(picker().disabled).toBe(false));
    expect(picker().value).toBe("a-stack");
  });

  it("shows the error and keeps the current stack open when loading fails", async () => {
    await seedTwoStacks();
    render(<App />);
    await screen.findByText("Rice");

    const message = "We could not read your saved data. Try again.";
    vi.mocked(store.loadStack).mockResolvedValueOnce({
      ok: false,
      error: { code: "UNREADABLE_DATA", message },
    });
    fireEvent.change(picker(), { target: { value: "b-stack" } });

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toBe(message);
    expect(screen.getByText("Rice")).toBeTruthy();
    expect(screen.queryByText("Beans")).toBeNull();
    expect(picker().value).toBe("a-stack");
  });

  it("opens the last-opened stack on start", async () => {
    await seedTwoStacks();
    localStorage.setItem(LAST_OPENED_KEY, "b-stack");
    render(<App />);

    await screen.findByText("Beans");
    expect(screen.queryByText("Rice")).toBeNull();
    expect(picker().value).toBe("b-stack");
  });
});
