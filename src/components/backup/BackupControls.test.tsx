// @vitest-environment jsdom
import "../../test/setup";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { BackupControls } from "./BackupControls";
import { BACKUP_TIP } from "./backupMessages";
import type { BackupMessageState } from "./backupMessages";

function setup(
  over: { busy?: boolean; message?: BackupMessageState; onLoadFile?: (f: File) => void } = {},
) {
  const onSave = vi.fn();
  const onLoadFile = over.onLoadFile ?? vi.fn();
  render(
    <BackupControls
      onSave={onSave}
      onLoadFile={onLoadFile}
      busy={over.busy ?? false}
      message={over.message ?? null}
    />,
  );
  const input = screen.getByLabelText("Load a backup") as HTMLInputElement;
  return { onSave, onLoadFile, input };
}

function choose(input: HTMLInputElement, files: File[]) {
  fireEvent.change(input, { target: { files } });
}

describe("BackupControls", () => {
  it("joins the label to the file input", () => {
    const { input } = setup();
    expect(input.type).toBe("file");
    expect(screen.getByText("Load a backup").getAttribute("for")).toBe(input.id);
  });

  it("limits the file picker to backup files", () => {
    const { input } = setup();
    expect(input.getAttribute("accept")).toBe(".json,application/json,text/plain");
  });

  it("calls onSave when Save a backup is pressed", () => {
    const { onSave } = setup();
    fireEvent.click(screen.getByRole("button", { name: "Save a backup" }));
    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it("calls onLoadFile with the chosen file", async () => {
    const { input, onLoadFile } = setup();
    const file = new File(["{}"], "backup.json", { type: "application/json" });
    choose(input, [file]);
    await waitFor(() => expect(onLoadFile).toHaveBeenCalledWith(file));
  });

  it("does nothing and shows no message when no file is chosen", () => {
    const { input, onLoadFile } = setup();
    choose(input, []);
    expect(onLoadFile).not.toHaveBeenCalled();
    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("clears the input value so the same file can be chosen twice", async () => {
    const { input } = setup();
    const writes: string[] = [];
    Object.defineProperty(input, "value", {
      configurable: true,
      get: () => "",
      set: (v: string) => {
        writes.push(v);
      },
    });
    choose(input, [new File(["{}"], "backup.json")]);
    await waitFor(() => expect(writes).toContain(""));
  });

  it("clears the input value even when loading fails", async () => {
    const { input } = setup({
      onLoadFile: () => Promise.reject(new Error("nope")),
    });
    const writes: string[] = [];
    Object.defineProperty(input, "value", {
      configurable: true,
      get: () => "",
      set: (v: string) => {
        writes.push(v);
      },
    });
    // The rejection is not handled by the component; swallow it for this test.
    const swallow = () => {};
    const proc = (globalThis as unknown as { process: NodeLikeProcess }).process;
    proc.on("unhandledRejection", swallow);
    choose(input, [new File(["{}"], "backup.json")]);
    await waitFor(() => expect(writes).toContain(""));
    proc.off("unhandledRejection", swallow);
  });

  it("moves focus to an error message", async () => {
    setup({
      message: { seq: 1, kind: "error", text: "We could not read that file.", place: "controls" },
    });
    const alert = screen.getByRole("alert");
    expect(alert.textContent).toContain("We could not read that file.");
    await waitFor(() => expect(document.activeElement).toBe(alert));
  });

  it("does not move focus for a success message", () => {
    const { input } = setup({
      message: { seq: 1, kind: "success", text: "Your backup file is ready.", place: "controls" },
    });
    input.focus();
    const status = screen.getByRole("status");
    expect(status.textContent).toContain("Your backup file is ready.");
    expect(document.activeElement).toBe(input);
  });

  it("does not show a notice-place message in the controls", () => {
    setup({ message: { seq: 1, kind: "success", text: "Backup loaded.", place: "notice" } });
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("sets aria-busy while busy", () => {
    const { input } = setup({ busy: true });
    expect(input.getAttribute("aria-busy")).toBe("true");
  });

  it("sets aria-busy to false when not busy", () => {
    const { input } = setup({ busy: false });
    expect(input.getAttribute("aria-busy")).toBe("false");
  });

  it("shows the tip line", () => {
    setup();
    expect(screen.getByText(BACKUP_TIP)).toBeTruthy();
  });
});

interface NodeLikeProcess {
  on(event: string, fn: () => void): void;
  off(event: string, fn: () => void): void;
}
