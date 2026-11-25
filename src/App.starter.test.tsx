// @vitest-environment jsdom
import "fake-indexeddb/auto";
import "./test/setup";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { deleteDB } from "idb";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

vi.mock("./storage/stackStore", async () => {
  const actual =
    await vi.importActual<typeof import("./storage/stackStore")>(
      "./storage/stackStore",
    );
  return { ...actual, saveStack: vi.fn(actual.saveStack) };
});

import App from "./App";
import { DB_NAME, STACKS_STORE, openGhostDb } from "./storage/db";
import { listStacks, loadStack, saveStack } from "./storage/stackStore";
import { SAMPLE_ITEMS_BY_STARTER } from "./domain-ui/sampleItems";
import type { StockCard } from "./domain/types";

const SAVE_ERROR = "We could not save your changes. Storage may be full.";

beforeEach(async () => {
  await deleteDB(DB_NAME);
  localStorage.clear();
});

afterEach(async () => {
  vi.mocked(saveStack).mockClear();
  await deleteDB(DB_NAME);
});

describe("App starter flow", () => {
  it("shows the chooser and creates nothing on first run", async () => {
    render(<App />);

    expect(
      await screen.findByRole("heading", { name: "Choose a starter" }),
    ).toBeTruthy();
    expect(await listStacks()).toEqual([]);
    expect(saveStack).not.toHaveBeenCalled();
  });

  it("shows the chooser and saves nothing when saved data is unreadable", async () => {
    const db = await openGhostDb();
    await db.put(STACKS_STORE, { id: "broken", junk: true } as never);
    db.close();

    render(<App />);

    expect(
      await screen.findByRole("heading", { name: "Choose a starter" }),
    ).toBeTruthy();
    expect(saveStack).not.toHaveBeenCalled();
    expect(await listStacks()).toEqual([]);
  });

  it("shows the save error, stays on the chooser and saves nothing when saving fails", async () => {
    vi.mocked(saveStack).mockResolvedValueOnce({
      ok: false,
      error: { code: "SAVE_FAILED", message: SAVE_ERROR },
    });
    render(<App />);
    await screen.findByRole("heading", { name: "Choose a starter" });

    fireEvent.click(
      screen.getByRole("button", { name: "Use Provisions shop" }),
    );

    expect((await screen.findByRole("alert")).textContent).toBe(SAVE_ERROR);
    expect(screen.getByRole("heading", { name: "Choose a starter" })).toBeTruthy();
    expect(await listStacks()).toEqual([]);
  });

  it("saves one Stack with only the farm sample items for the farm stall", async () => {
    render(<App />);
    await screen.findByRole("heading", { name: "Choose a starter" });

    fireEvent.click(
      screen.getByRole("button", { name: "Use Farm produce stall" }),
    );

    await waitFor(async () => {
      expect((await listStacks()).length).toBe(1);
    });
    const [{ id }] = await listStacks();
    const loaded = await loadStack(id);
    expect(loaded.ok).toBe(true);
    if (!loaded.ok) return;
    const stock = loaded.value.cards.find(
      (c): c is StockCard => c.type === "stock",
    );
    const names = stock?.items.map((i) => i.name).sort();
    expect(names).toEqual(
      SAMPLE_ITEMS_BY_STARTER["farm-stall"].map((s) => s.name).sort(),
    );
    for (const s of SAMPLE_ITEMS_BY_STARTER.provisions) {
      expect(names).not.toContain(s.name);
    }
  });
});
