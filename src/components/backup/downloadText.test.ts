// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { downloadText } from "./downloadText";

describe("downloadText", () => {
  let create: ReturnType<typeof vi.fn>;
  let revoke: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();
    create = vi.fn(() => "blob:fake-url");
    revoke = vi.fn();
    URL.createObjectURL = create as unknown as typeof URL.createObjectURL;
    URL.revokeObjectURL = revoke as unknown as typeof URL.revokeObjectURL;
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("clicks a hidden link with the file name, then removes it", () => {
    let clicked: HTMLAnchorElement | null = null;
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      clicked = this;
      expect(document.body.contains(this)).toBe(true);
    });

    downloadText("hello", "backup.json", "application/json");

    expect(create).toHaveBeenCalledTimes(1);
    expect(clicked).not.toBeNull();
    const a = clicked as unknown as HTMLAnchorElement;
    expect(a.download).toBe("backup.json");
    expect(a.href).toBe("blob:fake-url");
    expect(document.body.contains(a)).toBe(false);
  });

  it("revokes the URL at 1000 ms and not before", () => {
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

    downloadText("hello", "backup.json", "application/json");

    vi.advanceTimersByTime(999);
    expect(revoke).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(revoke).toHaveBeenCalledTimes(1);
    expect(revoke).toHaveBeenCalledWith("blob:fake-url");
  });
});
