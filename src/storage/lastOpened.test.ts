// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readLastOpenedId, rememberLastOpenedId } from "./lastOpened";

describe("lastOpened", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns the id after it was remembered", () => {
    rememberLastOpenedId("stack-1");
    expect(readLastOpenedId()).toBe("stack-1");
  });

  it("returns null when nothing is stored", () => {
    expect(readLastOpenedId()).toBeNull();
  });

  it("does not throw when localStorage fails on read and write", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(() => rememberLastOpenedId("stack-1")).not.toThrow();
    expect(readLastOpenedId()).toBeNull();
  });
});
