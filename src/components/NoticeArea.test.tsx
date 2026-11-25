// @vitest-environment jsdom
import "../test/setup";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { NoticeArea, type NoticeAreaProps } from "./NoticeArea";
import { BACKUP_LOADED } from "./backup/backupMessages";

afterEach(cleanup);

function setup(props: Partial<NoticeAreaProps> = {}) {
  const all: NoticeAreaProps = {
    notice: null,
    onCloseOffline: vi.fn(),
    onReload: vi.fn(),
    reloading: false,
    backupMessage: null,
    onCloseBackupMessage: vi.fn(),
    ...props,
  };
  return { ...render(<NoticeArea {...all} />), props: all };
}

describe("NoticeArea", () => {
  it("renders nothing when there is no notice", () => {
    const { container } = setup();
    expect(container.firstChild).toBeNull();
  });

  it("shows the exact update text and a Reload button in a status region", () => {
    setup({ notice: "update" });
    const status = screen.getByRole("status");
    expect(status.textContent).toContain("A new version is ready. Reload to update.");
    expect(screen.getByRole("button", { name: "Reload" })).toBeTruthy();
    expect(screen.queryByText("Ready for offline use")).toBeNull();
  });

  it("shows the exact offline text and a Close button in a status region", () => {
    setup({ notice: "offline" });
    expect(screen.getByRole("status").textContent).toContain("Ready for offline use");
    expect(screen.getByRole("button", { name: "Close" })).toBeTruthy();
  });

  it("Close calls onCloseOffline", () => {
    const { props } = setup({ notice: "offline" });
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(props.onCloseOffline).toHaveBeenCalledTimes(1);
  });

  it("Reload calls onReload", () => {
    const { props } = setup({ notice: "update" });
    fireEvent.click(screen.getByRole("button", { name: "Reload" }));
    expect(props.onReload).toHaveBeenCalledTimes(1);
  });

  it("Reload is aria-disabled and does nothing while reloading", () => {
    const { props } = setup({ notice: "update", reloading: true });
    const btn = screen.getByRole("button", { name: "Reload" });
    expect(btn.getAttribute("aria-disabled")).toBe("true");
    fireEvent.click(btn);
    expect(props.onReload).not.toHaveBeenCalled();
  });

  it("the update notice wins over offline when notice is update", () => {
    setup({ notice: "update" });
    expect(screen.getByText("A new version is ready. Reload to update.")).toBeTruthy();
    expect(screen.queryByText("Ready for offline use")).toBeNull();
  });

  it("shows the backup loaded notice with Close only for place notice", () => {
    const { props } = setup({
      backupMessage: { seq: 1, kind: "success", text: BACKUP_LOADED, place: "notice" },
    });
    expect(screen.getByRole("status").textContent).toContain(BACKUP_LOADED);
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(props.onCloseBackupMessage).toHaveBeenCalledTimes(1);
  });

  it("hides a backup message whose place is controls", () => {
    const { container } = setup({
      backupMessage: { seq: 1, kind: "success", text: "Your backup file is ready.", place: "controls" },
    });
    expect(container.firstChild).toBeNull();
  });

  it("does not move focus when a notice appears", () => {
    const { rerender, props } = setup();
    const before = document.activeElement;
    rerender(<NoticeArea {...props} notice="update" />);
    expect(document.activeElement).toBe(before);
    expect(document.activeElement).toBe(document.body);
    rerender(<NoticeArea {...props} notice="offline" />);
    expect(document.activeElement).toBe(document.body);
  });
});
