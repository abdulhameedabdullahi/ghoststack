// @vitest-environment jsdom
import { act, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import "../test/setup";
import { installMatchMedia, removeMatchMedia } from "../test/mockMatchMedia";
import { useReducedMotion } from "./useReducedMotion";

function Probe() {
  const reduced = useReducedMotion();
  return <p data-testid="out">{reduced ? "reduced" : "full"}</p>;
}

let restore: (() => void) | null = null;

afterEach(() => {
  restore?.();
  restore = null;
});

describe("useReducedMotion", () => {
  // Validates: Requirements 13.7
  it("reports reduced when the query matches", () => {
    restore = installMatchMedia(true).restore;
    render(<Probe />);
    expect(screen.getByTestId("out").textContent).toBe("reduced");
  });

  it("reports not reduced when the query does not match", () => {
    restore = installMatchMedia(false).restore;
    render(<Probe />);
    expect(screen.getByTestId("out").textContent).toBe("full");
  });

  it("updates when the setting changes", () => {
    const mm = installMatchMedia(false);
    restore = mm.restore;
    render(<Probe />);
    act(() => mm.setMatches(true));
    expect(screen.getByTestId("out").textContent).toBe("reduced");
    act(() => mm.setMatches(false));
    expect(screen.getByTestId("out").textContent).toBe("full");
  });

  // Validates: Requirements 13.13
  it("returns true when matchMedia does not exist", () => {
    restore = removeMatchMedia();
    render(<Probe />);
    expect(screen.getByTestId("out").textContent).toBe("reduced");
  });

  it("removes its listener on unmount", () => {
    const mm = installMatchMedia(false);
    restore = mm.restore;
    const added: unknown[] = [];
    const removed: unknown[] = [];
    const base = window.matchMedia;
    window.matchMedia = ((q: string) => {
      const list = base(q);
      const add = list.addEventListener.bind(list);
      const rem = list.removeEventListener.bind(list);
      list.addEventListener = ((t: string, l: never) => {
        added.push(l);
        add(t, l);
      }) as typeof list.addEventListener;
      list.removeEventListener = ((t: string, l: never) => {
        removed.push(l);
        rem(t, l);
      }) as typeof list.removeEventListener;
      return list;
    }) as typeof window.matchMedia;

    const { unmount } = render(<Probe />);
    expect(added.length).toBe(1);
    unmount();
    expect(removed).toEqual(added);
    // A later change must not throw.
    expect(() => mm.setMatches(true)).not.toThrow();
  });
});
