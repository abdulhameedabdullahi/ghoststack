// @vitest-environment jsdom
import "../../test/setup";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ShareEnvironment } from "../../domain-ui/share";
import { ShareButton } from "./ShareButton";
import { ShareProvider } from "./ShareProvider";
import { ShareStatus } from "./ShareStatus";
import {
  SHARE_COPIED,
  SHARE_DONE_LABEL,
  SHARE_MANUAL,
  SHARE_OPENED,
  SHARE_SHARED,
  SHARE_TEXTAREA_LABEL,
} from "./shareMessages";

const TEXT = "Hello from the ghost: ₦1,500";

function makeEnv(over: Partial<ShareEnvironment> = {}): ShareEnvironment {
  return {
    canShare: () => false,
    share: () => Promise.resolve(),
    isOnline: () => true,
    openUrl: () => true,
    writeClipboard: () => Promise.resolve(),
    ...over,
  };
}

function Tree({ env, resetKey }: { env: ShareEnvironment; resetKey?: string }): ReactNode {
  return (
    <ShareProvider env={env} resetKey={resetKey}>
      <ShareButton label="Share it" makeText={() => ({ ok: true, value: { text: TEXT } })} />
      <ShareStatus />
    </ShareProvider>
  );
}

function press() {
  fireEvent.click(screen.getByRole("button", { name: "Share it" }));
}

const status = () => screen.getByRole("status");

describe("ShareStatus", () => {
  it("renders an empty status element before any press", () => {
    render(<Tree env={makeEnv()} />);
    expect(status().textContent).toBe("");
  });

  it("shows the shared message", async () => {
    render(<Tree env={makeEnv({ canShare: () => true })} />);
    press();
    await waitFor(() => expect(status().textContent).toBe(SHARE_SHARED));
    expect(SHARE_SHARED).toBe("Shared. Thank you!");
  });

  it("shows the opened message", async () => {
    render(<Tree env={makeEnv()} />);
    press();
    await waitFor(() => expect(status().textContent).toBe(SHARE_OPENED));
    expect(SHARE_OPENED).toBe("The ghost has packed your message. Tap send in WhatsApp.");
  });

  it("shows the copied message", async () => {
    render(<Tree env={makeEnv({ openUrl: () => false })} />);
    press();
    await waitFor(() => expect(status().textContent).toBe(SHARE_COPIED));
    expect(SHARE_COPIED).toBe("Copied. Paste it in WhatsApp.");
  });

  it("shows the manual message", async () => {
    render(
      <Tree
        env={makeEnv({ openUrl: () => false, writeClipboard: () => Promise.reject(new Error("no")) })}
      />,
    );
    press();
    await waitFor(() => expect(status().textContent).toBe(SHARE_MANUAL));
    expect(SHARE_MANUAL).toBe("Could not share. Select the message below and copy it.");
  });

  it("leaves the status empty when the user cancels", async () => {
    const share = vi.fn(() => Promise.reject(Object.assign(new Error("x"), { name: "AbortError" })));
    render(<Tree env={makeEnv({ canShare: () => true, share })} />);
    press();
    await waitFor(() => expect(share).toHaveBeenCalled());
    await waitFor(() => expect(screen.getByRole("button", { name: "Share it" }).getAttribute("aria-disabled")).not.toBe("true"));
    expect(status().textContent).toBe("");
  });

  describe("manual box", () => {
    const manualEnv = () =>
      makeEnv({ openUrl: () => false, writeClipboard: () => Promise.reject(new Error("no")) });

    it("is a read-only, focused, select-all textarea holding the exact text", async () => {
      render(<Tree env={manualEnv()} />);
      press();
      const box = (await screen.findByLabelText(SHARE_TEXTAREA_LABEL)) as HTMLTextAreaElement;
      expect(box.readOnly).toBe(true);
      expect(box.value).toBe(TEXT);
      await waitFor(() => expect(document.activeElement).toBe(box));
      box.setSelectionRange(0, 0);
      fireEvent.focus(box);
      expect(box.selectionStart).toBe(0);
      expect(box.selectionEnd).toBe(TEXT.length);
    });

    it("Done returns focus to the starting button and removes the box", async () => {
      render(<Tree env={manualEnv()} />);
      press();
      await screen.findByLabelText(SHARE_TEXTAREA_LABEL);
      fireEvent.click(screen.getByRole("button", { name: SHARE_DONE_LABEL }));
      await waitFor(() => expect(screen.queryByLabelText(SHARE_TEXTAREA_LABEL)).toBeNull());
      await waitFor(() =>
        expect(document.activeElement).toBe(screen.getByRole("button", { name: "Share it" })),
      );
    });
  });

  it("clears the notice when the next press starts", async () => {
    let release: () => void = () => {};
    let calls = 0;
    const env = makeEnv({
      openUrl: () => true,
      canShare: () => calls++ > 0,
      share: () => new Promise<void>((r) => (release = r)),
    });
    render(<Tree env={env} />);
    press();
    await waitFor(() => expect(status().textContent).toBe(SHARE_OPENED));
    press();
    await waitFor(() => expect(status().textContent).toBe(""));
    release();
    await waitFor(() => expect(status().textContent).toBe(SHARE_SHARED));
  });

  it("clears the notice when resetKey changes", async () => {
    const env = makeEnv();
    const { rerender } = render(<Tree env={env} resetKey="a" />);
    press();
    await waitFor(() => expect(status().textContent).toBe(SHARE_OPENED));
    rerender(<Tree env={env} resetKey="b" />);
    await waitFor(() => expect(status().textContent).toBe(""));
  });

  it("offline with no share sheet copies without any network call", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    try {
      const openUrl = vi.fn(() => true);
      render(<Tree env={makeEnv({ isOnline: () => false, canShare: () => false, openUrl })} />);
      press();
      await waitFor(() => expect(status().textContent).toBe("Copied. Paste it in WhatsApp."));
      expect(fetchSpy).not.toHaveBeenCalled();
      expect(openUrl).not.toHaveBeenCalled();
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
