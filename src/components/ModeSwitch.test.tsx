// @vitest-environment jsdom
import "../test/setup";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { ModeSwitch } from "./ModeSwitch";

afterEach(cleanup);

describe("ModeSwitch", () => {
  it("renders both Play and Builder buttons", () => {
    render(<ModeSwitch mode="play" onChange={() => {}} />);
    expect(screen.getByRole("button", { name: /Play/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Builder/ })).toBeTruthy();
  });

  it("sets aria-pressed true only on the current mode (play)", () => {
    render(<ModeSwitch mode="play" onChange={() => {}} />);
    expect(screen.getByRole("button", { name: /Play/ }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByRole("button", { name: /Builder/ }).getAttribute("aria-pressed")).toBe("false");
  });

  it("sets aria-pressed true only on the current mode (builder)", () => {
    render(<ModeSwitch mode="builder" onChange={() => {}} />);
    expect(screen.getByRole("button", { name: /Play/ }).getAttribute("aria-pressed")).toBe("false");
    expect(screen.getByRole("button", { name: /Builder/ }).getAttribute("aria-pressed")).toBe("true");
  });

  it("calls onChange with the mode of the inactive button clicked", () => {
    const onChange = vi.fn();
    render(<ModeSwitch mode="play" onChange={onChange} />);
    fireEvent.click(screen.getByRole("button", { name: /Builder/ }));
    expect(onChange).toHaveBeenCalledWith("builder");
  });

  it("calls onChange with play when Play is clicked in builder mode", () => {
    const onChange = vi.fn();
    render(<ModeSwitch mode="builder" onChange={onChange} />);
    fireEvent.click(screen.getByRole("button", { name: /Play/ }));
    expect(onChange).toHaveBeenCalledWith("play");
  });
});
