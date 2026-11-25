export const BACKUP_READY = "Your backup file is ready.";
export const BACKUP_SAVE_FAILED = "We could not save your backup. Please try again.";
export const BACKUP_READ_FAILED = "We could not read that file. Please try again.";
export const BACKUP_LOADED = "Backup loaded. Your shop is open as a new stack.";
export const BACKUP_TIP = "Tip: save a backup from time to time.";

export type BackupMessageState = {
  /** Changes on every new message, so the focus effect runs again. */
  seq: number;
  kind: "success" | "error";
  text: string;
  /** "notice" is only for the "Backup loaded" message. */
  place: "controls" | "notice";
} | null;
