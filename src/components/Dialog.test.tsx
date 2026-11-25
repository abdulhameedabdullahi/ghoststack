// @vitest-environment jsdom
import "./../test/setup";
import { useRef, useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { RenameDialog } from "./builder/RenameDialog";

/** Opener button that restores focus to itself when the dialog closes. */
function Harness({ onClose }: { onClose?: () => void }) {
  const [open, setOpen] = useState(false);
  const openerRef = useRef<HTMLButtonElement>(null);
  return (
    <div>
      <button ref={openerRef} onClick={() => setOpen(true)}>
        Open
      </button>
      {open && (
        <RenameDialog
          label="Shop name"
          initialValue="My shop"
          onSubmit={() => {}}
          onClose={() => {
            onClose?.();
            setOpen(false);
            openerRef.current?.focus();
          }}
        />
      )}
    </div>
  );
}

function openDialog() {
  const opener = screen.getByRole("button", { name: "Open" });
  opener.focus();
  fireEvent.click(opener);
  return opener;
}

describe("Dialog", () => {
  it("has dialog role, aria-modal and a label from its heading", () => {
    render(<Harness />);
    openDialog();
    const dialog = screen.getByRole("dialog");
    expect(dialog.getAttribute("aria-modal")).toBe("true");
    const labelId = dialog.getAttribute("aria-labelledby");
    expect(labelId).toBeTruthy();
    expect(document.getElementById(labelId!)?.textContent).toMatch(/shop name/i);
  });

  it("moves focus into the dialog on open", () => {
    render(<Harness />);
    openDialog();
    expect(screen.getByRole("dialog").contains(document.activeElement)).toBe(true);
  });

  it("loops Tab and Shift+Tab inside the dialog", () => {
    render(<Harness />);
    openDialog();
    const dialog = screen.getByRole("dialog");
    const input = screen.getByRole("textbox");
    const cancel = screen.getByRole("button", { name: "Cancel" });

    cancel.focus();
    fireEvent.keyDown(cancel, { key: "Tab" });
    expect(document.activeElement).toBe(input);

    fireEvent.keyDown(input, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(cancel);
    expect(dialog.contains(document.activeElement)).toBe(true);
  });

  it("calls onClose on Escape", () => {
    const onClose = vi.fn();
    render(<Harness onClose={onClose} />);
    openDialog();
    fireEvent.keyDown(screen.getByRole("textbox"), { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("closes on Escape and returns focus to the opener", () => {
    render(<Harness />);
    const opener = openDialog();
    fireEvent.keyDown(screen.getByRole("textbox"), { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(opener);
  });
});
