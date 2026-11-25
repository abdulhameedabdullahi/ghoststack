import { afterEach, describe, expect, it, vi } from "vitest";
import { requestPersistentStorage } from "./requestPersistentStorage";

/** Replaces navigator.storage for one test. */
function setStorage(value: unknown): void {
  Object.defineProperty(globalThis.navigator, "storage", { value, configurable: true });
}

afterEach(() => {
  // Remove the own property so the real (or missing) value shows again.
  Reflect.deleteProperty(globalThis.navigator, "storage");
  vi.restoreAllMocks();
});

describe("requestPersistentStorage (Requirement 5.6)", () => {
  it("does not throw when navigator.storage is missing", () => {
    setStorage(undefined);
    expect(() => requestPersistentStorage()).not.toThrow();
  });

  it("does not throw when persist rejects", async () => {
    const persist = vi.fn().mockRejectedValue(new Error("refused"));
    setStorage({ persist });
    expect(() => requestPersistentStorage()).not.toThrow();
    // Let the rejection settle; an unhandled rejection would fail the run.
    await new Promise((r) => setTimeout(r, 0));
    expect(persist).toHaveBeenCalledTimes(1);
  });

  it("does not throw when persist throws", () => {
    const persist = vi.fn(() => {
      throw new Error("boom");
    });
    setStorage({ persist });
    expect(() => requestPersistentStorage()).not.toThrow();
    expect(persist).toHaveBeenCalledTimes(1);
  });

  it("calls persist once when it is present", () => {
    const persist = vi.fn().mockResolvedValue(true);
    setStorage({ persist });
    requestPersistentStorage();
    expect(persist).toHaveBeenCalledTimes(1);
  });
});
