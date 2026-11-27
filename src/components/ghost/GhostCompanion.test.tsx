// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "../../test/setup";
import { installMatchMedia } from "../../test/mockMatchMedia";
import { GhostCompanion } from "./GhostCompanion";
import { GhostProvider, useGhost } from "./GhostProvider";
import type { GhostApi } from "./GhostProvider";
import { pickTip } from "./ghostTips";


// Node module name built at run time (no Node types); paths are relative to the project root.
type Fs = { readFileSync(path: string, encoding: "utf8"): string };
const fs = (await import(/* @vite-ignore */["node", "fs"].join(":"))) as Fs;
const companionCss = fs.readFileSync("src/components/ghost/GhostCompanion.css", "utf8");
const buttonCss = fs.readFileSync("src/components/Button.css", "utf8");

function ruleBody(css: string, selector: string): string {
  const start = css.indexOf(`${selector} {`);
  expect(start, `selector ${selector}`).toBeGreaterThanOrEqual(0);
  return css.slice(start, css.indexOf("}", start));
}

let api: GhostApi;
function Probe() {
  api = useGhost();
  return null;
}

function mount(props: { idleMs?: number; bubbleMs?: number } = {}) {
  return render(
    <GhostProvider {...props}>
      <Probe />
      <GhostCompanion />
    </GhostProvider>,
  );
}

function advance(ms: number) {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
}

function mood(): string | null {
  return document.querySelector("[data-mood]")?.getAttribute("data-mood") ?? null;
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("GhostCompanion", () => {
  it("renders a poke button; clicking it makes the ghost giggle and shows a bubble", () => {
    // Validates: Requirements 6.3, 7.1
    mount();
    advance(1600);
    act(() => api.dismissBubble());
    expect(mood()).toBe("idle");
    expect(document.querySelector(".ghost-bubble")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Poke the ghost" }));
    expect(mood()).toBe("giggle");
    expect(document.querySelector(".ghost-bubble")).not.toBeNull();
  });

  it("uses var(--tap-min) for poke button and Got it button sizes", () => {
    // Validates: Requirements 7.3, 12.7
    const poke = ruleBody(companionCss, ".ghost-companion__poke");
    expect(poke).toMatch(/min-width:\s*var\(--tap-min\)/);
    expect(poke).toMatch(/min-height:\s*var\(--tap-min\)/);
    // Got it is the shared Button, which gets its tap size from Button.css.
    mount();
    const gotIt = screen.getByRole("button", { name: "Got it" });
    expect(gotIt.classList.contains("button")).toBe(true);
    const button = ruleBody(buttonCss, ".button");
    expect(button).toMatch(/min-width:\s*var\(--tap-min\)/);
    expect(button).toMatch(/min-height:\s*var\(--tap-min\)/);
  });

  it("shows only one bubble after three react calls, with the latest tip", () => {
    // Validates: Requirements 7.1, 7.5
    mount();
    act(() => api.react("saleRecorded"));
    act(() => api.react("saleRecorded"));
    act(() => api.react("saleRecorded"));
    const bubbles = document.querySelectorAll(".ghost-bubble");
    expect(bubbles).toHaveLength(1);
    // appOpened used counter 0, so the third saleRecorded used counter 3.
    expect(bubbles[0].textContent).toContain(pickTip("saleRecorded", 3));
  });

  it("gives the bubble and strip no role, aria-live or aria-atomic", () => {
    // Validates: Requirements 8.2, 8.3
    const { container } = mount();
    expect(container.querySelector(".ghost-bubble")).not.toBeNull();
    for (const el of [
      container.querySelector(".ghost-companion"),
      container.querySelector(".ghost-bubble"),
      container.querySelector(".ghost-bubble__text"),
    ]) {
      expect(el).not.toBeNull();
      expect(el?.hasAttribute("role")).toBe(false);
      expect(el?.hasAttribute("aria-live")).toBe(false);
      expect(el?.hasAttribute("aria-atomic")).toBe(false);
    }
    expect(screen.queryByRole("status")).toBeNull();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("removes the bubble on Got it and moves focus to the poke button", () => {
    // Validates: Requirements 7.4, 8.4
    mount();
    fireEvent.click(screen.getByRole("button", { name: "Got it" }));
    expect(document.querySelector(".ghost-bubble")).toBeNull();
    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: "Poke the ghost" }),
    );
  });

  it("closes the bubble by itself after bubbleMs", () => {
    // Validates: Requirement 7.4
    mount({ bubbleMs: 3000, idleMs: 60000 });
    expect(document.querySelector(".ghost-bubble")).not.toBeNull();
    advance(2999);
    expect(document.querySelector(".ghost-bubble")).not.toBeNull();
    advance(1);
    expect(document.querySelector(".ghost-bubble")).toBeNull();
  });

  it("closes the bubble when the ghost falls asleep", () => {
    // Validates: Requirement 7.4
    mount({ bubbleMs: 60000, idleMs: 5000 });
    expect(document.querySelector(".ghost-bubble")).not.toBeNull();
    advance(5000);
    expect(mood()).toBe("sleep");
    expect(document.querySelector(".ghost-bubble")).toBeNull();
  });

  describe("with reduced motion on", () => {
    it("still shows the bubble, closes on Got it and on the timer", () => {
      // Validates: Requirements 7.4, 7.5
      const mm = installMatchMedia(true);
      try {
        mount({ bubbleMs: 3000, idleMs: 60000 });
        expect(document.querySelector(".ghost-bubble")).not.toBeNull();
        fireEvent.click(screen.getByRole("button", { name: "Got it" }));
        expect(document.querySelector(".ghost-bubble")).toBeNull();
        fireEvent.click(screen.getByRole("button", { name: "Poke the ghost" }));
        expect(document.querySelector(".ghost-bubble")).not.toBeNull();
        advance(3000);
        expect(document.querySelector(".ghost-bubble")).toBeNull();
      } finally {
        mm.restore();
      }
    });
  });

  it("renders nothing without a provider", () => {
    // Validates: Requirement 6.3
    const { container } = render(<GhostCompanion />);
    expect(container.innerHTML).toBe("");
  });
});
