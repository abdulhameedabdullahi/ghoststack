// @vitest-environment jsdom
import "fake-indexeddb/auto";
import "./test/setup";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { deleteDB } from "idb";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

const sw = vi.hoisted(() => ({
  notice: null as "update" | "offline" | null,
  applyUpdate: vi.fn(async () => { }),
  closeOffline: vi.fn(),
}));

vi.mock("./pwa/useServiceWorkerNotices", () => ({
  useServiceWorkerNotices: () => ({
    notice: sw.notice,
    closeOffline: sw.closeOffline,
    applyUpdate: sw.applyUpdate,
  }),
}));

vi.mock("./storage/stackStore", async (importOriginal) => {
  const real = await importOriginal<typeof import("./storage/stackStore")>();
  return { ...real, saveStack: vi.fn(real.saveStack) };
});

import App from "./App";
import { DB_NAME } from "./storage/db";
import {
  STORAGE_ERROR_MESSAGES,
  listStacks,
  loadStack,
  saveStack,
} from "./storage/stackStore";
import { buildStarterStack } from "./stacks/starterStack";
import { backupFileName, parseBackup } from "./domain-ui/backup";
import { BACKUP_READY } from "./components/backup/backupMessages";
import type { Stack } from "./domain/types";

const IDS = {
  stackId: "stack-1",
  stockCardId: "stock-1",
  salesCardId: "sales-1",
  debtsCardId: "debts-1",
  summaryCardId: "summary-1",
};

const saveMock = vi.mocked(saveStack);
const realSave = saveMock.getMockImplementation()!;

const FAILURE = {
  ok: false as const,
  error: {
    code: "SAVE_FAILED" as const,
    message: STORAGE_ERROR_MESSAGES.SAVE_FAILED,
  },
};

let persist: ReturnType<typeof vi.fn>;
let downloads: { name: string; url: string }[];
let blobs: Map<string, Blob>;
let clickSpy: ReturnType<typeof vi.spyOn>;
let fetchMock: ReturnType<typeof vi.fn>;

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

function readBlob(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error);
    r.readAsText(blob);
  });
}

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

async function openBuilder() {
  await screen.findByRole("tab", { name: /Stock/ });
  fireEvent.click(screen.getByRole("button", { name: /Builder/ }));
  await screen.findByRole("button", { name: "Save a backup" });
}

/** Changes the Stack (hides a card), which queues a save. */
async function changeStack() {
  const hide = screen.queryByRole("button", { name: "Hide Sales log" });
  const show = screen.queryByRole("button", { name: "Show Sales log" });
  fireEvent.click((hide ?? show)!);
}

beforeEach(async () => {
  await deleteDB(DB_NAME);
  localStorage.clear();
  saveMock.mockReset();
  saveMock.mockImplementation(realSave);
  const saved = await saveStack(seedStack());
  expect(saved.ok).toBe(true);
  saveMock.mockClear();

  sw.notice = null;
  sw.applyUpdate.mockClear();
  persist = vi.fn(async () => true);
  Object.defineProperty(navigator, "storage", {
    value: { persist },
    configurable: true,
  });
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);

  downloads = [];
  blobs = new Map();
  let n = 0;
  URL.createObjectURL = vi.fn((b: Blob | MediaSource) => {
    const url = `blob:test/${n++}`;
    blobs.set(url, b as Blob);
    return url;
  });
  URL.revokeObjectURL = vi.fn();
  clickSpy = vi
    .spyOn(HTMLAnchorElement.prototype, "click")
    .mockImplementation(function (this: HTMLAnchorElement) {
      downloads.push({ name: this.download, url: this.href });
    });
});

afterEach(async () => {
  expect(fetchMock).not.toHaveBeenCalled();
  clickSpy.mockRestore();
  vi.unstubAllGlobals();
  await deleteDB(DB_NAME);
});

describe("App backup: save", () => {
  it("downloads the open Stack, shows a message, keeps focus, and leaves storage alone", async () => {
    render(<App />);
    await openBuilder();
    const before = await loadStack(IDS.stackId);
    const listBefore = await listStacks();
    saveMock.mockClear();

    const button = screen.getByRole("button", { name: "Save a backup" });
    button.focus();
    fireEvent.click(button);

    await screen.findByText(BACKUP_READY);
    expect(downloads).toHaveLength(1);
    const now = new Date();
    const stack = (before as { ok: true; value: Stack }).value;
    expect(downloads[0].name).toBe(
      backupFileName(stack.name, {
        year: now.getFullYear(),
        month: now.getMonth() + 1,
        day: now.getDate(),
      }),
    );
    expect(document.activeElement).toBe(button);

    const text = await readBlob(
      [...blobs.values()][0],
    );
    const parsed = parseBackup(text, "fresh-id");
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      // Loading a backup always adds " (restored)" to the name.
      expect(parsed.value.name).toBe(`${stack.name} (restored)`);
      expect(parsed.value.cards).toEqual(stack.cards);
    }

    expect(saveMock).not.toHaveBeenCalled();
    expect(await listStacks()).toEqual(listBefore);
    expect(await loadStack(IDS.stackId)).toEqual(before);
  });

  it("waits for a stalled save before it makes the file", async () => {
    const gate = deferred();
    render(<App />);
    await openBuilder();
    saveMock.mockImplementation(async (s) => {
      await gate.promise;
      return realSave(s);
    });
    await changeStack();
    await screen.findByRole("button", { name: "Show Sales log" });

    fireEvent.click(screen.getByRole("button", { name: "Save a backup" }));
    await new Promise((r) => setTimeout(r, 50));
    expect(downloads).toHaveLength(0);
    expect(screen.queryByText(BACKUP_READY)).toBeNull();

    gate.resolve();
    await screen.findByText(BACKUP_READY);
    expect(downloads).toHaveLength(1);
    const text = await readBlob([...blobs.values()][0]);
    const parsed = parseBackup(text, "fresh-id");
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      const sales = parsed.value.cards.find((c) => c.id === IDS.salesCardId);
      expect(sales?.hidden).toBe(true);
    }
  });
});

describe("App backup: persistent storage", () => {
  it("is not asked on load, is asked once after the first good save, and not again", async () => {
    render(<App />);
    await openBuilder();
    expect(persist).not.toHaveBeenCalled();

    await changeStack();
    await waitFor(() => expect(persist).toHaveBeenCalledTimes(1));
    await changeStack();
    await waitFor(() => expect(saveMock).toHaveBeenCalledTimes(2));
    await new Promise((r) => setTimeout(r, 50));
    expect(persist).toHaveBeenCalledTimes(1);
  });

  it("is not asked while saves fail", async () => {
    render(<App />);
    await openBuilder();
    saveMock.mockResolvedValue(FAILURE);
    await changeStack();
    await screen.findAllByRole("alert");
    await new Promise((r) => setTimeout(r, 50));
    expect(persist).not.toHaveBeenCalled();
  });

  it("shows nothing when the browser refuses", async () => {
    persist.mockResolvedValue(false);
    render(<App />);
    await openBuilder();
    await changeStack();
    await waitFor(() => expect(persist).toHaveBeenCalledTimes(1));
    await new Promise((r) => setTimeout(r, 50));
    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.queryByText(/persist|keep your data/i)).toBeNull();
  });

  it("shows nothing when the request throws or rejects", async () => {
    persist.mockImplementation(() => {
      throw new Error("no");
    });
    render(<App />);
    await openBuilder();
    await changeStack();
    await waitFor(() => expect(persist).toHaveBeenCalledTimes(1));
    await new Promise((r) => setTimeout(r, 50));
    expect(screen.queryByRole("alert")).toBeNull();
    expect(
      screen.getByRole("button", { name: "Show Sales log" }),
    ).toBeTruthy();
  });
});

describe("App backup: reload", () => {
  it("runs the update only after the pending save finished", async () => {
    sw.notice = "update";
    const gate = deferred();
    render(<App />);
    await openBuilder();
    saveMock.mockImplementation(async (s) => {
      await gate.promise;
      return realSave(s);
    });
    await changeStack();

    fireEvent.click(screen.getByRole("button", { name: "Reload" }));
    await new Promise((r) => setTimeout(r, 50));
    expect(sw.applyUpdate).not.toHaveBeenCalled();

    gate.resolve();
    await waitFor(() => expect(sw.applyUpdate).toHaveBeenCalledTimes(1));
    const loaded = await loadStack(IDS.stackId);
    expect(loaded.ok && loaded.value.cards.some((c) => c.hidden)).toBe(true);
  });

  it("does not run the update when the save fails, and shows the alert", async () => {
    sw.notice = "update";
    render(<App />);
    await openBuilder();
    saveMock.mockResolvedValue(FAILURE);
    await changeStack();
    await screen.findAllByRole("alert");

    fireEvent.click(screen.getByRole("button", { name: "Reload" }));
    await waitFor(() =>
      expect(
        screen.getAllByText(STORAGE_ERROR_MESSAGES.SAVE_FAILED).length,
      ).toBeGreaterThanOrEqual(1),
    );
    await new Promise((r) => setTimeout(r, 50));
    expect(sw.applyUpdate).not.toHaveBeenCalled();
    expect(screen.getAllByRole("alert").length).toBeGreaterThan(0);
  });

  it("keeps typed form values while the update notice is shown", async () => {
    sw.notice = "update";
    render(<App />);
    await screen.findByRole("tab", { name: /Stock/ });
    fireEvent.click(await screen.findByRole("button", { name: "Record a sale" }));
    const qty = screen.getByLabelText("Quantity sold") as HTMLInputElement;
    fireEvent.change(qty, { target: { value: "3" } });

    expect(screen.getByRole("button", { name: "Reload" })).toBeTruthy();
    expect(
      (screen.getByLabelText("Quantity sold") as HTMLInputElement).value,
    ).toBe("3");
  });
});

describe("App backup: Play mode", () => {
  it("shows no backup controls", async () => {
    render(<App />);
    await screen.findByRole("tab", { name: /Stock/ });
    expect(screen.queryByRole("button", { name: "Save a backup" })).toBeNull();
    expect(screen.queryByLabelText("Load a backup")).toBeNull();
    expect(screen.queryByRole("region", { name: "Backup" })).toBeNull();
  });
});
