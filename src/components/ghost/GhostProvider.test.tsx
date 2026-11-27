// @vitest-environment jsdom
import { act, cleanup, render } from "@testing-library/react";
import fc from "fast-check";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "../../test/setup";
import { installMatchMedia } from "../../test/mockMatchMedia";
import { GhostProvider, useGhost } from "./GhostProvider";
import type { GhostApi } from "./GhostProvider";
import { GHOST_MOODS } from "./ghostTypes";
import type { GhostEvent } from "./ghostTypes";

let api: GhostApi;
const reactIdentities: Array<GhostApi["react"]> = [];

function Probe() {
  api = useGhost();
  reactIdentities.push(api.react);
  return null;
}

function mount(props: { idleMs?: number } = {}) {
  return render(
    <GhostProvider {...props}>
      <Probe />
    </GhostProvider>,
  );
}

function advance(ms: number) {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
}

beforeEach(() => {
  vi.useFakeTimers();
  reactIdentities.length = 0;
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("GhostProvider", () => {
  it("starts with wave and settles to idle after the mood length", () => {
    mount();
    expect(api.state.mood).toBe("wave");
    advance(1599);
    expect(api.state.mood).toBe("wave");
    advance(1);
    expect(api.state.mood).toBe("idle");
  });

  it("settles to idle with reduced motion on", () => {
    const mm = installMatchMedia(true);
    try {
      mount();
      expect(api.state.mood).toBe("wave");
      advance(1600);
      expect(api.state.mood).toBe("idle");
    } finally {
      mm.restore();
    }
  });

  it("sleeps after idleMs without interaction", () => {
    mount({ idleMs: 5000 });
    advance(4999);
    expect(api.state.mood).toBe("idle");
    advance(1);
    expect(api.state.mood).toBe("sleep");
  });

  it.each(["pointerdown", "keydown"])(
    "%s wakes a sleeping ghost to idle and restarts the idle timer",
    (type) => {
      mount({ idleMs: 5000 });
      advance(5000);
      expect(api.state.mood).toBe("sleep");
      act(() => {
        document.dispatchEvent(new Event(type));
      });
      expect(api.state.mood).toBe("idle");
      advance(4999);
      expect(api.state.mood).toBe("idle");
      advance(1);
      expect(api.state.mood).toBe("sleep");
    },
  );

  it("cheers when saleRecorded arrives from sleep", () => {
    mount({ idleMs: 5000 });
    advance(5000);
    expect(api.state.mood).toBe("sleep");
    act(() => api.react("saleRecorded"));
    expect(api.state.mood).toBe("cheer");
  });

  it("ends in sleep when idleTimeout fires during cheer", () => {
    mount({ idleMs: 1000 });
    advance(1600);
    act(() => api.react("saleRecorded"));
    expect(api.state.mood).toBe("cheer");
    advance(1000);
    expect(api.state.mood).toBe("cheer");
    advance(600);
    expect(api.state.mood).toBe("sleep");
  });

  it("keeps the same react identity across renders", () => {
    mount();
    act(() => api.react("debtAdded"));
    advance(5000);
    expect(reactIdentities.length).toBeGreaterThan(2);
    expect(new Set(reactIdentities).size).toBe(1);
  });

  it("restarts the mood timer when the same event is reacted twice", () => {
    mount();
    advance(1600);
    act(() => api.react("saleRecorded"));
    advance(1000);
    act(() => api.react("saleRecorded"));
    advance(1000);
    expect(api.state.mood).toBe("cheer");
    advance(600);
    expect(api.state.mood).toBe("idle");
  });

  it("leaves no timers and no document listeners after unmount", () => {
    const add = vi.spyOn(document, "addEventListener");
    const remove = vi.spyOn(document, "removeEventListener");
    const { unmount } = mount();
    act(() => api.react("saleRecorded"));
    unmount();
    expect(vi.getTimerCount()).toBe(0);
    for (const type of ["pointerdown", "keydown"]) {
      const added = add.mock.calls.filter((c) => c[0] === type);
      const removed = remove.mock.calls.filter((c) => c[0] === type);
      expect(added.length).toBeGreaterThan(0);
      for (const [, fn] of added) {
        expect(removed.some((r) => r[1] === fn)).toBe(true);
      }
    }
    add.mockRestore();
    remove.mockRestore();
  });

  it("does nothing and does not throw outside a provider", () => {
    function Bare() {
      api = useGhost();
      return null;
    }
    render(<Bare />);
    expect(api.active).toBe(false);
    expect(() => api.react("saleRecorded")).not.toThrow();
    expect(api.state.mood).toBe("idle");
  });
});

// Feature: ghost-companion, Property 9: Busy moods always end in idle or sleep
describe("GhostProvider properties", () => {
  const eventArb: fc.Arbitrary<GhostEvent | GhostEvent["type"]> = fc.oneof(
    fc.boolean().map((on): GhostEvent => ({ type: "midnightToggled", on })),
    fc.constantFrom<GhostEvent["type"]>(
      "appOpened",
      "saleRecorded",
      "debtAdded",
      "debtPaid",
      "errorShown",
      "emptyScreen",
      "poked",
    ),
  );

  it("Property 9: after react calls and 10 seconds, mood is idle or sleep", () => {
    // **Validates: Requirements 3.6, 4.3-4.7, 6.4, 9.1-9.4, 9.6, 13.1, 13.3**
    fc.assert(
      fc.property(
        fc.array(fc.tuple(eventArb, fc.integer({ min: 0, max: 3000 })), {
          maxLength: 15,
        }),
        (calls) => {
          const { unmount } = mount();
          for (const [event, gap] of calls) {
            act(() => api.react(event));
            advance(gap);
          }
          advance(10000);
          const mood = api.state.mood;
          unmount();
          expect(GHOST_MOODS).toContain(mood);
          return mood === "idle" || mood === "sleep";
        },
      ),
      { numRuns: 100 },
    );
  });
});
