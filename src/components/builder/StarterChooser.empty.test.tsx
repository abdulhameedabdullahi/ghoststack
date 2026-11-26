// @vitest-environment jsdom
import "../../test/setup";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { StarterChooser } from "./StarterChooser";

afterEach(cleanup);

describe("StarterChooser intro", () => {
  it("keeps the heading and intro, adds the tagline and shows a ghost", () => {
    const { container } = render(<StarterChooser onPick={vi.fn()} />);
    expect(screen.getByRole("heading", { level: 2, name: "Choose a starter" })).toBeTruthy();
    expect(
      screen.getAllByText("Pick the one that is closest to your business."),
    ).toHaveLength(1);
    expect(screen.getByText("Pick a starter to raise your shop.")).toBeTruthy();
    const ghost = container.querySelector("svg");
    expect(ghost).not.toBeNull();
    expect(ghost?.getAttribute("aria-hidden")).toBe("true");
  });
});
