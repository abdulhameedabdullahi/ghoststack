// @vitest-environment jsdom
import { act, cleanup, render } from "@testing-library/react";
import fc from "fast-check";
import { afterEach, describe, expect, it } from "vitest";
import "../../test/setup";
import { installMatchMedia } from "../../test/mockMatchMedia";
import { GhostMascot } from "./GhostMascot";
import { MOODS, SLEEP_Z_CELLS, frameCells } from "./ghostFrames";
import type { GhostMood } from "./ghostTypes";

const ALL_MOODS = Object.keys(MOODS) as GhostMood[];

let restore: (() => void) | null = null;

function setup(reduced: boolean) {
  const mm = installMatchMedia(reduced);
  restore = mm.restore;
  return mm;
}

afterEach(() => {
  cleanup();
  restore?.();
  restore = null;
});

function animClasses(el: Element): string[] {
  return Array.from(el.classList).filter((c) => c.startsWith("ghost-mascot--anim"));
}

function root(container: HTMLElement): HTMLElement {
  return container.querySelector(".ghost-mascot") as HTMLElement;
}

function frameGroups(container: HTMLElement) {
  return container.querySelectorAll(".ghost-mascot__frame");
}

describe("GhostMascot", () => {
  // Validates: Requirements 12.6, 13.1
  it("is decorative: aria-hidden, not focusable, no title, no role", () => {
    setup(false);
    const { container } = render(<GhostMascot mood="wave" nightcap />);
    const svg = container.querySelector("svg")!;
    expect(svg.getAttribute("aria-hidden")).toBe("true");
    expect(svg.getAttribute("focusable")).toBe("false");
    expect(container.querySelector("title")).toBeNull();
    expect(container.querySelector("[role]")).toBeNull();
  });

  // Validates: Requirements 9.5
  it("has no hex or rgb( colors in markup", () => {
    setup(false);
    for (const mood of ALL_MOODS) {
      const { container, unmount } = render(<GhostMascot mood={mood} nightcap />);
      expect(container.innerHTML).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
      expect(container.innerHTML).not.toMatch(/rgb\(/);
      unmount();
    }
  });

  // Validates: Requirements 6.1, 6.2, 13.5
  it("with reduced motion on: no anim class and one frame group for every mood", () => {
    setup(true);
    for (const mood of ALL_MOODS) {
      const { container, unmount } = render(<GhostMascot mood={mood} nightcap={false} />);
      expect(animClasses(root(container))).toEqual([]);
      expect(frameGroups(container).length).toBe(1);
      unmount();
    }
  });

  // Validates: Requirements 5.3, 6.1
  it("with reduced motion off: busy moods get their anim class, idle gets none", () => {
    setup(false);
    for (const mood of ALL_MOODS) {
      const { container, unmount } = render(<GhostMascot mood={mood} nightcap={false} />);
      const classes = root(container).classList;
      if (mood === "idle") {
        expect(animClasses(root(container))).toEqual([]);
      } else {
        expect(classes.contains(`ghost-mascot--anim-${mood}`)).toBe(true);
      }
      unmount();
    }
  });

  // Validates: Requirements 6.1
  it("draws two frame groups for moods with frame B when motion is allowed", () => {
    setup(false);
    for (const mood of ALL_MOODS) {
      const { container, unmount } = render(<GhostMascot mood={mood} nightcap={false} />);
      const expected = mood !== "idle" && MOODS[mood].b ? 2 : 1;
      expect(frameGroups(container).length).toBe(expected);
      unmount();
    }
  });

  // Validates: Requirements 8.1
  it("draws the nightcap group only when nightcap is true", () => {
    setup(false);
    const on = render(<GhostMascot mood="idle" nightcap />);
    expect(on.container.querySelector(".ghost-mascot__cap")).not.toBeNull();
    on.unmount();
    const off = render(<GhostMascot mood="idle" nightcap={false} />);
    expect(off.container.querySelector(".ghost-mascot__cap")).toBeNull();
  });

  // Validates: Requirements 6.5
  it("adds the z cells for sleep", () => {
    setup(true);
    const sleep = render(<GhostMascot mood="sleep" nightcap={false} />);
    const count = sleep.container.querySelectorAll(".ghost-mascot__frame--a rect").length;
    expect(count).toBe(frameCells(MOODS.sleep.a).length + SLEEP_Z_CELLS.length);
    sleep.unmount();
    const idle = render(<GhostMascot mood="idle" nightcap={false} />);
    const idleCount = idle.container.querySelectorAll(".ghost-mascot__frame--a rect").length;
    expect(idleCount).toBe(frameCells(MOODS.idle.a).length);
  });

  // Validates: Requirements 13.5
  it("updates the class when the media query changes, without remounting", () => {
    const mm = setup(false);
    const { container } = render(<GhostMascot mood="wave" nightcap={false} />);
    const node = root(container);
    expect(node.classList.contains("ghost-mascot--anim-wave")).toBe(true);
    act(() => mm.setMatches(true));
    expect(root(container)).toBe(node);
    expect(animClasses(node)).toEqual([]);
    act(() => mm.setMatches(false));
    expect(root(container)).toBe(node);
    expect(node.classList.contains("ghost-mascot--anim-wave")).toBe(true);
  });

  // Feature: ghost-companion, Property 8: Reduced motion never animates
  // Validates: Requirements 6.1, 13.5
  it("Property 8: reduced motion never animates", () => {
    setup(true);
    fc.assert(
      fc.property(fc.constantFrom(...ALL_MOODS), fc.boolean(), (mood, nightcap) => {
        const { container, unmount } = render(
          <GhostMascot mood={mood} nightcap={nightcap} />,
        );
        const ok =
          animClasses(root(container)).length === 0 &&
          frameGroups(container).length === 1;
        unmount();
        return ok;
      }),
      { numRuns: 100 },
    );
  });
});
