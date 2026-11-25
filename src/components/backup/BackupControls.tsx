import { useId } from "react";
import type { ChangeEvent, Ref } from "react";
import { Button } from "../Button";
import { BackupMessage } from "./BackupMessage";
import { BACKUP_TIP } from "./backupMessages";
import type { BackupMessageState } from "./backupMessages";
import "./BackupControls.css";

export interface BackupControlsProps {
  onSave: () => void | Promise<void>;
  onLoadFile: (file: File) => void | Promise<void>;
  /** True while a load is in progress. */
  busy: boolean;
  /** Shown only when place is "controls". */
  message: BackupMessageState;
  saveButtonRef?: Ref<HTMLButtonElement>;
}

export function BackupControls({
  onSave,
  onLoadFile,
  busy,
  message,
  saveButtonRef,
}: BackupControlsProps) {
  const inputId = useId();

  async function handleChange(e: ChangeEvent<HTMLInputElement>) {
    // Read the element and file before any await.
    const input = e.target;
    const file = input.files?.[0];
    if (!file) return;
    try {
      await onLoadFile(file);
    } finally {
      input.value = "";
    }
  }

  return (
    <section className="backup-controls" aria-label="Backup">
      <Button onClick={() => void onSave()} buttonRef={saveButtonRef}>
        Save a backup
      </Button>
      <div className="backup-controls__load">
        <label className="backup-controls__label" htmlFor={inputId}>
          Load a backup
        </label>
        <input
          id={inputId}
          className="backup-controls__input"
          type="file"
          accept=".json,application/json,text/plain"
          aria-busy={busy}
          onChange={(e) => void handleChange(e)}
        />
      </div>
      <p className="backup-controls__tip">{BACKUP_TIP}</p>
      {message?.place === "controls" && <BackupMessage message={message} />}
    </section>
  );
}

export default BackupControls;
