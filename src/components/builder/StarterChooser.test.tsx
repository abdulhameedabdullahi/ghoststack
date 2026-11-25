// @vitest-environment jsdom
import "../../test/setup";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { StarterChooser } from "./StarterChooser";

afterEach(cleanup);

const FAIL = { ok: false as const, message: "Could not save. Try again." };

describe("StarterChooser", () => {
  it("shows the message, stays on the chooser and offers Try again after a failed pick", async () => {
    const onPick = vi.fn().mockResolvedValue(FAIL);
    render(<StarterChooser onPick={onPick} />);

    fireEvent.click(screen.getByRole("button", { name: "Use Provisions shop" }));

    expect((await screen.findByRole("alert")).textContent).toBe(FAIL.message);
    expect(screen.getByRole("heading", { name: "Choose a starter" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Try again" })).toBeTruthy();
  });

  it("repeats the same pick (kind and withSamples) when Try again is pressed", async () => {
    const onPick = vi.fn().mockResolvedValue(FAIL);
    render(<StarterChooser onPick={onPick} />);

    fireEvent.click(screen.getByRole("checkbox", { name: "Add sample items" }));
    fireEvent.click(screen.getByRole("button", { name: "Use Farm produce stall" }));
    await screen.findByRole("button", { name: "Try again" });

    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    await waitFor(() => expect(onPick).toHaveBeenCalledTimes(2));

    expect(onPick).toHaveBeenNthCalledWith(1, "farm-stall", false);
    expect(onPick).toHaveBeenNthCalledWith(2, "farm-stall", false);
  });

  it("shows Cancel only when onCancel is given, and Cancel does not pick", () => {
    const onPick = vi.fn();
    const { unmount } = render(<StarterChooser onPick={onPick} />);
    expect(screen.queryByRole("button", { name: "Cancel" })).toBeNull();
    unmount();

    const onCancel = vi.fn();
    render(<StarterChooser onPick={onPick} onCancel={onCancel} />);
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onPick).not.toHaveBeenCalled();
  });
});
