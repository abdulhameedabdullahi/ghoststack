// @vitest-environment jsdom
import "../test/setup";
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Ghost } from "./Ghost";
import { ghostCells } from "./ghostGrid";

function getSvg(container: HTMLElement): SVGSVGElement {
  const svg = container.querySelector("svg");
  if (!svg) throw new Error("no svg rendered");
  return svg;
}

describe("Ghost", () => {
  it("is decorative without a title", () => {
    const { container } = render(<Ghost />);
    const svg = getSvg(container);
    expect(svg.getAttribute("aria-hidden")).toBe("true");
    expect(svg.getAttribute("focusable")).toBe("false");
    expect(svg.querySelector("title")).toBeNull();
    expect(svg.getAttribute("role")).toBeNull();
  });

  it("is an image named by the title when a title is given", () => {
    const { container } = render(<Ghost title="GhostStack ghost" />);
    const svg = getSvg(container);
    expect(svg.getAttribute("role")).toBe("img");
    expect(svg.hasAttribute("aria-hidden")).toBe(false);
    expect(screen.getByRole("img", { name: "GhostStack ghost" })).toBe(svg);
  });

  it.each([24, 48, 96] as const)("renders at size %i", (size) => {
    const { container } = render(<Ghost size={size} />);
    const svg = getSvg(container);
    expect(svg.getAttribute("width")).toBe(String(size));
    expect(svg.getAttribute("height")).toBe(String(size));
  });

  it("defaults to size 48", () => {
    const { container } = render(<Ghost />);
    const svg = getSvg(container);
    expect(svg.getAttribute("width")).toBe("48");
    expect(svg.getAttribute("height")).toBe("48");
  });

  it("hard-codes no colour and fills with currentColor", () => {
    const { container } = render(<Ghost title="Ghost" />);
    const svg = getSvg(container);
    expect(svg.getAttribute("fill")).toBe("currentColor");
    expect(container.innerHTML).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(container.innerHTML).not.toMatch(/rgba?\(/i);
  });

  it("draws one rect per filled cell", () => {
    const { container } = render(<Ghost />);
    expect(container.querySelectorAll("rect").length).toBe(ghostCells().length);
  });
});
