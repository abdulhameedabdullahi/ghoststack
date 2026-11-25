// @vitest-environment jsdom
import "../test/setup";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { StackPicker } from "./StackPicker";

const two = [
  { id: "a", name: "Shop A" },
  { id: "b", name: "Shop B" },
];

describe("StackPicker", () => {
  afterEach(cleanup);

  it("shows only the name, with no select, for one stack", () => {
    render(
      <StackPicker
        stacks={[{ id: "a", name: "Shop A" }]}
        currentStackId="a"
        onPick={() => {}}
        disabled={false}
      />,
    );
    expect(screen.queryByRole("combobox")).toBeNull();
    expect(screen.getByText("Shop A")).toBeTruthy();
  });

  it("calls onPick with the chosen id when there are two stacks", () => {
    const onPick = vi.fn();
    render(
      <StackPicker stacks={two} currentStackId="a" onPick={onPick} disabled={false} />,
    );
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "b" } });
    expect(onPick).toHaveBeenCalledWith("b");
  });

  it("disables the select when disabled is true", () => {
    render(
      <StackPicker stacks={two} currentStackId="a" onPick={() => {}} disabled={true} />,
    );
    expect((screen.getByRole("combobox") as HTMLSelectElement).disabled).toBe(true);
  });
});
