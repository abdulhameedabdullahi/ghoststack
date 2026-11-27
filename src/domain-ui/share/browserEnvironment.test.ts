// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { browserShareEnvironment as env } from "./browserEnvironment";

function setNav(props: Record<string, unknown>) {
  for (const [k, v] of Object.entries(props)) {
    Object.defineProperty(navigator, k, { value: v, configurable: true });
  }
}

afterEach(() => {
  for (const k of ["share", "canShare", "onLine", "clipboard"]) {
    delete (navigator as unknown as Record<string, unknown>)[k];
  }
  vi.restoreAllMocks();
});

describe("browserShareEnvironment", () => {
  it("canShare is false without navigator.share", () => {
    setNav({ share: undefined });
    expect(env.canShare("hi")).toBe(false);
  });

  it("canShare is true when navigator.share exists", () => {
    setNav({ share: vi.fn() });
    expect(env.canShare("hi")).toBe(true);
  });

  it("isOnline reflects navigator.onLine", () => {
    setNav({ onLine: false });
    expect(env.isOnline()).toBe(false);
    setNav({ onLine: true });
    expect(env.isOnline()).toBe(true);
  });

  it("openUrl appends, clicks and removes a safe link", () => {
    let captured: HTMLAnchorElement | undefined;
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      captured = this;
      expect(document.body.contains(this)).toBe(true);
    });
    expect(env.openUrl("https://wa.me/?text=hi")).toBe(true);
    expect(captured).toBeDefined();
    expect(captured!.rel).toBe("noopener noreferrer");
    expect(captured!.target).toBe("_blank");
    expect(document.body.contains(captured!)).toBe(false);
  });

  it("writeClipboard rejects when navigator.clipboard is missing", async () => {
    setNav({ clipboard: undefined });
    await expect(env.writeClipboard("x")).rejects.toThrow();
  });
});
