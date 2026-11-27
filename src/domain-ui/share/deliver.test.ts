import { describe, expect, it } from "vitest";
import { deliverMessage, type ShareEnvironment } from "./deliver";

const TEXT = "Hello & welcome: ₦1,500 / 50%";

interface FakeOpts {
  canShare?: boolean;
  share?: () => Promise<void>;
  online?: boolean;
  openUrl?: boolean;
  clipboard?: () => Promise<void>;
}

function makeEnv(opts: FakeOpts = {}) {
  const calls: string[] = [];
  const urls: string[] = [];
  const env: ShareEnvironment = {
    canShare: () => {
      calls.push("canShare");
      return opts.canShare ?? false;
    },
    share: () => {
      calls.push("share");
      return (opts.share ?? (() => Promise.resolve()))();
    },
    isOnline: () => {
      calls.push("isOnline");
      return opts.online ?? true;
    },
    openUrl: (url) => {
      calls.push("openUrl");
      urls.push(url);
      return opts.openUrl ?? true;
    },
    writeClipboard: () => {
      calls.push("writeClipboard");
      return (opts.clipboard ?? (() => Promise.resolve()))();
    },
  };
  return { env, calls, urls };
}

const abortError = () => Object.assign(new Error("abort"), { name: "AbortError" });

describe("deliverMessage", () => {
  it("returns shared when the share sheet succeeds", async () => {
    const { env } = makeEnv({ canShare: true });
    expect(await deliverMessage(TEXT, env)).toEqual({ kind: "shared" });
  });

  it("opens the wa.me link when sharing is unavailable and online", async () => {
    const { env, urls } = makeEnv({ canShare: false, online: true, openUrl: true });
    expect(await deliverMessage(TEXT, env)).toEqual({ kind: "opened" });
    expect(urls).toEqual(["https://wa.me/?text=" + encodeURIComponent(TEXT)]);
  });

  it("copies to the clipboard when offline", async () => {
    const { env, calls } = makeEnv({ online: false });
    expect(await deliverMessage(TEXT, env)).toEqual({ kind: "copied" });
    expect(calls).not.toContain("openUrl");
  });

  it("returns manual with the exact text when the clipboard fails", async () => {
    const { env } = makeEnv({
      online: false,
      clipboard: () => Promise.reject(new Error("denied")),
    });
    expect(await deliverMessage(TEXT, env)).toEqual({ kind: "manual", text: TEXT });
  });

  it("returns cancelled on AbortError and makes no further calls", async () => {
    const { env, calls } = makeEnv({
      canShare: true,
      share: () => Promise.reject(abortError()),
    });
    expect(await deliverMessage(TEXT, env)).toEqual({ kind: "cancelled" });
    expect(calls).toEqual(["canShare", "share"]);
  });

  it("falls to openUrl when share fails with a non-abort error", async () => {
    const { env, urls } = makeEnv({
      canShare: true,
      share: () => Promise.reject(new Error("boom")),
    });
    expect(await deliverMessage(TEXT, env)).toEqual({ kind: "opened" });
    expect(urls).toHaveLength(1);
  });

  it("falls to the clipboard when openUrl returns false", async () => {
    const { env, calls } = makeEnv({ openUrl: false });
    expect(await deliverMessage(TEXT, env)).toEqual({ kind: "copied" });
    expect(calls).toContain("writeClipboard");
  });

  it("falls to the clipboard when share fails while offline", async () => {
    const { env, calls } = makeEnv({
      canShare: true,
      online: false,
      share: () => Promise.reject(new Error("boom")),
    });
    expect(await deliverMessage(TEXT, env)).toEqual({ kind: "copied" });
    expect(calls).not.toContain("openUrl");
  });

  it("still resolves when every environment function throws synchronously", async () => {
    const boom = () => {
      throw new Error("sync");
    };
    const env: ShareEnvironment = {
      canShare: boom,
      share: boom,
      isOnline: boom,
      openUrl: boom,
      writeClipboard: boom,
    };
    expect(await deliverMessage(TEXT, env)).toEqual({ kind: "manual", text: TEXT });
  });
});
